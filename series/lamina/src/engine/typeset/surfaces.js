// Material surfaces printed into page textures: book cloth, foil stamping,
// blind debossing and endpaper repeat patterns.
//
// Cloth is a dyed ground with low-frequency mottling, irregular warp/weft
// threads (value noise, seeded per book so it is deterministic) and rubbed
// board edges. Foil and blind stamps are composed through a white "mask"
// layer: the mask is tinted with a metallic gradient and given an inner bevel
// (shadow on the upper-left inner edge, light on the lower-right) — which is
// how a die pressed into cloth actually catches the light.
import { rng, hashString, fbm, valueNoise, mix, rgba, shade, hexToRgb, createCanvas } from './util.js';
import { emblemGeometry, inkEmblem } from './emblems.js';

// ------------------------------------------------------------------ cloth

const weaveTiles = new Map();

/** Tileable woven-thread texture (cached per colour). */
function weaveTile(color, size = 256, seed = 7) {
  const key = `${color}|${size}|${seed}`;
  if (weaveTiles.has(key)) return weaveTiles.get(key);
  const c = createCanvas(size, size);
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const [r0, g0, b0] = hexToRgb(color);
  const P = 4; // thread period in px
  const threads = size / P;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tx = Math.floor(x / P);
      const ty = Math.floor(y / P);
      const fx = (x % P) / P;
      const fy = (y % P) / P;
      // plain weave: warp over weft on alternating cells
      const over = (tx + ty) % 2 === 0;
      const warpProfile = Math.sin(Math.PI * fx);
      const weftProfile = Math.sin(Math.PI * fy);
      const prof = over ? warpProfile : weftProfile;
      // per-thread brightness & slubs (tileable noise along the thread)
      const warpVar = valueNoise(tx * 0.9, y * 0.035, seed, threads * 0.9, size * 0.035) - 0.5;
      const weftVar = valueNoise(x * 0.035, ty * 0.9, seed + 3, size * 0.035, threads * 0.9) - 0.5;
      const v = (prof - 0.62) * 0.16 + (over ? warpVar : weftVar) * 0.12;
      const i = (y * size + x) * 4;
      img.data[i] = r0 * (1 + v);
      img.data[i + 1] = g0 * (1 + v);
      img.data[i + 2] = b0 * (1 + v);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  weaveTiles.set(key, c);
  return c;
}

/**
 * Paint a cloth ground over the whole canvas.
 * @param {CanvasRenderingContext2D} g
 * @param {number} W
 * @param {number} H
 * @param {string} color
 * @param {object} [o] { seed, spine: 'left'|'right'|null, k }
 */
