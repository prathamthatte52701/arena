'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { REST_MOUTH, type MouthTarget, type Viseme } from '../face/mouth.ts';
import { createVisemeTimeline, segmentAt, timelineDeformation, timelineDuration, type TimelineSegment } from '../speech/textTimeline.ts';
import { DEFAULT_SPEECH_RATE } from '../speech/timing.ts';
import { beginSpeechSession, createSpeechSessionState, invalidateSpeechSession, isCurrentSpeechSession } from '../speech/session.ts';
import { advanceSpeechClock, applySpeechBoundaryAnchor, type SpeechClockState } from '../speech/clock.ts';
import { createPerformanceTimeline, finalPerformance, performanceAt, type PerformanceFrame } from './timeline.ts';
import type { Expression, Gaze, Tone } from './types.ts';

export const SAMPLE_PROMO = "You really think you're ready for me? Then prove it.";
export const SAMPLE_LIP_SYNC_PHRASE = 'Maybe we prove who really belongs here.';
export type SpeechStatus = 'READY' | 'SPEAKING' | 'PAUSED' | 'STOPPED' | 'COMPLETE' | 'ERROR';
export interface SpeechDebug {
  word: string;
  viseme: Viseme;
  elapsedMs: number;
  timelinePosition: number;
  sessionId: number | null;
  sentence: string;
  beatIndex: number | null;
  expression: Expression;
  gaze: Gaze;
  intensity: number;
  headBias: { x: number; y: number };
  finalHold: boolean;
}

interface Runtime extends SpeechClockState {
  id: number;
  timeline: TimelineSegment[];
  performanceTimeline: ReturnType<typeof createPerformanceTimeline>;
  paused: boolean;
  pausedAt: number;
  started: boolean;
}

function preferredVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter(voice => voice.localService);
  const english = voices.filter(voice => /^en(?:-|_)/i.test(voice.lang));
  return english.find(voice => /microsoft|google|samantha|alex|daniel|david|english/i.test(voice.name)) ?? english[0] ?? voices[0];
}

