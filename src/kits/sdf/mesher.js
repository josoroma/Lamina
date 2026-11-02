// Surface-nets mesher for SDF models: narrow-band sampling, one vertex per
// surface cell projected onto the true surface, gradient normals, and an
// optional REGION SPLIT that cuts the mesh into one clean submesh per region
// (e.g. one per skull bone) with exact seams between them.
//
// Why surface nets: they give smooth, well-shaped quads from any SDF with one
// vertex per cell (half the vertices of marching cubes), which is what a
// hatched, outlined "engraving" needs. Pure JS, no three.js: it runs in the
// mesher worker (see mesher.worker.js) or on the main thread as a fallback.
//
// Region split: every vertex gets a label from `label(x, y, z)`. Triangles
// whose corners disagree are cut along the boundary (found by bisection on
// each edge, cached so neighbouring triangles agree), so each region's patch
// ends on a clean, shared seam. The seam polylines are returned too — they
// are drawn as sutures. Iso-lines of arbitrary scalar fields (centre line,
// cross-contours) are extracted the same way with marching triangles.

import { buildBVH } from './bvh.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

class F32 {
  constructor(n = 1024) { this.a = new Float32Array(n); this.n = 0; }
  push3(x, y, z) {
    if (this.n + 3 > this.a.length) this.grow();
    const a = this.a; a[this.n++] = x; a[this.n++] = y; a[this.n++] = z;
  }
  grow() { const b = new Float32Array(this.a.length * 2); b.set(this.a); this.a = b; }
  done() { return this.a.slice(0, this.n); }
}
class I32 {
  constructor(n = 1024) { this.a = new Int32Array(n); this.n = 0; }
  push(v) {
    if (this.n >= this.a.length) { const b = new Int32Array(this.a.length * 2); b.set(this.a); this.a = b; }
    this.a[this.n++] = v;
  }
}

// cube corner c → (c&1, (c>>1)&1, (c>>2)&1); 12 edges as corner pairs
const EDGES = [0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7];

/**
 * Mesh an SDF.
 *
 * @param {{ f: Function, b: number[] }} sdf
 * @param {object} o
 * @param {number[]} [o.bounds]   [x0,y0,z0,x1,y1,z1] region to mesh (default sdf.b)
 * @param {number} [o.cell=0.2]   cell size (cm)
 * @param {number} [o.lipschitz=1.6] safety factor for the narrow band
 * @param {boolean} [o.project=true] project vertices onto the surface
 * @param {(x:number,y:number,z:number)=>number} [o.label] region label per point (int ≥ 0)
 * @param {Record<string, Function|{f: Function, keep?: Function}>} [o.lines] iso-line fields (zero
 *        set); `keep(x, y, z)` optionally filters segments by their midpoint
 * @param {boolean} [o.full] also return the unsplit mesh when labels are used
 * @param {boolean|{steps?: number[], strength?: number}} [o.ao] per-vertex ambient occlusion
 *        sampled from the SDF along the normal (sockets and creases read as deep)
 * @param {boolean} [o.symmetricX] the SDF is mirror-symmetric about x = 0: sample, refine and
 *        occlude only the x ≥ 0 half on a midline-symmetric grid and mirror the rest exactly
 *        (≈ 2× faster; labels are still evaluated everywhere, so left/right can differ)
 * @param {boolean} [o.bvh] also build a ray-query BVH (bvh.js) for every output mesh (`.bvh`)
 * @returns {MeshResult}
 *
 * @typedef {{ positions: Float32Array, normals: Float32Array, indices: Uint32Array, ao?: Float32Array,
 *             bvh?: import('./bvh.js').BVH }} MeshArrays
 * @typedef {{ positions: Float32Array, normals: Float32Array }} Polyline
 * @typedef {{
 *   mesh?: MeshArrays,
 *   regions?: Array<MeshArrays & { label: number }>,
 *   seams?: Array<{ a: number, b: number, chains: Polyline[] }>,
 *   lines?: Record<string, Polyline[]>,
 *   stats: object,
 * }} MeshResult
 */
