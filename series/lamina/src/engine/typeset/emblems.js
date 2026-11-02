// Original emblems for each book, drawn with canvas paths (no images):
//   snake  — a coiled pit viper, head resting in the centre of its coil
//   flower — a guaria-morada orchid beside a heliconia bract spray
//   skull  — a skull built from construction lines (circle, centre line,
//            brow line, sockets, jaw box) like a drawing-lesson diagram
//   atom   — a probability cloud around an enlarged nucleus
//   cell   — membrane, nucleus and organelles
//   campfire — flame, logs, waves and stars
//
// Each builder returns geometry, not pixels: { fill, cut, line, thin } Path2D
// sets in canvas px, so the same emblem can be foil-stamped on cloth
// (fill = foil, cut = cloth showing through), printed in ink on the title
// page, or blind-debossed. Shapes are generated procedurally (spiral tube,
// bract rows, construction geometry) — fully original artwork.

const TAU = Math.PI * 2;

/**
 * @typedef {Object} EmblemGeometry
 * @property {Path2D} fill    solid areas (stamped / printed)
 * @property {Path2D} cut     closed interior details knocked out of the fill
 * @property {Path2D} [veins] open detail lines knocked out of the fill (stroked)
 * @property {{path: Path2D, width: number}[]} lines  stroked line work (stamped)
 * @property {{path: Path2D, width: number, dash?: number[]}[]} [guides]  thin construction lines
 */

/** Emblem kind for a manifest: explicit theme.emblem, book id, or first figure type. */
export function emblemKind(manifestOrBook = {}, theme = {}) {
  const m = manifestOrBook;
  if (theme.emblem) return theme.emblem;
  if (m.emblem) return m.emblem;
  const id = String(m.id ?? '').toLowerCase();
  if (/serp|snake|viper|culebra/.test(id)) return 'snake';
  if (/flor|flower|orqu|orchid|plant|bot/.test(id)) return 'flower';
  if (/calav|skull|cran|bone|hueso/.test(id)) return 'skull';
  if (/atom/.test(id)) return 'atom';
  if (/celul|cell/.test(id)) return 'cell';
  if (/fogata|campfire/.test(id)) return 'campfire';
  const t = m.figureType ?? m.plates?.[0]?.figure?.type;
  if (['snake', 'flower', 'skull', 'atom', 'cell', 'campfire'].includes(t)) return t;
  return 'roundel';
}

/**
 * Build emblem geometry centred at (cx, cy) fitting a circle of radius r.
 * @param {'snake'|'flower'|'skull'|'atom'|'cell'|'campfire'|'roundel'} kind
 * @returns {EmblemGeometry}
 */
export function emblemGeometry(kind, cx, cy, r) {
  if (kind === 'snake') return snakeEmblem(cx, cy, r);
  if (kind === 'flower') return flowerEmblem(cx, cy, r);
  if (kind === 'skull') return skullEmblem(cx, cy, r);
  if (kind === 'atom') return atomEmblem(cx, cy, r);
  if (kind === 'cell') return cellEmblem(cx, cy, r);
  if (kind === 'campfire') return campfireEmblem(cx, cy, r);
  return roundelEmblem(cx, cy, r);
}

// ------------------------------------------------------------------ helpers

function mapper(cx, cy, r) {
  return (x, y) => [cx + x * r, cy + y * r];
}

function polyPath(path, pts, close = true) {
  if (close) pts = clockwise(pts);
  pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
  if (close) path.closePath();
}

/**
 * Closed shapes are all wound the same way so overlapping parts of one
 * emblem (neck under head, petals over sepals) union under the nonzero rule
 * instead of cancelling into holes.
 */
function clockwise(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a < 0 ? pts.slice().reverse() : pts;
}

/** Smooth closed path through points (Catmull–Rom → Bézier). */
function smoothClosed(path, pts) {
  pts = clockwise(pts);
  const n = pts.length;
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    path.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1]
    );
  }
  path.closePath();
}

/** Smooth open path through points. */
function smoothOpen(path, pts) {
  const n = pts.length;
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    path.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1]
    );
  }
}

// ------------------------------------------------------------------ snake

