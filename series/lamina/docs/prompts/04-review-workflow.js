// Archived copy of the adversarial review workflow run on 2026-11-01 (run wf_95c059e2-9e0).
// Launched with the Claude Code Workflow tool; see docs/prompts/04-review.md for what it found and fixed.
export const meta = {
  name: 'lamina-review',
  description: 'Adversarially review the integrated Lámina app (code, interaction, three books visually and scientifically, UI/a11y, performance, SVG export), verify every significant finding, then fix by file area',
  phases: [
    { title: 'Review', detail: 'eight independent read-only reviewers' },
    { title: 'Verify', detail: 'a skeptic tries to reproduce each significant finding' },
    { title: 'Fix', detail: 'one fixer per file area, disjoint ownership, visual re-check' },
  ],
}

const ROOT = '/Users/josoroma/sites/books'

const CONTEXT = `PROJECT: **Lámina** (${ROOT}) — interactive, page-turnable 3D scientific books ("living plates"): a realistic hardcover floating on a pure white canvas, typeset pages (Canvas 2D), 3D pop-up figures with ink outlines + engraved hatching (Three.js r186 WebGPURenderer + TSL; WGSL on WebGPU, GLSL on the WebGL 2 fallback), a seamless 5-second scientific animation per plate, layers, labels, explode/dissection, inspect/orbit, portable SVG export. Three books: #/serpientes (7 Costa Rican snakes), #/flores (6 Costa Rican flowers), #/calaveras (6 skull-drawing lessons, engraving style). It is meant to be production-ready and museum-quality, with a minimal premium UI and no clutter.

READ FIRST: ${ROOT}/docs/architecture/CONTRACTS.md (contracts, units, schema, canonical ids, style guide, accuracy rules) and ${ROOT}/.claude/skills/lamina/references/verify.md (tools + QA checklist) and architecture.md (module map, window.lamina automation API).

HOW TO LOOK AT THINGS
- A PRODUCTION BUILD is served at http://127.0.0.1:4173 (vite preview) — use it for reviewing: it never reloads. Screenshot tool: \`cd ${ROOT} && LAMINA_URL=http://127.0.0.1:4173 node scripts/shot.mjs "<path?query#route>" .scratch/review/<your-key>/<name>.png [--w 1600 --h 1000 --wait 2500 --eval "<async js>" --webgl]\`, then READ the PNG (you must actually look at every image you cite). shot.mjs prints console errors.
- Reader URLs: \`/?gl=webgl#/serpientes?plate=3&t=2.4&explode=0.6&layers=skeleton:1&labels=0&ui=0\` (gl=webgl must be in the search part, before the #). window.lamina in the page: \`await lamina.plate(n)\`, \`await lamina.goTo(spread)\`, \`lamina.setTime(t)\`, \`lamina.pause()\`, \`lamina.setLayer(id,on)\`, \`lamina.setExplode(a)\`, \`lamina.setLabels(on)\`, \`await lamina.settle(ms)\`, \`lamina.inspect(true)\`, \`await lamina.exportSVG('color'|'line')\`, \`lamina.info()\`, plus lamina.book / lamina.host / lamina.ui / lamina.stage / lamina.renderer for introspection.
- Figure workbench: \`lab.html?type=snake|flower|skull&params=<url-encoded JSON>&t=&play=0&view=three-quarter|front|side|top|book|close&layers=id:1&explode=&ui=0\`; window.lab = { ready, setTime, setView, setLayer, setExplode, info(), exportSVG(mode) }.
- Pages: \`typeset.html?book=<id>&page=all|<n>&width=1200\` (window.typeset.ready → { overflow, results }).
- Previous full capture (production build, before the latest integration fixes): ${ROOT}/.scratch/cap1/<book>/*.png and svg/*.svg — useful as a starting map, but re-shoot anything you report.
- For scripted interaction you may write small playwright-core scripts in ${ROOT}/.scratch/review/<your-key>/ (import { chromium } from '${ROOT}/node_modules/playwright-core/index.mjs'; launch { channel: 'chrome', headless: true, args: ['--enable-unsafe-webgpu','--enable-features=WebGPU','--use-angle=metal','--ignore-gpu-blocklist'] }).

ALREADY KNOWN AND BEING FIXED RIGHT NOW (do not report these): in Calaveras — the open-jaw 3D loop's condyle glide starting late; open-jaw construction panels 02–03 rotating about a fixed condyle; jaguar panels 02–03 drawing a closed orbit; frontal panel 03 orbit spacing; the manifest wordings 'past the chin' (frontal step 1), 'hang the jaw as a long lever' (jaguar step 2), the intro's 'same order for every view' with four stages, 'sutures zigzag' on facial bones; skull-and-snake showing the embedded snake's skeleton/venom labels (vertebrae, ribs, fangs, venom gland) and naming the SVG part '… — follow-path'.

RULES: You are a REVIEWER. Do NOT edit any project file (only write your own scratch files under ${ROOT}/.scratch/review/<your-key>/). Do NOT commit. Do not stop servers. Report only real, reproducible problems — each with concrete evidence (PNG path you looked at, console text, numbers) and an exact repro. Prefer few precise findings over many vague ones; no style nits unless they visibly hurt the "museum-quality, minimal, premium" bar. Rank severity honestly: critical = broken/crash/wrong science that misleads; high = clearly visible defect or broken interaction a user hits; medium = noticeable polish/accuracy issue; low = minor.

AREAS (pick the one that owns the fix): app (src/app/*, index.html, scripts/*.mjs) · book-engine (src/engine/book/*, input.js, stage.js, renderer.js, audio.js) · figures-export (src/engine/figures/*, src/engine/export/*, src/kits/ink/*, src/kits/patterns/*, src/lab/*) · ui (src/engine/ui/*) · typeset (src/engine/typeset/*) · snakes (src/subjects/snakes/*, src/kits/tube/*) · flowers (src/subjects/flowers/*, src/kits/petal/*) · skulls (src/subjects/skulls/*, src/kits/sdf/*) · content-serpientes / content-flores / content-calaveras (src/books/<id>.js + docs/books/<id>-research.md).`

