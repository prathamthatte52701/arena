# Phase 0 regression evidence

Baseline revision: `5fac342213a6b7494b301377d7573cf4b9dcc250`. Local date 2026-09-08; machine-readable evidence timestamps use UTC. Runtime source, dependencies, lockfile and existing tests were not edited.

## Reproduction

From the project root run `node tests/run-phase0.mjs`. This uses installed local binaries, runs every check sequentially even if one fails, writes logs into `docs/phase0/evidence`, and returns a failing exit status when any check fails. It does not install dependencies or modify production code. The build writes the usual ignored output directories.

| Check | Observed result |
|---|---|
| Original `tests/combat.mjs` | PASS: all 25 assertions; includes combat, pin/submission, progression, mouse and narrator mocks |
| New `node --test tests/phase0.mjs` | PASS: 8 characterization tests |
| TypeScript, no emit/incremental disabled | PASS |
| Production Vinext build | PASS; existing punycode deprecation and route-classification notice |
| Oxlint | FAIL: 30 pre-existing diagnostics in application/starter UI code |
| Local route request | HTTP 200 |

Exact statuses, Node version and measured command durations: [results.json](evidence/results.json). Full failing lint evidence: [lint.log](evidence/lint.log). All five logs are retained beside these files. Build-command duration is not a rendering performance measurement.

New tests cover keyboard movement/bounds, paused snapshot immutability, paired-action exclusivity, block damage scaling, rejected upgrade immutability, save value bounds, repeatable injected-RNG simulation and post-result immutability. They characterize existing rules; no new 3D subsystem is represented as tested. The original tests remain unchanged.

## Browser QA performed

Used the local development instance at `http://localhost:3000/` in the Codex in-app browser. The browser inventory did not expose the ambient production tab, so a temporary local QA tab was created; production gameplay and its save origin were not used. QA changes only localhost career state. No production deployment was made.

| Scenario | Result and evidence |
|---|---|
| Initial load | Loading overlay resolved; four roster portraits and enabled match start observed |
| Match start and automatic entrance transition | Entrance state/skip button appeared; subsequently active match and ticking HUD observed |
| Entrance skip | Started a fresh match and clicked the observed skip control immediately; `MATCH LIVE` and `BELL RINGS` appeared |
| Keyboard pause | Escape produced PAUSED overlay with resume/setup controls; repeated in backstage |
| Match finish | CPU Chyna pinned idle player; `CHYNA WINS`, `PIN FALL`, +1 training point and 0W/1L appeared; result screen remained in place |
| Setup return | Click returned to roster/modes and fresh 3:00 HUD |
| Backstage | Mode selected and match started with loading-bay canvas, KO/tap-out rules and weapon/sneak-attack controls |
| Mouse control UI | Clicking Block changed pressed state and label to release; this verifies control wiring, not successful defense during a submission |
| Resize | Tested 1366×768 and 1024×768; no page-width overflow at 1024 (`scrollWidth=1009`), arena canvas scaled to about 911×491; viewport override restored |
| Browser error log | Captured error-level query returned an empty list for this sample |

A reload/persistence check was attempted, but the later UI showed a different selected matchup and additional result not attributable to the scripted QA actions. That check is inconclusive and is not counted as a browser save/load pass. No further gameplay interaction was performed after observing this change.

Visual findings: current fighters are flat sprites; backstage is a painted loading bay, not an explorable hub. Laptop play requires scrolling to some controls. In the narrower default pane, roster headings are clipped. These are existing presentation limitations, not introduced regressions.

## Coverage limits and future QA

Keyboard movement commands were sent in browser, but short keypresses and concurrent CPU action did not provide a reliable isolated displacement measurement. Movement/bounds are verified deterministically; sustained keyboard movement, pointer destination traversal, right-button duration and all input-focus edge cases still need a dedicated browser scenario. No claim of full input QA is made.

Audio cue selection and mute behavior have mocked automated tests. Audible playback quality, platform voice availability and offline speech were not verified. No stable laptop FPS/GPU benchmark was captured; the current application has no performance instrumentation.

Camera switching, 3D loading, world collision, backstage traversal/locker-room entry and interview playback are **not applicable yet: these features do not exist**. Keep them mandatory in their implementation-phase browser matrices. Future suites must also cover difficulty, rivalry, post-match decisions, save migrations and season progression as those systems arrive.

## Gate decision

Phase 0 documentation and regression foundation are delivered. Tests/types/build are verified, browser smoke QA is recorded, and no product-source regression was introduced. The baseline is qualified: lint is red and full browser/input/performance coverage is incomplete. Do not call the repository fully green or the current placeholders production 3D. Do not advance to Phase 1 in this turn. Before an all-green phase gate, intentionally resolve the recorded lint debt and finish the targeted input scenarios.