function snakeEmblem(cx, cy, R) {
  const M = mapper(cx, cy, R);
  const fill = new Path2D();
  const cut = new Path2D();
  const lines = [];

  // centreline: an Archimedean spiral (tail outside → body inside); the neck
  // then swings into the centre of the coil, where the head rests facing up.
  const turns = 2.3;
  const N = 520;
  const rOut = 0.86;
  const rIn = 0.46;
  const a0 = -Math.PI * 0.42;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = a0 + u * turns * TAU;
    const r = rOut - (rOut - rIn) * u;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const spiralEnd = pts.length - 1;
  const aEnd = a0 + turns * TAU;
  const P0 = pts[spiralEnd];
  const T0 = [-Math.sin(aEnd), Math.cos(aEnd)];
  const E = [0.0, 0.17]; // head joint, centre of the coil
  const C1 = [P0[0] + T0[0] * 0.24, P0[1] + T0[1] * 0.24];
  const C2 = [E[0], E[1] + 0.26];
  for (let i = 1; i <= 60; i++) {
    const t = i / 60;
    const mt = 1 - t;
    pts.push([
      mt * mt * mt * P0[0] + 3 * mt * mt * t * C1[0] + 3 * mt * t * t * C2[0] + t * t * t * E[0],
      mt * mt * mt * P0[1] + 3 * mt * mt * t * C1[1] + 3 * mt * t * t * C2[1] + t * t * t * E[1],
    ]);
  }
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = L[L.length - 1];
  const neckStart = L[spiralEnd];
  const width = (s) => {
    const u = s / total;
    if (u < 0.3) return 0.006 + 0.144 * Math.sin((u / 0.3) * Math.PI * 0.5) ** 0.8;
    if (s < neckStart) return 0.15;
    const t = (s - neckStart) / (total - neckStart);
    return 0.15 - 0.06 * Math.sin(t * Math.PI * 0.5);
  };
  const frames = pts.map((p, i) => {
    const q = pts[Math.min(pts.length - 1, i + 1)];
    const o = pts[Math.max(0, i - 1)];
    let tx = q[0] - o[0];
    let ty = q[1] - o[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    return { p, t: [tx, ty], n: [-ty, tx], w: width(L[i]) / 2 };
  });
  const left = frames.map((f) => M(f.p[0] + f.n[0] * f.w, f.p[1] + f.n[1] * f.w));
  const right = frames.map((f) => M(f.p[0] - f.n[0] * f.w, f.p[1] - f.n[1] * f.w));
  polyPath(fill, [...left, ...right.reverse()]);

  // head: broad lance-shaped viper head pointing up out of the coil
  const hx = [0, -1];
  const hn = [1, 0];
  const H = (fx, fy) => M(E[0] + hx[0] * fx + hn[0] * fy, E[1] + hx[1] * fx + hn[1] * fy);
  const head = [
    [-0.035, -0.05], [0.025, -0.1], [0.095, -0.122], [0.18, -0.104], [0.25, -0.07], [0.295, -0.034],
    [0.31, 0], [0.295, 0.034], [0.25, 0.07], [0.18, 0.104], [0.095, 0.122], [0.025, 0.1], [-0.035, 0.05],
  ].map(([x, y]) => H(x, y));
  smoothClosed(fill, head);
  for (const sgn of [-1, 1]) {
    const [ex, ey] = H(0.165, sgn * 0.083);
    cut.moveTo(ex + R * 0.024, ey);
    cut.arc(ex, ey, R * 0.024, 0, TAU);
    const [px, py] = H(0.245, sgn * 0.052);
    cut.moveTo(px + R * 0.01, py);
    cut.arc(px, py, R * 0.01, 0, TAU);
  }
  // crown mark: a slim spear on top of the head
  polyPath(cut, [H(0.03, 0), H(0.11, -0.035), H(0.2, 0), H(0.11, 0.035)]);
  // tongue: forked line from the snout
  const tongue = new Path2D();
  const [t0x, t0y] = H(0.31, 0);
  const [t1x, t1y] = H(0.42, 0);
  const [f1x, f1y] = H(0.48, -0.038);
  const [f2x, f2y] = H(0.48, 0.038);
  tongue.moveTo(t0x, t0y);
  tongue.lineTo(t1x, t1y);
  tongue.lineTo(f1x, f1y);
  tongue.moveTo(t1x, t1y);
  tongue.lineTo(f2x, f2y);
  lines.push({ path: tongue, width: R * 0.018 });

  // dorsal pattern: a chain of diamonds along the spine with lateral spots
  const period = 0.172;
  for (let s = period * 2.2; s < neckStart - period * 0.4; s += period) {
    const f = frames[indexAt(L, s)];
    if (f.w < 0.05) continue;
    const a = frames[indexAt(L, s - period * 0.34)];
    const b = frames[indexAt(L, s + period * 0.34)];
    const half = f.w * 0.74;
    polyPath(cut, [
      M(a.p[0], a.p[1]),
      M(f.p[0] + f.n[0] * half, f.p[1] + f.n[1] * half),
      M(b.p[0], b.p[1]),
      M(f.p[0] - f.n[0] * half, f.p[1] - f.n[1] * half),
    ]);
    const m = frames[indexAt(L, s + period * 0.5)];
    if (m.w > 0.05) {
      for (const sg of [-1, 1]) {
        const [dx, dy] = M(m.p[0] + m.n[0] * m.w * 0.56 * sg, m.p[1] + m.n[1] * m.w * 0.56 * sg);
        const rr = R * m.w * 0.16;
        cut.moveTo(dx + rr, dy);
        cut.arc(dx, dy, rr, 0, TAU);
      }
    }
  }
  return { fill, cut, lines, twoTone: true };
}

function indexAt(L, s) {
  let lo = 0;
  let hi = L.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (L[mid] < s) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// ------------------------------------------------------------------ flower

function flowerEmblem(cx, cy, R) {
  const M = mapper(cx, cy, R);
  const fill = new Path2D();
  const cut = new Path2D();
  const veins = new Path2D();
  const lines = [];
  const over = [];
  const parts = []; // { path, tone } for colour printing

  // leaves: two long blades crossing at the base of the spray
  const leaf = (x0, y0, ang, len, wid, bend) => {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const P2 = (u, v) => M(x0 + ca * u - sa * v, y0 + sa * u + ca * v);
    const pts = [];
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(P2(t * len, wid * Math.sin(Math.PI * t ** 0.7) + bend * t * t));
    }
    for (let i = n; i >= 0; i--) {
      const t = i / n;
      pts.push(P2(t * len, -wid * 0.85 * Math.sin(Math.PI * t ** 0.7) + bend * t * t));
    }
    const p = new Path2D();
    smoothClosed(p, pts);
    fill.addPath(p);
    parts.push({ path: p, tone: 'leaf' });
    const v = [];
    for (let i = 1; i < 14; i++) {
      const t = i / 14;
      v.push(P2(t * len * 0.94, bend * t * t));
    }
    smoothOpen(veins, v);
  };
  leaf(-0.06, 0.8, -0.32, 0.86, 0.085, -0.06);
  leaf(-0.02, 0.82, Math.PI + 0.42, 0.66, 0.075, 0.05);

  // heliconia: a zig-zag rachis with two ranks of boat-shaped "lobster-claw" bracts
  const base = [-0.3, 0.7];
  const top = [-0.46, -0.9];
  const nodes = 6;
  const rachis = [];
  for (let i = 0; i <= nodes; i++) {
    const t = i / nodes;
    const zig = (i % 2 ? 1 : -1) * 0.05 * (1 - t * 0.5);
    rachis.push([base[0] + (top[0] - base[0]) * t + zig + Math.sin(t * Math.PI) * 0.05, base[1] + (top[1] - base[1]) * t]);
  }
  const stem = new Path2D();
  polyPath(stem, rachis.map(([x, y]) => M(x, y)), false);
  lines.push({ path: stem, width: R * 0.026 });
  for (let i = 0; i < nodes; i++) {
    const [nx, ny] = rachis[i];
    const side = i % 2 ? 1 : -1;
    const len = 0.5 * (1 - i * 0.1);
    const ang = side > 0 ? -0.62 : Math.PI + 0.62; // outward and upward
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    // local frame: u along the bract, v towards its keel (downwards)
    const kv = side > 0 ? 1 : -1;
    const P3 = (u, v) => M(nx + ca * u - sa * v * kv, ny + sa * u + ca * v * kv);
    const b = [];
    const n = 18;
    for (let j = 0; j <= n; j++) {
      const t = j / n; // lip: nearly straight, slightly concave
      b.push(P3(t * len, -0.03 * Math.sin(Math.PI * t) * len));
    }
    for (let j = n; j >= 0; j--) {
      const t = j / n; // keel: deep convex curve, tip turned up
      b.push(P3(t * len, 0.36 * len * Math.sin(Math.PI * t ** 0.62) * (1 - t * 0.35)));
    }
    const bp = new Path2D();
    smoothClosed(bp, b);
    fill.addPath(bp);
    parts.push({ path: bp, tone: 'bract' });
    // the bract's mouth: a slim opening along the lip, and a margin line on the keel
    const mouth = [];
    for (let j = 1; j < n; j++) {
      const t = j / n;
      mouth.push(P3(t * len * 0.92, 0.028 * len + 0.035 * len * Math.sin(Math.PI * t)));
    }
    for (let j = n - 1; j > 0; j--) {
      const t = j / n;
      mouth.push(P3(t * len * 0.92, 0.028 * len + 0.012 * len * Math.sin(Math.PI * t)));
    }
    polyPath(cut, mouth);
    const keel = [];
    for (let j = 2; j < n - 1; j++) {
      const t = j / n;
      keel.push(P3(t * len, 0.36 * len * Math.sin(Math.PI * t ** 0.62) * (1 - t * 0.35) - 0.045 * len));
    }
    smoothOpen(veins, keel);
  }

  // orchid (guaria morada): three sepals, two broad wavy petals, ruffled lip, column
  const oc = [0.24, -0.16];
  const O = (x, y) => M(oc[0] + x, oc[1] + y);
  const petal = (ang, len, wid, wavy = 0) => {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const Pp = (u, v) => O(ca * u - sa * v, sa * u + ca * v);
    const pts = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(Pp(t * len, wid * Math.sin(Math.PI * t ** 0.85) * (1 + wavy * Math.sin(t * 26))));
    }
    for (let i = n; i >= 0; i--) {
      const t = i / n;
      pts.push(Pp(t * len, -wid * Math.sin(Math.PI * t ** 0.85) * (1 + wavy * Math.sin(t * 23 + 1))));
    }
    const p = new Path2D();
    smoothClosed(p, pts);
    fill.addPath(p);
    parts.push({ path: p, tone: 'petal' });
    const v0 = Pp(len * 0.14, 0);
    const v1 = Pp(len * 0.82, 0);
    veins.moveTo(v0[0], v0[1]);
    veins.lineTo(v1[0], v1[1]);
  };
  petal(-Math.PI / 2, 0.5, 0.085); // dorsal sepal
  petal(Math.PI * 0.2, 0.47, 0.08); // lateral sepals
  petal(Math.PI * 0.8, 0.47, 0.08);
  petal(-Math.PI * 0.11, 0.47, 0.16, 0.07); // petals
  petal(-Math.PI * 0.89, 0.47, 0.16, 0.07);
  // flower stalk down to the leaves
  const stalk = new Path2D();
  smoothOpen(stalk, [O(0, 0.1), O(-0.02, 0.4), O(-0.12, 0.7), M(-0.04, 0.8)]);
  lines.push({ path: stalk, width: R * 0.02 });
  // labellum: rounded trumpet with a ruffled margin, sitting over the petals
  const lip = [];
  for (let i = 0; i <= 32; i++) {
    const a = Math.PI * (0.02 + 0.96 * (i / 32));
    const rr = 0.27 + 0.025 * Math.sin(i * 2.1);
    lip.push(O(Math.cos(a) * rr * 0.86, 0.03 + Math.sin(a) * rr));
  }
  lip.push(O(-0.1, 0.02), O(0, -0.05), O(0.1, 0.02));
  const lipPath = new Path2D();
  smoothClosed(lipPath, lip);
  const col = new Path2D();
  col.ellipse(...O(0, 0.04), R * 0.045, R * 0.085, 0, 0, TAU);
  const throat = new Path2D();
  for (const dx of [-0.08, -0.04, 0, 0.04, 0.08]) {
    throat.moveTo(...O(dx * 0.6, 0.13));
    throat.lineTo(...O(dx * 1.7, 0.25));
  }
  lines.push({ path: throat, width: R * 0.01, onCut: true });
  over.push({ path: lipPath, col, tone: 'lip' });
  return { fill, cut, veins, lines, over, parts };
}

