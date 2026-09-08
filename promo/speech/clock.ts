export interface SpeechClockState {
  startedAt: number;
  offsetMs: number;
  targetOffsetMs: number;
  lastSampleAt: number;
  lastElapsedMs: number;
  floorElapsedMs: number;
}

export function applySpeechBoundaryAnchor(clock: SpeechClockState, wordStartMs: number, nowMs: number, timelineLimit: number) {
  const anchor = Math.max(0, Math.min(timelineLimit, wordStartMs));
  const current = Math.max(0, nowMs - clock.startedAt + clock.offsetMs);
  clock.floorElapsedMs = Math.max(clock.floorElapsedMs, anchor);
  clock.lastElapsedMs = Math.max(clock.lastElapsedMs, clock.floorElapsedMs);
  clock.targetOffsetMs = Math.max(-timelineLimit, Math.min(timelineLimit, anchor - (nowMs - clock.startedAt)));
  if (current < clock.floorElapsedMs) clock.offsetMs = Math.max(clock.offsetMs, clock.floorElapsedMs - (nowMs - clock.startedAt));
}

export function advanceSpeechClock(clock: SpeechClockState, nowMs: number): number {
  const dt = Math.max(0, nowMs - clock.lastSampleAt);
  clock.lastSampleAt = nowMs;
  const correction = (clock.targetOffsetMs - clock.offsetMs) * (1 - Math.exp(-dt / 180));
  clock.offsetMs += Math.max(-dt * 0.35, Math.min(dt * 0.35, correction));
  const fallbackElapsed = Math.max(0, nowMs - clock.startedAt + clock.offsetMs);
  clock.lastElapsedMs = Math.max(clock.lastElapsedMs, clock.floorElapsedMs, fallbackElapsed);
  return clock.lastElapsedMs;
}
