#!/usr/bin/env node
// Validate book manifests and their language editions against the Lámina contract
// (docs/architecture/CONTRACTS.md §6 and §16): schema, text budgets, canonical label
// ids, 5-second beat timing, figure params, the author byline and mark, the
// "How this book was made" texts, and — with --lang es|all — each Spanish edition
// and the Spanish dictionaries.
//
//   node scripts/validate-books.mjs [book-id ...] [--lang en|es|all] [--fit] [--json out.json]
//        [--runtime audit.json]
//
//   --lang en   (default) the English manifests, the making texts against docs/prompts,
//               src/engine/typeset/marks.js against public/author/<mark>.svg
//   --lang es   each src/books/es/<id>.js composed against its English manifest
//               (src/i18n/schema.js): missing or extra keys, changed ids, untranslated
//               text, English residue, binomials, numbers, typography, budgets × 1.25;
//               the Spanish making texts; the dictionaries in src/i18n/es/ (via
//               scripts/i18n-strings.mjs; --runtime adds the figure strings that
//               `audit.mjs --i18n --json` extracted, and checks that each look-closer
//               run-in is the very words of its label's Spanish pill)
//   --lang all  both
//   --fit       typesets every side of each edition in typeset.html (needs the dev
//               server or a preview: LAMINA_URL) and fails on an overflow, a sideways
//               overflow (hOverflow), a page under 90 % (a making page under 25/26 of
//               its design size), or — with both languages — any difference in page
//               sequence, folios or plates between the editions
//
// Exit code 1 when any error is found; warnings never fail the run.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseAst } from 'vite';
import { checkDictionaries, dictionaryIndex, loadDictionaries, runtimeStrings } from './i18n-strings.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const words = (s = '') => String(s).replace(/\*+/g, '').trim().split(/\s+/).filter(Boolean).length;
const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);

// Canonical label ids per figure (type → species/lesson → ids). Mirrors CONTRACTS §6.
const SNAKE_ALL = ['head', 'eye', 'tongue', 'ventral-scutes', 'cloaca', 'vertebrae', 'ribs'];
const PIT = ['loreal-pit', 'fangs', 'venom-gland', 'keeled-scales'];
export const CANONICAL = {
  atom: {
    cloud: ['nucleus', 'cloud'], isotopes: ['hydrogen', 'deuterium', 'helium'],
    water: ['oxygen', 'hydrogen', 'attraction'], states: ['solid', 'liquid', 'gas'],
    carbon: ['diamond', 'graphite', 'bonds'], light: ['levels', 'transition', 'photon'],
  },
  cell: {
    organization: ['membrane', 'nucleus', 'ribosome'], membrane: ['head', 'tails', 'channel'],
    protein: ['dna', 'rna', 'ribosome', 'protein'], energy: ['cristae', 'gradient', 'synthase'],
    photosynthesis: ['thylakoid', 'stroma', 'light'], division: ['chromosomes', 'spindle', 'furrow'],
  },
  campfire: {
    shore: ['flame', 'waves', 'question'], pyrolysis: ['wood', 'char', 'gas'],
    reaction: ['fuel', 'oxygen', 'products'], heat: ['convection', 'radiation', 'conduction'],
    light: ['soot', 'ember', 'spark'], sunlight: ['flame', 'waves', 'sun', 'tree'],
  },
  snake: {
    'bothrops-asper': [...SNAKE_ALL, ...PIT],
    'bothriechis-schlegelii': [...SNAKE_ALL, ...PIT, 'eyelash-scales', 'prehensile-tail'],
    'crotalus-simus': [...SNAKE_ALL, ...PIT, 'rattle', 'rattle-button'],
    'lachesis-stenophrys': [...SNAKE_ALL, ...PIT, 'tail-spine', 'eggs'],
    'micrurus-nigrocinctus': [...SNAKE_ALL, 'fixed-fangs', 'red-ring', 'black-ring', 'yellow-ring'],
    'hydrophis-platurus': [...SNAKE_ALL, 'paddle-tail', 'nostril', 'yellow-venter'],
    'boa-imperator': [...SNAKE_ALL, 'pelvic-spur', 'recurved-teeth', 'eye-stripe'],
  },
  flower: {
    'guarianthe-skinneri': ['sepal', 'petal', 'labellum', 'column', 'pseudobulb', 'leaf'],
    'heliconia-wagneriana': ['bract', 'flower', 'rachis', 'hummingbird', 'leaf'],
    'passiflora-vitifolia': ['sepal', 'petal', 'corona', 'androgynophore', 'anther', 'stigma', 'tendril'],
    'palicourea-elata': ['bract', 'flower', 'leaf'],
    'handroanthus-ochraceus': ['corolla', 'calyx', 'nectar-guides', 'branch'],
    'nymphaea-ampla': ['petal', 'sepal', 'stamens', 'stigma', 'pad'],
  },
  skull: {
    human: ['frontal', 'parietal', 'temporal', 'occipital', 'sphenoid', 'zygomatic', 'maxilla', 'nasal', 'mandible', 'orbit',
      'nasal-aperture', 'zygomatic-arch', 'mastoid', 'condyle', 'coronoid', 'teeth', 'coronal-suture', 'sagittal-suture',
      'temporalis', 'masseter', 'head'],
    jaguar: ['sagittal-crest', 'zygomatic-arch', 'canine', 'carnassial', 'orbit', 'mandible'],
  },
};
const canonicalFor = (fig) => {
  const t = CANONICAL[fig?.type];
  if (!t) return null;
  const key = fig.params?.species ?? fig.params?.subject ?? fig.params?.scene;
  return t[key] ?? null;
};

const BUDGET = {
  lede: 25, bodyMin: 120, bodyMax: 220, factsMin: 4, factsMax: 6, factValue: 6,
  lookMin: 2, lookMax: 4, lookName: 3, dyk: 40, intro: 260, note: 220, glossMin: 8, glossMax: 14, srcMin: 5, srcMax: 20,
  stepTitle: 5, stepText: 40, proTip: 45, mistake: 18, proportion: 18, later: 45,
};
// Spanish runs longer than English; word counts are only a hint there (--fit is the binding check)
const ES_SLACK = 1.25;
const BLURB_MAX = 139; // back-cover blurb, characters (room for the moved title and the author mark)
// fit floors, compared in thousandths: auto-fit steps in floats (0.8999999999999999 is 0.9)
const FLOOR = 900;
const MAKING_FLOOR = Math.floor((25 / 26) * 1000); // body 26 design px, never under 25