// ------------------------------------------------------------------ skull

function skullEmblem(cx, cy, R) {
  const M = mapper(cx, cy, R);
  const fill = new Path2D();
  const cut = new Path2D();
  const lines = [];
  const guides = [];
  const W = (w) => R * w;

  // construction: cranium circle, centre line, brow line, jaw box
  const circle = new Path2D();
  circle.arc(...M(0, -0.2), R * 0.58, 0, TAU);
  guides.push({ path: circle, width: W(0.012) });
  const axes = new Path2D();
  axes.moveTo(...M(0, -0.98));
  axes.lineTo(...M(0, 0.98));
  axes.moveTo(...M(-0.82, 0.05));
  axes.lineTo(...M(0.82, 0.05));
  axes.moveTo(...M(-0.62, 0.42));
  axes.lineTo(...M(0.62, 0.42));
  guides.push({ path: axes, width: W(0.009), dash: [W(0.05), W(0.03)] });
  const box = new Path2D();
  polyPath(box, [M(-0.47, 0.05), M(0.47, 0.05), M(0.33, 0.62), M(0.16, 0.86), M(-0.16, 0.86), M(-0.33, 0.62)]);
  guides.push({ path: box, width: W(0.01) });

  // skull contour (front view): cranium vault, temples, cheekbones, jaw
  const contour = [
    [0, -0.79], [0.3, -0.73], [0.5, -0.55], [0.58, -0.28], [0.56, -0.06], [0.5, 0.06],
    [0.52, 0.16], [0.46, 0.27], [0.38, 0.32], [0.36, 0.48], [0.33, 0.62], [0.24, 0.76],
    [0.12, 0.84], [0, 0.86], [-0.12, 0.84], [-0.24, 0.76], [-0.33, 0.62], [-0.36, 0.48],
    [-0.38, 0.32], [-0.46, 0.27], [-0.52, 0.16], [-0.5, 0.06], [-0.56, -0.06], [-0.58, -0.28],
    [-0.5, -0.55], [-0.3, -0.73],
  ].map(([x, y]) => M(x, y));
  const skull = new Path2D();
  smoothClosed(skull, contour);
  lines.push({ path: skull, width: W(0.032) });

  // orbits: rounded squares, slightly tilted outward
  for (const s of [-1, 1]) {
    const o = new Path2D();
    const c = [s * 0.215, 0.07];
    const pts = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const sq = 0.86; // superellipse exponent → rounded square
      const x = Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** sq * 0.135;
      const y = Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** sq * 0.12;
      const tilt = s * 0.16;
      pts.push(M(c[0] + x * Math.cos(tilt) - y * Math.sin(tilt), c[1] + x * Math.sin(tilt) + y * Math.cos(tilt)));
    }
    smoothClosed(o, pts);
    fill.addPath(o);
  }
  // nasal aperture: inverted pear
  const nose = new Path2D();
  smoothClosed(nose, [[0, 0.2], [0.05, 0.27], [0.07, 0.35], [0.045, 0.4], [0, 0.39], [-0.045, 0.4], [-0.07, 0.35], [-0.05, 0.27]].map(([x, y]) => M(x, y)));
  fill.addPath(nose);
  // teeth: a band with incisors and canines
  const teeth = new Path2D();
  const ty0 = 0.5;
  const ty1 = 0.62;
  teeth.moveTo(...M(-0.22, ty0));
  teeth.quadraticCurveTo(...M(0, ty0 - 0.03), ...M(0.22, ty0));
  teeth.moveTo(...M(-0.22, ty1));
  teeth.quadraticCurveTo(...M(0, ty1 + 0.025), ...M(0.22, ty1));
  for (let i = -5; i <= 5; i++) {
    const x = i * 0.04;
    teeth.moveTo(...M(x, ty0 - 0.02 + Math.abs(x) * 0.08));
    teeth.lineTo(...M(x, ty1 + 0.02 - Math.abs(x) * 0.1));
  }
  lines.push({ path: teeth, width: W(0.014) });
  // zygomatic arches & temporal lines
  const z = new Path2D();
  for (const s of [-1, 1]) {
    z.moveTo(...M(s * 0.36, 0.16));
    z.quadraticCurveTo(...M(s * 0.47, 0.13), ...M(s * 0.5, 0.06));
    z.moveTo(...M(s * 0.42, -0.04));
    z.quadraticCurveTo(...M(s * 0.5, -0.36), ...M(s * 0.2, -0.62));
    z.moveTo(...M(s * 0.05, 0.42));
    z.quadraticCurveTo(...M(s * 0.17, 0.44), ...M(s * 0.3, 0.38));
  }
  lines.push({ path: z, width: W(0.012) });
  // sutures: coronal arc hint
  const sut = new Path2D();
  sut.moveTo(...M(-0.42, -0.52));
  sut.quadraticCurveTo(...M(0, -0.66), ...M(0.42, -0.52));
  lines.push({ path: sut, width: W(0.008), dash: [W(0.02), W(0.018)] });
  // measurement ticks on the centre line
  const ticks = new Path2D();
  for (const y of [-0.79, 0.05, 0.42, 0.86]) {
    ticks.moveTo(...M(-0.07, y));
    ticks.lineTo(...M(0.07, y));
  }
  guides.push({ path: ticks, width: W(0.012) });
  return { fill, cut, lines, guides };
}

