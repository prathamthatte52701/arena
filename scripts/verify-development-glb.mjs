import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, SkinnedMesh } from 'three';

const bytes = await readFile(new URL('../public/models/development/humanoid.glb', import.meta.url));
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const asset = await new GLTFLoader().parseAsync(buffer, '/models/development/');
if (!asset.scene) throw new Error('GLB scene is missing.');
let skinnedMeshes = 0, bones = 0, weightedVertices = 0;
const boneNames = new Set();
asset.scene.traverse(object => {
  if (!(object instanceof SkinnedMesh)) return;
  skinnedMeshes++; bones = Math.max(bones, object.skeleton.bones.length);
  for (const bone of object.skeleton.bones) boneNames.add(bone.name);
  const indices = object.geometry.getAttribute('skinIndex'), weights = object.geometry.getAttribute('skinWeight');
  if (!indices || !weights) throw new Error('SkinnedMesh is missing skin attributes.');
  weightedVertices += weights.count;
});
const clips = asset.animations.map(clip => clip.name);
let boneTracks = 0;
for (const required of ['Idle', 'Walk', 'Run']) {
  const clip = asset.animations.find(item => item.name === required);
  if (!clip || clip.tracks.length === 0) throw new Error(`Missing skeletal clip: ${required}`);
  boneTracks += clip.tracks.filter(track => boneNames.has(track.name.split('.')[0])).length;
}
if (skinnedMeshes === 0 || bones === 0) throw new Error('GLB does not contain a usable SkinnedMesh skeleton.');
if (boneTracks === 0) throw new Error('Animation clips contain no tracks targeting skeleton bones.');
const mixer = new AnimationMixer(asset.scene), walk = mixer.clipAction(asset.animations.find(item => item.name === 'Walk'));
const bone = asset.scene.getObjectByName('LeftThigh');
if (!bone) throw new Error('Expected LeftThigh bone is missing.');
const before = bone.rotation.x; walk.play(); mixer.update(.19); const after = bone.rotation.x;
if (before === after) throw new Error('Walk clip did not change a skeleton bone.');
const result = { bytes: bytes.byteLength, skinnedMeshes, bones, weightedVertices, clips, boneTracks, skeletalBoneChanged: true };
console.log(JSON.stringify(result));
