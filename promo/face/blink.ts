export const BLINK_DURATION = 0.24;
const smooth = (t: number) => t * t * (3 - 2 * t);

// Fast 65ms close, 30ms contact, slower 145ms reopening.
export function blinkClosure(elapsed: number): number {
  if (elapsed < 0 || elapsed >= BLINK_DURATION) return 0;
  if (elapsed < 0.065) return smooth(elapsed / 0.065);
  if (elapsed < 0.095) return 1;
  return 1 - smooth((elapsed - 0.095) / 0.145);
}

export function nextBlinkDelay(random: () => number): number {
  return 2.1 + Math.pow(random(), 1.5) * 4.8;
}
