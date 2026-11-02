// ID-buffer passes for the SVG exporter.
//
// Renders ONE mounted figure, alone and unlit, into RGBA8 targets in which
// every pixel says what it is rather than what it looks like:
//   geometry  R,G = mesh index + 1 (16 bit, 0 = paper) · B,A = view depth over
//             the figure's depth range (16 bit) — occlusion and fold contours
//   shade     R,G,B = albedo (the material's own colour node, unlit, sRGB) ·
//             A = tone band from N·L with the key light (light | base | shadow)
// Regions (one per figure part; meshes outside any part grouped by ink colour)
// are resolved per mesh on the CPU, so a part's colour pattern (rings,
// saddles, bands) comes from the albedo and its folds from depth.
//
// What the plate leaves out: outlines, x-ray ghosts, dissolved layers
// (inkFade < 0.5), see-through washes (transparent and not writing depth:
// wing blur, glass water, a pond's vignette — they fade through opacityNode,
// so `.opacity` stays 1) and whatever a material's own mask hides. Lesson
// reveals AND into material.maskNode, so a masked pass measures how much of
// each mesh its mask keeps; meshes below half go, like the layer-dissolve rule.
//
// The camera is the reader's current view, re-framed with a view offset so the
// figure fills the target. Materials and visibility are swapped and restored
// synchronously around renderer.render(), so the live loop never sees the ID
// materials; only the readbacks are awaited.
//
// Optional subject hooks (all additive):
//   part.swatches = [{ color, name }]   the colours a part's colorNode paints
//                                       (exact fills + names); false = flat
//   part.minPatternPx, part.keepSmall   see raster.js readPattern (an eye's
//                                       pupil and catchlight print)
//   mesh.userData.export = 'skip'       never part of the plate
//   material.userData.exportColorNode   the colour node the plate reads instead
//                                       of colorNode (a skin's pattern without
//                                       the per-scale relief baked into it, so
//                                       its swatches separate cleanly)
//   material.userData.reveals = [u, …]  reveal uniforms ANDed into maskNode
//                                       (read directly instead of measured)
//   figure.keyTime                      the pose exported when the current
//                                       loop time shows no solid form
//   label.alt, label.mark, label.size   a mirror-side anchor (the label takes
//                                       the one facing the camera; face-on,
//                                       the one its disc leaves by), the mark
//                                       ('dot' | 'ring' | 'tick') and the radius
//                                       (cm) of the feature it rings
//   figure.layerShown(id)               a switched-off layer the figure draws
//                                       anyway lends its labels to the key
//
// Names (parts, colours, meshes outside every part) stay English here, as the
// subjects wrote them; the plate translates them (index.js).
import * as THREE from 'three/webgpu';
import {
  Fn, uniform, vec3, vec4, float, bool, floor, select, dot, color as tslColor,
  normalWorld, positionView, workingToColorSpace,
} from 'three/tsl';
import { msg } from '../../i18n/index.js';
import { mirrorAnchor, viewAspect } from '../figures/mirror.js';

const DEFAULT_KEY = new THREE.Vector3(-1.6, 3.4, 1.4).normalize();
/**
 * N·L thresholds of the three tone bands (light | base | shadow). The base
 * colour carries the lit form; the light band is a highlight on the surfaces
 * that face the key, not most of the figure.
 */
export const TONE_BANDS = { light: 0.86, shadow: 0.02 };
/** A mesh whose own mask keeps less than this share of its visible pixels is left out. */
const KEEP_SHARE = 0.5;
/** Width of the mask-coverage pass (it only counts pixels). */
const COVERAGE_WIDTH = 640;

const asArray = (m) => (Array.isArray(m) ? m : m ? [m] : []);

/** Representative sRGB hex of a mesh's material (ink kit records it). */
function inkColorOf(mesh) {
  for (const mt of asArray(mesh.material)) {
    if (mt?.userData?.inkColor) return mt.userData.inkColor;
    if (mt?.color?.isColor) return '#' + mt.color.getHexString();
  }
  return null;
}

/** World-space key light direction (towards the light) from the scene, or the stage default. */
function keyDirection(scene) {
  let best = null;
  scene.traverseVisible((o) => {
    if (!o.isDirectionalLight) return;
    if (!best || (o.castShadow && !best.castShadow) || (o.castShadow === best.castShadow && o.intensity > best.intensity)) best = o;
  });
  if (!best) return DEFAULT_KEY.clone();
  best.updateWorldMatrix(true, false);
  best.target.updateWorldMatrix(true, false);
  const p = new THREE.Vector3().setFromMatrixPosition(best.matrixWorld);
  const t = new THREE.Vector3().setFromMatrixPosition(best.target.matrixWorld);
  const d = p.sub(t);
  return d.lengthSq() > 1e-12 ? d.normalize() : DEFAULT_KEY.clone();
}

/**
 * Is a mesh left out of the plate before any pass? Ghosts (x-ray), dissolved
 * layers, declared reveals below half, explicit opt-outs and see-through washes.
 * @param {THREE.Mesh} mesh
 */
