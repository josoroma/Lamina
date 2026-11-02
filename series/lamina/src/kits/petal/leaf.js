// PolarLeaf — leaves whose outline is best described around the petiole
// junction: palmately lobed leaves (Passiflora's three-lobed, vine-like
// blade) and orbicular floating pads with a sinus (water lilies).
//
// The outline is a function R(θ) (cm) around the junction, θ = 0 pointing
// to the apex (+Y), the blade lying in the XY plane with its upper face +Z.
// Like BladeSurface it is one closed thin shell: an upper and a lower face
// share the margin, so ink outlines trace teeth and lobes. Open sinus edges
// (a lily pad's notch) get outward normals so they are inked too. A relief
// function adds droop, cupping and vein puckering.
//
// Each face has its own junction vertex (a pole shared by every column)
// whose normal is that face's first-ring normal: a shared junction would
// average up- and down-facing triangles into a horizontal normal, which
// shades a dark blot and pushes the outline hull sideways into a
// starburst. Rows are uniform in ρ plus one rim row just inside the
// margin, so the margin's outward (ink) normals turn over a thin band
// instead of shading the whole last ring.
// UVs: u = θ normalised over the blade, v = ρ (0 junction … 1 margin);
// aSide 0 upper, 1 lower; aAngle = θ (rad) for vein patterns.
import * as THREE from 'three/webgpu';
import { accumulateNormals, refreshBounds, ringGridIndex } from './normals.js';

