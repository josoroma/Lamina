// Book editions: compose a language edition of a book from its English
// manifest and the translation (src/books/es/<id>.js), with its "How this book
// was made" texts (src/books/making/*). Pure and Node-safe (the validator
// imports it): no DOM, no state but caches. See
// .scratch/bilingual/design-i18n.md §2 and §7.1.
//
// The merge follows the key set of ./schema.js: ID values always come from
// English, text from the translation (the English text where it is missing,
// never a blank; clearable optional text accepts explicit null), lists align by index, plates and look-closer rows by key,
// and the result keeps English's shape and order. Every composed object and
// array carries its English counterpart under the EN symbol (non-enumerable:
// Object.keys, JSON and structuredClone ignore it; a spread copy drops it), so
// styling decided from words — how-to icons, the warning badge, binomial
// italics — reads en(node) and both editions are styled alike.
//
// Report (composeEdition, lastReport): what the translation lacks or breaks,
// as paths like 'plates[coral].lookCloser[red-ring].text' ('*' = all of it;
// loadEdition adds the making texts' paths under 'making.'):
//   fallback    why the edition shows English text throughout (no translation
//               registered, no file yet, a file without a default export), or null
//   notes       other gaps in words (English making texts not registered or
//               not fetched, no brief for the book)
//   missing     text the translation lacks: English is printed there
//   extra       keys, rows or values only the translation has (dropped)
//   changedIds  ID values the translation changed (English kept)
//   lengths     lists whose length differs from English
//   types       values of the wrong type (English kept)
//   unknown     English paths the schema does not declare (copied from English)
//   order       rows in another order than English (English order kept)

import * as registry from '../books/index.js'; // a namespace: older registries have no MAKING
import { MANIFEST, MAKING_SCHEMA, keyPath, itemPath, isPlainObject } from './schema.js';

export const EN = Symbol.for('lamina.en');

/** The English counterpart of a composed node (the node itself when it is English). */
export const en = (node) => (node && node[EN]) ?? node;

const tag = (out, enV) => Object.defineProperty(out, EN, { value: enV });

const newReport = (lang) => ({
  lang,
  fallback: null,
  notes: [],
  missing: [],
  extra: [],
  changedIds: [],
  lengths: [],
  types: [],
  unknown: [],
  order: [],
});
const LISTS = ['missing', 'extra', 'changedIds', 'lengths', 'types', 'unknown', 'order'];
const note = (list, path) => list.push(path || '*');

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]));
}

// ------------------------------------------------------------------ merge

const present = (v) => v != null && (typeof v !== 'string' || v.trim() !== '');

/** Merge one value: `node` its schema node, `xxV` the translation's value (undefined when absent). */
function compose(node, enV, xxV, path, r) {
  if (node.kind === 'nullable') node = node.of; // (documents where English sets null)
  if (enV == null) {
    // English has nothing here, so neither has the edition
    if (present(xxV)) note(r.extra, path);
    return enV;
  }
  if (xxV === null) {
    if (node.clearable && r.lang !== 'en') return null;
    xxV = undefined; // other nulls remain missing translations, with English fallback
  }
  switch (node.kind) {
    case 'id':
      if (xxV !== undefined && !deepEqual(xxV, enV)) note(r.changedIds, path);
      return enV;
    case 'locale':
      if (xxV === undefined) {
        if (r.lang !== 'en') note(r.missing, path); // a translation names its language
      } else if (xxV !== r.lang) note(r.changedIds, path);
      return r.lang;
    case 'text':
    case 'same':
    case 'sci':
    case 'taxon':
      if (typeof enV !== 'string' || (xxV !== undefined && typeof xxV !== 'string')) {
        note(r.types, path);
        return enV;
      }
      if (!enV.trim()) {
        if (xxV?.trim()) note(r.extra, path); // nothing to translate here
        return enV;
      }
      if (xxV?.trim()) return xxV;
      note(r.missing, path);
      return enV;
    default:
      return xxV === undefined ? composeAbsent(node, enV, path, r) : composeContainer(node, enV, xxV, path, r);
  }
}

/**
 * A container the translation lacks: English throughout, reported once at its
 * path when it holds text (an ID-only subtree may be left out).
 */
