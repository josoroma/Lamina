// Plate spreads: the verso text page (title block, status chips, lede, body,
// field notes, look-closer checklist, did-you-know box, sources) and the
// recto figure page (plate mark, ground "stage" for the pop-up, caption,
// scale note, animation line, quiet instruction).
//
// Every verso keeps one house arrangement (lede at the head of the main
// column, did-you-know at its foot) so plates read alike from spread to
// spread; auto-fit (page.js) may shrink the type a step or two to keep it.
// Other placements are measured too, but only rescue a page that even
// HOUSE_MIN_SCALE cannot save — the shortest, best-balanced one wins, at
// full size rather than in visibly smaller type.
import { FIGURE_AREA } from '../../figures/contract.js';
import { line, paragraph } from '../text.js';
import { furniture } from '../page.js';
import { plateMark, groundMark, rule } from '../draw.js';
import {
  paraBlock, bodyBlock, factsBlock, lookCloserBlock, dykBlock, chipsBlock, sourcesLine, stack,
  captionBlock, figureMetaBlock, isTaxon, isWarning,
} from '../blocks.js';
import { rgba } from '../util.js';
import { tl } from '../../../i18n/index.js';

/**
 * Where the plate mark ends on every recto figure page (fraction of the page
 * height). The pop-up stands over the mark, so the caption under it must not
 * move up (an open jaw would cover it); the reader keeps its labels off the
 * printed foot from the same line (Reader.js PRINTED_BANDS).
 */
const MARK_BOTTOM = 0.8;

/** Smallest auto-fit type scale at which a verso keeps the house arrangement. */
const HOUSE_MIN_SCALE = 0.95;

/** Plate text (verso). */
export function plateText(P) {
  const { W, H, theme: T, page } = P;
  const plate = page.plate ?? {};
  P.op((g) => {
    g.fillStyle = T.paper;
    g.fillRect(0, 0, W, H);
  });
  furniture(P);
  const { x, w } = P.text;
  let y = plateHeader(P, plate, page, x, P.text.y + P.ts(4), w);
  const { options, ledeFull, main, side, gutter, gap } = arrangements(P, plate, w);
  const room = P.text.bottom - y;
  // the house arrangement overflowing here, but saved by a smaller scale, is
  // placed anyway: the reported overflow makes auto-fit step the type down
  let best = options[0];
  if (best.total > room && !(P.fs > HOUSE_MIN_SCALE + 1e-6 && houseFits(P, plate, page, HOUSE_MIN_SCALE))) {
    const fits = options.filter((o) => o.total <= room).sort((a, b) => a.score - b.score);
    best = fits[0] ?? options.reduce((a, b) => (b.total < a.total ? b : a));
  }

  // columns: main (body) on the outer side, side panel (notes) by the gutter
  const mainX = P.recto ? x + side + gutter : x;
  const sideX = P.recto ? x : x + main + gutter;
  if (best.ledeAt === 'full') {
    ledeFull.place(x, y);
    y += ledeFull.h + gap;
  }
  const colTop = y;
  best.mainS.place(mainX, colTop);
  best.sideS.place(sideX, colTop);
  // hairline between the columns
  const sepX = P.recto ? x + side + gutter / 2 : x + main + gutter / 2;
  const colBottom = colTop + best.colH;
  P.op((g) => {
    g.strokeStyle = rgba(T.ink, 0.16);
    g.lineWidth = Math.max(1, P.px(1.2));
    g.beginPath();
    g.moveTo(sepX, colTop + P.ts(6));
    g.lineTo(sepX, colBottom - P.ts(6));
    g.stroke();
  });
  y = colBottom;
  if (best.bottomS.h) {
    y += gap;
    best.bottomS.place(x, y);
    y += best.bottomS.h;
  }
  P.reach(y);
}

/**
 * Measure every arrangement of a verso's blocks at the current type scale.
 * options[0] is the house arrangement (lede and did-you-know in the main
 * column); the rest move the lede across both columns and the box into the
 * side panel or across the foot of the page.
 */
