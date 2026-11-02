// Skull rig: turns meshed SDF models into a hostable 3D skull — one wrapper
// per bone (so bones colour, label and explode individually), a hinged jaw
// that rotates and glides at the temporomandibular joint, teeth quadrants
// that travel with their bones, ink sutures, and a faceted "planes" block-in.
//
// Why wrappers: the FigureHost explodes `part.object` by moving it; lessons
// animate the mesh INSIDE the wrapper, so a user's dissection and a lesson's
// own explode loop compose instead of overwriting each other.
import * as THREE from 'three/webgpu';
import { attribute, uniform, mix, select, frontFacing, color as tslColor, positionLocal, vec3, dot, atan } from 'three/tsl';
import { meshModel, toGeometry, toFacetedGeometry, cellFor, createOccluder } from '../../kits/sdf/index.js';
import { guideSegments, chainsToPairs } from './guides.js';

export const IVORY = '#ece2cc';
export const TOOTH = '#f3ecda';

/**
 * @typedef {Object} SkullSpec
 * @property {string} set              SDF model set ('skulls')
 * @property {{cranium:string, mandible:string, teeth:string, planes?:string}} models
 * @property {Array<{id:string,label:string,name:string,color:string}>} bones  cranium bones (label order)
 * @property {{id:string,name:string,color:string}} mandible
 * @property {{cranium:number, mandible:number, teeth:number, planes:number}} cells  base cell sizes (cm)
 * @property {number[]} pivot          TMJ hinge point (cm, skull frame)
 * @property {number[]} centre         rotation centre of the skull (cm)
 * @property {string[]} [lines]        iso-line fields to extract from the cranium
 * @property {(a:string,b:string)=>string} [sutureClass]
 * @property {(id:string, centroid:THREE.Vector3)=>THREE.Vector3} [explodeFor]
 * @property {(id:string)=>number[]|null} [hatchDir]  skull-space slicing direction for a bone's
 *   engraved lines (null: the ink kit's page-space contours)
 * @property {{z0:number, kx:number, r:number}} [toothHatch]  dental arch for the teeth's strokes
 */

/**
 * Mesh and assemble a skull.
 * @param {SkullSpec} spec
 * @param {object} ctx FigureContext
 * @param {{ quality?: string|number }} [o]
 */
