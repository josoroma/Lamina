// Raster → vector tracing for the SVG plate exporter (pure JS, no DOM/GPU).
//
// Input is a label image (one integer per pixel, 0 = background) rendered
// from the figure's ID buffer. A region is any set of labels; its outline is
// traced with oriented marching squares on the grid of pixel centres, so
// every closed loop comes out with consistent winding (holes included) and
// every vertex knows which label lies just outside it — that is what lets
// the exporter split a part's outline into silhouette runs and shared
// part-to-part boundaries drawn exactly once.
//
// Loops are then simplified (Ramer–Douglas–Peucker, keeping the vertices
// where the outside neighbour changes) and turned into cubic Béziers with
// centripetal Catmull-Rom tangents (no overshoot, no cusps), with sharp
// corners preserved — clean engraved curves rather than pixel staircases.

// Corners of a cell (pixel centres): a = top-left, b = top-right,
// c = bottom-right, d = bottom-left. case = a<<3 | b<<2 | c<<1 | d.
const CORNER = [[0.5, 0.5], [1.5, 0.5], [1.5, 1.5], [0.5, 1.5]]; // a b c d (relative to cell origin)
const EDGE_MID = [[1, 0.5], [1.5, 1], [1, 1.5], [0.5, 1]]; // T R B L
const EDGE_CORNERS = [[0, 1], [1, 2], [2, 3], [3, 0]]; // T=(a,b) R=(b,c) B=(c,d) L=(d,a)

/** Oriented segments per case: [[edgeFrom, edgeTo], ...] with the inside on a fixed side. */
const SEGS = (() => {
  const table = [];
  for (let cs = 0; cs < 16; cs++) {
    const inside = [(cs >> 3) & 1, (cs >> 2) & 1, (cs >> 1) & 1, cs & 1];
    const segs = [];
    const orient = (e1, e2, corner) => {
      const [m1x, m1y] = EDGE_MID[e1], [m2x, m2y] = EDGE_MID[e2], [kx, ky] = CORNER[corner];
      const cross = (m2x - m1x) * (ky - m1y) - (m2y - m1y) * (kx - m1x);
      segs.push(cross > 0 ? [e1, e2] : [e2, e1]);
    };
    if (cs === 10) {
      // a, c inside, saddle: keep them separate (4-connected insides)
      orient(3, 0, 0);
      orient(1, 2, 2);
    } else if (cs === 5) {
      // b, d inside
      orient(0, 1, 1);
      orient(2, 3, 3);
    } else {
      const crossed = [];
      for (let e = 0; e < 4; e++) {
        const [p, q] = EDGE_CORNERS[e];
        if (inside[p] !== inside[q]) crossed.push(e);
      }
      if (crossed.length === 2) orient(crossed[0], crossed[1], inside.indexOf(1));
    }
    table.push(segs);
  }
  return table;
})();

/**
 * Bounding boxes of every label value present in a label image.
 * @param {Uint16Array|Uint8Array|Int32Array} labels
 * @param {number} W
 * @param {number} H
 * @returns {Map<number, number[]>} label → [x0, y0, x1, y1] (inclusive pixels)
 */
export function labelBounds(labels, W, H) {
  const boxes = new Map();
  for (let y = 0; y < H; y++) {
    const row = y * W;
    let prev = -1, box = null;
    for (let x = 0; x < W; x++) {
      const l = labels[row + x];
      if (l === 0) continue;
      if (l !== prev) {
        prev = l;
        box = boxes.get(l);
        if (!box) boxes.set(l, (box = [x, y, x, y]));
      }
      if (x < box[0]) box[0] = x;
      if (x > box[2]) box[2] = x;
      if (y < box[1]) box[1] = y;
      if (y > box[3]) box[3] = y;
    }
  }
  return boxes;
}