function arrangements(P, plate, w) {
  const side = P.px(392);
  const gutter = P.px(58);
  const main = w - side - gutter;
  const gap = P.ts(30);
  const lede = plate.lede;
  const ledeFull = lede ? paraBlock(P, lede, 'lede', w, { align: 'left', hyphenate: false }) : null;
  const ledeMain = lede ? paraBlock(P, lede, 'lede', main, { align: 'left', hyphenate: false }) : null;
  const body = bodyBlock(P, plate.body, 'body', main);
  const facts = factsBlock(P, plate.facts, side);
  const look = lookCloserBlock(P, plate.lookCloser, side);
  const dyk = plate.didYouKnow;
  const dykSide = dyk ? dykBlock(P, dyk, side) : null;
  const dykMain = dyk ? dykBlock(P, dyk, main) : null;
  const dykFull = dyk ? dykBlock(P, dyk, w) : null;
  const src = sourcesLine(P, plate.sources, w);
  const sideGap = P.ts(40);

  const options = [];
  for (const ledeAt of lede ? ['main', 'full'] : ['none']) {
    for (const dykAt of dyk ? ['main', 'side', 'full'] : ['none']) {
      const top = ledeAt === 'full' ? ledeFull.h + gap : 0;
      const mainBlocks = [ledeAt === 'main' ? ledeMain : null, body, dykAt === 'main' ? dykMain : null];
      const sideBlocks = [facts, look, dykAt === 'side' ? dykSide : null];
      const mainS = stack(mainBlocks, gap);
      const sideS = stack(sideBlocks, sideGap);
      const colH = Math.max(mainS.h, sideS.h);
      const bottom = [dykAt === 'full' ? dykFull : null, src];
      const bottomS = stack(bottom, P.ts(26));
      const total = top + colH + (bottomS.h ? gap + bottomS.h : 0);
      const score = total + 0.12 * Math.abs(mainS.h - sideS.h);
      options.push({ ledeAt, dykAt, mainS, sideS, bottomS, colH, total, score });
    }
  }
  return { options, ledeFull, main, side, gutter, gap };
}

/** Whether the house arrangement fits the verso at type scale `fs` (a dry run). */
function houseFits(P, plate, page, fs) {
  const prev = P.fs;
  P.fs = fs;
  try {
    return P.dry(() => {
      const y = plateHeader(P, plate, page, P.text.x, P.text.y + P.ts(4), P.text.w);
      return arrangements(P, plate, P.text.w).options[0].total <= P.text.bottom - y;
    });
  } finally {
    P.fs = prev;
  }
}

/**
 * Title block shared by plate and lesson text pages.
 * @returns {number} y after the block
 */
export function plateHeader(P, plate, page, x, y, w) {
  const T = P.theme;
  const numeral = page.numeral ?? plate.number ?? '';
  const kst = P.style('kicker');
  const mst = P.style('kicker', { color: T.muted });
  const lesson = page.layout === 'lesson-text';
  const runs = [{ text: tl(P.lang, lesson ? 'Lesson {numeral}' : 'Plate {numeral}', { numeral }), style: kst }];
  if (plate.family) runs.push({ text: '  ·  ', style: mst }, { text: plate.family, style: mst });
  P.lineFit(runs, kst, x, y + P.ts(22), 'left', w, { what: 'plate kicker' });
  y += P.ts(40);
  const tst = P.style('title');
  let titleLine = line(P.fonts, plate.common ?? plate.title ?? '', tst);
  if (titleLine.width > w) titleLine = line(P.fonts, plate.common ?? '', { ...tst, size: tst.size * (w / titleLine.width) });
  const tby = y + tst.size * 0.86;
  P.op((g) => titleLine.draw(g, x - P.ts(4), tby));
  y += tst.size * 1.02;
  // alt name · binomial (authority)
  const parts = [];
  if (plate.commonAlt) parts.push({ text: plate.commonAlt, style: P.style('titleAlt') });
  if (plate.scientific) {
    if (parts.length) parts.push({ text: '   ', style: P.style('binomial') });
    parts.push({ text: plate.scientific, italic: isTaxon(plate), style: P.style('binomial', { size: P.ts(36) }) });
    if (plate.authority) parts.push({ text: ` ${plate.authority}`, style: P.style('binomial', { size: P.ts(29), color: T.muted }) });
  }
  if (parts.length) {
    // a long pair shrinks to the measure (as before), down to 80 %; past that it is reported
    P.lineFit(parts, P.style('binomial'), x, y + P.ts(40), 'left', w, { what: 'plate alt name and binomial', minScale: 0.8 });
    y += P.ts(58);
  }
  const chips = chipsBlock(P, plate.status, plate.badge, w, { warn: isWarning(plate) });
  if (chips) {
    y += P.ts(14);
    chips.place(x, y);
    y += chips.h;
  }
  y += P.ts(28);
  const ry = y;
  P.op((g) => rule(g, x, ry, x + w, rgba(T.ink, 0.55), Math.max(1, P.px(1.6))));
  P.op((g) => rule(g, x, ry + P.px(5), x + w, rgba(T.ink, 0.2), Math.max(1, P.px(1))));
  return y + P.ts(34);
}

