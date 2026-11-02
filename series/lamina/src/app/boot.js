// App entry: one renderer + stage for the whole session; routes swap the
// view (library ↔ reader) without re-creating the GPU device.
//
// Only the view boot activates may touch shared state (title, URL, the
// camera rig's fit box and book). A route that is superseded while it builds
// (Back pressed during a slow open, Library clicked while a plate meshes) is
// aborted: it tears itself down at once and never activates.
//
// Every route names its language (#/en/…, #/es/…, route.js) and only boot
// sets the session's (i18n setLang). A switch — a view's language control
// (requestLang), a typed #/<lang>/ or lamina.setLang — runs changeLang:
// dictionaries and the view's edition load while the page stays as it is,
// then the URL, <html lang> and the view change in one synchronous step.
//
// View contract (createLibrary / createReader get { lang, requestLang }):
//   view.prepareLang(lang): Promise   load what the switch needs; nothing visible changes.
//                                     Given the language shown (a newer request kept it),
//                                     stop a preparation in flight and drop what one printed
//   view.applyLang(lang)              swap synchronously, after setLang(lang); a throw
//                                     asks boot to rebuild the view in `lang` instead
// A view without them is rebuilt in the new language where its URL left it.
import * as THREE from 'three/webgpu';
import { createRenderer } from '../engine/renderer.js';
import { createStage, WORLD } from '../engine/stage.js';
import { DEFAULT_LANG, getLang, isLang, loadLang, onLang, preferredLang, setLang, t } from '../i18n/index.js';
import { BOOKS } from '../books/index.js';
import { bookHref, libraryHref, parseRoute, replaceHash, withLang } from './route.js';
import './app.css';

const canvas = document.querySelector('#stage');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let shell = null; // { renderer, backend, stage, neutralFit } once a GPU backend runs
let view = null;
let viewLang = null; // the language and book of the view shown (or being built)
let viewBook = '';
let loading = null; // AbortController of the route being built
let gpuLost = false;
let halted = false; // no GPU, or lost for good: nothing will route again
let langToken = 0; // the newest language request; an older one stops at its next step
let routeSeq = 0; // the newest route; an older one does not turn the view after its await
let chosen = null; // the language the reader picked with a switch this session (Back and Forward keep it)

// ------------------------------------------------------------------ automation
// window.lamina.ready resolves once the view the URL names shows its first
// frame in the language the URL names. It re-arms on every route or
// language change, also when read between `location.hash = …` and the
// hashchange that routes it, so `await lamina.ready` never resolves early
// for the previous view.
const readiness = { promise: null, resolve: null, settled: true };
function armReady() {
  if (!readiness.settled) return;
  readiness.settled = false;
  readiness.promise = new Promise((r) => (readiness.resolve = r));
}
function settleReady() {
  if (readiness.settled) return;
  readiness.settled = true;
  readiness.resolve(true);
}
/** Settle lamina.ready two frames from now (the change is drawn), if `current()` still holds then. */
function settleSoon(current = () => true) {
  requestAnimationFrame(() => requestAnimationFrame(() => current() && settleReady()));
}
/** The view the URL names: `${lang}|${book}` (a route without a language opens in the current one). */
function routeKey() {
  const { lang, book } = parseRoute();
  return `${lang ?? getLang()}|${book ?? '(library)'}`;
}
armReady();
/** Session-wide handles: setApi keeps them, and a view's api never replaces them. */
const SESSION_KEYS = ['ready', 'version', 'backend', 'renderer', 'stage', 'lang', 'setLang'];
window.lamina = { version: '0.1.0', view: 'loading' };
Object.defineProperties(window.lamina, {
  ready: {
    enumerable: true,
    get() {
      if (readiness.settled && !halted && routeKey() !== `${viewLang}|${viewBook}`) armReady();
      return readiness.promise;
    },
  },
  lang: { enumerable: true, get: () => getLang() },
  /** Switch the session's language (URL and view follow); resolves true once it shows. */
  setLang: { enumerable: true, value: (lang, { persist = false } = {}) => changeLang(lang, { persist }) },
});
/** Replace the view-specific automation API (session-wide handles stay). */
function setApi(viewName, api = {}) {
  for (const k of Object.keys(window.lamina)) if (!SESSION_KEYS.includes(k)) delete window.lamina[k];
  // descriptors, not values: a view's getters (manifest, sides) stay live through a language switch
  const own = Object.getOwnPropertyDescriptors(api);
  for (const k of [...SESSION_KEYS, 'view']) delete own[k];
  for (const d of Object.values(own)) d.configurable = true;
  Object.defineProperties(window.lamina, own);
  window.lamina.view = viewName;
}