export function paintCloth(g, W, H, color, { seed = 'cloth', spine = 'left', k = 1 } = {}) {
  const s = typeof seed === 'string' ? hashString(seed) : seed;
  g.save();
  g.fillStyle = color;
  g.fillRect(0, 0, W, H);
  // woven threads
  const tile = weaveTile(color, 256, s % 997);
  const pat = g.createPattern(tile, 'repeat');
  const scale = Math.max(0.6, k * 1.1);
  pat.setTransform?.(new DOMMatrix([scale, 0, 0, scale, 0, 0]));
  g.globalAlpha = 0.9;
  g.fillStyle = pat;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;
  // dye mottling: low-res fbm, upscaled smoothly
  const mw = 72;
  const mh = Math.round((mw * H) / W);
  const m = createCanvas(mw, mh);
  const mg = m.getContext('2d');
  const img = mg.createImageData(mw, mh);
  const light = hexToRgb(shade(color, 0.16));
  const dark = hexToRgb(shade(color, -0.22));
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const n = fbm(x * 0.09, y * 0.09, s, 4) - 0.5;
      const i = (y * mw + x) * 4;
      const c = n > 0 ? light : dark;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = Math.min(255, Math.abs(n) * 2 * 120);
    }
  }
  mg.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(m, 0, 0, W, H);
  // rubbed edges and corners: board edges catch wear and light
  const edge = Math.min(W, H) * 0.035;
  const wear = rgba(shade(color, 0.28), 0.35);
  for (const [x0, y0, x1, y1] of [[0, 0, edge, 0], [W, 0, W - edge, 0], [0, 0, 0, edge], [0, H, 0, H - edge]]) {
    const gr = g.createLinearGradient(x0, y0, x1 || x0, y1 || y0);
    gr.addColorStop(0, wear);
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr;
    if (x1 !== 0 || x0 !== 0) g.fillRect(Math.min(x0, x1), 0, edge, H);
    else g.fillRect(0, Math.min(y0, y1), W, edge);
  }
  for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    const gr = g.createRadialGradient(x, y, 0, x, y, edge * 3);
    gr.addColorStop(0, rgba(shade(color, 0.35), 0.45));
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr;
    g.fillRect(x - edge * 3, y - edge * 3, edge * 6, edge * 6);
  }
  // hinge groove next to the spine
  if (spine) {
    const gx = spine === 'left' ? W * 0.045 : W * 0.955;
    const gw = W * 0.012;
    const gr = g.createLinearGradient(gx - gw, 0, gx + gw, 0);
    gr.addColorStop(0, rgba(shade(color, -0.4), 0));
    gr.addColorStop(0.45, rgba(shade(color, -0.45), 0.55));
    gr.addColorStop(0.6, rgba(shade(color, 0.3), 0.35));
    gr.addColorStop(1, rgba(shade(color, 0.3), 0));
    g.fillStyle = gr;
    g.fillRect(gx - gw, 0, gw * 2, H);
  }
  g.restore();
}

// ------------------------------------------------------------------ stamping

/**
 * A full-size mask canvas to draw stamp shapes into (in white).
 * @returns {{ canvas, g }}
 */
export function createMask(W, H) {
  const canvas = createCanvas(W, H);
  const g = canvas.getContext('2d');
  if ('fontKerning' in g) g.fontKerning = 'normal';
  if ('textRendering' in g) g.textRendering = 'optimizeLegibility';
  return { canvas, g };
}

function tinted(mask, W, H, paint) {
  const c = createCanvas(W, H);
  const g = c.getContext('2d');
  g.drawImage(mask, 0, 0);
  g.globalCompositeOperation = 'source-in';
  if (typeof paint === 'function') paint(g);
  else {
    g.fillStyle = paint;
    g.fillRect(0, 0, W, H);
  }
  return c;
}

/** Inner bevel band: pixels inside `mask` but not inside `mask` shifted by (dx, dy). */
function innerBand(mask, W, H, dx, dy, color) {
  const c = createCanvas(W, H);
  const g = c.getContext('2d');
  g.drawImage(mask, 0, 0);
  g.globalCompositeOperation = 'destination-out';
  g.drawImage(mask, dx, dy);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, W, H);
  return c;
}

/**
 * Composite a foil stamp from a white mask onto the cover.
 * @param {CanvasRenderingContext2D} g   cover context
 * @param {HTMLCanvasElement} mask
 * @param {object} o { foil, cloth, k, seed }
 */
