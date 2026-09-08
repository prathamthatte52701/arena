'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { REST_MOUTH, type MouthTarget, type Viseme } from '../face/mouth.ts';
import { createVisemeTimeline, segmentAt, timelineDeformation, timelineDuration, type TimelineSegment } from '../speech/textTimeline.ts';
import { DEFAULT_SPEECH_RATE } from '../speech/timing.ts';
import { beginSpeechSession, createSpeechSessionState, invalidateSpeechSession, isCurrentSpeechSession } from '../speech/session.ts';

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

interface Runtime {
  id: number;
  timeline: TimelineSegment[];
  startedAt: number;
  offsetMs: number;
  targetOffsetMs: number;
  lastSampleAt: number;
  paused: boolean;
  pausedAt: number;
}

function preferredVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
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

  const cancelCurrent = useCallback((nextStatus: SpeechStatus | null) => {
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
    setDebug({ word: '—', viseme: 'REST', elapsedMs: 0, timelinePosition: 0, sessionId: null });
    if (nextStatus) setStatus(nextStatus);
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
    runtime.current = { id, timeline, startedAt, offsetMs: 0, targetOffsetMs: 0, lastSampleAt: startedAt, paused: false, pausedAt: 0 };
    const speech = new SpeechSynthesisUtterance(source);
    speech.rate = DEFAULT_SPEECH_RATE;
    speech.pitch = 0.72;
    speech.volume = 1;
    const voice = preferredVoice();
    if (voice) speech.voice = voice;
    speech.onstart = () => { if (isCurrentSpeechSession(sessions.current, id)) setStatus('SPEAKING'); };
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
      if (!isCurrentSpeechSession(sessions.current, id) || !runtime.current || typeof event.charIndex !== 'number') return;
      const wordStart = runtime.current.timeline.find(segment => segment.kind === 'articulation' && segment.charStart >= event.charIndex);
      if (!wordStart) return;
      const elapsed = window.performance.now() - runtime.current.startedAt;
      runtime.current.targetOffsetMs = Math.max(-1000, Math.min(1000, wordStart.startMs - elapsed));
    };
    speech.onend = () => {
      if (!isCurrentSpeechSession(sessions.current, id)) return;
      sessions.current.activeId = null;
      runtime.current = null;
      utterance.current = null;
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
    setStatus('SPEAKING');
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
    if (active.paused) return { deformation: REST_MOUTH, immediate: true };
    const dt = Math.max(0, nowMs - active.lastSampleAt);
    active.lastSampleAt = nowMs;
    active.offsetMs += (active.targetOffsetMs - active.offsetMs) * (1 - Math.exp(-dt / 180));
    const elapsedMs = Math.max(0, nowMs - active.startedAt + active.offsetMs);
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
    return { deformation: timelineDeformation(segment) };
  }, [debugEnabled]);

  useEffect(() => () => cancelCurrent(null), [cancelCurrent]);
  return { text, setText, status, lastDeliveredText, deliver, replay, stop, speakPreview, sampleMouth, debugEnabled, setDebugEnabled, debug };
}
