// Shared plumbing for the flower plates: one FigureKit per figure collects
// meshes, layers, labels, parts and GPU resources, so each species module
// only describes botany (organs, colours, motion) and the Figure contract
// (src/engine/figures/contract.js) is satisfied identically for all six.
import * as THREE from 'three/webgpu';

const _box = new THREE.Box3();
const _m = new THREE.Matrix4();
const _inv = new THREE.Matrix4();

export class FigureKit {
  /**
   * @param {object} ctx FigureContext (src/kits/ink)
   * @param {string} name root name
   */
  constructor(ctx, name) {
    this.ctx = ctx;
    this.root = new THREE.Group();
    this.root.name = name;
    this.layers = [];
    this.labels = [];
    this.parts = [];
    this._layerObjects = new Map();
    this._disposables = new Set();
    this._layerState = {};
  }

  /** Declare a toggleable layer. */
  layer(id, label, hint, visible = true) {
    this.layers.push({ id, label, visible, hint });
    this._layerObjects.set(id, new Set());
    this._layerState[id] = visible;
    return id;
  }

  /** Put objects on a layer (visibility follows the toggle). */
  assign(layerId, ...objects) {
    const set = this._layerObjects.get(layerId);
    if (!set) throw new Error(`[flowers] unknown layer ${layerId}`);
    for (const o of objects) set.add(o);
  }

  /** Track anything with dispose() (surfaces, geometries, materials, textures). */
  track(...items) {
    for (const it of items) if (it && typeof it.dispose === 'function') this._disposables.add(it);
    return items[0];
  }

  /**
   * Create a mesh with an ink outline.
   * @param {THREE.BufferGeometry} geometry
   * @param {THREE.Material} material
   * @param {object} [o]
   * @param {string} [o.name]
   * @param {THREE.Object3D} [o.parent]
   * @param {number|false} [o.outline=1] outline width multiplier (false = none)
   * @param {string} [o.layer]
   * @param {boolean} [o.animated] CPU-deformed geometry: disables frustum culling
   * @param {boolean} [o.shadow=true] cast shadows
   */
  mesh(geometry, material, o = {}) {
    const m = new THREE.Mesh(geometry, material);
    m.name = o.name ?? 'part';
    if (o.animated) m.frustumCulled = false;
    if (o.shadow === false) m.userData.castShadow = false;
    (o.parent ?? this.root).add(m);
    if (o.outline !== false) this.ctx.outline(m, { width: o.outline ?? 1 });
    if (o.layer) this.assign(o.layer, m);
    this.track(geometry, material);
    return m;
  }

  /**
   * Label anchored to a moving part.
   * @param {string} id canonical label id (CONTRACTS §6)
   * @param {string} text
   * @param {string} detail one sentence
   * @param {THREE.Object3D} parent object the anchor follows
   * @param {THREE.Vector3|number[]} [position] local position on the parent
   * @param {string} [layer]
   * @returns {THREE.Object3D} the anchor
   */
  label(id, text, detail, parent, position = [0, 0, 0], layer) {
    const anchor = new THREE.Object3D();
    anchor.name = `label:${id}`;
    if (Array.isArray(position)) anchor.position.set(...position);
    else anchor.position.copy(position);
    parent.add(anchor);
    const l = { id, text, detail, anchor };
    if (layer) l.layer = layer;
    this.labels.push(l);
    return anchor;
  }

  /**
   * Register an exportable part (flat SVG colour).
   * @param {string} id
   * @param {string} name
   * @param {THREE.Object3D} object
   * @param {string} color
   * @param {string} [layer]
   * @param {object} [o]
   * @param {Array<{ color: string, name: string }>} [o.swatches] the colours its colour node
   *        paints: the SVG plate snaps the part's pixels to them instead of reading its own
   */
  part(id, name, object, color, layer, o = {}) {
    const p = { id, name, object, color };
    if (layer) p.layer = layer;
    if (o.swatches) p.swatches = o.swatches;
    this.parts.push(p);
    return p;
  }

  setLayer(id, visible) {
    this._layerState[id] = visible;
    const set = this._layerObjects.get(id);
    if (set) for (const o of set) o.visible = visible;
  }

  isVisible(id) {
    return this._layerState[id] !== false;
  }

  /**
   * Union of mesh bounds (root space) over several poses, so the host fits
   * the whole animation, not just t = 0. The paper is pinned at y = 0.
   * @param {(t:number)=>void} poseAt
   * @param {number[]} times
   */
  measure(poseAt, times) {
    const total = new THREE.Box3();
    for (const t of times) {
      poseAt(t);
      this.root.updateMatrixWorld(true);
      _inv.copy(this.root.matrixWorld).invert();
      this.root.traverse((o) => {
        if (!o.isMesh || o.userData.isOutline || o.userData.noFit) return;
        for (let p = o; p && p !== this.root; p = p.parent) if (!p.visible) return;
        if (o.isInstancedMesh) {
          o.computeBoundingBox();
          _box.copy(o.boundingBox);
        } else {
          o.geometry.computeBoundingBox();
          _box.copy(o.geometry.boundingBox);
        }
        _m.multiplyMatrices(_inv, o.matrixWorld);
        total.union(_box.applyMatrix4(_m));
      });
    }
    total.min.y = 0;
    return { min: total.min.toArray(), max: total.max.toArray() };
  }

  dispose() {
    for (const d of this._disposables) d.dispose();
    this._disposables.clear();
    this.root.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) m.dispose?.();
    });
  }
}

/** Mesh traversal helper: every mesh (no outlines) under an object. */
export function meshesOf(obj) {
  const out = [];
  obj.traverse((o) => {
    if (o.isMesh && !o.userData.isOutline) out.push(o);
  });
  return out;
}

/** Periodic smooth noise-free sway for 5 s loops (integer cycles). */
export function sway(t, cycles, phase = 0) {
  return Math.sin(((t / 5) * cycles + phase) * Math.PI * 2);
}

/** Linear interpolation. */
export const mix = (a, b, t) => a + (b - a) * t;

/** Smoothstep on [a, b]. */
export function sstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
