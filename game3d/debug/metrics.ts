export type DebugSnapshot = {
  fps: number; frameMs: number; x: number; y: number; z: number; yaw: number;
  motion: string; animation: string; animationTime: number; animationWeights: Record<string, number>; loaded: boolean; focused: boolean;
  bones: number; skins: number; spineAngle: number; thighAngle: number;
  cameraX: number; cameraY: number; cameraZ: number; drawCalls: number; triangles: number;
};
export const emptySnapshot: DebugSnapshot = {
  fps: 0, frameMs: 0, x: 0, y: 0, z: 0, yaw: 0, motion: 'idle', animation: '—', animationTime: 0, animationWeights: {},
  loaded: false, focused: true, bones: 0, skins: 0, spineAngle: 0, thighAngle: 0,
  cameraX: 0, cameraY: 0, cameraZ: 0, drawCalls: 0, triangles: 0,
};