const AREAS = ['app', 'book-engine', 'figures-export', 'ui', 'typeset', 'snakes', 'flowers', 'skulls', 'content-serpientes', 'content-flores', 'content-calaveras']

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          area: { type: 'string', enum: AREAS },
          files: { type: 'array', items: { type: 'string' } },
          evidence: { type: 'string', description: 'what you observed: PNG paths you read, console output, measured numbers' },
          repro: { type: 'string', description: 'exact steps / URL / command to see it' },
          fix: { type: 'string', description: 'proposed fix, as concrete as possible (file, function, change)' },
        },
        required: ['title', 'severity', 'area', 'files', 'evidence', 'repro', 'fix'],
      },
    },
    coverage: { type: 'string', description: 'what you checked (and what you could not)' },
  },
  required: ['findings', 'coverage'],
}

const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['confirmed', 'refuted', 'unclear'] },
    evidence: { type: 'string' },
    refinedFix: { type: 'string' },
    severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
  },
  required: ['verdict', 'evidence', 'refinedFix', 'severity'],
}

const FIX_REPORT = {
  type: 'object',
  properties: {
    fixed: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, change: { type: 'string' }, verification: { type: 'string' } }, required: ['title', 'change', 'verification'] } },
    skipped: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, reason: { type: 'string' } }, required: ['title', 'reason'] } },
    files: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['fixed', 'skipped', 'files', 'notes'],
}