function composeAbsent(node, enV, path, r) {
  const sub = newReport(r.lang);
  const out = composeContainer(node, enV, undefined, path, sub);
  if (sub.missing.length) note(r.missing, path);
  r.types.push(...sub.types); // English-side problems still count
  r.unknown.push(...sub.unknown);
  return out;
}

/** The English value when its shape breaks the schema; null when it fits. */
function misfit(node, enV, path, r) {
  const fits = node.kind === 'fields' ? isPlainObject(enV) : Array.isArray(enV);
  if (fits) return null;
  note(r.types, path);
  return { value: enV };
}

/** A translated container of the wrong shape counts as absent (and is reported). */
const wrongShape = (node, xxV) => xxV !== undefined && (node.kind === 'fields' ? !isPlainObject(xxV) : !Array.isArray(xxV));

function composeContainer(node, enV, xxV, path, r) {
  const bad = misfit(node, enV, path, r);
  if (bad) return bad.value;
  if (wrongShape(node, xxV)) {
    note(r.types, path);
    return composeAbsent(node, enV, path, r);
  }
  switch (node.kind) {
    case 'list':
    case 'tuple': {
      if (xxV && xxV.length !== enV.length) note(r.lengths, path);
      const out = enV.map((v, i) => {
        const child = node.kind === 'list' ? node.of : node.items[i];
        if (!child) {
          note(r.unknown, itemPath(path, i)); // a tuple longer than the schema declares
          return v;
        }
        return v === undefined ? v : compose(child, v, xxV?.[i], itemPath(path, i), r);
      });
      return tag(out, enV);
    }
    case 'byId': {
      const k = node.key;
      // rows queue up per key, so a key repeated in English meets the same occurrence in the translation
      const queues = new Map();
      for (const x of xxV ?? []) {
        if (!queues.has(x?.[k])) queues.set(x?.[k], []);
        queues.get(x?.[k]).push(x);
      }
      const out = enV.map((v, i) => compose(node.of, v, queues.get(v?.[k])?.shift(), itemPath(path, v?.[k] ?? i), r));
      for (const [id, rest] of queues) for (let n = 0; n < rest.length; n++) note(r.extra, itemPath(path, id));
      if (xxV) {
        const enIds = enV.map((v) => v?.[k]);
        const both = new Set(xxV.map((x) => x?.[k]).filter((id) => enIds.includes(id)));
        const a = enIds.filter((id) => both.has(id));
        const b = xxV.map((x) => x?.[k]).filter((id) => both.has(id));
        if (a.some((id, i) => id !== b[i])) note(r.order, path);
      }
      return tag(out, enV);
    }
    case 'fields': {
      const out = {};
      for (const key of Object.keys(enV)) {
        if (enV[key] === undefined) continue;
        const child = node.fields[key];
        if (!child) {
          note(r.unknown, keyPath(path, key));
          out[key] = enV[key];
        } else out[key] = compose(child, enV[key], xxV?.[key], keyPath(path, key), r);
      }
      // texts English leaves out but a translation sets (look-closer names, R1.1)
      for (const [key, child] of Object.entries(node.fields)) {
        if (!child.optionalInEnglish || enV[key] !== undefined) continue;
        const v = xxV?.[key];
        if (typeof v === 'string' && v.trim()) out[key] = v;
        else if (v !== undefined && typeof v !== 'string') note(r.types, keyPath(path, key));
        else if (r.lang !== 'en') note(r.missing, keyPath(path, key));
      }
      for (const key of Object.keys(xxV ?? {})) {
        if (xxV[key] !== undefined && enV[key] === undefined && !node.fields[key]?.optionalInEnglish) note(r.extra, keyPath(path, key));
      }
      return tag(out, enV);
    }
    default:
      throw new Error(`edition: unknown schema node "${node.kind}" at ${path || 'the root'}`);
  }
}

// ------------------------------------------------------------------ editions

/**
 * Compose the `lang` edition of a book.
 * @param {object} enBook         the English manifest (never mutated)
 * @param {object|null} xxBook    its translation; null when there is none (English text, reported)
 * @param {{ lang?: string, making?: object|null }} [opts]  making: composeMaking().making
 * @returns {{ edition: object, report: object }}
 */
export function composeEdition(enBook, xxBook, { lang = 'en', making = null } = {}) {
  if (!isPlainObject(enBook)) throw new TypeError('composeEdition: the English manifest is not an object');
  const report = newReport(lang);
  const edition = compose(MANIFEST, enBook, xxBook ?? (lang === 'en' ? enBook : undefined), '', report);
  edition.locale = lang;
  edition.making = making;
  return { edition, report };
}

