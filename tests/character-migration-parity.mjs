import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BODY_POSE_NAMES } from '../promo/body/types.ts';
import { createBodyPoseController } from '../promo/body/controller.ts';
import { GESTURE_NAMES } from '../promo/gestures/types.ts';
import { RHEA_GESTURES } from '../promo/gestures/rheaGestures.ts';
import { sampleGestureProgress } from '../promo/gestures/controller.ts';
import { CAMERA_STATE_NAMES } from '../promo/camera/types.ts';
import { sampleCameraProgress } from '../promo/camera/controller.ts';
import { SCENE_NAMES } from '../promo/scenes/types.ts';
import { createRheaSceneController as createSceneController, createRheaSceneRuntimePlan as createSceneRuntimePlan } from '../promo/scenes/rheaRuntime.ts';
import { createPerformanceTimeline } from '../promo/performance/timeline.ts';

const tones = ['AUTO', 'CONFIDENT', 'COLD', 'MOCKING', 'ANGRY', 'INTIMIDATING', 'SMIRKING'];
const progress = [0, 0.25, 0.5, 0.75, 1];
const text = "You think you're ready for me? Then prove it. I don't need your respect. I need you to understand exactly who you're standing across from.";
const expected = Object.freeze({
  body: 'a88d04ba1a003c173cdf56f95d97bf85220a52fb1c373596ba1709a224168e9c',
  gestures: '55cbc0744c214ed23f6cb8ac53c4fcbf675800fde2c99cee641a9af752e93387',
  camera: '6c5dd7171dbf65bbd2b2dcd28b2162f7757b7ac10902ef004613de6fa13ee357',
  scenes: 'e8ee917f8a96ebe198642b5c3f5a16fe2ebe763656118f9819ae813818c7f771',
  orchestration: '4ccd06be49afc79dc950d37e1d1bd6cee92db9b540a6bb19455bc4fa676ce00a',
  performance: '32aa401e6efc0ca71624e660a573c04000ec7152724960d61b87b29ac94c7874',
});

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

test('pre-migration Rhea outputs match the locked Phase 5 parity snapshots', () => {
  const actual = {
    body: BODY_POSE_NAMES.flatMap(pose => ['CLOSE', 'MEDIUM', 'FULL'].map(framing => createBodyPoseController().sample(pose, framing))),
    gestures: GESTURE_NAMES.filter(name => RHEA_GESTURES[name].supported).flatMap(name => progress.map(value => sampleGestureProgress(name, value))),
    camera: CAMERA_STATE_NAMES.flatMap(name => progress.map(value => sampleCameraProgress(name, value))),
    scenes: SCENE_NAMES.map(name => createSceneController().sample(name)),
    orchestration: SCENE_NAMES.flatMap(scene => tones.map(tone => createSceneRuntimePlan({ scene, text, tone }))),
    performance: tones.map(tone => createPerformanceTimeline(text, tone)),
  };
  for (const [domain, value] of Object.entries(actual)) assert.equal(hash(value), expected[domain], `${domain} parity`);
});

test('Rhea transform ownership remains numerically identical to the pre-P6 baseline', () => {
  const controller = createBodyPoseController();
  const fields = ['bodyScale', 'bodyXPercent', 'bodyYPercent', 'headScale', 'headXPercent', 'headYPercent', 'headRotationDeg', 'framingHeightPercent', 'framingTopPercent'];
  const cases = [
    ['CLOSE', 'NEUTRAL_STAND', [1, 0, 0, 1, 0, 0, 0, 100, 0]],
    ['MEDIUM', 'INTERVIEWER', [1.01, -1.35, 0.1, 1, 0.3, -0.1, -0.45, 220, -3]],
    ['MEDIUM', 'PROMO_FRONT', [1.025, 0, 0.2, 1.005, 0, -0.15, 0, 220, -3]],
    ['FULL', 'POWER_STANCE', [1.055, 0, 0.65, 1.012, 0, -0.2, 0, 99, 0.5]],
  ];

  for (const [framing, pose, expectedValues] of cases) {
    const frame = controller.sample(pose, framing);
    assert.deepEqual(
      fields.map(field => frame[field]),
      expectedValues,
      `${String(framing)} ${String(pose)} transform parity`,
    );
  }
});
