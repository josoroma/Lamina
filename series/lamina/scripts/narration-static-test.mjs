#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createStaticNarration, NARRATION_MODEL } from '../src/app/narration-static.js';
import { createNarration } from '../src/app/narration.js';

const file = `${'a'.repeat(64)}.mp3`;
const page = { key: 'book:es:left-3:current-hash', lang: 'es', chunks: ['La página izquierda.'] };
const manifest = () => ({ version: 1, model: NARRATION_MODEL, pages: { [page.key]: { lang: 'es', chunks: [file] } } });
const json = (data) => ({ ok: true, json: async () => data });
let checks = 0;
async function test(name, run) { await run(); checks++; console.log(`✓ ${name}`); }

await test('static playback uses base-relative GET assets and shares one manifest', async () => {
  const calls = [];
  const fetchAudio = async (url, options) => {
    calls.push({ url, options });
    return url.endsWith('manifest.json') ? json(manifest()) : { ok: true, asset: file };
  };
  const read = createStaticNarration({ baseURL: '/Lamina/narration/', fetchAudio });
  const abort = new AbortController();
  const results = await Promise.all([read({ page, index: 0, signal: abort.signal }), read({ page, index: 0, signal: abort.signal })]);
  assert.equal(results[0].asset, file);
  assert.deepEqual(calls.map(c => c.url), ['/Lamina/narration/manifest.json', `/Lamina/narration/${file}`, `/Lamina/narration/${file}`]);
  assert(calls.every(c => c.options.method === 'GET' && !c.options.body));
  assert.equal(calls[1].options.signal, abort.signal);
});

await test('stale page keys, wrong language and incomplete pages never request audio', async () => {
  for (const change of [
    d => { d.pages = {}; },
    d => { d.pages[page.key].lang = 'en'; },
    d => { d.pages[page.key].chunks = []; },
    d => { d.model = 'another-voice'; },
    d => { d.pages[page.key].chunks = ['../elsewhere.mp3']; },
  ]) {
    let calls = 0; const data = manifest(); change(data);
    const read = createStaticNarration({ fetchAudio: async () => { calls++; return json(data); } });
    await assert.rejects(read({ page, index: 0 }), e => e.code === 'recording-unavailable');
    assert.equal(calls, 1);
  }
});

await test('page cancellation while loading the manifest cannot start an audio request', async () => {
  let resolve, calls = 0;
  const pending = new Promise(done => { resolve = done; });
  const read = createStaticNarration({ fetchAudio: async () => { calls++; return pending; } });
  const abort = new AbortController(), result = read({ page, index: 0, signal: abort.signal });
  abort.abort(); resolve(json(manifest()));
  await assert.rejects(result, { name: 'AbortError' });
  assert.equal(calls, 1);
});

await test('missing published audio uses the controller error path without contacting an API', async () => {
  const requests = [];
  const controller = createNarration({ staticBase: '/Lamina/narration/',
    fetchAudio: async (url, options) => { requests.push({ url, options }); return json({ ...manifest(), pages: {} }); },
    createContext: () => ({ resume: async () => {}, close: async () => {} }),
  });
  controller.setPage(page); await controller.toggle();
  assert.equal(controller.state.status, 'error');
  assert.equal(controller.state.error, 'recording-unavailable');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.method, 'GET');
  assert(!requests[0].url.includes('/api/'));
  controller.dispose();
});

console.log(`\n${checks} static narration checks passed.`);
