// Jaguar skull (Panthera onca, adult male, approximate) as a signed-distance
// model: a short, broad muzzle; large forward-facing orbits; zygomatic arches
// flaring to about 70 % of the skull's length; a tall sagittal crest meeting
// the nuchal crest; big bullae; a transverse, hinge-like jaw joint; a massive
// coronoid process; dagger canines and blade-like carnassials (P4 / m1).
//
// Frame (cm, real scale): +x the skull's LEFT, +y up, +z anterior.
// Greatest length ≈ 23.6 cm (prosthion → nuchal crest), zygomatic breadth
// ≈ 16.8 cm. Big-cat skulls vary widely (≈ 20–28 cm); these are typical
// adult-male proportions, not a specimen.
//
// Dentition (per side): upper I3 C1 P3 (P2 a tiny peg, P3, P4) M1,
// lower i3 c1 p2 (p3, p4) m1 → 30 teeth.
import {
  ellipsoid, sphere, roundCone, roundBox, capsule, sweep, slab, frustum, frame, polygon2, ellipse2, plane,
  smoothUnion, union, subtract, intersect, warp, mirrorX, transform, euler, norm3, cross3, sub3, dot3, fbm3,
} from '../../kits/sdf/sdf.js';

/** Landmarks (cm, skull frame; paired points on the LEFT side). */
export const JAGUAR = {
  prosthion: [0, -2.15, 12.45],
  nasion: [0, 4.3, 6.6],
  condyle: [5.6, -1.9, -3.4], // TMJ (transverse hinge)
  zygion: [8.4, 0.5, 0.6],
  orbitCentre: [4.3, 2.5, 4.8],
  crestTop: [0, 7.75, -9.0],
  inion: [0, 6.6, -11.0],
  apertureCentre: [0, 0.7, 12.3],
  bulla: [3.0, -2.2, -6.0],
};

export const JAGUAR_BONES = [
  { id: 'frontal', label: 'frontal', name: 'Frontal bone', color: '#e7c66b' },
  { id: 'parietal-right', label: 'parietal', name: 'Parietal bone (right)', color: '#8db3d6' },
  { id: 'parietal-left', label: 'parietal', name: 'Parietal bone (left)', color: '#8db3d6' },
  { id: 'occipital', label: 'occipital', name: 'Occipital bone', color: '#93c4a0' },
  { id: 'temporal-right', label: 'temporal', name: 'Temporal bone (right)', color: '#e8a184' },
  { id: 'temporal-left', label: 'temporal', name: 'Temporal bone (left)', color: '#e8a184' },
  { id: 'zygomatic-right', label: 'zygomatic', name: 'Zygomatic (jugal) bone (right)', color: '#f0a660' },
  { id: 'zygomatic-left', label: 'zygomatic', name: 'Zygomatic (jugal) bone (left)', color: '#f0a660' },
  { id: 'maxilla-right', label: 'maxilla', name: 'Maxilla (right)', color: '#a3cc7f' },
  { id: 'maxilla-left', label: 'maxilla', name: 'Maxilla (left)', color: '#a3cc7f' },
  { id: 'premaxilla', label: 'premaxilla', name: 'Premaxillae (incisive bones)', color: '#cfe08e' },
  { id: 'nasal', label: 'nasal', name: 'Nasal bones', color: '#dc6b5f' },
  { id: 'sphenoid', label: 'sphenoid', name: 'Sphenoid and palatine region', color: '#ae92cf' },
  { id: 'mandible', label: 'mandible', name: 'Mandible', color: '#74b6be' },
];
const B = Object.fromEntries(JAGUAR_BONES.map((b, i) => [b.id, i]));

let cached = null;

