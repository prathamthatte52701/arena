import { attacks, type AttackData, type AttackId } from './definitions';

export type CombatState = 'IDLE' | 'LOCOMOTION' | 'STRIKE_STARTUP' | 'STRIKE_ACTIVE' | 'STRIKE_RECOVERY' | 'BLOCKING' | 'HIT_REACTION' | 'STUNNED' | 'KNOCKED_DOWN' | 'RECOVERING';
export type CombatSide = 'player' | 'cpu';
export type CombatActor = { side: CombatSide; health: number; stamina: number; momentum: number; state: CombatState; stateTime: number; attack?: AttackData; hitApplied: boolean; blocking: boolean; lastEvent: string };
export type CombatEvent = { side: CombatSide; kind: 'attack-start' | 'hit' | 'blocked' | 'miss' | 'knockdown' | 'recover' | 'stun'; attack?: AttackId; damage?: number; target?: CombatSide };

export const createCombatActor = (side: CombatSide): CombatActor => ({ side, health: 100, stamina: 100, momentum: 0, state: 'IDLE', stateTime: 0, hitApplied: false, blocking: false, lastEvent: '' });
const activeStates = new Set<CombatState>(['STRIKE_STARTUP', 'STRIKE_ACTIVE', 'STRIKE_RECOVERY', 'HIT_REACTION', 'STUNNED', 'KNOCKED_DOWN', 'RECOVERING']);
export const movementAllowed = (state: CombatState) => !activeStates.has(state) && state !== 'BLOCKING';
export const canAcceptAction = (actor: CombatActor) => actor.health > 0 && !activeStates.has(actor.state) && actor.state !== 'BLOCKING';

export class CombatSystem {
  readonly player = createCombatActor('player');
  readonly cpu = createCombatActor('cpu');
  private cpuClock = 2.4;
  private events: CombatEvent[] = [];
  requestAttack(side: CombatSide, attackId: AttackId) {
    const actor = this[side], attack = attacks[attackId];
    if (!canAcceptAction(actor) || actor.stamina < attack.staminaCost) return false;
    actor.attack = attack; actor.state = 'STRIKE_STARTUP'; actor.stateTime = 0; actor.hitApplied = false; actor.stamina -= attack.staminaCost; actor.lastEvent = attackId + ' startup'; this.events.push({ side, kind: 'attack-start', attack: attackId }); return true;
  }
  setBlock(side: CombatSide, active: boolean) {
    const actor = this[side];
    if (active && canAcceptAction(actor)) { actor.blocking = true; actor.state = 'BLOCKING'; actor.stateTime = 0; }
    if (!active && actor.blocking) { actor.blocking = false; actor.state = 'IDLE'; actor.stateTime = 0; }
  }
  tick(dt: number, distance: number, options: { cpuEnabled?: boolean } = {}) {
    if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(distance) || distance < 0) return [];
    const cpuEnabled = options.cpuEnabled ?? true;
    this.events = [];
    this.tickActor(this.player, this.cpu, dt, distance); this.tickActor(this.cpu, this.player, dt, distance);
    this.cpuClock += dt;
    if (cpuEnabled && this.cpuClock > 2.8 && distance <= attacks.light.range + .25 && canAcceptAction(this.cpu)) { this.requestAttack('cpu', 'light'); this.cpuClock = 0; }
    for (const actor of [this.player, this.cpu]) if (actor.state !== 'BLOCKING') actor.stamina = Math.min(100, actor.stamina + (activeStates.has(actor.state) ? 3 : 14) * dt);
    return this.events.slice();
  }
  private tickActor(actor: CombatActor, target: CombatActor, dt: number, distance: number) {
    actor.stateTime += dt;
    if (actor.state === 'STRIKE_STARTUP' && actor.attack && actor.stateTime >= actor.attack.startup) { actor.state = 'STRIKE_ACTIVE'; actor.stateTime = 0; actor.lastEvent = actor.attack.id + ' active'; }
    else if (actor.state === 'STRIKE_ACTIVE' && actor.attack && actor.stateTime >= actor.attack.activeWindow) { if (!actor.hitApplied) this.resolveHit(actor, target, distance); actor.state = 'STRIKE_RECOVERY'; actor.stateTime = 0; }
    else if (actor.state === 'STRIKE_RECOVERY' && actor.attack && actor.stateTime >= actor.attack.recovery) this.finish(actor);
    else if ((actor.state === 'HIT_REACTION' || actor.state === 'STUNNED') && actor.stateTime >= .35) this.finish(actor);
    else if (actor.state === 'KNOCKED_DOWN' && actor.stateTime >= 1.2) { actor.state = 'RECOVERING'; actor.stateTime = 0; actor.lastEvent = 'recovery'; this.events.push({ side: actor.side, kind: 'recover' }); }
    else if (actor.state === 'RECOVERING' && actor.stateTime >= .55) this.finish(actor);
  }
  private resolveHit(attacker: CombatActor, target: CombatActor, distance: number) {
    attacker.hitApplied = true; const attack = attacker.attack; if (!attack) return;
    if (distance > attack.range || target.health <= 0) { attacker.lastEvent = attack.id + ' miss'; this.events.push({ side: attacker.side, kind: 'miss', attack: attack.id, target: target.side }); return; }
    const blocked = target.blocking; const damage = blocked ? Math.max(1, attack.damage * .2) : attack.damage; target.health = Math.max(0, target.health - damage); target.momentum = Math.min(100, target.momentum + (blocked ? 2 : damage)); attacker.momentum = Math.min(100, attacker.momentum + attack.momentumGain); attacker.lastEvent = blocked ? attack.id + ' blocked' : attack.id + ' hit'; this.events.push({ side: attacker.side, kind: blocked ? 'blocked' : 'hit', attack: attack.id, damage, target: target.side });
    if (target.health <= 0 || (!blocked && attack.knockdownChance >= 1)) { target.state = 'KNOCKED_DOWN'; target.stateTime = 0; target.blocking = false; this.events.push({ side: target.side, kind: 'knockdown', target: target.side }); }
    else if (!blocked) { target.state = attack.damage >= 15 ? 'STUNNED' : 'HIT_REACTION'; target.stateTime = 0; this.events.push({ side: target.side, kind: 'stun', target: target.side }); }
  }
  private finish(actor: CombatActor) { actor.state = 'IDLE'; actor.stateTime = 0; actor.attack = undefined; actor.hitApplied = false; actor.lastEvent = ''; }
}
