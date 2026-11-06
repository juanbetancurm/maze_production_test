# Agent execution plan

The owner has authorized starting implementation and asked the lead agent to coordinate delegated work. This document turns the backlog into bounded assignments. It does not authorize merges, deployment, unrelated gameplay changes or unrestricted edits to shared files.

## Team size: four total

Use **one manager/integrator plus three workers**. This matches this session's four concurrent agent slots. The practical limit is shared file ownership, not the number of backlog tasks: most scene operations touch `MazeScene.js` and the old theme facade. Additional concurrent authors there would increase integration work.

The manager remains hands-on: freezes contracts, owns shared scene code, reviews art/gameplay invariants, integrates modules and runs the combined validation. Workers own environment, actors/effects and React/UI/validation. The third worker starts with baseline capture, moves to UI once the baseline is recorded, and returns to independent regression review after integration. Do not keep a separate full-time QA agent idle during art production.

## Current preparation round

Three workers were dispatched for bounded preflight work. The manager reviewed all three resulting handoffs on 2026-11-03. Their preparation assignments are complete; G00 runtime validation and the visual implementation remain separate work packets. The character worker was interrupted after writing its handoff, which the manager inspected directly before accepting it.

| Worker | Current assignment | Exclusive output |
|---|---|---|
| A — Environment | Complete: actual geometry audit and G02/G05 packet | [Environment handoff](execution/worker-a-environment.md) |
| B — Characters/effects | Complete: G03/G06 packet and actor/exit migration traps | [Character handoff](execution/worker-b-characters.md) |
| C — Baseline, later UI | Complete: build/lint preflight; G00 runtime remains partial | [Baseline handoff](execution/worker-c-baseline.md) |
| Manager | Reconcile findings, correct unsafe assumptions, own this execution plan and shared documentation | This document and existing planning documents |

**Important corrected invariant:** enemy drawings have no attached bodies or AI, but Level 2 contains four tiny diagonal wall segments under them. Each becomes two 8×8 colliders and invokes ordinary wall-hit/life-loss behavior. The second sprite is at y=220 while its wall stub begins at y=221. Preserve the exact hazards and offset. The previous statement that enemies had no collisions has been corrected in the audit, architecture and test matrix.

## Ownership during implementation

Paths starting `visuals/` below are relative to `frontend/src/game/`; they are proposed modules, not existing files at kickoff. Runtime export paths are relative to `frontend/public/assets/premium/`.

| Owner | Exclusive write scope | Must request through manager |
|---|---|---|
| Manager | Existing `frontend/src/game/scenes/MazeScene.js`, `minecraftTheme.js`, `config.js`; proposed `visuals/assetManifest.js`, `visualTheme.js`; shared docs and any approved package changes | UI files through C; worker view modules through their owners |
| A — Environment | `environment/` asset exports; `visuals/EnvironmentView.js`, private environment geometry helpers, `visuals/levelDecor.js`; environment-specific tests | Scene wiring, global keys/depths, texture filtering, all collision changes |
| B — Characters/effects | `characters/` and `objects/` exports; `visuals/PlayerView.js`, `GolemView.js`, `ExitView.js`, `VisualEffects.js`; actor-specific tests | Scene lifecycle/overlaps, loading manifest, React preference bridge |
| C — React/UI/validation | `frontend/src/pages/GamePage.jsx`, `Registration.jsx`, `LevelMenu.jsx`, `frontend/src/index.css`; future browser regression harness and integration evidence | Scene methods, API/backend changes, new dependencies or scripts |

Existing `mazeData.js`, `mazeDataLevel2.js`, `checkpointData.js`, session context, API clients, backend and deployment configuration remain outside all visual implementation write scopes. Workers may read them. A need to change them becomes a separately described issue, not an incidental edit.

The manager cannot simultaneously edit C's `GamePage.jsx` to add bridge callbacks. Instead, the manager supplies the scene-side contract and C implements the React side. Likewise, worker A must not edit `minecraftTheme.js` just to call its own renderer. One owner per file includes small edits.

## Execution waves