// ------------------------------------------------------------------ English manifest

function validate(book, AUTHOR_MARKS) {
  const E = [], W = [];
  const err = (where, msg) => E.push(`${where}: ${msg}`);
  const warn = (where, msg) => W.push(`${where}: ${msg}`);
  for (const k of ['id', 'title', 'subtitle', 'theme', 'intro', 'howTo', 'plates', 'back']) if (book[k] == null) err('book', `missing "${k}"`);
  if (/^[a-z]{2}$/.test(book.id ?? '')) err('book', `id "${book.id}" reads as a language code: routes are #/<lang>/<id>`);
  if (book.locale != null && book.locale !== 'en') err('book', `locale "${book.locale}": the manifest in src/books/ is the English source edition`);
  if (book.author != null && typeof book.author !== 'string') err('author', 'is the imprint line (a string); the person goes in byline: { name, mark }');
  if (!book.byline) err('byline', 'missing { name, mark }: the author on the boards, the title page and the imprint');
  else {
    if (typeof book.byline.name !== 'string' || !book.byline.name.trim()) err('byline', 'needs a name');
    const mark = book.byline.mark;
    if (mark != null && AUTHOR_MARKS && !AUTHOR_MARKS[mark]) err('byline', `mark "${mark}" is not in src/engine/typeset/marks.js (AUTHOR_MARKS)`);
    if (mark != null && !existsSync(resolve(ROOT, 'public/author', `${mark}.svg`))) err('byline', `mark "${mark}" has no source drawing public/author/${mark}.svg`);
  }
  if (book.theme) for (const k of ['style', 'cloth', 'foil', 'paper', 'ink', 'accent']) if (!book.theme[k]) err('theme', `missing "${k}"`);
  if (book.intro && words((book.intro.paragraphs ?? []).join(' ')) > BUDGET.intro) err('intro', `> ${BUDGET.intro} words`);
  if (book.back?.note && words((book.back.note.paragraphs ?? []).join(' ')) > BUDGET.note) err('back.note', `> ${BUDGET.note} words`);
  const g = book.back?.glossary?.length ?? 0;
  if (g < BUDGET.glossMin || g > BUDGET.glossMax) warn('back.glossary', `${g} terms (want ${BUDGET.glossMin}–${BUDGET.glossMax})`);
  const s = book.back?.sources?.length ?? 0;
  if (s < BUDGET.srcMin || s > BUDGET.srcMax) warn('back.sources', `${s} sources (want ${BUDGET.srcMin}–${BUDGET.srcMax})`);
  W.push(...printedShape(book));

  const ids = new Set();
  (book.plates ?? []).forEach((p, i) => {
    const at = `plate ${p.id ?? i + 1}`;
    if (ids.has(p.id)) err(at, 'duplicate id');
    ids.add(p.id);
    for (const k of ['id', 'number', 'common', 'lede', 'body', 'facts', 'figure', 'animation']) if (p[k] == null) err(at, `missing "${k}"`);
    if (p.layout !== 'lesson' && !p.scientific) err(at, 'missing "scientific"');
    if (words(p.lede) > BUDGET.lede) err(at, `lede ${words(p.lede)} words > ${BUDGET.lede}`);
    const bw = words((p.body ?? []).join(' '));
    if (bw < BUDGET.bodyMin || bw > BUDGET.bodyMax) err(at, `body ${bw} words (want ${BUDGET.bodyMin}–${BUDGET.bodyMax})`);
    const f = p.facts?.length ?? 0;
    if (f < BUDGET.factsMin || f > BUDGET.factsMax) err(at, `${f} facts (want ${BUDGET.factsMin}–${BUDGET.factsMax})`);
    for (const [k, v] of p.facts ?? []) if (words(v) > BUDGET.factValue + 2) warn(at, `fact "${k}" value is ${words(v)} words`);
    const lc = p.lookCloser?.length ?? 0;
    if (lc < BUDGET.lookMin || lc > BUDGET.lookMax) err(at, `${lc} lookCloser items (want ${BUDGET.lookMin}–${BUDGET.lookMax})`);
    const canon = canonicalFor(p.figure);
    if (!canon) warn(at, `no canonical label table for figure ${p.figure?.type}/${p.figure?.params?.species ?? p.figure?.params?.subject}`);
    for (const item of p.lookCloser ?? []) {
      if (canon && !canon.includes(item.label)) err(at, `lookCloser label "${item.label}" is not canonical`);
      if (item.name != null && words(item.name) > BUDGET.lookName) err(at, `lookCloser "${item.label}" name "${item.name}" > ${BUDGET.lookName} words`);
    }
    if (words(p.didYouKnow) > BUDGET.dyk) err(at, `didYouKnow ${words(p.didYouKnow)} words > ${BUDGET.dyk}`);
    if (!p.figure?.type || !p.figure?.params) err(at, 'figure needs { type, params }');
    for (const [t] of p.animation?.beats ?? []) if (!(t >= 0 && t < 5)) err(at, `beat at t=${t} outside [0,5)`);
    if (p.layout === 'lesson') {
      const st = p.lesson?.steps ?? [];
      if (st.length !== 3) err(at, `lesson needs exactly 3 steps (has ${st.length})`);
      st.forEach((x, k) => {
        if (words(x.title) > BUDGET.stepTitle) err(at, `step ${k + 1} title > ${BUDGET.stepTitle} words`);
        if (words(x.text) > BUDGET.stepText) err(at, `step ${k + 1} text ${words(x.text)} words > ${BUDGET.stepText}`);
      });
      if (words(p.lesson?.proTip) > BUDGET.proTip) err(at, `proTip > ${BUDGET.proTip} words`);
      for (const m of p.lesson?.mistakes ?? []) if (words(m) > BUDGET.mistake) err(at, `mistake "${m.slice(0, 30)}…" > ${BUDGET.mistake} words`);
      for (const m of p.lesson?.proportions ?? []) if (words(m) > BUDGET.proportion) err(at, `proportion "${m.slice(0, 30)}…" > ${BUDGET.proportion} words`);
    }
  });
  return { E, W, I: [] };
}

