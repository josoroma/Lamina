// Lámina i18n runtime — English / Español.
//
// Keys are the exact English strings (gettext style): code keeps English and
// calls t() only where text leaves for the screen, a canvas, an SVG or the
// a11y mirror, and never compares translated text. English needs no
// dictionary: t(key) is the key itself. Spanish comes from
// src/i18n/es/<domain>.js, one file per owner area, merged by loadLang('es'):
//   export default { … }    explicit keys: looked up exactly, never compiled;
//                           they may hold {placeholders} the caller fills,
//                           t('Paused. {beat}', { beat })
//   export const PATTERNS   match patterns for strings built at run time:
//                           'Rattle segment {n}' matches 'Rattle segment 3';
//                           each needs a literal word of 3 or more letters
// Table literals that reach t() later are marked msg('Cover') so the string
// extractor finds them. Numbers shown at run time go through the formatters.
// Node-safe (the validator imports it): no DOM access without a guard.
// See .scratch/bilingual/design-i18n.md §1.4 and §3, and its review
// (R1.11–R1.13, R4).

/** @typedef {'en'|'es'} Lang */
export const LANGS = Object.freeze(['en', 'es']); // also the switch order
export const DEFAULT_LANG = 'en';
export const LANG_NAMES = Object.freeze({ en: 'English', es: 'Español' }); // autonyms, never translated
export const LANG_SHORT = Object.freeze({ en: 'EN', es: 'ES' });
export const STORAGE_KEY = 'lamina.lang';

const DEV = Boolean(import.meta.env?.DEV);
/** Dictionaries per language; English has none. */
const SOURCES = { es: () => import('./es/index.js') };
const MEMO_MAX = 2048; // pattern lookups remembered per language
const MISSING_MAX = 1000;
const PLACEHOLDER = /\{(\w+)\}/g;

let current = DEFAULT_LANG;
const listeners = new Set();
const dicts = new Map(); // lang → { keys, patterns, memo, entries, problems } (see install)
const pending = new Map(); // lang → promise of a load in flight
const missing = new Map(); // lang → keys looked up and not found since loadLang

export const isLang = (x) => LANGS.includes(x);
export const getLang = () => current;
export const isLoaded = (lang) => lang === DEFAULT_LANG || dicts.has(lang);

/** Identity marker for table literals: msg('Cover') is a dictionary key the extractor collects; t() it at output. */
export const msg = (s) => s;

/** The {placeholder} names of a key or value, each once, in order. */
export const placeholders = (s) => [...new Set([...String(s ?? '').matchAll(PLACEHOLDER)].map((m) => m[1]))];

// ------------------------------------------------------------------ loading

/**
 * Load a language's dictionaries. Idempotent; concurrent calls share one
 * import. Rejects when they cannot be fetched (offline, a stale chunk after a
 * deploy): the caller stays in English.
 * @param {Lang} lang
 * @returns {Promise<void>}
 */
export function loadLang(lang) {
  if (isLoaded(lang)) return Promise.resolve();
  const source = SOURCES[lang];
  if (!source) return Promise.reject(new Error(`i18n: no dictionaries for "${lang}"`));
  if (!pending.has(lang)) {
    const load = source()
      .then((mod) => install(lang, mod))
      .finally(() => pending.delete(lang));
    pending.set(lang, load);
  }
  return pending.get(lang);
}

/**
 * Merge the domain files into one dictionary: mod.DOMAINS maps a domain to
 * its explicit keys, mod.PATTERNS to its match patterns. The first definition
 * of a key wins; problems (a key defined twice with different values, an
 * empty value, placeholders a value drops or invents, a pattern with no
 * literal word) are kept for dictionaryProblems() and logged in dev builds.
 */
function install(lang, mod) {
  const keys = new Map();
  const patterns = [];
  const entries = [];
  const problems = [];
  const first = new Map(); // kind + key → { value, domain }
  const add = (kind, domain, key, value) => {
    entries.push([key, value, domain, kind]);
    const problem = entryProblem(kind, key, value);
    if (problem) problems.push({ domain, key, kind, problem: problem.text });
    if (problem?.skip) return;
    const id = `${kind}\u0000${key}`;
    const prior = first.get(id);
    if (prior) {
      if (prior.value !== value) problems.push({ domain, key, kind, problem: `also defined in "${prior.domain}" with another value (that one is used)` });
      return;
    }
    first.set(id, { value, domain });
    if (kind === 'key') keys.set(key, value);
    else patterns.push(compile(key, value));
  };
  for (const [domain, dict] of Object.entries(mod?.DOMAINS ?? {})) for (const [k, v] of Object.entries(dict ?? {})) add('key', domain, k, v);
  for (const [domain, dict] of Object.entries(mod?.PATTERNS ?? {})) for (const [k, v] of Object.entries(dict ?? {})) add('pattern', domain, k, v);
  patterns.sort((a, b) => b.literal - a.literal); // longest literal first (stable for ties)
  dicts.set(lang, { keys, patterns, memo: new Map(), entries, problems });
  missing.set(lang, new Set());
  if (DEV) for (const p of problems) console.warn(`[i18n] ${lang} ${p.domain} ${p.kind} ${JSON.stringify(p.key)}: ${p.problem}`);
}

