import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const transpile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const definitions = transpile('../game3d/combat/definitions.ts');
const system = transpile('../game3d/combat/system.ts').replace(/^import[^;]+;\s*/m, '');
const combat = await import('data:text/javascript;base64,' + Buffer.from(definitions + '\n' + system).toString('base64'));
const { CombatSystem, movementAllowed } = combat;

const run = (system, seconds, distance = 1.4, step = .02) => { for (let t = 0; t < seconds; t += step) system.tick(step, distance); };

test('light strike has startup, active, recovery and exactly one hit', () => {
  const c = new CombatSystem(); assert(c.requestAttack('player', 'light')); assert.equal(c.player.state, 'STRIKE_STARTUP');
  c.tick(.18, 1.4); assert.equal(c.player.state, 'STRIKE_ACTIVE');
  const hit = c.tick(.12, 1.4); assert(c.cpu.health < 100); const health = c.cpu.health; assert(hit.some(item => item.kind === 'hit'));
  run(c, .5); assert.equal(c.cpu.health, health); assert.equal(c.player.state, 'IDLE');
});
test('out-of-range attack misses and does not damage', () => {
  const c = new CombatSystem(); c.requestAttack('player', 'heavy'); run(c, .6, 4); assert.equal(c.cpu.health, 100); assert.equal(c.player.lastEvent, 'heavy miss');
});
test('stamina is consumed then recovers without soft-lock', () => {
  const c = new CombatSystem(); c.requestAttack('player', 'heavy'); assert(c.player.stamina < 100); run(c, 10, 4); assert(c.player.stamina > 80); assert(c.requestAttack('player', 'light'));
});
test('blocking reduces incoming damage and prevents knockdown', () => {
  const c = new CombatSystem(); c.setBlock('cpu', true); c.requestAttack('player', 'heavy'); run(c, .7, 1.4); assert.equal(c.cpu.health, 96.4); assert.equal(c.cpu.state, 'BLOCKING');
});
test('heavy hit causes knockdown and controlled recovery', () => {
  const c = new CombatSystem(); c.requestAttack('player', 'heavy'); run(c, .7, 1.4); assert.equal(c.cpu.state, 'KNOCKED_DOWN'); run(c, 1.3, 1.4); assert.equal(c.cpu.state, 'RECOVERING'); run(c, .6, 1.4); assert.equal(c.cpu.state, 'IDLE');
});
test('successful combat increases momentum and hit reaction', () => {
  const c = new CombatSystem(); c.requestAttack('player', 'light'); run(c, .5, 1.4); assert(c.player.momentum > 0); assert(c.cpu.momentum > 0); assert(['HIT_REACTION', 'IDLE'].includes(c.cpu.state));
});
test('CPU attacks occasionally but not continuously', () => {
  const c = new CombatSystem(); let attacks = 0; for (let i = 0; i < 12; i++) { const events = c.tick(.5, 1.4); attacks += events.filter(item => item.side === 'cpu' && item.kind === 'attack-start').length; } assert(attacks >= 1); assert(attacks <= 4);
});
test('combat states gate movement while idle remains available', () => {
  const c = new CombatSystem(); assert(movementAllowed(c.player.state)); c.requestAttack('player', 'light'); assert.equal(movementAllowed(c.player.state), false); c.setBlock('player', true); assert.equal(movementAllowed(c.player.state), false);
});
