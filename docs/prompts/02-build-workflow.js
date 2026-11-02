export const meta = {
  name: 'lamina-build',
  description: 'Build Lámina in parallel: book engine, typesetting, UI, figure host + SVG export, three subjects, and three fact-checked books',
  phases: [
    { title: 'Build', detail: 'seven code specialists with disjoint file ownership' },
    { title: 'Content', detail: 'research and write one manifest per book' },
    { title: 'Fact-check', detail: 'two adversarial checkers per book, different lenses' },
    { title: 'Revise', detail: 'apply verified corrections per book' },
  ],
}

const ROOT = '/Users/josoroma/sites/books'

const PRE = `You are one of ten specialists building **Lámina** — interactive, page-turnable 3D scientific books ("living plates") rendered with Three.js r186 WebGPURenderer + TSL (WGSL on WebGPU, GLSL on the WebGL 2 fallback). Repo: ${ROOT}. The lead engineer wrote a working, verified skeleton and the contracts.

FIRST read ${ROOT}/docs/architecture/CONTRACTS.md completely (the source of truth: APIs, ownership, conventions, the three books, canonical ids, style guide, accuracy rules). Then skim the skeleton you depend on: src/engine/renderer.js, src/engine/stage.js, src/engine/book/{Book.js,pageCurl.js,paper.js}, src/kits/ink/index.js, src/engine/figures/{contract.js,FigureHost.js}, src/subjects/demo/index.js (a complete minimal Figure), src/lab/lab.js, scripts/shot.mjs.

Ground rules
- Edit ONLY the files/directories you own (listed in your brief). Create new files only inside them. Read anything.
- Do NOT run npm install (unless your brief says you own package.json). Do NOT commit. Do NOT stop/restart the dev server at http://127.0.0.1:5173 (it is running; only if it is down, start it in the background: \`cd ${ROOT} && npx vite --port 5173 --host 127.0.0.1 &\`).
- Nine other specialists edit their own areas at the same time. If something outside your area is temporarily broken, wait 30–60 s and retry, or work around it in your own harness. Never edit their files; mention the problem in your report.
- Verify visually and iterate: \`cd ${ROOT} && node scripts/shot.mjs "<path?query>" .scratch/<your-key>-<n>.png [--w 1440 --h 900 --wait 1500 --eval "<js>"]\` then Read the PNG. shot.mjs prints page console errors — a TSL/WGSL compile error only shows up there, so always read its output. Also check the WebGL 2 fallback with \`--webgl\`. Keep iterating until it looks museum-quality, not merely "working".
- Three.js is 0.186.1: \`import * as THREE from 'three/webgpu'\`, TSL from \`'three/tsl'\`. When unsure about an API, read node_modules/three/src (e.g. grep the TSL export list: \`grep -o "export {[^}]*}" node_modules/three/build/three.tsl.js\`). Never use wgslFn/glslFn (breaks one backend). Never set scene.background.
- Production quality: complete code, no TODO stubs, JSDoc on public functions, a short header comment per file explaining why, match the skeleton's style (2-space indent, single quotes, semicolons). Dispose GPU resources. No per-frame allocations in hot loops. Respect prefers-reduced-motion.
- Write files atomically (whole-file writes or careful edits) so other agents never load a half-written module.
- When done, return the structured report: what you built, every file you created/changed, the public API others must call, how you verified (which screenshots, what you saw), and honest known issues.`

const REPORT = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'What was built, in 5-12 sentences' },
    files: { type: 'array', items: { type: 'string' }, description: 'Every file created or changed' },
    api: { type: 'string', description: 'Public API / integration notes others need (signatures, params, ids, gotchas)' },
    verification: { type: 'string', description: 'How it was verified: screenshot paths and what they showed, backends tested' },
    knownIssues: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'files', 'api', 'verification', 'knownIssues'],
}

