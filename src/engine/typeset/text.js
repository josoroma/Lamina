// Rich text → justified, hyphenated lines on a canvas.
//
// Pages are textures, so typography has to be done by hand: this module parses
// the manifest's light markup (*italic*, **bold**), measures with the real
// webfonts, and breaks paragraphs with a compact Knuth–Plass total-fit
// algorithm (boxes / glue / penalties) so word spaces stay even. Word spaces
// may stretch at most 35% (and shrink 25%); a line that would need more is
// set at the 35% limit and left ragged, so rivers and gaps never appear.
// Ragged/centred text uses the Knuth–Plass "rightskip" formulation, which
// balances line lengths instead of filling greedily.
import { fontString, fontGeneration, beyondLatin } from './fonts.js';
import { hyphenate, stripSoftHyphens } from './hyphen.js';

const INF = 1e7;
export const MAX_STRETCH = 0.35; // fraction of a natural word space
const SHRINK = 0.25;

// The language words are hyphenated in: the page's edition language, set by
// withLang() around one typeset (typesetting is synchronous, so a module
// variable is safe and every paragraph of the page agrees).
let LANG = 'en';

/**
 * Run `fn` with `lang` as the hyphenation language (e.g. a page's
 * book.locale); restores the previous language afterwards.
 */
export function withLang(lang, fn) {
  const prev = LANG;
  LANG = lang || 'en';
  try {
    return fn();
  } finally {
    LANG = prev;
  }
}

/** The hyphenation language in effect. */
export const textLang = () => LANG;

// ------------------------------------------------------------------ measuring

let mctx = null;
let mFont = '';
let mGen = -1;
const wcache = new Map();
let glyphLog = null; // font → Set of characters beyond Latin, while recordGlyphs runs

/**
 * Run `fn` (a miniature typeset) and report which fonts it set and the
 * characters beyond the Latin subset each one set. Every text width goes
 * through measure(), so this is exactly what the pages will print — the font
 * loader uses it to fetch an extended subset only for the faces that need one.
 * @returns {Map<string, Set<string>>} canvas font string → characters
 */
export function recordGlyphs(fn) {
  const prev = glyphLog;
  const log = new Map();
  glyphLog = log;
  try {
    fn();
  } finally {
    glyphLog = prev;
  }
  return log;
}

function measureCtx() {
  if (!mctx) {
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(8, 8) : document.createElement('canvas');
    mctx = c.getContext('2d');
    prepareContext(mctx);
  }
  return mctx;
}

/** Shared canvas text settings (kerning, ligatures) for measuring and drawing alike. */
export function prepareContext(g) {
  if ('fontKerning' in g) g.fontKerning = 'normal';
  if ('textRendering' in g) g.textRendering = 'optimizeLegibility';
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  return g;
}

/**
 * Advance width of `text` in `font` (cached; flushed when webfonts load).
 * @param {string} font canvas font shorthand
 * @param {string} text
 * @param {number} [tracking=0] extra px between glyphs (applied n−1 times)
 */
export function measure(font, text, tracking = 0) {
  if (glyphLog) {
    let set = glyphLog.get(font);
    if (!set) glyphLog.set(font, (set = new Set()));
    for (const ch of beyondLatin(text)) set.add(ch);
  }
  const gen = fontGeneration();
  if (gen !== mGen) {
    wcache.clear();
    mGen = gen;
  }
  const k = font + '\u0001' + text;
  let w = wcache.get(k);
  if (w === undefined) {
    const g = measureCtx();
    if (mFont !== font) {
      g.font = font;
      mFont = font;
    }
    w = g.measureText(text).width;
    if (wcache.size > 20000) wcache.clear();
    wcache.set(k, w);
  }
  return tracking ? w + tracking * Math.max(0, text.length - 1) : w;
}

