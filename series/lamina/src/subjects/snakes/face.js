// Snake faces in TSL (WGSL on WebGPU, GLSL on WebGL 2): the painted head and
// jaw, the eye, the named colours the SVG plate prints and the tongue colour.
// One painter for every species, driven by `spec.face` (species.js).
//
// Head coordinates are the head mesh's own (head.js): x from the back of the
// head to the snout tip, y up from the mouth line, z to the animal's right,
// in cm; the painters work in head lengths (Lh). Lateral marks are masked by
// the mesh normal (normalGeometry), so a stripe along the flank never floods
// over the crown and a crown stripe never runs down the cheek.
//
// Legibility rules (research-snake-faces.md §3.0, as corrected by its
// review): stripes and the pupil have a pixel floor (they never thin below
// ~1.5–2 px, and fall back to true size in close-up); sutures and the scale
// lattice have none — they fade out with the scale detail, like the body's;
// the catchlight is one disc per eye, at least 1.2 device px and at most
// 0.6 of the eye's radius, fixed in view space.
import * as THREE from 'three/webgpu';
import {
  Fn, float, vec2, vec3, vec4, color as tslColor, floor, fract, abs, min, max, clamp, mix,
  smoothstep, step, sin, cos, asin, sqrt, select, length, dot, fwidth, atan, mx_noise_float,
  positionGeometry, normalGeometry, positionView, normalView, modelViewMatrix, cameraProjectionMatrix,
} from 'three/tsl';
import { inkViewport } from '../../kits/ink/index.js';
import { bumpNormal } from './patterns.js';

const C = (hex) => tslColor(new THREE.Color(hex));
const fmod = (x, y) => x.sub(floor(x.div(y)).mul(y));
const noise3 = (x, y, z = 0) => mx_noise_float(vec3(x, y, float(z)));
const PUPIL = '#0b0a09';

/** Anti-aliased step: 0 below `edge`, 1 above, filtered by the pixel footprint of `x`. */
const aastep = (edge, x) => {
  const w = fwidth(x).mul(0.75).add(1e-4);
  const e = float(edge);
  return smoothstep(e.sub(w), e.add(w), x);
};

/** 1 within half-width `w` of d = 0; with `px`, never thinner than 2·px device px. */
const band = (d, w, px = 0) => float(1).sub(aastep(px ? max(float(w), fwidth(d).mul(px)) : float(w), d));

/** Distance (head lengths) from (X, Y) to the segment a–b, and where along it (0 at a … 1 at b). */
function seg(X, Y, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = Math.max(1e-9, dx * dx + dy * dy);
  const px = X.sub(a[0]), py = Y.sub(a[1]);
  const t = clamp(px.mul(dx).add(py.mul(dy)).div(l2), 0, 1);
  return { d: length(vec2(px.sub(t.mul(dx)), py.sub(t.mul(dy)))), t };
}

/** Signed side of (X, Y) to the line a→b: > 0 to its left (above a line running back and down). */
function side(X, Y, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  return X.sub(a[0]).mul(vy).sub(Y.sub(a[1]).mul(vx)).div(Math.hypot(vx, vy));
}

/**
 * Staggered scale lattice (the body's, patterns.js bodySkin) in cell units:
 * `sx` −0.5 (base, under the scale in front) … 0.5 (free hind edge), `sy`
 * across, `edge` 0 on the seam between two scales, `d` 0 centre … 1 corner.
 */
function lattice(u, v) {
  const ri = floor(v.add(0.5));
  const odd = fmod(ri, float(2));
  const cx = fract(u.add(odd.mul(0.5))).sub(0.5);
  const cy = v.sub(ri);
  const sd = select(cy.greaterThan(0), float(1), float(-1));
  const cx2 = fract(u.add(float(1).sub(odd).mul(0.5))).sub(0.5);
  const cy2 = cy.sub(sd);
  const d0 = abs(cx).mul(2).add(abs(cy)), d1 = abs(cx2).mul(2).add(abs(cy2));
  const own = d0.lessThan(d1);
  return { sx: select(own, cx, cx2), sy: select(own, cy, cy2), edge: abs(d0.sub(d1)), d: min(d0, d1) };
}

/**
 * The face colours of a species, morph overrides applied.
 * @param {object} spec  resolved species preset
 */
export function faceColors(spec) {
  const f = spec.face ?? {};
  return { ...(f.colors ?? {}), ...((spec.morph && f.morphs?.[spec.morph]) || {}) };
}

/** Tongue colour (sRGB hex). */
export const tongueColor = (spec) => faceColors(spec).tongue ?? '#1f1b22';

