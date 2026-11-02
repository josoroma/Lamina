// Audio: procedural paper sounds with WebAudio — no sound files.
//
// Why procedural: a page turn is band-passed air noise with a quick attack
// and an airy tail, and a landing is a soft, low, very short tap. Building
// them from one shared pink-noise buffer keeps the download at zero bytes,
// lets every turn vary slightly (no machine-gun repetition) and lets speed
// shape the sound (a fast flick is brighter and shorter than a slow turn).
// Everything is quiet by design; the AudioContext is created lazily on the
// first user gesture (browsers block audio before that).

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/**
 * @param {{ volume?: number, enabled?: boolean }} [o]  volume 0..1 (default 0.55)
 * @returns {{
 *   readonly enabled: boolean, setEnabled: (on: boolean) => void, unlock: () => void,
 *   turn: (speed?: number, o?: { board?: boolean, dir?: number }) => void,
 *   land: (speed?: number, o?: { board?: boolean }) => void,
 *   riffle: (n: number, o?: { dir?: number, duration?: number }) => void,
 *   tap: () => void, dispose: () => void }}
 */
export function createAudio({ volume = 0.55, enabled = true } = {}) {
  let ctx = null;
  let master = null;
  let noise = null;
  let on = enabled;
  let seed = 1;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const level = () => 0.32 * clamp(volume, 0, 1);

  function ensure() {
    if (ctx) return ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = on ? level() : 0;
    const soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 9000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 3;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    master.connect(soften).connect(comp).connect(ctx.destination);
    noise = pinkNoise(ctx, 2.5);
    return ctx;
  }

  /** A context that can play right now (created and running, sound on). */
  function live() {
    if (!on || !ctx) return null;
    if (ctx.state !== 'running') {
      ctx.resume?.().catch(() => {});
      return null;
    }
    return ctx;
  }

  function noiseSource(c, rate = 1) {
    const src = c.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = rate;
    return src;
  }

  /** Band-passed noise burst with an attack/decay envelope, panned. */
  function burst(c, t0, { f0, f1 = f0, f2 = f1, q = 0.8, attack = 0.01, peakAt = 0.3, dur, gain, pan0 = 0, pan1 = pan0, hp = 200, rate = 1 }) {
    const src = noiseSource(c, rate);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t0);
    bp.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur * peakAt);
    bp.frequency.exponentialRampToValueAtTime(Math.max(40, f2), t0 + dur);
    const hpf = c.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = hp;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
    g.gain.setTargetAtTime(0.0001, t0 + attack + dur * 0.12, dur * 0.3);
    let out = g;
    if (c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.setValueAtTime(clamp(pan0, -1, 1), t0);
      p.pan.linearRampToValueAtTime(clamp(pan1, -1, 1), t0 + dur);
      g.connect(p);
      out = p;
    }
    src.connect(bp).connect(hpf).connect(g);
    out.connect(master);
    const offset = rand() * (noise.duration - dur - 0.4);
    src.start(t0, Math.max(0, offset));
    src.stop(t0 + dur * 1.8 + 0.1);
  }

  /** Short sine thump (landing body). */
  function thump(c, t0, { freq = 120, gain = 0.1, decay = 0.05 }) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.4, t0);
    o.frequency.exponentialRampToValueAtTime(freq, t0 + 0.03);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay * 3);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + decay * 3 + 0.05);
  }

  const api = {
    get enabled() {
      return on;
    },
    /** Turn sound on/off (fades, never clicks). */
    setEnabled(v) {
      on = !!v;
      if (ctx && master) master.gain.setTargetAtTime(on ? level() : 0, ctx.currentTime, 0.04);
    },
    /** Create/resume the AudioContext — call from a user gesture (pointerdown / keydown). */
    unlock() {
      if (!ensure()) return;
      if (ctx.state !== 'running') ctx.resume?.().catch(() => {});
    },
    /**
     * Page swoosh: an airy band of noise sweeping up and back down, panned
     * across the spread in the turning direction.
     * @param {number} [speed=1]  1 = a 0.9 s turn; >1 brighter and shorter
     * @param {{ board?: boolean, dir?: number }} [o]  board: heavier, lower cover sound
     */
    turn(speed = 1, { board = false, dir = 1 } = {}) {
      const c = live();
      if (!c) return;
      const s = clamp(speed, 0.4, 3);
      const t0 = c.currentTime + 0.004;
      const dur = clamp(0.62 / Math.sqrt(s), 0.28, 1.0);
      const f = (board ? 0.55 : 1) * (0.9 + 0.2 * rand()) * Math.sqrt(s);
      const g = (board ? 0.42 : 0.5) * (0.85 + 0.3 * rand());
      burst(c, t0, { f0: 650 * f, f1: 2500 * f, f2: 850 * f, q: 0.7, attack: 0.025, peakAt: 0.33, dur, gain: g, pan0: 0.35 * dir, pan1: -0.35 * dir, hp: board ? 140 : 260 });
      // crisp paper grain riding on the swoosh
      burst(c, t0 + 0.02, { f0: 5200 * f, f1: 6400 * f, f2: 4200 * f, q: 1.1, attack: 0.012, dur: dur * 0.45, gain: g * 0.22, pan0: 0.25 * dir, pan1: -0.1 * dir, hp: 3500, rate: 1.2 });
    },
    /** The quiet landing of a leaf on its stack (boards land with more body). */
    land(speed = 1, { board = false } = {}) {
      const c = live();
      if (!c) return;
      const t0 = c.currentTime + 0.002;
      const g = (board ? 0.5 : 0.28) * clamp(0.7 + 0.3 * speed, 0.5, 1.2);
      burst(c, t0, { f0: board ? 520 : 900, f1: board ? 380 : 700, q: 0.9, attack: 0.003, peakAt: 0.4, dur: board ? 0.09 : 0.06, gain: g, hp: 90 });
      thump(c, t0, { freq: board ? 78 : 125, gain: board ? 0.16 : 0.07, decay: board ? 0.06 : 0.035 });
    },
    /**
     * A riffle of `n` leaves: a run of small flutters on top of a soft swoosh.
     * @param {number} n
     * @param {{ dir?: number, duration?: number }} [o]  duration: total riffle time (s)
     */
    riffle(n = 6, { dir = 1, duration } = {}) {
      const c = live();
      if (!c) return;
      const count = clamp(Math.round(n), 2, 28);
      const total = clamp(duration ?? count * 0.065 + 0.5, 0.4, 2.4);
      const gap = Math.max(0.03, (total - 0.45) / count);
      const t0 = c.currentTime + 0.004;
      burst(c, t0, { f0: 800, f1: 2200, f2: 900, q: 0.6, attack: 0.05, peakAt: 0.3, dur: total, gain: 0.22, pan0: 0.4 * dir, pan1: -0.4 * dir, hp: 240 });
      for (let k = 0; k < count; k++) {
        const t = t0 + 0.05 + k * gap * (0.85 + 0.3 * rand());
        const f = 2300 + 1500 * rand();
        const pan = (0.45 - (0.9 * k) / Math.max(1, count - 1)) * dir;
        burst(c, t, { f0: f, f1: f * 1.15, f2: f * 0.8, q: 1.4, attack: 0.004, peakAt: 0.3, dur: 0.05 + 0.02 * rand(), gain: 0.16 * (0.7 + 0.3 * rand()), pan0: pan, hp: 1200 });
      }
    },
    /** A soft UI tick (buttons, toggles). */
    tap() {
      const c = live();
      if (!c) return;
      const t0 = c.currentTime + 0.002;
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(1500, t0);
      o.frequency.exponentialRampToValueAtTime(1100, t0 + 0.04);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
      o.connect(g).connect(master);
      o.start(t0);
      o.stop(t0 + 0.09);
      burst(c, t0, { f0: 4200, q: 1.2, attack: 0.002, dur: 0.018, gain: 0.05, hp: 2500 });
    },
    dispose() {
      ctx?.close?.().catch(() => {});
      ctx = null;
      master = null;
      noise = null;
    },
  };
  return api;
}

/**
 * Wire a Book's events to page sounds: swoosh on each turn (drags sound on
 * release), a soft landing tap, and one riffle sound for multi-leaf jumps.
 * Use this instead of calling audio.turn()/riffle() by hand.
 * @returns {() => void} unsubscribe
 */
export function connectBookAudio(book, audio) {
  const offs = [
    book.on('turnstart', (e) => {
      if (e.riffle || e.drag || e.retarget) return;
      audio.turn(e.speed ?? 1, { board: e.board, dir: e.target > 0.5 ? 1 : -1 });
    }),
    book.on('release', (e) => {
      audio.turn(clamp(0.8 + e.speed * 0.25, 0.7, 2), { dir: e.target > 0.5 ? 1 : -1 });
    }),
    book.on('turnend', (e) => {
      if (!e.riffle) audio.land(1, { board: e.board });
    }),
    book.on('riffle', (e) => audio.riffle(e.count, { dir: e.dir, duration: e.duration })),
  ];
  return () => offs.forEach((off) => off());
}

/** Pink-ish noise (Paul Kellet's filter) — softer and more papery than white noise. */
function pinkNoise(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  let s = 12345;
  for (let i = 0; i < len; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const w = (s / 0x7fffffff) * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}
