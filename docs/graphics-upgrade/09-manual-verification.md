# Local manual verification

Use the isolated actual-scene fixture. It imports production `MazeScene` and has no registration flow, backend dependency, or production API writes.

## Start

In PowerShell:

```powershell
cd C:\repos\anglemaze-platform\frontend
npm.cmd run dev -- --host 127.0.0.1
```

Open these URLs in Chrome or Edge:

- Level 1: `http://127.0.0.1:5173/tests/graphics/baseline.html?level=1`
- Level 2: `http://127.0.0.1:5173/tests/graphics/baseline.html?level=2`

Wait for the maze to appear, then open DevTools → Console. The fixture exposes `window.anglemazeBaseline`; its `snapshot()` reads the actual scene and physics bodies. These pages are test-only and are not production routes.

## Quick visual and behavior checks

**Current supplied-art pass:** the wall renderer uses one stamp per segment, consistent 28 px target thickness, a 2x static Phaser RenderTexture, and no corner overlay. Axis-aligned frames encode the lower-right view consistently; diagonal frames flip across their thickness axis when their bevel would face away from the lower-right screen projection. Segment endpoints, target thickness, and wall physics are unchanged. The source boards already contain bevels and shadows, so a second corner sprite stacked those shadows and made joins too dark. wallJunctionCount remains zero. Inspect joins at straight, right-angle, diagonal, and reversed-endpoint connections. The checkpoints use alpha-trimmed, transparent gold-save and green-claimed badges; their original 30-by-30 trigger rectangles remain unchanged.

The player and golem use sprite-alpha-derived convex footprints for physical golem collisions. The player image is measured at its rendered size and rotated with the sprite; the static golem footprint excludes decorative green foliage and does not rotate with visual facing. A continuous swept SAT check catches contact between frames. There is no awareness radius. The existing 20-by-20 player Arcade body and wall Arcade bodies remain authoritative for maze walls; the debug overlay shows them separately from character footprints.

1. On Level 1, inspect the detailed grass and supplied two-board timber pieces at native size and browser zoom 125%. The current fixed 800x600 scene displays one 800-world-unit grass tile, avoiding a repeat inside the playfield; the original source still is not mathematically seamless. Check that straight and diagonal wall beams have consistent thickness, readable end grain, no gaps at module boundaries, and a stable outer border. `anglemazeBaseline.snapshot().visuals` should report `wallTexture: 'premium.wall.kit'`, a positive `wallSegmentCount`, and `wallModuleCount >= wallSegmentCount`. The player should use exact supplied `player.png`, have layered ground contact shadows, and stay aligned with its body. Light2D should be enabled only in WebGL; its normal-map list should contain grass and player. The available golem normal map is dimensionally incompatible with the current golem image and should remain unloaded. `pixelArt` should be false and `premiumTextureFilter` should be 0. The source wall art includes bevels/shadows; there should be no separate dark halo or square join blocks. Latest desktop and phone captures are in [the 800-unit grass-scale review](evidence/grass-v4-worldscale-review/).
1a. Open http://127.0.0.1:5173/tests/graphics/collision-wall-probe.html?level=2&debugCollision=1. The fixture should show data-probe-passed=true on document.body; it checks six-direction gap/contact geometry, all eight player orientations, a swept path, clear-gap movement, the actual golem life-loss callback, and smooth golem tracking. The separate ?level=1&probeWall=1&debugCollision=1 fixture verifies a wall hit is reported as wall.
2. On Level 2, confirm four stationary golems, each with a ground shadow, and four visible checkpoint badges. The badges should show the subdued gold save marker before activation, the full gold marker for the current respawn point, and the green check for previously claimed points. `checkpointStateTextures` should contain both generated badge textures and `checkpointStates` should contain four entries. `anglemazeBaseline.collisionInventory().enemyHazards` should still list four hazards, each with two bodies. The checkpoint art has no physics body; the existing 30Ã—30 overlap zones remain unchanged.
2a. Use anglemazeBaseline.verifyGolemFootprint() for the six-direction gap/contact and eight-orientation probes; the helper derives test positions from measured sprite footprints rather than stale hard-coded tangency coordinates. A swept path from (20,295) to (220,295) should detect the stationary golem even if a frame skips across its center. anglemazeBaseline.verifyGolemTracking(770,550) checks that golems turn toward a changed player position without moving their anchors or collision shapes.
3. To see a movement command and its completed state reliably, run `await anglemazeBaseline.command('right', 90); await anglemazeBaseline.command('forward', 60); anglemazeBaseline.snapshot()`. The command helper waits for movement to finish; an immediate snapshot taken directly after `goForward()` can catch the transition before the visual displacement is obvious. Confirm `moving: false` after the helper returns and compare `spriteX/spriteY` with `x/y` (difference ≤0.5). The overhead player should keep the same bearing while walking, with only a restrained squash cue; it must not roll or rock like a crawling figure. If a command reports `false`, inspect `anglemazeBaseline.snapshot()` and the wall layout before changing the fixture position.
4. Check turn feedback: run `anglemazeBaseline.scene().turnLeft(45); anglemazeBaseline.snapshot()`. The angle should update immediately and `playerTurnFeedback` should briefly be true; after 250ms it should be false. A following Forward command should cancel any remaining turn cue.
5. Check collision feedback: restart Level 1, then run `await anglemazeBaseline.command('left', 180)` and `await anglemazeBaseline.command('forward', 100)`. The existing life-loss/respawn behavior should occur; `playerImpact` should be true immediately after contact, then return to false. Do not interpret the shadow or squash as an extension of the physics body.
6. Check the exit: run `anglemazeBaseline.place(690, 540, 0)` and `await anglemazeBaseline.command('forward', 50)`. The exit should brighten on activation, `won` should become true, and `visuals.exitActivated` should be true. Exit trigger position/size and win behavior must remain unchanged.
7. Reload with `?level=2` and repeat the movement/turn checks. Confirm golems do not patrol or move. For the React Protractor control, open `http://127.0.0.1:5173/` with the local backend available on `localhost:3001`, register a disposable local test team, choose Level 2, and toggle **Protractor**. The button should update its pressed state, the bearing should match the player, and turning should update the signed arc without changing position or move count. Do not run this step against production data.
8. Use the Canvas fallback option (?renderer=canvas) and reload. Light2D should be disabled, no normal maps should be downloaded, and the base color art, RenderTexture wall composition, and extracted checkpoint badges should remain visible with no console errors. Captured Canvas evidence is in [the wall projection review](evidence/wall-projection-review/maze-wall-orientation.png). The latest focused Chrome regression successfully exercised seven scene and React scenarios, but this is not a full suite run; details, trace and WebGL/phone screenshots are in [the focused regression report](evidence/final-review-after-collision-retry/README.md).

## Reduced motion

Enable the operating-system reduced-motion preference, reload the fixture, and repeat steps 3–6. Idle breathing, turn/impact/settle squash, golem breathing, exit pulse, and camera shake should be absent. Mathematical orientation, movement, collision, exit activation, and static proximity feedback should remain.

## Report back

If any check fails, send the browser/version, which URL and step, the console output of `anglemazeBaseline.snapshot()`, and a screenshot. The prior 16-scenario pass predates the latest visual changes; use the focused regression evidence as the current automated baseline, while treating physical-device, long-session, and real-GPU checks as outstanding.
