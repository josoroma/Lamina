// Spanish hyphenation for the page typesetter.
//
// Spanish divides by syllables, and its syllables follow rules rather than
// etymology, so a small rule set does the work of a pattern dictionary. The
// rules are those of the RAE's Diccionario panhispánico de dudas (2005) and
// Ortografía (2010) as restated by J. Bezos, "División de palabras con
// guiones" (v4.2, 2008 — the documentation of TeX's Spanish patterns), with
// the review's corrections (design-i18n R5):
//   · vowels are never separated — diphthong, triphthong or hiatus
//     (cau-sa, paí-ses); an h between two vowels joins them (ahi-ja-do);
//   · never break before an h nor before the letter that precedes it
//     (adhe-rir, inhi-bir, al-cohol); true compounds (des-hacer, in-humano)
//     come from the exception list;
//   · ch, ll, rr are one consonant; qu and gu before e/i are one consonant;
//     y is a consonant before a vowel and a vowel otherwise;
//   · consonants between two vowel groups: one → before it (ca-sa, ta-xi);
//     two → before both when they are an onset (bl br cl cr dr fl fr gl gr
//     kl kr pl pr tr: ha-blar), never inside tl (at-le-ta / a-tle-ta: avoided),
//     else between them (car-ta); three → after the first when the last two
//     are an onset (en-tre), else after the second (ins-tan-te); four → after
//     the second (obs-truc-ción); sub + r/l is a prefix (sub-ra-yar);
//   · at least two letters on each side (TeX's Spanish minimum; Bezos rule 5
//     forbids one), and never "-no" alone on the next line ("Gobier- / no",
//     Bezos §2.11); fragments of two letters are allowed but cost more;
//   · no breaks in words shorter than five letters, in non-adapted foreign
//     words (w, th, ph, ck, gh, ff, ss, tt, pp, zz), nor ones that leave a
//     rude fragment on either side.
// Not implemented (rare in these books): Bezos rule 11, the learned clusters
// pt ct cn ps mn gn ft pn cz tz ts after a consonant (*istmo*, *abs-tracto*).
// Capitalised words, italics and numbers never reach this module (text.js).

const LEFT_MIN = 2;
const RIGHT_MIN = 2;
const MIN_WORD = 5;
const PENALTY = { good: 45, fair: 70 };

const VOWELS = new Set([...'aeiouáéíóúü']);
const ONSETS = new Set(['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'kl', 'kr', 'pl', 'pr', 'tr']);
const WORD = /^[a-zñáéíóúü]+$/;
const FOREIGN = /w|th|ph|ck|gh|ff|ss|tt|pp|zz/;
// lexicalised sub- words keep their onset (su-bli-me, not sub-li-me)
const SUB_KEEP = new Set(['sublime', 'sublimes', 'sublimar', 'sublimación', 'sublimado', 'sublimada']);
// whole words the rules would get wrong: prefix + h compounds and prefix + r
// (the rr of super-rápido is split; interrumpir is not a prefix word)
const EXCEPTIONS = new Map(
  `super-rá-pi-do super-rá-pi-da super-rá-pi-dos super-rá-pi-das hiper-rea-lis-mo inter-ra-cial
  inter-re-gio-nal des-ha-cer des-he-cho des-ha-bi-ta-do des-ha-bi-ta-da des-hie-lo in-hu-ma-no
  in-hu-ma-na ex-haus-to ex-haus-ta in-há-bil in-há-bi-les`
    .split(/\s+/)
    .filter(Boolean)
    .map((h) => [h.replace(/-/g, ''), h]),
);
// fragments never left alone at either side of a break (Bezos §2.11)
const BLOCK = new Set(['culo', 'puta', 'puto', 'pedo', 'caca', 'cago', 'mierda']);
const BLOCK_RIGHT = new Set(['no']);

/** Split a lowercase word into units: { s, c (consonant), h, at }. */
function units(w) {
  const u = [];
  for (let i = 0; i < w.length; ) {
    const two = w.slice(i, i + 2);
    const next = w[i + 2] ?? '';
    if (two === 'ch' || two === 'll' || two === 'rr') {
      u.push({ s: two, c: true, at: i });
      i += 2;
      continue;
    }
    if ((two === 'qu' || two === 'gu') && /[eiéí]/.test(next)) {
      u.push({ s: two, c: true, at: i });
      i += 2;
      continue;
    }
    const ch = w[i];
    if (ch === 'y') {
      u.push({ s: 'y', c: VOWELS.has(w[i + 1] ?? ''), at: i });
      i++;
      continue;
    }
    u.push({ s: ch, c: !VOWELS.has(ch), h: ch === 'h', at: i });
    i++;
  }
  return u;
}

/** Break offsets of a hyphenated exception ('des-ha-cer' → [3, 5]). */
function fromException(h) {
  const parts = h.split('-');
  const out = [];
  let k = 0;
  for (let i = 0; i < parts.length - 1; i++) {
    k += parts[i].length;
    out.push(k);
  }
  return out;
}

/**
 * Spanish hyphenation opportunities for one word (lowercase or not;
 * capitalised words are the caller's business).
 * @param {string} word  letters only
 * @returns {{ at: number, penalty: number }[]}  break before index `at`, ascending
 */
export function hyphenateEs(word) {
  const w = String(word ?? '').toLowerCase();
  const n = w.length;
  if (n < MIN_WORD || !WORD.test(w) || FOREIGN.test(w)) return [];
  let cuts;
  const ex = EXCEPTIONS.get(w);
  if (ex) cuts = fromException(ex);
  else {
    const u = units(w);
    const isV = (k) => !!u[k] && !u[k].c;
    // vowel groups (nuclei); an h between two vowels is silent and joins them
    const nuc = [];
    for (let k = 0; k < u.length; ) {
      if (!isV(k)) {
        k++;
        continue;
      }
      let j = k + 1;
      for (;;) {
        if (isV(j)) j++;
        else if (u[j]?.h && isV(j + 1)) j += 2;
        else break;
      }
      nuc.push([k, j]);
      k = j;
    }
    cuts = [];
    for (let g = 0; g < nuc.length - 1; g++) {
      const C = u.slice(nuc[g][1], nuc[g + 1][0]);
      const s = C.map((x) => x.s);
      let cut = -1; // break before C[cut]
      if (C.length === 1) cut = 0;
      else if (C.length === 2) {
        const p = s[0] + s[1];
        cut = ONSETS.has(p) ? 0 : p === 'tl' ? -1 : 1;
      } else if (C.length === 3) {
        const p = s[1] + s[2];
        cut = ONSETS.has(p) ? 1 : p === 'tl' ? -1 : 2;
      } else if (C.length === 4) cut = 2;
      if (cut < 0) continue;
      // never before an h, nor before the letter that precedes it
      if (C[cut].h || C[cut + 1]?.h) continue;
      let at = C[cut].at;
      // sub + r / l: a prefix boundary, not an onset (sub-ra-yar, sub-li-mi-nal)
      if (at === 2 && /^sub[rl]/.test(w) && !SUB_KEEP.has(w)) at = 3;
      cuts.push(at);
    }
  }
  const out = [];
  for (const at of [...new Set(cuts)].sort((a, b) => a - b)) {
    if (at < LEFT_MIN || n - at < RIGHT_MIN) continue;
    const left = w.slice(0, at);
    const right = w.slice(at);
    if (BLOCK.has(left) || BLOCK.has(right) || BLOCK_RIGHT.has(right)) continue;
    out.push({ at, penalty: at === 2 || n - at === 2 ? PENALTY.fair : PENALTY.good });
  }
  return out;
}
