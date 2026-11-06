# Worker A — environment implementation packet

Prepared 2026-11-02 from actual source at `4623bc5`. Status: handoff ready; no art or game code has been created by this packet. This document refines G02/G05 in the [backlog](../06-development-backlog.md). Root owns shared integration and final choices.

## Critical correction: enemy locations are collision locations

`placeThemedEnemies` creates plain sprites without attached bodies or AI, but the end of [mazeDataLevel2.js](../../../frontend/src/game/mazeDataLevel2.js) contains four tiny wall segments under its `Enemies` comment. `createWallBodies` processes them exactly like other walls. Do not classify enemies as harmless decorations or remove these segments during visual cleanup.

| Zero-based segment index | Segment start → end | Associated sprite |
|---|---|---|
| 39 | (120,295) → (121,296) | (120,295) |
| 40 | (325,221) → (326,222) | (325,220), one unit above start |
| 41 | (523,97) → (524,98) | (523,97) |
| 42 | (625,190) → (626,191) | (625,190) |

Each has length √2; `ceil(length / 8) = 1`, and the inclusive loop creates two 8×8 axis-aligned bodies. Their centers are the segment start and start + (5.656854…,5.656854…). A player collision invokes the ordinary wall-hit path, including lives/respawn behavior. Preserve these bodies and their association with golems. Golems still have no patrol or targeting behavior.

The environment renderer must continue representing these stubs beneath golem art. A short contact pad/footprint can make the contact region readable; the golem sits above it. Do not erase them by dropping short segments, replacing them with full 100×100 golem bodies, or hiding them without checking contact readability. Any future explicit enemy-marker metadata is root-owned and must preserve the current wall array and physics.

## Ownership: only these proposed paths belong to worker A

- `frontend/public/assets/premium/environment/`: exported grass, wall strip/caps/joins and later environment props.
- `frontend/src/game/visuals/EnvironmentView.js`: environment drawing and lifecycle only.
- `frontend/src/game/visuals/environmentGeometry.js`: optional pure render-geometry helpers; no movement/collision implementation.
- `frontend/src/game/visuals/levelDecor.js`: later G12 only after handoff; not needed for first slice.
- Environment evidence/review files below `docs/graphics-upgrade/evidence/environment/`.

Root exclusively edits `minecraftTheme.js`, `MazeScene.js`, `config.js`, `visuals/assetManifest.js` and `visuals/visualTheme.js`. Other workers own characters/objects/UI. No worker A changes to level arrays, player movement, body creation, exit/checkpoint triggers, API, package files or lockfile. Shared changes are submitted as an integration note to root, not applied in parallel.

## Confirmed current calling contract

In [MazeScene.js](../../../frontend/src/game/scenes/MazeScene.js), `create()` calls `drawThemedBackground(this)`, `drawThemedWalls(this, walls)`, then `drawThemedBorder(this)`. Return values are currently ignored. The wall bodies are created afterwards. The existing [minecraftTheme.js](../../../frontend/src/game/minecraftTheme.js) helpers behave as follows:

| Helper | Return value | Side effect |
|---|---|---|
| `drawThemedBackground(scene)` | undefined | Themed grass TileSprite or fallback camera background |
| `drawThemedWalls(scene,walls)` | null if themed; Graphics if fallback | Sprite stamps along every segment or plain lines |
| `drawThemedBorder(scene)` | undefined | Four themed 12-unit strips; none in fallback |

Active wall stamps are 20×20 at approximately 18-unit intervals. Exported `WALL_DRAW_THICKNESS=16` and comments about RenderTexture do not describe that executable path. Both level arrays already include perimeter walls, so a premium boundary drawn twice would create heavy/doubled edges.

## Proposed EnvironmentView interface for root to freeze

Use one scene-owned `EnvironmentView`, not separate instances per helper. Proposed constructor:

```js
new EnvironmentView(scene, {
  width: 800,
  height: 600,
  themed: true,
  textureKeys: {
    grass: 'premium-grass',
    wallStrip: 'premium-wall-strip',
    capStart: 'premium-wall-cap-start',
    capEnd: 'premium-wall-cap-end',
    join: 'premium-wall-join',
  },
  depths: { ground: -20, shadow: -10, walls: 0, boundary: 1 },
})
```

These keys/depths are proposed values for root approval, not existing project constants. Root owns asset registration and decides premium/fallback availability; EnvironmentView does not fetch assets independently or change the all-assets-loaded policy.

Methods preserve the facade shape:

- `drawBackground(): void` — replace only this instance's previous ground objects if called twice.
- `drawWalls(walls): Graphics | null` — copy/read input, never mutate it; return the actual Graphics object in fallback, null for themed rendering. Root's facade can keep the current helper return contract.
- `drawBorder(): void` — draws perimeter once; `drawWalls` retains/identifies the four exact perimeter segments for boundary treatment. Classification is by verified coordinates, never a generic length cutoff.
- `setCollisionFootprints(rectangles): void` — optional integration hook for a read-only snapshot `{x,y,width,height}` of existing bodies if exact contact-outline drawing is selected. Do not query/mutate physics or create bodies inside this view.
- `destroy(): void` — idempotent removal of owned render objects/temporary render textures/listeners. Never remove shared loaded textures or another view's objects.

Root may retain the view on a scene field and bridge old exports to it. Register one shutdown cleanup per instance and clear the reference on scene shutdown; restart reuses the Scene object, so a stale destroyed view must not survive. Draw methods are idempotent, and `destroy` is safe if Phaser has already destroyed some objects. No per-frame `update` is necessary for the static first slice.

If collision snapshots are used, root must provide them after body creation or move the environment draw after that creation without changing body logic. The existing draw order runs before any wall body exists. Worker A must not introduce a second independently evolving collision algorithm to solve this ordering problem.

## Ordered work packets

### A1 / G02 — export a reviewable terrain and wall kit

Use [art direction](../02-art-direction.md) as the production brief. The supplied grass panel visibly fails repetition; rebuild it instead of stretching/cropping the label-bearing sheet into the game.

| Proposed export | Key | Specification |
|---|---|---|
| `grass-base.png` | `premium-grass` | 512×512 opaque standalone PNG, broad quiet shapes, no evenly repeated bright flowers; initial world repeat size 512 units, then review phone scale |
| `wall-strip.png` | `premium-wall-strip` | 128×32 transparent PNG; wood repeats along local +X, consistent width and continuous end-to-start grain; no periodic large rivet |
| `wall-cap-start.png` | `premium-wall-cap-start` | 32×32 transparent cap facing local −X; pivot and structural footprint recorded |
| `wall-cap-end.png` | `premium-wall-cap-end` | 32×32 transparent cap facing local +X; distinct end grain if desired |
| `wall-join.png` | `premium-wall-join` | 32×32 transparent post/join; neutral enough for arbitrary joining angles |

A 128×32 strip at uniform scale 0.25 yields a 32×8 world-unit repeating structural surface. This is a proposed initial scale to respect straight-wall contact width, not a rule to force the illustrated wall silhouette into exactly eight pixels. Separate shallow bevel/shadow from structural contact; avoid making cosmetic overhang look like extra collision area. Cap placement/clipping must keep apparent ends from arbitrarily extending straight walls. Tiny segments need a dedicated small footprint treatment.

Do not bake directional shadows into rotatable strips: rotation would swing the light. Provide source/provenance, dimensions, alpha/edge status, intended scale and pivot to root for its shared manifest. Review 3×3 grass repeat and horizontal, vertical, diagonal wall examples before integration. Original assets remain intact.

### A2 / G05 — first integrated environment slice

Deliver new quiet grass, crafted timber interior walls and coherent perimeter for both complete existing levels. This has strong visible impact without waiting for particles, decor, camera changes or a full intersection-mesh system. Root integrates it together with actor/UI lanes to achieve the Phase 1 complete-scene gate.