export function stampFoil(g, mask, W, H, { foil, cloth, k = 1, seed = 'foil' }) {
  const d = Math.max(1, 2.2 * k);
  // pressed-in shadow around the die (cloth darkened just outside the edge)
  const halo = tinted(mask, W, H, rgba(shade(cloth, -0.55), 0.55));
  g.save();
  g.filter = `blur(${Math.max(0.6, 1.6 * k)}px)`;
  g.drawImage(halo, d * 0.5, d * 0.7);
  g.filter = 'none';
  g.restore();
  // metallic foil: banded gradient + fine grain from the cloth beneath
  const foilLayer = tinted(mask, W, H, (fg) => {
    const gr = fg.createLinearGradient(W * 0.1, 0, W * 0.9, H);
    const stops = [
      [0, shade(foil, -0.3)], [0.18, shade(foil, 0.05)], [0.32, shade(foil, 0.42)], [0.4, shade(foil, 0.15)],
      [0.55, shade(foil, -0.18)], [0.68, shade(foil, 0.3)], [0.82, shade(foil, -0.05)], [1, shade(foil, -0.32)],
    ];
    for (const [t, c] of stops) gr.addColorStop(t, c);
    fg.fillStyle = gr;
    fg.fillRect(0, 0, W, H);
    // grain: the weave telegraphs through thin foil
    const r = rng(seed);
    fg.globalCompositeOperation = 'source-atop';
    fg.globalAlpha = 0.18;
    for (let i = 0; i < 1400; i++) {
      const x = r() * W;
      const y = r() * H;
      fg.fillStyle = r() > 0.5 ? '#ffffff' : '#000000';
      fg.fillRect(x, y, (1 + r() * 2.5) * k, 0.8 * k);
    }
    fg.globalAlpha = 1;
  });
  g.drawImage(foilLayer, 0, 0);
  // inner bevel: shadow on the upper-left inner edge, highlight lower-right
  g.drawImage(innerBand(mask, W, H, d, d, rgba(shade(foil, -0.65), 0.75)), 0, 0);
  g.drawImage(innerBand(mask, W, H, -d, -d, rgba(shade(foil, 0.7), 0.85)), 0, 0);
}

/** Blind (no foil) deboss: compressed, darker cloth with an inner bevel. */
export function stampBlind(g, mask, W, H, { cloth, k = 1 }) {
  const d = Math.max(1, 2 * k);
  g.drawImage(tinted(mask, W, H, rgba(shade(cloth, -0.25), 0.55)), 0, 0);
  g.drawImage(innerBand(mask, W, H, d, d, rgba(shade(cloth, -0.6), 0.85)), 0, 0);
  g.drawImage(innerBand(mask, W, H, -d, -d, rgba(shade(cloth, 0.35), 0.6)), 0, 0);
}

// ------------------------------------------------------------------ endpapers

/** Canonical motif for theme.endpaper.motif (accepts synonyms). */
export function endpaperMotif(name = '') {
  const s = String(name).toLowerCase();
  if (/atom/.test(s)) return 'atom';
  if (/cell|celul/.test(s)) return 'cell';
  if (/campfire|fogata|wave|star|spark/.test(s)) return 'campfire';
  if (/scale|snake|skin|reptil|serp/.test(s)) return 'scales';
  if (/leaf|leaves|botan|flor|flower|foliage|fern|plant/.test(s)) return 'leaves';
  if (/grid|anatom|construct|skull|bone|calav|graph/.test(s)) return 'grid';
  return 'lozenge';
}

/**
 * Fill a rect with the endpaper repeat pattern.
 * @param {object} ep  { motif, color, ground }
 */
export function paintEndpaper(g, x, y, w, h, ep, { k = 1, seed = 'ep' } = {}) {
  const motif = endpaperMotif(ep.motif);
  const ground = ep.ground ?? '#efe7d6';
  const color = ep.color ?? '#1f3a2b';
  const tile = endpaperTile(motif, color, ground, k, seed);
  g.save();
  g.fillStyle = ground;
  g.fillRect(x, y, w, h);
  const pat = g.createPattern(tile, 'repeat');
  pat.setTransform?.(new DOMMatrix([1, 0, 0, 1, x, y]));
  g.fillStyle = pat;
  g.fillRect(x, y, w, h);
  // gentle sheen variation like a printed paper
  const gr = g.createLinearGradient(x, y, x + w, y + h);
  gr.addColorStop(0, rgba('#ffffff', 0.06));
  gr.addColorStop(0.5, rgba('#ffffff', 0));
  gr.addColorStop(1, rgba('#000000', 0.05));
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
  g.restore();
}

