// Compact English hyphenation for the page typesetter.
//
// Full Liang pattern sets are ~30 KB; a book page only needs a few *good*
// break opportunities per paragraph so the line breaker can keep word spaces
// even. This module finds conservative syllable breaks with a weighted
// confidence (penalty): morphological breaks (prefix, suffix, doubled
// consonants, VC-CV clusters) are cheap, risky V-CV breaks are expensive, so
// the Knuth–Plass breaker only uses them when nothing better exists.
// Author-supplied soft hyphens (U+00AD) always win over the heuristic.
// Spanish has rules rather than guesses (syllables are regular): hyphen-es.js.
import { hyphenateEs } from './hyphen-es.js';

const LEFT_MIN = 2;
const RIGHT_MIN = 3;
const MIN_WORD = 6;

/** Penalties (TeX's \hyphenpenalty is 50). */
export const HYPHEN_PENALTY = { good: 45, fair: 70, risky: 260 };

// Domain words (natural history, anatomy, drawing) that the heuristic would
// get wrong or that deserve dictionary-quality breaks. Hyphenated form.
const EXCEPTIONS = buildExceptions(`
an-i-mal an-i-mals ven-om ven-oms ven-om-ous ev-ery dif-fer-ent dif-fer-ence an-oth-er
for-est for-ests rain-for-est rain-for-ests flow-er flow-ers flow-er-ing trop-i-cal
moun-tain moun-tains hum-ming-bird hum-ming-birds pol-li-na-tor pol-li-na-tors pol-li-na-tion
pol-li-nat-ed nec-tar pet-al pet-als sep-al sep-als or-chid or-chids man-di-ble
cra-ni-um zy-go-mat-ic tem-po-ral oc-cip-i-tal max-il-la max-il-lae draw-ing draw-ings
con-struc-tion pro-por-tion pro-por-tions spe-cies ver-te-brae ver-te-bra ver-te-bral
ven-tral dor-sal lat-er-al me-di-al pos-te-ri-or an-te-ri-or su-pe-ri-or in-fe-ri-or
in-di-vid-u-al in-di-vid-u-als nat-u-ral nat-u-ral-ist bi-ol-o-gy bi-o-log-i-cal
her-pe-tol-o-gy her-pe-tol-o-gist bot-a-ny bot-a-nist bot-a-nists an-at-o-my an-a-tom-i-cal
pred-a-tor pred-a-tors ev-o-lu-tion re-lat-ed sim-i-lar par-tic-u-lar par-tic-u-lar-ly
of-ten nev-er how-ev-er to-geth-er be-tween be-cause be-fore be-hind be-low a-bove
un-der-side noc-tur-nal ar-bo-re-al ter-res-tri-al ep-i-phyte ep-i-phytes ep-i-phyt-ic
in-flo-res-cence in-flo-res-cences an-ti-ven-om an-ti-ven-oms re-cep-tor
re-cep-tors sur-face sur-fac-es cam-ou-flage hab-i-tat hab-i-tats el-e-va-tion
el-e-va-tions pop-u-la-tion pop-u-la-tions con-ser-va-tion med-i-cal med-i-cine
med-i-cines med-ic-i-nal pro-tect-ed en-dan-gered vul-ner-a-ble cen-ti-me-tres
cen-ti-me-ters me-tres me-ters mil-li-me-tres ap-prox-i-mate-ly ex-act-ly per-haps
fam-i-ly fam-i-lies hun-dred hun-dreds thou-sand thou-sands sev-er-al com-mon
com-mon-ly un-com-mon prey hunt-ing hunt-er ha-bit-u-al-ly ca-pa-ble pos-si-ble
vis-i-ble in-vis-i-ble sen-si-tive tem-per-a-ture tem-per-a-tures move-ment move-ments
ven-om-ous-ness ge-om-e-try sym-me-try sym-met-ri-cal or-bit or-bits or-bit-al
cheek-bone cheek-bones fore-head jaw-bone jaw-bones skel-e-ton skel-e-tons
skel-e-tal mus-cle mus-cles mus-cu-lar teeth tooth-less ca-nine ca-nines
car-nas-si-al tri-an-gle tri-an-gles tri-an-gu-lar rec-tan-gle cir-cle cir-cles
el-lipse el-lips-es sphere spher-i-cal plane planes per-spec-tive shad-ow shad-ows
light-ly heav-i-ly care-ful-ly sud-den-ly qui-et-ly re-al-ly us-u-al-ly
lit-tle mid-dle sim-ple sin-gle ta-ble ti-tle a-ble foot-hills foot-hill low-land
low-lands high-land high-lands head-land wood-land wood-lands grass-land grass-lands
haem-or-rhag-ic hem-or-rhag-ic ne-o-nate ne-o-nates ju-ve-nile ju-ve-niles in-ter-est-ing
in-ter-est dan-ger-ous yel-low-ish green-ish lav-en-der cor-o-na pseu-do-bulb
pseu-do-bulbs la-bel-lum pol-lin-i-um pol-lin-i-a hel-i-co-ni-a
`);