/**
 * Lip scales along x ∈ [x0, x1] (head lengths), numbered from the snout back;
 * `big` makes the 3rd twice as long (the bushmaster's). Returns the cell
 * coordinate `t`, the position inside the cell `f`, and `back` 0 (front) … 1.
 */
function lipRow(X, { n, x0, x1, big }) {
  const w = (x1 - x0) / (n + (big ? 1 : 0));
  const tF = float(x1).sub(X).div(w);
  const t = big ? tF.sub(clamp(tF.sub(2).mul(0.5), 0, 1)) : tF;
  return { t, f: fract(t), inRow: step(x0, X).mul(step(X, x1)), back: clamp(float(x1).sub(X).div(x1 - x0), 0, 1) };
}

/**
 * Distance (head lengths) to the outline of a set of rounded plates on the
 * crown, [cx, cz, hx, hz, round, slope] in head lengths (cz on |z|: mirrored;
 * `slope` shears a plate so its side follows a converging canthus, dz/dx).
 * The outline is the union's: plates that touch share one suture, and plates
 * that overlap merge instead of crossing each other's edges.
 */
function plateEdges(X, Z, boxes) {
  let d = float(1e3);
  for (const [cx, cz, hx, hz, r, slope = 0] of boxes) {
    const zc = slope ? X.sub(cx).mul(slope).add(cz) : float(cz);
    const qx = abs(X.sub(cx)).sub(hx - r), qz = abs(Z.sub(zc)).sub(hz - r);
    d = min(d, length(vec2(max(qx, 0), max(qz, 0))).add(min(max(qx, qz), 0)).sub(r));
  }
  return abs(d);
}

/** Suture lines of plates (segments in (x, |z|/W) head units) on the crown. */
function plateLines(X, Zn, W, lines) {
  let d = float(1e3);
  for (const [a, b] of lines) d = min(d, seg(X, Zn.mul(W), [a[0], a[1] * W], [b[0], b[1] * W]).d);
  return d;
}

/**
 * The head's skin: albedo and scale relief for one part.
 *
 * @param {object} spec  resolved species preset (`spec.face` drives the painter)
 * @param {object} geo   head geometry in cm (head.js): { Lh, W, Ht, Hb,
 *        eye: { x, y, z, r, rVis }, pit: { x, y, a, b } | null,
 *        nostril: { x, y, z, a, b, dorsal }, corner(u) → [y, z] (the crown's
 *        corner: canthus and supraocular edge) }
 * @param {'upper'|'jaw'} part
 * @param {object} [ctx]  FigureContext: when given, a physically scaled bump for the scales
 * @param {import('three/tsl').Node} [open]  0 (mouth shut) … 1 (open): how much of the mouth
 *        lining shows (head.js sets it from the gape); a shut mouth shows none
 * @returns {{ colorNode: import('three/tsl').Node, exportColorNode: import('three/tsl').Node,
 *            normalNode: import('three/tsl').Node|null }}  exportColorNode: the colours the SVG
 *          plate reads (material.userData.exportColorNode), without the fine lines and tone
 */