export function isGhost(mesh) {
  const ud = mesh.userData;
  if (ud.export === 'skip' || ud.exportGhost) return true;
  if ((ud.inkFade ?? 1) < 0.5) return true;
  const mats = asArray(mesh.material);
  if (!mats.length) return true;
  return mats.every((m) => !m || m.visible === false
    || (m.userData?.reveals ?? []).some((r) => (r?.value ?? 1) < 0.5)
    || (m.userData?.xray?.value ?? 0) > 0.5
    || (m.transparent && ((m.opacity ?? 1) < 0.35 || m.depthWrite === false)));
}

/** Does a material carry a mask beyond the ink kit's own layer dissolve (e.g. a lesson reveal)? */
function maskToMeasure(m) {
  if (!m?.maskNode) return false;
  if (m.maskNode === m.userData?.inkMask) return false; // the kit's dissolve: inkFade says it all
  if (m.userData?.reveals?.length) return false; // declared reveals: isGhost reads them
  return true;
}

function sceneOf(o) {
  while (o.parent) o = o.parent;
  return o;
}

/** Refresh skinning after a temporary ancestor transform, even within one render frame. */
function updateStagedSkeletons(root) {
  const skeletons = new Set();
  root.traverse((o) => {
    if (o.isSkinnedMesh && o.skeleton) skeletons.add(o.skeleton);
  });
  // Three normally updates a skeleton only once per animation frame. Export
  // stages and restores the book between synchronous passes in that same frame;
  // matrixWorld alone would leave skinning at the previous book transform while
  // rigid attachments (hair, glasses) already use the new one.
  for (const skeleton of skeletons) skeleton.update();
}

/**
 * Put the figure in the state the plate shows, synchronously: the path to it
 * visible (a turning page may hide it), the pop-up standing and — when `time`
 * differs from the live clock — posed at `time` (figures are pure functions of t).
 * @returns {() => void} restore
 */
function stage(mount, time) {
  const figure = mount.figure;
  const root = figure.root;
  const forced = [];
  // an ancestor that bobs for show (the stage floats the whole book) and
  // declares where it rests (userData.restPose) is held there for the pass:
  // a colour plate and its colouring page, exported a moment apart, then see
  // the very same geometry — one frame, the same slivers, the same labels
  const rested = [];
  for (let o = root; o; o = o.parent) {
    if (!o.visible) {
      forced.push(o);
      o.visible = true;
    }
    const rest = o.userData?.restPose;
    if (rest && o !== root) {
      rested.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]);
      applyRestPose(o, rest);
    }
  }
  const fold = mount.fold;
  const foldY = fold ? fold.scale.y : 1;
  if (fold) fold.scale.y = 1;
  const clock = mount.ctx?.u?.time;
  const live = clock?.value ?? 0;
  const repose = clock && typeof figure.update === 'function' && Number.isFinite(time) && Math.abs(time - live) > 1e-4;
  if (repose) {
    figure.update(time, 0, mount.state ?? {});
    clock.value = time;
  }
  const scene = sceneOf(root);
  scene.updateMatrixWorld(true);
  updateStagedSkeletons(root);
  return () => {
    if (repose) {
      figure.update(live, 0, mount.state ?? {});
      clock.value = live;
    }
    if (fold) fold.scale.y = foldY;
    for (const o of forced) o.visible = false;
    for (const [o, p, q, s] of rested) {
      o.position.copy(p);
      o.quaternion.copy(q);
      o.scale.copy(s);
    }
    scene.updateMatrixWorld(true);
    updateStagedSkeletons(root);
  };
}

/**
 * Pose an object at its declared rest: `{ position?, rotation?, quaternion?, scale? }`,
 * each a three.js value or plain numbers ([x, y, z]; a number scales uniformly).
 */
function applyRestPose(o, rest) {
  const v3 = (src, dst) => {
    if (typeof src === 'number') dst.setScalar(src);
    else if (Array.isArray(src)) dst.fromArray(src);
    else dst.set(src.x, src.y, src.z);
  };
  if (rest.position) v3(rest.position, o.position);
  if (rest.quaternion) o.quaternion.copy(rest.quaternion);
  else if (rest.rotation) {
    const r = rest.rotation;
    if (Array.isArray(r)) o.rotation.set(r[0], r[1], r[2], r[3] ?? o.rotation.order);
    else o.rotation.set(r.x, r.y, r.z, r.order ?? o.rotation.order);
  }
  if (rest.scale !== undefined) v3(rest.scale, o.scale);
}

/** Solid meshes and ink lines under root that the plate can show. */
function collect(root, exclude) {
  const meshes = [];
  const lines = [];
  root.traverseVisible((o) => {
    if (o.userData.isOutline) return;
    if (o.userData.isInkLine || o.isLine2 || o.isLineSegments2) {
      if ((o.userData.inkFade ?? 1) >= 0.5) lines.push(o);
      return;
    }
    if (o.isMesh && !isGhost(o) && !exclude?.has(o)) meshes.push(o);
  });
  return { meshes, lines };
}