function endpaperTile(motif, color, ground, k, seed) {
  if (['atom', 'cell', 'campfire'].includes(motif)) {
    const size = Math.round(260 * k), c = createCanvas(size, size), g = c.getContext('2d');
    g.fillStyle = ground; g.fillRect(0, 0, size, size);
    for (const [x, y, light] of [[.25, .25, .35], [.75, .75, .6]]) {
      const tone = mix(color, ground, light);
      inkEmblem(g, emblemGeometry(motif, x * size, y * size, size * .19), { ink: tone, fill: tone, paper: ground });
    }
    return c;
  }
  if (motif === 'scales') return scalesTile(color, ground, k);
  if (motif === 'leaves') return leavesTile(color, ground, k, seed);
  if (motif === 'grid') return gridTile(color, ground, k);
  return lozengeTile(color, ground, k);
}

/** Imbricate keeled scales with a repeating dorsal-blotch pattern. */
function scalesTile(color, ground, k) {
  const sw = Math.round(46 * k); // scale width
  const sh = Math.round(sw * 0.62); // row step
  const cols = 8;
  const rows = 16;
  const W = sw * cols;
  const H = sh * rows;
  const c = createCanvas(W, H);
  const g = c.getContext('2d');
  g.fillStyle = ground;
  g.fillRect(0, 0, W, H);
  const mid = mix(color, ground, 0.62);
  const soft = mix(color, ground, 0.42);
  const deep = color;
  const lw = Math.max(1, 1.5 * k);
  // which scales are part of the blotch (diamond lattice across rows/cols)
  const blotch = (col, row) => {
    const cx = ((col + (row % 2) * 0.5) / cols) * 2 - 1;
    const cy = (row / rows) * 2 - 1;
    const d = Math.abs(cx) + Math.abs(cy) * 0.55;
    return d < 0.42 ? 2 : d > 0.86 && d < 1.02 ? 1 : 0;
  };
  for (let row = -1; row <= rows + 1; row++) {
    for (let col = -1; col <= cols + 1; col++) {
      const x = col * sw + (row % 2 ? sw / 2 : 0);
      const y = row * sh;
      const b = blotch(((col % cols) + cols) % cols, ((row % rows) + rows) % rows);
      scale(g, x, y, sw, sh * 1.7, b === 2 ? deep : b === 1 ? mid : ground, b === 2 ? deep : soft, lw);
    }
  }
  return c;
}

function scale(g, x, y, w, h, fill, line, lw) {
  // a rounded lozenge pointing down, drawn top→bottom so lower rows overlap
  g.beginPath();
  g.moveTo(x, y - h * 0.32);
  g.bezierCurveTo(x + w * 0.42, y - h * 0.3, x + w * 0.55, y + h * 0.05, x, y + h * 0.42);
  g.bezierCurveTo(x - w * 0.55, y + h * 0.05, x - w * 0.42, y - h * 0.3, x, y - h * 0.32);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = line;
  g.lineWidth = lw;
  g.stroke();
  // keel
  g.beginPath();
  g.moveTo(x, y - h * 0.12);
  g.lineTo(x, y + h * 0.26);
  g.strokeStyle = fill === line ? rgba('#ffffff', 0.35) : line;
  g.lineWidth = lw * 0.8;
  g.stroke();
}

/**
 * Botanical repeat: S-curved stems with alternate veined leaves, set as a
 * half-drop of two opposed sprays (dark and light) with small five-petal
 * flowers between them, so the rhythm waves instead of striping.
 */