const builders = [
  {
    key: 'book-engine',
    prompt: `YOUR ROLE: book-engine specialist.
YOU OWN: src/engine/renderer.js, src/engine/stage.js, src/engine/book/* (Book.js, pageCurl.js, paper.js, + new files), src/engine/input.js (new), src/engine/audio.js (new), book-test.html (new) with its harness src/engine/book/harness.js (new). The lead owns index.html, src/main.js and src/app/* — do not edit those (copy what you need from src/main.js into your harness).

GOAL: make the 3D book itself breathtakingly real, elegant and robust, and provide the input + audio layers.

1. Book realism (Book.js, paper.js, stage.js):
 - Pure white world: every viewport pixel outside the book's shadow must stay #ffffff (verify by sampling corners/edges of screenshots with python3 PIL). Replace the large grey contact-shadow haze with a tight, soft contact shadow directly beneath the book (plus the real shadow-map shadows). The book floats subtly (keep, reduced-motion aware).
 - Remove the protruding spine tube. Model the binding: leaves meet in a natural gutter; the boards' spine sits under/behind the gutter (invisible from above) with an optional headband detail (small coloured band at head and tail — premium touch).
 - Paper must read as near-white warm paper (#fbf8f1) — today it renders dull cream (~#ede6da). Rebalance light intensities/tone mapping (renderer uses NeutralToneMapping with a transparent clear over CSS white) so the page centre samples ≈ 244–250 while keeping soft curvature shading and crisp figure shadows. Coordinate with the ink look: the figures (lab) use the same light rig values — keep stage lights and src/lab/lab.js lights consistent by exporting your final rig from stage.js (e.g. export function createLights()) and say so in your report (the figure-host agent owns lab.js and will adopt it).
 - Page blocks: fore-edge + head/tail faces with fine striations, correct heights from leaf counts, no z-fighting, no gaps, nothing poking through the top leaf, hidden when ≤ 1 leaf.
 - Boards: cloth, thickness, slightly larger than pages (overhang), inside shows endpaper, outside the cover art. The front board opens like a hinge when going from opened=0 (closed book, cover up) to 1; the back board can close the book at the end. Closed-book state must look like a real closed hardcover lying on its back (block + boards + cover art facing the camera).
 - Fix the leaf visibility bug: when the top resting leaf of a side is in flight, the next resting leaf beneath must be shown (today the board's endpaper shows through). General rule: for each side show the top-most RESTING leaf; in-flight leaves are always visible; stack blocks sized from resting leaves.
 - Turning: natural lift → airy top → settling fall (fore-edge leads while rising, trails while falling — see pageCurl.js autoCurl), corner twist when grabbed by a corner, a hint of paper stiffness, spring-back if released before half-way, fling velocity, several leaves in flight at once (goTo riffles with stagger), duration ≈ 0.9 s. Consider a subtle translucency/backlight so a lifted page glows faintly. Analytic normals instead of computeVertexNormals if you can (performance).
 - Implement book.pick(raycaster) → { leaf, side: 'front'|'back', u, v (0..1, v from the page head), s, z } | null for pages AND boards.
 - Camera rig (stage.js CameraRig): lower the elevation to ~42–48° so pop-up figures read in 3/4 view while text stays legible; landscape: the open book spans ~95% of the viewport width ("full width"); portrait (aspect < 0.9): frame a single page — expose rig.focusPage('left'|'right'|'spread'); smooth damped transitions; inspect mode: rig.inspect(targetWorld, distance), rig.exitInspect(), rig.orbit(dAzimuth, dElevation) (clamped), rig.zoomBy(factor, ndcPoint?) (book mode zooms toward the pointer, clamp 1×–3×; inspect mode dollies). Keep rig.refit()/snap()/update(dt).
2. Input (src/engine/input.js): export createInput({ canvas, stage, book, host, onTap, onHover, onInspect }) → { dispose }. Pointer events (mouse/touch/pen) with routing on pointerdown: (a) ray hits the active pop-up figure (host.active?.anchor subtree meshes; skip outlines via userData.isOutline) → drag rotates the figure yaw via host.rotateActive(dx*k); (b) hits a page/board → page drag via book.beginDrag(side, z)/dragTo(x, z)/endDrag() using the pointer's projection onto the book plane in book-local coordinates (side +1 when starting on the recto, −1 on the verso); small movement = tap → onTap({ kind: 'page'|'figure'|'background', leaf, side, u, v }) (the lead maps taps: recto tap → next, verso tap → prev, hits → actions); (c) background drag does nothing. Two-finger pinch → rig.zoomBy; wheel: vertical → zoom; horizontal (trackpad two-finger swipe) → next/prev with an accumulator + cooldown; fast horizontal touch swipe → next/prev. Double-click/double-tap on the figure → onInspect(). Cursor hints: grab/grabbing over pages and figures, pointer over hits. Must not fight browser gestures (touch-action none on canvas).
3. Audio (src/engine/audio.js): export createAudio() → { enabled, setEnabled(b), turn(speed), riffle(n), tap(), unlock() } — procedural WebAudio page sounds: soft paper swoosh (band-passed noise with a fast attack and an airy tail) + a quiet landing tap, varying with speed, very tasteful and low volume. AudioContext created lazily on first user gesture. No audio files.
4. Harness book-test.html + src/engine/book/harness.js: a full demo of the book with placeholder pages (reuse src/app/placeholder.js), demo figures on several rectos (type 'demo'), keyboard/click/drag/swipe/wheel via your input module, sounds, a tiny debug panel (opened, leaf states, fps). window.bookTest debug handle with freeze(leaf, p, bend, twist) so you (and the lead) can screenshot mid-turn states deterministically.
5. Performance: update only dirty leaves; zero allocations per frame; 60 fps.

VERIFY with screenshots (Read every PNG): closed book; open mid-book spread; frozen mid-turn at p=0.3 and p=0.7 (with and without corner twist); a riffle in progress; portrait 390×844 single-page focus; inspect mode; WebGL fallback. Sample pixels to prove the white background and paper brightness. Report the final light values and every API change (Book, CameraRig, input, audio) precisely — the lead integrates them.`,
  },
  {
    key: 'typeset',
    prompt: `YOUR ROLE: typesetting specialist — every printed page of the books is a canvas you draw.
YOU OWN: src/engine/typeset/* (new), typeset.html (new), and package.json/package-lock.json (you are the ONLY agent allowed to run npm install; install exactly these and nothing else: @fontsource/cormorant-garamond @fontsource/eb-garamond @fontsource/ibm-plex-sans-condensed @fontsource/ibm-plex-mono @fontsource/oswald).

GOAL: museum-quality book typography and printed ornament, deterministic and fast, per CONTRACTS §6, §7, §13.

Deliver src/engine/typeset/index.js exporting:
- loadFonts(theme) — imports the @fontsource CSS (weights you need: Cormorant Garamond 500/600 + italic, EB Garamond 400/500 + italic 400, IBM Plex Sans Condensed 400/500/600, IBM Plex Mono 400/500, Oswald 500/600) and awaits document.fonts.load for each face actually used, with a timeout fallback (Georgia/serif) so pages always render.
- buildSides(manifest) → ordered array of page specs following CONTRACTS §6 "Page order (leaves)" exactly (sides[2i] = recto/front of leaf i, sides[2i+1] = verso/back), each with { layout, folio, runningHead, book, ...data } and a stable key; plus leafCount. Plates become (plate-text verso, plate-figure recto); lesson plates become (lesson-text, lesson-figure). Folios: arabic, counting from the title page = 1; none on cover/endpapers/blank.
- renderPage(page, { theme, width = 1536, stepDrawer }) → { canvas, hits } for layouts: cover, back-cover, endpaper, title, imprint, contents, intro, howto, plate-text, plate-figure, lesson-text, lesson-figure, note, glossary, sources, blank. Page canvas = width × round(width·1.38); cover/back-cover canvas aspect = (1+0.028) : (1.38+0.056) (boards overhang). hits: [{ id, rect: [u0,v0,u1,v1] in 0..1 (v from top), action }] with actions { type:'goto', plate:n } (contents entries), { type:'label', id } (look-closer items), { type:'layer', id } (optional).
- Internals you design: rich text (inline *italic* and **bold** markup, justified paragraphs with hyphenation — implement a compact English hyphenation heuristic and honour soft hyphens; never leave rivers/huge gaps: fall back to ragged-right when a justified line would stretch > 35%), widow/orphan control, drop caps on the intro, small caps & letter-spaced running heads/kickers (canvas letterSpacing), tabular facts with leader dots, rules and fleurons drawn as vector paths, plate frames, conservation-status chip (IUCN code in a rounded badge), venom/property badge, "Look closer" checklist with small checkbox glyphs, "Did you know?" box, figure caption + scale note + a faint printed ground ellipse where the pop-up stands (CONTRACTS §5 FigureHost: figure footprint centred at page-local s=0.5, z=−0.02 → canvas x = 0.5·W, y = (0.5 − 0.02/1.38)·H), and a quiet instruction line (e.g. "Drag to turn the figure · double-click to inspect").
- Auto-fit: if any text block overflows, step the size down (≥ 85% of nominal), and console.warn('[typeset] overflow', page.key) if it still does. Text must never be clipped.
- Covers: cloth ground (woven texture via noise), foil-stamped title (metallic gradient + subtle emboss highlight/shadow), blind-debossed frame, and an ORIGINAL emblem drawn with canvas paths per book: serpientes = a coiled snake; flores = an orchid/heliconia spray; calaveras = a construction-line skull (circle, centre line, sockets). Back cover: emblem small + one-line blurb. Endpapers: elegant repeat patterns (scales / botanical leaves / anatomical grid), from theme.endpaper.
- lesson-text (drawing book): big vertical condensed title (Oswald, rotated 90°, uppercase) like a technical step-by-step guide, a "Pro tip" paragraph, three numbered construction step panels (01 02 03) — each panel calls opts.stepDrawer?.(g2d, step, box) to draw the diagram (the App passes the skulls module's drawStep bound to the plate params); if absent, draw your own neutral placeholder (circle + centre line) — plus mistakes/proportions notes. Must look like a high-end instructional book, ORIGINAL design.
- Themes: all colours/fonts from manifest.theme (see §6); serpientes/flores lithograph style, calaveras engraving style (pure white paper, black ink, condensed titles).

Also deliver typeset.html (+ src/engine/typeset/preview.js): typeset.html?book=<id>&page=all|<index>&width=1024 renders every side of a book as a grid of page canvases (2 per row like spreads, verso left/recto right) for visual review. It loads src/books/<id>.js if present (content agents are writing them right now — they appear over the next hour), otherwise your own rich sample manifest src/engine/typeset/sample.js that exercises every layout with realistic text lengths (respect the text budgets in CONTRACTS §6). Try importing the skulls module's drawStep dynamically for lesson pages (it may not exist yet — fall back gracefully).

VERIFY: screenshot every layout at width 1536 (Read the PNGs, zoom in with --w/--h large and crop-by-viewport if needed), check against all three themes, and once real manifests exist in src/books/, render them too and fix overflows. Report the exact API, the page-order mapping, font loading behaviour, and any manifest fields you rely on.`,
  },
  {
    key: 'ui',
    prompt: `YOUR ROLE: interface specialist — the minimal, premium HTML overlay around the 3D book.
YOU OWN: src/engine/ui/* (new) and ui.html (new) with harness src/engine/ui/harness.js.

GOAL: implement CONTRACTS §8 exactly (createUI and its methods) with a design that feels like a luxury museum app: almost invisible until needed, beautiful when it appears. No frameworks; vanilla JS + one CSS file (src/engine/ui/ui.css, imported from index.js). System font stack: ui-sans-serif, -apple-system, "SF Pro Text", "Helvetica Neue", Arial (no webfont dependency). Icons: inline SVG, 1.5 px strokes, 20 px.

Elements:
- Bottom toolbar pill (glassy white rgba(255,255,255,.82) + backdrop blur, hairline border, soft shadow, 44 px tall): contents ☰, prev ‹, play/pause with a circular progress ring showing the 5-second loop, plate label ("II · Bocaracá", click opens contents), next ›, divider, layers (opens a popover: a toggle switch per layer with its hint, an "Explode" slider, a "Labels" switch), export (popover: "SVG — colour plate", "SVG — line art (colouring page)", "PNG — current view"), sound toggle, fullscreen. Idle auto-hide after 3 s without pointer movement (never while focused/hovered/popover open; never under reduced motion). Disabled states when no figure on the spread (layers/export hidden) or at the first/last page.
- Top-left: "← Library" link (emits {type:'library'}) + the book title in letter-spaced small caps; very quiet.
- Contents drawer: slides from the left; title, subtitle, list of plates (roman number, common name, italic scientific name), current plate highlighted; keyboard navigable (arrow keys, Enter), Esc closes; emits {type:'goto', spread}.
- Labels overlay (ui.renderLabels(items, area)): called every frame with anchor screen positions. Lay labels out like a scientific plate: label pills stacked in the left/right margins of the recto area (area = {x,y,w,h} CSS px), each joined to its anchor by a thin leader line (SVG polyline with a small anchor dot), sides chosen by anchor x relative to the figure centre, vertical collision avoidance (sort, push apart, relax), hide when visible === false or anchor offscreen, smooth fades (no layout thrash: reuse DOM nodes keyed by id, transform-only updates). Click/hover a label → a small card with its detail text. Must stay legible and inside the viewport on mobile.
- Beat caption: a small italic caption above the toolbar showing the current animation beat (ui.setSpread beats: [[t, text]...]; ui.setClock(t) selects the active beat) with a soft crossfade.
- Mobile (≤ 640 px): compact icon-only toolbar, labels limited to the 4 nearest, and a "Read" button that opens a bottom sheet with the verso text — expose ui.setReading(html) (the App passes sanitized HTML of the plate text).
- Toasts (ui.toast) bottom-centre above the toolbar; ui.announce → aria-live polite region (visually hidden).
- Keyboard shortcuts help popover on "?" (← → turn, Space play/pause, L labels, E explode, 1–9 layers, S export SVG, F fullscreen, C contents, Esc reset view). The UI itself does not bind global keys except "?" and Esc for its own popovers; the App binds the rest — export a SHORTCUTS table the App can use.
- ui.setTheme({ accent, ink, paper }) sets CSS variables; ui.setBackend(name) shows a tiny "WebGPU"/"WebGL 2" badge inside the help popover only.
- Accessibility: aria-labels, aria-pressed on toggles, roles for popovers/menus, focus-visible rings, focus trapping in the drawer, 44 px touch targets, contrast AA.
- Reduced motion: no slide/fade animations (instant).

Harness: ui.html renders the UI over a static mock (a pale rectangle as the recto area, 6 fake labels whose anchors orbit slowly, fake layers/beats) and logs commands. VERIFY with screenshots at 1440×900 and 390×844 (popover open, drawer open, labels on, help open, mobile reading sheet). Read every PNG and iterate until it is beautiful. Report the API precisely (any additions beyond §8).`,
  },
  {
    key: 'figure-host',
    prompt: `YOUR ROLE: figure-host, ink & export specialist.
YOU OWN: src/engine/figures/FigureHost.js (contract.js is FROZEN — do not edit), src/engine/export/* (new), src/kits/ink/*, src/kits/patterns/* (new), src/lab/* and lab.html, scripts/export-svg.mjs (new).
IMPORTANT: three subject agents (snakes, flowers, skulls) use lab.html, the ink kit and FigureHost CONTINUOUSLY while you work. Never leave these files broken: make small verified edits, write whole files atomically, keep every existing signature, URL parameter and window.lab method backward-compatible (add, never break). Verify the demo figure (lab.html?type=demo) after each change.

GOALS:
1. Ink look (src/kits/ink/index.js): make the "living plate" look superb. Today the default hatching renders as dense concentric rings on curved surfaces and reads like aliasing. Tune it into crisp engraved lines: ~3–5 px spacing at default book zoom (lab view 'book' approximates it), lines only in light fall-off and cast shadows for 'lithograph' (no lines on lit faces), tone fully carried by line width for 'engraving' (white paper, black lines, cross-hatching in deep shadow), anti-aliased with fwidth, stable under rotation (figure-space), no moiré. Outline width consistent (~1.2 px at book zoom), subtle hand-inked wobble. Keep the exact signatures of createFigureContext, ctx.ink/outline/flat, setXray. You may add options (e.g. stipple, rim light, sheen) and helpers: add ctx.inkLine(points, { width, color, dashed, closed }) → thin ink polyline object (three/addons/lines/webgpu/Line2.js + Line2NodeMaterial, or a camera-facing ribbon if Line2 misbehaves) for construction guides, venation and filaments — verify it on BOTH backends.
2. Patterns kit (src/kits/patterns/index.js): a documented TSL library returning colour nodes, for future subjects and the reusable skill: scales({ coord, rows, cols, keel, edge }), bands(coord, stops), blotches(...), speckle(...), veins(...), stripes(...), gradient(...). Subject agents may write their own patterns; yours must be general and demonstrated in the lab (add a lab subject 'patterns' — a sphere/cylinder sampler — under src/lab/).
3. FigureHost: layer fade transitions; mount placeholder (a subtle printed shimmer ellipse while an async figure builds) and error placeholder; host.focusPoint() (world centre of the active figure), host.figureRadius(); host.pickFigure(raycaster) → { mount, object, part } | null (skip outlines); activeLabels(camera) → items with screen-ready world positions + occlusion flag (raycast from camera to anchor against the figure's meshes) per CONTRACTS §8 renderLabels; keep update() allocation-free (cache vectors); beats passthrough; robust unmount/dispose (geometries, materials, textures).
4. Export (src/engine/export/index.js) per CONTRACTS §9: exportFigureSVG({ renderer, mount, camera, mode: 'color'|'line', width, title, caption, credit, labels }) — render the mount's figure alone (hide everything else, restore after) into a RenderTarget as an ID buffer (unlit MeshBasicNodeMaterial swapped per mesh: R = part index from mount.figure.parts (meshes not in any part → 'body' index), G = tone band 0/1/2 from N·L with the key light direction, B = 255 mask; toneMapped false, NoColorSpace; width multiple of 64), read back with renderer.readRenderTargetPixelsAsync, then marching squares per (part, band) region → stitched loops → Ramer–Douglas–Peucker simplify → Catmull-Rom→Bézier smoothing → SVG paths (fill-rule evenodd) with fills = part colour per band (light / base / shadow) and a same-colour hairline stroke to hide seams; then ink outlines: part-mask boundaries (thin) + silhouette (thicker). mode 'line' = white fills, outlines only (a colouring page). Include <title>, <desc>, optional caption text, optional numbered labels from activeLabels. exportPNG({ renderer, scene, camera, width }) → Blob. downloadText/downloadBlob helpers. Add window.lab.exportSVG(mode) and export buttons to the lab panel, plus scripts/export-svg.mjs "<lab query>" out.svg [--mode color|line] (playwright-core, like scripts/shot.mjs) so SVGs can be produced headlessly.
5. Lab polish (keep params/API): export buttons, bounds-box toggle, fps meter, style switch, view presets incl. 'book' (approximates the book camera), and adopt the book-engine agent's final light rig if stage.js exports one (check later in your session; keep your own copy otherwise).

VERIFY: lab screenshots of the demo + your patterns sampler in lithograph and engraving, at 'book' and close views, both backends; export SVGs of the demo in both modes and VIEW them (write the SVG file under .scratch and screenshot it via a tiny HTML page or by navigating Chrome to file:// path with shot.mjs using an absolute URL) — they must look like clean, beautiful coloured plates / colouring pages, not blocky pixel traces. Report the final API and any option additions precisely.`,
  },
  {
    key: 'snakes',
    prompt: `YOUR ROLE: herpetology figure specialist — the snakes of "Serpientes".
YOU OWN: src/subjects/snakes/* (replace the stub index.js) and src/kits/tube/* (new).

GOAL: a parametric, scientifically accurate snake generator implementing the Figure contract (CONTRACTS §5) with the 7 species/poses of CONTRACTS §12 I, plus pose 'follow-path' ({ species, pose: 'follow-path', path: [[x,y,z],...] cm, length: cm, closed?: bool }) that another subject (skull & snake) will call. createFigure(params, ctx): params.species ∈ bothrops-asper | bothriechis-schlegelii (params.morph 'oropel' | 'green') | micrurus-nigrocinctus | crotalus-simus | lachesis-stenophrys | hydrophis-platurus | boa-imperator; params.pose ∈ strike | branch | slither | rattle | ambush | swim | constrict | follow-path. Build all surfaces with ctx.ink / ctx.outline / ctx.flat (src/kits/ink) so the plate look is consistent; author in centimetres at real scale.

Accuracy brief (verify anything you are unsure of; never invent):
- Body: tube along a spine curve, D-shaped cross-section (flattened belly with wide ventral scutes), radius profile (head, neck, max girth ~35–45% of length, taper), tail fraction (vipers ~10–15%, others longer). Proportions: Bothrops asper stout, ~1.2–1.8 m; B. schlegelii small (~50–80 cm), prehensile tail; Micrurus nigrocinctus slender (~50–80 cm), head barely distinct, blunt short tail; Crotalus simus heavy with a rattle; Lachesis stenophrys long (to ~2–2.5 m), keeled rough scales, tail tip of spiny modified scales; Hydrophis platurus ~60–90 cm, laterally compressed paddle tail, black dorsum sharply demarcated from yellow venter, tail yellow with black spots/bars; Boa imperator heavy (often 1.5–2.5 m).
- Head as separate parts: upper head/skull, lower jaw (opens on the strike), eyes (vertical slit pupils for vipers and boas; round for coral and sea snake; NO eyelids — snakes never blink), nostrils (sea snake: dorsal, valved), loreal heat pits between eye and nostril ONLY on pit vipers (Bothrops, Bothriechis, Crotalus, Lachesis), supraocular "eyelash" scales on B. schlegelii, forked tongue that flicks out through the lingual notch with the mouth closed, fangs: pit vipers long hinged front fangs that swing erect during the strike (solenoglyphous); coral & sea snake short fixed front fangs (proteroglyphous); boa no fangs, many recurved teeth.
- Patterns (TSL on body coordinates along/around; your own pattern functions are fine): B. asper — olive/brown/grey ground, dark lateral triangles (apex toward the spine) with pale edges forming X/hourglass shapes, pale/yellowish chin; B. schlegelii 'oropel' — golden yellow with sparse tiny dark and white flecks ('green' morph: green with dark speckles); Micrurus nigrocinctus — rings red / yellow / black / yellow / red… (black rings bordered by narrow yellow rings; red segments whose scales have black tips), black snout with a yellow head band; Crotalus simus — dark rhomboid/diamond blotches edged in cream on brown, two dark paravertebral neck stripes, darker tail before the rattle; Lachesis stenophrys — tan/pinkish ground with dark rhomboid blotches enclosing pale spots; Hydrophis platurus — as above; Boa imperator — tan/grey with dark saddles turning reddish-brown toward the tail, dark eye stripe.
- Scales: staggered dorsal scale rows via shading/hatchCoord (keeled for vipers), wide ventral scutes on the belly.
- Layers: skin, skeleton (instanced vertebrae — hundreds along the body — and paired ribs on the trunk but not the tail, plus a simplified skull; skin turns x-ray via setXray from src/kits/ink), venom (vipers: venom glands behind the eyes, duct, fangs; coral/sea snake: smaller glands + fixed fangs), and the species extras: eyelash-scales (B. schlegelii), rattle (Crotalus — interlocking keratin segments + button; explode separates the segments), eggs (Lachesis is oviparous — a small clutch of leathery eggs the female coils around), water (Hydrophis — a translucent water slab with a TSL ripple/caustic shader), pelvic spur (Boa — small cloacal spurs; skeleton layer shows the vestigial pelvic girdle remnant).
- Labels: use the canonical ids in CONTRACTS §6 (snakes) with anchors parented to moving parts; 3–6 per species, short text + one-sentence detail.
- Parts (for SVG export + explode): head, body, tail, fangs, rattle segments, eggs, props… with sensible flat colours.
- Animations (5 s, seamless, pure function of t — see §12 I): strike (S-coil, tongue flicks, fast lunge ~1.6 s in ~0.15–0.2 s with fangs swinging erect, recoil), branch (coiled on a branch with prehensile tail grip, slow head sway, tongue), slither (travel a closed path with lateral undulation — integer wave cycles per loop — plus a tail-curl display), rattle (defensive coil, raised head, rattle vibrating as a motion blur), ambush (coiled, slow breathing, tail-tip vibration), swim (undulating in water, paddle tail), constrict (coils tighten and relax around a simple stylised prey silhouette), follow-path (move along the given path, looping seamlessly). Provide beats [{t,text}] per pose.
- Props: minimal, elegant, same ink look: branch with bark and a few leaves, prey silhouette, water slab, egg clutch.
- Performance: body geometry recomputed on the CPU each frame is fine (~200×20 verts) with analytic normals; outlines follow (they share geometry). < 2 ms/frame per snake.
Also export from src/subjects/snakes/index.js: SPECIES (preset table) and createSnake(params, ctx) (alias of createFigure) for reuse.

VERIFY: for every species (its default pose) take lab screenshots at t = 0, 1.6 and 3.4 (and three-quarter + 'book' views), with layers skeleton/venom on, explode on where relevant, and on WebGL too: \`node scripts/shot.mjs "lab.html?type=snake&params=$(python3 -c 'import urllib.parse,json;print(urllib.parse.quote(json.dumps({"species":"bothrops-asper","pose":"strike"})))')&t=1.6&play=0&ui=0&view=three-quarter" .scratch/snakes-asper-1.png\`. Read every PNG; iterate until each looks like a museum-quality coloured natural-history plate come alive (graceful curves, believable heads, correct patterns). Also verify seamlessness: pose at t=0 equals t=5 (compare screenshots or vertex buffers). Report the params API precisely.`,
  },
  {
    key: 'flowers',
    prompt: `YOUR ROLE: botanical figure specialist — the flowers of "Flores".
YOU OWN: src/subjects/flowers/* (replace the stub index.js) and src/kits/petal/* (new).

GOAL: a parametric, botanically accurate flower toolkit implementing the Figure contract (CONTRACTS §5) for the 6 species of CONTRACTS §12 II. createFigure(params, ctx): params.species ∈ guarianthe-skinneri | heliconia-wagneriana | passiflora-vitifolia | palicourea-elata | handroanthus-ochraceus | nymphaea-ampla. Build surfaces with ctx.ink / ctx.outline / ctx.flat (src/kits/ink) for a consistent plate look (thin sheets like petals: give them slight thickness so the inverted-hull outline works, or use ctx.inkLine edges if the figure-host agent ships it — check src/kits/ink/index.js later in your session). Author in centimetres at real scale.

Petal kit (src/kits/petal): parametric lofted surfaces (petal, sepal, bract, leaf, labellum/lip) with width profile, cupping across, curl along, twist, wavy margins, thickness, venation/hatchCoord-friendly UVs; helpers for whorls, phyllotaxis (137.5°), stems/peduncles (tubes), tendrils (helical coils), and a small stylised hummingbird (hermit-like long curved bill; wings drawn as translucent motion-blurred fans — real wingbeats are tens of Hz, so do NOT animate literal flaps at 5 s scale; suggest motion with blur + a slow 'figure-eight' sway).

Accuracy brief (verify anything uncertain; never invent):
- Guarianthe skinneri (guaria morada; national flower of Costa Rica): epiphytic orchid; flowers ~7–9 cm, rosy-purple/lilac; 3 narrow lanceolate sepals, 2 broader ovate petals with slightly wavy margins, a labellum (lip) rolled into a tube around the column with a spreading front lobe — throat white/cream, front lobe deeper magenta; column hidden inside the lip; several flowers per inflorescence atop a club-shaped pseudobulb bearing 2 leaves.
- Heliconia wagneriana (platanilla): erect inflorescence of two-ranked boat-shaped bracts, red/pink with yellow-green margins and a green keel; small tubular cream-greenish flowers emerging from the bracts; large banana-like leaves; hummingbird-pollinated.
- Passiflora vitifolia (granadilla de monte): scarlet flower ~10–15 cm; 5 sepals + 5 petals similar, spreading; corona of filaments in rings; central androgynophore carrying 5 stamens (anthers) and the ovary with 3 styles/stigmas; three-lobed, grape-like leaves; coiling tendrils.
- Palicourea elata (labios de mujer, "hot lips"; Rubiaceae): two glossy red, lip-like bracts; small white tubular, star-mouthed (5-lobed) flowers emerging between them; understory shrub.
- Handroanthus ochraceus (cortez amarillo): dry-season mass flowering on leafless branches; yellow tubular-campanulate 5-lobed flowers (~5–7 cm) with fine reddish nectar-guide lines in the throat; densely hairy calyx; clusters at branch tips.
- Nymphaea ampla (white water lily): white flower ~8–18 cm with many petals (~12–21) spiralled, numerous yellow stamens, 4 green sepals; floating pads with a deep sinus and toothed margins, purplish undersides; day-blooming.
- Layers per §12 II (ids: perianth, column-lip, leaves | bracts, flowers, hummingbird | petals (sepals & petals), corona, androgynophore | bracts, flowers, leaves | flowers, calyx, branch | petals, stamens, pads, water). Explode = a botanical dissection: whorls separate along the floral axis (sepals, petals, lip/corona, stamens, pistil) — like a classic floral dissection plate.
- Labels: canonical ids in CONTRACTS §6 (flowers), anchors parented to moving parts, short text + one-sentence detail.
- Parts for SVG export/explode with good flat colours.
- Animations (5 s, seamless, pure function of t; beats [{t,text}]): Guarianthe — bloom opens, lip flutters, slight sway; Heliconia — hummingbird hovers in, probes a flower in a bract, backs away; Passiflora — flower opens, corona filaments ripple in a travelling wave, a tendril coils; Palicourea — red bracts part, white flowers emerge; Handroanthus — cluster sways, one corolla detaches and falls (and is back on the branch by the loop seam — design it seamlessly); Nymphaea — opens on the water with expanding ripples (TSL water with subtle ripples/refraction look; keep it elegant and cheap).
- Rich natural colour with veins/gradients (TSL), delicate translucency feel on petals (e.g. back-light tint), the colour lithograph look.

VERIFY: for every species take lab screenshots at t = 0, 2.5 and 4 (three-quarter, front and 'book' views), with explode 0.8, layers toggled, and on WebGL: \`node scripts/shot.mjs "lab.html?type=flower&params=$(python3 -c 'import urllib.parse,json;print(urllib.parse.quote(json.dumps({"species":"guarianthe-skinneri"})))')&t=2.5&play=0&ui=0" .scratch/flowers-guaria-1.png\`. Read every PNG and iterate until each reads instantly as that species and looks like a museum-quality botanical plate come alive. Verify seamless loops. Report the params API precisely.`,
  },
  {
    key: 'skulls',
    prompt: `YOUR ROLE: anatomy & drawing-method figure specialist — the skulls of "Calaveras", a constructive drawing book.
YOU OWN: src/subjects/skulls/* (replace the stub index.js) and src/kits/sdf/* (new).

GOAL: accurate, beautiful 3D skulls that PERFORM drawing lessons, implementing the Figure contract (CONTRACTS §5) for the 6 lessons of CONTRACTS §12 III, plus the module export drawStep(g2d, params, step, box, theme) that draws 2D construction steps (0, 1, 2) for each lesson as clean original line art (the typesetter puts them in three numbered panels on the lesson verso). createFigure(params, ctx): params.subject ∈ human | jaguar; params.lesson ∈ frontal | open-jaw | profile | bones | jaguar | skull-and-snake. Default style is 'engraving' (black ink lines on white; the colour 'bones' layer turns colour on). Author in centimetres at real scale (adult human skull ≈ 18–19 cm long, ≈ 14 cm wide, ≈ 13 cm basion–bregma height; jaguar skull roughly 20–28 cm long — state approximate).

SDF kit (src/kits/sdf): primitives (sphere, ellipsoid, capsule, round box, cone, torus), smooth union/subtraction/intersection, mirror-X symmetry, domain warps; a surface-nets mesher producing indexed BufferGeometry with SDF-gradient normals; run it in a module Web Worker (new Worker(new URL('./mesher.worker.js', import.meta.url), { type: 'module' }) — models register by name so the worker can import them) with a main-thread fallback; cache meshes by key; adaptive resolution (params.quality / ctx.quality); target < 1.5 s per skull. Region (bone) assignment per triangle → one submesh per bone so bones can be coloured, labelled and exploded individually; sutures show as fine ink lines where regions meet.

Human skull accuracy: cranial vault (frontal, 2 parietals, 2 temporals with squamous part, zygomatic process, mastoid process, external acoustic meatus, occipital, sphenoid greater wings at the temple), face (2 zygomatic bones + zygomatic arches, 2 maxillae with alveolar process, 2 nasal bones, piriform (pear-shaped) nasal aperture with the anterior nasal spine, orbits — rounded-square, slightly tilted, with supraorbital margins), mandible as a SEPARATE part (body, ramus, angle, condyle, coronoid process, mental protuberance) hinged at the temporomandibular joint (opening up to ~35–40°), teeth (adult: 32 — per quadrant 2 incisors, 1 canine, 2 premolars, 3 molars), sutures (coronal, sagittal, lambdoid, squamous), temporal lines. 22 bones in total (8 cranial + 14 facial); colour the major visible ones in the bones layer (classic anatomy-atlas palette).
Jaguar (Panthera onca): broad flaring zygomatic arches, short muzzle, large forward-facing orbits, prominent sagittal crest, big canines, carnassial (P4/m1) shearing teeth, massive coronoid process; mandible separate.

Layers (ids): construction (3D guide lines — cranial sphere, centre line, brow/eye/nose lines, jaw box/taper — matching the 2D steps; use ctx.inkLine if the figure-host agent has shipped it in src/kits/ink, else your own thin tubes/ribbons with ctx.flat), planes (a faceted low-resolution version: the "3D shapes" stage of drawing), bones (colour per bone), engraving (the hatched ink rendering; animate ctx.u.styleMix where the lesson calls for it), muscles (open-jaw lesson: temporalis and masseter as simple ink-shaded bodies), grid (profile lesson: proportion grid), sutures, teeth, skull/snake (skull-and-snake lesson).
Lessons & 5 s animations (seamless, pure function of t; beats [{t,text}]): frontal — construction builds up (sphere + centre line → jaw box → sockets & nasal aperture → engraved skull) then gently resets; open-jaw — mandible opens/closes about the TMJ hinge, muscles stretch; profile — turntable 0°→90°→0° with the proportion grid; bones — bones separate and reassemble (explode loop) with colour; jaguar — slow bite with the sagittal crest highlighted; skull-and-snake — a snake slithers through the left orbit and around the cranium. For the snake, import { createFigure as createSnake } from '../snakes/index.js' and call it with { species: 'bothriechis-schlegelii', pose: 'follow-path', path: [[x,y,z]...] (cm, around your skull), length, closed: true } (the snakes agent is implementing that API right now; until it lands, the stub returns a demo figure — poll every few minutes and integrate when ready; if it never lands, ship a minimal tube snake inside your folder and say so).
Labels: canonical ids in CONTRACTS §6 (skulls). Parts per bone (+ teeth, snake) with flat colours for SVG export; explode vectors outward from the skull centre for the bones lesson.
drawStep: 3 steps per lesson, ORIGINAL clean construction diagrams (circle + centre line; guides + jaw taper; sockets + nasal aperture + refined contour), consistent stroke weights, box-relative coordinates, theme ink colour.

VERIFY: lab screenshots for every lesson at t = 0, 1.25, 2.5, 3.75 (front, three-quarter, side, 'book' views), bones layer on, explode 1, engraving vs lithograph, and WebGL: \`node scripts/shot.mjs "lab.html?type=skull&params=$(python3 -c 'import urllib.parse,json;print(urllib.parse.quote(json.dumps({"subject":"human","lesson":"frontal"})))')&t=3.8&play=0&ui=0&view=front" .scratch/skulls-frontal-1.png\`. Also render drawStep output to a canvas in a tiny page or via --eval and screenshot it. Read every PNG and iterate until the skull is anatomically convincing (correct orbit shape and placement at mid-height of the skull, nasal aperture, zygomatic arches, teeth rows, mandible angle) and beautiful as an engraved plate. Report the params API, worker behaviour and timings precisely.`,
  },
]

