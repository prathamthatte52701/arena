import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../app/engine.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { createMatch, step, attack, readProfile, buyUpgrade, newProfile } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const tick = (s, keys = [], count = 1) => { for (let i = 0; i < count; i++) step(s, .02, new Set(keys), () => .5); };

test('keyboard movement changes position and stays inside legacy bounds', () => {
  const s = createMatch(0, 1, 'fight'); s.fighters[1].down = 9999;
  const x = s.fighters[0].x; tick(s, ['d'], 5); assert(s.fighters[0].x > x);
  tick(s, ['a', 'w'], 1000); assert.equal(s.fighters[0].x, 170); assert.equal(s.fighters[0].y, 325);
});
test('paused match rejects combat and preserves the whole simulation snapshot', () => {
  const s = createMatch(0, 1, 'paused'); const before = JSON.stringify(s);
  assert.equal(attack(s, 0, 'punch'), false); tick(s, ['d', 'j'], 30); assert.equal(JSON.stringify(s), before);
});
test('one paired move owns both actors until release', () => {
  const s = createMatch(1, 0, 'fight'); s.fighters[1].x = 440;
  assert(attack(s, 0, 'press')); const hold = s.hold;
  assert.equal(attack(s, 1, 'suplex'), false); assert.equal(attack(s, 0, 'punch'), false); assert.equal(s.hold, hold);
});
test('block reduces incoming light-strike damage to one fifth', () => {
  const plain = createMatch(0, 1, 'fight'), blocked = createMatch(0, 1, 'fight');
  plain.fighters[1].x = blocked.fighters[1].x = 440; blocked.fighters[1].action = 'block';
  attack(plain, 0, 'punch'); attack(blocked, 0, 'punch');
  assert(Math.abs((115 - blocked.fighters[1].hp) * 5 - (115 - plain.fighters[1].hp)) < 1e-8);
});
test('invalid upgrade requests do not mutate a profile', () => {
  const p = newProfile(), before = JSON.stringify(p);
  assert.equal(buyUpgrade(p, -1, 'power'), null); assert.equal(buyUpgrade(p, 0, 'invalid'), null); assert.equal(JSON.stringify(p), before);
});
test('legacy profile parsing bounds nonfinite and negative counters', () => {
  const p = readProfile({ points: Infinity, wins: -10, losses: 4.9 });
  assert.equal(p.points, 0); assert.equal(p.wins, 0); assert.equal(p.losses, 4); assert.equal(p.upgrades.length, 4);
});
test('same injected random stream and input reproduce a match', () => {
  const a = createMatch(3, 1, 'fight'), b = createMatch(3, 1, 'fight');
  tick(a, ['d', 'j'], 200); tick(b, ['d', 'j'], 200); assert.deepEqual(a, b);
});
test('completed match ignores later movement and damage', () => {
  const s = createMatch(0, 1, 'fight'); s.time = .01; tick(s); assert.equal(s.phase, 'over');
  const before = JSON.stringify(s); tick(s, ['d', 'j'], 10); assert.equal(attack(s, 0, 'punch'), false); assert.equal(JSON.stringify(s), before);
});
