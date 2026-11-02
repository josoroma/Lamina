// Species descriptors for the skull rig (which models, bones, hinge, how the
// bones explode, how sutures are grouped) and their label anchors.
//
// Why here: the rig is species-agnostic; everything that is anatomy — which
// bone a label belongs to, which way a bone flies in a Beauchene-style
// dissection — lives in one readable table per species.
import * as THREE from 'three/webgpu';
import { projectToSurface } from '../../kits/sdf/sdf.js';
import { HUMAN, HUMAN_BONES, humanSDF } from './human.js';
import { JAGUAR, JAGUAR_BONES, jaguarSDF } from './jaguar.js';

/** Explode vectors are scaled so a dissected skull still fits near its page. */
const EXPLODE = 0.72;
const dir = (x, y, z, k) => new THREE.Vector3(x, y, z).normalize().multiplyScalar(k * EXPLODE);

/** Human skull rig spec (see rig.js). */
export const HUMAN_SPEC = {
  species: 'human',
  set: 'skulls',
  models: { cranium: 'human-cranium', mandible: 'human-mandible', teeth: 'human-teeth', planes: 'human-planes' },
  bones: HUMAN_BONES.slice(0, 21),
  mandible: HUMAN_BONES[21],
  cells: { cranium: 0.14, mandible: 0.12, teeth: 0.06, planes: 0.8 },
  pivot: [0, HUMAN.condylion[1], HUMAN.condylion[2]],
  centre: [0, 1.05, 0.8],
  lines: ['centre', 'brow', 'eye', 'nose', 'temporalLine'],
  // the conchae are seen end-on through the aperture: horizontal slices, not target rings
  hatchDir: (id) => (id.startsWith('concha') ? [0, 1, 0] : null),
  toothHatch: { z0: 4.3, kx: 1.6, r: 4.5 },
  sutureClass(a, b) {
    const has = (p) => a.startsWith(p) || b.startsWith(p);
    if (has('frontal') && has('parietal')) return 'coronal';
    if (a.startsWith('parietal') && b.startsWith('parietal')) return 'sagittal';
    if (has('occipital') && has('parietal')) return 'lambdoid';
    if (has('temporal') && has('parietal')) return 'squamous';
    return 'other';
  },
  /** Beauchene-style dissection: every bone flies out along its own axis (cm). */
  explodeFor(id, c) {
    const s = id.endsWith('left') ? 1 : id.endsWith('right') ? -1 : 0;
    switch (id.replace(/-(left|right)$/, '')) {
      case 'frontal': return dir(0, 0.6, 0.8, 4.6);
      case 'parietal': return dir(s * 0.78, 0.62, -0.08, 4.6);
      case 'occipital': return dir(0, -0.12, -1, 4.6);
      case 'temporal': return dir(s, -0.12, -0.2, 5.2);
      case 'sphenoid': return dir(0, -0.55, 0.25, 2.6);
      case 'ethmoid': return dir(0, 0.25, 1, 2.6);
      case 'zygomatic': return dir(s * 0.85, -0.1, 0.5, 4.6);
      case 'maxilla': return dir(s * 0.36, -0.45, 0.82, 4.4);
      case 'nasal': return dir(s * 0.25, 0.45, 0.86, 5.2);
      case 'lacrimal': return dir(s * 0.62, 0.22, 0.75, 4.2);
      case 'palatine': return dir(s * 0.3, -0.9, 0.2, 3.4);
      case 'vomer': return dir(0, -0.7, 0.7, 3.0);
      case 'concha': return dir(s * 0.5, -0.3, 0.8, 4.4);
      case 'mandible': return dir(0, -0.85, 0.5, 4.6);
      default: return c.clone().normalize().multiplyScalar(3);
    }
  },
};

/**
 * Label anchors: [id, text, detail, owner, point(cm), project?, layer?]
 * owner: a bone id, 'mandible', a teeth quadrant id, or 'skull' (static).
 * project: 'cranium' | 'mandible' | null (use the point as is).
 */
