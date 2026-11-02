// Archived copy of the bilingual round's research workflow, run on 2026-11-01 (run wf_35f71ebd-b85):
// snake faces, the béquer and its rat, and the English/Español design, each checked by an
// adversarial reviewer. Launched with the Claude Code Workflow tool; see docs/prompts/06-bilingual.md.
export const meta = {
  name: 'lamina-bilingual-research',
  description: 'Research real snake faces, the béquer and its rat; design the English/Español edition, author covers and prompt page; adversarially review each spec',
  phases: [
    { title: 'Research', detail: 'snake faces · béquer & rat · i18n design (read-only on src/)' },
    { title: 'Critique', detail: 'an adversarial reviewer checks each spec and appends corrections' },
  ],
}

const ROOT = '/Users/josoroma/sites/books'
const IMG = '/private/tmp/claude-501/-Users-josoroma-sites-books/a4e0399d-cbbe-47ab-aeb0-b0604dd935a3/images'
const OUT = ROOT + '/.scratch/bilingual'

const PRE = `You are a specialist on **Lámina** — interactive, page-turnable 3D scientific books ("living plates"): a floating 3D book on pure white whose pages carry pop-up figures that animate in seamless 5-second loops, with layers, labels, explode, inspect and SVG export. Stack: Three.js r186 WebGPURenderer + TSL (WGSL on WebGPU, GLSL on the WebGL 2 fallback), a Canvas 2D typesetter for the printed pages, an HTML overlay UI. Repo: ${ROOT} (never commit). Three books: Serpientes (7 Costa Rican snakes, lithograph style), Flores (6 Costa Rican flowers, lithograph), Calaveras (6 skull-drawing lessons, engraving style).

Read first: ${ROOT}/.claude/skills/lamina/SKILL.md, ${ROOT}/.claude/skills/lamina/references/architecture.md and references/verify.md, ${ROOT}/docs/architecture/CONTRACTS.md (skim), then the files your task names.

THE USER'S NEW REQUEST (verbatim, typos included):
"3 books must be in the following tw languages, so display a language switch: -English -Español so that way users can navigate the book in those languages. Each book cover front and back most clone and contain the autor: https://josoroma.github.io/Los-Arquitectos-del-Estado/assets/img/josoroma.svg  Add the end of each book add a page with the prompt used to generate that book. Note: snake heads/face must be more real, they are like faceless, with no eyes or details right now, improve that. The bequer skin color and the prey doesn't looks like a rat, make it more accurate."
("bequer" = béquer, the Costa Rican name of Boa imperator — plate VII of Serpientes, a boa constricting its prey.) The author SVG is already copied to ${ROOT}/public/author/josoroma.svg. The user's screenshots — look at them: ${IMG}/41.png (terciopelo, plate I), ${IMG}/42.png (oropel eyelash viper on its branch, plate II), ${IMG}/43.webp (Calaveras lesson VI, skull & snake), ${IMG}/44.png (béquer constricting the prey, plate VII), ${IMG}/45.webp (the library at http://localhost:5173/#/).

WORKING RULES
- Another workflow is still REPAIRING the app: it edits src/app/*, src/engine/ui/*, src/engine/figures/*, src/engine/export/*, src/subjects/snakes/*, src/subjects/skulls/* and rebuilds dist/. Treat ALL of src/, scripts/ and public/ as READ-ONLY. Write only the files your task names (under ${OUT}/).
- Never stop or restart servers. Dev server http://127.0.0.1:5173 reloads whenever files change (fine for quick looks, bad for long runs). Production preview http://127.0.0.1:4173 serves dist/ (others rebuild it at any time; if a shot fails mid-rebuild, wait a few seconds and retry).
- Renders: node scripts/shot.mjs "<path?query#route>" <out.png> [--w 1440 --h 900 --wait 1500 --eval "<js>" --ready "<expr>" --dpr 1 --webgl], with LAMINA_URL=http://127.0.0.1:4173 to target the preview. lab.html shows one figure (query parameters: see references/verify.md, architecture.md and lab code); the reader is scriptable through window.lamina (architecture.md). Read every PNG you take.
- Never invent facts. Cite a real source (URL or full reference) for every factual claim, and open the sources you cite.`

