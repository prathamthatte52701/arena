import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, SkinnedMesh } from 'three';

const bytes = await readFile(new URL('../public/models/development/humanoid.glb', import.meta.url));
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const asset = await new GLTFLoader().parseAsync(buffer, '/models/development/');
let skinnedMeshes = 0, bones = 0, weightedVertices = 0;
asset.scene.traverse(object => {
  if (!(object instanceof SkinnedMesh)) return;
  skinnedMeshes++; bones = Math.max(bones, object.skeleton.bones.length);
  const indices = object.geometry.getAttribute('skinIndex'), weights = object.geometry.getAttribute('skinWeight');
  if (!indices || !weights) throw new Error('SkinnedMesh is missing skin attributes.');
  weightedVertices += weights.count;
});
const clips = asset.animations.map(clip => clip.name);
for (const required of ['Idle', 'Walk', 'Run']) {
  const clip = asset.animations.find(item => item.name === required);
  if (!clip || clip.tracks.length === 0) throw new Error(`Missing skeletal clip: ${required}`);
}
const mixer = new AnimationMixer(asset.scene), walk = mixer.clipAction(asset.animations.find(item => item.name === 'Walk'));
const bone = asset.scene.getObjectByName('LeftThigh');
if (!bone) throw new Error('Expected LeftThigh bone is missing.');
const before = bone.rotation.x; walk.play(); mixer.update(.19); const after = bone.rotation.x;
if (before === after) throw new Error('Walk clip did not change a skeleton bone.');
const result = { bytes: bytes.byteLength, skinnedMeshes, bones, weightedVertices, clips, skeletalBoneChanged: true };
console.log(JSON.stringify(result));
