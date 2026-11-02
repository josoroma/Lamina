#!/usr/bin/env node
// Figure audit: loads every plate's figure in the lab and checks the contract.
//   - builds without console/shader errors (WebGPU, and WebGL with --webgl)
//   - seamless loop: the step from pose(t→5) to pose(0) is no bigger than an ordinary 1 ms step
//   - layers, labels and parts are declared; manifest lookCloser ids exist on the figure
//   - label marks (mark: dot | ring | tick, size in cm, an `alt` anchor) are well formed
//   - build time and per-frame update cost
// With --i18n, the figure's own strings (lab info().strings: labels, layers, parts and
// colour names, SVG names, beats) are checked against the Spanish dictionaries, and
// every label pill is measured in the UI font: the reader's pills keep their text
// whole up to 110 px (12.5 px, weight 500 — the phone size; the macOS font, so other
// systems keep a margin).
//
//   node scripts/audit.mjs [book-id ...] [--webgl] [--lang en|es] [--i18n] [--json out.json]
//
// --lang shows the lab in that language (default en); --i18n checks Spanish whatever
// --lang says. The --json output carries every figure's strings: hand it to
// `node scripts/i18n-strings.mjs --runtime out.json --missing` or
// `node scripts/validate-books.mjs --lang es --runtime out.json`.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { dictionaryIndex, loadDictionaries, runtimeStrings } from './i18n-strings.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const VALUE_FLAGS = new Set(['json', 'lang']);
const wanted = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && VALUE_FLAGS.has(args[i - 1].slice(2))));
const base = process.env.LAMINA_URL ?? 'http://127.0.0.1:5173';
const lang = opt('lang', 'en');
const I18N = flag('i18n');
const PILL_MAX = 110; // px of label text at 12.5 px (R7: 120 measured on macOS, kept with a margin)
const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);

// the registry is the list of books (src/books/es/ and src/books/making/ are not books)
const { BOOKS } = await load('src/books/index.js');
for (const w of wanted) if (!BOOKS.some((b) => b.id === w)) console.log(`✗ "${w}" is not registered in src/books/index.js`);
const books = [];
for (const entry of BOOKS) if (!wanted.length || wanted.includes(entry.id)) books.push((await entry.load()).default);

// Spanish, as the reader resolves it: the runtime's own lookup (exact keys and patterns)
let i18n = null;
if (I18N) {
  const rt = await load('src/i18n/index.js');
  await rt.loadLang('es');
  const dicts = await loadDictionaries('es');
  i18n = { rt, index: dictionaryIndex(dicts) };
}
// the pill's font: the UI sans stack of src/engine/ui/ui.css
const css = readFileSync(resolve(ROOT, 'src/engine/ui/ui.css'), 'utf8');
const SANS = /--lam-sans:\s*([^;]+);/.exec(css)?.[1]?.trim() ?? 'ui-sans-serif, -apple-system, sans-serif';

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-webgpu', '--enable-features=WebGPU', '--use-angle=metal', '--ignore-gpu-blocklist'],
});

