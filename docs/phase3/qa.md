# Phase 3 QA record

## Automated checks

| Check | Result |
|---|---|
| `node --test tests/phase3.mjs` | 8/8 passed |
| `node --test tests/phase0.mjs` | passed |
| `node --test tests/phase1.mjs` | passed |
| `node --test tests/phase2.mjs` | passed |
| `node tests/combat.mjs` | passed: 24 total checks |
| `npx tsc --noEmit --incremental false` | passed |
| `npm run build` | passed; routes `/`, `/3d-match`, `/3d-sandbox` built |
| focused oxlint (`game3d/combat game3d/match app/3d-match tests/phase3.mjs`) | clean |
| repository oxlint | 30 existing diagnostics; baseline retained |

## Browser evidence

QA ran against the live development route with the browser console error count at zero. The scene rendered two skinned meshes with 34 bones, the raised ring and ropes, and a stable 60 FPS / 16.7 ms frame sample.

- Idle/CPU locomotion: health `100 / 100`, combat state `IDLE · CPU IDLE`, separation `2.480`, FPS `60 / 16.7 ms`.
- Light strike (`?qaCombat=light&qaClose=1&qaFreezeCpu=1`): CPU health changed to `92 / 100`, event `stun`, separation `1.400`, player momentum `8`.
- Heavy strike (`?qaCombat=heavy&qaClose=1&qaFreezeCpu=1`): CPU health changed to `82 / 100`, event `knockdown`, state `IDLE · CPU KNOCKED_DOWN`, player momentum `16`.
- Block query kept health at `100 / 100` and returned to `IDLE · CPU IDLE` after release.
- CPU no-input sampling produced a single `miss` after its delayed attack window and returned to normal locomotion; it did not continuously attack.

The timed query harness dispatches the same keyboard event codes consumed by the runtime and exists only in development builds. Raw visual state was checked through the rendered page and the runtime diagnostics data attributes.
