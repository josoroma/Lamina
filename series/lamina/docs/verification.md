# Bilingual completion verification

Checked on 2026-11-02 after recovering the unfinished Claude workspace.
The live development app is at <http://localhost:5173/#/>; production checks
use the Vite preview at <http://127.0.0.1:4173/>.

## Completed changes

- English and Español editions for Serpientes, Flores and Calaveras, with
  library and reader switches, localized labels and exports, and saved preference.
- Josoroma's supplied SVG on all front and back covers in foil, and on the
  title and imprint pages in its original colours.
- A final prompt/brief leaf in each book: original English text and labeled
  Spanish translations, checked against the archived source prompts.
- Detailed snake heads, species-specific eyes and markings, the revised boa
  skin, and a recognizable black rat. The recovered boa bite repair now keeps
  the head in its fitted orientation; temporary experiment overrides are removed.
- Edition-loading failures preserve the displayed book and language, show
  recovery guidance, and keep the URL consistent with the visible edition.
- Three missing runtime Spanish strings from the late snake edits are translated.
- English alternate titles are omitted from the Spanish plates and contents;
  scientific names remain. Only this optional field accepts an explicit null,
  so missing required translations still trigger the existing fallback checks.
- Capture verification includes back covers and fails on empty, broken or
  incorrectly localized SVG exports.

## Checks

| Check | Result |
|---|---|
| Production build | Passed |
| i18n runtime, edition composition and source tests | 249 passed, including six optional-subtitle regressions |
| Spanish hyphenation | 55 checks passed; 2,651 corpus words checked |
| Both editions and printed layout | All 160 page sides passed, matching page order; no overflow or missing page strings |
| Author source | Downloaded SVG matches `public/author/josoroma.svg` byte for byte; generated paths also match |
| Cover and prompt visual review | All 12 front/back cover variants and 12 prompt/brief pages inspected |
| Figure contracts and five-second loops | All 19 figures passed on WebGPU and WebGL; checks split into the 12 flower/skull figures and seven snakes |
| Runtime figure translations | 1,004 figure string occurrences checked; none missing Spanish after repair; no Spanish label exceeds the audit's 110 px limit |
| Language interactions | All three reader round trips passed; page, time, layers, labels, explode and inspect state preserved where exercised |
| Preference and history | Library keyboard switch, localized links, saved preference, explicit-language routes, Back and Forward passed |
| Edition-fetch failure handling | Five simulated failure cases passed, including initial routes and in-place switches |
| Production mobile and reduced motion | 390×844 WebGL and 844×390 WebGPU passed: keyboard navigation, reading dialog, language/state persistence, no horizontal overflow, no browser errors or warnings |
| Final bilingual captures | Passed: 118 screenshots and 76 SVGs; all three Spanish-to-English state-preservation checks passed, with no missing runtime text or capture errors |

The manifest validator retains two intentional content warnings: Flores names
an official reference by its English title, and Calaveras abbreviates the Spanish
carnassial label while keeping P4/m1 in its description. The runtime inventory
also identifies two unused legacy dictionary entries. These do not cause a
fallback or appear as untranslated text in the books. The English label
“Carnassial (P4/m1)” exceeds the narrow audit target by 5 px; its shorter Spanish
label fits.

The rat and snakes are procedural scientific illustrations. This pass verifies
their rendering and interactions; it does not establish anatomical or medical
validation beyond the existing cited research dossiers.

## Reproduce

### Narration and readable captions follow-up

The reader now uses Chatterbox Multilingual V3 locally in English and Spanish,
with source and setup documented in [narration.md](narration.md). It extracts
only the physical left page, cancels on page/edition changes, buffers short
segments, and never advances to another page by itself. Controls support
pause/resume and stop, including narrow phones. Caption pacing slows the
figure's model clock to keep its words synchronized, giving every caption at
least four seconds and sufficient time for approximately 150 words per minute.

