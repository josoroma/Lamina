// BladeSurface — a parametric, lofted botanical blade with real thickness.
//
// Petals, sepals, bracts, leaves and orchid lips are all the same object to
// a botanist: a blade with an outline (width profile), cupping across,
// curling along, twist, a wavy margin and a little thickness. This class
// builds that blade as one closed thin shell (adaxial face, abaxial face,
// knife-edge margin sharing vertices), so:
//   - the inverted-hull ink outline draws crisp margins (margin normals
//     point outwards in the blade plane);
//   - both faces shade correctly with FrontSide materials;
//   - the shape can be re-posed every frame (blooming, a fluttering lip)
//     without allocating: rebuild() rewrites positions/normals in place.
//
// Local frame: base at the origin, blade runs along +Y (v: 0 base → 1 tip),
// across along X (s: −1 … +1, midrib at 0), adaxial (upper/inner) face +Z.
// Positive cup lifts the margins towards +Z (concave adaxial face, a spoon
// or a rolled tube); positive curl bends the blade towards +Z (incurved),
// negative curl reflexes it. UVs: u across (0.5 = midrib), v along; the
// `aSide` attribute is 0 on the adaxial face and 1 on the abaxial face.
import * as THREE from 'three/webgpu';
import { resolveProfile } from './profiles.js';
import { accumulateNormals, refreshBounds, ringGridIndex } from './normals.js';

export const BLADE_DEFAULTS = {
  length: 4, // cm
  width: 2, // cm at the widest point
  profile: 'elliptic', // preset | [[v,w]...] | (v)=>w
  tip: undefined, // tip rounding override 0..1
  cup: 0, // half-angle (rad) of the cross-section arc, number | (v)=>rad
  fold: 0, // V-fold at the midrib (rad), number | (v)=>rad
  curl: 0, // total bend along the length (rad); + incurved, − reflexed
  curlStart: 0, // v where the bend begins
  curlPow: 1, // >1 concentrates the bend towards the tip
  bend: null, // optional (v)=>tangent angle (rad); overrides curl
  twist: 0, // rad over the length
  sweep: 0, // sideways (falcate) bow, fraction of length
  wave: 0, // margin undulation amplitude (cm)
  waveFreq: 4, // waves along the margin
  wavePhase: 0, // rad
  wavePow: 2.5, // how quickly waves fade towards the midrib
  waveSkew: 0.5, // phase offset between the two margins (× π)
  thickness: 0.05, // cm at the midrib
  segU: 12, // across (even)
  segV: 24, // along
  endDensity: 0.6, // 0 uniform … 1 cosine-clustered rows at base and tip
};

const HALF_PI = Math.PI / 2;
const valueAt = (p, v) => (typeof p === 'function' ? p(v) : p);

export class BladeSurface {
  /**
   * @param {Partial<typeof BLADE_DEFAULTS>} opts
   */
  constructor(opts = {}) {
    this.p = { ...BLADE_DEFAULTS, ...opts };
    this.segU = Math.max(4, this.p.segU + (this.p.segU % 2));
    this.segV = Math.max(4, this.p.segV);
    this.ring = this.segU * 2;
    this.rows = this.segV + 1;
    const n = this.ring * this.rows;

    this.position = new Float32Array(n * 3);
    this.normal = new Float32Array(n * 3);
    const uvs = new Float32Array(n * 2);
    const side = new Float32Array(n);

    // parameter tables
    this.sHalf = new Float32Array(this.segU + 1); // s for top-face column i
    for (let i = 0; i <= this.segU; i++) {
      const t = -1 + (2 * i) / this.segU;
      this.sHalf[i] = Math.sin(HALF_PI * t);
    }
    this.vTab = new Float32Array(this.rows);
    const ed = this.p.endDensity;
    for (let j = 0; j < this.rows; j++) {
      const t = j / this.segV;
      this.vTab[j] = t * (1 - ed) + (0.5 - 0.5 * Math.cos(Math.PI * t)) * ed;
    }
    // per-row scratch
    this.cy = new Float32Array(this.rows);
    this.cz = new Float32Array(this.rows);
    this.psi = new Float32Array(this.rows);
    this.hw = new Float32Array(this.rows);
    // per-column scratch (cross-section of one row)
    this.cx = new Float32Array(this.segU + 1);
    this.cs = new Float32Array(this.segU + 1); // cross-section Z
    this.ca = new Float32Array(this.segU + 1); // tangent angle

    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.ring; i++) {
        const k = j * this.ring + i;
        const top = i <= this.segU;
        const col = top ? i : this.ring - i;
        uvs[k * 2] = (this.sHalf[col] + 1) / 2;
        uvs[k * 2 + 1] = this.vTab[j];
        side[k] = top || col === 0 || col === this.segU ? 0 : 1;
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.normal, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    this.index = ringGridIndex(this.ring, this.rows, false);
    g.setIndex(new THREE.BufferAttribute(this.index, 1));
    this.geometry = g;
    this.anchors = [];
    this._resolve();
    this.rebuild();
  }