export class PolarLeaf {
  /**
   * @param {object} o
   * @param {(theta:number)=>number} o.outline  radius in cm at angle θ
   * @param {number} [o.thetaMax=Math.PI]  blade spans [−thetaMax, thetaMax]
   * @param {(x:number,y:number,rho:number,theta:number)=>number} [o.relief]  cm along +Z
   *        (make it vanish at x = y = 0 so the junction stays a point)
   * @param {number} [o.thickness=0.08]
   * @param {number} [o.segA=96]  columns around
   * @param {number} [o.segR=8]   rows from junction to margin
   * @param {number} [o.rim=0.012] ρ width of the rim row inside the margin
   * @param {boolean} [o.closedEnds] true when R(±thetaMax) = 0 (cordate base)
   */
  constructor(o) {
    this.o = { thetaMax: Math.PI, thickness: 0.08, segA: 96, segR: 8, rim: 0.012, ...o };
    const { segA, segR } = this.o;
    // radial stations of one face: uniform rows, the rim row, the margin
    this.rho = new Float32Array(segR + 2);
    for (let r = 0; r < segR; r++) this.rho[r] = r / segR;
    this.rho[segR] = 1 - this.o.rim;
    this.rho[segR + 1] = 1;
    this.M = segR + 1; // margin row, shared by both faces
    this.ringN = 2 * this.M + 1; // upper 0 … M, lower M+1 … 2M (its own junction at 2M)
    this.cols = segA + 1;
    const n = this.ringN * this.cols;
    this.position = new Float32Array(n * 3);
    this.normal = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    const side = new Float32Array(n);
    const ang = new Float32Array(n);
    this.theta = new Float32Array(this.cols);
    for (let c = 0; c < this.cols; c++) {
      this.theta[c] = -this.o.thetaMax + (2 * this.o.thetaMax * c) / segA;
    }
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.ringN; r++) {
        const top = r <= this.M;
        const k = c * this.ringN + r;
        uv[k * 2] = c / segA;
        uv[k * 2 + 1] = this.rho[top ? r : 2 * this.M - r];
        side[k] = top ? 0 : 1;
        ang[k] = this.theta[c];
      }
    }
    // an open strip per column: no triangles join the two junction vertices
    this.index = ringGridIndex(this.ringN, this.cols, false, false);
    // flip winding so the upper face (+Z) is front-facing
    for (let f = 0; f < this.index.length; f += 3) {
      const t = this.index[f + 1];
      this.index[f + 1] = this.index[f + 2];
      this.index[f + 2] = t;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.normal, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    g.setAttribute('aAngle', new THREE.BufferAttribute(ang, 1));
    g.setIndex(new THREE.BufferAttribute(this.index, 1));
    this.geometry = g;
    this.rebuild();
  }

  rebuild() {
    const { thetaMax, thickness, relief, outline, closedEnds } = this.o;
    const { cols, ringN, M, rho: rhoTab } = this;
    const pos = this.position;
    const endFade = closedEnds ? 0 : 0.06;
    const pinch = 4 * thickness; // cm: below this radius the blade thins out
    for (let c = 0; c < cols; c++) {
      const th = this.theta[c];
      const R = outline(th);
      const sx = Math.sin(th), cy = Math.cos(th);
      // thickness vanishes at the margin, the junction, open sinus edges and
      // where a closed (cordate) outline pinches into the junction
      const edge = endFade ? Math.min(1, (thetaMax - Math.abs(th)) / endFade) : 1;
      const taper = Math.sqrt(Math.max(0, edge) * Math.min(1, R / pinch));
      for (let r = 0; r <= M; r++) {
        const rho = rhoTab[r];
        const x = sx * R * rho, y = cy * R * rho;
        const z = relief ? relief(x, y, rho, th) : 0;
        const h = 0.5 * thickness * Math.sqrt(Math.max(0, Math.sin(Math.PI * rho))) * taper;
        let k = (c * ringN + r) * 3;
        pos[k] = x; pos[k + 1] = y; pos[k + 2] = z + h;
        if (r < M) {
          k = (c * ringN + (2 * M - r)) * 3;
          pos[k] = x; pos[k + 1] = y; pos[k + 2] = z - h;
        }
      }
    }
    accumulateNormals(pos, this.index, this.normal);
    this._poleNormals();
    if (closedEnds) this._pinchedNormals();
    else this._edgeNormals();
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
    refreshBounds(this.geometry);
    return this;
  }

  // the junction: each face's pole takes the area-weighted normal of its
  // first ring (the fan around the pole), the same for every column
  _poleNormals() {
    const { cols, ringN, M } = this;
    const pos = this.position, nor = this.normal;
    // upper fan winds (c+1, 1) → (c, 1) about +Z; the lower one the other way
    for (const [r0, r1, sgn] of [[0, 1, 1], [2 * M, 2 * M - 1, -1]]) {
      let x = 0, y = 0, z = 0;
      for (let c = 0; c < cols - 1; c++) {
        const o = (c * ringN + r0) * 3, a = ((c + 1) * ringN + r1) * 3, b = (c * ringN + r1) * 3;
        const ax = pos[a] - pos[o], ay = pos[a + 1] - pos[o + 1], az = pos[a + 2] - pos[o + 2];
        const bx = pos[b] - pos[o], by = pos[b + 1] - pos[o + 1], bz = pos[b + 2] - pos[o + 2];
        x += ay * bz - az * by;
        y += az * bx - ax * bz;
        z += ax * by - ay * bx;
      }
      const l = (Math.hypot(x, y, z) || 1) * sgn;
      for (let c = 0; c < cols; c++) {
        const k = (c * ringN + r0) * 3;
        nor[k] = x / l; nor[k + 1] = y / l; nor[k + 2] = z / l;
      }
    }
  }

  // closed (cordate) ends: the end columns collapse into the junction, where
  // only sliver triangles touch them; borrow the neighbouring column's normals
  _pinchedNormals() {
    const { cols, ringN } = this;
    const nor = this.normal;
    for (const [c, nb] of [[0, 1], [cols - 1, cols - 2]]) {
      for (let r = 1; r < ringN - 1; r++) {
        const k = (c * ringN + r) * 3, kn = (nb * ringN + r) * 3;
        nor[k] = nor[kn]; nor[k + 1] = nor[kn + 1]; nor[k + 2] = nor[kn + 2];
      }
    }
  }

  // open sinus edges: point both faces' normals outward across the edge
  // (the junction poles keep their face normals)
  _edgeNormals() {
    const { cols, ringN } = this;
    const pos = this.position, nor = this.normal;
    for (const [c, nb] of [[0, 1], [cols - 1, cols - 2]]) {
      for (let r = 1; r < ringN - 1; r++) {
        const k = (c * ringN + r) * 3, kn = (nb * ringN + r) * 3;
        let x = pos[k] - pos[kn], y = pos[k + 1] - pos[kn + 1], z = pos[k + 2] - pos[kn + 2];
        const l = Math.hypot(x, y, z) || 1;
        x /= l; y /= l; z /= l;
        nor[k] = x; nor[k + 1] = y; nor[k + 2] = z;
      }
    }
  }

  /** Point on the upper face at (θ, ρ). */
  pointAt(theta, rho, lift = 0, out = new THREE.Vector3()) {
    const R = this.o.outline(theta);
    const x = Math.sin(theta) * R * rho, y = Math.cos(theta) * R * rho;
    const z = this.o.relief ? this.o.relief(x, y, rho, theta) : 0;
    return out.set(x, y, z + lift);
  }

  dispose() {
    this.geometry.dispose();
  }
}

