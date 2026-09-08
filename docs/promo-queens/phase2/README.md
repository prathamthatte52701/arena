# Promo Queens — Phase 2

## Rhea typed speech + deterministic lip-sync

BASE COMMIT: `5c37c29f68e7a95e64f22ca1952e39f3a5678912`

FINAL COMMIT: this completed main-branch commit; resolve with `git rev-parse HEAD`

TTS METHOD: local browser `window.speechSynthesis` with `SpeechSynthesisUtterance`.

VOICE SELECTION STRATEGY: prefer a locally installed English synthetic voice whose name indicates a common browser/system voice, then fall back to the first English voice or any installed voice. No external API or voice cloning is used.

EXACT TEXT: PASS — the delivered utterance is created from the authoritative textarea value without rewriting. Replay uses the saved last-delivered string.

VISEMES: REST, MBP, FV, AE, O, L, WQ.

TEXT → VISEME METHOD: pure deterministic phonetic approximation in `promo/speech/visemes.ts`, with stable rules for consonant families, vowels, and TH/SH/CH/PH/OO/EE/OU combinations. `promo/speech/textTimeline.ts` weights phonetic groups, words, and punctuation into bounded timeline segments.

BOUNDARY EVENT SUPPORT: YES — word boundary events gently correct the fallback clock when a browser provides usable `charIndex` data.

FALLBACK TIMELINE: YES — text analysis and timing are independent of boundary events and work when events are missing or unreliable.

MOUTH DEFORMATION: `FaceFrame.mouth` is an additional smoothed channel. The WebGL shader resamples only the localized mouth/lower-face region of the existing Rhea portrait using open, width, compression, round, lower-lip, jaw-drop, and corner-pull controls. No overlay or second renderer is used; jaw motion is restrained.

RANDOM MOUTH FLAPPING REMOVED: YES — no random calls exist in the mouth or speech timeline path. Phase 1 random timing remains limited to blink/gaze/idle behavior.

STOP: PASS — cancels synthesis, invalidates the session, releases runtime state, prevents stale callbacks, and returns the mouth to REST immediately.

REPLAY: PASS — starts a fresh non-overlapping session.

LAST-DELIVERED SCRIPT: PASS — editing the textarea after DELIVER does not change what REPLAY speaks.

STALE SESSION PROTECTION: PASS — monotonically increasing session IDs guard end, error, boundary, and cleanup callbacks.

PHASE 1 REGRESSION: PASS — existing face controller behavior remains intact; speech is an added mouth channel.

OLD TESTS: 9/9

NEW TESTS: 10/10

TOTAL TESTS: 19/19

TYPECHECK: PASS

LINT: PASS

BUILD: PASS

LOCALHOST: PASS — dev and production-local `/` and `/promo-rhea` returned HTTP 200.

CONSOLE ERRORS: 0 persistent application errors after clean reload.

SYNC QUALITY: QUALIFIED — deterministic articulation follows the estimated timeline convincingly; browser TTS duration and boundary behavior can introduce small timing drift, which is gently corrected when boundary events are available.

KNOWN LIMITATIONS: Web Speech voice inventories and boundary events vary by browser and operating system. The texture-deformation rig is intentionally restrained and visually plausible rather than a phoneme-perfect 3D facial model. The LIP-SYNC review and timeline debug readout are dev-only.

REFERENCE FILES UNCHANGED: YES — `public/character-references/rhea/` SHA-256 hashes were recorded before implementation and rechecked after implementation.

## Browser QA evidence

Local browser checks covered:

- clean portrait load and Phase 1 framing;
- SHORT, PLOSITIVES, FV, VOWELS, and MIXED speech starts;
- STOP immediately after delivery;
- speech completion returning to COMPLETE/REST;
- editing text after delivery followed by REPLAY, which retained the delivered script;
- DEV REVIEW LIP-SYNC controls for REST, MBP, FV, AE, O, L, WQ;
- SAMPLE PHRASE and TIMELINE DEBUG readout;
- clean localhost reload with no persistent console errors.

The production-local server was run on port 3001 for route verification; no cloud deployment was made.

