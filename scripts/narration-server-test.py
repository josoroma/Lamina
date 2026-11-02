#!/usr/bin/env python3
"""HTTP boundary tests; no model download or MLX installation required."""
from concurrent.futures import ThreadPoolExecutor
import http.client
import importlib.util
import json
from pathlib import Path
import socket
import tempfile
import threading
import time
import unittest

spec = importlib.util.spec_from_file_location("narration", Path(__file__).with_name("narration-server.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FakeNarrator:
    key = module.Narrator.key
    health = module.Narrator.health

    def __init__(self, cache):
        self.cache = cache
        self.status = "ready"
        self.error = None
        self.slots = threading.BoundedSemaphore(4)
        self.worker = ThreadPoolExecutor(max_workers=1)
        self.calls = []

    def synthesize(self, text, lang, path, disconnected):
        if disconnected():
            return None
        self.calls.append((text, lang))
        return b"RIFF-test-audio"


class API(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.narrator = FakeNarrator(Path(self.tmp.name))
        self.server = module.ThreadingHTTPServer(("127.0.0.1", 0), module.handler_for(self.narrator))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.narrator.worker.shutdown()
        self.tmp.cleanup()

    def request(self, data=None, *, origin=None, path="/api/narration"):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        headers = {"Content-Type": "application/json"}
        if origin:
            headers["Origin"] = origin
        connection.request("GET" if data is None else "POST", path,
                           None if data is None else json.dumps(data), headers)
        response = connection.getresponse()
        result = response.status, response.read(), dict(response.getheaders())
        connection.close()
        return result

    def test_health_while_initial_request_waits(self):
        self.narrator.status = "loading"
        result = []
        request = threading.Thread(target=lambda: result.append(self.request({"text": "Hola.", "lang": "es"})))
        request.start()
        time.sleep(0.05)
        status, body, _ = self.request(path="/api/narration/health")
        self.assertEqual(status, 200)
        self.assertTrue(json.loads(body)["loading"])
        self.assertEqual(result, [])
        self.narrator.status = "ready"
        request.join(timeout=2)
        self.assertEqual(result[0][0], 200)
        self.assertEqual(self.narrator.calls, [("Hola.", "es")])

    def test_cached_segment_needs_no_loaded_model(self):
        self.narrator.status = "loading"
        key = self.narrator.key("Hello.", "en")
        (self.narrator.cache / f"{key}.wav").write_bytes(b"RIFF-cached")
        status, body, headers = self.request({"text": "Hello.", "lang": "en"})
        self.assertEqual((status, body, headers["X-Narration-Cache"]), (200, b"RIFF-cached", "hit"))
        self.assertEqual(self.narrator.calls, [])

    def test_invalid_input_never_enters_model(self):
        for data in [[], {"text": "", "lang": "en"}, {"text": "x" * 501, "lang": "en"},
                     {"text": "Hello.", "lang": ["en"]}, {"text": "Hallo.", "lang": "de"}]:
            self.assertEqual(self.request(data)[0], 400)
        self.assertEqual(self.narrator.calls, [])

    def test_foreign_browser_origin_is_rejected(self):
        self.assertEqual(self.request({"text": "Hello.", "lang": "en"}, origin="https://example.com")[0], 403)
        self.assertEqual(self.narrator.calls, [])

    def test_failed_model_returns_recovery_status(self):
        self.narrator.status = "error"
        self.assertEqual(self.request({"text": "Hello.", "lang": "en"})[0], 503)

    def test_cancelled_connection_is_detected(self):
        left, right = socket.socketpair()
        try:
            self.assertFalse(module.is_disconnected(left))
            right.close()
            self.assertTrue(module.is_disconnected(left))
        finally:
            left.close()
            right.close()


if __name__ == "__main__":
    unittest.main()
