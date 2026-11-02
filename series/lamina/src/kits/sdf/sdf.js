// SDF kit — signed-distance primitives and CSG operators for authoring solid
// anatomy (skulls, shells, bones) in centimetres.
//
// Why plain closures: models are evaluated hundreds of thousands of times per
// mesh inside a Web Worker, so this file is dependency-free JS (no three.js)
// and every node is just { f(x, y, z) → signed distance, b: AABB }. The AABB
// (`b = [minX, minY, minZ, maxX, maxY, maxZ]`, conservative) lets unions and
// subtractions skip children that cannot affect the result near a point —
// the main speed trick for models built from 100+ primitives.
//
// Conventions: negative inside, positive outside, distances in cm. Shapes are
// exact SDFs or Lipschitz-bounded approximations (ellipsoids, sweeps, warps);
// the mesher uses a safety factor so approximations never punch holes.

const INF = Infinity;
/** Unbounded AABB. */
export const ALL = Object.freeze([-INF, -INF, -INF, INF, INF, INF]);

const { sqrt, abs, min, max, cos, sin, floor, PI } = Math;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** @typedef {{ f: (x: number, y: number, z: number) => number, b: number[] }} SDF */

/**
 * Wrap a distance function and its bounds into an SDF node.
 * @param {(x: number, y: number, z: number) => number} f
 * @param {number[]} [b]
 * @returns {SDF}
 */
export const node = (f, b = ALL) => ({ f, b });

// ---------------------------------------------------------------- math helpers

/** Degrees → radians. */
export const deg = (d) => (d * PI) / 180;

/**
 * Rotation matrix (row-major 3×3, local → world) from XYZ Euler angles in
 * DEGREES, matching three.js' default 'XYZ' order (R = Rx · Ry · Rz).
 * @returns {number[]}
 */
export function euler(rx = 0, ry = 0, rz = 0) {
  const a = deg(rx), b = deg(ry), c = deg(rz);
  const ca = cos(a), sa = sin(a), cb = cos(b), sb = sin(b), cc = cos(c), sc = sin(c);
  return [
    cb * cc, -cb * sc, sb,
    ca * sc + sa * sb * cc, ca * cc - sa * sb * sc, -sa * cb,
    sa * sc - ca * sb * cc, sa * cc + ca * sb * sc, ca * cb,
  ];
}

/**
 * Orthonormal basis (row-major, local → world) whose local +Z is `forward`
 * and local +Y is as close as possible to `up`.
 */
export function basis(forward, up = [0, 1, 0]) {
  const z = norm3(forward);
  let x = cross3(up, z);
  if (len3(x) < 1e-6) x = cross3([1, 0, 0], z);
  x = norm3(x);
  const y = cross3(z, x);
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
}

