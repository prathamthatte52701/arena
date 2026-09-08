export type Motion = 'idle' | 'walk' | 'run';
export type Vec3 = { x: number; y: number; z: number };
export type Intent = { x: number; z: number; run: boolean };
export type MovementTuning = { walkSpeed: number; runSpeed: number; turnRate: number; limit: number };
export type PlayerState = { position: Vec3; yaw: number; speed: number; motion: Motion };
export const createPlayer = (): PlayerState => ({ position: { x: 0, y: 0, z: 0 }, yaw: Math.PI, speed: 0, motion: 'idle' });
export const dampFactor = (rate: number, dt: number) => 1 - Math.exp(-rate * Math.max(0, dt));
export function turnToward(yaw: number, target: number, dt: number, rate: number) {
  const shortest = Math.atan2(Math.sin(target - yaw), Math.cos(target - yaw));
  return yaw + shortest * dampFactor(rate, dt);
}
export function advancePlayer(player: PlayerState, intent: Intent, dt: number, tuning: MovementTuning, canRun = true) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  if (!Number.isFinite(intent.x) || !Number.isFinite(intent.z)) return;
  const length = Math.hypot(intent.x, intent.z);
  const speed = length > 0 ? (intent.run && canRun ? tuning.runSpeed : tuning.walkSpeed) : 0;
  const x = length > 0 ? intent.x / length : 0, z = length > 0 ? intent.z / length : 0;
  const beforeX = player.position.x, beforeZ = player.position.z;
  player.position.x = Math.max(-tuning.limit, Math.min(tuning.limit, beforeX + x * speed * dt));
  player.position.z = Math.max(-tuning.limit, Math.min(tuning.limit, beforeZ + z * speed * dt));
  player.position.y = 0;
  player.speed = Math.hypot(player.position.x - beforeX, player.position.z - beforeZ) / dt;
  player.motion = player.speed < .001 ? 'idle' : intent.run && canRun ? 'run' : 'walk';
  if (length > 0) player.yaw = turnToward(player.yaw, Math.atan2(x, z), dt, tuning.turnRate);
}

/** Fixed ticks decouple movement from rendering; excess time after a stall is discarded. */
export class FixedClock {
  readonly step = 1 / 60;
  private accumulator = 0;
  advance(delta: number, update: (dt: number) => void) {
    this.accumulator += Math.max(0, Math.min(Number.isFinite(delta) ? delta : 0, .1));
    while (this.accumulator + 1e-10 >= this.step) { update(this.step); this.accumulator = Math.max(0, this.accumulator - this.step); }
    return this.accumulator / this.step;
  }
  reset() { this.accumulator = 0; }
}
