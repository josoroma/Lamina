// FigureHost: stands pop-up figures on recto pages, folds them flat as their
// page lifts (like a paper pop-up), drives the shared 5-second loop clock,
// and owns per-figure interaction state (turntable yaw, explode, layers,
// labels). It never knows what a figure depicts — only the Figure contract.
//
// Besides hosting, it answers the questions the reader and the exporter ask
// about the figure on the visible recto: where is it (focusPoint/
// figureRadius, and regionSphere: the head a face label points into), what
// is under the pointer (pickFigure), where do its labels sit on screen and
// are they hidden behind the figure (activeLabels/labelItems), which
// narrated beat is playing (beats/currentBeat). Layer toggles dissolve in and
// out like ink lifting off the page instead of popping.
//
// Figure strings stay English in the subjects; the host translates them on
// their way out (label text and detail, a figure's own beats, the error
// notice) with the live language, memoised per label so a frame allocates
// nothing. A language switch calls relocalize() and setBeats(); nothing is
// remounted, so time, layers, explode, yaw and labels are kept.
import * as THREE from 'three/webgpu';
import { uv, float, smoothstep, exp, time, color as tslColor } from 'three/tsl';
import { createFigureContext, setFade, calibrateInk, measureLightRig } from '../../kits/ink/index.js';
import { loadFigureFactory } from '../../subjects/index.js';
import { t, getLang } from '../../i18n/index.js';
import { FIGURE_AREA, FIGURE_DURATION } from './contract.js';
import { mirrorAnchor, viewAspect } from './mirror.js';
import { damp, smoothstep as smooth, clamp } from '../util/math.js';

/** Seconds a layer takes to dissolve in or out. */
const LAYER_FADE = 0.38;
/** Most labels whose occlusion is re-tested per call of activeLabels (amortised raycasts). */
const OCCLUSION_CHECKS_PER_FRAME = 3;
/**
 * Average time budget for those raycasts (ms per frame). A figure whose single
 * ray costs more (dense sculpted meshes) is tested every few frames instead,
 * and nothing is tested while the camera, clock and figure stand still.
 */
const OCCLUSION_BUDGET_MS = 1.2;

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _box = new THREE.Box3();
const _box2 = new THREE.Box3();
const _mInv = new THREE.Matrix4();
const _mRel = new THREE.Matrix4();
const _hits = [];
const _occluders = [];
const _pickRays = [];
/** Signature compare for the occlusion cache (NaN ≠ anything). */
const differs = (a, b) => !(Math.abs(a - b) <= 1e-6);

export class FigureHost {
  /**
   * @param {object} o
   * @param {import('../book/Book.js').Book} o.book
   * @param {object} o.theme  book theme (style, paper, ink, quality)
   * @param {boolean} [o.reducedMotion]
   * @param {Function} [o.contextFactory]  FigureContext factory (default: ink kit)
   * @param {number} [o.layerFade=0.38]  seconds for layer dissolves (0 = instant)
   */
  constructor({ book, theme = {}, reducedMotion = false, contextFactory = createFigureContext, layerFade = LAYER_FADE }) {
    this.book = book;
    this.theme = theme;
    this.reducedMotion = reducedMotion;
    this.contextFactory = contextFactory;
    this.layerFade = layerFade;
    this.mounts = new Map(); // leafIndex → mount
    this.time = 0;
    this.playing = !reducedMotion;
    this.speed = 1;
    this.listeners = new Map();
    this._raycaster = new THREE.Raycaster();
    this._labelPool = [];
    this._labelOut = [];
    this._occlCursor = 0;
    this._lastBeat = { leaf: -1, index: -1 };
    this._calibT = 0;
    this._rig = null;
    this._labelText = new WeakMap(); // label → { lang, src, srcDetail, text, detail }
    this._labelSides = null; // label id → the column its pill is drawn in (setLabelSides)
    this._centreX = NaN; // the active figure's centre on screen (view units, see activeLabels)
    this._way = { x: 0, y: 0 };
    // where a face label's leader leaves the head (mirror.js): towards its
    // pill's column — the UI's, else the side of the figure's centre the head
    // lies on, where the key's columns put a label's pill (ui/labels.js); a
    // pill in a row above or below takes no side
    this._wayOut = (l, x, y, half) => {
      const side = this._labelSides?.(l.id);
      if (side === 0) return null;
      let dir = side === -1 || side === 1 ? side : 0;
      if (!dir) {
        const d = x - this._centreX;
        if (!(Math.abs(d) > half)) return null; // the head straddles the centre (or none known)
        dir = Math.sign(d);
      }
      this._way.x = dir;
      this._way.y = 0;
      return this._way;
    };
  }

  /**
   * Tell the host where the UI draws each label's pill, so a face label seen
   * face-on points at the feature on that side of the head (its leader then
   * never crosses the face): `sides(id)` → −1 the left column, 1 the right
   * one, 0 a row above or below (the feature facing the camera will do);
   * anything else is not known, and the host takes the column the key would
   * choose, by the side of the figure's centre the head lies on. Called once;
   * the function is asked every frame, so it must not allocate.
   * @param {((id: string) => number)|null} sides
   */
  setLabelSides(sides) {
    this._labelSides = typeof sides === 'function' ? sides : null;
  }

  /**
   * Fit every mounted figure's hatch thresholds to the lights currently in
   * the book's scene (runs on mount and about once a second).
   */
  calibrateInk() {
    let scene = this.book;
    while (scene?.parent) scene = scene.parent;
    const rig = measureLightRig(scene);
    if (!rig) return;
    this._rig = rig;
    for (const m of this.mounts.values()) calibrateInk(m.ctx, rig);
  }

