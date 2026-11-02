// Book geometry: leaf grids, board slabs, page blocks and the spine strip.
//
// Why preallocated, in-place geometry: the book animates every frame while a
// page turns, so every buffer here is sized once and rewritten in place — no
// per-frame allocations, no GPU buffer re-creation. Leaf/board UVs follow one
// convention everywhere: u = 0 at the spine, v = 1 at the head (−Z), so the
// materials and Book.pick() agree on what a page coordinate means.
import * as THREE from 'three/webgpu';
import { restProfile, gutterS0 } from './pageCurl.js';

/**
 * Dynamic leaf grid matching a CurlGrid (cols along s, rows along z).
 * Front face (CCW) faces +Y when flat. Fixed, generous bounding sphere: a
 * leaf can never reach further than its diagonal from the spine. (The box
 * starts as generous; Book.update tightens it on every rewrite, for picking.)
 * @param {import('./pageCurl.js').CurlGrid} grid
 */
export function leafGridGeometry(grid) {
  const { cols, rows, W, H } = grid;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(cols * rows * 3);
  const nrm = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      uvs[k * 2] = grid.u(i);
      uvs[k * 2 + 1] = 1 - j / (rows - 1);
      nrm[k * 3 + 1] = 1;
    }
  }
  const idx = new Uint16Array((cols - 1) * (rows - 1) * 6);
  let n = 0;
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      idx[n++] = a; idx[n++] = c; idx[n++] = b;
      idx[n++] = b; idx[n++] = c; idx[n++] = d;
    }
  }
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  const r = Math.hypot(W, H / 2) + 0.05;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.05, 0), r);
  geo.boundingBox = new THREE.Box3(new THREE.Vector3(-r, -r, -H / 2 - 0.01), new THREE.Vector3(r, r, H / 2 + 0.01));
  return geo;
}

/**
 * Board slab in its hinge frame: x ∈ [0, W] (spine edge at 0), y ∈ [−T/2, T/2],
 * z ∈ [−H/2, H/2]. Groups: 0 = top face, 1 = bottom face, 2 = edge band.
 * Faces default to a single quad so their borders share vertices with the
 * band (no T-junction cracks).
 * The edge band carries blended normals so the cloth-wrapped edges read as
 * softly rounded without extra geometry. Band UVs are in world units.
 */
