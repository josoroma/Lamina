// Archived copy of the Spanish translation workflow, run on 2026-11-01 (run wf_790de506-d8c; a first
// attempt, wf_505c1178-9f1, hung on a browser-pane permission prompt and was stopped). Launched with the
// Claude Code Workflow tool; see docs/prompts/06-bilingual.md.
export const meta = {
  name: 'lamina-translate-es',
  description: 'Spanish edition of the three books (restart, no browser pane): style guide + termbase in parallel with the three translations, then two adversarial reviews and a revision per book',
  phases: [
    { title: 'Write', detail: 'docs/books/es-style.md and src/books/es/<id>.js, in parallel' },
    { title: 'Review', detail: 'Spanish copy editor + scientific reviewer per book (report only)' },
    { title: 'Revise', detail: 'apply or rebut every issue, re-check parity and length' },
  ],
}

const ROOT = '/Users/josoroma/sites/books'
const DESIGN = ROOT + '/.scratch/bilingual/design-i18n.md'
const SNAP = ROOT + '/.scratch/bilingual/en-snapshot'
const OLD = '/Users/josoroma/.claude/projects/-Users-josoroma-sites-books/a4e0399d-cbbe-47ab-aeb0-b0604dd935a3/subagents/workflows/wf_505c1178-9f1/agent-aff932ec7ca207f47.jsonl'

const PRE = `You are a specialist on **Lámina** — interactive, page-turnable 3D scientific books ("living plates") rendered in the browser: a floating 3D book whose pages are typeset by a Canvas 2D typesetter, with pop-up figures that animate in seamless 5-second loops. Repo: ${ROOT} (never commit). Three books, all English today: Serpientes (7 Costa Rican snakes), Flores (6 Costa Rican flowers), Calaveras (6 skull-drawing lessons). Their text lives in the manifests src/books/<id>.js (schema: docs/architecture/CONTRACTS.md §6; sources: docs/books/<id>-research.md).

The user asked for the books in English and Español with a language switch. You produce the Spanish text. Engineers are building the plumbing in parallel from the design ${DESIGN} — read its §2 (the Spanish edition file and its key set), §3.4 (core terminology), §4 (Spanish typography: decimal comma, «» quotes, IUCN names, commonAlt, glossary order) and, at the end of the file, "## Review (adversarial)" rows R1.1, R1.4, R1.9, R1.10 and R6 (they correct the design). Fixed format: src/books/es/<id>.js is a full-shape copy of the English manifest (same keys, same order, same array lengths) with every reader-visible string translated and locale: 'es'; at runtime all non-text values (ids, figure params, numbers, beat times, label ids, theme) come from English, so the shape must match.

TRANSLATE FROM THE SNAPSHOT ${SNAP}/<id>.js (identical to src/books/<id>.js at 21:59). Another workflow will edit the English manifests while you work (a byline field, a shorter Serpientes colophon, two how-to rows, the béquer's prey); a later sync step carries those edits into Spanish — do not chase them.

WORKING RULES
- NEVER use the built-in browser tools (mcp__Claude_Browser__*): they wait for a person's approval and a previous attempt of this task hung on one for an hour. Use WebSearch, WebFetch or curl.
- Another workflow is editing src/ and rebuilding dist/ right now. Treat everything outside the files your task names as READ-ONLY (scratch files go under ${ROOT}/.scratch/bilingual/).
- Never stop or restart servers (dev http://127.0.0.1:5173, preview http://127.0.0.1:4173).
- Never invent facts or sources. Open every source you cite. Where you could not verify a term quickly, mark it [unverified] in your notes instead of chasing it for long.
- A previous, unfinished attempt researched many Spanish terms; its tool results are in ${OLD} (JSONL, 4 MB). You may grep it (e.g. for URLs, "suero antiofídico", "labelo", "apófisis") to reuse findings with their sources.`

