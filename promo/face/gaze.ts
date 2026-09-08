import type { Gaze } from '../performance/types';
export const GAZES: Gaze[] = ['INTERVIEWER', 'CAMERA', 'LEFT', 'RIGHT', 'CENTER'];
export const GAZE_POINTS: Record<Gaze, { x: number; y: number }> = {
  INTERVIEWER: { x: -4.5, y: 0.6 },
  CAMERA: { x: 0, y: -0.7 },
  LEFT: { x: -6, y: 0 },
  RIGHT: { x: 6, y: 0 },
  CENTER: { x: 0, y: 0.6 },
};