const books = [
  {
    id: 'serpientes',
    brief: `"Serpientes — A Living Atlas of Costa Rican Snakes" (lithograph style). Plates exactly as CONTRACTS §12 I, in this order: I Terciopelo (Bothrops asper, pose strike), II Bocaracá / eyelash viper, 'oropel' morph (Bothriechis schlegelii, pose branch, params.morph 'oropel'), III Coral (Micrurus nigrocinctus, pose slither), IV Cascabel (Crotalus simus, pose rattle), V Matabuey / bushmaster (Lachesis stenophrys, pose ambush), VI Serpiente marina (Hydrophis platurus, pose swim), VII Béquer (Boa imperator, pose constrict). Theme: cloth deep forest green, gold foil, accent oxblood; endpaper motif 'scales'. Intro essay: why Costa Rica has ~140+ snake species (verify the count), how to look at a snake, the minority that are venomous. Back-matter note: snakebite safety & first aid done right (Instituto Clodomiro Picado / UCR antivenom; seek medical care immediately; immobilise and keep calm; no tourniquets, cuts, suction, ice, alcohol; never handle snakes) — medically accurate. The Coral plate should explain why the "red touches yellow" rhyme is unreliable in Central America and mention harmless mimics. Use current taxonomy (Boa imperator, Hydrophis platurus) and note older names where useful.`,
  },
  {
    id: 'flores',
    brief: `"Flores — A Living Herbarium of Costa Rica" (lithograph style). Plates exactly as CONTRACTS §12 II, in this order: I Guaria morada (Guarianthe skinneri — national flower of Costa Rica; verify the year of designation), II Platanilla (Heliconia wagneriana), III Granadilla de monte (Passiflora vitifolia), IV Labios de mujer (Palicourea elata, syn. Psychotria elata), V Cortez amarillo (Handroanthus ochraceus, syn. Tabebuia ochracea), VI Nenúfar (Nymphaea ampla). Theme: cloth deep plum or terracotta with gold foil, accent magenta; endpaper motif 'leaves'. 'status' only where an assessment really exists (otherwise null). Facts rows like Family, Height/Size, Flowering, Pollinators, Habitat, Elevation. Intro essay: Costa Rica's floral diversity (verify any number you state, e.g. vascular plant or orchid species counts), flowers as negotiations with pollinators. Back-matter note: look, don't pick — orchid protection and responsible observation (verify CITES/legal statements).`,
  },
  {
    id: 'calaveras',
    brief: `"Calaveras — Drawing Skulls: A Constructive Method" (engraving style; a drawing instruction book, all lessons use layout 'lesson'). Lessons exactly as CONTRACTS §12 III, in this order: I Frontal view, II Three-quarter view with open jaw, III Profile, IV The bones (exploded skull, the 22 bones), V Jaguar (Panthera onca — Costa Rica's largest cat; comparative anatomy), VI Skull & snake (composition: a Costa Rican eyelash viper weaving through the skull). For each lesson write: common = lesson title (e.g. 'Frontal View'), commonAlt (Spanish, e.g. 'Vista frontal'), scientific = the anatomical focus (e.g. 'Cranium & mandible' — keep 'scientific' short), family = a short category line, lede, body (how to see and draw this view — ORIGINAL pedagogy, never copy any existing drawing book), facts (proportions/measurements), lookCloser (canonical skull label ids), didYouKnow, lesson: { steps: exactly 3 { title, text } matching: 0 = big shapes (circle/sphere + centre line), 1 = guides & jaw taper, 2 = sockets, nasal aperture & refined contour — adapt per lesson (e.g. profile: circle + face wedge; jaguar: wedge muzzle + crest), proTip, mistakes, proportions }, figure: { type: 'skull', params: { subject, lesson, ... } } exactly as §12 III, animation beats. status: null; badge: e.g. 'Lesson 1 · Beginner'. Theme: black cloth with silver/white foil, pure white paper (#ffffff), ink black, accent vermilion; endpaper motif 'grid'; fonts: display 'Oswald', body 'EB Garamond', label 'IBM Plex Sans Condensed', mono 'IBM Plex Mono'. Intro essay: why artists study the skull (structure under every face), the constructive method (big shapes → guides → planes → details). Back-matter note: practice routine + respectful use of anatomical references. Anatomy facts must be correct (22 bones: 8 cranial + 14 facial; mandible the only movable bone; adult dentition 32; eyes roughly at half the head height in the living head — be careful to distinguish skull vs living-head proportions).`,
  },
]

