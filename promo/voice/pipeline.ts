import type { TimelineSegment } from '../speech/textTimeline.ts';
import { timelineDuration } from '../speech/textTimeline.ts';
import { DARK_POWER_VOICE_PROFILE, type VoiceTone, voiceToneSettings } from './darkPowerVoiceProfile.ts';

export const MAX_PROMO_TEXT = 420;

export interface TtsRequest {
  text: string;
  tone: VoiceTone;
  profileVersion: string;
  model: string;
  settings: ReturnType<typeof voiceToneSettings>;
}

export function createTtsRequest(text: string, tone: VoiceTone): TtsRequest {
  if (!text.trim()) throw new Error('Promo text is empty');
  if (text.length > MAX_PROMO_TEXT) throw new Error(`Promo text exceeds ${MAX_PROMO_TEXT} characters`);
  return { text, tone, profileVersion: DARK_POWER_VOICE_PROFILE.version, model: DARK_POWER_VOICE_PROFILE.model, settings: voiceToneSettings(tone) };
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
  const actual = Math.max(0, Math.min(durationMs, currentTimeSeconds * 1000));
  return Math.max(previousMs, actual);
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
