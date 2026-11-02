// Accessible text for the current spread: the 3D pages are canvases, so the
// same words are mirrored as semantic HTML for screen readers, the mobile
// reading sheet and search engines. Everything printed on a page that a
// phone or a screen reader could otherwise never reach belongs here: the
// boards (title and author: the foil mark is a picture of a name), the plate
// text with its status, figure caption, look-closer notes and sources, and
// the front and back matter (title page, imprint, introduction, how-to,
// afterword, sources, glossary, how this book was made).
//
// A side is mirrored in its edition's language (tl with page.book.locale),
// as the typesetter prints it, so the Read sheet and the page agree; the
// fixed headings and run-ins are the typesetter's own dictionary keys. Words
// in another language than the page's carry their own lang (WCAG 3.1.2):
// Costa Rican names in the English edition, English names and citations in
// the Spanish one, Latin binomials.
import { tl, getLang, en, fmtList } from '../i18n/index.js';
import { resolveTheme } from '../engine/typeset/index.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** Inline markup used in manifests: *italic*, **bold**. */
export const inline = (s = '') =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

const list = (a) => (Array.isArray(a) ? a : a ? [a] : []).filter(Boolean);
const paras = (a) => list(a).map((p) => `<p>${inline(p)}</p>`).join('');
const dl = (rows) => {
  const r = list(rows).filter((x) => Array.isArray(x) && x.length >= 2);
  return r.length ? `<dl>${r.map(([t, d]) => `<dt>${inline(t)}</dt><dd>${inline(d)}</dd>`).join('')}</dl>` : '';
};
const items = (a, tag = 'ul', cls = '', langOfItem = () => null) => {
  const r = list(a);
  return r.length ? `<${tag}${cls ? ` class="${cls}"` : ''}>${r.map((x, i) => `<li${langAttr(langOfItem(x, i))}>${inline(x)}</li>`).join('')}</${tag}>` : '';
};
const langAttr = (l) => (l ? ` lang="${l}"` : '');
/** A side's language: its edition's. */
const langOf = (s) => s?.book?.locale ?? getLang();
/** The other edition's language: the one the books' bilingual names are given in. */
const other = (lang) => (lang === 'en' ? 'es' : 'en');

/**
 * A look-closer note as a link the reader can follow to its label. The id
 * rides in the fragment (the sanitizer keeps `#` hrefs and drops data-*);
 * the Reader intercepts the click before it can change the route.
 */
export const LOOK_HREF = '#look:';

