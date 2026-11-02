// Spine: a sampled centre-line with per-sample frames and cross-section
// scales — the shared state between a pose generator (which writes
// positions), the swept tube (skin), instanced bones and label anchors.
//
// Frames use *guided parallel transport*: the dorsal vector B is carried
// sample to sample with minimal twist (so S-bends and curls never flip the
// animal onto its back), and wherever the pose asks for it (`upWeight > 0`)
// it is gently pulled towards a target "up" (world up for a body on the
// ground, outward from a branch for a prehensile wrap). The pull never
// rotates B past 90°, so a target pointing the wrong way cannot flip it.
//
// Conventions (shared with the snake subject and anything that sweeps a
// tube along a spine):
//   sample 0 = front (snout), sample count-1 = back (tail tip)
//   T  unit tangent pointing towards increasing sample index (tail-wards)
//   B  unit "dorsal" normal
//   R  = B × T, the animal's right-hand side when it faces −T

export class Spine {
  /** @param {number} count  number of samples (≥ 2) */
  constructor(count) {
    this.count = count;
    this.pos = new Float32Array(count * 3);
    this.T = new Float32Array(count * 3);
    this.B = new Float32Array(count * 3);
    this.R = new Float32Array(count * 3);
    /** target dorsal direction per sample (default world up) */
    this.upTarget = new Float32Array(count * 3);
    /** 0 = free transport … 1 = follow the target as closely as possible */
    this.upWeight = new Float32Array(count);
    /** cross-section half-width (lateral) and half-height scales per sample */
    this.w = new Float32Array(count);
    this.h = new Float32Array(count);
    /** section blend per sample (0 = section A, 1 = section B) */
    this.mix = new Float32Array(count);
    /** arc-length coordinate of each sample (cm from the front) */
    this.s = new Float32Array(count);
    for (let i = 0; i < count; i++) this.upTarget[i * 3 + 1] = 1;
    this.upWeight.fill(0.35);
  }

  /** Set every sample's up target to one vector and weight. */
  resetUp(x = 0, y = 1, z = 0, weight = 0.35) {
    for (let i = 0; i < this.count; i++) {
      this.upTarget[i * 3] = x;
      this.upTarget[i * 3 + 1] = y;
      this.upTarget[i * 3 + 2] = z;
      this.upWeight[i] = weight;
    }
  }

