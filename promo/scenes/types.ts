import type { BodyPoseName, Framing } from '../body/types.ts';
import type { CameraStateName } from '../camera/types.ts';
import type { GestureName } from '../gestures/types.ts';

export const SCENE_NAMES = ['INTERVIEW', 'BACKSTAGE', 'RING_ARENA'] as const;

export type SceneName = (typeof SCENE_NAMES)[number];
export type SceneBackground = 'CONTROLLED_STUDIO' | 'INTIMATE_BACKSTAGE' | 'ARENA_LIGHTS';
export type SceneContainer = 'INTERVIEW_SPLIT' | 'BACKSTAGE_PROMO' | 'RING_PRESENTATION';
export type SceneTextPlacement = 'RIGHT_PANEL' | 'LOWER_RIGHT' | 'RINGSIDE_RIGHT';

export interface SceneSafeTextArea {
  placement: SceneTextPlacement;
  maxWidthPercent: number;
  insetPercent: number;
}

export interface RheaSceneDefinition {
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
  allowedCameraStates: readonly CameraStateName[];
  safeTextArea: SceneSafeTextArea;
}

export interface SceneFrame extends RheaSceneDefinition {
  requestedName: string | null;
  usedFallback: boolean;
}
