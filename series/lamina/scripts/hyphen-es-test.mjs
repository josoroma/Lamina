#!/usr/bin/env node
// Spanish hyphenation test (src/engine/typeset/hyphen-es.js, reached through
// the dispatcher in hyphen.js, as the typesetter calls it). Two parts:
//   - vectors: the syllable divisions of design-i18n §5.3 as corrected by its
//     review (R5: two letters each side, no lone "-no", the foreign-word
//     heuristic without k), each compared break by break;
//   - rules: every lowercase word the Spanish pages can hyphenate (the Spanish
//     editions src/books/es/*.js, the Spanish making texts, the typesetter's
//     dictionary) is hyphenated and each break checked against the rules the
//     module implements: at least two letters each side; vowels never split
//     (an h between two vowels joins them); ch, ll, rr and qu/gu before e or i
//     kept whole; never before an h nor before the letter that precedes it;
//     never "-no" alone. The module's compound exceptions (des-hacer,
//     in-humano, super-rápido…) break at their prefix, so a break before an h
//     or inside rr is accepted right after des, ex, in, hiper, inter or super.
// Node only: no DOM, no server. Capitalised words, italics and numbers never
// reach the module (text.js), so the rules check lowercase words only.
//
//   node scripts/hyphen-es-test.mjs [--verbose]
//
// Exit code 1 when a vector or a rule fails. A source file that cannot be
// loaded (a translation mid-edit) is reported and skipped: the validator owns
// the editions.
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hyphenateEs } from '../src/engine/typeset/hyphen-es.js';
import { hyphenate } from '../src/engine/typeset/hyphen.js';

const ROOT = resolve(import.meta.dirname, '..');
const VERBOSE = process.argv.includes('--verbose');

/** Word → its expected division ('ter-cio-pe-lo'); a word without hyphens has no break. */
const VECTORS = {
  serpiente: 'ser-pien-te', terciopelo: 'ter-cio-pe-lo', carretera: 'ca-rre-te-ra', perro: 'pe-rro', calle: 'ca-lle',
  coche: 'co-che', hablar: 'ha-blar', atleta: 'atle-ta', construcción: 'cons-truc-ción', instante: 'ins-tan-te',
  transporte: 'trans-por-te', obstrucción: 'obs-truc-ción', prohibir: 'prohi-bir', alcohol: 'al-cohol', adherir: 'adhe-rir',
  anhelo: 'anhe-lo', deshidratar: 'deshi-dra-tar', inhumano: 'in-hu-mano', subrayar: 'sub-ra-yar', sublime: 'su-bli-me',
  teatro: 'tea-tro', reunión: 'reu-nión', caída: 'caí-da', aéreo: 'aé-reo', abeja: 'abe-ja', ahora: 'aho-ra',
  pingüino: 'pin-güino', guitarra: 'gui-ta-rra', quetzal: 'quet-zal', leyenda: 'le-yen-da', contrarreloj: 'con-tra-rre-loj',
  superrápido: 'super-rá-pi-do', mandíbula: 'man-dí-bu-la', orquídea: 'or-quí-dea',
  esternocleidomastoideo: 'es-ter-no-clei-do-mas-toi-deo', Bothrops: 'Bothrops', webgpu: 'webgpu',
  // R5: the foreign-word heuristic no longer blocks k; "-no" never alone
  kilómetro: 'ki-ló-me-tro', gobierno: 'go-bierno', veneno: 've-neno', pequeño: 'pe-que-ño', cráneo: 'crá-neo',
  inhibir: 'inhi-bir', exhalar: 'exha-lar', vergüenza: 'ver-güen-za', guerra: 'gue-rra', rehusar: 'rehu-sar',
  deshacer: 'des-ha-cer', búho: 'búho', casa: 'casa', agua: 'agua', aquí: 'aquí', reyes: 're-yes',
};

const VOWEL = /[aeiouáéíóúü]/;
const ONE_SOUND = ['ch', 'll', 'rr'];
const PREFIX_BREAK = /^(des|ex|in|hiper|inter|super)$/; // where a compound exception may break before h or inside rr

let failed = 0;
let passed = 0;
const fail = (what) => {
  failed++;
  console.log(`FAIL ${what}`);
};
const show = (w, breaks) => {
  let s = '';
  let k = 0;
  for (const { at } of breaks) {
    s += `${w.slice(k, at)}-`;
    k = at;
  }
  return s + w.slice(k);
};

// ------------------------------------------------------------------ vectors
let vectorPass = 0;
for (const [word, want] of Object.entries(VECTORS)) {
  // the English result first: the dispatcher's cache is keyed by language
  hyphenate(word, 'en');
  const got = show(word, hyphenate(word, 'es'));
  const direct = show(word, hyphenateEs(word));
  if (got !== want) fail(`${word}: ${got} (want ${want})`);
  else if (direct !== got) fail(`${word}: hyphenate(…, 'es') gives ${got}, hyphenateEs ${direct}`);
  else {
    vectorPass++;
    if (VERBOSE) console.log(`ok   ${word.padEnd(24)} ${got}`);
  }
}
// an author's soft hyphen wins over the rules (indices count the word without it)
const soft = hyphenate('ter­ciopelo', 'es').map((p) => p.at).join(',');
if (soft !== '3') fail(`soft hyphen: ter­ciopelo breaks at [${soft}] (want [3])`);
else vectorPass++;
passed += vectorPass;
console.log(`vectors: ${vectorPass}/${Object.keys(VECTORS).length + 1} pass`);

