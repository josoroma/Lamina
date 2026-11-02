# Architecture

Plain ES modules, no framework. One `WebGPURenderer` and one stage live for the
whole session; routes swap a *view* (library ↔ reader) on top of them. Every
route names its language, and a language switch changes the view in place.

```
index.html ─ src/app/boot.js ─┬─ engine/renderer.js   WebGPURenderer (WebGL 2 fallback), custom tone curve
   │                          ├─ engine/stage.js      scene, light rig, ground shadow, CameraRig, floating `world`
   │                          ├─ app/route.js         #/<lang>/<book>?… ↔ { lang, book, params }; hrefs carry the language
   │                          ├─ app/Library.js       the series’ closed Books on a shelf + the language switch → #/<lang>/<id>
   │                          └─ app/Reader.js        one Book + FigureHost + UI + input + audio + export
   │                               │
   ├─ i18n/index.js  t/tl/msg, setLang/loadLang/onLang, formatters, preference
   ├─ i18n/edition.js  loadEdition(id, lang) = composeEdition(English, es/<id>.js) + making texts
   ├─ i18n/schema.js   the manifest key set (ID · TEXT · SAME · SCI · TAXON · LOCALE), walk()
   └─ i18n/es/*.js     Spanish dictionaries, one per owner area (DOMAINS, PATTERNS)
                                   │
   src/books/<id>.js + es/<id>.js ►│ engine/typeset   buildSides(edition) → PageSpec[]; renderPage(spec) → canvas + hits
   src/books/making/{index,es}.js  │ app/pages.js     PageCache: canvases → CanvasTextures, LRU, 6 ms/frame print budget
                                   │ engine/book      Book: boards, leaves (arc-length curl), blocks, pick(), events
                                   │ engine/figures   FigureHost: mount/fold/fit/yaw/explode/layers/labels/clock
                                   │   └ subjects/<type>/index.js  createFigure(params, ctx) (+ drawStep for lessons)
                                   │       └ kits/{ink,patterns,tube,petal,sdf}
                                   │ engine/ui        toolbar, language switch, contents drawer, popovers, labels, captions, sheet
                                   │ engine/input.js  drag/flick/tap/pinch/wheel → turns, figure yaw, inspect, zoom
                                   │ engine/audio.js  procedural WebAudio page sounds (connectBookAudio)
                                   └ engine/export    ID-buffer → marching squares → Bézier SVG (in a language); PNG
```

## World and units

- Page: width 1.0, height 1.38 (world units). The book lies in XZ, Y up, spine
  along Z at x = 0, recto at x ∈ [0, 1], verso at x ∈ [−1, 0], head at −Z.
- Figures are authored in **cm**; FigureHost stands them at page-local
  (s = 0.5, z = −0.02) and scales them into 0.78 × 0.86 × 0.6 page units
  (`FIGURE_AREA` in `src/engine/figures/contract.js`).
- `Book.opened = k` means k leaves lie on the left: the spread shows the back
  of leaf k−1 (verso) and the front of leaf k (recto). Closed front = 0, closed
  back = leafCount.

## Rendering choices

- `alpha: true`, clear `(0xffffff, 0)` over CSS white: the background is never
  tone-mapped. Custom `laminaToneMapping` (linear to 0.8, soft hue-preserving
  shoulder) keeps near-white paper white *and* shaded.
- Light rig (`createLights`): hemisphere 1.85, key 2.55 with a fitted shadow
  frustum (3072² desktop, 2048² on touch), rim 0.45. The ink kit's hatching
  thresholds auto-calibrate to it; change intensities only with `calibrateInk`.
- Page curl: each leaf is a 44 × 22 grid evaluated on the CPU from an
  arc-length model `φ(s, ζ) = (1−p)φR(s) + p(π − φL(s)) + β·K(s/W) + τ(s/W)ζ`
  with analytic normals (no stretching, real shadows, picking works).
  Only the top leaf of each side and the leaves in flight are drawn; the rest of
  each side is a striated block mesh.
- Pop-ups fold with `1 − spreadOpening(leaf)` (spring), so they fold when their
  page lifts *and* when the previous page falls back onto them.
- The author's wordmark is drawn from path data (`typeset/marks.js`, `Path2D`,
  `evenodd`) into the boards' foil mask, so it is stamped, bevelled and glints
  like the title — no image loads, works in `OffscreenCanvas`.

## Reader wiring (src/app/Reader.js)

- `buildSides(edition)` → sides in contract page order; plates are the
  `plate-figure` / `lesson-figure` sides (even indices); the making leaf comes
  before the back board.
- Textures: the two sides of the visible spread print immediately; neighbours
  (±2 leaves) print within a 6 ms/frame budget; a turning leaf's faces print at
  `turnstart`; riffles print only their destination. `PageCache.trim()` drops
  pages beyond capacity at once.
