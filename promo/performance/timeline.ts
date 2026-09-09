import type { Expression, Gaze, PerformanceTarget, Tone } from './types.ts';

export interface PerformanceBeat {
  startChar: number;
  endChar: number;
  sentence: string;
  expression: Expression;
  gaze: Gaze;
  intensity: number;
  headBias: { x: number; y: number };
  holdMs: number;
  finalBeat: boolean;
}

export interface PerformanceFrame extends PerformanceTarget {
  beat: PerformanceBeat;
}

const SENTENCE = /[^.!?…]+[.!?…]+|[^.!?…]+$/g;
const CHALLENGE = /\b(?:you\s+(?:really\s+)?think|are\s+you\s+ready|prove\s+it|try\s+me|come\s+find\s+out|fight|challenge|ready\s+for)\b/i;
const CONFIDENCE = /\b(?:i\s+know|i\s+will|i['’]?m\s+ready|i\s+belong|i['’]?ve\s+waited|i\s+choose|i\s+bring|i\s+stand)\b/i;
const MOCKING = /\b(?:that['’]?s\s+cute|keep\s+talking|you\s+wish|not\s+impressed)\b/i;
const STRONG = /\b(?:prove|fight|challenge|victory|ready|everything|again|now)\b/i;

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function sentenceParts(text: string) {
  const parts: { text: string; startChar: number; endChar: number }[] = [];
  SENTENCE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SENTENCE.exec(text))) {
    const raw = match[0];
    const leading = raw.search(/\S/);
    if (leading < 0) continue;
    const startChar = match.index + leading;
    parts.push({ text: raw.trim(), startChar, endChar: match.index + raw.length });
  }
  return parts;
}

function scoreTone(sentence: string, tone: Tone) {
  return {
    question: /\?/.test(sentence),
    challenge: CHALLENGE.test(sentence),
    confidence: CONFIDENCE.test(sentence),
    mocking: MOCKING.test(sentence),
    strong: STRONG.test(sentence),
    long: sentence.length >= 100,
    tone,
  };
}

function chooseExpression(sentence: string, tone: Tone, finalBeat: boolean, index: number): Expression {
  const score = scoreTone(sentence, tone);
  if (finalBeat) {
    if (tone === 'CONFIDENT') return 'CONFIDENT';
    if (tone === 'MOCKING') return 'MOCKING';
    if (tone === 'SMIRKING') return 'SMIRK';
    if (tone === 'COLD') return 'INTIMIDATING';
    if (tone === 'ANGRY' || tone === 'INTIMIDATING') return 'INTIMIDATING';
    if (score.challenge || score.strong || score.question) return 'INTIMIDATING';
    return score.confidence ? 'CONFIDENT' : 'SERIOUS';
  }
  if (tone === 'MOCKING') return score.challenge || score.question || score.mocking ? (index % 2 ? 'SMIRK' : 'MOCKING') : 'MOCKING';
  if (tone === 'SMIRKING') return 'SMIRK';
  if (tone === 'ANGRY') return score.challenge || score.question || score.strong ? 'INTIMIDATING' : 'SERIOUS';
  if (tone === 'INTIMIDATING') return score.strong && index > 0 ? 'INTIMIDATING' : 'SERIOUS';
  if (tone === 'COLD') return 'SERIOUS';
  if (tone === 'CONFIDENT') return score.challenge || score.confidence ? 'CONFIDENT' : 'SERIOUS';
  if (score.mocking) return 'MOCKING';
  if (score.challenge || score.question) return index % 2 ? 'INTIMIDATING' : 'SMIRK';
  if (score.confidence) return 'CONFIDENT';
  if (score.long) return 'SERIOUS';
  return index === 0 ? 'NEUTRAL' : 'CONFIDENT';
}

function chooseGaze(sentence: string, tone: Tone, finalBeat: boolean, expression: Expression, index: number): Gaze {
  if (finalBeat) return 'CAMERA';
  if (tone === 'COLD' || tone === 'ANGRY') return 'CAMERA';
  if (tone === 'INTIMIDATING') return index % 3 === 1 ? 'INTERVIEWER' : 'CAMERA';
  if (tone === 'MOCKING') return index % 2 ? 'LEFT' : 'RIGHT';
  if (tone === 'SMIRKING') return index % 3 === 2 ? 'CENTER' : 'INTERVIEWER';
  if (expression === 'MOCKING' || expression === 'SMIRK') return 'INTERVIEWER';
  if (expression === 'INTIMIDATING' || /\?|\b(?:prove|try\s+me|challenge)\b/i.test(sentence)) return 'CAMERA';
  if (expression === 'CONFIDENT' || tone === 'CONFIDENT') return 'CENTER';
  return 'INTERVIEWER';
}