const vcache = new Map();
/** Vertical metrics of a font: { ascent, descent, cap, xh } in px. */
export function vmetrics(font) {
  const key = font + '|' + fontGeneration();
  let m = vcache.get(key);
  if (!m) {
    const g = measureCtx();
    g.font = font;
    mFont = font;
    const a = g.measureText('Hxgjpd');
    const h = g.measureText('H');
    const x = g.measureText('x');
    const size = parseFloat(/([\d.]+)px/.exec(font)?.[1] ?? '16');
    m = {
      ascent: a.fontBoundingBoxAscent ?? size * 0.8,
      descent: a.fontBoundingBoxDescent ?? size * 0.2,
      cap: h.actualBoundingBoxAscent || size * 0.68,
      xh: x.actualBoundingBoxAscent || size * 0.45,
    };
    vcache.set(key, m);
  }
  return m;
}

// ------------------------------------------------------------------ styles

/**
 * A text style. Every field optional except role & size.
 * @typedef {Object} TextStyle
 * @property {'display'|'body'|'label'|'mono'|'condensed'} role
 * @property {number} size          px
 * @property {number} [weight=400]
 * @property {number} [boldWeight=600]
 * @property {boolean} [italic=false]
 * @property {string} [color]
 * @property {number} [tracking=0]  em
 * @property {'all'|'small'|false} [caps=false]
 * @property {number} [leading]     line height multiple (default 1.45)
 * @property {boolean} [hyphenate=true]
 */

/** Resolve a style against font roles → font strings for each inline variant. */
export function resolveStyle(fonts, st) {
  if (st.fontFor) return st; // already resolved
  const caps = st.caps ?? false;
  const size = caps === 'small' ? st.size * 0.8 : st.size;
  const weight = st.weight ?? 400;
  const boldWeight = st.boldWeight ?? Math.max(600, weight + 200);
  const italic = !!st.italic;
  const tracking = (st.tracking ?? (caps === 'small' ? 0.06 : 0)) * size;
  const fontFor = (ital, bold) => fontString(fonts, st.role, size, bold ? boldWeight : weight, ital);
  return {
    ...st,
    caps,
    size,
    nominal: st.size,
    weight,
    boldWeight,
    italic,
    tracking,
    leading: st.leading ?? 1.45,
    font: fontFor(italic, false),
    fontFor,
  };
}

// ------------------------------------------------------------------ markup

/**
 * Parse *italic*, **bold** and ***bold italic*** markup into runs.
 * Unpaired asterisks stay literal.
 * @param {string} src
 * @returns {{ text: string, italic: boolean, bold: boolean }[]}
 */
export function parseRich(src) {
  src = String(src ?? '');
  const tokens = src.split(/(\*\*\*|\*\*|\*)/);
  // pair markers with a stack per kind so stray asterisks are literal
  const kinds = tokens.map((t, i) => (i % 2 === 1 ? t : null));
  const paired = new Array(tokens.length).fill(false);
  const open = { '*': [], '**': [], '***': [] };
  kinds.forEach((k, i) => {
    if (!k) return;
    const prev = tokens[i - 1] ?? '';
    const next = tokens[i + 1] ?? '';
    const canOpen = next.length > 0 && !/^\s/.test(next);
    const canClose = prev.length > 0 && !/\s$/.test(prev);
    if (canClose && open[k].length) {
      paired[open[k].pop()] = true;
      paired[i] = true;
    } else if (canOpen) open[k].push(i);
  });
  const runs = [];
  let italic = false;
  let bold = false;
  tokens.forEach((t, i) => {
    if (kinds[i] && paired[i]) {
      if (t === '*' || t === '***') italic = !italic;
      if (t === '**' || t === '***') bold = !bold;
      return;
    }
    if (!t) return;
    const last = runs[runs.length - 1];
    if (last && last.italic === italic && last.bold === bold) last.text += t;
    else runs.push({ text: t, italic, bold });
  });
  return runs;
}

/** Strip markup to plain text. */
export const plain = (src) => parseRich(src).map((r) => r.text).join('');

/**
 * Normalise a markup string or a run array into runs with resolved styles.
 * Runs may carry { style } (a TextStyle, resolved here), { color },
 * and { markup: true } to have their text parsed for *italic* / **bold**.
 */
