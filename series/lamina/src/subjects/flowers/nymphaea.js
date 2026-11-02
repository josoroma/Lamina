// Nymphaea ampla — nenúfar, the white water lily.
//
// Botany (Flora of Panama; Kew POWO / Flora of the Cayman Islands; USF
// Atlas of Florida Plants): a day-blooming water lily. Flowers white,
// 8–16 cm across, held at or just above the water, with 4 lance-oblong
// sepals, green with purplish striations, about 12–21 white petals in a
// spiral, and numerous yellow stamens that grade into the petals (outer
// filaments petal-like, inner narrower) around a radiating stigmatic disc
// with carpellary appendages. Floating leaves 15–45 cm, with a deep sinus
// and coarsely sinuate-dentate margins; purple beneath with raised veins,
// sometimes flecked above.
//
// Plate: a pool of still water vignetted on the page, three toothed pads
// and one flower. Loop: ripples spread from the flower's stalk; the flower
// folds shut (as it does each afternoon) and opens again — sepals, outer
// petals, inner petals, then the stamens relax outward.
// Explode: a vertical floral dissection — sepals, petal whorls, stamens and
// stigma stacked along the axis; pads drift apart.
import * as THREE from 'three/webgpu';
import { uv, attribute, mix as tmix, smoothstep, color as tslColor, float, positionLocal, mx_noise_float } from 'three/tsl';
import {
  BladeSurface, TubeSurface, PolarLeaf, lobedOutline, createLathe, cubicPath, mountOnHinge, bladeMaterial,
  translucency, createPond, underwaterWobble, smoother, lineMask, GOLDEN_ANGLE,
} from '../../kits/petal/index.js';
import { sway, mix } from './common.js';

const C = {
  petal: '#fbfaf4',
  petalBase: '#e9eedb',
  petalVein: '#d9dccb',
  sepal: '#4f7a3a',
  sepalStreak: '#5a2a43',
  sepalInner: '#eef0e2',
  stamen: '#f2c230',
  stamenTip: '#f7dd78',
  stigma: '#e7b525',
  pad: '#3d7633',
  padVein: '#6f9a55',
  padUnder: '#6b2b4a',
  fleck: '#7a3a3a',
  stalk: '#6d8a46',
};

/** Open amount (1 open, 0 closed) for a whorl with delay d (s). */
function openAt(t, d = 0) {
  const c0 = 2.35 - d * 0.6, c1 = 3.15 - d * 0.6; // closing (inner whorls first)
  const o0 = 3.4 + d, o1 = 4.85; // reopening (outer whorls first)
  if (t < c0) return 1;
  if (t < c1) return 1 - smoother((t - c0) / (c1 - c0));
  if (t < o0) return 0;
  return smoother((t - o0) / (o1 - o0));
}

/**
 * Build the Nymphaea ampla plate on its pond.
 * @param {{ species: string }} params
 * @param {object} ctx FigureContext (src/kits/ink)
 * @param {import('./common.js').FigureKit} K
 * @returns {{ title: string, beats: Array<{t:number,text:string}>, pose: (t:number, st:object) => void }}
 */