export function headSkin(spec, geo, part, ctx = null, open = float(1)) {
  const F = spec.face ?? {};
  const fc = faceColors(spec);
  const c = spec.colors;
  const { Lh, Hb } = geo;
  const W = geo.W / Lh, Ht = geo.Ht / Lh; // head lengths
  const E = { x: geo.eye.x / Lh, y: geo.eye.y / Lh, r: geo.eye.r / Lh };
  const upper = part === 'upper';

  const p = positionGeometry, n = normalGeometry;
  const X = p.x.div(Lh), Y = p.y.div(Lh), Z = abs(p.z).div(Lh);
  const nz = abs(n.z);
  const lateral = smoothstep(0.35, 0.7, nz); // the flanks
  const dorsal = smoothstep(0.55, 0.85, n.y); // the crown

  // ---- scale lattice (crown and face; elapids are shielded instead) -------------
  const sc = F.scales;
  let tone = float(1), relief = float(0), detail = float(0);
  if (sc) {
    const cell = sc.cell;
    const rm = (W + Ht) * 0.5;
    // around the head from the dorsal midline (upper) or the chin (jaw): no seam on show
    const ang = upper ? atan(p.z, p.y) : atan(p.z, p.y.negate());
    const u = float(1).sub(X).div(cell);
    const v = ang.mul(rm / cell);
    const L = lattice(u, v);
    detail = float(1).sub(smoothstep(0.22, 0.55, fwidth(u)));
    const seam = float(1).sub(smoothstep(0.0, 0.08, L.edge));
    const keel = float(1).sub(smoothstep(0.03, 0.1, abs(L.sy))).mul(smoothstep(-0.42, -0.1, L.sx)).mul(sc.keel ?? 0);
    const shingle = mix(float(0.9), float(1.03), smoothstep(-0.5, 0.3, L.sx));
    const granule = mix(float(1.04), float(0.9), smoothstep(0.45, 1.0, L.d));
    tone = mix(granule, shingle, sc.keel ? 1 : 0.35).add(keel.mul(0.07)).mul(float(1).sub(seam.mul(0.28)));
    relief = mix(float(1).sub(smoothstep(0.45, 1.0, L.d)), smoothstep(-0.55, 0.45, L.sx).mul(0.8).add(keel.mul(0.45)), sc.keel ? 1 : 0.35);
  }

  // ---- lip scales -----------------------------------------------------------------
  const lab = upper ? F.labials?.upper : F.labials?.lower;
  let onLip = float(0), lipSuture = float(0);
  if (lab) {
    const row = lipRow(X, lab);
    // the top (upper lip) or bottom (lower lip) edge of the row: arched scales
    const h = mix(float(lab.hFront), float(lab.hBack ?? lab.hFront), row.back).add(sin(row.f.mul(Math.PI)).mul(0.006));
    const yy = upper ? Y : Y.negate();
    onLip = float(1).sub(aastep(h, yy)).mul(row.inRow).mul(step(-0.02, yy)).mul(smoothstep(0.2, 0.5, nz));
    // the lip's inner side (the palate's rim, the floor's rim) is lip too: the
    // upper jaw is wider than the lower, so a shut mouth shows the underside
    // of the upper lip along its whole length
    onLip = max(onLip, float(1).sub(aastep(0, yy)).mul(row.inRow));
    // fine sutures between the scales, fading out with the scale detail;
    // the row's edge is the change of colour, not a drawn line
    const ld = float(1).sub(smoothstep(0.06, 0.2, fwidth(row.t)));
    const vert = float(1).sub(aastep(0.03, min(row.f, float(1).sub(row.f)))).mul(onLip).mul(smoothstep(0.0, 0.35, yy.div(h)));
    lipSuture = vert.mul(ld).mul(0.55);
  }

  const eyeRho = length(vec2(X.sub(E.x), Y.sub(E.y))).div(E.r);
  // shield sutures fade in from a head ~35 px long (inspect) and are whole
  // from ~70 px; at book zoom a coral's 19 px head is not a mesh of lines
  const shieldDetail = float(1).sub(smoothstep(0.014, 0.028, fwidth(X)));

  // `fine`: the scale lattice's tone, the sutures, the canthal line, the
  // plate edges, flecks and the brow's shadow — lines and tone narrower than
  // a scale. The colorNode paints them; the SVG plate reads the colours
  // without them (exportColorNode), so they never break into specks of the
  // named colours they would snap to (faceSwatches: tone, not separations)
  const paint = (fine) => Fn(() => {
    let col;
    const toned = (k) => (fine ? k.mul(mix(float(1), tone, detail.mul(float(1).sub(onLip)))) : k);
    const sutured = (k, sut, a) => (fine ? mix(k, sut, lipSuture.mul(a)) : k);
    switch (spec.pattern) {
      case 'asper': {
        // brown crown above the canthus (ahead of the eye) and above the
        // postocular stripe (behind it); yellow face, labials and chin below
        // the stripe runs back and down from the eye to the angle of the jaw
        const s0 = [E.x - 0.9 * E.r, E.y - 0.15 * E.r], s1 = [0.09, 0.06];
        const above = aastep(0, side(X, Y, s0, s1));
        const behind = float(1).sub(smoothstep(E.x - 0.6 * E.r, E.x + 0.3 * E.r, X));
        const crown = mix(smoothstep(0.6, 0.8, n.y), above, behind);
        col = mix(C(fc.face), C(fc.crown), crown);
        col = mix(col, C(fc.labials), onLip);
        if (!upper) col = mix(C(fc.chin), C(fc.labials), onLip);
        col = sutured(toned(col), C(fc.suture), 0.7);
        if (upper) {
          if (fine) {
            // pale canthal line, from the supraocular to the snout tip
            const canth = float(1).sub(aastep(0.22, abs(n.y.sub(nz)))).mul(smoothstep(E.x - 0.2 * E.r, E.x + 1.2 * E.r, X)).mul(smoothstep(1.2, 1.5, eyeRho));
            col = mix(col, C(fc.canthal), canth.mul(0.85));
          }
          // dark postocular stripe to the angle of the jaw (≥ 2 px)
          const st = seg(X, Y, s0, s1);
          col = mix(col, C(fc.stripe), band(st.d, mix(float(0.026), float(0.032), st.t), 1).mul(lateral));
        }
        break;
      }
      case 'schlegelii': {
        // one golden (or moss) yellow: paler lip scales, keeled crown scales,
        // a very few tiny dark flecks
        const nn = noise3(p.x.mul(1.6), p.y.mul(1.6), p.z.mul(1.6)).mul(0.5).add(0.5);
        col = mix(C(c.ground), C(c.groundAlt), nn.mul(0.45));
        if (!upper) col = C(fc.chin);
        col = mix(col, C(fc.labials), onLip);
        col = sutured(toned(col), C(fc.suture), 0.55);
        if (fine) {
          const fl = smoothstep(0.78, 0.82, noise3(p.x.mul(9), p.y.mul(9), p.z.mul(9).add(4)));
          col = mix(col, C(c.fleckDark), fl.mul(0.6).mul(float(1).sub(onLip)));
        }
        break;
      }
      case 'micrurus': {
        // black snout cap (its rear border slants forward down the flank),
        // yellow parietal band, black nuchal ring; glossy shields
        const yn = clamp(Y.div(Ht * 0.9), 0, 1);
        const capX = float(0.62).sub(yn.mul(0.07));
        const band2 = upper ? step(0.12, X).mul(float(1).sub(aastep(capX, X))) : step(0.1, X).mul(step(X, 0.6));
        col = mix(C(c.black), C(c.yellow), band2);
        const sutC = mix(C(fc.sutureYellow), C(fc.suture), float(1).sub(band2));
        if (upper && fine) {
          const d = plateLines(X, Z, W, CORAL_SHIELDS);
          const sut = float(1).sub(aastep(0.006, d)).mul(dorsal);
          col = mix(col, sutC, sut.mul(shieldDetail).mul(0.8));
        }
        col = sutured(col, sutC, 0.8);
        break;
      }
      case 'crotalus': {
        col = mix(C(c.ground), C(c.headTop), dorsal);
        if (!upper) col = C(c.venter);
        col = mix(col, C(fc.labials), onLip);
        col = sutured(toned(col), C(fc.suture), 0.6);
        if (upper) {
          if (fine) {
            // pale-edged plates: internasals and canthals on the snout, a
            // supraocular over each eye; granular scales between them
            const d = plateEdges(X, Z, crotalusPlates(E, W, Lh, geo.corner));
            col = mix(col, C(fc.plate), band(d, 0.0045, 0.35).mul(smoothstep(0.45, 0.75, n.y)).mul(0.6));
          }
          // dark postocular band to the angle of the jaw, cream lines above and below
          const s0 = [E.x - 0.8 * E.r, E.y - 0.1 * E.r], s1 = [0.08, 0.065];
          const st = seg(X, Y, s0, s1);
          const edge = band(st.d, 0.03 + 0.018, 0.75).mul(lateral);
          col = mix(col, C(fc.plate), edge.mul(0.95));
          col = mix(col, C(fc.stripe), band(st.d, 0.03, 1).mul(lateral));
          // the two paravertebral neck stripes begin on the back of the head
          const pv = band(abs(Z.sub(0.09)), 0.035, 0.75).mul(float(1).sub(smoothstep(0.17, 0.21, X))).mul(dorsal);
          col = mix(col, C(c.stripe), pv);
        }
        break;
      }
      case 'lachesis': {
        // tan crown, no canthus; pale lips under a black postocular stripe
        // with a thin pale line above it
        col = mix(C(c.ground), C(c.headTop), dorsal);
        if (!upper) col = C(fc.chin);
        col = mix(col, C(fc.labials), onLip);
        col = sutured(toned(col), C(fc.suture), 0.35);
        if (upper) {
          // back and down from the eye to the angle of the jaw (P5)
          const s0 = [E.x - 0.85 * E.r, E.y - 0.05 * E.r], s1 = [0.08, 0.062];
          const st = seg(X, Y, s0, s1);
          if (fine) {
            const above = aastep(0, side(X, Y, s0, s1));
            const pale = band(abs(st.d.sub(0.0325 + 0.009)), 0.006, 0.5).mul(above).mul(step(0.02, st.t)).mul(lateral);
            col = mix(col, C(fc.stripeEdge), pale.mul(0.9));
          }
          col = mix(col, C(fc.stripe), band(st.d, 0.0325, 1).mul(lateral));
          if (fine) {
            // two small internasals on the snout, separated by small scales
            const ia = plateEdges(X, Z, [[0.93, 0.055, 0.025, 0.035, 0.012]]);
            col = mix(col, C(fc.suture), band(ia, 0.004).mul(dorsal).mul(detail).mul(0.55));
          }
        }
        break;
      }
      case 'hydrophis': {
        // black above, yellow below, sharply divided; entire head shields
        const edge = float(0.42).sub(X.mul(0.12)).mul(Ht);
        const black = upper ? aastep(edge, Y) : float(0);
        col = mix(C(c.venter), C(c.dorsum), black);
        const sutC = mix(C(fc.sutureYellow), C(fc.suture), black);
        if (upper && fine) {
          const d = plateLines(X, Z, W, SEA_SHIELDS);
          col = mix(col, sutC, float(1).sub(aastep(0.005, d)).mul(dorsal).mul(shieldDetail).mul(0.85));
        }
        col = sutured(col, sutC, 0.8);
        break;
      }
      case 'boa': {
        // pale grey crown and cream lips; a dark median stripe on the crown
        // (dorsal only), a stripe from the nostril to the eye and on from the
        // eye to the jaw angle (lateral only), a bar under the eye
        col = mix(C(fc.crown), C(fc.labials), onLip);
        if (!upper) col = mix(C(fc.chin), C(fc.labials), onLip);
        col = sutured(toned(col), C(fc.suture), 0.45);
        if (upper) {
          const half = mix(float(0.055), float(0.015), clamp(X.sub(0.1).div(0.9), 0, 1));
          const mid = float(1).sub(aastep(half, Z)).mul(dorsal);
          col = mix(col, C(fc.crownStripe), mid);
          const nose = [geo.nostril.x / Lh - 0.01, geo.nostril.y / Lh + 0.004];
          const pre = seg(X, Y, nose, [E.x + 0.85 * E.r, E.y + 0.05 * E.r]);
          col = mix(col, C(fc.crownStripe), band(pre.d, 0.02, 0.75).mul(lateral));
          const s0 = [E.x - 0.8 * E.r, E.y], s1 = [0.03, 0.2 * Ht];
          const post = seg(X, Y, s0, s1);
          const pw = mix(float(0.04), float(0.055), post.t); // widening behind
          const below = aastep(0, side(X, Y, s0, s1)).oneMinus();
          // a pale border of one or two scale rows under it
          col = mix(col, C(fc.labials), band(post.d.sub(pw).sub(0.01), 0.011, 0.5).mul(below).mul(lateral).mul(0.9));
          col = mix(col, C(fc.stripe), band(post.d, pw, 1).mul(lateral));
          // the subocular wedge: half the eye wide under it, narrowing to a
          // bar about 0.04 Lh wide where it meets the lip (never a needle)
          const sub = seg(X, Y, [E.x, E.y - 0.9 * E.r], [E.x - 0.03, 0.015]);
          col = mix(col, C(fc.stripe), band(sub.d, mix(float(0.034), float(0.02), sub.t), 0.75).mul(lateral));
          // dark bars across two posterior supralabials (B3: black bars on
          // the white labials; P7), each on a whole scale of the row, from
          // the lip's edge to the top of the row
          const U = F.labials?.upper;
          if (U) {
            const w = (U.x1 - U.x0) / U.n;
            const top = (U.hBack ?? U.hFront) - 0.01;
            let bars = float(1e3);
            for (const k of [14, 16]) {
              const xc = U.x1 - (k + 0.5) * w;
              bars = min(bars, seg(X, Y, [xc + 0.003, 0.008], [xc - 0.003, top]).d);
            }
            col = mix(col, C(fc.stripe), band(bars, 0.011, 0.75).mul(lateral).mul(0.95));
          }
        }
        break;
      }
      default:
        col = C('#888888');
    }

    if (upper) {
      if (fine) {
        // brow shadow: the supraocular's lip shades the top of the eye socket
        const arc = float(1).sub(smoothstep(1.0, 1.4, eyeRho)).mul(smoothstep(0.1, 0.7, Y.sub(E.y).div(E.r))).mul(lateral);
        col = col.mul(float(1).sub(arc.mul(F.browShade ?? 0.15)));
      }
      // loreal pit: a dark opening ringed by pale scales (pre- and subfoveals)
      if (geo.pit) {
        const P = geo.pit;
        const dP = length(vec2(X.sub(P.x / Lh).div(P.a / Lh), Y.sub(P.y / Lh).div(P.b / Lh)));
        const rim = smoothstep(1.0, 1.12, dP).mul(float(1).sub(smoothstep(1.3, 1.48, dP))).mul(lateral);
        col = mix(col, C(fc.pitRim), rim.mul(0.9));
        col = mix(col, C(fc.pitInner), float(1).sub(aastep(1, dP)).mul(lateral));
      }
      // nostril: an opening in the nasal scale with a paler rim
      const N = geo.nostril;
      if (N && N.dorsal) {
        // the sea snake's, on its black crown, are a pixel or two across even
        // in close-up: once the head is big enough to show its shields (from
        // ~33 px; none at book zoom), the opening keeps ~1.4 px and its rim
        // ~1 px, a grey that only shows the opening (a legibility device,
        // not a colour, research-snake-faces §3.7)
        const px = fwidth(X);
        const on = float(1).sub(smoothstep(0.03, 0.06, px)).mul(dorsal);
        const dN = length(vec2(X.sub(N.x / Lh).div(max(float(N.a / Lh), px.mul(0.7))), Z.sub(N.z / Lh).div(max(float(N.b / Lh), px.mul(0.7)))));
        col = mix(col, C(fc.nostrilRim), band(abs(dN.sub(1.3)), 0.3, 0.5).mul(on).mul(0.9));
        col = mix(col, C(PUPIL), float(1).sub(aastep(1, dN)).mul(on).mul(0.9));
      } else if (N) {
        const dN = length(vec2(X.sub(N.x / Lh).div(N.a / Lh), Y.sub(N.y / Lh).div(N.b / Lh)));
        const rim = smoothstep(1.0, 1.12, dN).mul(float(1).sub(smoothstep(1.35, 1.55, dN))).mul(lateral);
        col = mix(col, C(fc.nostrilRim ?? fc.pitRim ?? fc.labials), rim.mul(0.85));
        col = mix(col, C(PUPIL), float(1).sub(aastep(1, dN)).mul(lateral).mul(0.9));
      }
    }
    // lips stay skin; only the palate / floor of the mouth is mouth lining,
    // and only once the mouth opens: shut, the strip of palate under the
    // upper lip (outside the narrower lower jaw) is the lip's own underside
    const mouth = upper ? float(1).sub(smoothstep(-0.2 * Hb, -0.15 * Hb, p.y)) : smoothstep(0.1 * Hb, 0.13 * Hb, p.y);
    return mix(col, C(c.mouth ?? '#e8b5ab'), mouth.mul(open));
  })();
  const colorNode = paint(true);
  const exportColorNode = paint(false);

  let normalNode = null;
  if (ctx && sc) {
    // scale relief in cm (granules, or shingles with keels); lip scales are
    // smooth, their sutures shallow grooves
    const amp = sc.cell * Lh * 0.06;
    const h = relief.mul(detail).mul(float(1).sub(onLip)).sub(lipSuture.mul(0.5)).mul(amp);
    normalNode = bumpNormal(h.mul(ctx.u.fitScale));
  }
  return { colorNode, exportColorNode, normalNode };
}

