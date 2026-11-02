// Library: the collection's closed books resting on the white stage. Hover lifts a
// book; click (or Enter on its link) opens it. Uses the same Book object
// and cover typesetting as the reader, so covers are identical.
//
// The shelf speaks the session's language: covers printed from each book's
// edition (loadEdition), header, hint, captions and link names translated,
// and the language switch at the right end of the header. A switch prints
// the new covers first, one per frame, while the shelf stays as it is
// (prepareLang), then swaps covers and text in one step (applyLang).
import * as THREE from 'three/webgpu';
import { Book } from '../engine/book/Book.js';
import { loadFonts, buildSides, renderPage } from '../engine/typeset/index.js';
import { createLangSwitch } from '../engine/ui/langswitch.js';
import { BOOKS } from '../books/index.js';
import { getLang, isLoaded, loadEdition, t } from '../i18n/index.js';
import { damp } from '../engine/util/math.js';
import { bookHref } from './route.js';

const SPACING = 1.32;
/** Cover texture width (px): the shelf never frames a book larger than this. */
const COVER_PX = 1024;
/** Covers printed for a switch nobody applied (a newer request superseded it) go after this long, as the reader's pages do. */
const PREPARED_TTL_MS = 5000;

/**
 * The shelf's own header and book titles (app.css) are set in Cormorant
 * Garamond 500, a face no cover sets: load it with the covers' faces so the
 * shelf never swaps type, and like them never wait long for it (the CSS
 * fallback serif takes over).
 */
async function loadShelfFace(timeout = 4000) {
  let timer;
  try {
    await Promise.race([
      import('@fontsource/cormorant-garamond/500.css').then(() => document.fonts?.load('500 20px "Cormorant Garamond"', 'Lámina')),
      new Promise((r) => (timer = setTimeout(r, timeout))),
    ]);
  } catch (e) {
    console.warn('[library] shelf face unavailable; using the fallback serif', e);
  } finally {
    clearTimeout(timer);
  }
}

/** Every book's edition in `lang`, in shelf order (null for a book that fails to load), and the errors of those that failed. */
async function loadEditions(lang) {
  const failed = [];
  const editions = await Promise.all(
    BOOKS.map((b) =>
      loadEdition(b.id, lang).catch((err) => {
        console.warn(`[library] no "${lang}" edition of ${b.id}`, err);
        failed.push(err);
        return null;
      })
    )
  );
  return { editions, failed };
}

/** The faces a cover sets (the reader loads the rest). */
const loadCoverFonts = (m) => loadFonts(m.theme ?? {}, { manifest: m, layouts: ['cover'] });

const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

