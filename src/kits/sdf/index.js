// SDF kit — main-thread API.
//
//   meshModel({ set, model, params, cell, quality, options }) → Promise<MeshResult>
//     Meshes a REGISTERED model (src/subjects/<set>/sdf-models.js) in a pool of
//     module Web Workers, caches the result by key (LRU, in memory) and falls
//     back to meshing on the main thread when workers are unavailable.
//   toGeometry(arrays) → THREE.BufferGeometry
//   createOccluder(mesh, bvh) → a label-ray stand-in (FigureHost's userData.occluder)
//
// The primitives/operators (sdf.js) and the mesher (mesher.js) are
// re-exported so subjects can author and test models from one import; the
// worker imports those files directly (they never touch three.js).
import * as THREE from 'three/webgpu';
import { meshSDF } from './mesher.js';
import { buildModel } from './registry.js';

export * from './sdf.js';
export { meshSDF, splitRegions, isoLines, chainSegments } from './mesher.js';
export { buildBVH } from './bvh.js';
export { loadModelSet, buildModel } from './registry.js';

/** Cell-size multipliers per quality level (bigger cell = faster, coarser). */
export const QUALITY = { low: 1.9, medium: 1.35, high: 1, ultra: 0.78 };

/**
 * Resolve a cell size for a base cell (cm) and a quality hint.
 * @param {number} base
 * @param {string|number} [quality] 'low'|'medium'|'high'|'ultra' or a multiplier
 */
export function cellFor(base, quality = 'high') {
  const m = typeof quality === 'number' ? quality : QUALITY[quality] ?? 1;
  return +(base * m).toFixed(4);
}

/** Default quality for this device (coarse pointers / small screens → medium). */
export function deviceQuality() {
  try {
    const coarse = matchMedia('(pointer: coarse)').matches;
    const small = Math.min(screen.width, screen.height) < 600;
    return coarse || small ? 'medium' : 'high';
  } catch {
    return 'high';
  }
}

// ---------------------------------------------------------------- cache

const MAX_CACHE = 40;
const cache = new Map(); // key → Promise<MeshResult>
const statsLog = [];

function remember(key, promise) {
  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
}

/** Recent mesh timings (newest last), for diagnostics and reports. */
export function meshStats() {
  return statsLog.slice();
}

/** Drop every cached mesh (e.g. after editing a model in development). */
export function clearMeshCache() {
  cache.clear();
}

// ---------------------------------------------------------------- worker pool
// A shared job queue: each worker runs one job at a time and pulls the next
// when idle, so a big cranium never blocks the small jobs queued after it.

let pool = null;
let workersBroken = false;
let seq = 0;
const queue = [];

function createPool() {
  if (pool || workersBroken || typeof Worker === 'undefined') return pool;
  const size = Math.max(1, Math.min(3, (globalThis.navigator?.hardwareConcurrency || 4) - 1));
  pool = [];
  for (let i = 0; i < size; i++) {
    let w;
    try {
      w = new Worker(new URL('./mesher.worker.js', import.meta.url), { type: 'module' });
    } catch (err) {
      console.warn('[sdf] module workers unavailable, meshing on the main thread', err);
      workersBroken = true;
      pool = null;
      return null;
    }
    const slot = { w, job: null };
    w.onmessage = (e) => {
      const { id, ok, result, error } = e.data ?? {};
      const job = slot.job;
      if (!job || job.id !== id) return;
      slot.job = null;
      if (ok) job.resolve(result);
      else job.reject(Object.assign(new Error(error), { fromModel: true }));
      pump();
    };
    w.onerror = (e) => {
      // A worker that fails to load its module never answers: fail over.
      e.preventDefault?.();
      console.warn('[sdf] mesher worker failed, falling back to the main thread', e.message ?? e);
      workersBroken = true;
      const fail = (job) => job.reject(Object.assign(new Error('worker failed'), { workerFailed: true }));
      for (const s of pool ?? []) {
        if (s.job) fail(s.job);
        s.job = null;
        s.w.terminate();
      }
      while (queue.length) fail(queue.shift());
      pool = null;
    };
    pool.push(slot);
  }
  return pool;
}

