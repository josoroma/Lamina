# Verify: look at it like a reviewer

Nothing is done until you have **seen** it on both backends, on a phone and on
a desktop, **in both languages**, and read every screenshot you took. TSL errors
only appear when a shader is built, so `node --check` proves almost nothing.

## Tools

| command | what it does |
|---|---|
| `npm test` | the Node-only tests, no server, in seconds: `npm run test:i18n` and `npm run test:hyphen-es` below. Run it after touching `src/i18n/` or the typesetter's hyphenation. |
| `npm run test:i18n` (`node scripts/i18n-core-test.mjs [--verbose]`) | the i18n core's acceptance test: language state and preference, lookups (exact keys, patterns, fallback, placeholders) against a fixture dictionary, the formatters (`2,4 s`, `85 %`, never U+202F), the schema predicates, `composeEdition` on every book and on broken translations, `composeMaking`, loading; it also *reports* (without judging) each Spanish edition's composition and the real dictionaries' size and problems. |
| `npm run test:hyphen-es` (`node scripts/hyphen-es-test.mjs [--verbose]`) | Spanish hyphenation: 53 reviewed vectors (`ser-pien-te`, `ca-rre-te-ra`, `in-hu-mano`, `go-bierno`…) plus a soft hyphen, and every lowercase word of the Spanish editions, the Spanish making texts and the typesetter's dictionary hyphenated and checked against the rules (two letters each side, vowels never split, `ch ll rr qu gu` whole, never before an *h* or the letter before it, no lone *-no*). |
| `node scripts/shot.mjs "<path?query#route>" .scratch/x.png [--w 1440 --h 900 --wait 1500 --eval "<js>" --ready "<expr>" --dpr 1 --webgl]` | headless Chrome (WebGPU; `--webgl` forces the fallback by adding `gl=webgl` to the query, before the `#`). Waits for the page's readiness promise, prints console errors. Routes name their language: `"index.html#/es/serpientes?plate=3"`. Then **Read the PNG**. |
| `node scripts/validate-books.mjs [id …] [--lang en\|es\|all] [--fit] [--json out.json] [--runtime audit.json]` | English (default): schema coverage (`src/i18n/schema.js`), text budgets, canonical label ids, beats, lesson shape, byline, the making texts verbatim against `docs/prompts/`, `marks.js` against `public/author/<mark>.svg`. `--lang es`: each Spanish edition composed over its English (missing/extra keys, changed ids, untranslated text, English residue, binomials, numbers, typography, budgets × 1.25), the Spanish making texts, the dictionaries; with `--runtime` (an audit's `--json`) also every figure string in the dictionaries and every look-closer run-in equal to its label's Spanish pill. `--fit`: every side of each edition in `typeset.html` (needs a server, `LAMINA_URL`) — overflow, sideways overflow, pages < 90 % (making < 25/26), and the two editions' page sequence. |
| `node scripts/audit.mjs [id …] [--webgl] [--lang en\|es] [--i18n] [--json out.json]` | every plate figure in the lab: seam (pose at t = 0 vs t → 5), `update` cost, ≥ 2 layers, look-closer ids exist, label marks well formed, console errors. `--lang es` runs the lab in Spanish; `--i18n` checks every figure string (labels, details, layers, hints, parts, colour and SVG names, beats) against the Spanish dictionaries and measures every Spanish label pill (≤ 110 px at 12.5 px in the UI font). `--json` carries the strings for the next two commands. |
| `node scripts/i18n-strings.mjs [--lang es] [--missing] [--list] [--runtime audit.json] [--json out.json]` | the keys the code sends through `t()`/`tl()`/`msg()` (parsed with Vite's parser) and the dictionaries' `PATTERNS`; `--missing` lists what the dictionary lacks, grouped by the file that must hold it (exit 1 when any); `--runtime` adds the figure strings an audit extracted. `npm run i18n`. |
| `node scripts/capture.mjs [--book id] [--lang en\|es\|both] [--out docs/outputs] [--no-svg] [--webgl] [--w --h --t]` | library, cover, title, contents, intro, every plate, the back matter and the making leaf, a mid-turn frame, explode + labels, reader chrome (with the switch), phone, colour + line SVGs of every figure; in Spanish also the switch on a plate (Spanish → English, same spread), `lamina.i18nMissing()` must be empty and `lamina.editionReport()` complete (no fallback, nothing missing, no list of another length). Exit 1 on console errors, untranslated strings, an incomplete edition or a switch that lost its place. |
| `node scripts/export-svg.mjs "<lab query>" out.svg [--mode color\|line] [--png out.png]` | one figure's SVG plate / colouring page (add `&lang=es` to the query for a Spanish key) |
| `typeset.html?book=<id>&lang=en\|es&page=all&hits=1` | every printed side of an edition; `window.typeset.ready` → `{ manifest, sides, results: [{ scale, overflow, hOverflow, hits }], overflow }` |
| `book-test.html` | page-curl harness; `window.bookTest` freezes poses and steps time |
| `lab.html?…&bounds=1&lang=es` | figure + its fit box; `window.lab.info()` lists layers, labels, parts and `strings` (the figure's English strings), `missing` (those the lab's language lacks) |
| `ui.html?lang=es` | the UI overlay harness in Spanish |

`window.lamina` (reader) is scriptable: `await lamina.plate(3); lamina.setTime(2.4);
await lamina.settle(500); lamina.info()`; `await lamina.setLang('es')` switches in
place; `lamina.spreadOf('making', 'brief')` finds a spread by name — see `architecture.md`.

### Capture from a build, not the dev server

The dev server reloads pages whenever an imported file changes, which kills
long captures (and agents editing in parallel change files all the time):

```bash
npx vite build && npx vite preview --port 4173 --host 127.0.0.1 &
LAMINA_URL=http://127.0.0.1:4173 node scripts/capture.mjs --lang both --out docs/outputs
```

Without `--lang` the capture is English in the historical layout (`docs/outputs/<id>/`);
with `--lang en|es|both` each language gets its own folder (`docs/outputs/en/…`,
`docs/outputs/es/…`). `both` doubles the run. When several agents share one machine,
each builds and serves its own copy (`npx vite build --outDir .scratch/<me>/dist`,
`npx vite preview --outDir .scratch/<me>/dist --port <mine>`).

### Release checks, in order

```bash
npm test                                                           # i18n core + Spanish hyphenation (Node only)
node scripts/validate-books.mjs --lang all                         # content, editions, making, marks, dictionaries
LAMINA_URL=… node scripts/audit.mjs --lang es --i18n --json .scratch/audit-es.json   # figures + their Spanish
LAMINA_URL=… node scripts/audit.mjs --webgl                        # the fallback backend
node scripts/validate-books.mjs --lang es --runtime .scratch/audit-es.json           # figure strings, run-ins = pills
LAMINA_URL=… node scripts/validate-books.mjs --lang all --fit      # both editions on the page
node scripts/i18n-strings.mjs --missing                            # nothing left in code
LAMINA_URL=… node scripts/capture.mjs --lang both                  # outputs, switch, i18nMissing(), editionReport()
```

`LAMINA_URL=…` is the build you serve (above). Every command exits 1 on an error, so the list
runs as a gate; read the warnings anyway.

## QA checklist (per spread, in each language)

**Stage** — background exactly `#ffffff` outside the book (sample a corner);
contact shadow tight and soft; no grey haze; book ~95 % of the width on
landscape, one page on portrait; nothing (pop-up, label, toolbar) clipped; the
beat caption and toolbar sit on white *below* the book's tail edge (the UI's
`bottomReserve()` goes to `rig.setInsets`), also on tall-figure plates, tablets
and with the chrome kept awake (touch, reduced motion).

**Pages** — no overflow, nothing running past its measure sideways (`hOverflow`
empty), no page under ~90 % auto-fit and no making page under 25/26; running heads,
folios and plate numbers right; italics on binomials; hit regions line up (contents
rows, look-closer notes); recto ground ellipse sits under the figure. On a portrait
phone and tablet every printed page (intro, imprint, afterword, glossary, the making
leaf) can be reached and read — on the page and in the Read sheet.

**Author and making** — the wordmark is foil-stamped on the front board under the
medallion and on the back board, in the book's foil (gold or silver), crisp at 2048 px
and on the library shelf; in its own colours (pink letters, blue final *a*) under
"by"/"por" on the title page and under "Author"/"Autor" on the imprint. The last two
text pages are the prompt (facing the glossary) and the book's brief (facing the back
endpaper), set no smaller than 25 px, ragged right and unhyphenated in both languages
(no binomial, URL, file name or code token broken across lines); in Spanish both say
they are translations of the English originals; `End` lands on the brief.