/**
 * Trace the closed outlines of a region.
 * @param {ArrayLike<number>} labels  W×H label image
 * @param {number} W
 * @param {number} H
 * @param {Uint8Array} member  member[label] === 1 → pixel belongs to the region
 * @param {number[]} bbox  [x0, y0, x1, y1] inclusive pixel bounds of the region
 * @returns {Array<{ xy: Float64Array, out: Int32Array }>} loops: vertex coordinates
 *          (pixel units, pixel i spans [i, i+1]) and the label just outside each vertex (−1 = off-image)
 */
export function traceRegion(labels, W, H, member, bbox) {
  const [x0, y0, x1, y1] = bbox;
  const W2 = W + 2;
  const isIn = (px, py) => px >= 0 && py >= 0 && px < W && py < H && member[labels[py * W + px]] === 1;
  // key: (((py + 1) * (W + 2) + (px + 1)) << 1) | vertical
  const H_ = (px, py) => ((py + 1) * W2 + (px + 1)) * 2;
  const V_ = (px, py) => ((py + 1) * W2 + (px + 1)) * 2 + 1;
  // edge links from → to, kept in the order their "from" edges are found
  const next = links.reset();
  for (let y = y0 - 1; y <= y1; y++) {
    let a = isIn(x0 - 1, y), d = isIn(x0 - 1, y + 1);
    for (let x = x0 - 1; x <= x1; x++) {
      const b = isIn(x + 1, y), c = isIn(x + 1, y + 1);
      const cs = (a << 3) | (b << 2) | (c << 1) | d;
      if (cs !== 0 && cs !== 15) {
        for (let s = 0, n = SEG_N[cs]; s < n; s++) {
          next.set(edgeKey(SEG_E[cs * 4 + s * 2], x, y, H_, V_), edgeKey(SEG_E[cs * 4 + s * 2 + 1], x, y, H_, V_));
        }
      }
      a = b;
      d = c;
    }
  }
  // each loop starts at the first link not yet walked (as a Map's key order would)
  const loops = [];
  for (let q = 0; q < next.count; q++) {
    const start = next.keyAt(q);
    if (start < 0) continue;
    const keys = [];
    let k = start;
    for (;;) {
      const n = next.take(k);
      if (n < 0) break;
      keys.push(n);
      k = n;
      if (k === start) break;
    }
    if (keys.length < 3) continue;
    const xy = new Float64Array(keys.length * 2);
    const out = new Int32Array(keys.length);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const vert = key & 1;
      const idx = key >> 1;
      const px = (idx % W2) - 1;
      const py = Math.floor(idx / W2) - 1;
      // the two pixels this edge separates; exactly one is inside
      const qx = vert ? px : px + 1;
      const qy = vert ? py + 1 : py;
      xy[i * 2] = vert ? px + 0.5 : px + 1;
      xy[i * 2 + 1] = vert ? py + 1 : py + 0.5;
      const pIn = isIn(px, py);
      const ox = pIn ? qx : px, oy = pIn ? qy : py;
      out[i] = ox >= 0 && oy >= 0 && ox < W && oy < H ? labels[oy * W + ox] : -1;
    }
    loops.push({ xy, out });
  }
  return loops;
}

/** SEGS flattened: SEG_N[case] segments, SEG_E[case·4 + 2s + 0|1] = from|to edge of segment s. */
const SEG_N = Uint8Array.from(SEGS, (s) => s.length);
const SEG_E = new Int8Array(16 * 4);
SEGS.forEach((segs, cs) => segs.forEach(([e1, e2], s) => {
  SEG_E[cs * 4 + s * 2] = e1;
  SEG_E[cs * 4 + s * 2 + 1] = e2;
}));

/**
 * The edge links of one traceRegion call: an insertion-ordered map of
 * non-negative int keys to non-negative int values, as open addressing over
 * typed arrays reused from call to call (a Map's per-edge set/get/delete and
 * a fresh key iterator per loop were most of the tracing time). `take`
 * reads and removes a link; a removed key stays in its slot so probe chains
 * hold, and `keyAt` reports it as gone (−1).
 */
