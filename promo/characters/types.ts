import type { BodyControllerConfig } from '../body/types.ts';
import type { CameraControllerConfig } from '../camera/types.ts';
import type { GestureControllerConfig } from '../gestures/types.ts';
import type { SceneRuntimeConfig } from '../scenes/types.ts';

export const CHARACTER_IDS = ['RHEA'] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export interface PortraitProfile {
  portrait: string;
  width: number;
  height: number;
  eyes: readonly [{ readonly x: number; readonly y: number }, { readonly x: number; readonly y: number }];
  references: Readonly<Record<string, string>>;
}

export interface CharacterDefinition {
  readonly id: CharacterId;
  readonly name: string;
  readonly enabled: boolean;
  readonly portrait: PortraitProfile;
  readonly body: BodyControllerConfig;
  readonly gestures: GestureControllerConfig;
  readonly camera: CameraControllerConfig;
  readonly scenes: SceneRuntimeConfig;
}
