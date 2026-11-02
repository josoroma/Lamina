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
