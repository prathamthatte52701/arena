import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BODY_POSE_NAMES } from '../promo/body/types.ts';
import { createBodyPoseController } from '../promo/body/controller.ts';
import { rheaBodyProfile } from '../promo/body/rheaBodyProfile.ts';
import { GESTURE_NAMES } from '../promo/gestures/types.ts';
import { createGestureController, sampleGesture, sampleGestureProgress } from '../promo/gestures/controller.ts';
import { GESTURE_BOUNDS, NEUTRAL_GESTURE_TRANSFORM, RHEA_GESTURES } from '../promo/gestures/rheaGestures.ts';
import { CAMERA_STATE_NAMES } from '../promo/camera/types.ts';
import { createCameraController, sampleCameraProgress, sampleCameraState } from '../promo/camera/controller.ts';
import { CAMERA_BOUNDS, NEUTRAL_CAMERA_TRANSFORM } from '../promo/camera/rheaCamera.ts';
import { createSceneRuntimePlan } from '../promo/scenes/orchestration.ts';
import { RHEA_SCENES } from '../promo/scenes/rheaScenes.ts';
import { SCENE_NAMES } from '../promo/scenes/types.ts';
import { createVisemeTimeline, timelineDuration } from '../promo/speech/textTimeline.ts';
import { createTtsRequest, wavDurationMs } from '../promo/voice/pipeline.ts';
import { createReplayMemory } from '../promo/voice/replay.ts';

let seed = 0x51f15e;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 0x100000000;
}
const pick = values => values[Math.floor(random() * values.length)];
const malformed = [NaN, Infinity, -Infinity, -1e12, 1e12, null, undefined, {}, [], '', 'BOGUS', 'toString', 'constructor', '__proto__'];
const finiteKeys = value => Object.entries(value).filter(([, entry]) => typeof entry === 'number');

function assertBodyBounded(frame) {
  for (const [key, value] of finiteKeys(frame)) assert.ok(Number.isFinite(value), `body.${key}`);
  const bounds = rheaBodyProfile.bounds;
  assert.ok(Math.abs(frame.torsoYawDeg) <= bounds.torsoYawDeg);
  assert.ok(Math.abs(frame.torsoLeanDeg) <= bounds.torsoLeanDeg);
  assert.ok(frame.bodyScale >= bounds.bodyScale[0] && frame.bodyScale <= bounds.bodyScale[1]);
  assert.ok(['CLOSE', 'MEDIUM', 'FULL'].includes(frame.framing));
}

function assertGestureBounded(frame) {
  for (const [key, value] of finiteKeys(frame)) assert.ok(Number.isFinite(value), `gesture.${key}`);
  assert.ok(Math.abs(frame.bodyXPercent) <= GESTURE_BOUNDS.bodyXPercent);
  assert.ok(Math.abs(frame.bodyYPercent) <= GESTURE_BOUNDS.bodyYPercent);
  assert.ok(frame.bodyScale >= GESTURE_BOUNDS.bodyScale[0] && frame.bodyScale <= GESTURE_BOUNDS.bodyScale[1]);
  assert.ok(Math.abs(frame.torsoYawDeg) <= GESTURE_BOUNDS.torsoYawDeg);
  assert.ok(Math.abs(frame.torsoLeanDeg) <= GESTURE_BOUNDS.torsoLeanDeg);
  assert.ok(Math.abs(frame.headRotationDeg) <= GESTURE_BOUNDS.headRotationDeg);
}

function assertCameraBounded(frame) {
  for (const [key, value] of finiteKeys(frame)) assert.ok(Number.isFinite(value), `camera.${key}`);
  assert.ok(Math.abs(frame.xPercent) <= CAMERA_BOUNDS.xPercent);
  assert.ok(Math.abs(frame.yPercent) <= CAMERA_BOUNDS.yPercent);
  assert.ok(frame.scale >= CAMERA_BOUNDS.scale[0] && frame.scale <= CAMERA_BOUNDS.scale[1]);
  assert.ok(Math.abs(frame.rotationDeg) <= CAMERA_BOUNDS.rotationDeg);
}

test('10,000 malformed body inputs never throw and remain bounded', () => {
  const controller = createBodyPoseController();
  const poses = [...BODY_POSE_NAMES, ...malformed];
  const framings = ['CLOSE', 'MEDIUM', 'FULL', ...malformed];
  for (let index = 0; index < 10_000; index++) assertBodyBounded(controller.sample(pick(poses), pick(framings)));
});

test('25,000 malformed gesture samples never throw and remain bounded', () => {
  const gestures = [...GESTURE_NAMES, ...malformed];
  const times = [...malformed, -1000, 0, 1, 500, 1e9];
  for (let index = 0; index < 25_000; index++) {
    const frame = index % 2
      ? sampleGesture(pick(gestures), pick(times))
      : sampleGestureProgress(pick(gestures), pick(times));
    assertGestureBounded(frame);
  }
});

