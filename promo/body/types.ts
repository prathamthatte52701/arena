export const BODY_POSE_NAMES = [
  'NEUTRAL_STAND',
  'PROMO_FRONT',
  'THREE_QUARTER',
  'CAMERA_STARE',
  'INTERVIEWER',
  'POWER_STANCE',
] as const;

export type BodyPoseName = (typeof BODY_POSE_NAMES)[number];
export type Framing = 'CLOSE' | 'MEDIUM' | 'FULL';

export interface BodyPose {
  name: BodyPoseName;
  torsoYawDeg: number;
  torsoLeanDeg: number;
  bodyScale: number;
  bodyXPercent: number;
  bodyYPercent: number;
  headXPercent: number;
  headYPercent: number;
  headScale: number;
  headRotationDeg: number;
}

export interface BodyRigFrame extends BodyPose {
  framing: Framing;
  framingHeightPercent: number;
  framingTopPercent: number;
}
