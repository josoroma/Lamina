// Stage: a pure-white world, a calibrated studio light rig, a tight contact
// shadow under the floating book, and a camera rig that frames the book
// edge-to-edge ("full width") on any aspect ratio.
//
// Why: the canvas clears to transparent over CSS white, so anything we draw
// outside the book must be either fully transparent or a real shadow — no
// haze. The light rig is exported (createLights) so the figure lab renders
// plates under exactly the same light as the book. Camera framing is solved
// numerically against the projected book corners, so it stays correct for
// every aspect, elevation and focus (spread, single page, closed book).
import * as THREE from 'three/webgpu';
import {
  float, color as tslColor, uniform, positionWorld, vec2, abs, max, min, length, smoothstep,
  Fn, add, texture, nodeObject, renderGroup, interleavedGradientNoise, vogelDiskSample,
} from 'three/tsl';
import { damp, clamp } from './util/math.js';
import { setPaperLight } from './book/paper.js';

export const WORLD = {
  pageW: 1.0, // page width (spine → fore-edge)
  pageH: 1.38, // page height (head → tail), along Z
  coverOverhang: 0.028,
  boardThickness: 0.022,
};

/**
 * Inspect camera distance range (world units), for framing and for dolly zoom
 * alike. The Reader frames a figure at ≤ 0.75 × the page view's distance:
 * up to 4.5 on phones and 6.7 in a 300 px-wide window (page view 8.9), so the
 * first zoom-out must never meet a nearer limit than the framing did.
 * INSPECT_MIN_DISTANCE holds for a subject of unknown size (a figure's whole
 * loop, whose centre may lie among its own coils or petals); a sphere subject
 * may come nearer (see SUBJECT_FILL_MAX).
 */
const INSPECT_MIN_DISTANCE = 0.2;
const INSPECT_MAX_DISTANCE = 8;
/**
 * A sphere subject (inspect's `o.radius`: a head up close) may be dollied in
 * until it spans this many times the view's short side (the Reader frames a
 * head in a sphere of 1.6 × its half-length: the head then spans 1.25 × it).
 * INSPECT_MIN_DISTANCE alone held the coral's and the sea snake's heads
 * (0.025–0.029 world units long, under a third of a terciopelo's) short of
 * their own framing on a landscape phone, at 22–34 % of its height, and let a
 * pinch take them only to 49–66 % of a portrait phone's width. A subject
 * that spans that much farther out keeps INSPECT_MIN_DISTANCE (there a
 * terciopelo's head overflows a portrait phone 2.4 times already).
 */
const SUBJECT_FILL_MAX = 2;
/**
 * A near camera brings its near plane in with it: this share of its distance
 * from what it looks at, never under NEAR_MIN, up to the camera's own 0.05,
 * which it keeps from 0.5 out (every book view and every inspect framing). A
 * dolly into a figure's loop then cuts only what comes within a tenth of that
 * distance (at INSPECT_MIN_DISTANCE the matabuey's coils pass 0.043 from the
 * camera: a fixed 0.05 cut them), and a head a few hundredths away is never
 * cut, nor the page under a low view of it. At NEAR_MIN the depth buffer still
 * resolves the book more finely than the book view does.
 */
const NEAR_SHARE = 0.1;
const NEAR_MIN = 0.008;

/** Height (world units) the book floats at; it bobs ±0.005 around it, and rests on it under reduced motion. */
const FLOAT_Y = 0.014;

/**
 * The fragment's window position as each backend builds it (WGSL
 * builtin position, GLSL gl_FragCoord), with no uniform attached: three's
 * `screenCoordinate` flips y on WebGL with a screen-size uniform it makes
 * afresh in every material build (see keyShadowFilter).
 */
class FragCoordNode extends THREE.Node {
  static get type() {
    return 'LaminaFragCoordNode';
  }
  constructor() {
    super('vec2');
  }
  generate(builder) {
    return builder.getFragCoord();
  }
}
const fragCoord = nodeObject(new FragCoordNode());
const _bufferSize = new THREE.Vector2();
/** Drawing buffer (or render target) size in px: one node for every material, updated like three's screenSize. */
const bufferSize = uniform(_bufferSize).setGroup(renderGroup).onRenderUpdate(({ renderer }) => {
  const target = renderer.getRenderTarget();
  if (target) _bufferSize.set(target.width, target.height);
  else renderer.getDrawingBufferSize(_bufferSize);
  return _bufferSize;
});