/** Schematic elapid crown shields (x, |z|/W): rostral, internasals, prefrontals, frontal, supraoculars, parietals. */
const CORAL_SHIELDS = [
  [[0.95, 0], [0.95, 0.3]], // rostral | internasals
  [[0.87, 0], [0.87, 0.55]], // internasals | prefrontals
  [[0.72, 0], [0.72, 0.8]], // prefrontals | frontal and supraoculars
  [[0.72, 0], [0.95, 0]], // the pairs meet on the midline
  [[0.72, 0.22], [0.52, 0.22]], // frontal, lateral edge
  [[0.52, 0.22], [0.45, 0]], // frontal, its point
  [[0.55, 0.22], [0.55, 0.62]], // supraocular | parietal
  [[0.45, 0], [0.12, 0]], // the parietals meet on the midline
  [[0.12, 0], [0.16, 0.6]], // parietals, hind edge
];

/** Sea snake (Hydrophis): entire shields, nasals meeting on the midline, no internasals. */
const SEA_SHIELDS = [
  [[0.86, 0], [0.86, 0.5]], // nasals | prefrontals
  [[0.72, 0], [1.0, 0]], // the nasals and prefrontals meet on the midline
  [[0.72, 0], [0.72, 0.75]], // prefrontals | frontal and supraoculars
  [[0.72, 0.2], [0.52, 0.2]], // frontal
  [[0.52, 0.2], [0.46, 0]],
  [[0.55, 0.2], [0.55, 0.6]], // supraocular | parietal
  [[0.46, 0], [0.14, 0]], // parietals
  [[0.14, 0], [0.18, 0.55]],
];

