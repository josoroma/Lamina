// TSL colour nodes for the botanical plate look (WGSL on WebGPU, GLSL on
// the WebGL 2 fallback — never raw shader code).
//
// A lithographic flower is mostly *colour drawn along the form*: gradients
// from claw to tip, darker veins converging on the base, a contrasting
// margin or throat, speckles, stripes. bladeColor() builds all of that from
// the uv layout shared by BladeSurface / CorollaSurface (u across, 0.5 the
// midrib; v base → tip; aSide 0 adaxial, 1 abaxial). The emissive helpers
// fake the two optical effects that make petals read as petals: light
// passing through a thin blade (back-light tint) and the soft rim sheen of
// a hairy calyx. They feed MeshStandardNodeMaterial.emissiveNode, so the
// ink kit's hatching still sees them as light.
import * as THREE from 'three/webgpu';
import {
  uv, attribute, float, vec3, color as tslColor, mix, smoothstep, abs, fract, min, fwidth,
  pow, dot, normalWorld, normalView, positionViewDirection, positionLocal, mx_noise_float,
  mx_fractal_noise_float, clamp, uniform,
} from 'three/tsl';

/** World-space direction towards the studio key light (stage.js / lab). */
export const KEY_DIR = new THREE.Vector3(-1.6, 3.4, 1.4).normalize();
const keyDir = uniform(KEY_DIR.clone());

const col = (c) => (c?.isNode ? c : tslColor(new THREE.Color(c)));

/** Anti-aliased line mask for a coordinate with lines at integers. */
export function lineMask(t, halfWidth) {
  const f = fract(t);
  const d = min(f, f.oneMinus());
  const aa = fwidth(t).mul(0.75).max(1e-4);
  return float(1).sub(smoothstep(float(halfWidth).sub(aa), float(halfWidth).add(aa), d));
}

/**
 * Colour node for a blade or corolla.
 * @param {object} o
 * @param {string} o.base             colour at the claw/base
 * @param {string} [o.mid]            colour at `midAt`
 * @param {string} [o.tip]            colour at the tip
 * @param {number} [o.midAt=0.45]
 * @param {string} [o.margin]         colour washed along the margin
 * @param {number} [o.marginWidth=0.2] fraction of the half-width
 * @param {number} [o.marginMix=1]
 * @param {string} [o.vein]           vein colour
 * @param {number} [o.veins=0]        vein lines across the blade (converge at the base)
 * @param {number} [o.veinWidth=0.1]  half-width of a vein, fraction of spacing
 * @param {number} [o.veinStrength=0.3]
 * @param {[number, number]} [o.veinRange=[0.0, 0.85]] v range where veins show
 * @param {number} [o.midrib=0]       extra strength for the midrib line
 * @param {Array<{color:string,v0:number,v1:number,d0?:number,d1?:number,soft?:number,side?:0|1,mix?:number}>} [o.patches]
 *        soft rectangular regions in (v, d = distance from midrib 0..1)
 * @param {{color:string, scale:number, threshold:number, mix?:number, side?:0|1}} [o.speckle]
 * @param {string} [o.abaxial]        colour of the abaxial face
 * @param {number} [o.abaxialMix=1]
 * @param {number} [o.mottle=0.05]    lithographic stone mottling
 * @param {number} [o.mottleScale=1.6] per cm
 * @returns {import('three/tsl').Node}
 */
export function bladeColor(o) {
  const U = uv();
  const v = U.y;
  const d = abs(U.x.sub(0.5)).mul(2);
  const side = attribute('aSide', 'float');
  const midAt = o.midAt ?? 0.45;
  let c = col(o.base);
  if (o.mid) c = mix(c, col(o.mid), smoothstep(0.0, midAt, v));
  if (o.tip) c = mix(c, col(o.tip), smoothstep(midAt, 1.0, v));
  if (o.margin) {
    const mw = o.marginWidth ?? 0.2;
    c = mix(c, col(o.margin), smoothstep(1 - mw, 1.0, d).mul(o.marginMix ?? 1));
  }
  for (const p of o.patches ?? []) {
    const s = p.soft ?? 0.08;
    let m = smoothstep(p.v0 - s, p.v0 + s, v).mul(float(1).sub(smoothstep(p.v1 - s, p.v1 + s, v)));
    const d0 = p.d0 ?? 0, d1 = p.d1 ?? 1.2;
    m = m.mul(smoothstep(d0 - s, d0 + s, d)).mul(float(1).sub(smoothstep(d1 - s, d1 + s, d)));
    if (p.side === 0) m = m.mul(side.oneMinus());
    if (p.side === 1) m = m.mul(side);
    c = mix(c, col(p.color), m.mul(p.mix ?? 1));
  }
  if (o.veins) {
    const t = U.x.sub(0.5).mul(o.veins);
    const r = o.veinRange ?? [0.0, 0.85];
    let m = lineMask(t, o.veinWidth ?? 0.1).mul(o.veinStrength ?? 0.3);
    m = m.mul(smoothstep(r[0], r[0] + 0.08, v)).mul(float(1).sub(smoothstep(r[1] - 0.15, r[1], v)));
    c = mix(c, col(o.vein ?? '#000000'), m);
  }
  if (o.midrib) {
    const m = float(1).sub(smoothstep(0.0, 0.035, d)).mul(o.midrib).mul(float(1).sub(smoothstep(0.75, 1.0, v)));
    c = mix(c, col(o.vein ?? '#000000'), m);
  }
  if (o.speckle) {
    const sp = o.speckle;
    const n = mx_noise_float(positionLocal.mul(sp.scale));
    let m = smoothstep(sp.threshold, sp.threshold + 0.08, n).mul(sp.mix ?? 1);
    if (sp.side === 0) m = m.mul(side.oneMinus());
    if (sp.side === 1) m = m.mul(side);
    c = mix(c, col(sp.color), m);
  }
  if (o.abaxial) c = mix(c, col(o.abaxial), side.mul(o.abaxialMix ?? 1));
  const mottle = o.mottle ?? 0.05;
  if (mottle) c = c.mul(mx_noise_float(positionLocal.mul(o.mottleScale ?? 1.6)).mul(mottle).add(1));
  return c;
}

