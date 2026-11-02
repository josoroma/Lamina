// Archived copy of the review's second round, run on 2026-11-01 (run wf_6ef69955-389):
// integrate the fixers' cross-area hand-offs, rebuild, re-verify all 100 findings on the
// fresh build, then repair. Launched with the Claude Code Workflow tool; see
// docs/prompts/04-review.md ("Round 2") for what it found and fixed.
export const meta = {
  name: 'lamina-integrate',
  description: 'Apply the review fixers\' cross-area hand-offs by file area, rebuild, adversarially re-verify all 100 review findings and hunt regressions on the fresh build, then repair what still fails',
  phases: [
    { title: 'Integrate', detail: 'one agent per file area applies the hand-offs (disjoint files)' },
    { title: 'Build', detail: 'fresh production build, validate, audit, smoke' },
    { title: 'Re-verify', detail: 'one skeptic per review dimension re-checks every finding and hunts regressions' },
    { title: 'Repair', detail: 'one agent per area fixes what re-verification still finds' },
  ],
}

const ROOT = '/Users/josoroma/sites/books'
const R2 = `${ROOT}/.scratch/review2`

const CONTEXT = `PROJECT: **Lámina** (${ROOT}) — interactive, page-turnable 3D scientific books ("living plates"): a realistic hardcover floating on a pure white canvas, typeset pages (Canvas 2D), 3D pop-up figures with ink outlines + engraved hatching (Three.js r186 WebGPURenderer + TSL; WGSL on WebGPU, GLSL on the WebGL 2 fallback), a seamless 5-second scientific animation per plate, layers, labels, explode/dissection, inspect/orbit, portable SVG export. Three books: #/serpientes (7 Costa Rican snakes), #/flores (6 Costa Rican flowers), #/calaveras (6 skull-drawing lessons, engraving style). Bar: production-ready, museum-quality, minimal premium UI, scientifically accurate.

READ FIRST: ${ROOT}/docs/architecture/CONTRACTS.md (contracts, units, schema, canonical ids, style guide, accuracy rules), ${ROOT}/.claude/skills/lamina/references/verify.md (tools + QA checklist) and architecture.md (module map, window.lamina automation API).

HISTORY (important): an adversarial review (8 reviewers) reported 100 findings on the old build; 32 were independently reproduced and all 32 confirmed; the rest went to fixers unverified. Per-dimension finding files (title, severity, area, files, evidence, repro, refined fix, verifier evidence): ${R2}/findings-<reviewer>.json for reviewer in code-app, interaction, visual-serpientes, visual-flores, visual-calaveras, ui-a11y, perf, export-svg. Nine fixers then changed the code; their reports (what they changed, how they verified, what they skipped and why, cross-area hand-offs): ${R2}/fixes-round1.json. Exact copies of every source file BEFORE the fixers: ${R2}/pre-fix/ ; AFTER the fixers (before this round): ${R2}/post-fix/ — diff against them (\`diff -u ${R2}/post-fix/src/x.js ${ROOT}/src/x.js\`) to see exactly what changed. The lead has since retitled Matabuey's loop 'On guard', reworded Flores plate I's 3.7 s beat, and raised the sources budget to 5–20 (validate-books is clean).

HOW TO LOOK AT THINGS
- DEV server http://127.0.0.1:5173 hot-reloads on every save (other agents' saves reload your page: retry a shot that says "Execution context was destroyed"). PRODUCTION PREVIEW http://127.0.0.1:4173 serves ${ROOT}/dist (static; it never reloads; it serves whatever \`npx vite build\` last wrote). If you need a stable build of the current tree for your own checks, build into your own dir (\`npx vite build --outDir .scratch/<you>/dist\`) and serve it on a free port of your own (\`npx vite preview --outDir .scratch/<you>/dist --port 41xx --strictPort\`), and stop it when done.
- Screenshot tool: \`cd ${ROOT} && LAMINA_URL=<origin> node scripts/shot.mjs "<path?query#route>" .scratch/<you>/<name>.png [--w 1600 --h 1000 --wait 2500 --eval "<async js>" --webgl]\` then READ the PNG (you must look at every image you cite). shot.mjs prints console errors.
- Reader URLs: \`/?gl=webgl#/serpientes?plate=3&t=2.4&explode=0.6&layers=skeleton:1&labels=0&ui=0\` (gl=webgl goes in the search part, before the #). window.lamina in the page: \`await lamina.plate(n)\`, \`await lamina.goTo(spread)\`, \`lamina.setTime(t)\`, \`lamina.pause()\`, \`lamina.setLayer(id,on)\`, \`lamina.setExplode(a)\`, \`lamina.setLabels(on)\`, \`await lamina.settle(ms)\`, \`lamina.inspect(true)\`, \`await lamina.exportSVG('color'|'line')\`, \`lamina.info()\`, plus lamina.book / host / ui / stage / renderer.
- Figure workbench: \`lab.html?type=snake|flower|skull&params=<url-encoded JSON>&t=&play=0&view=three-quarter|front|side|top|book|close&layers=id:1&explode=&ui=0\` (window.lab). Pages: \`typeset.html?book=<id>&page=all|<n>&width=1200\` (window.typeset.ready → { overflow, results }).
- Scripted interaction: playwright-core scripts in your scratch dir (import { chromium } from '${ROOT}/node_modules/playwright-core/index.mjs'; launch { channel: 'chrome', headless: true, args: ['--enable-unsafe-webgpu','--enable-features=WebGPU','--use-angle=metal','--ignore-gpu-blocklist'] }). Many earlier probe scripts exist under ${ROOT}/.scratch/review/<key>/ and .scratch/review/verify/ and .scratch/review/fix-<area>/ — reuse them (point them at the right origin).
- Checks: \`node scripts/validate-books.mjs\` (content), \`LAMINA_URL=<origin> node scripts/audit.mjs [--webgl]\` (every figure: seamless loop, build time, update cost; must stay 19/19).

RULES: Do NOT commit or run git. Do not stop servers you did not start. Write scratch files only under ${ROOT}/.scratch/<your-dir>/. Keep the code style (2-space, single quotes, semicolons, a short why-comment where the reason is not obvious), no per-frame allocations, both backends (WebGPU and ?gl=webgl). Report only what you actually observed; cite PNGs you looked at, numbers, console text.`

