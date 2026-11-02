// Board layouts: the cloth cover and back cover (foil stamping, blind
// deboss, an original emblem, the author's wordmark) and the endpapers
// pasted inside the boards.
//
// Boards overhang the text block, so cover canvases use the board aspect
// (1.028 × 1.436 → H = 1.3969 W). The author's mark (book.byline.mark, drawn
// from its SVG paths by marks.js) is stamped through the same foil mask as
// the title, so it takes the book's own foil, bevel and glint. Endpapers are
// page-sized, full-bleed repeat patterns: the book engine's endpaper
// material frames them with the cloth turn-ins.
import { paintCloth, createMask, stampFoil, stampBlind, paintEndpaper } from '../surfaces.js';
import { emblemGeometry, maskEmblem } from '../emblems.js';
import { line, paragraph } from '../text.js';
import { fleuronRule } from '../draw.js';
import { drawAuthorMark, markAspect } from '../marks.js';

/** Ornament family matching a book's emblem. */
export function ornamentKind(P) {
  const T = P.theme;
  if (T.ornament) return T.ornament;
  const e = P.page.book?.emblem ?? P.page.emblem;
  return { snake: 'hedera', flower: 'sprig', skull: 'cross' }[e] ?? 'lozenge';
}

/** Front cover. */
export function cover(P) {
  board(P, { back: false });
}

/** Back cover (spine on the right when seen from outside). */
export function backCover(P) {
  board(P, { back: true });
}