const FACES = `

YOUR TASK: research:snake-faces — a sourced, implementable spec that makes every snake head read as a real face.

The user says the heads look "faceless, with no eyes or details". The code already builds eyes, supraocular brows, loreal pits, nostrils, eyelash scales, fangs, tongue and venom glands (src/subjects/snakes/head.js, specs in species.js, colour nodes headColorNode/eyeColorNode in patterns.js, assembly in index.js, ink look in src/kits/ink), yet at book zoom none of it reads. Calaveras lesson VI has its own eyelash viper (src/subjects/skulls/snake.js).

1. DIAGNOSE. Render each of the 7 Serpientes heads (terciopelo, oropel, coral, cascabel, matabuey, serpiente marina, béquer) and the Calaveras viper close up: at the reader's camera on its plate (book zoom, 1600×1000 and 390×844), in inspect zoom, and in lab front/side/three-quarter views; WebGPU plus one WebGL spot check. Measure the head's on-screen length in px. Explain precisely why each face reads as faceless: eye size, placement and embedding in the head mesh, eye material (colour, hatching, roughness, no catchlight, no dark rim), outlines, head shape and neck, missing scale plates, labials and markings, and the label anchor dots that sit on the face (see the screenshots).
2. RESEARCH each head (authoritative sources: Savage 2002 The Amphibians and Reptiles of Costa Rica; Solórzano 2004/2022 Serpientes de Costa Rica; Instituto Clodomiro Picado species pages; The Reptile Database; Campbell & Lamar 2004 The Venomous Reptiles of the Western Hemisphere; species descriptions; museum and field-guide photo captions): head outline from above and from the side (widths and lengths as ratios of head length Lh; neck width), canthus rostralis, eye diameter and centre position (ratios of Lh), pupil shape and aspect, iris colours and pattern (hex approximations), supraocular size and overhang, loreal pit size and position, nostril size, position and orientation (the sea snake's are dorsal and valved), labial scales (count, colours, any light labial border), head scalation (small scales vs large plates — describe the plates for Micrurus, Hydrophis and Crotalus), head markings (postocular stripe colour, width and path; the coral's black snout and pale parietal band; mid-dorsal stripes; the oropel's flecks), tongue colour, and the eyelash viper's superciliary spines (number, shape, angle).
3. SPEC. Per species, numbers an implementer can type in (ratios of Lh, hex colours) and descriptions a TSL painter can implement in head-local coordinates. Say what may be exaggerated for legibility at book zoom, and by how much, without breaking accuracy. Give acceptance criteria per species (what a reviewer must see in a book-zoom close-up and in inspect). Propose how head label anchors must render so they never hide the eye, pit or nostril.
4. IMPLEMENTATION PLAN. Map every change to file:function (head.js, species.js, patterns.js, skulls/snake.js, src/kits/ink, src/engine/ui/labels.js for anchor markers), with the approach (geometry, TSL nodes that work on both backends, outline rules, SVG export colours/swatches for new parts, which layer each new part belongs to — eyes go with the skin), risks, and exact verification commands.

Write everything to ${OUT}/research-snake-faces.md (create the folder; put images under ${OUT}/faces/). Return a 200-word summary and the path.`

