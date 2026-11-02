// Printed ornament and page furniture drawn as vector paths: rules, fleurons,
// plate marks, chips, badges, checkboxes, leader dots, icons, the ground
// "stage" mark under a pop-up figure and the scale bar.
//
// Everything is paths (no glyph fonts), so ornaments are crisp at any
// texture size and identical on every machine. Sizes are in canvas px; the
// caller passes them already scaled.
import { rgba, mix, luminance } from './util.js';
import { msg } from '../../i18n/index.js';

const TAU = Math.PI * 2;

/** Rounded-rectangle path. */
export function roundRectPath(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.arcTo(x + w, y, x + w, y + r, r);
  g.lineTo(x + w, y + h - r);
  g.arcTo(x + w, y + h, x + w - r, y + h, r);
  g.lineTo(x + r, y + h);
  g.arcTo(x, y + h, x, y + h - r, r);
  g.lineTo(x, y + r);
  g.arcTo(x, y, x + r, y, r);
  g.closePath();
}

/** Straight rule. */
export function rule(g, x1, y, x2, color, width = 1) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(x1, y);
  g.lineTo(x2, y);
  g.stroke();
}

/** Swelled rule: a thin lens, thickest in the middle, tapering to points. */
export function swelledRule(g, x1, x2, y, thick, color) {
  const mx = (x1 + x2) / 2;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x1, y);
  g.quadraticCurveTo(mx, y - thick, x2, y);
  g.quadraticCurveTo(mx, y + thick, x1, y);
  g.fill();
}

/** Half-swelled rule: thick at `xThick`, point at `xThin`. */
function taperRule(g, xThick, xThin, y, thick, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(xThick, y - thick / 2);
  g.quadraticCurveTo((xThick + xThin) / 2, y - thick * 0.35, xThin, y);
  g.quadraticCurveTo((xThick + xThin) / 2, y + thick * 0.35, xThick, y + thick / 2);
  g.closePath();
  g.fill();
}

// ------------------------------------------------------------------ fleurons

/**
 * Draw a fleuron centred at (cx, cy).
 * @param {'hedera'|'lozenge'|'sprig'|'cross'|'scale'} kind
 * @param {number} size  overall height in px
 */
