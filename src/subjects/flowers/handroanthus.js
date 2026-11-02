// Handroanthus ochraceus — cortez amarillo (syn. Tabebuia ochracea).
//
// Botany (Gentry 1992, Flora Neotropica 25; Croat, Flora of Barro Colorado
// Island; MOBOT Flora of the Venezuelan Guayana): a dry-forest tree that
// flowers en masse on leafless branches in the dry season. Inflorescences
// are densely congested at the branch tips, virtually lacking pedicels. The
// corolla is yellow, tubular-campanulate, 3.6–7.5 cm long (Flora Costaricensis), five-lobed (two upper
// and three lower lobes), with fine reddish pencilling in the throat — nectar
// guides. The calyx is campanulate, 8–15 mm, villous with long hairs
// (ochraceous: the species name). Corollas drop whole, carpeting the ground,
// while the calyx and pistil stay on the branch.
//
// Plate: a leafless fork of grey bark with three congested trumpet clusters.
// Loop: the clusters sway; one corolla detaches, tumbles to the page and
// dissolves while a fresh corolla opens in its place, so the branch is
// whole again at the loop seam.
// Explode: every corolla slides off its calyx along the floral axis,
// revealing the style; the calyces lift slightly from the twigs.
//
// The nectar guides are ink lines (ctx.inkLine), not paint in the corolla's
// colour node: painted, a guide is narrower than a pixel at book zoom and the
// SVG exporter cleans it away as speckle; an ink line keeps its screen width
// and is exported as a vector.
import * as THREE from 'three/webgpu';
import { uv, attribute, mix as tmix, smoothstep, color as tslColor, positionLocal, mx_noise_float } from 'three/tsl';
import { setFade } from '../../kits/ink/index.js';
import {
  CorollaSurface, TubeSurface, createLathe, cubicPath, orient, barkColor, translucency, fuzz, smoother, spreadAxes, GOLDEN_ANGLE,
} from '../../kits/petal/index.js';
import { sway, mix } from './common.js';

const C = {
  corolla: '#f6c82c',
  corollaDeep: '#eaa91e',
  limb: '#fbd94a',
  guide: '#a6431f',
  calyx: '#a87d3c',
  calyxHair: '#e6c98a',
  bark: '#8a7c6a',
  barkDark: '#5b5045',
  lichen: '#c4c2ae',
  style: '#d9c27a',
};

// cluster layout: each bell's limb (≈2.7 cm radius, ≈6.6 cm out) subtends
// ≈22° from the twig tip, so neighbouring axes need ≈50° between them, all
// within ≈80° of the cluster's mean direction (rad)
const SPREAD_MIN = 0.87;
const SPREAD_POLAR = 1.4;

// the falling corolla's schedule (seconds)
const T_DETACH = 0.9;
const T_LAND = 2.55;
const T_FADE0 = 3.35;
const T_FADE1 = 4.1;
const T_GROW0 = 3.7;

// nectar guides: fine reddish lines on the floor of the throat under the
// three lower lobes (1–3, the lower lip), fanning out of the tube. Each is
// [lobe coordinate (the corolla's aLobe: lobe index + position across it),
// v (meridian fraction, uv.y) where it ends below the limb]
const GUIDES = [[2.5, 0.74], [2.12, 0.7], [2.88, 0.7], [1.76, 0.64], [3.24, 0.64], [1.42, 0.56], [3.58, 0.56]];
const GUIDE_MID = 2.5; // the lower lip's midline, where the guides meet
const GUIDE_V0 = 0.12; // v where they meet, deep in the tube
const GUIDE_V1 = 0.34; // v by which they have fanned out
const GUIDE_SAMPLES = 12; // points along each guide
// cm off the inner face, into the throat: about a pixel at book zoom, yet a
// guide seen from outside then lies ≥ 0.12 cm behind the outer face (the wall
// is ≈ 0.04 cm). The 1600-px SVG plate draws this figure at ≈ 0.026 cm a
// pixel and lets a line show through up to 3 px (0.08 cm) of surface in front
// of it (LINE_TOL_PX, src/engine/export/index.js), so the plate hides such a
// guide as the reader's depth test does; at 0.04 cm a corolla lying on the
// page printed one through its wall.
const GUIDE_LIFT = 0.08;
const GUIDE_WIDTH = 0.9; // CSS px
/** Points in one corolla's guide polyline (see writeGuides). */
const GUIDE_POINTS = 1 + GUIDES.length * 2 * (GUIDE_SAMPLES - 1);

