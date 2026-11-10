# Grass v5 candidate review

The v4 runtime texture showed a repeated flower/leaf grid at the existing 512-world-unit tile scale. Two generated candidates explored a calmer, larger-leaf treatment and wrap continuity. They remain **review artifacts only**; neither is loaded by the game.

## Candidate checks

| Candidate | Repeat proof | Edge RGB MAE (LR / TB) | Max edge channel difference (LR / TB) | Decision |
|---|---|---:|---:|---|
| [Initial v5](grass-reference-v5-candidate.png) | [3×3 repeat](grass-reference-v5-candidate-repeat-3x3.png) | 2.967 / 3.892 | 37 / 31 | Reject for now: broad leaf clusters drift from the requested fine foliage and borders remain imperfect. |
| [Seam edit](grass-reference-v5-seam-candidate.png) | [3×3 repeat](grass-reference-v5-seam-candidate-repeat-3x3.png) | 3.616 / 4.402 | 47 / 43 | Reject: the edit worsened edge continuity metrics and made the repeated flowers more conspicuous. |

Measurements are mean absolute RGB differences between paired opposite edge pixels; the maximum is the largest individual RGB-channel difference. They are diagnostics, not a substitute for the repeat proofs. The two generated images are 1254×1254 PNGs.

## Current runtime decision

Keep the approved v4 art and its aligned normal map. Runtime now uses its q96 `grass-reference-v4.jpg` color export; the original PNG master is preserved in the graphics-upgrade source archive outside the public asset directory. The world tile scale remains 800 so the fixed 800×600 playfield shows one detailed texture across its width and does not expose the former 512-unit repeat grid. The approved art style and WebGL lighting remain intact. Since the source texture still has imperfect borders, a wider world or camera zoom-out would expose repetition; G02 still needs a production-approved seamless tile before those conditions are supported.

The actual Level 1, Level 2, and emulated phone captures at this scale are in [the runtime review](../grass-v4-worldscale-review/). The run used headless Chrome 156 and completed the three selected inventory/layout scenarios with no browser errors. The phone capture is viewport emulation, not a physical-device test.
