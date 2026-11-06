# Protractor focused browser check

Run on 2026-11-03 against the local React application using headless Chrome 156, a 390×844 phone viewport, and a local synthetic Level 2 team fixture. This is a focused integration check; it does not claim physical-device performance.

## Results

- React page rendered one Phaser canvas at `/game/2`.
- The Protractor toggle exposed `aria-pressed=false` initially, then `true` when shown, then `false` when hidden.
- Toggling it did not alter position `(740, 60)`, facing `180°`, or moves `0`.
- After a `+45` mobile chip and Turn Left, the status showed `225°` and one move while position remained `(740, 60)`. The screenshot shows the protractor needle and signed `+45° → 225°` annotation.
- The existing Start Over control reset facing to 180° and moves to zero while the enabled Protractor stayed visible; turning it off afterward left the reset gameplay values unchanged.
- Hiding the overlay preserved the resulting facing and move count.
- No browser errors were recorded. The local fixture received two GET requests and no writes.

The test uses actual React controls and the integrated Phaser scene. The movement command itself remains the existing `MazeScene.turnLeft`; no movement was issued. The trace is `runtime-trace.json`; captures are `react-level2-phone.png`, `react-level2-phone-protractor-on.png`, `react-level2-phone-protractor-turn-45.png`, and `react-level2-phone-protractor-restart.png`.

The filtered harness mode disables Fetch interception because it only requests the local fixture app and mock API. It does not replace the full gameplay regression trace; see [premium scene review](../premium-scene-review/README.md) for the broader suite. Canvas/WebGL screenshots were reviewed in headless Chrome; Canvas renderer fallback and real mobile devices remain untested.
