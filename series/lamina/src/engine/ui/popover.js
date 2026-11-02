// Anchored popovers for the toolbar (layers, export) and the help card.
//
// One primitive with three jobs: place itself against its trigger (above the
// toolbar, or below a top-bar button), keep aria-expanded and focus honest
// (focus moves in when opened from the keyboard, returns to the trigger on
// close), and dock as a full-width sheet just above the toolbar on phones.
// A popover that controls the figure (layers & dissection) keeps off it: on
// wide screens it moves beside the figure (over the verso first), on phones
// it stops short of the figure's foot when there is room.
// Light dismiss (outside press, Esc, focus leaving) is coordinated by
// createUI so only one popover is ever open.
import { h, clamp, focusables } from './dom.js';

/** Least height (px) worth capping a popover to above the figure's foot. */
const MIN_ROOM = 200;
/** … on phones, where the layers popover leads with its Explode and Moment sliders. */
const MIN_ROOM_COMPACT = 150;

export class Popover {
  /**
   * @param {object} o
   * @param {string} o.id
   * @param {string} [o.label]           accessible name (or later: setLabel)
   * @param {'dialog'|'menu'} [o.role]
   * @param {'top'|'bottom'} [o.placement]  above (toolbar) or below (top bar) the trigger
   * @param {number} [o.width]           CSS px on wide screens
   * @param {string} [o.className]
   * @param {boolean} [o.avoidFigure]    keep off the figure (frame.avoid / frame.page)
   */
  constructor({ id, label = '', role = 'dialog', placement = 'top', width = 304, className = '', avoidFigure = false }) {
    this.id = id;
    this.role = role;
    this.placement = placement;
    this.width = width;
    this.avoidFigure = avoidFigure;
    this.trigger = null;
    this.isOpen = false;
    this.el = h('div', {
      class: `lam-pop${className ? ' ' + className : ''}`,
      id,
      role,
      'aria-label': label || null,
      tabindex: '-1',
      inert: true,
    });
  }

  /** @param {string} label  accessible name (in the current language) */
  setLabel(label) {
    this.el.setAttribute('aria-label', label);
  }

  /**
   * Open against `trigger`.
   * @param {HTMLElement} trigger
   * @param {{ keyboard?: boolean, frame: { vw: number, vh: number, compact: boolean, barTop: number } }} o
   *        keyboard: opened from the keyboard → focus the first control
   */
  open(trigger, { keyboard = false, frame }) {
    this.trigger = trigger;
    this.isOpen = true;
    this.el.inert = false;
    trigger?.setAttribute('aria-expanded', 'true');
    this.place(frame);
    this.el.classList.add('is-open');
    const first = keyboard ? focusables(this.el)[0] : null;
    (first ?? this.el).focus({ preventScroll: true });
  }

  /**
   * Close. If focus was inside, it returns to the trigger for keyboard users
   * (`restoreFocus`) and is released otherwise, so a later Space reaches the
   * App instead of re-activating a stale button.
   * @param {{ restoreFocus?: boolean }} [o]
   */
  close({ restoreFocus = false } = {}) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.remove('is-open');
    this.trigger?.setAttribute('aria-expanded', 'false');
    const active = document.activeElement;
    const hadFocus = this.el.contains(active);
    this.el.inert = true;
    if (hadFocus || (restoreFocus && active === document.body)) {
      if (restoreFocus && this.trigger?.isConnected) this.trigger.focus({ preventScroll: true });
      else if (hadFocus) active.blur?.();
    }
  }

  /**
   * Position against the trigger (call on open and on resize).
   * @param {{ vw: number, vh: number, compact: boolean, barTop: number,
   *           avoid?: {x0:number,y0:number,x1:number,y1:number,ok:boolean,app?:boolean},
   *           page?: {x:number,y:number,w:number,h:number,ok:boolean} }} f
   *        avoid: the figure's screen rect; page: the recto's
   */
  place(f) {
    if (!this.trigger) return;
    const r = this.trigger.getBoundingClientRect();
    const st = this.el.style;
    const cx = r.left + r.width / 2;
    if (this.placement === 'top') {
      const W = f.compact ? f.vw - 20 : Math.min(this.width, f.vw - 24);
      let left = f.compact ? 10 : clamp(cx - W / 2, 12, f.vw - 12 - W);
      const anchorTop = Math.min(r.top, f.barTop);
      let maxH = Math.max(160, Math.round(anchorTop - 22));
      const a = this.avoidFigure ? keepOut(f) : null;
      if (a) {
        const H = Math.min(this.el.scrollHeight, maxH); // natural height
        const covers = (x) => anchorTop - 10 - H < a.y1 + 8 && x < a.x1 + 8 && x + W > a.x0 - 8;
        if (covers(left) && !f.compact) {
          // beside the figure: over the verso first, then right of it, then the left edge
          const pageX = f.page?.ok ? f.page.x : a.x0;
          for (const x of [Math.min(a.x0, pageX) - 12 - W, a.x1 + 12, 12]) {
            if (x >= 12 && x + W <= f.vw - 12 && !covers(x)) {
              left = x;
              break;
            }
          }
        }
        if (covers(left)) {
          // no room beside it: stop short of the figure's foot, or stay low. A
          // phone's popover leads with its two sliders (about 140 px), so a
          // shorter one still does its job there without covering the figure.
          const room = Math.round(anchorTop - 10 - (a.y1 + 12));
          maxH = room >= (f.compact ? MIN_ROOM_COMPACT : MIN_ROOM) ? room : Math.min(maxH, Math.round(f.vh * 0.44));
        }
      }
      st.width = `${W}px`;
      st.left = `${Math.round(left)}px`;
      st.top = 'auto';
      st.bottom = `${Math.round(f.vh - anchorTop + 10)}px`;
      st.maxHeight = `${maxH}px`;
      st.setProperty('--lam-origin', `${Math.round(clamp(cx - left, 0, W))}px 100%`);
    } else {
      const W = Math.min(this.width, f.vw - 24);
      const left = clamp(r.right - W, 12, f.vw - 12 - W);
      const top = r.bottom + 10;
      st.width = `${W}px`;
      st.left = `${left}px`;
      st.bottom = 'auto';
      st.top = `${Math.round(top)}px`;
      st.maxHeight = `${Math.max(160, Math.round(f.barTop - top - 12))}px`;
      st.setProperty('--lam-origin', `${Math.round(cx - left)}px 0`);
    }
  }
}

/**
 * A figure stands inside its page's printed plate mark, which ends at about
 * this fraction of the page's height (the caption and folio print below it).
 */
const PLATE_FOOT = 0.8;

/**
 * What the popover should keep off: the App's figure rectangle; on wide
 * screens without one, the recto (the figure stands there); on phones, the
 * anchors' envelope, else (labels off: no anchors, no rectangle) the recto's
 * plate area, so the docked popover still stops above the figure's foot.
 */
function keepOut(f) {
  const a = f.avoid;
  if (a?.ok && (a.app || f.compact)) return a;
  const p = f.page;
  if (!p?.ok) return null;
  return { x0: p.x, y0: p.y, x1: p.x + p.w, y1: p.y + p.h * (f.compact ? PLATE_FOOT : 1) };
}
