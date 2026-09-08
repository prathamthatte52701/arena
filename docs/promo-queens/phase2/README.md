# Promo Queens — Phase 2

## Rhea typed speech + deterministic lip-sync

BASE COMMIT: `5c37c29f68e7a95e64f22ca1952e39f3a5678912`

FINAL COMMIT: Phase 2.1 completed main-branch commit; resolve with `git rev-parse HEAD`

TTS METHOD: local browser `window.speechSynthesis` with `SpeechSynthesisUtterance`.

VOICE SELECTION STRATEGY: prefer a locally installed English synthetic voice whose name indicates a common browser/system voice, then fall back to the first English voice or any installed voice. No external API or voice cloning is used.

EXACT TEXT: PASS — the delivered utterance is created from the authoritative textarea value without rewriting. Replay uses the saved last-delivered string.

VISEMES: REST, MBP, FV, AE, O, L, WQ.

TEXT → VISEME METHOD: pure deterministic phonetic approximation in `promo/speech/visemes.ts`, with stable rules for consonant families, vowels, and TH/SH/CH/PH/OO/EE/OU combinations. `promo/speech/textTimeline.ts` weights phonetic groups and punctuation into bounded timeline segments; adjacent words co-articulate without inserted silent gaps.

BOUNDARY EVENT SUPPORT: YES — usable word boundaries are monotonic forward anchors; they can move the visual clock immediately to the corresponding word and never rewind it.

FALLBACK TIMELINE: YES — text analysis and timing are independent of boundary events and work when events are missing or unreliable.

MOUTH DEFORMATION: `FaceFrame.mouth` is an additional smoothed channel. The WebGL shader resamples only the localized mouth/lower-face region of the existing Rhea portrait using open, width, compression, round, lower-lip, jaw-drop, and corner-pull controls. No overlay or second renderer is used; jaw motion is restrained.

RANDOM MOUTH FLAPPING REMOVED: YES — no random calls exist in the mouth or speech timeline path. Phase 1 random timing remains limited to blink/gaze/idle behavior.

STOP: PASS — cancels synthesis, invalidates the session, releases runtime state, prevents stale callbacks, and returns the mouth to REST immediately.

REPLAY: PASS — starts a fresh non-overlapping session.

LAST-DELIVERED SCRIPT: PASS — editing the textarea after DELIVER does not change what REPLAY speaks.

STALE SESSION PROTECTION: PASS — monotonically increasing session IDs guard end, error, boundary, and cleanup callbacks.

PHASE 1 REGRESSION: PASS — existing face controller behavior remains intact; speech is an added mouth channel.

OLD TESTS: 9/9

NEW TESTS: 14/14

TOTAL TESTS: 23/23

TYPECHECK: PASS

LINT: PASS

BUILD: PASS

LOCALHOST: PASS — dev and production-local `/` and `/promo-rhea` returned HTTP 200.

CONSOLE ERRORS: 0 persistent application errors after clean reload.

SYNC QUALITY: QUALIFIED PASS — short and long real local SpeechSynthesis traces reached the final spoken words before COMPLETE. Long fallback timing is calibrated against the collected 23.11s audio trace, while boundary anchors remain authoritative when available.

KNOWN LIMITATIONS: Web Speech voice inventories and boundary events vary by browser and operating system. The texture-deformation rig is intentionally restrained and visually plausible rather than a phoneme-perfect 3D facial model. The LIP-SYNC review and timeline debug readout are dev-only.

REFERENCE FILES UNCHANGED: YES — `public/character-references/rhea/` SHA-256 hashes were recorded before implementation and rechecked after implementation.

## Phase 2.1 long-promo drift repair

The 306-character promo previously produced a 27.222s visual timeline while the real local voice completed in about 23.110s. The old timeline contained 44 ordinary inter-word REST gaps worth about 4.181s after scaling. Phase 2.1 removes those artificial gaps, retains punctuation REST, and applies a length-calibrated fallback estimate. The resulting long timeline is 23.109s.

The monotonic speech clock stores the greatest elapsed position reached and a forward floor from each usable word boundary. Late or repeated boundary events cannot rewind the mouth. The committed [long-live-trace-v2.json](evidence/long-live-trace-v2.json) records all 56 real word boundaries and the final section `ready → for → the → challenge → when → the → lights → come → on → again → REST → COMPLETE`; the final word was reached at position 0.97 before COMPLETE.

PHASE 2.1 TESTS: 23/23 automated tests, 10/10 rendered mouth ROI assertions, and 10/10 rendered speech integration assertions.

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
