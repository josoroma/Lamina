---
name: lamina
description: Build interactive, page-turnable 3D scientific books ("living plates") with Three.js WebGPU + TSL — a realistic hardcover floating on a pure white canvas, typeset pages, pop-up 3D figures with ink-and-hatching shading, seamless 5-second scientific animations, layers, labels, dissection and portable SVG export, with a WebGL 2 fallback, published in English and Spanish with a language switch, the author's mark foil-stamped on the boards and a closing "How this book was made" leaf. Use this skill whenever the user wants to turn a scientific topic (animals, plants, anatomy, fossils, minerals, machines, astronomy…) into an illustrated interactive book, atlas, field guide, encyclopedia, drawing course or colouring book; whenever they ask to add a book, plate, species, lesson, figure subject or translation to Lámina; whenever they work on its book engine, typesetter, figure kits, UI, editions, dictionaries or SVG export; or when they need screenshots, SVGs or docs of the books — even if they never say "Lámina".
---

# Lámina — living scientific plates

Lámina turns a scientific subject into a book you can hold: cloth boards, foil
title, curling paper, typeset text on the left page and a **3D pop-up figure** on
the right that stands up as the page lands, animates a seamless **5-second**
scientific loop, and can be rotated, dissected, layered, labelled and exported
as an SVG plate or colouring page. Everything is code: Three.js r186
`WebGPURenderer` with TSL node materials (WGSL on WebGPU, GLSL on the WebGL 2
fallback), Canvas 2D typesetting, plain ES modules, Vite.

Every book is **bilingual**: an English source edition and a Spanish edition,
switched in place from the reader's top bar or the library header
(*English · Español*) without losing the spread, the moment or the dissection.
Its **author** is foil-stamped on both boards and printed on the title page and
imprint, and its last leaf is **"How this book was made"**: the prompt that
started the series and the book's own brief, verbatim (translated, and labelled
so, in Spanish).

The working reference implementation is this repository: three books
(*Serpientes*, *Flores*, *Calaveras*) at `index.html#/en/` and `#/es/`. Read the
code before inventing anything — most problems you will meet are already solved there.

## Quick start

```bash
npm install
npx vite --port 5173 --host 127.0.0.1      # http://127.0.0.1:5173/#/en/  (library) · #/es/
npm test                                   # Node-only tests: the i18n core and Spanish hyphenation
```

| page | what it is for |
|---|---|
| `index.html#/<lang>/<book>?plate=N` | the reader, `<lang>` = `en` \| `es` (also `?spread=K&t=2.4&explode=0.6&layers=skeleton:1&labels=0&ui=0&style=engraving`); `#/` and `#/<book>` resolve the reader's language and rewrite the URL |
| `lab.html?type=<type>&params=<json>&t=&view=&lang=es` | figure workbench: one figure exactly as the book hosts it, labels and SVG key in that language |
| `typeset.html?book=<id>&lang=en\|es&page=all\|N` | every printed side of an edition, overflow and sideways-overflow report, hit regions |
| `book-test.html` | page-curl harness (freeze poses, step time) |
| `ui.html` / `ui.html?mode=3d` / `ui.html?lang=es` | UI overlay harness |
| `?gl=webgl` on any page (before the `#`) | force the WebGL 2 fallback |

## Making a new book — follow this order

1. **Plan the book** (`docs/books/<id>-plan.md`): 6–8 plates, one subject each,
   a figure `type` + `params` per plate, its layers (what can be peeled away),
   2–4 "look closer" structures (their label ids), and a one-sentence 5-second
   story. Pick a `theme` (cloth, foil, paper, accent, endpaper motif, style
   `lithograph` for colour plates or `engraving` for drawing books).
2. **Scaffold**:
   `node .claude/skills/lamina/scripts/new-book.mjs <id> --title "…" --subtitle "…" --subtitle-es "…"`
   creates the English manifest, its Spanish edition `src/books/es/<id>.js`, the
   registry entry and a brief stub; for a new kind of figure,
   `node .claude/skills/lamina/scripts/new-subject.mjs <type> [--dir <folder>]`
   creates the subject and its Spanish dictionary `src/i18n/es/<folder>.js`.
   Both produce working files (a placeholder book and a seed-pod figure) you replace.
