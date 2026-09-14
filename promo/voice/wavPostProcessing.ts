export interface VoicePostProcessing {
  highPassHz: number;
  bodyFrequencyHz: number;
  bodyGainDb: number;
  bodyQ: number;
  softenFrequencyHz: number;
  softenGainDb: number;
  softenQ: number;
  compressorThresholdDb: number;
  compressorRatio: number;
  compressorAttackMs: number;
  compressorReleaseMs: number;
  makeupGainDb: number;
  limiterDb: number;
}

interface ParsedPcm16Wav {
  sampleRate: number;
  channels: number;
  dataOffset: number;
  dataLength: number;
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function parsePcm16Wav(bytes: Uint8Array): ParsedPcm16Wav {
  if (bytes.length < 44 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WAVE') throw new Error('Invalid PCM16 WAV');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  let format: { audioFormat: number; channels: number; sampleRate: number; bits: number } | null = null;
  let dataOffset = 0;
  let dataLength = 0;
  while (offset + 8 <= bytes.length) {
    const name = ascii(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const payload = offset + 8;
    if (payload + size > bytes.length) throw new Error('Invalid PCM16 WAV');
    if (name === 'fmt ' && size >= 16) {
      format = {
        audioFormat: view.getUint16(payload, true),
        channels: view.getUint16(payload + 2, true),
        sampleRate: view.getUint32(payload + 4, true),
        bits: view.getUint16(payload + 14, true),
      };
    } else if (name === 'data') {
      dataOffset = payload;
      dataLength = size;
    }
    offset = payload + size + (size % 2);
  }
  if (!format || format.audioFormat !== 1 || format.bits !== 16 || format.channels < 1 || format.channels > 2 || format.sampleRate < 8_000 || !dataOffset || !dataLength || dataLength % (2 * format.channels) !== 0) throw new Error('Invalid PCM16 WAV');
  return { sampleRate: format.sampleRate, channels: format.channels, dataOffset, dataLength };
}

interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

function normalizedBiquad(b0: number, b1: number, b2: number, a0: number, a1: number, a2: number): Biquad {
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function highPass(sampleRate: number, frequency: number, q = Math.SQRT1_2): Biquad {
  const omega = 2 * Math.PI * frequency / sampleRate;
  const cosine = Math.cos(omega);
  const alpha = Math.sin(omega) / (2 * q);
  return normalizedBiquad((1 + cosine) / 2, -(1 + cosine), (1 + cosine) / 2, 1 + alpha, -2 * cosine, 1 - alpha);
}

function peaking(sampleRate: number, frequency: number, gainDb: number, q: number): Biquad {
  const amplitude = 10 ** (gainDb / 40);
  const omega = 2 * Math.PI * frequency / sampleRate;
  const cosine = Math.cos(omega);
  const alpha = Math.sin(omega) / (2 * q);
  return normalizedBiquad(1 + alpha * amplitude, -2 * cosine, 1 - alpha * amplitude, 1 + alpha / amplitude, -2 * cosine, 1 - alpha / amplitude);
}

function applyBiquad(samples: Float64Array, channels: number, coefficients: Biquad) {
  for (let channel = 0; channel < channels; channel += 1) {
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    for (let index = channel; index < samples.length; index += channels) {
      const x0 = samples[index];
      const y0 = coefficients.b0 * x0 + coefficients.b1 * x1 + coefficients.b2 * x2 - coefficients.a1 * y1 - coefficients.a2 * y2;
      samples[index] = y0;
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
    }
  }
}

function compress(samples: Float64Array, sampleRate: number, channels: number, settings: VoicePostProcessing) {
  const attack = Math.exp(-1 / (Math.max(0.1, settings.compressorAttackMs) * 0.001 * sampleRate));
  const release = Math.exp(-1 / (Math.max(1, settings.compressorReleaseMs) * 0.001 * sampleRate));
  const limiter = 10 ** (settings.limiterDb / 20);
  let envelope = 0;
  for (let frame = 0; frame < samples.length / channels; frame += 1) {
    let level = 0;
    for (let channel = 0; channel < channels; channel += 1) level = Math.max(level, Math.abs(samples[frame * channels + channel]));
    const coefficient = level > envelope ? attack : release;
    envelope = coefficient * envelope + (1 - coefficient) * level;
    const inputDb = 20 * Math.log10(Math.max(envelope, 1e-8));
    const compressedDb = inputDb > settings.compressorThresholdDb
      ? settings.compressorThresholdDb + (inputDb - settings.compressorThresholdDb) / settings.compressorRatio
      : inputDb;
    const gain = 10 ** ((compressedDb - inputDb + settings.makeupGainDb) / 20);
    for (let channel = 0; channel < channels; channel += 1) {
      const index = frame * channels + channel;
      samples[index] = Math.max(-limiter, Math.min(limiter, samples[index] * gain));
    }
  }
}

/** Deterministic, duration-preserving processing for PCM16 Piper output. */
export function processVoiceWav(wav: Uint8Array, settings: VoicePostProcessing): Uint8Array {
  const parsed = parsePcm16Wav(wav);
  const output = new Uint8Array(wav);
  const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
  const sampleCount = parsed.dataLength / 2;
  const samples = new Float64Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) samples[index] = view.getInt16(parsed.dataOffset + index * 2, true) / 32768;
  applyBiquad(samples, parsed.channels, highPass(parsed.sampleRate, settings.highPassHz));
  applyBiquad(samples, parsed.channels, peaking(parsed.sampleRate, settings.bodyFrequencyHz, settings.bodyGainDb, settings.bodyQ));
  applyBiquad(samples, parsed.channels, peaking(parsed.sampleRate, settings.softenFrequencyHz, settings.softenGainDb, settings.softenQ));
  compress(samples, parsed.sampleRate, parsed.channels, settings);
  for (let index = 0; index < sampleCount; index += 1) view.setInt16(parsed.dataOffset + index * 2, Math.round(Math.max(-1, Math.min(32767 / 32768, samples[index])) * 32768), true);
  return output;
}
