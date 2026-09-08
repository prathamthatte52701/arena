import { deformationForViseme, type Viseme } from '../face/mouth.ts';
import { phoneticGroups, visemeForGroup } from './visemes.ts';
import { DEFAULT_SPEECH_RATE, estimateSpeechDuration, MAX_TIMELINE_MS } from './timing.ts';

export interface TimelineSegment {
  startMs: number;
  endMs: number;
  viseme: Viseme;
  word: string;
  charStart: number;
  charEnd: number;
  kind: 'articulation' | 'pause';
}

const TOKEN = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*|[,;:.!?…]+/g;
const PAUSE_MS: Record<string, number> = { ',': 150, ';': 260, ':': 260, '.': 430, '?': 480, '!': 480, '…': 520 };

function pushSegment(segments: TimelineSegment[], startMs: number, durationMs: number, viseme: Viseme, word: string, charStart: number, charEnd: number, kind: TimelineSegment['kind']) {
  const safeDuration = Math.max(1, Math.round(durationMs));
  segments.push({ startMs, endMs: startMs + safeDuration, viseme, word, charStart, charEnd, kind });
  return startMs + safeDuration;
}

export function createVisemeTimeline(text: string, rate = DEFAULT_SPEECH_RATE): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  const source = text.slice(0, 420);
  if (!source.trim()) return segments;
  let cursor = 0;
  let previousWasWord = false;
  let match: RegExpExecArray | null;
  while ((match = TOKEN.exec(source))) {
    const token = match[0];
    const tokenStart = match.index;
    if (previousWasWord) cursor = pushSegment(segments, cursor, 84 / Math.max(rate, 0.5), 'REST', '', tokenStart - 1, tokenStart, 'pause');
    if (/^[A-Za-z0-9]/.test(token)) {
      const groups = phoneticGroups(token);
      const unitWeight = 54 / Math.max(rate, 0.5);
      const vowelHold = 1.55;
      for (const group of groups) {
        const viseme = visemeForGroup(group);
        const weight = viseme === 'AE' || viseme === 'O' ? unitWeight * vowelHold : unitWeight;
        cursor = pushSegment(segments, cursor, weight, viseme, token, tokenStart, tokenStart + token.length, 'articulation');
      }
      previousWasWord = true;
    } else {
      for (const mark of token) {
        cursor = pushSegment(segments, cursor, (PAUSE_MS[mark] ?? 180) / Math.max(rate, 0.5), 'REST', '', tokenStart, tokenStart + token.length, 'pause');
      }
      previousWasWord = false;
    }
    TOKEN.lastIndex = tokenStart + token.length;
  }
  const expected = estimateSpeechDuration(source, rate);
  const duration = segments.at(-1)?.endMs ?? 0;
  const scale = duration > 0 ? Math.min(1.25, Math.max(0.72, expected / duration)) : 1;
  const scaled = segments.map(segment => ({ ...segment, startMs: Math.round(segment.startMs * scale), endMs: Math.round(segment.endMs * scale) }));
  const boundedDuration = scaled.at(-1)?.endMs ?? 0;
  if (boundedDuration <= MAX_TIMELINE_MS) return scaled;
  const boundScale = MAX_TIMELINE_MS / boundedDuration;
  return scaled.map(segment => ({ ...segment, startMs: Math.round(segment.startMs * boundScale), endMs: Math.max(Math.round(segment.startMs * boundScale) + 1, Math.round(segment.endMs * boundScale)) }));
}

export function timelineDuration(timeline: TimelineSegment[]): number {
  return timeline.at(-1)?.endMs ?? 0;
}

export function segmentAt(timeline: TimelineSegment[], elapsedMs: number): TimelineSegment | null {
  if (!timeline.length) return null;
  return timeline.find(segment => elapsedMs >= segment.startMs && elapsedMs < segment.endMs) ?? null;
}

export function timelineDeformation(segment: TimelineSegment | null) {
  return deformationForViseme(segment?.viseme ?? 'REST');
}
