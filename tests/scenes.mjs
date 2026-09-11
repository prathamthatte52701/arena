import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSceneController, resolveRheaScene } from '../promo/scenes/controller.ts';
import { RHEA_SCENES } from '../promo/scenes/rheaScenes.ts';
import { SCENE_NAMES } from '../promo/scenes/types.ts';
import { BODY_POSE_NAMES } from '../promo/body/types.ts';
import { CAMERA_STATE_NAMES } from '../promo/camera/types.ts';
import { RHEA_GESTURES } from '../promo/gestures/rheaGestures.ts';
import { GESTURE_NAMES } from '../promo/gestures/types.ts';

test('Phase 5.1 exposes exactly the four deterministic scene presentations', () => {
  assert.deepEqual(SCENE_NAMES, ['INTERVIEW', 'BACKSTAGE', 'RING_ARENA', 'PRESS_CONFERENCE']);
  assert.deepEqual(Object.keys(RHEA_SCENES), SCENE_NAMES);
});

test('every scene default belongs to its declared safe allowlists', () => {
  const runtimeCameraStates = ['STATIC_MEDIUM', 'CLOSE_PROMO', 'SLOW_PUSH_IN', 'INTERVIEWER_ANGLE', 'CAMERA_STARE', 'FINAL_HOLD'];
  for (const name of SCENE_NAMES) {
    const scene = RHEA_SCENES[name];
    assert.ok(scene.allowedFramings.includes(scene.defaultFraming), `${name} framing default`);
    assert.ok(scene.allowedPoses.includes(scene.defaultPose), `${name} pose default`);
    assert.ok(scene.allowedGestures.includes(scene.defaultGesture), `${name} gesture default`);
    assert.ok(scene.allowedCameraStates.includes(scene.defaultCamera), `${name} camera default`);
    assert.ok(BODY_POSE_NAMES.includes(scene.defaultPose), `${name} known pose`);
    assert.ok(GESTURE_NAMES.includes(scene.defaultGesture), `${name} known gesture`);
    assert.ok(CAMERA_STATE_NAMES.includes(scene.defaultCamera), `${name} known camera`);
    for (const gesture of scene.allowedGestures) assert.equal(RHEA_GESTURES[gesture].supported, true, `${name} supports ${gesture}`);
    assert.ok(scene.allowedCameraStates.length >= 4, `${name} camera choices`);
    assert.ok(scene.allowedCameraStates.includes('FINAL_HOLD'), `${name} final hold`);
    for (const camera of runtimeCameraStates) assert.ok(scene.allowedCameraStates.includes(camera), `${name} allows ${camera}`);
    assert.ok(scene.safeTextArea.maxWidthPercent >= 30 && scene.safeTextArea.maxWidthPercent <= 45);
    assert.ok(scene.safeTextArea.insetPercent >= 0 && scene.safeTextArea.insetPercent <= 8);
  }
});

test('PRESS_CONFERENCE presentation is deterministic and media-safe', () => {
  const controller = createSceneController();
  const first = controller.sample('PRESS_CONFERENCE');
  assert.deepEqual(first, controller.sample('PRESS_CONFERENCE'));
  assert.equal(first.background, 'PRESS_MEDIA_WALL');
  assert.equal(first.container, 'PRESS_DAIS');
  assert.equal(first.defaultFraming, 'MEDIUM');
  assert.equal(first.defaultPose, 'CAMERA_STARE');
  assert.ok(first.allowedCameraStates.includes('CAMERA_STARE'));
  assert.ok(first.allowedCameraStates.includes('INTERVIEWER_ANGLE'));
});

test('scene resolution is deterministic and invalid input falls back to INTERVIEW', () => {
  const controller = createSceneController();
  for (const name of SCENE_NAMES) assert.deepEqual(controller.sample(name), controller.sample(name));
  assert.equal(resolveRheaScene('UNKNOWN').name, 'INTERVIEW');
  assert.equal(controller.sample('UNKNOWN').usedFallback, true);
  assert.equal(controller.sample('INTERVIEW').usedFallback, false);
});

test('scene shells preserve locked character and performance systems', () => {
  for (const scene of Object.values(RHEA_SCENES)) {
    assert.equal('voice' in scene, false);
    assert.equal('mouth' in scene, false);
    assert.equal('blink' in scene, false);
    assert.equal('gaze' in scene, false);
    assert.equal('asset' in scene, false);
    assert.equal('timeline' in scene, false);
  }
});

test('active scene switching remaps presentation without mutating or restarting speech', async () => {
  const page = await readFile(new URL('../app/promo-rhea/page.tsx', import.meta.url), 'utf8');
  const switchBody = page.match(/const selectScene = \(name: SceneName\) => \{([\s\S]*?)\n  \};/)?.[1] ?? '';
  assert.match(switchBody, /if \(speaking\)/);
  assert.match(switchBody, /remapSceneRuntimePlan/);
  assert.match(switchBody, /applyScenePlan\(remapped\)/);
  assert.match(switchBody, /return/);
  assert.doesNotMatch(switchBody, /setText\(|setTone\(|mouthPreview|speech\.deliver|speech\.replay/);
});

test('REPLAY restores the visible text and tone from scene replay memory', async () => {
  const page = await readFile(new URL('../app/promo-rhea/page.tsx', import.meta.url), 'utf8');
  const replayBody = page.match(/const replayPromo = \(\) => \{([\s\S]*?)\n  \};/)?.[1] ?? '';
  assert.match(replayBody, /speech\.setText\(memory\.text\)/);
  assert.match(replayBody, /speech\.setTone\(memory\.tone\)/);
  assert.match(replayBody, /speech\.replay\(\)/);
  assert.doesNotMatch(replayBody, /speech\.deliver\(/);
});

test('scene source contains no randomness duplicated engines asset 18 or asset replacement', async () => {
  const sources = await Promise.all([
    '../promo/scenes/types.ts',
    '../promo/scenes/rheaScenes.ts',
    '../promo/scenes/controller.ts',
  ].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  const source = sources.join('\n');
  assert.doesNotMatch(source, /Math\.random|setInterval|requestAnimationFrame|createCameraController|cameraForPerformance|createGestureController|gestureForPerformance|asset[^\n]*18|rhea[^\n]*18|\.png|\.webp|\.jpg|video/i);
});
