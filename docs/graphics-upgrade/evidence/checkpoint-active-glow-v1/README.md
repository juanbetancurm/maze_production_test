# Active checkpoint glow review v1

The current active checkpoint now has a soft radial halo behind its supplied badge. The halo moves to the newly activated checkpoint, never changes the badge size or the 30×30 overlap zone, and pauses in reduced-motion mode. It is scene-owned and destroyed on shutdown.

## Evidence

- [`scene-level2-checkpoint.png`](scene-level2-checkpoint.png) — WebGL activation and checkpoint state.
- [`scene-level2-checkpoint-glow-canvas.png`](scene-level2-checkpoint-glow-canvas.png) — Canvas rendering with the player moved clear of the active marker.
- [`runtime-trace.json`](runtime-trace.json) — active position, animation lifecycle, renderer, and reduced-motion results.

## Results

- The activated badge and halo both resolve to `(645, 525)`; the pulse runs in normal motion mode.
- Canvas displayed the halo correctly. Enabling `prefers-reduced-motion` stopped its tween and held alpha and position steady; returning to normal motion resumed the pulse.
- Existing checkpoint activation and lives behavior remained intact. The effect uses no new package or art asset.
- Focused actual-scene Chrome checks passed with zero browser errors. Production build and ESLint pass; Vite continues to report the existing large GamePage chunk.
