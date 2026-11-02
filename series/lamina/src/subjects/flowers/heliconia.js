// Heliconia wagneriana — platanilla.
//
// Botany (Kew; NTBG; Univ. Wisconsin & Hawaii extension notes): a large
// banana-like herb (1.5–4.5 m) whose leaves rise on long petioles from a
// pseudostem of leaf sheaths. The inflorescence is ERECT, with 8–15
// two-ranked (distichous) boat-shaped bracts on a zig-zag rachis; the bracts
// are pinkish red with a pale yellow band and green margins and keel.
// Slender tubular flowers, the perianth white basally to dark green distally
// with a white ovary (NTBG herbarium, Kress 90-2996), emerge a few at a time
// from each bract. Heliconias are pollinated by hummingbirds; which species
// visit it in Costa Rica is not documented, so the bird is a generic one
// with a hermit-type curved bill.
//
// Plate: the top of a pseudostem, a young leaf arching back (adult blades
// run to 1–2 m) behind an erect inflorescence of eight bracts, and a hummingbird.
// Loop: the bird hovers, flies in, probes a flower in a bract, backs away.
// Explode: bracts slide off the rachis along their own axes, flowers are
// drawn out of their bracts, the bird retreats.
import * as THREE from 'three/webgpu';
import { uv, mix as tmix, smoothstep, color as tslColor, attribute, float, abs, fwidth, positionLocal, mx_noise_float, vec3 } from 'three/tsl';
import {
  BladeSurface, CorollaSurface, TubeSurface, createLathe, cubicPath, orient, bladeMaterial,
  corollaMaterial, translucency, createHummingbird, smoother, lineMask,
} from '../../kits/petal/index.js';
import { sway, mix } from './common.js';

/** Index of the bract whose flower the hummingbird visits (lower right rank). */
const TARGET = 1;

const C = {
  bract: '#c92f3c',
  bractDeep: '#9c1f2c',
  band: '#e8d462',
  margin: '#5e9a3f',
  keel: '#6f9a45',
  flower: '#f2efe2',
  flowerBase: '#e6e3cf',
  flowerTip: '#3d6b2c',
  ovary: '#e9e6d3',
  rachis: '#b8463a',
  stem: '#5f8a3b',
  sheath: '#6c9443',
  leaf: '#3f7a35',
  leafMid: '#4b8a3d', // the blade beside the midrib
  leafUnder: '#86a865',
  midrib: '#b9c98a',
};
// how much of the midrib's and the underside's colour the leaf's colour node lays on the blade
const LEAF_MIDRIB_MIX = 0.8;
const LEAF_UNDER_MIX = 0.8;

/** Piecewise ease between keyframes [{t, p: Vector3}] (closed at the loop seam). */
function keyed(keys, t, out) {
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a.t && t <= b.t) {
      const k = smoother((t - a.t) / Math.max(1e-6, b.t - a.t));
      return out.copy(a.p).lerp(b.p, k);
    }
  }
  return out.copy(keys[0].p);
}

/**
 * Build the Heliconia wagneriana plate with its hummingbird.
 * @param {{ species: string }} params
 * @param {object} ctx FigureContext (src/kits/ink)
 * @param {import('./common.js').FigureKit} K
 * @returns {{ title: string, beats: Array<{t:number,text:string}>, pose: (t:number, st:object) => void }}
 */
