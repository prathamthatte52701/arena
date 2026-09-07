import { advancePlayer, createPlayer, dampFactor, turnToward, type Intent, type MovementTuning, type PlayerState } from '../core/movement';

export type MatchActor = PlayerState & { role: 'player' | 'cpu' };
export type RingBounds = { minX: number; maxX: number; minZ: number; maxZ: number };
export const ringBounds: RingBounds = { minX: -3.7, maxX: 3.7, minZ: -2.25, maxZ: 2.25 };
export const matchMovement: MovementTuning = { walkSpeed: 1.65, runSpeed: 3.4, turnRate: 10, limit: 16 };
export const createActor = (role: MatchActor['role'], x: number, z: number): MatchActor => ({ ...createPlayer(), role, position: { x, y: 0, z } });

export function clampToRing(position: { x: number; y: number; z: number }, bounds = ringBounds) {
  position.x = Math.max(bounds.minX, Math.min(bounds.maxX, position.x));
  position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, position.z));
  position.y = 0;
  return position;
}

export function cpuIntent(cpu: MatchActor, player: MatchActor, elapsed: number): Intent {
  const dx = player.position.x - cpu.position.x, dz = player.position.z - cpu.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance > 2.55) return { x: dx, z: dz, run: false };
  if (distance < 1.9) return { x: -dx, z: -dz, run: false };
  const lateral = Math.sin(elapsed * .9) * .45;
  return { x: -dz * lateral, z: dx * lateral, run: false };
}

export function resolveSeparation(a: MatchActor, b: MatchActor, minimum = 1.25, bounds = ringBounds) {
  const dx = b.position.x - a.position.x, dz = b.position.z - a.position.z, distance = Math.hypot(dx, dz);
  if (distance >= minimum) return distance;
  const nx = distance > .0001 ? dx / distance : 1, nz = distance > .0001 ? dz / distance : 0;
  const correction = (minimum - distance) * .5;
  a.position.x -= nx * correction; a.position.z -= nz * correction;
  b.position.x += nx * correction; b.position.z += nz * correction;
  clampToRing(a.position, bounds); clampToRing(b.position, bounds);
  return Math.hypot(b.position.x - a.position.x, b.position.z - a.position.z);
}

export function faceActors(a: MatchActor, b: MatchActor, dt: number) {
  const aTarget = Math.atan2(b.position.x - a.position.x, b.position.z - a.position.z);
  const bTarget = Math.atan2(a.position.x - b.position.x, a.position.z - b.position.z);
  a.yaw = turnToward(a.yaw, aTarget, dt, 8); b.yaw = turnToward(b.yaw, bTarget, dt, 8);
}

export function tickMatch(player: MatchActor, cpu: MatchActor, intent: Intent, dt: number, elapsed: number) {
  advancePlayer(player, intent, dt, matchMovement, true); clampToRing(player.position, ringBounds);
  advancePlayer(cpu, cpuIntent(cpu, player, elapsed), dt, matchMovement, false); clampToRing(cpu.position, ringBounds);
  const separation = resolveSeparation(player, cpu); faceActors(player, cpu, dt);
  return { separation, cpuMotion: cpu.motion };
}

export function dampedMidpoint(a: MatchActor, b: MatchActor, dt: number, current: { x: number; y: number; z: number }) {
  const blend = dampFactor(7, dt); const target = { x: (a.position.x + b.position.x) * .5, y: 1.05, z: (a.position.z + b.position.z) * .5 };
  current.x += (target.x - current.x) * blend; current.y += (target.y - current.y) * blend; current.z += (target.z - current.z) * blend; return current;
}
