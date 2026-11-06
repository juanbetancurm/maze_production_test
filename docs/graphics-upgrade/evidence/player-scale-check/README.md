# Historical player atlas and phone scale check — atlas rejected

This test used generated player art later rejected by the owner. Its phone and Protractor observations remain historical; it is not current player-art approval.

Focused local run after selecting the 72×96 frame display size. The actual React phone screen (390×844) and real MazeScene were rendered in headless Chrome 156. The player walk-motion scenario passed frame advancement and reset checks with exact sprite/body alignment; the Protractor phone scenario also passed. No browser errors or fixture writes were recorded.

See `runtime-trace.json` and the captures `scene-player-walk-atlas-motion.png`, `react-level2-phone.png`, `react-level2-phone-protractor-on.png`, and `react-level2-phone-protractor-turn-45.png`. This focused run complements the [16-scenario integrated regression](../final-player-review/README.md); it does not replace real-device review.
