export type AttackId = 'light' | 'heavy';
export type AttackData = {
  id: AttackId; type: 'strike'; animation: 'Walk'; range: number; damage: number; staminaCost: number; momentumGain: number;
  startup: number; activeWindow: number; recovery: number; hitReaction: number; knockdownChance: number;
};
export const attacks: Record<AttackId, AttackData> = {
  light: { id: 'light', type: 'strike', animation: 'Walk', range: 1.7, damage: 8, staminaCost: 10, momentumGain: 9, startup: .18, activeWindow: .12, recovery: .34, hitReaction: .28, knockdownChance: 0 },
  heavy: { id: 'heavy', type: 'strike', animation: 'Walk', range: 1.85, damage: 18, staminaCost: 22, momentumGain: 16, startup: .32, activeWindow: .16, recovery: .58, hitReaction: .42, knockdownChance: 1 },
};
