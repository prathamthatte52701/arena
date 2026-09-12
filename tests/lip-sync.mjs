import test from 'node:test';
import assert from 'node:assert/strict';
import { MOUTH_DEFORMATIONS, REST_MOUTH, deformationForViseme, isSafeMouthDeformation } from '../promo/face/mouth.ts';
import { createVisemeTimeline, segmentAt, timelineDeformation, timelineDuration } from '../promo/speech/textTimeline.ts';
import { normalizeLipSyncToken, phoneticGroups, visemeForGroup } from '../promo/speech/visemes.ts';
import { MAX_TIMELINE_MS } from '../promo/speech/timing.ts';
import { beginSpeechSession, createSpeechSessionState, invalidateSpeechSession, isCurrentSpeechSession, replayText } from '../promo/speech/session.ts';
import { advanceSpeechClock, applySpeechBoundaryAnchor } from '../promo/speech/clock.ts';
import { createFaceController } from '../promo/face/controller.ts';

const faceDefaults = { expression: 'NEUTRAL', gaze: 'CENTER', idle: false, blinkRequest: 0, blinkPreview: null };

test('identical input generates an identical deterministic timeline', () => {
  const phrase = "You think you're ready? Then prove it.";
  assert.deepEqual(createVisemeTimeline(phrase), createVisemeTimeline(phrase));
});

test('ordinary consonants and apostrophes never create silence inside words', () => {
  const timeline = createVisemeTimeline("You think you're ready for me? Then prove it. T D N R S Z K G H J C X");
  assert.ok(timeline.filter(segment => segment.kind === 'articulation').every(segment => segment.viseme !== 'REST'));
  assert.equal(MOUTH_DEFORMATIONS.MBP.mouthOpen, 0);
});

test('adjacent words co-articulate without artificial long REST gaps', () => {
  const phrase = 'Maybe people believe promises, but I believe in showing up.';
  const timeline = createVisemeTimeline(phrase);
  const artificialGaps = timeline.filter(segment => segment.kind === 'pause' && segment.charEnd === segment.charStart + 1 && phrase[segment.charStart] === ' ');
  assert.equal(artificialGaps.length, 0);
  assert.ok(timeline.some(segment => segment.kind === 'pause' && segment.endMs - segment.startMs >= 140));
});

test('speech clock is monotonic and boundary anchors move it forward immediately', () => {
  const clock = { startedAt: 0, offsetMs: 0, targetOffsetMs: 0, lastSampleAt: 0, lastElapsedMs: 0, floorElapsedMs: 0 };
  const beforeAnchor = advanceSpeechClock(clock, 100);
  applySpeechBoundaryAnchor(clock, 900, 120, 2000);
  const anchored = advanceSpeechClock(clock, 130);
  const later = advanceSpeechClock(clock, 240);
  assert.ok(anchored >= 900);
  assert.ok(later >= anchored);
  assert.ok(anchored >= beforeAnchor);
});

test('calibrated fallback reaches final words across short, medium, long and near-max inputs', () => {
  const longPromo = "Maybe people believe promises, but I believe in showing up. Every time I enter this arena, I bring everything I have. You think you're ready for me? Then prove it. Fight for every victory, find your voice, and make every moment count. I will be here, ready for the challenge, when the lights come on again.";
  const inputs = [
    "You think you're ready for me? Then prove it.",
    'Every fight starts with a choice, and I choose to stand tall when the room gets quiet.',
    longPromo,
    'a'.repeat(420),
  ];
  for (const text of inputs) {
    const timeline = createVisemeTimeline(text);
    assert.ok(timelineDuration(timeline) > 0);
    assert.ok(segmentAt(timeline, timelineDuration(timeline) - 1)?.kind === 'articulation' || timeline.at(-1)?.kind === 'pause');
  }
  const finalWords = [];
  for (const segment of createVisemeTimeline(longPromo).filter(segment => segment.kind === 'articulation')) {
    if (finalWords.at(-1) !== segment.word) finalWords.push(segment.word);
  }
  const finalSection = finalWords.slice(finalWords.lastIndexOf('ready'));
  assert.deepEqual(finalSection, ['ready', 'for', 'the', 'challenge', 'when', 'the', 'lights', 'come', 'on', 'again']);
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

test('accented Latin text articulates through a deterministic internal fold', () => {
  assert.equal(normalizeLipSyncToken('Café'), 'Cafe');
  assert.equal(normalizeLipSyncToken('Beyoncé'), 'Beyonce');
  assert.equal(normalizeLipSyncToken('José'), 'Jose');
  assert.equal(normalizeLipSyncToken('naïve'), 'naive');
  assert.equal(normalizeLipSyncToken('smörgåsbord'), 'smorgasbord');
  assert.equal(normalizeLipSyncToken('Łódź'), 'Lodz');
  for (const source of ['Café', 'Beyoncé', 'José', 'naïve', 'smörgåsbord', 'Łódź']) {
    const timeline = createVisemeTimeline(source);
    assert.ok(timeline.some(segment => segment.kind === 'articulation'), `${source} must articulate`);
  }
});

test('unsupported non-Latin scripts remain REST-safe while mixed English still articulates', () => {
  for (const source of ['नमस्ते', '你好', 'مرحبا']) {
    assert.ok(createVisemeTimeline(source).every(segment => segment.viseme === 'REST'));
  }
  const mixed = createVisemeTimeline('Rhea 🔥 owns this arena.');
  assert.ok(mixed.some(segment => segment.kind === 'articulation'));
  assert.ok(mixed.some(segment => segment.kind === 'pause'));
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
