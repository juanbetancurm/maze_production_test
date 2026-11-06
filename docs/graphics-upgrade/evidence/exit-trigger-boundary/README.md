# G04 exit visual/trigger boundary check

Date: 2026-11-03. This evidence was captured after changing `MazeScene.js` to keep exit art visual-only and use a separate invisible Arcade static Zone.

## Result

- `node frontend/tests/graphics/run-baseline.mjs` completed with exit code 0.
- Themed Level 1 trigger remained 64×64 at center (740,540), AABB (708,508).
- Themed Level 2 trigger remained 64×64 at center (150,50), AABB (118,18).
- Fallback Level 1 trigger remained 40×40 at center (740,540), AABB (720,520).
- Existing command traces, wall-hit/respawn, Level 2 hazard approaches, checkpoint overlap, victory overlap and 20-restart scenario completed in the same run.

## Limits and provenance

This is a copied, labeled post-change trace, not the original pre-change PNG/JSON run. The original measured exit bounds are preserved in `../baseline/README.md`, but its original binary captures were overwritten by the rerun. The runner remains a local headless Chrome/WebGL observation, not real-device performance evidence. The synthetic React registration capture is still invalid/early, as documented in the baseline report.

Files in this directory are the trace and screenshots emitted by `frontend/tests/graphics/run-baseline.mjs` during this run. The production source was not changed by the harness; the only relevant source delta is the manager-owned exit-boundary patch recorded in the repository diff.
