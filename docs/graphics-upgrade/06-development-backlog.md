# Development backlog

Purpose: let an implementation agent execute a scoped task without repeating the repository investigation. Implementation kickoff is authorized. Static terrain/wall/actor/UI foundations, Protractor, and initial player motion cues are integrated. The earlier oblique generated atlas remains rejected; a four-frame top-down walk-cycle candidate derived from the supplied `player.png` is now used during movement, with visual approval still open. Contact shadows and painted-texture sampling await visual review. G00 evidence remains partial and final visual/device gates are open. Current assignments and reviewed handoffs are in the [execution plan](08-agent-execution-plan.md). Read [README](README.md), the relevant contract in [architecture](03-technical-architecture.md), and the linked [test matrix](05-implementation-roadmap.md) first.

Priority: P0 = required for safe baseline or first major transformation; P1 = required animation/education/refinement after static art; P2 = selective polish. Effort is relative (S small, M medium, L large), not a calendar estimate. Risk refers to potential gameplay or production regression, not difficulty of drawing. Table acceptance is supplemented by each task's file scope, tests and risks below.

## Ordered task table

| ID | Task | Priority | Impact | Effort | Dependencies | Acceptance criteria |
|---|---|---|---|---|---|---|
| G00 | Record controlled baseline and regression traces | P0 | Prevents mathematical regressions | M | None | Both levels' captures and command/body/counter traces; exit themed/fallback bounds; named device measurements; existing failures recorded |
| G01 | Approve memorial model and complete-scene style | P0 | Identity and visual cohesion | M | Audit; owner decisions | Character side/proportions and terrain/wall/UI material study approved at native and phone scale; no generic hero substitution |
| G02 | Produce seamless terrain and modular wall kit | P0 | Largest environmental change | L | G01 | Clean 512px terrain repeat; modular strip/caps/joins; 3×3 and actual diagonal/acute join reviews pass V01/V02 |
| G03 | Produce static actor, golem, exit and checkpoint kit | P0 | Recognizable polished subjects | L | G01 | Transparent, aligned, aspect-correct sprites; no poster backgrounds; protagonist approved; source/provenance manifest complete |
| G04 | Add visual contracts and preserve exit trigger | P0 | Safe rendering boundary | M | G00, G01 | Views cannot mutate physics; old facade remains valid; exit AABB identical in themed/fallback modes; scene teardown clean |
| G05 | Integrate premium terrain, walls and boundary | P0 | Dramatic complete-maze improvement | L | G02, G04 | Both fixed levels render coherent geometry; no grain stretch/cracks; body datasets unchanged; Canvas fallback works |
| G06 | Integrate static actors, exit and checkpoints | P0 | Completes new scene identity | M | G03, G04, G05 | Hero anchored, four static Level 2 golems, new objective/checkpoints, shadows and depth coherent; triggers unchanged |
| G07 | Unify game UI and controls | P0 | Game feels intentionally designed | M | G01; integrates after G06 | Desktop/phone controls preserve commands; registration/menu included; focus, contrast and touch-size gate passes |
| G08 | Produce player and golem animation atlases | P1 | Expressive authored motion | L | G03 approval, G06 scale review | Named frames/pivots consistent; all prosthetic sides correct; no mirrored directions; atlas within budget |
| G09 | Implement player visual state transitions | P1 | Smooth precise character motion | L | G04, G06, G08 | Idle/walk/turn/settle/impact/win interrupt safely; ground anchor matches body; 33ms movement is not stretched to finish animation |
| G10 | Animate stationary golems | P1 | Character and environmental life | M | G06, G08 | Idle weight/eyes work at all four positions; existing wall-segment hazards and life loss preserved; no root travel, targeting or additional bodies; seeded phases repeat |
| G11 | Add exit light, feedback and motion policy | P1 | Clear objective and polished responses | M | G04, G06; coordinate with G09 | Bounded halo/impact/win effects; reduced motion disables decorative movement/shake; exact existing save timing and triggers |
| G12 | Add deterministic environmental detail | P2 | Depth without clutter | M | G05, G06, G11 | Safe sparse props/shadows stable across restarts; no false obstacles or concealed measuring/exit area; budget holds |
| G13 | Build accurate Protractor geometry/view | P1 | Educational clarity | M | G04, G06 | Cardinal/decimal/signed/multi-turn geometry correct; anchored ring, clipped edge policy, readable duplicate dial contract |
| G14 | Integrate Protractor control and lifecycle | P1 | Usable desktop/mobile aid | M | G07, G09, G13 | Accessible toggle works mid-move without count changes; preference reapplied on restart; scale and cleanup tests pass |
| G15 | Profile and tune graphics budgets | P1 | Stable classroom/mobile performance | M | G09–G14 (G12 may be omitted) | Named hardware report meets agreed frame/load/memory budgets; fallback and low-motion tier verified; no gameplay tuning |
| G16 | Complete functional regression matrix | P1 | Protects all existing behavior | M | All integrated implementation tasks | F01–F10 pass or pre-existing discrepancies explicitly reviewed; unchanged API payloads and level geometry; no unexplained regressions |
| G17 | Final visual, accessibility and browser review | P1 | Release-quality consistency | M | G15, G16 | V01–V06/A01–A03 pass; owner approves memorial/static scenes; Chrome/Edge/Firefox/Safari checks recorded; deployment remains separate |

