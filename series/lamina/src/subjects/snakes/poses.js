// Pose generators: each writes the snake's spine (sample 0 = snout tip,
// sample K−1 = tail tip, uniform arc-length spacing) as a PURE function of
// the loop time t ∈ [0, 5) — so scrubbing, seamless looping and capture are
// deterministic and pose(0) ≡ pose(5).
//
// Building blocks:
//   * a 2.5-D turtle: heading per sample + explicit height; the horizontal
//     step shrinks as the body climbs, so the body never stretches
//   * flat spirals (resting / defensive / ambush coils) from an ODE on the
//     coil radius that keeps adjacent turns one body-width apart
//   * helices around an axis (prehensile tail on a branch, constriction coils)
//   * track following for lateral undulation: every point of the body passes
//     through the same points of a wavy track, as in real serpentine locomotion
//
// Each pose returns { evaluate(t, out), beats, fitReach? }: `evaluate` fills
// spine.pos / upTarget / upWeight and out.head (gape, fang, tongue, flick,
// spread, tilt), out.radius (breathing multipliers), out.shake (rattle blur
// amount) and out.prey (constriction squeeze). Props are built by index.js.
// Per-frame work allocates nothing: all buffers are created with the pose.
import { Polyline, catmullRom, catmullRomCount } from '../../kits/tube/index.js';

const TAU = Math.PI * 2;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOut = (t) => {
  t = clamp01(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
/** Piecewise easing through keyframes [[t, v, ease?], …] (ease: 'out' | 'io'). */
function keys(t, ks) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    const [t1, v1, e] = ks[i];
    const [t0, v0] = ks[i - 1];
    if (t <= t1) {
      const u = (t - t0) / Math.max(1e-6, t1 - t0);
      const w = e === 'out' ? easeOut(u) : e === 'lin' ? u : easeInOut(u);
      return v0 + (v1 - v0) * w;
    }
  }
  return ks[ks.length - 1][1];
}
/** Spanish common name (lower case) for narrated beats, e.g. 'terciopelo'. */
const name = (m) => (m.spec.common ?? m.spec.scientific).toLowerCase();

/** Smooth on/off window [a, b] with ramps of length r. */
const window01 = (t, a, b, r) => sstep(a - r, a, t) * (1 - sstep(b, b + r, t));

/**
 * Curvature (rad/cm) of a smooth bend that turns by `angle` radians over the
 * normalised stretch [q0, q1] of a segment `len` cm long (sine-shaped, so the
 * curvature starts and ends at zero).
 */
function bend(q, q0, q1, angle, len) {
  if (q <= q0 || q >= q1) return 0;
  return ((angle * Math.PI) / (2 * (q1 - q0) * len)) * Math.sin((Math.PI * (q - q0)) / (q1 - q0));
}

/**
 * Tongue-flick bouts: [[start, duration], …]. Writes ext (0…1), the vertical
 * flick angle and the spread of the tines into `h`.
 */
export function tongueBouts(t, bouts, h) {
  h.tongue = 0;
  h.flick = 0;
  h.spread = 0.3;
  for (const [t0, dur] of bouts) {
    if (t < t0 || t > t0 + dur) continue;
    const u = t - t0;
    const ext = sstep(0, 0.09, u) * (1 - sstep(dur - 0.1, dur, u));
    const osc = Math.sin(TAU * 6.5 * u);
    h.tongue = Math.max(h.tongue, ext);
    h.flick = 0.42 * osc;
    h.spread = 0.35 + 0.65 * Math.abs(osc);
  }
  return h;
}

// ---------------------------------------------------------------- integrators

/**
 * 2.5-D turtle from sample `from` to `to` (step ±1): heading[k] is the
 * direction of travel (radians in XZ, 0 = +X, π/2 = +Z) used for the step
 * leaving sample k; height[k] the absolute y. Arc length is preserved.
 */
function integrate(pos, from, to, heading, height, x, z, ds) {
  const dir = to > from ? 1 : -1;
  let k = from;
  pos[k * 3] = x;
  pos[k * 3 + 1] = height[k];
  pos[k * 3 + 2] = z;
  while (k !== to) {
    const kn = k + dir;
    const dy = height[kn] - height[k];
    const hs = Math.sqrt(Math.max(ds * ds - dy * dy, ds * ds * 0.04));
    x += Math.cos(heading[k]) * hs;
    z += Math.sin(heading[k]) * hs;
    pos[kn * 3] = x;
    pos[kn * 3 + 1] = height[kn];
    pos[kn * 3 + 2] = z;
    k = kn;
  }
  return { x, z };
}

/**
 * Flat outward spiral from sample `from` towards `to` (from > to: tail first).
 * Adjacent turns stay `gap` × (sum of half-widths) apart. Returns the end
 * state { x, z, psi, R }.
 */
function spiral(m, pos, from, to, { x = 0, z = 0, psi = 0, r0, turn = 1, gap = 1.04, heights }) {
  const { ds, halfW } = m;
  let R = r0;
  let k = from;
  for (;;) {
    pos[k * 3] = x;
    pos[k * 3 + 1] = heights ? heights[k] : m.groundY[k];
    pos[k * 3 + 2] = z;
    if (k === to) break;
    const outer = Math.max(0, k - Math.round((TAU * R) / ds));
    const spacing = (halfW[k] + halfW[outer]) * gap;
    R += (spacing / (TAU * R)) * ds;
    psi += (turn * ds) / R;
    x += Math.cos(psi) * ds;
    z += Math.sin(psi) * ds;
    k += to > from ? 1 : -1;
  }
  return { x, z, psi, R };
}

/** Rotate samples [a, b] about the Y axis around (cx, cz) and translate by (tx, tz). */
function transformXZ(pos, a, b, ang, cx, cz, tx, tz) {
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let k = a; k <= b; k++) {
    const x = pos[k * 3] - cx, z = pos[k * 3 + 2] - cz;
    pos[k * 3] = cx + x * c - z * s + tx;
    pos[k * 3 + 2] = cz + x * s + z * c + tz;
  }
}

/** Heights of samples resting on top of already-placed body samples (drape). */
function drape(m, pos, ks, supportFrom, supportTo, heights) {
  const { halfW, groundY, h0, sec } = m;
  for (const k of ks) {
    const x = pos[k * 3], z = pos[k * 3 + 2];
    let y = groundY[k];
    for (let j = supportFrom; j <= supportTo; j++) {
      const dx = pos[j * 3] - x, dz = pos[j * 3 + 2] - z;
      const reach = halfW[j] + halfW[k];
      const d2 = dx * dx + dz * dz;
      if (d2 >= reach * reach) continue;
      const d = Math.sqrt(d2);
      // rest on the rounded back of the supporting body
      const lift = pos[j * 3 + 1] + h0[j] * sec.top * Math.sqrt(Math.max(0, 1 - (d / reach) ** 2)) + h0[k] * sec.bottom * 0.92;
      if (lift > y) y = lift;
    }
    heights[k] = y;
  }
}

function smoothArray(a, from, to, passes = 2) {
  for (let p = 0; p < passes; p++) {
    let prev = a[from];
    for (let k = from + 1; k < to; k++) {
      const cur = a[k];
      a[k] = (prev + cur * 2 + a[k + 1]) * 0.25;
      prev = cur;
    }
  }
}

// ---------------------------------------------------------------- poses

/**
 * @param {string} name
 * @param {object} m  snake model (see index.js): K, L, ds, spine, halfW, h0,
 *        groundY, headLen, sCloaca, rMax, sec, spec
 * @param {object} params  figure params (path, closed, loops, wave, up, ups)
 */
