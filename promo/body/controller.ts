import { RHEA_BODY_POSES } from './poses.ts';
import { rheaBodyProfile } from './rheaBodyProfile.ts';
import type {
  BodyControllerConfig,
  BodyPose,
  BodyRigFrame,
  Framing,
} from './types.ts';

const DEFAULT_BODY_CONFIG: BodyControllerConfig = {
  profile: rheaBodyProfile,
  poses: RHEA_BODY_POSES,
};

function isBodyConfig(value: unknown): value is BodyControllerConfig {
  return typeof value === 'object' && value !== null && 'profile' in value && 'poses' in value;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function resolveBodyPose(configOrValue: unknown, requestedValue?: unknown): BodyPose {
  const config = isBodyConfig(configOrValue) ? configOrValue : DEFAULT_BODY_CONFIG;
  const value = isBodyConfig(configOrValue) ? requestedValue : configOrValue;
  const name = typeof value === 'string' && Object.hasOwn(config.poses, value)
    ? (value as keyof typeof config.poses)
    : 'NEUTRAL_STAND';

  return { ...config.poses[name] };
}

export function createBodyPoseController(config: BodyControllerConfig = DEFAULT_BODY_CONFIG) {
  return {
    sample(
      value: unknown,
      framing: Framing,
    ): BodyRigFrame {
      const pose = resolveBodyPose(config, value);
      const bounds = config.profile.bounds;
      const frame = config.profile.framing[framing];

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