// ------------------------------------------------------------------ science volumes

// A dotted probability cloud, with an enlarged nucleus; no orbital tracks.
function atomEmblem(cx, cy, r) {
  const fill = new Path2D(), cut = new Path2D();
  const dot = (x, y, a) => { fill.moveTo(cx + (x + a) * r, cy + y * r); fill.arc(cx + x * r, cy + y * r, a * r, 0, TAU); };
  for (let i = 0; i < 260; i++) {
    const a = i * 2.399963229728653;
    const d = 0.15 + 0.76 * Math.pow((i + 0.5) / 260, 0.77);
    dot(Math.cos(a) * d, Math.sin(a) * d, 0.007 + (1 - d) * 0.007);
  }
  for (let i = 0; i < 7; i++) {
    const a = i * TAU / 6, d = i === 6 ? 0 : 0.08;
    dot(Math.cos(a) * d, Math.sin(a) * d, 0.05);
  }
  const ticks = new Path2D();
  for (const s of [-1, 1]) {
    ticks.moveTo(cx + s * r * 0.96, cy); ticks.lineTo(cx + s * r * 0.86, cy);
    ticks.moveTo(cx, cy + s * r * 0.96); ticks.lineTo(cx, cy + s * r * 0.86);
  }
  return { fill, cut, lines: [{ path: ticks, width: r * 0.012 }] };
}

