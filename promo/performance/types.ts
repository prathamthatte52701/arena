export type Expression = 'NEUTRAL' | 'CONFIDENT' | 'SMIRK' | 'SERIOUS' | 'INTIMIDATING' | 'MOCKING';
export type Gaze = 'INTERVIEWER' | 'CAMERA' | 'LEFT' | 'RIGHT' | 'CENTER';
export type Framing = 'MEDIUM' | 'CLOSE';
export type Tone = 'AUTO' | 'CONFIDENT' | 'COLD' | 'MOCKING' | 'ANGRY' | 'INTIMIDATING' | 'SMIRKING';

export interface PerformanceTarget {
  beatIndex: number;
  sentence: string;
  expression: Expression;
  gaze: Gaze;
  intensity: number;
  headBias: { x: number; y: number };
  finalHold: boolean;
}
import type { Viseme } from '../face/mouth.ts';
export interface FacePose {
  head: number;
  chin: number;
  brow: number;
  squint: number;
  smile: number;
  asymmetry: number;
  posture: number;
}
export interface FaceControls {
  expression: Expression;
  gaze: Gaze;
  idle: boolean;
  blinkRequest: number;
  blinkPreview: number | null;
  mouthPreview?: Viseme | null;
  performance?: PerformanceTarget | null;
}
