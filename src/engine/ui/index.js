// Lámina UI — the quiet, premium HTML overlay around the 3D book.
//
// The book is the experience; the interface should be almost invisible
// until it is needed. This module builds that layer in plain DOM (no
// framework) and speaks to the App only through commands:
//
//   const ui = createUI({ root, book, onCommand });
//   ui.setSpread({...}); ui.setClock(t, 5, playing); ui.renderLabels(items, area, fig);
//
// It owns: the glass toolbar (contents, page turns, play/pause with a
// 5-second progress ring, plate label, layers/dissection, export, sound,
// full screen), the quiet top bar (library link, book title), the contents
// drawer, the beat caption, plate labels with leader lines, toasts, the
// keyboard-shortcut card, the reading sheet (phones, single-page views and
// short landscape screens) and an aria-live region.
// It never touches Three.js: positions arrive already projected to CSS px.
// The App reads back what the chrome needs from the camera: bottomReserve()
// (the toolbar + caption band to keep the book out of) and tells the UI what
// the camera shows: setSinglePage(on), and the figure's screen rectangle as
// renderLabels' third argument (labels and the layers popover keep off it).
//
// Keyboard policy: the UI binds only "?" (help) and Esc (closing its own
// overlays, before the App's reset-view). The App binds the rest, ideally by
// forwarding keydown events to ui.runShortcut(e) (see SHORTCUTS). Keys typed
// inside UI overlays never leak to the App.
//
// Language: every string the UI writes goes through t() (src/i18n) at the
// moment it is written; tables keep English keys marked with msg(). One
// localize() pass writes the static strings at creation and again in
// ui.setLang(lang), which also rebuilds whatever is open. Texts the App
// hands in (titles, layer names, beats, label texts, toasts, reading HTML)
// arrive already in the edition's language; `kind` is the English key
// 'Plate' | 'Lesson', translated here. The top bar carries the language
// switch (langswitch.js); choosing a language emits { type: 'lang', lang }.
import './ui.css';
import { t, tl, hasT, msg, getLang, isLang, isLoaded, LANGS, DEFAULT_LANG, dictionaryEntries, fmtNumber, fmtSeconds, fmtPercent } from '../../i18n/index.js';
import { h, s, clamp, isEditable, watchMedia, rovingFocus, focusables } from './dom.js';
import { icon } from './icons.js';
import { SHORTCUTS, SHORTCUT_GROUPS, matchShortcut, keyCap } from './shortcuts.js';
import { LabelOverlay, solveColumn } from './labels.js';
import { Popover } from './popover.js';
import { ContentsDrawer } from './drawer.js';
import { ReadingSheet } from './sheet.js';
import { sanitizeHTML } from './sanitize.js';
import { createLangSwitch } from './langswitch.js';

export { SHORTCUTS, SHORTCUT_GROUPS, matchShortcut, sanitizeHTML, solveColumn, createLangSwitch, keyCap };

/** Every command type the UI can emit through onCommand. */
export const UI_COMMANDS = Object.freeze([
  'next', 'prev', 'goto', 'play', 'pause', 'time', 'labels', 'layer', 'explode',
  'export', 'fullscreen', 'reset-view', 'sound', 'library', 'contents', 'lang',
]);

/**
 * Export menu entries (mode → copy; busy: what the live region says while it
 * runs). The copy is English (dictionary keys); the menu shows it through t().
 */
export const EXPORT_MODES = Object.freeze([
  { mode: 'svg-color', title: msg('SVG — colour plate'), hint: msg('Colour fills and ink lines, print-ready'), icon: 'swatch', key: 'S', busy: msg('Preparing the colour plate…') },
  { mode: 'svg-line', title: msg('SVG — line art'), hint: msg('Colouring page: outlines only'), icon: 'pencil', busy: msg('Preparing the line art…') },
  { mode: 'png', title: msg('PNG — current view'), hint: msg('The book as it lies now, without labels'), icon: 'image', busy: msg('Preparing the PNG…') },
]);

// Exports take about 0.2–2 s (ID passes, read-back, tracing) and hold the
// main thread for most of it, so no timer can reveal a busy state in time.
// The Export button (and its menu item) is marked busy at once, and CSS
// reveals its turning ring only after 300 ms (ui.css .lam-busy): compositor
// animations keep running while the main thread is blocked, and a quick
// export clears the mark before anything shows. The mark goes when the App
// reports the result with a toast, or the promise onCommand returned settles.
const EXPORT_SAY_MS = 300; // the live region says "Preparing…" only past this, like the ring
const EXPORT_GIVE_UP_MS = 30000; // a result that never arrives must not leave the ring turning

const RING_R = 14.25;
const RING_C = 2 * Math.PI * RING_R;
/**
 * Landscape viewports this short (CSS px) hide the beat caption and show Read
 * (see mqShort): every landscape phone, and desktop windows short enough that
 * the App's 18 % cap would put a caption on the book. Portrait phones keep it.
 */
const SHORT_MAX_H = 560;
/** Shortcuts that still work while focus is inside the layers popover (its key caps). */
const POPOVER_KEYS = new Set(['layer', 'explode', 'labels', 'export', 'contents', 'fullscreen']);
/**
 * The toolbar's plate label (number · name over the binomial) is as wide as
 * the book's longest numbered entry needs, between these widths (CSS px). It
 * is measured per book and language, never per spread, so turning a page
 * never moves the toolbar's buttons; the cap also leaves the rest of the bar
 * room on narrower screens (see fitPlateWidth).
 */
const PLATE_MIN_W = 200;
const PLATE_MAX_W = 360;
const PLATE_PAD = 18; // the label's horizontal padding plus a little air
let instances = 0;

/**
 * @typedef {Object} UICommand
 * @property {'next'|'prev'|'goto'|'play'|'pause'|'time'|'labels'|'layer'|'explode'|'export'
 *            |'fullscreen'|'reset-view'|'sound'|'library'|'contents'|'lang'} type
 * @property {number} [spread]   goto
 * @property {'left'|'right'} [page]  goto: the page of the spread a contents entry is printed on
 *           (a portrait screen frames that one; "How this book was made" shares the glossary's spread)
 * @property {number} [t]        time (seconds, 0..duration)
 * @property {boolean} [on]      labels, layer, sound
 * @property {string} [id]       layer
 * @property {number} [amount]   explode (0..1)
 * @property {'svg-color'|'svg-line'|'png'} [mode]  export
 * @property {boolean} [open]    contents: notification that the drawer opened/closed
 * @property {'en'|'es'} [lang]  lang: the reader chose this language with the switch
 *           (onCommand may return a promise that settles once it is applied or refused)
 */

/**
 * @typedef {Object} SpreadState
 * @property {number} index          current spread (0-based)
 * @property {number} total          number of spreads
 * @property {boolean} [canPrev]     overrides index > 0 (e.g. book.canPrev())
 * @property {boolean} [canNext]     overrides index < total − 1 (e.g. book.canNext())
 * @property {string} [title]        e.g. 'Bocaracá' (or 'Contents' for front matter)
 * @property {string} [sci]          e.g. 'Bothriechis schlegelii'
 * @property {string} [number]       plate number, e.g. 'II'
 * @property {string} [kind]         what a numbered spread is called, as the English key
 *                                   'Plate' (default) or 'Lesson' (the UI translates it)
 * @property {'left'|'right'} [page] the page a portrait screen frames: of two contents entries
 *                                   on the spread, the one printed there is the current one
 * @property {boolean} [hasFigure]   a living figure stands on the recto
 * @property {Array<{id:string,label:string,visible?:boolean,hint?:string}>} [layers]
 * @property {boolean} [labels]
 * @property {number} [explode]      0..1
 * @property {boolean} [playing]
 * @property {Array<[number,string]>|Array<{t:number,text:string}>} [beats]
 * @property {string} [animationTitle]  optional small-caps caption kicker, e.g. 'The strike'
 * @property {number} [duration]     loop length (default 5)
 */

/**
 * Create the book UI.
 * @param {object} o
 * @param {HTMLElement} [o.root]   container (default document.body); the overlay is position:fixed
 * @param {{ id?: string, title?: string, subtitle?: string, kicker?: string, kind?: 'Plate'|'Lesson',
 *           plates?: Array<{ number?: string, title: string, sci?: string, spread: number, page?: 'left'|'right' }> }} [o.book]
 *        kind: what the book's numbered entries are (names the contents list for screen readers);
 *        an entry's page: the page of its spread it is printed on (its goto carries it)
 * @param {(cmd: UICommand) => void} [o.onCommand]
 * @param {{ accent?: string, ink?: string, paper?: string }} [o.theme]
 * @param {boolean} [o.reducedMotion]     force on/off (default: follow prefers-reduced-motion)
 * @param {boolean} [o.idleHide=true]     fade the chrome after `idleDelay` ms without input
 * @param {number} [o.idleDelay=3000]
 * @param {boolean} [o.announceSpreads=true]  announce page changes in the live region
 * @param {string} [o.libraryHref='#/']   href of the "Library" link (click emits {type:'library'})
 * @param {'en'|'es'} [o.lang]            the language the UI starts in (default: the current one);
 *        the top bar's switch shows it. Later changes: ui.setLang(lang)
 */