/** Local points of an ink line as drawn now (guides drawn on stroke by stroke show a prefix). */
function linePoints(line) {
  const pts = line.userData.inkLine?.points;
  if (!pts?.length) return null;
  const n = line.geometry?.instanceCount;
  const segs = pts.length / 3 - 1;
  if (Number.isFinite(n) && n >= 0 && n < segs) return n > 0 ? pts.slice(0, (n + 1) * 3) : null;
  return pts;
}

/** Hide everything that is not `meshes` (siblings along the path, outlines, lines, other meshes). */
let blankMaterial = null;
function isolate(root, meshes) {
  const hidden = [];
  for (let o = root; o.parent; o = o.parent) {
    for (const sib of o.parent.children) {
      if (sib === o || sib.isLight || !sib.visible) continue;
      sib.visible = false;
      hidden.push(sib);
    }
  }
  const keep = new Set(meshes);
  // ancestors of kept meshes must stay visible: they draw nothing instead
  const holders = new Set();
  for (const m of meshes) for (let o = m.parent; o && o !== root; o = o.parent) holders.add(o);
  const blanked = [];
  root.traverse((o) => {
    if (!o.visible || keep.has(o)) return;
    if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite)) return;
    if (holders.has(o)) {
      blankMaterial ??= Object.assign(new THREE.MeshBasicNodeMaterial({ colorWrite: false, depthWrite: false }), { name: 'export-blank' });
      blanked.push([o, o.material]);
      o.material = blankMaterial;
    } else {
      o.visible = false;
      hidden.push(o);
    }
  });
  return () => {
    for (const [o, m] of blanked) o.material = m;
    for (const o of hidden) o.visible = true;
  };
}

/**
 * Frame the figure: the reader's camera re-aimed with a view offset at the
 * screen box of `box`, `W × H` pixels with square pixels.
 */
function frameFigure(camera, box, width, maxHeight, margin) {
  const base = camera.clone();
  camera.matrixWorld.decompose(base.position, base.quaternion, base.scale);
  base.clearViewOffset?.();
  base.updateProjectionMatrix();
  base.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  let nx0 = Infinity, ny0 = Infinity, nx1 = -Infinity, ny1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(base);
    if (!Number.isFinite(v.x) || v.z > 1) continue;
    nx0 = Math.min(nx0, v.x); nx1 = Math.max(nx1, v.x);
    ny0 = Math.min(ny0, v.y); ny1 = Math.max(ny1, v.y);
  }
  if (!Number.isFinite(nx0)) {
    nx0 = -1; nx1 = 1; ny0 = -1; ny1 = 1;
  }
  const mw = (nx1 - nx0) * margin, mh = (ny1 - ny0) * margin;
  nx0 -= mw; nx1 += mw; ny0 -= mh; ny1 += mh;
  const camAspect = base.isPerspectiveCamera ? base.aspect : (base.right - base.left) / (base.top - base.bottom);
  const subAspect = (camAspect * (nx1 - nx0)) / (ny1 - ny0);
  let W = Math.max(64, Math.round(width / 64) * 64);
  let H = Math.round(W / subAspect);
  if (H > maxHeight) {
    H = maxHeight;
    W = Math.max(64, Math.round((H * subAspect) / 64) * 64);
  }
  H = Math.max(64, H);
  // widen the frame horizontally so pixels stay square after rounding
  const wantW = ((ny1 - ny0) * (W / H)) / camAspect;
  const cx = (nx0 + nx1) / 2;
  nx0 = cx - wantW / 2;
  nx1 = cx + wantW / 2;
  const cam = base.clone();
  // setViewOffset sets aspect = fullWidth / fullHeight (perspective), so the
  // full frame is expressed in units where the view is 2·aspect × 2
  cam.setViewOffset(2 * camAspect, 2, (nx0 + 1) * camAspect, 1 - ny1, (nx1 - nx0) * camAspect, ny1 - ny0);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
  // depth range for the geometry pass
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const camPos = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
  const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  const centerDist = v.copy(sphere.center).sub(camPos).dot(camDir);
  const near = Math.max(1e-4, centerDist - sphere.radius * 1.05);
  const far = centerDist + sphere.radius * 1.05;
  return { cam, W, H, near, far };
}

/** Grow `box` by a mesh's world bounding box (instanced meshes: all instances). */
const _mb = new THREE.Box3();
function addMeshBox(box, m) {
  let gb;
  if (m.isInstancedMesh || m.isSkinnedMesh) {
    m.computeBoundingBox();
    gb = m.boundingBox;
  } else {
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    gb = m.geometry.boundingBox;
  }
  if (gb && !gb.isEmpty()) box.union(_mb.copy(gb).applyMatrix4(m.matrixWorld));
  return box;
}

/** World box of meshes (+ the world points of ink lines, so lines stay inside the frame). */
function worldBox(meshes, lineWorld) {
  const box = new THREE.Box3();
  for (const m of meshes) addMeshBox(box, m);
  const p = new THREE.Vector3();
  for (const w of lineWorld ?? []) for (let i = 0; i < w.length; i += 3) box.expandByPoint(p.set(w[i], w[i + 1], w[i + 2]));
  return box;
}

