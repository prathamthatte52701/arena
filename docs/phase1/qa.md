# Phase 1 QA report

Date: 2026-09-08 (Asia/Calcutta). Local URL: `http://localhost:3000/3d-sandbox`. QA used the Codex in-app browser at its fixed 1280×720 desktop viewport. The dev-only query harness in `app/3d-sandbox/sandbox.tsx` runs timed keydown/keyup sequences through the actual runtime listeners; this replaced the earlier short-press-only observation. No production gameplay tab was used for local QA.

## GLB and skeletal verification

`node scripts/verify-development-glb.mjs` parsed the shipped bytes, not the source scene. Result: `bytes=509960`, `skinnedMeshes=1`, `bones=17`, `weightedVertices=5746`, `boneTracks=54`, clips `Idle`, `Walk`, `Run`, `skeletalBoneChanged=true`. The check requires a scene, skin attributes, non-empty clips and tracks targeting skeleton nodes, then advances `Walk` through `AnimationMixer` and verifies `LeftThigh.rotation.x` changes, so root translation/rotation alone is not being counted as animation.

## Browser scenarios

| Scenario | Result | Evidence observed |
|---|---|---|
| Initial sandbox load | PASS | Loading overlay resolved to `LIVE 3D SCENE`; no blank canvas |
| Genuine 3D character | PASS | Screenshot shows a shaded, volumetric mannequin, ground shadows and perspective grid; scene label says `Y-UP · WORLD SPACE` |
| Asset diagnostics | PASS | `CHARACTER LOADED YES`, `17 bones / 1 mesh`, `Idle`, `60 / 16.7 ms`, `5 draw calls / 19170 triangles` |
| Idle | PASS | Debug active animation `Idle`; `Spine / thigh rotation` values update over time |
| W movement | PASS | Timed hold: `[0,0,0]` → `[0,0,-2.640]`; while held `Walk`, after release `Idle` |
| S movement | PASS | Timed hold: `[0,0,0]` → `[0,0,2.612]`; Y remained `0.000` |
| A/D movement | PASS | Timed holds: A → `[-2.640,0,0]`, D → `[2.640,0,0]` |
| Diagonals | PASS | W+A magnitude `2.612`, W+D magnitude `2.612` versus W `2.640`; ratio `0.989`, not √2 `1.414` |
| Shift/run | PASS | Timed Shift+W sample reached `Run`; held position `[0,0,-1.837]`, settled `[0,0,-6.903]` |
| Stop / return to idle | PASS | Released key events leave runtime in `Idle`; diagnostic state is not stuck |
| Smooth turning | PASS | Timed W → D → S → A sequence produced finite yaw values `3.142 → 3.142 → 1.572 → 0.001 → -1.571` |
| Camera follow | PASS | During W, camera changed `[2.93,3.20,4.77]` → `[2.93,3.20,4.30]`; orbit drag changed it to `[-3.26,3.20,4.32]` |
| Grounding | PASS | Deterministic test forces Y back to 0 and clamps ±16m; browser diagnostics stayed at y=0.000 |
| Focus-loss input reset | PASS | After W + synthetic blur: position stopped at `[0,0,-1.155]`, motion `idle`, animation `Idle`, focus `RELEASED` on later samples |
| Animation state/blending | PASS | Idle → Walk showed `Idle 0.47 · Walk 0.53`; Walk → Idle showed overlapping weights; Shift release while W remained held changed Run → Walk |
| Focus/reload | PASS | Reload settled to live scene, restored `YES`, 17 bones, Idle and exactly one sandbox canvas |
| Asset failure | PASS | `?assetError=1` showed `LOAD FAILED` and `Model request failed (404): /models/development/missing.glb`, plus Reload button; no permanent blank state |
| Leave/return legacy | PASS | Automated `/` → `/3d-sandbox` → `/` → `/3d-sandbox` navigation returned cleanly; root menu and Enter the Ring control worked, legacy canvas stayed on root |
| Browser console | PASS | Error-level browser log queries were empty across asset failure, navigation, reload and gameplay samples |
| Performance sanity | PASS | Idle, walk and run each sampled 11 readings over 2.75 s: average 60 FPS, minimum 60 FPS |
| Window resize | UNVERIFIED | The CUA in-app browser exposes no viewport resize API; `window.resizeTo(1024,768)` remained `1280×720`. No manual QA was requested or used |

The orbit check is an optional Phase 1 convenience; movement remains the primary keyboard path. The timed query harness is development-only and is guarded out of production mode.

## Automated gate

- Original checks: 25/25 pass.
- Phase 0 characterization: 8/8 pass.
- Phase 1 deterministic tests: 13/13 pass.
- GLB parse/skeleton/skin/clip/bone-track/bone-change verification: pass.
- TypeScript: pass.
- Production build: pass; Vinext reports its existing route-classification note and a client chunk-size warning.
- Full lint: 30 diagnostics before Phase 1 and 30 after. Targeted Phase 1 files have zero diagnostics; new Phase 1 diagnostics introduced: 0.

Logs and machine-readable result files are in `docs/phase1/evidence/`. The `before/` folder preserves the Phase 0 baseline copied before Phase 1 changes.

## Limits and stop condition

This gate covers only the 3D foundation. The character is a generic locally authored development mannequin, not a wrestler likeness. No combat, ring, ropes, AI opponent, backstage, entrances, career, interviews, or final models were implemented. No Phase 2 work started. Phase 1 remains QUALIFIED solely because viewport resize could not be exercised by the available browser API; no manual verification is being delegated.
