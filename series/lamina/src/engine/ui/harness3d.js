// UI harness, 3D mode (ui.html?mode=3d): the overlay over the real engine.
//
// The mock harness cannot tell us whether canvas clicks and drags pass
// through the overlay, whether labels track anchors projected from a live,
// animated figure, or how the glass chrome sits over the rendered book. This
// mode boots the real renderer (WebGPU, or WebGL 2 with &gl=webgl), stage,
// Book and FigureHost with two demo figures, and wires the UI the way the
// App's Reader does: setSpread on book changes, setBusy around turns,
// setClock + renderLabels every frame, commands mapped onto book/host.
//
// URL switches: spread=2 (opened leaves; demo plates sit on 2 and 4), t=1.6,
// play=0, labels=0, open=layers|export|help|contents, idle=0, gl=webgl.
// window.harness = { ui, book, host, stage, renderer, backend }.
import * as THREE from 'three/webgpu';
import { createUI } from './index.js';
import { createRenderer } from '../renderer.js';
import { createStage, WORLD } from '../stage.js';
import { Book } from '../book/Book.js';
import { FigureHost } from '../figures/FigureHost.js';

const q = new URLSearchParams(location.search);
const DURATION = 5;
const LEAVES = 8; // 0 = front board … 7 = back board; spreads 0..8
const PLATES = [
  { leaf: 2, number: 'I', title: 'Seed pod', sci: 'Demo figure', params: {} },
  { leaf: 4, number: 'II', title: 'Seed pod, ripe', sci: 'Demo figure', params: { color: '#c0533a' } },
];
const BEATS = [
  [0, 'Closed, the fruit wall protects the seeds.'],
  [1.2, 'The two valves part along the seam.'],
  [2.5, 'Fully open: six seeds turn on their axis.'],
  [3.8, 'The valves close again.'],
];

/**
 * Plain page / cover textures so the harness does not depend on the App's or
 * the typesetter's files (they change during integration).
 * @param {string} label
 * @param {{ cover?: boolean, recto?: boolean }} [o]
 */
