import { rheaV2Assets } from '../character/rheaV2Assets.ts';
import type { BodyProfile, Framing } from './types.ts';

export const rheaBodyProfile = {
  // One accepted canonical runtime plate. Other accepted images guide tuning;
  // static poses never swap the live character identity.
  runtimeAsset: rheaV2Assets.bodyFront,
  references: {
    front: rheaV2Assets.bodyFront,
    side: rheaV2Assets.bodySide,
    back: rheaV2Assets.bodyBack,
    threeQuarter: rheaV2Assets.bodyThreeQuarterFront,
    promoFront: rheaV2Assets.upperBodyPromoFront,
    cameraStare: rheaV2Assets.upperBodyCameraStare,
    interviewer: rheaV2Assets.upperBodyInterviewerLook,
    matchAttire: rheaV2Assets.matchAttire,
    entranceAttire: rheaV2Assets.entranceAttire,
  },
  framing: {
    CLOSE: { heightPercent: 100, topPercent: 0 },
    MEDIUM: { heightPercent: 220, topPercent: -3 },
    FULL: { heightPercent: 99, topPercent: 0.5 },
  } satisfies Record<Framing, { heightPercent: number; topPercent: number }>,
  bounds: {
    torsoYawDeg: 7,
    torsoLeanDeg: 2.5,
    bodyScale: [0.96, 1.06],
    bodyXPercent: 4,
    bodyYPercent: 2,
    headXPercent: 1.2,
    headYPercent: 1,
    headScale: [0.98, 1.02],
    headRotationDeg: 1.5,
  },
} as const satisfies BodyProfile;
