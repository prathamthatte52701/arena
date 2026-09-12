import { GESTURE_BOUNDS, NEUTRAL_GESTURE_TRANSFORM, RHEA_GESTURES } from './rheaGestures.ts';
import type {
  GestureControllerConfig,
  GestureDefinition,
  GestureFrame,
  GestureName,
  GesturePerformanceSignal,
  GesturePhase,
  GestureRequest,
  GestureTransform,
} from './types.ts';

const DEFAULT_GESTURE_CONFIG: GestureControllerConfig = {
  definitions: RHEA_GESTURES,
  bounds: GESTURE_BOUNDS,
  neutral: NEUTRAL_GESTURE_TRANSFORM,
};

function isGestureConfig(value: unknown): value is GestureControllerConfig {
  return typeof value === 'object' && value !== null && 'definitions' in value && 'bounds' in value && 'neutral' in value;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smoothstep = (value: number) => {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
};

function safeTransform(config: GestureControllerConfig, value: GestureTransform): GestureTransform {
  const bounds = config.bounds;
  return {
    bodyXPercent: clamp(value.bodyXPercent, -bounds.bodyXPercent, bounds.bodyXPercent),
    bodyYPercent: clamp(value.bodyYPercent, -bounds.bodyYPercent, bounds.bodyYPercent),
    bodyScale: clamp(value.bodyScale, bounds.bodyScale[0], bounds.bodyScale[1]),
    torsoYawDeg: clamp(value.torsoYawDeg, -bounds.torsoYawDeg, bounds.torsoYawDeg),
    torsoLeanDeg: clamp(value.torsoLeanDeg, -bounds.torsoLeanDeg, bounds.torsoLeanDeg),
    headXPercent: clamp(value.headXPercent, -bounds.headXPercent, bounds.headXPercent),
    headYPercent: clamp(value.headYPercent, -bounds.headYPercent, bounds.headYPercent),
    headScale: clamp(value.headScale, bounds.headScale[0], bounds.headScale[1]),
    headRotationDeg: clamp(value.headRotationDeg, -bounds.headRotationDeg, bounds.headRotationDeg),
  };
}

function blendTransform(config: GestureControllerConfig, target: GestureTransform, amount: number): GestureTransform {
  const weight = smoothstep(amount);
  if (weight === 0) return { ...config.neutral };
  return safeTransform(config, {
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

function frame(config: GestureControllerConfig, name: GestureName, supported: boolean, phase: GesturePhase, phaseProgress: number, transform: GestureTransform): GestureFrame {
  return { name, supported, phase, phaseProgress: clamp(phaseProgress, 0, 1), ...safeTransform(config, transform) };
}

export function resolveGesture(configOrValue: unknown, maybeValue?: unknown): GestureDefinition {
  const config = isGestureConfig(configOrValue) ? configOrValue : DEFAULT_GESTURE_CONFIG;
  const value = isGestureConfig(configOrValue) ? maybeValue : configOrValue;
  const name = typeof value === 'string' && Object.hasOwn(config.definitions, value) ? value as GestureName : 'IDLE';
  return config.definitions[name];
}

export function sampleGesture(configOrValue: unknown, valueOrElapsed: unknown, maybeElapsedMs?: number): GestureFrame {
  const config = isGestureConfig(configOrValue) ? configOrValue : DEFAULT_GESTURE_CONFIG;
  const value = isGestureConfig(configOrValue) ? valueOrElapsed : configOrValue;
  const elapsedMs = isGestureConfig(configOrValue) ? (maybeElapsedMs ?? 0) : Number(valueOrElapsed);
  const gesture = resolveGesture(config, value);
  if (!gesture.supported) return frame(config, gesture.name, false, 'REST', 1, config.neutral);
  const elapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const enterEnd = gesture.enterMs;
  const holdEnd = enterEnd + gesture.holdMs;
  const exitEnd = holdEnd + gesture.exitMs;
  if (elapsed < enterEnd) return frame(config, gesture.name, true, 'ENTER', gesture.enterMs ? elapsed / gesture.enterMs : 1, blendTransform(config, gesture.peak, gesture.enterMs ? elapsed / gesture.enterMs : 1));
  if (elapsed < holdEnd) return frame(config, gesture.name, true, 'HOLD', gesture.holdMs ? (elapsed - enterEnd) / gesture.holdMs : 1, gesture.peak);
  if (elapsed < exitEnd) {
    const progress = gesture.exitMs ? (elapsed - holdEnd) / gesture.exitMs : 1;
    return frame(config, gesture.name, true, 'EXIT', progress, blendTransform(config, gesture.peak, 1 - progress));
  }
  return frame(config, gesture.name, true, 'REST', 1, config.neutral);
}

export function sampleGestureProgress(configOrValue: unknown, valueOrProgress: unknown, maybeProgress?: number): GestureFrame {
  const config = isGestureConfig(configOrValue) ? configOrValue : DEFAULT_GESTURE_CONFIG;
  const value = isGestureConfig(configOrValue) ? valueOrProgress : configOrValue;
  const progress = isGestureConfig(configOrValue) ? (maybeProgress ?? 0) : Number(valueOrProgress);
  const gesture = resolveGesture(config, value);
  const duration = gesture.enterMs + gesture.holdMs + gesture.exitMs;
  return sampleGesture(config, gesture.name, clamp(Number.isFinite(progress) ? progress : 0, 0, 1) * duration);
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

export function createGestureController(config: GestureControllerConfig = DEFAULT_GESTURE_CONFIG) {
  let activeName: GestureName = 'IDLE';
  let activeTrigger: string | null = null;
  let startedAt = 0;
  let lastNow = 0;
  let lastFrame = frame(config, 'IDLE', true, 'REST', 1, config.neutral);
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
      if (!exit) return lastFrame = frame(config, 'IDLE', true, 'REST', 1, config.neutral);
      const progress = clamp((now - exit.startedAt) / 360, 0, 1);
      lastFrame = frame(config, exit.from.name, exit.from.supported, progress < 1 ? 'EXIT' : 'REST', progress, blendTransform(config, exit.from, 1 - progress));
      if (progress >= 1) { exit = null; activeName = 'IDLE'; }
      return lastFrame;
    }
    const resolved = resolveGesture(config, request.name);
    if (!resolved.supported) return lastFrame = frame(config, resolved.name, false, 'REST', 1, config.neutral);
    if (request.triggerId !== activeTrigger || resolved.name !== activeName) {
      activeName = resolved.name;
      activeTrigger = request.triggerId;
      startedAt = now;
      exit = null;
    }
    return lastFrame = sampleGesture(config, activeName, now - startedAt);
  };

  const reset = () => {
    activeName = 'IDLE';
    activeTrigger = null;
    startedAt = lastNow;
    exit = null;
    lastFrame = frame(config, 'IDLE', true, 'REST', 1, config.neutral);
    return lastFrame;
  };

  return { update, stop, reset };
}