## Execution cards: ownership, scopes and tests

All `visuals/*`, `assets/premium/*` and test paths below are **proposed**. Existing source locations are linked in [the audit](01-current-state-audit.md). Do not assume any proposed module exists before checking the task's prerequisites. Test IDs refer to [quality gates](05-implementation-roadmap.md).

### G00 — Baseline owner / QA engineer

Objective/result: establish observable behavior before any visual code changes. Read `frontend/src/game/scenes/MazeScene.js`, `game/config.js`, `pages/GamePage.jsx`, `context/GameContext.jsx`, `lib/api.js`; inspect both wall datasets. Store future captures/traces under `docs/graphics-upgrade/evidence/baseline/` with browser/device metadata. If a harness is added, proposed scope is `frontend/tests/graphics/`; document the chosen runner and dependencies. No existing test runner may be assumed.

Required tests: capture F01–F08 and F10 baseline outcomes; measure runtime exit bodies rather than infer only from PNG size. Record 60s Level 2 timing, five-minute usage and restart resource counts. Characterize win with an outstanding move timer and possible timer quantization. **Risk: low** with local fixtures; test writes must never reach production. Deliver screenshot matrix, trace schema/data and baseline limitations. No incidental gameplay fixes.

### G01 — Art director with owner review

Objective/result: one authoritative memorial turnaround and a composition/material board that another artist can follow. Scope: external reference files recorded in the audit, approved design notes under this docs directory; no game code. Prepare preview boards in the next implementation session using an agreed art workflow, not direct replacement of game assets.

Required reviews: V03/V04, model-sheet front/back comparison, phone-scale silhouette and grass comfort. Confirm prosthetic side, cap/clothing/face/backpack and appropriate shirt detail. Approval applies to the concrete board and identity model, not an undefined aesthetic promise. **Risk: medium** because memorial identity is sensitive. Owner selects an art production workflow and representative devices; remaining technical work can proceed independently of optional font/effect choices.

### G02 — Environment artist

Objective/result: game-ready terrain and complete wall components. Proposed output scope `frontend/public/assets/premium/environment/`, plus source/master manifest outside shipped public content. Follow specifications in [art direction](02-art-direction.md). Redraw seamless grass and modular grain/caps; do not crop the poster and assume tiling succeeds. Include enough pieces for straight, diagonal, short and intersecting segments.

Required tests: V01/V02 at native/phone scale, seam probe plus 3×3 repetition and half-offset check, light-direction consistency, file dimension/hash validation. Deliver exported PNGs and dimensions/pivots/provenance; no scene edits. **Risk: low gameplay, medium art**. Stable keys are agreed with G04 before export.

### G03 — Character/object artist

