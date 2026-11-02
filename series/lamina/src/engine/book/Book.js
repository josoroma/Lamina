// The 3D book: cloth boards on a hinge, two page blocks with a real gutter,
// and deformable leaves that lift, twist and settle as they turn.
//
// Why it is built this way:
//  - Leaf heights are static per leaf (leaf i always has the same leaves
//    beneath it on either side), so stacks never "jump" and nothing pokes
//    through the top leaf. Only the top-most resting leaf of each side and
//    the leaves in flight are drawn; the rest of each stack is a single
//    striated block mesh sized from the resting leaves.
//  - Boards press the block flat while the book is closed; as a cover opens
//    the leaves relax into the gutter (the gutter amount follows the board).
//  - Every leaf has an explicit lifecycle: rest → auto (scripted turn) /
//    drag (follows the pointer) → spring (release, fling, reversal) → rest.
//    Several leaves can fly at once (riffles), and a leaf can be caught or
//    reversed mid-air.
//
// Leaves: leaves[0] is the front board, leaves[n-1] the back board, the rest
// are paper. `opened` = number of leaves whose destination is the left. The
// visible spread is (leaves[opened-1].back, leaves[opened].front).
import * as THREE from 'three/webgpu';
import { WORLD } from '../stage.js';
import { CurlGrid, autoCurl, turnCurve, createCurlState } from './pageCurl.js';
import {
  createLeafMaterial, createClothMaterial, createEndpaperMaterial,
  createPageEdgeMaterial, createBoardEdgeMaterial, createHeadbandMaterial,
} from './paper.js';
import { leafGridGeometry, boardSlabGeometry, PageBlock, SpineStrip } from './geometry.js';
import { clamp, smoothstep, lerp } from '../util/math.js';

const COLS = 50;
const ROWS = 24;
export const LEAF_T = 0.0045; // plate-paper leaf thickness (page widths; ≈0.7 mm on a 15 cm page)
export const BOARD_T = WORLD.boardThickness;
const PINCH = BOARD_T + 0.5 * LEAF_T; // where all leaves meet at the bottom of the gutter
const DEFAULT_CORNER = -0.3; // auto turns lead slightly with the head corner (reads well from the front)
const HEADBAND_R = 0.0028;
const HEADBAND_LEN0 = 0.02;

