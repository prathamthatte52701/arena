import type { PerformanceTarget } from '../performance/types.ts';

export const GESTURE_NAMES = [
  'IDLE',
  'ARMS_RELAXED',
  'ARMS_CROSSED',
  'ONE_HAND_POINT',
  'OPEN_PALM_CHALLENGE',
  'CHEST_EMPHASIS',
  'LEAN_FORWARD',
  'HEAD_TILT_EMPHASIS',
] as const;

export type GestureName = (typeof GESTURE_NAMES)[number];
export type GesturePhase = 'ENTER' | 'HOLD' | 'EXIT' | 'REST';

export interface GestureTransform {
  bodyXPercent: number;
  bodyYPercent: number;
  bodyScale: number;
  torsoYawDeg: number;
  torsoLeanDeg: number;
  headXPercent: number;
  headYPercent: number;
  headScale: number;
  headRotationDeg: number;
}

export interface GestureDefinition {
  name: GestureName;
  supported: boolean;
  reason: string | null;
  enterMs: number;
  holdMs: number;
  exitMs: number;
  peak: GestureTransform;
}

export interface GestureFrame extends GestureTransform {
  name: GestureName;
  supported: boolean;
  phase: GesturePhase;
  phaseProgress: number;
}

export interface GestureRequest {
  name: GestureName;
  triggerId: string;
}

export type GesturePerformanceSignal = Pick<PerformanceTarget, 'beatIndex' | 'expression' | 'gaze' | 'intensity' | 'headBias' | 'finalHold'>;
