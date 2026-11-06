# Player walk v2 identity review candidate

This is the approved v2 source sheet. The existing `frontend/public/assets/player.png` remains as the optional fallback; the runtime scene now uses the v2 sheet when loaded.

## File and source

- [PNG source](player-walk-v2-review-source.png): 2172×724 pixels, 8-bit RGBA (PNG color type 6), 870,083 bytes.
- SHA-256: `3EF8C0CEF4C1CC7F3D5E5FA0960F95EE2722DB858BF420707C706B8B39EEC5C0`.
- Four consecutive, unmirrored, upward-facing walk poses are arranged horizontally. The source has a transparent channel and was generated with transparent-background mode.
- Built-in image generation used the existing player sprite as appearance/orientation reference and `AngleMaze Hero Design Sheet.png` as the authoritative clothing/prosthetic reference. The output is stored here for review; it is not in the runtime asset manifest.

## Review notes

The character has the segmented dark cap, orange sleeves, backpack, dark shorts and brown boot from the design. The metal left leg (screen-left in the upward/back view) is visible in all four poses. The owner approved v2 for integration on 2026-11-03. Its body/backpack coverage differs from the old cap-and-sleeves crop, so the original sprite remains loaded as a graceful fallback.

The sheet is 3:1: each equal frame cell is 543×724. Runtime Phaser loads those four frames directly and displays each cell at 72×96, preserving its 0.75 aspect ratio. The image was not cropped, resized or color-edited. A local motion trace verified frame advancement, neutral frame reset, and sprite/body alignment.

## Generation constraints

Prompt requested exactly four transparent, evenly placed, top-down/back-facing walk poses; preserved current cap/sleeve identity; retained the canonical left metal prosthesis and right brown boot; prohibited mirroring, poster layout, text, background, shadows and extra characters. The source was added as a new versioned runtime asset; the legacy `player.png` was not overwritten.
