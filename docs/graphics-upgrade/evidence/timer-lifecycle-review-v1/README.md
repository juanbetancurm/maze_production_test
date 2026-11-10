# React game timer lifecycle review

## Root cause

`GamePage` scheduled short message clears and the post-victory navigation with raw `setTimeout`. Its effect cleanup destroyed Phaser but did not cancel those timers. A delayed victory callback could navigate after the player had already left the game, and overlapping feedback messages could be cleared by an older timeout.

## Correction

- Added a per-game timeout scope. It replaces older timers for the same message, tracks one-shot work, and clears every pending callback when the game view unmounts.
- The win-navigation callback also checks that its owning effect is still active after the asynchronous save finishes.
- Game movement, collision, scoring, save payloads, message durations, and normal three-second victory return are unchanged.

## Validation

- Three unit tests cover named timer replacement, individual cancellation, completion cleanup, and clearing all timers. `npm test` passes all 21 tests (18 existing geometry/depth/wall tests plus these 3 lifecycle tests).
- ESLint and the production build pass; the premium asset gate remains at 7,298,259 of 8,000,000 bytes.
- A standalone Chrome phone Protractor scenario passes after making its viewport and Level 2 setup self-contained.

The complete 37-scenario browser regression after this timeout-scope change passed in Chrome 157; see [full regression after timer cleanup](../full-regression-after-timer-scope-v2/README.md). The movement-settle check now waits for its 35 ms observation timer, removing a race in the test.
