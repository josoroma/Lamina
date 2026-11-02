#!/usr/bin/env node
// Acceptance test of the i18n core (src/i18n/index.js, edition.js, schema.js,
// es/index.js): lookups (exact keys, match patterns, fallback, placeholders),
// language state and preference, the formatters (CLDR outputs, never U+202F),
// the schema predicates, composeEdition on every book and on synthetic broken
// translations, the making texts, and — reported, not judged — the Spanish
// editions and dictionaries that exist today. Node only: no DOM, no server.
//
//   node scripts/i18n-core-test.mjs [--verbose]
//
// Exit code 1 when a check fails. Lookups run against FIXTURE below, in a
// second instance of src/i18n/index.js whose ./es/index.js resolves to it, so
// they do not depend on the dictionaries other areas are writing. The edition
// checks use the registered books; the synthetic translations are cut from a
// book that fits (Serpientes, Flores here), and a project without one (a
// bootstrapped starter) skips them and says so. `npm test` runs this file and
// scripts/hyphen-es-test.mjs.
// See .scratch/bilingual/design-i18n.md §10.A.5 and its review.
import { registerHooks } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');
const VERBOSE = process.argv.includes('--verbose');
const url = (p) => pathToFileURL(resolve(ROOT, p)).href;

const warnings = [];
process.on('warning', (w) => warnings.push(`${w.name}: ${w.message}`));

// ------------------------------------------------------------------ harness
let failed = 0;
let passed = 0;
let section = '';
const results = [];
const begin = (name) => {
  section = name;
  results.push({ name, fails: [], n: 0 });
};
const check = (what, ok, detail) => {
  const r = results.at(-1);
  r.n++;
  if (ok) passed++;
  else {
    failed++;
    r.fails.push(detail === undefined ? what : `${what} — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
  if (VERBOSE) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${section}: ${what}`);
};
const eq = (what, got, want) => check(what, Object.is(got, want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const same = (what, got, want) => check(what, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const throws = async (what, fn, re) => {
  try {
    await fn();
    check(what, false, 'did not throw');
  } catch (err) {
    check(what, !re || re.test(err.message), `threw "${err.message}"`);
  }
};
const quiet = async (fn) => {
  const keep = { error: console.error, debug: console.debug, warn: console.warn, info: console.info };
  const said = [];
  for (const k of Object.keys(keep)) console[k] = (...a) => said.push(`${k}: ${a.join(' ')}`);
  try {
    await fn();
  } finally {
    Object.assign(console, keep);
  }
  return said;
};
const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

// ------------------------------------------------------------------ fixture
const FIXTURE = {
  DOMAINS: {
    ui: { Contents: 'Índice', 'Paused. {beat}': 'En pausa. {beat}', '{n} s': '{n} s', '{layer} shown': 'Capa {layer}: visible', Head: 'Cabeza' },
    app: { Contents: 'Índice', Lesson: 'Lección' }, // same key, same value: fine
    typeset: { Contents: 'Sumario', 'Broken {x}': 'Roto {y}', Empty: '' }, // a collision, a placeholder slip, an empty value
  },
  PATTERNS: {
    snakes: {
      'Rattle segment {n}': 'Segmento {n} del cascabel',
      '{part} — dark markings': '{part}: marcas oscuras',
      'Segment {n}': 'Segmento {n}',
      'Segment {n} of the rattle': 'Segmento {n} del cascabel',
    },
    export: { '{a} — {b}': '{a}: {b}', '{n} cm': '{n} cm', 'Static words': 'Palabras fijas' }, // no word / no word / no placeholder
  },
};
const FIXTURE_URL = `data:text/javascript,${encodeURIComponent(`export const DOMAINS = ${JSON.stringify(FIXTURE.DOMAINS)}; export const PATTERNS = ${JSON.stringify(FIXTURE.PATTERNS)};`)}`;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === './es/index.js' && /\?(dev)?fixture$/.test(context.parentURL ?? '')) return { url: FIXTURE_URL, shortCircuit: true };
    return next(specifier, context);
  },
  // ?devfixture: the same module as a Vite dev build sees it (import.meta.env.DEV true)
  load(href, context, next) {
    const out = next(href, context);
    if (!href.endsWith('?devfixture')) return out;
    return { ...out, source: String(out.source).replace('import.meta.env?.DEV', 'true'), shortCircuit: true };
  },
});

