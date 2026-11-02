// Tiny DOM toolkit for the Lámina UI.
//
// The overlay is plain JavaScript (no framework), so this file gives it a
// terse element builder for HTML and SVG, the focus helpers shared by the
// drawer, reading sheet and popovers (tab trapping, roving focus), and a
// matchMedia wrapper that cleans up after itself.

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Clamp `x` into [a, b]. */
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

function applyAttrs(el, attrs) {
  if (!attrs) return;
  for (const key of Object.keys(attrs)) {
    const v = attrs[key];
    if (v === undefined || v === null || v === false) continue;
    if (key === 'text') el.textContent = String(v);
    else if (key === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (key === 'dataset') Object.assign(el.dataset, v);
    else if (key === 'on') for (const ev of Object.keys(v)) el.addEventListener(ev, v[ev]);
    else if (v === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(v));
  }
}

function appendChildren(el, children) {
  for (const c of children) {
    if (c === undefined || c === null || c === false) continue;
    if (Array.isArray(c)) appendChildren(el, c);
    else el.append(c instanceof Node ? c : String(c));
  }
}

/**
 * Create an HTML element.
 * @param {string} tag
 * @param {Record<string, any>} [attrs]  attributes; special keys: text, style (object),
 *        dataset (object), on (event → listener). `true` sets a boolean attribute,
 *        false/null/undefined skip it.
 * @param {...(Node|string|null|Array)} children
 * @returns {HTMLElement}
 */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  applyAttrs(el, attrs);
  appendChildren(el, children);
  return el;
}

/**
 * Create an SVG element (same signature as h()).
 * @returns {SVGElement}
 */
export function s(tag, attrs, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  applyAttrs(el, attrs);
  appendChildren(el, children);
  return el;
}

export const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Focusable, rendered descendants of `container`, in DOM order.
 * @param {Element} container
 * @returns {HTMLElement[]}
 */
export function focusables(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.closest('[hidden],[inert]') && el.getClientRects().length > 0
  );
}

/**
 * Keep Tab / Shift+Tab cycling inside `container` (modal drawer and sheet).
 * @param {Element} container
 * @param {KeyboardEvent} e
 * @returns {boolean} true when the event was handled
 */
export function trapTab(container, e) {
  if (e.key !== 'Tab') return false;
  const list = focusables(container);
  if (!list.length) {
    e.preventDefault();
    return true;
  }
  const first = list[0];
  const last = list[list.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !container.contains(active))) {
    last.focus();
    e.preventDefault();
    return true;
  }
  if (!e.shiftKey && (active === last || !container.contains(active))) {
    first.focus();
    e.preventDefault();
    return true;
  }
  return false;
}

/**
 * Move focus within `items` with Arrow/Home/End (roving focus for lists and menus).
 * @param {HTMLElement[]} items
 * @param {KeyboardEvent} e
 * @param {{ horizontal?: boolean }} [o]
 * @returns {boolean} true when focus moved
 */
export function rovingFocus(items, e, { horizontal = false } = {}) {
  if (!items.length) return false;
  const prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
  const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';
  const i = items.indexOf(document.activeElement);
  let j = -1;
  if (e.key === nextKey) j = i < 0 ? 0 : (i + 1) % items.length;
  else if (e.key === prevKey) j = i < 0 ? items.length - 1 : (i - 1 + items.length) % items.length;
  else if (e.key === 'Home') j = 0;
  else if (e.key === 'End') j = items.length - 1;
  if (j < 0) return false;
  items[j].focus();
  e.preventDefault();
  return true;
}

/**
 * True when keystrokes belong to the element itself (text fields, sliders…),
 * so global shortcuts must not fire.
 * @param {EventTarget|null} el
 */
export function isEditable(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    return !['button', 'checkbox', 'radio', 'submit', 'reset', 'color', 'file', 'image'].includes(el.type);
  }
  return false;
}

/**
 * Watch a media query.
 * @param {string} query
 * @param {(matches: boolean) => void} fn  called on change
 * @returns {{ readonly matches: boolean, dispose: () => void }}
 */
export function watchMedia(query, fn) {
  const mq = typeof matchMedia === 'function' ? matchMedia(query) : null;
  if (!mq) return { matches: false, dispose() {} };
  const handler = (e) => fn(e.matches);
  mq.addEventListener('change', handler);
  return {
    get matches() {
      return mq.matches;
    },
    dispose: () => mq.removeEventListener('change', handler),
  };
}
