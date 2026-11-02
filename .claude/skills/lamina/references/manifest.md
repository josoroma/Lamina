# The book manifest (`src/books/<id>.js`)

A book is data. The typesetter prints every side from it, the reader mounts
figures from it, the validator checks it. The manifest in `src/books/` is the
**English source edition**; its Spanish edition lives in `src/books/es/<id>.js`
(below). Register new books in `src/books/index.js` (`new-book.mjs` does this,
with the Spanish loader and a brief stub):

```js
export const BOOKS = [
  { id: 'serpientes', load: () => import('./serpientes.js'), es: () => spanish('serpientes') },
];
export const MAKING = { en: () => import('./making/index.js'), es: () => import('./making/es.js') };
```

`spanish(id)` resolves `{ default: null, missing: true }` while `src/books/es/<id>.js`
does not exist yet, so the Spanish reader shows the English pages under Spanish chrome
instead of failing; a syntax error inside the file still fails loudly. The registry is
the list of books: scripts never glob `src/books/` (`es/` and `making/` hold no books).

```js
export default {
  id: 'serpientes',                         // route: index.html#/<lang>/serpientes — never a two-letter code
  title: 'Serpientes',
  subtitle: 'A Living Atlas of Costa Rican Snakes',
  kicker: 'Lámina · Volume I',              // small caps above the title
  author: 'Lámina Natural History Press',    // the imprint line — a fictional publisher, never a real one
  byline: { name: 'Josoroma', mark: 'josoroma' }, // the author: name + a wordmark in AUTHOR_MARKS (or mark: null)
  edition: 'First edition, 2026',            // a year becomes a roman numeral on the title page
  locale: 'en',                              // the source edition is English
  theme: {
    style: 'lithograph',                     // 'lithograph' (colour plates) | 'engraving' (drawing books)
    cloth: '#1f3a2b', foil: '#c9a44c',       // boards + foil stamping (title and author mark; foil glints in 3D)
    paper: '#fbf8f1', ink: '#1c1a17', accent: '#8b2a24', muted: '#7b7466',
    endpaper: { motif: 'scales', color: '#1f3a2b', ground: '#efe7d6' }, // scales | leaves | grid | (lozenge)
    fonts: { display: 'Cormorant Garamond', body: 'EB Garamond', label: 'IBM Plex Sans Condensed', mono: 'IBM Plex Mono' },
    // engraving books may add fonts.condensed: 'Oswald' (vertical lesson titles)
  },
  blurb: 'Back-cover paragraph.',            // optional, ≤ 139 characters (falls back to intro.pullQuote / subtitle)
  imprint: ['…'], credits: ['…'],            // imprint page lines
  intro: { title, paragraphs: ['…'], pullQuote: '…' },   // the page adds the pull quote's quotation marks
  howTo: { title, items: [['Drag a page corner', 'Turn the page'], …] },  // icons are chosen from the English wording
  plates: [Plate, …],                        // 6–8
  back: { note: { title, paragraphs }, glossary: [[term, definition], …], sources: ['…'], colophon: ['…'] },
};
```

`author` stays the imprint string (CONTRACTS §6); the person is `byline`. With a
`mark`, the typesetter draws the wordmark from its path data
(`src/engine/typeset/marks.js`, generated from and checked against
`public/author/<mark>.svg`): foil-stamped on the front board under the medallion
and on the back board above the imprint line, in the book's own foil, and in its
own colours on the title page (under a small-caps "by") and the imprint (under
"Author"). Screen readers get "by Josoroma" / "por Josoroma".

## Plate

```js
{
  id: 'terciopelo', number: 'I', layout: 'plate',         // 'plate' | 'lesson'
  common: 'Terciopelo', commonAlt: 'Fer-de-lance',
  scientific: 'Bothrops asper', authority: '(Garman, 1883)',
  family: 'Viperidae · Crotalinae',
  status: { code: 'LC', label: 'Least Concern', source: 'IUCN Red List 2021' },  // or null
  badge: 'Venomous — dangerous',                         // optional chip
  lede: 'One sentence that makes a reader turn the page.',
  body: ['paragraph', 'paragraph'],                      // *italic* binomials, **bold**
  facts: [['Length', '1.2–1.8 m; to 2.5 m'], …],
  lookCloser: [{ label: 'loreal-pit', text: 'Between eye and nostril…' }, …],  // + name: '…' where the pill differs
  didYouKnow: 'One surprising, verified fact.',
  figure: { type: 'snake', params: { species: 'bothrops-asper', pose: 'strike' },
            caption: 'Fig. 1 — …', scaleNote: 'Adult, about 1.5 m' },
  animation: { title: 'The strike', beats: [[0, '…'], [1.6, '…'], [3.2, '…']] },
  sources: ['Sasa, Bonilla & Chaves 2019 (ICP)', …],
  // lesson-only (drawing books):
  lesson: { steps: [{ title, text }, ×3], proTip, mistakes: ['…'], proportions: ['…'] },
}
```

