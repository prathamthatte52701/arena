import type { BodyPoseName, Framing } from '../body/types.ts';
import type { CameraRequest, CameraStateName } from '../camera/types.ts';
import type { GestureName, GestureRequest } from '../gestures/types.ts';
import { GAZES } from '../face/gaze.ts';
import type { Gaze, PerformanceTarget, Tone } from '../performance/types.ts';
import { isVoiceTone } from '../voice/darkPowerVoiceProfile.ts';
import { resolveScene } from './controller.ts';
import type { SceneDefinition, SceneName, SceneRuntimeChoice, SceneRuntimeConfig } from './types.ts';

export type SceneRuntimeMode = 'REST' | 'SPEAKING';

export interface SceneRuntimePlan {
  scene: SceneName;
  requestedScene: string | null;
  usedFallback: boolean;
  text: string;
  tone: Tone;
  mode: SceneRuntimeMode;
  framing: Framing;
  pose: BodyPoseName;
  gesture: GestureName;
  camera: CameraStateName;
  gaze: Gaze;
}

export interface SceneRuntimeRequest {
  scene: unknown;
  text: unknown;
  tone: unknown;
  mode?: unknown;
  framing?: unknown;
  pose?: unknown;
  gesture?: unknown;
  camera?: unknown;
  gaze?: unknown;
}

function legal<T extends string>(requested: unknown, allowed: readonly T[], fallback: T): T {
  return typeof requested === 'string' && allowed.includes(requested as T) ? requested as T : fallback;
}

function safeRest(config: SceneRuntimeConfig, scene: SceneDefinition): SceneRuntimeChoice {
  return {
    framing: scene.defaultFraming,
    pose: scene.defaultPose,
    gesture: scene.defaultGesture,
    camera: scene.defaultCamera,
    gaze: config.restGaze[scene.name],
  };
}

export function createSceneRuntimePlan(config: SceneRuntimeConfig, request: unknown): SceneRuntimePlan {
  const source = typeof request === 'object' && request !== null && !Array.isArray(request)
    ? request as Record<string, unknown>
    : {};
  const input = (key: string) => Object.hasOwn(source, key) ? source[key] : undefined;
  const requestedScene = input('scene');
  const requestedTone = input('tone');
  const scene = resolveScene(config, requestedScene);
  const tone: Tone = isVoiceTone(requestedTone) ? requestedTone : 'AUTO';
  const mode: SceneRuntimeMode = input('mode') === 'REST' ? 'REST' : 'SPEAKING';
  const policy = mode === 'REST' ? safeRest(config, scene) : config.policies[scene.name][tone];
  return Object.freeze({
    scene: scene.name,
    requestedScene: typeof requestedScene === 'string' ? requestedScene : null,
    usedFallback: requestedScene !== scene.name,
    text: typeof input('text') === 'string' ? input('text') as string : '',
    tone,
    mode,
    framing: legal(input('framing'), scene.allowedFramings, policy.framing),
    pose: legal(input('pose'), scene.allowedPoses, policy.pose),
    gesture: legal(input('gesture'), scene.allowedGestures, policy.gesture),
    camera: legal(input('camera'), scene.allowedCameraStates, policy.camera),
    gaze: typeof input('gaze') === 'string' && GAZES.some(gaze => gaze === input('gaze')) ? input('gaze') as Gaze : policy.gaze,
  });
}

export function remapSceneRuntimePlan(config: SceneRuntimeConfig, plan: SceneRuntimePlan, scene: unknown): SceneRuntimePlan {
  return createSceneRuntimePlan(config, { scene, text: plan.text, tone: plan.tone, mode: plan.mode });
}

export function stopSceneRuntimePlan(config: SceneRuntimeConfig, plan: SceneRuntimePlan): SceneRuntimePlan {
  return createSceneRuntimePlan(config, { scene: plan.scene, text: plan.text, tone: plan.tone, mode: 'REST' });
}

export function restartSceneRuntimePlan(config: SceneRuntimeConfig, plan: SceneRuntimePlan): SceneRuntimePlan {
  return createSceneRuntimePlan(config, { scene: plan.scene, text: plan.text, tone: plan.tone, mode: 'SPEAKING' });
}

export function orchestratePerformance(plan: SceneRuntimePlan | null, performance: PerformanceTarget | null): PerformanceTarget | null {
  if (!plan || plan.mode !== 'SPEAKING' || !performance || performance.finalHold) return performance;
  return performance.gaze === plan.gaze ? performance : { ...performance, gaze: plan.gaze };
}

export function orchestrateGestureRequest(plan: SceneRuntimePlan | null, request: GestureRequest | null): GestureRequest | null {
  if (!plan || plan.mode !== 'SPEAKING' || !request) return null;
  return { name: plan.gesture, triggerId: `scene:${plan.scene}:${plan.gesture}:${request.triggerId}` };
}

export function orchestrateCameraRequest(plan: SceneRuntimePlan | null, request: CameraRequest | null): CameraRequest | null {
  if (!plan || plan.mode !== 'SPEAKING' || !request) return null;
  const name = request.name === 'FINAL_HOLD' ? 'FINAL_HOLD' : plan.camera;
  return { name, triggerId: `scene:${plan.scene}:${name}:${request.triggerId}` };
}
