import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSceneController, resolveRheaScene } from '../promo/scenes/controller.ts';
import { RHEA_SCENES } from '../promo/scenes/rheaScenes.ts';
import { SCENE_NAMES } from '../promo/scenes/types.ts';

test('Phase 5.0 exposes exactly the three deterministic scene shells', () => {
  assert.deepEqual(SCENE_NAMES, ['INTERVIEW', 'BACKSTAGE', 'RING_ARENA']);
  assert.deepEqual(Object.keys(RHEA_SCENES), SCENE_NAMES);
});

test('every scene default belongs to its declared safe allowlists', () => {
  const runtimeCameraStates = ['STATIC_MEDIUM', 'CLOSE_PROMO', 'SLOW_PUSH_IN', 'INTERVIEWER_ANGLE', 'CAMERA_STARE', 'FINAL_HOLD'];
  for (const name of SCENE_NAMES) {
    const scene = RHEA_SCENES[name];
    assert.ok(scene.allowedFramings.includes(scene.defaultFraming), `${name} framing default`);
    assert.ok(scene.allowedPoses.includes(scene.defaultPose), `${name} pose default`);
    assert.ok(scene.allowedGestures.includes(scene.defaultGesture), `${name} gesture default`);
    assert.ok(scene.allowedCameraStates.length >= 4, `${name} camera choices`);
    assert.ok(scene.allowedCameraStates.includes('FINAL_HOLD'), `${name} final hold`);
    for (const camera of runtimeCameraStates) assert.ok(scene.allowedCameraStates.includes(camera), `${name} allows ${camera}`);
    assert.ok(scene.safeTextArea.maxWidthPercent >= 30 && scene.safeTextArea.maxWidthPercent <= 45);
    assert.ok(scene.safeTextArea.insetPercent >= 0 && scene.safeTextArea.insetPercent <= 8);
  }
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

test('scene source contains no randomness animation sequencer or asset replacement', async () => {
  const sources = await Promise.all([
    '../promo/scenes/types.ts',
    '../promo/scenes/rheaScenes.ts',
    '../promo/scenes/controller.ts',
  ].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.doesNotMatch(sources.join('\n'), /Math\.random|setInterval|requestAnimationFrame|\.png|\.webp|\.jpg|video/i);
});
