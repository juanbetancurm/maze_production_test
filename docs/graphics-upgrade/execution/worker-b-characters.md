# Worker B — characters, objectives and effects handoff

Status: preparation complete; no game code or asset changes made by this packet. Verified against `4623bc55a49873e2b8565e65d90d470e541068c8` on 2026-11-02. This is the worker's proposed implementation contract for manager review, not an existing API.

Read [art direction](../02-art-direction.md), [architecture](../03-technical-architecture.md) and [quality gates](../05-implementation-roadmap.md) for the common requirements. This packet supplies ordered slices, exact file ownership and migration details.

## Verified facts that control this lane

- [minecraftTheme.js](../../../frontend/src/game/minecraftTheme.js), `createThemedPlayer`: returns a real Phaser Sprite displayed at 64×64, or a 20×20 Rectangle fallback. The existing `player.png` is the supplied memorial protagonist and is the initial identity anchor.
- `createThemedExit`: returns a 64×64 Sprite or a 40×40 Rectangle. [MazeScene.js](../../../frontend/src/game/scenes/MazeScene.js) immediately attaches a static body to that visible object and uses it in the victory overlap.
- `placeThemedEnemies`: creates bodyless 100×100 sprites with random visual angles and returns no handles. There is no patrol or target-selection logic.
- **The enemy locations nevertheless are hazards.** The final four “Enemies” entries in [mazeDataLevel2.js](../../../frontend/src/game/mazeDataLevel2.js) are 1×1 diagonal segments. The current diagonal routine turns each into two 8×8 static wall bodies. Contact invokes the same `_onWallHit` life-loss/respawn logic as ordinary walls. A statement that crossing enemies never loses a life would be incorrect.
- Sprite positions are `(120,295)`, `(325,220)`, `(523,97)`, `(625,190)`; segment starts are `(120,295)`, `(325,221)`, `(523,97)`, `(625,190)`. Preserve the second sprite's one-unit Y offset. The second body for each tiny segment is approximately `(startX+5.657,startY+5.657)`; do not “repair” this geometry as art work.
- Checkpoints already separate 36×36 visible art from 30×30 invisible triggers. Their creation and state updates call `setTint/setAlpha` directly on entries in `_checkpointSprites`.

## Ownership lock

The following are **proposed future worker-B write scopes**, released per packet by the manager. They are not permission to begin editing all of them immediately.

| Exclusive worker-B path | Work |
|---|---|
| `frontend/public/assets/premium/characters/` | Static and animated protagonist/golem exports plus per-export metadata |
| `frontend/public/assets/premium/objects/` | Exit base/emissive/shadow and checkpoint exports; environment bushes/rocks/stumps stay with worker A |
| `frontend/src/game/visuals/PlayerView.js` | Player drawing and animation ownership |
| `frontend/src/game/visuals/GolemView.js` | Stationary golem drawing and idle animation |
| `frontend/src/game/visuals/ExitView.js` | Objective art and light cue, no trigger |
| `frontend/src/game/visuals/VisualEffects.js` | Bounded actor/objective visual feedback after manager freezes its contract |
| `frontend/tests/graphics/actors/` | Later meaningful actor lifecycle/geometry tests, after QA chooses the browser harness |

Manager exclusively edits `MazeScene.js`, `minecraftTheme.js`, `config.js`, `visuals/assetManifest.js` and `visuals/visualTheme.js`. React/UI owner edits `GamePage.jsx` and CSS. Worker B supplies integration instructions or a patch description for those files, never concurrent edits. Level data, physics, context/API/backend and original assets are read-only for this lane. Do not change package files or install a new runtime library.

Art/export metadata delivered by B is merged into the shared manifest by the manager. No worker writes the global manifest opportunistically. Source/master artwork stays in an agreed authoring location outside shipped `public/` content; its location must be documented before production.

## G03 — static asset preparation, first implementation packet

**Objective:** make all principal objects coherent while preserving memorial identity. This is the first high-impact actor deliverable, ahead of elaborate animation.

1. Retain the existing `frontend/public/assets/player.png` bytes as the first implementation identity anchor. Do not redraw the student as part of a routine “cleanup.” In the first scene proof, improve surrounding lighting/shadow/scale integration while keeping the recognizable source image.
2. Prepare a concrete identity/contact sheet showing the unchanged bitmap beside the supplied references and any proposed later pose. Before exporting changed anatomy/identity, review the actual candidate with the owner. Do not require that review to block golem/exit preparation or a scene using the unchanged hero.
3. Prepare a single clean high top-down golem, extracted/reconstructed from `GolemT-D.png` as reference, with transparent background and matching camera angle. Its poster text is not a behavior specification. Initial root stays at each existing sprite position.
4. Prepare the ExitNew plate on transparent padding with separate emissive overlay; exclude the heading, white presentation panel and panel shadow. Keep essential EXIT lettering crisp.
5. Prepare a checkpoint base that remains readable under current tint/alpha states; do not redesign its trigger or progression states.

