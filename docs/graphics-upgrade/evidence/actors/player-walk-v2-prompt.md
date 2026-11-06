# Player walk v2 generation prompt

**Input images:**

1. `frontend/public/assets/player.png` — exact current playable sprite, cap/sleeves, silhouette and facing-up orientation.
2. `C:/Users/juanj/OneDrive/Desktop/AngleMaze/AngleMaze Hero Design Sheet.png` — owner-provided final hero design, including the top-down walk poses and metallic prosthetic.

**Prompt:**

> Create a review-candidate sprite sheet for a top-down browser maze game. Make exactly four consecutive walk-cycle frames of the same character, horizontally aligned in four equal square frames, each facing UP toward the top of its cell. Use image 1 to preserve the dark segmented cap/head silhouette, visible ears, orange sleeves, hand-painted dark outline, proportions and orientation. Use image 2 as authoritative for the approved backpack/clothing and especially the metallic prosthetic leg. The character's anatomical LEFT leg must be visibly metallic in every frame; because the character faces away/up, place it on the viewer's LEFT side. Match the reference's sturdy articulated gray-steel shin, round joint and metal foot with restrained highlights. The other leg has the brown boot. Show small alternating arm and leg steps; keep cap/head, torso, lighting, scale, facing and ground pivot stable. Keep each complete character inside its cell, with transparent gutters between cells. Preserve the friendly outlined game-art style and warm orange/navy/brown palette. Preserve the memorial character. Do not redesign the cap/head, omit or recolor the prosthetic, mirror any frame, rotate the facing direction, add text, labels, poster layout, background, grass, shadow, UI, extra characters or other objects. Return a transparent RGBA production-review candidate.

Image generation returned a 2172×724 source; the equal cells are 543×724. The canvas was copied to the evidence directory unchanged and has not been prepared for runtime use.