  on(name, fn) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(fn);
    return () => this.listeners.get(name).delete(fn);
  }
  emit(name, p) {
    this.listeners.get(name)?.forEach((fn) => fn(p));
  }

  // ---------------------------------------------------------------- mounting

  /**
   * Mount (or reuse) the figure for a leaf. Resolves with the Figure when it
   * is built (null on error or if it was unmounted meanwhile). While it builds,
   * a printed shimmer ellipse marks the stage; on error a quiet notice does.
   * @param {number} leafIndex
   * @param {{ type: string, params?: object, style?: string, yaw?: number, scale?: number,
   *           area?: object, factory?: Function, beats?: Array }} spec
   *        `factory` (optional) bypasses the subject registry (lab subjects).
   * @returns {Promise<object|null>}
   */
  async mount(leafIndex, spec) {
    if (this.mounts.has(leafIndex)) return this.mounts.get(leafIndex).ready;
    const anchor = new THREE.Group();
    anchor.name = `figure-anchor-${leafIndex}`;
    const fold = new THREE.Group();
    const yaw = new THREE.Group();
    const fit = new THREE.Group();
    anchor.add(fold);
    fold.add(yaw);
    yaw.add(fit);
    anchor.visible = false;
    this.book.add(anchor);
    const ctx = this.contextFactory({
      style: spec.style ?? this.theme.style ?? 'lithograph',
      palette: { paper: this.theme.paper, ink: this.theme.ink },
      quality: this.theme.quality ?? 'high',
    });
    const m = {
      leafIndex,
      spec,
      anchor,
      fold,
      yaw,
      fit,
      ctx,
      figure: null,
      foldValue: 0,
      foldVel: 0,
      yawValue: spec.yaw ?? 0,
      yawTarget: spec.yaw ?? 0,
      explode: 0,
      explodeTarget: 0,
      layers: {},
      labels: true,
      error: null,
      placeholder: null,
      fades: new Map(), // layerId → { objects, value, target }
      partOf: new Map(), // Object3D → part
      pickables: null, // cached visible meshes (rebuilt on layer changes)
      occluded: new Map(), // label → boolean
      facing: new Map(), // label with an `alt` anchor → the anchor in use (camera side)
      hiddenSides: new Map(), // label with an `alt` anchor → its anchors found hidden from this view (_updateOcclusion)
      hiddenView: null, // { pos, fwd, yaw, explode } the view those were found from
      heads: null, // label → the head its anchor hangs in (regionSphere, figures that declare no regions)
      region: null, // the last region answered (reused: a close-up asks every frame)
      state: { explode: 0, layers: null, labels: true, playing: true, reducedMotion: this.reducedMotion, phase: 0 },
      box: null,
      fitScale: 1,
      disposed: false,
    };
    m.state.layers = m.layers;
    m.placeholder = makeBuildingPlaceholder(this.theme, this.reducedMotion);
    anchor.add(m.placeholder);
    this.mounts.set(leafIndex, m);
    m.ready = (async () => {
      let figure = null;
      try {
        const factory = spec.factory ?? (await loadFigureFactory(spec.type));
        figure = await factory(spec.params ?? {}, ctx);
        if (this.mounts.get(leafIndex) !== m) {
          safeDispose(figure);
          disposeTree(figure.root);
          return null;
        }
        if (!figure?.root) throw new Error(`Figure "${spec.type}" returned no root`);
        m.figure = figure;
        for (const l of figure.layers ?? []) m.layers[l.id] = l.visible !== false;
        fit.add(figure.root);
        figure.root.traverse((o) => {
          if (o.isMesh && !o.userData.isOutline && !o.userData.isInkLine) {
            o.castShadow = o.userData.castShadow ?? true;
            o.receiveShadow = o.userData.receiveShadow ?? true;
          }
        });
        for (const part of figure.parts ?? []) if (part.object) m.partOf.set(part.object, part);
        this._basePositions(m);
        this._fit(m);
        this._place(m);
        if (this._rig) calibrateInk(ctx, this._rig);
        else this.calibrateInk();
        for (const [id, v] of Object.entries(m.layers)) figure.setLayer?.(id, v);
        this._dropPlaceholder(m);
        this.emit('mounted', { leafIndex, figure });
        return figure;
      } catch (err) {
        console.error(`[figure] ${spec.type} failed`, err);
        if (figure && this.mounts.get(leafIndex) !== m) return null;
        m.error = err;
        m.figure = null;
        this._dropPlaceholder(m);
        if (this.mounts.get(leafIndex) === m) {
          m.placeholder = makeErrorPlaceholder(this.theme, err);
          anchor.add(m.placeholder);
        }
        this.emit('error', { leafIndex, error: err });
        return null;
      }
    })();
    return m.ready;
  }

  _dropPlaceholder(m) {
    if (!m.placeholder) return;
    m.placeholder.removeFromParent();
    disposeTree(m.placeholder);
    m.placeholder = null;
  }

  /** Unmount a leaf's figure and free every GPU resource it created. */
  unmount(leafIndex) {
    const m = this.mounts.get(leafIndex);
    if (!m) return;
    this.mounts.delete(leafIndex);
    m.disposed = true;
    m.anchor.removeFromParent();
    if (m.figure) safeDispose(m.figure);
    for (const line of m.ctx.lines ?? []) line.dispose?.();
    disposeTree(m.anchor);
    m.fades.clear();
    m.partOf.clear();
    m.occluded.clear();
    m.facing.clear();
    m.hiddenSides.clear();
    m.pickables = null;
    if (this._lastBeat.leaf === leafIndex) this._lastBeat.leaf = -1;
  }

  // ---------------------------------------------------------------- language

  /**
   * Forget every translation made in the old language: label texts, the
   * beats of each mount, the printed "figure unavailable" notice. Called by
   * the reader after setLang(); the next query answers in the new language.
   * Mounts, poses and interaction state are untouched.
   */
  relocalize() {
    this._labelText = new WeakMap();
    for (const m of this.mounts.values()) {
      m._beats = null;
      if (m.error && m.placeholder && !m.disposed) {
        this._dropPlaceholder(m);
        m.placeholder = makeErrorPlaceholder(this.theme, m.error);
        m.anchor.add(m.placeholder);
      }
    }
    this._lastBeat.index = -1; // the beat playing is announced again, in the new language
  }

  /**
   * Replace the narrated beats a mount was given (`spec.beats`: the manifest
   * beats of the new edition after a language switch). The figure stays
   * mounted with its spec otherwise unchanged.
   * @param {number} leafIndex
   * @param {Array<{ t: number, text: string }|[number, string]>|null} beats
   */
  setBeats(leafIndex, beats) {
    const m = this.mounts.get(leafIndex);
    if (!m) return;
    m.spec = { ...m.spec, beats: beats ?? undefined };
    m._beats = null;
    if (this._lastBeat.leaf === leafIndex) this._lastBeat.index = -1;
  }

  /**
   * A label's text and detail in the current language, memoised per label:
   * looked up again only when the language or the subject's English changes.
   */
  _labelStrings(l) {
    const lang = getLang();
    let c = this._labelText.get(l);
    if (!c || c.lang !== lang || c.src !== l.text || c.srcDetail !== l.detail) {
      c = {
        lang,
        src: l.text,
        srcDetail: l.detail,
        text: typeof l.text === 'string' && l.text ? t(l.text) : l.text,
        detail: typeof l.detail === 'string' && l.detail ? t(l.detail) : l.detail,
      };
      this._labelText.set(l, c);
    }
    return c;
  }

  /** Keep only the given leaves mounted. */
  retain(leafIndices) {
    const keep = new Set(leafIndices);
    for (const k of [...this.mounts.keys()]) if (!keep.has(k)) this.unmount(k);
  }

  /** Unmount everything. */
  dispose() {
    for (const k of [...this.mounts.keys()]) this.unmount(k);
    this.listeners.clear();
  }

  get(leafIndex) {
    return this.mounts.get(leafIndex) ?? null;
  }

  /** The mount on the visible recto, if it has a built figure. */
  get active() {
    const m = this.mounts.get(this.book.rightLeaf);
    return m?.figure ? m : null;
  }

  _resolve(leaf) {
    const m = leaf === undefined ? this.active : this.mounts.get(leaf);
    return m?.figure ? m : null;
  }

  _basePositions(m) {
    for (const part of m.figure.parts ?? []) {
      if (part.object) part._base = part.object.position.clone();
    }
  }

  _fit(m) {
    const f = m.figure;
    f.update?.(0, 0, this._state(m));
    let box;
    if (f.bounds) {
      box = new THREE.Box3(new THREE.Vector3(...f.bounds.min), new THREE.Vector3(...f.bounds.max));
    } else {
      f.root.updateMatrixWorld(true);
      box = new THREE.Box3();
      const inv = new THREE.Matrix4().copy(f.root.matrixWorld).invert();
      const mtx = new THREE.Matrix4();
      const b = new THREE.Box3();
      f.root.traverse((o) => {
        if (!o.isMesh || o.userData.isOutline || o.userData.noFit) return;
        let gb;
        if (o.isInstancedMesh || o.isSkinnedMesh) {
          o.computeBoundingBox();
          gb = o.boundingBox;
        } else {
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox?.();
          gb = o.geometry.boundingBox;
        }
        if (!gb || gb.isEmpty()) return;
        box.union(b.copy(gb).applyMatrix4(mtx.multiplyMatrices(inv, o.matrixWorld)));
      });
      if (box.isEmpty()) box.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1, 1));
    }
    const size = box.getSize(new THREE.Vector3());
    const A = { ...FIGURE_AREA, ...(m.spec.area ?? {}) };
    const s = Math.min(A.footprintX / Math.max(size.x, 1e-6), A.footprintZ / Math.max(size.z, 1e-6), A.maxHeight / Math.max(size.y, 1e-6));
    const scale = s * (m.spec.scale ?? 1);
    m.fit.scale.setScalar(scale);
    const c = box.getCenter(new THREE.Vector3());
    // stand the figure on the paper, centred on the anchor
    m.fit.position.set(-c.x * scale, -box.min.y * scale + 0.0015, -c.z * scale);
    m.ctx.setFit(scale);
    m.fitScale = scale;
    m.box = box;
  }

  /** Put the anchor on its page (so queries are valid before the first update). */
  _place(m) {
    const leaf = this.book.leaves?.[m.leafIndex];
    if (!leaf || !this.book.leafFrame) return;
    const fr = this.book.leafFrame(m.leafIndex, FIGURE_AREA.s * leaf.W, FIGURE_AREA.z * leaf.H);
    m.anchor.position.set(fr.position[0], fr.position[1], fr.position[2]);
    m.anchor.rotation.set(0, 0, fr.angle);
    m.anchor.updateMatrixWorld(true);
  }

  _state(m) {
    const st = m.state;
    st.explode = m.explode;
    st.layers = m.layers;
    st.labels = m.labels;
    st.playing = this.playing;
    st.reducedMotion = this.reducedMotion;
    st.phase = this.time / FIGURE_DURATION;
    return st;
  }

  // ---------------------------------------------------------------- controls
  setPlaying(v) {
    this.playing = v;
    this.emit('clock', { time: this.time, playing: v });
  }
  setTime(t) {
    this.time = ((t % FIGURE_DURATION) + FIGURE_DURATION) % FIGURE_DURATION;
    this.emit('clock', { time: this.time, playing: this.playing });
  }
  rotateActive(dYaw) {
    const m = this.active;
    if (m) m.yawTarget += dYaw;
  }
  /** Turntable angle (radians) of a leaf's figure; `snap` skips the easing. */
  setYaw(yaw, leaf = this.book.rightLeaf, snap = false) {
    const m = this.mounts.get(leaf);
    if (!m) return;
    m.yawTarget = yaw;
    if (snap) m.yawValue = yaw;
  }
  setExplode(amount, leaf = this.book.rightLeaf) {
    const m = this.mounts.get(leaf);
    if (m) m.explodeTarget = clamp(amount);
  }

  /**
   * Show or hide a figure layer. Parts that declare `layer: id` dissolve in or
   * out over `layerFade` seconds (instantly under reduced motion), starting
   * from what the page shows now rather than from the old switch: a figure
   * may already show a layer's parts itself (a snake's dissection reveals its
   * skeleton), and switching that layer on must not blink them out first.
   * The figure's own setLayer runs when a layer appears and when it has gone.
   */
  setLayer(id, visible, leaf = this.book.rightLeaf) {
    const m = this.mounts.get(leaf);
    if (!m?.figure) return;
    const was = m.layers[id] !== false;
    m.layers[id] = visible;
    m.pickables = null;
    m.occlFresh = 0; // occluders changed: re-test every label
    const objects = [];
    for (const p of m.figure.parts ?? []) if (p.layer === id && p.object) objects.push(p.object);
    const existing = m.fades.get(id);
    const target = visible ? 1 : 0;
    // a dissolve under way knows where it is; otherwise read the parts (before
    // the figure's setLayer below can reveal them) and map the shown amount
    // back onto the fade's linear clock, so the first eased step continues it
    const start = existing ? existing.value : uneased(shownShare(objects, m.figure.root, was));
    const animate = !this.reducedMotion && this.layerFade > 0 && objects.length > 0 && m.anchor.visible
      && Math.abs(target - start) > 1e-3;
    if (!animate) {
      if (existing) {
        for (const o of existing.objects) setFade(o, 1);
        m.fades.delete(id);
      }
      m.figure.setLayer?.(id, visible);
    } else {
      if (visible) m.figure.setLayer?.(id, true);
      m.fades.set(id, { objects, value: start, target });
      const a = eased(start);
      for (const o of objects) setFade(o, a);
    }
    this.emit('layers', { leafIndex: leaf, layers: { ...m.layers } });
  }

  setLabels(v, leaf = this.book.rightLeaf) {
    const m = this.mounts.get(leaf);
    if (m) m.labels = v;
  }

  // ---------------------------------------------------------------- queries

  /**
   * World-space centre of a figure's fit box (default: the active figure).
   * @param {THREE.Vector3} [target]
   * @param {number} [leaf]
   * @returns {THREE.Vector3|null}
   */
  focusPoint(target = new THREE.Vector3(), leaf) {
    const m = this._resolve(leaf);
    if (!m?.box) return null;
    m.figure.root.updateWorldMatrix(true, false);
    return m.box.getCenter(target).applyMatrix4(m.figure.root.matrixWorld);
  }

  /**
   * World-space radius of a figure's fit box (half its diagonal).
   * @param {number} [leaf]
   * @returns {number}
   */
  figureRadius(leaf) {
    const m = this._resolve(leaf);
    if (!m?.box) return 0;
    m.figure.root.updateWorldMatrix(true, false);
    return m.box.getSize(_v).length() * 0.5 * m.figure.root.matrixWorld.getMaxScaleOnAxis();
  }

  /**
   * Visible, solid meshes of a mount (no outlines, ink lines or x-ray ghosts).
   * Cached; rebuilt on layer changes and whenever explode has moved since,
   * because a figure may ghost or reveal parts as it explodes (a snake's
   * dissection x-rays its skin and shows its bones). The list and the visitor
   * are reused, so a rebuild allocates nothing.
   */
  _pickables(m) {
    if (m.pickables && Math.abs(m.pickExplode - m.explode) < 0.01) return m.pickables;
    const list = (m.pickList ??= []);
    list.length = 0;
    m.figure.root.traverseVisible((m.pickVisit ??= (o) => {
      if (!o.isMesh || o.userData.isOutline || o.userData.isInkLine || o.isLine2 || o.isLineSegments2) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (mats.every((mt) => (mt?.userData?.xray?.value ?? 0) > 0.5 || mt?.visible === false)) return;
      list.push(o);
    }));
    m.pickables = list;
    m.pickExplode = m.explode;
    return list;
  }

  /** The figure part an object belongs to (nearest ancestor that is a part). */
  partFor(object, leaf) {
    const m = this._resolve(leaf);
    if (!m) return null;
    for (let o = object; o && o !== m.fit; o = o.parent) {
      const p = m.partOf.get(o);
      if (p) return p;
    }
    return null;
  }

  /**
   * Ray-pick the active figure (outlines and ink lines are skipped).
   * @param {THREE.Raycaster} raycaster  already set from the camera/pointer
   * @param {number} [leaf]
   * @returns {{ mount: object, object: THREE.Object3D, part: object|null, point: THREE.Vector3, distance: number }|null}
   */
  pickFigure(raycaster, leaf) {
    const m = this._resolve(leaf);
    if (!m || !m.anchor.visible) return null;
    // a dense mesh's stand-in (userData.occluder: a BVH over the same
    // triangles) answers exactly as the mesh would — same object, point,
    // distance and face — without testing ~310k triangles one by one, so a
    // hover pick over a skull costs well under a millisecond. See-through
    // props stay in: a drag on the sea snake's water still turns the figure.
    _pickRays.length = 0;
    for (const o of this._pickables(m)) {
      const p = o.userData.occluder;
      if (p) {
        p.matrixWorld.copy(o.matrixWorld);
        _pickRays.push(p);
      } else _pickRays.push(o);
    }
    _hits.length = 0;
    raycaster.intersectObjects(_pickRays, false, _hits);
    _pickRays.length = 0;
    const h = _hits[0];
    _hits.length = 0;
    if (!h) return null;
    // a stand-in reuses its hit record (the next label ray rewrites it), and a
    // press keeps its pick for the whole drag: hand out a point of its own
    return { mount: m, object: h.object, part: this.partFor(h.object, m.leafIndex), point: h.point.clone(), distance: h.distance };
  }

  /**
   * Visible labels of the active figure with world positions. With a camera,
   * each item also carries its projection (`ndc`, `depth`) and an `occluded`
   * flag from a raycast camera→anchor against the figure (amortised: a few
   * labels are re-tested per call; meshes flagged `userData.noOcclude` are
   * see-through and never hide a label). Items are pooled — read them before
   * the next call.
   *
   * `text` and `detail` come translated into the current language (the
   * label's own fields stay English). A label with a mirror-side anchor
   * (`alt`) is placed on the one facing the camera, or — the head face-on,
   * both in view — on the side of the head its pill is drawn (`anchor`; see
   * _anchorFor); `mark` is the
   * label's mark ('dot' unless it says 'ring' or 'tick'). A label whose layer
   * is switched off is listed while the figure says it draws that layer
   * anyway (`figure.layerShown(id)`: a dissection revealing the skeleton).
   * @param {THREE.Camera} [camera]
   * @returns {Array<{ id, text, detail, layer, anchor, label, mark: 'dot'|'ring'|'tick', r: number, headPx: number,
   *                   world: THREE.Vector3, ndc: THREE.Vector3, depth: number, occluded: boolean, inFront: boolean }>}
   *          (`r` and `headPx` are measured by labelItems: 0 and NaN here)
   */
  activeLabels(camera) {
    const out = this._labelOut;
    out.length = 0;
    const m = this.active;
    if (!m || !m.labels || m.foldValue < 0.95 || !m.anchor.visible) return out;
    const labels = m.figure.labels ?? [];
    this._centreX = camera ? this._screenCentreX(m, camera) : NaN;
    if (camera && m.hiddenSides.size && this._viewMoved(m, camera)) m.hiddenSides.clear();
    let n = 0;
    for (const l of labels) {
      if (!l.anchor) continue;
      const anchor = layerDrawn(m, l.layer) ? this._anchorFor(m, l, camera) : null;
      if (!anchor) {
        // gated off (its layer, its part, a construction stage): whatever was
        // known about its occlusion is stale by the time it comes back
        m.occluded.delete(l);
        continue;
      }
      const s = this._labelStrings(l);
      const item = this._labelPool[n] ?? (this._labelPool[n] = { world: new THREE.Vector3(), ndc: new THREE.Vector3() });
      item.id = l.id;
      item.text = s.text;
      item.detail = s.detail;
      item.layer = l.layer;
      item.anchor = anchor;
      item.label = l;
      item.mark = l.mark === 'ring' || l.mark === 'tick' ? l.mark : 'dot';
      item.r = 0;
      item.headPx = NaN;
      anchor.getWorldPosition(item.world);
      item.occluded = m.occluded.get(l) ?? false;
      if (camera) {
        item.ndc.copy(item.world).project(camera);
        item.depth = item.ndc.z;
        item.inFront = item.ndc.z < 1 && item.ndc.z > -1;
      } else {
        item.ndc.set(0, 0, 0);
        item.depth = 0;
        item.inFront = true;
      }
      out.push(item);
      n++;
    }
    if (camera && out.length) this._updateOcclusion(m, camera, out);
    return out;
  }

  /**
   * The anchor a label points at now: its own, or for a label with a
   * mirror-side `alt` anchor (the far eye, pit or nostril) the one on the
   * camera's side — or, the head face-on with both in view, the one on the
   * side of the head where the label's pill is drawn (setLabelSides; else
   * the column the key gives it), so its leader never crosses the face over
   * the other (mirror.js, with hysteresis) — unless the raycast found that
   * one hidden from this view (a pit turned to the head's edge). Null when
   * the anchors are hidden (gated with their part). Without a camera the last
   * choice stands.
   */
  _anchorFor(m, l, camera) {
    const root = m.figure.root;
    const a = l.anchor, b = l.alt?.isObject3D ? l.alt : null;
    const shownA = isShown(a, root);
    if (!b) return shownA ? a : null;
    const shownB = isShown(b, root);
    let pick = m.facing.get(l) ?? null;
    if (!shownA || !shownB) {
      pick = shownA ? a : shownB ? b : null;
      if (!pick) return null;
    } else if (camera) {
      pick = mirrorAnchor(a, b, pick, camera, this._wayOut, l, m.hiddenSides.get(l));
    }
    pick ??= a;
    if (pick && m.facing.get(l) !== pick) {
      // the other side's occlusion answer says nothing about this one: it is
      // tested afresh, even with nothing moving
      if (m.facing.has(l)) {
        m.occluded.delete(l);
        m.occlFresh = 0;
      }
      m.facing.set(l, pick);
    }
    return pick;
  }

  /**
   * Has the view of a mount's figure changed since its mirrored anchors were
   * found hidden (the camera turned or moved, the figure turned or exploded)?
   * A little drift (the book floating, a camera settling) does not count.
   */
  _viewMoved(m, camera) {
    const h = m.hiddenView;
    if (!h) return true;
    camera.getWorldPosition(_v);
    _v2.set(0, 0, -1).transformDirection(camera.matrixWorld);
    const r = Math.max(1e-6, this.figureRadius(m.leafIndex));
    return _v.distanceTo(h.pos) > r * 0.05 || _v2.dot(h.fwd) < 0.9975 || Math.abs(m.yawValue - h.yaw) > 0.05 || Math.abs(m.explode - h.explode) > 0.05;
  }

  /** The raycast found a mirrored label's anchor hidden from this view: the label keeps off it until the view changes. */
  _hideSide(m, l, anchor, camera) {
    if (!m.hiddenSides.size) {
      const h = (m.hiddenView ??= { pos: new THREE.Vector3(), fwd: new THREE.Vector3(), yaw: 0, explode: 0 });
      camera.getWorldPosition(h.pos);
      h.fwd.set(0, 0, -1).transformDirection(camera.matrixWorld);
      h.yaw = m.yawValue;
      h.explode = m.explode;
    }
    const list = m.hiddenSides.get(l);
    if (!list) m.hiddenSides.set(l, [anchor]);
    else if (!list.includes(anchor)) list.push(anchor);
  }

  /**
   * Horizontal centre of a mount's figure on screen, in view units (NDC x
   * times the aspect): the middle of its loop box projected (figure.loopBounds,
   * else the fit box) — the rectangle the reader hands the key, whose centre
   * splits its left column from its right one.
   */
  _screenCentreX(m, camera) {
    let b = m.box;
    const lb = m.figure.loopBounds;
    if (lb?.min && lb.max) b = m.loopBox ??= new THREE.Box3(new THREE.Vector3(...lb.min), new THREE.Vector3(...lb.max));
    if (!b || b.isEmpty()) return NaN;
    const mw = m.figure.root.matrixWorld;
    let x0 = Infinity, x1 = -Infinity;
    for (let k = 0; k < 8; k++) {
      _v.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).applyMatrix4(mw).project(camera);
      if (_v.x < x0) x0 = _v.x;
      if (_v.x > x1) x1 = _v.x;
    }
    return ((x0 + x1) / 2) * viewAspect(camera);
  }

  /**
   * The anchor a label of a mount currently points at (its camera-side
   * anchor when it has an `alt`; see activeLabels), e.g. to ask whether the
   * structure a look-closer note names is in view.
   * @param {object} label  one of figure.labels
   * @param {number} [leaf] default: the active mount
   * @returns {THREE.Object3D|null}
   */
  labelAnchor(label, leaf) {
    const m = this._resolve(leaf);
    if (!label) return null;
    return m?.facing.get(label) ?? label.anchor ?? null;
  }

  _updateOcclusion(m, camera, items) {
    // nothing moved since every label was tested: the answers still hold
    // (with a tolerance: damped yaw/explode creep towards their targets for ever)
    const sig = m.occlSig ?? (m.occlSig = new Float64Array(20).fill(NaN));
    const e = camera.matrixWorld.elements;
    let moved = sig[16] !== this.time || differs(sig[17], m.yawValue) || differs(sig[18], m.explode) || sig[19] !== m.fades.size;
    for (let i = 0; i < 16 && !moved; i++) moved = differs(sig[i], e[i]);
    if (moved) {
      for (let i = 0; i < 16; i++) sig[i] = e[i];
      sig[16] = this.time;
      sig[17] = m.yawValue;
      sig[18] = m.explode;
      sig[19] = m.fades.size;
      m.occlFresh = 0;
    } else if ((m.occlFresh ?? 0) >= items.length) return;
    // a ray dearer than the budget runs every few frames, so the average holds
    if ((m.rayMs ?? 0) > OCCLUSION_BUDGET_MS) {
      m.occlWait = (m.occlWait ?? 0) + 1;
      if (m.occlWait < Math.ceil(m.rayMs / OCCLUSION_BUDGET_MS)) return;
    }
    m.occlWait = 0;
    const rc = this._raycaster;
    // a subject may hang a stand-in on a dense mesh (userData.occluder, never
    // rendered; picks use it too, see pickFigure): labels test against it.
    // See-through props (userData.noOcclude: a sea snake's clear water) hide
    // no label, yet stay pickable, so a drag on the water still turns the figure
    _occluders.length = 0;
    for (const o of this._pickables(m)) {
      if (o.userData.noOcclude) continue;
      const p = o.userData.occluder;
      if (p) {
        p.matrixWorld.copy(o.matrixWorld);
        _occluders.push(p);
      } else _occluders.push(o);
    }
    const eps = Math.max(1e-4, this.figureRadius(m.leafIndex) * 0.025);
    camera.getWorldPosition(_v2);
    const max = Math.min(OCCLUSION_CHECKS_PER_FRAME, items.length);
    const t0 = performance.now();
    let count = 0;
    for (let k = 0; k < max; k++) {
      if (k > 0 && performance.now() - t0 > OCCLUSION_BUDGET_MS) break;
      count++;
      const item = items[(this._occlCursor + k) % items.length];
      _v.copy(item.world).sub(_v2);
      const dist = _v.length();
      if (dist < 1e-6) continue;
      const r0 = performance.now();
      rc.set(_v2, _v.multiplyScalar(1 / dist));
      rc.near = 0;
      rc.far = Math.max(0, dist - eps);
      rc.camera = camera;
      _hits.length = 0;
      rc.intersectObjects(_occluders, false, _hits);
      const occ = _hits.length > 0;
      _hits.length = 0;
      if (occ && item.label.alt) this._hideSide(m, item.label, item.anchor, camera);
      m.occluded.set(item.label, occ);
      item.occluded = occ;
      const dt = performance.now() - r0;
      m.rayMs = m.rayMs ? m.rayMs * 0.8 + dt * 0.2 : dt;
    }
    _occluders.length = 0;
    m.occlFresh = (m.occlFresh ?? 0) + count;
    this._occlCursor = (this._occlCursor + count) % Math.max(1, items.length);
  }

  /**
   * Screen-space label items for `ui.renderLabels` (CONTRACTS §8):
   * `{ id, text, detail, x, y, depth, visible }` in CSS px of a `width × height` viewport,
   * plus `mark` ('dot' | 'ring' | 'tick') and `r`: the radius of the feature
   * a label rings (`label.size`, cm of the figure) in CSS px, measured along
   * the camera's right axis at the anchor (0 when the label gives no size),
   * so a mark can be drawn around an eye or a pit instead of on it; and
   * `headPx`: the length of the head a face label sits on (`label.headSize`,
   * cm) in CSS px, measured the same way (NaN for any other label), so a
   * head too small on screen gets ticks rather than rings.
   * @param {THREE.Camera} camera
   * @param {number} width
   * @param {number} height
   */
  labelItems(camera, width, height) {
    const raw = this.activeLabels(camera);
    if (!raw.length) return raw;
    // world units per cm of the figure (the host's fit, the book's placement)
    const cm = this.active.figure.root.matrixWorld.getMaxScaleOnAxis();
    _v2.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    for (const it of raw) {
      it.x = (it.ndc.x * 0.5 + 0.5) * width;
      it.y = (-it.ndc.y * 0.5 + 0.5) * height;
      it.visible = it.inFront && !it.occluded && Math.abs(it.ndc.x) < 1.05 && Math.abs(it.ndc.y) < 1.05;
      const size = it.label.size, head = it.label.headSize;
      it.r = size > 0 && it.inFront ? spanPx(it, size * cm, camera, width, height) : 0;
      it.headPx = head > 0 && it.inFront ? spanPx(it, head * cm, camera, width, height) : NaN;
    }
    return raw;
  }

  /**
   * World sphere round the region a label belongs to — the head a face label
   * points into — for a close-up that frames it: centred on the region's box,
   * its radius half the box's longest side. The figure says what the region
   * is: `figure.regionOf(label)`, else the label's own `region`, each
   * `{ object, box }` with the box in the object's frame (a label copied into
   * another figure keeps its `region`). A figure that declares neither: a
   * label whose anchor hangs in a head group (named 'head', as snakes/head.js
   * builds it) belongs to that head, measured by its skin ('head-skin' ∪
   * 'jaw-skin') as posed now. Allocation-free after the first call per label,
   * so a close-up can follow the head every frame.
   * @param {string} labelId
   * @param {THREE.Sphere} [target]
   * @param {number} [leaf] default: the active mount
   * @returns {THREE.Sphere|null} null when the label has no region (or no built figure, or no such label)
   */
  regionSphere(labelId, target = new THREE.Sphere(), leaf) {
    const reg = this._region(labelId, leaf);
    if (!reg) return null;
    const mw = reg.object.matrixWorld;
    reg.box.getCenter(target.center).applyMatrix4(mw);
    reg.box.getSize(_v);
    target.radius = (Math.max(_v.x, _v.y, _v.z) / 2) * mw.getMaxScaleOnAxis();
    return target;
  }

  /**
   * Half a label's region as a view sees it: the farthest its surface lies
   * from `center` along the view's `right` or `up` (unit world vectors), so a
   * close-up frames a head seen end-on by its width rather than its length.
   * Measured on the skin's vertices for a head found by name (see
   * regionSphere), on the box's corners for a declared region.
   * @param {string} labelId
   * @param {THREE.Vector3} center  e.g. regionSphere's centre
   * @param {THREE.Vector3} right
   * @param {THREE.Vector3} up
   * @param {number} [leaf] default: the active mount
   * @returns {number} world units (0 when the label has no region)
   */
  regionHalfAcross(labelId, center, right, up, leaf) {
    const reg = this._region(labelId, leaf);
    if (!reg) return 0;
    let r = 0;
    if (reg.skin) {
      for (const mesh of reg.skin) r = Math.max(r, halfAcross(mesh, center, right), halfAcross(mesh, center, up));
      return r;
    }
    const b = reg.box;
    for (let k = 0; k < 8; k++) {
      _v.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).applyMatrix4(reg.object.matrixWorld).sub(center);
      r = Math.max(r, Math.abs(_v.dot(right)), Math.abs(_v.dot(up)));
    }
    return r;
  }

  /**
   * The region of a label (see regionSphere) with world matrices current:
   * `{ object, box, skin }` — skin: the meshes measured, for a head found by
   * name (the box is then the host's own scratch box) — or null.
   */
  _region(labelId, leaf) {
    const m = this._resolve(leaf);
    if (!m) return null;
    let label = null;
    for (const l of m.figure.labels ?? []) {
      if (l.id === labelId) {
        label = l;
        break;
      }
    }
    if (!label) return null;
    const declared = m.figure.regionOf?.(label) ?? label.region ?? null;
    const reg = (m.region ??= { object: null, box: null, skin: null });
    if (declared) {
      const { object, box } = declared;
      if (!object?.isObject3D || !box?.isBox3 || box.isEmpty()) return null;
      object.updateWorldMatrix(true, false);
      reg.object = object;
      reg.box = box;
      reg.skin = null;
      return reg;
    }
    const head = headOf(m, label);
    if (!head) return null;
    head.group.updateWorldMatrix(true, true);
    _mInv.copy(head.group.matrixWorld).invert();
    const box = _box.makeEmpty();
    for (const mesh of head.skin) {
      const g = mesh.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      box.union(_box2.copy(g.boundingBox).applyMatrix4(_mRel.multiplyMatrices(_mInv, mesh.matrixWorld)));
    }
    if (box.isEmpty()) return null;
    reg.object = head.group;
    reg.box = box;
    reg.skin = head.skin;
    return reg;
  }

  /**
   * Narrated beats of a figure, normalised to `[{ t, text }]` and sorted by
   * time: the beats it was mounted with (`spec.beats`, the manifest's, already
   * in their edition's language — see setBeats), else the figure's own, which
   * are English in code and come back translated into the current language.
   * @param {number} [leaf]
   */
  beats(leaf) {
    const m = leaf === undefined ? this.mounts.get(this.book.rightLeaf) : this.mounts.get(leaf);
    if (!m) return [];
    const lang = getLang();
    if (!m._beats || m._beatsLang !== lang) {
      const given = m.spec.beats?.length ? m.spec.beats : null;
      const src = given ?? m.figure?.beats ?? [];
      const say = given ? String : (s) => (s ? t(String(s)) : '');
      const list = src
        .map((b) => (Array.isArray(b) ? { t: +b[0], text: say(b[1]) } : { t: +b.t, text: say(b.text) }))
        .filter((b) => Number.isFinite(b.t))
        .sort((a, b) => a.t - b.t);
      if (!m.figure) return list;
      m._beats = list;
      m._beatsLang = lang;
    }
    return m._beats;
  }

  /**
   * The beat playing at the current loop time (the last one whose t ≤ time).
   * @param {number} [leaf]
   * @returns {{ index: number, t: number, text: string }|null}
   */
  currentBeat(leaf) {
    const list = this.beats(leaf);
    if (!list.length) return null;
    const idx = beatIndex(list, this.time);
    return { index: idx, t: list[idx].t, text: list[idx].text };
  }

  // ---------------------------------------------------------------- frame
  update(dt) {
    if (this.playing) {
      this.time = (this.time + dt * this.speed) % FIGURE_DURATION;
    }
    this._calibT -= dt;
    if (this._calibT <= 0 && this.mounts.size) {
      this._calibT = 1;
      this.calibrateInk();
    }
    for (const m of this.mounts.values()) {
      const leaf = this.book.leaves[m.leafIndex];
      if (!leaf) continue;
      // fold flat as the spread closes — this leaf lifting or the previous
      // leaf falling back onto it — and pop up (with a little overshoot) as
      // it opens. 1 = the spread lies flat.
      const opening = this.book.spreadOpening ? this.book.spreadOpening(m.leafIndex) : 1 - leaf.st.p;
      const covered = this.book.leafVisible ? !this.book.leafVisible(m.leafIndex) : false;
      const target = covered ? 0 : smooth(0.7, 1.0, opening);
      if (this.reducedMotion) {
        m.foldValue = target;
      } else {
        const k = target > m.foldValue ? 90 : 260; // stiffness
        const c = target > m.foldValue ? 11 : 32; // damping
        m.foldVel += (k * (target - m.foldValue) - c * m.foldVel) * dt;
        m.foldValue += m.foldVel * dt;
        if (target === 0 && m.foldValue < 0) {
          m.foldValue = 0;
          m.foldVel = 0;
        }
      }
      const showsSomething = m.figure || m.placeholder;
      const open = !covered && opening > 0.68;
      const visible = showsSomething && (m.figure ? m.foldValue > 0.004 || open : open);
      m.anchor.visible = !!visible;
      if (!visible) continue;

      const fr = this.book.leafFrame(m.leafIndex, FIGURE_AREA.s * leaf.W, FIGURE_AREA.z * leaf.H);
      m.anchor.position.set(fr.position[0], fr.position[1], fr.position[2]);
      m.anchor.rotation.set(0, 0, fr.angle);
      m.fold.scale.set(1, Math.max(0.002, m.foldValue), 1);
      if (!m.figure) continue;

      m.yawValue = damp(m.yawValue, m.yawTarget, 10, dt);
      m.yaw.rotation.y = m.yawValue;
      const prevExplode = m.explode;
      m.explode = damp(m.explode, m.explodeTarget, 6, dt);
      if (Math.abs(m.explode - prevExplode) > 1e-5) m.figure.setExplode?.(m.explode);

      // layer dissolves
      if (m.fades.size) this._stepFades(m, dt);

      // explode parts generically (figures may also react in update)
      for (const part of m.figure.parts ?? []) {
        if (!part.explode || !part._base) continue;
        part.object.position.copy(part._base).addScaledVector(part.explode, m.explode);
      }
      m.figure.update?.(this.time, dt, this._state(m));
      m.anchor.updateMatrixWorld(true);
      m.ctx.u.figureInv.value.copy(m.figure.root.matrixWorld).invert();
      m.ctx.u.time.value = this.time;
    }
    this._trackBeat();
  }

  _stepFades(m, dt) {
    const step = dt / Math.max(1e-3, this.layerFade);
    for (const [id, f] of m.fades) {
      const dir = Math.sign(f.target - f.value);
      f.value = clamp(f.value + dir * step);
      const done = dir === 0 || (dir > 0 ? f.value >= f.target : f.value <= f.target);
      if (done) {
        m.fades.delete(id);
        if (f.target === 0) m.figure.setLayer?.(id, false);
        for (const o of f.objects) setFade(o, 1);
        m.pickables = null;
        m.occlFresh = 0;
      } else {
        const a = eased(f.value);
        for (const o of f.objects) setFade(o, a);
      }
    }
  }

  _trackBeat() {
    const m = this.active;
    if (!m) return;
    const list = this.beats(m.leafIndex);
    if (!list.length) return;
    const idx = beatIndex(list, this.time);
    if (this._lastBeat.leaf !== m.leafIndex || this._lastBeat.index !== idx) {
      this._lastBeat.leaf = m.leafIndex;
      this._lastBeat.index = idx;
      const b = list[idx];
      this.emit('beat', { leafIndex: m.leafIndex, index: idx, t: b.t, text: b.text });
    }
  }
}

