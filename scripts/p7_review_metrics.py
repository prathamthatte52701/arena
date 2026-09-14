"""Summarize objective metrics for a local P7 A/B review directory."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import wave

import numpy as np


def spectral_balance(path: Path) -> float:
    with wave.open(str(path), "rb") as source:
        rate = source.getframerate()
        channels = source.getnchannels()
        audio = np.frombuffer(source.readframes(source.getnframes()), dtype="<i2").astype(np.float64) / 32768
    if channels > 1:
        audio = audio.reshape(-1, channels).mean(axis=1)
    spectrum = np.abs(np.fft.rfft(audio * np.hanning(len(audio)))) ** 2
    frequency = np.fft.rfftfreq(len(audio), 1 / rate)
    low_mid = spectrum[(frequency >= 120) & (frequency < 700)].sum()
    presence = spectrum[(frequency >= 1500) & (frequency < 5000)].sum()
    return float(10 * np.log10(max(low_mid, 1e-12) / max(presence, 1e-12)))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("review_directory", type=Path)
    args = parser.parse_args()
    data = json.loads((args.review_directory / "results.json").read_text(encoding="utf-8"))
    summary: dict[str, object] = {}
    for candidate in sorted({record["candidate"] for record in data["records"]}):
        records = [record for record in data["records"] if record["candidate"] == candidate]
        ratios = [spectral_balance(args.review_directory / f'{candidate}_{record["script"]}.wav') for record in records]
        summary[candidate] = {
            "meanGenerationMs": round(sum(record["generationMs"] for record in records) / len(records)),
            "meanDurationMs": round(sum(record["durationMs"] for record in records) / len(records)),
            "meanWordsPerSecond": round(sum(record["wordsPerSecond"] for record in records) / len(records), 3),
            "totalClippingSamples": sum(record["clippingSamples"] for record in records),
            "meanPeakDbfs": round(sum(record["peakDbfs"] for record in records) / len(records), 2),
            "meanRmsDbfs": round(sum(record["rmsDbfs"] for record in records) / len(records), 2),
            "meanLowMidToPresenceDb": round(float(np.mean(ratios)), 2),
        }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
