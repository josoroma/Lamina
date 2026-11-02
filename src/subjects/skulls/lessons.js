// The six lessons of "Calaveras": what each recto performs in its seamless
// 5-second loop, which layers it offers, how the skull is presented to the
// reader's camera, and the narrated beats.
//
// Every `animate(t, W, st)` is a pure function of loop time t (plus layer
// weights W, eased by the figure, and the host state) so scrubbing, looping
// and captures are deterministic; pose(0) == pose(5).
import * as THREE from 'three/webgpu';
import { smoothstep } from '../../engine/util/math.js';
import { HUMAN, VAULT_EGG, HUMAN_FRAMES, humanSDF, jawPose } from './human.js';
import {
  guideLine, chainPoints, ellipse, roundRectCurve, teardropCurve, densify, GUIDE_COLOR, GRID_COLOR,
} from './guides.js';
import { buildMuscles, HUMAN_MUSCLES } from './muscles.js';

const D2R = Math.PI / 180;
const seg = (t, a, b) => smoothstep(a, b, t);
const inOut = (t, a, b, c, d) => seg(t, a, b) * (1 - seg(t, c, d));
/** Present at the loop's start: erased over [a, b], redrawn over [c, d] (d ≤ 5) — seamless. */
const wrapIn = (t, a, b, c, d) => (t < a ? 1 : t < c ? 1 - seg(t, a, b) : seg(t, c, d));
const mirrorPts = (pts) => pts.map((p) => [-p[0], p[1], p[2]]);

/** Accent for highlights (the Calaveras book's red). */
export const ACCENT = '#a3342a';

/**
 * Label points for near-frontal cameras (cm, skull frame, authored on the
 * left; `anchors` below). The table's parietal point, on the eminence, is
 * the skull's outline from the front: this one sits 2 cm behind the coronal
 * suture, on the face of the bone the camera sees. The sagittal suture runs
 * along the top of the outline from the front: this point of it, about 4 cm
 * behind the vertex, hides behind the crown instead.
 */
const PARIETAL_FORWARD = [6.11, 8.36, 0.38];
const SAGITTAL_BEHIND_CROWN = [0.07, 10.72, -4.18];

/**
 * Static lesson descriptors (no GPU objects): layers, beats, presentation.
 * tilt/yaw (degrees) turn the skull towards the book camera (≈ 57° above the page);
 * `anchors` gives a label its own point where that view leaves the table's
 * point (species.js) on the skull's outline (placeLabels `points`).
 */
