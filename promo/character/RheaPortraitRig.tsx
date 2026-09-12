'use client';
import { rheaCharacter } from '../characters/rhea.ts';
import { CharacterPortraitRig, type CharacterPortraitRigProps } from './CharacterPortraitRig.tsx';

export function RheaPortraitRig(props: Omit<CharacterPortraitRigProps, 'character'>) {
  return <CharacterPortraitRig {...props} character={rheaCharacter} />;
}