function pump() {
  if (!pool) return;
  for (const slot of pool) {
    if (slot.job || !queue.length) continue;
    const job = queue.shift();
    slot.job = job;
    slot.w.postMessage({ id: job.id, ...job.msg });
  }
}

function runInWorker(msg) {
  if (!createPool()) return Promise.reject(Object.assign(new Error('no workers'), { workerFailed: true }));
  return new Promise((resolve, reject) => {
    queue.push({ id: ++seq, msg, resolve, reject });
    pump();
  });
}

async function runLocal({ set, model, params, cell, options = {} }) {
  const t0 = performance.now();
  const def = await buildModel(set, model, params);
  const t1 = performance.now();
  const lines = options.lines && def.lines ? Object.fromEntries(options.lines.filter((n) => def.lines[n]).map((n) => [n, def.lines[n]])) : undefined;
  const result = meshSDF(def.sdf, {
    bounds: def.bounds,
    lipschitz: def.lipschitz,
    label: options.regions === false ? undefined : def.label,
    lines,
    full: options.full,
    project: options.project,
    ao: options.ao ?? def.ao,
    symmetricX: options.symmetricX ?? def.symmetricX,
    bvh: options.bvh,
    cell,
  });
  result.stats.buildMs = +(t1 - t0).toFixed(1);
  result.stats.where = 'main';
  return result;
}

/**
 * Mesh a registered SDF model (cached).
 *
 * @param {object} req
 * @param {string} req.set      model set = subject folder, e.g. 'skulls'
 * @param {string} req.model    model name inside the set, e.g. 'human-cranium'
 * @param {object} [req.params] passed to the model factory (part of the cache key)
 * @param {number} req.cell     cell size in cm (use cellFor(base, quality))
 * @param {{ regions?: boolean, lines?: string[], full?: boolean, project?: boolean, bvh?: boolean }} [req.options]
 *        bvh: also index every output mesh for ray queries (`mesh.bvh`, `regions[i].bvh`; see createOccluder)
 * @param {boolean} [req.worker=true] set false to force the main thread
 * @returns {Promise<import('./mesher.js').MeshResult>}
 */
export function meshModel(req) {
  const { set, model, params = {}, cell, options = {}, worker = true } = req;
  const key = JSON.stringify([set, model, params, cell, options]);
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit); // LRU touch
    return hit;
  }
  const t0 = performance.now();
  const msg = { set, model, params, cell, options };
  const run = worker && !workersBroken
    ? runInWorker(msg).catch((err) => {
        if (err.fromModel) throw err;
        return runLocal(msg);
      })
    : runLocal(msg);
  const p = run.then((result) => {
    result.stats.roundTripMs = +(performance.now() - t0).toFixed(1);
    result.stats.key = `${set}/${model}`;
    statsLog.push(result.stats);
    if (statsLog.length > 64) statsLog.shift();
    return result;
  });
  remember(key, p);
  return p;
}

/**
 * Typed arrays → indexed BufferGeometry (arrays are shared, never mutated).
 * A per-vertex ambient-occlusion array becomes the `ao` attribute.
 * @param {{ positions: Float32Array, normals?: Float32Array, indices?: Uint32Array, ao?: Float32Array }} a
 * @returns {THREE.BufferGeometry}
 */
export function toGeometry(a) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(a.positions, 3));
  if (a.normals) g.setAttribute('normal', new THREE.BufferAttribute(a.normals, 3));
  if (a.indices) g.setIndex(new THREE.BufferAttribute(a.indices, 1));
  if (a.ao) g.setAttribute('ao', new THREE.BufferAttribute(a.ao, 1));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/**
 * Faceted (flat-shaded) copy of a mesh — the "planes" stage of a drawing.
 * @returns {THREE.BufferGeometry}
 */