export function createPose(name, m, params = {}) {
  const make = POSES[name];
  if (!make) throw new Error(`Unknown snake pose "${name}". Known: ${Object.keys(POSES).join(', ')}`);
  return make(m, params);
}

const POSES = {
  // ------------------------------------------------------------ strike
  strike(m) {
    const { K, ds, L, spine } = m;
    const kExit = Math.round((K - 1) * 0.42);
    const turn = -1;
    const coil = new Float32Array(K * 3);
    const st = spiral(m, coil, K - 1, kExit, { r0: m.rMax * 0.55, psi: 0, turn, gap: 0.97 });
    const heading = new Float32Array(K);
    const height = new Float32Array(K);
    const Ln = kExit * ds;
    const H = L * 0.074;
    // the neck arches inwards over the coil (alpha), then holds an S whose
    // axis is the strike direction; rotate everything so that axis is +X
    const alpha = 1.7;
    const aim = st.psi + turn * alpha;
    const ex = coil[kExit * 3], ez = coil[kExit * 3 + 2];
    transformXZ(coil, kExit, K - 1, -aim, ex, ez, -ex, -ez);
    const psi0 = st.psi - aim;
    const pos = spine.pos;
    return {
      fitReach: 0.55,
      beats: [
        { t: 0, text: `Coiled, neck drawn into an S, the ${name(m)} tastes the air.` },
        { t: 1.15, text: 'Anticipation: the S tightens and the head draws back.' },
        {
          t: 1.55,
          text: m.spec.fangs === 'solenoglyph'
            ? 'Strike — the S unfolds faster than a blink; the hinged fangs swing erect.'
            : 'Strike — the S unfolds faster than a blink; the jaws gape wide.',
        },
        { t: 1.85, text: m.spec.fangs === 'none' ? 'The teeth grip, then let go.' : 'Bite and release: venom is injected in an instant.' },
        { t: 2.3, text: 'Recoil into the defensive coil.' },
        { t: 3.5, text: 'Tongue flicks follow the scent trail.' },
      ],
      evaluate(t, out) {
        // b: 0 coiled … 1 fully extended (slight negatives = anticipation / overshoot)
        const b = keys(t, [[0, 0], [1.12, 0], [1.52, -0.12], [1.7, 1, 'out'], [1.84, 1], [2.6, -0.05], [3.1, 0], [5, 0]]);
        const ext = Math.max(0, b);
        const beta = 1.55 * (1 - b);
        const sway = 0.05 * Math.sin((TAU * t) / 5);
        for (let k = kExit; k < K; k++) {
          pos[k * 3] = coil[k * 3];
          pos[k * 3 + 1] = coil[k * 3 + 1];
          pos[k * 3 + 2] = coil[k * 3 + 2];
        }
        let psi = psi0;
        height[kExit] = m.groundY[kExit];
        for (let k = kExit; k >= 1; k--) {
          const q = (kExit - k) / kExit; // 0 at the coil … 1 at the snout
          psi += turn * bend(q, 0, 0.3, alpha, Ln) * ds;
          // S: the first lobe keeps curling over the coil, the second swings back
          const sq = (q - 0.27) / 0.6;
          let off = 0;
          if (sq > 0 && sq < 1) off = turn * beta * Math.sin(TAU * sq) * Math.pow(Math.sin(Math.PI * sq), 0.5);
          heading[k] = psi + off + sway * sstep(0.6, 1, q);
        }
        for (let k = kExit - 1; k >= 0; k--) {
          const q = (kExit - k) / kExit;
          const rise = sstep(0.02, 0.5 + ext * 0.26, q) * (1 + 0.14 * sstep(0.45, 0.8, q) * (1 - ext));
          const drop = ext * sstep(0.45, 1, q) * 0.55;
          height[k] = m.groundY[k] + H * (rise - drop);
        }
        integrate(pos, kExit, 0, heading, height, 0, 0, ds);
        spine.resetUp(0, 1, 0, 0.3);
        const h = out.head;
        tongueBouts(t, [[0.25, 0.7], [3.55, 0.62], [4.3, 0.45]], h);
        h.gape = keys(t, [[0, 0], [1.46, 0], [1.6, 1.8, 'out'], [1.72, 1.8], [1.8, 0.55], [1.9, 0.55], [2.02, 1.0], [2.45, 0], [5, 0]]);
        h.fang = keys(t, [[0, 0], [1.42, 0], [1.56, 1, 'out'], [2.05, 1], [2.5, 0], [5, 0]]);
        h.tilt = h.gape * 0.13;
        out.shake = 0;
      },
    };
  },

  // ------------------------------------------------------------ rattle
  rattle(m) {
    const { K, ds, L, spine } = m;
    const kTail = Math.round(K - 1 - (L * 0.08) / ds);
    const kExit = Math.round((K - 1) * 0.4);
    const turn = 1;
    const base = new Float32Array(K * 3);
    const heights = new Float32Array(K);
    const Hr = L * 0.068;
    for (let k = 0; k < K; k++) heights[k] = m.groundY[k];
    for (let k = kTail; k < K; k++) {
      // the tail climbs out of the coil and stands almost upright at the rattle
      const v = (k - kTail) / (K - 1 - kTail);
      heights[k] = m.groundY[k] + Hr * Math.pow(v, 1.45);
    }
    // the raised tail: from the rattle down into the centre of the coil
    const hd = new Float32Array(K);
    for (let k = kTail; k < K; k++) hd[k] = 0.3 * ((K - 1 - k) / (K - 1 - kTail));
    const tailEnd = integrate(base, K - 1, kTail, hd, heights, 0, 0, ds);
    const st = spiral(m, base, kTail, kExit, { x: tailEnd.x, z: tailEnd.z, psi: hd[kTail] + turn * 0.6, r0: m.rMax * 0.8, turn, gap: 0.98 });
    // the neck arches back over the coil, then an S brings the head round
    // to face the reader (+Z), a little towards the fore-edge
    const alpha = 1.5, beta = 1.15;
    const face = Math.PI / 2 - 0.5;
    const aim = st.psi + turn * alpha;
    const ex = base[kExit * 3], ez = base[kExit * 3 + 2];
    transformXZ(base, kExit, K - 1, face - aim, ex, ez, -ex, -ez);
    const psi0 = st.psi + face - aim;
    const heading = new Float32Array(K);
    const height = new Float32Array(K);
    const Ln = kExit * ds;
    const H = L * 0.115;
    const pos = spine.pos;
    return {
      beats: [
        { t: 0, text: 'Defensive coil: head raised, body ready to strike.' },
        {
          t: 0.6,
          text: m.spec.tailTip === 'rattle'
            ? 'Tail-shaker muscles buzz the rattle dozens of times a second.'
            : 'The tail tip quivers — many snakes vibrate their tails when threatened.',
        },
        { t: 2.2, text: 'Tongue flicks gather the scent of the intruder.' },
        { t: 3.6, text: 'A warning, not an attack — given space, it retreats.' },
      ],
      evaluate(t, out) {
        for (let k = kExit; k < K; k++) {
          pos[k * 3] = base[k * 3];
          pos[k * 3 + 1] = base[k * 3 + 1];
          pos[k * 3 + 2] = base[k * 3 + 2];
        }
        const bob = Math.sin((TAU * t) / 5);
        const sway = 0.12 * Math.sin((TAU * t) / 5 + 0.6);
        let psi = psi0;
        for (let k = kExit; k >= 1; k--) {
          const q = (kExit - k) / kExit;
          psi += turn * bend(q, 0, 0.34, alpha, Ln) * ds;
          const sq = (q - 0.32) / 0.56;
          let off = 0;
          if (sq > 0 && sq < 1) off = turn * beta * Math.sin(TAU * sq) * Math.pow(Math.sin(Math.PI * sq), 0.5);
          heading[k] = psi + off + sway * sstep(0.55, 1, q);
        }
        height[kExit] = m.groundY[kExit];
        for (let k = kExit - 1; k >= 0; k--) {
          const q = (kExit - k) / kExit;
          height[k] = m.groundY[k] + H * sstep(0.0, 0.66, q) * (1 + 0.025 * bob);
        }
        integrate(pos, kExit, 0, heading, height, 0, 0, ds);
        // the rattle buzzes: a fast sideways oscillation of the tail tip
        // (integer cycles per loop keep it seamless)
        const n = Math.round((L * 0.03) / ds);
        const tx = pos[(K - 1) * 3] - pos[(K - 1 - n) * 3], tz = pos[(K - 1) * 3 + 2] - pos[(K - 1 - n) * 3 + 2];
        const tl = Math.hypot(tx, tz) || 1;
        const px = -tz / tl, pz = tx / tl;
        const a = out.reducedMotion ? 0 : 0.35 * Math.sin(TAU * 37 * t);
        for (let i = 0; i <= n; i++) {
          const k = K - 1 - n + i;
          const w = (i / n) ** 2 * a;
          pos[k * 3] += px * w;
          pos[k * 3 + 2] += pz * w;
        }
        spine.resetUp(0, 1, 0, 0.3);
        const h = out.head;
        tongueBouts(t, [[0.9, 0.55], [2.3, 0.7], [4.1, 0.5]], h);
        h.gape = 0;
        h.fang = 0;
        h.tilt = -0.06 + 0.03 * bob;
        out.shake = 1;
      },
    };
  },

  // ------------------------------------------------------------ ambush (around the clutch)
  ambush(m) {
    const { K, ds, L, spine } = m;
    const kExit = Math.round((K - 1) * 0.25);
    const base = new Float32Array(K * 3);
    const eggR = m.clutchRadius ?? L * 0.05;
    const st = spiral(m, base, K - 1, kExit, { x: eggR + m.halfW[K - 1] * 2, z: 0, psi: Math.PI / 2, r0: eggR + m.rMax * 0.9, turn: 1, gap: 1.03 });
    const heading = new Float32Array(K);
    const flat = new Float32Array(K);
    const heights = new Float32Array(K);
    for (let k = 0; k < K; k++) flat[k] = m.groundY[k];
    // neck: curls inward over the coils, then U-turns so the head faces out
    let psi = st.psi;
    const Ln = kExit * ds;
    for (let k = kExit; k >= 1; k--) {
      const q = (kExit - k) / kExit;
      psi += (bend(q, 0, 0.3, 1.6, Ln) + bend(q, 0.3, 0.76, -3.0, Ln)) * ds;
      heading[k] = psi;
    }
    for (let k = kExit; k < K; k++) heights[k] = flat[k];
    integrate(base, kExit, 0, heading, flat, st.x, st.z, ds);
    // let the neck rest on the coils, then re-integrate with those heights
    const neck = [];
    for (let k = 0; k < kExit - 2; k++) neck.push(k);
    drape(m, base, neck, kExit + 4, K - 1, heights);
    heights[kExit - 1] = heights[kExit - 2] = flat[kExit];
    smoothArray(heights, 0, kExit, 6);
    for (let k = 0; k < kExit; k++) heights[k] = Math.max(heights[k], flat[k]);
    integrate(base, kExit, 0, heading, heights, st.x, st.z, ds);
    // turn the whole coil about the clutch (at the origin) so the head faces
    // the reader, a little towards the fore-edge
    const kH = Math.max(1, Math.round(m.headLen / ds));
    const look = Math.atan2(base[2] - base[kH * 3 + 2], base[0] - base[kH * 3]);
    transformXZ(base, 0, K - 1, Math.PI / 2 - 0.45 - look, 0, 0, 0, 0);
    const pos = spine.pos;
    const nVibe = Math.round((L * 0.05) / ds);
    return {
      beats: [
        { t: 0, text: m.spec.oviparous ? 'Ambush coil around the clutch, head facing out.' : 'Ambush coil, head facing out, ready to strike.' },
        { t: 1.2, text: 'Slow breathing — the body barely moves.' },
        {
          t: 2.1,
          text: m.spec.tailTip === 'spine'
            ? 'Disturbed, the spiny tail tip vibrates against the leaf litter.'
            : 'Disturbed, the tail tip vibrates against the leaf litter.',
        },
        { t: 3.8, text: m.spec.id === 'lachesis-stenophrys' ? 'Bushmasters can wait at one ambush site for days.' : 'Sit-and-wait hunters can stay put for hours or days.' },
      ],
      evaluate(t, out) {
        pos.set(base);
        // breathing swells the trunk once per loop
        const br = Math.sin((TAU * t) / 5);
        for (let k = 0; k < K; k++) {
          const s = k / (K - 1);
          out.radius[k] = 1 + 0.035 * br * sstep(0.08, 0.3, s) * (1 - sstep(0.7, 0.88, s));
        }
        // tail-tip vibration (23 Hz → 115 cycles per loop)
        const env = out.reducedMotion ? 0 : window01(t, 2.1, 3.5, 0.18);
        if (env > 0) {
          const a = 0.6 * env * Math.sin(TAU * 23 * t);
          const k0 = K - 1 - nVibe;
          const tx = pos[(K - 1) * 3] - pos[k0 * 3], tz = pos[(K - 1) * 3 + 2] - pos[k0 * 3 + 2];
          const tl = Math.hypot(tx, tz) || 1;
          for (let i = 0; i <= nVibe; i++) {
            const k = k0 + i;
            const w = (i / nVibe) ** 2 * a;
            pos[k * 3] += (-tz / tl) * w;
            pos[k * 3 + 2] += (tx / tl) * w;
          }
        }
        spine.resetUp(0, 1, 0, 0.35);
        const h = out.head;
        tongueBouts(t, [[0.9, 0.6], [4.0, 0.5]], h);
        h.gape = 0;
        h.fang = 0;
        h.tilt = 0.02 * br;
        out.shake = 0;
      },
    };
  },

  // ------------------------------------------------------------ slither (closed track)
  slither(m) {
    const { K, L, spine } = m;
    const a = L * 0.33, b = L * 0.22; // base ellipse half-axes
    const waves = 5;
    const amp = L * 0.04;
    const track = buildWavyLoop(a, b, waves, amp, 720);
    const P = track.length;
    const tmp = new Float32Array(3), tan = new Float32Array(3);
    // the head's own samples carry no body radius (the tube starts inside the
    // head), so they are held at the neck's height — the head stays level
    // instead of nosing into the ground — and carried a little raised
    const sNeck = m.headLen * 1.2;
    const kNeck = Math.min(K - 1, Math.round(sNeck / m.ds));
    const yNeck = m.groundY[kNeck];
    const lift = m.halfW[kNeck] * 0.5;
    const pos = spine.pos;
    return {
      beats: [
        { t: 0, text: 'Lateral undulation: every point of the body follows the path of the head.' },
        { t: 1.4, text: 'Each bend pushes back against the ground.' },
        {
          t: 2.6,
          text: m.spec.kind === 'elapid'
            ? 'Tail raised and curled — a decoy display that draws attacks away from the head.'
            : 'The tail lifts and curls for a moment.',
        },
        {
          t: 4.3,
          text: m.spec.kind === 'elapid'
            ? 'Coral snakes hunt other small snakes and lizards in the leaf litter.'
            : 'Lateral undulation is the commonest way snakes move.',
        },
      ],
      evaluate(t, out) {
        const head = P * (t / 5) + P * 0.25;
        const curl = out.reducedMotion ? 0 : keys(t, [[0, 0], [2.4, 0], [3.0, 1], [3.9, 1], [4.5, 0], [5, 0]]);
        const Lc = L * 0.14;
        for (let k = 0; k < K; k++) {
          const s = spine.s[k];
          track.sample(head - s, tmp, 0, tan, 0);
          let y = (s < sNeck ? Math.max(m.groundY[k], yNeck) : m.groundY[k]) + lift * (1 - sstep(0, L * 0.09, s));
          let x = tmp[0], z = tmp[2];
          const v = (s - (L - Lc)) / Lc;
          if (curl > 0 && v > 0) {
            // tail lifts and hooks sideways
            const nx = -tan[2], nz = tan[0];
            const side = Math.sin(Math.PI * Math.min(1, v) * 0.85) * L * 0.035 * curl;
            x += nx * side;
            z += nz * side;
            y += Math.pow(v, 1.6) * L * 0.07 * curl;
          }
          pos[k * 3] = x;
          pos[k * 3 + 1] = y;
          pos[k * 3 + 2] = z;
        }
        spine.resetUp(0, 1, 0, 0.45);
        const h = out.head;
        tongueBouts(t, [[0.55, 0.5], [3.25, 0.55]], h);
        h.gape = 0;
        h.fang = 0;
        h.tilt = 0.04;
        out.shake = 0;
      },
    };
  },

  // ------------------------------------------------------------ swim (in a water slab)
  swim(m) {
    const { K, ds, L, spine } = m;
    const heading = new Float32Array(K);
    const height = new Float32Array(K);
    const surface = m.waterLevel;
    const lambda = L * 0.56;
    const f = 6 / 5; // 6 tail beats per loop
    const pos = spine.pos;
    /** Body shape at loop time t (heading + height per sample); depends only on the beat phase f·t. */
    function shape(t) {
      for (let k = 0; k < K; k++) {
        const s = spine.s[k];
        // anguilliform: the wave grows towards the paddle tail
        const amp = 0.22 + 0.5 * (s / L) ** 1.3;
        heading[k] = Math.PI + amp * Math.sin(TAU * (s / lambda - f * t));
        // floating at the surface: the back just breaks it, the head a little higher
        height[k] = surface - m.h0[k] * 0.22 - 0.25 * Math.sin(TAU * (s / lambda - f * t) + 1.1) * (s / L) + (1 - sstep(0, L * 0.1, s)) * m.h0[0] * 0.35;
      }
    }
    // The snout is pinned while the waves run down the body, so the swimming
    // snake spans ~0.95 L. Measure that span over one beat (the shape repeats
    // every 1/f s) — plus the reach of a tongue flick ahead of the snout — and
    // centre it on the origin, so the water slab can be sized around it.
    let minX = Infinity, maxX = -Infinity, maxZ = 0;
    for (let i = 0; i < 32; i++) {
      shape(i / 32 / f);
      integrate(pos, 0, K - 1, heading, height, 0, 0, ds);
      for (let k = 0; k < K; k++) {
        minX = Math.min(minX, pos[k * 3]);
        maxX = Math.max(maxX, pos[k * 3]);
        maxZ = Math.max(maxZ, Math.abs(pos[k * 3 + 2]));
      }
    }
    maxX += m.headLen * 0.8;
    const x0 = -(minX + maxX) / 2;
    return {
      /** Swept x/z extent over the loop (cm, after centring): the water slab is sized from it. */
      extent: { halfX: (maxX - minX) / 2, halfZ: maxZ },
      beats: m.spec.kind === 'seasnake'
        ? [
          { t: 0, text: 'A pelagic snake: it lives its whole life at sea.' },
          { t: 1.2, text: 'Waves travel down the body; the paddle tail pushes the water.' },
          { t: 2.8, text: 'Valved nostrils close underwater; some oxygen is absorbed through the skin.' },
          { t: 4.0, text: 'Its bold yellow and black are thought to warn predators.' },
        ]
        : [
          { t: 0, text: 'Swimming: the same lateral undulation snakes use on land.' },
          { t: 1.8, text: 'Waves travel from head to tail and push against the water.' },
          { t: 3.6, text: 'The head stays near the surface to breathe.' },
        ],
      evaluate(t, out) {
        shape(t);
        integrate(pos, 0, K - 1, heading, height, x0, 0, ds);
        spine.resetUp(0, 1, 0, 0.6);
        const h = out.head;
        tongueBouts(t, [[2.9, 0.45]], h);
        h.gape = 0;
        h.fang = 0;
        h.tilt = 0.05 * Math.sin(TAU * f * t);
        out.shake = 0;
      },
    };
  },

  // ------------------------------------------------------------ constrict (around a prey)
  //
  // A béquer holding a black rat (props.js buildPrey). Boback et al. (2015):
  // the snake keeps its bite while two or more loops squeeze the prey's
  // chest and belly. Here the rear of the jaws grips the back of the rat's
  // neck from the far side, the head lying along the top of the rat's head;
  // the neck turns down the far side into two loops, each as thick as its
  // stretch of the body, and the body leaves the second down the far side
  // and runs round behind on the paper. The rat's face, near ear and
  // forefeet stay in front of the loops; its rump, hind feet and tail
  // behind. The loops follow the rat's axis, and the rat sits where the
  // lowest loop rests on the paper. When the coils tighten they close by
  // about half a centimetre and swell, the whole coil dropping so that it
  // stays on the paper, and the rat's chest flattens with them (out.prey).
  constrict(m) {
    const { K, L, ds, spine } = m;
    const prey = m.prey;
    const sc = L / 200; // the trailing body's layout is drawn for a 2 m boa
    const Lh = m.headLen;
    const { bottom, top } = m.sec;
    const hAt = (s) => m.h0[Math.min(K - 1, Math.max(0, Math.round(s / ds)))];
    const DEG = Math.PI / 180;

    // ---- the bite: the jaws straddle the back of the rat's neck. The head
    // comes over the nape from the far side, across the neck; the open mouth
    // is a wedge between the palate and the floor of the mouth whose sides
    // both just touch the fur, so the neck lies inside the mouth and only the
    // teeth sink into it. The head's skin (prey.mouth.surface, posed by
    // head.js) is fitted against the rat's own body.
    const GAPE = 0.8; // the hold: palate to floor of the mouth (rad)
    const TILT = 0.12; // the upper head raised on the neck as the mouth opens (rad)
    const YAW = 25 * DEG; // the head's plane turned from straight across the neck, towards the muzzle
    const ELEV = 45 * DEG; // the corner of the mouth above the neck's far side, seen from its axis
    const CLEAR = 0.02; // fur to palate and floor of the mouth where they come closest (cm)
    const cY = prey.headCentreY ?? 0.25 * (m.spec.head.height - m.spec.head.jaw) * Lh;
    const mouth = prey.mouth ?? { palate: -0.26 * m.spec.head.jaw * Lh, floor: 0.16 * m.spec.head.jaw * Lh, hinge: [0.035 * Lh, -0.04 * m.spec.head.jaw * Lh] };
    const D = new Float32Array(3), N = new Float32Array(3);
    const P0 = new Float32Array(3); // the snout tip (spine sample 0)
    const B0 = new Float32Array(3); // …relative to the neck's axis at the bite
    {
      const bt = prey.bite, C = bt.centre;
      // the head's plane through the neck's axis: across the neck (h, far →
      // near side, turned by YAW towards the muzzle) and up; the bisector of
      // the mouth runs from its corner, above the far side, to the axis
      const h = [0, 1, 2].map((i) => bt.side[i] * Math.cos(YAW) + bt.along[i] * Math.sin(YAW));
      // the corner of the mouth in the head's frame: where the palate meets
      // the floor of the mouth once the jaw has dropped by GAPE about its
      // hinge (and the whole head is raised by TILT)
      const [hx, hy] = mouth.hinge, fy = mouth.floor - hy;
      const xj = (hy + fy * Math.cos(GAPE) - mouth.palate) / Math.sin(GAPE);
      const cx = hx + xj * Math.cos(GAPE) + fy * Math.sin(GAPE), cyM = mouth.palate;
      const vx = cx * Math.cos(TILT) - cyM * Math.sin(TILT), vy = cx * Math.sin(TILT) + cyM * Math.cos(TILT);
      const pb = TILT - GAPE / 2; // the bisector's angle to the head's long axis
      // the rat, tabulated along x: axis height and radius
      const NT = 241, TX0 = C[0] - 12, TDX = 24 / (NT - 1);
      const tY = new Float32Array(NT), tR = new Float32Array(NT);
      for (let j = 0; j < NT; j++) {
        tY[j] = prey.spineYAt(TX0 + j * TDX);
        tR[j] = prey.radiusAt(TX0 + j * TDX);
      }
      /** How far (cm) a point lies outside the rat's body (its section: round above, 0.9 as deep below). */
      const ratGap = (x, y, z) => {
        const f = Math.min(NT - 1.001, Math.max(0, (x - TX0) / TDX)), j = Math.floor(f), w = f - j;
        const r = tR[j] + (tR[j + 1] - tR[j]) * w, dy = y - (tY[j] + (tY[j + 1] - tY[j]) * w);
        return (Math.hypot(z / r, dy / (dy < 0 ? 0.9 * r : r)) - 1) * r;
      };
      const surf = mouth.surface?.(GAPE, TILT);
      const bis = [0, 0, 0], e2 = [0, 0, 0], R = [0, 0, 0];
      /** The head's frame for the bisector at ELEV + om, and its skin's gaps to the rat at corner distance d. */
      const frame = (om) => {
        const el = ELEV + om;
        for (let i = 0; i < 3; i++) {
          bis[i] = h[i] * Math.cos(el) - bt.up[i] * Math.sin(el);
          e2[i] = bt.up[i] * Math.cos(el) + h[i] * Math.sin(el);
          D[i] = bis[i] * Math.cos(pb) - e2[i] * Math.sin(pb);
          N[i] = bis[i] * Math.sin(pb) + e2[i] * Math.cos(pb);
        }
        R[0] = D[1] * N[2] - D[2] * N[1];
        R[1] = D[2] * N[0] - D[0] * N[2];
        R[2] = D[0] * N[1] - D[1] * N[0];
      };
      // corner = centre − d·bis; head origin = corner − (vx·D + vy·N)
      const gaps = (d) => {
        const o = [0, 1, 2].map((i) => C[i] - d * bis[i] - vx * D[i] - vy * N[i]);
        let up = Infinity, lo = Infinity;
        const P = surf.pts;
        for (let k = 0; k < P.length; k += 3) {
          const x = P[k], y = P[k + 1], z = P[k + 2];
          const g = ratGap(o[0] + x * D[0] + y * N[0] + z * R[0], o[1] + x * D[1] + y * N[1] + z * R[1], o[2] + x * D[2] + y * N[2] + z * R[2]);
          if (k < surf.jawFrom) up = Math.min(up, g);
          else lo = Math.min(lo, g);
        }
        return [up, lo];
      };
      /** Corner distance at which the closer jaw just clears the fur by CLEAR. */
      const touch = () => {
        let d0 = 0, d1 = 20;
        for (let it = 0; it < 26; it++) {
          const dm = (d0 + d1) / 2, [up, lo] = gaps(dm);
          if (Math.min(up, lo) < CLEAR) d0 = dm;
          else d1 = dm;
        }
        return d1;
      };
      let dist = 4, om = 0;
      if (surf) {
        // turn the head in its plane until both jaws touch: palate and floor
        // of the mouth clear the fur by the same amount
        const unequal = (o) => {
          frame(o);
          const [up, lo] = gaps(touch());
          return up - lo;
        };
        let o0 = -0.6, o1 = 0.6;
        const f0 = unequal(o0), f1 = unequal(o1);
        if (f0 * f1 > 0) om = Math.abs(f0) < Math.abs(f1) ? o0 : o1;
        else {
          for (let it = 0; it < 22; it++) {
            om = (o0 + o1) / 2;
            if (unequal(om) * f0 > 0) o0 = om;
            else o1 = om;
          }
        }
      }
      frame(om);
      if (surf) dist = touch();
      // the snout tip lies a head length on from the head's origin, at the
      // spine's height (cY)
      for (let i = 0; i < 3; i++) B0[i] = -dist * bis[i] - vx * D[i] - vy * N[i] + cY * N[i] + Lh * D[i];
    }
    const placeHead = () => {
      const c = prey.bite.centre;
      for (let i = 0; i < 3; i++) P0[i] = B0[i] + c[i];
    };
    placeHead();
    // the side of the rat the neck leaves the head on (0 top, +π/2 near side)
    const thN = Math.atan2(P0[2] - D[2] * Lh - prey.bite.centre[2], P0[1] - D[1] * Lh - prey.bite.centre[1]);

    // ---- the loops, keyed by the angle travelled round the rat's axis from
    // the head (decreasing θ: down the far side, under, up the near side,
    // over the top) → x of the centre line. The first turn is laid out by
    // hand: it leaves the head's back, crosses the near side just behind the
    // rat's shoulder and comes back over the top. Every later point sits a
    // turn behind the one 360° before it, just clear of it (their two
    // half-widths), so the second loop presses against the first; on the
    // near side the loops run square across the rat. After two loops the
    // body leaves the coil going down the far side.
    const xs = prey.shoulderX;
    const b = 90 + thN / DEG; // degrees from the head's side to the far side
    const STEP = 20; // degrees per control point
    const PER_TURN = 360 / STEP;
    const END = Math.round((b + 720) / STEP) * STEP; // the far side, after two loops
    const FIRST = [[b, xs - 3.4], [b + 90, xs - 3.2], [b + 180, xs - 2.3], [b + 270, xs - 4.3], [360, xs - 4.3]];
    const nLoop = END / STEP;
    const nHead = 4, nTrail = 13;
    const ctrlCount = nHead + nLoop + nTrail;
    const ctrl = new Float32Array(ctrlCount * 3);
    const dense = new Float32Array(catmullRomCount(ctrlCount, { samples: 10 }) * 3);
    const line = new Polyline(dense.length / 3);
    const tmp = new Float32Array(3);
    const pos = spine.pos;
    // the rat's axis height along x, tabulated (the loops' axis follows it)
    const X0 = -prey.length, NX = 161, DX = (2 * prey.length) / (NX - 1);
    const axisTab = new Float32Array(NX);
    const tabulate = () => {
      for (let j = 0; j < NX; j++) {
        const x = X0 + j * DX;
        axisTab[j] = prey.spineYAt(x) + 0.05 * prey.radiusAt(x);
      }
    };
    const axisAt = (x) => {
      const f = Math.min(NX - 1.001, Math.max(0, (x - X0) / DX));
      const j = Math.floor(f);
      return axisTab[j] + (axisTab[j + 1] - axisTab[j]) * (f - j);
    };
    tabulate();
    // per loop control point (i = 1…nLoop): angle, x and the loop's radius,
    // fitted to the body's thickness at the arc length where it falls; the
    // neck eases off the head's back onto it
    const lDeg = new Float32Array(nLoop + 1), lX = new Float32Array(nLoop + 1), lR = new Float32Array(nLoop + 1);
    const lW = new Float32Array(nLoop + 1); // half-width of the body at each point
    let thBack = thN, rBack = 0;
    const ringR = (i) => (i ? rBack + (lR[i] - rBack) * sstep(0, 45, lDeg[i]) : rBack);
    const layout = () => {
      const f = Lh * 1.05;
      lX[0] = P0[0] - D[0] * f;
      const y = P0[1] - D[1] * f - axisAt(lX[0]), z = P0[2] - D[2] * f;
      thBack = Math.atan2(z, y);
      rBack = Math.hypot(y, z);
      lW[0] = Math.max(lW[0], m.spec.head.width * Lh * 0.5); // the head's back is its widest part
      for (let i = 1; i <= nLoop; i++) {
        const deg = (lDeg[i] = i * STEP);
        let x = Infinity;
        if (i < PER_TURN) {
          let k = 0;
          while (k < FIRST.length - 1 && deg > FIRST[k][0]) k++;
          const [d1, x1] = FIRST[k], [d0, x0] = k ? FIRST[k - 1] : [0, lX[0]];
          x = deg >= d1 ? x1 : x0 + (x1 - x0) * sstep(d0, d1, deg);
        }
        // clear of the turn before, at this angle and within 60° of it
        const th = thBack - deg * DEG, r = ringR(i);
        for (let j = i - PER_TURN - 3; j <= i - PER_TURN + 3; j++) {
          if (j < 0) continue;
          const thj = thBack - lDeg[j] * DEG, rj = ringR(j);
          const dyz = Math.hypot(r * Math.cos(th) - rj * Math.cos(thj), r * Math.sin(th) - rj * Math.sin(thj));
          const need = lW[i] + lW[j] + 0.2;
          if (dyz < need) x = Math.min(x, lX[j] - Math.sqrt(need * need - dyz * dyz));
        }
        lX[i] = x;
      }
    };
    lW.fill(m.rMax);
    layout();
    for (let i = 1; i <= nLoop; i++) lR[i] = prey.radiusAt(lX[i]) + hAt(Lh + i * 2.6) * bottom + 0.05;
    let helixS0 = 0, helixS1 = 0;

    function build(close, lift = 0) {
      let w = 0;
      const put = (x, y, z) => {
        ctrl[w++] = x; ctrl[w++] = y; ctrl[w++] = z;
      };
      // the head, straight from the snout tip back along −D a little past
      // its back (the head's frame is read off the first Lh of the spine)
      for (const f of [0, 0.5, 1, 1.05]) put(P0[0] - D[0] * f * Lh, P0[1] - D[1] * f * Lh, P0[2] - D[2] * f * Lh);
      // the loops; the neck lifts its belly off the rat as it leaves the head
      for (let i = 1; i <= nLoop; i++) {
        const k = sstep(40, 120, lDeg[i]);
        const r = rBack + (lR[i] - close * k - rBack) * sstep(0, 45, lDeg[i]);
        const th = thBack - lDeg[i] * DEG;
        put(lX[i], axisAt(lX[i]) + (lift - close) * k + r * Math.cos(th), r * Math.sin(th));
      }
      // out of the last loop: on down the far side to the paper, then round
      // behind the rat in a wide loop on the paper
      const xe = lX[nLoop], R0 = lR[nLoop], ye = axisAt(xe);
      const g = m.groundY[Math.round((K - 1) * 0.75)];
      put(xe - 1.5 * sc, ye - R0 * 0.45, -R0 * 1.08);
      put(xe - 4 * sc, g + R0 * 0.12, -R0 * 1.4);
      put(xe - 9 * sc, g, -R0 * 1.95);
      put(xe - 20 * sc, g, -R0 * 2.6);
      put(xe - 33 * sc, g, -R0 * 2.3);
      put(xe - 43 * sc, g, -R0 * 0.8);
      put(xe - 45 * sc, g, R0 * 1.6);
      put(xe - 38 * sc, g, R0 * 3.6);
      put(xe - 24 * sc, g, R0 * 4.5);
      put(xe - 8 * sc, g, R0 * 4.7);
      put(xe + 8 * sc, g, R0 * 4.4);
      put(xe + 22 * sc, g, R0 * 3.5);
      put(xe + 32 * sc, g, R0 * 2.4);
      catmullRom(ctrl, { samples: 10, out: dense });
      line.set(dense, dense.length / 3, false);
      helixS0 = line.cum[nHead * 10];
      helixS1 = line.cum[(nHead + nLoop - 1) * 10];
    }

    // fit: the loop radii from the body's thickness where they fall (the arc
    // lengths barely move once set), then the rat's height, so that the
    // lowest loop's back rests on the paper
    const fit = () => {
      for (let pass = 0; pass < 3; pass++) {
        build(0);
        lW[0] = hAt(line.cum[(nHead - 1) * 10]) * m.sec.width;
        for (let i = 1; i <= nLoop; i++) lW[i] = hAt(line.cum[(nHead - 1 + i) * 10]) * m.sec.width;
        layout();
        for (let i = 1; i <= nLoop; i++) lR[i] = prey.radiusAt(lX[i]) + hAt(line.cum[(nHead - 1 + i) * 10]) * bottom + 0.05;
      }
      build(0);
      let low = Infinity;
      for (let j = nHead * 10; j <= (nHead + nLoop - 1) * 10; j++) {
        const x = dense[j * 3], y = dense[j * 3 + 1], z = dense[j * 3 + 2];
        const dy = y - axisAt(x), c = dy / (Math.hypot(dy, z) || 1);
        const h = hAt(line.cum[j]);
        const y0 = y - (c >= 0 ? h * bottom * c : -h * top * c);
        if (y0 < low) {
          low = y0;
          hLow = h;
        }
      }
      return low;
    };
    let hLow = m.rMax; // the body's thickness where the lowest loop rests
    const low = fit();
    if (prey.setAxisY && Math.abs(low) > 1e-3) {
      prey.setAxisY(prey.axisY - low);
      tabulate();
      placeHead();
      fit();
    }
    const kHead = Math.max(2, Math.round(Lh / ds));

    return {
      beats: m.spec.kind === 'boa'
        ? [
          { t: 0, text: 'Two loops wrap the rat’s chest and belly; the jaws hold on.' },
          { t: 0.7, text: 'The coils tighten, cutting off blood flow — not suffocation.' },
          { t: 2.1, text: 'Boas feel the rat’s heartbeat and keep squeezing until it stops.' },
          { t: 3.3, text: 'The coils relax and re-grip. No venom is involved.' },
        ]
        : [
          { t: 0, text: 'Coils wrapped around the prey.' },
          { t: 0.7, text: 'The coils tighten.' },
          { t: 3.3, text: 'The coils relax and re-grip.' },
        ],
      evaluate(t, out) {
        const tight = keys(t, [[0, 0], [0.6, 0], [1.5, 1], [2.7, 1], [3.8, 0], [5, 0]]);
        // the loops close round the rat and their muscle bunches; the coil
        // drops by as much as it closes, less its swelling, so the lowest
        // loop stays on the paper
        const close = 0.45 * tight, swell = 0.05 * tight;
        build(close, swell * hLow);
        for (let k = 0; k < K; k++) {
          const s = spine.s[k];
          line.sample(s, tmp, 0);
          // the trailing body rests on the paper at its own belly height
          const onGround = sstep(helixS1 + m.rMax * 2, helixS1 + m.rMax * 6, s);
          let y = tmp[1] + (m.groundY[k] - tmp[1]) * onGround;
          if (s > helixS1) y = Math.max(y, m.groundY[k]);
          pos[k * 3] = tmp[0];
          pos[k * 3 + 1] = y;
          pos[k * 3 + 2] = tmp[2];
          // belly towards the rat in the loops, the head's crown away from
          // its neck, down on the paper elsewhere
          const inCoil = sstep(helixS0 - 4, helixS0 + 2, s) * (1 - sstep(helixS1 - 2, helixS1 + 6, s));
          const onHead = 1 - sstep(kHead * ds + 2, kHead * ds + 12, s);
          const dy = y - axisAt(tmp[0]), dz = tmp[2];
          const dl = Math.hypot(dy, dz) || 1;
          const ux = 0, uy = inCoil * (dy / dl) + (1 - inCoil), uz = inCoil * (dz / dl);
          spine.upTarget[k * 3] = ux + (N[0] - ux) * onHead;
          spine.upTarget[k * 3 + 1] = uy + (N[1] - uy) * onHead;
          spine.upTarget[k * 3 + 2] = uz + (N[2] - uz) * onHead;
          spine.upWeight[k] = Math.max(0.35 + inCoil * 0.6, onHead);
          out.radius[k] = 1 + swell * inCoil;
        }
        // the rat's chest flattens as far as the top of the loops comes down
        out.prey = 1 - (2 * close - swell * hLow * (1 - bottom)) / (1.9 * prey.radius);
        const h = out.head;
        h.tongue = 0;
        h.flick = 0;
        h.spread = 0.3;
        h.gape = GAPE; // the bite is held throughout
        h.fang = 0;
        h.tilt = TILT;
        out.shake = 0;
      },
    };
  },

  // ------------------------------------------------------------ branch (prehensile)
  branch(m) {
    const { K, L, spine } = m;
    const br = m.branch; // { y, radius }
    const Yb = br.y, rb = br.radius;
    const line = new Polyline(2048);
    const tmp = new Float32Array(3);
    const pos = spine.pos;
    const hb = m.h0[Math.round((K - 1) * 0.45)];
    const nCtrl = 40;
    const ctrl = new Float32Array(nCtrl * 3);
    const dense = new Float32Array(catmullRomCount(nCtrl, { samples: 10 }) * 3);
    let wrapA0 = 0, wrapA1 = 0, wrapB0 = 0;
    /**
     * Raised S-neck with the head towards the reader → down onto the branch
     * → one loose loop around it (sagging under its own weight) → along the
     * top → the prehensile tail in a tight helix. Head sway rotates the first
     * control points about the head's vertical axis.
     */
    function build(yaw, nod) {
      let w = 0;
      const put = (x, y, z) => {
        ctrl[w++] = x; ctrl[w++] = y; ctrl[w++] = z;
      };
      const top = Yb + rb + hb * m.sec.bottom;
      const hx = L * 0.02, hz = L * 0.1;
      const hy = top + L * 0.085 + nod;
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const putRot = (x, y, z) => put(hx + (x - hx) * cy - (z - hz) * sy, y, hz + (x - hx) * sy + (z - hz) * cy);
      putRot(hx, hy - m.headLen * 0.12, hz + m.headLen * 0.95);
      putRot(hx, hy, hz);
      putRot(hx - L * 0.02, hy - L * 0.012, hz - L * 0.05);
      put(hx + L * 0.03, top + L * 0.05, hz - L * 0.1);
      put(hx - L * 0.01, top + L * 0.015, L * 0.01);
      put(hx - L * 0.07, top, 0);
      // loose loop around the branch: down the near side, under, up the far side
      const Rl = rb + hb * 1.9, sag = hb * 1.2;
      const lx0 = hx - L * 0.12;
      for (let i = 0; i <= 8; i++) {
        const th = (i / 8) * TAU;
        put(lx0 - (L * 0.05 * i) / 8, Yb - sag * Math.sin(th / 2) ** 2 + Rl * Math.cos(th), Rl * Math.sin(th));
      }
      // along the top to the tail
      put(lx0 - L * 0.085, top, 0);
      // prehensile tail: a tight helix around the branch
      const Rt = rb + m.halfW[K - 12] * 0.95;
      const tx0 = lx0 - L * 0.12;
      for (let i = 0; i <= 18; i++) {
        const th = (i / 8) * TAU;
        put(tx0 - (L * 0.035 * i) / 8, Yb + Rt * Math.cos(th), Rt * Math.sin(th));
      }
      // spare length beyond the tail tip (never reached, keeps the end tangent)
      while (w < nCtrl * 3) put(ctrl[w - 3] - 0.5, ctrl[w - 2], ctrl[w - 1]);
      catmullRom(ctrl, { samples: 10, out: dense });
      line.set(dense, dense.length / 3, false);
      wrapA0 = line.cum[6 * 10];
      wrapA1 = line.cum[14 * 10];
      wrapB0 = line.cum[16 * 10];
    }
    return {
      beats: [
        { t: 0, text: `Anchored by its tail, the ${name(m)} waits in ambush.` },
        { t: 1.0, text: 'The head sways slowly, tracking movement.' },
        { t: 2.3, text: 'Tongue flicks sample the air for scent.' },
        {
          t: 3.6,
          text: m.spec.id === 'bothriechis-schlegelii'
            ? 'Golden, green or mottled: the eyelash viper is famously variable in colour.'
            : 'The tail grip frees the front of the body to strike.',
        },
      ],
      evaluate(t, out) {
        const yaw = 0.2 * Math.sin((TAU * t) / 5);
        const nod = L * 0.006 * Math.sin((TAU * 2 * t) / 5 + 0.4);
        build(yaw, nod);
        for (let k = 0; k < K; k++) {
          const s = spine.s[k];
          line.sample(s, tmp, 0);
          pos[k * 3] = tmp[0];
          pos[k * 3 + 1] = tmp[1];
          pos[k * 3 + 2] = tmp[2];
          // belly against the branch inside the wraps
          const wrap = Math.max(
            sstep(wrapA0 - 1, wrapA0 + 2, s) * (1 - sstep(wrapA1 - 2, wrapA1 + 1, s)),
            sstep(wrapB0 - 1, wrapB0 + 2, s)
          );
          const dy = tmp[1] - Yb, dz = tmp[2];
          const dl = Math.hypot(dy, dz) || 1;
          spine.upTarget[k * 3] = 0;
          spine.upTarget[k * 3 + 1] = wrap * (dy / dl) + (1 - wrap);
          spine.upTarget[k * 3 + 2] = wrap * (dz / dl);
          spine.upWeight[k] = 0.3 + wrap * 0.65;
        }
        const h = out.head;
        tongueBouts(t, [[0.45, 0.5], [2.35, 0.7], [4.2, 0.4]], h);
        h.gape = 0;
        h.fang = 0;
        h.tilt = -0.05 + 0.04 * Math.sin((TAU * 2 * t) / 5 + 0.4);
        out.shake = 0;
      },
    };
  },

  // ------------------------------------------------------------ follow-path
  //
  // The body glides along the caller's path, its back towards `params.up`
  // (world up by default) — or, when `params.ups` gives a dorsal direction
  // for every path point (the outward normals of the surface it crawls on),
  // towards the direction at its own place on the path. The roll is then a
  // property of the path: every point of the body takes the same roll as it
  // passes the same place, the belly stays on the surface all the way round,
  // and the lateral waves run across that surface instead of the horizontal.
  'follow-path'(m, params) {
    const { K, L, spine } = m;
    const pts = (params.path ?? []).flat();
    if (pts.length < 6) throw new Error('follow-path needs params.path with at least two [x,y,z] points');
    const closed = params.closed !== false;
    const dense = catmullRom(Float32Array.from(pts), { closed, samples: 16 });
    let track = new Polyline(dense.length / 3).set(dense, dense.length / 3, closed);
    // one dorsal direction per track point: the same spline through the ups
    // with uniform knots puts its sample j at the same fraction of the same
    // segment as the track's; smoothed over three body radii each way, so a
    // crease in the surface (an orbit's rim) rolls the body over a stretch
    let dirs = null;
    if (params.ups) {
      if (params.ups.length !== params.path.length) throw new Error('follow-path: params.ups needs one [x,y,z] per path point');
      const unit = params.ups.flatMap(([x, y, z]) => [x, y, z].map((v) => v / (Math.hypot(x, y, z) || 1)));
      const raw = catmullRom(Float32Array.from(unit), { closed, samples: 16, alpha: 0 });
      dirs = smoothDirs(track, raw, m.rMax * 3);
    }
    const wave = params.wave ?? 0;
    if (wave > 0) {
      const waves = params.waves ?? Math.max(1, Math.round(track.length / (L * 0.38)));
      if (closed) {
        const wavyDirs = dirs && new Float32Array(720 * 3);
        track = addWaves(track, waves, wave, 720, dirs, wavyDirs);
        dirs = wavyDirs;
      }
    }
    const P = track.length;
    const loops = Math.max(1, Math.round(params.loops ?? 1));
    const up = params.up ?? [0, 1, 0];
    const tmp = new Float32Array(3);
    const pos = spine.pos;
    return {
      beats: [{ t: 0, text: 'Lateral undulation along the path.' }],
      evaluate(t, out) {
        let head;
        if (closed) {
          head = P * loops * (t / 5);
        } else {
          // open path: glide out along it and withdraw again (smooth, seamless)
          const u = 0.5 - 0.5 * Math.cos((TAU * t) / 5);
          head = Math.min(L, P) + u * Math.max(0, P - Math.min(L, P));
        }
        for (let k = 0; k < K; k++) {
          const s = head - spine.s[k];
          track.sample(s, tmp, 0);
          pos[k * 3] = tmp[0];
          pos[k * 3 + 1] = tmp[1];
          pos[k * 3 + 2] = tmp[2];
          if (dirs) dirAt(track, dirs, s, spine.upTarget, k * 3);
        }
        if (dirs) spine.upWeight.fill(0.6);
        else spine.resetUp(up[0], up[1], up[2], 0.4);
        const h = out.head;
        tongueBouts(t, [[0.4, 0.5], [2.9, 0.5]], h);
        h.gape = 0;
        h.fang = 0;
        h.tilt = 0;
        out.shake = 0;
      },
    };
  },
};

