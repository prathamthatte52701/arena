import {readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import assert from 'node:assert/strict';
const bytes=readFileSync(new URL('../public/models/development/humanoid.glb',import.meta.url));
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'/');
const source=ts.transpileModule(readFileSync(new URL('../game3d/animation/controller.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const code=source.replace("from 'three'",`from '${import.meta.resolve('three')}'`).replace(/import .*from '..\/assets\/contract';/,"const animationFor=(motion,mapping)=>motion==='run'?mapping.run??mapping.walk:mapping[motion];");
const {CharacterAnimation}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const animation=new CharacterAnimation(asset.scene,asset.animations,{idle:'Idle',walk:'Walk',run:'Run'});
for(let i=0;i<1800;i++){
 animation.update(['idle','walk','run','walk','idle','run'][i%6],1/60);
 for(const weight of Object.values(animation.weights))assert.ok(Number.isFinite(weight)&&weight>=0&&weight<=1);
 asset.scene.traverse(node=>{if(node.isBone)assert.ok([...node.position,...node.quaternion].every(Number.isFinite));});
}
for(let i=0;i<120;i++)animation.update('idle',1/60);
assert.equal(animation.active,'Idle');assert.equal(animation.weights.Idle,1);assert.equal(animation.weights.Walk,0);assert.equal(animation.weights.Run,0);
const report={transitions:1800,finiteBones:true,weights:animation.weights,active:animation.active};
animation.dispose();writeFileSync('docs/brutal-qa/animation.json',JSON.stringify(report,null,2));console.log(report);
