import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import os from 'node:os';
import { DARK_POWER_VOICE_PROFILE, VOICE_TONES } from '../promo/voice/darkPowerVoiceProfile.ts';
import { wavDurationMs } from '../promo/voice/pipeline.ts';
import { beginSpeechSession, createSpeechSessionState, invalidateSpeechSession, isCurrentSpeechSession } from '../promo/speech/session.ts';

const base = process.env.PROMO_QA_URL ?? 'http://127.0.0.1:3000';
const records = [];

async function temporaryDirectories() {
  return new Set((await readdir(os.tmpdir())).filter(name => name.startsWith('promo-queens-piper-')));
}

function pcmMetrics(wav) {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  let peak = 0;
  let clippingSamples = 0;
  for (let offset = 44; offset + 1 < wav.length; offset += 2) {
    const sample = Math.abs(view.getInt16(offset, true)) / 32768;
    peak = Math.max(peak, sample);
    if (sample >= 32767 / 32768) clippingSamples += 1;
  }
  return { peakDbfs: Number((20 * Math.log10(Math.max(peak, 1e-9))).toFixed(2)), clippingSamples };
}

async function synthesize(name, text, tone) {
  const started = performance.now();
  const response = await fetch(`${base}/api/promo-voice`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, tone }) });
  if (response.status !== 200) throw new Error(`${name}: HTTP ${response.status}: ${await response.text()}`);
  assert.equal(response.headers.get('X-Promo-TTS-Engine'), 'LOCAL NEURAL');
  assert.equal(response.headers.get('X-Promo-TTS-Model'), DARK_POWER_VOICE_PROFILE.model);
  assert.equal(response.headers.get('X-Promo-TTS-Profile'), DARK_POWER_VOICE_PROFILE.version);
  assert.equal(Number(response.headers.get('X-Promo-TTS-Text-Length')), text.length);
  const wav = new Uint8Array(await response.arrayBuffer());
  const durationMs = wavDurationMs(wav);
  assert.ok(durationMs > 0 && wav.length > 44);
  const metrics = pcmMetrics(wav);
  assert.equal(metrics.clippingSamples, 0);
  const record = { name, tone, chars: text.length, durationMs, latencyMs: Math.round(performance.now() - started), bytes: wav.length, ...metrics };
  records.push(record);
  console.log(JSON.stringify(record));
}

const challenge = "You wanted my attention. Now you have it.";
for (const tone of VOICE_TONES) await synthesize(`tone-${tone.toLowerCase()}`, challenge, tone);

await synthesize('one-character', 'A', 'AUTO');
await synthesize('exact-unicode', "  I’m ready — Café… 🔥\nDon't change a word!  ", 'CONFIDENT');
for (const count of [50, 100, 200]) await synthesize(`${count}-words`, Array(count).fill('I').join(' '), 'COLD');
const maximum = `${Array(200).fill('I').join(' ')} Stand and fight now!`;
assert.equal(maximum.length, 420);
await synthesize('420-characters', maximum, 'INTIMIDATING');

for (const [name, body] of [
  ['421-characters', { text: 'a'.repeat(421), tone: 'AUTO' }],
  ['invalid-tone', { text: challenge, tone: 'BOGUS' }],
  ['empty', { text: '   ', tone: 'AUTO' }],
]) {
  const response = await fetch(`${base}/api/promo-voice`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal(response.status, 400, name);
  records.push({ name, status: response.status });
}

const before = await temporaryDirectories();
for (let index = 0; index < 100; index += 1) {
  const state = createSpeechSessionState();
  const stale = beginSpeechSession(state, `stale-${index}`);
  const current = beginSpeechSession(state, `current-${index}`);
  assert.equal(isCurrentSpeechSession(state, stale), false);
  assert.equal(isCurrentSpeechSession(state, current), true);
  invalidateSpeechSession(state);
  assert.equal(isCurrentSpeechSession(state, current), false);
}
let aborted = 0;
for (let index = 0; index < 8; index += 1) {
  const controller = new AbortController();
  const request = fetch(`${base}/api/promo-voice`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `Abort lifecycle ${index}: this request must never outlive its session.`, tone: VOICE_TONES[index % VOICE_TONES.length] }), signal: controller.signal });
  setTimeout(() => controller.abort(), index % 4);
  try { await request; } catch (error) { if (error?.name === 'AbortError') aborted += 1; else throw error; }
}
await new Promise(resolve => setTimeout(resolve, 1_000));
const after = await temporaryDirectories();
assert.equal(aborted, 8);
assert.deepEqual(after, before);
records.push({ name: 'session-lifecycle', sequences: 100, staleSessionsIgnored: true });
records.push({ name: 'network-abort', sequences: 8, aborted, temporaryDirectoryLeak: false });

console.log(JSON.stringify({ pass: true, profile: DARK_POWER_VOICE_PROFILE.version, tests: records }, null, 2));
