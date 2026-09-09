import { rheaV2Assets } from './rheaV2Assets.ts';

export const rheaProfile = {
  portrait: rheaV2Assets.faceFrontNeutral,
  width: 1122,
  height: 1402,
  // Landmarks measured on the canonical V2 front portrait.
  eyes: [{ x: 450, y: 418 }, { x: 628, y: 418 }],
  references: {
    threeQuarter: rheaV2Assets.faceThreeQuarterNeutral,
    profile: rheaV2Assets.faceProfile,
    neutral: rheaV2Assets.faceFrontNeutral,
    confident: rheaV2Assets.faceConfidentSmirk,
    smirk: rheaV2Assets.faceConfidentSmirk,
    serious: rheaV2Assets.faceColdNeutral,
    intimidating: rheaV2Assets.faceAggressiveIntimidating,
    mocking: rheaV2Assets.expressionMocking,
    speaking: rheaV2Assets.expressionSpeakingOpen,
  },
} as const;