The additional checks pass: 12 text-extraction cases covering all 68 readable
left pages in both editions; 17 playback/cancellation/race cases; all 160
localized caption beats; six backend HTTP tests. Browser UI tests covered
all three books in both languages, including 320/390 px mobile controls.
The six-edition UI matrix used explicitly mocked WAVs. A separate production
browser check used the real local model in English and Spanish, verified WAV
decoding and playback, pause/resume, and cancellation on language/page changes,
with no browser errors. First playback took 8.9 seconds in English and 32.5
seconds in Spanish in that run, including the initial two-segment buffer;
latency depends on the cache and outstanding synthesis. The backend also
passed real English/Spanish generation and cache-reuse checks. Local evidence
is in `.scratch/codex-narration-live/report.json` and its screenshots.

```bash
npm run test:narration
.venv-narration/bin/python scripts/narration-server-test.py
```

### Adjustable reading angle follow-up

All three readers retain their original initial angle and now support a
mouse/pen drag starting outside the book to adjust towards a frontal view.
The gesture stays assigned to the camera when crossing a page. Paper and
figure gestures, touch margin swipes, and inspect orbit keep their behavior.
Desktop has a **Book view** control; compact screens expose the same slider
and presets through Contents. The angle survives page and language changes;
`0` resets it. Frontal framing reserves the top controls' screen band.

`npm run test:book-view` passes 11 checks for camera bounds, framing, portrait
rotation, reset, reduced motion, gesture routing, cancellation and existing
interactions. The production browser checks passed for Snakes, Flowers and
Skulls, including real background drags in both directions, unchanged angle
on mere mouse movement, page/language preservation, keyboard, presets and
slider. Controls also passed at 320 and 390 px with no horizontal overflow,
and a fresh reduced-motion session applied the angle immediately. No browser
errors were recorded. Screenshots and the report are under
`.scratch/codex-book-view/`. The full `npm test`, production build and Spanish
UI string audit pass.

### Build and capture commands

