# Phase 2 QA report

Date: 2026-09-08. Local URL: http://localhost:3000/3d-match. Browser QA used the in-app browser with the development route and timed query input.

| Scenario | Result | Evidence |
|---|---|---|
| Ring geometry | PASS | Browser screenshot shows raised platform, mat, apron, posts, turnbuckles and three rope levels |
| Two rigged characters | PASS | Runtime diagnostics: 2 meshes · 34 bones, YES / YES loaded |
| Player WASD | PASS | Timed W hold moved player from [-1.700,0,0] to [-1.700,0,-1.348] |
| CPU locomotion | PASS | CPU moved from [0.845,0,-0.137] to [0.395,0,-1.951] while player input was held |
| Separation | PASS | Runtime stayed above 1.929 in the sustained sample; deterministic overlap test passes |
| Ring boundary | PASS | Sustained A reached player x=-3.700, the configured legal boundary; Y stayed 0 |
| Facing | PASS | Numeric yaw diagnostics are finite and follow the other actor with damped interpolation |
| Broadcast camera | PASS | Camera moved from -0.34 / 6.46 / 9.64 to -0.61 / 6.29 / 8.00 during movement |
| Follow camera retained | PASS | C switched broadcast to follow, camera became 1.21 / 3.23 / 4.82 |
| Grounding | PASS | YES / YES across loaded samples |
| Console errors | PASS | Error-level browser log query empty |
| Legacy route | PASS | Root route and existing legacy controls were not replaced |
| Phase 1 sandbox | PASS | Existing /3d-sandbox route remains available and previous tests pass |
| Performance | PASS | Match scene samples approximately 60 FPS / 16.7 ms |

## Gate

- Original checks: 25/25 pass.
- Phase 0: 8/8 pass.
- Phase 1: 13/13 pass.
- Phase 2: 6/6 pass.
- TypeScript: pass.
- Production build: pass.
- Targeted Phase 2 lint: 0 diagnostics.
- Full lint: existing repository diagnostics remain; no Phase 2 diagnostics were introduced.

Phase 2 is a foundation only. Combat is not present yet.