const fx = await import(`${url('src/i18n/index.js')}?fixture`);
const i18n = await import(url('src/i18n/index.js'));
const schema = await import(url('src/i18n/schema.js'));
const edition = await import(url('src/i18n/edition.js'));
const registry = await import(url('src/books/index.js'));

// ------------------------------------------------------------------ language state
begin('language state');
eq('starts in English', fx.getLang(), 'en');
eq('English is loaded', fx.isLoaded('en'), true);
eq('Spanish is not loaded yet', fx.isLoaded('es'), false);
await throws('setLang before loadLang throws', () => fx.setLang('es'), /not loaded/);
await throws('loadLang of an unknown language rejects', () => fx.loadLang('fr'), /no dictionaries/);
const l1 = fx.loadLang('es');
const l2 = fx.loadLang('es');
eq('concurrent loads share one import', l1, l2);
await l1;
eq('Spanish is loaded', fx.isLoaded('es'), true);
await fx.loadLang('es'); // idempotent
const heard = [];
const off = fx.onLang((lang, prev) => heard.push(`${prev}→${lang}`));
fx.onLang(() => {
  throw new Error('a listener that throws');
});
let changed;
const said = await quiet(() => (changed = fx.setLang('es')));
eq('setLang reports a change', changed, true);
eq('getLang follows', fx.getLang(), 'es');
same('listeners hear (lang, prev)', heard, ['en→es']);
check('a throwing listener is caught and logged', said.some((s) => s.startsWith('error:')), said);
eq('setLang to the same language reports no change', fx.setLang('es'), false);
off();
await quiet(() => fx.setLang('en'));
same('an unsubscribed listener is not called', heard, ['en→es']);
eq('msg() is the identity', fx.msg('Cover'), 'Cover');
same('placeholders()', fx.placeholders('{a} and {b} or {a}'), ['a', 'b']);

begin('preference');
eq('no stored preference in Node', fx.readPreference(), null);
fx.writePreference('es'); // no storage: must not throw
eq("preferredLang(['de-DE','es-CR','en'])", fx.preferredLang(['de-DE', 'es-CR', 'en']), 'es');
eq('preferredLang([])', fx.preferredLang([]), 'en');
eq("preferredLang(['pt-BR','EN-us'])", fx.preferredLang(['pt-BR', 'EN-us']), 'en');
eq("preferredLang('es-419')", fx.preferredLang('es-419'), 'es');
eq("preferredLang(['es_CR'])", fx.preferredLang(['es_CR']), 'es');

