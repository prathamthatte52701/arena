import { rheaV2Assets } from './rheaV2Assets.ts';
import type { PortraitProfile } from '../characters/types.ts';

export const rheaProfile = Object.freeze({
  portrait: rheaV2Assets.faceFrontNeutral,
  width: 1122,
  height: 1402,
  // Landmarks measured on the canonical V2 front portrait.
  eyes: Object.freeze([Object.freeze({ x: 450, y: 418 }), Object.freeze({ x: 628, y: 418 })] as const),
  references: Object.freeze({
    threeQuarter: rheaV2Assets.faceThreeQuarterNeutral,
    profile: rheaV2Assets.faceProfile,
    neutral: rheaV2Assets.faceFrontNeutral,
    confident: rheaV2Assets.faceConfidentSmirk,
    smirk: rheaV2Assets.faceConfidentSmirk,
    serious: rheaV2Assets.faceColdNeutral,
    intimidating: rheaV2Assets.faceAggressiveIntimidating,
    mocking: rheaV2Assets.expressionMocking,
    speaking: rheaV2Assets.expressionSpeakingOpen,
  }),
}) satisfies PortraitProfile;
