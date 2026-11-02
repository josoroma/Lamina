// Page context: geometry, theme colours, the type scale and a tiny display
// list with auto-fit.
//
// Layouts are written once, top to bottom, as "measure → queue a draw op →
// advance y". If the content overflows the text block, the same layout is
// re-run with a smaller type scale (down to 85%) before anything is drawn —
// text is never clipped, and an unfixable overflow is reported with
// console.warn('[typeset] overflow', key). All sizes are authored for a
// 1536 px wide page and multiplied by `k` so any texture width works.
//
// A page prints in its edition's language (P.lang = page.book.locale): its
// layouts look strings up with tl(P.lang, '…'), never in the reader's current
// language, so a page is a pure function of its spec. Auto-fit only measures how far text reaches
// down; single lines that run past their measure are shrunk by P.lineFit and,
// when even that fails, reported in P.hOverflow.
import { themeFonts } from './fonts.js';
import { paragraph, line, fitLine, prepareContext, measure } from './text.js';
import { mix, rgba, createCanvas } from './util.js';

export const PAGE_ASPECT = 1.38;
export const BOARD_ASPECT = (1.38 + 2 * 0.028) / (1 + 0.028);
export const DESIGN_WIDTH = 1536;
const MIN_SCALE = 0.85;
const FIT_STEP = 0.025;

export const DEFAULT_THEME = {
  style: 'lithograph',
  cloth: '#1f3a2b',
  foil: '#c9a44c',
  paper: '#fbf8f1',
  ink: '#1c1a17',
  accent: '#9e2b25',
  muted: '#7b7466',
  endpaper: { motif: 'scales', color: '#1f3a2b', ground: '#efe7d6' },
  fonts: {},
};

/** Merge a manifest theme with defaults; derives secondary colours. */
export function resolveTheme(theme = {}) {
  const t = { ...DEFAULT_THEME, ...theme };
  t.endpaper = { ...DEFAULT_THEME.endpaper, color: t.cloth, ...(theme.endpaper ?? {}) };
  t.fonts = themeFonts(t);
  t.engraving = t.style === 'engraving';
  t.hair = mix(t.ink, t.paper, 0.72);
  t.faint = mix(t.ink, t.paper, 0.88);
  t.tint = mix(t.accent, t.paper, 0.93);
  t.wash = mix(t.muted, t.paper, 0.9);
  return t;
}

/** Canvas size for a page spec. */
export function pageSize(page, width = DESIGN_WIDTH) {
  const board = page.board ?? (page.layout === 'cover' || page.layout === 'back-cover');
  return { w: Math.round(width), h: Math.round(width * (board ? BOARD_ASPECT : PAGE_ASPECT)), board };
}

/**
 * Create the drawing context for one page.
 * @param {object} page   page spec from buildSides
 * @param {object} opts   { theme, width, stepDrawer }
 */
