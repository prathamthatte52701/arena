# Phase 3 — Basic Combat Foundation

Phase 3 adds a data-driven combat layer to the two-character ring scene. The browser route remains `/3d-match` and now exposes light strike (J), heavy strike (K), and block (Space). Combat is stateful: startup, active frames, recovery, hit reaction, stun, knockdown, and recovery are all represented in the runtime.

The implementation lives in `game3d/combat/definitions.ts` and `game3d/combat/system.ts`. Attacks consume stamina, award momentum, respect range, apply block reduction, and can cause a controlled knockdown. The existing movement controller is gated by combat state, so a character cannot slide freely through a strike or knockdown. CPU attacks are deliberately occasional and are disabled only by the development QA freeze query.

## Gate result

Phase 3 is complete. The focused test suite passes 8/8, the previous phase suites and legacy combat checks pass, TypeScript passes, the production build completes, and the focused lint scope is clean. Repository-wide oxlint still reports the 30 diagnostics that predate this phase; the full output is retained in `evidence/full-lint.log` and no new Phase 3 diagnostics were introduced.

Evidence is recorded in `qa.md` and `evidence/results.json`.