// ------------------------------------------------------------------ errors
/**
 * A quiet error card over the stage.
 * @param {string} message
 * @param {unknown} [err]
 * @param {'library'|'reload'} [action]
 */
function showFatal(message, err, action = 'library') {
  document.querySelector('.fatal')?.remove();
  const el = document.createElement('div');
  el.className = 'fatal';
  el.setAttribute('role', 'alert');
  const p = document.createElement('p');
  p.textContent = message;
  el.append(p);
  if (err) {
    const pre = document.createElement('pre');
    pre.textContent = String(err?.message ?? err);
    el.append(pre);
  }
  if (action === 'reload') {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t('Reload');
    b.addEventListener('click', () => location.reload());
    el.append(b);
  } else {
    const a = document.createElement('a');
    a.href = libraryHref();
    a.textContent = t('Back to the library');
    el.append(a);
  }
  document.body.appendChild(el);
}

/** Does the library have this book? (route.js lower-cases the id: #/es/Serpientes opens serpientes) */
const isBook = (id) => BOOKS.some((b) => b.id === id);
/** A book id from the URL as the card quotes it: escapes decoded, at most 40 characters. */
function clipId(id) {
  let s = id;
  try {
    s = decodeURIComponent(id);
  } catch {
    // a stray "%": quote it as typed
  }
  return s.length > 40 ? `${s.slice(0, 39)}…` : s;
}

// ------------------------------------------------------------------ language
/** Load a language's dictionaries; false when they cannot be fetched (offline, a stale chunk after a deploy). */
async function ensureLang(lang) {
  try {
    await loadLang(lang);
    return true;
  } catch (err) {
    console.warn(`[lamina] the "${lang}" dictionaries could not be loaded`, err);
    return false;
  }
}

/** The document's own text (the views set the title while they show). */
const metaDescription = document.querySelector('meta[name="description"]');
function localizeDocument() {
  canvas.setAttribute('aria-label', t('Interactive 3D book'));
  metaDescription?.setAttribute('content', t('Interactive 3D scientific books: explore nature, atoms, cells and the science of a beach campfire.'));
  if (!view) document.title = t('Lámina — Living Scientific Plates');
}
onLang(localizeDocument);

/** The switch a view's language control asks for: the reader's choice, kept this session and stored. */
const requestLang = (lang) => changeLang(lang, { persist: true });

/**
 * Switch the session to `lang` (design-i18n §1.2). Resolves true once the
 * view shows it; false when a newer request or a new view superseded it, or
 * its dictionaries could not be fetched (the page then stays as it was).
 * @param {string} lang
 * @param {{ persist?: boolean }} [o]  persist: the reader chose it with a
 *   switch (stored as the preference; Back and Forward keep it this session)
 */
