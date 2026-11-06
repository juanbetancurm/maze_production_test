# Implementation roadmap and quality gates

Purpose: deliver the major visual transformation first, with measurable protection for the existing educational game. Tasks are specified in [the backlog](06-development-backlog.md); this file owns phase order, rollout and shared test definitions. No phase has been implemented by this planning task.

## Phases and gates

| Phase | Work / task IDs | Exit gate |
|---|---|---|
| 0 — Controlled baseline | G00; G01 identity/art approval can proceed alongside | Recorded gameplay traces and screenshots, source/exit bounds, measured desktop/mobile constraints; no invented performance baseline |
| 1 — Major visual transformation (highest priority) | G02–G07 after art approval: complete static kit, rendering boundaries, meadow/walls, protagonist, golems, exit, checkpoints and coherent UI | Side-by-side complete scenes look substantially different with animations disabled; all core gameplay invariants preserved |
| 2 — Animation foundation | G08 art frames, G09 player, G10 golem, G11 exit and visual feedback | Smooth, interruptible animations; no positional lag, input-delay changes or new enemy rules; reduced motion available |
| 3 — Premium polish | G12 selective decor/shadows; optional WebGL glow only after profiling | Richness improves hierarchy, never hides corridors, labels or objectives; effect caps met |
| 4 — Protractor | G13 geometry/view then G14 UI/lifecycle | Correct 360° conventions, signed turns and mobile access; identical game traces with toggle on/off |
| 5 — Refinement | G15 budgets; G16 complete functional regression; G17 art/accessibility/browser gate | Approved scene matrix, stable resource use, no functional regression, documented remaining limits |

Basic shadows and polished static UI belong in Phase 1, not Phase 3. Basic contrast, clean alpha and comfortable grass are prerequisites, not final optional cleanup. If animation production is slow, release a complete approved static scene internally first. Do not substitute secondary Protractor/particle work for missing principal art.

Essential: all active scene art, readable geometry, memorial continuity, precise roots, basic animation/cancellation, exit cue, accessible controls and Protractor. Optional/defer: dense props, normal maps, real-time lights, full-screen shaders, camera motion, additional fonts, sophisticated portrait animation, optional look-at golems. Patrol/damage/blocking AI is a separate gameplay proposal. Engine migration is excluded.

## Safe rollout

After implementation authorization, start a dedicated feature branch from the verified commit using the repository's normal review workflow; recheck status first. Preserve environment configuration. Each task is an independently reviewable change with screenshots and targeted tests. Keep old runtime art until the static-scene gate passes. A temporary development-only visual selector may compare baseline/premium paths; it must not select different physics or be exposed as production UI.

One integrator owns shared scene and theme facade changes. Merge/review integration in task dependency order; no automatic deployment. Asset manifest and art changes can be reverted as reviewed commits without rolling back progression data. Remove temporary selectors only after equivalent behavior is demonstrated. Do not silently repair unrelated baseline bugs; record a separate issue and obtain scope agreement if a fix changes timing or rules.

## G00 measurement protocol

Use a controlled local test team/database or mocked API fixtures, never write disposable test scores to production. Record baseline commit, browser version, device, OS, viewport, DPR, graphics backend, cache state and test route. Obtain screenshots for both levels: idle, arbitrary angle, diagonal corridor, motion, wall hit, checkpoint, exit win, game over; include registration/menu and phone controls. Existing `evidence/deployed-first-visit.png` is only a deployed instructions capture, not this gameplay baseline.

For each level, log accepted command, requested distance/turn, logical angle, body position before/after, completion reason, move count, lives, save calls and timestamps. Replay under the same clock/device conditions after each task. Use deterministic rendering seeds and fixed animation capture times for visual comparisons; never change physics randomness/timing to force matching artwork.