export function createPage(page, { theme, width = DESIGN_WIDTH, stepDrawer } = {}) {
  const T = resolveTheme(theme ?? page.theme ?? {});
  const { w: W, h: H, board } = pageSize(page, width);
  const canvas = createCanvas(W, H);
  const g = prepareContext(canvas.getContext('2d'));
  const k = W / DESIGN_WIDTH;
  const recto = page.recto ?? page.side !== 'back';
  // CONTRACTS §13 margins: outer 9%, inner 11% (of width); top 8%, bottom 10% (of height)
  const m = { top: 0.08 * H, bottom: 0.1 * H, inner: 0.11 * W, outer: 0.09 * W };
  const left = recto ? m.inner : m.outer;
  const right = recto ? m.outer : m.inner;
  const P = {
    page,
    theme: T,
    fonts: T.fonts,
    canvas,
    g,
    W,
    H,
    k,
    board,
    recto,
    stepDrawer,
    margins: m,
    text: { x: left, y: m.top, w: W - left - right, h: H - m.top - m.bottom, right: W - right, bottom: H - m.bottom },
    fs: 1, // font scale (auto-fit)
    ops: [],
    hits: [],
    hOverflow: [],
    overflowAt: 0,
    lang: page.book?.locale ?? 'en', // the language every string on the page is printed in
  };

  /** Queue a draw op. */
  P.op = (fn) => {
    P.ops.push(fn);
  };
  /** Run queued ops. */
  P.flush = () => {
    for (const fn of P.ops) {
      g.save();
      fn(g);
      g.restore();
    }
    P.ops.length = 0;
  };
  /** Size helper: design px → canvas px (geometry, not type). */
  P.px = (v) => v * k;
  /** Type size helper: design px → canvas px × auto-fit scale. */
  P.ts = (v) => v * k * P.fs;

  /** Named text styles (CONTRACTS §13), scaled by k·fs. */
  P.style = (name, over = {}) => ({ ...styleTable(T, name, P.ts), ...over });

  /** Lay out a paragraph and queue its drawing; returns the Para. */
  P.para = (src, styleName, o) => {
    const st = typeof styleName === 'string' ? P.style(styleName, o.over) : styleName;
    const para = paragraph(P.fonts, src, { ...o, style: st });
    if (o.draw !== false) {
      const { x, y } = o;
      P.op((gg) => para.draw(gg, x, y));
    }
    return para;
  };
  /** One line of text; queue it at baseline y. */
  P.line = (src, styleName, x, y, align = 'left', over = {}) => {
    const st = typeof styleName === 'string' ? P.style(styleName, over) : styleName;
    const l = line(P.fonts, src, st);
    P.op((gg) => l.draw(gg, x, y, align));
    return l;
  };
  /** Measure a line without drawing. */
  P.measureLine = (src, styleName, over = {}) => line(P.fonts, src, typeof styleName === 'string' ? P.style(styleName, over) : styleName);
  /** Fit a display line into maxWidth by shrinking. */
  P.fitLine = (src, styleName, maxWidth, over = {}) => fitLine(P.fonts, src, P.style(styleName, over), maxWidth);
  P.measure = measure;

  /**
   * A single line that must stay inside `maxWidth` (canvas px): measured, set
   * smaller when too wide (down to `minScale` of its size), and — when even
   * that is too wide — drawn at the smallest size and reported in
   * P.hOverflow as { what, text, over } (over in design px). Auto-fit only
   * sees how far text reaches down, so this is the sideways guard for running
   * heads, kickers, chips and the other one-line furniture.
   * @param {string|Array} src   markup string or runs (run styles scale too)
   * @param {string|object} styleName
   * @param {object} [o] { what, minScale = 0.85, over, draw = true }
   * @returns the line() result (drawn at (x, y) with `align` unless draw: false)
   */
  P.lineFit = (src, styleName, x, y, align, maxWidth, { what = 'line', minScale = 0.85, over = {}, draw = true } = {}) => {
    const st = typeof styleName === 'string' ? P.style(styleName, over) : styleName;
    const l = P.fitWidth(src, st, maxWidth, { what, minScale });
    if (draw) P.op((gg) => l.draw(gg, x, y, align));
    return l;
  };
  /** Measure-only half of lineFit: the line at the largest size (≥ minScale) that fits. */
  P.fitWidth = (src, st, maxWidth, { what = 'line', minScale = 0.85 } = {}) => {
    let l = line(P.fonts, src, st);
    if (l.width <= maxWidth + 0.5) return l;
    let s = Math.max(minScale, (maxWidth / l.width) * 0.998);
    l = line(P.fonts, scaleRuns(src, s), scaleStyle(st, s));
    while (l.width > maxWidth + 0.5 && s > minScale + 1e-6) {
      s = Math.max(minScale, s - 0.01);
      l = line(P.fonts, scaleRuns(src, s), scaleStyle(st, s));
    }
    if (l.width > maxWidth + 0.5) P.hOverflow.push({ what, text: plainOf(src), over: Math.round((l.width - maxWidth) / k) });
    return l;
  };

  /**
   * Register a hit rect in canvas px; stored normalised (v from top).
   * @param {string} id
   * @param {number[]} r  [x0, y0, x1, y1] px
   * @param {object} action
   */
  P.hit = (id, r, action) => {
    P.hits.push({
      id,
      rect: [r[0] / W, r[1] / H, r[2] / W, r[3] / H].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 1e4) / 1e4),
      action,
    });
  };

  /** Run `fn` as a measuring pass: its ops, hits and reach are discarded; returns its result. */
  P.dry = (fn) => {
    const ops = P.ops.length;
    const hits = P.hits.length;
    const hov = P.hOverflow.length;
    const over = P.overflowAt;
    const r = fn();
    P.ops.length = ops;
    P.hits.length = hits;
    P.hOverflow.length = hov;
    P.overflowAt = over;
    return r;
  };

  /**
   * Chapter-opener sinkage: how far to push a short page's content down so
   * it starts lower, as book openers do. `contentH` from a dry run.
   */
  P.sinkage = (contentH, max = 0.13) => Math.min(max * P.H, Math.max(0, (P.text.h - contentH) * 0.4));

  /** Note how far content reaches (px); auto-fit compares it to the limit. */
  P.reach = (y, limit = P.text.bottom) => {
    P.overflowAt = Math.max(P.overflowAt, y - limit);
  };
  return P;
}

