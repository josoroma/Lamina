// Figure Lab: renders one figure exactly as the book hosts it (same fit,
// same ink context, same studio lights), on a flat recto page, with orbit
// controls, a small panel, and SVG/PNG export — the workbench every subject
// is built and reviewed in.
//
// URL: lab.html?type=snake&params={"species":"bothrops-asper"}&t=1.2&play=0
//        &explode=0&layers=skin:1,skeleton:0&labels=1&style=lithograph|engraving
//        &view=three-quarter|front|side|top|book|close &yaw=<rad> &bounds=1
//        &gl=webgl (force fallback)  &bg=page|white  &ui=0 (hide panel)
//        &lang=en|es (the figure's labels, layer names, beats and SVG key; the
//        panel itself is a developer surface and stays English)
//
// Automation: window.lab = { ready, host, mount, figure, renderer, scene, camera,
//   setTime, setExplode, setLayer, setLabels, setView, setStyle, setYaw, setBounds,
//   exportSVG(mode, opts) → string, exportPNG(opts) → Blob, info(), lang,
//   setLang(lang) (in place, like the reader's switch), i18n: { t, hasT, missing } }.
// info().strings lists the figure's English strings (the dictionary keys a
// translation must cover): { title, layers: [{ id, label, hint }], labels: [{ id,
// text, detail }], parts: [{ id, name, swatches: [name] }], beats: [text] } —
// parts also lists the names the SVG plate gives meshes outside every part
// (`generated: true`); info().missing lists those the lab's language lacks.
// `lab.ready` resolves (true) once the figure is built and has been drawn.
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRenderer } from '../engine/renderer.js';
import { FigureHost } from '../engine/figures/FigureHost.js';
import { FIGURE_AREA, FIGURE_DURATION } from '../engine/figures/contract.js';
import * as stageModule from '../engine/stage.js';
import { createLeafMaterial } from '../engine/book/paper.js';
import { exportFigureSVG, exportPNG, exportFileName, regionNames, downloadText, downloadBlob } from '../engine/export/index.js';
import { isLang, loadLang, setLang, getLang, t, tl, hasT } from '../i18n/index.js';

let resolveReady;
const lab = { ready: new Promise((r) => (resolveReady = r)) };
window.lab = lab; // (replaces the named-access <canvas id="lab"> immediately)

const q = new URLSearchParams(location.search);
// the language comes first: labels and beats are translated as they are built
const wantLang = q.get('lang');
if (isLang(wantLang)) {
  try {
    await loadLang(wantLang);
    setLang(wantLang);
  } catch (e) {
    console.error(`[lab] language "${wantLang}" failed to load; staying in English`, e);
  }
}
let lang = getLang();
const type = q.get('type') ?? 'demo';
let params = {};
try {
  params = JSON.parse(q.get('params') ?? '{}');
} catch (e) {
  console.error('[lab] bad params JSON', e);
}
let style = q.get('style') ?? params.style ?? (type === 'skull' ? 'engraving' : 'lithograph');
const { WORLD } = stageModule;

const canvas = document.querySelector('#lab');
const { renderer, backend } = await createRenderer(canvas);
const scene = new THREE.Scene();
scene.background = null; // pure white clear colour (backgrounds are tone-mapped)
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);

// ---- lights: the book's own rig when the stage exports it
const lights = (() => {
  try {
    if (typeof stageModule.createLights === 'function') return stageModule.createLights({ shadowMapSize: 2048 });
  } catch (e) {
    console.warn('[lab] createLights failed, using the local rig', e);
  }
  const hemi = new THREE.HemisphereLight(0xffffff, 0xefe9df, 1.85);
  const key = new THREE.DirectionalLight(0xfff4e6, 2.55);
  key.position.set(-1.6, 3.4, 1.4).multiplyScalar(1.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.006;
  key.shadow.radius = 3;
  Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2, near: 0.5, far: 9 });
  const rim = new THREE.DirectionalLight(0xeaf0ff, 0.45);
  rim.position.set(1.2, 1.5, -2.4);
  return { hemi, key, rim, list: [hemi, key, key.target, rim] };
})();
for (const o of lights.list) scene.add(o);

// ---- a flat stand-in for the book: one recto page lying at x ∈ [0, W]
const stub = new THREE.Group();
scene.add(stub);
const W = WORLD.pageW, H = WORLD.pageH;
const pageGeo = new THREE.PlaneGeometry(W, H).rotateX(-Math.PI / 2).translate(W / 2, 0, 0);
const page = new THREE.Mesh(pageGeo, createLeafMaterial({ paper: '#fbf8f1' }));
page.receiveShadow = true;
page.name = 'lab-page';
stub.add(page);
if (q.get('bg') === 'white') page.visible = false;

