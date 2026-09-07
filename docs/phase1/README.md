# Phase 1 — true 3D gameplay foundation

Status: QUALIFIED Phase 1 foundation. Scope is limited to an isolated `/3d-sandbox`; the existing 2D wrestling game and combat engine remain the legacy route at `/`. No wrestling combat, wrestler likeness, entrances, backstage, career, or Phase 2 systems were added.

## Current implementation

The sandbox uses Three.js directly inside a client-only React route. `SandboxRuntime` owns the renderer, scene, fixed clock, asset load lifecycle, movement step, animation update, follow camera and debug samples. React only owns loading/error UI and a throttled debug snapshot, so movement does not trigger React state renders each frame.

The generated asset is `public/models/development/humanoid.glb`. It is an original project-authored development mannequin created by `scripts/generate-development-humanoid.mjs`; no wrestler image, ripped game model, third-party model, animation file or proprietary asset was used. Its license/source is therefore: original repository output, permissive for this project, with no external attribution requirement. It is intentionally generic and does not represent Rhea, Chyna, Charlotte or Bianca.

The GLB contains one `SkinnedMesh`, 17 bones, valid skin-index/weight attributes, and embedded `Idle`, `Walk`, and `Run` clips. The model uses a perspective camera, Y-up floor, hemisphere and directional lights, PCF shadows, world-space X/Z position, smooth yaw interpolation and a camera offset that damps toward the player. The custom animation controller selects clips from movement state and cross-fades over 220ms; it does not inspect keyboard keys. The runtime validates skinning and required clips before marking the asset ready.

Controls: WASD/arrows are intentionally not used here; the new sandbox uses W/A/S/D and Shift `KeyboardEvent.code`, with simultaneous keys, normalized diagonals, delta-time fixed 60Hz updates, focus/visibility clearing and an optional left-drag camera orbit. World bounds are ±16m and Y is forced to ground zero. The debug panel displays FPS/frame time, position, movement, active clip/time, loaded state, bone/skinned counts, bone rotations, camera position, draw calls/triangles and input focus.

The development error path supports `?assetError=1`, which requests a missing GLB and shows a readable error with Reload. A 15-second timeout and WebGL context-loss message prevent a blank failure. The fallback is not counted as a successful rigged-character load.

## Architecture

```text
app/3d-sandbox/          React route, loading/error shell and dev panel composition
game3d/core/             scene setup, fixed runtime and pure movement
game3d/input/            keyboard-to-intent adapter
game3d/assets/           swappable character contract
game3d/character/        GLB loading/validation/disposal adapter
game3d/animation/        movement-state-to-AnimationMixer controller
game3d/camera/           damped third-person camera and optional orbit
game3d/debug/            read-only diagnostics model and panel
scripts/                 reproducible original GLB generation and validation
```

The asset contract is `modelPath + scale + rotationOffset + animation mapping + movement tuning`. Replacing the path and clip map with a future legal GLB does not require changes to keyboard input, movement, camera or sandbox UI. Combat is deliberately outside this runtime.

## Verification

`scripts/verify-development-glb.mjs` parses the actual GLB with `GLTFLoader`, checks the real `SkinnedMesh`, bones and skin weights, requires all three clips, runs the Walk clip through `AnimationMixer`, and checks that the `LeftThigh` bone rotation changes. `tests/phase1.mjs` covers idle/walk/run selection, delta-time velocity, normalized diagonals, smooth shortest-path turning, grounded/clamped motion, fixed-clock catch-up and missing-run fallback. Existing Phase 0/legacy tests remain unchanged.

Browser QA recorded the running local sandbox at `/3d-sandbox`, including idle, W input, focus/reload, orbit, error injection, legacy route and console status. Deterministic tests cover all W/A/S/D diagonals and Shift. Axis/diagonal/run browser observations are qualified because the browser tool emits short press-and-release events; the exact limitation is recorded in [qa.md](qa.md). Evidence is under `docs/phase1/evidence/`.

## Limits

This is a foundation scene, not a wrestling game. It has no combat, opponent, ring, ropes, physics package, final character models, facial rig, backstage, entrance, story, or career behavior. The local sanity sample is approximately 60 FPS. The current repository baseline has 30 pre-existing lint diagnostics; Phase 1 files add zero. Phase 1 is QUALIFIED rather than fully green because full lint remains red and browser held-key observations are limited by the QA tool.
