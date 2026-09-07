import { AnimationMixer, type AnimationAction, type AnimationClip, type Object3D } from 'three';
import { animationFor, type CharacterAsset } from '../assets/contract';
import type { Motion } from '../core/movement';

export class CharacterAnimation {
  readonly mixer: AnimationMixer;
  private actions = new Map<string, AnimationAction>();
  private current: AnimationAction | undefined;
  active = '';
  constructor(root: Object3D, clips: AnimationClip[], private readonly mapping: CharacterAsset['animations']) {
    this.mixer = new AnimationMixer(root);
    for (const clip of clips) this.actions.set(clip.name, this.mixer.clipAction(clip));
    this.update('idle', 0);
  }
  update(motion: Motion, dt: number) {
    const name = animationFor(motion, this.mapping);
    const next = this.actions.get(name);
    if (!next) throw new Error(`Missing required animation: ${name}`);
    if (name !== this.active) {
      next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
      if (this.current) { this.current.fadeOut(.22); next.fadeIn(.22); }
      this.current = next; this.active = name;
    }
    this.mixer.update(dt);
  }
  dispose() { this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.mixer.getRoot()); }
}