function cellEmblem(cx, cy, r) {
  const M = mapper(cx, cy, r), fill = new Path2D(), cut = new Path2D();
  const membrane = new Path2D(), inner = new Path2D(), lines = [];
  const contour = (scale) => Array.from({ length: 22 }, (_, i) => {
    const a = i * TAU / 22, d = 0.83 + Math.sin(3 * a + 0.4) * 0.055;
    return M(Math.cos(a) * d * scale, Math.sin(a) * d * scale);
  });
  smoothClosed(membrane, contour(1)); smoothClosed(inner, contour(0.94));
  lines.push({ path: membrane, width: r * 0.025 }, { path: inner, width: r * 0.012 });
  fill.ellipse(...M(-0.15, -0.08), r * 0.29, r * 0.25, -0.2, 0, TAU);
  cut.ellipse(...M(-0.15, -0.08), r * 0.25, r * 0.21, -0.2, 0, TAU);
  fill.moveTo(...M(-0.04, -0.08)); fill.arc(...M(-0.11, -0.08), r * 0.07, 0, TAU);
  for (const [x, y, angle] of [[0.39, -0.38, .8], [.33, .4, -.6], [-.47, .37, .4]]) {
    const p = new Path2D(), folds = new Path2D();
    const T = (u, v) => M(x + u * Math.cos(angle) - v * Math.sin(angle), y + u * Math.sin(angle) + v * Math.cos(angle));
    p.ellipse(...M(x, y), r * .23, r * .11, angle, 0, TAU);
    for (let i = 0; i < 5; i++) {
      const u = -.14 + i * .07;
      folds.moveTo(...T(u, -.065)); folds.lineTo(...T(u + .025, .055));
    }
    lines.push({ path: p, width: r * .019 }, { path: folds, width: r * .012 });
  }
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, d = .49 + (i % 3) * .08;
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    fill.moveTo(...M(x + .012, y)); fill.arc(...M(x, y), r * .012, 0, TAU);
  }
  return { fill, cut, lines };
}