const TERMS = `

YOUR TASK: termbase:es — write ${ROOT}/docs/books/es-style.md, the Spanish style guide and termbase for the edition (it ships with the project's docs, so write it for a human editor). Translators are working in parallel from the design's §3.4/§4; your guide documents and, where needed, corrects those decisions with sources — reviewers will check the translations against it. Aim to finish within about 45 minutes.
1. Register: "usted" (Costa Rican usage), impersonal where natural, museum-catalogue tone, no voseo.
2. Orthography and typography (RAE/ASALE Ortografía 2010): tildes ("solo" and demonstratives without tilde); capitals (species common names lowercase in running text; titles in sentence case; months lowercase); italics only for binomials, genus names and genuinely foreign words; quotation marks «» first level (design §4) — confirm or argue; raya for incisos with Spanish spacing; en dash for ranges; decimal comma as a deliberate Costa Rica/CLDR choice (review R6: the Ortografía prefers the point and accepts the comma by region — say so); thousands: none for 4 digits, U+00A0 from 5; units after U+00A0 (written \\u00a0 in the manifests); "Fig."; roman numerals; "PLATE" → "LÁMINA".
3. Termbase EN → ES, a source per line: Costa Rican common names (snakes, flowers, the jaguar) and alternatives; herpetology (loreal pit, keeled scales, ventral scales, fangs, solenoglyphous, antivenom — ICP: "suero antiofídico" — hemotoxic/neurotoxic, constriction, caudal luring, rattle segments…); botany (labellum, column, pseudobulb, bract, inflorescence, sepal, petal, stamen, anther, pistil, ovary, nectar guide, anthesis, the hummingbirds named); anatomy and drawing for Calaveras (Terminologia Anatomica in Spanish vs Latin American usage — choose and be consistent; the 22 bones; zygomatic arch; nasal aperture; orbit; mandible; teeth; temporalis, masseter; construction lines, centre line, planes, foreshortening, values, hatching); IUCN categories by their official Spanish names (review R6: "Extinto en Estado Silvestre (EW)" capitals as the UICN prints them); CITES wording; first aid as the Instituto Clodomiro Picado words it; reader verbs (turn the page, drag, double-click, inspect, layers, explode, labels, export).
4. Book furniture: titles stay (Serpientes, Flores, Calaveras); Spanish subtitles; "Lámina · Volumen I"; the imprint name "Lámina Natural History Press" in Spanish (decide); edition line; running heads; Contents/Índice; How to use this book; Glossary; Sources; Imprint; Did you know?; Look closer; Field notes; Pro tip; Common mistakes; step titles; "How this book was made".
5. Length: Spanish runs 15–25 % longer and the English pages are tightly fitted; give concrete condensing techniques that keep every fact.
Return a short summary of the key decisions, and list any decision that differs from the design's §3.4/§4 (translators must hear about those).`

const translatePrompt = (id) => `

YOUR TASK: translate:${id} — the Spanish edition of the ${id} manifest.

Read the design sections named above, the English snapshot ${SNAP}/${id}.js (all of it), docs/books/${id}-research.md (sources and decisions), and skim this book's figure code for the labelled structures (src/subjects/…) so your words match what the figures show. If ${ROOT}/docs/books/es-style.md already exists when you start, follow it; otherwise follow the design's §3.4/§4 and re-check against es-style.md before you finish if it has appeared.

Write ${ROOT}/src/books/es/${id}.js (create src/books/es/): an ES module "export default { … }", a full-shape copy of the English manifest — same keys, same order, same array lengths — with every reader-visible string in Costa Rican scientific Spanish, and locale: 'es'. Start with a short header comment in the style of the English file.
- Keep EXACTLY: ids, figure params, numbers, beat times, label ids (lookCloser[].label), theme, binomials, authorities, bibliographic source entries (translate only connective words such as "consulted"), URLs.
- Translate every reader-facing field: subtitle, kicker, edition, blurb, imprint, credits, intro, howTo, plate fields (common/commonAlt per design §4.4 — Costa Rican names stay; family lines that are not taxa; status labels with the official UICN names; badge, lede, body, facts labels and values, lookCloser texts, didYouKnow, caption, scaleNote, animation title and beats), lesson steps, pro tips, mistakes, proportions, back matter (note, glossary — terms translated; keep the array index-aligned with English, the typesetter sorts per language), colophon. The title stays. The "author" field (the imprint name) follows es-style.md / your decision.
- NEW FIELD (review R1.1): give every lookCloser row a Spanish "name" — the printed name of the structure, ≤ 3 words, the term a Costa Rican reader would use for what the figure labels (e.g. { label: 'loreal-pit', name: 'Fosa loreal', text: '…' }). The English rows print humanize(label) today; your names become the reference for the figure labels' Spanish later.
- Keep the light markup (*italic*, **bold**) and the no-break spaces (\\u00a0) between numbers and units; italics only where the style guide says (Spanish words the English edition italicised are no longer foreign).
- Beats describe exactly what the 5-second loop shows at those times (the English was checked against the poses); translate the meaning precisely; never narrate a motion that isn't there.
- Fidelity: every fact, number and hedge survives; never add a claim. Where a source is Spanish (e.g. the Instituto Clodomiro Picado), prefer its own wording for terms.
- Length (the pages are tightly fitted; Calaveras lesson versos most of all): per string ≤ 1.10 × the English character count, per plate (all its text) ≤ 1.05 ×. Condense; never drop a fact.
- Also write ${ROOT}/docs/books/${id}-es-notes.md: term decisions specific to this book (with sources), anything you could not render exactly, open questions.
Self-check before returning: the module imports (node -e "import('${ROOT}/src/books/es/${id}.js').then(m=>console.log(Object.keys(m.default)))"); a scratch script compares shape, ids, numbers and beat times with the snapshot (report the result); list the 10 strings with the highest length ratio.
Return a summary: counts, length ratios, parity result, open questions.`

