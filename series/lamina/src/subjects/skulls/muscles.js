// Muscles of mastication as ink-shaded fibre bundles: the temporalis fans
// from the temporal fossa under the zygomatic arch to the coronoid process;
// the masseter runs from the arch down to the angle of the mandible.
//
// Why instanced spindles: each fibre bundle is one instance of a lathe
// "spindle" stretched between an origin on the cranium and an insertion on
// the mandible. Opening the jaw only rewrites instance matrices (no
// allocations), and each spindle thickens as it shortens (constant volume),
// so the muscles visibly bunch and stretch with the bite.
import * as THREE from 'three/webgpu';
import { uv } from 'three/tsl';
import { raycast } from '../../kits/sdf/sdf.js';

const _a = new THREE.Vector3();
const _w = new THREE.Vector3();
const _n = new THREE.Vector3();
const _b = new THREE.Vector3();
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _r = new THREE.Matrix4();

function spindleGeometry() {
  const pts = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const r = 0.22 + 0.78 * Math.pow(Math.sin(Math.PI * s), 0.75);
    pts.push(new THREE.Vector2(Math.max(r, 0.05), s));
  }
  return new THREE.LatheGeometry(pts, 12);
}

/**
 * @typedef {Object} Fibre
 * @property {number[]} origin     on the cranium (cm, skull frame)
 * @property {number[]} [via]      optional waypoint on the cranium (wraps the fossa)
 * @property {number[]} insertion  on the mandible, CLOSED-jaw position (cm, skull frame)
 * @property {number} r            resting radius (cm)
 */

/**
 * Human temporalis (fan) and masseter for the LEFT side. Points are
 * approximate (cm); `snap` re-seats them on the bone so the bundles lie on it.
 * origin/via: on the cranium; insertion: on the mandible (closed jaw).
 */
export const HUMAN_MUSCLES = (() => {
  const temporalis = [];
  // origins along the inferior temporal line, fanning from the front to the back
  for (let i = 0; i < 13; i++) {
    const a = (i / 12) * Math.PI * 0.82 + 0.2; // radians around the arc
    const z = 0.4 + Math.cos(a) * 5.9;
    const y = 1.7 + Math.sin(a) * 5.2;
    const ins = [4.12, -0.95 - i * 0.095, 4.05 - i * 0.075];
    const via = [6.0, 1.15 + (y - 1.7) * 0.12, z * 0.42 + 2.1];
    temporalis.push({ origin: [7.5, y, z], via, insertion: ins, r: 0.3 - Math.abs(i - 4) * 0.01 });
  }
  const masseter = [];
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const o = [6.2, -1.15 + t * 0.12, 5.4 - t * 3.6]; // lower border of the arch, front → back
    const ins = [5.6, -6.3 + Math.sin(t * Math.PI) * 0.35, 4.0 - t * 2.3]; // lateral ramus near the angle
    masseter.push({ origin: o, insertion: ins, r: 0.36 - t * 0.06 });
  }
  return { temporalis, masseter };
})();

/**
 * Re-seat a point on a surface by casting along −x from outside (left side),
 * then lifting it `lift` cm off the bone.
 */
function snapX(sdf, p, lift) {
  if (!sdf) return p;
  const o = [p[0] + 6, p[1], p[2]];
  const t = raycast(sdf, o, [-1, 0, 0], 14, 0.7);
  if (t < 0) return p;
  return [o[0] - t + lift, p[1], p[2]];
}

/**
 * Build both muscles on both sides as one InstancedMesh.
 * @param {object} ctx  a (lithograph) FigureContext
 * @param {{ temporalis: Fibre[], masseter: Fibre[] }} spec
 * @param {{ pivot: number[], cranium?: object, mandible?: object }} o  TMJ hinge (cm) and the
 *        SDFs used to seat the fibres on the bone
 * @returns {{ object: THREE.InstancedMesh, update: (angle:number, glide:number[]|null)=>void, dispose: ()=>void,
 *            anchors: { temporalis: THREE.Object3D, masseter: THREE.Object3D } }}
 */