`lookCloser[].name` is the note's printed run-in (≤ 3 words, in both languages). It
is optional in English — the label id, humanised ("LOREAL PIT"), is printed instead —
and **required in a translation**. Write it when the humanised id is not what the
figure's pill says (`nasal-aperture` vs the pill "Piriform aperture"). In the Spanish
edition the run-in and the pill are **the same words**: the `name` is exactly the
Spanish of the figure label's text (the subject's dictionary), e.g. the pill
*Piriform aperture* → `'Abertura piriforme'` in both `src/i18n/es/skulls.js` and the
note. Decide that wording once, ≤ 3 words and ≤ 110 px as a pill;
`validate-books.mjs --lang es --runtime <audit json>` lists every pair that differs.

Lesson pages print three construction panels drawn by the figure module's
`drawStep(g, params, step, box, theme)`. The step texts must describe *what the
panels show*: write them after looking at the panels.

## Text budgets (hard limits — pages never overflow)

| field | budget |
|---|---|
| lede | ≤ 25 words |
| body | 120–220 words total |
| facts | 4–6 rows, values ≤ 6 words |
| lookCloser | 2–4 notes, label ids that the figure really creates; `name` ≤ 3 words |
| didYouKnow | ≤ 40 words |
| lesson | exactly 3 steps (title ≤ 5 words, text ≤ 40), proTip ≤ 45, mistakes 2–3 and proportions 2–4 (≤ 18 words each) |
| intro | ≤ 260 words · note ≤ 220 · glossary 8–14 terms · sources 5–20 |
| beats | 3–5, strictly increasing `t ∈ [0, 5)`, timed to the figure's motion |

`node scripts/validate-books.mjs <id>` enforces all of these plus canonical
label ids; `typeset.html?book=<id>&lang=en|es` shows the real fit (pages
auto-fit down to 85 % and warn `[typeset] overflow` beyond that — aim for
≥ 90 %, and leave room: the Spanish edition must fit the same page). Word counts
do not transfer between languages; `--fit` is the binding check for both.

## Page order (leaves; side `2i` = front/recto of leaf i, `2i+1` = back/verso)

```
leaf 0 (front board): cover | front endpaper
leaf 1: title page | imprint
leaf 2: contents | introduction
leaf 3: how to use | plate 1 text
leaf 3+k: plate k figure | plate k+1 text   (k = 1…N; the last verso is back.note)
then: sources & colophon | glossary
then: making · the prompt | making · this book's brief
back board: back endpaper | back cover
```

Plate k shows at `Book.opened = k + 3`; `leafCount = plates + 7`. The last spreads
are `[note | sources]`, `[glossary | making·prompt]`, `[making·brief | back endpaper]`:
the book's brief is its last page. Find them by name (`lamina.spreadOf('glossary')`,
`spreadOf('making', 'brief')`), never by counting back from the end. Both editions
have exactly this sequence.

## "How this book was made" (`src/books/making/`)

```js
// src/books/making/index.js — English originals, verbatim; making/es.js: same exports, translated
export const LANG = 'en';                    // es.js: 'es' and TRANSLATED_FROM = 'en'
export const MODEL = 'Claude Code (Opus 5.5)';
export const PROMPT = {                      // the prompt that started the series (recto)
  source: 'docs/prompts/00-original-brief.md',   // its "## Prompt (verbatim)" quote, "> " stripped
  lines: ['Claude Skill: …', '', '* https://…', …],  // one entry per line; "* " lines are bullets
  title: 0, headings: [10, 18, 25, 28],      // indices into lines
};
export const BRIEFS = {                      // each book's brief (its last page)
  serpientes: { source: 'docs/prompts/02-build-workflow.js', text: '"Serpientes — A Living Atlas of …' },
};
export const LATER = { source: 'docs/prompts/', text: 'Later prompts reshaped the books: …' };  // one closing line
```