function campfireEmblem(cx, cy, r) {
  const M = mapper(cx, cy, r), fill = new Path2D(), cut = new Path2D(), lines = [];
  fill.moveTo(...M(0, -.82));
  fill.bezierCurveTo(...M(.11, -.43), ...M(.48, -.33), ...M(.28, .03));
  fill.bezierCurveTo(...M(.58, -.13), ...M(.44, .39), ...M(.04, .4));
  fill.bezierCurveTo(...M(-.42, .43), ...M(-.49, .03), ...M(-.22, -.25));
  fill.bezierCurveTo(...M(-.22, -.04), ...M(-.07, -.11), ...M(0, -.82));
  fill.closePath();
  cut.moveTo(...M(.03, -.26));
  cut.bezierCurveTo(...M(.05, .05), ...M(.31, .18), ...M(.02, .3));
  cut.bezierCurveTo(...M(-.22, .27), ...M(-.12, .06), ...M(.03, -.26)); cut.closePath();
  const logs = new Path2D();
  logs.moveTo(...M(-.37, .38)); logs.lineTo(...M(.36, .55));
  logs.moveTo(...M(.37, .38)); logs.lineTo(...M(-.36, .55));
  lines.push({ path: logs, width: r * .065 });
  const waves = new Path2D();
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i <= 36; i++) {
      const x = -.8 + i / 36 * 1.6, y = .71 + j * .12 + Math.sin(x * 11 + j) * .026;
      if (i === 0) waves.moveTo(...M(x, y)); else waves.lineTo(...M(x, y));
    }
  }
  lines.push({ path: waves, width: r * .013 });
  for (const [x, y, a] of [[-.56, -.5, .06], [.54, -.52, .075], [.27, -.85, .035], [-.7, -.05, .035]]) {
    polyPath(fill, [M(x, y-a), M(x+a*.35,y-a*.35), M(x+a,y), M(x+a*.35,y+a*.35), M(x,y+a), M(x-a*.35,y+a*.35), M(x-a,y), M(x-a*.35,y-a*.35)]);
  }
  return { fill, cut, lines };
}