| Wave | Manager | Worker A | Worker B | Worker C | Completion gate |
|---|---|---|---|---|---|
| 0 — Baseline and contracts | Reconcile preflight, establish key/pivot/lifecycle contracts | Geometry and export handoff | Identity, sprite and exit handoff | Build/lint baseline; remaining local runtime captures | Record behavior before touching scene; agreement on interfaces |
| 1 — Complete static transformation | G04 safe visual boundary and exit trigger; integrate in small steps | G02 terrain/wall art, then G05 environment view | G03 static character/object kit, then G06 actor views | G07 cohesive controls/pages after baseline capture | Both levels visibly transformed together; no changed mechanics |
| 2 — Animation | Integrate callbacks/cancellation, review root alignment | Environment QA and necessary join fixes | G08/G09 player, G10 golem, G11 objective effects in staged deliveries | UI motion preference bridge, regression review, mobile fixes | Precise positions and interrupts, bounded effects, preserved hazards |
| 3 — Education and refinement | Integrate and review complete regression | G13 Protractor view after environment stabilizes; G12 only if budget permits | Actor/effect performance and visual fixes | G14 Protractor UI; G15/G16/G17 testing coordinated serially | Accurate overlay, accessible UI, measured performance and owner review |

Wave 1 is the first visible milestone. Do not replace its environment/actor work with early Protractor implementation. Art and engineering tasks within one lane run in sequence when they share outputs. If an art job becomes the bottleneck, reassign a discrete export or QA task only after transferring ownership; do not spawn another writer into the same atlas folder.

## Manager-approved contracts for the first implementation wave

These are future project interfaces, not claims about existing APIs. The decisions below resolve the worker proposals for the first wave. Changes require a manager handoff before another worker relies on them.

1. **Asset keys and metadata:** manager owns one manifest; workers supply per-export metadata in their lane. Use a distinct premium key namespace and retain baseline files. Required metadata: source path/hash, pixel dimensions, alpha, display size, ground pivot, frame names and provenance. No duplicate ownership of the shared manifest.
2. **Environment view:** receives existing immutable segment arrays and returns a disposable visual handle. It cannot create/remove physics bodies. Existing `drawThemedWalls` callers must remain compatible while the facade delegates. Short enemy hazard segments are preserved; length-based cleanup cannot delete them.
3. **Player view:** use worker B's `syncPose`, `cue`, `setMotionPolicy`, `destroy` interface. The manager migrates all premium-path position/tint/scale/rotation call sites together, while the baseline path retains its real Sprite and old helpers. Never substitute a view/Container into `playerSprite` and leave old consumers active. The premium view owns its drawing; root synchronization is read-only from the body and animation never owns travel.
4. **Golem view:** receives the existing fixed sprite positions. It creates visual objects only; the manager preserves pre-existing wall-group hazards. No new body or patrol behavior.
5. **Exit view:** provides art/halo separately from the manager-owned hidden trigger. Manager records and preserves themed/fallback trigger bounds and existing completion callback timing.
6. **Lifecycle and motion policy:** one shared policy object; scene shutdown cancels all new handles; C owns DOM preference subscription, manager passes state into views. No extra callback may save progress or increment moves.

### Shared naming and first-slice decisions

Use injected keys rather than hardcoding asset paths inside views. The following table supersedes the workers' proposed key spellings; runtime modules are not created yet.

| Export group | Accepted logical keys | Owner |
|---|---|---|
| Terrain/wall kit | `premium.grass`, `premium.wall.strip`, `premium.wall.cap.start`, `premium.wall.cap.end`, `premium.wall.join` | A produces exports; manager registers |
| Hero/golem | `premium.player.static`, `premium.golem.static`, `premium.actor.shadow` | B produces exports; original hero bytes remain the first identity anchor |
| Objective/checkpoint | `premium.exit.base`, `premium.exit.emissive`, `premium.checkpoint.base` | B produces exports; manager preserves physics separately |

Accept A's EnvironmentView methods `drawBackground`, `drawWalls`, `drawBorder`, and idempotent `destroy`. Keep the existing facade's return values while delegating. Start with direct repeat sprites, clipped tails and caps; defer RenderTexture optimization until evidence supports it. Preserve tiny hazard spans and real near-joins. If exact collision footprints are needed for contact outlines, the manager supplies a read-only runtime snapshot after physics construction; A does not duplicate or replace the collision algorithm.