/** One book's making texts from a making module (named exports MODEL, PROMPT, BRIEFS, LATER). */
function makingData(mod, id) {
  const src = mod?.PROMPT || mod?.BRIEFS ? mod : mod?.default;
  if (!src?.PROMPT && !src?.BRIEFS) return null;
  return { model: src.MODEL, prompt: src.PROMPT, brief: src.BRIEFS?.[id], later: src.LATER };
}

/**
 * "How this book was made" for book `id` in `lang`:
 *   { lang, model, translated, translatedFrom,
 *     prompt: { source, lines, title, headings, lang, translated },
 *     brief:  { source, text, lang, translated },
 *     later:  { source, text, lang, translated } }
 * from the English originals (src/books/making/index.js) and their
 * translation (making/<lang>.js). A part the translation lacks is printed in
 * English: its `lang` is 'en' and it is not labelled a translation.
 * `translated` (top level) is true only when every part is.
 * @param {object|null} enMod  the English making module
 * @param {object|null} xxMod  the translation's module, or null
 * @param {{ id: string, lang?: string }} opts
 * @returns {{ making: object|null, report: object }}
 */
export function composeMaking(enMod, xxMod, { id, lang = 'en' } = {}) {
  const report = newReport(lang);
  const enData = makingData(enMod, id);
  if (!enData) return { making: null, report };
  const xxData = lang === 'en' ? enData : makingData(xxMod, id);
  const making = compose(MAKING_SCHEMA, enData, xxData ?? undefined, '', report);
  const bad = [...report.missing, ...report.types];
  const parts = ['prompt', 'brief', 'later'].filter((part) => making[part]);
  for (const part of parts) {
    const translated = lang !== 'en' && xxData?.[part] != null && !bad.some((p) => p === '*' || p === part || p.startsWith(`${part}.`));
    Object.assign(making[part], { lang: translated ? lang : 'en', translated });
  }
  making.lang = lang;
  making.translated = parts.length > 0 && parts.every((part) => making[part].translated);
  making.translatedFrom = parts.some((part) => making[part].translated) ? xxMod?.TRANSLATED_FROM ?? xxMod?.default?.TRANSLATED_FROM ?? 'en' : null;
  return { making, report };
}

// ------------------------------------------------------------------ loading

const cache = new Map(); // `${id}|${lang}` → Promise<edition>
const reports = new Map(); // `${id}|${lang}` → report

/**
 * A file an edition needs could not be loaded: the English manifest, the
 * translation or the making texts (offline, a stale chunk after a deploy, an
 * error inside the file). loadEdition caches nothing for it, so a later call
 * fetches again; a caller keeps the edition it shows and says so.
 *   book, lang  the edition asked for
 *   part        'manifest' | 'translation' | 'making'
 *   cause       the import's error
 */
export class EditionLoadError extends Error {
  constructor(book, lang, part, what, cause) {
    super(`${what} could not be loaded: ${cause?.message ?? cause}`, { cause });
    this.name = 'EditionLoadError';
    this.book = book;
    this.lang = lang;
    this.part = part;
  }
}

/** Run a module loader; its failure becomes an EditionLoadError. */
async function fetchPart(load, book, lang, part, what) {
  try {
    return await load();
  } catch (err) {
    throw new EditionLoadError(book, lang, part, what, err);
  }
}

const partial = new WeakSet(); // editions built while the English making texts could not be fetched

/**
 * The `lang` edition of book `id`, cached once it loads. English is the
 * manifest itself (a shallow copy with `locale` and `making`); another
 * language is composed with its translation. A book with no translation in
 * `lang` (none registered, no file yet) falls back to the English text (its
 * pages still carry `locale`, so their furniture speaks the language) and
 * lastReport() says why. Rejects for an unknown book, and with an
 * EditionLoadError when the English manifest, the translation or the
 * translated making texts cannot be fetched: no page shows English text in
 * place of a translation that exists. When only the English making texts
 * cannot be fetched the book comes without its making leaf (noted). Neither
 * is cached: the next call fetches again.
 * @param {string} id
 * @param {string} [lang]
 * @returns {Promise<object>}
 */