const fakeBook = Object.assign(stub, {
  rightLeaf: 0,
  leaves: [{ st: { p: 0 }, W, H }],
  leafFrame: (i, s, z) => ({ position: [s, 0, z], tangent: [1, 0, 0], normal: [0, 1, 0], angle: 0 }),
});

const host = new FigureHost({
  book: fakeBook,
  theme: { style, paper: '#fbf8f1', ink: '#1c1a17' },
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches && q.get('play') !== '1',
});
host.playing = q.get('play') !== '0' && !host.reducedMotion;
if (q.has('t')) host.setTime(+q.get('t'));

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
const focus = new THREE.Vector3(FIGURE_AREA.s * W, 0.22, FIGURE_AREA.z * H);
controls.target.copy(focus);

// ---- views. 'book' reproduces the reader's camera (spread framed edge to
// edge at the book's elevation) so hatch spacing and outline widths read
// exactly as they will on the page; the others frame the figure itself.
const VIEW_DIRS = {
  'three-quarter': [0.55, 0.62, 0.78],
  front: [0, 0.22, 1],
  side: [1, 0.22, 0],
  top: [0, 1, 0.04],
  close: [0.42, 0.5, 0.86],
};
const VIEWS = [...Object.keys(VIEW_DIRS).slice(0, 4), 'book', 'close'];
let currentView = q.get('view') ?? 'three-quarter';

function bookCameraPose(aspect) {
  const probe = new THREE.PerspectiveCamera(24, aspect, 0.05, 60);
  try {
    const rig = new stageModule.CameraRig(probe, { reducedMotion: true });
    rig.refit?.();
    rig.snap?.();
    probe.updateMatrixWorld();
    return { fov: 24, position: probe.position.clone(), target: rig.target?.clone?.() ?? new THREE.Vector3() };
  } catch (e) {
    // fallback: 45° elevation, spread (2.06 wide) spanning 95% of the width
    const el = THREE.MathUtils.degToRad(45);
    const halfW = (W + WORLD.coverOverhang) / 0.95;
    const dist = halfW / Math.tan(THREE.MathUtils.degToRad(12)) / Math.max(aspect, 0.5);
    return { fov: 24, position: new THREE.Vector3(0, Math.sin(el) * dist, Math.cos(el) * dist), target: new THREE.Vector3() };
  }
}

function setView(name = 'three-quarter') {
  currentView = name;
  if (name === 'book') {
    const pose = bookCameraPose(camera.aspect);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    camera.position.copy(pose.position);
    controls.target.copy(pose.target);
    controls.update();
    return;
  }
  camera.fov = 30;
  camera.updateProjectionMatrix();
  const dir = new THREE.Vector3(...(VIEW_DIRS[name] ?? VIEW_DIRS['three-quarter'])).normalize();
  const target = host.focusPoint?.(new THREE.Vector3(), 0) ?? focus.clone();
  const r = host.figureRadius?.(0) || 0.3;
  const fit = name === 'close' ? 0.72 : 1.12;
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const dist = (r * fit) / Math.sin(Math.min(vfov, hfov) / 2);
  camera.position.copy(target).addScaledVector(dir, dist);
  controls.target.copy(target);
  controls.update();
}

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}
new ResizeObserver(() => {
  resize();
  if (currentView === 'book') setView('book');
}).observe(canvas);
resize();
{
  // frame something while the figure builds; the requested view applies once it exists
  const requested = currentView;
  setView(requested === 'book' ? 'book' : 'three-quarter');
  currentView = requested;
}