Accept B's GolemView and ExitView interfaces from its handoff. The exit view cannot receive a body or decide victory. Optional emissive loading must not change the selected baseline trigger size. Keep checkpoint entries as real sprites initially so existing tint/alpha updates remain valid. Separate immutable ground position from any future child bob.

### Recorded checks and remaining baseline work

Existing frontend build: **pass**, with the existing >500kB chunk warning. Existing lint: **10 errors and 2 warnings**, itemized in worker C's report. No tracked implementation files changed; the build regenerated ignored `frontend/dist/`. Do not report these as newly introduced errors or attempt unrelated fixes inside art packets.

G00 runtime remains partial: local/mock gameplay traces, actual trigger/body measurements, gameplay screenshots and real-device performance measurements are outstanding. Worker C's next packet imports the actual scene and exercises the real React page against local fixtures; it must not copy the movement implementation into tests or submit data to production.

## Reviewable work packets

Every dispatched implementation packet must name:

- One concrete result, backlog ID(s), prerequisites and the baseline it starts from.
- Exact allowed files/directories, read-only references and shared files it must not edit.
- Input/output contract, supplied asset keys and fallback behavior.
- Required test IDs from the roadmap, plus a screenshot or runtime trace where appropriate.
- A stop condition for blocked dependencies: report the missing item and continue only independent work in scope.

Every worker returns: changed files, what works, commands/results, evidence paths, limitations and requested integration changes. The manager reviews the diff and actual output before marking a packet accepted. "Build passes" alone does not approve art or gameplay preservation.

## Collision prevention and shared workspace rules

1. Use the shared workspace with strict path ownership for this small team. Workers see each other's files; no one reverts changes they did not author. Isolated worktrees can be introduced later if tasks need incompatible dependency changes, but are not needed for disjoint view modules.
2. Planning documents are currently untracked. Do not assume a new worktree contains them. The manager must explicitly provide the handoff package if isolation is introduced; no automatic commits are part of this kickoff.
3. One manager-controlled integration queue; workers deliver modules/assets without editing scene wiring. Integrate environment, then actors/objective, then UI, and run relevant checks between steps.
4. Serialize build, browser-capture and profiling jobs against a stable integrated state. Multiple builds can race over `dist/`; simultaneous browser measurements are not useful performance evidence. Workers request the validation slot from the manager.
5. No dependency installation, broad refactor, generated-file cleanup, Git reset/clean, branch switching, commits, merges or deployment by workers. Report a concrete need to the manager.
6. Separate pre-existing failures from regressions. Do not make unrelated lint fixes to claim a clean baseline. Changes to gameplay timing/hazards require an explicit scoped decision.
7. Transfer a file by an explicit manager handoff with the prior owner idle; update the board before the next worker edits it. Shared assets/atlas JSON count as files subject to the same rule.

## Current implementation round — 2026-11-03

The first static visual pass is wired through the existing Phaser scene. `assetManifest.js` loads premium assets optionally; the old theme remains the fallback. `EnvironmentView` adds grass and modular timber without touching level arrays or collision bodies. Static Golem and Exit views use separate art; the exit's invisible Zone retains the original trigger bounds. React registration, level selection and game controls use the new UI style.

An earlier integrated local browser run passed 16 functional scenarios with no browser errors or fixture writes, including body alignment, all four Level 2 hazards, both levels' body-count checks, themed/fallback exit bounds, 20-restart resource stability, reduced motion, and Protractor toggle/turn/restart. See [historical final player review evidence](evidence/final-player-review/README.md). The generated player atlas in that run was rejected by the owner; treat its art capture as historical, not current approval. The runner supports `ANGLEMAZE_EVIDENCE_DIR` and focused `ANGLEMAZE_SCENARIOS`; do not overwrite accepted evidence on future captures.

## Worker status and current ownership

