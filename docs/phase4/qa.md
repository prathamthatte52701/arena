# Phase 4 QA record

## Automated checks

| Check | Result |
|---|---|
| `node --test tests/phase4.mjs` | 6/6 passed |
| phase 0–3 suites | passed |
| `node tests/combat.mjs` | passed: 24 total checks |
| `npx tsc --noEmit --incremental false` | passed |
| `npm run build` | passed; `/`, `/3d-match`, `/3d-sandbox` built |
| focused oxlint (`game3d/combat game3d/sync game3d/match app/3d-match tests/phase3.mjs tests/phase4.mjs`) | clean |
| repository oxlint | 30 existing diagnostics; baseline retained |

## Browser evidence

The local `/3d-match` route rendered two skinned meshes with 34 bones, raised ring geometry, and zero browser console errors during the QA run.

- Active grapple (`?qaSync=basic-grapple&qaClose=1&qaFreezeCpu=1&qaHold=1800`) reached `SYNCHRONIZED_MOVE · basic-grapple` with event `connected · CAMERA CUE`, separation `1.400`, and `56 FPS / 17.7 ms` during the active window.
- The same move reached `impact`, reduced CPU health to `88 / 100`, and returned through `RECOVERY` to `FREE`; the stable post-recovery sample was `60 FPS / 16.7 ms`.
- Momentum-gated submission (`?qaSync=submission&qaMomentum=1&qaClose=1&qaFreezeCpu=1&qaHold=4000`) reached `SUBMISSION · submission` with `80 stamina / 90 momentum`, event `connected · CAMERA CUE`, and separation `1.400`, then completed to CPU health `88 / 100`.
- Pure controller tests cover out-of-range miss/unlock, escape release, completion release, pose synchronization, resource consumption, and signature/finisher momentum gates.
