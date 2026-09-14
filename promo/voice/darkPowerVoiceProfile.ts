export const VOICE_TONES = ['AUTO', 'CONFIDENT', 'COLD', 'MOCKING', 'ANGRY', 'INTIMIDATING', 'SMIRKING'] as const;
export type VoiceTone = typeof VOICE_TONES[number];
export function isVoiceTone(value: unknown): value is VoiceTone {
  return typeof value === 'string' && VOICE_TONES.some(tone => tone === value);
}

export interface VoiceToneSettings {
  lengthScale: number;
  sentenceSilence: number;
}

/**
 * Distinct generic female synthetic preset selected by the user's local A/B
 * review. The reference clips informed broad delivery style only; no speaker
 * embedding, voice conversion, or identity cloning is used.
 */
export const DARK_POWER_VOICE_PROFILE = {
  version: 'rhea-final-v1',
  engine: 'Piper 1.8.0',
  model: 'en_US-kristin-medium',
  identity: 'generic husky lower-mid female promo voice',
  referenceSummary: {
    filesFound: 5,
    source: 'rhea_voice_style_reference_pack.zip',
    filesAnalyzed: 5,
    decodedDurationSeconds: 40,
    oldReferenceSourcesUsed: false,
    identityCloningUsed: false,
    limitation: 'Broad cadence, energy, pause, and spectral traits only; no speaker identity analysis or reference-conditioned synthesis.',
  },
  tones: {
    AUTO: { lengthScale: 1.1178, sentenceSilence: 0.285 },
    CONFIDENT: { lengthScale: 1.0764, sentenceSilence: 0.255 },
    COLD: { lengthScale: 1.1902, sentenceSilence: 0.385 },
    MOCKING: { lengthScale: 1.0454, sentenceSilence: 0.235 },
    ANGRY: { lengthScale: 1.004, sentenceSilence: 0.195 },
    INTIMIDATING: { lengthScale: 1.2109, sentenceSilence: 0.415 },
    SMIRKING: { lengthScale: 1.0661, sentenceSilence: 0.275 },
  } satisfies Record<VoiceTone, VoiceToneSettings>,
  postProcessing: {
    highPassHz: 55,
    bodyFrequencyHz: 250,
    bodyGainDb: 2.7,
    bodyQ: 0.72,
    softenFrequencyHz: 3_200,
    softenGainDb: -1.4,
    softenQ: 0.78,
    compressorThresholdDb: -15,
    compressorRatio: 2.1,
    compressorAttackMs: 8,
    compressorReleaseMs: 110,
    makeupGainDb: 1.1,
    limiterDb: -0.7,
  },
} as const;

export function voiceToneSettings(tone: VoiceTone): VoiceToneSettings {
  if (!isVoiceTone(tone)) throw new Error('Invalid voice tone');
  return DARK_POWER_VOICE_PROFILE.tones[tone];
}
