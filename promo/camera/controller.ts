import { CAMERA_BOUNDS, NEUTRAL_CAMERA_TRANSFORM, RHEA_CAMERA_STATES } from './rheaCamera.ts';
import type {
  CameraDefinition,
  CameraFrame,
  CameraPerformanceSignal,
  CameraPhase,
  CameraRequest,
  CameraStateName,
  CameraTransform,
} from './types.ts';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smoothstep = (value: number) => {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
};

function safeTransform(value: CameraTransform): CameraTransform {
  return {
    xPercent: clamp(value.xPercent, -CAMERA_BOUNDS.xPercent, CAMERA_BOUNDS.xPercent),
    yPercent: clamp(value.yPercent, -CAMERA_BOUNDS.yPercent, CAMERA_BOUNDS.yPercent),
    scale: clamp(value.scale, CAMERA_BOUNDS.scale[0], CAMERA_BOUNDS.scale[1]),
    rotationDeg: clamp(value.rotationDeg, -CAMERA_BOUNDS.rotationDeg, CAMERA_BOUNDS.rotationDeg),
  };
}

function blend(target: CameraTransform, amount: number): CameraTransform {
  const weight = smoothstep(amount);
  if (weight === 0) return { ...NEUTRAL_CAMERA_TRANSFORM };
  return safeTransform({
    xPercent: target.xPercent * weight,
    yPercent: target.yPercent * weight,
    scale: 1 + (target.scale - 1) * weight,
    rotationDeg: target.rotationDeg * weight,
  });
}

function interpolate(from: CameraTransform, to: CameraTransform, amount: number): CameraTransform {
  const weight = smoothstep(amount);
  return safeTransform({
    xPercent: from.xPercent + (to.xPercent - from.xPercent) * weight,
    yPercent: from.yPercent + (to.yPercent - from.yPercent) * weight,
    scale: from.scale + (to.scale - from.scale) * weight,
    rotationDeg: from.rotationDeg + (to.rotationDeg - from.rotationDeg) * weight,
  });
}

function frame(name: CameraStateName, phase: CameraPhase, phaseProgress: number, transform: CameraTransform): CameraFrame {
  return { name, phase, phaseProgress: clamp(phaseProgress, 0, 1), ...safeTransform(transform) };
}

export function resolveCameraState(value: string | null | undefined): CameraDefinition {
  const name = value && value in RHEA_CAMERA_STATES ? value as CameraStateName : 'STATIC_MEDIUM';
  return RHEA_CAMERA_STATES[name];
}

export function sampleCameraState(value: string | null | undefined, elapsedMs: number): CameraFrame {
  const camera = resolveCameraState(value);
  const elapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const enterEnd = camera.enterMs;
  const holdEnd = enterEnd + camera.holdMs;
  const exitEnd = holdEnd + camera.exitMs;
  if (elapsed < enterEnd) return frame(camera.name, 'ENTER', camera.enterMs ? elapsed / camera.enterMs : 1, blend(camera.peak, camera.enterMs ? elapsed / camera.enterMs : 1));
  if (elapsed < holdEnd) return frame(camera.name, 'HOLD', camera.holdMs ? (elapsed - enterEnd) / camera.holdMs : 1, camera.peak);
  if (elapsed < exitEnd) {
    const progress = camera.exitMs ? (elapsed - holdEnd) / camera.exitMs : 1;
    return frame(camera.name, 'EXIT', progress, blend(camera.peak, 1 - progress));
  }
  return frame(camera.name, 'REST', 1, NEUTRAL_CAMERA_TRANSFORM);
}

export function sampleCameraProgress(value: string | null | undefined, progress: number): CameraFrame {
  const camera = resolveCameraState(value);
  const duration = camera.enterMs + camera.holdMs + camera.exitMs;
  return sampleCameraState(camera.name, clamp(Number.isFinite(progress) ? progress : 0, 0, 1) * duration);
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

export function createCameraController() {
  let activeName: CameraStateName = 'STATIC_MEDIUM';
  let activeTrigger: string | null = null;
  let startedAt = 0;
  let lastNow = 0;
  let lastFrame = frame('STATIC_MEDIUM', 'REST', 1, NEUTRAL_CAMERA_TRANSFORM);
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
      if (!settling) return lastFrame = frame('STATIC_MEDIUM', 'REST', 1, NEUTRAL_CAMERA_TRANSFORM);
      const progress = clamp((now - settling.startedAt) / 520, 0, 1);
      lastFrame = frame(settling.from.name, progress < 1 ? 'EXIT' : 'REST', progress, blend(settling.from, 1 - progress));
      if (progress >= 1) { settling = null; activeName = 'STATIC_MEDIUM'; }
      return lastFrame;
    }
    const resolved = resolveCameraState(request.name);
    if (request.triggerId !== activeTrigger || resolved.name !== activeName) {
      if (activeTrigger !== null && resolved.name === activeName && lastFrame.phase !== 'REST') {
        activeTrigger = request.triggerId;
        return lastFrame = sampleCameraState(activeName, now - startedAt);
      }
      transitionFrom = lastFrame.phase === 'REST' ? null : lastFrame;
      activeName = resolved.name;
      activeTrigger = request.triggerId;
      startedAt = now;
      settling = null;
    }
    const sampled = sampleCameraState(activeName, now - startedAt);
    if (!transitionFrom) return lastFrame = sampled;
    const transitionMs = resolved.enterMs || 520;
    const transitionProgress = clamp((now - startedAt) / transitionMs, 0, 1);
    const transform = interpolate(transitionFrom, sampled, transitionProgress);
    lastFrame = frame(activeName, transitionProgress < 1 ? 'ENTER' : sampled.phase, transitionProgress < 1 ? transitionProgress : sampled.phaseProgress, transform);
    if (transitionProgress >= 1) transitionFrom = null;
    return lastFrame;
  };

  const reset = () => {
    activeName = 'STATIC_MEDIUM';
    activeTrigger = null;
    startedAt = lastNow;
    settling = null;
    transitionFrom = null;
    lastFrame = frame('STATIC_MEDIUM', 'REST', 1, NEUTRAL_CAMERA_TRANSFORM);
    return lastFrame;
  };

  return { update, stop, reset };
}
