# Level 2 active-movement sample

This isolated run used local source at `4623bc55a49873e2b8565e65d90d470e541068c8` plus the current uncommitted changes. It measured the actual Phaser scene in headless Chrome 156 with WebGL/SwiftShader. See [runtime-trace.json](runtime-trace.json) for the sample and resources.

## Results

- 60 seconds of back-and-forth player movement in a clear Level 2 corridor: 179 accepted moves and 178 turns, with no rejected command, life loss, wall/Golem contact, or browser error.
- The waypoint loop computes each distance from the player's current physics position and stays between x=80 and x=180 at y=530, avoiding accumulated fixture drift while exercising the actual movement, walk-cycle, turn feedback, and per-frame collision sweep.
- 3,606 Phaser frames; p50 `16.7 ms`, p95 `17.3 ms`, p99 `17.7 ms`, and zero stalls above `50 ms`.
- End-of-sample resources: 426 display objects, 390 static bodies, 1 dynamic body, 33 textures, 8 active tweens, and the expected scene-listener counts.

These are software headless results, not physical GPU or mobile performance. The 60-second route is a bounded active sample, not a full maze solution; it does not replace the five-minute active-use or heap-stability checks in the roadmap.
