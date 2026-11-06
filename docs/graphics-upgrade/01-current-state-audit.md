# Current state audit

Purpose: give implementation agents a source-backed baseline and identify where a visual change could accidentally change gameplay. Audited 2026-11-02; proposed behavior lives in the other documents.

## Repository evidence

`git fetch origin` succeeded after the sandbox required elevated access to `.git/FETCH_HEAD`. `git rev-list --left-right --count HEAD...origin/main` returned `0 0`; `git diff --name-status origin/main` was empty. Local and remote: `4623bc55a49873e2b8565e65d90d470e541068c8`, branch `main`, upstream `origin/main`. The prior conversation audit is still current. No prior persistent audit, `docs` directory or applicable repository `AGENTS.md` was found in the inspected workspace/parent.

All 57 tracked paths matched. No staged, modified, deleted or nonignored untracked files existed before this documentation. Ignored state: `.env`, `backend/.env`, both `node_modules/` directories and `frontend/dist/`. Do not delete or publish environment files. No local-only graphics, unpushed commits or missing remote commits were found. The last two shared commits changed `grass.png` (`4623bc5`) and `player.png` (`701f564`).

## Stack and file map

Versions verified from installed packages: Phaser **3.90.0**, React/React DOM **19.2.4**, React Router DOM **7.14.0**, Vite **7.3.1**. The manifest uses compatible ranges. JavaScript/JSX, ES modules in frontend; Express 5/Prisma 7/PostgreSQL integration in backend. No new renderer is needed.

All links below resolve to existing files; line references are approximate baseline navigation aids. Prefer the named symbol when files evolve.

| Responsibility | Existing file / entry point | Observed behavior |
|---|---|---|
| React boot | [main.jsx](../../frontend/src/main.jsx) | StrictMode, BrowserRouter, GameProvider, global CSS |
| Routes and gates | [App.jsx](../../frontend/src/App.jsx) | `/`, `/menu`, `/game/:levelNum`, `/admin`; saved-team guard |
| Game construction / lifecycle | [GamePage.jsx](../../frontend/src/pages/GamePage.jsx), `useEffect`, around 190 | `new Phaser.Game(config)`, scene callbacks, cleanup with `destroy(true)` |
| Renderer / world | [config.js](../../frontend/src/game/config.js) | `Phaser.AUTO`, WebGL with Canvas fallback, 800×600, Scale.NONE, pixelArt=true, Arcade, no gravity |
| Scene / update loop | [MazeScene.js](../../frontend/src/game/scenes/MazeScene.js), `preload/create/update` | Phaser owns frame loop; update copies body position to sprite and refreshes coordinate text |
| Art loading / composition | [minecraftTheme.js](../../frontend/src/game/minecraftTheme.js) | Seven `load.image` keys; all must load for the main theme; helpers draw terrain, wall stamps, sprites |
| Player movement / rotation | `MazeScene.goForward`, `turnLeft`, `turnRight`, around 1021–1234 | Velocity, duration timer, modular angles; guard against movement during moving/reset/win |
| Player animation | `minecraftTheme.updatePlayerRotation/startWalkAnimation/stopWalkAnimation` | 200ms turn tween; 105ms yoyo scale (1.08× / 0.92×); ±4° rocking except downward motion |
| Enemy placement / rendering / hazards | `MazeScene.create` around 561; `minecraftTheme.placeThemedEnemies`; final four `mazeDataLevel2.js` segments | Four stationary sprites with no attached bodies/AI; separate tiny wall segments create collision hazards at their positions |
| Wall collision | `MazeScene.createStraightWallBody/createDiagonalWallBodies/_onWallHit` | Hidden static rectangles and player collider |
| Exit / victory | `MazeScene.create` around 484, 818 | Visible exit becomes static body; overlap sets hasWon, stops/disables player, invokes save callback |
| Checkpoints | [checkpointData.js](../../frontend/src/game/checkpointData.js), `_onCheckpointReached` | Four in Level 2; separate hidden 30×30 triggers; no Level 1 checkpoints |
| Level loading | [mazeData.js](../../frontend/src/game/mazeData.js), [mazeDataLevel2.js](../../frontend/src/game/mazeDataLevel2.js), `LEVEL_CONFIG` | Fixed segment arrays, not runtime procedural maze generation |
| UI/input | `GamePage.performMotion/handleForward/handleTurnLeft/handleTurnRight` | Numeric desktop inputs; mobile shared quantity and +10/+30/+45/+100, clear, direction buttons; DOM buttons |
| Responsive layout / style | `GamePage` around 567–579; [index.css](../../frontend/src/index.css) | CSS scales fixed world; thresholds 980 and 640px; light/dark tokens; system font stack |
| Session / progression | [GameContext.jsx](../../frontend/src/context/GameContext.jsx) | Team ID localStorage/cookie hydration, unlocked/completed levels |
| Persistence | [api.js](../../frontend/src/lib/api.js), [progress.js](../../backend/src/routes/progress.js), [teams.js](../../backend/src/routes/teams.js) | Team registration, progress, leaderboard and completion request; preserve contracts |
| Other pages | [Registration.jsx](../../frontend/src/pages/Registration.jsx), [LevelMenu.jsx](../../frontend/src/pages/LevelMenu.jsx), [AdminPage.jsx](../../frontend/src/pages/AdminPage.jsx) | Instructions, registration, menu/replay, administration |

