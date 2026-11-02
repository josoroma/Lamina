// Human skull (adult, average proportions) as a signed-distance model.
//
// Why an SDF: a skull is a smooth, blended, carved solid — vault, rims,
// arches, sockets, apertures — which reads best when modelled the way it is
// drawn: big masses first, then cavities, then processes. The same model is
// meshed finely for the engraving and coarsely for the faceted "planes"
// stage, and its bones are recovered by a label function that follows the
// real sutures (coronal, sagittal, lambdoid, squamous, the orbit mosaic…).
//
// Frame (cm, real scale): +x = the skull's LEFT, +y up, +z anterior.
// Origin: midpoint between the porions (ear-hole tops), on the Frankfort
// horizontal plane (porion–orbitale). Dimensions follow standard
// craniometric means (Howells): glabella–opisthocranion ≈ 18.6, maximum
// breadth ≈ 14.0, basion–bregma ≈ 13.0, bizygomatic ≈ 13.0, orbit 4.0 × 3.4,
// nasal height ≈ 5.1, nasal breadth ≈ 2.4, bigonial ≈ 10, bicondylar ≈ 12.
import {
  ellipsoid, sphere, roundCone, roundBox, sweep, slab, frustum, frame, polygon2, roundRect2, teardrop2,
  smoothUnion, union, subtract, mirrorX, transform, euler, fbm3, norm3, cross3, sub3, dot3,
} from '../../kits/sdf/sdf.js';

// ---------------------------------------------------------------- landmarks

/** Craniometric landmarks (cm, skull frame). Paired points are given for the LEFT (+x) side. */
export const HUMAN = {
  porion: [6.1, 0, 0],
  orbitale: [3.4, 0.05, 7.7],
  nasion: [0, 3.0, 9.55],
  glabella: [0, 4.15, 9.95],
  bregma: [0, 11.15, 1.95],
  vertex: [0, 11.35, 0.2],
  lambda: [0, 6.6, -8.15],
  opisthocranion: [0, 3.8, -8.75],
  inion: [0, 1.35, -8.6],
  asterion: [5.3, 0.9, -5.3],
  pterion: [5.7, 3.3, 3.3],
  opisthion: [0, -1.85, -2.55],
  basion: [0, -2.05, 0.95],
  rhinion: [0, 1.3, 10.25],
  nasospinale: [0, -2.05, 10.0],
  ans: [0, -2.0, 10.8],
  prosthion: [0, -3.95, 10.15],
  zygion: [6.65, -0.45, 3.0],
  frontozygomatic: [5.25, 2.75, 6.85],
  euryon: [7.0, 6.1, -1.4],
  mastoidale: [5.0, -2.85, -1.15],
  condylion: [5.0, -0.82, 1.3], // centre of the mandibular condyle (TMJ)
  coronion: [4.1, -0.65, 4.0],
  gonion: [4.95, -6.45, 1.75],
  menton: [0, -9.25, 9.25],
  pogonion: [0, -8.45, 10.35],
  orbitCentre: [3.07, 1.78, 8.43], // centre of the orbit's opening (frame of the socket frustum)
  apertureCentre: [0, -0.9, 10.6],
  occlusalFront: [0, -4.95, 10.2],
};

/** Cranial vault "egg" used by the construction guides (centre, radii). */
export const VAULT_EGG = { c: [0, 4.85, -0.3], r: [7.0, 6.55, 9.0] };

// ---------------------------------------------------------------- jaw kinematics

/**
 * Full gape of the adult jaw: rotation at the condyles (degrees) and the
 * condyle's glide (cm, skull frame: forward = +z, down = −y). Together they
 * part the incisal edges by ≈ 4.9 cm (healthy maximal opening ≈ 49 mm).
 * The glide ends with the condyle under the crest of the articular eminence;
 * in this model the crest lies ≈ 1 cm below the roof of the fossa, so the
 * condyle drops about as far as it advances (a shallower glide would drive
 * it into the eminence).
 */
export const JAW_GAPE = { angle: 27, forward: 0.95, down: 0.9 };

/**
 * Jaw pose at opening fraction o (0 closed … 1 full gape) — shared by the 3D
 * lesson and the verso panels so both open the jaw the same way.
 * Measured jaw kinematics (Lindauer et al. 1995) show no pure-hinge phase:
 * the condyle rotates AND glides from the first millimetre, rotation
 * dominating early. So the glide starts with the opening at about a third of
 * the rotation's pace and catches up as the gape widens, s = o·(0.35 + 0.65·o);
 * its path runs down the back slope of the eminence first, then forward
 * under the crest.
 * @param {number} o  opening fraction 0..1
 * @param {{open:number, angle:number, glide:number[]}} [out]  reused result
 * @returns {{open:number, angle:number, glide:number[]}} angle (rad, positive opens), glide [x, y, z] (cm)
 */
export function jawPose(o, out = { open: 0, angle: 0, glide: [0, 0, 0] }) {
  const s = o * (0.35 + 0.65 * o);
  out.open = o;
  out.angle = ((JAW_GAPE.angle * Math.PI) / 180) * o;
  out.glide[0] = 0;
  out.glide[1] = -JAW_GAPE.down * s * (1.5 - 0.5 * s);
  out.glide[2] = JAW_GAPE.forward * s;
  return out;
}

// ---------------------------------------------------------------- bones

/**
 * The 22 bones of the adult skull (8 cranial + 14 facial), classic atlas
 * palette. `label` is the canonical label id shared by left/right pairs.
 */