export function normalizeRuns(fonts, src) {
  if (!Array.isArray(src)) return parseRich(src);
  const out = [];
  for (const r of src) {
    if (typeof r === 'string') {
      out.push(...parseRich(r));
      continue;
    }
    const style = r.style ? resolveStyle(fonts, r.style) : undefined;
    if (r.markup) {
      for (const q of parseRich(r.text)) out.push({ text: q.text, italic: q.italic !== !!r.italic, bold: q.bold || !!r.bold, style, color: r.color });
    } else out.push({ text: r.text, italic: !!r.italic, bold: !!r.bold, style, color: r.color });
  }
  return out;
}

// ------------------------------------------------------------------ items

const isSpace = (c) => c === ' ' || c === '\t' || c === '\u2009' || c === '\u200a';

/**
 * Build Knuth–Plass items for a paragraph.
 * @param {object} rs      resolved style
 * @param {Array} runs     parseRich output (or [{text, italic, bold, color?, style?}])
 * @param {object} o       { rag: boolean, hyphenate: boolean, indent: number,
 *                           whole: measure px when words stay whole (0: off) }
 */
function buildItems(rs, runs, o) {
  const items = [];
  const words = [];
  if (o.indent) items.push({ type: 'box', width: o.indent, word: null });
  let segs = [];
  const fontOfRun = (r) => {
    const s = r.style ?? rs;
    return {
      font: s.fontFor(s.italic !== !!r.italic, !!r.bold),
      color: r.color ?? s.color,
      tracking: s.tracking,
      caps: s.caps,
    };
  };
  const flushWord = () => {
    if (!segs.length) return;
    const word = { segs, text: segs.map((s) => s.text).join('') };
    pushWord(items, word, rs, o);
    words.push(word);
    segs = [];
  };
  const pushSpace = (seg) => {
    const font = seg?.font ?? rs.font;
    const tr = seg?.tracking ?? 0;
    // tracked text: the tracking after the word's last letter and the space's
    // own, as line() (and CSS letter-spacing) set a word space
    const w = measure(font, ' ') + 2 * tr;
    if (o.rag) {
      const rag = o.ragStretch;
      items.push({ type: 'glue', width: 0, stretch: rag, shrink: 0, nobreak: true });
      items.push({ type: 'penalty', width: 0, penalty: 0, flagged: false });
      items.push({ type: 'glue', width: w, stretch: -rag, shrink: 0, nobreak: true });
    } else {
      items.push({ type: 'glue', width: w, stretch: w * MAX_STRETCH, shrink: w * SHRINK });
    }
  };
  for (const r of runs) {
    const f = fontOfRun(r);
    let text = r.text; // soft hyphens stay until pushWord() reads them
    if (f.caps) text = text.toUpperCase();
    let cur = '';
    for (const ch of text) {
      if (ch === '\n') {
        if (cur) segs.push({ ...f, text: cur });
        cur = '';
        flushWord();
        items.push({ type: 'glue', width: 0, stretch: INF, shrink: 0 });
        items.push({ type: 'penalty', width: 0, penalty: -INF, flagged: false });
      } else if (isSpace(ch)) {
        if (cur) segs.push({ ...f, text: cur });
        cur = '';
        const lastSeg = segs[segs.length - 1];
        flushWord();
        const prev = items[items.length - 1];
        if (prev && prev.type === 'box') pushSpace(lastSeg ?? f);
      } else cur += ch;
    }
    if (cur) segs.push({ ...f, text: cur });
  }
  flushWord();
  // drop trailing glue, then finish the paragraph
  while (items.length && items[items.length - 1].type !== 'box') items.pop();
  // the last word is never hyphenated (InDesign's "Hyphenate Last Word" off):
  // its tail alone on the last line would read as a runt
  // (its boxes and in-word breaks run back to the glue before it)
  const last = items[items.length - 1]?.word;
  for (let i = items.length - 2; last && i > 0 && (items[i].word === last || (items[i].type === 'penalty' && items[i].flagged)); i--) {
    if (items[i].hyphen) items.splice(i, 1);
  }
  items.push({ type: 'penalty', width: 0, penalty: INF, flagged: false });
  items.push({ type: 'glue', width: 0, stretch: INF, shrink: 0, finish: true });
  items.push({ type: 'penalty', width: 0, penalty: -INF, flagged: true, final: true });
  return { items, words };
}

