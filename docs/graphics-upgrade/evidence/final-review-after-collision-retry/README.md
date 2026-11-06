# Focused visual and gameplay regression

This run records current local source at `4623bc55a49873e2b8565e65d90d470e541068c8` plus the uncommitted graphics work. It used isolated headless Chrome `156.0.8078.75`; no production backend writes were made. The full machine-readable trace is [runtime-trace.json](runtime-trace.json).

## Results

Seven selected scenarios completed with `browserErrors: []`:

| Scenario | Result |
|---|---|
| `level1-themed-inventory` | Phaser selected WebGL; Light2D active; grass and player normal maps loaded. |
| `level1-wall-hit-and-respawn` | Wall impact retained `cause=wall` and the existing life-loss/respawn response. |
| `level2-themed-inventory` | Four golems and four checkpoint states loaded in the actual scene. |
| `level2-golem-hitbox-footprint` | Six-direction gaps/contact and eight player orientations passed; continuous facing tracked smoothly without moving the golem anchor. |
| `level2-golem-solid-collision` | Actual golem contact retained the existing life-loss response. |
| `react-level2-phone` | React game view rendered at 390×844 with one Phaser canvas. |
| `react-phone-protractor-toggle` | Toggle changed state; a left 45° turn updated heading 180°→225° and move count to one; restart restored position and move count while retaining the setting. |

Collision checks are derived from opaque sprite alpha footprints and continuous swept SAT; they are not arbitrary radius reductions. The overlay screenshot from the earlier actual-scene probe shows the exact player/golem alpha hulls, Arcade wall bodies and anchors: [Level 2 debug overlay](../wall-projection-review/maze-level2-webgl-lit.png).

## Captures

- [Level 1 scene](scene-level1-desktop.png)
- [Level 1 wall impact](scene-level1-wall-impact.png)
- [Level 2 scene](scene-level2-desktop.png)
- [Phone layout](react-level2-phone.png)
- [Phone Protractor active and turned](react-level2-phone-protractor-turn-45.png)
- [Phone Protractor after restart](react-level2-phone-protractor-restart.png)

The phone captures show layout at an emulated 390×844 viewport; this is browser emulation, not testing on a physical phone. The Protractor remains legible as a compact directional aid, but should receive a dedicated physical-device/readability review.

## Limits

- This was a focused seven-scenario run, not the full regression suite.
- Headless Chrome/SwiftShader does not establish real GPU performance or mobile frame rate.
- Fixture placements isolate hazards; they are not full level playthroughs.
- React move/persistence behavior is observed separately from the isolated scene fixture.
- Long-session use, physical devices, and reduced-motion accessibility review remain outstanding.
