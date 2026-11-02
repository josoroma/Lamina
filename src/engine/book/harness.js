// Book-engine harness (book-test.html): the book alone with placeholder
// pages and demo pop-ups, driven by the real input and audio layers, plus a
// small debug panel and a deterministic automation handle.
//
// Why: the book, the camera rig, input and sound can be judged (and
// screenshotted mid-turn, frozen, riffling, in portrait or inspect mode)
// without the typesetter, the UI or real figures being ready.
//
// URL: book-test.html?leaves=14&opened=4&freeze=5,0.3[,bend,twist]&focus=auto|spread|left|right
//                    &inspect=1&figures=0&ui=0&sound=0&gl=webgl
// window.bookTest: { ready, book, stage, host, input, audio, renderer,
//   freeze(leaf, p, bend?, twist?), unfreeze(leaf?), pause(), play(), advance(seconds),
//   next(), prev(), goTo(k), inspect(), exitInspect(), focus(which), state() }
import * as THREE from 'three/webgpu';
import { createRenderer } from '../renderer.js';
import { createStage } from '../stage.js';
import { Book } from './Book.js';
import { FigureHost } from '../figures/FigureHost.js';
import { placeholderPage, placeholderCover } from '../../app/placeholder.js';
import { createInput } from '../input.js';
import { createAudio, connectBookAudio } from '../audio.js';

const q = new URLSearchParams(location.search);
const LEAVES = Math.min(60, Math.max(3, +(q.get('leaves') ?? 14) || 14));
const THEME = {
  paper: '#fbf8f1',
  cloth: '#1f3a2b',
  foil: '#c9a44c',
  edge: '#f3eee3',
  headband: ['#9e2b25', '#efe7d6'],
  endpaper: { color: '#1f3a2b', ground: '#efe7d6' },
};

const canvas = document.querySelector('#stage');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const { renderer, backend, lowPower } = await createRenderer(canvas);
const stage = createStage(renderer, { reducedMotion, lowPower });

const book = new Book({ leafCount: LEAVES, theme: THEME });
stage.world.add(book);
stage.setBook(book);

// ---------------------------------------------------------------- pages
const textures = [];
const keep = (t) => (textures.push(t), t);
book.setLeafTexture(0, 'front', keep(placeholderCover('Serpientes', { cloth: THEME.cloth, foil: THEME.foil })));
book.setLeafTexture(0, 'back', keep(endpaperTexture(THEME.endpaper)));
book.setLeafTexture(LEAVES - 1, 'front', keep(endpaperTexture(THEME.endpaper)));
book.setLeafTexture(LEAVES - 1, 'back', keep(placeholderCover('Lámina', { cloth: THEME.cloth, foil: THEME.foil })));
for (let i = 1; i < LEAVES - 1; i++) {
  book.setLeafTexture(i, 'front', keep(placeholderPage(`p. ${i * 2 - 1}`, { side: 'recto' })));
  book.setLeafTexture(i, 'back', keep(placeholderPage(`p. ${i * 2}`, { side: 'verso' })));
}

// ---------------------------------------------------------------- pop-ups
const host = new FigureHost({ book, theme: { style: 'lithograph', paper: THEME.paper, ink: '#1c1a17' }, reducedMotion });
const FIG_COLORS = ['#7aa95c', '#c0533a', '#d9a441', '#4f7fa8'];
const figureLeaves = [];
if (q.get('figures') !== '0') {
  for (let i = 3, k = 0; i < LEAVES - 1; i += 2, k++) {
    figureLeaves.push(i);
    host.mount(i, { type: 'demo', params: { color: FIG_COLORS[k % FIG_COLORS.length] } });
  }
}

// ---------------------------------------------------------------- initial state
book.setOpened(q.has('opened') ? +q.get('opened') : 4);
if (q.has('freeze')) {
  const [leaf, p, bend, twist] = q.get('freeze').split(',').map(Number);
  book.freeze(leaf, p, Number.isFinite(bend) ? bend : undefined, Number.isFinite(twist) ? twist : undefined);
}
if (q.has('focus')) stage.rig.focusPage(q.get('focus'));

