import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [rig, styles] = await Promise.all([
  readFile(new URL('../promo/character/RheaPortraitRig.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../promo/character/rig.module.css', import.meta.url), 'utf8'),
]);

assert.equal((rig.match(/<canvas\b/g) ?? []).length, 1, 'the live face must render through one canvas');
assert.equal((rig.match(/className=\{styles\.portrait\}/g) ?? []).length, 1, 'the live face canvas must be mounted once');
assert.doesNotMatch(styles, /\bperspective\s*:/, 'the live portrait composite must remain a flat 2D surface');
assert.doesNotMatch(styles, /\btransform-style\s*:\s*preserve-3d/, 'the live portrait must not inherit a 3D transform context');
assert.doesNotMatch(styles, /rotateY\s*\(/, 'the composed face must not be perspective-compressed by rotateY');
assert.match(styles, /\.medium \.portrait,[\s\S]*mask-image:radial-gradient\(ellipse 18% 24% at 50% 31%/, 'medium/full framing must use the bounded facial-feature mask');

console.log('Rhea face composite regression tests passed.');
