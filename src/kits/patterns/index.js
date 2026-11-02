// Patterns kit — natural-history surface patterns as TSL colour nodes.
//
// Every factory returns a `vec3` colour node (linear working space) to pass
// to `ctx.ink({ colorNode })`, so scales, rings, blotches and veins are lit,
// hatched and outlined exactly like flat colours, on WebGPU and WebGL 2.
// Hard edges are anti-aliased with screen-space derivatives (`fwidth`), so a
// pattern stays crisp at book zoom and when inspected up close.
//
// Coordinates are explicit nodes so subjects decide what a pattern follows:
//   uv()                 parametric surfaces (tubes, petals, leaves)
//   positionLocal        solid patterns that ignore UV seams (blotches, speckle)
//   uv().y.mul(rings)    a float coordinate for bands/gradients along a body
// Colours are sRGB hex strings (or THREE.Color / numbers), like the rest of
// the book's palette.
import * as THREE from 'three/webgpu';
import {
  vec2, vec3, float, color as tslColor, uv, positionLocal,
  fract, floor, abs, min, max, mix, smoothstep, clamp, length, dot, fwidth, select,
  mx_noise_float, mx_fractal_noise_float, mx_cell_noise_float, mx_worley_noise_vec2,
} from 'three/tsl';

// ---------------------------------------------------------------- helpers

/** Colour node from an sRGB hex / THREE.Color / number / existing node. */
export function hex(c) {
  if (c && c.isNode) return c;
  return tslColor(c instanceof THREE.Color ? c : new THREE.Color(c));
}

/** Anti-aliased step: 0 below `edge`, 1 above, blurred by one pixel (+ `soft`). */
export function aastep(edge, x, soft = 0) {
  const w = fwidth(x).mul(0.75).add(soft).max(1e-5);
  return smoothstep(float(edge).sub(w), float(edge).add(w), x);
}

/** Anti-aliased band mask: 1 inside [a, b] of `x`. */
function aaband(a, b, x, soft = 0) {
  return aastep(a, x, soft).mul(float(1).sub(aastep(b, x, soft)));
}

/** Coerce a pattern coordinate: default uv(); numbers are not allowed. */
const asCoord = (c, def) => (c === undefined || c === null ? def : c);

// ---------------------------------------------------------------- gradient

/**
 * Smooth multi-stop gradient along a float coordinate.
 * @param {import('three/tsl').Node} coord  float, typically 0..1 (e.g. uv().y)
 * @param {Array<[number, string]>} stops  [[pos, colour], ...] sorted by pos
 * @returns {import('three/tsl').Node} vec3 colour
 * @example gradient(uv().y, [[0, '#f7f1e3'], [0.55, '#c77dba'], [1, '#6a2a72']])
 */
export function gradient(coord, stops) {
  if (!stops?.length) throw new Error('gradient: needs at least one stop');
  const x = float(coord);
  let c = hex(stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    const [p0] = stops[i - 1];
    const [p1, col] = stops[i];
    c = mix(c, hex(col), smoothstep(p0, Math.max(p1, p0 + 1e-4), x));
  }
  return c;
}

// ---------------------------------------------------------------- bands

/**
 * Crisp colour bands along a float coordinate — coral-snake rings, banded
 * tails, striped petals. Each stop starts a band that lasts until the next.
 * @param {import('three/tsl').Node} coord  float coordinate (e.g. uv().y.mul(rings))
 * @param {Array<[number, string]>} stops  [[start, colour], ...] in [0, 1)
 * @param {{ repeat?: boolean, soft?: number, jitter?: number, jitterCoord?: any }} [o]
 *        repeat: wrap with fract (default true) · soft: extra edge blur in coord units ·
 *        jitter: hand-painted wobble of band edges (coord units), driven by `jitterCoord`
 * @returns {import('three/tsl').Node} vec3 colour
 * @example bands(uv().y.mul(18), [[0, '#c8342b'], [0.42, '#f1d64a'], [0.5, '#151412'], [0.86, '#f1d64a'], [0.94, '#c8342b']])
 */