// ---- render loop starts before the figure is built (shows the placeholder)
let mount = null;
let figure = null;
const panel = document.querySelector('#panel');
if (q.get('ui') === '0') panel.style.display = 'none';
const labelLayer = document.querySelector('#labels');
let labelsOn = q.get('labels') !== '0';
let boundsHelper = null;
let fpsAcc = 0, fpsFrames = 0, fps = 0;
let framesDrawn = 0;
const timer = new THREE.Timer();
renderer.setAnimationLoop((ts) => {
  timer.update(ts);
  const raw = timer.getDelta();
  const dt = Math.min(raw, 1 / 20);
  fpsAcc += raw;
  fpsFrames++;
  if (fpsAcc > 0.5) {
    fps = fpsFrames / fpsAcc;
    fpsAcc = 0;
    fpsFrames = 0;
    const el = panel.querySelector('#fps');
    if (el) el.textContent = `${fps.toFixed(0)} fps`;
  }
  host.update(dt);
  controls.update();
  renderer.render(scene, camera);
  framesDrawn++;
  drawLabels();
  const to = panel.querySelector('#to');
  if (to) to.textContent = host.time.toFixed(2) + 's';
  const tr = panel.querySelector('#t');
  if (tr && host.playing) tr.value = host.time;
  const beat = panel.querySelector('.beats');
  if (beat && mount?.figure) {
    const b = host.currentBeat(0);
    const idx = b?.index ?? -1;
    if (beat.dataset.idx !== String(idx)) {
      beat.dataset.idx = String(idx);
      beat.querySelectorAll('[data-beat]').forEach((el) => el.classList.toggle('on', +el.dataset.beat === idx));
    }
  }
});

// ---- mount (lab-only subjects resolve here instead of the registry)
const LAB_SUBJECTS = { patterns: () => import('./patterns-subject.js') };
const factory = LAB_SUBJECTS[type] ? (await LAB_SUBJECTS[type]()).createFigure : undefined;
await host.mount(0, { type, params, style, factory, yaw: q.has('yaw') ? +q.get('yaw') : 0 });
mount = host.get(0);
figure = mount?.figure ?? null;
if (mount) {
  // the workbench shows the figure standing (no pop-up spring), so automation
  // and exports never catch it mid-fold
  mount.foldValue = 1;
  mount.foldVel = 0;
}

if (q.has('explode') && mount) {
  mount.explodeTarget = mount.explode = +q.get('explode');
  figure?.setExplode?.(mount.explode);
}
if (q.has('layers') && figure) {
  const fade = host.layerFade;
  host.layerFade = 0; // URL state applies instantly
  for (const kv of q.get('layers').split(',')) {
    const [id, v] = kv.split(':');
    host.setLayer(id, v !== '0', 0);
  }
  host.layerFade = fade;
}
host.update(0);
setView(currentView);
setBounds(q.get('bounds') === '1');

// ---- labels (simple overlay; the book uses the UI agent's labels)
function drawLabels() {
  if (!labelsOn || !mount?.figure) {
    if (labelLayer.childElementCount) labelLayer.replaceChildren();
    return;
  }
  const r = canvas.getBoundingClientRect();
  const items = host.labelItems(camera, r.width, r.height);
  while (labelLayer.childElementCount < items.length) {
    const el = document.createElement('div');
    el.className = 'lab-label';
    el.innerHTML = '<i></i><span></span>';
    labelLayer.appendChild(el);
  }
  while (labelLayer.childElementCount > items.length) labelLayer.lastChild.remove();
  items.forEach((it, i) => {
    const el = labelLayer.children[i];
    el.style.transform = `translate(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px)`;
    el.style.display = it.inFront ? '' : 'none';
    el.classList.toggle('occluded', it.occluded);
    // the label's mark, as the reader draws it: a dot, a ring round the
    // feature (it.r: its radius on screen) or nothing (a tick) — always a
    // tick on a head under 40 px (it.headPx; labels.js FACE_MIN)
    const ring = it.mark === 'ring' && it.r >= 2.5 && !(it.headPx < 40) ? Math.round((it.r + 1.5) * 2) : 0;
    const mark = ring ? `ring:${ring}` : it.mark;
    if (el.dataset.mark !== mark) {
      el.dataset.mark = mark;
      el.firstChild.style.cssText = ring
        ? `width:${ring}px;height:${ring}px;margin:${-ring / 2}px 0 0 ${-ring / 2}px;background:none;border:1px solid var(--accent);box-shadow:none;box-sizing:border-box`
        : it.mark === 'dot' ? '' : 'visibility:hidden';
    }
    const span = el.lastChild;
    if (span.textContent !== it.text) span.textContent = it.text;
  });
}

// ---- bounds box (figure fit box, drawn in the host's fit space)
function setBounds(on) {
  if (boundsHelper) {
    boundsHelper.removeFromParent();
    boundsHelper.geometry.dispose();
    boundsHelper.material.dispose();
    boundsHelper = null;
  }
  if (!on || !mount?.box) return;
  boundsHelper = new THREE.Box3Helper(mount.box.clone(), 0xc0392b);
  boundsHelper.name = 'lab-bounds';
  mount.fit.add(boundsHelper);
}

