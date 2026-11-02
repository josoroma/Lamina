# 03 · Integration — from ten agent reports to one working app

After the build workflow (`02-build-workflow.js`) finished — 19 agents, 0 errors,
~8.3 M subagent tokens, 2,825 tool calls, 1 h 44 min — the lead read every
report (summary, files, API, verification, known issues) and wired the real app.

## What the reports changed

| report | what integration had to adopt |
|---|---|
| book engine | `rig.inspect` became a method (use `inspectSphere(p, r)`); Book theme takes `foil`, `headband`, `endpaper`; `connectBookAudio(book, audio)` instead of manual sounds; `rig.reset()`; drags change `opened` on release; `spreadOpening(i)` / `leafVisible(i)` for pop-ups |
| figure host + export | `host.labelItems(camera, w, h)`, `focusPoint`, `figureRadius`, `pickFigure`, `beats`, events `mounted`/`layers`; SVG export from the real book scene |
| UI | `createUI({ …, theme, reducedMotion, announceSpreads })`, `setChromeVisible(false)` for `ui=0`, `runShortcut(e)` as the single keyboard map, `animationTitle`, label `focus` flag |
| typesetter | `loadFonts(theme, { manifest })`, `buildSides` → `.sides/.leafCount/.spreads`, hits in canvas space matching `Book.pick` u/v |
| content revisers | manifest beats are now timed to the figures and shown in preference to figure beats; look-closer taps must switch on the label's layer |

## Integration changes (lead)

- `index.html` boots `src/app/boot.js` (library ↔ reader routes, one renderer),
  adds `#ui`, fixes the favicon on every page.
- `src/app/Reader.js` rewritten against the final APIs: page printing budget,
  figure mounting around the spread, figure-aware camera framing (tall pop-ups
  stay in view), ranked label cap (look-closer first), look-closer taps switch
  layers on, `connectBookAudio`, `inspectSphere`, keyboard via `ui.runShortcut`,
  `window.lamina` automation (`goTo`, `plate`, `settle`, `exportSVG`, `info` …).
- `src/app/Library.js`: Book themes with foil/endpapers, captions projected under
  each 3D book, a column layout on phones.
- `src/engine/figures/FigureHost.js`: pop-ups fold with `book.spreadOpening(i)`
  (smooth when the previous page falls back onto them) and stay hidden on covered leaves.
- `src/engine/stage.js`: portrait screens look at the page more face-on (58°).
- Forwarded fact-check fixes applied in figure code: *Bothriechis nigroadspersus*
  display name (snakes + skull-and-snake strings), hedged matabuey eggs label,
  venom gland "behind and below the eye", a `keeled-scales` label for *Crotalus simus*,
  cortez corolla 3.6–7.5 cm; canonical ids `temporalis masseter head` added.
- Tooling: `shot.mjs` waits for real readiness promises (and `--webgl` goes before
  the `#/route`); `capture.mjs` settles the book, retries slow frames and captures
  contents, introduction, back matter, a mid-turn page, the reader chrome and a phone;
  `lab.html?view=` is honoured; captures run against `vite build` + `vite preview`.

## Smoke results

- Production build: 481 ms; three.webgpu chunk 1.08 MB (298 kB gzip); each book's
  subject code loads lazily (snakes 81 kB, skulls 62 kB, flowers ~70 kB across modules).
- `capture.mjs` against the build: 76 items (library, 3 × front matter, 19 plates,
  38 SVGs, back matter, turns, phones), **0 console errors**.

## Follow-up agent: skull lesson anatomy (verbatim brief, abridged headers)

> You are fixing four confirmed anatomy problems in the "Calaveras" (drawing
> skulls) subject … You may edit ONLY files under src/subjects/skulls/ …
> 1. Open-jaw 3D motion is rotation-first … Make the glide start with the opening
>    … the chin/incisors must travel DOWN and BACK … keep the open/close timing …
> 2. Open-jaw construction panels … ≈ 30° rotation plus ≈ 1 cm forward and ≈ 0.3 cm
>    down condyle translation, so the incisors open ≈ 5 cm …
> 3. Jaguar construction panels … draw the orbit rim as an open C with two short
>    pointed postorbital processes and a clear gap behind …
> 4. Frontal construction panel 03 … move the centres to ≈ ±3.0 cm (bridge ≈ 2.1 cm,
>    EKB ≈ 9.9 cm) …
> Verification you must do (read every PNG you make): panels via typeset.html,
> 3D via lab.html at the beat times, seam via scripts/audit.mjs, validate-books,
> both backends.

## Lesson for next time

The build workflow passed fact-check issues to revisers as
`JSON.stringify(issues).slice(0, 30000)`. Calaveras' 39 issues were ~42 k
characters, so the reviser saw 27 of them. The rest were recovered from the
journal and applied by the lead. Pass long lists as a file path instead of
inlining them, or split them per checker.