function board(P, { back }) {
  const { g, W, H, k, theme: T, page } = P;
  const book = page.book ?? {};
  P.op(() => paintCloth(g, W, H, T.cloth, { seed: `${book.id}|cloth`, spine: back ? 'right' : 'left', k }));

  // frame clears the hinge groove on the spine side
  const spineIn = 0.1 * W;
  const foreIn = 0.075 * W;
  const fx0 = back ? foreIn : spineIn;
  const fx1 = back ? W - spineIn : W - foreIn;
  const fy0 = 0.055 * H;
  const fy1 = H - 0.055 * H;
  const cx = (fx0 + fx1) / 2;
  const fw = fx1 - fx0;

  // blind-debossed double frame with corner lozenges
  P.op(() => {
    const { canvas: mask, g: mg } = createMask(W, H);
    mg.strokeStyle = '#fff';
    mg.lineWidth = Math.max(2, 4 * k);
    mg.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    const d = 16 * k;
    mg.lineWidth = Math.max(1, 1.8 * k);
    mg.strokeRect(fx0 + d, fy0 + d, fx1 - fx0 - 2 * d, fy1 - fy0 - 2 * d);
    mg.fillStyle = '#fff';
    for (const [x, y] of [[fx0, fy0], [fx1, fy0], [fx0, fy1], [fx1, fy1]]) {
      mg.beginPath();
      mg.moveTo(x, y - 14 * k);
      mg.lineTo(x + 14 * k, y);
      mg.lineTo(x, y + 14 * k);
      mg.lineTo(x - 14 * k, y);
      mg.closePath();
      mg.fill();
    }
    stampBlind(g, mask, W, H, { cloth: T.cloth, k });
  });

  // foil: kicker, title, rule, subtitle, emblem medallion, the author's mark,
  // the imprint. Single lines are measured here, before the stamping op, so a
  // line wider than the frame is set smaller (or reported) by P.fitWidth.
  const white = '#ffffff';
  const eng = T.engraving;
  const by = book.byline ?? null;
  const markId = by?.mark && markAspect(by.mark) ? by.mark : null;
  const lines = {};
  if (!back) {
    if (book.kicker) lines.kicker = P.fitWidth(book.kicker, { role: 'label', size: 25 * k, weight: 500, caps: 'all', tracking: 0.32, color: white }, fw * 0.84, { what: 'cover kicker' });
    if (book.author) lines.imprint = P.fitWidth(book.author, { role: 'label', size: 23 * k, weight: 500, caps: 'all', tracking: 0.3, color: white }, fw * 0.84, { what: 'cover imprint' });
  } else {
    const tst = eng
      ? { role: 'condensed', size: 40 * k, weight: 600, caps: 'all', tracking: 0.2, color: white }
      : { role: 'display', size: 40 * k, weight: 600, caps: 'all', tracking: 0.22, color: white };
    lines.title = P.fitWidth(book.title ?? '', tst, fw * 0.84, { what: 'back-cover title' });
    if (book.author) lines.imprint = P.fitWidth(book.author, { role: 'label', size: 20 * k, weight: 500, caps: 'all', tracking: 0.3, color: white }, fw * 0.84, { what: 'back-cover imprint' });
  }
  // a byline without a wordmark prints its name in foil capitals instead
  if (by?.name && !markId) {
    const nst = { role: eng ? 'condensed' : 'display', size: (back ? 30 : 40) * k, weight: 600, caps: 'all', tracking: 0.16, color: white };
    lines.byline = P.fitWidth(by.name, nst, fw * 0.84, { what: 'cover byline' });
  }
  P.op(() => {
    const { canvas: mask, g: mg } = createMask(W, H);
    // the author line, stamped with the title's foil: the wordmark (ink 26 % of
    // the board on the front, 20 % on the back) centred on `y` (fraction of H)
    const author = (y, width) => {
      if (markId) drawAuthorMark(mg, markId, { cx, top: y * H - width / markAspect(markId) / 2, width, color: white });
      else if (lines.byline) lines.byline.draw(mg, cx, y * H + lines.byline.style.size * 0.35, 'center');
    };
    if (!back) {
      lines.kicker?.draw(mg, cx, 0.14 * H, 'center');
      const tst = eng
        ? { role: 'condensed', size: 176 * k, weight: 600, caps: 'all', tracking: 0.07, color: white }
        : { role: 'display', size: 150 * k, weight: 600, caps: 'all', tracking: 0.09, color: white };
      let tl = line(P.fonts, book.title ?? '', tst);
      const maxW = fw * 0.84;
      if (tl.width > maxW) tl = line(P.fonts, book.title ?? '', { ...tst, size: tst.size * (maxW / tl.width) });
      const ty = 0.265 * H;
      tl.draw(mg, cx, ty, 'center');
      fleuronRule(mg, ornamentKind(P), cx, ty + 64 * k, Math.min(fw * 0.32, 250 * k), 38 * k, white, '#000');
      if (book.subtitle) {
        const sst = { role: 'display', size: 50 * k, weight: 500, italic: true, leading: 1.18, color: white };
        const para = paragraph(P.fonts, book.subtitle, { style: sst, width: fw * 0.7, align: 'center', hyphenate: false });
        para.draw(mg, cx - fw * 0.35, ty + 102 * k);
      }
      const R = 0.2 * W;
      const ey = 0.6 * H;
      medallion(mg, cx, ey, R, k);
      maskEmblem(mg, emblemGeometry(book.emblem ?? page.emblem, cx, ey, R * 0.86));
      // (the medallion's ring ends at about 0.763 H; the mark's top at 0.798 H)
      if (by) author(0.812, 0.26 * W);
      lines.imprint?.draw(mg, cx, (by ? 0.885 : 0.875) * H, 'center');
    } else {
      const R = 0.1 * W;
      const ey = 0.33 * H;
      medallion(mg, cx, ey, R, k * 0.6);
      maskEmblem(mg, emblemGeometry(book.emblem ?? page.emblem, cx, ey, R * 0.84));
      const blurb = page.blurb ?? book.subtitle ?? '';
      if (blurb) {
        const bst = { role: 'display', size: 46 * k, weight: 500, italic: true, leading: 1.24, color: white };
        const para = paragraph(P.fonts, blurb, { style: bst, width: fw * 0.66, align: 'center', hyphenate: false });
        para.draw(mg, cx - fw * 0.33, 0.46 * H);
        fleuronRule(mg, ornamentKind(P), cx, 0.46 * H + para.height + 52 * k, 120 * k, 24 * k, white, '#000');
      }
      // title, author, imprint: the foot of the back board
      lines.title.draw(mg, cx, (by ? 0.795 : 0.82) * H, 'center');
      if (by) author(0.842, 0.2 * W);
      lines.imprint?.draw(mg, cx, (by ? 0.895 : 0.875) * H, 'center');
    }
    stampFoil(g, mask, W, H, { foil: T.foil, cloth: T.cloth, k, seed: `${book.id}|foil|${back ? 'b' : 'f'}` });
  });
}

function medallion(g, cx, cy, R, k) {
  g.save();
  g.strokeStyle = '#fff';
  g.lineWidth = Math.max(1.5, 3.2 * k);
  g.beginPath();
  g.arc(cx, cy, R * 1.12, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = Math.max(1, 1.4 * k);
  g.beginPath();
  g.arc(cx, cy, R * 1.065, 0, Math.PI * 2);
  g.stroke();
  // pearls on the ring at the cardinal points
  g.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
    g.beginPath();
    g.arc(cx + Math.cos(a) * R * 1.12, cy + Math.sin(a) * R * 1.12, 6 * k, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** Endpaper (page aspect): a full-bleed repeat pattern from theme.endpaper. */
export function endpaper(P) {
  const { g, W, H, k, theme: T, page } = P;
  const ep = { ...T.endpaper, ...(page.endpaper ?? {}) };
  const seed = `${page.book?.id ?? 'book'}|endpaper`;
  P.op(() => paintEndpaper(g, 0, 0, W, H, ep, { k, seed }));
}