// ------------------------------------------------------------------ roundel (fallback)

function roundelEmblem(cx, cy, R) {
  const fill = new Path2D();
  const cut = new Path2D();
  const lines = [];
  const ring = new Path2D();
  ring.arc(cx, cy, R * 0.92, 0, TAU);
  ring.arc(cx, cy, R * 0.8, 0, TAU);
  lines.push({ path: ring, width: R * 0.02 });
  const star = new Path2D();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU - Math.PI / 2;
    const r = i % 2 ? R * 0.22 : R * 0.6;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i) star.lineTo(x, y);
    else star.moveTo(x, y);
  }
  star.closePath();
  fill.addPath(star);
  cut.arc(cx, cy, R * 0.08, 0, TAU);
  return { fill, cut, lines };
}

// ------------------------------------------------------------------ painting

/**
 * Print an emblem in ink (title page, imprint device, back matter).
 * @param {CanvasRenderingContext2D} g
 * @param {EmblemGeometry} geo
 * @param {{ ink: string, fill: string, paper: string, cut?: string, guide?: string }} c
 *   cut: colour of knocked-out details (default paper; two-tone emblems use a darker ink)
 *   palette: optional { tone: colour } for emblems with coloured parts (leaf, bract, petal, lip)
 */
export function inkEmblem(g, geo, c) {
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (geo.guides) {
    for (const gd of geo.guides) {
      g.strokeStyle = c.guide ?? c.fill;
      g.lineWidth = gd.width;
      g.setLineDash(gd.dash ?? []);
      g.stroke(gd.path);
    }
    g.setLineDash([]);
  }
  // outline on the outer boundary only: a double-width stroke under the fill
  g.strokeStyle = c.ink;
  g.lineWidth = Math.max(2, (geo.lines[0]?.width ?? 2) * 0.9);
  g.stroke(geo.fill);
  g.fillStyle = c.fill;
  g.fill(geo.fill);
  if (c.palette && geo.parts) {
    // colour lithograph: each part printed in its own natural tone
    for (const part of geo.parts) {
      g.fillStyle = c.palette[part.tone] ?? c.fill;
      g.fill(part.path);
    }
  }
  g.fillStyle = c.cut ?? c.paper;
  g.strokeStyle = c.cut ?? c.paper;
  g.lineWidth = Math.max(1, (geo.lines[0]?.width ?? 2) * 0.55);
  g.save();
  g.clip(geo.fill);
  g.fill(geo.cut);
  if (geo.veins) g.stroke(geo.veins);
  g.restore();
  if (geo.over) {
    for (const o of geo.over) {
      g.fillStyle = (c.palette && c.palette[o.tone]) ?? c.fill;
      g.fill(o.path);
      g.strokeStyle = c.ink;
      g.lineWidth = Math.max(1, (geo.lines[0]?.width ?? 2) * 0.45);
      g.stroke(o.path);
      if (o.col) {
        g.fillStyle = c.paper;
        g.fill(o.col);
      }
    }
  }
  if (geo.keel) {
    g.strokeStyle = c.paper;
    g.lineWidth = geo.keel.width;
    g.globalAlpha = 0.6;
    g.stroke(geo.keel.path);
    g.globalAlpha = 1;
  }
  for (const l of geo.lines) {
    g.strokeStyle = l.onCut ? c.ink : c.ink;
    g.lineWidth = l.width;
    g.setLineDash(l.dash ?? []);
    g.stroke(l.path);
  }
  g.setLineDash([]);
  g.restore();
}