export const HUMAN_BONES = [
  { id: 'frontal', label: 'frontal', name: 'Frontal bone', kind: 'cranial', color: '#e7c66b' },
  { id: 'parietal-right', label: 'parietal', name: 'Parietal bone (right)', kind: 'cranial', color: '#8db3d6' },
  { id: 'parietal-left', label: 'parietal', name: 'Parietal bone (left)', kind: 'cranial', color: '#8db3d6' },
  { id: 'occipital', label: 'occipital', name: 'Occipital bone', kind: 'cranial', color: '#93c4a0' },
  { id: 'temporal-right', label: 'temporal', name: 'Temporal bone (right)', kind: 'cranial', color: '#e8a184' },
  { id: 'temporal-left', label: 'temporal', name: 'Temporal bone (left)', kind: 'cranial', color: '#e8a184' },
  { id: 'sphenoid', label: 'sphenoid', name: 'Sphenoid bone', kind: 'cranial', color: '#ae92cf' },
  { id: 'ethmoid', label: 'ethmoid', name: 'Ethmoid bone', kind: 'cranial', color: '#c7b56c' },
  { id: 'zygomatic-right', label: 'zygomatic', name: 'Zygomatic bone (right)', kind: 'facial', color: '#f0a660' },
  { id: 'zygomatic-left', label: 'zygomatic', name: 'Zygomatic bone (left)', kind: 'facial', color: '#f0a660' },
  { id: 'maxilla-right', label: 'maxilla', name: 'Maxilla (right)', kind: 'facial', color: '#a3cc7f' },
  { id: 'maxilla-left', label: 'maxilla', name: 'Maxilla (left)', kind: 'facial', color: '#a3cc7f' },
  { id: 'nasal-right', label: 'nasal', name: 'Nasal bone (right)', kind: 'facial', color: '#dc6b5f' },
  { id: 'nasal-left', label: 'nasal', name: 'Nasal bone (left)', kind: 'facial', color: '#dc6b5f' },
  { id: 'lacrimal-right', label: 'lacrimal', name: 'Lacrimal bone (right)', kind: 'facial', color: '#b98a5e' },
  { id: 'lacrimal-left', label: 'lacrimal', name: 'Lacrimal bone (left)', kind: 'facial', color: '#b98a5e' },
  { id: 'palatine-right', label: 'palatine', name: 'Palatine bone (right)', kind: 'facial', color: '#d9a7c4' },
  { id: 'palatine-left', label: 'palatine', name: 'Palatine bone (left)', kind: 'facial', color: '#d9a7c4' },
  { id: 'vomer', label: 'vomer', name: 'Vomer', kind: 'facial', color: '#9a86c6' },
  { id: 'concha-right', label: 'concha', name: 'Inferior nasal concha (right)', kind: 'facial', color: '#cfa2dc' },
  { id: 'concha-left', label: 'concha', name: 'Inferior nasal concha (left)', kind: 'facial', color: '#cfa2dc' },
  { id: 'mandible', label: 'mandible', name: 'Mandible', kind: 'facial', color: '#74b6be' },
];
const B = Object.fromEntries(HUMAN_BONES.map((b, i) => [b.id, i]));
export const HUMAN_BONE_INDEX = B;

// ---------------------------------------------------------------- orbit & aperture frames

/** Left orbit opening frame: normal faces forward-laterally, long axis droops laterally. */
function orbitFrameLeft() {
  const c = HUMAN.orbitCentre;
  const n = norm3([0.42, 0.03, 1]);
  let u = norm3(cross3([0, 1, 0], n)); // lateral & slightly backward
  let v = cross3(n, u); // up
  const roll = (-9 * Math.PI) / 180; // lateral end lower
  const cu = Math.cos(roll), su = Math.sin(roll);
  u = [u[0] * cu + v[0] * su, u[1] * cu + v[1] * su, u[2] * cu + v[2] * su];
  v = cross3(n, u);
  return frame(c, u, v);
}
const ORBIT_F = orbitFrameLeft();
// The frustum runs ≈ 0.3 cm under the lateral orbital rim, so the visible
// opening is ≈ 4.0 × 3.4 cm and its medial rims lie ≈ 1.08 cm off the midline:
// the bony bridge (≈ 2.2 cm) is about half an orbit wide (Howells: interorbital
// breadth ≈ 0.54 × orbit breadth), biorbital breadth ≈ 9.5 cm.
const ORBIT = { hw: 2.2, hh: 1.69, r: 1.5, depth: 4.6, end: 0.22 };
const APERTURE = { frame: frame([0, -0.95, 10.9], [1, 0, 0], [0, 1, 0]), r1: 1.24, r2: 0.34, h: 2.1 };

/** Construction frames shared with the guides: left orbit opening and the piriform aperture. */
export const HUMAN_FRAMES = { orbit: ORBIT_F, orbitSize: ORBIT, aperture: APERTURE };
const ORBIT_SLOPE = (ORBIT.end - 1) / ORBIT.depth;

/** Orbit-local coordinates of a point on the LEFT side (pass |x|): normalised u, v and depth w. */
function orbitLocal(x, y, z) {
  const d = sub3([x, y, z], ORBIT_F.o);
  const w = -dot3(d, ORBIT_F.n);
  const s = Math.max(0.05, 1 + ORBIT_SLOPE * Math.min(Math.max(w, -3), ORBIT.depth));
  return { u: dot3(d, ORBIT_F.u) / (ORBIT.hw * s), v: dot3(d, ORBIT_F.v) / (ORBIT.hh * s), w };
}

// ---------------------------------------------------------------- primitives (built once)

let cached = null;

