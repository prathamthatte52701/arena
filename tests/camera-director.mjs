import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cameraForPerformance, createCameraController, resolveCameraState, sampleCameraProgress, sampleCameraState } from '../promo/camera/controller.ts';
import { CAMERA_BOUNDS, NEUTRAL_CAMERA_TRANSFORM, RHEA_CAMERA_STATES } from '../promo/camera/rheaCamera.ts';
import { CAMERA_STATE_NAMES } from '../promo/camera/types.ts';
import { createBodyPoseController } from '../promo/body/controller.ts';
import { sampleGesture } from '../promo/gestures/controller.ts';

const numericKeys = Object.keys(NEUTRAL_CAMERA_TRANSFORM);

test('all eight Phase 4.3 camera states exist', () => {
  assert.deepEqual(CAMERA_STATE_NAMES, ['STATIC_MEDIUM', 'STATIC_FULL', 'CLOSE_PROMO', 'SLOW_PUSH_IN', 'SLOW_PULL_OUT', 'INTERVIEWER_ANGLE', 'CAMERA_STARE', 'FINAL_HOLD']);
});

test('camera sampling is deterministic with bounded finite output', () => {
  for (const name of CAMERA_STATE_NAMES) for (const progress of [0, 0.2, 0.5, 0.8, 1]) {
    const first = sampleCameraProgress(name, progress);
    assert.deepEqual(first, sampleCameraProgress(name, progress));
    for (const key of numericKeys) assert.ok(Number.isFinite(first[key]), `${name}.${key} must be finite`);
    assert.ok(Math.abs(first.xPercent) <= CAMERA_BOUNDS.xPercent);
    assert.ok(Math.abs(first.yPercent) <= CAMERA_BOUNDS.yPercent);
    assert.ok(first.scale >= CAMERA_BOUNDS.scale[0] && first.scale <= CAMERA_BOUNDS.scale[1]);
    assert.ok(Math.abs(first.rotationDeg) <= CAMERA_BOUNDS.rotationDeg);
  }
});

test('moving camera states follow deterministic ENTER HOLD EXIT progression', () => {
  for (const name of ['SLOW_PUSH_IN', 'SLOW_PULL_OUT', 'INTERVIEWER_ANGLE']) {
    const camera = RHEA_CAMERA_STATES[name];
    assert.equal(sampleCameraState(name, 0).phase, 'ENTER');
    assert.equal(sampleCameraState(name, camera.enterMs).phase, 'HOLD');
    assert.equal(sampleCameraState(name, camera.enterMs + camera.holdMs).phase, 'EXIT');
    assert.equal(sampleCameraState(name, camera.enterMs + camera.holdMs + camera.exitMs).phase, 'REST');
  }
});

test('camera never scales below one and adjacent samples avoid sudden jumps', () => {
  for (const name of CAMERA_STATE_NAMES) {
    let prior = sampleCameraProgress(name, 0);
    for (let step = 1; step <= 40; step++) {
      const current = sampleCameraProgress(name, step / 40);
      assert.ok(current.scale >= 1);
      assert.ok(Math.abs(current.scale - prior.scale) < 0.012);
      assert.ok(Math.abs(current.xPercent - prior.xPercent) < 0.25);
      assert.ok(Math.abs(current.rotationDeg - prior.rotationDeg) < 0.1);
      prior = current;
    }
  }
});

test('invalid camera input falls back safely to static medium', () => {
  assert.equal(resolveCameraState('HANDHELD_SHAKE').name, 'STATIC_MEDIUM');
  assert.equal(resolveCameraState(Object.create({ definitions: RHEA_CAMERA_STATES, bounds: CAMERA_BOUNDS, neutral: NEUTRAL_CAMERA_TRANSFORM }), 'SLOW_PUSH_IN').name, 'STATIC_MEDIUM');
  assert.deepEqual(Object.fromEntries(numericKeys.map(key => [key, sampleCameraState('HANDHELD_SHAKE', 500)[key]])), NEUTRAL_CAMERA_TRANSFORM);
});

test('STOP settles camera safely to neutral', () => {
  const controller = createCameraController();
  const request = { name: 'SLOW_PUSH_IN', triggerId: 'session-1:beat-0' };
  controller.update(0, request);
  const active = controller.update(1200, request);
  assert.ok(active.scale > 1);
  controller.stop(1200);
  assert.equal(controller.update(1460, null).phase, 'EXIT');
  const stopped = controller.update(1800, null);
  assert.equal(stopped.phase, 'REST');
  assert.deepEqual(Object.fromEntries(numericKeys.map(key => [key, stopped[key]])), NEUTRAL_CAMERA_TRANSFORM);
});

test('REPLAY restarts the same camera timeline deterministically', () => {
  const controller = createCameraController();
  const first = { name: 'INTERVIEWER_ANGLE', triggerId: 'session-1:beat-0' };
  controller.update(100, first);
  const firstEntry = controller.update(450, first);
  controller.stop(450);
  controller.update(1000, null);
  const replay = { name: 'INTERVIEWER_ANGLE', triggerId: 'session-2:beat-0' };
  controller.update(1200, replay);
  assert.deepEqual(controller.update(1550, replay), firstEntry);
});

