'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { REST_MOUTH, type MouthTarget, type Viseme } from '../face/mouth.ts';
import { createVisemeTimeline, segmentAt, timelineDeformation, timelineDuration, type TimelineSegment } from '../speech/textTimeline.ts';
import { DEFAULT_SPEECH_RATE } from '../speech/timing.ts';
import { beginSpeechSession, createSpeechSessionState, invalidateSpeechSession, isCurrentSpeechSession } from '../speech/session.ts';
import { advanceSpeechClock, applySpeechBoundaryAnchor, type SpeechClockState } from '../speech/clock.ts';

export const SAMPLE_PROMO = "You really think you're ready for me? Then prove it.";
export const SAMPLE_LIP_SYNC_PHRASE = 'Maybe we prove who really belongs here.';
export type SpeechStatus = 'READY' | 'SPEAKING' | 'PAUSED' | 'STOPPED' | 'COMPLETE' | 'ERROR';
export interface SpeechDebug {
  word: string;
  viseme: Viseme;
  elapsedMs: number;
  timelinePosition: number;
  sessionId: number | null;
}

interface Runtime extends SpeechClockState {
  id: number;
  timeline: TimelineSegment[];
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
  const [status, setStatus] = useState<SpeechStatus>('READY');
  const [lastDeliveredText, setLastDeliveredText] = useState<string | null>(null);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debug, setDebug] = useState<SpeechDebug>({ word: '—', viseme: 'REST', elapsedMs: 0, timelinePosition: 0, sessionId: null });
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const sessions = useRef(createSpeechSessionState());
  const runtime = useRef<Runtime | null>(null);
  const debugLastUpdate = useRef(0);

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
    window.speechSynthesis?.cancel();
    if (publish) {
      setDebug({ word: '—', viseme: 'REST', elapsedMs: 0, timelinePosition: 0, sessionId: null });
      if (nextStatus) setStatus(nextStatus);
    }
  }, []);

  const speak = useCallback((source: string, remember: boolean) => {
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
    const startedAt = window.performance.now();
    runtime.current = { id, timeline, startedAt, offsetMs: 0, targetOffsetMs: 0, lastSampleAt: startedAt, lastElapsedMs: 0, floorElapsedMs: 0, paused: false, pausedAt: 0, started: false };
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
      sessions.current.activeId = null;
      runtime.current = null;
      utterance.current = null;
      console.debug('[promo-speech] onend', JSON.stringify({ sessionId: id, wallMs: window.performance.now() }));
      setStatus('COMPLETE');
      setDebug({ word: '—', viseme: 'REST', elapsedMs: 0, timelinePosition: 1, sessionId: id });
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
    }
    setStatus('READY');
    window.speechSynthesis.speak(speech);
  }, [cancelCurrent]);

  const deliver = useCallback(() => speak(text, true), [speak, text]);
  const replay = useCallback(() => {
    const last = sessions.current.lastDeliveredText;
    if (last) speak(last, true);
  }, [speak]);
  const stop = useCallback(() => cancelCurrent('STOPPED'), [cancelCurrent]);
  const speakPreview = useCallback((source: string) => speak(source, false), [speak]);

  const sampleMouth = useCallback((nowMs: number): MouthTarget => {
    const active = runtime.current;
    if (!active || !active.timeline.length || !isCurrentSpeechSession(sessions.current, active.id)) return { deformation: REST_MOUTH, immediate: true };
    if (!active.started || active.paused) return { deformation: REST_MOUTH, immediate: true };
    const elapsedMs = advanceSpeechClock(active, nowMs);
    const segment = segmentAt(active.timeline, elapsedMs);
    const duration = timelineDuration(active.timeline);
    if (debugEnabled && nowMs - debugLastUpdate.current >= 80) {
      debugLastUpdate.current = nowMs;
      setDebug({
        word: segment?.word || '—',
        viseme: segment?.viseme ?? 'REST',
        elapsedMs: Math.round(elapsedMs),
        timelinePosition: duration ? Math.min(1, elapsedMs / duration) : 0,
        sessionId: active.id,
      });
    }
    return { deformation: timelineDeformation(segment), immediate: !segment || (segment.kind === 'pause' && elapsedMs - segment.startMs >= 100) };
  }, [debugEnabled]);

  useEffect(() => () => cancelCurrent(null, false), [cancelCurrent]);
  return { text, setText, status, lastDeliveredText, deliver, replay, stop, speakPreview, sampleMouth, debugEnabled, setDebugEnabled, debug };
}