const AREAS = ['app', 'book-engine', 'figures-export', 'ui', 'typeset', 'snakes', 'flowers', 'skulls', 'content-serpientes', 'content-flores', 'content-calaveras']
const OWN = {
  app: 'src/app/*, index.html, scripts/*.mjs',
  'book-engine': 'src/engine/book/* (Book.js, paper.js, …), src/engine/input.js, src/engine/stage.js, src/engine/renderer.js, src/engine/audio.js, book-test.html',
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

const INTEG = {
  app: `1. src/app/a11y.js plateHTML: the IUCN status line uses esc() for its label and source, so the Bocaracá Read sheet shows a literal '*B. schlegelii*'. Use the existing inline() markdown renderer there (as the rest of the plate text does) and check the phone Read sheet on plate II.
2. Reader → ui.renderLabels(items, area, fig): while inspecting, also pass area.spine = [x0, y0, x1, y1] in CSS px (the projected endpoints of book-local x = 0, z = ±WORLD.pageH/2), so left-column pills stay right of the gutter (the UI already implements spine; see the ui notes in fixes-round1.json). Check inspect on a few plates.
3. Reader → ui.setSpread: pass kind: plate.layout === 'lesson' ? 'Lesson' : 'Plate' (used by aria labels and the export title).
4. Reader.capLabels occlusion hysteresis: an occluded label that the reader did not ask for is hidden at once today, so labels blink (the ui fixer measured Terciopelo 'Forked tongue' hidden in 155 of 305 frames, 4 blinks per loop; Profile 'Orbit' 3 blinks). Hide only after it has been occluded continuously for about 0.4 s; show again as soon as it is unoccluded. No per-frame allocations (a Map of id → occluded-since, cleared on spread/figure change). Measure blinks per loop before/after on those two plates.
5. Snake skin-off: switching the 'skin' layer off on a snake plate whose inner layers (skeleton, venom) are all off now leaves an empty page (the snakes fixer hid everything that used to float). When the reader switches skin off and no other layer that shows parts is on, also switch 'skeleton' on through the same path the UI uses (host.setLayer + UI state + announce), so peeling the skin shows the bones. Only in that case; the reader can still switch the skeleton off afterwards.
6. src/app/Library.js: call loadFonts(m.theme ?? {}, { manifest: m, layouts: ['cover'] }) (the typeset fixer's new option: the library fetches about 5 font files instead of 15). Check the covers look identical (compare a library shot before/after).
7. Dead code: the Reader's rig.bottomInset fallback (rig.setInsets exists now) and the typeof rig.showPage branch (there is no showPage; focusPage is what runs). Remove them without changing behaviour; re-check portrait page stepping (390x844 and 768x1024) and the caption reserve at 1440x900.
8. Optional (skip with a reason if it cannot be robust and generic): lookCloser() on a paused loop (reduced motion, or the reader paused) can land on a label that is occluded at that moment (Palicourea 'Flower' inside the closed lips at t = 0). If cheap, seek the figure to the nearest time where that label's anchor is unoccluded.`,
  'book-engine': `1. src/engine/input.js hover: the cursor shows 'grab' inside a cheap 0.75x bounding sphere around the pop-up, so blank paper near the figure advertises figure rotation while a press there (correctly, via the precise pickFigure) starts a page gesture. Make the hover test precise too (host.pickFigure ray), throttled so hover costs on average under 1 ms per pointermove even on the 310k-triangle Calaveras skulls (e.g. sphere cull first, then at most one precise pick per ~80–100 ms, reuse the last answer in between). 'grab' only over the figure; paper keeps the page cursor.
2. src/engine/stage.js: zoomBy's inspect clamp is 6 while inspect() clamps at 8. Make them agree (pick the value that matches the Reader's new toggleInspect distances; see the app notes in fixes-round1.json).
3. src/engine/stage.js createLights (optional, only if the shadows stay pixel-identical on both backends): three r186's PCF shadow filter builds reference('mapSize')/reference('radius') in renderGroup on every material build, about 10 bind groups retained per figure mount. Give the key light a shadow.filterNode whose uniforms are created once per light (avoid screenCoordinate on WebGL). Measure heap per mount cycle before/after (reuse .scratch/review/fix-figures-export or verify heap scripts) and compare shadow crops; skip with numbers if it is not clean.
4. src/engine/book/paper.js + Book.js: paper.js's shared module-level blank textures are never freed; the Reader no longer depends on them, but the Library (and lab/book-test) still create Books. Check whether a library ↔ reader cycle still retains textures/canvases (CDP queryObjects or renderer.info.memory over 5 cycles); if it does, root-fix it (per-Book blanks disposed in Book.dispose) without changing any visual.
5. At zoom 1 a mostly vertical drag on a resting page starts a page drag that goes nowhere but still fires turnstart/release/turnend, plays a swoosh and a tap and briefly hides labels. If you can make that a silent no-op without breaking real corner peels (steep first movement on the fore-edge), do it; otherwise explain.`,
  'figures-export': `1. FigureHost._updateOcclusion: label rays must ignore meshes with userData.noOcclude (the sea snake's water slab sets it; today 'Yellow belly' and 'Paddle tail' are flagged occluded and drawn hollow) while those meshes stay pickable (dragging on the water must still turn the figure). Check plate VI labels at several t.
2. FigureHost.setLayer: switching on a layer whose parts are already shown (e.g. the snakes' explode dissection already reveals the skeleton) restarts the dissolve at 0, so the bones blink out and fade back in over ~0.38 s. Start the fade from the parts' current visible state. Check on Serpientes plate I: explode 1, then switch the skeleton layer on.
3. Export flags: the skulls agent is switching the Calaveras planes mesh from userData.noExport to the exporter's canonical userData.export = 'skip' (idpass isGhost) in this round. At the end of your work, export Calaveras plate I at t = 2.5 and 3.0 (colour and line) and confirm the planes block-in region is absent (or, if the skulls change has not landed yet, say so). Do not add a second flag name.
4. Exports now take 0.2–1.9 s. Measure the first and a warm export per book; if an obvious hot spot can be cut without changing the output (e.g. redundant passes, per-pixel allocations), do it, and confirm the SVGs are byte-identical or visually identical.`,
  ui: `1. Wording: the screen-reader section's aria-label 'Plate text' → 'Page text', and the Read button's 'Read the plate text' → 'Read this page' (the sheet now also shows the introduction, afterword, glossary, imprint).
2. Help card: add rows for [ and ] (turn the figure 15°) and, while inspecting, ← → (turn the figure) and ↑ ↓ (tilt the view); the Reader already handles them.
3. Landscape phones (about 844x390, 740x360, 667x375): the Reader caps the bottom reserve at 18% of the height, so the beat caption (now on a frosted pill) still lies over the book's tail edge. Choose the best treatment for a premium, uncluttered reader (e.g. a compact single-line caption inside the reserved band, or hiding the caption on short landscape screens while the narration stays available in the live region and the Read sheet) and verify on both backends at those sizes plus 1440x900 (unchanged).
4. Export feedback: exports now take 0.2–1.9 s. If one takes longer than ~300 ms, show a quiet busy state on the export control/menu item until the toast, without layout shift.`,
  typeset: `1. The printed contents page (front matter, layouts/front.js or wherever the contents is set): make every listed entry clickable. Plate entries already carry P.hit goto regions; add matching goto regions for every front/back-matter entry the page lists (introduction, afterword/note, sources, glossary — whatever is printed), with the right spread numbers (page order in CONTRACTS). Verify with real clicks in the reader at the projected hit centres (lamina / book.pick) on all three books, both backends.
2. After the content-calaveras agent's edits land (it is trimming the Calaveras 'bones' lesson text, which auto-fits at 90%), report the final auto-fit scale of every side of every book (typeset.html?book=<id>&page=all; flag anything below 0.95).`,
  skulls: `1. src/subjects/skulls/rig.js: the planes mesh sets userData.noExport = true, a flag the exporter never reads. Use the exporter's canonical flag userData.export = 'skip' (see src/engine/export/idpass.js isGhost) instead; verify Calaveras plate I colour + line exports at t = 2.5 and 3.0 have no planes region.
2. src/subjects/skulls/index.js (~line 101): put the lesson's own labels first — [...(lesson.labels ?? []), ...rigLabels, ...(snake?.labels ?? [])] — so Temporalis and Masseter make the reader's label cap on lesson II (open jaw). Verify in the reader at 1600x1000 and 1366x768.
3. Occluder proxies (perf): label rays still cost single 6–18 ms spikes on the 310k-triangle skulls. FigureHost now honours mesh.userData.occluder (a coarse stand-in mesh used only for label rays). Build low-resolution proxy meshes for the bones/teeth (e.g. a low-quality SDF mesh, or a decimated copy) and attach them — only if the figure build time grows by at most ~15% (audit build ms before/after) and the set of hollow (occluded) labels at t = 1, 2.5, 4 on plates I, II, IV, V stays the same. Otherwise skip with numbers.
4. Expose figure.keyTime (the lesson's key time) so the exporter skips its loop scan.
5. In your report, state factually where the Lesson VI snake passes relative to the zygomatic arch and the ramus in 3D (the content agent is rewording that lesson's text in parallel).`,
  snakes: `1. SVG swatches: the exporter (src/engine/export/raster.js, index.js) accepts parts[].swatches = [{ color, name }] | false on a figure part to print exact pattern colours with names instead of measured k-means colours. Declare them where a species has named pattern colours: coral (Red ring, Black ring, Yellow ring — the species' own hexes), sea snake (Black back, Yellow belly), and the others with clear named colours (terciopelo, cascabel, matabuey, boa, bocaracá — use names that match the plate text and labels). Read raster.js first to see how swatches are matched to pixels (tolerances, shading) so declared colours actually match. Export colour + line for all 7 plates on the dev server (both backends for at least plates III and VI), render them (e.g. qlmanage -t -s 1400 -o <dir> file.svg, or a playwright page), and READ them: rings/back/belly in the right exact colours, key names right, no lost patterns.
2. Run audit.mjs (snakes stay seamless) and validate-books.`,
  'content-calaveras': `1. Lesson VI (skull and snake) text vs the figure: the body text says the loop goes 'out of an orbit, over brow and vault, behind the ear, back under the cheekbone arch. Where body and bone overlap, depth appears without shading.'; step 02 says '…back under the cheekbone…'; the look-closer note on zygomatic-arch says 'A bridge of bone: pass beneath it for depth.' In the 3D figure the snake runs about 2.5 cm below the arch, outside (lateral to) the ramus, and the redrawn construction panels (src/subjects/skulls/steps.js skullSnake) route it 'under the cheekbone and back across the cheek into the socket'. Look at the figure yourself (reader plate 6 at t = 0, 1.25, 2.5, 3.75, and lab.html views front/side) and the printed panels (typeset.html?book=calaveras), then reword every affected string (body, steps, look-closer, beats, caption, glossary if relevant) so the text matches what the reader sees, keeping the drawing lesson's point about overlaps creating depth. Keep the budgets; validate-books; typeset fit; log each change (old → new, why) in docs/books/calaveras-research.md.
2. The 'bones' lesson text side (lesson IV) auto-fits at 90%, the QA floor. Trim it so it sets at ≥ 95% without losing any fact or instruction; verify with typeset.html?book=calaveras&page=all (results[].scale) and read the page image.`,
}

const INTEG_REPORT = {
  type: 'object',
  properties: {
    done: { type: 'array', items: { type: 'object', properties: { task: { type: 'string' }, change: { type: 'string' }, verification: { type: 'string' } }, required: ['task', 'change', 'verification'] } },
    skipped: { type: 'array', items: { type: 'object', properties: { task: { type: 'string' }, reason: { type: 'string' } }, required: ['task', 'reason'] } },
    files: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['done', 'skipped', 'files', 'notes'],
}

phase('Integrate')
log(`Integrating hand-offs in ${Object.keys(INTEG).length} areas`)
const integration = (await parallel(Object.entries(INTEG).map(([area, tasks]) => () =>
  agent(`${CONTEXT}\n\nYOUR ROLE: integrator for area "${area}". YOU OWN (edit only these): ${OWN[area]}. Other integrators edit other areas at the same time — never touch their files; if something needs a change elsewhere, describe it exactly in notes. Use the DEV server or a private build for checks. Scratch dir: ${ROOT}/.scratch/integrate-${area}/.\n\nThese are the cross-area hand-offs the review fixers left for your area (their context is in ${R2}/fixes-round1.json). Do each one properly at its root, verify it visually or numerically on both backends, and do not regress anything the fixers fixed (diff ${R2}/post-fix against the tree to see their work).\n\nTASKS:\n${tasks}`,
    { label: `integrate:${area}`, phase: 'Integrate', schema: INTEG_REPORT }).then((r) => r && { area, ...r })
))).filter(Boolean)

phase('Build')
const build = await agent(`${CONTEXT}\n\nYOUR ROLE: release builder. Every integrator has finished. 1) \`cd ${ROOT} && npx vite build\` — if it fails, fix ONLY the build-breaking line(s) minimally and say exactly what you changed. 2) Confirm the preview at http://127.0.0.1:4173 now serves this build (fetch / and compare its module script hash with dist/index.html). 3) Run \`node scripts/validate-books.mjs\`, \`LAMINA_URL=http://127.0.0.1:4173 node scripts/audit.mjs\` and the same with --webgl. 4) Smoke shots from 4173, reading each PNG: library 1600x1000; #/serpientes?plate=3, #/flores?plate=2, #/calaveras?plate=1 at 1440x900 with UI; #/serpientes?plate=6 phone 390x844; one ?gl=webgl reader. Report any console error, failed check or visibly broken view. Scratch dir: ${ROOT}/.scratch/build2/.`,
  { label: 'build', phase: 'Build' })

const FOCUS = {
  'code-app': 'the integration layer (src/app/*: boot, Reader, Library, pages, a11y, app.css) and how it drives the engine: route races and abort/activate, leaks (page textures and canvases, listeners, timers), URL edge cases, dispose idempotence, the window.lamina automation API, portrait page stepping. Also read the NEW code line by line (diff against pre-fix and post-fix) for real bugs.',
  interaction: 'real input with genuine events (playwright mouse/wheel/keyboard, CDP touch): drag turns, short drags springing back, flicks, clicks on recto/verso, swipes (including the portrait back-swipe), pan while zoomed, pinch, double-click/double-tap inspect, [ and ] and inspect arrows, Esc, the layers popover and sliders, the contents drawer, printed hit regions, export menu; desktop 1440x900, phone 390x844, tablet 768x1024; both backends; reduced motion (turns are now instant cuts).',
  'visual-serpientes': 'the book #/serpientes visually AND scientifically: every spread; every plate I–VII at t = 0, 1.25, 2.5, 3.75 with labels, each layer on/off (skin off now shows bones), explode 0.8 (now a dissection), inspect; WebGPU 1600x1000, WebGL 1440x900, phone 390x844, tablet 768x1024; figure vs text (beats, captions, labels, look-closer), sources page.',
  'visual-flores': 'the book #/flores visually AND scientifically: every spread; every plate I–VI at t = 0, 1.25, 2.5, 3.75 with labels, layers on/off, explode 0.8, inspect; WebGPU 1600x1000, WebGL 1440x900, phone 390x844, tablet 768x1024; figure vs text (hummingbird visit, falling corolla, palicourea head of 7 flowers, passiflora single-day swap, guarianthe rewind).',
  'visual-calaveras': 'the book #/calaveras visually AND anatomically: every spread including the lesson versos with their three construction panels; every lesson figure at t = 0, 1.25, 2.5, 3.75 (labels must never point at empty paper or at hidden bones), layers, explode, inspect; nasal bones, zygomatic arch, jaguar cranium and 30 teeth, profile grid, Lesson VI path and panels vs text; WebGPU 1600x1000, WebGL 1440x900, phone, tablet.',
  'ui-a11y': 'the overlay UI and the library: beat caption on its frosted pill (desktop, tablet, phone, landscape phone, inspect), label pills (never on the figure, never covering their anchors, stable through the loop, ranks/caps), layers popover placement and scrubbing, the phone Read sheet (header, facts, look-closer rows, every non-plate spread), contrast (the derived accent text colour), focus order and Esc, ARIA live region, touch targets, help card completeness.',
  perf: 'performance and robustness on the preview build: frame time median/p95 per plate per book (1600x1000 WebGPU and WebGL, phone at DPR 2), page-turn hitches (shader warm-up), label occlusion cost on Calaveras, GPU-process memory and page canvases across a full read-through, heap growth per figure mount, route churn, GPU context/device loss recovery (reload), font downloads per route.',
  'export-svg': 'the portable SVG export for EVERY plate of all three books, colour and line: patterns (rings, saddles, blotches, bracts) and their exact colours, translucent overlays left out, line art (fold/overlap lines, closed outlines), markers and leaders, the key (no cut words, occluded look-closer labels kept), contact shadow, identical frames between colour and line, Calaveras construction-stage exports (key pose), well-formed XML (xmllint), sizes and export time.',
}

const REVERIFY = {
  type: 'object',
  properties: {
    results: { type: 'array', items: { type: 'object', properties: {
      n: { type: 'number' }, title: { type: 'string' },
      status: { type: 'string', enum: ['fixed', 'partly', 'not-fixed', 'regressed', 'ok-skip'] },
      evidence: { type: 'string' }, area: { type: 'string', enum: AREAS }, remaining: { type: 'string' } },
      required: ['n', 'title', 'status', 'evidence', 'area', 'remaining'] } },
    regressions: { type: 'array', items: { type: 'object', properties: {
      title: { type: 'string' }, severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      area: { type: 'string', enum: AREAS }, files: { type: 'array', items: { type: 'string' } },
      evidence: { type: 'string' }, repro: { type: 'string' }, fix: { type: 'string' } },
      required: ['title', 'severity', 'area', 'files', 'evidence', 'repro', 'fix'] } },
    coverage: { type: 'string' },
  },
  required: ['results', 'regressions', 'coverage'],
}

phase('Re-verify')
const integSummary = JSON.stringify(integration.map((r) => ({ area: r.area, done: r.done.map((d) => `${d.task.slice(0, 80)} → ${d.change.slice(0, 400)}`), skipped: r.skipped, notes: r.notes.slice(0, 1500) })), null, 1)
const reverified = (await parallel(Object.keys(FOCUS).map((key) => () =>
  agent(`${CONTEXT}\n\nYOUR ROLE: skeptical re-verifier for review dimension "${key}" — ${FOCUS[key]}\nThe production preview at http://127.0.0.1:4173 has just been rebuilt from the current tree (build report below). Use ONLY 4173 (it never reloads). Do NOT edit any project file. Scratch dir: ${ROOT}/.scratch/reverify/${key}/.\n\n1) Read ${R2}/findings-${key}.json. For EVERY finding in it (verified or not), re-run its repro on the new build yourself and classify it: fixed (the defect is gone and the fix looks right), partly (better but still visibly wrong), not-fixed, regressed (worse, or the fix broke something nearby), ok-skip (the fixer skipped it and the stated reason in ${R2}/fixes-round1.json holds up). Try hard to show a fix did NOT work: test the edge cases, other plates, both backends, other viewports. Give concrete evidence (PNG paths you looked at, numbers) and, for anything not fixed, the exact remaining fix.\n2) Hunt REGRESSIONS in your dimension that the fixes or the integration round may have introduced (diff ${R2}/pre-fix and ${R2}/post-fix against the tree to see what changed). Report only real, reproducible problems; rank severity honestly (critical = broken/crash/misleading science; high = clearly visible defect or broken interaction; medium = noticeable polish/accuracy issue; low = minor).\n\nBUILD REPORT:\n${String(build).slice(0, 3000)}\n\nINTEGRATION ROUND (what changed in this round, by area):\n${integSummary.slice(0, 14000)}`,
    { label: `reverify:${key}`, phase: 'Re-verify', schema: REVERIFY }).then((r) => r && { key, ...r })
))).filter(Boolean)

const open = []
for (const r of reverified) {
  for (const x of r.results) if (['partly', 'not-fixed', 'regressed'].includes(x.status)) open.push({ title: x.title, severity: x.status === 'regressed' ? 'high' : 'medium', area: x.area, files: [], evidence: x.evidence, repro: '', fix: x.remaining, from: `${r.key} #${x.n} (${x.status})` })
  for (const g of r.regressions) open.push({ ...g, from: `${r.key} regression` })
}
const counts = {}
for (const r of reverified) for (const x of r.results) counts[x.status] = (counts[x.status] ?? 0) + 1
log(`Re-verify: ${JSON.stringify(counts)}; ${reverified.reduce((a, r) => a + r.regressions.length, 0)} regressions; ${open.length} items to repair`)

phase('Repair')
const sev = { critical: 0, high: 1, medium: 2, low: 3 }
const byArea = {}
for (const f of open) (byArea[f.area] ??= []).push(f)
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
const repairs = (await parallel(Object.keys(byArea).filter((a) => OWN[a]).map((area) => () => {
  const list = byArea[area].sort((a, b) => sev[a.severity] - sev[b.severity])
    .map((f, i) => `#${i + 1} [${f.severity}] ${f.title}\nfrom: ${f.from}\nfiles: ${(f.files ?? []).join(', ')}\nevidence: ${f.evidence}\nrepro: ${f.repro}\nfix: ${f.fix}`).join('\n\n')
  return agent(`${CONTEXT}\n\nYOUR ROLE: repairer for area "${area}". YOU OWN (edit only these): ${OWN[area]}. Other repairers edit other areas at the same time — never touch their files; describe cross-area needs in notes. Use the dev server (5173) or a private build of your own for checks. Scratch dir: ${ROOT}/.scratch/repair-${area}/.\n\nThe items below were found still failing (or newly broken) by independent re-verifiers on the fresh production build. Re-check each one first (the re-verifier may be wrong — say so with evidence and skip), then fix it at the root, verify on both backends, and do not regress the rest. Run validate-books after content edits and audit.mjs after figure edits.\n\n${list}`,
    { label: `repair:${area}`, phase: 'Repair', schema: FIX_REPORT }).then((r) => r && { area, ...r })
}))).filter(Boolean)

return { integration, build, reverified, repairs, openCount: open.length, counts }