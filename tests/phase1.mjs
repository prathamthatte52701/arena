import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const transpile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const movement = await import('data:text/javascript;base64,' + Buffer.from(transpile('../game3d/core/movement.ts')).toString('base64'));
const contract = await import('data:text/javascript;base64,' + Buffer.from(transpile('../game3d/assets/contract.ts')).toString('base64'));
const keyboard = await import('data:text/javascript;base64,' + Buffer.from(transpile('../game3d/input/keyboard.ts')).toString('base64'));
const camera = await import('data:text/javascript;base64,' + Buffer.from(transpile('../game3d/camera/math.ts')).toString('base64'));
const { advancePlayer, createPlayer, dampFactor, FixedClock } = movement;
const { animationFor, developmentHumanoid } = contract;

const tuning = { walkSpeed: 1.65, runSpeed: 3.8, turnRate: 12, limit: 16 };
test('no input selects idle and keeps the player grounded', () => {
  const p = createPlayer(); advancePlayer(p, { x: 0, z: 0, run: false }, 1 / 60, tuning);
  assert.equal(p.motion, 'idle'); assert.equal(p.speed, 0); assert.equal(p.position.y, 0);
});
test('walking uses delta time and faces the world movement direction', () => {
  const p = createPlayer(); advancePlayer(p, { x: 0, z: -1, run: false }, .5, tuning);
  assert.equal(p.motion, 'walk'); assert(Math.abs(p.speed - tuning.walkSpeed) < 1e-9); assert(Math.abs(p.yaw - Math.PI) < .001);
  assert(Math.abs(p.position.z + tuning.walkSpeed * .5) < 1e-9);
});
test('delta-time integration is stable across different frame steps', () => {
  const oneStep = createPlayer(); const tenSteps = createPlayer();
  advancePlayer(oneStep, { x: 0, z: -1, run: false }, 1, tuning);
  for (let i = 0; i < 10; i++) advancePlayer(tenSteps, { x: 0, z: -1, run: false }, .1, tuning);
  assert(Math.abs(oneStep.position.z - tenSteps.position.z) < 1e-9);
  assert(Math.abs(oneStep.position.x - tenSteps.position.x) < 1e-9);
});
test('running changes speed only when shift intent is active', () => {
  const p = createPlayer(); advancePlayer(p, { x: 0, z: -1, run: true }, .25, tuning);
  assert.equal(p.motion, 'run'); assert(Math.abs(p.speed - tuning.runSpeed) < 1e-9);
});
test('diagonal movement is normalized', () => {
  const p = createPlayer(); advancePlayer(p, { x: 1, z: -1, run: false }, 1, tuning);
  assert(Math.abs(Math.hypot(p.position.x, p.position.z) - tuning.walkSpeed) < 1e-9);
});
test('ground constraint prevents vertical drift and clamps world-space bounds', () => {
  const p = createPlayer(); p.position.y = 12; advancePlayer(p, { x: 1, z: 1, run: false }, 30, tuning);
  assert.equal(p.position.y, 0); assert(Math.abs(p.position.x) <= tuning.limit); assert(Math.abs(p.position.z) <= tuning.limit);
});
test('turning follows the shortest path and remains damped', () => {
  const p = createPlayer(); p.yaw = Math.PI; advancePlayer(p, { x: 1, z: 0, run: false }, .01, tuning);
  assert(p.yaw < Math.PI && p.yaw > Math.PI - .2); assert(dampFactor(12, .01) < 1);
});
test('animation selection follows movement state, not keyboard codes', () => {
  const mapping = { idle: 'Idle', walk: 'Walk', run: 'Run' };
  assert.equal(animationFor('idle', mapping), 'Idle'); assert.equal(animationFor('walk', mapping), 'Walk'); assert.equal(animationFor('run', mapping), 'Run');
  assert.equal(animationFor('run', { idle: 'Idle', walk: 'Walk' }), 'Walk');
});
test('development asset contract names the required skeletal clips', () => {
  assert.match(developmentHumanoid.modelPath, /\.glb$/);
  assert.deepEqual(developmentHumanoid.animations, { idle: 'Idle', walk: 'Walk', run: 'Run' });
  assert(developmentHumanoid.movement.walkSpeed > 0 && developmentHumanoid.movement.runSpeed > developmentHumanoid.movement.walkSpeed);
});
test('camera offset remains finite and follows orbit mathematics', () => {
  const offset = camera.cameraOffset(Math.PI / 2);
  assert(Math.abs(offset.x - 5.6) < 1e-9); assert(Math.abs(offset.z) < 1e-9);
  assert(Object.values(offset).every(Number.isFinite));
});
test('keyboard input clears held keys on blur and focus restore', () => {
  globalThis.HTMLElement = class HTMLElement {};
  const listeners = new Map(); const host = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: () => {} };
  const doc = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: () => {} };
  const input = new keyboard.KeyboardInput(host, doc);
  listeners.get('keydown')({ code: 'KeyW', target: null, ctrlKey: false, metaKey: false, altKey: false, preventDefault() {} });
  assert.deepEqual(input.intent, { x: 0, z: -1, run: false });
  listeners.get('blur')(); assert.deepEqual(input.intent, { x: 0, z: 0, run: false }); assert.equal(input.focused, false);
  listeners.get('focus')(); assert.deepEqual(input.intent, { x: 0, z: 0, run: false }); assert.equal(input.focused, true); input.dispose();
});
test('turn calculations stay finite under repeated direction changes', () => {
  const p = createPlayer(); const intents = [{ x: 0, z: -1 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }];
  for (let i = 0; i < 240; i++) {
    const intent = intents[i % intents.length]; advancePlayer(p, { ...intent, run: false }, 1 / 60, tuning);
    assert(Number.isFinite(p.yaw)); assert(Number.isFinite(p.position.x)); assert(Number.isFinite(p.position.z));
  }
});
test('fixed clock emits deterministic ticks and bounded catch-up', () => {
  const clock = new FixedClock(); let ticks = 0; const alpha = clock.advance(1, () => { ticks++; });
  assert.equal(ticks, 6); assert(alpha >= 0 && alpha < 1); clock.reset(); assert.equal(clock.advance(0, () => { ticks++; }), 0);
});
