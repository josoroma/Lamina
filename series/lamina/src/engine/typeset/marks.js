// Author marks: wordmarks drawn from their SVG path data with Path2D, so a
// mark prints crisply at any texture size, into a foil mask (one colour) or
// on paper in its own colours, with no image to load and no async step (it
// works in an OffscreenCanvas too).
//
// The data is public/author/<id>.svg verbatim: each path's `d`, its role
// (the letters, `primary`; the final a, `accent`) and the two colours. The
// validator compares this table with the SVG, so edit the SVG, then copy.
// The SVG draws its paths at scale(5) in a 1000 × 200 viewBox; `ink` is the
// box the paths cover in viewBox units (control points included), which is
// what a layout positions and sizes: the mark is 6.5 : 1.

export const AUTHOR_MARKS = {
  josoroma: {
    name: 'Josoroma',
    source: 'public/author/josoroma.svg',
    viewBox: [0, 0, 1000, 200],
    scale: 5,
    ink: { x0: 20.5, y0: 25.5, x1: 976, y1: 172.5 },
    colors: { primary: '#c92b60', accent: '#087fa9' },
    paths: [
      { role: 'primary', d: 'M26.8 5.8C26.8 5.3 26.4 5.1 25.9 5.3C22.3 6.5 20.8 9.1 20.8 12.8V21.2C20.8 26.3 17.8 29.1 12.8 29.1H9.1C6.2 29.1 4.3 31.0 4.1 33.7C4.1 34.0 4.3 34.2 4.7 34.2H12.9C21.6 34.2 26.8 29.2 26.8 21.1Z' },
      { role: 'primary', d: 'M40.4 12.5C33.9 12.5 29.3 17.2 29.3 23.5C29.3 29.8 33.9 34.5 40.4 34.5C46.9 34.5 51.5 29.8 51.5 23.5C51.5 17.2 46.9 12.5 40.4 12.5ZM40.4 18.0C43.6 18.0 45.9 20.3 45.9 23.5C45.9 26.7 43.6 29.0 40.4 29.0C37.2 29.0 34.9 26.7 34.9 23.5C34.9 20.3 37.2 18.0 40.4 18.0Z' },
      { role: 'primary', d: 'M68.0 14.4C65.8 13.1 63.6 12.5 61.0 12.5C55.9 12.5 52.4 15.2 52.4 19.3C52.4 23.2 55.3 24.7 59.4 25.7L61.4 26.2C63.1 26.6 63.8 27.1 63.8 27.9C63.8 28.9 62.8 29.5 61.1 29.5C58.5 29.5 56.0 28.5 53.8 26.9C53.5 26.7 53.2 26.8 53.0 27.1L51.1 30.4C50.9 30.7 51.0 31.0 51.3 31.2C54.0 33.4 57.5 34.5 61.0 34.5C66.3 34.5 69.7 31.8 69.7 27.5C69.7 23.7 67.0 22.1 62.8 21.1L60.6 20.6C58.9 20.2 58.2 19.7 58.2 18.9C58.2 18.0 59.2 17.5 60.8 17.5C62.7 17.5 64.4 18.0 66.2 19.0C66.5 19.2 66.8 19.1 67.0 18.8L68.2 15.1C68.4 14.8 68.3 14.6 68.0 14.4Z' },
      { role: 'primary', d: 'M81.8 12.5C75.3 12.5 70.7 17.2 70.7 23.5C70.7 29.8 75.3 34.5 81.8 34.5C88.3 34.5 92.9 29.8 92.9 23.5C92.9 17.2 88.3 12.5 81.8 12.5ZM81.8 18.0C85.0 18.0 87.3 20.3 87.3 23.5C87.3 26.7 85.0 29.0 81.8 29.0C78.6 29.0 76.3 26.7 76.3 23.5C76.3 20.3 78.6 18.0 81.8 18.0Z' },
      { role: 'primary', d: 'M100.2 33.4V23.5C100.2 20.3 102.1 18.4 105.4 18.4H107.4C107.7 18.4 107.9 18.2 107.9 17.9V13.4C107.9 13.1 107.7 12.9 107.4 12.9H105.1C98.5 12.9 94.5 16.9 94.5 23.4V33.4C94.5 33.8 94.7 34.0 95.1 34.0H99.6C100.0 34.0 100.2 33.8 100.2 33.4Z' },
      { role: 'primary', d: 'M119.4 12.5C112.9 12.5 108.3 17.2 108.3 23.5C108.3 29.8 112.9 34.5 119.4 34.5C125.9 34.5 130.5 29.8 130.5 23.5C130.5 17.2 125.9 12.5 119.4 12.5ZM119.4 18.0C122.6 18.0 124.9 20.3 124.9 23.5C124.9 26.7 122.6 29.0 119.4 29.0C116.2 29.0 113.9 26.7 113.9 23.5C113.9 20.3 116.2 18.0 119.4 18.0Z' },
      { role: 'primary', d: 'M133.0 33.4V22.9C133.0 16.7 137.0 12.5 142.8 12.5C146.1 12.5 148.6 13.8 150.4 15.9C152.2 13.8 154.7 12.5 158.0 12.5C163.8 12.5 167.8 16.7 167.8 22.9V33.4C167.8 33.8 167.6 34.0 167.2 34.0H162.7C162.3 34.0 162.1 33.8 162.1 33.4V23.0C162.1 19.8 160.6 18.0 158.0 18.0C155.4 18.0 153.3 19.8 153.3 23.0V33.4C153.3 33.8 153.1 34.0 152.7 34.0H148.2C147.8 34.0 147.6 33.8 147.6 33.4V23.0C147.6 19.8 145.4 18.0 142.8 18.0C140.2 18.0 138.7 19.8 138.7 23.0V33.4C138.7 33.8 138.5 34.0 138.1 34.0H133.6C133.2 34.0 133.0 33.8 133.0 33.4Z' },
      { role: 'accent', d: 'M183.6 11.7C176.8 11.7 171.9 16.5 171.9 23.1C171.9 29.6 176.8 34.0 183.6 34.0H194.6C195.0 34.0 195.2 33.8 195.2 33.4V23.1C195.2 16.5 190.3 11.7 183.6 11.7ZM183.6 17.3C187.1 17.3 189.5 19.7 189.5 23.1V28.5H183.6C180.1 28.5 177.6 26.3 177.6 23.1C177.6 19.7 180.1 17.3 183.6 17.3Z' },
    ],
  },
};

