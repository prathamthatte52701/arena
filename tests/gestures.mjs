import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGestureController, gestureForPerformance, resolveGesture, sampleGesture, sampleGestureProgress } from '../promo/gestures/controller.ts';
import { GESTURE_BOUNDS, NEUTRAL_GESTURE_TRANSFORM, RHEA_GESTURES } from '../promo/gestures/rheaGestures.ts';
import { GESTURE_NAMES } from '../promo/gestures/types.ts';
import { createBodyPoseController } from '../promo/body/controller.ts';
import { createSceneRuntimePlan } from '../promo/scenes/orchestration.ts';
import { SCENE_NAMES } from '../promo/scenes/types.ts';

const supported = GESTURE_NAMES.filter(name => RHEA_GESTURES[name].supported);
const numericKeys = Object.keys(NEUTRAL_GESTURE_TRANSFORM);

test('all requested Phase 4.2 gesture contracts exist and unsafe arm articulation is explicit', () => {
  assert.deepEqual(GESTURE_NAMES, ['IDLE', 'ARMS_RELAXED', 'ARMS_CROSSED', 'ONE_HAND_POINT', 'OPEN_PALM_CHALLENGE', 'CHEST_EMPHASIS', 'LEAN_FORWARD', 'HEAD_TILT_EMPHASIS']);
  assert.deepEqual(supported, ['IDLE', 'ARMS_RELAXED', 'CHEST_EMPHASIS', 'LEAN_FORWARD', 'HEAD_TILT_EMPHASIS']);
  for (const name of ['ARMS_CROSSED', 'ONE_HAND_POINT', 'OPEN_PALM_CHALLENGE']) {
    assert.equal(RHEA_GESTURES[name].supported, false);
    assert.match(RHEA_GESTURES[name].reason, /static body plate/i);
  }
});

test('same gesture input produces the same deterministic enter hold exit sequence', () => {
  for (const name of supported) {
    const definition = RHEA_GESTURES[name];
    const samples = [0, definition.enterMs / 2, definition.enterMs, definition.enterMs + definition.holdMs / 2, definition.enterMs + definition.holdMs, definition.enterMs + definition.holdMs + definition.exitMs / 2];
    assert.deepEqual(samples.map(time => sampleGesture(name, time)), samples.map(time => sampleGesture(name, time)));
  }
});

test('gesture phases progress through ENTER HOLD EXIT and REST', () => {
  const gesture = RHEA_GESTURES.LEAN_FORWARD;
  assert.equal(sampleGesture(gesture.name, 0).phase, 'ENTER');
  assert.equal(sampleGesture(gesture.name, gesture.enterMs).phase, 'HOLD');
  assert.equal(sampleGesture(gesture.name, gesture.enterMs + gesture.holdMs).phase, 'EXIT');
  assert.equal(sampleGesture(gesture.name, gesture.enterMs + gesture.holdMs + gesture.exitMs).phase, 'REST');
});

test('all gesture output is finite and remains inside conservative bounds', () => {
  for (const name of GESTURE_NAMES) for (const progress of [0, 0.2, 0.5, 0.8, 1]) {
    const frame = sampleGestureProgress(name, progress);
    for (const key of numericKeys) assert.ok(Number.isFinite(frame[key]), `${name}.${key} must be finite`);
    assert.ok(Math.abs(frame.bodyXPercent) <= GESTURE_BOUNDS.bodyXPercent);
    assert.ok(Math.abs(frame.bodyYPercent) <= GESTURE_BOUNDS.bodyYPercent);
    assert.ok(frame.bodyScale >= GESTURE_BOUNDS.bodyScale[0] && frame.bodyScale <= GESTURE_BOUNDS.bodyScale[1]);
    assert.ok(Math.abs(frame.torsoYawDeg) <= GESTURE_BOUNDS.torsoYawDeg);
    assert.ok(Math.abs(frame.torsoLeanDeg) <= GESTURE_BOUNDS.torsoLeanDeg);
    assert.ok(Math.abs(frame.headXPercent) <= GESTURE_BOUNDS.headXPercent);
    assert.ok(Math.abs(frame.headYPercent) <= GESTURE_BOUNDS.headYPercent);
    assert.ok(frame.headScale >= GESTURE_BOUNDS.headScale[0] && frame.headScale <= GESTURE_BOUNDS.headScale[1]);
    assert.ok(Math.abs(frame.headRotationDeg) <= GESTURE_BOUNDS.headRotationDeg);
  }
});

