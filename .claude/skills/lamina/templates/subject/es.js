// Spanish for the figure strings of this subject (labels, details, layers and hints,
// part and colour names, beats). Keys are the exact English strings in the subject's
// code; values keep every {placeholder}. Strings built at run time ('Segment 3') go
// in PATTERNS ('Segment {n}', with a literal word of 3 or more letters).
//
// Starts with the seed pod of templates/subject/index.js, so a new subject is
// bilingual from its first render. Replace these as you replace the pod: the
// validator lists keys the figure no longer produces
// (node scripts/validate-books.mjs --lang es --runtime <audit --i18n --json output>).
export default {
  Pod: 'Vaina',
  'The protective fruit wall': 'La pared protectora del fruto',
  Seeds: 'Semillas',
  'X-ray the wall to see the seeds': 'Ver las semillas a través de la pared',
  Pericarp: 'Pericarpio',
  'The fruit wall that protects the seeds.': 'La pared del fruto, que protege las semillas.',
  Seed: 'Semilla',
  'Six seeds sit on a central axis.': 'Seis semillas se asientan sobre un eje central.',
  'Pod (left valve)': 'Vaina (valva izquierda)',
  'Pod (right valve)': 'Vaina (valva derecha)',
  Stalk: 'Pedúnculo',
};

export const PATTERNS = {
};
