// Page order: turns a book edition into the ordered list of printed sides
// (CONTRACTS §6 "Page order (leaves)"). sides[2i] is the front (recto) of
// leaf i, sides[2i + 1] its back (verso). Leaf 0 and the last leaf are the
// boards. Folios count from the title page (= 1) and are omitted on boards,
// endpapers and blanks; contents entries are resolved to real folios here so
// the contents page can print them and hit-test them.
//
// An edition carrying `making` (the prompt that began the series and this
// book's brief, attached by loadEdition) gets one more leaf before the back
// board: the prompt on its recto, facing the glossary, and the brief on its
// verso, the last page of the book. Running heads and contents labels are
// set in the edition's language (book.locale), and the glossary is sorted
// in that language's order here, so the page, the reading sheet and the
// screen-reader mirror (which read these specs) agree.
import { emblemKind } from './emblems.js';
import { roman } from './util.js';
import { plain } from './text.js';
import { isTaxon } from './blocks.js';
import { tl, compareText } from '../../i18n/index.js';

/**
 * @typedef {Object} PageSpec
 * @property {string} key        stable id, e.g. 'serpientes:plate-text:terciopelo'
 * @property {number} index      side index (0-based)
 * @property {number} leaf       leaf index (0 = front board)
 * @property {'front'|'back'} side
 * @property {boolean} recto     right-hand page when visible
 * @property {number} spread     Book.opened value that shows this side
 * @property {string} layout
 * @property {number|null} folio
 * @property {string|null} runningHead   may contain *italic* markup
 * @property {object} book       { id, title, subtitle, kicker, author (the imprint), byline ({ name, mark } | null),
 *                               edition, locale, emblem, plateCount }
 * @property {boolean} [board]   cover / back cover: board-sized canvas (1.028 × 1.436)
 * @property {boolean} [onBoard] endpapers: pasted on a board, but page-sized artwork
 *                               (the book engine frames them with cloth turn-ins)
 * @property {string[]} [binomials] making pages: the edition's Latin names, which the
 *                               quoted texts keep on one line
 */

/**
 * Build the ordered page specs for a manifest.
 * @param {object} manifest  book manifest (src/books/<id>.js default export)
 * @returns {PageSpec[] & { leafCount: number, sides: PageSpec[], spreads: object[], plateSpread: (n:number)=>number }}
 */