export function meshSDF(sdf, o = {}) {
  const t0 = now();
  const f = sdf.f;
  const h = o.cell ?? 0.2;
  const L = o.lipschitz ?? 1.6;
  const B = 2; // finest block size (cells)
  const bounds = o.bounds ?? sdf.b;
  if (!bounds.every(Number.isFinite)) throw new Error('meshSDF: bounds must be finite');

  // ---------------------------------------------------------------- grid
  // The grid is a whole number of coarse blocks (B0 cells) so the band can be
  // found top-down: coarse blocks far from the surface are skipped in one
  // evaluation, near ones split into 8 children, down to B-cell blocks.
  const pad = 2 * h;
  const ext = Math.max(bounds[3] - bounds[0], bounds[4] - bounds[1], bounds[5] - bounds[2]) + 2 * pad;
  let B0 = B;
  while (B0 < 16 && B0 * 4 * h < ext) B0 *= 2;
  const sym = !!o.symmetricX;
  const xMax = Math.max(Math.abs(bounds[0]), Math.abs(bounds[3])) + pad;
  // symmetric grids have an even number of coarse blocks along x and a grid point at x = 0
  const cx = sym
    ? Math.max(2, 2 * Math.ceil(xMax / (B0 * h)))
    : Math.max(1, Math.ceil((bounds[3] - bounds[0] + 2 * pad) / (B0 * h)));
  const ox = sym ? -(cx * B0 * h) / 2 : bounds[0] - pad, oy = bounds[1] - pad, oz = bounds[2] - pad;
  const cy = Math.max(1, Math.ceil((bounds[4] - bounds[1] + 2 * pad) / (B0 * h)));
  const cz = Math.max(1, Math.ceil((bounds[5] - bounds[2] + 2 * pad) / (B0 * h)));
  const nx = cx * B0 + 1, ny = cy * B0 + 1, nz = cz * B0 + 1;
  const NXY = nx * ny;
  const values = new Float32Array(nx * ny * nz);
  const done = new Uint8Array(nx * ny * nz);
  let evals = 0;

  // ---------------------------------------------------------------- narrow band (top-down)
  // blocks are identified by their min-corner GRID POINT index
  let level = B0;
  let list = new I32(cx * cy * cz + 16);
  const mid = (nx - 1) >> 1; // grid index of x = 0 when symmetric
  for (let bk = 0; bk < cz; bk++)
    for (let bj = 0; bj < cy; bj++)
      for (let bi = sym ? cx / 2 : 0; bi < cx; bi++) list.push(bi * B0 + nx * (bj * B0 + ny * bk * B0));
  const activeBlocks = new I32(4096);
  for (;;) {
    const half = 0.5 * level * h;
    const thr = half * Math.sqrt(3) * L + h;
    const next = level > B ? new I32(list.n * 2 + 16) : activeBlocks;
    const hl = level >> 1;
    for (let q = 0; q < list.n; q++) {
      const id = list.a[q];
      const i0 = id % nx, j0 = ((id / nx) | 0) % ny, k0 = (id / NXY) | 0;
      const d = f(ox + i0 * h + half, oy + j0 * h + half, oz + k0 * h + half);
      evals++;
      if (Math.abs(d) > thr) continue;
      if (level > B) {
        for (let c = 0; c < 8; c++) next.push(id + (c & 1) * hl + ((c >> 1) & 1) * hl * nx + ((c >> 2) & 1) * hl * NXY);
      } else {
        next.push(id);
      }
    }
    if (level === B) break;
    list = next;
    level = hl;
  }
  const tBand = now();

  const sampled = activeBlocks.n; // (symmetric: only the x ≥ 0 half so far)
  for (let q = 0; q < sampled; q++) {
    const id = activeBlocks.a[q];
    const i0 = id % nx, j0 = ((id / nx) | 0) % ny, k0 = (id / NXY) | 0;
    for (let k = 0; k <= B; k++) {
      const gk = k0 + k, z = oz + gk * h;
      for (let j = 0; j <= B; j++) {
        const gj = j0 + j, y = oy + gj * h;
        const row = nx * (gj + ny * gk);
        for (let i = 0; i <= B; i++) {
          const idx = row + i0 + i;
          if (done[idx]) continue;
          const val = f(ox + (i0 + i) * h, y, z);
          values[idx] = val;
          done[idx] = 1;
          evals++;
          if (sym) {
            const mi = row + (nx - 1 - (i0 + i));
            values[mi] = val;
            done[mi] = 1;
          }
        }
      }
    }
    if (sym) activeBlocks.push(id - i0 + (nx - 1 - i0 - B));
  }
  const tEval = now();

  // ---------------------------------------------------------------- surface cells → vertices
  const cnx = nx - 1, cny = ny - 1;
  const cellVert = new Int32Array(cnx * cny * (nz - 1)).fill(-1);
  const cellList = new I32(8192);
  const pos = new F32(8192 * 3);
  const v = new Float32Array(8);
  for (let q = 0; q < activeBlocks.n; q++) {
    const id = activeBlocks.a[q];
    const i0 = id % nx, j0 = ((id / nx) | 0) % ny, k0 = (id / NXY) | 0;
    for (let k = 0; k < B; k++) {
      const gk = k0 + k;
      for (let j = 0; j < B; j++) {
        const gj = j0 + j;
        for (let i = 0; i < B; i++) {
          const gi = i0 + i;
          const idx = gi + nx * (gj + ny * gk);
          v[0] = values[idx]; v[1] = values[idx + 1];
          v[2] = values[idx + nx]; v[3] = values[idx + nx + 1];
          v[4] = values[idx + NXY]; v[5] = values[idx + NXY + 1];
          v[6] = values[idx + NXY + nx]; v[7] = values[idx + NXY + nx + 1];
          let mask = 0;
          for (let c = 0; c < 8; c++) if (v[c] < 0) mask |= 1 << c;
          if (mask === 0 || mask === 255) continue;
          let sx = 0, sy = 0, sz = 0, cnt = 0;
          for (let e = 0; e < 24; e += 2) {
            const a = EDGES[e], b = EDGES[e + 1];
            const va = v[a], vb = v[b];
            if ((va < 0) === (vb < 0)) continue;
            const t = va / (va - vb);
            const ax = a & 1, ay = (a >> 1) & 1, az = (a >> 2) & 1;
            const bx = b & 1, by = (b >> 1) & 1, bz = (b >> 2) & 1;
            sx += ax + (bx - ax) * t; sy += ay + (by - ay) * t; sz += az + (bz - az) * t;
            cnt++;
          }
          const ci = gi + cnx * (gj + cny * gk);
          cellVert[ci] = pos.n / 3;
          cellList.push(ci);
          pos.push3(ox + (gi + sx / cnt) * h, oy + (gj + sy / cnt) * h, oz + (gk + sz / cnt) * h);
        }
      }
    }
  }
  const nVerts = pos.n / 3;

  // ---------------------------------------------------------------- quads
  const tri = new I32(nVerts * 6 + 16);
  const P = pos.a;
  const emitQuad = (a, b, c, d) => {
    // split along the shorter diagonal
    const acx = P[a * 3] - P[c * 3], acy = P[a * 3 + 1] - P[c * 3 + 1], acz = P[a * 3 + 2] - P[c * 3 + 2];
    const bdx = P[b * 3] - P[d * 3], bdy = P[b * 3 + 1] - P[d * 3 + 1], bdz = P[b * 3 + 2] - P[d * 3 + 2];
    if (acx * acx + acy * acy + acz * acz <= bdx * bdx + bdy * bdy + bdz * bdz) {
      tri.push(a); tri.push(b); tri.push(c);
      tri.push(a); tri.push(c); tri.push(d);
    } else {
      tri.push(a); tri.push(b); tri.push(d);
      tri.push(b); tri.push(c); tri.push(d);
    }
  };
  const cv = (i, j, k) => cellVert[i + cnx * (j + cny * k)];
  for (let q = 0; q < cellList.n; q++) {
    const ci = cellList.a[q];
    const i = ci % cnx, j = ((ci / cnx) | 0) % cny, k = (ci / (cnx * cny)) | 0;
    const idx = i + nx * (j + ny * k);
    const v0 = values[idx];
    const in0 = v0 < 0;
    // +x edge: shared by cells (i, j-1..j, k-1..k)
    if (j > 0 && k > 0 && in0 !== values[idx + 1] < 0) {
      const a = cv(i, j - 1, k - 1), b = cv(i, j, k - 1), c = cv(i, j, k), d = cv(i, j - 1, k);
      if (a >= 0 && b >= 0 && c >= 0 && d >= 0) in0 ? emitQuad(a, b, c, d) : emitQuad(d, c, b, a);
    }
    // +y edge: cells (i-1..i, j, k-1..k)
    if (i > 0 && k > 0 && in0 !== values[idx + nx] < 0) {
      const a = cv(i - 1, j, k - 1), b = cv(i - 1, j, k), c = cv(i, j, k), d = cv(i, j, k - 1);
      if (a >= 0 && b >= 0 && c >= 0 && d >= 0) in0 ? emitQuad(a, b, c, d) : emitQuad(d, c, b, a);
    }
    // +z edge: cells (i-1..i, j-1..j, k)
    if (i > 0 && j > 0 && in0 !== values[idx + NXY] < 0) {
      const a = cv(i - 1, j - 1, k), b = cv(i, j - 1, k), c = cv(i, j, k), d = cv(i - 1, j, k);
      if (a >= 0 && b >= 0 && c >= 0 && d >= 0) in0 ? emitQuad(a, b, c, d) : emitQuad(d, c, b, a);
    }
  }
  const tQuads = now();

  // ---------------------------------------------------------------- refine: project + gradient normals
  const positions = new Float32Array(nVerts * 3);
  positions.set(P.subarray(0, nVerts * 3));
  const normals = new Float32Array(nVerts * 3);
  const e = h * 0.25;
  const maxMove = h * 0.6;
  const project = o.project !== false;
  // symmetric: vertices of cells left of the midline copy their mirror cell's vertex
  const mirrorOf = sym ? new Int32Array(nVerts).fill(-1) : null;
  if (sym) {
    for (let vi = 0; vi < nVerts; vi++) {
      const ci = cellList.a[vi];
      const gi = ci % cnx;
      if (gi >= mid) continue;
      const mci = ci - gi + (cnx - 1 - gi);
      mirrorOf[vi] = cellVert[mci];
    }
  }
  for (let vi = 0; vi < nVerts; vi++) {
    if (sym && mirrorOf[vi] >= 0) continue;
    const x = positions[vi * 3], y = positions[vi * 3 + 1], z = positions[vi * 3 + 2];
    const d0 = f(x + e, y - e, z - e), d1 = f(x - e, y - e, z + e);
    const d2 = f(x - e, y + e, z - e), d3 = f(x + e, y + e, z + e);
    evals += 4;
    const gx = d0 - d1 - d2 + d3, gy = -d0 - d1 + d2 + d3, gz = -d0 + d1 - d2 + d3;
    const gl = Math.sqrt(gx * gx + gy * gy + gz * gz);
    if (gl < 1e-12) { normals[vi * 3 + 1] = 1; continue; }
    const nxv = gx / gl, nyv = gy / gl, nzv = gz / gl;
    normals[vi * 3] = nxv; normals[vi * 3 + 1] = nyv; normals[vi * 3 + 2] = nzv;
    if (project) {
      // mean of the 4 taps ≈ value at the vertex; gradient magnitude = gl / (4e)
      const dm = (d0 + d1 + d2 + d3) * 0.25;
      let step = dm / (gl / (4 * e));
      if (step > maxMove) step = maxMove; else if (step < -maxMove) step = -maxMove;
      positions[vi * 3] = x - nxv * step;
      positions[vi * 3 + 1] = y - nyv * step;
      positions[vi * 3 + 2] = z - nzv * step;
    }
  }
  if (sym) {
    for (let vi = 0; vi < nVerts; vi++) {
      const m = mirrorOf[vi];
      if (m < 0) continue;
      positions[vi * 3] = -positions[m * 3];
      positions[vi * 3 + 1] = positions[m * 3 + 1];
      positions[vi * 3 + 2] = positions[m * 3 + 2];
      normals[vi * 3] = -normals[m * 3];
      normals[vi * 3 + 1] = normals[m * 3 + 1];
      normals[vi * 3 + 2] = normals[m * 3 + 2];
    }
  }
  const indices = new Uint32Array(tri.a.buffer.slice(0, tri.n * 4));
  const tRefine = now();

  const full = { positions, normals, indices };
  if (o.ao) {
    const steps = o.ao.steps ?? [0.2, 0.55, 1.1, 2.0, 3.2];
    const strength = o.ao.strength ?? 1.15;
    const ao = new Float32Array(nVerts);
    let wsum = 0;
    for (let i = 0, w = 1; i < steps.length; i++, w *= 0.82) wsum += w;
    for (let vi = 0; vi < nVerts; vi++) {
      if (sym && mirrorOf[vi] >= 0) continue;
      const x = positions[vi * 3], y = positions[vi * 3 + 1], z = positions[vi * 3 + 2];
      const nx = normals[vi * 3], ny = normals[vi * 3 + 1], nz = normals[vi * 3 + 2];
      let occ = 0;
      for (let i = 0, w = 1; i < steps.length; i++, w *= 0.82) {
        const hh = steps[i];
        const d = f(x + nx * hh, y + ny * hh, z + nz * hh);
        if (d < hh) occ += (w * (hh - Math.max(d, 0))) / hh;
      }
      evals += steps.length;
      const v = 1 - (strength * occ) / wsum;
      ao[vi] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
    if (sym) for (let vi = 0; vi < nVerts; vi++) if (mirrorOf[vi] >= 0) ao[vi] = ao[mirrorOf[vi]];
    full.ao = ao;
  }
  const tAO = now();

  const out = { stats: {} };

  // ---------------------------------------------------------------- iso-lines on the unsplit mesh
  if (o.lines) {
    out.lines = {};
    for (const [name, field] of Object.entries(o.lines)) {
      out.lines[name] = typeof field === 'function' ? isoLines(full, field) : isoLines(full, field.f, field.keep);
    }
  }

  // ---------------------------------------------------------------- region split
  if (o.label) {
    const split = splitRegions(full, o.label, o.labelSteps ?? 8);
    out.regions = split.regions;
    out.seams = split.seams;
    if (o.full) out.mesh = full;
  } else {
    out.mesh = full;
  }
  const tSplit = now();

  // ---------------------------------------------------------------- ray index (per output mesh)
  if (o.bvh) {
    for (const r of out.regions ?? []) r.bvh = buildBVH(r.positions, r.indices);
    if (out.mesh) out.mesh.bvh = buildBVH(out.mesh.positions, out.mesh.indices);
  }

  const tEnd = now();
  out.stats = {
    grid: [nx, ny, nz],
    cell: h,
    activeBlocks: activeBlocks.n,
    coarseBlock: B0,
    symmetricX: sym,
    evals,
    vertices: nVerts,
    triangles: tri.n / 3,
    ms: {
      band: +(tBand - t0).toFixed(1),
      sample: +(tEval - tBand).toFixed(1),
      nets: +(tQuads - tEval).toFixed(1),
      refine: +(tRefine - tQuads).toFixed(1),
      ao: +(tAO - tRefine).toFixed(1),
      post: +(tSplit - tAO).toFixed(1),
      bvh: +(tEnd - tSplit).toFixed(1),
      total: +(tEnd - t0).toFixed(1),
    },
  };
  return out;
}

/**
 * Cut a mesh into labelled regions with clean shared seams.
 * @returns {{ regions: Array<MeshArrays & { label: number }>, seams: Array<{a:number,b:number,chains:Polyline[]}> }}
 */
export function splitRegions(mesh, label, steps = 8) {
  const { positions: Pp, normals: Nn, indices: I } = mesh;
  const AO = mesh.ao ?? null;
  const nV = Pp.length / 3;
  const lab = new Int32Array(nV);
  for (let i = 0; i < nV; i++) lab[i] = label(Pp[i * 3], Pp[i * 3 + 1], Pp[i * 3 + 2]);

  // extra points (cuts and triangle centres) appended after the vertices
  const xp = new F32(4096 * 3);
  const xn = new F32(4096 * 3);
  const xa = []; // ambient occlusion of extra points
  const cutCache = new Map();
  const cut = (a, b) => {
    const lo = a < b ? a : b, hi = a < b ? b : a;
    const key = lo * nV + hi;
    const hit = cutCache.get(key);
    if (hit !== undefined) return hit;
    // bisection from lo (label la) towards hi
    const la = lab[lo];
    const ax = Pp[lo * 3], ay = Pp[lo * 3 + 1], az = Pp[lo * 3 + 2];
    const bx = Pp[hi * 3], by = Pp[hi * 3 + 1], bz = Pp[hi * 3 + 2];
    let t0 = 0, t1 = 1;
    for (let s = 0; s < steps; s++) {
      const tm = (t0 + t1) * 0.5;
      if (label(ax + (bx - ax) * tm, ay + (by - ay) * tm, az + (bz - az) * tm) === la) t0 = tm; else t1 = tm;
    }
    const t = (t0 + t1) * 0.5;
    const id = nV + xp.n / 3;
    xp.push3(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t);
    let nx = Nn[lo * 3] + (Nn[hi * 3] - Nn[lo * 3]) * t;
    let ny = Nn[lo * 3 + 1] + (Nn[hi * 3 + 1] - Nn[lo * 3 + 1]) * t;
    let nz = Nn[lo * 3 + 2] + (Nn[hi * 3 + 2] - Nn[lo * 3 + 2]) * t;
    const l = Math.hypot(nx, ny, nz) || 1;
    xn.push3(nx / l, ny / l, nz / l);
    if (AO) xa.push(AO[lo] + (AO[hi] - AO[lo]) * t);
    cutCache.set(key, id);
    return id;
  };
  const centre = (a, b, c) => {
    const id = nV + xp.n / 3;
    xp.push3((Pp[a * 3] + Pp[b * 3] + Pp[c * 3]) / 3, (Pp[a * 3 + 1] + Pp[b * 3 + 1] + Pp[c * 3 + 1]) / 3, (Pp[a * 3 + 2] + Pp[b * 3 + 2] + Pp[c * 3 + 2]) / 3);
    const nx = Nn[a * 3] + Nn[b * 3] + Nn[c * 3], ny = Nn[a * 3 + 1] + Nn[b * 3 + 1] + Nn[c * 3 + 1], nz = Nn[a * 3 + 2] + Nn[b * 3 + 2] + Nn[c * 3 + 2];
    const l = Math.hypot(nx, ny, nz) || 1;
    xn.push3(nx / l, ny / l, nz / l);
    if (AO) xa.push((AO[a] + AO[b] + AO[c]) / 3);
    return id;
  };

  const tris = new Map(); // label → I32 of point ids
  const add = (r, a, b, c) => {
    let list = tris.get(r);
    if (!list) tris.set(r, (list = new I32(4096)));
    list.push(a); list.push(b); list.push(c);
  };
  const seamSegs = new Map(); // pairKey → I32 of point id pairs
  const addSeam = (la, lb, p, q) => {
    const a = la < lb ? la : lb, b = la < lb ? lb : la;
    const key = a * 65536 + b;
    let list = seamSegs.get(key);
    if (!list) seamSegs.set(key, (list = new I32(1024)));
    list.push(p); list.push(q);
  };

  for (let t = 0; t < I.length; t += 3) {
    const v0 = I[t], v1 = I[t + 1], v2 = I[t + 2];
    const l0 = lab[v0], l1 = lab[v1], l2 = lab[v2];
    if (l0 === l1 && l1 === l2) { add(l0, v0, v1, v2); continue; }
    if (l0 !== l1 && l1 !== l2 && l0 !== l2) {
      const c01 = cut(v0, v1), c12 = cut(v1, v2), c20 = cut(v2, v0), m = centre(v0, v1, v2);
      add(l0, v0, c01, m); add(l0, v0, m, c20);
      add(l1, v1, c12, m); add(l1, v1, m, c01);
      add(l2, v2, c20, m); add(l2, v2, m, c12);
      addSeam(l0, l1, c01, m); addSeam(l1, l2, c12, m); addSeam(l2, l0, c20, m);
      continue;
    }
    // exactly two labels: rotate so `a` is the lone vertex
    let a, b, c;
    if (l1 === l2) { a = v0; b = v1; c = v2; } else if (l0 === l2) { a = v1; b = v2; c = v0; } else { a = v2; b = v0; c = v1; }
    const cab = cut(a, b), cac = cut(a, c);
    const la = lab[a], lb = lab[b];
    add(la, a, cab, cac);
    add(lb, cab, b, c);
    add(lb, cab, c, cac);
    addSeam(la, lb, cab, cac);
  }

  const XP = xp.a, XN = xn.a;
  const px = (id, k) => (id < nV ? Pp[id * 3 + k] : XP[(id - nV) * 3 + k]);
  const nn = (id, k) => (id < nV ? Nn[id * 3 + k] : XN[(id - nV) * 3 + k]);

  const regions = [];
  for (const [r, list] of [...tris.entries()].sort((x, y) => x[0] - y[0])) {
    const remap = new Map();
    const ids = list.a.subarray(0, list.n);
    const idx = new Uint32Array(list.n);
    let count = 0;
    for (let i = 0; i < ids.length; i++) {
      let m = remap.get(ids[i]);
      if (m === undefined) { m = count++; remap.set(ids[i], m); }
      idx[i] = m;
    }
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const ao = AO ? new Float32Array(count) : null;
    for (const [id, m] of remap) {
      for (let k = 0; k < 3; k++) {
        positions[m * 3 + k] = px(id, k);
        normals[m * 3 + k] = nn(id, k);
      }
      if (ao) ao[m] = id < nV ? AO[id] : xa[id - nV];
    }
    const reg = { label: r, positions, normals, indices: idx };
    if (ao) reg.ao = ao;
    regions.push(reg);
  }

  const seams = [];
  for (const [key, list] of seamSegs) {
    const a = Math.floor(key / 65536), b = key % 65536;
    const chains = chainSegments(list.a.subarray(0, list.n)).map((ids) => toPolyline(ids, px, nn));
    seams.push({ a, b, chains });
  }
  return { regions, seams };
}

/**
 * Zero iso-lines of a scalar field over a triangle mesh (marching triangles).
 * @returns {Polyline[]}
 */
export function isoLines(mesh, field, keep = null) {
  const { positions: Pp, normals: Nn, indices: I } = mesh;
  const nV = Pp.length / 3;
  const val = new Float32Array(nV);
  for (let i = 0; i < nV; i++) {
    const v = field(Pp[i * 3], Pp[i * 3 + 1], Pp[i * 3 + 2]);
    val[i] = v === 0 ? 1e-7 : v;
  }
  const xp = new F32(2048 * 3), xn = new F32(2048 * 3);
  const cache = new Map();
  const cross = (a, b) => {
    const lo = a < b ? a : b, hi = a < b ? b : a;
    const key = lo * nV + hi;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const t = val[lo] / (val[lo] - val[hi]);
    const id = xp.n / 3;
    xp.push3(Pp[lo * 3] + (Pp[hi * 3] - Pp[lo * 3]) * t, Pp[lo * 3 + 1] + (Pp[hi * 3 + 1] - Pp[lo * 3 + 1]) * t, Pp[lo * 3 + 2] + (Pp[hi * 3 + 2] - Pp[lo * 3 + 2]) * t);
    const nx = Nn[lo * 3] + (Nn[hi * 3] - Nn[lo * 3]) * t, ny = Nn[lo * 3 + 1] + (Nn[hi * 3 + 1] - Nn[lo * 3 + 1]) * t, nz = Nn[lo * 3 + 2] + (Nn[hi * 3 + 2] - Nn[lo * 3 + 2]) * t;
    const l = Math.hypot(nx, ny, nz) || 1;
    xn.push3(nx / l, ny / l, nz / l);
    cache.set(key, id);
    return id;
  };
  const segs = new I32(4096);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    const sa = val[a] < 0, sb = val[b] < 0, sc = val[c] < 0;
    if (sa === sb && sb === sc) continue;
    const pts = [];
    if (sa !== sb) pts.push(cross(a, b));
    if (sb !== sc) pts.push(cross(b, c));
    if (sc !== sa) pts.push(cross(c, a));
    if (pts.length !== 2) continue;
    if (keep) {
      const A = pts[0] * 3, Bq = pts[1] * 3, X = xp.a;
      if (!keep((X[A] + X[Bq]) / 2, (X[A + 1] + X[Bq + 1]) / 2, (X[A + 2] + X[Bq + 2]) / 2)) continue;
    }
    segs.push(pts[0]); segs.push(pts[1]);
  }
  const XP = xp.a, XN = xn.a;
  return chainSegments(segs.a.subarray(0, segs.n)).map((ids) =>
    toPolyline(ids, (id, k) => XP[id * 3 + k], (id, k) => XN[id * 3 + k])
  );
}

