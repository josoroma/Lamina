// Snake head: separate rigid parts so the strike, the tongue flick and the
// dissection read anatomically.
//
//   upper head  crown + palate (a deformed sphere; superelliptic sections give
//               a viper its flat crown and, from the eye forward, the sharp
//               canthus its eye sits under; a coral snake's head is rounder),
//               with the supraocular shelf that overhangs a pit viper's eye
//   lower jaw   hinged at the quadrate joint at the back of the head
//   eyes        lidless, spectacle-covered; vertical slit (vipers, boas) or
//               round pupil (coral, sea snake), a dark limbal rim, a catchlight
//   pits        loreal heat pit between eye and nostril — pit vipers only
//   nostrils    lateral, or dorsal (sea snake)
//   tongue      forked; slides out through the lingual notch with the mouth shut
//   fangs       hinged solenoglyph fangs that swing erect (pit vipers), short
//               fixed proteroglyph fangs (elapids), or rows of recurved teeth (boa)
//   venom       glands behind the eye with a duct to the fang
//   skull       simplified bones for the skeleton layer (unfused mandibles)
//
// Local frame: origin at the back of the head on the mouth line, +X towards
// the snout tip (x = Lh), +Y up (crown), +Z to the animal's right.
//
// Proportions of the face (eye height and size, pit, nostril, labials) come
// from `spec.face` and `spec.eye` (species.js), sourced in
// .scratch/bilingual/research-snake-faces.md; the painter is face.js.
import * as THREE from 'three/webgpu';
import { atan, positionGeometry, uniform } from 'three/tsl';
import { headSkin, eyeNodes, faceColors, faceSwatches, tongueColor, PUPIL_COLOR } from './face.js';
import { buildTube } from '../../kits/tube/index.js';

/**
 * Profile tables (u = 0 back of head … 1 snout tip), 11 uniform knots.
 * `taper`: how much the sides of the crown lean in towards the top (0 = the
 * plain superellipse). A pit viper's section is a trapezoid: a flat crown
 * between the canthi, the cheeks sloping out to the lip, so the eye under
 * the canthus bulges from the cheek (by 0.65 r) without standing out of the
 * head's outline seen from above (research-snake-faces review R2).
 * `neckIn`: how far behind the snout (head lengths) the body's tube begins
 * inside the head (index.js; 0.7 when absent).
 */
const SHAPES = {
  // pit vipers: broad jaw angles, flat crown with a sharp canthus, truncated
  // snout; the crown slopes down into the nape behind the jowls
  lance: {
    width: [0.5, 0.86, 1.0, 0.98, 0.92, 0.84, 0.75, 0.66, 0.57, 0.5, 0.44],
    crown: [0.44, 0.72, 0.9, 0.98, 1.0, 0.97, 0.92, 0.85, 0.76, 0.66, 0.56],
    jawW: [0.5, 0.8, 0.84, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3, 0.22],
    jawD: [0.62, 0.95, 1.0, 0.94, 0.84, 0.74, 0.64, 0.54, 0.44, 0.34, 0.24],
    pCrown: 3.4, back: 0.08, front: 0.1, taper: 0.2,
  },
  broad: {
    width: [0.5, 0.88, 1.0, 0.99, 0.94, 0.86, 0.76, 0.65, 0.55, 0.47, 0.41],
    crown: [0.44, 0.72, 0.9, 0.98, 1.0, 0.97, 0.92, 0.85, 0.75, 0.64, 0.54],
    jawW: [0.5, 0.82, 0.86, 0.8, 0.72, 0.63, 0.54, 0.45, 0.37, 0.29, 0.22],
    jawD: [0.62, 0.96, 1.0, 0.94, 0.85, 0.75, 0.65, 0.54, 0.44, 0.34, 0.24],
    pCrown: 3.3, back: 0.08, front: 0.1, taper: 0.2,
  },
  // bushmaster: a lance head with no canthus and a broadly rounded snout
  // (Lachesis: "snout broadly rounded", "there is no canthus")
  bushmaster: {
    width: [0.5, 0.86, 1.0, 0.98, 0.92, 0.84, 0.76, 0.68, 0.6, 0.53, 0.47],
    crown: [0.44, 0.72, 0.9, 0.98, 1.0, 0.97, 0.92, 0.85, 0.76, 0.67, 0.58],
    jawW: [0.5, 0.8, 0.84, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3, 0.22],
    jawD: [0.62, 0.95, 1.0, 0.94, 0.84, 0.74, 0.64, 0.54, 0.44, 0.34, 0.24],
    pCrown: 3.4, back: 0.08, front: 0.16, taper: 0.2,
  },
  // elapids and the sea snake: the head is barely distinct from the neck, so
  // its back end is no bigger than the neck it grows out of (u = 0 knots at
  // the neck's ratio, a short closing round hidden inside the neck): no
  // capsule standing proud of the nape, no ink line across the joint
  elapid: {
    width: [0.75, 0.94, 1.0, 1.0, 0.99, 0.97, 0.94, 0.89, 0.82, 0.73, 0.62],
    crown: [0.75, 0.94, 1.0, 1.0, 0.99, 0.97, 0.94, 0.88, 0.8, 0.7, 0.58],
    jawW: [0.75, 0.86, 0.88, 0.86, 0.83, 0.79, 0.74, 0.67, 0.58, 0.48, 0.38],
    jawD: [0.72, 0.82, 0.93, 0.96, 0.9, 0.82, 0.73, 0.63, 0.52, 0.4, 0.28],
    // the neck's rounded end lies under the crown (index.js), so the neck
    // keeps its girth where the head grows out of it
    pCrown: 2.2, back: 0.04, front: 0.22, neckIn: 0.6,
  },
  sea: {
    width: [0.75, 0.93, 1.0, 1.0, 0.98, 0.94, 0.88, 0.8, 0.71, 0.61, 0.52],
    crown: [0.75, 0.93, 1.0, 1.0, 0.98, 0.94, 0.88, 0.8, 0.71, 0.61, 0.5],
    jawW: [0.75, 0.86, 0.88, 0.85, 0.81, 0.76, 0.69, 0.61, 0.52, 0.42, 0.32],
    jawD: [0.75, 0.94, 1.0, 0.95, 0.88, 0.8, 0.7, 0.6, 0.49, 0.38, 0.27],
    pCrown: 2.3, back: 0.04, front: 0.18,
  },
  boa: {
    width: [0.72, 0.93, 1.0, 0.98, 0.93, 0.87, 0.8, 0.74, 0.68, 0.62, 0.56],
    crown: [0.82, 0.95, 1.0, 0.98, 0.95, 0.91, 0.86, 0.81, 0.75, 0.67, 0.58],
    jawW: [0.68, 0.82, 0.84, 0.8, 0.75, 0.69, 0.63, 0.56, 0.49, 0.41, 0.33],
    jawD: [0.86, 1.0, 1.0, 0.94, 0.86, 0.78, 0.7, 0.61, 0.52, 0.42, 0.31],
    pCrown: 2.4, back: 0.09, front: 0.16,
  },
};

