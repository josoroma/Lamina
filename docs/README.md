# Lámina docs

Everything used to produce the three demo books: the prompts, the contracts the
agents built against, the research behind every claim and the outputs.

## Start here

| | |
|---|---|
| [`architecture/CONTRACTS.md`](architecture/CONTRACTS.md) | the single source of truth the build agents worked from: units, frozen APIs, manifest schema, text budgets, canonical label ids, page order, the three books, style guide, accuracy rules |
| [`../.claude/skills/lamina/SKILL.md`](../.claude/skills/lamina/SKILL.md) | the reusable Claude Code skill (with references for architecture, manifest, figures, motion, design, accuracy, verification) |

[Verification notes](verification.md) record the finishing checks and their scope.

## The books

| book | doc (prompts + outputs) | research dossier + fact-check log | outputs |
|---|---|---|---|
| *Serpientes* — A Living Atlas of Costa Rican Snakes | [books/serpientes.md](books/serpientes.md) | [serpientes-research.md](books/serpientes-research.md) | [English](outputs/en/serpientes/) · [Español](outputs/es/serpientes/) |
| *Flores* — A Living Herbarium of Costa Rica | [books/flores.md](books/flores.md) | [flores-research.md](books/flores-research.md) | [English](outputs/en/flores/) · [Español](outputs/es/flores/) |
| *Calaveras* — Drawing Skulls: A Constructive Method | [books/calaveras.md](books/calaveras.md) | [calaveras-research.md](books/calaveras-research.md) | [English](outputs/en/calaveras/) · [Español](outputs/es/calaveras/) |

Each book is available in English and Español through the library and reader’s
language switch. All covers carry Josoroma’s foil-stamped wordmark; the final
leaf contains the original series prompt and the book’s brief, with labeled
translations in the Spanish edition. See the book guides above for local routes,
plate lists, prompt sources and captures.

## Prompts, in the order they were used

1. [`prompts/00-original-brief.md`](prompts/00-original-brief.md): the user's brief, verbatim, with the references described.
2. [`prompts/01-lead-architecture.md`](prompts/01-lead-architecture.md): how the lead scouted the references, chose the stack and verified a skeleton before fanning out.
3. [`prompts/02-build-workflow.js`](prompts/02-build-workflow.js): the orchestration script, with every agent prompt:
   - seven code specialists;
   - three content pipelines (author → two fact-checkers → reviser).
4. [`prompts/03-integration.md`](prompts/03-integration.md): turning ten reports into one app, the forwarded fixes, and the follow-up agent brief.
5. [`prompts/04-review.md`](prompts/04-review.md) and [`04-review-workflow.js`](prompts/04-review-workflow.js): the adversarial review workflow (reviewers → skeptical verifiers → fixers) and what it changed.
6. [`prompts/05-integrate-workflow.js`](prompts/05-integrate-workflow.js): the review's second round (integrate the fixers' hand-offs → rebuild → re-verify all 100 findings → repair), written up in `04-review.md` under "Round 2".
7. [`prompts/06-bilingual.md`](prompts/06-bilingual.md): the user's second prompt (English/Español, the author on the covers, the prompt pages, real snake faces, the béquer and its rat) and the four workflows that answered it — [`06a`](prompts/06a-research-workflow.js) research and design, [`06b`](prompts/06b-translate-workflow.js) translation, [`06c`](prompts/06c-build-workflow.js) build, `06d` finishing (its workflow script was not archived in this checkout). Their reviewed specs are in [`specs/`](specs/); the Spanish style guide is [`books/es-style.md`](books/es-style.md).

## Outputs

[`outputs/en/`](outputs/en/) and [`outputs/es/`](outputs/es/) hold captures from
the corresponding editions. Each language directory has a library image and,
per book:

- front and back covers, title, contents and introduction spreads;
- every plate at *t* = 2.4 s, plus plate I exploded with labels;
- a page mid-turn and the back matter;
- the glossary facing the original prompt (`91-glossary.png`) and the book’s brief (`92-making.png`);
- reader controls and a phone view;
- before/after language-switch images in the Spanish output directory.

Each language’s `manifest.json` records the capture run. Regenerate the images
with a production preview running on port 4173:

```bash
LAMINA_URL=http://127.0.0.1:4173 npm run capture -- --lang both
```

The command also creates `svg/<plate>-color.svg` and `svg/<plate>-line.svg`
for every figure. Add `--no-svg` for an image-only capture. The SVGs contain the
selected language’s labels and `xml:lang` metadata. The interactive reader also
exports colour SVG, line SVG and PNG directly.