export function bands(coord, stops, o = {}) {
  if (!stops?.length) throw new Error('bands: needs at least one stop');
  let x = float(coord);
  if (o.jitter) {
    const jc = o.jitterCoord ?? positionLocal.mul(0.6);
    x = x.add(mx_noise_float(jc).mul(o.jitter));
  }
  const f = o.repeat === false ? x : fract(x);
  let c = hex(stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    c = mix(c, hex(stops[i][1]), aastep(stops[i][0], f, o.soft ?? 0));
  }
  return c;
}

// ---------------------------------------------------------------- stripes

/**
 * Parallel stripes with an adjustable duty cycle, optionally wavy.
 * @param {object} o
 * @param {import('three/tsl').Node} [o.coord=uv()]  vec2
 * @param {number} [o.freq=8]  stripes per coord unit
 * @param {number} [o.width=0.35]  stripe fraction of the period (0..1)
 * @param {number} [o.angle=0]  radians, direction across which stripes repeat
 * @param {number} [o.wave=0]  amplitude of a sinuous wobble (periods)
 * @param {string} [o.base='#e9dfc8'] [o.color='#3a2f25']
 * @returns {import('three/tsl').Node} vec3 colour
 */
export function stripes({ coord, freq = 8, width = 0.35, angle = 0, wave = 0, base = '#e9dfc8', color = '#3a2f25' } = {}) {
  const p = vec2(asCoord(coord, uv()));
  const dir = vec2(Math.cos(angle), Math.sin(angle));
  const across = vec2(-Math.sin(angle), Math.cos(angle));
  let t = dot(p, dir).mul(freq);
  if (wave) t = t.add(mx_noise_float(vec3(dot(p, across).mul(freq * 0.35), t.mul(0.15), 0.0)).mul(wave));
  const f = fract(t);
  const m = aaband(0.5 - width / 2, 0.5 + width / 2, f);
  return mix(hex(base), hex(color), m);
}

// ---------------------------------------------------------------- scales

/**
 * Imbricate reptile scales on a staggered lattice: rounded lens-shaped
 * scales, dark interstitial skin, an optional keel (the ridge of a viper's
 * dorsal scale) and per-scale tone jitter. Pair with a `bands`/`blotches`
 * colour as `base` to paint a species' pattern under the scalation.
 * @param {object} o
 * @param {import('three/tsl').Node} [o.coord=uv()]  vec2 (u around the body, v along it)
 * @param {number} [o.rows=40]  scale rows along v
 * @param {number} [o.cols=20]  scales around u
 * @param {number} [o.keel=0]  0 smooth … 1 strongly keeled
 * @param {number} [o.edge=0.3]  width of the dark interstitial skin (0..1)
 * @param {string|any} [o.base='#7d6a43']  scale colour (hex or a colour node, e.g. bands(...))
 * @param {string} [o.edgeColor]  interstitial skin; default: base darkened
 * @param {number} [o.jitter=0.08]  per-scale brightness variation
 * @param {number} [o.overlap=0.18]  imbrication: scales lie over the next row
 * @returns {import('three/tsl').Node} vec3 colour
 */
