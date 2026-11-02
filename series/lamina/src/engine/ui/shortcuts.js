// Keyboard map for a Lámina book.
//
// The UI binds only "?" (help) and Esc (closing its own overlays). The App
// binds everything else — either by forwarding keydown events to
// ui.runShortcut(e), or by reading SHORTCUTS / matchShortcut itself. The help
// popover is rendered from this same table, so what readers are told and
// what the book does can never drift apart.
//
// Language: the keys are the same in every language; the table keeps its
// English texts (labels, headings, key-cap names, spoken names) as
// dictionary keys, marked with msg() for the string extractor, and the help
// card translates them with t() when it renders. Ids and `keys` are code.
import { t, msg } from '../../i18n/index.js';
import { isEditable } from './dom.js';

/**
 * @typedef {Object} Shortcut
 * @property {string} id         command id: prev, next, play, labels, explode, layer,
 *                               export, fullscreen, contents, reset-view, help
 * @property {string[]} keys     KeyboardEvent.key values that trigger it
 * @property {string[]} display  key caps shown in the help popover (English keys:
 *                               named keys such as Space, Home, PgUp are translated)
 * @property {string} label      what it does (English key; shown through t())
 * @property {'Book'|'Plate'|'Inspect'} group   help-card section (see SHORTCUT_GROUPS)
 * @property {boolean} [repeat]  allow auto-repeat while held
 * @property {boolean} [app]     handled by the App's own keydown (runShortcut
 *                               returns false); listed so the help card is complete
 * @property {string} [spoken]   screen-reader text for the key caps (English key)
 */

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Help-card sections, in order: [group id, heading (English key)]. */
export const SHORTCUT_GROUPS = Object.freeze([
  ['Book', msg('Book')],
  ['Plate', msg('Plate')],
  ['Inspect', msg('While inspecting')],
]);

/** @type {ReadonlyArray<Shortcut>} */
export const SHORTCUTS = Object.freeze([
  { id: 'prev', keys: ['ArrowLeft'], display: ['←'], label: msg('Previous page'), group: 'Book', repeat: true },
  { id: 'next', keys: ['ArrowRight'], display: ['→'], label: msg('Next page'), group: 'Book', repeat: true },
  { id: 'page', keys: ['PageUp', 'PageDown'], display: [msg('PgUp'), msg('PgDn')], label: msg('Previous or next page'), group: 'Book', repeat: true, app: true, spoken: msg('Page Up or Page Down') },
  { id: 'ends', keys: ['Home', 'End'], display: [msg('Home'), msg('End')], label: msg('Title page or last page'), group: 'Book', app: true, spoken: msg('Home or End') },
  { id: 'contents', keys: ['c', 'C'], display: ['C'], label: msg('Contents'), group: 'Book' },
  { id: 'zoom', keys: ['+', '=', '-', '_'], display: ['+', '−'], label: msg('Zoom in or out'), group: 'Book', repeat: true, app: true, spoken: msg('Plus or minus') },
  { id: 'book-tilt', keys: ['ArrowUp', 'ArrowDown'], display: ['↑', '↓'], label: msg('Tilt the book'), group: 'Book', repeat: true, app: true, spoken: msg('Up or down arrow') },
  { id: 'zoom-reset', keys: ['0'], display: ['0'], label: msg('Reset the view'), group: 'Book', app: true },
  { id: 'fullscreen', keys: ['f', 'F'], display: ['F'], label: msg('Full screen'), group: 'Book' },
  { id: 'help', keys: ['?'], display: ['?'], label: msg('Keyboard shortcuts'), group: 'Book' },
  { id: 'play', keys: [' ', 'Spacebar'], display: [msg('Space')], label: msg('Play or pause the animation'), group: 'Plate' },
  { id: 'labels', keys: ['l', 'L'], display: ['L'], label: msg('Show or hide labels'), group: 'Plate' },
  { id: 'explode', keys: ['e', 'E'], display: ['E'], label: msg('Explode or reassemble'), group: 'Plate' },
  { id: 'layer', keys: DIGITS, display: ['1', '9'], label: msg('Toggle a layer'), group: 'Plate', spoken: msg('Keys 1 to 9') },
  { id: 'inspect', keys: ['i', 'I'], display: ['I'], label: msg('Inspect the figure'), group: 'Plate', app: true },
  { id: 'turn-figure', keys: ['[', ']'], display: ['[', ']'], label: msg('Turn the figure 15°'), group: 'Plate', repeat: true, app: true, spoken: msg('Left or right bracket') },
  { id: 'export', keys: ['s', 'S'], display: ['S'], label: msg('Export SVG colour plate'), group: 'Plate' },
  { id: 'reset-view', keys: ['Escape'], display: [msg('Esc')], label: msg('Reset the view'), group: 'Plate' },
  // While inspecting, the App gives the arrows to the figure before page turning
  // sees them, so these rows bind no keys (they would shadow ← → above).
  { id: 'inspect-turn', keys: [], display: ['←', '→'], label: msg('Turn the figure'), group: 'Inspect', app: true, spoken: msg('Left or right arrow') },
  { id: 'inspect-tilt', keys: [], display: ['↑', '↓'], label: msg('Tilt the view'), group: 'Inspect', app: true, spoken: msg('Up or down arrow') },
]);

/**
 * Key caps that are words (translated to the names printed on local
 * keyboards); symbols, letters and digits are shown as they are.
 */
const NAMED_CAPS = new Set([msg('PgUp'), msg('PgDn'), msg('Home'), msg('End'), msg('Space'), msg('Esc'), msg('Enter')]);

/**
 * A key cap as shown to the reader: named keys in the current language
 * ('Space' → 'Espacio'), anything else unchanged.
 * @param {string} cap
 * @returns {string}
 */
export const keyCap = (cap) => (NAMED_CAPS.has(cap) ? t(cap) : cap);

const BY_KEY = new Map();
for (const sc of SHORTCUTS) for (const k of sc.keys) BY_KEY.set(k, sc);

/**
 * Match a keydown event to a shortcut. Ignores Ctrl/⌘/Alt chords, keys typed
 * into editable controls, and auto-repeat (except page turning).
 * @param {KeyboardEvent} e
 * @param {{ anyTarget?: boolean }} [o]  anyTarget: the caller already knows the
 *        focused control does not use this key (e.g. a digit on a slider)
 * @returns {{ id: string, n?: number, shortcut: Shortcut } | null}
 *          n = 0-based layer index for the 'layer' shortcut
 */
export function matchShortcut(e, { anyTarget = false } = {}) {
  if (!e || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return null;
  if (!anyTarget && isEditable(e.target)) return null;
  let key = e.key;
  // Digits by physical key too, so layer toggles work on AZERTY and the numpad.
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code ?? '');
  if (m && !BY_KEY.has(key)) key = m[1];
  const sc = BY_KEY.get(key);
  if (!sc) return null;
  if (e.repeat && !sc.repeat) return null;
  if (sc.id === 'layer') return { id: 'layer', n: DIGITS.indexOf(key), shortcut: sc };
  return { id: sc.id, shortcut: sc };
}
