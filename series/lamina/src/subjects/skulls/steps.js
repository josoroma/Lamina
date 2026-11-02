// Construction steps for the lesson versos: three numbered panels per lesson,
// drawn as clean line art on a 2D canvas (the typesetter calls drawStep).
//
//   drawStep(g2d, params, step, box, theme)
//     step 0  the big shape and the centre line (ball / egg / braincase)
//     step 1  guides: proportion lines, jaw taper or hinge, crests
//     step 2  sockets, apertures and the refined contour
//
// Why authored in centimetres: every point comes from the same craniometric
// landmarks as the 3D model (human.js / jaguar.js), so the verso diagram and
// the skull on the recto agree line for line. Steps are cumulative: earlier
// strokes fade to a light guide colour, the new step is inked.
import { HUMAN, VAULT_EGG, jawPose } from './human.js';
import { SNAKE } from './snake.js';
import { SPECIES } from '../snakes/species.js';

/** Default step titles per lesson (≤ 5 words each), for manifests. */
export const STEP_TITLES = {
  frontal: ['Ball and centre line', 'Guides and jaw taper', 'Sockets, nose, contour'],
  'open-jaw': ['Ball and hinge point', 'Swing the jaw open', 'Refine the open skull'],
  profile: ['Egg and ear line', 'Face wedge in a square', 'Refine the profile'],
  bones: ['Outline and sutures', 'Map the bones', 'Pull the bones apart'],
  jaguar: ['Braincase and muzzle box', 'Arch, crest and jaw', 'Canines and carnassials'],
  'skull-and-snake': ['Ball, axis and sockets', 'Thread the snake', 'Refine skull and snake'],
};

// ---------------------------------------------------------------- 2D toolkit

const mirror = (pts) => pts.map(([x, y]) => [-x, y]);

/** Closed or open Catmull-Rom spline through points, as canvas path commands. */
function spline(g, P, pts, closed = false, tension = 0.5) {
  const n = pts.length;
  if (n < 2) return;
  const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  g.moveTo(...P(pts[0]));
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3];
    g.bezierCurveTo(...P(c1), ...P(c2), ...P(p2));
  }
  if (closed) g.closePath();
}

function makePen(g, box, ext, theme) {
  // fit the drawing extents (cm) into the box with a margin, keep aspect
  const [x0, y0, x1, y1] = ext;
  const m = 0.08;
  const s = Math.min((box.w * (1 - 2 * m)) / (x1 - x0), (box.h * (1 - 2 * m)) / (y1 - y0));
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const P = ([x, y]) => [cx + (x - mx) * s, cy - (y - my) * s];
  const u = Math.max(0.6, Math.min(box.w, box.h) / 230); // stroke unit (px)
  const ink = theme?.ink ?? '#1c1a17';
  const accent = theme?.accent ?? '#a3342a';
  const muted = theme?.muted ?? '#8b8274';
  const styles = {
    guide: { color: accent, width: 1.0, dash: null, alpha: 0.9 },
    dashed: { color: accent, width: 0.95, dash: [5, 4], alpha: 0.9 },
    old: { color: muted, width: 0.85, dash: null, alpha: 0.55 },
    oldDashed: { color: muted, width: 0.8, dash: [5, 4], alpha: 0.5 },
    contour: { color: ink, width: 1.75, dash: null, alpha: 1 },
    detail: { color: ink, width: 1.05, dash: null, alpha: 1 },
    fine: { color: ink, width: 0.7, dash: null, alpha: 0.9 },
  };
  const set = (k) => {
    const st = styles[k] ?? styles.detail;
    g.strokeStyle = st.color;
    g.globalAlpha = st.alpha;
    g.lineWidth = st.width * u;
    g.setLineDash(st.dash ? st.dash.map((d) => d * u) : []);
  };
  const paper = theme?.paper ?? '#fbf8f1';
  const pen = {
    P, s, u, ink, accent, paper,
    /** stroke a spline through cm points */
    curve(pts, k = 'detail', closed = false, tension = 0.5) {
      set(k);
      g.beginPath();
      spline(g, P, pts, closed, tension);
      g.stroke();
    },
    poly(pts, k = 'detail', closed = false) {
      set(k);
      g.beginPath();
      g.moveTo(...P(pts[0]));
      for (let i = 1; i < pts.length; i++) g.lineTo(...P(pts[i]));
      if (closed) g.closePath();
      g.stroke();
    },
    line(a, b, k = 'detail') {
      pen.poly([a, b], k);
    },
    ellipse(c, rx, ry, k = 'detail', rot = 0, a0 = 0, a1 = Math.PI * 2) {
      set(k);
      g.beginPath();
      const [px, py] = P(c);
      g.ellipse(px, py, rx * s, ry * s, -rot, -a0, -a1, true);
      g.stroke();
    },
    /** paper-filled, inked closed shape (occludes the strokes behind it) */
    shape(pts, paper, k = 'detail', tension = 0.5) {
      g.globalAlpha = 1;
      g.fillStyle = paper;
      g.setLineDash([]);
      g.beginPath();
      spline(g, P, pts, true, tension);
      g.fill();
      pen.curve(pts, k, true, tension);
    },
    fill(pts, color, alpha = 1, closed = true) {
      g.globalAlpha = alpha;
      g.fillStyle = color;
      g.setLineDash([]);
      g.beginPath();
      spline(g, P, pts, closed);
      g.fill();
    },
    /** fill a closed spline with a tone that fades (cm): `alpha` at c0 → 0 at c1 */
    fillFade(pts, color, c0, c1, alpha = 1) {
      const grad = g.createLinearGradient(...P(c0), ...P(c1));
      const rgb = /^#[0-9a-f]{6}$/i.test(color) ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)).join(',') : '17,17,17';
      grad.addColorStop(0, `rgba(${rgb},${alpha})`);
      grad.addColorStop(0.45, `rgba(${rgb},${alpha * 0.75})`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      g.globalAlpha = 1;
      g.fillStyle = grad;
      g.setLineDash([]);
      g.beginPath();
      spline(g, P, pts, true);
      g.fill();
    },
    fillEllipse(c, rx, ry, color, alpha = 1, rot = 0) {
      g.globalAlpha = alpha;
      g.fillStyle = color;
      g.beginPath();
      const [px, py] = P(c);
      g.ellipse(px, py, rx * s, ry * s, -rot, 0, Math.PI * 2);
      g.fill();
    },
    dot(c, r = 1.6, color = accent) {
      g.globalAlpha = 1;
      g.fillStyle = color;
      g.beginPath();
      const [px, py] = P(c);
      g.arc(px, py, r * u, 0, Math.PI * 2);
      g.fill();
    },
    /** run `draw` clipped to a circle (cm), on a paper ground (detail insets) */
    inset(c, r, draw) {
      const [px, py] = P(c);
      g.save();
      g.beginPath();
      g.arc(px, py, r * s, 0, Math.PI * 2);
      g.globalAlpha = 1;
      g.fillStyle = paper;
      g.fill();
      g.clip();
      draw();
      g.restore();
    },
    arrow(a, b, k = 'guide') {
      pen.line(a, b, k);
      const [ax, ay] = P(a), [bx, by] = P(b);
      const ang = Math.atan2(by - ay, bx - ax), L = 5 * u;
      set(k);
      g.setLineDash([]);
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(bx - L * Math.cos(ang - 0.45), by - L * Math.sin(ang - 0.45));
      g.moveTo(bx, by);
      g.lineTo(bx - L * Math.cos(ang + 0.45), by - L * Math.sin(ang + 0.45));
      g.stroke();
    },
  };
  return pen;
}

/** Rounded rectangle outline (cm) centred at c, half sizes hw, hh, corner r, rotated rot (rad). */
function roundRect(c, hw, hh, r, rot = 0, n = 6) {
  const pts = [];
  const corners = [[hw - r, hh - r, 0], [-(hw - r), hh - r, Math.PI / 2], [-(hw - r), -(hh - r), Math.PI], [hw - r, -(hh - r), Math.PI * 1.5]];
  for (const [x0, y0, a0] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (Math.PI / 2) * (i / n);
      const x = x0 + Math.cos(a) * r, y = y0 + Math.sin(a) * r;
      pts.push([c[0] + x * Math.cos(rot) - y * Math.sin(rot), c[1] + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
  }
  return pts;
}

/** Points on the pen's Catmull-Rom spline through `pts` (n per segment). */
function splinePoints(pts, n = 16, tension = 0.5) {
  const N = pts.length;
  const get = (i) => pts[Math.max(0, Math.min(N - 1, i))];
  const out = [pts[0]];
  for (let i = 0; i < N - 1; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3];
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      out.push([a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0], a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1]]);
    }
  }
  return out;
}

