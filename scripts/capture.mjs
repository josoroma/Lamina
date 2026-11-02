#!/usr/bin/env node
// Capture the documentation outputs for every book: the library, each plate
// spread mid-animation, the back matter and the "How this book was made" leaf,
// a mid-turn frame, the reader chrome (with the language switch), a phone view,
// and portable SVG exports (colour plate + line art) of every figure — in
// English, Spanish or both.
//
//   node scripts/capture.mjs [--book serpientes] [--lang en|es|both] [--out docs/outputs]
//        [--no-svg] [--webgl] [--w 1600 --h 1000] [--t 2.4]
//
// Without --lang the capture is English and keeps the historical layout
// (<out>/library.png, <out>/<book>/…). With --lang every language goes to its
// own folder: <out>/en/…, <out>/es/… (--lang both runs both, which doubles the time).
// URLs always name their language (#/<lang>/<book>), so a stored preference never
// flips a capture. A Spanish book also records the switch (Spanish → English on the
// same spread) and must end with lamina.i18nMissing() empty and a complete edition
// (lamina.editionReport(): no fallback, nothing missing, no list of another length).
//
// Requires the dev server (npx vite) or a preview server; set LAMINA_URL to override.
// Exit code 1 on console errors, untranslated strings, an incomplete edition or a failed
// language switch.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const flag = (n) => args.includes(`--${n}`);
const base = process.env.LAMINA_URL ?? 'http://127.0.0.1:5173';
const outRoot = resolve(opt('out', 'docs/outputs'));
const W = +opt('w', 1600), H = +opt('h', 1000);
const T = +opt('t', 2.4);
const only = opt('book');
const gl = flag('webgl') ? '&gl=webgl' : '';
const langArg = opt('lang');
if (langArg && !['en', 'es', 'both'].includes(langArg)) {
  console.error('usage: capture.mjs [--book id] [--lang en|es|both] [--out docs/outputs] [--no-svg] [--webgl] [--w 1600 --h 1000] [--t 2.4]');
  process.exit(2);
}
const LANGS = langArg === 'both' ? ['en', 'es'] : [langArg ?? 'en'];

// the registry is the list of books (src/books/es/ and src/books/making/ are not books)
const { BOOKS } = await import(pathToFileURL(resolve(import.meta.dirname, '../src/books/index.js')).href);
const books = only ? [only] : BOOKS.map((b) => b.id);

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-webgpu', '--enable-features=WebGPU', '--use-angle=metal', '--ignore-gpu-blocklist'],
});
const log = []; // notes (retries, skipped shots)
const failures = []; // console errors, untranslated strings, a switch that lost its place
async function openPage(url, viewport = { width: W, height: H }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('console', (m) => m.type() === 'error' && failures.push(`[${url}] ${m.text()}`));
  page.on('pageerror', (e) => failures.push(`[${url}] pageerror ${e.message}`));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.lamina && window.lamina.ready', null, { timeout: 60000 });
  await page.evaluate('window.lamina.ready');
  return page;
}

/** Screenshot with one retry (a GPU stall or a dev-server reload can delay the first frame). */
async function shot(page, file) {
  try {
    await page.screenshot({ path: file, timeout: 45000 });
  } catch (e) {
    log.push(`[retry] ${file}: ${e.message.split('\n')[0]}`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: file, timeout: 90000 });
  }
}
const settle = (page, ms = 300) => page.evaluate(`window.lamina.settle ? window.lamina.settle(${ms}) : new Promise((r) => setTimeout(r, ${ms}))`);
/**
 * First spread showing a layout (and a making part): back matter is found by name,
 * never by counting back from the end (the making leaf moved those spreads).
 * Side 2k is the recto of leaf k (seen at opened = k), side 2k + 1 its verso (k + 1).
 */
const spreadOf = (page, layout, part = null) => page.evaluate(([layout, part]) => {
  const L = window.lamina;
  if (typeof L.spreadOf === 'function') return L.spreadOf(layout, part ?? undefined);
  const i = (L.sides ?? []).findIndex((s) => s.layout === layout && (!part || s.making?.part === part));
  return i < 0 ? null : Math.ceil(i / 2);
}, [layout, part]);

