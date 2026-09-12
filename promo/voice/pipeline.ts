import type { TimelineSegment } from '../speech/textTimeline.ts';
import { timelineDuration } from '../speech/textTimeline.ts';
import { DARK_POWER_VOICE_PROFILE, isVoiceTone, type VoiceTone, voiceToneSettings } from './darkPowerVoiceProfile.ts';

export const MAX_PROMO_TEXT = 420;
export const PIPER_SYNTHESIS_TIMEOUT_MS = 30_000;

export type VoiceRequestParseResult =
  | { ok: true; request: TtsRequest }
  | { ok: false; error: string };

export function writePiperText(stdin: { end(text: string, encoding: 'utf8'): unknown }, text: string) {
  stdin.end(text, 'utf8');
}

export function voiceCacheIdentity(text: string, tone: VoiceTone): string {
  const request = createTtsRequest(text, tone);
  return JSON.stringify([request.profileVersion, request.model, request.tone, request.text]);
}

export interface TtsRequest {
  text: string;
  tone: VoiceTone;
  profileVersion: string;
  model: string;
  settings: ReturnType<typeof voiceToneSettings>;
}

export function createTtsRequest(text: string, tone: VoiceTone): TtsRequest {
  if (!isVoiceTone(tone)) throw new Error('Invalid voice tone');
  if (typeof text !== 'string') throw new Error('Invalid promo text');
  if (!text.trim()) throw new Error('Promo text is empty');
  if (text.length > MAX_PROMO_TEXT) throw new Error(`Promo text exceeds ${MAX_PROMO_TEXT} characters`);
  return { text, tone, profileVersion: DARK_POWER_VOICE_PROFILE.version, model: DARK_POWER_VOICE_PROFILE.model, settings: voiceToneSettings(tone) };
}

export function parseVoiceRequestBody(body: unknown): VoiceRequestParseResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Invalid JSON body' };
  const value = body as { text?: unknown; tone?: unknown };
  if (!isVoiceTone(value.tone)) return { ok: false, error: 'Invalid voice tone' };
  if (typeof value.text !== 'string' || !value.text.trim() || value.text.length > MAX_PROMO_TEXT) {
    return { ok: false, error: `Text must be 1-${MAX_PROMO_TEXT} characters` };
  }
  return { ok: true, request: createTtsRequest(value.text, value.tone) };
}

export function calibrateVisemeTimeline(timeline: TimelineSegment[], generatedDurationMs: number): TimelineSegment[] {
  if (!timeline.length || !Number.isFinite(generatedDurationMs) || generatedDurationMs <= 0) return timeline;
  const sourceDuration = timelineDuration(timeline);
  if (!sourceDuration) return timeline;
  const scale = generatedDurationMs / sourceDuration;
  return timeline.map(segment => ({
    ...segment,
    startMs: Math.round(segment.startMs * scale),
    endMs: Math.max(Math.round(segment.startMs * scale) + 1, Math.round(segment.endMs * scale)),
  }));
}

export function monotonicAudioElapsed(previousMs: number, currentTimeSeconds: number, durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 0;
  const previous = Number.isFinite(previousMs) ? previousMs : 0;
  const actual = Number.isFinite(currentTimeSeconds) ? currentTimeSeconds * 1000 : previous;
  return Math.min(durationMs, Math.max(0, previous, actual));
}

export function wavDurationMs(wav: Uint8Array): number {
  if (wav.length < 44 || String.fromCharCode(...wav.slice(0, 4)) !== 'RIFF' || String.fromCharCode(...wav.slice(8, 12)) !== 'WAVE') return 0;
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bits = 0;
  let dataBytes = 0;
  while (offset + 8 <= wav.length) {
    const chunk = String.fromCharCode(...wav.slice(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (offset + 8 + size > wav.length) return 0;
    if (chunk === 'fmt ' && size >= 16) {
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bits = view.getUint16(offset + 22, true);
    }
    if (chunk === 'data') dataBytes = size;
    offset += 8 + size + (size % 2);
  }
  const bytesPerSecond = sampleRate * channels * (bits / 8);
  return bytesPerSecond > 0 ? Math.round((dataBytes / bytesPerSecond) * 1000) : 0;
}
