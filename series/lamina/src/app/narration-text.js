// Speech input for one physical left-hand page. Deliberately independent of
// plateHTML/readingHTML: those combine the two pages and append figure beats.
// This module is DOM-free and never reads the current UI language implicitly.
import ES_TYPESET from '../i18n/es/typeset.js';
import ES_APP from '../i18n/es/app.js';
import { DEFAULT_FONTS } from '../engine/typeset/fonts.js';

const SILENT = new Set(['blank', 'endpaper', 'cover', 'back-cover', 'plate-figure', 'lesson-figure']);
const rows = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);
const word = (lang, key, vars = {}) => {
  const source = lang === 'es' ? ES_TYPESET[key] ?? ES_APP[key] ?? key : key;
  return source.replace(/\{([^}]+)\}/g, (all, name) => vars[name] ?? all);
};

/** Remove the manifests' presentation markup, without using an HTML parser. */
export function plainNarrationText(value) {
  if (value == null) return '';
  return String(value)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<\/?(?:em|strong|b|i|span|small|p|br)\b[^>]*>/gi, ' ')
    .replace(/^[ \t]*(?:#{1,6}\s+|[*•]\s+)/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, (v) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' })[v])
    .replace(/&#(x[\da-f]+|\d+);/gi, (all, value) => {
      const n = value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : Number(value);
      return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : all;
    })
    .replace(/[\u00ad\u200b\ufeff]/g, '')
    .replace(/[\s\u00a0]+/g, ' ')
    .trim();
}

