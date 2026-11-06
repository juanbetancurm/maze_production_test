# Deferred game route and first-frame readiness review

Date: 2026-11-05

## Changes reviewed

- The registration/menu bundle no longer loads Phaser or `MazeScene`; navigating to a game route loads them on demand.
- The game canvas stays covered until Phaser emits its first `POST_RENDER` event, rather than clearing the loading UI when only the React module has loaded.
- Phaser's duplicate `CENTER_BOTH` alignment is disabled because the responsive React wrapper already scales and centers the fixed 800×600 canvas.

## Verification

- `npm.cmd run build` passed. Main bundle: 251.68 kB minified / 79.65 kB gzip. Deferred `GamePage` chunk: 1,264.61 kB / 349.43 kB gzip. Vite still reports the deferred chunk as over 500 kB.
- `node --check frontend/tests/graphics/run-baseline.mjs` and `git diff --check` passed.
- Local Chrome 156 checks passed for registration without game modules, Level 1 desktop, and Level 2 at a 390×844 phone viewport. No browser errors were recorded.
- The desktop DOM trace confirms the canvas and wrapper both start at y=98.7 with 800×600 bounds. The phone canvas and wrapper both start at y=82.6 with scaled 358×268.5 bounds. Before disabling Phaser centering, the canvas had extra top margins of 158 px and 32 px respectively.
- Screenshots: `react-level1-desktop.png`, `react-level2-phone.png`; details and module-load observations: `runtime-trace.json`.

## Scope and limits

This is local browser evidence, not deployment validation or a real-device performance benchmark. The deferred game chunk remains large; reducing its transfer cost further is a separate optimization. No game assets, gameplay rules, or dependencies were changed in this review.