function buildHuman() {
  if (cached) return cached;
  const L = (shape) => mirrorX(shape);

  // --- neurocranium: four blended masses make the egg of the vault
  const vault = smoothUnion(2.2,
    ellipsoid([0, 5.5, 3.6], [5.75, 5.75, 5.9]), // frontal squama (forehead)
    ellipsoid([0, 6.25, -1.1], [6.9, 5.05, 6.6]), // parietal eminences (max breadth)
    ellipsoid([0, 3.7, -4.6], [5.4, 4.9, 4.15]), // occipital
    ellipsoid([0, 0.75, -0.6], [5.95, 3.1, 5.4]) // middle cranial fossae / base
  );

  // --- facial core: fills the space behind the face (sinuses, sphenoid body)
  const core = ellipsoid([0, -0.25, 5.6], [3.55, 2.7, 3.25]);
  const interorbital = ellipsoid([0, 2.1, 8.3], [1.45, 1.6, 1.25]);

  // lower forehead: broad and forward so the orbits are cut into a wall, not a frame
  const lowerFrontal = ellipsoid([0, 3.95, 6.55], [5.05, 1.95, 2.95]);
  // supraorbital margins + glabella: a low ridge (frontal bone)
  const brow = L(sweep([
    { p: [0, 4.0, 9.52], a: 0.4, b: 0.55 },
    { p: [1.2, 3.96, 9.4], a: 0.38, b: 0.5 },
    { p: [2.7, 3.82, 8.86], a: 0.3, b: 0.38 },
    { p: [4.05, 3.58, 8.0], a: 0.3, b: 0.38 },
    { p: [5.05, 3.25, 6.95], a: 0.38, b: 0.46 },
  ], { k: 0.25, smooth: 4 }));

  // maxillae
  const maxBody = L(roundBox([2.3, -1.35, 7.6], [1.7, 1.6, 1.62], 0.95, euler(0, 22, 0)));
  const maxMid = ellipsoid([0, -2.75, 8.85], [1.6, 1.02, 1.08]);
  const canineEminence = L(sweep([
    { p: [1.72, -3.3, 9.25], a: 0.32, b: 0.32, up: [0, 0, 1] },
    { p: [1.86, -1.5, 9.32], a: 0.22, b: 0.22, up: [0, 0, 1] },
  ]));
  const canineFossa = L(ellipsoid([2.75, -1.35, 9.95], [0.95, 0.85, 0.62]));
  const frontalProcMax = L(sweep([
    { p: [1.5, -0.3, 9.42], a: 0.42, b: 0.55, up: [0, 0, 1] },
    { p: [1.25, 1.4, 9.36], a: 0.38, b: 0.5, up: [0, 0, 1] },
    { p: [0.85, 2.9, 9.2], a: 0.38, b: 0.48, up: [0, 0, 1] }, // meets the nasals under the nasion: no trench
  ], { smooth: 3 }));
  const alveolar = L(sweep([
    { p: [0, -3.38, 9.92], a: 0.62, b: 0.62 },
    { p: [0.55, -3.36, 9.85], a: 0.62, b: 0.62 },
    { p: [1.3, -3.3, 9.5], a: 0.66, b: 0.64 },
    { p: [1.92, -3.24, 8.92], a: 0.7, b: 0.66 },
    { p: [2.28, -3.18, 8.2], a: 0.72, b: 0.66 },
    { p: [2.52, -3.14, 7.45], a: 0.74, b: 0.64 },
    { p: [2.72, -3.08, 6.55], a: 0.78, b: 0.62 },
    { p: [2.86, -3.0, 5.6], a: 0.76, b: 0.6 },
    { p: [2.92, -2.9, 4.7], a: 0.68, b: 0.56 },
    { p: [2.85, -2.7, 4.15], a: 0.5, b: 0.45 },
  ], { k: 0.2, smooth: 3 }));

  // zygomatic bones: body (cheek prominence), frontal process (lateral orbital rim)
  const zygBody = L(roundBox([4.5, -0.6, 6.42], [1.06, 1.0, 0.74], 0.66, euler(-4, 36, 6)));
  // lateral orbital wall / anterior wall of the temporal fossa (keeps the socket closed)
  const orbitWallL = L(ellipsoid([4.45, 1.45, 5.55], [0.95, 2.0, 1.35], euler(0, 20, 0)));
  const zygFrontal = L(sweep([
    { p: [4.85, 0.0, 6.95], a: 0.5, b: 0.58, up: [0, 0, 1] },
    { p: [5.08, 1.5, 6.92], a: 0.46, b: 0.52, up: [0, 0, 1] },
    { p: [5.18, 2.9, 6.76], a: 0.43, b: 0.48, up: [0, 0, 1] },
    { p: [5.12, 3.4, 6.58], a: 0.42, b: 0.48, up: [0, 0, 1] },
  ], { smooth: 3 }));

  // temporal region around the ear
  const earMass = L(ellipsoid([5.45, -0.35, -0.4], [0.95, 1.3, 1.7]));
  const mastoid = L(roundCone([5.3, -0.8, -1.6], [5.0, -2.45, -1.2], 0.95, 0.5));

  // fossae carved from the sides
  const templeFossa = L(ellipsoid([6.95, 1.7, 3.3], [2.15, 2.9, 3.0]));
  const infraFossa = L(ellipsoid([6.1, -2.7, 2.9], [2.4, 2.2, 2.0]));

  // orbits (rounded-square frusta) and the piriform aperture (pear)
  const orbitL = frustum(roundRect2(ORBIT.hw, ORBIT.hh, ORBIT.r), ORBIT_F, ORBIT.depth, ORBIT.end, 3,
    [-ORBIT.hw, -ORBIT.hh, ORBIT.hw, ORBIT.hh]);
  const orbits = L(orbitL);
  const aperture = frustum(teardrop2(APERTURE.r1, APERTURE.r2, APERTURE.h), APERTURE.frame, 5.2, 1.22, 3, [-1.24, -1.24, 1.24, 2.5]);

  // zygomatic arch (temporal process of the zygomatic + zygomatic process of the temporal)
  const arch = L(sweep([
    { p: [5.15, -0.75, 5.5], a: 0.4, b: 0.74 },
    { p: [5.92, -0.56, 4.25], a: 0.31, b: 0.6 },
    { p: [6.4, -0.46, 3.05], a: 0.28, b: 0.53 },
    { p: [6.38, -0.37, 1.9], a: 0.29, b: 0.5 },
    { p: [6.02, -0.26, 1.0], a: 0.36, b: 0.52 },
    { p: [5.68, -0.12, 0.35], a: 0.42, b: 0.48 },
  ], { k: 0.15, smooth: 4 }));
  const eminence = L(ellipsoid([5.05, -0.92, 2.15], [0.95, 0.42, 0.5]));

  // details
  const eam = L(roundCone([7.0, -0.45, -0.05], [4.9, -0.5, -0.1], 0.42, 0.36));
  const mandFossa = L(ellipsoid([5.0, -0.8, 1.25], [1.0, 0.5, 0.62]));
  const foramen = ellipsoid([0, -2.0, -0.85], [1.45, 1.4, 1.8]);
  const condyles = L(ellipsoid([1.35, -2.25, -0.35], [0.55, 0.42, 1.15], euler(0, -22, 0)));
  const styloid = L(roundCone([4.35, -1.4, 0.1], [3.8, -3.55, 1.2], 0.2, 0.11));
  const inion = ellipsoid([0, 1.35, -8.4], [1.0, 0.5, 0.45]);
  const nuchal = L(sweep([
    { p: [0, 1.25, -8.45], a: 0.18, b: 0.2 },
    { p: [2.4, 1.0, -7.95], a: 0.17, b: 0.18 },
    { p: [4.3, 0.55, -6.6], a: 0.15, b: 0.16 },
  ], { smooth: 3 }));
  // nasal bones: a bridge narrow under the nasion and broad below (Gray:
  // superior border narrow and thick, inferior border broad and thin), whose
  // free lower edges meet at the rhinion, the apex of the piriform aperture
  const nasals = sweep([
    { p: [0, 3.05, 9.28], a: 0.4, b: 0.24, up: [0, 0.38, 0.92] },
    { p: [0, 2.2, 9.72], a: 0.44, b: 0.21, up: [0, 0.38, 0.92] },
    { p: [0, 1.55, 10.0], a: 0.5, b: 0.17, up: [0, 0.38, 0.92] },
    { p: [0, 1.28, 10.1], a: 0.15, b: 0.12, up: [0, 0.38, 0.92] },
  ], { smooth: 4 });
  const ans = sweep([
    { p: [0, -2.08, 9.7], a: 0.3, b: 0.2 },
    { p: [0, -2.02, 10.55], a: 0.06, b: 0.06 },
  ]);
  const septum = slab(polygon2([[8.6, 0.6], [9.15, -1.95], [5.0, -2.4], [5.0, 2.4], [8.1, 2.4]]),
    frame([0, 0, 0], [0, 0, 1], [0, 1, 0]), 0.17, 0.06, [5.0, -2.4, 9.15, 2.4]);
  // conchae: thin scrolls along the lateral walls of the nasal cavity, set
  // back from the aperture (seen from the front: a fold on each wall, not a
  // disc in the opening)
  const conchaInf = L(ellipsoid([1.16, -1.2, 6.4], [0.2, 0.5, 1.9], euler(-6, 0, 0)));
  const conchaMid = L(ellipsoid([0.98, 0.3, 5.6], [0.18, 0.4, 1.4]));
  const infraorbitalForamen = L(sphere([2.45, -0.72, 9.42], 0.2));
  const supraorbitalNotch = L(sphere([2.2, 3.42, 9.26], 0.17));

  // --- CSG, in drawing order: masses → rims → fossae → sockets → processes
  let s = smoothUnion(0.8, vault, core, interorbital, lowerFrontal);
  s = smoothUnion(0.6, s, maxBody, maxMid, alveolar, frontalProcMax, zygBody, zygFrontal, brow);
  s = smoothUnion(0.45, s, canineEminence);
  s = subtract(s, canineFossa, 0.6);
  s = smoothUnion(0.7, s, earMass, mastoid);
  s = subtract(s, union(templeFossa, infraFossa), 0.7);
  s = smoothUnion(0.5, s, orbitWallL);
  s = subtract(s, orbits, 0.14);
  s = subtract(s, aperture, 0.1);
  s = smoothUnion(0.35, s, arch, eminence);
  s = subtract(s, union(eam, mandFossa, foramen), 0.2);
  s = smoothUnion(0.6, s, nasals); // a wide fillet: the bridge slopes into the frontal processes, no raised island
  s = smoothUnion(0.25, s, ans, condyles, styloid, inion, nuchal);
  s = smoothUnion(0.12, s, septum, conchaInf, conchaMid);
  s = subtract(s, union(infraorbitalForamen, supraorbitalNotch), 0.08);
  const cranium = s;

  // ---------------------------------------------------------------- mandible (closed)
  // body = a thick rounded base + a thinner alveolar crest (inverted-teardrop section)
  const base = L(sweep([
    { p: [0, -8.53, 9.95], a: 0.62, b: 0.72 },
    { p: [1.0, -8.48, 9.6], a: 0.6, b: 0.72 },
    { p: [1.9, -8.3, 8.9], a: 0.58, b: 0.7 },
    { p: [2.62, -8.02, 7.85], a: 0.6, b: 0.68 },
    { p: [3.15, -7.75, 6.6], a: 0.62, b: 0.66 },
    { p: [3.62, -7.45, 5.25], a: 0.6, b: 0.64 },
    { p: [4.12, -7.12, 3.9], a: 0.52, b: 0.6 },
    { p: [4.6, -6.75, 2.7], a: 0.42, b: 0.56 },
    { p: [4.85, -6.45, 2.15], a: 0.38, b: 0.52 },
  ], { k: 0.2, smooth: 4 }));
  const crest = L(sweep([
    { p: [0, -6.85, 9.78], a: 0.46, b: 1.1 },
    { p: [0.9, -6.82, 9.47], a: 0.45, b: 1.1 },
    { p: [1.62, -6.76, 8.92], a: 0.46, b: 1.08 },
    { p: [2.14, -6.66, 8.1], a: 0.5, b: 1.08 },
    { p: [2.5, -6.54, 7.14], a: 0.55, b: 1.08 },
    { p: [2.78, -6.42, 6.08], a: 0.6, b: 1.1 },
    { p: [3.0, -6.3, 5.04], a: 0.6, b: 1.1 },
    { p: [3.3, -6.2, 4.22], a: 0.52, b: 1.1 },
  ], { k: 0.2, smooth: 4 }));
  // ramus: a thin plate with the condylar and coronoid processes (z, y outline)
  // (u = z − 1.3 along the yawed ramus plane: its anterior border is medial)
  const RAMUS = [
    [1.1, -1.75], [1.3, -3.3], [1.55, -4.9], [1.78, -5.9], [2.12, -6.5], [2.75, -6.88], [3.7, -7.0],
    [4.3, -6.2], [4.3, -4.6], [4.08, -3.0], [3.98, -1.65], [3.95, -0.95], [3.66, -0.82], [3.22, -1.42],
    [2.62, -1.98], [2.0, -1.84], [1.6, -1.6],
  ].map(([u, v]) => [u - 1.3, v]);
  const ramus = L(slab(polygon2(RAMUS), frame([4.95, 0, 1.3], [-0.18, 0, 0.98], [0.05, 1, 0]), 0.3, 0.22, [-0.2, -7.0, 3.0, -0.82]));
  // the ramus plate thickens along its posterior border and the external oblique line
  const postBorder = L(sweep([
    { p: [4.99, -1.9, 1.32], a: 0.34, b: 0.42, up: [0, 0, 1] },
    { p: [4.96, -4.0, 1.58], a: 0.32, b: 0.36, up: [0, 0, 1] },
    { p: [4.9, -5.95, 2.0], a: 0.34, b: 0.38, up: [0, 0, 1] },
  ], { smooth: 3 }));
  const obliqueLine = L(sweep([
    { p: [4.42, -2.6, 4.02], a: 0.28, b: 0.3, up: [0, 0, 1] },
    { p: [4.3, -4.9, 4.12], a: 0.32, b: 0.32, up: [0, 0, 1] },
    { p: [4.0, -6.2, 4.75], a: 0.3, b: 0.3, up: [0, 0, 1] },
  ], { smooth: 3 }));
  const condyle = L(ellipsoid(HUMAN.condylion, [0.95, 0.45, 0.52], euler(0, -14, 0)));
  const neck = L(roundCone([4.98, -1.05, 1.32], [4.96, -2.15, 1.42], 0.5, 0.4));
  const chin = ellipsoid([0, -8.2, 10.1], [1.25, 0.92, 0.42]);
  const tubercles = L(ellipsoid([1.15, -8.7, 9.6], [0.48, 0.42, 0.38]));
  let m = smoothUnion(0.55, base, crest);
  m = smoothUnion(0.5, m, ramus, postBorder, obliqueLine);
  m = smoothUnion(0.35, m, condyle, neck);
  m = smoothUnion(0.4, m, chin, tubercles);
  m = subtract(m, L(sphere([2.62, -7.1, 8.05], 0.19)), 0.06); // mental foramen
  const mandible = m;

  // ---------------------------------------------------------------- bone labels
  const orbitWall = (s0, x, y, z, serr) => {
    const left = x >= 0;
    const LR = (r, l) => (left ? l : r);
    const o = orbitLocal(s0, y, z);
    if (o.w < 0.35) return -1;
    const d = orbitL.f(s0, y, z);
    if (d < -0.15 || d > 0.2) return -1;
    const lat = o.u, up = o.v;
    if (o.w > 3.55) return B.sphenoid;
    if (up > 0.45 && up >= Math.abs(lat)) return o.w > 2.9 + serr ? B.sphenoid : B.frontal;
    if (lat > 0.45 && lat >= Math.abs(up)) return o.w < 1.55 + serr ? LR(B['zygomatic-right'], B['zygomatic-left']) : B.sphenoid;
    if (up < -0.45 && -up >= Math.abs(lat)) {
      if (lat > 0.2 && o.w < 1.6 + serr) return LR(B['zygomatic-right'], B['zygomatic-left']);
      return o.w > 3.0 ? LR(B['palatine-right'], B['palatine-left']) : LR(B['maxilla-right'], B['maxilla-left']);
    }
    if (o.w < 0.9 + serr * 0.5) return LR(B['maxilla-right'], B['maxilla-left']);
    if (o.w < 1.95 + serr * 0.5) return LR(B['lacrimal-right'], B['lacrimal-left']);
    return B.ethmoid;
  };

  /** Bone index (into HUMAN_BONES) for a point on the cranium surface. */
  const boneOf = (x, y, z) => {
    const s0 = x < 0 ? -x : x;
    const left = x >= 0;
    const LR = (r, l) => (left ? l : r);
    // serrated sutures: two octaves of noise displace every boundary
    const serr = fbm3(x * 2.3 + 3.1, y * 2.3, z * 2.3) * 0.2 + fbm3(x * 5.1, y * 5.1 + 5.3, z * 5.1 - 1.7) * 0.09;

    if (septum.f(x, y, z) < 0.06) return y + (z - 7.6) * 0.45 < 0 ? B.vomer : B.ethmoid;
    if (conchaInf.f(x, y, z) < 0.06) return LR(B['concha-right'], B['concha-left']);
    if (conchaMid.f(x, y, z) < 0.06) return B.ethmoid;
    // nasal bones: the whole bony bridge, from the frontonasal suture (the
    // frontal's face rule below starts at the same serrated y) down to their
    // free lower border at the rhinion — narrow under the nasion (≈ 0.9 cm
    // for the pair), broad at the aperture (≈ 1.3 cm); the frontal processes
    // of the maxillae stay lateral to them (nasomaxillary sutures). A band,
    // not the nasal sweep's own surface, which the bridge buries near the top.
    if (y > 1.15 && y < 2.92 + serr * 0.15 && z > 9.25
      && s0 < 0.45 + 0.17 * Math.min(1.3, Math.max(0, 2.6 - y)) + serr * 0.1) {
      return x + serr * 0.15 < 0 ? B['nasal-right'] : B['nasal-left'];
    }

    const ow = orbitWall(s0, x, y, z, serr);
    if (ow >= 0) return ow;

    // nasal cavity walls
    const dAp = aperture.f(x, y, z);
    if (dAp > -0.15 && dAp < 0.2 && z < 10.2 && s0 < 1.9) {
      // the aperture's outer rim beside the apex is maxilla; the ethmoid lies deep
      if (y > 1.0) return z > 9.0 ? LR(B['maxilla-right'], B['maxilla-left']) : B.ethmoid;
      if (z < 5.7) return y > -0.6 ? B.sphenoid : LR(B['palatine-right'], B['palatine-left']);
      return LR(B['maxilla-right'], B['maxilla-left']);
    }

    // face
    if (z > 4.2 && y < 3.0 + serr * 0.2) {
      if (y < -2.3 && z < 5.75 + serr && s0 < 2.45) return LR(B['palatine-right'], B['palatine-left']);
      const sZM = 3.3 + Math.max(0, -y) * 0.3 + serr * 0.3;
      if (s0 > sZM) {
        if (y > 2.72 + serr * 0.5) return B.frontal; // frontozygomatic suture
        if (z < 5.75 - (y - 1.5) * 0.22 + serr * 0.6 && y > 0.3 + serr) return B.sphenoid; // sphenozygomatic
        if (z < 3.45 + (y + 0.4) * 0.5 + serr * 0.4) return LR(B['temporal-right'], B['temporal-left']);
        return LR(B['zygomatic-right'], B['zygomatic-left']);
      }
      if (y > 2.92 + serr * 0.15) return B.frontal;
      if (z < 4.9 && y > -1.0) return B.sphenoid;
      return x + serr * 0.12 < 0 ? B['maxilla-right'] : B['maxilla-left'];
    }

    // zygomatic arch behind the face: the zygomatic's temporal process in
    // front, the temporal's zygomatic process behind, one oblique
    // zygomaticotemporal suture between them (down and back). Tested before
    // the cranial base and pterion rules, which would claim its underside
    // and top for the sphenoid, a bone that has no part in the arch.
    if (arch.f(x, y, z) < 0.15) {
      return z > 3.6 + (y + 0.5) * 0.6 + serr * 0.4 ? LR(B['zygomatic-right'], B['zygomatic-left']) : LR(B['temporal-right'], B['temporal-left']);
    }

    // external cranial base
    if (y < -0.55) {
      if (z > 1.5 + serr * 0.4) return B.sphenoid;
      const occ = 1.15 + Math.max(0, 1.5 - z) * 0.55 + serr * 0.3;
      return s0 < occ ? B.occipital : LR(B['temporal-right'], B['temporal-left']);
    }
    // lambdoid suture
    if (z < -8.15 + (6.6 - y) * 0.405 + s0 * 0.1 + serr) return B.occipital;
    // temporal squama (arched squamous suture) and the region around the ear
    const sq = ((z + 0.6) / 4.1) ** 2 + ((y - 1.1) / 3.5) ** 2;
    if (s0 > 3.6 && (sq < 1 + serr * 0.18 || (y < 0.9 && z > -5.2 && z < 3.3))) return LR(B['temporal-right'], B['temporal-left']);
    // greater wing of the sphenoid at the pterion: its upper border arches
    // between the squama and the frontal (sphenoparietal / sphenofrontal sutures)
    const wing = Math.sin(Math.min(1, Math.max(0, (z - 2.6) / 3.4)) * Math.PI);
    if (s0 > 3.6 && z > 2.6 + serr * 0.8 && y < 3.0 + 0.45 * wing + serr * 0.6) return B.sphenoid;
    // coronal suture
    if (z > 1.95 + (11.15 - y) * 0.17 + serr) return B.frontal;
    // sagittal suture
    return x + serr * 0.55 < 0 ? B['parietal-right'] : B['parietal-left'];
  };

  // ---------------------------------------------------------------- construction iso-lines
  const lines = {
    centre: { f: (x) => x },
    brow: { f: (x, y) => y - 3.65, keep: (x, y, z) => z > 2.5 },
    eye: { f: (x, y) => y - HUMAN.orbitCentre[1], keep: (x, y, z) => z > 3 },
    nose: { f: (x, y) => y + 2.05, keep: (x, y, z) => z > 4 },
    temporalLine: {
      f: (x, y, z) => ((z - 0.3) / 6.9) ** 2 + ((y - 1.4) / 7.25) ** 2 - 1,
      keep: (x, y, z) => Math.abs(x) > 3.6 && y > 2.2 && z < 6.6,
    },
  };
  const mandibleLines = {
    centre: { f: (x) => x },
  };

  cached = {
    cranium, mandible, boneOf, lines, mandibleLines,
    parts: { septum, nasals, orbitL, aperture, arch, mastoid, vault },
    craniumBounds: [-7.25, -4.7, -9.0, 7.25, 11.6, 11.15],
    mandibleBounds: [-5.9, -9.5, 0.4, 5.9, 0.0, 10.7],
  };
  return cached;
}

