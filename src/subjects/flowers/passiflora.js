// Passiflora vitifolia — granadilla de monte (scarlet passion flower).
//
// Botany (Croat, Flora of Barro Colorado Island; Kew POWO): flowers solitary
// in the leaf axils, 10–15 cm wide; 5 narrowly lanceolate sepals 6–8 cm with
// a slender appendage at the apex and 5 linear-lanceolate petals 4–6 cm, all
// deep scarlet and reflexed when open; corona filaments in 3 series, the
// outer longest (to 2 cm), erect, bright red (or yellow); a short pale-red
// androgynophore carrying 5 green anthers held perpendicular, a densely
// tomentulose ovary and 3 styles with capitate stigmas; 3 free lanceolate,
// glandular-serrate bracts 2.5–3 cm; leaves deeply three-lobed, cordate,
// 7–14 cm, lobes acute to acuminate, serrate; axillary coiling tendrils.
//
// Plate: a vine sprig arching over the page — two leaves, a coiling
// tendril, a bud, and the flower facing the reader. The 5 s loop: the open
// flower's corona ripples in a travelling wave while the tendril coils;
// time-lapse: at the end of its single day the flower closes and dissolves,
// and a fresh bud takes its place at the node and opens, whorl by whorl.
// Explode: classic dissection — bracts, sepals, petals, the three corona
// series, androgynophore, stamens and gynoecium stacked along the axis, the
// flower turned to a three-quarter view so the stack spreads across the page.
import * as THREE from 'three/webgpu';
import { uv, mix as tmix, smoothstep, color as tslColor, attribute, abs, float, mx_noise_float, positionLocal } from 'three/tsl';
import {
  BladeSurface, TubeSurface, PolarLeaf, lobedOutline, createLathe, helixPath, cubicPath, orient, mountOnHinge,
  bladeMaterial, fuzz, translucency, smoother,
} from '../../kits/petal/index.js';
import { setFade } from '../../kits/ink/index.js';
import { sway, mix } from './common.js';

const C = {
  scarlet: '#cf2419',
  scarletDeep: '#8f130f',
  scarletLight: '#ec4a30',
  sepalBack: '#a8392a',
  sepalBase: '#7a8a3c',
  petal: '#e2321f',
  coronaOuter: '#c4221a',
  coronaTip: '#f4b23a',
  coronaMid: '#d8471f',
  coronaInner: '#f2eadb',
  column: '#dc9a88',
  anther: '#a9b84d',
  ovary: '#8fa54b',
  style: '#a8473a',
  stigma: '#b9bd58',
  receptacle: '#6d9440',
  bract: '#5b8a38',
  leaf: '#38652a',
  leafUnder: '#7f9d5f',
  vein: '#bccf8d',
  stem: '#54782f',
  tendril: '#79a04a',
};

/** Open-amount timeline (1 open, 0 bud), per whorl delay `d` seconds. */
function openAt(t, d = 0) {
  if (t < 2.75 + d * 0.5) return 1;
  if (t < 3.4 + d * 0.5) return 1 - smoother((t - 2.75 - d * 0.5) / 0.65);
  if (t < SWAP_IN + d) return 0;
  return smoother((t - SWAP_IN - d) / (4.9 - SWAP_IN - d));
}

// A one-day flower never reopens: once shut (3.525 s) the spent flower
// dissolves, and a fresh, slightly smaller bud dissolves in at the same node
// and swells as it opens, full size again at the loop seam.
const SWAP_OUT = 3.53;
const SWAP_MID = 3.64;
const SWAP_IN = 3.77;
/** Visibility of the flower at the node through the swap (1 shown). */
function swapFadeAt(t) {
  if (t < SWAP_OUT || t >= SWAP_IN) return 1;
  if (t < SWAP_MID) return 1 - smoother((t - SWAP_OUT) / (SWAP_MID - SWAP_OUT));
  return smoother((t - SWAP_MID) / (SWAP_IN - SWAP_MID));
}
/** Size of the flower at the node: the fresh bud starts at 86 %. */
function swapScaleAt(t) {
  if (t < SWAP_MID) return 1;
  return 0.86 + 0.14 * smoother((t - SWAP_MID) / (4.9 - SWAP_MID));
}

/**
 * Build the Passiflora vitifolia plate.
 * @param {{ species: string }} params
 * @param {object} ctx FigureContext (src/kits/ink)
 * @param {import('./common.js').FigureKit} K
 * @returns {{ title: string, beats: Array<{t:number,text:string}>, pose: (t:number, st:object) => void }}
 */