/**
 * Geometry of the printed plate area on a recto figure page (canvas px).
 * @param {object} P  page context (or { W, H })
 */
export function figureFrame(P) {
  const { W, H } = P;
  const x0 = 0.07 * W;
  const x1 = 0.93 * W;
  const y0 = 0.09 * H;
  const y1 = MARK_BOTTOM * H;
  // FigureHost anchors the figure at (s, z·H) on the leaf: v = 0.5 + z
  const gx = FIGURE_AREA.s * W;
  const gy = (0.5 + FIGURE_AREA.z) * H;
  return { x0, x1, y0, y1, gx, gy, rx: 0.29 * W, ry: 0.112 * W };
}

/** Plate figure (recto). */
export function plateFigure(P) {
  figurePage(P, { lesson: false });
}

/**
 * Shared recto figure page (plates and lessons).
 * @param {object} o { lesson, grid }
 */
export function figurePage(P, { lesson = false, grid = false } = {}) {
  const { W, H, theme: T, page } = P;
  const plate = page.plate ?? {};
  const fig = plate.figure ?? {};
  P.op((g) => {
    g.fillStyle = T.paper;
    g.fillRect(0, 0, W, H);
  });
  furniture(P, { rule: false });
  const F = figureFrame(P);
  // plate mark (+ construction grid for lessons)
  P.op((g) => {
    plateMark(g, F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0, T, P.k, { tone: !T.engraving, crop: T.engraving, double: T.engraving });
    if (grid) constructionGrid(g, P, F);
    groundMark(g, F.gx, F.gy, F.rx, F.ry, T, P.k);
  });
  // plate number above the mark
  const numeral = page.numeral ?? plate.number ?? '';
  P.lineFit(tl(P.lang, lesson ? 'Lesson {numeral}' : 'Plate {numeral}', { numeral }), 'kicker', W / 2, F.y0 - P.ts(22), 'center', F.x1 - F.x0, { what: 'figure kicker', over: { tracking: 0.32 } });
  // caption, scale note & animation, optional layer line
  const cw = Math.min(P.text.w, 0.8 * W);
  const cx = (W - cw) / 2;
  let y = F.y1 + P.ts(30);
  const fallback = plate.scientific
    ? tl(P.lang, 'Fig. {n} — {scientific}', { n: page.figureNumber, scientific: isTaxon(plate) ? `*${plate.scientific}*` : plate.scientific })
    : null;
  const cap = captionBlock(P, fig.caption ?? fallback, cw);
  if (cap) {
    cap.place(cx, y);
    y += cap.h + P.ts(10);
  }
  const meta = figureMetaBlock(P, fig.scaleNote, plate.animation?.title, cw);
  if (meta) {
    meta.place(cx, y);
    y += meta.h;
  }
  const layers = plate.layers ?? fig.layers;
  if (Array.isArray(layers) && layers.length) {
    y += P.ts(8);
    y = layerLine(P, layers, cx, y, cw);
  }
  // a lesson's did-you-know: a centred run-in note under the caption. Its last
  // line may hang into the foot margin (still well clear of the instruction
  // row) rather than set this recto's type smaller than the others'
  let limit = P.text.bottom;
  if (lesson && plate.didYouKnow) {
    y += P.ts(20);
    const ry = y;
    P.op((g) => rule(g, W / 2 - P.ts(28), ry, W / 2 + P.ts(28), rgba(T.accent, 0.75), Math.max(1, P.px(1.5))));
    y += P.ts(16);
    const st = P.style('dyk', { size: P.ts(26), leading: 1.38 });
    const runs = [
      { text: tl(P.lang, 'Did you know?'), style: P.style('label', { color: T.accent, size: P.ts(17.5) }) },
      { text: ' ' },
      { text: plate.didYouKnow, markup: true },
    ];
    const note = paragraph(P.fonts, runs, { style: st, width: cw * 0.88, align: 'center', hyphenate: false });
    const ny = y;
    P.op((g) => note.draw(g, cx + cw * 0.06, ny));
    y += note.height;
    limit += note.leading;
  }
  P.reach(y, limit);
  // quiet instruction at the foot, inner side, on the folio's baseline
  const instr = fig.instruction ?? tl(P.lang, 'Drag to turn the figure · double-click to inspect');
  const iy = H - P.margins.bottom * 0.42;
  // (the folio prints at the outer corner of the same baseline)
  P.lineFit(instr, 'instruction', P.recto ? P.text.x : P.text.right, iy, P.recto ? 'left' : 'right', P.text.w - P.ts(120), { what: 'figure instruction' });
}