// -------------------------------------------------------------------- helpers

/** Index of the beat playing at loop time t (the last with beat.t ≤ t; wraps to the last). */
function beatIndex(list, t) {
  let idx = list.length - 1;
  for (let i = 0; i < list.length; i++) {
    if (list[i].t <= t) idx = i;
    else break;
  }
  return idx;
}

/**
 * Are a label's layer's parts drawn? Its switch says so, except that a
 * figure may reveal a switched-off layer itself (`figure.layerShown(id)`
 * true: a snake's dissection shows its skeleton), and then the layer's labels
 * are listed too, gated by their anchors like any other.
 */
function layerDrawn(m, layer) {
  if (!layer || m.layers[layer] !== false) return true;
  return m.figure.layerShown?.(layer) === true;
}

/**
 * CSS px spanned on screen by a world length laid from a label item's anchor
 * along the camera's right axis (_v2, set by the caller).
 */
function spanPx(it, len, camera, width, height) {
  _v.copy(it.world).addScaledVector(_v2, len).project(camera);
  return Math.hypot((_v.x - it.ndc.x) * 0.5 * width, (_v.y - it.ndc.y) * 0.5 * height);
}

/**
 * The farthest a mesh's vertices lie from `c` along the unit axis `a`, in
 * world units: a · (M·v − c) = (Mᵀa) · v + a · (t − c), one dot per vertex.
 */
