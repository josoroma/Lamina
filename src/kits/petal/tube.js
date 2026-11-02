// Tubes and lathes for the soft, round organs of a plant.
//
// TubeSurface sweeps a (possibly tapering, flattened) circle along any path
// with parallel-transport frames, so stems, peduncles, corona filaments,
// styles, tendrils and a hummingbird's bill share one generator. Like the
// blades it can be rebuilt in place every frame (a tendril coiling) without
// allocating. Ends can be rounded (radius → 0), flat (a cut stem) or open.
//
// LatheSurface revolves a meridian profile with an elliptical cross-section
// and optional longitudinal ridges: pseudobulbs, ovaries, receptacles, buds.
import * as THREE from 'three/webgpu';
import { accumulateNormals, refreshBounds, ringGridIndex } from './normals.js';

const _v = new THREE.Vector3();

/**
 * Normalise a path spec into a writer `(v, out) => out`.
 * @param {((v:number,out:THREE.Vector3)=>THREE.Vector3)|THREE.Curve|Array<number[]|THREE.Vector3>} path
 */
export function pathFn(path) {
  if (typeof path === 'function') return path;
  if (path?.isCurve) return (v, out) => path.getPointAt(Math.min(1, Math.max(0, v)), out);
  const pts = path.map((p) => (p.isVector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2])));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  return (v, out) => curve.getPointAt(Math.min(1, Math.max(0, v)), out);
}

export class TubeSurface {
  /**
   * @param {object} o
   * @param {*} o.path  see pathFn
   * @param {number|((v:number)=>number)} [o.radius=0.2] cm
   * @param {number} [o.radial=8] segments around
   * @param {number} [o.segments=32] segments along
   * @param {'round'|'flat'|'open'} [o.capStart='round']
   * @param {'round'|'flat'|'open'} [o.capEnd='round']
   * @param {number} [o.capLength] cm of rounding at round ends (default ≈ radius)
   * @param {number} [o.squash=1] cross-section aspect (binormal / normal)
   * @param {THREE.Vector3} [o.up] preferred initial frame normal
   */
  constructor(o) {
    this.o = { radius: 0.2, radial: 8, segments: 32, capStart: 'round', capEnd: 'round', squash: 1, ...o };
    this.path = pathFn(o.path);
    const { radial, segments } = this.o;
    this.radial = radial;
    this.extraStart = this.o.capStart === 'flat' ? 1 : 0;
    this.extraEnd = this.o.capEnd === 'flat' ? 1 : 0;
    this.rows = segments + 1 + this.extraStart + this.extraEnd;
    const n = this.rows * radial;
    this.position = new Float32Array(n * 3);
    this.normal = new Float32Array(n * 3);
    const uvs = new Float32Array(n * 2);
    for (let j = 0; j < this.rows; j++) {
      const v = Math.min(1, Math.max(0, (j - this.extraStart) / segments));
      for (let i = 0; i < radial; i++) {
        uvs[(j * radial + i) * 2] = i / radial;
        uvs[(j * radial + i) * 2 + 1] = v;
      }
    }
    this.pts = new Float32Array((segments + 1) * 3);
    this.frames = new Float32Array((segments + 1) * 9); // T, N, B per row
    this.index = ringGridIndex(radial, this.rows, false);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.normal, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    g.setIndex(new THREE.BufferAttribute(this.index, 1));
    this.geometry = g;
    this.up = (o.up ?? new THREE.Vector3(0, 0, 1)).clone();
    this.length = 0;
    this.rebuild();
  }

  /** Replace the path (e.g. new tendril shape) — call rebuild() after. */
  setPath(path) {
    this.path = pathFn(path);
    return this;
  }

  _radius(v) {
    const r = this.o.radius;
    return typeof r === 'function' ? r(v) : r;
  }