/**
 * A suture along a spline (cm): the seam meanders ± `amp` about every
 * `period` cm with a finer interlocking wiggle on top — a zip, not a crack.
 * Seeded, so the printed page is the same on every render.
 */
function sutureLine(pts, amp, period, seed = 1) {
  const P = splinePoints(pts, 24);
  const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const total = L[L.length - 1];
  const f1 = 6.2831853 / period, f2 = f1 * 2.35, ph1 = seed * 1.7, ph2 = seed * 4.1;
  const out = [];
  let j = 0;
  for (let s = 0; s <= total + 1e-9; s += period / 10) {
    while (j < P.length - 2 && L[j + 1] < s) j++;
    const seg = Math.max(1e-9, L[j + 1] - L[j]);
    const t = Math.min(1, (s - L[j]) / seg);
    const x = P[j][0] + (P[j + 1][0] - P[j][0]) * t, y = P[j][1] + (P[j + 1][1] - P[j][1]) * t;
    const tx = (P[j + 1][0] - P[j][0]) / seg, ty = (P[j + 1][1] - P[j][1]) / seg;
    const env = Math.min(1, s / period, (total - s) / period); // the seam meets its neighbours on the curve
    const d = amp * env * (0.7 * Math.sin(s * f1 + ph1) + 0.3 * Math.sin(s * f2 + ph2)) * (0.75 + 0.25 * Math.sin(s * 0.9 + seed));
    out.push([x - ty * d, y + tx * d]);
  }
  return out;
}

/** Pear outline: circle r1 at c, circle r2 at c + (0, h). */
function pear(c, r1, r2, h, n = 28) {
  const b = (r1 - r2) / h, a = Math.sqrt(1 - b * b), ang = Math.atan2(b, a);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = ang - (Math.PI + 2 * ang) * (i / n);
    pts.push([c[0] + Math.cos(t) * r1, c[1] + Math.sin(t) * r1]);
  }
  for (let i = 1; i < n / 2; i++) {
    const t = Math.PI - ang - (Math.PI - 2 * ang) * (i / (n / 2));
    pts.push([c[0] + Math.cos(t) * r2, c[1] + h + Math.sin(t) * r2]);
  }
  return pts;
}

// ---------------------------------------------------------------- human shapes (cm)

