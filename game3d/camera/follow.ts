import { Vector3, type PerspectiveCamera } from 'three';
import { dampFactor, type Vec3 } from '../core/movement';
import { cameraOffset } from './math';
export { cameraOffset } from './math';
export class FollowCamera {
  private target = new Vector3(0, 1.05, 0);
  private desired = new Vector3();
  private orbit = .55;
  private dragging = false;
  private lastX = 0;
  constructor(private readonly camera: PerspectiveCamera, private readonly canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', this.down); canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up); canvas.addEventListener('pointercancel', this.up); canvas.addEventListener('lostpointercapture', this.up);
    canvas.addEventListener('contextmenu', this.menu);
    const offset = cameraOffset(this.orbit); camera.position.set(offset.x, offset.y, offset.z); camera.lookAt(this.target);
  }
  private down = (event: PointerEvent) => { if (event.button !== 0) return; this.dragging = true; this.lastX = event.clientX; this.canvas.setPointerCapture(event.pointerId); };
  private move = (event: PointerEvent) => { if (!this.dragging) return; this.orbit -= (event.clientX - this.lastX) * .007; this.lastX = event.clientX; };
  private up = () => { this.dragging = false; };
  private menu = (event: Event) => { event.preventDefault(); };
  update(position: Vec3, dt: number) {
    const offset = cameraOffset(this.orbit), blend = dampFactor(7, dt);
    this.desired.set(position.x + offset.x, offset.y, position.z + offset.z);
    this.camera.position.lerp(this.desired, blend);
    this.desired.set(position.x, position.y + 1.05, position.z);
    this.target.lerp(this.desired, blend); this.camera.lookAt(this.target);
  }
  dispose() {
    this.canvas.removeEventListener('pointerdown', this.down); this.canvas.removeEventListener('pointermove', this.move);
    this.canvas.removeEventListener('pointerup', this.up); this.canvas.removeEventListener('pointercancel', this.up); this.canvas.removeEventListener('lostpointercapture', this.up);
    this.canvas.removeEventListener('contextmenu', this.menu);
  }
}
