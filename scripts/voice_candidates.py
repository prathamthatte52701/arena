"""Generate stock female Piper comparisons, never using reference audio for TTS."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import wave

text = "You think you're ready for me? Then prove it."
model_dir = Path(os.environ["LOCALAPPDATA"]) / "PromoQueens/piper/female-candidates"
output_dir = Path("outputs/phase22-female-candidates")
output_dir.mkdir(parents=True, exist_ok=True)
results = []
for name in ["en_GB-alba-medium", "en_US-ljspeech-high", "en_US-kristin-medium"]:
    output = output_dir / f"{name}.wav"
    started = time.monotonic()
    process = subprocess.run([sys.executable, "-m", "piper", "-m", str(model_dir / f"{name}.onnx"), "-f", str(output), "--length-scale", "1", "--sentence-silence", "0.25"], input=text.encode("utf-8"), capture_output=True)
    if process.returncode:
        results.append({"voice": name, "error": process.stderr.decode("utf-8", errors="replace")[-1500:]})
        continue
    with wave.open(str(output)) as audio:
        duration = round(audio.getnframes() / audio.getframerate() * 1000)
        frames = audio.getnframes()
    results.append({"voice": name, "text": text, "durationMs": duration, "frames": frames, "bytes": output.stat().st_size, "generationSeconds": round(time.monotonic() - started, 2), "postProcessing": None, "listeningVerdict": "pending"})
    print(json.dumps(results[-1]), flush=True)
(output_dir / "results.json").write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