const H = HUMAN;
// frontal silhouette, right half (x ≤ 0), top → chin
const FRONT_HALF = [
  [0, 11.4], [-3.4, 10.8], [-5.6, 9.25], [-6.75, 7.25], [-7.0, 5.6], [-6.85, 3.8], [-6.4, 2.3], [-6.3, 1.0],
  [-6.72, 0.25], [-6.82, -0.5], [-6.5, -1.1], [-5.6, -1.35], [-5.35, -2.3], [-5.22, -4.6], [-5.05, -6.25],
  [-4.55, -7.15], [-3.25, -8.35], [-1.5, -9.15], [0, -9.3],
];
const FRONT = [...FRONT_HALF, ...mirror(FRONT_HALF).reverse().slice(1, -1)];
// profile silhouette (z → right), cranium + upper face, clockwise from the glabella
const PROFILE_CRANIUM = [
  [9.95, 4.15], [9.55, 6.6], [8.7, 8.7], [6.9, 10.35], [4.4, 11.15], [1.9, 11.4], [-1.2, 11.2], [-4.2, 10.2],
  [-6.7, 8.35], [-8.2, 6.4], [-8.78, 3.8], [-8.6, 1.4], [-7.7, -0.35], [-5.9, -1.55], [-4.1, -2.0],
  [-2.6, -2.75], [-1.55, -2.35], [-0.9, -1.2],
];
const PROFILE_FACE = [
  [9.95, 4.15], [9.55, 3.0], [9.92, 1.95], [10.45, 0.85], [10.05, 0.55], [9.9, -0.9], [10.05, -1.95], [10.8, -2.02],
  [10.0, -2.45], [9.95, -3.1], [10.15, -3.95],
];
const PROFILE_MANDIBLE = [
  [10.15, -5.0], [9.95, -5.75], [9.75, -6.8], [10.35, -8.45], [9.3, -9.25], [7.2, -8.85], [5.0, -8.25], [2.9, -7.25],
  [1.85, -6.6], [1.45, -5.4], [1.2, -3.4], [1.05, -1.7], [1.3, -0.4], [1.9, -0.75], [2.6, -1.95], [3.5, -1.3],
  [4.05, -0.7], [4.3, -2.5], [4.45, -4.6], [4.9, -5.3],
];
const UPPER_TEETH_FRONT = (pen, k) => {
  // occlusal line and tooth divisions (frontal)
  const xs = [-2.85, -2.45, -2.1, -1.75, -1.2, -0.45, 0.45, 1.2, 1.75, 2.1, 2.45, 2.85];
  pen.curve([[-3.0, -4.6], [-1.5, -4.92], [0, -5.0], [1.5, -4.92], [3.0, -4.6]], k);
  pen.curve([[-3.0, -3.75], [-1.5, -3.95], [0, -3.98], [1.5, -3.95], [3.0, -3.75]], k);
  pen.curve([[-2.9, -5.5], [-1.5, -5.75], [0, -5.8], [1.5, -5.75], [2.9, -5.5]], k);
  for (const x of xs) {
    const yTop = -3.95 + Math.abs(x) * 0.07, yBot = -5.75 + Math.abs(x) * 0.08;
    pen.line([x, yTop], [x * 0.98, yBot], 'fine');
  }
};

/**
 * Frontal orbits: rounded squares 3.9 × 3.4 cm, the lateral ends drooping 9°.
 * Centred ±3.0 cm off the midline, so the bony bridge between the medial rims
 * (≈ 2.1 cm) is about half an orbit wide — Howells' means give interorbital
 * breadth ≈ 0.54 × orbit breadth — and the biorbital breadth is ≈ 9.9 cm.
 */
function orbitShapes() {
  const [ox, oy] = [3.0, H.orbitCentre[1]];
  const R = roundRect([ox, oy], 1.95, 1.68, 1.25, -9 * (Math.PI / 180));
  const Lf = roundRect([-ox, oy], 1.95, 1.68, 1.25, 9 * (Math.PI / 180));
  return { L: R, R: Lf };
}

// ---------------------------------------------------------------- lessons

function frontal(pen, step) {
  const egg = VAULT_EGG;
  const k0 = step === 0 ? 'guide' : 'old';
  const kd = step === 0 ? 'dashed' : 'oldDashed';
  // step 0: ball + centre line
  pen.ellipse([0, egg.c[1]], egg.r[0], egg.r[1], k0);
  pen.line([0, 12.6], [0, -10.4], kd);
  pen.line([-7.6, egg.c[1]], [7.6, egg.c[1]], step === 0 ? 'guide' : 'old');
  if (step === 0) return;
  // step 1: brow / eye / nose / mouth lines, side planes, jaw taper
  const k1 = step === 1 ? 'guide' : 'old';
  for (const y of [H.glabella[1] - 0.5, H.orbitCentre[1], H.nasospinale[1], H.occlusalFront[1], H.menton[1]]) pen.line([-7.4, y], [7.4, y], step === 1 ? 'dashed' : 'oldDashed');
  pen.line([-H.zygion[0], H.zygion[1]], [-H.gonion[0], H.gonion[1]], k1);
  pen.line([-H.gonion[0], H.gonion[1]], [0, H.menton[1]], k1);
  pen.line([0, H.menton[1]], [H.gonion[0], H.gonion[1]], k1);
  pen.line([H.gonion[0], H.gonion[1]], [H.zygion[0], H.zygion[1]], k1);
  pen.line([-H.zygion[0], H.zygion[1]], [H.zygion[0], H.zygion[1]], k1);
  for (const s of [-1, 1]) pen.line([s * 5.2, egg.c[1] + 3.6], [s * 5.2, H.zygion[1]], step === 1 ? 'dashed' : 'oldDashed');
  if (step === 1) {
    pen.dot([0, H.menton[1]]);
    for (const s of [-1, 1]) {
      pen.dot([s * H.zygion[0], H.zygion[1]]);
      pen.dot([s * H.gonion[0], H.gonion[1]]);
    }
    return;
  }
  // step 2: sockets, nasal aperture, refined contour
  const orb = orbitShapes();
  pen.fill(orb.L, pen.ink, 0.9);
  pen.fill(orb.R, pen.ink, 0.9);
  const ap = pear([0, -0.95], 1.24, 0.34, 2.1);
  pen.fill(ap, pen.ink, 0.9);
  pen.curve(FRONT, 'contour', true);
  // cheekbones, temples and the maxilla
  for (const s of [-1, 1]) {
    pen.curve([[s * 5.25, 3.3], [s * 5.4, 1.4], [s * 5.15, -0.6], [s * 4.3, -1.7], [s * 3.6, -2.6]], 'detail');
    pen.curve([[s * 5.3, 3.4], [s * 5.9, 5.0], [s * 6.25, 7.0]], 'fine');
    pen.curve([[s * 3.4, -2.4], [s * 2.6, -3.3], [s * 1.6, -3.7]], 'fine');
    pen.curve([[s * 5.05, -1.4], [s * 4.85, -3.6], [s * 4.75, -5.5]], 'fine');
  }
  pen.curve([[-0.9, -7.6], [0, -8.55], [0.9, -7.6]], 'fine');
  pen.line([0, -2.1], [0, -2.5], 'detail');
  UPPER_TEETH_FRONT(pen, 'detail');
}

