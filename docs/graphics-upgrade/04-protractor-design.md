# Protractor — accurate orientation made visible

Purpose: help a student predict how a distance command and a left/right turn act in the current mathematical coordinate system. This is a proposed feature. Existing compass code is commented out; the active direction arrow is the starting point, not a functioning Protractor.

## Mathematical contract

Use `MazeScene.facingAngle` as the authority. Right is 0°, up 90°, left 180°, down 270°. Positive turn is counterclockwise. Position uses screen coordinates (X right, Y down). Do not use the visual sprite's tweened Phaser angle to compute readings.

For player ground center (cx,cy), radius r and game bearing θ:

```text
normalize(a) = ((a % 360) + 360) % 360
ringX = cx + r * cos(θ * π / 180)
ringY = cy - r * sin(θ * π / 180)
left(a,d)  = normalize(a + d)
right(a,d) = normalize(a - d)
```

The outer ring and angle labels remain fixed to world axes. Only the bearing indicator and optional turn arc change. Rotating the entire scale with the character would obscure the absolute angle being taught. This is a full-circle 360° protractor; label that explicitly in the short help text.

Example: from facing 350°, Left 30° yields 20°; annotate a counterclockwise 30° sweep across 0°. Right 30° from 10° yields 340°. A 270° left command must not be illustrated as a 90° right turn, even if the character's cosmetic rotation chooses that shorter route. For commands ≥360°, show the numeric signed amount/full-turn count and final bearing; do not force a long animation or alter command timing.

## Interaction and layout

Add a real DOM button labeled **Protractor** beside the facing readout/turn controls in `GamePage.jsx`, visible on both desktop and phone. Default off. Toggle with click, tap, Enter or Space; `aria-pressed` communicates state. Active appearance uses an instrument/ring icon, selected outline and text, not color alone. Optional P shortcut is allowed only when focus is outside inputs, textarea/contenteditable and dialogs, with no modifiers/repeat. Do not take over number entry or browser shortcuts. Button remains at least 44×44 CSS pixels.

Keep setting in React state for the current game session and reapply when a scene restarts. Default off for a new page/session unless later user preference work is approved. No server persistence is needed. Toggle remains available during movement; it is not a motion command and never increments moves. On game win/game over hide the overlay, retain toggle preference for restart; on unmount destroy its resources and listeners.

When enabled, place a translucent ring around the player, with a clear center so the character remains readable. It follows the **actual body position**, including movement and respawn. During movement retain ring/bearing with reduced background opacity; do not hide the educational reference unexpectedly. During rotation, update the primary bearing and numeric angle immediately to match gameplay. A faint previous-bearing mark and transient signed turn arc explain the action without claiming that input is locked until animation finishes. Reduced motion shows the same readings and static arc without a fade/sweep.

Desktop starting radius: 64 CSS pixels; major ticks 30°, mid ticks 10°, optional minor ticks 5° only if separation/readability permit. Cardinal labels bold; intermediate labels 30° apart. Use a contrasting rim/halo and amber bearing with a triangular tip. Labels stay upright and at least 12 CSS pixels. Fade visibility over 100–140ms (opacity only, no scale growth) in ordinary-motion mode. No pulsing overlay.

## Screen edges, walls and mobile

Keep the primary ring centered on the body even when it intersects a wall or leaves the canvas. Never shift the ring's center away from the player or rotate axes to make it fit. Clip outside the world viewport; keep visible ticks above wall art with low-opacity backing and let the main hero/exit stay recognizable. Avoid a solid disk that conceals walls.

Near edges, show a small **Facing** reference dial/readout in the DOM control panel as an explicitly separate duplicate; it uses the same angles and remains fully visible. The primary ring remains anchored and clipped. Phone layouts reduce label density (cardinals plus selected angle; 10° ticks) and put the detailed readout adjacent to the toggle. Users can inspect exact values there without pinch zoom. Never change mathematical radius/coordinates to mimic zoom.