// where the reader looks from, in the figure's space: in front of the page
// and about 43° above it (the book's default view; root +Z faces the reader)
const READER_VIEW = new THREE.Vector3(0, 0.68, 0.73).normalize();

/**
 * Build the Handroanthus ochraceus plate.
 * @param {{ species: string }} params
 * @param {object} ctx FigureContext (src/kits/ink)
 * @param {import('./common.js').FigureKit} K
 * @returns {{ title: string, beats: Array<{t:number,text:string}>, pose: (t:number, st:object) => void }}
 */
export function build(params, ctx, K) {
  const root = K.root;
  K.layer('flowers', 'Flowers', 'Golden tubular-bell corollas with reddish nectar guides in the throat');
  K.layer('calyx', 'Calyx', 'The bell-shaped, densely hairy calyx that stays when the corolla falls');
  K.layer('branch', 'Branch', 'Leafless twigs — the tree blooms bare in the dry season');

  // ---------------------------------------------------------------- materials
  // (the nectar guides are ink lines on the throat: see the corollas below)
  const corollaColor = (() => {
    const v = uv().y;
    const side = attribute('aSide', 'float'); // 0 inner (adaxial), 1 outer
    let c = tmix(tslColor(C.corollaDeep), tslColor(C.corolla), smoothstep(0.05, 0.5, v));
    c = tmix(c, tslColor(C.limb), smoothstep(0.7, 0.95, v));
    c = tmix(c, tslColor('#e9b02a'), side.mul(0.25));
    return c.mul(mx_noise_float(positionLocal.mul(2.2)).mul(0.04).add(1));
  })();
  const corollaMat = ctx.ink({
    colorNode: corollaColor, svgColor: C.corolla, roughness: 0.5, sheen: 0.35, hatch: 0.5, crossHatch: 0.5, name: 'cortez-corolla',
  });
  corollaMat.emissiveNode = translucency(corollaColor, 0.32);
  const calyxColor = tmix(tslColor(C.calyx), tslColor('#c79a4e'), mx_noise_float(positionLocal.mul(14.0)).mul(0.5).add(0.5));
  const calyxMat = ctx.ink({ colorNode: calyxColor, svgColor: C.calyx, roughness: 0.95, hatch: 0.7, name: 'cortez-calyx' });
  calyxMat.emissiveNode = fuzz(C.calyxHair, 0.6, 1.6);
  const barkMat = ctx.ink({
    colorNode: barkColor({ base: C.bark, dark: C.barkDark, lichen: C.lichen, scale: 1.1, lichenAmount: 0.45, stretch: [0.5, 2.0, 0.5] }),
    svgColor: C.bark, roughness: 0.9, name: 'cortez-bark',
  });
  const styleMat = ctx.ink({ color: C.style, roughness: 0.6, name: 'cortez-style' });

  // ---------------------------------------------------------------- branch
  const branch = new THREE.Group();
  branch.name = 'branch';
  root.add(branch);
  K.assign('branch', branch);
  const limbs = [
    { pts: [[-15.5, 0.95, 2.4], [-8, 3.2, 1.6], [-3, 6.2, 0.2], [1.2, 9.0, -1.0]], r0: 1.0, r1: 0.62, cap: 'flat' },
    { pts: [[1.0, 8.9, -1.0], [3.8, 12.2, -2.0], [5.4, 14.6, -2.8], [6.8, 16.6, -3.6]], r0: 0.58, r1: 0.26 },
    { pts: [[1.0, 8.9, -1.0], [4.5, 9.6, 0.4], [7.5, 10.2, 1.8], [10.4, 10.9, 3.2]], r0: 0.52, r1: 0.24 },
    { pts: [[-3.0, 6.2, 0.2], [-3.8, 9.4, -0.8], [-4.4, 12.4, -2.0], [-4.9, 15.0, -3.0]], r0: 0.46, r1: 0.22 },
  ];
  const tips = [];
  for (const l of limbs) {
    const P = l.pts.map((p) => new THREE.Vector3(...p));
    const tube = K.track(new TubeSurface({
      path: cubicPath(...P), radius: (v) => mix(l.r0, l.r1, v), radial: 14, segments: 28,
      capStart: l.cap ?? 'open', capEnd: 'round', up: new THREE.Vector3(0, 0, 1),
    }));
    K.mesh(tube.geometry, barkMat, { name: 'branch', parent: branch });
    if (l !== limbs[0]) tips.push({ at: P[3].clone(), dir: P[3].clone().sub(P[2]).normalize() });
  }
  const branchAnchor = new THREE.Object3D();
  branchAnchor.position.set(-8, 3.2 + 0.9, 1.6);
  branch.add(branchAnchor);

  // ---------------------------------------------------------------- flowers
  // tubular-campanulate: a narrow tube inside the calyx widening into a bell,
  // the five lobes spreading (two upper, three slightly larger lower)
  const corollaGeoSpec = {
    length: 6.2, baseRadius: 0.26, funnel: 0.1, throat: 0.18, flare: 1.02, flarePow: 1.15, lobes: 5, lobeDepth: 0.2,
    lobeRound: 2.0, lobeScale: [0.92, 1.08, 1.14, 1.08, 0.92], lobeFlare: [0.95, 1.04, 1.08, 1.04, 0.95], lobeCup: 0.1,
    lobeOffset: Math.PI / 5, curve: 0.08, thickness: 0.05, segPerLobe: 10, segV: 22,
  };
  const sharedCorolla = K.track(new CorollaSurface(corollaGeoSpec));
  // a corolla's nectar guides as one ink line, so one draw call per flower
  const guidePts = writeGuides(sharedCorolla, new Float32Array(GUIDE_POINTS * 3));
  const addGuides = (mesh) => {
    const line = K.track(ctx.inkLine(guidePts, { width: GUIDE_WIDTH, color: C.guide, name: 'nectar-guides', fit: false }));
    mesh.add(line);
    return line;
  };
  const calyxGeo = createLathe({
    profile: [[0, -0.15], [0.2, -0.1], [0.34, 0.3], [0.44, 0.8], [0.5, 1.15], [0.36, 1.2], [0, 1.2]],
    segments: 20, ridges: 5, ridgeDepth: 0.05,
  });
  K.track(calyxGeo);
  const styleTube = K.track(new TubeSurface({
    path: (v, o) => o.set(0, 1.0 + v * 3.6, 0.05 * v * v), radius: 0.05, radial: 6, segments: 8, capStart: 'open', capEnd: 'round',
  }));

  // corollas and calyces live in two parallel hierarchies with identical
  // cluster transforms, so each organ is one exportable, toggleable part
  const corollas = new THREE.Group();
  corollas.name = 'corollas';
  const calyces = new THREE.Group();
  calyces.name = 'calyces';
  root.add(corollas, calyces);
  K.assign('flowers', corollas);
  K.assign('calyx', calyces);
  const clusters = [];
  const flowers = [];
  const counts = [7, 6, 6];
  const up = new THREE.Vector3(0, 1, 0);
  tips.forEach((tip, ci) => {
    const cgCor = new THREE.Group();
    const cgCal = new THREE.Group();
    cgCor.position.copy(tip.at);
    cgCal.position.copy(tip.at);
    corollas.add(cgCor);
    calyces.add(cgCal);
    const n = counts[ci];
    const base = tip.dir.clone().lerp(up, 0.45).normalize();
    const t1 = new THREE.Vector3().crossVectors(base, Math.abs(base.y) < 0.9 ? up : new THREE.Vector3(1, 0, 0)).normalize();
    const t2 = new THREE.Vector3().crossVectors(base, t1);
    // axes: a golden-angle spiral around the twig direction, biased upward
    // (flowers face the light), then relaxed apart so the bells clear
    const axes = [];
    for (let i = 0; i < n; i++) {
      const az = i * GOLDEN_ANGLE + ci * 1.3;
      const polar = 0.35 + 0.75 * ((i + 0.5) / n);
      axes.push(base.clone().multiplyScalar(Math.cos(polar))
        .addScaledVector(t1, Math.sin(polar) * Math.cos(az))
        .addScaledVector(t2, Math.sin(polar) * Math.sin(az)).normalize());
    }
    spreadAxes(axes, base, SPREAD_MIN, SPREAD_POLAR);
    for (let i = 0; i < n; i++) {
      const axis = axes[i];
      const fgCal = new THREE.Group();
      fgCal.position.copy(axis).multiplyScalar(0.35);
      orient(fgCal, axis, up);
      cgCal.add(fgCal);
      const fgCor = fgCal.clone(false);
      cgCor.add(fgCor);
      // calyx and pistil stay on the twig; the corolla can fall
      const cal = new THREE.Group();
      fgCal.add(cal);
      const calMesh = K.mesh(calyxGeo, calyxMat, { name: 'calyx', parent: cal, outline: 0.8 });
      K.mesh(styleTube.geometry, styleMat, { name: 'style', parent: cal, outline: 0.5 });
      const cor = new THREE.Group();
      cor.position.y = 0.85;
      fgCor.add(cor);
      const corMesh = K.mesh(sharedCorolla.geometry, corollaMat, { name: 'corolla', parent: cor, outline: 0.9 });
      addGuides(corMesh);
      flowers.push({ cal, calMesh, cor, corMesh, axis, ci, i });
    }
    clusters.push({ cgCor, cgCal, ci });
  });

  // the corolla that falls: the most outward-facing flower of the second cluster
  const dropper = flowers.filter((f) => f.ci === 1).sort((a, b) => b.axis.z + b.axis.x * 0.3 - (a.axis.z + a.axis.x * 0.3))[0];
  const regrow = K.track(new CorollaSurface(corollaGeoSpec));
  const regrowMesh = K.mesh(regrow.geometry, corollaMat, { name: 'corolla-regrowing', parent: dropper.cor, outline: 0.9, animated: true });
  regrowMesh.visible = false;
  // its guides are rewritten as it opens (same point count: the line's buffers
  // are updated in place)
  const regrowGuides = addGuides(regrowMesh);
  const regrowPts = new Float32Array(guidePts.length);
  const falling = new THREE.Group();
  falling.name = 'falling-corolla';
  root.add(falling);
  addGuides(K.mesh(sharedCorolla.geometry, corollaMat, { name: 'corolla-falling', parent: falling, outline: 0.9 }));
  K.assign('flowers', falling);
  falling.visible = false;

  // attached pose of the dropper at the moment of detachment (pure: pose at T_DETACH)
  const detachM = new THREE.Matrix4();
  // resting on the page: lying on its side, tilted until base and rim both touch
  const rest = restingPose(sharedCorolla.position, 0.9, 0.35);
  const landQ = rest.q;
  const landP = new THREE.Vector3(4.2, rest.y, 8.4);
  const _q0 = new THREE.Quaternion();
  const _p0 = new THREE.Vector3();
  const _s0 = new THREE.Vector3();
  const _spin = new THREE.Quaternion();
  const _axis = new THREE.Vector3(0.6, 0.2, 0.77).normalize();
  // the falling corolla's fade, written only when it changes (a host layer
  // dissolve changes the composed value, so it is still followed every frame)
  let fallFade = -1;
  const fadeFalling = (a) => {
    if (a === fallFade) return;
    fallFade = a;
    for (const c of falling.children) setFade(c, a);
  };

  // ---------------------------------------------------------------- labels & parts
  const front = flowers.filter((f) => f !== dropper).sort((a, b) => b.axis.z - a.axis.z)[0];
  const corAnchor = new THREE.Object3D();
  corAnchor.position.copy(sharedCorolla.pointAt(2, 0.92, 1, new THREE.Vector3()));
  front.corMesh.add(corAnchor);
  // on the middle guide (lobe 2's midline), inside the throat
  const guideAnchor = new THREE.Object3D();
  guideAnchor.position.copy(sharedCorolla.pointAt(2, 0.5, 0, new THREE.Vector3()));
  front.corMesh.add(guideAnchor);
  // The calyx label goes on a calyx the reader sees: the front flower's calyx
  // hides behind its own bell, and the lowest cluster's calyces inside their
  // ring of bells, while an upright flower of the top cluster shows its calyx
  // below the bell. The anchor sits on that calyx's side facing the reader,
  // just clear of its ridges (radius ≈ 0.41 cm at this height).
  const topCi = tips.reduce((b, tip, k) => (tip.at.y > tips[b].at.y ? k : b), 0);
  const upright = flowers.filter((f) => f.ci === topCi).sort((a, b) => b.axis.y - a.axis.y)[0];
  const toReader = READER_VIEW.clone().applyQuaternion(upright.calMesh.getWorldQuaternion(new THREE.Quaternion()).invert());
  const az = Math.atan2(toReader.x, toReader.z);
  const calAnchor = new THREE.Object3D();
  calAnchor.position.set(Math.sin(az) * 0.45, 0.6, Math.cos(az) * 0.45);
  upright.calMesh.add(calAnchor);
  K.label('corolla', 'Corolla', 'A golden, bell-like trumpet of five fused petals, 3.6–7.5 cm long.', corAnchor, [0, 0, 0], 'flowers');
  K.label('nectar-guides', 'Nectar guides', 'Fine reddish lines in the throat lead bees to the nectar.', guideAnchor, [0, 0, 0], 'flowers');
  K.label('calyx', 'Calyx', 'Bell-shaped and densely hairy; it stays on the twig when the corolla falls.', calAnchor, [0, 0, 0], 'calyx');
  K.label('branch', 'Branch', 'Bare twigs: the tree drops its leaves before this dry-season bloom.', branchAnchor, [0, 0, 0], 'branch');

  K.part('corollas', 'Corollas', corollas, C.corolla, 'flowers');
  K.part('calyces', 'Calyces & styles', calyces, C.calyx, 'calyx');
  K.part('branch', 'Branch', branch, C.bark, 'branch');
  K.part('falling-corolla', 'Falling corolla', falling, C.corolla, 'flowers');

  const poseClusters = (t, k = 1) => {
    for (const c of clusters) {
      const s = sway(t, 1, c.ci * 0.21);
      c.cgCor.rotation.set(0.05 * k * sway(t, 1, 0.3 + c.ci * 0.17), 0.03 * k * sway(t, 2, c.ci * 0.4), 0.06 * k * s);
      c.cgCal.rotation.copy(c.cgCor.rotation);
    }
  };
  // detach matrix (cluster pose at T_DETACH)
  poseClusters(T_DETACH);
  root.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  detachM.multiplyMatrices(rootInv, dropper.cor.matrixWorld);
  detachM.decompose(_p0, _q0, _s0);
  const startP = _p0.clone();
  const startQ = _q0.clone();
  const startAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(startQ);

  return {
    title: 'Handroanthus ochraceus — cortez amarillo in dry-season bloom',
    beats: [
      { t: 0, text: 'Dense clusters of golden trumpets crown the bare twigs.' },
      { t: T_DETACH, text: 'A corolla lets go; the hairy calyx stays on the twig.' },
      { t: T_LAND, text: 'It lands on the ground — under the tree they form a golden carpet.' },
      { t: T_GROW0, text: 'Loop: a fresh corolla opens in its place.' },
    ],
    pose(t, st) {
      const ex = st.explode ?? 0;
      // the fall starts from the sway pose at T_DETACH, so sway is full there;
      // under prefers-reduced-motion it eases down to a calm 30 % elsewhere
      const calm = st.reducedMotion
        ? 0.3 + 0.7 * smoother((t - (T_DETACH - 0.7)) / 0.5) * (1 - smoother((t - T_GROW0) / 0.6))
        : 1;
      poseClusters(t, calm);
      // dissection: corollas slide off along the floral axis, calyces lift
      for (const f of flowers) {
        f.cor.position.y = 0.85 + 3.2 * ex;
        f.cal.position.y = 0.9 * ex;
      }
      // the drop: detached corolla tumbles to the page, dissolves; regrowth
      dropper.corMesh.visible = t < T_DETACH;
      if (t >= T_GROW0) {
        const g = smoother((t - T_GROW0) / (5 - T_GROW0));
        regrowMesh.visible = g < 0.999;
        dropper.corMesh.visible = g >= 0.999;
        regrow.p.flare = mix(0.06, corollaGeoSpec.flare, g);
        regrow.p.lobeCup = corollaGeoSpec.lobeCup * g;
        regrow.rebuild();
        // its guides follow the opening throat (once open, the dropper's own show)
        if (regrowMesh.visible) regrowGuides.setPoints(writeGuides(regrow, regrowPts));
        regrowMesh.scale.setScalar(mix(0.3, 1, g));
      } else {
        regrowMesh.visible = false;
      }
      // `falling` sits outside the `corollas` group, so it follows the Flowers
      // layer itself: K.isVisible flips only once the host's dissolve-out is
      // done (and at the start of a dissolve-in), like the group's visibility.
      if (K.isVisible('flowers') && t >= T_DETACH && t < T_FADE1) {
        falling.visible = true;
        const u = Math.min(1, (t - T_DETACH) / (T_LAND - T_DETACH));
        const fallY = u * u; // gravity
        _p0.copy(startP).lerp(landP, smoother(u));
        _p0.y = mix(startP.y, landP.y, fallY);
        // a little drift and flutter on the way down
        _p0.x += Math.sin(u * Math.PI) * 1.6;
        falling.position.copy(_p0).addScaledVector(startAxis, 3.2 * ex * (1 - smoother(u)));
        _spin.setFromAxisAngle(_axis, (1 - smoother(u)) * 2.6 * Math.sin(u * Math.PI * 1.5));
        falling.quaternion.copy(startQ).slerp(landQ, smoother(u)).multiply(_spin);
        if (t > T_LAND) {
          const b = (t - T_LAND) / 0.35;
          if (b < 1) falling.position.y += Math.sin(b * Math.PI) * 0.25 * (1 - b);
        }
        // compose the corolla's own end-of-fall fade with the host's layer
        // dissolve, which FigureHost writes on the part group just before
        // update(): read it there, write the product only to the children
        const own = Math.max(0, t < T_FADE0 ? 1 : 1 - (t - T_FADE0) / (T_FADE1 - T_FADE0));
        fadeFalling(own * (falling.userData.inkFade ?? 1));
      } else {
        falling.visible = false;
        fadeFalling(1);
      }
    },
  };
}