const compiled = new Map(); // id → Path2D[] (built on first use: Path2D is a browser API)

/** Ink aspect (width / height) of a mark; 0 for an unknown id. */
export function markAspect(id) {
  const m = AUTHOR_MARKS[id];
  return m ? (m.ink.x1 - m.ink.x0) / (m.ink.y1 - m.ink.y0) : 0;
}

/**
 * Draw an author mark so that its ink is `width` px wide with its top at
 * `top`, centred on `cx` (or starting at `x`).
 * @param {CanvasRenderingContext2D} g
 * @param {string} id          AUTHOR_MARKS key (manifest byline.mark)
 * @param {object} o
 * @param {number} [o.cx]      horizontal centre of the ink
 * @param {number} [o.x]       left edge of the ink (when cx is not given)
 * @param {number} o.top       top of the ink
 * @param {number} o.width     ink width in px
 * @param {string|null} [o.color]  one colour for every path (a foil mask draws '#fff'); null = the mark's own colours
 * @returns {{ w: number, h: number } | null}  the ink size drawn (null for an unknown id)
 */
export function drawAuthorMark(g, id, { cx, x, top, width, color = null }) {
  const m = AUTHOR_MARKS[id];
  if (!m || !(width > 0)) return null;
  let paths = compiled.get(id);
  if (!paths) {
    paths = m.paths.map((p) => new Path2D(p.d));
    compiled.set(id, paths);
  }
  const s = width / (m.ink.x1 - m.ink.x0); // px per viewBox unit
  const left = cx != null ? cx - width / 2 : x ?? 0;
  g.save();
  g.translate(left - m.ink.x0 * s, top - m.ink.y0 * s);
  g.scale(s * m.scale, s * m.scale);
  m.paths.forEach((p, i) => {
    g.fillStyle = color ?? m.colors[p.role] ?? m.colors.primary;
    g.fill(paths[i], 'evenodd');
  });
  g.restore();
  return { w: width, h: (m.ink.y1 - m.ink.y0) * s };
}