const links = {
  bits: 12,
  keys: new Int32Array(1 << 12).fill(-1),
  vals: new Int32Array(1 << 12),
  order: new Int32Array(1 << 11),
  count: 0,
  /** Empty the table (only the slots the last call used: the table may have grown large). */
  reset() {
    for (let q = 0; q < this.count; q++) this.keys[this.order[q]] = -1;
    this.count = 0;
    return this;
  },
  slot(k) {
    const mask = this.keys.length - 1;
    let i = Math.imul(k, 0x9e3779b1) >>> (32 - this.bits);
    while (this.keys[i] !== -1 && this.keys[i] !== k) i = (i + 1) & mask;
    return i;
  },
  set(k, v) {
    if (this.count >= this.order.length) this.grow();
    const i = this.slot(k);
    if (this.keys[i] === -1) {
      this.keys[i] = k;
      this.order[this.count++] = i;
    }
    this.vals[i] = v;
  },
  take(k) {
    const i = this.slot(k);
    if (this.keys[i] !== k) return -1;
    const v = this.vals[i];
    this.vals[i] = -1;
    return v;
  },
  keyAt(q) {
    const i = this.order[q];
    return this.vals[i] < 0 ? -1 : this.keys[i];
  },
  /** Double the table (only while links are being added: nothing removed yet). */
  grow() {
    const { keys, vals, order, count } = this;
    this.bits++;
    this.keys = new Int32Array(1 << this.bits).fill(-1);
    this.vals = new Int32Array(1 << this.bits);
    this.order = new Int32Array(1 << (this.bits - 1));
    this.count = 0;
    for (let q = 0; q < count; q++) this.set(keys[order[q]], vals[order[q]]);
  },
};

function edgeKey(e, x, y, H_, V_) {
  switch (e) {
    case 0: return H_(x, y); // top: horizontal edge between (x,y)-(x+1,y)
    case 1: return V_(x + 1, y); // right
    case 2: return H_(x, y + 1); // bottom
    default: return V_(x, y); // left
  }
}

/** Signed area of a closed loop (pixel units², y down). */
export function loopArea(xy) {
  let a = 0;
  const n = xy.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) a += xy[j * 2] * xy[i * 2 + 1] - xy[i * 2] * xy[j * 2 + 1];
  return a / 2;
}

// ---------------------------------------------------------------- smooth vertices

/**
 * Laplacian smoothing of a closed loop in place-free fashion (returns a new
 * array): each vertex moves towards the mean of its neighbours (¼ ½ ¼),
 * erasing the half-pixel staircase of marching squares. `pinned` vertices
 * (junctions between boundary runs) stay put.
 * @param {Float64Array} xy
 * @param {number} [iterations=2]
 * @param {Uint8Array|null} [pinned]
 * @returns {Float64Array}
 */
export function smoothLoop(xy, iterations = 2, pinned = null) {
  const n = xy.length / 2;
  if (n < 5) return xy;
  let a = Float64Array.from(xy);
  let b = new Float64Array(xy.length);
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n; i++) {
      if (pinned && pinned[i]) {
        b[i * 2] = a[i * 2];
        b[i * 2 + 1] = a[i * 2 + 1];
        continue;
      }
      const p = ((i + n - 1) % n) * 2, q = ((i + 1) % n) * 2;
      b[i * 2] = 0.25 * a[p] + 0.5 * a[i * 2] + 0.25 * a[q];
      b[i * 2 + 1] = 0.25 * a[p + 1] + 0.5 * a[i * 2 + 1] + 0.25 * a[q + 1];
    }
    [a, b] = [b, a];
  }
  return a;
}

// ---------------------------------------------------------------- simplify

function perpDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return (px - ax) ** 2 + (py - ay) ** 2;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const qx = ax + t * dx, qy = ay + t * dy;
  return (px - qx) ** 2 + (py - qy) ** 2;
}

