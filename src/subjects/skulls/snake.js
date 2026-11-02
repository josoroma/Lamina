// Skull & snake: a closed path that leaves the left orbit, crosses the brow
// and the vault, passes behind the ear, runs below the cheekbone arch and
// across the cheek, and slips back into the socket — and the snake that
// travels it.
//
// The snake itself comes from the snakes subject (`createSnake` with pose
// 'follow-path'), face and all: slit-pupilled eyes with a catchlight under
// the supraocular ledge, the two spine-like superciliaries a side, loreal
// pits and nostrils (snakes/head.js, face.js). The path is ours, kept a
// body-radius off the bone by pushing it out along the skull's SDF. If the
// snakes module cannot build a snake, a minimal bead-chain snake (instanced
// spheres, no face) keeps the plate alive.
import * as THREE from 'three/webgpu';
import { gradient } from '../../kits/sdf/sdf.js';
import { humanSDF } from './human.js';

/** Control points (cm, skull frame) of the loop, starting inside the left orbit. */
const CONTROL = [
  [2.7, 1.55, 6.3], // deep in the left orbit
  [3.0, 2.3, 8.3], // leaving the socket
  [3.1, 4.35, 10.15], // over the brow
  [3.5, 7.6, 9.25], // up the forehead
  [5.1, 10.6, 4.4], // across the vault
  [7.0, 9.2, -1.6],
  [7.75, 5.6, -5.2], // over the parietal eminence
  [7.25, 1.6, -6.4], // behind the ear
  [6.75, -2.5, -3.6], // round the mastoid
  [7.05, -3.1, 1.2], // below the arch, outside the ramus
  [6.45, -2.85, 5.6], // below the cheekbone
  [5.25, -1.55, 8.55], // up across the cheek
  [4.15, 0.25, 8.85], // into the orbit at its lower-lateral corner
  [3.25, 0.95, 7.2],
];

/**
 * The snake's centre-line: a closed Catmull-Rom loop through CONTROL,
 * resampled and held `clearance` cm off the bone (cranium ∪ mandible).
 * @returns {number[][]} points (cm)
 */
export function snakePath(clearance = 0.95, samples = 96) {
  const { cranium, mandible } = humanSDF();
  const f = (x, y, z) => Math.min(cranium.f(x, y, z), mandible.f(x, y, z));
  const sdf = { f };
  const curve = new THREE.CatmullRomCurve3(CONTROL.map((p) => new THREE.Vector3(...p)), true, 'centripetal');
  const out = [];
  for (let i = 0; i < samples; i++) {
    const v = curve.getPointAt(i / samples);
    let p = [v.x, v.y, v.z];
    for (let k = 0; k < 12; k++) {
      const d = f(p[0], p[1], p[2]);
      if (d >= clearance) break;
      const g = gradient(sdf, p[0], p[1], p[2], 0.02);
      const step = clearance - d + 0.02;
      p = [p[0] + g[0] * step, p[1] + g[1] * step, p[2] + g[2] * step];
    }
    out.push(p);
  }
  // light smoothing after the push-out
  const sm = out.map((p, i) => {
    const a = out[(i + samples - 1) % samples], b = out[(i + 1) % samples];
    return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4, (a[2] + 2 * p[2] + b[2]) / 4];
  });
  return sm;
}

/**
 * The lesson's snake when the plate's params name none: a 52 cm golden
 * ("oropel") eyelash palm-pitviper. The construction panels (steps.js) draw
 * its head from the same species preset.
 */
export const SNAKE = { species: 'bothriechis-schlegelii', morph: 'oropel', length: 52 };

/**
 * Build the snake for the skull-and-snake lesson.
 * @param {object} params  lesson params ({ snake: { species, morph, length } })
 * @param {object} ctx     a lithograph FigureContext (the snake keeps its colours)
 * @returns {Promise<{ root: THREE.Object3D, update: Function, labels: Array, parts: Array, dispose: Function, path: number[][], source: string }>}
 */
