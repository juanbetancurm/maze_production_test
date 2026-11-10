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

**Current supplied-art pass:** the wall renderer uses one stamp per segment, consistent 28 px target thickness, a 2x static Phaser RenderTexture, and a supplied end-grain join cap only at detected non-collinear joins. Axis-aligned frames encode the lower-right view consistently; diagonal frames flip across their thickness axis when their bevel would face away from the lower-right screen projection. Segment endpoints, target thickness, and wall physics are unchanged. The source boards already contain bevels and shadows, so a second corner sprite stacked those shadows and made joins too dark. The themed Level 1 and Level 2 scenes report 12 and 33 rendered join caps respectively; fallback mode may report zero. Inspect joins at straight, right-angle, diagonal, and reversed-endpoint connections. The checkpoints use alpha-trimmed, transparent gold-save and green-claimed badges; their original 30-by-30 trigger rectangles remain unchanged.

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
8. Use the Canvas fallback option (?renderer=canvas) and reload. Light2D should be disabled, no normal maps should be downloaded, and the base color art, RenderTexture wall composition, and extracted checkpoint badges should remain visible with no console errors. The latest full 37-scenario Chrome run covers WebGL/Canvas, HUD layout, grass and atlas loading, player/golem collision and movement, level interactions, reduced motion, responsive layouts, Protractor behavior, route prefetch, and accessible loading/recovery states; trace data and focused screenshots are linked from [current full regression evidence](evidence/full-regression-after-timer-scope-v2/README.md).

## Reduced motion

Enable the operating-system reduced-motion preference, reload the fixture, and repeat steps 3–6. Idle breathing, turn/impact/settle squash, golem breathing, exit pulse, and camera shake should be absent. Mathematical orientation, movement, collision, exit activation, and static proximity feedback should remain.

## Automated regression and production asset gate

The latest full browser run completed all 37 scenarios in one temporary isolated Chrome profile. From PowerShell, repeat the suite with:

```powershell
cd C:\repos\anglemaze-platform\frontend
$env:ANGLEMAZE_BROWSER_NO_SANDBOX = '1'
$env:ANGLEMAZE_CAPTURE_SCREENSHOTS = '0'
$env:ANGLEMAZE_EVIDENCE_DIR = 'C:\repos\anglemaze-platform\docs\graphics-upgrade\evidence\full-regression-after-timer-scope-v2'
node tests/graphics/run-baseline.mjs
$testExitCode = $LASTEXITCODE
Remove-Item Env:ANGLEMAZE_BROWSER_NO_SANDBOX
Remove-Item Env:ANGLEMAZE_CAPTURE_SCREENSHOTS
Remove-Item Env:ANGLEMAZE_EVIDENCE_DIR
if ($testExitCode -ne 0) { exit $testExitCode }
```

The no-sandbox flag is a local workaround for this workstation's headless Chrome `Page.enable` hang; it applies only to the test browser, not production. The harness intercepts all requests and blocks non-local origins. Set `ANGLEMAZE_EVIDENCE_DIR` to a new evidence folder before running if you need to retain the trace without replacing the default baseline folder. The existing successful batches and screenshots are in [current regression evidence](evidence/focused-regression-browserfix-v1/README.md).

To avoid duplicating large PNG files for a trace-only full run, set `$env:ANGLEMAZE_CAPTURE_SCREENSHOTS = '0'`; the default remains screenshot capture enabled. Existing focused screenshots are linked from their task evidence notes.

The geometry unit suite is available as `npm.cmd test`; the production build runs it first, then runs Vite and the asset inventory gate:

```powershell
npm.cmd run build
```

The browser harness also injects a lazy-route module failure, checks the accessible recovery actions, then retries and confirms the game reaches its ready state. It verifies that hovering or keyboard-focusing an unlocked level preloads the game module without creating a canvas in the menu. See [route startup evidence](evidence/route-startup-polish-v1/README.md).

Delayed team restoration is also checked on registration, LevelMenu, and game entry. See [hydration route evidence](evidence/hydration-route-polish-v1/README.md) for screenshots and the reduced-motion status assertions.

The focused [HUD contrast review](evidence/hud-contrast-review-v2/README.md) verifies label bounds, contrast, Level 2 exit clearance, narrow-screen hiding, and React phone/tablet layout behavior. These checks are also included in the latest complete 37-scenario run.

The React feedback and victory-navigation timers are now owned by the GamePage lifecycle; cancellation and replacement are tested in [timer lifecycle review](evidence/timer-lifecycle-review-v1/README.md). The linked full 37-scenario run includes this change.

The geometry suite covers actor depth/facing, player-golem collision, and wall joins/projection. The asset gate verifies that manifest paths exist in `dist`, only the 11 intended premium images are shipped, each image stays under its individual cap, the walk atlas remains 384×384, the combined premium-image payload stays below 8,000,000 bytes, and archived art is absent from the full build output. The archived basenames are listed in `frontend/tests/graphics/archived-art-assets.json`, inside the frontend-only Docker build context; update that list when archiving new art.

## Report back

If any check fails, send the browser/version, which URL and step, the console output of `anglemazeBaseline.snapshot()`, and a screenshot. The current automated baseline is the full 37-scenario Chrome run linked above. Physical-device, Firefox/WebKit, long-session heap, and real-GPU checks remain outstanding.