/** Mark the RDP keepers of xy[i0..i1] (inclusive, indices mod n) into `keep`. */
function rdpRange(xy, n, i0, i1, eps2, keep) {
  const stack = [[i0, i1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    const span = (e - s + n) % n;
    if (span < 2) continue;
    const ax = xy[(s % n) * 2], ay = xy[(s % n) * 2 + 1];
    const bx = xy[(e % n) * 2], by = xy[(e % n) * 2 + 1];
    let best = -1, bestD = eps2;
    for (let k = 1; k < span; k++) {
      const i = (s + k) % n;
      const d = perpDist2(xy[i * 2], xy[i * 2 + 1], ax, ay, bx, by);
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) {
      keep[best] = 1;
      stack.push([s, best < s ? best + n : best], [best, e]);
    }
  }
}

/**
 * Simplify a closed loop, always keeping `fixed` vertices (indices).
 * @param {Float64Array} xy
 * @param {number} eps  tolerance in pixels
 * @param {number[]} [fixed]  vertex indices that must survive (sorted or not)
 * @returns {number[]} kept vertex indices in loop order
 */
export function simplifyLoop(xy, eps, fixed = []) {
  const n = xy.length / 2;
  if (n <= 4) return [...Array(n).keys()];
  const keep = new Uint8Array(n);
  const eps2 = eps * eps;
  let anchors = [...new Set(fixed)].sort((a, b) => a - b);
  if (anchors.length < 2) {
    // anchor the loop at two far-apart vertices
    const a0 = anchors.length ? anchors[0] : 0;
    let far = a0, farD = -1;
    for (let i = 0; i < n; i++) {
      const d = (xy[i * 2] - xy[a0 * 2]) ** 2 + (xy[i * 2 + 1] - xy[a0 * 2 + 1]) ** 2;
      if (d > farD) {
        farD = d;
        far = i;
      }
    }
    anchors = [...new Set([a0, far])].sort((a, b) => a - b);
  }
  for (const a of anchors) keep[a] = 1;
  for (let k = 0; k < anchors.length; k++) {
    const s = anchors[k];
    const e = k + 1 < anchors.length ? anchors[k + 1] : anchors[0] + n;
    rdpRange(xy, n, s, e, eps2, keep);
  }
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(i);
  return out;
}

/**
 * Simplify an open polyline (endpoints kept).
 * @param {number[]|Float64Array} xy
 * @param {number} eps
 * @returns {number[]} kept indices
 */
export function simplifyOpen(xy, eps) {
  const n = xy.length / 2;
  if (n <= 2) return [...Array(n).keys()];
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  // treat as a range on a "loop" of length n + 1 so modular maths never wraps
  rdpRange(xy, n + 1, 0, n - 1, eps * eps, keep);
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(i);
  return out;
}

// ---------------------------------------------------------------- smooth

/**
 * Cubic Bézier segments through points with centripetal Catmull-Rom tangents.
 * @param {number[]} pts  flat [x0, y0, x1, y1, ...]
 * @param {boolean} closed
 * @param {number} [cornerDeg=70]  turns sharper than this stay sharp
 * @returns {Float64Array} 8 numbers per segment: x0 y0 c1x c1y c2x c2y x1 y1
 */
export function bezierSegments(pts, closed, cornerDeg = 70) {
  const n = pts.length / 2;
  const segCount = closed ? n : n - 1;
  const out = new Float64Array(Math.max(0, segCount) * 8);
  if (n < 2) return out;
  const P = (i) => {
    if (closed) i = ((i % n) + n) % n;
    else i = Math.max(0, Math.min(n - 1, i));
    return i;
  };
  const cosLimit = Math.cos((cornerDeg * Math.PI) / 180);
  const sharp = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!closed && (i === 0 || i === n - 1)) continue;
    const a = P(i - 1), b = i, c = P(i + 1);
    const ux = pts[b * 2] - pts[a * 2], uy = pts[b * 2 + 1] - pts[a * 2 + 1];
    const vx = pts[c * 2] - pts[b * 2], vy = pts[c * 2 + 1] - pts[b * 2 + 1];
    const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
    if (lu < 1e-9 || lv < 1e-9) continue;
    if ((ux * vx + uy * vy) / (lu * lv) < cosLimit) sharp[i] = 1;
  }
  for (let s = 0; s < segCount; s++) {
    const i1 = s, i2 = P(s + 1);
    const i0 = sharp[i1] ? i1 : P(s - 1);
    const i3 = sharp[i2] ? i2 : P(s + 2);
    const x0 = pts[i0 * 2], y0 = pts[i0 * 2 + 1];
    const x1 = pts[i1 * 2], y1 = pts[i1 * 2 + 1];
    const x2 = pts[i2 * 2], y2 = pts[i2 * 2 + 1];
    const x3 = pts[i3 * 2], y3 = pts[i3 * 2 + 1];
    const d1 = Math.sqrt(Math.hypot(x1 - x0, y1 - y0));
    const d2 = Math.sqrt(Math.hypot(x2 - x1, y2 - y1));
    const d3 = Math.sqrt(Math.hypot(x3 - x2, y3 - y2));
    let c1x, c1y, c2x, c2y;
    if (d1 < 1e-6) {
      c1x = x1 + (x2 - x1) / 3;
      c1y = y1 + (y2 - y1) / 3;
    } else {
      const A = d1 * d1, B = d2 * d2, den = 3 * d1 * (d1 + d2);
      c1x = (A * x2 - B * x0 + (2 * A + 3 * d1 * d2 + B) * x1) / den;
      c1y = (A * y2 - B * y0 + (2 * A + 3 * d1 * d2 + B) * y1) / den;
    }
    if (d3 < 1e-6) {
      c2x = x2 - (x2 - x1) / 3;
      c2y = y2 - (y2 - y1) / 3;
    } else {
      const C = d3 * d3, B = d2 * d2, den = 3 * d3 * (d3 + d2);
      c2x = (C * x1 - B * x3 + (2 * C + 3 * d3 * d2 + B) * x2) / den;
      c2y = (C * y1 - B * y3 + (2 * C + 3 * d3 * d2 + B) * y2) / den;
    }
    const o = s * 8;
    out[o] = x1; out[o + 1] = y1; out[o + 2] = c1x; out[o + 3] = c1y;
    out[o + 4] = c2x; out[o + 5] = c2y; out[o + 6] = x2; out[o + 7] = y2;
  }
  return out;
}

