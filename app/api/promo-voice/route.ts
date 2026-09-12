import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { PIPER_SYNTHESIS_TIMEOUT_MS, parseVoiceRequestBody, wavDurationMs, voiceCacheIdentity, writePiperText } from '../../../promo/voice/pipeline.ts';
import { DARK_POWER_VOICE_PROFILE, type VoiceTone } from '../../../promo/voice/darkPowerVoiceProfile.ts';

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
  const parsed = parseVoiceRequestBody({ text, tone });
  if (!parsed.ok) throw new Error(parsed.error);
  const settings = parsed.request.settings;
  return new Promise<void>((resolve, reject) => {
    const child = spawn(pythonCommand(), ['-m', 'piper', '-m', modelPath(), '-f', output, '--length-scale', String(settings.lengthScale), '--sentence-silence', String(settings.sentenceSilence), '--volume', '1'], { windowsHide: true });
    let stderr = '';
    let timedOut = false;
    let stdinError: Error | null = null;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      if (error) reject(error); else resolve();
    };
    const terminate = () => { if (!child.killed) child.kill(); };
    const abort = () => terminate();
    const timeout = setTimeout(() => { timedOut = true; terminate(); }, PIPER_SYNTHESIS_TIMEOUT_MS);
    child.stderr.on('data', chunk => { stderr = (stderr + String(chunk)).slice(-2000); });
    child.stdin.on('error', error => { if (!signal.aborted) { stdinError = error; terminate(); } });
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    child.on('error', error => finish(error));
    child.on('close', code => {
      if (signal.aborted) return finish(new Error('synthesis aborted'));
      if (timedOut) return finish(new Error(`Piper synthesis timed out after ${PIPER_SYNTHESIS_TIMEOUT_MS}ms`));
      if (stdinError) return finish(stdinError);
      if (code === 0) return finish();
      finish(new Error(stderr.trim() || `Piper exited with code ${code ?? 'unknown'}`));
    });
    writePiperText(child.stdin, text);
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = parseVoiceRequestBody(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { text } = parsed.request;
  try {
    request.signal.throwIfAborted();
    const requestData = parsed.request;
    const model = modelPath();
    if (!existsSync(model) || !existsSync(`${model}.json`)) return NextResponse.json({ error: 'Local Piper model is not installed', engine: 'BROWSER FALLBACK' }, { status: 503 });
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
    if (error instanceof Error && error.message.includes('timed out')) return NextResponse.json({ error: 'Local neural synthesis timed out', engine: 'BROWSER FALLBACK' }, { status: 504 });
    console.error('[promo-voice] local neural synthesis failed', error);
    return NextResponse.json({ error: 'Local neural synthesis failed', engine: 'BROWSER FALLBACK' }, { status: 503 });
  }
}
