import type { Intent } from '../core/movement';

export function movementIntent(keys: ReadonlySet<string>): Intent {
  return { x: Number(keys.has('KeyD')) - Number(keys.has('KeyA')), z: Number(keys.has('KeyS')) - Number(keys.has('KeyW')), run: keys.has('ShiftLeft') || keys.has('ShiftRight') };
}
const movementCodes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight']);
export class KeyboardInput {
  private keys = new Set<string>();
  private active = true;
  constructor(private readonly host: Window, private readonly doc: Document) {
    host.addEventListener('keydown', this.down); host.addEventListener('keyup', this.up);
    host.addEventListener('blur', this.blur); host.addEventListener('focus', this.focus);
    doc.addEventListener('visibilitychange', this.visibility);
  }
  get intent() { return movementIntent(this.keys); }
  get focused() { return this.active; }
  private down = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.ctrlKey || event.metaKey || event.altKey || !movementCodes.has(event.code)) return;
    event.preventDefault(); this.active = true; this.keys.add(event.code);
  };
  private up = (event: KeyboardEvent) => { this.keys.delete(event.code); };
  private blur = () => { this.clear(); this.active = false; };
  private focus = () => { this.clear(); this.active = true; };
  private visibility = () => { if (this.doc.hidden) this.blur(); else this.focus(); };
  clear() { this.keys.clear(); }
  dispose() {
    this.clear(); this.host.removeEventListener('keydown', this.down); this.host.removeEventListener('keyup', this.up);
    this.host.removeEventListener('blur', this.blur); this.host.removeEventListener('focus', this.focus);
    this.doc.removeEventListener('visibilitychange', this.visibility);
  }
}
