// Allocation-free vertex normals and bounds for CPU-animated botanical surfaces.
//
// BufferGeometry.computeVertexNormals() allocates temporaries on every call;
// blades that unfurl each frame (blooming petals, coiling tendrils) instead
// re-accumulate area-weighted face normals straight into the existing
// normal array. Shared margin vertices of thin shells thereby get outward
// normals, which is what the inverted-hull ink outline needs.
import * as THREE from 'three/webgpu';

/**
 * Bring a rebuilt geometry's bounding box and sphere up to date. three
 * computes them once, lazily, so a surface that keeps changing shape would
 * keep its first pose's: frustum culling and raycasts (picking, label
 * occlusion) would test a stale sphere, and the SVG exporter would frame a
 * stale box. One pass, both objects rewritten in place; the sphere
 * circumscribes the box, as SweptTube's does: a little loose, never short.
 * @param {THREE.BufferGeometry} g
 */
export function refreshBounds(g) {
  const pos = g.attributes.position.array;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
    if (z < z0) z0 = z;
    if (z > z1) z1 = z;
  }
  const box = g.boundingBox ?? (g.boundingBox = new THREE.Box3());
  const sphere = g.boundingSphere ?? (g.boundingSphere = new THREE.Sphere());
  if (x0 > x1) {
    box.makeEmpty();
    sphere.makeEmpty();
    return;
  }
  box.min.set(x0, y0, z0);
  box.max.set(x1, y1, z1);
  box.getCenter(sphere.center);
  sphere.radius = 0.5 * Math.hypot(x1 - x0, y1 - y0, z1 - z0);
}

/**
 * Accumulate area-weighted face normals into `nor` and normalise.
 * @param {Float32Array} pos  xyz positions
 * @param {Uint16Array|Uint32Array} idx  triangle indices
 * @param {Float32Array} nor  output xyz normals (same length as pos)
 */
export function accumulateNormals(pos, idx, nor) {
  nor.fill(0);
  for (let f = 0; f < idx.length; f += 3) {
    const a = idx[f] * 3, b = idx[f + 1] * 3, c = idx[f + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    nor[a] += nx; nor[a + 1] += ny; nor[a + 2] += nz;
    nor[b] += nx; nor[b + 1] += ny; nor[b + 2] += nz;
    nor[c] += nx; nor[c + 1] += ny; nor[c + 2] += nz;
  }
  for (let i = 0; i < nor.length; i += 3) {
    const l = Math.hypot(nor[i], nor[i + 1], nor[i + 2]);
    if (l > 1e-12) {
      nor[i] /= l; nor[i + 1] /= l; nor[i + 2] /= l;
    } else {
      nor[i] = 0; nor[i + 1] = 1; nor[i + 2] = 0;
    }
  }
}

/**
 * Index buffer for a grid that wraps in its first dimension (a ring of
 * `ring` vertices per row, `rows` rows). Optionally wraps rows too (torus).
 * Winding: (i → i+1) × (row → row+1) faces outward for ring order that
 * runs in +B with rows advancing in +T.
 * @param {number} ring
 * @param {number} rows
 * @param {boolean} [wrapRows=false]
 * @param {boolean} [wrapRing=true]  false: the ring is an open strip (seam duplicated)
 * @returns {Uint16Array|Uint32Array}
 */
export function ringGridIndex(ring, rows, wrapRows = false, wrapRing = true) {
  const rowPairs = wrapRows ? rows : rows - 1;
  const colPairs = wrapRing ? ring : ring - 1;
  const count = colPairs * rowPairs * 6;
  const Arr = ring * rows > 65535 ? Uint32Array : Uint16Array;
  const out = new Arr(count);
  let k = 0;
  for (let j = 0; j < rowPairs; j++) {
    const j1 = (j + 1) % rows;
    for (let i = 0; i < colPairs; i++) {
      const i1 = (i + 1) % ring;
      const a = j * ring + i, b = j * ring + i1, c = j1 * ring + i, d = j1 * ring + i1;
      out[k++] = a; out[k++] = b; out[k++] = d;
      out[k++] = a; out[k++] = d; out[k++] = c;
    }
  }
  return out;
}
