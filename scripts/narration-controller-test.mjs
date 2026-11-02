#!/usr/bin/env node
// Controller contracts with a deferred transport and a minimal WebAudio clock.
// No synthesis/model/network is required; these cases deliberately resolve
// canceled requests to prove the page token, not fetch cancellation alone,
// protects the currently visible page.
import assert from 'node:assert/strict';
import { createNarration } from '../src/app/narration.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const tick = async () => { for (let n = 0; n < 12; n++) await Promise.resolve(); };
const audio = (label, duration = 10) => ({ ok: true, status: 200, arrayBuffer: async () => ({ label, duration }) });
const page = (key = 'en:left-1', lang = 'en', chunks = ['First left-page chunk.', 'Second left-page chunk.']) => ({ key, lang, chunks });

function harness({ decode, resume } = {}) {
  const requests = [], sources = [], states = [], decoded = [];
  const context = {
    currentTime: 0,
    destination: {},
    closed: false,
    resume: resume ?? (async () => {}),
    close: async () => { context.closed = true; },
    decodeAudioData: async (bytes) => { decoded.push(bytes); return decode ? decode(bytes) : bytes; },
    createBufferSource() {
      const source = {
        buffer: null, onended: null, connected: false, stopped: 0, starts: [],
        connect() { this.connected = true; },
        disconnect() { this.connected = false; },
        stop() { this.stopped++; },
        start(when, offset) { this.starts.push({ when, offset }); },
        finish() { this.onended?.(); },
      };
      sources.push(source);
      return source;
    },
  };
  let contexts = 0;
  const controller = createNarration({
    onState: (state) => states.push(state),
    createContext: () => { contexts++; return context; },
    fetchAudio: (url, options) => {
      const job = deferred();
      requests.push({ ...job, url, options, body: JSON.parse(options.body) });
      return job.promise;
    },
  });
  return { controller, context, requests, sources, states, decoded, get contexts() { return contexts; } };
}

const tests = [];
const test = (name, run) => tests.push({ name, run });

test('no selected or readable page creates neither audio nor a request', async (h) => {
  await h.controller.toggle();
  h.controller.setPage(page('empty', 'en', []));
  await h.controller.toggle();
  assert.equal(h.contexts, 0);
  assert.equal(h.requests.length, 0);
  assert.equal(h.controller.state.available, false);
});

test('prebuffers two chunks, stays two ahead on this page and stops at its end', async (h) => {
  const chunks = ['First left-page chunk.', 'Second left-page chunk.', 'Third left-page chunk.', 'Fourth left-page chunk.', 'Fifth left-page chunk.'];
  h.controller.setPage(page('en:left-1', 'en', chunks));
  h.controller.toggle(); await tick();
  assert.equal(h.requests.length, 2, 'prepare the first two chunks together');
  assert.deepEqual(h.requests[0].body, { text: 'First left-page chunk.', lang: 'en' });
  h.requests[0].resolve(audio('first')); await tick();
  assert.equal(h.controller.state.status, 'loading');
  assert.equal(h.sources.length, 0, 'wait for both initial chunks before playback');
  h.requests[1].resolve(audio('second')); await tick();
  assert.equal(h.controller.state.status, 'playing');
  assert.equal(h.sources[0].buffer.label, 'first');
  assert.equal(h.requests.length, 3, 'current plus two upcoming chunks only');
  h.requests[2].resolve(audio('third')); await tick();
  assert.equal(h.sources.length, 1, 'lookahead must not play early');
  h.sources[0].finish(); await tick();
  assert.equal(h.sources[1].buffer.label, 'second');
  assert.equal(h.requests.length, 4, 'only one replacement request after a chunk ends');
  h.requests[3].resolve(audio('fourth')); await tick();
  h.sources[1].finish(); await tick();
  assert.equal(h.sources[2].buffer.label, 'third');
  assert.equal(h.requests.length, 5);
  h.requests[4].resolve(audio('fifth')); await tick();
  h.sources[2].finish(); await tick();
  assert.equal(h.sources[3].buffer.label, 'fourth');
  h.sources[3].finish(); await tick();
  assert.equal(h.sources[4].buffer.label, 'fifth');
  h.sources[4].finish(); await tick();
  assert.equal(h.controller.state.status, 'idle');
  assert.equal(h.controller.state.finished, true);
  assert.equal(h.requests.length, 5, 'never fetch another page or automatically loop');
  assert.deepEqual(h.requests.map((r) => r.body.text), chunks);
});

test('pause and repeated resume preserve the elapsed buffer offset', async (h) => {
  h.controller.setPage(page('single', 'en', ['One chunk.']));
  h.controller.toggle(); await tick();
  h.requests[0].resolve(audio('single', 12)); await tick();
  h.context.currentTime = 2.75;
  h.controller.pause();
  assert.equal(h.sources[0].stopped, 1);
  assert.equal(h.sources[0].connected, false);
  assert.equal(h.controller.state.status, 'paused');
  h.context.currentTime = 40;
  await h.controller.toggle();
  assert.equal(h.sources[1].starts[0].offset, 2.75);
  h.context.currentTime = 41.25;
  h.controller.pause();
  h.context.currentTime = 90;
  await h.controller.toggle();
  assert.equal(h.sources[2].starts[0].offset, 4);
  assert.equal(h.requests.length, 1, 'resume reuses the decoded buffer');
});