export function build(params, ctx, K) {
  const root = K.root;
  K.layer('petals', 'Petals & sepals', 'Four green sepals and a spiral of white petals');
  K.layer('stamens', 'Stamens & stigma', 'Many yellow stamens grading into petals, around the stigmatic disc');
  K.layer('pads', 'Pads', 'Floating leaves with a deep sinus and toothed margins, purple beneath');
  K.layer('water', 'Water', 'The pond surface with spreading ripples');

  const LEVEL = 1.2;

  // ---------------------------------------------------------------- materials
  const petalMat = bladeMaterial(ctx, {
    base: C.petalBase, mid: C.petal, tip: C.petal, midAt: 0.3,
    veins: 11, vein: C.petalVein, veinStrength: 0.35, veinWidth: 0.06, veinRange: [0.02, 0.8],
    width: 2.4, translucency: 0.5, roughness: 0.5, sheen: 0.5, sheenColor: '#ffffff', name: 'nymphaea-petal', svgColor: C.petal,
  });
  const sepalMat = bladeMaterial(ctx, {
    base: '#5f8a45', mid: C.sepal, tip: '#4a7334', midAt: 0.4,
    veins: 9, vein: C.sepalStreak, veinStrength: 0.45, veinWidth: 0.07, veinRange: [0.08, 0.9],
    patches: [{ color: C.sepalInner, v0: -0.2, v1: 1.2, side: 0, mix: 0.92 }],
    speckle: { color: C.sepalStreak, scale: 3.2, threshold: 0.45, mix: 0.6, side: 1 },
    width: 2.2, translucency: 0.3, roughness: 0.45, name: 'nymphaea-sepal', svgColor: C.sepal,
  });
  const stamenMat = bladeMaterial(ctx, {
    base: '#e9b21f', mid: C.stamen, tip: C.stamenTip, midAt: 0.5, width: 0.35, translucency: 0.4, roughness: 0.55,
    name: 'nymphaea-stamen', svgColor: C.stamen, mottle: 0.03,
  });
  const stigmaMat = ctx.ink({
    colorNode: tmix(tslColor('#d9a21c'), tslColor(C.stigma), smoothstep(0.0, 0.6, uv().y)),
    svgColor: C.stigma, roughness: 0.55, name: 'nymphaea-stigma',
  });
  const stalkMat = ctx.ink({ color: C.stalk, roughness: 0.6, name: 'nymphaea-stalk' });
  const padColor = (() => {
    const U = uv();
    const side = attribute('aSide', 'float');
    const ang = attribute('aAngle', 'float');
    // radiating primary veins from the petiole junction
    const wob = mx_noise_float(positionLocal.mul(0.35)).mul(0.35);
    const ray = lineMask(ang.add(wob.mul(0.08)).mul(17.0 / Math.PI), 0.06).mul(smoothstep(0.06, 0.18, U.y)).mul(float(1).sub(smoothstep(0.6, 0.92, U.y)));
    let c = tmix(tslColor('#4b8a3d'), tslColor(C.pad), smoothstep(0.0, 0.8, U.y));
    c = tmix(c, tslColor(C.padVein), ray.mul(0.25));
    const fleck = smoothstep(0.62, 0.7, mx_noise_float(positionLocal.mul(0.9)));
    c = tmix(c, tslColor(C.fleck), fleck.mul(0.55));
    const under = tmix(tslColor(C.padUnder), tslColor('#8b4366'), ray);
    c = tmix(c, under, side);
    return c.mul(mx_noise_float(positionLocal.mul(0.5)).mul(0.05).add(1));
  })();
  const padMat = ctx.ink({ colorNode: padColor, svgColor: C.pad, roughness: 0.28, clearcoat: 0.4, hatch: 0.7, name: 'nymphaea-pad' });
  padMat.emissiveNode = translucency(padColor, 0.1);
  const underMat = ctx.ink({ color: '#7f8f5a', roughness: 0.7, hatch: 0.3, name: 'nymphaea-underwater' });
  underMat.positionNode = underwaterWobble(ctx, LEVEL, 0.22);

  // ---------------------------------------------------------------- pond
  const flowerAt = new THREE.Vector3(1.5, 0, 2.2);
  const pond = createPond(ctx, {
    radiusX: 21, radiusZ: 17.5, level: LEVEL,
    sources: [
      { x: flowerAt.x, z: flowerAt.z, reach: 15, rings: 3, cycles: 1, amp: 0.07, width: 0.55 },
      { x: -8.5, z: -4.5, reach: 7, rings: 2, cycles: 2, amp: 0.035, width: 0.4, phase: 0.3 },
    ],
  });
  root.add(pond.group);
  K.track(pond);
  K.assign('water', pond.group);

  // ---------------------------------------------------------------- pads
  const pads = new THREE.Group();
  pads.name = 'pads';
  root.add(pads);
  K.assign('pads', pads);
  const padDefs = [
    { x: -8.2, z: -3.6, r: 10.5, yaw: 2.4 },
    { x: 9.6, z: -5.2, r: 8.4, yaw: -0.6 },
    { x: -4.4, z: 9.0, r: 6.2, yaw: 0.9 },
  ];
  const padList = [];
  let padAnchor = null;
  for (const d of padDefs) {
    const surf = K.track(new PolarLeaf({
      outline: lobedOutline({
        lobes: [{ angle: 0, length: d.r, width: Math.PI * 1.25, sharp: 6, body: 0.25 }],
        base: d.r * 0.96, teeth: 38, toothDepth: 0.055, toothShape: 'dentate', toothJitter: 0.6, sinuate: 0.025,
        thetaMax: Math.PI - 0.08, closeSinus: false,
      }),
      thetaMax: Math.PI - 0.08,
      relief: (x, y, rho, th) => 0.32 * Math.pow(rho, 7) + 0.06 * Math.sin(th * 5 + d.yaw) * rho * rho,
      thickness: 0.12, segA: 230, segR: 9,
    }));
    const g = new THREE.Group();
    g.position.set(d.x, LEVEL + 0.06, d.z);
    g.rotation.y = d.yaw;
    pads.add(g);
    const m = K.mesh(surf.geometry, padMat, { name: 'pad', parent: g });
    m.rotation.x = -Math.PI / 2; // leaf XY plane → lying on the water, upper face up
    // petiole down to the pond floor (seen through the water)
    const pet = K.track(new TubeSurface({
      path: cubicPath(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.6, 0.4), new THREE.Vector3(0.8, -1.0, 1.2), new THREE.Vector3(1.2, -LEVEL + 0.1, 2.2)),
      radius: 0.22, radial: 8, segments: 12, capStart: 'open', capEnd: 'open',
    }));
    K.mesh(pet.geometry, underMat, { name: 'petiole', parent: g, outline: false, shadow: false });
    padList.push({ g, d, base: g.position.clone() });
    if (!padAnchor) {
      padAnchor = new THREE.Object3D();
      padAnchor.position.copy(surf.pointAt(0.9, 0.62, 0.1));
      m.add(padAnchor);
    }
  }

  // ---------------------------------------------------------------- flower
  const flower = new THREE.Group();
  flower.name = 'nymphaea-flower';
  flower.position.set(flowerAt.x, LEVEL + 1.9, flowerAt.z);
  root.add(flower);
  const stalk = K.track(new TubeSurface({
    path: cubicPath(new THREE.Vector3(flowerAt.x + 2.5, 0.05, flowerAt.z - 3.0), new THREE.Vector3(flowerAt.x + 1.6, 0.5, flowerAt.z - 1.2), new THREE.Vector3(flowerAt.x, LEVEL - 0.2, flowerAt.z), new THREE.Vector3(flowerAt.x, LEVEL + 1.9, flowerAt.z)),
    radius: 0.32, radial: 10, segments: 18, capStart: 'open', capEnd: 'open',
  }));
  K.mesh(stalk.geometry, underMat, { name: 'peduncle', parent: root, outline: false, shadow: false });
  const collar = K.track(new TubeSurface({
    path: (v, o) => o.set(0, -1.9 + v * 1.95, 0), radius: (v) => 0.34 + 0.25 * v * v, radial: 12, segments: 6, capStart: 'open', capEnd: 'flat',
  }));
  K.mesh(collar.geometry, stalkMat, { name: 'receptacle', parent: flower });

  const perianth = new THREE.Group();
  perianth.name = 'perianth';
  flower.add(perianth);
  K.assign('petals', perianth);
  const sepals = new THREE.Group();
  sepals.name = 'sepals';
  const outerP = new THREE.Group();
  outerP.name = 'petals-outer';
  const innerP = new THREE.Group();
  innerP.name = 'petals-inner';
  perianth.add(sepals, outerP, innerP);
  const whorls = [];
  let sepalAnchor = null, petalAnchor = null;
  for (let i = 0; i < 4; i++) {
    const b = K.track(new BladeSurface({
      length: 6.4, width: 2.2, profile: 'oblong', tip: 0.35, cup: 0.42, curl: -0.08, thickness: 0.09, segU: 10, segV: 18,
    }));
    const m = K.mesh(b.geometry, sepalMat, { name: 'sepal', animated: true });
    const h = mountOnHinge(m, { azimuth: (i / 4) * Math.PI * 2 + Math.PI / 4, radius: 0.55, height: 0.0, open: 1.3 });
    sepals.add(h.az);
    whorls.push({ ...h, blade: b, kind: 'sepal', open: 1.38, closed: 0.1, cup: [1.0, 0.42], curl: [0.3, -0.08], delay: 0 });
    if (i === 1) {
      sepalAnchor = b.attach(new THREE.Object3D(), 0, 0.6, -0.08);
      m.add(sepalAnchor);
    }
  }
  const NP = 18;
  for (let i = 0; i < NP; i++) {
    const outer = i < 9;
    const f = i / (NP - 1);
    const az = i * GOLDEN_ANGLE;
    const len = outer ? 6.6 - f * 1.2 : 5.6 - (f - 0.5) * 1.6;
    const wid = outer ? 2.35 : 1.85;
    const b = K.track(new BladeSurface({
      length: len, width: wid, profile: 'ovate', tip: 0.45, cup: 0.5, curl: 0.12, curlStart: 0.3, thickness: 0.07,
      wave: 0.03, waveFreq: 2, wavePhase: i, segU: 10, segV: 18,
    }));
    const m = K.mesh(b.geometry, petalMat, { name: 'petal', animated: true });
    const h = mountOnHinge(m, { azimuth: az, radius: 0.45 - f * 0.2, height: 0.12 + f * 0.55, open: 1 });
    (outer ? outerP : innerP).add(h.az);
    const open = outer ? 1.18 - f * 0.25 : 0.95 - (f - 0.5) * 0.6;
    whorls.push({ ...h, blade: b, kind: outer ? 'outer' : 'inner', open, closed: 0.06, cup: [1.1, 0.5], curl: [0.35, 0.1], delay: outer ? 0.12 : 0.28, f });
    if (i === 2) {
      petalAnchor = b.attach(new THREE.Object3D(), 0, 0.72, 0.05);
      m.add(petalAnchor);
    }
  }

  // stamens: many, petaloid outside grading to narrow inside, in a spiral
  const androecium = new THREE.Group();
  androecium.name = 'stamens';
  flower.add(androecium);
  K.assign('stamens', androecium);
  const NS = 64;
  const stamenSurf = K.track(new BladeSurface({ length: 1.7, width: 0.36, profile: 'linear', tip: 0.6, cup: 0.4, curl: 0.25, thickness: 0.05, segU: 6, segV: 8 }));
  const stamens = new THREE.InstancedMesh(stamenSurf.geometry, stamenMat, NS);
  stamens.name = 'stamens';
  stamens.frustumCulled = false;
  androecium.add(stamens);
  ctx.outline(stamens, { width: 0.5 });
  const stamenDefs = [];
  for (let i = 0; i < NS; i++) {
    const f = i / (NS - 1); // 0 outer … 1 inner
    stamenDefs.push({ az: i * GOLDEN_ANGLE, r: mix(1.25, 0.62, f), h: mix(0.62, 0.92, f), tilt: mix(0.95, 0.22, f), s: mix(1.25, 0.8, f), w: mix(1.6, 0.8, f) });
  }
  // Picks and label rays test an instanced mesh's bounding sphere before any
  // instance, and three keeps the first pose's. The stamens only turn as they
  // relax, so one sphere holds for every pose: each one's reach from its own
  // place, at its largest scale.
  {
    const gs = stamenSurf.geometry.boundingSphere;
    const reach = gs.center.length() + gs.radius;
    const cy = (stamenDefs[0].h + stamenDefs[NS - 1].h) / 2; // h climbs from the outer to the inner
    let radius = 0;
    for (const d of stamenDefs) radius = Math.max(radius, Math.hypot(d.r, d.h - cy) + Math.max(d.w, d.s, 1) * reach);
    stamens.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, cy, 0), radius);
  }
  const stamenAnchor = new THREE.Object3D();
  androecium.add(stamenAnchor);
  // stigma: radiating disc with carpellary appendages
  const gyn = new THREE.Group();
  gyn.name = 'stigma';
  gyn.position.y = 0.95;
  flower.add(gyn);
  K.assign('stamens', gyn);
  const disc = createLathe({ profile: [[0, 0.02], [0.35, 0.08], [0.62, 0.2], [0.66, 0.3], [0.5, 0.26], [0.2, 0.12], [0, 0.1]], segments: 28, ridges: 14, ridgeDepth: 0.06 });
  K.mesh(disc, stigmaMat, { name: 'stigma-disc', parent: gyn, outline: 0.7 });
  const appGeo = K.track(new TubeSurface({
    path: cubicPath(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.18, 0.05), new THREE.Vector3(0, 0.3, -0.05), new THREE.Vector3(0, 0.34, -0.16)),
    radius: (v) => 0.06 * (1 - 0.6 * v), radial: 5, segments: 6, capStart: 'open', capEnd: 'round',
  })).geometry;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const ap = K.mesh(appGeo, stigmaMat, { name: 'carpellary-appendage', parent: gyn, outline: 0.5 });
    ap.position.set(Math.sin(a) * 0.62, 0.26, Math.cos(a) * 0.62);
    ap.rotation.y = a;
  }
  const stigmaAnchor = new THREE.Object3D();
  stigmaAnchor.position.set(0, 0.28, 0.25);
  gyn.add(stigmaAnchor);

  // ---------------------------------------------------------------- labels & parts
  K.label('petal', 'Petal', 'About 12–21 white petals in a spiral open by day.', petalAnchor, [0, 0, 0], 'petals');
  K.label('sepal', 'Sepal', 'Four sepals, green with purplish streaks outside.', sepalAnchor, [0, 0, 0], 'petals');
  K.label('stamens', 'Stamens', 'Numerous yellow stamens; the outer ones are petal-like.', stamenAnchor, [0, 0, 0], 'stamens');
  K.label('stigma', 'Stigma', 'A radiating stigmatic disc ringed by carpellary appendages.', stigmaAnchor, [0, 0, 0], 'stamens');
  K.label('pad', 'Pad', 'A floating leaf with a deep sinus and toothed edge, purple beneath.', padAnchor, [0, 0, 0], 'pads');

  K.part('sepals', 'Sepals', sepals, C.sepal, 'petals');
  K.part('petals-outer', 'Petals (outer)', outerP, C.petal, 'petals');
  K.part('petals-inner', 'Petals (inner)', innerP, '#f4f3ea', 'petals');
  K.part('stamens', 'Stamens', androecium, C.stamen, 'stamens');
  K.part('stigma', 'Stigma', gyn, C.stigma, 'stamens');
  K.part('pads', 'Pads', pads, C.pad, 'pads');
  K.part('water', 'Water', pond.group, '#9cc3bc', 'water');

  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const last = new Map();
  return {
    title: 'Nymphaea ampla — the white water lily opening on the pond',
    beats: [
      { t: 0, text: 'Open by day: white petals spiral around a crown of yellow stamens.' },
      { t: 0.8, text: 'Ripples spread from the flower\'s stalk across the still water.' },
      { t: 2.35, text: 'Time-lapse: the flower folds shut, as it does each afternoon…' },
      { t: 3.4, text: '…and opens again: sepals, outer petals, inner petals, stamens.' },
    ],
    pose(t, st) {
      const ex = st.explode ?? 0;
      const k = st.reducedMotion ? 0.2 : 1; // calmer swell under prefers-reduced-motion
      for (const w of whorls) {
        const o = Math.max(openAt(t, w.delay), ex);
        const key = Math.round(o * 2000);
        if (last.get(w) !== key) {
          w.hinge.rotation.x = mix(w.closed, w.open, o);
          w.blade.p.cup = mix(w.cup[0], w.cup[1], o);
          w.blade.p.curl = mix(w.curl[0], w.curl[1], o);
          w.blade.rebuild();
          last.set(w, key);
        }
      }
      // stamens relax outward as the flower opens; dissection lifts them
      const oS = Math.max(openAt(t, 0.38), ex);
      for (let i = 0; i < NS; i++) {
        const d = stamenDefs[i];
        _e.set(mix(0.08, d.tilt, oS), d.az, 0, 'YXZ');
        _q.setFromEuler(_e);
        _p.set(Math.sin(d.az) * d.r, d.h, Math.cos(d.az) * d.r);
        _s.set(d.w, d.s, 1);
        _m.compose(_p, _q, _s);
        stamens.setMatrixAt(i, _m);
      }
      stamens.instanceMatrix.needsUpdate = true;
      stamenAnchor.position.set(Math.sin(0.6) * 1.5, 1.6, Math.cos(0.6) * 1.5);
      // dissection: whorls stacked along the vertical axis
      sepals.position.y = -1.6 * ex;
      outerP.position.y = 0.6 * ex;
      innerP.position.y = 2.4 * ex;
      androecium.position.y = 4.2 * ex;
      gyn.position.y = 0.95 + 6.0 * ex;
      for (const p of padList) {
        const dir = _p.set(p.base.x - flowerAt.x, 0, p.base.z - flowerAt.z).normalize();
        p.g.position.copy(p.base).addScaledVector(dir, 3.5 * ex);
        // pads ride the swell
        p.g.position.y = p.base.y + 0.05 * k * sway(t, 1, p.d.yaw * 0.3);
        p.g.rotation.set(0.006 * k * sway(t, 1, p.d.yaw), p.d.yaw + 0.02 * k * sway(t, 1, 0.2 + p.d.r * 0.1), 0.006 * k * sway(t, 2, p.d.yaw));
      }
      flower.position.y = LEVEL + 1.9 + 0.08 * k * sway(t, 1, 0.15);
      flower.rotation.set(0.02 * k * sway(t, 1, 0.4), 0, 0.02 * k * sway(t, 1));
    },
  };
}
