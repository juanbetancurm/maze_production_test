# Full graphics regression after HUD update

## Result

The complete local browser suite passed **37 of 37 scenarios** in Chrome 157. The run includes the new HUD contrast/placement assertions and the existing gameplay, effects, accessibility, route startup, desktop, phone, tablet, and responsive checks. The trace records no browser errors, no stale interception events, and no failed viewport assertions.

## Performance observations

This was a 60-second headless-browser observation with SwiftShader, not a physical GPU or mobile-device benchmark.

| Scenario | Duration | Frames | P50 | P95 | P99 | Stalls over 50 ms |
|---|---:|---:|---:|---:|---:|---:|
| Level 2 idle | 60 s | 3,600 | 16.7 ms | 17.0 ms | 17.4 ms | 0 |
| Level 2 active movement | 60 s | 3,602 | 16.7 ms | 17.2 ms | 17.8 ms | 0 |

The active sample issued 179 moves and 178 turns without a rejected command. These results describe this isolated browser run only.

## Evidence

- `runtime-trace.json`: complete scenario results, requests, timings, browser metadata, and limitations.
- `scene-hud-level1.png`, `scene-hud-level2.png`: actual game scenes with the adjusted HUD.
- `react-level2-phone.png`, `react-phone-360x800.png`, `react-tablet-768x1024.png`, `react-phone-landscape-844x390.png`: responsive game views.
- Additional captures cover collisions, movement, exits, checkpoints, Protractor alignment, and loading/recovery states.

The six responsive viewport cases passed. Active hearts remained red (`rgb(197, 31, 53)`) and inactive hearts remained gray (`rgb(113, 128, 135)`).

## Reproduction

From PowerShell:

```powershell
cd C:\repos\anglemaze-platform\frontend
$env:ANGLEMAZE_BROWSER_NO_SANDBOX = '1'
$env:ANGLEMAZE_EVIDENCE_DIR = 'C:\repos\anglemaze-platform\docs\graphics-upgrade\evidence\full-regression-after-hud-v1'
node tests/graphics/run-baseline.mjs
Remove-Item Env:ANGLEMAZE_BROWSER_NO_SANDBOX
Remove-Item Env:ANGLEMAZE_EVIDENCE_DIR
```

## Limitations

The run used a temporary isolated profile and disabled the browser sandbox for this local fixture. Physical Android/iOS devices, Firefox/WebKit, and real-GPU performance remain unmeasured. Owner visual sign-off is still required.