// ------------------------------------------------------------------ lookups
begin('lookups');
const T = (key, vars) => fx.tl('es', key, vars);
eq('exact key', T('Contents'), 'Índice');
eq('exact key with a placeholder the caller fills', T('Paused. {beat}', { beat: 'El ataque' }), 'En pausa. El ataque');
eq('explicit "{n} s" filled', T('{n} s', { n: '2,4' }), '2,4 s');
eq('explicit keys are never compiled: "2.4 s" is not "{n} s"', T('2.4 s'), '2.4 s');
eq('match pattern', T('Rattle segment 3'), 'Segmento 3 del cascabel');
eq('the longest literal wins', T('Segment 3 of the rattle'), 'Segmento 3 del cascabel');
eq('the shorter pattern still matches its own strings', T('Segment 12'), 'Segmento 12');
eq('a captured English word that is a key is translated', T('Head — dark markings'), 'Cabeza: marcas oscuras');
eq('a captured value that is no key passes through', T('Tail tip — dark markings'), 'Tail tip: marcas oscuras');
eq('explicit vars win over captured values', T('Rattle segment 3', { n: 'IV' }), 'Segmento IV del cascabel');
eq('a pattern with no literal word is not used', T('Lorem — ipsum'), 'Lorem — ipsum');
eq('nor one whose only literal is short', T('12 cm'), '12 cm');
eq('a pattern without placeholders still matches exactly', T('Static words'), 'Palabras fijas');
eq('an unknown key falls back to English', T('Not in the dictionary'), 'Not in the dictionary');
eq('an empty value is not used', T('Empty'), 'Empty');
eq('the fallback still fills placeholders', T('Unknown {x}', { x: 'y' }), 'Unknown y');
eq('a value placeholder the caller does not give stays literal', T('Broken {x}', { x: 1 }), 'Roto {y}');
eq('English is the key itself', fx.tl('en', 'Paused. {beat}', { beat: 'Strike' }), 'Paused. Strike');
eq('English without vars returns the key', fx.tl('en', 'Contents'), 'Contents');
eq('an unknown placeholder stays literal', fx.tl('en', 'A {b}', {}), 'A {b}');
eq('a null var stays literal', fx.tl('en', 'A {b}', { b: null }), 'A {b}');
eq('a numeric var', fx.tl('en', '{n} percent', { n: 85 }), '85 percent');
eq('a non-string key', fx.tl('es', undefined), '');
eq('an empty key', fx.tl('es', ''), '');
eq('an unloaded language falls back to English', fx.tl('fr', 'Contents'), 'Contents');
eq('t() follows the current language (en)', fx.t('Contents'), 'Contents');
await quiet(() => fx.setLang('es'));
eq('t() follows the current language (es)', fx.t('Contents'), 'Índice');
await quiet(() => fx.setLang('en'));
eq('hasT exact', fx.hasT('Contents', 'es'), true);
eq('hasT pattern', fx.hasT('Rattle segment 9', 'es'), true);
eq('hasT miss', fx.hasT('Nothing like it', 'es'), false);
eq('hasT English', fx.hasT('Nothing like it', 'en'), true);
const miss = fx.missingKeys('es');
for (const k of ['Not in the dictionary', '2.4 s', 'Lorem — ipsum', 'Empty', 'Unknown {x}']) check(`missingKeys has ${JSON.stringify(k)}`, miss.includes(k), miss);
check('missingKeys has no hit and no hasT probe', !miss.includes('Contents') && !miss.includes('Nothing like it'), miss);
same('missingKeys in English is empty', fx.missingKeys('en'), []);
eq('the first definition of a key wins', T('Contents'), 'Índice');
const probs = fx.dictionaryProblems('es');
const has = (key, re) => probs.some((p) => p.key === key && re.test(p.problem));
check('problem: a key defined twice with different values', has('Contents', /also defined in "ui"/), probs);
check('problem: placeholders differ', has('Broken {x}', /placeholders/), probs);
check('problem: empty value', has('Empty', /empty/), probs);
check('problem: pattern without a literal word', has('{a} — {b}', /literal word/) && has('{n} cm', /literal word/), probs);
check('problem: pattern without placeholders', has('Static words', /without \{placeholders\}/), probs);
eq('no other problems', probs.length, 6);
const entries = fx.dictionaryEntries('es');
eq('dictionaryEntries lists every raw entry', entries.length, 17);
same('entries carry [key, value, domain, kind]', entries.find((e) => e[0] === 'Rattle segment {n}'), ['Rattle segment {n}', 'Segmento {n} del cascabel', 'snakes', 'pattern']);
const t0 = performance.now();
for (let i = 0; i < 3000; i++) T(`Rattle segment ${i}`); // more than the memo holds
eq('lookups stay right past the memo bound', T('Rattle segment 2999'), 'Segmento 2999 del cascabel');
const t1 = performance.now();
for (let i = 0; i < 100000; i++) T('Contents');
const t2 = performance.now();
if (VERBOSE) console.log(`  3000 pattern lookups ${(t1 - t0).toFixed(1)} ms · 100000 exact ${(t2 - t1).toFixed(1)} ms`);
check('100 000 exact lookups under 100 ms', t2 - t1 < 100, `${(t2 - t1).toFixed(1)} ms`);
const dbg = await quiet(() => T('Another missing key'));
same('no console output for a miss outside dev builds', dbg, []);

