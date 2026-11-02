# Accuracy: research, write, then try to refute yourself

A Lámina book is a reference work. Beautiful but wrong is a failure. Content goes
through a three-stage protocol, ideally run as a Claude Code workflow (one pipeline per book),
and its Spanish edition through a fourth (translate, then review with two lenses).

## 1 · Research & write (one author agent per book)

- Sources, in rough order of trust: IUCN Red List, The Reptile Database, Plants of the
  World Online (POWO), Tropicos, Missouri Botanical Garden, national institutions
  (for Costa Rica: Instituto Clodomiro Picado/UCR, Museo Nacional, SINAC/MINAE),
  peer-reviewed papers, standard monographs (e.g. Savage 2002 for CR herpetofauna),
  anatomy texts for skeletal work.
- Every number gets a source. Prefer conservative ranges ("1.2–1.8 m, rarely more")
  over single values. Never invent precision.
- Use current taxonomy and mention well-known synonyms (*Palicourea elata*, syn.
  *Psychotria elata*).
- Write `docs/books/<id>-research.md`: per plate, facts + URLs + open questions. Return
  a **claims list** (claim → source) with the manifest.

## 2 · Adversarial fact-check (≥ 2 independent checkers, different lenses)

Each checker gets the manifest + claims and is told to **refute**. Typical lenses:

| book type | lens A | lens B |
|---|---|---|
| fauna | taxonomy, distribution, size, diet, reproduction, status | venom/anatomy, safety & first-aid, folk myths |
| flora | taxonomy, morphology (whorl counts!), phenology | pollination ecology, culture & law (CITES), diversity counts |
| anatomy / drawing | bone names, counts, proportions, dentition | pedagogy & originality (no copied phrasing), step clarity |

Issues come back structured: `location · claim · problem · correction · source · severity`.

## 3 · Revise

A reviser verifies each correction (checkers can be wrong too), applies the confirmed
ones, rejects the refuted ones with a reason, and appends a **Fact-check log** to the
research file. Run `node scripts/validate-books.mjs` afterwards.

## 4 · Translate, then review with two lenses

The Spanish edition is held to the same bar: a fluent sentence that changes a claim is
a wrong fact. Run it as its own pipeline per book, after the English is final:
translator → **two independent reviewers with different lenses** → reviser, with the
termbase and house style in `docs/books/es-style.md` and a log in
`docs/books/<id>-es-notes.md`.

| lens | reads for |
|---|---|
| **A · fidelity** (the scientist) | the same claim, hedge and certainty ("about", "rarely", "up to"); every number, unit, range and date (the validator compares numbers locale-aware); the same structure (rows, list items, look-closer notes by label); binomials identical and in *italics*; nothing added, nothing dropped to save a line; safety text that says exactly the same medical thing; IUCN categories by their official UICN names |
| **B · language** (the editor) | the right Spanish term for the structure — anatomy in its traditional Spanish names (*apófisis*, *esfenoides*), botany and herpetology as Costa Rican institutions write them (ICP, Museo Nacional, SINAC), Costa Rican common names; register (*usted*, museum tone, no voseo); typography (« », ¿ ¡, decimal comma, `85 %`, no-break spaces); the page: no longer in rendered lines than the English (`validate --fit` shows each page's scale in both languages) |

Issues come back structured like fact-check issues (`location · English · Spanish ·
problem · correction · source · severity`); the reviser verifies each against the
English and the source, applies or rejects it with a reason, and logs the verdict.

- **The figure is text too, in both languages.** Label texts and details, layer
  hints, part and colour names (the SVG `<title>`s) are translated in
  `src/i18n/es/<subject>.js`; the reviewers read them with the plate (a label must
  name the same structure as its look-closer note and the verso text, and in Spanish
  in the very words of the note's run-in), and every Spanish pill must stay ≤ 110 px
  (`audit.mjs --i18n`; `validate-books --lang es --runtime` compares pills and run-ins).
- **The making texts are translations, said so.** The Spanish making leaf prints
  faithful translations of the prompt and the brief, labelled as translations of the
  English originals; URLs, file names, ids and code-like tokens stay as written.
- **Translations drift.** A translation made from a snapshot misses later English
  edits (a source added, a colophon trimmed). Every English change carries its Spanish
  change in the same pass; `validate-books.mjs --lang es` reports the drift (list
  lengths, missing text, numbers that no longer match).

## What the launch books taught us

- **The figure is text too.** Label `detail`s, layer hints, part names (they become
  SVG `<title>`s) and the drawn construction panels are claims. Checkers must read
  the subject code and render the panels (`typeset.html?book=<id>&page=N`), and the
  reviser forwards figure-side issues to the subject owner — then someone fixes
  them before release. (Examples caught: an eyelash viper still named with its
  pre-2024 binomial in the figure; a jaguar panel drawing the closed orbit the
  text warns against; a corolla size from a non-Costa Rican flora.)
- **Beats must be timed to the code**, not to the plan: read the figure's timing
  constants (`seg(t, a, b)`, `openAt`, `T_LAND`) and check lab frames at each beat time.
- **Checkers disagree with each other and are sometimes wrong.** The reviser
  re-verifies every issue against the primary source and records the verdict
  (fixed / fixed in part / rejected with reason) in the fact-check log.
- Search budgets run out: fetch known primary pages and APIs directly (GBIF, IPNI,
  Reptile Database, PubMed/PMC, archive.org full texts) and say so in the log.

## Non-negotiables

- Safety content (snakebite, toxic plants, medicinal claims) follows current medical
  guidance. Never suggest handling wildlife, home remedies, tourniquets, cutting,
  suction or ice for snakebite. Medicinal-plant books never give dosing.
- Original prose and original construction drawings. Reference books inspire form, never text.
- Figure labels use the canonical ids, so the "Look closer" checklist and the 3D labels agree.
- When a fact can't be verified, cut it — in both editions.
- A translation never adds, drops or softens a claim, a number or a safety instruction.

## Workflow template (Claude Code)

```js
pipeline(books,
  bk => agent(writePrompt(bk), { schema: CONTENT_REPORT }),
  (draft, bk) => parallel(LENSES[bk.id].map(l => () => agent(checkPrompt(bk, draft, l), { schema: FACTCHECK })))
                   .then(rs => ({ draft, checks: rs.filter(Boolean) })),
  (res, bk) => agent(revisePrompt(bk, res.checks.flatMap(c => c.issues))))

// then the Spanish edition: the same shape, from the final English
pipeline(books,
  bk => agent(translatePrompt(bk), { schema: TRANSLATION }),       // writes src/books/es/<id>.js
  (draft, bk) => parallel(['fidelity', 'language'].map(l => () => agent(reviewPrompt(bk, draft, l), { schema: REVIEW })))
                   .then(rs => ({ draft, reviews: rs.filter(Boolean) })),
  (res, bk) => agent(reviseTranslationPrompt(bk, res.reviews.flatMap(r => r.issues))))
```

The exact prompts used for the launch books are archived in `docs/prompts/02-build-workflow.js`.