const reviewers = [
  {
    key: 'code-app',
    prompt: `YOUR REVIEW: the integration layer — src/app/{boot.js,Reader.js,Library.js,pages.js,route.js,a11y.js,app.css}, index.html — and how it uses the engine APIs (src/engine/book/Book.js, src/engine/figures/FigureHost.js, src/engine/ui/index.js, src/engine/input.js, src/engine/audio.js, src/engine/export/index.js, src/engine/typeset/index.js). Read the code line by line for real bugs: listeners/timers not removed on dispose, GPU resources leaked across library ↔ reader route changes, races (rapid hash changes while a book is loading; dispose during awaits), PageCache eviction disposing a texture still bound to a visible leaf, wrong spread/side arithmetic (verso/recto, first/last spreads, closed back cover), look-closer/contents hit regions, history/hash handling (?plate=, ?spread=), automation API correctness, error paths. Then PROVE suspected bugs at runtime on the preview build: e.g. switch #/ → #/serpientes → #/flores → #/ … 10× quickly and compare lamina.renderer.info.memory (geometries/textures) and performance.memory.usedJSHeapSize before/after; open a book at ?spread=<last>, ?plate=99, ?spread=-3; check console errors.`,
  },
  {
    key: 'interaction',
    prompt: `YOUR REVIEW: real interaction in the reader, driven by playwright with genuine input events (page.mouse.move/down/up with steps, page.mouse.wheel, page.keyboard.press, touch via a CDP session Input.dispatchTouchEvent): turn by dragging from the recto's fore-edge corner to the left (commit) and by a short drag released early (should spring back), a fast flick, clicking recto/verso, ArrowLeft/ArrowRight/PageUp/PageDown/Home/End/Space/L/E/S/C/F/1-9/Escape/?/+/-/0/I, drag ON the figure (should rotate the figure, not turn the page), double-click the figure (inspect) and Esc back, wheel zoom and pan, pinch on touch, swipe on touch, the contents drawer (C, arrows, Enter), the layers popover toggles + explode + "Moment" time slider, the labels switch, the export menu (catch the download event and check the file is a valid SVG/PNG), reduced motion (page.emulateMedia({ reducedMotion: 'reduce' })) and the library page (hover, click a book, keyboard Tab+Enter). Check state after each action with lamina.info() and screenshots (read them). Test on the preview build, desktop 1440×900 and phone 390×844 (isMobile/hasTouch context). Report anything that does not do what a reader would expect.`,
  },
  {
    key: 'visual-serpientes',
    prompt: `YOUR REVIEW: the book #/serpientes, visually AND scientifically, every spread: closed cover, endpaper+title, imprint+contents, introduction+how-to, every plate I–VII, afterword+sources, glossary+back endpaper, closed back. For each plate: t = 0, 1.25, 2.5, 3.75 (\`?plate=N&t=…&ui=0\` or lamina.setTime), with labels, with each layer switched on in turn (lamina.info().layers lists them), explode 0.8, inspect mode (lamina.inspect(true)), WebGPU 1600×1000 and WebGL 1440×900 (\`/?gl=webgl#/…\`), phone 390×844, tablet 768×1024. Compare the figure with the verso text and the figure labels/details (open src/books/serpientes.js and src/subjects/snakes/*.js): does each species look right (proportions, pattern, head shape, pupils, pits only on pit vipers, fangs, rattle, paddle tail…)? Do the beats (animation.beats in the manifest) describe what is on screen at their times? Defects to look for: clipping at the viewport edges, figures sinking into or floating above the page, z-fighting, black blobs from outlines, moiré/aliasing in hatching, interpenetration (coils through coils, head through branch), labels pointing at the wrong place or piling up, text overflow/typos on the pages, wrong running heads/folios, the sea-snake water slab looking like a glass box, anything that looks unfinished. Read every PNG you take.`,
  },
  {
    key: 'visual-flores',
    prompt: `YOUR REVIEW: the book #/flores, visually AND scientifically, every spread: closed cover, endpaper+title, imprint+contents, introduction+how-to, every plate I–VI, afterword+sources, glossary+back endpaper, closed back. For each plate: t = 0, 1.25, 2.5, 3.75, with labels, with each layer on/off, explode 0.8, inspect mode, WebGPU 1600×1000, WebGL 1440×900 (\`/?gl=webgl#/…\`), phone 390×844, tablet 768×1024. Compare figure vs verso text vs figure label details (src/books/flores.js, src/subjects/flowers/*.js): whorl counts (sepals/petals), colours, sizes, the orchid lip/column, heliconia bract arrangement and the hummingbird, passiflora corona ranks, palicourea bracts, handroanthus nectar guides and the falling corolla, nymphaea petals/stamens/pads. Do the manifest beats match the motion at their times? Defects: clipping (tall figures at the top of the view), petals interpenetrating, transparent sorting artifacts (pond, wing blur), black outline blobs, hatching moiré, labels mispointing/piling up, text overflow/typos. Read every PNG you take.`,
  },
  {
    key: 'visual-calaveras',
    prompt: `YOUR REVIEW: the book #/calaveras (engraving style, drawing lessons), visually AND scientifically, every spread: closed cover, endpaper+title, imprint+contents, introduction+how-to, every lesson I–VI (verso: giant vertical title, steps with three construction panels 01–03 drawn by drawStep, pro tip, mistakes, proportions, look closer), afterword+sources, glossary+back endpaper. For each lesson figure: t = 0, 1.25, 2.5, 3.75, labels, each layer on/off (construction, planes, bones, engraving, sutures, muscles, teeth, grid, skull, snake), explode 0.8, inspect, WebGPU 1600×1000, WebGL 1440×900, phone 390×844. Check anatomy (22 bones, sutures, orbits as rounded squares about half an orbit apart, piriform aperture, condyle in front of the ear canal, open jaw: condyle rotates AND glides forward, chin goes down and back; jaguar: sagittal crest, open orbit behind, carnassials, canines), and that each step text describes what its panel shows (render the versos large: typeset.html?book=calaveras&page=<n>&width=1400). Do the manifest beats match the motion at their times? Defects: clipping, the label count (too many labels = clutter), hatching rings/moiré in sockets, the snake intersecting the skull, panel line art inconsistent with text, page overflow, typos. Read every PNG you take.`,
  },
  {
    key: 'ui-a11y',
    prompt: `YOUR REVIEW: the reader UI overlay (src/engine/ui/*: toolbar pill, top bar, contents drawer, layers/export/help popovers, beat caption, label pills + leader lines + detail cards, toasts, phone reading sheet) and the library page. Check: keyboard-only operation (Tab order, visible focus, Enter/Space, Esc closes the topmost overlay, focus traps, focus restored on close), ARIA roles/labels/pressed/expanded, live-region announcements (read #ui's aria-live text after page turns), colour contrast of text and icons against their backgrounds (sample pixels from screenshots and compute WCAG ratios), touch target sizes on phone, idle auto-hide (3 s) and wake, reduced motion, label layout (overlaps, leaders crossing pills, labels covering the figure centre), widths 320, 390, 768, 1024, 1440, 2560 px and short heights (e.g. 1366×600). Compare against a "minimal premium" bar: nothing cluttered, nothing jumping. Read every PNG.`,
  },
  {
    key: 'perf',
    prompt: `YOUR REVIEW: performance and robustness on the preview build. Measure (with requestAnimationFrame timestamps in page.evaluate, 3 s windows, playing): frame time median/p95 on every plate of every book at 1600×1000 WebGPU and WebGL, and phone 390×844 at DPR 2; figure build time (lamina.plate(n) → host.mounts.get(leaf).ready); page turn smoothness (frame times during lamina.next() and during a riffle lamina.turnTo(spread+5)); memory: lamina.renderer.info.memory and performance.memory before/after visiting every plate of all three books twice (look for monotonic growth = leaks); the PageCache texture count; first load (navigation timing to window.lamina.ready) for #/ and each book; bundle sizes in ${ROOT}/dist/assets. If a plate is slow (> 16.7 ms p95 on WebGPU desktop), profile it (CDP Profiler.start/stop, or time host.update / book.update / renderer.render separately via performance.now around calls through lamina.*) and name the hot spot. Note: headless Chrome GPU timing is indicative, not exact — compare plates relative to each other.`,
  },
  {
    key: 'export-svg',
    prompt: `YOUR REVIEW: the portable SVG export (src/engine/export/*) for EVERY plate of all three books, both modes: in the reader (preview build) call \`await lamina.plate(n); await lamina.settle(600); const svg = await lamina.exportSVG('color')\` (and 'line'), save each to .scratch/review/export-svg/<book>-<plate>-<mode>.svg. Validate: well-formed XML (xmllint --noout), viewBox/width/height sane, no NaN/Infinity/undefined in attributes or path data, a <title>/<desc>/<metadata>, label numbers + key when labels are on, credit/caption present, sizes (flag > 2 MB). Line mode must be a colouring page: outlines only, no coloured fills (white/none only), closed shapes so it can be coloured. Rasterize each SVG in Chrome (page.goto('file://…svg') at 1600 px) and READ the PNGs: does the drawing match the figure seen in the book (same pose/framing), are parts filled with sensible colours, any garbage paths, missing parts, misaligned labels? Also test exportPNG via the UI export menu (catch the download). Report broken or ugly exports with evidence.`,
  },
]

