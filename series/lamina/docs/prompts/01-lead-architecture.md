# 01 · Lead architecture pass (inline, before any fan-out)

Before handing anything to parallel agents, the lead (Claude Code, Opus 5.5) scouted
the environment and built a **verified skeleton**. That way every specialist starts
from code that already renders, and from contracts that already work.

## Scouting

| Check | Result |
|---|---|
| Repo | empty git repo on `main` |
| Toolchain | Node 26, npm 11, Google Chrome, Playwright browser cache present |
| Three.js | `0.187.0` was two days old → pinned **`three@0.186.1`** (Sep 2026, > 2 weeks old) |
| API audit | read `node_modules/three` to confirm the r186 surface: `WebGPURenderer` (`forceWebGL`, auto-fallback), the TSL export list (`Fn`, `output`, `diffuseColor`, `fwidth`, `frontFacing`, `mx_noise_float`, …), `NodeMaterial.outputNode` semantics (`output` = lit colour before tone mapping), `readRenderTargetPixelsAsync`, `Line2` for WebGPU, `XRManager` |
| References | read the three inspiration sites (Colorfigures, Anatomy, Teardown) — see 00-original-brief.md |

## Key decisions

1. **One shading language, two backends.** All shaders are TSL node graphs (compiled
   to WGSL on WebGPU, GLSL on WebGL 2). Raw `wgslFn` is banned because it breaks the fallback.
2. **Page curl on the CPU, looks on the GPU.** Leaves are 44 × 22 grids whose
   cross-section is an *arc-length* curve: `φ(s, ζ) = (1−p)·φR(s) + p·(π − φL(s)) + β(p)(s/W)² + τ(p)(s/W)ζ`.
   Integrating `cos φ`, `sin φ` keeps the paper from stretching. The same rest profile
   makes the gutter, and one `sin(2πp)` bend term covers both turn directions (the
   fore-edge leads while rising and trails while falling). CPU geometry means shadows,
   raycasting and pop-up anchoring all just work.
3. **Pop-ups ride their page.** Figures stand on the recto through a frame computed
   on the curled leaf (`curlFrame`) and fold flat along the page normal as the page
   lifts, so a turning page never shows an empty hole.
4. **The ink look is one material.** `ctx.ink()` = `MeshStandardNodeMaterial` + an
   `outputNode` that reads the lit colour, divides by albedo to get *lighting only*,
   and draws anti-aliased engraved hatch lines in figure space (stable while the
   figure turns). `styleMix` blends lithograph (coloured) ↔ engraving (black on
   paper), so a lesson can morph styles within its 5-second loop. Inverted-hull
   outlines share geometry, so CPU-animated and instanced meshes stay outlined.
5. **Pure white means transparent.** WebGPURenderer tone-maps the whole framebuffer,
   clear colour included (white came out as 240). The canvas clears to alpha 0 over
   CSS white, which gives exactly 255.
6. **Figures are authored in centimetres at real scale.** The host fits them to the
   page, which keeps the science honest and makes scale notes meaningful.
7. **Contracts first, then fan out.** `docs/architecture/CONTRACTS.md` freezes the
   Figure contract, ink-kit signatures, manifest schema, page order, text budgets,
   canonical label ids, UI/typeset/export/automation APIs and file ownership.

## Skeleton verified before fan-out

- `index.html` rendered on the **WebGPU** backend in the desktop browser pane:
  open book, gutter, cloth, a demo pop-up casting shadow on the page.
- Frozen mid-turn (p = 0.33): curved leaf, soft shadow across the facing page.
- `scripts/shot.mjs` (Playwright + Chrome): headless captures work on **WebGPU and
  WebGL 2** (`--webgl`). The workbench `lab.html` renders any figure exactly as the
  book hosts it. Every agent verifies its work by reading these PNGs.

## Fan-out

The build ran as one Claude Code **workflow**: seven code specialists with disjoint
file ownership, plus three content pipelines (*write → two adversarial fact-checkers
with different lenses → revise*). The full script, with every agent prompt, is
archived verbatim in [`02-build-workflow.js`](02-build-workflow.js).
