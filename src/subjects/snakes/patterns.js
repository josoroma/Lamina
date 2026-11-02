// Snake skin in TSL (compiles to WGSL on WebGPU and GLSL on WebGL 2).
//
// Body coordinates come from the swept tube: uv = (s cm from the snout,
// lat ∈ [−1, 1] around the body, 0 = dorsal midline, ±1 = ventral midline).
// Every species pattern is a function of (s, lat) evaluated at the centre of
// the scale that owns the fragment — so ring and blotch borders follow the
// scale rows exactly as they do on a real snake (the jagged edge of a coral
// snake's ring) — then shaded per scale: staggered dorsal rows (rhombic,
// imbricate, optionally keeled) and wide transverse ventral scutes.
//
// Heads and eyes are painted by face.js, which shares bumpNormal; the props'
// surfaces (bark, leaf, egg shell) are at the end of this file.
import * as THREE from 'three/webgpu';
import {
  Fn, uv, float, vec2, vec3, color as tslColor, floor, fract, abs, min, max, clamp, mix,
  smoothstep, step, sin, select, length, fwidth, mx_noise_float, mx_cell_noise_float,
  positionGeometry, positionView, normalView, faceDirection, dFdx, dFdy, cross, dot, sign, normalize,
} from 'three/tsl';

const C = (hex) => tslColor(new THREE.Color(hex));

/** floor-mod, identical on WGSL and GLSL (their % differ for negatives). */
const fmod = (x, y) => x.sub(floor(x.div(y)).mul(y));

/** Anti-aliased step: 0 below `edge`, 1 above, filtered by the pixel footprint of `x`. */
const aastep = (edge, x) => {
  const w = fwidth(x).mul(0.75).add(1e-4);
  return smoothstep(float(edge).sub(w), float(edge).add(w), x);
};

const noise3 = (x, y, z = 0) => mx_noise_float(vec3(x, y, float(z)));

/**
 * Geometry-derived constants a pattern needs (all cm).
 * @typedef {object} BodyInfo
 * @property {number} L          total length
 * @property {number} headLen
 * @property {number} sCloaca    vent position from the snout
 * @property {number} belly      |lat| where the ventral scutes begin
 */

/**
 * Skin of a snake body tube: albedo (pattern × per-scale shading), roughness
 * and a bump normal for the scale relief — all derived from one scale lattice
 * so colour and relief always agree.
 *
 * @param {object} spec  resolved species preset
 * @param {BodyInfo} info
 * @param {object} [ctx]  FigureContext; when given, a physically scaled bump
 *        normal is returned (heights in cm → world units via ctx.u.fitScale)
 * @returns {{ colorNode: import('three/tsl').Node, roughnessNode: import('three/tsl').Node,
 *            normalNode: import('three/tsl').Node|null }}
 */