export function buildMuscles(ctx, spec, { pivot, cranium = null, mandible = null }) {
  const fibres = [];
  const seated = {};
  for (const name of ['temporalis', 'masseter']) {
    seated[name] = spec[name].map((f) => ({
      r: f.r,
      origin: snapX(cranium, f.origin, f.r * 0.75),
      via: f.via ? snapX(cranium, f.via, f.r * 0.9) : null,
      insertion: snapX(mandible, f.insertion, f.r * 0.6),
    }));
  }
  for (const side of [1, -1]) {
    for (const name of ['temporalis', 'masseter']) {
      for (const f of seated[name]) {
        const mirror = (p) => (p ? [p[0] * side, p[1], p[2]] : null);
        const o = mirror(f.origin), v = mirror(f.via), ins = mirror(f.insertion);
        // each segment keeps its closed-jaw (rest) length for volume preservation
        if (v) {
          fibres.push({ a: o, b: v, moving: false, r: f.r, L0: dist(o, v), side });
          fibres.push({ a: v, b: ins, moving: true, r: f.r * 0.9, L0: dist(v, ins), side });
        } else {
          fibres.push({ a: o, b: ins, moving: true, r: f.r, L0: dist(o, ins), side });
        }
      }
    }
  }
  const geo = spindleGeometry();
  const mat = ctx.ink({
    color: '#b24a3a', svgColor: '#b24a3a', roughness: 0.6, name: 'muscle',
    hatchCoord: uv().x.mul(9), hatchLod: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, fibres.length);
  mesh.name = 'muscles';
  mesh.frustumCulled = false;
  ctx.outline(mesh, { width: 0.75 });

  const piv = new THREE.Vector3(...pivot);
  const anchors = { temporalis: new THREE.Object3D(), masseter: new THREE.Object3D() };
  const tm = seated.temporalis[4], ms = seated.masseter[3];
  anchors.temporalis.position.set(...tm.origin).lerp(new THREE.Vector3(...tm.via), 0.4);
  anchors.temporalis.position.x += 0.3;
  anchors.masseter.position.set(...ms.origin).lerp(new THREE.Vector3(...ms.insertion), 0.5);
  anchors.masseter.position.x += 0.4;
  mesh.add(anchors.temporalis, anchors.masseter);

  let lastA = NaN, lastGy = NaN, lastGz = NaN;
  /**
   * Pose the fibres for a jaw opening `angle` (rad) and condylar glide (cm).
   * Skips work when the jaw has not moved (no allocations per frame).
   */
  function update(angle, glide = null) {
    const gy = glide ? glide[1] : 0, gz = glide ? glide[2] : 0;
    if (angle === lastA && gy === lastGy && gz === lastGz) return;
    lastA = angle; lastGy = gy; lastGz = gz;
    _r.makeRotationX(angle);
    let i = 0;
    for (const f of fibres) {
      _a.set(f.a[0], f.a[1], f.a[2]);
      _b.set(f.b[0], f.b[1], f.b[2]);
      if (f.moving) {
        _b.sub(piv).applyMatrix4(_r).add(piv);
        if (glide) _b.x += glide[0], _b.y += glide[1], _b.z += glide[2];
      }
      _d.subVectors(_b, _a);
      const L = Math.max(_d.length(), 1e-4);
      _d.multiplyScalar(1 / L);
      // constant volume: a stretched bundle thins, a shortened one bulges
      const r = f.r * Math.min(1.4, Math.max(0.65, Math.sqrt(f.L0 / L)));
      // a flat ribbon: thin along the (lateral) surface normal, wide across the fibre
      _n.set(f.side, 0, 0).addScaledVector(_d, -_d.x * f.side).normalize();
      _w.crossVectors(_d, _n).normalize();
      _m.makeBasis(_w, _d, _n);
      _q.setFromRotationMatrix(_m);
      _s.set(r * 1.75, L, r * 0.55);
      _m.compose(_a, _q, _s);
      mesh.setMatrixAt(i++, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return {
    object: mesh,
    anchors,
    update,
    dispose() {
      geo.dispose();
      mat.dispose();
      mesh.userData.outline?.material?.dispose?.();
    },
  };
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

