# G00 runtime evidence — 2026-11-03

Status: **partial baseline recorded; current trace is a post-G04 regression rerun**. The original G00 run was captured at baseline HEAD `4623bc55a49873e2b8565e65d90d470e541068c8` with an empty tracked diff. On 2026-11-03 at approximately 13:49 local time, the harness was rerun after the exit visual/trigger split and overwrote the original PNG/JSON filenames. The previous findings below were retained, but the original binary captures and event trace are no longer available in this folder. A copy of the current rerun is preserved at [exit-trigger-boundary](../exit-trigger-boundary/README.md). Future harness runs must use a distinct output directory or archive these files first.

## Run provenance

- Runner: `frontend/tests/graphics/run-baseline.mjs`; actual scene/config imported through Vite.
- Host: Windows 10.0.26200; Node v24.18.0; headless Chrome 156.0.8078.75.
- Render path reported by the scene: WebGL. Hardware renderer identity was not established; this is not a real-device GPU benchmark.
- Screenshot viewports: 1440×1000 desktop and 390×844 phone emulation, DPR 1.
- Only local Vite and an in-memory API were used. Four synthetic hydration GET requests were observed; no registration or progress POST was issued. No nonlocal page requests were observed/blocked, and no runtime browser exceptions were reported in the successful run.
- The initial sandboxed attempt reached Chrome but timed out at CDP `Page.enable`; approved elevated execution completed the same script. Current trace contains the successful run, not the failed attempt.
- Current exact events, body inventories, environment details, results and timestamps: [runtime-trace.json](runtime-trace.json). This trace records the post-G04 run; compare the exit trigger dimensions below with the retained original measurements.

## Observed results

| Area | Evidence / observation | Coverage |
|---|---|---|
| Themed exit Level 1 | AABB x=708, y=508, width=64, height=64; center (740,540) | Original baseline and post-G04 rerun agree |
| Themed exit Level 2 | AABB x=118, y=18, width=64, height=64; center (150,50) | Original baseline and post-G04 rerun agree |
| Fallback exit Level 1 | AABB x=720, y=520, width=40, height=40; center (740,540), theme false after deliberately blocking checkpoint texture | Original baseline and post-G04 rerun agree; Level 2 fallback untested |
| Enemy-location hazards | Four tiny segments each produced two 8×8 static bodies; eight total. Second body center is approximately source+(5.65685,5.65685) | Exact bounds recorded for all eight |
| Hazard interaction | Each of four isolated approaches decremented lives from 5 to 4 through actual wall collision behavior | Preserve this response; sprites themselves have no independent AI/body |
| Cardinal forward travel | Requested 10,50,100 from (60,60), facing 0°, ended at x=70,110,160, y=60 | One observed run per distance |
| Fractional travel | Requested 12.5 ended at (70,60), displacement 10 in this run | Existing timer/step quantization evidence; not a newly introduced error |
| Turn sequence | Left 30 →30°; Right 450 →300°; Left 360 →300°; Left 12.5 →312.5° | Observed actual scene methods |
| Wall hit / respawn | Level 1 leftward movement hit the boundary, emitted crash/life callbacks and returned after the existing delay | Trace recorded |
| Checkpoint | Fixture placed player at checkpoint (645,525); existing overlap activated Checkpoint 1 | Isolated overlap, not a solved route |
| Victory during travel | Actual exit overlap set win while `isMoving` was still true; existing movement timer later fired `move-complete` | Existing lifecycle behavior preserved and recorded |
| 20 restarts | All sampled settled counts stable: 822 display objects, 390 static bodies, 1 dynamic body, 14 textures, 0 active tweens; listed scene listener counts stable | Suggests no growth in sampled counters; heap retention unmeasured |
| Idle frame observation | 60 seconds / 3600 frame samples; p50 16.7ms, p95 17.1ms, p99 17.3ms, zero >50ms stalls | Idle headless observation only; not active gameplay or mobile performance |
| React desktop | Level 1 hydrated through local fixture API, one canvas, correct initial (60,60), 0° and controls | Screenshot/UI readout observation |
| React phone | Level 2 at 390×844, one canvas, correct initial (740,60), 180° and quantity controls | Screenshot/UI readout observation; touch actions not exercised |

The victory trace also records a transient difference between player GameObject position and the Arcade body center after the overlap disables the body; the outstanding timer later resets the body. Do not turn a new visual alignment assertion into an undocumented change to this baseline lifecycle. Manager should decide any separate gameplay cleanup scope.

## Screenshot index

- [Level 1 scene](scene-level1-desktop.png), [arbitrary facing](scene-level1-arbitrary-angle.png), [wall impact](scene-level1-wall-impact.png), [victory scenario](scene-level1-victory.png), [fallback scene](scene-level1-fallback.png).
- [Level 2 scene](scene-level2-desktop.png), [checkpoint scenario](scene-level2-checkpoint.png).
- [Real React Level 1 desktop](react-level1-desktop.png), [real React Level 2 phone](react-level2-phone.png).
- `react-instructions-desktop.png` is an **invalid early capture**: its DOM text was empty at capture time. It is retained as failure evidence, not accepted as an instructions baseline. The previous planning capture at `../deployed-first-visit.png` remains a separate deployed first-visit observation.

The Level 2 scene and phone images were visually inspected. The fixture's canvas uses the original 800×600 world; its header and surrounding background are test-only. Golem/zombie random initial facing is not seeded in production, so pixel-perfect comparison across independent runs must mask/normalize this deliberate baseline variability without changing gameplay behavior.

## Remaining G00 coverage

G00 is not complete. Outstanding: real form registration and completion payload assertions; desktop/mobile input interaction sequence and counters; diagonal/noncardinal/rapid-command cases; all four checkpoint transitions; fifth-life/game-over; all exit approach edges; Level 2 fallback; restart/unmount React lifecycle; the full viewport/browser matrix; five-minute active-use/heap run; named real classroom/mobile hardware. The frame sample here was idle, so the roadmap's 60-second active Level 2 requirement also remains open.

Meaningful next bounded packet: validate real React registration, forward/turn/count and completion flow with the already built local API fixture, plus DOM-ready screenshot waits. Manager should accept the existing evidence before another run overwrites these filenames. No further scenarios or reruns were added after the instruction to stop at the current scripted run.