Start with individual repeated strip pieces and end/join sprites; compose into a RenderTexture only if measured object/draw cost warrants it. Existing renderer already handles hundreds of stamps, so caching is not a prerequisite for art review. Each strip repeats uniformly, clips its final partial repeat, and rotates by screen `atan2(dy,dx)`. Use joined caps/posts only at confirmed actual render intersections; leave all physical coordinates alone. Avoid assuming Phaser Graphics can directly texture-fill arbitrary polygons. A textured polygon/mask/shader approach requires an explicit implementation choice and Canvas fallback review.

For actual maze cases, implement short-stub handling and simple T/acute joints in this slice. Extra decorative foliage and elaborate soft occlusion are later G12 work. Do not consume the first sprint building optional scenery while the ground/walls remain old.

## Real geometry and acceptance fixtures

Static calculations from the imported arrays, not gameplay measurements: Level 1 has **15 segments**, all straight, shortest 50 units. Level 2 has **43 segments: 11 straight, 32 diagonal**. The current body construction produces 15 wall bodies in Level 1 and **385 in Level 2**, including eight bodies from the four enemy stubs. G00/root should confirm runtime counts before locking assertions.

Review cases must include:

1. Actual Level 1 T junction at (300,200), where the vertical endpoint meets the middle of the horizontal span (200,200)→(350,200). Endpoint-only joining misses it.
2. Actual Level 2 acute fork at (160,320), connecting (100,450) and (200,450).
3. The 10-unit horizontal span (600,150)→(610,150), which cannot fit ordinary large caps at both ends without clipping/overlap handling.
4. The four √2 enemy segments at indices 39–42. Their physics extends farther than their stated endpoints; preserve all eight bodies and draw a readable grounded contact under golems.
5. Near-but-not-identical connections around (320,125)/(320,128) and the line (330,100)→(310,170). Do not snap these together or rewrite coordinates based on visual intuition.
6. Arbitrary non-cardinal wall angles, reversed endpoint ordering, perimeter corners/clipping and a synthetic zero-length segment passed only to the renderer (not inserted into real maze data).

Pass criteria: identical wall-body count/bounds and collision outcomes against the G00 baseline; no changes to either array; no wall grain stretched across a whole long segment; no visible grass seams at native/phone scale; no cracks or doubled edges at real joins; no bright high-frequency ground pattern; no extra unreadable obstacle around golems; repeated scene restart returns render-object/temporary-texture counts to steady state. Both WebGL and Canvas paths must be checked. Missing premium art must use root's agreed fallback without partially mutating the scene.

## Feasibility traps and root dependencies

- **Collision/readability mismatch:** straight colliders are 8 units wide, current wall art 20; diagonal colliders are stepped square chains with endpoint overshoot. A mathematically smooth strip is not the full contact union. Root must choose a contact-outline/snapshot approach and approve the visual overhang treatment; worker A must not silently widen/simplify colliders.
- **Near joins:** render graph tolerance ≤0.25 units does not connect intentionally separated endpoints or near T intersections. Detect real segment intersections separately; avoid aggressive snap/merge heuristics.
- **Engine APIs:** use installed Phaser 3.90 APIs. Nine-slice solves panel resizing, not arbitrary-angle wood networks. Tilemaps would constrain existing geometry. RenderTexture is an optimization candidate with memory/lifecycle costs, not an already-used feature.
- **Premultiplied alpha/rotation:** test cap seams and wood alpha on both dark and light backgrounds; atlas trimming must not shift pivots. Repeating strips stay standalone textures.
- **Shared state:** root supplies the stable manifest keys, texture mode, depth bands, facade wiring, root-owned filtering change and G00 wall-body/collision evidence. Worker B/root must preserve the enemy stub association during golem replacement. Worker A supplies no new colliders or enemy rules.

Recommended parallel arrangement: worker A owns the above environment lane, worker B owns characters/objects, worker C owns UI/baseline evidence, root owns shared scene/contracts and reviews the combined scene. Three workers plus root use all four slots without concurrent edits to the game's shared files.