/**
 * three r186's PCF shadow filter, tap for tap (5 Vogel-disk taps turned per
 * pixel by interleaved gradient noise of three's `screenCoordinate`), but
 * every uniform it reads exists once per light. three's own filter builds
 * reference('mapSize') and reference('radius') in every material build, and
 * each new uniform id keys a shared 'render' bind group that the node
 * builder caches for good: about ten more per figure mount, never freed.
 * @param {THREE.LightShadow} shadow
 */
function keyShadowFilter(shadow) {
  const mapSize = uniform(shadow.mapSize).setGroup(renderGroup); // the light's own Vector2: always current
  const radius = uniform(shadow.radius).setGroup(renderGroup).onRenderUpdate(() => shadow.radius);
  return Fn(({ depthTexture, shadowCoord, depthLayer }, builder) => {
    const depthCompare = (uv, compare) => {
      let depth = texture(depthTexture, uv);
      if (depthTexture.isArrayTexture) depth = depth.depth(depthLayer);
      return depth.compare(compare);
    };
    const radiusScaled = radius.mul(vec2(1).div(mapSize).x);
    // three's screenCoordinate: y runs down on both backends
    const pixel = builder.isFlipY() ? vec2(fragCoord.x, bufferSize.y.sub(fragCoord.y)) : fragCoord;
    const phi = interleavedGradientNoise(pixel).mul(6.28318530718);
    const tap = (i) => depthCompare(shadowCoord.xy.add(vogelDiskSample(i, 5, phi).mul(radiusScaled)), shadowCoord.z);
    return add(tap(0), tap(1), tap(2), tap(3), tap(4)).mul(1 / 5);
  });
}

/**
 * The studio light rig shared by the book stage and the figure lab.
 * Intensities are the ones the ink kit's hatching thresholds are calibrated
 * against (lighting ratio: ambient ≈ 0.54, key ≈ 0.76 — hatching depends on
 * light intensity, not on exposure); colours are neutral so pigments and
 * paper render as authored. With the renderer's laminaToneMapping @
 * TONE_EXPOSURE (renderer.js) the paper (#fbf8f1) renders at
 * ≈ (251, 248, 240) and a cast shadow on it at ≈ 203.
 *
 *   hemi  sky #ffffff / ground #f3f1ed, 1.85   soft fill
 *   key   #fffdf9, 2.55 from (−1.6, 3.4, 1.4)  top-left key, casts the shadows
 *   rim   #eaf0ff, 0.45 from (1.2, 1.5, −2.4)  cool separation light from behind
 *
 * Add every object in `list` to the scene (it includes key.target).
 *
 * @param {object} [o]
 * @param {number} [o.shadowMapSize=2048]
 * @param {number} [o.shadowRadius=3]   PCF softness in texels
 * @param {THREE.Box3} [o.shadowBox]    world box the key's shadow must cover
 * @returns {{ hemi: THREE.HemisphereLight, key: THREE.DirectionalLight, rim: THREE.DirectionalLight,
 *            list: THREE.Object3D[], fitShadow: (box: THREE.Box3) => void }}
 */
export function createLights({ shadowMapSize = 2048, shadowRadius = 3, shadowBox } = {}) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0xf3f1ed, 1.85);
  hemi.name = 'fill';
  const key = new THREE.DirectionalLight(0xfffdf9, 2.55);
  key.name = 'key';
  key.position.set(-1.6, 3.4, 1.4).multiplyScalar(1.4);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.006;
  key.shadow.radius = shadowRadius;
  key.shadow.filterNode = keyShadowFilter(key.shadow); // = PCFShadowMap (renderer.js), without the per-build uniforms
  const rim = new THREE.DirectionalLight(0xeaf0ff, 0.45);
  rim.name = 'rim';
  rim.position.set(1.2, 1.5, -2.4);

  const view = new THREE.Matrix4();
  const corner = new THREE.Vector3();
  /** Tighten the key's orthographic shadow frustum around a world box. */
  function fitShadow(box) {
    key.updateMatrixWorld();
    key.target.updateMatrixWorld();
    view.lookAt(key.position, key.target.position, THREE.Object3D.DEFAULT_UP);
    view.setPosition(key.position);
    view.invert();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(view);
      x0 = Math.min(x0, corner.x); x1 = Math.max(x1, corner.x);
      y0 = Math.min(y0, corner.y); y1 = Math.max(y1, corner.y);
      z0 = Math.min(z0, corner.z); z1 = Math.max(z1, corner.z);
    }
    const c = key.shadow.camera;
    c.left = x0 - 0.02;
    c.right = x1 + 0.02;
    c.bottom = y0 - 0.02;
    c.top = y1 + 0.02;
    c.near = Math.max(0.05, -z1 - 0.2);
    c.far = -z0 + 0.2;
    c.updateProjectionMatrix();
  }
  fitShadow(shadowBox ?? new THREE.Box3(new THREE.Vector3(-1.1, -0.05, -0.78), new THREE.Vector3(1.1, 1.08, 0.78)));
  setPaperLight(key.position.clone().sub(key.target.position), key.color, key.intensity);
  return { hemi, key, rim, list: [hemi, key, key.target, rim], fitShadow };
}

