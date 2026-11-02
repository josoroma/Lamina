# Lámina — Engineering Contracts

> Living scientific plates. Interactive, page-turnable 3D books on a pure white
> canvas, built with Three.js `WebGPURenderer` + TSL (WGSL on WebGPU, GLSL on the
> WebGL 2 fallback). This document is the single source of truth every module is
> built against. If you need to change a contract, add — never break.

## 0. Quality bar

- Museum-quality scientific plates: elegant typography, rich natural colour, ink
  outlines and engraved hatching, scientifically accurate forms and facts.
- Minimal premium UI. No clutter. Pure white (#ffffff) background.
- Realistic book: cloth boards, page stacks, curved gutter, curling leaves,
  soft shadows, pop-up figures that fold flat as their page lifts.
- Every plate has a seamless **5-second** scientific animation (pure function of
  loop time `t ∈ [0,5)`, `pose(0) == pose(5)`).
- Interactions: turn pages (drag / click / swipe / arrow keys), rotate, zoom,
  explode (dissect), toggle layers, toggle labels, export SVG.
- Responsive (phone → 4K), 60 fps on a laptop, WebGL 2 fallback works, reduced
  motion respected, keyboard accessible.
- Original content only (text, art, construction steps). No copying from books.

## 1. Run & verify

- Dev server (already running): `http://127.0.0.1:5173/` (`npx vite`). Do not start
  another on 5173. If it is down, start one with `npx vite --port 5173 --host 127.0.0.1 &`.
- Reader URLs name their language: `index.html#/en/serpientes?plate=3`, `#/es/…` (§16).
- Headless screenshots (Chrome via playwright-core, WebGPU; add `--webgl` for fallback):
  `node scripts/shot.mjs "<path?query>" .scratch/<name>.png [--w 1440 --h 900 --wait 1500 --eval "<js>"]`
  then **Read the PNG** to review it visually. Console errors are printed.
- Figure workbench: `lab.html?type=<type>&params=<url-encoded JSON>&t=<sec>&play=0&explode=<0..1>&layers=id:1,id:0&labels=1&view=three-quarter|front|side|top|book&ui=0`
  `window.lab` exposes `setTime, setExplode, setLayer, setLabels, setView, setStyle, info()`.
  Example: `node scripts/shot.mjs "lab.html?type=snake&params=%7B%22species%22%3A%22bothrops-asper%22%7D&t=1.6&play=0&ui=0" .scratch/terciopelo.png`
- Syntax check a module quickly: `node --check file.js` (ESM) — but real validation
  is loading it in the browser (TSL errors only show at shader build time).
- Node-only tests, no server: `npm test` runs `npm run test:i18n` (`scripts/i18n-core-test.mjs`: lookups,
  formatters, schema, editions and making texts against a fixture) and `npm run test:hyphen-es`
  (`scripts/hyphen-es-test.mjs`: the Spanish hyphenation vectors, and the syllable rules over every word of the
  Spanish editions). The book checks (`validate-books`, `audit`, `capture`) are in §16 and the skill's verify.md.
- Several agents on one machine: never restart the shared servers; verify on a private build
  (`npx vite build --outDir .scratch/<me>/dist`, `npx vite preview --outDir .scratch/<me>/dist --port <mine>`)
  and point the scripts at it with `LAMINA_URL=http://127.0.0.1:<mine>`.
- Never run `npm install` unless your brief says you own `package.json`.
- Never edit files outside your ownership list. Read anything.

## 2. Layout & ownership

```
index.html, src/main.js, src/app/*          integration (lead) — App wiring, routing, window.lamina
src/engine/renderer.js, stage.js            book-engine agent
src/engine/book/*, src/engine/input.js,
src/engine/audio.js, book-test.html         book-engine agent (harness: src/engine/book/harness.js)
src/engine/typeset/*, typeset.html          typeset agent (also owns package.json for @fontsource;
                                            buildSides(manifest) page-order logic lives here)
src/engine/ui/*, ui.html                    ui agent
src/engine/figures/FigureHost.js,
src/engine/export/*, src/kits/ink/*,
src/kits/patterns/*, src/lab/*, lab.html    figure-host agent (contract.js is FROZEN)
src/subjects/snakes/*, src/kits/tube/*      snakes agent
src/subjects/flowers/*, src/kits/petal/*    flowers agent
src/subjects/skulls/*, src/kits/sdf/*       skulls agent
src/books/<id>.js, docs/books/<id>-*.md     content agents
src/books/es/<id>.js, docs/books/es-*.md    translators (Spanish editions, style guide)
src/books/index.js, src/books/making/*      books (registry with Spanish loaders, MAKING texts)
src/i18n/{index,edition,schema}.js,
src/i18n/es/index.js                        i18n core (runtime, editions, key set)
src/i18n/es/<domain>.js                     the owner of that domain's code (shell, app, ui,
                                            typeset, export, one per figure subject)
scripts/*.mjs, .claude/skills/lamina/**     tooling & docs
src/engine/util/math.js                     shared, append-only
```

## 3. Conventions

- Plain ES modules, no TypeScript, no frameworks. `import * as THREE from 'three/webgpu'`
  and TSL from `'three/tsl'` (three **0.186.1** — read `node_modules/three/src` when unsure;
  TSL exports listed via `grep -o "export {[^}]*}" node_modules/three/build/three.tsl.js`).
- Never use raw `wgslFn`/`glslFn` (breaks the other backend). TSL only.
- Never set `scene.background` (it gets tone-mapped grey). The canvas clears to
  transparent over CSS white.
- World units: page width = 1.0, page height = 1.38. Book lies in XZ, Y up, spine
  along Z at x = 0, recto pages at x ∈ [0, 1], verso at x ∈ [-1, 0], head at −Z.
- Figures are authored in **centimetres, real scale** (see §5); the host fits them.
- Matching code style: 2-space indent, single quotes, semicolons, short header
  comment per file explaining *why*, JSDoc on public functions.
- Dispose geometries/materials/textures you create. No per-frame allocations in hot loops.
- Respect `prefers-reduced-motion`.

## 4. Ink kit (src/kits/ink/index.js) — FROZEN SIGNATURES

`createFigureContext({ style, palette, quality })` → `ctx` with:
- `ctx.ink(opts)` → `MeshStandardNodeMaterial` with lithograph/engraving shading:
  `{ color | colorNode, roughness, metalness, hatch (0..1+), hatchCoord (TSL float node,
  lines at integers — use to make lines follow form), hatchAngle, transparent, side, name }`.
  `material.userData.xray` (uniform 0..1) fades it to a fresnel ghost; use `setXray(obj, a)`.
- `ctx.outline(mesh, { width, color })` → inverted-hull ink outline (child of mesh; shares
  geometry, works with InstancedMesh and CPU-animated geometry). Use on closed smooth meshes.
- `ctx.flat(opts)` → unlit `MeshBasicNodeMaterial` (guides, props, lines).
- `ctx.u` shared uniforms: `figureInv, hatchFreq, hatchStrength, outline, wobble, styleMix
  (0 lithograph … 1 engraving), time, paper, ink`.
- Patterns (src/kits/patterns) are TSL node factories returning colour nodes.

## 5. Figure contract (src/engine/figures/contract.js — FROZEN)

Each subject module `src/subjects/<type>/index.js` exports
`async function createFigure(params, ctx) → Figure`:

| field | meaning |
|---|---|
| `root` | Object3D; origin = footprint centre ON the paper; +Y page normal; +Z towards reader; +X towards fore-edge; **cm, real scale** |
| `title` | e.g. `'Bothrops asper — striking posture'` |
| `duration` | `5` |
| `layers` | `[{ id, label, visible, hint }]` — e.g. skin / skeleton / venom |
| `labels` | `[{ id, text, detail, anchor: Object3D (inside root, follows animation), layer? }]` |
| `parts` | `[{ id, name, object, color (sRGB hex for SVG fills), explode?: Vector3 (cm at explode=1), layer? }]` |
| `update(t, dt, state)` | pose at loop time `t` — pure function of `t`; `state = { explode, layers, labels, playing, reducedMotion, phase }` |
| `setLayer(id, visible)` | show/hide/x-ray layers |
| `setExplode(a)` | 0..1 dissection (host also moves parts that declare `explode` vectors — don't do both for one object) |
| `dispose()` | free GPU resources |
| `bounds?` | `{min:[x,y,z], max:[x,y,z]}` cm fit box (else computed at t=0) |
| `beats?` | `[{ t, text }]` narrated animation beats (shown as caption) |

Optional fields added since (additive: a figure without them works as before; contract.js stays frozen):

| field | meaning |
|---|---|
| `labels[].mark` · `.size` · `.alt` | `'dot'` (default) \| `'ring'` \| `'tick'`; `size` (cm) is the radius of the feature a ring goes round (the host projects it to `item.r`, CSS px); `alt` is the mirror-side anchor (the other eye, pit or nostril): the host and the exporter use whichever faces the camera (`host.labelAnchor(label)`) |
| `labels[].headSize` | cm, the length of the head a face label sits on (snakes); projected to `item.headPx`: on a head under 40 px every face mark is a tick |
| `labels[].region` · `regionOf(label)` | `{ object, box: Box3 in object's frame }`: the region a label belongs to (a snake's head), for the phone close-up (`host.regionSphere`); without either, a label whose anchor hangs in a group named `'head'` belongs to that head (its `'head-skin'` ∪ `'jaw-skin'`) |
| `parts[].swatches` | `[{ color, name, keepSmall? }] \| false`: the named colours the SVG snaps the part's pixels to (`false`: one flat fill); `keepSmall` keeps that colour's small islands (a catchlight) |
| `parts[].minPatternPx` · `.keepSmall` | the size (px at detail 1) under which the exporter leaves a part flat (snake eyes declare 40); `keepSmall: true` keeps every island of the part's colours |
| `keyTime` | the loop time whose pose the SVG exporter uses when the current pose shows nothing solid (construction stages) |
| `layerShown(id)` | `true` when the figure draws layer `id` now although it is switched off (a dissection revealing the skeleton): the host keeps listing that layer's labels |
| `loopBounds` | `{ min, max }` cm, root frame: the box the loop really draws when `bounds` is biased for placement or leaves out a passing explosion (skulls); the reader keeps label pills off it |

Optional module export for drawing books: `drawStep(g2d, params, step, box, theme)` draws
construction step `step` (0-based) as 2D line art inside `box {x,y,w,h}` (canvas px).

Host behaviour (FigureHost): stands the figure at page-local (s=0.5, z=−0.02) on its recto,
uniformly scales it into footprint 0.78 × 0.86 × height 0.6 page units, folds it along the
page normal as the leaf turns (pop-up), rotates it on a turntable (yaw), eases explode,
updates `ctx.u.figureInv` each frame, drives the shared 5 s clock.

## 6. Book manifest (src/books/<id>.js)

```js
export default {
  id: 'serpientes',                       // route: index.html#/<lang>/serpientes (never a two-letter code)
  title: 'Serpientes',
  subtitle: 'A Living Atlas of Costa Rican Snakes',
  kicker: 'Lámina · Volume I',            // small caps line above the title
  author: 'Lámina Natural History Press',  // fictional imprint (original) — the imprint line, a string
  byline: { name: 'Josoroma', mark: 'josoroma' },  // the author (added): name, and a wordmark id in
                                           //   AUTHOR_MARKS (typeset/marks.js, from public/author/<mark>.svg) or null
  edition: 'First edition, 2026',
  locale: 'en',                            // the source edition is English; Spanish: src/books/es/<id>.js (§16)
  blurb: 'Back-cover paragraph.',          // optional, ≤ 139 characters
  theme: {
    style: 'lithograph',                   // 'lithograph' | 'engraving'
    cloth: '#1f3a2b', foil: '#c9a44c',     // boards + foil stamping
    paper: '#fbf8f1', ink: '#1c1a17', accent: '#9e2b25', muted: '#7b7466',
    endpaper: { motif: 'scales', color: '#1f3a2b', ground: '#efe7d6' },
    fonts: { display: 'Cormorant Garamond', body: 'EB Garamond', label: 'IBM Plex Sans Condensed', mono: 'IBM Plex Mono' },
  },
  intro: { title, paragraphs: [..], pullQuote? },        // essay page (verso)
  howTo: { title, items: [[gesture, effect], ...] },     // interaction guide (recto)
  plates: [ Plate, ... ],                                 // 6–8
  back: {                                                  // back matter
    note: { title, paragraphs: [..] },                     // e.g. snakebite safety / conservation
    glossary: [[term, definition], ...],
    sources: [string, ...],                                // real, verifiable references
    colophon: [string, ...],
  },
};
```

Registry (`src/books/index.js`, Node-safe — no `import.meta.glob`, the validator imports it):
`BOOKS = [{ id, load: () => import('./<id>.js'), es: () => spanish('<id>') }]`, where `es` resolves
`{ default: null, missing: true }` while `src/books/es/<id>.js` does not exist (the Spanish reader then prints the
English text under Spanish chrome; any other import error still rejects); `MAKING = { en, es }` loads the making
texts (§16); `loadManifest(id)`. Scripts and the edition loader find books only here: `src/books/es/` and
`src/books/making/` hold no books.

`Plate` (one spread: verso text + recto figure; drawing books use `layout: 'lesson'`):

```js
{
  id: 'terciopelo', number: 'I',
  layout: 'plate',                        // 'plate' (default) | 'lesson'
  common: 'Terciopelo', commonAlt: 'Fer-de-lance',   // Spanish + English
  scientific: 'Bothrops asper', authority: '(Garman, 1883)',
  family: 'Viperidae · Crotalinae',
  status: { code: 'LC', label: 'Least Concern', source: 'IUCN Red List' },   // or null
  badge: 'Venomous — dangerous',          // short warning/property chip, optional
  lede: 'One sentence that makes a reader turn the page.',
  body: ['paragraph', 'paragraph'],       // 120–220 words total, *italic* for binomials, **bold**
  facts: [['Length', '1.2–1.8 m'], ['Range', '…'], ...],   // 4–6 rows, short values
  lookCloser: [{ label: 'loreal-pit', name: 'Loreal pit', text: 'Find the heat-sensing pit…' }, ...], // 2–4, label ids
                                          // from the figure; `name` (added, ≤ 3 words) is the printed run-in — optional
                                          // in English (default: the humanised label id), required in a translation
  didYouKnow: 'One surprising, verified fact.',
  figure: { type: 'snake', params: { species: 'bothrops-asper', pose: 'strike' },
            caption: 'Fig. 1 — …', scaleNote: 'Adult, about 1.5 m' },
  animation: { title: 'The strike', beats: [[0, '…'], [1.6, '…'], [3.2, '…']] },
  sources: ['short refs'],
  // lesson-only:
  lesson: { steps: [{ title, text }], proTip, mistakes: [..], proportions: [..] },
}
```

### Text budgets (pages must never overflow)
lede ≤ 25 words · body 120–220 words · facts 4–6 rows (values ≤ 6 words) · lookCloser 2–4 ·
didYouKnow ≤ 40 words · lesson: exactly 3 steps (title ≤ 5 words, text ≤ 40 words), proTip ≤ 45 words,
mistakes 2–3 (≤ 18 words each), proportions 2–4 (≤ 18 words each) · intro ≤ 260 words ·
note ≤ 220 words · glossary 8–14 terms · sources 5–20 · lookCloser `name` ≤ 3 words · blurb ≤ 139 characters.
Both editions must fit the same pages (§16): every page ≥ 90 % auto-fit, the making pages ≥ 25/26.

### Canonical label ids (figure `labels[].id` ↔ manifest `lookCloser[].label`)
- snakes, all: `head eye tongue ventral-scutes cloaca vertebrae ribs`
  pit vipers (+): `loreal-pit fangs venom-gland keeled-scales`; bothriechis: `eyelash-scales prehensile-tail`;
  crotalus: `rattle rattle-button`; lachesis: `tail-spine eggs`; micrurus: `fixed-fangs red-ring black-ring yellow-ring`;
  hydrophis: `paddle-tail nostril yellow-venter`; boa: `pelvic-spur recurved-teeth eye-stripe`
- flowers: guarianthe `sepal petal labellum column pseudobulb leaf`; heliconia `bract flower rachis hummingbird leaf`;
  passiflora `sepal petal corona androgynophore anther stigma tendril`; palicourea `bract flower leaf`;
  handroanthus `corolla calyx nectar-guides branch`; nymphaea `petal sepal stamens stigma pad`
- skulls, human: `frontal parietal temporal occipital sphenoid zygomatic maxilla nasal mandible orbit
  nasal-aperture zygomatic-arch mastoid condyle coronoid teeth coronal-suture sagittal-suture temporalis masseter`
  (the two muscles appear in the open-jaw lesson's `muscles` layer); a snake embedded in a skull lesson keeps the
  snake ids (`head`, …) on its `snake` layer;
  jaguar: `sagittal-crest zygomatic-arch canine carnassial orbit mandible`
- atoms: cloud `nucleus cloud`; isotopes `hydrogen deuterium helium`; water `oxygen hydrogen attraction`;
  states `solid liquid gas`; carbon `diamond graphite bonds`; light `levels transition photon`
- cells: organization `membrane nucleus ribosome`; membrane `head tails channel`;
  protein `dna rna ribosome protein`; energy `cristae gradient synthase`;
  photosynthesis `thylakoid stroma light`; division `chromosomes spindle furrow`
- campfire: shore `flame waves question`; pyrolysis `wood char gas`; reaction `fuel oxygen products`;
  heat `convection radiation conduction`; light `soot ember spark`; sunlight `flame waves sun tree`
Layer ids are the lowercase words in the §12 tables (e.g. `skin skeleton venom eyelash-scales rattle eggs water
perianth column-lip leaves bracts flowers hummingbird corona androgynophore calyx branch petals stamens pads
construction planes bones engraving muscles grid sutures teeth skull snake`).

### Page order (leaves)
`sides[2i]` = front (recto) of leaf i, `sides[2i+1]` = back (verso).
```
leaf 0 (front board): cover | front endpaper
leaf 1: title page | imprint (copyright, edition, credits)
leaf 2: contents | intro essay
leaf 3: how-to-use | plate 1 text
leaf 3+k: plate k figure | plate k+1 text  (k = 1..N, last verso = back.note)
then: sources & colophon | glossary
then: making · the prompt | making · this book's brief     (added: "How this book was made", §16)
back board: back endpaper | back cover
```
`leafCount = plates + 7` (was `+ 6`). The last spreads are `[note | sources]`, `[glossary | making·prompt]`,
`[making·brief | back endpaper]`; find them by name (`lamina.spreadOf`), not by counting from the end.
Both editions have exactly this sequence.
Recto figure pages print: running head, plate number, caption, scale note, folio,
and a faint "stage" mark (ground ellipse) where the pop-up stands.

## 7. Typeset API (src/engine/typeset/index.js)

```js
await loadFonts(theme)                         // resolves when webfonts are ready (timeout-safe)
renderPage(page, { theme, width = 1536 }) → { canvas, hits, overflow, scale, hOverflow, key }
//   page = { layout, folio, runningHead, book, ...layoutData }   (book.locale: the page's language, §16)
//   layouts: cover, back-cover, endpaper, title, imprint, contents, intro, howto,
//            plate-text, plate-figure, lesson-text, lesson-figure, note, glossary, sources, making, blank
//   hOverflow (added): [{ what, text, over }] single lines still wider than their measure at their
//            smallest size (auto-fit only shrinks vertically); scale: the auto-fit step used
//   canvas: width × round(width·1.38); cover/back-cover: (1.028 × 1.436) aspect board
//   hits: [{ id, rect: [u0, v0, u1, v1] (0..1, v from top), action }]
//         actions: { type: 'goto', plate: n } | { type: 'goto', spread, plate?, page?: 'left'|'right' }
//                  | { type: 'label', id } | { type: 'layer', id }
```

Layout authoring (added). A layout (`src/engine/typeset/layouts/*`) draws through the page context `P` (page.js)
and is re-run by auto-fit (`runLayout`): the type scale steps from 1 down to 0.85 by 0.025 until nothing overflows.
A layout may set `layout.fit = { minScale, step }` — `making.fit = { minScale: 25/26, step: 0.0125 }`, so a making
page bottoms out at 0.9625 (25.0 px of its 26 px body). Auto-fit only sees how far text reaches down, so one-line
furniture (kickers, chips, running heads, the figure meta line) goes through
`P.lineFit(src, style, x, y, align, maxWidth, { what, minScale = 0.85, over, draw = true })` or, measure only,
`P.fitWidth(src, style, maxWidth, { what, minScale })`: the line at the largest size that fits, else drawn at
`minScale` and pushed to `hOverflow` as `{ what, text, over }` (design px). `paragraph(fonts, src, { …, hyphenate,
wholeWords })` (text.js): `wholeWords: true` breaks at spaces only (no hyphens, no breaks at dashes or slashes;
bind phrases with U+00A0) — the verbatim texts of the making leaf are set that way, ragged right, in both
languages. Also exported: `hyphenate(word, lang)` (hyphen.js; Spanish rules in `hyphen-es.js`), `withLang(lang, fn)`
(text.js: runs `fn` with that language's hyphenation), `AUTHOR_MARKS`, `drawAuthorMark(g, id, { cx | x, top, width,
color })` and `markAspect(id)` (marks.js).
Lessons (drawing books): the verso keeps a 150 px vertical title band on its outer edge and sets the mistakes,
proportions and look-closer notes in three columns under the three construction panels; the lesson's *Did you
know?* prints on the recto under the caption, so a lesson recto's plate mark ends at `LESSON_MARK_BOTTOM = 0.775 H`
(plate rectos: 0.8 H). Both make room for the longer Spanish edition: every lesson verso keeps ≥ 90 % type in
both editions.

## 8. UI API (src/engine/ui/index.js)

```js
const ui = createUI({ root, book: { id, title, subtitle, plates: [{ number, title, sci, spread }] },
                      onCommand: (cmd) => {} });
// cmd: { type: 'next'|'prev'|'goto'(spread)|'play'|'pause'|'time'(t)|'labels'(on)|'layer'(id,on)
//        |'explode'(amount)|'export'(mode: 'svg-color'|'svg-line'|'png')|'fullscreen'|'reset-view'
//        |'sound'(on)|'library'|'contents' }
ui.setSpread({ index, total, title, sci, number, hasFigure, layers, labels, explode, playing, beats });
ui.setClock(t, duration, playing);             // call each frame (cheap)
ui.renderLabels(items, area);                  // items: [{id,text,detail,x,y,depth,visible}] CSS px
                                               // area: recto rect {x,y,w,h} CSS px for gutters
ui.setBusy(turning); ui.toast(text); ui.announce(text); ui.setBackend(name); ui.destroy();
```
Languages (added, §16): `createUI({ …, lang, libraryHref })`; `ui.setLang(lang, { libraryHref })` re-applies every
string, rebuilds open surfaces and re-measures the bands (call it after i18n's `setLang`, from the App's
`applyLang`); new command `{ type: 'lang', lang }` (in `UI_COMMANDS`), emitted by the top bar's switch;
`createLangSwitch({ value, onChange, size: 'auto'|'full'|'compact', className })` →
`{ el, value, set(lang), setBusy(on), destroy() }` — a WAI-ARIA radio group of autonyms that needs no
`.lam-ui` ancestor and `preventDefault`s every key it uses (src/engine/ui/langswitch.js, re-exported by ui/index.js
with `keyCap(key)`, a key's cap name in the current language). `ui.lang` and `ui.getState().lang` say which language
the UI shows; `onCommand` may return a promise for `'lang'` (the switch is `aria-busy` until it settles, then shows
the language actually in place); `book.kind` (`'Plate' | 'Lesson'`) is passed as its English key and translated by
the UI.
Labels (added): `ui.renderLabels(items, area, fig)` items may carry `mark` (`'dot' | 'ring' | 'tick'`, else
`item.label.mark`), `r` (the feature's projected radius, CSS px: a ring is drawn at `r + 1.5`) and `headPx` (the
projected head length, CSS px: on a head under 40 px every face mark is a tick); `ui.getState().labels[]` reports
`mark` and `r` too. Pills keep their text whole (≤ 110 px at 12.5 px) and stay inside the viewport.

## 9. Export API (src/engine/export/index.js)

```js
await exportFigureSVG({ renderer, mount, camera, mode: 'color'|'line', width: 1600,
                        title, caption, credit, labels: true|false,
                        keep: [labelIds],           // added: hidden labels kept (hollow) in the key
                        lang: 'en'|'es' }) → string // added: key, part/swatch <title>s, <title>/<desc> in `lang`
                                                    //   (default: the current language); root xml:lang/lang
//   rejects with err.code = 'no-solids' and a reader-facing err.userMessage (in `lang`) when no pose of
//   the loop shows a solid form under the current layers
exportFileName({ book, plate, kind: 'color'|'line'|'png', lang }) → 'serpientes-terciopelo-color.svg' |
  '…-line.svg' | '….png'; Spanish '…-color-es.svg' | '…-lineal-es.svg' | '…-es.png'   (added)
await exportPNG({ renderer, scene, camera, width }) → Blob
downloadText(filename, text, mime); downloadBlob(filename, blob)
regionNames(figure) → string[]   // added: the names the plate gives meshes outside every part (translate them too)
```
Added: the key draws each label's `mark` (a ring round an eye, pit or nostril, or a tick whose leader stops short)
at the camera-side anchor (`alt`); the SVG metadata carries `meta.lang`. Subject hooks the exporter reads, all
optional: `parts[].swatches`, `.minPatternPx`, `.keepSmall`, `swatches[i].keepSmall` (§5);
`mesh.userData.export = 'skip'`; `material.userData.exportColorNode` (the colour node the plate reads instead of
`colorNode`, e.g. a skin pattern without its per-scale relief); `material.userData.reveals`; `figure.keyTime` and
`layerShown(id)`. An ink line is hidden only by a surface more than 3 buffer px of depth in front of it
(`LINE_TOL_PX`, and at most 1.2 % of the figure's depth range).
SVG pipeline: render the figure alone into an ID buffer (part × tone band), read back
(`renderer.readRenderTargetPixelsAsync`), marching squares per region → simplified,
smoothed paths; fills = part colour per tone (light/mid/shadow); ink outlines on part
boundaries + silhouette; optional numbered labels; caption; `<title>`/`<desc>`.
`mode: 'line'` = outlines only on white (a colouring plate).

## 10. Book engine API (src/engine/book/Book.js)

`new Book({ leafCount, theme })` · `setLeafTexture(i, 'front'|'back', tex)` ·
`next() prev() goTo(opened) setOpened(k)` · `beginDrag(side, z) dragTo(x, z) endDrag()` ·
`leafFrame(i, s, z)` · `leafProgress(i)` · `update(dt)` · events: `change`, `turnstart`, `turnend` ·
`opened`, `rightLeaf`, `leftLeaf`, `busy`. Picking: `pick(raycaster) → { leaf, side:'front'|'back', u, v, s, z } | null`.

## 11. Automation (window.lamina, integration)

`lamina.ready` · `lamina.goTo(spread)` (instant) · `lamina.plate(n)` · `lamina.setTime(t)` ·
`lamina.pause()` · `lamina.setLayer(id,on)` · `lamina.setExplode(a)` · `lamina.setLabels(on)` ·
`lamina.exportSVG(mode)` → string · `lamina.info()` (+ `lang`).
Added (§16): `lamina.lang` (getter) · `lamina.setLang(lang, { persist = false })` → resolves true once the new
language shows (session-wide, kept across views) · `lamina.spreadOf(layout, part?)` → first spread showing that
layout (`'note'`, `'glossary'`, `'making'` + `'prompt'|'brief'`) or null · `lamina.i18nMissing()` → keys shown
untranslated since the language loaded · `lamina.manifest`, `lamina.plates`, `lamina.sides` are live getters (they
change with a switch) · `lamina.ready` re-arms on any route change, a language-only one included.
Also (added): `lamina.turnTo(spread, page?)` (an animated turn; `page` `'left'|'right'` is the page a portrait screen
lands on — `goto` commands carry `page` too) · `next()` · `prev()` · `play()` · `settle(ms)` (resolves when no leaf
is turning and the pop-up stands) · `inspect(on)` · `info()` → `{ book, lang, opened, spreads, plates, active,
layers, labels, time, playing, busy, mode, … }` · `editionReport(lang?)` → a copy of the composition report of the
edition shown (or of `lang`'s), null before it loaded — capture and QA assert a complete Spanish edition with it.
A language switch leaves User Timing marks `lamina:lang:prepare` → `lamina:lang:start` → `lamina:lang:visible` (the
pages on screen swapped) → `lamina:lang:all` (every kept page printed again).
URL: `index.html#/<lang>/<book>?plate=3&t=2.5&ui=0&labels=1&explode=0` (`<lang>` = `en` | `es`). A route without a
language (`#/<book>`, `#/`) still works: boot resolves the language and rewrites it in place. Scripts always name it.
Routes (`src/app/route.js`): `parseRoute(hash)` → `{ lang | null, book, params }`, `routeHash({ lang, book, params })`,
`withLang(hash, lang)`, `bookHref(id, params, lang)`, `libraryHref(lang)`, and `replaceHash(hash)` — the one way code
rewrites the URL: `history.replaceState` that keeps `history.state` (Back after a switch relies on its entry marks
where the Navigation API is missing) and drops a `?lang=` alias.
Lab (`lab.html?…&lang=es`): `lab.lang`, `lab.setLang(lang)` (in place, like the reader), `lab.i18n.{ t, hasT,
missing }`, and `lab.info()` → `{ …, lang, strings, missing }`: `strings` are the figure's English strings (labels,
layers, parts and colours, the SVG's generated names, beats), `missing` those the lab's language lacks.

## 12. The three books

### I. Serpientes — snakes of Costa Rica (`type: 'snake'`, style lithograph)
| # | common | species param | pose | 5 s animation | layers (min) |
|---|---|---|---|---|---|
| I | Terciopelo | `bothrops-asper` | `strike` | S-coil, tongue flicks, fast strike ~1.6 s (fangs swing erect), recoil | skin, skeleton, venom |
| II | Bocaracá (oropel) | `bothriechis-schlegelii` (`morph: 'oropel'`) | `branch` | coiled on a branch, prehensile tail, head sway + tongue | skin, skeleton, eyelash scales |
| III | Coral | `micrurus-nigrocinctus` | `slither` | travels a closed path (lateral undulation), tail curl | skin, skeleton, venom |
| IV | Cascabel | `crotalus-simus` | `rattle` | defensive coil, rattle blur, head raised | skin, skeleton, rattle (explodes segments) |
| V | Matabuey | `lachesis-stenophrys` | `ambush` | ambush coil, slow breathing, tail-tip vibration | skin, skeleton, eggs (oviparous) |
| VI | Serpiente marina | `hydrophis-platurus` | `swim` | swims in a water slab, paddle tail | skin, skeleton, water |
| VII | Béquer | `boa-imperator` | `constrict` | two loops tighten and relax round a black rat (*Rattus rattus*) at real scale, its neck held in the jaws | skin, skeleton (pelvic spurs) |
Extra snake params: `{ path: [[x,y,z],…] cm, pose: 'follow-path', length: cm }` lets other
subjects (skull & snake) drive a snake along a custom path.

### II. Flores — flowers of Costa Rica (`type: 'flower'`, style lithograph)
| # | common | species param | 5 s animation | layers |
|---|---|---|---|---|
| I | Guaria morada | `guarianthe-skinneri` | bloom opens, lip flutters, slight sway | perianth, column & lip, leaves/pseudobulbs |
| II | Platanilla | `heliconia-wagneriana` | hummingbird hovers and visits a flower in a bract | bracts, flowers, hummingbird |
| III | Granadilla de monte | `passiflora-vitifolia` | flower opens, corona filaments ripple, tendril coils | sepals & petals, corona, androgynophore |
| IV | Labios de mujer | `palicourea-elata` | red bracts part, white flowers emerge | bracts, flowers, leaves |
| V | Cortez amarillo | `handroanthus-ochraceus` | trumpet cluster sways; one corolla drops and falls | flowers, calyx, branch |
| VI | Nenúfar | `nymphaea-ampla` | opens on the water, ripples | petals, stamens, pads, water |
Explode = botanical dissection (whorls separate along the floral axis).

### III. Calaveras — drawing skulls, a constructive method (`type: 'skull'`, style engraving)
Versos use `layout: 'lesson'` (big vertical condensed title, pro tip, 3–4 construction steps
drawn by the skulls module's `drawStep`, proportion notes). 5 s loop on each recto
performs the lesson in 3D (construction → planes → engraved/coloured).
| # | lesson | params | animation | layers |
|---|---|---|---|---|
| I | Frontal view | `{ subject: 'human', lesson: 'frontal' }` | sphere + centre line → jaw box → sockets → engraved skull | construction, planes, bones (colour), engraving |
| II | Three-quarter, open jaw | `{ subject: 'human', lesson: 'open-jaw' }` | mandible opens/closes about the TMJ hinge | construction, bones, muscles of mastication |
| III | Profile | `{ subject: 'human', lesson: 'profile' }` | turntable 0°→90°→0° with proportion grid | construction, grid, bones |
| IV | The bones | `{ subject: 'human', lesson: 'bones' }` | bones separate and reassemble (explode loop) | bones (colour), sutures, labels |
| V | Jaguar | `{ subject: 'jaguar', lesson: 'jaguar' }` | jaw bite, sagittal crest highlight | construction, bones, teeth |
| VI | Skull & snake | `{ subject: 'human', lesson: 'skull-and-snake', snake: { species: 'bothriechis-schlegelii' } }` | snake slithers through the orbit along a path | construction, skull, snake |

## 13. Visual style guide

- Paper `#fbf8f1`, ink `#1c1a17`, pure white stage. Accent per book.
- Type: display serif (Cormorant Garamond) for titles, EB Garamond body (11–12 pt
  equivalent, 1.45 leading, justified with hyphenation, ragged-right fallback),
  IBM Plex Sans Condensed small caps for labels/kickers, IBM Plex Mono for numbers;
  the drawing book uses Oswald (condensed, uppercase) for its vertical lesson titles.
- Generous margins (outer 9%, inner 11%, top 8%, bottom 10%), running heads in
  letter-spaced small caps, folios at the outer bottom corner.
- Figures: ink outlines 1–1.5 px equivalent, engraved hatching only in fall-off and
  cast shadows (lithograph) or carrying all tone (engraving); rich natural colours.

## 14. Accuracy rules

- Facts must be verifiable in reputable sources (IUCN, Reptile Database, Savage 2002
  *The Amphibians and Reptiles of Costa Rica*, Instituto Clodomiro Picado, Tropicos,
  MNCR/INBio, peer-reviewed papers). Prefer conservative ranges. No invented numbers.
- Current taxonomy (state synonyms where helpful). Spanish common names as used in CR.
- Snakebite text: seek medical care immediately; antivenom is the treatment; no
  tourniquets, cutting, suction or ice. Never encourage handling snakes.
- Anatomy: correct counts and structures (e.g. human skull: 22 bones, mandible the only
  movable bone; flower whorl counts per species).

## 15. Changes adopted at integration (append-only log)

- **Stage / rig** (`src/engine/stage.js`): `createStage()` also returns `lights`, `ground`, `setBook(book)`;
  `rig.inspect` is now a method — use `rig.inspectSphere(center, radius)`; inspect state lives in
  `rig.inspectState`; `rig.reset()` clears zoom, pan and orbit; `rig.focusPage('auto'|'spread'|'left'|'right')`;
  portrait screens use at least 58° elevation. The reader sets `rig.setFitBox(spread ∪ active figure box)`.
- **Tone** (`src/engine/renderer.js`): `laminaToneMapping` (custom, hue-preserving) at exposure 0.78
  replaces Neutral; the ink kit auto-calibrates hatching to the light rig (`calibrateInk`).
- **Book** (`src/engine/book/Book.js`): theme `{ paper, cloth, edge, foil, headband, endpaper }`;
  `LEAF_T = 0.0045`; `spreadOpening(i)`, `leafVisible(i)`, `surfaceY(side)`, `freeze/unfreeze`,
  `pick()` returns `face`; events `riffle` and `release`; drags change `opened` on release.
- **FigureHost**: pop-ups fold with `book.spreadOpening(leaf)` (0.7 → 1 opens) and hide on covered
  leaves; `labelItems(camera, w, h)`, `focusPoint`, `figureRadius`, `pickFigure`, `beats`, `currentBeat`,
  events `mounted layers beat`; layer dissolves for parts that declare `layer`.
- **Ink kit**: `ctx.inkLine(points, opts)`, `setFade(obj, a)`, options `svgColor`, `sheen`, `clearcoat`,
  `crossHatch`, `hatchLod`; `hatchAngle` now tilts the default contour lines (0 = horizontal).
- **UI**: `createUI({ …, theme, reducedMotion, announceSpreads, libraryHref })`, `runShortcut(e)` is
  the single keyboard map, `setChromeVisible`, `setReading`, `setSound`, `animationTitle` in `setSpread`.
- **Audio**: `connectBookAudio(book, audio)` wires page sounds to Book events.
- **Canonical ids** (§6): `temporalis masseter` (open-jaw muscles); an embedded snake keeps snake ids.
- **Reader**: look-closer taps switch the label's layer on; labels are ranked (focused, look-closer,
  switched-on layer, figure order) and capped at 10 / 8 / 6 by viewport width.
- **Review rounds 1–2 (2026-11-01)** — see `docs/prompts/04-review.md`:
  - *Framing*: `rig.setInsets({ top, bottom } | null)` (CSS px, from `ui.bottomReserve()`) frames the book
    between the UI bands; `rig.setFitBox(box, parts?)` fits the spread and the pop-up as separate parts.
  - *UI*: `ui.bottomReserve()`, `ui.setSinglePage(on)`, `ui.setSpread({ …, kind: 'Plate' | 'Lesson' })`,
    `ui.setReading(html, { title })`, `ui.toast(msg)`; `ui.renderLabels(items, area, fig)` — items may carry
    `rank`; `area.spine` (the gutter while inspecting), `area.avoid = [[x0, y0, x1, y1], …]` and
    `area.caption` (printed rects that label rows step over); pass `fig` whenever a figure stands;
    `ui.getState().labels` → `[{ id, text, slot, row, x, y, w, h, op, chosen, reserved, anchor }]`.
  - *Typeset*: `loadFonts(theme, { manifest, glyphs, layouts })` loads only the faces those layouts set.
  - *Book*: `endDrag({ target })`; input's `onNavigate(dir, how = 'swipe')`.
  - *Figures*: optional `figure.keyTime` (the export's key pose when a stage shows nothing solid) and
    `figure.layerShown(id)` → boolean | undefined (what is drawn now, e.g. during a dissection);
    `mesh.userData.occluder` (label occlusion proxy), `userData.noOcclude` (never blocks a label ray).
  - *Export*: `parts[].swatches: [{ color, name }] | false`; `mesh.userData.export = 'skip'`;
    `userData.exportGhost` (translucent overlays left out); `material.userData.reveals`,
    `material.userData.inkMask`; `world.userData.restPose = { position, rotation }` holds the floating world
    still during export passes; `exportFigureSVG(…, { keep: [labelIds] })` keeps hidden labels the reader
    asked for; it rejects with `err.code = 'no-solids'` and a reader-facing `err.userMessage`.
- **Round 2, recorded with the bilingual edition (2026-11-01)** — additive behaviour the round-2 reports asked
  to have logged (`.scratch/bilingual/handoffs-round2.md`):
  - *Reader*: inspect frames the figure's whole loop hull, as close as it fits (no 0.75× cap); a pop-up whose shaders
    are not built yet is held folded and stands 0.3–0.9 s later (warm-up order: landing page, next, previous), and
    `lamina.goTo/plate` resolve once it may stand; the near-miss tap radius around a figure depends on the pointer
    type; `prefetch` keeps the rest spread and the faces in flight; `PageCache.trim()` replaces `invalidate()`; input
    and keys are off until a view activates, and `Library.activate`/`route()` reset the rig; Reader and Library call
    `rig.setInsets` directly; label occlusion has a 0.4 s grace, doubling to 1.6 s after a blink, and a label shown
    last frame keeps its slot (cap incumbency); skin off with neither skeleton nor venom on switches the skeleton on;
    a paused look-closer seeks the nearest moment its anchor is in view (`userData.occluder` / `noOcclude`).
  - *Library*: reserves its caption row; loads the cover faces plus Cormorant 500 for its own chrome.
  - *UI*: `ui.getState().short` and `[data-short]` (`(max-height: 560px) and (orientation: landscape)`: caption
    hidden, Read shown, toolbar-only `bottomReserve()`); `SHORTCUT_GROUPS`, and SHORTCUTS rows turn-figure (`[` `]`),
    inspect-turn and inspect-tilt (display only); `EXPORT_MODES[].busy`; an `'export'` command is emitted one painted
    frame after the request, one at a time, `ui.toast()` ends a pending export and `onCommand` may return a promise
    for it; the reading sheet and screen-reader copy carry "The animation · <title>" beats before the sources; the
    Moment slider's `aria-valuetext` carries the beat; play/pause announce in the live region.
  - *Typeset*: contents entries carry `id` and `page`; goto hit actions may carry `spread` and `page` (§7).
  - *Book / input / stage*: a page drag waits until the stroke heads for the gutter (≥ `TAP_SLOP` px); hover picks
    are throttled to one per max(90 ms, 30 × pick cost) plus a trailing pick at rest; leaf geometries keep a tight
    `boundingBox` for picking; inspect distance range [0.2, 8] for `inspect()` and `zoomBy()`; the key light uses a
    custom PCF `filterNode` (`keyShadowFilter`) — switching to VSM means removing it.
  - *Figures and export*: `mesh.userData.noOcclude` (label rays skip the mesh; it stays pickable; per mesh, not
    inherited); `FigureHost.setLayer` dissolves start from the parts' shown amount; `_pickables` refresh when explode
    moves; one ID-material kit per figure, released with it; lab `exportSVG(mode, { keep })`; the ink kit shares one
    `ScreenNode` uniform. Subjects that deform geometry on the CPU keep `geometry.boundingBox/boundingSphere` (and
    `InstancedMesh.boundingSphere`) current — `SweptTube.update` does — because framing and raycasts rely on them.
  - *SDF kit*: `meshModel({ options: { bvh } })`, `buildBVH`, `createOccluder` / `MeshOccluder`; the mesher's
    `stats.ms` gains `bvh`; skull construction planes use `userData.export = 'skip'` (`noExport` is gone).
  - *Snakes*: during a dissection past half-way the inner labels (vertebrae, ribs, fangs, venom-gland) drop `layer`
    so the host and the SVG key list them by their anchors, and skin-surface anchors hide.
- **Bilingual edition, author mark, making leaf, snake faces (2026-11-01)** — see §16 for the language contract:
  - *Manifest* (§6): `byline: { name, mark }` (the author; `author` stays the imprint string), `lookCloser[].name`,
    `blurb` ≤ 139 characters; Spanish editions `src/books/es/<id>.js` composed over English along
    `src/i18n/schema.js`; `BOOKS[].es` loaders and `MAKING = { en, es }` in `src/books/index.js`; the making leaf
    before the back board (`leafCount = plates + 7`).
  - *Typeset* (§7): `renderPage().hOverflow`, layout `making`, `withLang(lang, fn)`, `hyphenate(word, lang)`
    (`hyphen-es.js`), `marks.js` (`AUTHOR_MARKS`, `drawAuthorMark`, `markAspect`): the wordmark foil-stamped on both
    boards and printed in its own colours on the title page and imprint; auto-fit may take a making page down to
    25/26 of its size in finer steps.
  - *UI* (§8): `lang` and `setLang`, the `'lang'` command, `createLangSwitch`. *Export* (§9): `lang`,
    `exportFileName`. *Automation* (§11): `lang`, `setLang`, `spreadOf`, `i18nMissing`, live getters.
  - *FigureHost*: `relocalize()` (forget per-mount translations: labels, beats, the error notice) and
    `setBeats(leafIndex, beats)` (the new edition's manifest beats; mounts keep their spec); label items carry the
    translated `text`/`detail`.
  - *Labels* (additive optional fields of `figure.labels[]`, §5): `mark: 'dot' | 'ring' | 'tick'` (default dot),
    `size` (cm, the feature's radius; the host projects it to `item.r` in CSS px), `alt` (an Object3D, the
    mirror-side anchor; the host uses whichever faces the camera). The UI draws a ring of `r + 1.5` px or stops the
    leader short with a tick, and its white halo stops before the anchor, so no mark hides an eye, pit or nostril.
  - *Scripts*: `validate-books.mjs [ids] [--lang en|es|all] [--fit] [--json] [--runtime]`,
    `audit.mjs [--lang en|es] [--i18n]`, `capture.mjs [--lang en|es|both]`, `i18n-strings.mjs` (new); scripts find
    books through the registry (`src/books/es/` and `src/books/making/` are not books).
  - *i18n core* (§16): `msg` and `placeholders(s)` are named exports; `dictionaryEntries(lang)` → unmerged
    `[key, value, domain, kind]` (`kind` `'key' | 'pattern'`); `dictionaryProblems(lang)` → `[{ domain, key, kind,
    problem }]` (a key defined twice with different values, an empty value, placeholders a value drops or invents, a
    pattern without a ≥ 3-letter word or without placeholders); `composeMaking(enMod, xxMod, { id, lang })` →
    `{ making, report }` along `MAKING_SCHEMA` (schema.js); `lastReport(id, lang = current)` → `{ lang, fallback, notes,
    missing, extra, changedIds, lengths, types, unknown, order }`, path lists with `'*'` for a whole file and `making.…`
    for the making texts. `walk(schema, value, visit)` calls `visit(node, value, path, parent, key)`, so
    `en(parent)[key]` is the English counterpart in a composed edition; also `identicalAllowed(node, enValue,
    enParent)`, `isTaxon`, `isTextKind`, `TAXON_SUFFIXES`. `byline` is an ID field; `lookCloser[].name` is optional in
    English and required in a translation; `fmtSeconds` puts U+00A0 before `s`; `loadLang` rejects for a language
    without dictionaries; a fallback edition (no translation file) keeps `locale = lang` (Spanish furniture over
    English text) and a making part that falls back carries `lang: 'en'`; a browser logs one `console.info`
    `[lamina] es edition of "<id>": …` per incomplete edition.
  - *Registry* (§6): `BOOKS[].es` resolves `{ default: null, missing: true }` while a translation file is missing;
    `MAKING = { en, es }`; the making modules export `LANG`, `MODEL`, `PROMPT { source, lines, title, headings }`,
    `BRIEFS[id] { source, text }`, `LATER { source, text }` and, translated, `TRANSLATED_FROM`.
  - *App* (§11, §16): routes and `replaceHash`; boot's view contract — `createLibrary` / `createReader` receive
    `{ lang, requestLang }`, `view.prepareLang(lang)` changes nothing visible, `view.applyLang(lang)` runs
    synchronously after `setLang` and a throw asks boot to rebuild the view in `lang`; `lamina.lang` / `setLang` are
    session keys copied by property descriptors (getters stay live) and `lamina.ready` re-arms per `${lang}|${book}`; a
    switch replaces the history entry, and Back/Forward to an entry of the other language after a reader-chosen switch
    opens in the current one. Reader: `turnTo(spread, page)`, `goto` commands with `page`, the `lamina:lang:*` marks;
    `PageCache` `print`, `setSides`, `refresh`, `free`, `discard`, `kept` (a switch keeps no stale page); labels get
    `area.avoid` (printed bands), `area.spine` whenever inspecting and `fig` whenever a figure stands; an export
    passes `keep` and `lang`, is named by `exportFileName` and toasts the exporter's `userMessage`; on phones a tap
    on a head label or its look-closer note frames the head up close (`host.regionSphere`) and follows it through
    the loop; the a11y mirror carries the bylines, the imprint's author and fixed lines, how-to notes, caption and
    scale note, look-closer names, `lang` spans and the making pages; the portrait Read sheet leads with the page on
    screen.
  - *UI* (§8): `ui.lang`, `getState().lang`, `book.kind` as an English key, the `'lang'` command's promise
    (`aria-busy`), `keyCap`; label items' `mark`, `r`, `headPx`; the reading sanitizer allows `CODE` (source paths);
    the toolbar's plate-name width is measured per book and language (`--lam-plate-w`); toasts wrap to two lines.
    Spanish key-cap names follow the Microsoft Spanish (Mexico) style guide §5.5.2.
  - *Typeset* (§7): `layout.fit`, `P.lineFit` / `P.fitWidth`, the lesson verso redesign (150 px band, notes in three
    columns under the panels) and the lesson *Did you know?* on the recto (`LESSON_MARK_BOTTOM = 0.775`).
  - *Figures and export* (§5, §9): `FigureHost.labelAnchor(label, leaf?)` (the camera-side anchor of a label with an
    `alt`); `beats()` gives the manifest beats as given, else the figure's own, translated; label `headSize`;
    `parts[].minPatternPx`, `keepSmall`, `swatches[i].keepSmall`; `regionNames(figure)`; `figure.loopBounds`
    (skulls). The skull-and-snake lesson forwards the embedded snake's own parts (ids prefixed `snake-`, layer `snake`)
    and labels (with `mark`, `size`, `alt`), so its SVG prints the viper's named colours and face.
  - *Ink kit*: `ctx.ink({ emissiveNode })` (a self-lit colour added to the lit result, such as an eye's catchlight;
    lithograph only, never hatched) and `inkViewport` (the shared viewport uniform, device px, for sizes measured in
    screen pixels). No new canonical label ids.
  - *Snakes* (props): `buildPrey(ctx, { axisY, hb, tailLen, girth })` returns the rat with `bite { point, normal,
    along }`, `radiusAt(x)`, `spineYAt(x)` and `setAxisY(y)`; parts `prey-fur`, `prey-skin`, `prey-tail`, `prey-eye`
    replace the single `prey`; the constrict pose sets the rat's height (the lowest loop on the paper) and drives
    `out.radius` (the coil's swell) and `out.prey` (the chest squeeze, applied on the CPU to the torso only).
  - *Book / input / stage*: `createInput({ …, nearFigure, keyboard })` — `nearFigure(x, y, pointerType) → boolean` is
    the reader's near-miss test: a press beside the figure (on the recto or the white around it) that passes it
    starts a figure gesture (a drag turns the figure instead of lifting the page; a tap stays the page or background
    tap it was) and hover shows `grab` there; `createStage` sets `world.userData.restPose = { position: [0, 0.014, 0],
    rotation: [0, 0, 0] }` (the float height), so export passes hold the float and repeated exports are identical.
- **Release follow-up (2026-11-02)** — the release report's open items, closed by area:
  - *Rules decided by the lead* (§16): one structure, one name — a Spanish pill whose label a look-closer note names
    is exactly the note's run-in; everything a Spanish reader sees is Spanish but proper names, binomials,
    bibliographic entries and the English originals on the English making leaf; verbatim texts are never hyphenated
    or justified; a label never points at the prey — the constricting béquer has no tongue label (the tongue stays
    in while it bites) and its recurved-teeth anchor sits at the corner of the mouth, off the rat's fur.
  - *Snakes*: the constrict pose's figure title is `Boa imperator — constricting a black rat`. *Ink kit*:
    `inkLine(…).setPoints(pts)` given an open line's same-length `Float32Array` copies it into the line's own array
    (nothing allocated per frame).
  - *Figures and export*: `labelItems` projects `label.headSize` to `item.headPx` (NaN for other labels);
    `host.regionSphere(labelId, target?, leaf?)` → the world sphere round a label's region (`figure.regionOf(label)` or
    `label.region`: `{ object, box }`; else the head group named `'head'`, measured by its `'head-skin'` ∪
    `'jaw-skin'`), its radius half the box's longest side, allocation-free after the first call;
    `material.userData.exportColorNode`; ink lines hidden by depth with a pixel tolerance (`LINE_TOL_PX = 3`).
  - *Reader*: `lamina.editionReport(lang?)`; look-closer seeks test `host.labelAnchor(label)`; pills keep off
    `figure.loopBounds` when a figure declares it; face labels are capped per head — one under 40 px of `headPx`, two
    under 80 px (focused first, then look-closer notes, a layer switched on, the eye).
  - *UI*: pills and cards are clamped inside an 8 px viewport margin; a tick whose feature has a radius stops its
    leader outside the feature; the contents drawer sends `page` with `goto` and restores focus by entry.
  - *Typeset*: `paragraph(…, { wholeWords: true })`; the making texts are set with it, ragged right, Latin names
    (`page.binomials`), "p. ej." and code brackets bound with U+00A0.
  - *Scripts*: `npm test` = `test:i18n` (`i18n-core-test.mjs`, which now adapts to the registered books: a
    bootstrapped starter skips the seven-plate synthetic translation and says so) + `test:hyphen-es` (new,
    `hyphen-es-test.mjs`); `validate-books --lang es --runtime` compares each look-closer run-in with its pill and
    judges figure dictionaries' stale keys only against the runtime strings; `capture` also asserts
    `lamina.editionReport()` complete for each Spanish book.

## 16. Languages

The books are published in English and Spanish. English is the source; Spanish is composed over it. Nothing here
changes an earlier contract: a manifest, a figure or a module that knows nothing of languages keeps working in
English.

**Languages and routes.** `LANGS = ['en', 'es']` (`src/i18n/index.js`, also the switch order; `DEFAULT_LANG = 'en'`).
Routes: `#/<lang>/` (library) and `#/<lang>/<book>?…`. A route that names no language (`#/`, `#/<book>`, or the alias
`index.html?lang=es#/<book>`) resolves to the stored preference (`localStorage['lamina.lang']`, written only when the
reader picks with the switch), else the first `navigator.languages` entry whose primary subtag is `en` or `es`, else
English, and is rewritten in place (`replaceHash`, a `replaceState`). Book ids are never two-letter codes.
`<html lang>` follows the session's language; the page `<title>` and the meta description are translated.

**Editions.** `loadEdition(id, lang)` (`src/i18n/edition.js`, Node-safe) returns the edition a reader, library or
typesetter prints: English is the manifest (`locale: 'en'`); Spanish is `composeEdition(english, es)` walked along
`MANIFEST` in `src/i18n/schema.js`, whose leaves are **ID** (never translated: from English), **TEXT** (translated),
**SAME** (may stay identical: names, citations), **SCI** (identical only when the plate has an `authority`),
**TAXON** (identical only when every part is a taxon) and **LOCALE**; lists are index-aligned, plates matched by `id`
and look-closer rows by `label`. Missing text shows the English (never blank) and is reported (`lastReport`); a
missing translation file gives Spanish chrome over English pages. `edition.making` holds the making texts. Every
composed object and array carries its English counterpart, `en(node)` (a non-enumerable symbol): decisions taken
from words (how-to icons, warning badge, binomial italics) read `en(node)`, so both editions are styled alike. A key
of an English manifest that `MANIFEST` does not declare is a validator error.

**Strings.** Code keeps English: a user-visible string is its own dictionary key and is translated only where it
leaves for the screen, a canvas, an SVG or the a11y mirror — `t(key, vars)` in the current language,
`tl(lang, key, vars)` in an explicit one (a printed page uses its edition's `book.locale`; the exporter its `lang`).
Code never compares or branches on translated text; ids are never translated. Table literals that reach `t()` later
are marked `msg('…')` (identity) so `scripts/i18n-strings.mjs` finds them. Dictionaries: `src/i18n/es/<domain>.js`,
one per owner area (`shell`, `app`, `ui`, `typeset`, `export`, and one per figure subject folder), registered in
`src/i18n/es/index.js` (`DOMAINS`, `PATTERNS`): the default export holds explicit keys (looked up exactly, never
compiled; values keep every `{placeholder}`); the optional `PATTERNS` export holds match patterns for strings built
at run time (`'Rattle segment {n}'`), each with a literal word of ≥ 3 letters; a captured value that is itself a key
is translated. A miss returns the English and is recorded (`missingKeys()`). The same key defined twice with
different values is an error. Figure subjects contain no i18n code: `FigureHost`, the Reader and the exporter
translate their strings; the figure `title` is a developer label and is not translated. Numbers shown at run time go
through `fmtNumber` / `fmtSeconds` / `fmtPercent` / `fmtList` (`es-CR` conventions: decimal comma, U+00A0 grouping
from five digits, `85 %`), `compareText` collates, `quote` quotes («…» / “…”); U+202F is never emitted (no book
font has it). Keyboard shortcuts keep their keys in both languages.

**One structure, one name.** A figure label that a look-closer note names is one structure in two places: in a
translation the label's pill and the note's run-in (`lookCloser[].name`) are the same words — at most 3 words and
110 px of pill text in the UI font (`validate-books --lang es --runtime` compares them; `audit --i18n` measures the
pill). In English the run-in defaults to the humanised label id and may be shorter than the pill (*Fangs* /
*Hinged fangs*). In a Spanish edition everything the reader sees is Spanish — pages, chrome, pills, layer names and
hints, beats, captions, toasts, the SVG key and titles — except proper names, binomials, bibliographic entries and
the English originals quoted on the English making leaf.

**Typesetting.** A page is a pure function of its spec, in its edition's language: hyphenation (`hyphenate(word,
lang)`, Spanish syllabic rules in `hyphen-es.js`), glossary order (`compareText`), quotation marks and numbers
follow `page.book.locale`. Both editions print the same side sequence, folios and plates. The author's wordmark
(`byline.mark` → `AUTHOR_MARKS`, drawn from path data verified against `public/author/<mark>.svg`) is foil-stamped
on both boards in the book's foil and printed in its own colours on the title page and the imprint. The making leaf
(`layout: 'making'`, `making.part: 'prompt' | 'brief'`) prints the prompt that began the series on its recto and
the book's brief on its verso, verbatim in English and as labelled translations in Spanish, at 26 design px, never
below 25; the brief page closes with one line on the later prompts in `docs/prompts/`. Verbatim texts are set ragged
right and never hyphenated or justified, in both languages (`paragraph(…, { wholeWords: true })`): words, URLs,
file names, binomials and code tokens stay whole. `src/books/making/index.js` (English, checked character by
character against `docs/prompts/`) and `src/books/making/es.js` export `LANG`, `MODEL`, `PROMPT { source, lines,
title, headings }`, `BRIEFS[id] { source, text }`, `LATER { source, text }` (and `TRANSLATED_FROM` in Spanish), the
same shape and line structure in both.

**The switch.** `createLangSwitch` (a radio group of autonyms, *English · Español*) in the reader's top bar and the
library header; a choice runs boot's `changeLang(lang, { persist: true })`: `loadLang(lang)` →
`view.prepareLang(lang)` (editions, fonts, the pages on screen pre-typeset; nothing visible changes) → a newer
request supersedes → `history.replaceState` (the same history entry: Back never toggles the language) →
`setLang(lang)` → `view.applyLang(lang)` (synchronous: on-screen pages swapped with no blank frame, other cached pages
dropped and re-printed in idle time, `host.relocalize()` + `setBeats()`, `ui.setLang()`, contents, title, URL,
announcement) → `lamina.ready`. A view without `prepareLang`/`applyLang`, or whose `applyLang` throws, is rebuilt in
the new language where its URL left it. The figure is never remounted: spread, time, layers, explode, labels, focus,
yaw and inspect survive. Exports snapshot their language and edition when the command arrives.

**Acceptance.** `npm test` passes (the i18n core and Spanish hyphenation);
`node scripts/validate-books.mjs --lang all` (and `--fit` against a build) reports 0 errors;
`node scripts/audit.mjs --lang es --i18n` reports no figure string without Spanish and no Spanish label pill over
110 px of text at 12.5 px in the UI font, and `validate-books.mjs --lang es --runtime <its --json>` finds every
figure string in the dictionaries and every look-closer run-in equal to its pill; `node scripts/i18n-strings.mjs
--missing` is empty; `node scripts/capture.mjs --lang both` completes with no console error and
`lamina.i18nMissing()` empty after a Spanish read-through.