// ------------------------------------------------------------------ rules
/** Why a break at `at` in lowercase `w` breaks a rule, or null. */
function broken(w, at, isLast) {
  const n = w.length;
  if (!Number.isInteger(at) || at < 2 || n - at < 2) return 'fewer than two letters on one side';
  const a = w[at - 1];
  const b = w[at];
  if (VOWEL.test(a) && VOWEL.test(b)) return 'splits two vowels';
  // an h between vowels is silent: the vowels around it are one group
  if (b === 'h' && VOWEL.test(a) && VOWEL.test(w[at + 1] ?? '')) return 'splits a vowel group joined by h';
  if (a === 'h' && VOWEL.test(w[at - 2] ?? '') && VOWEL.test(b)) return 'splits a vowel group joined by h';
  const prefix = PREFIX_BREAK.test(w.slice(0, at));
  if (ONE_SOUND.includes(a + b) && !(a + b === 'rr' && prefix)) return `splits ${a + b}`;
  if ((a === 'q' || a === 'g') && b === 'u' && /[eiéí]/.test(w[at + 1] ?? '')) return `splits ${a}u`;
  // (the h of ch is part of one consonant, not an h)
  if (b === 'h' && a !== 'c' && !prefix) return 'breaks before an h';
  if (w[at + 1] === 'h' && b !== 'c') return 'breaks before the letter that precedes an h';
  if (isLast && w.slice(at) === 'no') return 'leaves "-no" alone';
  return null;
}

// the checker itself: each of these divisions breaks a rule and must be caught
const BAD = ['ca-ída', 'c-asa', 'per-ro', 'cal-le', 'coc-he', 'peq-ueño', 'pro-hi-bir', 'proh-ibir', 'ad-he-rir',
  'a-dherir', 'gobier-no', 'pe-rr-o'];
for (const division of BAD) {
  const w = division.replace(/-/g, '');
  const ats = [];
  for (let i = 0, k = 0; i < division.length; i++) if (division[i] === '-') ats.push(i - k++);
  if (!ats.some((at, i) => broken(w, at, i === ats.length - 1))) fail(`the rule check accepts ${division}`);
}

/** Every string inside a value (manifests, making texts, dictionaries). */
function* strings(v, seen = new Set()) {
  if (typeof v === 'string') yield v;
  else if (v && typeof v === 'object' && !seen.has(v)) {
    seen.add(v);
    for (const x of Array.isArray(v) ? v : Object.values(v)) yield* strings(x, seen);
  }
}

const sources = [
  ...readdirSync(resolve(ROOT, 'src/books/es'))
    .filter((f) => f.endsWith('.js'))
    .sort()
    .map((f) => `src/books/es/${f}`),
  'src/books/making/es.js',
  'src/i18n/es/typeset.js',
];
const words = new Map(); // word → first source
const skipped = [];
for (const file of sources) {
  let mod;
  try {
    mod = await import(pathToFileURL(resolve(ROOT, file)).href);
  } catch (err) {
    skipped.push(`${file}: ${err.message.split('\n')[0]}`);
    continue;
  }
  for (const s of strings(mod)) {
    // a word as text.js hands it over: letters only; capitalised words never
    for (const w of s.match(/\p{L}+/gu) ?? []) if (!/^\p{Lu}/u.test(w) && !words.has(w)) words.set(w, file);
  }
}

let checked = 0;
let breaks = 0;
let ruleFails = 0;
for (const [w, file] of words) {
  const out = hyphenate(w, 'es');
  if (out.length) checked++;
  for (let i = 0; i < out.length; i++) {
    breaks++;
    const { at, penalty } = out[i];
    const why = broken(w.toLowerCase(), at, i === out.length - 1) ?? (i && at <= out[i - 1].at ? 'breaks out of order' : null)
      ?? (Number.isFinite(penalty) && penalty > 0 ? null : `penalty ${penalty}`);
    if (why) {
      ruleFails++;
      fail(`${w} (${file}): ${show(w, out)} — ${why}`);
    }
  }
}
if (!ruleFails) passed++;
for (const s of skipped) console.log(`skip ${s}`);
console.log(`rules: ${words.size} distinct lowercase words from ${sources.length - skipped.length} files, ${checked} hyphenated at ${breaks} breaks, ${ruleFails} breaking a rule`);

console.log(failed ? `\n${failed} failing` : `\nall pass (${passed} checks)`);
process.exit(failed ? 1 : 0);