/**
 * Build the stage.
 * @param {THREE.WebGPURenderer} renderer
 * @param {{ reducedMotion?: boolean, lowPower?: boolean }} [o]
 */
export function createStage(renderer, { reducedMotion = false, lowPower } = {}) {
  lowPower ??= typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const scene = new THREE.Scene();
  scene.background = null; // canvas clears transparent over CSS white (backgrounds are tone-mapped)

  const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 60);
  camera.position.set(0, 4.8, 2.6);

  const lights = createLights({ shadowMapSize: lowPower ? 2048 : 3072 });
  for (const o of lights.list) scene.add(o);
  const { hemi, key, rim } = lights;

  // The book lives under `world`, which floats. It declares where the float
  // rests, so an SVG export holds it there for its passes (the exporter reads
  // userData.restPose on a figure's ancestors): a colour plate and its
  // colouring page, exported a moment apart, see the very same geometry.
  const world = new THREE.Group();
  world.name = 'world';
  world.userData.restPose = { position: [0, FLOAT_Y, 0], rotation: [0, 0, 0] };
  scene.add(world);

  const ground = makeGround();
  scene.add(ground.group);

  const rig = new CameraRig(camera, { reducedMotion });
  let book = null;

  /** Attach the reading book: framing follows its open/closed state (null detaches). */
  function setBook(b) {
    book = b;
    rig.attachBook(b);
  }
  // keep the key's shadow frustum tight around whatever the rig frames
  rig.onFitBox = (box) => {
    const b = box.clone();
    b.min.y = Math.min(b.min.y, -0.05);
    b.max.y = Math.max(b.max.y, 1.08);
    b.expandByVector(new THREE.Vector3(0.05, 0, 0.05));
    lights.fitShadow(b);
  };
  rig.onFitBox(rig.fitBox);

  function resize(width, height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
    rig.viewHeight = Math.max(1, height); // CSS px: turns setInsets() bands into NDC
    rig.refit();
  }

  let floatT = 0;
  let scanT = 0;
  const books = [];
  function update(dt) {
    // find every Book in the world (reader: one; library: a shelf) twice a second
    scanT -= dt;
    if (scanT <= 0) {
      scanT = 0.5;
      books.length = 0;
      world.traverse((o) => {
        if (o.isBook && books.length < MAX_GROUND_BOOKS) books.push(o);
      });
      if (book && !book.parent) setBook(null);
      if (!book) {
        const direct = world.children.find((c) => c.isBook);
        if (direct) setBook(direct);
      }
    }
    if (!reducedMotion) {
      floatT += dt;
      world.position.y = FLOAT_Y + Math.sin(floatT * 0.9) * 0.005;
      world.rotation.z = Math.sin(floatT * 0.55) * 0.0025;
      world.rotation.x = Math.sin(floatT * 0.7 + 1.3) * 0.0018;
    } else {
      world.position.y = FLOAT_Y;
    }
    ground.update(world.position.y, books);
    rig.update(dt);
  }

  return { scene, camera, world, key, hemi, rim, lights, ground: ground.group, blob: ground.group, rig, resize, update, setBook };
}

/**
 * Ground under the books: an analytic soft contact shadow (two rectangles per
 * book, one per half, faded by how much of the book lies there) plus a
 * transparent shadow catcher for the key light's real shadows (a lifted
 * page's shadow sweeping past the fore-edge). Outside the shadows both are
 * exactly transparent, so the page stays #ffffff. Up to four books (the
 * library shelf) get contact shadows.
 */