/**
 * Rattlesnake plates with pale edges (rounded boxes, head lengths; C.
 * durissus, P9; schematic): a supraocular roofing each orbit, its outer edge
 * the crown's corner over the eye (the shelf); two canthals a side lining
 * the canthus from it to the two internasals behind the rostral, each
 * plate's outer side on the corner line and sharing its ends with its
 * neighbours. `corner(u)` is the corner's [y, z] in cm (head.js).
 */
function crotalusPlates(E, W, Lh, corner) {
  const cz = (u) => corner(u)[1] / Lh;
  const so = 1.2 * E.r, soH = 0.17 * W;
  const plates = [[E.x, cz(E.x) - soH, so, soH, 0.025, 0]];
  const nasal = [0.925, 0.12 * W, 0.035, 0.11 * W, 0.016, 0]; // internasals
  const a0 = E.x + so, cl = (nasal[0] - nasal[2] - a0) / 2, cH = 0.09 * W;
  for (let i = 0; i < 2; i++) {
    const a = a0 + i * cl, b = a + cl, m = (a + b) / 2;
    plates.push([m, cz(m) - cH, cl / 2, cH, 0.012, (cz(b) - cz(a)) / cl]);
  }
  plates.push(nasal);
  return plates;
}

/**
 * The eye: iris (radial striation, reticulation), dark limbal rim, slit or
 * round pupil (pixel floor), and a catchlight; plus the catchlight as an
 * emissive node, so it stays white on the shadow side, and the pupil mesh's
 * colour (head.js): the mesh lies over the eye, so it carries the catchlight
 * where the two meet. The eye sphere's local +Z is the line of sight, +Y up.
 * @param {object} spec
 * @returns {{ colorNode, emissiveNode, pupilNode, swatches: Array<{ color: string, name: string, keepSmall?: boolean }> }}
 */