const FACES_CRITIC = `

YOUR TASK: critique:snake-faces. You are an adversarial herpetologist and 3D illustrator. Read ${OUT}/research-snake-faces.md completely and the images it references.
1. Check every factual claim about each species' head (shape ratios, eye size and position, pupil, iris colours, scalation, plates, markings, eyelash spines, tongue) against the cited sources — open them — and against at least one further authoritative source. Mark each claim confirmed / wrong / unsourced.
2. Check the numbers are plausible and mutually consistent, and that the exaggerations allowed for legibility stay honest.
3. Check the implementation plan against the real code (the file:function references exist; the approach works in TSL on WebGPU and the WebGL 2 fallback; SVG export covered; eyes, tongue and eyelash scales stay on the skin layer).
4. What is missing (a species, the Calaveras viper, inspect-zoom detail, the label anchors, phones)?
Append a section "## Review (adversarial)" to the same file with exact corrections (old → new) and missing items; do not rewrite the author's sections. Return a 150-word verdict.`

const BOA = `

YOUR TASK: research:boa-rat — a sourced, implementable spec for (a) the béquer's true colours and pattern and (b) a prey that unmistakably reads as a rat.

Plate VII of Serpientes is Boa imperator (béquer) constricting its prey (text in src/books/serpientes.js; figure code: src/subjects/snakes/patterns.js (skin pattern), species.js (colours), poses.js (pose 'constrict'), props.js buildPrey — today a "stylised rodent"). The user says the boa's skin colour is wrong and the prey doesn't look like a rat (see ${IMG}/44.png).

1. DIAGNOSE the current boa pattern and colours and the prey: render the plate at book zoom and in inspect, plus lab views; WebGPU and a WebGL spot check.
2. RESEARCH Costa Rican Boa imperator colour and pattern (Savage 2002; Solórzano; The Reptile Database; Card et al. 2016 and Suárez-Atilano et al. 2017 on Central American boas; Instituto Clodomiro Picado; well-captioned field photos): ground colours (dorsum, flanks, belly) as hex ranges; the dorsal saddles (count on body and tail; shape — bow-tie, dumbbell, oval; light centres; light edging); the lateral rhomboid blotches with light centres; the tail saddles (reddish brown to maroon, cream borders); ventral flecking; head pattern (mid-dorsal head stripe, the dark postocular stripe, the subocular wedge); scale texture (small smooth scales, slight iridescence). State the variation and pick one well-documented Costa Rican phenotype.
3. RESEARCH the prey. The plate cites Boback et al. 2012 and 2015 (rats) and says constriction stops the prey's blood flow. Decide which rat to show (e.g. black rat Rattus rattus, common in Costa Rica and taken by boas, or a native cotton rat Sigmodon) with sources on boa diet in Costa Rica, and specify it: head–body and tail length relative to a 2–2.5 m boa's girth and coils; head (blunt snout, pink nose, vibrissae, dark bead eyes, large thin rounded ears); fur colours (dorsum, flanks, belly; hex); the naked, scaly, ringed tail (colour; length vs head–body); pink feet with digits; and what stays visible when 2–3 coils wrap the thorax (head, a forefoot, hindquarters and tail).
4. TEXT. List the exact text changes this needs in src/books/serpientes.js (the caption "around a prey silhouette", beats, the part name "Prey (stylised rodent)", any label or fact) with proposed English wording.
5. IMPLEMENTATION PLAN: file:function changes (patterns.js / species.js for the boa; props.js for the rat), the approach (a TSL pattern in the snake's along-body/around-body coordinates; fur as directional hatching plus albedo variation; whiskers as fine lines; translucent pink ears), SVG export swatches for the new parts, acceptance criteria and exact verification shots.

Write to ${OUT}/research-boa-rat.md (images under ${OUT}/boa/). Return a 200-word summary and the path.`

const BOA_CRITIC = `

YOUR TASK: critique:boa-rat. You are an adversarial herpetologist and mammalogist. Read ${OUT}/research-boa-rat.md completely and its images. Check every claim on Costa Rican Boa imperator coloration and pattern (saddle counts and shapes, colours, tail, head stripes) and on the rat (species choice and its justification for Costa Rica, proportions, fur and tail colours, ears, feet, how it sits in the coils) against the cited sources — open them — and at least one further authoritative source; mark each claim confirmed / wrong / unsourced. Check the proposed text changes are accurate and the implementation plan fits the real code (functions exist; works on both backends; export swatches). Append "## Review (adversarial)" to the same file with exact corrections (old → new) and missing items. Return a 150-word verdict.`