function profileBase(pen, step, steps = { egg: 0, wedge: 1 }) {
  const egg = VAULT_EGG;
  const kEgg = step === steps.egg ? 'guide' : 'old';
  pen.ellipse([egg.c[2], egg.c[1]], egg.r[2], egg.r[1], kEgg);
  pen.line([0, 12.8], [0, -10.4], step === steps.egg ? 'dashed' : 'oldDashed'); // ear line
  pen.line([-9.6, 0], [11.4, 0], step === steps.egg ? 'dashed' : 'oldDashed'); // Frankfort plane
  pen.dot([0, 0], 1.4, step === steps.egg ? pen.accent : '#8b8274');
}

function profileContour(pen, mandible = PROFILE_MANDIBLE) {
  pen.curve(PROFILE_CRANIUM, 'contour');
  pen.curve(PROFILE_FACE, 'contour', false, 0.35);
  pen.curve(mandible, 'contour');
  // zygomatic arch, orbit rim, ear hole, mastoid, temporal line
  pen.curve([[7.1, 0.25], [4.5, 0.2], [2.0, 0.1], [0.6, -0.05]], 'detail');
  pen.curve([[6.9, -1.15], [4.5, -1.05], [2.1, -0.95], [1.0, -0.8]], 'detail');
  pen.curve([[7.2, 3.6], [6.95, 2.0], [7.05, 0.3]], 'detail');
  pen.fill([[8.95, 3.3], [7.5, 3.2], [7.2, 1.6], [7.6, 0.2], [8.9, 0.15], [9.4, 1.6]], pen.ink, 0.88);
  pen.fillEllipse([0, -0.45], 0.45, 0.42, pen.ink, 0.9);
  pen.curve([[-0.6, -1.1], [-1.25, -2.7], [-1.9, -1.6]], 'detail');
  pen.curve([[7.1, 4.4], [4.0, 8.3], [-1.5, 8.6], [-5.4, 5.2], [-5.6, 1.4]], 'fine');
  // teeth row
  pen.line([4.6, -4.55], [10.3, -5.0], 'fine');
  for (const z of [5.2, 6.1, 7.0, 7.7, 8.4, 9.05, 9.65]) pen.line([z, -3.7 - (10 - z) * 0.02], [z + 0.05, -5.6], 'fine');
}

function profileLesson(pen, step) {
  profileBase(pen, step);
  if (step === 0) return;
  const k = step === 1 ? 'guide' : 'old';
  // face wedge and the square
  pen.poly([[9.95, 4.15], [10.4, -8.45], [1.75, -6.45], [0, 0]], k);
  const top = H.vertex[1], bot = H.menton[1], back = H.opisthocranion[2], front = H.pogonion[2] + 0.4;
  pen.poly([[back, top], [front, top], [front, bot], [back, bot]], k, true);
  for (const y of [H.glabella[1] - 0.5, H.nasospinale[1], H.occlusalFront[1]]) pen.line([back, y], [front + 0.8, y], step === 1 ? 'dashed' : 'oldDashed');
  if (step === 1) {
    pen.dot([9.95, 4.15]);
    pen.dot([10.4, -8.45]);
    pen.dot([1.75, -6.45]);
    return;
  }
  profileContour(pen);
}

// Underside of the temporal bone along the jaw joint (profile, z → right), traced from
// the 3D model through the condyle: the lower border of the zygomatic arch, the
// articular eminence (the ridge ahead of the socket, crest ≈ 1 cm below the roof),
// the mandibular fossa (the socket) and the postglenoid process before the ear canal.
const TMJ_PROFILE = [
  [6.9, -1.15], [4.5, -1.05], [3.2, -1.06], [2.65, -1.24], [2.25, -1.32], [1.95, -1.02], [1.7, -0.45],
  [1.4, -0.28], [1.0, -0.34], [0.72, -0.6], [0.45, -1.2],
];

// Condylar process of the closed mandible (profile): posterior border of the neck, the
// rounded head (the 3D condyle's 0.52 × 0.45 cm section), the front of the neck down
// into the sigmoid notch and up towards the coronoid process.
const CONDYLE = (() => {
  const [cz, cy] = [H.condylion[2], H.condylion[1]];
  const pts = [[cz - 0.3, cy - 2.4], [cz - 0.4, cy - 1.15]];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * (1.15 - 1.3 * (i / 14));
    pts.push([cz + Math.cos(a) * 0.52, cy + Math.sin(a) * 0.45]);
  }
  pts.push([cz + 0.62, cy - 0.62], [cz + 0.85, cy - 1.0], [cz + 1.3, cy - 1.13], [cz + 1.9, cy - 0.75]);
  return pts;
})();

/**
 * The jaw opened to fraction o (profile, [z, y] cm) by the same rule as the 3D
 * figure (jawPose): rotation about the condyle plus the condyle's glide.
 * @returns {{ piv: number[], hinge: number[], pose: (p: number[]) => number[] }}
 */
function jawOpener(o = 1) {
  const piv = [H.condylion[2], H.condylion[1]];
  const p = jawPose(o);
  const c = Math.cos(p.angle), s = Math.sin(p.angle);
  const hinge = [piv[0] + p.glide[2], piv[1] + p.glide[1]];
  const pose = ([z, y]) => {
    const dz = z - piv[0], dy = y - piv[1];
    return [hinge[0] + dz * c + dy * s, hinge[1] - dz * s + dy * c];
  };
  return { piv, hinge, pose };
}

/**
 * Detail of the jaw joint (2.5×) in the empty corner below the occiput: the
 * socket and the ridge ahead of it, the closed condyle as a ghost and the open
 * one glided forward and down under the crest, with the path it took.
 */