export function fleuron(g, kind, cx, cy, size, color, paper = '#ffffff') {
  g.save();
  g.translate(cx, cy);
  const s = size / 2;
  g.fillStyle = color;
  g.strokeStyle = color;
  if (kind === 'hedera') {
    // aldine ivy leaf pointing right, curled stem on the left
    g.scale(s, s);
    heartPath(g);
    g.fill();
    g.lineWidth = 0.09;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-0.52, 0);
    g.bezierCurveTo(-0.95, 0.06, -1.25, -0.2, -1.12, -0.48);
    g.bezierCurveTo(-1.02, -0.66, -0.82, -0.6, -0.86, -0.44);
    g.stroke();
    g.strokeStyle = paper;
    g.lineWidth = 0.07;
    g.beginPath();
    g.moveTo(-0.42, 0);
    g.quadraticCurveTo(0.2, -0.05, 0.72, 0);
    g.stroke();
  } else if (kind === 'sprig') {
    // a small botanical sprig: arched stem, paired leaves, a bud
    g.scale(s, s);
    g.lineWidth = 0.08;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-1.25, 0.25);
    g.quadraticCurveTo(0, -0.25, 1.25, 0.25);
    g.stroke();
    const leaf = (x, y, a, l) => {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(l * 0.5, -l * 0.32, l, 0);
      g.quadraticCurveTo(l * 0.5, l * 0.32, 0, 0);
      g.fill();
      g.restore();
    };
    leaf(-0.55, 0.02, -2.3, 0.62);
    leaf(-0.55, 0.02, -0.85, 0.62);
    leaf(0.55, 0.02, -2.3 + Math.PI * 0.55, 0.62);
    leaf(0.55, 0.02, -0.85 + Math.PI * -0.18, 0.62);
    g.beginPath();
    g.ellipse(0, -0.28, 0.2, 0.3, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(-1.25, 0.25, 0.09, 0, TAU);
    g.arc(1.25, 0.25, 0.09, 0, TAU);
    g.fill();
  } else if (kind === 'cross') {
    // technical registration mark
    g.lineWidth = Math.max(1, size * 0.06);
    g.beginPath();
    g.arc(0, 0, s * 0.55, 0, TAU);
    g.stroke();
    g.beginPath();
    g.moveTo(-s, 0);
    g.lineTo(s, 0);
    g.moveTo(0, -s);
    g.lineTo(0, s);
    g.stroke();
    g.beginPath();
    g.arc(0, 0, s * 0.14, 0, TAU);
    g.fill();
  } else if (kind === 'scale') {
    // a keeled scale (lozenge with a keel), flanked by dots
    g.scale(s, s);
    g.beginPath();
    g.moveTo(0, -0.8);
    g.quadraticCurveTo(0.62, -0.35, 0.55, 0.2);
    g.quadraticCurveTo(0.3, 0.75, 0, 0.85);
    g.quadraticCurveTo(-0.3, 0.75, -0.55, 0.2);
    g.quadraticCurveTo(-0.62, -0.35, 0, -0.8);
    g.fill();
    g.strokeStyle = paper;
    g.lineWidth = 0.09;
    g.beginPath();
    g.moveTo(0, -0.5);
    g.lineTo(0, 0.6);
    g.stroke();
    g.fillStyle = color;
    for (const x of [-1.05, 1.05]) {
      g.beginPath();
      g.arc(x, 0, 0.12, 0, TAU);
      g.fill();
    }
  } else {
    // lozenge: ◆ with satellite dots
    g.scale(s, s);
    g.beginPath();
    g.moveTo(0, -0.62);
    g.lineTo(0.42, 0);
    g.lineTo(0, 0.62);
    g.lineTo(-0.42, 0);
    g.closePath();
    g.fill();
    for (const x of [-0.85, 0.85]) {
      g.beginPath();
      g.arc(x, 0, 0.12, 0, TAU);
      g.fill();
    }
  }
  g.restore();
}

function heartPath(g) {
  g.beginPath();
  g.moveTo(1, 0);
  g.bezierCurveTo(0.6, -0.26, 0.18, -0.74, -0.32, -0.7);
  g.bezierCurveTo(-0.74, -0.66, -0.86, -0.24, -0.55, -0.04);
  g.lineTo(-0.55, 0.04);
  g.bezierCurveTo(-0.86, 0.24, -0.74, 0.66, -0.32, 0.7);
  g.bezierCurveTo(0.18, 0.74, 0.6, 0.26, 1, 0);
  g.closePath();
}

/**
 * Ornamental rule: tapering rules on both sides of a central fleuron.
 * @param {number} half  half-width of the whole ornament (px)
 */
export function fleuronRule(g, kind, cx, cy, half, size, color, paper) {
  const gap = size * (kind === 'sprig' ? 1.15 : kind === 'cross' ? 1.0 : kind === 'hedera' ? 1.45 : 0.95);
  if (kind === 'cross') {
    rule(g, cx - half, cy, cx - gap, color, Math.max(1, size * 0.05));
    rule(g, cx + gap, cy, cx + half, color, Math.max(1, size * 0.05));
    for (const x of [cx - half, cx + half]) {
      rule(g, x, cy - size * 0.25, x, color, 1);
      g.beginPath();
      g.moveTo(x, cy - size * 0.25);
      g.lineTo(x, cy + size * 0.25);
      g.stroke();
    }
  } else {
    const thick = Math.max(1.2, size * 0.085);
    taperRule(g, cx - gap, cx - half, cy, thick, color);
    taperRule(g, cx + gap, cx + half, cy, thick, color);
  }
  if (kind === 'hedera') {
    // two ivy leaves back to back, pointing outward, stems curling inward
    g.save();
    g.translate(cx, cy);
    fleuron(g, 'hedera', size * 0.78, 0, size * 0.9, color, paper);
    g.scale(-1, 1);
    fleuron(g, 'hedera', size * 0.78, 0, size * 0.9, color, paper);
    g.restore();
  } else fleuron(g, kind, cx, cy, size, color, paper);
}

