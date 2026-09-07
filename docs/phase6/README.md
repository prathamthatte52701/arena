# Phase 6 — Individual Entrance System

`game3d/entrance/system.ts` provides a data-driven entrance timeline with explicit stage, ramp, ringside, ring-entry, ring-pose and completion states. Four temporary presentation profiles—RHEA, CHYNA, CHARLOTTE and BIANCA—vary pace, pose timing and camera cues. `EntranceRuntime` renders the timeline in the same Three.js arena and character adapter used by the match route.

The `/entrance` route lets the user switch identities and skip safely. Skip clears the active timeline and leaves the controller in a stable `SKIPPED` state; a later match handoff can place the actor at the ring-ready position.

## Gate result

Phase 6 focused tests pass 3/3. Each profile traverses every required entrance state, skip is stable at stage/ramp/ringside, and sequential timelines remain isolated. Final likenesses and wrestler-specific motion clips remain future content; the temporary rig is intentional.