const spokenLine = (value) => {
  const s = plainNarrationText(value);
  return s && !/[.!?…:;][”’"')\]]?$/.test(s) ? `${s}.` : s;
};
const named = (name, text) => [plainNarrationText(name), plainNarrationText(text)].filter(Boolean).join(': ');
const humanize = (id = '') => String(id).replace(/[-_]+/g, ' ').replace(/^./, (x) => x.toUpperCase());

function printedBlocks(side, lang) {
  const book = side.book ?? {};
  const t = (key, vars) => word(lang, key, vars);
  const blocks = [];
  const add = (...values) => blocks.push(...values.flat(Infinity).filter((v) => typeof v === 'string' && v.trim()));
  const section = (heading, values) => {
    const nonempty = rows(values).filter(Boolean);
    if (nonempty.length) add(heading, nonempty);
  };
  let title = '';
  switch (side.layout) {
    case 'plate-text':
    case 'lesson-text': {
      const p = side.plate;
      if (!p) break;
      const lesson = side.layout === 'lesson-text';
      title = p.common ?? p.title ?? '';
      add(t(lesson ? 'Lesson {numeral}' : 'Plate {numeral}', { numeral: side.numeral ?? p.number ?? '' }), title, p.commonAlt);
      add([p.scientific, p.authority].filter(Boolean).join(' '), p.family, p.badge);
      if (p.status?.label) add([p.status.label, p.status.code, p.status.source].filter(Boolean).join(', '));
      add(p.lede);
      const facts = rows(p.facts).filter(Array.isArray).map(([name, text]) => named(name, text));
      if (lesson) {
        // The lesson fact strip is above its body; its curiosity box is on
        // the RIGHT page and is intentionally absent from the narration.
        add(facts, p.body);
        if (p.lesson?.proTip) add(named(t('Pro tip'), p.lesson.proTip));
        add(rows(p.lesson?.steps).map((step) => named(step.title, step.text)));
        section(t('Common mistakes'), p.lesson?.mistakes);
        section(t('Proportions'), p.lesson?.proportions);
      } else {
        add(p.body);
        if (p.didYouKnow) add(named(t('Did you know?'), p.didYouKnow));
        section(t('Field notes'), facts);
      }
      section(t('Look closer'), rows(p.lookCloser).filter((v) => v?.text).map((v) => named(v.name ?? humanize(v.label), v.text)));
      section(t('Sources'), p.sources);
      break;
    }
    case 'title':
      title = book.title ?? '';
      add(book.kicker, title, book.subtitle, book.byline?.name ? `${t('by')} ${book.byline.name}` : '', book.author, book.edition);
      break;
    case 'imprint': {
      title = t('Imprint');
      const f = { ...DEFAULT_FONTS, ...side.theme?.fonts };
      const fonts = [...new Set([f.display, f.body, f.label, f.mono, side.theme?.style === 'engraving' || side.theme?.engraving ? f.condensed : null].filter(Boolean))];
      const list = new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(fonts);
      add(title, book.byline?.name ? named(t('Author'), book.byline.name) : '', named(book.title, book.subtitle), book.kicker, book.edition);
      if (book.author) add(t('Published by {publisher}.', { publisher: book.author }));
      add(t('Text, plates and interactive figures are original works made for this edition. Every figure is a living plate: turn it, open it, peel back its layers and take it home as a vector drawing.'));
      if (fonts.length) add(t('Set in {fonts}. Typeset, printed and bound live in your browser with Three.js — WebGPU, with a WebGL 2 fallback.', { fonts: list }));
      add(side.imprint, side.credits);
      break;
    }
    case 'contents':
      title = t('Contents');
      add(title, rows(side.entries).map((entry) => [entry.numeral, entry.label, entry.alt, entry.sub, entry.folio].filter((v) => v != null && v !== '').join('. ')));
      break;
    case 'intro':
      title = side.intro?.title ?? t('Introduction');
      add(title, side.intro?.paragraphs, side.intro?.pullQuote);
      break;
    case 'howto':
      title = side.howTo?.title ?? t('How to use this book');
      add(title, rows(side.howTo?.items).filter(Array.isArray).map(([name, text]) => named(name, text)));
      add(t('Reading a plate'));
      if (side.legend?.length) add(t('Conservation status, as assessed on the IUCN Red List.'));
      add(t('Every figure performs a seamless five-second study of how the organism moves, grows or is built.'), t('“Look closer” items are clickable: each one points to a part on the living figure.'));
      break;
    case 'note':
      title = side.note?.title ?? t('Afterword');
      add(title, side.note?.paragraphs);
      break;
    case 'glossary':
      title = t('Glossary');
      add(title, rows(side.glossary).filter(Array.isArray).map(([name, text]) => named(name, text)));
      break;
    case 'sources':
      title = t('Sources');
      add(title, side.sources);
      section(t('Colophon'), side.colophon);
      break;
    case 'making': {
      const mk = side.making ?? {};
      const prompt = mk.part !== 'brief';
      const part = prompt ? mk.prompt : mk.brief;
      if (!part) break;
      title = t(prompt ? 'The prompt' : 'This book’s brief');
      add(t('How this book was made'), title);
      add(prompt
        ? t(part.translated ? 'The series began with one prompt to {model}, written in English.' : 'The series began with one prompt to {model}. It is printed as it was written.', { model: mk.model ?? 'Claude Code' })
        : t('Each book was then researched, written, fact-checked twice and revised by its own team of agents, from this brief:'));
      if (part.translated) add(t('Translated from the English original'));
      add(prompt ? part.lines : part.text, part.source);
      if (!prompt) add(mk.later?.text);
      break;
    }
  }
  return { title: plainNarrationText(title), blocks: blocks.map(spokenLine).filter(Boolean) };
}

/**
 * Sentence-aligned chunks for a small local TTS model. Uniform short chunks
 * bound synthesis latency while the controller prepares the next audio.
 * No character slicing: even an unusually long token is kept intact.
 */
export function chunkNarrationText(text, lang = 'en', { maxChars = 180, firstMaxChars = 180 } = {}) {
  const source = plainNarrationText(text);
  if (!source) return [];
  const max = Math.max(80, Math.min(500, Math.floor(maxChars) || 180));
  const first = Math.max(80, Math.min(max, Math.floor(firstMaxChars) || 180));
  const segments = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter(lang, { granularity: 'sentence' }).segment(source)].map((s) => s.segment.trim())
    : source.match(/[^.!?]+(?:[.!?]+[”’"')\]]*|$)/g) ?? [source];
  const chunks = [];
  let pending = '';
  const flush = () => { if (pending) chunks.push(pending); pending = ''; };
  for (const sentence of segments) {
    let limit = chunks.length ? max : first;
    if (pending && pending.length + sentence.length + 1 > limit) flush();
    limit = chunks.length ? max : first;
    if (sentence.length <= limit) {
      pending = pending ? `${pending} ${sentence}` : sentence;
      continue;
    }
    for (const token of sentence.split(/\s+/)) {
      limit = chunks.length ? max : first;
      if (pending && pending.length + token.length + 1 > limit) flush();
      pending = pending ? `${pending} ${token}` : token;
    }
  }
  flush();
  return chunks;
}

const textHash = (text) => {
  let n = 2166136261;
  for (let i = 0; i < text.length; i++) n = Math.imul(n ^ text.charCodeAt(i), 16777619);
  return (n >>> 0).toString(16).padStart(8, '0');
};

/**
 * @returns {null|{key:string, bookId:string, lang:'en'|'es', sideIndex:number,
 * pageNumber:number|null, title:string, text:string, chunks:string[]}}
 * `opened` is the settled Book.opened integer. The screen framing does not
 * change which physical page is the verso: sides[2 * opened - 1].
 */
export function narrationForLeftPage(sides, opened, lang) {
  if (!Array.isArray(sides) || !Number.isInteger(opened) || opened <= 0) return null;
  const leaves = sides.leafCount ?? sides.length / 2;
  if (opened >= leaves) return null;
  const sideIndex = 2 * opened - 1;
  const side = sides[sideIndex];
  if (!side || side.recto === true || SILENT.has(side.layout)) return null;
  const locale = side.book?.locale ?? lang ?? 'en';
  if (!['en', 'es'].includes(locale) || (lang && lang !== locale)) return null;
  const { title, blocks } = printedBlocks(side, locale);
  const text = blocks.join('\n\n');
  if (!text) return null;
  const bookId = side.book?.id ?? 'book';
  return {
    key: `${bookId}:${locale}:${side.key ?? sideIndex}:${textHash(text)}`,
    bookId, lang: locale, sideIndex, pageNumber: side.folio ?? null,
    title, text, chunks: chunkNarrationText(text, locale),
  };
}
