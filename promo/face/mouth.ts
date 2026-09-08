export type Viseme = 'REST' | 'MBP' | 'FV' | 'AE' | 'O' | 'L' | 'WQ';

export interface MouthDeformation {
  mouthOpen: number;
  mouthWidth: number;
  lipCompress: number;
  lipRound: number;
  lowerLip: number;
  jawDrop: number;
  cornerPull: number;
}

export interface MouthTarget {
  deformation: MouthDeformation;
  immediate?: boolean;
}

export const REST_MOUTH: MouthDeformation = {
  mouthOpen: 0,
  mouthWidth: 0,
  lipCompress: 0,
  lipRound: 0,
  lowerLip: 0,
  jawDrop: 0,
  cornerPull: 0,
};

export const MOUTH_DEFORMATIONS: Record<Viseme, MouthDeformation> = {
  REST: { ...REST_MOUTH },
  MBP: { mouthOpen: 0.02, mouthWidth: -0.12, lipCompress: 0.82, lipRound: 0.02, lowerLip: 0, jawDrop: 0, cornerPull: -0.05 },
  FV: { mouthOpen: 0.12, mouthWidth: 0.05, lipCompress: 0.18, lipRound: 0.02, lowerLip: 0.68, jawDrop: 0.04, cornerPull: 0 },
  AE: { mouthOpen: 0.58, mouthWidth: 0.16, lipCompress: 0, lipRound: 0.04, lowerLip: 0.08, jawDrop: 0.42, cornerPull: 0.12 },
  O: { mouthOpen: 0.46, mouthWidth: -0.18, lipCompress: 0, lipRound: 0.82, lowerLip: 0.05, jawDrop: 0.3, cornerPull: -0.08 },
  L: { mouthOpen: 0.28, mouthWidth: 0.06, lipCompress: 0.08, lipRound: 0.08, lowerLip: 0.2, jawDrop: 0.16, cornerPull: 0.03 },
  WQ: { mouthOpen: 0.2, mouthWidth: -0.08, lipCompress: 0, lipRound: 0.62, lowerLip: 0.04, jawDrop: 0.1, cornerPull: -0.04 },
};

const MOUTH_KEYS = Object.keys(REST_MOUTH) as (keyof MouthDeformation)[];

export function deformationForViseme(viseme: Viseme): MouthDeformation {
  return { ...MOUTH_DEFORMATIONS[viseme] };
}

export function blendMouth(current: MouthDeformation, target: MouthDeformation, dt: number, response = 0.075): MouthDeformation {
  const factor = 1 - Math.exp(-Math.max(0, dt) / response);
  return Object.fromEntries(MOUTH_KEYS.map(key => [key, current[key] + (target[key] - current[key]) * factor])) as unknown as MouthDeformation;
}

export function isSafeMouthDeformation(mouth: MouthDeformation): boolean {
  return Object.values(mouth).every(value => Number.isFinite(value) && value >= -1 && value <= 1);
}

export const MOUTH_STATE = 'REST' as const;