function resize() {
  stage.resize(canvas.clientWidth, canvas.clientHeight);
}
new ResizeObserver(resize).observe(canvas);
resize();
stage.rig.snap();

// ---------------------------------------------------------------- input & sound
const audio = createAudio({ enabled: q.get('sound') !== '0' });
const unhookAudio = connectBookAudio(book, audio);
const input = createInput({
  canvas,
  stage,
  book,
  host,
  keyboard: true,
  onTap: (hit) => {
    if (hit.kind === 'page') {
      const forward = hit.side === 'front' ? book.leaves[hit.leaf].st.p < 0.5 : false;
      if (forward) book.next();
      else book.prev();
    }
  },
  onInspect: () => toggleInspect(),
});
const unlock = () => audio.unlock();
addEventListener('pointerdown', unlock, { capture: true });
addEventListener('keydown', unlock, { capture: true });

function toggleInspect() {
  if (stage.rig.mode === 'inspect') return stage.rig.exitInspect();
  const p = host.focusPoint?.();
  if (!p) return;
  stage.rig.inspectSphere(p, host.figureRadius?.() ?? 0.25);
}

// ---------------------------------------------------------------- debug panel
const panel = document.querySelector('#debug');
if (q.get('ui') === '0') {
  panel.hidden = true;
  document.querySelector('#hint').style.display = 'none';
}
panel.innerHTML = `
  <h1>Book engine <small>${backend === 'webgpu' ? 'WebGPU' : 'WebGL 2'}</small></h1>
  <div class="row"><span>opened</span><b id="d-opened"></b></div>
  <div class="row"><span>fps</span><b id="d-fps"></b></div>
  <div class="row"><span>camera</span><b id="d-cam"></b></div>
  <div id="leaves"></div>
  <div class="btns">
    <button data-a="prev">‹ prev</button><button data-a="next">next ›</button>
    <button data-a="start">⇤ start</button><button data-a="end">end ⇥</button>
    <button data-a="close">close</button><button data-a="freeze">freeze</button>
    <button data-a="inspect">inspect</button><button data-a="focus">focus</button>
    <button data-a="sound">sound</button>
  </div>`;
const el = (id) => panel.querySelector(id);
const cells = [];
const leavesEl = el('#leaves');
for (let i = 0; i < LEAVES; i++) {
  const c = document.createElement('i');
  c.title = `leaf ${i}`;
  if (i === 0 || i === LEAVES - 1) c.classList.add('board');
  leavesEl.appendChild(c);
  cells.push(c);
}
const FOCI = ['auto', 'spread', 'left', 'right'];
panel.addEventListener('click', (e) => {
  const a = e.target.closest('button')?.dataset.a;
  if (!a) return;
  audio.tap();
  if (a === 'prev') book.prev();
  if (a === 'next') book.next();
  if (a === 'start') book.goTo(1);
  if (a === 'end') book.goTo(LEAVES - 1);
  if (a === 'close') book.goTo(book.opened < LEAVES / 2 ? 0 : LEAVES);
  if (a === 'freeze') {
    if (book.leaves.some((l) => l.mode === 'frozen')) book.unfreeze();
    else book.freeze(book.rightLeaf, 0.32);
  }
  if (a === 'inspect') toggleInspect();
  if (a === 'focus') stage.rig.focusPage(FOCI[(FOCI.indexOf(stage.rig.focus) + 1) % FOCI.length]);
  if (a === 'sound') audio.setEnabled(!audio.enabled);
});
addEventListener('keydown', (e) => {
  if (e.key === 'd' || e.key === 'D') panel.hidden = !panel.hidden;
});