/**
 * Things the typesetter does itself or has no room for, in either edition: the pull
 * quote gets its quotation marks from the page («…» or “…”), and a back-cover blurb
 * over 139 characters crowds the title and the author mark.
 */
function printedShape(book) {
  const W = [];
  const q = book.intro?.pullQuote;
  if (q && /^[«“"]|[»”"]$/.test(q.trim())) W.push(`intro.pullQuote: no quotation marks — the page adds them (they would print twice)`);
  for (const [path, b] of [['blurb', book.blurb], ['back.blurb', book.back?.blurb]]) {
    if (typeof b === 'string' && b.length > BLURB_MAX) W.push(`${path}: ${b.length} characters > ${BLURB_MAX} (the back cover's title and author mark need the room)`);
  }
  return W;
}

/** Every key path of the English manifest must be declared in src/i18n/schema.js. */
function schemaCoverage(book, schema) {
  const E = [];
  if (!schema) return E;
  schema.walk(schema.MANIFEST, book, (node, v, path) => {
    if (node === null) E.push(`${path}: not declared in src/i18n/schema.js (MANIFEST) — declare it as text or id, or translations cannot carry it`);
  });
  return E;
}

// ------------------------------------------------------------------ Spanish edition

// whole words only: \b would split "crían" at the í and find "an"
const EN_WORDS = /(?<![\p{L}\p{N}])(the|and|of|with|to|is|are|was|were|from|for|its|this|that|in|on|by|as|at|or|into|than|which|when|where|while|be|it|an)(?![\p{L}\p{N}])/giu;
const plain = (s) => String(s).replace(/https?:\/\/\S+/g, ' ').replace(/\*[^*]+\*/g, ' ');
const englishWords = (s) => plain(s).match(EN_WORDS) ?? [];
const letterWords = (s) => (plain(s).match(/\p{L}+/gu) ?? []).length;
const BINOMIAL = /\*([A-Z][a-z]+\.?(?: [a-z]+){1,2})\*/g;
const binomials = (s) => [...String(s).matchAll(BINOMIAL)].map((m) => m[1]);
const NUM_EN = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;
const NUM_ES = /\d{1,3}(?:[   ]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;
const numbers = (s, lang) => [...plain(s).matchAll(lang === 'en' ? NUM_EN : NUM_ES)]
  .map((m) => +(lang === 'en' ? m[0].replace(/,/g, '') : m[0].replace(/[   ]/g, '').replace(',', '.')))
  .sort((a, b) => a - b);
const NUMBER_STRICT = [/\.facts\[\d+\]\[1\]$/, /\.scaleNote$/, /\.status\.source$/];
const TYPOGRAPHY = [
  [/ /, 'narrow no-break space U+202F: no book font has it (use U+00A0)', 'error'],
  [/(^|[\s(])"|"($|[\s.,;:)])/, 'straight double quote (Spanish uses «…», then “…”)'],
  [/(^|[\s(])'|'($|[\s.,;:)])/, 'straight single quote'],
  [/\.\.\./, '"..." (use …)'],
  [/\d%/, 'percent without a space ("85 %", with U+00A0)'],
  [/\d\.\d{1,2}\b/, 'decimal point (Spanish: decimal comma, "1,5 m")'],
  [/ {2}/, 'double space'],
];
// field (path with indices dropped) → English word budget
const ES_BUDGETS = [
  [/^plates\[[^\]]+\]\.lede$/, BUDGET.lede],
  [/^plates\[[^\]]+\]\.didYouKnow$/, BUDGET.dyk],
  [/^plates\[[^\]]+\]\.facts\[\d+\]\[1\]$/, BUDGET.factValue + 2],
  [/^plates\[[^\]]+\]\.lesson\.steps\[\d+\]\.title$/, BUDGET.stepTitle],
  [/^plates\[[^\]]+\]\.lesson\.steps\[\d+\]\.text$/, BUDGET.stepText],
  [/^plates\[[^\]]+\]\.lesson\.proTip$/, BUDGET.proTip],
  [/^plates\[[^\]]+\]\.lesson\.mistakes\[\d+\]$/, BUDGET.mistake],
  [/^plates\[[^\]]+\]\.lesson\.proportions\[\d+\]$/, BUDGET.proportion],
];

/** String leaves of `value` along the schema: path → { node, value, parent }. */
function leaves(schema, value) {
  const out = new Map();
  schema.walk(schema.MANIFEST, value, (node, v, path, parent) => {
    if (typeof v === 'string') out.set(path, { node, value: v, parent });
  });
  return out;
}