/**
 * A corolla's nectar guides as one polyline, written into `out` (GUIDE_POINTS
 * points, corolla-local). Every guide starts where they all meet, deep in
 * the tube, fans out along the throat floor to below the limb and runs back
 * over itself, so no stretch of the line crosses the throat between two
 * guides. Allocation-free: it runs per frame on the opening corolla.
 * @param {CorollaSurface} s
 * @param {Float32Array} out
 * @returns {Float32Array} out
 */
function writeGuides(s, out) {
  throatPoint(s, GUIDE_MID, GUIDE_V0, out, 0);
  let o = 3;
  for (let g = 0; g < GUIDES.length; g++) {
    const lobe = GUIDES[g][0], vEnd = GUIDES[g][1];
    const start = o;
    for (let k = 1; k < GUIDE_SAMPLES; k++) {
      const v = GUIDE_V0 + ((vEnd - GUIDE_V0) * k) / (GUIDE_SAMPLES - 1);
      const fan = smoother((v - GUIDE_V0) / (GUIDE_V1 - GUIDE_V0));
      throatPoint(s, GUIDE_MID + (lobe - GUIDE_MID) * fan, v, out, o);
      o += 3;
    }
    // back over the same points to the meeting point
    for (let k = GUIDE_SAMPLES - 2; k >= 0; k--) {
      const src = k === 0 ? 0 : start + (k - 1) * 3;
      out[o] = out[src];
      out[o + 1] = out[src + 1];
      out[o + 2] = out[src + 2];
      o += 3;
    }
  }
  return out;
}

