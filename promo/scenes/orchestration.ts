import type { BodyPoseName, Framing } from '../body/types.ts';
import type { CameraRequest, CameraStateName } from '../camera/types.ts';
import type { GestureName, GestureRequest } from '../gestures/types.ts';
import { GAZES } from '../face/gaze.ts';
import type { Gaze, PerformanceTarget, Tone } from '../performance/types.ts';
import { isVoiceTone } from '../voice/darkPowerVoiceProfile.ts';
import { resolveRheaScene } from './controller.ts';
import type { RheaSceneDefinition, SceneName } from './types.ts';

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
  text: string;
  tone: unknown;
  mode?: unknown;
  framing?: unknown;
  pose?: unknown;
  gesture?: unknown;
  camera?: unknown;
  gaze?: unknown;
}

type RuntimeChoice = Pick<SceneRuntimePlan, 'framing' | 'pose' | 'gesture' | 'camera' | 'gaze'>;

const POLICIES = {
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
} as const satisfies Readonly<Record<SceneName, Readonly<Record<Tone, RuntimeChoice>>>>;

const REST_GAZE: Readonly<Record<SceneName, Gaze>> = Object.freeze({
  INTERVIEW: 'INTERVIEWER',
  BACKSTAGE: 'CAMERA',
  RING_ARENA: 'CAMERA',
  PRESS_CONFERENCE: 'CAMERA',
});

function legal<T extends string>(requested: unknown, allowed: readonly T[], fallback: T): T {
  return typeof requested === 'string' && allowed.includes(requested as T) ? requested as T : fallback;
}

function safeRest(scene: RheaSceneDefinition): RuntimeChoice {
  return {
    framing: scene.defaultFraming,
    pose: scene.defaultPose,
    gesture: scene.defaultGesture,
    camera: scene.defaultCamera,
    gaze: REST_GAZE[scene.name],
  };
}

export function createSceneRuntimePlan(request: SceneRuntimeRequest): SceneRuntimePlan {
  const scene = resolveRheaScene(request.scene);
  const tone: Tone = isVoiceTone(request.tone) ? request.tone : 'AUTO';
  const mode: SceneRuntimeMode = request.mode === 'REST' ? 'REST' : 'SPEAKING';
  const policy = mode === 'REST' ? safeRest(scene) : POLICIES[scene.name][tone];
  return Object.freeze({
    scene: scene.name,
    requestedScene: typeof request.scene === 'string' ? request.scene : null,
    usedFallback: request.scene !== scene.name,
    text: request.text,
    tone,
    mode,
    framing: legal(request.framing, scene.allowedFramings, policy.framing),
    pose: legal(request.pose, scene.allowedPoses, policy.pose),
    gesture: legal(request.gesture, scene.allowedGestures, policy.gesture),
    camera: legal(request.camera, scene.allowedCameraStates, policy.camera),
    gaze: typeof request.gaze === 'string' && GAZES.some(gaze => gaze === request.gaze) ? request.gaze as Gaze : policy.gaze,
  });
}

export function remapSceneRuntimePlan(plan: SceneRuntimePlan, scene: unknown): SceneRuntimePlan {
  return createSceneRuntimePlan({ scene, text: plan.text, tone: plan.tone, mode: plan.mode });
}

export function stopSceneRuntimePlan(plan: SceneRuntimePlan): SceneRuntimePlan {
  return createSceneRuntimePlan({ scene: plan.scene, text: plan.text, tone: plan.tone, mode: 'REST' });
}

export function restartSceneRuntimePlan(plan: SceneRuntimePlan): SceneRuntimePlan {
  return createSceneRuntimePlan({ scene: plan.scene, text: plan.text, tone: plan.tone, mode: 'SPEAKING' });
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
