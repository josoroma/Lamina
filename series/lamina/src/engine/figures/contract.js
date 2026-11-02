// Figure contract — the one interface every subject (snake, flower, skull,
// beetle, planet…) implements so the book engine can host it on a page.
//
// A subject module (src/subjects/<type>/index.js) exports:
//
//   export async function createFigure(params, ctx) → Figure
//
// `params` comes verbatim from the book manifest (plate.figure.params).
// `ctx` is a FigureContext (src/kits/ink/index.js): shared TSL uniforms and
// material factories (ctx.ink, ctx.outline, ctx.flat). Build every visible
// surface through ctx so hatching, outlines and the engraving/lithograph
// style stay consistent across the book.
//
// Coordinate system of figure.root (author in CENTIMETRES, real scale):
//   origin  centre of the figure's footprint, ON the paper
//   +Y      page normal (up out of the page)
//   +Z      towards the reader (the page's tail edge)
//   +X      towards the page's fore-edge
// The host fits the figure into the page's figure area (uniform scale) and
// stands it on the paper; never assume a particular on-screen size.

/**
 * @typedef {Object} FigureLayer
 * @property {string} id                 e.g. 'skin', 'skeleton', 'venom'
 * @property {string} label              UI label, e.g. 'Skeleton'
 * @property {boolean} visible           default visibility
 * @property {string} [hint]             one line: what this layer shows
 */

/**
 * @typedef {Object} FigureLabel
 * @property {string} id
 * @property {string} text               short label, e.g. 'Loreal pit'
 * @property {string} [detail]           one sentence of explanation
 * @property {import('three/webgpu').Object3D} anchor  empty Object3D parented inside
 *                                       figure.root so it follows the animation
 * @property {string} [layer]            only shown while this layer is visible
 */

/**
 * @typedef {Object} FigurePart
 * @property {string} id                 stable id, e.g. 'mandible'
 * @property {string} name               human name, e.g. 'Mandible'
 * @property {import('three/webgpu').Object3D} object  mesh or group making up the part
 * @property {string} color              flat fill colour for SVG export (sRGB hex)
 * @property {import('three/webgpu').Vector3} [explode]  displacement at explode = 1 (cm)
 * @property {string} [layer]            layer the part belongs to
 */

/**
 * @typedef {Object} FigureState         passed to figure.update every frame
 * @property {number} explode            0..1 (eased by the host)
 * @property {Record<string, boolean>} layers
 * @property {boolean} labels
 * @property {boolean} playing
 * @property {boolean} reducedMotion
 * @property {number} phase              t / duration, 0..1
 */

/**
 * @typedef {Object} Figure
 * @property {import('three/webgpu').Object3D} root
 * @property {string} title
 * @property {number} duration           loop length in seconds — always 5
 * @property {FigureLayer[]} layers
 * @property {FigureLabel[]} labels
 * @property {FigurePart[]} parts
 * @property {(t: number, dt: number, state: FigureState) => void} update
 *           Pose the figure at loop time t ∈ [0, duration). MUST be a pure
 *           function of t (scrubbing, seamless looping, deterministic capture):
 *           update(0) and update(duration) produce the same pose.
 * @property {(id: string, visible: boolean) => void} setLayer
 * @property {(amount: number) => void} setExplode   0 assembled … 1 fully exploded
 * @property {() => void} dispose
 * @property {{ min: number[], max: number[] }} [bounds]  optional fit box in cm;
 *           default: bounding box of root at t = 0, explode = 0
 * @property {Array<{ t: number, text: string }>} [beats]  narrated animation beats
 * @property {(ctx2d: CanvasRenderingContext2D, box: {x:number,y:number,w:number,h:number}, step: number) => void} [drawStep]
 *           optional: draw construction step `step` as 2D line art (drawing books)
 */

export const FIGURE_DURATION = 5;

/** Figure area on a recto page, in page units (page = 1 × 1.38). */
export const FIGURE_AREA = {
  s: 0.5, // anchor across the page (0 = spine, 1 = fore-edge)
  z: -0.02, // anchor along the page height (− = towards the head)
  footprintX: 0.78,
  footprintZ: 0.86,
  maxHeight: 0.6,
};