export const LESSONS = {
  frontal: {
    subject: 'human',
    title: 'Human skull — frontal view, built from a ball',
    // keyTime: the engraved skull; blockInTime: the middle of the planes stage
    // (fully shown 2.35–2.75 s), the lesson's form with Engraving and Bones off
    tilt: -52, yaw: 0, keyTime: 3.9, blockInTime: 2.55,
    layers: [
      { id: 'construction', label: 'Construction', visible: true, hint: 'Ball, centre line, brow/eye/nose lines, jaw taper' },
      { id: 'planes', label: 'Planes', visible: true, hint: 'The skull blocked in as flat planes' },
      { id: 'engraving', label: 'Engraving', visible: true, hint: 'The finished skull, engraved in ink' },
      { id: 'bones', label: 'Bones', visible: false, hint: 'Colour each bone (atlas palette)' },
      { id: 'sutures', label: 'Sutures', visible: true, hint: 'Wavy joints between the cranial bones' },
    ],
    beats: [
      { t: 0.0, text: 'A ball for the cranium, a line down the middle.' },
      { t: 0.25, text: 'Brow, eye, nose and mouth lines cross the centre line.' },
      { t: 1.0, text: 'The jaw tapers from the cheekbones to the chin.' },
      { t: 1.7, text: 'Block in the planes; cut the sockets and the pear-shaped nose.' },
      { t: 2.55, text: 'Refine and engrave: the hatching follows the form.' },
      { t: 4.2, text: 'Erase, and start again from the ball.' },
    ],
  },
  'open-jaw': {
    subject: 'human',
    title: 'Human skull — three-quarter view, open jaw',
    tilt: -38, yaw: 34, keyTime: 2.4,
    layers: [
      { id: 'construction', label: 'Construction', visible: true, hint: 'The hinge axis and the arc the chin travels' },
      { id: 'bones', label: 'Bones', visible: false, hint: 'Colour each bone (atlas palette)' },
      { id: 'muscles', label: 'Muscles', visible: true, hint: 'Temporalis and masseter, the closing muscles' },
      { id: 'teeth', label: 'Teeth', visible: true, hint: '32 adult teeth' },
    ],
    beats: [
      { t: 0.0, text: 'Closed: each condyle rests in its mandibular fossa.' },
      { t: 0.5, text: 'Opening: the condyles mostly rotate, already starting to glide…' },
      { t: 1.3, text: '…and the glide grows with the gape, forward and down the eminences.' },
      { t: 2.05, text: 'Wide open: about 27° at the joint, the incisors about 5 cm apart.' },
      { t: 2.85, text: 'Masseter and temporalis pull the jaw shut.' },
    ],
  },
  profile: {
    subject: 'human',
    title: 'Human skull — turning to profile',
    tilt: -46, yaw: 0, keyTime: 2.5,
    // in profile the bridge of the nose is the outline: the nasal bones'
    // point sits low on their side, where the turned face still shows them
    anchors: { nasal: [0.56, 1.64, 9.91] },
    layers: [
      { id: 'construction', label: 'Construction', visible: true, hint: 'The ball of the cranium in three rings' },
      { id: 'grid', label: 'Proportion grid', visible: true, hint: 'Square, thirds and the ear line in profile' },
      { id: 'bones', label: 'Bones', visible: false, hint: 'Colour each bone (atlas palette)' },
      { id: 'sutures', label: 'Sutures', visible: true, hint: 'Coronal, sagittal, lambdoid and squamous sutures' },
    ],
    beats: [
      { t: 0.0, text: 'Front: the cranium is a ball, the face hangs below it.' },
      { t: 0.6, text: 'Turning, the face reads as a wedge on the front of the ball.' },
      { t: 1.85, text: 'Profile: the whole skull fits a square.' },
      { t: 2.4, text: 'Orbit floor, zygomatic arch and ear hole share one level.' },
      { t: 3.2, text: 'Back to the front view.' },
    ],
  },
  bones: {
    subject: 'human',
    title: 'Human skull — the twenty-two bones',
    tilt: -40, yaw: 22, keyTime: 2.4,
    // label points this camera needs (cm, authored on the left as in
    // species.js). The turntable swings the near side to within 8° of the
    // front, where the table's parietal and temporal points lie on the
    // skull's outline: these sit further forward on each bone. Parted, the
    // greater wing of the sphenoid turns edge-on, so its point lies deeper in
    // the temple, on the wing's flat. The dropped jaw shows the front of the
    // condyle's head, and that point hides behind the eminence when the bones
    // lock back together.
    anchors: {
      parietal: PARIETAL_FORWARD,
      temporal: [5.69, 1.37, 0.55],
      sphenoid: [4.71, 2.29, 3.74],
      condyle: [5.24, -1.08, 1.86],
      'sagittal-suture': SAGITTAL_BEHIND_CROWN,
    },
    layers: [
      { id: 'bones', label: 'Bones', visible: true, hint: 'Colour each bone (atlas palette)' },
      { id: 'sutures', label: 'Sutures', visible: true, hint: 'Wavy joints between the cranial bones' },
      { id: 'teeth', label: 'Teeth', visible: true, hint: '32 adult teeth' },
    ],
    beats: [
      { t: 0.0, text: 'Twenty-two bones: eight cranial, fourteen facial.' },
      { t: 0.5, text: 'The sutures part: frontal, parietals, temporals, occipital.' },
      { t: 1.5, text: 'The face separates: maxillae, zygomatics, nasal bones.' },
      { t: 2.2, text: 'The mandible is the only movable bone.' },
      { t: 3.1, text: 'Everything locks back together along the sutures.' },
    ],
  },
  jaguar: {
    subject: 'jaguar',
    title: 'Jaguar skull — Panthera onca',
    tilt: -28, yaw: 52, keyTime: 3.3,
    layers: [
      { id: 'construction', label: 'Construction', visible: true, hint: 'Braincase oval, muzzle box and arch flare' },
      { id: 'bones', label: 'Bones', visible: false, hint: 'Colour each bone (atlas palette)' },
      { id: 'teeth', label: 'Teeth', visible: true, hint: 'Canines and carnassials (30 teeth)' },
    ],
    beats: [
      { t: 0.0, text: 'Short face, flaring arches: a skull built for a crushing bite.' },
      { t: 0.5, text: 'Opening: the jaw joint is a transverse hinge, with almost no sideways play.' },
      { t: 1.8, text: 'At full gape the dagger canines clear each other.' },
      { t: 2.6, text: 'The bite: temporalis, anchored on the sagittal crest, pulls the coronoid.' },
      { t: 3.4, text: 'Carnassials (P4 over m1) shear past each other like scissors.' },
    ],
  },
  'skull-and-snake': {
    subject: 'human',
    title: 'Skull and eyelash palm-pitviper',
    tilt: -44, yaw: -18, keyTime: 1.8,
    // label points for this near-frontal camera (see PARIETAL_FORWARD)
    anchors: { parietal: PARIETAL_FORWARD, 'sagittal-suture': SAGITTAL_BEHIND_CROWN },
    layers: [
      { id: 'construction', label: 'Construction', visible: false, hint: 'The path the snake follows' },
      { id: 'skull', label: 'Skull', visible: true, hint: 'The engraved skull' },
      { id: 'snake', label: 'Snake', visible: true, hint: 'Bothriechis nigroadspersus, golden “oropel” morph' },
    ],
    // the manifest's beats (calaveras.js), which the reader prints; these are
    // the lab's, timed to the head (its eye) in the skull frame: in the orbit
    // at 0, leaving it 0.1–0.4, over the brow 0.5–0.7, up the forehead and
    // over the vault 0.8–2.2, down behind the ear 2.6–3.1, round the mastoid
    // 3.2–3.6, below the arch and the cheekbone, outside the ramus, 3.7–4.3,
    // over the cheek 4.4–4.6, into the socket 4.7. Re-time them with snake.js CONTROL.
    beats: [
      { t: 0.0, text: 'The viper’s head rests in the orbit; its body circles the skull.' },
      { t: 0.5, text: 'The head leaves the orbit and crosses the brow.' },
      { t: 1.3, text: 'It climbs over the vault.' },
      { t: 2.6, text: 'Then it runs down behind the ear.' },
      { t: 3.6, text: 'It swings forward below the cheekbone arch, beside the jaw.' },
      { t: 4.4, text: 'Over the cheek, it slips back into the socket.' },
    ],
  },
};

