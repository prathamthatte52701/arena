import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { createTtsRequest, MAX_PROMO_TEXT, wavDurationMs, voiceCacheIdentity, writePiperText } from '../../../promo/voice/pipeline.ts';
import { DARK_POWER_VOICE_PROFILE, isVoiceTone, type VoiceTone } from '../../../promo/voice/darkPowerVoiceProfile.ts';

export const runtime = 'nodejs';

const cache = new Map<string, { wav: Uint8Array; durationMs: number }>();

function modelPath() {
  return process.env.PROMO_PIPER_MODEL ?? path.join(process.env.LOCALAPPDATA ?? '', 'PromoQueens', 'piper', DARK_POWER_VOICE_PROFILE.model, `${DARK_POWER_VOICE_PROFILE.model}.onnx`);
}

function pythonCommand() {
  return process.env.PROMO_TTS_PYTHON ?? 'python';
}

function cacheKey(text: string, tone: VoiceTone) {
  return createHash('sha256').update(voiceCacheIdentity(text, tone)).digest('hex');
}

function runPiper(text: string, tone: VoiceTone, output: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const settings = createTtsRequest(text, tone).settings;
  return new Promise<void>((resolve, reject) => {
    const child = spawn(pythonCommand(), ['-m', 'piper', '-m', modelPath(), '-f', output, '--length-scale', String(settings.lengthScale), '--sentence-silence', String(settings.sentenceSilence), '--volume', '1'], { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr = (stderr + String(chunk)).slice(-2000); });
    child.stdin.on('error', error => { if (!signal.aborted) reject(error); });
    const abort = () => child.kill();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    child.on('error', error => { signal.removeEventListener('abort', abort); reject(error); });
    child.on('close', code => {
      signal.removeEventListener('abort', abort);
      if (signal.aborted) return reject(new Error('synthesis aborted'));
      if (code === 0) return resolve();
      reject(new Error(stderr.trim() || `Piper exited with code ${code ?? 'unknown'}`));
    });
    writePiperText(child.stdin, text);
  });
}

export async function POST(request: Request) {
  let body: { text?: unknown; tone?: unknown };
  try {
    body = await request.json() as { text?: unknown; tone?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  const text = typeof body.text === 'string' ? body.text : '';
  const tone = body.tone;
  if (!isVoiceTone(tone)) return NextResponse.json({ error: 'Invalid voice tone' }, { status: 400 });
  if (!text.trim() || text.length > MAX_PROMO_TEXT) return NextResponse.json({ error: `Text must be 1-${MAX_PROMO_TEXT} characters` }, { status: 400 });
  try {
    request.signal.throwIfAborted();
    const requestData = createTtsRequest(text, tone);
    const model = modelPath();
    if (!existsSync(model) || !existsSync(`${model}.json`)) return NextResponse.json({ error: 'Local Piper model is not installed', engine: 'BROWSER FALLBACK', model }, { status: 503 });
    const key = cacheKey(requestData.text, requestData.tone);
    const cached = cache.get(key);
    if (cached) return new Response(new Uint8Array(cached.wav), { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store', 'X-Promo-TTS-Engine': 'LOCAL NEURAL', 'X-Promo-TTS-Model': DARK_POWER_VOICE_PROFILE.model, 'X-Promo-TTS-Duration-Ms': String(cached.durationMs), 'X-Promo-TTS-Text-Length': String(text.length) } });
    const directory = await mkdtemp(path.join(tmpdir(), 'promo-queens-piper-'));
    const output = path.join(directory, 'speech.wav');
    try {
      await runPiper(requestData.text, requestData.tone, output, request.signal);
      const wav = new Uint8Array(await readFile(output));
      const durationMs = wavDurationMs(wav);
      request.signal.throwIfAborted();
      if (!wav.length || !durationMs) throw new Error('Piper returned empty or invalid audio');
      cache.set(key, { wav, durationMs });
      while (cache.size > 8) cache.delete(cache.keys().next().value as string);
      return new Response(wav, { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store', 'X-Promo-TTS-Engine': 'LOCAL NEURAL', 'X-Promo-TTS-Model': DARK_POWER_VOICE_PROFILE.model, 'X-Promo-TTS-Duration-Ms': String(durationMs), 'X-Promo-TTS-Text-Length': String(text.length) } });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  } catch (error) {
    if (request.signal.aborted) return NextResponse.json({ error: 'Synthesis cancelled' }, { status: 499 });
    console.error('[promo-voice] local neural synthesis failed', error);
    return NextResponse.json({ error: 'Local neural synthesis failed', engine: 'BROWSER FALLBACK' }, { status: 503 });
  }
}
