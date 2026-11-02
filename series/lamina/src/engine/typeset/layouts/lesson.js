// Lesson spreads for drawing books (CONTRACTS §12 III): an instructional
// verso with a huge vertical condensed title along the outer edge, a pro-tip
// card, numbered construction panels (01 02 03) whose diagrams are drawn by
// the subject module's drawStep (via opts.stepDrawer), and the mistakes /
// proportions / look-closer notes in three columns under the three panels;
// the recto is the figure page with a construction grid and, under the
// caption, the lesson's "Did you know?".
//
// Why the verso is built this tight: Spanish runs 10–25 % longer than
// English, and every lesson verso must keep ≥ 90 % type in both editions
// (≥ 97.5 % in English). The notes share the panels' three-column grid, the
// band is narrower than a first draft's, and the did-you-know box lives on
// the recto, where the plate mark leaves room under the caption.
import { line, paragraph, resolveStyle, vmetrics } from '../text.js';
import { furniture } from '../page.js';
import { rule } from '../draw.js';
import {
  paraBlock, lookCloserBlock, chipsBlock, listBlock, sourcesLine, isTaxon, isWarning,
} from '../blocks.js';
import { emblemGeometry } from '../emblems.js';
import { figurePage } from './plate.js';
import { rgba, mix } from '../util.js';
import { tl } from '../../../i18n/index.js';

/** Width of the vertical title band and its gap to the text (design px). */
const BAND = 150;
const BAND_GAP = 40;
/** Gap between the three panel columns (and the notes under them). */
const STEP_GAP = 34;

/** Lesson figure (recto): the figure page with a drawing grid. */
export function lessonFigure(P) {
  figurePage(P, { lesson: true, grid: true });
}

/** Lesson text (verso). */
export function lessonText(P) {
  const { W, H, theme: T, page } = P;
  const plate = page.plate ?? {};
  const lesson = plate.lesson ?? {};
  P.op((g) => {
    g.fillStyle = T.paper;
    g.fillRect(0, 0, W, H);
  });
  furniture(P);
  const { x: tx, y: ty, w: tw, bottom } = P.text;

  // vertical title band on the outer edge
  const band = P.px(BAND);
  const bandX = P.recto ? P.text.right - band : tx;
  verticalTitle(P, plate, page, bandX, ty, band, bottom - ty);
  const gapBand = P.px(BAND_GAP);
  const x = P.recto ? tx : tx + band + gapBand;
  const w = tw - band - gapBand;

  let y = ty + P.ts(2);
  // kicker (+ the badge chip at its right when both fit on the row)
  const kst = P.style('kicker');
  const mst = P.style('kicker', { color: T.muted });
  const runs = [{ text: tl(P.lang, 'Lesson {numeral}', { numeral: page.numeral ?? plate.number ?? '' }), style: kst }];
  if (plate.family) runs.push({ text: '  ·  ', style: mst }, { text: plate.family, style: mst });
  const chips = chipsBlock(P, plate.status, plate.badge, w, { warn: isWarning(plate) });
  const chipW = chips ? chips.w ?? 0 : 0;
  const ky = y + P.ts(22);
  const klNat = line(P.fonts, runs, kst);
  const chipOnKicker = !!chips && chips.rows === 1 && klNat.width + P.ts(30) + chipW <= w;
  P.lineFit(runs, kst, x, ky, 'left', chipOnKicker ? w - chipW - P.ts(30) : w, { what: 'lesson kicker' });
  if (chipOnKicker) chips.place(x + w - chipW, ky - P.ts(31));
  y += P.ts(40);
  // the vertical band carries the title; the header gives its translation and subject
  const subParts = [];
  // engraving books set the alternate name as a condensed sub-heading; lithographs in italic
  if (plate.commonAlt) {
    const st = T.engraving
      ? { role: 'condensed', size: P.ts(44), weight: 500, color: T.ink }
      : P.style('titleAlt', { size: P.ts(40), color: T.ink });
    subParts.push({ text: plate.commonAlt, style: st });
  }
  if (plate.scientific) {
    if (subParts.length) subParts.push({ text: '   ', style: P.style('binomial') });
    // italic only for a taxon (a name with an authority), in both editions
    subParts.push({ text: plate.scientific, italic: isTaxon(plate), style: P.style('binomial', { size: P.ts(30), color: T.muted }) });
  }
  const slNat = subParts.length ? line(P.fonts, subParts, P.style('binomial')) : null;
  const chipOnSub = !!chips && !chipOnKicker && !!slNat && chips.rows === 1 && slNat.width + P.ts(30) + chipW <= w;
  if (slNat) P.lineFit(subParts, P.style('binomial'), x, y + P.ts(40), 'left', chipOnSub ? w - chipW - P.ts(30) : w, { what: 'lesson subtitle' });
  if (chipOnSub) {
    chips.place(x + w - chipW, y + P.ts(40) - P.ts(31));
    y += P.ts(58);
  } else {
    if (slNat) y += P.ts(58);
    if (chips && !chipOnKicker) {
      chips.place(x, y);
      y += chips.h + P.ts(4);
    }
  }
  y += P.ts(16);
  const ry = y;
  P.op((g) => rule(g, x, ry, x + w, T.ink, Math.max(1.5, P.px(3))));
  y += P.ts(28);

  const gap = P.ts(26);
  if (plate.lede) {
    const lb = paraBlock(P, plate.lede, 'lede', w, { align: 'left', hyphenate: false, over: { size: P.ts(40) } });
    lb.place(x, y);
    y += lb.h + gap;
  }
  const strip = factStrip(P, plate.facts, w);
  if (strip) {
    strip.place(x, y);
    y += strip.h + gap;
  }
  const bodyParas = (plate.body ?? []).filter(Boolean);
  if (bodyParas.length) {
    const cols = columnsBlock(P, bodyParas, 'small', w, P.px(44));
    cols.place(x, y);
    y += cols.h + gap;
  }
  if (lesson.proTip) {
    const tip = proTipBlock(P, lesson.proTip, w);
    tip.place(x, y);
    y += tip.h + gap;
  }
  const steps = (lesson.steps ?? []).slice(0, 4);
  if (steps.length) {
    const sb = stepsBlock(P, steps, w);
    sb.place(x, y);
    y += sb.h + gap;
  }
  // notes: mistakes | proportions | look closer, one per column of the
  // panels' grid (the did-you-know box is printed on the recto)
  const colGap = P.px(STEP_GAP);
  const cw = (w - colGap * 2) / 3;
  const blocks = [
    listBlock(P, tl(P.lang, 'Common mistakes'), lesson.mistakes, cw, { bullet: 'cross' }),
    listBlock(P, tl(P.lang, 'Proportions'), lesson.proportions, cw, { bullet: 'diamond' }),
    lookCloserBlock(P, plate.lookCloser, cw),
  ].filter(Boolean);
  const notes = blocks.map((b, i) => {
    b.place(x + i * (cw + colGap), y);
    return b.h;
  });
  if (notes.length) y += Math.max(...notes);
  const src = sourcesLine(P, plate.sources, w);
  if (src) {
    y += gap;
    src.place(x, y);
    y += src.h;
  }
  P.reach(y);
}