// ---------------------------------------------------------------- ID materials

/** A per-object mesh-index uniform (set from userData.__exportMesh for each draw). */
const meshIndex = () => uniform(0).onObjectUpdate(({ object }) => object?.userData?.__exportMesh ?? 0);

/** 16-bit integer node → (hi, lo) bytes in [0, 255]. */
function split16(n) {
  const hi = floor(n.div(256));
  return [hi, n.sub(hi.mul(256))];
}

/**
 * Material factories for the passes of one figure, kept from one export of it
 * to the next: building a node material — and on WebGL compiling and linking
 * its program — costs more than drawing the pass, and a kit rebuilt per
 * export (the earlier design) paid that for every material on every export.
 *
 * Geometry and plain id materials depend only on side + position node and are
 * shared within the figure; shade and masked materials mirror one source
 * material each. A derived material records the source state it was built
 * from (side, nodes, colour) and is rebuilt when that changes, so a cached one
 * draws exactly what a new one would. A source material's own derived
 * materials are disposed with it, and the whole kit once every source it has
 * served is disposed (the figure was unmounted): three releases a render
 * object only when its material is disposed, so pass materials must not
 * outlive the meshes they drew.
 * @param {() => void} [onEmpty]  called after the kit disposed itself
 */
function createMaterialKit(onEmpty) {
  const uNear = uniform(0.1), uFar = uniform(1);
  const keyDir = uniform(DEFAULT_KEY.clone());
  const base = (orig, name) => {
    const m = new THREE.MeshBasicNodeMaterial({ side: orig?.side ?? THREE.FrontSide });
    m.name = name;
    m.fog = false;
    m.toneMapped = false;
    if (orig?.positionNode) m.positionNode = orig.positionNode;
    return m;
  };
  const shared = { geometry: new Map(), ids: new Map() }; // side → Map<position node | null, material>
  const own = new Map(); // source material → { shade?, masked? } records { sig, mat }
  const ownless = {}; // the same, for meshes without a source material
  const dropRecord = (rec) => {
    rec.shade?.mat.dispose();
    rec.masked?.mat.dispose();
    delete rec.shade;
    delete rec.masked;
  };
  const disposeAll = () => {
    for (const map of Object.values(shared)) {
      for (const bySide of map.values()) for (const m of bySide.values()) m.dispose();
      map.clear();
    }
    for (const rec of own.values()) dropRecord(rec);
    own.clear();
    dropRecord(ownless);
  };
  const watched = new Set();
  /** Follow a source material's disposal (its records go; the kit goes with the last one). */
  const watch = (orig) => {
    if (!orig?.addEventListener || watched.has(orig)) return;
    watched.add(orig);
    const onDispose = () => {
      orig.removeEventListener('dispose', onDispose);
      watched.delete(orig);
      const rec = own.get(orig);
      if (rec) {
        dropRecord(rec);
        own.delete(orig);
      }
      if (!watched.size) {
        disposeAll();
        onEmpty?.();
      }
    };
    orig.addEventListener('dispose', onDispose);
  };
  const sharedFor = (map, orig, make) => {
    watch(orig);
    const side = orig?.side ?? THREE.FrontSide;
    let bySide = map.get(side);
    if (!bySide) map.set(side, (bySide = new Map()));
    const node = orig?.positionNode ?? null;
    let m = bySide.get(node);
    if (!m) bySide.set(node, (m = make()));
    return m;
  };
  /** A per-source record, rebuilt (and the old material disposed) when its signature changed. */
  const ownFor = (orig, slot, sig, make) => {
    watch(orig);
    let rec = orig ? own.get(orig) : ownless;
    if (!rec) own.set(orig, (rec = {}));
    const cur = rec[slot];
    if (cur && cur.sig.length === sig.length && cur.sig.every((v, i) => v === sig[i])) return cur.mat;
    cur?.mat.dispose();
    rec[slot] = { sig, mat: make() };
    return rec[slot].mat;
  };
  const idsMaterial = (orig, masked) => {
    const m = base(orig, masked ? 'export-mask' : 'export-ids');
    const [ih, il] = split16(meshIndex());
    const out = vec4(ih, il, float(0), float(255)).div(255);
    const mask = orig?.maskNode;
    m.fragmentNode = masked && mask
      ? Fn(() => {
        bool(mask).not().discard();
        return out;
      })()
      : out;
    return m;
  };
  return {
    uNear, uFar, keyDir,
    /** mesh index + 16-bit depth */
    geometry: (orig) => sharedFor(shared.geometry, orig, () => {
      const m = base(orig, 'export-geometry');
      const [ih, il] = split16(meshIndex());
      const d = floor(positionView.z.negate().sub(uNear).div(uFar.sub(uNear)).clamp(0, 1).mul(65535).add(0.5));
      const [dh, dl] = split16(d);
      m.fragmentNode = vec4(ih, il, dh, dl).div(255);
      return m;
    }),
    /** mesh index only, optionally behind the source material's own mask */
    ids: (orig, masked) => (masked
      ? ownFor(orig, 'masked', [orig?.side, orig?.positionNode, orig?.maskNode], () => idsMaterial(orig, true))
      : sharedFor(shared.ids, orig, () => idsMaterial(orig, false))),
    /** unlit albedo (sRGB) + tone band */
    shade: (orig) => {
      // the colour the plate reads: the material's own export node when it
      // declares one (its pattern without the relief baked into colorNode)
      const node = orig?.userData?.exportColorNode ?? orig?.colorNode ?? null;
      // a constant colour is baked into the shader: compare its exact value
      const c = !node && orig?.color?.isColor ? orig.color : null;
      const sig = [orig?.side, orig?.positionNode, node, c ? c.r : -1, c ? c.g : -1, c ? c.b : -1];
      return ownFor(orig, 'shade', sig, () => {
        const m = base(orig, 'export-shade');
        const albedo = node ? vec3(node) : tslColor(c ? c.clone() : new THREE.Color('#a8a196'));
        const srgb = workingToColorSpace(vec4(albedo, 1), THREE.SRGBColorSpace);
        const nl = dot(normalWorld, keyDir);
        // band + 1 in quarters of the alpha range: never 0 on the figure
        const band = select(nl.greaterThan(TONE_BANDS.light), float(1), select(nl.greaterThan(TONE_BANDS.shadow), float(2), float(3)));
        m.fragmentNode = vec4(srgb.rgb.clamp(0, 1), band.mul(64).div(255));
        return m;
      });
    },
  };
}