// ------------------------------------------------------------------ formatters
begin('formatters');
const S = (s) => s.replace(/ /g, '<nbsp>').replace(/ /g, '<nnbsp>');
const fmt = (what, got, want) => eq(what, S(got), S(want));
fmt('es 2.4', fx.fmtNumber(2.4, { lang: 'es' }), '2,4');
fmt('es 1234.5 (no grouping below five digits)', fx.fmtNumber(1234.5, { lang: 'es' }), '1234,5');
fmt('es 12345.67', fx.fmtNumber(12345.67, { lang: 'es' }), '12 345,67');
fmt('en 12345.67', fx.fmtNumber(12345.67, { lang: 'en' }), '12,345.67');
fmt('en 1234.5', fx.fmtNumber(1234.5, { lang: 'en' }), '1234.5');
fmt('minFrac', fx.fmtNumber(3, { minFrac: 1, lang: 'es' }), '3,0');
fmt('maxFrac below minFrac does not throw', fx.fmtNumber(3.14159, { minFrac: 2, maxFrac: 1, lang: 'en' }), '3.14');
fmt('fmtSeconds es', fx.fmtSeconds(2.4, { lang: 'es' }), '2,4 s');
fmt('fmtSeconds en', fx.fmtSeconds(2.4, { lang: 'en' }), '2.4 s');
fmt('fmtPercent es', fx.fmtPercent(0.85, { lang: 'es' }), '85 %');
fmt('fmtPercent en', fx.fmtPercent(0.85, { lang: 'en' }), '85%');
eq('fmtList es writes "e" before an i-sound', fx.fmtList(['EB Garamond', 'Cormorant Garamond', 'IBM Plex Sans Condensed', 'IBM Plex Mono'], { lang: 'es' }), 'EB Garamond, Cormorant Garamond, IBM Plex Sans Condensed e IBM Plex Mono');
eq('fmtList en', fx.fmtList(['EB Garamond', 'Cormorant Garamond', 'IBM Plex Mono'], { lang: 'en' }), 'EB Garamond, Cormorant Garamond, and IBM Plex Mono');
same('compareText es: ñ after n', ['ñandú', 'nube', 'Ñame'].sort((a, b) => fx.compareText(a, b, { lang: 'es' })), ['nube', 'Ñame', 'ñandú']);
same('compareText en', ['ñandú', 'nube', 'Ñame'].sort((a, b) => fx.compareText(a, b, { lang: 'en' })), ['Ñame', 'ñandú', 'nube']);
check('compareText is numeric', fx.compareText('Plate 2', 'Plate 10', { lang: 'en' }) < 0);
eq('quote es', fx.quote('Mira', { lang: 'es' }), '«Mira»');
eq('quote en', fx.quote('Look', { lang: 'en' }), '“Look”');
eq('formatters default to the current language', fx.fmtNumber(2.5), '2.5');
// R4: no face has U+202F; outputs must only ever use U+00A0
const narrow = [];
for (const lang of ['en', 'es']) {
  for (const x of [0, 0.5, 1, 999, 1000, 9999, 10000, 12345.678, 999999.99, 1e6, 123456789, -12345.5]) {
    for (const s of [fx.fmtNumber(x, { lang }), fx.fmtNumber(x, { minFrac: 2, maxFrac: 2, lang }), fx.fmtSeconds(x, { lang }), fx.fmtPercent(x / 1000, { lang })]) {
      if (/[  ]/.test(s)) narrow.push(S(s));
    }
  }
}
same('formatters never emit U+202F or U+2009', narrow, []);