/** A label id as the typesetter names a look-closer note without a `name`: 'loreal-pit' → 'Loreal pit'. */
function humanize(id = '') {
  const s = String(id).replace(/[-_]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * A look-closer note's name, as its page prints it (typeset/blocks.js): the
 * edition's own wording when it has one; an English name (the humanised
 * label id, or one this edition has not translated yet) goes through the
 * dictionary.
 */
function lookName(l, lang) {
  if (l.name == null) return tl(lang, humanize(l.label));
  return lang !== 'en' && l.name === en(l)?.name ? tl(lang, l.name) : l.name;
}

/**
 * The language of a plate's two names where it is not the page's
 * (CONTRACTS §6): `common` is the Costa Rican Spanish name and `commonAlt`
 * the English one, in both editions; a lesson is named in its edition's
 * language and gives the other in `commonAlt` (until its Spanish text
 * exists, the Spanish edition still shows the English pair).
 */
function nameLangs(plate, lang) {
  if (plate.layout === 'lesson') {
    if (lang !== 'en' && plate.common === en(plate).common) return { common: 'en', alt: null };
    return { common: null, alt: other(lang) };
  }
  return { common: lang === 'en' ? 'es' : null, alt: lang === 'en' ? null : 'en' };
}

/** A taxon has an authority ("Panthera onca Linnaeus, 1758"); a lesson's anatomical focus has none (R1.9). */
const isTaxon = (plate) => !!en(plate).authority;

/** English function words: a citation that has them and reads as in English is marked lang="en". */
const ENGLISH = /\b(?:the|and|of|with|to|is|are|was|were|from|for|its|this|that|in|on|by|as|at|or|into|than|which|when|where|while|be|it|an)\b/i;
/** A source the Spanish edition keeps as the English edition has it, in English. */
const sourceLang = (lang, sources) => {
  if (lang === 'en') return () => null;
  const src = en(sources);
  return (text, i) => (src[i] === text && ENGLISH.test(String(text).replace(/\*[^*]+\*/g, '')) ? 'en' : null);
};

/**
 * The plate's own text (both pages of its spread), in the edition's language.
 * @param {object} plate  a plate of a book edition
 * @param {string} [lang] the edition's language
 * @param {number} [figureNumber]  1-based, for a figure that has no caption (as printed: "Fig. n — binomial")
 */
export function plateHTML(plate, lang = getLang(), figureNumber = null) {
  if (!plate) return '';
  const lesson = plate.layout === 'lesson';
  const facts = (plate.facts ?? []).map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${inline(v)}</td></tr>`).join('');
  const lessonData = plate.lesson ?? {};
  const steps = lessonData.steps?.length
    ? `<ol class="steps">${lessonData.steps.map((s) => `<li><b>${esc(s.title)}</b> ${inline(s.text)}</li>`).join('')}</ol>`
    : '';
  const tip = lessonData.proTip ? `<p class="tip"><b>${esc(tl(lang, 'Pro tip.'))}</b> ${inline(lessonData.proTip)}</p>` : '';
  const mistakes = list(lessonData.mistakes).length ? `<h3>${esc(tl(lang, 'Common mistakes'))}</h3>${items(lessonData.mistakes)}` : '';
  const proportions = list(lessonData.proportions).length ? `<h3>${esc(tl(lang, 'Proportions'))}</h3>${items(lessonData.proportions)}` : '';
  const st = plate.status;
  // label and source are manifest text like the rest of the plate (a source may cite a synonym in *italics*)
  const status = st?.label
    ? `<p class="status">${st.source ? `${inline(st.source)}: ` : ''}${inline(st.label)}${st.code ? ` (${esc(st.code)})` : ''}</p>`
    : '';
  // the recto under the figure: its caption and scale note (the loop's narration follows from the UI)
  const fig = plate.figure ?? {};
  const caption =
    fig.caption ??
    (plate.scientific && figureNumber ? tl(lang, 'Fig. {n} — {scientific}', { n: figureNumber, scientific: isTaxon(plate) ? `*${plate.scientific}*` : plate.scientific }) : '');
  const figure = caption || fig.scaleNote
    ? `${caption ? `<p class="caption">${inline(caption)}</p>` : ''}${fig.scaleNote ? `<p class="scale">${inline(fig.scaleNote)}</p>` : ''}`
    : '';
  const look = list(plate.lookCloser).filter((l) => l.text);
  const lookHTML = look.length
    ? `<h3>${esc(tl(lang, 'Look closer'))}</h3><ul class="look">${look
        // one span: the link is laid out as [text | Show], so inline italics must not become cells
        .map((l) =>
          l.label
            ? `<li><a class="lam-look" href="${LOOK_HREF}${esc(l.label)}"><span><b>${esc(lookName(l, lang))}</b> ${inline(l.text)}</span></a></li>`
            : `<li>${inline(l.text)}</li>`
        )
        .join('')}</ul>`
    : '';
  const sources = list(plate.sources).length ? `<h3>${esc(tl(lang, 'Sources'))}</h3>${items(plate.sources, 'ul', 'sources', sourceLang(lang, plate.sources))}` : '';
  const names = nameLangs(plate, lang);
  const sci = plate.scientific ? (isTaxon(plate) ? `<em lang="la">${esc(plate.scientific)}</em>` : esc(plate.scientific)) : '';
  return `
    <header class="plate-id">
      <p class="kicker">${esc(lesson ? tl(lang, 'Lesson') : tl(lang, 'Plate'))} ${esc(plate.number ?? '')}</p>
      <h2><span${langAttr(names.common)}>${esc(plate.common ?? '')}</span>${plate.commonAlt ? ` <small${langAttr(names.alt)}>${esc(plate.commonAlt)}</small>` : ''}</h2>
      ${sci ? `<p class="sci">${sci}${plate.authority ? ` ${esc(plate.authority)}` : ''}</p>` : ''}
      ${plate.family ? `<p class="family">${esc(plate.family)}</p>` : ''}
    </header>
    ${plate.badge ? `<p class="badge">${esc(plate.badge)}</p>` : ''}
    ${status}
    ${plate.lede ? `<p class="lede">${inline(plate.lede)}</p>` : ''}
    ${(plate.body ?? []).map((p) => `<p>${inline(p)}</p>`).join('')}
    ${steps}${tip}${mistakes}${proportions}
    ${facts ? `<table class="facts">${facts}</table>` : ''}
    ${figure}
    ${lookHTML}
    ${plate.didYouKnow ? `<p class="dyk"><b>${esc(tl(lang, 'Did you know?'))}</b> ${inline(plate.didYouKnow)}</p>` : ''}
    ${sources}`;
}

/** "by Josoroma": the author's mark on a board or the title page, as text. */
function byline(s, lang) {
  const name = s.book?.byline?.name;
  return name ? `<p class="byline">${esc(tl(lang, 'by {author}', { author: name }))}</p>` : '';
}

/** The imprint's fixed lines, as typeset (layouts/front.js imprint: the faces its theme sets, listed alike). */
function imprintLines(s, lang) {
  const T = resolveTheme(s.theme ?? {});
  const f = T.fonts ?? {};
  const fonts = [...new Set([f.display, f.body, f.label, f.mono, T.engraving ? f.condensed : null].filter(Boolean))];
  const listed = lang !== 'en' ? fmtList(fonts, { lang }) : fonts.length <= 1 ? fonts.join('') : `${fonts.slice(0, -1).join(', ')} and ${fonts.at(-1)}`;
  return [
    tl(lang, 'Text, plates and interactive figures are original works made for this edition. Every figure is a living plate: turn it, open it, peel back its layers and take it home as a vector drawing.'),
    tl(lang, 'Set in {fonts}. Typeset, printed and bound live in your browser with Three.js — WebGPU, with a WebGL 2 fallback.', { fonts: listed }),
  ];
}

/**
 * "How this book was made" (the making leaf, layouts/making.js): the prompt
 * that began the series on its recto, this book's brief on its verso, then
 * the closing line on the later prompts. The texts are verbatim, so they
 * are escaped, never parsed as markup; a part not translated yet keeps its
 * English (and says so with lang).
 */
function makingHTML(s, lang) {
  const mk = s.making ?? {};
  const isPrompt = mk.part !== 'brief';
  const part = isPrompt ? mk.prompt : mk.brief;
  if (!part) return '';
  const partLang = (p) => langAttr(p?.lang && p.lang !== lang ? p.lang : null);
  let body = '';
  if (isPrompt) {
    // one paragraph per line; "* " lines are a list; the title line and the section headings stand out
    const heads = new Set(part.headings ?? []);
    let bullets = [];
    const flush = () => {
      if (bullets.length) body += `<ul>${bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
      bullets = [];
    };
    (part.lines ?? []).forEach((ln, i) => {
      if (/^\* /.test(ln)) return void bullets.push(ln.slice(2));
      flush();
      if (!ln) return;
      if (i === part.title) body += `<p><strong>${esc(ln)}</strong></p>`;
      else if (heads.has(i)) body += `<h4>${esc(ln)}</h4>`;
      else body += `<p>${esc(ln)}</p>`;
    });
    flush();
  } else if (part.text) body = `<p>${esc(part.text)}</p>`;
  if (!body) return '';
  const lead = makingLead(mk, isPrompt, lang);
  const note = part.translated ? `<p class="note">${esc(tl(lang, 'Translated from the English original'))}</p>` : '';
  const source = part.source ? `<p class="source"><code>${esc(part.source)}</code></p>` : '';
  const later = !isPrompt && mk.later?.text ? `<p class="later"${partLang(mk.later)}>${esc(mk.later.text)}</p>` : '';
  return `<h2>${esc(tl(lang, 'How this book was made'))}</h2><h3>${esc(isPrompt ? tl(lang, 'The prompt') : tl(lang, 'This book’s brief'))}</h3>${lead}${note}<blockquote${partLang(part)}>${body}</blockquote>${source}${later}`;
}

