export type EntranceIdentity = 'RHEA' | 'CHYNA' | 'CHARLOTTE' | 'BIANCA';
export type EntranceState = 'NOT_STARTED' | 'STAGE' | 'RAMP' | 'RINGSIDE' | 'RING_ENTRY' | 'RING_POSE' | 'COMPLETE' | 'SKIPPED';
export type EntranceEvent = { time: number; state: Exclude<EntranceState, 'NOT_STARTED' | 'COMPLETE' | 'SKIPPED'>; camera: 'stage-hero' | 'ramp-tracking' | 'ringside' | 'ring-entry' | 'close-presentation'; action: 'reveal' | 'pose' | 'walk' | 'enter' | 'ring-pose'; presentation: string };
export type EntranceProfile = { identity: EntranceIdentity; pace: number; events: EntranceEvent[] };

const event = (time: number, state: EntranceEvent['state'], camera: EntranceEvent['camera'], action: EntranceEvent['action'], presentation: string): EntranceEvent => ({ time, state, camera, action, presentation });
export const entranceProfiles: Record<EntranceIdentity, EntranceProfile> = {
  RHEA: { identity: 'RHEA', pace: .78, events: [event(0, 'STAGE', 'stage-hero', 'reveal', 'RHEA · THE ERADICATOR'), event(1.4, 'STAGE', 'close-presentation', 'pose', 'INTIMIDATING POWER'), event(2.8, 'RAMP', 'ramp-tracking', 'walk', 'THE WALKDOWN'), event(6.2, 'RINGSIDE', 'ringside', 'pose', 'RINGSIDE ARRIVAL'), event(7.4, 'RING_ENTRY', 'ring-entry', 'enter', 'INTO THE RING'), event(8.7, 'RING_POSE', 'close-presentation', 'ring-pose', 'READY FOR WAR')] },
  CHYNA: { identity: 'CHYNA', pace: .95, events: [event(0, 'STAGE', 'stage-hero', 'reveal', 'CHYNA · THE NINTH WONDER'), event(1.05, 'STAGE', 'stage-hero', 'pose', 'POWERHOUSE SALUTE'), event(2.2, 'RAMP', 'ramp-tracking', 'walk', 'DOMINANT MARCH'), event(5.2, 'RINGSIDE', 'ringside', 'pose', 'RINGSIDE ARRIVAL'), event(6.15, 'RING_ENTRY', 'ring-entry', 'enter', 'INTO THE RING'), event(7.25, 'RING_POSE', 'close-presentation', 'ring-pose', 'POWER POSE')] },
  CHARLOTTE: { identity: 'CHARLOTTE', pace: 1.08, events: [event(0, 'STAGE', 'stage-hero', 'reveal', 'CHARLOTTE · THE QUEEN'), event(1.8, 'STAGE', 'close-presentation', 'pose', 'COMPOSED REVEAL'), event(3.5, 'RAMP', 'ramp-tracking', 'walk', 'GRAND PROCESSION'), event(7.1, 'RINGSIDE', 'ringside', 'pose', 'RINGSIDE ARRIVAL'), event(8.1, 'RING_ENTRY', 'ring-entry', 'enter', 'INTO THE RING'), event(9.3, 'RING_POSE', 'close-presentation', 'ring-pose', 'ROYAL READY')] },
  BIANCA: { identity: 'BIANCA', pace: 1.35, events: [event(0, 'STAGE', 'stage-hero', 'reveal', 'BIANCA · THE EST'), event(.9, 'STAGE', 'stage-hero', 'pose', 'ATHLETIC FLASH'), event(1.9, 'RAMP', 'ramp-tracking', 'walk', 'HIGH-ENERGY SPRINT'), event(4.4, 'RINGSIDE', 'ringside', 'pose', 'RINGSIDE ARRIVAL'), event(5.2, 'RING_ENTRY', 'ring-entry', 'enter', 'INTO THE RING'), event(6.3, 'RING_POSE', 'close-presentation', 'ring-pose', 'EST. READY')] },
};

export class EntranceController {
  readonly profile: EntranceProfile; state: EntranceState = 'NOT_STARTED'; time = 0; index = -1; event?: EntranceEvent; skipped = false;
  constructor(identity: EntranceIdentity) { this.profile = entranceProfiles[identity]; }
  start() { if (this.state === 'NOT_STARTED') { this.state = 'STAGE'; this.index = 0; this.event = this.profile.events[0]; } }
  skip() { if (this.state !== 'COMPLETE' && this.state !== 'SKIPPED') { this.skipped = true; this.state = 'SKIPPED'; this.time = this.profile.events.at(-1)?.time ?? 0; this.event = undefined; } }
  tick(dt: number) { if (!Number.isFinite(dt) || dt <= 0) return; if (this.state === 'NOT_STARTED' || this.state === 'COMPLETE' || this.state === 'SKIPPED') return; this.time += dt * this.profile.pace; while (this.index + 1 < this.profile.events.length && this.time >= this.profile.events[this.index + 1].time) { this.index++; this.event = this.profile.events[this.index]; this.state = this.event.state; } if (this.index === this.profile.events.length - 1 && this.time >= this.profile.events[this.index].time + .8) this.state = 'COMPLETE'; }
}
