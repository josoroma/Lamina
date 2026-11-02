// A small stylised hermit hummingbird (after Phaethornis: long decurved
// bill with a yellow-orange lower mandible, dark face mask framed by buff
// stripes, bronze-green back, long white-tipped central tail feathers).
//
// Hovering hummingbirds beat their wings tens of times per second, far
// beyond a 5-second loop's frame rate, so literal flaps would alias into a
// strobing mess. Like a long-exposure photograph, each wing is drawn as a
// translucent motion-blur fan sweeping the stroke plane — densest at the
// stroke reversals where the wing slows — plus faint "ghost" wings at the
// two extremes. Life comes from a slow figure-eight hover sway instead.
//
// Local frame (cm): origin at the body's centre, +Z forward (bill), +Y up,
// +X the bird's left. `billTip` is an Object3D at the tip of the bill.
import * as THREE from 'three/webgpu';
import {
  positionLocal, atan, float, abs, smoothstep, mix, sin, length, color as tslColor, uv,
} from 'three/tsl';
import { TubeSurface, createLathe, quadPath } from './tube.js';
import { BladeSurface } from './blade.js';
import { bladeColor, fuzz } from './shading.js';

export const HERMIT_COLORS = {
  back: '#5d6a3b',
  rump: '#9a7a4a',
  belly: '#cbb894',
  mask: '#2b2620',
  buff: '#e2cfa2',
  bill: '#211e1b',
  mandible: '#e0a23a',
  tail: '#4a4a32',
  tailTip: '#f6f2e6',
  wing: '#4b4840',
};

/**
 * Build the bird.
 * @param {object} ctx FigureContext
 * @param {object} [o]
 * @param {number} [o.wingSpread=2.4] rad swept by each blurred stroke
 * @param {number} [o.wingLength=6.2] cm
 * @returns {{ root: THREE.Group, billTip: THREE.Object3D, eye: THREE.Object3D, body: THREE.Mesh,
 *            wings: THREE.Group, meshes: THREE.Mesh[], billDir: THREE.Vector3, billTipLocal: THREE.Vector3,
 *            pose: (t: number, amount?: number) => void, dispose: () => void }}
 */