// ---------------------------------------------------------------- shared guide helpers

function addGuide(list, parent, ctx, pts, when, o = {}) {
  const g = guideLine(ctx, pts, { width: o.width ?? 1.1, color: o.color ?? GUIDE_COLOR, depthTest: o.depthTest ?? false, name: o.name });
  parent.add(g.object);
  list.push({ g, when, layer: o.layer ?? 'construction', base: o.base ?? 1 });
  return g;
}

function eggRings(egg = VAULT_EGG) {
  const [cx, cy, cz] = egg.c, [rx, ry, rz] = egg.r;
  return {
    coronal: ellipse([cx, cy, cz], [1, 0, 0], [0, 1, 0], rx, ry, 120, Math.PI / 2, Math.PI / 2 + Math.PI * 2),
    sagittal: ellipse([0, cy, cz], [0, 0, 1], [0, 1, 0], rz, ry, 120, Math.PI / 2, Math.PI / 2 + Math.PI * 2),
    equator: ellipse([cx, cy, cz], [1, 0, 0], [0, 0, 1], rx, rz, 120, Math.PI / 2, Math.PI / 2 + Math.PI * 2),
  };
}

/** Flatten iso-line chains into one ordered polyline list (each drawn as its own stroke). */
function strokes(chains, lift, filter) {
  return chainPoints(chains ?? [], lift, filter).filter((p) => p.length > 3);
}

// ---------------------------------------------------------------- lesson builders

/**
 * Build a lesson's GPU objects and return its animator.
 * @param {string} id
 * @param {object} F  { rig, ctx, guides (Group in skull space), turn, params, litCtx }
 * @returns {{ animate: (t:number, W:Record<string,number>, st:object)=>void, dispose: ()=>void,
 *            labels?: Array, guides: Array }}
 */
export function buildLesson(id, F) {
  const builders = { frontal, 'open-jaw': openJaw, profile, bones, jaguar, 'skull-and-snake': skullAndSnake };
  return (builders[id] ?? frontal)(F);
}

