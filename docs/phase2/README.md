# Phase 2 — wrestling ring and two-character foundation

Status: PASS. Phase 2 is isolated at /3d-match; /3d-sandbox remains the Phase 1 one-character route and / remains the legacy game.

The new route renders a genuine raised ring from Three.js geometry: platform, mat, apron, four posts, turnbuckles and three visible rope levels. It loads the original project-authored development humanoid twice as independent SkinnedMesh actors. The player uses world-space WASD/Shift movement. A forgiving CPU approaches, maintains distance and repositions without reading player keys.

game3d/match/logic.ts owns ring bounds, CPU locomotion, smooth mutual facing and minimum separation. The player and CPU remain grounded and are clamped to the playable ring rectangle. BroadcastCamera frames the midpoint and separation, while the Phase 1 FollowCamera remains available through C.

Phase 2 intentionally contains no strikes, grapples, damage, knockdowns, weapons or final wrestler assets. Those systems are deferred to later gated phases.

## Verification

tests/phase2.mjs covers CPU movement, world-space player movement, bounds, overlap separation, finite smooth facing, broadcast midpoint damping and ring geometry markers. Browser QA exercised the real /3d-match route with timed input, observed two loaded skinned actors, CPU movement, ring bounds, separation, camera following and C camera switching. Evidence is in qa.md and evidence/results.json.
