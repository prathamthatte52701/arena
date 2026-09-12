import { RHEA_SCENES } from './rheaScenes.ts';
import { SCENE_NAMES, type RheaSceneDefinition, type SceneFrame, type SceneName } from './types.ts';

export function resolveRheaScene(value: unknown): RheaSceneDefinition {
  const name = typeof value === 'string' && SCENE_NAMES.some(scene => scene === value) ? value as SceneName : 'INTERVIEW';
  return RHEA_SCENES[name];
}

export function createSceneController() {
  return {
    sample(value: unknown): SceneFrame {
      const resolved = resolveRheaScene(value);
      return {
        ...resolved,
        requestedName: typeof value === 'string' ? value : null,
        usedFallback: value !== resolved.name,
      };
    },
  };
}