test('25,000 malformed camera samples never throw and remain bounded', () => {
  const cameras = [...CAMERA_STATE_NAMES, ...malformed];
  const times = [...malformed, -1000, 0, 1, 500, 1e9];
  for (let index = 0; index < 25_000; index++) {
    const frame = index % 2
      ? sampleCameraState(pick(cameras), pick(times))
      : sampleCameraProgress(pick(cameras), pick(times));
    assertCameraBounded(frame);
  }
});

test('10,000 malformed scene runtime requests stay deterministic and legal', () => {
  const topLevel = [null, undefined, 42, 'request', [], {}, Object.create({ scene: 'RING_ARENA', text: 'trap', tone: 'ANGRY' })];
  for (let index = 0; index < 10_000; index++) {
    const request = index % 4 === 0 ? pick(topLevel) : {
      scene: pick(['INTERVIEW', 'BACKSTAGE', 'RING_ARENA', 'PRESS_CONFERENCE', ...malformed]),
      text: pick(['Exact text.', 'Café — ready.', ...malformed]),
      tone: pick(['AUTO', 'CONFIDENT', 'COLD', 'MOCKING', 'ANGRY', 'INTIMIDATING', 'SMIRKING', ...malformed]),
      mode: pick(['REST', 'SPEAKING', ...malformed]),
      framing: pick(['CLOSE', 'MEDIUM', 'FULL', ...malformed]),
      pose: pick([...BODY_POSE_NAMES, ...malformed]),
      gesture: pick([...GESTURE_NAMES, ...malformed]),
      camera: pick([...CAMERA_STATE_NAMES, ...malformed]),
      gaze: pick(['CAMERA', 'INTERVIEWER', 'LEFT', 'RIGHT', 'CENTER', ...malformed]),
    };
    const first = createSceneRuntimePlan(request);
    const second = createSceneRuntimePlan(request);
    assert.deepEqual(first, second);
    const scene = RHEA_SCENES[first.scene];
    assert.ok(scene.allowedFramings.includes(first.framing));
    assert.ok(scene.allowedPoses.includes(first.pose));
    assert.ok(scene.allowedGestures.includes(first.gesture));
    assert.ok(scene.allowedCameraStates.includes(first.camera));
    assert.equal(typeof first.text, 'string');
  }
});

test('all 28 scene and tone combinations are deterministic, legal, and exact-text safe', () => {
  const tones = ['AUTO', 'CONFIDENT', 'COLD', 'MOCKING', 'ANGRY', 'INTIMIDATING', 'SMIRKING'];
  const text = "You think you're ready for me? Then prove it.";
  let count = 0;
  for (const sceneName of SCENE_NAMES) for (const tone of tones) {
    const first = createSceneRuntimePlan({ scene: sceneName, text, tone, mode: 'SPEAKING' });
    const second = createSceneRuntimePlan({ scene: sceneName, text, tone, mode: 'SPEAKING' });
    const scene = RHEA_SCENES[sceneName];
    assert.deepEqual(first, second, `${sceneName}/${tone} determinism`);
    assert.equal(first.text, text, `${sceneName}/${tone} exact text`);
    assert.equal(first.tone, tone);
    assert.ok(scene.allowedFramings.includes(first.framing));
    assert.ok(scene.allowedPoses.includes(first.pose));
    assert.ok(scene.allowedGestures.includes(first.gesture));
    assert.ok(scene.allowedCameraStates.includes(first.camera));
    count++;
  }
  assert.equal(count, 28);
});