function headBias(expression: Expression, intensity: number, tone: Tone, index: number) {
  const amount = clamp(intensity) * 0.18;
  if (tone === 'COLD') return { x: -amount * 0.08, y: amount * 0.16 };
  if (tone === 'ANGRY') return { x: -amount * 0.42, y: -amount * 0.3 };
  if (tone === 'INTIMIDATING') return { x: -amount * 0.2, y: amount * 0.72 };
  if (tone === 'MOCKING') return { x: (index % 2 ? -1 : 1) * amount * 0.85, y: -amount * 0.42 };
  if (tone === 'SMIRKING') return { x: amount * 0.42, y: -amount * 0.18 };
  if (expression === 'SMIRK' || expression === 'MOCKING') return { x: amount * 0.75, y: -amount * 0.35 };
  if (expression === 'INTIMIDATING') return { x: -amount * 0.25, y: amount * 0.55 };
  if (expression === 'CONFIDENT') return { x: -amount * 0.2, y: -amount * 0.45 };
  return { x: 0, y: expression === 'SERIOUS' ? amount * 0.15 : 0 };
}

function toneIntensity(tone: Tone, score: ReturnType<typeof scoreTone>, finalBeat: boolean) {
  if (tone === 'COLD') return finalBeat ? 0.5 : score.strong ? 0.44 : 0.38;
  if (tone === 'MOCKING') return finalBeat ? 0.8 : 0.64 + (score.mocking || score.challenge ? 0.08 : 0);
  if (tone === 'ANGRY') return finalBeat ? 0.98 : 0.76 + (score.strong || score.challenge ? 0.14 : 0);
  if (tone === 'INTIMIDATING') return finalBeat ? 0.88 : 0.6 + (score.strong || score.challenge ? 0.1 : 0);
  if (tone === 'SMIRKING') return finalBeat ? 0.68 : 0.5 + (score.mocking || score.challenge ? 0.06 : 0);
  if (tone === 'CONFIDENT') return finalBeat ? 0.76 : 0.58 + (score.confidence || score.challenge ? 0.06 : 0);
  return finalBeat
    ? (score.strong || score.challenge || score.question ? 0.92 : score.confidence ? 0.72 : 0.58)
    : 0.52 + (score.strong ? 0.12 : 0);
}

function beatHold(tone: Tone, finalBeat: boolean, emphatic: boolean) {
  if (!finalBeat) return emphatic ? 520 : 260;
  if (tone === 'ANGRY') return 1500;
  if (tone === 'INTIMIDATING') return 2300;
  if (tone === 'COLD') return 2200;
  if (tone === 'MOCKING') return 1550;
  if (tone === 'SMIRKING') return 1900;
  if (tone === 'CONFIDENT') return 1800;
  return 1700;
}

export function createPerformanceTimeline(text: string, tone: Tone = 'AUTO'): PerformanceBeat[] {
  const source = text.slice(0, 420);
  const parts = sentenceParts(source);
  if (!parts.length) return [];
  const beats: PerformanceBeat[] = [];
  parts.forEach((part, index) => {
    const finalSentence = index === parts.length - 1;
    const splitAt = finalSentence && part.text.length > 80 ? part.text.lastIndexOf(',') : -1;
    const chunks = splitAt > 20 ? [
      { text: part.text.slice(0, splitAt + 1).trim(), startChar: part.startChar, endChar: part.startChar + splitAt + 1 },
      { text: part.text.slice(splitAt + 1).trim(), startChar: part.startChar + splitAt + 1, endChar: part.endChar },
    ] : [{ text: part.text, startChar: part.startChar, endChar: part.endChar }];
    chunks.forEach((chunk, chunkIndex) => {
      const finalBeat = finalSentence && chunkIndex === chunks.length - 1;
      const beatIndex = index + chunkIndex;
      const expression = chooseExpression(chunk.text, tone, finalBeat, beatIndex);
      const score = scoreTone(chunk.text, tone);
      const intensity = clamp(toneIntensity(tone, score, finalBeat));
      beats.push({
        startChar: chunk.startChar,
        endChar: chunk.endChar,
        sentence: chunk.text,
        expression,
        gaze: chooseGaze(chunk.text, tone, finalBeat, expression, beatIndex),
        intensity,
        headBias: headBias(expression, intensity, tone, beatIndex),
        holdMs: beatHold(tone, finalBeat, /[!?]/.test(chunk.text)),
        finalBeat,
      });
    });
  });
  return beats;
}

export function performanceAt(timeline: PerformanceBeat[], characterIndex: number): PerformanceFrame | null {
  if (!timeline.length) return null;
  let beatIndex = 0;
  if (characterIndex >= timeline[0].startChar) {
    for (let index = 1; index < timeline.length; index++) {
      if (timeline[index].startChar > characterIndex) break;
      beatIndex = index;
    }
  }
  const beat = timeline[beatIndex];
  return { beatIndex, sentence: beat.sentence, expression: beat.expression, gaze: beat.gaze, intensity: beat.intensity, headBias: beat.headBias, finalHold: false, beat };
}

export function finalPerformance(timeline: PerformanceBeat[]): PerformanceFrame | null {
  if (!timeline.length) return null;
  const beatIndex = timeline.length - 1;
  const beat = timeline[beatIndex];
  return { beatIndex, sentence: beat.sentence, expression: beat.expression, gaze: 'CAMERA', intensity: beat.intensity, headBias: beat.headBias, finalHold: true, beat };
}