let frames = 0;
let fpsT = 0;
let fps = 0;
function drawPanel(dt) {
  frames++;
  fpsT += dt;
  if (fpsT < 0.25) return;
  fps = Math.round(frames / fpsT);
  frames = 0;
  fpsT = 0;
  if (panel.hidden) return;
  el('#d-opened').textContent = `${book.opened} / ${LEAVES}${book.busy ? ' · turning' : ''}`;
  el('#d-fps').textContent = String(fps);
  el('#d-cam').textContent = `${stage.rig.mode} · ${stage.rig.effectiveFocus} · ${stage.rig.zoom.toFixed(2)}×`;
  for (let i = 0; i < LEAVES; i++) {
    const l = book.leaves[i];
    const c = cells[i];
    const s = l.phys;
    c.className = `${s}${l.board ? ' board' : ''}${book.leafVisible(i) ? ' vis' : ''}`;
    c.textContent = s === 'F' ? Math.round(l.st.p * 9) : s;
  }
}

// ---------------------------------------------------------------- loop
let paused = false;
function step(dt) {
  stage.update(dt);
  book.update(dt);
  host.update(dt);
}
const timer = new THREE.Timer();
renderer.setAnimationLoop((ts) => {
  timer.update(ts);
  const dt = Math.min(timer.getDelta(), 1 / 20);
  if (!paused) step(dt);
  renderer.render(stage.scene, stage.camera);
  drawPanel(dt);
});

await Promise.all(figureLeaves.map((i) => host.get(i)?.ready));
if (q.get('inspect') === '1') {
  toggleInspect();
  stage.rig.snap();
}

const ready = Promise.resolve(true);
window.bookTest = {
  ready,
  book,
  stage,
  rig: stage.rig,
  host,
  input,
  audio,
  renderer,
  backend,
  THREE,
  /** Hold a leaf at progress p (bend/twist radians; omitted = automatic envelope). */
  freeze: (leaf, p, bend, twist) => book.freeze(leaf, p, bend, twist),
  unfreeze: (leaf) => book.unfreeze(leaf),
  pause: () => (paused = true),
  play: () => (paused = false),
  /** Step the simulation deterministically (60 Hz substeps). */
  advance(seconds) {
    const n = Math.round(seconds * 60);
    for (let i = 0; i < n; i++) step(1 / 60);
  },
  next: () => book.next(),
  prev: () => book.prev(),
  goTo: (k) => book.goTo(k),
  inspect: () => toggleInspect(),
  exitInspect: () => stage.rig.exitInspect(),
  focus: (which) => stage.rig.focusPage(which),
  state: () => ({
    backend,
    opened: book.opened,
    busy: book.busy,
    leaves: book.leaves.map((l) => ({ i: l.index, phys: l.phys, mode: l.mode, p: +l.st.p.toFixed(3), visible: book.leafVisible(l.index) })),
    camera: { mode: stage.rig.mode, focus: stage.rig.effectiveFocus, zoom: stage.rig.zoom },
  }),
  dispose() {
    renderer.setAnimationLoop(null);
    input.dispose();
    unhookAudio();
    audio.dispose();
    removeEventListener('pointerdown', unlock, { capture: true });
    removeEventListener('keydown', unlock, { capture: true });
    for (const i of figureLeaves) host.unmount(i);
    book.dispose();
    textures.forEach((t) => t.dispose());
  },
};
window.lamina ??= { ready };
console.info(`[lamina] book-test ready (${backend})`);

/** Original endpaper motif: overlapping scale arcs on a warm ground. */
function endpaperTexture({ color = '#1f3a2b', ground = '#efe7d6' } = {}, w = 768) {
  const h = Math.round(w * 1.38);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = ground;
  g.fillRect(0, 0, w, h);
  const r = w / 18;
  g.strokeStyle = color;
  g.globalAlpha = 0.55;
  g.lineWidth = Math.max(1, w / 520);
  for (let row = -1, y = 0; y < h + r; row++, y = row * r * 0.62) {
    const off = row % 2 ? r : 0;
    for (let x = -r + off; x < w + r; x += 2 * r) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI);
      g.stroke();
      g.beginPath();
      g.arc(x, y, r * 0.55, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