- Figures: mounted for leaves `opened − 1 … opened + 1`, others released. A pop-up
  whose shaders are not compiled yet is held folded and stands 0.3–0.9 s later
  (warm-up order: the landing page, then the next, then the previous) instead of
  freezing the turn; `lamina.goTo/plate` resolve once it may stand.
- Framing: `stage.rig.setFitBox(spread ∪ active figure box)` so tall pop-ups stay in
  view; `rig.setInsets` from the UI bands. Inspect frames the figure's whole loop
  hull, as close as it fits.
- Labels: `host.labelItems(camera, w, h)` → ranked (focused, look-closer,
  switched-on layer, figure order) → capped (10 / 8 / 6 by width; on a head under
  40 px on screen one face label, under 80 px two) → `ui.renderLabels(items, area, fig)`,
  `fig` being the figure's projected loop box (`figure.loopBounds` when it declares one)
  that pills keep off. Each item carries its translated text, its `mark`, `r` (the
  feature's radius on screen) and `headPx` (the head's length on screen), at the
  camera-side anchor (`alt`, `host.labelAnchor(label)`); occlusion has a 0.4 s grace
  (1.6 s after a blink); a paused look-closer seeks the nearest moment that anchor is
  in view.
- Phones: a tap on a head label (or its look-closer note) frames the head itself,
  `host.regionSphere(labelId)`, and follows it through the loop until inspect ends.
- Near misses: input asks the reader's `nearFigure(x, y, pointerType)` on every press
  that misses the figure; a press just beside it turns the figure instead of lifting
  the page (the radius depends on the pointer type).
- Keyboard: `ui.runShortcut(e)` (the UI's SHORTCUTS table renders the help card
  too) plus PageUp/PageDown/Home/End, `+`/`-`/`0` zoom, `I` inspect. Input and keys
  are off until a view activates.
- History: `#/<lang>/<id>?plate=N` (or `?spread=K`) is kept current with `replaceHash`
  (route.js: `replaceState`, keeping `history.state`).

## Languages

