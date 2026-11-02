# 06 · English / Español, the author, "How this book was made", real snake faces

After the review rounds (`04-review.md`), the user looked at the running app and
asked for five changes in one message. This round answers it with four Claude
Code Workflows run by the lead; three scripts are archived next to this file.

## The prompt (verbatim)

> let it finish but:
>
> http://localhost:5173/#/
>
> 3 books must be in the following tw languages, so display a language switch:
>
> -English
> -Español
>
> so that way users can navigate the book in those languages.
>
> Each book cover front and back most clone and contain the autor: https://josoroma.github.io/Los-Arquitectos-del-Estado/assets/img/josoroma.svg  Add the end of each book add a page with the prompt used to generate that book.  Note: snake heads/face must be more real, they are like faceless, with no eyes or details right now, improve that. The bequer skin color and the prey doesn't looks like a rat, make it more accurate.

Five screenshots came with it: the terciopelo and the oropel with smooth,
eyeless heads; the *Calaveras* skull-and-snake lesson; the béquer (*Boa
imperator*, "bequer" in the prompt) wrapped round a pale, rat-less "stylised
rodent"; and the library.

Asked one question — should the author's wordmark keep its pink and blue on
the cloth covers or be foil-stamped like the title? — the user answered:

> Foil-stamped

## How it ran

| workflow | script | agents | wall clock | subagent tokens | tool calls |
|---|---|---|---|---|---|
| research and design, each spec reviewed adversarially | [`06a-research-workflow.js`](06a-research-workflow.js) | 6 | 1 h 50 min | 3.5 M | 1,364 |
| Spanish style guide, translation, two-lens review, revision | [`06b-translate-workflow.js`](06b-translate-workflow.js) | 13 | 1 h 48 min | 5.5 M | 1,211 |
| build: thirteen file areas, then one release build | [`06c-build-workflow.js`](06c-build-workflow.js) | 14 | 1 h 59 min | 7.7 M | 3,008 |
| finish: sync, figure strings, ten review lenses, repair | archive not present in the recovered workspace | — | — | — | — |

The research and the translation ran while the previous round's repairers were
still editing the app, so they were told to treat `src/` as read-only and to
write only their own outputs. The author's SVG was downloaded once, read in full
(eight filled paths, no scripts) and copied to `public/author/josoroma.svg`.

## 1. Research and design

Three specs, each read by an independent agent told to refute it before anyone
built on it. All three, with their reviews appended, are kept in
[`../specs/`](../specs/): [`snake-faces.md`](../specs/snake-faces.md),
[`bequer-and-rat.md`](../specs/bequer-and-rat.md) and
[`bilingual-design.md`](../specs/bilingual-design.md).