3. **Research and write the English manifest** (`src/books/<id>.js`, the source
   edition) — schema and text budgets in [references/manifest.md](references/manifest.md),
   with `byline: { name, mark }` (the author) and, where the figure's pill differs
   from the humanised label id, a short `name` for the look-closer note. Then run the
   accuracy protocol in [references/accuracy.md](references/accuracy.md):
   author → two independent adversarial fact-checkers with different lenses →
   reviser who re-verifies each issue against primary sources. Never skip it:
   a beautiful plate with a wrong fact is a failure.
4. **Record how it was made**: the prompt the book was written from, verbatim, in
   `src/books/making/index.js` (`BRIEFS[id]`, with the document it is quoted from in
   `docs/prompts/`), and its faithful translation in `src/books/making/es.js`. The
   validator compares the English with the document character by character.
5. **Build the figures** — [references/figures.md](references/figures.md):
   author in centimetres at real scale, use the kits (`ink`, `patterns`, `tube`,
   `petal`, `sdf`), make `update(t)` a pure function of `t`
   ([references/motion.md](references/motion.md)), give every part an SVG colour,
   every label a canonical id, every layer a hint. Figure strings stay English in
   code; their Spanish goes in the subject's dictionary.
6. **Translate** — once the English is final: write `src/books/es/<id>.js` (a
   full-shape copy: same keys and list lengths, plates and look-closer rows in the
   same order, ids untouched, every reader-visible string in Spanish; see "The
   Spanish edition" in manifest.md) and every figure string in
   `src/i18n/es/<folder>.js` — label texts and details, layer names and hints, part
   and colour names, beats. A label that a look-closer note names gets **one**
   Spanish wording, used both as its pill and as the note's `name` (≤ 3 words,
   ≤ 110 px). Then the translation review (accuracy.md: two lenses — the same claim,
   number and structure; the right Spanish term), logged in
   `docs/books/<id>-es-notes.md`. An English edit made later carries its Spanish
   edit in the same pass.
7. **Typeset both editions** — open `typeset.html?book=<id>&lang=en` and `&lang=es`:
   no overflow, nothing sideways, no page below 90 % auto-fit, the same page
   sequence. `node scripts/validate-books.mjs <id> --lang all --fit` must pass.
8. **Verify like a reviewer, not an author** — [references/verify.md](references/verify.md):
   run the checks below on a build, then take screenshots on **both backends**,
   phone and desktop, **both languages** (and a switch on a plate), and *read
   every PNG*.
9. **Capture and document** — `node scripts/capture.mjs --book <id> --lang both`
   (run it against `vite build` + `vite preview`, see verify.md) →
   `docs/outputs/<lang>/<id>/`; write `docs/books/<id>.md` with the prompts used
   and the outputs produced.

### A bilingual book, file by file

| file | what goes in it |
|---|---|
| `src/books/<id>.js` | the English source edition: text, theme, `byline`, plates with figure specs and look-closer notes |
| `src/books/es/<id>.js` | the Spanish edition, composed over the English at run time: same shape, `locale: 'es'`, every look-closer `name` |
| `src/books/index.js` | `{ id, load, es: () => spanish('<id>') }` in `BOOKS` |
| `src/books/making/index.js` · `es.js` | `BRIEFS[<id>]`: the prompt the book was made from, verbatim (quoted from `docs/prompts/`), and its translation |
| `src/subjects/<folder>/` + `src/i18n/es/<folder>.js` | a new kind of figure, English strings in code, and their Spanish (registered in `src/i18n/es/index.js`) |
| `docs/books/<id>-research.md` · `<id>-es-notes.md` | sources and the fact-check log; the translation review's log (termbase: `docs/books/es-style.md`) |

### The checks, in order (each exits 1 on an error)

```bash
npm test                                                    # i18n core + Spanish hyphenation, no server
node scripts/validate-books.mjs <id> --lang all             # both editions, budgets, ids, making texts, dictionaries
LAMINA_URL=… node scripts/audit.mjs <id> --lang es --i18n --json .scratch/<id>-es.json   # figures, Spanish strings, pills
node scripts/validate-books.mjs <id> --lang es --runtime .scratch/<id>-es.json            # figure strings; run-in = pill
LAMINA_URL=… node scripts/audit.mjs <id> --webgl            # the fallback backend
LAMINA_URL=… node scripts/validate-books.mjs <id> --lang all --fit                       # both editions on the page
node scripts/i18n-strings.mjs --missing                     # no code string without Spanish
LAMINA_URL=… node scripts/capture.mjs --book <id> --lang both                            # outputs, switch, edition
```