export async function buildSkullRig(spec, ctx, o = {}) {
  const q = o.quality ?? 'high';
  const t0 = performance.now();
  // bones and teeth come with a BVH built in the worker: their label-occlusion
  // stand-ins (createOccluder → userData.occluder, read by FigureHost) answer a
  // ray exactly as the mesh would, without testing ~310k triangles one by one
  const [cr, md, tu, tl, pl] = await Promise.all([
    meshModel({ set: spec.set, model: spec.models.cranium, cell: cellFor(spec.cells.cranium, q), options: { lines: spec.lines ?? [], bvh: true } }),
    meshModel({ set: spec.set, model: spec.models.mandible, cell: cellFor(spec.cells.mandible, q), options: { regions: false, lines: ['centre'], bvh: true } }),
    meshModel({ set: spec.set, model: spec.models.teeth, params: { jaw: 'upper' }, cell: cellFor(spec.cells.teeth, q), options: { bvh: true } }),
    meshModel({ set: spec.set, model: spec.models.teeth, params: { jaw: 'lower' }, cell: cellFor(spec.cells.teeth, q), options: { bvh: true } }),
    spec.models.planes
      ? meshModel({ set: spec.set, model: spec.models.planes, cell: spec.cells.planes, options: { regions: false } })
      : Promise.resolve(null),
  ]);
  const meshMs = performance.now() - t0;

  const group = new THREE.Group();
  group.name = 'skull';
  group.position.set(-spec.centre[0], -spec.centre[1], -spec.centre[2]);

  // shared uniforms: colour amount (bones layer) and the lesson reveals
  const u = {
    colour: uniform(0),
    skull: uniform(1), // engraved/coloured skull reveal
    planes: uniform(0), // faceted block-in reveal
    sutures: uniform(1),
    teeth: uniform(1),
  };

  const disposables = [];
  const materials = [];
  const ivory = tslColor(new THREE.Color(IVORY));

  // Engraved lines as planar slices of the skull itself (lines at integers,
  // the kit's density): they ride with the bone through turns, gapes and
  // dissections, and a direction can be chosen where the page-space default
  // would ring a small dome or corrugate a thin bar.
  const slices = (d) => {
    const L = Math.hypot(d[0], d[1], d[2]) || 1;
    return dot(positionLocal, vec3(d[0] / L, d[1] / L, d[2] / L)).mul(ctx.u.hatchFreq);
  };

  const boneMaterial = (hex, hasAO, doubleSide = true, hatchDir = null) => {
    let c = mix(ivory, tslColor(new THREE.Color(hex)), u.colour);
    if (hasAO) c = c.mul(attribute('ao', 'float').mul(0.62).add(0.38));
    if (doubleSide) c = select(frontFacing, c, c.mul(0.6)); // cut faces of exploded plates
    const mat = ctx.ink({
      colorNode: c, color: hex, svgColor: hex, roughness: 0.74,
      side: doubleSide ? THREE.DoubleSide : THREE.FrontSide, name: 'bone',
      hatchCoord: hatchDir ? slices(hatchDir) : undefined,
    });
    if (hasAO) mat.aoNode = attribute('ao', 'float');
    materials.push(mat);
    return mat;
  };

  const bones = new Map(); // id → { wrapper, mesh, inner, def, centroid }
  const cranium = new THREE.Group();
  cranium.name = 'cranium';
  group.add(cranium);

  const makeBone = (def, arrays, parent, pivotOffset = null, doubleSide = true) => {
    const wrapper = new THREE.Group();
    wrapper.name = def.id;
    const inner = new THREE.Group(); // lesson-driven offset (explode loop)
    wrapper.add(inner);
    const geo = toGeometry(arrays);
    const mesh = new THREE.Mesh(geo, boneMaterial(def.color, !!arrays.ao, doubleSide, spec.hatchDir?.(def.id) ?? null));
    mesh.name = `${def.id}:mesh`;
    mesh.userData.occluder = createOccluder(mesh, arrays.bvh);
    ctx.outline(mesh, { width: 1 });
    inner.add(mesh);
    if (pivotOffset) wrapper.position.set(-pivotOffset[0], -pivotOffset[1], -pivotOffset[2]);
    parent.add(wrapper);
    geo.computeBoundingBox();
    const centroid = geo.boundingBox.getCenter(new THREE.Vector3());
    const rec = { def, wrapper, inner, mesh, centroid };
    bones.set(def.id, rec);
    disposables.push(geo);
    return rec;
  };

  for (const r of cr.regions) {
    const def = spec.bones[r.label];
    if (!def) continue;
    makeBone(def, r, cranium);
  }

  // jaw: hinge at the TMJ; the hinge itself moves with the condylar glide
  // (setJaw), the inner slide group stays at its origin
  const jaw = new THREE.Group();
  jaw.name = 'jaw-hinge';
  jaw.position.set(...spec.pivot);
  const jawSlide = new THREE.Group();
  jawSlide.name = 'jaw-slide';
  jaw.add(jawSlide);
  group.add(jaw);
  const mandible = makeBone(spec.mandible, md.mesh, jawSlide, spec.pivot, false);

  // teeth quadrants (label 0 = right, 1 = left). Their strokes run along each
  // crown — slices through the dental arch's axis, ordered round the arch —
  // so cusps seen from above never show contour rings.
  const th = spec.toothHatch;
  const toothCoord = th ? atan(positionLocal.x.abs().mul(th.kx), positionLocal.z.sub(th.z0)).mul(th.r).mul(ctx.u.hatchFreq) : undefined;
  const toothMat = ctx.ink({ color: TOOTH, svgColor: TOOTH, roughness: 0.42, name: 'tooth', hatch: 0.85, hatchCoord: toothCoord });
  materials.push(toothMat);
  const teeth = new Map();
  const addTeeth = (res, jawName, parent, pivotOffset) => {
    for (const r of res.regions ?? [{ label: 1, ...res.mesh }]) {
      const id = `teeth-${jawName}-${r.label === 0 ? 'right' : 'left'}`;
      const wrapper = new THREE.Group();
      wrapper.name = id;
      const inner = new THREE.Group();
      wrapper.add(inner);
      const geo = toGeometry(r);
      const mesh = new THREE.Mesh(geo, toothMat);
      mesh.name = `${id}:mesh`;
      mesh.userData.occluder = createOccluder(mesh, r.bvh);
      ctx.outline(mesh, { width: 0.8 });
      inner.add(mesh);
      if (pivotOffset) wrapper.position.set(-pivotOffset[0], -pivotOffset[1], -pivotOffset[2]);
      parent.add(wrapper);
      disposables.push(geo);
      teeth.set(id, { wrapper, inner, mesh, side: r.label === 0 ? 'right' : 'left', jaw: jawName });
    }
  };
  addTeeth(tu, 'upper', cranium, null);
  addTeeth(tl, 'lower', jawSlide, spec.pivot);

  // sutures: one batched line object per class
  const sutures = new THREE.Group();
  sutures.name = 'sutures';
  group.add(sutures);
  const sutureLines = [];
  const byClass = new Map();
  for (const seam of cr.seams ?? []) {
    const a = spec.bones[seam.a]?.id, b = spec.bones[seam.b]?.id;
    if (!a || !b) continue;
    const cls = spec.sutureClass?.(a, b) ?? 'other';
    if (!byClass.has(cls)) byClass.set(cls, []);
    byClass.get(cls).push(...seam.chains);
  }
  for (const [cls, chains] of byClass) {
    const pairs = chainsToPairs(chains, 0.035, 0.45);
    if (!pairs.length) continue;
    const line = guideSegments(ctx, pairs, { width: cls === 'other' ? 0.75 : 0.95, color: ctx.palette?.ink, name: `suture:${cls}` });
    line.object.userData.sutureClass = cls;
    sutures.add(line.object);
    sutureLines.push(line);
  }

  // temporal lines: faint ridges where the temporalis fascia attaches
  if (cr.lines?.temporalLine?.length) {
    const pairs = chainsToPairs(cr.lines.temporalLine, 0.03, 1.0);
    if (pairs.length) {
      const line = guideSegments(ctx, pairs, { width: 0.65, color: '#776f62', name: 'temporal-lines' });
      sutures.add(line.object);
      sutureLines.push(line);
    }
  }

  // faceted block-in (the "planes" stage of a drawing)
  let planes = null;
  if (pl) {
    const geo = toFacetedGeometry(pl.mesh);
    const mat = ctx.ink({ color: IVORY, svgColor: IVORY, roughness: 0.9, name: 'planes' });
    materials.push(mat);
    planes = new THREE.Mesh(geo, mat);
    planes.name = 'planes';
    // a transient drawing stage: the SVG exporter leaves it out (its canonical
    // opt-out, userData.export = 'skip'; the figure lifts it each frame while
    // Engraving and Bones are off and the block-in is the only form shown),
    // and its coarse facets never catch a pick or hide a label from the
    // occlusion test (the bones under it answer both)
    planes.userData.export = 'skip';
    planes.raycast = () => {};
    ctx.outline(planes, { width: 1.1 });
    group.add(planes);
    disposables.push(geo);
  }

  // explode vectors (cm, in the parent space of each wrapper)
  const explode = new Map();
  for (const [id, rec] of bones) {
    const v = spec.explodeFor ? spec.explodeFor(id, rec.centroid.clone()) : rec.centroid.clone().sub(new THREE.Vector3(...spec.centre)).normalize().multiplyScalar(4);
    explode.set(id, v);
  }
  for (const [id, t] of teeth) {
    const owner = t.jaw === 'upper' ? `maxilla-${t.side}` : spec.mandible.id;
    explode.set(id, (explode.get(owner) ?? new THREE.Vector3()).clone());
  }

  /**
   * Open the jaw: angle (rad, positive opens) about the condyles, and the
   * condylar glide (cm, skull frame). The glide moves the hinge itself —
   * forward and down onto the eminence, measured on the cranium — so it is
   * applied to the hinge's position, not inside the rotated jaw frame
   * (where it would tip downwards with the gape). Muscles use the same rule.
   */
  const setJaw = (angle, glide = null) => {
    jaw.rotation.x = angle;
    const p = spec.pivot;
    if (glide) jaw.position.set(p[0] + glide[0], p[1] + glide[1], p[2] + glide[2]);
    else jaw.position.set(p[0], p[1], p[2]);
  };

  /** Lesson explode loop: move every bone mesh (inner) by vector × a. */
  const setInnerExplode = (a) => {
    for (const [id, rec] of bones) rec.inner.position.copy(explode.get(id)).multiplyScalar(a);
    for (const [id, t] of teeth) t.inner.position.copy(explode.get(id)).multiplyScalar(a);
  };

  return {
    group, cranium, jaw, jawSlide, bones, teeth, mandible, sutures, sutureLines, planes, explode, u,
    // how far the bones have parted (0 together … 1 fully exploded): the
    // reader's Explode composed with a lesson's own explode loop, written
    // each frame by the figure; sockets and seams exist only while it is small
    apart: 0,
    lines: cr.lines ?? {}, mandibleLines: md.lines ?? {},
    stats: { meshMs: +meshMs.toFixed(1), cranium: cr.stats, mandible: md.stats, teethUpper: tu.stats, teethLower: tl.stats, planes: pl?.stats },
    setJaw,
    setInnerExplode,
    dispose() {
      for (const g of disposables) g.dispose();
      for (const m of materials) m.dispose();
      for (const l of sutureLines) l.dispose();
      group.traverse((obj) => {
        if (obj.userData.isOutline) obj.material?.dispose?.();
      });
    },
  };
}

/**
 * Tight bounding box of every visible mesh below `root`, in `root`'s space,
 * from (subsampled) vertices — transforming each mesh's own AABB would
 * balloon the box of a tilted skull by its rotated corners.
 * Instanced meshes are bounded by their instance positions ± a margin.
 */
export function meshBox(root, box = new THREE.Box3(), stride = 5) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const m = new THREE.Matrix4();
  const im = new THREE.Matrix4();
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || o.userData.isOutline || o.userData.noFit || !o.visible || o.isLine2 || o.isLineSegments2) return;
    m.multiplyMatrices(inv, o.matrixWorld);
    if (o.isInstancedMesh) {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, im);
        v.setFromMatrixPosition(im).applyMatrix4(m);
        box.expandByPoint(v);
      }
      return;
    }
    const pos = o.geometry.getAttribute('position');
    if (!pos) return;
    for (let i = 0; i < pos.count; i += stride) box.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(m));
  });
  return box;
}
