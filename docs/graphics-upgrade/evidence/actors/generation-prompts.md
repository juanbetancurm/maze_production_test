# G03 generation provenance

Mode: built-in `image_gen.imagegen`, transparent_background=true, 2026-11-03. No CLI/API fallback or added dependency. Runtime export details and source hashes are recorded in [asset report](asset-report.md).

## Stone golem

References: `C:/Users/juanj/OneDrive/Desktop/AngleMaze/GolemT-D.png` (subject) and `frontend/public/assets/premium/environment/grass-quiet-v2.png` (style/palette). Original generated output: `C:/Users/juanj/.codex/generated_images/01a19f62-d7ae-7112-a101-b1ea717b4432/exec-bb35b2fe-d13a-4bcc-bb3c-8180755b8c29.png`.

```text
Use case: background-extraction / stylized-concept game sprite.
Asset type: one production static Stone Golem sprite for the top-down AngleMaze browser game, on a truly transparent RGBA background.
Input images: Image 1 (GolemT-D.png) is the subject and shape reference. Reconstruct ONLY its large central stone golem as a clean isolated game sprite; discard the poster, all text, grass patch, pebbles, tiny alternate figures and borders. Image 2 (grass-quiet-v2.png) is only the environment palette/soft painterly finish reference, NEVER include that grass or any ground in the output.
Subject: compact heavy stone golem seen from a high top-down camera, head and shoulders dominating, broad segmented rounded stone arms, warm gray/slate facets, two restrained moss patches on the upper shoulders, two small warm amber-yellow eyes visible along the lower/front edge. Face toward the bottom of the square image. Keep the coherent chunky silhouette of the main reference; this is one character, one pose, not a sprite sheet.
Rendering: premium hand-painted 2D game art, clean dark material-colored outlines, broad readable facets, subtle brushwork, soft upper-left/near-overhead light, consistent diffuse shading, little high-frequency noise. Match a quiet illustrated green meadow with crafted wooden walls. Do not make photorealistic rock, glossy 3D plastic, or pixel art.
Composition: square 512x512 PNG if supported; center the entire isolated character with uniform transparent padding around all edges, roughly 80–85% canvas width. Keep all arms and lower silhouette fully inside the frame. Ground projection centered. No cast shadow, contact shadow, glow halo, floor, backdrop, border, label, text or extra props; shadow is rendered separately by the game. Preserve true transparent pixels outside the character and clean anti-aliased edges without colored matte. This is the only output.
```

## Exit base

Reference: `C:/Users/juanj/OneDrive/Desktop/AngleMaze/ExitNew.png`. Original generated output: `C:/Users/juanj/.codex/generated_images/01a19f62-d7ae-7112-a101-b1ea717b4432/exec-47a28133-3cf7-4a16-9be8-ae0f7ab2ae9f.png`.

```text
Use case: background-extraction / precise-object-edit.
Asset type: one production static exit objective base sprite for the high top-down AngleMaze 2D browser game, transparent RGBA PNG.
Input image: ExitNew.png is the design reference/edit target. Reconstruct ONLY its central dark square exit plate as a clean isolated sprite. Preserve the reference's recognizable design: beveled dark slate segmented square frame, four small amber corner accents, short amber side bars, a circular amber rim, three upward chevrons above the word EXIT.
Remove completely the pale rectangular presentation panel, blue heading pill, all heading text and large cast panel shadow. Include no grass, floor, scenery, borders outside the plate, or extra objects.
Style: refined premium hand-painted 2D game art for a quiet illustrated meadow with warm wooden maze walls and a warm-gray stone golem. Broad softly brushed slate material, restrained clean outlines and upper-left light, crisp geometric icon and legible text. Keep amber features bright but solid and controlled, without a huge soft glow halo, radiating rays, bloom or sparkles; lighting effects will be separate game layers.
Composition: square 512x512 PNG if supported. Plate centered, straight-on top-down orthographic layout, no perspective skew, entire plate visible with equal transparent padding roughly 8–10% on all sides. The plate itself should remain square.
Text (verbatim): "EXIT" in uppercase warm amber, horizontally centered, bold clear sans-serif lettering, exactly E X I T and no other words. Three upward chevrons point to the top of the image.
Constraints: genuinely transparent pixels around the plate, clean anti-aliased silhouette without white fringe or colored matte; no cast shadow, no backdrop, no watermark, no mockup sheet, no labels. One single exit base asset only.
```
