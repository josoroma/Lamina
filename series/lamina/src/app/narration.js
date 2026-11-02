// On-demand speech for one printed left page. AudioContext is unlocked by the
// Listen gesture; requests and decoded buffers belong to that page's token.
// Chatterbox buffers two short chunks ahead, never a different page or edition.
import { createStaticNarration } from './narration-static.js';

export function createNarration({ onState = () => {}, endpoint = '/api/narration',
  fetchAudio = (...args) => fetch(...args),
  createContext = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
  staticBase = import.meta.env?.PROD ? `${import.meta.env.BASE_URL}narration/` : null,
} = {}) {
  const publishedAudio = staticBase ? createStaticNarration({ baseURL: staticBase, fetchAudio }) : null;
  let page = null, status = 'idle', error = null, finished = false;
  let context = null, source = null, buffer = null, offset = 0, started = 0;
  let index = 0, token = 0, intent = 0, requested = false, disposed = false, abort = null;
  let loadingChunk = null;
  const buffers = new Map();
  const snapshot = () => ({ status, available: !!page?.chunks?.length, error, finished,
    key: page?.key ?? null, lang: page?.lang ?? null, chunk: index, total: page?.chunks?.length ?? 0 });
  const emit = () => { if (!disposed) onState(snapshot()); };
  const valid = (job) => !disposed && job === token;

  function haltSource() {
    const old = source;
    source = null;
    if (old) { old.onended = null; try { old.stop(); } catch {} old.disconnect(); }
  }
  function stop() {
    ++token;
    ++intent;
    requested = false;
    abort?.abort(); abort = null;
    haltSource(); buffers.clear(); buffer = null; offset = 0; index = 0;
    loadingChunk = null;
    status = 'idle'; error = null; finished = false;
    emit();
  }
  function fail(job, cause) {
    if (!valid(job) || cause?.name === 'AbortError') return;
    haltSource(); requested = false; status = 'error';
    error = cause?.code === 'recording-unavailable' ? cause.code : 'unavailable'; emit();
  }
  function getBuffer(n, job) {
    if (buffers.has(n)) return buffers.get(n);
    const reading = page, text = reading.chunks[n], lang = reading.lang, signal = abort.signal;
    const task = (async () => {
      const response = publishedAudio
        ? await publishedAudio({ page: reading, index: n, signal })
        : await fetchAudio(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, lang }), signal });
      if (!response.ok) throw new Error(`Narration request failed (${response.status})`);
      const bytes = await response.arrayBuffer();
      if (!valid(job)) throw new DOMException('Page changed', 'AbortError');
      const decoded = await context.decodeAudioData(bytes);
      if (!valid(job)) throw new DOMException('Page changed', 'AbortError');
      return decoded;
    })();
    buffers.set(n, task);
    return task;
  }
  function playBuffer(job) {
    if (!valid(job) || !requested || !buffer) return;
    haltSource();
    const current = context.createBufferSource();
    current.buffer = buffer; current.connect(context.destination); source = current;
    started = context.currentTime - offset;
    current.onended = () => {
      if (!valid(job) || source !== current) return;
      source = null; current.disconnect(); buffer = null; offset = 0;
      buffers.delete(index++);
      if (index >= page.chunks.length) {
        requested = false; status = 'idle'; finished = true; emit();
      } else loadChunk(job);
    };
    current.start(0, Math.min(offset, Math.max(0, buffer.duration - 0.001)));
    status = 'playing'; emit();
    // Keep a small lead over playback; rejected prefetches are
    // handled when that chunk becomes current, without unhandled rejections.
    for (let ahead = 1; ahead <= 2; ahead++) {
      if (index + ahead < page.chunks.length) getBuffer(index + ahead, job).catch(() => {});
    }
  }
  async function loadChunk(job) {
    if (!valid(job)) return;
    const key = `${job}:${index}`;
    if (loadingChunk === key) return; // resume joins the existing fetch/decode consumer
    loadingChunk = key;
    status = requested ? 'loading' : 'paused'; emit();
    try {
      // The first two chunks buffer together before speech starts. Warm local
      // generation is near real-time, so this margin avoids a gap after the
      // first sentence without generating the rest of the book in advance.
      const decoded = index === 0 && page.chunks.length > 1
        ? (await Promise.all([getBuffer(0, job), getBuffer(1, job)]))[0]
        : await getBuffer(index, job);
      if (!valid(job)) return;
      buffer = decoded;
      if (requested) playBuffer(job);
      else { status = 'paused'; emit(); }
    } catch (cause) { fail(job, cause); }
    finally { if (loadingChunk === key) loadingChunk = null; }
  }
  function pause() {
    if (!['playing', 'loading'].includes(status)) return;
    ++intent;
    requested = false;
    if (source) offset = Math.min(buffer.duration, Math.max(0, context.currentTime - started));
    haltSource(); status = 'paused'; emit();
  }
  async function toggle() {
    if (disposed || !page?.chunks?.length) return;
    if (status === 'playing' || status === 'loading') { pause(); return; }
    const resuming = status === 'paused';
    if (!resuming) { stop(); abort = new AbortController(); }
    requested = true; error = null; finished = false;
    const job = token;
    const playIntent = ++intent;
    status = 'loading'; emit();
    try {
      context ??= createContext();
      // Called in the user gesture, before waiting for network/model output.
      await context.resume();
      if (!valid(job) || playIntent !== intent || !requested) return;
      if (buffer) playBuffer(job);
      else await loadChunk(job);
    } catch (cause) { if (playIntent === intent) fail(job, cause); }
  }
  return {
    get state() { return snapshot(); },
    setPage(next) {
      if ((next?.key ?? null) === (page?.key ?? null)) return;
      stop(); page = next; emit();
    },
    toggle, pause, stop,
    dispose() { stop(); disposed = true; page = null; context?.close?.().catch(() => {}); context = null; },
  };
}
