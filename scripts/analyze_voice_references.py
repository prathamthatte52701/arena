"""Extract broad delivery metrics from local MP4 voice references.

This intentionally measures performance traits only. It does not create speaker
embeddings, transcripts, voice conversions, or any speaker-identifying artifact.
Requires the local PyAV package (``python -m pip install av``).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import av
import numpy as np


def decode_audio(path: Path) -> tuple[np.ndarray, int]:
    container = av.open(str(path))
    stream = next((candidate for candidate in container.streams if candidate.type == "audio"), None)
    if stream is None:
        raise ValueError("no audio stream")
    chunks: list[np.ndarray] = []
    sample_rate = int(stream.rate or 16000)
    for frame in container.decode(stream):
        array = frame.to_ndarray()
        if array.ndim == 2:
            array = array.mean(axis=0)
        chunks.append(array.astype(np.float32, copy=False))
    if not chunks:
        raise ValueError("audio stream contained no decodable frames")
    audio = np.concatenate(chunks)
    peak = float(np.max(np.abs(audio))) or 1.0
    if peak > 1.5:
        audio /= peak
    return audio, sample_rate


def autocorrelation_pitch(audio: np.ndarray, sample_rate: int) -> tuple[float | None, float | None]:
    window = int(sample_rate * 0.04)
    hop = int(sample_rate * 0.02)
    candidates: list[float] = []
    for start in range(0, max(0, len(audio) - window), hop):
        frame = audio[start : start + window]
        rms = float(np.sqrt(np.mean(frame * frame)))
        if rms < 0.025:
            continue
        frame = frame - np.mean(frame)
        corr = np.correlate(frame, frame, mode="full")[len(frame) - 1 :]
        low = max(1, int(sample_rate / 350))
        high = min(len(corr) - 1, int(sample_rate / 70))
        if high <= low:
            continue
        lag = low + int(np.argmax(corr[low:high]))
        strength = float(corr[lag] / (corr[0] or 1.0))
        if strength >= 0.25:
            candidates.append(sample_rate / lag)
    if not candidates:
        return None, None
    return float(np.median(candidates)), float(np.percentile(candidates, 90) - np.percentile(candidates, 10))


def analyse(path: Path) -> dict[str, object]:
    audio, sample_rate = decode_audio(path)
    window = max(1, int(sample_rate * 0.05))
    rms = np.sqrt(np.convolve(audio * audio, np.ones(window) / window, mode="valid")[::window])
    db = 20 * np.log10(np.maximum(rms, 1e-6))
    noise_floor = float(np.percentile(db, 20))
    voiced_threshold = max(noise_floor + 8.0, -38.0)
    voiced = db > voiced_threshold
    pause_runs: list[float] = []
    run = 0
    for is_voiced in voiced:
        if is_voiced:
            if run >= 2:
                pause_runs.append(run * 0.05)
            run = 0
        else:
            run += 1
    if run >= 2:
        pause_runs.append(run * 0.05)
    pitch_median, pitch_range = autocorrelation_pitch(audio, sample_rate)
    return {
        "file": path.name,
        "durationSeconds": round(len(audio) / sample_rate, 3),
        "sampleRate": sample_rate,
        "voicedFraction": round(float(np.mean(voiced)), 3),
        "rmsDbMedian": round(float(np.median(db)), 2),
        "rmsDbP10ToP90": round(float(np.percentile(db, 90) - np.percentile(db, 10)), 2),
        "pauseCount": len(pause_runs),
        "pauseSecondsMedian": round(float(np.median(pause_runs)), 3) if pause_runs else None,
        "pauseSecondsP90": round(float(np.percentile(pause_runs, 90)), 3) if pause_runs else None,
        "pitchHzMedian": round(pitch_median, 2) if pitch_median else None,
        "pitchHzMovementP10ToP90": round(pitch_range, 2) if pitch_range else None,
        "limitations": [
            "No transcription or lexical speaking-rate estimate was inferred.",
            "Crowd/music/noise are excluded only with an RMS voicing gate; metrics are broad delivery observations.",
            "Pitch uses a conservative autocorrelation estimate and is not a speaker identity feature.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    clips = sorted(args.input_dir.glob("*.mp4"))
    records: list[dict[str, object]] = []
    failures: list[dict[str, str]] = []
    for clip in clips:
        try:
            records.append(analyse(clip))
        except Exception as error:  # noqa: BLE001 - preserve per-clip limitations
            failures.append({"file": clip.name, "reason": str(error)})
    usable_records = [record for record in records if float(record["voicedFraction"]) >= 0.05]
    durations = [record["durationSeconds"] for record in usable_records]
    pitch_values = [record["pitchHzMedian"] for record in usable_records if record["pitchHzMedian"]]
    pause_values = [record["pauseSecondsMedian"] for record in usable_records if record["pauseSecondsMedian"]]
    profile = {
        "purpose": "broad non-identity performance style analysis for a distinct generic synthetic voice",
        "referenceFilesAnalyzed": len(records),
        "referenceFilesFound": len(clips),
        "clips": records,
        "failures": failures,
        "aggregate": {
            "usableDurationSeconds": round(float(sum(durations)), 3) if durations else 0,
            "usableClipCount": len(usable_records),
            "medianDurationSeconds": round(float(np.median(durations)), 3) if durations else None,
            "medianPitchHz": round(float(np.median(pitch_values)), 2) if pitch_values else None,
            "medianPauseSeconds": round(float(np.median(pause_values)), 3) if pause_values else None,
            "medianRmsVariationDb": round(float(np.median([r["rmsDbP10ToP90"] for r in usable_records])), 2) if usable_records else None,
        },
        "privacy": {
            "speakerIdentityUsed": False,
            "speakerEmbeddingCreated": False,
            "referenceAudioFedToTts": False,
            "externalSourcesDownloaded": False,
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(profile, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(profile, indent=2))


if __name__ == "__main__":
    main()
