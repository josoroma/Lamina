// Sampled 3D curves for swept tubes (snake spines, branches, ducts).
//
// Everything works on flat Float32Arrays (x0, y0, z0, x1, …) so that poses
// recomputed every frame allocate nothing: a centripetal Catmull-Rom builder
// for smooth curves through hand-placed control points, and an arc-length
// Polyline that samples positions/tangents by distance along the curve
// (wrapping for closed loops, extrapolating along the end tangents for open
// ones) and resamples to uniform spacing.

const EPS = 1e-6;

/**
 * Centripetal Catmull-Rom spline through control points (no cusps or
 * self-intersections inside a segment, unlike the uniform variant).
 *
 * @param {ArrayLike<number>} ctrl  flat xyz control points (≥ 2 points)
 * @param {object} [o]
 * @param {boolean} [o.closed=false]  wrap the last point back to the first
 * @param {number} [o.samples=12]  samples per segment
 * @param {number} [o.alpha=0.5]  0 uniform, 0.5 centripetal, 1 chordal
 * @param {Float32Array} [o.out]  destination; must hold `catmullRomCount(...)` points
 * @returns {Float32Array} flat xyz samples (closed curves do not repeat the first point)
 */
export function catmullRom(ctrl, { closed = false, samples = 12, alpha = 0.5, out } = {}) {
  const n = ctrl.length / 3;
  const segs = closed ? n : n - 1;
  const count = catmullRomCount(n, { closed, samples });
  const dst = out ?? new Float32Array(count * 3);
  // control point i, component k (wrapping, or reflecting the end spans)
  const P = (i, k) => {
    if (closed) return ctrl[(((i % n) + n) % n) * 3 + k];
    if (i < 0) return 2 * ctrl[k] - ctrl[3 + k];
    if (i >= n) return 2 * ctrl[(n - 1) * 3 + k] - ctrl[(n - 2) * 3 + k];
    return ctrl[i * 3 + k];
  };
  const knot = (a, b) => {
    const dx = P(b, 0) - P(a, 0), dy = P(b, 1) - P(a, 1), dz = P(b, 2) - P(a, 2);
    return Math.max(EPS, Math.pow(dx * dx + dy * dy + dz * dz, alpha / 2));
  };
  let w = 0;
  for (let s = 0; s < segs; s++) {
    const t0 = 0;
    const t1 = t0 + knot(s - 1, s);
    const t2 = t1 + knot(s, s + 1);
    const t3 = t2 + knot(s + 1, s + 2);
    const last = !closed && s === segs - 1;
    const steps = last ? samples + 1 : samples;
    for (let j = 0; j < steps; j++) {
      const t = t1 + ((t2 - t1) * j) / samples;
      for (let k = 0; k < 3; k++) {
        // Barry–Goldman pyramid
        const p0 = P(s - 1, k), p1 = P(s, k), p2 = P(s + 1, k), p3 = P(s + 2, k);
        const a1 = ((t1 - t) * p0 + (t - t0) * p1) / (t1 - t0);
        const a2 = ((t2 - t) * p1 + (t - t1) * p2) / (t2 - t1);
        const a3 = ((t3 - t) * p2 + (t - t2) * p3) / (t3 - t2);
        const b1 = ((t2 - t) * a1 + (t - t0) * a2) / (t2 - t0);
        const b2 = ((t3 - t) * a2 + (t - t1) * a3) / (t3 - t1);
        dst[w + k] = ((t2 - t) * b1 + (t - t1) * b2) / (t2 - t1);
      }
      w += 3;
    }
  }
  return dst;
}

/** Number of points `catmullRom` produces. */
export function catmullRomCount(nCtrl, { closed = false, samples = 12 } = {}) {
  return closed ? nCtrl * samples : (nCtrl - 1) * samples + 1;
}

/**
 * Arc-length parameterised polyline. Reusable: call `set()` with new points
 * every frame; capacity is fixed at construction.
 */
export class Polyline {
  /** @param {number} capacity  maximum number of points */
  constructor(capacity) {
    this.capacity = capacity;
    this.pts = new Float32Array(capacity * 3);
    this.cum = new Float32Array(capacity + 1);
    this.n = 0;
    this.closed = false;
    this.length = 0;
  }

  /**
   * @param {ArrayLike<number>} points flat xyz
   * @param {number} [n] number of points (default points.length / 3)
   * @param {boolean} [closed=false]
   * @returns {this}
   */
  set(points, n = points.length / 3, closed = false) {
    if (n > this.capacity) throw new Error(`Polyline capacity ${this.capacity} < ${n}`);
    if (points !== this.pts) for (let i = 0; i < n * 3; i++) this.pts[i] = points[i];
    this.n = n;
    this.closed = closed;
    this.computeLengths();
    return this;
  }