Actual references are under `C:/Users/juanj/OneDrive/Desktop/AngleMaze/`: `player.png`, `GolemT-D.png`, `ExitNew.png`, `New_PossibleVersion.png`, plus `AngleMaze Hero Design Sheet.png`. `player(3).png` is not present. The extra hero sheet is reference evidence, not independently inferred owner approval. No opposing-direction sprite may be made by horizontal mirroring, which would swap the prosthetic side.

Proposed key contract (manager may rename once, before exports and code proceed):

| Logical key | Export specification | Display/ground contract |
|---|---|---|
| `premium.player.static` | Initially references existing `player.png`; later approved 128×128 padded frame | Ground anchor remains body center; first visual envelope ≤64×64; preserve aspect ratio without modifying bitmap bytes |
| `premium.golem.static` | 192×192 transparent padded frame | ≤100×100 envelope; stationary anchor matches exact original sprite position |
| `premium.exit.base` | 128×128 transparent padded plate | Base fits agreed 64×64 themed envelope; trigger supplied separately by manager |
| `premium.exit.emissive` | Same frame/pivot as base, transparent outside emission | Effect-only; never counted in trigger size |
| `premium.checkpoint.base` | 64–128px transparent frame | Visible 36×36 envelope; current 30×30 trigger unchanged |
| `premium.actor.shadow` | Soft transparent ground shadow | Fixed ground orientation; does not inherit actor squash/rotation |

Each export includes source hash/provenance, dimensions, anchor/pivot, intended display scale, transparency review, and approval status. Deliver an art proof at 800×600 and phone scale on both light/dark sample backdrops. Keep genuine source dimensions distinct from displayed world units.

**Done:** no poster content/alpha fringe, no aspect distortion, player identity intact, correct golem/exit/checkpoint silhouette hierarchy, source metadata supplied. Required reviews: V01/V03/V04. Do not claim gait/directional animation readiness from a static poster. **Effort L; risk medium for identity.**

## G06 — static actor views, second packet

Dependencies: manager's G04 view contract and exit trigger separation; G03 reviewed static kit; worker A's G05 environment preview for final scale/layer review. B may develop isolated views while environment work proceeds, but the manager owns full-scene wiring.

The following methods are **proposed**. Constructors return a view object, not a Phaser Sprite. The manager must not pass a view object into existing Sprite helpers or Arcade Physics.

```text
new PlayerView(scene, { x, y, textureKey, themed, motionPolicy })
  syncPose({ x, y, angle, moving, won, resetting }, deltaMs)
  cue(type, details)  // turn, move-start, move-end, impact, respawn, victory
  setMotionPolicy({ reducedMotion, quality })
  destroy()

new GolemView(scene, { x, y, textureKey, seed, motionPolicy })
  updateVisual(timeMs, deltaMs)
  setMotionPolicy({ reducedMotion, quality })
  destroy()

new ExitView(scene, { x, y, baseKey, emissiveKey, themed, motionPolicy })
  updateVisual({ playerX, playerY, won }, deltaMs)
  activate()          // idempotent visual cue only
  setMotionPolicy({ reducedMotion, quality })
  destroy()
```

Contract details:

- Position/angle arguments are plain authoritative numbers copied from existing state; no view receives a physics-body handle or writes `isMoving/hasWon/isResetting`. All durations use milliseconds consistent with Phaser delta.
- Player ground root immediately matches `x/y`; sprite pose/rotation/scale live on a child. Shadow is a separate child that remains grounded. `syncPose` is safe every frame; repeated `won=true` does not restart celebration. A terminal state such as victory supersedes a late move-end cue.
- Golem root never translates, adds physics or chooses targets. Seeded idle phase replaces visual randomness only. Existing wall hazards remain owned by the unchanged maze data/scene.
- ExitView cannot create a body, report victory or invoke React callbacks. Its `activate` method never delays the existing overlap callback. Proximity is a cosmetic read of player coordinates only.
- `destroy` is idempotent, cancels owned tweens/timers/emitters, removes listeners and destroys scene objects. It does not remove shared cached textures used by other scenes/views. Methods after destruction are harmless or guarded by the integration owner.
- Checkpoints can initially remain real Sprite objects with new texture keys so existing tint accesses continue to work. Do not introduce another wrapper until all checkpoint consumers migrate together.

**Done:** aligned static hero, four correct Level 2 golems, updated exit/checkpoints/shadows, same hazard/trigger bodies and gameplay outcomes, no duplicate objects on restart. Test F03–F06/F10 plus V01/V03/V04; see corrected enemy test below. **Effort M; risk high at shared integration.**

## Required manager migration work

