import { RHEA_BODY_POSES } from './poses.ts';
import { rheaBodyProfile } from './rheaBodyProfile.ts';
import type {
  BodyPose,
  BodyRigFrame,
  Framing,
} from './types.ts';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function resolveBodyPose(value: string | null | undefined): BodyPose {
  const name = value && value in RHEA_BODY_POSES
    ? (value as keyof typeof RHEA_BODY_POSES)
    : 'NEUTRAL_STAND';

  return { ...RHEA_BODY_POSES[name] };
}

export function createBodyPoseController() {
  return {
    sample(
      value: string | null | undefined,
      framing: Framing,
    ): BodyRigFrame {
      const pose = resolveBodyPose(value);
      const bounds = rheaBodyProfile.bounds;
      const frame = rheaBodyProfile.framing[framing];

      return {
        ...pose,
        torsoYawDeg: clamp(pose.torsoYawDeg, -bounds.torsoYawDeg, bounds.torsoYawDeg),
        torsoLeanDeg: clamp(pose.torsoLeanDeg, -bounds.torsoLeanDeg, bounds.torsoLeanDeg),
        bodyScale: clamp(pose.bodyScale, bounds.bodyScale[0], bounds.bodyScale[1]),
        bodyXPercent: clamp(pose.bodyXPercent, -bounds.bodyXPercent, bounds.bodyXPercent),
        bodyYPercent: clamp(pose.bodyYPercent, -bounds.bodyYPercent, bounds.bodyYPercent),
        headXPercent: clamp(pose.headXPercent, -bounds.headXPercent, bounds.headXPercent),
        headYPercent: clamp(pose.headYPercent, -bounds.headYPercent, bounds.headYPercent),
        headScale: clamp(pose.headScale, bounds.headScale[0], bounds.headScale[1]),
        headRotationDeg: clamp(
          pose.headRotationDeg,
          -bounds.headRotationDeg,
          bounds.headRotationDeg,
        ),
        framing,
        framingHeightPercent: frame.heightPercent,
        framingTopPercent: frame.topPercent,
      };
    },
  };
}
