// Original development asset authored for this project. No third-party model data.
import { mkdirSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// GLTFExporter uses the browser FileReader API for binary buffers.
class BufferReader {
  result = null;
  onloadend = null;
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
  async readAsDataURL(blob) { this.result = 'data:application/octet-stream;base64,' + Buffer.from(await blob.arrayBuffer()).toString('base64'); this.onloadend?.(); }
}
globalThis.FileReader = BufferReader;
const bones = [], byName = new Map(), parts = [];
function bone(name, parent, x, y, z) {
  const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z);
  if (parent) byName.get(parent).add(b);
  bones.push(b); byName.set(name, b); return b;
}
bone('Hips', null, 0, .96, 0);
bone('Spine', 'Hips', 0, .17, 0);
bone('Chest', 'Spine', 0, .24, 0);
bone('Neck', 'Chest', 0, .19, 0);
bone('Head', 'Neck', 0, .12, 0);
for (const [side, sign] of [['Left', 1], ['Right', -1]]) {
  bone(side + 'UpperArm', 'Chest', sign * .285, .09, 0);
  bone(side + 'Forearm', side + 'UpperArm', sign * .055, -.29, 0);
  bone(side + 'Hand', side + 'Forearm', sign * .015, -.255, .015);
  bone(side + 'Thigh', 'Hips', sign * .135, -.02, 0);
  bone(side + 'Shin', side + 'Thigh', 0, -.405, 0);
  bone(side + 'Foot', side + 'Shin', 0, -.405, .025);
}
byName.get('Hips').updateMatrixWorld(true);
const suit = '#5aa8a5', light = '#b0dad0', joint = '#263d4a';
function part(name, center, radius, color, blendParent = false) {
  const b = byName.get(name), g = new THREE.SphereGeometry(1, 16, 12);
  g.scale(...radius); g.translate(...center);
  const p = g.getAttribute('position'), indices = [], weights = [], colors = [], c = new THREE.Color(color);
  for (let i = 0; i < p.count; i++) {
    const blend = blendParent ? Math.max(0, Math.min(.28, (p.getY(i) - center[1]) / radius[1] * .28)) : 0;
    indices.push(bones.indexOf(b), Math.max(0, bones.indexOf(b.parent)), 0, 0);
    weights.push(1 - blend, blend, 0, 0); colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); parts.push(g);
}
part('Hips', [0,.975,0], [.205,.16,.135], joint);
part('Spine', [0,1.15,0], [.185,.22,.13], suit, true);
part('Chest', [0,1.355,0], [.285,.195,.15], suit, true);
part('Chest', [0,1.4,.128], [.17,.075,.035], light);
part('Neck', [0,1.565,0], [.072,.09,.07], joint);
part('Head', [0,1.735,.005], [.125,.16,.115], light);
part('Head', [0,1.75,.104], [.096,.037,.018], joint);
part('Head', [0,1.69,.108], [.025,.035,.024], suit);
for (const [side, sign] of [['Left', 1], ['Right', -1]]) {
  part(side+'UpperArm', [sign*.29,1.445,0], [.09,.115,.092], light, true);
  part(side+'UpperArm', [sign*.32,1.325,0], [.073,.17,.073], suit, true);
  part(side+'Forearm', [sign*.34,1.155,0], [.065,.067,.065], joint);
  part(side+'Forearm', [sign*.349,1.06,.008], [.063,.155,.06], suit, true);
  part(side+'Hand', [sign*.355,.882,.025], [.058,.085,.043], light);
  part(side+'Thigh', [sign*.135,.755,0], [.105,.237,.115], suit, true);
  part(side+'Shin', [sign*.135,.525,0], [.081,.075,.08], joint);
  part(side+'Shin', [sign*.135,.342,0], [.078,.22,.08], suit, true);
  part(side+'Foot', [sign*.135,.075,.092], [.085,.067,.158], light);
}
const geometry = mergeGeometries(parts);
const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.62, metalness:.18 }));
mesh.name = 'DevelopmentHumanoid'; mesh.add(byName.get('Hips'));
mesh.bind(new THREE.Skeleton(bones)); mesh.normalizeSkinWeights();
const root = new THREE.Group(); root.name = 'DevelopmentHumanoidAsset'; root.add(mesh);
const clips = [];
function makeClip(name, duration, gait) {
  const times = [], values = new Map(bones.map(b => [b.name, []])), hips = [], v = new THREE.Vector3();
  for (let frame = 0; frame <= 32; frame++) {
    const phase = frame / 32 * Math.PI * 2; times.push(frame / 32 * duration);
    bones.forEach(b => b.rotation.set(0,0,0)); byName.get('Hips').position.y = .96;
    const swing = Math.sin(phase), running = gait === 2;
    byName.get('Spine').rotation.x = gait ? (running ? .08 : .025) : Math.sin(phase)*.018;
    byName.get('Chest').rotation.y = gait ? swing*.07 : Math.sin(phase)*.025;
    byName.get('Head').rotation.y = gait ? -swing*.025 : Math.sin(phase+.5)*.045;
    for (const [side, sign] of [['Left',1],['Right',-1]]) {
      const wave = swing * sign;
      byName.get(side+'UpperArm').rotation.x = gait ? wave*(running?.9:.45) : .035*Math.sin(phase+sign);
      byName.get(side+'UpperArm').rotation.z = sign*.04;
      byName.get(side+'Forearm').rotation.x = gait ? -(running?1.15:.15)-Math.max(0,wave)*.15 : -.09;
      byName.get(side+'Thigh').rotation.x = gait ? -wave*(running?.85:.43) : 0;
      byName.get(side+'Shin').rotation.x = gait ? Math.max(0,wave)*(running?1.25:.6) : 0;
      byName.get(side+'Foot').rotation.x = gait ? -.12*Math.max(0,wave) : 0;
    }
    root.updateMatrixWorld(true); mesh.skeleton.update();
    let floor = Infinity;
    for (let i=0;i<geometry.attributes.position.count;i++) { v.fromBufferAttribute(geometry.attributes.position,i); mesh.applyBoneTransform(i,v); floor=Math.min(floor,v.y); }
    byName.get('Hips').position.y += .012 - floor;
    hips.push(0,byName.get('Hips').position.y,0);
    bones.forEach(b => values.get(b.name).push(...b.quaternion.toArray()));
  }
  const tracks = bones.map(b=>new THREE.QuaternionKeyframeTrack(b.name+'.quaternion',times,values.get(b.name)));
  tracks.push(new THREE.VectorKeyframeTrack('Hips.position',times,hips));
  clips.push(new THREE.AnimationClip(name,duration,tracks));
}
makeClip('Idle',3.2,0); makeClip('Walk',1.05,1); makeClip('Run',.68,2);
bones.forEach(b=>b.rotation.set(0,0,0)); byName.get('Hips').position.y=.96; root.updateMatrixWorld(true);
root.userData = { purpose:'Temporary generic development humanoid; not a wrestler likeness', source:'scripts/generate-development-humanoid.mjs', license:'Original project-authored asset; no external model or animation data' };
const data = await new GLTFExporter().parseAsync(root,{binary:true,animations:clips});
mkdirSync('public/models/development',{recursive:true});
writeFileSync('public/models/development/humanoid.glb',Buffer.from(data));
console.log(JSON.stringify({bytes:data.byteLength,bones:bones.length,vertices:geometry.attributes.position.count,triangles:geometry.index.count/3,animations:clips.map(c=>c.name)}));
