import type { FaceControls, FacePose } from '../performance/types';
import { blendPose, follow, POSES } from './expressions.ts';
import { BLINK_DURATION, blinkClosure, nextBlinkDelay } from './blink.ts';
import { GAZE_POINTS } from './gaze.ts';
import { blendMouth, deformationForViseme, REST_MOUTH, type MouthDeformation, type MouthTarget } from './mouth.ts';

export interface FaceFrame {
  pose: FacePose;
  gazeX: number;
  gazeY: number;
  blink: number;
  headX: number;
  headY: number;
  breath: number;
  mouth: MouthDeformation;
}

// Clock and RNG are injected: no React dependency, timers or hidden globals.
export function createFaceController(random: () => number = Math.random) {
  let previous: number | null = null;
  let nextBlink = 0;
  let blinkStart = -100;
  let request = 0;
  let idleWasOn = false;
  let nextDrift = 0;
  let nextGlance = 0;
  let glanceEnd = 0;
  let glance = 0;
  let driftX = 0;
  let driftY = 0;
  let breathPhase = 0;
  let breathPeriod = 4.3;
  let frame: FaceFrame = { pose: { ...POSES.NEUTRAL }, gazeX: 0, gazeY: 0, blink: 0, headX: 0, headY: 0, breath: 0, mouth: { ...REST_MOUTH } };

  return {
    update(now: number, controls: FaceControls, mouthTarget: MouthTarget = { deformation: REST_MOUTH }): FaceFrame {
      const dt = previous === null ? 0 : Math.min(0.05, Math.max(0, now - previous));
      previous = now;
      if (controls.idle && !idleWasOn) {
        nextBlink = now + nextBlinkDelay(random);
        nextDrift = now;
        nextGlance = now + 3 + random() * 3;
      }
      idleWasOn = controls.idle;
      if (controls.blinkRequest !== request) {
        request = controls.blinkRequest;
        blinkStart = now;
        nextBlink = now + BLINK_DURATION + nextBlinkDelay(random);
      } else if (controls.idle && now >= nextBlink) {
        blinkStart = now;
        nextBlink = now + BLINK_DURATION + nextBlinkDelay(random);
      }
      if (controls.idle && now >= nextDrift) {
        driftX = (random() - 0.5) * 2.4;
        driftY = (random() - 0.5) * 1.7;
        nextDrift = now + 1.8 + random() * 3.2;
      }
      if (controls.idle && now >= nextGlance) {
        glance = (random() - 0.5) * 3;
        glanceEnd = now + 0.35 + random() * 0.65;
        nextGlance = now + 3.5 + random() * 5;
      }
      if (controls.idle) {
        breathPhase += dt / breathPeriod * Math.PI * 2;
        if (breathPhase > Math.PI * 2) {
          breathPhase -= Math.PI * 2;
          breathPeriod = 3.8 + random() * 1.9;
        }
      }
      const target = GAZE_POINTS[controls.gaze];
      const targetMouth = controls.mouthPreview ? { deformation: deformationForViseme(controls.mouthPreview), immediate: true } : mouthTarget;
      frame = {
        pose: blendPose(frame.pose, POSES[controls.expression], dt),
        gazeX: follow(frame.gazeX, target.x + (controls.idle && now < glanceEnd ? glance : 0), dt, 0.065),
        gazeY: follow(frame.gazeY, target.y, dt, 0.085),
        blink: controls.blinkPreview === null ? blinkClosure(now - blinkStart) : Math.min(1, Math.max(0, controls.blinkPreview)),
        headX: follow(frame.headX, controls.idle ? driftX : 0, dt, 0.9),
        headY: follow(frame.headY, controls.idle ? driftY : 0, dt, 1.1),
        breath: follow(frame.breath, controls.idle ? Math.sin(breathPhase) * 1.7 : 0, dt, 0.4),
        mouth: targetMouth.immediate ? { ...targetMouth.deformation } : blendMouth(frame.mouth, targetMouth.deformation, dt),
      };
      return { ...frame, pose: { ...frame.pose } };
    },
  };
}