export function buildSides(manifest) {
  const m = manifest ?? {};
  const theme = m.theme ?? {};
  const plates = (m.plates ?? []).filter(Boolean);
  const N = plates.length;
  const locale = m.locale ?? 'en';
  const t = (key, vars) => tl(locale, key, vars);
  const book = {
    id: m.id ?? 'book',
    title: m.title ?? t('Untitled'),
    subtitle: m.subtitle ?? '',
    kicker: m.kicker ?? '',
    author: m.author ?? '', // the imprint ("Lámina Natural History Press")
    byline: bylineOf(m.byline),
    edition: m.edition ?? '',
    locale,
    emblem: emblemKind(m, theme),
    plateCount: N,
  };
  const back = m.back ?? {};
  const sides = [];
  const push = (layout, data = {}, keyPart = layout) => {
    const index = sides.length;
    sides.push({
      key: `${book.id}:${keyPart}`,
      index,
      leaf: index >> 1,
      side: index % 2 === 0 ? 'front' : 'back',
      recto: index % 2 === 0,
      spread: index % 2 === 0 ? index >> 1 : (index >> 1) + 1,
      layout,
      folio: null,
      runningHead: null,
      book,
      theme,
      ...data,
    });
  };
  const isLesson = (p) => p.layout === 'lesson';
  const textOf = (p, i) => [isLesson(p) ? 'lesson-text' : 'plate-text', plateData(p, i), `${isLesson(p) ? 'lesson-text' : 'plate-text'}:${p.id ?? i + 1}`];
  const figOf = (p, i) => [isLesson(p) ? 'lesson-figure' : 'plate-figure', plateData(p, i), `${isLesson(p) ? 'lesson-figure' : 'plate-figure'}:${p.id ?? i + 1}`];

  // leaf 0: front board
  push('cover', { board: true, emblem: book.emblem }, 'cover');
  push('endpaper', { onBoard: true, position: 'front', endpaper: theme.endpaper ?? null }, 'endpaper-front');
  // leaf 1
  push('title', { emblem: book.emblem });
  push('imprint', { imprint: m.imprint ?? null, credits: m.credits ?? null });
  // leaf 2
  push('contents', { entries: [] });
  push(m.intro ? 'intro' : 'blank', { intro: m.intro ?? null }, 'intro');
  // leaf 3
  push(m.howTo ? 'howto' : 'blank', { howTo: m.howTo ?? null, legend: legendOf(plates) }, 'howto');
  if (N > 0) push(...textOf(plates[0], 0));
  else push(back.note ? 'note' : 'blank', { note: back.note ?? null }, 'note');
  // leaves 3+k
  for (let k = 1; k <= N; k++) {
    push(...figOf(plates[k - 1], k - 1));
    if (k < N) push(...textOf(plates[k], k));
    else push(back.note ? 'note' : 'blank', { note: back.note ?? null }, 'note');
  }
  // back matter leaf
  push('sources', { sources: back.sources ?? [], colophon: back.colophon ?? [] });
  push(back.glossary?.length ? 'glossary' : 'blank', { glossary: sortGlossary(back.glossary ?? [], locale) }, 'glossary');
  // "How this book was made": the prompt (recto) and this book's brief (verso);
  // both editions carry both texts (a missing translation prints the English)
  const making = m.making?.prompt?.lines?.length && m.making?.brief?.text ? m.making : null;
  if (making) {
    const binomials = binomialsOf(m); // the quoted texts keep each one on a line
    push('making', { making: { ...making, part: 'prompt' }, binomials }, 'making-prompt');
    push('making', { making: { ...making, part: 'brief' }, binomials }, 'making-brief');
  }
  // back board
  push('endpaper', { onBoard: true, position: 'back', endpaper: theme.endpaper ?? null }, 'endpaper-back');
  push('back-cover', { board: true, emblem: book.emblem, blurb: m.blurb ?? back.blurb ?? m.intro?.pullQuote ?? book.subtitle }, 'back-cover');

  // folios: title page = 1; none on boards, endpapers and blanks
  for (const s of sides) {
    if (s.board || s.onBoard || s.layout === 'blank' || s.index < 2) continue;
    s.folio = s.index - 1;
  }
  // running heads: versos carry the book title, rectos the section
  for (const s of sides) s.runningHead = runningHead(s, book, t);

  // contents entries with resolved folios. Front and back matter also name the
  // page of their spread (intro | how-to and note | sources share one), which
  // a portrait reader framing a single page needs to land on the right one.
  const contents = sides.find((s) => s.layout === 'contents');
  const entries = [];
  const matter = (kind, layout, label) => {
    const s = sides.find((x) => x.layout === layout);
    if (s) entries.push({ kind, id: layout, label, folio: s.folio, spread: s.spread, page: s.recto ? 'right' : 'left' });
  };
  matter('front', 'intro', m.intro?.title ?? t('Introduction'));
  matter('front', 'howto', m.howTo?.title ?? t('How to use this book'));
  plates.forEach((p, i) => {
    const side = sides.find((x) => x.plate === p && /-text$/.test(x.layout));
    entries.push({
      kind: 'plate',
      numeral: p.number ?? roman(i + 1),
      label: p.common ?? p.title ?? t('Plate {n}', { n: i + 1 }),
      alt: p.commonAlt ?? null,
      sub: p.scientific ?? null,
      taxon: isTaxon(p), // the binomial line is italic only for a taxon
      lesson: isLesson(p),
      folio: side?.folio ?? null,
      plate: i + 1,
      spread: side?.spread ?? null,
    });
  });
  matter('back', 'note', back.note?.title ?? t('Note'));
  matter('back', 'sources', t('Sources & colophon'));
  matter('back', 'glossary', t('Glossary'));
  matter('back', 'making', t('How this book was made'));
  if (contents) contents.entries = entries;

  const leafCount = sides.length / 2;
  const spreads = [];
  for (let k = 0; k <= leafCount; k++) {
    spreads.push({ opened: k, left: k > 0 ? sides[2 * (k - 1) + 1] : null, right: k < leafCount ? sides[2 * k] : null });
  }
  Object.defineProperties(sides, {
    leafCount: { value: leafCount, enumerable: false },
    sides: { value: sides, enumerable: false },
    spreads: { value: spreads, enumerable: false },
    plateSpread: { value: (n) => sides.find((s) => s.plateNumber === n && /-figure$/.test(s.layout))?.spread ?? null, enumerable: false },
  });
  return sides;
}