  _resolve() {
    const r = resolveProfile(this.p.profile, this.p.tip);
    this._profile = r.fn;
    this._tip = r.tip;
  }

  /**
   * Update parameters (does not rebuild; call rebuild()). For per-frame
   * animation assign the live parameter object instead (`blade.p.cup = x`),
   * which avoids allocating; only `profile`/`tip` changes need set().
   * @param {Partial<typeof BLADE_DEFAULTS>} params
   * @returns {this}
   */
  set(params) {
    Object.assign(this.p, params);
    if ('profile' in params || 'tip' in params) this._resolve();
    return this;
  }

  /** Relative half-width at v, tip closed exactly at v = 1. */
  widthAt(v) {
    let w = Math.max(0, this._profile(v));
    const tip = this._tip;
    if (tip > 0.001) {
      // elliptical cap: its length in v is proportional to the tip width
      const capV = Math.min(0.45, Math.max(0.02, (tip * w * this.p.width) / (2 * this.p.length) + 0.02));
      const v0 = 1 - capV;
      if (v > v0) {
        const x = (v - v0) / capV;
        w *= Math.sqrt(Math.max(0, 1 - x * x));
      }
    } else {
      w *= Math.min(1, (1 - v) / 0.03);
    }
    return w;
  }

  _psiAt(v) {
    const p = this.p;
    if (p.bend) return p.bend(v);
    if (!p.curl) return 0;
    const r = Math.min(1, Math.max(0, (v - p.curlStart) / Math.max(1e-6, 1 - p.curlStart)));
    return p.curl * Math.pow(r, p.curlPow);
  }

  _angleAt(s, phi, fold) {
    return phi * s + (fold ? fold * Math.tanh(s / 0.18) : 0);
  }

  /** Re-evaluate the surface in place (no allocations). */
  rebuild() {
    const p = this.p;
    const L = p.length;
    const { segU, ring, rows, vTab, sHalf, cy, cz, psi, hw, cx, cs, ca } = this;
    const pos = this.position;

    // centreline
    cy[0] = 0;
    cz[0] = 0;
    psi[0] = this._psiAt(0);
    for (let j = 1; j < rows; j++) {
      const v0 = vTab[j - 1], v1 = vTab[j];
      const pm = this._psiAt((v0 + v1) / 2);
      cy[j] = cy[j - 1] + L * (v1 - v0) * Math.cos(pm);
      cz[j] = cz[j - 1] + L * (v1 - v0) * Math.sin(pm);
      psi[j] = this._psiAt(v1);
    }

    const mid = segU / 2;
    for (let j = 0; j < rows; j++) {
      const v = vTab[j];
      const h = 0.5 * p.width * this.widthAt(v);
      hw[j] = h;
      const phi = valueAt(p.cup, v);
      const fold = valueAt(p.fold, v);
      const tw = p.twist * v;
      const ctw = Math.cos(tw), stw = Math.sin(tw);
      const sp = Math.sin(psi[j]), cp = Math.cos(psi[j]);
      const swp = p.sweep * L * v * v;
      const thV = p.thickness * Math.sqrt(Math.min(1, v / 0.05)) * (1 - 0.45 * v);
      const waveEnv = p.wave ? p.wave * smooth(0.06, 0.32, v) : 0;
      const wavePhaseV = 2 * Math.PI * p.waveFreq * v + p.wavePhase;

      // integrate the cross-section outward from the midrib
      cx[mid] = 0;
      cs[mid] = 0;
      ca[mid] = this._angleAt(0, phi, fold);
      for (let i = mid + 1; i <= segU; i++) {
        const sm = (sHalf[i] + sHalf[i - 1]) / 2;
        const a = this._angleAt(sm, phi, fold);
        const ds = (sHalf[i] - sHalf[i - 1]) * h;
        cx[i] = cx[i - 1] + ds * Math.cos(a);
        cs[i] = cs[i - 1] + ds * Math.sin(a);
        ca[i] = this._angleAt(sHalf[i], phi, fold);
      }
      for (let i = mid - 1; i >= 0; i--) {
        const sm = (sHalf[i] + sHalf[i + 1]) / 2;
        const a = this._angleAt(sm, phi, fold);
        const ds = (sHalf[i] - sHalf[i + 1]) * h;
        cx[i] = cx[i + 1] + ds * Math.cos(a);
        cs[i] = cs[i + 1] + ds * Math.sin(a);
        ca[i] = this._angleAt(sHalf[i], phi, fold);
      }

      for (let i = 0; i <= segU; i++) {
        const s = sHalf[i];
        const a = ca[i];
        let X = cx[i];
        let Z = cs[i];
        // cross-section normal before twist
        let nx = -Math.sin(a);
        let nz = Math.cos(a);
        if (waveEnv) {
          const as = Math.abs(s);
          const wv = waveEnv * Math.pow(as, p.wavePow) * Math.sin(wavePhaseV + (s < 0 ? p.waveSkew * Math.PI : 0));
          X += nx * wv;
          Z += nz * wv;
        }
        X += swp;
        // twist about the centreline
        const Xt = X * ctw - Z * stw;
        const Zt = X * stw + Z * ctw;
        const nxt = nx * ctw - nz * stw;
        const nzt = nx * stw + nz * ctw;
        nx = nxt;
        nz = nzt;
        // world (blade-local) position of the mid-surface
        const px = Xt;
        const py = cy[j] - sp * Zt;
        const pz = cz[j] + cp * Zt;
        const wnx = nx, wny = -sp * nz, wnz = cp * nz;
        const th = 0.5 * thV * Math.sqrt(Math.max(0, 1 - s * s));
        // top (adaxial)
        let k = (j * ring + i) * 3;
        pos[k] = px + wnx * th;
        pos[k + 1] = py + wny * th;
        pos[k + 2] = pz + wnz * th;
        // bottom (abaxial), margins shared with the top face
        if (i > 0 && i < segU) {
          k = (j * ring + (ring - i)) * 3;
          pos[k] = px - wnx * th;
          pos[k + 1] = py - wny * th;
          pos[k + 2] = pz - wnz * th;
        }
      }
    }

    accumulateNormals(pos, this.index, this.normal);
    const g = this.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    refreshBounds(g);
    for (const a of this.anchors) this.pointAt(a.s, a.v, a.lift, a.object.position);
    return this;
  }

