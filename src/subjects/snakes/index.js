// Snakes subject ("Serpientes"): a parametric, anatomically structured snake
// that implements the Figure contract (src/engine/figures/contract.js).
//
// One generator covers every species in SPECIES: a CPU-swept D-section tube
// (skin, re-posed every frame with analytic normals) along a spine written by
// a pose generator, a rigid multi-part head (jaw, eyes, pits, tongue, fangs),
// an instanced skeleton for the x-ray layer, species extras (rattle, eyelash
// scales, spurs, spiny tail tip) and minimal ink-drawn props (branch, prey,
// water, egg clutch). Authored in centimetres at real scale.
//
//   createFigure({ species, pose?, morph?, length?, path?, closed?, loops?, wave?, up?, props?, reveal? }, ctx)
//
// `createSnake` is an alias for other subjects (e.g. the skull-and-snake
// lesson drives a snake along its own path with pose 'follow-path').
import * as THREE from 'three/webgpu';
import { uv } from 'three/tsl';
import { setXray, setFade } from '../../kits/ink/index.js';
import { FIGURE_DURATION } from '../../engine/figures/contract.js';
import { Spine, SweptTube, makeSection } from '../../kits/tube/index.js';
import { SPECIES, POSES, resolveSpecies } from './species.js';
import { bodySkin, patternSwatches } from './patterns.js';
import { buildHead, headDims } from './head.js';
import { buildSkeleton } from './skeleton.js';
import { createPose } from './poses.js';
import { buildRattle, buildWater, buildBranch, buildPrey, buildClutch, buildSpurs, buildTailSpines } from './props.js';

export { SPECIES, POSES };

/** How far back (fraction of length) the body stays round: raised necks are not flattened. */
const ROUND_NECK = { strike: 0.4, rattle: 0.42, branch: 0.3, ambush: 0.22, slither: 0.16, swim: 0.2, constrict: 0.18, 'follow-path': 0.18 };

const POSE_TITLES = {
  strike: 'striking posture',
  branch: 'coiled on a branch',
  slither: 'lateral undulation',
  rattle: 'defensive rattle',
  ambush: 'ambush coil with clutch',
  swim: 'swimming',
  constrict: 'constricting a black rat',
  'follow-path': 'travelling a path',
};

/**
 * Build a snake figure.
 *
 * @param {object} [params]
 * @param {string} [params.species='bothrops-asper']  key of SPECIES
 * @param {string} [params.pose]   strike | branch | slither | rattle | ambush | swim | constrict | follow-path
 *                                 (default: the species' own pose)
 * @param {string} [params.morph]  bothriechis-schlegelii: 'oropel' (default) | 'green'
 * @param {number} [params.length] total length in cm (default: species preset)
 * @param {number[][]} [params.path]  follow-path: centre-line points [[x,y,z], …] in cm, in the
 *                                 caller's coordinates (the root is NOT re-centred for this pose)
 * @param {boolean} [params.closed=true]  follow-path: loop the path (false: glide out and back)
 * @param {number} [params.loops=1]  follow-path: laps per 5 s loop (integer)
 * @param {number} [params.wave=0]   follow-path: lateral undulation amplitude (cm, closed paths)
 * @param {number[]} [params.up=[0,1,0]]  follow-path: preferred dorsal direction
 * @param {boolean} [params.props=true]  include the pose's props (branch, prey, water, clutch)
 * @param {boolean} [params.reveal]  explode also reveals the skeleton and venom apparatus
 *                                 through x-rayed skin (default: true, false for follow-path)
 * @param {object} ctx  FigureContext from src/kits/ink
 * @returns {Promise<object>} Figure
 */
