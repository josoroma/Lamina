// Plate labels: the overlay that names what a living plate shows.
//
// Every frame the App projects each label anchor to CSS pixels and calls
// ui.renderLabels(items, area, fig). We lay the labels out like a printed
// scientific plate: pills stacked flush in the margins beside the figure,
// each joined to its anchor by a hairline leader with a short typographic
// elbow and a small anchor dot.
//
//  - Keep-out: a pill never sits on the figure (its screen rectangle `fig`,
//    when the App passes it) nor near any anchor. A column that cannot fit
//    beside the figure is never clamped back over it: its widest pills move
//    to the other column, then to a row above (or below) the figure — on a
//    phone that is the white canvas above the page. Rows step over printed
//    text (`area.avoid`; on phones the recto's running head and caption), and
//    while inspecting every pill keeps right of the gutter (`area.spine`).
//  - Stability: the layout is a printed key, not a swarm. Pills are placed
//    from each anchor smoothed over about one loop (page-relative), so a
//    playing loop barely moves them: the leaders follow the motion. Each label
//    keeps its side for the spread (it changes only after its anchor has sat
//    on the other side for longer than a loop), column positions follow an
//    envelope of the figure that holds for a loop, and a pill keeps its
//    column with a little slack rather than flicker at the edge of its room.
//    A label the App hides for a moment (a tongue flicking out of sight, a
//    bone turning behind the skull) keeps its slot, invisible, for about a
//    loop, so its neighbours never slide into the gap and back.
//  - No sliding through: a pill that changes slot, row or place in the order
//    fades out first and reappears at its new place only once its neighbours
//    have eased out of the way. Each column (or row) is solved exactly as an
//    order-preserving least-squares problem (pool-adjacent-violators), and the
//    drawn positions are projected through the same solver every frame, so
//    pills never overlap in motion either. Columns run between the rows.
//  - Leaders: neighbours trade places when their leaders cross, and a column
//    pill whose leader would cut through the rows' leaders joins the rows.
//  - Choice: when there are more labels than room, the App's `rank` decides
//    (look-closer notes first), then depth — also when a column cannot hold
//    its pills (a landscape phone's short columns) or, resting on a figure
//    that fills the view, cannot keep them off the anchors: the least
//    important gives way, up to three. A pill resting on the figure keeps
//    off the anchors where it can (_offAnchors).
//  - Cost: DOM nodes are keyed by id and reused; per frame we only write
//    transforms, opacity and SVG points, and only when they changed. Text is
//    measured once per label (one batched layout read), never in the loop.
//  - Detail: hover, focus or tap a pill for a small card with its detail text
//    (beside the pill on desktop, docked above the toolbar on phones).
//  - Marks: a label never hides what it names. Body features get a small
//    dot; face features (an item's `mark`, or its label's) are pointed at,
//    not covered: a hairline ring around the feature when it is big enough
//    on screen (`r`, its projected radius), else a bare leader that stops
//    just outside it. Two rings closer than their radii allow keep only the
//    higher-ranked one; on a head under 40 px every face mark is a tick. The
//    leader's white halo always stops 8 px before the leader ends, so it never
//    whitens the feature either.
//  - Small heads: a head under 40 px on screen carries one face label, under
//    80 px two (the App's rank chooses: focused, look-closer, then figure
//    order); the rest show where the head is larger (inspect).
//  - Screen: no pill and no card is ever drawn past the viewport's margin,
//    and a card keeps off the figure when there is room beside it.
import { t } from '../../i18n/index.js';
import { h, s, clamp } from './dom.js';

const GAP = 6; // px between stacked pills (8 on touch screens: see resize)
const ELBOW = 14; // px tick leaving a pill before the leader turns to its anchor
const LEADER_MIN = 30; // px a pill keeps clear of every anchor
const FIG_GAP = 10; // px a pill keeps clear of the figure's rectangle (a leader may cross it)
const HYSTERESIS = 18; // px (at least) an anchor must cross the figure centre to count as "other side"
const MAX_ITEMS = 64;
const SCREEN_MARGIN = 8; // px pills keep from the viewport edge
const FORGET_FRAMES = 240; // drop DOM for labels unseen this long (and invisible)
const DIMMED = 0.55; // other labels' leaders and marks while one is read (their pills keep their paper, words in ink-2: ≥ 4.5:1)
const SETTLE = 0.4; // s an envelope edge holds while the loop is paused
const RELEASE = 0.5; // s time constant of an envelope edge shrinking back
const SWAP_HOLD = 0.5; // s two leaders must stay crossed (or anchors inverted) before their pills trade places
const SETTLING = 1.2; // s after a fresh layout (spread, resize, inspect) while the camera still glides
const LEADER_SLACK = 18; // px a column may give up of LEADER_MIN rather than leave its side
const MEMBER_SLACK = 6; // px a pill already drawn in a column may overrun its room before it leaves
const RESERVE_PAUSED = 0.6; // s a label the App hides keeps its slot while paused (a whole loop while playing)
const WAIT_MAX = 0.7; // s a pill waits for its neighbours to make room before it shows anyway
const SPINE_PAD = 4; // px pills keep right of the gutter while inspecting
// A figure page prints its running head and plate number above the plate
// mark (to 10 % of the page) and its caption, scale note and folio below it
// (from 80 %; typeset's plate layout). Phone rows step over them when the App
// passes no printed rectangles of its own. These are fractions of the recto's
// screen rectangle: the camera looks down on a portrait phone's page at 58°
// or more, so the near (tail) part of the page takes more of the screen and
// the caption starts at about 72 % of the rectangle, not 80 %.
const PRINTED_HEAD = 0.1;
const PRINTED_FOOT = 0.68;
const BOARD_EDGE = 10; // px the cover board shows beyond the page's head and tail on a phone
const MAX_AVOID = 4;
// anchor marks (see the header)
const RING_MIN = 2.5; // px a feature's projected radius needs for a ring (smaller: a tick)
const RING_PAD = 1.5; // px between the feature's edge and its ring (the leader stops at the ring)
const TICK_GAP = 2.5; // px a tick's leader stops short of its feature
const HALO_STOP = 8; // px before the leader's end where its white halo stops
const CROWD_GAP = 4; // px two rings need between them, else the lower-ranked becomes a tick
const FACE_MIN = 40; // px: on a head projected smaller than this (item.headPx), one face label shows and every face mark is a tick
const FACE_TWO = 80; // px: … smaller than this, two face labels show
const FACE_GROW = 1.1; // a head must grow this much past a step before more face labels show (no blinking in the loop)
const HEAD_PAD = 0.5; // without the App's head box: the face anchors' box grown by this × the head's projected length (headPx)
const BEND_PAD = 2.5; // px a leader keeps outside another face feature's ring (it bends round it)
const CARD_GAP = 8; // px between a pill and its card
const MARKS = new Set(['dot', 'ring', 'tick']);
const SLOT_L = -1; // column left of the figure (pills right-aligned)
const SLOT_R = 1; // column right of the figure (pills left-aligned)
const SLOT_T = -2; // rows above the figure (leaders drop down)
const SLOT_B = 2; // rows below the figure (leaders rise)

/**
 * Order-preserving least-squares placement of a column of equal-height labels.
 * Finds centres p_i minimising Σ(p_i − d_i)² subject to p_{i+1} − p_i ≥ pitch,
 * p_0 ≥ lo and p_{n−1} ≤ hi. With q_i = p_i − i·pitch the spacing constraint
 * becomes q non-decreasing (isotonic regression), solved exactly by
 * pool-adjacent-violators; clipping q to the bounds keeps it optimal. When the
 * column cannot fit, the pitch is squeezed to fill [lo, hi].
 * @param {number} n                number of labels
 * @param {ArrayLike<number>} d     desired centres, in column order
 * @param {number} pitch            minimum centre-to-centre distance
 * @param {number} lo               smallest centre for the first label
 * @param {number} hi               largest centre for the last label
 * @param {Float64Array} out        receives the solved centres (length ≥ n)
 * @param {{ mean: Float64Array, count: Int32Array }} ws  scratch (length ≥ n)
 * @returns {Float64Array} out
 */
export function solveColumn(n, d, pitch, lo, hi, out, ws) {
  if (n <= 0) return out;
  if (n > 1 && (n - 1) * pitch > hi - lo) pitch = Math.max(0, (hi - lo) / (n - 1));
  const mean = ws.mean;
  const count = ws.count;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    mean[nb] = d[i] - i * pitch;
    count[nb] = 1;
    nb++;
    while (nb > 1 && mean[nb - 2] > mean[nb - 1]) {
      const c = count[nb - 2] + count[nb - 1];
      mean[nb - 2] = (mean[nb - 2] * count[nb - 2] + mean[nb - 1] * count[nb - 1]) / c;
      count[nb - 2] = c;
      nb--;
    }
  }
  const qHi = Math.max(lo, hi - (n - 1) * pitch);
  let i = 0;
  for (let b = 0; b < nb; b++) {
    const q = Math.min(qHi, Math.max(lo, mean[b]));
    for (let k = 0; k < count[b]; k++, i++) out[i] = q + i * pitch;
  }
  return out;
}

/**
 * The same solve for a row of pills of different widths (left edges x_i):
 * minimises Σ(x_i − d_i)² subject to x_{i+1} ≥ x_i + w_i + gap, x_0 ≥ lo and
 * x_{n−1} + w_{n−1} ≤ hi. With o_i = Σ_{k<i}(w_k + gap), q_i = x_i − o_i must be
 * non-decreasing. A row wider than [lo, hi] starts at lo (callers wrap rows).
 * @param {number} n
 * @param {ArrayLike<number>} d     desired left edges, in row order
 * @param {ArrayLike<number>} w     widths
 * @param {number} gap
 * @param {number} lo
 * @param {number} hi
 * @param {Float64Array} out        receives the solved left edges
 * @param {{ mean: Float64Array, count: Int32Array, off: Float64Array }} ws
 * @returns {Float64Array} out
 */
export function solveRow(n, d, w, gap, lo, hi, out, ws) {
  if (n <= 0) return out;
  const off = ws.off;
  const mean = ws.mean;
  const count = ws.count;
  let o = 0;
  for (let i = 0; i < n; i++) {
    off[i] = o;
    o += w[i] + gap;
  }
  let nb = 0;
  for (let i = 0; i < n; i++) {
    mean[nb] = d[i] - off[i];
    count[nb] = 1;
    nb++;
    while (nb > 1 && mean[nb - 2] > mean[nb - 1]) {
      const c = count[nb - 2] + count[nb - 1];
      mean[nb - 2] = (mean[nb - 2] * count[nb - 2] + mean[nb - 1] * count[nb - 1]) / c;
      count[nb - 2] = c;
      nb--;
    }
  }
  const qHi = Math.max(lo, hi - (off[n - 1] + w[n - 1]));
  let i = 0;
  for (let b = 0; b < nb; b++) {
    const q = Math.min(qHi, Math.max(lo, mean[b]));
    for (let k = 0; k < count[b]; k++, i++) out[i] = q + off[i];
  }
  return out;
}

/** NaN-safe "changed by more than eps" (caches start as NaN = never written). */
const differs = (a, b, eps) => !(Math.abs(a - b) <= eps);
// layout decisions use the loop-smoothed anchor (kx, ky), so periodic motion never reorders
const byKeyX = (a, b) => a.kx - b.kx;
const byWidth = (a, b) => a.w - b.w;
/** Most important first: shown before reserved (hidden) ones, then the App's rank, then the nearer anchor. */
const byPriority = (a, b) => a.ghost - b.ghost || b.rank - a.rank || a.score - b.score;
// rings claim their room by the App's rank (stable sort: figure order breaks ties)
const byRank = (a, b) => b.rank - a.rank;
/** Rows are filled with shown labels before reserved ones, the most decided (above or below) first. */
const byBand = (a, b) => a.ghost - b.ghost || b.bandPref - a.bandPref;
/** Face labels on a small head: the one being read first, then as byPriority. */
const byFace = (a, b) => b.active - a.active || byPriority(a, b);

/**
 * How many face labels a head of `px` (its projected length) carries, as a
 * step: 0 under FACE_MIN (one), 1 under FACE_TWO (two), 2 above (all). A head
 * shrinking past a step takes it at once; growing, only FACE_GROW beyond it.
 * @param {number} px
 * @param {number} prev  last frame's step (-1: none)
 */
function headStep(px, prev) {
  const down = px < FACE_MIN ? 0 : px < FACE_TWO ? 1 : 2;
  if (prev < 0 || down < prev) return down;
  const up = px < FACE_MIN * FACE_GROW ? 0 : px < FACE_TWO * FACE_GROW ? 1 : 2;
  return up > prev ? up : prev;
}
const FACE_LIMIT = [1, 2, Infinity];

/** Area (px²) shared by the rectangle (x, y, w, h) and [x0, x1] × [y0, y1]. */
const overlap = (x, y, w, h, x0, y0, x1, y1) => Math.max(0, Math.min(x + w, x1) - Math.max(x, x0)) * Math.max(0, Math.min(y + h, y1) - Math.max(y, y0));

// leader scratch: up to three points (pill edge, elbow, anchor) as x0 y0 x1 y1 x2 y2
const LA = new Float64Array(6);
const LB = new Float64Array(6);

/**
 * A leader as drawn from a pill at (x, y) in `slot` to the anchor (ax, ay):
 * a short elbow out of the pill, then straight to the anchor.
 * @returns {number} number of points written to `out` (2 or 3)
 */
function leaderPoints(out, slot, x, y, w, hh, ax, ay) {
  let sx;
  let sy;
  let ex;
  let ey;
  let bend;
  if (slot === SLOT_T || slot === SLOT_B) {
    const dir = slot === SLOT_T ? 1 : -1;
    sx = x + w / 2;
    sy = slot === SLOT_T ? y + hh : y;
    ex = sx;
    ey = sy + dir * ELBOW;
    bend = (ay - ey) * dir > 0;
  } else {
    const dir = slot < 0 ? 1 : -1;
    sx = slot < 0 ? x + w : x;
    sy = y + hh / 2;
    ex = sx + dir * ELBOW;
    ey = sy;
    bend = (ax - ex) * dir > 0;
  }
  out[0] = sx;
  out[1] = sy;
  if (bend) {
    out[2] = ex;
    out[3] = ey;
    out[4] = ax;
    out[5] = ay;
    return 3;
  }
  out[2] = ax;
  out[3] = ay;
  return 2;
}

/**
 * Where a tangent from (qx, qy), outside the circle (cx, cy, r), touches it
 * on the side (nx, ny) points to: out[o], out[o + 1].
 */
function tangentPoint(qx, qy, cx, cy, r, nx, ny, out, o) {
  const d = Math.hypot(qx - cx, qy - cy);
  const wx = (qx - cx) / d;
  const wy = (qy - cy) / d;
  const c = r / d; // the touching points: c·w ± s·w⊥ from the centre (unit radius)
  const s = Math.sqrt(Math.max(0, 1 - c * c));
  let ex = c * wx - s * wy;
  let ey = c * wy + s * wx;
  if (ex * nx + ey * ny < (c * wx + s * wy) * nx + (c * wy - s * wx) * ny) {
    ex = c * wx + s * wy;
    ey = c * wy - s * wx;
  }
  out[o] = cx + r * ex;
  out[o + 1] = cy + r * ey;
}

const orient = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

