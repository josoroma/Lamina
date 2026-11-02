// The manifest key set: which values of a book manifest a translation must
// translate and which it may never change. composeEdition (./edition.js)
// merges a translation against it; scripts/validate-books.mjs walks it.
// Pure and Node-safe. See .scratch/bilingual/design-i18n.md §2.2 and its
// review (R1.1, R1.4, R1.9, R1.10).
//
// Kinds of leaf:
//   ID      never translated: always taken from English (a translation may copy
//           it, never change it)
//   TEXT    reader-visible, must be translated
//   SAME    reader-visible, may stay identical (names, Latin, citations)
//   SCI     a scientific name: identical allowed when the plate has an authority
//   TAXON   identical allowed when every part is a taxon (Viperidae · Crotalinae)
//   LOCALE  set by the loader ('en' | 'es')
// Containers: list (index-aligned), tuple (fixed rows such as [term, definition]),
// byId (matched by a key: plates by id, look-closer rows by label), fields
// (an object), nullable. An ID node over a container makes the whole subtree
// opaque (theme, figure params).

const leaf = (kind) => Object.freeze({ kind });
export const ID = leaf('id');
export const TEXT = leaf('text');
export const SAME = leaf('same');
export const SCI = leaf('sci');
export const TAXON = leaf('taxon');
export const LOCALE = leaf('locale');

export const list = (of) => Object.freeze({ kind: 'list', of });
export const tuple = (...items) => Object.freeze({ kind: 'tuple', items });
export const byId = (key, of) => Object.freeze({ kind: 'byId', key, of });
export const fields = (f) => Object.freeze({ kind: 'fields', fields: Object.freeze(f) });
export const nullable = (of) => Object.freeze({ kind: 'nullable', of });
/**
 * A text English may leave out (its value is derived, e.g. a look-closer name
 * from its label id) but a translation must set (R1.1).
 */
export const optionalInEnglish = (of) => Object.freeze({ ...of, optionalInEnglish: true });
/** An optional text a translation may explicitly suppress with null. */
export const clearable = (of) => Object.freeze({ ...of, clearable: true });

/** True for the kinds a reader sees as text. */
export const isTextKind = (node) => ['text', 'same', 'sci', 'taxon'].includes(node?.kind);

// Figure and plate layers (no current book declares them; the code reads them).
const LAYER = fields({ id: ID, label: TEXT });

const PLATE = fields({
  id: ID,
  number: ID,
  layout: ID,
  title: TEXT, // fallback for `common` in the typesetter; no book sets it
  common: SAME, // Costa Rican names stay; Calaveras translates its lesson titles
  commonAlt: clearable(SAME), // alternate name; an edition may omit it explicitly (L6)
  scientific: SCI,
  authority: SAME,
  family: TAXON,
  status: nullable(fields({ code: ID, label: TEXT, source: SAME })),
  badge: TEXT,
  lede: TEXT,
  body: list(TEXT),
  facts: list(tuple(TEXT, TEXT)),
  // name: printed instead of the humanised label id (R1.1)
  lookCloser: byId('label', fields({ label: ID, name: optionalInEnglish(TEXT), text: TEXT })),
  didYouKnow: TEXT,
  figure: fields({
    type: ID,
    params: ID,
    style: ID,
    keyTime: ID,
    caption: TEXT, // keeps its "Fig. n —" lead-in
    scaleNote: TEXT,
    instruction: TEXT,
    layers: list(LAYER),
  }),
  layers: list(LAYER),
  animation: fields({ title: TEXT, beats: list(tuple(ID, TEXT)) }), // beat times come from English
  sources: list(SAME),
  lesson: fields({
    steps: list(fields({ title: TEXT, text: TEXT })),
    proTip: TEXT,
    mistakes: list(TEXT),
    proportions: list(TEXT),
  }),
});

/** A book manifest (CONTRACTS §6). */
export const MANIFEST = fields({
  id: ID,
  title: TEXT, // localized book title: Snakes / Serpientes, Flowers / Flores, Skulls / Calaveras
  subtitle: TEXT,
  kicker: TEXT,
  author: SAME, // the imprint string (CONTRACTS §6)
  byline: ID, // { name, mark }: the author, and the mark stamped on the boards (R1.4)
  edition: TEXT, // keeps its year (the title page prints it in Roman numerals)
  locale: LOCALE,
  emblem: ID,
  blurb: TEXT,
  imprint: list(TEXT),
  credits: list(TEXT),
  theme: ID,
  intro: fields({ title: TEXT, paragraphs: list(TEXT), pullQuote: TEXT }),
  howTo: fields({ title: TEXT, items: list(tuple(TEXT, TEXT)) }), // icons are chosen from the English row
  plates: byId('id', PLATE), // order from English
  back: fields({
    note: fields({ title: TEXT, paragraphs: list(TEXT) }),
    glossary: list(tuple(TEXT, TEXT)), // index-aligned; the typesetter sorts per language
    sources: list(SAME), // only the connective words translate
    colophon: list(TEXT),
    blurb: TEXT,
  }),
});