// ------------------------------------------------------------------ frames

/**
 * Plate mark: the faint debossed rectangle a printing plate leaves in paper,
 * with a whisper of plate tone inside. Engraving style adds crop marks.
 */
export function plateMark(g, x, y, w, h, T, k = 1, { tone = true, crop = false, double = false } = {}) {
  if (tone) {
    g.fillStyle = rgba(T.muted, T.engraving ? 0.0 : 0.035);
    g.fillRect(x, y, w, h);
  }
  const lw = Math.max(1, 1.6 * k);
  // shadow edge (top-left) and light edge (bottom-right) of the pressed paper
  g.lineWidth = lw;
  g.strokeStyle = rgba(T.ink, T.engraving ? 0.55 : 0.2);
  g.strokeRect(x, y, w, h);
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.beginPath();
  g.moveTo(x + w + lw, y + lw);
  g.lineTo(x + w + lw, y + h + lw);
  g.lineTo(x + lw, y + h + lw);
  g.stroke();
  if (double) {
    const d = 9 * k;
    g.lineWidth = Math.max(1, 1 * k);
    g.strokeStyle = rgba(T.ink, T.engraving ? 0.35 : 0.12);
    g.strokeRect(x + d, y + d, w - 2 * d, h - 2 * d);
  }
  if (crop) cropMarks(g, x, y, w, h, 26 * k, 10 * k, rgba(T.ink, 0.7), Math.max(1, 1.2 * k));
}

/** Printer's crop marks outside a rectangle. */
export function cropMarks(g, x, y, w, h, len, off, color, lw = 1) {
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.beginPath();
  for (const [cx, cy, sx, sy] of [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]]) {
    g.moveTo(cx + sx * off, cy);
    g.lineTo(cx + sx * (off + len), cy);
    g.moveTo(cx, cy + sy * off);
    g.lineTo(cx, cy + sy * (off + len));
  }
  g.stroke();
}

// ------------------------------------------------------------------ chips & badges

/**
 * IUCN Red List category colours (softened to sit on printed paper) and
 * English names (printed through tl() when a plate's status gives no label).
 */
export const IUCN = {
  EX: { color: '#1c1a17', label: msg('Extinct') },
  EW: { color: '#5b3f6b', label: msg('Extinct in the Wild') },
  CR: { color: '#b3302a', label: msg('Critically Endangered') },
  EN: { color: '#cf6a2c', label: msg('Endangered') },
  VU: { color: '#d8ae2a', label: msg('Vulnerable') },
  NT: { color: '#8ea83c', label: msg('Near Threatened') },
  LC: { color: '#4d8a4a', label: msg('Least Concern') },
  DD: { color: '#8d8a80', label: msg('Data Deficient') },
  NE: { color: '#b9b4a8', label: msg('Not Evaluated') },
};

/** Foreground colour readable on `bg`. */
export function onColor(bg) {
  return luminance(bg) > 0.42 ? '#1c1a17' : '#ffffff';
}

/** Small warning triangle with an exclamation mark. */
export function warningGlyph(g, cx, cy, size, color) {
  const h = size;
  const w = size * 1.12;
  g.save();
  g.lineJoin = 'round';
  g.strokeStyle = color;
  g.lineWidth = Math.max(1, size * 0.11);
  g.beginPath();
  g.moveTo(cx, cy - h * 0.55);
  g.lineTo(cx + w / 2, cy + h * 0.42);
  g.lineTo(cx - w / 2, cy + h * 0.42);
  g.closePath();
  g.stroke();
  g.fillStyle = color;
  g.fillRect(cx - size * 0.045, cy - h * 0.22, size * 0.09, h * 0.36);
  g.beginPath();
  g.arc(cx, cy + h * 0.26, size * 0.06, 0, TAU);
  g.fill();
  g.restore();
}

/** Small filled diamond. */
export function diamondGlyph(g, cx, cy, size, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(cx, cy - size / 2);
  g.lineTo(cx + size * 0.36, cy);
  g.lineTo(cx, cy + size / 2);
  g.lineTo(cx - size * 0.36, cy);
  g.closePath();
  g.fill();
}