// ---------------------------------------------------------------- teeth

/**
 * Permanent dentition, one quadrant per jaw (left side; mirrored for the
 * right). FDI order: central incisor, lateral incisor, canine, two
 * premolars, three molars — 8 per quadrant, 32 in all.
 * Sizes (cm) from standard dental-anatomy means: crown height `ch`,
 * mesiodistal `md`, labio/buccolingual `bl`, root length `rl`; `x, z` is the
 * cervical centre on the arch, `tilt` the labial/buccal inclination (deg).
 */
export const HUMAN_TEETH = {
  upper: [
    { fdi: 21, type: 'incisor', md: 0.86, bl: 0.7, ch: 1.05, rl: 0.75, x: 0.44, z: 10.0, tilt: 16 },
    { fdi: 22, type: 'incisor', md: 0.66, bl: 0.6, ch: 0.9, rl: 0.7, x: 1.2, z: 9.66, tilt: 14 },
    { fdi: 23, type: 'canine', md: 0.76, bl: 0.8, ch: 1.0, rl: 0.85, x: 1.8, z: 9.08, tilt: 9 },
    { fdi: 24, type: 'premolar', md: 0.7, bl: 0.9, ch: 0.84, rl: 0.6, x: 2.15, z: 8.38, tilt: 5 },
    { fdi: 25, type: 'premolar', md: 0.67, bl: 0.9, ch: 0.8, rl: 0.6, x: 2.38, z: 7.7, tilt: 4 },
    { fdi: 26, type: 'molar', md: 1.03, bl: 1.1, ch: 0.74, rl: 0.55, x: 2.6, z: 6.84, tilt: 3 },
    { fdi: 27, type: 'molar', md: 0.9, bl: 1.06, ch: 0.7, rl: 0.5, x: 2.75, z: 5.9, tilt: 2 },
    { fdi: 28, type: 'molar', md: 0.84, bl: 1.0, ch: 0.66, rl: 0.45, x: 2.82, z: 5.04, tilt: 1 },
  ],
  lower: [
    { fdi: 31, type: 'incisor', md: 0.54, bl: 0.6, ch: 0.9, rl: 0.7, x: 0.29, z: 9.66, tilt: 10 },
    { fdi: 32, type: 'incisor', md: 0.6, bl: 0.64, ch: 0.94, rl: 0.7, x: 0.85, z: 9.42, tilt: 9 },
    { fdi: 33, type: 'canine', md: 0.7, bl: 0.77, ch: 1.08, rl: 0.8, x: 1.42, z: 8.98, tilt: 7 },
    { fdi: 34, type: 'premolar', md: 0.7, bl: 0.77, ch: 0.86, rl: 0.6, x: 1.86, z: 8.33, tilt: 3 },
    { fdi: 35, type: 'premolar', md: 0.71, bl: 0.81, ch: 0.82, rl: 0.6, x: 2.17, z: 7.66, tilt: 2 },
    { fdi: 36, type: 'molar', md: 1.12, bl: 1.04, ch: 0.76, rl: 0.55, x: 2.45, z: 6.74, tilt: 0 },
    { fdi: 37, type: 'molar', md: 1.05, bl: 1.0, ch: 0.72, rl: 0.5, x: 2.62, z: 5.68, tilt: 0 },
    { fdi: 38, type: 'molar', md: 1.0, bl: 0.97, ch: 0.7, rl: 0.45, x: 2.74, z: 4.7, tilt: 0 },
  ],
};