export async function createFigure(params = {}, ctx) {
  const spec = resolveSpecies(params.species ?? 'bothrops-asper', params.morph);
  const poseName = params.pose ?? spec.pose;
  if (!POSES.includes(poseName)) throw new Error(`Unknown snake pose "${poseName}". Known: ${POSES.join(', ')}`);
  const withProps = params.props !== false;
  const L = Math.max(10, params.length ?? spec.length);
  const K = ctx.quality === 'low' ? 170 : 240;
  const RADIAL = ctx.quality === 'low' ? 18 : 24;
  const ds = L / (K - 1);
  const rMax = (spec.girth * L) / 2;
  const dims = headDims(spec, L);
  const Lh = dims.Lh;
  const sCloaca = L * (1 - spec.tail);
  const disposables = [];
  const root = new THREE.Group();
  root.name = `snake:${spec.id}`;

  // ---- body profile ------------------------------------------------------
  const spine = new Spine(K);
  const restW = new Float32Array(K), restH = new Float32Array(K);
  const halfW = new Float32Array(K), groundY = new Float32Array(K);
  const sec = spec.section;
  // the tube starts inside the head (on a ring, so its rounded cap closes),
  // far enough in that the neck keeps its full girth under the back of the
  // head (`neckIn`, head lengths behind the snout; head.js SHAPES)
  const k0 = Math.ceil((Lh * (dims.shape.neckIn ?? 0.7)) / ds);
  const sStart = k0 * ds;
  const capLen = Math.max(rMax * spec.neck * 1.1, ds * 2);
  const paddle = spec.tailTip === 'paddle';
  for (let k = 0; k < K; k++) {
    const s = k * ds;
    spine.s[k] = s;
    let r = rMax * radiusProfile(spec, s / L, Lh / L);
    let hMul = 1;
    if (k <= k0) r = 0;
    else if (s < sStart + capLen) r *= Math.sqrt(Math.max(0, 1 - (1 - (s - sStart) / capLen) ** 2));
    if (spec.tailTip === 'rattle') {
      const c = rMax * spec.cloaca * 0.42;
      if (L - s < c) r *= Math.sqrt(Math.max(0, 1 - (1 - (L - s) / c) ** 2));
    }
    if (!paddle) spine.mix[k] = 1 - smooth(Lh * 1.2, L * (ROUND_NECK[poseName] ?? 0.2), s);
    if (paddle) {
      const u = (s - sCloaca) / (L - sCloaca);
      spine.mix[k] = smooth(-0.55, 0.25, u);
      hMul = 1 + 0.75 * smooth(-0.3, 0.45, u);
      if (u > 0) r *= Math.sqrt(Math.max(0, 1 - smooth(0.62, 1.0, u) ** 2)) * (1 - 0.15 * u);
    }
    restW[k] = r;
    restH[k] = r * hMul;
    halfW[k] = r * (paddle ? lerp(sec.width, spec.paddle.width, spine.mix[k]) : sec.width);
    groundY[k] = r * hMul * (paddle ? sec.bottom + (sec.keel ?? 0) : lerp(sec.bottom, Math.max(sec.bottom, 0.86), spine.mix[k]));
  }
  spine.w.set(restW);
  spine.h.set(restH);

  // ---- skin --------------------------------------------------------------
  const secA = makeSection(sec, RADIAL);
  // section B: the paddle tail of sea snakes, otherwise a rounder neck (a
  // snake only flattens its belly where it rests on it)
  const secB = makeSection(paddle ? spec.paddle : { ...sec, bottom: Math.max(sec.bottom, 0.86), pBottom: 2.15, pTop: 2.1 }, RADIAL);
  const kC = Math.round(sCloaca / ds);
  const belly = spec.kind === 'boa' ? 0.8 : spec.kind === 'elapid' ? 0.78 : 0.76;
  const info = { L, headLen: Lh, sCloaca, belly };
  const { colorNode, roughnessNode, normalNode } = bodySkin(spec, info, ctx);
  const svgSkin = spec.colors.ground ?? spec.colors.red ?? spec.colors.dorsum;
  const skinMat = ctx.ink({ colorNode, svgColor: svgSkin, roughness: 0.5, hatchCoord: uv().x, name: 'snake-skin' });
  skinMat.roughnessNode = roughnessNode;
  if (normalNode) skinMat.normalNode = normalNode;
  disposables.push(skinMat);
  const bodyTube = new SweptTube({ rings: kC - k0 + 1, radial: RADIAL, section: secA, sectionB: secB });
  const tailTube = new SweptTube({ rings: K - kC, radial: RADIAL, section: secA, sectionB: secB });
  bodyTube.setPatternCoords(spine, k0, L);
  tailTube.setPatternCoords(spine, kC, L);
  disposables.push(bodyTube, tailTube);
  const body = new THREE.Mesh(bodyTube.geometry, skinMat);
  body.name = 'body';
  const tail = new THREE.Mesh(tailTube.geometry, skinMat);
  tail.name = 'tail';
  for (const m of [body, tail]) {
    m.frustumCulled = false;
    ctx.outline(m);
    root.add(m);
  }

  // ---- head ----------------------------------------------------------------
  const head = buildHead(ctx, spec, dims);
  disposables.push(head);
  root.add(head.group);

  // ---- skeleton ------------------------------------------------------------
  const skel = buildSkeleton(ctx, {
    vertebrae: spec.scales.ventrals + spec.scales.subcaudals,
    trunk: spec.scales.ventrals,
    sStart: Lh * 0.92,
    sCloaca,
    sEnd: L - ds * 1.5,
    pelvis: !!spec.spurs,
  });
  disposables.push(skel);
  root.add(skel.group);

  // ---- species extras -------------------------------------------------------
  let rattle = null, spurs = null, spines = null;
  if (spec.tailTip === 'rattle') {
    rattle = buildRattle(ctx, { radius: rMax * spec.cloaca * 0.62, segments: spec.rattle.segments, color: spec.colors.rattle, dark: spec.colors.rattleDark });
    disposables.push(rattle);
    root.add(rattle.group);
  }
  if (spec.spurs) {
    spurs = buildSpurs(ctx, rMax * 0.42);
    disposables.push(spurs);
    root.add(spurs.group);
  }
  if (spec.tailTip === 'spine') {
    spines = buildTailSpines(ctx, 18, rMax * 0.16);
    disposables.push(spines);
    root.add(spines.mesh);
  }

  // ---- props ---------------------------------------------------------------
  const model = { K, L, ds, spine, halfW, h0: restH, groundY, headLen: Lh, sCloaca, rMax, sec, spec };
  let water = null, branch = null, prey = null, clutch = null;
  // the swim pose floats at this level; the slab itself is built around the
  // pose's swept extent once the pose exists (below)
  if (poseName === 'swim') model.waterLevel = Math.max(5, rMax * 6);
  if (poseName === 'branch') {
    branch = buildBranch(ctx, { y: L * 0.2, radius: Math.max(0.5, rMax * 0.72), length: L * 0.56, x0: -L * 0.1, leaf: L * 0.09 });
    model.branch = { y: branch.axisY, radius: branch.radius };
    disposables.push(branch);
    if (withProps) root.add(branch.group);
  }
  if (poseName === 'constrict') {
    // a black rat at real scale (props.js); the pose lays the loops round it
    // and sets its height so that the lowest loop rests on the paper
    prey = buildPrey(ctx, { axisY: rMax * 2.2, hb: 21, tailLen: 24, girth: 2.7 });
    // the jaws close round the rat's neck: the pose needs the mouth, measured
    // on the head's own meshes (head frame, mouth shut, cm): the lowest point
    // of the palate, the top of the floor of the mouth, the jaw's hinge and
    // the half-width of the jaws
    const upperSkin = head.upper.getObjectByName('head-skin'), jawSkin = head.jaw.getObjectByName('jaw-skin');
    let palate = 0, floor = -Infinity;
    const pu = upperSkin.geometry.attributes.position, pj = jawSkin.geometry.attributes.position;
    for (let i = 0; i < pu.count; i++) palate = Math.min(palate, pu.getY(i));
    for (let i = 0; i < pj.count; i++) floor = Math.max(floor, pj.getY(i) + jawSkin.position.y + head.jaw.position.y);
    const mouth = {
      palate, floor, hinge: [head.jaw.position.x, head.jaw.position.y],
      /**
       * Points of the head's skin (head frame) with the mouth open by `gape`
       * and the head raised by `tilt`: the upper head's, then the jaw's (from
       * index `jawFrom`, in triples). Posed by head.js itself.
       */
      surface(gape, tilt) {
        head.pose({ gape, tilt });
        head.group.updateMatrixWorld(true);
        const inv = head.group.matrixWorld.clone().invert(), mx = new THREE.Matrix4(), v = new THREE.Vector3(), pts = [];
        let jawFrom = 0;
        for (const mesh of [upperSkin, jawSkin]) {
          if (mesh === jawSkin) jawFrom = pts.length;
          mx.multiplyMatrices(inv, mesh.matrixWorld);
          const p = mesh.geometry.attributes.position;
          for (let i = 0; i < p.count; i += 3) pts.push(...v.fromBufferAttribute(p, i).applyMatrix4(mx).toArray());
        }
        head.pose({});
        return { pts: Float32Array.from(pts), jawFrom };
      },
    };
    model.prey = Object.assign(prey, { headCentreY: head.centreY, mouth });
    disposables.push(prey);
    if (withProps) root.add(prey.group);
  }
  if (poseName === 'ambush' && spec.oviparous) {
    clutch = buildClutch(ctx, { count: 9, eggLength: Lh * 0.95, color: spec.colors.egg, radius: L * 0.05 });
    model.clutchRadius = clutch.radius;
    disposables.push(clutch);
    root.add(clutch.group);
  } else if (poseName === 'ambush') {
    model.clutchRadius = L * 0.03;
  }

  const pose = createPose(poseName, model, params);
  if (poseName === 'swim') {
    // open water on every side: the whole loop (paddle tail and tongue flicks
    // included) stays inside the slab with ~5 % of the length to spare
    const margin = L * 0.05;
    const reach = pose.extent ?? { halfX: L * 0.48, halfZ: L * 0.08 };
    water = buildWater(ctx, { w: reach.halfX + margin, d: Math.max(L * 0.19, reach.halfZ + margin), h: model.waterLevel });
    disposables.push(water);
    if (withProps) root.add(water.group);
  }
  const out = { head: { gape: 0, fang: 0, tongue: 0, flick: 0, spread: 0.3, tilt: 0 }, radius: new Float32Array(K).fill(1), shake: 0, prey: 1, reducedMotion: false };

  // ---- layers ----------------------------------------------------------------
  const venomous = spec.fangs !== 'none';
  const layers = [
    { id: 'skin', label: 'Skin', visible: true, hint: 'Scales and colour pattern' },
    { id: 'skeleton', label: 'Skeleton', visible: false, hint: 'X-ray: hundreds of vertebrae, paired ribs, the skull' },
  ];
  if (venomous) layers.push({ id: 'venom', label: 'Venom', visible: false, hint: 'Venom glands, ducts and fangs' });
  if (spec.eyelash) layers.push({ id: 'eyelash-scales', label: 'Eyelash scales', visible: true, hint: 'Spiny supraciliary scales above the eyes' });
  if (rattle) layers.push({ id: 'rattle', label: 'Rattle', visible: true, hint: 'Keratin segments — explode to separate them' });
  if (clutch) layers.push({ id: 'eggs', label: 'Eggs', visible: true, hint: 'The clutch the female coils around' });
  if (water && withProps) layers.push({ id: 'water', label: 'Water', visible: true, hint: 'The sea surface it swims in' });
  const layerState = Object.fromEntries(layers.map((l) => [l.id, l.visible]));
  // the bushmaster's spiny tail scales are skin too (hidden or x-rayed with it)
  const skinObjects = [body, tail, ...head.skin, ...(spines ? [spines.mesh] : [])];
  // Explode is a dissection: past a small amount the skin turns to x-ray and
  // the skeleton and venom apparatus show through it (and separate, see
  // head.pose). A layer the reader switches off stays off; a snake embedded in
  // another plate (follow-path) keeps a plain explode unless params.reveal.
  const reveal = params.reveal ?? poseName !== 'follow-path';
  const dissectable = { skeleton: true, venom: venomous };
  let dissect = 0;
  // inner parts per layer (filled once the parts exist) and their dissolve
  const innerParts = { skeleton: [], venom: [] };
  const innerFade = { skeleton: 1, venom: 1 };
  // what is drawn now, whatever the switches say (layerShown, label gates)
  const shown = { skin: true, skeleton: false, venom: false };

  function applyLayers() {
    const skin = layerState.skin !== false;
    const showBones = !!layerState.skeleton || (dissect > 0 && dissectable.skeleton);
    const showVenom = !!layerState.venom || (dissect > 0 && dissectable.venom);
    const xray = !skin ? 0 : layerState.skeleton || layerState.venom ? 1 : showBones || showVenom ? dissect : 0;
    for (const o of skinObjects) {
      o.visible = skin;
      setXray(o, xray);
    }
    // past half-way the x-rayed skin is a ghost (the host stops picking it too)
    shown.skin = skin && xray < 0.5;
    shown.skeleton = showBones;
    shown.venom = showVenom;
    // Labels follow what is drawn. While the dissection turns the skin into
    // a ghost, a feature of its surface is not labelled ('Keeled scales'
    // would point at bare ribs). A switched-on inner layer x-rays it too, but
    // that ghost is the reader's choice, and a look-closer tap on a skin
    // feature (which switches only the skin back on) must still find its
    // label. The bones' anchors ride on the body, not inside a part, so they
    // go with the bones; and an inner layer the dissection shows while its
    // switch is off lends its labels to the dissection once it is half-way
    // (when the skin's labels go): without their layer the host and the SVG
    // key list them, gated by their anchors, until it ends.
    const dissected = skin && dissect >= 0.5 && (dissectable.skeleton || dissectable.venom);
    for (const a of surfaceAnchors) a.visible = !dissected;
    for (const a of boneAnchors) a.visible = showBones;
    for (const [l, home] of innerLabels) l.layer = shown[home] && !layerState[home] && dissect >= 0.5 ? undefined : home;
    skel.group.visible = showBones;
    head.setLayers({ skin, skeleton: showBones, venom: showVenom, eyelash: layerState['eyelash-scales'] !== false });
    // nothing may float without the body: the spurs are the claw-tipped ends
    // of the vestigial femurs and the rattle rides on the last vertebrae, so
    // both stay with the bones
    if (spurs) spurs.group.visible = skin || showBones;
    if (rattle) rattle.group.visible = layerState.rattle !== false && (skin || showBones);
    // the prey hangs in the coils: it goes when the whole snake is hidden
    if (prey) prey.group.visible = skin || showBones;
    if (clutch) clutch.group.visible = layerState.eggs !== false;
    if (water) water.group.visible = layerState.water !== false;
    // without a skin to fade through, parts the dissection reveals dissolve in
    // with it (a switched-on layer is the host's to fade)
    for (const id of INNER_LAYERS) {
      const a = !skin && !layerState[id] ? dissect : 1;
      if (a === innerFade[id]) continue;
      innerFade[id] = a;
      for (const o of innerParts[id]) setFade(o, a);
    }
  }

  /** Dissection amount for an explode value (re-applies the layers only when it changes). */
  function setDissect(explode) {
    const d = reveal ? smooth(0.08, 0.6, explode) : 0;
    if (Math.abs(d - dissect) < 1e-3 && (d > 0) === (dissect > 0)) return;
    dissect = d;
    applyLayers();
  }

  // ---- labels ----------------------------------------------------------------
  const bodyAnchors = [];
  const bodyAnchor = (name, s, theta, lift = 0) => {
    const a = new THREE.Object3D();
    a.name = `anchor:${name}`;
    a.userData.body = { s, theta, lift };
    root.add(a);
    bodyAnchors.push(a);
    return a;
  };
  const labels = [];
  // head labels carry a mark that never hides their feature ('ring' of `size`
  // cm round an eye, pit or nostril; 'tick' elsewhere) and `alt`, the same
  // feature's anchor on the other side of the head (head.js marks)
  const L_ = (id, text, detail, anchor, layer, extra) => anchor && labels.push({ id, text, detail, anchor, ...(layer ? { layer } : {}), ...(extra ?? {}) });
  // features of the skin's surface hide with it (no 'Keeled scales' leader
  // pointing at bare ribs), and a look-closer tap switches the skin back on
  const S = 'skin';
  const pit = spec.kind === 'pitviper';
  const A = head.anchors;
  const M = head.marks;
  const slit = spec.eye.pupil === 'slit';
  L_('eye', 'Eye', `${slit ? 'Vertical pupil' : 'Round pupil'}; no eyelids — a clear scale, the spectacle, covers the eye, so snakes never blink.`, A.eye, S, M.eye);
  // a constricting béquer holds its bite for the whole loop: the tongue stays
  // in, out of sight, and its anchor at the lip notch would lie on the prey
  if (poseName !== 'constrict') L_('tongue', 'Forked tongue', 'Flicks out through a notch in the lip and carries scent to the vomeronasal (Jacobson’s) organ.', A.tongue, S, M.tongue);
  if (pit) {
    L_('loreal-pit', 'Loreal pit', 'Heat-sensing pit organ between eye and nostril: it detects the infrared warmth of prey.', A['loreal-pit'], S, M['loreal-pit']);
    L_('fangs', 'Hinged fangs', 'Long hollow fangs fold against the palate and swing forward as the mouth opens.', A.fangs, 'venom', M.fangs);
    L_('venom-gland', 'Venom gland', 'A modified salivary gland behind and below the eye; muscles squeeze venom down a duct to the fang.', A['venom-gland'], 'venom', M['venom-gland']);
  }
  if (spec.fangs === 'proteroglyph') {
    L_('fixed-fangs', 'Fixed front fangs', 'Short, permanently erect fangs at the front of the upper jaw.', A.fangs, 'venom', M.fangs);
    L_('venom-gland', 'Venom gland', 'Venom flows from a gland behind and below the eye to the fixed fangs.', A['venom-gland'], 'venom', M['venom-gland']);
  }
  const scutes = () => L_('ventral-scutes', 'Ventral scutes', 'A single row of wide belly plates grips the ground — roughly one per trunk vertebra.', bodyAnchor('ventral-scutes', L * 0.32, Math.PI * 0.78, 0.05), S);
  switch (spec.id) {
    case 'bothrops-asper':
      L_('keeled-scales', 'Keeled scales', 'Each dorsal scale carries a central ridge, giving the skin a rough, matte look.', bodyAnchor('keeled-scales', L * 0.62, Math.PI * 0.22, 0.04), S);
      scutes();
      break;
    case 'bothriechis-schlegelii':
      L_('eyelash-scales', 'Eyelash scales', 'Spiny supraciliary scales above each eye give the eyelash viper its name.', A['eyelash-scales'], 'eyelash-scales', M['eyelash-scales']);
      L_('prehensile-tail', 'Prehensile tail', 'Wraps around twigs to anchor the snake while it waits or strikes.', bodyAnchor('prehensile-tail', L * 0.93, 0, 0.1), S);
      break;
    case 'micrurus-nigrocinctus': {
      const ring = micrurusRingCentres(spec, info);
      L_('red-ring', 'Red ring', 'Broad red rings; each red scale is tipped with black.', bodyAnchor('red-ring', ring.red, 0, 0.05), S);
      L_('black-ring', 'Black ring', 'Black rings bordered on both sides by narrow yellow rings.', bodyAnchor('black-ring', ring.black, 0, 0.05), S);
      L_('yellow-ring', 'Yellow ring', 'Narrow pale rings. Colour rhymes do not identify coral snakes in Central America.', bodyAnchor('yellow-ring', ring.yellow, 0, 0.05), S);
      L_('head', 'Head', 'Barely wider than the neck: black snout, yellow band across the back of the head.', A.head, S, M.head);
      break;
    }
    case 'crotalus-simus':
      L_('rattle', 'Rattle', 'Loosely interlocking keratin segments; a new one is added at each shed.', rattle && anchorOn(rattle.segments[2], 'rattle'), 'rattle');
      L_('rattle-button', 'Button', 'The oldest segment, at the tip — lost when the rattle breaks.', rattle && anchorOn(rattle.segments[rattle.segments.length - 1], 'rattle-button'), 'rattle');
      L_('cloaca', 'Cloaca (vent)', 'Marks where the body ends and the short tail begins.', bodyAnchor('cloaca', sCloaca, Math.PI * 0.86, 0.05), S);
      L_('keeled-scales', 'Keeled scales', 'Strongly keeled, protruding scales give the back a rough, matte look.', bodyAnchor('keeled-scales', L * 0.45, Math.PI * 0.2, 0.04), S);
      break;
    case 'lachesis-stenophrys':
      L_('tail-spine', 'Spiny tail tip', 'Rows of small spiny scales end in a terminal spine; the tail buzzes in leaf litter.', bodyAnchor('tail-spine', L - ds * 2, 0, 0.2), S);
      L_('eggs', 'Eggs', 'Probably the only egg-laying pitvipers of the Americas; the female may stay coiled with her clutch.', clutch && anchorOn(clutch.eggs[clutch.eggs.length - 1], 'eggs'), 'eggs');
      L_('keeled-scales', 'Keeled scales', 'Strongly keeled, knobbly scales: a rough, pineapple-like skin.', bodyAnchor('keeled-scales', L * 0.5, Math.PI * 0.2, 0.04), S);
      break;
    case 'hydrophis-platurus':
      L_('paddle-tail', 'Paddle tail', 'Flattened from side to side, the tail works like an oar.', bodyAnchor('paddle-tail', L - (L - sCloaca) * 0.45, Math.PI * 0.5, 0.05), S);
      // whether its nostrils are valved is left out (sources disagree for
      // this species, serpientes-research §7 q. 9): the card gives what the
      // plate's own note does (VI-14)
      L_('nostril', 'Nostril', 'It must surface to breathe air, though it can take up some oxygen through its skin while submerged.', A.nostril, S, M.nostril);
      L_('yellow-venter', 'Yellow belly', 'Bright yellow below, sharply divided from the black back.', bodyAnchor('yellow-venter', L * 0.5, Math.PI * 0.7, 0.05), S);
      break;
    case 'boa-imperator':
      // on the claw itself, halfway along it (the spur's local +X); one on
      // each side of the vent (`alt`), so the reader and the SVG point at the
      // claw on the camera's side, never at the far one behind the body
      L_('pelvic-spur', 'Pelvic spur', 'Claw-like remnants of hind limbs beside the vent; larger in males, used in courtship.',
        spurs && anchorOn(spurs.spurs[0], 'pelvic-spur', spurs.size * 0.5, -spurs.size * 0.1), undefined,
        spurs && { alt: anchorOn(spurs.spurs[1], 'pelvic-spur', spurs.size * 0.5, -spurs.size * 0.1) });
      L_('eye-stripe', 'Eye stripe', 'A dark stripe runs from the snout through the eye to the angle of the jaw.', A['eye-stripe'], S, M['eye-stripe']);
      L_('recurved-teeth', 'Recurved teeth', 'Rows of backward-curving teeth and no fangs: boas kill by constriction, not venom.', A['recurved-teeth'], undefined, M['recurved-teeth']);
      break;
    default:
      break;
  }
  L_('vertebrae', 'Vertebrae', 'Hundreds of vertebrae, linked by extra interlocking joints, make a supple yet strong spine.', bodyAnchor('vertebrae', L * 0.46, 0, -0.55), 'skeleton');
  L_('ribs', 'Ribs', 'A pair on every trunk vertebra, none on the tail — and no breastbone.', bodyAnchor('ribs', L * 0.38, Math.PI * 0.5, -0.2), 'skeleton');
  if (labels.filter((l) => !l.layer || l.layer === S).length < 3) scutes();
  // gated in applyLayers: anchors on the skin's surface (all its labels but
  // the eye and the tongue, which stay solid while the skin is x-rayed), the
  // bones' anchors, and the inner layers' labels with their own layer
  const surfaceAnchors = labels.filter((l) => l.layer === S && l.id !== 'eye' && l.id !== 'tongue').flatMap((l) => (l.alt ? [l.anchor, l.alt] : [l.anchor]));
  const boneAnchors = labels.filter((l) => l.layer === 'skeleton').map((l) => l.anchor);
  const innerLabels = labels.filter((l) => INNER_LAYERS.includes(l.layer)).map((l) => [l, l.layer]);

  // ---- parts (SVG export, dissection) ------------------------------------------
  // The SVG plate prints each part in the named colours its skin paints (the
  // coral's rings, the sea snake's black back and yellow belly); a part too
  // small to read a pattern is filled with the first, dominant one. The tail
  // has its own where the species does (the sea snake's yellow paddle, the
  // coral's black-and-yellow rings, the rattlesnake's dark tail).
  const svgTail = spec.colors.tail ?? (paddle ? spec.colors.venter : svgSkin);
  const bodySwatches = patternSwatches(spec, 'body');
  const tailSwatches = patternSwatches(spec, 'tail');
  const parts = [
    { id: 'body', name: 'Body', object: body, color: bodySwatches ? bodySwatches[0].color : svgSkin, swatches: bodySwatches },
    { id: 'tail', name: 'Tail', object: tail, color: tailSwatches ? tailSwatches[0].color : svgTail, swatches: tailSwatches },
    ...head.parts,
    ...skel.parts,
  ];
  if (rattle) rattle.segments.forEach((m, i) => parts.push({ id: m.name, name: i === rattle.segments.length - 1 ? 'Rattle button' : `Rattle segment ${i + 1}`, object: m, color: spec.colors.rattle, layer: 'rattle' }));
  if (spurs) parts.push({ id: 'pelvic-spurs', name: 'Pelvic spurs', object: spurs.group, color: '#3a3027' });
  if (spines) parts.push({ id: 'tail-spines', name: 'Spiny tail tip', object: spines.mesh, color: '#2b2018' });
  if (clutch) clutch.eggs.forEach((m, i) => parts.push({ id: `egg-${i + 1}`, name: `Egg ${i + 1}`, object: m, color: spec.colors.egg, layer: 'eggs' }));
  if (branch && withProps) parts.push(...branch.parts);
  if (prey && withProps) parts.push(...prey.parts);
  for (const p of parts) if (p.layer in innerParts) innerParts[p.layer].push(p.object);

  // ---- per-frame -------------------------------------------------------------------
  const mHead = new THREE.Matrix4();
  const vF = new THREE.Vector3(), vU = new THREE.Vector3(), vR = new THREE.Vector3(), vP = new THREE.Vector3();
  const fr = new Float32Array(12);
  const kHead = Math.max(2, Math.round(Lh / ds));
  // dissection: the head comes away from the neck by a gap that still reads
  // at book zoom on a small-headed snake
  const headGap = reveal ? Math.max(Lh * 0.6, L * 0.03) : Lh * 0.5;
  let explodeStored = 0;

  function placeHead(explode) {
    const P = spine.pos, B = spine.B;
    vF.set(P[0] - P[kHead * 3], P[1] - P[kHead * 3 + 1], P[2] - P[kHead * 3 + 2]).normalize();
    const kb = Math.round(kHead * 0.5) * 3;
    // A held bite has an explicit head frame. Transport from the trailing
    // coils can reject its dorsal direction as a flip; keep the fitted jaws
    // in that authored frame instead of rolling them through the prey.
    const headUp = poseName === 'constrict' ? spine.upTarget : B;
    vU.set(headUp[kb], headUp[kb + 1], headUp[kb + 2]);
    vU.addScaledVector(vF, -vU.dot(vF)).normalize();
    vR.crossVectors(vF, vU).normalize();
    mHead.makeBasis(vF, vU, vR);
    head.group.quaternion.setFromRotationMatrix(mHead);
    vP.set(P[kHead * 3], P[kHead * 3 + 1], P[kHead * 3 + 2]).addScaledVector(vU, -head.centreY).addScaledVector(vF, explode * headGap);
    head.group.position.copy(vP);
  }

  function placeOnBody(obj, s, theta, lift) {
    spine.frameAt(spine.indexAt(s), fr);
    const i = Math.min(K - 1, Math.max(0, Math.round(spine.indexAt(s))));
    const w = spine.w[i], h = spine.h[i];
    const st = Math.sin(theta), ct = Math.cos(theta);
    const x = w * sec.width * st * (1 + lift);
    const y = h * (ct >= 0 ? sec.top : sec.bottom) * ct * (1 + lift);
    obj.position.set(
      fr[0] + fr[9] * x + fr[6] * y,
      fr[1] + fr[10] * x + fr[7] * y,
      fr[2] + fr[11] * x + fr[8] * y
    );
  }

  /** Orient `obj` on the spine frame at arc length s: local +X = tail-wards, +Y = dorsal. */
  function frameObject(obj, s, offsetX = 0) {
    spine.frameAt(spine.indexAt(s), fr);
    vF.set(fr[3], fr[4], fr[5]);
    vU.set(fr[6], fr[7], fr[8]);
    vR.crossVectors(vF, vU);
    mHead.makeBasis(vF, vU, vR);
    obj.quaternion.setFromRotationMatrix(mHead);
    obj.position.set(fr[0] + fr[3] * offsetX, fr[1] + fr[4] * offsetX, fr[2] + fr[5] * offsetX);
  }

  const spineM = new THREE.Matrix4(), spineQ = new THREE.Quaternion(), spineS = new THREE.Vector3(), spineV = new THREE.Vector3();

  function update(t, dt, st) {
    const explode = st?.explode ?? explodeStored;
    setDissect(explode);
    out.reducedMotion = !!st?.reducedMotion;
    out.radius.fill(1);
    pose.evaluate(((t % FIGURE_DURATION) + FIGURE_DURATION) % FIGURE_DURATION, out);
    for (let k = 0; k < K; k++) {
      spine.w[k] = restW[k] * out.radius[k];
      spine.h[k] = restH[k] * out.radius[k];
    }
    spine.computeFrames(true);
    bodyTube.update(spine);
    tailTube.update(spine);
    placeHead(explode);
    head.pose(out.head, explode);
    if (skel.group.visible) skel.update(spine);
    if (rattle) {
      frameObject(rattle.group, L, -rattle.step * 1.7);
      rattle.pose(explode, out.shake * (st?.reducedMotion ? 0.5 : 1), t);
    }
    if (spurs) {
      for (let i = 0; i < 2; i++) {
        const m = spurs.spurs[i];
        const side = i ? -1 : 1;
        // one claw on each side of the vent, standing out from the skin
        // rooted at the skin just below the widest point of the flank (where
        // it shows from above and from the side, not tucked under the belly)
        placeOnBody(m, sCloaca - rMax * 0.2, side * Math.PI * 0.56, 0);
        spine.frameAt(spine.indexAt(sCloaca), fr);
        // claw points backwards (T), out of its own flank (side · R, the side
        // placeOnBody put it on) and a little down; it curls ventrally (−Y)
        vR.set(fr[9] * side, fr[10] * side, fr[11] * side);
        vU.set(fr[6], fr[7], fr[8]);
        vF.set(fr[3], fr[4], fr[5]).addScaledVector(vR, 0.75).addScaledVector(vU, -0.15).normalize();
        vU.addScaledVector(vF, -vU.dot(vF)).normalize();
        vR.crossVectors(vF, vU);
        mHead.makeBasis(vF, vU, vR);
        m.quaternion.setFromRotationMatrix(mHead);
      }
    }
    if (spines) {
      const arr = spines.mesh.instanceMatrix.array;
      const n = spines.count;
      for (let i = 0; i <= n; i++) {
        const last = i === n;
        const s = last ? L - ds * 0.5 : L - (L - sCloaca) * 0.16 * (1 - i / n);
        spine.frameAt(spine.indexAt(s), fr);
        const ii = Math.min(K - 1, Math.round(spine.indexAt(s)));
        const r = (spine.w[ii] + spine.h[ii]) * 0.5;
        const ang = last ? 0 : (i % 3) * 2.1 + i * 0.37;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        // spine direction: outwards from the tail surface, raked back (last: along the tail)
        const ox = fr[9] * sa + fr[6] * ca, oy = fr[10] * sa + fr[7] * ca, oz = fr[11] * sa + fr[8] * ca;
        if (last) spineV.set(fr[3], fr[4], fr[5]);
        else spineV.set(ox * 0.6 + fr[3] * 0.8, oy * 0.6 + fr[4] * 0.8, oz * 0.6 + fr[5] * 0.8).normalize();
        spineQ.setFromUnitVectors(UP, spineV);
        const sc = last ? 1.6 : 0.8 + 0.4 * ((i * 7) % 3) / 2;
        spineS.setScalar(sc);
        const px = fr[0] + (last ? 0 : ox * r * 0.85), py = fr[1] + (last ? 0 : oy * r * 0.85), pz = fr[2] + (last ? 0 : oz * r * 0.85);
        spineM.compose(spineV.set(px, py, pz), spineQ, spineS);
        spineM.toArray(arr, i * 16);
      }
      spines.mesh.instanceMatrix.needsUpdate = true;
      // raycasts cull instances by this sphere (three computes it only once)
      spines.mesh.computeBoundingSphere();
    }
    for (const a of bodyAnchors) {
      const b = a.userData.body;
      placeOnBody(a, b.s, b.theta, b.lift);
    }
    if (prey) prey.squeeze(out.prey);
    if (clutch) clutch.pose(explode);
  }

  applyLayers();
  update(0, 0, { explode: 0 });

  // fit box over the whole loop (the strike reaches far beyond the t = 0 pose)
  const bounds = computeBounds();
  update(0, 0, { explode: 0 });

  function computeBounds() {
    // rest pose (t = 0) and the whole loop; poses with a far-reaching action
    // (the strike) only claim part of it (`fitReach`) so the plate stays large
    const rest = spineBox(0);
    const all = rest.clone();
    for (let i = 1; i < 25; i++) all.union(spineBox((i / 25) * FIGURE_DURATION));
    const reach = pose.fitReach ?? 1;
    const box = new THREE.Box3(rest.min.clone().lerp(all.min, reach), rest.max.clone().lerp(all.max, reach));
    for (const g of [water?.group, branch?.group, prey?.group, clutch?.group]) {
      if (!g || !g.parent) continue;
      g.updateMatrixWorld(true);
      const b = new THREE.Box3();
      g.traverse((o) => {
        if (!o.isMesh || o.userData.isOutline || o.userData.noFit) return;
        o.geometry.computeBoundingBox();
        b.union(o.geometry.boundingBox.clone().applyMatrix4(relativeMatrix(o, root)));
      });
      box.union(b);
    }
    box.min.y = Math.min(0, box.min.y);
    return { min: box.min.toArray(), max: box.max.toArray() };
  }

  function spineBox(t) {
    // the box needs the spine's samples and heights only: the pose alone,
    // as update() evaluates it, without sweeping the skin or placing the
    // head and props (a build poses 25 moments for it)
    out.reducedMotion = false;
    out.radius.fill(1);
    pose.evaluate(((t % FIGURE_DURATION) + FIGURE_DURATION) % FIGURE_DURATION, out);
    const pad = Math.max(rMax * 1.2, dims.W * 1.1);
    const b = new THREE.Box3();
    const v = new THREE.Vector3();
    for (let k = 0; k < K; k++) {
      v.set(spine.pos[k * 3], spine.pos[k * 3 + 1], spine.pos[k * 3 + 2]);
      const hy = (restH[k] * out.radius[k] || 0) * 1.1;
      b.expandByPoint(v.clone().set(v.x - pad, v.y - hy, v.z - pad));
      b.expandByPoint(v.clone().set(v.x + pad, v.y + hy, v.z + pad));
    }
    return b;
  }

  const title = `${spec.scientific} — ${POSE_TITLES[poseName] ?? poseName}`;
  return {
    root,
    title,
    duration: FIGURE_DURATION,
    layers,
    labels,
    parts,
    bounds,
    beats: pose.beats,
    species: spec,
    spine,
    update,
    setLayer(id, visible) {
      if (!(id in layerState)) return;
      // switching an inner layer off is a choice the dissection respects
      if (id in dissectable && layerState[id] && !visible) dissectable[id] = false;
      else if (id === 'skeleton' && visible) dissectable.skeleton = true;
      else if (id === 'venom' && visible) dissectable.venom = venomous;
      layerState[id] = visible;
      applyLayers();
    },
    setExplode(a) {
      explodeStored = Math.max(0, Math.min(1, a));
    },
    /**
     * Whether a layer is drawn now, which may differ from its switch: the
     * dissection shows the skeleton and venom apparatus while their switches
     * are off, and an x-rayed skin is a ghost, not shown. Undefined for layers
     * that simply follow their switch.
     * @param {string} id
     * @returns {boolean|undefined}
     */
    layerShown(id) {
      return id in shown ? shown[id] : undefined;
    },
    dispose() {
      root.removeFromParent();
      for (const d of disposables) d.dispose?.();
      root.traverse((o) => {
        if (o.userData?.isOutline) o.material?.dispose?.();
      });
    },
  };
}

