// Reading sheet: the page's text, for views that cannot show it legibly.
//
// Phones and portrait tablets frame a single page (the recto with its living
// figure), and short landscape screens print the verso far too small, so the
// spread's text (plate text, introduction, afterword, glossary, imprint, and
// the figure's loop narration) moves into a paper-coloured bottom sheet set
// in the book's serif. Its header is the text's own title block (kicker,
// name, binomial, family) when it has one — so nothing is printed twice —
// else a plain kicker/title/binomial. It is a modal dialog: focus is
// trapped, Esc closes (via createUI), and it can be dragged down by its
// handle to dismiss. The same text in another language (a language switch
// while it is open) keeps the reader's place: savePlace / restorePlace.
import { t } from '../../i18n/index.js';
import { h, trapTab } from './dom.js';
import { icon } from './icons.js';

const DISMISS_PX = 96; // drag distance that closes the sheet
const DISMISS_VELOCITY = 0.6; // px/ms flick that closes the sheet

export class ReadingSheet {
  /**
   * @param {object} o
   * @param {string} o.idPrefix
   * @param {() => void} o.onRequestClose
   */
  constructor({ idPrefix, onRequestClose }) {
    this.onRequestClose = onRequestClose;
    this.isOpen = false;
    this.returnFocus = null;
    const titleId = `${idPrefix}-reading-title`;

    this.titleId = titleId;
    this.kicker = h('p', { class: 'lam-sheet-kicker' });
    this.title = h('h2', { class: 'lam-sheet-title', id: titleId });
    this.sci = h('p', { class: 'lam-sheet-sci' });
    this.meta = h('div', { class: 'lam-sheet-meta' }, this.kicker, this.title, this.sci);
    this.own = h('div', { class: 'lam-sheet-own', hidden: true }); // the text's own title block
    this.closeBtn = h('button', { type: 'button', class: 'lam-btn lam-sheet-close', 'aria-label': t('Close reading') }, icon('close'));
    this.grab = h('div', { class: 'lam-sheet-grab', 'aria-hidden': 'true' });
    this.head = h('header', { class: 'lam-sheet-head' }, this.meta, this.own, this.closeBtn);
    this.body = h('div', { class: 'lam-sheet-body lam-prose', tabindex: '0' });
    this.scrim = h('div', { class: 'lam-scrim lam-sheet-scrim', 'aria-hidden': 'true' });
    this.el = h(
      'section',
      { class: 'lam-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1', inert: true },
      this.grab,
      this.head,
      this.body
    );

    this.scrim.addEventListener('click', () => this.onRequestClose());
    this.closeBtn.addEventListener('click', () => this.onRequestClose());
    this.el.addEventListener('keydown', (e) => trapTab(this.el, e));
    // a body never scrolled needs no reset for new text (writing scrollTop
    // would lay the new text out at once: setContent runs inside a language switch)
    this.scrolled = false;
    this.body.addEventListener('scroll', () => (this.scrolled = this.body.scrollTop > 0), { passive: true });

    // drag the handle or header down to dismiss
    this.drag = null;
    const down = (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      this.drag = { id: e.pointerId, y0: e.clientY, t0: performance.now(), dy: 0 };
      e.currentTarget.setPointerCapture(e.pointerId);
      this.el.classList.add('is-dragging');
    };
    const move = (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.drag.dy = Math.max(0, e.clientY - this.drag.y0);
      this.el.style.setProperty('--lam-drag', `${this.drag.dy}px`);
    };
    const up = (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const { dy, t0 } = this.drag;
      const v = dy / Math.max(1, performance.now() - t0);
      this.drag = null;
      this.el.classList.remove('is-dragging');
      this.el.style.removeProperty('--lam-drag');
      if (dy > DISMISS_PX || (dy > 24 && v > DISMISS_VELOCITY)) this.onRequestClose();
    };
    for (const el of [this.grab, this.head]) {
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    }
  }

  /**
   * Fallback header (used when the text brings no title block).
   * @param {{ kicker?: string, title?: string, sci?: string }} meta
   *        kicker: e.g. 'Plate II' or 'Lesson I'
   */
  setMeta({ kicker = '', title = '', sci = '' } = {}) {
    this.kicker.textContent = kicker || t('Reading');
    this.title.textContent = title || t('Reading');
    this.sci.textContent = sci;
    this.sci.hidden = !sci;
  }

  /** The sheet's own words in the current language (the fallback header follows via setMeta). */
  localize() {
    this.closeBtn.setAttribute('aria-label', t('Close reading'));
  }

  /**
   * Where the reader is in the text: how far down (as a fraction) and which
   * link, if any, has focus — to put them back after the text is replaced by
   * the same text in another language.
   * @returns {{ ratio: number, focus: string|null }}
   */
  savePlace() {
    const b = this.body;
    const max = b.scrollHeight - b.clientHeight;
    const a = document.activeElement;
    let focus = null;
    if (this.isOpen && this.el.contains(a)) {
      if (a === this.closeBtn) focus = 'close';
      else if (a === b) focus = 'body';
      else if (a.matches?.('a[href]') && b.contains(a)) focus = `a:${a.getAttribute('href')}`;
      else focus = 'dialog';
    }
    return { ratio: max > 0 ? b.scrollTop / max : 0, focus };
  }

  /** @param {{ ratio: number, focus: string|null }|null} place  from savePlace() */
  restorePlace(place) {
    if (!place) return;
    const b = this.body;
    b.scrollTop = place.ratio * Math.max(0, b.scrollHeight - b.clientHeight);
    if (!place.focus || !this.isOpen) return;
    let to = null;
    if (place.focus === 'close') to = this.closeBtn;
    else if (place.focus === 'body') to = b;
    else if (place.focus.startsWith('a:')) {
      const href = place.focus.slice(2);
      to = Array.from(b.querySelectorAll('a[href]')).find((x) => x.getAttribute('href') === href) ?? null;
    }
    (to ?? this.el).focus({ preventScroll: true });
  }

  /**
   * @param {DocumentFragment|null} fragment  sanitized body
   * @param {DocumentFragment|null} [head]    the text's own title block (kicker, h2, .sci, .family)
   */
  setContent(fragment, head = null) {
    this.body.replaceChildren(...(fragment ? [fragment] : []));
    if (this.scrolled) {
      this.body.scrollTop = 0;
      this.scrolled = false;
    }
    this.own.replaceChildren(...(head ? [head] : []));
    const h2 = head ? this.own.querySelector('h2') : null;
    const own = !!this.own.firstChild;
    this.own.hidden = !own;
    this.meta.hidden = own;
    // the dialog is named by whichever title shows
    this.title.removeAttribute('id');
    (h2 ?? this.title).id = this.titleId;
    if (own && !h2) this.title.id = this.titleId; // a block without a name: keep the fallback's for labelling
  }

  /** @param {HTMLElement|null} returnFocus */
  open(returnFocus) {
    if (this.isOpen) return;
    this.isOpen = true;
    this.returnFocus = returnFocus ?? document.activeElement;
    this.el.inert = false;
    this.el.classList.add('is-open');
    this.scrim.classList.add('is-open');
    this.el.focus({ preventScroll: true });
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