function halfAcross(mesh, c, a) {
  const p = mesh.geometry?.attributes?.position;
  if (!p?.count) return 0;
  const e = mesh.matrixWorld.elements;
  const lx = a.x * e[0] + a.y * e[1] + a.z * e[2];
  const ly = a.x * e[4] + a.y * e[5] + a.z * e[6];
  const lz = a.x * e[8] + a.y * e[9] + a.z * e[10];
  const off = a.x * (e[12] - c.x) + a.y * (e[13] - c.y) + a.z * (e[14] - c.z);
  const flat = !p.isInterleavedBufferAttribute && p.itemSize === 3 && !p.normalized;
  const v = p.array;
  let r = 0;
  for (let i = 0; i < p.count; i++) {
    const d = flat ? lx * v[i * 3] + ly * v[i * 3 + 1] + lz * v[i * 3 + 2] + off : lx * p.getX(i) + ly * p.getY(i) + lz * p.getZ(i) + off;
    if (d > r) r = d;
    else if (-d > r) r = -d;
  }
  return r;
}

/**
 * The head a label's anchor hangs in, for a figure that declares no regions:
 * the nearest ancestor named 'head' below the figure root, with its skin
 * meshes ('head-skin', 'jaw-skin'), or null. Looked up once per label.
 */