// ------------------------------------------------------------------ schema
begin('schema');
const books = {};
for (const b of registry.BOOKS) books[b.id] = (await b.load()).default;
const ids = Object.keys(books);
if (!ids.length) {
  console.log('no books registered in src/books/index.js: nothing to compose');
  process.exit(1);
}
// The synthetic translations below are cut from registered books: this
// repository's Serpientes (seven plates with look-closer notes) and Flores (a
// plate without a status). Another project uses the first book that fits; a
// bootstrapped starter has none, and those checks are skipped (and said so).
const skipped = [];
const bigBook = books.serpientes ?? Object.values(books).find((b) => b.plates?.length >= 7 && b.plates.slice(0, 5).every((p) => p.lookCloser?.length)) ?? null;
const statusBook = books.flores ?? Object.values(books).find((b) => b.plates?.some((p) => p.status === null)) ?? null;
const TAXA = {
  'Viperidae · Crotalinae': true,
  Elapidae: true,
  'Elapidae · Hydrophiinae': true,
  Boidae: true,
  'Orchidaceae · Asparagales': true,
  'Heliconiaceae · Zingiberales': true,
  'Passifloraceae · Malpighiales': true,
  'Rubiaceae · Gentianales': true,
  'Bignoniaceae · Lamiales': true,
  'Nymphaeaceae · Nymphaeales': true,
  'Felidae · Pantherinae': true,
  'Viperidae, Crotalinae': true,
  'Colubroidea · Lampropeltini': true,
  'Human skull · norma frontalis': false,
  'Composition · Viperidae, Crotalinae': false,
  'Human skull · 8 cranial, 14 facial': false,
  '': false,
};
for (const [s, want] of Object.entries(TAXA)) eq(`isTaxon(${JSON.stringify(s)})`, schema.isTaxon(s), want);
for (const [id, book] of Object.entries(books)) {
  for (const p of book.plates) {
    const sci = schema.identicalAllowed(schema.SCI, p.scientific, p);
    eq(`${id}/${p.id}: identical scientific allowed ⇔ an authority`, sci, Boolean(p.authority?.trim()));
  }
  const undeclared = [];
  schema.walk(schema.MANIFEST, book, (node, v, path) => {
    if (!node) undeclared.push(path);
  });
  same(`${id}: every English path is declared`, undeclared, []);
}
eq('identicalAllowed SAME', schema.identicalAllowed(schema.SAME, 'Terciopelo'), true);
eq('identicalAllowed TEXT', schema.identicalAllowed(schema.TEXT, 'Venomous'), false);
const seen = [];
const sample = { id: 'x', plates: [{ id: 'p', status: null, lookCloser: [{ label: 'eye', text: 'Look' }], facts: [['a', 'b']] }], bogus: 1 };
const keysOk = [];
schema.walk(schema.MANIFEST, sample, (node, v, path, parent, key) => {
  seen.push(`${path || '(root)'}:${node?.kind ?? 'unknown'}`);
  keysOk.push(parent === null ? key === null : parent[key] === v);
});
same('walk paths and kinds', seen, ['(root):fields', 'id:id', 'plates:byId', 'plates[p]:fields', 'plates[p].id:id', 'plates[p].status:nullable', 'plates[p].lookCloser:byId', 'plates[p].lookCloser[eye]:fields', 'plates[p].lookCloser[eye].label:id', 'plates[p].lookCloser[eye].text:text', 'plates[p].facts:list', 'plates[p].facts[0]:tuple', 'plates[p].facts[0][0]:text', 'plates[p].facts[0][1]:text', 'bogus:unknown']);
check('walk gives parent[key] === value', keysOk.every(Boolean), keysOk);

// ------------------------------------------------------------------ composeEdition
begin('composeEdition');
const empty = (r) => ['missing', 'extra', 'changedIds', 'lengths', 'types', 'unknown', 'order'].every((k) => r[k].length === 0);
const strip = (e) => JSON.stringify({ ...e, locale: undefined, making: undefined });
for (const [id, english] of Object.entries(books)) {
  deepFreeze(english); // composing must never write to a manifest
  const { edition: ed, report } = edition.composeEdition(english, structuredClone(english), { lang: 'en' });
  check(`${id}: English composed with a copy of itself → empty report`, empty(report), report);
  eq(`${id}: en(edition.plates[0]) === english.plates[0]`, edition.en(ed.plates[0]), english.plates[0]);
  eq(`${id}: en(edition) === english`, edition.en(ed), english);
  eq(`${id}: same text and shape as English`, strip(ed), strip(english));
  eq(`${id}: EN is invisible to Object.keys`, Object.keys(ed.plates[0]).includes(String(edition.EN)), false);
  const none = edition.composeEdition(english, null, { lang: 'es' });
  same(`${id}: no translation → everything reported missing once`, none.report.missing, ['*']);
  eq(`${id}: no translation → English text, Spanish locale`, strip(none.edition), strip(english));
  eq(`${id}: no translation → locale es`, none.edition.locale, 'es');
  eq(`${id}: no translation → en() still works`, edition.en(none.edition.plates.at(-1)), english.plates.at(-1));
  const copy = edition.composeEdition(english, structuredClone(english), { lang: 'es' });
  same(`${id}: an untranslated copy → only its locale is wrong`, copy.report.changedIds, ['locale']);
}

