// Typesetting preview: renders every printed side of a book as page canvases
// laid out like spreads (verso left, recto right) for visual review.
//
//   typeset.html?book=serpientes&lang=en|es&page=all|<index>&width=1024&hits=1&sample=1
//   typeset.html?book=serpientes&view=3d&spread=4   pages on the real 3D Book
//
// A registered book is typeset from its edition in `lang` (loadEdition: the
// Spanish text where the translation has it, English where it does not, and
// the making leaf); other src/books/<id>.js files (found through
// import.meta.glob, so new manifests appear without code changes) and the
// sample manifests print as they are, with `lang` as their language. Lesson
// pages get the skulls module's drawStep when it is exported. Captions show
// the auto-fit scale, OVERFLOW and sideways overflow (H). Automation:
// window.typeset = { ready, manifest, sides, results, render, lang, report, missing }.
import { loadFonts, buildSides, renderPage } from './index.js';
import { samples } from './sample.js';
import { BOOKS } from '../../books/index.js';
import { isLang, loadLang, loadEdition, lastReport, missingKeys } from '../../i18n/index.js';

const q = new URLSearchParams(location.search);
const bookId = q.get('book') ?? 'serpientes';
const lang = isLang(q.get('lang')) ? q.get('lang') : 'en';
const pageParam = q.get('page') ?? 'all';
const single = pageParam !== 'all';
const width = +(q.get('width') ?? (single ? 1536 : 1024));
const showHits = q.get('hits') === '1';
const forceSample = q.get('sample') === '1';
const view3d = q.get('view') === '3d';

const bookModules = import.meta.glob('/src/books/*.js');
const skullModules = import.meta.glob('/src/subjects/skulls/index.js');

async function loadManifest() {
  try {
    await loadLang(lang);
  } catch (e) {
    console.error(`[typeset] dictionaries for "${lang}" failed to load; printing English strings`, e);
  }
  if (!forceSample && BOOKS.some((b) => b.id === bookId)) {
    try {
      const m = await loadEdition(bookId, lang);
      return { manifest: m, source: `edition ${bookId} (${lang})`, report: lastReport(bookId, lang) };
    } catch (e) {
      console.error(`[typeset] failed to load the ${lang} edition of ${bookId}; trying the manifest`, e);
    }
  }
  const path = `/src/books/${bookId}.js`;
  if (!forceSample && bookModules[path]) {
    try {
      const mod = await bookModules[path]();
      const m = mod.default ?? mod.book ?? mod.manifest;
      if (m) return { manifest: { ...m, locale: lang }, source: path };
    } catch (e) {
      console.error(`[typeset] failed to load ${path}; using sample`, e);
    }
  }
  return { manifest: { ...(samples[bookId] ?? samples.serpientes), locale: lang }, source: 'sample' };
}

async function loadStepDrawer() {
  const loader = skullModules['/src/subjects/skulls/index.js'];
  if (!loader) return null;
  try {
    const mod = await loader();
    return typeof mod.drawStep === 'function' ? mod.drawStep : null;
  } catch (e) {
    console.warn('[typeset] skulls module unavailable for drawStep', e);
    return null;
  }
}

