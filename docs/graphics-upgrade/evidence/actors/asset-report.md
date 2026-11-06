# G03 static actor candidates

Prepared 2026-11-03 with the built-in image generation tool, then exported at runtime dimensions with deterministic PNG resizing. These are **review candidates**, not yet integrated or approved final art. Worker B changed only the two new runtime assets and this evidence directory; protagonist, code, shared manifests and dependencies were untouched by this task.

## Deliverables

| Candidate / preview | Runtime pixels | Bytes | Visible bounds (alpha > 0, inclusive) | Proposed pivot |
|---|---:|---:|---|---|
| [Stone golem](../../../../frontend/public/assets/premium/characters/golem-static-v1.png) | 192×192 | 40,010 | x=8..183, y=38..153 | Normalized (0.5,0.5); logical (96,96) |
| [Exit base](../../../../frontend/public/assets/premium/objects/exit-base-v1.png) | 128×128 | 23,211 | x=14..113, y=14..112 | Normalized (0.5,0.5); logical (64,64) |

SHA-256:

```text
golem-static-v1.png 661f8f2e5b9528ecd4928279bfedab9a4e938952ddc2a01ad8a8197418d8944f
exit-base-v1.png    4665ed5615813a6677d42c9a7bbd4c0855212de645a85d8067d95f44a2fc49db
```

## Transparency and export checks

Both runtime files are 32-bit RGBA PNGs with true transparent pixels and **zero nontransparent perimeter pixels**. Golem: 22,109 fully transparent, 14,300 partially transparent and 455 opaque pixels. Exit: 6,568 fully transparent, 9,435 partially transparent and 381 opaque pixels. Most interior source pixels use alpha 253/255; this near-opacity was preserved rather than forced to opaque. Half-opacity bounds: golem x=8..182, y=39..153; exit x=15..112, y=15..111.

The image tool produced 1254×1254 sources despite the requested smaller frame. Original source previews are preserved unchanged: [golem source](golem-static-v1-source.png) (1,005,817 bytes) and [exit source](exit-base-v1-source.png) (1,404,019 bytes). Source hashes: golem `17a8737d9b4fb61566daa2dd5c3f45e80a378443dd8aee3e9f98277c7cc09c7c`; exit `9f12720d32633df97fc419f7b2d896238d750d65ef628d04bb5c82fe2336c108`.

Mechanical export used System.Drawing at fixed square size with HighQualityBicubic interpolation, SourceCopy alpha composition and TileFlipXY edge sampling. It preserved the complete source framing and aspect ratio. A four-connected flood fill removed only border-connected alpha ≤4/255 before resizing; after resize the same rule at ≤1/255 removed remaining faint edge noise. Cleared nonzero source pixels: 5,773 golem and 22,370 exit; post-resize cleanup: 5 golem pixels and 0 exit pixels. The internal eye light and plate amber accents were not targeted by this cleanup. No character repainting occurred during export.

## Visual review and integration notes

The golem is a single high top-down, downward-facing pose with warm stone facets, moss and amber eyes. It contains no poster, grass patch, text or separate cast shadow. The exit is an isolated slate plate with three upward chevrons and the correct word EXIT; its amber accents are baked into the base, with no external glow layer or presentation panel. Both runtime outputs were visually inspected after resizing.

At a full-frame display width of 100 world units, the golem's visible width is about 91.7 units; at 64 units the exit's visible width is 50 units because transparent padding is preserved. Account for this when reviewing apparent scale, without changing hazard/exit body dimensions. The proposed pivots center the visible forms; final ground alignment needs the in-game integration preview.

Keep the existing four tiny wall hazards and their life-loss behavior; the new golem drawing receives no new body or AI. Exit trigger separation and its baseline bounds remain the manager's responsibility. In-game composition, phone readability, compositing on light/grass backgrounds and the final source-of-truth art review remain pending. This packet is static art only, not an animation atlas.

The original player hash remains `a257ec5c1e5784eb21e38a8f0679d27e70bdc0eb771891deb62df86179de9258`. [Full generation prompts and references](generation-prompts.md) record the production provenance.