async function changeLang(lang, { persist = false } = {}) {
  if (!isLang(lang)) throw new RangeError(`Unknown language "${lang}"`);
  const token = ++langToken;
  const current = () => token === langToken;
  armReady();
  const loaded = await ensureLang(lang);
  if (!current()) return false;
  if (!loaded) {
    replaceHash(withLang(location.hash, getLang())); // a typed #/es/… names the language still shown
    settleSoon(current);
    return false;
  }
  /** The one synchronous step that commits the switch (before the view's swap). */
  const commit = () => {
    replaceHash(withLang(location.hash, lang)); // in place: no hashchange, no new history entry
    setLang(lang, { persist });
    if (persist) chosen = lang;
    viewLang = lang;
  };
  const v = view; // null while a route builds: it is rebuilt in `lang` below
  if (lang === viewLang && (v || loading)) {
    commit(); // the language shown (or being built): keep the choice and the URL naming it
    // a switch to another language that this request supersedes stops
    // preparing, and the view lets go of what it printed for it
    v?.prepareLang?.(lang)?.catch?.((err) => console.warn('[lamina] dropping a superseded language switch', err));
    if (v) settleSoon(current); // a route still building settles lamina.ready itself
    return true;
  }
  if (v?.prepareLang && v.applyLang) {
    try {
      await v.prepareLang(lang); // editions, fonts, pre-printed pages: nothing visible changes yet
    } catch (err) {
      // offline or a stale chunk (EditionLoadError): expected, and the view says so
      (err?.name === 'EditionLoadError' ? console.warn : console.error)('[lamina] the language switch could not be prepared', err);
      if (current()) {
        // A typed language URL may have started the request. Keep its place,
        // but name the edition that is still on screen after a failed fetch.
        replaceHash(withLang(location.hash, getLang()));
        settleSoon(current);
      }
      return false;
    }
    if (!current()) return false;
    commit();
    try {
      v.applyLang(lang);
      settleSoon(current);
      return true;
    } catch (err) {
      console.error('[lamina] the view could not switch language in place; rebuilding it', err);
    }
  } else commit(); // a route is building, or the view cannot switch in place: build it in `lang`
  if (!shell || halted) {
    settleSoon(current); // no GPU: only the document's text follows
    return true;
  }
  await route({ rebuild: true });
  return getLang() === lang;
}

// ------------------------------------------------------------------ history
// Back and Forward never undo a language the reader chose: after a switch,
// a traversal to an entry in another language opens in the chosen one.
// Links and typed URLs still name their own, and following one leaves the
// choice as it was (Back from an English link returns to the Spanish book).
// The Navigation API names traversals; without it, the entries boot has
// routed carry a mark.
let traversedTo = null; // URL of the latest Back / Forward (Navigation API)
globalThis.navigation?.addEventListener?.('navigate', (e) => {
  if (e.navigationType === 'traverse') traversedTo = e.destination?.url ?? null;
  else if (e.navigationType !== 'replace') traversedTo = null;
});
const isTraversal = (e) => (globalThis.navigation ? e.newURL === traversedTo : history.state?.lamina === true);
function markEntry() {
  if (history.state?.lamina !== true) history.replaceState({ ...(history.state ?? {}), lamina: true }, '');
}
/** Where a URL points inside a book: did a route change more than its language? */
function placeOf(url) {
  const { params } = parseRoute(new URL(url, location.href).hash);
  return `${params.get('plate')}|${params.get('spread')}`;
}

// ------------------------------------------------------------------ first language
// The first route's language: the URL's (#/es/…, or the ?lang=es alias),
// else the reader's stored choice, the browser's languages, English. Its
// dictionaries load while the renderer starts, so even the "no GPU" card
// speaks it; if they cannot be fetched the session opens in English.
const wanted = parseRoute().lang ?? preferredLang();
const [firstLang, gpu] = await Promise.all([
  ensureLang(wanted).then((ok) => (ok ? wanted : DEFAULT_LANG)),
  createRenderer(canvas).catch((err) => ({ err })),
]);
if (!langToken) {
  // (unless lamina.setLang chose one meanwhile)
  setLang(firstLang);
  replaceHash(withLang(location.hash, firstLang)); // #/ → #/en/, in place: history.length unchanged
}
localizeDocument();
if (gpu.err) {
  console.error('[lamina] no GPU backend', gpu.err);
  showFatal(t('Lámina needs WebGPU or WebGL 2, and this browser could not start either.'), gpu.err, 'reload');
  halted = true;
  settleReady(); // capture scripts see the card instead of waiting forever
} else start(gpu);