Registered as `MAKING = { en: () => import('./making/index.js'), es: () => import('./making/es.js') }`
in `src/books/index.js`; the edition loader attaches `edition.making` per book.
**Verbatim means verbatim**: typos, straight quotes and arrows stay; the validator
compares `PROMPT.lines` with the quoted block and each `BRIEFS[id].text` with its
source (a workflow's `books[].brief`, or a quote in a `.md` file). The Spanish file
keeps the line count, the blank and bullet lines at the same indices and every URL;
the Spanish leaf labels the texts as translations of the English originals. Both
editions set these texts ragged right and never hyphenate them: words, binomials,
URLs, file names and code tokens stay whole (the typesetter binds Latin names and
"p. ej." with no-break spaces). The text is never parsed as markup: an asterisk
prints as written, a binomial in roman.

## The Spanish edition (`src/books/es/<id>.js`)

A full-shape copy of the English manifest: same keys, same list lengths, every
reader-visible string translated, `locale: 'es'`. The reader **composes** it over
the English (`src/i18n/edition.js`), walking the key set in `src/i18n/schema.js`:

| kind | fields | rule |
|---|---|---|
| ID | `id`, `byline`, `theme`, plate `id` `number` `layout`, `status.code`, `lookCloser[].label`, `figure.type` `params` `style` `keyTime`, beat times | never translated: always taken from English (may be copied, never changed) |
| TEXT | `subtitle`, `kicker`, `edition`, `blurb`, `imprint[]`, `credits[]`, intro, how-to rows, `badge`, `lede`, `body[]`, `facts[][]`, `lookCloser[].name` and `.text`, `didYouKnow`, figure `caption` `scaleNote` `instruction`, `animation.title` and beat texts, `status.label`, lesson texts, note, glossary, colophon | translated (an identical value is an error when it reads as English) |
| SAME | `title`, `author`, `common`, `commonAlt`, `authority`, `status.source`, `sources[]` | may stay identical (names, citations); translate only connective words |
| SCI | `scientific` | identical only when the plate has an `authority` (a real binomial); Calaveras' "Cranium & mandible" is translated |
| TAXON | `family` | identical only when every part (split on `·` and `,`) is a taxon (`-idae -inae -oidea -ini -aceae -oideae -eae -ales -formes`) |

- Plates are matched by `id` and look-closer notes by `label`: keep both. Order comes from English.
- A key the schema does not declare is an error in English (declare it in
  `src/i18n/schema.js` as text or id) and copied from English meanwhile.
- A missing text shows the English (never a blank) and is reported; until a file
  exists at all, the Spanish reader shows the English pages under Spanish chrome.
- `commonAlt` gives the *other* language: Spanish lessons say `common: 'Vista frontal',
  commonAlt: 'Frontal view'`; snakes and flowers keep the Costa Rican `common` and the
  English `commonAlt` in both editions.
- `status.label` uses the nine official UICN categories with the UICN's own capitals
  (*Preocupación Menor*, *Casi Amenazado*, *En Peligro Crítico*…; the codes stay).
- The translators' guide and termbase is `docs/books/es-style.md` (register, feminine
  snake names as the ICP writes them, anatomical terms, the IUCN list, fitting
  techniques); where it and the design disagree, it wins.
- Glossary rows stay index-aligned with English; the typesetter sorts each edition
  in its own collation (`Intl.Collator('es')`).
- Typography: «…» then “…”; `¿…?`, `¡…!`; decimal comma (`1,2–1,8 m`, `2,4 s` — a
  deliberate Costa Rica / CLDR `es-CR` choice); no grouping under 10 000 (`1500 m`),
  a no-break space above (`12 000`); `85 %` with a no-break space (U+00A0, never
  U+202F); titles capitalise only the first word; binomials identical and in *italics*.
- Style decisions made from words (how-to icons, the warning badge, binomial italics)
  read the English through `en(node)`, so both editions are styled identically.

`node scripts/validate-books.mjs <id> --lang es` checks the composition report
(missing, extra, changed ids, list lengths, unknown keys), untranslated text,
English left in Spanish, binomial italics, numbers (locale-aware: `1,500` = `1500`,
`1.5` = `1,5`; errors in facts, scale notes and status sources), typography,
budgets × 1.25, the making texts and the dictionaries; `--runtime <audit json>` adds
the figure strings and the run-in = pill check; `--fit` typesets it.

## Canonical label ids

Figure `labels[].id` ↔ manifest `lookCloser[].label`. The current lists live in
`docs/architecture/CONTRACTS.md` §6 and `scripts/validate-books.mjs`
(`CANONICAL`): snakes (`head eye tongue ventral-scutes cloaca vertebrae ribs`,
pit vipers `loreal-pit fangs venom-gland keeled-scales`, …), flowers per genus
(`sepal petal labellum column …`), skulls (`frontal parietal … temporalis masseter`,
jaguar `sagittal-crest canine carnassial …`). When you add a subject, add its
ids to both places in the same change. Ids are never translated; the pill text is.

## Writing style

- Encyclopaedic, warm, exact. One idea per sentence. No hype words.
- Units: SI with a non-breaking space (`1,500 m` in English; `1500 m`, `12 000`,
  `1,2–1,8 m` in Spanish); ranges with an en dash.
- Spanish common names are kept (the books are Costa Rican); the other language's name in `commonAlt`.
- Spanish text reads as Costa Rican Spanish written for a museum: *usted* for every
  instruction (impersonal *se* where natural), no voseo or tuteo; the interface's own
  copy (dictionaries) uses infinitives and nouns. Translate to fit: no fact, number,
  hedge or source is dropped to save a line.
- Safety-critical topics (venom, poisonous plants) state the medical fact plainly
  ("antivenom is the specific treatment; no tourniquets, cuts, suction or ice") —
  in both languages, checked by the translation review.
- Every claim traceable to `sources` (short refs) and the research dossier
  `docs/books/<id>-research.md` (full refs + URLs + open questions + fact-check log).
