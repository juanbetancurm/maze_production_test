# Golem tracking and collision verification

Focused actual-scene run on local source at `4623bc55a49873e2b8565e65d90d470e541068c8` plus the current uncommitted changes. The machine-readable trace is [runtime-trace.json](runtime-trace.json); the scene capture is [scene-level2-desktop.png](scene-level2-desktop.png).

## Results

- `level2-themed-inventory`, `level2-golem-hitbox-footprint`, and `level2-golem-solid-collision` passed in headless Chrome 156 with WebGL/SwiftShader and no browser errors.
- Twelve measured-footprint checks passed: visible gaps and contact from above, below, left, right, and two diagonals.
- All eight player orientations detected overlap at the common physical center; the continuous sweep detected a crossing path.
- Each golem eased toward the player's position. Final facing error was below `0.000032°` for all four golems, without moving their anchors.
- Actual golem contact retained the existing response: lives changed from five to four and the reported cause was `golem`.

This is focused validation, not a full-level route or physical-device performance test. The isolated fixture deliberately places the player for geometry checks; those placements are recorded separately from gameplay commands.
