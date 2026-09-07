import { ACESFilmicToneMapping, DirectionalLight, PerspectiveCamera, PCFShadowMap, WebGLRenderer } from 'three';
import { developmentHumanoid } from '../assets/contract';
import { loadCharacter, disposeObject } from '../character/adapter';
import { FollowCamera } from '../camera/follow';
import { FixedClock } from '../core/movement';
import { KeyboardInput } from '../input/keyboard';
import { createScene } from '../core/scene';
import { createWrestlingRing } from './ring';
import { createActor, tickMatch, type MatchActor } from './logic';
import { BroadcastCamera } from './broadcast';
import { CombatSystem, movementAllowed } from '../combat/system';

export type MatchCameraMode = 'broadcast' | 'follow';
export type MatchSnapshot = {
  fps: number; frameMs: number; playerX: number; playerY: number; playerZ: number; playerYaw: number; cpuX: number; cpuY: number; cpuZ: number; cpuYaw: number;
  playerMotion: string; cpuMotion: string; playerAnimation: string; cpuAnimation: string; playerBones: number; cpuBones: number;
  skins: number; separation: number; cameraMode: MatchCameraMode; cameraX: number; cameraY: number; cameraZ: number; targetX: number; targetZ: number;
  loaded: boolean; grounded: boolean; drawCalls: number; triangles: number; playerHealth: number; cpuHealth: number; playerStamina: number; cpuStamina: number; playerMomentum: number; cpuMomentum: number; playerCombat: string; cpuCombat: string; combatEvent: string;
};
export const emptyMatchSnapshot: MatchSnapshot = {
  fps: 0, frameMs: 0, playerX: 0, playerY: 0, playerZ: 0, playerYaw: 0, cpuX: 0, cpuY: 0, cpuZ: 0, cpuYaw: 0, playerMotion: 'idle', cpuMotion: 'idle', playerAnimation: '—', cpuAnimation: '—', playerBones: 0, cpuBones: 0, skins: 0, separation: 0, cameraMode: 'broadcast', cameraX: 0, cameraY: 0, cameraZ: 0, targetX: 0, targetZ: 0, loaded: false, grounded: true, drawCalls: 0, triangles: 0, playerHealth: 100, cpuHealth: 100, playerStamina: 100, cpuStamina: 100, playerMomentum: 0, cpuMomentum: 0, playerCombat: 'IDLE', cpuCombat: 'IDLE', combatEvent: '',
};
export type MatchCallbacks = { ready: () => void; failure: (message: string) => void; stats: (snapshot: MatchSnapshot) => void };

