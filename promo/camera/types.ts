import type { PerformanceTarget } from '../performance/types.ts';

export const CAMERA_STATE_NAMES = [
  'STATIC_MEDIUM',
  'STATIC_FULL',
  'CLOSE_PROMO',
  'SLOW_PUSH_IN',
  'SLOW_PULL_OUT',
  'INTERVIEWER_ANGLE',
  'CAMERA_STARE',
  'FINAL_HOLD',
] as const;

export type CameraStateName = (typeof CAMERA_STATE_NAMES)[number];
export type CameraPhase = 'ENTER' | 'HOLD' | 'EXIT' | 'REST';

export interface CameraTransform {
  xPercent: number;
  yPercent: number;
  scale: number;
  rotationDeg: number;
}

export interface CameraDefinition {
  name: CameraStateName;
  enterMs: number;
  holdMs: number;
  exitMs: number;
  peak: CameraTransform;
}

export interface CameraFrame extends CameraTransform {
  name: CameraStateName;
  phase: CameraPhase;
  phaseProgress: number;
}

export interface CameraRequest {
  name: CameraStateName;
  triggerId: string;
}

export interface CameraBounds {
  xPercent: number;
  yPercent: number;
  scale: readonly [number, number];
  rotationDeg: number;
}

export interface CameraControllerConfig {
  definitions: Readonly<Record<CameraStateName, CameraDefinition>>;
  neutral: CameraTransform;
  bounds: CameraBounds;
}

export type CameraPerformanceSignal = Pick<PerformanceTarget, 'beatIndex' | 'expression' | 'gaze' | 'intensity' | 'headBias' | 'finalHold'>;
