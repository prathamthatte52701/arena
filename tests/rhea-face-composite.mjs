import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [rig, styles, profile] = await Promise.all([
  readFile(new URL('../promo/character/RheaPortraitRig.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../promo/character/rig.module.css', import.meta.url), 'utf8'),
  readFile(new URL('../promo/character/rheaProfile.ts', import.meta.url), 'utf8'),
]);

assert.equal((rig.match(/<canvas\b/g) ?? []).length, 1, 'the live face must render through one canvas');
assert.equal((rig.match(/className=\{styles\.portrait\}/g) ?? []).length, 1, 'the live face canvas must be mounted once');
assert.doesNotMatch(styles, /\bperspective\s*:/, 'the live portrait composite must remain a flat 2D surface');
assert.doesNotMatch(styles, /\btransform-style\s*:\s*preserve-3d/, 'the live portrait must not inherit a 3D transform context');
assert.doesNotMatch(styles, /rotateY\s*\(/, 'the composed face must not be perspective-compressed by rotateY');
assert.doesNotMatch(styles, /scale[XY]\s*\(/, 'face proportions must use uniform scaling only');
assert.match(rig, /className=\{styles\.cameraSurface\}[\s\S]*className=\{styles\.bodySurface\}[\s\S]*className=\{styles\.gestureSurface\}[\s\S]*className=\{styles\.portrait\}/, 'camera, body, gesture, and portrait must each appear once in the ownership hierarchy');
assert.match(rig, /width=\{rheaProfile\.width\}\s+height=\{rheaProfile\.height\}/, 'the portrait canvas must retain the canonical profile dimensions');
assert.match(profile, /portrait:\s*rheaV2Assets\.faceFrontNeutral/, 'the runtime portrait must remain the canonical neutral face');
assert.match(profile, /width:\s*1122[\s\S]*height:\s*1402/, 'the canonical portrait dimensions must remain 1122 by 1402');
assert.match(styles, /\.full \.bodyPlate[^{]*\{[^}]*mask-image:radial-gradient\([^)]*transparent 0 78%,#000 94%\)/, 'the body plate must exclude its baked face beneath the live portrait');
assert.match(styles, /\.medium \.portrait,[\s\S]*mask-image:radial-gradient\(ellipse 25% 16% at 50% 14%/, 'medium/full framing must use the calibrated live-head mask');

console.log('Rhea face composite regression tests passed.');
