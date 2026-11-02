// Bounding-volume hierarchy over an indexed triangle mesh. Built in the
// mesher worker next to the mesh it indexes, so the main thread can answer a
// ray query (label occlusion) by visiting a few dozen boxes and triangles
// instead of testing every triangle of a 300k-triangle skull (three's
// Mesh.raycast is brute force: 3–10 ms per ray on the Calaveras plates).
//
// Why this layout: three flat typed arrays (transferable, no objects), and an
// indirection list (`tris`) instead of reordering the index buffer — the
// mesh arrays are shared by every figure that reuses a cached mesh.
//
//   box   Float32Array(6·n)  node bounds: minX minY minZ maxX maxY maxZ
//   node  Uint32Array(2·n)   inner node: [left child, 0] (right = left + 1)
//                            leaf:       [first, count] into `tris` (count ≥ 1)
//   tris  Uint32Array(m)     triangle ids (triangle t = indices[3t … 3t+2])
//
// Built top-down, two light passes per level: a node's triangles are
// partitioned by centroid at the middle of the node's box along its longest
// side (or of the centroids' own extent when that leaves a side empty), then
// each child's box is gathered. Surface-net triangles are small and even, so
// this simple rule makes a well-balanced tree. Pure JS, no three.js: it runs
// in the worker; the ray query lives in index.js (MeshOccluder).

/**
 * @typedef {{ box: Float32Array, node: Uint32Array, tris: Uint32Array }} BVH
 */

/**
 * Build a BVH over an indexed triangle mesh.
 * @param {Float32Array} positions  xyz per vertex
 * @param {Uint32Array} indices     3 per triangle
 * @param {number} [leafSize=16]    most triangles per leaf (on the skulls 16 answers rays as fast
 *                                   as 4–8 and needs about two-thirds of the memory of 8)
 * @returns {BVH}
 */