/**
 * "How this book was made" for one book (src/books/making/*, normalised by
 * composeMaking): the prompt that began the series, the book's brief and the
 * closing line on the prompts that reshaped the books later.
 */
export const MAKING_SCHEMA = fields({
  model: SAME,
  prompt: fields({ source: ID, lines: list(TEXT), title: ID, headings: ID }),
  brief: fields({ source: ID, text: TEXT }),
  later: fields({ source: ID, text: TEXT }),
});

// ------------------------------------------------------------------ identical values

/** Rank suffixes a taxon name may end with (R1.10). */
export const TAXON_SUFFIXES = Object.freeze(['idae', 'inae', 'oidea', 'ini', 'aceae', 'oideae', 'eae', 'ales', 'formes']);
const TAXON_WORD = new RegExp(`^[A-Z][a-z]+(?:${TAXON_SUFFIXES.join('|')})$`);

/** Every part a taxon: "Viperidae · Crotalinae", "Orchidaceae · Asparagales", "Viperidae, Crotalinae". */
export function isTaxon(s) {
  return String(s ?? '')
    .replace(/\*/g, '')
    .split(/[·,]/)
    .every((part) => TAXON_WORD.test(part.trim()));
}

/**
 * May a translation keep this English value unchanged? (The validator's
 * "untranslated" check; ID and LOCALE values are never translated at all.)
 * @param {object} node      schema node of the value
 * @param {*} value          the English value
 * @param {object} [parent]  the English object holding it (a SCI value reads its plate's authority, R1.9)
 */
export function identicalAllowed(node, value, parent) {
  switch (node?.kind) {
    case 'id':
    case 'locale':
    case 'same':
      return true;
    case 'sci':
      return Boolean(String(parent?.authority ?? '').trim());
    case 'taxon':
      return isTaxon(value);
    default:
      return false;
  }
}

// ------------------------------------------------------------------ walking

/** 'intro' + 'title' → 'intro.title' */
export const keyPath = (path, key) => (path ? `${path}.${key}` : String(key));
/** 'intro.paragraphs' + 2 → 'intro.paragraphs[2]'; 'plates' + 'terciopelo' → 'plates[terciopelo]' */
export const itemPath = (path, i) => `${path}[${i}]`;

export const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Visit `value` along `schema`, depth first, containers before their
 * children: visit(node, value, path, parent, key) for every value present,
 * `key` being its key or index in `parent` (so en(parent)[key] is its English
 * counterpart in a composed edition). `node` is null for a key the schema
 * does not declare (an "unknown" path; its subtree is not entered). A
 * nullable node is visited as itself only when the value is null. ID subtrees
 * are opaque (visited once, never entered). Returning false skips a
 * container's children.
 * @param {object|null} schema
 * @param {*} value
 * @param {(node: object|null, value: *, path: string, parent: object|null, key: string|number|null) => boolean|void} visit
 */
export function walk(schema, value, visit, path = '', parent = null, key = null) {
  if (value === undefined) return;
  if (schema?.kind === 'nullable') {
    if (value === null) visit(schema, value, path, parent, key);
    else walk(schema.of, value, visit, path, parent, key);
    return;
  }
  if (visit(schema, value, path, parent, key) === false || !schema) return;
  switch (schema.kind) {
    case 'list':
      if (Array.isArray(value)) value.forEach((v, i) => walk(schema.of, v, visit, itemPath(path, i), value, i));
      break;
    case 'tuple':
      if (Array.isArray(value)) value.forEach((v, i) => walk(schema.items[i] ?? null, v, visit, itemPath(path, i), value, i));
      break;
    case 'byId':
      if (Array.isArray(value)) value.forEach((v, i) => walk(schema.of, v, visit, itemPath(path, v?.[schema.key] ?? i), value, i));
      break;
    case 'fields':
      if (isPlainObject(value)) for (const k of Object.keys(value)) walk(schema.fields[k] ?? null, value[k], visit, keyPath(path, k), value, k);
      break;
    default:
  }
}