export function build(params, ctx, K) {
  const root = K.root;
  K.layer('petals', 'Sepals & petals', 'The scarlet perianth: 5 sepals with apical appendages and 5 petals');
  K.layer('corona', 'Corona', 'Three series of filaments — the passion flower\'s signature crown');
  K.layer('androgynophore', 'Androgynophore', 'The central column carrying 5 anthers, the ovary and 3 styles');

  // ---------------------------------------------------------------- materials
  const sepalMat = bladeMaterial(ctx, {
    base: C.scarletDeep, mid: C.scarlet, tip: C.scarlet, midAt: 0.3,
    veins: 9, vein: C.scarletDeep, veinStrength: 0.25, veinWidth: 0.09, midrib: 0.35,
    abaxial: C.sepalBack, patches: [{ color: C.sepalBase, v0: -0.2, v1: 0.22, side: 1, mix: 0.7 }],
    width: 1.55, translucency: 0.4, roughness: 0.55, sheen: 0.35, name: 'passiflora-sepal', svgColor: C.scarlet,
  });
  const petalMat = bladeMaterial(ctx, {
    base: C.scarletDeep, mid: C.petal, tip: C.scarletLight, midAt: 0.35,
    veins: 7, vein: C.scarletDeep, veinStrength: 0.22, veinWidth: 0.09,
    width: 1.25, translucency: 0.45, roughness: 0.5, sheen: 0.4, name: 'passiflora-petal', svgColor: C.petal,
  });
  const bractMat = bladeMaterial(ctx, {
    base: '#6f9a45', mid: C.bract, tip: '#4c7a30', veins: 5, vein: '#3f6a28', veinStrength: 0.25,
    margin: '#86a85a', marginWidth: 0.1, width: 1.0, translucency: 0.25, name: 'passiflora-bract', svgColor: C.bract,
  });
  const recMat = ctx.ink({ color: C.receptacle, roughness: 0.6, name: 'passiflora-receptacle' });
  const awnMat = ctx.ink({ color: '#7a8f3a', roughness: 0.6, name: 'passiflora-awn' });
  const fil = (base, tip, at) => {
    const v = uv().y;
    const n = tmix(tslColor(base), tslColor(tip), smoothstep(at, 1.0, v));
    const m = ctx.ink({ colorNode: n, svgColor: base, roughness: 0.5, hatch: 0.4, name: 'passiflora-corona' });
    m.emissiveNode = translucency(n, 0.35);
    return m;
  };
  const outerMat = fil(C.coronaOuter, C.coronaTip, 0.84);
  const midMat = fil(C.coronaOuter, '#ef7a2a', 0.55);
  const innerMat = fil('#e7b9b0', C.coronaInner, 0.3);
  const columnMat = ctx.ink({
    colorNode: tmix(tslColor(C.column), tslColor('#9b2e25'), smoothstep(0.42, 0.62, mx_noise_float(positionLocal.mul(6.0)))),
    svgColor: C.column, roughness: 0.55, name: 'passiflora-column',
  });
  const operMat = ctx.ink({ color: '#efd9cf', roughness: 0.6, name: 'passiflora-operculum' });
  const antherMat = ctx.ink({ color: C.anther, roughness: 0.55, name: 'passiflora-anther' });
  const filamentMat = ctx.ink({ color: '#b9c79a', roughness: 0.6, name: 'passiflora-filament' });
  const ovaryMat = ctx.ink({ color: C.ovary, roughness: 0.75, name: 'passiflora-ovary' });
  ovaryMat.emissiveNode = fuzz('#e6efc8', 0.45, 1.8);
  const styleMat = ctx.ink({ color: C.style, roughness: 0.55, name: 'passiflora-style' });
  const stigmaMat = ctx.ink({ color: C.stigma, roughness: 0.6, name: 'passiflora-stigma' });
  const stemMat = ctx.ink({ color: C.stem, roughness: 0.7, name: 'passiflora-stem' });
  stemMat.emissiveNode = fuzz('#cfe0a8', 0.2, 2.5);
  const tendrilMat = ctx.ink({ color: C.tendril, roughness: 0.65, name: 'passiflora-tendril' });
  const leafColor = (() => {
    const U = uv();
    const ang = attribute('aAngle', 'float');
    const side = attribute('aSide', 'float');
    let c = tmix(tslColor('#2f5a24'), tslColor(C.leaf), smoothstep(0.0, 0.7, U.y));
    // three primary veins (palmate) on the lobe axes, fading to the margin
    let vm = float(0);
    for (const a of [0, -1.05, 1.05]) {
      const d = abs(ang.sub(a)).mul(U.y.max(0.04)).mul(6.0);
      vm = vm.max(float(1).sub(smoothstep(0.04, 0.11, d)).mul(float(1).sub(smoothstep(0.55, 0.95, U.y))));
    }
    c = tmix(c, tslColor(C.vein), vm.mul(0.75));
    c = tmix(c, tslColor(C.leafUnder), side.mul(0.85));
    return c.mul(mx_noise_float(positionLocal.mul(1.4)).mul(0.06).add(1));
  })();
  const leafMat = ctx.ink({ colorNode: leafColor, svgColor: C.leaf, roughness: 0.6, sheen: 0.25, name: 'passiflora-leaf' });
  leafMat.emissiveNode = translucency(leafColor, 0.18);

  // ---------------------------------------------------------------- stem
  const stemPath = cubicPath(
    new THREE.Vector3(-12.5, 0.55, -5.5),
    new THREE.Vector3(-6, 10.5, -7.5),
    new THREE.Vector3(5.5, 10.5, -4.0),
    new THREE.Vector3(12.5, 3.2, 3.5)
  );
  const stem = K.track(new TubeSurface({
    path: stemPath, radius: (v) => 0.36 - 0.14 * v, radial: 10, segments: 64, capStart: 'flat', capEnd: 'round',
    up: new THREE.Vector3(0, 1, 0),
  }));
  const vineGroup = new THREE.Group();
  vineGroup.name = 'vine';
  root.add(vineGroup);
  const stemMesh = K.mesh(stem.geometry, stemMat, { name: 'stem', parent: vineGroup });
  const node = (v) => stem.pointAt(v, new THREE.Vector3());

  // ---------------------------------------------------------------- leaves
  const leafSurf = K.track(new PolarLeaf({
    outline: lobedOutline({
      lobes: [
        { angle: 0, length: 7.4, width: 0.72, sharp: 1.1, body: 0.72 },
        { angle: -1.08, length: 6.0, width: 0.68, sharp: 1.1, body: 0.72 },
        { angle: 1.08, length: 6.0, width: 0.68, sharp: 1.1, body: 0.72 },
      ],
      base: 1.7, auricle: 2.3, teeth: 64, toothDepth: 0.035,
    }),
    // relief in cm of (x, y) only, so the pinched cordate base stays one point
    relief: (x, y) => -0.045 * (x * x + y * y) * 0.32 + 0.22 * Math.abs(x) / (1 + Math.abs(x)) - 0.007 * Math.hypot(x, y),
    // 5 columns per marginal tooth (64 teeth around), or the teeth alias
    thickness: 0.09, segA: 320, segR: 8, closedEnds: true,
  }));
  const leaves = new THREE.Group();
  leaves.name = 'leaves';
  vineGroup.add(leaves);
  const leafDefs = [
    { v: 0.2, apex: [-0.55, 0.14, -0.82], up: [0.05, 1, 0.3], petiole: [-0.9, 1.4, -1.4], scale: 1.0 },
    { v: 0.74, apex: [0.55, 0.2, -0.8], up: [-0.1, 1, 0.45], petiole: [0.8, 1.2, -1.5], scale: 0.9 },
  ];
  const leafMeshes = [];
  for (const d of leafDefs) {
    const n = node(d.v);
    const tip = n.clone().add(new THREE.Vector3(...d.petiole));
    const pet = K.track(new TubeSurface({
      path: cubicPath(n, n.clone().add(new THREE.Vector3(d.petiole[0] * 0.2, d.petiole[1] * 0.9, d.petiole[2] * 0.2)), tip.clone().sub(new THREE.Vector3(...d.apex).multiplyScalar(0.6)), tip),
      radius: 0.13, radial: 8, segments: 16, capStart: 'open', capEnd: 'round',
    }));
    K.mesh(pet.geometry, stemMat, { name: 'petiole', parent: leaves });
    const lg = new THREE.Group();
    lg.position.copy(tip);
    orient(lg, d.apex, d.up);
    lg.scale.setScalar(d.scale);
    leaves.add(lg);
    leafMeshes.push(K.mesh(leafSurf.geometry, leafMat, { name: 'leaf', parent: lg }));
    // a pair of small stipules at the node
    for (const s of [-1, 1]) {
      const st = new THREE.Mesh(stipuleGeo(K), bractMat);
      st.name = 'stipule';
      st.position.copy(n);
      orient(st, [s * 0.6, 0.6, 0.4], [0, 0, 1]);
      leaves.add(st);
    }
  }

  // ---------------------------------------------------------------- tendril
  const tNode = node(0.6);
  const tendrilFn = helixPath({
    start: tNode, dir: new THREE.Vector3(0.55, 0.75, 0.35), side: new THREE.Vector3(0, 0, 1),
    turns: 4.5, radius: 0.62, pitch: 0.55, lead: 4.2, phase: 0, taper: 0.55,
  });
  const tendril = K.track(new TubeSurface({
    path: tendrilFn, radius: (v) => 0.075 - 0.045 * v, radial: 6, segments: 110, capStart: 'open', capEnd: 'round',
  }));
  const tendrilMesh = K.mesh(tendril.geometry, tendrilMat, { name: 'tendril', parent: vineGroup, outline: 0.8, animated: true });
  const tendrilAnchor = new THREE.Object3D();
  vineGroup.add(tendrilAnchor);

  // ---------------------------------------------------------------- flower
  const flowerNode = node(0.43);
  const flowerBase = new THREE.Vector3(-0.6, 9.4, 1.2);
  const ped = K.track(new TubeSurface({
    path: cubicPath(flowerNode, flowerNode.clone().add(new THREE.Vector3(0, 1.4, 0.4)), flowerBase.clone().add(new THREE.Vector3(0, -1.6, -1.4)), flowerBase),
    // a rounded end: it shows for a moment while the spent flower is swapped
    radius: 0.2, radial: 8, segments: 18, capStart: 'open', capEnd: 'round',
  }));
  K.mesh(ped.geometry, stemMat, { name: 'peduncle', parent: vineGroup });

  const flower = buildFlower(K, ctx, {
    mats: { sepalMat, petalMat, bractMat, recMat, awnMat, outerMat, midMat, innerMat, columnMat, operMat, antherMat, filamentMat, ovaryMat, styleMat, stigmaMat },
    full: true,
  });
  flower.group.position.copy(flowerBase);
  orient(flower.group, [0.05, 0.62, 0.78], [0, 0.78, -0.62]);
  root.add(flower.group);
  // The flower faces the reader, so its axis is nearly the book camera's line
  // of sight and a dissection along it barely shows. Exploding turns it to a
  // three-quarter view (axis across the page, tilted a little towards the
  // reader), pivoting on the receptacle base so it stays on its stalk.
  const qFace = flower.group.quaternion.clone();
  const qSide = orient(new THREE.Object3D(), [0.85, 0.3, 0.42], [0, 1, 0]).quaternion.clone();
  const pivotLocal = new THREE.Vector3(0, -0.9, 0); // receptacle base, flower frame
  const pivot = pivotLocal.clone().applyQuaternion(qFace).add(flowerBase);
  const _pv = new THREE.Vector3();
  // every part group of the flower, for the end-of-day swap dissolve
  const swapParts = [
    flower.receptacle, flower.bracts, flower.sepals, flower.petals, flower.coronaOuter, flower.coronaMid,
    flower.coronaInner, flower.column, flower.stamens, flower.gynoecium,
  ];
  let lastSwap = 1;

  // bud at a younger node
  const budNode = node(0.86);
  const budBase = budNode.clone().add(new THREE.Vector3(0.6, 2.6, 0.9));
  const bped = K.track(new TubeSurface({
    path: cubicPath(budNode, budNode.clone().add(new THREE.Vector3(0, 1.0, 0)), budBase.clone().add(new THREE.Vector3(-0.3, -0.9, -0.2)), budBase),
    radius: 0.14, radial: 8, segments: 14, capStart: 'open', capEnd: 'open',
  }));
  K.mesh(bped.geometry, stemMat, { name: 'bud-peduncle', parent: vineGroup });
  const bud = buildFlower(K, ctx, { mats: { sepalMat, petalMat, bractMat, recMat, awnMat }, full: false });
  bud.group.position.copy(budBase);
  bud.group.scale.setScalar(0.62);
  orient(bud.group, [0.35, 0.85, 0.35], [0, 0, -1]);
  root.add(bud.group);
  bud.pose(0, 0, 0, 0, 0);

  // ---------------------------------------------------------------- layers, labels, parts
  K.assign('petals', flower.sepals, flower.petals, bud.sepals, bud.petals);
  K.assign('corona', flower.corona);
  K.assign('androgynophore', flower.andro);

  K.label('sepal', 'Sepal', 'One of five scarlet sepals; each ends in a slender appendage.', flower.sepalAnchor, [0, 0, 0], 'petals');
  K.label('petal', 'Petal', 'Five narrower petals alternate with the sepals; both reflex when open.', flower.petalAnchor, [0, 0, 0], 'petals');
  K.label('corona', 'Corona', 'Filaments in three series; the outer ones, to 2 cm, are the longest.', flower.coronaAnchor, [0, 0, 0], 'corona');
  K.label('androgynophore', 'Androgynophore', 'A pale red column lifting stamens and ovary above the corona.', flower.columnAnchor, [0, 0, 0], 'androgynophore');
  K.label('anther', 'Anther', 'Five green anthers held crosswise dust visiting pollinators.', flower.antherAnchor, [0, 0, 0], 'androgynophore');
  K.label('stigma', 'Stigma', 'Three styles end in capitate stigmas above the densely hairy ovary.', flower.stigmaAnchor, [0, 0, 0], 'androgynophore');
  K.label('tendril', 'Tendril', 'Axillary tendrils coil around supports and haul the vine upward.', tendrilAnchor);

  K.part('sepals', 'Sepals', flower.sepals, C.scarlet, 'petals');
  K.part('petals', 'Petals', flower.petals, C.petal, 'petals');
  K.part('corona-outer', 'Corona, outer series', flower.coronaOuter, C.coronaOuter, 'corona');
  K.part('corona-middle', 'Corona, middle series', flower.coronaMid, '#e0662a', 'corona');
  K.part('corona-inner', 'Corona, inner series', flower.coronaInner, C.coronaInner, 'corona');
  K.part('androgynophore', 'Androgynophore', flower.column, C.column, 'androgynophore');
  K.part('stamens', 'Stamens', flower.stamens, C.anther, 'androgynophore');
  K.part('gynoecium', 'Ovary, styles & stigmas', flower.gynoecium, C.ovary, 'androgynophore');
  K.part('bracts', 'Bracts', flower.bracts, C.bract);
  K.part('receptacle', 'Receptacle', flower.receptacle, C.receptacle);
  K.part('bud', 'Flower bud', bud.group, C.sepalBack);
  K.part('leaves', 'Leaves', leaves, C.leaf);
  K.part('stem', 'Stem & peduncles', vineGroup, C.stem);
  K.part('tendril', 'Tendril', tendrilMesh, C.tendril);

  return {
    title: 'Passiflora vitifolia — the scarlet passion flower opening',
    beats: [
      { t: 0, text: 'Open: five scarlet sepals and five petals spread and reflex.' },
      { t: 0.6, text: 'A travelling wave ripples through the corona filaments.' },
      { t: 1.6, text: 'The tendril coils as it searches for a support.' },
      { t: 2.75, text: 'Time-lapse: at the end of its single day the flower closes…' },
      { t: 3.6, text: '…and a fresh bud opens the next morning — sepals, petals, then the corona.' },
    ],
    pose(t, st) {
      const ex = st.explode ?? 0;
      const oS = Math.max(openAt(t, 0), ex);
      const oP = Math.max(openAt(t, 0.12), ex);
      const oC = Math.max(openAt(t, 0.25), ex);
      flower.pose(t, oS, oP, oC, ex);
      flower.group.quaternion.slerpQuaternions(qFace, qSide, smoother(ex));
      const sc = mix(swapScaleAt(t), 1, ex);
      flower.group.scale.setScalar(sc);
      flower.group.position.copy(pivot).sub(_pv.copy(pivotLocal).multiplyScalar(sc).applyQuaternion(flower.group.quaternion));
      // the swap dissolve, composed with any layer dissolve the host writes on
      // the part groups (written only while it changes or is under way)
      const own = mix(swapFadeAt(t), 1, ex);
      if (own < 1 || lastSwap < 1) {
        for (const g of swapParts) {
          const layerFade = g.userData.inkFade ?? 1;
          for (const c of g.children) setFade(c, own * layerFade);
        }
      }
      lastSwap = own;
      // tendril: the coil screws about its axis (one turn per loop) and the
      // free lead circumnutates in a small cone
      const w = (t / 5) * Math.PI * 2;
      tendrilFn.state.phase = -w;
      tendrilFn.state.radius = 0.62 + 0.06 * Math.sin(w);
      tendrilFn.state.lead = 4.2 + 0.25 * Math.sin(w + 0.8);
      tendril.rebuild();
      tendril.pointAt(0.78, tendrilAnchor.position);
      // gentle breeze (calmer under prefers-reduced-motion)
      const k = st.reducedMotion ? 0.2 : 1;
      const s = sway(t, 1);
      flower.sway.rotation.set(0.025 * k * sway(t, 1, 0.3), 0, 0.02 * k * s);
      bud.sway.rotation.set(0.03 * k * sway(t, 1, 0.6), 0, 0.03 * k * s);
    },
  };
}