// a synthetic, imperfect Spanish edition of a seven-plate book (Serpientes here)
if (bigBook) {
  const enS = bigBook;
  const es = structuredClone(enS);
  const [p0, p1, p2] = es.plates;
  es.locale = 'es';
  p0.lede = 'Lede en español.';
  delete p1.didYouKnow;
  p0.figure.params.species = 'boa-imperator';
  p0.bogus = 'x';
  p2.body = p2.body.slice(1);
  es.intro.title = 42;
  es.plates[3].lookCloser.pop();
  es.plates[4].lookCloser[0].name = 'Púa caudal';
  es.plates.push({ id: 'nueva', lede: 'x' });
  [es.plates[5], es.plates[6]] = [es.plates[6], es.plates[5]];
  es.theme = { ...es.theme, cloth: '#000000' };
  const { edition: edS, report: rS } = edition.composeEdition(enS, es, { lang: 'es' });
  const id0 = enS.plates[0].id;
  const lc3 = enS.plates[3].lookCloser.at(-1).label;
  const lc4 = enS.plates[4].lookCloser[0].label;
  eq('a translated text is used', edS.plates[0].lede, 'Lede en español.');
  check('a dropped text is missing, English printed', rS.missing.includes(`plates[${enS.plates[1].id}].didYouKnow`) && edS.plates[1].didYouKnow === enS.plates[1].didYouKnow, rS.missing);
  check('a changed figure param is reported, English kept', rS.changedIds.includes(`plates[${id0}].figure.params`) && edS.plates[0].figure.params.species === enS.plates[0].figure.params.species, rS.changedIds);
  check('a changed theme is reported, English kept', rS.changedIds.includes('theme') && edS.theme === enS.theme, rS.changedIds);
  check('a key only the translation has is extra', rS.extra.includes(`plates[${id0}].bogus`) && !('bogus' in edS.plates[0]), rS.extra);
  check('a short list is reported, English fills the gap', rS.lengths.includes(`plates[${enS.plates[2].id}].body`) && edS.plates[2].body.length === enS.plates[2].body.length, rS.lengths);
  check('a wrong type is reported, English kept', rS.types.includes('intro.title') && edS.intro.title === enS.intro.title, rS.types);
  check('a dropped look-closer row is missing once', rS.missing.includes(`plates[${enS.plates[3].id}].lookCloser[${lc3}]`), rS.missing);
  eq('a look-closer name the translation adds is kept', edS.plates[4].lookCloser.find((r) => r.label === lc4).name, 'Púa caudal');
  check('look-closer names the translation lacks are missing (R1.1)', rS.missing.includes(`plates[${id0}].lookCloser[${enS.plates[0].lookCloser[0].label}].name`), rS.missing);
  eq('…but not in English', edition.composeEdition(enS, structuredClone(enS), { lang: 'en' }).report.missing.length, 0);
  check('a plate only the translation has is extra', rS.extra.includes('plates[nueva]') && !edS.plates.some((p) => p.id === 'nueva'), rS.extra);
  check('reordered plates are reported, English order kept', rS.order.includes('plates') && edS.plates.map((p) => p.id).join() === enS.plates.map((p) => p.id).join(), rS.order);
  eq('en() of a composed row', edition.en(edS.plates[4].lookCloser[0]), enS.plates[4].lookCloser[0]);
  eq('en() of a composed list', edition.en(edS.plates[0].body), enS.plates[0].body);
  eq('en() of a string is the string', edition.en('texto'), 'texto');
  eq('en() of null', edition.en(null), null);
  check('the EN back-reference survives in JSON-free form only', !JSON.stringify(edS).includes('lamina.en'));
  const undeclared = edition.composeEdition({ ...enS, newField: 'x' }, null, { lang: 'en' });
  same('an undeclared English path is unknown (copied from English)', undeclared.report.unknown, ['newField']);
  eq('…and kept', undeclared.edition.newField, 'x');
  const noLocale = structuredClone(enS);
  delete noLocale.locale;
  check('a translation must name its locale', edition.composeEdition(enS, noLocale, { lang: 'es' }).report.missing.includes('locale'));
} else skipped.push('composeEdition on a synthetic translation (needs a book of seven plates with look-closer notes)');
// Explicitly omit an alternate title without disabling fallback for missing prose.
if (bigBook) {
  const translated = structuredClone(bigBook);
  translated.locale = 'es';
  translated.plates[0].commonAlt = null;
  translated.plates[0].lede = null;
  const path = `plates[${bigBook.plates[0].id}]`;
  const omitted = edition.composeEdition(bigBook, translated, { lang: 'es' });
  eq('explicit null removes an alternate title', omitted.edition.plates[0].commonAlt, null);
  check('an intentionally omitted alternate title is not missing', !omitted.report.missing.includes(`${path}.commonAlt`), omitted.report.missing);
  check('required prose still falls back when null', omitted.report.missing.includes(`${path}.lede`) && omitted.edition.plates[0].lede === bigBook.plates[0].lede, omitted.report);
  delete translated.plates[0].commonAlt;
  const missing = edition.composeEdition(bigBook, translated, { lang: 'es' });
  check('an absent alternate title still falls back and is reported', missing.edition.plates[0].commonAlt === bigBook.plates[0].commonAlt && missing.report.missing.includes(`${path}.commonAlt`), missing.report);
  translated.plates[0].commonAlt = '';
  const blank = edition.composeEdition(bigBook, translated, { lang: 'es' });
  check('a blank alternate title still falls back and is reported', blank.edition.plates[0].commonAlt === bigBook.plates[0].commonAlt && blank.report.missing.includes(`${path}.commonAlt`), blank.report);
  translated.plates[0].commonAlt = null;
  eq('English retains its alternate title even for a null override', edition.composeEdition(bigBook, translated, { lang: 'en' }).edition.plates[0].commonAlt, bigBook.plates[0].commonAlt);
}
// a status the English leaves null (a plate of Flores here)
if (statusBook) {
  const nullStatus = structuredClone(statusBook);
  const withStatus = structuredClone(statusBook);
  const plainId = nullStatus.plates.find((p) => p.status === null).id;
  withStatus.plates.find((p) => p.id === plainId).status = { code: 'LC', label: 'Preocupación menor', source: 'UICN' };
  withStatus.locale = 'es';
  const ns = edition.composeEdition(nullStatus, withStatus, { lang: 'es' });
  check('a status English leaves null is extra, and stays null', ns.report.extra.includes(`plates[${plainId}].status`) && ns.edition.plates.find((p) => p.id === plainId).status === null, ns.report.extra);
} else skipped.push('a translated status where English has none (needs a plate with status: null)');
await throws('a missing English manifest is a clear error', () => edition.composeEdition(null, null, { lang: 'es' }), /English manifest/);

