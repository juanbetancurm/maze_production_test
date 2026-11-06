# Actor depth-sort review v1

Player and Stone Golem sprites now share a screen-Y draw-depth mapping (`4 + clampedY / 1000`). Lower-on-screen characters draw over higher-on-screen characters. Player and golem collision shapes, positions, facing, and behavior are unchanged. The player's two contact-shadow layers remain below actor art; golem shadows remain below them.

## Validation

- Three focused `ActorDepth` unit tests passed, alongside the five wall-junction geometry tests.
- Five actual-scene Chrome scenarios passed: Level 1 inventory, player walk cycle, Level 2 inventory, actor depth ordering, and solid golem collision. No browser errors were reported.
- At the Level 2 start, the player at y=60 sorted behind golems at y=97, 190, 220, and 295. At a safe fixture position y=500, the player's depth moved in front of all four.
- The independent physical-contact scenario still reports a golem collision and applies its existing one-life response.

See the [runtime trace](runtime-trace.json) and [Level 2 capture](scene-level2-actor-depth-sorting.png). The capture shows the normal scene before the test-only lower-screen position probe.
