// SVG plate composer: turns traced figure geometry into a printable,
// self-contained plate — figure, numbered key, caption and credit — with no
// external references (fonts fall back to the platform serif/sans).
//
// Layering, bottom to top: paper · ground shadow (clipped to the figure's
// frame) · part fills (base colour, same-colour hairline to close seams) ·
// pattern fills (the part's other colours: rings, saddles, bands) · tone
// shapes (light / shadow) · shadow hatching · ink lines · fold, occlusion and
// part-boundary contours (thin) · silhouette (thicker) · numbered markers on
// short leaders. 'line' mode keeps white fills and ink only — a colouring page
// whose pattern borders are drawn as fine lines.
//
// The plate is in one language (`lang`, on the root as xml:lang and lang so a
// screen reader speaks it right); the texts handed in are already in it, and
// the composer's own words (the fallback title, the description) are looked up.
import { fmt } from './trace.js';
import { tl } from '../../i18n/index.js';

const XML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => XML_ESC[c]);

// ---------------------------------------------------------------- colour

export function hexToRgb(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [168, 161, 150];
}
const toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const srgbToLin = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const linToSrgb = (c) => 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
/** sRGB byte → linear, as a table (the exporter converts every figure pixel). */
const LIN = Float32Array.from({ length: 256 }, (_, i) => srgbToLin(i));

/** Mix two sRGB hex colours in linear light. */
export function mixHex(a, b, t) {
  const A = hexToRgb(a).map(srgbToLin), B = hexToRgb(b).map(srgbToLin);
  return toHex(A.map((v, i) => linToSrgb(v + (B[i] - v) * t)));
}

/**
 * sRGB bytes → OKLab (perceptual: equal steps look equal, so tints and
 * colour distances behave the same for black, red and yellow).
 * @param {number} r 0..255
 * @param {number} g
 * @param {number} b
 * @param {number[]|Float32Array} [out]
 */
