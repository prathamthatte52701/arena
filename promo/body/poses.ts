import type { BodyPose, BodyPoseName } from './types.ts';

const pose = (value: BodyPose): BodyPose => value;

export const RHEA_BODY_POSES: Readonly<Record<BodyPoseName, BodyPose>> = {
  NEUTRAL_STAND: pose({ name: 'NEUTRAL_STAND', torsoYawDeg: 0, torsoLeanDeg: 0, bodyScale: 1, bodyXPercent: 0, bodyYPercent: 0, headXPercent: 0, headYPercent: 0, headScale: 1, headRotationDeg: 0 }),
  PROMO_FRONT: pose({ name: 'PROMO_FRONT', torsoYawDeg: 0, torsoLeanDeg: -0.35, bodyScale: 1.025, bodyXPercent: 0, bodyYPercent: 0.2, headXPercent: 0, headYPercent: -0.15, headScale: 1.005, headRotationDeg: 0 }),
  THREE_QUARTER: pose({ name: 'THREE_QUARTER', torsoYawDeg: -5.5, torsoLeanDeg: -0.8, bodyScale: 1.015, bodyXPercent: 1.7, bodyYPercent: 0.25, headXPercent: -0.35, headYPercent: -0.1, headScale: 1, headRotationDeg: 0.55 }),
  CAMERA_STARE: pose({ name: 'CAMERA_STARE', torsoYawDeg: 0, torsoLeanDeg: 0, bodyScale: 1.018, bodyXPercent: 0, bodyYPercent: -0.15, headXPercent: 0, headYPercent: -0.25, headScale: 1.01, headRotationDeg: 0 }),
  INTERVIEWER: pose({ name: 'INTERVIEWER', torsoYawDeg: 4.5, torsoLeanDeg: 0.55, bodyScale: 1.01, bodyXPercent: -1.35, bodyYPercent: 0.1, headXPercent: 0.3, headYPercent: -0.1, headScale: 1, headRotationDeg: -0.45 }),
  POWER_STANCE: pose({ name: 'POWER_STANCE', torsoYawDeg: 0, torsoLeanDeg: 0, bodyScale: 1.055, bodyXPercent: 0, bodyYPercent: 0.65, headXPercent: 0, headYPercent: -0.2, headScale: 1.012, headRotationDeg: 0 }),
};