export function bodySkin(spec, info, ctx = null) {
  const { L, headLen, sCloaca, belly } = info;
  const sc = spec.scales;
  const trunk = sCloaca - headLen;
  const scaleLen = trunk / sc.ventrals; // ≈ one transverse dorsal row per ventral
  const subLen = (L - sCloaca) / sc.subcaudals;
  const rows = sc.rows;
  const keel = sc.keeled ?? 0;
  const juxt = sc.juxtaposed ? 1 : 0;
  // how strictly pattern borders follow scale edges (coral rings: fully)
  const snap = float(spec.pattern === 'micrurus' ? 1 : 0.6);
  const pattern = PATTERNS[spec.pattern];
  const colors = spec.colors;

  // ---- shared lattice (plain node expressions, evaluated once per fragment)
  const s = uv().x;
  const lat = uv().y;
  const al = abs(lat);
  // dorsal scale lattice: staggered rows, rhombic cells
  const sv = s.div(scaleLen);
  const rc = lat.div(belly).mul(rows * 0.5);
  const ri = floor(rc.add(0.5));
  const odd = fmod(ri, float(2));
  const ax = sv.add(odd.mul(0.5));
  const cx = fract(ax).sub(0.5);
  const cy = rc.sub(ri);
  const side = select(cy.greaterThan(0), float(1), float(-1));
  const odd2 = float(1).sub(odd);
  const ax2 = sv.add(odd2.mul(0.5));
  const cx2 = fract(ax2).sub(0.5);
  const cy2 = cy.sub(side);
  const d0 = abs(cx).mul(2).add(abs(cy));
  const d1 = abs(cx2).mul(2).add(abs(cy2));
  const own = d0.lessThan(d1);
  const sx = select(own, cx, cx2); // −0.5 (front) … +0.5 (free hind edge)
  const sy = select(own, cy, cy2);
  const dOwn = min(d0, d1);
  const edge = abs(d0.sub(d1)); // 0 on the boundary between two scales
  const cellA = select(own, floor(ax), floor(ax2));
  const cellR = select(own, ri, ri.add(side));
  const cellOdd = select(own, odd, odd2);
  const centreS = cellA.add(0.5).sub(cellOdd.mul(0.5)).mul(scaleLen);
  const centreLat = cellR.div(rows * 0.5).mul(belly);
  const cellHash = mx_cell_noise_float(vec2(cellA, cellR.add(97)));
  // ventral scutes (one per vertebra); subcaudals on the tail
  const onTail = step(sCloaca, s);
  const vIdx = select(onTail.greaterThan(0.5), s.sub(sCloaca).div(subLen), s.sub(headLen).div(scaleLen));
  const vf = fract(vIdx);
  const vCentre = select(
    onTail.greaterThan(0.5),
    floor(vIdx).add(0.5).mul(subLen).add(sCloaca),
    floor(vIdx).add(0.5).mul(scaleLen).add(headLen)
  );
  const ventral = smoothstep(belly - 0.015, belly + 0.015, al).mul(float(1).sub(juxt));
  // scale detail fades out when scales are smaller than ~2 px
  const detail = float(1).sub(smoothstep(0.22, 0.55, fwidth(sv)));
  const keelLine = float(1).sub(smoothstep(0.03, 0.1, abs(sy))).mul(smoothstep(-0.42, -0.1, sx)).mul(keel);

  const colorNode = Fn(() => {
    // pattern sampled towards the owning scale's centre (scutes: the scute
    // centre) so blotch borders follow the scale rows, softened by `snap`
    const snapS = mix(s, centreS, snap.mul(detail));
    const snapLat = mix(lat, centreLat, snap.mul(detail));
    const ps = mix(snapS, vCentre, ventral);
    const plat = mix(snapLat, lat, ventral);
    const pc = pattern({ s: ps, lat: plat, rawS: s, rawLat: lat, sx, sy, hash: cellHash, ventral, info, spec, colors });
    // imbricate: the base of each scale sits in the shadow of the scale in
    // front; the free hind edge catches the light. Keels add a pale ridge.
    const tone = mix(float(0.88), float(1.03), smoothstep(-0.5, 0.3, sx));
    const seam = float(1).sub(smoothstep(0.0, 0.07, edge));
    const juxtTone = mix(float(1.04), float(0.86), smoothstep(0.55, 0.95, max(abs(sx).mul(2), abs(sy).mul(2))));
    const dorsalShade = mix(tone.add(keelLine.mul(0.08)).mul(float(1).sub(seam.mul(0.3))), juxtTone, juxt);
    // ventral plates: lighter towards the overlapping hind edge, fine dark seam
    const plateTone = mix(float(0.92), float(1.03), smoothstep(0.0, 0.85, vf));
    const plateSeam = smoothstep(0.92, 0.99, vf).mul(0.3);
    const ventralShade = plateTone.mul(float(1).sub(plateSeam));
    const shade = mix(float(1), mix(dorsalShade, ventralShade, ventral), detail);
    return pc.mul(shade);
  })();

  // scales are glossier than the seams between them; keels and the belly a little matte
  const roughnessNode = mix(float(0.4), float(0.66), max(seam01(edge), smoothstep(0.6, 0.9, al)).mul(detail));

  let normalNode = null;
  if (ctx) {
    // relief in cm. Imbricate scales are shingles: each rises from its base
    // (tucked under the scale in front) to a raised free hind edge, rounded
    // across, keeled ones with a narrow ridge. Juxtaposed (sea snake) scales
    // are low granules; ventral plates overlap like the dorsal shingles.
    const amp = scaleLen * (sc.juxtaposed ? 0.035 : 0.045) * (1 + keel * 0.3);
    const shingle = smoothstep(-0.55, 0.45, sx).mul(float(1).sub(sy.mul(2).pow(2).mul(0.3)));
    const granule = float(1).sub(smoothstep(0.45, 1.0, dOwn));
    const hDorsal = mix(shingle.mul(0.8).add(keelLine.mul(0.45)), granule, juxt);
    const hVentral = smoothstep(0.0, 0.92, vf).mul(0.7);
    const hCm = mix(hDorsal, hVentral, ventral).mul(detail).mul(amp);
    normalNode = bumpNormal(hCm.mul(ctx.u.fitScale));
  }
  return { colorNode, roughnessNode, normalNode };
}