const DESIGN = `

YOUR TASK: design:i18n — the implementation spec for the English/Español edition, the author on the covers and the prompt page.

FIXED DECISIONS (build on them; challenge one only if it is impossible, with evidence):
1. Languages en (default) and es. Routes gain an optional first hash segment: #/es/ (library), #/es/serpientes?plate=3 … (route code: src/app/route.js). A route without it resolves the preference (localStorage 'lamina.lang' → navigator.languages starting with 'es' → 'en') and is rewritten with history.replaceState, so every URL carries its language.
2. Spanish book text lives in src/books/es/<id>.js: a full-shape copy of the English manifest with every reader-visible string translated (translators are writing these right now, in parallel with you). A loader composes the edition: non-text values (ids, figure params, numbers, beat times, label ids, theme, …) ALWAYS come from the English manifest; text comes from the Spanish file. Define the exact non-text key set from the schema (CONTRACTS §6 plus the additive fields such as blurb, imprint, credits) and the validator rules (shape/id/number parity, untranslated strings, strings allowed to stay identical such as binomials and source references).
3. Figure and UI strings use gettext-style dictionaries keyed by the exact English string (with {placeholders} for templates): src/i18n/es/ui.js and src/i18n/es/figures.js (or one file per subject — decide). One small runtime src/i18n/index.js: getLang(), setLang(), onLang(cb), t(str, vars), the book-edition loader, and formatters (numbers with the locale's decimal separator; collation for the glossary).
4. Both editions paginate identically: every side exists in both languages, so switching keeps the reader on the same spread. Spanish text must fit each page at auto-fit ≥ 0.9 with no overflow; the typesetter and the validator check both locales.
5. A language switch on the library and in the reader's top bar: "English · Español" (compact "EN · ES" on phones), keyboard accessible (radio-group semantics), each option carrying its own lang attribute. Switching in the reader keeps the spread, figure time, layers, explode and label state; it re-typesets the current spread first and the rest progressively (no long freeze — measure it); it updates <html lang>, document.title, the a11y mirrors and Read sheet, the figure labels and the SVG export (key, title, filenames).
6. The author: Josoroma's wordmark (public/author/josoroma.svg — 8 filled paths, viewBox 0 0 1000 200, inner transform scale(5); fills var(--josoroma-primary,#c92b60) for the letters and var(--josoroma-accent,#087fa9) for the final 'a') must appear on the FRONT and BACK covers of every book — foil-stamped on the cloth like the title, in the book's own foil — and also on the title page and in the imprint credits, in the logo's own colours on paper. Draw it from its path data with Path2D (no async image load); keep the original file in public/author/ as the source. Manifest: author: { name: 'Josoroma', mark: 'josoroma' }; the current author string ('Lámina Natural History Press') becomes publisher. The library page shows the covers, so it inherits the mark.
7. "How this book was made", at the end of each book: the user's original prompt verbatim (docs/prompts/00-original-brief.md, the quoted prompt) and that book's own brief verbatim (docs/prompts/02-build-workflow.js, books[].brief). The Spanish edition prints faithful translations, labelled as translations of the English originals. Decide one page or a closing spread (legibility: type no smaller than the current back-matter text; spread parity of the whole book), where it sits relative to the note, glossary, sources, imprint and endpapers, and how it appears in the contents, the a11y mirror and the Read sheet.

READ the code this touches: src/app/* (route, boot, Reader, Library, pages, a11y), src/engine/ui/* (index, labels, popover, sheet, drawer, shortcuts, ui.css), src/engine/typeset/* (index, fonts — subsets and glyph coverage for ¿ ¡ ñ á é í ó ú ü Á É Í Ó Ú Ñ « »; hyphen.js — English-only today; text.js — the line breaker; blocks; layouts front, back, boards (covers), plate, lesson), src/engine/figures/FigureHost.js, src/engine/export/* (SVG key text), src/books/index.js and the three manifests, every place a subject produces user-visible strings (src/subjects/*/ — label names and details, part names, layer names, lesson stages, swatch names), scripts/validate-books.mjs, scripts/capture.mjs, scripts/audit.mjs, typeset.html, lab.html, and the skill (.claude/skills/lamina/SKILL.md + references/*), which must teach bilingual books from now on.

DELIVER ${OUT}/design-i18n.md with:
- the architecture (modules, data flow, state, events) and every API signature;
- the non-text key set and the merge algorithm (plates matched by id, beats by index, …);
- Spanish hyphenation: the exact syllabification rules to implement (RAE: inseparable clusters pl bl cl gl fl pr br tr dr cr gr fr, digraphs ch ll rr never split, diphthongs vs hiatus with written accents, prefixes, never leave a single vowel, minimum 2/3 letters) and how it plugs into text.js;
- the string inventory: every user-visible English string in code, by file:line and owner area (app, ui, typeset, figures-export, snakes, skulls, flowers, books), with the dictionary key;
- per-owner-area task lists with exact files and functions so 8–9 implementers can work in parallel with DISJOINT file ownership; name every cross-area interface precisely so nobody needs another area's internals;
- the covers / title page / imprint author layout (positions and sizes as fractions, foil treatment) and the prompt page layout;
- validator, capture and audit changes (both locales) and the skill/docs changes;
- risks with mitigations (re-typeset cost, font subsets, Spanish label lengths in the label layout, SVG key widths, page fit) and acceptance tests per area.
Return a 300-word summary and the path.`

