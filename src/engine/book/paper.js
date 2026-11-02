// Paper, cloth and page-edge materials (TSL → WGSL on WebGPU, GLSL on WebGL 2).
//
// Why custom node materials: a printed leaf is not a plain textured plane.
// It darkens where it dives into the gutter, shows a whisper of the print on
// its other side, and glows when a lifted page is lit from behind. Cloth
// boards need a woven texture that never shimmers (anti-aliased with
// fwidth), a foil title that catches the light, a joint groove, and
// endpapers framed by the cloth turn-ins. All of it is a few cheap nodes.
import * as THREE from 'three/webgpu';
import {
  texture, uv, vec2, vec3, float, select, frontFacing, mix, exp, mx_noise_float,
  color as tslColor, uniform, smoothstep, fract, abs, sin, floor, min, fwidth, dot,
  luminance, normalWorld, normalView, positionViewDirection, reflect, positionLocal, max,
} from 'three/tsl';

const blankCache = new Map();

/** A tiny solid-colour sRGB texture (shared per colour). */
export function blankPaperTexture(color = '#fbf8f1') {
  if (blankCache.has(color)) return blankCache.get(color);
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, 8, 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.name = `blank-${color}`;
  blankCache.set(color, t);
  return t;
}

/**
 * Key light seen by the paper's translucency term. The stage writes the real
 * key light here (setPaperLight); defaults match createLights() so lab pages
 * built without a stage look the same.
 */
export const paperLight = {
  dir: uniform(new THREE.Vector3(-1.6, 3.4, 1.4).normalize()), // unit vector towards the key light (world)
  radiance: uniform(new THREE.Color(0xfffdf9).multiplyScalar(2.55 / Math.PI)),
  bounce: uniform(0.22), // ambient light a white page gathers from the leaves and room around it (fraction of albedo)
};

/** Point the paper translucency at a directional light (world-space direction towards it). */
export function setPaperLight(dirTowardsLight, color, intensity) {
  paperLight.dir.value.copy(dirTowardsLight).normalize();
  paperLight.radiance.value.copy(color).multiplyScalar(intensity / Math.PI);
}

/** Fibre grain + soft cloudy formation; fades out before it can alias. */
function paperGrain(scale = 1) {
  const g = uv().mul(vec2(230, 310));
  const aa = float(1).sub(smoothstep(0.3, 0.8, fwidth(g.x)));
  const fibre = mx_noise_float(vec3(g, 0.0)).mul(0.011).mul(aa);
  const cloud = mx_noise_float(vec3(uv().mul(vec2(6, 8)), 3.7)).mul(0.008);
  return fibre.add(cloud).mul(scale);
}

/**
 * Double-sided leaf material. Front = recto (right-hand page), back = verso
 * (left-hand page, mirrored in u because the leaf lands flipped).
 * Geometry uv.x is 0 at the spine on both sides, which drives the gutter shade.
 *
 * userData: frontNode/backNode (texture nodes: set `.value` to swap pages),
 * gutterAO (uniform 0..1: 1 at rest, 0 while the leaf is in the air), blank.
 */
export function createLeafMaterial({ front, back, paper = '#fbf8f1' } = {}) {
  const blank = blankPaperTexture(paper);
  const frontNode = texture(front ?? blank);
  const backNode = texture(back ?? blank, vec2(uv().x.oneMinus(), uv().y));
  const mat = new THREE.MeshStandardNodeMaterial({
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0,
  });
  mat.name = 'leaf';
  const paperC = tslColor(new THREE.Color(paper));
  const own = select(frontFacing, frontNode, backNode).rgb;
  const other = select(frontFacing, backNode, frontNode).rgb;
  // how much ink is printed on the other side at this point (0 = blank paper)
  const inkOther = float(1).sub(luminance(other).div(luminance(paperC).max(1e-3))).clamp(0, 1);
  const u = uv().x;
  const gutterAO = uniform(1);
  // occlusion where the page dives into the binding (the facing page hides the sky)
  const gutter = float(1).sub(exp(u.mul(-11)).mul(gutterAO.mul(0.24))).sub(exp(u.mul(-60)).mul(gutterAO.mul(0.1)));
  const edge = float(1).sub(smoothstep(0.988, 1.0, u).mul(0.05));
  const showThrough = float(1).sub(inkOther.mul(0.028));
  mat.colorNode = own.mul(gutter).mul(edge).mul(showThrough).add(paperGrain());
  // Translucency: a lifted page lit from behind glows faintly, and the print
  // on the far side shows through as a soft shadow in that glow.
  const backlit = dot(normalWorld, paperLight.dir).negate().max(0);
  const glow = paperC.mul(paperLight.radiance).mul(backlit.mul(0.42)).mul(float(1).sub(inkOther.mul(0.75)));
  // Bounce: light reflected between white leaves softens cast shadows on
  // paper (only on paper, so figure shading keeps its calibration).
  mat.emissiveNode = glow.add(own.mul(paperLight.bounce));
  mat.userData.frontNode = frontNode;
  mat.userData.backNode = backNode;
  mat.userData.gutterAO = gutterAO;
  mat.userData.blank = blank;
  return mat;
}

