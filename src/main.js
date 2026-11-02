// Skeleton bootstrap (replaced by the full App during integration).
import * as THREE from 'three/webgpu';
import { createRenderer } from './engine/renderer.js';
import { createStage } from './engine/stage.js';
import { Book } from './engine/book/Book.js';
import { FigureHost } from './engine/figures/FigureHost.js';
import { placeholderPage, placeholderCover } from './app/placeholder.js';

const canvas = document.querySelector('#stage');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const { renderer, backend } = await createRenderer(canvas);
const stage = createStage(renderer, { reducedMotion });

const LEAVES = 8;
const book = new Book({ leafCount: LEAVES, theme: { cloth: '#23412f' } });
stage.world.add(book);
book.setLeafTexture(0, 'front', placeholderCover('Serpientes'));
for (let i = 0; i < LEAVES; i++) {
  if (i > 0) book.setLeafTexture(i, 'front', placeholderPage(`p. ${i * 2 - 1}`, { side: 'recto' }));
  book.setLeafTexture(i, 'back', placeholderPage(`p. ${i * 2}`, { side: 'verso' }));
}

const host = new FigureHost({ book, theme: { style: 'lithograph', paper: '#fbf8f1', ink: '#1c1a17' }, reducedMotion });
host.mount(2, { type: 'demo', params: {} });
host.mount(4, { type: 'demo', params: { color: '#c0533a' } });

book.setOpened(2);

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  stage.resize(w, h);
}
new ResizeObserver(resize).observe(canvas);
resize();
stage.rig.snap();

addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') book.next();
  if (e.key === 'ArrowLeft') book.prev();
});
canvas.addEventListener('click', (e) => {
  if (e.clientX > innerWidth / 2) book.next();
  else book.prev();
});

const timer = new THREE.Timer();
renderer.setAnimationLoop((ts) => {
  timer.update(ts);
  const dt = Math.min(timer.getDelta(), 1 / 20);
  stage.update(dt);
  book.update(dt);
  host.update(dt);
  renderer.render(stage.scene, stage.camera);
});

window.lamina = { renderer, backend, stage, book, host, THREE };
console.info(`[lamina] backend: ${backend}`);