/**
 * Run a layout with auto-fit: try type scales 1 → 0.85 until nothing
 * overflows, then draw. Returns { overflow, scale, hOverflow }.
 *
 * A layout may carry `layout.fit = { minScale, step }` (the making pages may
 * shrink only to their 25 px floor, in finer steps). Scales are computed from
 * an integer step count, so they print exactly (0.9, never 0.8999999).
 */
export function runLayout(P, layout) {
  const minScale = layout.fit?.minScale ?? MIN_SCALE;
  const step = layout.fit?.step ?? FIT_STEP;
  let fs = 1;
  for (let i = 1; ; i++) {
    P.fs = fs;
    P.ops.length = 0;
    P.hits.length = 0;
    P.hOverflow.length = 0;
    P.overflowAt = 0;
    layout(P);
    const next = Math.round((1 - i * step) * 1e4) / 1e4;
    if (P.overflowAt <= 0.5 || next < minScale - 1e-6) break;
    fs = next;
  }
  const overflow = P.overflowAt > 0.5;
  if (overflow) console.warn('[typeset] overflow', P.page.key, `${Math.round(P.overflowAt)} px at ${Math.round(fs * 1000) / 10}%`);
  if (P.hOverflow.length) console.warn('[typeset] hOverflow', P.page.key, P.hOverflow.map((o) => `${o.what} +${o.over}px`).join(', '));
  P.flush();
  return { overflow, scale: fs, hOverflow: P.hOverflow.slice() };
}

const scaleStyle = (st, s) => ({ ...st, size: st.size * s });
/** Runs (or a markup string) with every run's own style scaled by `s`. */
const scaleRuns = (src, s) => (Array.isArray(src) ? src.map((r) => (r && typeof r === 'object' && r.style ? { ...r, style: scaleStyle(r.style, s) } : r)) : src);
const plainOf = (src) => (Array.isArray(src) ? src.map((r) => (typeof r === 'string' ? r : r?.text ?? '')).join('') : String(src ?? '')).replace(/\*+/g, '');

// ------------------------------------------------------------------ type scale