phase('Review')
log(`Launching ${reviewers.length} reviewers against the production preview build`)

const severityRank = { critical: 0, high: 1, medium: 2, low: 3 }

const reviewed = await pipeline(
  reviewers,
  (r) => agent(`${CONTEXT}\n\nYour reviewer key: ${r.key} (write scratch files to ${ROOT}/.scratch/review/${r.key}/).\n\n${r.prompt}`, { label: `review:${r.key}`, phase: 'Review', schema: FINDINGS }),
  (res, r) => {
    // verify at most VERIFY_CAP significant findings per reviewer (most severe first);
    // the rest go to the fixers flagged 'unverified' (they must reproduce before fixing)
    const VERIFY_CAP = 4
    const sorted = (res?.findings ?? []).slice().sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    const significant = sorted.filter((f) => f.severity !== 'low').slice(0, VERIFY_CAP)
    const overflow = sorted.filter((f) => f.severity !== 'low').slice(VERIFY_CAP)
    if (overflow.length) log(`${r.key}: ${overflow.length} more significant findings passed to fixers unverified`)
    const minor = [...overflow, ...sorted.filter((f) => f.severity === 'low')].map((f) => ({ ...f, reviewer: r.key, verdict: { verdict: 'unverified', evidence: '', refinedFix: f.fix, severity: f.severity } }))
    return parallel(
      significant.map((f) => () =>
        agent(
          `${CONTEXT}\n\nYOUR ROLE: skeptical verifier. Another reviewer (${r.key}) reported the finding below. Try hard to REPRODUCE it yourself on the preview build (http://127.0.0.1:4173) or by reading the code; if you cannot reproduce it, or it is not actually a defect (by the contracts / the science / the "museum-quality minimal premium" bar), say refuted. Default to 'unclear' only if you genuinely cannot tell. Give your own evidence (PNG paths you read, numbers, code lines). Refine the fix so a fixer can apply it directly (file, function, exact change), and re-rate the severity. Scratch dir: ${ROOT}/.scratch/review/verify/.\n\nFINDING:\n${JSON.stringify(f, null, 1)}`,
          { label: `verify:${r.key}:${f.title.slice(0, 40)}`, phase: 'Verify', schema: VERDICT }
        ).then((v) => ({ ...f, reviewer: r.key, verdict: v }))
      )
    ).then((vs) => ({ reviewer: r.key, coverage: res?.coverage ?? '', findings: [...vs.filter(Boolean), ...minor] }))
  }
)

