// Back-matter layouts: the note (e.g. snakebite safety or conservation),
// the glossary (two balanced columns, entries never split; buildSides has
// sorted it in the edition's language), sources with a colophon, and the
// blank page. Fixed strings print in the page's language (tl(P.lang, …)).
import { paragraph, line } from '../text.js';
import { furniture } from '../page.js';
import { rule, fleuronRule } from '../draw.js';
import { ornamentBlock, smallCapsLead } from '../blocks.js';
import { ornamentKind } from './boards.js';
import { rgba, mix } from '../util.js';
import { tl } from '../../../i18n/index.js';

function ground(P) {
  const { W, H, theme: T } = P;
  P.op((g) => {
    g.fillStyle = T.paper;
    g.fillRect(0, 0, W, H);
  });
}

/** Section opener: kicker + title + ornament. Returns y after it. */
function opener(P, kicker, title, x, y, w, { align = 'left' } = {}) {
  const T = P.theme;
  const cx = align === 'center' ? x + w / 2 : x;
  if (kicker) P.lineFit(kicker, 'kicker', cx, y + P.ts(20), align, w, { what: 'back-matter kicker' });
  y += P.ts(44);
  const tp = paragraph(P.fonts, title, { style: P.style('h1', { size: P.ts(76) }), width: w, align, hyphenate: false });
  const ty = y;
  P.op((g) => tp.draw(g, x, ty));
  y += tp.height + P.ts(8);
  if (align === 'center') {
    const orn = ornamentBlock(P, ornamentKind(P), w, { half: P.ts(140), size: P.ts(22), h: P.ts(50) });
    orn.place(x, y);
    y += orn.h;
  } else {
    const ry = y + P.ts(16);
    P.op((g) => rule(g, x, ry, x + P.ts(140), T.engraving ? T.ink : T.accent, Math.max(1.5, P.px(3))));
    y += P.ts(32);
  }
  return y + P.ts(26);
}

/** Note (verso): sober essay page — safety, conservation, method. */
export function note(P) {
  ground(P);
  furniture(P);
  const n = P.page.note ?? {};
  const w = Math.min(P.text.w, P.ts(1120));
  const x = P.text.x + (P.text.w - w) / 2;
  const compose = (y0) => {
    let y = opener(P, P.page.kicker ?? tl(P.lang, 'A note'), n.title ?? tl(P.lang, 'Note'), x, y0, w, { align: P.theme.engraving ? 'left' : 'center' });
    const st = P.style('essay');
    (n.paragraphs ?? []).filter(Boolean).forEach((src, i) => {
      const runs = i === 0 ? smallCapsLead(P, src, st) : null;
      const para = paragraph(P.fonts, runs ?? src, { style: st, width: w, indent: i ? st.size * 1.4 : 0 });
      const yy = y;
      P.op((g) => para.draw(g, x, yy));
      y += para.height;
    });
    const fy = y + P.ts(56);
    P.op((g) => fleuronRule(g, ornamentKind(P), x + w / 2, fy, P.ts(60), P.ts(22), P.theme.engraving ? P.theme.ink : mix(P.theme.accent, P.theme.ink, 0.25), P.theme.paper));
    return y;
  };
  const y0 = P.text.y + P.ts(24);
  const h = P.dry(() => compose(y0)) - y0;
  P.reach(compose(y0 + P.sinkage(h)));
}

