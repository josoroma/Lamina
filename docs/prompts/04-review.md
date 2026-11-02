# 04 · Review — eight skeptics, thirty-two reproductions, nine fixers

Once integration worked end to end (`03-integration.md`), the lead ran an
adversarial review against the **production build** (`vite build` +
`vite preview`, so nothing reloads under the reviewers). It ran as one
Claude Code Workflow with three phases. The script, with every prompt, is
archived in [`04-review-workflow.js`](04-review-workflow.js).

| | |
|---|---|
| agents | 49: 8 reviewers, 32 verifiers, 9 fixers |
| wall clock | 3 h 03 min |
| subagent tokens | 14.4 M |
| tool calls | 5,338 |
| findings | **100**: 0 critical · 30 high · 42 medium · 28 low (after the verifiers' re-rating) |
| reproduced by an independent skeptic | 32 of the 32 checked (none refuted) |

## How it worked

1. **Review.** Eight read-only reviewers, each with one lens and the same shared
   context (contracts, QA checklist, how to drive `window.lamina`, the lab and
   the typesetter). Every finding needed concrete evidence (a PNG the reviewer
   had actually looked at, numbers, console text) and an exact repro.
2. **Verify.** For each reviewer, the four most severe significant findings went
   to a fresh skeptic told to *reproduce it independently or refute it*, re-rate
   its severity and sharpen the fix into something directly applicable. The
   rest went to the fixers marked *unverified — reproduce it first*.
3. **Fix.** One fixer per file area with **disjoint ownership** (app,
   book-engine, figures-export, ui, typeset, snakes, flowers, skulls, and one per
   book's content). Fixers worked in parallel against the dev server or private
   builds, verified every fix visually or numerically on WebGPU and WebGL 2, and
   wrote down what they skipped and every change another area still owed them.

| reviewer | lens | findings | high · medium · low |
|---|---|---|---|
| `code-app` | integration code read line by line; route races, leaks, URL edge cases, automation API | 8 | 3 · 2 · 3 |
| `interaction` | genuine mouse, wheel, keyboard and CDP touch input on desktop, phone and tablet | 11 | 4 · 5 · 2 |
| `visual-serpientes` | every spread and plate of *Serpientes*, visually and scientifically | 16 | 3 · 9 · 4 |
| `visual-flores` | the same for *Flores* | 13 | 4 · 5 · 4 |
| `visual-calaveras` | the same for *Calaveras*, anatomy and drawing method | 13 | 4 · 6 · 3 |
| `ui-a11y` | overlay UI, keyboard, focus, ARIA, contrast, touch targets, library | 17 | 5 · 6 · 6 |
| `perf` | frame times, turn hitches, GPU memory, heap growth, context loss, fonts | 7 | 1 · 4 · 2 |
| `export-svg` | every plate's colour SVG and colouring page, opened and measured | 15 | 6 · 5 · 4 |

## What the review found, and what changed

**SVG export (the weakest part of the first build).** The colour plates lost
every skin pattern: the coral came out as a plain red snake whose key still
said *Red / Black / Yellow ring*. Translucent overlays (hummingbird wing blur,
the sea snake's water) were exported as opaque solids, the colouring pages
merged overlapping coils and corollas into blobs, outlines were left open, and
a 30 % paper tint washed out every colour. The figures-export fixer rewrote the
ID pass: a geometry pass (16-bit mesh id + depth) plus a shade pass that reads
each material's own albedo, then a deterministic OKLab k-means per part
(or exact `parts[].swatches` declared by the subject), fold lines from depth
discontinuities inside a part, closed outlines, an OKLab tone ramp, atlas-style
numbered markers on leaders, a wrapped key that never cuts a word, a contact
shadow instead of a floating ellipse, and a key-pose fallback for lesson stages
where nothing solid is shown.

**Framing and chrome.** The beat caption sat on the book's tail edge on tall
plates and tablets (illegible on the dark Calaveras board). The UI now reports
`bottomReserve()`, the rig frames the book between the bands
(`rig.setInsets`), and the spread and the pop-up are fitted as separate parts so
a tall figure no longer shrinks the book. The caption sits on a frosted pill
that is invisible on white. *Inspect* now frames the figure's whole projected
loop box (it used to barely move, and moved *away* on phones).

**Labels.** On the frontal lesson ten bone labels pointed at an empty
construction ball, and on other plates *Occipital bone* pointed into the orbit.
The reader now hides a label whose anchor is occluded unless the reader asked
for it, the skull rig gates labels by each structure's reveal, and the label
layout was rewritten: pills never sit on the figure or their own anchors, keep
their side for the whole spread, and never slide through each other during the
loop (Coral overlap frames 29 % → 0).

**Phones and portrait screens.** The introduction, the snakebite note, the
glossary and the imprint could not be read at all in portrait. The reader now
steps page by page in portrait, every spread has a Read-sheet version, a swipe
back works, a zoomed-in drag pans instead of lifting a page, and touch targets
reach 44 px.

**Performance and robustness.** Turning onto a plate froze for 67–316 ms on
WebGPU (0.5–5 s on WebGL) while the pop-up's shaders compiled: neighbours are
now warmed with `compileAsync`, one object per frame (worst frame ≤ 33 ms).
Page canvases are uploaded and shrunk to 1 × 1, with a six-side print window
(GPU process 2.2 GB → 1.3 GB at 1600 × 1000 @2×; 530 MB of canvases retained after
six visits → 0). Routes abort cleanly, a lost GPU device reloads the page where
the reader was, label occlusion respects its time budget on 310k-triangle
skulls, and each route downloads only the font subsets its faces actually set.

**Science and drawing.** The hummingbird's bill now enters the flower it visits
(it probed the bract 1.5–2 cm away); the sea snake's paddle tail no longer
pokes through its water; the bocaracá's branch is rooted on the page; the
coral's head is no longer narrower than its neck; the boa's spurs point out of
the body instead of into it; skin-off no longer leaves eyes and fangs floating;
explode is a real dissection; the passionflower stays a one-day flower (a fresh
bud opens instead of the old one reopening); the *Calaveras* nasal bones,
zygomatic arch, conchae, jaguar cranium (now 30 teeth) and profile grid were
corrected, the Lesson VI panels follow the 3D snake, and the sutures in the
panels zigzag as the page says they should.

**Text.** Beats that narrated motions the loops never perform were rewritten
against the pose timings; seven works cited on plate pages were added to
*Serpientes*' sources (each re-checked on Crossref and PubMed); every plate
verso now uses one house arrangement.

### Skipped, with reasons

| item | why |
|---|---|
| Calaveras deep links wait ~1 s for skull meshing | returning early would make the camera visibly re-frame when the tall pop-up arrives |
| A seamless in-place renderer rebuild after GPU loss | page canvases go black after a real crash; a reload is robust and verified on both backends |
| Interorbital bridge "≈ 2.9 cm" | not reproduced: an orthographic probe measures 2.1–2.2 cm, matching the text |
| Moving the sea snake's *Yellow belly* anchor | the verifier refuted it: the anchor is on the yellow flank |
| Fore-edge page drag while zoomed | it would steal pans near the edge; taps, keys and the toolbar still turn |

## Round 2 — integration, re-verification, repair

The fixers worked in parallel on disjoint files, so each one ended with a list
of changes that another area still owed it: a flag the exporter never read, a
label filter the figure host lacked, a fit the reader had to pass to the rig. A
second workflow closed that loop and then checked everything again on a fresh
build. The script is archived in
[`05-integrate-workflow.js`](05-integrate-workflow.js).

| | |
|---|---|
| agents | 23: 8 integrators, 1 release builder, 8 re-verifiers, 6 repairers |
| wall clock | 5 h 29 min |
| subagent tokens | 11.2 M |
| tool calls | 4,517 |
| findings re-tested on the new build | 100 of 100: **80 fixed**, 15 partly fixed, 3 regressed, 2 skips upheld |
| new problems the re-verifiers found | 27: 1 high · 17 medium · 9 low |
| repaired in the same round | 39 of the 45 open items |

1. **Integrate.** One agent per file area applied the hand-offs addressed to it.
2. **Build.** One production build for everybody: validate, the loop audit on
   both backends, smoke shots.
3. **Re-verify.** One skeptic per original review lens re-tested every finding
   of that lens itself — never on the fixer's word — and hunted for regressions.
4. **Repair.** One agent per area took whatever was partly fixed, regressed or
   new.

What changed, beyond closing the hand-offs:

- **Labels stop blinking.** A label whose anchor slips behind the figure stays
  (drawn hollow) for 0.4 s, and one that keeps coming back doubles its grace up
  to 1.6 s. The terciopelo's *Forked tongue* went from 4 hides per loop to none;
  over all 19 plates, labels that vanish and return within half a second fell
  from 11 to 1 per loop. Phone label rows no longer re-flow every loop, rows step
  over printed text, and leaders no longer cross (landscape phone: 9 crossings →
  3).
- **Skin off shows the skeleton** on the snakes, and says so to screen readers.
- **Inspect frames the whole loop** as close as the screen allows (1.2–2.2× on
  phones).
- **The library downloads only the cover faces**: 15 font files (302 KB) → 6
  (126 KB).
- **Export.** Keys show a hidden label only when the reader asked for it;
  *Calaveras I* exports with the engraving switched off; colour and line pages
  share one frame on every plate; baked ambient occlusion is no longer printed
  as "markings" on the bones; hovering a 310k-triangle skull no longer stalls.
- **Figures.** The snakes' dissection labels its skeleton, fangs and venom
  glands; eggs and prey lost their bull's-eye hatching; the profile grid hits the
  ear canal; the jaguar's muzzle slot and see-through orbits are closed; *Orbit*
  and *Piriform aperture* never point at empty paper.

Carried into the next round:

| item | why it is still open |
|---|---|
| A drag that starts just beside a thin snake lifts the page | the reader's half is done; the input handler still has to call it |
| WebGL compiles shadow-depth programs on a figure's first draw | r186's `compileAsync` skips the shadow pass |
| *Flores* V's nectar guides vanish in SVG; *Platanilla*'s bract colours vary between exports | the flower figures need inked guide curves and declared swatches |
| Faint contact-shadow smudges under raised parts in SVG | a global shadow change, deferred |
| *Calaveras* lesson versos fit at 90–92.5 % | the lessons are already near their word floors; the lesson verso needs a redesign |