const CONTENT_REPORT = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    researchFile: { type: 'string' },
    plates: { type: 'array', items: { type: 'string' } },
    claims: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, source: { type: 'string' } }, required: ['claim', 'source'] } },
    notes: { type: 'string' },
  },
  required: ['file', 'researchFile', 'plates', 'claims', 'notes'],
}

const FACTCHECK = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['clean', 'minor-fixes', 'major-fixes'] },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'plate id + field' },
          claim: { type: 'string' },
          problem: { type: 'string' },
          correction: { type: 'string' },
          source: { type: 'string', description: 'URL or reference supporting the correction' },
          severity: { type: 'string', enum: ['error', 'imprecise', 'style', 'budget'] },
        },
        required: ['location', 'claim', 'problem', 'correction', 'source', 'severity'],
      },
    },
  },
  required: ['verdict', 'issues'],
}

const contentPrompt = (bk) => `YOUR ROLE: natural-history author & researcher for the Lámina book "${bk.id}".
YOU OWN: src/books/${bk.id}.js (new) and docs/books/${bk.id}-research.md (new). Edit nothing else.

Read ${ROOT}/docs/architecture/CONTRACTS.md first — §6 (manifest schema, text budgets, canonical label ids, page order), §12 (the plates and figure params you MUST use verbatim), §13 (style), §14 (accuracy rules).

BOOK: ${bk.brief}

How to work:
1. Research every species/topic with WebSearch/WebFetch (reputable sources: IUCN Red List, The Reptile Database, Savage 2002, Instituto Clodomiro Picado/UCR, Tropicos, Plants of the World Online (POWO), Missouri Botanical Garden, Smithsonian, peer-reviewed papers, SINAC/MINAE, Museo Nacional de Costa Rica). Prefer conservative, sourced ranges; never invent numbers. Write docs/books/${bk.id}-research.md: per plate, the key facts with their sources (URLs), taxonomy notes (synonyms), and open questions.
2. Write src/books/${bk.id}.js as an ES module \`export default { ... }\` following §6 exactly: every plate with id, number (roman), layout, common, commonAlt, scientific, authority (verify the author & year), family, status ({code,label,source} or null — only real assessments), badge, lede, body (2 paragraphs, 120–220 words total, *italic* binomials), facts (4–6 rows), lookCloser (2–4, using ONLY canonical label ids for that figure), didYouKnow, figure ({ type, params exactly as §12, caption, scaleNote }), animation ({ title, beats: [[t, text], ...] matching the §12 animation, t in 0..5 }), sources (short refs). Plus intro, howTo (gesture → effect rows: drag the corner / click / arrow keys / swipe to turn; drag the figure to rotate; double-click to inspect; layers & explode & labels in the toolbar; export SVG), back (note, glossary 8–14 terms, sources 5–12 full references, colophon lines crediting the imprint "Lámina Natural History Press" (fictional, original) and the technology: Three.js WebGPU + TSL, typeset in Cormorant Garamond, EB Garamond & IBM Plex). Theme per the brief (§6 theme shape).
3. Respect the text budgets strictly (count words). Elegant, vivid, precise English prose — museum quality, no fluff, no marketing tone; Spanish common names as used in Costa Rica.
4. Validate: \`node -e "import('${ROOT}/src/books/${bk.id}.js').then(m=>{const b=m.default;console.log(b.plates.length, b.plates.map(p=>p.id).join(','))})"\` must run without errors.
Return the report: file paths, plate ids, and a claims list (every factual claim with its source) so a fact-checker can audit it.`

