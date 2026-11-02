#!/usr/bin/env node
// Static-site CI gate: no model, ffmpeg, Python or browser required.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { buildNarrationPlan } from './narration-plan.mjs';
import { NARRATION_MODEL } from '../src/app/narration-static.js';

const output = fileURLToPath(new URL('../public/narration/', import.meta.url));
const allowMissing = process.argv.includes('--allow-missing');
const plan = await buildNarrationPlan();
const path = resolve(output, 'manifest.json');
if (!existsSync(path) && allowMissing) {
  console.log(`Narration: 0/${plan.pages.length} current left pages published (missing permitted).`);
  process.exit(0);
}
const data = JSON.parse(readFileSync(path, 'utf8'));
// These exact revisions/settings are also pinned by the local Python server.
const expected = {
  model: NARRATION_MODEL,
  revision: '03565773edd72e949572557597af8063bb49a18a',
  voiceModel: 'ResembleAI/chatterbox',
  voiceRevision: '5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18',
  parameters: { exaggeration: 0.1, cfg_weight: 0.3, temperature: 0.7, repetition_penalty: 1.2, max_new_tokens: 1000 },
  encoding: { format: 'mp3', sampleRate: 24000, channels: 1, bitrate: 64000 },
};
assert.equal(data.version, 1, 'unsupported narration manifest');
for (const [key, value] of Object.entries(expected)) assert.deepEqual(data[key], value, `incorrect narration ${key}`);

// Match Python's json.dumps(ensure_ascii=False, sort_keys=True), including its
// separators, so each referenced file is proved to belong to this exact text.
function pythonJSON(value) {
  if (Array.isArray(value)) return `[${value.map(pythonJSON).join(', ')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}: ${pythonJSON(value[k])}`).join(', ')}}`;
  return JSON.stringify(value);
}
function filename(text, lang) {
  const input = [expected.model, expected.revision, expected.voiceRevision, expected.parameters, lang, text];
  return `${createHash('sha256').update(pythonJSON(input), 'utf8').digest('hex')}.mp3`;
}

const pages = new Map(plan.pages.map(p => [p.key, p]));
const checked = new Set();
for (const [key, entry] of Object.entries(data.pages ?? {})) {
  const page = pages.get(key);
  assert(page, `stale or unknown left-page recording: ${key}`);
  assert.equal(entry.lang, page.lang, `${key}: incorrect language`);
  const files = page.chunks.map(text => filename(text, page.lang));
  assert.deepEqual(entry.chunks, files, `${key}: wrong text, model or chunk order`);
  for (const file of files) {
    if (checked.has(file)) continue;
    const target = resolve(output, file);
    assert(existsSync(target), `${key}: missing audio ${file}`);
    const bytes = statSync(target).size;
    assert(bytes >= 500 && bytes <= 20 * 1024 * 1024, `${file}: implausible audio size`);
    const header = readFileSync(target).subarray(0, 3);
    assert(header.toString('ascii') === 'ID3' || (header[0] === 0xff && (header[1] & 0xe0) === 0xe0), `${file}: missing MP3 header`);
    checked.add(file);
  }
}
const published = Object.keys(data.pages ?? {}).length;
assert.equal(data.coverage?.completePages, published, 'incorrect published coverage count');
assert.equal(data.coverage?.totalPages, pages.size, 'coverage does not describe the current books');
const missing = [...pages.keys()].filter(key => !data.pages?.[key]);
if (!allowMissing) assert.equal(missing.length, 0, `${missing.length} current left pages have no published narration; first: ${missing[0]}`);
console.log(`Narration: ${published}/${pages.size} current left pages, ${checked.size} verified MP3 assets${allowMissing ? ' (missing permitted)' : ''}.`);
