// Swept tubes: a cross-section carried along a Spine, rebuilt on the CPU
// every frame for animated bodies (≈ 200 rings × 25 verts in well under a
// millisecond) with analytic normals, so ink outlines (inverted hulls that
// share the geometry) and lighting follow the motion exactly.
//
// Cross-sections are superellipses with independent upper and lower halves:
// a snake's D-shaped trunk (rounded back, flat belly), a round branch, a
// laterally compressed paddle tail. Two sections can be blended per ring.
//
// Attributes written for pattern shaders:
//   uv   = (s, lat)   s = arc length from the front (cm), lat = θ/π ∈ [−1, 1]
//                     (0 dorsal midline, ±0.5 flanks, ±1 ventral midline)
//   uv1  = (s / length, ring rest radius)
import * as THREE from 'three/webgpu';
import { Spine } from './spine.js';
import { Polyline } from './curve.js';

/**
 * Superelliptic cross-section table, θ ∈ [−π, π] in `radial` steps (the seam
 * vertex is duplicated at the ventral midline so `lat` never wraps inside a face).
 *
 * @param {object} [o]
 * @param {number} [o.width=1]    half-width (lateral) at the flanks
 * @param {number} [o.top=1]      height of the dorsal half
 * @param {number} [o.bottom=1]   depth of the ventral half
 * @param {number} [o.pTop=2]     superellipse exponent of the upper half (2 = ellipse, >2 boxier)
 * @param {number} [o.pBottom=2]  exponent of the lower half (≈4 gives a flat belly)
 * @param {number} [o.keel=0]     extra depth of a ventral keel (sea snakes)
 * @param {number} [radial=24]
 * @returns {{x:Float32Array,y:Float32Array,tx:Float32Array,ty:Float32Array,lat:Float32Array,radial:number}}
 */
export function makeSection(o = {}, radial = 24) {
  const { width = 1, top = 1, bottom = 1, pTop = 2, pBottom = 2, keel = 0 } = o;
  const n = radial + 1;
  const x = new Float32Array(n), y = new Float32Array(n);
  const tx = new Float32Array(n), ty = new Float32Array(n), lat = new Float32Array(n);
  const f = (th, out) => {
    const s = Math.sin(th), c = Math.cos(th);
    const e = 2 / (c >= 0 ? pTop : pBottom);
    out[0] = width * Math.sign(s) * Math.pow(Math.abs(s), e);
    let yy = (c >= 0 ? top : -bottom) * Math.pow(Math.abs(c), e);
    if (c < 0 && keel) yy -= keel * Math.pow(Math.abs(c), 10);
    out[1] = yy;
  };
  const a = [0, 0], b = [0, 0], m = [0, 0];
  const h = 1e-3;
  for (let j = 0; j < n; j++) {
    const th = -Math.PI + (2 * Math.PI * j) / radial;
    f(th, m);
    f(th - h, a);
    f(th + h, b);
    x[j] = m[0];
    y[j] = m[1];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    tx[j] = dx / l;
    ty[j] = dy / l;
    lat[j] = th / Math.PI;
  }
  return { x, y, tx, ty, lat, radial };
}

/**
 * A tube whose rings follow consecutive samples of a Spine.
 * Ring i of the tube is spine sample `first + i`; the tube's ends close by
 * themselves when the spine's w/h shrink to zero there (pointed or rounded).
 */