function pushWord(items, word, rs, o) {
  if (word.segs.length > 1) {
    for (const seg of word.segs) {
      const t = stripSoftHyphens(seg.text);
      items.push({ type: 'box', width: measure(seg.font, t, seg.tracking), word, seg, from: 0, to: t.length, text: t });
    }
    return;
  }
  const seg = word.segs[0];
  const raw = seg.text;
  const text = stripSoftHyphens(raw);
  seg.clean = text;
  // verbatim text: lines break at spaces only, never inside a word, unless the
  // word alone is wider than the measure (it then breaks as below, unhyphenated)
  if (o.whole) {
    const w = measure(seg.font, text, seg.tracking);
    if (w <= o.whole) {
      items.push({ type: 'box', width: w, word, seg, from: 0, to: text.length, text });
      return;
    }
  }
  // break opportunities: explicit hyphens/dashes, URL slashes, hyphenation
  const pts = [];
  for (let i = 1; i < text.length - 1; i++) {
    const c = text[i];
    // a range or a number (50–75, 2–2,5, 9-1-1) stays on one line
    const digits = /\d/.test(text[i - 1]) && /\d/.test(text[i + 1]);
    // (\p{L}, not \w: "teórico-práctico" breaks at its hyphen too)
    // (Spanish repeats the hyphen of a compound at the start of the next line,
    // teórico- / -práctico, but not in proper names: Reyes- / Velasco)
    // (never in verbatim text, which must not gain a character)
    if (c === '-' && !digits && /[\p{L}\d]/u.test(text[i - 1]) && /[\p{L}\d]/u.test(text[i + 1])) pts.push({ at: i + 1, penalty: 50, hyphen: false, repeat: LANG === 'es' && !o.whole && /\p{Ll}/u.test(text[i + 1]) });
    else if ((c === '\u2014' || (c === '\u2013' && !digits)) && i < text.length - 1) pts.push({ at: i + 1, penalty: 120, hyphen: false });
    else if (c === '/' && /[:/.]/.test(text) && text.length > 18) pts.push({ at: i + 1, penalty: 200, hyphen: false });
  }
  const canHyphen = o.hyphenate && rs.hyphenate !== false && !seg.caps && !/italic/.test(seg.font.slice(0, 7)) && !pts.some((p) => !p.hyphen);
  if (canHyphen || (raw.includes('\u00ad') && !o.whole)) {
    // core = letters only, keep surrounding punctuation out of the pattern
    const m = /^([^\p{L}\u00ad]*)([\p{L}\u00ad]+)([^\p{L}\u00ad]*)$/u.exec(raw);
    if (m) {
      const core = m[2];
      const lead = m[1].length;
      const capital = /^\p{Lu}/u.test(core) && !raw.includes('\u00ad');
      if (!capital) {
        for (const p of hyphenate(core, LANG)) pts.push({ at: lead + p.at, penalty: p.penalty, hyphen: true });
      }
    }
  }
  pts.sort((a, b) => a.at - b.at);
  if (!pts.length) {
    items.push({ type: 'box', width: measure(seg.font, text, seg.tracking), word, seg, from: 0, to: text.length, text });
    return;
  }
  let prevAt = 0;
  let prevW = 0;
  const hyW = measure(seg.font, '-');
  for (const p of pts) {
    const w = measure(seg.font, text.slice(0, p.at), seg.tracking);
    items.push({ type: 'box', width: w - prevW, word, seg, from: prevAt, to: p.at, text: text.slice(prevAt, p.at) });
    items.push({
      type: 'penalty',
      width: p.hyphen ? hyW : 0,
      penalty: p.penalty,
      flagged: true,
      hyphen: p.hyphen,
      repeat: !!p.repeat,
      stretch: o.rag ? o.ragStretch : 0,
    });
    prevAt = p.at;
    prevW = w;
  }
  const total = measure(seg.font, text, seg.tracking);
  items.push({ type: 'box', width: total - prevW, word, seg, from: prevAt, to: text.length, text: text.slice(prevAt) });
}

// ------------------------------------------------------------------ Knuth–Plass