function validateSpanish(id, enBook, esBook, schema, composeEdition) {
  const E = [], W = [], I = [];
  if (esBook.locale !== 'es') E.push(`locale: "${esBook.locale ?? '(none)'}" — a Spanish edition declares locale: 'es'`);
  // composition: the same merge the reader runs (src/i18n/edition.js)
  let report = null;
  try {
    report = composeEdition(enBook, esBook, { lang: 'es' }).report;
  } catch (e) {
    E.push(`composeEdition throws: ${e.message.split('\n')[0]}`);
  }
  const fmt = (x) => (typeof x === 'string' ? x : x?.path ? `${x.path}${x.detail ? ` (${x.detail})` : ''}` : JSON.stringify(x));
  const REPORT = [
    ['missing', E, 'missing text (English shows instead)'],
    ['extra', E, 'not in the English manifest'],
    ['changedIds', E, 'id value differs from English (ids are never translated)'],
    ['lengths', E, 'list length differs from English'],
    ['types', E, 'value type differs from English'],
    ['unknown', E, 'not declared in src/i18n/schema.js'],
    ['order', W, 'rows in a different order than English (English order is used)'],
  ];
  for (const [k, sink, what] of REPORT) for (const x of report?.[k] ?? []) sink.push(`${fmt(x)}: ${what}`);

  const en = leaves(schema, enBook);
  const es = leaves(schema, esBook);
  // names print the same in every language: the imprint, the author, the book's title
  const NAMES = new Set([enBook.author, enBook.byline?.name, enBook.title].filter(Boolean).map((n) => n.trim()));
  // a look-closer name is optional in English (derived from the label) but required in a translation
  const reported = new Set((report?.missing ?? []).map(fmt));
  schema.walk(schema.MANIFEST, enBook, (node, v, path) => {
    if (!node || node.kind !== 'byId' || !Array.isArray(v)) return;
    for (const [k, f] of Object.entries(node.of?.fields ?? {})) {
      if (!f?.optionalInEnglish) continue;
      for (const row of v) {
        const p = `${path}[${row?.[node.key]}].${k}`;
        if (!es.has(p) && !reported.has(p)) E.push(`${p}: missing (optional in English, required in a translation)`);
      }
    }
  });
  for (const [path, { node, value: ev, parent }] of en) {
    if (!node || !schema.isTextKind(node)) continue;
    const x = es.get(path)?.value;
    if (typeof x !== 'string') continue; // missing: the composition report says so
    const isSources = /(^|\.)sources\[\d+\]$/.test(path);
    // untranslated
    if (x === ev && !schema.identicalAllowed(node, ev, parent)) {
      if (node.kind !== 'text') E.push(`${path}: identical to English — a ${node.kind.toUpperCase()} value may stay only ${node.kind === 'sci' ? 'when the plate has an authority (a real binomial)' : 'when every part is a taxon name'}: «${ev}»`);
      else if (NAMES.has(ev.trim().replace(/\.$/, ''))) I.push(`${path}: a name, identical in both languages «${ev}»`);
      else if (englishWords(ev).length || letterWords(ev) >= 3) E.push(`${path}: untranslated «${ev.length > 70 ? ev.slice(0, 67) + '…' : ev}»`);
      else I.push(`${path}: identical to English «${ev}»`);
    }
    if (x === ev) continue;
    // English left behind in a translated string
    const residue = englishWords(x);
    if (node.kind === 'text' && !isSources && residue.length >= 2) W.push(`${path}: English words left (${[...new Set(residue.map((w) => w.toLowerCase()))].join(', ')}): «${x.length > 70 ? x.slice(0, 67) + '…' : x}»`);
    // every italic binomial of the English, still italic
    for (const b of binomials(ev)) if (!x.includes(`*${b}*`)) E.push(`${path}: binomial *${b}* missing or not in *italics*`);
    // numbers (locale-aware): 1,500 = 1500 = 1 500; 1.5 = 1,5
    const a = numbers(ev, 'en'), b = numbers(x, 'es');
    if (a.join('|') !== b.join('|')) (NUMBER_STRICT.some((re) => re.test(path)) ? E : W).push(`${path}: numbers differ — English [${a.join(', ')}], Spanish [${b.join(', ')}]`);
    // typography
    if (!isSources) {
      for (const [re, what, sev] of TYPOGRAPHY) if (re.test(x)) (sev === 'error' ? E : W).push(`${path}: ${what}`);
      const q = (x.match(/\?/g) ?? []).length, iq = (x.match(/¿/g) ?? []).length;
      const ex = (x.match(/!/g) ?? []).length, iex = (x.match(/¡/g) ?? []).length;
      if (q > iq) W.push(`${path}: "?" without its opening "¿"`);
      if (ex > iex) W.push(`${path}: "!" without its opening "¡"`);
    }
  }
  // budgets × 1.25 (fields with a word budget in English); look-closer names stay ≤ 3 words
  for (const [path, { value }] of es) {
    const b = ES_BUDGETS.find(([re]) => re.test(path));
    if (b && words(value) > Math.floor(b[1] * ES_SLACK)) W.push(`${path}: ${words(value)} words (English budget ${b[1]} × ${ES_SLACK})`);
    if (/\.lookCloser\[[^\]]+\]\.name$/.test(path) && words(value) > BUDGET.lookName) W.push(`${path}: "${value}" is ${words(value)} words (a run-in of ≤ ${BUDGET.lookName})`);
  }
  W.push(...printedShape(esBook));
  const sum = (re) => [...es].filter(([p]) => re.test(p)).reduce((n, [, l]) => n + words(l.value), 0);
  for (const [re, budget, what] of [[/^intro\.paragraphs\[\d+\]$/, BUDGET.intro, 'intro'], [/^back\.note\.paragraphs\[\d+\]$/, BUDGET.note, 'back.note']]) {
    const n = sum(re);
    if (n > budget * ES_SLACK) W.push(`${what}: ${n} words (English budget ${budget} × ${ES_SLACK})`);
  }
  for (const p of esBook.plates ?? []) {
    const n = words((p.body ?? []).join(' '));
    if (n > BUDGET.bodyMax * ES_SLACK) W.push(`plates[${p.id}].body: ${n} words (English budget ${BUDGET.bodyMax} × ${ES_SLACK})`);
  }
  return { E, W, I };
}

// ------------------------------------------------------------------ look-closer names and pills

/** The English pill text of every figure label in an audit's --json: 'book/plate/label' → text. */
function pillTexts(json) {
  const out = new Map();
  for (const r of Array.isArray(json) ? json : json?.results ?? []) {
    for (const l of r.strings?.labels ?? []) if (l?.id && typeof l.text === 'string') out.set(`${r.book}/${r.plate}/${l.id}`, l.text);
  }
  return out;
}