export async function buildSnake(params, ctx) {
  const path = snakePath();
  const opts = params.snake ?? {};
  const species = opts.species ?? SNAKE.species;
  const length = opts.length ?? SNAKE.length;
  try {
    const mod = await import('../snakes/index.js');
    const make = mod.createSnake ?? mod.createFigure;
    const fig = await make({
      species, morph: opts.morph ?? SNAKE.morph, pose: 'follow-path', path, closed: true, loops: 1,
      length, wave: opts.wave ?? 0.35, props: false,
    }, ctx);
    if (!fig?.root || fig.title === 'Seed pod (demo)') throw new Error('snakes subject not ready');
    fig.root.name = 'snake';
    // the skull lesson exposes the snake as one layer, so it keeps what the
    // snake shows by default (its skeleton and venom layers stay off here)
    const shown = (layer) => !layer || (fig.layers ?? []).some((ly) => ly.id === layer && ly.visible !== false);
    return {
      root: fig.root,
      path,
      source: 'snakes',
      update: (t, dt, st) => fig.update?.(t, dt, st),
      // its labels, with their face marks (a ring round the eye or the pit, a
      // tick at the spines) and the mirror-side anchor the host may pick
      labels: (fig.labels ?? []).filter((l) => shown(l.layer)).map((l) => ({ ...l, layer: 'snake' })),
      // and its parts, each with its own named colours, so the SVG plate prints
      // the body's golden yellow, flecks and pale belly and the face — iris,
      // pupil and catchlight, pits, nostrils, tongue, spines — rather than one
      // flat snake (ids prefixed: they sit beside the bones)
      parts: (fig.parts ?? []).filter((p) => p.object && shown(p.layer)).map((p) => ({ ...p, id: `snake-${p.id}`, layer: 'snake' })),
      dispose: () => fig.dispose?.(),
    };
  } catch (err) {
    console.warn('[skulls] using the bead-chain snake:', err?.message ?? err);
    return beadSnake(ctx, path, length);
  }
}

/**
 * Fallback snake: a tapered chain of instanced beads gliding along the loop
 * (used when the snakes subject cannot build a follow-path snake).
 * @param {object} ctx FigureContext
 * @param {number[][]} path closed centre-line (cm)
 * @param {number} length body length (cm)
 */
export function beadSnake(ctx, path, length) {
  const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)), true, 'centripetal');
  const total = curve.getLength();
  const N = 90;
  const geo = new THREE.SphereGeometry(1, 14, 10);
  const mat = ctx.ink({ color: '#d9b23c', svgColor: '#d9b23c', roughness: 0.5, name: 'snake' });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.name = 'snake';
  mesh.frustumCulled = false;
  ctx.outline(mesh, { width: 0.8 });
  const head = new THREE.Object3D();
  mesh.add(head);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), tan = new THREE.Vector3();
  const Z = new THREE.Vector3(0, 0, 1);
  const update = (t) => {
    const u0 = (t / 5) % 1;
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1); // 0 head … 1 tail
      const u = (((u0 - (f * length) / total) % 1) + 1) % 1;
      curve.getPointAt(u, p);
      curve.getTangentAt(u, tan);
      q.setFromUnitVectors(Z, tan);
      const r = 0.62 * Math.min(1, 0.55 + f * 3) * (1 - Math.pow(f, 2.2) * 0.85);
      s.set(r, r * 0.9, r * 1.6);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      if (i === 0) head.position.copy(p);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return {
    root: mesh,
    path,
    source: 'beads',
    update,
    labels: [{ id: 'head', text: 'Head', detail: 'Eyelash palm-pitviper (Bothriechis nigroadspersus).', anchor: head, layer: 'snake' }],
    parts: [{ id: 'snake', name: 'Bothriechis nigroadspersus', object: mesh, color: '#d9b23c', layer: 'snake' }],
    dispose: () => {
      geo.dispose();
      mat.dispose();
      mesh.userData.outline?.material?.dispose?.();
    },
  };
}