/**
 * Total-fit line breaking. Returns break indices (into items) or null.
 * @param {Array} items
 * @param {(line: number) => number} lineWidth
 * @param {object} o  { tolerance, lastLineMin, strictRunt }
 */
function knuthPlass(items, lineWidth, o) {
  const tolerance = o.tolerance ?? 1;
  const linePenalty = 10;
  const flaggedDemerits = 9000; // consecutive hyphenated lines (TeX \doublehyphendemerits)
  const finalHyphenDemerits = 6000; // hyphen on the penultimate line
  const fitnessDemerits = 3000;
  let active = [{ index: 0, line: 0, fitness: 1, w: 0, y: 0, z: 0, demerits: 0, prev: null }];
  let sumW = 0;
  let sumY = 0;
  let sumZ = 0;

  const after = (b) => {
    let w = sumW;
    let y = sumY;
    let z = sumZ;
    for (let i = b; i < items.length; i++) {
      const it = items[i];
      if (it.type === 'glue') {
        w += it.width;
        y += it.stretch;
        z += it.shrink;
      } else if (it.type === 'box' || (it.type === 'penalty' && it.penalty === -INF && i > b)) break;
    }
    return { w, y, z };
  };

  const tryBreak = (b) => {
    const it = items[b];
    const isPen = it.type === 'penalty';
    const pen = isPen ? it.penalty : 0;
    const flagged = isPen && it.flagged && !it.final;
    const cands = [null, null, null, null];
    const next = [];
    for (const a of active) {
      const L = lineWidth(a.line);
      let width = sumW - a.w + (isPen ? it.width : 0);
      let r;
      if (width < L) {
        const st = sumY - a.y + (isPen ? it.stretch ?? 0 : 0);
        r = st > 0 ? (L - width) / st : INF;
      } else if (width > L) {
        const sh = sumZ - a.z;
        r = sh > 0 ? (L - width) / sh : -INF;
      } else r = 0;
      if (r < -1 || pen === -INF) {
        // deactivate (but still allow it to produce this candidate if feasible)
      } else next.push(a);
      if (r >= -1 && r <= tolerance) {
        const bad = 100 * Math.abs(r) ** 3;
        let d;
        if (pen >= 0) d = (linePenalty + bad) ** 2 + pen * pen;
        else if (pen > -INF) d = (linePenalty + bad) ** 2 - pen * pen;
        else d = (linePenalty + bad) ** 2;
        if (flagged && a.flagged) d += flaggedDemerits;
        if (it.final && a.flagged) d += finalHyphenDemerits;
        // runt control: a last line shorter than lastLineMin of the measure.
        // After a hyphen it would be a word's tail alone, which the strict
        // (first) pass refuses outright so the looser pass re-breaks the paragraph
        if (it.final && o.lastLineMin) {
          const nat = sumW - a.w;
          if (nat < o.lastLineMin * L) {
            if (o.strictRunt && a.flagged) continue;
            d += 2.5e5 * (1 - nat / (o.lastLineMin * L)) + 1e4;
          }
        }
        const fit = r < -0.5 ? 0 : r <= 0.5 ? 1 : r <= 1 ? 2 : 3;
        if (Math.abs(fit - a.fitness) > 1) d += fitnessDemerits;
        const total = a.demerits + d;
        if (!cands[fit] || total < cands[fit].demerits) cands[fit] = { a, demerits: total, r };
      }
    }
    active = next;
    let made = false;
    for (let f = 0; f < 4; f++) {
      const c = cands[f];
      if (!c) continue;
      const s = after(b);
      active.push({
        index: b,
        line: c.a.line + 1,
        fitness: f,
        w: s.w,
        y: s.y,
        z: s.z,
        demerits: c.demerits,
        prev: c.a,
        flagged,
      });
      made = true;
    }
    return made;
  };

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.type === 'box') sumW += it.width;
    else if (it.type === 'glue') {
      if (!it.nobreak && i > 0 && items[i - 1].type === 'box') tryBreak(i);
      sumW += it.width;
      sumY += it.stretch;
      sumZ += it.shrink;
    } else if (it.type === 'penalty' && it.penalty < INF) tryBreak(i);
    if (!active.length) return null;
  }
  let best = null;
  for (const a of active) if (a.index === items.length - 1 && (!best || a.demerits < best.demerits)) best = a;
  if (!best) return null;
  const breaks = [];
  for (let n = best; n && n.prev; n = n.prev) breaks.push(n.index);
  return breaks.reverse();
}