No gameplay keyboard movement shortcuts or separate enemy controller were identified. Existing native buttons retain keyboard activation; do not document invented WASD/arrow controls.

**Correction from implementation kickoff review:** the initial audit inferred that enemies had no collision because their sprites have no bodies. This was incomplete. The final four Level 2 segments, explicitly commented `Enemies`, run (120,295)→(121,296), (325,221)→(326,222), (523,97)→(524,98), and (625,190)→(626,191). Each produces two 8×8 bodies through the existing diagonal routine, including an endpoint overshoot. These wall-group hazards invoke the ordinary wall-hit/life-loss handler. The second enemy sprite is at y=220 while its segment begins at y=221; preserve that existing offset. No patrol, detection or attack AI exists, but collisions at these locations must remain. The implementation team verified this directly in the level data before code changes.

## Mathematical and lifecycle facts

`θ = facingAngle × π / 180`; `vx = 300 cos θ`, `vy = -300 sin θ`. Values below `1e-10` are zeroed to remove cardinal floating-point noise. `goForward(d)` starts velocity and a scene timer of `1000d/300` milliseconds. At timer completion the actual position is rounded and the body reset there. It does **not** compute and snap to an ideal destination. Frame timing/physics stepping can affect measured displacement; capture existing outcomes before proposing any math fix.

Left adds degrees, right subtracts; both normalize into [0,360). Current up-facing art uses Phaser angle `90 - facingAngle`. Turn logic updates immediately while art eases; subsequent accepted movement cancels the turn tween. Commands are rejected while moving/resetting/won; there is no queue. Accepted forward and turn commands each increment React's move counter once.

World coordinates: top-left origin, X right, Y down. Level 1 starts (60,60), facing 0°, exits (740,540). Level 2 starts (740,60), facing 180°, exits (150,50). Player physics remains an invisible 20×20 rectangle with world-bound collision. Straight walls are 8 units thick. Diagonal bodies are axis-aligned 8×8 squares, spaced by 8 along the segment using a ceiling count; the last body can extend past the endpoint. The visual wall is currently 20×20 stamps every approximately 18 units. This difference between art and collision geometry already exists.

Wall impact cancels the movement timer and walking, shakes the camera, decrements one of five lives. With lives left, it respawns after 1000ms at checkpoint or start; facing is retained. At zero lives it displays game over and waits for Start Over. Restart clears checkpoints, resets lives and restarts the scene. Checkpoints do not alter the mathematical axes.

Victory attaches to the exit sprite's static body: with all theme assets loaded it is **64×64**; fallback art is **40×40**. Installed Phaser StaticBody initializes bounds from display dimensions. New exit artwork must not silently resize the trigger. The victory path currently does not explicitly remove `_moveTimer` or stop walking; visual cleanup needs an idempotent hook that does not duplicate progression callbacks or silently change existing input timing.

React's elapsed time derives from Date.now at a 250ms update interval. Save uses refs for moves, lives, elapsed seconds; asynchronous completion leads to menu navigation after a further 3000ms delay. Effects must not delay the save trigger or replace this lifecycle.

## Existing graphics inventory

All PNG paths below are relative to [frontend/public/assets](../../frontend/public/assets). The seven active paths are mapped in `minecraftTheme.js`. Dimensions are source pixels, not world units. Binary files match the remote baseline.

| File | Pixels | Current role / display |
|---|---:|---|
| grass.png | 1254×1254 | Active TileSprite across 800×600; 1,774,475 bytes |
| dirt.png | 64×64 | Active orange wood-like wall stamps, 20×20 |
| border.png | 64×64 | Active 12-unit perimeter strips |
| player.png | 241×227 | Active single image, forced 64×64 display |
| enemy.png | 42×64 | Active Minecraft-like zombie, forced 100×100, random angle |
| exit.png | 96×96 | Active red pixel EXIT plaque, 64×64 |
| checkpoint.png | 164×161 | Active marker, 36×36, tint states |
| dirt copy.png | 64×64 | No source reference found |
| enemy_zombie (1).png | 2000×3033 | No source reference found |
| player1024.png | 252×226 | No source reference found; filename does not describe actual dimensions |
| player32.png | 36×32 | No source reference found |
| playerG.png | 64×64 | No source reference found |
| wall_block.png | 1024×1024 | No source reference found; illustrated stone candidate |

