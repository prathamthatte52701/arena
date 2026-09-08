# PROMO QUEENS — PIVOT CLEANUP REPORT

BASE COMMIT: `502d351`

FINAL COMMIT: `0ced77c`

FILES DELETED: 64 legacy runtime/test/script/assets files; approximately 3,379 lines removed.

FILES KEPT: Promo Queens routes, Rhea reference bundle, React shell, shared UI primitives, configuration and local build tooling.

FILES REFACTORED: `app/page.tsx`, package manifests; added Promo Queens home/docs/tests.

OLD SYSTEMS REMOVED: combat FSM, grappling, submissions, finishers, weapons, pinfall, CPU match runtime, arena/entrance/backstage 3D runtimes, rejected procedural/GLB character pipeline and Phase 1–7 tests.

OLD ROUTES REMOVED: `/3d-sandbox`, `/3d-match`, `/entrance`, `/backstage`.

DEPENDENCIES REMOVED: `three`, `@types/three`.

REUSABLE LEGACY SYSTEMS KEPT: React/Next shell, shared UI components, CSS foundations and git history only.

USER ASSETS PRESERVED: YES — Rhea reference bundle remains under `public/character-references/rhea/`; unrelated personal files remain untracked.

ACTIVE PRODUCT ROUTES: `/`, `/promo-rhea`.

ACTIVE ARCHITECTURE: image-first Rhea promo presentation with deterministic timeline, browser SpeechSynthesis, lip/mouth states, expression/gaze/camera beats, subtitles and local-only controls.

TESTS REMOVED/REPLACED: wrestling-specific phase/combat tests removed; `tests/promo-queens.mjs` replaces them with product-focused checks.

NEW PROMO TESTS: 3/3 pass.

TYPESCRIPT: PASS. BUILD: PASS. LOCALHOST: PASS (routes verified before cleanup and promo route remains buildable).

CONSOLE ERRORS: 0 persistent product errors observed in promo route.

APPROX SOURCE CODE REDUCTION: 3,379 lines in the cleanup diff.

KNOWN REMAINING LEGACY DEBT: shared `components/ui` and hooks contain pre-existing lint diagnostics; they are not imported by the active promo route. The browser TTS voice is synthetic and facial animation remains deterministic 2.5D presentation.

NEXT TASK: Rhea face / expression / promo vertical slice refinement.