/** Glossary (verso): two balanced columns of run-in entries. */
export function glossary(P) {
  ground(P);
  furniture(P);
  const T = P.theme;
  const { x, w } = P.text;
  let y = opener(P, tl(P.lang, 'Words used in this book'), tl(P.lang, 'Glossary'), x, P.text.y + P.ts(24), w);
  const entries = (P.page.glossary ?? []).filter((e) => Array.isArray(e) && e.length >= 2);
  const gutter = P.px(64);
  const colW = (w - gutter) / 2;
  const st = P.style('gloss');
  const tst = P.style('glossTerm', { color: T.engraving ? T.ink : mix(T.accent, T.ink, 0.35) });
  const gap = P.ts(18);
  const blocks = entries.map(([term, def]) => {
    const runs = [{ text: term, style: tst }, { text: ' — ', style: st }, { text: def, markup: true }];
    return paragraph(P.fonts, runs, { style: st, width: colW, align: 'left' });
  });
  const heights = blocks.map((b) => b.height);
  const total = heights.reduce((s, h) => s + h, 0) + gap * Math.max(0, blocks.length - 1);
  // split between entries so the columns balance (entries never break)
  let best = blocks.length;
  let bestH = Infinity;
  let acc = 0;
  for (let i = 0; i <= blocks.length; i++) {
    const left = acc - (i > 0 ? gap : 0);
    const right = total - acc - (i < blocks.length ? 0 : 0);
    const h = Math.max(left, right);
    if (h < bestH) {
      bestH = h;
      best = i;
    }
    if (i < blocks.length) acc += heights[i] + gap;
  }
  const place = (list, cx) => {
    let yy = y;
    for (const b of list) {
      const by = yy;
      P.op((g) => b.draw(g, cx, by));
      yy += b.height + gap;
    }
    return yy - gap;
  };
  const yA = place(blocks.slice(0, best), x);
  const yB = place(blocks.slice(best), x + colW + gutter);
  const sepX = x + colW + gutter / 2;
  const bottom = Math.max(yA, yB);
  P.op((g) => {
    g.strokeStyle = rgba(T.ink, 0.15);
    g.lineWidth = Math.max(1, P.px(1.2));
    g.beginPath();
    g.moveTo(sepX, y);
    g.lineTo(sepX, bottom);
    g.stroke();
  });
  P.reach(bottom);
}

/** Sources & colophon (recto). */
export function sources(P) {
  ground(P);
  furniture(P);
  const T = P.theme;
  const { x, w } = P.text;
  let y = opener(P, tl(P.lang, 'For further reading'), tl(P.lang, 'Sources'), x, P.text.y + P.ts(24), w);
  const list = (P.page.sources ?? []).filter(Boolean);
  const st = P.style('small', { size: P.ts(25), leading: 1.38 });
  const nst = P.style('mono', { size: P.ts(19), color: T.muted });
  const ind = P.ts(58);
  list.forEach((s, i) => {
    const para = paragraph(P.fonts, s, { style: st, width: w - ind, align: 'left', hyphenate: false });
    const num = line(P.fonts, String(i + 1).padStart(2, '0'), nst);
    const yy = y;
    P.op((g) => {
      num.draw(g, x, yy + para.baselineOf(0));
      para.draw(g, x + ind, yy);
    });
    y += para.height + P.ts(12);
  });
  // colophon at the foot of the page, centred
  const col = (P.page.colophon ?? []).filter(Boolean);
  if (col.length) {
    const cst = P.style('dyk', { size: P.ts(25), color: rgba(T.ink, 0.85), leading: 1.45 });
    const cw = Math.min(w, P.ts(900));
    const paras = col.map((s) => paragraph(P.fonts, s, { style: cst, width: cw, align: 'center', hyphenate: false }));
    const ch = paras.reduce((s, p) => s + p.height + P.ts(8), 0);
    const head = P.ts(96);
    let cy = Math.max(y + P.ts(60), P.text.bottom - ch - head);
    const cx = x + (w - cw) / 2;
    const top = cy;
    P.op((g) => fleuronRule(g, ornamentKind(P), x + w / 2, top + P.ts(18), P.ts(110), P.ts(22), T.engraving ? T.ink : mix(T.accent, T.ink, 0.25), T.paper));
    P.lineFit(tl(P.lang, 'Colophon'), 'labelMuted', x + w / 2, top + P.ts(76), 'center', w, { what: 'colophon label' });
    cy += head;
    for (const p of paras) {
      const yy = cy;
      P.op((g) => p.draw(g, cx, yy));
      cy += p.height + P.ts(8);
    }
    y = cy;
  }
  P.reach(y);
}

/** Blank page: paper only. */
export function blank(P) {
  ground(P);
}
