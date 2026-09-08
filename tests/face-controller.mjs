import test from 'node:test';
import assert from 'node:assert/strict';
import { blinkClosure, nextBlinkDelay, BLINK_DURATION } from '../promo/face/blink.ts';
import { createFaceController } from '../promo/face/controller.ts';
import { blendPose, POSES, follow } from '../promo/face/expressions.ts';
import { GAZE_POINTS } from '../promo/face/gaze.ts';

const defaults = { expression: 'NEUTRAL', gaze: 'CENTER', idle: false, blinkRequest: 0, blinkPreview: null };
function random(seed = 42) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
function settle(controller, controls, start = 0, seconds = 3) {
  let frame;
  for (let i = 0; i <= seconds * 60; i++) frame = controller.update(start + i / 60, controls);
  return frame;
}

test('blink closes quickly, holds briefly and reopens without out-of-range values', () => {
  assert.equal(blinkClosure(-1), 0);
  assert.equal(blinkClosure(0), 0);
  assert.equal(blinkClosure(.065), 1);
  assert.equal(blinkClosure(.09), 1);
  assert.ok(blinkClosure(.14) > 0 && blinkClosure(.14) < 1);
  assert.equal(blinkClosure(BLINK_DURATION), 0);
  for (let t = 0; t < .4; t += .001) assert.ok(blinkClosure(t) >= 0 && blinkClosure(t) <= 1);
});

test('each scheduled blink gets a fresh bounded delay', () => {
  const rng = random();
  const delays = Array.from({ length: 30 }, () => nextBlinkDelay(rng));
  assert.equal(new Set(delays).size, 30);
  assert.ok(delays.every(delay => delay >= 2.1 && delay <= 6.9));
});

test('all six expressions converge to their distinct bounded poses', () => {
  const results = [];
  for (const expression of Object.keys(POSES)) {
    const frame = settle(createFaceController(random()), { ...defaults, expression });
    for (const key of Object.keys(frame.pose)) assert.ok(Math.abs(frame.pose[key] - POSES[expression][key]) < .001);
    assert.ok(Math.abs(frame.pose.head) <= 2.2);
    assert.ok(frame.pose.squint <= .23);
    results.push(JSON.stringify(frame.pose));
  }
  assert.equal(new Set(results).size, 6);
});

test('rapid retargeting starts from the displayed pose, has no snap or overshoot', () => {
  let pose = { ...POSES.NEUTRAL };
  for (const expression of ['SMIRK','INTIMIDATING','CONFIDENT','SERIOUS','NEUTRAL']) {
    const next = blendPose(pose, POSES[expression], 1 / 60);
    for (const key of Object.keys(pose)) {
      assert.ok(Math.abs(next[key] - pose[key]) < .4);
      assert.ok(next[key] >= Math.min(pose[key], POSES[expression][key]) - 1e-8);
      assert.ok(next[key] <= Math.max(pose[key], POSES[expression][key]) + 1e-8);
    }
    pose = next;
  }
});

test('smoothing is frame-rate independent and ignores negative time deltas', () => {
  let a = 0, b = 0;
  for (let i = 0; i < 60; i++) a = follow(a, 1, 1 / 60);
  for (let i = 0; i < 30; i++) b = follow(b, 1, 1 / 30);
  assert.ok(Math.abs(a - b) < 1e-10);
  assert.equal(follow(.2, 1, -2), .2);
});

test('gaze reaches five distinct targets with bounded eye motion', () => {
  for (const gaze of Object.keys(GAZE_POINTS)) {
    const frame = settle(createFaceController(random()), { ...defaults, gaze });
    assert.ok(Math.abs(frame.gazeX - GAZE_POINTS[gaze].x) < .001);
    assert.ok(Math.abs(frame.gazeY - GAZE_POINTS[gaze].y) < .001);
    assert.ok(Math.abs(frame.gazeX) <= 6);
  }
  assert.ok(GAZE_POINTS.LEFT.x < GAZE_POINTS.INTERVIEWER.x);
  assert.ok(GAZE_POINTS.RIGHT.x > GAZE_POINTS.CAMERA.x);
});

test('idle over 30 seconds produces irregular blinks, drift, breath and glances', () => {
  const controller = createFaceController(random());
  const frames = [], onsets = [];
  for (let i = 0; i < 30 * 60; i++) {
    const frame = controller.update(i / 60, { ...defaults, idle: true });
    if (frame.blink > 0 && (!frames.length || frames.at(-1).blink === 0)) onsets.push(i / 60);
    frames.push(frame);
    assert.ok(Math.abs(frame.headX) <= 1.2 && Math.abs(frame.headY) <= .85);
    assert.ok(Math.abs(frame.breath) <= 1.7);
  }
  assert.ok(onsets.length >= 4);
  assert.ok(new Set(onsets.slice(1).map((t, i) => Math.round((t - onsets[i]) * 10))).size > 1);
  for (const key of ['headX','headY','breath','gazeX']) assert.ok(new Set(frames.map(frame => frame[key].toFixed(2))).size > 10, key);
  const paused = settle(controller, defaults, 30, 15);
  assert.ok(Math.abs(paused.headX) < .001 && Math.abs(paused.breath) < .001);
  assert.equal(paused.blink, 0);
});

test('manual blink works while idle is off and returns to rest', () => {
  const controller = createFaceController(random());
  controller.update(0, defaults);
  controller.update(1, { ...defaults, blinkRequest: 1 });
  assert.equal(controller.update(1.08, { ...defaults, blinkRequest: 1 }).blink, 1);
  assert.equal(controller.update(1.3, { ...defaults, blinkRequest: 1 }).blink, 0);
  assert.equal(controller.update(2, { ...defaults, blinkRequest: 1, blinkPreview: 2 }).blink, 1);
  assert.equal(controller.update(3, { ...defaults, blinkRequest: 1, blinkPreview: -1 }).blink, 0);
});

test('a fresh controller resets the pose and does not leak prior state', () => {
  const old = createFaceController(random());
  settle(old, { ...defaults, expression: 'INTIMIDATING' });
  const fresh = createFaceController(random()).update(50, defaults);
  assert.deepEqual(fresh.pose, POSES.NEUTRAL);
  assert.equal(fresh.blink, 0);
});