const all = reviewed.filter(Boolean).flatMap((r) => r.findings)
const confirmed = all.filter((f) => f.verdict?.verdict === 'confirmed' || (f.verdict?.verdict === 'unclear' && severityRank[f.verdict.severity ?? f.severity] <= 1))
const lowUnverified = all.filter((f) => f.verdict?.verdict === 'unverified')
log(`${all.length} findings; ${confirmed.length} confirmed for fixing; ${lowUnverified.length} low-severity kept unverified; ${all.length - confirmed.length - lowUnverified.length} refuted/unclear dropped`)

phase('Fix')
const OWN = {
  app: 'src/app/*, index.html, scripts/*.mjs',
  'book-engine': 'src/engine/book/*, src/engine/input.js, src/engine/stage.js, src/engine/renderer.js, src/engine/audio.js, book-test.html',
  'figures-export': 'src/engine/figures/FigureHost.js (contract.js is frozen), src/engine/export/*, src/kits/ink/*, src/kits/patterns/*, src/lab/*, lab.html',
  ui: 'src/engine/ui/*, ui.html',
  typeset: 'src/engine/typeset/*, typeset.html',
  snakes: 'src/subjects/snakes/*, src/kits/tube/*',
  flowers: 'src/subjects/flowers/*, src/kits/petal/*',
  skulls: 'src/subjects/skulls/*, src/kits/sdf/*',
  'content-serpientes': 'src/books/serpientes.js, docs/books/serpientes-research.md',
  'content-flores': 'src/books/flores.js, docs/books/flores-research.md',
  'content-calaveras': 'src/books/calaveras.js, docs/books/calaveras-research.md',
}
const byArea = {}
for (const f of [...confirmed, ...lowUnverified]) (byArea[f.area] ??= []).push(f)
const areas = Object.keys(byArea).filter((a) => byArea[a].some((f) => f.verdict?.verdict !== 'unverified') || byArea[a].length >= 2)
log(`Fixing in ${areas.length} areas: ${areas.map((a) => `${a} (${byArea[a].length})`).join(', ')}`)

