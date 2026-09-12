import type { SceneControllerConfig, SceneDefinition, SceneFrame, SceneName } from './types.ts';

export function resolveScene(config: SceneControllerConfig, value: unknown): SceneDefinition {
  const name = typeof value === 'string' && Object.hasOwn(config.definitions, value)
    ? value as SceneName
    : config.fallbackScene;
  return config.definitions[name];
}

export function createSceneController(config: SceneControllerConfig) {
  return {
    sample(value: unknown): SceneFrame {
      const resolved = resolveScene(config, value);
      return {
        ...resolved,
        requestedName: typeof value === 'string' ? value : null,
        usedFallback: value !== resolved.name,
      };
    },
  };
}