const MAX_GROUND_BOOKS = 4;
function makeGround() {
  const group = new THREE.Group();
  group.name = 'ground';
  const Wb = WORLD.pageW + WORLD.coverOverhang;
  const Hb2 = WORLD.pageH / 2 + WORLD.coverOverhang;

  const lift = uniform(FLOAT_Y);
  const slots = [];
  for (let k = 0; k < MAX_GROUND_BOOKS; k++) {
    slots.push({ pos: uniform(new THREE.Vector2()), presL: uniform(0), presR: uniform(0) });
  }
  const geo = new THREE.PlaneGeometry(9, 6).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  mat.name = 'contact-shadow';
  // shadow sits a hair towards +x / −z: away from the key light
  const p = positionWorld.xz.sub(vec2(0.006, -0.005));
  const half = vec2(Wb / 2, Hb2);
  const sdBox = (c) => {
    const q = abs(p.sub(c)).sub(half);
    return length(max(q, vec2(0, 0))).add(min(max(q.x, q.y), 0));
  };
  const shade = (d) => {
    const core = float(1).sub(smoothstep(-0.008, lift.mul(0.6).add(0.008), d));
    const soft = float(1).sub(smoothstep(-0.03, lift.mul(1.4).add(0.026), d));
    return core.mul(0.34).add(soft.mul(0.1));
  };
  let a = float(0);
  for (const sl of slots) {
    const dL = sdBox(sl.pos.add(vec2(-Wb / 2, 0)));
    const dR = sdBox(sl.pos.add(vec2(Wb / 2, 0)));
    a = max(a, max(shade(dL).mul(sl.presL), shade(dR).mul(sl.presR)));
  }
  mat.colorNode = tslColor(0x4f483e);
  mat.opacityNode = a.mul(float(1).sub(lift.mul(6)).clamp(0.4, 1));
  const contact = new THREE.Mesh(geo, mat);
  contact.name = 'contact-shadow';
  contact.renderOrder = -2;
  group.add(contact);

  const catcherMat = new THREE.ShadowNodeMaterial({ color: 0x4a443b, opacity: 0.13, depthWrite: false });
  catcherMat.name = 'shadow-catcher';
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(9, 6).rotateX(-Math.PI / 2), catcherMat);
  catcher.name = 'shadow-catcher';
  catcher.receiveShadow = true;
  catcher.renderOrder = -1;
  catcher.position.y = -0.0005;
  group.add(catcher);

  const wp = new THREE.Vector3();
  /** @param {number} y float height  @param {Array} books Book instances (world space) */
  function update(y, books) {
    lift.value = y;
    for (let k = 0; k < MAX_GROUND_BOOKS; k++) {
      const sl = slots[k];
      const b = books[k];
      if (!b) {
        sl.presL.value = 0;
        sl.presR.value = 0;
        continue;
      }
      b.getWorldPosition(wp);
      sl.pos.value.set(wp.x, wp.z);
      const f = b.footprint ?? b.presence;
      sl.presL.value = f.left;
      sl.presR.value = f.right;
    }
  }
  return { group, update };
}

const _v = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.03);
const _ndc = new THREE.Vector2();
const _ext = { x0: 0, x1: 0, y0: 0, y1: 0, inFront: true };
const _bandOut = { lo: -1, hi: 1 };

/**
 * Camera rig.
 *  - 'book'    frames the spread (landscape) or one page (portrait, aspect < 0.9)
 *              at ~45° elevation so pop-ups read in 3/4 view while text stays
 *              legible, between the screen bands the UI reserves (setInsets);
 *              follows a closed book to the centre; zoom 1×–3× towards the
 *              pointer, pan while zoomed (over the framed page), small clamped orbit.
 *  - 'inspect' orbits a point (a figure) at a distance; free azimuth, clamped
 *              elevation, dolly zoom (as near as the subject allows: minDistance);
 *              carry() moves it with a moving subject (a head up close).
 * Transitions are damped; call `update(dt)` every frame.
 */
