import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../app/promo-rhea/page.tsx', import.meta.url), 'utf8');
test('promo route preserves exact player text and local speech pipeline', () => { assert.match(page, /new SpeechSynthesisUtterance\(text\)/); assert.match(page, /textarea value=\{text\}/); assert.match(page, /window\.speechSynthesis\.speak/); });
test('promo performance exposes expression, gaze, mouth, subtitles, replay and stop', () => { for (const token of ['setExpression', 'setGaze', 'setMouth', 'setSubtitle', 'REPLAY', 'STOP', 'PROMO COMPLETE']) assert.ok(page.includes(token), token); });
test('only Rhea promo is active character route', () => { assert.match(page, /Rhea-inspired expressive promo portrait/); });
