# Player walk cycle candidate prompt

Generated with the built-in image generation tool on 2026-11-03 using the transparent background option.

## References

- `frontend/public/assets/player.png` — existing top-down player art and facing-up orientation.
- `C:/Users/juanj/OneDrive/Desktop/AngleMaze/AngleMaze Hero Design Sheet.png` — approved identity and component details. The prosthetic leg is shown in other views but not clearly in the current runtime sprite's back-facing view.

## Full prompt

```text
Create a production review candidate for a top-down game sprite sheet by EDITING/faithfully reconstructing the existing playable character from the references. Output one horizontal strip containing exactly four square 128x128 animation cells (overall 512x128, 4:1 aspect ratio), transparent RGBA. Every cell is a separate consecutive frame of the same subtle walk cycle, viewed from directly above and facing UP toward the top edge, showing the back of the cap/head and the orange sleeves as in reference image 1. Keep the character's center and ground pivot stable in all four cells, with the feet/pivot centered at (64,112) in each cell; do not let the sprite drift. Preserve the recognizable dark rounded cap/head silhouette with its segmented crown, warm skin tone, orange shirt and sleeves, blue wrist bands, navy shorts, brown backpack/straps, and black/dark hand-painted outline. Keep the original compact top-down art style and proportions from image 1; use image 2 only to understand that this is the same hero, its approved design, and its metallic prosthetic leg on the character's anatomical left side when visible. Important: from this upward/back view the prosthetic side is not clearly visible in the current approved top-down source, so do not invent or expose new anatomy; preserve the existing visible identity and mark identity/anatomy review as required in accompanying evidence. Do not mirror any frame, do not rotate the character, do not add text, UI, arrows, background, ground, shadows, glow, props, or extra characters. No camera changes. The four frames vary only in small alternating arm/leg walking motion, while the cap/head/backpack remain consistent. Keep each complete character fully inside its own 128x128 cell with clear transparent gutters between cells.
```

## Export note

The image tool returned a full-resolution 2172×724 RGBA strip. Four evenly spaced cells were cropped into 610×610 transparent squares around the character's stable feet line and resampled with System.Drawing high-quality bicubic interpolation to 128×128 each. No mirroring or frame reordering was applied. Candidate cleanup set only post-resize alpha values 1–16/255 to fully transparent to remove faint edge artifacts; the full-resolution source remains unchanged.

The existing runtime player sprite shows only the back-facing cap/head and orange sleeves. It does not make the approved prosthetic side clear. The generated candidate includes lower-body/boot views, so anatomy and identity review is required before integration; no prosthetic detail was invented.
