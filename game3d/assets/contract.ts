import type { MovementTuning, Motion } from '../core/movement';
export type CharacterAsset = {
  modelPath: string;
  label: string;
  scale: number;
  rotationOffset: number;
  animations: { idle: string; walk: string; run?: string };
  movement: MovementTuning;
  appearance?: { skinColor: number; outfitColor: number; accentColor: number; hairColor: number; bodyScale?: [number, number, number] };
};
export const developmentHumanoid: CharacterAsset = {
  modelPath: '/models/development/humanoid.glb',
  label: 'Temporary development character',
  scale: 1,
  rotationOffset: 0,
  animations: { idle: 'Idle', walk: 'Walk', run: 'Run' },
  movement: { walkSpeed: 1.65, runSpeed: 3.8, turnRate: 12, limit: 16 },
};
export const rheaStage1: CharacterAsset = {
  modelPath: '/models/development/humanoid.glb', label: 'Rhea Ripley · Stage 1 development slice', scale: 1.08, rotationOffset: 0,
  animations: { idle: 'Idle', walk: 'Walk', run: 'Run' }, movement: { walkSpeed: 1.65, runSpeed: 3.8, turnRate: 12, limit: 16 },
  appearance: { skinColor: 0xc88772, outfitColor: 0x15151c, accentColor: 0x7b1428, hairColor: 0x101116, bodyScale: [1.08, 1.04, 1.02] },
};
export function animationFor(motion: Motion, mapping: CharacterAsset['animations']) {
  return motion === 'run' ? mapping.run ?? mapping.walk : mapping[motion];
}
