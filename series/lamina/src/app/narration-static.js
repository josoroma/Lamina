// Published recordings use the same immutable left-page keys as local speech.
// A missing or stale recording is an explicit error, never a different voice.
export const NARRATION_MODEL = 'mlx-community/chatterbox-multilingual-v3';

export class RecordingUnavailableError extends Error {
  constructor(message = 'This page has no published narration') {
    super(message);
    this.name = 'RecordingUnavailableError';
    this.code = 'recording-unavailable';
  }
}

export function createStaticNarration({ baseURL = './narration/', fetchAudio = (...args) => fetch(...args) } = {}) {
  const base = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
  let manifest = null;
  async function loadManifest() {
    if (!manifest) {
      // The small shared manifest belongs to the edition, not a playback token.
      // Canceling a page must not poison the next page's manifest request.
      manifest = (async () => {
        const response = await fetchAudio(`${base}manifest.json`, { method: 'GET' });
        if (!response.ok) throw new RecordingUnavailableError();
        const data = await response.json();
        if (data.version !== 1 || data.model !== NARRATION_MODEL || !data.pages || typeof data.pages !== 'object') {
          throw new RecordingUnavailableError('Unsupported narration manifest');
        }
        return data;
      })().catch((cause) => { manifest = null; throw cause; });
    }
    return manifest;
  }
  return async ({ page, index, signal }) => {
    signal?.throwIfAborted();
    const data = await loadManifest();
    signal?.throwIfAborted();
    const recording = data.pages[page.key];
    if (!recording || recording.lang !== page.lang || recording.chunks?.length !== page.chunks.length) {
      throw new RecordingUnavailableError();
    }
    const file = recording.chunks[index];
    if (typeof file !== 'string' || !/^[a-f0-9]{64}\.mp3$/.test(file)) {
      throw new RecordingUnavailableError('Invalid narration asset');
    }
    const response = await fetchAudio(`${base}${file}`, { method: 'GET', signal });
    if (!response.ok) throw new RecordingUnavailableError();
    return response;
  };
}
