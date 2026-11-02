// Snake skeleton for the x-ray layer: hundreds of vertebrae as one
// InstancedMesh, a pair of ribs on every trunk vertebra (none on the tail,
// and no sternum), and — for boas — the vestigial pelvic girdle and femur
// that end outside the body as the cloacal spurs.
//
// Instances are re-posed every frame straight from the spine frames (no
// allocations): local +X = forward (towards the head), +Y = dorsal,
// +Z = the animal's right, scaled by the local body radius.
import * as THREE from 'three/webgpu';
import { buildTube, catmullRom } from '../../kits/tube/index.js';

/** One vertebra in unit space: centrum along X, neural spine up, zygapophyses out. */
function vertebraGeometry() {
  const parts = [];
  const centrum = new THREE.CylinderGeometry(0.2, 0.22, 0.86, 10, 1);
  centrum.rotateZ(Math.PI / 2);
  parts.push(centrum);
  const spine = new THREE.BoxGeometry(0.5, 0.36, 0.07, 1, 1, 1);
  spine.translate(-0.06, 0.32, 0);
  parts.push(spine);
  const arch = new THREE.SphereGeometry(0.26, 10, 8);
  arch.scale(1.3, 0.8, 1.1);
  arch.translate(0, 0.12, 0);
  parts.push(arch);
  for (const side of [1, -1]) {
    const z = new THREE.SphereGeometry(0.1, 8, 6);
    z.scale(1.4, 0.7, 1);
    z.translate(0.3, 0.1, side * 0.3);
    parts.push(z);
  }
  return mergeIndexed(parts);
}

function mergeIndexed(geos) {
  let nv = 0, ni = 0;
  for (const g of geos) {
    if (g.attributes.uv) g.deleteAttribute('uv');
    nv += g.attributes.position.count;
    ni += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3);
  const idx = new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const g of geos) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.array[i] + vo;
    else for (let i = 0; i < g.attributes.position.count; i++) idx[io++] = i + vo;
    vo += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

/**
 * One rib in unit section space, relative to its vertebra (which sits a
 * little above the body's centre line): out over the flank, around and down
 * towards the belly, swept slightly back.
 */
function ribGeometry(side) {
  const ctrl = [
    [0, 0.02, 0.12], [-0.03, 0.2, 0.5], [-0.08, -0.07, 0.84], [-0.13, -0.47, 0.8], [-0.18, -0.67, 0.55],
  ];
  const pts = catmullRom(Float32Array.from(ctrl.flatMap((p) => [p[0], p[1], side * p[2]])), { samples: 6 });
  return buildTube(pts, { radius: (u) => 0.05 - u * 0.028, rings: 16, radial: 6, startCap: 'round', endCap: 'round', up: [1, 0, 0] });
}

/**
 * @param {object} ctx  FigureContext
 * @param {object} o
 * @param {number} o.vertebrae   total vertebrae (trunk + tail)
 * @param {number} o.trunk       vertebrae that carry ribs (precloacal)
 * @param {number} o.sStart      arc length of the first vertebra (cm, behind the skull)
 * @param {number} o.sCloaca
 * @param {number} o.sEnd        arc length of the last caudal vertebra
 * @param {boolean} [o.pelvis]   boa: vestigial pelvis + femur
 */
