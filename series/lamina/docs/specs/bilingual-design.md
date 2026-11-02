> Archived from `.scratch/bilingual/design-i18n.md` (2026-11-01), the research output of [`docs/prompts/06a-research-workflow.js`](../prompts/06a-research-workflow.js), with its adversarial review appended at the end. Images and probe scripts it mentions stayed in the git-ignored scratch folder.

# Lámina — English / Español edition: implementation design

*Design for the bilingual books, the author on the covers and the "How this book was made" pages.
Written 2026-11-01 against the working tree at that time (another workflow was repairing
`src/app`, `src/engine/ui`, `src/engine/figures`, `src/engine/export`, `src/subjects/snakes` and
`src/subjects/skulls` while this was written, so **line numbers are a snapshot**: the dictionary
key is the exact English string, so `grep -n` finds it again).*

Evidence produced for this design (all under `.scratch/bilingual/i18n-shots/`): prototype renders of the
covers, title page, imprint and making pages built from the real typeset modules (`probe.js`,
`probe-serp.png`, `probe-calaveras.png`, `probe-flores.png`, `probe-flores-cover-mark.png`,
`probe-imprint.png`, `probe-cover-026.png`), the hyphenation prototype (`hyphen-es.proto.mjs`), fit measurements (`measure.js`, `measure2.js`, `inflate.js`, `texts.json`),
baseline page renders (`base-*.png`, `cal-lesson1.png`, `serp-sources.png`), the reader at 2× DPR
(`switch-cost.png`) and the phone top bar (`phone-top-crop.png`). Nothing in `src/`, `scripts/` or
`public/` was modified.

---

## 0. Decisions at a glance

The seven fixed decisions stand; nothing below challenges them. Where they left a choice open,
this document decides:

| open point | decision |
|---|---|
| where translation happens | **At the presentation boundary.** Code keeps English strings as keys; `t()` runs only where text leaves for the screen, a canvas, an SVG or the a11y mirror. Subjects need **no code changes**; figure strings are translated by `FigureHost`, the Reader and the exporter. Code never compares translated text. |
| dictionary files | **One file per owner area**, merged into one flat table per language: `src/i18n/es/{shell,app,ui,typeset,export,snakes,flowers,skulls}.js` plus the aggregator `src/i18n/es/index.js`. A key defined twice with different values is a validator error. |
| strings built from data at run time (`Rattle segment 3`) | Dictionary **template keys** (`'Rattle segment {n}': 'Segmento {n} del cascabel'`), matched after exact keys. A template must contain a literal word of ≥ 3 letters. Finite sets get exact keys (`Teeth (upper left)` … not `Teeth ({jaw} {side})`). |
| language of typesetting | A page is typeset in **its edition's** language (`page.book.locale`) through `tl(lang, …)`, never the global language, so a page is a pure function of its spec. UI, app and FigureHost use the live `t()`; the exporter uses the `lang` it is given (default: the current one). |
| style decisions made from text (how-to icons, warning badge, binomial italics) | Made on the **English source** through `en(node)` back-references that the edition loader attaches. Both editions are styled identically by construction. |
| number formats | `es`: decimal comma and no-break-space grouping from 5 digits (`Intl` `es-CR` + `useGrouping: 'min2'`), percent with a no-break space (`Intl` `es`), lists with `Intl.ListFormat('es')`, glossary order with `Intl.Collator('es')`. |
| "How this book was made" | **One extra leaf before the back board** (spread parity kept): its recto opens the section with the user's original prompt, facing the glossary; its verso, the last page of the book facing the back endpaper, prints that book's brief. Body type 26 px design size (≥ the 25 px of sources and colophon), never below 25 px. |
| author mark | Drawn from its path data with `Path2D` (`src/engine/typeset/marks.js`, generated from and checked against `public/author/josoroma.svg`). Foil-stamped through the existing foil mask on both boards; own colours on the title page and in the imprint credit. |
| SVG export file names | `serpientes-terciopelo-color.svg` / `-line.svg` / `.png` in English (unchanged); `serpientes-terciopelo-color-es.svg` / `-lineal-es.svg` / `-es.png` in Spanish. |
| keyboard shortcuts | Same keys in both languages (only labels and key-cap names translate). |
| history | A language switch replaces the current history entry (no Back-button language toggling); links between views carry the language. |

---

## 1. Architecture

### 1.1 Module map (new ★, changed ●)

```
src/i18n/index.js        ★ runtime: getLang/setLang/loadLang/onLang, t/tl/hasT, formatters, preference
src/i18n/edition.js      ★ pure (Node-safe): composeEdition, loadEdition, en(), EN symbol
src/i18n/schema.js       ★ pure: the manifest key set (text vs id) used by compose + validator
src/i18n/es/index.js     ★ aggregator: imports the 8 domain dictionaries, exports { DOMAINS }
src/i18n/es/{shell,app,ui,typeset,export,snakes,flowers,skulls}.js   ★ dictionaries (one owner each)
src/books/index.js       ● registry gains es loaders + MAKING loaders
src/books/making.js      ★ verbatim prompt + per-book briefs (English)
src/books/es/making.js   ★ Spanish translations of the above
src/books/es/<id>.js     ★ Spanish editions (translators, in progress)
src/app/route.js         ● #/<lang>/<book>?… parsing and hrefs
src/app/boot.js          ● language resolution, rewrite, changeLang orchestration, view contract
src/app/Library.js       ● editions, language switch in the header, applyLang
src/app/Reader.js        ● editions, prepareLang/applyLang, making spread, export names, automation
src/app/pages.js         ● PageCache.setSides/isStale/refresh (stale-while-revalidate)
src/app/a11y.js          ● t()/tl(), making pages, author credit
src/engine/ui/*          ● t() everywhere, ui.setLang(), 'lang' command; ★ langswitch.js (+ css)
src/engine/typeset/*     ● tl(page lang), hyphenation by language (★ hyphen-es.js), ★ marks.js,
                           ★ layouts/making.js, author on boards/title/imprint, hOverflow report
src/engine/figures/FigureHost.js   ● translated labelItems/beats, relocalize(), setBeats()
src/engine/export/*      ● lang option, translated key/titles/desc, xml:lang, exportFileName()
src/lab/lab.js, lab.html ● ?lang=, info().strings
scripts/*                ● validate (--lang, --fit), audit (--lang, --i18n), capture (--lang); ★ i18n-strings.mjs
```

### 1.2 Data flow

```
 location.hash ──parseRoute──► { lang|null, book, params }
                                   │ lang missing → preferredLang() → history.replaceState(#/<lang>/…)
                                   ▼
 boot ─── await loadLang(lang) ─── setLang(lang) ─── route()
                                                       │
            ┌──────────────────────────────────────────┴───────────────────────────┐
            ▼                                                                      ▼
   createLibrary({ lang, requestLang })                          createReader({ lang, requestLang })
     loadEdition(id, lang) ×3 → covers                             loadEdition(id, lang) → buildSides → PageCache …

 language change (switch click, lamina.setLang(), or a hashchange that only changes /<lang>/):
   boot.changeLang(lang, { persist })
     1  await loadLang(lang)                 dictionaries (dynamic import, cached)
     2  await view.prepareLang(lang)         edition(s) + fonts — async, nothing visible changes
     3  (a newer request supersedes → stop)
     4  history.replaceState(withLang(hash, lang))          no hashchange fires (MDN)
     5  setLang(lang, { persist })           sync: <html lang>, localStorage, onLang listeners
     6  view.applyLang(lang)                 sync: re-typeset visible pages, UI, labels, title, URL
     7  settleReady() after two frames       lamina.ready resolves for automation
```

`replaceState` does not fire `hashchange` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/hashchange_event)),
so step 4 never re-enters the router.

### 1.3 State and events

- **The current language** lives in `src/i18n/index.js` (module state). `getLang()` reads it;
  only boot calls `setLang()` (views ask through `requestLang`; automation through `lamina.setLang`).
- **Preference**: `localStorage['lamina.lang']` holds `'en'|'es'`, written **only** when the reader
  picks a language with the switch (`persist: true`). Opening a link that names a language does not
  overwrite the preference. Every storage access is wrapped in `try/catch` (the property access
  itself throws `SecurityError` when storage is blocked —
  [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)).
- **Resolution** (`preferredLang()`), for a route without a language: stored preference → the first
  entry of `navigator.languages` whose primary subtag is `en` or `es` (the array is ordered by
  preference — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/languages)) → `'en'`.
- **`onLang(cb)`** listeners: boot only (it updates the canvas `aria-label` and `<title>` fallback).
  Engine modules (UI, FigureHost, typeset, export) do **not** subscribe; their owner calls them in a
  fixed order inside `applyLang`, which keeps re-localisation deterministic and testable.
- **View key** in boot becomes `${lang}|${book ?? '(library)'}` so `lamina.ready` re-arms on a
  language-only route change and resolves after `applyLang` (capture scripts rely on it).
- Book ids may never be language codes (`en`, `es`, or any `^[a-z]{2}$`): validator error.

### 1.4 API signatures

#### `src/i18n/index.js` (owner: core)

```js
/** @typedef {'en'|'es'} Lang */
export const LANGS;            // Object.freeze(['en', 'es']) — also the switch order
export const DEFAULT_LANG;     // 'en'
export const LANG_NAMES;       // { en: 'English', es: 'Español' } — autonyms, never translated
export const LANG_SHORT;       // { en: 'EN', es: 'ES' }
export const STORAGE_KEY;      // 'lamina.lang'
export function isLang(x): boolean
export function getLang(): Lang
export function loadLang(lang): Promise<void>        // idempotent; 'es' → import('./es/index.js'); merges domains
export function isLoaded(lang): boolean
export function setLang(lang, { persist = false } = {}): boolean   // sync; returns "changed"; sets
        // document.documentElement.lang (when a document exists), writes the preference if persist,
        // then calls every onLang listener (errors caught and logged). Throws if !isLoaded(lang).
export function onLang(cb: (lang, prev) => void): () => void
export function readPreference(): Lang|null
export function writePreference(lang): void
export function preferredLang(languages = globalThis.navigator?.languages ?? []): Lang
export function t(key, vars?): string                // current language
export function tl(lang, key, vars?): string         // explicit language (typeset, export, validator)
export function hasT(key, lang = getLang()): boolean // exact or template hit ('en': always true)
export function missingKeys(lang = getLang()): string[]   // looked up, not found, since loadLang
export function dictionaryEntries(lang): Array<[key, value, domain]>   // validator / tooling
export function fmtNumber(x, { minFrac = 0, maxFrac = 2, lang } = {}): string
export function fmtSeconds(x, { lang } = {}): string       // 1 decimal: '2.4 s' | '2,4 s'
export function fmtPercent(fraction, { lang } = {}): string // 0.85 → '85%' | '85 %' (NBSP)
export function fmtList(items, { lang } = {}): string      // Intl.ListFormat conjunction
export function compareText(a, b, { lang } = {}): number   // Intl.Collator(lang, { sensitivity: 'base', numeric: true })
export function quote(text, { lang } = {}): string         // “…” | «…»
export { EN, en, composeEdition } from './edition.js';
export function loadEdition(id, lang = getLang()): Promise<object>   // wraps edition.loadEdition
```

`t(key, vars)`:
1. `'en'` → the key itself; `'es'` → exact entry, else the first **template** entry whose compiled
   pattern matches (`'Rattle segment {n}'` → `/^Rattle segment (.+?)$/`; literal parts regex-escaped;
   templates tried longest-literal first; results memoised per language in a bounded `Map`).
2. Not found → the English key (never a raw placeholder, never an empty string), and the key is
   added to `missingKeys()`; in dev builds (`import.meta.env.DEV`) one `console.debug` per key.
3. `{name}` placeholders are then filled from `vars` (captured template values first, explicit `vars`
   win). Unknown placeholders stay literal so mistakes are visible.