Objective/result: approved static high top-down protagonist, golem, exit base/emissive layers and checkpoint states. Proposed scope `frontend/public/assets/premium/characters/` and `premium/objects/`, with source metadata. Use actual `player.png` as identity baseline and owner-approved G01 model. `GolemT-D.png`/`ExitNew.png` are references requiring clean isolated exports.

Required tests: V01/V03/V04, transparent edges on black/white backgrounds, aspect/pivot checks, character side review. Provide static art first; animation production is G08. **Risk: medium** for identity/scale. Do not edit `MazeScene.js` or body bounds to fit drawings.

### G04 — Scene integration owner

Objective/result: narrow visual interface and safe collision separation. Scope existing `frontend/src/game/minecraftTheme.js`, `frontend/src/game/scenes/MazeScene.js`; proposed `visuals/assetManifest.js`, `visualTheme.js` and initial view contracts. Preserve existing helper exports/return expectations until all consumers migrate. Separate exit view from a hidden trigger reproducing measured baseline dimensions. Document scene-ready/reset/teardown integration used by later modules.

Required tests: F03/F04/F05/F10, fallback load failures, root/body alignment and trigger AABB assertions. Keep math, timer durations, accepted command counts and callbacks unchanged. **Risk: high** because exit currently derives physics from art. No animation/state-management dependency. Deliver working baseline-render adapter before new visual modules merge.

### G05 — Environment engineer, scene integrator owns wiring

Objective/result: replace repetitive wall stamps and old ground with a cohesive rendered maze. Scope proposed `visuals/EnvironmentView.js`; `minecraftTheme.js` delegation and `MazeScene.js` wiring are integrated solely by G04 owner. `config.js` filtering change is coordinated here and reviewed with G06. Read level arrays, do not modify them. Render-only endpoint graph, repeated strips, clipped tail, caps/beveled joins, shadows and boundaries follow [architecture](03-technical-architecture.md).

Required tests: F01/F03/F08 plus V02/V04. Pure geometry cases: zero/very short segments, horizontal/vertical/diagonal, reversed endpoints, acute/T/cross intersections, collinear overlaps and both real levels. Test WebGL and forced Canvas; count texture allocations on restart. **Risk: medium** visual boundary ambiguity. Do not use the new wall mesh for collision.

### G06 — Scene integration owner

Objective/result: complete the static transformation with all actors/objectives and intentional layering. Scope proposed `visuals/PlayerView.js`, `GolemView.js`, `ExitView.js`, shared manifest; existing theme/scene integration. Set uniform aspect-preserving scale and pivots, grounded shadows, new checkpoint look. The four golem roots stay at baseline positions; Level 1 stays empty of enemies.

Required tests: F03–F06/F10 and V01/V03/V04. Visual root/body alignment, themed/fallback exit bounds, checkpoint overlap area unchanged. Owner reviews full static scene against baseline before optional effects. **Risk: high** if sprite dimensions leak into physics; G04 must be complete. Do not remove legacy assets yet.

### G07 — React/CSS owner

Objective/result: controls, status, registration and menu feel like one game. Scope `frontend/src/index.css`, `pages/GamePage.jsx`, `pages/Registration.jsx`, `pages/LevelMenu.jsx`; review shared styles on `AdminPage.jsx` without changing admin behavior. Use new scoped classes/tokens; retain all handlers, fields and API calls. Keep existing scale strategy during Phase 1.

Required tests: F07/F08, V04 and A02, desktop/mobile viewport matrix, dark/light modes, keyboard focus/disabled state, accepted command counts. **Risk: medium** due to shared CSS and React lifecycle. UI can develop alongside G05/G06 using agreed tokens; no edits to game scene/modules. Preserve quantity increment choices and direct numerical input.

### G08 — Animation artist

Objective/result: coherent named atlas frames ready for PlayerView/GolemView. Scope exports within `premium/characters/` plus metadata; owner of G03 exports must hand off explicitly. Use G06 approved in-game scale. Produce player walk/idle first, then impact/victory and golem idle. No mirrored anatomy. Direction-set count and sizes follow the approved asset specification; maintain source-size/trim offsets and pivots.