export async function createLibrary({ renderer, stage, reducedMotion, onOpen, signal, lang = getLang(), requestLang }) {
  let { editions, failed } = await loadEditions(lang);
  // a book whose edition could not be fetched keeps its place in English, and a notice says so
  const degraded = failed.length > 0 && lang !== 'en';
  if (degraded) {
    const en = await loadEditions('en');
    editions = editions.map((m, k) => m ?? en.editions[k]);
  }
  const manifests = editions.filter(Boolean);
  // the shelf prints covers only: fetch just the faces they set
  await Promise.all([...manifests.map(loadCoverFonts), loadShelfFace()]);
  // Superseded while fetching (Back pressed again): touch nothing shared.
  // Everything below runs synchronously up to activation.
  if (signal?.aborted) throw new DOMException('Route superseded', 'AbortError');

  /** Print a book's front cover and upload it; the 1024 px canvas is freed (the GPU copy is all a cover needs). */
  function printCover(m, sides) {
    const cover = renderPage(sides[0], { theme: m.theme ?? {}, width: COVER_PX });
    const tex = new THREE.CanvasTexture(cover.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.name = `cover-${m.id}-${m.locale ?? 'en'}`;
    try {
      renderer.initTexture(tex);
      cover.canvas.width = cover.canvas.height = 1;
    } catch {
      // not initialised yet: three uploads it on first draw
    }
    return tex;
  }

  const group = new THREE.Group();
  group.name = 'library';
  stage.world.add(group);
  const items = manifests.map((m, k) => {
    const built = buildSides(m);
    const sides = built.sides ?? built;
    const leafCount = built.leafCount ?? Math.ceil(sides.length / 2);
    const th = m.theme ?? {};
    const book = new Book({
      leafCount,
      reducedMotion,
      theme: { paper: th.paper, cloth: th.cloth, foil: th.foil, endpaper: th.endpaper, headband: [th.accent ?? '#9e2b25', th.endpaper?.ground ?? '#efe7d6'] },
    });
    const holder = new THREE.Group();
    holder.add(book);
    group.add(holder);
    book.setOpened(0);
    const tex = printCover(m, sides);
    book.setLeafTexture(0, 'front', tex);
    return { manifest: m, book, holder, tex, lift: 0, target: 0 };
  });

  // accessible links + quiet header (the hint keeps to one line on narrow
  // phones); every text is set by localize(), in the shelf's language
  const ui = document.createElement('nav');
  ui.className = 'library';
  ui.innerHTML = `
    <header><img src="./logo.svg" alt="" width="34" height="34"><div class="library-brand"><h1>Lámina</h1><span class="library-tagline"></span></div></header>
    <ul>${items
      .map((it) => `<li><a data-id="${it.manifest.id}"><b></b> <span class="library-sub"></span> <span class="sr-only"></span></a></li>`)
      .join('')}</ul>
    <p class="hint" role="status"><span class="hint-lead"></span><span class="hint-more"></span></p>`;
  const headerEl = ui.querySelector('header');
  const taglineEl = ui.querySelector('.library-tagline');
  const hintEl = ui.querySelector('.hint');
  const lis = [...ui.querySelectorAll('li')];
  const links = [...ui.querySelectorAll('a')];
  links.forEach((a, k) => {
    a.addEventListener('mouseenter', () => (hovered = k));
    a.addEventListener('mouseleave', () => (hovered = -1));
    a.addEventListener('focus', () => (hovered = k));
    a.addEventListener('blur', () => (hovered = -1));
  });

  let shown = lang; // the language the shelf shows
  let disposed = false;
  function localize() {
    ui.setAttribute('aria-label', t('Library'));
    taglineEl.textContent = t('Living scientific plates');
    hintEl.querySelector('.hint-lead').textContent = t('Choose a book');
    hintEl.querySelector('.hint-more').textContent = ` · ${t('drag pages, rotate figures, export plates as SVG')}`;
    items.forEach(({ manifest: m }, k) => {
      const a = links[k];
      a.href = bookHref(m.id, {}, shown);
      a.querySelector('b').textContent = m.title;
      a.querySelector('.library-sub').textContent = m.subtitle ?? '';
      // the covers carry the author's foil mark; its name reaches screen readers here
      a.querySelector('.sr-only').textContent = m.byline?.name ? t('by {author}', { author: m.byline.name }) : '';
    });
  }
  localize();

  // the language switch: it shows the choice at once, boot switches the
  // session (requestLang), and the switch then shows what the shelf shows
  let asked = 0; // the newest choice made on the switch
  let noticeTimer = 0;
  let editionFailed = null; // the language whose editions prepareLang could not load
  const sw = createLangSwitch({
    value: lang,
    size: 'auto',
    className: 'library-lang',
    onChange(next) {
      if (!requestLang) return sw.set(shown);
      const mine = ++asked;
      editionFailed = null;
      sw.setBusy(true);
      Promise.resolve(requestLang(next))
        .catch((err) => {
          console.error('[library] language switch failed', err);
          return false;
        })
        .then((ok) => {
          if (disposed || mine !== asked) return;
          sw.setBusy(false);
          sw.set(shown);
          if (ok || shown === next || (isLoaded(next) && editionFailed !== next)) return; // (superseded, not failed)
          notice(
            next === 'es'
              ? t('The Spanish edition could not be loaded. Reload the page to try again.')
              : t('The English edition could not be loaded. Reload the page to try again.')
          );
        });
    },
  });
  headerEl.append(sw.el);
  document.body.appendChild(ui); // filled first: the hint's status region announces changes only
  /** A short message in the hint's place (a polite status), then the hint again. */
  function notice(text) {
    clearTimeout(noticeTimer);
    hintEl.querySelector('.hint-lead').textContent = text;
    hintEl.querySelector('.hint-more').textContent = '';
    noticeTimer = setTimeout(() => {
      localize();
      reserveBands();
    }, 6000);
    reserveBands();
  }

  // Lay the shelf out for the viewport: three columns on desktop, two on
  // phones, framed by the rig with the whole shelf in view
  // between the header and the hint (measured in CSS px, so a small phone's
  // header never runs over the first cover nor the hint over the last). In
  // a row the captions hang below the books' tail edges, so their block is
  // reserved above the hint too. Titles remain available below every cover
  // in both the desktop and the compact phone grid.
  const rig = stage.rig;
  const prevFocus = rig.focus;
  rig.focus = 'spread';
  let shelfLayout = null;
  function reserveBands() {
    const top = headerEl.offsetTop + headerEl.offsetHeight + 10;
    let capH = 0;
    for (const li of lis) capH = Math.max(capH, li.offsetHeight + 4);
    const bottom = (hintEl.offsetHeight ? innerHeight - hintEl.offsetTop + 10 : 0) + capH;
    rig.setInsets({ top, bottom });
  }
  function layout() {
    const p = stage.camera.aspect < 0.9;
    const strip = !p && innerHeight <= 500 && stage.camera.aspect >= 1.5;
    const nextLayout = strip ? 'strip' : p ? 'portrait' : 'grid';
    if (nextLayout === shelfLayout) return;
    shelfLayout = nextLayout;
    ui.classList.toggle('is-grid', true);
    ui.classList.toggle('is-narrow', p);
    ui.classList.toggle('is-strip', strip);
    const n = items.length;
    const columns = Math.min(n, strip ? 6 : p ? 2 : 3);
    const rows = Math.ceil(n / columns);
    const rowSpacing = p ? 2.05 : 2.25;
    items.forEach((it, k) => {
      const row = Math.floor(k / columns);
      const count = Math.min(columns, n - row * columns);
      const c = k % columns - (count - 1) / 2;
      it.holder.position.set(c * SPACING - 0.514, 0, (row - (rows - 1) / 2) * rowSpacing);
      it.holder.rotation.y = c * -0.025;
    });
    const half = ((columns - 1) / 2) * SPACING + 0.62;
    const halfZ = ((rows - 1) / 2) * rowSpacing + 0.78;
    reserveBands();
    rig.setFitBox(new THREE.Box3(new THREE.Vector3(-half, 0, -halfZ), new THREE.Vector3(half, 0.12, halfZ)));
    rig.snap();
  }
  layout();

  // ------------------------------------------------------------ language switch
  let prepared = null; // { lang, editions, covers, expire }: printed for a switch, not shown yet
  let prepSeq = 0; // the newest prepareLang; an older one stops at its next frame
  function dropPrepared() {
    if (!prepared) return;
    clearTimeout(prepared.expire);
    prepared.covers.forEach((tex) => tex.dispose());
    prepared = null;
  }
  /**
   * Load the editions and print their covers (one per frame); nothing
   * visible changes. Asked for the language shown (boot does when a newer
   * request keeps it), it stops a preparation in flight and drops what an
   * earlier one printed; covers nobody applies go after PREPARED_TTL_MS.
   */
  async function prepareLang(next) {
    const seq = ++prepSeq;
    if (next === shown) return dropPrepared();
    if (prepared?.lang === next) return;
    const { editions: loaded, failed: lost } = await loadEditions(next);
    if (lost.length) {
      if (seq === prepSeq && !disposed) editionFailed = next;
      throw lost[0]; // boot commits nothing: the shelf stays in its language
    }
    // the shelf keeps its books: one whose edition failed keeps the one it shows
    const editions = items.map((it) => loaded.find((m) => m?.id === it.manifest.id) ?? it.manifest);
    await Promise.all(editions.map(loadCoverFonts));
    const covers = [];
    for (const m of editions) {
      await nextFrame();
      if (disposed || seq !== prepSeq) {
        covers.forEach((tex) => tex.dispose());
        return;
      }
      const built = buildSides(m);
      covers.push(printCover(m, built.sides ?? built));
    }
    dropPrepared();
    const job = { lang: next, editions, covers, expire: 0 };
    job.expire = setTimeout(() => prepared === job && dropPrepared(), PREPARED_TTL_MS);
    prepared = job;
  }
  /** Show the prepared language: covers, text, links, title (after boot's setLang). */
  function applyLang(next) {
    if (next === shown) return;
    const ready = prepared?.lang === next ? prepared : null;
    if (!ready) throw new Error(`[library] the "${next}" covers were not prepared`); // boot rebuilds the shelf
    clearTimeout(ready.expire);
    prepared = null;
    prepSeq++;
    items.forEach((it, k) => {
      const old = it.tex;
      it.manifest = ready.editions[k];
      it.tex = ready.covers[k];
      it.book.setLeafTexture(0, 'front', it.tex);
      old.dispose(); // the cover leaf holds the new texture now
    });
    shown = next;
    clearTimeout(noticeTimer);
    localize();
    sw.set(next);
    document.title = t('Lámina — Living Scientific Plates');
    reserveBands(); // the header, hint and captions rewrapped
  }

  // hover & click on the 3D covers
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = -1;
  const canvas = renderer.domElement;
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, stage.camera);
    for (let k = 0; k < items.length; k++) {
      if (ray.intersectObject(items[k].holder, true).length) return k;
    }
    return -1;
  }
  const onMove = (e) => {
    hovered = pick(e);
    canvas.style.cursor = hovered >= 0 ? 'pointer' : 'default';
  };
  const onClick = (e) => {
    const k = pick(e);
    if (k >= 0) onOpen(items[k].manifest.id);
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('click', onClick);

  const anchor = new THREE.Vector3();
  let lastW = innerWidth;
  let lastH = innerHeight;
  function frame(dt) {
    layout();
    if (innerWidth !== lastW || innerHeight !== lastH) {
      // the header and the hint rewrap with the width: measure the bands again
      lastW = innerWidth;
      lastH = innerHeight;
      reserveBands();
    }
    const r = canvas.getBoundingClientRect();
    items.forEach((it, k) => {
      // caption under the book's tail edge (or beside it in a column)
      anchor.set(0.514, 0, 0.8);
      it.holder.localToWorld(anchor).project(stage.camera);
      const x = (anchor.x * 0.5 + 0.5) * r.width;
      const y = (-anchor.y * 0.5 + 0.5) * r.height;
      if (lis[k]) lis[k].style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, 0)`;
    });
    items.forEach((it, k) => {
      it.target = hovered === k ? 1 : 0;
      it.lift = reducedMotion ? it.target : damp(it.lift, it.target, 9, dt);
      it.holder.position.y = it.lift * 0.06;
      it.holder.rotation.x = -it.lift * 0.05;
      it.book.update(dt);
    });
  }

  function dispose() {
    disposed = true;
    prepSeq++;
    dropPrepared();
    clearTimeout(noticeTimer);
    sw.destroy();
    rig.focus = prevFocus;
    rig.setInsets(null);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('click', onClick);
    canvas.style.cursor = '';
    ui.remove();
    group.removeFromParent();
    items.forEach((it) => {
      it.tex.dispose();
      it.book.dispose();
    });
  }

  /**
   * Called by boot when this view becomes the current one: claim the title
   * and the rig. The shelf has no zoom, pan or orbit control of its own, so
   * whatever a superseded reader left on the shared rig is cleared here.
   */
  function activate() {
    document.title = t('Lámina — Living Scientific Plates');
    if (degraded && shown === lang) notice(lang === 'es' ? t('The Spanish edition could not be loaded. Reload the page to try again.') : t('The English edition could not be loaded. Reload the page to try again.'));
    rig.reset(); // zoom 1, no pan or orbit, book mode
    shelfLayout = null; // re-assert the shelf box even if the orientation did not change
    layout();
  }

  return { frame, dispose, activate, prepareLang, applyLang, api: { items: items.map((i) => i.manifest.id) } };
}