const LENSES = [
  {
    key: 'language',
    text: `YOUR ROLE: adversarial Spanish copy editor (Costa Rican scientific publishing). Look for: calques and anglicisms (false friends such as eventualmente, asumir, aplicar, remover, en base a, colapsar), unnatural syntax, gerunds of posteriority, wrong prepositions, register slips (tú or vos instead of usted), orthography (tildes, capitals, "solo"), typography (dashes and their spacing, «» quotes, decimal comma, thousands, no-break spaces, italics), departures from the termbase, missing or over-long lookCloser names (≤ 3 words), and strings over the length limits (≤ 1.10 × per string, ≤ 1.05 × per plate — measure against the snapshot).`,
  },
  {
    key: 'science',
    text: `YOUR ROLE: adversarial scientific reviewer (bilingual herpetology, botany and human/comparative anatomy). Check fidelity and correctness: every fact, number, unit, hedge and name in the English is present and right in the Spanish; nothing added; terms match authoritative Spanish usage (verify with sources: Instituto Clodomiro Picado, Solórzano, Terminologia Anatomica in Spanish, the official Spanish UICN category names, botanical Spanish); lookCloser names name the same structure as the label id; beats still describe what the loop shows (read the English beats and the pose/figure timing code); the howTo matches the real controls (src/engine/ui). Give a source for every terminology claim.`,
  },
]

const reviewPrompt = (id, lens) => `

${lens.text}

Review ${ROOT}/src/books/es/${id}.js against the English snapshot ${SNAP}/${id}.js and ${ROOT}/docs/books/es-style.md (plus the design's §3.4/§4). REPORT ONLY — do not edit any file. Every issue needs: path (e.g. plates[2].body[1]), severity, the exact current Spanish text, the exact proposed text, the reason (and a source where it is a terminology or fact claim). Report real problems only; if the translation is clean in your lens, return an empty list.`

const REVIEW = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['ok', 'issues'] },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          current: { type: 'string' },
          proposed: { type: 'string' },
          reason: { type: 'string' },
          source: { type: 'string' },
        },
        required: ['path', 'severity', 'current', 'proposed', 'reason'],
      },
    },
  },
  required: ['verdict', 'issues'],
}

const revisePrompt = (id, reviews, termbase) => `

YOUR TASK: revise:${id} — apply the reviewers' issues to ${ROOT}/src/books/es/${id}.js, and align it with ${ROOT}/docs/books/es-style.md where the guide decided differently from the design. For each issue: apply it (improve it if you can) or reject it with a one-line reason. Then re-run the self-checks (the module imports; shape/id/number/beat-time parity with ${SNAP}/${id}.js; every lookCloser row has a name; length ratios ≤ 1.10 per string and ≤ 1.05 per plate). Add a "Review" section to ${ROOT}/docs/books/${id}-es-notes.md: counts applied and rejected, and why. Return a summary.

THE STYLE GUIDE'S SUMMARY (decisions that differ from the design are listed in it):
${termbase}

ISSUES (JSON):
${JSON.stringify(reviews.map((r) => r.issues).flat())}`

phase('Write')
const termP = agent(PRE + TERMS, { label: 'termbase:es', phase: 'Write' })

const BOOKS = ['serpientes', 'flores', 'calaveras']
const books = await pipeline(
  BOOKS,
  (id) => agent(PRE + translatePrompt(id), { label: 'translate:' + id, phase: 'Write' }),
  async (tr, id) => {
    await termP
    const rs = await parallel(
      LENSES.map((lens) => () =>
        agent(PRE + reviewPrompt(id, lens), { label: 'review:' + id + ':' + lens.key, phase: 'Review', schema: REVIEW }),
      ),
    )
    return { tr, reviews: rs.filter(Boolean) }
  },
  async (x, id) => {
    const termbase = await termP
    const rev = await agent(PRE + revisePrompt(id, x.reviews, termbase), { label: 'revise:' + id, phase: 'Revise' })
    return {
      id,
      translate: x.tr,
      issues: x.reviews.map((r) => ({ verdict: r.verdict, count: r.issues.length, high: r.issues.filter((i) => i.severity === 'high').length })),
      revise: rev,
    }
  },
)
return { termbase: await termP, books: books.filter(Boolean) }