const PREFIXES = [
  'counter', 'electro', 'thermo', 'pseudo', 'extra', 'hyper', 'inter', 'intra', 'macro', 'micro',
  'multi', 'neuro', 'photo', 'proto', 'super', 'trans', 'under', 'anti', 'auto', 'ecto', 'endo',
  'hemi', 'mono', 'over', 'peri', 'poly', 'semi', 'post',
];

// suffix → break offset from the suffix start (0 = break right before it)
const SUFFIXES = [
  ['tion', 0], ['sion', 0], ['cian', 0], ['tial', 0], ['cial', 0], ['tious', 0], ['cious', 0],
  ['ture', 0], ['sure', 0], ['ment', 0], ['ments', 0], ['ness', 0], ['less', 0], ['ship', 0],
  ['ful', 0], ['ward', 0], ['wards', 0], ['like', 0], ['hood', 0], ['some', 0],
];

const VOWEL = /[aeiouyàáâäãåèéêëìíîïòóôöõùúûüýÿæœ]/;
const LETTER = /^[a-zà-öø-ÿæœ]+$/;
const DIGRAPHS = new Set(['ch', 'sh', 'th', 'ph', 'wh', 'gh', 'ck', 'qu', 'gu', 'rh']);
// two-letter onsets that may start a syllable after a short vowel (a-bridge, se-cret)
const BLENDS = new Set(['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr']);
// longer onsets used inside 3+ consonant clusters (in-struct, hun-dred)
const ONSETS = new Set([
  'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr', 'sc', 'sk', 'sl', 'sm',
  'sn', 'sp', 'st', 'sw', 'tw', 'scr', 'spl', 'spr', 'str', 'squ', 'thr', 'chr', 'shr', 'sch', 'phr',
]);

const cache = new Map();

/**
 * Hyphenation opportunities for one word.
 * @param {string} word  a single word (letters, may contain U+00AD)
 * @param {string} [lang='en']  'en' (heuristic) or 'es' (the rules of hyphen-es.js)
 * @returns {{ at: number, penalty: number }[]}  break before character index `at`
 *   (indices refer to the word with soft hyphens removed), sorted ascending.
 */
