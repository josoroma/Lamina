// Front-matter layouts: title page (with the author's wordmark in its own
// colours), imprint (copyright) page with the author credit, contents,
// introduction essay (drop cap, small-caps opening, pull quote) and the
// how-to-use page (interaction guide with drawn icons and a status legend).
// Every fixed string is printed in the page's language (tl(P.lang, …)); the how-to
// icons are chosen from the English rows, so both editions draw the same.
import { paragraph, line, plain } from '../text.js';
import { furniture } from '../page.js';
import { emblemGeometry, inkEmblem } from '../emblems.js';
import { fleuronRule, leaderDots, rule, icon, iconFor, IUCN, onColor, roundRectPath, loopGlyph } from '../draw.js';
import { heading, ornamentBlock } from '../blocks.js';
import { ornamentKind } from './boards.js';
import { rgba, mix, roman } from '../util.js';
import { resolveStyle, vmetrics, measure } from '../text.js';
import { drawAuthorMark, markAspect } from '../marks.js';
import { en, tl, fmtList, quote } from '../../../i18n/index.js';

const yearOf = (s) => /\b(1[5-9]\d\d|2\d\d\d)\b/.exec(String(s ?? ''))?.[1];

/** Two-colour ink scheme for printing an emblem on paper (lithograph or engraving). */
export function emblemInks(T, geo) {
  if (T.engraving) return { ink: T.ink, fill: T.ink, paper: T.paper, guide: rgba(T.accent, 0.85) };
  if (geo.twoTone) {
    return { ink: mix(T.cloth, T.ink, 0.55), fill: mix(T.cloth, T.paper, 0.42), cut: mix(T.cloth, T.ink, 0.25), paper: T.paper, guide: rgba(T.muted, 0.6) };
  }
  // coloured lithograph for emblems with natural parts (sap green, crimson bracts, orchid lavender)
  const palette = { leaf: mix('#4e6b3c', T.paper, 0.06), bract: T.accent, petal: mix('#a874b4', T.paper, 0.05), lip: '#7a3672' };
  return { ink: mix(T.ink, T.cloth, 0.35), fill: mix(T.cloth, T.paper, 0.1), paper: T.paper, guide: rgba(T.muted, 0.6), palette };
}

/** Title page (recto): kicker, title, subtitle, ornament, ink vignette, imprint. */
export function title(P) {
  const { W, H, theme: T, page } = P;
  const book = page.book ?? {};
  const cx = P.text.x + P.text.w / 2;
  const eng = T.engraving;
  P.op((g) => {
    g.fillStyle = T.paper;
    g.fillRect(0, 0, W, H);
  });
  if (book.kicker) P.lineFit(book.kicker, 'kicker', cx, 0.155 * H, 'center', P.text.w, { what: 'title page kicker', over: { size: P.ts(23), tracking: 0.32 } });
  const tst = eng
    ? P.style('title', { size: P.ts(210), tracking: 0.03 })
    : P.style('title', { size: P.ts(196), weight: 600 });
  let titleLine = line(P.fonts, book.title ?? '', tst);
  if (titleLine.width > P.text.w) titleLine = line(P.fonts, book.title ?? '', { ...tst, size: tst.size * (P.text.w / titleLine.width) });
  const ty = 0.285 * H;
  P.op((g) => titleLine.draw(g, cx, ty, 'center'));
  let y = ty + tst.size * (eng ? 0.12 : 0.3);
  if (book.subtitle) {
    const sub = paragraph(P.fonts, book.subtitle, {
      style: P.style('lede', { size: P.ts(52), color: T.ink }),
      width: P.text.w * 0.78,
      align: 'center',
      hyphenate: false,
    });
    const sx = cx - P.text.w * 0.39;
    const sy = y;
    P.op((g) => sub.draw(g, sx, sy));
    y += sub.height;
  }
  // the author: a small-caps "by", then the wordmark in its own colours
  const by = book.byline;
  if (by && (by.name || by.mark)) {
    const byY = y + P.ts(50);
    P.lineFit(tl(P.lang, 'by'), 'labelMuted', cx, byY, 'center', P.text.w, { what: 'title page by' });
    const top = byY + P.ts(26);
    if (by.mark && markAspect(by.mark)) {
      const mw = 0.26 * W;
      P.op((g) => drawAuthorMark(g, by.mark, { cx, top, width: mw }));
      y = top + mw / markAspect(by.mark);
    } else {
      const nl = P.lineFit(by.name, 'h2', cx, top + P.ts(40), 'center', P.text.w, { what: 'title page author' });
      y = top + nl.style.size;
    }
  }
  const oy = y + P.ts(46);
  P.op((g) => fleuronRule(g, ornamentKind(P), cx, oy, P.ts(190), P.ts(30), eng ? T.ink : mix(T.accent, T.ink, 0.2), T.paper));
  // vignette: the book's emblem printed in ink and a quiet second colour
  const top = oy + P.ts(60);
  const bot = 0.8 * H;
  const R = Math.min(0.2 * W, (bot - top) * 0.44);
  const ey = (top + bot) / 2;
  P.op((g) => {
    const geo = emblemGeometry(book.emblem ?? page.emblem, cx, ey, R);
    inkEmblem(g, geo, emblemInks(T, geo));
  });
  if (book.author) P.lineFit(book.author, 'label', cx, 0.845 * H, 'center', P.text.w, { what: 'title page imprint', over: { size: P.ts(22), tracking: 0.3 } });
  const year = yearOf(book.edition);
  const ed = year ? `${String(book.edition).replace(/[,\s]*\b\d{4}\b/, '').trim()} · ${roman(+year)}` : book.edition;
  if (ed) P.lineFit(`*${ed}*`, 'binomial', cx, 0.845 * H + P.ts(48), 'center', P.text.w, { what: 'title page edition', over: { size: P.ts(28), color: T.muted } });
}

