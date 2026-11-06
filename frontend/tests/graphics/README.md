# G00 local baseline harness

This fixture imports the actual production `config.js`/`MazeScene.js` through installed Vite. It records observations; it does not duplicate the movement algorithm, change production code, or claim that every roadmap gate has passed.

From the repository root, run:

```powershell
node frontend/tests/graphics/run-baseline.mjs
```

Prerequisites: the existing frontend dependencies, Node 24 and installed Chrome (default) or a Chromium-based browser exposing the DevTools Protocol. No new package is required. Set `ANGLEMAZE_BROWSER_PATH` to an Edge executable to compare the Chromium-based Edge run; this does not replace Firefox/WebKit coverage. It uses loopback ports **4178** (Vite), **4179** (in-memory API) and a dynamically reserved browser CDP port, so do not run two copies concurrently. In restricted process contexts the browser may expose a target but fail to answer page-session commands; run the harness where local debugging is permitted.

The runner uses a temporary isolated browser profile, overrides `VITE_API_BASE_URL` only in its own process, and blocks nonlocal page requests through CDP. Mock team/progress state exists only in memory. It does not use `.env` contents or a production database. The local services and Chrome process are closed after the run; the browser's temporary profile is left for normal temporary-file cleanup rather than recursively deleted.

By default, output goes to `docs/graphics-upgrade/evidence/baseline/`. To preserve that accepted evidence, set `ANGLEMAZE_EVIDENCE_DIR` to a new, dedicated output directory for later runs; for example in PowerShell: `$env:ANGLEMAZE_EVIDENCE_DIR='docs/graphics-upgrade/evidence/ui-review'; node frontend/tests/graphics/run-baseline.mjs`. Never point a later run at the baseline folder unless replacing its evidence is intentional.

For a focused local UI run, set `ANGLEMAZE_SCENARIOS` to comma-separated scenario names, for example `react-level2-phone,react-phone-protractor-toggle`. Filtered runs skip network request interception and record this limitation in the trace; requested checks still use the local Vite and mock API services. The Protractor focused evidence lives at `docs/graphics-upgrade/evidence/protractor-review-final/`.

Files:

- `baseline.html`: isolated fixture page, separate from production routes.
- `baseline-scene.js`: imports the real Phaser config, observes scene callbacks/bodies and invokes actual scene command methods. Explicit `place` calls are test setup and are labeled in the trace; they are not completed maze routes.
- `run-baseline.mjs`: local mock API, Vite/Chrome lifecycle, CDP script, scenario evidence and screenshots. The real React pages are observed separately using synthetic hydrated teams.

Collision diagnostics:

- In a Vite development build, open `/tests/graphics/baseline.html?level=2&debugCollision=1` to draw the live player/golem alpha hulls, the player's Arcade wall body, wall Arcade bodies, actor anchors, and the last collision source. The overlay is disabled by default and cannot be enabled in production.
- `/tests/graphics/collision-wall-probe.html?level=2&debugCollision=1` checks close clearances, physical overlap from six approach directions, rotated player orientations, swept movement, and golem tracking against the actual MazeScene.
- `/tests/graphics/baseline.html?level=1&probeWall=1&debugCollision=1` runs a controlled wall contact and reports whether the wall collider fired.
- Captured boundary screenshots are in `docs/graphics-upgrade/evidence/collision-debug/`.

Output goes to `docs/graphics-upgrade/evidence/baseline/` unless overridden as above. Within any selected folder, a rerun overwrites the same capture/trace filenames. Only the manager may approve replacing accepted evidence.

The latest complete functional run is [`edge-full-regression-v1`](../../../docs/graphics-upgrade/evidence/edge-full-regression-v1/README.md): 24 scenarios passed in Microsoft Edge with no browser errors, including idle/active frame samples, responsive sizes, and the phone Protractor flow. The earlier [Chrome full run](../../../docs/graphics-upgrade/evidence/full-release-regression-final-v2/README.md) covered 22 scenarios. The separate five-minute movement sample is in [`active-movement-sample-5m-v1`](../../../docs/graphics-upgrade/evidence/active-movement-sample-5m-v1/README.md). Edge and Chrome are both Chromium/Blink; physical mobile GPU behavior, full production persistence, Firefox/WebKit, and all accessibility interactions remain unverified. The first React registration screenshot was too early and blank; the bounded harness now waits for the first rendered game frame, but that registration-specific capture still needs review. Do not interpret a successful process exit as a pass for these untested items.

The focused responsive React-route scenario checks phone portrait, tablet, and phone landscape canvas bounds at [`responsive-viewports-v3`](../../../docs/graphics-upgrade/evidence/responsive-viewports-v3/README.md). It also enforces a 400×300 minimum game canvas at 844×390 after the short-landscape sizing correction. This remains emulated browser evidence, not physical-device validation.

The same three responsive checks passed in installed Microsoft Edge 156 using `ANGLEMAZE_BROWSER_PATH`; evidence is at [`edge-responsive-viewports-v1`](../../../docs/graphics-upgrade/evidence/edge-responsive-viewports-v1/README.md). Chrome and Edge share Chromium/Blink, so this is a browser packaging comparison rather than an independent engine matrix.

Pure geometry coverage lives in `actor-facing.test.mjs`, `collision-geometry.test.mjs`, `actor-depth.test.mjs`, `wall-kit-geometry.test.mjs`, and `wall-kit-projection.test.mjs`. The latest collision/tracking evidence is [`golem-tracking-collision-final`](../../../docs/graphics-upgrade/evidence/golem-tracking-collision-final/README.md). The former `level2-enemy-hazard-approaches` setup placed the player inside a wall body and a golem footprint; it has been replaced by a stub-to-golem inventory check. Clear-path physical golem contact remains tested in `level2-golem-solid-collision`.