export function rgbToOklab(r, g, b, out = [0, 0, 0]) {
  const R = LIN[r | 0], G = LIN[g | 0], B = LIN[b | 0];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  out[0] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  out[1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  out[2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return out;
}

/** OKLab → sRGB hex (clipped to the gamut). */
export function oklabToHex(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return toHex([R, G, B].map((c) => linToSrgb(Math.max(0, Math.min(1, c)))));
}

export const hexToOklab = (hex) => rgbToOklab(...hexToRgb(hex));

/** Mix two sRGB hex colours in OKLab. */
export function mixOklab(a, b, t) {
  const A = hexToOklab(a), B = hexToOklab(b);
  return oklabToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

/**
 * Light / base / shadow fills for a part colour. Tints are mixed in OKLab so
 * the base keeps its hue and chroma: the light band is a small lift towards
 * the paper (black stays black, scarlet stays scarlet), the shadow leans to
 * the ink and a little cool.
 */
export function toneRamp(base, { paper = '#fbf8f1', ink = '#1c1a17' } = {}) {
  return {
    light: mixOklab(base, paper, 0.14),
    base,
    shadow: mixOklab(mixOklab(base, ink, 0.3), '#33405a', 0.08),
  };
}

// ---------------------------------------------------------------- text

/** Greedy word wrap by an average glyph width (no DOM measurement needed). */
function wrap(text, maxWidth, fontSize, glyph = 0.5) {
  return wrapChars(text, Math.max(8, Math.floor(maxWidth / (fontSize * glyph))));
}

function wrapChars(text, maxChars) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (!line) line = w;
    else if ((line + ' ' + w).length <= maxChars) line += ' ' + w;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** *italic* / **bold** → tspans (binomials in captions). */
function richText(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<tspan font-weight="600">$1</tspan>')
    .replace(/\*([^*]+)\*/g, '<tspan font-style="italic">$1</tspan>');
}

/** Markdown emphasis removed (titles, descriptions, metadata). */
export const plainText = (s) => String(s ?? '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');

// ---------------------------------------------------------------- compose

/**
 * @param {object} o
 * @param {'color'|'line'} o.mode
 * @param {number} o.width            page width in px (user units)
 * @param {number[]} o.crop           [x0, y0, x1, y1] figure crop in figure units
 * @param {Array<{ id, name, fill, base, light?, shadow?, lightColor?, shadowColor?, hatch?,
 *                 swatches?: Array<{ name, color, d, light?, shadow?, lightColor?, shadowColor? }> }>} o.parts
 * @param {string[]} o.inner          contour path data (part boundaries, folds, overlaps)
 * @param {string[]} o.silhouette     silhouette path data
 * @param {string[]} [o.patternLines] pattern borders (line mode)
 * @param {Array<{ d, width, color, dashed }>} o.lines  ink line paths
 * @param {Array<{ n, ax, ay, x, y, text, detail, hollow?, mark?, rr? }>} o.labels  numbered markers:
 *        anchor (ax, ay) and disc centre (x, y) in figure units; `mark` 'dot' (default) puts a dot on
 *        the anchor, 'ring' a hairline ring of radius `rr` (+ a 1.5 px gap) round it — the feature
 *        it names (an eye, a pit) stays clear — and 'tick' leaves the anchor bare
 * @param {number} [o.markerRadius]   disc radius in figure units
 * @param {Array<{ d, opacity }>|string} [o.ground]  ground-shadow levels (path data)
 * @param {string} o.title
 * @param {string} [o.caption]
 * @param {string} [o.credit]
 * @param {object} [o.palette]        { paper, ink, muted }
 * @param {'en'|'es'} [o.lang='en']   language of the plate's texts
 * @param {object} [o.meta]           written into <metadata>
 * @returns {string}
 */
export function composePlate(o) {
  const pal = { paper: '#fbf8f1', ink: '#1c1a17', muted: '#7b7466', ...(o.palette ?? {}) };
  const L = o.lang ?? 'en';
  const line = o.mode === 'line';
  const PW = Math.round(o.width);
  const pad = Math.round(PW * 0.07);
  const [cx0, cy0, cx1, cy1] = o.crop;
  const cw = Math.max(1, cx1 - cx0), ch = Math.max(1, cy1 - cy0);
  let k = (PW - pad * 2) / cw;
  const maxFigH = PW * 1.25;
  if (ch * k > maxFigH) k = maxFigH / ch;
  const figW = cw * k, figH = ch * k;
  const fx = (PW - figW) / 2, fy = pad;
  const sw = (px) => fmt(px / k); // stroke widths in figure units

  // caption block
  const textW = PW - pad * 2;
  const titleSize = Math.round(PW * 0.024);
  const capSize = Math.round(PW * 0.0135);
  const keySize = Math.round(PW * 0.0105);
  const creditSize = Math.round(PW * 0.0085);
  let y = fy + figH + Math.round(PW * 0.045);
  const text = [];
  if (o.title) {
    text.push(`<text x="${PW / 2}" y="${y}" text-anchor="middle" font-family="'Cormorant Garamond', 'EB Garamond', Georgia, 'Times New Roman', serif" font-size="${titleSize}" font-style="italic" fill="${pal.ink}">${richText(o.title)}</text>`);
    y += Math.round(titleSize * 0.9);
  }
  if (o.caption) {
    y += Math.round(capSize * 0.6);
    for (const ln of wrap(o.caption, textW * 0.82, capSize, 0.47)) {
      y += Math.round(capSize * 1.45);
      text.push(`<text x="${PW / 2}" y="${y}" text-anchor="middle" font-family="'EB Garamond', Georgia, 'Times New Roman', serif" font-size="${capSize}" fill="${pal.ink}">${richText(ln)}</text>`);
    }
  }
  const labels = o.labels ?? [];
  if (labels.length) {
    // the key: every entry in full, wrapped under a hanging indent (never cut)
    y += Math.round(keySize * 2.2);
    const cols = labels.length > 4 ? 2 : 1;
    const gutter = cols > 1 ? keySize * 2.4 : 0;
    const colW = cols === 1 ? textW * 0.64 : (textW - gutter) / cols;
    const indent = keySize * 1.8;
    // Plex Sans Condensed averages ~0.45 em; the sans fallbacks run wider
    const maxChars = Math.max(16, Math.floor((colW - indent) / (keySize * 0.53)));
    const lineH = Math.round(keySize * 1.5);
    const entryGap = Math.round(keySize * 0.55);
    const entries = labels.map((l) => ({ l, lines: wrapChars(`${l.text}${l.detail ? ` — ${l.detail}` : ''}`, maxChars) }));
    const perCol = Math.ceil(entries.length / cols);
    let colH = 0;
    for (let c = 0; c < cols; c++) {
      const x = pad + (cols === 1 ? textW * 0.18 : c * (colW + gutter));
      let yy = y;
      for (const { l, lines } of entries.slice(c * perCol, (c + 1) * perCol)) {
        const full = `${l.text}${l.detail ? ` — ${l.detail}` : ''}`;
        const tx = x + indent;
        const rows = lines.map((ln, i) => {
          const yl = yy + i * lineH;
          if (i === 0 && ln.startsWith(l.text)) return `<text x="${fmt(tx)}" y="${yl}"><tspan font-weight="600">${esc(l.text)}</tspan>${esc(ln.slice(l.text.length))}</text>`;
          return `<text x="${fmt(tx)}" y="${yl}">${esc(ln)}</text>`;
        });
        text.push(
          `<g class="key" font-family="'IBM Plex Sans Condensed', 'Helvetica Neue', Arial, sans-serif" font-size="${keySize}" fill="${pal.ink}"><title>${esc(full)}</title>` +
            `<circle cx="${fmt(x + keySize * 0.6)}" cy="${fmt(yy - keySize * 0.35)}" r="${fmt(keySize * 0.72)}" fill="#fff" stroke="${pal.ink}" stroke-width="1"/>` +
            `<text x="${fmt(x + keySize * 0.6)}" y="${fmt(yy - keySize * 0.35)}" text-anchor="middle" dominant-baseline="central" font-size="${fmt(keySize * 0.8)}" font-weight="600">${l.n}</text>` +
            rows.join('') + `</g>`,
        );
        yy += lines.length * lineH + entryGap;
      }
      colH = Math.max(colH, yy - y);
    }
    y += colH - entryGap - Math.round(keySize * 0.6);
  }
  if (o.credit) {
    y += Math.round(creditSize * 3);
    text.push(`<text x="${PW / 2}" y="${y}" text-anchor="middle" font-family="'IBM Plex Sans Condensed', 'Helvetica Neue', Arial, sans-serif" font-size="${creditSize}" letter-spacing="${fmt(creditSize * 0.18)}" fill="${pal.muted}">${esc(String(o.credit).toUpperCase())}</text>`);
  }
  const PH = Math.round(y + pad * 0.8);

  // figure layers
  const T = `translate(${fmt(fx)} ${fmt(fy)}) scale(${fmt(k * 1000) / 1000}) translate(${fmt(-cx0)} ${fmt(-cy0)})`;
  const out = [];
  out.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" xml:lang="${esc(L)}" lang="${esc(L)}" viewBox="0 0 ${PW} ${PH}" width="${PW}" height="${PH}" role="img" aria-labelledby="plate-title plate-desc">`);
  out.push(`<title id="plate-title">${esc(plainText(o.title) || tl(L, 'Figure'))}</title>`);
  const kind = line ? tl(L, 'Line art for colouring.') : tl(L, 'Colour plate.');
  out.push(`<desc id="plate-desc">${esc([plainText(o.caption), kind, tl(L, 'Exported from a Lámina living plate.')].filter(Boolean).join(' '))}</desc>`);
  if (o.meta) out.push(`<metadata>${esc(JSON.stringify(o.meta))}</metadata>`);
  const hatchGap = 5.2 / k, hatchW = 0.75 / k;
  const padF = 6 / k;
  out.push(`<defs><pattern id="hatch" patternUnits="userSpaceOnUse" width="${fmt(hatchGap)}" height="${fmt(hatchGap)}" patternTransform="rotate(-38)">` +
    `<line x1="0" y1="0" x2="0" y2="${fmt(hatchGap)}" stroke="${pal.ink}" stroke-width="${fmt(hatchW)}" stroke-opacity="0.32"/></pattern>` +
    `<clipPath id="frame"><rect x="${fmt(cx0 - padF)}" y="${fmt(cy0 - padF)}" width="${fmt(cw + padF * 2)}" height="${fmt(ch + padF * 2)}"/></clipPath></defs>`);
  out.push(`<rect width="${PW}" height="${PH}" fill="${line ? '#ffffff' : pal.paper}"/>`);
  out.push(`<g id="figure" transform="${T}">`);
  // (a plain path string — the earlier form — is one soft level)
  const ground = typeof o.ground === 'string' ? (o.ground ? [{ d: o.ground, opacity: 0.08 }] : []) : o.ground ?? [];
  if (ground.length && !line) {
    out.push(`<g id="ground" clip-path="url(#frame)" fill="${pal.ink}" stroke="none">${ground.map((g) => `<path d="${g.d}" fill-opacity="${fmt(g.opacity * 1000) / 1000}"/>`).join('')}</g>`);
  }
  out.push(`<g id="fills" stroke-linejoin="round" fill-rule="evenodd">`);
  for (const p of o.parts) {
    const fill = line ? '#ffffff' : p.base;
    out.push(`<path id="part-${esc(p.id)}" d="${p.fill}" fill="${fill}" stroke="${fill}" stroke-width="${sw(0.9)}"><title>${esc(p.name)}</title></path>`);
  }
  out.push(`</g>`);
  if (!line) {
    const withSwatches = o.parts.filter((p) => p.swatches?.length);
    if (withSwatches.length) {
      out.push(`<g id="pattern" stroke-linejoin="round" fill-rule="evenodd">`);
      for (const p of withSwatches) {
        for (const s of p.swatches) {
          if (s.d) out.push(`<path class="swatch" data-part="${esc(p.id)}" d="${s.d}" fill="${s.color}" stroke="${s.color}" stroke-width="${sw(0.7)}"><title>${esc(s.name ?? p.name)}</title></path>`);
        }
      }
      out.push(`</g>`);
    }
    out.push(`<g id="tones" fill-rule="evenodd" stroke-linejoin="round">`);
    const tones = (p, s) => {
      if (s.light) out.push(`<path class="light" data-part="${esc(p.id)}" d="${s.light}" fill="${s.lightColor}" stroke="${s.lightColor}" stroke-width="${sw(0.5)}"/>`);
      if (s.shadow) out.push(`<path class="shadow" data-part="${esc(p.id)}" d="${s.shadow}" fill="${s.shadowColor}" stroke="${s.shadowColor}" stroke-width="${sw(0.5)}"/>`);
    };
    for (const p of o.parts) {
      tones(p, p);
      for (const s of p.swatches ?? []) tones(p, s);
    }
    out.push(`</g>`);
    const shadows = [];
    for (const p of o.parts) {
      if (p.hatch === false) continue;
      if (p.shadow) shadows.push(p.shadow);
      for (const s of p.swatches ?? []) if (s.shadow) shadows.push(s.shadow);
    }
    if (shadows.length) out.push(`<g id="hatching" fill="url(#hatch)" fill-rule="evenodd">${shadows.map((d) => `<path d="${d}"/>`).join('')}</g>`);
  } else if (o.patternLines?.length) {
    out.push(`<g id="pattern" fill="none" stroke="${pal.ink}" stroke-width="${sw(0.85)}" stroke-opacity="0.8" stroke-linecap="round" stroke-linejoin="round"><path d="${o.patternLines.join('')}"/></g>`);
  }
  if (o.lines?.length) {
    out.push(`<g id="ink-lines" fill="none" stroke-linecap="round" stroke-linejoin="round">`);
    for (const l of o.lines) {
      const dash = l.dashed ? ` stroke-dasharray="${sw(6)} ${sw(4)}"` : '';
      out.push(`<path d="${l.d}" stroke="${line ? pal.ink : l.color}" stroke-width="${sw(Math.max(0.6, l.width))}"${dash}/>`);
    }
    out.push(`</g>`);
  }
  if (o.inner?.length) out.push(`<g id="contours" fill="none" stroke="${pal.ink}" stroke-width="${sw(line ? 1.6 : 1.15)}" stroke-linecap="round" stroke-linejoin="round"><path d="${o.inner.join('')}"/></g>`);
  if (o.silhouette?.length) out.push(`<g id="silhouette" fill="none" stroke="${pal.ink}" stroke-width="${sw(line ? 2.8 : 2.2)}" stroke-linecap="round" stroke-linejoin="round"><path d="${o.silhouette.join('')}"/></g>`);
  if (labels.length) {
    const r = o.markerRadius ?? Math.max(9, PW * 0.0085) / k;
    const dot = Math.max(r * 0.2, 1.7 / k);
    out.push(`<g id="labels" font-family="'IBM Plex Sans Condensed', 'Helvetica Neue', Arial, sans-serif" text-anchor="middle">`);
    for (const l of labels) {
      const ax = l.ax ?? l.x, ay = l.ay ?? l.y;
      const dx = l.x - ax, dy = l.y - ay;
      const len = Math.hypot(dx, dy);
      // what marks the anchor, and where the leader leaves it: a dot (from
      // its edge); round a face feature, a hairline ring 1.5 px outside it
      // (from the ring) or, too small to ring or a tick, nothing at all (from
      // 2.5 px off) — so an eye, a pit or a nostril is never covered
      const face = !l.hollow && (l.mark === 'ring' || l.mark === 'tick');
      const ring = face && l.mark === 'ring' && (l.rr ?? 0) * k >= 2.5 ? l.rr + 1.5 / k : 0;
      const start = face ? ring || 2.5 / k : dot;
      let leader = '';
      if (len > r + start) {
        // leader from the anchor to the disc's rim, haloed so it reads on any
        // fill — the halo stopping 8 px short of a face feature it points at
        const ux = dx / len, uy = dy / len;
        const ex = l.x - ux * r, ey = l.y - uy * r;
        const d = `M${fmt(ax + ux * start)} ${fmt(ay + uy * start)}L${fmt(ex)} ${fmt(ey)}`;
        const hs = face ? start + 8 / k : start;
        const halo = !face ? d : len - r > hs ? `M${fmt(ax + ux * hs)} ${fmt(ay + uy * hs)}L${fmt(ex)} ${fmt(ey)}` : '';
        leader = (halo ? `<path d="${halo}" stroke="#ffffff" stroke-opacity="0.7" stroke-width="${sw(1.8)}" fill="none"/>` : '') +
          `<path d="${d}" stroke="${pal.ink}" stroke-width="${sw(0.8)}" fill="none"/>`;
      }
      const anchor = l.hollow
        ? `<circle cx="${fmt(ax)}" cy="${fmt(ay)}" r="${fmt(dot)}" fill="#ffffff" stroke="${pal.ink}" stroke-width="${sw(0.8)}"/>`
        : !face ? `<circle cx="${fmt(ax)}" cy="${fmt(ay)}" r="${fmt(dot)}" fill="${pal.ink}" stroke="#ffffff" stroke-width="${sw(0.7)}"/>`
          : ring ? `<circle class="ring" cx="${fmt(ax)}" cy="${fmt(ay)}" r="${fmt(ring)}" fill="none" stroke="${pal.ink}" stroke-opacity="0.75" stroke-width="${sw(1)}"/>` : '';
      out.push(`<g class="marker">${leader}${anchor}<circle cx="${fmt(l.x)}" cy="${fmt(l.y)}" r="${fmt(r)}" fill="#ffffff" stroke="${pal.ink}" stroke-width="${sw(1.1)}"/>` +
        `<text x="${fmt(l.x)}" y="${fmt(l.y)}" dominant-baseline="central" font-size="${fmt(r * 1.15)}" font-weight="600" fill="${pal.ink}">${l.n}</text></g>`);
    }
    out.push(`</g>`);
  }
  out.push(`</g>`);
  out.push(...text);
  out.push(`</svg>`);
  return out.join('\n');
}