`public/favicon.svg` is used by `frontend/index.html`; `public/vite.svg` has no source reference. UI styling is primarily CSS/DOM. The trajectory, direction arrow and small facing triangle are Phaser Graphics; feedback is Phaser Text. `_drawCompass`, its creation/needle code are **commented out**. No live Protractor toggle exists.

The theme header claims tiny textures and RenderTexture walls, but executable code uses larger images and individual sprites. Follow executable code. `pixelArt: true` applies nearest filtering to increasingly painted art. Current player/grass style already differs from pixel zombie/exit. No frame atlas, particle effect, active lighting system or reduced-motion path was identified.

## Supplied references and availability

External source directory: `C:/Users/juanj/OneDrive/Desktop/AngleMaze/`. Files were inspected without changing them. They are not versioned with the project. `player(3).png` was **not found**; the actual attachment is `player.png`, identical in SHA-256 to the active repository player.

| Actual filename | Dimensions | Interpretation / production work |
|---|---:|---|
| New_PossibleVersion.png | 577×355 | Cropped example scene with title; composition target, not a level screenshot or reusable sprite |
| player.png | 241×227 | Existing isolated top-down protagonist; preserves recognizable cap/orange clothing, lacks a full animation set |
| GrassDirtNew.png | 806×685 | Presentation sheet; grass crop, three-plank wall, five props require separation/reconstruction, alpha, lighting and scale normalization |
| GolemT-D.png | 490×972 | Poster with background and small directional examples; redraw coherent clean sprites, do not slice these examples into a claimed walk cycle |
| ExitNew.png | 272×439 | Framed presentation with heading/background; extract/redraw plate, separate emissive masks, remove surrounding panel |
| AngleMaze Hero Design Sheet.png | 1536×1024 | Additional local full-body/directional reference inspected for memorial continuity; label is not proof of owner approval |

Reference SHA-256:

```text
New_PossibleVersion.png efbdc9296282e0f099690598ed46b3ac4abc37257a3b92922eaac4092ab57b07
player.png             a257ec5c1e5784eb21e38a8f0679d27e70bdc0eb771891deb62df86179de9258
GrassDirtNew.png        cc4fe8a820e8806bf833a6d483e0f1bdaa002ecde3c4878b6d23feb9a9a508ae
GolemT-D.png            c31ad38f4b1e4cc1193d8b7455bdce8f390c5a594ec0dc4507dfe5f0285918da
ExitNew.png             f675ccfc4044b274256846517852a55d29e68d9864769d3c26f379fbfb6c262d
Hero design sheet      4f834b5bdc220ac4bfdb425b2131c48da00eed7e36b03f4c9ea3d68b7ca46747
Current grass.png      9e7dcb766c369b4a779677809c03f194c867d1e5a7766c335d20856964095550
```

Grass seam probe: crop inclusive x=33..393, y=75..359 (361×285), deliberately inside the presentation panel. Mean absolute RGB difference across left/right edges: **11.84/255**, versus **4.62** between the first two columns. Top/bottom: **12.41**, versus **4.03** between first two rows. This diagnostic signals discontinuities; it is not a perceptual quality score or proof about every possible crop. Repeated diagnostic view is provided in `evidence/grass-reference-repeat.png`. The source must be rebuilt/edge-matched, then validated at native and actual game sizes; the “seamless” label is not accepted as verification.

The repeated diagnostic was also visually inspected: straight horizontal bands and vertical discontinuities form a visible grid at the crop boundaries, and bright flowers repeat conspicuously. This candidate crop fails the seamless-production gate. The diagnostic is documentation evidence only, not a newly prepared runtime texture.

## Evidence and measurement limits

[Deployed first-visit capture](evidence/deployed-first-visit.png): headless Chrome at 1440×1000, 2026-11-02, opening https://anglemaze.labolavs.com/. Shows instructions over the registration screen. Web text access failed but browser capture succeeded. No production team was registered or progress submitted. This proves access and initial appearance, **not deployed commit identity**. GPU was disabled for capture; it is not a performance benchmark.

Controlled gameplay screenshots (both levels, collisions, checkpoint, victory, desktop/mobile), browser traces, FPS, memory and load-time measurements remain **to obtain in G00**. No game test suite was found: frontend scripts are dev/build/lint/preview; backend test script is a placeholder that exits with error. No gameplay tests, build or dependency installation were run in this documentation task. Do not claim functional pass or measured performance from static inspection.

## Main implementation risks

Exit size is coupled to collision; sprite resizing and thick wall art can misrepresent real bodies. Timer-based travel must not be replaced by eased interpolation. Character mirroring can swap the prosthetic side. New animation can outlive respawn/unmount. NPOT TileSprite textures can allocate a larger power-of-two backing texture. Mobile CSS downscaling makes world text tiny. Golem animation must preserve existing wall-segment hazards and must not add targeting or moving hitboxes. The [architecture](03-technical-architecture.md) and [gates](05-implementation-roadmap.md) address these explicitly.