export function usePromoSpeech() {
  const [text, setText] = useState(SAMPLE_PROMO);
  const [tone, setTone] = useState<Tone>('AUTO');
  const [status, setStatus] = useState<SpeechStatus>('READY');
  const [lastDeliveredText, setLastDeliveredText] = useState<string | null>(null);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debug, setDebug] = useState<SpeechDebug>({ word: '—', viseme: 'REST', elapsedMs: 0, timelinePosition: 0, sessionId: null, sentence: '—', beatIndex: null, expression: 'NEUTRAL', gaze: 'INTERVIEWER', intensity: 0, headBias: { x: 0, y: 0 }, finalHold: false });
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const sessions = useRef(createSpeechSessionState());
  const runtime = useRef<Runtime | null>(null);
  const debugLastUpdate = useRef(0);
  const lastDeliveredTone = useRef<Tone>('AUTO');
  const finalHold = useRef<{ until: number; performance: PerformanceFrame } | null>(null);
  const sampleCache = useRef<{ nowMs: number; sample: { deformation: MouthTarget['deformation']; performance: PerformanceFrame | null; elapsedMs: number; segment: TimelineSegment | null } | null } | null>(null);

  const cancelCurrent = useCallback((nextStatus: SpeechStatus | null, publish = true) => {
    const current = utterance.current;
    if (current) {
      current.onstart = null;
      current.onboundary = null;
      current.onend = null;
      current.onerror = null;
      current.onpause = null;
      current.onresume = null;
    }
    utterance.current = null;
    invalidateSpeechSession(sessions.current);
    runtime.current = null;
    finalHold.current = null;
    sampleCache.current = null;
    window.speechSynthesis?.cancel();
    if (publish) {
      setDebug({ word: '—', viseme: 'REST', elapsedMs: 0, timelinePosition: 0, sessionId: null, sentence: '—', beatIndex: null, expression: 'NEUTRAL', gaze: 'INTERVIEWER', intensity: 0, headBias: { x: 0, y: 0 }, finalHold: false });
      if (nextStatus) setStatus(nextStatus);
    }
  }, []);

  const speak = useCallback((source: string, remember: boolean, selectedTone: Tone) => {
    cancelCurrent(null);
    if (!source.trim()) {
      setStatus('READY');
      return;
    }
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setStatus('ERROR');
      return;
    }
    const previousLastDelivered = sessions.current.lastDeliveredText;
    const id = beginSpeechSession(sessions.current, source);
    if (!remember) sessions.current.lastDeliveredText = previousLastDelivered;
    const timeline = createVisemeTimeline(source, DEFAULT_SPEECH_RATE);
    const performanceTimeline = createPerformanceTimeline(source, selectedTone);
    const startedAt = window.performance.now();
    runtime.current = { id, timeline, performanceTimeline, startedAt, offsetMs: 0, targetOffsetMs: 0, lastSampleAt: startedAt, lastElapsedMs: 0, floorElapsedMs: 0, paused: false, pausedAt: 0, started: false };
    sampleCache.current = null;
    const speech = new SpeechSynthesisUtterance(source);
    speech.rate = DEFAULT_SPEECH_RATE;
    speech.pitch = 0.72;
    speech.volume = 1;
    const voice = preferredVoice();
    if (voice) speech.voice = voice;
    speech.onstart = () => {
      if (!isCurrentSpeechSession(sessions.current, id) || !runtime.current) return;
      const now = window.performance.now();
      runtime.current.startedAt = now;
      runtime.current.lastSampleAt = now;
      runtime.current.lastElapsedMs = 0;
      runtime.current.floorElapsedMs = 0;
      runtime.current.started = true;
      finalHold.current = null;
      console.debug('[promo-speech] onstart', JSON.stringify({ sessionId: id, wallMs: now }));
      setStatus('SPEAKING');
    };
    speech.onpause = () => {
      if (!isCurrentSpeechSession(sessions.current, id) || !runtime.current) return;
      runtime.current.paused = true;
      runtime.current.pausedAt = window.performance.now();
      setStatus('PAUSED');
    };
    speech.onresume = () => {
      if (!isCurrentSpeechSession(sessions.current, id) || !runtime.current) return;
      const resumedAt = window.performance.now();
      runtime.current.startedAt += resumedAt - runtime.current.pausedAt;
      runtime.current.lastSampleAt = resumedAt;
      runtime.current.paused = false;
      setStatus('SPEAKING');
    };
    speech.onboundary = event => {
      if (!isCurrentSpeechSession(sessions.current, id) || !runtime.current?.started || event.name !== 'word' || typeof event.charIndex !== 'number') return;
      const matchingSegment = runtime.current.timeline.find(segment => segment.kind === 'articulation' && segment.charStart <= event.charIndex && event.charIndex < segment.charEnd);
      const wordStart = matchingSegment
        ? runtime.current.timeline.find(segment => segment.kind === 'articulation' && segment.charStart === matchingSegment.charStart)
        : runtime.current.timeline.find(segment => segment.kind === 'articulation' && segment.charStart >= event.charIndex);
      if (!wordStart) return;
      const now = window.performance.now();
      const limit = timelineDuration(runtime.current.timeline);
      applySpeechBoundaryAnchor(runtime.current, wordStart.startMs, now, limit);
      console.debug('[promo-speech] boundary', JSON.stringify({ sessionId: id, name: event.name, charIndex: event.charIndex, wallMs: now, visualFloorMs: runtime.current.floorElapsedMs }));
    };
    speech.onend = () => {
      if (!isCurrentSpeechSession(sessions.current, id)) return;
      const now = window.performance.now();
      const final = runtime.current ? finalPerformance(runtime.current.performanceTimeline) : null;
      if (final) finalHold.current = { until: now + final.beat.holdMs, performance: final };
      sessions.current.activeId = null;
      runtime.current = null;
      utterance.current = null;
      sampleCache.current = null;
      console.debug('[promo-speech] onend', JSON.stringify({ sessionId: id, wallMs: now, finalHoldMs: final?.beat.holdMs ?? 0 }));
      setStatus('COMPLETE');
      if (final) setDebug({ word: '—', viseme: 'REST', elapsedMs: 0, timelinePosition: 1, sessionId: id, sentence: final.sentence, beatIndex: final.beatIndex, expression: final.expression, gaze: 'CAMERA', intensity: final.intensity, headBias: final.headBias, finalHold: true });
    };
    speech.onerror = event => {
      if (!isCurrentSpeechSession(sessions.current, id) || event.error === 'canceled') return;
      sessions.current.activeId = null;
      runtime.current = null;
      utterance.current = null;
      setStatus('ERROR');
    };
    utterance.current = speech;
    if (remember) {
      sessions.current.lastDeliveredText = source;
      setLastDeliveredText(source);
      lastDeliveredTone.current = selectedTone;
    }
    setStatus('READY');
    window.speechSynthesis.speak(speech);
  }, [cancelCurrent]);

  const deliver = useCallback(() => speak(text, true, tone), [speak, text, tone]);
  const replay = useCallback(() => {
    const last = sessions.current.lastDeliveredText;
    if (last) speak(last, true, lastDeliveredTone.current);
  }, [speak]);
  const stop = useCallback(() => cancelCurrent('STOPPED'), [cancelCurrent]);
  const speakPreview = useCallback((source: string) => speak(source, false, tone), [speak, tone]);

  const sampleSpeech = useCallback((nowMs: number) => {
    if (sampleCache.current?.nowMs === nowMs) return sampleCache.current.sample;
    const active = runtime.current;
    if (!active || !active.timeline.length || !isCurrentSpeechSession(sessions.current, active.id) || !active.started) {
      sampleCache.current = { nowMs, sample: null };
      return null;
    }
    const elapsedMs = active.paused ? active.lastElapsedMs : advanceSpeechClock(active, nowMs);
    const segment = segmentAt(active.timeline, elapsedMs);
    const performance = performanceAt(active.performanceTimeline, segment?.charStart ?? (elapsedMs >= timelineDuration(active.timeline) ? Number.MAX_SAFE_INTEGER : 0));
    if (debugEnabled && nowMs - debugLastUpdate.current >= 80) {
      debugLastUpdate.current = nowMs;
      setDebug({ word: segment?.word || '—', viseme: segment?.viseme ?? 'REST', elapsedMs: Math.round(elapsedMs), timelinePosition: timelineDuration(active.timeline) ? Math.min(1, elapsedMs / timelineDuration(active.timeline)) : 0, sessionId: active.id, sentence: performance?.sentence ?? '—', beatIndex: performance?.beatIndex ?? null, expression: performance?.expression ?? 'NEUTRAL', gaze: performance?.gaze ?? 'INTERVIEWER', intensity: performance?.intensity ?? 0, headBias: performance?.headBias ?? { x: 0, y: 0 }, finalHold: false });
    }
    const sample = { deformation: timelineDeformation(segment), performance, elapsedMs, segment };
    sampleCache.current = { nowMs, sample };
    return sample;
  }, [debugEnabled]);

  const sampleMouth = useCallback((nowMs: number): MouthTarget => {
    const sample = sampleSpeech(nowMs);
    if (!sample) return { deformation: REST_MOUTH, immediate: true };
    const active = runtime.current;
    return { deformation: sample.deformation, immediate: !active || active.paused || !sample.segment || (sample.segment.kind === 'pause' && sample.elapsedMs - sample.segment.startMs >= 100) };
  }, [sampleSpeech]);

  const samplePerformance = useCallback((nowMs: number) => {
    const sample = sampleSpeech(nowMs);
    if (sample?.performance) return sample.performance;
    const hold = finalHold.current;
    if (hold && nowMs < hold.until) return hold.performance;
    if (hold) finalHold.current = null;
    return null;
  }, [sampleSpeech]);

  useEffect(() => () => cancelCurrent(null, false), [cancelCurrent]);
  return { text, setText, tone, setTone, status, lastDeliveredText, deliver, replay, stop, speakPreview, sampleMouth, samplePerformance, debugEnabled, setDebugEnabled, debug };
}
