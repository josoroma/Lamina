// Inline SVG icons for the Lámina UI.
//
// Drawn for this project on a 20 px grid with 1.5 px round strokes so the
// toolbar reads as one quiet family; no icon font and no network request.
// icon(name) returns a fresh <svg> that inherits currentColor, so state
// colours (pressed, disabled, accent) come from CSS alone.
import { s } from './dom.js';

const FILL = 'fill="currentColor" stroke="none"';

/** Path markup per icon (viewBox 0 0 20 20). */
const PATHS = {
  menu: '<path d="M3.75 5.75h12.5M3.75 10h12.5M3.75 14.25h7.5"/>',
  prev: '<path d="M12.25 4.5 6.75 10l5.5 5.5"/>',
  next: '<path d="m7.75 4.5 5.5 5.5-5.5 5.5"/>',
  play: `<path ${FILL} d="M7.6 6.05v7.9c0 .58.63.94 1.13.64l6.4-3.95a.75.75 0 0 0 0-1.28l-6.4-3.95c-.5-.3-1.13.06-1.13.64Z"/>`,
  pause: `<rect ${FILL} x="6.5" y="5.75" width="2.6" height="8.5" rx=".9"/><rect ${FILL} x="10.9" y="5.75" width="2.6" height="8.5" rx=".9"/>`,
  stop: `<rect ${FILL} x="5.75" y="5.75" width="8.5" height="8.5" rx="1"/>`,
  layers: '<path d="M10 3.4 16.9 7.2 10 11 3.1 7.2Z"/><path d="m3.1 10.6 6.9 3.8 6.9-3.8"/><path d="m3.1 13.8 6.9 3.8 6.9-3.8" opacity=".5"/>',
  export: '<path d="M10 3.5v9M6.4 9.1 10 12.7l3.6-3.6"/><path d="M3.75 13.25v1.5c0 .97.78 1.75 1.75 1.75h9c.97 0 1.75-.78 1.75-1.75v-1.5"/>',
  headphones: '<path d="M3.5 11V9a6.5 6.5 0 0 1 13 0v2"/><rect x="2.75" y="9.5" width="3.5" height="6.5" rx="1.5"/><rect x="13.75" y="9.5" width="3.5" height="6.5" rx="1.5"/>',
  soundOn: '<path d="M3.75 8.1h2.4L9.6 5v10l-3.45-3.1h-2.4Z"/><path d="M12.6 7.6a3.4 3.4 0 0 1 0 4.8M14.9 5.3a6.6 6.6 0 0 1 0 9.4"/>',
  soundOff: '<path d="M3.75 8.1h2.4L9.6 5v10l-3.45-3.1h-2.4Z"/><path d="m12.75 8 4 4m0-4-4 4"/>',
  fullscreen: '<path d="M3.75 7.5V3.75H7.5M12.5 3.75h3.75V7.5M16.25 12.5v3.75H12.5M7.5 16.25H3.75V12.5"/>',
  fullscreenExit: '<path d="M7.5 3.75V7.5H3.75M16.25 7.5H12.5V3.75M12.5 16.25V12.5h3.75M3.75 12.5H7.5v3.75"/>',
  back: '<path d="M16 10H4.25M8.6 5.6 4.2 10l4.4 4.4"/>',
  keyboard:
    '<rect x="2.75" y="5.25" width="14.5" height="9.5" rx="2"/><path d="M6.6 11.75h6.8"/><path d="M5.6 8.4h.01M8.2 8.4h.01M10.8 8.4h.01M13.4 8.4h.01" stroke-width="1.9"/>',
  close: '<path d="m5.5 5.5 9 9m0-9-9 9"/>',
  book: '<path d="M10 5.6C8.4 4.4 6.2 3.9 3.5 4.1v11c2.7-.2 4.9.3 6.5 1.5 1.6-1.2 3.8-1.7 6.5-1.5v-11c-2.7-.2-4.9.3-6.5 1.5Z"/><path d="M10 5.6v11"/>',
  tag: '<path d="M3.75 4.9v4.3c0 .4.16.78.44 1.06l5.6 5.6c.59.59 1.54.59 2.12 0l3.97-3.97c.59-.59.59-1.54 0-2.12l-5.6-5.6a1.5 1.5 0 0 0-1.06-.44H4.9c-.64 0-1.15.52-1.15 1.15Z"/><path d="M7 7.1h.01" stroke-width="2.2"/>',
  explode: '<path d="M7.6 4.3a5.75 5.75 0 0 0 0 11.4Z"/><path d="M12.4 4.3a5.75 5.75 0 0 1 0 11.4Z"/>',
  clock: '<circle cx="10" cy="10" r="6.75"/><path d="M10 6.4V10l2.4 1.6"/>',
  pencil: '<path d="M12.7 4.3a1.9 1.9 0 0 1 2.7 2.7l-8.3 8.3-3.6.9.9-3.6Z"/><path d="m11.4 5.6 2.7 2.7"/>',
  image: '<rect x="3.25" y="4.25" width="13.5" height="11.5" rx="2"/><path d="m3.6 13.9 3.9-3.9 2.8 2.8 1.8-1.8 4 4"/><circle cx="12.9" cy="7.9" r="1.2"/>',
  swatch:
    '<circle cx="7.4" cy="8.1" r="3.4" fill="#9e2b25" stroke="none" opacity=".92"/><circle cx="12.6" cy="8.1" r="3.4" fill="#c9a44c" stroke="none" opacity=".9"/><circle cx="10" cy="12.4" r="3.4" fill="#3f6b45" stroke="none" opacity=".88"/>',
  info: '<circle cx="10" cy="10" r="6.75"/><path d="M10 9.2v4.1M10 6.75h.01"/>',
};

/**
 * Create an icon element.
 * @param {keyof typeof PATHS} name
 * @param {{ size?: number, className?: string }} [o]
 * @returns {SVGSVGElement}
 */
export function icon(name, { size = 20, className = '' } = {}) {
  const el = s('svg', {
    class: `lam-icon lam-i-${name}${className ? ' ' + className : ''}`,
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.5',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  el.innerHTML = PATHS[name] ?? '';
  return el;
}

/** Names of every icon in the set (for docs and the harness). */
export const ICON_NAMES = Object.freeze(Object.keys(PATHS));
