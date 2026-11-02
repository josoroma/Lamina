// Guarianthe skinneri — guaria morada, national flower of Costa Rica.
//
// Botany (Dressler & Higgins 2003; Kew; AOS): an epiphytic Cattleya-alliance
// orchid of humid forests, often on deciduous host trees. Club-shaped,
// somewhat compressed pseudobulbs bear two leathery elliptic-oblong leaves
// (10–18 × 3–7 cm). A short dense raceme of 4–12 rosy-purple flowers (about
// 9 cm across) emerges from a sheathing spathe that dries brown. Each flower
// has 3 narrow lanceolate sepals, 2 broader petals with wavy margins, and a
// lip (labellum) rolled into a tube around the column, flaring into a
// deeper magenta front lobe with a white-to-cream throat. The column (fused
// stamen and style) hides inside the lip.
//
// Plate: a clump on a fragment of host branch — two pseudobulbs with their
// leaves and a young growth — with the raceme arching towards the reader:
// two open flowers, one bud opening in time-lapse, one closed bud.
// Loop: the bud blooms, the lips flutter, the spray sways in a light air.
// Explode: the front flower is dissected along its axis — sepals back,
// petals, lip forward, and the column drawn out of the lip.
import * as THREE from 'three/webgpu';
import { uv, mix as tmix, smoothstep, color as tslColor, mx_noise_float, positionLocal, float, vec3 } from 'three/tsl';
import {
  BladeSurface, TubeSurface, createLathe, cubicPath, orient, mountOnHinge, bladeMaterial, barkColor,
  translucency, fuzz, smoother,
} from '../../kits/petal/index.js';
import { sway, mix, sstep } from './common.js';

const C = {
  sepal: '#b0579a',
  sepalBase: '#d29bc6',
  sepalVein: '#86307a',
  petal: '#b75ca4',
  petalBase: '#dba4cf',
  lipFront: '#8a1b66',
  lipFrontEdge: '#b2478d',
  throat: '#f6efe4',
  throatYellow: '#ecd793',
  lipVein: '#7a1d5e',
  column: '#efdfe8',
  ovary: '#7f8e4a',
  pseudobulb: '#6f8a3d',
  sheath: '#c2ab7d',
  leaf: '#3c6a2d',
  leafUnder: '#6f904e',
  spathe: '#b39561',
  bark: '#7b6a57',
  barkDark: '#4c4035',
  lichen: '#b9c2a4',
  rhizome: '#7d7552',
};

/** Bloom timeline for the time-lapse flower (1 open, 0 bud). */
function bloomAt(t) {
  if (t < 0.25) return 0;
  if (t < 2.5) return smoother((t - 0.25) / 2.25);
  if (t < 3.7) return 1;
  if (t < 4.9) return 1 - smoother((t - 3.7) / 1.2);
  return 0;
}
/** Lip flutter envelope (a visiting bee's landing, a gust). */
function flutterAt(t) {
  const a = sstep(1.9, 2.5, t) * (1 - sstep(3.9, 4.6, t));
  return 0.25 + 0.75 * a;
}

/**
 * Build the Guarianthe skinneri plate.
 * @param {{ species: string }} params
 * @param {object} ctx FigureContext (src/kits/ink)
 * @param {import('./common.js').FigureKit} K
 * @returns {{ title: string, beats: Array<{t:number,text:string}>, pose: (t:number, st:object) => void }}
 */
