// CorollaSurface — a sympetalous (fused-petal) corolla as one closed shell.
//
// Trumpets (Handroanthus), star-mouthed tubes (Palicourea) and slender
// curved tubes (Heliconia) are surfaces of revolution whose meridian bends
// outward into a limb that splits into rounded lobes. The meridian angle β
// (from the floral axis) grows from a slight funnel in the tube to `flare`
// at the lobe tips; lobes are cut as semi-elliptic tongues above the sinus
// level, optionally unequal (bilabiate: two upper, three lower lobes).
//
// The shell has an inner (adaxial, aSide = 0) and outer (abaxial, aSide = 1)
// face joined at a knife-edge rim, so ink outlines trace the lobe margins.
// UVs: u = |distance from the lobe midline| (0 midline … 1 sinus), v along
// the meridian (0 base … 1 lobe tip); `aLobe` holds the lobe coordinate
// (lobe index + 0.5 at its midline) for per-lobe patterns like nectar guides.
// Local frame: base at the origin, floral axis +Y, lobe 0 centred on +Z.
import * as THREE from 'three/webgpu';
import { accumulateNormals, refreshBounds, ringGridIndex } from './normals.js';

export const COROLLA_DEFAULTS = {
  length: 5, // cm along the meridian of a lobe midline
  baseRadius: 0.35, // cm
  funnel: 0.1, // meridian angle (rad) in the tube: >0 widens
  throat: 0.45, // v where flaring begins
  flare: 1.4, // meridian angle (rad) at the lobe tips (π/2 = spreading flat)
  flarePow: 1.5,
  lobes: 5,
  lobeDepth: 0.3, // fraction of the length taken by the free lobes
  lobeRound: 2, // 2 = elliptic tip, >2 squarer, <2 pointed
  lobeScale: null, // per-lobe length factors (bilabiate limbs)
  lobeFlare: null, // per-lobe flare factors
  lobeCup: 0, // cm: lobes bulge outward along their midline (concave limb)
  lobeOffset: 0, // rad: rotates the lobes about the axis
  curve: 0, // bends the tube towards +Z (fraction of length)
  thickness: 0.06, // cm
  segPerLobe: 12, // columns per lobe (even)
  segV: 22,
};

export class CorollaSurface {
  /** @param {Partial<typeof COROLLA_DEFAULTS>} opts */
  constructor(opts = {}) {
    this.p = { ...COROLLA_DEFAULTS, ...opts };
    const n = this.p.lobes;
    const m = Math.max(4, this.p.segPerLobe + (this.p.segPerLobe % 2));
    this.segA = n * m;
    this.cols = this.segA + 1; // seam duplicated for continuous UVs
    this.segV = Math.max(6, this.p.segV);
    this.rowsOut = this.segV + 1;
    this.rows = this.rowsOut + this.segV; // inner rows exclude the shared rim
    const count = this.cols * this.rows;
    this.position = new Float32Array(count * 3);
    this.normal = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    const side = new Float32Array(count);
    const lobe = new Float32Array(count);
    // per-column constants
    this.theta = new Float32Array(this.cols);
    this.phi = new Float32Array(this.cols);
    this.lobeOf = new Int16Array(this.cols);
    const sector = (Math.PI * 2) / n;
    for (let i = 0; i < this.cols; i++) {
      const a = (i / this.segA) * Math.PI * 2; // 0 at a sinus
      const k = Math.min(n - 1, Math.floor(i / m));
      const local = (i - k * m) / m; // 0..1 across lobe k
      this.theta[i] = a - sector / 2 + this.p.lobeOffset; // lobe 0 midline at angle 0 (+Z)
      this.phi[i] = local * 2 - 1;
      this.lobeOf[i] = i === this.segA ? n - 1 : k;
    }
    this.vOut = new Float32Array(this.rowsOut);
    for (let j = 0; j < this.rows; j++) {
      const outer = j < this.rowsOut;
      const jj = outer ? j : this.rows - j; // inner rows run back down
      for (let i = 0; i < this.cols; i++) {
        const k = j * this.cols + i;
        uv[k * 2] = Math.abs(this.phi[i]);
        uv[k * 2 + 1] = jj / this.segV; // provisional; true v written on rebuild
        side[k] = outer && j !== this.segV ? 1 : 0;
        const kk = this.lobeOf[i];
        lobe[k] = kk + (this.phi[i] + 1) / 2;
      }
    }
    this.uv = uv;
    this.index = ringGridIndex(this.cols, this.rows, true, false);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.normal, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    g.setAttribute('aLobe', new THREE.BufferAttribute(lobe, 1));
    g.setIndex(new THREE.BufferAttribute(this.index, 1));
    this.geometry = g;
    this.anchors = [];
    this.rebuild();
  }

  /**
   * Update parameters (call rebuild() after). Per-frame animation can assign
   * the live object `corolla.p` directly to avoid allocating.
   * @param {Partial<typeof COROLLA_DEFAULTS>} params
   */
  set(params) {
    Object.assign(this.p, params);
    return this;
  }

  _lobeFactor(arr, k) {
    return arr ? arr[k % arr.length] : 1;
  }