function frontal(F) {
  const { rig, ctx, guides } = F;
  const list = [];
  const ring = eggRings().coronal;
  // the loop starts (and ends) on the ball and the centre line
  addGuide(list, guides, ctx, ring, (t) => wrapIn(t, 4.3, 4.5, 4.55, 4.95), { name: 'ball' });
  addGuide(list, guides, ctx, densify([[0, 12.6, 11.2], [0, -10.6, 11.2]], 0.5), (t) => wrapIn(t, 4.3, 4.5, 4.7, 5.0), { name: 'centre-line', width: 1 });
  const across = (y, a, b, name) =>
    addGuide(list, guides, ctx, densify([[-7.7, y, 11.0], [7.7, y, 11.0]], 0.5), (t) => inOut(t, a, b, 4.25, 4.5), { name, width: 1 });
  across(HUMAN.glabella[1] - 0.5, 0.25, 0.65, 'brow-line');
  across(HUMAN.orbitCentre[1], 0.35, 0.75, 'eye-line');
  across(HUMAN.nasospinale[1], 0.45, 0.85, 'nose-line');
  across(HUMAN.occlusalFront[1], 0.55, 0.95, 'mouth-line');
  // the centre line wraps the form once there is a form to wrap
  for (const s of strokes(rig.lines.centre, 0.06, (p) => p[2] > -0.5)) {
    addGuide(list, guides, ctx, s, (t) => inOut(t, 1.85, 2.4, 4.2, 4.45), { name: 'centre-contour', depthTest: true, width: 1.2 });
  }
  for (const s of strokes(rig.mandibleLines.centre, 0.06, (p) => p[2] > 4)) {
    addGuide(list, rig.mandible.inner, ctx, s, (t) => inOut(t, 1.9, 2.45, 4.2, 4.45), { name: 'centre-contour-jaw', depthTest: true, width: 1.2 });
  }
  const zy = HUMAN.zygion, go = HUMAN.gonion, me = HUMAN.menton;
  const taper = densify([[-zy[0], zy[1], zy[2] + 3], [-go[0], go[1], go[2] + 2.5], [0, me[1], me[2] + 1], [go[0], go[1], go[2] + 2.5], [zy[0], zy[1], zy[2] + 3]], 0.45);
  addGuide(list, guides, ctx, taper, (t) => inOut(t, 1.0, 1.7, 4.25, 4.5), { name: 'jaw-taper' });
  const { orbit, orbitSize: O, aperture: A } = HUMAN_FRAMES;
  const sockL = roundRectCurve(orbit, O.hw, O.hh, O.r, 14);
  addGuide(list, guides, ctx, sockL, (t) => inOut(t, 1.75, 2.35, 4.25, 4.5), { name: 'socket-left' });
  addGuide(list, guides, ctx, mirrorPts(sockL), (t) => inOut(t, 1.8, 2.4, 4.25, 4.5), { name: 'socket-right' });
  addGuide(list, guides, ctx, teardropCurve(A.frame, A.r1, A.r2, A.h, 48), (t) => inOut(t, 1.9, 2.5, 4.25, 4.5), { name: 'aperture' });

  return {
    guides: list,
    animate(t, W) {
      for (const it of list) it.g.setDraw(it.when(t) * (W[it.layer] ?? 1));
      const skull = inOut(t, 2.55, 3.3, 4.1, 4.5);
      rig.u.planes.value = inOut(t, 1.7, 2.35, 2.75, 3.35) * (W.planes ?? 1);
      rig.u.skull.value = skull * Math.max(W.engraving ?? 1, W.bones ?? 0);
      rig.u.sutures.value = skull * (W.sutures ?? 1) * Math.max(W.engraving ?? 1, W.bones ?? 0);
      ctx.u.hatchStrength.value = 0.3 + 0.7 * (W.engraving ?? 1);
    },
    dispose() {
      for (const it of list) it.g.dispose();
    },
  };
}

const _jaw = { angle: 0, open: 0, glide: [0, 0, 0] };
/**
 * Human opening cycle: opens over 0.4–2.0 s, holds, closes over 2.8–4.4 s;
 * pose(0) = pose(5). Rotation and glide both start with the opening
 * (jawPose, human.js). Reuses one result object (called every frame).
 */
function jawMotion(t) {
  return jawPose(seg(t, 0.4, 2.0) * (1 - seg(t, 2.8, 4.4)), _jaw);
}