/** Imprint (verso): printer's device and a short colophon block at the foot. */
export function imprint(P) {
  const { W, H, theme: T, page } = P;
  const book = page.book ?? {};
  P.op((g) => {
    g.fillStyle = T.paper;
    g.fillRect(0, 0, W, H);
  });
  const fontsUsed = [...new Set([T.fonts.display, T.fonts.body, T.fonts.label, T.fonts.mono, T.engraving ? T.fonts.condensed : null].filter(Boolean))];
  const lines = [
    `**${book.title}**${book.subtitle ? ` — *${book.subtitle}*` : ''}`,
    book.kicker ? book.kicker : null,
    '',
    book.edition ? `${book.edition}.` : null,
    book.author ? tl(P.lang, 'Published by {publisher}.', { publisher: book.author }) : null,
    tl(P.lang, 'Text, plates and interactive figures are original works made for this edition. Every figure is a living plate: turn it, open it, peel back its layers and take it home as a vector drawing.'),
    tl(P.lang, 'Set in {fonts}. Typeset, printed and bound live in your browser with Three.js — WebGPU, with a WebGL 2 fallback.', { fonts: listOf(fontsUsed, P.lang) }),
    ...(Array.isArray(page.imprint) ? page.imprint : page.imprint ? [page.imprint] : []),
    ...(Array.isArray(page.credits) ? page.credits : page.credits ? [page.credits] : []),
  ].filter((s) => s !== null);
  const w = Math.min(P.text.w, P.ts(820));
  const x = P.text.x;
  const st = P.style('note', { size: P.ts(24), leading: 1.5, color: rgba(T.ink, 0.86) });
  const paras = lines.map((s) => (s === '' ? null : paragraph(P.fonts, s, { style: st, width: w, align: 'left' })));
  const gap = P.ts(14);
  const total = paras.reduce((s, p) => s + (p ? p.height + gap : P.ts(18)), 0);
  let y = P.text.bottom - total;
  const ruleY = y - P.ts(28);
  // the author credit, above the rule: a small-caps label and the wordmark in its own colours
  let top = y - P.ts(64); // (without a credit: where the printer's device ends)
  const by = book.byline;
  if (by && (by.name || by.mark)) {
    const mark = by.mark && markAspect(by.mark) ? by.mark : null;
    const mw = 0.16 * W;
    const markH = mark ? mw / markAspect(mark) : P.ts(40);
    const cTop = ruleY - P.ts(30) - (P.ts(19) + P.ts(16) + markH);
    P.lineFit(tl(P.lang, 'Author'), 'labelMuted', x, cTop + P.ts(19), 'left', w, { what: 'imprint author label' });
    if (mark) P.op((g) => drawAuthorMark(g, mark, { x, top: cTop + P.ts(35), width: mw }));
    else P.lineFit(by.name, 'h2', x, cTop + P.ts(35) + P.ts(32), 'left', w, { what: 'imprint author', over: { size: P.ts(36) } });
    top = cTop - P.ts(36);
  }
  // printer's device above the block
  const R = P.ts(58);
  const dy = top - R;
  P.op((g) => {
    const geo = emblemGeometry(book.emblem ?? page.emblem, x + R, dy, R);
    inkEmblem(g, geo, emblemInks(T, geo));
  });
  P.op((g) => rule(g, x, ruleY, x + P.ts(120), rgba(T.ink, 0.5), Math.max(1, P.px(1.4))));
  for (const p of paras) {
    if (!p) {
      y += P.ts(18);
      continue;
    }
    const yy = y;
    P.op((g) => p.draw(g, x, yy));
    y += p.height + gap;
  }
  P.reach(y - gap);
}