export function build(params, ctx, K) {
  const root = K.root;
  K.layer('perianth', 'Sepals & petals', 'The rosy-purple perianth: 3 sepals and 2 wavy petals');
  K.layer('column-lip', 'Column & lip', 'The lip rolled around the column — the orchid\'s pollination machine');
  K.layer('leaves', 'Leaves & pseudobulbs', 'Water-storing pseudobulbs, each with two leathery leaves');

  // ---------------------------------------------------------------- materials
  const sepalMat = bladeMaterial(ctx, {
    base: C.sepalBase, mid: C.sepal, tip: C.sepal, midAt: 0.35,
    veins: 7, vein: C.sepalVein, veinStrength: 0.18, veinWidth: 0.08, midrib: 0.25,
    abaxial: '#b2659a', width: 1.4, translucency: 0.45, roughness: 0.48, sheen: 0.45, name: 'guaria-sepal', svgColor: C.sepal,
  });
  const petalMat = bladeMaterial(ctx, {
    base: C.petalBase, mid: C.petal, tip: '#b04e93', midAt: 0.32,
    veins: 13, vein: C.sepalVein, veinStrength: 0.16, veinWidth: 0.07, midrib: 0.2,
    abaxial: '#bc6fa3', width: 3.0, translucency: 0.5, roughness: 0.45, sheen: 0.5, name: 'guaria-petal', svgColor: C.petal,
  });
  const lipMat = bladeMaterial(ctx, {
    base: C.throat, mid: C.throat, tip: C.lipFront, midAt: 0.5,
    patches: [
      { color: C.throatYellow, v0: 0.12, v1: 0.48, d0: 0, d1: 0.32, soft: 0.1, side: 0 },
      { color: C.lipFront, v0: 0.62, v1: 1.2, soft: 0.1 },
      { color: C.lipFrontEdge, v0: 0.6, v1: 1.2, d0: 0.82, d1: 1.2, soft: 0.06, mix: 0.6 },
      { color: '#c789b5', v0: -0.2, v1: 0.6, side: 1, mix: 0.9 },
    ],
    veins: 11, vein: C.lipVein, veinStrength: 0.5, veinWidth: 0.07, veinRange: [0.15, 0.78],
    width: 3.2, translucency: 0.4, roughness: 0.42, sheen: 0.5, name: 'guaria-lip', svgColor: C.lipFront,
  });
  const columnMat = ctx.ink({
    colorNode: tmix(tslColor(C.column), tslColor('#f4ecc8'), smoothstep(0.8, 0.95, uv().y)),
    svgColor: C.column, roughness: 0.4, name: 'guaria-column',
  });
  const ovaryMat = ctx.ink({ color: C.ovary, roughness: 0.6, name: 'guaria-ovary' });
  const pbColor = (() => {
    const v = uv().y;
    const fibre = mx_noise_float(positionLocal.mul(vec3(9.0, 0.6, 9.0))).mul(0.5).add(0.5);
    let c = tmix(tslColor('#62803a'), tslColor(C.pseudobulb), smoothstep(0.25, 0.75, v));
    c = c.mul(mx_noise_float(positionLocal.mul(vec3(5.0, 0.4, 5.0))).mul(0.06).add(1));
    const sheath = tmix(tslColor('#d9ccb0'), tslColor(C.sheath), fibre);
    c = tmix(c, sheath, float(1).sub(smoothstep(0.26, 0.36, v)));
    return c;
  })();
  const pbMat = ctx.ink({ colorNode: pbColor, svgColor: C.pseudobulb, roughness: 0.45, sheen: 0.2, hatch: 0.55, crossHatch: 0.4, name: 'guaria-pseudobulb' });
  const leafMat = bladeMaterial(ctx, {
    base: '#4d7a36', mid: C.leaf, tip: '#36602a', midAt: 0.4, veins: 15, vein: '#2f5726', veinStrength: 0.12,
    veinWidth: 0.06, midrib: 0.45, abaxial: C.leafUnder, width: 4.6, translucency: 0.12, roughness: 0.35, sheen: 0.3,
    name: 'guaria-leaf', svgColor: C.leaf,
  });
  const spatheMat = bladeMaterial(ctx, {
    base: '#9c8656', mid: C.spathe, tip: '#a88d5c', veins: 9, vein: '#7d6743', veinStrength: 0.35, veinWidth: 0.07,
    width: 2.0, translucency: 0.1, roughness: 0.8, name: 'guaria-spathe', svgColor: C.spathe,
  });
  const rachisMat = ctx.ink({
    colorNode: tmix(tslColor('#6e7c3e'), tslColor('#7a4a62'), smoothstep(0.3, 1.0, uv().y)),
    svgColor: '#72703f', roughness: 0.55, name: 'guaria-rachis',
  });
  const barkMat = ctx.ink({
    colorNode: barkColor({ base: C.bark, dark: C.barkDark, lichen: C.lichen, scale: 0.7, lichenAmount: 0.55, stretch: [0.22, 2.4, 2.4] }),
    svgColor: C.bark, roughness: 0.92, name: 'guaria-bark',
  });
  const rhizomeMat = ctx.ink({ color: C.rhizome, roughness: 0.7, name: 'guaria-rhizome' });
  const rootMat = ctx.ink({ color: '#d8d2bd', roughness: 0.8, name: 'guaria-root' });
  rootMat.emissiveNode = fuzz('#ffffff', 0.25, 2.0);

  // ---------------------------------------------------------------- host branch
  const branchGroup = new THREE.Group();
  branchGroup.name = 'host-branch';
  root.add(branchGroup);
  const branch = K.track(new TubeSurface({
    path: cubicPath(new THREE.Vector3(-13, 1.62, -0.6), new THREE.Vector3(-4.5, 2.0, -3.4), new THREE.Vector3(4, 1.7, -1.6), new THREE.Vector3(12.5, 1.5, -4.6)),
    radius: (v) => 1.62 - 0.32 * v, radial: 20, segments: 40, capStart: 'flat', capEnd: 'flat',
    up: new THREE.Vector3(0, 1, 0),
  }));
  const branchMesh = K.mesh(branch.geometry, barkMat, { name: 'branch', parent: branchGroup });

  // ---------------------------------------------------------------- vegetative body (layer: leaves)
  const veg = new THREE.Group();
  veg.name = 'vegetative';
  root.add(veg);
  K.assign('leaves', veg);
  const rhizome = K.track(new TubeSurface({
    path: cubicPath(new THREE.Vector3(-8.5, 3.2, -2.4), new THREE.Vector3(-3, 3.75, -3.3), new THREE.Vector3(3, 3.45, -2.6), new THREE.Vector3(8.6, 3.0, -3.6)),
    radius: 0.36, radial: 10, segments: 30, capStart: 'round', capEnd: 'round',
  }));
  K.mesh(rhizome.geometry, rhizomeMat, { name: 'rhizome', parent: veg });
  // velamen roots clasping the branch
  const rootTubes = [];
  for (const [x, z, s] of [[-7, -2.6, 1], [-1.8, -3.4, -1], [3.6, -2.7, 1], [7.2, -3.4, -1]]) {
    const r = K.track(new TubeSurface({
      path: cubicPath(new THREE.Vector3(x, 3.3, z), new THREE.Vector3(x + 0.5 * s, 3.7, z + 2.0), new THREE.Vector3(x + 1.3 * s, 1.6, z + 2.6), new THREE.Vector3(x + 1.8 * s, 0.35, z + 1.3)),
      radius: 0.16, radial: 6, segments: 18, capStart: 'round', capEnd: 'round',
    }));
    rootTubes.push(K.mesh(r.geometry, rootMat, { name: 'root', parent: veg, outline: 0.7 }));
  }

  const pbGeo = createLathe({
    profile: [[0, 0], [0.32, 0.1], [0.36, 1.5], [0.55, 4.0], [0.98, 7.0], [1.25, 9.6], [1.12, 11.4], [0.8, 12.6], [0.42, 13.2], [0, 13.4]],
    segments: 24, squash: 0.62, ridges: 9, ridgeDepth: 0.014,
  });
  K.track(pbGeo);
  const leafSurf = (len, wid, curl) => K.track(new BladeSurface({
    length: len, width: wid, profile: 'oblong', tip: 0.7, cup: 0.18, fold: 0.32, curl, curlStart: 0.15, curlPow: 1.2,
    thickness: 0.18, segU: 12, segV: 22,
  }));
  const pseudobulbs = [];
  const pbDefs = [
    { at: [-3.2, 3.5, -3.0], lean: [-0.12, 1, -0.78], scale: 1.0, leaves: [[-0.52, 0.45, -0.72, 15, 4.6, -0.5], [0.3, 0.42, -0.86, 14, 4.3, -0.42]], flowering: true },
    { at: [4.4, 3.4, -2.9], lean: [0.3, 1, -0.7], scale: 0.9, leaves: [[0.55, 0.38, -0.74, 14.5, 4.4, -0.55], [-0.08, 0.45, -0.9, 13, 4.2, -0.45]] },
    { at: [8.2, 3.1, -3.5], lean: [0.55, 1, -0.25], scale: 0.42, leaves: [[0.6, 0.5, 0.2, 6.5, 2.2, -0.3]] },
  ];
  let leafAnchorObj = null, pbAnchorObj = null;
  const apexes = [];
  for (const d of pbDefs) {
    const g = new THREE.Group();
    g.position.set(...d.at);
    orient(g, d.lean, [0, 0, 1]);
    g.scale.setScalar(d.scale);
    veg.add(g);
    const pb = K.mesh(pbGeo, pbMat, { name: 'pseudobulb', parent: g });
    pseudobulbs.push(pb);
    // the label goes on the second pseudobulb, which the reader sees at every
    // moment: the first stands behind the flowering spray
    if (pseudobulbs.length === 2) {
      pbAnchorObj = new THREE.Object3D();
      pbAnchorObj.position.set(0, 7.5, 0.7);
      pb.add(pbAnchorObj);
    }
    const apex = new THREE.Object3D();
    apex.position.set(0, 13.0, 0);
    g.add(apex);
    apexes.push(apex);
    for (const [ax, ay, az, len, wid, curl] of d.leaves) {
      const lf = new THREE.Group();
      lf.position.set(0, 12.6, 0);
      g.add(lf);
      // direction in world terms is easier: compute later after matrices exist
      lf.userData.dir = new THREE.Vector3(ax, ay, az).normalize();
      const blade = leafSurf(len, wid, curl);
      const m = K.mesh(blade.geometry, leafMat, { name: 'leaf', parent: lf });
      lf.userData.mesh = m;
      if (!leafAnchorObj) {
        leafAnchorObj = blade.attach(new THREE.Object3D(), 0.1, 0.55, 0.12);
        m.add(leafAnchorObj);
      }
    }
  }
  // orient leaves in root space: blade +Y along dir, upper face roughly up/out
  root.updateMatrixWorld(true);
  const _inv = new THREE.Matrix4();
  veg.traverse((o) => {
    if (!o.userData.dir) return;
    const parentInv = _inv.copy(o.parent.matrixWorld).invert();
    const dir = o.userData.dir.clone().transformDirection(parentInv);
    const up = new THREE.Vector3(0, 0.6, 0.8).transformDirection(parentInv);
    orient(o, dir, up);
  });

  // ---------------------------------------------------------------- inflorescence
  const infl = new THREE.Group();
  infl.name = 'inflorescence';
  root.add(infl);
  root.updateMatrixWorld(true);
  const apexW = new THREE.Vector3();
  apexes[0].getWorldPosition(apexW);
  root.worldToLocal(apexW);
  infl.position.copy(apexW);
  // spathe: a dry sheathing bract at the base of the raceme
  const spathe = K.track(new BladeSurface({ length: 4.2, width: 2.2, profile: 'elliptic', cup: 1.6, curl: 0.15, thickness: 0.05, segU: 12, segV: 14 }));
  const spatheMesh = K.mesh(spathe.geometry, spatheMat, { name: 'spathe', parent: infl });
  orient(spatheMesh, [0.05, 1, 0.45], [0, 0, -1]);
  spatheMesh.position.set(0.2, -0.6, 0.3);
  const raceme = K.track(new TubeSurface({
    path: cubicPath(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.2, 3.0, 2.2), new THREE.Vector3(0.6, 4.4, 7.8), new THREE.Vector3(1.0, 2.6, 13.0)),
    radius: (v) => 0.2 - 0.06 * v, radial: 8, segments: 30, capStart: 'flat', capEnd: 'round',
  }));
  const racemeMesh = K.mesh(raceme.geometry, rachisMat, { name: 'raceme', parent: infl });

  const mats = { sepalMat, petalMat, lipMat, columnMat, ovaryMat };
  const flowerDefs = [
    { id: 'A', v: 0.72, face: [-0.05, 0.55, 0.83], up: [0, 0.84, -0.55], pedicel: [-1.6, -1.2, 3.2], hero: true },
    { id: 'B', v: 0.42, face: [-0.62, 0.5, 0.6], up: [-0.1, 0.9, -0.4], pedicel: [-5.6, 0.8, 0.4] },
    { id: 'C', v: 0.58, face: [0.6, 0.58, 0.55], up: [0.1, 0.88, -0.45], pedicel: [5.4, 1.4, -0.2], bloom: true },
    { id: 'D', v: 0.99, face: [0.2, 0.62, 0.76], up: [0, 0.75, -0.65], pedicel: [1.2, 0.6, 1.2], bud: true },
  ];
  const flowers = [];
  for (const d of flowerDefs) {
    const at = raceme.pointAt(d.v, new THREE.Vector3());
    const base = at.clone().add(new THREE.Vector3(...d.pedicel));
    const ped = K.track(new TubeSurface({
      path: cubicPath(at, at.clone().lerp(base, 0.35).add(new THREE.Vector3(0, 0.6, 0)), base.clone().sub(new THREE.Vector3(...d.face).multiplyScalar(1.1)), base),
      radius: (v) => 0.12 + 0.05 * v * v, radial: 8, segments: 14, capStart: 'open', capEnd: 'open',
    }));
    K.mesh(ped.geometry, ovaryMat, { name: 'pedicel', parent: infl, outline: 0.8 });
    const f = buildOrchid(K, ctx, mats, { scale: d.bud ? 0.42 : d.hero ? 1.0 : 0.94, hero: !!d.hero, seed: flowers.length });
    f.group.position.copy(base);
    orient(f.group, d.face, d.up);
    infl.add(f.group);
    f.def = d;
    flowers.push(f);
  }
  const hero = flowers[0];

  // ---------------------------------------------------------------- layers, labels, parts
  for (const f of flowers) {
    K.assign('perianth', f.sepals, f.petals);
    K.assign('column-lip', f.lipGroup);
  }
  K.label('sepal', 'Dorsal sepal', 'Three narrow sepals form the outer whorl of the flower.', hero.sepalAnchor, [0, 0, 0], 'perianth');
  K.label('petal', 'Petal', 'Two broad petals with wavy margins flank the dorsal sepal.', hero.petalAnchor, [0, 0, 0], 'perianth');
  K.label('labellum', 'Labellum (lip)', 'The third petal, rolled into a tube with a magenta front lobe and pale throat.', hero.lipAnchor, [0, 0, 0], 'column-lip');
  K.label('column', 'Column', 'Stamen and style fused in one organ, hidden inside the lip.', hero.columnAnchor, [0, 0, 0], 'column-lip');
  K.label('pseudobulb', 'Pseudobulb', 'A club-shaped, water-storing stem that carries two leaves.', pbAnchorObj, [0, 0, 0], 'leaves');
  K.label('leaf', 'Leaf', 'Thick, leathery leaves cut water loss for a plant living on bark.', leafAnchorObj, [0, 0, 0], 'leaves');

  K.part('sepals', 'Sepals', hero.sepals, C.sepal, 'perianth');
  K.part('petals', 'Petals', hero.petals, C.petal, 'perianth');
  K.part('labellum', 'Labellum', hero.lip, C.lipFront, 'column-lip');
  K.part('column', 'Column', hero.column, C.column, 'column-lip');
  for (const f of flowers.slice(1)) K.part(`flower-${f.def.id.toLowerCase()}`, f.def.bud ? 'Flower bud' : 'Flower', f.group, C.sepal);
  K.part('raceme', 'Raceme, pedicels & ovaries', infl, '#72703f');
  K.part('spathe', 'Spathe', spatheMesh, C.spathe);
  K.part('pseudobulbs', 'Pseudobulbs & leaves', veg, C.leaf, 'leaves');
  K.part('branch', 'Host branch', branchMesh, C.bark);

  const st0 = { bloom: -1 };
  return {
    title: 'Guarianthe skinneri — guaria morada in bloom',
    beats: [
      { t: 0, text: 'A raceme of rosy-purple flowers rises from the spathe atop a pseudobulb.' },
      { t: 0.25, text: 'Time-lapse: a bud unfurls — sepals, then petals, then the lip.' },
      { t: 2.0, text: 'The lip flutters: its rolled tube guides a visiting bee onto the column.' },
      { t: 3.7, text: 'Loop: the time-lapse runs back to the bud; the open flowers keep swaying.' },
    ],
    pose(t, st) {
      const ex = st.explode ?? 0;
      const fl = flutterAt(t);
      for (const f of flowers) {
        const d = f.def;
        let open = 1;
        if (d.bloom) open = bloomAt(t);
        if (d.bud) open = 0.02;
        if (d.hero) open = 1;
        f.pose(t, open, d.bud ? 0 : fl, d.hero ? ex : 0);
      }
      // the spray sways gently from the spathe (periodic in 5 s; calmer
      // when the reader prefers reduced motion)
      const k = st.reducedMotion ? 0.2 : 1;
      infl.rotation.set(0.022 * k * sway(t, 1, 0.1), 0.015 * k * sway(t, 1, 0.45), 0.02 * k * sway(t, 1));
      for (let i = 1; i < flowers.length; i++) {
        flowers[i].nod.rotation.set(0.03 * k * sway(t, 2, i * 0.27), 0, 0.025 * k * sway(t, 1, i * 0.41));
      }
    },
  };
}

