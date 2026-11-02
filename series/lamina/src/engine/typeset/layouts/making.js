// "How this book was made": the last leaf before the back board. Its recto
// prints the prompt that began the series, or an explicitly labelled editorial
// version (the Spanish edition labels its translation); its verso,
// the last page of the book, prints this book's own brief and closes with
// one line on the later prompts kept in docs/prompts/.
//
// page.making = { part: 'prompt' | 'brief', model, translated,
//   prompt: { lines, title, headings, source, lang, translated, editorial?, displayTitle? },
//   brief:  { text, source, lang, translated },
//   later:  { text, source, lang, translated } }   (loadEdition, design-i18n §7)
//
// The quoted texts are set at 26 design px — never below 25 px: auto-fit may
// only take this layout down to 25/26 of its size, in finer steps (fit below).
// Their source wording is preserved, so both editions are set ragged right, never
// justified or hyphenated, and lines break at spaces only: words, URLs, file
// names and code tokens stay whole, and a binomial, a cross-reference
// (CONTRACTS §12 I) or a short code group never straddles two lines (bound() below).
import { paragraph, withLang } from '../text.js';
import { furniture } from '../page.js';
import { rule, fleuronRule } from '../draw.js';
import { ornamentKind } from './boards.js';
import { rgba, mix } from '../util.js';
import { tl } from '../../../i18n/index.js';

/** Body size of the quoted texts (design px) and its floor. */
const BODY = 26;
const FLOOR = 25;

/** The making pages (recto: the prompt; verso: the brief). */
export function making(P) {
  const { W, H, theme: T, page } = P;
  const mk = page.making ?? {};
  const part = mk.part === 'brief' ? 'brief' : 'prompt';
  const src = mk[part];
  P.op((g) => {
    g.fillStyle = T.paper;
    g.fillRect(0, 0, W, H);
  });
  furniture(P);
  const { x, w } = P.text;
  const ink = T.engraving ? T.ink : T.accent;
  const compose = (y0) => {
    let y = y0;
    // opener: kicker, title, short rule (as the other back-matter pages)
    P.lineFit(tl(P.lang, 'How this book was made'), 'kicker', x, y + P.ts(20), 'left', w, { what: 'making kicker' });
    y += P.ts(44);
    const title = part === 'prompt' ? (src?.displayTitle ?? tl(P.lang, 'The prompt')) : tl(P.lang, 'This book’s brief');
    const tp = paragraph(P.fonts, title, { style: P.style('h1', { size: P.ts(64) }), width: w, align: 'left', hyphenate: false });
    const ty = y;
    P.op((g) => tp.draw(g, x, ty));
    y += tp.height + P.ts(8);
    const ry = y + P.ts(16);
    P.op((g) => rule(g, x, ry, x + P.ts(140), ink, Math.max(1.5, P.px(3))));
    y += P.ts(32) + P.ts(18);
    // lead: where the text comes from
    const translated = !!src?.translated;
    let lead;
    if (part === 'prompt') {
      lead = src?.editorial
        ? tl(P.lang, 'This prompt has been edited for the book. The original request is preserved in the project history.')
        : translated
        ? tl(P.lang, 'This book began with a prompt to {model}, written in English.', { model: mk.model ?? 'Claude Code' })
        : tl(P.lang, 'This book began with a prompt to {model}. It is printed as it was written.', { model: mk.model ?? 'Claude Code' });
    } else lead = tl(P.lang, 'Research, writing, illustrations and review followed this brief:');
    const lp = paragraph(P.fonts, lead, { style: P.style('dyk', { size: P.ts(25), color: rgba(T.ink, 0.85) }), width: w, align: 'left', hyphenate: false });
    const ly = y;
    P.op((g) => lp.draw(g, x, ly));
    y += lp.height + P.ts(22);
    if (translated) {
      P.lineFit(tl(P.lang, src?.editorial ? 'Translated from the English reader prompt' : 'Translated from the English original'), 'labelMuted', x, y + P.ts(19), 'left', w, { what: 'making translation note' });
      y += P.ts(40);
    }
    // the quoted text, behind a rule
    const qx = x + P.ts(40);
    const qw = w - P.ts(40);
    const qTop = y;
    y = part === 'prompt' ? promptLines(P, src, qx, y, qw) : briefText(P, src, qx, y, qw);
    const qBot = y;
    P.op((g) => {
      g.strokeStyle = ink;
      g.lineWidth = Math.max(1.5, P.px(3));
      g.beginPath();
      g.moveTo(x + P.px(6), qTop + P.ts(4));
      g.lineTo(x + P.px(6), qBot);
      g.stroke();
    });
    y += P.ts(24);
    if (src?.source) {
      P.lineFit(src.source, P.style('mono', { size: P.ts(19), color: T.muted }), qx, y + P.ts(19), 'left', qw, { what: 'making source' });
      y += P.ts(30);
    }
    return y;
  };
  const y0 = P.text.y + P.ts(24);
  if (part === 'prompt') {
    P.reach(compose(y0));
    return;
  }
  // the brief is shorter than the prompt: sink it like a chapter opener, and
  // close the book with the line on the later prompts at the foot of the page
  const later = mk.later?.text ? laterBlock(P, mk.later, w) : null;
  const room = later ? later.h + P.ts(70) : 0;
  const h = P.dry(() => compose(y0)) - y0;
  const yEnd = compose(y0 + Math.min(P.sinkage(h + room), Math.max(0, P.text.h - h - room - P.ts(24))));
  if (later) {
    const ly = Math.max(yEnd + P.ts(56), P.text.bottom - later.h);
    later.place(x, ly);
    P.reach(ly + later.h);
  } else P.reach(yEnd);
}
making.fit = { minScale: FLOOR / BODY, step: 0.0125 };