function headOf(m, label) {
  const cache = (m.heads ??= new WeakMap());
  let h = cache.get(label);
  if (h !== undefined) return h;
  h = null;
  const root = m.figure.root;
  for (let o = label.anchor; o && o !== root; o = o.parent) {
    if (o.name !== 'head') continue;
    const skin = [];
    o.traverse((c) => {
      if (c.isMesh && c.geometry && (c.name === 'head-skin' || c.name === 'jaw-skin')) skin.push(c);
    });
    if (skin.length) h = { group: o, skin };
    break;
  }
  cache.set(label, h);
  return h;
}

/** True if `obj` and all its ancestors up to `root` are visible. */
function isShown(obj, root) {
  for (let o = obj; o; o = o.parent) {
    if (!o.visible) return false;
    if (o === root) return true;
  }
  return true;
}

/** Layer-dissolve easing: linear fade clock (0..1) → shown amount (smoothstep). */
const eased = (v) => v * v * (3 - 2 * v);

/** Inverse of `eased`: the fade clock at which a dissolve shows `a`. */
function uneased(a) {
  if (!(a > 0)) return 0;
  if (a >= 1) return 1;
  return 0.5 - Math.sin(Math.asin(1 - 2 * a) / 3);
}

/**
 * How much of a layer's parts the page shows now, 0 (none) … 1 (all solid):
 * the mean over the parts of "visible all the way up to the figure root"
 * times the part's own dissolve (`userData.inkFade`, set by setFade).
 * While the layer was on, a part its figure's own pose hides (Cortez's
 * falling corolla between drops) says nothing about the layer and is left
 * out; while it was off, a hidden part counts as not shown (a dissection
 * revealing some of a switched-off skeleton averages over all its parts).
 */
