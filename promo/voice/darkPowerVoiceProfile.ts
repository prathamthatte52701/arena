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
 * Stock female preset selected by the user's listening comparison.
 * Pace/pause controls express the requested restrained villainess delivery;
 * Piper does not provide an Irish accent or emotion-intensity control.
 */
export const DARK_POWER_VOICE_PROFILE = {
  version: 'dark-power-v2-kristin',
  engine: 'Piper 1.8.0',
  model: 'en_US-kristin-medium',
  identity: 'generic non-cloned female synthetic preset',
  referenceSummary: {
    filesFound: 3,
    source: 'new-voice-rhea-ripley/new voice rhea ripley/raw only',
    filesAnalyzed: 3,
    decodedDurationSeconds: 90.645,
    oldReferenceSourcesUsed: false,
    limitation: 'Mixture energy and duration measured; speech-only pitch, usable speech duration and phrase contours are unverified. No old measurements reused.'
  },
  tones: {
    AUTO: { lengthScale: 1.08, sentenceSilence: 0.25 },
    CONFIDENT: { lengthScale: 1.04, sentenceSilence: 0.22 },
    COLD: { lengthScale: 1.15, sentenceSilence: 0.35 },
    MOCKING: { lengthScale: 1.01, sentenceSilence: 0.20 },
    ANGRY: { lengthScale: 0.97, sentenceSilence: 0.16 },
    INTIMIDATING: { lengthScale: 1.17, sentenceSilence: 0.38 },
    SMIRKING: { lengthScale: 1.03, sentenceSilence: 0.24 },
  } satisfies Record<VoiceTone, VoiceToneSettings>,
} as const;

export function voiceToneSettings(tone: VoiceTone): VoiceToneSettings {
  if (!isVoiceTone(tone)) throw new Error('Invalid voice tone');
  return DARK_POWER_VOICE_PROFILE.tones[tone];
}