test('a page/language switch aborts transport and rejects a late old-page response', async (h) => {
  h.controller.setPage(page()); h.controller.toggle(); await tick();
  const stale = h.requests.slice();
  h.controller.setPage(page('es:left-1', 'es', ['Solo la página izquierda.']));
  assert.equal(stale.length, 2);
  assert(stale.every((r) => r.options.signal.aborted));
  stale.forEach((r) => r.resolve(audio('stale English'))); await tick();
  assert.equal(h.decoded.length, 0);
  assert.equal(h.sources.length, 0);
  assert.equal(h.controller.state.status, 'idle');
  h.controller.toggle(); await tick();
  assert.deepEqual(h.requests[2].body, { text: 'Solo la página izquierda.', lang: 'es' });
  h.requests[2].resolve(audio('Spanish')); await tick();
  assert.equal(h.sources[0].buffer.label, 'Spanish');
});

test('changing page while playing stops audio and a stale ended event cannot advance', async (h) => {
  h.controller.setPage(page('old', 'en', ['Old one.', 'Old two.', 'Old three.'])); h.controller.toggle(); await tick();
  h.requests[0].resolve(audio('old')); h.requests[1].resolve(audio('old two')); await tick();
  const old = h.sources[0], ended = old.onended, prefetched = h.requests[2];
  h.controller.setPage(page('en:left-2', 'en', ['A different left page.']));
  assert.equal(old.stopped, 1);
  assert.equal(prefetched.options.signal.aborted, true);
  ended(); prefetched.resolve(audio('old prefetch')); await tick();
  assert.equal(h.sources.length, 1);
  assert.equal(h.controller.state.key, 'en:left-2');
  assert.equal(h.controller.state.chunk, 0);
  assert.equal(h.controller.state.status, 'idle');
});

test('stop while loading leaves a selected page but prevents stale playback', async (h) => {
  h.controller.setPage(page()); h.controller.toggle(); await tick();
  h.controller.stop();
  assert(h.requests.every((r) => r.options.signal.aborted));
  h.requests.forEach((r) => r.resolve(audio('canceled'))); await tick();
  assert.equal(h.sources.length, 0);
  assert.equal(h.controller.state.available, true);
  assert.equal(h.controller.state.status, 'idle');
});

test('pause during fetch allows caching but waits for resume to start audio', async (h) => {
  h.controller.setPage(page('single', 'en', ['One chunk.']));
  h.controller.toggle(); await tick(); h.controller.pause();
  h.requests[0].resolve(audio('waiting')); await tick();
  assert.equal(h.sources.length, 0);
  assert.equal(h.controller.state.status, 'paused');
  await h.controller.toggle();
  assert.equal(h.sources.length, 1);
  assert.equal(h.requests.length, 1);
});

test('pause/resume during the initial prebuffer starts the chunk exactly once', async (h) => {
  h.controller.setPage(page());
  h.controller.toggle(); await tick();
  // The second fetch may finish first; neither response may start audio on
  // its own, and resuming must not add a second consumer to Promise.all.
  h.requests[1].resolve(audio('second')); await tick();
  assert.equal(h.sources.length, 0);
  h.controller.pause();
  h.controller.toggle(); await tick();
  assert.equal(h.requests.length, 2);
  h.requests[0].resolve(audio('once')); await tick();
  assert.equal(h.sources.length, 1, 'two load waiters must not restart the same chunk');
  assert.equal(h.sources[0].stopped, 0);
});

test('HTTP errors surface recoverable state and retry the selected page', async (h) => {
  h.controller.setPage(page('retry', 'es', ['Un texto.']));
  h.controller.toggle(); await tick();
  h.requests[0].resolve({ ok: false, status: 503 }); await tick();
  assert.equal(h.controller.state.status, 'error');
  assert.equal(h.sources.length, 0);
  h.controller.toggle(); await tick();
  assert.equal(h.requests.length, 2);
  assert.deepEqual(h.requests[1].body, h.requests[0].body);
  h.requests[1].resolve(audio('recovered')); await tick();
  assert.equal(h.controller.state.status, 'playing');
  assert.equal(h.controller.state.error, null);
});

test('a failed initial prebuffer reports a retryable error before playback', async (h) => {
  h.controller.setPage(page()); h.controller.toggle(); await tick();
  h.requests[0].resolve(audio('first')); h.requests[1].reject(new Error('prebuffer failure')); await tick();
  assert.equal(h.sources.length, 0);
  assert.equal(h.controller.state.status, 'error');
  h.controller.toggle(); await tick();
  assert.equal(h.requests.length, 4);
  assert.equal(h.requests[2].body.text, 'First left-page chunk.');
  h.requests[2].resolve(audio('retried first')); h.requests[3].resolve(audio('retried second')); await tick();
  assert.equal(h.controller.state.status, 'playing');
});