The static pass and G10/G11 motion packets are integrated. The G13 geometry/view module is integrated by the manager with a G14 React toggle and scene lifecycle wiring. The approved G08a four-frame player walk sheet is integrated with a display-only animation and post-physics position synchronization. New agent sessions use **gpt-6-luna, medium, no inherited conversation history**, with a short task prompt and exact file ownership. Root owns scene wiring/integration and consolidates validation.

| Packet | Status | Output |
|---|---|---|
| G02 art | Detailed v4 stays active at one 800-unit tile scale to remove the visible repeat grid in the fixed world; generated v5 candidate failed the seam/style review and is not active. A mathematically seamless, approved export remains open. | `premium/environment/`, `evidence/environment/` |
| G03 static art | Candidate golem/exit reviewed; memorial player unchanged | `premium/characters/`, `premium/objects/`, `evidence/actors/` |
| G04/G05/G06 static integration | Wired; gameplay invariants covered by local trace | `MazeScene.js`, `minecraftTheme.js`, `visuals/assetManifest.js`, `EnvironmentView.js`, `GolemView.js`, `ExitView.js` |
| G07 UI | Restyle implemented and rendered on desktop/phone; existing handlers/API flow untouched | `GamePage.jsx`, `Registration.jsx`, `LevelMenu.jsx`, `index.css` |
| G10/G11 reduced-motion effects | Subtle deterministic golem breathing and exit halo integrated; shared scene preference listener pauses them and existing player cosmetic motion | `GolemView.js`, `ExitView.js`, `MazeScene.js`, `minecraftTheme.js` |
| G08a/G09 player animation | Owner rejected the generated atlas; exact supplied `player.png` is restored. Directional animation remains pending art approval. Historical atlas traces are not current approval evidence. | `assets/player.png`, `minecraftTheme.js`, `MazeScene.js` |
| G09 motion polish | Turn squash, collision response and endpoint settle integrated; the current focused Chrome regression passes | `minecraftTheme.js`, `MazeScene.js`, `tests/graphics/`, `evidence/player-motion-polish/` |
| G05/G06 depth and sampling | Linear filtering for painted textures, restrained contact shadows, WebGL Light2D and aligned grass/player normal maps integrated; reviewed with headless Chrome captures | `config.js`, `assetManifest.js`, `EnvironmentView.js`, `GolemView.js`, `minecraftTheme.js`, `MazeScene.js` |
| G11 objective/fallback polish | Read-only exit proximity and immediate activation highlight added; legacy enemy fallback facings are deterministic; focused Chrome checks pass | `ExitView.js`, `MazeScene.js`, `minecraftTheme.js`, `tests/graphics/` |
| G13/G14 Protractor | View, geometry, accessible React toggle and scene lifecycle are wired; focused phone toggle and signed-turn check passed | `visuals/angleGeometry.js`, `visuals/ProtractorView.js`, `MazeScene.js`, `GamePage.jsx`, `index.css`, `evidence/protractor-review-final/` |

**Evidence caveat:** an early post-G04 rerun overwrote the original G00 binary captures in `evidence/baseline/`. This is disclosed in the baseline README; original measured values remain documented. The first premium-scene run had a hazard-probe timing race; it is preserved separately and superseded by the corrected run that waits for respawn completion.

The historical integrated run passed 16 scenarios, but predates the current exact player art and later motion polish. The current focused headless Chrome regression passed seven selected scenarios with no browser errors, including wall-hit/respawn, gap/contact-derived golem collision, eight player orientations, golem facing, React phone layout, and Protractor toggle/turn/restart; see [the current regression evidence](evidence/final-review-after-collision-retry/README.md). The capture confirms WebGL and its loaded grass/player normal maps; a separate earlier capture verifies the Canvas renderer path. This is not a full suite, physical phone, real-GPU performance, or accessibility sign-off. Movement remains owned by Arcade Physics. The canvas-centering band remains visible in fixture captures; exact DOM alignment still needs review. No new engine, dependency, commit, merge or deployment is authorized by this plan.

The supplied references remain the design brief. Identity-altering protagonist art still requires review before replacement. Final device performance claims require named hardware; that does not block local visual work. No commit, merge or deployment is part of this round.