Required tests: V01/V03/V06 frame contact sheets, eight-bearing turntable, gait loop boundary and small-screen playback; atlas size/texture-memory estimate. **Risk: medium** for identity and size inflation. Character art becomes a bottleneck if perfect optional cycles block basic walking; deliver reviewed groups incrementally.

### G09 — Player animation engineer

Objective/result: lively, interruptible protagonist with precise ground motion. Scope `visuals/PlayerView.js`; scene hooks only through integration owner. Replace old walk/turn cosmetic helpers after parity; never tween physics x/y. Implement priority/cancellation, bearing-residual orientation, displacement-aware cadence and short-move partial poses from [architecture](03-technical-architecture.md).

Required tests: F01–F05/F10, V03/V06, rapid turn→forward, downward ±180° wrap, 10-unit move, blocked world edge, respawn/win during motion, reduced motion. **Risk: high** around state transitions. Acceptance includes no extra input lock, no queued commands and no changed progression timing. Use the G11 visual policy interface; no direct duplicate preference listeners. Initial delivery: the supplied top-down base art switches to a four-frame, 8 fps walk cycle while moving and restores the normal-mapped idle texture at rest. A focused WebGL Chrome run verifies unchanged mathematical facing, exact sprite/body position alignment, pipeline restoration and reduced-motion behavior; see [walk-cycle review evidence](evidence/player-walk-cycle-review-v1/README.md). Full directional and state coverage plus owner visual approval remain open.

### G10 — Golem animation engineer

Objective/result: weighted stationary golems with stable grounding. Scope `visuals/GolemView.js` only, consuming seeded phase and common motion policy. Idle stone settling/eyes are required; look-at is optional, separately reviewed for misleading behavior. No patrol controller or gameplay state added.

Required tests: F06/F10, V03/V06, same seed produces same pose at same time; roots do not move over 60 seconds; hazard body count/positions and wall-hit life-loss response match baseline. **Risk: low–medium** visual expectations. Reduced motion freezes decorative animation without hiding golems or removing their existing wall-segment hazards.

### G11 — Effects engineer with integration owner

Objective/result: impressive objective and action feedback without changing game timing. Scope `visuals/ExitView.js`, `VisualEffects.js`, `visualTheme.js`; React preference bridge in `GamePage.jsx` and scene impact/win hooks are integrated by their respective owners. Establish one reduced-motion subscription and bounded scene-owned effect service. Add baked halo/proximity highlight, impact puff, victory burst; clean up on all lifecycle paths.

Required tests: F05/F10, V06, A01/A03, particle caps, forced Canvas fallback, repeated win/respawn teardown. **Risk: medium** for leaked timers and callback delays. No effect completion may submit progress, alter distance or decide victory. GPU glow remains optional after G15 evidence.

### G12 — Environment engineer

Objective/result: carefully placed detail and grounded lighting. Scope `visuals/EnvironmentView.js`, proposed `visuals/levelDecor.js`, environment/prop exports after G02 owner handoff. Use stable per-level placement and clearance rules; bake static layers where practical. No moving grass or gameplay obstacles.

Required tests: V02/V04/V05, F03/F06 invariance, identical decor after restart, absence of props over exit/checkpoint margins, full route visibility on mobile, resource budget. **Risk: medium** visual occlusion. Defer this task if it consumes the budget needed for principal characters/UI.

### G13 — Educational overlay engineer

Objective/result: mathematically exact Protractor renderer and pure geometry helpers. Scope proposed `visuals/ProtractorView.js` and optional private `visuals/angleGeometry.js`; do not relocate movement math. Follow [Protractor design](04-protractor-design.md) for fixed axes, signed arcs, actual body anchor, clipping and scale-aware density. Expose explicit view contract to G14.

Required tests: F09, V05, analytic endpoints for cardinal/noncardinal/decimal bearings, modular wrap, >180°/multi-turn commands, bounded object counts and headless geometry checks. **Risk: medium** due to coordinate-sign mistakes. All overlay data is read-only.

### G14 — React owner + scene integration owner

Objective/result: usable Protractor button, separate readable reference dial and reset behavior. Scope `pages/GamePage.jsx`, `index.css`, scene bridge only; G13 owns overlay internals. Persist toggle for current session, reapply after restart, respect input focus and reduced motion. No server/API changes.