export function createUI({
  root = document.body,
  book = {},
  onCommand = () => {},
  theme = null,
  reducedMotion: forcedReducedMotion,
  idleHide = true,
  idleDelay = 3000,
  announceSpreads = true,
  libraryHref = '#/',
  lang = getLang(),
} = {}) {
  const uid = `lam${++instances}`;
  const state = {
    lang: isLang(lang) ? lang : getLang(),
    book: normalizeBook(book),
    index: 0,
    total: 1,
    canPrev: null,
    canNext: null,
    title: '',
    sci: '',
    number: '',
    page: '', // the framed page ('left' | 'right'), when the App says (portrait)
    hasFigure: false,
    layers: [],
    labels: true,
    explode: 0,
    playing: false,
    beats: [],
    animationTitle: '',
    beat: -2,
    t: 0,
    duration: 5,
    sound: false,
    fullscreen: false,
    busy: false,
    backend: '',
    reading: false,
    readingTitle: '',
    kind: 'Plate',
    numberedKind: '', // the kind of the last numbered spread seen (when the book does not say)
    compact: false,
    short: false,
    singlePage: false,
    reducedMotion: false,
    idle: false,
    chrome: true,
  };
  let destroyed = false;

  // ------------------------------------------------------------------ media
  const mqReduced = watchMedia('(prefers-reduced-motion: reduce)', () => applyReducedMotion());
  const mqCompact = watchMedia('(max-width: 640px)', () => measure());
  const mqCoarse = watchMedia('(hover: none), (pointer: coarse)', () => measure());
  // Short landscape screens (landscape phones): the App frames the book with
  // at most ~18 % of the height kept for the chrome, so a caption band above
  // the toolbar would lie on the book's tail edge. There the caption steps
  // aside (its narration stays in the Read sheet, the screen-reader text, the
  // Moment slider and the pause announcement), the toolbar sits lower, and
  // Read shows: at that height the verso's type is far too small to read.
  const mqShort = watchMedia(`(max-height: ${SHORT_MAX_H}px) and (orientation: landscape)`, () => measure());

  // ------------------------------------------------------------------ DOM
  const el = h('div', { class: 'lam-ui', 'data-lam-ui': uid });
  const live = h('div', { class: 'lam-sr-only', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });

  // top bar: library link + book title + language switch (phones: plate label, switch, sound)
  // (every string of the chrome is written by localize(), below)
  const libraryText = h('span', { class: 'lam-library-text' });
  const library = h('a', { class: 'lam-library', href: libraryHref }, icon('back'), libraryText);
  const bookTitle = h('span', { class: 'lam-book-title' });
  const topNum = h('span', { class: 'lam-plate-num' });
  const topName = h('span', { class: 'lam-plate-name' });
  const topPlate = h(
    'button',
    { type: 'button', class: 'lam-top-plate', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' },
    h('span', { class: 'lam-plate-line' }, topNum, topName)
  );
  // narrow phones: the sound switch moves up here so every toolbar button keeps a 44 px target
  const topSound = h(
    'button',
    { type: 'button', class: 'lam-btn lam-sound-btn lam-top-sound', 'aria-pressed': 'false' },
    icon('soundOff'),
    icon('soundOn')
  );
  const langSwitch = createLangSwitch({ value: state.lang, size: 'auto', className: 'lam-top-lang', onChange: (lang) => requestLang(lang) });
  const top = h(
    'header',
    { class: 'lam-top' },
    library,
    h('span', { class: 'lam-top-rule', 'aria-hidden': 'true' }),
    bookTitle,
    topPlate,
    h('span', { class: 'lam-top-rule lam-top-rule-lang', 'aria-hidden': 'true' }),
    langSwitch.el,
    topSound
  );
  const helpBtn = h(
    'button',
    { type: 'button', class: 'lam-btn lam-help-btn', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'data-key': '?' },
    icon('keyboard')
  );

  // toolbar
  const toolBtn = (name, iconName, attrs = {}) => h('button', { type: 'button', class: `lam-btn lam-${name}-btn`, ...attrs }, icon(iconName));
  const bContents = toolBtn('contents', 'menu', { 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'data-key': 'C' });
  const bPrev = toolBtn('prev', 'prev', { 'data-key': '←' });
  const ringFill = s('circle', { class: 'lam-ring-fill', cx: 16, cy: 16, r: RING_R, 'stroke-dasharray': RING_C.toFixed(3), 'stroke-dashoffset': RING_C.toFixed(3) });
  const ring = s('svg', { class: 'lam-ring', viewBox: '0 0 32 32', 'aria-hidden': 'true', focusable: 'false' }, s('circle', { class: 'lam-ring-track', cx: 16, cy: 16, r: RING_R }), ringFill);
  const bPlay = h('button', { type: 'button', class: 'lam-btn lam-play-btn' }, ring, icon('play'), icon('pause'));
  const plateNum = h('span', { class: 'lam-plate-num' });
  const plateName = h('span', { class: 'lam-plate-name' });
  const plateSci = h('span', { class: 'lam-plate-sci' });
  const plateLine = h('span', { class: 'lam-plate-line' }, plateNum, plateName);
  const bPlate = h(
    'button',
    { type: 'button', class: 'lam-plate', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' },
    h('span', { class: 'lam-plate-inner' }, plateLine, plateSci)
  );
  const bNext = toolBtn('next', 'next', { 'data-key': '→' });
  const divider = h('span', { class: 'lam-div', 'aria-hidden': 'true' });
  const bLayers = toolBtn('layers', 'layers', { 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': `${uid}-layers` });
  const bExport = toolBtn('export', 'export', { 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-controls': `${uid}-export` });
  bExport.append(busyRing());
  const bSound = toolBtn('sound', 'soundOff', { 'aria-pressed': 'false' });
  bSound.append(icon('soundOn'));
  const bFull = toolBtn('fs', 'fullscreen', { 'aria-pressed': 'false', 'data-key': 'F' });
  bFull.append(icon('fullscreenExit'));
  // the sheet carries whatever the spread prints: plate text, introduction, afterword, glossary, imprint
  const bRead = h('button', { type: 'button', class: 'lam-btn lam-read-btn', 'aria-haspopup': 'dialog', hidden: true });
  const bar = h('nav', { class: 'lam-bar' }, bContents, bPrev, bPlay, bPlate, bNext, divider, bLayers, bExport, bSound, bFull, bRead);
  // measures the plate label's candidate texts off screen (fitPlateWidth)
  const plateMeasure = h('div', { class: 'lam-plate-measure', 'aria-hidden': 'true' });

  el.append(top, helpBtn, bar, plateMeasure);
  const overlay = new LabelOverlay(el, { idPrefix: uid });

  // beat caption (two lines that crossfade)
  const capA = h('p', { class: 'lam-cap-line' });
  const capB = h('p', { class: 'lam-cap-line' });
  const caption = h('div', { class: 'lam-caption is-empty', 'aria-hidden': 'true' }, capA, capB);
  let capOn = capA;

  const toasts = h('div', { class: 'lam-toasts', 'aria-hidden': 'true' });
  const tip = h('div', { class: 'lam-tip', 'aria-hidden': 'true' });

  const popLayers = new Popover({ id: `${uid}-layers`, width: 320, className: 'lam-pop-layers', avoidFigure: true });
  const popExport = new Popover({ id: `${uid}-export`, role: 'menu', width: 316, className: 'lam-pop-export' });
  const popHelp = new Popover({ id: `${uid}-help`, placement: 'bottom', width: 344, className: 'lam-pop-help' });
  const drawer = new ContentsDrawer({
    idPrefix: uid,
    onGoto: (spread, page) => {
      closeDrawer();
      emit(page ? { type: 'goto', spread, page } : { type: 'goto', spread });
    },
    onRequestClose: () => closeDrawer(),
  });
  const sheet = new ReadingSheet({ idPrefix: uid, onRequestClose: () => closeSheet() });
  const srReading = h('section', { class: 'lam-sr-only' });

  el.append(caption, toasts, tip, popLayers.el, popExport.el, popHelp.el, drawer.scrim, drawer.el, sheet.scrim, sheet.el, srReading, live);
  (root ?? document.body).append(el);

  // ------------------------------------------------------------------ helpers
  /** Send a command to the App. @returns {*} whatever onCommand returned (a promise ends an export) */
  function emit(cmd) {
    if (destroyed) return undefined;
    try {
      return onCommand(cmd);
    } catch (err) {
      console.error('[lamina/ui] onCommand failed', cmd, err);
      return undefined;
    }
  }

  let vw = innerWidth;
  let vh = innerHeight;
  let barTop = vh - 60;
  let reservePx = 0;
  // the last recto rectangle the App laid labels out in (popovers keep off the figure)
  const page = { x: 0, y: 0, w: 0, h: 0, ok: false };
  const frame = () => ({ vw, vh, compact: state.compact, barTop, avoid: overlay.figureRect, page });

  const CAPTION_GAP = 12; // px between the toolbar and the beat caption (ui.css .lam-caption bottom)

  function measure() {
    if (destroyed) return;
    vw = innerWidth;
    vh = innerHeight;
    state.compact = mqCompact.matches;
    state.short = mqShort.matches;
    el.toggleAttribute('data-compact', state.compact);
    el.toggleAttribute('data-short', state.short);
    el.toggleAttribute('data-coarse', mqCoarse.matches);
    barTop = bar.offsetHeight ? bar.offsetTop : vh - 60; // offsetTop ignores the idle transform
    // The book must stay clear of the awake chrome: toolbar + caption band. The
    // caption keeps its slot on every spread so the framing never jumps; short
    // screens have no caption, so only the toolbar is reserved there.
    const capBand = state.short ? 0 : CAPTION_GAP + (caption.offsetHeight || (state.compact ? 46 : 44));
    reservePx = state.chrome && bar.offsetHeight ? Math.ceil(vh - (barTop - capBand)) : 0;
    if (!singlePageSet) applySinglePage(vw / Math.max(1, vh) < 0.9);
    const topBottom = top.offsetHeight ? top.offsetTop + top.offsetHeight : 0;
    const reserve = state.hasFigure && state.beats.length && !state.short ? 50 : 0;
    overlay.resize(vw, vh, { top: topBottom + 6, bottom: barTop - 10 - reserve, compact: state.compact, coarse: mqCoarse.matches });
    fitPlateWidth(false);
    fitLibraryWidth(false);
    if (openPop) {
      if (openPop === popLayers) buildLayers(); // a phone ↔ wide change reorders it
      openPop.place(frame());
      coverLabels();
    }
  }

  // ------------------------------------------------------------------ single-page framing
  // Portrait views frame one page (the recto), so the verso's text is off
  // screen and "Read" must show at any width. The App reports the framing it
  // actually uses (setSinglePage); until it does, the viewport's aspect
  // stands in for it (the camera rig frames a single page below 0.9).
  let singlePageSet = false;
  function applySinglePage(on) {
    if (state.singlePage === on) return;
    state.singlePage = on;
    el.toggleAttribute('data-single-page', on);
  }
  function setSinglePage(on) {
    singlePageSet = true;
    applySinglePage(!!on);
  }

  function applyReducedMotion() {
    state.reducedMotion = forcedReducedMotion ?? mqReduced.matches;
    el.toggleAttribute('data-reduced-motion', state.reducedMotion);
    overlay.setReducedMotion(state.reducedMotion);
    if (state.reducedMotion) setIdle(false);
  }

  // clear, then set on the next tick so repeated messages are re-read
  let announceTimer = 0;
  function announce(text) {
    live.textContent = '';
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      live.textContent = String(text ?? '');
    }, 60);
  }

  // ------------------------------------------------------------------ plate label
  /** What a numbered spread is called, in the current language ('Lámina', 'Lección'). */
  function kindName(kind = state.kind) {
    if (kind === 'Lesson') return t('Lesson');
    if (kind === 'Plate') return t('Plate');
    return String(kind ?? ''); // an App that passes its own word keeps it
  }
  /** The book's kind of numbered entry: as the book says, else as its numbered spreads say. */
  const bookKind = () => state.book.kind || state.numberedKind || 'Plate';

  let plateTimer = 0;
  /**
   * @param {boolean} animate  fade the label out and in (a new spread)
   * @param {{ fit?: boolean }} [o]  fit: false leaves the fitting to the next
   *        layout pass (relayoutSoon), so writing reads no layout
   */
  function renderPlate(animate, { fit = true } = {}) {
    const num = state.number ? String(state.number) : '';
    const title = state.title || (state.total > 1 ? `${state.index + 1} / ${state.total}` : state.book.title || '');
    const sci = state.sci || '';
    const write = () => {
      plateNum.textContent = num;
      plateNum.hidden = !num;
      plateName.textContent = title;
      plateSci.textContent = sci;
      plateSci.hidden = !sci;
      bPlate.classList.toggle('has-sci', !!sci);
      topNum.textContent = num;
      topNum.hidden = !num;
      topName.textContent = title;
      const name = `${num ? `${kindName()} ${num}, ` : ''}${title}${sci ? `, ${sci}` : ''}`;
      const label = t('{name}. Open contents', { name });
      bPlate.setAttribute('aria-label', label);
      topPlate.setAttribute('aria-label', label);
      bPlate.classList.remove('is-out');
      if (fit) fitPlateText();
      else relayoutSoon();
    };
    clearTimeout(plateTimer);
    if (!animate || state.reducedMotion) return write();
    bPlate.classList.add('is-out');
    plateTimer = setTimeout(write, 150);
  }

  // A title is never cut on a desktop toolbar. The label takes the width the
  // book's longest numbered entry needs (fitPlateWidth, per book and
  // language); a spread title that still does not fit (front and back
  // matter, or a narrow window) wraps to two lines when no binomial sits
  // under it, else steps its type down to 11 px; only past that floor does
  // it end in an ellipsis, with the whole title in its tooltip (and, as
  // always, in its accessible name and the contents drawer it opens).
  let plateNeed = 0; // px the longest numbered entry needs (number · name, or its binomial)
  let plateW = 0;
  function measurePlateNeed() {
    const rows = [];
    const add = (number, title, sci) => {
      if (!number || !title) return;
      rows.push(
        h(
          'div',
          null,
          h('span', { class: 'lam-plate-line' }, h('span', { class: 'lam-plate-num' }, number), h('span', { class: 'lam-plate-name' }, title)),
          sci ? h('span', { class: 'lam-plate-sci' }, sci) : null
        )
      );
    };
    for (const p of state.book.plates) add(p.number, p.title, p.sci);
    add(state.number, state.title, state.sci);
    if (!rows.length) return 0;
    plateMeasure.replaceChildren(...rows);
    let need = 0;
    for (const span of plateMeasure.querySelectorAll('.lam-plate-line, .lam-plate-sci')) need = Math.max(need, span.getBoundingClientRect().width);
    plateMeasure.replaceChildren();
    return Math.ceil(need);
  }
  function fitPlateWidth(remeasure) {
    if (destroyed) return;
    if (remeasure) plateNeed = measurePlateNeed();
    if (!bPlate.offsetWidth) return; // phones: the plate name sits in the top pill
    // everything else in the bar, at its awake size (figure tools included, so turning
    // to a spread without a figure never changes the label's width)
    const btnW = mqCoarse.matches ? 44 : 40;
    const buttons = [bContents, bPrev, bPlay, bNext, bLayers, bExport, bSound, bFull].filter((b) => !b.hidden).length;
    const others = 12 + 13 + buttons * btnW + (bRead.offsetWidth || 0);
    const cap = Math.max(PLATE_MIN_W, Math.min(PLATE_MAX_W, vw - others - 24));
    const w = Math.round(clamp(plateNeed + PLATE_PAD, PLATE_MIN_W, cap));
    if (w === plateW) return;
    plateW = w;
    bar.style.setProperty('--lam-plate-w', `${w}px`);
    fitPlateText();
  }
  // The library link's word takes the width of the longest among the
  // languages loaded ("Library", "Biblioteca"), so the language switch after
  // the book's title keeps its place when the language changes. Measured off
  // screen like the plate label, again when another language has loaded
  // (a switch) and when fonts land; phones show the arrow alone.
  let libraryFit = '';
  function fitLibraryWidth(remeasure) {
    if (destroyed || state.compact) return;
    const words = LANGS.filter((l) => isLoaded(l) && hasT('Library', l)).map((l) => tl(l, 'Library'));
    const key = words.join('\u0000');
    if (!remeasure && key === libraryFit) return;
    libraryFit = key;
    plateMeasure.replaceChildren(...words.map((w) => h('span', { class: 'lam-library' }, h('span', { class: 'lam-library-text' }, w))));
    let need = 0;
    for (const span of plateMeasure.querySelectorAll('.lam-library-text')) need = Math.max(need, span.getBoundingClientRect().width);
    plateMeasure.replaceChildren();
    libraryText.style.minWidth = need > 0 ? `${Math.ceil(need)}px` : '';
  }
  function fitPlateText() {
    bPlate.classList.remove('is-wrap', 'is-tight', 'is-tighter');
    delete bPlate.dataset.tip;
    if (!bPlate.offsetWidth || !plateName.textContent) return;
    const sci = bPlate.classList.contains('has-sci');
    // one line: cut on the right; two (wrapped): a third line hidden by the clamp
    // (a few px of slack: the display numeral's ascent overhangs the 16 px line box)
    const over = () =>
      bPlate.classList.contains('is-wrap')
        ? plateLine.scrollHeight > plateLine.clientHeight + 6
        : plateLine.scrollWidth > plateLine.clientWidth + 1 || plateSci.scrollWidth > plateSci.clientWidth + 1;
    const steps = sci ? ['is-tight', 'is-tighter'] : ['is-wrap', 'is-tight'];
    for (const step of steps) {
      if (!over()) return;
      bPlate.classList.add(step);
    }
    if (over()) bPlate.dataset.tip = `${state.number ? `${state.number} · ` : ''}${state.title}`;
  }

  // ------------------------------------------------------------------ toolbar state
  function syncNav() {
    const had = document.activeElement;
    bPrev.disabled = !canGoPrev();
    bNext.disabled = !canGoNext();
    // a button that disables under focus drops it to <body>: hand it to its partner
    const lost = (had === bNext && bNext.disabled) || (had === bPrev && bPrev.disabled);
    if (lost) {
      const to = had === bNext ? bPrev : bNext;
      // the narrowest phones move Contents out of the bar: the top pill's plate name opens it there
      const contents = bContents.offsetParent !== null ? bContents : topPlate;
      (to.disabled ? contents : to).focus({ preventScroll: true });
    }
  }
  const canGoPrev = () => state.canPrev ?? state.index > 0;
  const canGoNext = () => state.canNext ?? state.index < state.total - 1;

  function syncPlay() {
    const p = state.playing && state.hasFigure;
    bPlay.dataset.playing = p ? 'true' : 'false';
    bPlay.setAttribute('aria-label', p ? t('Pause the animation') : t('Play the animation'));
    bPlay.dataset.tip = p ? t('Pause') : t('Play');
    bPlay.disabled = !state.hasFigure;
  }

  function syncFigureTools() {
    el.toggleAttribute('data-figure', state.hasFigure);
    // collapse (animated width) rather than display:none so the pill glides
    for (const b of [bLayers, bExport]) {
      b.classList.toggle('is-collapsed', !state.hasFigure);
      b.tabIndex = state.hasFigure ? 0 : -1;
    }
    if (!state.hasFigure && (openPop === popLayers || openPop === popExport)) closePopover(false);
    caption.hidden = !state.hasFigure;
    overlay.setEnabled(state.labels && state.hasFigure);
  }

  function syncSound() {
    for (const b of [bSound, topSound]) b.setAttribute('aria-pressed', String(state.sound));
    bSound.dataset.tip = state.sound ? t('Sound on') : t('Sound off');
  }

  const fsEnabled = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  bFull.hidden = !fsEnabled;
  function syncFullscreen() {
    state.fullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    bFull.setAttribute('aria-pressed', String(state.fullscreen));
    bFull.dataset.tip = state.fullscreen ? t('Exit full screen') : t('Full screen');
  }

  // ------------------------------------------------------------------ caption
  function normalizeBeats(beats) {
    if (!Array.isArray(beats)) return [];
    const out = [];
    for (const b of beats) {
      const t = Array.isArray(b) ? +b[0] : +b?.t;
      const text = Array.isArray(b) ? b[1] : b?.text;
      if (Number.isFinite(t) && text) out.push({ t, text: String(text) });
    }
    return out.sort((a, b) => a.t - b.t);
  }

  function beatAt(t) {
    const b = state.beats;
    if (!b.length) return -1;
    let i = b.length - 1; // before the first beat we are still in the last one (loop)
    for (let k = 0; k < b.length; k++) {
      if (b[k].t <= t + 1e-6) i = k;
      else break;
    }
    return i;
  }

  function showBeat(i) {
    state.beat = i;
    const text = i >= 0 ? state.beats[i].text : '';
    const next = capOn === capA ? capB : capA;
    if (text && state.animationTitle) next.replaceChildren(h('span', { class: 'lam-cap-kicker' }, state.animationTitle), text);
    else next.textContent = text;
    next.classList.add('is-on');
    capOn.classList.remove('is-on');
    capOn = next;
    caption.classList.toggle('is-empty', !text);
  }

  /** "The strike: The neck draws back…" for loop time t ('' without beats). */
  function beatSpeech(t) {
    const i = state.hasFigure && state.beats.length ? beatAt(t) : -1;
    if (i < 0) return '';
    return `${state.animationTitle ? `${state.animationTitle}: ` : ''}${state.beats[i].text}`;
  }

  // The caption is aria-hidden (it changes every second or two) and short
  // screens hide it, so the loop's narration is also set into the reading
  // sheet and the screen-reader text, as a short section before the Sources.
  let narration = [];
  function placeNarration() {
    for (const n of narration) n.remove();
    narration = [];
    if (!state.reading || !state.hasFigure || !state.beats.length) return;
    // the sheet prints the readout's unit ("2.4 s"); screen readers hear the word
    const make = (time) =>
      h(
        'section',
        { class: 'lam-narration' },
        h('h3', null, state.animationTitle ? t('The animation · {title}', { title: state.animationTitle }) : t('The animation')),
        h(
          'ol',
          { class: 'lam-beats' },
          state.beats.map((b) => h('li', null, h('span', { class: 'lam-beat-t' }, time(b.t)), ' ', h('span', { class: 'lam-beat-text' }, b.text)))
        )
      );
    narration = [make((x) => fmtSeconds(x)), make((x) => t('{n} seconds', { n: fmtNumber(x, { minFrac: 1, maxFrac: 1 }) }))];
    insertBeforeSources(sheet.body, narration[0]);
    insertBeforeSources(srReading, narration[1]);
  }

  // ------------------------------------------------------------------ layers popover
  const layersBody = h('div', { class: 'lam-pop-body' });
  popLayers.el.append(layersBody);
  let layersKey = '';
  let explodeInput = null;
  let explodeOut = null;
  let labelsRow = null;
  let timeInput = null;
  let timeOut = null;
  let dragging = false;

  const kbd = (k) => h('kbd', { class: 'lam-kbd', 'aria-hidden': 'true' }, k);
  const switchRow = (attrs, title, hint, key) =>
    h(
      'button',
      { type: 'button', class: 'lam-row', role: 'switch', ...attrs },
      h('span', { class: 'lam-row-text' }, h('span', { class: 'lam-row-title' }, title), hint ? h('span', { class: 'lam-row-hint' }, hint) : null),
      key ? kbd(key) : h('span'),
      h('span', { class: 'lam-switch', 'aria-hidden': 'true' })
    );

  function setRangeFill(input) {
    const min = +input.min || 0;
    const max = +input.max || 1;
    input.style.setProperty('--lam-p', `${(((+input.value - min) / (max - min || 1)) * 100).toFixed(2)}%`);
  }

  function buildLayers() {
    const key = `${getLang()}|${state.layers.map((l) => `${l.id}\u0001${l.label}\u0001${l.hint ?? ''}`).join('\u0002')}|${state.beats.map((b) => b.t).join(',')}|${state.duration}|${state.compact}`;
    if (key === layersKey) return syncLayersPopover();
    layersKey = key;
    // a rebuild while open (new layer names: another language) keeps the focused control
    const keep = openPop === popLayers ? popFocusKey() : null;
    const rows = state.layers.length
      ? state.layers.map((l, i) => switchRow({ 'aria-checked': String(!!l.visible), dataset: { layer: l.id } }, l.label, l.hint, i < 9 ? String(i + 1) : ''))
      : [h('p', { class: 'lam-empty' }, t('This plate is a single layer.'))];

    explodeInput = h('input', { type: 'range', class: 'lam-range lam-range-explode', min: '0', max: '1', step: '0.01', 'aria-label': t('Explode') });
    explodeOut = h('output', { class: 'lam-field-value' });
    labelsRow = switchRow({ 'aria-checked': String(state.labels), dataset: { labels: '1' } }, t('Labels'), t('Name the parts on the plate'), 'L');
    timeInput = h('input', { type: 'range', class: 'lam-range lam-range-time', min: '0', max: String(state.duration), step: '0.01', 'aria-label': t('Animation time') });
    timeOut = h('output', { class: 'lam-field-value' });
    timeTextKey = -1;
    const ticks = h(
      'div',
      { class: 'lam-ticks', 'aria-hidden': 'true' },
      state.beats.map((b) => h('i', { style: { left: `${clamp((b.t / state.duration) * 100, 0, 100)}%` } }))
    );

    const explodeField = h(
      'div',
      { class: 'lam-field', dataset: { field: 'explode' } },
      h('div', { class: 'lam-field-head' }, icon('explode'), h('span', { class: 'lam-field-title' }, t('Explode')), kbd('E'), explodeOut),
      h('div', { class: 'lam-range-wrap' }, explodeInput)
    );
    const timeField = h(
      'div',
      { class: 'lam-field', dataset: { field: 'time' } },
      h('div', { class: 'lam-field-head' }, icon('clock'), h('span', { class: 'lam-field-title' }, t('Moment')), h('span', { class: 'lam-field-note' }, t('scrub the 5-second loop')), timeOut),
      h('div', { class: 'lam-range-wrap' }, ticks, timeInput)
    );
    const sep = () => h('div', { class: 'lam-sep', role: 'separator' });
    const title = h('p', { class: 'lam-pop-title' }, t('Layers'));
    const list = h('div', { class: 'lam-rows' }, rows);
    // Phones dock the popover above the toolbar and cap its height above the
    // figure's foot, so it may scroll: the two sliders (the dissection itself)
    // come first there, in DOM order too, so focus order follows what is seen.
    if (state.compact) layersBody.replaceChildren(explodeField, timeField, sep(), title, list, labelsRow);
    else layersBody.replaceChildren(title, list, sep(), explodeField, labelsRow, sep(), timeField);
    if (!keep) popLayers.el.scrollTop = 0;
    restorePopFocus(keep);
    syncLayersPopover();
  }

  function syncLayersPopover() {
    if (!explodeInput) return;
    for (const row of layersBody.querySelectorAll('[data-layer]')) {
      const l = state.layers.find((x) => x.id === row.dataset.layer);
      row.setAttribute('aria-checked', String(!!l?.visible));
    }
    labelsRow?.setAttribute('aria-checked', String(state.labels));
    if (!dragging || document.activeElement !== explodeInput) explodeInput.value = String(state.explode);
    writeExplode();
    setRangeFill(explodeInput);
    syncTime(true);
  }

  /** The Explode readout ("60%" / "60 %") and its spoken value. */
  function writeExplode() {
    if (!explodeOut) return;
    explodeOut.textContent = fmtPercent(state.explode);
    explodeInput.setAttribute('aria-valuetext', t('{n} percent', { n: Math.round(state.explode * 100) }));
  }

  function syncTime(force) {
    if (!timeInput || (dragging && document.activeElement === timeInput)) return;
    if (force || Math.abs(+timeInput.value - state.t) > 0.02) {
      timeInput.value = String(state.t);
      setRangeFill(timeInput);
      syncTimeText(state.t, force);
    }
  }

  // The Moment readout, and the slider's spoken value with the beat at that
  // moment (the caption itself is silent). Rewritten only when the shown
  // tenth of a second or the beat changes, not every frame of playback.
  let timeTextKey = -1;
  function syncTimeText(time, force) {
    if (!timeInput) return;
    const tenth = Math.round(time * 10);
    const i = state.hasFigure && state.beats.length ? beatAt(time) : -1;
    const key = tenth * 256 + i + 1;
    if (key === timeTextKey && !force) return;
    timeTextKey = key;
    timeOut.textContent = fmtSeconds(tenth / 10);
    const secs = fmtNumber(tenth / 10, { minFrac: 1, maxFrac: 1 });
    const beat = beatSpeech(time);
    timeInput.setAttribute('aria-valuetext', beat ? t('{secs} seconds. {beat}', { secs, beat }) : t('{secs} seconds', { secs }));
  }

  layersBody.addEventListener('click', (e) => {
    const row = e.target.closest('[data-layer]');
    if (row) {
      const l = state.layers.find((x) => x.id === row.dataset.layer);
      if (l) setLayer(l.id, !l.visible);
      return;
    }
    if (e.target.closest('[data-labels]')) setLabels(!state.labels);
  });
  layersBody.addEventListener('input', (e) => {
    const t = e.target;
    if (t === explodeInput) {
      setRangeFill(t);
      setExplode(+t.value);
    } else if (t === timeInput) {
      setRangeFill(t);
      scrubTo(+t.value);
    }
  });
  // while a slider drags, the popover clears away so the dissection shows through
  let scrubField = null;
  function setScrubbing(field) {
    if (scrubField === field) return;
    scrubField?.classList.remove('is-scrubbed');
    scrubField = field;
    field?.classList.add('is-scrubbed');
    popLayers.el.classList.toggle('is-scrubbing', !!field);
  }
  layersBody.addEventListener('pointerdown', (e) => {
    if (!e.target.matches?.('.lam-range')) return;
    dragging = true;
    setScrubbing(e.target.closest('.lam-field'));
  });

  // ------------------------------------------------------------------ export menu
  const exportBody = h('div', { class: 'lam-pop-body' });
  popExport.el.append(exportBody);
  function buildExport() {
    exportBody.replaceChildren(
      h('p', { class: 'lam-pop-title', 'aria-hidden': 'true' }, state.number ? t('Export · {kind} {number}', { kind: kindName(), number: state.number }) : t('Export')),
      ...EXPORT_MODES.map((m) =>
        h(
          'button',
          { type: 'button', role: 'menuitem', class: 'lam-menuitem', dataset: { mode: m.mode }, 'aria-label': `${t(m.title)}. ${t(m.hint)}` },
          h('span', { class: 'lam-mi-icon' }, icon(m.icon), busyRing()),
          h('span', { class: 'lam-mi-text' }, h('span', { class: 'lam-mi-title' }, t(m.title)), h('span', { class: 'lam-mi-hint' }, t(m.hint))),
          m.key ? kbd(m.key) : null
        )
      )
    );
    syncExportItems();
  }
  exportBody.addEventListener('click', (e) => {
    const item = e.target.closest('[data-mode]');
    if (!item || exportMode) return; // one export at a time; the menu stays open
    closePopover(keyboardModality);
    requestExport(item.dataset.mode, e.timeStamp);
  });

  // ------------------------------------------------------------------ export progress
  let exportMode = ''; // the export in flight ('' = none)
  let exportJob = 0;
  let exportEndedAt = -Infinity;
  let exportSayTimer = 0;
  let exportGiveUpTimer = 0;

  /**
   * Ask the App for an export. One runs at a time: a press made while one
   * was in flight is refused even when the browser delivers it only after
   * that export ends (the export blocks the main thread, so a quick second
   * "S" waits in the queue), since it would download the same file twice.
   * @param {string} mode
   * @param {number} [at]  when the press happened (Event.timeStamp)
   * @returns {boolean} started
   */
  function requestExport(mode, at = performance.now()) {
    if (exportMode || at < exportEndedAt) return false;
    exportMode = mode;
    const job = ++exportJob;
    setExportBusy(true);
    // the status in words (WCAG 4.1.3) once the ring shows; the toast then announces the result
    exportSayTimer = setTimeout(() => {
      const m = EXPORT_MODES.find((x) => x.mode === mode);
      announce(m ? t(m.busy) : t('Exporting…'));
    }, EXPORT_SAY_MS);
    exportGiveUpTimer = setTimeout(endExport, EXPORT_GIVE_UP_MS);
    const done = () => job === exportJob && endExport();
    // One painted frame first, so the busy mark (and the ring's delayed
    // reveal) is on the compositor before the export takes the main thread;
    // emitted in the same task, nothing would show until the export ended.
    afterPaint(() => {
      if (job !== exportJob || exportMode !== mode) return; // given up meanwhile
      const r = emit({ type: 'export', mode });
      if (typeof r?.then === 'function') r.then(done, done);
    });
    return true;
  }

  /** The export reported back (toast or settled promise): stop the ring. */
  function endExport() {
    if (!exportMode) return;
    clearTimeout(exportSayTimer);
    clearTimeout(exportGiveUpTimer);
    exportMode = '';
    exportEndedAt = performance.now();
    setExportBusy(false);
  }

  function setExportBusy(on) {
    bExport.classList.toggle('is-busy', on);
    syncExportTip();
    if (on) hideTip();
    syncExportItems();
  }

  /** The Export button's tooltip follows the export in flight (also across a language switch). */
  function syncExportTip() {
    bExport.dataset.tip = exportMode ? t('Exporting…') : t('Export');
  }

  /** Menu items while an export runs: its own item turns its ring, the others rest. */
  function syncExportItems() {
    for (const item of exportBody.querySelectorAll('[data-mode]')) {
      item.classList.toggle('is-busy', item.dataset.mode === exportMode);
      if (exportMode) item.setAttribute('aria-disabled', 'true');
      else item.removeAttribute('aria-disabled');
    }
  }

  // ------------------------------------------------------------------ help card
  const helpBody = h('div', { class: 'lam-pop-body' });
  popHelp.el.append(helpBody);
  function backendName(b) {
    if (/gpu/i.test(b)) return 'WebGPU';
    if (/gl/i.test(b)) return 'WebGL 2';
    return b;
  }
  function buildHelp() {
    // the table's texts are English keys: labels, headings, named key caps and spoken names translate
    const group = (id, heading) => [
      // (the figure's own keys are headed by what the book calls its spreads: Plate, or Lesson)
      h('p', { class: 'lam-pop-title' }, id === 'Plate' ? kindName(bookKind()) : t(heading)),
      h(
        'dl',
        { class: 'lam-help-grid' },
        SHORTCUTS.filter((sc) => sc.group === id).map((sc) => {
          const caps = sc.display.map(keyCap);
          return [
            h(
              'dt',
              { class: 'lam-help-keys' },
              caps.length === 2 && sc.id === 'layer'
                ? [kbd(caps[0]), h('span', { class: 'lam-help-dash', 'aria-hidden': 'true' }, '–'), kbd(caps[1])]
                : caps.map(kbd),
              h('span', { class: 'lam-sr-only' }, sc.spoken ? t(sc.spoken) : caps.join(' '))
            ),
            h('dd', { class: 'lam-help-label' }, t(sc.label)),
          ];
        })
      ),
    ];
    const be = state.backend ? backendName(state.backend) : '';
    const parts = SHORTCUT_GROUPS.flatMap(([id, heading], i) => [i ? h('div', { class: 'lam-sep', role: 'separator' }) : null, ...group(id, heading)]);
    if (be) {
      parts.push(
        h(
          'p',
          { class: 'lam-help-foot' },
          h('span', null, t('Rendering')),
          h('span', { class: 'lam-badge', dataset: { backend: /gpu/i.test(state.backend) ? 'webgpu' : 'webgl' } }, h('i', { 'aria-hidden': 'true' }), be)
        )
      );
    }
    // replaceChildren() would print a null as the text "null"
    helpBody.replaceChildren(...parts.filter(Boolean));
  }

  // ------------------------------------------------------------------ overlays
  let openPop = null;
  let keyboardModality = false;

  function openPopover(pop, trigger, keyboard) {
    if (!trigger) return;
    if (openPop && openPop !== pop) openPop.close();
    if (drawer.isOpen) closeDrawer(false);
    if (sheet.isOpen) closeSheet(false);
    if (pop === popLayers) buildLayers();
    else if (pop === popExport) buildExport();
    else if (pop === popHelp) buildHelp();
    hideTip();
    measure();
    pop.open(trigger, { keyboard, frame: frame() });
    openPop = pop;
    // A popover over the toolbar sits on the caption band: the caption steps
    // aside while it is open, also while a slider drag clears the popover's
    // glass (two texts would otherwise print over each other).
    el.toggleAttribute('data-pop-open', pop.placement === 'top');
    coverLabels();
    activity();
  }

  function closePopover(restoreFocus = keyboardModality) {
    if (!openPop) return false;
    const p = openPop;
    openPop = null;
    dragging = false;
    setScrubbing(null);
    p.close({ restoreFocus });
    el.toggleAttribute('data-pop-open', false);
    overlay.setCover(null);
    activity();
    return true;
  }

  /**
   * Label pills (and their leaders) under the open layers popover fade out:
   * a leader sticking out of the popover with its pill hidden behind it reads
   * as a stray line. Measured on open and whenever the popover is re-placed.
   */
  function coverLabels() {
    if (openPop !== popLayers) return overlay.setCover(null);
    // layout box (offset* ignore the opening transition's transform); .lam-ui spans the viewport
    const p = popLayers.el;
    const w = p.offsetWidth;
    const hh = p.offsetHeight;
    overlay.setCover(w > 0 && hh > 0 ? { x0: p.offsetLeft, y0: p.offsetTop, x1: p.offsetLeft + w, y1: p.offsetTop + hh } : null);
  }

  function togglePopover(pop, trigger, keyboard) {
    if (openPop === pop) closePopover(keyboard);
    else openPopover(pop, trigger, keyboard);
  }

  function helpAnchor() {
    if (helpBtn.offsetParent !== null && !state.compact) {
      popHelp.placement = 'bottom';
      return helpBtn;
    }
    popHelp.placement = 'top';
    return bPlate.offsetParent !== null ? bPlate : bPlay;
  }

  function openDrawer() {
    if (drawer.isOpen) return;
    closePopover(false);
    closeSheet(false);
    hideTip();
    drawer.setCurrent(state.index, state.page);
    drawer.open(document.activeElement, { keyboard: keyboardModality });
    for (const b of [bContents, bPlate, topPlate]) b.setAttribute('aria-expanded', 'true');
    el.toggleAttribute('data-modal', true);
    emit({ type: 'contents', open: true });
    activity();
  }

  function closeDrawer(restoreFocus = keyboardModality) {
    if (!drawer.isOpen) return false;
    drawer.close({ restoreFocus });
    for (const b of [bContents, bPlate, topPlate]) b.setAttribute('aria-expanded', 'false');
    el.toggleAttribute('data-modal', sheet.isOpen);
    emit({ type: 'contents', open: false });
    activity();
    return true;
  }

  function openSheet() {
    if (sheet.isOpen || !state.reading) return;
    closePopover(false);
    closeDrawer(false);
    hideTip();
    sheet.setMeta(sheetMeta());
    sheet.open(document.activeElement);
    bRead.setAttribute('aria-expanded', 'true');
    el.toggleAttribute('data-modal', true);
    activity();
  }

  function closeSheet(restoreFocus = keyboardModality) {
    if (!sheet.isOpen) return false;
    sheet.close({ restoreFocus });
    bRead.setAttribute('aria-expanded', 'false');
    el.toggleAttribute('data-modal', drawer.isOpen);
    activity();
    return true;
  }

  /** Sheet header when the reading text brings none of its own. */
  function sheetMeta() {
    if (state.readingTitle) return { kicker: '', title: state.readingTitle, sci: '' };
    return { kicker: state.number ? `${kindName()} ${state.number}` : '', title: state.title, sci: state.sci };
  }

  /** Close the topmost transient surface. @returns {boolean} consumed */
  function closeTopmost() {
    if (sheet.isOpen) return closeSheet(true);
    if (drawer.isOpen) return closeDrawer(true);
    if (openPop) return closePopover(true);
    if (overlay.activeId != null) {
      const pinned = overlay.hasPinnedCard;
      overlay.closeCard();
      return pinned;
    }
    return false;
  }

  const SURFACES = {
    contents: { open: () => openDrawer(), close: () => closeDrawer(), is: () => drawer.isOpen },
    layers: { open: (kb) => state.hasFigure && openPopover(popLayers, bLayers, kb), close: () => openPop === popLayers && closePopover(), is: () => openPop === popLayers },
    export: { open: (kb) => state.hasFigure && openPopover(popExport, bExport, kb), close: () => openPop === popExport && closePopover(), is: () => openPop === popExport },
    help: { open: (kb) => openPopover(popHelp, helpAnchor(), kb), close: () => openPop === popHelp && closePopover(), is: () => openPop === popHelp },
    reading: { open: () => openSheet(), close: () => closeSheet(), is: () => sheet.isOpen },
  };

  // ------------------------------------------------------------------ actions
  function togglePlay() {
    if (!state.hasFigure) return;
    state.playing = !state.playing;
    syncPlay();
    emit({ type: state.playing ? 'play' : 'pause' });
    // the caption is silent (and hidden on short screens): say where the loop stopped
    const beat = state.playing ? '' : beatSpeech(state.t);
    announce(state.playing ? t('Playing') : beat ? t('Paused. {beat}', { beat }) : t('Paused'));
  }

  function setLabels(on, fromKey = false) {
    state.labels = !!on;
    overlay.setEnabled(state.labels && state.hasFigure);
    labelsRow?.setAttribute('aria-checked', String(state.labels));
    emit({ type: 'labels', on: state.labels });
    if (fromKey) announce(state.labels ? t('Labels shown') : t('Labels hidden'));
  }

  function setLayer(id, on, fromKey = false) {
    const l = state.layers.find((x) => x.id === id);
    if (!l) return;
    l.visible = !!on;
    syncLayersPopover();
    overlay.release(); // the reader changed what is shown: hidden labels give up their slots now
    emit({ type: 'layer', id, on: l.visible });
    if (fromKey) announce(l.visible ? t('{layer} shown', { layer: l.label }) : t('{layer} hidden', { layer: l.label }));
  }

  function setExplode(amount, fromKey = false) {
    state.explode = clamp(+amount || 0, 0, 1);
    if (fromKey) syncLayersPopover();
    else writeExplode();
    emit({ type: 'explode', amount: state.explode });
    if (fromKey) announce(state.explode > 0 ? t('Exploded view') : t('Reassembled'));
  }

  function scrubTo(t) {
    if (state.playing) {
      state.playing = false;
      syncPlay();
      emit({ type: 'pause' });
    }
    state.t = clamp(+t || 0, 0, state.duration);
    syncTimeText(state.t);
    emit({ type: 'time', t: state.t });
    if (state.beats.length) {
      const i = beatAt(state.t);
      if (i !== state.beat) showBeat(i);
    }
    ringFill.style.strokeDashoffset = (RING_C * (1 - state.t / state.duration)).toFixed(2);
  }

  function setSound(on) {
    state.sound = !!on;
    syncSound();
  }

  // ------------------------------------------------------------------ events
  const toggleSound = () => {
    setSound(!state.sound);
    emit({ type: 'sound', on: state.sound });
  };
  const clickHandlers = new Map([
    [bContents, () => (drawer.isOpen ? closeDrawer() : openDrawer())],
    [bPlate, () => openDrawer()],
    [topPlate, () => openDrawer()],
    [bPrev, () => emit({ type: 'prev' })],
    [bNext, () => emit({ type: 'next' })],
    [bPlay, () => togglePlay()],
    [bLayers, (e) => togglePopover(popLayers, bLayers, e.detail === 0)],
    [bExport, (e) => togglePopover(popExport, bExport, e.detail === 0)],
    [helpBtn, (e) => togglePopover(popHelp, helpAnchor(), e.detail === 0)],
    [bRead, () => openSheet()],
    [bSound, toggleSound],
    [topSound, toggleSound],
    [bFull, () => emit({ type: 'fullscreen' })],
  ]);
  for (const [btn, fn] of clickHandlers) {
    btn.addEventListener('click', (e) => {
      fn(e);
      // Mouse users should not leave focus parked on a toolbar button: a
      // later Space would re-activate it instead of reaching the App.
      if (e.detail > 0 && document.activeElement === btn) btn.blur();
    });
  }
  library.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    emit({ type: 'library' });
  });

  // keys inside the overlay stay inside the overlay
  el.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t.closest?.('.lam-pop, .lam-drawer, .lam-sheet')) {
      const pop = openPop && openPop.el.contains(t) ? openPop : null;
      if (pop === popExport) rovingFocus(Array.from(exportBody.querySelectorAll('[role="menuitem"]')), e);
      if (pop && e.key === 'Tab') popoverTab(pop, e);
      else if (pop === popLayers && !ownsKey(t, e)) {
        // the popover's own key caps (1–9, E, L) keep working while it has focus
        const m = matchShortcut(e, { anyTarget: true });
        if (m && POPOVER_KEYS.has(m.id)) handleShortcut(e, m);
      }
      e.stopPropagation();
      return;
    }
    if ((e.key === ' ' || e.key === 'Enter') && t.closest?.('button, a')) e.stopPropagation();
  });

  /**
   * Tab past either end of a popover closes it and returns focus to its
   * trigger: Shift+Tab lands on the trigger, Tab moves on from it (a menu
   * closes on any Tab). The popover sits late in the DOM, so letting focus
   * wander out would land on whatever follows it (figure labels).
   */
  function popoverTab(pop, e) {
    const list = focusables(pop.el);
    const t = e.target;
    if (e.shiftKey && (pop.role === 'menu' || t === pop.el || t === list[0])) {
      e.preventDefault();
      closePopover(true);
    } else if (!e.shiftKey && (pop.role === 'menu' || t === list[list.length - 1] || !list.length)) {
      closePopover(true); // the default Tab then continues from the trigger
    }
  }

  /** Keys the focused control uses itself (sliders move, switches toggle). */
  function ownsKey(t, e) {
    if (t.matches?.('input[type="range"]')) return /^(Arrow|Page|Home|End)/.test(e.key);
    if (t.closest?.('button')) return e.key === ' ' || e.key === 'Enter';
    return isEditable(t);
  }
  for (const pop of [popLayers, popExport, popHelp]) {
    pop.el.addEventListener('focusout', (e) => {
      const to = e.relatedTarget;
      if (openPop === pop && to && !pop.el.contains(to) && !pop.trigger?.contains(to)) closePopover(false);
    });
  }

  function onKeyCapture(e) {
    keyboardModality = true;
    activity();
    if (e.key === 'Escape') {
      if (closeTopmost()) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditable(e.target) && !drawer.isOpen && !sheet.isOpen) {
      e.preventDefault();
      e.stopPropagation();
      if (openPop === popHelp) closePopover(true);
      else openPopover(popHelp, helpAnchor(), true);
    }
  }

  function onPointerDownCapture(e) {
    keyboardModality = false;
    activity();
    hideTip();
    // (an event dispatched on window by automation has no Node target: outside)
    const t = e.target instanceof Node ? e.target : null;
    if (openPop && !(t && openPop.el.contains(t)) && !(t && openPop.trigger?.contains(t))) closePopover(false);
  }

  function onPointerUp() {
    dragging = false;
    setScrubbing(null);
  }

  // ------------------------------------------------------------------ idle chrome
  let idleTimer = 0;
  let lastActivity = performance.now();
  let hovering = false;

  function setIdle(v) {
    if (state.idle === v) return;
    state.idle = v;
    el.toggleAttribute('data-idle', v);
    if (v) hideTip();
  }

  function canIdle() {
    if (!idleHide || state.reducedMotion || mqCoarse.matches || hovering || dragging) return false;
    if (openPop || drawer.isOpen || sheet.isOpen || overlay.hasPinnedCard) return false;
    const a = document.activeElement;
    if (a && a !== document.body && el.contains(a) && a.matches(':focus-visible')) return false;
    return true;
  }

  function checkIdle() {
    idleTimer = 0;
    if (destroyed) return;
    const left = idleDelay - (performance.now() - lastActivity);
    if (left > 16) {
      idleTimer = setTimeout(checkIdle, left);
      return;
    }
    if (canIdle()) setIdle(true);
  }

  function activity() {
    lastActivity = performance.now();
    if (state.idle) setIdle(false);
    if (!idleTimer && idleHide && !destroyed) idleTimer = setTimeout(checkIdle, idleDelay);
  }

  for (const zone of [bar, top, helpBtn]) {
    zone.addEventListener('pointerenter', () => {
      hovering = true;
      activity();
    });
    zone.addEventListener('pointerleave', () => {
      hovering = false;
      activity();
    });
  }
  el.addEventListener('focusin', () => activity());
  el.addEventListener('focusout', () => activity());

  // ------------------------------------------------------------------ tooltips
  let tipTimer = 0;
  let tipFor = null;
  function showTip(btn) {
    const label = btn.dataset.tip;
    if (!label || openPop || state.idle) return;
    tip.replaceChildren(h('span', null, label), btn.dataset.key ? h('kbd', { class: 'lam-kbd' }, btn.dataset.key) : null);
    const r = btn.getBoundingClientRect();
    const w = tip.offsetWidth;
    const x = clamp(r.left + r.width / 2, w / 2 + 8, vw - w / 2 - 8);
    tip.style.left = `${x}px`;
    if (bar.contains(btn)) {
      tip.style.top = 'auto';
      tip.style.bottom = `${Math.round(vh - barTop + 8)}px`;
      tip.dataset.place = 'top';
    } else {
      tip.style.bottom = 'auto';
      tip.style.top = `${Math.round(r.bottom + 8)}px`;
      tip.dataset.place = 'bottom';
    }
    tip.classList.add('is-on');
  }
  function hideTip() {
    clearTimeout(tipTimer);
    tipFor = null;
    tip.classList.remove('is-on');
  }
  el.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const btn = e.target.closest?.('[data-tip]');
    if (!btn || btn === tipFor) return;
    const warm = tip.classList.contains('is-on');
    hideTip();
    tipFor = btn;
    tipTimer = setTimeout(() => showTip(btn), warm ? 0 : 520);
  });
  el.addEventListener('pointerout', (e) => {
    const btn = e.target.closest?.('[data-tip]');
    if (btn && !btn.contains(e.relatedTarget)) hideTip();
  });

  // ------------------------------------------------------------------ global listeners
  const onResize = () => measure();
  const onActivity = () => activity();
  window.addEventListener('keydown', onKeyCapture, true);
  window.addEventListener('pointerdown', onPointerDownCapture, true);
  window.addEventListener('pointerup', onPointerUp, true);
  window.addEventListener('pointercancel', onPointerUp, true);
  window.addEventListener('pointermove', onActivity, { passive: true });
  window.addEventListener('wheel', onActivity, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('webkitfullscreenchange', syncFullscreen);

  // ------------------------------------------------------------------ public API
  /**
   * Describe the visible spread. Call on every page change (and whenever its
   * figure state changes from outside the UI, e.g. a URL or automation).
   * @param {SpreadState} sp
   */
  let plateSeen = false;
  let plateKey = '';
  let beatsKey = '';
  let reserveKey = '';
  function setSpread(sp = {}) {
    const prevIndex = state.index;
    const prevTitle = state.title;
    if (Number.isFinite(sp.index)) state.index = Math.max(0, Math.round(sp.index));
    if (Number.isFinite(sp.total)) state.total = Math.max(1, Math.round(sp.total));
    state.canPrev = typeof sp.canPrev === 'boolean' ? sp.canPrev : null;
    state.canNext = typeof sp.canNext === 'boolean' ? sp.canNext : null;
    state.title = sp.title != null ? String(sp.title) : '';
    state.sci = sp.sci != null ? String(sp.sci) : '';
    state.number = sp.number != null ? String(sp.number) : '';
    state.kind = sp.kind ? String(sp.kind) : 'Plate';
    state.page = sp.page === 'left' || sp.page === 'right' ? sp.page : '';
    if (state.number && state.kind !== state.numberedKind && !state.book.kind) {
      state.numberedKind = state.kind; // the contents list is named after it (Plates / Lessons)
      drawer.localize({ kind: bookKind() });
    }
    state.hasFigure = !!sp.hasFigure;
    if (Array.isArray(sp.layers)) {
      state.layers = sp.layers
        .filter((l) => l && l.id != null)
        .map((l) => ({ id: String(l.id), label: String(l.label ?? l.id), visible: l.visible !== false, hint: l.hint ? String(l.hint) : '' }));
    } else if (!state.hasFigure) state.layers = [];
    if (sp.labels !== undefined) state.labels = sp.labels !== false;
    if (sp.explode !== undefined) state.explode = clamp(+sp.explode || 0, 0, 1);
    if (sp.playing !== undefined) state.playing = !!sp.playing;
    if (sp.duration > 0) state.duration = +sp.duration;
    state.beats = normalizeBeats(sp.beats);
    state.animationTitle = sp.animationTitle ? String(sp.animationTitle) : '';

    // The App may call this after every command (even while a slider drags),
    // so only touch what actually changed. The same spread in another
    // language (after setLang) is no new spread, even when its title changes
    // ('Perfil' for 'Profile'): its labels and an open card stay, and the
    // plate label is written without fading.
    const relocalized = relocalizedAt >= 0 && relocalizedAt === state.index && state.index === prevIndex;
    const changed = state.index !== prevIndex || (state.title !== prevTitle && !relocalized);
    if (changed) overlay.clear();
    syncNav();
    syncPlay();
    syncFigureTools();
    const pk = `${state.index}\u0001${state.kind}\u0001${state.number}\u0001${state.title}\u0001${state.sci}\u0001${state.total}\u0001${state.page}`;
    if (pk !== plateKey) {
      plateKey = pk;
      renderPlate(changed && plateSeen, { fit: !relocalized }); // relocalized: fitted in setLang's layout pass
      plateSeen = true;
      drawer.setCurrent(state.index, state.page);
      if (sheet.isOpen) sheet.setMeta(sheetMeta());
    }
    const bk = `${state.hasFigure}|${state.animationTitle}|${state.beats.map((b) => `${b.t}:${b.text}`).join('|')}`;
    if (changed || bk !== beatsKey) {
      beatsKey = bk;
      state.beat = -2;
      showBeat(state.beats.length && state.hasFigure ? beatAt(state.t) : -1);
      placeNarration();
    }
    if (openPop === popLayers) buildLayers(); // re-placed by measure() below when the spread changed
    else if (openPop === popExport && changed) buildExport();
    const rk = `${state.hasFigure && state.beats.length > 0}`;
    if (changed || rk !== reserveKey) {
      reserveKey = rk;
      measure();
    }
    if (announceSpreads && changed) {
      const name = `${state.number ? `${kindName()} ${state.number}, ` : ''}${state.title}${state.sci ? `, ${state.sci}` : ''}`;
      announce(t('{name}. {index} of {total}.', { name: name || t('Page {n}', { n: state.index + 1 }), index: state.index + 1, total: state.total }));
    }
  }

  /**
   * Update the 5-second clock. Cheap: call every frame.
   * @param {number} t          loop time in seconds
   * @param {number} [duration] loop length (default: last value, 5)
   * @param {boolean} [playing]
   */
  let ringP = -1;
  function setClock(t, duration, playing) {
    const d = duration > 0 ? duration : state.duration || 5;
    const tt = Number.isFinite(t) ? ((t % d) + d) % d : 0;
    state.t = tt;
    if (d !== state.duration) {
      state.duration = d;
      if (timeInput) timeInput.max = String(d);
    }
    const p = tt / d;
    if (Math.abs(p - ringP) > 0.001) {
      ringP = p;
      ringFill.style.strokeDashoffset = (RING_C * (1 - p)).toFixed(2);
    }
    if (playing !== undefined && !!playing !== state.playing) {
      state.playing = !!playing;
      syncPlay();
    }
    overlay.setClock(state.playing, d);
    if (state.beats.length && state.hasFigure) {
      const i = beatAt(tt);
      if (i !== state.beat) showBeat(i);
    }
    if (openPop === popLayers) syncTime(false);
  }

  /**
   * Lay out plate labels. Call every frame while a figure is visible.
   * @param {Array<{id:string,text?:string,detail?:string,x:number,y:number,depth?:number,visible?:boolean,occluded?:boolean,focus?:boolean,rank?:number,mark?:'dot'|'ring'|'tick',r?:number,headPx?:number}>} items
   *        anchors in viewport CSS px (depth: larger = farther; used for phone selection and the
   *        far-anchor cue; focus: spotlight this label and open its card while true;
   *        rank: importance, higher first, when not every label fits; mark (or item.label.mark):
   *        what to draw at the anchor — 'dot' (default, body features), 'ring' (a hairline circle
   *        of radius r + 1.5 around a face feature, when its projected radius r ≥ 2.5 px) or
   *        'tick' (no mark, the leader stops 2.5 px short); headPx: the head's projected length,
   *        under 40 px every face mark is a tick. Texts arrive in the current language)
   * @param {{x:number,y:number,w:number,h:number,spine?:number[],avoid?:Array<number[]|object>,caption?:number[]|object}} area
   *        recto page rect in CSS px (spine: optional [x0,y0,x1,y1] gutter line labels stay right
   *        of, while inspecting — pass it whenever inspecting; avoid: printed text on the page,
   *        as [x0,y0,x1,y1] or {x0,y0,x1,y1} rects (caption block, running head), that label rows
   *        step over; caption: one such rect. Without them, phones keep rows off the recto's
   *        printed head and foot by proportion)
   * @param {{x0:number,y0:number,x1:number,y1:number}|null} [fig]  the figure's screen rectangle
   *        (CSS px): label pills — and the layers popover — keep off it. Pass it whenever a
   *        figure stands, also with labels off (the popover uses it)
   */
  function renderLabels(items, area, fig) {
    if (destroyed) return;
    overlay.render(items, area, fig);
    if (area && area.w > 0 && area.h > 0) {
      page.x = area.x;
      page.y = area.y;
      page.w = area.w;
      page.h = area.h;
      page.ok = true;
    }
  }

  /** @param {boolean} turning  a page is in flight */
  function setBusy(turning) {
    state.busy = !!turning;
    el.toggleAttribute('data-busy', state.busy);
    // only the labels are in flux; the live region (page announcements) must not sit in a busy subtree
    overlay.setBusy(state.busy);
  }

  const toastTimers = new Set();
  /**
   * Show a short message above the toolbar (also announced), in the language
   * shown: the App words its toasts when it sends them, so one made just
   * before a language switch (an export finishing around it) arrives — or
   * still shows — in the other language (see toastIn).
   * @param {string} text
   * @param {{ duration?: number }} [o]
   */
  function toast(text, { duration = 2600 } = {}) {
    if (!text || destroyed) return;
    endExport(); // the App reports an export's outcome with a toast
    text = toastIn(String(text), state.lang) ?? String(text);
    const t = h('div', { class: 'lam-toast' }, text);
    toasts.append(t);
    while (toasts.children.length > 3) toasts.firstElementChild.remove();
    el.toggleAttribute('data-toasting', true);
    void t.offsetWidth; // commit the start state so the entrance transitions
    t.classList.add('is-in');
    const out = setTimeout(() => {
      toastTimers.delete(out);
      t.classList.remove('is-in');
      const rm = setTimeout(() => {
        toastTimers.delete(rm);
        t.remove();
        if (!toasts.children.length) el.toggleAttribute('data-toasting', false);
      }, state.reducedMotion ? 0 : 340);
      toastTimers.add(rm);
    }, duration);
    toastTimers.add(out);
    announce(text);
  }
  /** After a language switch: the toasts on screen in the new language; one that cannot be told in it goes at once. */
  function relocalizeToasts() {
    for (const node of [...toasts.children]) {
      const words = toastIn(node.textContent, state.lang);
      if (words == null) node.remove();
      else if (words !== node.textContent) node.textContent = words;
    }
    if (!toasts.children.length) el.toggleAttribute('data-toasting', false);
  }

  /** @param {string} name  'webgpu' | 'webgl2' (shown in the help card only) */
  function setBackend(name) {
    state.backend = String(name ?? '');
    if (openPop === popHelp) buildHelp();
  }

  /**
   * Text of the spread for the reading sheet (single-page views) and screen
   * readers. A leading title block — a <header>, or the run of .kicker, h2,
   * .sci and .family that opens the text — becomes the sheet's own header,
   * so the sheet never prints the title twice; the screen-reader copy keeps it.
   * @param {string} html  sanitized HTML (sanitized again here); '' hides "Read"
   * @param {{ title?: string }} [o]  sheet title when the text has no title
   *        block (defaults to the spread's title)
   */
  function setReading(html, { title = '' } = {}) {
    const has = !!(html && String(html).trim());
    state.reading = has;
    state.readingTitle = title ? String(title) : '';
    // the same spread in another language (ui.setLang, then the App's new text):
    // an open sheet keeps the reader's place and focus instead of jumping to the top
    const place = relocalizedAt === state.index && sheet.isOpen ? sheet.savePlace() : null;
    relocalizedAt = -1;
    const frag = has ? sanitizeHTML(html) : null;
    srReading.replaceChildren(...(frag ? [frag.cloneNode(true)] : []));
    // The copy is visually hidden: its links ("look closer") must not be Tab
    // stops, or sighted keyboard users lose the focus ring for several presses
    // (and Enter would change the figure unseen). Screen readers still reach
    // and activate them with their reading cursor; everyone else gets the same
    // actions through the label pills and the reading sheet.
    for (const f of srReading.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')) f.tabIndex = -1;
    sheet.setContent(frag, frag ? takeTitleBlock(frag) : null);
    sheet.setMeta(sheetMeta());
    placeNarration();
    if (place) sheet.restorePlace(place);
    bRead.hidden = !has;
    if (!has) closeSheet(false);
  }

  /** @param {{ accent?: string, ink?: string, paper?: string }} t  CSS colours */
  function setTheme(t = {}) {
    const vars = { accent: '--lam-accent', ink: '--lam-ink', paper: '--lam-paper' };
    for (const k of Object.keys(vars)) {
      const v = t?.[k];
      if (typeof v === 'string' && (typeof CSS === 'undefined' || CSS.supports('color', v))) el.style.setProperty(vars[k], v);
    }
    // small accent text (kickers, numerals, Read) must reach AA on white and on its own tint
    if (typeof t?.accent === 'string') el.style.setProperty('--lam-accent-text', accentText(t.accent));
  }

  /**
   * Replace the book (title + contents) without rebuilding the UI — also the
   * same book in another language: an open contents drawer keeps its scroll
   * and the focused entry.
   */
  function setBook(b = {}) {
    state.book = normalizeBook(b);
    bookTitle.textContent = state.book.title;
    drawer.setBook(state.book);
    drawer.setCurrent(state.index, state.page);
    drawer.localize({ kind: bookKind() });
    relayoutSoon(); // the plate label's widths: measured in the next layout pass
  }

  // ------------------------------------------------------------------ language
  /**
   * Write every string the chrome owns in the current language (t()), and
   * rebuild what is open: popovers (focus kept on the same control), the
   * help card, the drawer's and sheet's own words, the label overlay's name
   * and an open label card. Runs at creation and from setLang().
   * @param {{ defer?: boolean }} [o]  defer: write only; what must be measured
   *        (the plate label's fit, an open popover's place) waits for the next
   *        layout pass (relayoutSoon), where the layers popover is rebuilt too
   *        — by then with the layer names the App sent in the new language
   */
  function localize({ defer = false } = {}) {
    library.setAttribute('aria-label', t('Back to the library'));
    libraryText.textContent = t('Library');
    topSound.setAttribute('aria-label', t('Sound'));
    tool(helpBtn, t('Keyboard shortcuts'));
    tool(bContents, t('Contents'));
    tool(bPrev, t('Previous page'));
    tool(bNext, t('Next page'));
    tool(bLayers, t('Layers & dissection'));
    bExport.setAttribute('aria-label', t('Export'));
    syncExportTip();
    bSound.setAttribute('aria-label', t('Sound'));
    bFull.setAttribute('aria-label', t('Full screen'));
    bPlay.dataset.key = keyCap('Space');
    bRead.setAttribute('aria-label', t('Read this page'));
    bRead.textContent = t('Read');
    bar.setAttribute('aria-label', t('Book controls'));
    srReading.setAttribute('aria-label', t('Page text'));
    popLayers.setLabel(t('Layers and dissection'));
    popExport.setLabel(t('Export'));
    popHelp.setLabel(t('Keyboard shortcuts'));
    // generated text in CSS (the look-closer rows' cue, in the reading sheet): a CSS
    // string, set on the sheet so a new word restyles that subtree, not the whole chrome
    sheet.el.style.setProperty('--lam-t-show', JSON.stringify(t('Show')));
    langSwitch.set(state.lang);
    drawer.localize({ kind: bookKind() });
    sheet.localize();
    sheet.setMeta(sheetMeta());
    overlay.localize();
    syncPlay();
    syncSound();
    syncFullscreen();
    renderPlate(false, { fit: !defer });
    placeNarration();
    timeTextKey = -1;
    layersKey = '';
    if (openPop && defer) {
      // the layers popover is rebuilt (keeping its focused control) and every
      // open popover placed in the next layout pass (measure)
      if (openPop !== popLayers) {
        const keep = popFocusKey();
        if (openPop === popExport) buildExport();
        else if (openPop === popHelp) buildHelp();
        restorePopFocus(keep);
      }
      relayoutSoon();
    } else if (openPop) {
      const keep = popFocusKey();
      if (openPop === popLayers) buildLayers();
      else if (openPop === popExport) buildExport();
      else if (openPop === popHelp) buildHelp();
      restorePopFocus(keep);
      openPop.place(frame());
      coverLabels();
    }
    hideTip(); // a tooltip in the old language
  }
  /** aria-label + tooltip of a toolbar button. */
  function tool(btn, label) {
    btn.setAttribute('aria-label', label);
    btn.dataset.tip = label;
  }
  /** Which control of the open popover has focus, as something that survives a rebuild. */
  function popFocusKey() {
    const a = document.activeElement;
    if (!openPop || !openPop.el.contains(a)) return null;
    if (a === openPop.el) return { self: true };
    if (a === explodeInput) return { field: 'explode' };
    if (a === timeInput) return { field: 'time' };
    if (a.dataset?.layer) return { layer: a.dataset.layer };
    if (a.dataset?.labels) return { labels: true };
    if (a.dataset?.mode) return { mode: a.dataset.mode };
    return { self: true };
  }
  function restorePopFocus(k) {
    if (!k || !openPop) return;
    let to = null;
    if (k.field === 'explode') to = explodeInput;
    else if (k.field === 'time') to = timeInput;
    else if (k.layer) to = layersBody.querySelector(`[data-layer="${CSS.escape(k.layer)}"]`);
    else if (k.labels) to = labelsRow;
    else if (k.mode) to = exportBody.querySelector(`[data-mode="${CSS.escape(k.mode)}"]`);
    (to?.isConnected ? to : openPop.el).focus({ preventScroll: true });
  }

  /**
   * Switch the chrome to `lang` (call after i18n's setLang(lang), from the
   * App's applyLang): every string, the switch, open surfaces, the bands
   * (texts change size: bottomReserve() is measured again).
   * @param {'en'|'es'} lang
   * @param {{ libraryHref?: string }} [o]  the library link in that language ('#/es/')
   */
  function setLang(lang, { libraryHref: href } = {}) {
    if (destroyed) return;
    state.lang = isLang(lang) ? lang : getLang();
    if (typeof href === 'string' && href) library.setAttribute('href', href);
    relocalizedAt = state.index; // the App's next setSpread and setReading are this spread in the new language
    langJob++; // a request still in flight no longer decides what the switch shows
    langSwitch.setBusy(false);
    // every string now; the plate label's widths, the bands (the words may
    // wrap differently) and an open popover's place in one layout pass, once
    // the App has sent its own texts too (see relayoutSoon)
    localize({ defer: true });
    relocalizeToasts(); // nothing on screen stays in the old language
    relayoutSoon();
  }
  let relocalizedAt = -1;

  // A language switch rewrites every string of the chrome, the App swaps its
  // pages and texts in the same step, and <html lang> changes with it, which
  // lays every text out again. Reading layout between those writes would pay
  // for that several times over (it did: 37 ms at 4× CPU). So setLang and
  // setBook only write; what they must measure — the plate label's widths
  // and fit, the bands bottomReserve() reports, an open popover's place —
  // waits for one pass: when the App asks for a measured value
  // (bottomReserve) or before the next frame, whichever comes first.
  let relayoutDue = false;
  let relayoutRaf = 0;
  function relayoutSoon() {
    if (destroyed) return;
    relayoutDue = true;
    if (!relayoutRaf) relayoutRaf = requestAnimationFrame(flushRelayout);
  }
  function flushRelayout() {
    if (relayoutRaf) cancelAnimationFrame(relayoutRaf);
    relayoutRaf = 0;
    if (!relayoutDue || destroyed) return;
    relayoutDue = false;
    plateNeed = measurePlateNeed();
    plateW = 0; // fit the label again even when its width holds: its words changed
    measure(); // the bands, the plate label (fitPlateWidth), an open popover rebuilt and placed
  }

  /**
   * The reader chose a language with the switch: ask the App. It may answer
   * with a promise; the switch breathes (aria-busy) until it settles, then
   * shows the language actually in place (refused or superseded: the old one).
   */
  let langJob = 0;
  function requestLang(lang) {
    const job = ++langJob;
    const r = emit({ type: 'lang', lang });
    const done = () => {
      if (job !== langJob) return;
      langSwitch.setBusy(false);
      langSwitch.set(state.lang);
    };
    if (typeof r?.then !== 'function') return done();
    langSwitch.setBusy(true);
    r.then(done, (err) => {
      console.error('[lamina/ui] language change failed', lang, err);
      done();
    });
  }

  /**
   * Handle a keydown with the book's shortcuts (see SHORTCUTS). The App
   * calls this from its own keydown listener.
   * @param {KeyboardEvent} e
   * @returns {boolean} true when handled (preventDefault already called)
   */
  function runShortcut(e) {
    if (destroyed || !e || e.defaultPrevented) return false;
    const m = matchShortcut(e);
    if (!m) return false;
    const t = e.target;
    if (t instanceof Node && el.contains(t) && t.closest?.('.lam-pop, .lam-drawer, .lam-sheet')) return false;
    return handleShortcut(e, m);
  }

  /** Act on a matched shortcut. @returns {boolean} handled (preventDefault called) */
  function handleShortcut(e, m) {
    if (drawer.isOpen || sheet.isOpen) return false;
    switch (m.id) {
      case 'prev':
        if (canGoPrev()) emit({ type: 'prev' });
        break;
      case 'next':
        if (canGoNext()) emit({ type: 'next' });
        break;
      case 'play':
        if (!state.hasFigure) return false;
        togglePlay();
        break;
      case 'labels':
        if (!state.hasFigure) return false;
        setLabels(!state.labels, true);
        break;
      case 'explode':
        if (!state.hasFigure) return false;
        setExplode(state.explode > 0.5 ? 0 : 1, true);
        break;
      case 'layer': {
        const l = state.layers[m.n];
        if (!state.hasFigure || !l) return false;
        setLayer(l.id, !l.visible, true);
        break;
      }
      case 'export':
        if (!state.hasFigure) return false;
        requestExport('svg-color', e.timeStamp); // refused while one is in flight (the ring says so)
        break;
      case 'fullscreen':
        emit({ type: 'fullscreen' });
        break;
      case 'contents':
        openDrawer();
        break;
      case 'reset-view':
        emit({ type: 'reset-view' });
        break;
      case 'help':
        togglePopover(popHelp, helpAnchor(), true);
        break;
      default:
        return false;
    }
    e.preventDefault();
    return true;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    clearTimeout(idleTimer);
    clearTimeout(tipTimer);
    clearTimeout(plateTimer);
    cancelAnimationFrame(relayoutRaf);
    clearTimeout(announceTimer);
    clearTimeout(exportSayTimer);
    clearTimeout(exportGiveUpTimer);
    for (const t of toastTimers) clearTimeout(t);
    window.removeEventListener('keydown', onKeyCapture, true);
    window.removeEventListener('pointerdown', onPointerDownCapture, true);
    window.removeEventListener('pointerup', onPointerUp, true);
    window.removeEventListener('pointercancel', onPointerUp, true);
    window.removeEventListener('pointermove', onActivity);
    window.removeEventListener('wheel', onActivity);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('fullscreenchange', syncFullscreen);
    document.removeEventListener('webkitfullscreenchange', syncFullscreen);
    document.fonts?.removeEventListener?.('loadingdone', onFonts);
    mqReduced.dispose();
    mqCompact.dispose();
    mqCoarse.dispose();
    mqShort.dispose();
    overlay.dispose();
    langSwitch.destroy();
    el.remove();
  }

  // ------------------------------------------------------------------ init
  applyReducedMotion();
  if (theme) setTheme(theme);
  localize();
  setBook(state.book);
  syncNav();
  syncFigureTools();
  measure();
  activity();
  // the plate label's widths were measured with whatever fonts were ready: once webfonts land, again
  const onFonts = () => {
    fitPlateWidth(true);
    fitLibraryWidth(true);
  };
  document.fonts?.addEventListener?.('loadingdone', onFonts);

  return {
    /** Root element of the overlay. */
    el,
    setSpread,
    setClock,
    renderLabels,
    setBusy,
    toast,
    announce,
    setBackend,
    setReading,
    setTheme,
    setBook,
    setSound,
    setLang,
    /** The language the chrome is in. */
    get lang() {
      return state.lang;
    },
    runShortcut,
    /**
     * Show or hide all chrome (labels stay). For clean captures (`ui=0`).
     * @param {boolean} visible
     */
    setChromeVisible(visible) {
      state.chrome = !!visible;
      el.toggleAttribute('data-chrome-off', !state.chrome);
      if (!state.chrome) {
        closePopover(false);
        closeDrawer(false);
        closeSheet(false);
      }
      measure();
    },
    /**
     * Height (CSS px, from the bottom edge) of the band the awake chrome
     * occupies — toolbar plus beat caption — so the App can keep the book out
     * of it when framing. 0 while the chrome is hidden (ui=0). Cached: cheap
     * to poll every frame; it changes on resize and chrome visibility.
     * @returns {number}
     */
    bottomReserve: () => {
      if (relayoutDue) flushRelayout(); // after a language switch: measured once, now
      return reservePx;
    },
    /**
     * Tell the UI the camera frames a single page (portrait), so the verso's
     * text is off screen and "Read" must show at any width. Until the App
     * calls this, the viewport's aspect (< 0.9) stands in.
     * @param {boolean} on
     */
    setSinglePage,
    /** Open the contents drawer (the App's "C" shortcut). @returns {true} */
    openContents() {
      openDrawer();
      return true;
    },
    /** @returns {boolean} true if it was open */
    closeContents: () => closeDrawer(),
    /** @param {'contents'|'layers'|'export'|'help'|'reading'} name */
    open: (name) => SURFACES[name]?.open(keyboardModality),
    /** @param {'contents'|'layers'|'export'|'help'|'reading'} [name]  omit to close everything */
    close: (name) => {
      if (name) return !!SURFACES[name]?.close();
      let any = false;
      for (const k of Object.keys(SURFACES)) any = !!SURFACES[k].close() || any;
      overlay.closeCard();
      return any;
    },
    /** @param {'contents'|'layers'|'export'|'help'|'reading'} name */
    toggle: (name) => (SURFACES[name]?.is() ? SURFACES[name].close() : SURFACES[name]?.open(keyboardModality)),
    /** @param {'contents'|'layers'|'export'|'help'|'reading'} name */
    isOpen: (name) => !!SURFACES[name]?.is(),
    /** Snapshot of the UI state (for automation and tests). */
    getState: () => ({
      lang: state.lang,
      index: state.index,
      total: state.total,
      title: state.title,
      number: state.number,
      hasFigure: state.hasFigure,
      layers: state.layers.map((l) => ({ ...l })),
      labels: state.labels,
      explode: state.explode,
      playing: state.playing,
      t: state.t,
      beat: state.beat,
      sound: state.sound,
      busy: state.busy,
      idle: state.idle,
      compact: state.compact,
      short: state.short,
      singlePage: state.singlePage,
      reading: state.reading,
      reducedMotion: state.reducedMotion,
      backend: state.backend,
      open: Object.keys(SURFACES).filter((k) => SURFACES[k].is()),
      // where each label pill is drawn (slot, row, rect, opacity, reserved while the App hides it)
      labels: overlay.snapshot(),
    }),
    destroy,
  };
}

// ------------------------------------------------------------------ toasts in the language shown
// A toast's words are the App's, translated when it sent them. Told in
// another language: English words are dictionary keys; words in another
// language are found by their value among the messages of the dictionaries
// toasts come from (the App's, the UI's, the exporter's and the shell's),
// one reverse map per language, built the first time it is needed.
const TOAST_DOMAINS = new Set(['app', 'ui', 'export', 'shell']);
const toastKeys = new Map(); // lang → Map(value → English key)
/** The English key a toast's words were made from (in any loaded language), or null. */
function toastKey(text) {
  let known = false;
  for (const lang of LANGS) {
    if (lang === DEFAULT_LANG || !isLoaded(lang)) continue;
    known = true;
    if (hasT(text, lang)) return text;
    let rev = toastKeys.get(lang);
    if (!rev) {
      rev = new Map();
      for (const [key, value, domain, kind] of dictionaryEntries(lang)) if (kind === 'key' && TOAST_DOMAINS.has(domain) && !rev.has(value)) rev.set(value, key);
      toastKeys.set(lang, rev);
    }
    const key = rev.get(text);
    if (key != null) return key;
  }
  return known ? null : text; // English only so far: English words
}
/** A toast's words (in whichever language they were made) in `lang`; null when they cannot be told in it. */
function toastIn(text, lang) {
  const key = toastKey(text);
  if (key == null) return null;
  if (lang === DEFAULT_LANG) return key;
  return hasT(key, lang) ? tl(lang, key) : null;
}

/**
 * Run `fn` once the next frame has been painted (a task after the frame's
 * rendering), or after 100 ms when no frame comes (a hidden page).
 * @param {() => void} fn
 */
function afterPaint(fn) {
  let ran = false;
  const go = () => {
    if (ran) return;
    ran = true;
    fn();
  };
  requestAnimationFrame(() => setTimeout(go, 0));
  setTimeout(go, 100);
}

/**
 * Insert `node` into reading text just before its Sources (the list with
 * class "sources" and the heading above it), or at the end when there are none.
 * @param {HTMLElement} container
 * @param {Node} node
 */
function insertBeforeSources(container, node) {
  const list = container.querySelector(':scope > .sources');
  const head = list?.previousElementSibling;
  container.insertBefore(node, head?.matches('h3, h4') ? head : list);
}

/**
 * Detach the title block that opens a reading fragment — a <header>, or the
 * leading run of .kicker / h2 / .sci / .family elements — for the sheet's
 * header. The fragment keeps the rest.
 * @param {DocumentFragment} frag
 * @returns {DocumentFragment|null}
 */
function takeTitleBlock(frag) {
  let n = frag.firstChild;
  while (n && n.nodeType === 3 && !n.textContent.trim()) n = n.nextSibling;
  if (!n || n.nodeType !== 1) return null;
  const out = document.createDocumentFragment();
  if (n.tagName === 'HEADER') {
    out.append(...n.childNodes);
    n.remove();
    return out;
  }
  let title = false;
  while (n) {
    const next = n.nextSibling;
    if (n.nodeType === 3 && !n.textContent.trim()) {
      n.remove();
      n = next;
      continue;
    }
    if (n.nodeType !== 1 || !n.matches('.kicker, h2, .sci, .family') || (title && n.tagName === 'H2')) break;
    title ||= n.tagName === 'H2';
    out.append(n);
    n = next;
  }
  return out.firstChild ? out : null;
}

/** Parse #rgb, #rrggbb or rgb()/rgba() into [r, g, b] (0–255), else null. */
function parseRGB(css) {
  const v = String(css).trim();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (m) {
    const x = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
    return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(v);
  return m ? [+m[1], +m[2], +m[3]] : null;
}

/** WCAG relative luminance of an sRGB colour (0–255 channels). */
function luminance(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrastRatio = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/**
 * The accent as small text: AA (4.5:1, with a little margin) on white and on
 * the accent's own 10 % tint (Read button, current contents entry). A bright
 * accent is darkened toward black only as far as needed; a dark one is kept.
 * @param {string} css
 * @returns {string}
 */
export function accentText(css) {
  const rgb = parseRGB(css);
  if (!rgb) return `color-mix(in srgb, ${css} 78%, #000)`;
  const white = [255, 255, 255];
  const tint = rgb.map((c) => c * 0.1 + 255 * 0.9);
  for (let i = 0; i <= 30; i++) {
    const k = 1 - i * 0.02;
    const c = rgb.map((v) => v * k);
    if (contrastRatio(c, white) >= 4.6 && contrastRatio(c, tint) >= 4.6) {
      return i === 0 ? css : `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
    }
  }
  return `#${rgb.map((v) => Math.round(v * 0.4).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The export progress ring: the play button's ring geometry with a short
 * accent arc, stacked over the icon so the busy state never changes a
 * button's size. The HTML wrapper is what turns and fades in (ui.css
 * .lam-busy), so the animation can run on the compositor.
 * @returns {HTMLSpanElement}
 */
function busyRing() {
  return h(
    'span',
    { class: 'lam-busy', 'aria-hidden': 'true' },
    s(
      'svg',
      { viewBox: '0 0 32 32', focusable: 'false' },
      s('circle', { class: 'lam-ring-track', cx: 16, cy: 16, r: RING_R }),
      s('circle', { class: 'lam-busy-arc', cx: 16, cy: 16, r: RING_R, 'stroke-dasharray': `${(RING_C * 0.28).toFixed(2)} ${RING_C.toFixed(2)}` })
    )
  );
}

function normalizeBook(b = {}) {
  return {
    id: b?.id ?? '',
    title: b?.title ?? '',
    subtitle: b?.subtitle ?? '',
    kicker: b?.kicker ?? '',
    contentsLabel: b?.contentsLabel ?? '', // '' = the drawer's own t('Contents')
    kind: b?.kind === 'Lesson' || b?.kind === 'Plate' ? b.kind : '',
    plates: Array.isArray(b?.plates)
      ? b.plates
          .filter((p) => p && Number.isFinite(+p.spread))
          .map((p) => ({
            number: p.number ?? '',
            title: p.title ?? p.common ?? '',
            sci: p.sci ?? p.scientific ?? '',
            spread: +p.spread,
            page: p.page === 'left' || p.page === 'right' ? p.page : '', // the page of its spread it is printed on
          }))
      : [],
  };
}