  /**
   * Compute T, B, R from `pos`, `upTarget`, `upWeight`.
   * @param {boolean} [fromBack=true]  transport from the last sample towards
   *        the first (start where the animal rests on its substrate)
   */
  computeFrames(fromBack = true) {
    const n = this.count, P = this.pos, T = this.T, B = this.B, R = this.R;
    const U = this.upTarget, W = this.upWeight;
    // tangents: central differences, one-sided at the ends
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1) * 3, b = Math.min(n - 1, i + 1) * 3;
      let x = P[b] - P[a], y = P[b + 1] - P[a + 1], z = P[b + 2] - P[a + 2];
      let l = Math.hypot(x, y, z);
      if (l < 1e-8) {
        // degenerate (zero-radius tip etc.): reuse the neighbour's tangent
        const j = (i > 0 ? i - 1 : 0) * 3;
        x = T[j]; y = T[j + 1]; z = T[j + 2];
        l = Math.hypot(x, y, z) || 1;
        if (i === 0) { x = 1; y = 0; z = 0; l = 1; }
      }
      T[i * 3] = x / l; T[i * 3 + 1] = y / l; T[i * 3 + 2] = z / l;
    }
    const start = fromBack ? n - 1 : 0;
    const step = fromBack ? -1 : 1;
    // seed B at the start sample: the target projected off the tangent
    {
      const o = start * 3;
      let bx = U[o], by = U[o + 1], bz = U[o + 2];
      let d = bx * T[o] + by * T[o + 1] + bz * T[o + 2];
      bx -= d * T[o]; by -= d * T[o + 1]; bz -= d * T[o + 2];
      let l = Math.hypot(bx, by, bz);
      if (l < 1e-4) {
        // tangent parallel to the target: pick any perpendicular
        bx = Math.abs(T[o + 1]) < 0.9 ? 0 : 1;
        by = Math.abs(T[o + 1]) < 0.9 ? 1 : 0;
        bz = 0;
        d = bx * T[o] + by * T[o + 1] + bz * T[o + 2];
        bx -= d * T[o]; by -= d * T[o + 1]; bz -= d * T[o + 2];
        l = Math.hypot(bx, by, bz) || 1;
      }
      B[o] = bx / l; B[o + 1] = by / l; B[o + 2] = bz / l;
    }
    for (let i = start + step; i >= 0 && i < n; i += step) {
      const o = i * 3, p = (i - step) * 3;
      const tx = T[o], ty = T[o + 1], tz = T[o + 2];
      // transport: project the previous dorsal vector off the new tangent
      let bx = B[p], by = B[p + 1], bz = B[p + 2];
      let d = bx * tx + by * ty + bz * tz;
      bx -= d * tx; by -= d * ty; bz -= d * tz;
      let l = Math.hypot(bx, by, bz) || 1;
      bx /= l; by /= l; bz /= l;
      // guide towards the target up
      const w = W[i];
      if (w > 0) {
        let ux = U[o], uy = U[o + 1], uz = U[o + 2];
        d = ux * tx + uy * ty + uz * tz;
        ux -= d * tx; uy -= d * ty; uz -= d * tz;
        const lu = Math.hypot(ux, uy, uz);
        if (lu > 1e-4) {
          ux /= lu; uy /= lu; uz /= lu;
          const agree = bx * ux + by * uy + bz * uz; // cos of the twist
          // reliable target (not along the tangent) that does not ask for a flip
          const k = w * smooth(0.12, 0.45, lu) * smooth(-0.1, 0.35, agree);
          if (k > 0) {
            bx += (ux - bx) * k; by += (uy - by) * k; bz += (uz - bz) * k;
            d = bx * tx + by * ty + bz * tz;
            bx -= d * tx; by -= d * ty; bz -= d * tz;
            l = Math.hypot(bx, by, bz) || 1;
            bx /= l; by /= l; bz /= l;
          }
        }
      }
      B[o] = bx; B[o + 1] = by; B[o + 2] = bz;
    }
    // R = B × T
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      const bx = B[o], by = B[o + 1], bz = B[o + 2];
      const tx = T[o], ty = T[o + 1], tz = T[o + 2];
      let rx = by * tz - bz * ty, ry = bz * tx - bx * tz, rz = bx * ty - by * tx;
      const l = Math.hypot(rx, ry, rz) || 1;
      R[o] = rx / l; R[o + 1] = ry / l; R[o + 2] = rz / l;
    }
    return this;
  }

  /**
   * Interpolated frame at fractional sample index `f` (0…count-1).
   * Writes position/T/B/R (each 3 floats) into `out` at offsets 0, 3, 6, 9.
   */
  frameAt(f, out) {
    const n = this.count;
    f = Math.min(n - 1, Math.max(0, f));
    const i = Math.min(n - 2, Math.floor(f));
    const u = f - i;
    const a = i * 3, b = a + 3;
    const arrs = [this.pos, this.T, this.B, this.R];
    for (let k = 0; k < 4; k++) {
      const A = arrs[k];
      let x = A[a] + (A[b] - A[a]) * u, y = A[a + 1] + (A[b + 1] - A[a + 1]) * u, z = A[a + 2] + (A[b + 2] - A[a + 2]) * u;
      if (k > 0) {
        const l = Math.hypot(x, y, z) || 1;
        x /= l; y /= l; z /= l;
      }
      out[k * 3] = x; out[k * 3 + 1] = y; out[k * 3 + 2] = z;
    }
    return out;
  }

  /** Fractional sample index for arc length s (uniform spacing assumed). */
  indexAt(s) {
    const L = this.s[this.count - 1] - this.s[0];
    return ((s - this.s[0]) / (L || 1)) * (this.count - 1);
  }
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