There is currently no project game test runner. Prefer Node's built-in test runner for newly isolated pure angle/geometry functions. For real browser collision/lifecycle assertions, introduce a local browser harness only when implementation is authorized; use existing tooling if available, or explicitly approve a test dependency in that session. Start with recorded manual scenarios if needed. Frontend build/lint are existing checks; backend `test` is a failing placeholder, not coverage. Capture pre-existing lint/build failures separately and require no new failures.

## Functional regression matrix

| ID | Required scenarios | Acceptance |
|---|---|---|
| F01 Movement | Distances 10,50,100,200 and decimal distances in clear corridors; cardinal and 30/45/135/225/315°; rapid repeated clicks; zero/negative inputs through existing UI | Same accepted/rejected commands and counters as baseline; same endpoint under deterministic step schedule; no graphics-induced delay. Measure current timer quantization before defining real-device tolerance |
| F02 Rotation | Left/right 30,90,180,270,360,450 and 12.5; repeated turns then immediate Forward | Normalized angle matches modular arithmetic within 1e-9°; visuals cannot feed angle back; one count per accepted command, no queue introduced |
| F03 Collision | Straight and diagonal walls at both ends; corners, world bounds, restart mid-motion, repeated collider frames | Same body geometry/positions; wall hit decrements once; movement timer cancellation and no passage through walls; no altered response from new art |
| F04 Lives/checkpoints | All four Level 2 checkpoints, repeated same checkpoint, switching checkpoints, soft respawn, fifth hit, Start Over | Same saved checkpoint, lives and return positions; 1000ms soft respawn timer unchanged; game over waits for restart |
| F05 Exit | Approach each edge/corner of trigger in themed/fallback modes; trigger while move timer active | Same bounds and activation point; one completion request; unchanged score/time/lives payload; effects do not delay callback/navigation |
| F06 Enemy invariance | Approach each of four Level 2 golem positions and their tiny wall segments from multiple directions; observe idle 60s; Level 1 | Preserve the existing two 8×8 bodies per hazard and ordinary wall-hit/life-loss response, including the second sprite/segment Y offset; no added bodies, patrol or detection; Level 1 still none |
| F07 App/session | Registration, hydrate/resume, unlock next level, replay/reset, restart, navigation/unmount, API failure, menu/admin display | Existing payloads/route guards and completion semantics unchanged; no test writes to production; timers/listeners cleaned |
| F08 Controls/responsiveness | Desktop numerical fields; phone quantity pad and typed values; touch, keyboard activation; resize/orientation mid-move | Same accepted commands and input locking; no double invocation; same logical 800×600 coordinates before/after resize |
| F09 Protractor | Cases in [04](04-protractor-design.md), toggle on/off during identical motion sequence | Overlay changes neither traces nor score; geometry error ≤0.1°, position error ≤0.5 world units at render |
| F10 Lifecycle | 20 scene restarts, React StrictMode mount/unmount, win during turn/walk, respawn during effect | No duplicate animation keys, handlers, saves or retained scene effects; new listeners/emitter counts return to initial state |

Mathematical destination `start + d(cos θ, -sin θ)` is an **oracle for diagnosing current stepping**, not permission to replace it. If baseline differs, report both ideal and observed result; preserve observed mechanics until an explicit gameplay fix is approved.

## Visual gates

| ID | Check | Measurable/observable acceptance |
|---|---|---|
| V01 Assets | Alpha, scale, source panels, frames | No white/dark matte halos on light/dark backgrounds at 1×/2×; no headings/baked poster panels; consistent pivot ≤1 source pixel across intended animation frames |
| V02 Terrain/walls | 3×3 repeats, half-offset tiling, actual wall angles/joins including T/cross/acute/short/reversed | No visible seam at intended display size or 200% inspection; no stretched grain, cracks or bright double edges; contact contour agrees with baseline bodies |
| V03 Actor readability | Eight bearings, walking/idle/impact, grayscale, smallest supported view | Ground root matches body within 0.5 units; prosthetic side consistent; hero/golem/exit distinguished at a glance; no player concealed by props |
| V04 Complete scene | Both levels, light/dark UI, animation paused | Owner accepts a substantial transformation across terrain, walls, characters, objective and UI; no isolated inconsistent legacy element; calmness compared with current grass |
| V05 Educational overlay | Cardinal/intermediate bearings, clipped edges, phone | Correct labeled direction, primary origin never shifted; readable DOM angle/dial and ≥12 CSS-pixel essential overlay text |
| V06 Feedback | Interruptions, partial short walks, win | No snap to stale frame or spinning at ±180°; no artificial minimum movement duration; win remains readable while effects finish |

