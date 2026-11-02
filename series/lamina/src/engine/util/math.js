// Small numeric helpers shared by the engine.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const smootherstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** Frame-rate independent exponential smoothing towards `to`. */
export const damp = (from, to, lambda, dt) => lerp(from, to, 1 - Math.exp(-lambda * dt));

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t, s = 1.4) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const easeOutElastic = (t) =>
  t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

/** Seamless loop helpers: phase in [0,1) for loop time t of a `period`. */
export const loopPhase = (t, period = 5) => (((t % period) + period) % period) / period;
/** Periodic smooth pulse centred at `c` (phase units) with half-width `w`, wraps around 1. */
export const loopPulse = (phase, c, w) => {
  let d = Math.abs(phase - c);
  d = Math.min(d, 1 - d);
  return smoothstep(w, 0, d);
};

/** Critically damped spring (x, v) towards target; returns [x, v]. */
export function spring(x, v, target, omega, dt) {
  const f = 1 + 2 * dt * omega;
  const oo = omega * omega;
  const hoo = dt * oo;
  const hhoo = dt * hoo;
  const detInv = 1 / (f + hhoo);
  const detX = f * x + dt * v + hhoo * target;
  const detV = v + hoo * (target - x);
  return [detX * detInv, detV * detInv];
}