`LAMINA_URL` is a build you serve yourself (`npx vite build && npx vite preview`);
the dev server reloads mid-run when files change.

For several books or subjects at once, run steps 3–8 as a multi-agent workflow:
one pipeline per book for content (and one for its translation), one agent per
figure subject, contracts and file ownership fixed up front.
[references/architecture.md](references/architecture.md) explains the module map
and how the original build and the bilingual edition were parallelised.

## Non-negotiables (and why)

- **Pure white stage.** Never set `scene.background`: WebGPURenderer tone-maps
  the clear colour, so `#fff` turns grey. The canvas clears transparent over a
  CSS `#fff` page; the contact shadow is a transparent analytic shadow.
- **`update(t, dt, state)` is a pure function of `t ∈ [0, 5)`.** It makes the
  loop seamless by construction, scrubbing exact and captures deterministic.
  Integer frequencies over 5 s; one-off events animate a copy that is restored
  before the seam.
- **Real scale, centimetres.** The host measures `bounds` (or the t = 0 box)
  and fits the figure into the page; never pre-scale to the page.
- **TSL only** (`three/tsl`), never `wgslFn`/`glslFn` — one shader must compile
  to WGSL *and* GLSL. Check every figure on `?gl=webgl`.
- **Ink look comes from the kit.** `ctx.ink()` materials, `ctx.outline()` hulls,
  `ctx.inkLine()` for guides. Do not re-implement hatching per subject: its tone
  thresholds are calibrated to the book's light rig (`calibrateInk`).
- **Canonical label ids** tie the figure (`labels[].id`) to the text
  (`lookCloser[].label`); a look-closer tap focuses that label and switches its
  layer on. Add new ids to the canonical list in `docs/architecture/CONTRACTS.md`
  §6 and `scripts/validate-books.mjs`.
- **Every visible part has a colour** (`parts[].color` or `svgColor`): the SVG
  exporter traces the ID buffer per part and fills it with that colour.
  Procedural patterns are not vectorised — split a pattern into parts if it
  matters in the SVG.
- **Text budgets are hard limits** (pages never overflow). Binomials in
  `*italics*`, real verifiable sources only, original wording only.
- **Code keeps English and translates at output.** Strings are dictionary keys:
  `t('Contents')` / `tl(lang, …)` only where text leaves for the screen, a canvas, an
  SVG or the a11y mirror; table literals marked `msg('Cover')`; never compare or
  branch on translated text; ids never translated; numbers through
  `fmtNumber`/`fmtSeconds`/`fmtPercent`. A page is typeset in *its edition's*
  language (`tl(page.book.locale, …)`), never the global one.
- **Both editions print the same book**: identical page sequence, folios and
  plates; every page ≥ 90 % auto-fit (making pages ≥ 25/26 of their size);
  nothing overflowing sideways. Spanish runs longer — fit is checked, not hoped for.
- **One structure, one name.** A label that a look-closer note names is the same
  structure on the page and on the figure: in Spanish its pill and the note's
  run-in are the same words. Everything a Spanish reader sees is Spanish — pages,
  chrome, pills, layer names, beats, toasts, the SVG key — except proper names,
  binomials and bibliographic entries.
- **Verbatim is verbatim.** The making leaf quotes the prompt and the brief exactly
  as written (checked character by character against `docs/prompts/`), ragged right
  and never hyphenated; the Spanish leaf prints faithful translations and says so.
- **The author is on the cover.** `byline.mark` is foil-stamped on both boards in
  the book's own foil and printed in its own colours on the title page and
  imprint; the library shows it because it shows the covers.
- **No per-frame allocation, dispose everything**, keep `update` under ~2 ms.
  Figures build asynchronously (workers for heavy meshing) behind a placeholder.
- **Accessible by default:** every gesture has a key, `prefers-reduced-motion`
  shortens turns and calms sway, labels and plate text are mirrored as HTML,
  `<html lang>` follows the edition, the switch is a real radio group.

## Gotchas that cost hours the first time

- `window.lab` is the `<canvas id="lab">` element (named access) until the lab
  module runs — wait for a non-DOM `window.lab.ready`. `scripts/shot.mjs` does.
- Vite's dev server reloads pages when *any* imported file changes; long
  headless captures die mid-run. Capture from `npx vite build && npx vite preview`.
