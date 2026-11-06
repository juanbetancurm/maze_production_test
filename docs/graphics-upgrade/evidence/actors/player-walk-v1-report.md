# Player walk cycle candidate report

Review candidate only. This generated atlas was rejected and removed from `frontend/public`. It does not replace the owner's `frontend/public/assets/player.png` and is not part of current runtime.

## Files

| File | Dimensions | Bytes | SHA-256 |
|---|---:|---:|---|
| `frontend/public/assets/premium/characters/player-walk-v1.png` | 512×128 RGBA (4 horizontal 128×128 cells) | 46,419 | `B2558BFEF65482FBCFEBA887BF2880AD4B4307E0BA8C214F3DFA5182FD3431D6` |
| `player-walk-v1-source.png` | 2172×724 RGBA | 721,310 | `DCDF2374E16318D7DED7F24D5E1719BF1EC7D1455E4E4561B4A77D9DE0A64693` |
| `player-walk-v1-preview.png` | 2048×512 RGBA checkerboard preview | 687,055 | `8BE3C2C6EFE59C613419294244609CA412295DAD48D96A1B96E2324A617A36EC` |

Candidate pixel counts: 47,588 fully transparent, 16,934 partially transparent, 1,014 fully opaque. All outer perimeter pixels are transparent. Visible per-frame bounds (inclusive): frame 1 `x=34..95, y=12..110`; frame 2 `x=161..223, y=12..112`; frame 3 `x=289..350, y=12..110`; frame 4 `x=417..480, y=12..112`.

The existing player source shows the back of the cap/head and orange sleeves but not the approved prosthetic side. The candidate therefore needs anatomy and identity review before integration; no prosthetic detail was added. See [full prompt and export note](player-walk-v1-prompt.md) and [enlarged preview](player-walk-v1-preview.png).
