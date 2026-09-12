import { CAMERA_BOUNDS, NEUTRAL_CAMERA_TRANSFORM, RHEA_CAMERA_STATES } from './rheaCamera.ts';
import type {
  CameraControllerConfig,
  CameraDefinition,
  CameraFrame,
  CameraPerformanceSignal,
  CameraPhase,
  CameraRequest,
  CameraStateName,
  CameraTransform,
} from './types.ts';

const DEFAULT_CAMERA_CONFIG: CameraControllerConfig = {
  definitions: RHEA_CAMERA_STATES,
  bounds: CAMERA_BOUNDS,
  neutral: NEUTRAL_CAMERA_TRANSFORM,
};

function isCameraConfig(value: unknown): value is CameraControllerConfig {
  return typeof value === 'object' && value !== null && Object.hasOwn(value, 'definitions') && Object.hasOwn(value, 'bounds') && Object.hasOwn(value, 'neutral');
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smoothstep = (value: number) => {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
};

function safeTransform(config: CameraControllerConfig, value: CameraTransform): CameraTransform {
  const bounds = config.bounds;
  return {
    xPercent: clamp(value.xPercent, -bounds.xPercent, bounds.xPercent),
    yPercent: clamp(value.yPercent, -bounds.yPercent, bounds.yPercent),
    scale: clamp(value.scale, bounds.scale[0], bounds.scale[1]),
    rotationDeg: clamp(value.rotationDeg, -bounds.rotationDeg, bounds.rotationDeg),
  };
}

function blend(config: CameraControllerConfig, target: CameraTransform, amount: number): CameraTransform {
  const weight = smoothstep(amount);
  if (weight === 0) return { ...config.neutral };
  const neutral = config.neutral;
  return safeTransform(config, {
    xPercent: neutral.xPercent + (target.xPercent - neutral.xPercent) * weight,
    yPercent: neutral.yPercent + (target.yPercent - neutral.yPercent) * weight,
    scale: neutral.scale + (target.scale - neutral.scale) * weight,
    rotationDeg: neutral.rotationDeg + (target.rotationDeg - neutral.rotationDeg) * weight,
  });
}

function interpolate(config: CameraControllerConfig, from: CameraTransform, to: CameraTransform, amount: number): CameraTransform {
  const weight = smoothstep(amount);
  return safeTransform(config, {
    xPercent: from.xPercent + (to.xPercent - from.xPercent) * weight,
    yPercent: from.yPercent + (to.yPercent - from.yPercent) * weight,
    scale: from.scale + (to.scale - from.scale) * weight,
    rotationDeg: from.rotationDeg + (to.rotationDeg - from.rotationDeg) * weight,
  });
}

function frame(config: CameraControllerConfig, name: CameraStateName, phase: CameraPhase, phaseProgress: number, transform: CameraTransform): CameraFrame {
  return { name, phase, phaseProgress: clamp(phaseProgress, 0, 1), ...safeTransform(config, transform) };
}

export function resolveCameraState(configOrValue: unknown, maybeValue?: unknown): CameraDefinition {
  const config = isCameraConfig(configOrValue) ? configOrValue : DEFAULT_CAMERA_CONFIG;
  const value = isCameraConfig(configOrValue) ? maybeValue : configOrValue;
  const name = typeof value === 'string' && Object.hasOwn(config.definitions, value) ? value as CameraStateName : 'STATIC_MEDIUM';
  return config.definitions[name];
}

export function sampleCameraState(configOrValue: unknown, valueOrElapsed: unknown, maybeElapsedMs?: number): CameraFrame {
  const config = isCameraConfig(configOrValue) ? configOrValue : DEFAULT_CAMERA_CONFIG;
  const value = isCameraConfig(configOrValue) ? valueOrElapsed : configOrValue;
  const elapsedMs = isCameraConfig(configOrValue) ? (maybeElapsedMs ?? 0) : Number(valueOrElapsed);
  const camera = resolveCameraState(config, value);
  const elapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const enterEnd = camera.enterMs;
  const holdEnd = enterEnd + camera.holdMs;
  const exitEnd = holdEnd + camera.exitMs;
  if (elapsed < enterEnd) return frame(config, camera.name, 'ENTER', camera.enterMs ? elapsed / camera.enterMs : 1, blend(config, camera.peak, camera.enterMs ? elapsed / camera.enterMs : 1));
  if (elapsed < holdEnd) return frame(config, camera.name, 'HOLD', camera.holdMs ? (elapsed - enterEnd) / camera.holdMs : 1, camera.peak);
  if (elapsed < exitEnd) {
    const progress = camera.exitMs ? (elapsed - holdEnd) / camera.exitMs : 1;
    return frame(config, camera.name, 'EXIT', progress, blend(config, camera.peak, 1 - progress));
  }
  return frame(config, camera.name, 'REST', 1, config.neutral);
}

export function sampleCameraProgress(configOrValue: unknown, valueOrProgress: unknown, maybeProgress?: number): CameraFrame {
  const config = isCameraConfig(configOrValue) ? configOrValue : DEFAULT_CAMERA_CONFIG;
  const value = isCameraConfig(configOrValue) ? valueOrProgress : configOrValue;
  const progress = isCameraConfig(configOrValue) ? (maybeProgress ?? 0) : Number(valueOrProgress);
  const camera = resolveCameraState(config, value);
  const duration = camera.enterMs + camera.holdMs + camera.exitMs;
  return sampleCameraState(config, camera.name, clamp(Number.isFinite(progress) ? progress : 0, 0, 1) * duration);
}

export function cameraForPerformance(signal: CameraPerformanceSignal | null): CameraRequest | null {
  if (!signal) return null;
  let name: CameraStateName = 'STATIC_MEDIUM';
  if (signal.finalHold) name = 'FINAL_HOLD';
  else if (signal.expression === 'MOCKING' || (signal.expression === 'SMIRK' && Math.abs(signal.headBias.x) > 0.08)) name = 'INTERVIEWER_ANGLE';
  else if (signal.intensity >= 0.84 && signal.headBias.y < 0) name = 'SLOW_PUSH_IN';
  else if (signal.expression === 'INTIMIDATING' || signal.headBias.y > 0.055) name = 'CLOSE_PROMO';
  else if (signal.expression === 'CONFIDENT') name = 'SLOW_PUSH_IN';
  else if (signal.gaze === 'CAMERA' || signal.expression === 'SMIRK') name = 'CAMERA_STARE';
  const triggerId = `${signal.beatIndex}:${signal.expression}:${signal.gaze}:${signal.intensity.toFixed(3)}:${signal.headBias.x.toFixed(3)}:${signal.headBias.y.toFixed(3)}:${signal.finalHold}`;
  return { name, triggerId };
}

export function createCameraController(config: CameraControllerConfig = DEFAULT_CAMERA_CONFIG) {
  let activeName: CameraStateName = 'STATIC_MEDIUM';
  let activeTrigger: string | null = null;
  let startedAt = 0;
  let lastNow = 0;
  let lastFrame = frame(config, 'STATIC_MEDIUM', 'REST', 1, config.neutral);
  let settling: { startedAt: number; from: CameraFrame } | null = null;
  let transitionFrom: CameraFrame | null = null;

  const safeNow = (nowMs: number) => {
    const finite = Number.isFinite(nowMs) ? nowMs : lastNow;
    lastNow = Math.max(lastNow, finite);
    return lastNow;
  };

  const stop = (nowMs: number) => {
    const now = safeNow(nowMs);
    if (!settling && (activeTrigger !== null || lastFrame.phase !== 'REST')) settling = { startedAt: now, from: lastFrame };
    activeTrigger = null;
    transitionFrom = null;
    return now;
  };

  const update = (nowMs: number, request: CameraRequest | null): CameraFrame => {
    const now = safeNow(nowMs);
    if (!request) {
      stop(now);
      if (!settling) return lastFrame = frame(config, 'STATIC_MEDIUM', 'REST', 1, config.neutral);
      const progress = clamp((now - settling.startedAt) / 520, 0, 1);
      lastFrame = frame(config, settling.from.name, progress < 1 ? 'EXIT' : 'REST', progress, blend(config, settling.from, 1 - progress));
      if (progress >= 1) { settling = null; activeName = 'STATIC_MEDIUM'; }
      return lastFrame;
    }
    const resolved = resolveCameraState(config, request.name);
    if (request.triggerId !== activeTrigger || resolved.name !== activeName) {
      if (activeTrigger !== null && resolved.name === activeName && lastFrame.phase !== 'REST') {
        activeTrigger = request.triggerId;
        return lastFrame;
      }
      transitionFrom = lastFrame.phase === 'REST' ? null : lastFrame;
      activeName = resolved.name;
      activeTrigger = request.triggerId;
      startedAt = now;
      settling = null;
    }
    const sampled = sampleCameraState(config, activeName, now - startedAt);
    if (!transitionFrom) return lastFrame = sampled;
    const transitionMs = resolved.enterMs || 520;
    const transitionProgress = clamp((now - startedAt) / transitionMs, 0, 1);
    const transform = interpolate(config, transitionFrom, sampled, transitionProgress);
    lastFrame = frame(config, activeName, transitionProgress < 1 ? 'ENTER' : sampled.phase, transitionProgress < 1 ? transitionProgress : sampled.phaseProgress, transform);
    if (transitionProgress >= 1) transitionFrom = null;
    return lastFrame;
  };

  const reset = () => {
    activeName = 'STATIC_MEDIUM';
    activeTrigger = null;
    startedAt = lastNow;
    settling = null;
    transitionFrom = null;
    lastFrame = frame(config, 'STATIC_MEDIUM', 'REST', 1, config.neutral);
    return lastFrame;
  };

  return { update, stop, reset };
}