Pixel-diff tolerances alone cannot approve new art. Store deterministic snapshots for future regression only after human review; use masked comparisons for intentional particles/variable text. Review native 800×600, 1440×1000 desktop, 768×1024 tablet, 360×800 and 390×844 portrait, and 844×390 landscape. These are test viewports, not observed performance devices.

## Performance budgets (proposed targets; baseline unmeasured)

Measure at least 60s of movement in Level 2, plus five minutes of active use and 20 restarts. Collect frame interval p50/p95/p99 and >50ms stalls, resource timings, transfer size, loaded textures and approximate decoded texture memory. A software headless screenshot is not a GPU/mobile performance measurement.

| Area | Initial target / action |
|---|---|
| Desktop rendering | On chosen reference hardware: median frame interval ≤17ms, p95 ≤20ms, p99 ≤33.4ms; compare baseline and report violations |
| Classroom mobile | Target 60fps where baseline permits; minimum sustained 30fps, p95 ≤33.4ms in low-effects tier; name the actual tested device before claiming success |
| Loading | Initial graphics transfer ≤4 MiB; first interactive frame ≤3s on documented 10Mbps/100ms cold-cache profile, subject to baseline app overhead; measure errors and fallbacks |
| Textures | New pages ≤2048×2048 each; proposed total decoded graphics ≤48 MiB. Calculate width×height×4 plus backing/mipmap/render targets; count duplicates and NPOT backing textures |
| Effects | ≤48 live particles overall, ≤24 per win burst, ≤8 per impact, ≤2 active emitters; no unbounded continuous grass particles |
| Resource stability | After 20 restarts, new effect/listener/texture counts return to expected steady count; no monotonic heap growth. Compare settled heap samples; investigate >10% retained increase rather than treating GC noise as a leak |

Optional GPU glow is cut first if budgets fail, then particles/decor density, then high-DPI backing scale. Never reduce physics accuracy, change distance rules or increase input latency to meet a graphics budget. Tune final budgets after G00; record owner-approved changes to targets instead of claiming unmeasured guarantees.

## Accessibility and comfort

A01: React and Phaser share a `prefers-reduced-motion` setting, updated if preference changes. Reduced motion disables idle bob, decorative pulse, particles, animated turn arcs and camera shake; preserves actual movement, static bearing, collision and win information. UI transitions can be instant. Test both settings.

A02: normal text contrast ≥4.5:1; large text and essential UI shapes ≥3:1. Minimum 44×44 CSS-pixel touch targets is a project target. All actions keyboard operable with visible focus. No color-only status. Full functional screen-reader gameplay is beyond this visual scope, but DOM controls and numerical status must remain accessible.

A03: no strobe or full-screen flashes; target no repeated flash sequence. Gentle ambient cycles ≥2s, low opacity amplitude. Review grass for repetitive bright patterns at small screen size with a five-minute static/movement comfort pass. Owner/teacher review is required; do not describe this as a medical guarantee. W3C [contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [flash guidance](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) inform these gates.

## Required review artifacts

Each implementation task supplies its file diff, relevant matrix results, baseline/current screenshots and any measured budget changes. Final review requires G16 and G17, owner signoff on memorial identity and static scene, and an explicit deployment decision in a subsequent session. This plan authorizes no release operation.