// ------------------------------------------------------------------ making
begin('making');
check('the English making texts load', Boolean((await registry.MAKING?.en?.())?.PROMPT), 'src/books/making/index.js');
for (const id of Object.keys(books)) {
  const enMod = await registry.MAKING?.en?.(id).catch(() => null);
  const esMod = await registry.MAKING?.es?.(id).catch(() => null);
  const m = (await i18n.loadEdition(id, 'en')).making;
  check(`${id}: English making exists`, Boolean(m), m);
  if (!m || !enMod) continue;
  eq(`${id}: English prompt verbatim`, JSON.stringify(m.prompt.lines), JSON.stringify(enMod.PROMPT.lines));
  eq(`${id}: English brief verbatim`, m.brief?.text, enMod.BRIEFS[id]?.text);
  eq(`${id}: English closing line`, m.later?.text, enMod.LATER?.text);
  check(`${id}: English is not labelled a translation`, m.translated === false && m.prompt.lang === 'en' && m.brief.lang === 'en' && m.translatedFrom === null, m);
  same(`${id}: title and headings`, [m.prompt.title, m.prompt.headings], [enMod.PROMPT.title, enMod.PROMPT.headings]);
  const none = edition.composeMaking(enMod, null, { id, lang: 'es' });
  check(`${id}: no translation → English originals, unlabelled`, none.making.prompt.lang === 'en' && !none.making.translated && none.making.translatedFrom === null, none.making);
  same(`${id}: no translation → reported`, none.report.missing, ['*']);
  if (!esMod) continue;
  const es1 = edition.composeMaking(enMod, esMod, { id, lang: 'es' });
  check(`${id}: Spanish making is a translation`, es1.making.translated && es1.making.prompt.lang === 'es' && es1.making.brief.lang === 'es' && es1.making.translatedFrom === 'en', es1.making);
  same(`${id}: Spanish making composes cleanly`, es1.report, { ...es1.report, missing: [], extra: [], changedIds: [], lengths: [], types: [], unknown: [], order: [] });
  const partial = edition.composeMaking(enMod, { ...esMod, BRIEFS: {} }, { id, lang: 'es' });
  check(`${id}: a missing brief falls back alone`, partial.making.prompt.translated && !partial.making.brief.translated && partial.making.brief.lang === 'en' && !partial.making.translated, partial.making);
}

