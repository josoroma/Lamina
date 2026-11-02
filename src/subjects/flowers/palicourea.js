// Palicourea elata — labios de mujer, "hot lips" (syn. Psychotria elata).
//
// Botany (Kew POWO; Hammel in Manual de Plantas de Costa Rica; Wikipedia):
// an understory shrub of wet forest, 1–3 (4) m, in the coffee family
// (Rubiaceae): simple opposite leaves with interpetiolar stipules. The
// terminal inflorescence is held between two glossy red bracts that, before
// flowering, resemble a pair of lips; small white, star-shaped (5-lobed)
// tubular flowers then emerge between them. Visited by hummingbirds and
// butterflies; fruits are small dark blue-black berries.
//
// Plate: a leafy shoot tip with two decussate leaf pairs and the red "lips"
// turned towards the reader. Loop: the bracts part, a cluster of white
// flowers rises and opens its stars, then the lips close again (loop).
// Explode: the bracts open apart, the flower cluster rises and fans out,
// the leaf pairs slide outward from the stem.
import * as THREE from 'three/webgpu';
import { uv, mix as tmix, smoothstep, color as tslColor, attribute, float, abs, positionLocal, mx_noise_float } from 'three/tsl';
import {
  BladeSurface, CorollaSurface, TubeSurface, createLathe, cubicPath, orient, mountOnHinge, bladeMaterial,
  corollaMaterial, translucency, smoother, lineMask,
} from '../../kits/petal/index.js';
import { sway, mix } from './common.js';

const C = {
  bract: '#c4122d',
  bractDeep: '#8e0b20',
  bractLight: '#e2384a',
  flower: '#fbfaf3',
  tube: '#ece9cf',
  calyx: '#7f9a4a',
  leaf: '#2f5c2a',
  leafUnder: '#78955c',
  vein: '#244a20',
  stem: '#56793a',
  stipule: '#7e9a52',
};

// flower head: lean between neighbours across the gap, lean towards a lip
// (rad), and how much higher the back row's stars sit (cm)
const HEAD_STEP = 0.2;
const HEAD_LEAN = 0.15;
const HEAD_LIFT = 0.3;
// flower axes radiate (across the gap) from a line this far below the head (cm)
const HEAD_R = 1.0;

/** Lips: 0 closed … 1 parted. */
function partAt(t) {
  if (t < 0.55) return 0;
  if (t < 1.75) return smoother((t - 0.55) / 1.2);
  if (t < 3.9) return 1;
  if (t < 4.85) return 1 - smoother((t - 3.9) / 0.95);
  return 0;
}
/** Flower i (0..n-1) emergence 0..1, staggered. */
function emergeAt(t, i, n) {
  const d = (i / Math.max(1, n - 1)) * 0.75;
  if (t < 1.15 + d) return 0;
  if (t < 2.35 + d) return smoother((t - 1.15 - d) / 1.2);
  if (t < 3.75 - d * 0.3) return 1;
  // sink quickly, so the flowers are in before the closing lips reach them
  if (t < 4.4 - d * 0.3) return 1 - smoother((t - 3.75 + d * 0.3) / 0.65);
  return 0;
}

/**
 * Build the Palicourea elata plate.
 * @param {{ species: string }} params
 * @param {object} ctx FigureContext (src/kits/ink)
 * @param {import('./common.js').FigureKit} K
 * @returns {{ title: string, beats: Array<{t:number,text:string}>, pose: (t:number, st:object) => void }}
 */