/** Back-compat: albedo + roughness only. */
export function bodyColorNode(spec, info) {
  const { colorNode, roughnessNode } = bodySkin(spec, info, null);
  return { colorNode, roughnessNode };
}

const seam01 = (edge) => float(1).sub(smoothstep(0.0, 0.08, edge));

/**
 * Surface-gradient bump (Mikkelsen 2010) with an explicit height in world
 * units, so the relief keeps its physical size at any zoom.
 * @param {import('three/tsl').Node} h  height (world units)
 */
export function bumpNormal(h) {
  return Fn(() => {
    const p = positionView;
    const n = normalView;
    const dpdx = dFdx(p), dpdy = dFdy(p);
    const r1 = cross(dpdy, n), r2 = cross(n, dpdx);
    const det = dot(dpdx, r1).mul(faceDirection);
    const grad = sign(det).mul(dFdx(h).mul(r1).add(dFdy(h).mul(r2)));
    return normalize(abs(det).mul(n).sub(grad));
  })();
}

// ---------------------------------------------------------------- patterns
// Each pattern: ({ s, lat, rawS, rawLat, sx, sy, hash, ventral, info, spec, colors }) → vec3

const PATTERNS = {
  asper({ s, lat, rawS, rawLat, sx, hash, ventral, info, colors }) {
    const { L, headLen, sCloaca, belly } = info;
    const al = abs(lat);
    const d = al.div(belly); // 0 dorsal … 1 belly edge
    const sn = s.div(L);
    const P = (sCloaca - headLen) / 21; // ~21 dorsal blotches each side
    const x0 = s.sub(headLen * 1.35).div(P);
    const k = floor(x0);
    const right = step(0, lat);
    const jitter = mx_cell_noise_float(vec2(k, right.add(11))).sub(0.5).mul(0.3);
    const x = fract(x0.add(jitter)).sub(0.5);
    const wob = noise3(rawS.mul(0.55), rawLat.mul(5), 1).mul(0.045);
    // dark lateral triangle: apex at the dorsal midline, base on the lower flank
    const tri = clamp(d.sub(0.02).div(0.88), 0, 1);
    const half = tri.mul(0.43).add(0.015);
    const dist = abs(x).sub(half.add(wob));
    const onBody = step(headLen * 1.2, s).mul(float(1).sub(smoothstep(0.9, 0.97, d)));
    const inTri = float(1).sub(smoothstep(-0.015, 0.015, dist)).mul(onBody);
    const inEdge = float(1).sub(smoothstep(0.05, 0.08, dist)).mul(onBody);
    const n = noise3(rawS.mul(0.18), rawLat.mul(2.5), 3).mul(0.5).add(0.5);
    let col = mix(C(colors.ground), C(colors.groundAlt), n);
    col = mix(col, C(colors.edge), inEdge.mul(0.9));
    const core = smoothstep(0.0, -0.12, dist);
    col = mix(col, mix(C(colors.dark), C(colors.darkCore), core.mul(0.6)), inTri);
    // the tail darkens; flecks between blotches
    col = mix(col, C(colors.dark), smoothstep(0.88, 0.99, sn).mul(0.35));
    const fleck = step(0.93, hash).mul(float(1).sub(inTri)).mul(float(1).sub(inEdge));
    col = mix(col, C(colors.dark), fleck.mul(0.45));
    // venter: cream to yellowish, mottled grey towards the tail
    const mott = smoothstep(0.35, 0.95, sn).mul(step(0.25, noise3(rawS.mul(0.9), rawLat.mul(9), 5)));
    let ven = mix(C(colors.venter), C(colors.venterSpot), mott.mul(0.75));
    ven = mix(ven, C(colors.chin), float(1).sub(smoothstep(headLen * 1.2, headLen * 3.2, s)));
    return mix(col, ven, ventral);
  },

  schlegelii({ s, lat, rawS, rawLat, sx, hash, ventral, info, colors }) {
    const { L } = info;
    const n = noise3(rawS.mul(0.35), rawLat.mul(3), 7).mul(0.5).add(0.5);
    let col = mix(C(colors.ground), C(colors.groundAlt), n.mul(0.8));
    // sparse tiny flecks, each on the hind half of a single scale
    const onHind = smoothstep(-0.15, 0.1, sx);
    const dark = step(0.955, hash).mul(onHind);
    const light = step(0.905, hash).mul(step(hash, 0.955)).mul(onHind);
    col = mix(col, C(colors.fleckLight), light.mul(0.85));
    col = mix(col, C(colors.fleckDark), dark.mul(0.9));
    // faint paired dorsolateral blotches (more visible in the green morph)
    const blot = smoothstep(0.55, 0.85, noise3(s.mul(0.42), abs(lat).mul(4.5), 9)).mul(0.22);
    col = mix(col, C(colors.fleckDark), blot);
    const ven = mix(C(colors.venter), C(colors.ground), smoothstep(0.5, 1, s.div(L)).mul(0.3));
    return mix(col, ven, ventral);
  },

  micrurus({ s, sx, hash, info, spec, colors }) {
    const { L, headLen, sCloaca } = info;
    const s0 = headLen * 0.98; // black nuchal ring starts right behind the head
    const nb = spec.rings.body, nt = spec.rings.tail;
    const P = (sCloaca - s0) / nb;
    const ph = fmod(s.sub(s0), float(P)).div(P);
    const wb = 0.27, wy = 0.075;
    const isBlack = step(ph, wb);
    const isYellow = step(wb, ph).mul(step(ph, wb + wy)).add(step(1 - wy, ph));
    // monad: black rings bordered by narrow yellow rings, broad red between
    let body = C(colors.red);
    // red scales tipped with black
    const tip = smoothstep(0.02, 0.36, sx).mul(step(0.22, hash));
    body = mix(body, C(colors.black), tip.mul(0.82));
    body = mix(body, C(colors.yellow), clamp(isYellow, 0, 1));
    body = mix(body, C(colors.black), isBlack);
    // tail: black and yellow only (no red)
    const P2 = (L - sCloaca) / nt;
    const ph2 = fmod(s.sub(sCloaca), float(P2)).div(P2);
    const tail = mix(C(colors.yellow), C(colors.black), step(ph2, 0.58));
    let col = mix(body, tail, step(sCloaca, s));
    col = mix(col, C(colors.black), step(s, s0));
    return col;
  },

  crotalus({ s, lat, rawS, rawLat, hash, ventral, info, colors }) {
    const { L, headLen, sCloaca, belly } = info;
    const al = abs(lat);
    const sn = s.div(L);
    const stripeEnd = headLen + L * 0.11;
    const P = (sCloaca - stripeEnd) / 25;
    const x0 = s.sub(stripeEnd).div(P);
    const x = fract(x0).sub(0.5);
    const wob = noise3(rawS.mul(0.6), rawLat.mul(6), 2).mul(0.05);
    // dorsal rhombs: dark rim, lighter core, outlined by a row of cream scales
    const dm = abs(x).div(0.46).add(al.div(0.4)).add(wob);
    const onTrunk = step(stripeEnd, s);
    const fade = float(1).sub(smoothstep(0.7, 0.9, sn).mul(0.75));
    const inD = float(1).sub(smoothstep(0.98, 1.0, dm)).mul(onTrunk);
    const inE = float(1).sub(smoothstep(1.17, 1.2, dm)).mul(onTrunk);
    const n = noise3(rawS.mul(0.2), rawLat.mul(2), 4).mul(0.5).add(0.5);
    let col = mix(C(colors.ground), C(colors.groundAlt), n);
    col = mix(col, C(colors.edge), inE.mul(fade));
    col = mix(col, mix(C(colors.dark), C(colors.darkCore), smoothstep(0.75, 0.35, dm)), inD.mul(fade));
    // lateral dark blotches between the rhombs, low on the flanks
    const lx = abs(x).sub(0.5).abs();
    const lat2 = abs(al.div(belly).sub(0.68));
    const lb = float(1).sub(smoothstep(0.95, 1.0, lx.div(0.2).add(lat2.div(0.16)))).mul(onTrunk);
    col = mix(col, C(colors.dark), lb.mul(0.75).mul(fade));
    // two dark paravertebral stripes on the neck
    const nk = step(headLen * 0.9, s).mul(float(1).sub(smoothstep(stripeEnd - 6, stripeEnd, s)));
    const st = step(0.05, al).mul(step(al, 0.16)).mul(nk);
    col = mix(col, C(colors.stripe), st);
    // posterior body and tail darken; faint bands on the tail
    col = mix(col, C(colors.tail), smoothstep(0.74, 0.92, sn).mul(0.7));
    const band = step(0.62, fract(s.div(2.2))).mul(step(sCloaca, s));
    col = mix(col, C(colors.dark), band.mul(0.35));
    const ven = mix(C(colors.venter), C(colors.tail), smoothstep(0.82, 0.95, sn).mul(0.55));
    return mix(col, ven.mul(mix(float(1), float(0.86), step(0.82, hash))), ventral);
  },

  lachesis({ s, lat, rawS, rawLat, hash, ventral, info, colors }) {
    const { L, headLen, sCloaca, belly } = info;
    const al = abs(lat);
    const d = al.div(belly);
    const P = (sCloaca - headLen * 1.4) / 24;
    const x0 = s.sub(headLen * 1.4).div(P);
    const x = fract(x0).sub(0.5);
    const wob = noise3(rawS.mul(0.4), rawLat.mul(5), 6).mul(0.04);
    // dark blotches: broad across the back, narrowing to an apex low on the flank
    const half = clamp(float(0.8).sub(d).div(0.8), 0, 1).mul(0.36).add(0.015);
    const dist = abs(x).sub(half.add(wob));
    const onBody = step(headLen * 1.3, s);
    const inB = float(1).sub(smoothstep(-0.012, 0.012, dist)).mul(onBody);
    // each blotch encloses a pale spot on each flank
    const spot = length(vec2(x.mul(1.0), d.sub(0.5).mul(0.55)));
    const inSpot = float(1).sub(smoothstep(0.075, 0.095, spot));
    const n = noise3(rawS.mul(0.25), rawLat.mul(3), 8).mul(0.5).add(0.5);
    let col = mix(C(colors.ground), C(colors.groundAlt), n);
    const fleck = step(0.9, hash).mul(0.5);
    col = mix(col, C(colors.dark), fleck);
    col = mix(col, mix(C(colors.dark), C(colors.spot), inSpot), inB);
    col = mix(col, C(colors.dark), smoothstep(0.9, 0.995, s.div(L)).mul(0.5));
    return mix(col, C(colors.venter), ventral);
  },

  hydrophis({ s, lat, rawS, rawLat, ventral, info, colors }) {
    const { L, sCloaca } = info;
    const al = abs(lat);
    // black back sharply divided from the yellow belly along the mid-flank
    const b = float(0.5).add(sin(rawS.mul(0.55)).mul(0.03)).add(noise3(rawS.mul(0.3), 0, 2).mul(0.03));
    const isDark = float(1).sub(aastep(0, al.sub(b)));
    let col = mix(C(colors.venter), C(colors.dorsum), isDark);
    // paddle tail: yellow with black spots and bars
    const tailW = smoothstep(sCloaca - 3.5, sCloaca + 1.5, rawS);
    const cell = vec2(rawS.div(1.55), rawLat.mul(3.2));
    const id = floor(cell);
    const f = fract(cell).sub(0.5);
    const off = vec2(mx_cell_noise_float(id).sub(0.5), mx_cell_noise_float(id.add(17)).sub(0.5)).mul(0.35);
    const r = length(f.sub(off));
    const spotR = mx_cell_noise_float(id.add(5)).mul(0.14).add(0.2);
    const spots = float(1).sub(aastep(0, r.sub(spotR)));
    const tailCol = mix(C(colors.venter), C(colors.dorsum), max(spots, float(1).sub(smoothstep(0.1, 0.16, al)).mul(0.9)));
    col = mix(col, tailCol, tailW);
    return col;
  },

  // The béquer in its silvery grey Costa Rican lowland form (Solórzano &
  // Sasa 2024, Figs 1–2). 24 dorsal saddles on the body and 5 on the tail, a
  // design count (Villa & Rivas 1971 counted these on one specimen; 22–30 in
  // Duque-Torres et al. 2024). Seen from above each saddle is a bow-tie, a
  // waist on the spine and lobes on the flanks, so the pale interspaces read
  // as a chain of ovals: blackish rims round dark-brown interiors with a few
  // rust scales, a few pale scales in each flank lobe, one row of cream
  // scales round the saddle, and lateral rhomboids with pale centres between
  // the saddles. Behind, the snake darkens (Solórzano & Sasa Fig. 2A): the
  // saddles widen and turn blackish-brown and the ground turns grey-brown,
  // until on the tail the saddles fill most of each period between narrow
  // cream gaps. Cream belly with dark flecks, more of them towards the tail.
  boa({ s, lat, rawS, rawLat, hash, ventral, info, colors }) {
    const { L, headLen, sCloaca, belly } = info;
    const d = abs(lat).div(belly); // 0 spine … 1 belly edge
    const sn = s.div(L);
    // the first saddle sits on the nape; one phase runs on into the tail
    const s0 = headLen * 1.12;
    const Pb = (sCloaca - s0) / 24, Pt = (L - sCloaca) / 5;
    const onTail = step(sCloaca, s);
    const x = fract(mix(s.sub(s0).div(Pb), s.sub(sCloaca).div(Pt).add(24), onTail)).sub(0.5);
    const hind = smoothstep(0.66, 0.86, sn); // the saddles darken…
    const wide = smoothstep(0.68, 0.93, sn); // …and close up behind
    const wob = noise3(rawS.mul(0.32), rawLat.mul(3.5), 12).mul(0.035);
    // half-length of a saddle (fraction of its period): a bow-tie in front
    const bowtie = float(0.15).add(smoothstep(0.04, 0.42, d).mul(0.15));
    const half = mix(bowtie, float(0.39), wide).add(wob);
    const xr = abs(x).div(half);
    // lower edge on the flank, rounded at the saddle's ends
    const lower = float(0.6).add(noise3(rawS.mul(0.45), 3.0, 21).mul(0.05)).add(wide.mul(0.14)).sub(xr.mul(xr).mul(0.16));
    const dist = max(abs(x).sub(half), d.sub(lower).mul(0.55));
    const onBody = step(s0 - 1.0, s);
    const inS = float(1).sub(smoothstep(-0.012, 0.012, dist)).mul(onBody);
    const rimK = smoothstep(-0.085, -0.045, dist);
    // interior: dark brown (blackish-brown behind), then the rust scales —
    // about one in six in front, fewer behind — mottled towards the rim
    const mott = noise3(rawS.mul(1.1), rawLat.mul(9), 31).mul(0.5).add(0.5);
    let interior = mix(C(colors.saddleCore), C(colors.saddleTail), hind);
    interior = mix(interior, C(colors.rust), step(mix(float(0.83), float(0.88), hind), hash).mul(0.65));
    interior = mix(interior, C(colors.saddle), smoothstep(0.55, 0.85, mott).mul(0.35));
    let sad = mix(interior, C(colors.saddle), rimK);
    const lobe = float(1).sub(smoothstep(0.75, 1.0, length(vec2(x.div(0.06), d.sub(0.46).div(0.07))))).mul(float(1).sub(wide));
    sad = mix(sad, C(colors.ocellus), lobe.mul(0.6).mul(float(1).sub(rimK)));
    const border = float(1).sub(smoothstep(0.0, 0.05, dist)).mul(step(0.0, dist)).mul(onBody);
    // ground: grey-beige → grey-brown, mottled and speckled (more behind);
    // the narrow gaps between the tail's saddles are cream
    const n = noise3(rawS.mul(0.25), rawLat.mul(2.5), 13).mul(0.5).add(0.5);
    let g = mix(C(colors.ground), C(colors.groundAlt), smoothstep(0.45, 0.82, sn));
    g = mix(g, g.mul(0.92), n);
    g = mix(g, C(colors.fleck), step(mix(float(0.955), float(0.88), smoothstep(0.3, 0.85, sn)), hash).mul(0.45));
    g = mix(g, C(colors.edge), smoothstep(0.8, 0.93, sn).mul(0.75));
    // lateral rhomboids between the saddles, low on the flank
    const lm = float(0.5).sub(abs(x)).div(0.17).add(abs(d.sub(0.77)).div(0.13)).add(wob.mul(2.5));
    const inL = float(1).sub(smoothstep(0.95, 1.02, lm)).mul(onBody).mul(float(1).sub(wide));
    const latC = mix(C(colors.lateral), C(colors.ocellus), float(1).sub(smoothstep(0.34, 0.46, lm)).mul(0.9));
    let col = mix(g, C(colors.edge), border.mul(float(1).sub(smoothstep(0.3, 0.62, d))).mul(0.85));
    col = mix(col, latC, inL);
    col = mix(col, sad, inS);
    const vfl = step(mix(float(0.94), float(0.82), smoothstep(0.35, 0.95, sn)), hash);
    const ven = mix(C(colors.venter), C(colors.venterSpot), vfl.mul(0.8));
    return mix(col, ven, ventral);
  },
};

