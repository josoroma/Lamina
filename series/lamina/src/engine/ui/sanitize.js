// Whitelist HTML sanitizer for reading text.
//
// The App passes plate text as HTML (italic binomials, bold terms, fact
// lists). It is meant to be sanitized already, but the UI inserts it into the
// live document, so we sanitize again as defence in depth: parse in an inert
// document (no scripts run, nothing loads), keep a small set of prose
// elements and attributes, unwrap anything unknown, drop anything dangerous.

// (CODE: source paths, e.g. under the prompt printed on "How this book was made")
const ALLOWED = new Set([
  'P', 'BR', 'HR', 'EM', 'I', 'STRONG', 'B', 'SMALL', 'SUP', 'SUB', 'SPAN', 'ABBR', 'CITE', 'Q',
  'CODE', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'DL', 'DT', 'DD', 'BLOCKQUOTE', 'FIGURE',
  'FIGCAPTION', 'SECTION', 'HEADER', 'FOOTER', 'ASIDE', 'DIV', 'A', 'TABLE', 'CAPTION', 'THEAD',
  'TBODY', 'TR', 'TH', 'TD',
]);

// Removed with their content.
const DROP = new Set([
  'SCRIPT', 'STYLE', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'LINK', 'META', 'BASE',
  'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'SVG', 'MATH', 'CANVAS', 'VIDEO', 'AUDIO', 'IMG',
  'PICTURE', 'SOURCE', 'FRAME', 'FRAMESET', 'TITLE', 'HEAD',
]);

const GLOBAL_ATTRS = new Set(['class', 'lang', 'title', 'dir']);
const TAG_ATTRS = {
  A: new Set(['href']),
  TD: new Set(['colspan', 'rowspan']),
  TH: new Set(['colspan', 'rowspan', 'scope']),
  OL: new Set(['start', 'reversed']),
};
const SAFE_HREF = /^(?:https?:|mailto:|#)/i;

function clean(node) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3) continue; // text
    if (child.nodeType !== 1) {
      child.remove(); // comments, processing instructions
      continue;
    }
    const tag = child.tagName.toUpperCase();
    if (DROP.has(tag)) {
      child.remove();
      continue;
    }
    clean(child);
    if (!ALLOWED.has(tag)) {
      child.replaceWith(...Array.from(child.childNodes)); // unwrap
      continue;
    }
    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      const ok = GLOBAL_ATTRS.has(name) || TAG_ATTRS[tag]?.has(name);
      if (!ok) child.removeAttribute(attr.name);
    }
    if (tag === 'A') {
      const href = (child.getAttribute('href') ?? '').trim();
      if (!SAFE_HREF.test(href)) child.removeAttribute('href');
      else if (!href.startsWith('#')) {
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer');
      }
    }
  }
}

/**
 * Sanitize an HTML string into a fragment that is safe to insert.
 * @param {string} html
 * @returns {DocumentFragment}
 */
export function sanitizeHTML(html) {
  const frag = document.createDocumentFragment();
  if (!html) return frag;
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${String(html)}`, 'text/html');
  clean(doc.body);
  for (const n of Array.from(doc.body.childNodes)) frag.append(document.importNode(n, true));
  return frag;
}
