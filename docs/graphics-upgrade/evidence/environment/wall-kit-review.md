# Modular timber wall kit — isolated G02 art review

2026-11-03. **Recommended candidate: strip v2 + caps v1 + join v1.** Art/proof only; nothing is loaded by the game. Grass v1/v2 and existing grass are unchanged. No source, manifest, dependency or commit changes were made by this task.

## Review images

- [Recommended 800×600 proof](wall-kit-v2-composed-joins-native.png): actual 16px visual width on preliminary grass v2. Includes horizontal, vertical, two diagonal slopes, L/T joins and two angled joins. The lower-left acute fork reproduces Level 2's `(160,320)→(100,450)/(200,450)` angles, translated for presentation.
- [Recommended proof at 2× nearest-neighbor enlargement](wall-kit-v2-composed-joins-2x.png).
- [Exact 3×3 strip repeat](wall-strip-v2-repeat-3x3.png), 384×96, with original alpha. Vertical repetition is only a texture inspection; walls repeat along X, not Y.
- [Initial separate-piece diagnostic](wall-kit-v1-joins-native.png) and [alpha on dark/light backgrounds](wall-kit-v1-alpha-proof.png). The initial proof showed fine sampling bars at separately rotated tile boundaries. Composing unscaled repeats into one segment image before rotating removed those bars in the recommended proof. This is System.Drawing evidence, **not a Phaser result**.

Visual verdict: coherent warm timber against quiet grass, readable grain at 16px, no obvious cracks at demonstrated joins. The refined strip uses broad grain rather than compressing the entire generated plank. Cap/strip grain transitions remain discernible at 2×, and simple circular join posts look functional rather than elaborate. This is a preliminary modular kit for manager review, not complete-scene production approval.

## Exports and placement contract

All runtime candidates are RGBA PNGs under `frontend/public/assets/premium/environment/`. Keys below are suggestions only; the manager owns the manifest.

| Export | Pixels | Proposed key | Display / pivot |
| --- | --- | --- | --- |
| [wall-strip-v2.png](../../../../frontend/public/assets/premium/environment/wall-strip-v2.png) | 128×32 | `premium-wall-strip` | Uniform scale 0.5: 64×16 world units; grain along local +X, centerline y=16 source pixels |
| [wall-cap-start-v1.png](../../../../frontend/public/assets/premium/environment/wall-cap-start-v1.png) | 32×32 | `premium-wall-cap-start` | 16×16; rounded tip at local −X, origin `(0,0.5)` on the segment start |
| [wall-cap-end-v1.png](../../../../frontend/public/assets/premium/environment/wall-cap-end-v1.png) | 32×32 | `premium-wall-cap-end` | 16×16; rounded tip at local +X, origin `(1,0.5)` on the segment end |
| [wall-join-v1.png](../../../../frontend/public/assets/premium/environment/wall-join-v1.png) | 32×32 | `premium-wall-join` | 16×16; origin `(0.5,0.5)` at a verified intersection; same post covers L/T/angled connections |

Rotate segments/caps by screen `atan2(dy,dx)`. No cast shadows are baked in; any future contact shadow must stay in world/screen lighting orientation. The strip has a shallow material bevel, so rotational consistency still needs complete-scene review.

Proof composition: body runs from 8 to length−8 world units; cap frames occupy the first/last 16 units, overlapping the body inward. Crop the final strip repeat instead of stretching it. This proof rule is for lengths ≥32. **Do not apply it unchanged to the real 10-unit span or four √2 enemy stubs.** Those require explicitly clipped short geometry and the manager's existing-body footprint treatment, with the stubs beneath golems. No length-only deletion/classification, coordinate snapping, new bodies or collider resizing is implied. A 16-unit drawing remains wider than the existing 8-unit straight collider: integration must resolve contact readability without changing physics.

## Method and measurements

Three original transparent images were generated with the built-in imagegen tool; no third-party artwork or new dependencies. [Prompts and retained masters](wall-kit-prompts.md) record provenance. [Export/proof script](export-wall-kit-v1.ps1) preserves alpha, performs crop/resize/rotation and builds review compositions; it does not repaint or blend seams.

The strip master is 2172×724 with the significant wood band approximately y=257…463. Initial v1 compressed that whole band into 128×32 and is retained as a diagnostic only. Recommended v2 uniformly resizes a **852×213 crop at (1062,254)** to 128×32. That crop was selected by minimizing first/last-column RGB difference among even X positions at the fixed 4:1 aspect ratio. End cap crops the master's rounded end to a near-square 654×653 frame at (455,300); start cap is its 180° rotation, without mirroring. Join uses a square 1228×1228 crop at (12,25). Source masters remain intact.

| Strip repeat metric, channel scale 0–255 | Initial v1 | Recommended v2 |
| --- | ---: | ---: |
| Left/right RGB mean absolute difference | 1.677083 | 2.885417 |
| First/second column RGB MAE, local reference | 1.437500 | 1.354167 |
| Maximum left/right channel difference | 7 | 11 |
| Left/right alpha MAE | 0.156250 | 0.250000 |

V2 trades slightly higher measured edge difference for correct uniform export proportions and calmer grain; the repeat proof shows no conspicuous seam at the reviewed scale. These measurements do not establish exact periodicity. Strip alpha spans 114…255 (edge antialiasing; no fully transparent pixels within its tightly cropped frame). Caps/post include fully transparent outside pixels. Generated background alpha was preserved; no checkerboard or solid background was substituted.

Successful commands: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File docs/graphics-upgrade/evidence/environment/export-wall-kit-v1.ps1` and the same with `-Refined`; `Get-FileHash -Algorithm SHA256`; original-detail `view_image` inspections. The first direct script invocation hit the existing PowerShell execution policy; the successful commands use only a process-local policy and change no machine policy. The script refuses to overwrite existing outputs. No gameplay tests were run for this asset-only task.

| Export | Bytes | SHA-256 |
| --- | ---: | --- |
| wall-strip-v2.png | 8895 | `86ab57c0320eba125e744dbe19d5c22b9f2a14be8dd85e4b4b2525ef660dfc47` |
| wall-cap-start-v1.png | 2718 | `3a01b13463fd97700cb1f894d103117b780c782c4cf839400e437a0d7ee31ec0` |
| wall-cap-end-v1.png | 2719 | `dab87458861bfc7cb42b8fb9f286f153a3214bf923d129e6cf8e90c8dcf0e2ff` |
| wall-join-v1.png | 2751 | `f335627c07c9215f6b967c77c2a2ae31870f2e7c28784ddfb71b0c563b6acf98` |
| wall-strip-v1.png, diagnostic | 9303 | `2d84828155ccd4e9d05f124cc584fae8d8cd8c92f6457db123ebe2a36057791d` |

Next gate belongs to the manager: approve the material/scale, then inspect both complete levels with unchanged collision footprints, tiny stubs, short spans, perimeter clipping, actors, and phone scale. Confirm WebGL/Canvas sampling and alpha; do not infer runtime performance or collider correctness from this proof.
