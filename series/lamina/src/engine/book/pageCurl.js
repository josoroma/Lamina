// Page curl: an arc-length model of a flexible leaf bound at the spine.
//
// Why arc length: a leaf of paper bends but never stretches, so we describe
// each cross-section by its tangent angle φ(s) and integrate the position
// (X = ∫cos φ ds, Y = ∫sin φ ds). The gutter curvature, the fore-edge shift
// of a thick book and the curl of a turning page all fall out of one formula
// and the leaf length is preserved exactly.
//
// The book lies in the XZ plane (Y up). The spine runs along Z at x = 0. A
// leaf's cross-section is a curve in XY parameterised by arc length s
// (0 at the spine, W at the fore-edge) and extruded along Z with a twist:
//
//   φ(s, ζ) = (1−p)·φR(s) + p·(π − φL(s)) + β·K(s/W) + τ·(s/W)·ζ
//
//   p        turn progress: 0 = lying on the right stack, 1 = on the left
//   φR, φL   rest profiles: the leaf rises out of the gutter onto its stack
//            (Y(s) = rise·(1 − e^(−s/s0)) ⇒ sin φ = (rise/s0)·e^(−s/s0))
//   β        bend: + lifts the fore-edge away from the right stack while the
//            leaf rises, − lifts it away from the left stack while it falls —
//            so the edge leads while rising and trails while falling
//   K(u)     bend profile (curvature grows towards the fore-edge, a hint of
//            stiffness near the sewn gutter)
//   τ        twist: makes a grabbed corner lead (ζ ∈ [−½, ½] head → tail)
//
// The spine anchor height moves with p between the two rest anchors, which
// lets a closed book (boards pressing the block flat) relax into a gutter as
// its cover opens. Normals are analytic (∂P/∂s × ∂P/∂z), so no
// computeVertexNormals per frame.

export const GUTTER_S0 = 0.085; // gutter decay length (page widths)
export const MAX_GUTTER_SLOPE = 0.8; // sin of the steepest gutter angle
export const BEND_AMP = 0.42; // rad; < 0.5 keeps the fore-edge angle monotonic in p (no crossing in riffles)
export const TWIST_AMP = 0.55; // rad at a full corner grab

/** Gutter decay length for a stack of height `rise` (thick blocks need a longer ramp). */
export function gutterS0(rise) {
  return Math.max(GUTTER_S0, rise / MAX_GUTTER_SLOPE);
}

/** Rest angle of a leaf rising out of the gutter onto a stack `rise` high. */
export function restAngle(s, rise, s0 = gutterS0(rise)) {
  if (rise <= 1e-7) return 0;
  return Math.asin(Math.min(0.999, (rise / s0) * Math.exp(-s / s0)));
}

/** Height reached by the rest profile at arc length s (closed form of ∫sin φ). */
export function restRise(s, rise, s0 = gutterS0(rise)) {
  if (rise <= 1e-7) return 0;
  return rise * (1 - Math.exp(-s / s0));
}

/** Bend profile K(u), K(0)=0, K(1)=1: curvature grows towards the fore-edge. */
export const bendProfile = (u) => u * (0.35 + 0.65 * u);

/** Column distribution: denser near the spine, where the gutter bends hardest. */
const colSpacing = (x) => x * (0.6 + 0.4 * x);

/**
 * @typedef {Object} CurlState
 * @property {number} p      turn progress 0..1
 * @property {number} bend   β radians
 * @property {number} twist  τ radians
 * @property {number} yR     spine anchor height on the right stack
 * @property {number} riseR  gutter rise of the right rest profile
 * @property {number} yL     spine anchor height on the left stack
 * @property {number} riseL  gutter rise of the left rest profile
 */

/** A fresh, flat CurlState. */
export function createCurlState() {
  return { p: 0, bend: 0, twist: 0, yR: 0, riseR: 0, yL: 0, riseL: 0 };
}

