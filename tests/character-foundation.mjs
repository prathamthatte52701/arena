import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHARACTER_IDS } from '../promo/characters/types.ts';
import { CHARACTER_REGISTRY, enabledCharacters, resolveCharacter, resolveCharacterId } from '../promo/characters/registry.ts';
import { rheaCharacter } from '../promo/characters/rhea.ts';
import { createBodyPoseController } from '../promo/body/controller.ts';
import { createGestureController } from '../promo/gestures/controller.ts';
import { createCameraController } from '../promo/camera/controller.ts';
import { createSceneController, resolveScene } from '../promo/scenes/controller.ts';
import { createSceneRuntimePlan } from '../promo/scenes/orchestration.ts';

test('character registry exposes only the enabled Rhea definition with safe fallback', () => {
  assert.deepEqual(CHARACTER_IDS, ['RHEA']);
  assert.deepEqual(Object.keys(CHARACTER_REGISTRY), ['RHEA']);
  assert.equal(enabledCharacters().length, 1);
  assert.equal(enabledCharacters()[0], rheaCharacter);
  assert.ok(Object.isFrozen(rheaCharacter));
  assert.ok(Object.isFrozen(rheaCharacter.portrait));
  assert.ok(Object.isFrozen(rheaCharacter.portrait.eyes));
  assert.ok(Object.isFrozen(rheaCharacter.scenes.policies));
  assert.ok(Object.isFrozen(rheaCharacter.scenes.policies.INTERVIEW));
  assert.ok(Object.isFrozen(rheaCharacter.scenes.policies.INTERVIEW.CONFIDENT));
  for (const value of [undefined, null, '', 'UNKNOWN', '__proto__', {}, []]) {
    assert.equal(resolveCharacterId(value), 'RHEA');
    assert.equal(resolveCharacter(value), rheaCharacter);
  }
});

test('Rhea definition supplies the generic body gesture camera and scene controllers', () => {
  assert.equal(createBodyPoseController(rheaCharacter.body).sample('PROMO_FRONT', 'MEDIUM').name, 'PROMO_FRONT');
  assert.equal(createGestureController(rheaCharacter.gestures).update(0, { name: 'LEAN_FORWARD', triggerId: 'test' }).name, 'LEAN_FORWARD');
  assert.equal(createCameraController(rheaCharacter.camera).update(0, { name: 'SLOW_PUSH_IN', triggerId: 'test' }).name, 'SLOW_PUSH_IN');
  assert.equal(createSceneController(rheaCharacter.scenes).sample('RING_ARENA').name, 'RING_ARENA');
  assert.equal(resolveScene(rheaCharacter.scenes, 'INVALID').name, 'INTERVIEW');
  const plan = createSceneRuntimePlan(rheaCharacter.scenes, { scene: 'BACKSTAGE', text: 'Exact text.', tone: 'COLD' });
  assert.equal(plan.text, 'Exact text.');
  assert.equal(plan.tone, 'COLD');
});

test('generic scene and portrait modules contain no Rhea-specific configuration', async () => {
  const [sceneController, orchestration, rig, wrapper] = await Promise.all([
    readFile(new URL('../promo/scenes/controller.ts', import.meta.url), 'utf8'),
    readFile(new URL('../promo/scenes/orchestration.ts', import.meta.url), 'utf8'),
    readFile(new URL('../promo/character/CharacterPortraitRig.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../promo/character/RheaPortraitRig.tsx', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(`${sceneController}\n${orchestration}\n${rig}`, /RHEA_SCENES|rheaBodyProfile|rheaProfile|RHEA_GESTURES|RHEA_CAMERA_STATES/);
  assert.equal((rig.match(/<canvas\b/g) ?? []).length, 1);
  assert.equal((rig.match(/className=\{styles\.bodyPlate\}/g) ?? []).length, 1);
  assert.equal((rig.match(/className=\{styles\.cameraSurface\}/g) ?? []).length, 1);
  assert.equal((rig.match(/className=\{styles\.gestureSurface\}/g) ?? []).length, 1);
  assert.equal((wrapper.match(/<CharacterPortraitRig\b/g) ?? []).length, 1);
  assert.equal((wrapper.match(/<canvas\b/g) ?? []).length, 0);
});

test('/promo and /promo-rhea are thin aliases over the same generic experience', async () => {
  const [genericRoute, compatibilityRoute, experience] = await Promise.all([
    readFile(new URL('../app/promo/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/promo-rhea/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../promo/PromoExperience.tsx', import.meta.url), 'utf8'),
  ]);
  for (const route of [genericRoute, compatibilityRoute]) {
    assert.match(route, /<PromoExperience initialCharacterId="RHEA"/);
    assert.doesNotMatch(route, /usePromoSpeech|CharacterPortraitRig|createSceneRuntimePlan/);
  }
  assert.match(experience, /aria-label="Character"/);
  assert.match(experience, /enabledCharacters\(\)\.map/);
  assert.match(experience, /speech\.setText\(memory\.text\)/);
  assert.match(experience, /speech\.setTone\(memory\.tone\)/);
  assert.doesNotMatch(experience, /Character #2|SECOND_CHARACTER/);
});