```bash
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

In a second terminal:

```bash
LAMINA_URL=http://127.0.0.1:4173 npm run validate:all -- --fit
LAMINA_URL=http://127.0.0.1:4173 npm run audit -- --lang es --i18n
LAMINA_URL=http://127.0.0.1:4173 npm run audit -- --lang es --i18n --webgl
LAMINA_URL=http://127.0.0.1:4173 npm run capture -- --lang both
```

The capture run writes screenshots and colour/line SVGs to
[`outputs/en/`](outputs/en/) and [`outputs/es/`](outputs/es/), with per-language
manifests. The [book guides](README.md#the-books) link individual artifacts.
Raw diagnostic logs and exploratory screenshots are kept locally under
`.scratch/codex-*` and `.scratch/w4/`; `.scratch/` is intentionally git-ignored.

## Science volumes: Atoms, Cells and Campfire

Added on 2026-11-02: **Atoms / Átomos**, **Cells / Células** and **Campfire by the
Beach / Fogata en la playa**. Each has six original illustrated chapters,
English and Spanish editions, a glossary, sources, Josoroma's cover mark and
its own prompt/brief pages. The explanations use everyday questions and
inspectable mechanisms. The beach story follows a father and his daughter.

The library now displays six books in a desktop grid, two columns on portrait
phones and a single row on short landscape screens. Titles and links change
with the edition. The existing left-page narration, caption pacing and manual
reading angle apply to every new book.

| Check | Result |
|---|---|
| Production build and `npm test` | Passed: 345 i18n cases, 55 Spanish hyphenation checks, 12 narration-text cases, 17 playback-controller cases and 11 book-angle cases |
| New content and prompt validation | Both editions of all three books passed without content errors or warnings |
| Printed page fit | All 156 new page sides passed at their full design size, with identical EN/ES page order |
| Caption reading time | All 268 beats across 74 localized plates meet the four-second minimum and 150-wpm budget |
| Narration text | All 134 readable left pages across six books in both languages split without text loss; the facing page is excluded |
| New figure audit | All 18 scenes passed on WebGPU and WebGL, including loop seams, labels, layers and figure contracts |
| Figure localization | 217 runtime string occurrences checked; none missing Spanish and no Spanish label above 110 px |
| Reader and language switching | All three new books open from the library; Spanish-to-English capture checks preserve page and paused time; Cells selection and angle presets verified in both languages |
| Final library viewports | 320×700, 390×844, 667×375, 844×390, 1024×768 and 1440×1000 pass in EN/ES: six correct click targets, no overlapping links, clipping or horizontal overflow |
| Bilingual capture | 116 PNG screenshots and 72 colour/line SVGs generated with no capture errors; SVG language metadata checked |
| Visual export review | 12 representative SVGs rendered in Chrome, plus all 12 new front/back covers and six prompt spreads reviewed; no blank plates or clipping |
| Real Chatterbox generation | New Atoms text generated successfully in EN and ES using `mlx-community/chatterbox-multilingual-v3`; valid mono 24 kHz WAVs of 5.44 and 5.80 seconds |

The two source-title/abbreviated-label warnings in the launch books remain
intentional. One unused legacy UI dictionary entry remains. New models disclose
their illustrative scales and timing; they are teaching diagrams rather than
molecular-dynamics or biological simulations. Source links and limits are in
[Atoms](books/atomos.md), [Cells](books/celulas.md) and [Campfire](books/fogata.md).
The original request and implementation briefs are in
[prompts/07-science-books.md](prompts/07-science-books.md).

Reproduce the new-volume figure checks on a production preview:

```bash
LAMINA_URL=http://127.0.0.1:4173 node scripts/audit.mjs atomos celulas fogata --lang es --i18n
LAMINA_URL=http://127.0.0.1:4173 node scripts/audit.mjs atomos celulas fogata --webgl --i18n
LAMINA_URL=http://127.0.0.1:4173 node scripts/validate-books.mjs atomos celulas fogata --lang all --fit
LAMINA_URL=http://127.0.0.1:4173 node scripts/capture.mjs --book atomos,celulas,fogata --lang both --out .scratch/science-captures
```

The captured new volumes are in `outputs/en/` and `outputs/es/`; their manifests
retain the launch-book records with per-item capture timestamps. Local audit,
fit, audio, viewport and export-review evidence is under
`.scratch/science-books/` (intentionally not tracked).

## Visual refinement of volumes IV–VI · 2026-11-02

All 18 science figures were rebuilt after the user's comparison with the launch
volumes. The original snake, flower and skull subjects were not changed in this
revision. The request and art direction are preserved in
[08-visual-refinement.md](prompts/08-visual-refinement.md), with a revision note
on each new book's making leaf in both languages.

The review included every normal and separated scene, the beach conversation
at two times in close-up, and the actual reader layout. Changes include sculpted
faces and hands, continuous clothing contours, detailed driftwood and char,
curved coastal terrain and waves, luminous flame surfaces, folded cellular
membranes, distinct organelles, and material samples beside atomic structures.
The models remain original procedural teaching illustrations, with their
schematic scales and timings disclosed in the books.

Independent cross-review corrected the prism's dispersion order and orientation,
the water oxygen label's visible attachment, and the DNA helix's handedness.
The wave label was moved onto visible water, and the first Cells plate's three
anchors were placed on clear membrane, nucleus and ribosome surfaces. The ATP synthase
keeps its catalytic head stationary while its shaft and ring rotate; its enlarged
gradient direction is explained in both editions. Reaction bookkeeping retains
exactly two carbon and four oxygen atoms throughout the campfire sequence.

Production build and the existing automated test suite pass. All 156 printed
page sides in the new books fit at full design size in both editions, including
the revised making text. All 18 figure audits pass on WebGPU and WebGL; the six
Cells figures were rechecked on both backends after the helix correction.
All 239 runtime figure-string occurrences have Spanish translations, and all
measured Spanish labels remain within 110 px. Normal and separated views have
been inspected for every revised figure. Local evidence is under
`.scratch/refinement/`, `.scratch/cells/redesign-*` and
`.scratch/campfire-review/`; per-volume construction and source notes are in the
three book guides.

Final bilingual capture completed without errors: 116 PNGs and 72 colour/line
SVGs, including language-switch checks and the revised prompt pages. Twelve
representative SVGs were rendered in Chrome for visual review. The capture
script now explicitly enables labels for each plate. The final wave and cell
label changes were recaptured in both languages; `outputs/en/` and `outputs/es/`
contain these revised assets while retaining the launch-volume records and
their original capture timestamps.

Export review also found that Cells registered empty layer-group parts above
its individual mesh parts. Those empty groups caused the SVG renderer to omit
their labels. Removing the redundant registrations preserves the visible
geometry and layers. The final six-figure contract audit passes, and all 24
Cells SVGs were regenerated with an explicit check that each contains every
declared label (3, 3, 4, 3, 3 and 3 across the six figures, in both modes and
languages).

## Campfire family revision — 2 November 2026

The family in plates I, IV and VI now uses continuous CC0 human geometry,
independently adapted child/adult proportions, articulated hands and restrained
facial motion. Braids, fringe, fitted glasses and the geometric “Head” cap follow
the author's description. Asset provenance is retained in
`public/assets/characters/`; the book's English and Spanish imprints credit the
adapted anatomy.

The production build and `npm test` pass. All six Campfire figures pass the
WebGPU and WebGL contract audits; all 93 collected runtime strings have Spanish
translations. The 26 page compositions in each language fit without warnings or
errors. The general dictionary scan still reports the pre-existing unused
`scrub the 5-second loop` key; it is unrelated to this revision.

Visual checks include portraits, both hands, full bodies, the three affected
spreads, deterministic poses and a complete sampled live loop. Posed hand
picking succeeds before an SVG export and after changing pose. The independent
review found and rechecked garment openings and heat-scene seating; the final
targeted views show closed clothing, calves clear of the log and shoes on the
page. Detailed review scope is in `books/fogata.md` and
`prompts/09-character-identity.md`, with local evidence under
`.scratch/character-revision/`.

Both language output folders now contain the refreshed Campfire captures:
38 PNGs and 24 native colour/line SVGs. Explicit character palettes preserve
the distinction between pale clothing and skin. The final heat-scene placement
was recaptured separately in both languages. Other volumes' output records and
capture timestamps were retained.

## Annotated screenshot repairs — 2 November 2026

The five annotations are transcribed in
[10-screenshot-corrections.md](prompts/10-screenshot-corrections.md). The repairs
cover forearm/wrist rotation and relaxed fingers, detailed matte trekking
footwear, a rooted tree on the rear sand, a black **Head** cap, and revised
reader prompts without the named-scientist instruction. The original historical
request remains unchanged; the revised prompt is explicitly labelled as edited.

`npm test`, production build and content validation pass. Content validation
has zero errors and three pre-existing warnings. All six Campfire figures pass
the Spanish WebGPU and WebGL audits, with all 93 runtime strings translated,
no oversized labels and no browser/shader errors. The actual WebGL reader was
also captured and inspected. Figure update costs in this run were at most
about 1.2 ms per frame; this is a local measurement, not a device-independent
performance guarantee.

The production character review saved 103 frames of the affected plates at
0, 2.5 and 5 seconds, checked actual rendered skinned vertices and completed
a 22-sample live playback cycle. No nonfinite vertices, loop mismatch or browser
errors were found. Hand picking passed before export and after changing pose.
Separate enlarged high/front/profile hand views and front/side/tread footwear
views were inspected. The tree-root contact was checked from the side and
through the separation control. The bilingual Campfire captures were refreshed
in `outputs/`; evidence is under `.scratch/screenshot-corrections/` and
`.scratch/character-revision/`.

The final plate's print palette was subsequently made explicit after SVG review
showed green leaves merged into the Sun's gold region. Both colour and line
exports were regenerated in English and Spanish after rebuilding, and the
corrected colour export was rendered and visually inspected. This metadata
change does not alter the geometry or animation tested above.

## Follow-up human naturalness — 2 November 2026

The next user screenshots exposed hand/clothing intersections missed by the
previous visual review. That earlier hand-contact assessment is superseded by
[the new investigation](prompts/11-human-naturalness.md). Supporting hands now
fit the posed thigh surface; quieter joint-specific finger flexion removes the
strong claw silhouette. The daughter's hair has layered strands, a varied
fringe, tapered braids and attached roots behind the ears. Palm texture detail
is retained separately from the softened child portrait.

The final production build and `npm test` pass. The new browser regression
`npm run test:characters` passes 25 posed checks. An independent half-second
sweep covers all three character plates: 55 supporting-hand checks found no
penetration beyond the 1 mm tolerance, with strict palm gaps of 3.21–8.70 mm.
The reviewer directly inspected 27 representative images from 129 captured
frames; connected skin and finite vertices were not used as a substitute for
visual judgment. The five-second posed-vertex mean checks agree within
`5.81e-12`; a 20-sample live playback run crosses the loop. Hand picking works
before export and after changing pose, with no stale export bounds.

All six Campfire figures pass the Spanish WebGPU and WebGL audits, including
all 93 runtime strings. The actual WebGL reader renders without errors. Content
validation has no errors and three unchanged warnings outside this repair.
Both Campfire editions were recaptured: 38 PNGs and 24 native colour/line SVGs.
The affected Spanish SVGs were rendered for review, including colour and line
inspection. Other volumes' output records and capture timestamps were preserved.
Local evidence is under `.scratch/human-naturalness/`; the book guide records
the visual scope and remaining angle-dependent foreshortening.

## Daughter's raised left palm — 2 November 2026

The raised arm was repositioned after the user still saw a reversed-looking
palm. The new diagonal wrist target and oblique palm expose the thumb and
finger shafts without changing hand geometry or textures. The targeted
production run covers five poses on each of plates I, IV and VI: 45 captures,
with 19 directly inspected images and no runtime errors or visible intersections
with the torso/resting arm in those views. A separate 20-sample live run crosses
the cycle; posed-vertex mean checks close within `1.18e-11`, and picking succeeds
before SVG export and after changing pose. Build and actual WebGL rendering
pass. The bilingual Campfire PNG/SVG output sets and manifest records were
refreshed while preserving other volumes. See
[the follow-up record](prompts/12-left-palm-orientation.md) and
`.scratch/palm-orientation/` for scope and evidence.

## Relaxed daughter arm and elbow — 2 November 2026

The latest screenshots supersede the preceding diagonal-palm visual assessment.
The speaking hand now stays above the lap, the upper arm hangs beside the torso,
and both daughter elbows use anatomical hinge alignment with distributed
forearm twist. Independent whole-character review found continuous elbow
contours, a quiet cupped palm and visible supporting-hand contact in the sampled
views. See [13-relaxed-arm.md](prompts/13-relaxed-arm.md).

The build passes. `npm run test:characters` passes the new source-mesh mechanical
regression and all 25 posed contact checks. The production review covers the
three character plates and a 20-sample live cycle, with finite posed vertices,
loop mean-coordinate differences below `7.6e-12`, successful picking before and
after export, and no browser errors. The actual WebGL reader also passes.

The refreshed SVG review also caught automatic flame-colour merging and stale
skinning during the temporary export transform. Explicit Campfire print
pigments preserve orange/yellow/cream, and staged/restored skeleton refresh
keeps hair and head aligned. Three repeated exports checked 96 skinned draws
below `3e-8` matrix error. Paired renders retain the crown and fire colours;
a production WebGL SVG exports without errors. Both bilingual Campfire output
sets were regenerated, preserving all other books' manifest records.