function pageTexture(label, { cover = false, recto = true } = {}) {
  const w = 768;
  const h = Math.round(w * (cover ? 1.436 / 1.028 : 1.38));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = cover ? '#23412f' : '#fbf8f1';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = cover ? '#d8b25a' : 'rgba(28,26,23,.12)';
  g.lineWidth = cover ? 5 : 2;
  g.strokeRect(w * 0.09, h * 0.07, w * 0.82, h * 0.86);
  g.fillStyle = cover ? '#d8b25a' : '#1c1a17';
  g.textAlign = cover ? 'center' : recto ? 'right' : 'left';
  g.font = `italic ${Math.round(w * (cover ? 0.09 : 0.045))}px Georgia, serif`;
  g.fillText(label, cover ? w / 2 : recto ? w * 0.88 : w * 0.12, cover ? h * 0.42 : h * 0.11);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

document.querySelector('#mock')?.remove();
document.querySelector('#log')?.remove();
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-label', 'Interactive 3D book');
Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', display: 'block', touchAction: 'none' });
document.body.prepend(canvas);

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { labels: q.get('labels') !== '0' };
let renderer;
let backend;

try {
  ({ renderer, backend } = await createRenderer(canvas));
} catch (err) {
  console.error('[ui-harness] renderer failed', err);
  document.body.insertAdjacentHTML('beforeend', `<p style="font:14px system-ui;padding:24px">Renderer failed: ${String(err?.message ?? err)}</p>`);
  throw err;
}
const stage = createStage(renderer, { reducedMotion });
const book = new Book({ leafCount: LEAVES, theme: { cloth: '#23412f' } });
stage.world.add(book);
stage.setBook?.(book);
book.setLeafTexture(0, 'front', pageTexture('Lámina', { cover: true }));
for (let i = 0; i < LEAVES; i++) {
  if (i > 0) book.setLeafTexture(i, 'front', pageTexture(`p. ${i * 2 - 1}`, { recto: true }));
  book.setLeafTexture(i, 'back', pageTexture(`p. ${i * 2}`, { recto: false }));
}
const host = new FigureHost({ book, theme: { style: 'lithograph', paper: '#fbf8f1', ink: '#1c1a17' }, reducedMotion });
for (const p of PLATES) host.mount(p.leaf, { type: 'demo', params: p.params });

const ui = createUI({
  root: document.body,
  book: { id: 'demo', title: 'Lámina', subtitle: 'Engine harness', plates: PLATES.map((p) => ({ number: p.number, title: p.title, sci: p.sci, spread: p.leaf })) },
  theme: { accent: '#9e2b25', ink: '#1c1a17', paper: '#fbf8f1' },
  idleHide: q.get('idle') !== '0',
  onCommand,
});
ui.setBackend(backend);
addEventListener('keydown', (e) => ui.runShortcut(e));

function sync() {
  const spread = book.opened;
  const p = PLATES.find((x) => x.leaf === spread);
  const m = host.get(spread);
  ui.setSpread({
    index: spread,
    total: LEAVES + 1,
    title: p?.title ?? (spread === 0 ? 'Front cover' : spread === LEAVES ? 'Back cover' : `Pages ${spread * 2 - 2}–${spread * 2 - 1}`),
    sci: p?.sci ?? '',
    number: p?.number ?? '',
    hasFigure: !!m?.figure,
    layers: (m?.figure?.layers ?? []).map((l) => ({ ...l, visible: m.layers[l.id] !== false })),
    labels: state.labels,
    explode: m?.explodeTarget ?? 0,
    playing: host.playing,
    beats: p ? BEATS : [],
    animationTitle: p ? 'Opening the pod' : '',
    duration: DURATION,
    canPrev: book.canPrev(),
    canNext: book.canNext(),
  });
}

function onCommand(c) {
  console.info('[ui] command', c);
  switch (c.type) {
    case 'next':
      book.next();
      break;
    case 'prev':
      book.prev();
      break;
    case 'goto':
      book.goTo(c.spread);
      break;
    case 'play':
      host.setPlaying(true);
      break;
    case 'pause':
      host.setPlaying(false);
      break;
    case 'time':
      host.setPlaying(false);
      host.setTime(c.t);
      break;
    case 'labels':
      state.labels = c.on;
      host.setLabels(c.on);
      break;
    case 'layer':
      host.setLayer(c.id, c.on);
      break;
    case 'explode':
      host.setExplode(c.amount);
      break;
    case 'export':
      ui.toast(`Export “${c.mode}” is wired by the App`);
      break;
    case 'fullscreen':
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.().catch(() => ui.toast('Full screen is not available here'));
      break;
    case 'reset-view':
      stage.rig.reset?.();
      break;
    case 'library':
      ui.toast('Back to the library (harness)');
      break;
    default:
      break;
  }
  sync();
}

book.on('change', () => sync());
book.on('turnstart', () => ui.setBusy(true));
book.on('turnend', () => {
  ui.setBusy(book.busy);
  sync();
});
host.on('mounted', () => sync());

// clicks on the canvas (not on the chrome) turn pages: proves pass-through
canvas.addEventListener('click', (e) => onCommand({ type: e.clientX > innerWidth / 2 ? 'next' : 'prev' }));

let vw = canvas.clientWidth;
let vh = canvas.clientHeight;
function resize() {
  vw = canvas.clientWidth;
  vh = canvas.clientHeight;
  stage.resize(vw, vh);
}
new ResizeObserver(resize).observe(canvas);
resize();

book.setOpened(Math.max(0, Math.min(LEAVES, +(q.get('spread') ?? 2))));
stage.rig.snap?.();
if (q.has('t')) {
  host.setPlaying(false);
  host.setTime(+q.get('t'));
} else if (q.get('play') === '0') host.setPlaying(false);
host.setLabels(state.labels);
sync();

// recto page rectangle in CSS px (bounding box of its projected corners)
const corners = [
  new THREE.Vector3(0, 0.03, -WORLD.pageH / 2),
  new THREE.Vector3(WORLD.pageW, 0.03, -WORLD.pageH / 2),
  new THREE.Vector3(0, 0.03, WORLD.pageH / 2),
  new THREE.Vector3(WORLD.pageW, 0.03, WORLD.pageH / 2),
];
const tmp = new THREE.Vector3();
const area = { x: 0, y: 0, w: 0, h: 0 };
function rectoArea() {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of corners) {
    tmp.copy(c);
    book.localToWorld(tmp);
    tmp.project(stage.camera);
    const x = (tmp.x * 0.5 + 0.5) * vw;
    const y = (-tmp.y * 0.5 + 0.5) * vh;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  area.x = x0;
  area.y = y0;
  area.w = x1 - x0;
  area.h = y1 - y0;
  return area;
}

const EMPTY = [];
const timer = new THREE.Timer();
renderer.setAnimationLoop((ts) => {
  timer.update(ts);
  const dt = Math.min(timer.getDelta(), 1 / 20);
  stage.update(dt);
  book.update(dt);
  host.update(dt);
  renderer.render(stage.scene, stage.camera);
  ui.setClock(host.time, DURATION, host.playing);
  const items = state.labels && !book.busy ? host.labelItems(stage.camera, vw, vh) : EMPTY;
  ui.renderLabels(items, rectoArea());
});

const open = q.get('open');
if (open) setTimeout(() => ui.open(open), 600);
window.harness = { ui, book, host, stage, renderer, backend, ready: Promise.all([...host.mounts.values()].map((m) => m.ready)) };
console.info(`[lamina] ui harness 3d on ${backend}`);
