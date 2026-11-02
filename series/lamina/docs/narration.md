# Bilingual narration: local synthesis and published recordings

The reader uses **Chatterbox Multilingual V3** for English and Spanish narration
of the currently displayed left page. Development mode sends short segments to
a local MLX server. Production builds, including GitHub Pages and local build
previews, play published MP3 segments without a speech server. Both use the same
page selection, text chunks and official model's bundled default voice. There is
no browser-voice or hosted-TTS fallback.

## Install and run

Apple Silicon and Python 3.12 are required for this MLX backend. From the project
directory, with [uv](https://docs.astral.sh/uv/) installed:

```sh
npm run narration:setup
npm run dev
```

Vite's development server starts the local voice service on the
first narration request. An already running instance on port 8765 is reused.
To start it manually in a separate terminal, use `npm run narration:serve`.
Service logs are in the series' `.cache/narration/service.log`. Run the npm
commands from the repository root (they forward to `series/lamina`) or from the
series directory. The existing development machine uses ignored local symlinks
to its original repository-level environment and cache; these are not published.

## Static publication

GitHub Pages serves the pre-generated audio in `public/narration/`; it cannot run
the local Python/MLX process. Production never POSTs to `/api/narration`. A page
without a complete recording shows “Narration has not been published for this
page yet.”, translated into Spanish when appropriate.

The versioned manifest records the exact checkpoint, voice revision, generation
settings and current left-page keys. A text change invalidates its old recording.
Only complete pages enter the manifest, so playback cannot stop halfway through
a page merely because later clips have not been generated. Shared identical
chunks are generated once. The exporter writes each clip and manifest atomically
and resumes after interruption.

From the repository root, with `ffmpeg` installed:

```sh
# Export complete pages already in the local cache; performs no synthesis.
python3 series/lamina/scripts/narration-publish.py --cached-only

# Start the local V3 server, then explicitly generate all missing recordings.
npm run narration:serve
# In a second terminal after the model is ready:
python3 series/lamina/scripts/narration-publish.py --generate

# Validate every published clip, permitting unavailable pages.
python3 series/lamina/scripts/narration-publish.py --check-published
# Require complete current narration for every book in both languages.
python3 series/lamina/scripts/narration-publish.py --check

# CI coverage gate: Node only, checks every text hash and MP3 reference.
node series/lamina/scripts/narration-coverage.mjs
# Optional incremental source/decoded-audio signal checks during generation.
series/lamina/.venv-narration/bin/python series/lamina/scripts/narration-audit.py --watch
```

The full check fails while any current left page is missing. Inspect
`public/narration/manifest.json` for coverage rather than assuming a deployment
contains all narration. Rebuild and deploy after adding recordings. Public
assets are 24 kHz mono MP3 at 64 kbit/s; source PCM WAVs and model weights stay in
ignored local caches. Neither a private voice sample nor a TTS credential is
included in the public files.

The signal check reads existing audio without changing synthesis,
records duration, finite samples, signal level, near-full-scale samples and long
silences in `.cache/narration/signal-audit.json`, and checks new clips as they
arrive. Its thresholds flag files for investigation; these measurements do not
establish pronunciation or perceptual voice quality.
The silence-ratio flag requires both over 55% quiet frames and at least 1.5
seconds of quiet audio; a contiguous silent run over 2.5 seconds is checked
separately. This avoids misclassifying ordinary padding around a very short
label: the generated word “alto.” is 1.04 seconds long with a 0.50-second maximum
quiet run, healthy signal level and no clipping. Low-level/all-silent audio is
still flagged independently.

The six-book English/Spanish edition has complete published narration for all
134 readable left pages: 67 English and 67 Spanish pages, using 1,629 page chunks
and 1,567 unique recordings. The completed run on 2026-11-02 took 184.8 minutes
on this M3 Pro, reusing existing cached clips where available. This measured
runtime is not a guarantee for another machine or edition.

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

The local service is a development component. Publishing the static books
publishes only the recordings included in the manifest, not the voice model or
the Python service.

## Verification

Run `python3 series/lamina/scripts/narration-server-test.py` from the repository
root for six model-free HTTP checks,
including loading and cancellation, cache hits, request validation and failure
handling. The application's narration tests run with `npm run test:narration`.
Static transport checks run with
`node series/lamina/scripts/narration-static-test.mjs` from the repository root.
They verify base-relative GET requests, exact page/language selection,
cancellation, and the missing-recording state without a fallback API request.

The completed 2026-11-02 corpus passed strict Node coverage and text/model hash
validation, full ffmpeg decoding of all 1,567 MP3s, and incremental source-WAV
and decoded-MP3 signal checks. No invalid samples, outstanding silence/clipping
flags or source/encoded duration differences remained. Total MP3 size is
104,016,212 bytes.

Unique recordings total 12,868.04 seconds (3 h 34 min 28 s). Playing every page,
including shared clips reused on different pages, totals 13,278.24 seconds
(3 h 41 min 18 s). Individual clips range from 0.92 to 17.08 seconds; complete
pages range from 30.28 to 182.32 seconds. All 1,476 clips containing at least 70
characters were also checked for suspicious duration relative to text length:
observed values were 0.0415–0.124 seconds per character, with none outside the
0.02–0.18 review range. These checks can identify obvious signal defects or
duration anomalies; they are not a perceptual listening or pronunciation review.

The production build was tested under the `/Lamina/` base path with real reader
playback in all six books in both languages (12 editions). It requested only the
selected left page's MP3s by GET without contacting an API. Pause/resume and
cancellation on page or language changes stopped the actual Web Audio sources,
with no late restart or browser errors. The static
transport and controller suites passed 4 and 17 checks respectively, alongside
the local server's 6 model-free HTTP checks.

On the development Mac, real English and Spanish requests produced 24 kHz PCM
WAV files. Warm 149/160-character samples took 7.12/8.29 seconds to generate
7.32/8.48 seconds of audio; a cached repeat took 1.4 milliseconds. These are
observations on this machine, not performance guarantees. The reader buffers
short chunks before playback; an uncached page can initially show “Preparing”.