  /** Re-sample the path and rebuild positions/normals in place. */
  rebuild() {
    const { segments, radial, squash, capStart, capEnd } = this.o;
    const pts = this.pts, fr = this.frames, pos = this.position;
    let len = 0;
    for (let j = 0; j <= segments; j++) {
      this.path(j / segments, _v);
      pts[j * 3] = _v.x; pts[j * 3 + 1] = _v.y; pts[j * 3 + 2] = _v.z;
      if (j > 0) len += Math.hypot(_v.x - pts[j * 3 - 3], _v.y - pts[j * 3 - 2], _v.z - pts[j * 3 - 1]);
    }
    this.length = len;
    // tangents
    for (let j = 0; j <= segments; j++) {
      const a = Math.max(0, j - 1), b = Math.min(segments, j + 1);
      let tx = pts[b * 3] - pts[a * 3], ty = pts[b * 3 + 1] - pts[a * 3 + 1], tz = pts[b * 3 + 2] - pts[a * 3 + 2];
      const l = Math.hypot(tx, ty, tz) || 1;
      fr[j * 9] = tx / l; fr[j * 9 + 1] = ty / l; fr[j * 9 + 2] = tz / l;
    }
    // parallel transport of the normal
    let nx = this.up.x, ny = this.up.y, nz = this.up.z;
    for (let j = 0; j <= segments; j++) {
      const tx = fr[j * 9], ty = fr[j * 9 + 1], tz = fr[j * 9 + 2];
      let d = nx * tx + ny * ty + nz * tz;
      nx -= tx * d; ny -= ty * d; nz -= tz * d;
      let l = Math.hypot(nx, ny, nz);
      if (l < 1e-5) {
        // pick any perpendicular
        if (Math.abs(tx) < 0.9) { nx = 0; ny = -tz; nz = ty; } else { nx = tz; ny = 0; nz = -tx; }
        d = nx * tx + ny * ty + nz * tz;
        nx -= tx * d; ny -= ty * d; nz -= tz * d;
        l = Math.hypot(nx, ny, nz) || 1;
      }
      nx /= l; ny /= l; nz /= l;
      fr[j * 9 + 3] = nx; fr[j * 9 + 4] = ny; fr[j * 9 + 5] = nz;
      fr[j * 9 + 6] = ty * nz - tz * ny;
      fr[j * 9 + 7] = tz * nx - tx * nz;
      fr[j * 9 + 8] = tx * ny - ty * nx;
    }
    const capLen = this.o.capLength ?? null;
    let row = 0;
    const writeRow = (j, rScale) => {
      const v = j / segments;
      let r = this._radius(v) * rScale;
      const sDist = v * len, eDist = (1 - v) * len;
      const cl = capLen ?? this._radius(v) * 1.2;
      if (capStart === 'round' && sDist < cl) r *= Math.sqrt(Math.max(0, 1 - ((cl - sDist) / cl) ** 2));
      if (capEnd === 'round' && eDist < cl) r *= Math.sqrt(Math.max(0, 1 - ((cl - eDist) / cl) ** 2));
      const px = pts[j * 3], py = pts[j * 3 + 1], pz = pts[j * 3 + 2];
      const Nx = fr[j * 9 + 3], Ny = fr[j * 9 + 4], Nz = fr[j * 9 + 5];
      const Bx = fr[j * 9 + 6], By = fr[j * 9 + 7], Bz = fr[j * 9 + 8];
      for (let i = 0; i < radial; i++) {
        const a = (i / radial) * Math.PI * 2;
        const c = Math.cos(a) * r, s = Math.sin(a) * r * squash;
        const k = (row * radial + i) * 3;
        pos[k] = px + Nx * c + Bx * s;
        pos[k + 1] = py + Ny * c + By * s;
        pos[k + 2] = pz + Nz * c + Bz * s;
      }
      row++;
    };
    if (this.extraStart) writeRow(0, 0);
    for (let j = 0; j <= segments; j++) writeRow(j, 1);
    if (this.extraEnd) writeRow(segments, 0);
    accumulateNormals(pos, this.index, this.normal);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
    refreshBounds(this.geometry);
    return this;
  }

  /** Point on the axis at v (0..1) from the last rebuild. */
  pointAt(v, out = new THREE.Vector3()) {
    const seg = this.o.segments;
    const f = Math.min(seg, Math.max(0, v * seg));
    const j = Math.min(seg - 1, Math.floor(f));
    const t = f - j;
    const p = this.pts;
    return out.set(
      p[j * 3] + (p[j * 3 + 3] - p[j * 3]) * t,
      p[j * 3 + 1] + (p[j * 3 + 4] - p[j * 3 + 1]) * t,
      p[j * 3 + 2] + (p[j * 3 + 5] - p[j * 3 + 2]) * t
    );
  }

  /** Unit tangent at v from the last rebuild. */
  tangentAt(v, out = new THREE.Vector3()) {
    const seg = this.o.segments;
    const j = Math.min(seg, Math.max(0, Math.round(v * seg)));
    return out.set(this.frames[j * 9], this.frames[j * 9 + 1], this.frames[j * 9 + 2]);
  }

  dispose() {
    this.geometry.dispose();
  }
}

/**
 * Lathe with an elliptical cross-section and optional ridges.
 * Profile points are [radius, y] from bottom to top (cm); ends with radius 0
 * close the solid.
 * @param {object} o
 * @param {Array<[number, number]>} o.profile
 * @param {number} [o.segments=24] around
 * @param {number} [o.squash=1] z-radius / x-radius
 * @param {number} [o.ridges=0] number of longitudinal ridges
 * @param {number} [o.ridgeDepth=0] relative ridge depth
 * @param {number} [o.smooth=2] Catmull-Rom subdivisions per profile span
 * @returns {THREE.BufferGeometry}
 */
