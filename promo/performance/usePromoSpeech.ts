'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { REST_MOUTH, type MouthTarget, type Viseme } from '../face/mouth.ts';
import { createVisemeTimeline, segmentAt, timelineDeformation, timelineDuration, type TimelineSegment } from '../speech/textTimeline.ts';
import { DEFAULT_SPEECH_RATE } from '../speech/timing.ts';
import { beginSpeechSession, createSpeechSessionState, invalidateSpeechSession, isCurrentSpeechSession } from '../speech/session.ts';
import { advanceSpeechClock, applySpeechBoundaryAnchor, type SpeechClockState } from '../speech/clock.ts';
import { createPerformanceTimeline, finalPerformance, performanceAt, type PerformanceFrame } from './timeline.ts';
import { calibrateVisemeTimeline, createTtsRequest, monotonicAudioElapsed } from '../voice/pipeline.ts';
import { createReplayMemory } from '../voice/replay.ts';
import { measuredAudioDuration } from '../voice/audioMetadata.ts';
import type { Expression, Gaze, Tone } from './types.ts';

export const SAMPLE_PROMO = "You really think you're ready for me? Then prove it.";
export const SAMPLE_LIP_SYNC_PHRASE = 'Maybe we prove who really belongs here.';
export type SpeechStatus = 'READY' | 'GENERATING' | 'SPEAKING' | 'PAUSED' | 'STOPPED' | 'COMPLETE' | 'ERROR';
export type VoiceEngine = 'LOCAL NEURAL' | 'BROWSER FALLBACK';
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
  audio: HTMLAudioElement | null;
  objectUrl: string | null;
  generatedDurationMs: number;
  engine: VoiceEngine;
  lastAudioElapsedMs: number;
  paused: boolean;
  pausedAt: number;
  started: boolean;
}

const EMPTY_DEBUG: SpeechDebug = { word: '—', viseme: 'REST', elapsedMs: 0, timelinePosition: 0, sessionId: null, sentence: '—', beatIndex: null, expression: 'NEUTRAL', gaze: 'INTERVIEWER', intensity: 0, headBias: { x: 0, y: 0 }, finalHold: false };

function preferredVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter(voice => voice.localService);
  const english = voices.filter(voice => /^en(?:-|_)/i.test(voice.lang));
  return english.find(voice => /microsoft|google|samantha|alex|daniel|david|english/i.test(voice.name)) ?? english[0] ?? voices[0];
}

function releaseAudio(audio: HTMLAudioElement | null, objectUrl: string | null) {
  if (!audio) return;
  audio.onplay = null;
  audio.onplaying = null;
  audio.onpause = null;
  audio.onended = null;
  audio.onerror = null;
  audio.pause();
  audio.currentTime = 0;
  audio.removeAttribute('src');
  audio.load();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
}