/**
 * "A, B and C" in the page's language: Intl's list in Spanish ("… e IBM Plex
 * Mono"), and in English the books' own British style, without a serial comma.
 */
function listOf(a, lang) {
  if (lang !== 'en') return fmtList(a, { lang });
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
}

/** Contents (recto): front matter, plates, back matter; every entry is a goto hit. */
export function contents(P) {
  const { W, H, theme: T, page } = P;
  P.op((g) => {
    g.fillStyle = T.paper;
    g.fillRect(0, 0, W, H);
  });
  furniture(P, { head: false });
  const { x, w } = P.text;
  let y = P.text.y + P.ts(10);
  P.lineFit(tl(P.lang, 'Contents'), 'h1', x, y + P.ts(78), 'left', w, { what: 'contents title' });
  y += P.ts(108);
  const orn = ornamentBlock(P, ornamentKind(P), P.ts(260), { half: P.ts(130), size: P.ts(20), h: P.ts(40) });
  orn.place(x, y);
  y += orn.h + P.ts(30);
  const entries = page.entries ?? [];
  const folioSt = T.engraving ? P.style('mono', { size: P.ts(23), weight: 500 }) : P.style('folio', { size: P.ts(32) });
  const numCol = P.ts(74);
  const leader = (g, x1, x2, by) => leaderDots(g, x1, x2, by, rgba(T.ink, 0.4), P.ts(11), Math.max(0.8, P.ts(1.6)));
  const section = (label) => {
    const hd = heading(P, label, w, { styleName: 'labelMuted', ruleAfter: false });
    hd.place(x, y);
    y += hd.h + P.ts(10);
  };
  const simple = (e) => {
    const top = y;
    const st = P.style('h2', { size: P.ts(34), weight: 500, color: T.ink });
    const f = line(P.fonts, e.folio != null ? String(e.folio) : '', folioSt);
    // the label keeps room for its folio and a few leader dots
    const l = P.fitWidth(e.label, st, w - numCol - f.width - P.ts(60), { what: 'contents label' });
    const by = top + P.ts(36);
    P.op((g) => {
      l.draw(g, x + numCol, by);
      f.draw(g, x + w, by, 'right');
      leader(g, x + numCol + l.width + P.ts(10), x + w - f.width - P.ts(10), by - P.ts(2));
    });
    // the full measure and nearly the whole row pitch, like the plate entries
    // (Oswald's tall caps reach top + 9); `page` says which side of the spread
    // prints it (intro | how-to and note | sources share a spread)
    if (e.spread != null) {
      P.hit(`contents-${e.id ?? e.kind}`, [x - P.ts(8), top + P.ts(1), x + w + P.ts(8), top + P.ts(53)], { type: 'goto', spread: e.spread, page: e.page });
    }
    y += P.ts(54);
  };
  const front = entries.filter((e) => e.kind === 'front');
  const plates = entries.filter((e) => e.kind === 'plate');
  const backs = entries.filter((e) => e.kind === 'back');
  if (front.length) {
    for (const e of front) simple(e);
    y += P.ts(18);
  }
  if (plates.length) {
    section(tl(P.lang, plates.some((p) => p.lesson) ? 'Lessons' : 'Plates'));
    for (const e of plates) {
      const top = y;
      const nst = P.style('numeral', { size: P.ts(32) });
      const n = line(P.fonts, String(e.numeral ?? ''), nst);
      const f = line(P.fonts, e.folio != null ? String(e.folio) : '', folioSt);
      // title + alternative name share the row with the folio: the pair sets
      // smaller (to 85 %) rather than run into the folio
      const room = w - numCol - f.width - P.ts(40);
      const tst = P.style('h2', { size: P.ts(42) });
      const altSt = P.style('titleAlt', { size: P.ts(30) });
      const pair = [{ text: e.label, style: tst }, ...(e.alt ? [{ text: ' ', style: altSt }, { text: e.alt, style: altSt }] : [])];
      const row = P.fitWidth(pair, tst, room, { what: 'contents entry' });
      const sc = row.style.size / resolveStyle(P.fonts, tst).size;
      const t = line(P.fonts, e.label, { ...tst, size: tst.size * sc });
      const alt = e.alt ? line(P.fonts, e.alt, { ...altSt, size: altSt.size * sc }) : null;
      const sub = e.sub ? P.fitWidth(e.taxon === false ? e.sub : `*${e.sub}*`, P.style('binomial', { size: P.ts(26), color: T.muted }), w - numCol - f.width - P.ts(40), { what: 'contents binomial' }) : null;
      const by = top + P.ts(46);
      P.op((g) => {
        n.draw(g, x + numCol - P.ts(22), by, 'right');
        t.draw(g, x + numCol, by);
        let ex = x + numCol + t.width;
        if (alt) {
          alt.draw(g, ex + P.ts(16), by);
          ex += P.ts(16) + alt.width;
        }
        f.draw(g, x + w, by, 'right');
        leader(g, ex + P.ts(12), x + w - f.width - P.ts(12), by - P.ts(2));
      });
      let h = P.ts(62);
      if (sub) {
        const sy = top + P.ts(84);
        P.op((g) => sub.draw(g, x + numCol, sy));
        h = P.ts(100);
      }
      P.hit(`contents-plate-${e.plate}`, [x - P.ts(8), top + P.ts(4), x + w + P.ts(8), top + h], { type: 'goto', plate: e.plate, spread: e.spread });
      y += h + P.ts(8);
    }
    y += P.ts(18);
  }
  if (backs.length) {
    section(tl(P.lang, 'Back matter'));
    for (const e of backs) simple(e);
  }
  P.reach(y);
}