function start({ renderer, backend, lowPower }) {
  const stage = createStage(renderer, { reducedMotion });
  stage.quality = lowPower ? 'low' : 'high';
  Object.assign(window.lamina, { backend, renderer, stage });

  const ro = new ResizeObserver(resize);
  function resize() {
    stage.resize(canvas.clientWidth, canvas.clientHeight);
  }
  ro.observe(canvas);
  resize();

  // the spread box the rig frames while a route builds (no view owns the rig then)
  const Wb = WORLD.pageW + WORLD.coverOverhang;
  const Hb2 = WORLD.pageH / 2 + WORLD.coverOverhang;
  const neutralFit = new THREE.Box3(new THREE.Vector3(-Wb, 0, -Hb2), new THREE.Vector3(Wb, 0.08, Hb2));
  shell = { renderer, backend, stage, neutralFit };

  // GPU device / WebGL context loss (driver reset, GPU-process crash, a phone
  // reclaiming a background tab): three r186 never draws again (_onDeviceLost
  // sets _isDeviceLost for good; WebGL has no webglcontextrestored path), and
  // the page canvases behind the book textures lose their pixels with the GPU
  // process. Drop the view and reload: the reader keeps #/<lang>/<book>?plate=N
  // in the hash and ?gl= lives in location.search, so it reopens where it was.
  const GPU_RELOAD_KEY = 'lamina:gpu-reload-at';
  renderer.onDeviceLost = (info) => {
    renderer._onDeviceLost?.(info); // three's console report
    if (gpuLost) return;
    gpuLost = halted = true;
    renderer.setAnimationLoop(null);
    loading?.abort();
    try {
      view?.dispose?.();
    } catch (err) {
      console.warn('[lamina] dispose after GPU loss', err);
    }
    view = null;
    viewLang = null;
    viewBook = '';
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(GPU_RELOAD_KEY)) || 0;
    } catch {
      // storage blocked: allow one reload
    }
    if (Date.now() - last < 60_000) {
      // lost again right after a reload: stop instead of looping
      showFatal(t('The graphics device stopped responding.'), null, 'reload');
      settleReady();
      return;
    }
    try {
      sessionStorage.setItem(GPU_RELOAD_KEY, String(Date.now()));
    } catch {
      // storage blocked
    }
    const reload = () => location.reload();
    if (document.visibilityState === 'hidden') document.addEventListener('visibilitychange', reload, { once: true });
    else reload();
  };

  addEventListener('hashchange', (e) => {
    if (gpuLost) return location.reload(); // never build a view on a dead renderer
    document.querySelector('.fatal')?.remove();
    const { lang } = parseRoute();
    if (chosen && lang && lang !== chosen && isTraversal(e)) replaceHash(withLang(location.hash, chosen));
    traversedTo = null;
    route({ from: e.oldURL });
  });

  // Start drawing before the first route resolves: a superseded first route
  // must not leave the stage blank while it finishes building.
  const timer = new THREE.Timer();
  renderer.setAnimationLoop((ts) => {
    timer.update(ts);
    const dt = Math.min(timer.getDelta(), 1 / 20);
    stage.update(dt);
    view?.frame?.(dt);
    renderer.render(stage.scene, stage.camera);
  });
  console.info(`[lamina] backend: ${backend}`);
  route();
}

/**
 * Show the view the URL names. The view stays for a new ?plate=N or a new
 * language (switched in place); any other route builds a new view.
 * @param {{ rebuild?: boolean, from?: string|null }} [o]  rebuild: build the
 *   same route again (in a new language); from: the URL a hashchange left
 */