export function eyeNodes(spec) {
  const fc = faceColors(spec);
  const iris = fc.iris ?? spec.colors.iris ?? spec.eye.iris;
  const irisDark = fc.irisDark ?? '#2a2318';
  const limbal = fc.limbal ?? irisDark;
  const slit = spec.eye.pupil === 'slit';
  const pw = spec.eye.pupilW ?? 0.18;
  const embed = spec.eye.embed ?? 0.4;
  const rv = Math.sqrt(1 - embed * embed);
  const retic = spec.face?.reticulation ?? 0.2;
  const g0 = spec.eye.glint ?? 0.22;
  // aimed close to the line of sight (up-left-front): the key light comes from the upper left
  const Lv = new THREE.Vector3(-0.25, 0.3, 0.92).normalize();
  // The part of the eye that shows, as a cone round an eye-local axis: the
  // spectacle bulges out of the skin round the head's side (`embed`), the
  // line of sight is turned forward and up from that side (`eye.look`), and
  // a supraocular shelf overhangs the eye's top. Seen from above (the book's
  // camera, inspect) a highlight fixed in view space would fall under the
  // skin or the shelf, so its centre is held inside this cone: round the
  // head's side at the height of the eye's centre (lower under a shelf), as
  // wide as the bare eye less the forward turn and a margin, less half the
  // disc's own size (in the shader).
  const [lx, ly] = spec.eye.look ?? [0.25, 0.12];
  const ln = Math.hypot(lx, ly, 1);
  const CAP = new THREE.Vector3(0, -ly / (ln * Math.hypot(1, lx)) - (spec.head.brow ? 0.1 : 0), 1 / ln).normalize();
  const CAP_RAD = Math.acos(embed) - Math.atan(lx) - 0.21;

  const glint = Fn(() => {
    // one disc per eye: its angular size comes from the eye's radius in
    // device px (the same on every fragment of the eye), ≥ 1.2 px, ≤ 0.6 R
    const cV = modelViewMatrix.mul(vec4(0, 0, 0, 1));
    const pxV = cameraProjectionMatrix.mul(cV).w.mul(2).div(cameraProjectionMatrix.element(1).element(1).mul(inkViewport.w).max(1));
    const Rpx = length(positionView.sub(cV.xyz)).div(pxV.max(1e-9));
    const s = clamp(float(1.2).div(Rpx.max(1e-3)), g0, 0.6);
    // the highlight's centre: towards the key, or the point of the cone's rim
    // nearest it (continuous where the two meet); the same on every fragment
    const L0 = vec3(Lv.x, Lv.y, Lv.z);
    const axis = modelViewMatrix.mul(vec4(CAP.x, CAP.y, CAP.z, 0)).xyz.normalize();
    const along = dot(L0, axis);
    const th = float(CAP_RAD).sub(asin(s).mul(0.5));
    const across = L0.sub(axis.mul(along));
    const rim = axis.mul(cos(th)).add(across.div(length(across).max(1e-4)).mul(sin(th)));
    const centre = select(along.greaterThanEqual(cos(th)), L0, rim);
    return aastep(sqrt(float(1).sub(s.mul(s))), dot(normalView, centre));
  })();

  const colorNode = Fn(() => {
    const p = positionGeometry.normalize();
    const rr = length(vec2(p.x, p.y));
    const dir = vec2(p.x, p.y).div(rr.max(1e-3));
    const streak = noise3(dir.x.mul(4.5), dir.y.mul(4.5), rr.mul(2.2)).mul(0.5).add(0.5);
    let col = mix(C(iris).mul(0.8), C(iris).mul(1.08), streak);
    const spots = smoothstep(0.56, 0.64, noise3(p.x.mul(14), p.y.mul(14), p.z.mul(14)).mul(0.5).add(0.5));
    col = mix(col, C(irisDark), spots.mul(retic));
    col = mix(col, C(limbal), smoothstep(0.8 * rv, 0.93 * rv, rr));
    // the boa's postocular stripe runs on through the lower iris
    if (spec.pattern === 'boa') col = mix(col, C(fc.stripe), float(1).sub(smoothstep(0.02, 0.12, p.y)));
    const pupil = slit
      ? float(1).sub(aastep(1, length(vec2(p.x.div(max(float(pw), fwidth(p.x).mul(0.75))), p.y.div(0.78)))))
      : float(1).sub(aastep(max(float(0.42), fwidth(rr).mul(0.75)), rr));
    col = mix(col, C(PUPIL), pupil.mul(smoothstep(-0.2, 0.1, p.z)));
    return mix(col, C('#ffffff'), glint);
  })();

  // the SVG keeps the pupil and the catchlight however few pixels they cover
  // (raster.js readPattern); the boa's stripe crosses the lower iris
  const swatches = [
    { color: iris, name: 'Iris' },
    { color: limbal, name: 'Dark iris rim' },
    { color: PUPIL, name: 'Pupil', keepSmall: true },
    { color: '#ffffff', name: 'Catchlight', keepSmall: true },
  ];
  if (spec.pattern === 'boa') swatches.push({ color: fc.stripe, name: 'Black eye stripe' });
  return {
    colorNode,
    emissiveNode: vec3(glint).mul(0.8),
    // the pupil mesh, unlit: black, with the catchlight where it crosses it
    pupilNode: mix(C(PUPIL), C('#ffffff'), glint),
    swatches,
  };
}