const PROBE = `(() => {
  const f = window.lab.figure; if (!f) return { error: window.lab.info().error || 'no figure' };
  const st = { explode: 0, layers: window.lab.mount.layers, labels: true, playing: false, reducedMotion: false, phase: 0 };
  const hash = () => {
    let s = 0, n = 0;
    f.root.updateMatrixWorld(true);
    // only what is drawn: a hidden copy (a fallen corolla reset at the seam) is not a pop
    f.root.traverseVisible((o) => {
      if (!o.isMesh || o.userData.isOutline) return;
      const m = o.matrixWorld.elements;
      const p = o.geometry.attributes.position;
      if (o.isInstancedMesh) { const a = o.instanceMatrix.array; for (let i = 12; i < a.length; i += 16) { s += a[i] + 1.3 * a[i + 1] + 1.7 * a[i + 2]; n++; } }
      for (let i = 0; i < p.count; i += 5) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        s += (m[0]*x + m[4]*y + m[8]*z + m[12]) + 1.3*(m[1]*x + m[5]*y + m[9]*z + m[13]) + 1.7*(m[2]*x + m[6]*y + m[10]*z + m[14]);
        n++;
      }
    });
    return s / Math.max(n, 1);
  };
  const D = f.duration || 5;
  f.update(0, 0, st); const h0 = hash();
  f.update(D - 1e-3, 0, st); const h5 = hash();
  let spread = 0;
  for (let k = 1; k < 10; k++) { f.update((k / 10) * D, 0, st); spread = Math.max(spread, Math.abs(hash() - h0)); }
  // the jump across the seam must look like any other 1 ms step of the loop
  // (fast parts — a rattle's buzz — legitimately move a lot in 1 ms)
  let maxStep = 0;
  for (let k = 0; k < 40; k++) {
    const t = ((k + 0.37) / 40) * (D - 2e-3);
    f.update(t, 0, st); const a = hash();
    f.update(t + 1e-3, 0, st); maxStep = Math.max(maxStep, Math.abs(hash() - a));
  }
  const t0 = performance.now(); for (let k = 0; k < 60; k++) f.update((k / 60) * D, 1 / 60, st); const per = (performance.now() - t0) / 60;
  f.update(0, 0, st);
  // label marks (additive label fields): mark 'dot' | 'ring' | 'tick', size in cm, alt = the mirror-side anchor
  const marks = [];
  for (const l of f.labels || []) {
    if (l.mark != null && !['dot', 'ring', 'tick'].includes(l.mark)) marks.push(l.id + ': mark "' + l.mark + '" is not dot | ring | tick');
    if (l.mark === 'ring' && !(l.size > 0)) marks.push(l.id + ': a ring needs size (cm, the feature radius)');
    if (l.size != null && !(l.size > 0)) marks.push(l.id + ': size ' + l.size + ' is not a positive number of cm');
    if (l.alt != null && !(l.alt.isObject3D && f.root.getObjectById(l.alt.id))) marks.push(l.id + ': alt is not an Object3D inside figure.root');
  }
  return { seam: Math.abs(h5 - h0), spread, maxStep, perFrameMs: +per.toFixed(3),
    layers: (f.layers || []).map((l) => l.id), labels: (f.labels || []).map((l) => l.id), parts: (f.parts || []).length,
    title: f.title, duration: f.duration, marks };
})()`;

// the figure's own strings: the lab lists them (info().strings); older labs only expose the figure
const STRINGS = `(() => {
  const info = window.lab.info();
  if (info.strings) return info.strings;
  const f = window.lab.figure; if (!f) return null;
  return {
    title: f.title ?? '',
    layers: (f.layers ?? []).map((l) => ({ id: l.id, label: l.label ?? '', hint: l.hint ?? '' })),
    labels: (f.labels ?? []).map((l) => ({ id: l.id, text: l.text ?? '', detail: l.detail ?? '' })),
    parts: (f.parts ?? []).map((p) => ({ id: p.id, name: p.name ?? p.id, swatches: Array.isArray(p.swatches) ? p.swatches.filter((s) => s?.name).map((s) => s.name) : [] })),
    beats: (f.beats ?? []).map((b) => String(Array.isArray(b) ? b[1] : b.text ?? '')),
  };
})()`;

/** Width of each text in the pill's font (canvas measureText, letter-spacing included). */
const MEASURE = ([texts, font]) => {
  const g = document.createElement('canvas').getContext('2d');
  g.font = `500 12.5px ${font}`;
  if ('letterSpacing' in g) g.letterSpacing = `${(0.012 * 12.5).toFixed(3)}px`;
  return texts.map((t) => Math.ceil(g.measureText(t).width));
};