/** Checkbox glyph (rounded square) for "Look closer" lists. */
export function checkboxGlyph(g, x, y, size, color, k = 1) {
  g.strokeStyle = color;
  g.lineWidth = Math.max(1, 1.8 * k);
  roundRectPath(g, x, y, size, size, size * 0.2);
  g.stroke();
}

/**
 * Leader dots between x1 and x2 at baseline y. Dots snap to a global grid
 * so rows of leaders line up vertically, like hand-set tabular matter.
 */
export function leaderDots(g, x1, x2, y, color, spacing, radius) {
  g.fillStyle = color;
  const start = Math.ceil((x1 + spacing * 0.6) / spacing) * spacing;
  g.beginPath();
  for (let x = start; x <= x2 - spacing * 0.6; x += spacing) {
    g.moveTo(x + radius, y);
    g.arc(x, y, radius, 0, TAU);
  }
  g.fill();
}

// ------------------------------------------------------------------ figure page marks

/**
 * The faint printed "stage" where a pop-up figure stands: a soft wash and a
 * hairline ellipse (lithograph) or engraved horizontal hatching (engraving),
 * with registration ticks at the cardinal points.
 */
export function groundMark(g, cx, cy, rx, ry, T, k = 1) {
  g.save();
  if (T.engraving) {
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    g.save();
    g.clip();
    const step = Math.max(3, 7 * k);
    g.strokeStyle = rgba(T.ink, 0.5);
    for (let y = cy - ry; y <= cy + ry; y += step) {
      const t = (y - (cy - ry)) / (2 * ry); // 0 top → 1 bottom
      g.lineWidth = Math.max(0.6, k * (0.5 + 1.6 * t * t));
      g.globalAlpha = 0.25 + 0.55 * t;
      g.beginPath();
      g.moveTo(cx - rx, y);
      g.lineTo(cx + rx, y);
      g.stroke();
    }
    g.restore();
    g.globalAlpha = 1;
    g.strokeStyle = rgba(T.ink, 0.65);
    g.lineWidth = Math.max(1, 1.4 * k);
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    g.stroke();
  } else {
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, rx);
    grad.addColorStop(0, rgba(T.muted, 0.13));
    grad.addColorStop(0.7, rgba(T.muted, 0.06));
    grad.addColorStop(1, rgba(T.muted, 0));
    g.save();
    g.translate(cx, cy);
    g.scale(1, ry / rx);
    g.translate(-cx, -cy);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, rx, 0, TAU);
    g.fill();
    g.restore();
    g.strokeStyle = rgba(T.ink, 0.2);
    g.lineWidth = Math.max(1, 1.3 * k);
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    g.stroke();
    g.setLineDash([2 * k, 7 * k]);
    g.strokeStyle = rgba(T.ink, 0.16);
    g.beginPath();
    g.ellipse(cx, cy, rx * 0.62, ry * 0.62, 0, 0, TAU);
    g.stroke();
    g.setLineDash([]);
  }
  // registration ticks
  g.strokeStyle = rgba(T.ink, T.engraving ? 0.7 : 0.32);
  g.lineWidth = Math.max(1, 1.3 * k);
  const t = 16 * k;
  g.beginPath();
  g.moveTo(cx - rx - t, cy);
  g.lineTo(cx - rx - t * 0.25, cy);
  g.moveTo(cx + rx + t * 0.25, cy);
  g.lineTo(cx + rx + t, cy);
  g.moveTo(cx, cy - ry - t);
  g.lineTo(cx, cy - ry - t * 0.25);
  g.moveTo(cx, cy + ry + t * 0.25);
  g.lineTo(cx, cy + ry + t);
  g.stroke();
  g.restore();
}

/** Map-style alternating scale bar (4 segments). Returns its width. */
export function scaleBar(g, x, y, w, h, color, paper) {
  const seg = w / 4;
  g.lineWidth = Math.max(1, h * 0.18);
  g.strokeStyle = color;
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i % 2 ? paper : color;
    g.fillRect(x + i * seg, y - h / 2, seg, h);
  }
  g.strokeRect(x, y - h / 2, w, h);
  return w;
}