function plateData(p, i) {
  return {
    plate: p,
    plateIndex: i,
    plateNumber: i + 1,
    numeral: p.number ?? roman(i + 1),
    figureNumber: i + 1,
  };
}

function runningHead(s, book, t) {
  switch (s.layout) {
    case 'cover':
    case 'back-cover':
    case 'endpaper':
    case 'title':
    case 'imprint':
    case 'contents':
    case 'blank':
      return null;
    case 'plate-figure': {
      const p = s.plate;
      if (!p?.scientific) return p?.common ?? book.title;
      return `${p.common ?? ''} · ${isTaxon(p) ? `*${p.scientific}*` : p.scientific}`;
    }
    case 'lesson-figure':
      return t('Lesson {numeral} · {title}', { numeral: s.numeral, title: s.plate?.common ?? '' });
    case 'howto':
      return s.howTo?.title ?? t('How to use this book');
    case 'sources':
      return t('Sources & colophon');
    // (the making pages print "How this book was made" as their kicker, so
    // their heads follow the default: the subtitle on the recto, the title on the verso)
    default:
      return s.recto ? book.subtitle || book.title : book.title;
  }
}

/** A manifest byline: { name, mark } (a bare string names the author, without a mark). */
function bylineOf(b) {
  if (!b) return null;
  if (typeof b === 'string') return { name: b, mark: null };
  return b.name || b.mark ? { name: b.name ?? '', mark: b.mark ?? null } : null;
}

/**
 * The Latin names an edition prints: its taxa's `scientific` and every
 * italic binomial (or trinomial) in its text, such as a synonym the plate
 * text gives. The making pages quote the briefs as plain text, where these
 * names are not marked, and keep each one on a single line.
 * @returns {string[]} longest first
 */
function binomialsOf(m) {
  const names = new Set();
  for (const p of m.plates ?? []) if (p?.scientific && isTaxon(p)) names.add(plain(p.scientific).trim());
  const seen = new WeakSet();
  const walk = (v) => {
    if (typeof v === 'string') {
      for (const x of v.matchAll(/\*([A-Z][a-z]{2,}(?: [a-z]{3,}){1,2})\*/g)) names.add(x[1]);
    } else if (v && typeof v === 'object' && !seen.has(v)) {
      seen.add(v);
      (Array.isArray(v) ? v : Object.values(v)).forEach(walk);
    }
  };
  walk([m.plates, m.intro, m.back]);
  return [...names].filter((s) => /^\S+ \S+/.test(s)).sort((a, b) => b.length - a.length);
}

/**
 * Glossary entries in the edition language's alphabetical order (Spanish
 * sorts ñ after n). The rows themselves are kept, only their order changes.
 */
function sortGlossary(rows, lang) {
  const list = rows.filter((e) => Array.isArray(e) && e.length >= 2);
  return list
    .map((e, i) => ({ e, i, key: plain(e[0]) }))
    .sort((a, b) => compareText(a.key, b.key, { lang }) || a.i - b.i)
    .map((x) => x.e);
}

/** IUCN codes used by the plates, in Red List order (for the how-to legend). */
function legendOf(plates) {
  const order = ['EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE'];
  const used = new Set(plates.map((p) => p.status?.code?.toUpperCase()).filter(Boolean));
  return order.filter((c) => used.has(c));
}