/** Small lanceolate stipule (one geometry per figure, cached on the kit). */
function stipuleGeo(K) {
  if (!K._stipule) {
    const b = K.track(new BladeSurface({ length: 0.9, width: 0.35, profile: 'lanceolate', cup: 0.3, curl: -0.2, thickness: 0.04, segU: 6, segV: 8 }));
    K._stipule = b.geometry;
  }
  return K._stipule;
}

/**
 * One passion flower in its flower frame (+Y floral axis, +Z dorsal).
 * `full` adds the corona and androgynophore (a bud never shows them).
 * @param {import('./common.js').FigureKit} K
 * @param {object} ctx FigureContext
 * @param {{ mats: object, full: boolean }} o
 * @returns {object} controller with pose(t, sepalOpen, petalOpen, coronaOpen, explode)
 */
function buildFlower(K, ctx, { mats, full }) {
  const group = new THREE.Group();
  group.name = full ? 'passiflora-flower' : 'passiflora-bud';
  const swayG = new THREE.Group();
  group.add(swayG);
  const M = mats;

  // receptacle (short floral cup) and peduncle collar
  const receptacle = new THREE.Group();
  receptacle.name = 'receptacle';
  swayG.add(receptacle);
  const recGeo = createLathe({ profile: [[0.0, -0.9], [0.22, -0.85], [0.34, -0.4], [0.75, 0.05], [1.05, 0.32], [0.9, 0.42], [0, 0.44]], segments: 28 });
  K.mesh(recGeo, M.recMat, { name: 'receptacle', parent: receptacle });

  // bracts (3), cupping the base
  const bracts = new THREE.Group();
  bracts.name = 'bracts';
  swayG.add(bracts);
  const bractBlades = [];
  for (let i = 0; i < 3; i++) {
    const b = K.track(new BladeSurface({ length: 2.8, width: 1.0, profile: 'lanceolate', cup: 0.45, curl: 0.15, wave: 0.03, waveFreq: 9, thickness: 0.05, segU: 8, segV: 14 }));
    const m = K.mesh(b.geometry, M.bractMat, { name: 'bract' });
    const h = mountOnHinge(m, { azimuth: (i / 3) * Math.PI * 2 + 0.5, radius: 0.25, height: -0.75, open: 0.6 });
    bracts.add(h.az);
    bractBlades.push(h);
  }

  // sepals (5) with apical appendage, petals (5) alternating
  const sepals = new THREE.Group();
  sepals.name = 'sepals';
  const petals = new THREE.Group();
  petals.name = 'petals';
  swayG.add(sepals, petals);
  const sepalH = [], petalH = [];
  let sepalAnchor = null, petalAnchor = null;
  for (let i = 0; i < 5; i++) {
    const az = (i / 5) * Math.PI * 2;
    const sb = K.track(new BladeSurface({
      length: 6.6, width: 1.55, profile: 'linear-lanceolate', cup: 0.35, curl: -0.35, curlStart: 0.25, curlPow: 1.4,
      wave: 0.05, waveFreq: 3, wavePhase: i, thickness: 0.07, segU: 10, segV: 22,
    }));
    const sm = K.mesh(sb.geometry, M.sepalMat, { name: 'sepal', animated: true });
    const awn = new THREE.Mesh(awnGeo(K), M.awnMat);
    awn.name = 'sepal-appendage';
    sb.attach(awn, 0, 0.9, -0.04);
    awn.rotation.x = -0.75;
    sm.add(awn);
    const hs = mountOnHinge(sm, { azimuth: az, radius: 0.78, height: 0.3, open: 1.7 });
    sepals.add(hs.az);
    sepalH.push({ ...hs, blade: sb, i });
    const pb = K.track(new BladeSurface({
      length: 5.0, width: 1.25, profile: 'linear-lanceolate', cup: 0.3, curl: -0.3, curlStart: 0.3, curlPow: 1.4,
      wave: 0.04, waveFreq: 3, wavePhase: i * 1.7, thickness: 0.06, segU: 10, segV: 20,
    }));
    const pm = K.mesh(pb.geometry, M.petalMat, { name: 'petal', animated: true });
    const hp = mountOnHinge(pm, { azimuth: az + Math.PI / 5, radius: 0.7, height: 0.4, open: 1.6 });
    petals.add(hp.az);
    petalH.push({ ...hp, blade: pb, i });
    if (i === 3) {
      sepalAnchor = sb.attach(new THREE.Object3D(), 0, 0.72, 0.05);
      sm.add(sepalAnchor);
    }
    if (i === 2) {
      petalAnchor = pb.attach(new THREE.Object3D(), 0, 0.66, 0.05);
      pm.add(petalAnchor);
    }
  }

  const out = { group, sway: swayG, receptacle, bracts, sepals, petals, sepalAnchor, petalAnchor };

  let corona = null, andro = null;
  const series = [];
  let column = null, stamens = null, gynoecium = null;
  let coronaAnchor = null, columnAnchor = null, antherAnchor = null, stigmaAnchor = null;
  if (full) {
    corona = new THREE.Group();
    corona.name = 'corona';
    swayG.add(corona);
    const defs = [
      { n: 96, len: 1.95, r: 1.22, h: 0.36, tilt: 0.62, bow: 0.22, rad: 0.05, mat: M.outerMat, name: 'corona-outer' },
      { n: 80, len: 1.15, r: 0.98, h: 0.4, tilt: 0.42, bow: 0.16, rad: 0.042, mat: M.midMat, name: 'corona-middle' },
      { n: 60, len: 0.5, r: 0.7, h: 0.43, tilt: 0.2, bow: 0.08, rad: 0.034, mat: M.innerMat, name: 'corona-inner' },
    ];
    for (const d of defs) {
      const tube = K.track(new TubeSurface({
        path: (v, o) => o.set(0, v * d.len, d.bow * d.len * v * v),
        radius: (v) => d.rad * (1 - 0.45 * v), radial: 5, segments: 8, capStart: 'open', capEnd: 'round',
      }));
      const im = new THREE.InstancedMesh(tube.geometry, d.mat, d.n);
      im.name = d.name;
      im.frustumCulled = false;
      // Picks and label rays test an instanced mesh's bounding sphere before
      // any instance, and three keeps the first pose's. Filaments only turn,
      // and opening slides them out to radius d.r at full length (scale 1),
      // so one sphere holds for every pose.
      const gs = tube.geometry.boundingSphere;
      im.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, d.h, 0), d.r + gs.center.length() + gs.radius);
      K.track(d.mat);
      const g = new THREE.Group();
      g.name = d.name;
      g.add(im);
      corona.add(g);
      series.push({ ...d, mesh: im, group: g });
    }
    coronaAnchor = new THREE.Object3D();
    coronaAnchor.position.set(Math.sin(2.6) * 2.3, 1.15, Math.cos(2.6) * 2.3);
    series[0].group.add(coronaAnchor);

    andro = new THREE.Group();
    andro.name = 'androgynophore';
    swayG.add(andro);
    // operculum (membranous ring) and column
    const oper = createLathe({ profile: [[0.2, 0.3], [0.42, 0.42], [0.48, 0.62], [0.44, 0.7], [0.24, 0.6]], segments: 24, ridges: 18, ridgeDepth: 0.06 });
    column = new THREE.Group();
    column.name = 'androgynophore-column';
    andro.add(column);
    K.mesh(oper, M.operMat, { name: 'operculum', parent: column, outline: 0.7 });
    const colTube = K.track(new TubeSurface({
      path: (v, o) => o.set(0, 0.35 + v * 1.75, 0), radius: (v) => 0.2 - 0.04 * v, radial: 12, segments: 8, capStart: 'flat', capEnd: 'open',
    }));
    K.mesh(colTube.geometry, M.columnMat, { name: 'androgynophore', parent: column });
    columnAnchor = new THREE.Object3D();
    columnAnchor.position.set(0, 1.2, 0.2);
    column.add(columnAnchor);
    // stamens: filaments radiating from the column top, versatile anthers held crosswise
    stamens = new THREE.Group();
    stamens.name = 'stamens';
    stamens.position.y = 2.05;
    andro.add(stamens);
    const filGeo = K.track(new TubeSurface({
      path: cubicPath(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.15, 0.35), new THREE.Vector3(0, 0.0, 0.8), new THREE.Vector3(0, -0.35, 1.05)),
      radius: 0.045, radial: 6, segments: 10, capStart: 'open', capEnd: 'round',
    })).geometry;
    const antherGeo = createLathe({ profile: [[0, -0.45], [0.12, -0.38], [0.17, -0.1], [0.17, 0.12], [0.12, 0.38], [0, 0.45]], segments: 14, squash: 0.62 });
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      g.rotation.y = (i / 5) * Math.PI * 2 + Math.PI / 5;
      stamens.add(g);
      K.mesh(filGeo, M.filamentMat, { name: 'stamen-filament', parent: g, outline: 0.6 });
      const a = K.mesh(antherGeo, M.antherMat, { name: 'anther', parent: g, outline: 0.8 });
      a.position.set(0, -0.42, 1.08);
      a.rotation.set(0, 0, Math.PI / 2); // long axis crosswise (tangential), held perpendicular
      if (i === 0) {
        antherAnchor = new THREE.Object3D();
        antherAnchor.position.set(0, -0.15, 0);
        a.add(antherAnchor);
      }
    }
    // gynoecium: tomentose ovary, 3 styles, capitate stigmas
    gynoecium = new THREE.Group();
    gynoecium.name = 'gynoecium';
    gynoecium.position.y = 2.1;
    andro.add(gynoecium);
    const ovGeo = createLathe({ profile: [[0, -0.05], [0.24, 0.05], [0.34, 0.32], [0.3, 0.6], [0.12, 0.76], [0, 0.78]], segments: 18 });
    K.mesh(ovGeo, M.ovaryMat, { name: 'ovary', parent: gynoecium, outline: 0.8 });
    const styleGeo = K.track(new TubeSurface({
      path: cubicPath(new THREE.Vector3(0, 0.7, 0), new THREE.Vector3(0, 1.1, 0.15), new THREE.Vector3(0, 1.45, 0.55), new THREE.Vector3(0, 1.55, 0.95)),
      radius: 0.055, radial: 6, segments: 10, capStart: 'open', capEnd: 'open',
    })).geometry;
    const stigmaGeo = new THREE.SphereGeometry(0.17, 14, 10);
    stigmaGeo.scale(1.2, 0.55, 1);
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      g.rotation.y = (i / 3) * Math.PI * 2 + 0.3;
      gynoecium.add(g);
      K.mesh(styleGeo, M.styleMat, { name: 'style', parent: g, outline: 0.6 });
      const sg = K.mesh(stigmaGeo, M.stigmaMat, { name: 'stigma', parent: g, outline: 0.8 });
      sg.position.set(0, 1.58, 0.98);
      if (i === 0) {
        stigmaAnchor = new THREE.Object3D();
        stigmaAnchor.position.set(0, 0.12, 0);
        sg.add(stigmaAnchor);
      }
    }
  }
  Object.assign(out, {
    corona, andro, column, stamens, gynoecium, coronaAnchor, columnAnchor, antherAnchor, stigmaAnchor,
    coronaOuter: series[0]?.group, coronaMid: series[1]?.group, coronaInner: series[2]?.group,
  });

  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3(1, 1, 1);
  const last = { s: -1, p: -1 };

  /**
   * @param {number} t loop time
   * @param {number} oS sepal open 0..1
   * @param {number} oP petal open 0..1
   * @param {number} oC corona/column open 0..1
   * @param {number} ex explode 0..1
   */
  out.pose = (t, oS, oP, oC, ex = 0) => {
    // sepals & petals: hinge angle, cupping and curl all unfold together
    if (Math.abs(oS - last.s) > 1e-4) {
      for (const h of sepalH) {
        h.hinge.rotation.x = mix(0.14, 1.72, oS);
        h.blade.p.cup = mix(1.05, 0.35, oS);
        h.blade.p.curl = mix(0.55, -0.4, oS);
        h.blade.rebuild();
      }
      last.s = oS;
    }
    if (Math.abs(oP - last.p) > 1e-4) {
      for (const h of petalH) {
        h.hinge.rotation.x = mix(0.08, 1.62, oP);
        h.blade.p.cup = mix(1.25, 0.3, oP);
        h.blade.p.curl = mix(0.65, -0.32, oP);
        h.blade.rebuild();
      }
      last.p = oP;
    }
    for (const h of bractBlades) h.hinge.rotation.x = mix(0.42, 0.78, oS) + ex * 0.5;
    // dissection: whorls separate along the floral axis and spread a little
    bracts.position.y = -3.6 * ex;
    sepals.position.y = -2.5 * ex;
    petals.position.y = -1.2 * ex;
    for (const h of sepalH) h.hinge.position.z = 0.78 + 1.1 * ex;
    for (const h of petalH) h.hinge.position.z = 0.7 + 0.7 * ex;
    if (!full) return;
    // corona: erect-spreading filaments with a travelling wave
    const w = (t / 5) * Math.PI * 2;
    const ripple = 0.16 * oC * (1 - ex * 0.7);
    for (let si = 0; si < series.length; si++) {
      const d = series[si];
      d.group.position.y = [0.15, 0.85, 1.45][si] * ex;
      // in the bud the corona is folded small inside the sepals
      const len = mix(0.3, 1, oC);
      const rr = d.r * mix(0.3, 1, oC);
      for (let i = 0; i < d.n; i++) {
        const phi = (i / d.n) * Math.PI * 2 + si * 0.13;
        const wave = Math.sin(3 * phi - 2 * w + si * 0.9);
        const tilt = mix(0.04, d.tilt, oC) + ripple * wave * (1 - si * 0.25);
        const lat = 0.1 * oC * Math.cos(3 * phi - 2 * w + si * 0.9);
        _e.set(tilt, phi, lat, 'YXZ');
        _q.setFromEuler(_e);
        _p.set(Math.sin(phi) * rr, d.h, Math.cos(phi) * rr);
        _s.set(len, len, len);
        _m.compose(_p, _q, _s);
        d.mesh.setMatrixAt(i, _m);
      }
      d.mesh.instanceMatrix.needsUpdate = true;
    }
    coronaAnchor.position.set(Math.sin(2.6) * series[0].r * mix(0.3, 1, oC) * 1.85, 1.15 * mix(0.3, 1, oC), Math.cos(2.6) * series[0].r * mix(0.3, 1, oC) * 1.85);
    const sc = mix(0.45, 1, oC);
    andro.scale.setScalar(sc);
    andro.position.y = 2.2 * ex;
    stamens.position.y = 2.05 + 1.0 * ex;
    gynoecium.position.y = 2.1 + 2.2 * ex;
  };
  return out;
}

/** The sepal's slender apical appendage (one geometry per figure). */
function awnGeo(K) {
  if (!K._awn) {
    const t = K.track(new TubeSurface({
      path: (v, o) => o.set(0, v * 0.55, -v * 0.75), radius: (v) => 0.07 * (1 - 0.7 * v), radial: 6, segments: 6, capStart: 'open', capEnd: 'round',
    }));
    K._awn = t.geometry;
  }
  return K._awn;
}