/** Circular arrow (loop) glyph. */
export function loopGlyph(g, cx, cy, r, color, lw) {
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = lw;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(cx, cy, r, -Math.PI * 0.35, Math.PI * 1.45);
  g.stroke();
  const a = -Math.PI * 0.35;
  const ex = cx + Math.cos(a) * r;
  const ey = cy + Math.sin(a) * r;
  g.beginPath();
  g.moveTo(ex + r * 0.55, ey - r * 0.05);
  g.lineTo(ex - r * 0.1, ey - r * 0.5);
  g.lineTo(ex - r * 0.12, ey + r * 0.32);
  g.closePath();
  g.fill();
}

// ------------------------------------------------------------------ how-to icons

/**
 * Pick an icon for an interaction-guide row from its wording.
 * @returns {string} icon id
 */
export function iconFor(gesture = '', effect = '') {
  const s = `${gesture} ${effect}`.toLowerCase();
  if (/arrow key|keyboard|← |→|\bkeys?\b/.test(s)) return 'keys';
  if (/explode|dissect|separate/.test(s)) return 'explode';
  if (/layer|x-ray|skin|skeleton/.test(s)) return 'layers';
  if (/label|name/.test(s)) return 'label';
  if (/export|svg|download|save/.test(s)) return 'export';
  if (/play|pause|animation|loop|time/.test(s)) return 'play';
  if (/pinch|zoom|scroll|wheel/.test(s)) return 'zoom';
  if (/double/.test(s)) return 'inspect';
  if (/rotate|turn the figure|orbit|spin/.test(s)) return 'rotate';
  if (/swipe/.test(s)) return 'swipe';
  if (/drag|turn|page|corner|click/.test(s)) return 'page';
  return 'dot';
}

