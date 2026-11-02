// Calaveras — skulls that perform drawing lessons (Figure contract, §5).
//
//   createFigure({ subject: 'human' | 'jaguar',
//                  lesson: 'frontal' | 'open-jaw' | 'profile' | 'bones' | 'jaguar' | 'skull-and-snake',
//                  quality?, tilt?, yaw?, snake?: { species, morph, length } }, ctx) → Figure
//   drawStep(g2d, params, step, box, theme)   2D construction steps 0–2 for the lesson verso
//
// The skull is an SDF model meshed in a worker (src/kits/sdf), split into its
// real bones so every bone can be coloured, labelled and exploded. Each
// lesson then performs its 5-second loop on that rig: construction lines
// drawn stroke by stroke, a faceted block-in, the engraved skull, a hinging
// jaw with its muscles, a turntable with a proportion grid, a Beauchene
// explosion, a jaguar's bite, a snake threading the orbit.
import * as THREE from 'three/webgpu';
import { FIGURE_DURATION } from '../../engine/figures/contract.js';
import { setFade } from '../../kits/ink/index.js';
import { deviceQuality } from '../../kits/sdf/index.js';
import { buildSkullRig, meshBox, TOOTH, IVORY } from './rig.js';
import { HUMAN_SPEC, JAGUAR_SPEC, placeLabels } from './species.js';
import { LESSONS, buildLesson, effectiveTime } from './lessons.js';
import { applyReveal, subContext } from './guides.js';
import { buildSnake } from './snake.js';

export { drawStep, STEP_TITLES } from './steps.js';
export { LESSONS };

const D2R = Math.PI / 180;
/** Seconds for a layer toggle to dissolve (matches the host's layer fade). */
const LAYER_FADE = 0.38;

/**
 * Build a skull lesson figure.
 * @param {object} [params]
 * @param {'human'|'jaguar'} [params.subject]
 * @param {string} [params.lesson]   frontal | open-jaw | profile | bones | jaguar | skull-and-snake
 * @param {string|number} [params.quality]  'low'|'medium'|'high'|'ultra' or a cell multiplier
 * @param {number} [params.tilt]     presentation tilt in degrees (negative tips the face up)
 * @param {number} [params.yaw]      presentation yaw in degrees
 * @param {{species?: string, morph?: string, length?: number}} [params.snake]
 * @param {boolean} [params.centre=true]  bias the fit box so the pop-up reads centred on the page
 * @param {object} ctx  FigureContext (src/kits/ink)
 * @returns {Promise<object>} Figure
 */
