import type { CameraDefinition, CameraStateName, CameraTransform } from './types.ts';

export const NEUTRAL_CAMERA_TRANSFORM: CameraTransform = Object.freeze({
  xPercent: 0,
  yPercent: 0,
  scale: 1,
  rotationDeg: 0,
});

const camera = (name: CameraStateName, peak: Partial<CameraTransform>, timing: [number, number, number]): CameraDefinition => ({
  name,
  enterMs: timing[0],
  holdMs: timing[1],
  exitMs: timing[2],
  peak: { ...NEUTRAL_CAMERA_TRANSFORM, ...peak },
});

export const RHEA_CAMERA_STATES: Readonly<Record<CameraStateName, CameraDefinition>> = Object.freeze({
  STATIC_MEDIUM: camera('STATIC_MEDIUM', {}, [0, 1200, 0]),
  STATIC_FULL: camera('STATIC_FULL', {}, [0, 1200, 0]),
  CLOSE_PROMO: camera('CLOSE_PROMO', { yPercent: 0.18, scale: 1.052 }, [2100, 900, 780]),
  SLOW_PUSH_IN: camera('SLOW_PUSH_IN', { yPercent: 0.12, scale: 1.044 }, [2200, 650, 760]),
  SLOW_PULL_OUT: camera('SLOW_PULL_OUT', { yPercent: 0.1, scale: 1.04 }, [420, 120, 2300]),
  INTERVIEWER_ANGLE: camera('INTERVIEWER_ANGLE', { xPercent: -0.85, yPercent: 0.08, scale: 1.014, rotationDeg: -0.28 }, [1100, 900, 900]),
  CAMERA_STARE: camera('CAMERA_STARE', { yPercent: 0.08, scale: 1.024 }, [1450, 950, 850]),
  FINAL_HOLD: camera('FINAL_HOLD', { yPercent: 0.12, scale: 1.032 }, [1250, 1600, 900]),
});

export const CAMERA_BOUNDS = Object.freeze({
  xPercent: 1.25,
  yPercent: 0.55,
  scale: [1, 1.055] as const,
  rotationDeg: 0.4,
});