/** Draw a line icon in a size×size box at (x, y). */
export function icon(g, id, x, y, size, color, accent) {
  const s = size;
  g.save();
  g.translate(x, y);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = Math.max(1.2, s * 0.055);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const L = (pts) => {
    g.beginPath();
    pts.forEach(([px, py], i) => (i ? g.lineTo(px * s, py * s) : g.moveTo(px * s, py * s)));
    g.stroke();
  };
  switch (id) {
    case 'page': {
      // open book with a lifting corner
      L([[0.06, 0.32], [0.06, 0.82], [0.5, 0.9], [0.94, 0.82], [0.94, 0.32], [0.5, 0.4], [0.06, 0.32]]);
      L([[0.5, 0.4], [0.5, 0.9]]);
      g.strokeStyle = accent;
      g.beginPath();
      g.moveTo(0.55 * s, 0.28 * s);
      g.quadraticCurveTo(0.72 * s, 0.02 * s, 0.9 * s, 0.16 * s);
      g.stroke();
      L([[0.82, 0.08], [0.9, 0.16], [0.8, 0.22]]);
      break;
    }
    case 'keys': {
      for (const [ox, dir] of [[0.04, -1], [0.54, 1]]) {
        roundRectPath(g, ox * s, 0.28 * s, 0.42 * s, 0.42 * s, 0.08 * s);
        g.stroke();
        const cx = (ox + 0.21) * s;
        const cy = 0.49 * s;
        g.beginPath();
        g.moveTo(cx - dir * 0.09 * s, cy - 0.08 * s);
        g.lineTo(cx + dir * 0.06 * s, cy);
        g.lineTo(cx - dir * 0.09 * s, cy + 0.08 * s);
        g.stroke();
      }
      break;
    }
    case 'swipe': {
      g.beginPath();
      g.arc(0.62 * s, 0.6 * s, 0.13 * s, 0, TAU);
      g.stroke();
      g.strokeStyle = accent;
      L([[0.12, 0.6], [0.42, 0.6]]);
      L([[0.22, 0.5], [0.12, 0.6], [0.22, 0.7]]);
      break;
    }
    case 'rotate': {
      g.beginPath();
      g.ellipse(0.5 * s, 0.6 * s, 0.38 * s, 0.14 * s, 0, 0, TAU);
      g.stroke();
      L([[0.5, 0.14], [0.5, 0.6]]);
      g.strokeStyle = accent;
      g.beginPath();
      g.ellipse(0.5 * s, 0.6 * s, 0.38 * s, 0.14 * s, 0, 0.15, 1.2);
      g.lineWidth *= 1.6;
      g.stroke();
      break;
    }
    case 'zoom': {
      g.beginPath();
      g.arc(0.42 * s, 0.42 * s, 0.26 * s, 0, TAU);
      g.stroke();
      L([[0.61, 0.61], [0.9, 0.9]]);
      g.strokeStyle = accent;
      L([[0.3, 0.42], [0.54, 0.42]]);
      L([[0.42, 0.3], [0.42, 0.54]]);
      break;
    }
    case 'inspect': {
      g.beginPath();
      g.arc(0.5 * s, 0.5 * s, 0.34 * s, 0, TAU);
      g.stroke();
      g.strokeStyle = accent;
      g.beginPath();
      g.arc(0.5 * s, 0.5 * s, 0.16 * s, 0, TAU);
      g.stroke();
      g.beginPath();
      g.arc(0.5 * s, 0.5 * s, 0.04 * s, 0, TAU);
      g.fill();
      break;
    }
    case 'explode': {
      roundRectPath(g, 0.38 * s, 0.38 * s, 0.24 * s, 0.24 * s, 0.03 * s);
      g.stroke();
      g.strokeStyle = accent;
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const ax = 0.5 + dx * 0.2;
        const ay = 0.5 + dy * 0.2;
        const bx = 0.5 + dx * 0.4;
        const by = 0.5 + dy * 0.4;
        L([[ax, ay], [bx, by]]);
        L([[bx - dx * 0.1, by], [bx, by], [bx, by - dy * 0.1]]);
      }
      break;
    }
    case 'layers': {
      const rh = (yy, filled) => {
        g.beginPath();
        g.moveTo(0.5 * s, (yy - 0.14) * s);
        g.lineTo(0.9 * s, yy * s);
        g.lineTo(0.5 * s, (yy + 0.14) * s);
        g.lineTo(0.1 * s, yy * s);
        g.closePath();
        if (filled) {
          g.fillStyle = accent;
          g.fill();
        }
        g.stroke();
      };
      rh(0.7, false);
      rh(0.5, false);
      rh(0.3, true);
      break;
    }
    case 'label': {
      g.beginPath();
      g.moveTo(0.12 * s, 0.3 * s);
      g.lineTo(0.62 * s, 0.3 * s);
      g.lineTo(0.88 * s, 0.5 * s);
      g.lineTo(0.62 * s, 0.7 * s);
      g.lineTo(0.12 * s, 0.7 * s);
      g.closePath();
      g.stroke();
      g.fillStyle = accent;
      g.beginPath();
      g.arc(0.62 * s, 0.5 * s, 0.05 * s, 0, TAU);
      g.fill();
      break;
    }
    case 'export': {
      L([[0.12, 0.62], [0.12, 0.86], [0.88, 0.86], [0.88, 0.62]]);
      g.strokeStyle = accent;
      L([[0.5, 0.12], [0.5, 0.64]]);
      L([[0.32, 0.46], [0.5, 0.64], [0.68, 0.46]]);
      break;
    }
    case 'play': {
      g.beginPath();
      g.arc(0.5 * s, 0.5 * s, 0.38 * s, 0, TAU);
      g.stroke();
      g.fillStyle = accent;
      g.beginPath();
      g.moveTo(0.42 * s, 0.34 * s);
      g.lineTo(0.66 * s, 0.5 * s);
      g.lineTo(0.42 * s, 0.66 * s);
      g.closePath();
      g.fill();
      break;
    }
    default:
      diamondGlyph(g, 0.5 * s, 0.5 * s, 0.34 * s, accent);
  }
  g.restore();
}

/** Mix helper re-exported for layouts that need a tint without importing util. */
export const tint = (a, b, t) => mix(a, b, t);