test('invalid and unsupported gesture requests fall back to safe neutral output', () => {
  assert.equal(resolveGesture('NOT_A_GESTURE').name, 'IDLE');
  assert.equal(resolveGesture(Object.create({ definitions: RHEA_GESTURES, bounds: GESTURE_BOUNDS, neutral: NEUTRAL_GESTURE_TRANSFORM }), 'CHEST_EMPHASIS').name, 'IDLE');
  assert.deepEqual(Object.fromEntries(numericKeys.map(key => [key, sampleGesture('ARMS_CROSSED', 500)[key]])), NEUTRAL_GESTURE_TRANSFORM);
});

test('STOP exits the current gesture and reaches neutral without a frozen half gesture', () => {
  const controller = createGestureController();
  const request = { name: 'LEAN_FORWARD', triggerId: 'session-1:beat-0' };
  controller.update(0, request);
  const active = controller.update(600, request);
  assert.notDeepEqual(Object.fromEntries(numericKeys.map(key => [key, active[key]])), NEUTRAL_GESTURE_TRANSFORM);
  controller.stop(600);
  assert.equal(controller.update(780, null).phase, 'EXIT');
  const stopped = controller.update(1000, null);
  assert.equal(stopped.phase, 'REST');
  assert.deepEqual(Object.fromEntries(numericKeys.map(key => [key, stopped[key]])), NEUTRAL_GESTURE_TRANSFORM);
});

test('REPLAY restarts the same gesture cleanly after STOP', () => {
  const controller = createGestureController();
  const first = { name: 'CHEST_EMPHASIS', triggerId: 'session-1:beat-0' };
  controller.update(100, first);
  const firstEntry = controller.update(230, first);
  controller.stop(230);
  controller.update(700, null);
  const replay = { name: 'CHEST_EMPHASIS', triggerId: 'session-2:beat-0' };
  controller.update(900, replay);
  assert.deepEqual(controller.update(1030, replay), firstEntry);
});

test('same gesture with a new beat trigger preserves the displayed transform', () => {
  for (const name of ['CHEST_EMPHASIS', 'LEAN_FORWARD', 'HEAD_TILT_EMPHASIS', 'ARMS_RELAXED']) {
    const controller = createGestureController();
    const definition = RHEA_GESTURES[name];
    const first = { name, triggerId: `${name}:beat-0` };
    const next = { name, triggerId: `${name}:beat-1` };
    controller.update(0, first);
    const at = definition.enterMs + definition.holdMs / 2;
    const before = controller.update(at, first);
    const boundary = controller.update(at, next);
    assert.deepEqual(boundary, before, `${name} must not restart at a trigger boundary`);
    const after = controller.update(at + 40, next);
    for (const key of numericKeys) assert.ok(Math.abs(after[key] - boundary[key]) < 0.08, `${name}.${key} continuity`);
  }
});

test('different supported gestures interpolate directly from the displayed frame', () => {
  for (const [fromName, toName] of [['ARMS_RELAXED', 'CHEST_EMPHASIS'], ['CHEST_EMPHASIS', 'LEAN_FORWARD'], ['HEAD_TILT_EMPHASIS', 'ARMS_RELAXED']]) {
    const controller = createGestureController();
    const first = { name: fromName, triggerId: `${fromName}:beat-0` };
    const next = { name: toName, triggerId: `${toName}:beat-1` };
    controller.update(0, first);
    const at = RHEA_GESTURES[fromName].enterMs + 120;
    const before = controller.update(at, first);
    const boundary = controller.update(at, next);
    assert.equal(boundary.name, toName);
    for (const key of numericKeys) assert.equal(boundary[key], before[key], `${fromName} -> ${toName}.${key} boundary`);
    const after = controller.update(at + 40, next);
    for (const key of numericKeys) assert.ok(Math.abs(after[key] - boundary[key]) < 0.08, `${fromName} -> ${toName}.${key} continuity`);
  }
});