**Languages** — the switch (*English · Español*) is in the reader's top bar and the
library header, a radio group: Tab lands on the checked option, ←/→ move and check
without turning a page, Space checks, focus stays; 44 px targets on touch. A switch
on a plate keeps the spread, the moment, layers, explode, labels and inspect; the
visible pages change in the next frame with no blank page; `<html lang>`, the title
and the URL (`#/<lang>/…`) follow; Back does not toggle the language. In Spanish no
English is left in the chrome, the toasts, the Read sheet, the screen-reader mirror, the
pills, layer names and hints, beats, captions or the SVG key (`lamina.i18nMissing()`
empty after a read-through) — only proper names, binomials and bibliographic entries
stay as written; `lamina.editionReport()` is complete (no fallback, nothing missing);
label pills are whole (no ellipsis) on 320–390 px phones, and a pill whose label has a
look-closer note reads exactly like the note's run-in; numbers read `2,4 s`, `85 %`;
the glossary is in Spanish order. Library: `#/es/` shows a Spanish shelf, the hint and
captions rewrap and the bands are measured again.

**Figure** — reads as its species/structure at book zoom *and* in inspect
mode (inspect must really come closer, ≥ 1.3×, on phones too); proportions and
counts right; outlines crisp (no black blobs on thin parts); hatching only
where shade is (lithograph), never moiré or bullseye rings; layers each change
something visible and switching one off never leaves parts floating (eyes,
tongue, fangs belong to the skin); explode reads as a dissection *from the
reader's camera*, not just in the lab; labels point at the right structure,
agree with the verso text, and don't pile up.