  rebuild() {
    const p = this.p;
    const { cols, rows, rowsOut, segV, segA } = this;
    const n = p.lobes;
    const L = p.length;
    const pos = this.position;
    const uv = this.uv;
    const vs = 1 - p.lobeDepth;
    const vTube = vs * 0.97;
    const jt = Math.max(2, Math.round(segV * 0.6));
    const pr = p.lobeRound;

    for (let i = 0; i < cols; i++) {
      const th = this.theta[i];
      const ph = this.phi[i];
      const k = this.lobeOf[i];
      // blend lobe factors towards the neighbour near the sinus
      const nb = ph > 0 ? (k + 1) % n : (k + n - 1) % n;
      const w = 0.5 * smooth(0.55, 1, Math.abs(ph));
      const lam = mix(this._lobeFactor(p.lobeScale, k), this._lobeFactor(p.lobeScale, nb), w);
      const fl = p.flare * mix(this._lobeFactor(p.lobeFlare, k), this._lobeFactor(p.lobeFlare, nb), w);
      const shape = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(ph), pr)), 1 / pr);
      const vmax = vs + (1 - vs) * lam * shape;
      const ex = Math.sin(th), ez = Math.cos(th);
      const rimLen = Math.min(0.07, Math.max(0.01, vmax * 0.08));
      const cup = p.lobeCup * (1 - ph * ph);

      let r = p.baseRadius, y = 0, vPrev = 0;
      for (let j = 0; j <= segV; j++) {
        const v = j <= jt ? (j / jt) * vTube : vTube + ((j - jt) / (segV - jt)) * (vmax - vTube);
        // integrate the meridian with the midpoint angle
        if (j > 0) {
          const vm = (v + vPrev) / 2;
          const bm = this._beta(vm, fl);
          r += Math.sin(bm) * L * (v - vPrev);
          y += Math.cos(bm) * L * (v - vPrev);
        }
        vPrev = v;
        const b = this._beta(v, fl);
        const cb = Math.cos(b), sb = Math.sin(b);
        let thick = p.thickness * (1 - 0.45 * Math.min(1, v));
        if (v > vmax - rimLen) {
          const x = Math.min(1, (v - (vmax - rimLen)) / rimLen);
          thick *= Math.sqrt(Math.max(0, 1 - x * x));
        }
        if (j === segV) thick = 0;
        const bulge = v > vs ? cup * Math.sin(Math.PI * Math.min(1, (v - vs) / Math.max(1e-4, vmax - vs))) : 0;
        const rr = r + bulge * cb;
        const yy = y - bulge * sb;
        const zc = p.curve ? p.curve * L * (yy / L) * (yy / L) : 0;
        const mx = ex * rr, my = yy, mz = ez * rr + zc;
        const nx = ex * cb, ny = -sb, nz = ez * cb;
        const h = thick / 2;
        // outer (abaxial) row j, inner (adaxial) row rows - j
        let kk = (j * cols + i) * 3;
        pos[kk] = mx + nx * h; pos[kk + 1] = my + ny * h; pos[kk + 2] = mz + nz * h;
        uv[(j * cols + i) * 2 + 1] = v;
        if (j < segV) {
          const ji = rows - 1 - j; // inner rows: index rowsOut .. rows-1 descend
          kk = (ji * cols + i) * 3;
          pos[kk] = mx - nx * h; pos[kk + 1] = my - ny * h; pos[kk + 2] = mz - nz * h;
          uv[(ji * cols + i) * 2 + 1] = v;
        }
      }
    }

    accumulateNormals(pos, this.index, this.normal);
    // weld normals across the duplicated seam column
    const nor = this.normal;
    for (let j = 0; j < rows; j++) {
      const a = (j * cols) * 3, b = (j * cols + segA) * 3;
      let x = nor[a] + nor[b], yv = nor[a + 1] + nor[b + 1], z = nor[a + 2] + nor[b + 2];
      const l = Math.hypot(x, yv, z) || 1;
      x /= l; yv /= l; z /= l;
      nor[a] = nor[b] = x; nor[a + 1] = nor[b + 1] = yv; nor[a + 2] = nor[b + 2] = z;
    }
    const g = this.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    g.attributes.uv.needsUpdate = true;
    refreshBounds(g);
    for (const an of this.anchors) this.pointAt(an.lobe, an.v, an.side, an.object.position);
    return this;
  }

  _beta(v, flare) {
    const p = this.p;
    const s = Math.pow(smooth(p.throat, 1, v), p.flarePow);
    return p.funnel + (flare - p.funnel) * s;
  }

  /**
   * Point on the inner (side 0) or outer (side 1) face at the midline of
   * lobe `lobe`, at fraction `v` (0 base … 1 lobe tip) of that column.
   */
  pointAt(lobe, v, side = 0, out = new THREE.Vector3()) {
    const m = this.segA / this.p.lobes;
    const i = Math.round(lobe * m + m / 2) % this.segA;
    const f = Math.min(this.segV, Math.max(0, v * this.segV));
    const j0 = Math.floor(Math.min(this.segV - 1, f));
    const t = f - j0;
    const rowOf = (j) => (side === 0 && j < this.segV ? this.rows - 1 - j : j);
    const a = (rowOf(j0) * this.cols + i) * 3;
    const b = (rowOf(j0 + 1) * this.cols + i) * 3;
    const pos = this.position;
    return out.set(
      pos[a] + (pos[b] - pos[a]) * t,
      pos[a + 1] + (pos[b + 1] - pos[a + 1]) * t,
      pos[a + 2] + (pos[b + 2] - pos[a + 2]) * t
    );
  }

  /** Glue an object (child of the corolla mesh) to a lobe through rebuilds. */
  attach(object, lobe = 0, v = 0.8, side = 0) {
    this.anchors.push({ object, lobe, v, side });
    this.pointAt(lobe, v, side, object.position);
    return object;
  }

  dispose() {
    this.geometry.dispose();
  }
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function mix(a, b, t) {
  return a + (b - a) * t;
}