const fixes = await parallel(
  areas.map((area) => () => {
    const list = byArea[area]
      .sort((a, b) => severityRank[a.verdict?.severity ?? a.severity] - severityRank[b.verdict?.severity ?? b.severity])
      .map((f, i) => `#${i + 1} [${f.verdict?.severity ?? f.severity}${f.verdict?.verdict === 'unverified' ? ', UNVERIFIED — reproduce it first' : ''}] ${f.title}\nfiles: ${f.files.join(', ')}\nevidence: ${f.evidence}\nverifier: ${f.verdict?.evidence ?? ''}\nrepro: ${f.repro}\nfix: ${f.verdict?.refinedFix || f.fix}`)
      .join('\n\n')
    return agent(
      `${CONTEXT}\n\nYOUR ROLE: fixer for area "${area}". YOU OWN (edit only these): ${OWN[area]}. Other fixers edit other areas at the same time — never touch their files; if a fix needs a change elsewhere, describe it in notes.\nUse the DEV server for your checks (http://127.0.0.1:5173 — it hot-reloads your edits; other fixers' edits may reload your page: retry a shot if it says "Execution context was destroyed"): \`cd ${ROOT} && node scripts/shot.mjs "<url>" .scratch/review/fix-${area}/<name>.png …\` and READ every PNG. Run \`node scripts/validate-books.mjs\` after content edits and \`node scripts/audit.mjs\` after figure edits (must stay clean). Keep the code style (2-space, single quotes, semicolons, a short why-comment), no per-frame allocations, both backends (add --webgl).\n\nApply these verified findings (most severe first). Fix each properly at its root cause; skip one only if the verifier's evidence shows it is not real or the fix would clearly make things worse, and say why. Verify each fix visually or numerically.\n\n${list}`,
      { label: `fix:${area}`, phase: 'Fix', schema: FIX_REPORT }
    ).then((r) => ({ area, ...r }))
  })
)

return {
  coverage: reviewed.filter(Boolean).map((r) => ({ reviewer: r.reviewer, coverage: r.coverage })),
  findings: all.map((f) => ({ title: f.title, severity: f.verdict?.severity ?? f.severity, area: f.area, reviewer: f.reviewer, verdict: f.verdict?.verdict, evidence: f.verdict?.evidence?.slice(0, 600) ?? '' })),
  fixes: fixes.filter(Boolean),
}