export function usePromoSpeech() {
  const [text, setText] = useState(SAMPLE_PROMO);
  const [tone, setTone] = useState<Tone>('AUTO');
  const [status, setStatus] = useState<SpeechStatus>('READY');
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>('LOCAL NEURAL');
  const [generatedDurationMs, setGeneratedDurationMs] = useState<number | null>(null);
  const [lastDeliveredText, setLastDeliveredText] = useState<string | null>(null);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debug, setDebug] = useState<SpeechDebug>(EMPTY_DEBUG);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const sessions = useRef(createSpeechSessionState());
  const runtime = useRef<Runtime | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const debugLastUpdate = useRef(0);
  const delivered = useRef(createReplayMemory());
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
    abortController.current?.abort();
    abortController.current = null;
    releaseAudio(runtime.current?.audio ?? null, runtime.current?.objectUrl ?? null);
    invalidateSpeechSession(sessions.current);
    runtime.current = null;
    finalHold.current = null;
    sampleCache.current = null;
    window.speechSynthesis?.cancel();
    if (publish) {
      setDebug(EMPTY_DEBUG);
      setGeneratedDurationMs(null);
      if (nextStatus) setStatus(nextStatus);
    }
  }, []);

  const finishSpeech = useCallback((id: number) => {
    if (!isCurrentSpeechSession(sessions.current, id)) return;
    const now = window.performance.now();
    const active = runtime.current;
    const final = active ? finalPerformance(active.performanceTimeline) : null;
    if (final) finalHold.current = { until: now + final.beat.holdMs, performance: final };
    releaseAudio(active?.audio ?? null, active?.objectUrl ?? null);
    sessions.current.activeId = null;
    runtime.current = null;
    utterance.current = null;
    abortController.current = null;
    sampleCache.current = null;
    console.debug('[promo-voice] playback-end', JSON.stringify({ sessionId: id, engine: active?.engine ?? 'unknown', wallMs: now, durationMs: active?.generatedDurationMs ?? 0, finalHoldMs: final?.beat.holdMs ?? 0 }));
    setStatus('COMPLETE');
    if (final) setDebug({ word: '—', viseme: 'REST', elapsedMs: 0, timelinePosition: 1, sessionId: id, sentence: final.sentence, beatIndex: final.beatIndex, expression: final.expression, gaze: 'CAMERA', intensity: final.intensity, headBias: final.headBias, finalHold: true });
  }, []);

  const startBrowserFallback = useCallback((source: string, selectedTone: Tone) => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { setStatus('ERROR'); return; }
    const id = beginSpeechSession(sessions.current, source);
    const timeline = createVisemeTimeline(source, DEFAULT_SPEECH_RATE);
    const performanceTimeline = createPerformanceTimeline(source, selectedTone);
    const startedAt = window.performance.now();
    runtime.current = { id, timeline, performanceTimeline, audio: null, objectUrl: null, generatedDurationMs: timelineDuration(timeline), engine: 'BROWSER FALLBACK', lastAudioElapsedMs: 0, startedAt, offsetMs: 0, targetOffsetMs: 0, lastSampleAt: startedAt, lastElapsedMs: 0, floorElapsedMs: 0, paused: false, pausedAt: 0, started: false };
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
      console.debug('[promo-voice] fallback-start', JSON.stringify({ sessionId: id, wallMs: now }));
      setStatus('SPEAKING');
    };
    speech.onboundary = event => {
      if (!isCurrentSpeechSession(sessions.current, id) || !runtime.current?.started || event.name !== 'word' || typeof event.charIndex !== 'number') return;
      const matchingSegment = runtime.current.timeline.find(segment => segment.kind === 'articulation' && segment.charStart <= event.charIndex && event.charIndex < segment.charEnd);
      const wordStart = matchingSegment ? runtime.current.timeline.find(segment => segment.kind === 'articulation' && segment.charStart === matchingSegment.charStart) : runtime.current.timeline.find(segment => segment.kind === 'articulation' && segment.charStart >= event.charIndex);
      if (!wordStart) return;
      const now = window.performance.now();
      const limit = timelineDuration(runtime.current.timeline);
      applySpeechBoundaryAnchor(runtime.current, wordStart.startMs, now, limit);
      console.debug('[promo-voice] fallback-boundary', JSON.stringify({ sessionId: id, charIndex: event.charIndex, wallMs: now, visualFloorMs: runtime.current.floorElapsedMs }));
    };
    speech.onpause = () => { if (isCurrentSpeechSession(sessions.current, id) && runtime.current) { runtime.current.paused = true; runtime.current.pausedAt = window.performance.now(); setStatus('PAUSED'); } };
    speech.onresume = () => { if (isCurrentSpeechSession(sessions.current, id) && runtime.current) { const resumedAt = window.performance.now(); runtime.current.startedAt += resumedAt - runtime.current.pausedAt; runtime.current.lastSampleAt = resumedAt; runtime.current.paused = false; setStatus('SPEAKING'); } };
    speech.onend = () => finishSpeech(id);
    speech.onerror = event => { if (!isCurrentSpeechSession(sessions.current, id) || event.error === 'canceled') return; sessions.current.activeId = null; runtime.current = null; utterance.current = null; setStatus('ERROR'); };
    utterance.current = speech;
    setStatus('READY');
    window.speechSynthesis.speak(speech);
  }, [finishSpeech]);

  const speak = useCallback(async (source: string, remember: boolean, selectedTone: Tone) => {
    cancelCurrent(null);
    if (!source.trim()) { setStatus('READY'); return; }
    let requestData;
    try { requestData = createTtsRequest(source, selectedTone); } catch { setStatus('ERROR'); return; }
    if (remember) {
      delivered.current.remember(source, selectedTone);
      setLastDeliveredText(source);
    }
    const id = beginSpeechSession(sessions.current, source);
    const timeline = createVisemeTimeline(source, DEFAULT_SPEECH_RATE);
    const performanceTimeline = createPerformanceTimeline(source, selectedTone);
    const startedAt = window.performance.now();
    runtime.current = { id, timeline, performanceTimeline, audio: null, objectUrl: null, generatedDurationMs: 0, engine: 'LOCAL NEURAL', lastAudioElapsedMs: 0, startedAt, offsetMs: 0, targetOffsetMs: 0, lastSampleAt: startedAt, lastElapsedMs: 0, floorElapsedMs: 0, paused: false, pausedAt: 0, started: false };
    finalHold.current = null;
    sampleCache.current = null;
    setVoiceEngine('LOCAL NEURAL');
    setGeneratedDurationMs(null);
    setStatus('GENERATING');
    const controller = new AbortController();
    abortController.current = controller;
    try {
      const response = await fetch('/api/promo-voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: requestData.text, tone: requestData.tone }), signal: controller.signal });
      if (!response.ok) throw new Error(`Local neural voice unavailable (${response.status})`);
      const blob = await response.blob();
      if (!isCurrentSpeechSession(sessions.current, id) || controller.signal.aborted || !runtime.current) return;
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(blob);
      audio.preload = 'auto';
      audio.src = objectUrl;
      const active = runtime.current;
      active.audio = audio;
      active.objectUrl = objectUrl;
      active.engine = 'LOCAL NEURAL';
      audio.onplaying = () => {
        if (!isCurrentSpeechSession(sessions.current, id) || !runtime.current) return;
        runtime.current.started = true;
        runtime.current.paused = false;
        finalHold.current = null;
        console.debug('[promo-voice] audio-start', JSON.stringify({ sessionId: id, engine: 'LOCAL NEURAL', durationMs: runtime.current.generatedDurationMs }));
        setStatus('SPEAKING');
      };
      audio.onpause = () => { if (isCurrentSpeechSession(sessions.current, id) && runtime.current && !audio.ended) { runtime.current.paused = true; setStatus('PAUSED'); } };
      audio.onended = () => finishSpeech(id);
      audio.onerror = () => { if (isCurrentSpeechSession(sessions.current, id)) { console.error('[promo-voice] generated audio playback failed'); cancelCurrent(null, false); setVoiceEngine('BROWSER FALLBACK'); startBrowserFallback(source, selectedTone); } };
      const duration = await measuredAudioDuration(audio, controller.signal);
      if (!isCurrentSpeechSession(sessions.current, id) || controller.signal.aborted || !runtime.current) return;
      runtime.current.generatedDurationMs = duration;
      runtime.current.timeline = calibrateVisemeTimeline(runtime.current.timeline, duration);
      setGeneratedDurationMs(duration);
      await audio.play();
    } catch (error) {
      if (!isCurrentSpeechSession(sessions.current, id) || controller.signal.aborted) return;
      console.warn('[promo-voice] using explicit browser fallback', error);
      cancelCurrent(null, false);
      setVoiceEngine('BROWSER FALLBACK');
      startBrowserFallback(source, selectedTone);
    }
  }, [cancelCurrent, startBrowserFallback, finishSpeech]);

  const deliver = useCallback(() => { void speak(text, true, tone); }, [speak, text, tone]);
  const replay = useCallback(() => { const last = delivered.current.read(); if (last) void speak(last.text, false, last.tone); }, [speak]);
  const stop = useCallback(() => cancelCurrent('STOPPED'), [cancelCurrent]);
  const speakPreview = useCallback((source: string) => { void speak(source, false, tone); }, [speak, tone]);

  const sampleSpeech = useCallback((nowMs: number) => {
    if (sampleCache.current?.nowMs === nowMs) return sampleCache.current.sample;
    const active = runtime.current;
    if (!active || !active.timeline.length || !isCurrentSpeechSession(sessions.current, active.id) || !active.started) { sampleCache.current = { nowMs, sample: null }; return null; }
    const elapsedMs = active.engine === 'LOCAL NEURAL' && active.audio ? monotonicAudioElapsed(active.lastAudioElapsedMs, active.audio.currentTime, active.generatedDurationMs || timelineDuration(active.timeline)) : active.paused ? active.lastElapsedMs : advanceSpeechClock(active, nowMs);
    if (active.engine === 'LOCAL NEURAL') active.lastAudioElapsedMs = elapsedMs;
    const segment = segmentAt(active.timeline, elapsedMs);
    const performance = performanceAt(active.performanceTimeline, segment?.charStart ?? (elapsedMs >= timelineDuration(active.timeline) ? Number.MAX_SAFE_INTEGER : 0));
    if (debugEnabled && nowMs - debugLastUpdate.current >= 80) {
      debugLastUpdate.current = nowMs;
      const duration = active.generatedDurationMs || timelineDuration(active.timeline);
      setDebug({ word: segment?.word || '—', viseme: segment?.viseme ?? 'REST', elapsedMs: Math.round(elapsedMs), timelinePosition: duration ? Math.min(1, elapsedMs / duration) : 0, sessionId: active.id, sentence: performance?.sentence ?? '—', beatIndex: performance?.beatIndex ?? null, expression: performance?.expression ?? 'NEUTRAL', gaze: performance?.gaze ?? 'INTERVIEWER', intensity: performance?.intensity ?? 0, headBias: performance?.headBias ?? { x: 0, y: 0 }, finalHold: false });
    }
    const sample = { deformation: timelineDeformation(segment), performance, elapsedMs, segment };
    sampleCache.current = { nowMs, sample };
    return sample;
  }, [debugEnabled]);

  const sampleMouth = useCallback((nowMs: number): MouthTarget => {
    const sample = sampleSpeech(nowMs);
    if (!sample || runtime.current?.paused) return { deformation: REST_MOUTH, immediate: true };
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
  return { text, setText, tone, setTone, status, voiceEngine, generatedDurationMs, lastDeliveredText, deliver, replay, stop, speakPreview, sampleMouth, samplePerformance, debugEnabled, setDebugEnabled, debug };
}
