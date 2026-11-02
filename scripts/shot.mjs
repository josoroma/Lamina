#!/usr/bin/env node
// Headless screenshot of any Lámina page (book, lab, harness) for visual review.
//
//   node scripts/shot.mjs <url> <out.png> [--w 1440] [--h 900] [--wait 1500]
//        [--eval "<js run in page before capture, may await>"] [--ready "<js expr>"]
//        [--dpr 1] [--webgl]
//
// The URL may be relative to the dev server (default http://127.0.0.1:5173).
// Prints console errors from the page so broken shaders are visible.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--webgl'].includes(args[i - 1])));
const [urlArg, outArg] = positional;
if (!urlArg || !outArg) {
  console.error('usage: node scripts/shot.mjs <url> <out.png> [--w 1440 --h 900 --wait 1500 --eval js --ready expr --dpr 1 --webgl]');
  process.exit(2);
}
const base = process.env.LAMINA_URL ?? 'http://127.0.0.1:5173';
let url = /^https?:/.test(urlArg) ? urlArg : `${base}/${urlArg.replace(/^\//, '')}`;
if (flag('webgl')) {
  // the backend switch is read from location.search, so it must go before any #/route
  const u = new URL(url);
  u.searchParams.set('gl', 'webgl');
  url = u.toString();
}
const W = +opt('w', 1440), H = +opt('h', 900), wait = +opt('wait', 1500), dpr = +opt('dpr', 1);
const out = resolve(outArg);
mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-webgpu', '--enable-features=WebGPU', '--use-angle=metal', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: dpr });
const logs = [];
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`);
  if (m.text().startsWith('[lamina]') || m.text().startsWith('[lab]')) logs.push(m.text());
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load' });
// Pages publish a readiness promise (window.lamina.ready, window.lab.ready,
// window.typeset.ready …). waitForFunction cannot await a promise (a pending
// promise is truthy), so poll until the expression is defined, then await it.
// `window.lab` starts out as the <canvas id="lab"> element (named access), so
// only objects that are not DOM nodes count.
const DEFAULT_READY = `(() => {
  if (document.getElementById('lab')) return window.lab instanceof Node ? undefined : window.lab?.ready;
  if (/typeset/.test(location.pathname)) return window.typeset?.ready;
  if (document.getElementById('stage')) return window.lamina?.ready;
  return true;
})()`;
const ready = opt('ready', DEFAULT_READY);
try {
  await page.waitForFunction(`(() => { try { const r = (${ready}); return r != null && !(r instanceof Node); } catch { return false; } })()`, null, { timeout: 30000 });
  await page.evaluate(`Promise.race([Promise.resolve(${ready}), new Promise((r) => setTimeout(r, 60000))])`);
} catch (e) {
  logs.push(`[shot] ready condition failed: ${e.message.split('\n')[0]}`);
}
const js = opt('eval');
if (js) {
  try {
    const r = await page.evaluate(`(async () => { ${js} })()`);
    if (r !== undefined) logs.push(`[eval] ${typeof r === 'string' ? r : JSON.stringify(r)}`);
  } catch (e) {
    logs.push(`[eval-error] ${e.message}`);
  }
}
await page.waitForTimeout(wait);
await page.screenshot({ path: out });
const backend = await page.evaluate(() => document.documentElement.dataset.backend ?? 'unknown');
console.log(`saved ${out} (${W}x${H}@${dpr}, backend=${backend})`);
for (const l of logs.slice(0, 40)) console.log(l);
await browser.close();