/** Format a number for SVG path data (1 decimal, trimmed). */
export const fmt = (v) => {
  const r = Math.round(v * 10) / 10;
  return Object.is(r, -0) ? '0' : String(r);
};

/**
 * SVG path data for Bézier segments (as returned by bezierSegments).
 * @param {Float64Array} segs
 * @param {{ closed?: boolean, map?: (x:number, y:number) => [number, number], from?: number, to?: number }} [o]
 *        map transforms coordinates; from/to select a segment range (to exclusive)
 */
export function pathData(segs, o = {}) {
  const map = o.map ?? ((x, y) => [x, y]);
  const from = o.from ?? 0;
  const to = o.to ?? segs.length / 8;
  if (to <= from) return '';
  let d = '';
  for (let s = from; s < to; s++) {
    const k = s * 8;
    if (s === from) {
      const [x, y] = map(segs[k], segs[k + 1]);
      d += `M${fmt(x)} ${fmt(y)}`;
    }
    const [ax, ay] = map(segs[k + 2], segs[k + 3]);
    const [bx, by] = map(segs[k + 4], segs[k + 5]);
    const [cx, cy] = map(segs[k + 6], segs[k + 7]);
    d += `C${fmt(ax)} ${fmt(ay)} ${fmt(bx)} ${fmt(by)} ${fmt(cx)} ${fmt(cy)}`;
  }
  if (o.closed) d += 'Z';
  return d;
}
