import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createSceneRuntimePlan,
  orchestrateCameraRequest,
  orchestrateGestureRequest,
  remapSceneRuntimePlan,
  restartSceneRuntimePlan,
  stopSceneRuntimePlan,
} from '../promo/scenes/orchestration.ts';
import { RHEA_SCENES } from '../promo/scenes/rheaScenes.ts';
import { SCENE_NAMES } from '../promo/scenes/types.ts';

const text = "You think you're ready for me? Then prove it.";
const matrix = [
  ['INTERVIEW', 'CONFIDENT'],
  ['INTERVIEW', 'COLD'],
  ['BACKSTAGE', 'ANGRY'],
  ['BACKSTAGE', 'INTIMIDATING'],
  ['RING_ARENA', 'CONFIDENT'],
  ['RING_ARENA', 'ANGRY'],
  ['RING_ARENA', 'MOCKING'],
  ['PRESS_CONFERENCE', 'COLD'],
  ['PRESS_CONFERENCE', 'SMIRKING'],
];

function assertLegal(plan) {
  const scene = RHEA_SCENES[plan.scene];
  assert.ok(scene.allowedFramings.includes(plan.framing), `${plan.scene} framing`);
  assert.ok(scene.allowedPoses.includes(plan.pose), `${plan.scene} pose`);
  assert.ok(scene.allowedGestures.includes(plan.gesture), `${plan.scene} gesture`);
  assert.ok(scene.allowedCameraStates.includes(plan.camera), `${plan.scene} camera`);
}

test('same scene text and tone always create the same runtime plan', () => {
  for (const [scene, tone] of matrix) {
    const request = { scene, text, tone };
    assert.deepEqual(createSceneRuntimePlan(request), createSceneRuntimePlan(request));
  }
});

test('required P5.2 scene and tone matrix selects only legal presentation states', () => {
  for (const [scene, tone] of matrix) {
    const plan = createSceneRuntimePlan({ scene, text, tone });
    assertLegal(plan);
    assert.equal(plan.text, text);
    assert.equal(plan.tone, tone);
  }
});

test('invalid scene and presentation requests fall back inside safe allowlists', () => {
  const plan = createSceneRuntimePlan({
    scene: 'NOT_A_SCENE', text, tone: 'AUTO', framing: 'BROKEN', pose: 'BROKEN', gesture: 'BROKEN', camera: 'BROKEN',
  });
  assert.equal(plan.scene, 'INTERVIEW');
  assert.equal(plan.usedFallback, true);
  assertLegal(plan);
});

test('scene remapping preserves exact text and tone while choosing destination-legal states', () => {
  const exact = "  I’m ready — are you?\nThen prove it.  ";
  const initial = createSceneRuntimePlan({ scene: 'BACKSTAGE', text: exact, tone: 'INTIMIDATING' });
  for (const scene of SCENE_NAMES) {
    const next = remapSceneRuntimePlan(initial, scene);
    assert.equal(next.text, exact);
    assert.equal(next.tone, 'INTIMIDATING');
    assertLegal(next);
  }
});

test('STOP returns every scene to its declared safe rest presentation', () => {
  for (const scene of SCENE_NAMES) {
    const stopped = stopSceneRuntimePlan(createSceneRuntimePlan({ scene, text, tone: 'ANGRY' }));
    const definition = RHEA_SCENES[scene];
    assert.equal(stopped.mode, 'REST');
    assert.equal(stopped.framing, definition.defaultFraming);
    assert.equal(stopped.pose, definition.defaultPose);
    assert.equal(stopped.gesture, definition.defaultGesture);
    assert.equal(stopped.camera, definition.defaultCamera);
    assertLegal(stopped);
  }
});

test('REPLAY restarts the identical scene text tone and deterministic plan', () => {
  for (const [scene, tone] of matrix) {
    const original = createSceneRuntimePlan({ scene, text, tone });
    const replay = restartSceneRuntimePlan(stopSceneRuntimePlan(original));
    assert.deepEqual(replay, original);
  }
});

test('scene adapters keep P4 requests legal and preserve final hold', () => {
  for (const [scene, tone] of matrix) {
    const plan = createSceneRuntimePlan({ scene, text, tone });
    const gesture = orchestrateGestureRequest(plan, { name: 'CHEST_EMPHASIS', triggerId: 'beat:1' });
    const camera = orchestrateCameraRequest(plan, { name: 'SLOW_PUSH_IN', triggerId: 'beat:1' });
    const final = orchestrateCameraRequest(plan, { name: 'FINAL_HOLD', triggerId: 'final' });
    assert.equal(gesture.name, plan.gesture);
    assert.equal(camera.name, plan.camera);
    assert.equal(final.name, 'FINAL_HOLD');
    assertLegal(plan);
  }
});

test('orchestration is configuration only and does not duplicate engines or reference rejected asset 18', async () => {
  const source = await readFile(new URL('../promo/scenes/orchestration.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Math\.random|setInterval|requestAnimationFrame|createCameraController|createGestureController|createBodyPoseController|createPerformanceTimeline|speechSynthesis|asset[^\n]*18|rhea[^\n]*18/i);
});
