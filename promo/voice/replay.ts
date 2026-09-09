import type { VoiceTone } from './darkPowerVoiceProfile.ts';

/** This memory is independent of active speech sessions and survives STOP. */
export function createReplayMemory() {
  let delivered: Readonly<{ text: string; tone: VoiceTone }> | null = null;
  return {
    remember(text: string, tone: VoiceTone) { delivered = Object.freeze({ text, tone }); },
    read() { return delivered; },
  };
}
