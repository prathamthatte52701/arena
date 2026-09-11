import { GESTURE_BOUNDS, NEUTRAL_GESTURE_TRANSFORM, RHEA_GESTURES } from './rheaGestures.ts';
import type {
  GestureDefinition,
  GestureFrame,
  GestureName,
  GesturePerformanceSignal,
  GesturePhase,
  GestureRequest,
  GestureTransform,
} from './types.ts';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smoothstep = (value: number) => {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
};

function safeTransform(value: GestureTransform): GestureTransform {
  return {
    bodyXPercent: clamp(value.bodyXPercent, -GESTURE_BOUNDS.bodyXPercent, GESTURE_BOUNDS.bodyXPercent),
    bodyYPercent: clamp(value.bodyYPercent, -GESTURE_BOUNDS.bodyYPercent, GESTURE_BOUNDS.bodyYPercent),
    bodyScale: clamp(value.bodyScale, GESTURE_BOUNDS.bodyScale[0], GESTURE_BOUNDS.bodyScale[1]),
    torsoYawDeg: clamp(value.torsoYawDeg, -GESTURE_BOUNDS.torsoYawDeg, GESTURE_BOUNDS.torsoYawDeg),
    torsoLeanDeg: clamp(value.torsoLeanDeg, -GESTURE_BOUNDS.torsoLeanDeg, GESTURE_BOUNDS.torsoLeanDeg),
    headXPercent: clamp(value.headXPercent, -GESTURE_BOUNDS.headXPercent, GESTURE_BOUNDS.headXPercent),
    headYPercent: clamp(value.headYPercent, -GESTURE_BOUNDS.headYPercent, GESTURE_BOUNDS.headYPercent),
    headScale: clamp(value.headScale, GESTURE_BOUNDS.headScale[0], GESTURE_BOUNDS.headScale[1]),
    headRotationDeg: clamp(value.headRotationDeg, -GESTURE_BOUNDS.headRotationDeg, GESTURE_BOUNDS.headRotationDeg),
  };
}

function blendTransform(target: GestureTransform, amount: number): GestureTransform {
  const weight = smoothstep(amount);
  if (weight === 0) return { ...NEUTRAL_GESTURE_TRANSFORM };
  return safeTransform({
    bodyXPercent: target.bodyXPercent * weight,
    bodyYPercent: target.bodyYPercent * weight,
    bodyScale: 1 + (target.bodyScale - 1) * weight,
    torsoYawDeg: target.torsoYawDeg * weight,
    torsoLeanDeg: target.torsoLeanDeg * weight,
    headXPercent: target.headXPercent * weight,
    headYPercent: target.headYPercent * weight,
    headScale: 1 + (target.headScale - 1) * weight,
    headRotationDeg: target.headRotationDeg * weight,
  });
}

function frame(name: GestureName, supported: boolean, phase: GesturePhase, phaseProgress: number, transform: GestureTransform): GestureFrame {
  return { name, supported, phase, phaseProgress: clamp(phaseProgress, 0, 1), ...safeTransform(transform) };
}

export function resolveGesture(value: string | null | undefined): GestureDefinition {
  const name = value && value in RHEA_GESTURES ? value as GestureName : 'IDLE';
  return RHEA_GESTURES[name];
}

export function sampleGesture(value: string | null | undefined, elapsedMs: number): GestureFrame {
  const gesture = resolveGesture(value);
  if (!gesture.supported) return frame(gesture.name, false, 'REST', 1, NEUTRAL_GESTURE_TRANSFORM);
  const elapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const enterEnd = gesture.enterMs;
  const holdEnd = enterEnd + gesture.holdMs;
  const exitEnd = holdEnd + gesture.exitMs;
  if (elapsed < enterEnd) return frame(gesture.name, true, 'ENTER', gesture.enterMs ? elapsed / gesture.enterMs : 1, blendTransform(gesture.peak, gesture.enterMs ? elapsed / gesture.enterMs : 1));
  if (elapsed < holdEnd) return frame(gesture.name, true, 'HOLD', gesture.holdMs ? (elapsed - enterEnd) / gesture.holdMs : 1, gesture.peak);
  if (elapsed < exitEnd) {
    const progress = gesture.exitMs ? (elapsed - holdEnd) / gesture.exitMs : 1;
    return frame(gesture.name, true, 'EXIT', progress, blendTransform(gesture.peak, 1 - progress));
  }
  return frame(gesture.name, true, 'REST', 1, NEUTRAL_GESTURE_TRANSFORM);
}