/** Occlusal plane height at depth z (rises ~5° towards the molars). */
export const occlusalY = (z) => -4.95 + (10.0 - z) * 0.085;

/** One tooth in its own frame: cervical centre at the origin, crown towards +y, labial/buccal +z. */
export function toothSDF(t) {
  const { md, bl, ch, rl } = t;
  const up = [0, 0, 1];
  let crown, root;
  if (t.type === 'incisor') {
    crown = sweep([
      { p: [0, -0.05, 0], a: md * 0.36, b: bl * 0.42, up },
      { p: [0, ch * 0.45, bl * 0.05], a: md * 0.5, b: bl * 0.38, up },
      { p: [0, ch * 0.84, bl * 0.08], a: md * 0.5, b: bl * 0.18, up },
      { p: [0, ch, bl * 0.08], a: md * 0.47, b: Math.max(0.06, bl * 0.09), up },
    ]);
    root = roundCone([0, 0.05, 0], [0, -rl, -0.04], md * 0.3, 0.08);
  } else if (t.type === 'canine') {
    crown = sweep([
      { p: [0, -0.05, 0], a: md * 0.4, b: bl * 0.44, up },
      { p: [0, ch * 0.5, bl * 0.06], a: md * 0.5, b: bl * 0.46, up },
      { p: [0, ch * 0.8, bl * 0.06], a: md * 0.32, b: bl * 0.3, up },
      { p: [0, ch, bl * 0.04], a: 0.07, b: 0.07, up },
    ]);
    root = roundCone([0, 0.05, 0], [0, -rl, -0.05], md * 0.36, 0.1);
  } else if (t.type === 'premolar') {
    crown = smoothUnion(0.12,
      sweep([
        { p: [0, -0.05, 0], a: md * 0.38, b: bl * 0.4, up },
        { p: [0, ch * 0.55, 0], a: md * 0.5, b: bl * 0.5, up },
        { p: [0, ch * 0.78, 0], a: md * 0.44, b: bl * 0.44, up },
      ]),
      sphere([0, ch * 0.8, bl * 0.2], md * 0.27),
      sphere([0, ch * 0.74, -bl * 0.2], md * 0.23)
    );
    root = roundCone([0, 0.05, 0], [0, -rl, 0], md * 0.34, 0.1);
  } else {
    const rc = Math.min(md, bl) * 0.2;
    crown = smoothUnion(0.12,
      sweep([
        { p: [0, -0.05, 0], a: md * 0.44, b: bl * 0.42, up },
        { p: [0, ch * 0.5, 0], a: md * 0.52, b: bl * 0.5, up },
        { p: [0, ch * 0.74, 0], a: md * 0.48, b: bl * 0.46, up },
      ]),
      sphere([md * 0.22, ch * 0.78, bl * 0.21], rc),
      sphere([-md * 0.22, ch * 0.78, bl * 0.21], rc),
      sphere([md * 0.22, ch * 0.74, -bl * 0.21], rc),
      sphere([-md * 0.22, ch * 0.74, -bl * 0.21], rc)
    );
    root = union(
      roundCone([md * 0.2, 0.05, 0], [md * 0.24, -rl, 0], md * 0.22, 0.08),
      roundCone([-md * 0.2, 0.05, 0], [-md * 0.24, -rl, 0], md * 0.22, 0.08)
    );
  }
  return smoothUnion(0.1, crown, root);
}