/**
 * Draw an emblem as a white mask (for foil stamping / debossing): fills,
 * line work and guides are white; cut details are erased.
 */
export function maskEmblem(g, geo, { guides = true } = {}) {
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  if (guides && geo.guides) {
    for (const gd of geo.guides) {
      g.lineWidth = gd.width * 1.3;
      g.setLineDash(gd.dash ?? []);
      g.stroke(gd.path);
    }
    g.setLineDash([]);
  }
  g.fill(geo.fill);
  // knock out details
  g.globalCompositeOperation = 'destination-out';
  g.lineWidth = Math.max(1, (geo.lines[0]?.width ?? 2) * 0.6);
  g.fill(geo.cut);
  if (geo.veins) g.stroke(geo.veins);
  if (geo.over) {
    for (const o of geo.over) {
      g.lineWidth = Math.max(2, (geo.lines[0]?.width ?? 2) * 1.2);
      g.stroke(o.path);
    }
  }
  if (geo.keel) {
    g.lineWidth = geo.keel.width;
    g.stroke(geo.keel.path);
  }
  g.globalCompositeOperation = 'source-over';
  if (geo.over) {
    for (const o of geo.over) {
      g.fill(o.path);
      g.globalCompositeOperation = 'destination-out';
      if (o.col) g.fill(o.col);
      g.globalCompositeOperation = 'source-over';
    }
  }
  for (const l of geo.lines) {
    if (l.onCut) {
      g.globalCompositeOperation = 'destination-out';
      g.lineWidth = l.width;
      g.stroke(l.path);
      g.globalCompositeOperation = 'source-over';
      continue;
    }
    g.lineWidth = l.width;
    g.setLineDash(l.dash ?? []);
    g.stroke(l.path);
  }
  g.setLineDash([]);
  g.restore();
}
