# Rhea Stage 1 Vertical Slice

## REFERENCE AUDIT

Audited the V2 bundle manifest and source sheets. Coverage is consistent across face front/three-quarter/profile, body front/side/back/three-quarter, hair front/back, match and entrance attire front/back, tattoos, and neutral/confident/aggressive expressions. The pack declares one locked identity and canonical master `body-front.png`; no 3D mesh or motion capture files are included.

## 3D MODEL METHOD

Rhea now uses a direct Three.js procedural build through the existing character adapter. It creates an articulated hierarchy, layered muscular forms, facial features, hair strands, match attire, gloves and boots. Locomotion/camera/arena systems remain unchanged and the profile is data-driven.

## MODEL FORMAT

Native Three.js procedural geometry (no GLB dependency for Rhea Stage 1).

## SKINNED MESH / BONE COUNT

15 articulated bones (hips, spine, chest, neck, head, shoulders, arms, forearms, thighs and calves). Procedural animation states Idle, Walk and Run.

## MATERIALS / HAIR / ATTIRE / TATTOOS

Separate skin, hair, outfit, accent and boot materials are used. Hair strands and attire are real mesh geometry. Reference tattoo images are stored and audited; tattoo decals remain deferred.

## IDLE / WALK / RUN / BLENDING / TURNING / GROUNDING

Procedural controller supplies all three states, fixed-step movement and smooth turning with opposite arm/leg swing, knee motion, breathing and weight shift. Browser diagnostics report finite runtime at 60 FPS.

## CAMERA / FPS

The existing third-person and broadcast camera paths are retained. FPS is environment/device dependent; prior headless QA measured low software-rendered FPS, while browser runtime remains stable without NaN transforms.

Automated localhost browser smoke reached `/3d-sandbox` and `/3d-match`; each rendered one WebGL canvas and reported `Character loaded YES`, `17 bones / 1 mesh` (sandbox), and `2 meshes · 34 bones` (match). The run artifact is `docs/rhea-stage1-browser.json`.

## KNOWN VISUAL DEFECTS

This is a convincing technical vertical slice, not a final likeness model. The body/face remains the generic development humanoid, accessories are procedural, and tattoo detail, facial expressions, and final match/entrance attire are not yet authored as a bespoke sculpt/texture set.

## FILES CHANGED

`game3d/assets/contract.ts`, `game3d/character/adapter.ts`, `game3d/match/runtime.ts`, `app/3d-sandbox/sandbox.tsx`, and `public/character-references/rhea/**`.

## COMMIT

`c1dc98b` on branch `rhea-stage1` in worktree `E:\shadow fight-rhea`.
