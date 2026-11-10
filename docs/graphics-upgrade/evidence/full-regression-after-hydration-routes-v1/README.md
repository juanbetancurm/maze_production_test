# Full graphics regression after hydration-route polish

## Result

All **37 of 37 browser scenarios passed** in Chrome 157. The run includes the shared team restoration screen on registration, LevelMenu, and game entry, the HUD layout checks, gameplay interactions, reduced motion, route recovery/prefetch, and responsive UI. It recorded zero browser errors, zero intercepted-fetch errors, and six passing responsive viewport cases.

## Performance observations

These 60-second samples ran in headless Chrome with SwiftShader. They are useful for repeatable local comparison, not physical device or real GPU claims.

| Scenario | Frames | P95 | P99 | Stalls over 50 ms |
|---|---:|---:|---:|---:|
| Level 2 idle, 60 s | 3,599 | 17.1 ms | 17.5 ms | 0 |
| Level 2 active, 60 s | 3,610 | 17.3 ms | 17.7 ms | 0 |

The active sample completed 179 moves and 178 turns without a rejected command.

## Evidence

- `runtime-trace.json`: full scenario output, browser metadata, mocked API requests, timing observations, and limitations.
- [Hydration route polish](../hydration-route-polish-v1/README.md): screenshots of delayed registration, LevelMenu, and game loading states.
- [HUD contrast review](../hud-contrast-review-v2/README.md) and [the preceding full scene captures](../full-regression-after-hud-v1/README.md): desktop and mobile game screenshots.

This full run used `ANGLEMAZE_CAPTURE_SCREENSHOTS=0` to avoid duplicating large PNG files. Screenshot capture remains enabled by default in the browser harness.

## Reproduction

From PowerShell:

```powershell
cd C:\repos\anglemaze-platform\frontend
$env:ANGLEMAZE_BROWSER_NO_SANDBOX = '1'
$env:ANGLEMAZE_CAPTURE_SCREENSHOTS = '0'
$env:ANGLEMAZE_EVIDENCE_DIR = 'C:\repos\anglemaze-platform\docs\graphics-upgrade\evidence\full-regression-after-hydration-routes-v1'
node tests/graphics/run-baseline.mjs
$testExitCode = $LASTEXITCODE
Remove-Item Env:ANGLEMAZE_BROWSER_NO_SANDBOX
Remove-Item Env:ANGLEMAZE_CAPTURE_SCREENSHOTS
Remove-Item Env:ANGLEMAZE_EVIDENCE_DIR
if ($testExitCode -ne 0) { exit $testExitCode }
```

## Limitations

The run used a temporary isolated browser profile and disabled the sandbox for this local fixture. Physical Android/iOS devices, Firefox/WebKit, five-minute heap stability, and real-GPU performance remain unmeasured. Owner visual sign-off is still required.
