# Local bilingual narration

The reader uses **Chatterbox Multilingual V3** for English and Spanish narration.
It sends short segments of the currently displayed left page to a local server.
The model runs on this Mac through MLX; the text is not sent to a hosted speech
API. The stock voice comes from the official model's bundled voice tensors.

## Install and run

Apple Silicon and Python 3.12 are required for this MLX backend. From the project
directory, with [uv](https://docs.astral.sh/uv/) installed:

```sh
npm run narration:setup
npm run dev
```

Vite's development and preview servers start the local voice service on the
first narration request. An already running instance on port 8765 is reused.
To start it manually in a separate terminal, use `npm run narration:serve`.
Service logs are in `.cache/narration/service.log`.

The first start downloads the model and its speech tokenizer into Hugging Face's
local cache. The main checkpoint is about 2.71 GB. Later starts reuse these files.
While loading, the health endpoint remains available. No API key is needed for
these public model files. Vite forwards `/api/narration` to this loopback server.

Generated WAV segments are cached in `.cache/narration/`. Their keys include the
text, language, exact model and voice revisions, and generation settings. The
server serializes generation and skips queued requests whose client disconnected.
An already-running inference may finish into the cache after the reader stops;
it must never begin playing automatically on another page.

## API

- `GET /api/narration/health`: model, revision, status (`loading`, `ready`, `error`),
  boolean `ready` and `loading`, supported languages and maximum text length.
- `POST /api/narration`: JSON `{ "text": "…", "lang": "en" }` or `"es"`;
  returns `audio/wav`. Text is limited to 500 characters per request. The reader
  supplies smaller sentence/paragraph chunks to reduce the initial wait.
- `GET /api/narration/audio/<hash>.wav`: a previously generated cached segment.

`X-Narration-Model`, `X-Narration-Cache` and `X-Narration-Key` identify a generated
response. Invalid input returns 400/413/415 and a busy queue returns 429. A first
POST waits while the model loads; health checks remain responsive, and closing
the page cancels that wait. A model that failed to initialize returns 503.
The browser shows preparation or recovery feedback rather than silently using
a different speech engine.

## Model provenance

The checkpoint is [mlx-community/chatterbox-multilingual-v3](https://huggingface.co/mlx-community/chatterbox-multilingual-v3),
revision `03565773edd72e949572557597af8063bb49a18a`, used with MLX Audio 0.4.7.
Its configuration explicitly names `t3_model: "v3"` and multilingual processing;
the server checks both before announcing readiness. The implementation follows
the [MLX Audio Chatterbox documentation](https://blaizzy.github.io/mlx-audio/models/tts/chatterbox/).

The default voice is `conds.pt` from [ResembleAI/chatterbox](https://huggingface.co/ResembleAI/chatterbox),
revision `5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18`, the same bundled conditioning
used by the official multilingual loader. It is loaded with PyTorch's
`weights_only=True` and converted once into local safetensors. The checkpoint
and upstream Chatterbox code carry MIT licenses.

This service is a local development component. Publishing the static books does
not publish or provision a machine that can run their voice model.

## Verification

Run `python3 scripts/narration-server-test.py` for six model-free HTTP checks,
including loading and cancellation, cache hits, request validation and failure
handling. The application's narration tests run with `npm run test:narration`.

On the development Mac, real English and Spanish requests produced 24 kHz PCM
WAV files. Warm 149/160-character samples took 7.12/8.29 seconds to generate
7.32/8.48 seconds of audio; a cached repeat took 1.4 milliseconds. These are
observations on this machine, not performance guarantees. The reader buffers
short chunks before playback; an uncached page can initially show “Preparing”.