const factcheckPrompt = (bk, draft, lens) => `YOUR ROLE: adversarial fact-checker (${lens.name}) for the Lámina book "${bk.id}". You do NOT edit files — you only report.
Read ${ROOT}/docs/architecture/CONTRACTS.md §6, §12, §14, then ${ROOT}/src/books/${bk.id}.js and ${ROOT}/docs/books/${bk.id}-research.md.
The author claims these facts (with sources): ${JSON.stringify(draft?.claims ?? []).slice(0, 12000)}
Your lens: ${lens.focus}
Try hard to REFUTE claims. For every claim in your lens, verify it independently with WebSearch/WebFetch against reputable sources (do not trust the author's sources blindly). Flag anything wrong, outdated (taxonomy!), overstated, unsourced, or misleading; also flag budget violations (word counts in §6) and any label id not in the canonical list. Each issue must give the exact location (plate id + field), the problem, the precise corrected wording, and a source URL. If a claim is fine, don't list it. Default to flagging when uncertain, but say so in 'problem'.`

const LENSES = {
  serpientes: [
    { name: 'taxonomy & natural history', focus: 'scientific names, authorities, families, current taxonomy & synonyms, distributions in Costa Rica, elevations, sizes, diet, behaviour, reproduction (e.g. oviparous vs viviparous), IUCN statuses, species counts for Costa Rica.' },
    { name: 'venom, anatomy & safety', focus: 'venom types and effects, fang types (solenoglyphous/proteroglyphous), heat pits (which taxa), anatomy (scales, rattle, spurs, ribs, lungs), snakebite epidemiology and FIRST-AID statements (must match current medical guidance and Instituto Clodomiro Picado), the coral-snake rhyme and mimicry, and any claim that could mislead a reader in danger.' },
  ],
  flores: [
    { name: 'taxonomy & botany', focus: 'scientific names, authorities, families, synonyms, floral morphology (whorl counts, structures, colours, sizes), plant habit, leaf shape, distributions and elevations in Costa Rica, flowering seasons.' },
    { name: 'ecology, culture & law', focus: 'pollinators and ecological interactions, the national-flower designation (year, decree), cultural uses, conservation statuses, legal statements (CITES appendices for orchids, Costa Rican law on collecting), and any diversity counts stated (orchid/vascular plant species in Costa Rica).' },
  ],
  calaveras: [
    { name: 'anatomy', focus: 'bone names and counts (22 skull bones: 8 cranial, 14 facial), sutures, foramina, dentition (32 adult teeth, formula), TMJ and jaw opening, proportions of the skull vs. the living head, jaguar skull anatomy (sagittal crest, carnassials, dental formula), Bothriechis schlegelii facts in the skull-and-snake lesson.' },
    { name: 'pedagogy & originality', focus: 'whether each drawing step is clear, correct and ORIGINAL (no copied phrasing from existing drawing books such as Vault Editions "How to Draw Skulls"), whether proportions advice is accurate (e.g. orbit placement, cranium vs face ratio), whether steps match the 3-step construction (big shapes → guides & jaw taper → sockets/aperture/contour), and text budgets.' },
  ],
}