/** One kit per figure, by its root (weak: a figure's kit never outlives it). */
const kits = new WeakMap();
function materialKit(root) {
  let k = kits.get(root);
  if (!k) kits.set(root, (k = createMaterialKit(() => kits.delete(root))));
  return k;
}

/** Render `meshes` with per-pass materials into fresh RGBA8 targets (synchronous; restores everything). */
function drawPasses(renderer, scene, root, cam, W, H, meshes, makers) {
  const rts = makers.map(() => new THREE.RenderTarget(W, H, { depthBuffer: true, samples: 0, type: THREE.UnsignedByteType, format: THREE.RGBAFormat }));
  for (const rt of rts) rt.texture.name = 'export-id';
  const prevRT = renderer.getRenderTarget();
  const prevClear = renderer.getClearColor(new THREE.Color());
  const prevAlpha = renderer.getClearAlpha();
  const prevAutoClear = renderer.autoClear;
  const unisolate = isolate(root, meshes);
  const originals = meshes.map((m) => m.material);
  const prevIndex = meshes.map((m) => m.userData.__exportMesh);
  meshes.forEach((m, i) => (m.userData.__exportMesh = i + 1));
  try {
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    makers.forEach((make, p) => {
      meshes.forEach((m, i) => {
        const o = originals[i];
        m.material = Array.isArray(o) ? o.map((x) => make(x, m)) : make(o, m);
      });
      renderer.setRenderTarget(rts[p]);
      renderer.render(scene, cam);
    });
  } finally {
    // restore synchronously: the live loop must never see the swap
    meshes.forEach((m, i) => {
      m.material = originals[i];
      if (prevIndex[i] === undefined) delete m.userData.__exportMesh;
      else m.userData.__exportMesh = prevIndex[i];
    });
    unisolate();
    renderer.setRenderTarget(prevRT);
    renderer.setClearColor(prevClear, prevAlpha);
    renderer.autoClear = prevAutoClear;
  }
  return rts;
}

async function readAll(renderer, rts, W, H) {
  const out = [];
  try {
    for (const rt of rts) out.push(await renderer.readRenderTargetPixelsAsync(rt, 0, 0, W, H));
  } finally {
    for (const rt of rts) rt.dispose();
  }
  return out;
}

// ---------------------------------------------------------------- reveals

/**
 * Which meshes do their own masks hide at `time`? Renders mesh indices with
 * and without each material's mask and drops meshes whose mask keeps less
 * than half of their visible pixels; repeats when that uncovers others.
 * @returns {Promise<{ exclude: Set<THREE.Mesh>, score: number }>} score = revealed solid pixels (−1: nothing measured)
 */
async function maskedOut({ renderer, mount, camera, time, margin, kit, width = COVERAGE_WIDTH }) {
  const root = mount.figure.root;
  const scene = sceneOf(root);
  const exclude = new Set();
  let score = -1;
  for (let iter = 0; iter < 4; iter++) {
    const restore = stage(mount, time);
    let rts = null, fr = null, meshes = null, measured = null;
    try {
      ({ meshes } = collect(root, exclude));
      measured = meshes.map((m) => asArray(m.material).some(maskToMeasure));
      if (!meshes.length || !measured.some(Boolean)) {
        score = meshes.length ? -1 : 0;
        break;
      }
      fr = frameFigure(camera, worldBox(meshes), width, width * 1.5, margin);
      rts = drawPasses(renderer, scene, root, fr.cam, fr.W, fr.H, meshes, [
        (o) => kit.ids(o, false),
        (o, mesh) => kit.ids(o, measured[mesh.userData.__exportMesh - 1] && maskToMeasure(o)),
      ]);
    } finally {
      restore();
    }
    const [a, b] = await readAll(renderer, rts, fr.W, fr.H);
    const n = meshes.length;
    const vis = new Uint32Array(n + 1), kept = new Uint32Array(n + 1), shown = new Uint32Array(n + 1);
    for (let s = 0; s < a.length; s += 4) {
      const ia = a[s] * 256 + a[s + 1];
      const ib = b[s] * 256 + b[s + 1];
      if (ia && ia <= n) {
        vis[ia]++;
        if (ib === ia) kept[ia]++;
      }
      if (ib && ib <= n) shown[ib]++;
    }
    let changed = false;
    score = 0;
    for (let i = 0; i < n; i++) {
      if (measured[i] && vis[i + 1] > 0 && kept[i + 1] / vis[i + 1] < KEEP_SHARE) {
        exclude.add(meshes[i]);
        changed = true;
      } else score += shown[i + 1];
    }
    if (!changed) break;
  }
  return { exclude, score };
}

