import { RHEA_SCENES } from './rheaScenes.ts';
import type { RheaSceneDefinition, SceneFrame, SceneName } from './types.ts';

export function resolveRheaScene(value: string | null | undefined): RheaSceneDefinition {
  const name = value && value in RHEA_SCENES ? value as SceneName : 'INTERVIEW';
  return RHEA_SCENES[name];
}

export function createSceneController() {
  return {
    sample(value: string | null | undefined): SceneFrame {
      const resolved = resolveRheaScene(value);
      return {
        ...resolved,
        requestedName: value ?? null,
        usedFallback: value !== resolved.name,
      };
    },
  };
}
