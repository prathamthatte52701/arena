export type Expression = 'NEUTRAL' | 'CONFIDENT' | 'SMIRK' | 'SERIOUS' | 'INTIMIDATING' | 'MOCKING';
export type Gaze = 'INTERVIEWER' | 'CAMERA' | 'LEFT' | 'RIGHT' | 'CENTER';
export type Framing = 'MEDIUM' | 'CLOSE';
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
}