/** The prompt, one paragraph per line as written: blank lines, bullets, headings, its title. */
function promptLines(P, prompt, x, y, w) {
  const T = P.theme;
  const lines = prompt?.lines ?? [];
  const headings = new Set(prompt?.headings ?? []);
  const st = P.style('small', { size: P.ts(BODY), leading: 1.4 });
  const hst = P.style('labelMuted', { color: T.ink });
  const bullet = P.ts(30);
  // printed in its own language (an untranslated part stays English), verbatim
  withLang(prompt?.lang ?? P.lang, () => {
    lines.forEach((raw, i) => {
      const ln = String(raw ?? '');
      if (!ln.trim()) {
        y += st.size * 0.45;
        return;
      }
      const isBullet = /^\* /.test(ln);
      const head = headings.has(i);
      const text = bound(isBullet ? ln.slice(2) : ln, P.page.binomials);
      const runs = i === prompt?.title ? [{ text, bold: true }] : [{ text }];
      const para = paragraph(P.fonts, runs, { style: head ? hst : st, width: isBullet ? w - bullet : w, align: 'left', hyphenate: false, wholeWords: true });
      const yy = y + (head ? P.ts(6) : 0);
      P.op((g) => {
        if (isBullet) {
          g.fillStyle = T.engraving ? T.ink : T.accent;
          g.beginPath();
          g.arc(x + P.ts(9), yy + para.baselineOf(0) - st.size * 0.3, Math.max(1, P.ts(3.2)), 0, Math.PI * 2);
          g.fill();
        }
        para.draw(g, isBullet ? x + bullet : x, yy);
      });
      y += para.height + (head ? P.ts(10) : 0);
    });
  });
  return y;
}

/**
 * The brief: one paragraph in its own language, verbatim like the prompt. It
 * is passed as a run, not as markup, so an asterisk prints as written.
 */
function briefText(P, brief, x, y, w) {
  if (!brief?.text) return y;
  const st = P.style('small', { size: P.ts(BODY), leading: 1.4 });
  const runs = [{ text: bound(brief.text, P.page.binomials) }];
  const para = withLang(brief.lang ?? P.lang, () => paragraph(P.fonts, runs, { style: st, width: w, align: 'left', hyphenate: false, wholeWords: true }));
  const yy = y;
  P.op((g) => para.draw(g, x, yy));
  return y + para.height;
}

const NBSP = '\u00a0';

/**
 * A verbatim text with the spaces a line must not break at made no-break
 * (U+00A0 prints as the space it replaces): inside the edition's Latin names
 * (`names`, longest first) and "p. ej."; in a cross-reference (CONTRACTS §12
 * II); after a numeral that numbers the next word (II Platanilla); before a
 * spaced dash, slash, operator or arrow, which ends a line rather than
 * starting one; throughout a short code group with no group inside it
 * ({ title, text }); and after the opening and before the closing bracket of
 * any other group.
 */
function bound(text, names = []) {
  let s = String(text ?? '');
  for (const n of names) if (s.includes(n)) s = s.split(n).join(n.replaceAll(' ', NBSP));
  return s
    .replace(/\{[^{}]{1,30}\}/g, (m) => m.replaceAll(' ', NBSP))
    .replace(/\bp\. ej\./g, `p.${NBSP}ej.`)
    .replace(/(\p{Lu}{2,}) (?=§)/gu, `$1${NBSP}`)
    .replace(/(§\s?\d+) (?=[IVXLC]+\b)/g, `$1${NBSP}`)
    .replace(/(^|[\s(])([IVX]{1,4}) (?=\p{Lu})/gu, `$1$2${NBSP}`)
    .replace(/ (?=[—–\/=+→] )/g, NBSP)
    .replace(/([{(\[]) /g, `$1${NBSP}`)
    .replace(/ (?=[}\])])/g, NBSP);
}

/** The closing line on the later prompts: a small fleuron, then one italic paragraph. */
function laterBlock(P, later, w) {
  const T = P.theme;
  const st = P.style('dyk', { size: P.ts(25), color: rgba(T.ink, 0.78), leading: 1.4 });
  // (it names a path: words stay whole)
  const para = withLang(later.lang ?? P.lang, () => paragraph(P.fonts, later.text, { style: st, width: Math.min(w, P.ts(1000)), align: 'left', hyphenate: false, wholeWords: true }));
  const orn = P.ts(30);
  return {
    h: orn + para.height,
    place(x, y) {
      P.op((g) => fleuronRule(g, ornamentKind(P), x + P.ts(60), y + P.ts(8), P.ts(60), P.ts(20), T.engraving ? T.ink : mix(T.accent, T.ink, 0.25), T.paper));
      P.op((g) => para.draw(g, x, y + orn));
    },
  };
}
