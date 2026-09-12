import type { Tone } from '../performance/types.ts';
import { createSceneController, resolveScene } from './controller.ts';
import {
  createSceneRuntimePlan,
  remapSceneRuntimePlan,
  restartSceneRuntimePlan,
  stopSceneRuntimePlan,
  type SceneRuntimePlan,
} from './orchestration.ts';
import { RHEA_SCENES } from './rheaScenes.ts';
import type { SceneName, SceneRuntimeChoice, SceneRuntimeConfig } from './types.ts';

const policies = {
  INTERVIEW: {
    AUTO: { framing: 'MEDIUM', pose: 'INTERVIEWER', gesture: 'ARMS_RELAXED', camera: 'STATIC_MEDIUM', gaze: 'INTERVIEWER' },
    CONFIDENT: { framing: 'MEDIUM', pose: 'PROMO_FRONT', gesture: 'ARMS_RELAXED', camera: 'SLOW_PUSH_IN', gaze: 'CENTER' },
    COLD: { framing: 'MEDIUM', pose: 'CAMERA_STARE', gesture: 'IDLE', camera: 'STATIC_MEDIUM', gaze: 'CAMERA' },
    MOCKING: { framing: 'MEDIUM', pose: 'INTERVIEWER', gesture: 'HEAD_TILT_EMPHASIS', camera: 'INTERVIEWER_ANGLE', gaze: 'RIGHT' },
    ANGRY: { framing: 'MEDIUM', pose: 'PROMO_FRONT', gesture: 'LEAN_FORWARD', camera: 'SLOW_PUSH_IN', gaze: 'CAMERA' },
    INTIMIDATING: { framing: 'CLOSE', pose: 'CAMERA_STARE', gesture: 'LEAN_FORWARD', camera: 'CLOSE_PROMO', gaze: 'CAMERA' },
    SMIRKING: { framing: 'MEDIUM', pose: 'INTERVIEWER', gesture: 'HEAD_TILT_EMPHASIS', camera: 'CAMERA_STARE', gaze: 'INTERVIEWER' },
  },
  BACKSTAGE: {
    AUTO: { framing: 'MEDIUM', pose: 'PROMO_FRONT', gesture: 'ARMS_RELAXED', camera: 'STATIC_MEDIUM', gaze: 'CAMERA' },
    CONFIDENT: { framing: 'MEDIUM', pose: 'PROMO_FRONT', gesture: 'CHEST_EMPHASIS', camera: 'SLOW_PUSH_IN', gaze: 'CENTER' },
    COLD: { framing: 'MEDIUM', pose: 'THREE_QUARTER', gesture: 'IDLE', camera: 'CAMERA_STARE', gaze: 'CAMERA' },
    MOCKING: { framing: 'MEDIUM', pose: 'THREE_QUARTER', gesture: 'HEAD_TILT_EMPHASIS', camera: 'INTERVIEWER_ANGLE', gaze: 'RIGHT' },
    ANGRY: { framing: 'MEDIUM', pose: 'PROMO_FRONT', gesture: 'CHEST_EMPHASIS', camera: 'SLOW_PUSH_IN', gaze: 'CAMERA' },
    INTIMIDATING: { framing: 'CLOSE', pose: 'PROMO_FRONT', gesture: 'LEAN_FORWARD', camera: 'CLOSE_PROMO', gaze: 'CAMERA' },
    SMIRKING: { framing: 'MEDIUM', pose: 'THREE_QUARTER', gesture: 'HEAD_TILT_EMPHASIS', camera: 'CAMERA_STARE', gaze: 'INTERVIEWER' },
  },
  RING_ARENA: {
    AUTO: { framing: 'FULL', pose: 'POWER_STANCE', gesture: 'ARMS_RELAXED', camera: 'STATIC_FULL', gaze: 'CAMERA' },
    CONFIDENT: { framing: 'FULL', pose: 'POWER_STANCE', gesture: 'CHEST_EMPHASIS', camera: 'SLOW_PUSH_IN', gaze: 'CENTER' },
    COLD: { framing: 'FULL', pose: 'CAMERA_STARE', gesture: 'IDLE', camera: 'STATIC_FULL', gaze: 'CAMERA' },
    MOCKING: { framing: 'MEDIUM', pose: 'PROMO_FRONT', gesture: 'ARMS_RELAXED', camera: 'INTERVIEWER_ANGLE', gaze: 'RIGHT' },
    ANGRY: { framing: 'FULL', pose: 'POWER_STANCE', gesture: 'CHEST_EMPHASIS', camera: 'SLOW_PUSH_IN', gaze: 'CAMERA' },
    INTIMIDATING: { framing: 'MEDIUM', pose: 'CAMERA_STARE', gesture: 'LEAN_FORWARD', camera: 'CLOSE_PROMO', gaze: 'CAMERA' },
    SMIRKING: { framing: 'MEDIUM', pose: 'PROMO_FRONT', gesture: 'ARMS_RELAXED', camera: 'CAMERA_STARE', gaze: 'CAMERA' },
  },
  PRESS_CONFERENCE: {
    AUTO: { framing: 'MEDIUM', pose: 'CAMERA_STARE', gesture: 'IDLE', camera: 'STATIC_MEDIUM', gaze: 'CAMERA' },
    CONFIDENT: { framing: 'MEDIUM', pose: 'PROMO_FRONT', gesture: 'ARMS_RELAXED', camera: 'SLOW_PUSH_IN', gaze: 'CAMERA' },
    COLD: { framing: 'MEDIUM', pose: 'CAMERA_STARE', gesture: 'IDLE', camera: 'CAMERA_STARE', gaze: 'CAMERA' },
    MOCKING: { framing: 'MEDIUM', pose: 'INTERVIEWER', gesture: 'HEAD_TILT_EMPHASIS', camera: 'INTERVIEWER_ANGLE', gaze: 'RIGHT' },
    ANGRY: { framing: 'MEDIUM', pose: 'PROMO_FRONT', gesture: 'ARMS_RELAXED', camera: 'SLOW_PUSH_IN', gaze: 'CAMERA' },
    INTIMIDATING: { framing: 'CLOSE', pose: 'CAMERA_STARE', gesture: 'ARMS_RELAXED', camera: 'CLOSE_PROMO', gaze: 'CAMERA' },
    SMIRKING: { framing: 'MEDIUM', pose: 'CAMERA_STARE', gesture: 'HEAD_TILT_EMPHASIS', camera: 'CAMERA_STARE', gaze: 'CAMERA' },
  },
} as const satisfies Readonly<Record<SceneName, Readonly<Record<Tone, SceneRuntimeChoice>>>>;