/**
 * A loop time at which the figure shows its finished form: `figure.keyTime`
 * when declared (and `declared` is not false), else the time whose revealed
 * solids cover most of the frame (middle of the longest such stretch), or
 * null when no time shows any. Used when the plate is exported while a lesson
 * shows only its construction lines; the scan also serves when the layers
 * switched off leave the declared pose bare (Engraving off: only the faceted
 * block-in is ever solid).
 * @returns {Promise<number|null>}
 */
export async function findKeyTime({ renderer, mount, camera, margin = 0.08, steps = 20, declared = true }) {
  const figure = mount?.figure;
  if (!figure?.root) return null;
  if (declared && Number.isFinite(figure.keyTime)) return figure.keyTime;
  const D = figure.duration ?? 5;
  const kit = materialKit(figure.root);
  const scores = [];
  for (let i = 0; i < steps; i++) {
    const t = ((i + 0.5) * D) / steps;
    const { score } = await maskedOut({ renderer, mount, camera, time: t, margin, kit, width: 320 });
    scores.push(score < 0 ? 1 : score);
  }
  const best = Math.max(...scores);
  if (!(best > 0)) return null;
  // the longest run (cyclic) of near-best times; its middle sits inside the plateau
  const good = scores.map((s) => s >= best * 0.97);
  let bestRun = null;
  for (let i = 0; i < steps; i++) {
    if (!good[i] || good[(i + steps - 1) % steps]) continue;
    let len = 0;
    while (len < steps && good[(i + len) % steps]) len++;
    if (!bestRun || len > bestRun.len) bestRun = { start: i, len };
  }
  const idx = bestRun ? (bestRun.start + Math.floor((bestRun.len - 1) / 2)) % steps : scores.indexOf(best);
  return ((idx + 0.5) * D) / steps;
}

// ---------------------------------------------------------------- the ID buffer

/** The name of a region nothing names (a dictionary key: the plate translates it). */
const BODY = msg('Body');

/** "water-surface" / "planes:mesh" → "Water surface" / "Planes". */
function prettyName(name) {
  const s = String(name || BODY).split(':')[0].replace(/[-_]+/g, ' ').trim() || BODY;
  return s[0].toUpperCase() + s.slice(1);
}

/**
 * English name of the plate region for a mesh outside every part: its own
 * name, else that of the nearest named group holding it inside the figure
 * (an unnamed mesh in a prop group is named after the prop), else "Body".
 */
function regionName(mesh, root) {
  for (let o = mesh; o && o !== root; o = o.parent) if (o.name) return prettyName(o.name);
  return BODY;
}

/**
 * Every name the plate can give a figure's meshes outside its parts (see
 * regionName), whatever is shown now — the strings a translation of the
 * figure must cover besides its parts' and colours' names.
 * @param {object} figure
 * @returns {string[]}
 */
export function regionNames(figure) {
  const root = figure?.root;
  if (!root) return [];
  const owned = new Set();
  for (const p of figure.parts ?? []) if (p.object) p.object.traverse((o) => owned.add(o));
  const names = new Set();
  root.traverse((o) => {
    if (!o.isMesh || owned.has(o) || o.userData.isOutline || o.userData.isInkLine || o.isLine2 || o.isLineSegments2) return;
    if (o.userData.export === 'skip') return;
    names.add(regionName(o, root));
  });
  return [...names];
}

/**
 * The anchor a label is drawn at from `camera`: its own, or — for a label
 * with a mirror-side `alt` (the far eye, pit or nostril) — the one on the
 * camera's side or, the head face-on with both in view, the one further
 * along `wayOut` (where its numbered disc goes); a hidden one (its part
 * gated) never wins over a shown one. Same rule as the reader's (mirror.js).
 */
function facingAnchor(l, camera, root, wayOut) {
  const a = l.anchor, b = l.alt?.isObject3D ? l.alt : null;
  if (!b) return a;
  const shown = (x) => {
    for (let o = x; o && o !== root.parent; o = o.parent) if (!o.visible) return false;
    return true;
  };
  const sa = shown(a), sb = shown(b);
  if (sa !== sb) return sa ? a : b;
  return mirrorAnchor(a, b, null, camera, wayOut, l);
}