/** Anti-aliased plain-weave cloth relief in [−1, 1] (fades to 0 when threads get sub-pixel). */
function weave(coord) {
  const a = sin(coord.x.mul(Math.PI * 2));
  const b = sin(coord.y.mul(Math.PI * 2));
  const over = sin(coord.x.mul(Math.PI)).mul(sin(coord.y.mul(Math.PI))); // checker of warp/weft crossings
  const w = mix(a.mul(b), over, 0.5);
  const aa = float(1).sub(smoothstep(0.22, 0.5, max(fwidth(coord.x), fwidth(coord.y))));
  return w.mul(aa);
}

/** Dye mottling — visible at every zoom level, so the cloth never looks flat. */
function mottle(seed) {
  return mx_noise_float(vec3(uv().mul(vec2(7, 9)), seed)).mul(0.035).add(mx_noise_float(vec3(uv().mul(vec2(40, 52)), seed + 2)).mul(0.012));
}

/**
 * Cloth-bound board face: woven texture + printed/foiled artwork on top.
 * @param {object} o
 * @param {THREE.Texture} [o.art]       cover artwork (board aspect)
 * @param {string} [o.cloth]            cloth colour (used when no art is set)
 * @param {string} [o.foil]             foil colour; matching art pixels get a metallic sheen
 * @param {boolean} [o.mirror]          sample art at (1−u, v) (bottom faces)
 * @param {boolean} [o.groove]          press the joint groove next to the spine
 * @param {number[]} [o.size]           board [width, height] (for thread density)
 */
export function createClothMaterial({ art, cloth = '#23412f', foil = '#c9a44c', mirror = false, groove = true, size = [1.028, 1.436] } = {}) {
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.84, metalness: 0.0 });
  mat.name = 'cloth';
  const tuv = mirror ? vec2(uv().x.oneMinus(), uv().y) : uv();
  const artNode = texture(art ?? blankPaperTexture(cloth), tuv);
  const threads = uv().mul(vec2(size[0] * 300, size[1] * 300));
  const relief = weave(threads);
  const foilC = tslColor(new THREE.Color(foil));
  const foilMask = float(1).sub(smoothstep(0.05, 0.14, artNode.rgb.sub(foilC).length()));
  let base = artNode.rgb.mul(float(1).add(relief.mul(0.07).mul(foilMask.oneMinus()))).mul(float(1).add(mottle(1.3)));
  if (groove) {
    // French joint: a pressed channel parallel to the spine, ~4% in from it
    const u = uv().x;
    const ch = smoothstep(0.028, 0.036, u).mul(float(1).sub(smoothstep(0.04, 0.05, u)));
    const lip = smoothstep(0.048, 0.052, u).mul(float(1).sub(smoothstep(0.052, 0.06, u)));
    base = base.mul(float(1).sub(ch.mul(0.28))).mul(float(1).add(lip.mul(0.08)));
  }
  mat.colorNode = base;
  // Foil: fake a bright studio reflection so gold leaf glints as the board moves.
  const r = reflect(positionViewDirection.negate(), normalView);
  const env = smoothstep(-0.25, 0.85, r.y);
  const glint = foilC.mul(env.mul(env).mul(0.75).add(0.18));
  mat.emissiveNode = glint.mul(foilMask);
  mat.roughnessNode = mix(float(0.84), float(0.45), foilMask);
  mat.userData.artNode = artNode;
  return mat;
}

/**
 * Inside of a board: the pasted-down endpaper (page sized) framed by the
 * cloth turn-ins along head, tail and fore-edge.
 * @param {object} o
 * @param {THREE.Texture} [o.endpaper]  endpaper artwork (page aspect)
 * @param {boolean} [o.mirror]          bottom face of the front board
 * @param {number} o.pageU              fraction of the board width covered by the endpaper
 * @param {number} o.pageV0             board-v where the page area starts (tail side)
 * @param {number} o.pageV1             board-v where the page area ends (head side)
 */