export async function createFigure(params = {}, ctx) {
  const lessonId = LESSONS[params.lesson] ? params.lesson : params.subject === 'jaguar' ? 'jaguar' : 'frontal';
  const L = LESSONS[lessonId];
  const species = (params.subject ?? L.subject) === 'jaguar' ? 'jaguar' : 'human';
  const base = species === 'jaguar' ? JAGUAR_SPEC : HUMAN_SPEC;
  // the host's default 'high' still yields to the device heuristic (phones → medium)
  const quality = params.quality ?? (ctx.quality === 'low' ? 'low' : deviceQuality());
  const spec = { ...base, models: { ...base.models, planes: lessonId === 'frontal' ? base.models.planes : null } };
  const snakeLesson = lessonId === 'skull-and-snake';

  const t0 = performance.now();
  const litCtx = subContext(ctx, { styleMix: 0 });
  const [rig, snake] = await Promise.all([
    buildSkullRig(spec, ctx, { quality }),
    snakeLesson ? buildSnake(params, litCtx) : Promise.resolve(null),
  ]);

  // ---- scene graph: root → present (tilt/yaw towards the reader) → turn (lesson turntable) → skull
  const root = new THREE.Group();
  root.name = `skull:${species}:${lessonId}`;
  const present = new THREE.Group();
  present.name = 'present';
  present.rotation.set((params.tilt ?? L.tilt) * D2R, (params.yaw ?? L.yaw) * D2R, 0, 'XYZ');
  const turn = new THREE.Group();
  turn.name = 'turn';
  root.add(present);
  present.add(turn);
  turn.add(rig.group);
  const guides = new THREE.Group();
  guides.name = 'construction';
  rig.group.add(guides);
  if (snake) rig.group.add(snake.root);

  // ---- reveal masks (composed with the host's layer dissolves)
  applyReveal(ctx, [...[...rig.bones.values()].map((b) => b.mesh), rig.mandible.mesh], rig.u.skull, 0);
  applyReveal(ctx, [...rig.teeth.values()].map((t) => t.mesh), rig.u.teeth, 1.7);
  if (rig.planes) applyReveal(ctx, [rig.planes], rig.u.planes, 7.3);
  applyReveal(ctx, rig.sutureLines.map((l) => l.object), rig.u.sutures, 3.1);

  // ---- lesson
  // the side of the skull that faces the reader (positive yaw and the profile turn show the right)
  const yaw = params.yaw ?? L.yaw;
  const side = yaw > 0 || lessonId === 'profile' ? 'right' : 'left';
  const lesson = buildLesson(lessonId, { rig, ctx, litCtx, guides, turn, present, params, side, snakePath: snake?.path });
  const layerObjects = {};
  if (lesson.muscles) layerObjects.muscles = [lesson.muscles.object];

  // ---- layers: eased weights (W) towards targets; host-managed for part layers
  const W = {}, target = {};
  for (const l of L.layers) W[l.id] = target[l.id] = l.visible ? 1 : 0;
  const layerIds = Object.keys(W);
  const hostManaged = new Set(snakeLesson ? ['skull', 'snake'] : []);
  let lastStyle = -1;
  const baseStyle = ctx.u.styleMix.value;
  /** Is the finished skull (engraved or colour-coded) shown, for layer weights w? */
  const finished = (w) => Math.max(w.engraving ?? 1, w.bones ?? 0) > 0.5;
  /**
   * The key pose's loop time: the finished skull, or, with Engraving and Bones
   * switched off and Planes kept, the frontal lesson's block-in, so an export
   * or a reduced-motion pause still lands on the form the page can show.
   */
  const keyTime = () =>
    (rig.planes && L.blockInTime != null && !finished(target) && (target.planes ?? 1) > 0.5 ? L.blockInTime : L.keyTime);

  // ---- labels & parts
  // The lesson's own labels come first: the reader ranks labels in figure
  // order after the "Look closer" ones and shows only 6–10, so on the open-jaw
  // plate Temporalis and Masseter (what that lesson adds) must not queue
  // behind the eighteen labels every human skull carries.
  const rigLabels = placeLabels(rig, species, { side, points: L.anchors });
  const labels = [...(lesson.labels ?? []), ...rigLabels, ...(snake?.labels ?? [])];
  if (snakeLesson) for (const l of labels) if (!l.layer) l.layer = 'skull';
  const parts = [];
  // every bone, the mandible included (it lives in the hinged jaw group);
  // its SVG fill follows what the page shows (paintBones): the atlas colour
  // with the Bones layer on, the engraving's ivory without it
  const boneParts = [];
  for (const [id, rec] of rig.bones) {
    const part = { id, name: rec.def.name, object: rec.wrapper, color: rec.def.color, explode: rig.explode.get(id), layer: snakeLesson ? 'skull' : undefined };
    parts.push(part);
    boneParts.push([part, rec.def.color]);
  }
  for (const [id, t] of rig.teeth) {
    // (the teeth layer is dissolved by our own reveal, not by the host)
    parts.push({ id, name: `Teeth (${t.jaw} ${t.side})`, object: t.wrapper, color: TOOTH, explode: rig.explode.get(id), layer: snakeLesson ? 'skull' : undefined });
  }
  // seams and temporal lines are inked on the bone: with the Skull layer off
  // they must dissolve and hide with it, not hang over the page as a wireframe
  if (snakeLesson) parts.push({ id: 'sutures', name: 'Sutures', object: rig.sutures, color: ctx.palette?.ink ?? '#1c1a17', layer: 'skull' });
  if (snake) parts.push(...snake.parts);

  let coded = null;
  /** Part colours (SVG export fills) for the colour-coded (c ≥ ½) or ivory skull. */
  function paintBones(c) {
    const on = c >= 0.5;
    if (on === coded) return;
    coded = on;
    for (const [part, atlas] of boneParts) part.color = on ? atlas : IVORY;
  }
  paintBones(W.bones ?? 0);

  const state = { explode: 0 };
  const animState = { explode: 0, playing: true, reducedMotion: false, fit: false };
  const applied = {};

  const fadeLayers = Object.entries(layerObjects);
  /** Push layer weights to objects the figure fades itself (only when they change). */
  function applyLayerObjects() {
    for (const [id, objs] of fadeLayers) {
      const w = W[id] ?? 1;
      if (applied[id] === w) continue;
      applied[id] = w;
      for (const o of objs) {
        o.visible = w > 0.002;
        setFade(o, w);
      }
    }
    if (snake) snake.root.visible = target.snake > 0;
    if (snakeLesson && applied.skull !== target.skull) {
      applied.skull = target.skull;
      for (const p of parts) if (p.layer === 'skull') p.object.visible = target.skull > 0;
    }
  }

  // cavity labels (orbit, piriform aperture) hang on the skull frame itself:
  // a socket is a space between bones, not a bone that could carry them
  const cavityLabels = new Set(rigLabels.filter((l) => l.anchor.parent === rig.group));

  /**
   * A label names what is drawn: rig labels hide while their structure is
   * dissolved by the lesson (the frontal loop's bare construction ball, the
   * bones lesson's parted sutures). Only the bare anchors are toggled — the
   * host's isShown() and the exporter both honour them — never the meshes,
   * which stay pickable and exportable. The faceted block-in is skipped
   * entirely while its reveal is zero.
   *
   * Parting the bones (the reader's Explode, the bones lesson's own loop)
   * splits the two kinds: a bone label rides on its bone, so it holds for the
   * engraved skull but not for the block-in, which never comes apart; a
   * cavity label is the reverse — on the bones a socket exists only while its
   * walls meet, so it fades with the sutures (gone a sixth of the way apart).
   */
  function gateLabels() {
    const skull = rig.u.skull.value, planes = rig.u.planes.value;
    const together = Math.max(0, 1 - rig.apart * 3);
    for (const l of rigLabels) {
      let v;
      if (l.layer === 'sutures') v = rig.u.sutures.value;
      else if (l.layer === 'teeth') v = rig.u.teeth.value;
      else if (cavityLabels.has(l)) v = Math.max(planes, skull * together);
      else v = Math.max(skull, planes * together);
      l.anchor.visible = v > 0.5;
    }
    if (rig.planes) rig.planes.visible = planes > 0;
  }

  function update(t, dt = 0, st = {}) {
    // ease layer weights (instant on the host's fit pass and under reduced motion)
    const k = dt <= 0 || st.reducedMotion ? 1 : Math.min(1, dt / LAYER_FADE);
    for (const id of layerIds) {
      if (hostManaged.has(id)) {
        W[id] = target[id];
        continue;
      }
      const d = target[id] - W[id];
      W[id] = Math.abs(d) <= k ? target[id] : W[id] + Math.sign(d) * k;
    }
    // colour (bones layer) ↔ engraving
    if ('bones' in W) {
      const c = W.bones * W.bones * (3 - 2 * W.bones);
      rig.u.colour.value = c;
      paintBones(c);
      const style = baseStyle * (1 - c);
      if (Math.abs(style - lastStyle) > 1e-4) {
        ctx.u.styleMix.value = style;
        lastStyle = style;
      }
    }
    // the block-in is a passing drawing stage, left out of the SVG plate while
    // the finished skull is on; with Engraving and Bones off it is the form
    // the page shows, so it is exported (and keyTime() then poses it)
    if (rig.planes) rig.planes.userData.export = finished(W) ? 'skip' : undefined;
    const te = effectiveTime(L, t, st, keyTime());
    // reveals start each frame from "shown": lessons that never write one
    // (open-jaw and jaguar leave the sutures alone) must not inherit the last
    // frame's value, or the explode fade below compounds frame after frame
    rig.u.skull.value = 1;
    rig.u.sutures.value = 1;
    const userExplode = st.explode ?? state.explode;
    animState.explode = userExplode;
    animState.playing = st.playing ?? true;
    animState.reducedMotion = !!st.reducedMotion;
    animState.fit = false;
    // the bones part with the reader's Explode (the bones lesson adds its loop)
    rig.apart = userExplode;
    lesson.animate(te, W, animState);
    rig.u.teeth.value = rig.u.skull.value * (W.teeth ?? 1);
    // sutures are seams between bones: they lift away as soon as bones part
    rig.u.sutures.value *= Math.max(0, 1 - userExplode * 3);
    gateLabels();
    applyLayerObjects();
    if (snake) snake.update(te, dt, st);
  }

  // ---- fit box: union over the loop (explode 0) so turntables and gapes stay on the page
  const box = new THREE.Box3();
  const allOn = Object.fromEntries(layerIds.map((id) => [id, 1]));
  // ... and the box the loop really sweeps, which also holds the bones
  // lesson's own explosion (left out of the fit so the assembled skull stays large)
  const sweep = new THREE.Box3();
  for (let i = 0; i < 10; i++) {
    lesson.animate(i * 0.5, allOn, { explode: 0, fit: true });
    if (snake) snake.update(i * 0.5, 0, {});
    meshBox(root, box);
    if (lessonId === 'bones') {
      lesson.animate(i * 0.5, allOn, { explode: 0 });
      meshBox(root, sweep);
    }
  }
  sweep.union(box);
  update(0, 0, {});
  // A tall pop-up seen from the reader's camera (≈ 57° up) projects towards
  // the head of the page; biasing the fit box towards the head moves the
  // footprint towards the tail so the skull reads centred (scale unchanged).
  // The biased box is no outline of the drawing, so `loopBounds` gives the
  // true one (a host keeps label pills off it).
  const shift = params.centre === false ? 0 : 0.22 * (box.max.y - box.min.y);
  const bounds = { min: [box.min.x, box.min.y, box.min.z - shift], max: [box.max.x, box.max.y, box.max.z - shift] };
  const loopBounds = { min: sweep.min.toArray(), max: sweep.max.toArray() };

  const stats = { ...rig.stats, totalMs: +(performance.now() - t0).toFixed(1), quality, snake: snake?.source ?? null };
  console.info(`[skulls] ${species}/${lessonId} ready in ${stats.totalMs} ms (meshing ${rig.stats.meshMs} ms, quality ${quality})`);

  return {
    root,
    title: L.title,
    duration: FIGURE_DURATION,
    layers: L.layers.map((l) => ({ ...l })),
    labels,
    parts,
    beats: L.beats.map((b) => ({ ...b })),
    bounds,
    // what the loop draws (cm, root frame): `bounds` unbiased, the bones' own
    // explosion included — the reader's label keep-out rect
    loopBounds,
    stats,
    lesson: lessonId,
    // the pose that shows the lesson's finished form: the SVG exporter uses it
    // when the current loop time shows only construction lines (no loop scan)
    get keyTime() {
      return keyTime();
    },
    update,
    setLayer(id, visible) {
      if (!(id in target)) return;
      target[id] = visible ? 1 : 0;
      if (hostManaged.has(id)) W[id] = target[id];
      applyLayerObjects();
    },
    setExplode(a) {
      state.explode = a;
    },
    dispose() {
      lesson.dispose();
      snake?.dispose();
      rig.dispose();
    },
  };
}
