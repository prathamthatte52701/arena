# Phase 1 QA report

Date: 2026-09-08 (Asia/Calcutta). Local URL: `http://localhost:3000/3d-sandbox`. QA used the Codex in-app browser at its default desktop size, plus a temporary 1024px viewport check in the Phase 0 record. No production gameplay tab was used for local QA.

## GLB and skeletal verification

`node scripts/verify-development-glb.mjs` parsed the shipped bytes, not the source scene. Result: `bytes=509960`, `skinnedMeshes=1`, `bones=17`, `weightedVertices=5746`, clips `Idle`, `Walk`, `Run`, `skeletalBoneChanged=true`. The check advances `Walk` through `AnimationMixer` and verifies `LeftThigh.rotation.x` changes, so root translation/rotation alone is not being counted as animation.

## Browser scenarios

| Scenario | Result | Evidence observed |
|---|---|---|
| Initial sandbox load | PASS | Loading overlay resolved to `LIVE 3D SCENE`; no blank canvas |
| Genuine 3D character | PASS | Screenshot shows a shaded, volumetric mannequin, ground shadows and perspective grid; scene label says `Y-UP · WORLD SPACE` |
| Asset diagnostics | PASS | `CHARACTER LOADED YES`, `17 bones / 1 mesh`, `Idle`, `60 / 16.7 ms`, `5 draw calls / 19170 triangles` |
| Idle | PASS | Debug active animation `Idle`; `Spine / thigh rotation` values update over time |
| W movement | PASS | Four browser `W` inputs changed position from `z=0.000` to `z=-0.055`; Y remained `0.000` |
| S/A/D and diagonals | QUALIFIED | Pure tests cover every axis and all normalized diagonal vectors; browser key event path is wired and repeated W+D input was sent, but individual keypresses release too quickly for a stable isolated browser displacement reading |
| Shift/run | QUALIFIED | Pure test confirms `Run` state and 3.8 speed; browser brief key-combo observation returned to idle before the 250ms debug sample |
| Stop / return to idle | PASS | Released key events leave runtime in `Idle`; diagnostic state is not stuck |
| Smooth turning | PASS | Deterministic shortest-path/damped turn test; runtime follows movement yaw via damped interpolation |
| Camera follow | PASS | Camera diagnostics update with player; orbit drag changed camera X from `2.93` to `-2.90` without a route error |
| Grounding | PASS | Deterministic test forces Y back to 0 and clamps ±16m; browser diagnostics stayed at y=0.000 |
| Focus/reload | PASS | Reload settled to live scene and restored `YES`, 17 bones, Idle; keyboard W still changed Z afterward |
| Asset failure | PASS | `?assetError=1` showed `LOAD FAILED` and `Model request failed (404): /models/development/missing.glb`, plus Reload button; no permanent blank state |
| Leave/return legacy | PASS | Root route returned with main menu, four cards, match setup and legacy canvas. Production 2D route was not replaced or taken over |
| Browser console | PASS | Error-level browser log query empty for the QA sample |
| Performance sanity | PASS | Runtime diagnostics repeatedly showed approximately 60 FPS / 16.7 ms in the minimal scene |

The orbit check is an optional Phase 1 convenience; movement remains the primary keyboard path. The browser tool exposes press-and-release key actions rather than a stable held-key duration, so axis/diagonal/run visual readings are qualified by the deterministic runtime tests rather than overstated as perfect manual proof.

## Automated gate

- Original checks: 25/25 pass.
- Phase 0 characterization: 8/8 pass.
- Phase 1 deterministic tests: 8/8 pass.
- GLB parse/skeleton/skin/clip/bone-change verification: pass.
- TypeScript: pass.
- Production build: pass; Vinext reports its existing route-classification note and a client chunk-size warning.
- Full lint: 30 diagnostics before Phase 1 and 30 after. Targeted Phase 1 files have zero diagnostics; new Phase 1 diagnostics introduced: 0.

Logs and machine-readable result files are in `docs/phase1/evidence/`. The `before/` folder preserves the Phase 0 baseline copied before Phase 1 changes.

## Limits and stop condition

This gate covers only the 3D foundation. The character is a generic locally authored development mannequin, not a wrestler likeness. No combat, ring, ropes, AI opponent, backstage, entrances, career, interviews, or final models were implemented. No Phase 2 work started. Further character asset replacement and wrestling systems require the next explicit phase authorization.
