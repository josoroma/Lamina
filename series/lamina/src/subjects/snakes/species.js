// Species presets for the snakes of Costa Rica ("Serpientes").
//
// One table drives every snake: body proportions (real scale, cm), the
// cross-section, head shape, scale counts, dentition, colours and the default
// pose. Proportions and counts are conservative mid-range values from the
// standard references (Savage 2002, The Amphibians and Reptiles of Costa
// Rica; Campbell & Lamar 2004; The Reptile Database). Counts are used to
// space scales and vertebrae — the plate never prints them as precise facts.
//
// Length fields:
//   length   total length of the depicted adult (cm)
//   tail     tail (vent → tip) as a fraction of total length
//   girth    maximum body diameter as a fraction of total length
//   neck     neck radius / maximum radius;   maxAt  where the girth peaks (0…1)
//   cloaca   radius at the vent / maximum radius
//   head.length is a fraction of total length; head.width/height are
//   fractions of head length.

/** @typedef {'pitviper'|'elapid'|'seasnake'|'boa'} SnakeKind */

export const SPECIES = {
  'bothrops-asper': {
    id: 'bothrops-asper',
    scientific: 'Bothrops asper',
    common: 'Terciopelo',
    english: 'Fer-de-lance',
    family: 'Viperidae · Crotalinae',
    kind: 'pitviper',
    pose: 'strike',
    length: 150,
    tail: 0.13,
    girth: 0.036,
    neck: 0.4,
    maxAt: 0.44,
    cloaca: 0.56,
    tailTip: 'point',
    section: { width: 1.1, top: 0.92, bottom: 0.64, pTop: 2.35, pBottom: 3.0 },
    // flat crown with a sharp canthus; the eye high under the supraocular
    // (P2: crown ≈ 0.27 Lh at the eye, eye centre 0.61 Lh from the back)
    head: { length: 0.042, width: 0.74, height: 0.29, jaw: 0.17, shape: 'lance', snout: 0.42, canthus: 6, brow: { out: 0.45, up: 0.1, len: 1.2 } },
    eye: { size: 0.074, pupil: 'slit', iris: '#b49b58', at: 0.62, height: 0.63, top: 'canthus', embed: 0.35, look: [0.25, 0.12], pupilW: 0.18 },
    face: {
      // brown crown, yellow-ochre face, yellow lips and chin (barba amarilla);
      // olive-bronze iris with fine dark reticulation (P1–P3)
      colors: {
        crown: '#5e4e34', face: '#b9a058', labials: '#d6bd62', chin: '#e9d47c', canthal: '#cdb46a',
        stripe: '#33261a', suture: '#6e5a2c', iris: '#7a6a3c', irisDark: '#3a3018', limbal: '#2e2615',
        pitInner: '#1a0f0a', pitRim: '#e8d78e', nostrilRim: '#e8d78e', tongue: '#5a3424',
      },
      reticulation: 0.25,
      // pit halfway between eye and nostril, on the 2nd supralabial (Reptile Database); ×1.4
      pit: { ahead: 0.145, below: 0.085, len: 0.05, ht: 0.036, depth: 0.02, turn: 0.58 },
      nostril: { x: 0.93, below: 0.07, len: 0.03, ht: 0.022 },
      // 7–8 supralabials, 8–12 infralabials (Reptile Database)
      labials: { upper: { n: 7, x0: 0.12, x1: 0.97, hFront: 0.085, hBack: 0.07 }, lower: { n: 10, x0: 0.12, x1: 0.9, hFront: 0.06, hBack: 0.05 } },
      scales: { cell: 0.032, keel: 0 },
    },
    scales: { rows: 25, ventrals: 200, subcaudals: 60, keeled: 1 },
    fangs: 'solenoglyph',
    pits: true,
    pattern: 'asper',
    colors: {
      ground: '#7b6e4e', groundAlt: '#6a5f45', dark: '#2d271e', darkCore: '#3f3528', edge: '#d3c494',
      venter: '#e4d9ae', venterSpot: '#8f876f', chin: '#e9d47c', headTop: '#665a42', stripe: '#2a241b',
      mouth: '#e9b7ae',
    },
  },
  'bothriechis-schlegelii': {
    id: 'bothriechis-schlegelii',
    // Costa Rican eyelash pitvipers outside the southern Pacific slope are
    // B. nigroadspersus (Arteaga et al. 2024); the id keeps the historical name.
    scientific: 'Bothriechis nigroadspersus',
    common: 'Bocaracá',
    english: 'Eyelash viper',
    family: 'Viperidae · Crotalinae',
    kind: 'pitviper',
    pose: 'branch',
    length: 65,
    tail: 0.16,
    girth: 0.034,
    neck: 0.38,
    maxAt: 0.46,
    cloaca: 0.52,
    tailTip: 'point',
    section: { width: 1.04, top: 1.0, bottom: 0.68, pTop: 2.2, pBottom: 2.8 },
    // holotype: head 6.5 % of SVL (5.4 % of the length with this tail), its
    // width 82.9 % of its length; a flat, snub-nosed head (Arteaga et al. 2024; ICP)
    head: { length: 0.054, width: 0.82, height: 0.34, jaw: 0.17, shape: 'broad', snout: 0.4, canthus: 6, brow: { out: 0.35, up: 0.1, len: 1.2 } },
    eye: { size: 0.092, pupil: 'slit', iris: '#cdb94a', at: 0.58, height: 0.6, top: 'canthus', embed: 0.35, look: [0.25, 0.12], pupilW: 0.18 },
    face: {
      // "iris pale straw yellow to golden with black reticulations or spots"
      // — a trait of the species, not of a morph (Arteaga et al. 2024)
      colors: { suture: '#a87410', iris: '#d9c690', irisDark: '#2a2218', limbal: '#5a4a2a', tongue: '#1f1b22' },
      morphs: {
        oropel: { labials: '#efc040', chin: '#ecc54e', pitInner: '#3a1a0c', pitRim: '#f0c64a', nostrilRim: '#f0c64a', spine: '#f0c64a' },
        green: { labials: '#a3b75c', chin: '#a8b960', suture: '#3d5220', pitInner: '#2a1a0c', pitRim: '#b9c97a', nostrilRim: '#b9c97a', spine: '#87a24b' },
      },
      reticulation: 0.2,
      // two spine-like superciliaries a side (P4 heights ×1.25), the rear taller:
      // flattened cones, so they still show (and print) seen from the front
      spines: { list: [[-0.055, 0.1, 0.25], [0.035, 0.08, 0.05]], base: 0.045, thick: 0.03, lateral: 0.45 },
      // a large pit, about half the eye across, lined dark red (P4)
      pit: { ahead: 0.15, below: 0.08, len: 0.075, ht: 0.055, depth: 0.025, turn: 0.58 },
      nostril: { x: 0.93, below: 0.05, len: 0.03, ht: 0.022 },
      // holotype: 9 supralabials, 12 infralabials; keeled crown scales
      labials: { upper: { n: 9, x0: 0.1, x1: 0.97, hFront: 0.08, hBack: 0.065 }, lower: { n: 12, x0: 0.1, x1: 0.9, hFront: 0.055, hBack: 0.05 } },
      scales: { cell: 0.04, keel: 1 },
    },
    scales: { rows: 21, ventrals: 150, subcaudals: 55, keeled: 1.2 },
    fangs: 'solenoglyph',
    pits: true,
    eyelash: true,
    pattern: 'schlegelii',
    morphs: {
      oropel: {
        ground: '#e3ad1e', groundAlt: '#f0c64a', fleckDark: '#3a2911', fleckLight: '#fff3d2',
        venter: '#f1d266', headTop: '#e2aa1c', iris: '#d9c552', mouth: '#efc0b2',
      },
      green: {
        ground: '#6c8a39', groundAlt: '#87a24b', fleckDark: '#2b3919', fleckLight: '#cdb35c',
        venter: '#c6cb7a', headTop: '#647f35', iris: '#a7b64e', mouth: '#e9bdb0',
      },
    },
  },
  'micrurus-nigrocinctus': {
    id: 'micrurus-nigrocinctus',
    scientific: 'Micrurus nigrocinctus',
    common: 'Coral',
    english: 'Central American coral snake',
    family: 'Elapidae',
    kind: 'elapid',
    pose: 'slither',
    length: 70,
    tail: 0.1,
    girth: 0.021,
    // head not distinct from the neck: its half-width and crown just cover
    // the neck's radius (0.72 · 0.735 cm), so there is no collar step
    neck: 0.72,
    maxAt: 0.5,
    cloaca: 0.82,
    tailTip: 'blunt',
    section: { width: 1.0, top: 1.0, bottom: 0.82, pTop: 2.05, pBottom: 2.8 },
    head: { length: 0.027, width: 0.6, height: 0.38, jaw: 0.2, shape: 'elapid', snout: 0.62 },
    // "ojos relativamente pequeños" (ICP), already ×1.5 here; round pupil; a
    // black bead that reads by its highlight
    eye: { size: 0.075, pupil: 'round', iris: '#1b1917', at: 0.68, height: 0.56, embed: 0.4, look: [0.25, 0.12], glint: 0.28 },
    face: {
      // glossy head shields (schematic: counts unverified for this species)
      colors: { iris: '#1b1917', irisDark: '#0e0d0c', limbal: '#0e0d0c', suture: '#4a4846', sutureYellow: '#b9982e', nostrilRim: '#4a4846', tongue: '#1f1b22' },
      reticulation: 0,
      nostril: { x: 0.93, y: 0.52, len: 0.03, ht: 0.02 },
      labials: { upper: { n: 7, x0: 0.3, x1: 0.97, hFront: 0.09, hBack: 0.1 }, lower: { n: 7, x0: 0.3, x1: 0.9, hFront: 0.06, hBack: 0.06 } },
    },
    scales: { rows: 15, ventrals: 200, subcaudals: 45, keeled: 0 },
    fangs: 'proteroglyph',
    pits: false,
    pattern: 'micrurus',
    rings: { body: 15, tail: 4 },
    colors: {
      red: '#c4311e', yellow: '#efce4a', black: '#151311', venter: '#c4311e', mouth: '#e8b3aa',
    },
  },
  'crotalus-simus': {
    id: 'crotalus-simus',
    scientific: 'Crotalus simus',
    common: 'Cascabel',
    english: 'Central American rattlesnake',
    family: 'Viperidae · Crotalinae',
    kind: 'pitviper',
    pose: 'rattle',
    length: 140,
    tail: 0.075,
    girth: 0.042,
    neck: 0.4,
    maxAt: 0.46,
    cloaca: 0.62,
    tailTip: 'rattle',
    section: { width: 1.12, top: 0.92, bottom: 0.62, pTop: 2.35, pBottom: 3.1 },
    head: { length: 0.04, width: 0.8, height: 0.3, jaw: 0.17, shape: 'broad', snout: 0.44, canthus: 6, brow: { out: 0.45, up: 0.1, len: 1.2 } },
    eye: { size: 0.07, pupil: 'slit', iris: '#b88f55', at: 0.65, height: 0.62, top: 'canthus', embed: 0.35, look: [0.25, 0.12], pupilW: 0.2 },
    face: {
      // pale-edged plates on the snout and over each eye, small scales between
      // them, a dark postocular band bordered in cream, cream lips (C. durissus,
      // P9; Crotalus: mostly small head scales). The bronze iris stays clear of
      // the skin's browns.
      colors: {
        labials: '#e2d3a4', plate: '#e2d3a4', stripe: '#2b2018', suture: '#6b5a40', iris: '#b88f55', irisDark: '#3a2a1a',
        limbal: '#2e2215', pitInner: '#1a120c', pitRim: '#e2d3a4', nostrilRim: '#e2d3a4', tongue: '#1f1b22',
      },
      reticulation: 0.3,
      pit: { ahead: 0.14, below: 0.085, len: 0.065, ht: 0.05, depth: 0.022, turn: 0.58 },
      nostril: { x: 0.95, below: 0.05, len: 0.035, ht: 0.015 },
      labials: { upper: { n: 13, x0: 0.12, x1: 0.97, hFront: 0.08, hBack: 0.065 }, lower: { n: 12, x0: 0.12, x1: 0.9, hFront: 0.055, hBack: 0.05 } },
      scales: { cell: 0.03, keel: 0 },
    },
    scales: { rows: 27, ventrals: 175, subcaudals: 27, keeled: 1.1 },
    fangs: 'solenoglyph',
    pits: true,
    rattle: { segments: 7 },
    pattern: 'crotalus',
    colors: {
      ground: '#8b7050', groundAlt: '#7a6045', dark: '#30231a', darkCore: '#5b4531', edge: '#e2d3a4',
      stripe: '#2b2018', tail: '#3c3631', venter: '#e3d7ab', headTop: '#7d6448', mouth: '#e7b6ab',
      rattle: '#b9a27e', rattleDark: '#6f5d48',
    },
  },
  'lachesis-stenophrys': {
    id: 'lachesis-stenophrys',
    scientific: 'Lachesis stenophrys',
    common: 'Matabuey',
    english: 'Central American bushmaster',
    family: 'Viperidae · Crotalinae',
    kind: 'pitviper',
    pose: 'ambush',
    length: 200,
    tail: 0.12,
    girth: 0.032,
    neck: 0.42,
    maxAt: 0.45,
    cloaca: 0.56,
    tailTip: 'spine',
    section: { width: 1.06, top: 1.0, bottom: 0.64, pTop: 2.0, pBottom: 3.0 },
    // "snout broadly rounded", no canthus, narrow supraoculars ("stenophrys",
    // narrow brow); the eye high on the side (P5)
    head: { length: 0.036, width: 0.7, height: 0.32, jaw: 0.17, shape: 'bushmaster', snout: 0.52, brow: { out: 0.15, up: 0.05, len: 1.0 } },
    eye: { size: 0.064, pupil: 'slit', iris: '#b58f62', at: 0.66, height: 0.59, top: 'canthus', embed: 0.35, look: [0.25, 0.12], pupilW: 0.18 },
    face: {
      // tan crown of very small granules; a black postocular stripe with a thin
      // pale line above; pale lips, the 3rd supralabial very large (P5; Lachesis).
      // The iris colour is not sourced (kept from the plate; it reads by its rim).
      colors: {
        labials: '#eadccb', chin: '#eee4cc', stripe: '#1f1611', stripeEdge: '#e6d2b0', suture: '#a38a6e', iris: '#b58f62',
        irisDark: '#4a3424', limbal: '#33241a', pitInner: '#1a120c', pitRim: '#eadccb', nostrilRim: '#eadccb', tongue: '#1f1b22',
      },
      reticulation: 0.3,
      pit: { ahead: 0.12, below: 0.1, len: 0.06, ht: 0.045, depth: 0.022, turn: 0.58 },
      nostril: { x: 0.93, below: 0.06, len: 0.03, ht: 0.022 },
      labials: { upper: { n: 9, x0: 0.12, x1: 0.97, hFront: 0.075, hBack: 0.065, big: true }, lower: { n: 11, x0: 0.12, x1: 0.9, hFront: 0.055, hBack: 0.05 } },
      scales: { cell: 0.025, keel: 0 },
    },
    scales: { rows: 35, ventrals: 215, subcaudals: 42, keeled: 1.7 },
    fangs: 'solenoglyph',
    pits: true,
    oviparous: true,
    pattern: 'lachesis',
    colors: {
      ground: '#bf9f7e', groundAlt: '#a88a6b', dark: '#2a1e16', spot: '#d4b896', venter: '#eee4cc',
      stripe: '#2a1d15', headTop: '#b88e69', mouth: '#ebbcb0', egg: '#f0eadb',
    },
  },
  'hydrophis-platurus': {
    id: 'hydrophis-platurus',
    scientific: 'Hydrophis platurus',
    common: 'Serpiente marina',
    english: 'Yellow-bellied sea snake',
    family: 'Elapidae · Hydrophiinae',
    kind: 'seasnake',
    pose: 'swim',
    length: 75,
    tail: 0.12,
    girth: 0.028,
    neck: 0.56,
    maxAt: 0.62,
    cloaca: 0.96,
    tailTip: 'paddle',
    section: { width: 0.72, top: 1.04, bottom: 1.05, pTop: 2.1, pBottom: 1.7, keel: 0.12 },
    paddle: { width: 0.34, top: 1.0, bottom: 1.0, pTop: 3.2, pBottom: 3.2 },
    head: { length: 0.035, width: 0.46, height: 0.34, jaw: 0.17, shape: 'sea', snout: 0.5 },
    // a small elapid eye (≈ 0.16 of the head's width, Huang et al. 2022) ×1.5
    eye: { size: 0.059, pupil: 'round', iris: '#2b2a26', at: 0.66, height: 0.6, embed: 0.4, look: [0.25, 0.12], glint: 0.28 },
    face: {
      // entire shields; the nasals meet on the midline (no internasals);
      // nostrils on top of the snout; 7–8 upper labials (Leviton et al. 2003)
      // the nostrils' rim is a legibility device on the black crown (§3.7),
      // grey enough to show the openings in inspect and close-up
      colors: { iris: '#2b2a26', irisDark: '#151513', limbal: '#151513', suture: '#2a2a28', sutureYellow: '#b89a2a', nostrilRim: '#8a887c', tongue: '#1f1b22' },
      reticulation: 0,
      nostril: { x: 0.925, z: 0.16, len: 0.035, ht: 0.015, dorsal: true },
      labials: { upper: { n: 8, x0: 0.16, x1: 0.97, hFront: 0.07, hBack: 0.06 }, lower: { n: 9, x0: 0.16, x1: 0.9, hFront: 0.05, hBack: 0.05 } },
    },
    scales: { rows: 47, ventrals: 180, subcaudals: 40, keeled: 0, juxtaposed: true },
    fangs: 'proteroglyph',
    pits: false,
    dorsalNostrils: true,
    pattern: 'hydrophis',
    colors: { dorsum: '#141412', venter: '#f1c534', headTop: '#141412', mouth: '#e6b2a8' },
  },
  'boa-imperator': {
    id: 'boa-imperator',
    scientific: 'Boa imperator',
    common: 'Béquer',
    english: 'Central American boa',
    family: 'Boidae',
    kind: 'boa',
    pose: 'constrict',
    length: 200,
    tail: 0.11,
    girth: 0.042,
    neck: 0.42,
    maxAt: 0.5,
    cloaca: 0.6,
    tailTip: 'point',
    section: { width: 1.04, top: 1.0, bottom: 0.72, pTop: 2.15, pBottom: 2.9 },
    head: { length: 0.036, width: 0.56, height: 0.34, jaw: 0.18, shape: 'boa', snout: 0.58 },
    // visible eye ≈ 0.11 Lh on P7 (oblique, ±15 %), here ×1.1; vertical pupil
    eye: { size: 0.066, pupil: 'slit', iris: '#ab9d80', at: 0.62, height: 0.56, embed: 0.38, look: [0.25, 0.12], pupilW: 0.15 },
    face: {
      // grey crown of small granules, cream lips; three dark stripes from the
      // snout: one down the crown, one each side through the eye to the jaw
      // angle, black behind the eye with a pale border below; a dark bar under
      // the eye; dark marks on the hind labials; the iris pale above, dark
      // where the stripe crosses it (Duque-Torres et al. 2024; ADW; FLMNH;
      // ICP; P7). Colours from research-boa-rat.md §2.4 as reviewed.
      colors: {
        crown: '#b9b3a6', labials: '#e3dccb', chin: '#e3dccb', stripe: '#211915', crownStripe: '#4a3426', suture: '#9a9182',
        iris: '#c8b8a0', irisDark: '#5a4a3a', limbal: '#4a3d30', nostrilRim: '#e3dccb', tongue: '#2b2b30',
      },
      reticulation: 0.15,
      nostril: { x: 0.94, y: 0.6, len: 0.03, ht: 0.022 },
      labials: { upper: { n: 18, x0: 0.14, x1: 0.97, hFront: 0.07, hBack: 0.06 }, lower: { n: 20, x0: 0.14, x1: 0.9, hFront: 0.05, hBack: 0.045 } },
      scales: { cell: 0.025, keel: 0 },
    },
    scales: { rows: 69, ventrals: 240, subcaudals: 55, keeled: 0 },
    fangs: 'none',
    pits: false,
    spurs: true,
    pattern: 'boa',
    // body: the silvery grey Costa Rican lowland form (Solórzano & Sasa 2024,
    // Figs 1–2), darkening behind: grey-beige ground turning grey-brown,
    // blackish saddle rims round dark-brown interiors with rust scales, and
    // blackish-brown tail saddles on cream gaps (not a brick-red tail)
    colors: {
      ground: '#b3afa4', groundAlt: '#8c7f72', saddle: '#1f1814', saddleCore: '#45342a', rust: '#7b4b32',
      saddleTail: '#33261f', edge: '#d9cfb8', ocellus: '#cdc3ad', fleck: '#3a2e26',
      lateral: '#3a2c24', venter: '#e2dccd', venterSpot: '#35302b', mouth: '#e8b8ae',
    },
  },
};

/** Poses every species understands; each species also has a default `pose`. */
export const POSES = ['strike', 'branch', 'slither', 'rattle', 'ambush', 'swim', 'constrict', 'follow-path'];

/**
 * Resolve a species preset (with morph colours applied).
 * @param {string} id
 * @param {string} [morph]
 */
export function resolveSpecies(id = 'bothrops-asper', morph) {
  const base = SPECIES[id];
  if (!base) throw new Error(`Unknown snake species "${id}". Known: ${Object.keys(SPECIES).join(', ')}`);
  if (!base.morphs) return base;
  const m = morph && base.morphs[morph] ? morph : Object.keys(base.morphs)[0];
  return { ...base, morph: m, colors: base.morphs[m] };
}