/** Small deterministic hash in [0, 1) (riffle variation without Math.random). */
const hash01 = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export class Book extends THREE.Group {
  /**
   * @param {object} o
   * @param {number} o.leafCount  total leaves incl. both boards (>= 3)
   * @param {object} [o.theme]    { paper, cloth, edge, foil, headband: [c1, c2] | c1, endpaper: { ground } }
   * @param {boolean} [o.reducedMotion]  click / key / jump turns are instant cuts (defaults to the
   *        OS setting); drags still follow the pointer
   */
  constructor({ leafCount, theme = {}, reducedMotion }) {
    super();
    if (!(leafCount >= 3)) throw new Error('Book needs at least 3 leaves (two boards and one paper leaf)');
    this.name = 'book';
    this.isBook = true;
    this.theme = {
      paper: '#fbf8f1',
      cloth: '#23412f',
      edge: '#f2ede1',
      foil: '#c9a44c',
      headband: ['#9e2b25', '#efe7d6'],
      ...theme,
    };
    this.W = WORLD.pageW;
    this.H = WORLD.pageH;
    this.ov = WORLD.coverOverhang;
    this.Wb = this.W + this.ov;
    this.Hb = this.H + 2 * this.ov;
    this.leaves = [];
    this.listeners = new Map();
    this.reducedMotion = reducedMotion ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    /** Seconds for a single click/key turn (with reduced motion goTo cuts instead, unless given a duration). */
    this.turnDuration = this.reducedMotion ? 0.45 : 0.9;
    /** Hide pop-up figure anchors of covered leaves / closing spreads (see updateMatrixWorld). */
    this.guardFigures = true;
    /** How much of the book lies on each side (0..1, smooth): drives camera framing. */
    this.presence = { left: 0, right: 1 };
    /** What actually rests on each side (0..1, only near landing): drives the contact shadow. */
    this.footprint = { left: 0, right: 1 };
    this.opened = 0;
    this._queue = [];
    this._drag = null;
    this._grid = new CurlGrid(COLS, ROWS, this.W, this.H);
    this._gR = 0;
    this._gL = 1;
    this._topR = 0;
    this._topL = -1;
    this._structureDirty = true;
    this._blocksDirty = true;
    this._boardsDirty = true;
    this._pickList = [];
    this._hits = [];
    this._n = new THREE.Vector3();

    for (let i = 0; i < leafCount; i++) {
      const board = i === 0 || i === leafCount - 1;
      this.leaves.push(this._makeLeaf(i, board));
    }

    // page blocks
    this._edgeMat = createPageEdgeMaterial({ paper: this.theme.edge });
    this.blocks = {};
    for (const [key, side] of [['right', 1], ['left', -1]]) {
      const block = new PageBlock(side, this.W, this.H);
      const mesh = new THREE.Mesh(block.geometry, this._edgeMat);
      mesh.name = `page-block-${key}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.block = block;
      this.blocks[key] = mesh;
      this.add(mesh);
    }

    // spine cloth joining the boards, and the headbands
    this._spineStrip = new SpineStrip(this.Hb);
    this._spineMat = createBoardEdgeMaterial(this.theme.cloth);
    this._spineMat.side = THREE.DoubleSide;
    this.spine = new THREE.Mesh(this._spineStrip.geometry, this._spineMat);
    this.spine.name = 'spine';
    this.spine.castShadow = true;
    this.spine.receiveShadow = true;
    this.add(this.spine);
    this._headbandGeo = new THREE.CapsuleGeometry(HEADBAND_R, HEADBAND_LEN0, 4, 10);
    const hb = this.theme.headband;
    const hbColors = Array.isArray(hb) ? hb : [hb ?? '#9e2b25', '#efe7d6'];
    this._headbandMat = createHeadbandMaterial({ colors: hbColors });
    this.headbands = [-1, 1].map((zs) => {
      const m = new THREE.Mesh(this._headbandGeo, this._headbandMat);
      m.name = zs < 0 ? 'headband' : 'tailband';
      m.userData.zs = zs;
      m.castShadow = true;
      this.add(m);
      return m;
    });

    this.setOpened(0);
  }

  // ---------------------------------------------------------------- events
  /** Subscribe: 'change' | 'turnstart' | 'turnend' | 'riffle' | 'release'. Returns an unsubscribe fn. */
  on(name, fn) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(fn);
    return () => this.listeners.get(name)?.delete(fn);
  }
  emit(name, payload) {
    this.listeners.get(name)?.forEach((fn) => fn(payload));
  }

  get leafCount() {
    return this.leaves.length;
  }
  get paperCount() {
    return this.leaves.length - 2;
  }
  /** Index of the leaf whose front is the visible right-hand page (−1 when closed at the back). */
  get rightLeaf() {
    return this.opened < this.leaves.length ? this.opened : -1;
  }
  get leftLeaf() {
    return this.opened - 1;
  }
  get isClosedFront() {
    return this.opened === 0;
  }
  get isClosedBack() {
    return this.opened === this.leaves.length;
  }
  /** True while any leaf is in flight or a riffle is pending. */
  get busy() {
    if (this._queue.length) return true;
    for (let i = 0; i < this.leaves.length; i++) if (this.leaves[i].phys === 'F') return true;
    return false;
  }
  get dragging() {
    return !!this._drag;
  }

  // ---------------------------------------------------------------- textures
  /**
   * Assign page-side textures. side: 'front' | 'back'.
   * Front board: front = cover art (board aspect), back = front endpaper (page aspect).
   * Back board: front = back endpaper, back = back-cover art.
   */
  setLeafTexture(i, side, tex) {
    const leaf = this.leaves[i];
    if (!leaf || !tex) return;
    if (typeof tex.anisotropy === 'number' && tex.anisotropy < 8) tex.anisotropy = 8;
    if (!leaf.board) {
      const n = side === 'front' ? leaf.mat.userData.frontNode : leaf.mat.userData.backNode;
      n.value = tex;
      return;
    }
    const outsideSide = i === 0 ? 'front' : 'back';
    if (side === outsideSide) leaf.outsideMat.userData.artNode.value = tex;
    else leaf.insideMat.userData.endNode.value = tex;
  }

  // ---------------------------------------------------------------- build
  _makeLeaf(index, board) {
    const leaf = {
      index,
      board,
      W: board ? this.Wb : this.W,
      H: board ? this.Hb : this.H,
      st: createCurlState(),
      phys: 'R', // physical state: 'R' resting right, 'L' resting left, 'F' in flight
      dest: 0, // logical destination: 0 right, 1 left
      mode: 'rest', // rest | auto | spring | drag | frozen
      from: 0,
      target: 0,
      t: 0,
      dur: this.turnDuration,
      vel: 0,
      velEst: 0,
      omega: 11,
      corner: 0,
      amp: 1,
      riffle: false,
      queued: false,
      grabS: 0,
      grabZ: 0,
      dragP: 0,
      dragOffset: 0,
      dragTwist: 0,
      dragVel: 0,
      dragT: 0,
      dragLastP: 0,
      dragFrom: 0,
      dirty: true,
    };
    const t = this.theme;
    if (board) {
      const front = index === 0;
      const pivot = new THREE.Group();
      pivot.name = front ? 'front-board' : 'back-board';
      const geo = boardSlabGeometry(this.Wb, this.Hb, BOARD_T);
      const size = [this.Wb, this.Hb];
      const outsideMat = createClothMaterial({ cloth: t.cloth, foil: t.foil, mirror: !front, groove: true, size });
      const insideMat = createEndpaperMaterial({
        cloth: t.cloth,
        paper: t.endpaper?.ground ?? '#efe7d6',
        mirror: front,
        pageU: this.W / this.Wb,
        pageV0: this.ov / this.Hb,
        pageV1: 1 - this.ov / this.Hb,
        size,
      });
      const edgeMat = createBoardEdgeMaterial(t.cloth);
      const slab = new THREE.Mesh(geo, front ? [outsideMat, insideMat, edgeMat] : [insideMat, outsideMat, edgeMat]);
      slab.name = `${pivot.name}-slab`;
      slab.castShadow = true;
      slab.receiveShadow = true;
      slab.userData.leafIndex = index;
      pivot.add(slab);
      Object.assign(leaf, { mesh: pivot, pivot, slab, geo, outsideMat, insideMat, edgeMat });
    } else {
      const geo = leafGridGeometry(this._grid);
      const mat = createLeafMaterial({ paper: t.paper });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `leaf-${index}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.leafIndex = index;
      Object.assign(leaf, { mesh, geo, mat, pos: geo.attributes.position.array, nrm: geo.attributes.normal.array });
    }
    leaf.mesh.userData.leafIndex = index;
    this.add(leaf.mesh);
    return leaf;
  }

  // ---------------------------------------------------------------- heights
  /** Surface height of a paper leaf with k paper leaves beneath it. */
  _restY(k) {
    return BOARD_T + (k + 0.5) * LEAF_T;
  }
  /** Inner surface of a board pressing the whole block. */
  get _closedTop() {
    return BOARD_T + this.paperCount * LEAF_T;
  }

  /** Rest profiles of a paper leaf for the current gutter amounts. */
  _restParams(l) {
    const P = this.paperCount;
    const topR = this._restY(P - l.index);
    const topL = this._restY(l.index - 1);
    const riseR = this._gR * Math.max(0, topR - PINCH);
    const riseL = this._gL * Math.max(0, topL - PINCH);
    l.st.yR = topR - riseR;
    l.st.riseR = riseR;
    l.st.yL = topL - riseL;
    l.st.riseL = riseL;
  }

  /**
   * Book-local height of the visible surface on a side (+1 right, −1 left):
   * the plane the pointer is projected onto while dragging.
   */
  surfaceY(side = 1) {
    const n = this.leaves.length;
    const top = side > 0 ? this._topR : this._topL;
    if (top < 0) return BOARD_T;
    if (top === 0 || top === n - 1) {
      // a board is the top of this side: closed book → its cover, otherwise its inner face
      const closedHere = side > 0 ? top === 0 : top === n - 1;
      return closedHere ? this._closedTop + BOARD_T : BOARD_T;
    }
    return side > 0 ? this._restY(this.paperCount - top) : this._restY(top - 1);
  }

  // ---------------------------------------------------------------- turning API
  canNext() {
    return this.opened < this.leaves.length;
  }
  canPrev() {
    return this.opened > 0;
  }

  /** Turn the right-hand leaf to the left. Returns false at the end. */
  next(opts = {}) {
    return this.goTo(this.opened + 1, opts);
  }

  /** Turn the left-hand leaf back to the right. Returns false at the start. */
  prev(opts = {}) {
    return this.goTo(this.opened - 1, opts);
  }

  /**
   * Animate to `opened = k`. Several leaves riffle with a stagger; leaves in
   * flight are retargeted; pending launches the other way are cancelled.
   * With reduced motion the turn is a cut: every leaf lands on the next
   * update (events, sounds and pop-up folds follow as usual), unless an
   * explicit `duration` asks for an animation.
   * @param {number} k
   * @param {{ stagger?: number, duration?: number, corner?: number }} [opts]
   * @returns {boolean} whether anything changed
   */
  goTo(k, opts = {}) {
    const n = this.leaves.length;
    k = clamp(Math.round(k), 0, n);
    if (this._drag) this.cancelDrag();
    const cur = this.opened;
    if (k === cur) return false;
    const dir = k > cur ? 1 : -1;
    const count = Math.abs(k - cur);
    const riffle = count > 1;
    const target = dir > 0 ? 1 : 0;
    const calm = this.reducedMotion;
    const cut = calm && opts.duration == null;
    const step = cut ? 0 : opts.stagger ?? (calm ? 0.03 : count <= 2 ? 0.16 : Math.min(0.085, 1.1 / count));
    const dur = cut ? 0 : opts.duration ?? (riffle ? this.turnDuration * (calm ? 0.7 : 0.8) : this.turnDuration);
    let delay = 0;
    for (const q of this._queue) if (q.target === target) delay = Math.max(delay, q.delay + step);
    let launched = 0;
    for (let j = 0; j < count; j++) {
      const i = dir > 0 ? cur + j : cur - 1 - j;
      const l = this.leaves[i];
      l.dest = target;
      if (l.queued) {
        this._unschedule(l);
        if (this._sideOf(l) === target) continue;
      }
      if (l.phys === 'F') {
        if (l.mode === 'frozen') this._land(l, true);
        else if (cut) this._cut(l, target);
        else if (l.target !== target) this._retarget(l, target);
        if (l.phys === 'F') continue;
      }
      if (this._sideOf(l) === target) continue;
      const corner = opts.corner ?? DEFAULT_CORNER + (riffle ? (hash01(i) - 0.5) * 0.16 : 0);
      this._schedule(l, target, delay, { dur, corner, riffle });
      delay += step;
      launched++;
    }
    this._recount();
    this.emit('change', { opened: this.opened, instant: false });
    if (launched > 1) this.emit('riffle', { count: launched, dir, duration: delay - step + dur });
    return true;
  }

  /** Jump without animation. */
  setOpened(k) {
    const n = this.leaves.length;
    k = clamp(Math.round(k), 0, n);
    this._queue.length = 0;
    this._drag = null;
    for (const l of this.leaves) {
      const left = l.index < k;
      l.queued = false;
      l.phys = left ? 'L' : 'R';
      l.dest = left ? 1 : 0;
      l.mode = 'rest';
      l.st.p = left ? 1 : 0;
      l.st.bend = 0;
      l.st.twist = 0;
      l.vel = 0;
      l.velEst = 0;
      l.dirty = true;
    }
    this.opened = k;
    this._gR = smoothstep(0, 0.6, this.leaves[0].st.p);
    this._gL = 1 - smoothstep(0.4, 1, this.leaves[n - 1].st.p);
    this._structureDirty = true;
    this._blocksDirty = true;
    this._boardsDirty = true;
    this.update(0);
    this.emit('change', { opened: k, instant: true });
  }

  _sideOf(l) {
    return l.phys === 'L' ? 1 : 0;
  }

  _recount() {
    let k = 0;
    for (const l of this.leaves) if (l.dest === 1) k++;
    this.opened = k;
  }

  _schedule(l, target, delay, opts) {
    l.queued = true;
    this._queue.push({ leaf: l, target, delay, opts });
  }

  _unschedule(l) {
    const i = this._queue.findIndex((q) => q.leaf === l);
    if (i >= 0) this._queue.splice(i, 1);
    l.queued = false;
  }

  /** Drop pending riffle launches (their leaves stay where they are). */
  _flushQueue() {
    if (!this._queue.length) return;
    for (const q of this._queue) {
      q.leaf.queued = false;
      q.leaf.dest = this._sideOf(q.leaf);
    }
    this._queue.length = 0;
    const before = this.opened;
    this._recount();
    if (this.opened !== before) this.emit('change', { opened: this.opened, instant: false });
  }

  _runQueue(dt) {
    for (const q of this._queue) q.delay -= dt;
    while (this._queue.length && this._queue[0].delay <= 0) {
      const q = this._queue.shift();
      this._launch(q.leaf, q.target, q.opts);
    }
  }

  _launch(l, target, { dur = this.turnDuration, corner = DEFAULT_CORNER, riffle = false } = {}) {
    l.queued = false;
    l.phys = 'F';
    l.mode = 'auto';
    l.from = l.st.p;
    l.target = target;
    l.t = 0;
    l.dur = dur;
    l.corner = l.board ? 0 : corner;
    l.amp = (riffle ? 0.85 : 1) * (this.reducedMotion ? 0.5 : 1);
    l.riffle = riffle;
    l.velEst = 0;
    l.dirty = true;
    this._structureDirty = true;
    // a cut (dur 0) sounds like a quick turn
    this.emit('turnstart', { leaf: l.index, target, drag: false, riffle, board: l.board, speed: dur > 0 ? this.turnDuration / dur : 2 });
  }

  /** Reduced motion: a leaf already in flight lands on `target` at the next update (a cut, no turn of its own). */
  _cut(l, target) {
    l.mode = 'auto';
    l.from = l.st.p;
    l.target = target;
    l.t = 1;
    l.dur = 0;
    l.dirty = true;
  }

  _retarget(l, target) {
    if (l.mode === 'drag') return;
    l.mode = 'spring';
    l.target = target;
    l.vel = clamp(l.velEst, -5, 5);
    l.omega = 10;
    this.emit('turnstart', { leaf: l.index, target, drag: false, retarget: true, board: l.board, speed: 1 });
  }

  _land(l, silent = false) {
    const left = l.mode === 'frozen' ? l.dest === 1 : l.target >= 0.5;
    l.phys = left ? 'L' : 'R';
    l.mode = 'rest';
    l.st.p = left ? 1 : 0;
    l.st.bend = 0;
    l.st.twist = 0;
    l.vel = 0;
    l.velEst = 0;
    l.dirty = true;
    this._structureDirty = true;
    if (!silent) this.emit('turnend', { leaf: l.index, side: left ? 'left' : 'right', board: l.board, riffle: l.riffle });
  }

  _advance(l, dt) {
    const st = l.st;
    const prevP = st.p;
    if (l.mode === 'auto') {
      l.t = l.dur > 0 ? Math.min(1, l.t + dt / l.dur) : 1; // dur 0: a reduced-motion cut lands now
      st.p = l.from + (l.target - l.from) * turnCurve(l.t);
      autoCurl(st.p, l.corner, st, l.amp);
      if (l.t >= 1) {
        this._land(l);
        return;
      }
    } else if (l.mode === 'spring') {
      // exact critically damped step (stable for any dt)
      const w = l.omega;
      const x = st.p - l.target;
      const B = l.vel + w * x;
      const e = Math.exp(-w * dt);
      const nx = (x + B * dt) * e;
      l.vel = (l.vel - w * B * dt) * e;
      st.p = l.target + nx;
      if (st.p <= 0 || st.p >= 1 || (Math.abs(nx) < 0.0015 && Math.abs(l.vel) < 0.05)) {
        st.p = clamp(st.p);
        this._land(l);
        return;
      }
      autoCurl(st.p, l.corner, st, 1);
      st.bend -= clamp(l.vel * 0.05, -0.15, 0.15); // air drag: the edge trails the motion
    } else if (l.mode === 'drag') {
      const k = 1 - Math.exp(-dt * 30);
      st.p += (l.dragP - st.p) * k;
      autoCurl(st.p, l.corner, st, 1.1);
      st.twist += l.dragTwist * Math.sin(Math.PI * st.p);
      st.bend -= clamp(l.dragVel * 0.035, -0.12, 0.12);
    }
    if (dt > 0) l.velEst = l.velEst * 0.5 + ((st.p - prevP) / dt) * 0.5;
    l.dirty = true;
  }

  // ---------------------------------------------------------------- drag API
  /**
   * Begin dragging the top leaf of a side. `side`: +1 right (forward), −1 left
   * (back). `z` = book-local z of the grab (corner twist). Optional `x` (book-
   * local pointer x) keeps the grabbed point under the pointer; `s` overrides
   * the grab radius (distance from the spine along the leaf); `leaf` catches a
   * specific leaf that is in flight.
   * @returns {boolean} false if nothing can be dragged on that side
   */
  beginDrag(side, z = 0, opts = {}) {
    if (this._drag) return false;
    this._flushQueue();
    const n = this.leaves.length;
    let l = null;
    if (opts.leaf != null) l = this.leaves[opts.leaf] ?? null;
    else if (side > 0 && this.opened < n) l = this.leaves[this.opened];
    else if (side < 0 && this.opened > 0) l = this.leaves[this.opened - 1];
    if (!l) return false;
    if (l.phys !== 'F' && l.index !== this._topR && l.index !== this._topL) return false;
    const startP = l.st.p;
    l.queued = false;
    l.phys = 'F';
    l.mode = 'drag';
    l.dragFrom = l.dest;
    l.dragSide = side;
    const s = opts.s ?? (opts.x != null ? Math.abs(opts.x) : l.W * 0.85);
    l.grabS = clamp(s, l.W * 0.3, l.W);
    l.grabZ = z;
    l.corner = l.board ? 0 : clamp(z / (l.H / 2), -1, 1);
    const pPointer = opts.x != null ? this._pFromX(opts.x, l.grabS) : startP;
    l.dragOffset = startP - pPointer;
    l.dragP = startP;
    l.dragTwist = 0;
    l.dragVel = 0;
    l.dragT = performance.now();
    l.dragLastP = startP;
    l.dirty = true;
    this._drag = l;
    this._structureDirty = true;
    this.emit('turnstart', { leaf: l.index, target: side > 0 ? 1 : 0, drag: true, board: l.board, speed: 1 });
    return true;
  }

  _pFromX(x, s) {
    return Math.acos(clamp(x / s, -1, 1)) / Math.PI;
  }

  /** Pointer position in book-local space (x across the spread, z head → tail). */
  dragTo(xLocal, zLocal = 0) {
    const l = this._drag;
    if (!l) return;
    const p = clamp(this._pFromX(xLocal, l.grabS) + l.dragOffset, 0, 1);
    const now = performance.now();
    const dts = Math.max(1, now - l.dragT) / 1000;
    const v = (p - l.dragLastP) / dts;
    l.dragVel = l.dragVel * 0.55 + v * 0.45;
    l.dragLastP = p;
    l.dragT = now;
    l.dragP = p;
    if (!l.board) l.dragTwist = clamp((zLocal - l.grabZ) / (l.H / 2), -0.8, 0.8) * 0.45;
  }

  /**
   * Release the dragged leaf: it completes the turn if it passed half-way or
   * was flung, otherwise springs back. `o.target` (0 right, 1 left) decides
   * the side instead — a touch swipe — and throws the leaf that way at least
   * as fast as a flick.
   * @param {{ target?: 0|1 }} [o]
   * @returns {{ committed: boolean, leaf: number, target: number } | null}
   */
  endDrag(o = {}) {
    const l = this._drag;
    if (!l) return null;
    this._drag = null;
    const age = performance.now() - l.dragT;
    let v = age > 90 ? 0 : clamp(l.dragVel, -6, 6);
    let target = l.st.p + v * 0.16 >= 0.5 ? 1 : 0;
    if (Math.abs(v) > 1.6) target = v > 0 ? 1 : 0;
    if (o.target === 0 || o.target === 1) {
      // a swipe decides, unless a last-moment flick goes the other way
      const dir = o.target === 1 ? 1 : -1; // p grows towards the left
      if (dir * v > -1.6) {
        target = o.target;
        v = dir * Math.max(dir * v, 1.6);
      }
    }
    l.mode = 'spring';
    l.target = target;
    l.vel = v;
    l.omega = 11;
    l.dest = target;
    const before = this.opened;
    this._recount();
    const committed = target !== l.dragFrom;
    if (this.opened !== before) this.emit('change', { opened: this.opened, instant: false });
    this.emit('release', { leaf: l.index, committed, target, speed: Math.abs(v) });
    return { committed, leaf: l.index, target };
  }

  /** Abort a drag: the leaf springs back to where it came from. */
  cancelDrag() {
    const l = this._drag;
    if (!l) return;
    this._drag = null;
    l.mode = 'spring';
    l.target = l.dragFrom;
    l.vel = 0;
    l.omega = 11;
    l.dest = l.dragFrom;
    this._recount();
    this.emit('release', { leaf: l.index, committed: false, target: l.target, speed: 0 });
  }

  // ---------------------------------------------------------------- debug poses
  /**
   * Hold a leaf in a fixed pose (deterministic screenshots). bend/twist in
   * radians; omitted values use the automatic envelope (twist from a
   * default corner). Meant for the top leaf of a side (book.rightLeaf /
   * book.leftLeaf) or leaves already in flight: freezing a leaf that lies
   * under others lifts it through them (stack order is not enforced).
   */
  freeze(i, p, bend, twist) {
    const l = this.leaves[i];
    if (!l) return;
    if (this._drag === l) this._drag = null;
    if (l.queued) this._unschedule(l);
    l.phys = 'F';
    l.mode = 'frozen';
    l.st.p = clamp(p);
    const c = autoCurl(l.st.p, DEFAULT_CORNER, {});
    l.st.bend = l.board ? 0 : bend ?? c.bend;
    l.st.twist = l.board ? 0 : twist ?? c.twist;
    l.dirty = true;
    this._structureDirty = true;
  }

  /** Release frozen leaves (all, or leaf i) back to their destination side. */
  unfreeze(i) {
    for (const l of this.leaves) {
      if (l.mode !== 'frozen' || (i != null && l.index !== i)) continue;
      this._land(l, true);
    }
  }

  // ---------------------------------------------------------------- frame
  /** Advance animations and rebuild only what changed. Call once per frame. */
  update(dt) {
    dt = Math.min(Math.max(dt || 0, 0), 0.05);
    const leaves = this.leaves;
    const n = leaves.length;
    if (this._queue.length) this._runQueue(dt);
    let boardsMoving = this._boardsDirty;
    for (let i = 0; i < n; i++) {
      const l = leaves[i];
      if (l.phys !== 'F') continue;
      if (l.mode !== 'frozen') this._advance(l, dt);
      if (l.board) boardsMoving = true;
    }
    const F = leaves[0];
    const B = leaves[n - 1];
    if (F.dirty || B.dirty) boardsMoving = true;
    const gR = smoothstep(0, 0.6, F.st.p);
    const gL = 1 - smoothstep(0.4, 1, B.st.p);
    const gChanged = gR !== this._gR || gL !== this._gL;
    this._gR = gR;
    this._gL = gL;
    if (this._structureDirty) this._restructure();

    for (let i = 1; i < n - 1; i++) {
      const l = leaves[i];
      if (!l.mesh.visible) continue;
      if (!(l.dirty || l.phys === 'F' || gChanged)) continue;
      this._restParams(l);
      this._grid.write(l.pos, l.nrm, l.st);
      // a tight box lets a ray pick (hover, every pointer move) skip the
      // leaves it cannot hit; the generous fixed sphere still drives culling
      l.geo.boundingBox.setFromArray(l.pos).expandByScalar(1e-4);
      l.geo.attributes.position.needsUpdate = true;
      l.geo.attributes.normal.needsUpdate = true;
      const lift = Math.min(l.st.p, 1 - l.st.p);
      l.mat.userData.gutterAO.value = 1 - smoothstep(0.015, 0.12, lift);
      l.dirty = false;
    }

    if (boardsMoving || gChanged) {
      this._placeBoard(F);
      this._placeBoard(B);
      F.dirty = B.dirty = false;
      this._updateSpine();
      this._boardsDirty = false;
    }
    if (this._blocksDirty || gChanged) this._updateBlocks();
    this.presence.left = smoothstep(0.45, 1, F.st.p);
    this.presence.right = 1 - smoothstep(0.45, 1, B.st.p);
    this.footprint.left = smoothstep(0.8, 1, F.st.p);
    this.footprint.right = 1 - smoothstep(0, 0.2, B.st.p);
  }

  _restructure() {
    this._structureDirty = false;
    const leaves = this.leaves;
    const n = leaves.length;
    let topR = -1;
    let topL = -1;
    for (let i = 0; i < n; i++) {
      if (leaves[i].phys === 'R') {
        topR = i;
        break;
      }
    }
    for (let i = n - 1; i >= 0; i--) {
      if (leaves[i].phys === 'L') {
        topL = i;
        break;
      }
    }
    this._topR = topR;
    this._topL = topL;
    for (let i = 1; i < n - 1; i++) {
      const l = leaves[i];
      const vis = l.phys === 'F' || i === topR || i === topL;
      if (vis && !l.mesh.visible) l.dirty = true;
      l.mesh.visible = vis;
    }
    this._blocksDirty = true;
    this._boardsDirty = true;
  }

  _updateBlocks() {
    this._blocksDirty = false;
    const leaves = this.leaves;
    const n = leaves.length;
    const P = this.paperCount;
    let topPaperR = -1;
    for (let i = 1; i <= P; i++) {
      if (leaves[i].phys === 'R') {
        topPaperR = i;
        break;
      }
    }
    let topPaperL = -1;
    for (let i = P; i >= 1; i--) {
      if (leaves[i].phys === 'L') {
        topPaperL = i;
        break;
      }
    }
    this._setBlock(this.blocks.right, topPaperR, this._topR === 0, 1);
    this._setBlock(this.blocks.left, topPaperL, this._topL === n - 1, -1);
  }

  _setBlock(mesh, top, covered, side) {
    if (top < 0) {
      mesh.visible = false;
      return;
    }
    const P = this.paperCount;
    const below = side > 0 ? P - top : top - 1;
    // covered by a board: the block fills up to the board; otherwise it stops just under the top leaf
    const yTop = covered ? BOARD_T + (below + 1) * LEAF_T : this._restY(below) - 0.00015;
    const leaves = (yTop - BOARD_T) / LEAF_T;
    if (leaves < 0.75) {
      mesh.visible = false;
      return;
    }
    const g = side > 0 ? this._gR : this._gL;
    const rise = g * Math.max(0, yTop - PINCH);
    mesh.userData.block.update(BOARD_T, yTop - rise, rise, leaves);
    mesh.visible = true;
  }

  /** Rigid board on its hinge: rotates about its mid-plane at the spine edge. */
  _placeBoard(l) {
    const T = BOARD_T;
    const top = this._closedTop;
    const p = l.st.p;
    const yc = l.index === 0 ? T / 2 + top * (1 - smoothstep(0.2, 1, p)) : T / 2 + top * smoothstep(0, 0.8, p);
    l.pivot.position.set(0, yc, 0);
    l.pivot.rotation.set(0, 0, p * Math.PI);
  }

  _updateSpine() {
    const n = this.leaves.length;
    const F = this.leaves[0];
    const B = this.leaves[n - 1];
    const T = BOARD_T;
    const a = F.st.p * Math.PI;
    const b = B.st.p * Math.PI;
    const ycF = F.pivot.position.y;
    const ycB = B.pivot.position.y;
    const ax = (-Math.sin(a) * T) / 2;
    const ay = ycF + (Math.cos(a) * T) / 2;
    const bx = (Math.sin(b) * T) / 2;
    const by = ycB - (Math.cos(b) * T) / 2;
    const chord = this._spineStrip.update(ax, ay, Math.cos(a), Math.sin(a), bx, by, Math.cos(b), Math.sin(b));
    this.spine.visible = chord > 0.004;
    // headbands: a bead in the gutter when open, a band along the block's back when closed
    const closed = 1 - Math.min(this._gR, this._gL);
    const sgn = this._gR <= this._gL ? -1 : 1;
    const P = this.paperCount;
    const len = lerp(0.018, P * LEAF_T + 0.004, closed);
    const cy = lerp(BOARD_T + HEADBAND_R * 0.35, BOARD_T + (P * LEAF_T) / 2, closed);
    const cx = sgn * HEADBAND_R * 0.8 * closed;
    const zH = this.H / 2 + HEADBAND_R;
    const sy = len / (HEADBAND_LEN0 + 2 * HEADBAND_R);
    for (const m of this.headbands) {
      m.position.set(cx, cy, m.userData.zs * zH);
      m.rotation.set(0, 0, ((1 - closed) * Math.PI) / 2);
      m.scale.set(1, sy, 1);
    }
    this._headbandMat.userData.stripeScale.value = sy;
  }

  // ---------------------------------------------------------------- queries
  /** Whether leaf i is drawn (top resting leaf of a side, a board, or in flight). */
  leafVisible(i) {
    const l = this.leaves[i];
    if (!l) return false;
    if (l.board) return true;
    return l.phys === 'F' || i === this._topR || i === this._topL;
  }

  /**
   * Opening of the spread whose recto is leaf i's front: 0 closed … 1 flat.
   * Pop-up figures on that recto should fold with this (it closes both when
   * leaf i lifts and when leaf i−1 falls back onto it).
   */
  spreadOpening(i) {
    const l = this.leaves[i];
    if (!l || i === 0) return 1;
    return clamp(this.leaves[i - 1].st.p - l.st.p);
  }

  /**
   * World-space frame on a leaf's front face at page-local (s, z): for
   * standing pop-up figures on (turning) pages. Book-local coordinates.
   * Pass `out` to avoid allocating.
   */
  leafFrame(i, s, z, out) {
    const l = this.leaves[i];
    if (!l) return null;
    out = out ?? { position: [0, 0, 0], tangent: [1, 0, 0], normal: [0, 1, 0], angle: 0 };
    if (l.board) {
      const a = l.st.p * Math.PI;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const ly = BOARD_T / 2;
      const yc = l.pivot.position.y;
      out.position[0] = c * s - sn * ly;
      out.position[1] = yc + sn * s + c * ly;
      out.position[2] = z;
      out.tangent[0] = c;
      out.tangent[1] = sn;
      out.tangent[2] = 0;
      out.normal[0] = -sn;
      out.normal[1] = c;
      out.normal[2] = 0;
      out.angle = a;
      return out;
    }
    this._restParams(l);
    return this._grid.frame(s, z, l.st, out);
  }

  /** Turn progress of a leaf (0 right … 1 left). */
  leafProgress(i) {
    return this.leaves[i]?.st.p ?? 0;
  }

  /**
   * Ray-pick pages and boards.
   * @param {THREE.Raycaster} raycaster
   * @returns {{ leaf: number, side: 'front'|'back', u: number|null, v: number|null, s: number, z: number,
   *            point: THREE.Vector3, distance: number, board: boolean, face: 'page'|'cover'|'endpaper'|'edge' } | null}
   *   u, v are coordinates in the texture assigned to that side (v = 0 at the head).
   */
  pick(raycaster) {
    const list = this._pickList;
    list.length = 0;
    const n = this.leaves.length;
    for (let i = 0; i < n; i++) {
      const l = this.leaves[i];
      if (l.board) list.push(l.slab);
      else if (l.mesh.visible) list.push(l.mesh);
    }
    const hits = this._hits;
    hits.length = 0;
    raycaster.intersectObjects(list, false, hits);
    for (const h of hits) {
      const i = h.object.userData.leafIndex;
      const l = this.leaves[i];
      if (!l || !h.face || !h.uv) continue;
      const ug = h.uv.x;
      const vg = h.uv.y;
      if (!l.board) {
        this._n.copy(h.face.normal).transformDirection(h.object.matrixWorld);
        const front = this._n.dot(raycaster.ray.direction) < 0;
        return {
          leaf: i,
          side: front ? 'front' : 'back',
          u: front ? ug : 1 - ug,
          v: 1 - vg,
          s: ug * l.W,
          z: (0.5 - vg) * l.H,
          point: h.point,
          distance: h.distance,
          board: false,
          face: 'page',
        };
      }
      const frontBoard = i === 0;
      const group = h.face.materialIndex;
      const s = ug * this.Wb;
      const z = (0.5 - vg) * this.Hb;
      if (group === 2) {
        return { leaf: i, side: frontBoard ? 'front' : 'back', u: null, v: null, s, z, point: h.point, distance: h.distance, board: true, face: 'edge' };
      }
      const top = group === 0;
      const side = top ? 'front' : 'back';
      const outside = frontBoard ? top : !top;
      if (outside) {
        return { leaf: i, side, u: top ? ug : 1 - ug, v: 1 - vg, s, z, point: h.point, distance: h.distance, board: true, face: 'cover' };
      }
      const ue = ug / (this.W / this.Wb);
      const ve = (vg - this.ov / this.Hb) / (1 - (2 * this.ov) / this.Hb);
      return { leaf: i, side, u: top ? ue : 1 - ue, v: 1 - ve, s, z, point: h.point, distance: h.distance, board: true, face: 'endpaper' };
    }
    return null;
  }

  // ---------------------------------------------------------------- figures guard
  /**
   * Hide pop-up figure anchors (children named `figure-anchor-<leaf>`) whose
   * leaf is covered by other leaves, or whose spread is nearly closed by a
   * page falling back onto it. Runs at render time, after the FigureHost
   * update, so a figure can never poke through paper.
   */
  updateMatrixWorld(force) {
    if (this.guardFigures) {
      const ch = this.children;
      for (let k = 0; k < ch.length; k++) {
        const c = ch[k];
        let li = c.userData.anchorLeaf;
        if (li === undefined) {
          const m = /^figure-anchor-(\d+)$/.exec(c.name);
          li = c.userData.anchorLeaf = m ? +m[1] : null;
        }
        if (li === null || !c.visible) continue;
        if (!this.leafVisible(li) || this.spreadOpening(li) < 0.28) c.visible = false;
      }
    }
    super.updateMatrixWorld(force);
  }

  /** Free GPU resources created by the book (page textures stay with their owner). */
  dispose() {
    for (const l of this.leaves) {
      l.geo.dispose();
      if (l.board) {
        l.outsideMat.dispose();
        l.insideMat.dispose();
        l.edgeMat.dispose();
      } else {
        l.mat.dispose();
      }
    }
    this.blocks.right.geometry.dispose();
    this.blocks.left.geometry.dispose();
    this._edgeMat.dispose();
    this._spineStrip.geometry.dispose();
    this._spineMat.dispose();
    this._headbandGeo.dispose();
    this._headbandMat.dispose();
    this.listeners.clear();
    this._queue.length = 0;
    this.removeFromParent();
  }
}