/** Introduction essay (verso): kicker, title, drop cap, pull quote. */
export function intro(P) {
  const { W, H, theme: T, page } = P;
  const intro = page.intro ?? {};
  P.op((g) => {
    g.fillStyle = T.paper;
    g.fillRect(0, 0, W, H);
  });
  furniture(P);
  const eng = T.engraving;
  const measureW = Math.min(P.text.w, P.ts(1120));
  const x = P.text.x + (P.text.w - measureW) / 2;
  const compose = (y0) => {
    let y = y0;
    P.lineFit(page.kicker ?? tl(P.lang, 'Introduction'), 'kicker', eng ? x : x + measureW / 2, y + P.ts(20), eng ? 'left' : 'center', measureW, { what: 'intro kicker' });
    y += P.ts(44);
    const tpara = paragraph(P.fonts, intro.title ?? tl(P.lang, 'Introduction'), { style: P.style('h1', { size: P.ts(eng ? 84 : 82) }), width: measureW, align: eng ? 'left' : 'center', hyphenate: false });
    const ty = y;
    P.op((g) => tpara.draw(g, x, ty));
    y += tpara.height + P.ts(10);
    const orn = ornamentBlock(P, ornamentKind(P), measureW, { half: P.ts(140), size: P.ts(22), h: P.ts(52) });
    orn.place(x, y);
    y += orn.h + P.ts(26);
    const st = P.style('essay');
    const paras = (intro.paragraphs ?? []).filter(Boolean);
    const pullAfter = intro.pullQuote ? Math.max(0, Math.min(paras.length - 1, Math.floor((paras.length - 1) / 2))) : -1;
    paras.forEach((src, i) => {
      if (i === 0) {
        const dc = dropCap(P, src, st, measureW);
        const yy = y;
        P.op((g) => dc.draw(g, x, yy));
        y += dc.height;
      } else {
        const para = paragraph(P.fonts, src, { style: st, width: measureW, indent: st.size * 1.4 });
        const yy = y;
        P.op((g) => para.draw(g, x, yy));
        y += para.height;
      }
      if (i === pullAfter && intro.pullQuote) {
        y += P.ts(34);
        // the edition's own quotation marks (« » in Spanish), whatever the text came with
        const pq = paragraph(P.fonts, quote(plain(intro.pullQuote).trim().replace(/^[«“"]+|[»”"]+$/g, ''), { lang: P.lang }), {
          style: P.style('pull'),
          width: measureW * 0.82,
          align: 'center',
          hyphenate: false,
        });
        const top = y;
        const px = x + measureW * 0.09;
        P.op((g) => {
          rule(g, x + measureW * 0.35, top, x + measureW * 0.65, rgba(T.accent, 0.6), Math.max(1, P.px(1.5)));
          pq.draw(g, px, top + P.ts(22));
          rule(g, x + measureW * 0.35, top + pq.height + P.ts(44), x + measureW * 0.65, rgba(T.accent, 0.6), Math.max(1, P.px(1.5)));
        });
        y += pq.height + P.ts(44) + P.ts(40);
      }
    });
    return y;
  };
  const y0 = P.text.y + P.ts(24);
  const h = P.dry(() => compose(y0)) - y0;
  P.reach(compose(y0 + P.sinkage(h)));
}

