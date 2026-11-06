# Worker C — baseline preflight and validation handoff

Status: **preflight complete; G00 remains partial**. This report records checks performed on 2026-11-02 and defines the next bounded runtime-evidence assignment. No game source, original assets, dependencies, environment files, deployment configuration or Git refs were modified.

## Verified starting point

- Branch: `main`, tracking `origin/main`.
- HEAD: `4623bc55a49873e2b8565e65d90d470e541068c8`.
- Initial `git status --short --branch`: `## main...origin/main`, `?? docs/`.
- `git diff --name-only HEAD` remained empty after the checks. Other workers may add planning/handoff documents concurrently.
- Node `v24.18.0`, npm `11.18.0`; commands used `npm.cmd` to avoid the PowerShell npm.ps1 execution-policy restriction.
- Chrome and Edge executables are present at the standard Program Files locations. No project Playwright, Puppeteer or Vitest package was found. No tracked game tests/specs or applicable repository AGENTS.md were found by the file search.

## Existing check outcomes

Executed from `C:/repos/anglemaze-platform/frontend`:

| Command | Result | Evidence and meaning |
|---|---|---|
| `npm.cmd run build` | **Pass**, exit 0 | Vite 7.3.1 transformed 57 modules; reported 17.04s. `index.html` 0.46 kB, CSS 25.89 kB (4.82 kB gzip), JS 1,485.55 kB (419.37 kB gzip). Existing >500 kB chunk warning. These are build artifact sizes, not full graphics transfer or runtime performance measurements. |
| `npm.cmd run lint` | **Fail**, exit 1 | 12 problems: 10 errors, 2 warnings, listed below. These existed before graphics implementation. |

The build regenerated ignored `frontend/dist/` output as expected. It did not modify tracked files. The backend `test` script is a placeholder, not a functional suite; it was not run to manufacture a test result. No dependencies were installed.

### Existing lint findings

| Existing source | Baseline location | Rule / finding |
|---|---:|---|
| `frontend/src/context/GameContext.jsx` | 59, 65 | Two `react-refresh/only-export-components` errors for function exports |
| `frontend/src/game/scenes/MazeScene.js` | 32 | `no-unused-vars`: `flashPlayerCrash` |
| `frontend/src/game/scenes/MazeScene.js` | 1258, twice | `no-unused-vars`: `_player`, `_wall` |
| `frontend/src/pages/GamePage.jsx` | 76 | `react-hooks/purity`: `useRef(Date.now())` during render |
| `frontend/src/pages/GamePage.jsx` | 117, 279, 544 | `no-unused-vars`: `currentLevel`, `level`, `handleLevelSwitch` |
| `frontend/src/pages/LevelMenu.jsx` | 62 | `react-hooks/set-state-in-effect`: synchronous `setLeaderboards({})` |
| `frontend/src/pages/AdminPage.jsx` | 92 | Warning: effect dependency `loadTeams` |
| `frontend/src/pages/GamePage.jsx` | 372 | Warning: effect dependencies `completeLevel`, `levelNumber`, `navigate` |

Do not bury fixes for these inside art tasks. The manager should assign a separately scoped cleanup if desired. Until then, the review gate is no new lint findings, with this baseline explicitly reported; a count alone is insufficient because one old finding could disappear while a new one appears.

## Next packet: G00-RUNTIME

Owner: Worker C until evidence is accepted. Manager retains scene/source integration ownership. Sole proposed write scopes for this packet: `frontend/tests/graphics/` and `docs/graphics-upgrade/evidence/baseline/`; any package changes or runtime-source hook must be requested from the manager. These paths are proposals, not a claim that a harness already exists.

### Local execution architecture

1. Run the existing Vite app on loopback. Use a process-local `VITE_API_BASE_URL` pointing to a local in-memory mock service; do not edit `.env` or use production endpoints. The mock should use Node's built-in HTTP server and store synthetic test data only in memory. Reject/abort nonlocal API requests in the harness.
2. Provide fixtures for `POST /api/teams`, `GET /api/teams/:id`, `GET /api/progress/:id`, `POST /api/progress/complete-level`, and `GET /api/progress/leaderboard/:levelId`, based on actual route/consumer schemas. Responses need JSON content type and CORS for the chosen local Vite port. Log completion request bodies and counts.
3. Use team fixtures with `id`, `course`, `members: [{name: ...}]` and level progress records with `levelId`, `unlocked`, `completed`, `bestMoves`, `bestLivesRemaining`. Enable one requested level at a time so route guards are exercised rather than bypassed. LocalStorage uses `anglemaze:teamId`; the cookie is `anglemaze_team_id`. Start a fresh temporary browser profile. Registration tests should go through the real form and the mocked POST.
4. For direct physics measurements, add an isolated test HTML page under `frontend/tests/graphics/` that imports the **actual** game config/MazeScene through Vite and retains its own Phaser game reference. Set the intended initial level before construction. The page is a test fixture, not a change to production entry points. Do not copy movement or collision implementations into tests.
5. Pair direct scene observations with tests of the real React page. The scene-only fixture does not validate React move counts, hydration, timer persistence or routing. The production React game reference is private; do not assume a `window.game` API exists.
6. Preferred automation uses existing browser/CDP facilities with Node's available runtime and installed Chrome. If this requires substantial custom plumbing, the manager can instead choose a small browser-test dependency in a separate reviewed setup task. No such dependency has been installed by this preflight. A manual local browser pass can establish initial screenshots while automation is prepared.

