# Premium static-scene integration review

Date: 2026-11-03. This is the first runtime review after integrating the G02 grass/wall candidates, G03 static golem/exit art, and the G04 exit-trigger separation. The captures use the actual Phaser scene with local fixtures; React captures use only an in-memory mock API.

## Verified in the captured run

- `npm run build` passed before capture. The existing Vite warning remains: the main JS chunk exceeds 500 kB.
- `node frontend/tests/graphics/run-baseline.mjs` completed with exit code 0 using elevated local Chrome. The sandbox-only Chrome CDP `Page.enable` attempt timed out; it produced no accepted result.
- Both levels retained the 800×600 world and exact static-body counts from G00: Level 1 = 16 including its exit trigger; Level 2 = 390 including its exit trigger and all eight tiny enemy-stub bodies.
- Themed exit triggers remained 64×64 at (740,540) and (150,50); the forced fallback Level 1 trigger remained 40×40 at (740,540).
- Each of the four Level 2 hazard probes began with 5 lives, hit the existing two-body stub, lost one life, and waited until respawn completed before the next probe.
- Twenty Level 2 scene restarts settled at the same measured counts: 511 display objects, 390 static bodies, one dynamic body, 50 textures, zero active tweens. The 50 textures include the new art and per-width composed wall textures; this run found no growth across those restarts.
- Trace reports zero browser errors, zero blocked external requests and zero API writes. The four observed API calls were local fixture GETs.
- Desktop and phone screenshots show the slate/cream/amber UI; the game preserves the original memorial player artwork. The environment, wall, golem and exit art are present in the actual canvas.

## Evidence

- [Level 1 scene](scene-level1-desktop.png), [Level 2 scene](scene-level2-desktop.png), [React desktop](react-level1-desktop.png), [React phone](react-level2-phone.png), [fallback theme](scene-level1-fallback.png).
- [Full runtime trace](runtime-trace.json) includes the corrected respawn wait in the hazard probe.
- The previous first integration run is retained in `../premium-scene-review-first/`; its hazard probe was inconclusive because its fixed delay did not always cover the one-second respawn. The corrected run above records all four independent hits.
- Asset preparation and review links: [grass v2](../environment/grass-quiet-v2-review.md), [wall kit](../environment/wall-kit-review.md), [golem and exit](../actors/asset-report.md).

## Remaining gates

This is headless Windows Chrome/WebGL evidence, not real-device or Canvas-renderer validation. It does not cover all route completions, actual registration submission, touch actions, screen-reader interaction, reduced-motion behavior in the game scene, mobile GPU/memory or five-minute active-use performance. The desktop screenshot still shows a pre-existing Phaser canvas-centering band; current evidence indicates it predates the UI restyle, and its exact canvas/parent geometry has not yet been measured. Do not claim those remaining gates passed.