/** Big vertical condensed title, reading bottom → top, with a numeral tab. */
function verticalTitle(P, plate, page, bx, by, bw, bh) {
  const T = P.theme;
  const tab = bw;
  // type sizes were drawn for a 178 px band: they follow the band's width
  const u = bw / P.px(178);
  const numeral = String(page.numeral ?? plate.number ?? '');
  // numeral tab: solid ink square with the lesson number
  P.op((g) => {
    g.fillStyle = T.ink;
    g.fillRect(bx, by, tab, tab);
  });
  const nst = P.style('vertical', { size: P.px((numeral.length > 2 ? 72 : 104) * u), color: T.paper, tracking: 0 });
  const nl = line(P.fonts, numeral, nst);
  const nvm = vmetrics(resolveStyle(P.fonts, nst).font);
  P.op((g) => nl.draw(g, bx + tab / 2, by + tab / 2 + nvm.cap / 2, 'center'));
  // the title runs up the band from the bottom
  const avail = bh - tab - P.px(40);
  const text = String(plate.common ?? plate.title ?? '').toUpperCase();
  let st = P.style('vertical', { size: P.px(206 * u) });
  let l = line(P.fonts, text, st);
  if (l.width > avail) {
    st = { ...st, size: st.size * (avail / l.width) };
    l = line(P.fonts, text, st);
  }
  const vm = vmetrics(resolveStyle(P.fonts, st).font);
  const capH = vm.cap;
  const baseX = bx + (bw + capH) / 2;
  P.op((g) => {
    g.save();
    g.translate(baseX, by + bh);
    g.rotate(-Math.PI / 2);
    l.draw(g, 0, 0);
    g.restore();
    // hairline along the band's inner edge
    g.strokeStyle = rgba(T.ink, 0.35);
    g.lineWidth = Math.max(1, P.px(1.2));
    const ex = P.recto ? bx : bx + bw;
    g.beginPath();
    g.moveTo(ex, by + tab + P.px(20));
    g.lineTo(ex, by + bh);
    g.stroke();
  });
}

/**
 * Facts as a horizontal data strip (up to 4 cells per row): small-caps label
 * over a serif value, cells divided by hairlines — compact technical matter.
 */
