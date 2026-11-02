// Reader: one book on the stage. Wires the manifest → typeset sides → page
// textures → 3D book, pop-up figures, UI, input, audio, export and the
// window.lamina automation API. Everything book-specific comes from the
// manifest; everything subject-specific comes from the figure modules.
//
// The camera rig, the URL and the document title are shared with the
// library: the reader touches them only after boot activates it
// (activate()), and a reader whose route is superseded while it builds
// disposes itself the moment the route is aborted.
//
// A book is read in one edition at a time — English or Spanish, composed
// by src/i18n/edition.js: the same leaves, plates and figures in other
// words. A language switch (boot's changeLang) first runs prepareLang: the
// edition and its fonts load and the pages on screen are typeset ahead,
// while nothing visible changes. applyLang then swaps everything in one
// synchronous step — those pages, the chrome, the reading text, the
// figures' words — and keeps the spread, time, layers, explode, labels, yaw
// and inspect as they were; the other kept pages are printed again in idle
// time. Strings in code stay English and go through t() on their way out.
import * as THREE from 'three/webgpu';
import { t, msg, getLang, setLang, isLoaded, loadLang, loadEdition, lastReport, missingKeys } from '../i18n/index.js';
import { Book } from '../engine/book/Book.js';
import { FigureHost } from '../engine/figures/FigureHost.js';
import { recommendedPlaybackRate } from '../engine/figures/captionPace.js';
import { FIGURE_AREA, FIGURE_DURATION } from '../engine/figures/contract.js';
import { WORLD } from '../engine/stage.js';
import { loadFonts, buildSides } from '../engine/typeset/index.js';
import { createUI } from '../engine/ui/index.js';
import { createInput } from '../engine/input.js';
import { createAudio, connectBookAudio } from '../engine/audio.js';
import { exportFigureSVG, exportPNG, exportFileName, downloadText, downloadBlob } from '../engine/export/index.js';
import { figureLoaders } from '../subjects/index.js';
import { bookHref, libraryHref, replaceHash } from './route.js';
import { PageCache } from './pages.js';
import { plateHTML, plateAnnouncement, sideHTML, LOOK_HREF } from './a11y.js';
import { createNarration } from './narration.js';
import { narrationForLeftPage } from './narration-text.js';

const FIGURE_LAYOUTS = new Set(['plate-figure', 'lesson-figure']);
/** Pages a portrait reader never stops on (portrait screens frame one page at a time). */
const UNREADABLE = new Set(['blank', 'endpaper', 'cover', 'back-cover']);
/**
 * Spreads named (and opened, on portrait) by their verso: the text is there,
 * the recto is a list or an endpaper ([making · brief | back endpaper] is
 * "How this book was made"; [glossary | making · prompt] stays "Glossary").
 */
const VERSO_FIRST = new Set(['intro', 'note', 'glossary', 'making']);

/** What a spread is called (UI title, announcements), by the layout of its sides: dictionary keys. */
const SPREAD_NAMES = {
  cover: msg('Cover'),
  endpaper: msg('Endpapers'),
  title: msg('Title page'),
  imprint: msg('Imprint'),
  contents: msg('Contents'),
  intro: msg('Introduction'),
  howto: msg('How to use this book'),
  note: msg('Afterword'),
  sources: msg('Sources & colophon'),
  glossary: msg('Glossary'),
  making: msg('How this book was made'),
  'back-cover': msg('Back cover'),
};

/** Inspect ("Inspect it up close"): camera angle, and how much of the free view's width the figure's loop fills. */
const INSPECT_ELEVATION = THREE.MathUtils.degToRad(30);
const INSPECT_AZIMUTH = THREE.MathUtils.degToRad(24);
const INSPECT_FILL = 0.9;
/** Keyboard: figure turntable step ([ ]) and inspect tilt step (↑ ↓). */
const KEY_YAW = THREE.MathUtils.degToRad(15);
const KEY_TILT = THREE.MathUtils.degToRad(8);
/**
 * A tap this close (CSS px) to the pop-up is a near miss on it, not a page
 * turn: a fingertip lands wider of a 7 px coral body than a cursor does.
 * A cursor's 11 rather than 10, so a click a full 10 px beside a coil counts.
 */
const NEAR_PX = { mouse: 11, pen: 24, touch: 24 };
/**
 * Near-miss rays: 8 directions, stepped out to the radius at most this many
 * CSS px apart, so a 7 px coral body anywhere in the ring crosses a sample.
 */
const NEAR_STEP_PX = 6;
const NEAR_DIRS = Array.from({ length: 8 }, (_, k) => [Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4)]);
const DOUBLE_TAP_MS = 330;
/** Figure layers whose parts lie under a snake's skin (CONTRACTS §12): peeling the skin shows one. */
const UNDER_SKIN = ['skeleton', 'venom'];
/** An unrequested label whose anchor stays behind the figure this long goes; brief dips keep it (no blinking). */
const OCCLUDED_HIDE_MS = 400;
/** A label back in view this soon after it went blinked: it waits twice as long next time, up to the max. */
const BLINK_MS = 500;
const OCCLUDED_HIDE_MAX_MS = 1600;
/** Look closer on a paused loop: scan step (s), how far into the part's time in view to land (s), scan budget. */
const SEEK_STEP = 0.1;
const SEEK_INTO = 0.3;
const SEEK_BUDGET_MS = 40;
const SEEK_DIRS = [1, -1];
/**
 * Phones: a tap on a head label, or on its look-closer note, frames the
 * head in inspect: a sphere this many times half the head's length fills
 * 70 % of the short side (rig.inspectSphere), so a head seen side-on fills
 * about 0.7 / 1.6 ≈ 44 % of it (the whole-loop inspect leaves a face
 * 10–40 px wide).
 */
const HEAD_INSPECT_SCALE = 1.6;
/** Head close-ups look down on the face this much (a side view, not the crown). */
const HEAD_ELEVATION = THREE.MathUtils.degToRad(24);
/** A language switch: how long a page waiting to be printed again may wait for an idle moment (ms). */
const REPRINT_TIMEOUT_MS = 250;
/** Keys a radio group (the language switch) moves its own choice with: never a page turn. */
const RADIO_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', ' ', 'Spacebar']);

const superseded = () => new DOMException('Route superseded', 'AbortError');
/** One idle moment (requestIdleCallback where there is one: Safari has none). */
const onIdle = (cb) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(cb, { timeout: REPRINT_TIMEOUT_MS }) : setTimeout(cb, 32));
const cancelIdle = (h) => (typeof cancelIdleCallback === 'function' ? cancelIdleCallback(h) : clearTimeout(h));

/** buildSides() → the ordered sides (with leafCount). */
function sidesOf(edition) {
  const built = buildSides(edition);
  return built.sides ?? built;
}
/** The plates of a book's sides: the recto figure pages, with the leaf and spread they stand on. */
function platesOf(sides) {
  const plates = [];
  sides.forEach((s, j) => {
    if (!FIGURE_LAYOUTS.has(s.layout) || j % 2) return;
    const plate = s.plate ?? s.data?.plate ?? null;
    if (plate) plates.push({ plate, leaf: j / 2, spread: s.spread ?? j / 2, figure: plate.figure });
  });
  return plates;
}
const bySpread = (plates) => new Map(plates.map((p, i) => [p.spread, { ...p, index: i }]));
/**
 * Why two editions' sides cannot share one book (null when they can): the
 * same count, the same layout at every side, the same plate at every
 * figure page. Editions are composed on the English structure, so this
 * only guards against a broken edition file.
 */
function structureDiffers(a, b) {
  if (a.length !== b.length) return `${a.length} sides, then ${b.length}`;
  for (let i = 0; i < a.length; i++) {
    if (a[i].layout !== b[i].layout) return `side ${i}: ${a[i].layout}, then ${b[i].layout}`;
    if ((a[i].plate?.id ?? null) !== (b[i].plate?.id ?? null)) return `side ${i}: plate ${a[i].plate?.id}, then ${b[i].plate?.id}`;
  }
  return null;
}