/** First-fit fallback (overfull words are allowed to stick out — never clipped). */
function greedy(items, lineWidth) {
  const breaks = [];
  let line = 0;
  let w = 0;
  let lastBreak = -1;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.type === 'box') {
      w += it.width;
      if (w > lineWidth(line) && lastBreak >= 0) {
        breaks.push(lastBreak);
        line++;
        // restart measuring after the break
        w = 0;
        let j = lastBreak + 1;
        while (j < items.length && items[j].type !== 'box') j++;
        i = j - 1;
        lastBreak = -1;
        continue;
      }
    } else if (it.type === 'glue') {
      if (!it.nobreak && i > 0 && items[i - 1].type === 'box') {
        lastBreak = i;
      }
      w += it.width;
    } else if (it.type === 'penalty') {
      if (it.penalty === -INF) {
        breaks.push(i);
        line++;
        w = 0;
        lastBreak = -1;
      } else if (it.penalty < INF && w + it.width <= lineWidth(line)) {
        lastBreak = i;
      }
    }
  }
  if (!breaks.length || breaks[breaks.length - 1] !== items.length - 1) breaks.push(items.length - 1);
  return breaks;
}

// ------------------------------------------------------------------ paragraph

/**
 * Lay out one paragraph.
 * @param {object} fonts   role → family (themeFonts)
 * @param {string|Array} src  markup string or runs
 * @param {object} o
 * @param {TextStyle} o.style
 * @param {number} o.width                 measure in px
 * @param {(i:number)=>number} [o.widthAt] per-line measure (overrides width)
 * @param {(i:number)=>number} [o.offsetAt] per-line x offset (e.g. drop cap)
 * @param {'justify'|'left'|'center'|'right'} [o.align='justify']
 * @param {number} [o.indent=0]            first-line indent px
 * @param {boolean} [o.hyphenate=true]
 * @param {boolean} [o.wholeWords=false]   verbatim text: break at spaces only (no hyphenation, no
 *                                         breaks at hyphens, dashes or slashes) unless a word is
 *                                         wider than the measure; bind phrases with U+00A0
 * @param {number} [o.lastLineMin]         runt control, fraction of measure
 * @param {number} [o.leading]             px line height (default size×leading)
 * @returns {Para}
 */
export function paragraph(fonts, src, o) {
  const rs = resolveStyle(fonts, o.style);
  const runs = normalizeRuns(fonts, src);
  const align = o.align ?? 'justify';
  const rag = align !== 'justify';
  const widthAt = o.widthAt ?? (() => o.width);
  const ragStretch = rs.size * (o.ragStretch ?? (align === 'center' ? 6 : 4));
  const whole = o.wholeWords ? Math.max(1, o.width ?? widthAt(0)) : 0;
  const { items } = buildItems(rs, runs, { rag, ragStretch, hyphenate: (o.hyphenate ?? true) && !whole, indent: o.indent ?? 0, whole });
  // runt control: justified and ragged-left text avoid a last line shorter than this
  // fraction of the measure; centred text is balanced instead
  const kpo = { tolerance: rag ? 2 : 1, lastLineMin: o.lastLineMin ?? (align === 'center' ? 0 : rag ? 0.12 : 0.14) };
  const solve = (wa, strict = false) => {
    let b = knuthPlass(items, wa, { ...kpo, strictRunt: true });
    if (!b) b = knuthPlass(items, wa, { ...kpo, tolerance: rag ? 8 : 3 });
    if (strict) return b;
    if (!b) b = knuthPlass(items, wa, { ...kpo, tolerance: INF / 10, lastLineMin: 0 });
    if (!b) b = greedy(items, wa);
    return b;
  };
  let breaks = solve(widthAt);
  // balance short centred text (titles, captions, blurbs): the narrowest
  // measure that keeps the same number of lines evens out their lengths
  if ((o.balance ?? align === 'center') && !o.widthAt && breaks.length > 1 && breaks.length <= 6) {
    const n = breaks.length;
    let lo = o.width * 0.3;
    let hi = o.width;
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      const b = solve(() => mid, true);
      if (b && b.length <= n) {
        hi = mid;
        breaks = b;
      } else lo = mid;
    }
  }
  const leading = o.leading ?? rs.size * rs.leading;
  return new Para(items, breaks, { rs, align, widthAt, offsetAt: o.offsetAt, leading });
}