function layerLine(P, layers, x, y, w) {
  const T = P.theme;
  const st = P.style('labelMuted', { color: T.ink });
  const lab = line(P.fonts, tl(P.lang, 'Layers'), P.style('labelMuted'));
  const items = layers.map((l) => (typeof l === 'string' ? { id: l, label: l } : l)).map((l) => ({ ...l, ln: line(P.fonts, l.label ?? l.id, st) }));
  const sep = P.ts(30);
  const total = lab.width + sep + items.reduce((s, it) => s + it.ln.width, 0) + sep * (items.length - 1);
  let xx = x + (w - total) / 2;
  const by = y + P.ts(24);
  const lx = xx;
  P.op((g) => lab.draw(g, lx, by));
  xx += lab.width + sep;
  for (const it of items) {
    const ix = xx;
    P.op((g) => it.ln.draw(g, ix, by));
    P.hit(`layer-${it.id}`, [ix - P.ts(8), by - P.ts(24), ix + it.ln.width + P.ts(8), by + P.ts(10)], { type: 'layer', id: it.id });
    xx += it.ln.width + sep;
  }
  return y + P.ts(36);
}

/** Faint drawing grid with a centre axis inside the plate mark (lessons). */
function constructionGrid(g, P, F) {
  const T = P.theme;
  const cell = 0.05 * P.W;
  g.save();
  g.beginPath();
  g.rect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0);
  g.clip();
  g.strokeStyle = rgba(T.accent, 0.1);
  g.lineWidth = Math.max(1, P.px(1));
  g.beginPath();
  for (let x = F.gx; x <= F.x1; x += cell) {
    g.moveTo(x, F.y0);
    g.lineTo(x, F.y1);
  }
  for (let x = F.gx - cell; x >= F.x0; x -= cell) {
    g.moveTo(x, F.y0);
    g.lineTo(x, F.y1);
  }
  for (let y = F.gy; y <= F.y1; y += cell) {
    g.moveTo(F.x0, y);
    g.lineTo(F.x1, y);
  }
  for (let y = F.gy - cell; y >= F.y0; y -= cell) {
    g.moveTo(F.x0, y);
    g.lineTo(F.x1, y);
  }
  g.stroke();
  g.strokeStyle = rgba(T.accent, 0.38);
  g.setLineDash([P.px(10), P.px(7)]);
  g.beginPath();
  g.moveTo(F.gx, F.y0);
  g.lineTo(F.gx, F.y1);
  g.moveTo(F.x0, F.gy);
  g.lineTo(F.x1, F.gy);
  g.stroke();
  g.setLineDash([]);
  g.restore();
}