export async function createReader({ renderer, backend, stage, bookId, params, reducedMotion, onLibrary, signal, lang: startLang, requestLang }) {
  let lang = startLang ?? getLang(); // the edition shown
  let manifest = await loadEdition(bookId, lang);
  if (signal?.aborted) throw superseded();
  const theme = manifest.theme ?? {};
  await loadFonts(theme, { manifest });
  if (signal?.aborted) throw superseded();

  let sides = sidesOf(manifest);
  const leafCount = sides.leafCount ?? Math.ceil(sides.length / 2);
  const spreadCount = leafCount + 1; // opened = 0 (closed front) … leafCount (closed back)

  // ---------------------------------------------------------------- plates
  // the same leaves, spreads and figures in every edition: only their words change
  let plates = platesOf(sides);
  let plateBySpread = bySpread(plates);
  const style = ['lithograph', 'engraving'].includes(params.get('style')) ? params.get('style') : theme.style ?? 'lithograph';

  // lesson books: construction diagrams come from the figure module (drawStep)
  let stepDrawer;
  if (sides.some((s) => s.layout === 'lesson-text')) {
    const types = new Set(plates.map((p) => p.figure?.type).filter(Boolean));
    const drawers = {};
    for (const type of types) {
      try {
        const mod = await figureLoaders[type]?.();
        if (mod?.drawStep) drawers[type] = mod.drawStep;
      } catch (e) {
        console.warn('[reader] no drawStep for', type, e);
      }
    }
    stepDrawer = (g, spec, step, box) => {
      const fig = (spec.plate ?? spec.data?.plate)?.figure;
      const fn = fig && drawers[fig.type];
      if (fn) fn(g, fig.params ?? {}, step, box, theme);
    };
  }
  // Last await before the figure mounts: from here on everything runs
  // synchronously, so a superseded route never leaves half a reader behind.
  if (signal?.aborted) throw superseded();

  // ---------------------------------------------------------------- state
  let active = false; // boot made this the current view (it may touch the rig, URL and title)
  let disposed = false;
  let lastSpread = -1;
  let portraitSide = 'right'; // the page a portrait screen frames
  let wasPortrait = stage.rig.isPortrait;
  let prevOpened = 0;
  let gotoTarget = -1; // destination of a goto (drawer, Home/End, links): lands on the page it names
  let gotoPage = null; // … 'left' | 'right' when the link names the page of its spread
  let restSpread = 0; // the spread last seen at rest (no leaf in flight)
  let hold = -1; // restSpread, while turns in flight have carried `opened` more than a leaf away from it
  let openTimer = 0;
  let headLabel = null; // phones: the label whose head the inspect camera follows (see inspectHead)
  let headHeading = null; // … that head's heading last frame (radians), null right after the tap

  // ---------------------------------------------------------------- 3D
  const book = new Book({
    leafCount,
    reducedMotion,
    theme: {
      paper: theme.paper,
      cloth: theme.cloth,
      foil: theme.foil,
      headband: [theme.accent ?? '#9e2b25', theme.endpaper?.ground ?? '#efe7d6'],
      endpaper: theme.endpaper,
      ...(theme.edge ? { edge: theme.edge } : {}),
    },
  });
  // Every face starts on a solid texture this reader owns (and frees). three
  // r186 tracks a bind group on every texture it was ever bound to but only
  // untracks it from the last one, so leaves first drawn on paper.js's
  // never-freed shared blanks kept each visit's page canvases alive.
  const blanks = {
    paper: solidTexture(book.theme.paper ?? '#fbf8f1'),
    cloth: solidTexture(book.theme.cloth ?? '#23412f'),
    endpaper: solidTexture(book.theme.endpaper?.ground ?? '#efe7d6'),
  };
  const blankFor = (i) => {
    const leaf = i >> 1;
    const back = i % 2 === 1;
    if (leaf === 0) return back ? blanks.endpaper : blanks.cloth; // front board: cover | endpaper
    if (leaf === leafCount - 1) return back ? blanks.cloth : blanks.endpaper; // back board: endpaper | cover
    return blanks.paper;
  };
  const faceOf = (i) => (i % 2 ? 'back' : 'front');
  for (let i = 0; i < leafCount * 2; i++) book.setLeafTexture(i >> 1, faceOf(i), blankFor(i));
  stage.world.add(book);
  const host = new FigureHost({
    book,
    theme: { style, paper: theme.paper, ink: theme.ink, quality: stage.quality },
    reducedMotion,
  });

  // ---------------------------------------------------------------- page textures
  const pages = new PageCache({ renderer, sides, theme, width: pickPageWidth(), stepDrawer, capacity: 8 });
  const queue = new Set(); // side indices waiting to be printed (time-budgeted per frame)
  const applied = new Set();
  pages.onEvict = (i) => {
    applied.delete(i);
    book.setLeafTexture(i >> 1, faceOf(i), blankFor(i));
  };

  function ensureSide(i, now = false) {
    if (i < 0 || i >= sides.length) return;
    if (applied.has(i) && pages.has(i)) return;
    if (now) applySide(i);
    else queue.add(i);
  }
  function applySide(i) {
    const tex = pages.get(i);
    queue.delete(i);
    if (!tex) return;
    book.setLeafTexture(i >> 1, faceOf(i), tex);
    applied.add(i);
  }
  /**
   * Print the pages around a spread (its own two sides at once) and mount
   * nearby figures. The window is the previous, current and next spreads:
   * every side a single turn shows, in either direction.
   *
   * Turns still in flight keep what they show on top of that window: the
   * spread they left (`hold`: its verso and its pop-up stay on screen until
   * the first leaf has covered them), the faces of leaves turned one by one
   * (→ → → in quick succession; riffle leaves print only when the budget
   * allows) and any pop-up already standing on a leaf in the air — so a jump
   * or a quick run of turns never blanks a page or drops a pop-up mid-air.
   * Mounts are only kept, never added: the extra is bounded by what was on
   * screen, and atRest() lets it go.
   */
  function prefetch(opened, now = false) {
    const keep = [];
    for (let s = opened * 2 - 3; s <= opened * 2 + 2; s++) if (s >= 0 && s < sides.length) keep.push(s);
    const own = keep.length;
    if (hold >= 0) for (let s = hold * 2 - 3; s <= hold * 2 + 2; s++) if (s >= 0 && s < sides.length && !keep.includes(s)) keep.push(s);
    for (const l of book.leaves) {
      if (l.phys !== 'F' || l.riffle) continue;
      for (let s = l.index * 2; s <= l.index * 2 + 1; s++) if (s < sides.length && !keep.includes(s)) keep.push(s);
    }
    pages.keep(keep);
    for (let j = 0; j < own; j++) ensureSide(keep[j], now && (keep[j] === opened * 2 || keep[j] === opened * 2 - 1));
    const wanted = [];
    for (let leaf = opened - 1; leaf <= opened + 1; leaf++) {
      const p = plateBySpread.get(leaf);
      if (!p?.figure) continue;
      wanted.push(leaf);
      host.mount(leaf, { ...p.figure, style: p.figure.style ?? style, beats: p.plate.animation?.beats });
    }
    for (const m of host.mounts.values()) {
      const leaf = m.leafIndex;
      if (!wanted.includes(leaf) && (leaf === hold || book.leaves[leaf]?.phys === 'F')) wanted.push(leaf);
    }
    host.retain(wanted);
  }
  /** Every leaf has landed: this is the spread at rest; what turns in flight held is let go. */
  function atRest() {
    restSpread = book.opened;
    hold = -1;
    prefetch(book.opened);
    pages.trim(); // the held pages beyond capacity go now, not at the next print
  }

  // ---------------------------------------------------------------- framing
  // The camera frames the open spread; a tall pop-up (an orchid spray, a
  // skull with its construction line) adds its box so it never leaves the
  // view. Book-local coordinates: the book sits at the world origin. The rig
  // also gets the two parts separately: a rig that fits each part's corners
  // (not the union's phantom corners) frames tall pop-ups larger.
  const Wb = WORLD.pageW + WORLD.coverOverhang;
  const Hb2 = WORLD.pageH / 2 + WORLD.coverOverhang;
  const baseFit = new THREE.Box3(new THREE.Vector3(-Wb, 0, -Hb2), new THREE.Vector3(Wb, 0.08, Hb2));
  const fitBox = new THREE.Box3();
  const figBox = new THREE.Box3();
  const FIT_SPREAD = [baseFit];
  const FIT_FIGURE = [baseFit, figBox];
  const _size = new THREE.Vector3();
  function frameSpread() {
    if (!active) return;
    fitBox.copy(baseFit);
    let parts = FIT_SPREAD;
    const m = host.get(book.opened);
    if (m?.figure && m.box && !book.busy) {
      const s = m.fitScale;
      m.box.getSize(_size);
      let hx = (_size.x * s) / 2;
      let hz = (_size.z * s) / 2;
      if (Math.abs(m.yawTarget ?? 0) > 0.05) hx = hz = Math.hypot(hx, hz);
      const top = _size.y * s;
      const ax = FIGURE_AREA.s * WORLD.pageW;
      const az = FIGURE_AREA.z * WORLD.pageH;
      const y0 = book.surfaceY?.(1) ?? 0.03;
      figBox.min.set(ax - hx, y0, az - hz);
      figBox.max.set(ax + hx, y0 + top, az + hz);
      fitBox.union(figBox);
      parts = FIT_FIGURE;
    }
    stage.rig.setFitBox(fitBox, parts);
  }

  // ---------------------------------------------------------------- UI
  const root = document.querySelector('#ui') ?? document.body;
  /**
   * The book as the UI shows it, in this edition: its title, and the
   * contents drawer mirroring the printed contents (front matter, plates,
   * back matter). A matter entry names the page of its spread it is printed
   * on, so a portrait reader framing one page lands on it ("How this book
   * was made" shares a spread with the glossary).
   */
  function bookInfo() {
    const matterEntry = (layout, title) => {
      const s = sides.find((x) => x.layout === layout);
      return s ? { number: '', title, sci: '', spread: s.spread, page: s.recto ? 'right' : 'left' } : null;
    };
    return {
      id: manifest.id,
      title: manifest.title,
      subtitle: manifest.subtitle,
      kind: plates.some((p) => p.plate.layout === 'lesson') ? 'Lesson' : 'Plate', // English key: the UI translates it
      plates: [
        matterEntry('intro', manifest.intro?.title ?? t(SPREAD_NAMES.intro)),
        ...plates.map((p) => ({ number: p.plate.number, title: p.plate.common, sci: p.plate.scientific, spread: p.spread })),
        matterEntry('note', manifest.back?.note?.title ?? t(SPREAD_NAMES.note)),
        matterEntry('glossary', t(SPREAD_NAMES.glossary)),
        matterEntry('making', t(SPREAD_NAMES.making)),
      ].filter(Boolean),
    };
  }
  const ui = createUI({
    root,
    book: bookInfo(),
    onCommand: (cmd) => command(cmd),
    theme: { accent: theme.accent, ink: theme.ink, paper: theme.paper },
    reducedMotion,
    announceSpreads: false, // the reader announces plates with their binomial (below)
    libraryHref: libraryHref(lang),
    lang,
  });
  ui.setBackend?.(backend);
  const narration = createNarration({
    onState: ({ error, finished, ...state }) => ui.setNarration?.({ ...state, status: finished ? 'ended' : state.status }),
  });
  let narrationSide = null;
  function syncNarration() {
    const sideKey = book.busy ? null : `${lang}:${book.opened}`;
    if (sideKey === narrationSide) return;
    narrationSide = sideKey;
    narration.setPage(sideKey ? narrationForLeftPage(sides, book.opened, lang) : null);
  }
  if (params.get('ui') === '0') ui.setChromeVisible?.(false);
  const barEl = ui.el?.querySelector('.lam-bar');
  const capEl = ui.el?.querySelector('.lam-caption');
  const topEl = ui.el?.querySelector('.lam-top');

  // "Look closer" notes in the reading sheet (and the screen-reader text) are links to their label
  const onLookLink = (e) => {
    const a = e.target?.closest?.('a[href]');
    const href = a?.getAttribute('href') ?? '';
    if (!href.startsWith(LOOK_HREF)) return;
    e.preventDefault(); // never a route change
    ui.close?.('reading');
    lookCloser(decodeURIComponent(href.slice(LOOK_HREF.length)));
  };
  ui.el?.addEventListener('click', onLookLink);
  // phones: a tap on a head label's pill also brings the face up close (its card opens as before)
  const onPill = (e) => {
    const id = e.target?.closest?.('.lam-pill')?.dataset?.labelId;
    if (id && isPhone()) inspectHead(id);
  };
  ui.el?.addEventListener('click', onPill);

  const audio = createAudio({ enabled: params.get('sound') !== '0' });
  const offAudio = connectBookAudio(book, audio);
  ui.setSound?.(audio.enabled);
  const unlockAudio = () => audio.unlock();
  addEventListener('pointerdown', unlockAudio, { capture: true });
  addEventListener('keydown', unlockAudio, { capture: true });

  const state = { labels: params.get('labels') !== '0', sound: audio.enabled };
  let focusLabel = null;
  let focusLabelUntil = 0;

  const input = createInput({
    canvas: renderer.domElement,
    stage,
    book,
    host,
    onTap: (hit) => onTap(hit),
    onHover: (info) => onHover(info),
    onInspect: () => toggleInspect(),
    onNavigate: (dir) => command(dir > 0 ? 'next' : 'prev'),
    // the near-miss test taps use (an input layer may also start a figure gesture with it)
    nearFigure: (x, y, pointerType) => nearFigure(x, y, pointerType),
  });
  // The rig is shared: until boot activates this reader, a wheel, pinch or
  // pan on the dimmed stage would zoom the camera the library inherits if
  // this build is superseded (activate() turns input on).
  input.setEnabled?.(false);

  // ---------------------------------------------------------------- UI bands
  // The toolbar and the beat caption above it cover the bottom ~120 px (and a
  // phone's top pill the top 60): the rig frames the book between those bands
  // (plus 8 px of air), so its tail edge never sits under the caption.
  // Measured from the awake layout (offsetTop ignores the idle slide), so the
  // framing does not jump when the chrome idles.
  let reserveKey = '';
  function chromeReservePx() {
    if (typeof ui.bottomReserve === 'function') return ui.bottomReserve();
    const vh = ui.el?.clientHeight || innerHeight;
    if (capEl?.offsetHeight) return Math.max(0, vh - capEl.offsetTop);
    if (barEl?.offsetHeight) return Math.max(0, vh - barEl.offsetTop);
    return 0; // ui=0 (clean captures): today's framing
  }
  function reserveChrome(force = false) {
    if (!active) return;
    // runs after every command (a scrubbed slider too): the key reads no layout
    const h = Math.max(1, innerHeight); // the stage canvas is fixed to the viewport
    const key = `${h}|${innerWidth}|${!!host.get(book.opened)?.figure}|${Math.round(Math.min(1, stage.rig.bookTilt * 4) * 100)}`;
    if (!force && key === reserveKey) return;
    reserveKey = key;
    const px = chromeReservePx();
    // at most 18% of the height: a landscape phone keeps a usable book (only the toolbar is reserved there)
    const bottom = px > 0 ? Math.min(px + 8, 0.18 * h) : 0;
    const top = topReservePx();
    stage.rig.setInsets(bottom || top ? { top, bottom } : null);
  }
  /**
   * The top bar's band (CSS px) where it runs over the book: on phones its
   * pill spans the width, and on short landscape screens (data-short: no
   * caption band below) the height-bound book grows up to the top edge, so
   * its head edge would run under the bar's title. A frontal reading angle
   * also fills that space on desktop; reserve the band progressively while
   * leaving the original inclined framing unchanged.
   */
  function topReservePx() {
    if (!topEl?.offsetHeight) return 0;
    const share = isCompact() || ui.el?.hasAttribute('data-short') ? 1 : Math.min(1, stage.rig.bookTilt * 4);
    return (topEl.offsetTop + topEl.offsetHeight + 6) * share;
  }

  // ---------------------------------------------------------------- portrait: one page at a time
  // A portrait screen frames a single page, so readers step page by page:
  // ← on a recto shows its verso before turning back, → on a verso shows the
  // recto. A forward turn lands on the new verso when it is worth reading
  // (imprint, introduction, plate text, afterword, glossary); jumps land on
  // the page they name; back turns land on the recto. Landscape is unchanged.
  const readable = (s) => !!s && !UNREADABLE.has(s.layout);
  const isCompact = () => !!ui.el?.hasAttribute('data-compact');
  /** A phone's layout: narrow (data-compact) or a short landscape screen (data-short). */
  const isPhone = () => isCompact() || !!ui.el?.hasAttribute('data-short');
  function applyPage() {
    stage.rig.focusPage(portraitSide === 'left' ? 'left' : 'auto'); // 'auto' = the spread again in landscape
  }
  function showPage(side) {
    if (!stage.rig.isPortrait) side = 'right';
    if (side === portraitSide) return false;
    narration.stop();
    portraitSide = side;
    if (active) applyPage();
    lastSpread = -1; // the title, reading text and announcement follow the framed page
    return true;
  }
  function stepPage(dir) {
    const rig = stage.rig;
    if (!rig.isPortrait || rig.mode !== 'book') return false;
    const k = book.opened;
    if (dir < 0 && portraitSide === 'right' && readable(sides[2 * k - 1])) return showPage('left');
    if (dir > 0 && portraitSide === 'left' && sides[2 * k]) return showPage('right');
    return false;
  }
  function landingSide(opened, how) {
    const verso = sides[opened * 2 - 1];
    if (!readable(verso)) return 'right';
    if (how === 'jump') return VERSO_FIRST.has(verso.layout) ? 'left' : 'right';
    // phones open plates on their figure: the Read sheet carries the plate text
    if (how === 'forward') return isCompact() && plateBySpread.has(opened) ? 'right' : 'left';
    return 'right';
  }

  // ---------------------------------------------------------------- commands
  function command(cmd) {
    const c = typeof cmd === 'string' ? { type: cmd } : cmd;
    switch (c.type) {
      case 'next':
        exitInspect();
        if (!stepPage(1)) book.next();
        break;
      case 'prev':
        exitInspect();
        if (!stepPage(-1)) book.prev();
        break;
      case 'goto': {
        exitInspect();
        const k = clampSpread(c.spread ?? (c.plate != null ? plates[c.plate - 1]?.spread : null));
        if (k == null) break;
        // a contents entry may name the page of its spread it means: portrait frames that one
        gotoPage = c.page === 'left' || c.page === 'right' ? c.page : null;
        if (k === book.opened) {
          if (stage.rig.isPortrait) showPage(gotoPage ?? landingSide(k, 'jump'));
          gotoPage = null;
          break;
        }
        // hold the spread last at rest until every leaf lands — also when this
        // jump starts while a turn is still in flight (set before the prefetch)
        if (hold < 0 && Math.abs(k - restSpread) > 1) hold = restSpread;
        gotoTarget = k;
        // print the destination now so the riffle lands on finished pages
        prefetch(k, true);
        book.goTo(k);
        break;
      }
      case 'play':
        host.setPlaying(true);
        break;
      case 'pause':
        host.setPlaying(false);
        break;
      case 'toggle-play':
        host.setPlaying(!host.playing);
        break;
      case 'time': {
        host.setPlaying(false);
        const t = +(c.t ?? c.value ?? 0);
        if (Number.isFinite(t)) host.setTime(t);
        break;
      }
      case 'labels':
        state.labels = c.on ?? c.value ?? !state.labels;
        for (const m of host.mounts.values()) host.setLabels(state.labels, m.leafIndex);
        break;
      case 'layer': {
        const on = c.on ?? c.value ?? !(host.active?.layers?.[c.id] !== false);
        host.setLayer(c.id, on);
        if (c.id === 'skin' && !on && host.active) showUnderSkin(host.active);
        break;
      }
      case 'explode': {
        const m = host.active;
        const cur = m?.explodeTarget ?? 0;
        host.setExplode(c.amount ?? c.value ?? (cur > 0.5 ? 0 : 1));
        break;
      }
      case 'export': {
        // the UI ends its busy state when this settles (as well as on the toast)
        const done = doExport(c.mode ?? 'svg-color').catch((err) => {
          console.error('[reader] export failed', err);
          // a reason the exporter words for the reader (already in the plate's language)
          ui.toast?.(err?.userMessage || t('Export failed — see the console'));
        });
        syncUI();
        return done;
      }
      case 'lang':
        narration.stop();
        return askLang(c.lang);
      case 'narration':
        syncNarration();
        return narration.toggle();
      case 'narration-stop':
        narration.stop();
        break;
      case 'fullscreen':
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.().catch(() => {});
        break;
      case 'reset-view':
        stage.rig.reset();
        break;
      case 'book-view':
        exitInspect();
        stage.rig.setBookTilt(c.amount);
        break;
      case 'sound':
        state.sound = c.on ?? c.value ?? !state.sound;
        audio.setEnabled(state.sound);
        if (state.sound) audio.unlock();
        ui.setSound?.(state.sound);
        break;
      case 'library':
        narration.stop();
        onLibrary?.();
        break;
      case 'contents':
        if (c.open === undefined) ui.openContents?.(); // keyboard / command; the drawer's own notifications carry `open`
        break;
    }
    syncUI();
  }

  /**
   * The reader peeled the skin off a snake: everything outside the skin goes
   * with it (nothing may float), so with no layer under it switched on the
   * page would be empty. Show the bones instead — through the host, which
   * re-syncs the UI's switches ('layers' → syncUI) — and say so. Only then:
   * the reader may switch the skeleton off again afterwards. (Also for a URL
   * that opens a plate with `layers=skin:0`, which is not announced: the
   * plate's own announcement comes first.)
   * @param {object} m  a mount with a built figure
   * @param {boolean} [announce]
   */
  function showUnderSkin(m, announce = true) {
    const layers = m?.figure?.layers ?? [];
    if (!layers.some((l) => l.id === 'skeleton')) return;
    if (layers.some((l) => UNDER_SKIN.includes(l.id) && m.layers[l.id] !== false)) return;
    host.setLayer('skeleton', true, m.leafIndex);
    // after the UI's own "Skin hidden" (a key toggle announces once its command returns)
    if (announce) queueMicrotask(() => ui.announce?.(t('Skin hidden. Skeleton shown.')));
  }

  /**
   * The reader chose a language on the switch: boot switches the session
   * (URL, <html lang>) and calls applyLang. Resolves as requestSwitch does
   * (the switch then shows the language in place). When the dictionaries
   * could not be fetched (offline, a stale chunk after a deploy) the book
   * stays as it was and a toast says so, in the library's words; a request
   * superseded by a newer one says nothing.
   */
  let langAsked = 0;
  let editionFailed = null; // the language whose edition prepareLang could not load (EditionLoadError)
  function askLang(next) {
    const mine = ++langAsked;
    editionFailed = null;
    return Promise.resolve(requestSwitch(next)).then((ok) => {
      if (!ok && !disposed && mine === langAsked && next !== lang && (!isLoaded(next) || editionFailed === next)) {
        ui.toast?.(
          next === 'es'
            ? t('The Spanish edition could not be loaded. Reload the page to try again.')
            : t('The English edition could not be loaded. Reload the page to try again.')
        );
      }
      return ok;
    });
  }

  /** A spread index from user input (URL, links, automation); null when it is not a number. */
  function clampSpread(k) {
    if (k == null || k === '') return null;
    const n = Math.round(Number(k));
    return Number.isFinite(n) ? Math.max(0, Math.min(spreadCount - 1, n)) : null;
  }

  // the last tap on or near the pop-up: two in a row inspect it (see onTap)
  const lastNear = { t: 0, exact: false };
  function onTap(hit) {
    if (!hit) return;
    if (hit.kind === 'background') {
      if (stage.rig.mode === 'inspect') exitInspect();
      return;
    }
    if (hit.kind === 'figure') {
      // input inspects two taps on the figure itself; a near miss and a hit
      // in either order are a double-tap too (a fingertip on a thin coil)
      const now = performance.now();
      if (!lastNear.exact && now - lastNear.t < DOUBLE_TAP_MS) {
        lastNear.t = 0;
        toggleInspect();
      } else {
        lastNear.t = now;
        lastNear.exact = true;
      }
      return;
    }
    if (hit.kind !== 'page') return;
    // printed hit regions (contents entries, look-closer items, layer names)
    const region = hitRegion(hit);
    if (region) {
      const a = region.action;
      if (a.type === 'goto') return command({ type: 'goto', spread: a.spread ?? plates[a.plate - 1]?.spread, page: a.page });
      if (a.type === 'label') return lookCloser(a.id);
      if (a.type === 'layer') {
        showPage('right'); // portrait: let the reader see the figure change
        return command({ type: 'layer', id: a.id, on: host.active?.layers?.[a.id] === false });
      }
    }
    // a near miss on the pop-up (aiming at a coil, a petal) must not turn the
    // page; two of them in a row inspect it, like a double-click on the figure
    if (hit.side === 'front' && hit.leaf === book.opened && nearFigure(hit.x, hit.y, hit.pointerType)) {
      const now = performance.now();
      if (now - lastNear.t < DOUBLE_TAP_MS) {
        lastNear.t = 0;
        toggleInspect();
      } else {
        lastNear.t = now;
        lastNear.exact = false;
      }
      return;
    }
    // portrait frames one page: a tap on it always reads on
    if (stage.rig.isPortrait || hit.side === 'front' || hit.leaf >= book.opened) command('next');
    else command('prev');
  }
  const _tapRay = new THREE.Raycaster();
  const _tapSphere = new THREE.Sphere();
  const _tapNdc = new THREE.Vector2();
  const _tapEye = new THREE.Vector3();
  const _tapHits = [];
  const _tapPicks = [];
  function aimTap(x, y, rect) {
    _tapNdc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    _tapRay.setFromCamera(_tapNdc, stage.camera);
  }
  /**
   * Whether a screen point is on, or within NEAR_PX (by pointer type) of, the
   * visible figure: the exact pick, then rays around the point (8 directions,
   * every NEAR_STEP_PX out to the radius, nearest first). Precise rays, not
   * the bounding sphere (which covered up to half the recto of a coiled
   * snake or a spray with blank paper); the sphere only culls. The ring tests
   * a dense mesh through its coarse stand-in where the subject hangs one
   * (userData.occluder: a skull's BVH), so a near miss costs little.
   * @param {number} x  CSS px
   * @param {number} y
   * @param {string} [pointerType]  'mouse' | 'pen' | 'touch'
   */
  function nearFigure(x, y, pointerType = 'mouse') {
    const m = host.active;
    if (!m?.anchor.visible || x == null || !host.focusPoint(_tapSphere.center)) return false;
    const rect = renderer.domElement.getBoundingClientRect();
    const r = NEAR_PX[pointerType] ?? NEAR_PX.touch;
    _tapSphere.radius = host.figureRadius();
    stage.camera.updateMatrixWorld();
    aimTap(x, y, rect);
    if (_tapRay.ray.intersectsSphere(_tapSphere)) {
      if (host.pickFigure(_tapRay)) return true;
    } else {
      // nowhere near the figure's bounds (with the ring's reach in world units there): no ring
      const d = _tapRay.ray.distanceToPoint(_tapSphere.center) - _tapSphere.radius;
      const pxWorld = (2 * stage.camera.getWorldPosition(_tapEye).distanceTo(_tapSphere.center) * Math.tan(THREE.MathUtils.degToRad(stage.camera.fov) / 2)) / Math.max(1, rect.height);
      if (d > Math.max(_tapSphere.radius * 0.25, 1.5 * r * pxWorld)) return false;
    }
    _tapPicks.length = 0;
    m.figure.root.traverseVisible(addPickable);
    const steps = Math.max(1, Math.ceil(r / NEAR_STEP_PX));
    let near = false;
    for (let s = 1; s <= steps && !near; s++) {
      const d = (r * s) / steps;
      for (let k = 0; k < NEAR_DIRS.length && !near; k++) {
        aimTap(x + NEAR_DIRS[k][0] * d, y + NEAR_DIRS[k][1] * d, rect);
        _tapRay.intersectObjects(_tapPicks, false, _tapHits);
        near = _tapHits.length > 0;
        _tapHits.length = 0;
      }
    }
    _tapPicks.length = 0;
    return near;
  }
  /** What a tap can land on: visible solid meshes (no outlines, ink lines or x-ray ghosts), through their stand-ins. */
  function addPickable(o) {
    if (!o.isMesh || o.userData.isOutline || o.userData.isInkLine || o.isLine2 || o.isLineSegments2) return;
    if (Array.isArray(o.material) ? o.material.every(isGhost) : isGhost(o.material)) return;
    const p = o.userData.occluder;
    if (p) {
      p.matrixWorld.copy(o.matrixWorld);
      _tapPicks.push(p);
    } else _tapPicks.push(o);
  }
  function hitRegion(hit) {
    if (hit.u == null || hit.v == null) return null;
    const side = hit.leaf * 2 + (hit.side === 'back' ? 1 : 0);
    return pages.hits(side).find((h) => hit.u >= h.rect[0] && hit.u <= h.rect[2] && hit.v >= h.rect[1] && hit.v <= h.rect[3]) ?? null;
  }
  function onHover(info) {
    if (info?.kind === 'page' && hitRegion(info)) return 'pointer';
    return undefined;
  }
  /** A "look closer" note was tapped: show its label (switching its layer on if needed). */
  function lookCloser(id) {
    const moved = showPage('right'); // portrait: the label is on the figure's page
    const m = host.active;
    const label = m?.figure?.labels?.find((l) => l.id === id);
    if (label?.layer && m.layers[label.layer] === false) host.setLayer(label.layer, true);
    // its layer is on but the dissection draws it as a ghost (a skin feature,
    // its label gated meanwhile): reassemble the figure to show it
    else if (label?.layer && m.figure.layerShown?.(label.layer) === false) host.setExplode(0);
    if (!state.labels) command({ type: 'labels', on: true });
    focusLabel = id;
    focusLabelUntil = performance.now() + 3200;
    // a paused loop never brings the part into view by itself
    if (label && !host.playing) {
      if (moved) seekLater(label);
      else seekInView(label);
    }
    // phones: a note on the face brings the head up close; any other leaves it
    if (label && isPhone() && !inspectHead(id) && headLabel) exitInspect();
    syncUI();
  }

  // ---------------------------------------------------------------- look closer, paused
  // On a paused loop (reduced motion, or the reader paused) a look-closer
  // note can name a part that is out of sight at that moment (Palicourea's
  // flowers wait inside the closed bracts at t = 0). The loop then moves to
  // the nearest moment its anchor is in view, a little inside that stretch
  // rather than on its edge. Poses are pure functions of t, so each moment is
  // posed at once and tested with one ray against what hides labels from
  // the host (see addOccluder); past a small budget the scan gives up and
  // restores the pose. A tap that also takes the camera to the figure's page
  // tests from where the camera arrives.
  const _seekRay = new THREE.Raycaster();
  const _seekEye = new THREE.Vector3();
  const _seekDir = new THREE.Vector3();
  const _seekHits = [];
  const _occluders = [];
  const _camLast = new THREE.Vector3();
  let seekLabel = null; // waiting for the camera to arrive
  let seekLeaf = -1;
  let seekUntil = 0;
  const isGhost = (mt) => (mt?.userData?.xray?.value ?? 0) > 0.5 || mt?.visible === false;
  /**
   * What hides a label from the host (FigureHost label occlusion): visible
   * solid meshes — no outlines, ink lines or x-ray ghosts — tested through
   * their coarse stand-in where they hang one (userData.occluder), with
   * see-through props (userData.noOcclude: clear water) left out. Collected
   * at each moment: parts appear and vanish with the loop.
   */
  function addOccluder(o) {
    if (!o.isMesh || o.userData.isOutline || o.userData.isInkLine || o.isLine2 || o.isLineSegments2 || o.userData.noOcclude) return;
    if (Array.isArray(o.material) ? o.material.every(isGhost) : isGhost(o.material)) return;
    const p = o.userData.occluder;
    if (p) {
      p.matrixWorld.copy(o.matrixWorld);
      _occluders.push(p);
    } else _occluders.push(o);
  }
  /** Whether the figure (or a hidden ancestor) hides a label's anchor from the camera right now. */
  function anchorHidden(m, anchor) {
    for (let o = anchor; o && o !== m.figure.root; o = o.parent) if (!o.visible) return true;
    anchor.getWorldPosition(_seekDir);
    stage.camera.getWorldPosition(_seekEye);
    _seekDir.sub(_seekEye);
    const dist = _seekDir.length();
    if (dist < 1e-6) return false;
    _seekRay.set(_seekEye, _seekDir.multiplyScalar(1 / dist));
    _seekRay.near = 0;
    _seekRay.far = Math.max(0, dist - Math.max(1e-4, host.figureRadius() * 0.025)); // the host's tolerance
    _seekRay.camera = stage.camera;
    _occluders.length = 0;
    m.figure.root.traverseVisible(addOccluder);
    _seekHits.length = 0;
    _seekRay.intersectObjects(_occluders, false, _seekHits);
    const hidden = _seekHits.length > 0;
    _seekHits.length = 0;
    _occluders.length = 0;
    return hidden;
  }
  /** Pose the figures at loop time t (dt = 0: no clock, fold, turntable or explode step). */
  function poseAt(t) {
    host.setTime(t);
    host.update(0);
  }
  function seekInView(label) {
    const m = host.active;
    if (!m?.anchor.visible || host.playing || !m.figure.labels?.includes(label)) return;
    // A mirrored pair (label.alt: the far eye, pit or nostril) is labelled on
    // the side the host picked for the camera, and keeps it through small
    // turns: that one must come into view, not the far one.
    const anchor = host.labelAnchor?.(label) ?? label.anchor;
    // Asked of the pose on screen, never of the host's occlusion cache: the
    // host stops re-testing a label once a construction stage hides its
    // anchor, so a 'false' left over from an earlier moment of the loop
    // would claim a part is in view while it is not drawn at all.
    if (!anchorHidden(m, anchor)) return; // in view already
    const t0 = host.time;
    const start = performance.now();
    let found = -1;
    let dir = 0;
    for (let k = 1; found < 0 && k * SEEK_STEP <= FIGURE_DURATION / 2 + 1e-6; k++) {
      for (const s of SEEK_DIRS) {
        poseAt(t0 + s * k * SEEK_STEP);
        if (!anchorHidden(m, anchor)) {
          found = host.time;
          dir = s;
          break;
        }
      }
      if (found < 0 && performance.now() - start > SEEK_BUDGET_MS) break;
    }
    if (found < 0) {
      poseAt(t0); // nowhere in view within the budget: leave the moment as it was
      return;
    }
    let t = found;
    for (let j = 1; j * SEEK_STEP <= SEEK_INTO + 1e-6; j++) {
      poseAt(found + dir * j * SEEK_STEP);
      if (anchorHidden(m, anchor)) break;
      t = host.time;
    }
    poseAt(t);
  }
  function seekLater(label) {
    seekLabel = label;
    seekLeaf = book.opened;
    seekUntil = performance.now() + 1200;
    _camLast.copy(stage.camera.position);
  }
  /** Each frame: a deferred seek runs once the camera has stopped (or after 1.2 s), on the same spread. */
  function seekPending() {
    if (!seekLabel) return;
    if (book.opened !== seekLeaf || book.busy || host.playing) {
      seekLabel = null;
      return;
    }
    const still = stage.camera.position.distanceToSquared(_camLast) < 1e-8;
    _camLast.copy(stage.camera.position);
    if (!still && performance.now() < seekUntil) return;
    const label = seekLabel;
    seekLabel = null;
    seekInView(label);
  }

  // ---------------------------------------------------------------- inspect
  // Frame the figure over its whole loop (world space: fitted, folded and
  // turned as it is drawn) from the inspect angle, as close as it fits inside
  // the view left free by the toolbar and caption (and the top bar where it
  // spans the book): the whole loop stays in view, and the tight hull below
  // brings it 1.2–2.2× closer than the page view on a phone (the least for
  // a strike that already spans the page), more on wider screens. (A sphere
  // around the fit box's half-diagonal landed at the book view's distance on
  // landscape and farther than it on every phone; capping the distance
  // instead cut a strike or a raised head off at the screen's edge.)
  //
  // The fit box is the wrong thing to frame: it is the rest pose, and a
  // strike or an explode loop reaches past it (the snakes even fit only part
  // of the strike, so the plate stays large); and one box's corners, seen
  // close up in perspective, stick out far past a rounded skull. So the
  // figure is posed at LOOP_SAMPLES moments (poses are pure functions of t)
  // once per figure, layer set, explode level and view, and each visible
  // solid mesh adds a few points per moment, in the figure root's space
  // (nothing, when it has not moved since the last moment): its extreme
  // vertices along 13 fixed axes and along the inspect camera's own — a
  // rounded bone's own silhouette, not its box (rigid geometry keeps them;
  // one deformed on the CPU, a swept snake body, is scanned at every
  // moment) — or, instanced, its box corners. These points are the hull the
  // camera frames: the loop's silhouette comes within a few px of the
  // framed window on every plate.
  const LOOP_SAMPLES = 24;
  /** Support axes, both ways: the coordinate axes and their diagonals… */
  const KDOP = new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, -1, 0, 1, 0, 1, 1, 0, -1, 0, 1, 1, 0, 1, -1, 1, 1, 1, 1, 1, -1, 1, -1, 1, -1, 1, 1]);
  const NK = KDOP.length / 3;
  /**
   * …and the inspect camera's own: right, up, and both tilted towards the
   * camera by VIEW_TILT (in perspective a nearer point of the same width
   * lands farther out). A long coil's extreme seen at an angle between two
   * fixed axes was off by 33 px; along the view's axes it is exact.
   */
  const VIEW_TILT = 0.35;
  const VIEW_MIX = [[1, 0, 0], [0, 1, 0], [1, 0, VIEW_TILT], [1, 0, -VIEW_TILT], [0, 1, VIEW_TILT], [0, 1, -VIEW_TILT]]; // × right, up, back
  const NV = VIEW_MIX.length;
  const supports = new WeakMap(); // rigid geometry → { fixed, view, axes }: extremes along KDOP and the last view axes
  const _viewRoot = new Float64Array(NV * 3); // the view axes in the figure root's space (one hull build)
  const _viewLocal = new Float64Array(NV * 3); // … in one mesh's own space
  const _liveFixed = new Float32Array(NK * 6); // a deforming geometry's extremes, this moment
  const _liveView = new Float32Array(NV * 6);
  const _exLo = new Float64Array(NK);
  const _exHi = new Float64Array(NK);
  const _exILo = new Uint32Array(NK);
  const _exIHi = new Uint32Array(NK);
  const loopHulls = new WeakMap(); // mount → { key, box, pts (root space xyz), n }
  const _lbInv = new THREE.Matrix4();
  const _lbM = new THREE.Matrix4();
  const _lbP = new THREE.Vector3();
  const _lbC = new Float32Array((NK + NV) * 6);
  let _lbN = 0;
  let _lbParts = null; // mesh → point list over the loop (while one hull is built)
  /** Extreme vertices of a position attribute along `n` axes (flat xyz), both ways, into `out` (xyz pairs). */
  function extremes(p, axes, n, out) {
    _exLo.fill(Infinity);
    _exHi.fill(-Infinity);
    // one pass over the vertices (a sculpted skull bone has tens of thousands)
    const flat = !p.isInterleavedBufferAttribute && p.itemSize === 3 && !p.normalized;
    const a = p.array;
    for (let i = 0; i < p.count; i++) {
      const x = flat ? a[i * 3] : p.getX(i);
      const y = flat ? a[i * 3 + 1] : p.getY(i);
      const z = flat ? a[i * 3 + 2] : p.getZ(i);
      for (let d = 0; d < n; d++) {
        const v = axes[d * 3] * x + axes[d * 3 + 1] * y + axes[d * 3 + 2] * z;
        if (v < _exLo[d]) (_exLo[d] = v), (_exILo[d] = i);
        if (v > _exHi[d]) (_exHi[d] = v), (_exIHi[d] = i);
      }
    }
    for (let d = 0; d < n; d++) {
      out[d * 6] = p.getX(_exILo[d]);
      out[d * 6 + 1] = p.getY(_exILo[d]);
      out[d * 6 + 2] = p.getZ(_exILo[d]);
      out[d * 6 + 3] = p.getX(_exIHi[d]);
      out[d * 6 + 4] = p.getY(_exIHi[d]);
      out[d * 6 + 5] = p.getZ(_exIHi[d]);
    }
    return out;
  }
  /**
   * A mesh's extreme vertices along KDOP and the view axes (_viewLocal).
   * Rigid geometry keeps them: the fixed ones once, the view ones until the
   * part turns against the camera (a mandible opening); a geometry deformed
   * on the CPU (DynamicDrawUsage: a swept body) is scanned at every moment.
   */
  function supportOf(geo) {
    const p = geo.attributes.position;
    if (p.usage === THREE.DynamicDrawUsage) {
      extremes(p, KDOP, NK, _liveFixed);
      extremes(p, _viewLocal, NV, _liveView);
      return { fixed: _liveFixed, view: _liveView };
    }
    let s = supports.get(geo);
    if (!s) supports.set(geo, (s = { fixed: extremes(p, KDOP, NK, new Float32Array(NK * 6)), view: new Float32Array(NV * 6), axes: new Float64Array(NV * 3).fill(NaN) }));
    let same = true;
    for (let i = 0; same && i < NV * 3; i++) same = Math.abs(s.axes[i] - _viewLocal[i]) < 1e-5;
    if (!same) {
      extremes(p, _viewLocal, NV, s.view);
      s.axes.set(_viewLocal);
    }
    return s;
  }
  function addToLoopHull(o) {
    if (!o.isMesh || o.userData.isOutline || o.userData.isInkLine || o.userData.noFit || o.isLine2 || o.isLineSegments2) return;
    if (Array.isArray(o.material) ? o.material.every(isGhost) : isGhost(o.material)) return;
    const pos = o.geometry?.attributes?.position;
    if (!pos?.count) return;
    _lbN = 0;
    const e = _lbM.multiplyMatrices(_lbInv, o.matrixWorld).elements;
    if (o.isInstancedMesh) {
      o.computeBoundingBox(); // instances move with the pose (ribs, scales)
      const gb = o.boundingBox;
      if (!gb || gb.isEmpty()) return;
      for (let k = 0; k < 8; k++) put(k & 1 ? gb.max.x : gb.min.x, k & 2 ? gb.max.y : gb.min.y, k & 4 ? gb.max.z : gb.min.z);
    } else {
      // the view axes in the mesh's own space: (part → root)ᵀ · axis
      for (let d = 0; d < NV; d++) {
        const x = _viewRoot[d * 3], y = _viewRoot[d * 3 + 1], z = _viewRoot[d * 3 + 2];
        _viewLocal[d * 3] = e[0] * x + e[1] * y + e[2] * z;
        _viewLocal[d * 3 + 1] = e[4] * x + e[5] * y + e[6] * z;
        _viewLocal[d * 3 + 2] = e[8] * x + e[9] * y + e[10] * z;
      }
      const s = supportOf(o.geometry);
      for (let i = 0; i < s.fixed.length; i += 3) put(s.fixed[i], s.fixed[i + 1], s.fixed[i + 2]);
      for (let i = 0; i < s.view.length; i += 3) put(s.view[i], s.view[i + 1], s.view[i + 2]);
    }
    const n = _lbN;
    let list = _lbParts.get(o);
    if (!list) _lbParts.set(o, (list = []));
    // a part that has not moved since the last moment adds nothing
    let same = list.length >= n;
    for (let i = 0; same && i < n; i++) same = list[list.length - n + i] === _lbC[i];
    if (!same) for (let i = 0; i < n; i++) list.push(_lbC[i]);
  }
  /** One local point of the mesh being added (_lbM: mesh → root) into _lbC. */
  function put(x, y, z) {
    _lbP.set(x, y, z).applyMatrix4(_lbM);
    _lbC[_lbN++] = _lbP.x;
    _lbC[_lbN++] = _lbP.y;
    _lbC[_lbN++] = _lbP.z;
  }
  /**
   * The figure's hull over the loop, for the view whose axes (world space)
   * are _right, _up and _back: built once per figure, layer set, explode
   * level and view (the turntable turns the view against the figure).
   */
  function loopHull(m) {
    const root = m.figure.root;
    root.updateWorldMatrix(true, false);
    // world → root-space axes: (root)ᵀ · axis, like any support direction
    const r = root.matrixWorld.elements;
    let key = `${Math.round(m.explode * 100)}|${JSON.stringify(m.layers)}`;
    for (let d = 0; d < NV; d++) {
      const [kr, ku, kb] = VIEW_MIX[d];
      const x = kr * _right.x + ku * _up.x + kb * _back.x;
      const y = kr * _right.y + ku * _up.y + kb * _back.y;
      const z = kr * _right.z + ku * _up.z + kb * _back.z;
      _viewRoot[d * 3] = r[0] * x + r[1] * y + r[2] * z;
      _viewRoot[d * 3 + 1] = r[4] * x + r[5] * y + r[6] * z;
      _viewRoot[d * 3 + 2] = r[8] * x + r[9] * y + r[10] * z;
    }
    const scale = Math.hypot(_viewRoot[0], _viewRoot[1], _viewRoot[2]) || 1;
    for (let i = 0; i < NV * 3; i++) key += `|${Math.round((_viewRoot[i] / scale) * 1000)}`;
    const cached = loopHulls.get(m);
    if (cached?.key === key) return cached;
    _lbParts = new Map();
    const t0 = host.time;
    for (let i = 0; i < LOOP_SAMPLES; i++) {
      poseAt((i * FIGURE_DURATION) / LOOP_SAMPLES);
      _lbInv.copy(root.matrixWorld).invert();
      root.traverseVisible(addToLoopHull);
    }
    poseAt(t0);
    let len = 0;
    for (const list of _lbParts.values()) len += list.length;
    let pts;
    if (len) {
      pts = new Float32Array(len);
      let o = 0;
      for (const list of _lbParts.values()) {
        pts.set(list, o);
        o += list.length;
      }
    } else {
      // nothing solid on show: the plate's fit box
      const b = m.box;
      pts = new Float32Array(24);
      for (let k = 0; k < 8; k++) pts.set([k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z], k * 3);
    }
    _lbParts = null;
    const box = new THREE.Box3().setFromArray(pts);
    const hull = { key, box, pts, n: pts.length / 3 };
    loopHulls.set(m, hull);
    return hull;
  }
  let _hullW = new Float32Array(0); // the hull in world space (grown, reused)
  let _hullN = 0;
  // the hull along the inspect camera's right, up and back axes (fixed for one elevation and azimuth)
  let _hr = new Float32Array(0);
  let _hu = new Float32Array(0);
  let _hb = new Float32Array(0);
  const _center = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const _back = new THREE.Vector3();
  const _ext = { x0: 0, x1: 0, y0: 0, y1: 0, inFront: true };
  const _win = { x: 0, y0: 0, y1: 0 };
  const _inspect = { target: new THREE.Vector3(), distance: 1 };
  /**
   * NDC extent of the hull seen from `dist` away along the camera's back axis
   * from `tgt` (the rig's lookAt camera: a symmetric frustum, so x / (−z·tan),
   * per point, with the axes' dot products taken once per solve).
   */
  function projectHull(tgt, dist, th, aspect, near) {
    const tr = tgt.dot(_right);
    const tu = tgt.dot(_up);
    const tb = tgt.dot(_back);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    let inFront = true;
    for (let i = 0; i < _hullN; i++) {
      const z = _hb[i] - tb - dist; // view space: the camera looks down −z
      if (z > -near) {
        inFront = false;
        continue;
      }
      const k = -1 / (z * th);
      const nx = ((_hr[i] - tr) * k) / aspect;
      const ny = (_hu[i] - tu) * k;
      if (nx < x0) x0 = nx;
      if (nx > x1) x1 = nx;
      if (ny < y0) y0 = ny;
      if (ny > y1) y1 = ny;
    }
    _ext.x0 = x0;
    _ext.x1 = x1;
    _ext.y0 = y0;
    _ext.y1 = y1;
    _ext.inFront = inFront;
  }
  /** The inspect camera's world axes for (el, az): the rig places it at target + back · distance, looking at the target (up = +Y). */
  function viewAxes(el, az) {
    _back.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    _right.set(Math.cos(az), 0, -Math.sin(az));
    _up.crossVectors(_back, _right);
  }
  /** Target and distance that fit the world hull inside the NDC window _win, seen along viewAxes(). */
  function solveInspect() {
    const cam = stage.camera;
    const th = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    const aspect = cam.aspect;
    if (_hr.length < _hullN) {
      _hr = new Float32Array(_hullN);
      _hu = new Float32Array(_hullN);
      _hb = new Float32Array(_hullN);
    }
    for (let i = 0; i < _hullN; i++) {
      const x = _hullW[i * 3], y = _hullW[i * 3 + 1], z = _hullW[i * 3 + 2];
      _hr[i] = x * _right.x + y * _right.y + z * _right.z;
      _hu[i] = x * _up.x + y * _up.y + z * _up.z;
      _hb[i] = x * _back.x + y * _back.y + z * _back.z;
    }
    const yMid = (_win.y0 + _win.y1) / 2;
    const yHalf = (_win.y1 - _win.y0) / 2;
    const tgt = _inspect.target.copy(_center);
    let dist = 1;
    for (let iter = 0; iter < 3; iter++) {
      let lo = 0.05;
      let hi = 40;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        projectHull(tgt, mid, th, aspect, cam.near);
        if (_ext.inFront && (_ext.x1 - _ext.x0) / 2 <= _win.x && (_ext.y1 - _ext.y0) / 2 <= yHalf) hi = mid;
        else lo = mid;
      }
      dist = hi;
      // re-centre the hull in the window at that distance (like the book fit)
      projectHull(tgt, dist, th, aspect, cam.near);
      tgt.addScaledVector(_right, ((_ext.x0 + _ext.x1) / 2) * dist * th * aspect);
      tgt.addScaledVector(_up, ((_ext.y0 + _ext.y1) / 2 - yMid) * dist * th);
    }
    _inspect.distance = dist;
    return _inspect;
  }
  function toggleInspect() {
    if (stage.rig.mode === 'inspect') return exitInspect();
    const m = host.active;
    if (!m?.figure || !m.box || !m.anchor.visible) return;
    headLabel = null;
    // a narrow portrait screen looks face-on: a 3/4 turn widens a spray or a coil by a third
    const azimuth = stage.rig.isPortrait ? 0 : INSPECT_AZIMUTH;
    viewAxes(INSPECT_ELEVATION, azimuth);
    const hull = loopHull(m);
    const root = m.figure.root;
    root.updateWorldMatrix(true, false);
    if (_hullW.length < hull.n * 3) _hullW = new Float32Array(hull.n * 3);
    _hullN = hull.n;
    const e = root.matrixWorld.elements;
    for (let i = 0; i < hull.n * 3; i += 3) {
      const x = hull.pts[i], y = hull.pts[i + 1], z = hull.pts[i + 2];
      _hullW[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
      _hullW[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      _hullW[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
    }
    hull.box.getCenter(_center).applyMatrix4(root.matrixWorld);
    const h = Math.max(1, renderer.domElement.clientHeight);
    const top = topReservePx();
    _win.x = INSPECT_FILL;
    _win.y0 = -1 + Math.max(0.06, (2 * (chromeReservePx() + 8)) / h);
    _win.y1 = 1 - Math.max(0.06, (2 * top) / h);
    const fit = solveInspect();
    stage.rig.inspect(fit.target, fit.distance, { elevation: INSPECT_ELEVATION, azimuth });
  }
  function exitInspect() {
    headLabel = null;
    if (stage.rig.mode === 'inspect') stage.rig.exitInspect();
  }

  // ---------------------------------------------------------------- the head up close (phones)
  // On a phone the whole-loop inspect leaves a snake's face 10–40 px wide,
  // so a tap on a head label, or on its look-closer note, frames the head
  // itself: rig.inspectSphere(head centre, half the head's length ×
  // HEAD_INSPECT_SCALE), seen from the side the labelled feature faces, a
  // little from above, or from the nearest direction no coil or prey blocks.
  // The camera then follows the head through the loop (a strike carries it
  // across the page) until the reader leaves inspect. The head is the region
  // the label belongs to, from the figure through the host
  // (host.regionSphere, as posed now: the camera follows its centre). The
  // distance is set once, from the head's length at rest (label.headSize):
  // the region's sphere grows while the jaw gapes, and a tap mid-strike
  // would frame an open mouth that closes a moment later.
  const headSphere = new THREE.Sphere();
  const _hv = new THREE.Vector3();
  const _hc = new THREE.Vector3();
  /** The snake head a label's anchor hangs in (snakes/head.js names its group 'head'), else null: its axes and heading. */
  function headObjectOf(label, root) {
    let head = null;
    for (let o = label.anchor; o && o !== root; o = o.parent) if (o.name === 'head') head = o;
    return head;
  }
  /** World sphere of the region a label points into (a face label's head) as posed now, in `target`; null for any other label. */
  function headSphereOf(m, label, target) {
    return host.regionSphere?.(label.id, target, m.leafIndex) ?? null;
  }
  /** The radius a head close-up frames (world units): half the head's length at rest, else the region's radius now. */
  function headRestRadius(m, label) {
    return label.headSize > 0 ? (label.headSize / 2) * m.figure.root.matrixWorld.getMaxScaleOnAxis() : headSphere.radius;
  }
  /** Phones: frame the head a label points into (no-op for any other label). */
  function inspectHead(id) {
    const m = host.active;
    const label = m?.figure?.labels?.find((l) => l.id === id);
    if (!label?.anchor || !m.anchor.visible || !headSphereOf(m, label, headSphere)) return false;
    // the side the feature faces (of a mirrored pair, the one towards the camera)
    let anchor = label.anchor;
    stage.camera.getWorldPosition(_hc).sub(headSphere.center);
    if (label.alt) {
      const d = (o) => o.getWorldPosition(_hv).sub(headSphere.center).dot(_hc);
      if (d(label.alt) > d(anchor)) anchor = label.alt;
    }
    anchor.getWorldPosition(_hv).sub(headSphere.center);
    if (_hv.x * _hv.x + _hv.z * _hv.z < 1e-10) _hv.copy(_hc); // a feature on the crown: from where the camera is
    const radius = headRestRadius(m, label) * HEAD_INSPECT_SCALE;
    const view = headView(m, anchor, Math.atan2(_hv.x, _hv.z), stage.rig.distanceToFit(radius));
    stage.rig.inspectSphere(headSphere.center, radius, view);
    headLabel = id;
    headHeading = null;
    return true;
  }
  /**
   * Where the head close-up looks from: the feature's side seen a little
   * from above, unless the figure's own body (a coil, the prey) would stand
   * between the camera and the face — then the nearest clear direction,
   * turning round the head and rising above it (a few rays, once per tap).
   * @returns {{ elevation: number, azimuth: number }}
   */
  const HEAD_VIEWS = [[0, 0], [35, 0], [-35, 0], [0, 18], [35, 18], [-35, 18], [70, 0], [-70, 0], [0, 36], [60, 36], [-60, 36], [0, 54]]; // [azimuth turn, extra elevation] (°)
  const _vRay = new THREE.Raycaster();
  const _vDir = new THREE.Vector3();
  const _vHits = [];
  /** Points of the face the close-up must see: the feature, the head's centre, its snout and back, crown and chin. */
  const _vPts = Array.from({ length: 6 }, () => new THREE.Vector3());
  function headView(m, anchor, azimuth, distance) {
    const head = headObjectOf({ anchor }, m.figure.root);
    _occluders.length = 0;
    collectBlockers(m.figure.root, head);
    anchor.getWorldPosition(_vPts[0]);
    _vPts[1].copy(headSphere.center);
    const r = headSphere.radius * 0.7;
    const e = (head ?? anchor).matrixWorld;
    for (let k = 0; k < 4; k++) {
      // along the head's own length (local x) and height (local y)
      _vDir.setFromMatrixColumn(e, k < 2 ? 0 : 1).normalize();
      _vPts[2 + k].copy(headSphere.center).addScaledVector(_vDir, k % 2 ? -r : r);
    }
    const D = THREE.MathUtils.degToRad;
    let best = null;
    let fewest = Infinity;
    for (const [turn, rise] of HEAD_VIEWS) {
      const el = HEAD_ELEVATION + D(rise);
      const az = azimuth + D(turn);
      _vDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
      // from the face outwards: a coil the camera would sit in or behind is hit on its outer side
      let hits = 0;
      for (const p of _vPts) {
        _vRay.set(p, _vDir);
        _vRay.near = 0;
        _vRay.far = distance;
        _vHits.length = 0;
        _vRay.intersectObjects(_occluders, false, _vHits);
        if (_vHits.length) hits++;
        if (hits >= fewest) break; // no better than one already found
      }
      if (hits < fewest) {
        fewest = hits;
        best = { elevation: el, azimuth: az };
      }
      if (!hits) break;
    }
    _vHits.length = 0;
    _occluders.length = 0;
    return best;
  }
  /** The figure's solid meshes (as label occlusion sees them) outside `skip` (the head itself). */
  function collectBlockers(o, skip) {
    if (o === skip || !o.visible) return;
    addOccluder(o);
    for (const c of o.children) collectBlockers(c, skip);
  }
  /**
   * Each frame while the head is up close, after the host posed the loop:
   * the camera moves with the head. A damped follow trails a striking or
   * slithering head by more than the close-up is wide, so the head's own
   * motion moves the rig's target as it is (the approach from the book view
   * stays damped) and the camera is placed again for this frame. The view
   * also turns as the head turns (its heading carries the azimuth round,
   * damped by the rig), so a slithering coral keeps its face to the camera;
   * an orbit of the reader's own adds to it.
   */
  const _hPrev = new THREE.Vector3();
  function followHead() {
    if (!headLabel) return;
    const m = host.active;
    const label = m?.figure?.labels?.find((l) => l.id === headLabel);
    _hPrev.copy(headSphere.center);
    if (stage.rig.mode !== 'inspect' || !label || !m.anchor.visible || !headSphereOf(m, label, headSphere)) {
      headLabel = null;
      return;
    }
    const rig = stage.rig;
    rig.target.add(_hv.subVectors(headSphere.center, _hPrev));
    rig.inspectState.target.copy(headSphere.center);
    const head = headObjectOf(label, m.figure.root);
    if (head) {
      _hv.setFromMatrixColumn(head.matrixWorld, 0); // the head's own +x: towards the snout
      const heading = Math.atan2(_hv.x, _hv.z);
      if (headHeading !== null) rig.inspectState.azimuth += Math.atan2(Math.sin(heading - headHeading), Math.cos(heading - headHeading));
      headHeading = heading;
    }
    rig.update(0); // no damping step: only the camera, placed for the head where it is now
  }

  /**
   * The edition an export prints, fixed when it is asked for: a language
   * switch while the plate is read back must not mix two editions in one
   * file (title and caption from one, key from the other) or in its name.
   */
  const exportEdition = () => ({ lang, manifest, plateBySpread });
  function figureTitle(plate, ed = exportEdition()) {
    if (!plate) return ed.manifest.title;
    return `${plate.common}${plate.scientific ? ` — ${plate.scientific}` : ''}`;
  }
  /** Labels the key lists although hidden right now: the look-closer notes', and the one the reader just asked for. */
  function keptLabels(plate) {
    const keep = (plate?.lookCloser ?? []).map((c) => c.label).filter(Boolean);
    if (focusLabel && performance.now() < focusLabelUntil && !keep.includes(focusLabel)) keep.push(focusLabel);
    return keep;
  }
  function exportSVG(mode, ed = exportEdition()) {
    const m = host.active;
    if (!m) return null;
    const plate = ed.plateBySpread.get(book.opened)?.plate;
    return exportFigureSVG({
      renderer,
      mount: m,
      camera: stage.camera,
      mode,
      width: 1600,
      title: figureTitle(plate, ed),
      caption: plate?.figure?.caption ?? '',
      // "Serpientes · Josoroma · Lámina Natural History Press": the book, its author and its imprint
      credit: [ed.manifest.title, ed.manifest.byline?.name, ed.manifest.author].filter(Boolean).join(' · '),
      labels: state.labels,
      keep: keptLabels(plate),
      lang: ed.lang,
    });
  }
  async function doExport(mode) {
    const ed = exportEdition();
    // mid-turn the pop-up is folded or hidden: export the plate it lands on
    await settle();
    if (disposed) return;
    const plate = ed.plateBySpread.get(book.opened)?.plate;
    const fileName = (kind) => exportFileName({ book: ed.manifest.id, plate: plate?.id ?? null, kind, lang: ed.lang });
    if (mode === 'png') {
      const blob = await exportPNG({ renderer, scene: stage.scene, camera: stage.camera, width: 2400 });
      downloadBlob(fileName('png'), blob);
      ui.toast?.(t('PNG saved'));
      return;
    }
    const kind = mode === 'svg-line' ? 'line' : 'color';
    const svg = await exportSVG(kind, ed);
    if (!svg) return ui.toast?.(t('No figure on this spread'));
    downloadText(fileName(kind), svg, 'image/svg+xml');
    ui.toast?.(kind === 'line' ? t('Line-art SVG saved — ready to colour') : t('Colour plate SVG saved'));
  }

  // ---------------------------------------------------------------- keyboard
  // The UI's SHORTCUTS table is the single source of truth (it also renders
  // the help card); a few extra reading keys are handled here: PageUp/Down,
  // Home/End, + − zoom, 0 reset, ↑ ↓ book tilt, I inspect, [ ] turn the figure, and while
  // inspecting ← → turn the figure and ↑ ↓ tilt the view (the same moves as
  // a horizontal / vertical drag there).
  const onKey = (e) => {
    if (!active || e.defaultPrevented) return; // + − 0 move the shared rig: not before activation
    const plain = !(e.metaKey || e.ctrlKey || e.altKey);
    const inControl = e.target?.closest?.('input, textarea, select, [contenteditable], [role=radiogroup], .lam-pop, .lam-drawer, .lam-sheet');
    // the language switch moves its own choice with these (and says so with preventDefault)
    if (inControl?.getAttribute('role') === 'radiogroup' && RADIO_KEYS.has(e.key)) return;
    if (plain && !inControl && stage.rig.mode === 'inspect') {
      const turn = { ArrowLeft: -KEY_YAW, ArrowRight: KEY_YAW }[e.key];
      const tilt = { ArrowUp: KEY_TILT, ArrowDown: -KEY_TILT }[e.key];
      if (turn || tilt) {
        e.preventDefault();
        if (turn) host.rotateActive(turn);
        else stage.rig.orbit(0, tilt);
        return;
      }
    }
    if (ui.runShortcut?.(e)) {
      e.preventDefault();
      return;
    }
    if (!plain || inControl) return;
    const extra = {
      PageDown: 'next',
      PageUp: 'prev',
      Home: { type: 'goto', spread: 1 },
      End: { type: 'goto', spread: spreadCount - 2 },
    }[e.key];
    if (extra) {
      e.preventDefault();
      command(extra);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      stage.rig.setBookTilt(stage.rig.bookTilt + (e.key === 'ArrowUp' ? 0.1 : -0.1));
    } else if (e.key === '+' || e.key === '=') stage.rig.zoomBy(1.25);
    else if (e.key === '-' || e.key === '_') stage.rig.zoomBy(0.8);
    else if (e.key === '0') stage.rig.reset();
    else if (e.key === 'i' || e.key === 'I') toggleInspect();
    else if (e.key === '[' || e.key === ']') {
      e.preventDefault();
      host.rotateActive(e.key === ']' ? KEY_YAW : -KEY_YAW);
    }
  };
  addEventListener('keydown', onKey);

  // ---------------------------------------------------------------- spread sync
  const nameOf = (s) => {
    if (s?.layout === 'intro') return manifest.intro?.title ?? t(SPREAD_NAMES.intro);
    if (s?.layout === 'note') return manifest.back?.note?.title ?? t(SPREAD_NAMES.note);
    const key = SPREAD_NAMES[s?.layout];
    return key ? t(key) : undefined;
  };
  function spreadName(k) {
    const right = sides[k * 2];
    const left = sides[k * 2 - 1];
    if (stage.rig.isPortrait) {
      const n = nameOf(portraitSide === 'left' ? left : right);
      if (n) return n;
    }
    if (VERSO_FIRST.has(left?.layout)) return nameOf(left);
    return nameOf(right) ?? nameOf(left) ?? manifest.title;
  }
  /** #/<lang>/<book>?plate=N (or ?spread=K), in place: no new history entry, no hashchange. */
  function writeURL(spread) {
    if (!active) return;
    const p = plateBySpread.get(spread);
    replaceHash(bookHref(manifest.id, p ? { plate: p.index + 1 } : spread > 0 ? { spread } : {}, lang));
  }
  /**
   * The spread's printed text for the reading sheet and screen readers,
   * verso first (reading order) — but a portrait screen framing the recto
   * reads it first: the sheet then opens on the page on screen.
   */
  function readingHTML(k) {
    const verso = sideHTML(sides[k * 2 - 1]);
    const recto = sideHTML(sides[k * 2]);
    return stage.rig.isPortrait && portraitSide === 'right' && recto ? recto + verso : verso + recto;
  }
  /**
   * Whether a layer's switch shows as on: its own state, or drawn although
   * switched off (a dissection shows the bones and the venom apparatus;
   * figure.layerShown). A skin the dissection x-rays keeps its switch's state.
   */
  const layerOn = (m, id) => m.layers[id] !== false || m.figure?.layerShown?.(id) === true;
  /** What layerOn() reads for the figure on screen, as a key (syncUI when the dissection changes it). */
  function shownKey() {
    const m = host.get(book.opened);
    const fig = m?.figure;
    return fig?.layerShown ? (fig.layers ?? []).map((l) => (layerOn(m, l.id) ? 1 : 0)).join('') : '';
  }
  let lastShown = '';
  function syncUI() {
    if (disposed) return;
    const spread = book.opened;
    const p = plateBySpread.get(spread);
    const m = host.get(spread);
    const fig = m?.figure;
    const beats = p?.plate.animation?.beats ?? host.beats(spread);
    host.speed = recommendedPlaybackRate(beats, FIGURE_DURATION);
    syncNarration();
    lastShown = shownKey();
    ui.setSpread?.({
      index: spread,
      total: spreadCount,
      title: p ? p.plate.common : spreadName(spread),
      sci: p?.plate.scientific ?? '',
      number: p?.plate.number ?? '',
      kind: p?.plate.layout === 'lesson' ? 'Lesson' : 'Plate', // the English key (the UI translates it): aria labels, the sheet kicker, the export title
      hasFigure: !!fig,
      // figure strings stay English in the subjects: translated on their way to the screen
      layers: (fig?.layers ?? []).map((l) => ({ id: l.id, label: l.label ? t(l.label) : l.id, hint: l.hint ? t(l.hint) : '', visible: layerOn(m, l.id) })),
      labels: state.labels,
      explode: m?.explodeTarget ?? 0,
      playing: host.playing,
      beats,
      animationTitle: p?.plate.animation?.title ?? '',
      duration: FIGURE_DURATION,
      canPrev: book.canPrev(),
      canNext: book.canNext(),
    });
    if (spread !== lastSpread) {
      lastSpread = spread;
      frameSpread();
      // every printed text reaches the reading sheet and screen readers (whose
      // hidden copy's look-closer links are no tab stops: ui.setReading)
      ui.setReading?.(p ? plateHTML(p.plate, lang, p.index + 1) : readingHTML(spread));
      const name = spreadName(spread);
      // manifest titles carry their own punctuation ('Why So Many Snakes?')
      ui.announce?.(p ? plateAnnouncement(p.plate, p.index + 1, plates.length, lang) : /[.?!…]$/.test(name) ? name : `${name}.`);
      writeURL(spread);
    }
    reserveChrome();
  }
  const offs = [
    book.on('change', ({ opened, instant }) => {
      const how = instant || opened === gotoTarget ? 'jump' : opened === prevOpened + 1 ? 'forward' : 'back';
      const page = opened === gotoTarget ? gotoPage : null;
      gotoTarget = -1;
      gotoPage = null;
      prevOpened = opened;
      if (instant) {
        // a jump without animation (setOpened): nothing is in flight
        hold = -1;
        restSpread = opened;
      } else if (hold < 0 && Math.abs(opened - restSpread) > 1) {
        // turns (keys, swipes, drags) launched before the last one landed:
        // the spread they left stays until they have all landed
        hold = restSpread;
      }
      if (stage.rig.isPortrait) showPage(page ?? landingSide(opened, how));
      prefetch(opened, true);
      syncUI();
    }),
    book.on('turnstart', ({ leaf, riffle }) => {
      narrationSide = null;
      narration.setPage(null);
      // both faces of a turning leaf and what it uncovers must be printed
      for (const s of [leaf * 2, leaf * 2 + 1, leaf * 2 + 2, leaf * 2 - 1]) ensureSide(s, !riffle);
      ui.setBusy?.(true);
    }),
    book.on('turnend', () => {
      ui.setBusy?.(book.busy);
      if (!book.busy) {
        atRest();
        frameSpread();
      }
      syncUI();
    }),
  ];

  // ---------------------------------------------------------------- shader warm-up
  // A pop-up is first drawn mid-turn (opening > 0.68, ~530 ms in); building
  // its node graphs and pipelines in that frame froze the leaf (67–316 ms on
  // WebGPU, 0.5–5 s on WebGL). compileAsync builds them ahead, in the gap
  // after a frame is drawn, one object per frame while anything moves (its
  // scheduler.yield() continuations can otherwise starve rendering and pile
  // ~25 node builds into one 100 ms frame). Its scene walk is synchronous, so
  // forced visibility is restored right after each call; a released
  // (retain()) figure stops it.
  //
  // The figure a turn or a jump lands on goes first, then the next page's,
  // then the previous page's; neighbours wait while a leaf is in flight. A
  // pop-up on screen that is not warm yet (a riffle or a quick turn landed
  // before its job finished, a jump) is held folded and hidden instead of
  // freezing the page on its first draw: once the page has landed the rest of
  // its figure compiles a few objects per frame, and it pops up when its
  // pipelines are ready. (The figure on screen when the reader opens is
  // exempt: it is drawn as the loading veil lifts, as before.)
  //
  // compileAsync builds only what the page camera draws. The key light draws
  // each pop-up again into its shadow map, with programs of its own, and on
  // the WebGL fallback a program's first draw waits for the driver to link it
  // (0.2–0.8 s for a passion flower's or a béquer's shadow, again on every
  // visit). So there, once a figure's own programs are built, it gets one
  // shadow-only frame at rest: all of it moves to a layer only the shadow
  // camera sees, out of the shadow map's reach, and every program that frame
  // asks for links in parallel (KHR_parallel_shader_compile: nothing is drawn
  // until it has). Drawn by the real shadow pass, these are the very programs
  // its first frame on the page asks for; it is warm once they have linked.
  const warmedMounts = new WeakSet(); // compiled ahead (or drawn already): no stall on its first draw
  const warmJobs = []; // { m, objs, next, shadow: undefined | 'wanted' | 'linking' }
  let warmPumping = false;
  /** WebGL with parallel linking: the backend whose shadow programs are warmed too. */
  const linkBackend = renderer.backend?.isWebGLBackend && renderer.backend.parallel ? renderer.backend : null;
  const shadowLight = stage.key?.castShadow && stage.key.shadow?.camera ? stage.key : null;
  /** The shadow-only frame: a layer the page camera never draws, and how far below the book the figure goes (world units). */
  const SHADOW_ONLY_LAYER = 30;
  const OFF_MAP = 1e4;
  const afterFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  const noop = () => {};
  function warmFigure(leafIndex) {
    const m = host.get(leafIndex);
    if (!m?.figure || warmedMounts.has(m)) return;
    for (const j of warmJobs) if (j.m === m) return;
    const objs = [];
    m.anchor.traverse((o) => {
      if (o.isMesh || o.isLine || o.isPoints) objs.push(o);
    });
    warmJobs.push({ m, objs, next: 0 });
    pumpWarm();
  }
  /** Warm-up order: the page on screen (or landing), then the next page's, then the previous page's. */
  function warmRank(m) {
    const d = m.leafIndex - book.opened;
    return d === 0 ? 0 : d === 1 ? 1 : d === -1 ? 2 : 3 + Math.abs(d);
  }
  const compiling = (j) => j.next < j.objs.length;
  /** The job to compile now (warmRank); neighbours wait for leaves to land. */
  function nextWarmJob() {
    let job = null;
    let best = Infinity;
    for (let k = warmJobs.length - 1; k >= 0; k--) {
      const j = warmJobs[k];
      if (j.m.disposed) {
        warmJobs.splice(k, 1); // released: never touch its materials
        continue;
      }
      if (!compiling(j)) continue; // waiting for its shadow-only frame
      const rank = warmRank(j.m);
      if (rank > 0 && book.busy) continue;
      if (rank < best) {
        best = rank;
        job = j;
      }
    }
    return job;
  }
  const _forced = []; // objects shown for one synchronous compile walk, and what they were
  const _forcedFlags = [];
  /** compileAsync `root` with the objects in _forced shown and unculled for its synchronous walk. */
  function compileForced(root) {
    _forcedFlags.length = 0;
    for (const o of _forced) {
      _forcedFlags.push(o.visible, o.frustumCulled);
      o.visible = true; // parts the 5 s loop or a layer reveals later
      o.frustumCulled = false; // a covered figure is folded flat
    }
    try {
      return renderer.compileAsync(root, stage.camera, stage.scene);
    } catch (err) {
      console.warn('[reader] warm-up', err);
      return null;
    } finally {
      for (let i = 0; i < _forced.length; i++) {
        _forced[i].visible = _forcedFlags[i * 2];
        _forced[i].frustumCulled = _forcedFlags[i * 2 + 1];
      }
      _forced.length = 0;
    }
  }
  /** A compile that never settles (a lost device) must not hold a pop-up for good: its first draw finishes the job. */
  const WARM_WAIT_MS = 2500;
  /** Objects compiled per frame for a held pop-up (one per frame otherwise). */
  const WARM_HELD_BURST = 4;
  const _warmWait = [];
  const capWait = (p) => (p ? Promise.race([p.catch(noop), new Promise((r) => setTimeout(r, WARM_WAIT_MS))]) : null);
  async function pumpWarm() {
    if (warmPumping) return;
    warmPumping = true;
    try {
      while (!disposed && warmJobs.some(compiling)) {
        await afterFrame();
        if (disposed) break;
        const job = nextWarmJob();
        if (!job) continue; // neighbours only: wait for the leaves to land
        const m = job.m;
        // a held pop-up on a page at rest compiles a few objects per frame
        // (it pops up sooner; the page is still): its continuations stay
        // inside a frame, where one call for the whole figure ran 67 ms
        const burst = heldMount === m && !book.busy ? WARM_HELD_BURST : 1;
        _warmWait.length = 0;
        for (let k = 0; k < burst && job.next < job.objs.length; k++) {
          const o = job.objs[job.next++];
          _forced.push(o);
          const p = compileForced(o);
          if (p) _warmWait.push(p);
        }
        await capWait(_warmWait.length > 1 ? Promise.all(_warmWait) : _warmWait[0]);
        if (!compiling(job) && !m.disposed && !job.shadow) {
          // its own programs are built; on WebGL its shadow's wait for a shadow-only frame
          if (linkBackend && shadowLight) job.shadow = 'wanted';
          else finishWarm(job);
        }
      }
    } finally {
      warmPumping = false;
    }
  }
  function finishWarm(job) {
    const k = warmJobs.indexOf(job);
    if (k >= 0) warmJobs.splice(k, 1); // (activation may have dropped it meanwhile)
    if (!job.m.disposed) warmedMounts.add(job.m);
  }
  /**
   * The end of a frame at rest (boot draws the stage right after frame()):
   * the best-placed figure waiting for its shadow programs is drawn by this
   * frame's shadow pass alone, all of it shown (parts the loop or a layer
   * reveals later included), on SHADOW_ONLY_LAYER and OFF_MAP below the
   * book, so whatever is linked already draws nothing; every program it
   * asks for links in parallel. Everything is put back in a microtask, right
   * after the frame is drawn.
   */
  function shadowOnlyFrame() {
    if (!linkBackend || !shadowLight || !active || book.busy) return;
    let job = null;
    let best = Infinity;
    for (let k = warmJobs.length - 1; k >= 0; k--) {
      const j = warmJobs[k];
      if (j.m.disposed) {
        warmJobs.splice(k, 1);
        continue;
      }
      if (j.shadow !== 'wanted') continue;
      const rank = warmRank(j.m);
      if (rank < best) {
        best = rank;
        job = j;
      }
    }
    if (!job) return;
    // the book's figure guard is off for this frame (the figure may lie on a
    // covered page): no other pop-up may need it, which at rest means none
    // is up off the open spread (a covered one folds away in a few frames)
    for (const o of host.mounts.values()) if (o !== job.m && o.anchor.visible && o.leafIndex !== book.opened) return;
    job.shadow = 'linking';
    const { anchor } = job.m;
    const saved = [];
    anchor.traverse((o) => {
      saved.push(o, o.visible, o.layers.mask, o.frustumCulled);
      o.visible = true;
      o.layers.set(SHADOW_ONLY_LAYER);
      o.frustumCulled = false;
    });
    const y = anchor.position.y;
    anchor.position.y = y - OFF_MAP;
    // with a layer of its own besides the default, the shadow pass keeps its camera's layers
    const cam = shadowLight.shadow.camera;
    const mask = cam.layers.mask;
    cam.layers.enable(SHADOW_ONLY_LAYER);
    const guard = book.guardFigures;
    book.guardFigures = false; // a figure on a covered page
    const links = [];
    const own = Object.hasOwn(linkBackend, 'createRenderPipeline');
    const create = linkBackend.createRenderPipeline;
    linkBackend.createRenderPipeline = function (renderObject, promises) {
      return create.call(this, renderObject, promises ?? links);
    };
    queueMicrotask(() => {
      if (own) linkBackend.createRenderPipeline = create;
      else delete linkBackend.createRenderPipeline;
      book.guardFigures = guard;
      cam.layers.mask = mask;
      anchor.position.y = y;
      for (let i = 0; i < saved.length; i += 4) {
        const o = saved[i];
        o.visible = saved[i + 1];
        o.layers.mask = saved[i + 2];
        o.frustumCulled = saved[i + 3];
      }
      Promise.resolve(capWait(links.length ? Promise.all(links) : null)).then(() => {
        if (!disposed) finishWarm(job);
      });
    });
  }
  /**
   * After the host has posed this frame: the pop-up on screen that is not
   * warm yet stays folded and undrawn (its fold restarts from flat, so it
   * pops up once released). FigureHost has no hold of its own, so the
   * Reader overrides what update() decided, every frame until the job ends.
   */
  let heldMount = null;
  function holdUnwarmed() {
    const m = host.get(book.opened);
    heldMount = active && m?.figure && !warmedMounts.has(m) ? m : null;
    if (!heldMount) return;
    warmFigure(book.opened); // (no-op while its job is queued)
    m.anchor.visible = false;
    m.foldValue = 0;
    m.foldVel = 0;
  }
  host.on('mounted', ({ leafIndex }) => {
    frameSpread();
    syncUI();
    warmFigure(leafIndex);
  });
  host.on('layers', () => syncUI());

  // ---------------------------------------------------------------- initial state
  const plateParam = +params.get('plate');
  let initial = 1; // endpaper | title
  if (plateParam && plates[plateParam - 1]) initial = plates[plateParam - 1].spread;
  else if (params.has('spread')) initial = clampSpread(params.get('spread')) ?? 1;
  const startClosed = !params.has('plate') && !params.has('spread') && params.get('open') !== '1';
  book.setOpened(startClosed ? 0 : initial);
  prefetch(book.opened, true);
  if (startClosed) {
    // the cover lifts by itself after a beat, like opening a lid
    ensureSide(1, true);
    ensureSide(2, true);
    openTimer = setTimeout(() => {
      if (book.opened === 0 && !disposed) command('next');
    }, reducedMotion ? 150 : 900);
  }
  const t0 = +params.get('t');
  if (params.get('play') === '0' || params.has('t')) host.setPlaying(false);
  if (params.has('t') && Number.isFinite(t0)) host.setTime(t0);
  for (const m of host.mounts.values()) host.setLabels(state.labels, m.leafIndex);
  // superseded while the figures build: tear down now (toolbar, listeners, book)
  signal?.addEventListener('abort', dispose, { once: true });
  await Promise.all([...host.mounts.values()].map((m) => m.ready));
  if (signal?.aborted) {
    dispose();
    throw superseded();
  }
  const explodeParam = params.has('explode') ? +params.get('explode') : 0;
  const layerParam = params.get('layers');
  for (const m of host.mounts.values()) {
    if (!m.figure) continue;
    if (explodeParam) host.setExplode(explodeParam, m.leafIndex);
    if (layerParam) {
      for (const kv of layerParam.split(',')) {
        const [id, v] = kv.split(':');
        if (!m.figure.layers?.some((l) => l.id === id)) continue; // not a layer of this figure
        host.setLayer(id, v !== '0', m.leafIndex);
      }
      // the same rule as the layer switch: a snake without its skin shows its bones
      if (m.layers.skin === false) showUnderSkin(m, false);
    }
  }
  syncUI();

  // ---------------------------------------------------------------- frame
  const tmp = new THREE.Vector3();
  const corners = [0, 1, 2, 3].map((k) => new THREE.Vector3(k & 1 ? WORLD.pageW : 0, 0.03, k & 2 ? WORLD.pageH / 2 : -WORLD.pageH / 2));
  const area = { x: 0, y: 0, w: 0, h: 0, spine: null, avoid: null };
  /**
   * Screen rectangle the labels are laid out in: the recto, or the view
   * centre while inspecting (with the gutter, which pills keep right of).
   * Over the book, the figure page's printed text goes along (area.avoid):
   * label rows step over it instead of covering it.
   * @param {{x0:number,y0:number,x1:number,y1:number}|null} fig  figureRect()
   */
  function labelArea(w, h, fig) {
    if (stage.rig.mode === 'inspect') {
      // a head up close on a phone: the whole screen around it (the page is far out of focus)
      const m = headLabel ? 0.04 : 0.16;
      area.x = w * m;
      area.y = h * 0.08;
      area.w = w * (1 - 2 * m);
      area.h = h * 0.8;
      area.spine = headLabel ? null : gutterLine(w, h);
      area.avoid = null;
      return area;
    }
    area.spine = null;
    const r = projectRect(corners, w, h, _rect);
    area.x = Math.max(0, r[0]);
    area.y = Math.max(0, r[1]);
    area.w = Math.min(w, r[2]) - area.x;
    area.h = Math.min(h, r[3]) - area.y;
    area.avoid = plateBySpread.has(book.opened) ? printedRects(w, h) : null;
    return area;
  }
  /** Screen bounding box [x0, y0, x1, y1] (CSS px) of book-local points. */
  function projectRect(points, w, h, out) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of points) {
      tmp.copy(c);
      book.localToWorld(tmp);
      tmp.project(stage.camera);
      const x = (tmp.x * 0.5 + 0.5) * w;
      const y = (-tmp.y * 0.5 + 0.5) * h;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    out[0] = x0;
    out[1] = y0;
    out[2] = x1;
    out[3] = y1;
    return out;
  }
  // The recto figure page's printed bands (layouts/plate.js figurePage): its
  // head — running head and the "Plate N" kicker above the plate mark — and
  // its foot from the plate mark's lower edge (v = 0.8): caption, scale and
  // loop line, instruction and folio; each with the board's edge beyond the
  // page (book-local x from the gutter, z from head to tail).
  const PRINTED_BANDS = [
    [-WORLD.coverOverhang, 0.095 * WORLD.pageH],
    [0.8 * WORLD.pageH, WORLD.pageH + WORLD.coverOverhang],
  ].map(([v0, v1]) =>
    [0, 1, 2, 3].map((k) => new THREE.Vector3(k & 1 ? WORLD.pageW + WORLD.coverOverhang : 0, 0.03, -WORLD.pageH / 2 + (k & 2 ? v1 : v0)))
  );
  const _rect = [0, 0, 0, 0];
  const avoidRects = PRINTED_BANDS.map(() => [0, 0, 0, 0]);
  function printedRects(w, h) {
    PRINTED_BANDS.forEach((band, i) => projectRect(band, w, h, avoidRects[i]));
    return avoidRects;
  }
  // While inspecting, the verso's printed text can sit beside the figure: the
  // gutter (book-local x = 0, head to tail) goes to the UI as a screen
  // segment whenever it is in view, and each left-column pill stays right of
  // it at its own height (in the 3/4 view the gutter slants); a column with
  // no room there moves across to the right (ui/labels.js).
  const gutterEnds = [new THREE.Vector3(0, 0.03, -WORLD.pageH / 2), new THREE.Vector3(0, 0.03, WORLD.pageH / 2)];
  const spine = [0, 0, 0, 0];
  const _ga = new THREE.Vector3();
  const _gb = new THREE.Vector3();
  const _gx = new THREE.Vector3();
  /**
   * The gutter as [x0, y0, x1, y1] in CSS px, clipped to the camera's near
   * plane and to the view's height; null when it is out of view or when the
   * book is seen from its side or head (the verso is then not on the left).
   */
  function gutterLine(w, h) {
    const cam = stage.camera;
    _ga.setFromMatrixColumn(cam.matrixWorld, 0); // camera right
    _gx.setFromMatrixColumn(book.matrixWorld, 0).normalize(); // book +x: verso → recto
    if (_ga.dot(_gx) < 0.25) return null;
    book.localToWorld(_ga.copy(gutterEnds[0])).applyMatrix4(cam.matrixWorldInverse);
    book.localToWorld(_gb.copy(gutterEnds[1])).applyMatrix4(cam.matrixWorldInverse);
    const zn = -cam.near * 1.01;
    if (_ga.z > zn && _gb.z > zn) return null;
    if (_ga.z > zn) _ga.lerp(_gb, (_ga.z - zn) / (_ga.z - _gb.z));
    else if (_gb.z > zn) _gb.lerp(_ga, (_gb.z - zn) / (_gb.z - _ga.z));
    _ga.applyMatrix4(cam.projectionMatrix);
    _gb.applyMatrix4(cam.projectionMatrix);
    let x0 = (_ga.x * 0.5 + 0.5) * w, y0 = (-_ga.y * 0.5 + 0.5) * h;
    let x1 = (_gb.x * 0.5 + 0.5) * w, y1 = (-_gb.y * 0.5 + 0.5) * h;
    if ((y0 < 0 && y1 < 0) || (y0 > h && y1 > h)) return null;
    // keep the part pills can sit beside (the view's height): slide each end along the line
    const dy = y1 - y0;
    if (Math.abs(dy) > 1e-6) {
      const k = (x1 - x0) / dy;
      const c0 = Math.min(h, Math.max(0, y0));
      const c1 = Math.min(h, Math.max(0, y1));
      x0 += k * (c0 - y0);
      x1 += k * (c1 - y1);
      y0 = c0;
      y1 = c1;
    }
    spine[0] = x0;
    spine[1] = y0;
    spine[2] = x1;
    spine[3] = y1;
    return spine;
  }
  const NO_LABELS = [];
  // The figure's screen rectangle (its loop box, projected): label pills keep
  // off it. A figure whose fit box is no outline of what it draws declares
  // the box its loop sweeps (figure.loopBounds, cm in the root's frame: a
  // skull's fit is biased towards the head of the page and leaves out the
  // jaw's opening and the bones' own explosion); else the fit box stands in.
  const figRect = { x0: 0, y0: 0, x1: 0, y1: 0 };
  const _fc = new THREE.Vector3();
  const loopBoxes = new WeakMap(); // figure → its loopBounds as a Box3
  function keepOutBox(m) {
    const lb = m.figure.loopBounds;
    if (!lb?.min || !lb.max) return m.box;
    let b = loopBoxes.get(m.figure);
    if (!b) loopBoxes.set(m.figure, (b = new THREE.Box3(new THREE.Vector3(...lb.min), new THREE.Vector3(...lb.max))));
    return b;
  }
  function figureRect(w, h) {
    const m = host.active;
    if (!m?.box || !m.anchor.visible) return null;
    const b = keepOutBox(m);
    const mw = m.figure.root.matrixWorld; // current: host.update ran this frame
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let k = 0; k < 8; k++) {
      _fc.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).applyMatrix4(mw).project(stage.camera);
      const x = (_fc.x * 0.5 + 0.5) * w;
      const y = (-_fc.y * 0.5 + 0.5) * h;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    figRect.x0 = Math.max(0, x0);
    figRect.y0 = Math.max(0, y0);
    figRect.x1 = Math.min(w, x1);
    figRect.y1 = Math.min(h, y1);
    return figRect.x1 > figRect.x0 && figRect.y1 > figRect.y0 ? figRect : null;
  }
  /**
   * The head's screen rectangle while it is up close (inspectHead): pills
   * keep off the face, not off the whole figure, which then fills the screen.
   * The head's sphere as posed this frame (followHead): its centre ± its
   * screen radius, along the camera's right axis (a gaping jaw widens it).
   */
  function headRect(w, h) {
    _hv.copy(headSphere.center).project(stage.camera);
    const cx = (_hv.x * 0.5 + 0.5) * w;
    const cy = (-_hv.y * 0.5 + 0.5) * h;
    _fc.setFromMatrixColumn(stage.camera.matrixWorld, 0).multiplyScalar(headSphere.radius).add(headSphere.center).project(stage.camera);
    const r = Math.hypot((_fc.x - _hv.x) * 0.5 * w, (_fc.y - _hv.y) * 0.5 * h);
    figRect.x0 = Math.max(0, cx - r);
    figRect.y0 = Math.max(0, cy - r);
    figRect.x1 = Math.min(w, cx + r);
    figRect.y1 = Math.min(h, cy + r);
    return figRect.x1 > figRect.x0 && figRect.y1 > figRect.y0 ? figRect : null;
  }
  // A plate shows at most a handful of labels: the focused one, those its
  // "Look closer" notes point at, those of a layer the reader switched on,
  // then the figure's own order. (Phones show fewer; the UI keeps the nearest.)
  // A label whose anchor is hidden behind the figure (or not raycast yet:
  // the host tests a few anchors per frame) is listed — drawn hollow — only
  // when the reader asked for it: focused, named in a look-closer note, or on
  // a layer they switched on. Otherwise an 'Occipital bone' pill would point
  // into a frontal skull's orbit. A shown label goes only once its anchor
  // has stayed behind for OCCLUDED_HIDE_MS (an orbit turning away) and
  // returns the moment it is in view again; one that comes back at once (a
  // tongue retracted for half a second) waits longer next time. Under the
  // cap a shown label keeps its slot against a waiting one of the same kind,
  // so a label coming back into view does not evict another. Labels then do
  // not blink with the loop.
  //
  // A face is its own, smaller cap: four leaders converging on a 29 px head
  // are clutter, not labels. A head under FACE_ONE_PX on screen (it.headPx,
  // the projected length of label.headSize, which marks a face label) keeps
  // one face label and one under FACE_TWO_PX two: the focused one, then
  // those of look-closer notes, then a layer the reader switched on, then
  // the eye. The rest come back when the head is larger (inspect, the phone
  // close-up, a zoom) or asked for.
  const FACE_ONE_PX = 40;
  const FACE_TWO_PX = 80;
  const ranked = [];
  let rankFigure;
  const rankOf = new Map();
  const lookIds = new Set();
  const offByDefault = new Set(); // layers a figure starts with hidden
  const occludedSince = new Map(); // label id → when its anchor went behind the figure (−1: in view)
  const goneAt = new Map(); // label id → when the occlusion took it away (−1: since back in view)
  const graceOf = new Map(); // label id → how long its anchor may stay behind (ms), once it has blinked
  const shownAt = new Map(); // label id → the last frame it was shown in
  let frameNo = 0;
  const SHOWN = 500; // rank bonus of a label shown last frame: below a look-closer note's 1000, above figure order
  const byRank = (a, b) => b._rank - a._rank;
  function capLabels(items, w, now) {
    const cap = w >= 1200 ? 10 : w >= 800 ? 8 : 6;
    const m = host.get(book.opened);
    const fig = m?.figure ?? null;
    if (rankFigure !== fig) {
      rankFigure = fig;
      rankOf.clear();
      lookIds.clear();
      offByDefault.clear();
      occludedSince.clear();
      goneAt.clear();
      graceOf.clear();
      shownAt.clear();
      for (const l of plateBySpread.get(book.opened)?.plate.lookCloser ?? []) if (l.label) lookIds.add(l.label);
      (fig?.labels ?? []).forEach((l, i) => rankOf.set(l.id, (lookIds.has(l.id) ? 1000 : 0) - i));
      for (const l of fig?.layers ?? []) if (l.visible === false) offByDefault.add(l.id);
    }
    ranked.length = 0;
    for (const it of items) {
      if (!it.visible) continue; // off-screen or behind the camera: takes no slot
      const on = !!it.layer && m?.layers[it.layer] === true && offByDefault.has(it.layer);
      const shown = shownAt.get(it.id) === frameNo - 1;
      let keep = true;
      if (!(it.occluded || !m?.occluded.has(it.label))) {
        occludedSince.set(it.id, -1);
        const gone = goneAt.get(it.id) ?? -1;
        if (gone >= 0) {
          goneAt.set(it.id, -1);
          if (now - gone < BLINK_MS) graceOf.set(it.id, Math.min(OCCLUDED_HIDE_MAX_MS, 2 * (graceOf.get(it.id) ?? OCCLUDED_HIDE_MS)));
        }
      } else if (!shown) keep = false; // not shown last frame: wait until it is in view
      else {
        const since = occludedSince.get(it.id) ?? -1;
        if (since < 0) occludedSince.set(it.id, now);
        else keep = now - since < (graceOf.get(it.id) ?? OCCLUDED_HIDE_MS);
      }
      if (!keep && !it.focus && !on && !lookIds.has(it.id)) {
        if (shown) goneAt.set(it.id, now);
        it.visible = false;
        continue;
      }
      it._rank = (it.focus ? 1e6 : 0) + (on ? 1e4 : 0) + (rankOf.get(it.id) ?? -999) + (shown ? SHOWN : 0);
      it.rank = it._rank; // the UI keeps the most important when a phone fits fewer
      ranked.push(it);
    }
    if (capFaces()) {
      let n = 0;
      for (const it of ranked) if (it.visible) ranked[n++] = it;
      ranked.length = n;
    }
    if (ranked.length > cap) {
      ranked.sort(byRank);
      for (let i = cap; i < ranked.length; i++) ranked[i].visible = false;
    }
    for (const it of ranked) if (it.visible) shownAt.set(it.id, frameNo);
  }
  const faces = [];
  const byFaceRank = (a, b) => b._face - a._face;
  /** The face cap (FACE_ONE_PX, FACE_TWO_PX) over this frame's ranked labels; true when it hid any. */
  function capFaces() {
    faces.length = 0;
    let headPx = NaN;
    for (const it of ranked) {
      if (!(it.label?.headSize > 0)) continue;
      faces.push(it);
      // the largest: the anchors of one head lie at slightly different depths
      if (Number.isFinite(it.headPx) && !(it.headPx <= headPx)) headPx = it.headPx;
    }
    const max = headPx < FACE_ONE_PX ? 1 : headPx < FACE_TWO_PX ? 2 : Infinity; // no headPx: no cap
    const over = faces.length > max;
    if (over) {
      // look-closer above a switched-on layer (the general rank has them the other way), the eye above the rest
      for (const it of faces) it._face = it._rank + (lookIds.has(it.id) ? 1e5 : 0) + (it.id === 'eye' ? 2e3 : 0);
      faces.sort(byFaceRank);
      for (let i = max; i < faces.length; i++) faces[i].visible = false;
    }
    faces.length = 0;
    return over;
  }
  let lastW = -1;
  let lastH = -1;
  let lastSingle = null;
  let lastBookTilt = -1;
  function frame(dt) {
    // print queued pages within a small time budget (keeps turns smooth); a
    // riffle queues the faces of every leaf it flips: print only those still
    // wanted (kept around the spread, or on a leaf still in the air). While a
    // leaf turns, the neighbours wait for it to land (a lesson page with its
    // construction drawings takes a whole frame to print).
    const t0 = performance.now();
    const busy = book.busy;
    // queued launches dropped without a landing (a drag that grabbed nothing): at rest all the same
    if (hold >= 0 && !busy) atRest();
    for (const i of queue) {
      const inFlight = book.leaves[i >> 1]?.phys === 'F';
      if (!inFlight && !pages.isKept(i)) {
        queue.delete(i);
        continue;
      }
      if (busy && !inFlight) continue;
      applySide(i);
      if (performance.now() - t0 > 6) break;
    }
    book.update(dt);
    host.update(dt);
    holdUnwarmed();
    seekPending();
    followHead();
    ui.setClock?.(host.time, FIGURE_DURATION, host.playing);
    // a dissection crossing half-way shows or hides layers whose switches did not move
    if (shownKey() !== lastShown) syncUI();
    const canvas = renderer.domElement;
    if (stage.rig.bookTilt !== lastBookTilt) {
      lastBookTilt = stage.rig.bookTilt;
      ui.setBookView?.({ amount: lastBookTilt });
      reserveChrome();
    }
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w !== lastW || h !== lastH) {
      lastW = w;
      lastH = h;
      reserveChrome();
    }
    // the UI offers "Read" whenever the camera frames a single page (the other page's text is off screen)
    const single = stage.rig.effectiveFocus !== 'spread';
    if (single !== lastSingle) {
      lastSingle = single;
      ui.setSinglePage?.(single);
    }
    const portrait = stage.rig.isPortrait;
    if (portrait !== wasPortrait) {
      // rotated: landscape shows the spread again; portrait starts on the recto
      wasPortrait = portrait;
      if (portraitSide !== 'right') {
        portraitSide = 'right';
        applyPage();
      }
      lastSpread = -1;
      syncUI();
    }
    let items = NO_LABELS;
    frameNo++; // labels shown before a frame without them (labels off, a turn) start afresh
    if (state.labels && !book.busy) {
      items = host.labelItems(stage.camera, w, h);
      const now = performance.now();
      for (const it of items) {
        // on screen and in front of the camera; occlusion is weighed in capLabels
        it.visible = it.inFront && Math.abs(it.ndc.x) < 1.05 && Math.abs(it.ndc.y) < 1.05;
        it.focus = focusLabel === it.id && now < focusLabelUntil;
      }
      capLabels(items, w, now);
    }
    // whenever a figure stands (labels or not: the layers popover keeps off it too)
    const fig = host.active?.figure && !book.busy ? (headLabel ? headRect(w, h) : figureRect(w, h)) : null;
    ui.renderLabels?.(items, labelArea(w, h, fig), fig);
    shadowOnlyFrame(); // last: it changes what this frame draws, not what the labels saw
  }

  // ---------------------------------------------------------------- language
  // A switch is prepared, then applied (boot's changeLang; design-i18n §1.5):
  //   prepareLang(next)  the edition and its fonts load, its pages are checked
  //                      against this book's leaves, and the pages on screen
  //                      are typeset ahead, one per frame (a page is a pure
  //                      function of its spec) — nothing visible changes;
  //   applyLang(next)    after setLang(next), one synchronous step: the new
  //                      specs; the pages on screen swapped for those printed
  //                      ahead (a page turned to meanwhile is typeset then);
  //                      the figures' words, the chrome, the reading text, the
  //                      title and the URL. Every other page is dropped, and
  //                      those kept around the spread are printed again, one
  //                      per idle moment (not in the render loop).
  // Mid-turn the pages on screen include every leaf in the air and the spread
  // the turn left. Marks: lamina:lang:start → :visible (swapped) → :all.
  let pendingLang = null; // { lang, manifest, sides, printed: Map<side, printed>, broken, expire }
  let prepareToken = 0;
  const reprint = new Set(); // kept sides waiting to be printed in the new edition
  let reprintHandle = 0;
  /** A prepared switch nobody applied (a newer request superseded it) lets its canvases go. */
  const PREPARED_TTL_MS = 5000;

  /** The sides on screen: the spread, the one a turn left, and each leaf in the air with what it uncovers. */
  function onScreen() {
    const out = new Set();
    const add = (s) => {
      if (s >= 0 && s < sides.length) out.add(s);
    };
    add(book.opened * 2 - 1);
    add(book.opened * 2);
    if (hold >= 0) {
      add(hold * 2 - 1);
      add(hold * 2);
    }
    for (const l of book.leaves) {
      if (l.phys !== 'F' || l.riffle) continue;
      for (let s = l.index * 2 - 1; s <= l.index * 2 + 2; s++) add(s);
    }
    return out;
  }
  function discardPending() {
    const job = pendingLang;
    if (!job) return;
    pendingLang = null;
    clearTimeout(job.expire);
    for (const p of job.printed.values()) pages.discard(p);
    job.printed.clear();
  }

  /** Load what a switch to `next` needs; nothing visible changes (boot's view contract). */
  async function prepareLang(next) {
    const token = ++prepareToken; // a newer request supersedes this one at its next step
    const current = () => token === prepareToken && !disposed;
    discardPending();
    if (disposed || next === lang) return; // the edition shown: applyLang re-applies the chrome only
    performance.mark('lamina:lang:prepare');
    let edition;
    try {
      edition = await loadEdition(manifest.id, next);
    } catch (err) {
      if (current() && err?.name === 'EditionLoadError') editionFailed = next;
      throw err; // boot commits nothing: the book stays in its language
    }
    if (!current()) return;
    await loadFonts(theme, { manifest: edition });
    if (!current()) return;
    const nextSides = sidesOf(edition);
    const job = { lang: next, manifest: edition, sides: nextSides, printed: new Map(), broken: structureDiffers(sides, nextSides), expire: 0 };
    pendingLang = job;
    job.expire = setTimeout(() => pendingLang === job && discardPending(), PREPARED_TTL_MS);
    if (job.broken) return; // applyLang throws, and boot builds the reader again in `next`
    for (const i of onScreen()) {
      if (job.printed.has(i)) continue;
      job.printed.set(i, pages.print(i, nextSides));
      await afterFrame(); // one page per frame: a cold Spanish page costs 10–20 ms
      if (!current() || pendingLang !== job) return;
    }
  }

  /**
   * Swap to the edition prepareLang(next) loaded, synchronously, after boot's
   * setLang(next). Throws when that edition cannot be swapped in place (not
   * prepared, or its pages do not fit this book): boot then builds the
   * reader again in `next`, at the spread the URL keeps.
   */
  function applyLang(next) {
    if (disposed) return;
    const job = pendingLang?.lang === next ? pendingLang : null;
    if (!job) {
      if (next === lang) return relocalizeChrome();
      throw new Error(`[reader] the "${next}" edition was not prepared`);
    }
    if (job.broken) {
      discardPending();
      console.error(`[reader] the "${next}" edition of ${manifest.id} does not fit its leaves: ${job.broken}`);
      throw new Error(`[reader] the "${next}" edition's pages do not match (${job.broken})`);
    }
    pendingLang = null;
    clearTimeout(job.expire);
    performance.mark('lamina:lang:start');
    lang = next;
    manifest = job.manifest;
    sides = job.sides;
    plates = platesOf(sides);
    plateBySpread = bySpread(plates);
    // pages: those on screen now are swapped at once (no blank frame: the old
    // texture is freed only after its leaf took the new one); every other
    // page goes, and those kept around the spread are printed again soon
    const shown = onScreen();
    const kept = pages.kept().filter((i) => !shown.has(i));
    pages.setSides(sides, shown);
    queue.clear();
    reprint.clear();
    for (const i of shown) {
      const { texture, old } = pages.refresh(i, job.printed.get(i) ?? null);
      job.printed.delete(i);
      if (texture) {
        book.setLeafTexture(i >> 1, faceOf(i), texture);
        applied.add(i);
      }
      pages.free(old);
    }
    for (const p of job.printed.values()) pages.discard(p);
    performance.mark('lamina:lang:visible');
    // the figures keep their mounts, poses and state: only their words change
    host.relocalize?.();
    for (const m of host.mounts.values()) host.setBeats?.(m.leafIndex, plateBySpread.get(m.leafIndex)?.plate.animation?.beats ?? null);
    relocalizeChrome();
    for (const i of kept) reprint.add(i);
    if (reprint.size) scheduleReprint();
    else performance.mark('lamina:lang:all');
  }

  /** The chrome in the language set now: UI strings, the contents, the spread's title and text, the announcement, title and URL. */
  function relocalizeChrome() {
    ui.setLang?.(lang, { libraryHref: libraryHref(lang) });
    ui.setBook?.(bookInfo());
    lastSpread = -1; // syncUI sends the title, kind, layers, beats, reading text and announcement again (and writes the URL)
    syncUI();
    reserveChrome(true); // the new words may wrap differently (the top pill, the caption)
    if (active) document.title = `${manifest.title} — Lámina`;
  }

  function scheduleReprint() {
    if (reprintHandle || disposed || !reprint.size) return;
    reprintHandle = onIdle(runReprint);
  }
  /** One idle moment: one kept side printed again (one page costs up to ~18 ms). */
  function runReprint() {
    reprintHandle = 0;
    if (disposed) return;
    for (const i of reprint) {
      reprint.delete(i);
      // not wanted any more, or printed meanwhile (a turn landed on it)
      if (!pages.isKept(i) || (applied.has(i) && pages.has(i))) continue;
      applySide(i);
      break;
    }
    if (reprint.size) scheduleReprint();
    else performance.mark('lamina:lang:all');
  }

  /**
   * Read the book in another language: boot switches the session (URL,
   * <html lang>, preference) and this reader; resolves once the pages on
   * screen show it (true), false when a newer request superseded it or what
   * it needs (its dictionaries, its edition) could not be loaded.
   */
  function requestSwitch(next) {
    return requestLang ? requestLang(next) : switchHere(next).then(() => true);
  }
  /** Without boot (a harness): the same steps boot's changeLang takes, minus the URL. */
  async function switchHere(next) {
    await loadLang(next);
    await prepareLang(next);
    setLang(next);
    applyLang(next);
  }

  // ---------------------------------------------------------------- automation
  /** Resolves when no leaf is turning and the visible pop-up stands (for capture scripts). */
  async function settle(ms = 0) {
    const until = performance.now() + 8000;
    const frameP = () => new Promise((r) => requestAnimationFrame(r));
    const pending = () => {
      const m = host.get(book.opened);
      return book.busy || (m?.figure && m.foldValue < 0.98);
    };
    while (!disposed && pending() && performance.now() < until) await frameP();
    if (ms) await new Promise((r) => setTimeout(r, ms));
  }
  const api = {
    // the edition shown: these change with a language switch
    get manifest() {
      return manifest;
    },
    get plates() {
      return plates;
    },
    get sides() {
      return sides;
    },
    get lang() {
      return lang;
    },
    book,
    host,
    ui,
    /** Read the book in another language (see requestSwitch). */
    setLang: requestSwitch,
    /** The first spread showing a side of `layout` ('note', 'glossary', 'making', …; `part`: 'prompt' | 'brief'), else null. */
    spreadOf(layout, part) {
      const s = sides.find((x) => x.layout === layout && (part == null || x.making?.part === part));
      return s ? s.spread : null;
    },
    /** Dictionary keys looked up in this language and not found (capture asserts none after a Spanish read-through). */
    i18nMissing: () => missingKeys(),
    /**
     * What composing this book's edition in `l` (default: the one shown)
     * found — fallback, missing, extra, lengths… (edition.js lastReport) — as
     * a copy, or null before that edition loaded: capture and QA assert a
     * complete Spanish edition with it.
     */
    editionReport(l = lang) {
      const r = lastReport(manifest.id, l);
      return r ? structuredClone(r) : null;
    },
    async goTo(spread) {
      const k = clampSpread(spread);
      if (k == null) return;
      exitInspect();
      hold = -1;
      book.setOpened(k);
      prefetch(book.opened, true);
      for (const s of [book.opened * 2, book.opened * 2 - 1]) ensureSide(s, true);
      syncUI();
      await Promise.all([...host.mounts.values()].map((m) => m.ready));
      for (const m of host.mounts.values()) host.setLabels(state.labels, m.leafIndex);
      syncUI();
      // resolve once the pop-up may stand: a jump holds a figure whose shaders are not built yet
      const shown = host.get(book.opened);
      const until = performance.now() + 4000;
      while (active && !disposed && shown?.figure && !shown.disposed && !warmedMounts.has(shown) && performance.now() < until) {
        await new Promise((r) => requestAnimationFrame(r));
      }
    },
    plate(n) {
      const p = plates[n - 1];
      return p ? api.goTo(p.spread) : Promise.resolve();
    },
    /** Turn to `?plate=N` / `?spread=K` (same-book hash changes). */
    navigate(q) {
      const n = +q.get('plate');
      if (n && plates[n - 1]) command({ type: 'goto', spread: plates[n - 1].spread });
      else if (q.has('spread')) command({ type: 'goto', spread: q.get('spread') });
    },
    next: () => command('next'),
    prev: () => command('prev'),
    /** Turn (animated) to a spread; `page` ('left' | 'right') is the one a portrait screen lands on. */
    turnTo: (spread, page) => command({ type: 'goto', spread, page }),
    settle,
    setTime: (t) => command({ type: 'time', t }),
    pause: () => command('pause'),
    play: () => command('play'),
    setLayer: (id, on) => command({ type: 'layer', id, on }),
    setExplode: (a) => command({ type: 'explode', amount: a }),
    setLabels: (on) => command({ type: 'labels', on }),
    narrate: () => command('narration'),
    stopNarration: () => narration.stop(),
    narrationInfo: () => ({ ...narration.state, page: narrationForLeftPage(sides, book.opened, lang) }),
    inspect: (on = true) => (on ? stage.rig.mode !== 'inspect' && toggleInspect() : exitInspect()),
    exportSVG: (mode = 'color') => exportSVG(mode),
    info() {
      const m = host.active;
      return {
        book: manifest.id,
        lang,
        opened: book.opened,
        leafCount,
        spreads: spreadCount,
        spreadName: plateBySpread.get(book.opened)?.plate.common ?? spreadName(book.opened),
        page: stage.rig.isPortrait ? portraitSide : 'spread',
        plates: plates.map((p) => ({ id: p.plate.id, number: p.plate.number, spread: p.spread, type: p.figure?.type })),
        active: m?.figure?.title ?? null,
        layers: m ? { ...m.layers } : null,
        labels: m?.figure?.labels?.map((l) => l.id) ?? [],
        time: host.time,
        playing: host.playing,
        playbackRate: host.speed,
        busy: book.busy,
        mode: stage.rig.mode,
        bookView: { amount: stage.rig.bookTilt, elevation: THREE.MathUtils.radToDeg(stage.rig.currentElevation), zoom: stage.rig.zoom },
      };
    },
  };

  /** Boot made this the current view: claim the title, the URL and the camera rig. */
  function activate() {
    if (disposed || active) return;
    active = true;
    input.setEnabled?.(true);
    // the figure on screen as the loading veil lifts is drawn (and compiled) at once, as before
    const shown = host.get(book.opened);
    if (shown?.figure) {
      warmedMounts.add(shown);
      const k = warmJobs.findIndex((j) => j.m === shown);
      if (k >= 0) warmJobs.splice(k, 1);
    }
    document.title = `${manifest.title} — Lámina`;
    wasPortrait = stage.rig.isPortrait;
    if (!wasPortrait) portraitSide = 'right';
    applyPage();
    reserveChrome(true);
    frameSpread();
    writeURL(book.opened);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    signal?.removeEventListener('abort', dispose);
    clearTimeout(openTimer);
    removeEventListener('keydown', onKey);
    removeEventListener('pointerdown', unlockAudio, { capture: true });
    removeEventListener('keydown', unlockAudio, { capture: true });
    ui.el?.removeEventListener('click', onLookLink);
    ui.el?.removeEventListener('click', onPill);
    offs.forEach((off) => off());
    warmJobs.length = 0;
    discardPending();
    if (reprintHandle) cancelIdle(reprintHandle);
    reprint.clear();
    offAudio();
    narration.dispose();
    audio.dispose?.();
    input.dispose?.();
    ui.destroy?.();
    host.dispose?.();
    pages.dispose();
    // the rig is shared: hand it back only if this reader owned it
    if (stage.rig.book === book) stage.setBook?.(null);
    if (active) {
      stage.rig.setInsets(null);
      stage.rig.focus = 'auto';
      stage.rig.reset();
    }
    active = false;
    book.removeFromParent();
    book.dispose?.();
    for (const t of Object.values(blanks)) t.dispose(); // frees every bind group first drawn on them
  }

  return {
    frame,
    dispose,
    activate,
    prepareLang,
    applyLang,
    api,
    book,
    host,
    ui,
    get manifest() {
      return manifest;
    },
  };
}

function pickPageWidth() {
  const px = Math.min(screen.width, innerWidth) * Math.min(devicePixelRatio || 1, 2) * 0.5;
  if (px > 1300) return 2048;
  if (px > 800) return 1536;
  return 1024;
}

/** A tiny solid-colour sRGB texture (owned by one reader, disposed with it). */
function solidTexture(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 4;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, 4, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.name = `reader-blank-${color}`;
  return t;
}