test('same-state beat changes do not restart or jump the camera timeline', () => {
  const controller = createCameraController();
  const firstBeat = { name: 'SLOW_PUSH_IN', triggerId: 'session-1:beat-0' };
  const nextBeat = { name: 'SLOW_PUSH_IN', triggerId: 'session-1:beat-1' };
  controller.update(0, firstBeat);
  const beforeBeat = controller.update(900, firstBeat);
  const onBeat = controller.update(900, nextBeat);
  const afterBeat = controller.update(1000, nextBeat);
  assert.deepEqual(onBeat, beforeBeat);
  assert.ok(Math.abs(afterBeat.xPercent - onBeat.xPercent) < 0.25);
  assert.ok(Math.abs(afterBeat.scale - onBeat.scale) < 0.012);
});

test('camera state changes interpolate from the current frame without snapping', () => {
  for (const [fromName, toName, at] of [['STATIC_MEDIUM', 'SLOW_PUSH_IN', 300], ['SLOW_PUSH_IN', 'CAMERA_STARE', 900]]) {
    const controller = createCameraController();
    const first = { name: fromName, triggerId: `session-1:${fromName}` };
    const next = { name: toName, triggerId: `session-1:${toName}` };
    controller.update(0, first);
    const beforeChange = controller.update(at, first);
    const onChange = controller.update(at, next);
    const afterChange = controller.update(at + 100, next);
    assert.equal(onChange.name, toName);
    for (const key of numericKeys) assert.equal(onChange[key], beforeChange[key], `${fromName} -> ${toName}.${key} boundary`);
    assert.ok(Math.abs(afterChange.xPercent - onChange.xPercent) < 0.25);
    assert.ok(Math.abs(afterChange.scale - onChange.scale) < 0.012);
  }
});

test('custom camera neutral is authoritative for sampling STOP and reset', () => {
  const neutral = { xPercent: 0.4, yPercent: -0.2, scale: 1.015, rotationDeg: 0.1 };
  const config = {
    definitions: RHEA_CAMERA_STATES,
    neutral,
    bounds: { xPercent: 2, yPercent: 1, scale: [0.98, 1.1], rotationDeg: 1 },
  };
  const start = sampleCameraState(config, 'SLOW_PUSH_IN', 0);
  assert.deepEqual(Object.fromEntries(numericKeys.map(key => [key, start[key]])), neutral);
  const peak = sampleCameraState(config, 'SLOW_PUSH_IN', RHEA_CAMERA_STATES.SLOW_PUSH_IN.enterMs);
  assert.deepEqual(Object.fromEntries(numericKeys.map(key => [key, peak[key]])), RHEA_CAMERA_STATES.SLOW_PUSH_IN.peak);
  const midpoint = sampleCameraState(config, 'SLOW_PUSH_IN', RHEA_CAMERA_STATES.SLOW_PUSH_IN.enterMs / 2);
  for (const key of numericKeys) assert.ok(midpoint[key] >= Math.min(neutral[key], peak[key]) && midpoint[key] <= Math.max(neutral[key], peak[key]));

  const controller = createCameraController(config);
  const request = { name: 'SLOW_PUSH_IN', triggerId: 'custom:0' };
  controller.update(0, request);
  controller.update(1200, request);
  controller.stop(1200);
  const stopped = controller.update(2000, null);
  assert.deepEqual(Object.fromEntries(numericKeys.map(key => [key, stopped[key]])), neutral);
  assert.deepEqual(Object.fromEntries(numericKeys.map(key => [key, controller.reset()[key]])), neutral);
});

test('performance mapping differentiates angry intimidating mocking and final hold', () => {
  const base = { beatIndex: 0, expression: 'SERIOUS', gaze: 'CAMERA', intensity: 0.5, headBias: { x: 0, y: 0 }, finalHold: false };
  const angry = { ...base, expression: 'INTIMIDATING', intensity: 0.9, headBias: { x: -0.06, y: -0.04 } };
  const intimidating = { ...base, expression: 'INTIMIDATING', intensity: 0.7, headBias: { x: -0.03, y: 0.09 } };
  const mocking = { ...base, expression: 'MOCKING', gaze: 'LEFT', intensity: 0.72, headBias: { x: 0.1, y: -0.04 } };
  assert.equal(cameraForPerformance(angry).name, 'SLOW_PUSH_IN');
  assert.equal(cameraForPerformance(intimidating).name, 'CLOSE_PROMO');
  assert.equal(cameraForPerformance(mocking).name, 'INTERVIEWER_ANGLE');
  assert.equal(cameraForPerformance({ ...intimidating, finalHold: true }).name, 'FINAL_HOLD');
  assert.deepEqual(cameraForPerformance(angry), cameraForPerformance(angry));
});

test('camera sampling cannot alter speech tone mouth body pose or gesture state', () => {
  const protectedState = Object.freeze({ text: 'Exact promo.', tone: 'ANGRY', mouth: Object.freeze({ viseme: 'AE' }), bodyPose: 'PROMO_FRONT', gesture: 'CHEST_EMPHASIS' });
  const before = structuredClone(protectedState);
  sampleCameraState('SLOW_PUSH_IN', 800);
  assert.deepEqual(protectedState, before);
  assert.equal(createBodyPoseController().sample('PROMO_FRONT', 'MEDIUM').name, 'PROMO_FRONT');
  assert.equal(sampleGesture('CHEST_EMPHASIS', 400).name, 'CHEST_EMPHASIS');
});

test('camera source contains no shake jitter scene logic or rejected asset reference', async () => {
  const sources = await Promise.all(['../promo/camera/types.ts', '../promo/camera/rheaCamera.ts', '../promo/camera/controller.ts'].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  const source = sources.join('\n');
  assert.doesNotMatch(source, /Math\.random|handheld|jitter|combat|walk|18-tattoos-details-closeup/i);
});