/** Alias for other subjects that embed a snake (same signature as createFigure). */
export const createSnake = createFigure;

// ------------------------------------------------------------------ helpers

const UP = new THREE.Vector3(0, 1, 0);
/** Layers whose parts sit inside the skin (the dissection reveals them). */
const INNER_LAYERS = ['skeleton', 'venom'];

function anchorOn(obj, name, x = 0, y = 0, z = 0) {
  if (!obj) return null;
  const a = new THREE.Object3D();
  a.name = `anchor:${name}`;
  a.position.set(x, y, z);
  obj.add(a);
  return a;
}

function relativeMatrix(o, root) {
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  return new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Body radius as a fraction of the maximum, along the normalised length.
 * Slender neck behind the head, girth peaking at `maxAt`, tapering to the
 * vent, then a tail shaped by `tailTip`.
 */
function radiusProfile(spec, sn, headFrac) {
  const neckAt = headFrac * 1.15;
  const tailStart = 1 - spec.tail;
  if (sn <= neckAt) return spec.neck;
  if (sn < spec.maxAt) {
    const u = (sn - neckAt) / (spec.maxAt - neckAt);
    return spec.neck + (1 - spec.neck) * Math.sin((Math.PI / 2) * smooth(0, 1, u) ** 0.8);
  }
  if (sn < tailStart) {
    const u = (sn - spec.maxAt) / (tailStart - spec.maxAt);
    return 1 - (1 - spec.cloaca) * smooth(0, 1, u);
  }
  const u = Math.min(1, (sn - tailStart) / spec.tail);
  const c = spec.cloaca;
  switch (spec.tailTip) {
    case 'blunt':
      return c * Math.sqrt(Math.max(0, 1 - Math.pow(u, 3))) * (1 - 0.3 * u);
    case 'rattle':
      return c * (1 - 0.6 * Math.pow(u, 0.8));
    case 'paddle':
      return c;
    case 'spine':
      return c * Math.pow(1 - u, 0.8) * (1 - 0.1 * u) + 0.02 * (1 - u);
    default:
      return c * Math.pow(1 - u, 0.85);
  }
}

/**
 * Arc lengths of label anchors on a black, a yellow and a red ring, on
 * different, well-spaced ring periods of the trunk (mirrors the TSL pattern:
 * per period black 27 %, yellow 7.5 %, red, yellow 7.5 %). The anchors sit on
 * the dorsal midline (θ = 0), which faces the reader however the body bends,
 * on a scale whose centre lies inside the ring: the pattern snaps ring borders
 * to whole scales and a yellow ring is a single scale wide. The red anchor
 * keeps to its scale's front half (a red scale's hind tip is black); all stay
 * inside the unsnapped ring too.
 */
function micrurusRingCentres(spec, info) {
  const { headLen, sCloaca } = info;
  const s0 = headLen * 0.98;
  const P = (sCloaca - s0) / spec.rings.body;
  // dorsal scale length (patterns.js bodySkin); the dorsal row's scales are centred on (k + ½)·scale
  const scale = (sCloaca - headLen) / spec.scales.ventrals;
  const on = (period, from, to, front = 0) => {
    const lo = s0 + (Math.floor(spec.rings.body * period) + from) * P;
    const hi = lo + (to - from) * P;
    let c = (Math.round((lo + hi) / 2 / scale - 0.5) + 0.5) * scale;
    if (c < lo) c += scale;
    else if (c > hi) c -= scale;
    return Math.min(hi, Math.max(lo, c - front * scale));
  };
  return { black: on(0.3, 0, 0.27), yellow: on(0.5, 0.27, 0.345), red: on(0.72, 0.345, 0.925, 0.1) };
}