export function hyphenate(word, lang = 'en') {
  if (!word) return [];
  const key = `${lang}:${word}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let out;
  if (word.includes('\u00ad')) out = softHyphens(word);
  else if (lang === 'es') out = hyphenateEs(word);
  else out = heuristic(word);
  if (cache.size > 4000) cache.clear();
  cache.set(key, out);
  return out;
}

/** Remove soft hyphens from a string. */
export const stripSoftHyphens = (s) => s.replace(/\u00ad/g, '');

function softHyphens(word) {
  const out = [];
  let k = 0;
  for (const ch of word) {
    if (ch === '\u00ad') {
      if (k > 0) out.push({ at: k, penalty: HYPHEN_PENALTY.good });
    } else k++;
  }
  return out.filter((p) => p.at < k);
}

function heuristic(raw) {
  const w = raw.toLowerCase();
  const n = w.length;
  if (n < MIN_WORD || !LETTER.test(w)) return [];
  // proper nouns / acronyms / Latin binomials are the caller's business
  const ex = EXCEPTIONS.get(w);
  if (ex) return ex.map((at) => ({ at, penalty: HYPHEN_PENALTY.good }));
  // plural or 3rd-person "s" of a known word
  if (w.endsWith('s')) {
    const ex2 = EXCEPTIONS.get(w.slice(0, -1));
    if (ex2) return ex2.map((at) => ({ at, penalty: HYPHEN_PENALTY.good }));
  }

  const pts = new Map(); // at → { penalty, morph }
  const add = (at, p, morph = false) => {
    if (at < LEFT_MIN || n - at < RIGHT_MIN) return;
    if (!hasVowel(w.slice(0, at)) || !hasVowel(w.slice(at))) return;
    const old = pts.get(at);
    if (!old || p < old.penalty || (morph && !old.morph)) pts.set(at, { penalty: Math.min(p, old?.penalty ?? p), morph: morph || !!old?.morph });
  };

  // effective end: silent final -e / -es / -ed / -ue are not syllables
  let end = n;
  if (/(gue|que)$/.test(w)) end = n - 2;
  else if (/(ch|sh|ss|x|z)es$/.test(w)) add(n - 2, HYPHEN_PENALTY.good, true); // branch-es
  else if (/[td]ed$/.test(w)) add(n - 2, HYPHEN_PENALTY.good, true); // expect-ed
  if (/[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w)) end = n - 1;
  else if (/[^aeiouy]e[sd]$/.test(w) && !/[^aeiouy]le[sd]$/.test(w)) end = Math.min(end, n - 2);

  // prefixes
  for (const p of PREFIXES) {
    if (w.startsWith(p) && n - p.length >= 4) {
      const rest = w[p.length];
      if (!VOWEL.test(rest) || /[aeiou]$/.test(p)) add(p.length, HYPHEN_PENALTY.good, true);
      break;
    }
  }
  // suffixes
  for (const [s, off] of SUFFIXES) {
    if (w.endsWith(s) && n - s.length >= 3) add(n - s.length + off, HYPHEN_PENALTY.good, true);
  }
  if (/[^aeiouy](ing|ings)$/.test(w)) {
    const at = w.endsWith('s') ? n - 4 : n - 3;
    // doubled consonant before -ing: run-ning, not runn-ing
    if (w[at - 1] === w[at - 2] && !/[aeiouyls]/.test(w[at - 1])) add(at - 1, HYPHEN_PENALTY.good, true);
    else add(at, HYPHEN_PENALTY.good, true);
  }
  // consonant + le: ta-ble, lit-tle, sim-ple
  const le = /([^aeiouy])le(s|d)?$/.exec(w);
  if (le && !/(ck|ll)le/.test(w)) add(le.index, HYPHEN_PENALTY.good, true);

  // syllable clusters between vowel groups
  const groups = vowelGroups(w, end);
  for (let g = 0; g < groups.length - 1; g++) {
    const a = groups[g][1]; // index after first vowel group
    const b = groups[g + 1][0]; // start of next vowel group
    const k = b - a;
    const cl = w.slice(a, b);
    if (k === 1) {
      if (cl === 'x') add(b, HYPHEN_PENALTY.fair); // tox-ic
      else add(a, HYPHEN_PENALTY.risky); // ve-nom (risky; dictionary says ven-om)
    } else if (k === 2) {
      if (cl[0] === cl[1]) add(a + 1, HYPHEN_PENALTY.good); // hap-pen
      else if (DIGRAPHS.has(cl)) add(cl === 'ck' ? b : a, HYPHEN_PENALTY.fair);
      else if (BLENDS.has(cl)) add(a, HYPHEN_PENALTY.fair); // se-cret (fair)
      else add(a + 1, HYPHEN_PENALTY.good); // win-ter, mas-ter
    } else if (k >= 3) {
      if (cl.startsWith('tch')) add(a + 3, HYPHEN_PENALTY.good); // pitch-er
      else if (DIGRAPHS.has(cl.slice(0, 2)) && cl.slice(0, 2) !== 'qu') add(a + 2, HYPHEN_PENALTY.good); // ath-lete
      else if (DIGRAPHS.has(cl.slice(1, 3)) || ONSETS.has(cl.slice(1))) add(a + 1, HYPHEN_PENALTY.good); // an-chor, in-struct
      else if (ONSETS.has(cl.slice(1, 3))) add(a + 1, HYPHEN_PENALTY.good); // hun-dred
      else add(a + 2, HYPHEN_PENALTY.fair);
    }
  }
  // resolve neighbours closer than 2 letters: morphology wins, then the cheaper break
  const sorted = [...pts.entries()].sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const [at, v] of sorted) {
    const prev = out[out.length - 1];
    if (prev && at - prev.at < 2) {
      const better = (v.morph && !prev.morph) || (v.morph === prev.morph && v.penalty < prev.penalty);
      if (better) out[out.length - 1] = { at, penalty: v.penalty, morph: v.morph };
      continue;
    }
    out.push({ at, penalty: v.penalty, morph: v.morph });
  }
  return out.map(({ at, penalty }) => ({ at, penalty }));
}

function hasVowel(s) {
  return VOWEL.test(s);
}

/** [start, end) spans of vowel letters, treating y after a vowel and qu/gu-u as consonantal. */
function vowelGroups(w, end) {
  const out = [];
  let i = 0;
  while (i < end) {
    const isV = isVowelAt(w, i);
    if (!isV) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < end && isVowelAt(w, j)) j++;
    out.push([i, j]);
    i = j;
  }
  return out;
}

function isVowelAt(w, i) {
  const c = w[i];
  if (c === 'w') return i > 0 && /[aeo]/.test(w[i - 1]) && !VOWEL.test(w[i + 1] ?? 'x'); // ow, aw, ew
  if (!VOWEL.test(c)) return false;
  if (c === 'u' && i > 0 && (w[i - 1] === 'q' || (w[i - 1] === 'g' && VOWEL.test(w[i + 1] ?? '')))) return false;
  if (c === 'y') return i > 0 && !VOWEL.test(w[i - 1]); // y after consonant is a vowel
  return true;
}

function buildExceptions(src) {
  const map = new Map();
  for (const tok of src.split(/\s+/)) {
    if (!tok) continue;
    const parts = tok.split('-');
    const word = parts.join('');
    const at = [];
    let k = 0;
    for (let i = 0; i < parts.length - 1; i++) {
      k += parts[i].length;
      if (k >= 2 && word.length - k >= 2) at.push(k);
    }
    map.set(word, at);
  }
  return map;
}