export class CameraRig {
  constructor(camera, { reducedMotion = false } = {}) {
    this.camera = camera;
    this.reducedMotion = reducedMotion;
    this.mode = 'book';
    this.baseElevation = THREE.MathUtils.degToRad(45);
    /** Minimum elevation on portrait screens: one page, seen more face-on, fills a tall view. */
    this.portraitElevation = THREE.MathUtils.degToRad(58);
    this.elevation = this.baseElevation; // book-mode elevation (user orbit included)
    this.azimuth = 0;
    this.fill = 0.95; // fraction of the viewport width the framed box spans
    this.bottomInset = 0.1; // NDC reserved at the bottom (toolbar)
    this.topInset = 0.03;
    /** Screen bands the UI draws over, in CSS px ({ top, bottom }), or null — see setInsets(). */
    this.insetPx = null;
    /** Viewport height in CSS px (createStage's resize keeps it current). */
    this.viewHeight = 1;
    this.focus = 'auto'; // 'auto' | 'spread' | 'left' | 'right'
    this.zoom = 1;
    this.minZoom = 1;
    this.maxZoom = 3;
    this.book = null;
    this.panOffset = new THREE.Vector3();
    const Wb = WORLD.pageW + WORLD.coverOverhang;
    const Hb2 = WORLD.pageH / 2 + WORLD.coverOverhang;
    this.fitBox = new THREE.Box3(new THREE.Vector3(-Wb, 0, -Hb2), new THREE.Vector3(Wb, 0.08, Hb2));
    this.target = new THREE.Vector3();
    this.distance = 5;
    this.currentElevation = this.elevation;
    this.currentAzimuth = 0;
    this._fit = { target: new THREE.Vector3(), distance: 5 };
    this._goal = { target: new THREE.Vector3(), distance: 5, elevation: this.elevation, azimuth: 0 };
    /** radius: the subject's sphere (world units), 0 when its size is unknown (see minDistance). */
    this.inspectState = { target: new THREE.Vector3(), distance: 1.2, elevation: 0.6, azimuth: 0.4, radius: 0 };
    /** The camera's own near plane: the book views', and inspect's from 0.5 out (see NEAR_SHARE). */
    this.baseNear = camera.near;
    this._probe = camera.clone();
    this._box = new THREE.Box3(); // the framed region: union of the (focus-clipped) parts
    this._parts = []; // setFitBox parts (Box3 pool) and how many are in use
    this._partCount = 0;
    this._fitList = []; // the clipped boxes the solver frames (Box3 pool, reused)
    this._effFocus = 'spread';
    this._pageSide = 1;
    this.refit();
    this.snap();
  }

  /** Follow a Book: closed books are centred; portrait focus avoids empty sides. */
  attachBook(book) {
    this.book = book ?? null;
    this.refit();
    if (book) this.snap();
  }

  _bookElevation() {
    return this.isPortrait ? Math.max(this.elevation, this.portraitElevation) : this.elevation;
  }

  get isPortrait() {
    return this.camera.aspect < 0.9;
  }

  /** The focus actually used ('spread' | 'left' | 'right'). */
  get effectiveFocus() {
    return this._effFocus;
  }

  /**
   * Replace the spread box (world space). Pass `parts` (e.g. [spread, pop-up
   * figure]) to frame each box on its own: their union's empty corners (the
   * figure's height over the whole spread, nearest the camera) would
   * otherwise make the fit width-bound and shrink the book. `box` (their
   * union) still drives the shadow frustum.
   * @param {THREE.Box3} box
   * @param {THREE.Box3[]|null} [parts]
   */
  setFitBox(box, parts = null) {
    this.fitBox.copy(box);
    const n = parts?.length ?? 0;
    for (let i = this._parts.length; i < n; i++) this._parts.push(new THREE.Box3());
    for (let i = 0; i < n; i++) this._parts[i].copy(parts[i]);
    this._partCount = n;
    this.onFitBox?.(this.fitBox);
    this.refit();
  }

  /**
   * Reserve the screen bands the UI draws over (toolbar, beat caption, top
   * bar), in CSS px: the book is framed between them, never under them.
   * Never less than the default margins; null restores the defaults.
   * @param {{ top?: number, bottom?: number } | null} px
   */
  setInsets(px) {
    const top = px ? Math.max(0, Math.round(+px.top || 0)) : 0;
    const bottom = px ? Math.max(0, Math.round(+px.bottom || 0)) : 0;
    const cur = this.insetPx;
    if (px ? cur && cur.top === top && cur.bottom === bottom : !cur) return;
    this.insetPx = px ? { top, bottom } : null;
    this.refit();
  }

  /**
   * Frame one page or the spread. 'auto' = spread in landscape, the recto in
   * portrait. Smoothly animated.
   * @param {'left'|'right'|'spread'|'auto'} which
   */
  focusPage(which = 'auto') {
    this.focus = which;
    this.panOffset.set(0, 0, 0);
    this.zoom = 1;
    this.refit();
  }

  /** Recompute the book-mode framing for the current aspect, focus and orbit. */
  refit() {
    let f = this.focus === 'auto' ? (this.isPortrait ? 'right' : 'spread') : this.focus;
    const pres = this.book?.presence;
    if (f !== 'spread' && pres) {
      // a single-page focus never frames an empty side of a closed book
      if (f === 'right' && pres.right < 0.5) f = 'left';
      else if (f === 'left' && pres.left < 0.5) f = 'right';
    }
    this._effFocus = f;
    // the parts (or the one box) clipped to the focused page; their union is the framed region
    const list = this._fitList;
    const union = this._box.makeEmpty();
    const n = Math.max(1, this._partCount);
    let count = 0;
    for (let i = 0; i < n; i++) {
      if (!list[count]) list[count] = new THREE.Box3();
      const b = list[count].copy(this._partCount ? this._parts[i] : this.fitBox);
      if (f === 'right') b.min.x = Math.max(b.min.x, 0);
      if (f === 'left') b.max.x = Math.min(b.max.x, 0);
      if (b.isEmpty()) continue;
      union.union(b);
      count++;
    }
    if (!count) {
      // nothing left on the focused side (a part-less clip): frame the whole box
      list[0].copy(this.fitBox);
      union.copy(this.fitBox);
      count = 1;
    }
    this._solveFit(list, count, union, this._bookElevation(), this.azimuth, this._fit);
    this._clampPan();
  }