export function build(params, ctx, K) {
  const root = K.root;
  K.layer('bracts', 'Bracts', 'Boat-shaped bracts in two ranks — the showy part of the inflorescence');
  K.layer('flowers', 'Flowers', 'The true flowers: slender white tubes tipped with dark green, inside the bracts');
  K.layer('hummingbird', 'Hummingbird', 'A hummingbird with a hermit-type curved bill, probing for nectar');

  // ---------------------------------------------------------------- materials
  const bractMat = bladeMaterial(ctx, {
    base: C.bractDeep, mid: C.bract, tip: C.bract, midAt: 0.3,
    patches: [
      { color: C.band, v0: 0.05, v1: 0.98, d0: 0.7, d1: 1.2, soft: 0.07 },
      { color: C.margin, v0: 0.0, v1: 1.2, d0: 0.9, d1: 1.2, soft: 0.04 },
      { color: C.keel, v0: 0.1, v1: 0.96, d0: -0.1, d1: 0.22, soft: 0.08, side: 1, mix: 0.85 },
      { color: C.margin, v0: 0.9, v1: 1.2, soft: 0.05, mix: 0.8 },
    ],
    veins: 15, vein: C.bractDeep, veinStrength: 0.12, veinWidth: 0.06,
    width: 4, translucency: 0.2, roughness: 0.32, clearcoat: 0.35, name: 'heliconia-bract', svgColor: C.bract,
  });
  // white shading to dark green over the distal fifth of the perianth
  const flowerMat = corollaMaterial(ctx, {
    base: C.flowerBase, mid: C.flower, tip: '#cbd7ae', midAt: 0.5,
    patches: [{ color: C.flowerTip, v0: 0.82, v1: 1.2, soft: 0.07 }],
    length: 5.5, translucency: 0.35, roughness: 0.5, name: 'heliconia-flower', svgColor: C.flower,
  });
  const ovaryMat = ctx.ink({ color: C.ovary, roughness: 0.6, name: 'heliconia-ovary' });
  const rachisMat = ctx.ink({
    colorNode: tmix(tslColor('#7c9a45'), tslColor(C.rachis), smoothstep(0.05, 0.25, uv().y)),
    svgColor: C.rachis, roughness: 0.45, name: 'heliconia-rachis',
  });
  const stemMat = ctx.ink({
    colorNode: tslColor(C.sheath).mul(mx_noise_float(positionLocal.mul(vec3(3.5, 0.12, 3.5))).mul(0.12).add(1)),
    svgColor: C.sheath, roughness: 0.55, name: 'heliconia-pseudostem',
  });
  const leafColor = (() => {
    const U = uv();
    const L = 42, W = 12.5;
    const side = attribute('aSide', 'float');
    const d = abs(U.x.sub(0.5));
    // pinnate-parallel lateral veins sweeping from the midrib to the margin
    const lat = U.y.mul(L).sub(d.mul(W * 0.55)).mul(1.6);
    let c = tmix(tslColor(C.leafMid), tslColor(C.leaf), smoothstep(0.0, 0.5, d));
    c = tmix(c, tslColor('#2f6229'), lineMask(lat, 0.08).mul(0.35));
    // the midrib: a pale stripe with a one-pixel (antialiased) edge. A wider
    // soft edge blends through the underside's green, and the SVG plate,
    // which snaps every pixel to the leaf's three colours, fringed it with that
    const rib = fwidth(d).mul(0.75).max(1e-4);
    c = tmix(c, tslColor(C.midrib), float(1).sub(smoothstep(float(0.013).sub(rib), float(0.013).add(rib), d)).mul(LEAF_MIDRIB_MIX));
    c = tmix(c, tslColor(C.leafUnder), side.mul(LEAF_UNDER_MIX));
    return c.mul(mx_noise_float(positionLocal.mul(0.6)).mul(0.05).add(1));
  })();
  const leafMat = ctx.ink({ colorNode: leafColor, svgColor: C.leaf, roughness: 0.5, sheen: 0.25, name: 'heliconia-leaf' });
  leafMat.emissiveNode = translucency(leafColor, 0.15);

  // ---------------------------------------------------------------- pseudostem, peduncle, rachis
  const plant = new THREE.Group();
  plant.name = 'heliconia';
  root.add(plant);
  const stem = K.track(new TubeSurface({
    path: (v, o) => o.set(0.1 * v, v * 5.2, 0), radius: (v) => 1.25 - 0.3 * v, radial: 18, segments: 6, capStart: 'flat', capEnd: 'round',
  }));
  const pseudostem = new THREE.Group();
  pseudostem.name = 'pseudostem';
  plant.add(pseudostem);
  K.mesh(stem.geometry, stemMat, { name: 'pseudostem', parent: pseudostem });
  stemMat.userData.hatch.value = 0.45;
  // overlapping leaf sheaths clasping the pseudostem, the youngest open where the peduncle emerges
  for (const [h, len, ang, w] of [[0.05, 6.4, 0.0, 8.6], [1.6, 6.2, 2.3, 7.2]]) {
    const sb = K.track(new BladeSurface({
      length: len, width: w, profile: [[0, 1], [0.6, 1], [0.85, 0.85], [1, 0.4]], tip: 0.5, cup: 2.7, curl: -0.04,
      thickness: 0.09, segU: 18, segV: 10,
    }));
    const sh = K.mesh(sb.geometry, stemMat, { name: 'leaf-sheath', parent: pseudostem });
    sh.position.set(0.05, h, 0);
    sh.rotation.y = ang;
    sh.translateZ(-1.1 + h * 0.08);
  }

  const nodes = [];
  const N = 8;
  for (let k = 0; k < N; k++) {
    const side = k % 2 === 0 ? -1 : 1;
    nodes.push(new THREE.Vector3(0.18 + side * 0.42, 10.0 + k * 3.4 - k * k * 0.04, 0));
  }
  const rachisPts = [new THREE.Vector3(0.1, 5.4, 0), new THREE.Vector3(0.14, 8.0, 0), ...nodes, nodes[N - 1].clone().add(new THREE.Vector3(-0.2, 1.8, 0))];
  const rachis = K.track(new TubeSurface({
    path: rachisPts, radius: (v) => 0.55 - 0.25 * v, radial: 10, segments: 90, capStart: 'open', capEnd: 'round',
  }));
  const rachisMesh = K.mesh(rachis.geometry, rachisMat, { name: 'rachis', parent: plant });
  const rachisAnchor = new THREE.Object3D();
  rachisAnchor.position.copy(nodes[1]).lerp(nodes[2], 0.5).add(new THREE.Vector3(0, 0, 0.4));
  plant.add(rachisAnchor);

  // ---------------------------------------------------------------- bracts and flowers
  const bracts = new THREE.Group();
  bracts.name = 'bracts';
  const flowers = new THREE.Group();
  flowers.name = 'flowers';
  plant.add(bracts, flowers);
  K.assign('bracts', bracts);
  K.assign('flowers', flowers);
  const bractList = [];
  const flowerList = [];
  const corolla = K.track(new CorollaSurface({
    length: 5.6, baseRadius: 0.26, funnel: 0.015, throat: 0.8, flare: 0.22, flarePow: 1.6, lobes: 3, lobeDepth: 0.08,
    lobeRound: 1.4, curve: 0.16, thickness: 0.045, segPerLobe: 8, segV: 16,
  }));
  const ovGeo = createLathe({ profile: [[0, -0.9], [0.22, -0.8], [0.3, -0.35], [0.3, 0.05], [0, 0.1]], segments: 12 });
  K.track(ovGeo);
  for (let k = 0; k < N; k++) {
    const side = k % 2 === 0 ? -1 : 1;
    const f = k / (N - 1);
    const len = mix(14.5, 6.8, f);
    const wid = mix(7.6, 4.0, f);
    const beta = mix(0.95, 0.5, f); // angle from vertical
    const dir = new THREE.Vector3(Math.sin(beta) * side, Math.cos(beta), 0.06);
    const up = new THREE.Vector3(-Math.cos(beta) * side, Math.sin(beta), 0.1);
    // conduplicate (folded) bract: two tall walls joined at a keel — a canoe
    const blade = K.track(new BladeSurface({
      length: len, width: wid, profile: 'cymbiform', cup: 0.32, fold: 1.18, curl: 0.2, curlStart: 0.2, curlPow: 1.3,
      thickness: 0.12, segU: 16, segV: 22,
    }));
    const g = new THREE.Group();
    g.position.copy(nodes[k]);
    orient(g, dir, up);
    bracts.add(g);
    const m = K.mesh(blade.geometry, bractMat, { name: 'bract', parent: g });
    bractList.push({ g, base: g.position.clone(), dir, blade, m });
    // 1–2 flowers emerging from the bract mouth (not from the topmost bracts)
    if (k < N - 2) {
      const count = k % 3 === 1 ? 2 : 1;
      for (let j = 0; j < count; j++) {
        const fg = new THREE.Group();
        const mouth = blade.pointAt(0, 0.32 + 0.07 * j, wid * 0.22, new THREE.Vector3());
        fg.position.copy(mouth);
        // emerge up and outward, curving away from the rachis
        // flowers leave the canoe through its open top (local +Z) towards the tip
        let fdir = new THREE.Vector3(j ? 0.12 : -0.06, 0.52, 0.85).normalize();
        if (k === TARGET && j === 0) {
          // the visited flower leans out sideways so the bird is seen in profile
          fdir = new THREE.Vector3(0.8, 0.52, 0.3).normalize().applyQuaternion(g.quaternion.clone().invert());
        }
        orient(fg, fdir, [0, 0, 1]);
        const fl = new THREE.Group();
        fl.add(fg);
        g.add(fl);
        const cm = K.mesh(corolla.geometry, flowerMat, { name: 'flower', parent: fg, outline: 0.8 });
        cm.rotation.y = side < 0 ? 0 : Math.PI;
        K.mesh(ovGeo, ovaryMat, { name: 'ovary', parent: fg, outline: 0.7 });
        flowers.attach(fl);
        flowerList.push({ fl, fg, cm, base: fl.position.clone(), k, j });
      }
    }
  }
  root.updateMatrixWorld(true);
  // flower world directions (in plant space) for explode
  for (const f of flowerList) {
    f.fg.updateWorldMatrix(true, false);
    const q = new THREE.Quaternion();
    f.fg.getWorldQuaternion(q);
    f.axis = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    f.base = f.fl.position.clone();
  }

  // ---------------------------------------------------------------- leaf
  // A whole (young, smaller-than-adult) blade arching back over its midrib, as
  // Heliconia leaves do; adult blades run on to 1–2 m.
  const leafG = new THREE.Group();
  leafG.name = 'leaf';
  plant.add(leafG);
  const petiole = K.track(new TubeSurface({
    path: cubicPath(new THREE.Vector3(-0.5, 4.2, -0.6), new THREE.Vector3(-1.2, 9.5, -1.8), new THREE.Vector3(-2.6, 13.5, -3.4), new THREE.Vector3(-3.8, 16.5, -4.6)),
    radius: (v) => 0.72 - 0.26 * v, radial: 10, segments: 24, capStart: 'open', capEnd: 'open',
  }));
  const petioleMesh = K.mesh(petiole.geometry, stemMat, { name: 'petiole', parent: leafG });
  const leafBlade = K.track(new BladeSurface({
    length: 42, width: 12.5,
    profile: [[0, 0.16], [0.08, 0.55], [0.2, 0.86], [0.45, 1], [0.7, 0.9], [0.88, 0.52], [1, 0.04]], tip: 0.05,
    cup: 0.14, fold: 0.12, curl: -2.35, curlStart: 0.12, curlPow: 1.25, twist: 0.25, wave: 0.32, waveFreq: 4.5,
    thickness: 0.1, segU: 16, segV: 34,
  }));
  const leafMesh = K.mesh(leafBlade.geometry, leafMat, { name: 'leaf-blade', parent: leafG });
  leafMesh.position.set(-3.8, 16.5, -4.6);
  orient(leafMesh, [-0.38, 0.9, -0.2], [0.12, 0.16, 0.98]);
  const leafAnchor = leafBlade.attach(new THREE.Object3D(), -0.35, 0.3, 0.1);
  leafMesh.add(leafAnchor);

  // ---------------------------------------------------------------- hummingbird
  const bird = createHummingbird(ctx);
  for (const m of bird.meshes) K.track(m.geometry, m.material);
  K.track(bird);
  const birdRig = new THREE.Group();
  birdRig.name = 'hummingbird-rig';
  birdRig.add(bird.root);
  root.add(birdRig);
  K.assign('hummingbird', birdRig);

  // target: the upper flower of bract 2 (right-hand rank)
  const target = flowerList.find((f) => f.k === TARGET && f.j === 0) ?? flowerList[0];
  // Dock on the corolla as drawn: right-rank corollas are turned π about their
  // axis (cm.rotation.y), which mirrors the curved tube, so sample through
  // target.cm, not the flower group. With equal lobes the lobe midlines
  // average to the tube axis; pointAt's v is a row fraction and row
  // round(0.6·segV) is the top of the tube, just below the lobe sinuses.
  const _a = new THREE.Vector3();
  const axisAt = (v, out) => {
    out.set(0, 0, 0);
    for (let l = 0; l < corolla.p.lobes; l++) out.add(corolla.pointAt(l, v, 0, _a));
    return root.worldToLocal(out.divideScalar(corolla.p.lobes).applyMatrix4(target.cm.matrixWorld));
  };
  const vThroat = Math.max(2, Math.round(corolla.segV * 0.6)) / corolla.segV;
  target.cm.updateWorldMatrix(true, false);
  const mouth = axisAt(vThroat, new THREE.Vector3());
  const into = axisAt(vThroat - 0.175, new THREE.Vector3()).sub(mouth).normalize(); // down the tube
  // bird orientation: bill (local) → into, bird up → world up
  const bl = bird.billDir.clone().normalize();
  const ul = new THREE.Vector3(0, 1, 0).addScaledVector(bl, -bl.y).normalize();
  const Bl = new THREE.Matrix4().makeBasis(bl, ul, new THREE.Vector3().crossVectors(bl, ul));
  const uw = new THREE.Vector3(0, 1, 0).addScaledVector(into, -into.y).normalize();
  const Bw = new THREE.Matrix4().makeBasis(into, uw, new THREE.Vector3().crossVectors(into, uw));
  const R = new THREE.Matrix4().multiplyMatrices(Bw, Bl.clone().transpose());
  const qDock = new THREE.Quaternion().setFromRotationMatrix(R);
  bird.root.quaternion.copy(qDock);
  const tipOffset = bird.billTipLocal.clone().applyQuaternion(qDock);
  const dock = mouth.clone().sub(tipOffset).addScaledVector(into, 0.9); // bill tip ~1 cm inside
  const away = new THREE.Vector3(7.5, 2.5, 3.5);
  const keys = [
    { t: 0.0, p: dock.clone().add(away) },
    { t: 0.45, p: dock.clone().add(away) },
    { t: 1.45, p: dock.clone().addScaledVector(into, -0.9) },
    { t: 1.85, p: dock.clone() },
    { t: 2.25, p: dock.clone().addScaledVector(into, -0.45) },
    { t: 2.75, p: dock.clone() },
    { t: 3.15, p: dock.clone().addScaledVector(into, -0.6) },
    { t: 3.95, p: dock.clone().add(new THREE.Vector3(5.5, -1.8, 4.5)) },
    { t: 5.0, p: dock.clone().add(away) },
  ];
  // wings: keep the blur fans' stroke plane level in the world
  const qInv = qDock.clone().invert();
  const levelQ = new THREE.Quaternion();
  const yawQ = new THREE.Quaternion();
  const fwd = into.clone().setY(0).normalize();
  yawQ.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fwd);
  levelQ.copy(qInv).multiply(yawQ);
  // stroke plane tilted ~25° (head-up) so the blur reads from the side as well as from above
  for (const w of bird.wings.children) w.quaternion.copy(levelQ).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.45));

  // ---------------------------------------------------------------- labels & parts
  const bractAnchor = bractList[2].blade.attach(new THREE.Object3D(), 0.0, 0.55, -0.2);
  bractList[2].m.add(bractAnchor);
  const flowerAnchor = new THREE.Object3D();
  flowerAnchor.position.copy(corolla.pointAt(0, 0.7, 1, new THREE.Vector3()));
  target.cm.add(flowerAnchor); // the mesh frame, which carries the π turn
  const birdAnchor = new THREE.Object3D();
  birdAnchor.position.set(0, 0.9, 0.2);
  bird.body.add(birdAnchor);
  K.label('bract', 'Bract', 'Waxy, boat-shaped bracts in two ranks; red with a yellow band and green margins.', bractAnchor, [0, 0, 0], 'bracts');
  K.label('flower', 'Flower', 'The true flowers are slender curved tubes, white tipped with dark green.', flowerAnchor, [0, 0, 0], 'flowers');
  K.label('rachis', 'Rachis', 'The zig-zag axis that carries the two ranks of bracts.', rachisAnchor);
  K.label('hummingbird', 'Hummingbird', 'Hummingbirds pollinate it; a long, curved bill fits the curved flowers.', birdAnchor, [0, 0, 0], 'hummingbird');
  K.label('leaf', 'Leaf', 'Banana-like leaves on long petioles; adult blades reach 1–2 m.', leafAnchor);

  // The bracts and the leaf blade name the colours they are painted with, so
  // every SVG plate separates them the same way: read from the pixels, the
  // bracts' red-to-yellow edges came out as a fourth, ochre colour on some
  // exports and not on others. The blade's are the blends its colour node
  // paints (mixed in linear light, as TSL mixes); its petiole, painted like
  // the pseudostem, is a part of its own so it is not read as one of them.
  const blend = (a, b, k) => `#${new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString()}`;
  K.part('bracts', 'Bracts', bracts, C.bract, 'bracts', {
    swatches: [{ color: C.bract, name: 'Red bract' }, { color: C.band, name: 'Yellow band' }, { color: C.margin, name: 'Green margin' }],
  });
  K.part('flowers', 'Flowers', flowers, C.flower, 'flowers');
  K.part('rachis', 'Rachis', rachisMesh, C.rachis);
  K.part('pseudostem', 'Pseudostem & leaf sheaths', pseudostem, C.sheath);
  K.part('leaf', 'Leaf', leafG, C.leaf, undefined, {
    swatches: [
      { color: C.leaf, name: 'Green blade' },
      { color: blend(C.leafMid, C.midrib, LEAF_MIDRIB_MIX), name: 'Pale midrib' },
      { color: blend(C.leaf, C.leafUnder, LEAF_UNDER_MIX), name: 'Pale underside' },
    ],
  });
  K.part('petiole', 'Petiole', petioleMesh, C.sheath);
  K.part('hummingbird', 'Hummingbird', birdRig, '#5d6a3b', 'hummingbird');

  const _p = new THREE.Vector3();
  return {
    title: 'Heliconia wagneriana — platanilla and its hummingbird',
    beats: [
      { t: 0, text: 'A hummingbird hovers beside the erect inflorescence.' },
      { t: 0.45, text: 'It darts in towards a flower emerging from a bract.' },
      { t: 1.45, text: 'The curved bill slides into the curved flower to sip nectar.' },
      { t: 3.15, text: 'It backs away; pollen picked up here travels to the next plant.' },
    ],
    pose(t, st) {
      const ex = st.explode ?? 0;
      keyed(keys, t, _p);
      birdRig.position.set(0, 0, 0);
      bird.root.position.set(_p.x + 9 * ex, _p.y + 2 * ex, _p.z + 4 * ex);
      // slight heading sway while hovering away from the flower
      const hover = 1 - smoother(Math.min(1, Math.max(0, (t - 1.2) / 0.3))) + smoother(Math.min(1, Math.max(0, (t - 3.15) / 0.4)));
      bird.root.quaternion.copy(qDock);
      bird.pose(t, Math.min(1, hover) * (st.reducedMotion ? 0.3 : 1));
      // dissection: bracts off the rachis, flowers out of the bracts
      for (const b of bractList) b.g.position.copy(b.base).addScaledVector(b.dir, 3.2 * ex);
      for (const f of flowerList) f.fl.position.copy(f.base).addScaledVector(f.axis, 4.0 * ex);
      // the whole plant sways a touch in the bird's wake
      plant.rotation.z = (st.reducedMotion ? 0.2 : 1) * (0.006 * sway(t, 1, 0.2) + 0.004 * Math.exp(-((t - 1.6) ** 2) * 4));
    },
  };
}