  /**
   * Point on the blade's mid-surface (blade-local), optionally lifted along
   * the adaxial normal. Interpolates the last rebuild.
   * @param {number} s  −1 … 1 across
   * @param {number} v  0 … 1 along
   * @param {number} [lift=0] cm along the adaxial normal
   * @param {THREE.Vector3} [out]
   */
  pointAt(s, v, lift = 0, out = new THREE.Vector3()) {
    const { vTab, rows, sHalf, segU, ring } = this;
    let j = 0;
    while (j < rows - 2 && v > vTab[j + 1]) j++;
    const tv = Math.min(1, Math.max(0, (v - vTab[j]) / Math.max(1e-9, vTab[j + 1] - vTab[j])));
    let i = 0;
    while (i < segU - 1 && s > sHalf[i + 1]) i++;
    const ts = Math.min(1, Math.max(0, (s - sHalf[i]) / Math.max(1e-9, sHalf[i + 1] - sHalf[i])));
    const pos = this.position, nor = this.normal;
    let x = 0, y = 0, z = 0, nx = 0, ny = 0, nz = 0;
    for (let c = 0; c < 4; c++) {
      const jj = j + (c >> 1);
      const ii = i + (c & 1);
      const w = (c >> 1 ? tv : 1 - tv) * (c & 1 ? ts : 1 - ts);
      const kt = (jj * ring + ii) * 3;
      const kb = (jj * ring + (ii === 0 || ii === segU ? ii : ring - ii)) * 3;
      x += w * 0.5 * (pos[kt] + pos[kb]);
      y += w * 0.5 * (pos[kt + 1] + pos[kb + 1]);
      z += w * 0.5 * (pos[kt + 2] + pos[kb + 2]);
      nx += w * nor[kt];
      ny += w * nor[kt + 1];
      nz += w * nor[kt + 2];
    }
    const nl = Math.hypot(nx, ny, nz) || 1;
    return out.set(x + (nx / nl) * lift, y + (ny / nl) * lift, z + (nz / nl) * lift);
  }

  /**
   * Keep `object.position` glued to (s, v) on this blade through rebuilds.
   * The object should be a child of the blade's mesh.
   */
  attach(object, s = 0, v = 0.5, lift = 0) {
    this.anchors.push({ object, s, v, lift });
    this.pointAt(s, v, lift, object.position);
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

/** Static blade geometry (convenience). */
export function createBladeGeometry(opts) {
  return new BladeSurface(opts).geometry;
}
