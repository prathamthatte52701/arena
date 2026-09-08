export const DEFAULT_SPEECH_RATE = 0.92;
export const MAX_TIMELINE_MS = 90_000;

export function estimateSpeechDuration(text: string, rate = DEFAULT_SPEECH_RATE): number {
  const normalizedRate = Math.max(0.5, Math.min(2, rate));
  const characters = text.trim().length;
  if (!characters) return 0;
  const words = text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0;
  const punctuation = text.match(/[,;:.!?…]/g)?.length ?? 0;
  // The first Phase 2 calibration counted a full silent gap for every word.
  // Real voices co-articulate adjacent words, so long text needs a graduated
  // correction while the short promo keeps the original conversational pace.
  const artificialGapCorrection = Math.max(0, words - 12) * 86;
  const base = characters * 58 + words * 96 + punctuation * 160 - artificialGapCorrection;
  return Math.min(MAX_TIMELINE_MS, Math.max(260, Math.round(base / normalizedRate)));
}