// ------------------------------------------------------------------ swatches

/** The pigment of `mix(C(a), C(b), t)` above (a linear-light mix), as sRGB hex. */
const mixHex = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

/**
 * The named colours a snake's body or tail colour node paints, for the colour
 * separations of the SVG plate (`part.swatches`, src/engine/export/raster.js).
 * The exporter snaps every pixel of the part to the nearest of these (OKLab,
 * per-scale shading included), so a list holds every colour that covers a
 * visible area of the part — the plateau of a painted gradient too (boa
 * saddle centres) — and nothing that would sit between two of them where it
 * is absent (a red listed on a coil with no red catches the blend of brown
 * into tan). Near-identical pigments are listed once (the cascabel's cream
 * diamond borders and belly). The first entry is the part's dominant colour:
 * its flat fill when the part is too small to read a pattern. The head and
 * the lower jaw have their own (face.js faceSwatches).
 * @param {object} spec  resolved species preset (morph colours applied)
 * @param {'body'|'tail'} part
 * @returns {Array<{ color: string, name: string }>|false}  false: print the part flat
 */
export function patternSwatches(spec, part) {
  const c = spec.colors;
  const S = (color, name) => ({ color, name });
  switch (spec.pattern) {
    case 'asper':
      return [S(c.ground, 'Olive-brown ground'), S(c.dark, 'Dark triangles'), S(c.edge, 'Pale triangle borders'), S(c.venter, 'Cream belly')];
    case 'schlegelii': {
      // the morph names the ground: golden oropel or moss green
      const green = spec.morph === 'green';
      return [S(c.ground, green ? 'Moss green' : 'Golden yellow'), S(c.fleckDark, 'Dark flecks'), S(c.fleckLight, 'Pale flecks'), S(c.venter, green ? 'Pale green belly' : 'Pale yellow belly')];
    }
    case 'micrurus':
      // the tail is ringed in black and yellow only
      if (part === 'body') return [S(c.red, 'Red ring'), S(c.black, 'Black ring'), S(c.yellow, 'Yellow ring')];
      return [S(c.black, 'Black ring'), S(c.yellow, 'Yellow ring')];
    case 'crotalus':
      // diamonds fade into a darker hind body; their paler cores take that
      // darkening too. The tail itself is one dark grey (its bands are faint).
      if (part === 'body') return [S(c.ground, 'Brown ground'), S(c.dark, 'Dark diamonds and neck stripes'), S(c.darkCore, 'Diamond centres and hind body'), S(c.edge, 'Cream borders and belly')];
      return false;
    case 'lachesis':
      return [S(c.ground, 'Tan ground'), S(c.dark, 'Dark diamonds'), S(c.spot, 'Pale spots'), S(c.venter, 'Cream belly')];
    case 'hydrophis':
      if (part === 'body') return [S(c.dorsum, 'Black back'), S(c.venter, 'Yellow belly')];
      return [S(c.venter, 'Yellow paddle'), S(c.dorsum, 'Black spots')];
    case 'boa':
      // grey-beige in front and grey-brown behind both cover large areas; the
      // saddles' blackish rims and dark-brown interiors print apart (the
      // blackish-brown hind saddles and the lateral rhomboids fall between
      // them); the cream takes the borders, the pale lobe and rhomboid centres
      // and the belly; rust scales and speckles are too small to print apart.
      // The tail is blackish-brown saddles on narrow cream gaps.
      if (part === 'body') return [S(c.ground, 'Grey-beige ground'), S(c.saddle, 'Blackish saddle rims'), S(c.saddleCore, 'Dark-brown saddles'), S(c.groundAlt, 'Grey-brown hind body'), S(c.edge, 'Cream borders, lobes and belly')];
      return [S(c.saddleTail, 'Blackish-brown tail saddles'), S(c.edge, 'Cream gaps')];
    default:
      return false;
  }
}

