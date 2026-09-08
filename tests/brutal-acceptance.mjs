// Acceptance probes deliberately remain red while the required behavior is absent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BackstageNavigator, createBackstageWorld } from '../game3d/backstage/world.ts';
import { createArenaWorld } from '../game3d/arena/world.ts';
test('closed locker door stops sustained walking until interaction',()=>{
 const nav=new BackstageNavigator();nav.x=0;nav.z=11;
 for(let i=0;i<180;i++)nav.move(-1,0,1/60);
 assert.ok(nav.x>=-2.8,'Closed Rhea doorway is passable without E');
});
test('loading-bay crate has physical collision',()=>{
 const nav=new BackstageNavigator();nav.x=7;nav.z=-7;
 for(let i=0;i<45;i++)nav.move(0,1,1/60);
 assert.ok(nav.z<=-5.25,'Player penetrated the visible crate');
});
test('locker regions have interior walls and furnishings',()=>{
 const world=createBackstageWorld();const names=[];world.traverse(n=>names.push(n.name));
 assert.ok(names.some(n=>/bench|locker|mirror/i.test(n)&&!n.startsWith('ZoneFloor:')),'Colored floor regions do not constitute furnished locker rooms');
});
test('arena crowd instances all have initialized positions',()=>{
 const {arena}=createArenaWorld();const crowd=arena.getObjectByName('DistantCrowdClusters');
 assert.equal(crowd.count,68);for(let i=0;i<crowd.count;i++)assert.notEqual(crowd.instanceMatrix.array[i*16+14],0);
});