/** Do two segments properly cross (touching ends do not count)? */
function segmentsCross(p0x, p0y, p1x, p1y, q0x, q0y, q1x, q1y) {
  const d1 = orient(q0x, q0y, q1x, q1y, p0x, p0y);
  const d2 = orient(q0x, q0y, q1x, q1y, p1x, p1y);
  if (!((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0))) return false;
  const d3 = orient(p0x, p0y, p1x, p1y, q0x, q0y);
  const d4 = orient(p0x, p0y, p1x, p1y, q1x, q1y);
  return (d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0);
}

/** Do two leader polylines (from leaderPoints) cross? */
function polylinesCross(a, na, b, nb) {
  for (let i = 0; i + 1 < na; i++) {
    for (let j = 0; j + 1 < nb; j++) {
      if (segmentsCross(a[2 * i], a[2 * i + 1], a[2 * i + 2], a[2 * i + 3], b[2 * j], b[2 * j + 1], b[2 * j + 2], b[2 * j + 3])) return true;
    }
  }
  return false;
}

/**
 * Read a rectangle given as [x0, y0, x1, y1], {x0, y0, x1, y1} or {x, y, w, h}.
 * @returns {boolean} valid
 */
function readRect(r, o) {
  if (!r) return false;
  if (Array.isArray(r) || ArrayBuffer.isView(r)) {
    o.x0 = +r[0];
    o.y0 = +r[1];
    o.x1 = +r[2];
    o.y1 = +r[3];
  } else {
    o.x0 = +(r.x0 ?? r.x);
    o.y0 = +(r.y0 ?? r.y);
    o.x1 = r.x1 != null ? +r.x1 : o.x0 + +r.w;
    o.y1 = r.y1 != null ? +r.y1 : o.y0 + +r.h;
  }
  return o.x1 > o.x0 && o.y1 > o.y0; // NaN fails too
}

/**
 * Bounding rectangle in area-relative units that grows at once and shrinks
 * only after an edge has not been reached for `hold` seconds — one loop while
 * the animation plays — so periodic motion never moves the columns.
 */
class Envelope {
  constructor() {
    this.v = new Float64Array(4); // x0 y0 x1 y1
    this.age = new Float64Array(4);
    this.ok = false;
  }

  reset() {
    this.ok = false;
  }

  add(x0, y0, x1, y1, dt, hold) {
    const v = this.v;
    if (!this.ok) {
      v[0] = x0;
      v[1] = y0;
      v[2] = x1;
      v[3] = y1;
      this.age.fill(0);
      this.ok = true;
      return;
    }
    const k = 1 - Math.exp(-dt / RELEASE);
    for (let i = 0; i < 4; i++) {
      const cur = i === 0 ? x0 : i === 1 ? y0 : i === 2 ? x1 : y1;
      const outward = i < 2 ? cur <= v[i] : cur >= v[i];
      if (outward) {
        v[i] = cur;
        this.age[i] = 0;
      } else if ((this.age[i] += dt) > hold) v[i] += (cur - v[i]) * k;
    }
  }
}

/** One label's DOM and animation state (reused across frames by id). */
class LabelNode {
  constructor(id) {
    this.id = id;
    this.text = '';
    this.detail = '';
    this.textEl = h('span', { class: 'lam-pill-text' });
    this.el = h('button', { type: 'button', class: 'lam-pill', 'aria-expanded': 'false', style: { visibility: 'hidden' } }, this.textEl);
    this.el.dataset.labelId = id;
    this.halo = s('polyline', { class: 'lam-leader-halo' });
    this.line = s('polyline', { class: 'lam-leader-line' });
    this.ring = s('circle', { class: 'lam-leader-ring', r: '0' });
    this.dot = s('circle', { class: 'lam-leader-dot', r: '2.25' });
    this.g = s('g', { class: 'lam-leader', style: { display: 'none' } }, this.halo, this.line, this.ring, this.dot);
    this.mark = 'dot'; // what the App asks for: 'dot' (body) | 'ring' | 'tick' (face features)
    this.ar = 0; // the feature's projected radius (CSS px), for a ring
    this.headPx = NaN; // the head's projected length (CSS px): given by the App, else estimated (see render)
    this.headCm = 0; // the head's length (cm, label.headSize): marks a face label
    this.hb = new Float64Array(4); // the App's screen box of its head (item.headBox), when hbOk
    this.hbOk = false;
    this.step = -1; // headStep of its head (-1: not a face label, or its head's size unknown)
    this.hugX = NaN; // resting on the figure: its pill's left x beside the head (_hug), else NaN
    this.hugAt = 0; // … the head's side it is beside this frame (-1 left, +1 right, 0 none)
    this.hugSide = 0; // the side it prefers (its anchor's side of the head), kept for the spread
    this.drawHug = 0; // the side it is drawn beside (changes after a fade-out, like a slot)
    this.bend = 0; // its leader bends round another face feature: the side (-1, +1), 0 straight
    this.active = 0; // 1 while its card is open (it keeps its place on a small head)
    this.capped = false; // a face label over its small head's limit this frame (_capFaces)
    this.crowded = false; // a ring too close to a higher-ranked one (drawn as a tick)
    this.drawMark = 'dot'; // what is drawn this frame
    this.w = 0;
    this.h = 0;
    this.dirty = true;
    this.home = 0; // preferred column for this spread: -1 left, +1 right (0 = undecided)
    this.crossT = 0; // s the anchor has sat on the far side of the figure
    this.slot = 0; // where the layout wants the pill this frame (SLOT_*)
    this.away = 0; // where it goes while it does not fit beside the figure on its own side
    this.bandAt = -1; // layout run in which it kept its band row (sticky rows)
    this.side = 0; // where the pill is drawn (changes after a fade-out)
    this.switching = false; // fading out to move to another slot or row
    this.inOrder = 0; // slot whose order list holds this node (0 = none)
    this.invT = 0; // s this pill and its successor have wanted to trade places
    this.dip = false; // fading out to trade places with a neighbour
    this.row = 0; // band row the layout wants (0 = nearest the figure)
    this.drawRow = 0; // band row the pill is drawn in
    this.tgtSide = 0; // slot whose solve last wrote tx / ty
    this.ghost = false; // hidden by the App a moment ago: keeps its slot, invisible
    this.goneT = 0; // s since the App stopped showing it
    this.ready = false; // its place is clear: it may show
    this.waitT = 0; // s it has waited for its neighbours to make room
    this.cutT = 0; // s its column leader has cut through the rows' leaders
    this.preferBand = false; // joins the rows (its column leader crossed theirs)
    this.bandPref = 0; // how clearly its anchor belongs to the rows above or below (px)
    this.covered = false; // under an open popover: hidden with its leader
    this.ax = 0; // anchor (CSS px)
    this.ay = 0;
    this.ku = NaN; // anchor smoothed over about a loop, page-relative (zoom and pan keep it valid)
    this.kv = NaN;
    this.kx = 0; // … and in CSS px this frame
    this.ky = 0;
    this.depth = 0;
    this.rank = 0;
    this.occluded = false;
    this.far = false;
    this.x = 0; // pill top-left, current
    this.y = 0;
    this.tx = 0; // pill top-left, target
    this.ty = 0;
    this.op = 0;
    this.dimmed = false; // another label is being read: this one steps back (its leader fades, its words turn ink-2)
    this.dv = 1; // the leader's share of op: 1, easing to DIMMED while dimmed
    this.placed = false;
    this.want = false;
    this.chosen = false;
    this.wasChosen = false;
    this.score = 0;
    this.lastSeen = 0;
    // last written values (skip redundant DOM writes)
    this.wx = NaN;
    this.wy = NaN;
    this.wax = NaN;
    this.way = NaN;
    this.wop = -1;
    this.wdv = -1;
    this.wdim = false;
    this.wvis = false;
    this.wfar = false;
    this.wside = 0;
    this.wmark = '';
    this.war = NaN;
  }
}

/**
 * Scientific-plate label overlay. Owned by createUI; the App reaches it
 * through ui.renderLabels(items, area, fig).
 */
export class LabelOverlay {
  /**
   * @param {HTMLElement} parent
   * @param {{ idPrefix?: string, reducedMotion?: boolean }} [o]
   */
  constructor(parent, { idPrefix = 'lam', reducedMotion = false } = {}) {
    this.reducedMotion = reducedMotion;
    this.enabled = true;
    this.busy = false;
    this.compact = false;
    this.coarse = false;
    this.maxWide = 24;
    this.maxCompact = 6; // the App's own cap on narrow screens; its ranking decides which
    this.vw = innerWidth;
    this.vh = innerHeight;
    this.safeTop = 0;
    this.safeBottom = this.vh;
    this.pillMax = 200;
    this.pillH = 24;
    this.gap = GAP;
    this.frame = 0;
    this.lastT = 0;
    this.playing = true;
    this.duration = 5;
    this.nodes = new Map();
    this.cand = [];
    this.lay = []; // chosen labels plus the reserved (hidden) ones
    this._release = false;
    this.rowLoose = false; // rows may reach over the verso this frame (nothing else had room)
    this.noRoom = false; // a pill had no place but over anchors, or a column squeezed its pills, this frame (_assign)
    this.runs = 0; // layout runs so far (_assign)
    // slot assignment scratch
    this.fitL = [];
    this.fitR = [];
    this.overL = [];
    this.overR = [];
    this.band = [];
    this.bandT = [];
    this.bandB = [];
    this.rest = [];
    this.pref = [];
    this.keep = [];
    this.packTmp = [];
    this.projTmp = [];
    this.rings = []; // ring candidates this frame (_marks)
    this.faces = []; // face labels this frame (_capFaces)
    this.hugTmp = []; // _hug scratch
    // the head pills keep off (one per figure, as every figure has): this
    // frame's box (CSS px), held over a loop like the figure's (area-relative)
    this.headEnv = new Envelope();
    this.headRect = { x0: 0, y0: 0, x1: 0, y1: 0, ok: false };
    this._hr = { x0: 0, y0: 0, x1: 0, y1: 0 }; // readRect scratch
    this._hn = { x0: 0, y0: 0, x1: 0, y1: 0 }; // the head this frame, before its envelope
    // face features leaders bend round: x, y, radius (CSS px) and the node (_feats)
    this.feats = new Float64Array(MAX_ITEMS * 3);
    this.featNode = [];
    this.featN = 0;
    this.featKey = 0; // their positions summed: a change redraws every leader (_write)
    this.featMoved = false;
    this.bendXY = new Float64Array(4); // _bend's corner (x, y), or its two tangent points
    this.pxPerCm = NaN; // the head's scale on screen last estimated (render)
    this.cardPick = -1; // which of the card's places (_placeCard) it holds
    // drawn order per slot (persistent: pills keep their order between frames)
    this.ordL = [];
    this.ordR = [];
    this.ordT = [];
    this.ordB = [];
    this.domOrder = [];
    this._domI = 0;
    this._domSame = true;
    this._lo = 0; // column run scratch (_colRange)
    this._hi = 0;
    this.ws = { mean: new Float64Array(MAX_ITEMS), count: new Int32Array(MAX_ITEMS), off: new Float64Array(MAX_ITEMS) };
    this.desired = new Float64Array(MAX_ITEMS);
    this.widths = new Float64Array(MAX_ITEMS);
    this.solved = new Float64Array(MAX_ITEMS);
    this.figEnv = new Envelope();
    this.ancEnv = new Envelope();
    this.lastAw = 0;
    this.lastAh = 0;
    this.sinceReset = 0;
    // frame geometry (reused object, no per-frame allocation)
    this.geo = {
      ax0: 0, aw: 1, inset: 14, floorL: 0, ceilR: 0, leftMax: 0, rightMin: 0, leftHard: 0, rightHard: 0,
      top: 0, bottom: 0, capacity: 1, pitch: 30, bandTopHi: 0, bandBotLo: 0, rowsT: 0, rowsB: 0,
      edgeL: 0, edgeR: 0, rowLo: 0, rowHi: 0, outR: false,
      loose: new Float64Array(4), // rows before they stepped over printed text: bandTopHi bandBotLo rowTop rowBottom
      // per column [left, right]: free run, capacity, and the run left between the band rows
      topC: new Float64Array(2), bottomC: new Float64Array(2), capC: new Int32Array(2),
      colTopC: new Float64Array(2), colBottomC: new Float64Array(2),
    };
    this.figRect = { x0: 0, y0: 0, x1: 0, y1: 0, ok: false, app: false }; // app: from the App's figure rect
    this.figCard = { x0: 0, y0: 0, x1: 0, y1: 0 }; // the App's figure rect alone (else the anchors'): what a card keeps off
    // printed text rows keep off, the gutter while inspecting, an open popover
    this.avoid = Array.from({ length: MAX_AVOID }, () => ({ x0: 0, y0: 0, x1: 0, y1: 0 }));
    this.avoidN = 0;
    this.sp = new Float64Array(4);
    this.spineOk = false;
    this.cover = { x0: 0, y0: 0, x1: 0, y1: 0, ok: false };

    // detail card
    this.activeId = null;
    this.pinned = false;
    this.autoFocus = false; // card opened because the App flagged item.focus
    this.cardId = `${idPrefix}-label-card`;
    this.cardKicker = h('p', { class: 'lam-card-kicker' });
    this.cardText = h('p', { class: 'lam-card-text' });
    this.card = h('div', { class: 'lam-card', id: this.cardId, role: 'tooltip' }, this.cardKicker, this.cardText);
    this.cardW = 260;
    this.cardH = 80;
    this.cardX = NaN;
    this.cardY = NaN;
    this.cardAway = false; // its pill is between places (fading to another slot): the card waits, unseen
    this.cardXY = new Float64Array(12); // _placeCard's candidate places (x, y)
    this._showT = 0;
    this._hideT = 0;

    this.svg = s('svg', { class: 'lam-leaders', 'aria-hidden': 'true', focusable: 'false' });
    this.pills = h('div', { class: 'lam-pills' });
    this.el = h('div', { class: 'lam-labels', role: 'group' }, this.svg, this.pills, this.card);
    this.localize();
    parent.append(this.el);

    this._onClick = (e) => {
      const n = this._nodeFrom(e.target);
      if (!n) return;
      if (this.activeId === n.id && this.pinned) this.closeCard();
      else this.openCard(n, true);
      // pointer users should not leave focus on a moving pill (Space would
      // re-toggle it instead of reaching the App); keyboard users keep it
      if (e.detail > 0 && document.activeElement === n.el) n.el.blur();
    };
    this._onOver = (e) => {
      if (e.pointerType !== 'mouse') return;
      const n = this._nodeFrom(e.target);
      if (!n) return;
      clearTimeout(this._hideT);
      if (this.activeId === n.id) return;
      clearTimeout(this._showT);
      this._showT = setTimeout(() => this.openCard(n, false), this.activeId ? 0 : 70);
    };
    this._onOut = (e) => {
      if (e.pointerType !== 'mouse') return;
      const n = this._nodeFrom(e.target);
      if (!n || n.el.contains(e.relatedTarget)) return;
      clearTimeout(this._showT);
      this._scheduleClose();
    };
    this._onFocusIn = (e) => {
      const n = this._nodeFrom(e.target);
      if (n && n.el.matches(':focus-visible')) this.openCard(n, false);
    };
    this._onFocusOut = () => {
      if (!this.pinned) this._scheduleClose();
    };
    this._onCardEnter = () => clearTimeout(this._hideT);
    this._onCardLeave = () => this._scheduleClose();
    this._onDocDown = (e) => {
      if (this.activeId && this.pinned && !this.pills.contains(e.target) && !this.card.contains(e.target)) this.closeCard();
    };
    this.pills.addEventListener('click', this._onClick);
    this.pills.addEventListener('pointerover', this._onOver);
    this.pills.addEventListener('pointerout', this._onOut);
    this.pills.addEventListener('focusin', this._onFocusIn);
    this.pills.addEventListener('focusout', this._onFocusOut);
    this.card.addEventListener('pointerenter', this._onCardEnter);
    this.card.addEventListener('pointerleave', this._onCardLeave);
    document.addEventListener('pointerdown', this._onDocDown, true);
  }