/**
 * Back-light tint for thin blades: light from the key (and the sky) passing
 * through the blade glows on the face turned away from it.
 * @param {import('three/tsl').Node|string} colorNode  usually the blade colour
 * @param {number} [strength=0.35]
 */
export function translucency(colorNode, strength = 0.35) {
  const c = col(colorNode);
  const back = clamp(dot(normalWorld, keyDir).negate(), 0, 1).mul(0.75);
  const sky = clamp(normalWorld.y.negate(), 0, 1).mul(0.35);
  // saturate the transmitted colour a little (light filtered by pigment)
  const tint = c.mul(c).mul(1.4).add(c.mul(0.2));
  return tint.mul(back.add(sky)).mul(strength);
}

/**
 * Velvety rim sheen for hairy organs (calyx, ovary, stems).
 * @param {string} sheenColor
 * @param {number} [strength=0.35]
 * @param {number} [power=2.2]
 */
export function fuzz(sheenColor, strength = 0.35, power = 2.2) {
  const fres = float(1).sub(abs(dot(normalView, positionViewDirection))).clamp(0, 1);
  return col(sheenColor).mul(pow(fres, power)).mul(strength);
}

/**
 * Bark: fractal mottling with pale lichen patches (position-based, no UV seams).
 * `stretch` scales the noise per axis: shrink the branch's long axis to draw
 * furrows along it, e.g. [0.3, 3, 3] for a branch lying along X.
 * @param {{ base: string, dark: string, lichen?: string, scale?: number, lichenAmount?: number,
 *           stretch?: [number, number, number] }} o
 */
export function barkColor(o) {
  const s = o.scale ?? 0.9;
  const p = positionLocal.mul(s);
  const st = o.stretch ?? [1.0, 2.6, 1.0];
  const n = mx_fractal_noise_float(p.mul(vec3(st[0], st[1], st[2])), 3, 2.0, 0.5);
  let c = mix(col(o.dark), col(o.base), smoothstep(-0.45, 0.35, n));
  const fine = mx_noise_float(p.mul(7.0));
  c = c.mul(fine.mul(0.08).add(1));
  if (o.lichen) {
    const l = mx_noise_float(p.mul(0.55).add(vec3(3.1, 0.7, 1.9)));
    c = mix(c, col(o.lichen), smoothstep(0.38, 0.5, l).mul(o.lichenAmount ?? 0.75));
  }
  return c;
}

/**
 * Hatch coordinate with lines running base → tip along a blade (vein-wise),
 * at the shared figure hatch density.
 * @param {object} ctx  FigureContext
 * @param {number} widthCm  blade width the u range spans
 */
export function veinHatch(ctx, widthCm) {
  return uv().x.mul(widthCm).mul(ctx.u.hatchFreq);
}

/** Cross-contour hatch: rings around a tube/corolla along its length. */
export function ringHatch(ctx, lengthCm) {
  return uv().y.mul(lengthCm).mul(ctx.u.hatchFreq);
}

/**
 * Convenience: an ink material for a blade with colour, translucency and
 * vein-following hatching in one call.
 * @param {object} ctx FigureContext
 * @param {object} o   bladeColor options plus { width, translucency, roughness, hatch, crossHatch,
 *                     reflect, sheen, sheenColor, clearcoat, svgColor, name, fuzz }
 */
export function bladeMaterial(ctx, o) {
  const colorNode = bladeColor(o);
  const mat = ctx.ink({
    colorNode,
    svgColor: o.svgColor ?? o.mid ?? o.base,
    roughness: o.roughness ?? 0.62,
    hatch: o.hatch ?? 0.85,
    hatchCoord: o.width ? veinHatch(ctx, o.width) : undefined,
    crossHatch: o.crossHatch,
    reflect: o.reflect,
    sheen: o.sheen,
    sheenColor: o.sheenColor,
    clearcoat: o.clearcoat,
    name: o.name,
  });
  const em = [];
  if (o.translucency !== 0) em.push(translucency(colorNode, o.translucency ?? 0.3));
  if (o.fuzz) em.push(fuzz(o.fuzz.color, o.fuzz.strength, o.fuzz.power));
  if (em.length) mat.emissiveNode = em.length === 1 ? em[0] : em[0].add(em[1]);
  return mat;
}

/** Corolla material: colour + translucency + cross-contour hatching. */
export function corollaMaterial(ctx, o) {
  const colorNode = bladeColor(o);
  const mat = ctx.ink({
    colorNode,
    svgColor: o.svgColor ?? o.mid ?? o.base,
    roughness: o.roughness ?? 0.6,
    hatch: o.hatch ?? 0.85,
    hatchCoord: o.length ? ringHatch(ctx, o.length) : undefined,
    crossHatch: o.crossHatch,
    reflect: o.reflect,
    sheen: o.sheen,
    sheenColor: o.sheenColor,
    clearcoat: o.clearcoat,
    name: o.name,
  });
  if (o.translucency !== 0) mat.emissiveNode = translucency(colorNode, o.translucency ?? 0.3);
  return mat;
}