export function sampleGestureProgress(value: string | null | undefined, progress: number): GestureFrame {
  const gesture = resolveGesture(value);
  const duration = gesture.enterMs + gesture.holdMs + gesture.exitMs;
  return sampleGesture(gesture.name, clamp(Number.isFinite(progress) ? progress : 0, 0, 1) * duration);
}

export function gestureForPerformance(signal: GesturePerformanceSignal | null): GestureRequest | null {
  if (!signal) return null;
  let name: GestureName = 'ARMS_RELAXED';
  if (signal.expression === 'MOCKING' || signal.expression === 'SMIRK') name = 'HEAD_TILT_EMPHASIS';
  else if (signal.intensity >= 0.84 && signal.headBias.y < 0) name = 'CHEST_EMPHASIS';
  else if (signal.expression === 'INTIMIDATING' || signal.headBias.y > 0.055) name = 'LEAN_FORWARD';
  else if (signal.expression === 'CONFIDENT') name = 'CHEST_EMPHASIS';
  const triggerId = `${signal.beatIndex}:${signal.expression}:${signal.gaze}:${signal.intensity.toFixed(3)}:${signal.headBias.x.toFixed(3)}:${signal.headBias.y.toFixed(3)}`;
  return { name, triggerId };
}

export function createGestureController() {
  let activeName: GestureName = 'IDLE';
  let activeTrigger: string | null = null;
  let startedAt = 0;
  let lastNow = 0;
  let lastFrame = frame('IDLE', true, 'REST', 1, NEUTRAL_GESTURE_TRANSFORM);
  let exit: { startedAt: number; from: GestureFrame } | null = null;

  const safeNow = (nowMs: number) => {
    const finite = Number.isFinite(nowMs) ? nowMs : lastNow;
    lastNow = Math.max(lastNow, finite);
    return lastNow;
  };

  const stop = (nowMs: number) => {
    const now = safeNow(nowMs);
    if (!exit && (activeTrigger !== null || lastFrame.phase !== 'REST')) exit = { startedAt: now, from: lastFrame };
    activeTrigger = null;
    return now;
  };

  const update = (nowMs: number, request: GestureRequest | null): GestureFrame => {
    const now = safeNow(nowMs);
    if (!request) {
      stop(now);
      if (!exit) return lastFrame = frame('IDLE', true, 'REST', 1, NEUTRAL_GESTURE_TRANSFORM);
      const progress = clamp((now - exit.startedAt) / 360, 0, 1);
      lastFrame = frame(exit.from.name, exit.from.supported, progress < 1 ? 'EXIT' : 'REST', progress, blendTransform(exit.from, 1 - progress));
      if (progress >= 1) { exit = null; activeName = 'IDLE'; }
      return lastFrame;
    }
    const resolved = resolveGesture(request.name);
    if (!resolved.supported) return lastFrame = frame(resolved.name, false, 'REST', 1, NEUTRAL_GESTURE_TRANSFORM);
    if (request.triggerId !== activeTrigger || resolved.name !== activeName) {
      activeName = resolved.name;
      activeTrigger = request.triggerId;
      startedAt = now;
      exit = null;
    }
    return lastFrame = sampleGesture(activeName, now - startedAt);
  };

  const reset = () => {
    activeName = 'IDLE';
    activeTrigger = null;
    startedAt = lastNow;
    exit = null;
    lastFrame = frame('IDLE', true, 'REST', 1, NEUTRAL_GESTURE_TRANSFORM);
    return lastFrame;
  };

  return { update, stop, reset };
}