Required tests: F08/F09/F10, V05/A01/A02, toggle during motion and respawn, keyboard/phone, 360px width, all screen edges, no extra move counts or duplicate listeners. **Risk: medium** stale refs/lifecycle. Do not enable it by default until UX review changes the documented default.

### G15 — Performance engineer

Objective/result: documented stable performance on agreed actual devices. Read all visual modules, capture metrics under G00 protocol; modifications restricted to visual quality caps, atlas/export tuning, texture caching/filtering and proven allocation hotspots. Existing `config.js` backing resolution changes require separate comparison of world/viewport invariance. Do not change dependencies or physics for performance without additional review.

Required tests: roadmap performance budgets, F08/F10, native/mobile/Canvas/WebGL comparison, cold-cache load, 20 restarts and five-minute heap/texture stability. **Risk: medium** tuning can blur art or hide educational details. Report measured numbers and hardware, not an unexplained FPS claim; rerun V01/V05 when scaling or atlas layout changes.

### G16 — Regression owner

Objective/result: repeatable proof that the graphics release preserves the app. Scope proposed `frontend/tests/graphics/` and evidence; fixes are assigned back to the owning implementation task. Run complete F01–F10 and compare G00 traces, original level/body arrays, API requests, session flow and counts. Run existing frontend build/lint and distinguish pre-existing failures.

Required tests: the complete functional matrix, both normal and reduced-motion modes, local/mock backend success/failure. **Risk: low execution, high release importance**. No production test registrations or scores. No acceptance by visual screenshot alone. Any change in mathematical endpoints beyond established stepping tolerance requires investigation before approval.

### G17 — Art/accessibility reviewer + owner

Objective/result: consistent polished result ready for a separate deployment decision. Scope documentation/evidence and review; any fixes return to owners. Review full V01–V06/A01–A03 with frozen-time screenshot matrix, five-minute comfort pass, light/dark themes, alpha/joins and protagonist continuity.

Required tests: Chrome/Edge/Firefox desktop, Android Chrome and iOS Safari on available real devices; document unavailable devices rather than claim coverage. Reduced-motion, keyboard and narrow viewport review; final compare of source/dependencies/deployment diffs. **Risk: low review, high identity/quality importance**. Owner approval of scene and memorial representation is explicit; no automatic merge/deploy.

## Parallel work and ownership locks

The manager has dispatched and reviewed three preparation handoffs. The [execution plan](08-agent-execution-plan.md) now governs the four-agent team and subsequent implementation waves. Each working lane receives a file scope and hands changes to the integrator; do not let multiple agents edit a shared file concurrently.

| Lane | Work that can proceed independently | Exclusive ownership / integration |
|---|---|---|
| Environment art | G02 after G01 | `premium/environment/`; later G12 handoff |
| Character/object art | G03 then G08 | `premium/characters/`, `premium/objects/`; no parallel edits to same atlas/manifest |
| Renderer integration | G04 then integrate G05/G06/G09/G11/G14 | One owner of `MazeScene.js`, `minecraftTheme.js`, shared manifest/theme and `config.js` |
| Environment code | G05, later G12 | `EnvironmentView.js`, `levelDecor.js`; passes scene wiring patch to integrator |
| React/UI | G07, later G14 | One owner of `GamePage.jsx`/CSS/pages; effects preference bridge submitted here |
| Actor animation | G09 and G10 after G08 | Different PlayerView/GolemView files; shared policy changes go through integrator |
| Educational view | G13 after static scene | ProtractorView/angleGeometry; UI/scene wiring deferred to G14 |
| QA | G00 collection, later G15–G17 evidence | Tests/evidence; communicates findings instead of patching others' code concurrently |

Critical path for major impact: **G00 + G01 → G02/G03/G04 → G05/G06 + G07 → static visual gate**. Animation, effects and Protractor follow this visible transformation. Freeze interface/asset key agreements in G04 before parallel implementation; review integration in small steps and run the task's required tests before proceeding.