const results = [];
const i18nTotals = { strings: 0, missing: new Map(), wide: 0, wideEn: 0 };
for (const book of books) {
  for (const plate of book.plates ?? []) {
    const q = new URLSearchParams({ type: plate.figure.type, params: JSON.stringify(plate.figure.params ?? {}), play: '0', t: '0', ui: '0' });
    if (lang !== 'en') q.set('lang', lang);
    if (flag('webgl')) q.set('gl', 'webgl');
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    const t0 = Date.now();
    await page.goto(`${base}/lab.html?${q}`, { waitUntil: 'load' });
    let r, strings = null;
    try {
      await page.waitForFunction('window.lab && window.lab.ready', null, { timeout: 60000 });
      await page.waitForTimeout(400);
      r = await page.evaluate(PROBE);
      if (I18N || opt('json')) strings = await page.evaluate(STRINGS);
    } catch (e) {
      r = { error: e.message };
    }
    const buildMs = Date.now() - t0;
    const issues = [];
    if (r.error) issues.push(`build: ${r.error}`);
    const realErrors = errors.filter((e) => !/favicon|404/.test(e));
    if (realErrors.length) issues.push(...realErrors.slice(0, 3).map((e) => `console: ${e.slice(0, 160)}`));
    if (r.duration && r.duration !== 5) issues.push(`duration ${r.duration} ≠ 5`);
    if (r.spread > 0 && r.seam / r.spread > 0.05 && r.seam > 3 * r.maxStep + 1e-9)
      issues.push(`loop seam ${(100 * r.seam / r.spread).toFixed(1)}% of motion range, ${(r.seam / Math.max(r.maxStep, 1e-12)).toFixed(1)}× the largest 1 ms step elsewhere`);
    if (r.perFrameMs > 4) issues.push(`update ${r.perFrameMs} ms/frame`);
    for (const lc of plate.lookCloser ?? []) if (r.labels && !r.labels.includes(lc.label)) issues.push(`lookCloser "${lc.label}" missing on figure`);
    if (r.layers && r.layers.length < 2) issues.push('fewer than 2 layers');
    for (const m of r.marks ?? []) issues.push(`label ${m}`);

    let i18nNote = '';
    let i18nReport = null;
    if (I18N && strings) {
      // the title is a developer label (lab header, lamina.info()): never translated
      const list = runtimeStrings([{ book: book.id, plate: plate.id, type: plate.figure.type, strings }]);
      const uniq = [...new Map(list.map((x) => [x.text, x])).values()];
      const missing = uniq.filter((x) => !i18n.rt.hasT(x.text, 'es'));
      for (const x of uniq) if (!i18n.rt.hasT(x.text, 'es') && i18n.index.find(x.text)) issues.push(`i18n: "${x.text}" has a dictionary pattern the runtime does not match`);
      for (const x of missing) {
        issues.push(`i18n: no Spanish for ${x.kind} "${x.text.length > 70 ? x.text.slice(0, 67) + '…' : x.text}"`);
        i18nTotals.missing.set(x.text, x);
      }
      const labels = strings.labels.filter((l) => l.text);
      const es = labels.map((l) => i18n.rt.tl('es', l.text));
      const [wEn, wEs] = await Promise.all([page.evaluate(MEASURE, [labels.map((l) => l.text), SANS]), page.evaluate(MEASURE, [es, SANS])]);
      const wide = [];
      labels.forEach((l, k) => {
        if (wEs[k] > PILL_MAX) wide.push({ id: l.id, lang: 'es', text: es[k], px: wEs[k] });
        if (wEn[k] > PILL_MAX) wide.push({ id: l.id, lang: 'en', text: l.text, px: wEn[k] });
      });
      for (const w of wide) {
        if (w.lang === 'es') issues.push(`i18n: label "${w.id}" «${w.text}» is ${w.px} px > ${PILL_MAX} px`);
        else i18nTotals.wideEn++;
      }
      i18nTotals.strings += uniq.length;
      i18nTotals.wide += wide.filter((w) => w.lang === 'es').length;
      i18nReport = { missing: missing.map((x) => x.text), widths: labels.map((l, k) => ({ id: l.id, en: wEn[k], es: wEs[k], text: es[k] })), wide };
      i18nNote = `  i18n ${uniq.length} strings, ${missing.length} missing, widest label ${Math.max(0, ...wEs)} px`;
      for (const w of wide.filter((x) => x.lang === 'en')) i18nNote += `\n    note: English label "${w.id}" «${w.text}» is ${w.px} px`;
    }
    results.push({ book: book.id, plate: plate.id, type: plate.figure.type, buildMs, ...r, strings, i18n: i18nReport, issues });
    console.log(`${issues.length ? '✗' : '✓'} ${book.id}/${plate.id}  build ${buildMs} ms  update ${r.perFrameMs ?? '?'} ms  seam ${r.maxStep > 0 ? (r.seam / r.maxStep).toFixed(2) + '× a 1 ms step' : r.spread ? ((100 * r.seam) / r.spread).toFixed(2) + '%' : '?'}${i18nNote}${issues.length ? '\n    ' + issues.join('\n    ') : ''}`);
    await page.close();
  }
}
await browser.close();
const out = opt('json');
if (out) writeFileSync(resolve(out), JSON.stringify({ generatedAt: new Date().toISOString(), base, lang, backend: flag('webgl') ? 'webgl' : 'webgpu', results }, null, 2));
const bad = results.filter((r) => r.issues.length).length;
if (I18N) console.log(`\ni18n: ${i18nTotals.strings} figure strings, ${i18nTotals.missing.size} without Spanish, ${i18nTotals.wide} Spanish labels over ${PILL_MAX} px${i18nTotals.wideEn ? ` (${i18nTotals.wideEn} English ones over it too, noted)` : ''}`);
console.log(`\n${results.length - bad}/${results.length} figures pass${lang !== 'en' ? ` (lab in ${lang})` : ''}`);
process.exit(bad ? 1 : 0);