test('1,000 controller race sequences remain finite bounded and continuous at request boundaries', () => {
  const gestureNames = GESTURE_NAMES.filter(name => RHEA_GESTURES[name].supported);
  const actionsSeen = new Set();
  for (let run = 0; run < 1_000; run++) {
    const gesture = createGestureController();
    const camera = createCameraController();
    let now = 0;
    let gestureRequest = { name: pick(gestureNames), triggerId: `${run}:0` };
    let cameraRequest = { name: pick(CAMERA_STATE_NAMES), triggerId: `${run}:0` };
    gesture.update(now, gestureRequest);
    camera.update(now, cameraRequest);
    for (let step = 1; step <= 40; step++) {
      now += Math.floor(random() * 220);
      const reportedNow = random() < 0.15 ? now - Math.floor(random() * 500) : now;
      const gestureFrame = gesture.update(reportedNow, gestureRequest);
      const cameraFrame = camera.update(reportedNow, cameraRequest);
      const action = Math.floor(random() * 8);
      actionsSeen.add(action);
      if (action === 0) gestureRequest = { ...gestureRequest, triggerId: `${run}:${step}:same` };
      if (action === 1) gestureRequest = { name: pick(gestureNames), triggerId: `${run}:${step}:different` };
      if (action === 2) gestureRequest = null;
      if (action === 3) gestureRequest = { name: pick(gestureNames), triggerId: `${run}:${step}:after-stop` };
      if (action === 4) cameraRequest = { ...cameraRequest, triggerId: `${run}:${step}:same` };
      if (action === 5) cameraRequest = { name: pick(CAMERA_STATE_NAMES), triggerId: `${run}:${step}:different` };
      if (action === 6) cameraRequest = null;
      if (action === 7) {
        gesture.reset();
        camera.reset();
      }
      const nextGesture = gesture.update(reportedNow, gestureRequest);
      const nextCamera = camera.update(reportedNow, cameraRequest);
      assertGestureBounded(nextGesture);
      assertCameraBounded(nextCamera);
      if (action !== 7) {
        const gestureJump = Object.keys(NEUTRAL_GESTURE_TRANSFORM).reduce((sum, key) => sum + Math.abs(nextGesture[key] - gestureFrame[key]), 0);
        const cameraJump = Object.keys(NEUTRAL_CAMERA_TRANSFORM).reduce((sum, key) => sum + Math.abs(nextCamera[key] - cameraFrame[key]), 0);
        assert.ok(gestureJump < 1e-9, `gesture boundary jump ${gestureJump}; run=${run}; step=${step}; action=${action}; ${gestureFrame.name}/${gestureFrame.phase} -> ${nextGesture.name}/${nextGesture.phase}`);
        assert.ok(cameraJump < 1e-9, `camera boundary jump ${cameraJump}; run=${run}; step=${step}; action=${action}; ${cameraFrame.name}/${cameraFrame.phase} -> ${nextCamera.name}/${nextCamera.phase}`);
      }
    }
  }
  assert.equal(actionsSeen.size, 8);
});

test('speech torture preserves exact TTS text and bounded REST-safe timelines', () => {
  const cases = [
    'A', 'a'.repeat(420), '?!...,,,;;;', "Don't—won’t—can’t...", '“Ready?” — ‘Prove it.’',
    'Café Beyoncé José naïve', 'Rhea 🔥 owns this arena.', 'mixed Latin Æ Ø Ł ß', 'x'.repeat(419) + '!',
  ];
  for (const source of cases) {
    const request = createTtsRequest(source, 'AUTO');
    assert.equal(request.text, source);
    const timeline = createVisemeTimeline(source);
    assert.ok(timelineDuration(timeline) <= 90_000);
    assert.ok(timeline.every(segment => Number.isFinite(segment.startMs) && Number.isFinite(segment.endMs) && segment.endMs > segment.startMs));
    assert.ok(timeline.filter(segment => segment.kind === 'pause').every(segment => segment.viseme === 'REST'));
  }
  assert.throws(() => createTtsRequest('a'.repeat(421), 'AUTO'));
  const replay = createReplayMemory();
  replay.remember('Prior valid promo.', 'COLD');
  assert.deepEqual(replay.read(), { text: 'Prior valid promo.', tone: 'COLD' });
});

test('10,000 malformed WAV buffers never throw and return zero duration', () => {
  for (let index = 0; index < 10_000; index++) {
    const length = Math.floor(random() * 180);
    const bytes = Buffer.alloc(length);
    for (let offset = 0; offset < length; offset++) bytes[offset] = Math.floor(random() * 256);
    assert.equal(wavDurationMs(bytes), 0);
  }
  const malformedWavs = [
    Buffer.from('RIFF'),
    Buffer.from('RIFF0000WAVEfmt '),
    Buffer.from('RIFF0000WAVEdata'),
  ];
  for (const bytes of malformedWavs) assert.equal(wavDurationMs(bytes), 0);
});

test('face structure remains flat canonical single-canvas Rhea V2', async () => {
  const [rig, styles, profile, body] = await Promise.all([
    readFile(new URL('../promo/character/RheaPortraitRig.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../promo/character/rig.module.css', import.meta.url), 'utf8'),
    readFile(new URL('../promo/character/rheaProfile.ts', import.meta.url), 'utf8'),
    readFile(new URL('../promo/body/rheaBodyProfile.ts', import.meta.url), 'utf8'),
  ]);
  assert.equal((rig.match(/<canvas\b/g) ?? []).length, 1);
  assert.equal((rig.match(/className=\{styles\.portrait\}/g) ?? []).length, 1);
  assert.doesNotMatch(styles, /perspective\s*:|preserve-3d|rotateY\s*\(|scale[XY]\s*\(/);
  assert.match(profile, /faceFrontNeutral/);
  assert.match(profile, /width:\s*1122[\s\S]*height:\s*1402/);
  assert.match(styles, /\.full \.bodyPlate[^}]*mask-image/);
  assert.doesNotMatch(`${rig}\n${styles}\n${profile}\n${body}`, /18-tattoos-details-closeup/i);
});