export function createEndpaperMaterial({ endpaper, cloth = '#23412f', paper = '#efe7d6', mirror = false, pageU = 0.973, pageV0 = 0.0195, pageV1 = 0.9805, size = [1.028, 1.436] } = {}) {
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.88, metalness: 0 });
  mat.name = 'endpaper';
  const ue = uv().x.div(pageU);
  const ve = uv().y.sub(pageV0).div(pageV1 - pageV0);
  const endNode = texture(endpaper ?? blankPaperTexture(paper), vec2(mirror ? ue.oneMinus() : ue, ve));
  const aaU = fwidth(ue).max(1e-4);
  const aaV = fwidth(ve).max(1e-4);
  const inside = float(1)
    .sub(smoothstep(float(1).sub(aaU), float(1).add(aaU), ue))
    .mul(smoothstep(aaV.negate(), aaV, ve))
    .mul(float(1).sub(smoothstep(float(1).sub(aaV), float(1).add(aaV), ve)));
  const clothC = tslColor(new THREE.Color(cloth));
  const threads = uv().mul(vec2(size[0] * 300, size[1] * 300));
  const turnIn = clothC.mul(float(1).add(weave(threads).mul(0.07))).mul(float(1).add(mottle(4.1)));
  // the pastedown's paper edge casts a hair-line shadow onto the turn-in
  const du = ue.sub(1).mul(pageU * size[0]).max(0);
  const dv = max(ve.negate(), ve.sub(1)).mul((pageV1 - pageV0) * size[1]).max(0);
  const lip = float(1).sub(float(1).sub(smoothstep(0.0, 0.006, max(du, dv))).mul(0.3));
  const paperSide = endNode.rgb.add(paperGrain(0.8));
  mat.colorNode = mix(turnIn.mul(lip), paperSide, inside);
  mat.userData.endNode = endNode;
  return mat;
}

/**
 * Stacked page edges (fore-edge, head, tail). uv.y counts leaves across the
 * block thickness (1 unit = one leaf), so each leaf boundary is a fine line;
 * lines fade to an even tone before they alias, and each leaf gets a hair
 * of tonal variation like real paper.
 */
export function createPageEdgeMaterial({ paper = '#f2ede1' } = {}) {
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.93 });
  mat.name = 'page-edges';
  const v = uv().y;
  const f = fract(v);
  const d = min(f, f.oneMinus());
  const aa = fwidth(v).max(1e-4);
  // no line on the bottom edge (it sits on the board and only aliases)
  const line = float(1).sub(smoothstep(0.0, aa.mul(1.2).add(0.1), d)).mul(smoothstep(0.25, 0.6, v));
  const dense = smoothstep(0.22, 0.55, aa);
  const leafHash = fract(sin(floor(v).mul(91.7)).mul(43758.5453));
  const stripes = float(1).sub(line.mul(0.15)).sub(leafHash.sub(0.5).mul(0.05));
  const shade = mix(stripes, float(0.975), dense);
  mat.colorNode = tslColor(new THREE.Color(paper)).mul(shade);
  return mat;
}

/** Cloth band around a board's edges and the spine. */
export function createBoardEdgeMaterial(cloth = '#23412f') {
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.82 });
  const threads = uv().mul(300); // band/spine UVs are in world units
  mat.colorNode = tslColor(new THREE.Color(cloth)).mul(0.9).mul(float(1).add(weave(threads).mul(0.06))).mul(float(1).add(mottle(7.7)));
  mat.name = 'board-edge';
  return mat;
}

/**
 * Headband: a little striped silk bead at head and tail of the spine. The
 * stripe count is scaled by `stripeScale` so stretching the band keeps the
 * bead spacing constant.
 */
export function createHeadbandMaterial({ colors = ['#9e2b25', '#efe7d6'] } = {}) {
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.6 });
  mat.name = 'headband';
  const stripeScale = uniform(1);
  // silk wound round a core: fine beads, the second colour a muted tint of the first
  const t = positionLocal.y.mul(stripeScale).mul(420);
  const s = smoothstep(0.3, 0.7, abs(fract(t).sub(0.5)).mul(2));
  const a = tslColor(new THREE.Color(colors[0]));
  const b = mix(a, tslColor(new THREE.Color(colors[1])), 0.45);
  mat.colorNode = mix(a, b, s).mul(0.82);
  mat.userData.stripeScale = stripeScale;
  return mat;
}
