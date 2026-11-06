# Owner visual review — current integrated scene

These captures are ready for an art-direction decision. The desktop scene captures are from the latest complete 22-scenario local regression; the later code change only adjusted responsive canvas sizing. The responsive route was rechecked in both Chrome and Edge afterward.

## Full maze scenes

- [Level 1 desktop scene](../full-release-regression-final-v2/scene-level1-desktop.png)
- [Level 2 desktop scene](../full-release-regression-final-v2/scene-level2-desktop.png)
- [Level 2 checkpoint view](../full-release-regression-final-v2/scene-level2-checkpoint.png)
- [Player motion view](../full-release-regression-final-v2/scene-player-topdown-motion.png)

## Responsive presentation

- [Phone portrait, 360×800](../responsive-viewports-v3/react-phone-360x800.png)
- [Tablet, 768×1024](../responsive-viewports-v3/react-tablet-768x1024.png)
- [Phone landscape, 844×390](../responsive-viewports-v3/react-phone-landscape-844x390.png)
- [Phone landscape in Edge 156](../edge-responsive-viewports-v1/react-phone-landscape-844x390.png)

The full Edge test run is summarized in [edge-full-regression-v1](../edge-full-regression-v1/README.md); it adds functional validation, while the Edge/Chrome images above show the same game presentation in two Chromium browsers.

Review points: memorial character likeness and prosthetic side; grass detail/contrast at native and phone scale; wall thickness, endpoint caps and joins; Golem readability; checkpoint/exit prominence; landscape canvas size and whether scrolling to the controls is acceptable. These are local test captures with synthetic fixture positions, not deployed-game screenshots or a claim of owner approval.
