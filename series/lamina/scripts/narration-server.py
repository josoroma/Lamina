#!/usr/bin/env python3
"""Local, cached Chatterbox Multilingual V3 narration for the book reader.

No external TTS API or browser-voice fallback. Requests contain one short
segment of the current left page; the browser owns playback and cancellation.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import logging
from pathlib import Path
import re
import select
import socket
import threading
import time
from urllib.parse import urlsplit

MODEL = "mlx-community/chatterbox-multilingual-v3"
REVISION = "03565773edd72e949572557597af8063bb49a18a"
VOICE_MODEL = "ResembleAI/chatterbox"
VOICE_REVISION = "5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18"
MAX_CHARS = 500
ROOT = Path(__file__).resolve().parent.parent
LOG = logging.getLogger("narration")
PARAMS = {"exaggeration": 0.1, "cfg_weight": 0.3, "temperature": 0.7,
          "repetition_penalty": 1.2, "max_new_tokens": 1000}


class Narrator:
    def __init__(self, cache: Path):
        self.cache = cache
        cache.mkdir(parents=True, exist_ok=True)
        self.model = None
        self.status = "loading"
        self.error = None
        self.started = time.monotonic()
        self.slots = threading.BoundedSemaphore(4)
        # Model loading and every MLX operation share a single worker/Metal stream.
        self.worker = ThreadPoolExecutor(max_workers=1, thread_name_prefix="chatterbox")
        self.loaded = self.worker.submit(self.load)

    def load(self):
        try:
            import mlx.core as mx
            from huggingface_hub import hf_hub_download, snapshot_download
            from mlx_audio.tts.utils import load_model
            from mlx_audio.tts.models.chatterbox.chatterbox import Conditionals
            from mlx_audio.tts.models.chatterbox.t3.cond_enc import T3Cond

            LOG.info("Loading %s at revision %s", MODEL, REVISION)
            model_dir = snapshot_download(MODEL, revision=REVISION)
            model = load_model(model_dir)
            if not model.config.multilingual or model.config.t3_model != "v3":
                raise RuntimeError("The downloaded checkpoint is not multilingual V3")

            # Use the official model's bundled default voice. No user voice is cloned.
            voice_file = self.cache / "official-default-voice.safetensors"
            if not voice_file.exists():
                import torch
                source = hf_hub_download(VOICE_MODEL, "conds.pt", revision=VOICE_REVISION)
                tensors = torch.load(source, map_location="cpu", weights_only=True)
                flat = {f"{group}.{key}": mx.array(value.detach().numpy())
                        for group, values in tensors.items() for key, value in values.items()
                        if isinstance(value, torch.Tensor)}
                mx.save_safetensors(str(voice_file), flat)
            voice = mx.load(str(voice_file))
            gen = {key.removeprefix("gen."): value for key, value in voice.items()
                   if key.startswith("gen.")}
            if "prompt_feat_len" not in gen:
                gen["prompt_feat_len"] = mx.array([gen["prompt_feat"].shape[1]])
            model._conds = Conditionals(T3Cond(
                speaker_emb=voice["t3.speaker_emb"],
                cond_prompt_speech_tokens=voice["t3.cond_prompt_speech_tokens"],
                emotion_adv=voice["t3.emotion_adv"],
            ), gen)
            mx.eval(model.parameters())
            self.model = model
            self.status = "ready"
            LOG.info("V3 ready in %.1fs; default voice loaded", time.monotonic() - self.started)
        except Exception as exc:
            self.status = "error"
            self.error = f"{type(exc).__name__}: {exc}"
            LOG.exception("Model initialization failed")

    def health(self):
        return {"model": MODEL, "revision": REVISION, "status": self.status,
                "ready": self.status == "ready", "loading": self.status == "loading",
                "maxChars": MAX_CHARS, "languages": ["en", "es"],
                **({"error": self.error} if self.error else {})}

    def key(self, text, lang):
        data = json.dumps([MODEL, REVISION, VOICE_REVISION, PARAMS, lang, text],
                          ensure_ascii=False, sort_keys=True).encode("utf-8")
        return hashlib.sha256(data).hexdigest()

    def synthesize(self, text, lang, path, disconnected):
        # Waiting requests can disappear when a page or language changes.
        if disconnected():
            return None
        if path.exists():
            return path.read_bytes()
        if self.status != "ready":
            raise RuntimeError(self.error or "The voice model is still loading")
        import mlx.core as mx
        import numpy as np
        import soundfile as sf
        mx.random.seed(int(path.stem[:8], 16))
        start = time.monotonic()
        segments = []
        for result in self.model.generate(text=text, lang_code=lang, verbose=False, **PARAMS):
            mx.eval(result.audio)
            segments.append(np.asarray(result.audio, dtype=np.float32).reshape(-1))
        if not segments:
            raise RuntimeError("The voice model returned no audio")
        audio = np.concatenate(segments)
        if not np.isfinite(audio).all() or not audio.size:
            raise RuntimeError("The voice model returned invalid audio")
        temp = path.with_suffix(".tmp")
        sf.write(temp, np.clip(audio, -1, 1), self.model.sample_rate, format="WAV", subtype="PCM_16")
        temp.replace(path)
        LOG.info("Generated %s: %d chars, %.1fs audio, %.1fs synthesis", lang, len(text),
                 audio.size / self.model.sample_rate, time.monotonic() - start)
        mx.clear_cache()
        return path.read_bytes()


def is_disconnected(connection):
    try:
        readable, _, _ = select.select([connection], [], [], 0)
        return bool(readable and connection.recv(1, socket.MSG_PEEK) == b"")
    except (OSError, ValueError):
        return True


def handler_for(narrator):
    class Handler(BaseHTTPRequestHandler):
        server_version = "LaminaNarration/1"
        protocol_version = "HTTP/1.1"

        def log_message(self, format, *args):
            # Do not log book text or voice samples.
            LOG.info("%s %s", self.command, self.path.split("?")[0])

        def send(self, code, body, content_type="application/json", **headers):
            try:
                self.send_response(code)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(body)))
                self.send_header("X-Content-Type-Options", "nosniff")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Connection", "close")
                self.close_connection = True
                for key, value in headers.items():
                    self.send_header(key.replace("_", "-"), value)
                self.end_headers()
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def error_json(self, code, message):
            self.send(code, json.dumps({"error": message}).encode())

        def local_request(self):
            # No permissive CORS: only same-origin Vite proxies or local clients.
            origin = self.headers.get("Origin")
            if origin and urlsplit(origin).hostname not in {"localhost", "127.0.0.1", "::1"}:
                self.error_json(403, "Only local book readers can use this voice server")
                return False
            return True

        def do_GET(self):
            if not self.local_request():
                return
            path = urlsplit(self.path).path
            if path == "/api/narration/health":
                self.send(200, json.dumps(narrator.health()).encode())
                return
            match = re.fullmatch(r"/api/narration/audio/([0-9a-f]{64})\.wav", path)
            if match:
                file = narrator.cache / f"{match[1]}.wav"
                if file.exists():
                    self.send(200, file.read_bytes(), "audio/wav", X_Narration_Model=MODEL)
                    return
            self.error_json(404, "Not found")

        def do_POST(self):
            if not self.local_request():
                return
            if urlsplit(self.path).path != "/api/narration":
                self.error_json(404, "Not found")
                return
            if self.headers.get_content_type() != "application/json":
                self.error_json(415, "Send application/json")
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 8192:
                    self.error_json(413, "Request too large or empty")
                    return
                data = json.loads(self.rfile.read(size))
            except (ValueError, UnicodeError):
                self.error_json(400, "Invalid JSON")
                return
            if not isinstance(data, dict):
                self.error_json(400, "Expected a JSON object")
                return
            text, lang = data.get("text"), data.get("lang")
            if not isinstance(text, str) or not text.strip() or len(text) > MAX_CHARS:
                self.error_json(400, f"Text must contain 1 to {MAX_CHARS} characters")
                return
            if not isinstance(lang, str) or lang not in {"en", "es"}:
                self.error_json(400, "Language must be en or es")
                return
            text = text.strip()
            key = narrator.key(text, lang)
            file = narrator.cache / f"{key}.wav"
            if file.exists():
                self.send(200, file.read_bytes(), "audio/wav", X_Narration_Model=MODEL,
                          X_Narration_Cache="hit", X_Narration_Key=key)
                return
            if not narrator.slots.acquire(blocking=False):
                self.error_json(429, "The narrator is busy; try again shortly")
                return
            try:
                # A first click may start this local service and its model. Keep
                # that request pending while health checks remain responsive.
                # An abandoned reader stops waiting immediately.
                while narrator.status == "loading":
                    if is_disconnected(self.connection):
                        return
                    time.sleep(0.2)
                if narrator.status != "ready":
                    self.error_json(503, "The voice model could not start; check the narration server log")
                    return
                audio = narrator.worker.submit(narrator.synthesize, text, lang, file,
                                                lambda: is_disconnected(self.connection)).result()
                if audio is not None:
                    self.send(200, audio, "audio/wav", X_Narration_Model=MODEL,
                              X_Narration_Cache="miss", X_Narration_Key=key)
            except Exception:
                LOG.exception("Speech generation failed")
                self.error_json(500, "Narration could not be generated; try again")
            finally:
                narrator.slots.release()

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--cache", type=Path, default=ROOT / ".cache" / "narration")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    # Bind first so a duplicate start cannot launch an orphan model-loading job.
    server = ThreadingHTTPServer(("127.0.0.1", args.port), BaseHTTPRequestHandler)
    narrator = Narrator(args.cache)
    server.RequestHandlerClass = handler_for(narrator)
    server.daemon_threads = True
    LOG.info("Local narrator listening on http://127.0.0.1:%s", args.port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        narrator.worker.shutdown(wait=False, cancel_futures=True)


if __name__ == "__main__":
    main()