/**
 * Where the plate's numbered discs leave the figure (see layoutMarkers: out
 * from its middle): `(label, x, y, half)` → the unit way out from the
 * world box's centre on screen to a face's pair, at (x, y) in view units, or
 * null when the pair straddles the centre.
 */
function wayOutOf(box, cam) {
  const k = viewAspect(cam);
  const v = new THREE.Vector3();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(cam);
    x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x);
    y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
  }
  const cx = ((x0 + x1) / 2) * k, cy = (y0 + y1) / 2;
  const way = { x: 0, y: 0 };
  return (_, x, y, half) => {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (!(d > half)) return null;
    way.x = dx / d;
    way.y = dy / d;
    return way;
  };
}

/**
 * Render the figure's ID buffers.
 * @param {object} o
 * @param {THREE.WebGPURenderer} o.renderer
 * @param {object} o.mount       FigureHost mount ({ figure, anchor, fold, ctx, state })
 * @param {THREE.Camera} o.camera the view to export
 * @param {number} [o.width=1600] target width (rounded to a multiple of 64)
 * @param {number} [o.maxHeight=2400]
 * @param {number} [o.margin=0.08] framing margin (fraction of the figure's screen size)
 * @param {number} [o.time]       loop time to pose (default: the live clock)
 * @returns {Promise<object>} { W, H, mesh, depth, albedo, band, meshRegion, regions, lines, labels,
 *          cam, near, far, keyDir, worldBox, paperY, time } — per-pixel arrays top-down;
 *          throws an Error with code 'no-solids' when nothing solid is shown
 */
export async function renderIdBuffer({ renderer, mount, camera, width = 1600, maxHeight = 2400, margin = 0.08, time } = {}) {
  const figure = mount?.figure;
  if (!figure?.root) throw new Error('exportFigureSVG: mount has no built figure');
  const root = figure.root;
  const scene = sceneOf(root);
  const t = Number.isFinite(time) ? time : mount.ctx?.u?.time?.value ?? 0;
  const kit = materialKit(root);
  const { exclude } = await maskedOut({ renderer, mount, camera, time: t, margin, kit });
  const restore = stage(mount, t);
  let res;
  try {
    res = capture({ mount, camera, width, maxHeight, margin, exclude, kit, root, scene, renderer });
  } finally {
    restore();
  }
  const [pg, ps] = await readAll(renderer, res.rts, res.W, res.H);
  delete res.rts;
  decode(res, pg, ps, !renderer.backend?.isWebGPUBackend);
  res.time = t;
  return res;
}