export class MatchRuntime {
  private readonly renderer: WebGLRenderer;
  private readonly world = createScene();
  private readonly camera = new PerspectiveCamera(42, 1, .1, 100);
  private readonly input: KeyboardInput;
  private readonly follow: FollowCamera;
  private readonly broadcast: BroadcastCamera;
  private readonly clock = new FixedClock();
  private readonly ring = createWrestlingRing();
  private player: MatchActor = createActor('player', -1.7, 0);
  private cpu: MatchActor = createActor('cpu', 1.7, 0);
  private playerCharacter: Awaited<ReturnType<typeof loadCharacter>> | undefined;
  private cpuCharacter: Awaited<ReturnType<typeof loadCharacter>> | undefined;
  private abort = new AbortController();
  private observer: ResizeObserver;
  private raf = 0; private lastTime = 0; private sampleTime = 0; private sampleFrames = 0; private elapsed = 0; private disposed = false;
  private timeout: ReturnType<typeof setTimeout>; private separation = 3.4; private cameraMode: MatchCameraMode = 'broadcast';
  private readonly combat = new CombatSystem(); private combatEvent = '';
  private readonly qaFreezeCpu = process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).get('qaFreezeCpu') === '1';
  private cameraToggle = (event: KeyboardEvent) => { if (event.code === 'KeyC') this.cameraMode = this.cameraMode === 'broadcast' ? 'follow' : 'broadcast'; };
  private combatInput = (event: KeyboardEvent) => { if (event.code === 'KeyJ') this.combat.requestAttack('player', 'light'); if (event.code === 'KeyK') this.combat.requestAttack('player', 'heavy'); if (event.code === 'Space') this.combat.setBlock('player', true); };
  private combatInputUp = (event: KeyboardEvent) => { if (event.code === 'Space') this.combat.setBlock('player', false); };
  constructor(private readonly canvas: HTMLCanvasElement, private readonly callbacks: MatchCallbacks) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false }); this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = PCFShadowMap; this.renderer.toneMapping = ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.1;
    this.world.scene.add(this.ring); this.input = new KeyboardInput(window, document); this.follow = new FollowCamera(this.camera, canvas); this.broadcast = new BroadcastCamera(this.camera);
    if (process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).get('qaClose') === '1') { this.player = createActor('player', -.7, 0); this.cpu = createActor('cpu', .7, 0); }
    this.observer = new ResizeObserver(this.resize); this.observer.observe(canvas); this.resize(); window.addEventListener('keydown', this.cameraToggle);
    canvas.addEventListener('webglcontextlost', this.contextLost); window.addEventListener('keydown', this.combatInput); window.addEventListener('keyup', this.combatInputUp); this.timeout = setTimeout(() => { this.abort.abort(); this.callbacks.failure('Match characters timed out while loading.'); }, 15000);
    void this.load(); this.raf = requestAnimationFrame(this.frame);
  }
  private async load() {
    try {
      const [player, cpu] = await Promise.all([loadCharacter(developmentHumanoid, this.abort.signal), loadCharacter(developmentHumanoid, this.abort.signal)]);
      if (this.disposed) { player.dispose(); cpu.dispose(); return; }
      clearTimeout(this.timeout); this.playerCharacter = player; this.cpuCharacter = cpu; this.world.scene.add(player.root, cpu.root); this.callbacks.ready();
    } catch (error) { clearTimeout(this.timeout); if (!this.disposed && !this.abort.signal.aborted) this.callbacks.failure(error instanceof Error ? error.message : 'Unable to load the two match characters.'); }
  }
  private contextLost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(this.raf); this.input.clear(); this.callbacks.failure('WebGL context was lost. Reload the match sandbox.'); };
  private resize = () => { const width = Math.max(1, this.canvas.clientWidth), height = Math.max(1, this.canvas.clientHeight); this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); };
  private frame = (now: number) => {
    if (this.disposed) return;
    const realDelta = this.lastTime ? (now - this.lastTime) / 1000 : 0; this.lastTime = now; const dt = Math.min(realDelta, .1); this.elapsed += dt;
    if (this.playerCharacter && this.cpuCharacter) {
      this.clock.advance(dt, step => { const result = tickMatch(this.player, this.cpu, this.input.intent, step, this.elapsed, movementAllowed(this.combat.player.state), this.qaFreezeCpu ? false : movementAllowed(this.combat.cpu.state)); this.separation = result.separation; const events = this.combat.tick(step, this.separation, { cpuEnabled: !this.qaFreezeCpu }); this.combatEvent = events.at(-1)?.kind ?? this.combatEvent; });
      this.playerCharacter.root.position.set(this.player.position.x, 0, this.player.position.z); this.playerCharacter.root.rotation.y = this.player.yaw;
      this.cpuCharacter.root.position.set(this.cpu.position.x, 0, this.cpu.position.z); this.cpuCharacter.root.rotation.y = this.cpu.yaw;
      this.playerCharacter.animation.update(this.player.motion, dt); this.cpuCharacter.animation.update(this.cpu.motion, dt);
      let target = { x: 0, y: 0, z: 0, targetX: 0, targetY: 0, targetZ: 0, span: this.separation };
      if (this.cameraMode === 'broadcast') target = this.broadcast.update(this.player, this.cpu, dt);
      else { this.follow.update(this.playerCharacter.root.position, dt); target = { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z, targetX: this.player.position.x, targetY: 1.05, targetZ: this.player.position.z, span: this.separation }; }
      this.world.sun.position.set(this.player.position.x + 6, 10, this.player.position.z + 5); (this.world.sun as DirectionalLight).target.position.copy(this.playerCharacter.root.position);
      this.emitStats(target, realDelta);
    }
    this.renderer.render(this.world.scene, this.camera); this.raf = requestAnimationFrame(this.frame);
  };
  private emitStats(target: { x: number; y: number; z: number; targetX: number; targetZ: number; span: number }, realDelta: number) {
    this.sampleFrames++; this.sampleTime += realDelta; if (this.sampleTime < .25) return;
    const p = this.player, c = this.cpu; this.callbacks.stats({ fps: this.sampleFrames / this.sampleTime, frameMs: this.sampleTime / this.sampleFrames * 1000, playerX: p.position.x, playerY: p.position.y, playerZ: p.position.z, playerYaw: p.yaw, cpuX: c.position.x, cpuY: c.position.y, cpuZ: c.position.z, cpuYaw: c.yaw, playerMotion: p.motion, cpuMotion: c.motion, playerAnimation: this.playerCharacter?.animation.active ?? '—', cpuAnimation: this.cpuCharacter?.animation.active ?? '—', playerBones: this.playerCharacter?.stats.bones ?? 0, cpuBones: this.cpuCharacter?.stats.bones ?? 0, skins: (this.playerCharacter?.stats.skins ?? 0) + (this.cpuCharacter?.stats.skins ?? 0), separation: this.separation, cameraMode: this.cameraMode, cameraX: target.x, cameraY: target.y, cameraZ: target.z, targetX: target.targetX, targetZ: target.targetZ, loaded: true, grounded: p.position.y === 0 && c.position.y === 0, drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, playerHealth: this.combat.player.health, cpuHealth: this.combat.cpu.health, playerStamina: this.combat.player.stamina, cpuStamina: this.combat.cpu.stamina, playerMomentum: this.combat.player.momentum, cpuMomentum: this.combat.cpu.momentum, playerCombat: this.combat.player.state, cpuCombat: this.combat.cpu.state, combatEvent: this.combatEvent }); this.sampleTime = 0; this.sampleFrames = 0;
  }
  dispose() { if (this.disposed) return; this.disposed = true; this.abort.abort(); clearTimeout(this.timeout); cancelAnimationFrame(this.raf); this.observer.disconnect(); this.input.dispose(); this.follow.dispose(); window.removeEventListener('keydown', this.cameraToggle); window.removeEventListener('keydown', this.combatInput); window.removeEventListener('keyup', this.combatInputUp); this.canvas.removeEventListener('webglcontextlost', this.contextLost); if (this.playerCharacter) { this.world.scene.remove(this.playerCharacter.root); this.playerCharacter.dispose(); } if (this.cpuCharacter) { this.world.scene.remove(this.cpuCharacter.root); this.cpuCharacter.dispose(); } disposeObject(this.world.scene); this.world.sun.shadow.dispose(); this.renderer.dispose(); }
}