function jointDetail(pen, step, J, glide) {
  const D = { c: [-7.0, -9.4], r: 4.4, src: [1.3, -0.95], sr: 1.76 };
  const k = D.r / D.sr;
  const mag = ([z, y]) => [D.c[0] + (z - D.src[0]) * k, D.c[1] + (y - D.src[1]) * k];
  const d = [D.c[0] - D.src[0], D.c[1] - D.src[1]];
  const L = Math.hypot(d[0], d[1]);
  const kl = step === 1 ? 'guide' : 'fine';
  pen.ellipse(D.src, D.sr, D.sr, kl);
  pen.line([D.src[0] + (d[0] / L) * D.sr, D.src[1] + (d[1] / L) * D.sr], [D.c[0] - (d[0] / L) * D.r, D.c[1] - (d[1] / L) * D.r], kl);
  pen.inset(D.c, D.r, () => {
    if (step === 1) {
      pen.curve(TMJ_PROFILE.map(mag), 'guide');
      pen.ellipse(mag([0, -0.45]), 0.45 * k, 0.42 * k, 'guide');
      pen.ellipse(mag(J.piv), 0.5 * k, 0.45 * k, 'oldDashed');
      pen.ellipse(mag(J.hinge), 0.5 * k, 0.45 * k, 'guide');
    } else {
      pen.curve(TMJ_PROFILE.map(mag), 'contour');
      pen.fillEllipse(mag([0, -0.45]), 0.45 * k, 0.42 * k, pen.ink, 0.9);
      pen.curve(CONDYLE.map(mag), 'oldDashed');
      pen.curve(CONDYLE.map(J.pose).map(mag), 'contour');
    }
    const path = glide.map(mag);
    pen.curve(path, 'guide');
    pen.arrow(path[path.length - 3], path[path.length - 1]);
    pen.dot(mag(J.piv), 1.5, '#8b8274');
    pen.dot(mag(J.hinge), 1.8);
  });
  pen.ellipse(D.c, D.r, D.r, 'detail');
}

function openJaw(pen, step) {
  profileBase(pen, step);
  const J = jawOpener(1);
  const { piv, hinge, pose } = J;
  if (step === 0) {
    pen.dot(piv, 2.2);
    pen.poly([[9.95, 4.15], [10.4, -8.45], [1.75, -6.45], piv], 'guide');
    return;
  }
  // swing the jaw wedge about the condyle (≈ 27°) while the condyle glides
  // forward and down out of its socket (≈ 1 cm): ≈ 5 cm at the incisors
  const k1 = step === 1 ? 'guide' : 'old';
  pen.poly([[9.95, 4.15], [10.4, -3.9], piv], k1);
  pen.poly([pose([10.15, -5.0]), pose([10.4, -8.45]), pose([1.75, -6.45]), hinge], k1);
  // the chin's path (down and back) and the condyle's (forward and down), opening step by step
  const chin = [], glide = [];
  for (let i = 0; i <= 24; i++) {
    const o = jawOpener(i / 24);
    chin.push(o.pose([10.4, -8.45]));
    glide.push(o.hinge);
  }
  pen.curve(chin, step === 1 ? 'dashed' : 'oldDashed');
  if (step === 1) {
    pen.arrow(chin[18], chin[24]);
    pen.ellipse(piv, 0.5, 0.45, 'oldDashed');
    pen.dot(hinge, 2.2);
    jointDetail(pen, step, J, glide);
    return;
  }
  // refined: cranium + face as in profile, the mandible opened about the gliding condyle
  pen.curve(PROFILE_CRANIUM, 'contour');
  pen.curve(PROFILE_FACE, 'contour', false, 0.35);
  pen.curve(PROFILE_MANDIBLE.map(pose), 'contour');
  pen.curve([[7.1, 0.25], [4.5, 0.2], [2.0, 0.1], [0.6, -0.05]], 'detail');
  pen.curve(TMJ_PROFILE, 'detail');
  pen.fill([[8.95, 3.3], [7.5, 3.2], [7.2, 1.6], [7.6, 0.2], [8.9, 0.15], [9.4, 1.6]], pen.ink, 0.88);
  pen.fillEllipse([0, -0.45], 0.45, 0.42, pen.ink, 0.9);
  pen.line([4.6, -4.55], [10.3, -5.0], 'fine');
  pen.line(pose([4.6, -5.1]), pose([10.0, -5.0]), 'fine');
  pen.dot(hinge, 2.0);
  jointDetail(pen, step, J, glide);
}

function bonesLesson(pen, step) {
  // bone map in profile; colours are light washes so the diagram stays line art
  const zones = [
    ['#e7c66b', [[9.95, 4.15], [9.55, 6.6], [8.7, 8.7], [6.9, 10.35], [4.4, 11.15], [2.6, 11.3], [2.95, 8.0], [3.35, 4.2], [7.1, 3.5], [9.0, 3.4]]],
    ['#8db3d6', [[2.6, 11.3], [-1.2, 11.2], [-4.2, 10.2], [-6.7, 8.35], [-4.9, 5.4], [-1.5, 5.0], [1.6, 4.7], [3.35, 4.2], [2.95, 8.0]]],
    ['#93c4a0', [[-6.7, 8.35], [-8.2, 6.4], [-8.78, 3.8], [-8.6, 1.4], [-7.7, -0.35], [-5.9, -1.55], [-5.1, 0.6], [-4.9, 5.4]]],
    ['#e8a184', [[-4.9, 5.4], [-1.5, 5.0], [1.6, 4.7], [3.4, 2.6], [3.0, 0.3], [1.2, -0.5], [-1.1, -2.6], [-4.1, -2.0], [-5.9, -1.55], [-5.1, 0.6]]],
    ['#ae92cf', [[3.35, 4.2], [7.1, 3.5], [6.8, 0.6], [4.5, 0.4], [3.0, 0.3], [3.4, 2.6]]],
    ['#f0a660', [[7.1, 3.5], [7.6, 0.2], [8.6, -0.4], [7.9, -1.7], [5.2, -1.1], [3.4, -0.9], [4.5, 0.3], [6.8, 0.6]]],
    ['#a3cc7f', [[9.4, 3.1], [9.92, 1.95], [10.05, 0.55], [9.9, -0.9], [10.05, -1.95], [10.15, -3.95], [7.5, -3.6], [5.0, -3.2], [6.0, -1.6], [7.9, -1.7], [8.6, -0.4], [8.9, 1.2]]],
    ['#dc6b5f', [[9.55, 3.0], [9.92, 1.95], [10.45, 0.85], [10.05, 0.6], [9.6, 1.8]]],
    ['#74b6be', PROFILE_MANDIBLE],
  ];
  if (step >= 1) {
    const off = step === 2;
    const shift = [[1.0, 1.0], [-0.6, 1.4], [-1.4, 0.2], [-0.4, -1.2], [0.2, 0.6], [1.0, -0.4], [1.4, -0.4], [1.6, 0.9], [0.8, -1.8]];
    zones.forEach(([c, pts], i) => {
      const d = off ? shift[i] : [0, 0];
      const p = pts.map(([z, y]) => [z + d[0], y + d[1]]);
      pen.fill(p, c, step === 1 ? 0.35 : 0.42);
      pen.curve(p, step === 2 ? 'contour' : 'detail', true, 0.35);
    });
    if (step === 2) {
      pen.arrow([2.0, 9.0], [3.0, 10.0]);
      pen.arrow([-6.0, 3.0], [-7.4, 3.2]);
      pen.arrow([6.0, -7.0], [6.8, -8.6]);
      pen.arrow([9.4, -1.0], [10.6, -1.4]);
    }
    return;
  }
  profileContour(pen);
  // the sutures: coronal and lambdoid wander and interlock like a zip;
  // the squamous is a bevelled overlap, so only a gentle wave
  pen.poly(sutureLine([[2.6, 11.3], [2.95, 8.0], [3.35, 4.2]], 0.2, 0.8, 1), 'guide');
  pen.poly(sutureLine([[-6.7, 8.35], [-4.9, 5.4], [-5.1, 0.6], [-5.9, -1.55]], 0.26, 0.85, 2), 'guide');
  pen.poly(sutureLine([[-4.9, 5.4], [-1.5, 5.0], [1.6, 4.7], [3.4, 2.6]], 0.08, 1.6, 3), 'guide');
}

