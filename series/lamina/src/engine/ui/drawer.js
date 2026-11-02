// Contents drawer: the book's table of plates, sliding in from the left.
//
// A modal dialog (focus trapped, Esc closes via createUI, the rest of the
// overlay ignores keys while it is open) laid out like a printed contents
// page: Roman plate numbers in letter-spaced small caps, common names in the
// display serif, binomials in italic. The current plate is highlighted and
// receives focus on open; ↑ ↓ Home End move, Enter opens. Its own words
// (kicker, close, key hints, the list's name) are written by localize();
// the entries arrive in the edition's language (setBook), and a new list
// for the same book (a language switch) keeps the scroll and focused entry.
// An entry may name the page of its spread it is printed on (data-page): its
// goto carries it, so a portrait screen lands on that page ("How this book
// was made" shares the glossary's spread).
import { t } from '../../i18n/index.js';
import { h, trapTab, rovingFocus } from './dom.js';
import { icon } from './icons.js';
import { keyCap } from './shortcuts.js';

export class ContentsDrawer {
  /**
   * @param {object} o
   * @param {string} o.idPrefix
   * @param {(spread: number, page?: 'left'|'right') => void} o.onGoto
   * @param {() => void} o.onRequestClose
   */
  constructor({ idPrefix, onGoto, onRequestClose }) {
    this.onGoto = onGoto;
    this.onRequestClose = onRequestClose;
    this.isOpen = false;
    this.current = -1;
    this.currentPage = '';
    this.returnFocus = null;
    this.contentsLabel = '';
    this.kind = 'Plate';
    const titleId = `${idPrefix}-contents-title`;

    this.kicker = h('p', { class: 'lam-drawer-kicker' });
    this.title = h('h2', { class: 'lam-drawer-title', id: titleId });
    this.sub = h('p', { class: 'lam-drawer-sub' });
    this.closeBtn = h('button', { type: 'button', class: 'lam-btn lam-drawer-close' }, icon('close'));
    this.list = h('ol', { class: 'lam-toc', role: 'list' });
    this.foot = h('p', { class: 'lam-drawer-foot', 'aria-hidden': 'true' });
    this.scrim = h('div', { class: 'lam-scrim lam-drawer-scrim', 'aria-hidden': 'true' });
    this.nav = h('nav', { class: 'lam-drawer-nav' }, this.list);
    this.el = h(
      'aside',
      { class: 'lam-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1', inert: true },
      h('header', { class: 'lam-drawer-head' }, this.kicker, this.title, this.sub, this.closeBtn),
      this.nav,
      this.foot
    );
    this.localize();

    this.scrim.addEventListener('click', () => this.onRequestClose());
    this.closeBtn.addEventListener('click', () => this.onRequestClose());
    this.list.addEventListener('click', (e) => {
      const btn = e.target.closest('.lam-toc-item');
      if (btn) this.onGoto(+btn.dataset.spread, btn.dataset.page || undefined);
    });
    this.el.addEventListener('keydown', (e) => {
      if (trapTab(this.el, e)) return;
      if (e.target.closest('.lam-toc')) rovingFocus(this.items(), e);
      else if (e.target === this.el && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        // opened by pointer: the first arrow press lands on the current plate
        this.currentItem()?.focus();
        e.preventDefault();
      }
    });
  }

  /** The highlighted plate's button, else the first. */
  currentItem() {
    const items = this.items();
    return items.find((b) => b.hasAttribute('aria-current')) ?? items[0] ?? null;
  }

  /** @returns {HTMLButtonElement[]} */
  items() {
    return Array.from(this.list.querySelectorAll('.lam-toc-item'));
  }

  /**
   * The drawer's own words in the current language.
   * @param {{ kind?: 'Plate'|'Lesson' }} [o]  what the book's numbered entries are
   *        (names the list for screen readers: "Plates" or "Lessons")
   */
  localize({ kind = this.kind } = {}) {
    this.kind = kind;
    this.kicker.textContent = this.contentsLabel || t('Contents');
    this.closeBtn.setAttribute('aria-label', t('Close contents'));
    this.nav.setAttribute('aria-label', kind === 'Lesson' ? t('Lessons') : t('Plates'));
    const cap = (k) => h('kbd', { class: 'lam-kbd' }, k);
    this.foot.replaceChildren(
      h('span', null, cap('↑'), cap('↓'), ' ', t('move')),
      h('span', null, cap(keyCap('Enter')), ' ', t('open')),
      h('span', null, cap(keyCap('Esc')), ' ', t('close'))
    );
  }