export class SweptTube {
  /**
   * @param {object} o
   * @param {number} o.rings
   * @param {number} [o.radial=24]
   * @param {ReturnType<makeSection>} [o.section]   section A (default circle)
   * @param {ReturnType<makeSection>} [o.sectionB]  optional section B, blended by spine.mix
   */
  constructor({ rings, radial = 24, section, sectionB = null }) {
    this.rings = rings;
    this.radial = radial;
    this.secA = section ?? makeSection({}, radial);
    this.secB = sectionB;
    if (this.secA.radial !== radial || (sectionB && sectionB.radial !== radial)) {
      throw new Error('SweptTube: section radial count mismatch');
    }
    const vpr = radial + 1;
    const nv = rings * vpr;
    const g = new THREE.BufferGeometry();
    this.position = new THREE.BufferAttribute(new Float32Array(nv * 3), 3);
    this.normal = new THREE.BufferAttribute(new Float32Array(nv * 3), 3);
    this.position.setUsage(THREE.DynamicDrawUsage);
    this.normal.setUsage(THREE.DynamicDrawUsage);
    this.uv = new THREE.BufferAttribute(new Float32Array(nv * 2), 2);
    this.uv1 = new THREE.BufferAttribute(new Float32Array(nv * 2), 2);
    g.setAttribute('position', this.position);
    g.setAttribute('normal', this.normal);
    g.setAttribute('uv', this.uv);
    g.setAttribute('uv1', this.uv1);
    const idx = new (nv > 65535 ? Uint32Array : Uint16Array)((rings - 1) * radial * 6);
    let w = 0;
    for (let i = 0; i < rings - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const a = i * vpr + j, b = a + vpr;
        idx[w++] = a; idx[w++] = b; idx[w++] = a + 1;
        idx[w++] = b; idx[w++] = b + 1; idx[w++] = a + 1;
      }
    }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    this.geometry = g;
    this.first = 0;
  }

  /**
   * Write the static pattern coordinates (uv, uv1) for spine samples
   * `first … first + rings − 1`. Call once after the spine's `s`, `w`, `h` are set.
   * @param {Spine} spine
   * @param {number} first
   * @param {number} [length] total length for uv1.x normalisation
   */
  setPatternCoords(spine, first = 0, length = spine.s[spine.count - 1]) {
    this.first = first;
    const vpr = this.radial + 1, A = this.secA;
    const uv = this.uv.array, uv1 = this.uv1.array;
    for (let i = 0; i < this.rings; i++) {
      const k = first + i;
      const s = spine.s[k];
      const r = (spine.w[k] + spine.h[k]) * 0.5;
      for (let j = 0; j < vpr; j++) {
        const v = (i * vpr + j) * 2;
        uv[v] = s;
        uv[v + 1] = A.lat[j];
        uv1[v] = s / (length || 1);
        uv1[v + 1] = r;
      }
    }
    this.uv.needsUpdate = true;
    this.uv1.needsUpdate = true;
  }

  /**
   * Rebuild positions and normals from the spine (frames must be current),
   * and the geometry's bounding box and sphere with them.
   * @param {Spine} spine
   * @param {number} [first=this.first]
   */
  update(spine, first = this.first) {
    const vpr = this.radial + 1;
    const A = this.secA, Bs = this.secB;
    const pos = this.position.array, nor = this.normal.array;
    const P = spine.pos, T = spine.T, B = spine.B, R = spine.R;
    const last = spine.count - 1;
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let i = 0; i < this.rings; i++) {
      const k = first + i;
      const o = k * 3;
      const px = P[o], py = P[o + 1], pz = P[o + 2];
      const tx = T[o], ty = T[o + 1], tz = T[o + 2];
      const bx = B[o], by = B[o + 1], bz = B[o + 2];
      const rx = R[o], ry = R[o + 1], rz = R[o + 2];
      const w = spine.w[k], h = spine.h[k], m = Bs ? spine.mix[k] : 0;
      // radius slope along the spine tilts the normals (cones, rounded caps)
      const kp = Math.min(last, k + 1), km = Math.max(0, k - 1);
      const dsk = Math.max(1e-6, Math.abs(spine.s[kp] - spine.s[km]));
      let dr = (spine.w[kp] + spine.h[kp] - spine.w[km] - spine.h[km]) * 0.5 / dsk;
      dr = Math.max(-6, Math.min(6, dr));
      for (let j = 0; j < vpr; j++) {
        let sx = A.x[j], sy = A.y[j], stx = A.tx[j], sty = A.ty[j];
        if (m > 0) {
          sx += (Bs.x[j] - sx) * m;
          sy += (Bs.y[j] - sy) * m;
          stx += (Bs.tx[j] - stx) * m;
          sty += (Bs.ty[j] - sty) * m;
        }
        const lx = sx * w, ly = sy * h;
        const v = (i * vpr + j) * 3;
        const X = px + rx * lx + bx * ly, Y = py + ry * lx + by * ly, Z = pz + rz * lx + bz * ly;
        pos[v] = X;
        pos[v + 1] = Y;
        pos[v + 2] = Z;
        if (X < x0) x0 = X;
        if (X > x1) x1 = X;
        if (Y < y0) y0 = Y;
        if (Y > y1) y1 = Y;
        if (Z < z0) z0 = Z;
        if (Z > z1) z1 = Z;
        // outward 2D normal of the scaled section: (−h·ty, w·tx)
        let nx2 = -h * sty, ny2 = w * stx;
        let l2 = Math.hypot(nx2, ny2);
        if (l2 < 1e-9) { nx2 = sx; ny2 = sy; l2 = Math.hypot(sx, sy) || 1; }
        nx2 /= l2; ny2 /= l2;
        let nx = rx * nx2 + bx * ny2 - tx * dr;
        let ny = ry * nx2 + by * ny2 - ty * dr;
        let nz = rz * nx2 + bz * ny2 - tz * dr;
        const ln = Math.hypot(nx, ny, nz) || 1;
        nor[v] = nx / ln;
        nor[v + 1] = ny / ln;
        nor[v + 2] = nz / ln;
      }
    }
    this.position.needsUpdate = true;
    this.normal.needsUpdate = true;
    // The bounds follow the pose: three computes a geometry's box and sphere
    // once, lazily, so a moving tube would keep its first pose's — raycasts
    // (picking, label occlusion) would cull it by a stale sphere and the SVG
    // exporter would frame a stale box. Reused objects: no allocation per frame.
    const g = this.geometry;
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

  dispose() {
    this.geometry.dispose();
  }
}