function factStrip(P, facts, w) {
  const rows = (facts ?? []).filter((r) => Array.isArray(r) && r.length >= 2);
  if (!rows.length) return null;
  const T = P.theme;
  const per = rows.length <= 4 ? rows.length : Math.ceil(rows.length / 2);
  const gutter = P.ts(22);
  const cellW = (w - gutter * (per - 1)) / per;
  const lst = P.style('factLabel');
  const vst = P.style('factValue', { size: P.ts(27) });
  const cells = rows.map(([label, value]) => {
    const lp = paragraph(P.fonts, label, { style: lst, width: cellW - P.ts(14), align: 'left', hyphenate: false });
    const vp = paragraph(P.fonts, value, { style: vst, width: cellW - P.ts(14), align: 'left', hyphenate: false });
    return { lp, vp, h: lp.height + P.ts(4) + vp.height };
  });
  const lines = Math.ceil(cells.length / per);
  const rowH = [];
  for (let r = 0; r < lines; r++) rowH.push(Math.max(...cells.slice(r * per, r * per + per).map((c) => c.h)));
  const vgap = P.ts(16);
  const h = rowH.reduce((s, v) => s + v, 0) + vgap * (lines - 1);
  return {
    h,
    place(x, y) {
      let yy = y;
      for (let r = 0; r < lines; r++) {
        const top = yy;
        cells.slice(r * per, r * per + per).forEach((c, i) => {
          const cx = x + i * (cellW + gutter);
          P.op((g) => {
            g.strokeStyle = T.engraving ? T.ink : rgba(T.ink, 0.5);
            g.lineWidth = Math.max(1, P.px(i ? 1.2 : 2.4));
            g.beginPath();
            g.moveTo(cx, top);
            g.lineTo(cx, top + rowH[r]);
            g.stroke();
            c.lp.draw(g, cx + P.ts(14), top);
            c.vp.draw(g, cx + P.ts(14), top + c.lp.height + P.ts(4));
          });
        });
        yy += rowH[r] + vgap;
      }
    },
  };
}

/** Pro-tip card: ink border, a solid tab label, italic advice. */
function proTipBlock(P, text, w) {
  const T = P.theme;
  const pad = P.ts(26);
  const st = P.style('dyk', { size: P.ts(28), leading: 1.38 });
  const lab = P.fitWidth(tl(P.lang, 'Pro tip'), P.style('label', { color: T.paper, size: P.ts(18) }), w - pad * 2 - P.ts(28), { what: 'pro tip label' });
  const tabW = lab.width + P.ts(28);
  const tabH = P.ts(34);
  const para = paragraph(P.fonts, text, { style: st, width: w - pad * 2, align: 'left' });
  const h = tabH / 2 + pad + para.height + pad * 0.8;
  return {
    h,
    place(x, y) {
      P.op((g) => {
        g.strokeStyle = T.ink;
        g.lineWidth = Math.max(1.2, P.px(2.2));
        g.strokeRect(x, y + tabH / 2, w, h - tabH / 2);
        g.fillStyle = T.engraving ? T.ink : T.accent;
        g.fillRect(x + pad, y, tabW, tabH);
        lab.draw(g, x + pad + tabW / 2, y + tabH / 2 + P.ts(6.5), 'center');
        para.draw(g, x + pad, y + tabH / 2 + pad);
      });
    },
  };
}

/** Numbered construction panels with diagrams from opts.stepDrawer. */
function stepsBlock(P, steps, w) {
  const T = P.theme;
  const n = steps.length;
  const gap = P.px(STEP_GAP);
  const colW = (w - gap * (n - 1)) / n;
  const numSt = P.style('step', { size: P.ts(58) });
  const numH = P.ts(60);
  // panels shrink with the type when a page has to auto-fit
  const boxH = colW * 0.8 * Math.pow(P.fs, 2.2);
  const tSt = P.style('stepTitle');
  const xSt = P.style('stepText');
  const cols = steps.map((s, i) => {
    const title = paragraph(P.fonts, s.title ?? '', { style: tSt, width: colW, align: 'left', hyphenate: false });
    const text = paragraph(P.fonts, s.text ?? '', { style: xSt, width: colW, align: 'left' });
    return { s, i, title, text };
  });
  const textH = Math.max(...cols.map((c) => c.title.height + P.ts(8) + c.text.height));
  const h = numH + boxH + P.ts(20) + textH;
  return {
    h,
    place(x, y) {
      cols.forEach((c) => {
        const cx = x + c.i * (colW + gap);
        const num = line(P.fonts, String(c.i + 1).padStart(2, '0'), numSt);
        P.op((g) => {
          num.draw(g, cx, y + numSt.size * 0.86);
          rule(g, cx + num.width + P.ts(14), y + numSt.size * 0.55, cx + colW, rgba(T.ink, 0.5), Math.max(1, P.px(1.4)));
        });
        const box = { x: cx, y: y + numH, w: colW, h: boxH };
        P.op((g) => drawPanel(g, P, box, c.i));
        const ty = y + numH + boxH + P.ts(20);
        P.op((g) => c.title.draw(g, cx, ty));
        P.op((g) => c.text.draw(g, cx, ty + c.title.height + P.ts(8)));
      });
    },
  };
}