async function route({ rebuild = false, from = null } = {}) {
  if (gpuLost || !shell) return;
  const { renderer, backend, stage, neutralFit } = shell;
  const r = parseRoute();
  let lang = r.lang ?? getLang();
  const { book, params } = r;
  const bookKey = book ?? '(library)';
  const seq = ++routeSeq;
  replaceHash(withLang(location.hash, lang)); // the URL names its language (old links, the ?lang= alias)
  markEntry();
  if (view && !rebuild && bookKey === viewBook) {
    // same book (or the library): a new language switches in place, and
    // a new ?plate=N / ?spread=K turns to it (a view rebuilt for the
    // language opened there already). A language that cannot load (its
    // dictionaries unreachable) keeps the one shown, and the URL says so,
    // but the view still turns to the place the URL names.
    const v = view;
    const moved = !from || placeOf(from) !== placeOf(location.href);
    if (lang !== viewLang) await changeLang(lang);
    if (moved && view === v && seq === routeSeq) v.api?.navigate?.(params);
    return;
  }
  langToken++; // a switch still preparing belonged to the view this route replaces
  loading?.abort(); // a superseded view disposes itself right here
  const ctl = (loading = new AbortController());
  const { signal } = ctl;
  viewLang = lang;
  viewBook = bookKey;
  armReady();
  document.body.classList.add('is-loading');
  view?.dispose?.();
  view = null;
  stage.setBook?.(null);
  stage.rig.reset(); // no view owns the rig while this route builds: default framing
  stage.rig.setFitBox(neutralFit);
  setApi('loading');
  if (!(await ensureLang(lang))) {
    // its dictionaries cannot be fetched: open the route in the language already loaded
    lang = viewLang = getLang();
    replaceHash(withLang(location.hash, lang));
  }
  if (signal.aborted) return;
  setLang(lang); // before the view builds: it typesets and labels in its language
  let failed = null;
  try {
    let next;
    const common = { renderer, stage, reducedMotion, signal, lang, requestLang };
    if (book) {
      if (!isBook(book)) throw new RangeError(`Unknown book "${book}"`); // said below, without fetching the reader
      const { createReader } = await import('./Reader.js');
      if (signal.aborted) return;
      next = await createReader({ ...common, backend, bookId: book, params, onLibrary: () => (location.hash = libraryHref()) });
    } else {
      const { createLibrary } = await import('./Library.js');
      if (signal.aborted) return;
      next = await createLibrary({ ...common, onOpen: (id) => (location.hash = bookHref(id)) });
    }
    if (signal.aborted) {
      next?.dispose?.();
      return;
    }
    loading = null;
    view = next;
    next.activate?.();
    // the reader frames its book (and tall pop-ups) itself; the library sets its own fit box
    if (book) stage.setBook?.(next.book);
    stage.rig.snap();
    // automation API of the current view only (no stale reader methods in the library)
    setApi(book ? 'reader' : 'library', view.api);
  } catch (err) {
    if (signal.aborted) return; // superseded while building (AbortError): nothing to report
    loading = null;
    failed = err;
  } finally {
    if (!signal.aborted) document.body.classList.remove('is-loading');
  }
  if (failed && book && !isBook(book)) {
    // a mistyped or outdated link, not a failure: the card says so in the route's language
    console.warn(`[lamina] there is no book "${book}"`);
    localizeDocument(); // no book shows: the session's own title
    showFatal(t('There is no book called “{name}” in this library.', { name: clipId(book) }));
    setApi('error');
  } else if (failed?.name === 'EditionLoadError') {
    // offline, or a stale chunk after a deploy: a reload fetches the files again
    console.warn('[lamina] failed to open', bookKey, failed);
    localizeDocument();
    showFatal(failed.lang === 'es' ? t('The Spanish edition could not be loaded. Reload the page to try again.') : t('The English edition could not be loaded. Reload the page to try again.'), null, 'reload');
    setApi('error');
  } else if (failed) {
    console.error('[lamina] failed to open', bookKey, failed);
    localizeDocument();
    showFatal(t('Lámina could not open this book.'), failed);
    setApi('error');
  }
  // first frame with content → ready (used by capture scripts), unless a
  // language switch began meanwhile: that one settles it
  const token = langToken;
  settleSoon(() => !signal.aborted && token === langToken);
}
