# Grass source PNG and runtime JPEG review v1

The approved v4 grass art remains visually unchanged in the game; its fully opaque color texture is now exported as a high-quality JPEG for runtime loading. The original PNG master is preserved in `docs/graphics-upgrade/source-assets/`, outside Vite's public directory. The 1254 × 1254 dimensions are identical, so the aligned normal map, one-tile playfield scale, and all world geometry remain unchanged.

## Transfer comparison

| File | Format | Dimensions | Bytes |
|---|---|---:|---:|
| `docs/graphics-upgrade/source-assets/grass-reference-v4.png` master | PNG, RGB | 1254 × 1254 | 1,945,719 |
| `grass-reference-v4.jpg` runtime | JPEG quality 96 | 1254 × 1254 | 477,806 |
| `grass-reference-v4-normal.png` | PNG normal map | 1254 × 1254 | 2,442,422 |

The color image is 75.4% smaller. On WebGL, the color/normal pair totals 2,920,228 bytes instead of 4,388,141 bytes, a 33.5% reduction before HTTP headers. Canvas uses the smaller color image without downloading the normal map.

The source and runtime files can be opened directly: [source PNG master](../../source-assets/grass-reference-v4.png) and [runtime JPEG](../../../../frontend/public/assets/premium/environment/grass-reference-v4.jpg).

## Validation and limitation

- The source PNG is `Format24bppRgb`; it has no transparency, so JPEG does not discard alpha data.
- Direct image review at full texture size showed no obvious blocking, ringing, or color shift at the supplied texture scale.
- `npm run lint` and `npm run build` passed. Vite copied the JPEG into `frontend/dist/assets/premium/environment/grass-reference-v4.jpg`; the existing large `GamePage` chunk warning remains.
- The PNG master is outside the public tree, so the production build no longer packages both color-texture versions.
- The actual-scene browser run could not initialize: both local Chrome and Edge sessions timed out on the CDP `Page.enable` command before the fixture rendered or requested assets. A direct headless screenshot attempt also failed when the browser GPU process exited with code `-1073741790`. The CDP failure is recorded in [`runtime-trace.json`](runtime-trace.json). This is an environment/harness limitation; no in-game screenshot or runtime asset-request result is claimed here.

No renderer, texture filter, normal map, collision, movement, or maze data was changed for this optimization.
