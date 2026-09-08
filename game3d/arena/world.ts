import { BoxGeometry, CylinderGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';

export type ArenaCameraAnchor = 'hard-camera' | 'ringside' | 'stage-hero' | 'ramp-tracking' | 'ring-entry' | 'close-presentation';
const standard = (color: string, roughness = .72) => new MeshStandardMaterial({ color, roughness });
const box = (name: string, size: [number, number, number], position: [number, number, number], material: MeshStandardMaterial | MeshBasicMaterial) => { const item = new Mesh(new BoxGeometry(...size), material); item.name = name; item.position.set(...position); item.castShadow = true; item.receiveShadow = true; return item; };

export function createArenaWorld() {
  const arena = new Group(); arena.name = 'QueensArenaPhase5';
  const stage = new Group(); stage.name = 'MainStage'; stage.position.set(0, 0, -17); stage.add(box('StageDeck', [15, .45, 4], [0, .3, 0], standard('#27344e')), box('EntrancePlatform', [5.5, .28, 3], [0, .72, 1.9], standard('#7352a6')));
  const screen = box('PresentationLED', [8.5, 4.1, .18], [0, 3.6, -.65], standard('#101626', .4)); screen.add(box('QueensOfTheRingScreen', [7.8, 3.4, .03], [0, 0, -.11], new MeshBasicMaterial({ color: '#5d3d87' }))); stage.add(screen);
  const tunnel = new Group(); tunnel.name = 'EntranceTunnel'; tunnel.add(box('TunnelLeft', [.45, 3.5, 2.5], [-2.5, 2, 0], standard('#1a2030')), box('TunnelRight', [.45, 3.5, 2.5], [2.5, 2, 0], standard('#1a2030')), box('TunnelHeader', [5.4, .45, 2.5], [0, 3.7, 0], standard('#1a2030'))); stage.add(tunnel); arena.add(stage);
  arena.add(box('EntranceRamp', [5.2, .2, 12], [0, .1, -9], standard('#38405b')));
  for (const x of [-5.5, 5.5]) arena.add(box('Barricade', [.35, 1.15, 12], [x, .65, -4.5], standard('#171c29')));
  const crowd = new InstancedMesh(new CylinderGeometry(.16, .22, .8, 6), standard('#5b6880'), 68); crowd.name = 'DistantCrowdClusters'; let index = 0; for (const row of [-24, -21, 11, 14]) for (let i = -8; i <= 8; i++) { const matrix = new Matrix4(); matrix.makeTranslation(i * 1.6, .45, row); crowd.setMatrixAt(index++, matrix); } crowd.instanceMatrix.needsUpdate = true; arena.add(crowd);
  arena.add(box('CommentaryDesk', [3.4, .9, 1.2], [8.5, .45, 5.2], standard('#202a3b')));
  arena.add(box('ArenaAccessPoint', [2.2, 2.4, .25], [-8.5, 1.2, -14], standard('#6b4b8d')));
  const anchors = new Map<ArenaCameraAnchor, Group>(); const points: Record<ArenaCameraAnchor, [number, number, number]> = { 'hard-camera': [0, 5.5, 12], ringside: [8, 3.4, 5.5], 'stage-hero': [0, 4.5, -21], 'ramp-tracking': [6, 3.2, -9], 'ring-entry': [5.5, 2.8, 1], 'close-presentation': [3.5, 3, 4] }; for (const [id, position] of Object.entries(points) as [ArenaCameraAnchor, [number, number, number]][]) { const anchor = new Group(); anchor.name = `CameraAnchor:${id}`; anchor.position.set(...position); anchors.set(id, anchor); arena.add(anchor); }
  return { arena, anchors };
}