| Current access in MazeScene/theme | Why a naive wrapper swap breaks | Manager's required migration |
|---|---|---|
| `this.playerSprite.x/y = this.player.x/y` | Setting a child's local coordinates to world values adds a second offset when inside a Container | Replace with one `playerView.syncPose` ground-root write |
| `setPreviewAngle` calls `updatePlayerRotation(playerSprite,…)` | Old tween mutates `.angle` while new view may own a pose child | Route accepted angle to the view; disable old cosmetic tween calls for migrated path |
| `goForward` and completion call old walk helpers | Helpers store `_walkTween*`, `_rotationTween`, `_walkBaseScale*` on a Sprite; duplicate animation systems compete | Transfer cosmetic start/stop ownership completely to PlayerView; retain movement timer/velocity/callback code |
| Collision calls `setTint`; respawn calls `setPosition` and `clearTint` | Phaser Container is not a Sprite tint interface; local/world anchors can diverge | Use impact/respawn view cues plus immediate authoritative pose sync |
| `createThemedExit` return receives `physics.add.existing` | Passing ExitView/halo/container changes or invalidates collision bounds | Manager creates dedicated hidden trigger from measured baseline themed/fallback bounds, then constructs ExitView separately |
| `_checkpointSprites` entries receive tint/alpha updates | Replacing entries with wrappers breaks current state updates | Keep real Sprite entries initially or migrate all call sites in one manager patch |
| Win stops body but leaves `_moveTimer`/walking explicit cleanup absent | A late timer cue could overwrite victory animation | View victory is terminal until reset; manager handles visual cleanup separately from any proposed gameplay timer fix |
| Restart calls `scene.restart()` | Scene instance need not be newly constructed; stale references/flags may survive | Attach lifecycle cleanup, then recreate views deterministically in `create` |

Preserve legacy helper exports until the manager verifies no remaining consumers. They may continue serving a baseline comparison path, but never let both the old helpers and new view animate the same object. `setDisplaySize` already changes Sprite scales: old `stopWalkAnimation` can restore obsolete scales after a resize; stop/remove old handles before handing the sprite to a new owner.

Manager must measure exit AABBs in themed/fallback modes before integration. Baseline source suggests 64×64 and 40×40 respectively. Preserve their centers and activation conditions. Optional emissive-image load failure must not accidentally decide trigger size; trigger choice belongs to the preserved gameplay/theme baseline, not effect readiness.

## G08–G11 — subsequent packets in order

| Packet | Exclusive deliverable | Acceptance / dependencies |
|---|---|---|
| G08a player motion art | Approved walk/idle atlas in `premium/characters/`; 128px logical cells with stable pivot and dedicated opposing directions | Owner reviewed identity proof; G06 scale locked; no mirrored prosthesis, seams or pivot jitter; V01/V03/V06; start with usable walk cycle before optional victory polish |
| G08b golem idle art | 192px cells with coherent stone segmentation and four-frame idle sets | G03 static golem approved; stationary weight shift, not a fake translating patrol; intended page sizes ≤2048×2048 |
| G09 player state system | PlayerView owns idle/walk/turn/settle/impact/victory; manager supplies existing event hooks | F01–F05/F10; arbitrary bearings and downward wrap correct; 10-unit nominal 33ms moves stay short; root/body error ≤0.5 units; no added lock/queue or positional easing |
| G10 golem animation | GolemView receives immutable roots/seed and scene time | Existing small wall hazards unchanged; no new actor body/AI/attack; stationary 60s and restart reproducibility checks; reduced motion static pose |
| G11 exit/feedback | ExitView halo/proximity cue and bounded VisualEffects, consuming manager-owned motion policy | Exact same exit trigger/save timing; ≤24 victory particles and bounded pooled effects; cleanup F10; reduced motion suppresses decorative pulse/shake/particles while collision/victory remains clear |

G09 may proceed after G08a while G08b art is being prepared, provided nobody edits the same atlas or metadata file simultaneously. G10 and G11 code can overlap only if ownership is split explicitly between different files; with one worker B, finish them sequentially and avoid needless handoffs. UI owner provides one motion-preference subscription, manager distributes the policy. Worker B does not add its own global preference listener per actor.

## Correct enemy regression and handoff report

F06 must compare baseline versus premium at each enemy hazard: wall-body count/positions unchanged, same approach-dependent collision/one life loss/respawn behavior, same 20×20 player body, and no added full-golem collision rectangle. Use a controlled local scene/fixtures; never assert that the player can harmlessly cross all four locations. Also test movement near the visible silhouette but outside the original small hazard to ensure art has not expanded collision. The second sprite/stub Y offset stays unchanged.

For every packet return: files changed, texture keys/export dimensions, preview artifact, relevant acceptance results, missing runtime evidence, and integration instructions for manager-owned files. No commits/merges/deployment from a worker. Do not mark a task done when only art is exported but in-game acceptance remains pending.

**Recommended first actor slice:** retain the original hero bitmap, produce the static golem/exit/checkpoint kit and integrate grounded views after the manager preserves exit bounds. This yields substantial subject improvement alongside worker A's environment and worker C's UI without waiting for a large directional animation atlas or changing memorial identity.
