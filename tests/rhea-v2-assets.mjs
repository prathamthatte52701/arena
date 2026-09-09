import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { rheaProfile } from '../promo/character/rheaProfile.ts';
import { rheaV2Assets } from '../promo/character/rheaV2Assets.ts';

const root = fileURLToPath(new URL('../public/character-references/rhea-v2/', import.meta.url));
const pngEntries = Object.entries(rheaV2Assets).filter(([, asset]) => asset.endsWith('.png'));

test('V2 registry exposes all 20 unique canonical visual assets', () => {
  assert.equal(pngEntries.length, 20);
  assert.equal(new Set(pngEntries.map(([, asset]) => asset)).size, 20);
  assert.ok(pngEntries.every(([, asset]) => asset.startsWith('/character-references/rhea-v2/')));
  assert.equal(rheaProfile.portrait, rheaV2Assets.faceFrontNeutral);
  assert.deepEqual([rheaProfile.width, rheaProfile.height], [1122, 1402]);
  assert.deepEqual(rheaProfile.references, {
    threeQuarter: rheaV2Assets.faceThreeQuarterNeutral,
    profile: rheaV2Assets.faceProfile,
    neutral: rheaV2Assets.faceFrontNeutral,
    confident: rheaV2Assets.faceConfidentSmirk,
    smirk: rheaV2Assets.faceConfidentSmirk,
    serious: rheaV2Assets.faceColdNeutral,
    intimidating: rheaV2Assets.faceAggressiveIntimidating,
    mocking: rheaV2Assets.expressionMocking,
    speaking: rheaV2Assets.expressionSpeakingOpen,
  });
});

test('canonical V2 PNG bytes agree with the committed manifest', async () => {
  const manifest = JSON.parse(await readFile(`${root}manifest.json`, 'utf8'));
  assert.equal(manifest.imageCount, 20);
  assert.equal(manifest.files.length, 20);
  for (const entry of manifest.files) {
    const bytes = await readFile(`${root}${entry.file}`);
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
  }
});