function styleTable(T, name, ts) {
  const ink = T.ink;
  const eng = T.engraving;
  switch (name) {
    // running text
    case 'body':
      return { role: 'body', size: ts(32), leading: 1.45, color: ink };
    case 'essay':
      return { role: 'body', size: ts(34), leading: 1.48, color: ink };
    case 'small':
      return { role: 'body', size: ts(26), leading: 1.4, color: ink };
    case 'note':
      return { role: 'body', size: ts(23), leading: 1.38, color: ink };
    case 'lede':
      return { role: 'display', size: ts(45), weight: 500, italic: true, leading: 1.22, color: ink };
    case 'pull':
      return { role: 'display', size: ts(46), weight: 500, italic: true, leading: 1.22, color: T.accent };
    case 'dyk':
      return { role: 'body', size: ts(29), italic: true, leading: 1.4, color: ink };
    case 'caption':
      return { role: 'body', size: ts(29), leading: 1.36, color: ink };
    case 'lookText':
      return { role: 'body', size: ts(27), leading: 1.34, color: ink };
    case 'factValue':
      return { role: 'body', size: ts(29), leading: 1.25, color: ink };
    case 'glossTerm':
      return { role: 'body', size: ts(30), weight: 600, leading: 1.4, color: ink };
    case 'gloss':
      return { role: 'body', size: ts(30), leading: 1.4, color: ink };
    // display
    case 'title':
      return eng
        ? { role: 'condensed', size: ts(118), weight: 600, caps: 'all', tracking: 0.01, leading: 1.0, color: ink }
        : { role: 'display', size: ts(124), weight: 600, leading: 1.0, color: ink };
    case 'titleAlt':
      return { role: 'display', size: ts(46), weight: 500, italic: true, leading: 1.1, color: T.muted };
    case 'h1':
      return eng
        ? { role: 'condensed', size: ts(84), weight: 600, caps: 'all', tracking: 0.02, leading: 1.04, color: ink }
        : { role: 'display', size: ts(88), weight: 600, leading: 1.05, color: ink };
    case 'h2':
      return eng
        ? { role: 'condensed', size: ts(44), weight: 500, caps: 'all', tracking: 0.04, leading: 1.1, color: ink }
        : { role: 'display', size: ts(46), weight: 600, leading: 1.12, color: ink };
    case 'binomial':
      return { role: 'body', size: ts(34), leading: 1.2, color: ink, italic: false };
    case 'numeral':
      return { role: 'display', size: ts(34), weight: 600, leading: 1, color: T.accent };
    // labels (small caps by convention: uppercase, tracked)
    case 'kicker':
      return { role: 'label', size: ts(21), weight: 500, caps: 'all', tracking: 0.2, leading: 1.2, color: T.accent };
    case 'label':
      return { role: 'label', size: ts(19), weight: 600, caps: 'all', tracking: 0.16, leading: 1.2, color: ink };
    case 'labelMuted':
      return { role: 'label', size: ts(19), weight: 500, caps: 'all', tracking: 0.16, leading: 1.2, color: T.muted };
    case 'factLabel':
      return { role: 'label', size: ts(18.5), weight: 500, caps: 'all', tracking: 0.1, leading: 1.2, color: T.muted };
    case 'runningHead':
      return { role: 'label', size: ts(18), weight: 500, caps: 'all', tracking: 0.24, leading: 1, color: T.muted, keepTracking: false };
    case 'folio':
      // EB Garamond's lining figures: Cormorant's old-style 1 reads like a roman I
      return eng
        ? { role: 'mono', size: ts(21), weight: 500, leading: 1, color: ink }
        : { role: 'body', size: ts(29), weight: 500, leading: 1, color: ink };
    case 'instruction':
      return { role: 'label', size: ts(17.5), weight: 400, caps: 'all', tracking: 0.14, leading: 1.3, color: T.muted };
    case 'chip':
      return { role: 'label', size: ts(19), weight: 500, caps: 'all', tracking: 0.1, leading: 1, color: ink };
    case 'chipCode':
      return { role: 'mono', size: ts(19), weight: 500, leading: 1, color: '#ffffff' };
    case 'mono':
      return { role: 'mono', size: ts(22), weight: 400, leading: 1.3, color: ink };
    case 'step':
      return { role: 'condensed', size: ts(64), weight: 600, leading: 1, color: ink };
    case 'stepTitle':
      return { role: 'label', size: ts(21), weight: 600, caps: 'all', tracking: 0.12, leading: 1.2, color: ink };
    case 'stepText':
      return { role: 'body', size: ts(24), leading: 1.36, color: ink };
    case 'vertical':
      return { role: 'condensed', size: ts(200), weight: 600, caps: 'all', tracking: 0.02, leading: 1, color: ink };
    default:
      return { role: 'body', size: ts(30), leading: 1.45, color: ink };
  }
}

// ------------------------------------------------------------------ page furniture

/**
 * Running head (top, outer side) and folio (bottom, outer corner).
 * Markup in running heads (e.g. *Bothrops asper*) is set in italic.
 */
export function furniture(P, { head = true, folio = true, rule = true } = {}) {
  const { page, H, theme: T, text } = P;
  const outerX = P.recto ? text.right : text.x;
  const align = P.recto ? 'right' : 'left';
  if (head && page.runningHead) {
    const y = P.margins.top * 0.52;
    P.lineFit(page.runningHead, 'runningHead', outerX, y, align, text.w, { what: 'running head' });
    if (rule) {
      const ry = y + P.px(22);
      P.op((g) => {
        g.strokeStyle = rgba(T.ink, 0.22);
        g.lineWidth = Math.max(1, P.px(1.4));
        g.beginPath();
        g.moveTo(text.x, ry);
        g.lineTo(text.right, ry);
        g.stroke();
      });
    }
  }
  if (folio && page.folio != null) {
    const y = H - P.margins.bottom * 0.42;
    const st = P.style('folio');
    const l = P.measureLine(String(page.folio), st);
    P.op((g) => l.draw(g, outerX, y, align));
  }
}
