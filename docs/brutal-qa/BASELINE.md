# Zero-trust baseline

Branch main; source HEAD 0632d01fd6985f3a5b9b810a532280ecd299ff4d. No tracked changes at start. Untracked images.zip, images/ and rhea_character_reference_pack_v2.zip are user files and preserved.

Existing original/phase0–7 tests, TypeScript, GLB validation and production build exit 0. Lint exits 1 (see raw baseline/lint.log). These results do not certify functionality. Commands and exits are retained in baseline/.

GLB: 509960 bytes; one skinned mesh; 17 bones; 5746 weighted vertices; Idle/Walk/Run, 54 bone tracks, non-root skeletal motion verified by the existing verifier.

Local dev server already running at localhost:3000 (PID 33876). Build: npm run build. Local production command: npm start (Wrangler local emulator). Routes: /, /3d-sandbox, /3d-match, /entrance, /backstage. Runtime asset: public/models/development/humanoid.glb.

## Verified pre-existing defects / coverage gaps

- Match runtime passes temporary copied poses to SyncController and never writes receiver pose back. Paired position/orientation changes are discarded.
- Match impact de-duplication uses move name plus event name forever; repeated identical grapples cannot damage again. Basic grapple declares damage 4 but runtime applies 12.
- Strike/block inputs bypass synchronization lock; grapple requests bypass combat eligibility. Submission escape input is always false.
- CPU-disabled test mode skips CPU recovery as well as attack scheduling, leaving knocked-down targets frozen.
- Match roots are rendered at y=0 while mat top is y=.60.
- Entrance advances before asset load, uses hardcoded motion timing shared across profiles, retains presentation camera on completion and restores stage camera on skip. No match-ready handoff exists.
- Backstage has only exterior walls, floor-color room regions and door marker sticks. Interact returns an ID without opening doors or navigating to arena. No interior or furniture collision. Diagonal speed is unnormalized and dt is unguarded.
- Phase 5 crowd allocates 72 instances but initializes 68; four default matrices pile up at origin.
- Phase 4–7 test counts are custom console messages; node:test reports one top-level file per suite. Phase 7 tests assign destinations directly rather than navigating through geometry. Prior reports asserting complete doors/collision/skip handoff are unsupported.

Browser baseline: /entrance renders one canvas; RHEA completion still shows close-presentation camera and no match action. Console error log returned zero on this route at capture. Other routes are not inferred error-free from this sample.

Semantic search connector returned HTTP 402; used direct source reads instead.
