// Width profiles for lofted botanical blades (petals, sepals, bracts, leaves).
//
// Botanists name blade outlines (lanceolate, ovate, obovate…) by where the
// widest point sits and how the tip closes. A profile here is a function
// v ∈ [0, 1] (base → tip) → relative half-width ∈ [0, 1], built from a few
// control points with monotone cubic interpolation (no overshoot, so a blade
// never pinches or bulges between points). Tip rounding is applied by the
// blade itself so every profile closes exactly at v = 1.

/**
 * Named outline presets: control points [v, w] (w relative to max width).
 * The last point is the width just before the tip closes; `tip` is the
 * suggested rounding (0 = acute point, 1 = semicircular).
 */
export const PROFILES = {
  linear: { points: [[0, 0.55], [0.12, 0.9], [0.3, 1], [0.7, 0.95], [0.9, 0.7], [1, 0.25]], tip: 0.15 },
  'linear-lanceolate': { points: [[0, 0.35], [0.12, 0.8], [0.32, 1], [0.6, 0.86], [0.85, 0.5], [1, 0.05]], tip: 0.05 },
  lanceolate: { points: [[0, 0.22], [0.1, 0.62], [0.28, 0.96], [0.38, 1], [0.6, 0.82], [0.82, 0.45], [1, 0.04]], tip: 0.05 },
  ovate: { points: [[0, 0.22], [0.1, 0.62], [0.26, 0.92], [0.4, 1], [0.6, 0.9], [0.8, 0.62], [1, 0.22]], tip: 0.55 },
  elliptic: { points: [[0, 0.18], [0.12, 0.62], [0.32, 0.95], [0.5, 1], [0.68, 0.94], [0.86, 0.62], [1, 0.18]], tip: 0.5 },
  oblong: { points: [[0, 0.3], [0.1, 0.78], [0.25, 0.97], [0.5, 1], [0.75, 0.96], [0.9, 0.78], [1, 0.4]], tip: 0.8 },
  obovate: { points: [[0, 0.14], [0.2, 0.46], [0.45, 0.82], [0.66, 1], [0.82, 0.93], [0.94, 0.66], [1, 0.38]], tip: 0.75 },
  spatulate: { points: [[0, 0.12], [0.3, 0.24], [0.55, 0.62], [0.74, 0.96], [0.86, 0.95], [1, 0.5]], tip: 0.9 },
  orbicular: { points: [[0, 0.32], [0.14, 0.76], [0.36, 0.98], [0.5, 1], [0.7, 0.95], [0.86, 0.75], [1, 0.42]], tip: 1 },
  cordate: { points: [[0, 0.5], [0.06, 0.86], [0.2, 1], [0.42, 0.93], [0.66, 0.66], [0.86, 0.34], [1, 0.05]], tip: 0.1 },
  // Boat-shaped (cymbiform) inflorescence bract: broad, long, acute.
  cymbiform: { points: [[0, 0.5], [0.12, 0.8], [0.3, 0.98], [0.5, 1], [0.7, 0.86], [0.88, 0.5], [1, 0.06]], tip: 0.1 },
};

/**
 * Monotone cubic (Fritsch–Carlson) interpolant through sorted points.
 * @param {Array<[number, number]>} pts
 * @returns {(x: number) => number}
 */
export function monotoneCubic(pts) {
  const n = pts.length;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const d = new Array(n - 1);
  const m = new Array(n);
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / Math.max(1e-9, xs[i + 1] - xs[i]);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

/**
 * Resolve a profile spec into { fn, tip }.
 * @param {string|Array<[number,number]>|((v:number)=>number)} spec  preset name, control points or function
 * @param {number} [tip] override tip rounding
 */
export function resolveProfile(spec = 'elliptic', tip) {
  if (typeof spec === 'function') return { fn: spec, tip: tip ?? 0.5 };
  if (Array.isArray(spec)) return { fn: monotoneCubic(spec), tip: tip ?? 0.5 };
  const p = PROFILES[spec] ?? PROFILES.elliptic;
  return { fn: monotoneCubic(p.points), tip: tip ?? p.tip };
}
