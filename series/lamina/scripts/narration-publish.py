#!/usr/bin/env python3
"""Publish genuine Chatterbox V3 recordings for static hosting.

Default/cached-only mode never starts inference. --generate explicitly requests
all missing chunks from the local model service. Both modes are resumable and
publish complete pages only. --check verifies full coverage without modifying it.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import wave

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("local_narration", Path(__file__).with_name("narration-server.py"))
voice = importlib.util.module_from_spec(spec)
spec.loader.exec_module(voice)


def load_plan():
    result = subprocess.run(["node", str(Path(__file__).with_name("narration-plan.mjs"))],
                            cwd=ROOT, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)["pages"]


def audio_key(text, lang):
    # This method has no instance state: importing the server does not load MLX
    # or a voice. Reuse its exact revision/settings hash rather than duplicating it.
    return voice.Narrator.key(None, text, lang)


def write_json(path, data):
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    temp.replace(path)


def wav_duration(path):
    with wave.open(str(path)) as wav:
        if wav.getframerate() != 24000 or wav.getnchannels() != 1 or wav.getnframes() <= 0:
            raise ValueError(f"Invalid 24 kHz mono source: {path.name}")
        return wav.getnframes() / wav.getframerate()


def request_audio(origin, text, lang, key, cache):
    body = json.dumps({"text": text, "lang": lang}, ensure_ascii=False).encode("utf-8")
    request = Request(origin + "/api/narration", data=body,
                      headers={"Content-Type": "application/json"}, method="POST")
    for attempt in range(3):
        try:
            with urlopen(request, timeout=600) as response:
                if response.headers.get("X-Narration-Model") != voice.MODEL or response.headers.get("X-Narration-Key") != key:
                    raise ValueError("The local service returned another model or generation configuration")
                data = response.read()
            target = cache / f"{key}.wav"
            if not target.exists():
                temp = target.with_suffix(".download")
                temp.write_bytes(data)
                temp.replace(target)
            wav_duration(target)
            return
        except (HTTPError, URLError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))


def encode(source, output):
    wav_duration(source)
    temp = output.with_suffix(".tmp.mp3")
    try:
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
                        "-i", str(source), "-map_metadata", "-1", "-ac", "1", "-ar", "24000",
                        "-c:a", "libmp3lame", "-b:a", "64k", str(temp)], check=True)
        if temp.stat().st_size < 500:
            raise ValueError(f"Encoded audio is empty: {output.name}")
        temp.replace(output)
    finally:
        temp.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--generate", action="store_true", help="Synthesize missing chunks locally; may take hours")
    mode.add_argument("--cached-only", action="store_true", help="Publish only pages whose recordings already exist (default)")
    mode.add_argument("--check", action="store_true", help="Require complete, current recordings for every left page")
    mode.add_argument("--check-published", action="store_true", help="Validate published recordings while allowing missing pages")
    parser.add_argument("--origin", default="http://127.0.0.1:8765")
    parser.add_argument("--cache", type=Path, default=ROOT / ".cache" / "narration")
    parser.add_argument("--output", type=Path, default=ROOT / "public" / "narration")
    args = parser.parse_args()
    pages = load_plan()
    plans = [(page, [audio_key(text, page["lang"]) for text in page["chunks"]]) for page in pages]
    output = args.output
    manifest_path = output / "manifest.json"
    existing = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    manifest = {
        "version": 1, "model": voice.MODEL, "revision": voice.REVISION,
        "voiceModel": voice.VOICE_MODEL, "voiceRevision": voice.VOICE_REVISION,
        "parameters": voice.PARAMS, "encoding": {"format": "mp3", "sampleRate": 24000, "channels": 1, "bitrate": 64000},
        "coverage": {"completePages": 0, "totalPages": len(pages)}, "pages": {},
    }
    # Reuse only exact current page keys with the correct pinned provenance.
    provenance = all(existing.get(k) == manifest[k] for k in ["model", "revision", "voiceRevision", "parameters"])
    for page, keys in plans:
        entry = existing.get("pages", {}).get(page["key"]) if provenance else None
        files = [f"{key}.mp3" for key in keys]
        if entry and entry.get("lang") == page["lang"] and entry.get("chunks") == files and all((output / f).is_file() and (output / f).stat().st_size >= 500 for f in files):
            manifest["pages"][page["key"]] = entry
    if args.check or args.check_published:
        if not provenance or existing.get("version") != 1:
            raise ValueError("No valid manifest with the current model provenance")
        if set(existing.get("pages", {})) != set(manifest["pages"]):
            raise ValueError("Published manifest contains stale, incomplete or missing page assets")
        files = {f for entry in manifest["pages"].values() for f in entry["chunks"]}
        for file in sorted(files):
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-i", str(output / file), "-f", "null", "-"], check=True)
        missing = [p["key"] for p in pages if p["key"] not in manifest["pages"]]
        print(json.dumps({"completePages": len(manifest["pages"]), "totalPages": len(pages),
                          "verifiedFiles": len(files), "missingPages": len(missing),
                          **({"missing": missing} if args.check and missing else {})}, indent=2))
        return 1 if args.check and missing else 0
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg is required to encode published MP3 recordings")
    if args.generate:
        with urlopen(args.origin + "/api/narration/health", timeout=10) as response:
            health = json.load(response)
        if health.get("model") != voice.MODEL or health.get("revision") != voice.REVISION or not health.get("ready"):
            raise RuntimeError("Start npm run narration:serve and wait until the pinned V3 model is ready")
    output.mkdir(parents=True, exist_ok=True)
    args.cache.mkdir(parents=True, exist_ok=True)

    def checkpoint():
        manifest["coverage"]["completePages"] = len(manifest["pages"])
        write_json(manifest_path, manifest)

    checkpoint()
    for page, keys in plans:
        if page["key"] in manifest["pages"]:
            continue
        if not args.generate and not all((args.cache / f"{key}.wav").is_file() or (output / f"{key}.mp3").is_file() for key in keys):
            continue
        for index, (text, key) in enumerate(zip(page["chunks"], keys)):
            published, cached = output / f"{key}.mp3", args.cache / f"{key}.wav"
            if published.is_file() and published.stat().st_size >= 500:
                continue
            if not cached.is_file():
                request_audio(args.origin, text, page["lang"], key, args.cache)
            encode(cached, published)
            print(json.dumps({"page": page["key"], "chunk": index + 1, "chunks": len(keys), "file": published.name}), flush=True)
        manifest["pages"][page["key"]] = {"lang": page["lang"], "bookId": page["bookId"], "title": page["title"], "chunks": [f"{key}.mp3" for key in keys]}
        checkpoint()
        print(json.dumps({"completed": page["key"], **manifest["coverage"]}), flush=True)
    checkpoint()
    print(json.dumps({"mode": "generate" if args.generate else "cached-only", **manifest["coverage"]}), flush=True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("Stopped; complete pages and generated clips are retained for the next run.", file=sys.stderr)
        sys.exit(130)