/** World placement of a tooth on its arch (rotation + cervical point). */
export function toothFrame(t, jaw) {
  const upper = jaw === 'upper';
  // outward arch normal, from the arch's neighbourhood (ellipse-like arch)
  const nrm = norm3([t.x * 1.45, 0, Math.max(0.15, t.z - 4.2) * 0.32]);
  const tilt = ((t.tilt ?? 0) * Math.PI) / 180;
  const d0 = [0, upper ? -1 : 1, 0];
  const d = norm3([d0[0] * Math.cos(tilt) + nrm[0] * Math.sin(tilt), d0[1] * Math.cos(tilt), d0[2] * Math.cos(tilt) + nrm[2] * Math.sin(tilt)]);
  const b = norm3(sub3(nrm, [d[0] * dot3(nrm, d), d[1] * dot3(nrm, d), d[2] * dot3(nrm, d)]));
  const m = cross3(d, b);
  const occ = occlusalY(t.z);
  // cervical line: crown height away from the occlusal plane (lower incisors
  // sit a little lower and behind the uppers: overbite & overjet ≈ 2 mm)
  const tipY = upper ? occ - 0.02 : occ + (t.type === 'incisor' ? -0.22 : -0.02);
  const cy = upper ? tipY + t.ch * Math.cos(tilt) : tipY - t.ch * Math.cos(tilt);
  const cz = t.z - d[2] * t.ch * 0.5;
  // row-major R: columns = local axes (m, d, b) in world
  const R = [m[0], d[0], b[0], m[1], d[1], b[1], m[2], d[2], b[2]];
  return { R, t: [t.x, cy, cz] };
}

