# Canvas HUD contrast and responsive review

## Scope

Improves the in-canvas Level and coordinate labels so they remain readable over the illustrated scene, while keeping the narrow-screen playfield clear of text that would render too small to read.

## Changes reviewed

- Level and coordinate labels use compact cream text on a dark translucent backing, with consistent font and depth.
- The Level 2 title sits to the right of its upper-left exit, avoiding overlap with the objective art.
- Labels stay inside the 800 by 600 canvas bounds and occupy a shallow top strip.
- The labels are hidden below the existing responsive scene scale threshold of `0.6`; the React page continues to show level and position in its readable status UI.
- HUD visibility is updated independently from Protractor scaling, while both respond to the same viewport scale.
- No world coordinates, movement, collision, or canvas aspect ratio are changed.

## Evidence

- `scene-hud-level1.png` and `scene-hud-level2.png`: actual MazeScene with the readable HUD.
- `react-level2-phone.png`: actual responsive React game route at 390 by 844; the in-canvas labels are hidden and the React level/status UI remains available.
- `runtime-trace.json`: focused browser results for both level variants, HUD bounds and contrast, responsive visibility, the phone route, and six responsive viewports.

## Validation

The focused Chrome run passed `canvas-hud-contrast-layout`, `react-level2-phone`, and `react-responsive-viewports`. The full 37-scenario browser regression, including this HUD adjustment, is recorded in [the full regression evidence](../full-regression-after-hud-v1/README.md).

The same implementation batch passed ESLint, all 18 geometry tests, the Vite production build, and the premium asset bundle gate.

## Limitation

The browser captures use headless Chrome with SwiftShader. Physical mobile-device readability and real-GPU rendering still need owner review.
