import type { Vec3 } from '../core/movement';

export function cameraOffset(orbit: number): Vec3 {
  return { x: Math.sin(orbit) * 5.6, y: 3.2, z: Math.cos(orbit) * 5.6 };
}
