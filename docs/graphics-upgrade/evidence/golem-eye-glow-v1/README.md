# Golem eye-glow review v1

This change derives a small emissive overlay from the yellow eye pixels in the existing approved golem sprite. It adds no external asset or dependency. The overlay follows the rendered golem's position, rotation, scale, and depth; its intensity pulses with the existing idle lift. The golem's logical anchor, collision body, and tracking behavior are unchanged.

## Evidence

- [`scene-level2-golem-eye-glow.png`](scene-level2-golem-eye-glow.png) — WebGL Level 2 scene after the weighted-idle sample.
- [`scene-level2-golem-eye-glow-canvas.png`](scene-level2-golem-eye-glow-canvas.png) — Canvas scene with reduced-motion mode enabled.
- [`runtime-trace.json`](runtime-trace.json) — renderer inventory, idle pulse, anchor stability, and Canvas/reduced-motion checks.

## Results

- Four golems each received one overlay; the dynamic glow texture was created from the loaded art.
- Eye-glow object alpha changed by `0.0901` over the idle sample, and each overlay stayed aligned with its rendered golem.
- Golem render anchors, collision anchors, and player position remained fixed during the idle sample.
- Canvas displayed all four overlays. Reduced-motion mode held their pose and alpha steady.
- The focused Chrome run passed with no browser errors. Build and ESLint pass; Vite still reports the existing large GamePage chunk.

The effect remains deliberately restrained. Review it at normal desktop and phone sizes before approving the art polish.