/** Closed loop (ellipse) with `waves` lateral sine waves — a slither track. */
function buildWavyLoop(a, b, waves, amp, n) {
  const ell = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const th = (i / n) * TAU;
    ell[i * 3] = a * Math.cos(th);
    ell[i * 3 + 2] = b * Math.sin(th);
  }
  const base = new Polyline(n).set(ell, n, true);
  return addWaves(base, waves, amp, n);
}

/**
 * Offset a closed track sideways by `amp` · sin(waves · 2π · u) (u = arc
 * fraction): across the horizontal, or, given the track's dorsal directions
 * (`dirs`, one per point of `base`), across the surface they stand on, the
 * resampled track's own directions written to `dirsOut`.
 */
function addWaves(base, waves, amp, n = 720, dirs = null, dirsOut = null) {
  const uni = new Float32Array(n * 3);
  const tan = new Float32Array(3);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const s = (i / n) * base.length;
    base.sample(s, uni, i * 3, tan, 0);
    let nx = -tan[2], ny = 0, nz = tan[0];
    if (dirs) {
      // tangent × dorsal: sideways on the surface, at full amplitude
      dirAt(base, dirs, s, dirsOut, i * 3);
      const ux = dirsOut[i * 3], uy = dirsOut[i * 3 + 1], uz = dirsOut[i * 3 + 2];
      nx = tan[1] * uz - tan[2] * uy;
      ny = tan[2] * ux - tan[0] * uz;
      nz = tan[0] * uy - tan[1] * ux;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
    }
    const o = amp * Math.sin(TAU * waves * (i / n));
    out[i * 3] = uni[i * 3] + nx * o;
    out[i * 3 + 1] = uni[i * 3 + 1] + ny * o;
    out[i * 3 + 2] = uni[i * 3 + 2] + nz * o;
  }
  return new Polyline(n).set(out, n, true);
}

