import test from 'node:test';
import assert from 'node:assert/strict';
import { createPerformanceTimeline, finalPerformance, performanceAt } from '../promo/performance/timeline.ts';
import { createSpeechSessionState, beginSpeechSession, invalidateSpeechSession, isCurrentSpeechSession } from '../promo/speech/session.ts';

const short = "You really think you're ready for me? Then prove it.";
const long = "Maybe people believe promises, but I believe in showing up. Every time I enter this arena, I bring everything I have. You think you're ready for me? Then prove it. Fight for every victory, find your voice, and make every moment count. I will be here, ready for the challenge, when the lights come on again.";

test('same text and tone generate an identical performance timeline', () => {
  assert.deepEqual(createPerformanceTimeline(long, 'AUTO'), createPerformanceTimeline(long, 'AUTO'));
});

test('different tones create different performance choices', () => {
  const choices = ['AUTO', 'CONFIDENT', 'MOCKING', 'INTIMIDATING'].map(tone => JSON.stringify(createPerformanceTimeline(short, tone)));
  assert.ok(new Set(choices).size >= 3);
});

test('the final sentence or clause is marked final', () => {
  const timeline = createPerformanceTimeline(long);
  assert.equal(timeline.filter(beat => beat.finalBeat).length, 1);
  assert.match(timeline.at(-1).sentence, /again/i);
});

test('a strong final beat prefers CAMERA gaze', () => {
  const final = finalPerformance(createPerformanceTimeline(short, 'AUTO'));
  assert.equal(final?.gaze, 'CAMERA');
  assert.equal(final?.finalHold, true);
});

test('expression count stays bounded for a long promo', () => {
  const timeline = createPerformanceTimeline(long);
  assert.ok(timeline.length >= 3 && timeline.length <= 7);
  assert.ok(new Set(timeline.map(beat => beat.expression)).size <= 6);
});

test('beats do not flicker at one-word granularity', () => {
  const timeline = createPerformanceTimeline(long);
  assert.ok(timeline.every(beat => beat.endChar - beat.startChar >= 8));
});

test('question and challenge language changes AUTO performance', () => {
  const timeline = createPerformanceTimeline(short, 'AUTO');
  assert.equal(timeline[0].expression, 'SMIRK');
  assert.equal(timeline[0].gaze, 'INTERVIEWER');
  assert.equal(timeline.at(-1).expression, 'INTIMIDATING');
});

test('neutral declarative text remains restrained', () => {
  const timeline = createPerformanceTimeline('The room is quiet. The lights are warm.');
  assert.deepEqual(timeline.map(beat => beat.expression), ['NEUTRAL', 'SERIOUS']);
  assert.ok(timeline.every(beat => beat.intensity <= 0.64));
});

test('the 306-character promo generates valid ordered beats', () => {
  const timeline = createPerformanceTimeline(long, 'AUTO');
  for (let index = 1; index < timeline.length; index++) assert.ok(timeline[index].startChar > timeline[index - 1].startChar);
  assert.ok(timeline.every(beat => beat.startChar >= 0 && beat.endChar <= long.length));
});

test('performance timeline covers the complete input', () => {
  const timeline = createPerformanceTimeline(long);
  assert.equal(timeline[0].startChar, 0);
  assert.equal(timeline.at(-1).endChar, long.length);
});

test('speech boundary progress activates the corresponding beat', () => {
  const timeline = createPerformanceTimeline(short, 'AUTO');
  assert.equal(performanceAt(timeline, timeline[0].startChar)?.beatIndex, 0);
  assert.equal(performanceAt(timeline, timeline.at(-1).startChar)?.beatIndex, timeline.length - 1);
});

test('stale speech sessions cannot activate old performance beats', () => {
  const sessions = createSpeechSessionState();
  const first = beginSpeechSession(sessions, short);
  invalidateSpeechSession(sessions);
  const second = beginSpeechSession(sessions, long);
  assert.equal(isCurrentSpeechSession(sessions, first), false);
  assert.equal(isCurrentSpeechSession(sessions, second), true);
  assert.equal(isCurrentSpeechSession(sessions, first) ? performanceAt(createPerformanceTimeline(short), 0)?.sentence : null, null);
});

test('STOP clears active performance safely', () => {
  const sessions = createSpeechSessionState();
  beginSpeechSession(sessions, long);
  invalidateSpeechSession(sessions);
  assert.equal(sessions.activeId, null);
});

test('REPLAY recreates the same performance timeline', () => {
  assert.deepEqual(createPerformanceTimeline(short, 'MOCKING'), createPerformanceTimeline(short, 'MOCKING'));
});

test('final hold preserves final expression after the mouth returns REST', () => {
  const final = finalPerformance(createPerformanceTimeline(short, 'CONFIDENT'));
  assert.equal(final?.finalHold, true);
  assert.equal(final?.expression, 'CONFIDENT');
  assert.equal(final?.gaze, 'CAMERA');
  assert.ok((final?.beat.holdMs ?? 0) >= 1500);
});