function freezeTonePolicy(value: Readonly<Record<Tone, SceneRuntimeChoice>>) {
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([tone, choice]) => [tone, Object.freeze({ ...choice })]),
  )) as Readonly<Record<Tone, SceneRuntimeChoice>>;
}

export const RHEA_SCENE_RUNTIME = Object.freeze({
  definitions: RHEA_SCENES,
  fallbackScene: 'INTERVIEW',
  policies: Object.freeze({
    INTERVIEW: freezeTonePolicy(policies.INTERVIEW),
    BACKSTAGE: freezeTonePolicy(policies.BACKSTAGE),
    RING_ARENA: freezeTonePolicy(policies.RING_ARENA),
    PRESS_CONFERENCE: freezeTonePolicy(policies.PRESS_CONFERENCE),
  }),
  restGaze: Object.freeze({
    INTERVIEW: 'INTERVIEWER',
    BACKSTAGE: 'CAMERA',
    RING_ARENA: 'CAMERA',
    PRESS_CONFERENCE: 'CAMERA',
  }),
}) satisfies SceneRuntimeConfig;

export const resolveRheaScene = (value: unknown) => resolveScene(RHEA_SCENE_RUNTIME, value);
export const createRheaSceneController = () => createSceneController(RHEA_SCENE_RUNTIME);
export const createRheaSceneRuntimePlan = (request: unknown) => createSceneRuntimePlan(RHEA_SCENE_RUNTIME, request);
export const remapRheaSceneRuntimePlan = (plan: SceneRuntimePlan, scene: unknown) => remapSceneRuntimePlan(RHEA_SCENE_RUNTIME, plan, scene);
export const stopRheaSceneRuntimePlan = (plan: SceneRuntimePlan) => stopSceneRuntimePlan(RHEA_SCENE_RUNTIME, plan);
export const restartRheaSceneRuntimePlan = (plan: SceneRuntimePlan) => restartSceneRuntimePlan(RHEA_SCENE_RUNTIME, plan);