/**
 * One orchid flower in its flower frame (+Y facing, +Z dorsal): 3 sepals,
 * 2 petals, the lip rolled around the column.
 * @param {import('./common.js').FigureKit} K
 * @param {object} ctx FigureContext
 * @param {object} mats shared materials
 * @param {{ scale?: number, hero?: boolean, seed?: number }} o
 * @returns {object} controller with pose(t, open 0..1, flutter 0..1, explode 0..1)
 */
function buildOrchid(K, ctx, mats, { scale = 1, hero = false, seed = 0 }) {
  const group = new THREE.Group();
  group.name = hero ? 'guaria-flower-hero' : 'guaria-flower';
  const nod = new THREE.Group();
  group.add(nod);
  const inner = new THREE.Group();
  inner.scale.setScalar(scale);
  nod.add(inner);
  const animated = true;

  // receptacle knob
  const knob = createLathe({ profile: [[0, -0.5], [0.2, -0.45], [0.32, -0.1], [0.3, 0.15], [0, 0.2]], segments: 14 });
  K.mesh(knob, mats.ovaryMat, { name: 'receptacle', parent: inner, outline: 0.7 });

  const sepals = new THREE.Group();
  sepals.name = 'sepals';
  const petals = new THREE.Group();
  petals.name = 'petals';
  inner.add(sepals, petals);
  const sepalDefs = [
    { az: 0, open: 1.42, len: 4.8, wid: 1.4, curl: -0.28, sweep: 0, twist: 0 },
    { az: 2.2, open: 1.5, len: 4.6, wid: 1.35, curl: -0.2, sweep: 0.05, twist: 0.08 },
    { az: -2.2, open: 1.5, len: 4.6, wid: 1.35, curl: -0.2, sweep: -0.05, twist: -0.08 },
  ];
  const petalDefs = [
    { az: 1.12, open: 1.4, twist: 0.18 },
    { az: -1.12, open: 1.4, twist: -0.18 },
  ];
  const S = [], P = [];
  let sepalAnchor = null, petalAnchor = null;
  for (const d of sepalDefs) {
    const b = K.track(new BladeSurface({
      length: d.len, width: d.wid, profile: 'lanceolate', cup: 0.3, curl: d.curl, curlStart: 0.3, curlPow: 1.5,
      sweep: d.sweep, twist: d.twist, wave: 0.04, waveFreq: 2.5, wavePhase: seed + d.az, thickness: 0.06, segU: 10, segV: 20,
    }));
    const m = K.mesh(b.geometry, mats.sepalMat, { name: 'sepal', animated });
    const h = mountOnHinge(m, { azimuth: d.az, radius: 0.18, height: 0.05, open: d.open });
    sepals.add(h.az);
    S.push({ ...h, blade: b, d });
    if (hero && d.az === 0) {
      sepalAnchor = b.attach(new THREE.Object3D(), 0, 0.7, 0.05);
      m.add(sepalAnchor);
    }
  }
  for (const d of petalDefs) {
    const b = K.track(new BladeSurface({
      length: 4.6, width: 3.0, profile: 'elliptic', cup: 0.42, curl: -0.18, curlStart: 0.35, curlPow: 1.3, twist: d.twist,
      wave: 0.13, waveFreq: 3.5, wavePhase: seed * 1.3 + d.az, wavePow: 2.2, thickness: 0.06, segU: 14, segV: 22,
    }));
    const m = K.mesh(b.geometry, mats.petalMat, { name: 'petal', animated });
    const h = mountOnHinge(m, { azimuth: d.az, radius: 0.16, height: 0.12, open: d.open });
    petals.add(h.az);
    P.push({ ...h, blade: b, d });
    if (hero && d.az < 0) {
      petalAnchor = b.attach(new THREE.Object3D(), 0.15, 0.62, 0.05);
      m.add(petalAnchor);
    }
  }

  // lip: tube around the column at the base, flaring ruffled front lobe
  const lipGroup = new THREE.Group();
  lipGroup.name = 'lip-and-column';
  inner.add(lipGroup);
  const lipCup = { base: 2.85, front: 0.3, bend: -0.95 }; // live lip shape (read by the blade)
  const lipBlade = K.track(new BladeSurface({
    length: 4.4, width: 3.7,
    profile: [[0, 0.58], [0.25, 0.66], [0.48, 0.78], [0.68, 1], [0.86, 0.97], [1, 0.66]], tip: 0.9,
    cup: (v) => mix(lipCup.base, lipCup.front, sstep(0.5, 0.8, v)),
    bend: (v) => lipCup.bend * Math.pow(sstep(0.45, 1.0, v), 1.3),
    wave: 0.16, waveFreq: 5.5, wavePow: 2.0, waveSkew: 0.35, thickness: 0.07, segU: 18, segV: 28,
  }));
  const lip = K.mesh(lipBlade.geometry, mats.lipMat, { name: 'labellum', animated });
  const lipH = mountOnHinge(lip, { azimuth: Math.PI, radius: 0.12, height: 0.0, open: 0.6 });
  lipGroup.add(lipH.az);
  const lipAnchor = lipBlade.attach(new THREE.Object3D(), 0, 0.86, 0.06);
  lip.add(lipAnchor);
  // column inside the lip tube (child of the lip so it follows the hinge)
  const colR = (3.7 / 2) * 0.62 / lipCup.base; // tube radius at the column
  const column = new THREE.Group();
  column.name = 'column';
  lip.add(column);
  const colGeo = createLathe({ profile: [[0, 0], [0.15, 0.1], [0.19, 0.8], [0.23, 1.45], [0.26, 1.7], [0.18, 1.86], [0, 1.9]], segments: 14, squash: 0.85 });
  const colMesh = K.mesh(colGeo, mats.columnMat, { name: 'column', parent: column, outline: 0.8 });
  colMesh.rotation.x = 0.06;
  column.position.set(0, 0.05, colR * 0.9);
  const columnAnchor = new THREE.Object3D();
  columnAnchor.position.set(0, 1.7, 0.12);
  column.add(columnAnchor);

  const last = { open: -1, flutterKey: -1 };
  return {
    group, nod, inner, sepals, petals, lipGroup, lip, column, sepalAnchor, petalAnchor, lipAnchor, columnAnchor,
    /**
     * @param {number} t loop time
     * @param {number} open 0 bud … 1 open
     * @param {number} flutter lip flutter strength
     * @param {number} ex dissection 0..1
     */
    pose(t, open, flutter, ex) {
      const o = Math.max(open, ex);
      const w = (t / 5) * Math.PI * 2;
      if (Math.abs(o - last.open) > 1e-4) {
        // a bud is a smooth spindle: sepals furled over the petals, no ruffles
        for (const s of S) {
          s.hinge.rotation.x = mix(0.07, s.d.open, o);
          const bp = s.blade.p;
          bp.cup = mix(1.2, 0.3, o);
          bp.curl = mix(0.42, s.d.curl, o);
          bp.wave = 0.04 * o;
          s.blade.rebuild();
        }
        for (const p of P) {
          p.hinge.rotation.x = mix(0.03, p.d.open, o);
          const bp = p.blade.p;
          bp.cup = mix(1.9, 0.42, o);
          bp.curl = mix(0.45, -0.18, o);
          bp.wave = 0.13 * o * o;
          p.blade.rebuild();
        }
        last.open = o;
      }
      // lip: opens with the bloom, then flutters (ruffle travels, lobe nods)
      const fl = flutter * o;
      lipCup.front = mix(2.3, 0.3, o);
      lipCup.bend = mix(0.3, -0.95, o) + 0.18 * fl * Math.sin(w * 3 + seed);
      lipBlade.p.wavePhase = -w * 2 + seed;
      lipBlade.p.wave = 0.16 * o * o;
      lipBlade.rebuild();
      lipH.hinge.rotation.x = mix(0.02, 0.6, o) + 0.06 * fl * Math.sin(w * 3 + 0.8 + seed);
      // dissection along the floral axis (+Y), spreading the whorls
      sepals.position.y = -2.2 * ex;
      petals.position.y = -1.0 * ex;
      for (const s of S) s.hinge.position.z = 0.18 + 1.5 * ex;
      for (const p of P) p.hinge.position.z = 0.16 + 1.0 * ex;
      lipGroup.position.set(0, 1.6 * ex, -1.4 * ex);
      column.position.set(0, 0.05 + 3.2 * ex, colR * 0.9 + 1.2 * ex);
    },
  };
}