// Jaguar orbit in profile, open behind as in all cats: the rim runs from the tip of the
// frontal's postorbital process (pointing down and back) over the top, down the front and
// along the zygomatic below, up to the tip of the zygomatic's frontal process (pointing up).
// About 1 cm separates the tips (bridged in life by a ligament), so the orbit opens into
// the temporal fossa behind it — as in the 3D model's postorbital processes.
const JAG_ORBIT = { c: [5.3, 2.4], rx: 2.15, ry: 2.0 };
const JAG_TIP_F = [3.2, 3.42];
const JAG_TIP_Z = [3.3, 2.22];
const JAG_RIM = [
  JAG_TIP_F, [3.55, 3.9], [4.35, 4.18], [5.4, 4.24], [6.45, 3.98], [7.2, 3.15], [7.3, 2.0], [6.85, 1.0], [5.9, 0.45],
  [4.7, 0.45], [3.8, 0.95], [3.4, 1.55], JAG_TIP_Z,
];

function jaguarLesson(pen, step) {
  const k0 = step === 0 ? 'guide' : 'old';
  pen.ellipse([-4.6, 2.3], 6.6, 4.6, k0);
  pen.poly([[6.2, 3.7], [13.0, 3.7], [13.0, -2.6], [6.2, -2.6]], k0, true);
  pen.curve([[0.9, 6.4], [3.6, 5.6], [6.2, 3.7]], step === 0 ? 'dashed' : 'oldDashed');
  pen.dot([-3.4, -1.9], 2.0, step === 0 ? pen.accent : '#8b8274');
  pen.line([-12, -2.6], [13.6, -2.6], step === 0 ? 'dashed' : 'oldDashed');
  if (step === 0) return;
  const k1 = step === 1 ? 'guide' : 'old';
  // crest line, arch, jaw wedge, and the orbit as an open C: two postorbital
  // processes point at each other across a gap behind it
  pen.curve([[1.4, 5.3], [-1.8, 6.35], [-5.6, 7.3], [-9.0, 7.75], [-11.15, 7.15]], k1);
  pen.curve([[6.3, 0.6], [3.0, 1.6], [0.0, 1.5], [-3.5, 0.0]], k1);
  pen.poly([[12.0, -2.9], [12.0, -7.2], [-4.8, -5.6], [-3.4, -1.9]], k1);
  pen.poly([[-0.9, -2.2], [-2.2, 4.0], [-3.0, 3.6]], k1);
  const { c: oc, rx, ry } = JAG_ORBIT;
  const open = (140 * Math.PI) / 180;
  pen.ellipse(oc, rx, ry, step === 1 ? 'dashed' : 'oldDashed', 0, -open, open);
  pen.line([oc[0] + rx * Math.cos(open), oc[1] + ry * Math.sin(open)], JAG_TIP_F, k1);
  pen.line([oc[0] + rx * Math.cos(open), oc[1] - ry * Math.sin(open)], JAG_TIP_Z, k1);
  if (step === 1) {
    pen.dot(JAG_TIP_F, 1.5);
    pen.dot(JAG_TIP_Z, 1.5);
    return;
  }
  // refined contour
  pen.curve([
    [12.5, 2.6], [10.5, 3.7], [8.0, 4.25], [5.6, 4.55], [3.0, 5.25], [0.6, 5.8], [-2.0, 6.5], [-5.6, 7.35], [-9.0, 7.8],
    [-11.15, 7.2], [-11.3, 5.0], [-10.9, 2.6], [-11.1, 0.4], [-10.2, -1.6], [-8.2, -2.4], [-6.3, -3.6], [-4.4, -2.6],
  ], 'contour');
  pen.curve([[12.5, 2.6], [13.2, 1.0], [12.9, -1.3], [12.45, -2.2]], 'contour');
  pen.curve([[12.45, -2.2], [10.5, -2.5], [8.0, -2.55], [5.0, -2.5], [3.5, -2.3]], 'detail');
  // canines: tapering crescents that curve backwards, the lower one in front
  pen.shape([[11.35, -3.55], [11.2, -2.4], [11.05, -1.35], [11.3, -0.55], [11.62, -1.55], [11.7, -2.75], [11.75, -3.55]], pen.paper, 'contour', 0.45);
  pen.shape([[11.3, -2.3], [11.15, -3.55], [10.85, -4.9], [10.3, -6.25], [10.18, -5.2], [10.22, -3.85], [10.15, -2.3]], pen.paper, 'contour', 0.45);
  // carnassials as zigzag blades
  pen.poly([[7.5, -2.5], [7.2, -3.6], [6.8, -3.0], [6.3, -4.1], [5.7, -3.3], [5.0, -3.7], [4.9, -2.5]], 'detail');
  pen.poly([[6.2, -3.3], [5.8, -2.4], [5.1, -3.1], [4.5, -2.2], [3.9, -3.2]], 'detail');
  // mandible, coronoid, angle; orbit; arch; bulla
  pen.curve([[12.0, -3.2], [12.2, -5.4], [11.6, -7.0], [8.0, -7.0], [3.0, -6.6], [-2.0, -6.1], [-4.6, -5.45], [-5.35, -4.6], [-4.6, -3.6], [-3.9, -2.4], [-3.4, -1.4], [-2.9, -0.6], [-3.1, 1.6], [-3.0, 3.7], [-2.0, 4.1], [-0.6, 2.9], [1.4, 0.2], [3.2, -3.3]], 'contour');
  // the orbit, open behind: shaded under its front rim and fading to bare paper at
  // the gap; the rim runs from process tip to process tip, each process pointed by
  // its straight back edge; the zygomatic's back edge runs on as the arch's upper border
  pen.fillFade(JAG_RIM, pen.ink, [7.3, 2.6], [3.6, 2.8], 0.72);
  pen.curve(JAG_RIM, 'contour');
  // the frontal's process: its back edge runs on as the temporal line towards the crest
  pen.poly([JAG_TIP_F, [2.8, 4.2]], 'contour');
  pen.curve([[2.8, 4.2], [2.2, 4.85], [1.4, 5.3]], 'detail');
  pen.poly([JAG_TIP_Z, [2.95, 1.62], [2.4, 1.48]], 'contour');
  pen.curve([[2.4, 1.48], [1.8, 1.42], [0.0, 1.35], [-2.0, 0.9], [-3.4, 0.4]], 'detail');
  pen.curve([[6.4, -0.9], [3.0, -0.6], [0.0, -0.6], [-3.4, -0.9]], 'detail');
  pen.ellipse([-6.3, -2.4], 2.0, 1.3, 'detail');
  pen.fillEllipse([12.25, 0.7], 0.55, 1.2, pen.ink, 0.85);
}