function leavesTile(color, ground, k, seed) {
  const T = Math.round(340 * k);
  const c = createCanvas(T, T);
  const g = c.getContext('2d');
  g.fillStyle = ground;
  g.fillRect(0, 0, T, T);
  const r = rng(`${seed}|leaves`);
  const light = mix(color, ground, 0.5);
  const place = (fn) => {
    for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) fn(ox, oy);
  };
  const sprays = [
    { x: 0.27, y: 0.3, rot: -0.55, scale: 1, tone: color },
    { x: 0.77, y: 0.8, rot: 2.6, scale: 0.94, tone: light },
  ];
  for (const sp of sprays) {
    const jitter = r() * 0.08;
    place((ox, oy) => {
      g.save();
      g.translate(sp.x * T + ox, sp.y * T + oy);
      g.rotate(sp.rot + jitter);
      g.scale(sp.scale * k, sp.scale * k);
      drawSpray(g, sp.tone, ground, rng(`${seed}|spray|${sp.x}`));
      g.restore();
    });
  }
  for (const [fx, fy, tone] of [[0.8, 0.27, light], [0.27, 0.8, color]]) {
    place((ox, oy) => drawFlowerlet(g, fx * T + ox, fy * T + oy, 13 * k, tone, ground));
  }
  return c;
}

/** One spray in local units (~±130 × ±60), already scaled by the caller. */
function drawSpray(g, color, ground, r) {
  const P0 = [-128, 26];
  const P1 = [-46, -48];
  const P2 = [52, 44];
  const P3 = [128, -6];
  const pt = (t) => {
    const m = 1 - t;
    return [
      m * m * m * P0[0] + 3 * m * m * t * P1[0] + 3 * m * t * t * P2[0] + t * t * t * P3[0],
      m * m * m * P0[1] + 3 * m * m * t * P1[1] + 3 * m * t * t * P2[1] + t * t * t * P3[1],
    ];
  };
  const tan = (t) => {
    const m = 1 - t;
    const dx = 3 * m * m * (P1[0] - P0[0]) + 6 * m * t * (P2[0] - P1[0]) + 3 * t * t * (P3[0] - P2[0]);
    const dy = 3 * m * m * (P1[1] - P0[1]) + 6 * m * t * (P2[1] - P1[1]) + 3 * t * t * (P3[1] - P2[1]);
    return Math.atan2(dy, dx);
  };
  g.strokeStyle = color;
  g.lineWidth = 2.6;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(...P0);
  g.bezierCurveTo(...P1, ...P2, ...P3);
  g.stroke();
  const leaf = (x, y, a, L) => {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(L * 0.28, -L * 0.34, L * 0.74, -L * 0.26, L, 0);
    g.bezierCurveTo(L * 0.74, L * 0.24, L * 0.28, L * 0.3, 0, 0);
    g.fillStyle = color;
    g.fill();
    g.strokeStyle = ground;
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(L * 0.08, 0);
    g.quadraticCurveTo(L * 0.5, -L * 0.02, L * 0.9, 0);
    for (let i = 1; i <= 4; i++) {
      const vx = L * (0.14 + i * 0.15);
      g.moveTo(vx, -L * 0.005);
      g.lineTo(vx + L * 0.11, -L * 0.15);
      g.moveTo(vx, L * 0.005);
      g.lineTo(vx + L * 0.11, L * 0.13);
    }
    g.stroke();
    g.restore();
  };
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = 0.06 + (i / (n - 1)) * 0.86;
    const side = i % 2 ? 1 : -1;
    const [x, y] = pt(t);
    leaf(x, y, tan(t) + side * (0.62 + r() * 0.12), 52 - 22 * t + r() * 6);
  }
  const [ex, ey] = pt(1);
  leaf(ex, ey, tan(1) - 0.05, 30);
}