/**
 * The point of a corolla's inner (adaxial) face at lobe coordinate `lobe`
 * (the colour node's aLobe: lobe index + position across it) and meridian
 * fraction `v` (its uv.y), lifted GUIDE_LIFT into the throat, into out[o…o+2].
 * Interpolates the surface's own vertices, so it follows a rebuild.
 * @param {CorollaSurface} s
 * @param {number} lobe
 * @param {number} v
 * @param {Float32Array} out
 * @param {number} o
 */
function throatPoint(s, lobe, v, out, o) {
  const c = Math.min(s.segA - 1e-4, Math.max(0, (lobe * s.segA) / s.p.lobes));
  const i = Math.floor(c);
  const f = c - i;
  out[o] = out[o + 1] = out[o + 2] = 0;
  addColumnPoint(s, i, v, 1 - f, out, o);
  addColumnPoint(s, i + 1, v, f, out, o);
}

/** Add `w` × column `i`'s lifted inner-face point at meridian fraction `v` to out[o…o+2]. */
function addColumnPoint(s, i, v, w, out, o) {
  if (w <= 0) return;
  const { cols, rows, segV, position: P, uv: UV } = s;
  // the column's outer row j (its inner twin is row rows − 1 − j; they share the rim)
  let j = 0;
  while (j < segV - 1 && UV[((j + 1) * cols + i) * 2 + 1] < v) j++;
  const v0 = UV[(j * cols + i) * 2 + 1];
  const t = Math.min(1, Math.max(0, (v - v0) / Math.max(1e-6, UV[((j + 1) * cols + i) * 2 + 1] - v0)));
  const a = ((rows - 1 - j) * cols + i) * 3, b = ((rows - 2 - j) * cols + i) * 3;
  const oa = (j * cols + i) * 3, ob = ((j + 1) * cols + i) * 3;
  const x = P[a] + (P[b] - P[a]) * t, y = P[a + 1] + (P[b + 1] - P[a + 1]) * t, z = P[a + 2] + (P[b + 2] - P[a + 2]) * t;
  // outer → inner across the shell points into the throat
  const nx = x - (P[oa] + (P[ob] - P[oa]) * t), ny = y - (P[oa + 1] + (P[ob + 1] - P[oa + 1]) * t), nz = z - (P[oa + 2] + (P[ob + 2] - P[oa + 2]) * t);
  const k = GUIDE_LIFT / (Math.hypot(nx, ny, nz) || 1);
  out[o] += w * (x + nx * k);
  out[o + 1] += w * (y + ny * k);
  out[o + 2] += w * (z + nz * k);
}

