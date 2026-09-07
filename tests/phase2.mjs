import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const transpile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const movementCode = transpile('../game3d/core/movement.ts');
const logicCode = transpile('../game3d/match/logic.ts').replace(/^import[^;]+;\s*/m, '');
const logic = await import('data:text/javascript;base64,' + Buffer.from(`${movementCode}\n${logicCode}`).toString('base64'));
const { createActor, tickMatch, resolveSeparation, clampToRing, ringBounds, dampedMidpoint } = logic;

test('two actors start grounded and CPU locomotion approaches without input-reading', () => {
  const player = createActor('player', -1.7, 0), cpu = createActor('cpu', 1.7, 0);
  const before = { ...cpu.position }; const result = tickMatch(player, cpu, { x: 0, z: 0, run: false }, .5, .5);
  assert.notDeepEqual(cpu.position, before); assert(result.separation >= 1.25); assert.equal(player.position.y, 0); assert.equal(cpu.position.y, 0);
});
test('player world-space movement and ring bounds are enforced', () => {
  const player = createActor('player', 0, 0), cpu = createActor('cpu', 2, 0);
  tickMatch(player, cpu, { x: 0, z: -1, run: false }, 1, 0);
  assert(player.position.z < 0); assert(player.position.x >= ringBounds.minX && player.position.x <= ringBounds.maxX);
  player.position.x = 100; player.position.z = -100; clampToRing(player.position);
  assert.equal(player.position.x, ringBounds.maxX); assert.equal(player.position.z, ringBounds.minZ); assert.equal(player.position.y, 0);
});
test('deep overlap is separated without teleporting outside legal space', () => {
  const a = createActor('player', 0, 0), b = createActor('cpu', .1, .1);
  const distance = resolveSeparation(a, b, 1.25);
  assert(distance >= 1.24); assert(a.position.x >= ringBounds.minX && b.position.x <= ringBounds.maxX);
  assert(Number.isFinite(a.position.x) && Number.isFinite(b.position.z));
});
test('actors face each other with finite smooth yaw values', () => {
  const player = createActor('player', -1, 0), cpu = createActor('cpu', 1, 0);
  for (let i = 0; i < 30; i++) tickMatch(player, cpu, { x: 0, z: 0, run: false }, 1 / 60, i / 60);
  assert(Number.isFinite(player.yaw) && Number.isFinite(cpu.yaw)); assert(player.yaw > 1 && player.yaw < 4); assert(cpu.yaw < 2 || cpu.yaw > 4);
});
test('broadcast midpoint helper damps toward both actors', () => {
  const a = createActor('player', -2, 0), b = createActor('cpu', 2, 0), camera = { x: 10, y: 4, z: 10 };
  const next = dampedMidpoint(a, b, .1, camera);
  assert(Math.abs(next.x) < 10); assert(next.y < 4 && next.y > 1); assert(Number.isFinite(next.z));
});
test('ring source defines raised platform, apron, posts, turnbuckles and ropes', () => {
  const source = readFileSync(new URL('../game3d/match/ring.ts', import.meta.url), 'utf8');
  for (const marker of ['RaisedPlatform', 'RingMat', 'Apron', 'RingPost', 'Turnbuckle', 'Rope']) assert.match(source, new RegExp(marker));
});