/** A tiny five-petal flower with a seeded centre. */
function drawFlowerlet(g, x, y, R, color, ground) {
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    g.beginPath();
    g.ellipse(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, R * 0.52, R * 0.36, a, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = ground;
  g.beginPath();
  g.arc(0, 0, R * 0.3, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = color;
  g.beginPath();
  g.arc(0, 0, R * 0.14, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** Anatomical drawing grid with construction-skull vignettes (engraving books). */
function gridTile(color, ground, k) {
  const cell = Math.round(26 * k);
  const n = 12;
  const T = cell * n;
  const c = createCanvas(T, T);
  const g = c.getContext('2d');
  g.fillStyle = ground;
  g.fillRect(0, 0, T, T);
  // minor grid
  g.strokeStyle = rgba(color, 0.16);
  g.lineWidth = Math.max(1, 0.8 * k);
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    g.moveTo(i * cell + 0.5, 0);
    g.lineTo(i * cell + 0.5, T);
    g.moveTo(0, i * cell + 0.5);
    g.lineTo(T, i * cell + 0.5);
  }
  g.stroke();
  // major grid every 6 cells
  g.strokeStyle = rgba(color, 0.34);
  g.lineWidth = Math.max(1, 1.2 * k);
  g.beginPath();
  for (const i of [0, 6, 12]) {
    g.moveTo(i * cell, 0);
    g.lineTo(i * cell, T);
    g.moveTo(0, i * cell);
    g.lineTo(T, i * cell);
  }
  g.stroke();
  // registration crosses at major intersections
  g.strokeStyle = rgba(color, 0.7);
  g.lineWidth = Math.max(1, 1.2 * k);
  for (const [x, y] of [[0, 0], [6, 6], [12, 0], [0, 12], [12, 12]]) {
    g.beginPath();
    g.arc(x * cell, y * cell, cell * 0.28, 0, Math.PI * 2);
    g.moveTo(x * cell - cell * 0.5, y * cell);
    g.lineTo(x * cell + cell * 0.5, y * cell);
    g.moveTo(x * cell, y * cell - cell * 0.5);
    g.lineTo(x * cell, y * cell + cell * 0.5);
    g.stroke();
  }
  // construction skull vignettes (half-drop)
  const vignette = (cx, cy, s) => {
    g.save();
    g.translate(cx, cy);
    g.strokeStyle = rgba(color, 0.62);
    g.lineWidth = Math.max(1, 1.3 * k);
    g.beginPath();
    g.arc(0, -s * 0.18, s * 0.55, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([4 * k, 3 * k]);
    g.beginPath();
    g.moveTo(0, -s * 0.85);
    g.lineTo(0, s * 0.95);
    g.moveTo(-s * 0.7, s * 0.05);
    g.lineTo(s * 0.7, s * 0.05);
    g.stroke();
    g.setLineDash([]);
    g.beginPath();
    g.moveTo(-s * 0.44, s * 0.05);
    g.lineTo(-s * 0.32, s * 0.6);
    g.lineTo(-s * 0.15, s * 0.82);
    g.lineTo(s * 0.15, s * 0.82);
    g.lineTo(s * 0.32, s * 0.6);
    g.lineTo(s * 0.44, s * 0.05);
    g.stroke();
    g.fillStyle = rgba(color, 0.55);
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.ellipse(sx * s * 0.2, s * 0.08, s * 0.12, s * 0.11, sx * 0.15, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    g.moveTo(0, s * 0.22);
    g.lineTo(s * 0.06, s * 0.36);
    g.lineTo(-s * 0.06, s * 0.36);
    g.closePath();
    g.fill();
    g.restore();
  };
  const s = cell * 1.7;
  vignette(3 * cell, 3 * cell, s);
  vignette(9 * cell, 9 * cell, s);
  return c;
}

function lozengeTile(color, ground, k) {
  const T = Math.round(64 * k);
  const c = createCanvas(T, T);
  const g = c.getContext('2d');
  g.fillStyle = ground;
  g.fillRect(0, 0, T, T);
  g.fillStyle = color;
  for (const [x, y] of [[0, 0], [T, 0], [0, T], [T, T], [T / 2, T / 2]]) {
    g.beginPath();
    g.moveTo(x, y - T * 0.2);
    g.lineTo(x + T * 0.13, y);
    g.lineTo(x, y + T * 0.2);
    g.lineTo(x - T * 0.13, y);
    g.closePath();
    g.fill();
  }
  return c;
}
