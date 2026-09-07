import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Group, Mesh, SkinnedMesh, type Object3D, type AnimationClip } from 'three';
import type { CharacterAsset } from '../assets/contract';
import { CharacterAnimation } from '../animation/controller';

export function validateCharacter(root: Object3D, clips: AnimationClip[], asset: CharacterAsset) {
  let skins = 0, bones = 0;
  root.traverse(object => {
    if (object instanceof SkinnedMesh) {
      if (!object.geometry.getAttribute('skinIndex') || !object.geometry.getAttribute('skinWeight')) throw new Error('Humanoid mesh has no skin weights.');
      skins++; bones = Math.max(bones, object.skeleton.bones.length);
    }
  });
  if (skins === 0 || bones < 2) throw new Error('Asset must contain a genuinely skinned mesh and skeleton.');
  for (const name of Object.values(asset.animations)) {
    const clip = clips.find(item => item.name === name);
    if (!clip || clip.tracks.length === 0) throw new Error(`Required skeletal clip is missing: ${name}`);
  }
  return { skins, bones };
}
export function disposeObject(root: Object3D) {
  root.traverse(object => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    }
    if (object instanceof SkinnedMesh) object.skeleton.dispose();
  });
}
export async function loadCharacter(asset: CharacterAsset, signal: AbortSignal) {
  const response = await fetch(asset.modelPath, { signal });
  if (!response.ok) throw new Error(`Model request failed (${response.status}): ${asset.modelPath}`);
  const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '/');
  if (signal.aborted) { disposeObject(gltf.scene); throw new DOMException('Load cancelled', 'AbortError'); }
  try {
    const stats = validateCharacter(gltf.scene, gltf.animations, asset);
    const root = new Group();
    gltf.scene.scale.setScalar(asset.scale); gltf.scene.rotation.y = asset.rotationOffset;
    gltf.scene.traverse(object => { if (object instanceof Mesh) { object.castShadow = true; object.receiveShadow = true; object.frustumCulled = false; } });
    root.add(gltf.scene);
    const animation = new CharacterAnimation(gltf.scene, gltf.animations, asset.animations);
    return { root, animation, stats, dispose() { animation.dispose(); disposeObject(gltf.scene); } };
  } catch (error) { disposeObject(gltf.scene); throw error; }
}
