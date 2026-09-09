import type { Expression, FacePose } from '../performance/types';

export const EXPRESSIONS: Expression[] = ['NEUTRAL', 'CONFIDENT', 'SMIRK', 'SERIOUS', 'INTIMIDATING', 'MOCKING'];
// Pixel displacements use the 1122 × 1402 V2 front reference, never screen pixels.
// Closed lips are preserved. These are restrained listening/performance poses.
export const POSES: Record<Expression, FacePose> = {
  NEUTRAL: { head: 0, chin: 0, brow: 0, squint: 0, smile: 0, asymmetry: 0, posture: 0 },
  CONFIDENT: { head: -0.8, chin: -2.2, brow: -1.2, squint: 0.07, smile: 1.6, asymmetry: 0.2, posture: -1.3 },
  SMIRK: { head: 1.6, chin: -0.8, brow: -1.5, squint: 0.11, smile: 3.6, asymmetry: 0.9, posture: -0.7 },
  SERIOUS: { head: -0.3, chin: 1.4, brow: 2, squint: 0.12, smile: -1.3, asymmetry: 0, posture: 0.7 },
  INTIMIDATING: { head: -1, chin: 3.5, brow: 3.2, squint: 0.23, smile: -1.7, asymmetry: 0.1, posture: -2 },
  MOCKING: { head: 2.2, chin: -1, brow: -2.5, squint: 0.15, smile: 3.2, asymmetry: 1, posture: 1.2 },
};

export function follow(current: number, target: number, dt: number, response = 0.22) {
  return current + (target - current) * (1 - Math.exp(-Math.max(0, dt) / response));
}

export function blendPose(current: FacePose, target: FacePose, dt: number): FacePose {
  return Object.fromEntries(Object.entries(current).map(([key, value]) =>
    [key, follow(value, target[key as keyof FacePose], dt, 0.24)])) as unknown as FacePose;
}
