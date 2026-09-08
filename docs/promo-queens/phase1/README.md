# Phase 1 — Rhea face and expression performance

Base: `04fe4ae9a91527f41a574c7103e9c86598255e01`. Implemented on `main` only.

## Character foundation

The unchanged 654 × 1230 `face-front.png` is the single rendering texture.
The supplied three-quarter and expression images were visually inspected to
calibrate attitude, brow asymmetry and head angle. The expression thumbnails are
only about 170 pixels wide and have different poses/crops, so they are not
upscaled or swapped into the live face. All 31 original reference files were
verified against their Git blob hashes and remain unchanged.

The renderer is a 2D WebGL texture pass. There is no 3D model, GLB, generated
character, external image service or backend. Region masks are feathered inverse
texture-coordinate transforms: the original skin, iris and lash pixels remain
the visible material. Head movement fades through the neck; breathing moves the
shoulder region independently. Stable framing prevents identity/crop jumps.

## Modules

- `promo/character/rheaProfile.ts`: original texture and calibrated landmarks.
- `promo/character/portraitRenderer.ts`: bounded eye, lid, brow, mouth-corner,
  head and shoulder texture transforms; GPU resource lifecycle.
- `promo/character/RheaPortraitRig.tsx`: image loading, render loop, cleanup,
  hidden-page pause, reduced-motion preference and explicit failure state.
- `promo/face/controller.ts`: injectable clock/RNG, transient blink, microglance,
  independently smoothed pose/drift/breath state.
- `promo/face/blink.ts`: 65ms close, 30ms contact, 145ms reopen; fresh 2.1–6.9s
  delay per automatic blink rather than a fixed interval.
- `promo/face/gaze.ts`: INTERVIEWER, CAMERA, LEFT, RIGHT and CENTER targets.
  Iris/sclera pixels shift inside the eye aperture; no brightness trick.
- `promo/face/expressions.ts`: NEUTRAL, CONFIDENT, SMIRK, SERIOUS,
  INTIMIDATING and MOCKING poses with interrupted-transition continuity.
- `promo/face/mouth.ts`: resting mouth contract for this phase.
- `promo/performance/usePromoSpeech.ts`: isolated existing local speech
  prototype. No phoneme inference, random flapping or lip-sync improvements.
- `promo/dev/RheaFaceReview.tsx`: expression/gaze selection, BLINK NOW,
  IDLE ON/OFF, close/medium framing and a lid inspection slider.
- `app/promo-rhea/page.tsx`: composition, review toggle and typed dialogue UI.

## Visual QA

Reviewed in the Codex browser at `http://127.0.0.1:3000/promo-rhea`:

- Neutral and all six expression selections; likeness and crop stay consistent.
- All five gaze targets; left/right iris displacement is visible in close-up.
- Open, half-closed and closed lid inspection; no black overlay bar.
- BLINK NOW triggered separately at natural speed with idle paused.
- Smooth retargeting across the expression controls, with no portrait replacement.
- 46.67 seconds of real-time neutral idle observation; small head/posture motion,
  breathing and irregular attention shifts. Separate seeded controller tests
  verify irregular automatic blinks over a 30-second simulation.
- Reload returns to neutral/interviewer, loads the texture and reports Live portrait.
- No browser console errors or warnings observed during the face review.
- Dev and fresh local production server: `/` and `/promo-rhea` return HTTP 200.

The blink PNGs are intentionally held inspection phases, not a video or a claim
that screenshots measure blink timing. Temporal timings are covered by controller
tests. Poses are restrained listening expressions, not high-amplitude acting:
the intimidating pose uses lowered brows, narrowed lids and lowered chin rather
than the open-mouth shout in the low-resolution reference. Extreme yaw, cheek
anatomy reconstruction and articulated speech remain outside this phase.

## Evidence

| State | Capture |
|---|---|
| Neutral | [neutral.png](neutral.png) |
| Confident | [confident.png](confident.png) |
| Smirk | [smirk.png](smirk.png) |
| Serious | [serious.png](serious.png) |
| Intimidating | [intimidating.png](intimidating.png) |
| Mocking | [mocking.png](mocking.png) |
| Camera gaze | [gaze-camera.png](gaze-camera.png) |
| Interviewer gaze | [gaze-interviewer.png](gaze-interviewer.png) |
| Left / right | [left](gaze-left.png), [right](gaze-right.png) |
| Blink sequence | [open](blink-open.png), [half](blink-half.png), [closed](blink-closed.png) |
| Idle observation | [start](idle-start.png), [during](idle-observation.png), [end](idle-end.png) |

Structured observation record: [browser-qa.json](browser-qa.json).

## Verification / pass gate

- [x] Consistent original likeness; no unrelated portrait swapping.
- [x] Face-region blink and visible gaze, without black bars or brightness tricks.
- [x] Six bounded useful poses, smooth interruptible transitions.
- [x] Irregular idle head/attention movement and independent breathing/posture.
- [x] No mannequin or 3D pipeline; references unchanged.
- [x] TypeScript: `npm run typecheck` passed.
- [x] Lint: `npm run lint` passed. The old blanket suppression is gone. A single
  canvas-specific semantic-role lint exception is documented in the rig.
- [x] Tests: `npm test` passed, 9 behavioural tests exercising real controllers.
  The former three source-string tests were replaced.
- [x] Build: `npm run build` passed all five Vinext stages.
- [x] Localhost dev and production route checks passed.

No dependencies added or upgraded. No other branch was modified. The local speech
prototype remains available, with mouth articulation explicitly at rest. The next
phase is typed speech with deterministic lip-sync; it has not been implemented.