/**
 * Unit direction at arc length `s` along `line`, from one direction per point
 * of the line (`dirs`, flat xyz), interpolated as Polyline.sample interpolates
 * the points: closed lines wrap, open ones keep their end directions.
 */
function dirAt(line, dirs, s, out, o) {
  const { n, cum, length } = line;
  s = line.closed ? ((s % length) + length) % length : Math.min(length, Math.max(0, s));
  let lo = 0, hi = line.closed ? n : n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= s) lo = mid;
    else hi = mid;
  }
  const a = lo * 3, b = ((lo + 1) % n) * 3;
  const seg = cum[lo + 1] - cum[lo];
  const f = seg > 1e-6 ? (s - cum[lo]) / seg : 0;
  const x = dirs[a] + (dirs[b] - dirs[a]) * f;
  const y = dirs[a + 1] + (dirs[b + 1] - dirs[a + 1]) * f;
  const z = dirs[a + 2] + (dirs[b + 2] - dirs[a + 2]) * f;
  const l = Math.hypot(x, y, z) || 1;
  out[o] = x / l;
  out[o + 1] = y / l;
  out[o + 2] = z / l;
}

/** Directions (one per point of `line`) averaged along it over ±r cm with tent weights, normalised. */
function smoothDirs(line, dirs, r) {
  const { n, cum, closed } = line;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x = dirs[i * 3], y = dirs[i * 3 + 1], z = dirs[i * 3 + 2];
    for (const step of [1, -1]) {
      let j = i, d = 0;
      for (let k = 1; k < n; k++) {
        const jn = j + step;
        if (!closed && (jn < 0 || jn >= n)) break;
        const jw = (jn + n) % n;
        d += step > 0 ? cum[j + 1] - cum[j] : cum[jw + 1] - cum[jw];
        if (d >= r) break;
        const w = 1 - d / r;
        x += dirs[jw * 3] * w;
        y += dirs[jw * 3 + 1] * w;
        z += dirs[jw * 3 + 2] * w;
        j = jw;
      }
    }
    const l = Math.hypot(x, y, z) || 1;
    out[i * 3] = x / l;
    out[i * 3 + 1] = y / l;
    out[i * 3 + 2] = z / l;
  }
  return out;
}
