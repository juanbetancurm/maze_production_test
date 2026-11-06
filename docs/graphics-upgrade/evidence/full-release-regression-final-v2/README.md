# Full local graphics regression

This 22-scenario run used local source at `4623bc55a49873e2b8565e65d90d470e541068c8` plus the current uncommitted changes. The machine-readable observations are in [runtime-trace.json](runtime-trace.json); representative scenes are in the PNG captures in this folder.

## Results

- All 22 scenarios completed in headless Chrome 156 with WebGL/SwiftShader and `browserErrors: []`.
- No external page requests were made; six API calls went only to the in-memory local test fixture.
- Checks covered player movement and turning on WebGL and Canvas, wall impact and respawn, Golem footprint gaps/contact/tracking/collision, actor depth sorting, checkpoint and exit behavior, reduced motion, 20 scene restarts, fallback assets, registration instructions, desktop and phone layouts, and the phone Protractor toggle/turn/restart flow.
- A 60-second idle frame sample recorded 2,994 frames, p50 `16.7 ms`, p95 `33.6 ms`, p99 `34.6 ms`, and zero stalls above `50 ms`. Phaser reported 426 display objects, 390 static bodies, 1 dynamic body, 33 textures, and 6 active tweens at sample end.

The frame sample is an idle headless observation, not an active-play or physical-device benchmark. The test fixture now checks the four legacy one-cell wall stubs against their associated Golem anchors as inventory; the earlier approach test started inside both a wall body and a Golem footprint and therefore did not represent a valid move. Clear-path Golem contact remains covered separately.