/**
 * Default bend/twist envelope for a turn at progress p. The same shape works
 * for both directions: the fore-edge is always lifted away from the nearer
 * stack — leading while the leaf rises, trailing while it falls.
 * @param {number} p        progress 0..1
 * @param {number} corner   −1 head corner … +1 tail corner leads
 * @param {object} [out]    receives { bend, twist } (no allocation when given)
 * @param {number} [amp=1]  bend amplitude multiplier
 */
export function autoCurl(p, corner = 0, out = {}, amp = 1) {
  const lift = Math.sin(Math.PI * p);
  out.bend = BEND_AMP * amp * Math.sin(2 * Math.PI * p) * (0.75 + 0.25 * lift);
  out.twist = corner * TWIST_AMP * lift;
  return out;
}

/**
 * Evaluates a leaf grid (cols along s, rows along z) for a CurlState.
 * Holds preallocated per-column scratch so evaluation never allocates.
 */
export class CurlGrid {
  /**
   * @param {number} cols  vertices along s (spine → fore-edge)
   * @param {number} rows  vertices along z (head → tail)
   * @param {number} W     leaf width
   * @param {number} H     leaf height
   */
  constructor(cols, rows, W, H) {
    this.cols = cols;
    this.rows = rows;
    this.W = W;
    this.H = H;
    this.s = new Float64Array(cols);
    for (let i = 0; i < cols; i++) this.s[i] = W * colSpacing(i / (cols - 1));
    this.base = new Float64Array(cols); // φ without twist at each column
    this.baseMid = new Float64Array(cols); // φ without twist at the midpoint (i−1, i)
  }

  /** u coordinate (0 at the spine) of column i — used for the grid UVs. */
  u(i) {
    return this.s[i] / this.W;
  }

  _baseAngle(s, st, s0R, s0L) {
    const r = st.riseR > 1e-7 ? Math.asin(Math.min(0.999, (st.riseR / s0R) * Math.exp(-s / s0R))) : 0;
    const l = st.riseL > 1e-7 ? Math.asin(Math.min(0.999, (st.riseL / s0L) * Math.exp(-s / s0L))) : 0;
    return (1 - st.p) * r + st.p * (Math.PI - l) + st.bend * bendProfile(s / this.W);
  }

  /**
   * Write positions and analytic unit normals of the curled leaf.
   * @param {Float32Array} pos  cols·rows·3
   * @param {Float32Array} nrm  cols·rows·3
   * @param {CurlState} st
   */
  write(pos, nrm, st) {
    const { cols, rows, W, H, s, base, baseMid } = this;
    const s0R = gutterS0(st.riseR);
    const s0L = gutterS0(st.riseL);
    const y0 = (1 - st.p) * st.yR + st.p * st.yL;
    for (let i = 0; i < cols; i++) {
      base[i] = this._baseAngle(s[i], st, s0R, s0L);
      if (i > 0) baseMid[i] = this._baseAngle(0.5 * (s[i - 1] + s[i]), st, s0R, s0L);
    }
    const tw = st.twist;
    const invH = 1 / H;
    for (let j = 0; j < rows; j++) {
      const zeta = j / (rows - 1) - 0.5;
      const z = zeta * H;
      let x = 0;
      let y = y0;
      let dxz = 0; // ∂X/∂z
      let dyz = 0; // ∂Y/∂z
      for (let i = 0; i < cols; i++) {
        if (i > 0) {
          const ds = s[i] - s[i - 1];
          const twm = (tw * 0.5 * (s[i - 1] + s[i])) / W; // ∂φ/∂ζ at the midpoint
          const phi = baseMid[i] + twm * zeta;
          const c = Math.cos(phi);
          const sn = Math.sin(phi);
          x += c * ds;
          y += sn * ds;
          dxz -= sn * twm * ds * invH;
          dyz += c * twm * ds * invH;
        }
        const phiV = base[i] + ((tw * s[i]) / W) * zeta;
        const c = Math.cos(phiV);
        const sn = Math.sin(phiV);
        // N = ∂P/∂z × ∂P/∂s = (dxz, dyz, 1) × (c, sn, 0)
        const nx = -sn;
        const ny = c;
        const nz = dxz * sn - dyz * c;
        const inv = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        const k = (j * cols + i) * 3;
        pos[k] = x;
        pos[k + 1] = y;
        pos[k + 2] = z;
        nrm[k] = nx * inv;
        nrm[k + 1] = ny * inv;
        nrm[k + 2] = nz * inv;
      }
    }
  }