- Manifest `animation.beats` are shown instead of the figure's own beats — time
  them to the code (read the figure's `seg()`/`openAt` constants), not to the plan.
- Pop-ups fold with `book.spreadOpening(leaf)`; the Book also hides anchors
  named `figure-anchor-<leaf>` on covered leaves. Keep those names.
- Hatching is planar contour slicing: concave sockets show rings — pass a
  `hatchCoord` that follows the form.
- Thin geometry (filaments under ~1 px at book zoom) must skip outlines or it
  turns black.
- A label anchor must be an `Object3D` inside `figure.root` that moves with the
  animation; anchors hidden by a layer must declare that `layer`. A head label
  marks its feature with a ring or a tick (`mark`, `size`), never a dot on the eye.
- Large reference books: the typesetter loads only the font faces a theme uses;
  call `loadFonts(theme, { manifest })` so Latin Extended faces load when needed.
- **Spanish runs ≈ 10 % longer**, more on prose-dense pages: the drawing book's
  lesson versos needed room made in the layout *before* translation. `--fit` is the
  binding check; word budgets × 1.25 are only a hint.
- **Single lines overflow sideways**, which auto-fit (vertical) never sees: kickers,
  status chips, running heads, the figure meta line. `renderPage().hOverflow` and
  `validate --fit` catch them.
- **Regexes and accents**: `\b` and `\w` are ASCII-only even with `u` — "crían"
  splits at the *í*. Use `\p{L}` with the `u` flag and look-arounds.
- **Patterns** (`PATTERNS` in a dictionary, for strings built at run time such as
  `Rattle segment {n}`) need a literal word of ≥ 3 letters, or they match anything.
- **A switch replaces the history entry** (no Back-button language toggling) and
  links carry their language; scripts and docs always write `#/en/…` or `#/es/…`,
  so a stored preference never flips a capture.
- **`commonAlt` carries the other language**: the English edition's alternative is
  the Spanish name and vice versa; Costa Rican common names stay in both.
- **U+202F (narrow no-break space) is in no book font** although the font ranges
  claim it: formatters and translators use U+00A0 (`85 %`, `12 000`).
- The edition loader attaches English back-references (`en(node)`) as a symbol:
  `structuredClone`, `JSON` and spreads drop them, so style decisions made from words
  (how-to icons, the warning badge, binomial italics) must read `en(node)` from the
  composed edition itself.
- Book discovery goes through the registry (`BOOKS` in `src/books/index.js`):
  `src/books/es/` and `src/books/making/` are not books.
- **Translations drift.** A Spanish file written from a snapshot misses later
  English edits (a source added, a colophon trimmed), and index-aligned lists then
  print the wrong lines. Log every English edit made after the snapshot and sync it;
  `validate-books --lang es` reports list lengths, missing text and numbers that
  no longer match.
- **A pose can make a label lie**: a boa's tongue, kept in while its jaws hold the
  rat, left the "Forked tongue" dot on the rat's fur. Leave a label out of the poses
  that withdraw its feature (or hide its anchor while the feature is gone), and look
  at every plate's labels at every beat.

## Bootstrapping elsewhere

`node .claude/skills/lamina/scripts/bootstrap.mjs <target-dir> [--with-books] [--author "Name"]`
copies the engine, kits, app, i18n runtime and dictionaries, pages, scripts and
this skill into a new project — without the three books (a bilingual starter book
on the demo figure, with its making texts) unless `--with-books` — ready for
`npm install`.

## Files in this skill

- `references/architecture.md` — module map, data flow, languages, APIs, how the builds were parallelised
- `references/manifest.md` — book schema, the Spanish edition, page order, text budgets, canonical ids
- `references/figures.md` — figure contract, kits, strings, building and tuning a subject
- `references/motion.md` — the seamless 5-second loop
- `references/design.md` — stage, page, author mark, making leaf, language switch, figure and interface style
- `references/accuracy.md` — research → adversarial fact-check → revise; the translation review
- `references/verify.md` — tools, QA checklist in both languages, capture
- `templates/book.js`, `templates/book.es.js`, `templates/subject/index.js`, `templates/subject/es.js` — starting points (used by the scripts)
- `scripts/new-book.mjs`, `scripts/new-subject.mjs`, `scripts/bootstrap.mjs` (+ `scripts/i18n-domain.mjs`, shared)
- `evals/evals.json` — prompts for testing the skill