for (const lang of LANGS) {
  const outDir = langArg ? join(outRoot, lang) : outRoot;
  mkdirSync(outDir, { recursive: true });
  const manifest = [];
  const hash = (id = '', q = '') => `#/${lang}/${id}${q ? `?${q}` : ''}`;

  // library
  {
    const page = await openPage(`${base}/?x=1${gl}${hash()}`);
    await page.waitForTimeout(1200);
    const file = join(outDir, 'library.png');
    await shot(page, file);
    manifest.push({ kind: 'library', lang, file });
    await page.close();
  }

  for (const id of books) {
    const dir = join(outDir, id);
    mkdirSync(join(dir, 'svg'), { recursive: true });
    const page = await openPage(`${base}/?x=1${gl}${hash(id, `plate=1&t=${T}&ui=0`)}`);
    await settle(page, 600);
    const info = await page.evaluate('window.lamina.info()');
    const spreadShot = async (spread, name) => {
      if (spread == null) {
        log.push(`[skip] ${lang}/${id}/${name}: no such spread in this build`);
        return;
      }
      await page.evaluate(`window.lamina.goTo(${spread})`);
      await settle(page, 500);
      const file = join(dir, name);
      await shot(page, file);
      manifest.push({ kind: 'spread', lang, book: id, spread, file });
    };
    // front matter: closed cover, title, contents, introduction + how-to
    await spreadShot(0, '00-cover.png');
    await spreadShot(1, '01-title.png');
    await spreadShot(2, '02-contents.png');
    await spreadShot(3, '03-introduction.png');
    for (let n = 1; n <= info.plates.length; n++) {
      const p = info.plates[n - 1];
      await page.evaluate(`window.lamina.plate(${n})`);
      await page.evaluate(`window.lamina.setTime(${T})`);
      await settle(page, 900);
      const file = join(dir, `plate-${String(n).padStart(2, '0')}-${p.id}.png`);
      await shot(page, file);
      manifest.push({ kind: 'plate', lang, book: id, plate: p.id, file });
      if (!flag('no-svg')) {
        for (const mode of ['color', 'line']) {
          try {
            const svg = await page.evaluate(`window.lamina.exportSVG(${JSON.stringify(mode)})`);
            if (svg) {
              const f = join(dir, 'svg', `${p.id}-${mode}.svg`);
              writeFileSync(f, svg);
              manifest.push({ kind: 'svg', lang, book: id, plate: p.id, mode, file: f, bytes: svg.length });
              const xmlLang = /<svg\b[^>]*\bxml:lang="([^"]+)"/.exec(svg)?.[1];
              if (xmlLang !== lang) failures.push(`[svg] ${lang}/${id}/${p.id}/${mode}: expected xml:lang="${lang}", got ${JSON.stringify(xmlLang)}`);
            } else failures.push(`[svg] ${lang}/${id}/${p.id}/${mode}: empty export`);
          } catch (e) {
            failures.push(`[svg] ${lang}/${id}/${p.id}/${mode}: ${e.message.split('\n')[0]}`);
          }
        }
      }
    }
    // back matter by name: [note | sources], [glossary | making · prompt], [making · brief | back endpaper]
    await spreadShot(await spreadOf(page, 'note'), '90-afterword.png');
    await spreadShot(await spreadOf(page, 'glossary'), '91-glossary.png');
    await spreadShot(await spreadOf(page, 'making', 'brief'), '92-making.png');
    await spreadShot(info.leafCount, '93-back-cover.png');
    // a page caught mid-turn (frozen pose) between plates I and II
    await page.evaluate(`window.lamina.plate(1)`);
    await settle(page, 300);
    await page.evaluate(`(() => { const b = window.lamina.book; b.freeze(b.opened, 0.42); })()`);
    await page.waitForTimeout(400);
    await shot(page, join(dir, 'turn.png'));
    await page.evaluate(`window.lamina.book.unfreeze()`);
    // labels + explode on the first plate
    await page.evaluate('window.lamina.plate(1)');
    await page.evaluate('window.lamina.setLabels(true)');
    await page.evaluate('window.lamina.setExplode(0.85)');
    await settle(page, 1400);
    await shot(page, join(dir, 'plate-01-explode-labels.png'));
    // every spread has been shown: nothing the reader printed or said may have missed its translation
    if (lang !== 'en') {
      const missing = await page.evaluate('window.lamina.i18nMissing ? window.lamina.i18nMissing() : null');
      if (missing == null) log.push(`[i18n] ${lang}/${id}: lamina.i18nMissing() is not available in this build`);
      else if (missing.length) failures.push(`[i18n] ${lang}/${id}: ${missing.length} strings shown untranslated: ${missing.slice(0, 12).map((k) => JSON.stringify(k)).join(', ')}${missing.length > 12 ? ' …' : ''}`);
      // the edition itself: a translation file that lacks text (or is missing) prints English there
      const report = await page.evaluate('window.lamina.editionReport ? window.lamina.editionReport() : null');
      if (report == null) log.push(`[i18n] ${lang}/${id}: lamina.editionReport() is not available in this build`);
      else {
        const gaps = ['missing', 'extra', 'changedIds', 'lengths', 'types', 'unknown'].filter((k) => report[k]?.length).map((k) => `${k} ${report[k].length} (${report[k].slice(0, 4).join(', ')}${report[k].length > 4 ? ' …' : ''})`);
        if (report.fallback) gaps.unshift(report.fallback);
        if (gaps.length) failures.push(`[edition] ${lang}/${id}: ${gaps.join('; ')}`);
      }
      manifest.push({ kind: 'i18n', lang, book: id, missing, edition: report });
    }
    await page.close();

    // reader chrome (toolbar, caption, language switch) on a plate, then a phone
    const ui = await openPage(`${base}/?x=1${gl}${hash(id, `plate=2&t=${T}`)}`);
    await settle(ui, 1200);
    await shot(ui, join(dir, 'reader-ui.png'));
    // the switch: a Spanish plate turns English on the same spread, at the same moment
    if (lang !== 'en') {
      const has = await ui.evaluate('typeof window.lamina.setLang === "function"');
      if (!has) log.push(`[switch] ${lang}/${id}: lamina.setLang() is not available in this build`);
      else {
        // the chrome hides when idle: a pointer move wakes it, so both shots show the switch
        const wake = async () => {
          await ui.mouse.move(W / 2, H * 0.92);
          await ui.mouse.move(W / 2 + 6, H * 0.92);
          await ui.waitForTimeout(350);
        };
        const before = await ui.evaluate('window.lamina.info()');
        await wake();
        await shot(ui, join(dir, `switch-1-${lang}.png`));
        await ui.evaluate(`window.lamina.setLang('en')`);
        await settle(ui, 600);
        const after = await ui.evaluate('({ info: window.lamina.info(), lang: window.lamina.lang, hash: location.hash, html: document.documentElement.lang })');
        await wake();
        await shot(ui, join(dir, 'switch-2-en.png'));
        const lost = [];
        if (after.info.opened !== before.opened) lost.push(`spread ${before.opened} → ${after.info.opened}`);
        if (Math.abs((after.info.time ?? 0) - (before.time ?? 0)) > 0.05 && !before.playing) lost.push(`time ${before.time} → ${after.info.time}`);
        if (after.lang !== undefined && after.lang !== 'en') lost.push(`lamina.lang is "${after.lang}"`);
        if (!after.hash.startsWith('#/en/')) lost.push(`URL ${after.hash}`);
        if (after.html !== 'en') lost.push(`<html lang="${after.html}">`);
        if (lost.length) failures.push(`[switch] ${lang}/${id}: ${lost.join('; ')}`);
        manifest.push({ kind: 'switch', lang, book: id, files: [`switch-1-${lang}.png`, 'switch-2-en.png'].map((f) => join(dir, f)), kept: !lost.length });
      }
    }
    await ui.close();
    const phone = await openPage(`${base}/?x=1${gl}${hash(id, `plate=2&t=${T}`)}`, { width: 390, height: 844 });
    await settle(phone, 1500);
    await shot(phone, join(dir, 'phone.png'));
    await phone.close();
  }

  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({ capturedAt: new Date().toISOString(), base, lang, items: manifest }, null, 2));
  console.log(`captured ${manifest.length} items (${lang}) → ${outDir}`);
}

if (log.length) console.log(log.slice(0, 30).join('\n'));
if (failures.length) console.log(`\n✗ ${failures.length} problems\n${failures.slice(0, 40).join('\n')}`);
await browser.close();
process.exit(failures.length ? 1 : 0);