### Required evidence

Record a JSON trace per scenario with baseline commit, browser/device/OS, viewport/DPR/backend, level, accepted/rejected command, requested amount, facing before/after, body position before/after, collision/completion reason, move count, lives/checkpoint and saved completion payloads. Record both ideal trigonometric endpoint and observed result for diagnosis; never change movement to match the oracle.

Capture Level 1 and Level 2 idle/arbitrary facing/diagonal corridor, walking, wall impact, checkpoint, victory and game-over screens. Include registration/menu and phone controls. Start with 1440×1000 desktop and 390×844 phone emulation, then complete the roadmap viewport matrix. Emulation is layout evidence, not a claim about real mobile performance.

Measure actual exit body bounds with all textures loaded and with the theme intentionally unavailable **only in the test fixture**. Capture player/wall/checkpoint body counts and bounds. Characterize movement timer quantization and win with an outstanding move timer. Trace restart/respawn cancellation and repeated collision callbacks.

Correction verified during preflight: the enemy **sprites** have no bodies/AI, but the final four `mazeDataLevel2.js` entries labeled “Enemies” are 1×1 diagonal wall segments near their positions. Each invokes the existing diagonal-body routine and creates two 8×8 static wall bodies. These positions therefore already cause normal wall-hit/life-loss behavior. F06 must compare those exact collider bounds/counts and response before/after the golem redesign. Do not remove the hazards, add patrol/targeting, or claim the positions are harmless. The third/fourth segments align closely with sprite placements; the second tiny segment starts at y=221 whereas the sprite is at y=220. Preserve the actual data rather than silently aligning it.

Run 60 seconds of Level 2 movement, five minutes of use and 20 restarts on a named desktop device; collect frame interval percentiles, >50ms stalls and retained object/texture/listener counts where observable. Do not use software-rendered headless capture to assert GPU budgets. Real classroom/mobile hardware selection remains an owner/manager decision.

### Pass/fail acceptance

- Every listed baseline scenario has an artifact or an explicit unmeasured/blocked reason. Missing measurements cannot be labeled passed.
- All browser API traffic is local/mock; zero production registrations, scores or session changes.
- Direct scene fixture imports actual code, with no duplicated motion implementation or modified physics timing to make tests pass.
- Runtime bounds, command acceptance, life decrement/respawn and completion payloads are recorded before graphics integration.
- Build passes; lint is recorded as the existing 10-error/2-warning baseline, with no new findings attributable to test infrastructure.
- G00 is complete only after the manager reviews the trace/screenshot matrix and measurement limits. Build/lint alone do not complete it.

## Future UI ownership boundary

After the manager accepts the runtime baseline, Worker C can take G07 and later G14 in a **separate wave**. Exclusive UI write scope: `frontend/src/index.css`, `frontend/src/pages/GamePage.jsx`, `Registration.jsx`, `LevelMenu.jsx`; inspect AdminPage for shared-style regressions and coordinate any actual edit with the manager. Preserve handlers, numeric fields, mobile increments, API calls, route guards and the 800×600 CSS scale strategy.

The manager exclusively owns `MazeScene.js`, `minecraftTheme.js`, game config, shared visual contracts/manifest and dependency files. Environment and actor workers own their isolated view modules/assets. Submit proposed scene bridging changes to the manager; do not edit shared files concurrently. QA should report defects back to the owning lane instead of silently patching it. UI and baseline harness work are serialized within this worker so neither gets neglected.

UI acceptance: identical command acceptance/counts before/after restyling; responsive/keyboard/touch controls and light/dark themes pass F07/F08; active/disabled/focus states remain apparent; 44px touch targets and contrast goals reviewed; no new lint errors. Protractor work starts only after the static scene transformation, per the approved roadmap.

## Completion handoff

Completed now: source/status preflight, real build/lint results, tooling availability and an executable next evidence packet. Remaining: local/mock harness, gameplay screenshots/traces, runtime trigger validation, timing/resource measurements and mobile-device evidence. Original game files are unchanged.