  /**
   * Fill from the book description.
   * @param {{ title?: string, subtitle?: string, kicker?: string, contentsLabel?: string,
   *           plates?: Array<{ number?: string, title: string, sci?: string, spread: number, page?: 'left'|'right' }> }} book
   */
  setBook(book = {}) {
    this.title.textContent = book.title ?? '';
    this.sub.textContent = book.subtitle ?? '';
    this.sub.hidden = !book.subtitle;
    this.contentsLabel = book.contentsLabel ?? '';
    this.kicker.textContent = this.contentsLabel || t('Contents');
    const plates = book.plates ?? [];
    const items = this.items();
    if (plates.length && items.length === plates.length) {
      // as many entries as before (the same book in another language): each
      // is rewritten in place, so the list keeps its scroll and the focused
      // entry its focus, and nothing reads layout (a language switch)
      plates.forEach((p, i) => this._fill(items[i], p));
      this.setCurrent(this.current, this.currentPage);
      return;
    }
    // open: keep the reader's place and the focused entry (by its place in
    // the list: two entries may share a spread)
    const active = this.isOpen && this.list.contains(document.activeElement) ? document.activeElement.closest('.lam-toc-item') : null;
    const keep = active ? items.indexOf(active) : -1;
    const scroll = this.isOpen ? this.nav.scrollTop : 0;
    this.list.replaceChildren(...plates.map((p) => h('li', null, this._fill(h('button', { type: 'button', class: 'lam-toc-item' }), p))));
    this.setCurrent(this.current, this.currentPage);
    if (!this.isOpen) return;
    this.nav.scrollTop = scroll;
    if (keep >= 0) (this.items()[keep] ?? this.el).focus({ preventScroll: true });
  }

  /** Write one entry: number, name, binomial, and the spread (and page) it opens. */
  _fill(btn, p) {
    btn.dataset.spread = String(p.spread ?? 0);
    if (p.page === 'left' || p.page === 'right') btn.dataset.page = p.page;
    else delete btn.dataset.page;
    const num = h('span', { class: 'lam-toc-num', 'aria-hidden': p.number ? null : 'true' }, p.number ?? '');
    const name = h('span', { class: 'lam-toc-name' }, p.title ?? '');
    if (p.sci) btn.replaceChildren(num, name, h('span', { class: 'lam-toc-sci' }, p.sci));
    else btn.replaceChildren(num, name);
    return btn;
  }

  /**
   * Highlight the entries on `spread` (if any) — on a portrait screen that
   * frames one `page`, only an entry printed there (or one naming no page).
   * @param {number} spread
   * @param {'left'|'right'|''} [page]
   */
  setCurrent(spread, page = '') {
    this.current = spread;
    this.currentPage = page;
    for (const b of this.items()) {
      if (+b.dataset.spread === spread && (!page || !b.dataset.page || b.dataset.page === page)) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    }
  }

  /**
   * @param {HTMLElement|null} returnFocus  element focused again on close
   * @param {{ keyboard?: boolean }} [o]    opened from the keyboard: focus the
   *        current plate; otherwise the drawer itself (no ring under a finger)
   */
  open(returnFocus, { keyboard = false } = {}) {
    if (this.isOpen) return;
    this.isOpen = true;
    this.returnFocus = returnFocus ?? document.activeElement;
    this.el.inert = false;
    this.el.classList.add('is-open');
    this.scrim.classList.add('is-open');
    const current = this.currentItem();
    current?.scrollIntoView?.({ block: 'nearest' });
    (keyboard && current ? current : this.el).focus({ preventScroll: true });
  }

  /**
   * @param {{ restoreFocus?: boolean }} [o]  return focus to the opener
   *        (keyboard users); otherwise focus is released
   */
  close({ restoreFocus = true } = {}) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.remove('is-open');
    this.scrim.classList.remove('is-open');
    const active = document.activeElement;
    const hadFocus = this.el.contains(active);
    this.el.inert = true;
    if (!hadFocus) return;
    if (restoreFocus && this.returnFocus?.isConnected && this.returnFocus !== document.body) {
      this.returnFocus.focus({ preventScroll: true });
    } else active.blur?.();
  }
}