/** Smooth (Catmull-Rom) lookup in an 11-knot table at u ∈ [0, 1]. */
function table(tab, u) {
  const n = tab.length - 1;
  const f = Math.min(n, Math.max(0, u * n));
  const i = Math.min(n - 1, Math.floor(f));
  const t = f - i;
  const p0 = tab[Math.max(0, i - 1)], p1 = tab[i], p2 = tab[i + 1], p3 = tab[Math.min(n, i + 2)];
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Rounded closure of the head ends (quarter-circle profiles over `back` and `front`). */
function endRound(u, back, front) {
  let r = 1;
  if (u < back) r *= Math.sqrt(Math.max(0, 1 - (1 - u / back) ** 2));
  if (u > 1 - front) r *= Math.sqrt(Math.max(0, 1 - (1 - (1 - u) / front) ** 2));
  return r;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Head dimensions (cm) for a species preset and total length, with the eye's
 * place on the head (it depends on the section) and the supraocular shelf.
 * @returns {{Lh:number, W:number, Ht:number, Hb:number, shape:object, eyeU:number, pFront:number,
 *            eye:{u:number,x:number,y:number,z:number,zs:number,r:number,rVis:number,embed:number,phTop:number},
 *            brow:{out:number,up:number,len:number,phTop:number}|null}}
 */
export function headDims(spec, L) {
  const Lh = spec.head.length * L;
  const shape = SHAPES[spec.head.shape] ?? SHAPES.lance;
  const d = {
    Lh,
    W: spec.head.width * Lh * 0.5,
    Ht: spec.head.height * Lh,
    Hb: spec.head.jaw * Lh,
    shape,
    shapeName: SHAPES[spec.head.shape] ? spec.head.shape : 'lance',
    eyeU: spec.eye.at,
    // the crown section's exponent from the eye forward: a sharp canthus
    pFront: spec.head.canthus ?? shape.pCrown,
  };
  d.eye = placeEye(spec, d);
  const b = spec.head.brow;
  d.brow = b ? { out: b.out * d.eye.r, up: b.up * d.eye.r, len: (b.len * d.eye.r) / Lh, phTop: d.eye.phTop } : null;
  return d;
}

/**
 * Superellipse exponent of the crown section at u: the rounded temporal
 * region and jowls behind the eye, the flat crown and near-vertical cheeks of
 * a pit viper from the eye forward (P2 implies p ≈ 5 at the eye).
 */
function pAt(d, u) {
  const p0 = d.shape.pCrown;
  return d.pFront === p0 ? p0 : p0 + (d.pFront - p0) * smooth(d.eyeU - 0.17, d.eyeU - 0.04, u);
}

/** Half-width of the upper head surface at (u, height y ≥ 0) — before the supraocular shelf. */
function crownZ(d, u, y) {
  const S = d.shape;
  const er = endRound(u, S.back, S.front);
  const hw = d.W * table(S.width, u) * er;
  const ht = d.Ht * table(S.crown, u) * er;
  if (ht <= 1e-6) return 0;
  // the crown section is the superellipse (y/ht)^p + (z/hw)^p = 1, its sides
  // leaning in towards the top by the shape's taper
  const p = pAt(d, u);
  const q = Math.min(1, Math.max(0, y / ht));
  return hw * Math.pow(Math.max(0, 1 - Math.pow(q, p)), 1 / p) * (1 - (S.taper ?? 0) * q);
}

/** Crown height at u. */
function crownY(d, u) {
  const S = d.shape;
  return d.Ht * table(S.crown, u) * endRound(u, S.back, S.front);
}

/**
 * The eye's place: pit vipers carry it at the top corner of the head, its
 * top just under the canthal / supraocular edge (`eye.top: 'canthus'`);
 * others at `eye.height` of the crown. `zs` is the skin at its centre height.
 */
function placeEye(spec, d) {
  const u = spec.eye.at;
  const r = spec.eye.size * d.Lh;
  const embed = spec.eye.embed ?? 0.42;
  const rVis = r * Math.sqrt(1 - embed * embed);
  const y = spec.eye.top === 'canthus'
    ? crownY(d, u) * Math.pow(2, -1 / pAt(d, u)) - rVis - 0.05 * r
    : spec.eye.height * crownY(d, u);
  const zs = crownZ(d, u, y);
  const yTop = y + rVis;
  return { u, x: u * d.Lh, y, z: zs - embed * r, zs, r, rVis, embed, phTop: Math.atan2(crownZ(d, u, yTop), yTop) };
}

/**
 * The supraocular shelf's weight at a crown point (0…1): a band along the
 * head over the eye, and round the section from the crown down to just above
 * the top of the eye — a ledge over the eye, never a swelling round it.
 */
function browAt(d, u, Y, Z) {
  const b = d.brow;
  if (!b) return 0;
  const du = (u - d.eyeU) / b.len;
  if (du * du >= 1) return 0;
  const ph = Math.atan2(Math.abs(Z), Math.max(1e-6, Y)); // 0 dorsal … π/2 lateral
  return (1 - du * du) ** 2 * smooth(b.phTop + 0.06, b.phTop - 0.04, ph) * smooth(b.phTop - 0.55, b.phTop - 0.2, ph);
}

/** A point of the crown surface (shelf included) at u, on the section's corner (q = 2^(−1/p)), right side. */
function cornerPoint(d, u) {
  const S = d.shape;
  const er = endRound(u, S.back, S.front);
  const k = Math.pow(2, -1 / pAt(d, u));
  let y = d.Ht * table(S.crown, u) * er * k, z = d.W * table(S.width, u) * er * k * (1 - (S.taper ?? 0) * k);
  const g = browAt(d, u, y, z);
  if (g) {
    y += d.brow.up * g;
    z += d.brow.out * g;
  }
  return [y, z];
}

/** Outward unit normal of the (unshelved) crown surface at (u, y), right side. */
function surfaceNormal(d, u, y) {
  const e = 0.004, h = d.Lh * 0.004;
  const dzdx = (crownZ(d, u + e, y) - crownZ(d, u - e, y)) / (2 * e * d.Lh);
  const dzdy = (crownZ(d, u, y + h) - crownZ(d, u, y - h)) / (2 * h);
  return new THREE.Vector3(-dzdx, -dzdy, 1).normalize();
}

// ---- head part meshes ------------------------------------------------------------
// A head part is a sphere's grid reshaped: each ring of the sphere (poles on
// ±X) becomes a section of the head at u = (x + 1)/2, each column a direction
// round it. The grid is welded (one vertex per pole, one seam) and built once;
// a part's shape is a pure function of the head's dimensions, so it is shaped
// once per session and shared: a figure built again (a page turned back, the
// prefetched neighbour, another lesson's viper) wraps the cached arrays in a
// geometry of its own, which it may dispose freely.
const SEG_AROUND = 96, SEG_ALONG = 64; // keep the canthus and the shelf off the facets
let grid = null;
const shaped = new Map(); // key (part + dimensions) → { position, normal, box, sphere }
const SHAPED_MAX = 24;

/**
 * The welded unit sphere's grid: per ring its x (cos θ; ring 0 the snout
 * pole, the last ring the back pole), per column the direction round the
 * axis (cos φ, sin φ from +Y towards +Z), and the triangles (outward).
 */
function headGrid() {
  if (grid) return grid;
  const A = SEG_AROUND, H = SEG_ALONG;
  const count = 2 + (H - 1) * A;
  const ring = new Float64Array(H + 1);
  for (let i = 0; i <= H; i++) ring[i] = Math.cos((i / H) * Math.PI);
  const cos = new Float64Array(A), sin = new Float64Array(A);
  for (let j = 0; j < A; j++) {
    cos[j] = Math.cos((j / A) * Math.PI * 2);
    sin[j] = Math.sin((j / A) * Math.PI * 2);
  }
  const at = (i, j) => (i === 0 ? 0 : i === H ? count - 1 : 1 + (i - 1) * A + (j % A));
  const index = [];
  for (let i = 0; i < H; i++) {
    for (let j = 0; j < A; j++) {
      const a = at(i, j + 1), b = at(i, j), c = at(i + 1, j), e = at(i + 1, j + 1);
      if (i !== 0) index.push(a, b, e);
      if (i !== H - 1) index.push(b, c, e);
    }
  }
  grid = { A, H, count, ring, cos, sin, at, index: count > 65535 ? new Uint32Array(index) : new Uint16Array(index) };
  return grid;
}

/**
 * Deformed-sphere head part. `part`: 'upper' (crown above the mouth line,
 * palate below) or 'jaw' (floor of the mouth above, chin and throat below).
 * The crown's sections are spaced by polar angle (even vertices round a sharp
 * canthus).
 */
function headGeometry(d, part) {
  const b = d.brow;
  const key = [part, d.shapeName, d.Lh, d.W, d.Ht, d.Hb, d.eyeU, d.pFront, b ? `${b.out},${b.up},${b.len},${b.phTop}` : '-'].join('|');
  let arrays = shaped.get(key);
  if (arrays) {
    shaped.delete(key); // most recently used last
    shaped.set(key, arrays);
  } else {
    arrays = shapeHeadPart(d, part);
    shaped.set(key, arrays);
    if (shaped.size > SHAPED_MAX) shaped.delete(shaped.keys().next().value);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arrays.position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(arrays.normal, 3));
  g.setIndex(new THREE.BufferAttribute(headGrid().index, 1));
  g.boundingBox = arrays.box.clone();
  g.boundingSphere = arrays.sphere.clone();
  return g;
}

/** The positions and vertex normals of a head part (see headGeometry). */
function shapeHeadPart(d, part) {
  const S = d.shape;
  const G = headGrid();
  const { A, H, ring, cos, sin, at } = G;
  const position = new Float32Array(G.count * 3);
  const jawLen = 0.9; // the lower jaw is a little shorter than the snout
  const taper = S.taper ?? 0;
  const ePal = 2 / 3.2, eTop = 2 / 3.0, eLow = 2 / 2.2;
  for (let i = 0; i <= H; i++) {
    const u = (ring[i] + 1) / 2;
    const pole = i === 0 || i === H;
    // per section (ring): the profile tables, the closing round, the exponent
    let er, hw, ht, p, deep, top, X;
    if (part === 'upper') {
      er = endRound(u, S.back, S.front);
      hw = d.W * table(S.width, u) * er;
      ht = d.Ht * table(S.crown, u) * er;
      p = pAt(d, u);
      deep = d.Hb * 0.26 * er; // the palate
      X = u * d.Lh;
    } else {
      er = endRound(u, 0.1, 0.2);
      hw = d.W * table(S.jawW, u) * er;
      deep = d.Hb * table(S.jawD, u) * er; // chin and throat
      top = d.Hb * 0.16 * er; // the floor of the mouth
      X = (0.015 + u * jawLen) * d.Lh;
    }
    for (let j = 0; j < (pole ? 1 : A); j++) {
      // a pole's direction is +Y (atan2(0, 0) of the sphere it replaces)
      const c = pole ? 1 : cos[j], s = pole ? 0 : sin[j];
      const as = Math.abs(s), sg = s < 0 ? -1 : s > 0 ? 1 : 0;
      let Y, Z;
      if (part === 'upper') {
        if (c >= 0) {
          const k = Math.pow(Math.pow(c, p) + Math.pow(as, p), -1 / p);
          Y = ht * c * k;
          Z = hw * s * k * (1 - taper * c * k);
          const gb = browAt(d, u, Y, Z);
          if (gb) {
            Y += d.brow.up * gb;
            Z += sg * d.brow.out * gb;
          }
        } else {
          Y = -deep * Math.pow(-c, ePal);
          Z = hw * sg * Math.pow(as, ePal);
        }
      } else if (c >= 0) {
        Y = top * Math.pow(c, eTop);
        Z = hw * sg * Math.pow(as, eTop);
      } else {
        Y = -deep * Math.pow(-c, eLow);
        Z = hw * sg * Math.pow(as, eLow);
      }
      const v = at(i, j) * 3;
      position[v] = X;
      position[v + 1] = Y;
      position[v + 2] = Z;
    }
  }
  // area-weighted vertex normals (as BufferGeometry.computeVertexNormals)
  const normal = new Float32Array(G.count * 3);
  const idx = G.index;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const e1x = position[b] - position[a], e1y = position[b + 1] - position[a + 1], e1z = position[b + 2] - position[a + 2];
    const e2x = position[c] - position[a], e2y = position[c + 1] - position[a + 1], e2z = position[c + 2] - position[a + 2];
    // (c − b) × (a − b) points the same way as (b − a) × (c − a)
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    normal[a] += nx; normal[a + 1] += ny; normal[a + 2] += nz;
    normal[b] += nx; normal[b + 1] += ny; normal[b + 2] += nz;
    normal[c] += nx; normal[c + 1] += ny; normal[c + 2] += nz;
  }
  for (let v = 0; v < normal.length; v += 3) {
    const l = Math.hypot(normal[v], normal[v + 1], normal[v + 2]) || 1;
    normal[v] /= l;
    normal[v + 1] /= l;
    normal[v + 2] /= l;
  }
  const box = new THREE.Box3().setFromArray(position);
  const sphere = new THREE.Sphere();
  box.getCenter(sphere.center);
  let r2 = 0;
  for (let v = 0; v < position.length; v += 3) {
    const dx = position[v] - sphere.center.x, dy = position[v + 1] - sphere.center.y, dz = position[v + 2] - sphere.center.z;
    r2 = Math.max(r2, dx * dx + dy * dy + dz * dz);
  }
  sphere.radius = Math.sqrt(r2);
  return { position, normal, box, sphere };
}

/** A tapered, gently recurved cone along local −Y (fangs, teeth). */
function fangGeometry(length, baseR, curve = 0.22) {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push(new THREE.Vector3(-curve * length * t * t, -length * t, 0));
  }
  return buildTube(pts, {
    radius: (u) => baseR * (1 - u) + baseR * 0.06,
    rings: 12,
    radial: 8,
    startCap: 'round',
    endCap: 'point',
    up: [1, 0, 0],
  });
}