export function scales({
  coord, rows = 40, cols = 20, keel = 0, edge = 0.3, base = '#7d6a43', edgeColor, jitter = 0.08, overlap = 0.18,
} = {}) {
  const p = vec2(asCoord(coord, uv())).mul(vec2(cols, rows));
  // staggered lattice: odd rows are offset by half a scale
  const row = floor(p.y);
  const odd = fract(row.mul(0.5)).mul(2.0); // 0 or 1
  const q = vec2(p.x.add(odd.mul(0.5)), p.y);
  const cell = floor(q);
  const f = fract(q).sub(0.5); // −0.5..0.5 within the cell
  // imbrication: the scale's free edge points down the body (−v)
  const g = vec2(f.x, f.y.add(overlap).mul(1.0 + overlap));
  // lens shape: distance to the scale outline (0 centre … 1 edge)
  const lens = length(vec2(g.x.mul(1.9), g.y.mul(1.45)));
  // neighbours in the next row overlap the corners — take the nearer centre
  const nx = select(f.x.lessThan(0.0), float(-0.5), float(0.5));
  const gn = vec2(f.x.sub(nx), f.y.add(1.0).add(overlap).mul(1.0 + overlap));
  const lensN = length(vec2(gn.x.mul(1.9), gn.y.mul(1.45)));
  const d = min(lens, lensN.add(0.12));
  const inner = float(1).sub(aastep(1.0 - edge, d));
  // keel: a ridge along the scale's long axis
  const keelMask = float(1).sub(smoothstep(0.03, 0.11, abs(g.x))).mul(smoothstep(0.65, 0.1, abs(g.y))).mul(keel);
  // per-scale variation
  const rnd = mx_cell_noise_float(cell.add(vec2(row.mul(0.0), 0.0))).sub(0.5).mul(jitter * 2);
  const baseC = hex(base);
  const scaleC = baseC.mul(rnd.add(1.0)).mul(mix(float(0.92), float(1.06), smoothstep(1.0, 0.2, d)));
  const keelC = scaleC.mul(mix(float(1.0), float(1.18), keelMask));
  const skin = edgeColor ? hex(edgeColor) : baseC.mul(0.38);
  return mix(skin, keelC, inner);
}

// ---------------------------------------------------------------- blotches

/**
 * Irregular blotches / saddles (boa saddles, mushroom-cap patches, lichen):
 * thresholded fractal noise with an optional darker rim and lighter centre.
 * @param {object} o
 * @param {import('three/tsl').Node} [o.coord=positionLocal]  vec3 (or vec2)
 * @param {number} [o.scale=0.3]  blotches per coord unit
 * @param {number} [o.coverage=0.45]  0..1 fraction covered
 * @param {number} [o.softness=0.04]
 * @param {string|any} [o.base='#c9b48a']  ground colour (hex or node)
 * @param {string} [o.color='#6b4a2b']  blotch colour
 * @param {string} [o.rim]  optional rim colour (a dark border, as on boa saddles)
 * @param {number} [o.rimWidth=0.08]
 * @param {number} [o.seed=0]
 * @returns {import('three/tsl').Node} vec3 colour
 */
export function blotches({
  coord, scale = 0.3, coverage = 0.45, softness = 0.04, base = '#c9b48a', color = '#6b4a2b', rim, rimWidth = 0.08, seed = 0,
} = {}) {
  const c = asCoord(coord, positionLocal);
  const p = vec3(c).mul(scale).add(vec3(seed * 17.13, seed * 3.7, seed * 9.1));
  const n = mx_fractal_noise_float(p, 3, 2.0, 0.5).mul(0.5).add(0.5); // ~0..1
  const th = 1 - coverage * 0.5 - 0.25;
  const inside = aastep(th, n, softness);
  let col = mix(hex(base), hex(color), inside);
  if (rim) {
    const ring = aaband(th, th + rimWidth, n, softness * 0.5);
    col = mix(col, hex(rim), ring);
  }
  return col;
}

// ---------------------------------------------------------------- speckle

/**
 * Fine speckles / freckles (bird eggs, orchid lips, beetle elytra) from
 * jittered cells: each cell holds one dot of random size.
 * @param {object} o
 * @param {import('three/tsl').Node} [o.coord=positionLocal]  vec2 or vec3
 * @param {number} [o.scale=6]  cells per coord unit
 * @param {number} [o.density=0.55]  fraction of cells that hold a dot
 * @param {number} [o.size=0.32]  dot radius as a fraction of the cell
 * @param {string|any} [o.base='#efe6cf'] [o.color='#4b2a2a']
 * @returns {import('three/tsl').Node} vec3 colour
 */
export function speckle({ coord, scale = 6, density = 0.55, size = 0.32, base = '#efe6cf', color = '#4b2a2a' } = {}) {
  const c = asCoord(coord, positionLocal);
  const p = vec3(c).mul(scale);
  const cell = floor(p);
  const pick = mx_cell_noise_float(cell); // 0..1 per cell
  const r = mx_cell_noise_float(cell.add(vec3(7.0, 3.0, 11.0))).mul(0.6).add(0.4).mul(size);
  const jit = vec3(
    mx_cell_noise_float(cell.add(vec3(1.0, 0.0, 0.0))),
    mx_cell_noise_float(cell.add(vec3(0.0, 1.0, 0.0))),
    mx_cell_noise_float(cell.add(vec3(0.0, 0.0, 1.0))),
  ).sub(0.5).mul(float(1).sub(r.mul(2.0)).max(0.0));
  const d = length(fract(p).sub(0.5).sub(jit));
  const dot_ = float(1).sub(aastep(r, d)).mul(select(pick.lessThan(density), float(1), float(0)));
  return mix(hex(base), hex(color), dot_);
}