/** A laid-out paragraph: lines of positioned boxes, drawn at any (x, y top). */
export class Para {
  constructor(items, breaks, { rs, align, widthAt, offsetAt, leading }) {
    this.style = rs;
    this.leading = leading;
    this.align = align;
    this.lines = [];
    const vm = vmetrics(rs.font);
    // baseline of the first line from the block top: centre the font box in the leading
    this.baseline0 = (leading - (vm.ascent + vm.descent)) / 2 + vm.ascent;
    this.cap = vm.cap;
    let start = 0;
    breaks.forEach((b, li) => {
      // skip discardable items at the line start
      while (start < b && items[start].type !== 'box') start++;
      const L = widthAt(li);
      const line = { boxes: [], width: 0, natural: 0, measure: L, x0: offsetAt ? offsetAt(li) : 0 };
      let nat = 0;
      let st = 0;
      let sh = 0;
      for (let i = start; i < b; i++) {
        const it = items[i];
        if (it.type === 'box') nat += it.width;
        else if (it.type === 'glue') {
          nat += it.width;
          st += it.stretch;
          sh += it.shrink;
        }
      }
      const brk = items[b];
      const hyph = brk.type === 'penalty' && brk.hyphen;
      if (brk.type === 'penalty') nat += brk.width;
      // a line after a break at a repeated hyphen opens with that hyphen
      const prevBrk = li > 0 ? items[breaks[li - 1]] : null;
      let preW = 0;
      if (prevBrk?.type === 'penalty' && prevBrk.repeat) {
        const first = items.slice(start, b).find((it) => it.type === 'box' && it.word);
        if (first) preW = measure(first.seg.font, '-', first.seg.tracking);
      }
      nat += preW;
      let r = 0;
      const last = brk.final || st >= INF / 2;
      if (align === 'justify' && !last) {
        if (nat < L && st > 0) r = Math.min(1, (L - nat) / st); // never beyond +35%
        else if (nat > L && sh > 0) r = Math.max(-1, (L - nat) / sh);
      }
      let x = preW;
      let cur = null;
      for (let i = start; i < b; i++) {
        const it = items[i];
        if (it.type === 'glue') {
          x += it.width + (r > 0 ? r * it.stretch : r * it.shrink);
          cur = null;
        } else if (it.type === 'box') {
          if (!it.word) {
            x += it.width; // indent
            cur = null;
            continue;
          }
          if (cur && cur.word === it.word && cur.seg === it.seg) {
            cur.to = it.to;
            cur.w += it.width;
          } else {
            cur = { word: it.word, seg: it.seg, from: it.from, to: it.to, x, w: it.width, hyph: false, preW: line.boxes.length ? 0 : preW };
            line.boxes.push(cur);
          }
          x += it.width;
        }
      }
      if (hyph && cur) {
        cur.hyph = true;
        x += brk.width;
      }
      line.width = x;
      line.natural = nat;
      this.lines.push(line);
      start = b + 1;
    });
    this.height = this.lines.length * leading;
  }

  get lineCount() {
    return this.lines.length;
  }

  /** Widest line (for shrink-wrapping boxes and centring). */
  get maxWidth() {
    return this.lines.reduce((m, l) => Math.max(m, l.width), 0);
  }

  /** x offset of line i within the block for its alignment. */
  lineX(i) {
    const l = this.lines[i];
    if (this.align === 'center') return l.x0 + (l.measure - l.width) / 2;
    if (this.align === 'right') return l.x0 + l.measure - l.width;
    return l.x0;
  }

  /**
   * Draw at block top-left (x, y).
   * @param {CanvasRenderingContext2D} g
   */
  draw(g, x, y) {
    this.drawLines(g, x, y, 0, this.lines.length);
  }

