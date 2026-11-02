#!/usr/bin/env node
// Headless SVG plate export from the Figure Lab (vector colour plates and
// colouring pages for docs, print and review), via Chrome + playwright-core.
//
//   node scripts/export-svg.mjs "<lab query>" out.svg [--mode color|line] [--width 1600]
//        [--title "…"] [--caption "…"] [--credit "…"] [--labels 0|1] [--detail 1|2]
//        [--view three-quarter|front|side|top|book|close] [--lang en|es] [--png out.png] [--webgl]
//
// "<lab query>" is everything after `lab.html?`, e.g.
//   "type=demo&t=1.2&play=0"  or  "lab.html?type=snake&params=…"
// --lang es writes the key, part tooltips, <title>/<desc> and xml:lang in Spanish (the
// lab's &lang=; pass --title/--caption already in that language).
// The dev server must be running (default http://127.0.0.1:5173, or LAMINA_URL).
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);
const VALUE_FLAGS = new Set(['mode', 'width', 'title', 'caption', 'credit', 'labels', 'detail', 'view', 'png', 'wait', 'lang']);
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && VALUE_FLAGS.has(args[i - 1].slice(2))));
const [queryArg, outArg] = positional;
if (!queryArg || !outArg) {
  console.error('usage: node scripts/export-svg.mjs "<lab query>" out.svg [--mode color|line] [--width 1600] [--title t] [--caption c] [--credit c] [--labels 0|1] [--detail 1|2] [--view v] [--lang en|es] [--png out.png] [--webgl]');
  process.exit(2);
}
const base = process.env.LAMINA_URL ?? 'http://127.0.0.1:5173';
let path = queryArg.replace(/^\//, '');
if (!/^https?:/.test(path)) path = path.startsWith('lab.html') ? path : `lab.html?${path.replace(/^\?/, '')}`;
let url = /^https?:/.test(path) ? path : `${base}/${path}`;
url += (url.includes('?') ? '&' : '?') + 'ui=0';
if (flag('webgl')) url += '&gl=webgl';
const view = opt('view');
if (view) url += `&view=${encodeURIComponent(view)}`;
const lang = opt('lang');
if (lang && !/[?&]lang=/.test(url)) url += `&lang=${encodeURIComponent(lang)}`;

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-webgpu', '--enable-features=WebGPU', '--use-angle=metal', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
let code = 0;
// The dev server may hot-reload the page while other modules change: retry.
const run = async () => {
  await page.goto(url, { waitUntil: 'load' });
  // window.lab.ready is a real promise once lab.js has started; poll until it exists, then await it
  await page.waitForFunction(() => window.lab && typeof window.lab.ready?.then === 'function', null, { timeout: 60000 });
  await page.evaluate(() => window.lab.ready);
  await page.waitForTimeout(+opt('wait', 300));
  const opts = {
    width: +opt('width', 1600),
    title: opt('title'),
    caption: opt('caption'),
    credit: opt('credit'),
    labels: opt('labels') === undefined ? undefined : opt('labels') !== '0',
    detail: +opt('detail', 1),
  };
  const mode = opt('mode', 'color');
  const t0 = Date.now();
  const svg = await page.evaluate(([m, o]) => window.lab.exportSVG(m, o), [mode, opts]);
  const out = resolve(outArg);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, svg);
  const backend = await page.evaluate(() => document.documentElement.dataset.backend ?? 'unknown');
  console.log(`saved ${out} (${(svg.length / 1024).toFixed(1)} KB, mode=${mode}, ${Date.now() - t0} ms, backend=${backend})`);
  const png = opt('png');
  if (png) {
    const b64 = await page.evaluate(async () => {
      const blob = await window.lab.exportPNG({ width: 2400 });
      const buf = new Uint8Array(await blob.arrayBuffer());
      let s = '';
      for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return btoa(s);
    });
    const pout = resolve(png);
    mkdirSync(dirname(pout), { recursive: true });
    writeFileSync(pout, Buffer.from(b64, 'base64'));
    console.log(`saved ${pout}`);
  }
};
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    await run();
    code = 0;
    break;
  } catch (e) {
    const reload = /context was destroyed|navigation|Target closed/i.test(e.message);
    console.error(`[export-svg] ${reload && attempt < 3 ? `page reloaded, retrying (${attempt})` : e.message}`);
    code = 1;
    if (!reload) break;
  }
}
for (const l of logs.slice(0, 30)) console.log(l);
await browser.close();
process.exit(code);
