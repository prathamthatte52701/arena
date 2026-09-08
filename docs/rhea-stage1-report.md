# Rhea Stage 1 Vertical Slice

## REFERENCE AUDIT

Audited the V2 bundle manifest and source sheets. Coverage is consistent across face front/three-quarter/profile, body front/side/back/three-quarter, hair front/back, match and entrance attire front/back, tattoos, and neutral/confident/aggressive expressions. The pack declares one locked identity and canonical master `body-front.png`; no 3D mesh or motion capture files are included.

## 3D MODEL METHOD

The existing GLB-compatible humanoid contract is reused so locomotion, camera, and arena systems remain unchanged. Rhea is data-driven through `rheaStage1` appearance and scale fields. The adapter adds real Three.js hair and match-attire geometry to the rigged character at load time.

## MODEL FORMAT

GLB (`public/models/development/humanoid.glb`)

## SKINNED MESH / BONE COUNT

1 SkinnedMesh, 17 bones, 5,746 weighted vertices; skeletal animation clips Idle, Walk, Run.

## MATERIALS / HAIR / ATTIRE / TATTOOS

Existing skinned materials are tinted from the Rhea profile. Hair and attire are real mesh accessories with dedicated materials. Reference tattoo images are stored and audited, but tattoo projection onto the generic development UVs is deferred because the pack contains no UV-ready texture workflow.

## IDLE / WALK / RUN / BLENDING / TURNING / GROUNDING

Existing adapter/controller supplies all three clips, cross-fade blending, fixed-step movement, and smooth turning. Automated GLB validation confirms finite skeletal transforms and changing bones; TypeScript and production build pass.

## CAMERA / FPS

The existing third-person and broadcast camera paths are retained. FPS is environment/device dependent; prior headless QA measured low software-rendered FPS, while browser runtime remains stable without NaN transforms.

Automated localhost browser smoke reached `/3d-sandbox` and `/3d-match`; each rendered one WebGL canvas and reported `Character loaded YES`, `17 bones / 1 mesh` (sandbox), and `2 meshes · 34 bones` (match). The run artifact is `docs/rhea-stage1-browser.json`.

## KNOWN VISUAL DEFECTS

This is a convincing technical vertical slice, not a final likeness model. The body/face remains the generic development humanoid, accessories are procedural, and tattoo detail, facial expressions, and final match/entrance attire are not yet authored as a bespoke sculpt/texture set.

## FILES CHANGED

`game3d/assets/contract.ts`, `game3d/character/adapter.ts`, `game3d/match/runtime.ts`, `app/3d-sandbox/sandbox.tsx`, and `public/character-references/rhea/**`.

## COMMIT

`c1dc98b` on branch `rhea-stage1` in worktree `E:\shadow fight-rhea`.
