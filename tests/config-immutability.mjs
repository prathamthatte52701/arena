import test from 'node:test';
import assert from 'node:assert/strict';
import { RHEA_BODY_POSES } from '../promo/body/poses.ts';
import { rheaBodyProfile } from '../promo/body/rheaBodyProfile.ts';
import { RHEA_GESTURES } from '../promo/gestures/rheaGestures.ts';
import { RHEA_CAMERA_STATES } from '../promo/camera/rheaCamera.ts';
import { RHEA_SCENES } from '../promo/scenes/rheaScenes.ts';
import { createBodyPoseController } from '../promo/body/controller.ts';
import { sampleGesture } from '../promo/gestures/controller.ts';
import { sampleCameraState } from '../promo/camera/controller.ts';

test('critical character configuration is frozen through nested numeric definitions', () => {
  const bodyBefore = createBodyPoseController().sample('PROMO_FRONT', 'MEDIUM');
  const gestureBefore = sampleGesture('LEAN_FORWARD', 600);
  const cameraBefore = sampleCameraState('SLOW_PUSH_IN', 1200);

  assert.ok(Object.isFrozen(RHEA_BODY_POSES) && Object.isFrozen(RHEA_BODY_POSES.PROMO_FRONT));
  assert.ok(Object.isFrozen(rheaBodyProfile) && Object.isFrozen(rheaBodyProfile.framing) && Object.isFrozen(rheaBodyProfile.framing.MEDIUM));
  assert.ok(Object.isFrozen(rheaBodyProfile.bounds) && Object.isFrozen(rheaBodyProfile.bounds.bodyScale));
  assert.ok(Object.isFrozen(RHEA_GESTURES) && Object.isFrozen(RHEA_GESTURES.LEAN_FORWARD) && Object.isFrozen(RHEA_GESTURES.LEAN_FORWARD.peak));
  assert.ok(Object.isFrozen(RHEA_CAMERA_STATES) && Object.isFrozen(RHEA_CAMERA_STATES.SLOW_PUSH_IN) && Object.isFrozen(RHEA_CAMERA_STATES.SLOW_PUSH_IN.peak));
  assert.ok(Object.isFrozen(RHEA_SCENES.INTERVIEW.allowedGestures) && Object.isFrozen(RHEA_SCENES.INTERVIEW.safeTextArea));

  assert.throws(() => { RHEA_BODY_POSES.PROMO_FRONT.bodyScale = 99; }, TypeError);
  assert.throws(() => { RHEA_GESTURES.LEAN_FORWARD.peak.bodyScale = 99; }, TypeError);
  assert.throws(() => { RHEA_CAMERA_STATES.SLOW_PUSH_IN.peak.scale = 99; }, TypeError);
  assert.throws(() => { RHEA_SCENES.INTERVIEW.allowedGestures[0] = 'LEAN_FORWARD'; }, TypeError);

  assert.deepEqual(createBodyPoseController().sample('PROMO_FRONT', 'MEDIUM'), bodyBefore);
  assert.deepEqual(sampleGesture('LEAN_FORWARD', 600), gestureBefore);
  assert.deepEqual(sampleCameraState('SLOW_PUSH_IN', 1200), cameraBefore);
});
