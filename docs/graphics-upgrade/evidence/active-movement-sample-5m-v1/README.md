# Five-minute active movement sample

This isolated Level 2 sample ran for 300 seconds against the real Phaser scene in headless Chrome 156 using software WebGL/SwiftShader. The route alternated actual forward commands between x=80 and x=180 at y=530, exercising player movement, walk presentation, turns and per-frame collision sweeps. Exact measurements and the browser trace are in [runtime-trace.json](runtime-trace.json).

## Results

- 18,018 Phaser frames over 300 seconds; p50 16.7 ms, p95 17.9 ms, p99 19.8 ms, with zero frame intervals over 50 ms.
- 889 accepted moves and 888 turns; no rejected command, collision, life loss, browser error or stuck movement.
- The player remained between x=80 and x=180 at y=530 and ended at x=180 with all five lives.
- End resource counts: 426 display objects, 390 static bodies, one dynamic body, 33 textures and eight active tweens.

This validates a bounded five-minute active corridor sample in the software-rendered browser environment. It does not measure heap growth, a full maze route, real GPU/mobile performance, touch input, or persistence through a production backend.