// The snake's loop seen from the front, on the skull's left (the viewer's
// right) as in the 3D lesson (snake.js CONTROL projected on the face plane,
// a body-radius off the bone): out of the orbit, over the brow and up the
// forehead, over the vault's edge, down behind the ear (outside the
// contour), below the cheekbone and across the cheek back into the socket.
const SNAKE_LOOP = [
  [2.95, 1.75], [3.15, 3.2], [3.4, 4.7], [3.75, 7.6], [5.3, 10.65], [7.4, 8.9], [7.95, 5.6], [7.6, 1.6],
  [7.15, -2.4], [6.3, -2.8], [5.2, -1.6], [4.25, 0.15], [3.25, 1.1],
];
// The drawn body, neck → tail: the head has just left the socket over the
// brow; the body trails back through the orbit, across the cheek, behind the
// skull's side and over the vault, its tail resting on the crown ahead of the head.
const SNAKE_BODY = [
  [3.3, 3.45], [3.05, 2.4], [3.25, 1.1], [4.25, 0.15], [5.2, -1.6], [6.3, -2.8], [7.15, -2.4], [7.6, 1.6],
  [7.95, 5.6], [7.4, 8.9], [5.3, 10.65], [4.2, 10.15],
];
const SNAKE_CHEEK = 4; // control point on the cheek, before the body slips behind the face
const SNAKE_TURN = 9; // control point where the body comes back over the vault (in front again)
/**
 * The viper's head seen from above, in head units: u from the back of the
 * head (0) to the snout tip (1), w across as a share of the widest
 * half-width — the plan of the 3D head (snakes/head.js, 'broad'): widest
 * across the jowls, tapering to a bluntly truncated snout.
 */
const HEAD_PLAN = [[0, 0.46], [0.1, 0.86], [0.25, 1], [0.42, 0.93], [0.58, 0.79], [0.8, 0.55], [0.92, 0.44], [0.98, 0.25], [1, 0]];
/** The panel's spines, as a multiple of their height (see skullSnake). */
const SPINE_DRAW = 2.2;
/** HEAD_PLAN's half-width share at u (linear between its points). */
function planWidth(u) {
  for (let i = 1; i < HEAD_PLAN.length; i++) {
    const [u1, w1] = HEAD_PLAN[i];
    if (u <= u1) {
      const [u0, w0] = HEAD_PLAN[i - 1];
      return w0 + ((w1 - w0) * (u - u0)) / (u1 - u0);
    }
  }
  return 0;
}

/** Ray-cast point-in-polygon (cm). */
function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/**
 * The snake's body as a band along its spline (cm): width per sample from
 * `width(f)` (f = 0 neck … 1 tail). Returns a painter for index ranges, so
 * the part behind the skull can be drawn before it and the rest after.
 */
function snakeBand(pts, width) {
  const P = splinePoints(pts, 10);
  const n = P.length;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1;
    const w = width(i / (n - 1));
    left.push([P[i][0] - (ty / L) * w, P[i][1] + (tx / L) * w]);
    right.push([P[i][0] + (ty / L) * w, P[i][1] - (tx / L) * w]);
  }
  return {
    P, n,
    /** paper-filled band (it hides what lies behind), inked sides, belly bands */
    draw(pen, i0, i1) {
      const L = left.slice(i0, i1 + 1), R = right.slice(i0, i1 + 1);
      pen.fill([...L, ...R.slice().reverse()], pen.paper, 1, true);
      pen.poly(L, 'contour');
      pen.poly(R, 'contour');
      for (let i = i0 + 3; i < i1 - 2; i += 5) pen.line(left[i], right[i], 'fine');
    },
  };
}