function teethModel(jaw) {
  const quad = union(...HUMAN_TEETH[jaw].map((t) => {
    const F = toothFrame(t, jaw);
    return transform(toothSDF(t), F.R, F.t);
  }));
  const sdf = mirrorX(quad);
  const bounds = jaw === 'upper' ? [-3.55, -5.35, 3.9, 3.55, -2.4, 10.75] : [-3.45, -6.75, 3.7, 3.45, -3.9, 10.45];
  return { sdf, bounds, label: (x) => (x < 0 ? 0 : 1), lipschitz: 1.8, symmetricX: true };
}

// ---------------------------------------------------------------- model factories (registered in sdf-models.js)

/** Cranium (all bones except the mandible), labelled per bone. */
export function humanCranium() {
  const H = buildHuman();
  return {
    sdf: H.cranium, bounds: H.craniumBounds, label: H.boneOf, lines: H.lines, lipschitz: 1.55, symmetricX: true,
    ao: { steps: [0.25, 0.7, 1.4, 2.4, 3.7], strength: 1.3 },
  };
}

/** Mandible in the closed position (single bone). */
export function humanMandible() {
  const H = buildHuman();
  return {
    sdf: H.mandible, bounds: H.mandibleBounds, lines: H.mandibleLines, lipschitz: 1.55, symmetricX: true,
    ao: { steps: [0.15, 0.4, 0.8, 1.4], strength: 0.9 },
  };
}

/** Upper or lower dental arch, labelled by quadrant (0 = right, 1 = left). */
export const humanTeeth = ({ jaw = 'upper' } = {}) => teethModel(jaw);

/** Whole skull (cranium ∪ closed mandible) for the coarse faceted "planes" stage. */
export function humanPlanes() {
  const H = buildHuman();
  const sdf = union(H.cranium, H.mandible);
  return { sdf, bounds: [-7.25, -9.5, -9.0, 7.25, 11.6, 11.15], lipschitz: 1.7, symmetricX: true };
}

/** Main-thread access to the raw SDFs (anchors, ray casts). */
export function humanSDF() {
  const H = buildHuman();
  return { cranium: H.cranium, mandible: H.mandible, parts: H.parts };
}
