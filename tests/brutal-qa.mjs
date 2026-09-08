import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/^import .*?;\s*/gm,'');
const moduleOf = (...paths) => import('data:text/javascript;base64,'+Buffer.from(paths.map(compile).join('\n')).toString('base64'));
const {CombatSystem} = await moduleOf('../game3d/combat/definitions.ts','../game3d/combat/system.ts');
const {SyncController} = await moduleOf('../game3d/sync/system.ts');
const {EntranceController} = await moduleOf('../game3d/entrance/system.ts');
const {advancePlayer,createPlayer,FixedClock} = await moduleOf('../game3d/core/movement.ts');
test('disabled CPU attack scheduling still permits knockdown recovery',()=>{
 const c=new CombatSystem(); c.cpu.state='KNOCKED_DOWN'; for(let i=0;i<180;i++)c.tick(1/60,1.4,{cpuEnabled:false}); assert.equal(c.cpu.state,'IDLE');
});
test('nonfinite combat delta is rejected without corrupting resources',()=>{
 const c=new CombatSystem(); c.tick(NaN,1.4); assert.equal(c.player.stamina,100); assert.equal(c.cpu.stamina,100);
});
test('invalid grapple distance cannot capture a target',()=>{
 const c=new SyncController(); assert.equal(c.requestMove('basic-grapple',NaN,{stamina:100,momentum:100}),false);
});
test('nonfinite entrance delta preserves timeline',()=>{
 const c=new EntranceController('RHEA'); c.start(); c.tick(NaN); assert.equal(c.time,0);
});
test('invalid movement intent cannot poison transform',()=>{
 const p=createPlayer(); advancePlayer(p,{x:NaN,z:1,run:false},.016,{walkSpeed:2,runSpeed:4,turnRate:10,limit:16}); assert.ok(Object.values(p.position).every(Number.isFinite));
});
test('fixed clock bounds resume delta and rejects NaN during 10000 updates',()=>{
 const clock=new FixedClock(); let ticks=0; for(let i=0;i<10000;i++)clock.advance(i%17===0?NaN:i%29===0?100:1/60,()=>ticks++); assert.ok(ticks>9000&&ticks<20000);
});
test('attack spam cannot bypass action or stamina gates',()=>{
 const c=new CombatSystem(); let accepted=0; for(let i=0;i<100;i++)accepted+=Number(c.requestAttack('player','heavy')); assert.equal(accepted,1); assert.equal(c.player.stamina,78);
});
test('50 grapple cycles release and each generates one new impact',()=>{
 const c=new SyncController(); let impacts=0; for(let cycle=0;cycle<50;cycle++){
 const resources={stamina:100,momentum:100}; assert.ok(c.requestMove('basic-grapple',1.4,resources)); let previous;
 for(let frame=0;frame<180;frame++){c.tick(1/60,{x:0,z:0,yaw:0},{x:0,z:1.4,yaw:Math.PI}); if(c.event!==previous&&c.event?.kind==='impact')impacts++;previous=c.event;} assert.equal(c.state,'FREE');
 }assert.equal(impacts,50);
});
test('ten-minute deterministic combat soak bounds all resources',()=>{
 const c=new CombatSystem();let accepted=0;for(let i=0;i<36000;i++){
 if(i%19===0)accepted+=Number(c.requestAttack('player',i%2?'light':'heavy'));
 if(i%101===0)c.setBlock('player',true);if(i%101===9)c.setBlock('player',false);
 c.tick(1/60, i%300<200?1.4:3);
 for(const a of [c.player,c.cpu])for(const key of ['health','stamina','momentum'])assert.ok(Number.isFinite(a[key])&&a[key]>=0&&a[key]<=100);
 }assert.ok(accepted>0);
});
test('all entrance skip positions and sequential identities remain terminal',()=>{
 for(const id of ['RHEA','CHYNA','CHARLOTTE','BIANCA'])for(const duration of [0,.4,4,7,10]){
 const c=new EntranceController(id);c.start();for(let i=0;i<duration*60;i++)c.tick(1/60);for(let i=0;i<20;i++)c.skip();const state=c.state;for(let i=0;i<120;i++)c.tick(1/60);assert.equal(c.state,state);assert.ok(['SKIPPED','COMPLETE'].includes(state));
 }
});
test('signature and finisher exact thresholds permit one request only',()=>{
 for(const [move,threshold]of [['signature',35],['finisher',70]]){const c=new SyncController();assert.equal(c.requestMove(move,1.4,{stamina:100,momentum:threshold-.001}),false);const resources={stamina:100,momentum:threshold};assert.equal(c.requestMove(move,1.4,resources),true);assert.equal(resources.momentum,0);assert.equal(c.requestMove(move,1.4,resources),false);}
});
test('submission escape finishes and frees both participants',()=>{
 const c=new SyncController();c.requestMove('submission',1.4,{stamina:100,momentum:100});let escaped=false;for(let i=0;i<180;i++){c.tick(1/60,{x:0,z:0,yaw:0},{x:0,z:1,yaw:0},true);escaped ||= c.event?.kind==='escape';}assert.ok(escaped);assert.equal(c.state,'FREE');assert.equal(c.cameraCue,false);
});