/** What is wrong with one dictionary entry, if anything; `skip` entries are not used. */
function entryProblem(kind, key, value) {
  if (typeof value !== 'string' || !value.trim()) return { skip: true, text: 'the value is empty or not a string' };
  if (kind === 'pattern') {
    const literal = key.replace(PLACEHOLDER, ' ');
    if (!/\p{L}{3,}/u.test(literal)) return { skip: true, text: 'a match pattern needs a literal word of 3 or more letters (it would match unrelated strings)' };
    if (literal === key) return { text: 'a match pattern without {placeholders}: make it an explicit key' };
  }
  const a = placeholders(key).sort().join(', ');
  const b = placeholders(value).sort().join(', ');
  if (a !== b) return { text: `the value's placeholders {${b}} differ from the key's {${a}}` };
  return null;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 'Rattle segment {n}' → /^Rattle segment (.+?)$/s, names ['n'], literal length 15. */
function compile(key, value) {
  const names = [];
  let literal = 0;
  const source = key
    .split(/(\{\w+\})/)
    .map((part, i) => {
      if (i % 2) {
        names.push(part.slice(1, -1));
        return '(.+?)';
      }
      literal += part.length;
      return escapeRe(part);
    })
    .join('');
  return { key, value, names, literal, re: new RegExp(`^${source}$`, 's') };
}

// ------------------------------------------------------------------ language state

/**
 * Make `lang` the current language (synchronous). Sets <html lang> when a
 * document exists, stores the preference when `persist`, then calls every
 * onLang listener (their errors are caught and logged).
 * @param {Lang} lang
 * @param {{ persist?: boolean }} [opts]
 * @returns {boolean} whether the language changed
 */
export function setLang(lang, { persist = false } = {}) {
  if (!isLoaded(lang)) throw new Error(`i18n: language "${lang}" is not loaded`);
  const prev = current;
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  if (persist) writePreference(lang);
  if (prev === lang) return false;
  for (const cb of [...listeners]) {
    try {
      cb(lang, prev);
    } catch (err) {
      console.error(err);
    }
  }
  return true;
}

/** @param {(lang: Lang, prev: Lang) => void} cb  @returns {() => void} unsubscribe */
export function onLang(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** window.localStorage, or null (Node; blocked storage throws on the property access itself). */
function storage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The language the reader picked with the switch, if any. */
export function readPreference() {
  try {
    const v = storage()?.getItem(STORAGE_KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

export function writePreference(lang) {
  if (!isLang(lang)) return;
  try {
    storage()?.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage blocked or full: the URL still carries the language */
  }
}

/**
 * The language for a route that names none: the stored preference, else the
 * first browser language whose primary subtag is one of LANGS, else English.
 * @param {readonly string[]|string} [languages]  navigator.languages (ordered by preference)
 * @returns {Lang}
 */
export function preferredLang(languages = globalThis.navigator?.languages ?? []) {
  const stored = readPreference();
  if (stored) return stored;
  for (const tag of typeof languages === 'string' ? [languages] : languages ?? []) {
    const primary = String(tag).toLowerCase().split(/[-_]/)[0];
    if (isLang(primary)) return primary;
  }
  return DEFAULT_LANG;
}

// ------------------------------------------------------------------ lookup

/**
 * Translate `key` into `lang` (typeset pages and exports pass their own
 * language; the live UI uses t()). Exact entry, else the first match pattern
 * (its captured values become placeholders, translated when they are keys
 * themselves), else the English key — never a blank — recorded in
 * missingKeys(). Then {placeholders} are filled from `vars` (they win over
 * captured values); unknown ones stay literal so mistakes show.
 * @param {string} lang
 * @param {string} key   the exact English string
 * @param {Record<string, unknown>} [vars]
 * @returns {string}
 */
export function tl(lang, key, vars) {
  if (typeof key !== 'string') return key == null ? '' : String(key);
  const dict = lang === DEFAULT_LANG ? null : dicts.get(lang);
  if (!dict || !key) return fill(key, null, vars);
  const exact = dict.keys.get(key);
  if (exact !== undefined) return fill(exact, null, vars);
  const hit = matchPattern(dict, key);
  if (hit) return fill(hit.value, hit.caps, vars);
  noteMissing(lang, key);
  return fill(key, null, vars);
}

/** Translate into the current language. */
export const t = (key, vars) => tl(current, key, vars);

/** Whether `key` has an entry (exact or pattern) in `lang`; English always does. */
export function hasT(key, lang = current) {
  if (lang === DEFAULT_LANG) return true;
  const dict = dicts.get(lang);
  if (!dict || typeof key !== 'string') return false;
  return dict.keys.has(key) || Boolean(matchPattern(dict, key));
}

function matchPattern(dict, key) {
  if (!dict.patterns.length) return null;
  let hit = dict.memo.get(key);
  if (hit !== undefined) return hit;
  hit = null;
  for (const p of dict.patterns) {
    const m = p.re.exec(key);
    if (!m) continue;
    const caps = {};
    p.names.forEach((name, i) => (caps[name] = dict.keys.get(m[i + 1]) ?? m[i + 1]));
    hit = { value: p.value, caps };
    break;
  }
  if (dict.memo.size >= MEMO_MAX) dict.memo.delete(dict.memo.keys().next().value);
  dict.memo.set(key, hit);
  return hit;
}

/** Fill {placeholders}: explicit `vars` first, then captured values; unknown ones stay. */
function fill(s, caps, vars) {
  if (!caps && !vars) return s;
  return s.replace(PLACEHOLDER, (m, k) => {
    const v = vars && Object.hasOwn(vars, k) && vars[k] != null ? vars[k] : caps && Object.hasOwn(caps, k) ? caps[k] : undefined;
    return v === undefined ? m : String(v);
  });
}

function noteMissing(lang, key) {
  const seen = missing.get(lang);
  if (!seen || seen.has(key) || seen.size >= MISSING_MAX) return;
  seen.add(key);
  if (DEV) console.debug(`[i18n] no ${lang} entry for ${JSON.stringify(key)}`);
}

/** Keys looked up in `lang` and not found since its dictionaries loaded (automation asserts it is empty). */
export const missingKeys = (lang = current) => [...(missing.get(lang) ?? [])];

/**
 * Every dictionary entry of `lang`, unmerged, in domain order (validator and
 * tooling): [key, value, domain, kind], kind 'key' (explicit) or 'pattern'.
 */
export const dictionaryEntries = (lang = current) => (dicts.get(lang)?.entries ?? []).map((e) => [...e]);

/** Problems found while merging `lang`'s dictionaries: [{ domain, key, kind, problem }]. */
export const dictionaryProblems = (lang = current) => (dicts.get(lang)?.problems ?? []).map((p) => ({ ...p }));

// ------------------------------------------------------------------ formatters
// Locales: numbers en / es-CR (decimal comma, no-break-space grouping from five
// digits with 'min2'), percent en / es ('85 %'), lists and collation en / es.
// Output never holds U+202F or U+2009: the book faces lack them (R4).

const NUMBER_LOCALE = { en: 'en', es: 'es-CR' };
const formatters = new Map();
function formatter(Ctor, locale, options) {
  const id = `${Ctor.name}|${locale}|${JSON.stringify(options)}`;
  let f = formatters.get(id);
  if (!f) formatters.set(id, (f = new Ctor(locale, options)));
  return f;
}
const nbsp = (s) => s.replace(/[  ]/g, ' ');
const langOf = (lang) => (isLang(lang) ? lang : current);

/** 2.4 → '2.4' | '2,4'; 12345.67 → '12,345.67' | '12 345,67' (no-break space). */
export function fmtNumber(x, { minFrac = 0, maxFrac = 2, lang = current } = {}) {
  const options = { minimumFractionDigits: minFrac, maximumFractionDigits: Math.max(minFrac, maxFrac), useGrouping: 'min2' };
  return nbsp(formatter(Intl.NumberFormat, NUMBER_LOCALE[langOf(lang)], options).format(x));
}

/** One decimal and the unit after a no-break space: '2.4 s' | '2,4 s'. */
export const fmtSeconds = (x, { lang = current } = {}) => `${fmtNumber(x, { minFrac: 1, maxFrac: 1, lang })} s`;

/** 0.85 → '85%' | '85 %' (no-break space). */
export function fmtPercent(fraction, { lang = current } = {}) {
  return nbsp(formatter(Intl.NumberFormat, langOf(lang), { style: 'percent', maximumFractionDigits: 0 }).format(fraction));
}

/** ['a', 'b', 'c'] → 'a, b, and c' | 'a, b y c' (Spanish writes "e" before an i-sound). */
export function fmtList(items, { lang = current } = {}) {
  return formatter(Intl.ListFormat, langOf(lang), { type: 'conjunction' }).format([...(items ?? [])].map(String));
}

/** Sort order of the language: Spanish puts ñ after n (glossaries, indexes). */
export function compareText(a, b, { lang = current } = {}) {
  return formatter(Intl.Collator, langOf(lang), { sensitivity: 'base', numeric: true }).compare(String(a ?? ''), String(b ?? ''));
}

/** First-level quotation marks: “…” | «…». */
export const quote = (text, { lang = current } = {}) => (langOf(lang) === 'es' ? `«${text}»` : `“${text}”`);

// ------------------------------------------------------------------ editions

export { EN, en, composeEdition, composeMaking, EditionLoadError } from './edition.js';
import { loadEdition as loadEditionFor, lastReport as lastReportFor } from './edition.js';
/**
 * The book in a language: the composed edition (English text where a
 * translation is missing). Rejects with an EditionLoadError when a file it
 * needs cannot be fetched (offline, a stale chunk); the next call fetches again.
 */
export const loadEdition = (id, lang = current) => loadEditionFor(id, lang);
/** What composing that edition found (null until it loads): see edition.js. */
export const lastReport = (id, lang = current) => lastReportFor(id, lang);