// ------------------------------------------------------------------ loading
begin('loading');
await throws('an unknown book rejects', () => i18n.loadEdition('nope', 'es'), /Unknown book/);
const [first, second = ids[0]] = ids; // serpientes and flores here
const fr = await i18n.loadEdition(first, 'fr');
check('a language without editions falls back, never throws', /no fr edition is registered/.test(i18n.lastReport(first, 'fr')?.fallback ?? ''), i18n.lastReport(first, 'fr'));
eq('…its text is English', fr.plates[0].lede, books[first].plates[0].lede);
eq('editions are cached', await i18n.loadEdition(first, 'en'), await i18n.loadEdition(first, 'en'));
const enEd = await i18n.loadEdition(second, 'en');
eq('the English edition is a copy (the module export untouched)', enEd !== books[second] && books[second].making === undefined, true);
eq('en(English edition) is the manifest', edition.en(enEd), books[second]);
eq('lastReport before a load is null', i18n.lastReport(ids.at(-1), 'de'), null);

// ------------------------------------------------------------------ what exists today (reported)
begin('Spanish editions today');
const today = [];
for (const id of Object.keys(books)) {
  const ed = await i18n.loadEdition(id, 'es');
  const r = i18n.lastReport(id, 'es');
  const counts = ['missing', 'extra', 'changedIds', 'lengths', 'types', 'unknown', 'order'].map((k) => `${k} ${r[k].length}`).join(' · ');
  // the validator's recipe: walk the composed edition, compare each text with en(parent)[key]
  const identical = [];
  schema.walk(schema.MANIFEST, ed, (node, v, path, parent, key) => {
    if (!schema.isTextKind(node) || typeof v !== 'string' || !v.trim() || !parent) return;
    const enParent = edition.en(parent);
    if (!r.fallback && enParent[key] === v && !schema.identicalAllowed(node, v, enParent)) identical.push(path);
  });
  today.push(`  ${id.padEnd(11)} ${r.fallback ? `fallback: ${r.fallback}` : 'translation'} · ${counts} · identical text ${identical.length}${r.notes.length ? ` · notes: ${r.notes.join('; ')}` : ''}`);
  if (VERBOSE) for (const k of ['missing', 'extra', 'changedIds', 'lengths', 'types', 'unknown', 'order']) if (r[k].length) today.push(`      ${k}: ${r[k].slice(0, 12).join(', ')}${r[k].length > 12 ? ' …' : ''}`);
  if (VERBOSE && identical.length) today.push(`      identical text: ${identical.slice(0, 12).join(', ')}${identical.length > 12 ? ' …' : ''}`);
  eq(`${id}: es edition locale`, ed.locale, 'es');
  same(`${id}: no undeclared English path`, r.unknown, []);
  eq(`${id}: en() reaches the English plate`, edition.en(ed.plates[0]), books[id].plates[0]);
  same(`${id}: plates in English order`, ed.plates.map((p) => p.id), books[id].plates.map((p) => p.id));
}
await i18n.loadLang('es');
const realProblems = i18n.dictionaryProblems('es');
const realEntries = i18n.dictionaryEntries('es');
const perDomain = {};
for (const [, , d, kind] of realEntries) perDomain[d] = (perDomain[d] ?? 0) + (kind === 'key' ? 1 : 0);
today.push(`  dictionaries: ${realEntries.length} entries (${Object.entries(perDomain).map(([d, n]) => `${d} ${n}`).join(', ') || 'none'}), ${realProblems.length} problems`);
for (const p of realProblems.slice(0, 20)) today.push(`      ${p.domain} ${p.kind} ${JSON.stringify(p.key)}: ${p.problem}`);

begin('dev builds');
const dev = await import(`${url('src/i18n/index.js')}?devfixture`);
const devSaid = await quiet(async () => {
  await dev.loadLang('es');
  dev.tl('es', 'Not there');
  dev.tl('es', 'Not there');
  dev.tl('es', 'Contents');
});
eq('one warning per dictionary problem', devSaid.filter((s) => s.startsWith('warn: [i18n] es ')).length, 6);
same('one debug line per missing key', devSaid.filter((s) => s.startsWith('debug:')), ['debug: [i18n] no es entry for "Not there"']);

begin('Node safety');
same('no Node warnings (e.g. touching localStorage)', warnings, []);

// ------------------------------------------------------------------ summary
for (const r of results) {
  console.log(`${r.fails.length ? '✗' : '✓'} ${r.name} — ${r.n - r.fails.length}/${r.n}`);
  for (const f of r.fails) console.log(`    FAIL ${f}`);
}
if (skipped.length) console.log(`\nskipped here (no book fits): ${skipped.join('; ')}`);
console.log('\nreported (not judged):');
for (const line of today) console.log(line);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