/** Synchronous part of renderIdBuffer (figure staged): regions, framing, vectors, passes. */
function capture({ mount, camera, width, maxHeight, margin, exclude, kit, root, scene, renderer }) {
  const figure = mount.figure;
  const { meshes, lines: lineObjs } = collect(root, exclude);
  if (!meshes.length) {
    const err = new Error('exportFigureSVG: the figure has no visible solid meshes');
    err.code = 'no-solids';
    throw err;
  }

  // -- regions: one per part (nearest ancestor), others grouped by colour
  const partOf = new Map();
  for (const p of figure.parts ?? []) if (p.object) partOf.set(p.object, p);
  const partFor = (obj) => {
    for (let o = obj; o && o !== root.parent; o = o.parent) {
      const p = partOf.get(o);
      if (p) return p;
    }
    return null;
  };
  const regions = [];
  const regionOfPart = new Map();
  const regionByKey = new Map();
  const meshRegion = new Uint16Array(meshes.length + 1);
  meshes.forEach((mesh, i) => {
    const part = partFor(mesh);
    let r;
    if (part) {
      r = regionOfPart.get(part);
      if (!r) {
        regions.push({ id: part.id, name: part.name ?? part.id, color: part.color ?? inkColorOf(mesh) ?? '#a8a196', part, swatches: part.swatches ?? null });
        r = regions.length;
        regionOfPart.set(part, r);
      }
    } else {
      const color = inkColorOf(mesh) ?? '#a8a196';
      const key = `body:${color}`;
      r = regionByKey.get(key);
      if (!r) {
        regions.push({ id: regions.length ? `body-${regions.length}` : 'body', name: regionName(mesh, root), color, part: null, swatches: null });
        r = regions.length;
        regionByKey.set(key, r);
      }
    }
    meshRegion[i + 1] = r;
  });

  // -- ink lines in world space (fold open, as drawn now)
  const v = new THREE.Vector3();
  const lines = [];
  for (const line of lineObjs) {
    const pts = linePoints(line);
    if (!pts || pts.length < 6) continue;
    const meta = line.userData.inkLine ?? {};
    const world = new Float64Array(pts.length);
    for (let i = 0; i < pts.length; i += 3) {
      v.set(pts[i], pts[i + 1], pts[i + 2]).applyMatrix4(line.matrixWorld);
      world[i] = v.x; world[i + 1] = v.y; world[i + 2] = v.z;
    }
    lines.push({ world, width: meta.width ?? line.material?.linewidth ?? 1, color: meta.color ?? '#1c1a17', dashed: !!meta.dashed, closed: !!meta.closed, onTop: line.material?.depthTest === false });
  }

  // -- framing: meshes and the lines drawn with them
  const box = worldBox(meshes, lines.map((l) => l.world));
  const fr = frameFigure(camera, box, width, maxHeight, margin);

  // -- labels whose structure is on the plate. Each records its part's region
  //    and, when the anchor hangs on a mesh (a calyx, a rattle segment), that
  //    mesh's index: a hidden anchor is pointed at through its own mesh, not
  //    through whatever else shares the part (the style inside a corolla).
  //    A label with a mirror-side anchor uses the one facing the camera (the
  //    near eye, not the hidden far one); a label that rings its feature
  //    carries the feature's radius in world units
  const labels = [];
  const layers = mount.layers ?? {};
  const meshIndexOf = new Map(meshes.map((mesh, i) => [mesh, i + 1]));
  const cm = root.matrixWorld.getMaxScaleOnAxis(); // world units per cm (staged: fold open)
  const wayOut = wayOutOf(box, fr.cam);
  for (const l of figure.labels ?? []) {
    if (!l.anchor) continue;
    if (l.layer && layers[l.layer] === false && figure.layerShown?.(l.layer) !== true) continue;
    const anchor = facingAnchor(l, fr.cam, root, wayOut);
    let shown = true;
    for (let o = anchor; o && o !== root.parent; o = o.parent) if (!o.visible) shown = false;
    if (!shown) continue;
    const part = partFor(anchor);
    const region = part ? regionOfPart.get(part) ?? 0 : 0;
    // a part that draws nothing now (a lesson stage, a dissolved layer) is not labelled
    if (part && !region) continue;
    let carrier = null;
    for (let o = anchor.parent; o && o !== root.parent && !carrier; o = o.parent) {
      if (o.isMesh && !o.isLine2 && !o.isLineSegments2 && !o.userData.isInkLine && !o.userData.isOutline) carrier = o;
    }
    const mesh = carrier ? meshIndexOf.get(carrier) ?? 0 : 0;
    // ... nor one whose own mesh is left off the plate (x-rayed, dissolved, masked)
    if (carrier && !mesh) continue;
    // the labelled structure's world bounds (its mesh, else its part's drawn
    // meshes): how big a glimpse of it must be to stand for it
    const bounds = new THREE.Box3();
    if (carrier) addMeshBox(bounds, carrier);
    else if (part) for (const m of meshes) if (meshRegion[meshIndexOf.get(m)] === region) addMeshBox(bounds, m);
    const sphere = bounds.isEmpty() ? null : bounds.getBoundingSphere(new THREE.Sphere());
    labels.push({
      id: l.id, text: l.text, detail: l.detail ?? '', layer: l.layer ?? null,
      world: anchor.getWorldPosition(new THREE.Vector3()), region, mesh, sphere,
      mark: l.mark === 'ring' || l.mark === 'tick' ? l.mark : 'dot',
      radius: l.size > 0 ? l.size * cm : 0,
    });
  }
  // paper height under the figure: the anchor sits on the page
  const paperY = mount.anchor
    ? new THREE.Vector3().setFromMatrixPosition(mount.anchor.matrixWorld).y
    : new THREE.Vector3().setFromMatrixPosition(root.matrixWorld).y;

  // -- the passes
  kit.uNear.value = fr.near;
  kit.uFar.value = fr.far;
  kit.keyDir.value.copy(keyDirection(scene));
  const rts = drawPasses(renderer, scene, root, fr.cam, fr.W, fr.H, meshes, [(o) => kit.geometry(o), (o) => kit.shade(o)]);
  return {
    rts, W: fr.W, H: fr.H, meshRegion, meshNames: meshes.map((m) => m.name), regions, lines, labels,
    cam: fr.cam, near: fr.near, far: fr.far, keyDir: kit.keyDir.value.clone(), worldBox: box, paperY,
  };
}

/** Unpack the two readbacks into top-down per-pixel arrays. */
function decode(res, pg, ps, flipY) {
  const { W, H } = res;
  const N = W * H;
  const nMesh = res.meshRegion.length - 1;
  const mesh = new Uint16Array(N);
  const depth = new Float32Array(N);
  const albedo = new Uint8Array(N * 3);
  const band = new Uint8Array(N);
  for (let y = 0; y < H; y++) {
    const sy = flipY ? H - 1 - y : y;
    for (let x = 0; x < W; x++) {
      const s = (sy * W + x) * 4;
      const id = pg[s] * 256 + pg[s + 1];
      if (!id || id > nMesh) continue;
      const i = y * W + x;
      mesh[i] = id;
      depth[i] = (pg[s + 2] * 256 + pg[s + 3]) / 65535;
      albedo[i * 3] = ps[s];
      albedo[i * 3 + 1] = ps[s + 1];
      albedo[i * 3 + 2] = ps[s + 2];
      band[i] = Math.max(0, Math.min(2, Math.round(ps[s + 3] / 64) - 1));
    }
  }
  Object.assign(res, { mesh, depth, albedo, band });
}