// ---------------------------------------------------------------- rosettes

/**
 * Rosettes (jaguar, ocelot): broken dark rings around a slightly darker
 * centre, on a worley lattice.
 * @param {object} o
 * @param {import('three/tsl').Node} [o.coord=positionLocal]  vec2 or vec3
 * @param {number} [o.scale=3]
 * @param {string|any} [o.base='#d9a35a'] [o.ring='#2a1d14'] [o.center='#b9813f']
 * @param {number} [o.width=0.16]  ring width (cell units)
 * @returns {import('three/tsl').Node} vec3 colour
 */
export function rosettes({ coord, scale = 3, base = '#d9a35a', ring = '#2a1d14', center = '#b9813f', width = 0.16 } = {}) {
  const c = asCoord(coord, positionLocal);
  const p = vec3(c).mul(scale);
  const w = mx_worley_noise_vec2(p, 0.75); // (F1, F2) distances to the nearest feature points
  // a ring of broken spots around each feature point, open where noise says so
  const r0 = 0.24, r1 = r0 + width;
  const broken = mx_noise_float(p.mul(3.1)).mul(0.5).add(0.5);
  const ringMask = aaband(r0, r1, w.x).mul(aastep(0.36, broken));
  // only where the cell is roomy enough (no rings squeezed onto borders)
  const roomy = aastep(0.12, w.y.sub(w.x));
  const centreMask = float(1).sub(aastep(r0, w.x));
  const col = mix(hex(base), hex(center), centreMask.mul(0.8));
  return mix(col, hex(ring), ringMask.mul(roomy));
}

// ---------------------------------------------------------------- veins

/**
 * Pinnate leaf venation in uv space: a midrib along v (u = 0.5) and
 * secondary veins sweeping toward the tip, fading into the margin.
 * @param {object} o
 * @param {import('three/tsl').Node} [o.coord=uv()]  vec2, u across the blade, v base→tip
 * @param {number} [o.count=9]  secondary veins per side
 * @param {number} [o.angle=0.9]  sweep: larger = veins run more steeply toward the tip
 * @param {number} [o.width=0.06]  vein width as a fraction of the spacing
 * @param {number} [o.midrib=0.012]  midrib half-width in u
 * @param {number} [o.curve=0.35]  outward curvature of the secondaries
 * @param {string|any} [o.base='#4f7a3a'] [o.color='#a9c47f']
 * @returns {import('three/tsl').Node} vec3 colour
 */
export function veins({ coord, count = 9, angle = 0.9, width = 0.06, midrib = 0.012, curve = 0.35, base = '#4f7a3a', color = '#a9c47f' } = {}) {
  const p = vec2(asCoord(coord, uv()));
  const x = abs(p.x.sub(0.5)).mul(2.0); // 0 at the midrib … 1 at the margin
  const s = p.y.sub(x.mul(angle * 0.25)).sub(x.mul(x).mul(curve * 0.08)).mul(count);
  const f = fract(s);
  const dv = min(f, f.oneMinus());
  const secondary = float(1).sub(aastep(width * 0.5, dv)).mul(smoothstep(1.0, 0.55, x)).mul(smoothstep(0.0, 0.06, p.y));
  const mid = float(1).sub(aastep(midrib, abs(p.x.sub(0.5))));
  const m = max(secondary, mid);
  return mix(hex(base), hex(color), clamp(m, 0.0, 1.0));
}

/** Names of every pattern factory (for samplers and docs). */
export const PATTERNS = ['scales', 'bands', 'blotches', 'speckle', 'veins', 'stripes', 'gradient', 'rosettes'];