/**
 * Orientation and height at which a bell-shaped corolla rests on the page:
 * its axis laid horizontal along `heading`, rolled by `roll`, then tilted
 * until the narrow base and the flared rim touch the ground together.
 * @param {Float32Array} pos  corolla vertex positions (local, axis +Y)
 * @param {number} heading rad about world Y
 * @param {number} roll rad about the corolla's own axis
 * @returns {{ q: THREE.Quaternion, y: number }} rotation and origin height (cm)
 */
function restingPose(pos, heading, roll) {
  const qH = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading);
  const qR = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), roll);
  const qT = new THREE.Quaternion();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const best = { err: Infinity, q: new THREE.Quaternion(), y: 0 };
  for (let tilt = -0.3; tilt <= 1.0; tilt += 0.01) {
    qT.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2 + tilt);
    q.copy(qH).multiply(qT).multiply(qR);
    let base = Infinity, rim = Infinity;
    for (let i = 0; i < pos.length; i += 3) {
      v.set(pos[i], pos[i + 1], pos[i + 2]);
      const ly = v.y;
      v.applyQuaternion(q);
      if (ly < 0.8) base = Math.min(base, v.y);
      else if (ly > 3.5) rim = Math.min(rim, v.y);
    }
    const err = Math.abs(base - rim);
    if (err < best.err) {
      best.err = err;
      best.q.copy(q);
      best.y = -Math.min(base, rim) + 0.03;
    }
  }
  return best;
}