/**
 * Outline for a palmately lobed leaf (or, with one wide lobe, a round pad).
 * Each lobe is f(d) = length · (1 − d^sharp)^body for d = |θ − angle| / width < 1;
 * sharp ≈ 1 gives acute/acuminate tips, 2 rounded; body < 1 fills the shoulders.
 * @param {object} o
 * @param {Array<{ angle:number, length:number, width:number, sharp?:number, body?:number }>} o.lobes
 * @param {number} [o.base=0.2] cm: minimum radius (depth of the sinuses between lobes)
 * @param {number} [o.auricle=0] cm: rounded basal lobes behind the junction (cordate base)
 * @param {number} [o.teeth=0] marginal teeth over a full turn
 * @param {number} [o.toothDepth=0.03] relative tooth depth
 * @param {'serrate'|'dentate'} [o.toothShape='serrate'] saw-like teeth leaning one way, or
 *        symmetric pointed teeth with rounded sinuses between (sinuate-dentate)
 * @param {number} [o.toothJitter=0] 0..1 irregularity of tooth depth
 * @param {number} [o.sinuate=0] relative amplitude of broad marginal waves
 * @param {number} [o.thetaMax=Math.PI] the basal sinus sits at ±thetaMax
 * @param {boolean} [o.closeSinus=true] taper the radius to 0 at the sinus (cordate)
 * @returns {(theta:number)=>number}
 */
export function lobedOutline({
  lobes, base = 0.2, auricle = 0, teeth = 0, toothDepth = 0.03, toothShape = 'serrate', toothJitter = 0, sinuate = 0,
  thetaMax = Math.PI, closeSinus = true,
}) {
  return (th) => {
    const a = Math.abs(th);
    let r = base;
    for (const l of lobes) {
      const d = Math.abs(th - l.angle) / l.width;
      if (d < 1) r = Math.max(r, l.length * Math.pow(1 - Math.pow(d, l.sharp ?? 1.25), l.body ?? 0.8));
    }
    if (auricle && a > Math.PI / 2) {
      const x = (a - Math.PI / 2) / Math.max(1e-3, thetaMax - Math.PI / 2);
      r = Math.max(r, auricle * Math.pow(Math.sin(Math.PI * Math.min(1, x) * 0.92), 0.7));
    }
    if (teeth) {
      const x = ((th + Math.PI) / (2 * Math.PI)) * teeth;
      const k = Math.floor(x);
      const s = x - k;
      const j = toothJitter ? 1 - toothJitter + toothJitter * hash1(k) : 1;
      r *= toothShape === 'dentate' ? 1 - toothDepth * j * Math.pow(Math.sin(Math.PI * s), 0.55) : 1 - toothDepth * j * s * s;
    }
    if (sinuate) r *= 1 + sinuate * Math.sin(th * 7.0 + 1.3) * Math.sin(th * 3.0 + 0.4);
    if (closeSinus) r *= Math.sqrt(Math.min(1, Math.max(0, (thetaMax - a) / 0.12)));
    return r;
  };
}

/** Deterministic hash of an integer to [0, 1). */
function hash1(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