/**
 * Paragraph with a 3-line drop cap and the rest of the first word in small
 * caps. Opening punctuation (« ¿ ¡ “) hangs in the margin before the initial
 * and closing punctuation follows the small caps; accented initials (Á, É,
 * Ñ) are initials like any other.
 * @returns {{ height: number, draw: (g, x, y) => void }}
 */
export function dropCap(P, src, st, width) {
  const T = P.theme;
  const text = String(src);
  const m = /^([^\p{L}\p{N}*]*)(\p{L})([\p{L}’']*)([^\s*]*)(\s[\s\S]*)?$/u.exec(text);
  if (!m) {
    const p = paragraph(P.fonts, text, { style: st, width });
    return { height: p.height, draw: (g, x, y) => p.draw(g, x, y) };
  }
  const lines = 3;
  const rs = resolveStyle(P.fonts, st);
  const leading = rs.size * rs.leading;
  const capSt = { role: T.engraving ? 'condensed' : 'display', size: 10, weight: 600, color: T.accent };
  // size the initial so its cap height spans from line 1 cap top to line 3 baseline
  const bodyVm = vmetrics(rs.font);
  const span = (lines - 1) * leading + bodyVm.cap;
  const probe = resolveStyle(P.fonts, capSt);
  const capRatio = vmetrics(probe.font).cap / 10;
  const capSize = span / capRatio;
  const cst = resolveStyle(P.fonts, { ...capSt, size: capSize });
  const letter = m[2].toUpperCase();
  const letterW = measure(cst.font, letter);
  const gap = rs.size * 0.45;
  const indentW = letterW + gap;
  const rest = m[3] ? [{ text: m[3], style: { ...st, caps: 'small', tracking: 0.07 } }] : [];
  const runs = [...rest, { text: `${m[4]}${m[5] ?? ''}`, markup: true }];
  // hanging opening punctuation: half the initial's size, centred on its cap height
  const pst = m[1].trim() ? resolveStyle(P.fonts, { ...capSt, size: capSize * 0.5 }) : null;
  const para = paragraph(P.fonts, runs, {
    style: st,
    width,
    widthAt: (i) => (i < lines ? width - indentW : width),
    offsetAt: (i) => (i < lines ? indentW : 0),
  });
  return {
    height: Math.max(para.height, lines * leading),
    draw(g, x, y) {
      g.font = cst.font;
      g.fillStyle = cst.color;
      const base = y + para.baselineOf(lines - 1);
      g.fillText(letter, x - P.ts(2), base);
      if (pst) {
        const lead = m[1].trim();
        const pvm = vmetrics(pst.font);
        g.font = pst.font;
        g.fillText(lead, x - P.ts(8) - measure(pst.font, lead), base - (span - pvm.cap) / 2);
      }
      para.draw(g, x, y);
    },
  };
}

/** How to use this book (recto): interaction rows with icons + reading legend. */
export function howto(P) {
  const { W, H, theme: T, page } = P;
  const how = page.howTo ?? {};
  P.op((g) => {
    g.fillStyle = T.paper;
    g.fillRect(0, 0, W, H);
  });
  furniture(P);
  const { x, w } = P.text;
  let y = P.text.y + P.ts(24);
  P.lineFit(tl(P.lang, 'Before you begin'), 'kicker', x, y + P.ts(20), 'left', w, { what: 'how-to kicker' });
  y += P.ts(44);
  const tpara = paragraph(P.fonts, how.title ?? tl(P.lang, 'How to use this book'), { style: P.style('h1', { size: P.ts(76) }), width: w, align: 'left', hyphenate: false });
  const ty = y;
  P.op((g) => tpara.draw(g, x, ty));
  y += tpara.height + P.ts(30);
  const items = (how.items ?? []).filter((r) => Array.isArray(r) && r.length >= 2);
  const iconS = P.ts(54);
  const col1 = iconS + P.ts(26);
  const gestW = P.ts(300);
  const effW = w - col1 - gestW - P.ts(20);
  const gst = P.style('label', { size: P.ts(20), color: T.ink });
  const est = P.style('body', { size: P.ts(28), leading: 1.35 });
  const listTop = y;
  P.op((g) => rule(g, x, listTop, x + w, rgba(T.ink, 0.5), Math.max(1, P.px(1.6))));
  for (const row of items) {
    const [gesture, effect] = row;
    const gp = paragraph(P.fonts, gesture, { style: gst, width: gestW, align: 'left', hyphenate: false });
    const ep = paragraph(P.fonts, effect, { style: est, width: effW, align: 'left' });
    const rowH = Math.max(iconS, gp.height, ep.height) + P.ts(34);
    const top = y;
    // the icon follows the English row, so both editions draw the same icons
    const id = iconFor(...en(row));
    P.op((g) => {
      icon(g, id, x, top + (rowH - iconS) / 2, iconS, T.ink, T.accent);
      gp.draw(g, x + col1, top + (rowH - gp.height) / 2);
      ep.draw(g, x + col1 + gestW + P.ts(20), top + (rowH - ep.height) / 2);
      rule(g, x, top + rowH, x + w, rgba(T.ink, 0.16), Math.max(1, P.px(1.2)));
    });
    y += rowH;
  }
  y += P.ts(56);
  // reading the plates: legend of printed marks
  const legend = page.legend ?? [];
  const hd = heading(P, tl(P.lang, 'Reading a plate'), w);
  hd.place(x, y);
  y += hd.h + P.ts(20);
  const nst = P.style('body', { size: P.ts(26), leading: 1.38 });
  const notes = [];
  if (legend.length) notes.push({ kind: 'iucn', text: tl(P.lang, 'Conservation status, as assessed on the IUCN Red List.') });
  notes.push({ kind: 'loop', text: tl(P.lang, 'Each figure is a repeating visual explanation. Pause it, choose a moment, or follow the captions at reading pace.') });
  notes.push({ kind: 'check', text: tl(P.lang, '“Look closer” items are clickable: each one points to a part on the living figure.') });
  for (const n of notes) {
    const top = y;
    if (n.kind === 'iucn') {
      // the Red List scale with the categories used in this book highlighted
      const codes = ['EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC'];
      const d = P.ts(40);
      const cst = P.style('chipCode', { size: P.ts(15) });
      P.op((g) => {
        codes.forEach((c, i) => {
          const info = IUCN[c];
          const cx = x + i * (d + P.ts(6));
          const used = legend.includes(c);
          g.globalAlpha = used ? 1 : 0.28;
          g.fillStyle = info.color;
          roundRectPath(g, cx, top, d, d, d / 2);
          g.fill();
          g.globalAlpha = 1;
          const l = line(P.fonts, c, { ...cst, color: onColor(info.color) });
          l.draw(g, cx + d / 2, top + d / 2 + cst.size * 0.36, 'center');
        });
      });
      const p = paragraph(P.fonts, n.text, { style: nst, width: w - 7 * (d + P.ts(6)) - P.ts(20), align: 'left' });
      P.op((g) => p.draw(g, x + 7 * (d + P.ts(6)) + P.ts(14), top + (d - p.height) / 2 + P.ts(2)));
      y += Math.max(d, p.height) + P.ts(22);
      continue;
    }
    const gw = P.ts(40);
    const p = paragraph(P.fonts, n.text, { style: nst, width: w - gw - P.ts(18), align: 'left' });
    P.op((g) => {
      const cy = top + p.baselineOf(0) - nst.size * 0.33;
      if (n.kind === 'loop') loopGlyph(g, x + gw / 2, cy, P.ts(11), T.accent, Math.max(1, P.ts(2.2)));
      else {
        g.strokeStyle = T.accent;
        g.lineWidth = Math.max(1, P.ts(2));
        roundRectPath(g, x + gw / 2 - P.ts(11), cy - P.ts(11), P.ts(22), P.ts(22), P.ts(4));
        g.stroke();
      }
      p.draw(g, x + gw + P.ts(18), top);
    });
    y += p.height + P.ts(18);
  }
  P.reach(y);
}