function stepDrawerFor(page, drawStep, theme) {
  if (!drawStep || !/lesson/.test(page.layout)) return undefined;
  const params = page.plate?.figure?.params ?? {};
  return (g, step, box) => drawStep(g, params, step, box, theme);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function slot(result, page, cssW) {
  const box = el('figure', `slot ${page.recto ? 'recto' : 'verso'}`);
  const wrap = el('div', 'canvas-wrap');
  const c = result.canvas;
  c.style.width = `${cssW}px`;
  c.style.height = `${(cssW * c.height) / c.width}px`;
  wrap.appendChild(c);
  if (showHits) {
    for (const h of result.hits) {
      const r = el('div', 'hit');
      const [u0, v0, u1, v1] = h.rect;
      Object.assign(r.style, { left: `${u0 * 100}%`, top: `${v0 * 100}%`, width: `${(u1 - u0) * 100}%`, height: `${(v1 - v0) * 100}%` });
      r.title = `${h.id} → ${JSON.stringify(h.action)}`;
      wrap.appendChild(r);
    }
  }
  box.appendChild(wrap);
  const hov = result.hOverflow ?? [];
  const cap = el('figcaption', result.overflow || hov.length ? 'warn' : '');
  cap.textContent = `#${page.index} · ${page.layout}${page.folio != null ? ` · p. ${page.folio}` : ''} · ${result.ms} ms · ${Math.round(result.scale * 1000) / 10}%${result.overflow ? ' · OVERFLOW' : ''}${hov.length ? ` · H: ${hov.map((o) => `${o.what} +${o.over}px`).join(', ')}` : ''} · ${result.hits.length} hits`;
  if (hov.length) cap.title = hov.map((o) => `${o.what}: ${o.text}`).join('\n');
  box.appendChild(cap);
  return box;
}

async function main() {
  const { manifest, source, report } = await loadManifest();
  document.title = `Typeset · ${manifest.title} (${lang})`;
  document.documentElement.lang = lang;
  const theme = manifest.theme ?? {};
  const fonts = await loadFonts(theme, { manifest });
  const drawStep = await loadStepDrawer();
  const sides = buildSides(manifest);
  const results = new Array(sides.length);
  const render = (i, w = width) => {
    const page = sides[i];
    const t0 = performance.now();
    const r = renderPage(page, { theme, width: w, stepDrawer: stepDrawerFor(page, drawStep, theme) });
    r.ms = Math.round(performance.now() - t0);
    return r;
  };
  const root = document.querySelector('#pages');
  const info = document.querySelector('#info');
  const reported = report ? Object.values(report).filter(Array.isArray).reduce((s, a) => s + a.length, 0) : 0;
  info.textContent = `${manifest.title} — ${sides.length} sides, ${sides.leafCount} leaves · ${lang} · source: ${source}${reported ? ` (report: ${reported} items)` : ''} · fonts: ${fonts.ok ? 'ready' : 'fallback'} (${fonts.ms} ms) · drawStep: ${drawStep ? 'skulls' : 'placeholder'}`;

  if (view3d) {
    await mountBook(sides, render, theme);
  } else if (single) {
    const i = Math.max(0, Math.min(sides.length - 1, parseInt(pageParam, 10) || 0));
    results[i] = render(i);
    document.body.classList.add('single');
    root.appendChild(slot(results[i], sides[i], width / (devicePixelRatio || 1)));
  } else {
    const cssW = Math.min(560, Math.floor((innerWidth - 120) / 2));
    // spreads: cover alone on the right, then (verso | recto) pairs, back cover alone on the left
    const rows = [[null, 0]];
    for (let k = 1; k < sides.length - 1; k += 2) rows.push([k, k + 1]);
    rows.push([sides.length - 1, null]);
    for (const [a, b] of rows) {
      const row = el('div', 'spread');
      for (const i of [a, b]) {
        if (i == null || i >= sides.length) {
          row.appendChild(el('div', 'slot empty'));
          continue;
        }
        results[i] = render(i);
        row.appendChild(slot(results[i], sides[i], cssW));
      }
      root.appendChild(row);
    }
  }
  const overflow = results.filter((r) => r?.overflow).map((r) => r.key);
  const hOverflow = results.filter((r) => r?.hOverflow?.length).map((r) => ({ key: r.key, items: r.hOverflow }));
  const total = results.reduce((s, r) => s + (r?.ms ?? 0), 0);
  console.info(`[typeset] rendered ${results.filter(Boolean).length} sides in ${total} ms${overflow.length ? `; overflow: ${overflow.join(', ')}` : ''}`);
  if (hOverflow.length) console.info(`[typeset] sideways overflow: ${hOverflow.map((h) => `${h.key} (${h.items.map((o) => o.what).join(', ')})`).join('; ')}`);
  // dictionary keys the printed pages looked up and did not find (automation asserts none)
  const missing = lang === 'en' ? [] : missingKeys(lang);
  if (missing.length) console.warn(`[typeset] no ${lang} entry for: ${missing.map((k) => JSON.stringify(k)).join(', ')}`);
  return { manifest, sides, results, overflow, hOverflow, missing, total, lang, report, render };
}

/**
 * Put every typeset side on the engine's 3D Book (same textures the reader
 * uses) to judge legibility at real viewing angles. `spread` = Book.opened.
 */
async function mountBook(sides, render, theme) {
  const THREE = await import('three/webgpu');
  const { createRenderer } = await import('../renderer.js');
  const { createStage } = await import('../stage.js');
  const { Book } = await import('../book/Book.js');
  document.body.classList.add('view3d');
  document.documentElement.style.background = '#fff';
  const canvas = document.createElement('canvas');
  canvas.id = 'stage3d';
  document.body.appendChild(canvas);
  const { renderer } = await createRenderer(canvas);
  const stage = createStage(renderer, { reducedMotion: true });
  const book = new Book({ leafCount: sides.leafCount, theme: { paper: theme.paper, cloth: theme.cloth, foil: theme.foil, edge: theme.paper } });
  stage.world.add(book);
  stage.setBook?.(book);
  const textures = [];
  sides.forEach((side, i) => {
    const r = render(i, width >= 1024 ? width : 1536);
    const tex = new THREE.CanvasTexture(r.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    textures.push(tex);
    book.setLeafTexture(side.leaf, side.side, tex);
  });
  book.setOpened(+(q.get('spread') ?? 4));
  const resize = () => stage.resize(innerWidth, innerHeight);
  addEventListener('resize', resize);
  resize();
  stage.rig?.snap?.();
  const timer = new THREE.Timer();
  renderer.setAnimationLoop((ts) => {
    timer.update(ts);
    const dt = Math.min(timer.getDelta(), 1 / 20);
    stage.update(dt);
    book.update(dt);
    renderer.render(stage.scene, stage.camera);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') book.next();
    if (e.key === 'ArrowLeft') book.prev();
  });
  window.typeset.book = book;
  window.typeset.dispose3d = () => {
    renderer.setAnimationLoop(null);
    textures.forEach((t) => t.dispose());
    renderer.dispose();
  };
}

const ready = main().catch((e) => {
  console.error('[typeset] preview failed', e);
  document.querySelector('#info').textContent = `Error: ${e.message}`;
  return null;
});
window.typeset = { ready, renderPage, buildSides, loadFonts };
ready.then((r) => {
  if (!r) return;
  Object.assign(window.typeset, r);
});