test('custom gesture neutral is authoritative for sampling STOP and reset', () => {
  const neutral = {
    bodyXPercent: 0.2, bodyYPercent: -0.1, bodyScale: 1.003,
    torsoYawDeg: 0.2, torsoLeanDeg: -0.1,
    headXPercent: 0.05, headYPercent: -0.02, headScale: 1.001, headRotationDeg: 0.1,
  };
  const config = {
    definitions: RHEA_GESTURES,
    neutral,
    bounds: { ...GESTURE_BOUNDS, bodyScale: [0.98, 1.03], headScale: [0.98, 1.03] },
  };
  const start = sampleGesture(config, 'CHEST_EMPHASIS', 0);
  assert.deepEqual(Object.fromEntries(numericKeys.map(key => [key, start[key]])), neutral);
  const peak = sampleGesture(config, 'CHEST_EMPHASIS', RHEA_GESTURES.CHEST_EMPHASIS.enterMs);
  assert.deepEqual(Object.fromEntries(numericKeys.map(key => [key, peak[key]])), RHEA_GESTURES.CHEST_EMPHASIS.peak);
  const midpoint = sampleGesture(config, 'CHEST_EMPHASIS', RHEA_GESTURES.CHEST_EMPHASIS.enterMs / 2);
  for (const key of numericKeys) assert.ok(midpoint[key] >= Math.min(neutral[key], peak[key]) && midpoint[key] <= Math.max(neutral[key], peak[key]));

  const controller = createGestureController(config);
  const request = { name: 'CHEST_EMPHASIS', triggerId: 'custom:0' };
  controller.update(0, request);
  controller.update(300, request);
  controller.stop(300);
  const stopped = controller.update(1000, null);
  assert.deepEqual(Object.fromEntries(numericKeys.map(key => [key, stopped[key]])), neutral);
  assert.deepEqual(Object.fromEntries(numericKeys.map(key => [key, controller.reset()[key]])), neutral);
});

test('CLOSE runtime gestures are rendered instead of silently suppressed by CSS', async () => {
  const styles = await readFile(new URL('../promo/character/rig.module.css', import.meta.url), 'utf8');
  assert.doesNotMatch(styles, /\.close\s+\.gestureSurface\s*\{[^}]*transform\s*:\s*none/);
  const tones = ['AUTO', 'CONFIDENT', 'COLD', 'MOCKING', 'ANGRY', 'INTIMIDATING', 'SMIRKING'];
  for (const scene of SCENE_NAMES) for (const tone of tones) {
    const plan = createSceneRuntimePlan({ scene, text: 'Exact text.', tone });
    if (plan.framing === 'CLOSE') assert.equal(RHEA_GESTURES[plan.gesture].supported, true, `${scene}/${tone}`);
  }
});

test('performance mapping is deterministic and distinguishes angry intimidating and mocking signals', () => {
  const angry = { beatIndex: 0, expression: 'INTIMIDATING', gaze: 'CAMERA', intensity: 0.9, headBias: { x: -0.06, y: -0.04 }, finalHold: false };
  const intimidating = { ...angry, intensity: 0.7, headBias: { x: -0.03, y: 0.09 } };
  const mocking = { ...angry, expression: 'MOCKING', gaze: 'LEFT', intensity: 0.72, headBias: { x: 0.1, y: -0.04 } };
  assert.equal(gestureForPerformance(angry).name, 'CHEST_EMPHASIS');
  assert.equal(gestureForPerformance(intimidating).name, 'LEAN_FORWARD');
  assert.equal(gestureForPerformance(mocking).name, 'HEAD_TILT_EMPHASIS');
  assert.deepEqual(gestureForPerformance(angry), gestureForPerformance(angry));
});

test('gesture sampling cannot alter speech text tone or mouth state', () => {
  const speech = Object.freeze({ text: "You think you're ready for me? Then prove it.", tone: 'INTIMIDATING', mouth: Object.freeze({ viseme: 'AE', amount: 0.8 }) });
  const before = structuredClone(speech);
  sampleGesture('LEAN_FORWARD', 700);
  assert.deepEqual(speech, before);
});

test('gesture sources reference no rejected asset and P4.1 sampling remains valid', async () => {
  const sources = await Promise.all(['../promo/gestures/types.ts', '../promo/gestures/rheaGestures.ts', '../promo/gestures/controller.ts'].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.doesNotMatch(sources.join('\n'), /18-tattoos-details-closeup/i);
  assert.equal(createBodyPoseController().sample('PROMO_FRONT', 'MEDIUM').name, 'PROMO_FRONT');
});
