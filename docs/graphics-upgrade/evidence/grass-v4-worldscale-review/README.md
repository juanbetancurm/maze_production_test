# Detailed grass at fixed world scale

At the time of these captures, the approved `grass-reference-v4.png` was the runtime color image. Runtime now uses the same 1254 × 1254 art as the q96 `grass-reference-v4.jpg` export; its original PNG master is preserved in the graphics-upgrade source archive. The dimension-matched normal map remains unchanged. The runtime grass tile scale is 800 world units, so one texture spans the fixed 800-unit playfield width. This removes the former 512-unit visible repeat grid in both current levels while preserving the detailed foliage style and Light2D pairing.

## Visual evidence

- [Level 1 desktop scene](scene-level1-desktop.png)
- [Level 2 desktop scene](scene-level2-desktop.png)
- [Level 2 phone layout](react-level2-phone.png)

The emulated 390×844 React capture fills the canvas without the blank band seen in one earlier transient screenshot. DOM measurements are recorded in the trace. This is viewport emulation, not a physical phone review.

## Validation

Headless Chrome `156.0.8078.75` completed `level1-themed-inventory`, `level2-themed-inventory`, and `react-level2-phone` with no browser errors. Both scene inventories selected WebGL and loaded the aligned `premium.grass` and `player` normal maps. The mobile canvas retained its 800×600 bitmap at a 358×268.5 CSS display size.

The runtime view no longer repeats the texture within the fixed game width, but the source image is not mathematically seamless. A larger world or zoomed-out camera would expose its imperfect borders; a production-approved seamless export remains open under G02. No movement, collision, level geometry, or gameplay state was changed for this scale adjustment.