export function loadEdition(id, lang = 'en') {
  const key = `${id}|${lang}`;
  if (!cache.has(key)) {
    const load = buildEdition(id, lang);
    cache.set(key, load);
    const evict = () => cache.get(key) === load && cache.delete(key);
    load.then((edition) => partial.has(edition) && evict(), evict);
  }
  return cache.get(key);
}

/** What composing that edition found, or null before it loaded. */
export const lastReport = (id, lang = 'en') => reports.get(`${id}|${lang}`) ?? null;

async function buildEdition(id, lang) {
  const entry = registry.BOOKS.find((b) => b.id === id);
  if (!entry) throw new Error(`Unknown book "${id}"`);
  const [english, making, translation] = await Promise.all([
    fetchPart(() => entry.load(), id, lang, 'manifest', `the English manifest of "${id}"`).then((m) => m.default),
    loadMaking(id, lang),
    lang === 'en' ? null : loadTranslation(entry, lang),
  ]);
  let edition, report;
  if (lang === 'en') {
    edition = tag({ ...english, locale: 'en', making: making.making }, english);
    report = newReport('en');
  } else {
    ({ edition, report } = composeEdition(english, translation.book, { lang, making: making.making }));
    report.fallback = translation.why;
  }
  for (const list of LISTS) report[list].push(...making.report[list].map((p) => (p === '*' ? 'making' : `making.${p}`)));
  report.notes.push(...making.notes);
  if (making.unfetched) partial.add(edition);
  reports.set(`${id}|${lang}`, report);
  announce(id, report);
  return edition;
}

/**
 * The translation's manifest, or null and why the book has none: no loader
 * for `lang`, or no file yet (the registry resolves an absent file to
 * { default: null, missing: true }). A file that cannot be loaded rejects
 * (EditionLoadError): composing English text in its place would show a
 * book in the wrong language that no later call could mend.
 */
async function loadTranslation(entry, lang) {
  if (typeof entry[lang] !== 'function') return { book: null, why: `no ${lang} edition is registered for "${entry.id}"` };
  const file = `src/books/${lang}/${entry.id}.js`;
  const mod = await fetchPart(() => entry[lang](), entry.id, lang, 'translation', `the ${lang} translation of "${entry.id}"`);
  if (mod?.default) return { book: mod.default, why: null };
  if (mod?.missing) return { book: null, why: `no ${lang} translation file yet (${file})` };
  return { book: null, why: `the ${lang} translation has no default export (${file})` };
}

/**
 * The making texts of book `id` in `lang`. A language whose texts are not
 * registered is noted (the English originals are printed in its place). A
 * translation that cannot be fetched rejects (EditionLoadError): its leaf
 * would print English under the edition's language. The English originals
 * that cannot be fetched leave the book without its making leaf (noted, and
 * `unfetched`, so loadEdition keeps nothing): every book needs them, and a
 * shelf prints its covers without them.
 */
async function loadMaking(id, lang) {
  const loaders = registry.MAKING ?? {};
  const notes = [];
  let unfetched = false;
  const get = (l) => {
    if (typeof loaders[l] !== 'function') {
      notes.push(`no ${l} making texts are registered`);
      return null;
    }
    const load = fetchPart(() => loaders[l](), id, lang, 'making', `the ${l} making texts`);
    if (l !== 'en') return load;
    return load.catch((err) => {
      notes.push(err.message);
      unfetched = true;
      return null;
    });
  };
  const [enMod, xxMod] = await Promise.all([get('en'), lang === 'en' ? null : get(lang)]);
  const { making, report } = composeMaking(enMod, xxMod, { id, lang });
  if (enMod && !making?.brief) notes.push(`the making texts have no brief for "${id}"`);
  return { making, report, notes, unfetched };
}

/** One line in the browser console when an edition is incomplete (Node callers read lastReport). */
function announce(id, report) {
  if (typeof document === 'undefined') return;
  const counts = LISTS.filter((l) => report[l].length).map((l) => `${report[l].length} ${l}`);
  const lead = `[lamina] ${report.lang} edition of "${id}":`;
  if (report.fallback) console.info(`${lead} ${report.fallback} — the English text is shown`);
  else if (counts.length || report.notes.length) console.info(`${lead} ${[...counts, ...report.notes].join(', ')} (lastReport("${id}", "${report.lang}"))`);
}