test('a failed later lookahead does not interrupt current audio and is retryable', async (h) => {
  h.controller.setPage(page('three', 'en', ['First left-page chunk.', 'Second.', 'Third.'])); h.controller.toggle(); await tick();
  h.requests[0].resolve(audio('first')); h.requests[1].resolve(audio('second')); await tick();
  h.requests[2].reject(new Error('network failure')); await tick();
  assert.equal(h.controller.state.status, 'playing');
  h.sources[0].finish(); await tick();
  assert.equal(h.controller.state.status, 'playing');
  h.sources[1].finish(); await tick();
  assert.equal(h.controller.state.status, 'error');
  h.controller.toggle(); await tick();
  assert.equal(h.requests[3].body.text, 'First left-page chunk.');
});

test('finished pages replay from their first chunk only when requested', async (h) => {
  h.controller.setPage(page('single', 'en', ['One chunk.']));
  h.controller.toggle(); await tick();
  h.requests[0].resolve(audio('first run')); await tick();
  h.sources[0].finish(); await tick();
  assert.equal(h.controller.state.finished, true);
  h.controller.toggle(); await tick();
  assert.equal(h.controller.state.finished, false);
  assert.equal(h.controller.state.chunk, 0);
  assert.equal(h.requests.length, 2);
  h.requests[1].resolve(audio('second run')); await tick();
  assert.equal(h.sources[1].starts[0].offset, 0);
});

test('reapplying the same immutable page key does not interrupt narration', async (h) => {
  h.controller.setPage(page('same', 'en', ['One chunk.']));
  h.controller.toggle(); await tick();
  h.requests[0].resolve(audio('same')); await tick();
  h.controller.setPage(page('same', 'en', ['One chunk.']));
  assert.equal(h.sources[0].stopped, 0);
  assert.equal(h.controller.state.status, 'playing');
});

test('disposing aborts pending work, closes audio and suppresses late notifications', async (h) => {
  h.controller.setPage(page()); h.controller.toggle(); await tick();
  h.controller.dispose(); const count = h.states.length;
  assert(h.requests.every((r) => r.options.signal.aborted));
  h.requests.forEach((r) => r.resolve(audio('too late'))); await tick();
  assert.equal(h.context.closed, true);
  assert.equal(h.sources.length, 0);
  assert.equal(h.states.length, count);
  await h.controller.toggle();
  assert.equal(h.requests.length, 2);
});

let failed = 0;
for (const { name, run } of tests) {
  const h = harness();
  try { await run(h); console.log(`✓ ${name}`); }
  catch (error) { failed++; console.error(`✗ ${name}\n  ${error.message}`); }
  finally { h.controller.dispose(); }
}

// Decode and context-unlock requests can finish later than the network.
for (const stage of ['decode', 'resume']) {
  const pending = deferred();
  const h = harness(stage === 'decode' ? { decode: () => pending.promise } : { resume: () => pending.promise });
  const name = `page cancellation during ${stage} cannot start stale audio`;
  try {
    h.controller.setPage(page()); h.controller.toggle(); await tick();
    if (stage === 'decode') { h.requests[0].resolve(audio('decoding')); await tick(); }
    h.controller.setPage(null);
    pending.resolve(stage === 'decode' ? { duration: 10, label: 'late decode' } : undefined); await tick();
    assert.equal(h.sources.length, 0);
    assert.equal(h.controller.state.available, false);
    assert.equal(h.controller.state.status, 'idle');
    console.log(`✓ ${name}`);
  } catch (error) { failed++; console.error(`✗ ${name}\n  ${error.message}`); }
  finally { h.controller.dispose(); }
}
{
  const pending = deferred(); let calls = 0;
  const h = harness({ resume: () => ++calls === 1 ? Promise.resolve() : pending.promise });
  const name = 'rapid pause/resume during context unlock starts a cached buffer once';
  try {
    h.controller.setPage(page('single', 'en', ['One chunk.']));
    h.controller.toggle(); await tick(); h.requests[0].resolve(audio('cached')); await tick();
    h.controller.pause(); h.controller.toggle(); await tick();
    h.controller.pause(); h.controller.toggle(); await tick();
    pending.resolve(); await tick();
    assert.equal(h.sources.length, 2, 'original playback plus one resumed source');
    assert.equal(h.sources[1].stopped, 0, 'a superseded resume must not restart playback');
    console.log(`✓ ${name}`);
  } catch (error) { failed++; console.error(`✗ ${name}\n  ${error.message}`); }
  finally { h.controller.dispose(); }
}
console.log(`\n${tests.length + 3 - failed} narration controller checks passed; ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