export const HUMAN_LABELS = [
  ['frontal', 'Frontal bone', 'The forehead and the roofs of both orbits.', 'frontal', [0, 8.3, 9.6], 'cranium'],
  ['parietal', 'Parietal bone', 'Paired plates that make the roof and sides of the vault.', 'parietal-left', [6.2, 8.4, -2.0], 'cranium'],
  ['temporal', 'Temporal bone', 'Houses the ear and carries the jaw joint.', 'temporal-left', [6.9, 2.4, -1.2], 'cranium'],
  ['occipital', 'Occipital bone', 'Back and base of the skull, around the foramen magnum.', 'occipital', [0, 4.2, -9.6], 'cranium'],
  ['sphenoid', 'Sphenoid', 'A butterfly-shaped keystone bone; its greater wing shows at the temple.', 'sphenoid', [6.0, 1.9, 4.6], 'cranium'],
  ['zygomatic', 'Zygomatic bone', 'The cheekbone: lateral rim and part of the floor of the orbit.', 'zygomatic-left', [5.4, -0.7, 7.3], 'cranium'],
  ['maxilla', 'Maxilla', 'The upper jaw: holds the upper teeth and frames the nasal aperture.', 'maxilla-left', [2.7, -2.0, 10.2], 'cranium'],
  ['nasal', 'Nasal bones', 'Two small bones that form the bridge of the nose.', 'nasal-left', [0.35, 2.1, 10.6], 'cranium'],
  ['mandible', 'Mandible', 'The lower jaw — the only movable bone of the skull.', 'mandible', [3.9, -7.3, 6.8], 'mandible'],
  ['orbit', 'Orbit', 'Eye socket, about 4 cm wide and 3.4 cm high; seven bones meet in its walls.', 'skull', [3.15, 1.7, 7.4], null],
  ['nasal-aperture', 'Piriform aperture', 'The pear-shaped opening of the nasal cavity.', 'skull', [0.55, -1.2, 9.6], null],
  // on the zygomatic's half of the arch, ahead of the zygomaticotemporal seam
  // (z ≈ 3.6), so the dot stays on its bone when the bones part
  ['zygomatic-arch', 'Zygomatic arch', 'A bony bridge from cheek to temple; the masseter hangs from it.', 'zygomatic-left', [6.6, -0.5, 4.05], 'cranium'],
  // on the front of the process, below and behind the ear canal: its lateral
  // face is the skull's outline in the near-frontal views (the snake lesson,
  // the bones' turntable, the turn to profile), where a dot would sit on paper
  ['mastoid', 'Mastoid process', 'Behind the ear; anchors the sternocleidomastoid muscle.', 'temporal-left', [5.69, -1.78, -0.71], 'cranium'],
  // low on the front of the head, under the articular eminence: in view with
  // the jaw shut, and on the head, not its outline, when the jaw opens or
  // parts. The lateral pole is the outline from the front, and the top of
  // the head hides in its fossa a few millimetres behind the temporal bone,
  // too close for the host's occlusion test to hide its label.
  ['condyle', 'Condyle', 'Head of the mandible: hinges and glides in the jaw joint.', 'mandible', [5.52, -1.18, 1.66], 'mandible'],
  ['coronoid', 'Coronoid process', 'Thin blade of the mandible where the temporalis attaches.', 'mandible', [4.6, -1.3, 3.9], 'mandible'],
  // on the canine's labial face: well inside the teeth from the front, in
  // three-quarter and in profile (the central incisors' face is the
  // profile's edge, and a lateral incisor's crown is too narrow to hold a dot
  // off its own edge once the face turns)
  ['teeth', 'Teeth', 'Adults have 32: per quadrant 2 incisors, 1 canine, 2 premolars, 3 molars.', 'teeth-upper-left', [2.13, -4.36, 9.4], null, 'teeth'],
  ['coronal-suture', 'Coronal suture', 'Joins the frontal bone to both parietals across the crown.', 'frontal', [6.2, 9.0, 2.35], 'cranium', 'sutures'],
  ['sagittal-suture', 'Sagittal suture', 'Joins the two parietals along the midline.', 'parietal-left', [0.1, 12.2, -2.6], 'cranium', 'sutures'],
];

