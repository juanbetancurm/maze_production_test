# Full graphics regression in Microsoft Edge

All 24 harness scenarios completed in Microsoft Edge 156 (`Edg/156.0.4314.58`) using the local source plus current working changes. There was no harness failure and `browserErrors` is empty. The complete trace and scene/React captures are in this folder.

Coverage includes both rendering backends, movement/turn commands, wall impact and respawn, Golem footprint and solid-collision behavior, checkpoint/exit responses, actor depth, reduced motion, 20 scene restarts, fallback asset inventory, registration instructions, desktop/phone routes, three responsive sizes, and the phone Protractor interaction/restart flow.

The 60-second idle sample recorded 3,599 frames (p50 16.7 ms, p95 17.1 ms, p99 17.8 ms; zero intervals above 50 ms). The 60-second active sample recorded 179 moves and 178 turns (p50 16.7 ms, p95 17.4 ms, p99 18.9 ms; zero intervals above 50 ms), retained all five lives, and had no collision or rejected command.

This is a full suite run in Edge's Chromium/Blink engine, not an independent browser-engine check. It uses headless software rendering and synthetic team/progress state, so it does not validate physical GPU/touch behavior or production persistence. The separate [five-minute active sample](../active-movement-sample-5m-v1/README.md) was run in Chrome.