/** Bark pigments, shared by the colour node and its SVG swatches. */
const BARK = { fissure: '#4a3c2f', ridge: '#7c6a55', lichen: '#a7a98f', moss: '#6d7a3b' };
const LICHEN = 0.55;

/** Bark: grey-brown with longitudinal fissures and pale lichen flecks. */
export function barkColorNode() {
  return Fn(() => {
    const s = uv().x, lat = uv().y;
    const fiss = noise3(s.mul(0.35), lat.mul(7), 21);
    const ridges = smoothstep(-0.2, 0.45, fiss);
    let col = mix(C(BARK.fissure), C(BARK.ridge), ridges);
    const lichen = smoothstep(0.38, 0.55, noise3(s.mul(0.5), lat.mul(4), 33));
    col = mix(col, C(BARK.lichen), lichen.mul(LICHEN));
    const moss = smoothstep(0.45, 0.6, noise3(s.mul(0.22), lat.mul(2.2), 44)).mul(smoothstep(0.1, -0.4, abs(lat).sub(0.3)));
    return mix(col, C(BARK.moss), moss.mul(0.5));
  })();
}

/**
 * Named colours of the bark for the SVG plate (see patternSwatches): dark
 * fissures, the ridges between them and the lichen over a ridge (the moss
 * tint is too faint to print apart).
 */
