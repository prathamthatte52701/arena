export type VoiceTone = 'AUTO' | 'CONFIDENT' | 'COLD' | 'MOCKING' | 'ANGRY' | 'INTIMIDATING' | 'SMIRKING';

export interface VoiceToneSettings {
  lengthScale: number;
  sentenceSilence: number;
  emphasis: number;
}

/**
 * Derived from broad delivery measurements only. The Piper speaker is a
 * separate generic preset and never receives reference audio or embeddings.
 */
export const DARK_POWER_VOICE_PROFILE = {
  version: 'dark-power-v1',
  engine: 'Piper 1.8.0',
  model: 'en_US-amy-medium',
  identity: 'generic non-cloned female synthetic preset',
  referenceSummary: {
    filesFound: 3,
    usableFiles: 1,
    usableDurationSeconds: 44.587,
    medianPauseSeconds: 0.2,
    rmsVariationDbP10ToP90: 20.04,
    pitchMedianHz: null,
    limitation: 'Two clips were dominated by noise or had insufficient voiced material; pitch and lexical speaking rate were not reliable.'
  },
  tones: {
    AUTO: { lengthScale: 1.0, sentenceSilence: 0.28, emphasis: 1.0 },
    CONFIDENT: { lengthScale: 0.94, sentenceSilence: 0.22, emphasis: 1.08 },
    COLD: { lengthScale: 1.06, sentenceSilence: 0.34, emphasis: 0.92 },
    MOCKING: { lengthScale: 0.98, sentenceSilence: 0.3, emphasis: 1.04 },
    ANGRY: { lengthScale: 0.86, sentenceSilence: 0.16, emphasis: 1.16 },
    INTIMIDATING: { lengthScale: 1.08, sentenceSilence: 0.38, emphasis: 1.12 },
    SMIRKING: { lengthScale: 0.96, sentenceSilence: 0.25, emphasis: 1.03 },
  } satisfies Record<VoiceTone, VoiceToneSettings>,
} as const;

export function voiceToneSettings(tone: VoiceTone): VoiceToneSettings {
  return DARK_POWER_VOICE_PROFILE.tones[tone];
}
