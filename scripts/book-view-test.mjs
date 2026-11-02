#!/usr/bin/env node
// Real camera/input modules; synthetic canvas events keep the gesture cases
// deterministic without a GPU. Browser QA covers the rendered book and UI.
import assert from 'node:assert/strict';
import * as THREE from 'three/webgpu';
import { CameraRig } from '../src/engine/stage.js';
import { createInput } from '../src/engine/input.js';

const rad = THREE.MathUtils.degToRad;
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-7, message ?? `${actual} ≠ ${expected}`);
const tests = [];
const test = (name, run) => tests.push({ name, run });
const savedRAF = globalThis.requestAnimationFrame;
const savedCancelRAF = globalThis.cancelAnimationFrame;
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};

function cameraRig(aspect = 1.6, reducedMotion = false) {
  const camera = new THREE.PerspectiveCamera(24, aspect, 0.05, 60);
  return new CameraRig(camera, { reducedMotion });
}

function inputHarness() {
  const handlers = new Map();
  const canvas = {
    style: {}, clientHeight: 800,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 800 }),
    addEventListener: (name, handler) => handlers.set(name, handler),
    removeEventListener: (name) => handlers.delete(name),
    setPointerCapture() {}, releasePointerCapture() {},
  };
  const rig = cameraRig(1.5);
  const calls = { navigate: [], taps: [], turns: 0, dragMoves: 0, releases: 0, cancels: 0, rotations: [] };
  const hit = { leaf: 0, side: 'front', s: 0.7, z: 0, u: 0.7, v: 0.5, point: new THREE.Vector3(0.7, 0, 0) };
  let onPage = false, onFigure = false, besideFigure = false;
  const book = new THREE.Group();
  Object.assign(book, {
    leaves: [{ phys: 'R' }], rightLeaf: 0,
    pick: () => onPage ? hit : null,
    surfaceY: () => 0,
    beginDrag: () => { calls.turns++; return true; },
    dragTo: () => calls.dragMoves++,
    endDrag: () => calls.releases++,
    cancelDrag: () => calls.cancels++,
    canNext: () => true, canPrev: () => true,
  });
  const host = {
    active: null,
    pickFigure: () => onFigure ? { point: new THREE.Vector3(), distance: 1 } : null,
    rotateActive: (amount) => calls.rotations.push(amount),
  };
  const input = createInput({ canvas, stage: { camera: rig.camera, rig }, book, host,
    onNavigate: (dir, how) => calls.navigate.push({ dir, how }),
    onTap: (tap) => calls.taps.push(tap), nearFigure: () => besideFigure,
  });
  const send = (type, x, y, extras = {}) => handlers.get(`pointer${type}`)?.({
    pointerId: 1, pointerType: 'mouse', button: 0, clientX: x, clientY: y,
    preventDefault() {}, ...extras,
  });
  return {
    rig, calls, input, send,
    page(on) { onPage = on; },
    figure(on, nearMiss = false) {
      onFigure = on; besideFigure = nearMiss;
      host.active = on || nearMiss ? { figure: {}, anchor: { visible: true }, foldValue: 1 } : null;
    },
  };
}

test('reading angle is bounded, ignores invalid values and resets to the original view', () => {
  const rig = cameraRig();
  near(rig.currentElevation, rad(45));
  rig.setBookTilt(2); rig.snap();
  near(rig.bookTilt, 1); near(rig.currentElevation, rad(89));
  rig.setBookTilt(NaN); near(rig.bookTilt, 1);
  rig.setBookTilt(-3); rig.snap();
  near(rig.bookTilt, 0); near(rig.currentElevation, rad(45));
  rig.setBookTilt(0.7); rig.zoomBy(2); rig.pan(0.2, 0.1);
  rig.reset(); rig.snap();
  near(rig.bookTilt, 0); near(rig.currentElevation, rad(45));
  assert.equal(rig.zoom, 1); assert.equal(rig.panOffset.length(), 0);
});

test('portrait tilt has no dead zone and survives viewport rotation', () => {
  const rig = cameraRig(0.5);
  near(rig.currentElevation, rad(58));
  rig.setBookTilt(0.5); rig.snap(); near(rig.currentElevation, rad(73.5));
  rig.camera.aspect = 1.6; rig.refit(); rig.snap();
  near(rig.bookTilt, 0.5); near(rig.currentElevation, rad(67));
  rig.camera.aspect = 0.5; rig.refit(); rig.snap();
  near(rig.currentElevation, rad(73.5));
  rig.setBookTilt(1); rig.snap(); near(rig.currentElevation, rad(89));
});

test('frontal and intermediate views keep all framed book corners visible', () => {
  for (const aspect of [0.5, 1, 1.6, 2.4]) {
    const rig = cameraRig(aspect);
    rig.focusPage('spread');
    rig.viewHeight = 800;
    rig.setInsets({ top: 65, bottom: 125 });
    for (const amount of [0, 0.5, 1]) {
      rig.setBookTilt(amount); rig.snap();
      const b = rig.fitBox;
      for (let n = 0; n < 8; n++) {
        const p = new THREE.Vector3(n & 1 ? b.max.x : b.min.x, n & 2 ? b.max.y : b.min.y, n & 4 ? b.max.z : b.min.z).project(rig.camera);
        assert.ok(Number.isFinite(p.x + p.y + p.z));
        assert.ok(Math.abs(p.x) <= 0.951 && p.y < 0.84 && p.y > -0.69 && p.z > -1 && p.z < 1,
          `clipped corner at aspect ${aspect}, tilt ${amount}: ${p.toArray()}`);
      }
    }
  }
});