  /** NDC band [yLo, yHi] left for the book once the UI's bands (setInsets) are reserved. */
  _band() {
    let bi = this.bottomInset;
    let ti = this.topInset;
    const px = this.insetPx;
    const h = this.viewHeight;
    if (px && h > 1) {
      // (before the first resize the height is unknown: keep the defaults)
      bi = Math.max(bi, (2 * px.bottom) / h);
      ti = Math.max(ti, (2 * px.top) / h);
      // a very short view keeps at least 40 % of its height for the book
      const sum = bi + ti;
      if (sum > 1.2) {
        bi *= 1.2 / sum;
        ti *= 1.2 / sum;
      }
    }
    _bandOut.lo = -1 + bi;
    _bandOut.hi = 1 - ti;
    return _bandOut;
  }

  _solveFit(boxes, count, union, elev, az, out) {
    const cam = this._probe;
    cam.fov = this.camera.fov;
    cam.aspect = this.camera.aspect;
    cam.near = this.baseNear; // (a close-up may have brought the camera's in)
    cam.far = this.camera.far;
    cam.updateProjectionMatrix();
    const tgt = union.getCenter(out.target);
    const { lo: yLo, hi: yHi } = this._band();
    const yMid = (yLo + yHi) / 2;
    const yHalf = (yHi - yLo) / 2;
    const th = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    const ext = _ext;
    let dist = 4;
    for (let iter = 0; iter < 3; iter++) {
      let lo = 0.2;
      let hi = 80;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        placeCamera(cam, tgt, mid, elev, az);
        projectBoxes(cam, boxes, count, ext);
        const fits = (ext.x1 - ext.x0) / 2 <= this.fill && (ext.y1 - ext.y0) / 2 <= yHalf && ext.inFront;
        if (fits) hi = mid;
        else lo = mid;
      }
      dist = hi;
      placeCamera(cam, tgt, dist, elev, az);
      projectBoxes(cam, boxes, count, ext);
      const cx = (ext.x0 + ext.x1) / 2;
      const cy = (ext.y0 + ext.y1) / 2;
      _right.setFromMatrixColumn(cam.matrixWorld, 0);
      _up.setFromMatrixColumn(cam.matrixWorld, 1);
      tgt.addScaledVector(_right, cx * dist * th * cam.aspect).addScaledVector(_up, (cy - yMid) * dist * th);
    }
    out.distance = dist;
  }

  setMode(mode) {
    if (mode === 'inspect') this.mode = 'inspect';
    else this.exitInspect();
  }

  /**
   * Orbit a world point (e.g. a figure's centre) at `distance`.
   * Pass `o.radius` (world units) when the subject is a sphere of that radius:
   * the view is guaranteed to fit it at this camera's field of view (the
   * distance is raised if needed), and the dolly may come as near as its size
   * allows (see minDistance).
   * @param {THREE.Vector3} targetWorld
   * @param {number} [distance]
   * @param {{ elevation?: number, azimuth?: number, radius?: number }} [o] radians
   */
  inspect(targetWorld, distance = 1.2, o = {}) {
    const s = this.inspectState;
    s.target.copy(targetWorld);
    s.radius = o.radius > 0 ? o.radius : 0;
    if (s.radius) distance = Math.max(distance, this.distanceToFit(s.radius));
    s.distance = clamp(distance, this.minDistance, INSPECT_MAX_DISTANCE);
    s.elevation = o.elevation ?? THREE.MathUtils.degToRad(30);
    s.azimuth = o.azimuth ?? (this.mode === 'inspect' ? s.azimuth : THREE.MathUtils.degToRad(24));
    this.mode = 'inspect';
  }

  /** Inspect a sphere (centre, radius) framed to fill ~70% of the view; it is the subject (see minDistance). */
  inspectSphere(center, radius, o = {}) {
    this.inspect(center, this.distanceToFit(radius), { ...o, radius });
  }

  /**
   * The nearest the inspect camera comes (world units): INSPECT_MIN_DISTANCE,
   * or for a small sphere subject (inspect's `o.radius`) the distance at which
   * it spans SUBJECT_FILL_MAX × the view's short side (in the view's current
   * shape) — never so near that the near plane (see _place) would cut it.
   */
  get minDistance() {
    const r = this.inspectState.radius;
    if (!(r > 0)) return INSPECT_MIN_DISTANCE;
    const clear = Math.max(r / (1 - NEAR_SHARE), r + NEAR_MIN) * 1.05;
    return Math.min(INSPECT_MIN_DISTANCE, Math.max(this.distanceToFit(r, SUBJECT_FILL_MAX), clear));
  }

  /**
   * Carry the inspect view with a moving subject (a head close-up following
   * the head through the loop): the camera's target and the inspect target
   * move by `delta` (world units) as they are, undamped, so the subject keeps
   * its place on screen however fast it moves, and the camera is placed again
   * at once (call it after the subject is posed, before the frame is drawn:
   * the rig's own update may already have run). `turn` (radians) adds to the
   * inspect azimuth, which the rig damps as ever, so the view can turn with a
   * turning subject. An approach under way stays damped (relative to the
   * subject), and an orbit or zoom of the reader's own adds to it. No-op
   * outside inspect.
   * @param {THREE.Vector3} delta
   * @param {number} [turn]
   */
  carry(delta, turn = 0) {
    if (this.mode !== 'inspect') return;
    this.target.add(delta);
    this.inspectState.target.add(delta);
    if (turn) this.inspectState.azimuth += turn;
    this._place();
  }

  /** Camera distance at which a sphere of `radius` fills `fill` of the smaller view extent. */
  distanceToFit(radius, fill = 0.7) {
    const th = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * Math.min(1, this.camera.aspect);
    return radius / (fill * th);
  }

  /** Return to the book framing. */
  exitInspect() {
    this.mode = 'book';
  }

  /** Orbit by (dAzimuth, dElevation) radians — free in inspect mode, gently clamped over the book. */
  orbit(dAz, dEl) {
    if (this.mode === 'inspect') {
      const s = this.inspectState;
      s.azimuth += dAz;
      s.elevation = clamp(s.elevation + dEl, 0.1, 1.45);
      return;
    }
    this.azimuth = clamp(this.azimuth + dAz, -0.5, 0.5);
    this.elevation = clamp(this.elevation + dEl, 0.55, 1.25);
    this.refit();
  }

  /**
   * Zoom by `factor` (>1 = closer). Book mode: 1×–3× towards the point under
   * `ndcPoint` (so it stays under the pointer). Inspect mode: dolly.
   * @param {number} factor
   * @param {{x:number,y:number}} [ndcPoint]
   */
  zoomBy(factor, ndcPoint) {
    if (!(factor > 0)) return;
    if (this.mode === 'inspect') {
      const s = this.inspectState;
      s.distance = clamp(s.distance / factor, Math.min(this.minDistance, s.distance), INSPECT_MAX_DISTANCE);
      return;
    }
    const z0 = this.zoom;
    const z1 = clamp(z0 * factor, this.minZoom, this.maxZoom);
    if (z1 === z0) return;
    if (ndcPoint) {
      _ndc.set(ndcPoint.x, ndcPoint.y);
      this.camera.updateMatrixWorld();
      _ray.setFromCamera(_ndc, this.camera);
      if (_ray.ray.intersectPlane(_plane, _v)) {
        // new goal target = P + (goal − P)·(z0/z1): the point stays put on screen
        const goal = this._bookGoalTarget(_up);
        const r = z0 / z1;
        const nx = _v.x + (goal.x - _v.x) * r;
        const ny = _v.y + (goal.y - _v.y) * r;
        const nz = _v.z + (goal.z - _v.z) * r;
        this.panOffset.x += nx - goal.x;
        this.panOffset.y += ny - goal.y;
        this.panOffset.z += nz - goal.z;
      }
    }
    this.zoom = z1;
    this._clampPan();
  }

  /** Pan the zoomed book view by a pointer delta in NDC (book mode only). */
  pan(dxNdc, dyNdc) {
    if (this.mode === 'inspect' || this.zoom <= 1.0001) return;
    const th = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const d = this.distance;
    const ca = Math.cos(this.currentAzimuth);
    const sa = Math.sin(this.currentAzimuth);
    const sx = -dxNdc * d * th * this.camera.aspect;
    const sz = (dyNdc * d * th) / Math.max(0.3, Math.sin(this.currentElevation));
    this.panOffset.x += sx * ca + sz * sa;
    this.panOffset.z += -sx * sa + sz * ca;
    this._clampPan();
  }

  /** Back to the default framing: zoom 1, no pan, no orbit, book mode. */
  reset() {
    this.zoom = 1;
    this.panOffset.set(0, 0, 0);
    this.elevation = this.baseElevation;
    this.azimuth = 0;
    this.mode = 'book';
    this.refit();
  }

  _clampPan() {
    // stay over the framed region (one page in portrait), never wander into white
    const k = 1 - 1 / this.zoom;
    const b = this._box.isEmpty() ? this.fitBox : this._box;
    const hx = (b.max.x - b.min.x) / 2;
    const hz = (b.max.z - b.min.z) / 2;
    this.panOffset.x = clamp(this.panOffset.x, -hx * k, hx * k);
    this.panOffset.z = clamp(this.panOffset.z, -hz * k, hz * k);
    this.panOffset.y = clamp(this.panOffset.y, -0.4 * k, 0.4 * k);
  }

  /** Book-mode goal target (fit + closed-book offset + user pan) into `out`. */
  _bookGoalTarget(out) {
    out.copy(this._fit.target).add(this.panOffset);
    const pres = this.book?.presence;
    if (pres && this._effFocus === 'spread') {
      const Wb = WORLD.pageW + WORLD.coverOverhang;
      out.x += ((pres.right - pres.left) * Wb) / 2;
    }
    return out;
  }

  _updateGoal() {
    const g = this._goal;
    if (this.mode === 'inspect') {
      const s = this.inspectState;
      g.target.copy(s.target);
      g.distance = s.distance;
      g.elevation = s.elevation;
      g.azimuth = s.azimuth;
      return g;
    }
    // a single-page focus switches sides if the book closes onto the other side
    const pres = this.book?.presence;
    if (pres && this._effFocus !== 'spread') {
      const want = this._effFocus === 'right' ? pres.right < 0.5 : pres.left < 0.5;
      if (want) this.refit();
    }
    this._bookGoalTarget(g.target);
    g.distance = this._fit.distance / this.zoom;
    g.elevation = this._bookElevation();
    g.azimuth = this.azimuth;
    return g;
  }

  /** Jump to the goal (no animation). */
  snap() {
    const g = this._updateGoal();
    this.target.copy(g.target);
    this.distance = g.distance;
    this.currentElevation = g.elevation;
    this.currentAzimuth = g.azimuth;
    this._place();
  }

  update(dt) {
    const g = this._updateGoal();
    const k = this.reducedMotion ? 40 : 6.5;
    this.target.x = damp(this.target.x, g.target.x, k, dt);
    this.target.y = damp(this.target.y, g.target.y, k, dt);
    this.target.z = damp(this.target.z, g.target.z, k, dt);
    this.distance = damp(this.distance, g.distance, k, dt);
    this.currentElevation = damp(this.currentElevation, g.elevation, k, dt);
    this.currentAzimuth = damp(this.currentAzimuth, g.azimuth, k, dt);
    this._place();
  }

  /** Place the camera for the current target, distance and angles, its near plane with it (see NEAR_SHARE). */
  _place() {
    const cam = this.camera;
    const near = clamp(this.distance * NEAR_SHARE, Math.min(NEAR_MIN, this.baseNear), this.baseNear);
    if (near !== cam.near) {
      cam.near = near;
      cam.updateProjectionMatrix();
    }
    placeCamera(cam, this.target, this.distance, this.currentElevation, this.currentAzimuth);
  }
}

function placeCamera(cam, target, dist, elevation, azimuth) {
  cam.position.set(
    target.x + Math.sin(azimuth) * Math.cos(elevation) * dist,
    target.y + Math.sin(elevation) * dist,
    target.z + Math.cos(azimuth) * Math.cos(elevation) * dist
  );
  cam.lookAt(target);
  cam.updateMatrixWorld();
}

const _c = new THREE.Vector3();
/** NDC extent of the union of the first `n` boxes' projected corners (inFront: all before the near plane). */
function projectBoxes(cam, boxes, n, out) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  let inFront = true;
  cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  for (let k = 0; k < n; k++) {
    const b = boxes[k];
    for (let i = 0; i < 8; i++) {
      _c.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
      _c.applyMatrix4(cam.matrixWorldInverse);
      if (_c.z > -cam.near) inFront = false;
      _c.applyMatrix4(cam.projectionMatrix);
      x0 = Math.min(x0, _c.x); x1 = Math.max(x1, _c.x);
      y0 = Math.min(y0, _c.y); y1 = Math.max(y1, _c.y);
    }
  }
  out.x0 = x0; out.x1 = x1; out.y0 = y0; out.y1 = y1; out.inFront = inFront;
  return out;
}