export function barkSwatches() {
  return [
    { color: BARK.fissure, name: 'Dark bark fissures' },
    { color: BARK.ridge, name: 'Bark ridges' },
    { color: mixHex(BARK.ridge, BARK.lichen, LICHEN), name: 'Lichen' },
  ];
}

/** Leaf blade: green with a paler midrib and lateral veins (uv: x along 0…1, y across −1…1). */
export function leafColorNode(base = '#4f7a35') {
  return Fn(() => {
    const u = uv().x, v = uv().y;
    const mid = float(1).sub(smoothstep(0.02, 0.06, abs(v)));
    const veins = float(1).sub(smoothstep(0.04, 0.1, abs(fract(u.mul(9).sub(abs(v).mul(2.2))).sub(0.5)))).mul(smoothstep(0.08, 0.2, abs(v)));
    let col = mix(C(base), C(base).mul(1.25), smoothstep(-0.6, 0.6, v.mul(0.5).add(u.sub(0.5))));
    col = mix(col, C('#b9c784'), mid.mul(0.8));
    col = mix(col, C('#9fb46f'), veins.mul(0.35));
    return col;
  })();
}

/** Egg shell: leathery off-white with faint mottling. */
export function eggColorNode(hex) {
  return Fn(() => {
    const p = positionGeometry;
    const n = noise3(p.x.mul(1.4), p.y.mul(1.4), p.z.mul(1.4)).mul(0.5).add(0.5);
    return mix(C(hex).mul(0.93), C(hex), n);
  })();
}

export { fmod, aastep, noise3, C as colorOf };
