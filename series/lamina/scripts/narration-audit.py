#!/usr/bin/env python3
"""Incremental signal checks for real published narration (not a listening test)."""
from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import subprocess
import time
import wave

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("narration_publisher", Path(__file__).with_name("narration-publish.py"))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
LIMITS = {"maxSeconds": 32, "maxSecondsPerChar": 0.18, "minimumRms": 0.002,
          "silenceRms": 0.004, "maxSilenceFraction": 0.55, "maxSilentRunSeconds": 2.5,
          "minTotalSilenceSeconds": 1.5,
          "maxClippedFraction": 0.001}


def signal_stats(samples, rate):
    values = np.asarray(samples, dtype=np.float32)
    if values.size == 0 or not np.isfinite(values).all():
        raise ValueError("Decoded signal is empty or contains NaN/Infinity")
    window = max(1, round(rate * 0.02))
    frames = values[:values.size // window * window].reshape(-1, window)
    quiet = np.sqrt(np.mean(frames * frames, axis=1)) < LIMITS["silenceRms"]
    longest = run = 0
    for silent in quiet:
        run = run + 1 if silent else 0
        longest = max(longest, run)
    return {"seconds": round(values.size / rate, 4),
            "rms": round(float(np.sqrt(np.mean(values * values))), 6),
            "peak": round(float(np.max(np.abs(values))), 6),
            "clippedFraction": round(float(np.mean(np.abs(values) >= 0.9999)), 7),
            "silenceFraction": round(float(np.mean(quiet)) if quiet.size else 1.0, 5),
            "longestSilentRunSeconds": round(longest * window / rate, 3), "finite": True}


def inspect(mp3, wav, text_info):
    with wave.open(str(wav)) as source:
        if source.getnchannels() != 1 or source.getframerate() != 24000 or source.getsampwidth() != 2:
            raise ValueError("Source must be 24 kHz mono 16-bit PCM")
        raw = np.frombuffer(source.readframes(source.getnframes()), dtype='<i2').astype(np.float32) / 32768
    source_stats = signal_stats(raw, 24000)
    result = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-i", str(mp3),
                             "-f", "f32le", "-ac", "1", "-ar", "24000", "pipe:1"],
                            check=True, capture_output=True)
    decoded_stats = signal_stats(np.frombuffer(result.stdout, dtype='<f4'), 24000)
    flags = []
    for kind, stats in [("wav", source_stats), ("mp3", decoded_stats)]:
        if stats["seconds"] > LIMITS["maxSeconds"]:
            flags.append(f"{kind}: unusually long segment")
        if text_info["characters"] > 70 and stats["seconds"] / text_info["characters"] > LIMITS["maxSecondsPerChar"]:
            flags.append(f"{kind}: unusually long for its text")
        if stats["rms"] < LIMITS["minimumRms"]:
            flags.append(f"{kind}: very low signal level")
        # A short word can have ordinary half-second synthesis padding and a
        # high silence percentage. Require meaningful absolute quiet time for
        # that ratio flag; long gaps and an all-silent/very quiet signal remain
        # independently detectable regardless of the word's length.
        excessive_share = (stats["silenceFraction"] > LIMITS["maxSilenceFraction"]
                           and stats["seconds"] * stats["silenceFraction"] >= LIMITS["minTotalSilenceSeconds"])
        if excessive_share or stats["longestSilentRunSeconds"] > LIMITS["maxSilentRunSeconds"]:
            flags.append(f"{kind}: excessive silence")
        if stats["clippedFraction"] > LIMITS["maxClippedFraction"]:
            flags.append(f"{kind}: sustained near-full-scale samples")
    if abs(source_stats["seconds"] - decoded_stats["seconds"]) > 0.15:
        flags.append("encoded duration differs from source")
    return {**text_info, "wav": source_stats, "mp3": decoded_stats, "flags": flags}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--watch", action="store_true", help="Check new clips until manifest coverage is complete")
    parser.add_argument("--interval", type=float, default=30)
    parser.add_argument("--cache", type=Path, default=ROOT / ".cache" / "narration")
    parser.add_argument("--audio", type=Path, default=ROOT / "public" / "narration")
    parser.add_argument("--report", type=Path, default=ROOT / ".cache" / "narration" / "signal-audit.json")
    args = parser.parse_args()
    text_map = {}
    pages = publisher.load_plan()
    for page in pages:
        for text in page["chunks"]:
            text_map.setdefault(publisher.audio_key(text, page["lang"]),
                                {"lang": page["lang"], "page": page["key"], "characters": len(text)})
    report = json.loads(args.report.read_text()) if args.report.exists() else {}
    if report.get("limits") != LIMITS:
        report = {}
    report.update({"version": 1, "kind": "objective signal checks; not perceptual listening", "limits": LIMITS})
    records = report.setdefault("clips", {})
    args.report.parent.mkdir(parents=True, exist_ok=True)
    while True:
        added = 0
        for mp3 in sorted(args.audio.glob("*.mp3")):
            key = mp3.stem
            if key not in text_map:
                continue
            wav = args.cache / f"{key}.wav"
            stamp = [mp3.stat().st_size, mp3.stat().st_mtime_ns,
                     wav.stat().st_size if wav.exists() else 0, wav.stat().st_mtime_ns if wav.exists() else 0]
            if records.get(key, {}).get("stamp") == stamp:
                continue
            try:
                entry = inspect(mp3, wav, text_map[key])
            except Exception as exc:
                entry = {**text_map[key], "flags": [f"invalid audio: {type(exc).__name__}: {exc}"]}
            entry["stamp"] = stamp
            records[key] = entry
            added += 1
            if entry["flags"]:
                print(json.dumps({"attention": key, "flags": entry["flags"]}), flush=True)
        manifest = json.loads((args.audio / "manifest.json").read_text())
        report["coverage"] = manifest["coverage"]
        report["summary"] = {"checkedClips": len(records), "expectedUniqueClips": len(text_map),
                             "flaggedClips": sum(bool(v["flags"]) for v in records.values()),
                             "updatedUnix": time.time()}
        publisher.write_json(args.report, report)
        if added:
            print(json.dumps({"added": added, **report["coverage"], **report["summary"]}), flush=True)
        complete = (manifest["coverage"]["completePages"] == len(pages)
                    and all(key in records for key in text_map))
        if not args.watch or complete:
            return 1 if report["summary"]["flaggedClips"] else 0
        time.sleep(max(1, args.interval))


if __name__ == "__main__":
    raise SystemExit(main())