  // ------------------------------------------------------------ configuration
  /**
   * The overlay's own words in the current language (its accessible name).
   * Label texts arrive translated with the items; an open card follows them.
   */
  localize() {
    this.el.setAttribute('aria-label', t('Figure labels'));
  }

  /**
   * Update the layout frame.
   * @param {number} vw  viewport width (CSS px)
   * @param {number} vh  viewport height
   * @param {{ top?: number, bottom?: number, compact?: boolean, coarse?: boolean }} [o]
   *        top/bottom: free band between the top bar and the caption/toolbar;
   *        coarse: touch screen (taller pills, wider gaps: fingertip targets)
   */
  resize(vw, vh, { top = 0, bottom = vh, compact = false, coarse = false } = {}) {
    if (vw !== this.vw || vh !== this.vh) this._resetLayout();
    this.vw = vw;
    this.vh = vh;
    this.safeTop = top;
    this.safeBottom = bottom;
    this.gap = coarse ? 8 : GAP;
    const pillMax = Math.round(compact ? Math.min(200, vw * 0.44) : 210);
    if (pillMax !== this.pillMax || compact !== this.compact || coarse !== this.coarse) {
      this.coarse = coarse; // pills are taller on touch screens: measure again
      this.pillMax = pillMax;
      this.el.style.setProperty('--lam-pill-max', `${pillMax}px`);
      for (const n of this.nodes.values()) n.dirty = true;
    }
    if (compact !== this.compact) {
      this.compact = compact;
      this.card.classList.toggle('is-docked', compact);
      this.cardX = this.cardY = NaN;
      if (compact) this.card.style.transform = '';
      if (this.activeId) this._measureCard();
    }
  }

  /** @param {boolean} on  labels toggled on/off by the reader */
  setEnabled(on) {
    this.enabled = !!on;
    this.el.classList.toggle('is-off', !this.enabled);
    if (!this.enabled) this.closeCard();
  }

  /** @param {boolean} busy  a page is turning: hide while anchors fly */
  setBusy(busy) {
    this.busy = !!busy;
    this.el.classList.toggle('is-busy', this.busy);
    this.el.setAttribute('aria-busy', String(this.busy));
    if (this.busy) this.closeCard();
  }

  /** @param {boolean} v */
  setReducedMotion(v) {
    this.reducedMotion = !!v;
  }

  /**
   * The loop clock (cheap; createUI calls it every frame). While the loop plays,
   * the layout waits a whole loop before it believes an anchor has moved.
   * @param {boolean} playing
   * @param {number} duration  loop length in seconds
   */
  setClock(playing, duration) {
    this.playing = !!playing;
    if (duration > 0) this.duration = duration;
  }

  /**
   * A screen rectangle the labels must not show under (an open popover), or
   * null. Pills there fade out with their leaders; they come back when it goes.
   * @param {{x0:number,y0:number,x1:number,y1:number}|null} r
   */
  setCover(r) {
    const c = this.cover;
    c.ok = !!r && readRect(r, c);
  }

  /**
   * The reader changed what the figure shows (a layer): labels it hid give
   * up their reserved slots now, so the key closes up at once.
   */
  release() {
    this._release = true;
  }

  /** Remove every label immediately (spread change). */
  clear() {
    this.closeCard();
    for (const n of this.nodes.values()) this._remove(n);
    this.nodes.clear();
    this._resetLayout();
  }

  /**
   * Screen rectangle of the figure as last seen (the App's, joined with the
   * anchors' envelope; `app` false when only the anchors were known), for
   * chrome that should not cover it.
   * @returns {{x0:number,y0:number,x1:number,y1:number,ok:boolean,app:boolean}}
   */
  get figureRect() {
    return this.figRect;
  }

  /**
   * Where every label is (for automation and tests; allocates).
   * mark: what is drawn at the anchor ('dot' | 'ring' | 'tick'); r: the feature's
   * projected radius it was given (a ring is drawn at r + 1.5 px).
   * @returns {Array<{id:string,text:string,slot:string,row:number,x:number,y:number,w:number,h:number,op:number,chosen:boolean,reserved:boolean,anchor:number[],mark:string,r:number}>}
   */
  snapshot() {
    const name = { [SLOT_L]: 'left', [SLOT_R]: 'right', [SLOT_T]: 'top', [SLOT_B]: 'bottom', 0: '' };
    const out = [];
    for (const n of this.nodes.values()) {
      out.push({
        id: n.id,
        text: n.text,
        slot: name[n.side] ?? '',
        row: n.drawRow,
        x: n.x,
        y: n.y,
        w: n.w,
        h: n.h,
        op: n.op,
        chosen: n.chosen,
        reserved: n.ghost,
        anchor: [n.ax, n.ay],
        mark: n.drawMark,
        r: n.ar,
      });
    }
    return out;
  }

  _resetLayout() {
    this.sinceReset = 0;
    this.pxPerCm = NaN;
    this.figEnv.reset();
    this.ancEnv.reset();
    this.headEnv.reset();
    this.ordL.length = this.ordR.length = this.ordT.length = this.ordB.length = 0;
    for (const n of this.nodes.values()) {
      n.home = 0;
      n.hugSide = 0;
      n.crossT = 0;
      n.inOrder = 0;
      n.away = 0;
      n.ku = n.kv = NaN;
      n.preferBand = false;
      n.cutT = 0;
      n.ghost = false;
      n.goneT = Infinity; // a fresh layout reserves nothing
      n.step = -1;
    }
  }

  // ------------------------------------------------------------ frame
  /**
   * Lay out and draw labels. Call every frame.
   * @param {Array<{id:string,text?:string,detail?:string,x:number,y:number,depth?:number,visible?:boolean,occluded?:boolean,focus?:boolean,rank?:number,mark?:string,r?:number,headPx?:number,label?:{mark?:string,size?:number,headSize?:number}}>} items
   *        anchor positions in viewport CSS px; focus spotlights one label (card opens);
   *        rank: importance (higher first) when not every label fits; mark ('dot' | 'ring' |
   *        'tick', else item.label.mark), r (the feature's projected radius, px) and headPx
   *        (the head's projected length, px): the anchor mark, see _marks, and how many face
   *        labels a small head carries, see _capFaces. A face label without headPx (its
   *        label.headSize in cm marks it) has it estimated from a ringed feature of the
   *        same figure: its r over its label.size (cm) is the head's scale on screen
   * @param {{x:number,y:number,w:number,h:number,spine?:number[],avoid?:Array<number[]|object>,caption?:number[]|object}} [area]
   *        recto page rect (CSS px); spine: optional [x0,y0,x1,y1] gutter line pills
   *        stay right of (inspect mode); avoid: printed text on the page ([x0,y0,x1,y1] or
   *        {x0,y0,x1,y1} rects, e.g. the caption block and running head) that rows step over
   *        (caption: one such rect); without them, phones keep rows off the recto's printed
   *        head and foot
   * @param {{x0:number,y0:number,x1:number,y1:number}|{x:number,y:number,w:number,h:number}|null} [fig]
   *        the figure's screen rectangle (CSS px): pills keep off it
   */
  render(items, area, fig) {
    const now = performance.now();
    const dt = this.lastT ? Math.min(0.1, (now - this.lastT) / 1000) : 1 / 60;
    this.lastT = now;
    const frame = ++this.frame;
    this.sinceReset += dt;
    const vw = this.vw;
    const vh = this.vh;
    const list = Array.isArray(items) ? items : [];

    const valid = area && area.w > 0 && area.h > 0;
    const ax0 = valid ? area.x : 0;
    const ay0 = valid ? area.y : 0;
    const aw = valid ? area.w : vw;
    const ah = valid ? area.h : vh;
    // a jump in the page rectangle (resize, inspect, back from inspect) starts a fresh layout
    if (this.lastAw > 0 && (Math.abs(aw - this.lastAw) > this.lastAw * 0.2 || Math.abs(ah - this.lastAh) > this.lastAh * 0.2)) {
      this._resetLayout();
    }
    this.lastAw = aw;
    this.lastAh = ah;
    const inset = this.compact ? 8 : 14;
    const top = Math.max(ay0 + inset, this.safeTop + 4);
    const bottom = Math.min(ay0 + ah - inset, this.safeBottom - 4);
    const live = this.enabled && !this.busy;
    const fresh = this.sinceReset < SETTLING;
    // a whole loop's patience while it plays (so periodic motion never moves
    // the key); quick when paused or scrubbed; quicker while a fresh layout
    // follows the camera into place
    const hold = fresh ? 0.1 : this.playing && !this.reducedMotion ? this.duration + 0.5 : SETTLE;

    for (const n of this.nodes.values()) {
      n.wasChosen = n.chosen;
      n.chosen = false;
      n.dip = false;
    }

    // 1. ingest
    const cand = this.cand;
    cand.length = 0;
    let measure = false;
    let focusId = null;
    let cardStale = false;
    let scaleR = 0; // the largest ringed feature's projected radius (px) …
    let pxPerCm = NaN; // … and the head's scale on screen it gives (headPx estimate)
    const count = Math.min(list.length, MAX_ITEMS);
    for (let i = 0; i < count; i++) {
      const it = list[i];
      if (!it || it.id == null) continue;
      const id = String(it.id);
      let n = this.nodes.get(id);
      if (!n) n = this._create(id);
      n.lastSeen = frame;
      const text = it.text != null ? String(it.text) : id;
      if (text !== n.text) {
        n.text = text;
        n.textEl.textContent = text;
        n.dirty = true;
        if (this.activeId === id) cardStale = true; // e.g. the same label in another language
      }
      const detail = it.detail != null ? String(it.detail) : '';
      if (detail !== n.detail) {
        n.detail = detail;
        if (this.activeId === id) cardStale = true;
      }
      n.ax = +it.x;
      n.ay = +it.y;
      n.depth = Number.isFinite(it.depth) ? it.depth : 0;
      n.rank = Number.isFinite(it.rank) ? +it.rank : Number.isFinite(it._rank) ? +it._rank : 0;
      n.occluded = it.occluded === true;
      const mark = it.mark ?? it.label?.mark;
      n.mark = MARKS.has(mark) ? mark : 'dot';
      n.ar = Number.isFinite(it.r) && it.r > 0 ? +it.r : 0;
      n.headPx = Number.isFinite(it.headPx) && it.headPx > 0 ? +it.headPx : NaN;
      const headCm = +it.label?.headSize;
      n.headCm = headCm > 0 ? headCm : 0;
      n.hbOk = n.headCm > 0 && readRect(it.headBox, this._hr);
      if (n.hbOk) {
        n.hb[0] = this._hr.x0;
        n.hb[1] = this._hr.y0;
        n.hb[2] = this._hr.x1;
        n.hb[3] = this._hr.y1;
      }
      const sizeCm = +it.label?.size;
      if (n.headCm > 0 && sizeCm > 0 && n.ar > scaleR) {
        scaleR = n.ar;
        pxPerCm = n.ar / sizeCm;
      }
      n.active = this.activeId === id ? 1 : 0;
      const onScreen =
        Number.isFinite(n.ax) && Number.isFinite(n.ay) && n.ax >= -2 && n.ax <= vw + 2 && n.ay >= -2 && n.ay <= vh + 2;
      n.want = live && it.visible !== false && onScreen;
      if (n.want) {
        cand.push(n);
        if (n.dirty) measure = true;
        if (it.focus === true && focusId == null) focusId = id;
      }
    }

    // 2. measure new or changed pills in one layout pass
    if (measure) {
      for (const n of cand) {
        if (!n.dirty) continue;
        n.w = n.el.offsetWidth;
        n.h = n.el.offsetHeight;
        if (n.h > 0) this.pillH = n.h;
        n.dirty = false;
      }
    }

    // 3. choose: a small head's few face labels, then the App's rank, then the
    // nearest; mark far anchors. (The head's scale holds while its ringed
    // feature is out of the list for a moment.)
    if (pxPerCm > 0) this.pxPerCm = pxPerCm;
    else pxPerCm = this.pxPerCm;
    let dmin = Infinity;
    let dmax = -Infinity;
    // the head this frame (kept off in _assign): every face label on screen, before any is capped
    const hn = this._hn;
    let hx0 = Infinity;
    let hy0 = Infinity;
    let hx1 = -Infinity;
    let hy1 = -Infinity;
    let headExact = false;
    for (const n of cand) {
      if (n.depth < dmin) dmin = n.depth;
      if (n.depth > dmax) dmax = n.depth;
      if (!(n.headPx > 0) && n.headCm > 0 && pxPerCm > 0) n.headPx = n.headCm * pxPerCm;
      if (n.headCm > 0 && Number.isFinite(n.ax) && Number.isFinite(n.ay)) {
        // the App's box of the head, else the anchor grown by HEAD_PAD of the head's length
        if (n.hbOk && !headExact) {
          headExact = true; // the App knows the head: its boxes alone, not the estimate
          hx0 = hy0 = Infinity;
          hx1 = hy1 = -Infinity;
        }
        if (headExact && !n.hbOk) continue;
        const pad = headExact ? 0 : n.headPx > 0 ? n.headPx * HEAD_PAD : LEADER_MIN;
        hx0 = Math.min(hx0, headExact ? n.hb[0] : n.ax - pad);
        hy0 = Math.min(hy0, headExact ? n.hb[1] : n.ay - pad);
        hx1 = Math.max(hx1, headExact ? n.hb[2] : n.ax + pad);
        hy1 = Math.max(hy1, headExact ? n.hb[3] : n.ay + pad);
      }
    }
    hn.x0 = hx0;
    hn.y0 = hy0;
    hn.x1 = hx1;
    hn.y1 = hy1;
    const headNow = hx1 > hx0 && hy1 > hy0;
    const range = dmax - dmin;
    const r = range > 1e-9 ? range : 1;
    for (const n of cand) {
      n.score = (n.depth - dmin) / r - (n.wasChosen ? 0.12 : 0);
      n.ghost = false;
    }
    this._capFaces(cand);
    const max = this.compact ? this.maxCompact : this.maxWide;
    if (cand.length > max) {
      cand.sort(byPriority);
      cand.length = max;
    }
    const depthCue = range > 1e-9 && range / Math.max(Math.abs(dmax), 1e-6) > 0.02;
    for (const n of cand) {
      n.chosen = true;
      n.goneT = 0;
      n.far = n.occluded || (depthCue && (n.depth - dmin) / range > 0.66);
    }
    this._marks(cand);
    this._feats(frame);
    if (cardStale) this._refreshCard();

    // 4. a label the App hid a moment ago keeps its slot, invisible, for
    // about a loop: a tongue that flicks out of sight, a bone that turns
    // behind the skull, a label the App trades under its cap for part of the
    // loop — none of them opens a gap for the neighbours to slide into and
    // back out of. Paused, the slot goes after a moment.
    const lay = this.lay;
    lay.length = 0;
    for (const n of cand) lay.push(n);
    const reserve = !live || this._release ? 0 : this.playing && !this.reducedMotion ? this.duration + 0.5 : RESERVE_PAUSED;
    this._release = false;
    for (const n of this.nodes.values()) {
      if (n.chosen) continue;
      if ((n.ghost || n.wasChosen) && n.placed && n.side !== 0) {
        n.goneT += dt;
        n.ghost = n.goneT < reserve;
      } else n.ghost = false;
      if (n.ghost) lay.push(n);
    }

    // 5. keep-out envelopes (area-relative, so zoom and pan never stale them).
    // The App's figure rectangle is kept even with labels off: popovers use it.
    const fx0 = fig ? (fig.x0 ?? fig.x) : NaN;
    const fy0 = fig ? (fig.y0 ?? fig.y) : NaN;
    const fx1 = fig ? (fig.x1 ?? fx0 + fig.w) : NaN;
    const fy1 = fig ? (fig.y1 ?? fy0 + fig.h) : NaN;
    const figOk = fx1 > fx0 && fy1 > fy0 && !this.busy;
    if (figOk) this.figEnv.add((fx0 - ax0) / aw, (fy0 - ay0) / ah, (fx1 - ax0) / aw, (fy1 - ay0) / ah, dt, hold);
    else this.figEnv.reset();
    // the head: where it goes over the loop (a strike, a slither), so no pill is ever in its way
    const hr = this.headRect;
    if (headNow && live) {
      this.headEnv.add((hn.x0 - ax0) / aw, (hn.y0 - ay0) / ah, (hn.x1 - ax0) / aw, (hn.y1 - ay0) / ah, dt, hold);
      const v = this.headEnv.v;
      hr.x0 = ax0 + v[0] * aw;
      hr.y0 = ay0 + v[1] * ah;
      hr.x1 = ax0 + v[2] * aw;
      hr.y1 = ay0 + v[3] * ah;
      hr.ok = true;
    } else {
      this.headEnv.reset();
      hr.ok = false;
    }
    if (lay.length) {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const n of lay) {
        if (!Number.isFinite(n.ax) || !Number.isFinite(n.ay)) continue;
        if (n.ax < x0) x0 = n.ax;
        if (n.ax > x1) x1 = n.ax;
        if (n.ay < y0) y0 = n.ay;
        if (n.ay > y1) y1 = n.ay;
      }
      if (x1 >= x0) this.ancEnv.add((x0 - ax0) / aw, (y0 - ay0) / ah, (x1 - ax0) / aw, (y1 - ay0) / ah, dt, hold);
    }
    const fr = this.figRect;
    fr.ok = this.figEnv.ok || (cand.length > 0 && this.ancEnv.ok);
    fr.app = this.figEnv.ok;
    if (fr.ok) {
      const src = this.figEnv.ok ? this.figEnv.v : this.ancEnv.v;
      fr.x0 = ax0 + src[0] * aw;
      fr.y0 = ay0 + src[1] * ah;
      fr.x1 = ax0 + src[2] * aw;
      fr.y1 = ay0 + src[3] * ah;
      // the figure itself (a card keeps off it; pills keep off the anchors too)
      const fc = this.figCard;
      fc.x0 = fr.x0;
      fc.y0 = fr.y0;
      fc.x1 = fr.x1;
      fc.y1 = fr.y1;
      if (this.figEnv.ok && cand.length && this.ancEnv.ok) {
        const v = this.ancEnv.v;
        fr.x0 = Math.min(fr.x0, ax0 + v[0] * aw);
        fr.y0 = Math.min(fr.y0, ay0 + v[1] * ah);
        fr.x1 = Math.max(fr.x1, ax0 + v[2] * aw);
        fr.y1 = Math.max(fr.y1, ay0 + v[3] * ah);
      }
    }
    this._readAvoid(valid ? area : null, figOk, fx0, fx1, ax0, ay0, aw, ah);
    this._readSpine(valid ? area : null);

