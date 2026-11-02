// Composite text blocks shared by several layouts. Each block is measured
// first and placed later — `block(P, …, width)` returns `{ h, place(x, y) }`
// — so layouts can balance columns (try a placement, compare heights) before
// a single pixel is drawn. `place` queues draw ops and registers hit rects.
//
// Printed words go through tl(P.lang, …) (the page's edition language). Decisions
// taken from words — is this badge a warning, is this name a taxon — are
// taken on the English source (en()), so both editions look alike.
import { paragraph, line, plain } from './text.js';
import {
  rule, checkboxGlyph, roundRectPath, warningGlyph, diamondGlyph, IUCN, onColor,
  scaleBar, loopGlyph, fleuronRule,
} from './draw.js';
import { rgba, mix } from './util.js';
import { en, tl } from '../../i18n/index.js';

/** Humanise a label id: 'loreal-pit' → 'Loreal pit'. */
export function humanize(id = '') {
  const s = String(id).replace(/[-_]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Whether a plate's `scientific` names a taxon (set in italics): it does when
 * the plate gives an authority. Decided on the English source, so "Cranial
 * proportions" stays roman and "Panthera onca" italic in both editions.
 */
export const isTaxon = (plate) => !!String(en(plate)?.authority ?? '').trim();

/** Whether a plate's badge is a warning (accent chip with a triangle), from the English source. */
export const isWarning = (plate) => /venom|danger|toxic|poison|caution|warning|lethal/i.test(en(plate)?.badge ?? '');

/** Small-caps section heading (e.g. FIELD NOTES) with an optional rule. */
export function heading(P, text, width, { color, ruleAfter = true, styleName = 'label' } = {}) {
  const st = P.style(styleName, color ? { color } : {});
  const l = P.fitWidth(text, st, width, { what: 'heading' });
  const h = P.ts(30) + (ruleAfter ? P.px(14) : 0);
  return {
    h,
    place(x, y) {
      const by = y + P.ts(22);
      P.op((g) => l.draw(g, x, by));
      if (ruleAfter) {
        const ry = y + P.ts(32);
        P.op((g) => rule(g, x, ry, x + width, rgba(P.theme.ink, 0.28), Math.max(1, P.px(1.3))));
      }
    },
  };
}

/** Vertical stack of blocks with gaps. */
export function stack(blocks, gap) {
  const list = blocks.filter(Boolean);
  const h = list.reduce((s, b) => s + b.h, 0) + gap * Math.max(0, list.length - 1);
  return {
    h,
    place(x, y) {
      let yy = y;
      for (const b of list) {
        b.place(x, yy);
        yy += b.h + gap;
      }
    },
  };
}

/** A paragraph as a block. */
export function paraBlock(P, src, styleName, width, o = {}) {
  const st = typeof styleName === 'string' ? P.style(styleName, o.over) : styleName;
  const para = paragraph(P.fonts, src, { ...o, style: st, width });
  return {
    h: para.height,
    para,
    place(x, y) {
      P.op((g) => para.draw(g, x, y));
    },
  };
}

/** Several paragraphs: first unindented, the rest with a first-line indent. */
export function bodyBlock(P, paragraphs, styleName, width, { indent = 1.4, firstSmallCaps = true, align = 'justify' } = {}) {
  const st = P.style(styleName);
  const paras = (paragraphs ?? []).filter((p) => p && String(p).trim());
  const blocks = paras.map((src, i) => {
    let runs;
    if (i === 0 && firstSmallCaps) runs = smallCapsLead(P, src, st);
    const para = paragraph(P.fonts, runs ?? src, {
      style: st,
      width,
      align,
      indent: i === 0 ? 0 : st.size * indent,
    });
    return para;
  });
  const h = blocks.reduce((s, p) => s + p.height, 0);
  return {
    h,
    paras: blocks,
    place(x, y) {
      let yy = y;
      for (const p of blocks) {
        const py = yy;
        P.op((g) => p.draw(g, x, py));
        yy += p.height;
      }
    },
  };
}

/**
 * Runs where the first plain word is set in small caps (classic opening).
 * Opening punctuation (¿ ¡ « “) stays before it at body size, closing
 * punctuation after it; a paragraph that opens with markup is left alone.
 */
export function smallCapsLead(P, src, st) {
  const m = /^([^\p{L}\p{N}\s*]*)(\p{L}[\p{L}’']*)([^\s*]*)(\s[\s\S]*)$/u.exec(String(src ?? ''));
  if (!m) return null;
  const sc = { ...st, caps: 'small', tracking: 0.07 };
  return [...(m[1] ? [{ text: m[1] }] : []), { text: m[2], style: sc }, { text: m[3] + m[4], markup: true }];
}

/**
 * Field-notes table: each small-caps label above its (wrapping) value. One
 * format on every plate: leader-dot rows only fit the narrow side panel for
 * the tersest tables, and a table that switches format from one spread to
 * the next reads as a mistake.
 */
export function factsBlock(P, facts, width, { title = tl(P.lang, 'Field notes') } = {}) {
  const rows = (facts ?? []).filter((r) => Array.isArray(r) && r.length >= 2);
  if (!rows.length) return null;
  const head = heading(P, title, width);
  const lst = P.style('factLabel');
  const vst = P.style('factValue');
  const gapRow = P.ts(13);
  const items = rows.map(([label, value]) => {
    const para = paragraph(P.fonts, value, { style: vst, width, align: 'left', hyphenate: false });
    return { l: P.fitWidth(label, lst, width, { what: 'fact label' }), para, h: lst.size * 1.45 + para.height };
  });
  const body = items.reduce((s, it) => s + it.h, 0) + gapRow * (items.length - 1);
  const h = head.h + P.ts(12) + body;
  return {
    h,
    place(x, y) {
      head.place(x, y);
      let yy = y + head.h + P.ts(12);
      for (const it of items) {
        const top = yy;
        P.op((g) => it.l.draw(g, x, top + lst.size * 1.05));
        P.op((g) => it.para.draw(g, x, top + lst.size * 1.45));
        yy += it.h + gapRow;
      }
    },
  };
}

/**
 * "Look closer" checklist; each item is a hit → { type: 'label', id }. Each
 * row is named by its `name`, else by its label id humanised ('Loreal pit'),
 * in the page's language.
 */
export function lookCloserBlock(P, items, width, { title = tl(P.lang, 'Look closer') } = {}) {
  const list = (items ?? []).filter((it) => it && (it.text || it.label));
  if (!list.length) return null;
  const T = P.theme;
  const head = heading(P, title, width);
  const box = P.ts(21);
  const indent = box + P.ts(16);
  const nameSt = P.style('label', { color: T.accent });
  const textSt = P.style('lookText');
  const gap = P.ts(18);
  // the edition's own name; a name it left in English (or the humanised id)
  // is looked up like a figure label
  const nameOf = (it) => (it.name == null ? tl(P.lang, humanize(it.label)) : P.lang !== 'en' && it.name === en(it)?.name ? tl(P.lang, it.name) : it.name);
  const rows = list.map((it) => {
    const name = it.label ? P.fitWidth(nameOf(it), nameSt, width - indent, { what: 'look-closer name' }) : null;
    const para = paragraph(P.fonts, it.text ?? '', { style: textSt, width: width - indent, align: 'left' });
    const nameH = name ? nameSt.size * 1.5 : 0;
    return { it, name, para, nameH, h: nameH + para.height };
  });
  const h = head.h + P.ts(14) + rows.reduce((s, r) => s + r.h, 0) + gap * (rows.length - 1);
  return {
    h,
    place(x, y) {
      head.place(x, y);
      let yy = y + head.h + P.ts(14);
      for (const r of rows) {
        const top = yy;
        const capY = top + (r.name ? nameSt.size * 1.05 : textSt.size * 0.95);
        P.op((g) => checkboxGlyph(g, x, capY - box * 0.86, box, rgba(T.ink, 0.75), P.k));
        if (r.name) P.op((g) => r.name.draw(g, x + indent, capY));
        const py = top + r.nameH - (r.name ? P.ts(2) : 0);
        P.op((g) => r.para.draw(g, x + indent, py));
        if (r.it.label) {
          P.hit(`look-${r.it.label}`, [x - P.ts(6), top - P.ts(4), x + width, top + r.h + P.ts(4)], { type: 'label', id: r.it.label });
        }
        yy += r.h + gap;
      }
    },
  };
}

/** "Did you know?" box: tinted panel, accent bar, italic text. */
export function dykBlock(P, text, width, { title = tl(P.lang, 'Did you know?') } = {}) {
  if (!text) return null;
  const T = P.theme;
  const pad = P.ts(26);
  const bar = P.px(5);
  const st = P.style('dyk');
  const head = P.fitWidth(title, P.style('label', { color: T.accent }), width - pad * 2 - bar, { what: 'did-you-know title' });
  const para = paragraph(P.fonts, text, { style: st, width: width - pad * 2 - bar, align: 'left' });
  const headH = P.ts(34);
  const h = pad + headH + para.height + pad * 0.8;
  return {
    h,
    place(x, y) {
      P.op((g) => {
        g.fillStyle = T.engraving ? rgba(T.ink, 0.045) : mix(T.accent, T.paper, 0.94);
        roundRectPath(g, x, y, width, h, P.px(6));
        g.fill();
        g.fillStyle = T.accent;
        g.fillRect(x, y, bar, h);
      });
      P.op((g) => head.draw(g, x + bar + pad, y + pad + P.ts(16)));
      P.op((g) => para.draw(g, x + bar + pad, y + pad + headH));
    },
  };
}

/**
 * IUCN chip + property badge on one row (wraps to two rows if needed). A chip
 * wider than the measure sets its words smaller (hOverflow when it cannot).
 * @param {object} [o] { warn: the badge is a warning (isWarning(plate)); by default its text decides }
 */
export function chipsBlock(P, status, badge, width, { warn: warnOpt } = {}) {
  const T = P.theme;
  const chips = [];
  const hgt = P.ts(44);
  if (status && status.code) {
    const code = String(status.code).toUpperCase();
    const info = IUCN[code] ?? { color: T.muted, label: status.label ?? code };
    const cst = P.style('chipCode', { color: onColor(info.color) });
    let lst = P.style('chip');
    const cl = line(P.fonts, code, cst);
    const label = status.label ?? tl(P.lang, info.label);
    let sst = P.style('chip', { color: T.muted, weight: 400 });
    let ll = line(P.fonts, label, lst);
    let src = status.source ? line(P.fonts, status.source, sst) : null;
    const codeW = Math.max(cl.width + P.ts(22), hgt * 1.15);
    const room = width - codeW - P.ts(14) - (src ? P.ts(14) : 0) - P.ts(18);
    const words = ll.width + (src ? src.width : 0);
    if (words > room + 0.5) {
      const s = Math.max(0.85, room / words);
      lst = { ...lst, size: lst.size * s };
      sst = { ...sst, size: sst.size * s };
      ll = line(P.fonts, label, lst);
      src = src ? line(P.fonts, status.source, sst) : null;
      const over = ll.width + (src ? src.width : 0) - room;
      if (over > 0.5) P.hOverflow.push({ what: 'status chip', text: `${label}${status.source ? ` · ${status.source}` : ''}`, over: Math.round(over / P.k) });
    }
    const w = codeW + P.ts(14) + ll.width + (src ? P.ts(14) + src.width : 0) + P.ts(18);
    chips.push({
      w,
      draw(g, x, y) {
        g.strokeStyle = rgba(T.ink, 0.35);
        g.lineWidth = Math.max(1, P.px(1.4));
        roundRectPath(g, x, y, w, hgt, hgt / 2);
        g.stroke();
        g.fillStyle = info.color;
        roundRectPath(g, x, y, codeW, hgt, hgt / 2);
        g.fill();
        const by = y + hgt / 2 + cst.size * 0.36;
        cl.draw(g, x + codeW / 2, by, 'center');
        ll.draw(g, x + codeW + P.ts(14), y + hgt / 2 + lst.size * 0.36);
        if (src) {
          const sx = x + codeW + P.ts(14) + ll.width + P.ts(7);
          g.fillStyle = rgba(T.ink, 0.4);
          g.beginPath();
          g.arc(sx, y + hgt / 2, Math.max(1, P.ts(2)), 0, Math.PI * 2);
          g.fill();
          src.draw(g, sx + P.ts(7), y + hgt / 2 + lst.size * 0.36);
        }
      },
    });
  }
  if (badge) {
    const warn = warnOpt ?? /venom|danger|toxic|poison|caution|warning|lethal|peligro/i.test(badge);
    const color = warn ? T.accent : T.ink;
    const st = P.style('chip', { color, weight: 600 });
    const icon = P.ts(20);
    const bl = P.fitWidth(badge, st, width - (P.ts(18) + icon + P.ts(10) + P.ts(20)), { what: 'badge chip' });
    const w = P.ts(18) + icon + P.ts(10) + bl.width + P.ts(20);
    chips.push({
      w,
      draw(g, x, y) {
        g.strokeStyle = rgba(color, warn ? 0.85 : 0.4);
        g.lineWidth = Math.max(1, P.px(1.6));
        roundRectPath(g, x, y, w, hgt, hgt / 2);
        g.stroke();
        if (warn) {
          g.fillStyle = rgba(T.accent, 0.07);
          roundRectPath(g, x, y, w, hgt, hgt / 2);
          g.fill();
          warningGlyph(g, x + P.ts(18) + icon / 2, y + hgt / 2 + P.ts(1), icon * 0.9, color);
        } else diamondGlyph(g, x + P.ts(18) + icon / 2, y + hgt / 2, icon * 0.7, T.accent);
        bl.draw(g, x + P.ts(18) + icon + P.ts(10), y + hgt / 2 + st.size * 0.36);
      },
    });
  }
  if (!chips.length) return null;
  const gap = P.ts(14);
  // flow chips into rows
  const rows = [[]];
  let used = 0;
  for (const c of chips) {
    if (used > 0 && used + gap + c.w > width) {
      rows.push([]);
      used = 0;
    }
    rows[rows.length - 1].push(c);
    used += (used ? gap : 0) + c.w;
  }
  const h = rows.length * hgt + (rows.length - 1) * gap;
  const w = Math.max(...rows.map((row) => row.reduce((s, c, i) => s + c.w + (i ? gap : 0), 0)));
  return {
    h,
    w,
    rows: rows.length,
    place(x, y) {
      rows.forEach((row, ri) => {
        let xx = x;
        const yy = y + ri * (hgt + gap);
        for (const c of row) {
          const cx = xx;
          P.op((g) => c.draw(g, cx, yy));
          xx += c.w + gap;
        }
      });
    },
  };
}

/** Short source line(s): "Sources — A; B; C." in small muted type. */
export function sourcesLine(P, sources, width) {
  const list = (sources ?? []).filter(Boolean);
  if (!list.length) return null;
  const st = P.style('note', { color: P.theme.muted });
  const src = tl(P.lang, '**Sources** — {list}', { list: `${list.join('; ')}${/[.!?]$/.test(list[list.length - 1]) ? '' : '.'}` });
  const para = paragraph(P.fonts, src, { style: st, width, align: 'left', hyphenate: false });
  return {
    h: para.height,
    place(x, y) {
      P.op((g) => para.draw(g, x, y));
    },
  };
}

/** Figure caption: "Fig. 1 —" lead-in in small caps, then the caption text. */
export function captionBlock(P, caption, width, { align = 'center' } = {}) {
  if (!caption) return null;
  const st = P.style('caption');
  const m = /^\s*((?:Fig(?:ure)?|Lám(?:ina)?|Plate|Pl)\.?\s*[\dIVXLC]+\.?)\s*[—–:-]?\s*([\s\S]*)$/i.exec(caption);
  let runs;
  if (m) {
    const lead = { ...st, caps: 'small', tracking: 0.08, color: P.theme.accent };
    runs = [{ text: m[1].replace(/\.$/, ''), style: lead }, { text: ' — ' }, { text: m[2], markup: true }];
  }
  const para = paragraph(P.fonts, runs ?? caption, { style: st, width, align, hyphenate: false });
  return {
    h: para.height,
    para,
    place(x, y) {
      P.op((g) => para.draw(g, x, y));
    },
  };
}

/**
 * Meta line under a figure: scale bar + scale note · loop glyph + animation title.
 */
export function figureMetaBlock(P, scaleNote, animationTitle, width) {
  const T = P.theme;
  // units keep their case (cm, m), so the meta line is set in italic serif, not caps
  let st = P.style('caption', { italic: true, size: P.ts(26), color: rgba(T.ink, 0.72) });
  const texts = [];
  if (scaleNote) texts.push({ kind: 'scale', text: scaleNote });
  if (animationTitle) texts.push({ kind: 'loop', text: tl(P.lang, '{title} — a five-second loop', { title: plain(animationTitle) }) });
  if (!texts.length) return null;
  const glyphW = { scale: P.ts(54), loop: P.ts(24) };
  const sep = P.ts(44);
  const measureAll = () => {
    const parts = texts.map((t) => ({ kind: t.kind, l: line(P.fonts, t.text, st) }));
    return { parts, total: parts.reduce((s, p) => s + glyphW[p.kind] + P.ts(12) + p.l.width, 0) + sep * (parts.length - 1) };
  };
  // one line, never wider than the caption: the words step down (to 85 %) first
  let { parts, total } = measureAll();
  if (total > width + 0.5) {
    const fixed = parts.reduce((s, p) => s + glyphW[p.kind] + P.ts(12), 0) + sep * (parts.length - 1);
    const s = Math.max(0.85, (width - fixed) / (total - fixed));
    st = { ...st, size: st.size * s };
    ({ parts, total } = measureAll());
    if (total > width + 0.5) P.hOverflow.push({ what: 'figure meta line', text: texts.map((t) => t.text).join(' · '), over: Math.round((total - width) / P.k) });
  }
  const h = P.ts(34);
  return {
    h,
    place(x, y) {
      let xx = x + (width - total) / 2;
      const by = y + P.ts(24);
      parts.forEach((p, i) => {
        const gx = xx;
        if (p.kind === 'scale') P.op((g) => scaleBar(g, gx, by - st.size * 0.33, glyphW.scale, P.ts(7), rgba(T.ink, 0.75), T.paper));
        else P.op((g) => loopGlyph(g, gx + glyphW.loop / 2, by - st.size * 0.35, P.ts(8.5), rgba(T.ink, 0.7), Math.max(1, P.ts(1.8))));
        xx += glyphW[p.kind] + P.ts(12);
        const tx = xx;
        P.op((g) => p.l.draw(g, tx, by));
        xx += p.l.width;
        if (i < parts.length - 1) {
          const dx = xx + sep / 2;
          P.op((g) => {
            g.fillStyle = rgba(T.ink, 0.45);
            g.beginPath();
            g.arc(dx, by - st.size * 0.33, Math.max(1, P.ts(2.2)), 0, Math.PI * 2);
            g.fill();
          });
          xx += sep;
        }
      });
    },
  };
}

/** Ornamental rule as a block of given height, centred in `width`. */
export function ornamentBlock(P, kind, width, { half, size, h } = {}) {
  const T = P.theme;
  const H = h ?? P.ts(44);
  const S = size ?? P.ts(24);
  const half2 = half ?? Math.min(width / 2, P.ts(150));
  return {
    h: H,
    place(x, y) {
      const cx = x + width / 2;
      const cy = y + H / 2;
      P.op((g) => fleuronRule(g, kind, cx, cy, half2, S, T.engraving ? T.ink : mix(T.accent, T.ink, 0.25), T.paper));
    },
  };
}

/** Bulleted list (mistakes ×, proportions ◆, or plain •). */
export function listBlock(P, title, items, width, { bullet = 'dot', styleName = 'stepText' } = {}) {
  const list = (items ?? []).filter(Boolean);
  if (!list.length) return null;
  const T = P.theme;
  const head = title ? heading(P, title, width) : null;
  const st = P.style(styleName);
  const ind = P.ts(30);
  const gap = P.ts(10);
  const paras = list.map((s) => paragraph(P.fonts, s, { style: st, width: width - ind, align: 'left' }));
  const h = (head ? head.h + P.ts(12) : 0) + paras.reduce((s, p) => s + p.height, 0) + gap * (paras.length - 1);
  return {
    h,
    place(x, y) {
      let yy = y;
      if (head) {
        head.place(x, y);
        yy += head.h + P.ts(12);
      }
      for (const p of paras) {
        const top = yy;
        const cy = top + p.baselineOf(0) - st.size * 0.32;
        P.op((g) => {
          const s = P.ts(11);
          const bx = x + P.ts(8);
          if (bullet === 'cross') {
            g.strokeStyle = T.accent;
            g.lineWidth = Math.max(1, P.ts(2.2));
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(bx - s / 2, cy - s / 2);
            g.lineTo(bx + s / 2, cy + s / 2);
            g.moveTo(bx + s / 2, cy - s / 2);
            g.lineTo(bx - s / 2, cy + s / 2);
            g.stroke();
          } else if (bullet === 'diamond') diamondGlyph(g, bx, cy, s * 1.3, T.accent);
          else {
            g.fillStyle = T.accent;
            g.beginPath();
            g.arc(bx, cy, s * 0.3, 0, Math.PI * 2);
            g.fill();
          }
        });
        P.op((g) => p.draw(g, x + ind, top));
        yy += p.height + gap;
      }
    },
  };
}