// ---- export
async function labExportSVG(mode = 'color', opts = {}) {
  if (!mount?.figure) throw new Error('no figure to export');
  return exportFigureSVG({
    renderer,
    mount,
    camera,
    mode,
    width: opts.width ?? 1600,
    title: opts.title ?? mount.figure.title,
    caption: opts.caption ?? (host.beats(0)[0]?.text ?? ''),
    credit: opts.credit ?? 'Lámina · Figure Lab',
    labels: opts.labels ?? labelsOn,
    keep: opts.keep, // ids of labels kept (hollow) when hidden: a plate's look-closer notes
    detail: opts.detail,
    lang: opts.lang ?? lang,
  });
}
async function labExportPNG(opts = {}) {
  return exportPNG({ renderer, scene, camera, width: opts.width ?? 2400 });
}

// ---- panel
function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
function buildPanel() {
  const f = mount?.figure;
  const beats = host.beats(0);
  panel.innerHTML = `
    <h1>${esc(f?.title ?? type)} <small>${backend} · <span id="fps">–</span></small></h1>
    ${mount?.error ? `<p class="err">${esc(mount.error.message)}</p>` : ''}
    <label>time <output id="to"></output><input id="t" type="range" min="0" max="${FIGURE_DURATION}" step="0.01" value="${host.time}"></label>
    <div class="row"><button id="play">${host.playing ? 'pause' : 'play'}</button>
      <label class="inline"><input id="lb" type="checkbox" ${labelsOn ? 'checked' : ''}> labels</label>
      <label class="inline"><input id="bx" type="checkbox" ${boundsHelper ? 'checked' : ''}> bounds</label></div>
    <label>explode <input id="ex" type="range" min="0" max="1" step="0.01" value="${mount?.explodeTarget ?? 0}"></label>
    <label>style <select id="st"><option value="lithograph">lithograph</option><option value="engraving" ${style === 'engraving' ? 'selected' : ''}>engraving</option></select></label>
    <label>style mix <input id="sm" type="range" min="0" max="1" step="0.01" value="${mount?.ctx.u.styleMix.value ?? 0}"></label>
    <fieldset><legend>layers</legend>${(f?.layers ?? [])
      .map((l) => `<label title="${esc(l.hint ? t(l.hint) : '')}"><input type="checkbox" data-layer="${esc(l.id)}" ${mount.layers[l.id] !== false ? 'checked' : ''}> ${esc(l.label ? t(l.label) : l.id)}</label>`)
      .join('') || '<i>none</i>'}</fieldset>
    <fieldset><legend>view</legend>${VIEWS.map((v) => `<button data-view="${v}">${v}</button>`).join('')}</fieldset>
    <fieldset><legend>export</legend>
      <button data-export="color">SVG colour</button><button data-export="line">SVG line</button><button data-export="png">PNG</button></fieldset>
    <div class="beats">${beats.map((b, i) => `<p data-beat="${i}"><b>${b.t.toFixed(1)}s</b> ${esc(b.text)}</p>`).join('')}</div>`;
  const $ = (s) => panel.querySelector(s);
  $('#t').oninput = (e) => {
    host.setPlaying(false);
    host.setTime(+e.target.value);
    syncPlay();
  };
  $('#play').onclick = () => {
    host.setPlaying(!host.playing);
    syncPlay();
  };
  $('#ex').oninput = (e) => host.setExplode(+e.target.value, 0);
  $('#lb').onchange = (e) => (labelsOn = e.target.checked);
  $('#bx').onchange = (e) => setBounds(e.target.checked);
  $('#st').onchange = (e) => {
    labApi.setStyle(e.target.value);
    $('#sm').value = mount.ctx.u.styleMix.value;
  };
  $('#sm').oninput = (e) => mount && (mount.ctx.u.styleMix.value = +e.target.value);
  panel.querySelectorAll('[data-layer]').forEach((el) => (el.onchange = () => host.setLayer(el.dataset.layer, el.checked, 0)));
  panel.querySelectorAll('[data-view]').forEach((el) => (el.onclick = () => setView(el.dataset.view)));
  panel.querySelectorAll('[data-export]').forEach((el) => {
    el.onclick = async () => {
      const mode = el.dataset.export;
      el.disabled = true;
      try {
        const plate = params.species ?? params.lesson ?? null;
        if (mode === 'png') downloadBlob(exportFileName({ book: type, plate, kind: 'png', lang }), await labExportPNG());
        else downloadText(exportFileName({ book: type, plate, kind: mode, lang }), await labExportSVG(mode), 'image/svg+xml');
      } catch (err) {
        console.error('[lab] export failed', err);
      } finally {
        el.disabled = false;
      }
    };
  });
}
function syncPlay() {
  const b = panel.querySelector('#play');
  if (b) b.textContent = host.playing ? 'pause' : 'play';
}
buildPanel();

