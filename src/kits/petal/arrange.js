// Floral arrangement: whorls, spirals (phyllotaxis) and hinged organs.
//
// Flowers are built in a "flower frame": +Y is the floral axis (the way the
// flower faces), +Z its dorsal side (12 o'clock on the face). A perianth
// member is mounted on a three-level hinge so a bloom can open by rotating
// one Euler angle:  azimuth group (about the axis) → hinge (about the
// tangent, 0 = closed bud along the axis, π/2 = spread flat, > π/2 reflexed)
// → the blade itself, flipped so its adaxial face looks at the axis.
import * as THREE from 'three/webgpu';

/** The golden angle (≈137.508°) of spiral phyllotaxis, in radians. */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();

/**
 * Orient an object so its local +Y points along `forward` and its local +Z
 * leans towards `up` (projected perpendicular to forward).
 * @param {THREE.Object3D} obj
 * @param {THREE.Vector3|number[]} forward
 * @param {THREE.Vector3|number[]} [up=[0,1,0]]
 */
export function orient(obj, forward, up = [0, 1, 0]) {
  _y.set(...(forward.isVector3 ? forward.toArray() : forward)).normalize();
  _z.set(...(up.isVector3 ? up.toArray() : up));
  _z.addScaledVector(_y, -_z.dot(_y));
  if (_z.lengthSq() < 1e-8) _z.set(0, 0, 1).addScaledVector(_y, -_y.z);
  _z.normalize();
  _x.crossVectors(_y, _z);
  _m.makeBasis(_x, _y, _z);
  obj.quaternion.setFromRotationMatrix(_m);
  return obj;
}

/**
 * Evenly spaced azimuths for a whorl of `count` members.
 * @param {number} count
 * @param {number} [offset=0] rad
 * @returns {number[]}
 */
export function whorl(count, offset = 0) {
  return Array.from({ length: count }, (_, i) => offset + (i / count) * Math.PI * 2);
}

/**
 * Spiral (phyllotactic) placement: i-th member at angle i·divergence.
 * @param {number} count
 * @param {{ divergence?: number, offset?: number }} [o]
 * @returns {Array<{ i: number, angle: number, f: number }>} f = i / (count-1)
 */
export function phyllotaxis(count, { divergence = GOLDEN_ANGLE, offset = 0 } = {}) {
  return Array.from({ length: count }, (_, i) => ({
    i,
    angle: offset + i * divergence,
    f: count > 1 ? i / (count - 1) : 0,
  }));
}

/**
 * Mount a blade mesh on a hinge at the receptacle.
 * @param {THREE.Object3D} mesh   blade built along +Y with adaxial +Z
 * @param {object} o
 * @param {number} o.azimuth     rad about the floral axis (0 = dorsal, +Z)
 * @param {number} [o.radius=0]  cm from the axis to the hinge
 * @param {number} [o.height=0]  cm along the axis
 * @param {number} [o.open=1.2]  hinge angle (0 bud … π/2 flat … reflexed)
 * @param {number} [o.roll=0]    rad roll about the blade's own axis
 * @returns {{ az: THREE.Group, hinge: THREE.Group, mesh: THREE.Object3D }}
 */
export function mountOnHinge(mesh, { azimuth, radius = 0, height = 0, open = 1.2, roll = 0 }) {
  const az = new THREE.Group();
  az.name = `${mesh.name || 'organ'}:az`;
  az.rotation.y = azimuth;
  const hinge = new THREE.Group();
  hinge.name = `${mesh.name || 'organ'}:hinge`;
  hinge.position.set(0, height, radius);
  hinge.rotation.x = open;
  mesh.rotation.set(0, Math.PI + roll, 0);
  az.add(hinge);
  hinge.add(mesh);
  return { az, hinge, mesh };
}

/** Seamless periodic helpers for 5-second loops. */
export const loop = {
  /** sin with an integer number of cycles over the loop */
  wave: (t, cycles = 1, phase = 0, period = 5) => Math.sin(((t / period) * cycles + phase) * Math.PI * 2),
  /**
   * Piecewise envelope: 0 before a, rises to 1 at b, holds, falls from c to 0
   * at d (all in seconds within [0, period)). Smootherstep edges.
   */
  envelope: (t, a, b, c, d) => {
    if (t <= a || t >= d) return 0;
    if (t < b) return smoother((t - a) / (b - a));
    if (t <= c) return 1;
    return 1 - smoother((t - c) / (d - c));
  },
};

/**
 * Relax unit flower axes on the sphere until every pair is at least
 * `minAngle` apart, keeping each within `maxPolar` of the cluster's mean
 * direction `base`. A crowded cluster of trumpets then keeps its limbs
 * clear of each other instead of interpenetrating.
 * Pairwise pushes along great circles; deterministic; build time only.
 * @param {THREE.Vector3[]} axes unit vectors, relaxed in place
 * @param {THREE.Vector3} base unit vector
 * @param {number} minAngle rad
 * @param {number} maxPolar rad
 * @param {number} [iterations=200]
 * @returns {THREE.Vector3[]} axes
 */
export function spreadAxes(axes, base, minAngle, maxPolar, iterations = 200) {
  const ta = new THREE.Vector3();
  const tb = new THREE.Vector3();
  const cosMin = Math.cos(minAngle);
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < axes.length; i++) {
      for (let j = i + 1; j < axes.length; j++) {
        const a = axes[i], b = axes[j];
        const c = a.dot(b);
        if (c <= cosMin) continue;
        // tangents at a and b pointing away from each other
        ta.copy(a).multiplyScalar(c).sub(b);
        tb.copy(b).multiplyScalar(c).sub(a);
        if (ta.lengthSq() < 1e-12) ta.set(-a.z, 0, a.x);
        if (tb.lengthSq() < 1e-12) tb.set(b.z, 0, -b.x);
        const step = Math.tan(0.5 * (minAngle - Math.acos(Math.min(1, c))) + 0.002);
        a.addScaledVector(ta.normalize(), step).normalize();
        b.addScaledVector(tb.normalize(), step).normalize();
      }
    }
    // stay within the cap around the cluster's direction
    for (const a of axes) {
      const c = a.dot(base);
      if (c >= Math.cos(maxPolar)) continue;
      ta.copy(a).addScaledVector(base, -c).normalize();
      a.copy(base).multiplyScalar(Math.cos(maxPolar)).addScaledVector(ta, Math.sin(maxPolar));
    }
  }
  return axes;
}

/** Perlin's smootherstep on [0, 1]. */
export function smoother(x) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
}