/** A key's translation (an exact entry, or a pattern with its values filled in), or undefined. */
function translationOf(index, text) {
  const hit = index.find(text);
  if (!hit) return undefined;
  if (!hit.re) return hit.value;
  const names = [...hit.key.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const values = hit.re.exec(text)?.slice(1) ?? [];
  return hit.value.replace(/\{(\w+)\}/g, (m, k) => (names.includes(k) ? values[names.indexOf(k)] : m));
}

/**
 * A look-closer note and the figure's pill name one structure in the same words: in a
 * translation the note's run-in (`lookCloser[].name`) is exactly the translation of the
 * pill (CONTRACTS §16). Rows without a name, and pills without a translation, are
 * reported by the edition and dictionary checks.
 */
function validatePills(id, esBook, pills, index) {
  const E = [], W = [];
  for (const p of esBook.plates ?? []) {
    for (const row of p.lookCloser ?? []) {
      if (!row?.label || typeof row.name !== 'string') continue;
      const at = `plates[${p.id}].lookCloser[${row.label}].name`;
      const text = pills.get(`${id}/${p.id}/${row.label}`);
      if (text === undefined) {
        W.push(`${at}: the figure strings (--runtime) have no label "${row.label}" on this plate`);
        continue;
      }
      const pill = translationOf(index, text);
      if (pill !== undefined && pill !== row.name) E.push(`${at}: «${row.name}» ≠ the pill «${pill}» (figure label "${text}") — the run-in and the pill must be the same words`);
    }
  }
  return { E, W };
}

// ------------------------------------------------------------------ making texts

/** A named prompt quote block, "> " stripped, one entry per line. */
function promptFromDoc(file, heading = 'Prompt (verbatim)') {
  const lines = readFileSync(file, 'utf8').split('\n');
  const h = lines.findIndex((l) => l.replace(/^##\s+/, '') === heading);
  if (h < 0) return null;
  let i = h + 1;
  while (i < lines.length && !lines[i].startsWith('>')) i++;
  const out = [];
  for (; i < lines.length && lines[i].startsWith('>'); i++) out.push(lines[i].replace(/^> ?/, ''));
  return out;
}

/** `books[].brief` of a workflow script, by book id (the script is a function body: export + return at top level). */
function briefsFromWorkflow(file) {
  const src = readFileSync(file, 'utf8');
  const ast = parseAst(`(async function () {\n${src.replace(/^export\s+/gm, '')}\n})`);
  const out = {};
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.type === 'ObjectExpression') {
      const get = (k) => n.properties.find((p) => p.type === 'Property' && (p.key.name ?? p.key.value) === k)?.value;
      const id = get('id'), brief = get('brief');
      if (id?.type === 'Literal' && brief) {
        if (brief.type === 'TemplateLiteral') out[id.value] = brief.expressions.length ? null : brief.quasis[0].value.cooked;
        else if (brief.type === 'Literal') out[id.value] = brief.value;
      }
    }
    for (const k in n) if (k !== 'start' && k !== 'end') walk(n[k]);
  })(ast);
  return out;
}

const isBullet = (l) => /^\* /.test(l);
const urls = (l) => String(l).match(/https?:\/\/\S+/g) ?? [];

function validateMaking(mod, lang, ids, enMod, { allBooks = true } = {}) {
  const E = [], W = [], I = [];
  const at = `src/books/making/${lang === 'en' ? 'index' : lang}.js`;
  if (!mod) return { E: [`${at}: no MAKING.${lang} loader in src/books/index.js`], W, I };
  const { PROMPT, BRIEFS, LATER } = mod;
  if (PROMPT?.editorial != null && typeof PROMPT.editorial !== 'boolean') E.push(`${at}: PROMPT.editorial must be boolean`);
  if (mod.LANG && mod.LANG !== lang) E.push(`${at}: LANG is "${mod.LANG}", expected "${lang}"`);
  if (!Array.isArray(PROMPT?.lines) || !PROMPT.lines.every((l) => typeof l === 'string')) E.push(`${at}: PROMPT.lines must be an array of strings`);
  else {
    const n = PROMPT.lines.length;
    if (!(PROMPT.title >= 0 && PROMPT.title < n) || !PROMPT.lines[PROMPT.title]?.trim()) E.push(`${at}: PROMPT.title (${PROMPT.title}) is not a non-blank line`);
    for (const h of PROMPT.headings ?? []) if (!PROMPT.lines[h]?.trim()) E.push(`${at}: PROMPT.headings ${h} is not a non-blank line`);
  }
  for (const id of ids) {
    const b = BRIEFS?.[id];
    if (!b?.text?.trim()) E.push(`${at}: BRIEFS.${id} has no text (the book's last page)`);
  }
  for (const id of Object.keys(BRIEFS ?? {})) if (!ids.includes(id) && allBooks) W.push(`${at}: BRIEFS.${id} belongs to no registered book`);
  if (!LATER?.text?.trim()) E.push(`${at}: LATER.text missing (the closing line on the later prompts)`);
  else if (words(LATER.text) > (lang === 'en' ? BUDGET.later : BUDGET.later * ES_SLACK)) W.push(`${at}: LATER.text is ${words(LATER.text)} words — one short line`);

  if (lang === 'en' || PROMPT?.editorial) {
    // Match the archived original or explicitly edited reader version exactly.
    const heading = PROMPT?.editorial ? (lang === 'es' ? 'Reader prompt (editorial, Spanish)' : 'Reader prompt (editorial)') : 'Prompt (verbatim)';
    const src = PROMPT?.source && resolve(ROOT, PROMPT.source);
    if (!src || !existsSync(src)) W.push(`${at}: PROMPT.source ${PROMPT?.source ?? '(none)'} not found — the prompt cannot be checked verbatim`);
    else {
      const doc = promptFromDoc(src, heading);
      if (!doc) E.push(`${PROMPT.source}: no "## ${heading}" quote block`);
      else if (Array.isArray(PROMPT.lines)) {
        if (doc.length !== PROMPT.lines.length) E.push(`${at}: PROMPT has ${PROMPT.lines.length} lines, ${PROMPT.source} quotes ${doc.length}`);
        doc.forEach((l, i) => {
          if (PROMPT.lines[i] !== undefined && PROMPT.lines[i] !== l) E.push(`${at}: PROMPT.lines[${i}] does not match its documented wording: «${PROMPT.lines[i].slice(0, 60)}» ≠ «${l.slice(0, 60)}»`);
        });
      }
    }
  }
  if (lang === 'en') {
    const workflows = new Map();
    for (const id of ids) {
      const b = BRIEFS?.[id];
      if (!b?.text) continue;
      const file = b.source && resolve(ROOT, b.source);
      if (!file || !existsSync(file)) {
        W.push(`${at}: BRIEFS.${id}.source ${b.source ?? '(none)'} not found — the brief cannot be checked verbatim`);
        continue;
      }
      if (/\.m?js$/.test(file)) {
        if (!workflows.has(file)) workflows.set(file, briefsFromWorkflow(file));
        const doc = workflows.get(file)[id];
        if (doc === undefined) E.push(`${at}: BRIEFS.${id}: ${b.source} has no books[] entry with id '${id}'`);
        else if (doc === null) W.push(`${at}: BRIEFS.${id}: the brief in ${b.source} is built at run time — not checked`);
        else if (doc !== b.text) E.push(`${at}: BRIEFS.${id}.text is not verbatim ${b.source} (first difference at character ${[...doc].findIndex((c, k) => c !== b.text[k])})`);
      } else {
        const doc = readFileSync(file, 'utf8').replace(/^> ?/gm, '');
        if (!doc.includes(b.text)) E.push(`${at}: BRIEFS.${id}.text is not quoted verbatim in ${b.source}`);
      }
    }
  } else if (enMod) {
    // a translation keeps the structure: line count, blank lines, bullets, URLs
    const a = enMod.PROMPT?.lines ?? [], b = PROMPT?.lines ?? [];
    if (a.length !== b.length) E.push(`${at}: PROMPT has ${b.length} lines, the English ${a.length}`);
    a.forEach((l, i) => {
      const x = b[i];
      if (x === undefined) return;
      if (!l.trim() !== !x.trim()) E.push(`${at}: PROMPT.lines[${i}] ${l.trim() ? 'is blank, the English is not' : 'should be blank'}`);
      if (isBullet(l) !== isBullet(x)) E.push(`${at}: PROMPT.lines[${i}] ${isBullet(l) ? 'lost its "* " bullet' : 'gained a "* " bullet'}`);
      if (urls(l).join(' ') !== urls(x).join(' ')) E.push(`${at}: PROMPT.lines[${i}] URLs differ from the English (${urls(l).join(' ') || 'none'})`);
      if (x === l && l.trim() && !urls(l).length && (englishWords(l).length >= 2 || letterWords(l) >= 3)) E.push(`${at}: PROMPT.lines[${i}] untranslated «${l.slice(0, 60)}»`);
      if (/ /.test(x)) E.push(`${at}: PROMPT.lines[${i}]: narrow no-break space U+202F (no book font has it)`);
    });
    if ((PROMPT?.title ?? null) !== (enMod.PROMPT?.title ?? null) || JSON.stringify(PROMPT?.headings ?? null) !== JSON.stringify(enMod.PROMPT?.headings ?? null)) E.push(`${at}: PROMPT.title/headings differ from the English (the layout shares them)`);
    for (const id of ids) {
      const x = BRIEFS?.[id]?.text, l = enMod.BRIEFS?.[id]?.text;
      if (!x || !l) continue;
      if (x === l) E.push(`${at}: BRIEFS.${id} is the English text`);
      for (const u of urls(l)) if (!x.includes(u)) E.push(`${at}: BRIEFS.${id} lost the URL ${u}`);
      if (/ /.test(x)) E.push(`${at}: BRIEFS.${id}: narrow no-break space U+202F (no book font has it)`);
    }
    if (LATER?.text && enMod.LATER?.text && LATER.text === enMod.LATER.text) E.push(`${at}: LATER.text is the English text`);
    if (enMod.LATER?.text?.includes('docs/prompts/') && !LATER?.text?.includes('docs/prompts/')) E.push(`${at}: LATER.text must name docs/prompts/ like the English`);
    if (!mod.TRANSLATED_FROM) W.push(`${at}: no TRANSLATED_FROM — the making leaf labels the texts as translations`);
  }
  return { E, W, I };
}

