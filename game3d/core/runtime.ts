import { PerspectiveCamera, WebGLRenderer, PCFShadowMap, ACESFilmicToneMapping } from 'three';
import { createScene } from './scene';
import { createPlayer, advancePlayer, FixedClock } from './movement';
import { KeyboardInput } from '../input/keyboard';
import { loadCharacter, disposeObject } from '../character/adapter';
import { FollowCamera } from '../camera/follow';
import type { CharacterAsset } from '../assets/contract';
import type { DebugSnapshot } from '../debug/metrics';

export type RuntimeCallbacks = { ready: () => void; failure: (message: string) => void; stats: (snapshot: DebugSnapshot) => void };
export class SandboxRuntime {
  private renderer: WebGLRenderer;
  private world = createScene();
  private camera = new PerspectiveCamera(44, 1, .1, 100);
  private input: KeyboardInput;
  private follow: FollowCamera;
  private player = createPlayer();
  private previous = { ...this.player.position };
  private previousYaw = this.player.yaw;
  private clock = new FixedClock();
  private character: Awaited<ReturnType<typeof loadCharacter>> | undefined;
  private abort = new AbortController();
  private observer: ResizeObserver;
  private raf = 0;
  private lastTime = 0;
  private sampleTime = 0;
  private sampleFrames = 0;
  private disposed = false;
  private timeout: ReturnType<typeof setTimeout>;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly asset: CharacterAsset, private readonly callbacks: RuntimeCallbacks) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.toneMapping = ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.1;
    this.input = new KeyboardInput(window, document); this.follow = new FollowCamera(this.camera, canvas);
    this.observer = new ResizeObserver(this.resize); this.observer.observe(canvas); this.resize();
    canvas.addEventListener('webglcontextlost', this.contextLost);
    this.timeout = setTimeout(() => { this.abort.abort(); this.callbacks.failure('Character loading timed out. Check the connection and retry.'); }, 15000);
    void this.load(); this.raf = requestAnimationFrame(this.frame);
  }
  private async load() {
    try {
      const actor = await loadCharacter(this.asset, this.abort.signal);
      if (this.disposed) { actor.dispose(); return; }
      clearTimeout(this.timeout); this.character = actor; this.world.scene.add(actor.root); this.callbacks.ready();
    } catch (error) {
      clearTimeout(this.timeout);
      if (!this.disposed && !this.abort.signal.aborted) this.callbacks.failure(error instanceof Error ? error.message : 'Unable to load the rigged character.');
    }
  }
  private contextLost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(this.raf); this.input.clear(); this.callbacks.failure('WebGL context was lost. Reload the sandbox to restore the scene.'); };
  private resize = () => {
    const width = Math.max(1, this.canvas.clientWidth), height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
  };
  private frame = (now: number) => {
    if (this.disposed) return;
    const realDelta = this.lastTime ? (now - this.lastTime) / 1000 : 0; this.lastTime = now;
    const dt = Math.min(realDelta, .1), actor = this.character;
    if (actor) {
      const alpha = this.clock.advance(dt, step => {
        Object.assign(this.previous, this.player.position); this.previousYaw = this.player.yaw;
        advancePlayer(this.player, this.input.intent, step, this.asset.movement, Boolean(this.asset.animations.run));
      });
      actor.root.position.set(
        this.previous.x + (this.player.position.x - this.previous.x) * alpha, 0,
        this.previous.z + (this.player.position.z - this.previous.z) * alpha,
      );
      actor.root.rotation.y = this.previousYaw + (this.player.yaw - this.previousYaw) * alpha;
      actor.animation.update(this.player.motion, dt);
      this.follow.update(actor.root.position, dt);
      this.world.sun.position.set(actor.root.position.x + 6, 10, actor.root.position.z + 5);
      this.world.sun.target.position.copy(actor.root.position);
    }
    this.renderer.render(this.world.scene, this.camera);
    this.sampleFrames++; this.sampleTime += realDelta;
    if (this.sampleTime >= .25) {
      const p = this.player, c = this.camera.position;
      this.callbacks.stats({
        fps: this.sampleFrames / this.sampleTime, frameMs: this.sampleTime / this.sampleFrames * 1000,
        x: p.position.x, y: p.position.y, z: p.position.z, yaw: p.yaw,
        motion: p.motion, animation: actor?.animation.active ?? '—', animationTime: actor?.animation.mixer.time ?? 0,
        animationWeights: actor?.animation.weights ?? {},
        loaded: Boolean(actor), focused: this.input.focused, bones: actor?.stats.bones ?? 0, skins: actor?.stats.skins ?? 0,
        spineAngle: actor?.root.getObjectByName('Spine')?.rotation.x ?? 0, thighAngle: actor?.root.getObjectByName('LeftThigh')?.rotation.x ?? 0,
        cameraX: c.x, cameraY: c.y, cameraZ: c.z, drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles,
      });
      this.sampleTime = 0; this.sampleFrames = 0;
    }
    this.raf = requestAnimationFrame(this.frame);
  };
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.abort.abort(); clearTimeout(this.timeout); cancelAnimationFrame(this.raf);
    this.observer.disconnect(); this.input.dispose(); this.follow.dispose(); this.canvas.removeEventListener('webglcontextlost', this.contextLost);
    if (this.character) { this.world.scene.remove(this.character.root); this.character.dispose(); }
    disposeObject(this.world.scene); this.world.sun.shadow.dispose(); this.renderer.dispose();
  }
}