/** Jaguar skull rig spec. */
export const JAGUAR_SPEC = {
  species: 'jaguar',
  set: 'skulls',
  models: { cranium: 'jaguar-cranium', mandible: 'jaguar-mandible', teeth: 'jaguar-teeth', planes: 'jaguar-planes' },
  bones: JAGUAR_BONES.slice(0, -1),
  mandible: JAGUAR_BONES[JAGUAR_BONES.length - 1],
  cells: { cranium: 0.16, mandible: 0.13, teeth: 0.06, planes: 1.0 },
  pivot: [0, JAGUAR.condyle[1], JAGUAR.condyle[2]],
  centre: [0, 1.2, 0.5],
  lines: ['centre', 'crest'],
  sutureClass: () => 'other',
  explodeFor(id, c) {
    const s = id.endsWith('left') ? 1 : id.endsWith('right') ? -1 : 0;
    switch (id.replace(/-(left|right)$/, '')) {
      case 'frontal': return dir(0, 0.8, 0.5, 4.5);
      case 'parietal': return dir(s * 0.6, 0.8, -0.3, 4.5);
      case 'occipital': return dir(0, 0.1, -1, 5);
      case 'temporal': return dir(s, -0.2, -0.3, 5);
      case 'zygomatic': return dir(s, 0, 0.3, 5);
      case 'maxilla': return dir(s * 0.45, -0.2, 0.85, 4.5);
      case 'premaxilla': return dir(0, -0.2, 1, 5);
      case 'nasal': return dir(0, 0.6, 0.8, 5);
      // the base and its medial wall drop out below (its centroid lies far forward)
      case 'sphenoid': return dir(0, -0.95, 0.3, 4.2);
      case 'mandible': return dir(0, -0.9, 0.4, 5);
      default: return c.clone().normalize().multiplyScalar(3);
    }
  },
};

export const JAGUAR_LABELS = [
  ['sagittal-crest', 'Sagittal crest', 'A blade of bone along the midline; the temporalis muscles anchor here.', 'parietal-left', [0.1, 8.2, -6.5], 'cranium'],
  ['zygomatic-arch', 'Zygomatic arch', 'Flares wide to make room for huge jaw muscles.', 'zygomatic-left', [8.9, 0.6, 1.5], 'cranium'],
  ['canine', 'Canine', 'Dagger teeth, used to bite through skulls and turtle shells.', 'teeth-upper-left', [2.7, -4.3, 11.3], null, 'teeth'],
  ['carnassial', 'Carnassial (P4/m1)', 'Blade-like shearing teeth that slice meat like scissors.', 'teeth-upper-left', [4.55, -3.4, 6.6], null, 'teeth'],
  ['orbit', 'Orbit', 'Large, forward-facing sockets for binocular depth vision.', 'skull', [3.6, 2.6, 6.0], null],
  ['mandible', 'Mandible', 'A short, deep jaw whose hinge allows almost no sideways motion.', 'mandible', [4.6, -6.0, 6.0], 'mandible'],
];

/**
 * Create label anchor Object3Ds inside the rig (they follow explode and the jaw).
 * Paired structures are labelled on the side that faces the reader.
 * @param {object} rig
 * @param {'human'|'jaguar'} species
 * @param {{ side?: 'left'|'right', points?: Record<string, number[]> }} [o]
 *        points: a lesson's own point for a label (cm, authored on the left and
 *        projected like the table's), where its camera sees the structure from
 *        an angle that leaves the table's point on the outline or hidden
 * @returns {Array<{id,text,detail,anchor,layer?}>}
 */
export function placeLabels(rig, species, o = {}) {
  const table = species === 'jaguar' ? JAGUAR_LABELS : HUMAN_LABELS;
  const sdf = species === 'jaguar' ? jaguarSDF() : humanSDF();
  const right = o.side === 'right';
  const out = [];
  for (const [id, text, detail, owner0, point, project, layer] of table) {
    const p0 = o.points?.[id] ?? point;
    // tables are authored on the left (+x); mirror for the right side
    const p = right ? [-p0[0], p0[1], p0[2]] : p0;
    const owner = right ? owner0.replace(/-left$/, '-right') : owner0;
    let pos = p;
    if (project === 'cranium') pos = projectToSurface(sdf.cranium, p, 10);
    else if (project === 'mandible') pos = projectToSurface(sdf.mandible, p, 10);
    const anchor = new THREE.Object3D();
    anchor.name = `label:${id}`;
    anchor.position.set(pos[0], pos[1], pos[2]);
    let parent;
    if (owner === 'skull') parent = rig.group;
    else if (owner === 'mandible') parent = rig.mandible.inner;
    else parent = rig.bones.get(owner)?.inner ?? rig.teeth.get(owner)?.inner ?? rig.group;
    // every inner group shares the skull frame (jaw wrappers are offset by
    // −pivot inside the hinge), so anchors can be placed in skull cm directly
    parent.add(anchor);
    const label = { id, text, detail, anchor };
    if (layer) label.layer = layer;
    out.push(label);
  }
  return out;
}
