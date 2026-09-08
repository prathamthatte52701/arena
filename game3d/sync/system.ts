export type SyncState = 'FREE' | 'GRAPPLE_ATTEMPT' | 'GRAPPLE_CONNECTED' | 'SYNCHRONIZED_MOVE' | 'SUBMISSION' | 'RELEASE' | 'RECOVERY';
export type SyncMoveId = 'basic-grapple' | 'power-throw' | 'submission' | 'signature' | 'finisher';
export type SyncEventKind = 'attempt' | 'miss' | 'connected' | 'impact' | 'escape' | 'submit' | 'release' | 'recover';
export type SyncMove = { id: SyncMoveId; duration: number; startup: number; staminaCost: number; momentumRequired: number; momentumGain: number; damage: number; submission?: boolean };
export type SyncResources = { stamina: number; momentum: number };
export type SyncPose = { x: number; z: number; yaw: number };
export type SyncEvent = { kind: SyncEventKind; move: SyncMoveId };

export const syncMoves: Record<SyncMoveId, SyncMove> = {
  'basic-grapple': { id: 'basic-grapple', duration: .7, startup: .16, staminaCost: 10, momentumRequired: 0, momentumGain: 8, damage: 4 },
  'power-throw': { id: 'power-throw', duration: 1.15, startup: .2, staminaCost: 18, momentumRequired: 20, momentumGain: 12, damage: 24 },
  submission: { id: 'submission', duration: 2.2, startup: .22, staminaCost: 20, momentumRequired: 10, momentumGain: 8, damage: 12, submission: true },
  signature: { id: 'signature', duration: 1.35, startup: .24, staminaCost: 26, momentumRequired: 35, momentumGain: 18, damage: 30 },
  finisher: { id: 'finisher', duration: 1.8, startup: .3, staminaCost: 34, momentumRequired: 70, momentumGain: 25, damage: 50 },
};

const approach = (value: number, target: number, amount: number) => value + (target - value) * Math.min(1, amount);
const lockedStates = new Set<SyncState>(['GRAPPLE_ATTEMPT', 'GRAPPLE_CONNECTED', 'SYNCHRONIZED_MOVE', 'SUBMISSION', 'RELEASE', 'RECOVERY']);

export class SyncController {
  state: SyncState = 'FREE';
  stateTime = 0;
  move?: SyncMove;
  event?: SyncEvent;
  cameraCue = false;
  submissionProgress = 0;
  escapeProgress = 0;
  private distance = Infinity;
  private resources?: SyncResources;

  get movementLocked() { return lockedStates.has(this.state); }
  get moveId() { return this.move?.id ?? ''; }

  requestMove(id: SyncMoveId, distance: number, resources: SyncResources) {
    const move = syncMoves[id];
    if (!move || !Number.isFinite(distance) || distance < 0 || !Number.isFinite(resources.stamina) || !Number.isFinite(resources.momentum)) return false;
    if (this.state !== 'FREE' || resources.stamina < move.staminaCost || resources.momentum < move.momentumRequired) return false;
    resources.stamina -= move.staminaCost;
    if (move.momentumRequired) resources.momentum -= move.momentumRequired;
    this.move = move; this.resources = resources; this.distance = distance; this.state = 'GRAPPLE_ATTEMPT'; this.stateTime = 0; this.cameraCue = true; this.event = { kind: 'attempt', move: id }; this.submissionProgress = 0; this.escapeProgress = 0;
    return true;
  }

  tick(dt: number, attacker: SyncPose, receiver: SyncPose, escapePressed = false) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (!this.move || this.state === 'FREE') return;
    this.stateTime += dt;
    const move = this.move;
    if (this.state === 'GRAPPLE_ATTEMPT' && this.stateTime >= move.startup) {
      if (this.distance > 1.9) { this.state = 'RELEASE'; this.stateTime = 0; this.event = { kind: 'miss', move: move.id }; }
      else { this.state = move.submission ? 'SUBMISSION' : 'GRAPPLE_CONNECTED'; this.stateTime = 0; this.event = { kind: 'connected', move: move.id }; }
    } else if (this.state === 'GRAPPLE_CONNECTED' && this.stateTime >= .12) {
      this.state = 'SYNCHRONIZED_MOVE'; this.stateTime = 0;
    } else if (this.state === 'SUBMISSION') {
      this.submissionProgress = Math.min(1, this.submissionProgress + dt / move.duration);
      if (escapePressed) this.escapeProgress = Math.min(1, this.escapeProgress + dt / .55);
      if (this.escapeProgress >= 1) { this.state = 'RELEASE'; this.stateTime = 0; this.event = { kind: 'escape', move: move.id }; }
      else if (this.submissionProgress >= 1) { this.state = 'RELEASE'; this.stateTime = 0; this.event = { kind: 'submit', move: move.id }; }
    } else if (this.state === 'SYNCHRONIZED_MOVE' && this.stateTime >= move.duration) {
      if (this.resources) { this.resources.momentum = Math.min(100, this.resources.momentum + move.momentumGain); }
      this.state = 'RELEASE'; this.stateTime = 0; this.event = { kind: 'impact', move: move.id };
    } else if (this.state === 'RELEASE' && this.stateTime >= .18) {
      this.state = 'RECOVERY'; this.stateTime = 0; this.event = { kind: 'release', move: move.id };
    } else if (this.state === 'RECOVERY' && this.stateTime >= .35) {
      this.state = 'FREE'; this.stateTime = 0; this.cameraCue = false; this.event = { kind: 'recover', move: move.id }; this.move = undefined; this.resources = undefined;
    }
    if (this.movementLocked && this.state !== 'RELEASE' && this.state !== 'RECOVERY') {
      const angle = attacker.yaw; const targetX = attacker.x + Math.sin(angle) * .78; const targetZ = attacker.z + Math.cos(angle) * .78;
      receiver.x = approach(receiver.x, targetX, dt * 14); receiver.z = approach(receiver.z, targetZ, dt * 14); receiver.yaw = approach(receiver.yaw, attacker.yaw, dt * 14);
    }
  }
}