function openJaw(F) {
  const { rig, ctx, guides, litCtx } = F;
  const list = [];
  const piv = rig.jaw.position.clone(); // closed: the condyles in their sockets
  // the hinge axis rides with the condyles (the jaw group translates with the glide)
  addGuide(list, rig.jaw, ctx, [[-7.8, 0, 0], [7.8, 0, 0]], () => 1, { name: 'hinge-axis', width: 1.2 });
  // the chin's true path — rotation about condyles that glide as they turn — drawn on
  // as the jaw opens (samples are uniform in the opening, so the stroke ends at the chin)
  const me = HUMAN.menton;
  const dy = me[1] - piv.y, dz = me[2] - piv.z;
  const arc = [];
  const p = { angle: 0, open: 0, glide: [0, 0, 0] };
  for (let i = 0; i <= 40; i++) {
    jawPose(i / 40, p);
    const c = Math.cos(p.angle), s = Math.sin(p.angle);
    arc.push([0, piv.y + p.glide[1] + dy * c - dz * s, piv.z + p.glide[2] + dy * s + dz * c]);
  }
  addGuide(list, guides, ctx, arc, null, { name: 'chin-arc' });
  const rings = eggRings();
  addGuide(list, guides, ctx, rings.sagittal, () => 1, { name: 'ball-sagittal', width: 0.8 });
  addGuide(list, guides, ctx, rings.equator, () => 1, { name: 'ball-equator', width: 0.8 });

  const sdf = humanSDF();
  const muscles = buildMuscles(litCtx, HUMAN_MUSCLES, { pivot: [0, piv.y, piv.z], cranium: sdf.cranium, mandible: sdf.mandible });
  guides.parent.add(muscles.object); // skull space, outside the guides group
  if (F.side === 'right') for (const a of Object.values(muscles.anchors)) a.position.x *= -1;
  const labels = [
    { id: 'temporalis', text: 'Temporalis', detail: 'Fans from the temple under the arch to the coronoid process.', anchor: muscles.anchors.temporalis, layer: 'muscles' },
    { id: 'masseter', text: 'Masseter', detail: 'From the zygomatic arch to the angle: the strongest closer.', anchor: muscles.anchors.masseter, layer: 'muscles' },
  ];

  return {
    guides: list,
    labels,
    muscles,
    animate(t, W) {
      const m = jawMotion(t);
      rig.setJaw(m.angle, m.glide);
      muscles.update(m.angle, m.glide);
      for (const it of list) it.g.setDraw((it.when ? it.when(t) : Math.max(0.02, m.open)) * (W[it.layer] ?? 1));
    },
    dispose() {
      for (const it of list) it.g.dispose();
      muscles.dispose();
    },
  };
}

function profile(F) {
  const { rig, ctx, guides, turn } = F;
  const list = [];
  const rings = eggRings();
  addGuide(list, guides, ctx, rings.coronal, () => 1, { name: 'ball-coronal', width: 0.9 });
  addGuide(list, guides, ctx, rings.sagittal, () => 1, { name: 'ball-sagittal', width: 0.9 });
  addGuide(list, guides, ctx, rings.equator, () => 1, { name: 'ball-equator', width: 0.8 });
  // proportion grid in the midsagittal plane: the profile's silhouette
  // (vertex, menton, pogonion, opisthocranion) lies in it, so in the reader's
  // perspective the square boxes the skull exactly; a plane off to one side
  // is enlarged and shifted by perspective. The Frankfort line (y = 0, drawn
  // heavier) runs through the ear canal there too.
  const X = 0;
  const top = HUMAN.vertex[1], bot = HUMAN.menton[1];
  const back = HUMAN.opisthocranion[2], front = HUMAN.pogonion[2] + 0.4;
  const levels = [top, HUMAN.glabella[1] - 0.5, HUMAN.orbitCentre[1], 0, HUMAN.nasospinale[1], HUMAN.occlusalFront[1], bot];
  for (const y of levels) {
    addGuide(list, guides, ctx, densify([[X, y, back - 0.6], [X, y, front + 0.6]], 0.6), null,
      { name: y === 0 ? 'grid-frankfort' : 'grid', color: GRID_COLOR, width: y === 0 ? 1.1 : 0.8, layer: 'grid' });
  }
  for (const z of [back, front]) {
    addGuide(list, guides, ctx, densify([[X, top + 0.6, z], [X, bot - 0.6, z]], 0.6), null, { name: 'grid', color: GRID_COLOR, width: 0.8, layer: 'grid' });
  }
  // The ear line is the exception: the ear hole it must cross is the one the
  // turn shows, 6 cm off the midline, and a vertical at the midline misses it
  // by almost a centimetre in the reader's perspective. So it stands in that
  // porion's plane, short of the box (its ends would not meet the box lines
  // of the farther plane); it crosses the Frankfort line on the ear hole.
  const earX = (F.side === 'left' ? 1 : -1) * HUMAN.porion[0];
  addGuide(list, guides, ctx, densify([[earX, 4, 0], [earX, -4, 0]], 0.5), null, { name: 'grid-ear-line', color: GRID_COLOR, width: 1.1, layer: 'grid' });

  return {
    guides: list,
    animate(t, W) {
      const s = seg(t, 0.5, 1.9) * (1 - seg(t, 3.2, 4.6));
      turn.rotation.y = s * Math.PI * 0.5;
      const gridF = seg(s, 0.45, 0.95);
      for (const it of list) it.g.setDraw((it.when ? it.when(t) : gridF) * (W[it.layer] ?? 1) * it.base);
      rig.u.sutures.value = W.sutures ?? 1;
    },
    dispose() {
      for (const it of list) it.g.dispose();
    },
  };
}

