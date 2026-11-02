# 00 · The original brief

The product began with one prompt to Claude Code (Opus 5.5, ultracode mode on).
It is reproduced verbatim below; the reference images that came with it are
described rather than reproduced, because they are third-party works.

## Prompt (verbatim)

> Claude Skill: Interactive 3D Scientific full width Colored Books
>
> Create a reusable Claude Code skill inspired by:
>
> * https://april-zhu.com/colorfigures
> * https://github.com/wheresryan22/anatomy
> * https://jakub.kr/skills (Teardown)
>
> Build immersive, interactive 3D scientific books inspired by Costa Rican biodiversity, with subjects including astronomy, physics, chemistry, botany, skeletons, muscles, snakes, insects, flowers, mushrooms, butterflies, felines, monkeys, turtles, sloths, and medicinal plants.
>
> Visual Experience
>
> * A realistic, elegant 3D book floating against a pure white background.
> * Users can turn pages interactively, with realistic page-flipping animations, paper curvature, shadows, and depth.
> * Each page contains colorful, scientifically accurate 3D illustrations that come alive.
> * Museum-quality scientific artwork, clean typography, annotations, and rich natural colors.
> * Minimal, premium design. No clutter or unnecessary UI.
>
> Interactions
>
> * Turn pages by dragging, clicking, swiping, or using arrow keys.
> * Rotate, zoom, dissect, explode, and explore 3D illustrations.
> * Toggle anatomical layers and scientific labels.
> * Each page features a seamless 5-second scientific animation.
>
> Technology
> Use Three.js + WebGPU, with TSL/WGSL shaders, WebGL fallback, and optional WASM, WebXR, and advanced GPU techniques where beneficial.
>
> Deliverables
>
> * Reusable Claude Code SKILL.md and supporting components.
> * Working interactive 3D colored book with multiple pages.
> * Five-second animations for each illustrated subject.
> * Portable SVG export of individual scientific illustrations.
> * Responsive, performant, production-ready implementation.
>
> Goal: Transform any scientific topic into a beautiful, interactive, page-turnable 3D encyclopedia on a clean white canvas. Build a functioning prototype, not just a design or specification.
>
> Lets start with 3 original products colored books: one for Costa Rican snakes and another for Costa Rican flowers and another for Drawing Skulls. Document in docs folders the prompts and outputs we use to produce this two docs/demos
>
> Leave the README.md as ycombinator product, with an svg logo on top and TOC

## Reference images (described)

| # | What it showed | What we took from it |
|---|---|---|
| 1 | A four-stage figure-drawing progression: stick figure → 3D shapes → muscles → details | The constructive method: every figure is built in stages, and the 5-second loops can *perform* those stages |
| 2 | A pencil muscle-anatomy study with measurement lines | Annotation density and leader-line labelling |
| 3 | An 18th-century anatomical atlas (numbered plates: skull, hand, foot, ribcage, child skeleton, muscles of the face and foot) | Plate numbering (TAB. I…), numbered callouts, the verso-text / recto-plate rhythm |
| 4–10 | Hand-coloured 19th-century snake lithographs (vipers, a banded snake, a coral snake, *Trigonocephalus* plates) | The colour-lithograph look: soft natural colour, fine engraved shading, white ground, italic captions |
| 11–14 | Pages from a step-by-step skull drawing guide (frontal, angled with open jaw, skull & snake, flaming skull), each with a vertical condensed title, a pro tip and three construction diagrams | The lesson page layout and the three-step construction diagrams — re-designed from scratch with original text and drawings |
| 15–19 | A modern reprint of vintage anatomy engravings (head with vessels, oral cavity, brain base, arteries, neck) | The engraving style: tone carried by line width, cross-hatching in deep shadow |
| 20 | A pencil écorché of the head, neck and shoulder | Layered anatomy (skin → muscle → bone) |
| 21 | An interactive 3D book: open spread on a table, a pop-up physics apparatus on the right page, a floating toolbar (contents, prev, play, page title, next, sound, contrast) | The pop-up figure standing on the recto, the minimal pill toolbar |
| 22 | A pop-up shophouse rising from a book page with paper tabs "Cut-out" and "Architecture" | Pop-ups that fold flat with their page; paper-tab toggles |

## Reference sites (as read on 2026-11-01)

- **Colorfigures**: an AI skill that builds hand-inked, interactive objects you can turn 360°, see through, and operate; labels light up while parts move.
- **Anatomy** (wheresryan22): an MIT skill whose `SKILL.md` + `kit/` + `references/` + `scripts/` (headless-Chrome capture, geometry audit) + `examples/` + `evals/` structure we mirrored for the Lámina skill.
- **Teardown** (jakub.kr): technical illustrations with an exploded/assembled toggle, part recolouring, and SVG/PNG download. It inspired our part-aware SVG export.