/**
 * Build a static tube geometry along a polyline (branches, ducts, fangs…).
 *
 * @param {ArrayLike<number>|THREE.Vector3[]} points  centre-line (flat xyz or Vector3s)
 * @param {object} [o]
 * @param {number|((u:number)=>number)} [o.radius=1]  radius, or radius as a function of u ∈ [0,1]
 * @param {number} [o.rings=48]
 * @param {number} [o.radial=16]
 * @param {ReturnType<makeSection>} [o.section]
 * @param {'round'|'point'|'open'} [o.startCap='round']
 * @param {'round'|'point'|'open'} [o.endCap='round']
 * @param {number[]} [o.up=[0,1,0]]  dorsal guide for the section orientation
 * @param {number} [o.upWeight=0.6]
 * @returns {THREE.BufferGeometry}  with uv = (s cm, lat), uv1 = (u, radius)
 */
export function buildTube(points, o = {}) {
  const flat = Array.isArray(points) && points[0]?.isVector3
    ? Float32Array.from(points.flatMap((p) => [p.x, p.y, p.z]))
    : Float32Array.from(points);
  const n = flat.length / 3;
  const rings = o.rings ?? 48;
  const radial = o.radial ?? 16;
  const radiusFn = typeof o.radius === 'function' ? o.radius : () => o.radius ?? 1;
  const line = new Polyline(n).set(flat, n, false);
  const spine = new Spine(rings);
  line.resample(spine.pos, rings);
  const L = line.length;
  const up = o.up ?? [0, 1, 0];
  spine.resetUp(up[0], up[1], up[2], o.upWeight ?? 0.6);
  for (let k = 0; k < rings; k++) {
    const u = k / (rings - 1);
    spine.s[k] = u * L;
    let r = radiusFn(u);
    const capR = Math.max(r, 1e-4);
    const s0 = u * L, s1 = (1 - u) * L;
    if ((o.startCap ?? 'round') === 'round' && s0 < capR) r *= Math.sqrt(Math.max(0, 1 - (1 - s0 / capR) ** 2));
    if ((o.endCap ?? 'round') === 'round' && s1 < capR) r *= Math.sqrt(Math.max(0, 1 - (1 - s1 / capR) ** 2));
    if (o.startCap === 'point' && k === 0) r = 0;
    if (o.endCap === 'point' && k === rings - 1) r = 0;
    spine.w[k] = spine.h[k] = r;
  }
  spine.computeFrames(false);
  const tube = new SweptTube({ rings, radial, section: o.section ?? makeSection({}, radial) });
  tube.setPatternCoords(spine, 0, L);
  // uv1.x carries u ∈ [0,1] for static tubes
  tube.update(spine, 0);
  tube.geometry.computeBoundingSphere();
  tube.geometry.computeBoundingBox();
  return tube.geometry;
}