export const len3 = (v) => sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
export const norm3 = (v) => {
  const l = len3(v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
export const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Polynomial smooth minimum (k = blend radius in cm). */
export function smin(a, b, k) {
  if (k <= 0) return a < b ? a : b;
  const h = k - abs(a - b);
  if (h <= 0) return a < b ? a : b;
  const hk = h / k;
  return (a < b ? a : b) - hk * hk * k * 0.25;
}
/** Polynomial smooth maximum. */
export function smax(a, b, k) {
  return -smin(-a, -b, k);
}

/** Squared distance from a point to an AABB (0 inside). */
function boxDist2(b, x, y, z) {
  const dx = x < b[0] ? b[0] - x : x > b[3] ? x - b[3] : 0;
  const dy = y < b[1] ? b[1] - y : y > b[4] ? y - b[4] : 0;
  const dz = z < b[2] ? b[2] - z : z > b[5] ? z - b[5] : 0;
  return dx * dx + dy * dy + dz * dz;
}

/** Union of AABBs. */
export function unionBounds(list) {
  const o = [INF, INF, INF, -INF, -INF, -INF];
  for (const b of list) {
    for (let i = 0; i < 3; i++) {
      o[i] = min(o[i], b[i]);
      o[i + 3] = max(o[i + 3], b[i + 3]);
    }
  }
  return o;
}
/** AABB grown by `r` on every side. */
export const growBounds = (b, r) => [b[0] - r, b[1] - r, b[2] - r, b[3] + r, b[4] + r, b[5] + r];
const boundsFinite = (b) => b.every((v) => Number.isFinite(v));

// ---------------------------------------------------------------- noise

const PERM = new Uint8Array(512);
{
  // deterministic permutation (xorshift) so meshes are identical everywhere
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = 0x9e3779b9 | 0;
  for (let i = 255; i > 0; i--) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    const j = (s >>> 0) % (i + 1);
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}
const GRAD = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function grad(h, x, y, z) {
  const g = (h % 12) * 3;
  return GRAD[g] * x + GRAD[g + 1] * y + GRAD[g + 2] * z;
}

/** Deterministic 3D gradient noise in about [-1, 1]. */
export function noise3(x, y, z) {
  const X = floor(x), Y = floor(y), Z = floor(z);
  x -= X; y -= Y; z -= Z;
  const xi = X & 255, yi = Y & 255, zi = Z & 255;
  const u = fade(x), v = fade(y), w = fade(z);
  const A = PERM[xi] + yi, AA = PERM[A] + zi, AB = PERM[A + 1] + zi;
  const Bq = PERM[xi + 1] + yi, BA = PERM[Bq] + zi, BB = PERM[Bq + 1] + zi;
  const l = (a, b, t) => a + (b - a) * t;
  return 1.6 * l(
    l(l(grad(PERM[AA], x, y, z), grad(PERM[BA], x - 1, y, z), u), l(grad(PERM[AB], x, y - 1, z), grad(PERM[BB], x - 1, y - 1, z), u), v),
    l(l(grad(PERM[AA + 1], x, y, z - 1), grad(PERM[BA + 1], x - 1, y, z - 1), u), l(grad(PERM[AB + 1], x, y - 1, z - 1), grad(PERM[BB + 1], x - 1, y - 1, z - 1), u), v),
    w
  );
}

/** Two-octave fractal noise in about [-1, 1]. */
export const fbm3 = (x, y, z) => noise3(x, y, z) * 0.67 + noise3(x * 2.03 + 17.1, y * 2.03 - 3.7, z * 2.03 + 9.2) * 0.33;

// ---------------------------------------------------------------- primitives

/** Sphere. */
export function sphere(c, r) {
  const [cx, cy, cz] = c;
  return node((x, y, z) => {
    const dx = x - cx, dy = y - cy, dz = z - cz;
    return sqrt(dx * dx + dy * dy + dz * dz) - r;
  }, [cx - r, cy - r, cz - r, cx + r, cy + r, cz + r]);
}

/** Exact AABB half-extents of an oriented box/ellipsoid with radii `r` under row-major rotation R. */
function orientedExtent(R, r) {
  return [
    sqrt((R[0] * r[0]) ** 2 + (R[1] * r[1]) ** 2 + (R[2] * r[2]) ** 2),
    sqrt((R[3] * r[0]) ** 2 + (R[4] * r[1]) ** 2 + (R[5] * r[2]) ** 2),
    sqrt((R[6] * r[0]) ** 2 + (R[7] * r[1]) ** 2 + (R[8] * r[2]) ** 2),
  ];
}

/**
 * Ellipsoid (iq's bound approximation: exact on the surface, conservative off it).
 * @param {number[]} c centre
 * @param {number[]} r radii along the local axes
 * @param {number[]} [R] row-major rotation (local → world), e.g. euler(...)
 */
export function ellipsoid(c, r, R = null) {
  const [cx, cy, cz] = c;
  const [rx, ry, rz] = r;
  const irx = 1 / rx, iry = 1 / ry, irz = 1 / rz;
  const irx2 = irx * irx, iry2 = iry * iry, irz2 = irz * irz;
  const rmin = min(rx, ry, rz);
  const e = R ? orientedExtent(R, r) : r;
  const b = [cx - e[0], cy - e[1], cz - e[2], cx + e[0], cy + e[1], cz + e[2]];
  if (!R) {
    return node((x, y, z) => {
      const qx = x - cx, qy = y - cy, qz = z - cz;
      const k0 = sqrt(qx * qx * irx2 + qy * qy * iry2 + qz * qz * irz2);
      const k1 = sqrt(qx * qx * irx2 * irx2 + qy * qy * iry2 * iry2 + qz * qz * irz2 * irz2);
      return k1 < 1e-12 ? -rmin : (k0 * (k0 - 1)) / k1;
    }, b);
  }
  const [r0, r1, r2, r3, r4, r5, r6, r7, r8] = R;
  return node((x, y, z) => {
    const dx = x - cx, dy = y - cy, dz = z - cz;
    const qx = r0 * dx + r3 * dy + r6 * dz;
    const qy = r1 * dx + r4 * dy + r7 * dz;
    const qz = r2 * dx + r5 * dy + r8 * dz;
    const k0 = sqrt(qx * qx * irx2 + qy * qy * iry2 + qz * qz * irz2);
    const k1 = sqrt(qx * qx * irx2 * irx2 + qy * qy * iry2 * iry2 + qz * qz * irz2 * irz2);
    return k1 < 1e-12 ? -rmin : (k0 * (k0 - 1)) / k1;
  }, b);
}

/** Capsule between points a and b. */
export function capsule(a, b, r) {
  return roundCone(a, b, r, r);
}

/**
 * Round cone (exact, iq): spheres of radius ra at a and rb at b, tangentially joined.
 */
export function roundCone(a, b, ra, rb) {
  const [ax, ay, az] = a;
  const bax = b[0] - ax, bay = b[1] - ay, baz = b[2] - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = ra - rb;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const sgnRR = Math.sign(rr);
  const bounds = unionBounds([
    [ax - ra, ay - ra, az - ra, ax + ra, ay + ra, az + ra],
    [b[0] - rb, b[1] - rb, b[2] - rb, b[0] + rb, b[1] + rb, b[2] + rb],
  ]);
  if (l2 < 1e-12) return sphere(a, max(ra, rb));
  return node((x, y, z) => {
    const pax = x - ax, pay = y - ay, paz = z - az;
    const yy = pax * bax + pay * bay + paz * baz;
    const zz = yy - l2;
    const wx = pax * l2 - bax * yy, wy = pay * l2 - bay * yy, wz = paz * l2 - baz * yy;
    const x2 = wx * wx + wy * wy + wz * wz;
    const y2 = yy * yy * l2;
    const z2 = zz * zz * l2;
    const k = sgnRR * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - rb;
    if (Math.sign(yy) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - ra;
    return (sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra;
  }, bounds);
}

/**
 * Rounded box (exact). `half` = half-extents incl. rounding, r = edge radius.
 */
export function roundBox(c, half, r = 0, R = null) {
  const [cx, cy, cz] = c;
  const hx = half[0] - r, hy = half[1] - r, hz = half[2] - r;
  const e = R ? orientedExtent(R, half) : half;
  const b = [cx - e[0], cy - e[1], cz - e[2], cx + e[0], cy + e[1], cz + e[2]];
  const M = R ?? [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const [r0, r1, r2, r3, r4, r5, r6, r7, r8] = M;
  return node((x, y, z) => {
    const dx = x - cx, dy = y - cy, dz = z - cz;
    const qx = abs(r0 * dx + r3 * dy + r6 * dz) - hx;
    const qy = abs(r1 * dx + r4 * dy + r7 * dz) - hy;
    const qz = abs(r2 * dx + r5 * dy + r8 * dz) - hz;
    const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0, oz = qz > 0 ? qz : 0;
    const inside = min(max(qx, qy, qz), 0);
    return sqrt(ox * ox + oy * oy + oz * oz) + inside - r;
  }, b);
}

/**
 * Capped cone between a (radius ra) and b (radius rb), flat caps (exact, iq).
 */
export function cone(a, b, ra, rb) {
  const [ax, ay, az] = a;
  const bax = b[0] - ax, bay = b[1] - ay, baz = b[2] - az;
  const baba = bax * bax + bay * bay + baz * baz;
  const rba = rb - ra;
  const bounds = unionBounds([
    [ax - ra, ay - ra, az - ra, ax + ra, ay + ra, az + ra],
    [b[0] - rb, b[1] - rb, b[2] - rb, b[0] + rb, b[1] + rb, b[2] + rb],
  ]);
  return node((x, y, z) => {
    const pax = x - ax, pay = y - ay, paz = z - az;
    const papa = pax * pax + pay * pay + paz * paz;
    const paba = (pax * bax + pay * bay + paz * baz) / baba;
    const xx = sqrt(max(papa - paba * paba * baba, 0));
    const cax = max(0, xx - (paba < 0.5 ? ra : rb));
    const cay = abs(paba - 0.5) - 0.5;
    const k = rba * rba + baba;
    const f = clamp01((rba * (xx - ra) + paba * baba) / k);
    const cbx = xx - ra - f * rba;
    const cby = paba - f;
    const s = cbx < 0 && cay < 0 ? -1 : 1;
    return s * sqrt(min(cax * cax + cay * cay * baba, cbx * cbx + cby * cby * baba));
  }, bounds);
}

/** Torus around local +Y (ring radius R, tube radius r). */
export function torus(c, Rr, r, Rm = null) {
  const [cx, cy, cz] = c;
  const M = Rm ?? [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const [r0, r1, r2, r3, r4, r5, r6, r7, r8] = M;
  const e = Rr + r;
  return node((x, y, z) => {
    const dx = x - cx, dy = y - cy, dz = z - cz;
    const qx = r0 * dx + r3 * dy + r6 * dz;
    const qy = r1 * dx + r4 * dy + r7 * dz;
    const qz = r2 * dx + r5 * dy + r8 * dz;
    const a = sqrt(qx * qx + qz * qz) - Rr;
    return sqrt(a * a + qy * qy) - r;
  }, [cx - e, cy - e, cz - e, cx + e, cy + e, cz + e]);
}

/** Half-space: points with dot(n, p) > d are outside (n normalised). */
export function plane(n, d) {
  const [nx, ny, nz] = norm3(n);
  return node((x, y, z) => nx * x + ny * y + nz * z - d, ALL);
}

/**
 * Swept tube with an ELLIPTICAL cross-section along a polyline — the
 * workhorse for arches, rims, mandible bodies, crests and processes.
 *
 * @param {Array<{p:number[], a:number, b:number, up?:number[]}>} nodes
 *   p: point; a: half-width along the section's side axis; b: half-height
 *   along `up` (default [0,1,0], orthogonalised against the tangent).
 * @param {{ up?: number[], k?: number, smooth?: number }} [o] default up; k = smooth blend
 *   between segments; smooth = Catmull-Rom subdivisions per segment (removes joint ripples)
 */
export function sweep(nodes, o = {}) {
  if (o.smooth && o.smooth > 1 && nodes.length > 2) nodes = subdivideNodes(nodes, o.smooth | 0);
  const segs = [];
  const k = o.k ?? 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    const A = nodes[i], Bn = nodes[i + 1];
    const d = sub3(Bn.p, A.p);
    const L = len3(d);
    if (L < 1e-9) continue;
    const t = scale3(d, 1 / L);
    const upRaw = norm3(add3(A.up ?? o.up ?? [0, 1, 0], Bn.up ?? o.up ?? [0, 1, 0]));
    let u = sub3(upRaw, scale3(t, dot3(t, upRaw)));
    if (len3(u) < 1e-6) u = sub3([0, 0, 1], scale3(t, t[2]));
    u = norm3(u);
    const s = cross3(t, u);
    const rmax = max(A.a, A.b, Bn.a, Bn.b);
    segs.push({
      ax: A.p[0], ay: A.p[1], az: A.p[2], dx: d[0], dy: d[1], dz: d[2], il2: 1 / (L * L),
      tx: t[0], ty: t[1], tz: t[2], ux: u[0], uy: u[1], uz: u[2], sx: s[0], sy: s[1], sz: s[2],
      a0: A.a, a1: Bn.a, b0: A.b, b1: Bn.b,
      bb: growBounds(unionBounds([[...A.p, ...A.p], [...Bn.p, ...Bn.p]]), rmax),
    });
  }
  const n = segs.length;
  const evalSeg = (g, x, y, z) => {
    const px = x - g.ax, py = y - g.ay, pz = z - g.az;
    let h = (px * g.dx + py * g.dy + pz * g.dz) * g.il2;
    h = h < 0 ? 0 : h > 1 ? 1 : h;
    const qx = px - g.dx * h, qy = py - g.dy * h, qz = pz - g.dz * h;
    const qs = qx * g.sx + qy * g.sy + qz * g.sz;
    const qu = qx * g.ux + qy * g.uy + qz * g.uz;
    const qt = qx * g.tx + qy * g.ty + qz * g.tz;
    const ra = g.a0 + (g.a1 - g.a0) * h;
    const rb = g.b0 + (g.b1 - g.b0) * h;
    const rc = ra < rb ? ra : rb;
    const ia = 1 / ra, ib = 1 / rb, ic = 1 / rc;
    const k0 = sqrt(qs * qs * ia * ia + qu * qu * ib * ib + qt * qt * ic * ic);
    const k1 = sqrt(qs * qs * ia * ia * ia * ia + qu * qu * ib * ib * ib * ib + qt * qt * ic * ic * ic * ic);
    return k1 < 1e-12 ? -rc : (k0 * (k0 - 1)) / k1;
  };
  const bounds = unionBounds(segs.map((g) => g.bb));
  return node((x, y, z) => {
    let d = INF;
    for (let i = 0; i < n; i++) {
      const g = segs[i];
      if (d !== INF && boxDist2(g.bb, x, y, z) > (d + k) * (d + k) && d + k > 0) continue;
      const v = evalSeg(g, x, y, z);
      d = d === INF ? v : smin(d, v, k);
    }
    return d;
  }, growBounds(bounds, k));
}

/** Catmull-Rom subdivision of sweep nodes (positions, radii and up vectors). */
function subdivideNodes(nodes, n) {
  const out = [];
  const N = nodes.length;
  const cr = (p0, p1, p2, p3, t) => {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  };
  for (let i = 0; i < N - 1; i++) {
    const n0 = nodes[Math.max(0, i - 1)], n1 = nodes[i], n2 = nodes[i + 1], n3 = nodes[Math.min(N - 1, i + 2)];
    for (let s = 0; s < n; s++) {
      const t = s / n;
      const p = [0, 1, 2].map((k) => cr(n0.p[k], n1.p[k], n2.p[k], n3.p[k], t));
      const a = Math.max(0.01, cr(n0.a, n1.a, n2.a, n3.a, t));
      const b = Math.max(0.01, cr(n0.b, n1.b, n2.b, n3.b, t));
      const node = { p, a, b };
      if (n1.up || n2.up) node.up = lerp3(n1.up ?? n2.up, n2.up ?? n1.up, t);
      out.push(node);
    }
  }
  out.push(nodes[N - 1]);
  return out;
}

// ---------------------------------------------------------------- 2D shapes (for slabs/extrusions)

/** 2D polygon SDF (iq). pts: [[u, v], ...] counter- or clockwise. */
export function polygon2(pts) {
  const n = pts.length;
  const vx = pts.map((p) => p[0]), vy = pts.map((p) => p[1]);
  return (px, py) => {
    let d = (px - vx[0]) ** 2 + (py - vy[0]) ** 2;
    let s = 1;
    for (let i = 0, j = n - 1; i < n; j = i, i++) {
      const ex = vx[j] - vx[i], ey = vy[j] - vy[i];
      const wx = px - vx[i], wy = py - vy[i];
      const t = clamp01((wx * ex + wy * ey) / (ex * ex + ey * ey));
      const bx = wx - ex * t, by = wy - ey * t;
      d = min(d, bx * bx + by * by);
      const c1 = py >= vy[i], c2 = py < vy[j], c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
    }
    return s * sqrt(d);
  };
}

/** 2D rounded rectangle centred at the origin (exact). */
export function roundRect2(hw, hh, r) {
  return (px, py) => {
    const qx = abs(px) - hw + r, qy = abs(py) - hh + r;
    const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0;
    return sqrt(ox * ox + oy * oy) + min(max(qx, qy), 0) - r;
  };
}

/** 2D ellipse (bound approximation). */
export function ellipse2(rx, ry) {
  const ix = 1 / rx, iy = 1 / ry;
  return (px, py) => {
    const k0 = sqrt(px * px * ix * ix + py * py * iy * iy);
    const k1 = sqrt(px * px * ix * ix * ix * ix + py * py * iy * iy * iy * iy);
    return k1 < 1e-12 ? -min(rx, ry) : (k0 * (k0 - 1)) / k1;
  };
}

/** 2D uneven capsule: circle r1 at (0,0), circle r2 at (0,h) — a teardrop/pear. Exact (iq). */
export function teardrop2(r1, r2, h) {
  const b = (r1 - r2) / h;
  const a = sqrt(1 - b * b);
  return (px, py) => {
    px = abs(px);
    const k = -b * px + a * py; // dot(p, vec2(-b, a))
    if (k < 0) return sqrt(px * px + py * py) - r1;
    if (k > a * h) return sqrt(px * px + (py - h) ** 2) - r2;
    return px * a + py * b - r1; // dot(p, vec2(a, b)) - r1
  };
}

/**
 * Local planar frame for 2D-profile primitives: origin o, in-plane axes u, v
 * (orthonormalised) and normal n = u × v.
 */
export function frame(o, u, v) {
  const U = norm3(u);
  let V = sub3(v, scale3(U, dot3(U, v)));
  V = norm3(V);
  const N = cross3(U, V);
  return { o, u: U, v: V, n: N };
}

/**
 * Slab: a 2D profile extruded symmetrically along the frame normal with
 * rounded edges — flat bones and processes (ramus, coronoid, crests, septum).
 * @param {(u:number, v:number) => number} shape2  2D SDF in frame units (cm)
 * @param {{o:number[],u:number[],v:number[],n:number[]}} F frame
 * @param {number} halfThick half thickness (cm)
 * @param {number} [round] edge rounding (cm)
 * @param {number[]} [b2] 2D bounds [u0, v0, u1, v1] of the profile (for the AABB)
 */
export function slab(shape2, F, halfThick, round = 0, b2 = null) {
  const [ox, oy, oz] = F.o;
  const [ux, uy, uz] = F.u, [vx, vy, vz] = F.v, [nx, ny, nz] = F.n;
  const ht = max(halfThick - round, 1e-4);
  let bounds = ALL;
  if (b2) {
    const corners = [];
    for (const uu of [b2[0], b2[2]])
      for (const vv of [b2[1], b2[3]])
        for (const ww of [-halfThick, halfThick])
          corners.push([ox + ux * uu + vx * vv + nx * ww, oy + uy * uu + vy * vv + ny * ww, oz + uz * uu + vz * vv + nz * ww]);
    bounds = unionBounds(corners.map((c) => [...c, ...c]));
  }
  return node((x, y, z) => {
    const dx = x - ox, dy = y - oy, dz = z - oz;
    const pu = dx * ux + dy * uy + dz * uz;
    const pv = dx * vx + dy * vy + dz * vz;
    const pn = dx * nx + dy * ny + dz * nz;
    const d2 = shape2(pu, pv) + round;
    const dn = abs(pn) - ht;
    const ox2 = d2 > 0 ? d2 : 0, on = dn > 0 ? dn : 0;
    return min(max(d2, dn), 0) + sqrt(ox2 * ox2 + on * on) - round;
  }, bounds);
}

/**
 * Tapered extrusion (frustum) of a 2D profile into the frame's −n direction:
 * the profile is full size at depth 0 and scales to `endScale` at `depth`;
 * it keeps growing in front of the opening so it cleanly cuts any surface
 * there. Used to carve orbits and apertures.
 */
export function frustum(shape2, F, depth, endScale = 0.3, front = 4, b2 = null) {
  const [ox, oy, oz] = F.o;
  const [ux, uy, uz] = F.u, [vx, vy, vz] = F.v, [nx, ny, nz] = F.n;
  const slope = (endScale - 1) / depth;
  let bounds = ALL;
  if (b2) {
    const corners = [];
    const sFront = 1 - slope * front;
    for (const [w, s] of [[-depth, endScale], [front, sFront]])
      for (const uu of [b2[0] * s, b2[2] * s])
        for (const vv of [b2[1] * s, b2[3] * s])
          corners.push([ox + ux * uu + vx * vv + nx * w, oy + uy * uu + vy * vv + ny * w, oz + uz * uu + vz * vv + nz * w]);
    bounds = unionBounds(corners.map((c) => [...c, ...c]));
  }
  return node((x, y, z) => {
    const dx = x - ox, dy = y - oy, dz = z - oz;
    const pu = dx * ux + dy * uy + dz * uz;
    const pv = dx * vx + dy * vy + dz * vz;
    const w = -(dx * nx + dy * ny + dz * nz); // depth into the bone
    let s = 1 + slope * (w < -front ? -front : w > depth ? depth : w);
    if (s < 0.05) s = 0.05;
    const d2 = shape2(pu / s, pv / s) * s;
    const dw = max(w - depth, -w - front);
    return max(d2, dw);
  }, bounds);
}

// ---------------------------------------------------------------- operators

/**
 * Hard union of nodes, skipping children whose bounds are farther than the
 * running minimum (exact for exact children, safe for bound approximations).
 */
export function union(...kids) {
  return smoothUnion(0, ...kids);
}

/** Smooth union with blend radius k (cm). */
export function smoothUnion(k, ...kids) {
  kids = kids.flat().filter(Boolean);
  if (kids.length === 1 && k === 0) return kids[0];
  const n = kids.length;
  const fs = kids.map((c) => c.f);
  const bs = kids.map((c) => c.b);
  const bounds = growBounds(unionBounds(bs), k);
  return node((x, y, z) => {
    let d = INF;
    for (let i = 0; i < n; i++) {
      if (d !== INF) {
        const lim = d + k;
        if (lim > 0 && boxDist2(bs[i], x, y, z) > lim * lim) continue;
      }
      const v = fs[i](x, y, z);
      d = d === INF ? v : smin(d, v, k);
    }
    return d;
  }, bounds);
}

/**
 * Subtract `b` from `a` (a − b) with blend radius k. b is skipped where it
 * cannot reach |a| (bounds test), which keeps carved models fast.
 */
export function subtract(a, b, k = 0) {
  const fa = a.f, fb = b.f, bb = b.b;
  return node((x, y, z) => {
    const da = fa(x, y, z);
    const lim = abs(da) + k;
    if (boxDist2(bb, x, y, z) > lim * lim) return da;
    const db = fb(x, y, z);
    return k > 0 ? smax(da, -db, k) : (da > -db ? da : -db);
  }, a.b);
}

/** Subtract several shapes at once (a − (b ∪ c ∪ …)). */
export function subtractAll(a, list, k = 0) {
  return subtract(a, union(...list), k);
}

/** Intersection with blend radius k. */
export function intersect(a, b, k = 0) {
  const fa = a.f, fb = b.f;
  const ba = a.b, bb = b.b;
  const bounds = [max(ba[0], bb[0]), max(ba[1], bb[1]), max(ba[2], bb[2]), min(ba[3], bb[3]), min(ba[4], bb[4]), min(ba[5], bb[5])];
  return node((x, y, z) => {
    const da = fa(x, y, z), db = fb(x, y, z);
    return k > 0 ? smax(da, db, k) : max(da, db);
  }, bounds);
}

/**
 * Mirror symmetry across the x = 0 plane: model one side (x > 0), get both.
 * Shapes should not cross the midline (or be symmetric about it).
 */
export function mirrorX(a) {
  const fa = a.f, b = a.b;
  const m = max(abs(b[0]), abs(b[3]));
  const lo = b[0] >= 0 ? -b[3] : -m;
  return node((x, y, z) => fa(x < 0 ? -x : x, y, z), [lo, b[1], b[2], -lo, b[4], b[5]]);
}

/** Translate. */
export function translate(a, t) {
  const [tx, ty, tz] = t;
  const fa = a.f, b = a.b;
  return node((x, y, z) => fa(x - tx, y - ty, z - tz), [b[0] + tx, b[1] + ty, b[2] + tz, b[3] + tx, b[4] + ty, b[5] + tz]);
}

/**
 * Rigid transform: rotate by row-major R (local → world) about `pivot`, then
 * translate by t. The child is authored in local coordinates around `pivot`.
 */
export function transform(a, R, t = [0, 0, 0], pivot = [0, 0, 0]) {
  const fa = a.f;
  const [r0, r1, r2, r3, r4, r5, r6, r7, r8] = R;
  const [px, py, pz] = pivot;
  const [tx, ty, tz] = t;
  let bounds = ALL;
  if (boundsFinite(a.b)) {
    const b = a.b;
    const corners = [];
    for (const x of [b[0], b[3]])
      for (const y of [b[1], b[4]])
        for (const z of [b[2], b[5]]) {
          const dx = x - px, dy = y - py, dz = z - pz;
          const w = [r0 * dx + r1 * dy + r2 * dz + px + tx, r3 * dx + r4 * dy + r5 * dz + py + ty, r6 * dx + r7 * dy + r8 * dz + pz + tz];
          corners.push([...w, ...w]);
        }
    bounds = unionBounds(corners);
  }
  return node((x, y, z) => {
    const dx = x - px - tx, dy = y - py - ty, dz = z - pz - tz;
    return fa(r0 * dx + r3 * dy + r6 * dz + px, r1 * dx + r4 * dy + r7 * dz + py, r2 * dx + r5 * dy + r8 * dz + pz);
  }, bounds);
}

/** Uniform scale about a pivot. */
export function scale(a, s, pivot = [0, 0, 0]) {
  const fa = a.f, b = a.b;
  const [px, py, pz] = pivot;
  const is = 1 / s;
  const bounds = [px + (b[0] - px) * s, py + (b[1] - py) * s, pz + (b[2] - pz) * s, px + (b[3] - px) * s, py + (b[4] - py) * s, pz + (b[5] - pz) * s];
  return node((x, y, z) => fa(px + (x - px) * is, py + (y - py) * is, pz + (z - pz) * is) * s, bounds);
}

/**
 * Domain warp: evaluate `a` at a displaced point. `fn(x, y, z, out)` writes the
 * warped point into `out`; `maxDisp` bounds the displacement (cm) for the AABB.
 * Warps stretch distances, so keep displacement gradients gentle (< ~0.5).
 */
export function warp(a, fn, maxDisp = 1) {
  const fa = a.f;
  const out = [0, 0, 0];
  return node((x, y, z) => {
    fn(x, y, z, out);
    return fa(out[0], out[1], out[2]);
  }, growBounds(a.b, maxDisp));
}

/** Add a bounded scalar field to the distance (bumps, pits, texture). */
export function displace(a, fn, amp = 0.2) {
  const fa = a.f;
  return node((x, y, z) => fa(x, y, z) + fn(x, y, z), growBounds(a.b, amp));
}

/** Round (inflate) by r. */
export function inflate(a, r) {
  const fa = a.f;
  return node((x, y, z) => fa(x, y, z) - r, growBounds(a.b, r));
}

/** Hollow shell of thickness t (onion). */
export function shell(a, t) {
  const fa = a.f;
  return node((x, y, z) => abs(fa(x, y, z)) - t * 0.5, growBounds(a.b, t));
}

/**
 * Restrict a shape to an AABB-shaped region by intersecting with a box —
 * handy to clip a blob to one side of a plane.
 */
export function clipBox(a, bmin, bmax, k = 0) {
  const c = [(bmin[0] + bmax[0]) / 2, (bmin[1] + bmax[1]) / 2, (bmin[2] + bmax[2]) / 2];
  const h = [(bmax[0] - bmin[0]) / 2, (bmax[1] - bmin[1]) / 2, (bmax[2] - bmin[2]) / 2];
  return intersect(a, roundBox(c, h, 0), k);
}

/**
 * Evaluate the SDF gradient (central differences) — main-thread helper for
 * projecting label anchors onto surfaces.
 */
export function gradient(sdf, x, y, z, e = 1e-3) {
  const f = sdf.f;
  const gx = f(x + e, y, z) - f(x - e, y, z);
  const gy = f(x, y + e, z) - f(x, y - e, z);
  const gz = f(x, y, z + e) - f(x, y, z - e);
  const l = sqrt(gx * gx + gy * gy + gz * gz) || 1;
  return [gx / l, gy / l, gz / l];
}

/**
 * Move a point onto the zero level set along the gradient (Newton steps).
 * @returns {number[]} surface point
 */
export function projectToSurface(sdf, p, steps = 6) {
  let [x, y, z] = p;
  for (let i = 0; i < steps; i++) {
    const d = sdf.f(x, y, z);
    if (abs(d) < 1e-4) break;
    const g = gradient(sdf, x, y, z);
    x -= g[0] * d; y -= g[1] * d; z -= g[2] * d;
  }
  return [x, y, z];
}

/**
 * Cast a ray from `o` along unit `dir`; returns the first surface hit
 * distance or -1 (sphere tracing with a Lipschitz safety factor).
 */
export function raycast(sdf, o, dir, maxT = 100, safety = 0.8) {
  let t = 0;
  for (let i = 0; i < 256 && t < maxT; i++) {
    const d = sdf.f(o[0] + dir[0] * t, o[1] + dir[1] * t, o[2] + dir[2] * t);
    if (d < 1e-3) return t;
    t += max(d * safety, 1e-3);
  }
  return -1;
}