  /**
   * Point + frame on the curled leaf at page-local (s, z): used to stand a
   * pop-up figure on a turning page.
   * @returns {{ position: number[], tangent: number[], normal: number[], angle: number }}
   */
  frame(sq, z, st, out = { position: [0, 0, 0], tangent: [1, 0, 0], normal: [0, 1, 0], angle: 0 }) {
    const steps = 40;
    const zeta = Math.max(-0.5, Math.min(0.5, z / this.H));
    const s0R = gutterS0(st.riseR);
    const s0L = gutterS0(st.riseL);
    const tw = st.twist / this.W;
    let x = 0;
    let y = (1 - st.p) * st.yR + st.p * st.yL;
    const ds = sq / steps;
    for (let i = 0; i < steps; i++) {
      const sm = (i + 0.5) * ds;
      const phi = this._baseAngle(sm, st, s0R, s0L) + tw * sm * zeta;
      x += Math.cos(phi) * ds;
      y += Math.sin(phi) * ds;
    }
    const phi = this._baseAngle(sq, st, s0R, s0L) + tw * sq * zeta;
    out.position[0] = x;
    out.position[1] = y;
    out.position[2] = z;
    out.tangent[0] = Math.cos(phi);
    out.tangent[1] = Math.sin(phi);
    out.tangent[2] = 0;
    out.normal[0] = -Math.sin(phi);
    out.normal[1] = Math.cos(phi);
    out.normal[2] = 0;
    out.angle = phi;
    return out;
  }
}

/**
 * Rest profile of a stack top (for page blocks): fills `out` with
 * [x0, y0, x1, y1, …] for n+1 points from the spine to the fore-edge.
 * @param {Float64Array|number[]} out
 * @param {number} n       segments
 * @param {number} W       leaf width
 * @param {number} y0      spine anchor height
 * @param {number} rise    gutter rise
 * @param {number} side    +1 right, −1 left (mirrors x)
 */
export function restProfile(out, n, W, y0, rise, side = 1) {
  const s0 = gutterS0(rise);
  let x = 0;
  let y = y0;
  out[0] = 0;
  out[1] = y0;
  const ds = W / n;
  for (let i = 1; i <= n; i++) {
    const phi = restAngle((i - 0.5) * ds, rise, s0);
    x += Math.cos(phi) * ds;
    y += Math.sin(phi) * ds;
    out[i * 2] = x * side;
    out[i * 2 + 1] = y;
  }
  return out;
}

/**
 * Shaped timeline for an automatic turn: a quick lift, an airy pause near
 * the top, an accelerating fall and a soft settle. Monotonic, t,p ∈ [0, 1].
 * Hermite keys [t, p, dp/dt].
 */
const TURN_KEYS = [
  [0, 0, 1.55],
  [0.4, 0.46, 0.75],
  [0.8, 0.945, 0.5],
  [1, 1, 0],
];

export function turnCurve(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let i = 0;
  while (i < TURN_KEYS.length - 2 && t > TURN_KEYS[i + 1][0]) i++;
  const k0 = TURN_KEYS[i];
  const k1 = TURN_KEYS[i + 1];
  const h = k1[0] - k0[0];
  const x = (t - k0[0]) / h;
  const x2 = x * x;
  const x3 = x2 * x;
  return (2 * x3 - 3 * x2 + 1) * k0[1] + (x3 - 2 * x2 + x) * h * k0[2] + (-2 * x3 + 3 * x2) * k1[1] + (x3 - x2) * h * k1[2];
}