- **Why the heads looked faceless.** The code already built eyes, pits, nostrils,
  eyelash scales, fangs and a tongue, but at book zoom none of it read: the 8.5 px
  label dots sat on the eye and the pit on seven of eight heads; the iris was
  almost the skin colour, the slit pupil under a pixel wide, with no catchlight;
  the eye sat low and deep in a domed head; the head had no scales or plates; some
  markings were wrong (the béquer's eye stripe flooded its snout). The reviewer
  then caught that the proposed eye heights would push the eyes out through the
  crown, that the catchlight would whiten a small eye, that the rattlesnake's new
  iris was skin-coloured again, and that the coral's eye label pointed at the eye
  on its hidden side.
- **The béquer and its prey.** Costa Rican *Boa imperator* is silvery grey in
  front with black-rimmed bow-tie saddles and pale-centred side blotches; the
  reviewer corrected the first draft's "warming to tan behind" and maroon tail —
  the cited photographs darken toward the tail to blackish brown with buff gaps.
  The prey became a black rat, *Rattus rattus*, documented as boa prey, at real
  size and held in two loops round chest and belly (as Boback et al. 2015 describe
  constriction) so its face, a forefoot and its tail stay in view. That study used
  laboratory rats, so the book never says its boas killed black rats.
- **The bilingual design.** English strings stay in the code as keys and
  are translated only where text leaves for the screen, a canvas, an SVG or the
  screen-reader mirror, so the figure code needed no i18n changes. A Spanish
  edition is a full-shape copy of the English manifest with the text translated;
  a schema decides what is text and what is an id, and the loader always takes ids,
  numbers, beat times and figure parameters from English. Both editions paginate
  identically, so switching keeps the reader's spread. The reviewer found thirteen
  blocking problems before a line was written — among them that every look-closer
  name was printed from its English id, that turning `author` into an object would
  have printed "[object Object]" on the covers (the mark went into a new `byline`
  field instead), and that the *Calaveras* lesson pages had no room for Spanish.

## 2. The Spanish text

A style guide and termbase ([`../books/es-style.md`](../books/es-style.md)) fixed
the voice and the words: *usted*; decimal comma; «» quotation marks; snake names
feminine as the Instituto Clodomiro Picado writes them (*la terciopelo*); *suero
antiofídico*; first-aid lines mapped to the Institute's own wording; traditional
anatomical names (*apófisis mastoides*, *esfenoides*); the UICN's capitalised
category names. Terms it could not source are marked [unverified] for an editor.

Each book was translated from a snapshot of its English manifest, then reviewed
by two agents that could only report — a Costa Rican copy editor and a bilingual
scientific reviewer — and revised. They raised 69 issues (66 distinct, none high);
65 were applied and 1 was rejected with its reason in the translator's notes
([`serpientes-es-notes.md`](../books/serpientes-es-notes.md),
[`flores-es-notes.md`](../books/flores-es-notes.md),
[`calaveras-es-notes.md`](../books/calaveras-es-notes.md)). Every plate stays within
5 % of the English length.

The first attempt at this workflow stalled for an hour: its style-guide agent had
opened a new site in the app's built-in browser pane, which waits for a person to
approve the site. It was stopped and restarted with that browser forbidden (web
fetches and headless Chrome only), and the style guide written alongside the
translations rather than before them. Every later prompt carries the same rule.

## 3. The build

Thirteen agents, one per file area with disjoint ownership, against a stub of the
i18n API the lead landed first so nobody waited:

- **Languages.** `src/i18n/` (runtime, edition composer, schema; dictionaries per
  area); routes `#/en/…` and `#/es/…` (a link without a language follows the saved
  choice, then the browser, then English); "English · Español" on the library and
  in the reader's top bar, a keyboard radio group; a switch re-prints the visible
  spread first and keeps the page, the animation time, layers, explode and labels;
  Spanish hyphenation (RAE rules) and number formats (`2,4 cm`, `12 345`).
- **The author.** The Josoroma wordmark, drawn from its own path data, is
  foil-stamped on the front and back boards of every book (gold on *Serpientes*
  and *Flores*, silver on *Calaveras*) and printed in its own colours on the title
  page and the imprint; screen readers hear "by Josoroma" / "por Josoroma".
- **"How this book was made".** One more leaf before the back board: its recto
  prints the user's original prompt, its verso the book's own brief from
  [`02-build-workflow.js`](02-build-workflow.js), both verbatim in English and as
  labelled translations in Spanish, ending with a line that points here.
- **Faces, béquer, rat.** Per-species eyes (iris, the right pupil, rim,
  catchlight), supraocular shelves, pits and nostrils as openings, labials and head
  shields, markings and eyelash spines; head labels drawn as hairline rings or
  ticks that never cover what they name; the béquer's documented pattern; the
  black rat.
- **Leftovers** from the review's second round: the near-miss drag beside a thin
  snake, still export frames, inked nectar guides, declared bract colours, and a
  redesigned *Calaveras* lesson verso that leaves room for Spanish.

The release build then passed the English checks, the fit check in both
languages, and the loop audit (19/19 on WebGPU and WebGL), and listed what was
left: 468 figure strings still in English, a Spanish *Serpientes* that lagged a
few late English edits, and about ninety small requests the areas had left for
one another.

## 4. Finishing and recovery

On 2026-11-02 the user asked Codex to continue after Claude exhausted its token
allowance. The source already contained the three Spanish editions, translated
figure dictionaries, foil author marks, making pages, detailed snake heads,
the revised boa pattern, and the black rat. The remaining work was to finish
partly integrated repairs, verify the combined source, and produce the final
documentation and captures.

The recovered workspace contains the intermediate verification artifacts under
`.scratch/w4/`, including private builds and experiments. Those are historical
diagnostics, not the final source. The fourth orchestration script was not found;
its duration and token counts are deliberately left unknown.

The continuation checks the actual `src/` tree and its production build. It
preserves the original English prompts and explicitly labeled Spanish
translations. The author SVG in `public/author/josoroma.svg` was compared with
the supplied URL and matches byte for byte. All twelve front/back boards and
all twelve prompt/brief pages were also inspected visually.

The language loader's existing error handling is connected to the library,
reader and router, so a failed edition request keeps the current edition and
offers recovery. The boa's unfinished bite experiment is completed in the
procedural model. Documentation captures now include the closed back cover,
and an empty or failed SVG export causes capture verification to fail.

The last visual pass also closed the saved `commonAlt` handoff: Spanish
editions omit the English alternate titles on plates and contents pages.
The edition schema permits an explicit null for that optional subtitle only;
six regression checks preserve fallback reporting for missing required text
and preserve the English titles. Three late snake-label translations were
added after the production runtime audit found them.

The final reproducible commands and results are recorded in
[`../verification.md`](../verification.md). Captures are grouped by edition in
`docs/outputs/en/` and `docs/outputs/es/`; the individual book guides link their
covers, plates, prompt pages and phone views.