function shownShare(objects, root, wasOn) {
  let sum = 0, n = 0;
  for (const o of objects) {
    const shown = isShown(o, root);
    if (!shown && wasOn) continue;
    if (shown) sum += o.userData.inkFade ?? 1;
    n++;
  }
  return n ? sum / n : wasOn ? 1 : 0;
}

function safeDispose(figure) {
  try {
    figure?.dispose?.();
  } catch (e) {
    console.error('[figure] dispose failed', e);
  }
}

const TEXTURE_SLOTS = [
  'map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap', 'envMap', 'lightMap',
  'metalnessMap', 'normalMap', 'roughnessMap', 'specularMap', 'clearcoatMap', 'clearcoatNormalMap',
  'clearcoatRoughnessMap', 'sheenColorMap', 'sheenRoughnessMap', 'transmissionMap', 'thicknessMap',
  'iridescenceMap', 'iridescenceThicknessMap', 'anisotropyMap', 'specularColorMap', 'specularIntensityMap',
];

/**
 * Dispose every geometry, material and material texture under `root` once.
 * Instanced meshes release their instance buffers; ink lines their own.
 */
export function disposeTree(root) {
  if (!root) return;
  const geos = new Set();
  const mats = new Set();
  const texs = new Set();
  root.traverse((o) => {
    if (o.geometry) geos.add(o.geometry);
    const list = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const mt of list) mats.add(mt);
    if (o.isInstancedMesh && !o.userData.isOutline) o.dispose?.();
  });
  for (const mt of mats) {
    for (const k of TEXTURE_SLOTS) if (mt[k]?.isTexture) texs.add(mt[k]);
    for (const t of mt.userData?.disposeTextures ?? []) texs.add(t);
  }
  for (const g of geos) g.dispose?.();
  for (const mt of mats) mt.dispose?.();
  for (const t of texs) t.dispose?.();
}