function bones(F) {
  const { rig, turn } = F;
  return {
    guides: [],
    animate(t, W, st) {
      const user = st?.explode ?? 0;
      // the fit box is measured assembled; the explosion may spill past it
      const e = st?.fit ? 0 : seg(t, 0.45, 1.8) * (1 - seg(t, 3.1, 4.5));
      rig.setInnerExplode(e * (1 - user));
      turn.rotation.y = 0.24 * Math.sin((t / 5) * Math.PI * 2);
      const total = e + user * (1 - e);
      rig.apart = total;
      rig.u.sutures.value = (W.sutures ?? 1) * Math.max(0, 1 - total * 3);
    },
    dispose() {},
  };
}

function jaguar(F) {
  const { rig, ctx, guides } = F;
  const list = [];
  // braincase oval and muzzle box (side construction), arch flare (top)
  addGuide(list, guides, ctx, ellipse([0, 2.3, -4.6], [0, 0, 1], [0, 1, 0], 6.6, 4.6, 110, Math.PI / 2, Math.PI * 2.5), () => 1, { name: 'braincase' });
  addGuide(list, guides, ctx, densify([[0, 3.7, 6.2], [0, 3.7, 13.0], [0, -2.6, 13.0], [0, -2.6, 6.2], [0, 3.7, 6.2]], 0.5), () => 1, { name: 'muzzle-box' });
  addGuide(list, guides, ctx, ellipse([0, 0.5, 0.9], [1, 0, 0], [0, 0, 1], 8.6, 7.2, 110, -Math.PI / 2, Math.PI * 1.5), () => 1, { name: 'arch-flare', width: 0.9 });
  const piv = rig.jaw.position;
  addGuide(list, guides, ctx, [[-7.8, piv.y, piv.z], [7.8, piv.y, piv.z]], () => 1, { name: 'hinge-axis', width: 1 });
  // the sagittal crest, inked in the accent colour and pulsed during the bite
  const crest = [];
  for (const s of strokes(rig.lines.crest, 0.08)) {
    crest.push(addGuide(list, guides, ctx, s, () => 1, { name: 'sagittal-crest', color: ACCENT, width: 1.4, depthTest: true, layer: 'always' }));
  }
  return {
    guides: list,
    animate(t, W) {
      const open = seg(t, 0.4, 1.8) * (1 - seg(t, 2.6, 3.05));
      rig.setJaw(38 * D2R * open, null);
      const pulse = inOut(t, 2.35, 2.75, 3.6, 4.5);
      for (const g of crest) g.object.material.linewidth = 1.3 + 2.4 * pulse;
      for (const it of list) it.g.setDraw((it.when ? it.when(t) : 1) * (it.layer === 'always' ? 1 : W[it.layer] ?? 1));
    },
    dispose() {
      for (const it of list) it.g.dispose();
    },
  };
}

function skullAndSnake(F) {
  const { rig, ctx, guides } = F;
  const list = [];
  const path = F.snakePath ?? [];
  if (path.length > 2) addGuide(list, guides, ctx, densify([...path, path[0]], 0.6), () => 1, { name: 'snake-path', width: 0.9 });
  return {
    guides: list,
    animate(t, W) {
      for (const it of list) it.g.setDraw(W[it.layer] ?? 0);
      rig.u.sutures.value = 1;
    },
    dispose() {
      for (const it of list) it.g.dispose();
    },
  };
}

/**
 * Lesson time actually shown: reduced-motion readers paused at 0 see the key pose.
 * @param {number} [key] the key pose's time when the layers change it (default lesson.keyTime)
 */
export function effectiveTime(lesson, t, st, key = lesson.keyTime) {
  if (st?.reducedMotion && !st.playing && t < 1e-3) return key ?? 0;
  return t;
}