export function build(params, ctx, K) {
  const root = K.root;
  K.layer('bracts', 'Bracts', 'Two glossy red bracts — the "lips" — hold the inflorescence');
  K.layer('flowers', 'Flowers', 'Small white star-shaped flowers that open between the bracts');
  K.layer('leaves', 'Leaves', 'Opposite leaves with stipules between their stalks (coffee family)');

  // ---------------------------------------------------------------- materials
  const bractMat = bladeMaterial(ctx, {
    base: C.bractDeep, mid: C.bract, tip: C.bractLight, midAt: 0.5,
    veins: 9, vein: C.bractDeep, veinStrength: 0.18, veinWidth: 0.07,
    abaxial: C.bract, width: 3.6, translucency: 0.25, roughness: 0.22, clearcoat: 0.9, name: 'palicourea-bract', svgColor: C.bract,
  });
  const flowerMat = corollaMaterial(ctx, {
    base: C.tube, mid: C.flower, tip: C.flower, midAt: 0.45, length: 2.0, translucency: 0.35, roughness: 0.55,
    name: 'palicourea-flower', svgColor: C.flower,
  });
  const calyxMat = ctx.ink({ color: C.calyx, roughness: 0.6, name: 'palicourea-calyx' });
  const stemMat = ctx.ink({ color: C.stem, roughness: 0.6, name: 'palicourea-stem' });
  const stipuleMat = ctx.ink({ color: C.stipule, roughness: 0.6, name: 'palicourea-stipule' });
  const leafColor = (() => {
    const U = uv();
    const side = attribute('aSide', 'float');
    const d = abs(U.x.sub(0.5));
    // pinnate secondary veins arching from the midrib towards the tip
    const lat = U.y.mul(11.0).sub(d.mul(5.2)).mul(1.0);
    let c = tmix(tslColor('#3c6c33'), tslColor(C.leaf), smoothstep(0.0, 0.45, d));
    c = tmix(c, tslColor(C.vein), lineMask(lat, 0.05).mul(float(1).sub(smoothstep(0.38, 0.5, d))).mul(0.55));
    c = tmix(c, tslColor('#8ba76a'), float(1).sub(smoothstep(0.006, 0.016, d)).mul(0.7));
    c = tmix(c, tslColor(C.leafUnder), side.mul(0.85));
    return c.mul(mx_noise_float(positionLocal.mul(1.1)).mul(0.05).add(1));
  })();
  const leafMat = ctx.ink({ colorNode: leafColor, svgColor: C.leaf, roughness: 0.32, clearcoat: 0.35, name: 'palicourea-leaf' });
  leafMat.emissiveNode = translucency(leafColor, 0.12);

  // ---------------------------------------------------------------- stem & leaves
  const shoot = new THREE.Group();
  shoot.name = 'shoot';
  root.add(shoot);
  const stemPath = cubicPath(new THREE.Vector3(0, 0, -1.0), new THREE.Vector3(0.2, 5, -1.2), new THREE.Vector3(-0.4, 10.2, -0.6), new THREE.Vector3(0.6, 13.6, 0.2));
  const stem = K.track(new TubeSurface({
    path: stemPath, radius: (v) => 0.42 - 0.12 * v, radial: 10, segments: 30, capStart: 'flat', capEnd: 'open',
  }));
  K.mesh(stem.geometry, stemMat, { name: 'stem', parent: shoot });
  const leaves = new THREE.Group();
  leaves.name = 'leaves';
  shoot.add(leaves);
  K.assign('leaves', leaves);
  const leafPairs = [];
  let leafAnchor = null;
  const pairs = [
    { v: 0.3, az: 0.95, len: 12.0, wid: 4.9, droop: -0.55, rise: 0.4 },
    { v: 0.68, az: 0.95 + Math.PI / 2, len: 9.5, wid: 4.0, droop: -0.45, rise: 0.52 },
  ];
  for (const p of pairs) {
    const n = stem.pointAt(p.v, new THREE.Vector3());
    for (const s of [-1, 1]) {
      const az = p.az + (s < 0 ? Math.PI : 0);
      const out = new THREE.Vector3(Math.sin(az), 0, Math.cos(az));
      const lg = new THREE.Group();
      lg.position.copy(n);
      leaves.add(lg);
      const pet = K.track(new TubeSurface({
        path: (v, o) => o.set(out.x * 1.6 * v, 0.5 * v, out.z * 1.6 * v), radius: 0.14, radial: 8, segments: 6, capStart: 'open', capEnd: 'open',
      }));
      K.mesh(pet.geometry, stemMat, { name: 'petiole', parent: lg, outline: 0.8 });
      const blade = K.track(new BladeSurface({
        length: p.len, width: p.wid, profile: 'elliptic', tip: 0.25, cup: 0.22, fold: 0.12, curl: p.droop, curlStart: 0.2, curlPow: 1.4,
        wave: 0.08, waveFreq: 3, wavePhase: az, thickness: 0.09, segU: 14, segV: 24,
      }));
      const bm = K.mesh(blade.geometry, leafMat, { name: 'leaf', parent: lg });
      bm.position.set(out.x * 1.6, 0.5, out.z * 1.6);
      const dir = out.clone().multiplyScalar(Math.cos(p.rise)).add(new THREE.Vector3(0, Math.sin(p.rise), 0));
      orient(bm, dir, new THREE.Vector3(0, 1, 0).addScaledVector(out, -0.3));
      leafPairs.push({ g: lg, out, base: lg.position.clone() });
      if (!leafAnchor && s > 0) {
        leafAnchor = blade.attach(new THREE.Object3D(), 0.25, 0.55, 0.1);
        bm.add(leafAnchor);
      }
    }
    // interpetiolar stipules (a Rubiaceae hallmark), between the petioles
    for (const s of [-1, 1]) {
      const az = p.az + Math.PI / 2 + (s < 0 ? Math.PI : 0);
      const st = K.track(new BladeSurface({ length: 0.9, width: 0.7, profile: 'cordate', cup: 0.6, thickness: 0.05, segU: 6, segV: 8 }));
      const sm = K.mesh(st.geometry, stipuleMat, { name: 'stipule', parent: leaves, outline: 0.7 });
      sm.position.copy(n).add(new THREE.Vector3(Math.sin(az) * 0.32, 0.1, Math.cos(az) * 0.32));
      orient(sm, [Math.sin(az) * 0.3, 1, Math.cos(az) * 0.3], [Math.sin(az), 0, Math.cos(az)]);
    }
  }

  // ---------------------------------------------------------------- inflorescence
  const infl = new THREE.Group();
  infl.name = 'inflorescence';
  const top = stem.pointAt(1, new THREE.Vector3());
  infl.position.copy(top);
  // the peduncle turns the head sideways so the bracts meet like lips in profile
  orient(infl, [0.79, 0.35, 0.5], [0, 0.82, -0.57]);
  shoot.add(infl);
  const ped = K.track(new TubeSurface({ path: (v, o) => o.set(0, -0.3 + v * 1.4, 0), radius: 0.3, radial: 10, segments: 4, capStart: 'open', capEnd: 'flat' }));
  K.mesh(ped.geometry, stemMat, { name: 'peduncle', parent: infl });
  const head = new THREE.Group();
  head.position.y = 1.2;
  infl.add(head);

  const bracts = new THREE.Group();
  bracts.name = 'bracts';
  head.add(bracts);
  K.assign('bracts', bracts);
  const bractH = [];
  for (const az of [0, Math.PI]) {
    const b = K.track(new BladeSurface({
      length: 3.1, width: 4.7, profile: [[0, 0.42], [0.12, 0.8], [0.35, 1], [0.6, 0.98], [0.82, 0.86], [1, 0.62]], tip: 1,
      cup: 1.15, curl: 0.8, curlStart: 0.1, curlPow: 1.1, thickness: 0.48, segU: 20, segV: 20,
    }));
    const m = K.mesh(b.geometry, bractMat, { name: 'bract', animated: true });
    const h = mountOnHinge(m, { azimuth: az, radius: 0.32, height: 0, open: 0.3 });
    bracts.add(h.az);
    bractH.push({ ...h, blade: b });
  }
  // on the second bract's outer face, toward its margin: the reader sees that
  // stretch at every moment, in the book and in inspect, on a desk and on a
  // phone (an anchor on the first bract's midline was hidden at every
  // moment). The plump blade's outer face lies 0.09 cm below its mid-surface
  // here; the anchor sits 0.03 cm past it.
  const bractAnchor = bractH[1].blade.attach(new THREE.Object3D(), 0.81, 0.76, -0.12);
  bractH[1].mesh.add(bractAnchor);

  // flowers: a small capitate cluster; a narrowly funnelform corolla about
  // 2 cm long (tube ca. 16 mm, five pointed lobes 2.5–4 mm: Hammel, Manual
  // de Plantas de Costa Rica) opening a star-shaped limb
  const flowers = new THREE.Group();
  flowers.name = 'flowers';
  head.add(flowers);
  K.assign('flowers', flowers);
  const flowerList = [];
  const NF = 7;
  const calyxGeo = createLathe({ profile: [[0, -0.35], [0.12, -0.3], [0.16, -0.05], [0.18, 0.08], [0.1, 0.1], [0, 0.1]], segments: 10 });
  K.track(calyxGeo);
  // The lips part along ±Z, so the spray fans across the gap (X): two
  // staggered rows leaning a little towards either lip (less at the ends,
  // where the cupped bract margins rise), the back row raised so neighbouring
  // stars (≈0.9 cm across, ≈1.9 cm out) sit at different heights. Each base
  // sits on its own axis and the axes radiate from below the head, so the
  // tubes never cross, even while they sink; flowers emerge from the centre out.
  const kMax = Math.ceil((NF - 1) / 2);
  for (let i = 0; i < NF; i++) {
    const a = i * 2.39996 + 0.4;
    const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1); // 0, 1, -1, 2, -2 … centre out
    const back = (k + 8) % 2; // alternate rows across the fan
    const jit = Math.sin(i * 12.9898) * 0.05;
    const lean = (back ? -1 : 1) * HEAD_LEAN * (1 - 0.7 * (Math.abs(k) / kMax) ** 2);
    const tilt = new THREE.Vector3(Math.tan(k * HEAD_STEP + jit), 1, Math.tan(lean + 0.3 * jit)).normalize();
    const g = new THREE.Group();
    // across the gap the rays meet HEAD_R below the head; towards the lips the
    // bases stay near the mid-plane, clear of the bracts' narrow cupped bases
    const pos = new THREE.Vector3(tilt.x * HEAD_R, (tilt.y - 1) * HEAD_R, tilt.z * 0.5);
    g.position.copy(pos);
    orient(g, tilt, [0, 0, 1]);
    flowers.add(g);
    const cs = K.track(new CorollaSurface({
      length: 2.0, baseRadius: 0.1, funnel: 0.05, throat: 0.7, flare: 1.5, flarePow: 1.3, lobes: 5, lobeDepth: 0.18,
      lobeRound: 1.5, lobeOffset: a, thickness: 0.035, segPerLobe: 8, segV: 16,
    }));
    const cm = K.mesh(cs.geometry, flowerMat, { name: 'flower', parent: g, outline: 0.75, animated: true });
    K.mesh(calyxGeo, calyxMat, { name: 'calyx', parent: g, outline: 0.6 });
    flowerList.push({ g, cs, cm, base: pos.clone(), tilt, lift: back * HEAD_LIFT, i, lastE: -1 });
  }
  // The flower label rides on the always-shown `flowers` group and follows
  // flower 0's star mouth in pose(). Flower 0's own group hides until it
  // emerges, which dropped the label for a third of the loop (and for good
  // at t = 0 under reduced motion); now, while the flowers wait inside the
  // closed lips, the anchor waits there too and is listed as occluded.
  const f0 = flowerList[0];
  const flowerAnchor = new THREE.Object3D();
  flowers.add(flowerAnchor);
  // the star's centre: the corolla axis at the top of the tube (built open)
  const mouthY = (() => {
    const cs = f0.cs, p = new THREE.Vector3(), sum = new THREE.Vector3();
    const v = Math.max(2, Math.round(cs.segV * 0.6)) / cs.segV;
    for (let l = 0; l < cs.p.lobes; l++) sum.add(cs.pointAt(l, v, 0, p));
    return sum.y / cs.p.lobes;
  })();

  // ---------------------------------------------------------------- labels & parts
  K.label('bract', 'Bract', 'A glossy red bract; the pair looks like lips before the flowers open.', bractAnchor, [0, 0, 0], 'bracts');
  K.label('flower', 'Flower', 'Small white tubular flowers with a five-pointed star mouth.', flowerAnchor, [0, 0, 0], 'flowers');
  K.label('leaf', 'Leaf', 'Opposite leaves; a stipule bridges each pair, a coffee-family trait.', leafAnchor, [0, 0, 0], 'leaves');

  K.part('bracts', 'Bracts', bracts, C.bract, 'bracts');
  K.part('flowers', 'Flowers', flowers, C.flower, 'flowers');
  K.part('leaves', 'Leaves & stipules', leaves, C.leaf, 'leaves');
  K.part('stem', 'Stem & peduncle', shoot, C.stem);

  const last = { part: -1 };
  return {
    title: 'Palicourea elata — labios de mujer opening',
    beats: [
      { t: 0, text: 'Two glossy red bracts press together like a pair of lips.' },
      { t: 0.55, text: 'The bracts part…' },
      { t: 1.15, text: '…and small white flowers rise between them, opening five-pointed stars.' },
      { t: 3.9, text: 'Loop: the flowers sink back and the lips close.' },
    ],
    pose(t, st) {
      const ex = st.explode ?? 0;
      const pa = Math.max(partAt(t), ex);
      if (Math.abs(pa - last.part) > 1e-4) {
        // closed: two plump lips pressed together; parted: they open like a mouth
        for (const h of bractH) {
          h.hinge.rotation.x = mix(0.62, 1.12, pa);
          h.blade.p.curl = mix(0.7, 0.5, pa);
          h.blade.p.cup = mix(1.3, 0.9, pa);
          h.blade.rebuild();
        }
        last.part = pa;
      }
      bractH[0].az.position.set(0, 0, 2.0 * ex);
      bractH[1].az.position.set(0, 0, -2.0 * ex);
      for (const f of flowerList) {
        const e = Math.max(emergeAt(t, f.i, NF), ex);
        if (Math.abs(e - f.lastE) > 1e-4) {
          f.cs.p.flare = mix(0.08, 1.5, smoother((e - 0.35) / 0.65));
          f.cs.rebuild();
          f.lastE = e;
        }
        // hidden inside the closed lips until they emerge
        f.g.visible = e > 0.004;
        const rise = mix(-0.35, 0.55 + f.lift, e);
        f.g.position.copy(f.base).addScaledVector(f.tilt, rise + 2.2 * ex);
        f.g.position.x += f.base.x * 1.2 * ex;
        f.g.position.z += f.base.z * 1.2 * ex;
        f.g.scale.setScalar(mix(0.45, 1, e));
      }
      // flower 0's mouth, up its axis (orient maps local +Y to tilt)
      flowerAnchor.position.copy(f0.g.position).addScaledVector(f0.tilt, mouthY * f0.g.scale.y);
      for (const lp of leafPairs) lp.g.position.copy(lp.base).addScaledVector(lp.out, 1.6 * ex);
      // a slow understory sway (calmer under prefers-reduced-motion)
      const k = st.reducedMotion ? 0.2 : 1;
      shoot.rotation.set(0.012 * k * sway(t, 1, 0.2), 0, 0.016 * k * sway(t, 1));
      head.rotation.set(0.02 * k * sway(t, 2, 0.1), 0, 0);
    },
  };
}