// ------------------------------------------------------------------ the author mark

/** Paths of an author SVG in document order: { d, role, color } (role from the class, colour from var() fallbacks). */
function svgPaths(file) {
  const src = readFileSync(file, 'utf8');
  const out = [];
  const stack = [];
  for (const m of src.matchAll(/<(\/?)(g|path)\b([^>]*?)(\/?)>/g)) {
    const [, close, tag, attrs, self] = m;
    const attr = (k) => new RegExp(`\\b${k}="([^"]*)"`).exec(attrs)?.[1] ?? null;
    if (tag === 'g') {
      if (close) stack.pop();
      else if (!self) stack.push({ cls: attr('class'), fill: attr('fill') });
      continue;
    }
    const cls = attr('class') ?? [...stack].reverse().find((g) => g.cls)?.cls ?? '';
    const fill = attr('fill') ?? [...stack].reverse().find((g) => g.fill)?.fill ?? '';
    out.push({ d: attr('d'), role: /accent/.test(cls) ? 'accent' : 'body', color: (/#[0-9a-f]{3,8}/i.exec(fill)?.[0] ?? '').toLowerCase() });
  }
  return out;
}

function validateMarks(AUTHOR_MARKS, used) {
  const E = [], W = [], I = [];
  if (!AUTHOR_MARKS) {
    W.push('src/engine/typeset/marks.js not found (AUTHOR_MARKS): the author mark cannot be checked against public/author/');
    return { E, W, I };
  }
  for (const id of new Set([...Object.keys(AUTHOR_MARKS), ...used])) {
    const mark = AUTHOR_MARKS[id];
    const file = resolve(ROOT, 'public/author', `${id}.svg`);
    if (!mark) continue; // reported per book
    if (!existsSync(file)) {
      E.push(`marks.js "${id}": no source drawing public/author/${id}.svg`);
      continue;
    }
    const svg = svgPaths(file);
    const paths = mark.paths ?? [];
    if (paths.length !== svg.length) E.push(`marks.js "${id}": ${paths.length} paths, public/author/${id}.svg has ${svg.length}`);
    const colorOf = (p) => String(p.color ?? mark.colors?.[p.role] ?? mark.colors?.[p.role === 'body' ? 'primary' : p.role] ?? '').toLowerCase();
    svg.forEach((s, i) => {
      const p = paths[i];
      if (!p) return;
      if (p.d !== s.d) E.push(`marks.js "${id}": path ${i} d differs from the SVG (regenerate it from public/author/${id}.svg)`);
      if (p.role && p.role !== s.role && !(p.role === 'primary' && s.role === 'body')) E.push(`marks.js "${id}": path ${i} role "${p.role}", the SVG says "${s.role}"`);
      const c = colorOf(p);
      if (c && s.color && c !== s.color) E.push(`marks.js "${id}": path ${i} colour ${c}, the SVG ${s.color}`);
    });
  }
  return { E, W, I };
}

// ------------------------------------------------------------------ fit (typeset.html in a browser)

async function fitEditions(ids, langs) {
  const base = process.env.LAMINA_URL ?? 'http://127.0.0.1:5173';
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-unsafe-webgpu', '--enable-features=WebGPU', '--use-angle=metal', '--ignore-gpu-blocklist'],
  });
  const out = {};
  try {
    for (const id of ids) {
      out[id] = {};
      for (const lang of langs) {
        const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
        const logs = [];
        page.on('console', (m) => m.type() === 'error' && logs.push(m.text()));
        page.on('pageerror', (e) => logs.push(e.message));
        let r;
        try {
          await page.goto(`${base}/typeset.html?book=${id}&lang=${lang}&page=all&width=512`, { waitUntil: 'load', timeout: 30000 });
          await page.waitForFunction('window.typeset && window.typeset.ready && typeof window.typeset.ready.then === "function"', null, { timeout: 30000 });
          r = await page.evaluate(async () => {
            const t = await window.typeset.ready;
            if (!t?.sides) return { error: 'typeset.ready resolved without sides' };
            return {
              locale: t.manifest?.locale ?? null,
              leafCount: t.sides.leafCount ?? null,
              missing: Array.isArray(t.missing) ? t.missing : null,
              sides: t.sides.map((s, i) => ({
                i,
                layout: s.layout,
                folio: s.folio ?? null,
                key: s.key ?? null,
                plate: s.plate?.id ?? null,
                part: s.making?.part ?? null,
                scale: t.results[i]?.scale ?? null,
                overflow: Boolean(t.results[i]?.overflow),
                hOverflow: t.results[i]?.hOverflow ?? null,
              })),
            };
          });
        } catch (e) {
          r = { error: e.message.split('\n')[0] };
        }
        r.errors = logs.filter((l) => !/favicon|404/.test(l));
        out[id][lang] = r;
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  return { base, out };
}

function judgeFit(id, byLang, langs) {
  const E = [], W = [], rows = [];
  for (const lang of langs) {
    const r = byLang[lang];
    if (r.error) {
      E.push(`[${lang}] typeset.html failed: ${r.error}`);
      continue;
    }
    if (lang !== 'en' && r.locale !== lang) E.push(`[${lang}] typeset.html printed a "${r.locale}" edition: it ignores &lang=${lang}`);
    if (lang !== 'en' && r.missing?.length) E.push(`[${lang}] ${r.missing.length} strings printed untranslated: ${r.missing.slice(0, 10).map((k) => JSON.stringify(k)).join(', ')}${r.missing.length > 10 ? ' …' : ''}`);
    for (const e of r.errors.slice(0, 3)) E.push(`[${lang}] console: ${e.slice(0, 160)}`);
    for (const s of r.sides) {
      const floor = s.layout === 'making' ? MAKING_FLOOR : FLOOR;
      const at = `[${lang}] #${s.i} ${s.layout}${s.part ? `·${s.part}` : ''}${s.folio != null ? ` p.${s.folio}` : ''}`;
      if (s.overflow) E.push(`${at}: overflows`);
      if (s.scale != null && Math.round(s.scale * 1000) < floor) E.push(`${at}: auto-fit ${Math.round(s.scale * 1000) / 10} % < ${floor / 10} %`);
      for (const h of s.hOverflow ?? []) E.push(`${at}: sideways overflow — ${h.what ?? 'line'} «${String(h.text ?? '').slice(0, 50)}» ${h.over != null ? `+${Math.round(h.over)} px` : ''}`);
    }
    if (r.sides.length && r.sides.every((s) => s.hOverflow === null)) W.push(`[${lang}] renderPage reports no hOverflow: sideways overflow is not checked by this build`);
  }
  // the editions must print the same book: page sequence, folios, plates, making parts
  const [a, b] = langs.map((l) => byLang[l]);
  if (langs.length === 2 && a?.sides && b?.sides) {
    if (a.sides.length !== b.sides.length) E.push(`sides: ${a.sides.length} in ${langs[0]}, ${b.sides.length} in ${langs[1]}`);
    a.sides.forEach((s, i) => {
      const t = b.sides[i];
      if (!t) return;
      for (const k of ['layout', 'folio', 'plate', 'part']) if (s[k] !== t[k]) E.push(`#${i}: ${k} ${JSON.stringify(s[k])} in ${langs[0]}, ${JSON.stringify(t[k])} in ${langs[1]}`);
    });
  }
  const n = Math.max(...langs.map((l) => byLang[l]?.sides?.length ?? 0));
  for (let i = 0; i < n; i++) {
    const s = langs.map((l) => byLang[l]?.sides?.[i]).find(Boolean);
    const cells = langs.map((l) => {
      const x = byLang[l]?.sides?.[i];
      if (!x) return `${l} —    `;
      const flags = `${x.overflow ? ' OVERFLOW' : ''}${x.hOverflow?.length ? ' SIDEWAYS' : ''}`;
      return `${l} ${x.scale == null ? '  ?  ' : x.scale.toFixed(3)}${flags}`;
    });
    rows.push(`  #${String(i).padEnd(3)}${`${s.layout}${s.part ? `·${s.part}` : ''}`.padEnd(20)}${cells.join('   ')}`);
  }
  return { E, W, rows };
}

// ------------------------------------------------------------------ run

export { validate, validateSpanish, validatePills, validateMaking, validateMarks, judgeFit };

async function main() {
  const args = process.argv.slice(2);
  const flag = (n) => args.includes(`--${n}`);
  const opt = (n, d) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 ? args[i + 1] : d;
  };
  const VALUE_FLAGS = new Set(['lang', 'json', 'runtime']);
  const wanted = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && VALUE_FLAGS.has(args[i - 1].slice(2))));
  const langArg = opt('lang', 'en');
  if (!['en', 'es', 'all'].includes(langArg)) {
    console.error('usage: validate-books.mjs [book-id ...] [--lang en|es|all] [--fit] [--json out.json] [--runtime audit.json]');
    process.exit(2);
  }
  const LANGS = langArg === 'all' ? ['en', 'es'] : [langArg];

  const { BOOKS, MAKING } = await load('src/books/index.js');
  const schema = existsSync(resolve(ROOT, 'src/i18n/schema.js')) ? await load('src/i18n/schema.js') : null;
  const edition = existsSync(resolve(ROOT, 'src/i18n/edition.js')) ? await load('src/i18n/edition.js') : null;
  let AUTHOR_MARKS = null;
  if (existsSync(resolve(ROOT, 'src/engine/typeset/marks.js'))) {
    try {
      ({ AUTHOR_MARKS } = await load('src/engine/typeset/marks.js'));
    } catch (e) {
      console.log(`error  src/engine/typeset/marks.js does not load in Node: ${e.message.split('\n')[0]}`);
    }
  }

  const report = { generatedAt: new Date().toISOString(), langs: LANGS, sections: [] };
  let errors = 0;
  const print = (title, { E = [], W = [], I = [] }, extra = '') => {
    errors += E.length;
    report.sections.push({ title, errors: E, warnings: W, info: I });
    console.log(`\n${E.length ? '✗' : '✓'} ${title} — ${extra ? `${extra}, ` : ''}${E.length} errors, ${W.length} warnings${I.length ? `, ${I.length} notes` : ''}`);
    for (const e of E) console.log(`  error  ${e}`);
    for (const w of W) console.log(`  warn   ${w}`);
    if (flag('verbose')) for (const i of I) console.log(`  note   ${i}`);
  };

  // the registry is the list of books (src/books/es/ and src/books/making/ are not books)
  const registered = BOOKS.map((b) => b.id);
  for (const w of wanted) if (!registered.includes(w)) {
    console.log(`error  "${w}" is not registered in src/books/index.js`);
    errors++;
  }
  const entries = BOOKS.filter((b) => !wanted.length || wanted.includes(b.id));
  const stray = readdirSync(resolve(ROOT, 'src/books')).filter((f) => f.endsWith('.js') && f !== 'index.js' && !registered.includes(f.replace(/\.js$/, '')));
  if (stray.length && !wanted.length) print('src/books', { E: stray.map((f) => `${f} is not registered in src/books/index.js (BOOKS)`) });

  const english = new Map();
  for (const entry of entries) {
    let book;
    try {
      book = (await entry.load()).default;
    } catch (e) {
      print(`${entry.id}.js`, { E: [`does not load: ${e.message.split('\n')[0]}`] });
      continue;
    }
    english.set(entry.id, book);
    if (!LANGS.includes('en')) continue;
    const r = validate(book, AUTHOR_MARKS);
    r.E.push(...schemaCoverage(book, schema));
    if (book.id !== entry.id) r.E.push(`book: id "${book.id}" ≠ registry id "${entry.id}"`);
    print(`${entry.id}.js`, r, `${book.plates?.length ?? 0} plates`);
  }
  if (!entries.length) console.log(wanted.length ? 'no matching book' : 'no books registered in src/books/index.js');
  const ids = [...english.keys()];

  if (LANGS.includes('en')) {
    print('author mark', validateMarks(AUTHOR_MARKS, [...english.values()].map((b) => b.byline?.mark).filter(Boolean)));
  }

  const enMaking = new Map();
  for (const id of ids) {
    try {
      enMaking.set(id, MAKING?.en ? await MAKING.en(id) : null);
    } catch (e) {
      print(`making (en/${id})`, { E: [`making texts do not load: ${e.message.split('\n')[0]}`] });
    }
    if (LANGS.includes('en')) print(`making (en/${id})`, validateMaking(enMaking.get(id), 'en', [id], null, { allBooks: false }));
  }

  if (LANGS.includes('es')) {
    if (!schema || !edition) print('Spanish editions', { E: ['src/i18n/schema.js and src/i18n/edition.js are needed to check a translation'] });
    // the figure strings an audit extracted (--runtime): the dictionaries' coverage, and each
    // look-closer run-in against its pill
    const runtimeFile = opt('runtime');
    const audit = runtimeFile ? JSON.parse(readFileSync(resolve(runtimeFile), 'utf8')) : null;
    const pills = audit ? pillTexts(audit) : null;
    const index = pills ? dictionaryIndex(await loadDictionaries('es')) : null;
    for (const entry of entries) {
      const enBook = english.get(entry.id);
      if (!enBook || !schema || !edition) continue;
      const file = `src/books/es/${entry.id}.js`;
      if (!entry.es) {
        print(file, { E: [`no "es" loader for ${entry.id} in src/books/index.js`] });
        continue;
      }
      let mod;
      try {
        mod = await entry.es();
      } catch (e) {
        print(file, { E: [`does not load: ${e.message.split('\n')[0]}`] });
        continue;
      }
      if (!mod?.default) {
        print(file, { E: [`${mod?.missing ? 'not delivered yet' : 'exports no default edition'}: the Spanish reader shows the English text`] });
        continue;
      }
      const r = validateSpanish(entry.id, enBook, mod.default, schema, edition.composeEdition);
      if (pills) {
        const q = validatePills(entry.id, mod.default, pills, index);
        r.E.push(...q.E);
        r.W.push(...q.W);
      }
      print(file, r);
    }
    for (const id of ids) {
      let esMaking = null;
      try {
        esMaking = MAKING?.es ? await MAKING.es(id) : null;
      } catch (e) {
        print(`making (es/${id})`, { E: [`making texts do not load: ${e.message.split('\n')[0]}`] });
      }
      if (esMaking || !MAKING?.es) print(`making (es/${id})`, validateMaking(esMaking, 'es', [id], enMaking.get(id), { allBooks: false }));
    }
    const runtime = audit ? runtimeStrings(audit) : null;
    const d = await checkDictionaries({ lang: 'es', runtime });
    const n = d.dicts.files.reduce((s, f) => s + f.entries.length, 0);
    print('dictionaries (es)', d, `${n} entries and ${d.dicts.files.reduce((s, f) => s + f.patterns.length, 0)} patterns in ${d.dicts.files.length} files${runtime ? ' + figure strings' : ''}`);
    if (!runtime) console.log('  (figure strings are checked with --runtime <file from audit.mjs --i18n --json>)');
  }

  if (flag('fit')) {
    let fit = null;
    try {
      fit = await fitEditions(ids, LANGS);
    } catch (e) {
      print('fit', { E: [`cannot typeset in a browser: ${e.message.split('\n')[0]} (start npx vite, or a preview, and set LAMINA_URL)`] });
    }
    if (fit) {
      report.fit = fit.out;
      for (const id of ids) {
        const { E, W, rows } = judgeFit(id, fit.out[id], LANGS);
        print(`fit ${id} (${LANGS.join(' + ')})`, { E, W }, fit.base);
        console.log(rows.join('\n'));
      }
    }
  }

  const out = opt('json');
  if (out) {
    writeFileSync(resolve(out), JSON.stringify({ ...report, errors }, null, 2));
    console.log(`\nwrote ${out}`);
  }
  console.log(`\n${errors ? `✗ ${errors} errors` : '✓ no errors'}`);
  process.exit(errors ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