  /** Recompute the cumulative arc-length table after editing `pts` in place. */
  computeLengths() {
    const p = this.pts, c = this.cum;
    c[0] = 0;
    for (let i = 1; i < this.n; i++) {
      const a = (i - 1) * 3, b = i * 3;
      c[i] = c[i - 1] + Math.hypot(p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]);
    }
    if (this.closed) {
      const a = (this.n - 1) * 3;
      c[this.n] = c[this.n - 1] + Math.hypot(p[0] - p[a], p[1] - p[a + 1], p[2] - p[a + 2]);
      this.length = c[this.n];
    } else {
      this.length = c[this.n - 1];
    }
    return this.length;
  }

  /** Segment index containing arc length s (already wrapped / clamped). */
  _seg(s) {
    const c = this.cum;
    const last = this.closed ? this.n : this.n - 1;
    let lo = 0, hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (c[mid] <= s) lo = mid; else hi = mid;
    }
    return lo;
  }

  /**
   * Position (and optionally unit tangent) at arc length `s`.
   * Closed curves wrap; open curves extrapolate linearly beyond the ends.
   * @param {number} s
   * @param {Float32Array|number[]} out  receives xyz at `o`
   * @param {number} [o=0]
   * @param {Float32Array|number[]} [tan]  receives the unit tangent at `to`
   * @param {number} [to=0]
   */
  sample(s, out, o = 0, tan = null, to = 0) {
    const p = this.pts, n = this.n, L = this.length;
    if (n < 2) {
      out[o] = p[0]; out[o + 1] = p[1]; out[o + 2] = p[2];
      if (tan) { tan[to] = 1; tan[to + 1] = 0; tan[to + 2] = 0; }
      return;
    }
    let i, f, a, b;
    if (this.closed) {
      s = ((s % L) + L) % L;
      i = this._seg(s);
      a = i * 3;
      b = ((i + 1) % n) * 3;
      const segLen = this.cum[i + 1] - this.cum[i];
      f = segLen > EPS ? (s - this.cum[i]) / segLen : 0;
    } else if (s <= 0) {
      a = 0; b = 3;
      const segLen = this.cum[1] || EPS;
      f = s / segLen;
    } else if (s >= L) {
      a = (n - 2) * 3; b = (n - 1) * 3;
      const segLen = this.cum[n - 1] - this.cum[n - 2] || EPS;
      f = 1 + (s - L) / segLen;
    } else {
      i = this._seg(s);
      a = i * 3; b = (i + 1) * 3;
      const segLen = this.cum[i + 1] - this.cum[i];
      f = segLen > EPS ? (s - this.cum[i]) / segLen : 0;
    }
    const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2];
    out[o] = p[a] + dx * f;
    out[o + 1] = p[a + 1] + dy * f;
    out[o + 2] = p[a + 2] + dz * f;
    if (tan) {
      const l = Math.hypot(dx, dy, dz) || 1;
      tan[to] = dx / l; tan[to + 1] = dy / l; tan[to + 2] = dz / l;
    }
  }

  /**
   * Resample `count` points uniformly spaced in arc length from `s0` to `s1`
   * into `out` (flat xyz).
   */
  resample(out, count, s0 = 0, s1 = this.length) {
    const step = count > 1 ? (s1 - s0) / (count - 1) : 0;
    for (let k = 0; k < count; k++) this.sample(s0 + step * k, out, k * 3);
    return out;
  }
}

/**
 * Laplacian smoothing of a flat xyz polyline in place, keeping the end points
 * of open curves fixed. Useful to round the joints of piecewise-built paths.
 * @param {Float32Array} pts
 * @param {number} n
 * @param {number} [iterations=2]
 * @param {number} [k=0.5]  blend towards the neighbour average
 * @param {Float32Array} [weights]  optional per-point multiplier of k (0 = pinned)
 * @param {boolean} [closed=false]
 */
export function smoothPolyline(pts, n, iterations = 2, k = 0.5, weights = null, closed = false) {
  const tmp = new Float32Array(n * 3);
  for (let it = 0; it < iterations; it++) {
    tmp.set(pts.subarray(0, n * 3));
    for (let i = 0; i < n; i++) {
      if (!closed && (i === 0 || i === n - 1)) continue;
      const a = ((i - 1 + n) % n) * 3, b = i * 3, c = ((i + 1) % n) * 3;
      const w = k * (weights ? weights[i] : 1);
      for (let j = 0; j < 3; j++) pts[b + j] = tmp[b + j] + w * ((tmp[a + j] + tmp[c + j]) * 0.5 - tmp[b + j]);
    }
  }
  return pts;
}