export function buildSkeleton(ctx, o) {
  const group = new THREE.Group();
  group.name = 'skeleton';
  const boneMat = ctx.ink({ color: '#ebe0c8', roughness: 0.65, svgColor: '#ebe0c8', name: 'vertebra', hatch: 0.6 });
  const vGeo = vertebraGeometry();
  const verts = new THREE.InstancedMesh(vGeo, boneMat, o.vertebrae);
  verts.name = 'vertebrae';
  verts.frustumCulled = false;
  verts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ctx.outline(verts, { width: 0.45 });
  group.add(verts);

  const ribMat = ctx.ink({ color: '#e6dac0', roughness: 0.7, svgColor: '#e6dac0', name: 'rib', hatch: 0.5 });
  const ribGeos = [ribGeometry(1), ribGeometry(-1)];
  const nRibs = Math.max(0, o.trunk - 3); // no ribs on the atlas/axis region
  const ribs = ribGeos.map((g, i) => {
    const m = new THREE.InstancedMesh(g, ribMat, nRibs);
    m.name = i ? 'ribs-left' : 'ribs-right';
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(m);
    return m;
  });

  // boa: the vestigial pelvis and femur, ending outside as the spur
  let pelvis = null;
  if (o.pelvis) {
    pelvis = new THREE.Group();
    pelvis.name = 'pelvic-girdle';
    for (const side of [1, -1]) {
      const g = buildTube([0.9, 0.25, side * 0.42, 0.2, -0.1, side * 0.55, -0.45, -0.55, side * 0.7], {
        radius: (u) => 0.07 - u * 0.025, rings: 12, radial: 6,
      });
      const m = new THREE.Mesh(g, boneMat);
      ctx.outline(m, { width: 0.45 });
      pelvis.add(m);
    }
    group.add(pelvis);
  }

  const tmp = new Float32Array(12);
  const bounds = new THREE.Sphere();
  /**
   * Pose every instance from the spine.
   * @param {import('../../kits/tube/index.js').Spine} spine
   */
  function update(spine) {
    const vm = verts.instanceMatrix.array;
    const n = o.vertebrae;
    const trunkEnd = o.sCloaca;
    for (let k = 0; k < n; k++) {
      const s = k < o.trunk
        ? o.sStart + (k / Math.max(1, o.trunk)) * (trunkEnd - o.sStart)
        : trunkEnd + ((k - o.trunk) / Math.max(1, n - o.trunk)) * (o.sEnd - trunkEnd);
      const f = spine.indexAt(s);
      spine.frameAt(f, tmp);
      const i = Math.min(spine.count - 1, Math.round(f));
      const w = spine.w[i], h = spine.h[i];
      const r = (w + h) * 0.5;
      const spacing = k < o.trunk ? (trunkEnd - o.sStart) / o.trunk : (o.sEnd - trunkEnd) / Math.max(1, n - o.trunk);
      const ax = spacing * 1.05, ay = r * 0.62, az = r * 0.62;
      // forward = −T, up = B, right = R
      const px = tmp[0] + tmp[6] * h * 0.22, py = tmp[1] + tmp[7] * h * 0.22, pz = tmp[2] + tmp[8] * h * 0.22;
      writeMatrix(vm, k * 16, -tmp[3] * ax, -tmp[4] * ax, -tmp[5] * ax, tmp[6] * ay, tmp[7] * ay, tmp[8] * ay, tmp[9] * az, tmp[10] * az, tmp[11] * az, px, py, pz);
      if (k >= 3 && k < o.trunk) {
        const j = k - 3;
        const sx = r * 0.6, sy = h * 0.95, sz = w * 0.86;
        for (const m of ribs) {
          writeMatrix(m.instanceMatrix.array, j * 16, -tmp[3] * sx, -tmp[4] * sx, -tmp[5] * sx, tmp[6] * sy, tmp[7] * sy, tmp[8] * sy, tmp[9] * sz, tmp[10] * sz, tmp[11] * sz, px, py, pz);
        }
      }
    }
    verts.instanceMatrix.needsUpdate = true;
    for (const m of ribs) m.instanceMatrix.needsUpdate = true;
    // Raycasts (picking, label occlusion) cull the instances by one sphere,
    // which three computes once: keep it on this pose. The bones lie inside
    // the body, so the spine's box grown by the body's radius bounds them all
    // (a few µs, against 0.04–0.09 ms for InstancedMesh.computeBoundingSphere).
    const P = spine.pos;
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity, r = 0;
    for (let k = 0; k < spine.count; k++) {
      const x = P[k * 3], y = P[k * 3 + 1], z = P[k * 3 + 2];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
      r = Math.max(r, spine.w[k], spine.h[k]);
    }
    bounds.center.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    bounds.radius = 0.5 * Math.hypot(x1 - x0, y1 - y0, z1 - z0) + r * 1.5;
    (verts.boundingSphere ??= new THREE.Sphere()).copy(bounds);
    for (const m of ribs) (m.boundingSphere ??= new THREE.Sphere()).copy(bounds);
    if (pelvis) {
      const f = spine.indexAt(o.sCloaca - 1.5);
      spine.frameAt(f, tmp);
      const i = Math.round(f);
      const r = (spine.w[i] + spine.h[i]) * 0.5;
      const mtx = pelvis.matrix;
      pelvis.matrixAutoUpdate = false;
      mtx.set(
        -tmp[3] * r, tmp[6] * r, tmp[9] * r, tmp[0],
        -tmp[4] * r, tmp[7] * r, tmp[10] * r, tmp[1],
        -tmp[5] * r, tmp[8] * r, tmp[11] * r, tmp[2],
        0, 0, 0, 1
      );
      pelvis.matrixWorldNeedsUpdate = true;
    }
  }

  return {
    group,
    vertebrae: verts,
    ribs,
    pelvis,
    update,
    parts: [
      { id: 'vertebrae', name: 'Vertebrae', object: verts, color: '#ebe0c8', layer: 'skeleton' },
      { id: 'ribs-right', name: 'Ribs (right)', object: ribs[0], color: '#e6dac0', layer: 'skeleton' },
      { id: 'ribs-left', name: 'Ribs (left)', object: ribs[1], color: '#e6dac0', layer: 'skeleton' },
      ...(pelvis ? [{ id: 'pelvic-girdle', name: 'Vestigial pelvis', object: pelvis, color: '#ebe0c8', layer: 'skeleton' }] : []),
    ],
    dispose() {
      verts.dispose();
      for (const m of ribs) m.dispose();
      vGeo.dispose();
      for (const g of ribGeos) g.dispose();
      boneMat.dispose();
      ribMat.dispose();
      if (pelvis) for (const m of pelvis.children) m.geometry.dispose();
    },
  };
}

/** Column-major 4×4 from basis columns X, Y, Z and translation. */
function writeMatrix(a, o, xx, xy, xz, yx, yy, yz, zx, zy, zz, px, py, pz) {
  a[o] = xx; a[o + 1] = xy; a[o + 2] = xz; a[o + 3] = 0;
  a[o + 4] = yx; a[o + 5] = yy; a[o + 6] = yz; a[o + 7] = 0;
  a[o + 8] = zx; a[o + 9] = zy; a[o + 10] = zz; a[o + 11] = 0;
  a[o + 12] = px; a[o + 13] = py; a[o + 14] = pz; a[o + 15] = 1;
}
