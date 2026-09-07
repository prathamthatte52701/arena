import assert from 'node:assert/strict';
import { SyncController, syncMoves } from '../game3d/sync/system.ts';

const tickFor = (sync, seconds, escape = false, poses = [{ x: 0, z: 0, yaw: 0 }, { x: 0, z: 2, yaw: 3.14 }]) => { for (let i = 0; i < Math.ceil(seconds / .05); i++) sync.tick(.05, poses[0], poses[1], escape); };
const resources = () => ({ stamina: 100, momentum: 100 });
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('grapple connects, synchronizes poses and releases after impact', () => {
  const sync = new SyncController(); const res = resources(); const attacker = { x: 0, z: 0, yaw: 0 }; const receiver = { x: 0, z: 1.4, yaw: 3.14 };
  assert.equal(sync.requestMove('power-throw', 1.4, res), true); assert.equal(sync.movementLocked, true); tickFor(sync, .4, false, [attacker, receiver]); assert.equal(sync.state, 'SYNCHRONIZED_MOVE'); assert.ok(receiver.z < 1.4); tickFor(sync, 1.2, false, [attacker, receiver]); assert.equal(sync.state, 'RELEASE'); assert.equal(sync.event.kind, 'impact'); tickFor(sync, .6, false, [attacker, receiver]); assert.equal(sync.state, 'FREE');
});
test('out-of-range grapple misses and unlocks', () => { const sync = new SyncController(); const res = resources(); assert.equal(sync.requestMove('basic-grapple', 3, res), true); tickFor(sync, .25); assert.equal(sync.event.kind, 'miss'); tickFor(sync, .6); assert.equal(sync.state, 'FREE'); });
test('submission can be escaped before completion', () => { const sync = new SyncController(); const res = resources(); assert.equal(sync.requestMove('submission', 1.2, res), true); tickFor(sync, .3); assert.equal(sync.state, 'SUBMISSION'); tickFor(sync, .7, true); assert.equal(sync.event.kind, 'escape'); assert.equal(sync.state, 'RELEASE'); });
test('submission completes when escape input is absent', () => { const sync = new SyncController(); const res = resources(); sync.requestMove('submission', 1.2, res); tickFor(sync, 2.55); assert.equal(sync.event.kind, 'submit'); assert.equal(sync.state, 'RELEASE'); });
test('signature and finisher require momentum and consume it', () => { const sync = new SyncController(); const low = { stamina: 100, momentum: 20 }; assert.equal(sync.requestMove('signature', 1.2, low), false); const high = { stamina: 100, momentum: 100 }; assert.equal(sync.requestMove('finisher', 1.2, high), true); assert.equal(high.momentum, 30); assert.equal(high.stamina, 66); });
test('move definitions expose stable costs and camera cue', () => { assert.equal(syncMoves.finisher.damage, 50); const sync = new SyncController(); const res = resources(); sync.requestMove('basic-grapple', 1, res); assert.equal(sync.cameraCue, true); });

for (const [name, fn] of tests) { fn(); console.log(`✔ ${name}`); }
console.log(`ℹ tests ${tests.length}`); console.log(`ℹ pass ${tests.length}`); console.log('ℹ fail 0');
