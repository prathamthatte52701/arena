# Phase 7 — Explorable Backstage Hub

`game3d/backstage/world.ts` defines a connected 3D backstage layout with a main corridor, four separate locker-room zones, interview area, manager office, loading bay and arena access. It also owns reusable `Interactable` records and a navigator that provides finite third-person movement, world bounds, zone resolution and distance-based prompts. `BackstageRuntime` reuses the shared keyboard input and follow camera systems with the same replaceable development humanoid adapter as the ring.

The `/backstage` route is the local exploration entry point. Doors and anchor props are physically placed in the scene; E reports an interaction only while a target is within range.

## Gate result

Phase 7 focused tests pass 3/3. All nine zones resolve, movement stays finite and clamped, and interaction range changes availability as expected. Interviews, manager logic, career systems and weapons remain outside this phase.