The current canvas is CSS-scaled. Pass its `gameScale` into overlay sizing: desired screen radius/world radius = `rWorld = rCSS / gameScale`; font and line widths likewise need scale compensation. Cap ring world radius at 150 for the main overlay; if this would make the desired ring too small on a narrow phone, reduce tick density and rely on the separate reference dial. This avoids a large ring covering most of the maze. Minimum text size is achieved in the DOM dial even when the clipped main ring omits labels. No camera zoom/pan is introduced. Disable pointer hit testing on the overlay.

## Integration

Existing integration points: [GamePage.jsx](../../frontend/src/pages/GamePage.jsx) for state/control and current responsive scale, [MazeScene.js](../../frontend/src/game/scenes/MazeScene.js) for `setPreviewAngle`, `update` and reset lifecycle, [index.css](../../frontend/src/index.css) for accessible button/readout styling.

Proposed `visuals/ProtractorView.js` owns Graphics, labels and cached static ring geometry. Its methods: `setVisible(value)`, `setScreenScale(scale)`, `setPose(x,y,angle)`, `showTurn(previous,signedDegrees,current)`, `destroy()`. A thin scene method bridges React; new methods are proposals, not existing APIs. Rebuild static geometry only on scale/density changes. Move root and update bearing when pose changes. No per-frame recreation of text or Graphics objects. Ignore stale bridge calls after destruction; reapply preference in scene-ready/reset handling. A Protractor object has no Arcade body and never calls motion methods.

## Acceptance cases

| Input/state | Required result |
|---|---|
| 0°,90°,180°,270° | Needle points right/up/left/down respectively |
| 30°,45°,135°,225°,315° | Correct quadrants and sin/cos geometry; angle error ≤0.1° in numeric geometry |
| Left 30 from 350; Right 30 from 10 | Final 20 and 340; signed arc direction correct |
| Left 270; Right 450 | Show actual command direction/amount, full turns indicated, final value normalized |
| Decimal 12.5° and cumulative turns | Preserve precision in logic; readable rounded display does not feed back into math |
| Move/respawn near each edge/corner | Ring root within 0.5 world units of body, no origin shift; duplicate dial readable |
| Toggle 20 times during movement | No move-count/velocity/body change, no additional emitters/listeners, no extra callbacks |
| Restart/change level/win/unmount | No stale overlay; preference and cleanup match contract |
| Phone 360px wide, touch/keyboard/reduced motion | Operable toggle and readable separate dial; no focus trap; no particles or sweeps in reduced motion |

Test pure angle geometry separately from browser visual checks; exercise the same live commands with the overlay on and off and compare gameplay traces. See [quality gates](05-implementation-roadmap.md) F09/V05/A01.

## Current implementation and verification (2026-11-03)

Implemented in `frontend/src/game/visuals/angleGeometry.js` and `ProtractorView.js`, owned by `MazeScene.js`, and controlled by `GamePage.jsx`. The button is exposed on desktop and phone with `aria-pressed`, defaults off per game page, and stays enabled while commands are in progress. The view follows the authoritative player's Arcade body, uses screen-scaled ticks/labels, reduces the ring radius near canvas edges, draws a signed transient turn arc, and cleans its timer and display objects on scene shutdown. It has no physics body. No gameplay or persistence callback was added.

The focused local Chrome phone run in [Protractor review evidence](evidence/protractor-review-final/README.md) verified the accessible toggle and unchanged position/facing/move count on show/hide. It also performed the real React `+45` and Turn Left controls from 180°: facing became 225°, move count became one, and position remained `(740,60)`. The signed annotation was visually checked in the screenshot. Canvas/WebGL and headless Chrome only were exercised; reduced-motion, keyboard invocation, Canvas renderer fallback, boundary corners across both levels, and real devices still need explicit coverage.

Implementation adjustments from this specification: the primary dial shrinks discretely to fit its labels at world edges rather than shifting off the player, and the always-present Facing status row remains the readable numeric reference. DOM fade-in/out is not implemented yet; visibility is immediate. Do not count those items as completed acceptance cases until separately validated.