/** The italic lead above a making text: where it comes from (as layouts/making.js prints it). */
function makingLead(mk, isPrompt, lang) {
  const model = mk.model ?? 'Claude Code';
  let lead;
  if (!isPrompt) lead = tl(lang, 'Each book was then researched, written, fact-checked twice and revised by its own team of agents, from this brief:');
  else if (mk.prompt?.translated) lead = tl(lang, 'The series began with one prompt to {model}, written in English.', { model });
  else lead = tl(lang, 'The series began with one prompt to {model}. It is printed as it was written.', { model });
  return `<p class="lede">${esc(lead)}</p>`;
}

/**
 * HTML for one printed side that is not a plate (a PageSpec from
 * buildSides): boards, title page, front and back matter; '' for endpapers,
 * blanks, the contents list and plates (plateHTML).
 * @param {object} s
 */
export function sideHTML(s) {
  const lang = langOf(s);
  const book = s?.book ?? {};
  const publisher = book.author ? `<p class="publisher">${esc(book.author)}</p>` : '';
  switch (s?.layout) {
    case 'cover':
      return `${book.kicker ? `<p class="kicker">${esc(book.kicker)}</p>` : ''}<h2>${esc(book.title ?? '')}</h2>${book.subtitle ? `<p class="lede">${esc(book.subtitle)}</p>` : ''}${byline(s, lang)}${publisher}`;
    case 'back-cover':
      return `<h2>${esc(book.title ?? '')}</h2>${s.blurb ? `<p class="lede">${inline(s.blurb)}</p>` : ''}${byline(s, lang)}${publisher}`;
    case 'title':
      return `<h2>${esc(book.title ?? '')}</h2>${book.subtitle ? `<p class="lede">${esc(book.subtitle)}</p>` : ''}${byline(s, lang)}`;
    case 'imprint': {
      const author = book.byline?.name ? `<p class="author">${esc(tl(lang, 'Author'))}: ${esc(book.byline.name)}</p>` : '';
      const lines = [book.edition, book.author ? tl(lang, 'Published by {publisher}.', { publisher: book.author }) : '', ...imprintLines(s, lang), ...list(s.imprint), ...list(s.credits)];
      return `<h2>${esc(tl(lang, 'Imprint'))}</h2>${author}${paras(lines)}`;
    }
    case 'intro':
      return s.intro
        ? `<h2>${esc(s.intro.title ?? tl(lang, 'Introduction'))}</h2>${paras(s.intro.paragraphs)}${s.intro.pullQuote ? `<blockquote>${inline(s.intro.pullQuote)}</blockquote>` : ''}`
        : '';
    case 'howto': {
      if (!s.howTo) return '';
      // the legend under the interaction rows (layouts/front.js howto)
      const notes = [
        list(s.legend).length ? tl(lang, 'Conservation status, as assessed on the IUCN Red List.') : null,
        tl(lang, 'Every figure performs a seamless five-second study of how the organism moves, grows or is built.'),
        tl(lang, '“Look closer” items are clickable: each one points to a part on the living figure.'),
      ];
      return `<h2>${esc(s.howTo.title ?? tl(lang, 'How to use this book'))}</h2>${dl(s.howTo.items)}<h3>${esc(tl(lang, 'Reading a plate'))}</h3>${items(notes)}`;
    }
    case 'note':
      return s.note ? `<h2>${esc(s.note.title ?? tl(lang, 'Afterword'))}</h2>${paras(s.note.paragraphs)}` : '';
    case 'sources': {
      const src = items(s.sources, 'ol', 'sources', sourceLang(lang, s.sources));
      const colo = paras(s.colophon);
      return src || colo ? `<h2>${esc(tl(lang, 'Sources'))}</h2>${src}${colo ? `<h3>${esc(tl(lang, 'Colophon'))}</h3>${colo}` : ''}` : '';
    }
    case 'glossary':
      // in the order the page prints them (buildSides sorts them for the edition's language)
      return list(s.glossary).length ? `<h2>${esc(tl(lang, 'Glossary'))}</h2>${dl(s.glossary)}` : '';
    case 'making':
      return makingHTML(s, lang);
    default:
      return '';
  }
}

/**
 * The live-region announcement of a plate: "Plate 3 of 7: Coral, Micrurus nigrocinctus."
 * @param {object} plate
 * @param {number} index  1-based
 * @param {number} total
 * @param {string} [lang] the edition's language
 */
export function plateAnnouncement(plate, index, total, lang = getLang()) {
  if (!plate) return '';
  const kind = plate.layout === 'lesson' ? tl(lang, 'Lesson') : tl(lang, 'Plate');
  const title = `${plate.common ?? ''}${plate.scientific ? `, ${plate.scientific}` : ''}`;
  return tl(lang, '{kind} {number} of {total}: {title}.', { kind, number: plate.number ?? index, total, title });
}
