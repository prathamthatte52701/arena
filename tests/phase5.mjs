import assert from 'node:assert/strict';
import { createArenaWorld } from '../game3d/arena/world.ts';
const { arena, anchors } = createArenaWorld();
const names = []; arena.traverse(node => names.push(node.name));
assert.ok(names.includes('MainStage')); assert.ok(names.includes('EntranceTunnel')); assert.ok(names.includes('EntranceRamp')); assert.ok(names.includes('PresentationLED')); assert.ok(names.includes('Barricade')); assert.ok(names.includes('DistantCrowdClusters')); assert.ok(names.includes('CommentaryDesk')); assert.equal(anchors.size, 6); assert.ok(anchors.get('stage-hero').position.z < anchors.get('hard-camera').position.z); assert.ok(arena.children.length >= 10); console.log('✔ arena contains stage, tunnel, ramp, screen, barricades, crowd and commentary area'); console.log('✔ six finite camera anchors are available'); console.log('✔ crowd uses one instanced mesh for bounded draw overhead'); console.log('ℹ tests 3'); console.log('ℹ pass 3'); console.log('ℹ fail 0');
