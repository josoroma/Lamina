# Published Chatterbox narration

`manifest.json` is the source of truth for recording coverage. It lists only
complete recordings for an exact left-page text key and language. A missing page
is unavailable; no substitute speech engine is used.

These MP3 clips were generated locally using
`mlx-community/chatterbox-multilingual-v3`, checkpoint
`03565773edd72e949572557597af8063bb49a18a`, and the official bundled default voice
from `ResembleAI/chatterbox`, revision
`5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18`. The manifest records generation settings.
Upstream model/code licenses are MIT. No personal voice is cloned.

The resumable publisher is `scripts/narration-publish.py` in this series. Model
weights, Python environments and source WAV caches are intentionally excluded
from the static site. See `docs/narration.md` for generation and validation.
