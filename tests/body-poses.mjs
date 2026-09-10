import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createBodyPoseController, resolveBodyPose } from '../promo/body/controller.ts';
import { rheaBodyProfile } from '../promo/body/rheaBodyProfile.ts';
import { BODY_POSE_NAMES } from '../promo/body/types.ts';

const framings = ['CLOSE', 'MEDIUM', 'FULL'];

test('all six Phase 4.1 static body poses are available', () => {
  assert.deepEqual(BODY_POSE_NAMES, [
    'NEUTRAL_STAND',
    'PROMO_FRONT',
    'THREE_QUARTER',
    'CAMERA_STARE',
    'INTERVIEWER',
    'POWER_STANCE',
  ]);
});

test('body pose sampling is finite and remains inside conservative bounds', () => {
  const controller = createBodyPoseController();
  const bounds = rheaBodyProfile.bounds;

  for (const name of BODY_POSE_NAMES) {
    for (const framing of framings) {
      const frame = controller.sample(name, framing);
      for (const [key, value] of Object.entries(frame)) {
        if (typeof value === 'number') assert.ok(Number.isFinite(value), `${name}.${key} must be finite`);
      }
      assert.ok(Math.abs(frame.torsoYawDeg) <= bounds.torsoYawDeg);
      assert.ok(Math.abs(frame.torsoLeanDeg) <= bounds.torsoLeanDeg);
      assert.ok(frame.bodyScale >= bounds.bodyScale[0] && frame.bodyScale <= bounds.bodyScale[1]);
      assert.ok(Math.abs(frame.bodyXPercent) <= bounds.bodyXPercent);
      assert.ok(Math.abs(frame.bodyYPercent) <= bounds.bodyYPercent);
      assert.ok(Math.abs(frame.headXPercent) <= bounds.headXPercent);
      assert.ok(Math.abs(frame.headYPercent) <= bounds.headYPercent);
      assert.ok(frame.headScale >= bounds.headScale[0] && frame.headScale <= bounds.headScale[1]);
      assert.ok(Math.abs(frame.headRotationDeg) <= bounds.headRotationDeg);
    }
  }
});

test('body pose sampling is deterministic', () => {
  const controller = createBodyPoseController();
  for (const name of BODY_POSE_NAMES) {
    assert.deepEqual(controller.sample(name, 'MEDIUM'), controller.sample(name, 'MEDIUM'));
  }
});

test('invalid pose input falls back to neutral stand', () => {
  assert.deepEqual(resolveBodyPose('NOT_A_POSE'), resolveBodyPose('NEUTRAL_STAND'));
  assert.deepEqual(resolveBodyPose(null), resolveBodyPose('NEUTRAL_STAND'));
});

test('body sampling cannot alter speech text, mouth target, or tone', () => {
  const protectedSpeech = Object.freeze({
    text: 'You think you are ready for me? Then prove it.',
    mouth: Object.freeze({ viseme: 'AE', amount: 0.8 }),
    tone: 'INTIMIDATING',
  });
  const before = structuredClone(protectedSpeech);
  const frame = createBodyPoseController().sample('POWER_STANCE', 'FULL');

  assert.deepEqual(protectedSpeech, before);
  assert.equal('text' in frame, false);
  assert.equal('mouth' in frame, false);
  assert.equal('tone' in frame, false);
});

test('body runtime never references rejected asset 18', async () => {
  assert.match(rheaBodyProfile.runtimeAsset, /07-body-front\.png$/);
  assert.doesNotMatch(JSON.stringify(rheaBodyProfile), /18-tattoos-details-closeup/i);

  const bodySources = await Promise.all([
    '../promo/body/rheaBodyProfile.ts',
    '../promo/body/poses.ts',
    '../promo/body/controller.ts',
  ].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.doesNotMatch(bodySources.join('\n'), /18-tattoos-details-closeup/i);
});
