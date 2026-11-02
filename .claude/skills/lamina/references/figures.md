# Figures: building a subject

A subject is a module `src/subjects/<folder>/index.js` registered in
`src/subjects/index.js` (`figureLoaders[type] = () => import(...)`). It exports

```js
export async function createFigure(params, ctx) { … return figure; }
export function drawStep(g2d, params, step, box, theme) { … }   // optional, drawing books
```

Start from `templates/subject/index.js` (a complete seed pod: layers, labels,
parts, explode, beats) via `scripts/new-subject.mjs`, and keep the lab open:
`lab.html?type=<type>&params=<url-encoded JSON>&t=2&play=0&view=book`.

## The Figure contract (src/engine/figures/contract.js — frozen)

| field | meaning |
|---|---|
| `root` | `Object3D`; origin = footprint centre **on the paper**, +Y page normal, +Z towards the reader, +X towards the fore-edge; **centimetres, real scale** |
| `title` | `'Bothrops asper — striking posture'`: a developer label (the lab's SVG `<title>` when none is given; the reader titles its plates from the edition), never translated |
| `duration` | `5` |
| `layers` | `[{ id, label, visible, hint }]` — what the reader can peel away (skin / skeleton / venom …) |
| `labels` | `[{ id, text, detail, anchor, layer?, mark?, size?, alt?, headSize?, region? }]` — `anchor` is an Object3D inside `root` that follows the animation; `layer` hides it with that layer; `mark` (`'dot'` \| `'ring'` \| `'tick'`, default dot), `size` (cm, the feature's radius: a ring is drawn round it) and `alt` (the mirror-side anchor; the host uses whichever faces the camera) keep a head label off the eye, pit or nostril it names; `headSize` (cm, the head's length) turns every face mark into a tick on a head under 40 px on screen; `region` (`{ object, box }`) is what a phone close-up frames |
| `parts` | `[{ id, name, object, color, explode?, layer?, swatches?, minPatternPx?, keepSmall? }]` — `color` is the SVG fill; `explode` (cm at 1) lets the host move it, otherwise move it yourself in `update`/`setExplode` (never both); `swatches: [{ color, name, keepSmall? }]` are the named colours the SVG snaps the part's pixels to (`false`: one flat fill); `minPatternPx` (snake eyes: 40) and `keepSmall` keep a small painted pattern (pupil, catchlight) in the SVG |
| `update(t, dt, state)` | pose at loop time `t` — a **pure function of t**; `state = { explode, layers, labels, playing, reducedMotion, phase }` |
| `setLayer(id, on)`, `setExplode(a)`, `dispose()` | layer toggles (x-ray a skin rather than hiding it), 0…1 dissection, free GPU resources |
| `bounds?` | `{ min:[x,y,z], max:[x,y,z] }` cm — the fit box **over the whole loop** (else measured at t = 0) |
| `loopBounds?` | the box the loop really draws, when `bounds` is biased for placement (skulls): the reader keeps label pills off it |
| `beats?` | `[{ t, text }]` — fallback captions (the manifest's `animation.beats` win) |
| `keyTime?`, `layerShown?(id)`, `regionOf?(label)` | the pose the SVG exports when the current one shows nothing solid; `true` for a switched-off layer the figure draws anyway (its labels stay listed); a label's `{ object, box }` region when labels do not carry `region` |

The host stands the figure on its recto, fits it into 0.78 × 0.86 × 0.6 page
units, folds it with the page, spins it on a turntable (drag), eases explode,
dissolves layers (parts that declare `layer`), raycasts label occlusion and
drives the shared 5 s clock.

## The ink kit — `ctx` (src/kits/ink)

| call | use |
|---|---|
| `ctx.ink({ color \| colorNode, emissiveNode, roughness, metalness, hatch, hatchCoord, hatchAngle, crossHatch, sheen, clearcoat, svgColor, side, transparent, name })` | every lit surface. Lithograph: hatching only in fall-off and cast shadow; engraving: tone carried by line width. `hatchCoord` (TSL float, lines at integers) makes lines follow form — rings around a body, veins along a petal. `svgColor` when the colour comes from a node. `emissiveNode` adds a self-lit colour (an eye's catchlight stays white on the shadow side; lithograph only, never hatched). |
| `ctx.outline(mesh, { width, color })` | inverted-hull ink outline (~1.2 CSS px at book zoom, hand-inked wobble); closed meshes only; works on `InstancedMesh` and CPU-deformed geometry |
| `ctx.inkLine(points, { width, color, dashed, closed, depthTest })` | construction lines, leaders, ripple rings; `.setPoints()` in place (a line rewritten every frame passes a same-length `Float32Array`) |
| `inkViewport` (export of `kits/ink`) | the shared viewport uniform (device px): read it to size something in screen pixels (a catchlight never smaller than a pixel) instead of three's `viewport`, which adds a bind group per material |
| `ctx.flat(o)` | unlit material (guides, props) |
| `setXray(obj, a)` / `setFade(obj, a)` | fresnel ghost for skins over skeletons / opaque dissolve (also dissolves shadows) |
| `ctx.u` | shared uniforms (`time`, `styleMix` 0 lithograph … 1 engraving, `figureInv`, …) |

Colour nodes for skins and petals: `src/kits/patterns` — `gradient`, `bands`,
`stripes`, `scales`, `blotches`, `speckle`, `rosettes`, `veins`, `aastep`
(anti-aliased with `fwidth`, so they never shimmer).

## Geometry kits

| kit | for | highlights |
|---|---|---|
| `kits/tube` | snakes, worms, vines, tentacles, filaments | `Spine` (parallel-transport frames that never flip), `SweptTube` (re-posed every frame with analytic normals, no allocation), `buildTube` (static), Catmull-Rom `Polyline` |
| `kits/petal` | petals, sepals, bracts, leaves, corollas, stems, birds, ponds | `BladeSurface` (profile, cup, fold, curl, twist, wavy margin, thickness — re-shape via `.p` + `.rebuild()`), `CorollaSurface`, `PolarLeaf` + `lobedOutline`, `TubeSurface`, `createLathe`, `whorl`/`phyllotaxis`/`mountOnHinge`, `createHummingbird`, `createPond` |
| `kits/sdf` | bones, shells, fossils, organs — anything sculpted | primitives + smooth CSG + mirror-X, `meshModel({ set, model, params, cell, options })` runs surface nets in a **module-worker pool** with region splitting (one submesh per labelled region), AO and iso-lines (sutures). Register models in `src/subjects/<set>/sdf-models.js`. |

Write a new kit when a family of forms repeats (wings → `kits/wing`). Keep kits
allocation-free in their per-frame paths and documented at the top of the file.

## Making it read as science

- Model from measurements: cite the source for proportions in a comment.
  Count what can be counted (petals, ribs, scales, teeth) and get it right.
- Pick the **one** behaviour that teaches something for the 5 s loop (a strike,
  a pollinator visit, a jaw on its hinge) — see `motion.md`.
- Layers reveal structure: skin → x-ray → skeleton; perianth → column; construction → engraving.
- Labels: 5–9 per figure, ids canonical, `detail` one sentence that agrees with
  the plate text (fact-checkers compare them). The reader shows at most ~10,
  ranked by look-closer notes, so put the important ones first. A label on a small
  facial feature (eye, pit, nostril) uses `mark: 'ring'` with its `size`, or
  `'tick'`; dots are for body features. Face labels carry `headSize`: on a head
  under 40 px on screen the reader keeps one of them, under 80 px two.
- Explode along meaningful axes (floral axis, bone centre outward, rattle segments).
- `bounds` must cover the whole loop or the figure will overrun the page; for a
  lunge you may claim part of the reach to keep the resting pose large.
- Props are minimal and inked the same way (a branch, a water slab, a prey animal at
  real scale — the black rat of plate VII). A prey is science too: species, size,
  colour and the grip (where the jaws hold it) come from sources, like the snake.
- A label never points at something it does not name. A pose that withdraws a
  feature for the whole loop leaves its label out (the constricting béquer, whose jaws
  hold the rat, has no tongue label); a feature that comes and goes hides its anchor
  while it is gone (`anchor.visible = false`); an anchor near a prop sits where the
  animal's own surface shows (the béquer's recurved teeth at the corner of the mouth,
  not along the bite, which is buried in the rat's fur).
- Ink lines and the SVG: a line drawn on the inside of a thin shell (a corolla's
  throat) is lifted a few hundredths of a cm off the face, so the exporter's depth
  test hides it behind the wall. Declared `swatches` snap every pixel to the nearest
  declared colour, so a soft edge between two colours that passes near a third prints a
  fringe of the third: keep such edges about one pixel wide (an `fwidth` step).

## Strings: English in code, Spanish in the subject's dictionary

A figure's words — label `text` and `detail`, layer `label` and `hint`, part and
swatch `name`s, beats — stay **English in the subject's code**: no `t()` calls, no
language checks. They are dictionary keys, translated where they are shown
(`FigureHost` for labels and beats, the Reader for layers, the exporter for the SVG
key and part tooltips), so the same figure serves both editions and a switch never
remounts it. Their Spanish lives in `src/i18n/es/<folder>.js` (created and registered
by `new-subject.mjs`, already holding the template pod's words):

```js
// src/i18n/es/snakes.js
export default {
  'Loreal pit': 'Foseta loreal',
  'Heat-sensing pit organ between eye and nostril: it detects the infrared warmth of prey.':
    'Órgano termosensible entre el ojo y la narina: detecta el calor infrarrojo de la presa.',
};
export const PATTERNS = {
  'Rattle segment {n}': 'Segmento {n} del cascabel', // strings built at run time; a literal word of ≥ 3 letters
};
```

- Keys are byte-identical to the English in code (curly quotes, `—`, `°`). Change an
  English string and its Spanish key must change with it
  (`validate-books --lang es --runtime` lists keys the figures no longer produce).
- Finite sets get exact keys (`Teeth (upper left)`…); patterns only for open values
  (counts, indices). Never build a sentence from fragments: one key per sentence.
- Never compare `figure.title` or any shown string in code; compare ids. The figure
  `title` is a developer label and is not translated.
- **Label pills keep their text whole**: ≤ 110 px of text at 12.5 px in the UI font,
  in English and in Spanish. Spanish anatomy and botany grow ("Punta de la cola
  espinosa" is 156 px): choose the shorter correct term, keep the detail for the rest.
- **A pill and its look-closer note use the same words.** When a plate's "Look closer"
  names a label, the Spanish of that label's `text` is exactly the note's Spanish
  run-in (`lookCloser[].name` in `src/books/es/<id>.js`, ≤ 3 words). One English string
  is one key, so a text used both as a label and as a part name gets one Spanish value.
- Check it: `lab.html?…&lang=es` shows the Spanish pills and key;
  `node scripts/audit.mjs --lang es --i18n` lists every string without Spanish and
  every pill over 110 px; its `--json` output feeds `i18n-strings.mjs --runtime`
  (what is missing, grouped by file) and `validate-books.mjs --lang es --runtime`
  (the same, plus every run-in that differs from its pill). The SVG also prints the
  names the exporter gives meshes outside every part (`regionNames(figure)`: "Water
  surface", "Muscles"…): they are figure strings too.

## Budgets

`update` ≤ 2 ms (audit flags > 4 ms), build ≤ ~1 s (show the host's placeholder
meanwhile; heavy meshing in workers), no per-frame allocation, ≤ ~400 k triangles
at "high" quality with a `quality` parameter that drops it on touch devices.