    if (lay.length && this.ancEnv.ok) {
      // anchors smoothed over about a loop while it plays (quickly when paused or scrubbed)
      const tau = fresh ? 0.1 : this.playing && !this.reducedMotion ? this.duration : 0.3;
      const k = 1 - Math.exp(-dt / tau);
      for (const n of lay) {
        const u = (n.ax - ax0) / aw;
        const v = (n.ay - ay0) / ah;
        if (Number.isFinite(u) && Number.isFinite(v)) {
          if (Number.isNaN(n.ku)) {
            n.ku = u;
            n.kv = v;
          } else {
            n.ku += (u - n.ku) * k;
            n.kv += (v - n.kv) * k;
          }
        }
        n.kx = ax0 + n.ku * aw;
        n.ky = ay0 + n.kv * ah;
      }
      this._assign(lay, dt, ax0, ay0, aw, ah, inset, top, bottom);
      // no room for every label (a pill could only rest over anchors, or a
      // column would squeeze its pills over one another): the least
      // important gives up its place, as under the App's cap, and the key
      // is laid out again
      for (let k = 0; k < 3 && this.noRoom; k++) {
        const out = this._leastImportant(lay);
        if (!out) break;
        out.chosen = false;
        let j = 0;
        for (const n of lay) if (n !== out && (n.chosen || n.ghost)) lay[j++] = n; // (a reserved slot given up stays out too)
        lay.length = j;
        this._assign(lay, 0, ax0, ay0, aw, ah, inset, top, bottom);
      }
    }

    // 6. slot changes fade out first, then jump (so do moves beside the head and back)
    for (const n of lay) {
      if (n.slot !== n.side || n.hugAt !== n.drawHug) {
        if (n.placed && n.op > 0.04) n.switching = true;
        else {
          n.side = n.slot;
          n.drawHug = n.hugAt;
          n.switching = false;
          n.placed = false;
        }
      } else {
        n.switching = false; // came back before the fade finished (a row change is re-checked below)
      }
    }

    // 7. drawn order per slot (pills trade places only after fading out)
    const pitch = this.pillH + this.gap;
    this._order(this.ordL, SLOT_L, dt, pitch * 0.7);
    this._order(this.ordR, SLOT_R, dt, pitch * 0.7);
    this._order(this.ordT, SLOT_T, dt, 40);
    this._order(this.ordB, SLOT_B, dt, 40);

    // 8. targets (a pill that must change row fades out first)
    const g = this.geo;
    this._targetsColumn(this.ordL, SLOT_L, g.edgeL);
    this._targetsColumn(this.ordR, SLOT_R, g.edgeR);
    this._targetsBand(this.ordT, SLOT_T);
    this._targetsBand(this.ordB, SLOT_B);
    // a column leader that cuts through the rows' leaders: that pill joins the rows
    this._cutsRows(this.ordL, SLOT_L, dt);
    this._cutsRows(this.ordR, SLOT_R, dt);

