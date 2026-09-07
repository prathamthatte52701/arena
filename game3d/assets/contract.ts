import type { MovementTuning, Motion } from '../core/movement';
export type CharacterAsset = {
  modelPath: string;
  label: string;
  scale: number;
  rotationOffset: number;
  animations: { idle: string; walk: string; run?: string };
  movement: MovementTuning;
};
export const developmentHumanoid: CharacterAsset = {
  modelPath: '/models/development/humanoid.glb',
  label: 'Temporary development character',
  scale: 1,
  rotationOffset: 0,
  animations: { idle: 'Idle', walk: 'Walk', run: 'Run' },
  movement: { walkSpeed: 1.65, runSpeed: 3.8, turnRate: 12, limit: 16 },
};
export function animationFor(motion: Motion, mapping: CharacterAsset['animations']) {
  return motion === 'run' ? mapping.run ?? mapping.walk : mapping[motion];
}