**Labels** — never on the figure and never covering their own anchors (a head label
draws a ring around an eye, pit or nostril, or stops short of it with a tick — no
dot, no white halo on the face; on a head under 40 px every face mark is a tick, and
one face label shows, two under 80 px); never pointing at something they do not name
(a tongue retracted during a bite has no label on the prey's fur); every pill inside
the viewport, in inspect too, on a 390 px phone; stable through the loop (no side
flips, no pills sliding through each other); a label whose anchor is hidden or behind
the figure is shown (hollow) only if the reader asked for it (focused, a look-closer
note, a layer they switched on); labels of a structure that is dissolved in the
current construction stage are gated off; phones keep the look-closer labels when
they cap.

**Motion** — scrub 0 → 5 s in the lab: no pop at the seam, beats match what is
on screen at their times (never narrate a motion the loop does not perform),
nothing interpenetrates (coils, petals, jaw, a bill that must enter its
flower), props sit on the paper rather than float.

**Interaction** — click/drag/flick/swipe/keys turn pages; drag on the figure
rotates; double-click inspects; wheel/pinch zooms; zoomed in, a drag pans and
never turns; on portrait a swipe back works; Esc resets; contents drawer
jumps; layer / explode / labels / time controls work; export downloads valid
SVGs (open them); reduced motion turns are instant cuts; keyboard alone can
reach everything (including turning the figure).

**Export** — open every colour SVG and colouring page: skin patterns and
named colours survive, translucent overlays (wing blur, water) are left out,
overlaps inside one part are inked, outlines are closed, the key never cuts a
word and keeps occluded look-closer labels, colour and line pages share one
frame, construction-stage exports fall back to the key pose. A Spanish plate has
a Spanish key and part tooltips, `xml:lang="es"`, and its name ends in `-es`
(`…-color-es.svg`, `…-lineal-es.svg`).

**Performance** — no frame over ~35 ms when a turn lands on a plate (warm the
neighbours' shaders); no long task over 50 ms during a language switch on a
desktop (the first switch to Spanish is the dearest: cold text measurements); GPU-process
memory stays flat over a full read-through and over library ↔ reader cycles (page
canvases freed after upload); label occlusion stays inside its budget on dense meshes;
a lost GPU device reloads the page where the reader was; each route downloads only the
font subsets its faces actually set.

**Backends, sizes and languages** — WebGPU and `?gl=webgl`; 1600×1000, 1440×900,
390×844 (phone), 768×1024 (tablet), 844×390 (landscape phone); `#/en/` and `#/es/`.
No console errors.

**Science** — after any figure or text change, re-run the fact-check lens that
covers it (see `accuracy.md`); figure label `detail`s are claims too, and so
are the construction panels: they must match the 3D figure and the steps. A changed
English text needs its Spanish changed in the same pass (and the translation lens).

## Common failures and fixes

| symptom | cause → fix |
|---|---|
| grey background | `scene.background` set or opaque clear → transparent clear over CSS white |
| figure pokes through pages | anchor not named `figure-anchor-<leaf>` or fold not driven by `spreadOpening` |
| black band through an open shell | inverted-hull outline on a single-sided open surface → `side: DoubleSide` or no outline |
| concentric rings in shade | planar contour hatching on a concave form → pass `hatchCoord` |
| pop at the loop seam | something integrates `dt` or uses a non-integer frequency → make it a function of `t` |
| captions out of sync | manifest beats not timed to the code → read the figure's timing constants |
| headless capture dies | dev-server reload → capture from `vite preview` |
| `window.lab` is a canvas | named access before the module ran → wait for a non-DOM `window.lab.ready` |
| caption lies on the book's tail edge | fit ignores the UI bands → `rig.setInsets({ top, bottom })` from `ui.bottomReserve()`; frame spread and pop-up as separate parts (`setFitBox(box, [spread, figure])`) so tall figures don't shrink the book |
| labels name bones that aren't drawn | anchors of dissolved or occluded structures stay listed → gate rig labels by their reveal uniform; hide occluded labels the reader didn't ask for |
| eyes, tongue or fangs float with the skin off | head parts on no layer → put them on `skin` (fangs on skin ∪ skeleton ∪ venom) |
| SVG plate is one flat colour per part | the ID pass only knew mesh ids → shade pass reads the material's albedo; declare `parts[].swatches` for exact named colours |
| a one-frame freeze when a turn lands on a plate | pop-up shaders compile on first draw → `renderer.compileAsync` the hidden neighbour figures, one object per frame |
| GPU memory grows with every page and visit | page canvases kept after upload → `renderer.initTexture`, then shrink the canvas to 1 × 1; dispose evicted pages |
| inspect barely magnifies | a fixed dolly → frame the figure's projected loop box with a probe camera |
| English words in the Spanish chrome or pages | a key missing from `src/i18n/es/<domain>.js`, or a table literal not marked `msg()` → `node scripts/i18n-strings.mjs --missing`; `lamina.i18nMissing()` names what was shown |
| `missingKeys()` lists Spanish words ("Columna") | an edition's already-translated text passed through `t()` again → translate only English fallbacks (a humanised label id), never edition text |
| a Spanish label pill ends in "…" | the translation is wider than the pill → shorten it to ≤ 110 px (`audit.mjs --i18n` measures it) |
| a Spanish page overflows, or fits only at 85 % | Spanish runs longer → copy-fit the translation (no fact dropped) or make room in the layout for both editions; `validate --fit` shows each page's scale in both |
| a kicker or chip runs into the margin | a single line wider than its measure (auto-fit only shrinks vertically) → `P.lineFit` shrinks it, `hOverflow` reports it |
| an accented capital disappears from a drop cap ("Árboles" → "RBOLES") | `\W`/`\w` are ASCII-only → `[^\p{L}\p{N}]`, `\p{L}` with the `u` flag |
| a Spanish string shows a box or a fallback glyph | U+202F, or a character outside the loaded subsets → U+00A0; let `loadFonts(theme, { manifest })` survey the edition |
| `[object Object]` on a cover or title page | a person stored in `author` → `author` is the imprint string; the person is `byline` |
| Back after a switch shows the old language | a `pushState`/hash assignment for the switch → `replaceHash(withLang(hash, lang))` (route.js: `replaceState`, keeping `history.state`) |
| the arrows on the language switch turn the page | the reader's window `keydown` saw them → the switch `preventDefault()`s its keys; the reader skips `[role=radiogroup]` |
| a capture lands on the wrong back-matter spread | spreads counted back from the end (the making leaf moved them) → `lamina.spreadOf(layout, part)` |
| the Spanish "Look closer" run-in and the figure's pill name a structure differently | the note's `name` and the label's dictionary entry were translated apart → one wording for both, ≤ 3 words and ≤ 110 px; `validate-books --lang es --runtime` lists every pair that differs |
| "Crotalus si-/mus" or "ca-/nonical" on the making leaf | a verbatim text set justified and hyphenated → `paragraph(…, { align: 'left', hyphenate: false, wholeWords: true })`; bind names with U+00A0 |
| a word breaks badly in Spanish ("pro-hi-bir", "gobier-/no") | a rule in `hyphen-es.js` → add the word to the vectors in `scripts/hyphen-es-test.mjs`, fix the rule (or the module's exceptions), `npm run test:hyphen-es` |
| a label's dot or SVG callout lands on the prey | the pose withdraws the feature (a tongue kept in during a bite) but the label stays, or the anchor sits where the prey covers the animal → leave the label out of that pose (or hide its anchor while the feature is gone, `anchor.visible = false`), and move the anchor to where the animal's own surface shows |
