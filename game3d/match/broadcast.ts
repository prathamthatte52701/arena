import { PerspectiveCamera, Vector3 } from 'three';
import { dampFactor } from '../core/movement';
import type { MatchActor } from './logic';

export class BroadcastCamera {
  private target = new Vector3(0, 1.05, 0);
  private desired = new Vector3();
  constructor(private readonly camera: PerspectiveCamera) { camera.position.set(0, 6.8, 10.8); camera.lookAt(this.target); }
  update(player: MatchActor, cpu: MatchActor, dt: number) {
    const midpoint = new Vector3((player.position.x + cpu.position.x) * .5, 0, (player.position.z + cpu.position.z) * .5);
    const span = Math.max(1.5, Math.hypot(player.position.x - cpu.position.x, player.position.z - cpu.position.z));
    const distance = Math.min(15, Math.max(9, 8 + span * .6)), blend = dampFactor(5, dt);
    this.desired.set(midpoint.x, 5.5 + span * .35, midpoint.z + distance); this.camera.position.lerp(this.desired, blend);
    this.target.set(midpoint.x, 1.05, midpoint.z); this.camera.lookAt(this.target);
    return { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z, targetX: this.target.x, targetY: this.target.y, targetZ: this.target.z, span };
  }
}