function drawPanel(g, P, box, step) {
  const T = P.theme;
  // panel ground: white card with a faint drawing grid
  g.fillStyle = T.engraving ? '#ffffff' : mix(T.paper, '#ffffff', 0.6);
  g.fillRect(box.x, box.y, box.w, box.h);
  g.save();
  g.beginPath();
  g.rect(box.x, box.y, box.w, box.h);
  g.clip();
  const cell = box.w / 10;
  g.strokeStyle = rgba(T.accent, 0.1);
  g.lineWidth = Math.max(1, P.px(1));
  g.beginPath();
  for (let i = 1; i < 10; i++) {
    g.moveTo(box.x + i * cell, box.y);
    g.lineTo(box.x + i * cell, box.y + box.h);
  }
  for (let yy = box.y + cell; yy < box.y + box.h; yy += cell) {
    g.moveTo(box.x, yy);
    g.lineTo(box.x + box.w, yy);
  }
  g.stroke();
  let drawn = false;
  if (typeof P.stepDrawer === 'function') {
    try {
      g.save();
      P.stepDrawer(g, step, { x: box.x, y: box.y, w: box.w, h: box.h });
      g.restore();
      drawn = true;
    } catch (e) {
      console.warn('[typeset] stepDrawer failed; drawing placeholder', e);
    }
  }
  if (!drawn) placeholderStep(g, P, box, step);
  g.restore();
  g.strokeStyle = rgba(T.ink, 0.7);
  g.lineWidth = Math.max(1, P.px(1.6));
  g.strokeRect(box.x, box.y, box.w, box.h);
}

/** Neutral construction placeholder: circle + centre line → jaw box → skull. */
function placeholderStep(g, P, box, step) {
  const T = P.theme;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h * 0.5;
  const R = Math.min(box.w, box.h) * 0.42;
  const geo = emblemGeometry('skull', cx, cy, R);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const gd of geo.guides ?? []) {
    g.strokeStyle = rgba(T.accent, 0.85);
    g.lineWidth = Math.max(1, gd.width * 0.9);
    g.setLineDash(gd.dash ?? []);
    g.stroke(gd.path);
  }
  g.setLineDash([]);
  if (step >= 1) {
    g.strokeStyle = rgba(T.ink, step >= 2 ? 0.9 : 0.6);
    g.lineWidth = geo.lines[0].width * 0.7;
    g.stroke(geo.lines[0].path);
  }
  if (step >= 2) {
    g.fillStyle = T.ink;
    g.fill(geo.fill);
    for (const l of geo.lines.slice(1)) {
      g.lineWidth = l.width * 0.8;
      g.setLineDash(l.dash ?? []);
      g.stroke(l.path);
    }
    g.setLineDash([]);
  }
}

/**
 * Paragraphs flowed into balanced columns with widow/orphan control: a
 * column never ends on a paragraph's first line nor starts on its last line.
 */
export function columnsBlock(P, paragraphs, styleName, width, gutter, ncols = 2) {
  const st = P.style(styleName);
  const colW = (width - gutter * (ncols - 1)) / ncols;
  const paras = paragraphs.map((src, i) => paragraph(P.fonts, src, { style: st, width: colW, indent: i ? st.size * 1.2 : 0 }));
  const lines = [];
  paras.forEach((p, pi) => p.lines.forEach((_, li) => lines.push({ pi, li, n: p.lines.length })));
  const n = lines.length;
  const lead = paras[0]?.leading ?? st.size * 1.4;
  const valid = (s) => {
    if (s <= 0 || s >= n) return true;
    const a = lines[s - 1];
    const b = lines[s];
    if (a.pi !== b.pi) return true;
    return a.li + 1 >= 2 && b.n - b.li >= 2;
  };
  let split = n;
  if (ncols > 1 && n > 1) {
    // the valid split with the shortest tallest column; ties keep the left column longer
    let best = Infinity;
    for (let s = 1; s < n; s++) {
      if (!valid(s)) continue;
      const cost = Math.max(s, n - s) + (s < n - s ? 0.5 : 0);
      if (cost < best) {
        best = cost;
        split = s;
      }
    }
  }
  const h = Math.max(split, n - split) * lead;
  return {
    h,
    place(x, y) {
      let k = 0;
      paras.forEach((p) => {
        p.lines.forEach((_, li) => {
          const col = k < split ? 0 : 1;
          const row = col === 0 ? k : k - split;
          const lx = x + col * (colW + gutter);
          const ly = y + row * lead;
          P.op((g) => p.drawLines(g, lx, ly, li, li + 1));
          k++;
        });
      });
    },
  };
}