const revisePrompt = (bk, checks) => `YOUR ROLE: revising author for the Lámina book "${bk.id}".
YOU OWN: src/books/${bk.id}.js and docs/books/${bk.id}-research.md. Edit nothing else.
Two independent fact-checkers reviewed the manifest. Their issues (JSON): ${JSON.stringify(checks).slice(0, 30000)}
For each issue: verify the correction yourself (WebSearch/WebFetch) — checkers can be wrong too. Apply every correction you confirm (keeping budgets, style and the §6 schema), reject the ones you can refute (note why), and append a "Fact-check log" section to docs/books/${bk.id}-research.md listing each issue with its resolution (fixed / rejected + reason + source). Re-validate the module loads with node. Report what changed.`

phase('Build')
log('Launching 7 code specialists + 3 content pipelines')

const codeRuns = builders.map((b) => () => agent(PRE + '\n\n' + b.prompt, { label: b.key, phase: 'Build', schema: REPORT }))

const contentPipeline = pipeline(
  books,
  (bk) => agent(PRE + '\n\n' + contentPrompt(bk), { label: `write:${bk.id}`, phase: 'Content', schema: CONTENT_REPORT }),
  (draft, bk) =>
    parallel(
      LENSES[bk.id].map((lens) => () =>
        agent(factcheckPrompt(bk, draft, lens), { label: `check:${bk.id}:${lens.name.split(' ')[0]}`, phase: 'Fact-check', schema: FACTCHECK })
      )
    ).then((rs) => ({ draft, checks: rs.filter(Boolean) })),
  (res, bk) =>
    agent(PRE + '\n\n' + revisePrompt(bk, res.checks.map((c) => c.issues).flat()), { label: `revise:${bk.id}`, phase: 'Revise', schema: REPORT }).then((r) => ({
      book: bk.id,
      draft: res.draft,
      checkVerdicts: res.checks.map((c) => c.verdict),
      issueCount: res.checks.reduce((n, c) => n + (c.issues?.length ?? 0), 0),
      revision: r,
    }))
)

const [code, content] = await Promise.all([parallel(codeRuns), contentPipeline])
return {
  code: code.map((r, i) => ({ key: builders[i].key, ...(r ?? { failed: true }) })),
  content,
}
