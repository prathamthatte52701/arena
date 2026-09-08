import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CapsuleGeometry, Group, Mesh, MeshStandardMaterial, SkinnedMesh, type Object3D, type AnimationClip } from 'three';
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
    if (asset.appearance) {
      const { skinColor, outfitColor, accentColor, hairColor, bodyScale } = asset.appearance;
      gltf.scene.scale.set(asset.scale * (bodyScale?.[0] ?? 1), asset.scale * (bodyScale?.[1] ?? 1), asset.scale * (bodyScale?.[2] ?? 1));
      gltf.scene.traverse(object => { if (object instanceof Mesh) { const materials = Array.isArray(object.material) ? object.material : [object.material]; for (const material of materials) { const name = material.name.toLowerCase(); if (name.includes('skin') || name.includes('body')) material.color.setHex(skinColor); else material.color.setHex(outfitColor); } } });
      const hair = new Mesh(new CapsuleGeometry(.23, .7, 6, 12), new MeshStandardMaterial({ color: hairColor, roughness: .55 })); hair.name = 'RheaHairGeometry'; hair.position.set(0, 1.48, -.08); hair.scale.set(1.25, 1.35, .65); hair.castShadow = true; root.add(hair);
      const chest = new Mesh(new CapsuleGeometry(.31, .46, 6, 12), new MeshStandardMaterial({ color: accentColor, roughness: .4, metalness: .15 })); chest.name = 'RheaMatchAttireGeometry'; chest.position.set(0, 1.03, .08); chest.rotation.z = Math.PI / 2; chest.scale.set(1.15, .55, .9); chest.castShadow = true; root.add(chest);
    }
    const animation = new CharacterAnimation(gltf.scene, gltf.animations, asset.animations);
    return { root, animation, stats, dispose() { animation.dispose(); disposeObject(gltf.scene); } };
  } catch (error) { disposeObject(gltf.scene); throw error; }
}