/** Closed Catmull-Rom curve through 2D points, sampled n per span (polygon outlines). */
function closedSpline(pts, n) {
  const out = [];
  const N = pts.length;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

function orbitFrame() {
  const c = JAGUAR.orbitCentre;
  const n = norm3([0.6, 0.15, 0.8]);
  const u = norm3(cross3([0, 1, 0], n));
  const v = cross3(n, u);
  return frame(c, u, v);
}

function buildJaguar() {
  if (cached) return cached;
  const L = (s) => mirrorX(s);

  // --- braincase, domed frontal, interorbital bridge, flat occiput
  const brain = ellipsoid([0, 2.0, -4.2], [4.4, 3.9, 5.2]);
  const frontalDome = ellipsoid([0, 3.4, 2.8], [3.4, 2.4, 4.0]);
  const interorb = ellipsoid([0, 3.2, 6.2], [2.4, 1.6, 2.2]);
  const base = ellipsoid([0, -0.6, -3.4], [3.3, 1.5, 6.0]);
  // the occiput is a near-vertical triangular plate; its rim is the nuchal crest
  // the occiput: a triangular plate facing back and down, its rim the nuchal
  // crest; its narrow, rounded apex (the inion) leans back over the condyles
  // and meets the end of the sagittal crest as one overhang
  const occiput = slab(polygon2([[-3.9, -0.6], [3.9, -0.6], [3.0, 2.1], [1.3, 4.85], [0.4, 6.35], [-0.4, 6.35], [-1.3, 4.85], [-3.0, 2.1]]),
    frame([0, -0.6, -9.55], [1, 0, 0], [0, 1, -0.3]), 0.5, 0.42, [-3.9, -0.6, 3.9, 6.35]);
  // the back of the braincase, under the crest's rear (no see-through gap below the blade)
  const brainBack = ellipsoid([0, 3.1, -7.6], [3.7, 2.8, 2.5]);

  // --- rostrum: a short, flat-sided box that narrows and dips towards the nose
  const rostrumBlock = intersect(
    roundBox([0, 0.45, 9.25], [2.95, 2.35, 3.35], 1.1, euler(7, 0, 0)),
    ellipsoid([0, 0.45, 9.25], [3.8, 2.95, 4.25], euler(7, 0, 0)),
    0.3
  );
  const rostrumWarped = warp(rostrumBlock, (x, y, z, out) => {
    const k = 1 - 0.05 * Math.max(0, z - 7.0);
    out[0] = x / k; out[1] = y; out[2] = z;
  }, 0.8);
  // the maxillae rise to meet the nasal bones, so the muzzle's roof is one
  // arch: on the flat-topped box alone the nasals stood as a plank, a step
  // 0.9 cm high with a see-through slot under it in side view
  const dorsum = ellipsoid([0, 2.6, 9.3], [1.9, 0.9, 3.0], euler(7, 0, 0));
  // the face ends in a near-vertical plane (premaxillae and nasal aperture)
  const rostrum = intersect(smoothUnion(0.9, rostrumWarped, dorsum), plane([0, 0.12, 0.99], 12.55), 0.45);
  const canineRoots = L(ellipsoid([2.6, -0.45, 10.6], [0.95, 1.75, 1.05], euler(-14, 0, 0)));
  const premax = ellipsoid([0, -1.25, 11.7], [2.0, 1.0, 0.95]);
  const palate = ellipsoid([0, -1.85, 6.4], [3.6, 0.7, 4.6]);
  const cheek = L(ellipsoid([3.55, -0.25, 6.6], [1.35, 1.25, 1.6]));

  // --- base: bullae, occipital condyles, paroccipital processes
  const bullae = L(ellipsoid(JAGUAR.bulla, [1.5, 1.25, 1.95]));
  const occCondyles = L(ellipsoid([1.6, -1.2, -10.1], [0.7, 0.9, 0.8], euler(20, 0, 0)));
  const paroccipital = L(ellipsoid([4.2, -1.3, -8.4], [0.55, 0.8, 0.55]));
  const basicranium = ellipsoid([0, -1.15, -6.6], [3.7, 1.25, 4.1]);
  // presphenoid, palatines and pterygoids: the medial wall behind the orbits,
  // between the hard palate and the frontal (without it the orbits and the
  // fossae under the arches were see-through windows from the side)
  const sphenopalatine = roundBox([0, -0.05, 3.7], [1.4, 1.35, 2.3], 0.45);

  // --- sagittal crest: a blade along the midline, overhanging the occiput;
  // its lower edge is buried in the braincase, its rear runs down the inion
  const sagittal = slab(
    polygon2([[1.6, 5.0], [-1.0, 6.2], [-5.0, 7.15], [-8.6, 7.7], [-10.75, 7.2], [-11.45, 6.35], [-11.35, 5.3], [-9.7, 3.9], [-6.0, 3.6], [0.0, 3.6]]),
    frame([0, 0, 0], [0, 0, 1], [0, 1, 0]), 0.3, 0.2, [-11.45, 3.6, 1.6, 7.7]
  );

  // --- fossae and sockets
  const templeFossa = L(ellipsoid([7.0, 1.9, -0.2], [2.85, 3.3, 4.6]));
  const orbitF = orbitFrame();
  const orbits = L(frustum(ellipse2(2.25, 2.2), orbitF, 3.4, 0.38, 3.5, [-2.25, -2.2, 2.25, 2.2]));
  const apF = frame([0, 0.8, 12.85], [1, 0, 0], [0, 0.97, -0.24]);
  const aperture = frustum(ellipse2(1.0, 1.42), apF, 4.0, 1.15, 2, [-1.0, -1.42, 1.0, 1.42]);
  const foramen = ellipsoid([0, -0.85, -10.6], [1.0, 1.05, 1.2]);
  const glenoid = L(capsule([4.0, -1.75, -3.4], [7.0, -1.75, -3.4], 0.72));
  const infraorbital = L(ellipsoid([3.45, 0.1, 8.5], [0.35, 0.5, 0.45]));

  // --- zygomatic arches: deep, thin and flaring
  const arch = L(sweep([
    { p: [4.0, 0.35, 6.6], a: 0.5, b: 0.95 },
    { p: [6.1, 0.5, 5.05], a: 0.24, b: 0.82 },
    { p: [7.7, 0.55, 3.0], a: 0.22, b: 0.95 },
    { p: [8.35, 0.5, 0.8], a: 0.22, b: 0.98 },
    { p: [7.9, 0.32, -1.5], a: 0.26, b: 0.88 },
    { p: [6.4, 0.05, -3.3], a: 0.36, b: 0.8 },
  ], { smooth: 4, k: 0 })); // k 0: blending such flat sections scallops the arch into ribs
  // postorbital processes reach towards each other: the ring is almost closed
  const jugalPostorb = L(roundCone([6.55, 0.9, 3.95], [6.2, 2.35, 3.55], 0.36, 0.13));
  const frontalPostorb = L(roundCone([2.7, 4.4, 4.25], [5.5, 3.3, 3.45], 0.55, 0.15)); // rooted in the frontal
  const nasals = sweep([
    { p: [0, 4.3, 5.8], a: 0.85, b: 0.3, up: [0, 1, 0.12] },
    { p: [0, 3.5, 9.3], a: 0.95, b: 0.28, up: [0, 1, 0.22] },
    { p: [0, 2.75, 12.0], a: 0.8, b: 0.24, up: [0, 0.95, 0.3] },
  ], { smooth: 3 });

  let s = smoothUnion(1.4, brain, frontalDome, interorb, base, brainBack);
  s = smoothUnion(1.1, s, occiput);
  s = smoothUnion(0.9, s, rostrum, canineRoots, premax, palate, cheek);
  s = smoothUnion(0.9, s, basicranium);
  s = smoothUnion(0.6, s, sphenopalatine);
  s = smoothUnion(0.6, s, bullae, occCondyles, paroccipital);
  s = subtract(s, templeFossa, 0.9);
  s = subtract(s, orbits, 0.3);
  s = smoothUnion(0.4, s, arch, jugalPostorb, frontalPostorb);
  s = smoothUnion(0.7, s, sagittal);
  s = smoothUnion(0.4, s, nasals);
  s = subtract(s, aperture, 0.25);
  s = subtract(s, union(foramen, glenoid, infraorbital), 0.2);
  const cranium = s;

  // --- mandible: deep body, huge hooked coronoid, transverse condyle, small angle
  const body = L(sweep([
    { p: [0, -5.0, 11.35], a: 0.62, b: 1.8 },
    { p: [1.35, -4.95, 10.85], a: 0.7, b: 1.82 },
    { p: [2.55, -4.9, 9.3], a: 0.72, b: 1.75 },
    { p: [3.25, -4.85, 7.4], a: 0.68, b: 1.72 },
    { p: [3.8, -4.8, 5.3], a: 0.7, b: 1.78 },
    { p: [4.35, -4.65, 2.7], a: 0.62, b: 1.65 },
    { p: [4.85, -4.45, -0.3], a: 0.5, b: 1.45 },
  ], { smooth: 4, k: 0.2 }));
  // ramus outline (u ≈ z, v = y) as a smooth closed curve: the coronoid's
  // convex front border sweeps up to a broad apex hooked back, its rear
  // border falls concave to a shallow notch, then the condyle, a small
  // angular process and the convex lower border
  const RAMUS = closedSpline([
    [3.0, -3.4], [1.9, -1.2], [0.85, 1.3], [-0.35, 3.15], [-1.55, 4.1], [-2.5, 4.15], [-3.0, 3.5],
    [-2.95, 2.1], [-2.75, 0.55], [-2.95, -0.75], [-3.55, -1.45], [-3.95, -2.35], [-4.3, -3.25],
    [-5.0, -4.3], [-5.05, -5.0], [-4.4, -5.65], [-2.0, -6.35], [1.4, -6.55],
  ], 3);
  const ramus = L(slab(polygon2(RAMUS), frame([5.0, 0, 0], [0.04, 0, 1], [0.05, 1, 0]), 0.34, 0.25, [-5.2, -6.6, 3.0, 4.0]));
  const condyle = L(capsule([4.0, -1.9, -3.4], [7.0, -1.9, -3.4], 0.62));
  const chin = ellipsoid([0, -5.4, 11.55], [1.05, 1.4, 0.45]);
  let m = smoothUnion(0.7, body, ramus);
  m = smoothUnion(0.4, m, condyle, chin);
  m = subtract(m, L(sphere([2.95, -4.6, 9.9], 0.3)), 0.1); // mental foramen
  const mandible = m;

  const boneOf = (x, y, z) => {
    const s0 = x < 0 ? -x : x;
    const left = x >= 0;
    const LR = (r, l) => (left ? l : r);
    const serr = fbm3(x * 2.0 + 1.3, y * 2.0, z * 2.0) * 0.28 + fbm3(x * 4.6, y * 4.6 + 2.1, z * 4.6) * 0.1;
    if (z > 11.0 + serr && y < 1.7) return B.premaxilla;
    if (s0 < 1.25 + serr * 0.3 && y > 1.9 && z > 6.3 + serr) return B.nasal;
    if (y < -0.4 && z > -2.6 && z < 3.4 && s0 < 3.2) return B.sphenoid;
    if (s0 > 5.4 + serr * 0.5 && y < 3.4) return z > -0.6 + serr ? LR(B['zygomatic-right'], B['zygomatic-left']) : LR(B['temporal-right'], B['temporal-left']);
    if (s0 < 1.75 && y < 1.1 + serr * 0.5 && z > 1.0 && z < 6.0 + serr) return B.sphenoid; // medial wall, back of the palate
    // ahead of the orbits the maxilla climbs the muzzle's arch up to the nasals
    if (z > 4.6 + serr && y < 3.2 + serr * 0.5 + Math.max(0, z - 7.4) * 0.8) return LR(B['maxilla-right'], B['maxilla-left']);
    if (z < -9.0 + (y - 2.0) * -0.25 + serr) return B.occipital;
    if (s0 > 2.8 && y < 1.6 + serr && z < 0.5) return LR(B['temporal-right'], B['temporal-left']);
    if (z > -0.8 + serr) return B.frontal;
    return x + serr * 0.3 < 0 ? B['parietal-right'] : B['parietal-left'];
  };

  const lines = {
    centre: { f: (x) => x },
    crest: { f: (x) => x, keep: (x, y, z) => y > 5.6 && z < 1.6 },
  };

  cached = {
    cranium, mandible, boneOf, lines,
    craniumBounds: [-9.0, -4.0, -12.2, 9.0, 8.2, 13.4], // the inion overhang reaches z ≈ −11.8
    mandibleBounds: [-7.9, -7.5, -6.0, 7.9, 4.6, 12.6],
  };
  return cached;
}

// ---------------------------------------------------------------- dentition

/** Upper and lower left quadrants: x, z on the arch; crown `ch` (cm) etc. */
export const JAGUAR_TEETH = {
  upper: [
    { id: 'I1', type: 'incisor', x: 0.42, z: 12.2, y: -2.2, ch: 0.55, w: 0.38 },
    { id: 'I2', type: 'incisor', x: 1.1, z: 12.02, y: -2.2, ch: 0.6, w: 0.42 },
    { id: 'I3', type: 'incisor', x: 1.86, z: 11.68, y: -2.25, ch: 0.85, w: 0.58 },
    { id: 'C', type: 'canine', x: 2.88, z: 10.75, y: -2.35, ch: 3.9, w: 1.85, d: 1.4 },
    // a tiny peg just behind the canine (felid P 3/2: the upper row keeps P2)
    { id: 'P2', type: 'premolar', x: 3.22, z: 9.5, y: -2.4, ch: 0.45, w: 0.55, d: 0.45 },
    { id: 'P3', type: 'premolar', x: 3.55, z: 8.3, y: -2.45, ch: 1.25, w: 1.75, d: 0.95 },
    { id: 'P4', type: 'carnassial-upper', x: 4.22, z: 6.25, y: -2.45, ch: 1.55, w: 2.55, d: 1.15 },
    { id: 'M1', type: 'molar', x: 3.5, z: 4.9, y: -2.4, ch: 0.45, w: 0.55 },
  ],
  lower: [
    { id: 'i1', type: 'incisor', x: 0.36, z: 11.8, y: -3.4, ch: 0.5, w: 0.34 },
    { id: 'i2', type: 'incisor', x: 0.9, z: 11.7, y: -3.4, ch: 0.55, w: 0.38 },
    { id: 'i3', type: 'incisor', x: 1.42, z: 11.48, y: -3.4, ch: 0.62, w: 0.42 },
    { id: 'c', type: 'canine', x: 2.28, z: 11.0, y: -3.5, ch: 3.1, w: 1.55, d: 1.2 },
    { id: 'p3', type: 'premolar', x: 2.95, z: 8.15, y: -3.3, ch: 1.0, w: 1.4, d: 0.8 },
    { id: 'p4', type: 'premolar', x: 3.32, z: 6.85, y: -3.3, ch: 1.15, w: 1.95, d: 0.95 },
    { id: 'm1', type: 'carnassial-lower', x: 3.75, z: 5.05, y: -3.25, ch: 1.35, w: 2.3, d: 1.0 },
  ],
};

function bladeSDF(profile, d, bounds2) {
  // u = mesiodistal (+ = mesial/forward), v = height; thickness d (labio-lingual)
  return slab(polygon2(profile), frame([0, 0, 0], [1, 0, 0], [0, 1, 0]), d / 2, Math.min(0.14, d / 4), bounds2);
}

/** One jaguar tooth in its own frame: cervix at the origin, crown towards +y, buccal +z, mesial +x. */
function jaguarTooth(t) {
  const up = [0, 0, 1];
  const ch = t.ch, w = t.w, d = t.d ?? t.w;
  switch (t.type) {
    case 'incisor':
      return smoothUnion(0.06,
        sweep([
          { p: [0, -0.3, 0], a: w * 0.35, b: w * 0.4, up },
          { p: [0, 0.15, 0], a: w * 0.5, b: w * 0.5, up },
          { p: [0, ch * 0.8, 0.04], a: w * 0.4, b: w * 0.36, up },
          { p: [0, ch, 0.02], a: w * 0.16, b: w * 0.14, up },
        ], { smooth: 3 }));
    case 'canine':
      // a dagger that curves backwards (−x = distal) towards the tip
      return sweep([
        { p: [0, -1.4, 0], a: w * 0.42, b: d * 0.42, up },
        { p: [0, 0, 0], a: w * 0.5, b: d * 0.5, up },
        { p: [-0.08, ch * 0.35, 0.02], a: w * 0.46, b: d * 0.46, up },
        { p: [-0.3, ch * 0.7, 0.0], a: w * 0.3, b: d * 0.3, up },
        { p: [-0.62, ch, -0.05], a: 0.07, b: 0.07, up },
      ], { smooth: 4 });
    case 'premolar': {
      const h = ch, m = w / 2;
      return bladeSDF([[m, 0], [m * 0.92, h * 0.38], [m * 0.35, h * 0.62], [m * 0.05, h], [-m * 0.45, h * 0.55], [-m, h * 0.42], [-m, 0]], d, [-m, 0, m, h]);
    }
    case 'carnassial-upper': {
      const h = ch, m = w / 2;
      const blade = bladeSDF([
        [m, 0], [m, h * 0.4], [m * 0.8, h * 0.62], [m * 0.55, h * 0.48], [m * 0.15, h], [-m * 0.18, h * 0.55],
        [-m * 0.9, h * 0.72], [-m, h * 0.3], [-m, 0],
      ], d, [-m, 0, m, h]);
      const protocone = sphere([m * 0.55, h * 0.3, -d * 0.7], 0.32);
      return smoothUnion(0.15, blade, protocone);
    }
    case 'carnassial-lower': {
      const h = ch, m = w / 2;
      return bladeSDF([[m, 0], [m, h * 0.45], [m * 0.55, h * 0.95], [m * 0.02, h * 0.45], [-m * 0.42, h], [-m, h * 0.42], [-m, 0]], d, [-m, 0, m, h]);
    }
    default:
      return sphere([0, ch * 0.3, 0], w * 0.5);
  }
}

function jaguarToothFrame(t, jaw) {
  const upper = jaw === 'upper';
  // outward arch normal; the muzzle is broad and short
  const nrm = norm3([t.x * 1.2, 0, Math.max(0.2, t.z - 3.8) * 0.28]);
  const dvec = [0, upper ? -1 : 1, 0];
  const b = norm3(sub3(nrm, [0, 0, 0]));
  const m = cross3(dvec, b);
  // mesial must point forward along the arch: flip x if needed
  const fwd = dot3(m, [0, 0, 1]) >= 0 ? 1 : -1;
  const mx = [m[0] * fwd, m[1] * fwd, m[2] * fwd];
  const bz = fwd > 0 ? b : [-b[0], -b[1], -b[2]];
  // columns (local x, y, z) → (mesial, crown, buccal)
  const R = [mx[0], dvec[0], bz[0], mx[1], dvec[1], bz[1], mx[2], dvec[2], bz[2]];
  return { R, t: [t.x, t.y, t.z] };
}

function jaguarTeethModel(jaw) {
  const quad = union(...JAGUAR_TEETH[jaw].map((t) => {
    const F = jaguarToothFrame(t, jaw);
    return transform(jaguarTooth(t), F.R, F.t);
  }));
  const sdf = mirrorX(quad);
  const bounds = jaw === 'upper' ? [-5.7, -6.9, 3.6, 5.7, -0.4, 13.1] : [-4.9, -5.6, 3.3, 4.9, 0.0, 12.8];
  return { sdf, bounds, label: (x) => (x < 0 ? 0 : 1), lipschitz: 1.8, symmetricX: true };
}

// ---------------------------------------------------------------- factories

export function jaguarCranium() {
  const J = buildJaguar();
  return {
    sdf: J.cranium, bounds: J.craniumBounds, label: J.boneOf, lines: J.lines, lipschitz: 1.55, symmetricX: true,
    ao: { steps: [0.3, 0.8, 1.6, 2.6, 3.8], strength: 1.4 },
  };
}
export function jaguarMandible() {
  const J = buildJaguar();
  return {
    sdf: J.mandible, bounds: J.mandibleBounds, lines: { centre: { f: (x) => x } }, lipschitz: 1.55, symmetricX: true,
    ao: { steps: [0.2, 0.5, 1.0, 1.6], strength: 0.9 },
  };
}
export const jaguarTeeth = ({ jaw = 'upper' } = {}) => jaguarTeethModel(jaw);
export function jaguarPlanes() {
  const J = buildJaguar();
  return { sdf: union(J.cranium, J.mandible), bounds: [-9.0, -7.5, -12.2, 9.0, 8.2, 13.4], lipschitz: 1.7, symmetricX: true };
}
/** Main-thread access to the raw SDFs (label anchors). */
export function jaguarSDF() {
  const J = buildJaguar();
  return { cranium: J.cranium, mandible: J.mandible };
}