export function boardSlabGeometry(W, H, T, seg = 1) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const index = [];
  const groups = [];
  let vbase = 0;
  const pushV = (x, y, z, nx, ny, nz, u, v) => {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
    uvs.push(u, v);
  };
  const face = (y, ny) => {
    const start = index.length;
    const cols = seg + 1;
    const rows = seg + 1;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const u = i / seg;
        const vv = j / seg;
        pushV(u * W, y, -H / 2 + vv * H, 0, ny, 0, u, 1 - vv);
      }
    }
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const a = vbase + j * cols + i;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        if (ny > 0) index.push(a, c, b, b, c, d);
        else index.push(a, b, c, b, d, c);
      }
    }
    vbase += cols * rows;
    groups.push([start, index.length - start]);
  };
  face(T / 2, 1);
  face(-T / 2, -1);
  // edge band: four sides, three rows (top, middle, bottom) with blended normals
  const start = index.length;
  const sides = [
    // [x0, z0, x1, z1, outward nx, nz]
    [0, H / 2, 0, -H / 2, -1, 0], // spine
    [W, -H / 2, W, H / 2, 1, 0], // fore-edge
    [0, -H / 2, W, -H / 2, 0, -1], // head
    [W, H / 2, 0, H / 2, 0, 1], // tail
  ];
  let perim = 0;
  const round = 0.75; // how strongly the edge normals lean towards the faces
  for (const [x0, z0, x1, z1, ox, oz] of sides) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const rowsY = [T / 2, 0, -T / 2];
    const rowN = [
      [ox, round, oz],
      [ox, 0, oz],
      [ox, -round, oz],
    ];
    for (let r = 0; r < 3; r++) {
      const [nx, ny, nz] = rowN[r];
      const l = Math.hypot(nx, ny, nz);
      pushV(x0, rowsY[r], z0, nx / l, ny / l, nz / l, perim, rowsY[r] + T / 2);
      pushV(x1, rowsY[r], z1, nx / l, ny / l, nz / l, perim + len, rowsY[r] + T / 2);
    }
    for (let r = 0; r < 2; r++) {
      const a = vbase + r * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      // orient so the face normal matches the outward direction
      const p = (k) => [positions[k * 3], positions[k * 3 + 1], positions[k * 3 + 2]];
      const pa = p(a), pb = p(b), pc = p(c);
      const e1 = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]];
      const e2 = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]];
      const fn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      if (fn[0] * ox + fn[2] * oz > 0) index.push(a, b, c, b, d, c);
      else index.push(a, c, b, b, c, d);
    }
    vbase += 6;
    perim += len;
  }
  groups.push([start, index.length - start]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  groups.forEach(([s, c], i) => geo.addGroup(s, c, i));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

/**
 * One page block (the leaves resting under a side's top leaf): fore-edge,
 * head, tail and spine-side faces between the board (`base`) and the top
 * leaf's rest profile. uv.y counts leaves (1 unit = one leaf) for the
 * striation shader; the buffers are preallocated and rewritten in place.
 */
export class PageBlock {
  /**
   * @param {number} side  +1 right block, −1 left block
   * @param {number} W     leaf width
   * @param {number} H     leaf height
   * @param {number} [n]   profile segments
   */
  constructor(side, W, H, n = 48) {
    this.side = side;
    this.W = W;
    this.H = H;
    this.n = n;
    this.profile = new Float64Array((n + 1) * 2);
    // vertices: fore-edge 4 + spine face 4 + head (n+1)*2 + tail (n+1)*2
    this.vCount = 8 + (n + 1) * 4;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.vCount * 3);
    this.nrm = new Float32Array(this.vCount * 3);
    this.uv = new Float32Array(this.vCount * 2);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('normal', new THREE.BufferAttribute(this.nrm, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(new THREE.BufferAttribute(this._indices(), 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(side * W * 0.5, 0.05, 0), Math.hypot(W / 2, H / 2) + 0.1);
    this.geometry = geo;
    this._last = new Float64Array([NaN, NaN, NaN, NaN]); // last (base, anchor, rise, leaves)
  }

  _indices() {
    const n = this.n;
    const idx = [];
    const s = this.side;
    // vertex layout
    const FE = 0; // fore-edge: 0 bottom-head, 1 bottom-tail, 2 top-tail, 3 top-head
    const SP = 4; // spine face: same order
    const HD = 8; // head: pairs (bottom_i, top_i)
    const TL = 8 + (n + 1) * 2; // tail
    const quad = (a, b, c, d, flip) => (flip ? idx.push(a, c, b, a, d, c) : idx.push(a, b, c, a, c, d));
    // Orientation chosen so faces point outwards for the right block (s=+1);
    // the left block is mirrored in x, which flips winding.
    const m = s < 0;
    quad(FE, FE + 1, FE + 2, FE + 3, !m);
    quad(SP, SP + 1, SP + 2, SP + 3, m);
    for (let i = 0; i < n; i++) {
      const a = HD + i * 2; // bottom i
      const b = HD + (i + 1) * 2; // bottom i+1
      quad(a, b, b + 1, a + 1, !m);
      const c = TL + i * 2;
      const d = TL + (i + 1) * 2;
      quad(c, d, d + 1, c + 1, m);
    }
    return new Uint16Array(idx);
  }

  /**
   * Rebuild for a stack whose top surface is at `top` (book-local y), whose
   * top profile rises from `anchor` by `rise`, sitting on `base`.
   * @param {number} base     board top height
   * @param {number} anchor   spine anchor height of the top profile
   * @param {number} rise     gutter rise of the top profile
   * @param {number} leaves   block thickness in leaves (for striations)
   * @returns {boolean} whether the geometry changed
   */
  update(base, anchor, rise, leaves) {
    const k = this._last;
    if (Math.abs(k[0] - base) < 1e-6 && Math.abs(k[1] - anchor) < 1e-6 && Math.abs(k[2] - rise) < 1e-6 && Math.abs(k[3] - leaves) < 1e-4) return false;
    k[0] = base;
    k[1] = anchor;
    k[2] = rise;
    k[3] = leaves;
    const { n, W, H, side, pos, nrm, uv, profile } = this;
    restProfile(profile, n, W, anchor, rise, side);
    const z0 = -H / 2;
    const z1 = H / 2;
    const lo = base;
    const set = (vi, x, y, z, nx, ny, nz, u, v) => {
      pos[vi * 3] = x; pos[vi * 3 + 1] = y; pos[vi * 3 + 2] = z;
      nrm[vi * 3] = nx; nrm[vi * 3 + 1] = ny; nrm[vi * 3 + 2] = nz;
      uv[vi * 2] = u; uv[vi * 2 + 1] = v;
    };
    const top = (y) => ((y - lo) / Math.max(anchor + rise - lo, 1e-6)) * leaves;
    // fore-edge: bottom at the full width (flat bottom leaf), top at the top leaf's (pulled-in) edge
    const xb = side * W;
    const xt = profile[n * 2];
    const yt = profile[n * 2 + 1];
    const dx = xt - xb;
    const dy = yt - lo;
    const l = Math.hypot(dx, dy) || 1;
    const fnx = (side * dy) / l;
    const fny = (-side * dx) / l;
    set(0, xb, lo, z0, fnx, fny, 0, 0, 0);
    set(1, xb, lo, z1, fnx, fny, 0, 1, 0);
    set(2, xt, yt, z1, fnx, fny, 0, 1, leaves);
    set(3, xt, yt, z0, fnx, fny, 0, 0, leaves);
    // spine-side face (only has height when the boards press the block flat)
    const ya = profile[1];
    set(4, 0, lo, z0, -side, 0, 0, 0, 0);
    set(5, 0, lo, z1, -side, 0, 0, 1, 0);
    set(6, 0, ya, z1, -side, 0, 0, 1, top(ya));
    set(7, 0, ya, z0, -side, 0, 0, 0, top(ya));
    // head & tail: bottom points flat at arc length s_i, top points on the profile
    for (let i = 0; i <= n; i++) {
      const xs = (side * W * i) / n;
      const xp = profile[i * 2];
      const yp = profile[i * 2 + 1];
      const u = i / n;
      const hv = 8 + i * 2;
      set(hv, xs, lo, z0, 0, 0, -1, u, 0);
      set(hv + 1, xp, yp, z0, 0, 0, -1, u, top(yp));
      const tv = 8 + (n + 1) * 2 + i * 2;
      set(tv, xs, lo, z1, 0, 0, 1, u, 0);
      set(tv + 1, xp, yp, z1, 0, 0, 1, u, top(yp));
    }
    const g = this.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    g.attributes.uv.needsUpdate = true;
    return true;
  }
}

/** Gutter decay used by blocks (re-exported for callers that need the same profile). */
export { gutterS0 };

/**
 * Cloth strip joining the two boards' spine edges (a cubic Bézier in XY,
 * extruded along Z). Rounded like a real spine when the book is closed;
 * collapses under the gutter when it lies open.
 */
export class SpineStrip {
  constructor(H, seg = 18) {
    this.H = H;
    this.seg = seg;
    const cnt = (seg + 1) * 2;
    this.pos = new Float32Array(cnt * 3);
    this.nrm = new Float32Array(cnt * 3);
    this.uv = new Float32Array(cnt * 2);
    const idx = [];
    for (let i = 0; i < seg; i++) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('normal', new THREE.BufferAttribute(this.nrm, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.05, 0), H / 2 + 0.2);
    this.geometry = geo;
  }

  /**
   * @param {number} ax,ay  front board spine edge (outer surface)
   * @param {number} tfx,tfy front board direction towards its fore-edge
   * @param {number} bx,by  back board spine edge (outer surface)
   * @param {number} tbx,tby back board direction towards its fore-edge
   * @returns {number} chord length (0 when the book lies open)
   */
  update(ax, ay, tfx, tfy, bx, by, tbx, tby) {
    const chord = Math.hypot(bx - ax, by - ay);
    const k = chord * 0.38;
    const p1x = ax - tfx * k, p1y = ay - tfy * k;
    const p2x = bx - tbx * k, p2y = by - tby * k;
    const { seg, pos, nrm, uv, H } = this;
    let arc = 0;
    let px = ax, py = ay;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const mt = 1 - t;
      const x = mt * mt * mt * ax + 3 * mt * mt * t * p1x + 3 * mt * t * t * p2x + t * t * t * bx;
      const y = mt * mt * mt * ay + 3 * mt * mt * t * p1y + 3 * mt * t * t * p2y + t * t * t * by;
      // derivative
      let dx = 3 * mt * mt * (p1x - ax) + 6 * mt * t * (p2x - p1x) + 3 * t * t * (bx - p2x);
      let dy = 3 * mt * mt * (p1y - ay) + 6 * mt * t * (p2y - p1y) + 3 * t * t * (by - p2y);
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl;
      dy /= dl;
      arc += Math.hypot(x - px, y - py);
      px = x;
      py = y;
      for (let r = 0; r < 2; r++) {
        const vi = i * 2 + r;
        pos[vi * 3] = x;
        pos[vi * 3 + 1] = y;
        pos[vi * 3 + 2] = r === 0 ? -H / 2 : H / 2;
        nrm[vi * 3] = dy;
        nrm[vi * 3 + 1] = -dx;
        nrm[vi * 3 + 2] = 0;
        uv[vi * 2] = arc;
        uv[vi * 2 + 1] = r * H;
      }
    }
    const g = this.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    g.attributes.uv.needsUpdate = true;
    return chord;
  }
}