function skullSnake(pen, step, params = {}) {
  const egg = VAULT_EGG;
  const k0 = step === 0 ? 'guide' : 'old';
  pen.ellipse([0, egg.c[1]], egg.r[0], egg.r[1], k0);
  pen.line([0, 12.6], [0, -10.4], step === 0 ? 'dashed' : 'oldDashed');
  const orb = orbitShapes();
  pen.curve(orb.L, k0, true);
  pen.curve(orb.R, k0, true);
  if (step === 0) return;
  // the loop on one side of the skull, leaving from the orbit
  pen.curve(SNAKE_LOOP, step === 1 ? 'dashed' : 'oldDashed', true);
  if (step === 1) {
    pen.dot(SNAKE_LOOP[0], 2.4);
    pen.arrow(SNAKE_LOOP[1], SNAKE_LOOP[2]);
    return;
  }
  // body: thickest across the cheek and socket (nearest the eye), thinner
  // where it turns away behind the skull, tapering to the tail
  const band = snakeBand(SNAKE_BODY, (f) => (f < 0.35 ? 0.48 + 0.4 * f : 0.62 - 0.45 * (f - 0.35)) * (f > 0.85 ? 1 - 0.85 * ((f - 0.85) / 0.15) ** 1.4 : 1));
  // where it slips behind the cheek (first sample outside the skull after the
  // cheek) and where it comes back over the vault
  let iA = SNAKE_CHEEK * 10;
  while (iA < band.n - 1 && inside(FRONT, band.P[iA][0], band.P[iA][1])) iA++;
  const iB = SNAKE_TURN * 10;
  // bone over body: the side of the skull hides it behind the ear
  band.draw(pen, iA - 1, iB);
  pen.shape(FRONT, pen.paper, 'contour');
  pen.fill(orb.L, pen.ink, 0.9);
  pen.fill(orb.R, pen.ink, 0.9);
  pen.fill(pear([0, -0.95], 1.24, 0.34, 2.1), pen.ink, 0.9);
  UPPER_TEETH_FRONT(pen, 'detail');
  // body over bone: over the vault to the tail, and across the cheek and the socket
  band.draw(pen, iB, band.n - 1);
  band.draw(pen, 0, iA);
  // the head leaves the orbit over the brow, seen from above: broad and
  // triangular on a slim neck, an eye at each edge under the supraocular,
  // two spine-like superciliaries over it. It is the 3D viper's own head
  // (snakes/species.js): its length and width, the eye's place, the spines'
  // places and their backward rake. A panel shows the head a few
  // millimetres long, so the eye is a dot and the spines are drawn
  // unforeshortened at SPINE_DRAW times their height, to read as lashes.
  const sp = SPECIES[params.snake?.species] ?? SPECIES[SNAKE.species];
  const Lh = sp.head.length * (params.snake?.length ?? SNAKE.length);
  const hw = (sp.head.width * Lh) / 2;
  const o = [3.3, 3.45], d = [0.08, 1], q = [1, -0.08];
  const at = (u, w) => [o[0] + d[0] * u * Lh + q[0] * w * hw, o[1] + d[1] * u * Lh + q[1] * w * hw];
  const head = [...HEAD_PLAN.map(([u, w]) => at(u, -w)), ...HEAD_PLAN.slice(0, -1).reverse().map(([u, w]) => at(u, w))];
  pen.shape(head, pen.paper, 'contour', 0.45);
  const eu = sp.eye.at;
  const rv = (sp.eye.size * Lh * Math.sqrt(1 - (sp.eye.embed ?? 0.4) ** 2)) / hw; // visible eye radius (w units)
  const S = sp.face?.spines; // none on a species without eyelash scales
  const lat = S?.lateral ?? 0.45, b = (S?.base ?? 0.045) * 0.6;
  for (const sgn of [-1, 1]) {
    pen.dot(at(eu, sgn * (planWidth(eu) - rv)), (rv * 0.6 * hw * pen.s) / pen.u, pen.ink);
    for (const [dx, h, rake] of S?.list ?? []) {
      // a spike from the supraocular's outer edge: up and out, raked back
      const u = eu + dx, w = planWidth(u) * 0.9, n = Math.hypot(rake, lat), k = h * SPINE_DRAW;
      const tip = at(u - (k * rake) / n, sgn * (w + (k * Lh * lat) / (n * hw)));
      pen.poly([at(u - b, sgn * w), tip, at(u + b, sgn * w)], 'fine');
    }
  }
}

const EXTENTS = {
  frontal: [-8.2, -10.8, 8.2, 13.0],
  'open-jaw': [-11.6, -14.5, 12.5, 13],
  profile: [-10, -10.6, 12.2, 13.2],
  bones: [-10, -11.6, 13.2, 13.2],
  jaguar: [-12.4, -8.0, 14.0, 9.0],
  'skull-and-snake': [-9.2, -10.6, 9.2, 13.4],
};

/**
 * Draw construction step `step` (0–2) of a lesson as line art inside `box`.
 * @param {CanvasRenderingContext2D} g2d
 * @param {{ subject?: string, lesson?: string }} params  the plate's figure params
 * @param {number} step  0, 1 or 2 (clamped)
 * @param {{x:number,y:number,w:number,h:number}} box  canvas px
 * @param {{ ink?: string, accent?: string, muted?: string, paper?: string }} [theme]
 */
export function drawStep(g2d, params = {}, step = 0, box, theme = {}) {
  const lesson = EXTENTS[params.lesson] ? params.lesson : params.subject === 'jaguar' ? 'jaguar' : 'frontal';
  const s = Math.max(0, Math.min(2, step | 0));
  g2d.save();
  g2d.beginPath();
  g2d.rect(box.x, box.y, box.w, box.h);
  g2d.clip();
  g2d.lineCap = 'round';
  g2d.lineJoin = 'round';
  const pen = makePen(g2d, box, EXTENTS[lesson], theme);
  switch (lesson) {
    case 'frontal': frontal(pen, s); break;
    case 'open-jaw': openJaw(pen, s); break;
    case 'profile': profileLesson(pen, s); break;
    case 'bones': bonesLesson(pen, s); break;
    case 'jaguar': jaguarLesson(pen, s); break;
    case 'skull-and-snake': skullSnake(pen, s, params); break;
  }
  g2d.restore();
}