/** Link segments (pairs of point ids) into maximal chains of point ids. */
export function chainSegments(pairs) {
  const n = pairs.length / 2;
  const adj = new Map();
  const link = (p, s) => {
    const l = adj.get(p);
    if (l) l.push(s); else adj.set(p, [s]);
  };
  for (let s = 0; s < n; s++) { link(pairs[s * 2], s); link(pairs[s * 2 + 1], s); }
  const used = new Uint8Array(n);
  const chains = [];
  const walk = (start, from) => {
    const out = [];
    let p = start;
    for (;;) {
      const l = adj.get(p);
      let next = -1;
      if (l) for (const s of l) if (!used[s]) { next = s; break; }
      if (next < 0) break;
      used[next] = 1;
      p = pairs[next * 2] === p ? pairs[next * 2 + 1] : pairs[next * 2];
      out.push(p);
      if (p === from) break;
    }
    return out;
  };
  for (let s = 0; s < n; s++) {
    if (used[s]) continue;
    used[s] = 1;
    const a = pairs[s * 2], b = pairs[s * 2 + 1];
    const fwd = walk(b, a);
    const back = fwd[fwd.length - 1] === a ? [] : walk(a, b);
    chains.push([...back.reverse(), a, b, ...fwd]);
  }
  return chains;
}

function toPolyline(ids, px, nn) {
  const positions = new Float32Array(ids.length * 3);
  const normals = new Float32Array(ids.length * 3);
  for (let i = 0; i < ids.length; i++) {
    for (let k = 0; k < 3; k++) {
      positions[i * 3 + k] = px(ids[i], k);
      normals[i * 3 + k] = nn(ids[i], k);
    }
  }
  return { positions, normals };
}

/** Collect the ArrayBuffers of a MeshResult for postMessage transfer. */
export function transferables(res) {
  const out = new Set();
  const visit = (v) => {
    if (!v) return;
    if (ArrayBuffer.isView(v)) out.add(v.buffer);
    else if (Array.isArray(v)) v.forEach(visit);
    else if (typeof v === 'object') Object.values(v).forEach(visit);
  };
  visit(res.mesh); visit(res.regions); visit(res.seams); visit(res.lines);
  return [...out];
}