/**
 * A raised, spine-like scale along local +Y: a cone `height` tall, its base
 * `base` long (local X) and `thick` thick (local Z), tip curving back (−X).
 */
function spineGeometry(height, base, thick) {
  const g = fangGeometry(height, base * 0.5, 0.18);
  g.rotateX(Math.PI); // tip up (+Y), still curving towards −X
  g.scale(1, 1, thick / base);
  return g;
}

/**
 * The pupil: a patch of a sphere just outside the eye (local +Z = line of
 * sight) — a vertical lens-shaped slit of half-width `hw`, half-height `hh`
 * (fractions of the radius), or a round pupil of radius `hw`.
 */
function pupilGeometry(radius, hw, hh, round) {
  const pos = [], idx = [];
  const R = radius * 1.022;
  if (round) {
    const a = Math.asin(Math.min(0.95, hw / 1.022));
    const rings = 4, seg = 20;
    pos.push(0, 0, R);
    for (let i = 1; i <= rings; i++) {
      const rho = (a * i) / rings;
      for (let j = 0; j < seg; j++) {
        const al = (j / seg) * Math.PI * 2;
        pos.push(R * Math.sin(rho) * Math.cos(al), R * Math.sin(rho) * Math.sin(al), R * Math.cos(rho));
      }
    }
    for (let j = 0; j < seg; j++) idx.push(0, 1 + j, 1 + ((j + 1) % seg));
    for (let i = 1; i < rings; i++) {
      const o0 = 1 + (i - 1) * seg, o1 = 1 + i * seg;
      for (let j = 0; j < seg; j++) {
        const j1 = (j + 1) % seg;
        idx.push(o0 + j, o1 + j, o1 + j1, o0 + j, o1 + j1, o0 + j1);
      }
    }
  } else {
    const a = Math.asin(Math.min(0.95, hh / 1.022)), b = Math.asin(Math.min(0.9, hw / 1.022));
    const rows = 16, cols = 4;
    for (let i = 0; i <= rows; i++) {
      const th = -a + (2 * a * i) / rows; // up the slit
      const w = Math.sqrt(Math.max(0, 1 - (th / a) ** 2));
      for (let j = 0; j <= cols; j++) {
        const ph = (-1 + (2 * j) / cols) * b * w;
        pos.push(R * Math.cos(th) * Math.sin(ph), R * Math.sin(th), R * Math.cos(th) * Math.cos(ph));
      }
    }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const k = i * (cols + 1) + j;
        idx.push(k, k + 1, k + cols + 2, k, k + cols + 2, k + cols + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const nrm = pos.map((v) => v / R);
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

/** Basis whose +Z is `look` and +Y stays as close to world up as possible. */
function lookQuaternion(look) {
  const z = look.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const x = new THREE.Vector3().crossVectors(up, z).normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

/**
 * Build a snake head.
 * @param {object} ctx  FigureContext
 * @param {object} spec  resolved species preset
 * @param {ReturnType<headDims>} d
 * @returns {object} head with `group`, `parts`, `anchors`, `marks`, `pose(state)`, `setLayers()`, `dispose()`
 */
export function buildHead(ctx, spec, d) {
  const disposables = [];
  const track = (x) => (disposables.push(x), x);
  const { Lh, W, Ht, Hb } = d;
  const c = spec.colors;
  const F = spec.face ?? {};
  const E = d.eye;
  const eu = E.u;

  const group = new THREE.Group();
  group.name = 'head';
  const upper = new THREE.Group(); // tilts about the occiput during the strike
  upper.name = 'head-upper';
  group.add(upper);

  // --- the face's features (cm): pit, nostril --------------------------------
  let pitF = null;
  if (spec.pits && F.pit) {
    const P = F.pit;
    const pu = eu + P.ahead;
    const py = E.y - P.below * Lh;
    pitF = { u: pu, x: pu * Lh, y: py, z: crownZ(d, pu, py), a: P.len * 0.5 * Lh, b: P.ht * 0.5 * Lh, c: (P.depth ?? 0.02) * 0.5 * Lh, turn: P.turn ?? 0.5 };
  }
  const N = F.nostril ?? { x: 0.925, below: 0.06, len: 0.028, ht: 0.02 };
  let nosF;
  if (N.dorsal) {
    const z = N.z * W;
    const hw = d.W * table(d.shape.width, N.x) * endRound(N.x, d.shape.back, d.shape.front);
    const p = pAt(d, N.x);
    const y = crownY(d, N.x) * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, z / hw), p)), 1 / p);
    nosF = { u: N.x, x: N.x * Lh, y, z, a: N.len * 0.5 * Lh, b: N.ht * 0.5 * Lh, dorsal: true };
  } else {
    const y = N.y !== undefined ? N.y * crownY(d, N.x) : E.y - N.below * Lh;
    nosF = { u: N.x, x: N.x * Lh, y, z: crownZ(d, N.x, y), a: N.len * 0.5 * Lh, b: N.ht * 0.5 * Lh, dorsal: false };
  }
  // the painter also needs the crown's corner (the canthus and the
  // supraocular's edge, shelf included), [y, z] in cm at u
  const geo = { Lh, W, Ht, Hb, eye: E, pit: pitF, nostril: nosF, corner: (u) => cornerPoint(d, u) };

  // --- skin ---------------------------------------------------------------
  // named colours of the head and jaw for the SVG plate; the first is the
  // dominant one (the coral's jaw is yellow and black, not its red venter)
  const headSwatches = faceSwatches(spec, 'head');
  const jawSwatches = faceSwatches(spec, 'jaw');
  const headColor = headSwatches ? headSwatches[0].color : c.headTop ?? c.ground ?? c.black ?? c.dorsum;
  const jawColor = jawSwatches ? jawSwatches[0].color : c.venter ?? c.chin ?? c.yellow;
  // hatching along the head: round the section from the crown (upper) or the
  // chin (jaw), so on a flat cheek the lines follow the lip and the jaw (rings
  // would stand on it as a picket of vertical strokes); cm of arc
  const rm = (W + Ht) * 0.5;
  const pg = positionGeometry;
  // how far the mouth is open (pose): the lining shows only in a gape
  const mouthOpen = uniform(0);
  const upperSkin = headSkin(spec, geo, 'upper', ctx, mouthOpen);
  const upperMat = track(ctx.ink({
    colorNode: upperSkin.colorNode, svgColor: headColor, hatchCoord: atan(pg.z, pg.y).mul(rm), hatch: 0.45,
    roughness: 0.5, name: 'head-skin',
  }));
  if (upperSkin.normalNode) upperMat.normalNode = upperSkin.normalNode;
  // the SVG plate reads the colours without the fine lines and scale tone
  upperMat.userData.exportColorNode = upperSkin.exportColorNode;
  const upperMesh = new THREE.Mesh(track(headGeometry(d, 'upper')), upperMat);
  upperMesh.name = 'head-skin';
  ctx.outline(upperMesh);
  upper.add(upperMesh);

  const jawPivot = new THREE.Group();
  jawPivot.name = 'jaw';
  const pivot = new THREE.Vector3(0.035 * Lh, -0.04 * Hb, 0);
  jawPivot.position.copy(pivot);
  upper.add(jawPivot);
  const jawSkin = headSkin(spec, geo, 'jaw', ctx, mouthOpen);
  const jawMat = track(ctx.ink({
    colorNode: jawSkin.colorNode, svgColor: jawColor, hatchCoord: atan(pg.z, pg.y.negate()).mul(rm), hatch: 0.35,
    roughness: 0.55, name: 'jaw-skin',
  }));
  if (jawSkin.normalNode) jawMat.normalNode = jawSkin.normalNode;
  jawMat.userData.exportColorNode = jawSkin.exportColorNode;
  const jawMesh = new THREE.Mesh(track(headGeometry(d, 'jaw')), jawMat);
  jawMesh.name = 'jaw-skin';
  jawMesh.position.copy(pivot).negate();
  ctx.outline(jawMesh);
  jawPivot.add(jawMesh);

  // --- eyes ----------------------------------------------------------------
  // glossy spectacle, never hatched; the catchlight is emissive so it stays
  // white under the brow's shadow. The pupil is also a mesh (ink-flat), so it
  // survives the engraving style and prints as its own part in the SVG; it
  // carries the catchlight too, which lies on the spectacle in front of it.
  const er = E.r;
  const eyeN = eyeNodes(spec);
  const iris = eyeN.swatches[0].color;
  const eyeMat = track(ctx.ink({ colorNode: eyeN.colorNode, emissiveNode: eyeN.emissiveNode, svgColor: iris, roughness: 0.08, hatch: 0, name: 'eye' }));
  const eyeGeo = track(new THREE.SphereGeometry(er, 32, 22));
  const slit = spec.eye.pupil === 'slit';
  const pupilGeo = track(pupilGeometry(er, slit ? spec.eye.pupilW ?? 0.18 : 0.42, 0.78, !slit));
  const pupilMat = track(ctx.flat({ color: PUPIL_COLOR, colorNode: eyeN.pupilNode, name: 'pupil' }));
  const eyes = new THREE.Group();
  eyes.name = 'eyes';
  const pupils = new THREE.Group();
  pupils.name = 'pupils';
  const look = spec.eye.look ?? [0.25, 0.12];
  const eyeMeshes = [];
  for (const side of [1, -1]) {
    const e = new THREE.Mesh(eyeGeo, eyeMat);
    e.name = side > 0 ? 'eye-right' : 'eye-left';
    e.position.set(E.x, E.y, side * E.z);
    e.quaternion.copy(lookQuaternion(new THREE.Vector3(look[0], look[1], side)));
    ctx.outline(e, { width: 1.0 });
    eyes.add(e);
    eyeMeshes.push(e);
    const pm = new THREE.Mesh(pupilGeo, pupilMat);
    pm.name = side > 0 ? 'pupil-right' : 'pupil-left';
    pm.position.copy(e.position);
    pm.quaternion.copy(e.quaternion);
    pupils.add(pm);
  }
  eyes.add(pupils);
  upper.add(eyes);

  // --- pits and nostrils ---------------------------------------------------
  // dark openings set into the skin (the painter rings them with pale scales):
  // a pit faces forward and out, its long axis along the head
  const fc = faceColors(spec);
  const pitMat = track(ctx.ink({ color: fc.pitInner ?? '#1a0f0a', roughness: 0.9, hatch: 0, name: 'pit' }));
  const nosMat = track(ctx.ink({ color: '#17130f', roughness: 0.9, hatch: 0, name: 'nostril' }));
  const dotGeo = track(new THREE.SphereGeometry(1, 20, 12));
  const pits = new THREE.Group();
  pits.name = 'pits';
  const nostrils = new THREE.Group();
  nostrils.name = 'nostrils';
  /** An opening of semi-axes a × b (cm) on the surface at p, facing n (right side), mirrored for side −1. */
  const opening = (mat, group, p, n, a, b, depth, side) => {
    const m = new THREE.Mesh(dotGeo, mat);
    const nn = n.clone().setZ(n.z * side);
    // sunk to 30 % of its depth: the cut through the skin is 0.95 of its axes
    m.position.set(p[0], p[1], p[2] * side).addScaledVector(nn, -0.3 * depth);
    m.quaternion.copy(lookQuaternion(nn));
    m.scale.set(a / 0.954, b / 0.954, depth);
    group.add(m);
    return m;
  };
  const nosN = nosF.dorsal ? new THREE.Vector3(0.1, 1, 0.25).normalize() : surfaceNormal(d, nosF.u, nosF.y);
  for (const side of [1, -1]) opening(nosMat, nostrils, [nosF.x, nosF.y, nosF.z], nosN, nosF.a, nosF.b, Math.min(nosF.a, nosF.b) * 0.5, side);
  upper.add(nostrils);
  let pitN = null;
  if (pitF) {
    pitN = surfaceNormal(d, pitF.u, pitF.y).add(new THREE.Vector3(pitF.turn, 0, 0)).normalize();
    for (const side of [1, -1]) opening(pitMat, pits, [pitF.x, pitF.y, pitF.z], pitN, pitF.a, pitF.b, pitF.c, side);
    upper.add(pits);
  }

  // --- eyelash (superciliary) scales ----------------------------------------
  // B. nigroadspersus: "two raised and spinelike supraciliary scales" a side
  // (Arteaga et al. 2024), on the outer edge of the supraocular, up and out,
  // the rear one taller and raked back
  let eyelash = null;
  const lashBases = [];
  if (spec.eyelash && F.spines) {
    eyelash = new THREE.Group();
    eyelash.name = 'eyelash-scales';
    const lashMat = track(ctx.ink({ color: fc.spine ?? c.groundAlt ?? c.ground, roughness: 0.5, svgColor: fc.spine ?? c.ground, name: 'eyelash' }));
    const S = F.spines;
    for (const side of [1, -1]) {
      S.list.forEach(([dx, h, rake]) => {
        const g = track(spineGeometry(h * Lh, S.base * Lh, S.thick * Lh));
        const m = new THREE.Mesh(g, lashMat);
        const uu = eu + dx;
        const [yy, zz] = cornerPoint(d, uu);
        m.position.set(uu * Lh, yy - S.thick * Lh * 0.3, side * (zz - S.thick * Lh * 0.45));
        const dir = new THREE.Vector3(-rake, 1, side * S.lateral).normalize();
        const nrm = new THREE.Vector3(0, 0, side);
        nrm.addScaledVector(dir, -nrm.dot(dir)).normalize();
        const xAx = new THREE.Vector3().crossVectors(dir, nrm);
        m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAx, dir, nrm));
        ctx.outline(m, { width: 0.35 });
        eyelash.add(m);
        // the label points two thirds up the rear spine, clear of the eye below it
        if (dx === S.list[0][0]) lashBases.push(m.position.clone().addScaledVector(dir, h * Lh * 0.65));
      });
    }
    upper.add(eyelash);
  }

  // --- tongue --------------------------------------------------------------
  const lt = Lh * 0.95;
  const tongueGroup = new THREE.Group();
  tongueGroup.name = 'tongue';
  const tongueHex = tongueColor(spec);
  const tongueMat = track(ctx.ink({ color: tongueHex, roughness: 0.35, hatch: 0.3, name: 'tongue' }));
  const stem = track(buildTube([0, 0, 0, lt * 0.32, 0, 0, lt * 0.62, 0, 0], {
    radius: (u) => Lh * (0.032 - u * 0.012), rings: 14, radial: 8, startCap: 'round', endCap: 'open',
  }));
  const tines = [];
  const tineMesh = new THREE.Group();
  for (const side of [1, -1]) {
    const g = track(buildTube([lt * 0.6, 0, 0, lt * 0.8, 0, side * lt * 0.035, lt, 0, side * lt * 0.075], {
      radius: (u) => Lh * (0.02 - u * 0.016), rings: 12, radial: 8, startCap: 'round', endCap: 'point',
    }));
    const m = new THREE.Mesh(g, tongueMat);
    tines.push(m);
    tineMesh.add(m);
  }
  const stemMesh = new THREE.Mesh(stem, tongueMat);
  ctx.outline(stemMesh, { width: 0.35 });
  tines.forEach((m) => ctx.outline(m, { width: 0.35 }));
  // the tongue slides through a pivot at the lingual notch (the gap in the
  // front of the lip), so flicks swing the protruding part, not the sheath
  const tongueSlide = new THREE.Group();
  tongueSlide.add(stemMesh, tineMesh);
  tongueSlide.scale.set(1, 0.72, 1);
  tongueGroup.add(tongueSlide);
  const notch = new THREE.Vector3(Lh * 0.965, -Hb * 0.04, 0).sub(pivot);
  tongueGroup.position.copy(notch);
  jawPivot.add(tongueGroup);

  // --- fangs and teeth -----------------------------------------------------
  const fangs = new THREE.Group();
  fangs.name = 'fangs';
  const fangMat = track(ctx.ink({ color: '#f1e8d2', roughness: 0.3, hatch: 0.4, name: 'fang' }));
  const fangPivots = [];
  let teeth = null;
  if (spec.fangs === 'solenoglyph') {
    const lf = Lh * 0.27;
    const g = track(fangGeometry(lf, lf * 0.1, 0.25));
    for (const side of [1, -1]) {
      const pv = new THREE.Group();
      pv.position.set(Lh * 0.8, -Hb * 0.02, side * W * table(d.shape.width, 0.8) * 0.42);
      const m = new THREE.Mesh(g, fangMat);
      ctx.outline(m, { width: 0.4 });
      pv.add(m);
      fangs.add(pv);
      fangPivots.push(pv);
    }
  } else if (spec.fangs === 'proteroglyph') {
    // short fixed front fangs, hidden behind the lips when the mouth is shut:
    // rooted high in the upper jaw and inside the lower jaw's rim, so the
    // tip stays within the closed mouth
    const lf = Lh * 0.07;
    const g = track(fangGeometry(lf, lf * 0.17, 0.12));
    for (const side of [1, -1]) {
      const pv = new THREE.Group();
      pv.position.set(Lh * 0.84, Hb * 0.12, side * W * table(d.shape.width, 0.84) * 0.3);
      const m = new THREE.Mesh(g, fangMat);
      ctx.outline(m, { width: 0.35 });
      pv.add(m);
      fangs.add(pv);
      fangPivots.push(pv);
    }
  } else {
    // boa: rows of small recurved teeth — maxillary and palatine–pterygoid
    // rows above, dentary below; no fangs, no venom
    const tg = track(fangGeometry(Lh * 0.05, Lh * 0.012, 0.45));
    const upperRows = [];
    for (const side of [1, -1]) {
      for (let i = 0; i < 16; i++) {
        const u = 0.2 + (i / 15) * 0.72;
        upperRows.push([u * Lh, -Hb * 0.03, side * W * table(d.shape.width, u) * endRound(u, d.shape.back, d.shape.front) * 0.8]);
      }
      for (let i = 0; i < 11; i++) {
        const u = 0.18 + (i / 10) * 0.6;
        upperRows.push([u * Lh, -Hb * 0.06, side * W * table(d.shape.width, u) * 0.36]);
      }
    }
    const lowerRows = [];
    for (const side of [1, -1]) {
      for (let i = 0; i < 16; i++) {
        const u = 0.14 + (i / 15) * 0.74;
        const jw = W * table(d.shape.jawW, u) * 0.72;
        lowerRows.push([(0.015 + u * 0.9) * Lh, Hb * 0.06, side * jw]);
      }
    }
    teeth = new THREE.Group();
    teeth.name = 'teeth';
    const mk = (rows, flip) => {
      const im = new THREE.InstancedMesh(tg, fangMat, rows.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
      const e = new THREE.Euler(flip ? Math.PI : 0, 0, flip ? 0.35 : -0.35);
      q.setFromEuler(e);
      rows.forEach((p, i) => {
        m4.compose(new THREE.Vector3(p[0], p[1], p[2]), q, sc);
        im.setMatrixAt(i, m4);
      });
      im.instanceMatrix.needsUpdate = true;
      im.frustumCulled = false;
      return im;
    };
    const up = mk(upperRows, false);
    up.name = 'upper-teeth';
    upper.add(up);
    const low = mk(lowerRows.map((p) => [p[0] - pivot.x, p[1] - pivot.y, p[2]]), true);
    low.name = 'lower-teeth';
    jawPivot.add(low);
    teeth.userData.meshes = [up, low];
  }
  if (fangPivots.length) upper.add(fangs);

  // --- venom apparatus -----------------------------------------------------
  let venom = null;
  const glands = [];
  if (spec.fangs !== 'none') {
    venom = new THREE.Group();
    venom.name = 'venom';
    const vMat = track(ctx.ink({ color: '#d9c457', roughness: 0.45, svgColor: '#d9c457', name: 'venom-gland' }));
    const big = spec.fangs === 'solenoglyph';
    const gGeo = track(new THREE.SphereGeometry(1, 24, 16));
    for (const side of [1, -1]) {
      const gl = new THREE.Mesh(gGeo, vMat);
      const gu = big ? 0.36 : 0.46;
      gl.position.set(gu * Lh, Ht * 0.16, side * W * table(d.shape.width, gu) * 0.58);
      gl.userData.baseZ = gl.position.z;
      glands.push(gl);
      gl.scale.set(Lh * (big ? 0.17 : 0.1), Lh * (big ? 0.085 : 0.05), W * (big ? 0.24 : 0.18));
      gl.name = 'venom-gland';
      ctx.outline(gl, { width: 0.6 });
      venom.add(gl);
      const fx = big ? 0.8 : 0.84;
      const duct = track(buildTube([
        (gu + (big ? 0.15 : 0.09)) * Lh, Ht * 0.14, side * W * table(d.shape.width, gu) * 0.56,
        (fx - 0.06) * Lh, Ht * 0.04, side * W * table(d.shape.width, fx) * 0.5,
        fx * Lh, -Hb * 0.01, side * W * table(d.shape.width, fx) * (big ? 0.42 : 0.6),
      ], { radius: Lh * 0.012, rings: 16, radial: 8 }));
      const dm = new THREE.Mesh(duct, vMat);
      dm.name = 'venom-duct';
      venom.add(dm);
    }
    upper.add(venom);
  }

  // --- simplified skull (skeleton layer) -------------------------------------
  const skull = new THREE.Group();
  skull.name = 'skull';
  const boneMat = track(ctx.ink({ color: '#ece2cb', roughness: 0.7, svgColor: '#ece2cb', name: 'bone' }));
  const sphere = track(new THREE.SphereGeometry(1, 20, 14));
  const bone = (cx, cy, cz, sx, sy, sz, parent = skull) => {
    const m = new THREE.Mesh(sphere, boneMat);
    m.position.set(cx, cy, cz);
    m.scale.set(sx, sy, sz);
    ctx.outline(m, { width: 0.5 });
    parent.add(m);
    return m;
  };
  const rod = (pts, r, parent = skull) => {
    const m = new THREE.Mesh(track(buildTube(pts, { radius: r, rings: 10, radial: 8 })), boneMat);
    ctx.outline(m, { width: 0.5 });
    parent.add(m);
    return m;
  };
  bone(0.3 * Lh, 0.48 * Ht, 0, 0.25 * Lh, 0.3 * Ht, 0.34 * W); // braincase
  bone(0.83 * Lh, 0.42 * Ht, 0, 0.13 * Lh, 0.16 * Ht, 0.2 * W); // snout (nasals, premaxilla)
  rod([0.45 * Lh, 0.6 * Ht, 0, 0.62 * Lh, 0.58 * Ht, 0, 0.76 * Lh, 0.5 * Ht, 0], Lh * 0.04); // frontals
  for (const side of [1, -1]) {
    const qTop = [0.1 * Lh, 0.55 * Ht, side * 0.38 * W];
    const joint = [pivot.x, pivot.y, side * 0.56 * W];
    rod([...qTop, 0.06 * Lh, 0.25 * Ht, side * 0.5 * W, ...joint], Lh * 0.022); // quadrate
    rod([0.2 * Lh, 0.62 * Ht, side * 0.18 * W, 0.12 * Lh, 0.6 * Ht, side * 0.32 * W, ...qTop], Lh * 0.016); // supratemporal
    rod([0.78 * Lh, 0.0, side * 0.34 * W, 0.42 * Lh, 0.02 * Ht, side * 0.36 * W, 0.08 * Lh, 0.02 * Ht, side * 0.44 * W], Lh * 0.016); // pterygoid
    if (spec.fangs === 'solenoglyph') {
      bone(0.8 * Lh, 0.02 * Ht, side * W * 0.4, 0.05 * Lh, 0.06 * Lh, 0.045 * Lh); // short rotating maxilla
    } else {
      rod([0.24 * Lh, 0.0, side * 0.72 * W, 0.6 * Lh, 0.02 * Ht, side * 0.66 * W, 0.9 * Lh, 0.04 * Ht, side * 0.42 * W], Lh * 0.02); // long maxilla
    }
  }
  const jawSkull = new THREE.Group();
  jawSkull.name = 'mandibles';
  for (const side of [1, -1]) {
    // the two mandibles are not fused at the chin — a stretchy ligament joins them
    rod([0, 0, side * 0.56 * W, 0.4 * Lh, -0.35 * Hb, side * 0.4 * W, 0.86 * Lh, -0.2 * Hb, side * 0.08 * W], Lh * 0.024, jawSkull);
  }
  jawPivot.add(jawSkull);
  upper.add(skull);

  // --- label anchors ------------------------------------------------------------
  // Anchors on parts that can be hidden live inside them, so their labels
  // hide with them (eyes, tongue, teeth, eyelash scales go with the skin).
  // A face feature has one on each side (`alt`, mirrored), so a host can point
  // at the one facing the reader; `userData.facing` is the outward normal in
  // the anchor's parent frame. Label marks (labels.js): a ring of `size` cm
  // round an eye, pit or nostril, a tick (the leader stops short) elsewhere —
  // never a dot over the feature.
  const anchor = (name, parent, x, y, z, facing) => {
    const a = new THREE.Object3D();
    a.name = `anchor:${name}`;
    a.position.set(x, y, z);
    if (facing) a.userData.facing = facing.clone();
    parent.add(a);
    return a;
  };
  const pair = (name, parent, x, y, z, facing) => [
    anchor(name, parent, x, y, z, facing),
    anchor(name, parent, x, y, -z, facing ? facing.clone().setZ(-facing.z) : null),
  ];
  const fwd = new THREE.Vector3(0, 0, 1);
  // the eye: at the centre of each eye, so a ring of the eye's radius drawn
  // round it encloses the whole eye from any side (on the cornea's apex it
  // would sit off-centre on screen, and a ring round it would cross the eye;
  // a label ray stops short of its anchor by more than an eye's radius)
  const eyeA = eyeMeshes.map((e) => anchor('eye', e, 0, 0, 0, fwd));
  // pit and nostril: at the opening, lifted 0.3 of their mark off the skin;
  // the mark's radius is the opening's half-length (its ring, drawn 1.5 px
  // further out, clears the opening — and crowds the eye's ring less)
  const pitSize = pitF ? pitF.a : 0;
  const pitA = pitF ? pair('loreal-pit', upper, pitF.x + pitN.x * 0.3 * pitSize, pitF.y + pitN.y * 0.3 * pitSize, pitF.z + pitN.z * 0.3 * pitSize, pitN) : null;
  const nosSize = nosF.a;
  const nosA = pair('nostril', upper, nosF.x + nosN.x * 0.3 * nosSize, nosF.y + nosN.y * 0.3 * nosSize, nosF.z + nosN.z * 0.3 * nosSize, nosN);
  // the eye stripe: halfway along its run behind the eye
  const esU = (E.u - (0.8 * E.r) / Lh + 0.03) * 0.5, esY = (E.y + 0.2 * Ht) * 0.5;
  const esA = pair('eye-stripe', upper, esU * Lh, esY, crownZ(d, esU, esY), surfaceNormal(d, esU, esY));
  const lashA = eyelash ? lashBases.map((p) => anchor('eyelash-scales', eyelash, p.x, p.y, p.z, new THREE.Vector3(0, 0.6, Math.sign(p.z)).normalize())) : null;
  const fangA = fangPivots.map((pv) => anchor('fangs', pv, 0, -Lh * (spec.fangs === 'solenoglyph' ? 0.16 : 0.06), 0));
  // on the outer face of each gland (unit-sphere space), so it follows the dissection
  const glandA = glands.map((gl, i) => anchor('venom-gland', gl, 0, 0.25, i ? -0.97 : 0.97, new THREE.Vector3(0, 0, i ? -1 : 1)));
  // the teeth: the tips of the upper row's hind teeth, just below the palate
  // near the corner of the mouth, where a gape shows them (further forward
  // the row is buried in the prey's fur while the béquer bites, plate VII)
  const tU = 0.25;
  const teethA = teeth ? pair('recurved-teeth', teeth.userData.meshes[0], tU * Lh, -Hb * 0.26, W * table(d.shape.width, tU) * endRound(tU, d.shape.back, d.shape.front) * 0.8, new THREE.Vector3(0, -0.3, 1).normalize()) : null;
  const anchors = {
    head: anchor('head', upper, 0.42 * Lh, crownY(d, 0.42) * 1.02, 0),
    eye: eyeA[0],
    // on the tongue's axis, relative to the lip notch (see pose)
    tongue: anchor('tongue', tongueGroup, Lh * 0.035, 0, 0),
    nostril: nosA[0],
    'loreal-pit': pitA ? pitA[0] : null,
    fangs: fangA[0] ?? null,
    'venom-gland': glandA[0] ?? null,
    'eyelash-scales': lashA ? lashA[0] : null,
    'recurved-teeth': teethA ? teethA[0] : null,
    'eye-stripe': esA[0],
  };
  /**
   * Label extras per anchor id: the mark, `size` (cm: the radius a ring is
   * drawn round), the mirror-side anchor (`alt`), and `headSize` (cm, the
   * head's length: on a head too small on screen every face mark is a tick).
   */
  const face = (o) => (o ? { ...o, headSize: Lh } : null);
  const marks = {
    head: face({ mark: 'tick' }),
    eye: face({ mark: 'ring', size: er, alt: eyeA[1] }),
    tongue: face({ mark: 'tick' }),
    nostril: face({ mark: 'ring', size: nosSize, alt: nosA[1] }),
    'loreal-pit': face(pitA && { mark: 'ring', size: pitSize, alt: pitA[1] }),
    fangs: face({ mark: 'tick', ...(fangA[1] ? { alt: fangA[1] } : {}) }),
    'venom-gland': face({ mark: 'tick', ...(glandA[1] ? { alt: glandA[1] } : {}) }),
    'eyelash-scales': face(lashA && { mark: 'tick', alt: lashA[1] }),
    'recurved-teeth': face(teethA && { mark: 'tick', alt: teethA[1] }),
    'eye-stripe': face({ mark: 'tick', alt: esA[1] }),
  };

  // --- pose -----------------------------------------------------------------------
  const state = { skin: true, skeleton: false, venom: false, eyelash: true };
  /**
   * @param {{gape?:number, fang?:number, tongue?:number, flick?:number, spread?:number, tilt?:number}} s
   * @param {number} explode 0..1
   */
  function pose(s, explode = 0) {
    const gape = (s.gape ?? 0) + explode * 0.55;
    jawPivot.rotation.z = -gape;
    mouthOpen.value = smooth(0.02, 0.1, gape);
    jawPivot.position.set(pivot.x - explode * Lh * 0.05, pivot.y - explode * Lh * 0.18, 0);
    upper.rotation.z = (s.tilt ?? 0) + explode * 0.12;
    const fang = Math.max(s.fang ?? 0, explode);
    if (spec.fangs === 'solenoglyph') {
      // folded back against the palate (−1.45 rad) → erect, slightly forward
      for (const pv of fangPivots) pv.rotation.z = -1.45 + fang * 1.62;
    } else if (fangPivots.length) {
      for (const pv of fangPivots) pv.rotation.z = 0.08;
    }
    const ext = Math.max(0, Math.min(1, s.tongue ?? 0));
    // a tongue drawn in is out of sight: its label goes with it (the host
    // drops a hidden anchor's pill, leader and SVG callout) and comes back
    // with the next flick; the UI keeps its slot meanwhile
    anchors.tongue.visible = ext > 0.15;
    tongueSlide.position.x = -lt * (1.06 - ext * 0.84);
    tongueGroup.rotation.z = ((s.flick ?? 0) * 0.75 - 0.06) * ext;
    tineMesh.scale.set(1, 1, 1 + (s.spread ?? 0.5) * 0.8);
    // halfway along the part that shows (it protrudes lt·(0.84·ext − 0.06)
    // beyond the notch); a retracted tongue is labelled on the floor of the
    // mouth just behind the jaw's tip (the notch itself lies past the tip and
    // would hang in the air when the mouth opens)
    anchors.tongue.position.x = Math.max(-Lh * 0.08, lt * (0.84 * ext - 0.06) * 0.5);
    if (venom) {
      // dissection: the glands slide out sideways
      for (let i = 0; i < glands.length; i++) {
        const g = glands[i];
        g.position.z = Math.sign(g.userData.baseZ) * (Math.abs(g.userData.baseZ) + explode * W * 0.9);
      }
    }
    skull.position.y = explode * Ht * 0.6;
  }

  /**
   * Head layers. Without the skin, the soft parts (eyes, tongue) and the
   * scales (eyelash spines) go with it; fangs and teeth stay while the skull
   * or the venom apparatus they belong to is shown — nothing floats alone.
   */
  function setLayers({ skin = state.skin, skeleton = state.skeleton, venom: v = state.venom, eyelash: el = state.eyelash } = {}) {
    state.skin = skin;
    state.skeleton = skeleton;
    state.venom = v;
    state.eyelash = el;
    skull.visible = skeleton;
    jawSkull.visible = skeleton;
    eyes.visible = skin;
    tongueGroup.visible = skin;
    fangs.visible = skin || skeleton || v;
    if (teeth) for (const m of teeth.userData.meshes) m.visible = skin || skeleton;
    if (venom) venom.visible = v;
    if (eyelash) eyelash.visible = el && skin;
  }
  setLayers();
  pose({});

  // the SVG plate names the mouth lining only while the mouth is open: shut,
  // none shows, and the exporter would snap blends of lip, plate edge and
  // crown (a pale edge over brown, cream into tan) to its pink. A part left
  // with one colour is printed flat in it (false)
  const shut = (sw) => {
    const left = sw ? sw.filter((s) => !s.mouth) : [];
    return left.length > 1 ? left : false;
  };
  const headShut = shut(headSwatches), jawShut = shut(jawSwatches);
  const parts = [
    { id: 'head', name: 'Head', object: upperMesh, color: headColor, get swatches() { return mouthOpen.value > 0 ? headSwatches : headShut; } },
    { id: 'jaw', name: 'Lower jaw', object: jawMesh, color: jawColor, get swatches() { return mouthOpen.value > 0 ? jawSwatches : jawShut; } },
    // the eye prints its iris, rim and catchlight once it is big enough to read
    { id: 'eyes', name: 'Eyes', object: eyes, color: iris, swatches: eyeN.swatches, minPatternPx: 40 },
    // the catchlight crosses a pupil as often as the iris: the pupils print
    // it too (the eye's two colours that keep their small islands)
    { id: 'pupils', name: 'Pupils', object: pupils, color: PUPIL_COLOR, swatches: eyeN.swatches.filter((s) => s.keepSmall), minPatternPx: 12 },
    { id: 'nostrils', name: 'Nostrils', object: nostrils, color: '#17130f' },
    { id: 'tongue', name: 'Forked tongue', object: tongueGroup, color: tongueHex },
  ];
  if (pitF) parts.push({ id: 'loreal-pits', name: 'Loreal pits', object: pits, color: fc.pitInner ?? '#17130f', swatches: [{ color: fc.pitInner ?? '#17130f', name: 'Pit opening' }] });
  if (fangPivots.length) parts.push({ id: 'fangs', name: spec.fangs === 'solenoglyph' ? 'Hinged fangs' : 'Fixed fangs', object: fangs, color: '#f1e8d2' });
  if (teeth) teeth.userData.meshes.forEach((m, i) => parts.push({ id: i ? 'lower-teeth' : 'upper-teeth', name: i ? 'Dentary teeth' : 'Upper teeth', object: m, color: '#f1e8d2' }));
  if (eyelash) parts.push({ id: 'eyelash-scales', name: 'Eyelash scales', object: eyelash, color: fc.spine ?? c.ground, layer: 'eyelash-scales' });
  if (venom) parts.push({ id: 'venom-glands', name: 'Venom glands', object: venom, color: '#d9c457', layer: 'venom' });
  parts.push({ id: 'skull', name: 'Skull', object: skull, color: '#ece2cb', layer: 'skeleton' });
  parts.push({ id: 'mandibles', name: 'Mandibles', object: jawSkull, color: '#ece2cb', layer: 'skeleton' });

  return {
    group,
    upper,
    jaw: jawPivot,
    skin: [upperMesh, jawMesh, ...(pitF ? [pits] : []), nostrils],
    eyes,
    tongue: tongueGroup,
    anchors,
    marks,
    parts,
    dims: d,
    /** centre of the head's cross-section above the mouth line at the occiput */
    centreY: (crownY(d, 0.22) - Hb * table(d.shape.jawD, 0.22)) * 0.5,
    pose,
    setLayers,
    dispose() {
      if (teeth) for (const m of teeth.userData.meshes) m.dispose();
      for (const x of disposables) x.dispose?.();
    },
  };
}
