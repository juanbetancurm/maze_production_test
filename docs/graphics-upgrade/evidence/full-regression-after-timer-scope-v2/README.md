# Full browser regression after GamePage timer cleanup

## Result

All **37 of 37 browser scenarios passed** in Chrome 157. The run covers both renderers, mathematical movement and turns, player/golem and wall collision, checkpoints, exits, restart, reduced motion, React route loading/recovery, and desktop/tablet/phone controls including the mobile Protractor. Six responsive viewport cases passed. The trace recorded zero browser errors, failed fetch interceptions, blocked external requests, and stale interceptions.

The player landing-shadow scenario now waits for its scheduled 35 ms sample instead of reading immediately after observing that movement stopped. This removes a timing race in the test; game behavior is unchanged.

## Performance observations

Samples ran for 60 seconds each in headless Chrome with SwiftShader. They support repeatable local comparisons, not real-device or physical GPU claims.

| Scenario | Frames | P95 | P99 | Stalls over 50 ms |
|---|---:|---:|---:|---:|
| Level 2 idle | 3,590 | 17.4 ms | 18.7 ms | 2 |
| Level 2 active | 3,616 | 17.4 ms | 17.9 ms | 0 |

The active sample completed 179 moves and 178 turns without rejected commands, collisions, or lost lives. The two idle stalls are retained in the trace.

## Evidence

- `runtime-trace.json` contains all scenario results, browser metadata, six viewport measurements, and performance samples.
- This was a trace-only run (`ANGLEMAZE_CAPTURE_SCREENSHOTS=0`). Existing desktop and phone captures remain linked from [the previous full regression report](../full-regression-after-hydration-routes-v1/README.md).

## Reproduction

From PowerShell:

```powershell
cd C:\repos\anglemaze-platform\frontend
$env:ANGLEMAZE_BROWSER_NO_SANDBOX = '1'
$env:ANGLEMAZE_CAPTURE_SCREENSHOTS = '0'
$env:ANGLEMAZE_EVIDENCE_DIR = 'C:\repos\anglemaze-platform\docs\graphics-upgrade\evidence\full-regression-after-timer-scope-v2'
node tests/graphics/run-baseline.mjs
$testExitCode = $LASTEXITCODE
Remove-Item Env:ANGLEMAZE_BROWSER_NO_SANDBOX
Remove-Item Env:ANGLEMAZE_CAPTURE_SCREENSHOTS
Remove-Item Env:ANGLEMAZE_EVIDENCE_DIR
if ($testExitCode -ne 0) { exit $testExitCode }
```

The no-sandbox option is needed for this workstation's isolated headless renderer. It applies only to the test browser; the harness blocks external requests and uses a temporary profile.

## Remaining validation

Physical Android/iOS devices, Firefox/WebKit, five-minute heap stability, real-GPU performance, and owner visual sign-off remain outstanding.