**Editions.** `loadEdition(id, lang)` returns the book a page is printed from:
English is the manifest itself (`locale: 'en'`); Spanish is
`composeEdition(english, src/books/es/<id>.js)` walked along `src/i18n/schema.js`
— ids, numbers, theme and figure params always from English, text from the
translation, English where a text is missing (reported, never blank), plus
`edition.making` (the prompt, the book's brief, the closing line). Every composed
object and array carries its English counterpart: `en(node)` (a non-enumerable
symbol), so decisions made from words read the English and both editions are
styled identically. Until a translation file exists the Spanish edition is the
English text under Spanish chrome.

**Strings.** Code keeps English and translates where text leaves:

| string | translated in |
|---|---|
| UI chrome, app, library, boot | `t(key)` at the output site (`src/i18n/es/{ui,app,shell}.js`) |
| printed pages | `tl(page.book.locale, key)` in the typesetter — a page is a pure function of its spec (`typeset.js`) |
| figure labels, details, layer names and hints, beats | `FigureHost` (per-label memo per language), the Reader (layers popover) — keys in the subject's dictionary |
| SVG key, part and colour `<title>`s, `<title>`/`<desc>` | the exporter, in the `lang` it is given (`export.js` + the subject's dictionary) |
| figure `title` | never (a developer label) |

Dictionaries: `src/i18n/es/<domain>.js` default-exports explicit keys (exact
English, may hold `{placeholders}`); `PATTERNS` holds match patterns for strings
built at run time (`'Rattle segment {n}'`, each with a ≥ 3-letter literal word;
captured values that are keys are translated too). Table literals that reach `t()`
later are marked `msg('…')`. A miss returns the English and is recorded
(`missingKeys()`); hyphenation (`hyphen-es.js`), collation and number formats
(`fmtNumber` · `fmtSeconds` · `fmtPercent` · `fmtList` · `quote`, `es-CR`
conventions, U+00A0 only) follow the language.

**Routes and resolution.** `#/<lang>/` (library), `#/<lang>/<book>?…`. A route
without a language (`#/`, `#/serpientes`, or `index.html?lang=es#/…`) resolves to the
stored preference (`localStorage['lamina.lang']`, written only when the reader picks
with the switch), else the first `navigator.languages` entry that is `en` or `es`,
else English — and is rewritten in place. Book ids are never two-letter codes.

**The switch** (`createLangSwitch`, a WAI-ARIA radio group of autonyms *English ·
Español*) sits in the reader's top bar and the library header. Choosing runs boot's
`changeLang(lang, { persist: true })`:

```
1  await loadLang(lang)            dictionaries (dynamic import, cached)
2  await view.prepareLang(lang)    the edition, fonts, and the pages on screen pre-typeset — nothing visible changes
3  (a newer request supersedes this one → stop)
4  history.replaceState(#/<lang>/…)   the same entry: Back never toggles the language
5  setLang(lang)                   <html lang>, the preference, onLang listeners
6  view.applyLang(lang)            synchronous: pages on screen swapped (old texture freed after the leaf took
                                   the new one), other cached pages dropped and re-printed one per idle callback,
                                   host.relocalize() + setBeats(), ui.setLang(), contents, title, URL, announcement
7  lamina.ready resolves after two frames
```

The reader leaves User Timing marks on the way — `lamina:lang:prepare`, `:start`,
`:visible` (the pages on screen swapped), `:all` (every kept page printed again) — so a
performance check can measure the switch (`performance.getEntriesByName(…)`). Code that
rewrites the URL goes through `replaceHash(hash)` (route.js), never `location.hash =`:
it keeps `history.state`, on which Back after a switch relies.

The figure is never remounted: time, layers, explode, labels, the focused label,
yaw and inspect survive a switch. `applyLang` throws when the new edition does not
fit the book's structure (never with a validated edition); boot then rebuilds the
view in the new language at the same spread.

**Export.** `exportFigureSVG({ …, lang })` writes the key, part tooltips, `<title>`
and `<desc>` in `lang` with `xml:lang` on the root; the Reader snapshots the
language, edition and plate when the command arrives, so a switch mid-export cannot
mix languages. `exportFileName({ book, plate, kind, lang })` →
`serpientes-terciopelo-color.svg` / `-line.svg` / `.png`, and in Spanish
`-color-es.svg` / `-lineal-es.svg` / `-es.png`.

## Automation (`window.lamina`) — used by capture scripts and evals

`ready` (Promise; re-arms on a route change, including a language-only one),
`lang` (getter), `setLang(lang, { persist })` → resolves true once the new language
shows (session-wide: kept across views), `goTo(spread)`, `plate(n)`, `next()`,
`prev()`, `turnTo(spread, page?)` (animated; `page` `'left'|'right'` is where a
portrait screen lands), `settle(ms)` (no leaf turning, pop-up standing), `setTime(t)`,
`play()`, `pause()`, `setLayer(id, on)`, `setExplode(a)`, `setLabels(on)`,
`inspect(on)`, `exportSVG('color'|'line')` → SVG string, `spreadOf(layout, part?)` →
the first spread showing that layout (`'note'`, `'glossary'`, `'making'` with
`'prompt'|'brief'`), `i18nMissing()` → keys shown untranslated since the language
loaded, `editionReport(lang?)` → what composing the edition found (`fallback`,
`missing`, `lengths`…: empty for a complete one), `info()` → `{ book, lang, opened,
spreads, plates, active, layers, labels, time, … }`, the live getters `manifest`,
`plates`, `sides` (they change with a switch), plus `book`, `host`, `ui`, `stage`,
`renderer` for debugging. The lab (`window.lab`) adds `lang`, `setLang(lang)`,
`i18n: { t, hasT, missing }`, `info().strings` (the figure's English strings: labels,
layers, parts and colours, the SVG's generated names, beats) and `info().missing`
(those the lab's language lacks).

## Key APIs (details in the source headers)

| module | entry points |
|---|---|
| `i18n/index.js` | `LANGS`, `getLang/setLang/loadLang/isLoaded/onLang`, `t(key, vars)`, `tl(lang, key, vars)`, `hasT`, `msg`, `placeholders`, `missingKeys`, `dictionaryEntries(lang)` → `[key, value, domain, kind]`, `dictionaryProblems(lang)` → `[{ domain, key, kind, problem }]`, `preferredLang`, `fmtNumber/fmtSeconds/fmtPercent/fmtList/compareText/quote`, `loadEdition`, `lastReport(id, lang)`, `en` |
| `i18n/edition.js` · `schema.js` | `composeEdition(en, xx, { lang, making }) → { edition, report }`, `composeMaking(enMod, xxMod, { id, lang }) → { making, report }`, `loadEdition`, `lastReport` (report: `fallback`, `notes`, `missing`, `extra`, `changedIds`, `lengths`, `types`, `unknown`, `order`); `MANIFEST`, `MAKING_SCHEMA`, `walk(schema, value, visit(node, value, path, parent, key))`, `identicalAllowed`, `isTaxon`, `isTextKind` |
| `books/index.js` | `BOOKS = [{ id, load, es }]` (`es` resolves `{ default: null, missing: true }` until the translation exists), `MAKING = { en, es }`, `loadManifest(id)` |
| `app/route.js` | `parseRoute(hash)` → `{ lang \| null, book, params }`, `routeHash({ lang, book, params })`, `withLang(hash, lang)`, `bookHref(id, params, lang)`, `libraryHref(lang)`, `replaceHash(hash)` |
| `engine/book/Book.js` | `new Book({ leafCount, theme, reducedMotion })`, `setLeafTexture(i, 'front' \| 'back', tex)`, `next/prev/goTo/setOpened`, `beginDrag/dragTo/endDrag/cancelDrag`, `pick(raycaster)`, `leafFrame`, `spreadOpening`, `leafVisible`, `surfaceY`, `freeze/unfreeze`, events `change turnstart turnend riffle release` |
| `engine/stage.js` | `createStage(renderer)` → `{ scene, camera, world, rig, lights, resize, update, setBook }`; `rig.setFitBox/setInsets/focusPage/inspectSphere/exitInspect/orbit/zoomBy/pan/reset`; `world.userData.restPose` (export passes hold the float) |
| `engine/figures/FigureHost.js` | `mount(leaf, spec)`, `retain`, `active`, `setPlaying/setTime/setExplode/setLayer/setLabels/setYaw`, `focusPoint`, `figureRadius`, `pickFigure`, `labelItems(camera, w, h)` (items with `mark`, `r`, `headPx`), `labelAnchor(label, leaf?)`, `regionSphere(labelId, target?, leaf?)`, `beats/currentBeat`, `relocalize()`, `setBeats(leaf, beats)`, events `mounted layers beat` |
| `engine/typeset` | `loadFonts(theme, { manifest })`, `buildSides(edition)`, `renderPage(spec, { width, stepDrawer })` → `{ canvas, hits, overflow, scale, hOverflow, key }`, `figureAnchorUV()`; layouts get `P.lineFit` / `P.fitWidth` and may set `layout.fit = { minScale, step }`; `text.paragraph(fonts, src, { align, hyphenate, wholeWords })`, `text.withLang(lang, fn)`, `hyphenate(word, lang)`; `marks.AUTHOR_MARKS`, `drawAuthorMark(g, id, { cx \| x, top, width, color })`, `markAspect(id)` |
| `engine/ui` | `createUI({ root, book, onCommand, theme, lang, libraryHref })` → `setSpread`, `setClock`, `renderLabels(items, area, fig)`, `setReading`, `toast`, `announce`, `runShortcut`, `setChromeVisible`, `setLang(lang, { libraryHref })`, `lang`, `getState()`; command `{ type: 'lang', lang }`; `createLangSwitch({ value, onChange, size, className })`, `keyCap(key)` |
| `engine/export` | `exportFigureSVG({ renderer, mount, camera, mode, width, title, caption, credit, labels, keep, lang })`, `exportFileName({ book, plate, kind, lang })`, `regionNames(figure)`, `exportPNG`, `downloadText/downloadBlob` |
| `engine/input.js` | `createInput({ canvas, stage, book, host, onTap, onHover, onInspect, onNavigate, nearFigure, keyboard })` |
| `engine/audio.js` | `createAudio()`, `connectBookAudio(book, audio)` |

## How the builds were parallelised

1. The lead built a *verified skeleton* first (renderer, stage, a curling leaf,
   the ink kit, FigureHost, lab, screenshot tool) and wrote
   `docs/architecture/CONTRACTS.md`: units, frozen signatures, manifest schema,
   canonical ids, text budgets, page order, file ownership.
2. One workflow ran ten specialists with **disjoint file ownership**: book
   engine, typesetter, UI, figure host + export, one agent per subject (snakes,
   flowers, skulls) and one content pipeline per book (author → two fact-checkers
   → reviser). Every agent verified its own work with headless screenshots on
   both backends and reported APIs, verification and known issues.
3. The lead integrated against the reported APIs, then ran review rounds.
4. The bilingual edition followed the same shape: a written design reviewed
   adversarially first; a stub of the i18n API landed before anyone started (so every
   area imported the final names from minute one); then thirteen areas with disjoint
   files — core i18n, app shell, reader, UI, typesetter, figures and export, books,
   tooling and docs, the subjects — while a separate workflow translated the
   manifests from a snapshot, each area verifying on its own private build and port.
5. Release rounds close what the build left open: every report's hand-offs are
   grouped by recipient, the lead decides where two areas disagree (one wording for a
   pill and its look-closer note, which labels a pose hides, how verbatim texts are
   set), each area fixes only its own files, and verifiers with different lenses
   re-check the result on both backends, both languages, phone and desktop. English
   edits made after a translation snapshot are logged and synced into the Spanish
   files at the end (`validate-books --lang es` reports the drift).

The archived scripts are in `docs/prompts/` (`02-build-workflow.js` and later);
reuse their shape for new books (one content pipeline, one translation pipeline and
one subject agent per book).


Paths in this reference are relative to the selected series app: `series/lamina/`
in the catalog, or the repository root for a standalone copy. See
[series.md](series.md) for selection and bootstrap commands.