export function buildBVH(positions, indices, leafSize = 16) {
  const P = positions;
  const m = (indices.length / 3) | 0;
  const tris = new Uint32Array(m);
  // per-triangle bounds and centroid (the centre of those bounds)
  const tb = new Float32Array(m * 6);
  const tc = new Float32Array(m * 3);
  let r0 = Infinity, r1 = Infinity, r2 = Infinity, r3 = -Infinity, r4 = -Infinity, r5 = -Infinity;
  for (let t = 0; t < m; t++) {
    tris[t] = t;
    const a = indices[t * 3] * 3, b = indices[t * 3 + 1] * 3, c = indices[t * 3 + 2] * 3;
    for (let k = 0; k < 3; k++) {
      const x = P[a + k], y = P[b + k], z = P[c + k];
      const lo = x < y ? (x < z ? x : z) : y < z ? y : z;
      const hi = x > y ? (x > z ? x : z) : y > z ? y : z;
      tb[t * 6 + k] = lo;
      tb[t * 6 + 3 + k] = hi;
      tc[t * 3 + k] = (lo + hi) * 0.5;
    }
    const o = t * 6;
    if (tb[o] < r0) r0 = tb[o];
    if (tb[o + 1] < r1) r1 = tb[o + 1];
    if (tb[o + 2] < r2) r2 = tb[o + 2];
    if (tb[o + 3] > r3) r3 = tb[o + 3];
    if (tb[o + 4] > r4) r4 = tb[o + 4];
    if (tb[o + 5] > r5) r5 = tb[o + 5];
  }

  let cap = Math.max(16, ((m / leafSize) | 0) * 4);
  let box = new Float32Array(cap * 6);
  let node = new Uint32Array(cap * 2);
  const grow = () => {
    cap = Math.ceil(cap * 1.5);
    const b2 = new Float32Array(cap * 6);
    b2.set(box);
    box = b2;
    const n2 = new Uint32Array(cap * 2);
    n2.set(node);
    node = n2;
  };
  if (m) box.set([r0, r1, r2, r3, r4, r5], 0);

  // pending nodes: (id, start, end)
  let stack = new Int32Array(3 * 64);
  let sp = 0;
  const push = (id, s, e) => {
    if (sp + 3 > stack.length) {
      const s2 = new Int32Array(stack.length * 2);
      s2.set(stack);
      stack = s2;
    }
    stack[sp++] = id;
    stack[sp++] = s;
    stack[sp++] = e;
  };
  let n = 1;
  if (m) push(0, 0, m);
  while (sp > 0) {
    const end = stack[--sp], start = stack[--sp], id = stack[--sp];
    const count = end - start;
    if (count <= leafSize) {
      node[id * 2] = start;
      node[id * 2 + 1] = count;
      continue;
    }
    const b = id * 6;
    let axis = longest(box[b + 3] - box[b], box[b + 4] - box[b + 1], box[b + 5] - box[b + 2]);
    let split = (box[b + axis] + box[b + 3 + axis]) * 0.5;
    let i = partition(tris, tc, start, end, axis, split);
    if (i === start || i === end) {
      // a lopsided box (a few long triangles): split the centroids' own extent
      let c0 = Infinity, c1 = Infinity, c2 = Infinity, c3 = -Infinity, c4 = -Infinity, c5 = -Infinity;
      for (let k = start; k < end; k++) {
        const o = tris[k] * 3;
        const x = tc[o], y = tc[o + 1], z = tc[o + 2];
        if (x < c0) c0 = x;
        if (y < c1) c1 = y;
        if (z < c2) c2 = z;
        if (x > c3) c3 = x;
        if (y > c4) c4 = y;
        if (z > c5) c5 = z;
      }
      axis = longest(c3 - c0, c4 - c1, c5 - c2);
      const lo = axis === 0 ? c0 : axis === 1 ? c1 : c2;
      const hi = axis === 0 ? c3 : axis === 1 ? c4 : c5;
      if (!(hi > lo)) {
        // coincident centroids cannot be told apart: one leaf holds them all
        node[id * 2] = start;
        node[id * 2 + 1] = count;
        continue;
      }
      split = lo + (hi - lo) * 0.5;
      i = partition(tris, tc, start, end, axis, split);
    }
    if (n + 2 > cap) grow();
    const L = n, R = n + 1;
    n += 2;
    node[id * 2] = L;
    node[id * 2 + 1] = 0;
    bounds(tris, tb, start, i, box, L * 6);
    bounds(tris, tb, i, end, box, R * 6);
    push(R, i, end);
    push(L, start, i);
  }
  // pad every box by a hair (≈ 1e-6 of the mesh's size): a ray that grazes a
  // triangle on a tight box face must not be lost to rounding in the slab test
  const out = box.slice(0, n * 6);
  const pad = 1e-6 * Math.max(r3 - r0, r4 - r1, r5 - r2, 1e-3);
  for (let k = 0; k < n * 6; k += 6) {
    out[k] -= pad;
    out[k + 1] -= pad;
    out[k + 2] -= pad;
    out[k + 3] += pad;
    out[k + 4] += pad;
    out[k + 5] += pad;
  }
  return { box: out, node: node.slice(0, n * 2), tris };
}

function longest(x, y, z) {
  return x >= y && x >= z ? 0 : y >= z ? 1 : 2;
}

/** Move triangles whose centroid lies below `split` on `axis` to the front; returns the first of the rest. */
function partition(tris, tc, start, end, axis, split) {
  let i = start;
  for (let k = start; k < end; k++) {
    const t = tris[k];
    if (tc[t * 3 + axis] < split) {
      tris[k] = tris[i];
      tris[i] = t;
      i++;
    }
  }
  return i;
}

/** Union of the triangle bounds of tris[start … end) into out[o … o+5]. */
function bounds(tris, tb, start, end, out, o) {
  let b0 = Infinity, b1 = Infinity, b2 = Infinity, b3 = -Infinity, b4 = -Infinity, b5 = -Infinity;
  for (let k = start; k < end; k++) {
    const s = tris[k] * 6;
    if (tb[s] < b0) b0 = tb[s];
    if (tb[s + 1] < b1) b1 = tb[s + 1];
    if (tb[s + 2] < b2) b2 = tb[s + 2];
    if (tb[s + 3] > b3) b3 = tb[s + 3];
    if (tb[s + 4] > b4) b4 = tb[s + 4];
    if (tb[s + 5] > b5) b5 = tb[s + 5];
  }
  out[o] = b0;
  out[o + 1] = b1;
  out[o + 2] = b2;
  out[o + 3] = b3;
  out[o + 4] = b4;
  out[o + 5] = b5;
}