    // 9. animate. A pill not on screen yet (new, back from a reserved slot,
    // traded, or moved to another slot or row) waits at its place and shows
    // once nothing visible is in the way: its neighbours ease aside first.
    // Then the drawn positions are projected so moving pills never overlap.
    const kPos = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 13);
    const kOp = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 11);
    const kDip = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 30);
    const focusDim = this.activeId != null;
    const cover = this.cover;
    for (const n of this.nodes.values()) {
      const inLay = n.chosen || n.ghost;
      if (inLay && !n.switching) {
        if (!n.placed || n.op < 0.02) {
          n.x = n.tx;
          n.y = n.ty;
          n.drawRow = n.row;
          if (!n.placed || !n.chosen) n.waitT = 0;
          n.placed = true;
          n.ready = fresh || this.reducedMotion || this._clear(n) || (n.chosen && (n.waitT += dt) > WAIT_MAX);
        } else {
          n.x += (n.tx - n.x) * kPos;
          n.y += (n.ty - n.y) * kPos;
          n.ready = true;
        }
      }
      n.covered = cover.ok && n.placed && n.x < cover.x1 + 4 && n.x + n.w > cover.x0 - 4 && n.y < cover.y1 + 4 && n.y + n.h > cover.y0 - 4;
      let target = 0;
      if (n.chosen && !n.switching && !n.dip && n.ready && !n.covered) target = 1;
      n.op += (target - n.op) * (target < n.op && (n.dip || n.switching || n.covered || !n.chosen) ? kDip : kOp);
      if (Math.abs(target - n.op) < 0.004) n.op = target;
      // while another label is read, this one steps back: its leader and mark
      // fade, its pill keeps its paper and its words turn ink-2 (legible)
      n.dimmed = focusDim && this.activeId !== n.id;
      const dimTo = n.dimmed ? DIMMED : 1;
      n.dv += (dimTo - n.dv) * kOp;
      if (Math.abs(dimTo - n.dv) < 0.004) n.dv = dimTo;
      if (n.switching && n.op < 0.04) {
        // finished fading out of the old slot or row: jump, then fade in
        n.op = 0;
        n.side = n.slot;
        n.drawHug = n.hugAt;
        n.switching = false;
        n.placed = false;
      }
      if (!inLay && n.op === 0) n.placed = false;
    }
    this._projectColumn(this.ordL, SLOT_L, pitch);
    this._projectColumn(this.ordR, SLOT_R, pitch);
    this._projectBand(this.ordT, SLOT_T);
    this._projectBand(this.ordB, SLOT_B);
    for (const n of this.nodes.values()) {
      // never past the screen's margin — also a pill still easing in from a
      // place laid out for another size (a rotation, inspect)
      if (n.placed) {
        n.x = this._screenX(n.x, n.w);
        n.y = this._screenY(n.y, n.h);
      }
      this._write(n);
      if (!n.chosen && !n.ghost && n.op === 0 && frame - n.lastSeen > FORGET_FRAMES) {
        this._remove(n);
        this.nodes.delete(n.id);
      }
    }

    // 10. tab order = reading order of the plate key
    this._syncDomOrder();

    // the App may spotlight a label (item.focus), e.g. after a "look closer"
    // tap on the printed page; a reader's own hover or click wins
    if (focusId != null && (this.activeId == null || this.autoFocus) && this.activeId !== focusId) {
      const f = this.nodes.get(focusId);
      if (f?.chosen) {
        this.openCard(f, false);
        this.autoFocus = true;
      }
    } else if (focusId == null && this.autoFocus) {
      this.closeCard();
    }

    if (this.activeId != null) {
      const a = this.nodes.get(this.activeId);
      if (!a || !a.chosen) this.closeCard();
      else {
        // its pill fading to another place (the camera closing in on a head,
        // a pose) keeps the card open: docked, it stays; floating, it waits
        // unseen — until the layout has settled, if the camera still glides —
        // and comes back beside the pill's new place
        const away = a.switching || !a.placed || a.op < 0.5 || (this.cardAway && fresh);
        if (away !== this.cardAway) {
          this.cardAway = away;
          this.card.classList.toggle('is-away', away);
          this.cardPick = -1;
        }
        if (!this.compact && !away) this._placeCard(a);
      }
    }
  }

  // ------------------------------------------------------------ inputs
  /**
   * Small heads carry few face labels: one on a head projected under
   * FACE_MIN px, two under FACE_TWO (headStep, with FACE_GROW of patience
   * before more come back), so leaders never converge on a few pixels of
   * face. The App's rank chooses (focused, look-closer, then figure order:
   * the eye first); a label whose card is open keeps its place. The others
   * leave the candidates — their slots are kept for a loop, like any label
   * the App hides — and show again where the head is larger (inspect).
   * @param {LabelNode[]} cand  this frame's candidates (filtered in place)
   */
  _capFaces(cand) {
    const faces = this.faces;
    faces.length = 0;
    for (const n of cand) {
      if (n.mark === 'dot' || !(n.headPx > 0)) {
        n.step = -1;
        continue;
      }
      n.step = headStep(n.headPx, n.step);
      if (n.step < 2) faces.push(n);
    }
    if (!faces.length) return;
    faces.sort(byFace);
    let drop = false;
    for (let i = 0; i < faces.length; i++) {
      const n = faces[i];
      n.capped = i >= FACE_LIMIT[n.step];
      drop ||= n.capped;
    }
    faces.length = 0;
    if (!drop) return;
    let j = 0;
    for (const n of cand) {
      if (n.capped) n.capped = false;
      else cand[j++] = n;
    }
    cand.length = j;
  }

  /**
   * What each chosen label draws at its anchor this frame (n.drawMark): body
   * features a dot; a face feature a ring when its projected radius is at
   * least RING_MIN, else a tick. Rings claim their room by rank: one that
   * would touch a higher-ranked ring (closer than r1 + r2 + 4 px) is drawn as
   * a tick, and comes back only with 2 px to spare, so a head turning in the
   * loop does not make rings blink. A head under FACE_MIN px: ticks only.
   * @param {LabelNode[]} list  the chosen labels
   */
  _marks(list) {
    const rings = this.rings;
    rings.length = 0;
    for (const n of list) {
      if (n.mark === 'ring' && n.ar >= RING_MIN && n.step !== 0) {
        rings.push(n);
        continue;
      }
      n.crowded = false;
      n.drawMark = n.mark === 'dot' ? 'dot' : 'tick';
    }
    if (rings.length > 1) rings.sort(byRank);
    for (let i = 0; i < rings.length; i++) {
      const a = rings[i];
      let crowded = false;
      for (let j = 0; j < i && !crowded; j++) {
        const b = rings[j];
        if (b.drawMark !== 'ring') continue;
        const room = a.ar + b.ar + CROWD_GAP + (a.crowded ? 2 : 0);
        crowded = Math.hypot(a.ax - b.ax, a.ay - b.ay) < room;
      }
      a.crowded = crowded;
      a.drawMark = crowded ? 'tick' : 'ring';
    }
    rings.length = 0;
  }

  /**
   * The face features no leader may cross this frame: each face label's
   * feature the App gave a radius (an eye, a pit, a nostril) and listed in
   * view, drawn or not (a capped label's eye is still an eye); _write bends a
   * leader round them. When they move, every leader is drawn again (featKey).
   * @param {number} frame
   */
  _feats(frame) {
    const f = this.feats;
    const nodes = this.featNode;
    let k = 0;
    let key = 0;
    for (const n of this.nodes.values()) {
      if (k >= MAX_ITEMS) break;
      if (n.lastSeen !== frame || n.mark === 'dot' || !(n.ar > 0) || n.occluded || !Number.isFinite(n.ax) || !Number.isFinite(n.ay)) continue;
      f[3 * k] = n.ax;
      f[3 * k + 1] = n.ay;
      f[3 * k + 2] = n.ar;
      nodes[k] = n;
      key += n.ax * 1.37 + n.ay * 0.71 + n.ar;
      k++;
    }
    nodes.length = k;
    this.featN = k;
    this.featMoved = differs(key, this.featKey, 0.04);
    this.featKey = key;
  }

  /**
   * Printed text the rows keep off: the App's rectangles (area.avoid, or
   * area.caption), else — on phones, where rows sit on the recto — its
   * running head and plate number above the plate mark and its caption,
   * scale note and folio below it. Without the App's figure rectangle (or
   * while it is wider than the page, e.g. inspecting) nothing is assumed.
   */
  _readAvoid(area, figOk, fx0, fx1, ax0, ay0, aw, ah) {
    const out = this.avoid;
    let n = 0;
    const src = area?.avoid;
    if (Array.isArray(src)) {
      for (const rc of src) {
        if (n >= MAX_AVOID) break;
        if (readRect(rc, out[n])) n++;
      }
    } else if (area?.caption) {
      if (readRect(area.caption, out[0])) n = 1;
    } else if (area && this.compact && figOk && fx0 >= ax0 - 8 && fx1 <= ax0 + aw + 8) {
      // (the board's edge shows a few px beyond the page: rows that step over
      // the printed head or foot clear it too)
      const a = out[0];
      a.x0 = ax0;
      a.y0 = ay0 - BOARD_EDGE;
      a.x1 = ax0 + aw;
      a.y1 = ay0 + ah * PRINTED_HEAD;
      const b = out[1];
      b.x0 = ax0;
      b.y0 = ay0 + ah * PRINTED_FOOT;
      b.x1 = ax0 + aw;
      b.y1 = ay0 + ah + BOARD_EDGE;
      n = 2;
    }
    this.avoidN = n;
  }

  /** The gutter while inspecting (area.spine), as a segment pills keep right of. */
  _readSpine(area) {
    const sp = area?.spine;
    this.spineOk = !!sp && sp.length >= 4 && Number.isFinite(+sp[0]) && Number.isFinite(+sp[1]) && Number.isFinite(+sp[2]) && Number.isFinite(+sp[3]);
    if (this.spineOk) for (let i = 0; i < 4; i++) this.sp[i] = +sp[i];
  }

  /** x of the gutter line at height y (clamped to its ends). */
  _spineX(y) {
    const p = this.sp;
    const dy = p[3] - p[1];
    if (Math.abs(dy) < 1e-6) return Math.max(p[0], p[2]);
    const t = clamp((y - p[1]) / dy, 0, 1);
    return p[0] + (p[2] - p[0]) * t;
  }

  /** Leftmost x a pill spanning [y0, y1] may start at (right of the gutter while inspecting). */
  _floorAt(y0, y1) {
    const f = this.geo.floorL;
    if (!this.spineOk) return f;
    return Math.max(f, Math.max(this._spineX(y0), this._spineX(y1)) + SPINE_PAD);
  }

  /**
   * Leftmost x of a band's pills: the screen margin on phones (the recto
   * fills the screen); beside the spread, the columns' floor, so rows do not
   * reach over the verso's text; right of the gutter while inspecting.
   */
  _bandLo(slot) {
    const g = this.geo;
    const lo = this.rowLoose ? SCREEN_MARGIN : g.rowLo;
    if (!this.spineOk) return lo;
    const y = slot === SLOT_T ? g.bandTopHi - this.pillH : g.bandBotLo;
    return Math.max(lo, Math.max(this._spineX(y), this._spineX(y + this.pillH)) + SPINE_PAD);
  }

  // ------------------------------------------------------------ layout
  /**
   * Decide where every label in the layout goes this frame (n.slot) and the
   * column edges. Pure function of stable inputs (envelopes, widths, home
   * sides, sticky choices), so the result does not flicker while the loop plays.
   */
  _assign(lay, dt, ax0, ay0, aw, ah, inset, top, bottom) {
    this.noRoom = false;
    const g = this.geo;
    const vw = this.vw;
    const pitch = this.pillH + this.gap;
    const anc = this.ancEnv.v;
    const fig = this.figEnv.ok ? this.figEnv.v : null;

    // keep-out: pills stay FIG_GAP off the figure and LEADER_MIN off every anchor
    let leftMax = ax0 + anc[0] * aw - LEADER_MIN;
    let rightMin = ax0 + anc[2] * aw + LEADER_MIN;
    let leftHard = leftMax + LEADER_SLACK; // how far a column may squeeze toward the anchors to stay on its side
    let rightHard = rightMin - LEADER_SLACK;
    let bandTopHi = ay0 + anc[1] * ah - LEADER_MIN;
    let bandBotLo = ay0 + anc[3] * ah + LEADER_MIN;
    if (fig) {
      leftMax = Math.min(leftMax, ax0 + fig[0] * aw - FIG_GAP);
      rightMin = Math.max(rightMin, ax0 + fig[2] * aw + FIG_GAP);
      leftHard = Math.min(leftHard, ax0 + fig[0] * aw - FIG_GAP);
      rightHard = Math.max(rightHard, ax0 + fig[2] * aw + FIG_GAP);
      bandTopHi = Math.min(bandTopHi, ay0 + fig[1] * ah - FIG_GAP);
      bandBotLo = Math.max(bandBotLo, ay0 + fig[3] * ah + FIG_GAP);
    }
    if (!fig && !this.compact) {
      // no figure rectangle from the App: every figure stands inside the
      // recto's footprint (0.78 of the page width, centred: CONTRACTS §5), so
      // the columns keep to the margins outside it
      const footL = ax0 + aw * 0.11 - FIG_GAP;
      const footR = ax0 + aw * 0.89 + FIG_GAP;
      leftMax = Math.min(leftMax, footL);
      rightMin = Math.max(rightMin, footR);
      leftHard = Math.min(leftHard, footL);
      rightHard = Math.max(rightHard, footR);
    }
    if (!fig && this.compact) {
      // no figure rectangle from the App: the anchors alone under-cover the
      // silhouette of a figure that spans the page, so no column beside it,
      // and rows go out to the white canvas around the page
      leftMax = leftHard = Math.min(leftMax, ax0 - FIG_GAP);
      rightMin = rightHard = Math.max(rightMin, ax0 + aw + FIG_GAP);
      const above = Math.min(bandTopHi, ay0 - 10);
      if (above - (this.safeTop + 4) >= pitch) bandTopHi = above;
      const below = Math.max(bandBotLo, ay0 + ah + 18);
      if (this.safeBottom - 4 - below >= pitch) bandBotLo = below;
    }
    // the head is kept off like the figure: where a tongue flicks out beyond
    // the App's rectangle (a phone's close-up frames the head alone), or a
    // face lies near its edge
    const hr = this.headRect;
    if (hr.ok) {
      leftMax = Math.min(leftMax, hr.x0 - FIG_GAP);
      leftHard = Math.min(leftHard, hr.x0 - FIG_GAP);
      rightMin = Math.max(rightMin, hr.x1 + FIG_GAP);
      rightHard = Math.max(rightHard, hr.x1 + FIG_GAP);
      bandTopHi = Math.min(bandTopHi, hr.y0 - FIG_GAP);
      bandBotLo = Math.max(bandBotLo, hr.y1 + FIG_GAP);
    }
    for (const n of lay) {
      n.hugAt = 0; // _hug decides it again
      n.hugX = NaN;
    }
    // printed text: the nearest row steps over it when a row fits beyond it
    // (or the rows stay between it and the figure, when one fits there);
    // columns stay clear of it. The rows as they were go to g.loose: when
    // nothing else has room, a row on printed text beats a pill on the figure.
    const loose = g.loose;
    loose[0] = bandTopHi;
    loose[1] = bandBotLo;
    let rowTop = this.safeTop + 4;
    let rowBottom = this.safeBottom - 4;
    loose[2] = rowTop;
    loose[3] = rowBottom;
    const midY = fig ? ay0 + ((fig[1] + fig[3]) / 2) * ah : ay0 + ((anc[1] + anc[3]) / 2) * ah;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < this.avoidN; i++) {
        const rc = this.avoid[i];
        if (rc.x1 < SCREEN_MARGIN || rc.x0 > vw - SCREEN_MARGIN) continue;
        if (rc.y1 <= midY) {
          top = Math.max(top, rc.y1 + this.gap);
          if (rc.y0 >= bandTopHi || rc.y1 <= rowTop) continue; // not where the rows go
          if (bandTopHi - this.pillH >= rc.y1 + this.gap) rowTop = Math.max(rowTop, rc.y1 + this.gap); // rows fit between it and the figure
          else if (rc.y0 - this.gap - this.pillH >= rowTop) bandTopHi = rc.y0 - this.gap; // the nearest row would sit on it: above it
        } else if (rc.y0 >= midY) {
          bottom = Math.min(bottom, rc.y0 - this.gap);
          if (rc.y1 <= bandBotLo || rc.y0 >= rowBottom) continue;
          if (bandBotLo + this.pillH <= rc.y0 - this.gap) rowBottom = Math.min(rowBottom, rc.y0 - this.gap);
          else if (rc.y1 + this.gap + this.pillH <= rowBottom) bandBotLo = rc.y1 + this.gap; // below it
        }
      }
    }
    g.ax0 = ax0;
    g.aw = aw;
    g.inset = inset;
    g.floorL = this.compact ? SCREEN_MARGIN : Math.max(SCREEN_MARGIN, ax0 - aw * 0.08);
    g.ceilR = vw - SCREEN_MARGIN;
    g.leftMax = leftMax;
    g.rightMin = rightMin;
    g.leftHard = leftHard;
    g.rightHard = rightHard;
    g.top = top;
    g.bottom = bottom;
    g.pitch = pitch;
    // A column runs the page's height, as on a printed plate. Beside the
    // spread it may run on above and below the page, over the white canvas,
    // when it holds more pills than that (a landscape phone's short page);
    // a phone's columns sit in the page margins and stay on the page.
    const outR = rightMin >= ax0 + aw - inset - 1; // a right column wholly beyond the recto's edge
    for (let i = 0; i < 2; i++) {
      g.topC[i] = this.compact ? top : Math.min(top, this.safeTop + 4);
      g.bottomC[i] = this.compact ? bottom : Math.max(bottom, this.safeBottom - 4);
      g.capC[i] = Math.max(0, Math.floor((g.bottomC[i] - g.topC[i] + this.gap) / pitch));
    }
    // rows: the whole width on phones; beside the spread they start at the
    // columns' floor (off the verso's text) and stop short of a right column
    // standing on the white canvas, which then keeps its whole height. They
    // never run past the screen's margin (a figure wider than the view while
    // inspecting puts that column off screen: the rows wrap instead)
    g.outR = outR;
    g.rowLo = this.compact ? SCREEN_MARGIN : Math.max(SCREEN_MARGIN, g.floorL);
    g.rowHi = Math.min(vw - SCREEN_MARGIN, outR ? Math.max(g.rowLo + 1, rightMin - this.gap) : vw - SCREEN_MARGIN);
    this.rowLoose = false;
    g.bandTopHi = bandTopHi;
    g.bandBotLo = bandBotLo;
    g.rowsT = Math.max(0, Math.floor((bandTopHi - rowTop + this.gap) / pitch));
    g.rowsB = Math.max(0, Math.floor((rowBottom - bandBotLo + this.gap) / pitch));
    if (!fig && !this.compact) g.rowsT = g.rowsB = 0; // rows hug the figure's rectangle: without it they could land on it

    // home side: decided once, changed only after the anchor has sat on the
    // far side of the figure for longer than a loop (a pose, not a phase)
    const src = fig ?? anc;
    const cx = ax0 + ((src[0] + src[2]) / 2) * aw;
    const hyst = Math.max(HYSTERESIS, (src[2] - src[0]) * aw * 0.12);
    const flipAfter = this.playing && !this.reducedMotion ? this.duration + 0.5 : 0.6;
    const fitL = this.fitL;
    const fitR = this.fitR;
    fitL.length = fitR.length = 0;
    for (const n of lay) {
      const dx = n.kx - cx;
      if (n.home === 0 || this.sinceReset < SETTLING) {
        if (n.home === 0 || Math.abs(dx) > HYSTERESIS) n.home = dx < 0 ? -1 : 1;
        n.crossT = 0;
      } else if (n.home * dx < -hyst) {
        n.crossT += dt;
        if (n.crossT > flipAfter) {
          n.home = -n.home;
          n.crossT = 0;
        }
      } else n.crossT = 0;
      (n.home < 0 ? fitL : fitR).push(n);
    }

    // columns beside the figure; what does not fit moves across, then to a band
    const overL = this.overL;
    const overR = this.overR;
    overL.length = overR.length = 0;
    this._fitColumn(fitL, SLOT_L, overL);
    this._fitColumn(fitR, SLOT_R, overR);
    for (const n of fitL) n.away = 0;
    for (const n of fitR) n.away = 0;
    // pills whose column leader cut through the rows' leaders join the rows
    const pref = this.pref;
    pref.length = 0;
    if (g.rowsT + g.rowsB > 0) {
      this._takePreferred(fitL, pref);
      this._takePreferred(fitR, pref);
    }
    const band = this.band;
    band.length = 0;
    this._moveAcross(overL, fitR, SLOT_R, band);
    this._moveAcross(overR, fitL, SLOT_L, band);
    for (const n of pref) band.push(n);

    // bands: the nearer row first (one above or below the figure, keeping
    // leaders short), then the other, then further rows
    const bandT = this.bandT;
    const bandB = this.bandB;
    const rest = this.rest;
    bandT.length = bandB.length = rest.length = 0;
    if (band.length) {
      // the pills that most clearly belong above (or below) choose first, so
      // a row that fills up sends the undecided ones across, not the obvious
      // ones (whose leaders would then cross the other band's)
      for (const n of band) {
        const down = g.bandBotLo - n.ky;
        n.bandPref = Math.abs(n.ky - g.bandTopHi - down - Math.max(g.pitch, down * 0.25));
      }
      band.sort(byBand);
      // a pill keeps last frame's side of the figure while it still fits there,
      // so the loop never reshuffles the rows (a fresh layout still decides anew)
      const f = ++this.runs; // this layout run (a frame may lay out again: render)
      if (this.sinceReset >= SETTLING) {
        for (const n of band) {
          if ((n.slot === SLOT_T && this._tryRow(SLOT_T, n, g.rowsT)) || (n.slot === SLOT_B && this._tryRow(SLOT_B, n, g.rowsB))) n.bandAt = f;
        }
      }
      for (const n of band) {
        if (n.bandAt === f) continue;
        if (!this._placeBand(n)) rest.push(n);
      }
      // still no room: rows may sit on printed text — over the verso's margin
      // beside the spread, back on the recto's head or foot on a phone —
      // before a pill would rest on the figure
      let shown = false;
      for (const n of rest) shown ||= !n.ghost;
      if (shown && !this.spineOk && (g.rowLo > SCREEN_MARGIN || g.bandTopHi !== g.loose[0] || g.bandBotLo !== g.loose[1])) {
        this.rowLoose = true;
        // the rows move back next to the figure (never fewer rows than before)
        g.bandTopHi = g.loose[0];
        g.bandBotLo = g.loose[1];
        g.rowsT = Math.max(g.rowsT, Math.floor((g.bandTopHi - g.loose[2] + this.gap) / pitch));
        g.rowsB = Math.max(g.rowsB, Math.floor((g.loose[3] - g.bandBotLo + this.gap) / pitch));
        let j = 0;
        for (const n of rest) if (!this._placeBand(n)) rest[j++] = n;
        rest.length = j;
      }
      for (const n of rest) {
        // no room anywhere: a reserved slot is the first thing to give up,
        if (n.ghost) {
          n.ghost = false;
          continue;
        }
        // a pill left of the gutter tries the right column (inspecting),
        if (this.spineOk && n.home < 0 && fitR.length < g.capC[1] && this._overrun(n, SLOT_R) <= 0) {
          fitR.push(n);
          continue;
        }
        // else it rests beside the figure: on its own side, unless the other
        // column has room and the pill reaches no more than a third of its
        // width into that column's keep-out (the figure's loop box, which
        // the drawn figure seldom fills) while on its own side it reaches
        // deeper (a landscape phone's right column is a few px too narrow
        // for a long name; its home column lies on the coils). Off the
        // anchors in either case (_offAnchors).
        const clearL = fitL.length < g.capC[0] && this._overrun(n, SLOT_L) <= n.w / 3;
        const clearR = fitR.length < g.capC[1] && this._overrun(n, SLOT_R) <= n.w / 3;
        const left = n.home < 0 ? clearL || !clearR : clearL && !clearR;
        (left ? fitL : fitR).push(n);
      }
    }

    // resting on the figure (a view it fills), no pill lies on the head: a
    // face label's moves beside it, the others step over it (_offAnchors)
    this._hug(fitL, fitR);

    // columns run between the band rows: what no longer fits there moves on
    for (let pass = 0; pass < 3; pass++) {
      const capL = this._colRun(0, fitL.length, bandT.length > 0, bandB.length > 0);
      const capR = this._colRun(1, fitR.length, bandT.length > 0, bandB.length > 0);
      if (fitL.length <= capL && fitR.length <= capR) break;
      this._overflow(fitL, fitR, SLOT_R, capL, capR);
      this._overflow(fitR, fitL, SLOT_L, capR, capL);
    }

    for (const n of fitL) n.slot = SLOT_L;
    for (const n of fitR) n.slot = SLOT_R;
    for (const n of bandT) n.slot = SLOT_T;
    for (const n of bandB) n.slot = SLOT_B;

    // column edges (rest-nodes may force a clamp, the last resort)
    g.edgeL = this._edge(fitL, SLOT_L);
    g.edgeR = this._edge(fitR, SLOT_R);
    // a column whose pills, laid out, still lie over anchors (resting on a
    // figure that fills the view, too many for the room between them): a
    // less important label gives way (render)
    if (!this.noRoom && (this._columnCovers(fitL, SLOT_L, g.edgeL) || this._columnCovers(fitR, SLOT_R, g.edgeR))) this.noRoom = true;
  }

  /**
   * How far (px) a column on `slot` would overrun its room with `n` in it
   * (≤ 0: it fits). A pill already drawn there keeps it with a little slack,
   * so a pill at the edge of its room does not flicker between two slots.
   */
  _overrun(n, slot) {
    const g = this.geo;
    const slack = n.side === slot && n.placed ? MEMBER_SLACK : 0;
    if (slot === SLOT_L) {
      // pills right-aligned on the edge: each must start right of the floor
      const half = this.pillH / 2;
      const y = clamp(n.ky, g.top + half, Math.max(g.top + half, g.bottom - half));
      return this._floorAt(y - half, y + half) + n.w - g.leftHard - 0.5 - slack;
    }
    // pills left-aligned on the edge: the widest must end on screen
    return Math.max(g.ax0 + g.aw - g.inset - n.w, g.rightHard) + n.w - g.ceilR - 0.5 - slack;
  }

  /**
   * A column resting on the figure (a view it fills: inspecting) never lays
   * a pill on the head (headRect). A face label's pill — its anchor on the
   * head — moves beside the head, at its anchor's height: on the anchor's
   * side of the head when there is room there (kept for the spread), else on
   * the other, into that side's column at its own x (n.hugX), so its leader
   * reaches the face from the side it is on and crosses no other feature.
   * Any other pill steps over the head in its column (_offAnchors); one that
   * cannot gives way (_columnCovers).
   */
  _hug(fitL, fitR) {
    const hr = this.headRect;
    if (!hr.ok || !(fitL.length + fitR.length)) return;
    const g = this.geo;
    const half = this.pillH / 2;
    const tmp = this.hugTmp;
    tmp.length = 0;
    for (const n of fitL) tmp.push(n);
    const nL = tmp.length;
    for (const n of fitR) tmp.push(n);
    const eL = this._edge(fitL, SLOT_L);
    const eR = this._edge(fitR, SLOT_R);
    const cx = (hr.x0 + hr.x1) / 2;
    const x0 = hr.x0 - FIG_GAP;
    const x1 = hr.x1 + FIG_GAP;
    const y0 = hr.y0 - FIG_GAP;
    const y1 = hr.y1 + FIG_GAP;
    let moved = false;
    for (let i = 0; i < tmp.length; i++) {
      const n = tmp[i];
      const px = i < nL ? eL - n.w : eR; // where its column puts it
      if (px >= x1 || px + n.w <= x0 || n.ky + half <= y0 || n.ky - half >= y1) continue; // clear of the head
      if (n.kx <= hr.x0 || n.kx >= hr.x1 || n.ky <= hr.y0 || n.ky >= hr.y1) continue; // not on the head: it steps over it
      if (n.hugSide === 0 || this.sinceReset < SETTLING) n.hugSide = n.kx < cx ? -1 : 1;
      const right = x1 + n.w <= g.ceilR;
      const left = x0 - n.w >= this._hugFloor(n.ky - half, n.ky + half);
      const side = n.hugSide > 0 ? (right ? 1 : left ? -1 : 0) : left ? -1 : right ? 1 : 0;
      if (!side) continue; // no room beside the head: it steps over it in its column
      n.hugAt = side;
      n.hugX = side > 0 ? x1 : x0 - n.w;
      moved = true;
    }
    if (!moved) return;
    fitL.length = fitR.length = 0;
    for (let i = 0; i < tmp.length; i++) {
      const n = tmp[i];
      ((n.hugAt ? n.hugAt > 0 : i >= nL) ? fitR : fitL).push(n);
    }
  }

  /** Leftmost x a pill beside the head may start at: right of the gutter while inspecting, else the columns' floor. */
  _hugFloor(y0, y1) {
    if (!this.spineOk) return this.geo.floorL;
    return Math.max(SCREEN_MARGIN, Math.max(this._spineX(y0), this._spineX(y1)) + SPINE_PAD);
  }

  /** A pill's left x in `slot`'s column (edge-aligned, or beside the head: n.hugX) as this layout run wants it. */
  _colX(n, slot, edge) {
    return n.hugAt ? n.hugX : slot === SLOT_L ? edge - n.w : edge;
  }

  /**
   * Would the pills of `col`, laid out as _targetsColumn lays them (each off
   * the anchors under it where it can be, then spaced), lie over a shown
   * anchor (their own or another's), or over the head? Only a column resting
   * on the figure has anchors (or a head) under it.
   */
  _columnCovers(col, slot, edge) {
    const k = col.length;
    if (!k) return false;
    // in the order the column draws them (_order): those already drawn there
    // keep theirs, newcomers go in by anchor
    const tmp = this.packTmp;
    tmp.length = 0;
    for (const n of slot === SLOT_L ? this.ordL : this.ordR) if (n.slot === slot && col.includes(n)) tmp.push(n);
    for (const n of col) {
      if (tmp.includes(n)) continue;
      let i = tmp.length;
      tmp.push(n);
      while (i > 0 && tmp[i - 1].ky > n.ky) {
        tmp[i] = tmp[i - 1];
        i--;
      }
      tmp[i] = n;
    }
    this._colRange(slot);
    const lo = this._lo;
    const hi = this._hi;
    const half = this.pillH / 2;
    const d = this.desired;
    for (let i = 0; i < k; i++) {
      const p = tmp[i];
      const x0 = this._colX(p, slot, edge);
      d[i] = this._offAnchors(clamp(p.ky, lo, hi), x0, x0 + p.w, half, lo, hi);
    }
    solveColumn(k, d, this.geo.pitch, lo, hi, this.solved, this.ws);
    const hr = this.headRect;
    for (let i = 0; i < k; i++) {
      const p = tmp[i];
      if (!p.chosen) continue; // a reserved slot takes its room, unseen
      const x0 = this._colX(p, slot, edge);
      const y = this.solved[i];
      if (hr.ok && x0 < hr.x1 && x0 + p.w > hr.x0 && y - half < hr.y1 && y + half > hr.y0) return true;
      for (const m of this.lay) {
        if (m.chosen && m.kx > x0 + 2 && m.kx < x0 + p.w - 2 && Math.abs(m.ky - y) < half - 2) return true;
      }
    }
    return false;
  }

  /**
   * Set column i's run (colTopC / colBottomC) for `count` pills: the page's
   * height between the band rows, or — beside the spread, when that is too
   * short — on above and below the page. Rows stop short of a right column
   * standing wholly beyond the recto, so they never cut its run.
   * @returns {number} how many pills the run holds
   */
  _colRun(i, count, rowsAbove, rowsBelow) {
    const g = this.geo;
    const pitch = g.pitch;
    const free = i === 1 && g.outR;
    const bt = rowsAbove && !free ? g.bandTopHi + this.gap : -Infinity;
    const bb = rowsBelow && !free ? g.bandBotLo - this.gap : Infinity;
    let t0 = Math.max(g.top, bt);
    let b0 = Math.min(g.bottom, bb);
    if (Math.floor((b0 - t0 + this.gap) / pitch) < count) {
      t0 = Math.max(g.topC[i], bt);
      b0 = Math.min(g.bottomC[i], bb);
    }
    g.colTopC[i] = t0;
    g.colBottomC[i] = b0;
    return Math.max(0, Math.floor((b0 - t0 + this.gap) / pitch));
  }

  /** Drop pills from a column until it fits beside the figure and between top and bottom. */
  _fitColumn(col, slot, over) {
    for (;;) {
      if (!col.length) return;
      // the pill that needs the most room leaves first: it is what does not fit
      let wi = 0;
      let worst = -Infinity;
      for (let i = 0; i < col.length; i++) {
        const o = this._overrun(col[i], slot);
        if (o > worst) {
          worst = o;
          wi = i;
        }
      }
      if (worst <= 0) break;
      over.push(col[wi]);
      col[wi] = col[col.length - 1];
      col.length--;
    }
    const cap = this.geo.capC[slot < 0 ? 0 : 1];
    if (col.length > cap) {
      col.sort(byPriority);
      for (let i = cap; i < col.length; i++) over.push(col[i]);
      col.length = cap;
    }
  }

  /** Move the pills that prefer the rows out of a column (into `pref`). */
  _takePreferred(col, pref) {
    let j = 0;
    for (const n of col) {
      if (n.preferBand) pref.push(n);
      else col[j++] = n;
    }
    col.length = j;
  }

  /**
   * Evicted pills (narrowest first) go to the opposite column — unless a row
   * above or below the figure gives a clearly shorter leader than one drawn
   * across the whole figure, or the leader across would cut through the
   * rows' leaders. The choice sticks while the pill stays evicted, so it does
   * not flip with the loop. Inspecting, the right column comes first: rows
   * could reach over the verso's text.
   */
  _moveAcross(over, col, slot, band) {
    if (!over.length) return;
    over.sort(byWidth);
    const g = this.geo;
    let maxW = 0;
    for (const n of col) if (n.w > maxW) maxW = n.w;
    for (const n of over) {
      const w = Math.max(maxW, n.w);
      if (n.away === 0 || this.sinceReset < SETTLING) {
        const edge = slot === SLOT_L ? Math.min(g.ax0 + g.inset + w, g.leftMax) : Math.max(g.ax0 + g.aw - g.inset - w, g.rightMin);
        const across = Math.abs(n.kx - edge);
        const up = g.rowsT > 0 ? n.ky - g.bandTopHi : Infinity;
        const down = g.rowsB > 0 ? g.bandBotLo - n.ky : Infinity;
        const row = Math.min(up, down) + ELBOW;
        const cuts = row < Infinity && this._acrossCuts(n, edge);
        n.away = row < across * 0.8 || (cuts && row < across * 1.6) ? SLOT_T : slot;
      }
      if (this.spineOk && slot === SLOT_R) n.away = slot;
      if (n.away === slot && col.length < g.capC[slot < 0 ? 0 : 1] && this._overrun(n, slot) <= 0) {
        col.push(n);
        maxW = w;
      } else band.push(n);
    }
  }

  /**
   * Would a leader drawn across the figure from the column edge to n's anchor
   * cut through the leaders of the pills in the rows (as last laid out)? A
   * row leader drops (or rises) to its anchor, so it crosses the anchor's
   * height when its own anchor lies beyond it, between the edge and n.
   */
  _acrossCuts(n, edge) {
    const x0 = Math.min(n.kx, edge);
    const x1 = Math.max(n.kx, edge);
    for (const m of this.lay) {
      if (m === n || !m.chosen || (m.slot !== SLOT_T && m.slot !== SLOT_B)) continue;
      if (m.kx <= x0 || m.kx >= x1) continue;
      if (m.slot === SLOT_T ? m.ky > n.ky : m.ky < n.ky) return true;
    }
    return false;
  }

  /**
   * Put `n` in the nearer band (one row), else the other, else further rows.
   * The rows above win near-ties, so a key is not split for a few px.
   * @returns {boolean} placed
   */
  _placeBand(n) {
    const g = this.geo;
    const down = g.bandBotLo - n.ky;
    const tFirst = n.ky - g.bandTopHi <= down + Math.max(g.pitch, down * 0.25);
    const a = tFirst ? SLOT_T : SLOT_B;
    const b = tFirst ? SLOT_B : SLOT_T;
    const ra = tFirst ? g.rowsT : g.rowsB;
    const rb = tFirst ? g.rowsB : g.rowsT;
    return this._tryRow(a, n, Math.min(1, ra)) || this._tryRow(b, n, Math.min(1, rb)) || this._tryRow(a, n, ra) || this._tryRow(b, n, rb);
  }

  /** Add `n` to a band if it then packs into at most `rows` rows. */
  _tryRow(slot, n, rows) {
    if (rows < 1) return false;
    const list = slot === SLOT_T ? this.bandT : this.bandB;
    list.push(n);
    if (this._rowsNeeded(list, slot) <= rows) return true;
    list.pop();
    return false;
  }

  /**
   * Columns over capacity (between the band rows) hand their least important
   * pills to the other column, else to a band row; a reserved slot is given
   * up; only what fits nowhere stays, squeezed (the last resort).
   */
  _overflow(col, other, otherSlot, cap, capOther) {
    if (col.length <= cap) return;
    col.sort(byPriority);
    const keep = this.keep;
    keep.length = 0;
    for (let i = 0; i < col.length; i++) {
      const n = col[i];
      if (i < cap) {
        keep.push(n);
        continue;
      }
      n.hugAt = 0; // leaving its place beside the head
      n.hugX = NaN;
      if (other.length < capOther && this._overrun(n, otherSlot) <= 0) other.push(n);
      else if (this._placeBand(n)) continue;
      else if (n.ghost) n.ghost = false;
      else {
        keep.push(n);
        this.noRoom = true; // squeezed: a less important label gives way (render)
      }
    }
    col.length = 0;
    for (const n of keep) col.push(n);
  }

  /**
   * The label to leave out when the key has no room for every one: the
   * least important shown label (byPriority: the App's rank, then depth),
   * never the one whose card is open, and never the last.
   * @returns {LabelNode|null}
   */
  _leastImportant(lay) {
    let out = null;
    let shown = 0;
    for (const n of lay) {
      if (!n.chosen || n.ghost) continue;
      shown++;
      if (n.id === this.activeId) continue;
      if (!out || byPriority(n, out) > 0) out = n;
    }
    return shown > 1 ? out : null;
  }

  /**
   * Column edge: the leader line every pill of the column leaves from (pills
   * right-aligned to it on the left, left-aligned on the right). It sits in
   * the page margin, moving outward to clear the figure and its anchors.
   */
  _edge(col, slot) {
    const g = this.geo;
    let maxW = 0;
    for (const n of col) if (!n.hugAt && n.w > maxW) maxW = n.w; // (a pill beside the head has its own x)
    if (slot === SLOT_L) {
      let need = g.floorL + maxW;
      if (this.spineOk) {
        const half = this.pillH / 2;
        for (const n of col) {
          if (n.hugAt) continue;
          const y = clamp(n.ky, g.colTopC[0] + half, Math.max(g.colTopC[0] + half, g.colBottomC[0] - half));
          need = Math.max(need, this._floorAt(y - half, y + half) + n.w);
        }
      }
      return Math.max(need, Math.min(g.ax0 + g.inset + maxW, g.leftMax));
    }
    const ceil = g.ceilR - maxW;
    return Math.min(ceil, Math.max(g.ax0 + g.aw - g.inset - maxW, g.rightMin));
  }

  /** Rows a band list needs when packed in anchor order. */
  _rowsNeeded(list, slot) {
    const tmp = this.packTmp;
    tmp.length = 0;
    for (const n of list) tmp.push(n);
    tmp.sort(byKeyX);
    const width = this.geo.rowHi - this._bandLo(slot);
    let rows = tmp.length ? 1 : 0;
    let x = 0;
    for (const n of tmp) {
      const w = Math.min(n.w, width);
      if (x > 0 && x + w > width) {
        rows++;
        x = 0;
      }
      x += w + this.gap;
    }
    return rows;
  }

  /**
   * Keep `ord` (the drawn order of a slot) in step with the pills drawn there:
   * drop leavers, insert newcomers by anchor, and let neighbours trade places
   * when their leaders cross (or their anchors are clearly inverted and
   * trading does not make the leaders cross) for a moment — after both have
   * faded out, so they never slide through each other.
   */
  _order(ord, slot, dt, hyst) {
    const band = slot === SLOT_T || slot === SLOT_B;
    let j = 0;
    for (const n of ord) {
      // a label the App just hid keeps its place while it fades (and while its
      // slot is reserved), so its neighbours never slide into a visible pill
      if (n.side === slot && (n.chosen || n.ghost || n.op > 0.04)) ord[j++] = n;
      else if (n.inOrder === slot) n.inOrder = 0;
    }
    ord.length = j;
    for (const n of this.lay) {
      if (n.side !== slot || n.inOrder === slot) continue;
      // insert by anchor (no splice: it would allocate)
      const a = band ? n.kx : n.ky;
      let i = ord.length;
      ord.push(n);
      while (i > 0 && (band ? ord[i - 1].kx : ord[i - 1].ky) > a) {
        ord[i] = ord[i - 1];
        i--;
      }
      ord[i] = n;
      n.inOrder = slot;
      n.invT = 0;
    }
    // While the loop plays, neighbours trade places only once their leaders
    // have stayed crossed (or their anchors inverted) for a whole loop: a
    // moving anchor (a snake on its path, a skull on its turntable) crosses
    // its neighbour for part of the loop, and trading back and forth would
    // blink. Paused, or while a fresh layout settles, a moment is enough.
    const hold = this.playing && !this.reducedMotion && this.sinceReset >= SETTLING ? this.duration + 0.5 : SWAP_HOLD;
    for (let i = 0; i + 1 < ord.length; i++) {
      const a = ord[i];
      const b = ord[i + 1];
      // a fading leaver, a pill on its way to another slot or row, or one not yet laid out keeps its place
      if (!(a.chosen || a.ghost) || !(b.chosen || b.ghost) || a.switching || b.switching || a.tgtSide !== slot || b.tgtSide !== slot || (band && a.row !== b.row)) {
        a.invT = 0;
        continue;
      }
      const inv = (band ? a.kx - b.kx : a.ky - b.ky) > hyst;
      const want = (inv || this._pairCross(a, b, slot, false)) && !this._pairCross(a, b, slot, true);
      if (want) a.invT += dt;
      else a.invT = 0;
      if (a.invT < hold) continue;
      if (a.op < 0.05 && b.op < 0.05) {
        ord[i] = b;
        ord[i + 1] = a;
        a.invT = b.invT = 0;
        a.placed = b.placed = false; // reappear at the new places
        i++;
      } else {
        a.dip = true;
        b.dip = true;
      }
    }
  }

  /**
   * Do the leaders of neighbours a, b (a first) cross, at their laid-out
   * places and loop-smoothed anchors — or would they, had they traded places?
   */
  _pairCross(a, b, slot, swapped) {
    let axp = a.tx;
    let ayp = a.ty;
    let bxp = b.tx;
    let byp = b.ty;
    if (swapped) {
      if (slot === SLOT_T || slot === SLOT_B) {
        bxp = a.tx; // b takes a's place in the row, a follows it
        axp = a.tx + b.w + this.gap;
      } else {
        ayp = b.ty;
        byp = a.ty;
      }
    }
    const na = leaderPoints(LA, slot, axp, ayp, a.w, a.h, a.kx, a.ky);
    const nb = leaderPoints(LB, slot, bxp, byp, b.w, b.h, b.kx, b.ky);
    return polylinesCross(LA, na, LB, nb);
  }

  /**
   * A column pill whose leader cuts through the leaders of the rows (a
   * leader drawn across the figure, under the rows' near-vertical ones)
   * joins the rows once that has lasted a moment; it sticks for the spread.
   */
  _cutsRows(ord, slot, dt) {
    if (!this.ordT.length && !this.ordB.length) return;
    const hold = this.playing && !this.reducedMotion && this.sinceReset >= SETTLING ? this.duration + 0.5 : SWAP_HOLD; // as for trading places
    for (const n of ord) {
      if (!n.chosen || n.preferBand || n.switching || n.slot !== slot || n.tgtSide !== slot) continue;
      const na = leaderPoints(LA, slot, n.tx, n.ty, n.w, n.h, n.kx, n.ky);
      const hit = this._cutsBand(this.ordT, SLOT_T, na) || this._cutsBand(this.ordB, SLOT_B, na);
      n.cutT = hit ? n.cutT + dt : 0;
      if (n.cutT > hold) n.preferBand = true;
    }
  }

  _cutsBand(ord, slot, na) {
    for (const m of ord) {
      if (!m.chosen || m.switching || m.tgtSide !== slot) continue;
      const nb = leaderPoints(LB, slot, m.tx, m.ty, m.w, m.h, m.kx, m.ky);
      if (polylinesCross(LA, na, LB, nb)) return true;
    }
    return false;
  }

  /** Vertical run of a column: between the band rows. */
  _colRange(slot) {
    const g = this.geo;
    const i = slot < 0 ? 0 : 1;
    this._lo = g.colTopC[i] + this.pillH / 2;
    this._hi = Math.max(this._lo, g.colBottomC[i] - this.pillH / 2);
  }

  _targetsColumn(ord, slot, edge) {
    const n = ord.length;
    if (!n) return;
    const g = this.geo;
    const half = this.pillH / 2;
    this._colRange(slot);
    const lo = this._lo;
    const hi = this._hi;
    const d = this.desired;
    for (let i = 0; i < n; i++) {
      const p = ord[i];
      // (a pill on its way beside the head or back keeps its place while it fades)
      const x0 = p.slot === slot && p.hugAt === p.drawHug ? this._colX(p, slot, edge) : p.tx;
      d[i] = this._offAnchors(clamp(p.ky, lo, hi), x0, x0 + p.w, half, lo, hi);
    }
    solveColumn(n, d, g.pitch, lo, hi, this.solved, this.ws);
    for (let i = 0; i < n; i++) {
      const node = ord[i];
      node.ty = this.solved[i] - half;
      if (node.slot === slot && node.hugAt === node.drawHug) node.tx = this._colX(node, slot, edge);
      node.tgtSide = slot;
    }
  }

  /**
   * A column pill's centre, moved off the anchors under it and off the
   * head: a column resting on the figure (nothing else had room) puts each
   * pill at its anchor's height, right over it. It goes to the nearest
   * height, up first on a tie, where its box clears every shown anchor by
   * 8 px — room for the drift of an anchor against its loop-smoothed place —
   * and, when it reaches across the head, the head by FIG_GAP (inside the
   * run when it can). Beside the figure nothing is under a column: y comes
   * back as is.
   */
  _offAnchors(y, x0, x1, half, lo, hi) {
    const pad = half + 8;
    const hr = this.headRect;
    const acrossHead = hr.ok && x0 < hr.x1 + FIG_GAP && x1 > hr.x0 - FIG_GAP;
    for (let pass = 0; pass < 4; pass++) {
      // the interval [up, down] its centre must leave, if any
      let up = NaN;
      let down = NaN;
      for (const m of this.lay) {
        if (m.chosen && m.kx > x0 - 4 && m.kx < x1 + 4 && Math.abs(m.ky - y) < pad) {
          up = m.ky - pad;
          down = m.ky + pad;
          break;
        }
      }
      if (Number.isNaN(up) && acrossHead && y > hr.y0 - FIG_GAP - half && y < hr.y1 + FIG_GAP + half) {
        up = hr.y0 - FIG_GAP - half;
        down = hr.y1 + FIG_GAP + half;
      }
      if (Number.isNaN(up)) return y;
      y = (up >= lo && Math.abs(up - y) <= Math.abs(down - y)) || down > hi ? up : down;
    }
    return clamp(y, lo, hi);
  }

  _targetsBand(ord, slot) {
    if (!ord.length) return;
    const g = this.geo;
    const lo = this._bandLo(slot);
    const hi = Math.max(lo + 1, g.rowHi);
    const width = hi - lo;
    // pack in anchor order: the nearest row first, the rest further out
    let row = 0;
    let x = 0;
    for (const n of ord) {
      const w = Math.min(n.w, width);
      if (x > 0 && x + w > width) {
        row++;
        x = 0;
      }
      x += w + this.gap;
      n.row = row;
    }
    for (let r = 0; r <= row; r++) {
      const ty = slot === SLOT_T ? g.bandTopHi - this.pillH - r * g.pitch : g.bandBotLo + r * g.pitch;
      let k = 0;
      for (const n of ord) {
        if (n.row !== r) continue;
        this.desired[k] = n.kx - n.w / 2;
        this.widths[k] = n.w;
        k++;
      }
      solveRow(k, this.desired, this.widths, this.gap, lo, hi, this.solved, this.ws);
      k = 0;
      for (const n of ord) {
        if (n.row !== r) continue;
        const sx = this.solved[k++];
        if (n.slot !== slot) continue; // leaving: keeps its place while it fades
        if (n.placed && n.op >= 0.04 && n.drawRow !== r) {
          n.switching = true; // to another row: fades out where it is, then reappears
          continue;
        }
        n.tx = this._screenX(sx, n.w); // a pill wider than its row's room stays on screen all the same
        n.ty = ty;
        n.tgtSide = slot;
      }
    }
  }

  /** x clamped so a pill (or card) w wide stays inside the screen's margin. */
  _screenX(x, w) {
    return clamp(x, SCREEN_MARGIN, Math.max(SCREEN_MARGIN, this.vw - SCREEN_MARGIN - w));
  }

  /** The same for y and a height hh. */
  _screenY(y, hh) {
    return clamp(y, SCREEN_MARGIN, Math.max(SCREEN_MARGIN, this.vh - SCREEN_MARGIN - hh));
  }

  /**
   * Re-solve the drawn centres of a column in order every frame: in motion,
   * pills still never overlap. Pills not on screen take no room. The bounds
   * are the whole column run, so a column never snaps into a narrower one.
   */
  _projectColumn(ord, slot, pitch) {
    const proj = this.projTmp;
    proj.length = 0;
    for (const n of ord) if (n.placed && (n.op >= 0.02 || n.switching)) proj.push(n);
    const k = proj.length;
    if (k < 2) return;
    const g = this.geo;
    const i = slot < 0 ? 0 : 1;
    const half = this.pillH / 2;
    const lo = g.colTopC[i] + half; // the run between the band rows: a column never runs into them
    const hi = Math.max(lo, g.colBottomC[i] - half);
    const d = this.desired;
    for (let i = 0; i < k; i++) d[i] = proj[i].y + half;
    solveColumn(k, d, pitch, lo, hi, this.solved, this.ws);
    for (let i = 0; i < k; i++) proj[i].y = this.solved[i] - half;
  }

  /** The same for each drawn row of a band. */
  _projectBand(ord, slot) {
    if (ord.length < 2) return;
    const lo = this._bandLo(slot);
    const hi = Math.max(lo + 1, this.geo.rowHi);
    let rows = 0;
    for (const n of ord) if (n.drawRow > rows) rows = n.drawRow;
    for (let r = 0; r <= rows; r++) {
      let k = 0;
      for (const n of ord) {
        if (n.drawRow !== r || !n.placed || !(n.op >= 0.02 || n.switching)) continue;
        this.desired[k] = n.x;
        this.widths[k] = n.w;
        k++;
      }
      if (k < 2) continue;
      solveRow(k, this.desired, this.widths, this.gap, lo, hi, this.solved, this.ws);
      k = 0;
      for (const n of ord) {
        if (n.drawRow !== r || !n.placed || !(n.op >= 0.02 || n.switching)) continue;
        n.x = this._screenX(this.solved[k++], n.w);
      }
    }
  }

  /** Is `n`'s place clear of every pill on screen (so it may show there)? */
  _clear(n) {
    const pad = this.gap / 2;
    const x0 = n.tx - pad;
    const y0 = n.ty - pad;
    const x1 = n.tx + n.w + pad;
    const y1 = n.ty + n.h + pad;
    for (const m of this.nodes.values()) {
      if (m === n || m.op <= 0.05 || !m.placed) continue;
      if (m.x < x1 && m.x + m.w > x0 && m.y < y1 && m.y + m.h > y0) return false;
    }
    return true;
  }

  /** Tab order follows the key as read: rows above, left column, right column, rows below. */
  _syncDomOrder() {
    const dom = this.domOrder;
    this._domI = 0;
    this._domSame = true;
    // upper rows read first (the furthest row is the top one)
    let rows = 0;
    for (const n of this.ordT) if (n.drawRow > rows) rows = n.drawRow;
    for (let r = rows; r >= 0; r--) this._visitDom(this.ordT, r);
    this._visitDom(this.ordL, -1);
    this._visitDom(this.ordR, -1);
    rows = 0;
    for (const n of this.ordB) if (n.drawRow > rows) rows = n.drawRow;
    for (let r = 0; r <= rows; r++) this._visitDom(this.ordB, r);
    if (dom.length !== this._domI) this._domSame = false;
    dom.length = this._domI;
    if (this._domSame) return;
    // moving a focused element would blur it: wait until focus leaves the pills
    if (this.pills.contains(document.activeElement)) {
      dom.length = 0;
      return;
    }
    for (const n of dom) this.pills.append(n.el);
  }

  _visitDom(ord, row) {
    const dom = this.domOrder;
    for (const n of ord) {
      if (row >= 0 && n.drawRow !== row) continue;
      if (dom[this._domI] !== n) this._domSame = false;
      dom[this._domI++] = n;
    }
  }

  _write(n) {
    const vis = n.op > 0.003;
    if (vis !== n.wvis) {
      n.wvis = vis;
      n.el.style.visibility = vis ? '' : 'hidden';
      n.g.style.display = vis ? '' : 'none';
      if (!vis) {
        n.wx = n.wy = n.wax = n.way = NaN;
        n.wop = n.wdv = -1;
      }
    }
    if (!vis) return;
    if (differs(n.op, n.wop, 0.003) || differs(n.dv, n.wdv, 0.003)) {
      n.el.style.opacity = n.op.toFixed(3);
      n.g.style.opacity = (n.op * n.dv).toFixed(3);
      n.wop = n.op;
      n.wdv = n.dv;
    }
    if (n.dimmed !== n.wdim) {
      n.wdim = n.dimmed;
      n.el.classList.toggle('is-dimmed', n.dimmed);
    }
    if (n.far !== n.wfar) {
      n.wfar = n.far;
      n.g.classList.toggle('is-far', n.far);
    }
    const moved = differs(n.x, n.wx, 0.04) || differs(n.y, n.wy, 0.04);
    if (moved) {
      n.el.style.transform = `translate3d(${n.x.toFixed(2)}px,${n.y.toFixed(2)}px,0)`;
      n.wx = n.x;
      n.wy = n.y;
    }
    const mark = n.drawMark;
    const remark = mark !== n.wmark;
    if (remark) {
      n.wmark = mark;
      n.g.classList.toggle('is-ring', mark === 'ring');
      n.g.classList.toggle('is-tick', mark === 'tick');
    }
    if (moved || remark || this.featMoved || n.side !== n.wside || differs(n.ax, n.wax, 0.04) || differs(n.ay, n.way, 0.04) || differs(n.ar, n.war, 0.04)) {
      n.wax = n.ax;
      n.way = n.ay;
      n.war = n.ar;
      n.wside = n.side;
      // the pill's edge, then (with an elbow) the turn: (px, py) is where the
      // last stretch towards the anchor starts
      let pts;
      let px;
      let py;
      if (n.side === SLOT_T || n.side === SLOT_B) {
        // rows: a vertical tick from the pill's middle, then to the anchor
        const dir = n.side === SLOT_T ? 1 : -1;
        const sx = n.x + n.w / 2;
        const sy = n.side === SLOT_T ? n.y + n.h : n.y;
        const ey = sy + dir * ELBOW;
        const bend = (n.ay - ey) * dir > 0;
        px = sx;
        py = bend ? ey : sy;
        pts = bend ? `${sx.toFixed(1)},${sy.toFixed(1)} ` : '';
      } else {
        const sy = n.y + n.h / 2;
        const dir = n.side < 0 ? 1 : -1;
        const sx = n.side < 0 ? n.x + n.w : n.x;
        const ex = sx + dir * ELBOW;
        const bend = (n.ax - ex) * dir > 0;
        px = bend ? ex : sx;
        py = sy;
        pts = bend ? `${sx.toFixed(1)},${sy.toFixed(1)} ` : '';
      }
      pts += `${px.toFixed(1)},${py.toFixed(1)} `;
      // another face feature on the way (an eye between the pill and the
      // mouth): the last stretch turns round it (_bend)
      const turns = this._bend(n, px, py);
      if (turns) {
        const b = this.bendXY;
        for (let i = 0; i < turns; i++) pts += `${b[2 * i].toFixed(1)},${b[2 * i + 1].toFixed(1)} `;
        px = b[2 * turns - 2];
        py = b[2 * turns - 1];
      }
      // the leader stops short of what it names (at a ring's edge; a tick
      // outside its feature — where a ring would be, when its radius is known
      // — or TICK_GAP short of its anchor; a dot sits on its end), and its
      // white halo 8 px sooner
      const dx = n.ax - px;
      const dy = n.ay - py;
      const len = Math.hypot(dx, dy);
      const ux = len > 1e-6 ? dx / len : 0;
      const uy = len > 1e-6 ? dy / len : 0;
      const gap = mark === 'ring' ? n.ar + RING_PAD : mark === 'tick' ? Math.max(TICK_GAP, n.ar > 0 ? n.ar + RING_PAD : 0) : 0;
      const end = Math.min(gap, len);
      const haloEnd = Math.min(gap + HALO_STOP, len);
      n.line.setAttribute('points', `${pts}${(n.ax - ux * end).toFixed(1)},${(n.ay - uy * end).toFixed(1)}`);
      n.halo.setAttribute('points', `${pts}${(n.ax - ux * haloEnd).toFixed(1)},${(n.ay - uy * haloEnd).toFixed(1)}`);
      n.dot.setAttribute('cx', n.ax.toFixed(1));
      n.dot.setAttribute('cy', n.ay.toFixed(1));
      n.ring.setAttribute('cx', n.ax.toFixed(1));
      n.ring.setAttribute('cy', n.ay.toFixed(1));
      n.ring.setAttribute('r', (n.ar + RING_PAD).toFixed(2));
    }
  }

  /**
   * Would the last stretch of n's leader — from (px, py) to its anchor —
   * cross another face feature (an eye between a pill and the mouth's
   * corner)? Then it turns round the first one on its way, BEND_PAD outside
   * that feature's ring, on the side it already passes (kept while a bend is
   * needed, so a moving head does not flip it): at the corner where the
   * tangents from both ends meet, or at the two tangent points when that
   * corner lies far out. A feature its own anchor sits against is no
   * obstacle: the leader ends there.
   * @returns {number} turning points written to bendXY (0: straight)
   */
  _bend(n, px, py) {
    const f = this.feats;
    const dx = n.ax - px;
    const dy = n.ay - py;
    const l2 = dx * dx + dy * dy;
    let hit = -1;
    let hitT = Infinity;
    let side = 0;
    for (let i = 0; i < this.featN && l2 > 1; i++) {
      if (this.featNode[i] === n) continue;
      const cx = f[3 * i];
      const cy = f[3 * i + 1];
      const r = f[3 * i + 2] + RING_PAD + BEND_PAD;
      if (Math.hypot(n.ax - cx, n.ay - cy) <= r + 1 || Math.hypot(px - cx, py - cy) <= r + 1) continue;
      const t = ((cx - px) * dx + (cy - py) * dy) / l2;
      if (t <= 0 || t >= 1 || t >= hitT) continue;
      const qx = px + t * dx - cx; // from the feature's centre to the stretch
      const qy = py + t * dy - cy;
      if (Math.hypot(qx, qy) >= (n.bend ? r + 2 : r)) continue;
      hit = i;
      hitT = t;
      side = n.bend || (dx * qy - dy * qx >= 0 ? 1 : -1); // left (+1) or right of the stretch's way
    }
    n.bend = hit < 0 ? 0 : side;
    if (hit < 0) return 0;
    const cx = f[3 * hit];
    const cy = f[3 * hit + 1];
    const r = f[3 * hit + 2] + RING_PAD + BEND_PAD;
    const l = Math.sqrt(l2);
    const nx = (-dy / l) * side; // the side the leader passes on
    const ny = (dx / l) * side;
    const b = this.bendXY;
    tangentPoint(px, py, cx, cy, r, nx, ny, b, 0);
    tangentPoint(n.ax, n.ay, cx, cy, r, nx, ny, b, 2);
    const d1x = b[0] - px;
    const d1y = b[1] - py;
    const d2x = b[2] - n.ax;
    const d2y = b[3] - n.ay;
    const den = d1x * d2y - d1y * d2x;
    if (Math.abs(den) > 1e-6) {
      const a = ((n.ax - px) * d2y - (n.ay - py) * d2x) / den;
      const wx = px + a * d1x;
      const wy = py + a * d1y;
      if (a >= 1 && Math.hypot(wx - cx, wy - cy) <= 3 * r) {
        b[0] = wx;
        b[1] = wy;
        return 1;
      }
    }
    return 2;
  }

  _create(id) {
    const n = new LabelNode(id);
    this.nodes.set(id, n);
    this.pills.append(n.el);
    this.svg.append(n.g);
    return n;
  }

  _remove(n) {
    n.el.remove();
    n.g.remove();
    const i = this.domOrder.indexOf(n);
    if (i >= 0) this.domOrder.splice(i, 1);
  }

  _nodeFrom(target) {
    const el = target?.closest?.('.lam-pill');
    return el ? this.nodes.get(el.dataset.labelId) ?? null : null;
  }

  _scheduleClose() {
    clearTimeout(this._hideT);
    this._hideT = setTimeout(() => {
      if (!this.pinned) this.closeCard();
    }, 140);
  }

  _measureCard() {
    this.cardW = this.card.offsetWidth || 260;
    this.cardH = this.card.offsetHeight || 80;
  }

  /**
   * The floating card goes beside its pill, at the first of these places
   * that keeps off the figure (the App's rectangle: in a landscape phone's
   * head close-up, the face), off its own pill and inside the free band
   * between the bars: a column pill's card below it, then above, reaching
   * across towards the figure as it always did, then the same two reaching
   * away from it, then out to the side, then in; a row pill's card away from
   * the figure, then towards it, then to either side. When no place is
   * clear, it takes the one that covers least (the figure weighs most, then
   * its pill, the bars and the other pills). It keeps its place while that
   * is about as good as the best, so it never hops as the figure moves.
   */
  _placeCard(n) {
    if (!n) return;
    const w = this.cardW;
    const hh = this.cardH;
    const P = this.cardXY;
    const below = n.y + n.h + CARD_GAP;
    const above = n.y - CARD_GAP - hh;
    const level = n.y + n.h / 2 - hh / 2;
    let k = 0;
    if (n.side === SLOT_T || n.side === SLOT_B) {
      const x = n.x + n.w / 2 - w / 2;
      k = this._cardPlace(k, x, n.side === SLOT_T ? above : below);
      k = this._cardPlace(k, x, n.side === SLOT_T ? below : above);
      k = this._cardPlace(k, n.x - CARD_GAP - w, level);
      k = this._cardPlace(k, n.x + n.w + CARD_GAP, level);
    } else {
      const toward = n.side < 0 ? n.x : n.x + n.w - w; // the card's outer edge on the pill's
      const away = n.side < 0 ? n.x + n.w - w : n.x;
      k = this._cardPlace(k, toward, below);
      k = this._cardPlace(k, toward, above);
      k = this._cardPlace(k, away, below);
      k = this._cardPlace(k, away, above);
      k = this._cardPlace(k, n.side < 0 ? n.x - CARD_GAP - w : n.x + n.w + CARD_GAP, level);
      k = this._cardPlace(k, n.side < 0 ? n.x + n.w + CARD_GAP : n.x - CARD_GAP - w, level);
    }
    let pick = 0;
    let best = Infinity;
    for (let i = 0; i < k; i += 2) {
      const s = this._cardCost(n, P[i], P[i + 1], w, hh);
      if (s < best) {
        best = s;
        pick = i;
      }
    }
    const held = this.cardPick;
    if (held >= 0 && held < k && held !== pick && this._cardCost(n, P[held], P[held + 1], w, hh) <= best + Math.max(200, 0.02 * w * hh)) pick = held;
    this.cardPick = pick;
    const x = P[pick];
    const y = P[pick + 1];
    if (differs(x, this.cardX, 0.04) || differs(y, this.cardY, 0.04)) {
      this.card.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      this.cardX = x;
      this.cardY = y;
    }
  }

  /** Write a candidate place for the card (kept on screen) at cardXY[k]. @returns {number} k + 2 */
  _cardPlace(k, x, y) {
    this.cardXY[k] = this._screenX(x, this.cardW);
    this.cardXY[k + 1] = this._screenY(y, this.cardH);
    return k + 2;
  }

  /** What a card at (x, y) would cover (px², weighted; 0: a clear place). */
  _cardCost(n, x, y, w, hh) {
    let s = overlap(x, y, w, hh, n.x - 2, n.y - 2, n.x + n.w + 2, n.y + n.h + 2) * 12;
    const f = this.figCard;
    if (this.figRect.ok) s += overlap(x, y, w, hh, f.x0 - FIG_GAP, f.y0 - FIG_GAP, f.x1 + FIG_GAP, f.y1 + FIG_GAP) * 4;
    // the face weighs most (inspecting, the figure fills the view and every place is on it)
    const hr = this.headRect;
    if (hr.ok) s += overlap(x, y, w, hh, hr.x0 - FIG_GAP, hr.y0 - FIG_GAP, hr.x1 + FIG_GAP, hr.y1 + FIG_GAP) * 6;
    // the top bar's and the toolbar's bands
    s += overlap(x, y, w, hh, 0, 0, this.vw, this.safeTop) + overlap(x, y, w, hh, 0, this.safeBottom, this.vw, this.vh);
    for (const m of this.nodes.values()) {
      if (m !== n && m.chosen && m.op > 0.3) s += overlap(x, y, w, hh, m.x, m.y, m.x + m.w, m.y + m.h) * 0.5;
    }
    return s;
  }

  // ------------------------------------------------------------ detail card
  /**
   * Highlight a label and show its detail card.
   * @param {LabelNode} n
   * @param {boolean} pinned  stays open until clicked again / outside / Esc
   */
  openCard(n, pinned) {
    clearTimeout(this._showT);
    clearTimeout(this._hideT);
    if (!n) return;
    if (this.activeId !== n.id) {
      this._deactivate();
      this.cardPick = -1;
    }
    this.activeId = n.id;
    this.pinned = !!pinned;
    this.autoFocus = false;
    this.cardAway = n.switching || !n.placed || n.op < 0.5;
    this.card.classList.toggle('is-away', this.cardAway);
    n.el.classList.add('is-active');
    n.g.classList.add('is-active');
    n.el.setAttribute('aria-expanded', 'true');
    if (n.detail) {
      this.cardKicker.textContent = n.text;
      this.cardText.textContent = n.detail;
      n.el.setAttribute('aria-describedby', this.cardId);
      this.card.classList.add('is-open');
      this._measureCard();
      this.cardX = this.cardY = NaN;
      if (!this.compact && !this.cardAway) this._placeCard(n);
    } else {
      this.card.classList.remove('is-open');
    }
  }

  /** The open card's label changed its words (another language): show the new ones in place. */
  _refreshCard() {
    const n = this.activeId != null ? this.nodes.get(this.activeId) : null;
    if (!n) return;
    if (!n.detail) {
      this.card.classList.remove('is-open');
      n.el.removeAttribute('aria-describedby');
      return;
    }
    this.cardKicker.textContent = n.text;
    this.cardText.textContent = n.detail;
    n.el.setAttribute('aria-describedby', this.cardId);
    this.card.classList.add('is-open');
    this._measureCard();
    this.cardX = this.cardY = NaN;
    if (!this.compact && !this.cardAway) this._placeCard(n);
  }

  /** Close the detail card (if any). @returns {boolean} true if one was open */
  closeCard() {
    clearTimeout(this._showT);
    clearTimeout(this._hideT);
    const was = this.activeId != null;
    this._deactivate();
    this.activeId = null;
    this.pinned = false;
    this.autoFocus = false;
    this.cardAway = false;
    this.card.classList.remove('is-open', 'is-away');
    return was;
  }

  /** True while a pinned card is showing (Esc closes it first). */
  get hasPinnedCard() {
    return this.activeId != null && this.pinned;
  }

  _deactivate() {
    const n = this.activeId != null ? this.nodes.get(this.activeId) : null;
    if (!n) return;
    n.el.classList.remove('is-active');
    n.g.classList.remove('is-active');
    n.el.setAttribute('aria-expanded', 'false');
    n.el.removeAttribute('aria-describedby');
  }

  /** Remove DOM and listeners. */
  dispose() {
    clearTimeout(this._showT);
    clearTimeout(this._hideT);
    document.removeEventListener('pointerdown', this._onDocDown, true);
    this.pills.removeEventListener('click', this._onClick);
    this.pills.removeEventListener('pointerover', this._onOver);
    this.pills.removeEventListener('pointerout', this._onOut);
    this.pills.removeEventListener('focusin', this._onFocusIn);
    this.pills.removeEventListener('focusout', this._onFocusOut);
    this.card.removeEventListener('pointerenter', this._onCardEnter);
    this.card.removeEventListener('pointerleave', this._onCardLeave);
    this.nodes.clear();
    this.el.remove();
  }
}
