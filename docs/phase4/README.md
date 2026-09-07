# Phase 4 — Synchronized Wrestling Foundation

Phase 4 adds a reusable two-character move controller in `game3d/sync/system.ts`. The controller coordinates an attacker and receiver through grapple attempt, connection, synchronized move, submission, release, and recovery states. During a connected move, the receiver pose eases toward an attacker-relative offset and both movement systems are locked. Camera cue state is exposed to the match diagnostics so a future presentation camera can react without coupling to move data.

The move table is data-driven and currently contains generic `basic-grapple`, `power-throw`, `submission`, `signature`, and `finisher` entries. Stamina costs, momentum requirements, duration, damage and submission behavior are explicit fields. Signature and finisher requests fail below their momentum gates; submission has a timed escape window and a completion path. These generic entries are the integration point for the four character-specific move packs in a later content pass.

## Gate result

Phase 4 is complete. The focused suite passes 6/6, all earlier phase and legacy checks pass, TypeScript and the production build pass, and the focused lint scope is clean. Repository-wide oxlint retains the 30 baseline diagnostics already present before this phase.