export function toFacetedGeometry(a) {
  const g = toGeometry({ positions: a.positions, indices: a.indices });
  const flat = g.toNonIndexed();
  g.dispose();
  flat.computeVertexNormals();
  flat.computeBoundingBox();
  flat.computeBoundingSphere();
  return flat;
}

// ---------------------------------------------------------------- ray queries

const _inv = new THREE.Matrix4();
const _ray = new THREE.Ray();
const _va = new THREE.Vector3();
const _vb = new THREE.Vector3();
const _vc = new THREE.Vector3();
const _pt = new THREE.Vector3();
const _pw = new THREE.Vector3();
let _ids = new Int32Array(128);
let _ent = new Float64Array(128);

function growStack() {
  const i2 = new Int32Array(_ids.length * 2);
  i2.set(_ids);
  _ids = i2;
  const e2 = new Float64Array(_ent.length * 2);
  e2.set(_ent);
  _ent = e2;
}

/** Ray parameter where the ray (origin o, unit direction d) enters BVH node n within [t0, t1], or −1. */
function enterBox(box, n, ox, oy, oz, dx, dy, dz, t0, t1) {
  const b = n * 6;
  let lo = t0, hi = t1;
  if (dx !== 0) {
    let a = (box[b] - ox) / dx, c = (box[b + 3] - ox) / dx;
    if (a > c) { const x = a; a = c; c = x; }
    if (a > lo) lo = a;
    if (c < hi) hi = c;
  } else if (ox < box[b] || ox > box[b + 3]) return -1;
  if (dy !== 0) {
    let a = (box[b + 1] - oy) / dy, c = (box[b + 4] - oy) / dy;
    if (a > c) { const x = a; a = c; c = x; }
    if (a > lo) lo = a;
    if (c < hi) hi = c;
  } else if (oy < box[b + 1] || oy > box[b + 4]) return -1;
  if (dz !== 0) {
    let a = (box[b + 2] - oz) / dz, c = (box[b + 5] - oz) / dz;
    if (a > c) { const x = a; a = c; c = x; }
    if (a > lo) lo = a;
    if (c < hi) hi = c;
  } else if (oz < box[b + 2] || oz > box[b + 5]) return -1;
  return lo <= hi ? lo : -1;
}

/**
 * Stand-in for a dense mesh in label-occlusion rays (FigureHost reads
 * `mesh.userData.occluder`): the mesh's own triangles, found through its BVH,
 * so it answers exactly as Mesh.raycast would — same triangle test, same
 * near/far rule in world units, same face culling for the material's side —
 * but visits a few dozen boxes instead of every triangle. Only the nearest
 * hit is reported (a reused record: read it before the next ray). Never added
 * to the scene: the host copies the mesh's matrixWorld onto it before a ray.
 */
export class MeshOccluder extends THREE.Object3D {
  /**
   * @param {THREE.Mesh} mesh  indexed mesh whose geometry the BVH was built over
   * @param {import('./bvh.js').BVH} bvh
   */
  constructor(mesh, bvh) {
    super();
    this.name = `${mesh.name}:occluder`;
    this.mesh = mesh;
    this.bvh = bvh;
    this.isMeshOccluder = true;
    this.matrixAutoUpdate = false;
    this.matrixWorldAutoUpdate = false;
    this.userData.triangles = bvh.tris.length;
    this._hit = { distance: 0, point: new THREE.Vector3(), object: mesh, faceIndex: -1 };
  }

