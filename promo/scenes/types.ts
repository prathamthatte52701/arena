import type { BodyPoseName, Framing } from '../body/types.ts';
import type { CameraStateName } from '../camera/types.ts';
import type { GestureName } from '../gestures/types.ts';
import type { Gaze, Tone } from '../performance/types.ts';

export const SCENE_NAMES = ['INTERVIEW', 'BACKSTAGE', 'RING_ARENA', 'PRESS_CONFERENCE'] as const;

export type SceneName = (typeof SCENE_NAMES)[number];
export type SceneBackground = 'CONTROLLED_STUDIO' | 'INTIMATE_BACKSTAGE' | 'ARENA_LIGHTS' | 'PRESS_MEDIA_WALL';
export type SceneContainer = 'INTERVIEW_SPLIT' | 'BACKSTAGE_PROMO' | 'RING_PRESENTATION' | 'PRESS_DAIS';
export type SceneTextPlacement = 'RIGHT_PANEL' | 'LOWER_RIGHT' | 'RINGSIDE_RIGHT' | 'PRESS_RIGHT';

export interface SceneSafeTextArea {
  placement: SceneTextPlacement;
  maxWidthPercent: number;
  insetPercent: number;
}

export interface SceneDefinition {
  name: SceneName;
  label: string;
  eyebrow: string;
  prompt: string;
  description: string;
  background: SceneBackground;
  container: SceneContainer;
  defaultFraming: Framing;
  allowedFramings: readonly Framing[];
  defaultPose: BodyPoseName;
  allowedPoses: readonly BodyPoseName[];
  defaultGesture: GestureName;
  allowedGestures: readonly GestureName[];
  defaultCamera: CameraStateName;
  allowedCameraStates: readonly CameraStateName[];
  safeTextArea: SceneSafeTextArea;
}

export type RheaSceneDefinition = SceneDefinition;

export interface SceneFrame extends SceneDefinition {
  requestedName: string | null;
  usedFallback: boolean;
}

export interface SceneControllerConfig {
  definitions: Readonly<Record<SceneName, SceneDefinition>>;
  fallbackScene: SceneName;
}

export type SceneRuntimeChoice = Readonly<{
  framing: Framing;
  pose: BodyPoseName;
  gesture: GestureName;
  camera: CameraStateName;
  gaze: Gaze;
}>;

export interface SceneRuntimeConfig extends SceneControllerConfig {
  policies: Readonly<Record<SceneName, Readonly<Record<Tone, SceneRuntimeChoice>>>>;
  restGaze: Readonly<Record<SceneName, Gaze>>;
}
