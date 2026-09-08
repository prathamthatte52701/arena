import test from 'node:test';
import assert from 'node:assert/strict';
import { MOUTH_DEFORMATIONS, REST_MOUTH, deformationForViseme, isSafeMouthDeformation } from '../promo/face/mouth.ts';
import { createVisemeTimeline, segmentAt, timelineDeformation, timelineDuration } from '../promo/speech/textTimeline.ts';
import { phoneticGroups, visemeForGroup } from '../promo/speech/visemes.ts';
import { MAX_TIMELINE_MS } from '../promo/speech/timing.ts';
import { beginSpeechSession, createSpeechSessionState, invalidateSpeechSession, isCurrentSpeechSession, replayText } from '../promo/speech/session.ts';
import { createFaceController } from '../promo/face/controller.ts';

const faceDefaults = { expression: 'NEUTRAL', gaze: 'CENTER', idle: false, blinkRequest: 0, blinkPreview: null };

test('identical input generates an identical deterministic timeline', () => {
  const phrase = "You think you're ready? Then prove it.";
  assert.deepEqual(createVisemeTimeline(phrase), createVisemeTimeline(phrase));
});

test('phonetic groups map plosives, FV, vowels and combinations to the seven stable states', () => {
  assert.equal(visemeForGroup('M'), 'MBP');
  assert.equal(visemeForGroup('B'), 'MBP');
  assert.equal(visemeForGroup('P'), 'MBP');
  assert.equal(visemeForGroup('F'), 'FV');
  assert.equal(visemeForGroup('V'), 'FV');
  assert.equal(visemeForGroup('A'), 'AE');
  assert.equal(visemeForGroup('E'), 'AE');
  assert.equal(visemeForGroup('I'), 'AE');
  assert.equal(visemeForGroup('Y'), 'AE');
  assert.equal(visemeForGroup('O'), 'O');
  assert.equal(visemeForGroup('U'), 'O');
  assert.equal(visemeForGroup('L'), 'L');
  assert.equal(visemeForGroup('W'), 'WQ');
  assert.equal(visemeForGroup('Q'), 'WQ');
  for (const group of ['TH', 'SH', 'CH', 'PH', 'OO', 'EE', 'OU']) assert.notEqual(visemeForGroup(group), undefined);
  assert.deepEqual(phoneticGroups('Maybe'), ['M', 'A', 'Y', 'B', 'E']);
  assert.deepEqual(phoneticGroups('You'), ['YO', 'U']);
  assert.equal(visemeForGroup('YO'), 'WQ');
});

test('punctuation creates REST pauses and does not chew continuously', () => {
  const timeline = createVisemeTimeline('Fight, for every victory!');
  const pauses = timeline.filter(segment => segment.kind === 'pause');
  assert.ok(pauses.length >= 2);
  assert.ok(pauses.every(segment => segment.viseme === 'REST'));
  assert.ok(pauses.some(segment => segment.endMs - segment.startMs >= 250));
});

test('timeline timestamps are increasing, positive and rate-scaled', () => {
  const normal = createVisemeTimeline('I own every arena.', 0.92);
  const slow = createVisemeTimeline('I own every arena.', 0.6);
  assert.ok(normal.length > 0);
  for (const segment of normal) {
    assert.ok(segment.endMs > segment.startMs);
    assert.ok(segment.startMs >= 0);
  }
  for (let index = 1; index < normal.length; index++) assert.ok(normal[index].startMs >= normal[index - 1].endMs);
  assert.ok(timelineDuration(slow) > timelineDuration(normal));
});

test('empty, whitespace-only and punctuation-only inputs are safe', () => {
  assert.deepEqual(createVisemeTimeline(''), []);
  assert.deepEqual(createVisemeTimeline('   \n\t'), []);
  assert.ok(createVisemeTimeline('?!').every(segment => segment.viseme === 'REST'));
  assert.ok(createVisemeTimeline('Go.').length > 0);
});

test('maximum input remains bounded and preserves the seven-state mouth contract', () => {
  const timeline = createVisemeTimeline('a'.repeat(420));
  assert.ok(timelineDuration(timeline) <= MAX_TIMELINE_MS);
  assert.deepEqual(Object.keys(MOUTH_DEFORMATIONS).sort(), ['AE', 'FV', 'L', 'MBP', 'O', 'REST', 'WQ']);
  for (const mouth of Object.values(MOUTH_DEFORMATIONS)) assert.equal(isSafeMouthDeformation(mouth), true);
});

test('timeline ends in REST and returns safe mouth deformation after speech', () => {
  const timeline = createVisemeTimeline('Prove it.');
  assert.equal(segmentAt(timeline, timelineDuration(timeline) + 1), null);
  assert.deepEqual(timelineDeformation(null), REST_MOUTH);
  assert.deepEqual(deformationForViseme('REST'), REST_MOUTH);
});

test('face mouth channel blends articulation and snaps to REST for an immediate stop', () => {
  const controller = createFaceController(() => 0.5);
  controller.update(0, faceDefaults, { deformation: REST_MOUTH });
  const speaking = controller.update(0.1, faceDefaults, { deformation: MOUTH_DEFORMATIONS.AE });
  assert.ok(speaking.mouth.mouthOpen > 0);
  const stopped = controller.update(0.11, faceDefaults, { deformation: REST_MOUTH, immediate: true });
  assert.deepEqual(stopped.mouth, REST_MOUTH);
});

test('replay reads the last delivered script, not later textbox edits', () => {
  const state = createSpeechSessionState();
  beginSpeechSession(state, 'Delivered words.');
  const editedText = 'Undelivered edit.';
  assert.equal(replayText(state), 'Delivered words.');
  assert.notEqual(replayText(state), editedText);
});

test('stop invalidates the current speech session and stale callbacks cannot complete a newer one', () => {
  const state = createSpeechSessionState();
  const first = beginSpeechSession(state, 'First.');
  invalidateSpeechSession(state);
  assert.equal(isCurrentSpeechSession(state, first), false);
  const second = beginSpeechSession(state, 'Second.');
  assert.equal(isCurrentSpeechSession(state, first), false);
  assert.equal(isCurrentSpeechSession(state, second), true);
});