  raycast(raycaster, intersects) {
    const { box, node, tris } = this.bvh;
    const geo = this.mesh.geometry;
    const pos = geo?.attributes.position;
    if (!tris.length || !pos || !geo.index) return;
    const P = pos.array;
    const I = geo.index.array;
    const side = this.mesh.material?.side ?? THREE.FrontSide;
    const cull = side !== THREE.DoubleSide;
    const near = raycaster.near, far = raycaster.far;
    const mw = this.matrixWorld;
    _inv.copy(mw).invert();
    _ray.copy(raycaster.ray).applyMatrix4(_inv);
    // an affine map scales every distance along one line by the same factor,
    // so the world near/far become local ray parameters (with a little slack:
    // the final test below is three's own, in world units)
    const e = _inv.elements, d = raycaster.ray.direction;
    const s = Math.hypot(e[0] * d.x + e[4] * d.y + e[8] * d.z, e[1] * d.x + e[5] * d.y + e[9] * d.z, e[2] * d.x + e[6] * d.y + e[10] * d.z);
    const t0 = Math.max(0, near * s * (1 - 1e-6) - 1e-9);
    let limit = far * s * (1 + 1e-6) + 1e-9;
    const ox = _ray.origin.x, oy = _ray.origin.y, oz = _ray.origin.z;
    const dx = _ray.direction.x, dy = _ray.direction.y, dz = _ray.direction.z;
    let best = Infinity, face = -1;
    const root = enterBox(box, 0, ox, oy, oz, dx, dy, dz, t0, limit);
    if (root < 0) return;
    _ids[0] = 0;
    _ent[0] = root;
    let sp = 1;
    while (sp > 0) {
      sp--;
      const n = _ids[sp];
      if (_ent[sp] > limit) continue; // a nearer hit was found meanwhile
      const first = node[n * 2], count = node[n * 2 + 1];
      if (count === 0) {
        // inner node: visit the nearer child first (pushed last)
        const ea = enterBox(box, first, ox, oy, oz, dx, dy, dz, t0, limit);
        const eb = enterBox(box, first + 1, ox, oy, oz, dx, dy, dz, t0, limit);
        if (sp + 2 > _ids.length) growStack();
        if (ea >= 0 && eb >= 0) {
          const aNear = ea <= eb;
          _ids[sp] = aNear ? first + 1 : first;
          _ent[sp++] = aNear ? eb : ea;
          _ids[sp] = aNear ? first : first + 1;
          _ent[sp++] = aNear ? ea : eb;
        } else if (ea >= 0) {
          _ids[sp] = first;
          _ent[sp++] = ea;
        } else if (eb >= 0) {
          _ids[sp] = first + 1;
          _ent[sp++] = eb;
        }
        continue;
      }
      for (let k = first, end = first + count; k < end; k++) {
        const t = tris[k];
        const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
        _va.set(P[a], P[a + 1], P[a + 2]);
        _vb.set(P[b], P[b + 1], P[b + 2]);
        _vc.set(P[c], P[c + 1], P[c + 2]);
        const hit = side === THREE.BackSide ? _ray.intersectTriangle(_vc, _vb, _va, true, _pt) : _ray.intersectTriangle(_va, _vb, _vc, cull, _pt);
        if (!hit) continue;
        _pw.copy(_pt).applyMatrix4(mw);
        const dist = raycaster.ray.origin.distanceTo(_pw);
        if (dist < near || dist > far || dist >= best) continue;
        best = dist;
        face = t;
        this._hit.point.copy(_pw);
        limit = Math.min(limit, dist * s * (1 + 1e-6) + 1e-9);
      }
    }
    if (face < 0) return;
    const h = this._hit;
    h.distance = best;
    h.faceIndex = face;
    intersects.push(h);
  }
}

/**
 * Label-occlusion stand-in for a mesh whose arrays carry a BVH (meshModel
 * with `options.bvh`), or null when they do not.
 * @param {THREE.Mesh} mesh
 * @param {import('./bvh.js').BVH} [bvh]
 * @returns {MeshOccluder|null}
 */
export function createOccluder(mesh, bvh) {
  return bvh?.tris && mesh?.geometry?.index ? new MeshOccluder(mesh, bvh) : null;
}

/** Terminate the worker pool (tests / hot reload). Queued jobs are rejected. */
export function disposeMesher() {
  for (const s of pool ?? []) s.w.terminate();
  pool = null;
  while (queue.length) queue.shift().reject(new Error('mesher disposed'));
}