  /**
   * Draw lines [from, to) with line `from` placed at block top y (column flow).
   * @param {CanvasRenderingContext2D} g
   */
  drawLines(g, x, y, from, to) {
    let font = '';
    let color = '';
    let tracking = 0;
    const hasLS = 'letterSpacing' in g;
    for (let li = from; li < Math.min(to, this.lines.length); li++) {
      const l = this.lines[li];
      const by = y + this.baseline0 + (li - from) * this.leading;
      const lx = x + this.lineX(li);
      for (const b of l.boxes) {
        const seg = b.seg;
        const text = (b.preW ? '-' : '') + (seg.clean ?? stripSoftHyphens(seg.text)).slice(b.from, b.to) + (b.hyph ? '-' : '');
        if (seg.font !== font) {
          g.font = seg.font;
          font = seg.font;
        }
        if (seg.color !== color) {
          g.fillStyle = seg.color ?? '#000';
          color = seg.color;
        }
        if (seg.tracking !== tracking) {
          tracking = seg.tracking;
          if (hasLS) g.letterSpacing = `${tracking}px`;
        }
        const bx = lx + b.x - (b.preW || 0);
        if (tracking && !hasLS) drawTrackedManual(g, text, bx, by, tracking);
        else g.fillText(text, bx, by);
      }
    }
    if (hasLS && tracking) g.letterSpacing = '0px';
  }

  /** Baseline y (relative to the block top) of line i. */
  baselineOf(i) {
    return this.baseline0 + i * this.leading;
  }
}

// ------------------------------------------------------------------ single lines

/**
 * Single-line text (labels, running heads, numerals). Markup allowed.
 * @returns {{ width: number, draw: (g, x, baselineY, align?: 'left'|'center'|'right') => void, style: object }}
 */
export function line(fonts, src, style) {
  const rs = resolveStyle(fonts, style);
  const runs = normalizeRuns(fonts, src);
  const parts = [];
  let width = 0;
  for (const r of runs) {
    const s = r.style ?? rs;
    let font;
    let text = stripSoftHyphens(r.text);
    let tracking = s.tracking;
    if (s.caps && r.italic) {
      // italic inside a caps line (a binomial in a running head): body italic, not uppercased
      font = fontString(fonts, 'body', s.nominal * 1.3, 400, true);
      tracking = 0;
    } else {
      font = s.fontFor(s.italic !== !!r.italic, !!r.bold);
      if (s.caps) text = text.toUpperCase();
    }
    const gap = parts.length && parts[parts.length - 1].tracking ? parts[parts.length - 1].tracking : 0;
    width += gap;
    const w = measure(font, text, tracking);
    parts.push({ text, font, color: r.color ?? s.color, tracking, x: width, w });
    width += w;
  }
  return {
    width,
    style: rs,
    parts,
    draw(g, x, y, align = 'left') {
      let x0 = x;
      if (align === 'center') x0 = x - width / 2;
      else if (align === 'right') x0 = x - width;
      const hasLS = 'letterSpacing' in g;
      for (const p of parts) {
        g.font = p.font;
        g.fillStyle = p.color ?? '#000';
        if (p.tracking && hasLS) {
          g.letterSpacing = `${p.tracking}px`;
          g.fillText(p.text, x0 + p.x, y);
          g.letterSpacing = '0px';
        } else if (p.tracking) drawTrackedManual(g, p.text, x0 + p.x, y, p.tracking);
        else g.fillText(p.text, x0 + p.x, y);
      }
    },
  };
}

function drawTrackedManual(g, text, x, y, tracking) {
  let cx = x;
  for (const ch of text) {
    g.fillText(ch, cx, y);
    cx += g.measureText(ch).width + tracking;
  }
}

/**
 * Fit a single line into maxWidth by stepping the size down (display titles).
 * @returns the line() result at the chosen size
 */
export function fitLine(fonts, src, style, maxWidth, minScale = 0.6) {
  let s = 1;
  let l = line(fonts, src, style);
  while (l.width > maxWidth && s > minScale) {
    s -= 0.04;
    l = line(fonts, src, { ...style, size: style.size * s });
  }
  return l;
}
