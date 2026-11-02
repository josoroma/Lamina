// Lámina typesetter — every printed side of a book is a canvas drawn here
// (CONTRACTS §6, §7, §13). Public API:
//
//   await loadFonts(theme, { manifest?, layouts?, timeout? })   webfonts ready (timeout-safe)
//   buildSides(edition)  → PageSpec[] (+ .leafCount, .spreads, .plateSpread(n))
//   renderPage(page, { theme, width = 1536, stepDrawer }) → { canvas, hits, overflow, scale, hOverflow }
//
// Rendering is deterministic (seeded noise, no Math.random) and synchronous;
// the only async step is loadFonts. Pages are authored for a 1536 px width
// and scale to any texture width. A page is typeset in its edition's language
// (page.book.locale): its strings, hyphenation and glossary order follow it.
import {
  loadFonts as loadFontFaces, DEFAULT_FONTS, fontString, onFontsChanged, faceKey, manifestGlyphs,
} from './fonts.js';
import { recordGlyphs, withLang } from './text.js';
import { buildSides } from './sides.js';
import { createPage, runLayout, resolveTheme, pageSize, PAGE_ASPECT, BOARD_ASPECT, DESIGN_WIDTH } from './page.js';
import { cover, backCover, endpaper } from './layouts/boards.js';
import { title, imprint, contents, intro, howto } from './layouts/front.js';
import { plateText, plateFigure, figureFrame } from './layouts/plate.js';
import { lessonText, lessonFigure } from './layouts/lesson.js';
import { note, glossary, sources, blank } from './layouts/back.js';
import { making } from './layouts/making.js';
import { emblemGeometry, emblemKind, inkEmblem } from './emblems.js';

export { buildSides, resolveTheme, pageSize, PAGE_ASPECT, BOARD_ASPECT, DESIGN_WIDTH, DEFAULT_FONTS, fontString, onFontsChanged };
export { emblemGeometry, emblemKind, inkEmblem };

/** Layout name → layout function. */
export const LAYOUTS = {
  cover,
  'back-cover': backCover,
  endpaper,
  title,
  imprint,
  contents,
  intro,
  howto,
  'plate-text': plateText,
  'plate-figure': plateFigure,
  'lesson-text': lessonText,
  'lesson-figure': lessonFigure,
  note,
  glossary,
  sources,
  making,
  blank,
};

/**
 * Load the webfonts a theme uses. Resolves when ready or after `timeout` ms
 * (pages then use the Georgia/serif fallback stacks — never blank). With a
 * manifest, only the faces that print a character beyond the Latin subset
 * fetch the subset file for it (see pageGlyphs).
 * @param {object} theme  manifest.theme
 * @param {object} [opts]
 * @param {object} [opts.manifest]
 * @param {string[]} [opts.layouts]  the caller prints only sides with these
 *   layouts (the library: ['cover']): only the faces they set are loaded
 * @param {number} [opts.timeout]
 */
export function loadFonts(theme = {}, opts = {}) {
  const { manifest, layouts } = opts;
  const glyphs = manifest ? pageGlyphs(manifest, theme, layouts) : null;
  return loadFontFaces(theme, { ...opts, glyphs, only: !!(layouts && glyphs?.size) });
}

// Width of the survey's miniature pages: layouts are resolution-independent
// (type and geometry both scale with it), so a small page sets exactly the
// faces and characters of the real one, and its draw ops — where the boards
// measure their titles — cost next to nothing.
const SURVEY_WIDTH = 256;

/**
 * Which faces a book's sides set, and the characters beyond the Latin subset
 * each one sets, from a miniature typeset of those sides (layout and draw ops,
 * no auto-fit). Only the sides holding such a character are typeset (usually
 * none, or one back-matter page), or every side of `layouts`. Null if a side
 * fails: fonts.js then fetches those characters for every face, as before.
 * @returns {Map<string, string> | null}  face key → characters
 */
function pageGlyphs(manifest, theme, layouts) {
  const glyphs = new Map();
  if (!layouts && !manifestGlyphs(manifest)) return glyphs;
  try {
    for (const side of buildSides(manifest)) {
      if (layouts ? !layouts.includes(side.layout) : !manifestGlyphs(side)) continue;
      const P = createPage(side, { theme, width: SURVEY_WIDTH });
      const log = recordGlyphs(() => withLang(P.lang, () => {
        (LAYOUTS[side.layout] ?? blank)(P);
        P.flush();
      }));
      for (const [font, chars] of log) {
        const key = faceKey(font);
        if (!key) continue;
        let s = glyphs.get(key) ?? '';
        for (const ch of chars) if (!s.includes(ch)) s += ch;
        glyphs.set(key, s);
      }
    }
  } catch (e) {
    console.warn('[typeset] glyph survey failed; extended subsets for every face', e);
    return null;
  }
  return glyphs;
}

/**
 * Render one printed side.
 * @param {import('./sides.js').PageSpec} page
 * @param {object} [opts]
 * @param {object} [opts.theme]        manifest.theme (defaults to page.theme)
 * @param {number} [opts.width=1536]   canvas width in px
 * @param {(g: CanvasRenderingContext2D, step: number, box: {x,y,w,h}) => void} [opts.stepDrawer]
 *        draws construction step diagrams on lesson pages (skulls drawStep bound to params)
 * @returns {{ canvas: HTMLCanvasElement, hits: {id: string, rect: number[], action: object}[], overflow: boolean, scale: number,
 *   hOverflow: {what: string, text: string, over: number}[], key: string }}
 *   hit actions: { type: 'goto', spread, plate? (plate rows), page? ('left'|'right': the side of the
 *   spread the entry prints on, for front and back matter) } | { type: 'label', id } | { type: 'layer', id }
 *   hOverflow: single lines still wider than their measure at their smallest size (design px over)
 */
export function renderPage(page, opts = {}) {
  const layout = LAYOUTS[page.layout] ?? blank;
  if (!LAYOUTS[page.layout]) console.warn(`[typeset] unknown layout "${page.layout}" — rendering blank`);
  const P = createPage(page, { theme: opts.theme ?? page.theme, width: opts.width ?? DESIGN_WIDTH, stepDrawer: opts.stepDrawer });
  const { overflow, scale, hOverflow } = withLang(P.lang, () => runLayout(P, layout));
  return { canvas: P.canvas, hits: P.hits.slice(), overflow, scale, hOverflow, key: page.key };
}

/**
 * Where the pop-up figure's footprint centre is printed on a recto figure
 * page, in normalised page coordinates (u from the spine edge, v from the top).
 */
export function figureAnchorUV() {
  const fake = { W: 1, H: 1 };
  const F = figureFrame(fake);
  return { u: F.gx, v: F.gy };
}
