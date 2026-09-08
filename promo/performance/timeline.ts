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
    if (tone === 'MOCKING' || tone === 'SMIRKING') return index % 2 ? 'MOCKING' : 'SMIRK';
    if (tone === 'COLD') return 'INTIMIDATING';
    if (score.challenge || score.strong || score.question) return 'INTIMIDATING';
    return score.confidence ? 'CONFIDENT' : 'SERIOUS';
  }
  if (tone === 'MOCKING' || tone === 'SMIRKING') return score.challenge || score.question || score.mocking ? (index % 2 ? 'MOCKING' : 'SMIRK') : 'MOCKING';
  if (tone === 'INTIMIDATING' || tone === 'ANGRY') return score.challenge || score.question || score.strong ? 'INTIMIDATING' : 'SERIOUS';
  if (tone === 'COLD') return score.challenge || score.question ? 'INTIMIDATING' : 'SERIOUS';
  if (tone === 'CONFIDENT') return score.challenge || score.confidence ? 'CONFIDENT' : 'SERIOUS';
  if (score.mocking) return 'MOCKING';
  if (score.challenge || score.question) return index % 2 ? 'INTIMIDATING' : 'SMIRK';
  if (score.confidence) return 'CONFIDENT';
  if (score.long) return 'SERIOUS';
  return index === 0 ? 'NEUTRAL' : 'CONFIDENT';
}

function chooseGaze(sentence: string, tone: Tone, finalBeat: boolean, expression: Expression): Gaze {
  if (finalBeat) return 'CAMERA';
  if (expression === 'MOCKING' || expression === 'SMIRK') return tone === 'MOCKING' || tone === 'SMIRKING' ? 'RIGHT' : 'INTERVIEWER';
  if (expression === 'INTIMIDATING' || /\?|\b(?:prove|try\s+me|challenge)\b/i.test(sentence)) return 'CAMERA';
  if (expression === 'CONFIDENT' || tone === 'CONFIDENT') return 'CENTER';
  return 'INTERVIEWER';
}

function headBias(expression: Expression, intensity: number) {
  const amount = clamp(intensity) * 0.18;
  if (expression === 'SMIRK' || expression === 'MOCKING') return { x: amount * 0.75, y: -amount * 0.35 };
  if (expression === 'INTIMIDATING') return { x: -amount * 0.25, y: amount * 0.55 };
  if (expression === 'CONFIDENT') return { x: -amount * 0.2, y: -amount * 0.45 };
  return { x: 0, y: expression === 'SERIOUS' ? amount * 0.15 : 0 };
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
      const expression = chooseExpression(chunk.text, tone, finalBeat, index + chunkIndex);
      const score = scoreTone(chunk.text, tone);
      const intensity = clamp(finalBeat
        ? (score.strong || score.challenge || score.question ? 0.92 : score.confidence ? 0.72 : 0.58)
        : 0.52 + (score.strong ? 0.12 : 0) + (tone === 'AUTO' ? 0 : 0.04));
      beats.push({
        startChar: chunk.startChar,
        endChar: chunk.endChar,
        sentence: chunk.text,
        expression,
        gaze: chooseGaze(chunk.text, tone, finalBeat, expression),
        intensity,
        headBias: headBias(expression, intensity),
        holdMs: finalBeat ? 1700 : (/[!?]/.test(chunk.text) ? 520 : 260),
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
