import { RHEA_BODY_POSES } from '../body/poses.ts';
import { rheaBodyProfile } from '../body/rheaBodyProfile.ts';
import { CAMERA_BOUNDS, NEUTRAL_CAMERA_TRANSFORM, RHEA_CAMERA_STATES } from '../camera/rheaCamera.ts';
import { rheaProfile } from '../character/rheaProfile.ts';
import { GESTURE_BOUNDS, NEUTRAL_GESTURE_TRANSFORM, RHEA_GESTURES } from '../gestures/rheaGestures.ts';
import { RHEA_SCENE_RUNTIME } from '../scenes/rheaRuntime.ts';
import type { CharacterDefinition } from './types.ts';

export const rheaCharacter = Object.freeze({
  id: 'RHEA',
  name: 'RHEA',
  enabled: true,
  portrait: rheaProfile,
  body: Object.freeze({ profile: rheaBodyProfile, poses: RHEA_BODY_POSES }),
  gestures: Object.freeze({ definitions: RHEA_GESTURES, bounds: GESTURE_BOUNDS, neutral: NEUTRAL_GESTURE_TRANSFORM }),
  camera: Object.freeze({ definitions: RHEA_CAMERA_STATES, bounds: CAMERA_BOUNDS, neutral: NEUTRAL_CAMERA_TRANSFORM }),
  scenes: RHEA_SCENE_RUNTIME,
}) satisfies CharacterDefinition;
