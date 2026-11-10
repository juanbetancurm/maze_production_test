# Runtime asset payload cleanup v1

The selected production art stays in `frontend/public/assets/premium/`. Superseded concept sheets and unselected texture experiments were moved to `docs/graphics-upgrade/source-assets/`; the game does not reference these files at runtime. This prevents Vite from copying them into every production build and keeps the originals available for future art review.

Fourteen environment/checkpoint files were removed from `public/`, totaling **11,512,388 bytes**. Three unused character candidates (the old walk atlas and the old golem art/normal map) were also archived. The player walk v2 atlas was separately replaced with a 2× resample, reducing that runtime request from 1,161,923 to 138,889 bytes while retaining four frames. Grass uses the previously reviewed JPEG export instead of the opaque source PNG.

The premium asset directory in the successful production build totals **7,298,259 bytes**, compared with **23,324,111 bytes** at baseline commit `cfbef8e821b80a4d55e754702d01ecb56b13fda7`: a reduction of **16,025,852 bytes (68.7%)**. The build packaging check found all 11 currently referenced premium runtime images and confirmed that 18 archived/superseded images are absent from `dist/`.

Before removing the files, each was copied into the source archive and verified with matching SHA-256 hashes. A repository source search confirmed that production modules do not reference these archived names. `run-baseline.mjs` retains the assertion that the checkpoint presentation sheet is not requested; the active and claimed states load from their standalone transparent WebP files.

## Validation

- `npm run lint`: passed.
- `npm run build`: passed; 11 active premium assets present, 18 archived/superseded assets omitted, and no missing referenced textures.
- Browser verification of the resized walk atlas was attempted. Chrome 157 started, but its DevTools Protocol session timed out on `Page.enable` before fixture initialization, so no new in-game screenshot or runtime trace was captured. Prior scene captures do not validate this newer atlas.