/**
 * Printed shimmer: a faint ink ellipse with a soft sheen passing across it,
 * marking where a figure is being built (no per-frame JS: driven by `time`).
 */
function makeBuildingPlaceholder(theme, reducedMotion) {
  const geo = new THREE.CircleGeometry(0.5, 64);
  geo.rotateX(-Math.PI / 2);
  geo.scale(FIGURE_AREA.footprintX * 0.62, 1, FIGURE_AREA.footprintZ * 0.4);
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  mat.name = 'figure-placeholder';
  mat.colorNode = tslColor(new THREE.Color(theme.ink ?? '#1c1a17'));
  const p = uv().sub(0.5).mul(2);
  const r = p.length();
  const disc = float(1).sub(smoothstep(0.82, 1.0, r));
  const rim = smoothstep(0.86, 0.93, r).mul(float(1).sub(smoothstep(0.95, 1.0, r)));
  const sweepPos = reducedMotion ? float(-2) : time.mul(0.45).fract().mul(3.2).sub(1.6);
  const sweep = exp(p.x.sub(p.y.mul(0.35)).sub(sweepPos).pow(2).mul(-6));
  mat.opacityNode = disc.mul(0.07).add(rim.mul(0.26)).add(sweep.mul(disc).mul(0.12));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.0012;
  mesh.renderOrder = 1;
  mesh.name = 'figure-building';
  mesh.raycast = () => {};
  return mesh;
}

/** A quiet printed notice where a figure failed to build (in the current language; see relocalize). */
function makeErrorPlaceholder(theme, err) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  const ink = theme.ink ?? '#1c1a17';
  g.strokeStyle = ink;
  g.globalAlpha = 0.45;
  g.lineWidth = 3;
  g.setLineDash([14, 12]);
  g.beginPath();
  g.ellipse(512, 256, 470, 220, 0, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 0.7;
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.font = '600 44px "IBM Plex Sans Condensed", "Helvetica Neue", Arial, sans-serif';
  g.fillText(t('FIGURE UNAVAILABLE'), 512, 250);
  g.globalAlpha = 0.5;
  g.font = 'italic 30px "EB Garamond", Georgia, serif';
  const msg = String(err?.message ?? err ?? '').slice(0, 64);
  g.fillText(msg, 512, 310);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicNodeMaterial({ map: tex, transparent: true, depthWrite: false });
  mat.name = 'figure-error';
  mat.userData.disposeTextures = [tex];
  const w = FIGURE_AREA.footprintX * 0.7;
  const geo = new THREE.PlaneGeometry(w, w / 2);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.0012;
  mesh.name = 'figure-error';
  mesh.raycast = () => {};
  return mesh;
}