const DESIGN_CRITIC = `

YOUR TASK: critique:i18n-design. You are an adversarial senior engineer. Read ${OUT}/design-i18n.md completely, then verify it against the code (open the files and lines it cites):
- wrong assumptions about how modules work;
- strings missing from the inventory (grep the code yourself for user-visible English: aria-label, data-tip, title, textContent, innerHTML, placeholder, alt, label/part/layer/stage/swatch names, export key text, document.title, toasts, help rows, the library page);
- ownership overlaps or hidden cross-area dependencies between implementers;
- performance (time one full re-typeset of a book now through typeset.html and extrapolate the switch cost);
- font glyph coverage (check the font files/subsets for ñ ¿ ¡ « » and accented capitals);
- errors in the hyphenation rules; page-fit risk (estimate the Spanish expansion page by page);
- switching edge cases (mid-turn, inspect mode, an export in progress, deep links, reduced motion, phone portrait, the Read sheet open);
- accessibility (lang attributes, announcements), SVG export, capture/audit/validate, the skill docs, the author mark on all covers and the library.
Append "## Review (adversarial)" to the same file with exact corrections and missing items. Return a 200-word verdict.`

const TASKS = [
  { key: 'snake-faces', file: 'research-snake-faces.md', prompt: FACES, critic: FACES_CRITIC },
  { key: 'boa-rat', file: 'research-boa-rat.md', prompt: BOA, critic: BOA_CRITIC },
  { key: 'i18n-design', file: 'design-i18n.md', prompt: DESIGN, critic: DESIGN_CRITIC },
]

const results = await pipeline(
  TASKS,
  (t) => agent(PRE + t.prompt, { label: 'research:' + t.key, phase: 'Research' }),
  (summary, t) =>
    agent(PRE + t.critic, { label: 'critique:' + t.key, phase: 'Critique' }).then((verdict) => ({
      key: t.key,
      file: OUT + '/' + t.file,
      summary,
      verdict,
    })),
)
return results.filter(Boolean)