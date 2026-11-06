# Collision geometry and golem tracking regression review

Date: 2026-11-05

## Findings from the current implementation

- The player's wall physics body remains the existing 20×20 Arcade body. Golem contact is checked separately, so changing the artwork cannot alter wall collision response.
- Golem contact uses the opaque player and golem image footprints, scaled to their displayed sizes. Green moss is excluded from the golem footprint; separately rendered shadows are not used for contact. The images are centered at the same anchors used by rendering.
- The player footprint follows its rendered rotation. A continuous separating-axis sweep checks the authoritative body path between frames, preventing fast movement from tunneling through the golem without adding a detection radius. There is no separate awareness radius.
- Each golem's image smoothly eases its facing angle toward the player's current position in `MazeScene.update()`. The collision footprint and shadow are independent of this visual facing; no chase or attack behavior was added.
- In development, add `?debugCollision=1` to a game or fixture URL to show live player alpha outline, red Arcade player body, golem outlines, wall Arcade bodies, anchors, movement path, and last collision source. It is disabled in production builds and by default.

## Regression results

The focused local Chrome 156 harness passed all six selected scenarios:

- Level 1 and Level 2 asset/scene initialization.
- Level 1 wall contact retains its wall-specific response and life loss.
- Twelve golem checks from above, below, left, right, and two diagonals: each 12 px clear-gap probe stayed clear, and each 12 px overlap probe contacted.
- Player footprint collision remained detectable at 0°, 45°, 90°, 135°, 180°, 225°, 270°, and 315°; the swept-path probe passed.
- A real scene movement into a golem produced the existing one-life response with cause `golem`.
- Four enemy approach scenarios each applied one existing life loss.
- Golems eased toward the player's target position; their final facing error was below 0.00003 radians in this fixture run.

Full observations: `runtime-trace.json`. Earlier live boundary captures are in `../collision-debug/` (`golem-contact-debug.png`, `golem-tracking-debug.png`, `wall-contact-debug.png`).

## Limitations

The collision outline is a convex hull of opaque pixels, so it can conservatively bridge a concave transparent notch inside an actor silhouette. The probes validate clearances around the hull, not pixel-perfect contact for every transparent interior gap. If the live overlay still shows a body-to-body gap at contact, the next targeted refinement should replace that actor's single convex hull with a small compound set of physical lobes. No collision code is claimed to be pixel-perfect.

This run uses deterministic scene fixtures and headless desktop Chrome; it does not replace final hands-on mobile validation.
