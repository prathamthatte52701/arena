import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DARK_POWER_VOICE_PROFILE, voiceToneSettings } from '../promo/voice/darkPowerVoiceProfile.ts';
import { processVoiceWav } from '../promo/voice/wavPostProcessing.ts';
import { wavDurationMs } from '../promo/voice/pipeline.ts';

const outputDirectory = process.argv[2];
if (!outputDirectory) throw new Error('Usage: node --experimental-strip-types scripts/p7_voice_candidates.mjs <output-directory>');

const scripts = [
  { name: 'confident', tone: 'CONFIDENT', text: "I don't need your approval to know exactly who I am." },
  { name: 'intimidating', tone: 'INTIMIDATING', text: 'When that bell rings, there is nowhere left to hide.' },
  { name: 'mocking', tone: 'MOCKING', text: "That was your big plan? That's almost impressive." },
  { name: 'punctuation', tone: 'COLD', text: 'I gave you one warning—Café or not… you chose not to listen!' },
  { name: 'long', tone: 'AUTO', text: "You wanted my attention. Now you have it. I don't need your respect, and I don't need your permission. Every time I step into this arena, I bring everything I have. You think you're ready for me? Then prove it. Stand your ground when the lights come on, fight for every second, and make sure you understand exactly who you're standing across from. I will not hesitate, I will not back down, and I will be waiting when that bell finally rings." },
];

const mildBody = {
  highPassHz: 58,
  bodyFrequencyHz: 275,
  bodyGainDb: 1.8,
  bodyQ: 0.75,
  softenFrequencyHz: 3_400,
  softenGainDb: -0.9,
  softenQ: 0.8,
  compressorThresholdDb: -14,
  compressorRatio: 1.8,
  compressorAttackMs: 9,
  compressorReleaseMs: 95,
  makeupGainDb: 0.8,
  limiterDb: -0.7,
};

const heavyControlled = {
  highPassHz: 55,
  bodyFrequencyHz: 250,
  bodyGainDb: 2.7,
  bodyQ: 0.72,
  softenFrequencyHz: 3_200,
  softenGainDb: -1.4,
  softenQ: 0.78,
  compressorThresholdDb: -15,
  compressorRatio: 2.1,
  compressorAttackMs: 8,
  compressorReleaseMs: 110,
  makeupGainDb: 1.1,
  limiterDb: -0.7,
};

const candidates = [
  { name: 'baseline', lengthMultiplier: 1, silenceDelta: 0, processing: null },
  { name: 'candidate-a-deliberate', lengthMultiplier: 1.035, silenceDelta: 0.035, processing: null },
  { name: 'candidate-b-full-bodied', lengthMultiplier: 1, silenceDelta: 0.01, processing: mildBody },
  { name: 'candidate-c-heavy-controlled', lengthMultiplier: 1.035, silenceDelta: 0.035, processing: heavyControlled },
];

function synthesize(text, tone, output, lengthScale, sentenceSilence) {
  const modelRoot = path.join(process.env.LOCALAPPDATA ?? '', 'PromoQueens', 'piper', DARK_POWER_VOICE_PROFILE.model);
  const model = process.env.PROMO_PIPER_MODEL ?? path.join(modelRoot, `${DARK_POWER_VOICE_PROFILE.model}.onnx`);
  const python = process.env.PROMO_TTS_PYTHON ?? 'python';
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const child = spawn(python, ['-m', 'piper', '-m', model, '-f', output, '--length-scale', String(lengthScale), '--sentence-silence', String(sentenceSilence), '--volume', '1'], { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr = (stderr + String(chunk)).slice(-2_000); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(performance.now() - started) : reject(new Error(stderr || `Piper exited with ${code}`)));
    child.stdin.end(text, 'utf8');
  });
}

function metrics(wav, text) {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const sampleRate = view.getUint32(24, true);
  const channels = view.getUint16(22, true);
  const bits = view.getUint16(34, true);
  const dataLength = view.getUint32(40, true);
  const sampleCount = dataLength / 2;
  let square = 0;
  let peak = 0;
  let clippingSamples = 0;
  let firstActive = sampleCount;
  let lastActive = 0;
  const activeThreshold = 10 ** (-42 / 20);
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = view.getInt16(44 + index * 2, true) / 32768;
    const absolute = Math.abs(sample);
    square += sample * sample;
    peak = Math.max(peak, absolute);
    if (absolute >= 32767 / 32768) clippingSamples += 1;
    if (absolute >= activeThreshold) {
      firstActive = Math.min(firstActive, index);
      lastActive = Math.max(lastActive, index);
    }
  }
  const durationMs = wavDurationMs(wav);
  const frames = sampleCount / channels;
  const words = text.match(/[\p{L}\p{N}’']+/gu)?.length ?? 0;
  return {
    validWav: durationMs > 0,
    sampleRate,
    channels,
    bits,
    durationMs,
    wordsPerSecond: Number((words / (durationMs / 1000)).toFixed(3)),
    peakDbfs: Number((20 * Math.log10(Math.max(peak, 1e-9))).toFixed(2)),
    rmsDbfs: Number((20 * Math.log10(Math.max(Math.sqrt(square / sampleCount), 1e-9))).toFixed(2)),
    clippingSamples,
    startSilenceMs: Number((firstActive / channels / sampleRate * 1000).toFixed(1)),
    endSilenceMs: Number(((frames - lastActive / channels) / sampleRate * 1000).toFixed(1)),
    bytes: wav.length,
  };
}

await mkdir(outputDirectory, { recursive: true });
const records = [];
for (const candidate of candidates) {
  for (const script of scripts) {
    const base = voiceToneSettings(script.tone);
    const lengthScale = Number((base.lengthScale * candidate.lengthMultiplier).toFixed(4));
    const sentenceSilence = Number((base.sentenceSilence + candidate.silenceDelta).toFixed(4));
    const raw = path.join(os.tmpdir(), `promo-queens-p7-${process.pid}-${candidate.name}-${script.name}.wav`);
    const output = path.join(outputDirectory, `${candidate.name}_${script.name}.wav`);
    try {
      const generationMs = await synthesize(script.text, script.tone, raw, lengthScale, sentenceSilence);
      const source = new Uint8Array(await readFile(raw));
      const wav = candidate.processing ? processVoiceWav(source, candidate.processing) : source;
      await writeFile(output, wav);
      const result = { candidate: candidate.name, script: script.name, tone: script.tone, text: script.text, lengthScale, sentenceSilence, processing: candidate.processing, generationMs: Math.round(generationMs), ...metrics(wav, script.text) };
      records.push(result);
      console.log(JSON.stringify(result));
    } finally {
      await rm(raw, { force: true });
    }
  }
}
await writeFile(path.join(outputDirectory, 'results.json'), `${JSON.stringify({ model: DARK_POWER_VOICE_PROFILE.model, candidates, scripts, records }, null, 2)}\n`, 'utf8');
