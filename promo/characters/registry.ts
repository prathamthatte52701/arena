import { rheaCharacter } from './rhea.ts';
import { CHARACTER_IDS, type CharacterDefinition, type CharacterId } from './types.ts';

export const CHARACTER_REGISTRY: Readonly<Record<CharacterId, CharacterDefinition>> = Object.freeze({
  RHEA: rheaCharacter,
});

export function resolveCharacterId(value: unknown): CharacterId {
  return typeof value === 'string' && Object.hasOwn(CHARACTER_REGISTRY, value)
    ? value as CharacterId
    : 'RHEA';
}

export function resolveCharacter(value: unknown): CharacterDefinition {
  return CHARACTER_REGISTRY[resolveCharacterId(value)];
}

export function enabledCharacters(): readonly CharacterDefinition[] {
  return CHARACTER_IDS.map(id => CHARACTER_REGISTRY[id]).filter(character => character.enabled);
}