/** Pupil colour, for the pupil mesh and its SVG part. */
export const PUPIL_COLOR = PUPIL;

/**
 * Named colours of the head and the lower jaw for the SVG plate (see
 * patterns.js patternSwatches): every colour that covers a visible area,
 * the dominant one first; near-identical pigments listed once, and thin
 * lines (sutures, canthal lines, plate edges narrower than a scale) left
 * out — they are tone, not separations, and the plate reads the colours
 * without them (headSkin's exportColorNode). The mouth lining is flagged
 * (`mouth`): it shows only in a gape, and head.js lists it only then.
 * @param {object} spec
 * @param {'head'|'jaw'} part
 * @returns {Array<{ color: string, name: string, mouth?: boolean }>|false}
 */
export function faceSwatches(spec, part) {
  const c = spec.colors;
  const fc = faceColors(spec);
  const S = (color, name) => ({ color, name });
  const mouth = { ...S(c.mouth ?? '#e8b5ab', 'Mouth lining'), mouth: true };
  switch (spec.pattern) {
    case 'asper':
      if (part === 'head') return [S(fc.crown, 'Brown crown'), S(fc.labials, 'Yellow face and lips'), S(fc.stripe, 'Dark eye stripe'), mouth];
      return [S(fc.chin, 'Yellow chin and lips'), mouth];
    case 'schlegelii': {
      const green = spec.morph === 'green';
      const ground = S(c.ground, green ? 'Moss green' : 'Golden yellow');
      // the golden morph's paler lips are too close to its yellow to print apart
      if (part === 'head') return green ? [ground, S(fc.labials, 'Pale green lips'), mouth] : [ground, mouth];
      return [S(fc.chin, green ? 'Pale green chin' : 'Pale yellow chin'), mouth];
    }
    case 'micrurus':
      if (part === 'head') return [S(c.black, 'Black snout'), S(c.yellow, 'Yellow head band'), mouth];
      return [S(c.yellow, 'Yellow head band'), S(c.black, 'Black chin'), mouth];
    case 'crotalus':
      if (part === 'head') return [S(c.headTop, 'Brown crown'), S(fc.stripe, 'Dark eye stripe'), S(fc.plate, 'Cream lips and stripe borders'), mouth];
      return [S(c.venter, 'Cream chin'), mouth];
    case 'lachesis':
      if (part === 'head') return [S(c.headTop, 'Tan crown'), S(fc.stripe, 'Black eye stripe'), S(fc.labials, 'Cream lips'), mouth];
      return [S(fc.chin, 'Cream chin'), mouth];
    case 'hydrophis':
      if (part === 'head') return [S(c.dorsum, 'Black crown'), S(c.venter, 'Yellow lips'), mouth];
      return [S(c.venter, 'Yellow throat'), mouth];
    case 'boa':
      if (part === 'head') return [S(fc.crown, 'Pale grey crown'), S(fc.stripe, 'Black eye stripe'), S(fc.crownStripe, 'Dark brown head stripes'), S(fc.labials, 'Cream lips'), mouth];
      return [S(fc.chin, 'Cream chin'), mouth];
    default:
      return false;
  }
}