test('reduced motion applies a manual reading angle immediately', () => {
  const rig = cameraRig(1.6, true);
  rig.setBookTilt(1);
  near(rig.currentElevation, rad(89));
});

test('background drag remains a tilt when crossing onto the book', (h) => {
  h.send('down', 30, 600);
  h.page(true);
  h.send('move', 500, 460);
  assert.ok(h.rig.bookTilt > 0.4 && h.rig.bookTilt < 0.6);
  h.send('move', 600, 200);
  near(h.rig.bookTilt, 1);
  h.send('up', 600, 200);
  assert.equal(h.calls.turns, 0); assert.equal(h.calls.taps.length, 0);
  assert.deepEqual(h.calls.navigate, []); assert.deepEqual(h.calls.rotations, []);
  h.page(false);
  h.send('down', 30, 200); h.send('move', 30, 700); h.send('up', 30, 700);
  near(h.rig.bookTilt, 0);
});

test('page drags and page taps retain their original meaning', (h) => {
  h.page(true);
  h.send('down', 900, 500); h.send('move', 900, 300); h.send('up', 900, 300);
  near(h.rig.bookTilt, 0); assert.equal(h.calls.turns, 0);
  h.send('down', 900, 500); h.send('up', 900, 500);
  assert.equal(h.calls.taps[0].kind, 'page');
  h.send('down', 900, 500); h.send('move', 600, 500); h.send('up', 600, 500);
  assert.equal(h.calls.turns, 1); assert.equal(h.calls.releases, 1);
  near(h.rig.bookTilt, 0);
});

test('figure hits and near misses keep rotating the figure', (h) => {
  for (const nearMiss of [false, true]) {
    h.figure(!nearMiss, nearMiss);
    h.send('down', 900, 500); h.send('move', 950, 300); h.send('up', 950, 300);
  }
  assert.equal(h.calls.rotations.length, 2);
  assert.ok(h.calls.rotations.every((x) => x > 0));
  near(h.rig.bookTilt, 0); assert.equal(h.calls.turns, 0);
});

test('touch margin swipes navigate without changing the reading angle', (h) => {
  const touch = { pointerType: 'touch' };
  h.send('down', 700, 600, touch); h.send('move', 300, 600, touch); h.send('up', 300, 600, touch);
  assert.deepEqual(h.calls.navigate, [{ dir: 1, how: 'swipe' }]);
  h.send('down', 30, 600, touch); h.send('move', 30, 300, touch); h.send('up', 30, 300, touch);
  near(h.rig.bookTilt, 0);
});

test('zoomed paper still pans; only unmodified background drag tilts', (h) => {
  h.rig.zoomBy(2);
  h.page(true);
  h.send('down', 900, 500); h.send('move', 800, 400); h.send('up', 800, 400);
  assert.ok(h.rig.panOffset.length() > 0); near(h.rig.bookTilt, 0);
  h.page(false);
  const before = h.rig.panOffset.clone();
  h.send('down', 30, 500, { shiftKey: true });
  h.send('move', 100, 400, { shiftKey: true }); h.send('up', 100, 400, { shiftKey: true });
  assert.ok(h.rig.panOffset.distanceTo(before) > 0); near(h.rig.bookTilt, 0);
  h.send('down', 30, 500); h.send('move', 30, 300); h.send('up', 30, 300);
  assert.ok(h.rig.bookTilt > 0.5); assert.equal(h.calls.turns, 0);
});

test('inspect orbit remains separate from the remembered book angle', (h) => {
  h.rig.setBookTilt(0.4);
  h.rig.inspect(new THREE.Vector3(), 1.2, { elevation: 0.6 });
  h.send('down', 30, 400); h.send('move', 30, 500); h.send('up', 30, 500);
  assert.ok(h.rig.inspectState.elevation > 0.6); near(h.rig.bookTilt, 0.4);
  h.rig.exitInspect(); h.rig.snap(); near(h.rig.currentElevation, rad(45 + 44 * 0.4));
});

test('cancel and disabled input end a background gesture without a page action', (h) => {
  h.send('down', 30, 600); h.send('move', 30, 500); h.send('cancel', 30, 500);
  const afterCancel = h.rig.bookTilt;
  h.send('move', 30, 200); h.send('up', 30, 200); near(h.rig.bookTilt, afterCancel);
  h.send('down', 30, 600); h.input.setEnabled(false);
  h.send('move', 30, 200); h.send('up', 30, 200); near(h.rig.bookTilt, afterCancel);
  assert.equal(h.calls.turns, 0); assert.deepEqual(h.calls.taps, []); assert.deepEqual(h.calls.navigate, []);
});

let passed = 0;
try {
  for (const { name, run } of tests) {
    const h = inputHarness();
    try { run(h); console.log(`✓ ${name}`); passed++; }
    finally { h.input.dispose(); }
  }
  console.log(`${passed} book-view checks passed.`);
} finally {
  if (savedRAF) globalThis.requestAnimationFrame = savedRAF; else delete globalThis.requestAnimationFrame;
  if (savedCancelRAF) globalThis.cancelAnimationFrame = savedCancelRAF; else delete globalThis.cancelAnimationFrame;
}