const labApi = {
  host,
  mount,
  figure,
  renderer,
  scene,
  camera,
  controls,
  setTime: (t) => {
    host.setPlaying(false);
    host.setTime(t);
    syncPlay();
  },
  setExplode: (a) => {
    host.setExplode(a, 0);
    if (mount) mount.explode = a;
    figure?.setExplode?.(a);
  },
  setLayer: (id, v) => host.setLayer(id, v, 0),
  setLabels: (v) => (labelsOn = v),
  setView,
  setStyle: (s) => {
    style = s;
    if (mount) mount.ctx.u.styleMix.value = s === 'engraving' ? 1 : 0;
  },
  setYaw: (rad) => host.setYaw(rad, 0, true),
  setBounds,
  exportSVG: labExportSVG,
  exportPNG: labExportPNG,
  /**
   * Switch the lab's language in place, as the reader does: the figure
   * stays mounted (time, layers, explode, view kept); labels, layer names,
   * beats and the next export follow.
   * @param {'en'|'es'} next
   */
  setLang: async (next) => {
    if (!isLang(next)) throw new Error(`[lab] unknown language "${next}"`);
    await loadLang(next);
    setLang(next);
    lang = next;
    host.relocalize();
    buildPanel();
  },
  i18n: {
    /** The lab language's translation of an English figure string. */
    t: (key, vars) => tl(lang, key, vars),
    hasT: (key) => hasT(key, lang),
    /** Figure strings (info().strings) the lab language's dictionaries lack. */
    missing: () => missingStrings(),
  },
  info: () => ({
    backend,
    type,
    params,
    lang,
    title: figure?.title,
    layers: figure?.layers,
    labels: figure?.labels?.map((l) => l.id),
    parts: figure?.parts?.map((p) => p.id),
    fitScale: mount?.fitScale,
    box: mount?.box,
    error: mount?.error?.message,
    fps,
    view: currentView,
    strings: figureStrings(),
    missing: missingStrings(),
  }),
};

/**
 * The figure's own English strings — the keys its translation must cover
 * (see the header): what the reader shows (labels, layers), what the SVG
 * plate prints (part and colour names, generated names included) and the
 * figure's beats (shown when a manifest has none, and here). The title is a
 * developer label (lab header, lamina.info()), listed for completeness.
 */
function figureStrings() {
  const f = figure;
  if (!f) return null;
  const parts = (f.parts ?? []).map((p) => ({
    id: p.id,
    name: p.name ?? p.id,
    swatches: Array.isArray(p.swatches) ? p.swatches.filter((s) => s?.name).map((s) => s.name) : [],
  }));
  const named = new Set(parts.map((p) => p.name));
  for (const name of regionNames(f)) if (!named.has(name)) parts.push({ id: null, name, swatches: [], generated: true });
  return {
    title: f.title ?? '',
    layers: (f.layers ?? []).map((l) => ({ id: l.id, label: l.label ?? '', hint: l.hint ?? '' })),
    labels: (f.labels ?? []).map((l) => ({ id: l.id, text: l.text ?? '', detail: l.detail ?? '' })),
    parts,
    beats: (f.beats ?? []).map((b) => String(Array.isArray(b) ? b[1] : b.text ?? '')),
  };
}

/** Keys of figureStrings() the lab's language has no translation for (none in English). */
function missingStrings() {
  const s = figureStrings();
  if (!s || lang === 'en') return [];
  const keys = new Set();
  const add = (k) => k && keys.add(k);
  for (const l of s.layers) {
    add(l.label);
    add(l.hint);
  }
  for (const l of s.labels) {
    add(l.text);
    add(l.detail);
  }
  for (const p of s.parts) {
    add(p.name);
    p.swatches.forEach(add);
  }
  s.beats.forEach(add);
  return [...keys].filter((k) => !hasT(k, lang));
}
Object.assign(lab, labApi);
Object.defineProperty(lab, 'lang', { get: () => lang, enumerable: true });
// ready after two drawn frames with the figure in place
const startFrames = framesDrawn;
await new Promise((r) => {
  const check = () => (framesDrawn - startFrames >= 2 ? r() : requestAnimationFrame(check));
  check();
});
resolveReady(true);
console.info(`[lab] ${type} ready on ${backend}`, figure ? '' : `(error: ${mount?.error?.message})`);
