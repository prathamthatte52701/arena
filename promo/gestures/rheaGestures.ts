import type { GestureDefinition, GestureName, GestureTransform } from './types.ts';

export const NEUTRAL_GESTURE_TRANSFORM: GestureTransform = Object.freeze({
  bodyXPercent: 0,
  bodyYPercent: 0,
  bodyScale: 1,
  torsoYawDeg: 0,
  torsoLeanDeg: 0,
  headXPercent: 0,
  headYPercent: 0,
  headScale: 1,
  headRotationDeg: 0,
});

const definition = (
  name: GestureName,
  peak: Partial<GestureTransform>,
  timing: [number, number, number],
  supported = true,
  reason: string | null = null,
): GestureDefinition => ({
  name,
  supported,
  reason,
  enterMs: timing[0],
  holdMs: timing[1],
  exitMs: timing[2],
  peak: { ...NEUTRAL_GESTURE_TRANSFORM, ...peak },
});

const STATIC_PLATE_LIMIT = 'The accepted static body plate has no independent arm geometry; substituting an arm pose would create false or broken anatomy.';

export const RHEA_GESTURES: Readonly<Record<GestureName, GestureDefinition>> = {
  IDLE: definition('IDLE', { bodyYPercent: 0.06, bodyScale: 1.001 }, [420, 520, 460]),
  ARMS_RELAXED: definition('ARMS_RELAXED', { bodyYPercent: 0.08, torsoLeanDeg: 0.12, headYPercent: -0.02 }, [360, 760, 420]),
  ARMS_CROSSED: definition('ARMS_CROSSED', {}, [0, 0, 0], false, STATIC_PLATE_LIMIT),
  ONE_HAND_POINT: definition('ONE_HAND_POINT', {}, [0, 0, 0], false, STATIC_PLATE_LIMIT),
  OPEN_PALM_CHALLENGE: definition('OPEN_PALM_CHALLENGE', {}, [0, 0, 0], false, STATIC_PLATE_LIMIT),
  CHEST_EMPHASIS: definition('CHEST_EMPHASIS', {
    bodyYPercent: -0.16,
    bodyScale: 1.004,
    torsoLeanDeg: -0.72,
    headYPercent: -0.05,
    headScale: 1.001,
  }, [260, 420, 360]),
  LEAN_FORWARD: definition('LEAN_FORWARD', {
    bodyYPercent: -0.2,
    bodyScale: 1.007,
    torsoLeanDeg: -1.08,
    headYPercent: -0.08,
    headScale: 1.002,
  }, [480, 700, 560]),
  HEAD_TILT_EMPHASIS: definition('HEAD_TILT_EMPHASIS', {
    bodyXPercent: 0.22,
    torsoYawDeg: 0.62,
    torsoLeanDeg: 0.18,
    headXPercent: 0.1,
    headYPercent: -0.03,
    headRotationDeg: 1.05,
  }, [320, 520, 440]),
};

export const GESTURE_BOUNDS = Object.freeze({
  bodyXPercent: 0.8,
  bodyYPercent: 0.5,
  bodyScale: [0.995, 1.01] as const,
  torsoYawDeg: 1.25,
  torsoLeanDeg: 1.25,
  headXPercent: 0.3,
  headYPercent: 0.2,
  headScale: [0.995, 1.005] as const,
  headRotationDeg: 1.25,
});