Locale table used by the formatters: numbers `en`/`es-CR`, percent `en`/`es`, collation and lists
`en`/`es`. In `es-CR` CLDR the decimal sign is `,` and the group sign a no-break space; in `es` the
percent pattern is `#,##0 %` with a no-break space and `minimumGroupingDigits` is 2
([Unicode CLDR 49, cldr-json](https://github.com/unicode-org/cldr-json/tree/main/cldr-json/cldr-numbers-full/main)).
`useGrouping: 'min2'` groups only from five digits
([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat)).
Observed in Node 26.13 (ICU 79.1): `es-CR` + `min2` → `2,4` · `1234,5` · `12 345,67`;
`Intl.NumberFormat('es', { style: 'percent' })` → `85 %` (U+00A0);
`Intl.ListFormat('es')` → `…, IBM Plex Sans Condensed e IBM Plex Mono` (it writes *e* before *i*-sounds);
`Intl.Collator('es')` sorts `nube < Ñame < ñandú` while `en` sorts `Ñame < ñandú < nube`.

#### `src/i18n/edition.js` (owner: core; no DOM, no module state besides a cache)

```js
export const EN;                                   // Symbol.for('lamina.en')
export function en(node): object                   // node[EN] ?? node  (English counterpart of a composed node)
export function composeEdition(enBook, xxBook, { lang, making } = {}): { edition, report }
//   report: { missing: path[], extra: path[], changedIds: path[], lengths: path[], types: path[],
//             unknown: path[], order: path[] }
export async function loadEdition(id, lang): Promise<object>     // cached per `${id}|${lang}`
export function lastReport(id, lang): object|null
```

`loadEdition('serpientes', 'en')` returns `{ ...english, locale: 'en', making }` (a shallow copy:
the module's export is never mutated). `loadEdition(id, 'es')` loads the English manifest, the Spanish
file and both making modules, then composes (§2).

#### `src/app/route.js` (owner: app-shell)

```js
export function parseRoute(hash = location.hash): { lang: Lang|null, book: string|null, params: URLSearchParams }
export function routeHash({ lang, book = null, params }): string   // '#/es/serpientes?plate=3', '#/es/'
export function withLang(hash, lang): string                       // same route, language replaced/added
export function bookHref(id, params = {}, lang = getLang()): string
export function libraryHref(lang = getLang()): string               // '#/es/'
```

`#/es` and `#/es/` are the Spanish library; `#/es/serpientes/` tolerates the trailing slash; a first
segment that is not a language is a book id (as today), so `#/serpientes` still works and is rewritten.

#### View contract between boot and its views (owners: app-shell, app-reader)

```js
createLibrary({ renderer, stage, reducedMotion, signal, lang, onOpen, requestLang })
createReader({ renderer, backend, stage, bookId, params, reducedMotion, signal, lang, onLibrary, requestLang })
// both return, in addition to today's { frame, dispose, activate, api, … }:
view.prepareLang(lang): Promise<void>   // load what the switch needs; must not change anything visible
view.applyLang(lang): void              // synchronous swap; called after setLang(lang)
// requestLang(lang) = (lang) => boot.changeLang(lang, { persist: true }); returns its promise
```

#### Reader additions (owner: app-reader)

```js
api.lang                               // getter: the reader's current language
api.setLang(lang): Promise<void>       // → requestLang(lang); resolves after applyLang + visible pages printed
api.spreadOf(layout, part?): number|null   // first spread showing that layout ('note', 'glossary', 'making', …)
api.i18nMissing(): string[]            // missingKeys() (automation; capture asserts it is empty)
api.info()                             // + { lang }
api.manifest, api.sides                // become getters (they change on a switch)
```

#### `src/app/pages.js` (owner: app-reader)

```js
pages.setSides(sides)      // replace the specs, keep every texture and mark it stale
pages.isStale(i): boolean
pages.refresh(i): Texture|null   // re-print side i now; dispose the old texture after the leaf took the new one
```

#### UI (owner: ui)

```js
createUI({ …, lang })                       // the top bar renders the language switch
ui.setLang(lang, { libraryHref })           // re-apply every static string, rebuild open popovers,
                                            // update the switch, '--lam-t-show', the library link
onCommand({ type: 'lang', lang })           // new UI command (added to UI_COMMANDS)
// src/engine/ui/langswitch.js (+ langswitch.css, imported by the module; no .lam-ui ancestor needed)
export function createLangSwitch({ value, onChange, size = 'auto' /* 'full'|'compact'|'auto' */, className })
  → { el, set(lang), setBusy(on), destroy() }
```

#### Typeset (owner: typeset)

```js
buildSides(edition)        // + the making leaf (§7.2); book: { …, publisher, author: { name, mark }|null, locale }
renderPage(spec, opts) → { canvas, hits, overflow, scale, hOverflow: Array<{ what, text, over }>, key }
// text.js
export function withLang(lang, fn)          // sets the hyphenation/collation language for one typeset
export function hyphenate(word, lang = 'en')  // hyphen.js dispatches to hyphen-es.js
// marks.js
export const AUTHOR_MARKS = { josoroma: { name, viewBox, ink, paths: [{ d, role }], colors } }
export function drawAuthorMark(g, id, { cx, top, width, color = null /* null = own colours */ }) → { h }
```

#### Figures and export (owner: figures-export)

```js
host.relocalize()                  // forget per-mount translations (labels, beats, error notice)
host.setBeats(leafIndex, beats)    // manifest beats of the new edition (mounts keep their spec)
host.labelItems(...)               // items carry t(label.text) / t(label.detail)
host.beats(leaf)                   // figure beats come back translated; manifest beats as given
exportFigureSVG({ …, lang })       // translated key, part/swatch <title>s, <title>/<desc>; root xml:lang/lang
export function exportFileName({ book, plate, kind /* 'color'|'line'|'png' */, lang }): string
// lab.html?…&lang=es ; window.lab.info().strings = { title, layers:[{id,label,hint}], labels:[{id,text,detail}],
//                                                   parts:[{id,name,swatches:[name]}], beats:[text] }
```

### 1.5 What a switch in the reader does (and what it costs)

`prepareLang(lang)`: `next = await loadEdition(id, lang)`; `await loadFonts(theme, { manifest: next })`
(Spanish uses only Latin-1 characters, so no new subset is fetched — §9.2); keep `next` pending.

`applyLang(lang)`, in this order, all synchronous:

1. `manifest = next`; `const nextSides = buildSides(next)`. **Assert structural parity** with the
   current `sides` (same length, same `layout` at every index, same plate ids at the same spreads).
   On failure, log it and ask boot to rebuild the view at the same `?spread=` (never seen with
   validated editions; it guards against a broken Spanish file).
2. `sides = nextSides`; refresh `plates[i].plate` objects and `plateBySpread`;
   `pages.setSides(sides)`.
3. **Visible pages first**: re-print sides `2·opened−1` and `2·opened` now (`pages.refresh`), then
   `book.setLeafTexture`. Old textures stay on screen until replaced (no blank page).
4. Queue every other stale side that is cached; `frame()` re-prints them at **at most one per frame**
   inside the existing 6 ms budget (a turning leaf's faces jump the queue at `turnstart` as today).
5. Figures: `host.relocalize()`; `host.setBeats(leaf, plate.animation.beats)` for mounted leaves.
   Time, layers, explode, labels on/off, focused label, yaw and inspect mode are untouched — nothing
   is remounted (figure params are identical in both editions by construction, §2).
6. UI: `ui.setLang(lang, { libraryHref: libraryHref(lang) })`; `ui.setBook(toc(next))`;
   `lastSpread = -1; syncUI()` (spread title, kind, layer names, beats, reading sheet, screen-reader
   mirror, live-region announcement of the spread in the new language).
7. `document.title`, `writeURL(book.opened)` (now `#/<lang>/<id>?plate=N`).

Measured on this machine (headless Chrome, WebGPU, 1440 × 900 at DPR 2, so 2048 px pages, warm
caches, `switch-cost.png`): `buildSides` 0.1 ms; a plate-text page 2 ms layout+draw + 1 ms
`initTexture`; a plate-figure page 1 + 0 ms; `ui.setBook` 0.2 ms. Re-typesetting **every** side of
Serpientes at 2048 px costs 106 ms in total (2–16 ms per side; the boards and the sources page are the dearest), Calaveras
113 ms. So the synchronous part of a switch is a few milliseconds of typesetting plus DOM work;
the first switch to Spanish adds cold text-measurement caches. Budget: **no long task over 50 ms**
during `applyLang` on a desktop (C.8 and §14), the visible spread correct in the next frame,
all kept sides correct within 12 frames.

The Library's `applyLang` re-prints its three covers (one per frame) and rewrites its DOM.

---

## 2. Spanish edition files: key set and merge

### 2.1 The file

`src/books/es/<id>.js` exports a full-shape copy of the English manifest: same keys, same array
lengths, every reader-visible string translated, `locale: 'es'`. Non-text values **may** be copied (as
the translators are doing) or omitted; when present they must equal English. Two keys are required
because composition matches on them: `plates[].id` and `plates[].lookCloser[].label`.

### 2.2 The key set (`src/i18n/schema.js`)

Kinds: **ID** (never translated; taken from English) · **TEXT** (must be translated) · **SAME**
(reader-visible, may stay identical: names, Latin, citations) · **SCI** (identical allowed only when
it is a binomial `^[A-Z][a-z]+ [a-z]+(?: [a-z]+)?$`) · **TAXON** (identical allowed when every `·`
part is a capitalised taxon ending in `-idae -inae -aceae -oideae -eae`) · **LOCALE** (set by the
loader). Containers: arrays are index-aligned; `byId` arrays are matched by key.

| path | kind | notes |
|---|---|---|
| `id` | ID | |
| `title` | SAME | "Serpientes", "Flores", "Calaveras" stay |
| `subtitle`, `kicker`, `edition`, `blurb` | TEXT | `edition` keeps its year (title page prints it in Roman) |
| `author` | ID | new object `{ name: 'Josoroma', mark: 'josoroma' }` |
| `publisher` | SAME | new; replaces the old `author` string ("Lámina Natural History Press") |
| `locale` | LOCALE | `'es'` |
| `imprint[]`, `credits[]` | TEXT | |
| `theme` (whole subtree) | ID | |
| `intro.title`, `intro.paragraphs[]`, `intro.pullQuote` | TEXT | |
| `howTo.title`, `howTo.items[][0]`, `howTo.items[][1]` | TEXT | icons are chosen from `en(row)` (§2.4) |
| `plates[]` | byId(`id`) | order from English; a reordered Spanish file is a warning |
| `plates[].id`, `.number`, `.layout` | ID | |
| `plates[].common`, `.commonAlt` | SAME | Costa Rican names stay; see §4.4 for `commonAlt` |
| `plates[].scientific` | SCI | Calaveras' "Cranium & mandible" must be translated, "Panthera onca" stays |
| `plates[].authority` | SAME | |
| `plates[].family` | TAXON | "Viperidae · Crotalinae" stays, "Human skull · norma frontalis" is translated |
| `plates[].status` | nullable | `null` in English ⇒ `null` |
| `plates[].status.code` | ID | |
| `plates[].status.label` | TEXT | official Spanish category names (§4.3) |
| `plates[].status.source` | SAME | e.g. "Lista Roja de la UICN, 2021" |
| `plates[].badge`, `.lede`, `.body[]`, `.didYouKnow` | TEXT | |
| `plates[].facts[][0]`, `.facts[][1]` | TEXT | number parity enforced on `[1]` |
| `plates[].lookCloser[]` | byId(`label`) | |
| `plates[].lookCloser[].label` | ID | canonical label id |
| `plates[].lookCloser[].text` | TEXT | |
| `plates[].figure.type`, `.figure.params` (subtree), `.figure.style` | ID | |
| `plates[].figure.caption`, `.figure.scaleNote`, `.figure.instruction` | TEXT | caption keeps its "Fig. n —" lead-in |
| `plates[].figure.layers[]`, `plates[].layers[]` | `{ id: ID, label: TEXT }` | not used by the current books |
| `plates[].animation.title` | TEXT | |
| `plates[].animation.beats[][0]` | ID | times come from English |
| `plates[].animation.beats[][1]` | TEXT | |
| `plates[].sources[]` | SAME | |
| `plates[].lesson.steps[].title`, `.text`, `.proTip`, `.mistakes[]`, `.proportions[]` | TEXT | |
| `back.note.title`, `back.note.paragraphs[]` | TEXT | |
| `back.glossary[][0]`, `back.glossary[][1]` | TEXT | index-aligned; the typesetter sorts per language (§4.2) |
| `back.sources[]` | SAME | translate only the connective words ("consulted November 2026") |
| `back.colophon[]`, `back.blurb` | TEXT | |

Every key path found in an English manifest must be declared in the schema; an undeclared path is a
validator error ("declare it in `src/i18n/schema.js` as text or id"), and composition copies it from
English meanwhile. This is the list the three manifests use today (walked from the files) plus the
fields the code reads but no book sets yet (`blurb`, `back.blurb`, `figure.instruction`,
`figure.style`, `layers`).

### 2.3 Merge algorithm (`composeEdition`)

```text
compose(S, enV, xxV, path):
  if S is ID or opaque:   if xxV !== undefined and !deepEqual(xxV, enV) → report.changedIds(path)
                          return enV
  if S is TEXT/SAME/SCI/TAXON:
                          if typeof xxV === 'string' and xxV.trim() → return xxV
                          report.missing(path); return enV            (English shows; never blank)
  if S is nullable(T):    if enV == null → (xxV != null → report.extra(path)); return null
                          return compose(T, enV, xxV, path)
  if S is array(T):       if xxV is not an array → report.missing(path); xxV = []
                          if xxV.length !== enV.length → report.lengths(path)
                          out = enV.map((v, i) => compose(T, v, xxV[i], `${path}[${i}]`))
  if S is byId(key, T):   map = new Map(xxV.map(x => [x[key], x]))
                          out = enV.map(v => compose(T, v, map.get(v[key]), `${path}[${v[key]}]`))
                          ids only in xxV → report.extra; different order → report.order
  if S is object(F):      out = {}
                          for k of Object.keys(enV): out[k] = k in F ? compose(F[k], enV[k], xxV?.[k], `${path}.${k}`)
                                                                    : (report.unknown(`${path}.${k}`), enV[k])
                          keys only in xxV → report.extra
  attach out[EN] = enV (non-enumerable symbol) on every object and array returned
edition = compose(MANIFEST, en, es, ''); edition.locale = lang; edition.making = composeMaking(…)
```

Optional fields follow English: absent in English ⇒ absent in the edition. The result is a plain,
unfrozen object graph (the typesetter and reader only read it). The symbol is invisible to
`Object.keys`, `JSON.stringify`, `manifestGlyphs` and `structuredClone`, so nothing that walks a
manifest changes behaviour.

### 2.4 `en()` for style decisions

Three places derive typography from words today and would style the two editions differently:

| code (snapshot) | today | rule |
|---|---|---|
| `typeset/draw.js:457` `iconFor(gesture, effect)` | English keyword regexes pick the how-to icon | call `iconFor(...en(row))` |
| `typeset/blocks.js:244` warning badge | `/venom\|danger\|…\|peligro/` on the badge | decide on `en(plate).badge` |
| `typeset/layouts/lesson.js:62` binomial italics | `/^[A-Z][a-z]+ [a-z]+$/` on `scientific` | test `en(plate).scientific` ("Hueso temporal" would otherwise be italicised) |

Text-only parsing that must work on the Spanish string itself and already does: the caption
lead-in regex (`blocks.js:319` accepts `Fig.` and `Lám.`), `yearOf(edition)` (`front.js:13`).
Two need fixing for Spanish openings (typeset task list): `dropCap` (`front.js:289`) drops the
leading punctuation it matches (`¿`, `¡`, `«`) — it must hang it before the initial; and
`smallCapsLead` (`blocks.js:97`) fails on a leading `¿`/`¡`/`«` (it should keep the mark and set
the first word in small caps).

---

## 3. Figure and UI strings

### 3.1 Dictionary files

```js
// src/i18n/es/ui.js — Spanish for src/engine/ui. Keys are the exact English strings.
export default {
  'Contents': 'Índice',
  'Previous page': 'Página anterior',
  '{layer} shown': 'Capa {layer}: visible',
  // …
};
```

- Keys are byte-identical to the English in code (curly quotes, `—`, `…`, `°` included).
- Values keep every `{placeholder}` of the key (validator), may reorder them, may use
  `*italic*`/`**bold**` where the consumer parses markup (typeset, a11y; not DOM `textContent`).
- `src/i18n/es/index.js` (core) imports the eight files and exports `DOMAINS`; `loadLang('es')`
  merges them into one `Map`. Same key with different values in two files → validator error (pick
  one wording; the UI drawer and the printed contents page should both say *Índice*).
- Domains: `shell` (boot, Library, index.html), `app` (Reader, pages, a11y), `ui` (engine/ui),
  `typeset`, `export` (FigureHost, export, lab), `snakes`, `flowers`, `skulls`.

### 3.2 Where each kind of figure string is translated

| string | produced by | translated in |
|---|---|---|
| label `text` / `detail` | subject `labels[]` | `FigureHost.activeLabels` (per-label memo keyed by language) → UI pills, cards, focus; export key |
| layer `label` / `hint` | subject `layers[]` | `Reader.syncUI` (layers popover, key toggles) ; lab panel |
| part `name`, swatch `name` | subject `parts[]` / patterns | exporter (`<title>` of part and swatch paths) |
| figure `beats` (code) | subject | `FigureHost.beats()` (only shown when a manifest has no beats — all three books have them — and in the lab) |
| figure `title` | subject | **not translated**: a developer label (lab header, `lamina.info().active`); the reader passes its own export title |
| construction diagrams | `skulls/steps.js drawStep` | no text is drawn (checked: no `fillText` in subjects) |

### 3.3 Rules for code authors (all areas)

1. Pass the literal English (or a template) to `t()`/`tl()` at the output site:
   `t('Paused. {beat}', { beat })`, never `t('Paused.') + ' ' + beat`.
2. Finite sets get exact keys; templates only for open values (counts, names).
3. A template key must contain a literal word of ≥ 3 letters (`'{part} — dark markings'` is fine,
   `'{a} — {b}'` is rejected: it would match unrelated strings).
4. Never compare or branch on translated text; compare ids or English keys
   (`skulls/snake.js:80` compares `fig.title === 'Seed pod (demo)'` — keep titles English).
5. Numbers shown at run time go through `fmtNumber/fmtSeconds/fmtPercent`.
6. Keyboard shortcuts keep their keys; only labels and key-cap names (`Space`, `Home`, `End`,
   `PgUp`, `PgDn`, `Enter`) translate.

### 3.4 Proposed core terminology (for consistency across the eight files)

| English | Español (proposed) | English | Español (proposed) |
|---|---|---|---|
| Plate / Plates | Lámina / Láminas | Lesson / Lessons | Lección / Lecciones |
| Contents | Índice | Introduction | Introducción |
| How to use this book | Cómo usar este libro | Before you begin | Antes de empezar |
| Afterword | Epílogo | A note / Note | Una nota / Nota |
| Glossary | Glosario | Words used in this book | Palabras de este libro |
| Sources | Fuentes | For further reading | Para leer más |
| Colophon | Colofón | Sources & colophon | Fuentes y colofón |
| Cover / Back cover | Cubierta / Contracubierta | Title page | Portada |
| Endpapers | Guardas | Imprint | Créditos |
| Back matter | Páginas finales | Field notes | Notas de campo |
| Look closer | Más de cerca | Did you know? | Dato curioso |
| Pro tip | Consejo | Common mistakes | Errores comunes |
| Proportions | Proporciones | Layers | Capas |
| Explode (field) / Exploded view | Despiece / Vista despiezada | Reassembled | Recompuesto |
| Labels | Etiquetas | Export | Exportar |
| Read | Leer | Sound | Sonido |
| Full screen | Pantalla completa | Moment | Momento |
| Library | Biblioteca | Language | Idioma |
| How this book was made | Cómo se hizo este libro | The prompt | La instrucción original |
| This book’s brief | El encargo de este libro | Translated from the English original | Traducción del original en inglés |
| Author / by | Autor / por | Published by {publisher}. | Publicado por {publisher}. |

UI copy uses infinitives and nouns ("Reproducir la animación", "Página siguiente"), which avoids
choosing between *tú*, *usted* and *vos*.

---

## 4. Spanish typography conventions (for translators, dictionaries and code)

### 4.1 Rules

| topic | rule | source |
|---|---|---|
| decimals | comma: `1,2–1,8 m`, `2,4 s` | CLDR `es-CR` decimal sign `,` |
| thousands | no grouping below 10 000 (`1500 m`), a no-break space above (`12 000`) | CLDR `es` `minimumGroupingDigits` 2, `es-CR` group sign U+00A0 |
| percent | number, no-break space, `%`: `85 %` | [Castellano Actual, "Por ciento (%)", 2016](https://www.udep.edu.pe/castellanoactual/por-ciento/) (BIPM norm); CLDR `es` pattern `#,##0 %` |
| quotation marks | angular first: «…», then “…”, then ‘…’ | Terrones Juárez, [Castellano Actual, 2013](https://www.udep.edu.pe/castellanoactual/las-comillas-y-sus-usos/), citing *Ortografía* 2010: 380 |
| titles | only the first word (and proper nouns) capitalised: *Vista frontal*, *Cómo usar este libro* | Celi, [Castellano Actual, 2020](https://www.udep.edu.pe/castellanoactual/ortografia-de-los-titulos-de-libros/), citing *Ortografía* 2010, 4.2.4.8 |
| questions, exclamations | opening `¿` `¡` always | (orthography; validator warns on unpaired) |
| capitals | accents are kept on capitals (`LECCIÓN`); `toUpperCase()` keeps them | — |
| binomials | identical and in `*italics*`; authorities identical | schema SCI/SAME |
| headings and titles | never hyphenated (already `hyphenate: false` in the layouts) | *Ortografía* 2010: 411 via [Castellano Actual, 2019](https://www.udep.edu.pe/castellanoactual/uso-del-guion-para-dividir-palabras-al-final-de-la-linea/) |

### 4.2 Glossary order

The typesetter sorts glossary entries with `Intl.Collator(page.book.locale, { sensitivity: 'base',
numeric: true })` at render time. The three English glossaries are already in `en` collation order
(checked), so English pages do not change; Spanish entries stay index-aligned in the file.

### 4.3 IUCN categories in Spanish

Codes stay; labels use the UICN names: Extinto (EX), Extinto en estado silvestre (EW), En peligro
crítico (CR), En peligro (EN), Vulnerable (VU), Casi amenazado (NT), Preocupación menor (LC), Datos
insuficientes (DD), No evaluado (NE) — UICN (2012), *Directrices para el uso de los Criterios de la
Lista Roja de la UICN a nivel regional y nacional: Versión 4.0*, Figura 2, p. 14
([PDF](https://docs.gbif.org/course-data-use/exercise-data/RL-2012-002-Es.pdf)). The same document
names the list "La Lista Roja de Especies Amenazadas de la UICN". These are the values of the
typeset dictionary for the `IUCN` fallback labels (`draw.js:270–278`) and of `status.label`.

### 4.4 `commonAlt` in the Spanish edition

Each edition's alternative line gives the *other* language: English edition `common: 'Frontal View',
commonAlt: 'Vista frontal'`; Spanish edition `common: 'Vista frontal', commonAlt: 'Frontal view'`.
For snakes and flowers `common` is already the Costa Rican name in both editions and `commonAlt`
keeps the English name (identical; kind SAME). The lesson verso prints `common` as the vertical title
(`lesson.js:167`) and `commonAlt` as the subheading (`lesson.js:51–58`), so the symmetry reads naturally.

---

## 5. Spanish hyphenation

### 5.1 Rules implemented (`src/engine/typeset/hyphen-es.js`)

Sources: J. Bezos, *División de palabras con guiones*, v4.2, 2008 — the documentation of TeX's
Spanish patterns, which restates the DPD 2005 rules §2.1–2.11
([CTAN](https://ctan.math.washington.edu/tex-archive/languages/spanish/hyphen-spanish/division.pdf));
Terrones Juárez, [Castellano Actual, 2013](https://www.udep.edu.pe/castellanoactual/el-guion-al-final-de-renglon-o-linea/)
(*Ortografía* 2010); Briceño, [Castellano Actual, 2018](https://www.udep.edu.pe/castellanoactual/‒-encuentre-las-7-diferencias-ii/).

1. **Letters.** Vowels `a e i o u á é í ó ú ü`; everything else is a consonant, except `y`, which
   counts as a consonant when a vowel follows it (*ma-yo*, *le-yen-da*) and as a vowel otherwise
   (*rey*, *muy*). Bezos's rule 8 classifies a word-final `y` the other way; that never changes a
   break, because no break may precede a final consonant (rule 5, last item).
2. **Single units.** `ch`, `ll`, `rr` are one consonant and never split (Bezos 7, 13); `qu` and `gu`
   before `e i é í` are one consonant (*que-so*, *gui-ta-rra*); `gü` is `g` + vowel `ü` (*pin-güi-no*).
3. **Vowels are never separated**, whether they form a diphthong, triphthong or hiatus (*cau-sa*, not
   *ca-usa*; *paí-ses*, not *pa-íses*) — Terrones Juárez 2013; DPD §2.2 via Bezos. An `h` between two
   vowels is silent and joins them (*ahi-ja-do*; *búho* and *ahora* do not break).
4. **Never break before an `h`, nor before the letter that precedes it** (*adhe-rir*, *inhi-bir*,
   *exha-lar*, *al-cohol*, not *alco-hol*) — DPD §2.4 via Bezos rule 6 and Terrones Juárez 2013;
   compounds with an independent second word (*des-hacer*, *in-humano*) come from the exception list.
5. **Consonant clusters** between two vowel groups (counted in units):
   - 1 → break before it: *ca-sa*, *pe-rro*, *ca-lle*, *ta-xi* (`x` is an ordinary consonant, DPD §2.5).
   - 2 → if it is an inseparable onset `bl br cl cr dr fl fr gl gr kl kr pl pr tr`, break before both
     (*ha-blar*, *le-tra*); `tl` → **no break** (Spain *at-le-ta*, the Americas *a-tle-ta*; Bezos
     recommends avoiding the division); otherwise break between them (*car-ta*, *ac-ción*).
   - 3 → if the last two are an onset, break after the first (*en-tre*, *ham-bre*); `…tl` → none;
     else after the second (*ins-tan-te*, *obs-ta-cu-lo*, *pers-pec-ti-va*).
   - 4 → after the second (*obs-truc-ción*, *ins-truir*, *abs-trac-to*).
   - At the start or end of the word (no vowel on one side) → never (Bezos 4).
6. **Prefixes.** Syllabic division of prefixed words is allowed (*de-samparo* and *des-amparo* are
   both correct — DPD §2.1 via Bezos and Terrones Juárez), so the syllabic rule is used except where it
   would build a false onset: `sub` + `r`/`l` breaks after `sub` (*sub-ra-yar*, *sub-li-mi-nal*;
   lexicalised *su-bli-me* stays in an exception list). Prefixes ending in `r` before `r`
   (*super-rápido*, *hiper-realismo*, *inter-racial*) split the `rr` (Briceño 2018), but *interrumpir*
   must not, so these come only from the exception list.
7. **Minimum fragments.** At least 2 letters before and 3 after the break (no single vowel ever
   left at the end of a line: *amis-tad*, not *a-mistad*); words shorter than 5 letters never break.
8. **Do not hyphenate**: capitalised words (already skipped by `text.js`), all-caps acronyms,
   abbreviations, numbers and Roman numerals, words with digits, italic runs (binomials — already
   skipped), and non-adapted foreign words (heuristic: contains `w`, `k`, `th`, `ph`, `ck`, `gh`,
   `ff`, `ss`, `tt`, `pp` or `zz`) — Briceño 2018.
9. **Avoid ugly fragments**: drop a break whose fragment on either side is a word on a short block
   list (Bezos §2.11 recommendation): `culo puta puto pedo caca cago mierda`.
10. **Penalties**: every valid break `good` (45) — Spanish syllable breaks are not risky the way
    English V-CV breaks are — except breaks that leave exactly 2 letters on the left, `fair` (70).

Explicit hyphens in compounds (*teórico-práctico*): when a line breaks at the hyphen, the Spanish
convention repeats it at the start of the next line (*teórico- / -práctico*), except in proper names
(Briceño 2018). This needs a discretionary item (pre `-`, post `-`) in the Knuth–Plass items: P2
(the books contain few such compounds). The explicit-hyphen test in `text.js:320` uses `/\w/`, which
fails next to accented letters; use `/[\p{L}\d]/u`.

### 5.2 Plugging into `text.js`

- `hyphen.js` keeps the English heuristic and exports `hyphenate(word, lang = 'en')`, dispatching to
  `hyphenateEs` for `'es'`; caches are keyed `${lang}:${word}`. Soft hyphens (U+00AD) still win.
- `text.js` gains a module-level page language set by `withLang(lang, fn)` (try/finally) and used by
  `pushWord` (`hyphenate(core, LANG)`); `renderPage` and the glyph survey wrap `runLayout` in
  `withLang(page.book?.locale ?? 'en', …)`. Typesetting stays synchronous, so a module variable is safe.

### 5.3 Test vectors (verified with a prototype of exactly these rules: `i18n-shots/hyphen-es.proto.mjs`, `node hyphen-es.proto.mjs` → all pass)

| word | expected | word | expected |
|---|---|---|---|
| serpiente | ser-piente | terciopelo | ter-cio-pelo |
| carretera | ca-rre-tera | perro | pe-rro |
| calle | ca-lle | coche | co-che |
| hablar | ha-blar | atleta | *(none)* |
| construcción | cons-truc-ción | instante | ins-tante |
| transporte | trans-porte | obstrucción | obs-truc-ción |
| prohibir | prohi-bir | alcohol | al-cohol |
| adherir | adhe-rir | anhelo | *(none)* |
| deshidratar | deshi-dra-tar | inhumano | in-hu-mano *(exception list)* |
| subrayar | sub-ra-yar | sublime | su-blime *(exception list)* |
| teatro | tea-tro | reunión | reu-nión |
| caída | *(none)* | aéreo | aé-reo |
| abeja | *(none)* | ahora | *(none)* |
| pingüino | pin-güino | guitarra | gui-ta-rra |
| quetzal | quet-zal | leyenda | le-yenda |
| contrarreloj | con-tra-rre-loj | superrápido | super-rá-pido *(exception list)* |
| mandíbula | man-dí-bula | orquídea | or-quí-dea |
| esternocleidomastoideo | es-ter-no-clei-do-mas-toi-deo | Bothrops, webgpu | *(none)* |

---

## 6. The author mark

### 6.1 Data and drawing (`src/engine/typeset/marks.js`, owner: typeset)

`public/author/josoroma.svg` has 8 filled paths (7 letters in `var(--josoroma-primary,#c92b60)`, the
final *a* in `var(--josoroma-accent,#087fa9)`), `viewBox 0 0 1000 200`, an inner `scale(5)` and
`fill-rule="evenodd"`. Its ink box, measured from the path data, is x 20.5–976, y 25.5–172.5 in the
viewBox: **6.5 : 1**. `marks.js` stores the eight `d` strings verbatim with their role, the ink box
and the two colours; `drawAuthorMark(g, 'josoroma', { cx, top, width, color })` scales so the **ink**
is `width` wide (centred on `cx`, top at `top`), translates, `scale(s·5)`, and fills each
`new Path2D(d)` with `'evenodd'` — the constructor takes SVG path data directly
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Path2D/Path2D)). `color: '#fff'` draws into
the foil mask; `null` uses the two colours. No image loading, no async step, works in
`OffscreenCanvas`. The validator re-reads the SVG and fails if the `d` strings, roles or colours in
`marks.js` drift from it.

### 6.2 Placements (fractions of the canvas; boards are W × 1.4514 W)

| surface | mark | everything else |
|---|---|---|
| **front cover** | foil, ink width **0.26 W**, centred at **0.812 H** (under the medallion, whose ring ends ≈ 0.754 H) | publisher line (was the `author` string) moves from 0.875 H to **0.885 H**; kicker, title, rule, subtitle and medallion unchanged |
| **back cover** | foil, ink width **0.20 W**, centred at **0.842 H** | title moves from 0.82 H to **0.795 H**; publisher from 0.875 H to **0.895 H**; medallion and blurb unchanged |
| **title page** | own colours, ink width **0.26 W**, under the subtitle: a small-caps `t('by')` line (`labelMuted`) 50 design px below the subtitle, mark top 26 px below it | the fleuron moves under the mark; the vignette keeps its `bot = 0.8 H` and shrinks to the room left (`R = min(0.2 W, (bot − top)·0.44)`); publisher and edition lines unchanged at 0.845 H |
| **imprint** | own colours, ink width **0.16 W**, left-aligned on the text column, under a `t('Author')` small-caps label, between the printer's device and the short rule | the colophon block stays bottom-aligned |
| **SVG export credit** | text only: `Serpientes · Josoroma · Lámina Natural History Press` | |

Foil treatment: the mark is drawn in white into the same mask as the title (`createMask` →
`stampFoil` in `boards.js`), so it gets the book's own foil — gold on Serpientes and Flores, silver on
Calaveras — with the bevel and glint of the existing stamping. Rendered in
`probe-serp.png`, `probe-calaveras.png`, `probe-flores.png` and the 2048 px crop
`probe-flores-cover-mark.png` (strokes ≈ 15–18 px at a 2048 px cover, ≈ 8 px on the 1024 px shelf
texture) and stamp crisply; a 0.30 W mark read too loud next to the title, hence 0.26 W
(`probe-cover-026.png`). The library shelf prints the same front cover texture, so it inherits the mark.

`buildSides` normalises legacy manifests: `author` as a string ⇒ `publisher = author`, no mark — the
typeset samples and old templates keep working.

---

## 7. "How this book was made"

### 7.1 Content and data

The user's original prompt verbatim (the quoted block of `docs/prompts/00-original-brief.md`, 41
lines including blanks; the doc states it was given to Claude Code, Opus 5.5) and that book's own brief
verbatim (`books[].brief` in `docs/prompts/02-build-workflow.js`; 175, 135 and 312 words). The build
workflow then ran one content pipeline per book: author, two adversarial fact-checkers with different
lenses, reviser (`02-build-workflow.js`, `meta.phases`).

```js
// src/books/making.js (owner: books) — validator checks both against docs/prompts verbatim
export const MODEL = 'Claude Code (Opus 5.5)';
export const PROMPT = {
  source: 'docs/prompts/00-original-brief.md',
  lines: ['Claude Skill: Interactive 3D Scientific full width Colored Books', '', 'Create a reusable …', …],  // 41 entries
  title: 0,                     // line set in bold (the prompt's own title)
  headings: [10, 18, 25, 28],   // 'Visual Experience', 'Interactions', 'Technology', 'Deliverables'
};
export const BRIEFS = {
  serpientes: { source: 'docs/prompts/02-build-workflow.js', text: '"Serpientes — A Living Atlas of …' },
  flores: { … }, calaveras: { … },
};
// src/books/es/making.js — same shape: PROMPT.lines (41 entries, blank and "* " lines at the same
// indices, URLs identical) and BRIEFS[id].text, translated faithfully.
```

`loadEdition` attaches `edition.making = { model, prompt: { lines, title, headings, source },
brief: { text, source }, translated: lang !== 'en' }`. A draft Spanish prompt used for the fit test
is in `i18n-shots/texts.json` (`prompt_es`); it is a measurement draft for the translators to
replace or review, not a deliverable.

### 7.2 Placement: one leaf before the back board

```
… plate N figure | note            (as today)
  sources & colophon | glossary    (as today: sources is a recto, glossary a verso)
  making — prompt   | making — brief   ★ new leaf: prompt on its recto, brief on its verso
  back endpaper | back cover
```

Spreads at the end: `[note | sources]`, `[glossary | making·prompt]`, `[making·brief | back
endpaper]`, closed. Why this and not a two-page spread before the glossary: the user asked for the
prompt **at the end of each book**; a two-page spread can never be the last text spread (the last
spread always has the back endpaper as its recto), whereas this leaf makes the book's brief the very
last page, opens the section on a recto, never splits a text across a turn (each page holds one), and
leaves the existing pairings of the note, sources and glossary untouched. `leafCount` becomes
`plates + 7`; both editions get the leaf, so parity holds.

Page specs: `{ layout: 'making', making: { part: 'prompt' | 'brief', … } }`, keys
`<id>:making-prompt` / `<id>:making-brief`, folios like any back-matter page, running head
`tl(lang, 'How this book was made')`.

### 7.3 Layout (`src/engine/typeset/layouts/making.js`)

Both pages: furniture; kicker `How this book was made` (accent small caps); title (`h1` at 64 design
px: *The prompt* / *This book’s brief*); the back-matter short rule; a lead in italic (`dyk` 25 px) —
`The series began with one prompt to {model}. It is printed as it was written.` /
`Each book was then researched, written, fact-checked twice and revised by its own team of agents,
from this brief:`; then the quoted text inside a 3 px accent rule (ink on engraving books), indented
40 px; then the source path in `mono` 19 px muted. Spanish edition: a `labelMuted` line
`Translated from the English original` above each quote block, and leads that say so.

- Prompt page: one paragraph per line, ragged right, no hyphenation (URLs stay whole); blank lines
  are 0.45 em gaps; `* ` lines become hanging bullets (30 px); `headings` in `labelMuted` (ink);
  the `title` line in bold.
- Brief page: one justified paragraph, hyphenated in its language; content sunk with `P.sinkage`
  like the note page (the briefs are shorter than the prompt).
- Body **26 design px**, leading 1.4 (the sources list and colophon are set at 25; the note at 34,
  the glossary at 30). Auto-fit may go down to **25/26 = 0.962** and no further: the validator fails a
  making page below it.

Measured with a prototype of this exact layout built on the real modules (`probe.js`):

| page | 26 px | 27 px | 28 px |
|---|---|---|---|
| prompt, English | fits (scale 1) | fits (scale 1) | 0.975 |
| prompt, Spanish draft (+11 % characters, +5.6 % height) | fits | 0.975 | 0.95 |
| brief, Calaveras (longest, English) | fits with ≈ 45 % of the column free | fits | fits |

The Spanish draft therefore fits down to an effective 26.3 px (27 px × 0.975), the English up to
27.3 px. With the 25 px floor, the final Spanish prompt may run ≈ 10 % taller than the draft
((26.3 / 25)² ≈ 1.11, height growing with the square of the size) before the page fails.

### 7.4 Contents, drawer, a11y and Read sheet

- Contents page: a back-matter row `How this book was made` after Glossary (folio of the prompt
  page, `page: 'right'`). Measured: all three contents pages still fit at scale 1 with the extra row.
- Contents drawer: a matter entry after Glossary (Reader `toc`).
- `SPREAD_NAMES.making = 'How this book was made'`; `VERSO_FIRST` gains `making`, so the spread
  `[making·brief | endpaper]` is named by its verso; `[glossary | making·prompt]` keeps "Glossary".
- `a11y.sideHTML` case `making`: `<h2>How this book was made</h2><h3>The prompt</h3><p>lead</p>
  <blockquote>` with `<p>` per line, `<ul>` for bullets, `<h4>` for headings, URLs as text
  `</blockquote><p class="source"><code>path</code></p>` (and the translation note in Spanish). The
  Read sheet and the screen-reader mirror show it like any other side.
- Capture adds `92-making.png` (both spreads); `End` lands on `[making·brief | endpaper]`.

---

## 8. The language switch

### 8.1 Behaviour and semantics

Radio group per the WAI-ARIA APG: the group has `role="radiogroup"` and a label; each option
`role="radio"` with `aria-checked`; Tab enters on the checked option, arrows move **and** check,
Space checks ([APG Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)). Roving
`tabindex`; arrows wrap. Each option carries `lang="en"` / `lang="es"`; its text and `aria-label` are
the autonym only, because `lang` also governs the element's attribute values
([W3C, Declaring language in HTML](https://www.w3.org/International/questions/qa-html-language-declarations))
— so no translated `title` on the options. The group label is `t('Language')`. `<html lang>` follows
the edition (WCAG 3.1.1 —
[Understanding Language of Page](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html)).

```html
<div class="lam-lang" role="radiogroup" aria-label="Idioma">
  <button type="button" role="radio" aria-checked="false" tabindex="-1" lang="en" data-lang="en" aria-label="English">
    <span class="lam-lang-long">English</span><span class="lam-lang-short" aria-hidden="true">EN</span></button>
  <span class="lam-lang-dot" aria-hidden="true">·</span>
  <button type="button" role="radio" aria-checked="true" tabindex="0" lang="es" data-lang="es" aria-label="Español">
    <span class="lam-lang-long">Español</span><span class="lam-lang-short" aria-hidden="true">ES</span></button>
</div>
```

Choosing an option calls `onChange(lang)` at once; `setBusy(true)` sets `aria-busy` while the first
Spanish switch loads; boot serialises requests (a newer one supersedes an older one between
`prepareLang` and `setLang`). Focus stays on the option (the component updates in place).

### 8.2 Look and placement

- Type: 12.5 px UI sans; checked option ink, weight 560, with a 1.5 px accent underline; the other
  muted, weight 450; a muted `·` between. Compact form "EN · ES" with 0.08 em tracking.
- Targets: 44 × 44 px on coarse pointers (`[data-coarse]`), as every other control; 32 px tall on fine.
- **Reader top bar** (desktop): `← Library │ SERPIENTES │ English · Español` — after the book title,
  behind a second `.lam-top-rule`. **Phones** (`[data-compact]`): inside the top pill after the plate
  name: `[←][III · Coral][EN · ES][sound, ≤ 420 px]`; the plate name gives up width (ellipsis): at 320 px
  the pill's 296 px leave it ≈ 112 px after 44 + 88 + 8 + 44 px of controls (hide the dot below
  340 px to win 8 px). Idle hiding follows `.lam-top`.
- **Library**: right end of the header row (`margin-left: auto`, `pointer-events: auto`), "English ·
  Español" above 480 px, "EN · ES" below.
- `langswitch.css` is imported by `langswitch.js` and needs no `.lam-ui` ancestor (the Library is
  outside the reader overlay); colours come from `--lam-*` variables with fallbacks.

---

## 9. String inventory

Snapshot of every user-visible English string in code, by owner area, with its dictionary key
(the key **is** the English string; `{x}` marks a template). `(new)` = a string the features in this
design add. 190 unique keys outside the subjects (app: shell 11 and reader 32; ui 102; typeset 56;
figures-export 11) and 479 in the subjects (snakes 192, flowers 134, skulls 158; overlaps such as
*Head* or *Leaf* are shared keys). Manifest text is not here: it lives in the Spanish edition files.

Not translated on purpose: developer surfaces (`lab.html` panel, `typeset.html` captions,
`book-test.html`, `ui.html` mock data, `src/engine/typeset/sample.js`), console messages, thrown
`Error` messages (`Unknown book "${id}"` only appears inside the fatal card's `<pre>`), `Lámina`,
backend names (`WebGPU`, `WebGL 2`), binomials used as part names, and figure `title`s (§3.2).

### 9.1 app, ui, typeset, figures-export

#### shell → `src/i18n/es/shell.js`

| where (snapshot) | key (exact English) | note |
|---|---|---|
| `src/app/boot.js:78` | `Reload` |  |
| `src/app/boot.js:84` | `Back to the library` |  |
| `src/app/boot.js:96` | `Lámina needs WebGPU or WebGL 2, and this browser could not start either.` |  |
| `src/app/boot.js:147` | `The graphics device stopped responding.` |  |
| `src/app/boot.js:224` | `Lámina could not open this book.` |  |
| `src/app/Library.js:75` | `Library` |  |
| `src/app/Library.js:77` | `Living scientific plates` |  |
| `src/app/Library.js:81` | `Choose a book` |  |
| `src/app/Library.js:81` | `drag pages, rotate figures, export plates as SVG` | markup keeps the " · " separator outside the key |
| `src/app/Library.js:210` | `Lámina — Living Scientific Plates` | document.title |
| `index.html:15` | `Interactive 3D book` | canvas aria-label: boot sets it with t() |
| `index.html:6` | `Lámina — Living Scientific Plates` | initial <title>; boot overwrites |

#### reader → `src/i18n/es/app.js`

| where (snapshot) | key (exact English) | note |
|---|---|---|
| `src/app/Reader.js:33` | `Cover` | SPREAD_NAMES |
| `src/app/Reader.js:34` | `Endpapers` | SPREAD_NAMES |
| `src/app/Reader.js:35` | `Title page` | SPREAD_NAMES |
| `src/app/Reader.js:36` | `Imprint` | SPREAD_NAMES |
| `src/app/Reader.js:37` | `Contents` | SPREAD_NAMES |
| `src/app/Reader.js:38` | `Introduction` | SPREAD_NAMES |
| `src/app/Reader.js:39` | `How to use this book` | SPREAD_NAMES |
| `src/app/Reader.js:40` | `Afterword` | SPREAD_NAMES |
| `src/app/Reader.js:41` | `Sources & colophon` | SPREAD_NAMES |
| `src/app/Reader.js:42` | `Glossary` | SPREAD_NAMES |
| `src/app/Reader.js:43` | `Back cover` | SPREAD_NAMES |
| `src/app/Reader.js (new)` | `How this book was made` | NEW: SPREAD_NAMES.making + toc entry |
| `src/app/Reader.js:497` | `Export failed — see the console` |  |
| `src/app/Reader.js:540` | `Skin hidden. Skeleton shown.` |  |
| `src/app/Reader.js:1153` | `PNG saved` |  |
| `src/app/Reader.js:1158` | `No figure on this spread` |  |
| `src/app/Reader.js:1160` | `Line-art SVG saved — ready to colour` |  |
| `src/app/Reader.js:1160` | `Colour plate SVG saved` |  |
| `src/app/Reader.js:1242` | `Lesson` | syncUI kind (UI aria labels, sheet kicker, export title) |
| `src/app/Reader.js:1242` | `Plate` |  |
| `src/app/a11y.js:40` | `Pro tip.` |  |
| `src/app/a11y.js:41` | `Common mistakes` |  |
| `src/app/a11y.js:42` | `Proportions` |  |
| `src/app/a11y.js:50` | `Look closer` |  |
| `src/app/a11y.js:55` | `Sources` |  |
| `src/app/a11y.js:58` | `Lesson` |  |
| `src/app/a11y.js:58` | `Plate` |  |
| `src/app/a11y.js:70` | `Did you know?` |  |
| `src/app/a11y.js:84` | `Published by {publisher}.` | was `Published by ${s.book.author}.` — author becomes publisher |
| `src/app/a11y.js:85` | `Imprint` |  |
| `src/app/a11y.js:89` | `Introduction` |  |
| `src/app/a11y.js:92` | `How to use this book` |  |
| `src/app/a11y.js:94` | `Afterword` |  |
| `src/app/a11y.js:98` | `Sources` |  |
| `src/app/a11y.js:98` | `Colophon` |  |
| `src/app/a11y.js:101` | `Glossary` |  |
| `src/app/a11y.js:110` | `{kind} {number} of {total}: {title}.` | plateAnnouncement; {title} = common + ", " + scientific |
| `src/app/a11y.js (new)` | `Author` | NEW: imprint mirror credit |
| `src/app/a11y.js (new)` | `The prompt` | NEW: sideHTML making/prompt |
| `src/app/a11y.js (new)` | `This book’s brief` | NEW: sideHTML making/brief |

#### ui → `src/i18n/es/ui.js`

| where (snapshot) | key (exact English) | note |
|---|---|---|
| `src/engine/ui/index.js:46` | `SVG — colour plate` |  |
| `src/engine/ui/index.js:46` | `Colour fills and ink lines, print-ready` |  |
| `src/engine/ui/index.js:46` | `Preparing the colour plate…` |  |
| `src/engine/ui/index.js:47` | `SVG — line art` |  |
| `src/engine/ui/index.js:47` | `Colouring page: outlines only` |  |
| `src/engine/ui/index.js:47` | `Preparing the line art…` |  |
| `src/engine/ui/index.js:48` | `PNG — current view` |  |
| `src/engine/ui/index.js:48` | `The book as it lies now, without labels` |  |
| `src/engine/ui/index.js:48` | `Preparing the PNG…` |  |
| `src/engine/ui/index.js:157` | `Plate` | default kind |
| `src/engine/ui/index.js:186` | `Back to the library` |  |
| `src/engine/ui/index.js:188` | `Library` |  |
| `src/engine/ui/index.js:201` | `Sound` |  |
| `src/engine/ui/index.js:216` | `Keyboard shortcuts` |  |
| `src/engine/ui/index.js:223` | `Contents` |  |
| `src/engine/ui/index.js:224` | `Previous page` |  |
| `src/engine/ui/index.js:229` | `Play the animation` |  |
| `src/engine/ui/index.js:229` | `Play` |  |
| `src/engine/ui/index.js:229` | `Space` | key cap shown in the tooltip |
| `src/engine/ui/index.js:242` | `Next page` |  |
| `src/engine/ui/index.js:244` | `Layers & dissection` |  |
| `src/engine/ui/index.js:245` | `Export` |  |
| `src/engine/ui/index.js:249` | `Full screen` |  |
| `src/engine/ui/index.js:252` | `Read this page` |  |
| `src/engine/ui/index.js:252` | `Read` |  |
| `src/engine/ui/index.js:255` | `Book controls` |  |
| `src/engine/ui/index.js:271` | `Layers and dissection` |  |
| `src/engine/ui/index.js:283` | `Page text` |  |
| `src/engine/ui/index.js:386` | `{name}. Open contents` | {name} = "{kind} {number}, {title}, {sci}" (punctuation only) |
| `src/engine/ui/index.js:416` | `Pause the animation` |  |
| `src/engine/ui/index.js:417` | `Pause` |  |
| `src/engine/ui/index.js:435` | `Sound on` |  |
| `src/engine/ui/index.js:435` | `Sound off` |  |
| `src/engine/ui/index.js:443` | `Exit full screen` |  |
| `src/engine/ui/index.js:500` | `The animation · {title}` |  |
| `src/engine/ui/index.js:500` | `The animation` |  |
| `src/engine/ui/index.js:507` | `{n} s` | narration time unit — use fmtSeconds() |
| `src/engine/ui/index.js:507` | `{n} seconds` | spoken unit |
| `src/engine/ui/index.js:545` | `This plate is a single layer.` |  |
| `src/engine/ui/index.js:547` | `Explode` |  |
| `src/engine/ui/index.js:549` | `Labels` |  |
| `src/engine/ui/index.js:549` | `Name the parts on the plate` |  |
| `src/engine/ui/index.js:550` | `Animation time` |  |
| `src/engine/ui/index.js:567` | `Moment` |  |
| `src/engine/ui/index.js:567` | `scrub the 5-second loop` |  |
| `src/engine/ui/index.js:571` | `Layers` |  |
| `src/engine/ui/index.js:590` | `{n} percent` | aria-valuetext; display uses fmtPercent() |
| `src/engine/ui/index.js:619` | `{secs} seconds. {beat}` |  |
| `src/engine/ui/index.js:619` | `{secs} seconds` |  |
| `src/engine/ui/index.js:661` | `Export · {kind} {number}` |  |
| `src/engine/ui/index.js:703` | `Exporting…` |  |
| `src/engine/ui/index.js:777` | `Rendering` |  |
| `src/engine/ui/index.js:930` | `Playing` |  |
| `src/engine/ui/index.js:930` | `Paused. {beat}` |  |
| `src/engine/ui/index.js:930` | `Paused` |  |
| `src/engine/ui/index.js:938` | `Labels shown` |  |
| `src/engine/ui/index.js:938` | `Labels hidden` |  |
| `src/engine/ui/index.js:948` | `{layer} shown` | layer key toggle; Spanish needs "Capa {layer}: visible" |
| `src/engine/ui/index.js:948` | `{layer} hidden` |  |
| `src/engine/ui/index.js:959` | `Exploded view` |  |
| `src/engine/ui/index.js:959` | `Reassembled` |  |
| `src/engine/ui/index.js:1264` | `{name}. {index} of {total}.` |  |
| `src/engine/ui/index.js:1264` | `Page {n}` |  |
| `src/engine/ui/index.js:1755` | `Contents` |  |
| `src/engine/ui/drawer.js:26` | `Contents` |  |
| `src/engine/ui/drawer.js:31` | `Close contents` |  |
| `src/engine/ui/drawer.js:38` | `move` | kbd hint; the leading space stays in markup |
| `src/engine/ui/drawer.js:39` | `Enter` | key cap (translators pick the name printed on local keyboards) |
| `src/engine/ui/drawer.js:39` | `open` |  |
| `src/engine/ui/drawer.js:40` | `Esc` | key cap |
| `src/engine/ui/drawer.js:40` | `close` |  |
| `src/engine/ui/drawer.js:47` | `Plates` |  |
| `src/engine/ui/sheet.js:36` | `Close reading` |  |
| `src/engine/ui/sheet.js:89` | `Reading` |  |
| `src/engine/ui/labels.js:470` | `Figure labels` |  |
| `src/engine/ui/ui.css:1625` | `Show` | CSS generated text after look-closer links → content: var(--lam-t-show, 'Show') |
| `src/engine/ui/shortcuts.js:28` | `Book` | help-card section heading |
| `src/engine/ui/shortcuts.js:29` | `Plate` | help-card section heading |
| `src/engine/ui/shortcuts.js:30` | `While inspecting` | help-card section heading |
| `src/engine/ui/shortcuts.js:35` | `Previous page` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:36` | `Next page` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:37` | `Previous or next page` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:38` | `Title page or last page` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:39` | `Contents` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:40` | `Zoom in or out` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:41` | `Reset the zoom` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:42` | `Full screen` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:43` | `Keyboard shortcuts` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:44` | `Play or pause the animation` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:45` | `Show or hide labels` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:46` | `Explode or reassemble` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:47` | `Toggle a layer` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:48` | `Inspect the figure` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:49` | `Turn the figure 15°` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:50` | `Export SVG colour plate` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:51` | `Reset the view` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:54` | `Turn the figure` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:55` | `Tilt the view` | shortcut label (help card) |
| `src/engine/ui/shortcuts.js:37` | `PgUp` | display key cap |
| `src/engine/ui/shortcuts.js:37` | `PgDn` | display key cap |
| `src/engine/ui/shortcuts.js:38` | `Home` | display key cap |
| `src/engine/ui/shortcuts.js:38` | `End` | display key cap |
| `src/engine/ui/shortcuts.js:44` | `Space` | display key cap |
| `src/engine/ui/shortcuts.js:51` | `Esc` | display key cap |
| `src/engine/ui/shortcuts.js:37` | `Page Up or Page Down` | spoken key names |
| `src/engine/ui/shortcuts.js:38` | `Home or End` | spoken key names |
| `src/engine/ui/shortcuts.js:40` | `Plus or minus` | spoken key names |
| `src/engine/ui/shortcuts.js:47` | `Keys 1 to 9` | spoken key names |
| `src/engine/ui/shortcuts.js:49` | `Left or right bracket` | spoken key names |
| `src/engine/ui/shortcuts.js:54` | `Left or right arrow` | spoken key names |
| `src/engine/ui/shortcuts.js:55` | `Up or down arrow` | spoken key names |
| `src/engine/ui/langswitch.js (new)` | `Language` | NEW: radiogroup label (options are autonyms, never translated) |

#### typeset → `src/i18n/es/typeset.js`

| where (snapshot) | key (exact English) | note |
|---|---|---|
| `src/engine/typeset/sides.js:39` | `Untitled` |  |
| `src/engine/typeset/sides.js:114` | `Introduction` |  |
| `src/engine/typeset/sides.js:115` | `How to use this book` |  |
| `src/engine/typeset/sides.js:121` | `Plate {n}` |  |
| `src/engine/typeset/sides.js:130` | `Note` |  |
| `src/engine/typeset/sides.js:131` | `Sources & colophon` |  |
| `src/engine/typeset/sides.js:132` | `Glossary` |  |
| `src/engine/typeset/sides.js (new)` | `How this book was made` | NEW: contents entry + running head of the making leaf |
| `src/engine/typeset/sides.js:172` | `Lesson {numeral} · {title}` | running head |
| `src/engine/typeset/sides.js:174` | `How to use this book` |  |
| `src/engine/typeset/sides.js:176` | `Sources & colophon` |  |
| `src/engine/typeset/layouts/front.js:88` | `Published by {publisher}.` |  |
| `src/engine/typeset/layouts/front.js:89` | `Text, plates and interactive figures are original works made for this edition. Every figure is a living plate: turn it, open it, peel back its layers and take it home as a vector drawing.` |  |
| `src/engine/typeset/layouts/front.js:90` | `Set in {fonts}. Typeset, printed and bound live in your browser with Three.js — WebGPU, with a WebGL 2 fallback.` | {fonts} = fmtList(fontsUsed) (replaces listify(" and ")) |
| `src/engine/typeset/layouts/front.js:137` | `Contents` |  |
| `src/engine/typeset/layouts/front.js:178` | `Lessons` |  |
| `src/engine/typeset/layouts/front.js:178` | `Plates` |  |
| `src/engine/typeset/layouts/front.js:213` | `Back matter` |  |
| `src/engine/typeset/layouts/front.js:233` | `Introduction` | intro kicker and default title |
| `src/engine/typeset/layouts/front.js:259` | `“{text}”` | pull-quote marks → quote() formatter («…» in es) |
| `src/engine/typeset/layouts/front.js:339` | `Before you begin` |  |
| `src/engine/typeset/layouts/front.js:341` | `How to use this book` |  |
| `src/engine/typeset/layouts/front.js:371` | `Reading a plate` |  |
| `src/engine/typeset/layouts/front.js:376` | `Conservation status, as assessed on the IUCN Red List.` |  |
| `src/engine/typeset/layouts/front.js:377` | `Every figure performs a seamless five-second study of how the organism moves, grows or is built.` |  |
| `src/engine/typeset/layouts/front.js:378` | `“Look closer” items are clickable: each one points to a part on the living figure.` |  |
| `src/engine/typeset/layouts/front.js (new)` | `by` | NEW: title-page author line above the wordmark |
| `src/engine/typeset/layouts/front.js (new)` | `Author` | NEW: imprint credit label above the wordmark |
| `src/engine/typeset/layouts/back.js:49` | `A note` |  |
| `src/engine/typeset/layouts/back.js:49` | `Note` |  |
| `src/engine/typeset/layouts/back.js:73` | `Words used in this book` |  |
| `src/engine/typeset/layouts/back.js:73` | `Glossary` |  |
| `src/engine/typeset/layouts/back.js:130` | `For further reading` |  |
| `src/engine/typeset/layouts/back.js:130` | `Sources` |  |
| `src/engine/typeset/layouts/back.js:157` | `Colophon` |  |
| `src/engine/typeset/layouts/making.js (new)` | `The prompt` | NEW layout |
| `src/engine/typeset/layouts/making.js (new)` | `This book’s brief` | NEW layout |
| `src/engine/typeset/layouts/making.js (new)` | `The series began with one prompt to {model}. It is printed as it was written.` | NEW (es: "…traducida del original en inglés.") |
| `src/engine/typeset/layouts/making.js (new)` | `Each book was then researched, written, fact-checked twice and revised by its own team of agents, from this brief:` | NEW |
| `src/engine/typeset/layouts/making.js (new)` | `Translated from the English original` | NEW (printed only when edition.locale ≠ en) |
| `src/engine/typeset/layouts/plate.js:143` | `Lesson {numeral}` | plate header kicker and figure-page plate number (two sites) |
| `src/engine/typeset/layouts/plate.js:143` | `Plate {numeral}` |  |
| `src/engine/typeset/layouts/plate.js:231` | `Fig. {n} — *{scientific}*` | fallback caption |
| `src/engine/typeset/layouts/plate.js:248` | `Drag to turn the figure · double-click to inspect` |  |
| `src/engine/typeset/layouts/plate.js:256` | `Layers` |  |
| `src/engine/typeset/layouts/lesson.js:45` | `Lesson {numeral}` |  |
| `src/engine/typeset/layouts/lesson.js:119` | `Common mistakes` |  |
| `src/engine/typeset/layouts/lesson.js:120` | `Proportions` |  |
| `src/engine/typeset/layouts/lesson.js:247` | `Pro tip` |  |
| `src/engine/typeset/blocks.js:109` | `Field notes` |  |
| `src/engine/typeset/blocks.js:138` | `Look closer` |  |
| `src/engine/typeset/blocks.js:177` | `Did you know?` |  |
| `src/engine/typeset/blocks.js:305` | `**Sources** — {list}` | keep the markup in the key |
| `src/engine/typeset/blocks.js:344` | `{title} — a five-second loop` |  |
| `src/engine/typeset/draw.js:270` | `Extinct` | IUCN fallback label (UICN 2012 names) |
| `src/engine/typeset/draw.js:271` | `Extinct in the Wild` | IUCN fallback label (UICN 2012 names) |
| `src/engine/typeset/draw.js:272` | `Critically Endangered` | IUCN fallback label (UICN 2012 names) |
| `src/engine/typeset/draw.js:273` | `Endangered` | IUCN fallback label (UICN 2012 names) |
| `src/engine/typeset/draw.js:274` | `Vulnerable` | IUCN fallback label (UICN 2012 names) |
| `src/engine/typeset/draw.js:275` | `Near Threatened` | IUCN fallback label (UICN 2012 names) |
| `src/engine/typeset/draw.js:276` | `Least Concern` | IUCN fallback label (UICN 2012 names) |
| `src/engine/typeset/draw.js:277` | `Data Deficient` | IUCN fallback label (UICN 2012 names) |
| `src/engine/typeset/draw.js:278` | `Not Evaluated` | IUCN fallback label (UICN 2012 names) |

#### figures-export → `src/i18n/es/export.js`

| where (snapshot) | key (exact English) | note |
|---|---|---|
| `src/engine/figures/FigureHost.js:874` | `FIGURE UNAVAILABLE` |  |
| `src/engine/export/svg.js:231` | `Figure` |  |
| `src/engine/export/svg.js:232` | `Line art for colouring.` |  |
| `src/engine/export/svg.js:232` | `Colour plate.` |  |
| `src/engine/export/svg.js:232` | `Exported from a Lámina living plate.` |  |
| `src/engine/export/index.js:227` | `Nothing solid to export — switch a figure layer back on` |  |
| `src/engine/export/idpass.js:616` | `Body` | prettyName() fallback; generated names ("Water surface") pass through t() too |
| `src/engine/export/raster.js:766` | `{part} — dark markings` | autoName(): build with t(), not by concatenation |
| `src/engine/export/raster.js:766` | `{part} — pale markings` |  |
| `src/engine/export/raster.js:766` | `{part} — coloured markings` |  |
| `src/engine/export/raster.js:766` | `{part} — markings` |  |

### 9.2 Fonts and glyphs

All Spanish characters are in the Latin subsets the books already load. Checked by reading the
`cmap` of every Latin WOFF2 face in use (EB Garamond 400/400i/500/600, Cormorant Garamond
500/600/500i/600i, IBM Plex Sans Condensed 400/500/600, IBM Plex Mono 400/500, Oswald 500/600):
each maps `¿ ¡ ñ Ñ á é í ó ú ü Á É Í Ó Ú Ü « » — – … “ ” ‘ ’ ª º · ×`; a negative control found
`š Ł ő Ā` missing from the Latin subset and `¿` missing from latin-ext, as expected. `fonts.js`
already samples `ÁáÉéÍíÑñÓóÚúÜü` in `LATIN_SAMPLE`; nothing changes, and the glyph survey still
fetches an extended subset for any character a translator adds beyond Latin-1.

### 9.3 books

Manifest text → `src/books/es/<id>.js` (§2). New: `src/books/making.js` / `src/books/es/making.js`
(§7.1). `src/books/index.js` has no user-visible string.

### 9.4 snakes, flowers, skulls

Full listing in Appendix A (generated from the source with a parser, curated: ids, mesh names and
code-only strings removed; template literals expanded where the set is finite).

---

## 10. Work breakdown: nine areas, disjoint files

Every area may read anything and may start at once against the interfaces in §1.4. Core lands a
stub of `src/i18n/index.js` first (`t` = fill placeholders, `getLang` = `'en'`, `loadEdition` =
English) so nobody waits. Nobody commits.

| area | provides to others | consumes |
|---|---|---|
| A core | the i18n, edition and schema APIs (§1.4, §2); `src/i18n/es/index.js` | H: `BOOKS[].es`, `MAKING` |
| B app-shell | `parseRoute`/`routeHash`/`withLang`/`bookHref`/`libraryHref`; boot's `changeLang`, `requestLang` and view contract | A; D `createLangSwitch`; E `buildSides`/`renderPage` (covers); C view contract |
| C app-reader | `prepareLang`/`applyLang`; `lamina.lang/setLang/spreadOf/i18nMissing`; `PageCache` API | A; D `createUI({ lang })`, `ui.setLang`, `'lang'` command; E making leaf, `renderPage`; F `relocalize`, `setBeats`, `exportFigureSVG({ lang })`, `exportFileName` |
| D ui | `createUI({ lang })`, `ui.setLang`, `'lang'` command, `createLangSwitch` | A |
| E typeset | `buildSides` (making leaf; `book.author/publisher/locale`), `renderPage().hOverflow`, `marks.js`, `hyphenate(word, lang)` | A `tl`, `en`, formatters; H making data and author fields |
| F figures-export | translated `labelItems`/`beats`, `relocalize`, `setBeats`, `exportFigureSVG({ lang })`, `exportFileName`, `lab.info().strings` | A |
| G figure strings | `src/i18n/es/{snakes,flowers,skulls}.js` | Appendix A; I audit `--i18n` output |
| H books | `BOOKS[].es`, `MAKING`, `making.js` shape (§7.1), `author`/`publisher` in the English manifests | — |
| I tooling & docs | validator, audit, capture, `i18n-strings.mjs`, skill and docs | A schema, `composeEdition`, `dictionaryEntries`, `hasT`; E `marks.js`; F `lab.info().strings`; C automation API |

### A. core — `src/i18n/index.js`, `edition.js`, `schema.js`, `es/index.js`

1. Stub (hour 1), then the full runtime of §1.4 (`t` with template compilation and memo, `tl`, `hasT`,
   `missingKeys`, formatters, preference, `onLang`, `setLang` with `<html lang>`).
2. `schema.js` exactly as §2.2, with a `walk(schema, value, visit)` helper the validator reuses.
3. `edition.js`: `composeEdition` (§2.3), `en()`, `loadEdition(id, lang)` using `BOOKS[].load/es` and
   `MAKING` from `src/books/index.js` (import only; the registry must not import i18n).
4. `es/index.js`: import the eight domain files (create them empty with an owner comment so other
   areas fill them), export `DOMAINS`.
5. Acceptance: a Node script (no DOM) shows `t`/`tl` exact, template, fallback and placeholder
   behaviour; `preferredLang(['de-DE','es-CR','en'])` → `es`, `([])` → `en`; composing each English book
   with a copy of itself yields an empty report and `en(edition.plates[0]) === english.plates[0]`;
   formatter outputs equal the ones quoted in §1.4.

### B. app-shell — `src/app/route.js`, `boot.js`, `Library.js`, `app.css`, `index.html`, `src/i18n/es/shell.js`

1. `route.js` per §1.4; `bookHref`/`libraryHref` carry the language.
2. `boot.js`: resolve → rewrite (`replaceState`) → `await loadLang` → `setLang` before the first
   route; view key `${lang}|${book}`; `changeLang` orchestration (§1.2) with a token; hashchange that
   only changes the language → `changeLang(lang, { persist: false })` on the live view, then
   `api.navigate(params)` as today when the plate or spread changed too; pass
   `lang`/`requestLang` to views; `onLibrary`/`onOpen` use the hrefs; fatal-card strings and the canvas
   `aria-label` through `t()`; `<title>` fallback.
3. `Library.js`: `loadEdition` for the three books; header switch (`createLangSwitch`); localised
   header, hint, `aria-label`, `document.title`, captions and hrefs; `prepareLang`/`applyLang`
   (covers re-printed one per frame, old textures disposed after the swap).
4. `app.css`: header row with the switch; phone and landscape variants.
5. Acceptance: `#/` → `#/en/` (or `#/es/` for a stored `es` or `navigator.languages` led by `es`)
   with `history.length` unchanged; `#/es/` shows a Spanish shelf (screenshot) and `<html lang="es">`;
   switching persists `lamina.lang` and rewrites the hash in place (Back does not undo it); a typed
   `#/en/` with a stored `es` shows English and keeps the stored `es`; `await lamina.ready` after
   `location.hash = '#/es/'` resolves only once the shelf is Spanish.

### C. app-reader — `src/app/Reader.js`, `pages.js`, `a11y.js`, `src/i18n/es/app.js`

1. `manifest`/`sides` become `let`; `api.manifest`/`api.sides` getters; edition from `loadEdition`.
2. `prepareLang`/`applyLang` exactly as §1.5, with the parity assertion and timing marks
   (`performance.mark('lamina:lang:start'|'…:visible'|'…:all')`).
3. `PageCache.setSides/isStale/refresh`; `ensureSide`/`applySide` honour staleness.
4. The making spread: `SPREAD_NAMES.making`, `VERSO_FIRST`, toc entry; `api.spreadOf()`.
5. Strings through `t()` (SPREAD_NAMES, toasts, announcements, `kind`), layer `label`/`hint` through
   `t()` in `syncUI`; `host.relocalize()`/`setBeats()` on switch; the `'lang'` UI command →
   `requestLang`.
6. Export: title from the edition, credit with author and publisher, `exportFileName({ …, lang })`.
7. `a11y.js`: all headings and run-ins through `t()`; `sideHTML` for `making`; imprint credit
   (`Author: Josoroma`); in Spanish, `lang="en"` on a source `<li>` whose text equals its English
   counterpart (WCAG 3.1.2,
   [Understanding Language of Parts](https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html); P2).
8. Acceptance: at `#/es/serpientes?plate=3&t=2.4&layers=skeleton:1&explode=0.6&labels=1`, a switch to
   English keeps `info().opened`, `time` (2.4), `layers`, explode and labels; no long task > 50 ms
   (PerformanceObserver `longtask`); both visible sides re-printed in the switch frame; every kept side
   within 12 frames; Read sheet, screen-reader mirror, `document.title` and URL in the new language;
   the SVG exported next has the right key language and file name; after visiting every spread in
   Spanish `lamina.i18nMissing()` is `[]`.

### D. ui — `src/engine/ui/*` (+ ★ `langswitch.js`, `langswitch.css`), `ui.html`, `src/i18n/es/ui.js`

1. Wrap every string of §9.1 *ui* in `t()`, moving static assignments into one `localize()` run at
   creation and by `ui.setLang`. Rebuild open popovers (reset `layersKey`, `plateKey`, `beatsKey`),
   re-render the help card from `SHORTCUTS` with `t(sc.label)`, `t(heading)`, translated key caps
   and `spoken` names; the drawer's static texts; the sheet's close label and fallback; the label
   overlay's `aria-label`; refresh an open label card when its text changes.
2. Numbers: `fmtSeconds` for the Moment readout and narration, `fmtPercent` for explode.
3. CSS text: `.lam-prose a.lam-look::after { content: var(--lam-t-show, 'Show') }`, the variable set
   by `localize()` to `JSON.stringify(t('Show'))`.
4. The switch component (§8) and its place in the top bar; the `'lang'` command; `createUI({ lang })`,
   `ui.setLang(lang, { libraryHref })`.
5. `ui.html?lang=es` harness.
6. Acceptance: `ui.html?lang=es` and the reader in Spanish at 1440 × 900, 390 × 844 and 320 × 568
   show no English chrome (screenshots read); keyboard: Tab lands on the checked option, ←/→ switch,
   Space checks, focus stays; options expose `lang`; 44 px targets on touch; no horizontal overflow
   of the top pill at 320 px.

### E. typeset — `src/engine/typeset/*` (+ ★ `hyphen-es.js`, `marks.js`, `layouts/making.js`), `typeset.html`, `src/i18n/es/typeset.js`

1. `tl(page.book.locale, …)` for every string of §9.1 *typeset* (layouts, `blocks.js`, running heads
   and contents labels in `sides.js`), `fmtList` for the imprint fonts, `quote()` for the pull quote,
   collator for the glossary.
2. `buildSides`: `publisher`/`author` normalisation, the making leaf (§7.2), `locale`.
3. Author mark (§6): `marks.js`, boards, title page, imprint.
4. `layouts/making.js` (§7.3) with the 25 px floor, registered in `LAYOUTS` (`index.js`) so
   `renderPage` and the glyph survey know it.
5. Hyphenation (§5) and `withLang`; the `\p{L}` hyphen fix.
6. `en()` decisions (§2.4); `dropCap` and `smallCapsLead` leading punctuation.
7. **Horizontal overflow**: auto-fit only measures vertical reach, so single-line texts can run past
   their measure unnoticed. Add `P.lineFit(src, style, x, y, align, maxWidth, minScale = 0.85)` (shrink,
   then record) and use it for the figure-page kicker, the scale/loop meta line, the plate header
   kicker and alt/binomial line, running heads, contents labels, the status chip, the figure-page
   instruction, the cover kicker and publisher, the back-cover title; return `hOverflow` from
   `renderPage`; show it in `typeset.html`.
8. `typeset.html?book=<id>&lang=es` (loads the edition; `?lang` also sets the hyphenation language for
   samples).
9. Acceptance: `typeset.html?book=<id>&lang=<en|es>&page=all` for the three books: no `overflow`, no
   `hOverflow`, every page ≥ 0.9 (making ≥ 0.962), identical layout sequence and folios in both
   languages; the hyphenation vectors of §5.3 pass; the covers, title page and imprint show the mark
   at the §6.2 positions (screenshots read); glossary in Spanish order.

### F. figures-export — `src/engine/figures/FigureHost.js`, `src/engine/export/*`, `src/lab/*`, `lab.html`, `src/i18n/es/export.js`

1. `activeLabels`: `item.text = t(l.text)`, `item.detail = t(l.detail)` (memo per label and language).
2. `beats()` translated; `setBeats()`; `relocalize()` (also re-creates an error notice).
3. Export: `lang` option; translate label marks, part and swatch names (including `prettyName` and
   `autoName` results built through templates), `<title>`/`<desc>`; `xml:lang`/`lang` on the root;
   `meta.lang`; `exportFileName()`.
4. Lab: `?lang=`; `info().strings` for the audit.
5. Acceptance: `lab.html?type=snake&params=…&labels=1&lang=es` shows Spanish pills (screenshot);
   `relocalize()` keeps time, layers and explode; a Spanish colour SVG opens with Spanish key, part
   tooltips and `xml:lang="es"`; file names as §0.

### G. figure strings — `src/i18n/es/snakes.js`, `flowers.js`, `skulls.js`

1. Translate every key of Appendix A (re-extract after the repair workflow lands: prey, head and boa
   strings are being changed; `node scripts/audit.mjs --lang es --i18n` is the source of truth).
2. Label texts ≤ **120 px** at 12.5 px in the UI sans (§11 risk 3); details may be longer.
3. Anatomy and botany terms checked against a Spanish reference per subject (the accuracy protocol:
   the Spanish label must name the same structure).
4. Acceptance: the audit reports 0 missing keys and 0 labels over 120 px for every plate figure.

### H. books — `src/books/index.js`, `src/books/making.js`, `src/books/es/making.js`, English manifests

1. Registry: `es: () => import('./es/<id>.js')` per book; `MAKING = { en, es }` loaders.
2. `making.js` verbatim (generate once from the docs, then the validator guards it); Spanish
   translations of the prompt (41 lines, same structure) and the three briefs.
3. English manifests: `author: { name: 'Josoroma', mark: 'josoroma' }`, `publisher: 'Lámina Natural
   History Press'`. Tell the translators (their files must mirror it; until then the validator warns).
4. Headroom for the Serpientes sources page (0.90 in English today, §11 risk 1): drop the colophon
   lines that repeat the imprint's engine paragraph, in both editions.
5. Acceptance: `node scripts/validate-books.mjs --lang all --fit` passes once the translators deliver.

### I. tooling & docs — `scripts/validate-books.mjs`, `audit.mjs`, `capture.mjs`, ★ `scripts/i18n-strings.mjs`, `package.json` scripts, `.claude/skills/lamina/**`, `docs/**`, `README.md`

Everything in §12 and the skill changes in §13.

---

## 11. Risks and mitigations

1. **Spanish page fit.** English today: Serpientes sources page 0.90; Calaveras lesson versos 0.90,
   0.90, 0.925, 0.95, 0.90, 0.925; everything else ≥ 0.975. Stress test (`inflate.js`: every text grown
   by repeating its own words): Serpientes plate versos still ≥ 0.9 at +25 %, but its sources page
   overflows at 0.85 from +10 %; Flores stays ≥ 0.95 at +25 %; Calaveras lesson versos fall to 0.875 at
   +10–15 % and 0.85 at +20–25 %. The one Spanish text measured here, the draft prompt of §7.3, is
   11 % longer in characters than its original; at that rate **the Calaveras lesson versos must be
   copy-fitted** (no longer, in rendered lines, than the English) and the Serpientes colophon trimmed
   (H.4). Mitigations: `validate --fit` prints each page's scale in both
   languages so translators see the gap; Spanish hyphenation tightens the justified columns; the
   typeset area may give the lesson notes grid more room for both editions, never by going below 0.9.
2. **Horizontal overflow of single lines** (not caught by auto-fit): E.7 adds detection and
   shrink-to-fit; the validator fails on `hOverflow`.
3. **Label pills.** Pills have `max-width` 210 px (desktop) or `min(200, 0.44·vw)` (phones) with
   10 px padding and an ellipsis (`ui.css:629`, `labels.js:536`). Measured (macOS system UI font,
   12.5 px): English labels ≤ 115 px; plausible Spanish drafts reach 156 px ("Punta de la cola
   espinosa"), 154 ("Colmillos fijos delanteros"), 139 ("Cola en forma de remo"), against text room
   of 152 / 138 / 121 px on 390 / 360 / 320 px phones. Rule G.2 (≤ 120 px) keeps every label whole on a
   320 px phone; wider pills also push columns into rows more often, so screenshots of every plate at
   1440 × 900 and 390 × 844 in Spanish are part of acceptance.
4. **Re-typeset cost.** Measured small (§1.5). Guards: prepare (imports, fonts) before the flip;
   visible pages first; one stale page per frame after; stale textures stay visible; first Spanish
   switch has cold measurement caches — measured by the `performance.mark`s in C.2.
5. **Font subsets.** Verified complete (§9.2). The survey keeps working for exotic characters.
6. **SVG key widths.** The key wraps by character count with a hanging indent and never cuts
   (`svg.js:184–218`), so longer Spanish details make taller keys, not clipped ones; the one-line title
   is the plate's common name and binomial, the same length in both languages. Check: every Spanish
   colour SVG opened and read in the capture.
7. **Text-derived styling** would diverge between editions: fixed by `en()` (§2.4).
8. **Strings changing under the repair workflow** (snakes head and prey, boa, skulls): never trust the
   snapshot line numbers; G works from the audit's runtime extraction; the validator lists dictionary
   keys no longer produced (warnings) and produced keys missing (errors).
9. **Template over-matching**: rule 3.3.3 plus a validator check.
10. **Keyboard layouts.** `matchShortcut` ignores Ctrl/Alt chords (`shortcuts.js:71`). On the Latin
    American layout `[` and `]` are unshifted keys right of Ñ
    ([kbdlayout.info, KBDLA](https://kbdlayout.info/kbdla)), so they work; on layouts where they need
    AltGr or Option the chord is filtered out. Mitigation (app-reader, P2): also accept
    `e.code === 'BracketLeft'|'BracketRight'` for "turn the figure".
11. **Translators' files already in progress** without `author`/`publisher`/`locale: 'es'`: ID fields
    are optional in Spanish files and the validator explains each mismatch.
12. **Number parity false positives** ("twenty-two" ↔ "22"): errors only in `facts[][1]`,
    `scaleNote`, `status.source`; warnings elsewhere.

---

## 12. Tooling

### 12.1 `scripts/validate-books.mjs [ids…] [--lang en|es|all] [--fit] [--json out.json]`

English (as today, plus): `author` object and `publisher`; book ids are not language codes; every
manifest path declared in the schema; `making.js` equals the docs (prompt lines from the block after
`## Prompt (verbatim)`, `> ` stripped; briefs from the `books` array of `02-build-workflow.js`);
`marks.js` equals `public/author/josoroma.svg`.

Spanish, per book:

| check | severity |
|---|---|
| file exists, `locale: 'es'` | error |
| compose report: missing text, extra keys, array lengths, plate/label id sets, unknown paths | error (order: warning) |
| ID fields present but different from English | error (`author` string during migration: warning) |
| untranslated: identical to English, kind TEXT (or SCI/TAXON failing their pattern), and containing an English function word (`the and of with to is are was were from for its this that in on by as at or into than which when where while be it an`) or ≥ 3 words | error; identical otherwise → info |
| English residue: ≥ 2 English function words in a Spanish TEXT string outside sources | warning |
| binomial parity: every `*Genus species*` span of the English string present and italic | error |
| number parity (locale-aware parsing, multiset compare) | error in `facts[][1]`, `scaleNote`, `status.source`; warning elsewhere |
| typography: straight quotes, `...`, unpaired `?`/`!` without `¿`/`¡`, digit `%` without space, `\d\.\d{1,2}\b` decimal point, double spaces | warning |
| word budgets × 1.25 (word counts differ between languages; `--fit` is the binding check) | warning |
| making: 41 lines, blanks and bullets at the English indices, URLs identical, brief present | error |

Dictionaries (`--lang es`): key collisions with different values; placeholder sets equal; no empty
value; template keys contain a literal word; static keys from `scripts/i18n-strings.mjs` all present;
keys no longer produced (warning).

`--fit` (needs the dev or preview server; `LAMINA_URL`): opens
`typeset.html?book=<id>&lang=<l>&page=all&width=512` per language and fails on any `overflow`,
`hOverflow`, page < 0.9 (making < 0.962) or any difference between the two languages' layout
sequence, folios and spreads; prints a per-page table (`#idx layout  en 0.975  es 0.925`).

### 12.2 `scripts/i18n-strings.mjs [--lang es] [--missing] [--json]` (new)

Parses `src/**/*.js` (not the dictionaries) with `rolldown/parseAst` (already installed with Vite) and
lists the literal first arguments of `t()` and `tl(lang, …)`: the static key set, each with
`file:line` and its domain by path (`src/app/{boot,Library,route}` → shell, `src/app/*` → app,
`src/engine/ui` → ui, `src/engine/typeset` → typeset, `src/engine/{figures,export}` and `src/lab` →
export, `src/subjects/<x>` → `<x>`). `--missing` prints keys absent from the Spanish dictionary,
grouped by the file that must hold them. Also regenerates Appendix-A-style listings of subject strings.

### 12.3 `scripts/audit.mjs [ids…] [--webgl] [--lang en|es] [--i18n] [--json out.json]`

`--lang es` opens the lab with `&lang=es`. `--i18n` collects `lab.info().strings` for every plate figure
and reports, per figure, keys `hasT(key, 'es')` misses and label texts wider than 120 px (measured in
the page with the UI font at 12.5 px); errors make the exit code 1. The JSON carries the full runtime
string set for `i18n-strings.mjs` and the translators.

### 12.4 `scripts/capture.mjs [--book id] [--lang en|es|both] [--out docs/outputs] …`

Default `both`. English outputs keep today's paths; Spanish ones go to `docs/outputs/<id>/es/`
(and `library-es.png`). URLs become `#/<lang>/<id>?…`. Back matter by name, not offset:
`lamina.spreadOf('note')`, `'glossary'`, `'making'` — `info.spreads − 3` / `− 2` (capture.mjs:111–112)
would now land on the wrong spreads. New shots: `92-making.png` (both making spreads),
`reader-ui.png` with the switch visible, a switch sequence (Spanish plate → English, same spread). The
run fails if `lamina.i18nMissing()` is not empty at the end of a Spanish book.

### 12.5 Harness pages

`typeset.html?…&lang=es` (E), `lab.html?…&lang=es` (F), `ui.html?lang=es` (D), reader
`#/es/<id>` (C). `package.json`: `"i18n": "node scripts/i18n-strings.mjs --lang es --missing"`.

---

## 13. Skill and docs changes (owner: tooling & docs)

- **`SKILL.md`**: every book ships English and Spanish; quick-start table with `#/<lang>/<book>`,
  `typeset.html?…&lang=es`, `lab.html?…&lang=es`; "Making a new book" gains: record the user's prompt for
  the book in `src/books/making.js` (`BRIEFS[id]`, verbatim, with its source doc) and its translation;
  write `src/books/es/<id>.js` (full-shape copy, §2); add figure strings to `src/i18n/es/<subject>.js`;
  run `validate --lang all --fit` and `audit --lang es --i18n`. Non-negotiables: code keeps English
  keys and translates at output; numbers through the formatters; both editions fit ≥ 0.9; the author
  mark on both boards. Gotchas: Spanish text ran ≈ 10 % longer here (lesson versos need copy-fitting); single lines can
  overflow sideways; never translate ids; template keys need a literal word; the switch replaces
  history; `commonAlt` carries the other language.
- **`references/architecture.md`**: the i18n module, the flow of §1.2, the view contract, the
  `window.lamina` additions (`lang`, `setLang`, `spreadOf`, `i18nMissing`).
- **`references/manifest.md`**: `author`/`publisher`, `locale`, the Spanish edition file and the key
  set table, Spanish budgets (fit-based), the making leaf in the page order
  (`leafCount = plates + 7`), the units line ("`1500 m`, `12 000`, `1,2–1,8 m` in Spanish").
- **`references/verify.md`**: both locales in every command; QA items: switch keeps state, no English
  left in Spanish chrome, pills not truncated, `hOverflow` empty, making pages ≥ 25 px.
- **`references/design.md`**: the switch (§8), the author mark (§6).
- **`references/accuracy.md`**: translation review lens (same claim, same numbers, same structure;
  Spanish anatomical and botanical terms).
- **`templates/book.js`** (`author`/`publisher`) and ★ `templates/book.es.js`; **`scripts/new-book.mjs`**
  creates both, registers the `es` loader and a `BRIEFS` stub.
- **`evals/evals.json`**: an eval "Add a Spanish edition to Ranas" asserting validator and audit pass in
  `es`.
- **`docs/architecture/CONTRACTS.md`** §15 (append-only log): bilingual editions, routes, page order
  addition, `renderPage().hOverflow`, UI `setLang`/`'lang'`, automation additions; §6 gains the
  `author`/`publisher` fields and the making leaf; §7 the `making` layout.
- **`docs/README.md`**, **`docs/books/<id>.md`**, **`README.md`**: the two languages, the Spanish outputs,
  the making-of page, the author.

---

## 14. Global acceptance

1. `node scripts/validate-books.mjs --lang all --fit` → 0 errors; `node scripts/audit.mjs --lang es --i18n`
   → 0 missing keys, 0 labels over 120 px, no seam regressions; `node scripts/i18n-strings.mjs --missing`
   → empty.
2. `LAMINA_URL=http://127.0.0.1:4173 node scripts/capture.mjs --lang both` completes with no console
   errors and `i18nMissing()` empty; every Spanish PNG and SVG read by a reviewer.
3. Reader, both backends (`?gl=webgl`), 1600 × 1000, 1440 × 900, 390 × 844, 768 × 1024, 844 × 390: switch
   on a plate keeps spread, time, layers, explode, labels and inspect; no task over 50 ms; no English
   chrome in Spanish; `<html lang>`, title and URL follow.
4. Covers, back covers, title pages and imprints of the three books show the mark (§6.2), on the shelf
   too; the last two text pages of every book are the prompt and the brief, in both languages, at ≥ 25 px.

---

## 15. Sources

Repository: `docs/prompts/00-original-brief.md`; `docs/prompts/02-build-workflow.js`;
`public/author/josoroma.svg`; `src/**` as cited by path and line.

- J. Bezos, *División de palabras con guiones*, v4.2 (30 Aug 2008), TeXemplares — CTAN `hyphen-spanish`:
  https://ctan.math.washington.edu/tex-archive/languages/spanish/hyphen-spanish/division.pdf
- S. Terrones Juárez, "El guion al final de renglón o línea", *Castellano Actual*, Universidad de Piura,
  22 Jul 2013: https://www.udep.edu.pe/castellanoactual/el-guion-al-final-de-renglon-o-linea/
- C. Briceño, "(—), (-), (‒) … Encuentre las 7 diferencias (II)", *Castellano Actual*, 26 Feb 2018:
  https://www.udep.edu.pe/castellanoactual/‒-encuentre-las-7-diferencias-ii/
- "Uso del guion para dividir palabras al final de la línea", *Castellano Actual*, 25 Sep 2019:
  https://www.udep.edu.pe/castellanoactual/uso-del-guion-para-dividir-palabras-al-final-de-la-linea/
- S. Terrones Juárez, "Las comillas y sus usos", *Castellano Actual*, 29 Apr 2013:
  https://www.udep.edu.pe/castellanoactual/las-comillas-y-sus-usos/
- "Por ciento (%)", *Castellano Actual*, 14 Oct 2016: https://www.udep.edu.pe/castellanoactual/por-ciento/
- P. Celi, "Ortografía de los títulos de libros", *Castellano Actual*, 20 Apr 2020:
  https://www.udep.edu.pe/castellanoactual/ortografia-de-los-titulos-de-libros/
- Unicode CLDR 49, cldr-json `cldr-numbers-full` (`es`, `es-CR`, `es-419`):
  https://github.com/unicode-org/cldr-json/tree/main/cldr-json/cldr-numbers-full/main
- UICN (2012), *Directrices para el uso de los Criterios de la Lista Roja de la UICN a nivel regional y
  nacional: Versión 4.0*, Fig. 2: https://docs.gbif.org/course-data-use/exercise-data/RL-2012-002-Es.pdf
- W3C WAI-ARIA Authoring Practices, Radio Group pattern: https://www.w3.org/WAI/ARIA/apg/patterns/radio/
- W3C, Understanding WCAG 2.2 SC 3.1.1 and 3.1.2:
  https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html ·
  https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html
- W3C Internationalization, "Declaring language in HTML":
  https://www.w3.org/International/questions/qa-html-language-declarations
- MDN: `hashchange` event — https://developer.mozilla.org/en-US/docs/Web/API/Window/hashchange_event ;
  `navigator.languages` — https://developer.mozilla.org/en-US/docs/Web/API/Navigator/languages ;
  `localStorage` exceptions — https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage ;
  `Path2D()` — https://developer.mozilla.org/en-US/docs/Web/API/Path2D/Path2D ;
  `Intl.NumberFormat` `useGrouping` —
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat
- kbdlayout.info, Latin American keyboard layout (KBDLA): https://kbdlayout.info/kbdla

---

## Appendix A — subject strings (snapshot; `L` = line)

Titles (`*.title`, POSE titles in `snakes/index.js:32–41`) are developer labels (§3.2): translate them
last. Figure beats in code are fallbacks that the manifests override. Keys that repeat across lines are
one dictionary entry.

**`src/subjects/flowers/guarianthe.js`** → `src/i18n/es/flowers.js` (33)

L74 `Sepals & petals` · `The rosy-purple perianth: 3 sepals and 2 wavy petals`  
L75 `Column & lip` · `The lip rolled around the column — the orchid's pollination machine`  
L76 `Leaves & pseudobulbs` · `Water-storing pseudobulbs, each with two leathery leaves`  
L277 `Dorsal sepal` · `Three narrow sepals form the outer whorl of the flower.`  
L278 `Petal` · `Two broad petals with wavy margins flank the dorsal sepal.`  
L279 `Labellum (lip)` · `The third petal, rolled into a tube with a magenta front lobe and pale throat.`  
L280 `Column` · `Stamen and style fused in one organ, hidden inside the lip.`  
L281 `Pseudobulb` · `A club-shaped, water-storing stem that carries two leaves.`  
L282 `Leaf` · `Thick, leathery leaves cut water loss for a plant living on bark.`  
L284 `Sepals`  
L285 `Petals`  
L286 `Labellum`  
L287 `Column`  
L288 `Flower bud` · `Flower`  
L289 `Raceme, pedicels & ovaries`  
L290 `Spathe`  
L291 `Pseudobulbs & leaves`  
L292 `Host branch`  
L296 `Guarianthe skinneri — guaria morada in bloom`  
L298 `A raceme of rosy-purple flowers rises from the spathe atop a pseudobulb.`  
L299 `Time-lapse: a bud unfurls — sepals, then petals, then the lip.`  
L300 `The lip flutters: its rolled tube guides a visiting bee onto the column.`  
L301 `Loop: the time-lapse runs back to the bud; the open flowers keep swaying.`

**`src/subjects/flowers/handroanthus.js`** → `src/i18n/es/flowers.js` (23)

L62 `Flowers` · `Golden tubular-bell corollas with reddish nectar guides in the throat`  
L63 `Calyx` · `The bell-shaped, densely hairy calyx that stays when the corolla falls`  
L64 `Branch` · `Leafless twigs — the tree blooms bare in the dry season`  
L239 `Corolla` · `A golden, bell-like trumpet of five fused petals, 3.6–7.5 cm long.`  
L240 `Nectar guides` · `Fine reddish lines in the throat lead bees to the nectar.`  
L241 `Calyx` · `Bell-shaped and densely hairy; it stays on the twig when the corolla falls.`  
L242 `Branch` · `Bare twigs: the tree drops its leaves before this dry-season bloom.`  
L244 `Corollas`  
L245 `Calyces & styles`  
L246 `Branch`  
L247 `Falling corolla`  
L267 `Handroanthus ochraceus — cortez amarillo in dry-season bloom`  
L269 `Dense clusters of golden trumpets crown the bare twigs.`  
L270 `A corolla lets go; the hairy calyx stays on the twig.`  
L271 `It lands on the ground — under the tree they form a golden carpet.`  
L272 `Loop: a fresh corolla opens in its place.`

**`src/subjects/flowers/heliconia.js`** → `src/i18n/es/flowers.js` (27)

L69 `Bracts` · `Boat-shaped bracts in two ranks — the showy part of the inflorescence`  
L70 `Flowers` · `The true flowers: slender white tubes tipped with dark green, inside the bracts`  
L71 `Hummingbird` · `A hummingbird with a hermit-type curved bill, probing for nectar`  
L318 `Bract` · `Waxy, boat-shaped bracts in two ranks; red with a yellow band and green margins.`  
L319 `Flower` · `The true flowers are slender curved tubes, white tipped with dark green.`  
L320 `Rachis` · `The zig-zag axis that carries the two ranks of bracts.`  
L321 `Hummingbird` · `Hummingbirds pollinate it; a long, curved bill fits the curved flowers.`  
L322 `Leaf` · `Banana-like leaves on long petioles; adult blades reach 1–2 m.`  
L324 `Bracts`  
L325 `Flowers`  
L326 `Rachis`  
L327 `Pseudostem & leaf sheaths`  
L328 `Leaf`  
L329 `Hummingbird`  
L333 `Heliconia wagneriana — platanilla and its hummingbird`  
L335 `A hummingbird hovers beside the erect inflorescence.`  
L336 `It darts in towards a flower emerging from a bract.`  
L337 `The curved bill slides into the curved flower to sip nectar.`  
L338 `It backs away; pollen picked up here travels to the next plant.`

**`src/subjects/flowers/nymphaea.js`** → `src/i18n/es/flowers.js` (30)

L63 `Petals & sepals` · `Four green sepals and a spiral of white petals`  
L64 `Stamens & stigma` · `Many yellow stamens grading into petals, around the stigmatic disc`  
L65 `Pads` · `Floating leaves with a deep sinus and toothed margins, purple beneath`  
L66 `Water` · `The pond surface with spreading ripples`  
L273 `Petal` · `About 12–21 white petals in a spiral open by day.`  
L274 `Sepal` · `Four sepals, green with purplish streaks outside.`  
L275 `Stamens` · `Numerous yellow stamens; the outer ones are petal-like.`  
L276 `Stigma` · `A radiating stigmatic disc ringed by carpellary appendages.`  
L277 `Pad` · `A floating leaf with a deep sinus and toothed edge, purple beneath.`  
L279 `Sepals`  
L280 `Petals (outer)`  
L281 `Petals (inner)`  
L282 `Stamens`  
L283 `Stigma`  
L284 `Pads`  
L285 `Water`  
L294 `Nymphaea ampla — the white water lily opening on the pond`  
L296 `Open by day: white petals spiral around a crown of yellow stamens.`  
L297 `Ripples spread from the flower's stalk across the still water.`  
L298 `Time-lapse: the flower folds shut, as it does each afternoon…`  
L299 `…and opens again: sepals, outer petals, inner petals, stamens.`

**`src/subjects/flowers/palicourea.js`** → `src/i18n/es/flowers.js` (21)

L74 `Bracts` · `Two glossy red bracts — the "lips" — hold the inflorescence`  
L75 `Flowers` · `Small white star-shaped flowers that open between the bracts`  
L76 `Leaves` · `Opposite leaves with stipules between their stalks (coffee family)`  
L250 `Bract` · `A glossy red bract; the pair looks like lips before the flowers open.`  
L251 `Flower` · `Small white tubular flowers with a five-pointed star mouth.`  
L252 `Leaf` · `Opposite leaves; a stipule bridges each pair, a coffee-family trait.`  
L254 `Bracts`  
L255 `Flowers`  
L256 `Leaves & stipules`  
L257 `Stem & peduncle`  
L261 `Palicourea elata — labios de mujer opening`  
L263 `Two glossy red bracts press together like a pair of lips.`  
L264 `The bracts part…`  
L265 `…and small white flowers rise between them, opening five-pointed stars.`  
L266 `Loop: the flowers sink back and the lips close.`

**`src/subjects/flowers/passiflora.js`** → `src/i18n/es/flowers.js` (40)

L90 `Sepals & petals` · `The scarlet perianth: 5 sepals with apical appendages and 5 petals`  
L91 `Corona` · `Three series of filaments — the passion flower's signature crown`  
L92 `Androgynophore` · `The central column carrying 5 anthers, the ovary and 3 styles`  
L284 `Sepal` · `One of five scarlet sepals; each ends in a slender appendage.`  
L285 `Petal` · `Five narrower petals alternate with the sepals; both reflex when open.`  
L286 `Corona` · `Filaments in three series; the outer ones, to 2 cm, are the longest.`  
L287 `Androgynophore` · `A pale red column lifting stamens and ovary above the corona.`  
L288 `Anther` · `Five green anthers held crosswise dust visiting pollinators.`  
L289 `Stigma` · `Three styles end in capitate stigmas above the densely hairy ovary.`  
L290 `Tendril` · `Axillary tendrils coil around supports and haul the vine upward.`  
L292 `Sepals`  
L293 `Petals`  
L294 `Corona, outer series`  
L295 `Corona, middle series`  
L296 `Corona, inner series`  
L297 `Androgynophore`  
L298 `Stamens`  
L299 `Ovary, styles & stigmas`  
L300 `Bracts`  
L301 `Receptacle`  
L302 `Flower bud`  
L303 `Leaves`  
L304 `Stem & peduncles`  
L305 `Tendril`  
L308 `Passiflora vitifolia — the scarlet passion flower opening`  
L310 `Open: five scarlet sepals and five petals spread and reflex.`  
L311 `A travelling wave ripples through the corona filaments.`  
L312 `The tendril coils as it searches for a support.`  
L313 `Time-lapse: at the end of its single day the flower closes…`  
L314 `…and a fresh bud opens the next morning — sepals, petals, then the corona.`

**`src/subjects/skulls/human.js`** → `src/i18n/es/skulls.js` (22)

L102 `Frontal bone`  
L103 `Parietal bone (right)`  
L104 `Parietal bone (left)`  
L105 `Occipital bone`  
L106 `Temporal bone (right)`  
L107 `Temporal bone (left)`  
L108 `Sphenoid bone`  
L109 `Ethmoid bone`  
L110 `Zygomatic bone (right)`  
L111 `Zygomatic bone (left)`  
L112 `Maxilla (right)`  
L113 `Maxilla (left)`  
L114 `Nasal bone (right)`  
L115 `Nasal bone (left)`  
L116 `Lacrimal bone (right)`  
L117 `Lacrimal bone (left)`  
L118 `Palatine bone (right)`  
L119 `Palatine bone (left)`  
L120 `Vomer`  
L121 `Inferior nasal concha (right)`  
L122 `Inferior nasal concha (left)`  
L123 `Mandible`

**`src/subjects/skulls/index.js`** → `src/i18n/es/skulls.js` (5)

L128 `Teeth (upper right)` · `Teeth (upper left)` · `Teeth (lower right)` · `Teeth (lower left)`  
L132 `Sutures`

**`src/subjects/skulls/jaguar.js`** → `src/i18n/es/skulls.js` (14)

L33 `Frontal bone`  
L34 `Parietal bone (right)`  
L35 `Parietal bone (left)`  
L36 `Occipital bone`  
L37 `Temporal bone (right)`  
L38 `Temporal bone (left)`  
L39 `Zygomatic (jugal) bone (right)`  
L40 `Zygomatic (jugal) bone (left)`  
L41 `Maxilla (right)`  
L42 `Maxilla (left)`  
L43 `Premaxillae (incisive bones)`  
L44 `Nasal bones`  
L45 `Sphenoid and palatine region`  
L46 `Mandible`

**`src/subjects/skulls/lessons.js`** → `src/i18n/es/skulls.js` (84)

L33 `Human skull — frontal view, built from a ball`  
L38 `Construction` · `Ball, centre line, brow/eye/nose lines, jaw taper`  
L39 `Planes` · `The skull blocked in as flat planes`  
L40 `Engraving` · `The finished skull, engraved in ink`  
L41 `Bones` · `Colour each bone (atlas palette)`  
L42 `Sutures` · `Wavy joints between the cranial bones`  
L45 `A ball for the cranium, a line down the middle.`  
L46 `Brow, eye, nose and mouth lines cross the centre line.`  
L47 `The jaw tapers from the cheekbones to the chin.`  
L48 `Block in the planes; cut the sockets and the pear-shaped nose.`  
L49 `Refine and engrave: the hatching follows the form.`  
L50 `Erase, and start again from the ball.`  
L55 `Human skull — three-quarter view, open jaw`  
L58 `Construction` · `The hinge axis and the arc the chin travels`  
L59 `Bones` · `Colour each bone (atlas palette)`  
L60 `Muscles` · `Temporalis and masseter, the closing muscles`  
L61 `Teeth` · `32 adult teeth`  
L64 `Closed: each condyle rests in its mandibular fossa.`  
L65 `Opening: the condyles mostly rotate, already starting to glide…`  
L66 `…and the glide grows with the gape, forward and down the eminences.`  
L67 `Wide open: about 27° at the joint, the incisors about 5 cm apart.`  
L68 `Masseter and temporalis pull the jaw shut.`  
L73 `Human skull — turning to profile`  
L76 `Construction` · `The ball of the cranium in three rings`  
L77 `Proportion grid` · `Square, thirds and the ear line in profile`  
L78 `Bones` · `Colour each bone (atlas palette)`  
L79 `Sutures` · `Coronal, sagittal, lambdoid and squamous sutures`  
L82 `Front: the cranium is a ball, the face hangs below it.`  
L83 `Turning, the face reads as a wedge on the front of the ball.`  
L84 `Profile: the whole skull fits a square.`  
L85 `Orbit floor, zygomatic arch and ear hole share one level.`  
L86 `Back to the front view.`  
L91 `Human skull — the twenty-two bones`  
L94 `Bones` · `Colour each bone (atlas palette)`  
L95 `Sutures` · `Wavy joints between the cranial bones`  
L96 `Teeth` · `32 adult teeth`  
L99 `Twenty-two bones: eight cranial, fourteen facial.`  
L100 `The sutures part: frontal, parietals, temporals, occipital.`  
L101 `The face separates: maxillae, zygomatics, nasal bones.`  
L102 `The mandible is the only movable bone.`  
L103 `Everything locks back together along the sutures.`  
L108 `Jaguar skull — Panthera onca`  
L111 `Construction` · `Braincase oval, muzzle box and arch flare`  
L112 `Bones` · `Colour each bone (atlas palette)`  
L113 `Teeth` · `Canines and carnassials (30 teeth)`  
L116 `Short face, flaring arches: a skull built for a crushing bite.`  
L117 `Opening: the jaw joint is a transverse hinge, with almost no sideways play.`  
L118 `At full gape the dagger canines clear each other.`  
L119 `The bite: temporalis, anchored on the sagittal crest, pulls the coronoid.`  
L120 `Carnassials (P4 over m1) shear past each other like scissors.`  
L125 `Skull and eyelash palm-pitviper`  
L128 `Construction` · `The path the snake follows`  
L129 `Skull` · `The engraved skull`  
L130 `Snake` · `Bothriechis nigroadspersus, golden “oropel” morph`  
L133 `Memento mori: an eyelash palm-pitviper threads the skull.`  
L134 `Out of the left orbit and over the brow…`  
L135 `…across the vault and down behind the ear…`  
L136 `…under the cheekbone and back into the socket.`  
L260 `Temporalis` · `Fans from the temple under the arch to the coronoid process.`  
L261 `Masseter` · `From the zygomatic arch to the angle: the strongest closer.`

**`src/subjects/skulls/snake.js`** → `src/i18n/es/skulls.js` (4)

L92 `Snake`  
L144 `Head` · `Eyelash palm-pitviper (Bothriechis nigroadspersus).`  
L145 `Bothriechis nigroadspersus`

**`src/subjects/skulls/species.js`** → `src/i18n/es/skulls.js` (48)

L67 `Frontal bone` · `The forehead and the roofs of both orbits.`  
L68 `Parietal bone` · `Paired plates that make the roof and sides of the vault.`  
L69 `Temporal bone` · `Houses the ear and carries the jaw joint.`  
L70 `Occipital bone` · `Back and base of the skull, around the foramen magnum.`  
L71 `Sphenoid` · `A butterfly-shaped keystone bone; its greater wing shows at the temple.`  
L72 `Zygomatic bone` · `The cheekbone: lateral rim and part of the floor of the orbit.`  
L73 `Maxilla` · `The upper jaw: holds the upper teeth and frames the nasal aperture.`  
L74 `Nasal bones` · `Two small bones that form the bridge of the nose.`  
L75 `Mandible` · `The lower jaw — the only movable bone of the skull.`  
L76 `Orbit` · `Eye socket, about 4 cm wide and 3.4 cm high; seven bones meet in its walls.`  
L77 `Piriform aperture` · `The pear-shaped opening of the nasal cavity.`  
L80 `Zygomatic arch` · `A bony bridge from cheek to temple; the masseter hangs from it.`  
L81 `Mastoid process` · `Behind the ear; anchors the sternocleidomastoid muscle.`  
L82 `Condyle` · `Head of the mandible: hinges and glides in the jaw joint.`  
L83 `Coronoid process` · `Thin blade of the mandible where the temporalis attaches.`  
L86 `Teeth` · `Adults have 32: per quadrant 2 incisors, 1 canine, 2 premolars, 3 molars.`  
L87 `Coronal suture` · `Joins the frontal bone to both parietals across the crown.`  
L88 `Sagittal suture` · `Joins the two parietals along the midline.`  
L123 `Sagittal crest` · `A blade of bone along the midline; the temporalis muscles anchor here.`  
L124 `Zygomatic arch` · `Flares wide to make room for huge jaw muscles.`  
L125 `Canine` · `Dagger teeth, used to bite through skulls and turtle shells.`  
L126 `Carnassial (P4/m1)` · `Blade-like shearing teeth that slice meat like scissors.`  
L127 `Orbit` · `Large, forward-facing sockets for binocular depth vision.`  
L128 `Mandible` · `A short, deep jaw whose hinge allows almost no sideways motion.`

**`src/subjects/skulls/steps.js`** → `src/i18n/es/skulls.js` (18)

L17 `Ball and centre line` · `Guides and jaw taper` · `Sockets, nose, contour`  
L18 `Ball and hinge point` · `Swing the jaw open` · `Refine the open skull`  
L19 `Egg and ear line` · `Face wedge in a square` · `Refine the profile`  
L20 `Outline and sutures` · `Map the bones` · `Pull the bones apart`  
L21 `Braincase and muzzle box` · `Arch, crest and jaw` · `Canines and carnassials`  
L22 `Ball, axis and sockets` · `Thread the snake` · `Refine skull and snake`

**`src/subjects/snakes/head.js`** → `src/i18n/es/snakes.js` (15)

L626 `Head`  
L627 `Lower jaw`  
L628 `Eyes`  
L629 `Nostrils`  
L630 `Forked tongue`  
L632 `Supraocular scales`  
L633 `Loreal pits`  
L634 `Hinged fangs` · `Fixed fangs`  
L635 `Dentary teeth` · `Upper teeth`  
L636 `Eyelash scales`  
L637 `Venom glands`  
L638 `Skull`  
L639 `Mandibles`

**`src/subjects/snakes/index.js`** → `src/i18n/es/snakes.js` (89)

L33 `striking posture`  
L34 `coiled on a branch`  
L35 `lateral undulation`  
L36 `defensive rattle`  
L37 `ambush coil with clutch`  
L39 `constricting prey`  
L40 `travelling a path`  
L225 `Skin` · `Scales and colour pattern`  
L226 `Skeleton` · `X-ray: hundreds of vertebrae, paired ribs, the skull`  
L228 `Venom` · `Venom glands, ducts and fangs`  
L229 `Eyelash scales` · `Spiny supraciliary scales above the eyes`  
L230 `Rattle` · `Keratin segments — explode to separate them`  
L231 `Eggs` · `The clutch the female coils around`  
L232 `Water` · `The sea surface it swims in`  
L323 `Eye` · `Vertical pupil; no eyelids — a clear scale, the spectacle, covers the eye, so snakes never blink.` · `Round pupil; no eyelids — a clear scale, the spectacle, covers the eye, so snakes never blink.`  
L324 `Forked tongue` · `Flicks out through a notch in the lip and carries scent to the vomeronasal (Jacobson’s) organ.`  
L326 `Loreal pit` · `Heat-sensing pit organ between eye and nostril: it detects the infrared warmth of prey.`  
L327 `Hinged fangs` · `Long hollow fangs fold against the palate and swing forward as the mouth opens.`  
L328 `Venom gland` · `A modified salivary gland behind and below the eye; muscles squeeze venom down a duct to the fang.`  
L331 `Fixed front fangs` · `Short, permanently erect fangs at the front of the upper jaw.`  
L332 `Venom gland` · `Venom flows from a gland behind and below the eye to the fixed fangs.`  
L334 `Ventral scutes` · `A single row of wide belly plates grips the ground — roughly one per trunk vertebra.`  
L337 `Keeled scales` · `Each dorsal scale carries a central ridge, giving the skin a rough, matte look.`  
L341 `Eyelash scales` · `Spiny supraciliary scales above each eye give the eyelash viper its name.`  
L342 `Prehensile tail` · `Wraps around twigs to anchor the snake while it waits or strikes.`  
L346 `Red ring` · `Broad red rings; each red scale is tipped with black.`  
L347 `Black ring` · `Black rings bordered on both sides by narrow yellow rings.`  
L348 `Yellow ring` · `Narrow pale rings. Colour rhymes do not identify coral snakes in Central America.`  
L349 `Head` · `Barely wider than the neck: black snout, yellow band across the back of the head.`  
L353 `Rattle` · `Loosely interlocking keratin segments; a new one is added at each shed.`  
L354 `Button` · `The oldest segment, at the tip — lost when the rattle breaks.`  
L355 `Cloaca (vent)` · `Marks where the body ends and the short tail begins.`  
L356 `Keeled scales` · `Strongly keeled, protruding scales give the back a rough, matte look.`  
L359 `Spiny tail tip` · `Rows of small spiny scales end in a terminal spine; the tail buzzes in leaf litter.`  
L360 `Eggs` · `Probably the only egg-laying pitvipers of the Americas; the female may stay coiled with her clutch.`  
L361 `Keeled scales` · `Strongly keeled, knobbly scales: a rough, pineapple-like skin.`  
L364 `Paddle tail` · `Flattened from side to side, the tail works like an oar.`  
L365 `Valved nostrils` · `Set on top of the snout and closed by valves when the snake dives.`  
L366 `Yellow belly` · `Bright yellow below, sharply divided from the black back.`  
L370 `Pelvic spur` · `Claw-like remnants of hind limbs beside the vent; larger in males, used in courtship.`  
L371 `Eye stripe` · `A dark stripe runs from the snout through the eye to the angle of the jaw.`  
L372 `Recurved teeth` · `Rows of backward-curving teeth and no fangs: boas kill by constriction, not venom.`  
L377 `Vertebrae` · `Hundreds of vertebrae, linked by extra interlocking joints, make a supple yet strong spine.`  
L378 `Ribs` · `A pair on every trunk vertebra, none on the tail — and no breastbone.`  
L397 `Body`  
L398 `Tail`  
L402 `Rattle button` · `Rattle segment {n}`  
L403 `Pelvic spurs`  
L404 `Spiny tail tip`  
L405 `Egg {n}`

**`src/subjects/snakes/patterns.js`** → `src/i18n/es/snakes.js` (61)

L403 `Mouth lining`  
L407 `Olive-brown ground` · `Dark triangles` · `Pale triangle borders` · `Cream belly`  
L408 `Brown crown` · `Dark eye stripe` · `Yellow lips`  
L409 `Yellow chin`  
L413 `Moss green` · `Golden yellow`  
L414 `Dark flecks` · `Pale flecks`  
L415 `Pale green belly` · `Pale yellow belly`  
L417 `Pale green chin` · `Pale yellow chin`  
L422 `Red ring` · `Black ring` · `Yellow ring`  
L423 `Black ring` · `Yellow ring`  
L424 `Black snout` · `Yellow head band`  
L425 `Yellow head band` · `Black chin`  
L429 `Brown ground` · `Dark diamonds and neck stripes` · `Diamond centres and hind body` · `Cream borders and belly`  
L431 `Brown crown` · `Dark eye stripe` · `Pale stripe borders and lips`  
L432 `Cream chin`  
L434 `Tan ground` · `Dark diamonds` · `Pale spots` · `Cream belly`  
L435 `Tan crown` · `Dark eye stripe` · `Cream lips`  
L436 `Cream chin`  
L438 `Black back` · `Yellow belly`  
L439 `Yellow paddle` · `Black spots`  
L440 `Black crown` · `Yellow lips`  
L441 `Yellow throat`  
L446 `Tan ground` · `Brown blotches`  
L447 `Red-brown tail saddles` · `Cream borders and belly`  
L448 `Dark saddles` · `Pale saddle centres and speckles`  
L450 `Tan crown` · `Dark head stripes`  
L451 `Cream chin`  
L609 `Dark bark fissures`  
L610 `Bark ridges`  
L611 `Lichen`

**`src/subjects/snakes/poses.js`** → `src/i18n/es/snakes.js` (46)

L213 `Coiled, neck drawn into an S, the {name} tastes the air.`  
L214 `Anticipation: the S tightens and the head draws back.`  
L218 `Strike — the S unfolds faster than a blink; the hinged fangs swing erect.`  
L219 `Strike — the S unfolds faster than a blink; the jaws gape wide.`  
L221 `The teeth grip, then let go.` · `Bite and release: venom is injected in an instant.`  
L222 `Recoil into the defensive coil.`  
L223 `Tongue flicks follow the scent trail.`  
L300 `Defensive coil: head raised, body ready to strike.`  
L304 `Tail-shaker muscles buzz the rattle dozens of times a second.`  
L305 `The tail tip quivers — many snakes vibrate their tails when threatened.`  
L307 `Tongue flicks gather the scent of the intruder.`  
L308 `A warning, not an attack — given space, it retreats.`  
L395 `Ambush coil around the clutch, head facing out.` · `Ambush coil, head facing out, ready to strike.`  
L396 `Slow breathing — the body barely moves.`  
L400 `Disturbed, the spiny tail tip vibrates against the leaf litter.`  
L401 `Disturbed, the tail tip vibrates against the leaf litter.`  
L403 `Bushmasters can wait at one ambush site for days.` · `Sit-and-wait hunters can stay put for hours or days.`  
L457 `Lateral undulation: every point of the body follows the path of the head.`  
L458 `Each bend pushes back against the ground.`  
L462 `Tail raised and curled — a decoy display that draws attacks away from the head.`  
L463 `The tail lifts and curls for a moment.`  
L468 `Coral snakes hunt other small snakes and lizards in the leaf litter.`  
L469 `Lateral undulation is the commonest way snakes move.`  
L546 `A pelagic snake: it lives its whole life at sea.`  
L547 `Waves travel down the body; the paddle tail pushes the water.`  
L548 `Valved nostrils close underwater; some oxygen is absorbed through the skin.`  
L549 `Its bold yellow and black are thought to warn predators.`  
L552 `Swimming: the same lateral undulation snakes use on land.`  
L553 `Waves travel from head to tail and push against the water.`  
L554 `The head stays near the surface to breathe.`  
L625 `Coils wrapped around the prey; the head holds its grip.`  
L626 `The coils tighten, cutting off blood flow — not suffocation.`  
L627 `Boas feel the prey’s heartbeat and keep squeezing until it stops.`  
L628 `The coils relax and re-grip. No venom is involved.`  
L631 `Coils wrapped around the prey.`  
L632 `The coils tighten.`  
L633 `The coils relax and re-grip.`  
L732 `Anchored by its tail, the {name} waits in ambush.`  
L733 `The head sways slowly, tracking movement.`  
L734 `Tongue flicks sample the air for scent.`  
L738 `Golden, green or mottled: the eyelash viper is famously variable in colour.`  
L739 `The tail grip frees the front of the body to strike.`  
L793 `Lateral undulation along the path.`

**`src/subjects/snakes/props.js`** → `src/i18n/es/snakes.js` (6)

L376 `Branch`  
L377 `Twig`  
L378 `Leaves`  
L487 `Prey (stylised rodent)` · `Fur` · `Pale snout, ears and tail`

**`src/subjects/snakes/skeleton.js`** → `src/i18n/es/snakes.js` (4)

L202 `Vertebrae`  
L203 `Ribs (right)`  
L204 `Ribs (left)`  
L205 `Vestigial pelvis`

## Appendix B — how the measurements were taken

All with `node scripts/shot.mjs` against the dev server, `--eval` importing the probes from
`/.scratch/bilingual/i18n-shots/`:

- baseline scales: `typeset.html?book=<id>&page=all&width=512`, reading `typeset.ready.results`;
- per-page cost: `renderPage` timed for every side at 2048 and 1536 px in `typeset.html`;
- flip cost: the reader at `#/serpientes?plate=3` (1440 × 900, DPR 2, WebGPU) timing `buildSides`,
  two `renderPage` + `initTexture`, `ui.setBook`;
- fit stress: `inflate.js` (each text extended by its own first words, 10–25 %);
- making pages and author placements: `probe.js` (layouts rebuilt from the real modules) at 26, 27,
  28 px;
- contents with one more row: `renderPage` of the contents spec with an extra entry (scale 1, all books);
- label widths: `CanvasRenderingContext2D.measureText` with the UI font stack at 12 and 12.5 px;
- glyph coverage: WOFF2 tables decompressed with Node's Brotli, `cmap` formats 4/12 read;
- hyphenation: `hyphen-es.proto.mjs`, a prototype of §5.1, run on the vectors of §5.3.

---

## Review (adversarial)

*Reviewer: critique:i18n-design, 2026-11-01 ~21:30, against the working tree of that time (the core stub
`src/i18n/{index,edition}.js` + empty `src/i18n/es/*.js` had already landed at 21:16). Everything below was
checked in code or measured; nothing in `src/`, `scripts/` or `public/` was touched. Evidence scripts and PNGs:
`/private/tmp/claude-501/-Users-josoroma--claude-spares-spare-dT3EdI/a4e0399d-cbbe-47ab-aeb0-b0604dd935a3/scratchpad/rev/`
(`time-typeset.js`, `time-upload.js`, `scales.js`, `swap.js`, `serp-p7.png`, `cal-p9.png`, `cal-swap.png`).*

**Verdict: sound architecture (presentation-boundary `t()`, page-pure `tl(locale)`, composed editions, making
leaf), but not implementable as written.** Thirteen blocking corrections (R1), eleven edge-case behaviours to
specify (R2), and a scheduling conflict with the repair workflow that is still editing four of the nine areas.

### R1. Blocking corrections

| # | finding (evidence) | exact correction |
|---|---|---|
| 1 | **Biggest missing string family.** Every look-closer row prints its name from the *label id*: `blocks.js:149` `it.name ?? humanize(it.label)`; no manifest sets `name` (grep: 0). 60 rows / 52 names ("LOREAL PIT", "FANGS", "KEELED SCALES", "NASAL APERTURE", "CORONOID"…) on every plate-text and lesson-text page stay English in Spanish (seen in `serp-p7.png`, `cal-p9.png`, and in the reader in `switch-cost.png`). Not in §9, not in Appendix A, not in the schema. | Add `plates[].lookCloser[].name` to §2.2 as **TEXT, optional in English** (default `humanize(label)`), **required in Spanish**; `lookCloserBlock` prints `tl(locale, it.name ?? humanize(it.label))`. Also fixes today's English mismatch between printed names and figure pills ("Nasal aperture" vs pill "Piriform aperture", "Yellow venter" vs "Yellow belly", "Tail spine" vs "Spiny tail tip"). Add to E.1, H.3, translator brief, validator (name ≤ 3 words). |
| 2 | **Calaveras cannot take Spanish at realistic expansion; "copy-fit to ≤ English" is not a plan.** Re-ran the design's own `inflate.js` (1024 px, drawStep on): +10 % → lesson II 0.875 (I, III, IV, V exactly at 0.9); +20 % → 5/6 versos < 0.9 (V 0.85), sources 0.9; **+30 % → 6/6 < 0.9 and lesson II overflows (clipped text)**. Prose is 1 894–2 099 chars per lesson verso vs 68–109 chars of citations, so nearly everything grows. The IBM figures W3C publishes give **130 %** average expansion for strings over 70 characters ([W3C, *Text size in translation*](https://www.w3.org/International/articles/article-text-size)); the +11 % prompt draft is a technical text with URLs, a low bound. | Make room **before** translation, for both editions (E-owned, P0): target every English lesson verso at ≥ 0.975 (e.g. narrower vertical band `P.px(178)` → ~150, tighter notes-grid gaps, or move *Did you know?* to the recto under the caption). Acceptance: `inflate.js` at 1.25 keeps all lesson versos ≥ 0.9 with no overflow. Keep "copy-fit" only as a fallback. |
| 3 | **Serpientes sources page: H.4 is confirmed necessary — for a different reason.** Citations (2 883 chars, SAME) barely change; only the colophon (567 chars, TEXT) grows, and growing **only the colophon by 10 % drops the page from 0.90 to 0.85** (measured). | Keep H.4; trim the colophon in both editions to ≤ 3 lines (drop the lines that repeat the imprint and the theme fonts), then re-measure. |
| 4 | **`author` string → object breaks a frozen contract and the running app.** CONTRACTS §6 defines `author` as the imprint string; the header says "add — never break". Today `boards.js:95/115`, `front.js:68/88`, `a11y.js:84`, `sides.js:42`, `typeset/sample.js` and `.claude/skills/lamina/templates/book.js:9` all print it as text. If H.3 lands before E.2/C.7 (§10 says everyone starts at once) covers, title pages and the a11y mirror print `[object Object]`. | Additive: keep `author` = imprint string; add **`byline: { name: 'Josoroma', mark: 'josoroma' }`** (ID kind). No normalisation, no ordering hazard; translators need not touch it. Rename `publisher` usages back to `author` in §2.2, §6, §7, §12. |
| 5 | **Work breakdown collides with the repair workflow.** B, C, D, F own files being edited right now (mtimes: `Reader.js` 20:50, `ui/popover.js` 20:42, `ui/index.js` 20:35, `ui/labels.js` 20:32, `FigureHost.js` 20:07, `export/raster.js` 20:01, `export/index.js` 19:54); G depends on strings the repair changes (prey, heads, boa). | Phase it: **now** A, E (typeset is not under repair), H, I, G drafts from the audit; **after the repair reports done** B, C, D, F, then G final from `audit --i18n`. State it in §10. |
| 6 | **`src/books/making.js` breaks two scripts.** `validate-books.mjs:107` and `audit.mjs:26` treat every `src/books/*.js` except `index.js` as a book (and `typeset/preview.js` globs it as `?book=making`). | Put it at `src/books/making/index.js` + `src/books/making/es.js` (or under `src/i18n/`), or exclude it in both scripts in the same change (I). |
| 7 | **Getters do not survive `setApi`.** `boot.js:52` `Object.assign(window.lamina, api, …)` copies values, so `api.manifest`, `api.sides`, `api.lang` (§1.4) are frozen at activation and stale after a switch; the library view has no `setLang`/`lang` at all, yet §1.2 lists `lamina.setLang()` as a trigger. | B: copy descriptors (`Object.defineProperties(window.lamina, Object.getOwnPropertyDescriptors(api))`) and make `lang`/`setLang` session-wide keys kept by `setApi` (add to its keep list `['ready','version','backend','renderer','stage']`). |
| 8 | **`dropCap` also loses accented initials, not only `¿ ¡ «`.** `front.js:289` `/^(\W*)(\p{L})…/u`: `\W` is ASCII-only even with `u`, so "Árboles…" → lead "Á" dropped, cap "R"; "Él…" → "L"; "Ñandú…" → "A"; "«Mira» dijo" → no drop cap (regex fails). Verified in Node. | `^([^\p{L}\p{N}]*)(\p{L})([\p{L}’']*)([^\s]*)(\s[\s\S]*)?$` — draw group 1 hung before the initial, keep group 4 (closing punctuation) after the small caps. Same `\p{L}` fix for `smallCapsLead` (`blocks.js:97`: `[A-Za-zÀ-ÿ’']` excludes `¿¡«`). |
| 9 | **§2.4's binomial rule copies an English bug instead of fixing it.** `lesson.js:62` `/^[A-Z][a-z]+ [a-z]+$/` already italicises "Temporomandibular joint" and "Cranial proportions" in English (seen in `cal-p9.png`), and the same pattern as the SCI rule (§2.2) lets those two pass **untranslated** in Spanish. | Taxon test = `en(plate).authority` is non-empty (Calaveras I–IV have `''`, V–VI have authorities; every snake and flower has one). Use it for italics (both editions) and for "identical allowed". Intended English change: two lesson subtitles become roman. |
| 10 | **TAXON suffixes reject every Flores family.** All six are "Familyaceae · *Order*ales" (e.g. "Orchidaceae · Asparagales", "Nymphaeaceae · Nymphaeales"); `-ales` is missing, so identical Spanish values fail. "Viperidae, Crotalinae" (Calaveras VI) also needs comma-separated parts. | Suffixes: `-idae -inae -oidea -ini -aceae -oideae -eae -ales -formes`; split parts on `·` and `,`. |
| 11 | **The inventory violates §3.3 rule 3.** `{n} s`, `{kind} {number} of {total}: {title}.`, `{name}. {index} of {total}.` and `“{text}”` have no literal word of ≥ 3 letters → validator errors on day one; compiled as match patterns they would also match unrelated runtime strings. The rule conflates two uses. | Two kinds of entries: **explicit keys** (looked up exactly, may contain placeholders, never compiled) and **match patterns** for strings built at run time (`Rattle segment 3`), declared separately (e.g. `export const PATTERNS = {…}` per domain) and subject to the ≥ 3-letter rule. |
| 12 | **The static extractor misses ≈ 65 table-driven keys.** `i18n-strings.mjs` lists literal first arguments of `t()`, but SPREAD_NAMES (11), EXPORT_MODES (9), SHORTCUTS labels/spoken/display (~33), SHORTCUT_GROUPS (3) and IUCN labels (9) are data later passed as `t(variable)`. `--missing` would report a clean slate that is not. | Marker convention: wrap table literals in an identity `msg('Cover')` (exported by `src/i18n/index.js`) that the extractor also collects; keep `t(variable)` at output. |
| 13 | **Validator floors misfire.** (a) `page.js:181–182` steps `fs - 0.025` in floats: today's English Calaveras I, II, V report `0.8999999999999999`, so `scale < 0.9` fails them (the design's own `inflate.js` output shows it). (b) The making floor 25/26 = 0.962 is unreachable: auto-fit steps 1, 0.975, 0.95 … in 0.025 steps down to `MIN_SCALE` 0.85 (`page.js:17`), so the effective floor is 0.975 and the Spanish prompt has ≈ +5 % height of headroom, not "≈ 10 %". (c) `src/i18n/index.js` must stay Node-safe for the validator: `import.meta.env.DEV` (§1.4 step 2) throws in Node. | (a) compare `Math.round(scale * 1000)`; (b) give `runLayout` a per-layout `minScale` with 0.0125 steps, or accept one step and say so; (c) `import.meta.env?.DEV`. |

### R2. Switching edge cases to specify (missing or wrong today)

1. **Mid-turn.** §1.5 re-prints only `2·opened−1, 2·opened`; the `hold` spread and the faces of leaves in flight are also on screen, and `frame()` skips non-flying queued sides while `book.busy` (`Reader.js` frame loop) → the page under a turning leaf stays in the old language for the whole turn (longer for riffles). Rule: if `book.busy`, apply chrome now and the page part at the next `turnend` (bounded wait), or re-print the whole keep set.
2. **Bands after a switch.** `reserveChrome()` keys on `${innerHeight}|${innerWidth}|hasFigure` (`Reader.js:377`) and the UI caches `reservePx` (`ui/index.js:324`) → a taller Spanish caption or top pill is never re-measured. `ui.setLang` must call `measure()`; `applyLang` must call `reserveChrome(true)`. Library: `reserveBands()` (`Library.js:105`) runs only on orientation/resize → call it after the DOM rewrite (header, hint and captions rewrap).
3. **Export in progress.** `doExport` awaits `settle()` and an async read-back (`Reader.js:1145`); a switch in between mixes languages (title/caption from one edition, key from `t()` of the other) and file names. Snapshot `{ lang, edition, plate }` at the command and resolve every string with `tl(lang, …)` before the first `await`. UI: `setExportBusy` owns `bExport.dataset.tip` (`ui/index.js:729`); `localize()` must derive it from `exportMode`, not reset it to "Export".
4. **Read sheet / drawer open.** `sheet.setContent` sets `scrollTop = 0` and replaces the nodes (`sheet.js:101`); `drawer.setBook` replaces the list → the reader loses their place and focus falls to `<body>` inside an `aria-modal` dialog. Preserve the scroll ratio and refocus the same link/item (by href/spread) or the dialog. (Users cannot reach the switch while these are open — it happens via `hashchange`/automation — but it must not break.)
5. **Arrow keys on the radio group turn pages.** The reader's window `keydown` (`Reader.js:1206`) turns pages on ←/→; its `inControl` list (`:1172`) does not include the top bar. The switch handler must `preventDefault()` for arrows, Home/End and Space (onKey bails on `defaultPrevented`); add `[role=radiogroup]` to `inControl`.
6. **Back button after a switch.** `#/en/` → open book → switch to Español (replaceState) → Back lands on the earlier `#/en/` entry, which §B.5 says "shows English" → the explicit choice is undone. Rule: after an explicit switch in this session, a history traversal to an entry in another language is rewritten (`replaceState`) to the current language; first loads and links from outside still honour the URL.
7. **Switch while a route builds.** boot sets `view = null` before building (`boot.js:176`) and the reader's UI exists before activation → `changeLang` has no view. Rule: rewrite the hash language and let the building view read `getLang()` at `activate()`, or disable the switch until `activate()`.
8. **Before the first route.** `createRenderer` runs at module top (`boot.js:93`) before any `loadLang` → the "needs WebGPU" card is English for Spanish users; and a failed `import('./es/index.js')` (offline, stale chunk after a deploy) leaves boot with no route. Start `preferredLang()` + `loadLang` in parallel with `createRenderer`; on failure fall back to English and mark the switch unavailable.
9. **Deep links.** `parseRoute` merges real `location.search` into params (`route.js:8`), so `index.html?lang=es#/serpientes` is silently ignored — accept it as an alias (then rewrite) or document it. Lang-less links resolve through `preferredLang()`; scripts and docs must use explicit `#/en/…` so a stored `es` never flips a capture.
10. **Reduced motion / phone portrait:** nothing breaks (no turn animates; `portraitSide` untouched). Add: no transition on the switch underline under `prefers-reduced-motion`.
11. **Library CSS.** `app.css:77` `.library header span { display:block; text-transform:uppercase; letter-spacing:.22em; font-size:11px; margin-top:3px }` restyles every span of a switch placed inside `<header>` (specificity 0,1,2 beats `.lam-lang-long` 0,1,0). Place the switch outside `<header>` or use ≥ 2-class selectors in `langswitch.css` (a B/D dependency the plan does not list).

### R3. Performance — measured, then extrapolated

Headless Chrome, Apple M3 Pro, every side through `typeset.html`'s `renderPage` (Calaveras with `drawStep`):

| book | all sides @2048 cold | warm | dearest side cold | @1024 (after the 2048 runs) |
|---|---|---|---|---|
| Serpientes (26) | 87 ms | 45 ms | cover 13.4, back cover 13.4, sources 11.4 | 52 ms |
| Calaveras (24) | 114 ms | 57 ms | lesson-text 17.6 / 15.3 | 86 ms |
| Flores (24) | 87 ms | 45 ms | cover 15.1, back cover 12.2 | 48 ms |

`buildSides` 0.0–0.2 ms; `renderer.initTexture` of a 2048 × 2826 page 0.2–2 ms (WebGPU and WebGL 2); `ui.setReading` 2–3 ms. The totals confirm §1.5, but its "a few milliseconds" for the synchronous part is the **warm** figure. The first switch is cold for every Spanish word (the width cache keys on font + text), so the visible spread costs **≈ 19 ms on a lesson spread, ≈ 14–16 ms on the cover spread, ≈ 10 ms on a plate spread** here; with uploads, DOM and `ui.setLang`, applyLang ≈ 25–30 ms worst case. That is under 50 ms only on this class of machine; a 3× slower laptop or a phone (1024 px pages, lesson spread ≈ 14 ms here) lands at 45–90 ms. After that, ≤ 6 kept sides re-print one per frame at up to 18 ms each (a single page already exceeds the 6 ms budget) → 4–6 janky frames while the loop animates. Corrections:
- **Pre-typeset the visible sides in `prepareLang`** (pages are pure functions of their spec through `tl(locale)`), so `applyLang` only wraps and uploads; re-print a side the user turned to in the meantime.
- Re-print the rest in idle time (`requestIdleCallback`, ≤ 1 side per callback), not in the render loop.
- Simplify `PageCache`: on a switch **drop** non-visible cached textures instead of keeping them stale (no `isStale` threading through `ensureSide`, `applySide`, `onEvict`, `turnstart`); `prefetch()` re-prints them on demand.
- Acceptance C.8 should add a 4× CPU-throttled run (DevTools `Emulation.setCPUThrottlingRate`) and a 390 × 844 run.

### R4. Fonts — verified, two gaps

fontTools on the `.woff` twins of every face in use (EB Garamond 400/400i/500/600, Cormorant 500/600/500i/600i, Plex Sans Condensed 400/500/600, Plex Mono 400/500, Oswald 500/600): every **latin** subset maps `ñ Ñ ¿ ¡ « » á é í ó ú ü Á É Í Ó Ú Ü ª º`, U+00A0, `— – … “ ” ‘ ’ · ×`; latin-ext lacks `¿` and most of these (as the design says). Gaps the design missed:
- **U+202F (narrow no-break space) is in no face**, although `LATIN_SUBSET` (`fonts.js:75`) and the @font-face `unicode-range` claim U+2000–206F. Formatters must emit U+00A0 only (Node ICU 79: `es-CR` grouping and `es` percent both give U+00A0 — keep a test).
- **U+2192 "→" is in no subset of any bundled family**, and the Calaveras brief, printed verbatim, contains two ("big shapes → guides → planes → details", `02-build-workflow.js:201`). It will fall back to Georgia/Times. Decide: accept the fallback (verbatim) or draw it; and the verbatim check must not normalise it. (The quoted original prompt is pure ASCII.)

### R5. Hyphenation — mostly right; one wrong minimum

Checked against the cited sources: vowels never split, diphthong or hiatus (Terrones Juárez 2013; Bezos rule 9), never before an *h* nor the letter before it (Terrones: *adhe-sivo, inhi-birse, al-cohol*; Bezos rule 6), *y* (Bezos rule 8 — the design's "word-final y" remark is accurate), *rr* indivisible (Bezos 13), compounds repeat the hyphen and *super-/rápido* (Briceño 2018). The prototype reproduces §5.3. Corrections:
- **`RIGHT_MIN = 3` is not in the sources.** Bezos rule 5 forbids separating *one* letter; Terrones forbids only a lone initial vowel. Three letters after the break removes the commonest Spanish breaks (*-te -do -da -ra -lo -to -na*) exactly where pages are tightest (R1.2). Use 2/2 and block a trailing *-no* fragment (Bezos's §2.11 recommendation, "el Gobier- | no aprobó", pp. 3 and 12–13). Fix §5.3 vectors accordingly (*ser-pien-te*, *ter-cio-pe-lo*).
- The foreign-word heuristic (`k`, `w`) blocks adapted Spanish words (*kilómetro*); limit it to `w th ph ck gh ff ss tt pp zz`.
- Bezos rule 11 (*pt ct cn ps mn gn ft pn cz tz ts* after a consonant) is not implemented — rare; note it.

### R6. Inventory gaps beyond R1.1

| where | string | fix |
|---|---|---|
| `index.html:7` | `<meta name="description">` (English, static) | boot updates it with `t()` |
| `export/idpass.js:695` | `prettyName(mesh.name)` for meshes not in `parts` (e.g. "Water surface", "Planes") → SVG `<title>` | Appendix A dropped mesh names; list the generated names or fall back to the owning part's name |
| `export/index.js:227` | `userMessage` is never shown (Reader toasts "Export failed — see the console", `Reader.js:497`) | show `t(err.userMessage)` or drop the key |
| `ui/drawer.js:47` | nav `aria-label` "Plates" also on the lesson book | kind-dependent "Plates"/"Lessons" |
| `app/a11y.js` | mirror omits figure caption, scale note (`plateHTML`), the imprint's two fixed paragraphs, the how-to "Reading a plate" notes | add them through `t()`; same strings as typeset |
| `app/a11y.js:101` | glossary mirror unsorted while §4.2 sorts at render time → Read sheet order ≠ page order | sort in `buildSides` (spec level) so both share it |
| `ui/sanitize.js:9–14` | `CODE` not allowed → §7.4's `<code>` is unwrapped | use `<span class="mono">` or allowlist `CODE` |
| `front.js:259` | pull quote strips only `“”"` → a translator's `«…»` becomes `««…»»` | strip `«»“”"` before `quote()` |
| a11y, WCAG 3.1.2 | Spanish `common` in the English edition, English `commonAlt` in the Spanish one, binomials | `lang="es"` / `lang="en"` / `lang="la"` spans in `plateHTML` |
| covers, library | the mark has no text alternative (`sideHTML` returns `''` for boards; library links carry title + subtitle only) | add "by Josoroma"/"por Josoroma" to the cover mirror and the library link names |
| §4.3 | UICN Fig. 2 (p. 14, opened) prints **"Extinto en Estado Silvestre (EW)"** | use the source's capitals for EW (others match) |
| §4.1 | decimal comma cited only to CLDR; the 2010 *Ortografía* recommends the point and accepts the comma by region (SEA Terminology Commission, *Astronomía* 195, Sep 2015, p. 20) | keep the comma as a deliberate Costa Rica/CLDR choice and say so |
| §6.2 | "boards are W × 1.4514 W" — `BOARD_ASPECT` is (1.38 + 0.056)/1.028 = **1.3969** (`page.js:15`); the medallion ring ends ≈ 0.763 H, not 0.754 H | recompute from `BOARD_ASPECT` (mark top ≈ 0.798 H still clears it) |

### R7. Tooling and skill gaps

- **`bootstrap.mjs` breaks**: it copies `src/engine src/kits src/app src/lab` (`:41`) but not `src/i18n`, and writes a `src/books/index.js` without `es`/`MAKING` → every bootstrapped project fails to import `src/i18n/index.js`. Add both to §13.
- **`new-subject.mjs`** must create `src/i18n/es/<subject>.js` and register it in `src/i18n/es/index.js` (`DOMAINS` is a fixed list of eight); §12.2's path→domain map needs the same rule.
- **`references/figures.md`** (strings stay English; dictionary per subject; pill text ≤ 110 px) and CONTRACTS **§8, §9, §11** (UI `setLang`/`'lang'`, export `lang`/`exportFileName`, automation and `#/<lang>/` URL), not only the §15 log.
- `rolldown/parseAst` exists (Vite 8.3.5) but is transitive: pin it in `devDependencies` or vendor a parser.
- `--fit` at width 512 is fine: all 74 sides of the three books give identical scales at 512/1024/1536/2048 (measured).
- Pill widths are measured with macOS SF; `--lam-sans` has no Segoe UI, so Windows uses Arial and Android Roboto → keep a margin: ≤ 110 px on macOS, not 120.
- Capture `--lang both` doubles the run; make `en` the default and `both` explicit in the docs' capture command.

### R8. Verified as correct

The landed stub matches the §1.4 signatures; `replaceState` not firing `hashchange`; CLDR/ICU outputs (`2,4`, `1234,5`, `12 345,67`, `85 %` with U+00A0, list *e* before *IBM*, `es` collation); the three English glossaries already in `en` collation order; the author SVG (8 paths, ink box x 20.5–976, y 25.5–172.5, 6.5 : 1); prompt (41 quoted lines) and brief word counts (175/135/312); no `fillText` in subjects; capture's `spreads − 3/− 2` break; `End`/`VERSO_FIRST`/`landingSide` behaviour with the making leaf; Spanish titles swapped into the Calaveras contents and lesson pages fit horizontally (`cal-swap.png`), accented capitals render in Oswald; back-cover blurbs ≤ 139 chars leave room for the moved title and mark.

### R9. Decisions for the user (not defects)

1. Spanish edition's prompt page: print the **verbatim English prompt** (it is "the prompt used"; `lang="en"` in the mirror) with a Spanish lead, and the translation in the Read sheet, or the translation as designed?
2. Should the making pages also cite the later prompts that reshaped the books (e.g. today's snake-face, béquer and bilingual requests), even as one line pointing to `docs/prompts/`?