export function createLathe(o) {
  const { segments = 24, squash = 1, ridges = 0, ridgeDepth = 0, smooth = 2 } = o;
  const src = o.profile.map(([r, y]) => new THREE.Vector3(r, y, 0));
  const pts = [];
  if (smooth > 0 && src.length > 2) {
    const curve = new THREE.CatmullRomCurve3(src, false, 'centripetal');
    const n = (src.length - 1) * (smooth + 1);
    for (let i = 0; i <= n; i++) pts.push(curve.getPoint(i / n));
  } else pts.push(...src);
  const rows = pts.length;
  const ring = segments;
  const position = new Float32Array(rows * ring * 3);
  const uv = new Float32Array(rows * ring * 2);
  // arc-length v
  const acc = [0];
  for (let j = 1; j < rows; j++) acc.push(acc[j - 1] + pts[j].distanceTo(pts[j - 1]));
  const total = acc[rows - 1] || 1;
  for (let j = 0; j < rows; j++) {
    const r = Math.max(0, pts[j].x), y = pts[j].y;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2;
      const rr = r * (1 + (ridges ? ridgeDepth * Math.cos(a * ridges) : 0));
      const k = (j * ring + i) * 3;
      position[k] = Math.sin(a) * rr;
      position[k + 1] = y;
      position[k + 2] = Math.cos(a) * rr * squash;
      uv[(j * ring + i) * 2] = i / ring;
      uv[(j * ring + i) * 2 + 1] = acc[j] / total;
    }
  }
  // ring order turns +Z → +X while rows climb +Y: this winding faces outward
  const index = ringGridIndex(ring, rows, false);
  const normal = new Float32Array(position.length);
  accumulateNormals(position, index, normal);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}

/**
 * Helical coil path (tendrils): `turns` turns of radius `radius` around an
 * axis from `start` along `dir`, with a free straight lead of `lead` cm.
 * `phase` rotates the coil about its axis (animating it looks like coiling).
 * Returns a writer (v, out) => out. Allocation-free per call.
 */
export function helixPath({ start, dir, side, turns = 3, radius = 0.6, pitch = 0.5, lead = 2, phase = 0, taper = 0.4 }) {
  const D = dir.clone().normalize();
  const S = side.clone().sub(D.clone().multiplyScalar(side.dot(D))).normalize();
  const U = new THREE.Vector3().crossVectors(D, S);
  const coilLen = turns * pitch;
  const total = lead + coilLen;
  const state = { turns, radius, pitch, lead, phase, taper };
  const fn = (v, out) => {
    const { turns: tn, radius: rad, pitch: pc, lead: ld, phase: ph, taper: tp } = state;
    const cl = tn * pc;
    const tot = ld + cl;
    const d = v * tot;
    if (d <= ld) {
      // lead blends into the coil's first point smoothly
      const k = d / Math.max(1e-6, ld);
      const r0 = rad * k * k;
      const a = ph;
      out.copy(start).addScaledVector(D, d)
        .addScaledVector(S, Math.cos(a) * r0 - rad * 0)
        .addScaledVector(U, Math.sin(a) * r0);
      return out;
    }
    const c = (d - ld) / Math.max(1e-6, cl); // 0..1 through the coil
    const a = ph + c * tn * Math.PI * 2;
    const r = rad * (1 - tp * c);
    out.copy(start).addScaledVector(D, d)
      .addScaledVector(S, Math.cos(a) * r)
      .addScaledVector(U, Math.sin(a) * r);
    return out;
  };
  fn.state = state;
  fn.total = total;
  return fn;
}

/** Quadratic Bézier path writer through p0 → (control p1) → p2. */
export function quadPath(p0, p1, p2) {
  const a = p0.clone(), b = p1.clone(), c = p2.clone();
  return (v, out) => {
    const u = 1 - v;
    return out.set(
      u * u * a.x + 2 * u * v * b.x + v * v * c.x,
      u * u * a.y + 2 * u * v * b.y + v * v * c.y,
      u * u * a.z + 2 * u * v * b.z + v * v * c.z
    );
  };
}

/** Cubic Bézier path writer. */
export function cubicPath(p0, p1, p2, p3) {
  const a = p0.clone(), b = p1.clone(), c = p2.clone(), d = p3.clone();
  return (v, out) => {
    const u = 1 - v;
    const w0 = u * u * u, w1 = 3 * u * u * v, w2 = 3 * u * v * v, w3 = v * v * v;
    return out.set(
      w0 * a.x + w1 * b.x + w2 * c.x + w3 * d.x,
      w0 * a.y + w1 * b.y + w2 * c.y + w3 * d.y,
      w0 * a.z + w1 * b.z + w2 * c.z + w3 * d.z
    );
  };
}