export function createHummingbird(ctx, o = {}) {
  const C = { ...HERMIT_COLORS, ...(o.colors ?? {}) };
  const root = new THREE.Group();
  root.name = 'hummingbird';
  const body = new THREE.Group();
  body.name = 'hummingbird:body';
  root.add(body);
  const meshes = [];
  const geos = [];
  const add = (geo, mat, name, parent = body, outline = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    geos.push(geo);
    parent.add(m);
    if (outline) ctx.outline(m, { width: outline });
    meshes.push(m);
    return m;
  };

  // --- body: teardrop lathe along +Z, bronze back grading to buff belly
  const bodyGeo = createLathe({
    profile: [[0, -3.1], [0.55, -2.7], [1.05, -1.6], [1.28, -0.2], [1.18, 1.1], [0.86, 2.15], [0.55, 2.7], [0, 3.0]],
    segments: 28,
    squash: 0.86,
  });
  bodyGeo.rotateX(Math.PI / 2); // lathe Y → +Z, lathe Z → −Y (squash now vertical)
  const lp = positionLocal;
  const dorsal = smoothstep(-0.55, 0.65, lp.y);
  let bodyCol = mix(tslColor(C.belly), tslColor(C.back), dorsal);
  bodyCol = mix(bodyCol, tslColor(C.rump), smoothstep(-1.4, -2.6, lp.z).mul(dorsal).mul(0.7));
  const bodyMat = ctx.ink({ colorNode: bodyCol, roughness: 0.5, hatch: 0.8, name: 'hermit-body' });
  bodyMat.emissiveNode = fuzz('#d9d2b0', 0.18, 2.5);
  const bodyMesh = add(bodyGeo, bodyMat, 'hummingbird-body');

  // --- head with the hermit face pattern painted in local coordinates
  const headGeo = new THREE.SphereGeometry(0.98, 28, 20);
  const hp = positionLocal;
  const eyeLine = hp.y.sub(hp.z.mul(0.18)).sub(0.02);
  const maskBand = float(1).sub(smoothstep(0.17, 0.26, abs(eyeLine)));
  const brow = float(1).sub(smoothstep(0.06, 0.12, abs(eyeLine.sub(0.33))));
  const malar = float(1).sub(smoothstep(0.06, 0.12, abs(eyeLine.add(0.36))));
  const side = smoothstep(0.25, 0.6, abs(hp.x));
  let headCol = mix(tslColor(C.belly), tslColor(C.back), smoothstep(-0.2, 0.55, hp.y));
  headCol = mix(headCol, tslColor(C.mask), maskBand.mul(side));
  headCol = mix(headCol, tslColor(C.buff), brow.add(malar).clamp(0, 1).mul(side));
  const headMat = ctx.ink({ colorNode: headCol, roughness: 0.5, hatch: 0.8, name: 'hermit-head' });
  const head = add(headGeo, headMat, 'hummingbird-head');
  head.position.set(0, 0.62, 2.75);
  head.scale.set(0.92, 0.95, 1.05);

  // eyes
  const eyeGeo = new THREE.SphereGeometry(0.17, 14, 10);
  geos.push(eyeGeo);
  const eyeMat = ctx.ink({ color: '#120f0d', roughness: 0.15, hatch: 0, name: 'hermit-eye' });
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(eyeGeo, eyeMat);
    e.name = 'hummingbird-eye';
    e.position.set(s * 0.74, 0.12, 0.38);
    head.add(e);
    eyes.push(e);
    meshes.push(e);
  }
  const eye = new THREE.Object3D();
  eye.position.set(0.74, 0.12, 0.38);
  head.add(eye);

  // --- bill: long, decurved; black with a yellow-orange lower mandible base
  const p0 = new THREE.Vector3(0, 0.5, 3.55);
  const p1 = new THREE.Vector3(0, 0.55, 5.7);
  const p2 = new THREE.Vector3(0, -0.6, 7.75);
  const billTube = new TubeSurface({
    path: quadPath(p0, p1, p2),
    radius: (v) => 0.19 * (1 - v) + 0.035 * v,
    radial: 10,
    segments: 28,
    capStart: 'open',
    capEnd: 'round',
    up: new THREE.Vector3(0, 1, 0),
  });
  const bu = uv();
  const under = float(1).sub(smoothstep(0.16, 0.24, abs(bu.x.sub(0.5))));
  const billCol = mix(tslColor(C.bill), tslColor(C.mandible), under.mul(float(1).sub(smoothstep(0.35, 0.6, bu.y))));
  const billMat = ctx.ink({ colorNode: billCol, roughness: 0.32, hatch: 0.6, name: 'hermit-bill' });
  const bill = add(billTube.geometry, billMat, 'hummingbird-bill', body, 0.6);
  bill.userData.tube = billTube;
  const billTip = new THREE.Object3D();
  billTip.name = 'hummingbird:billTip';
  billTip.position.copy(p2);
  body.add(billTip);

  // --- tail: graduated, the two central feathers long with white tips
  const tail = new THREE.Group();
  tail.name = 'hummingbird:tail';
  tail.position.set(0, -0.1, -2.75);
  tail.rotation.x = -0.18;
  body.add(tail);
  const tailMat = ctx.ink({
    colorNode: bladeColor({
      base: C.tail, mid: C.tail, tip: C.tail, midAt: 0.5, mottle: 0.04,
      patches: [{ color: C.tailTip, v0: 0.8, v1: 1.2, soft: 0.04 }],
    }),
    roughness: 0.55,
    hatch: 0.7,
    name: 'hermit-tail',
  });
  const feathers = [
    { len: 5.2, w: 0.46, az: -0.035 },
    { len: 5.2, w: 0.46, az: 0.035 },
    { len: 3.3, w: 0.58, az: -0.2 },
    { len: 3.3, w: 0.58, az: 0.2 },
    { len: 2.6, w: 0.56, az: -0.36 },
    { len: 2.6, w: 0.56, az: 0.36 },
  ];
  const tailBlades = [];
  for (const f of feathers) {
    const b = new BladeSurface({ length: f.len, width: f.w, profile: 'linear-lanceolate', cup: 0.25, curl: -0.12, thickness: 0.05, segU: 6, segV: 12 });
    tailBlades.push(b);
    const m = add(b.geometry, tailMat, 'hummingbird-tail', tail, 0.8);
    // blades grow along +Y: tip them back (−Z) with the upper face up, then fan
    m.rotation.set(-Math.PI / 2, f.az, 0, 'YXZ');
  }

  // --- wings: motion-blur fans in the (near-horizontal) stroke plane
  const wingLength = o.wingLength ?? 6.2;
  const spread = o.wingSpread ?? 2.4;
  const wings = new THREE.Group();
  wings.name = 'hummingbird:wings';
  body.add(wings);
  const fanGeo = new THREE.CircleGeometry(wingLength, 40, -spread / 2, spread);
  fanGeo.rotateX(-Math.PI / 2); // XY → XZ; sector centred on +X
  geos.push(fanGeo);
  const fp = positionLocal;
  const ang = atan(fp.z.negate(), fp.x); // −spread/2 … +spread/2
  const an = abs(ang).div(spread / 2); // 0 centre … 1 stroke reversal
  const rr = length(fp.xz).div(wingLength);
  const streak = sin(ang.mul(46.0)).mul(0.5).add(0.5).mul(0.25).add(0.75);
  const reversal = smoothstep(0.55, 0.98, an).mul(0.7).add(0.3);
  const radial = smoothstep(0.08, 0.32, rr).mul(float(1).sub(smoothstep(0.86, 1.0, rr)));
  const leading = mix(float(1), float(0.55), smoothstep(0.3, 1.0, rr));
  const fanAlpha = reversal.mul(radial).mul(streak).mul(leading).mul(float(1).sub(smoothstep(0.985, 1.0, an))).mul(0.46);
  const fanMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  fanMat.name = 'hermit-wing-blur';
  fanMat.colorNode = mix(tslColor(C.wing), tslColor('#9a9483'), rr);
  fanMat.opacityNode = fanAlpha;
  const fans = [];
  const ghostMat = ctx.ink({ color: C.wing, roughness: 0.6, hatch: 0, transparent: true, side: THREE.DoubleSide, name: 'hermit-wing-ghost' });
  ghostMat.opacityNode = float(0.22);
  ghostMat.depthWrite = false;
  ghostMat.userData.alwaysTransparent = true;
  // three draws a double-sided transparent material in two passes (back
  // faces, then front), and each visit to the plate left two of those
  // pipelines cached with no user. One pass looks the same here: both faces
  // of this thin, flat-coloured shell are lit as facing the viewer, and
  // without depth writes neither hides the other.
  ghostMat.forceSinglePass = true;
  const ghostBlade = new BladeSurface({ length: wingLength * 0.96, width: 1.5, profile: 'lanceolate', cup: 0.05, curl: -0.08, sweep: -0.08, thickness: 0.03, segU: 6, segV: 14 });
  geos.push(ghostBlade.geometry);
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.name = 'hummingbird:wing';
    g.position.set(s * 0.92, 0.72, 0.55);
    g.rotation.x = 0.62; // stroke plane ~horizontal when the body pitches up
    g.scale.x = s; // mirror the right wing
    wings.add(g);
    const fan = new THREE.Mesh(fanGeo, fanMat);
    fan.name = 'hummingbird-wingblur';
    fan.userData.castShadow = false;
    fan.renderOrder = 2;
    g.add(fan);
    fans.push(fan);
    meshes.push(fan);
    for (const a of [-spread / 2 + 0.06, spread / 2 - 0.06]) {
      const gw = new THREE.Mesh(ghostBlade.geometry, ghostMat);
      gw.name = 'hummingbird-wingghost';
      gw.userData.castShadow = false;
      gw.renderOrder = 1;
      // blade along +Y → lay it along the sector edge at angle a in XZ
      gw.rotation.set(-Math.PI / 2, 0, 0);
      const holder = new THREE.Group();
      holder.rotation.y = -Math.PI / 2 + a;
      holder.add(gw);
      g.add(holder);
      meshes.push(gw);
    }
  }

  const billDir = new THREE.Vector3().subVectors(p2, new THREE.Vector3(0, 0.35, 5.9)).normalize();
  const basePos = body.position.clone();

  return {
    root,
    body: bodyMesh,
    head,
    bill,
    tail,
    wings,
    eye,
    billTip,
    billTipLocal: p2.clone(),
    billDir,
    meshes,
    /**
     * Seamless hover micro-motion: a slow figure-eight sway of the body and
     * a gentle tail flick. Pure function of loop time t.
     * @param {number} t seconds in [0, 5)
     * @param {number} [amount=1]
     */
    pose(t, amount = 1) {
      const w = (t / 5) * Math.PI * 2;
      body.position.set(
        basePos.x + Math.sin(w * 2) * 0.22 * amount,
        basePos.y + Math.sin(w * 4) * 0.12 * amount,
        basePos.z + Math.sin(w * 2 + 0.6) * 0.08 * amount
      );
      body.rotation.z = Math.sin(w * 2) * 0.05 * amount;
      tail.rotation.x = -0.18 + Math.sin(w * 4 + 1.1) * 0.08 * amount;
    },
    dispose() {
      for (const g of geos) g.dispose();
      billTube.dispose();
      for (const b of tailBlades) b.dispose();
    },
  };
}
