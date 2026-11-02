// Input: one pointer layer for the book — page drags with fling, the pop-up
// figure turntable, pinch / wheel zoom, trackpad and touch swipes, taps and
// double-taps — for mouse, touch and pen alike. Mouse/pen drags starting on
// white space tilt the book towards a frontal reading view. Zoomed in, drags
// on paper (or Shift-drags on white space) pan; taps, keys and the toolbar turn.
//
// Why a single router: every gesture starts with a pointerdown, and what it
// means depends on what is under the pointer (a pop-up figure, a page or a
// board, or white space). Deciding once, on pointerdown, keeps gestures from
// fighting each other and from fighting the browser (touch-action: none).
// (A press on a page only waits for the stroke's direction: see 'page-pending'.)
import * as THREE from 'three/webgpu';

const TAP_SLOP = { mouse: 6, pen: 8, touch: 12 };
const DOUBLE_TAP_MS = 330;
const FIGURE_YAW_PER_PX = 0.011;
const ORBIT_PER_PX = 0.0065;
/** A deliberate vertical stroke outside the book spans its full reading-angle range. */
const BOOK_TILT_PER_PX = 1 / 280;
/** Above this zoom the paper is what you hold to move the view: drags pan, taps still turn. */
const PAN_ZOOM = 1.05;
/** A wheel gesture that started as a pan keeps panning (both axes) while its events keep coming. */
const WHEEL_PAN_LATCH_MS = 120;
/** Hover runs at most one precise figure pick per this many ms… */
const HOVER_PICK_MS = 90;
/** …and spends at most ~1/this of the time on them (one pick through a 310k-triangle skull: 5–25 ms). */
const HOVER_PICK_RATIO = 30;
/** Hover asks a near-miss test (o.nearFigure) this far (CSS px) past the figure's bounds: a pen's or a fingertip's radius. */
const HOVER_NEAR_PX = 24;

/**
 * Wire pointer, wheel (and optionally keyboard) input to the book, the
 * camera rig and the figure host.
 *
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {{ camera: THREE.Camera, rig: import('./stage.js').CameraRig }} o.stage
 * @param {import('./book/Book.js').Book} o.book
 * @param {import('./figures/FigureHost.js').FigureHost} [o.host]
 * @param {(info: TapInfo) => void} [o.onTap]
 *        kind 'page' | 'figure' | 'background'; pages carry leaf, side ('front'|'back'),
 *        u, v (0..1 in that side's texture, v from the head), s, z, board, face.
 * @param {(info: TapInfo|null) => (string|void)} [o.onHover]
 *        hover changes (mouse/pen); return a CSS cursor (e.g. 'pointer' over a printed link) to override.
 * @param {(info: { point: THREE.Vector3, part: object|null }) => void} [o.onInspect]
 *        double-click / double-tap on the pop-up figure.
 * @param {(dir: 1|-1, how: string) => void} [o.onNavigate]
 *        swipe / wheel / key navigation; default calls book.next() / book.prev().
 * @param {(x: number, y: number, pointerType: string) => boolean} [o.nearFigure]
 *        whether a screen point (CSS px) is on or just beside the pop-up figure, within a
 *        radius by pointer type (the reader's near-miss test). A press there, on the figure's
 *        own page or on the white around it, that misses the figure itself still holds it: a
 *        drag turns it (instead of lifting the page), and hover shows 'grab'. A tap there
 *        stays the page or background tap it was, for onTap to read as a near miss.
 * @param {boolean} [o.keyboard=false]  arrows, PageUp/Down, Space, Home/End, +/−, 0, Esc.
 * @returns {{ dispose: () => void, setEnabled: (on: boolean) => void, readonly dragging: boolean }}
 *
 * @typedef {{ kind: 'page'|'figure'|'background', leaf?: number, side?: 'front'|'back', u?: number|null,
 *             v?: number|null, s?: number, z?: number, board?: boolean, face?: string,
 *             point?: THREE.Vector3, part?: object|null, x: number, y: number, pointerType: string }} TapInfo
 */
export function createInput({ canvas, stage, book, host, onTap, onHover, onInspect, onNavigate, nearFigure, keyboard = false }) {
  const rig = stage.rig;
  const camera = stage.camera;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const inv = new THREE.Matrix4();
  const localRay = new THREE.Ray();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitLocal = new THREE.Vector3();
  const sphere = new THREE.Sphere();
  const eye = new THREE.Vector3();
  const pointers = new Map(); // pointerId → { x, y, type }
  let gesture = null;
  let enabled = true;
  let lastTap = { t: 0, x: 0, y: 0, kind: '' };
  let hoverEvt = null;
  let hoverRaf = 0;
  /** The last precise hover pick: for which mount, its answer, when the next may run, its cost (ms, smoothed). */
  const hoverPick = { mount: null, hit: false, next: 0, cost: 0, timer: 0 };
  let cursor = '';
  const wheel = { acc: 0, last: 0, lockUntil: 0, locked: false, panAt: -1e9 };
  let gestureScale = 1;

  canvas.style.touchAction = 'none';

  const rectOf = () => canvas.getBoundingClientRect();
  function setNdc(clientX, clientY) {
    const r = rectOf();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    return ndc;
  }
  function setRay(clientX, clientY) {
    setNdc(clientX, clientY);
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    return ray;
  }
  function setCursor(c) {
    if (c === cursor) return;
    cursor = c;
    canvas.style.cursor = c;
  }

  /** Pointer projected onto the book's page plane, in book-local coordinates. */
  function bookPoint(clientX, clientY, planeY) {
    setRay(clientX, clientY);
    book.updateWorldMatrix(true, false);
    inv.copy(book.matrixWorld).invert();
    localRay.copy(ray.ray).applyMatrix4(inv);
    plane.constant = -planeY;
    return localRay.intersectPlane(plane, hitLocal);
  }

  function navigate(dir, how) {
    if (onNavigate) onNavigate(dir, how);
    else if (dir > 0) book.next();
    else book.prev();
  }

  /** Zoomed in over the book: one-finger / mouse drags and sideways scrolls pan instead of turning. */
  const zoomedIn = () => rig.mode === 'book' && rig.zoom > PAN_ZOOM;

  // ---------------------------------------------------------------- picking
  function activeMount() {
    const m = host?.active;
    return m && m.figure && m.anchor?.visible && (m.foldValue ?? 1) > 0.5 ? m : null;
  }

  /** Precise figure pick (used on pointerdown / taps). */
  function pickFigure() {
    const m = activeMount();
    if (!m) return null;
    if (typeof host.pickFigure === 'function') {
      const h = host.pickFigure(ray);
      return h ? { point: h.point, part: h.part ?? null, distance: h.distance } : null;
    }
    const hits = [];
    m.anchor.traverseVisible((o) => {
      if (o.isMesh && !o.userData.isOutline) o.raycast(ray, hits);
    });
    hits.sort((a, b) => a.distance - b.distance);
    return hits[0] ? { point: hits[0].point, part: null, distance: hits[0].distance } : null;
  }

  /**
   * A near miss on the pop-up (o.nearFigure): a press just beside it (a
   * fingertip aimed at a 7 px coil) holds the figure as one on it would. Only
   * where a tap there is a near miss too: on the figure's own page (the
   * recto) or on the white around it — never across the gutter.
   * @param {object|null} hit  book.pick() under the pointer
   */
  function nearMiss(x, y, type, hit) {
    if (!nearFigure || !activeMount()) return false;
    if (hit && (hit.side !== 'front' || hit.leaf !== book.rightLeaf)) return false;
    return !!nearFigure(x, y, type);
  }

  /** World units per CSS px at a world point (at its distance from the camera). */
  function pxWorld(p) {
    const th = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    return (2 * camera.getWorldPosition(eye).distanceTo(p) * th) / Math.max(1, rectOf().height);
  }

  /**
   * Hover test: the same precise pick as a press, so 'grab' shows over the
   * figure only and the blank paper around a coil keeps the page cursor. One
   * pick through a dense figure is dear, so a ray that misses the figure's
   * bounds needs none, at most one runs per HOVER_PICK_MS (fewer when they
   * are dear), the last answer stands in between, and one more runs once
   * the pointer rests. 'near' is a near miss a press would also turn the
   * figure from (see nearMiss).
   * @param {{ x: number, y: number, type: string }} h  the hover point
   * @param {object|null} hit  book.pick() under it
   * @returns {'on'|'near'|''}
   */
  function hoverFigure(h, hit) {
    const hp = hoverPick;
    const m = activeMount();
    if (m !== hp.mount) {
      hp.mount = m;
      hp.hit = '';
      hp.cost = 0;
    }
    if (!m || typeof host.focusPoint !== 'function' || !host.focusPoint(sphere.center)) return '';
    // the fit box's sphere, a little larger: the loop can carry a part past
    // the box (and a near-miss test reaches a few px past the figure)
    sphere.radius = (host.figureRadius?.() ?? 0.2) * 1.25;
    if (nearFigure) sphere.radius += HOVER_NEAR_PX * pxWorld(sphere.center);
    if (!ray.ray.intersectsSphere(sphere)) return (hp.hit = '');
    const now = performance.now();
    if (now < hp.next) {
      if (!hp.timer) hp.timer = setTimeout(onHoverTimer, hp.next - now);
      return hp.hit;
    }
    hp.hit = pickFigure() ? 'on' : nearMiss(h.x, h.y, h.type, hit) ? 'near' : '';
    const end = performance.now();
    hp.cost = hp.cost > 0 ? hp.cost * 0.6 + (end - now) * 0.4 : end - now;
    hp.next = end + Math.max(HOVER_PICK_MS, hp.cost * HOVER_PICK_RATIO);
    return hp.hit;
  }
  function onHoverTimer() {
    hoverPick.timer = 0;
    if (hoverEvt && !hoverRaf) hoverRaf = requestAnimationFrame(runHover);
  }

  function pageInfo(hit, x, y, type) {
    return {
      kind: 'page',
      leaf: hit.leaf,
      side: hit.side,
      u: hit.u,
      v: hit.v,
      s: hit.s,
      z: hit.z,
      board: hit.board,
      face: hit.face,
      point: hit.point,
      x,
      y,
      pointerType: type,
    };
  }

  /** Which way a drag starting on this hit turns: +1 forward (recto), −1 back (verso). */
  function dragSideFor(hit) {
    const l = book.leaves[hit.leaf];
    if (l && l.phys === 'F') return l.st.p < 0.5 ? 1 : -1;
    return hit.side === 'front' ? 1 : -1;
  }

  // ---------------------------------------------------------------- pointer events
  function onPointerDown(e) {
    if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    try {
      canvas.setPointerCapture?.(e.pointerId);
    } catch {
      // synthetic or already-released pointer: capture is best-effort
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    if (pointers.size === 2) {
      startPinch();
      return;
    }
    if (pointers.size > 2) return;
    const x = e.clientX;
    const y = e.clientY;
    const base = { id: e.pointerId, type: e.pointerType, x0: x, y0: y, lx: x, ly: y, t0: performance.now(), moved: false };
    setRay(x, y);
    const fig = pickFigure();
    if (rig.mode === 'inspect') {
      gesture = { ...base, kind: 'orbit', fig };
      setCursor('grabbing');
      return;
    }
    if (fig) {
      gesture = { ...base, kind: 'figure', fig };
      setCursor('grabbing');
      return;
    }
    const hit = book.pick(ray);
    if (nearMiss(x, y, e.pointerType, hit)) {
      // just beside the figure: a drag turns it, as one on it would; a tap
      // stays the tap it was (tapHit), and onTap reads it as a near miss
      gesture = { ...base, kind: 'figure', fig: null, tapHit: hit };
      setCursor('grabbing');
      return;
    }
    // The gesture belongs to the background where it starts, even when it
    // later crosses a page. Touch keeps margin swipes; Shift keeps zoomed pan.
    if (!hit && e.pointerType !== 'touch' && !e.shiftKey) {
      gesture = { ...base, kind: 'book-tilt', startTilt: rig.bookTilt };
      setCursor('ns-resize');
      return;
    }
    // Zoomed in, there is often no white space left to grab: a drag on the
    // paper pans the view (it would otherwise lift a page you are reading),
    // while a tap keeps its meaning (turn the page, follow a printed link).
    const panning = zoomedIn();
    if (hit && !panning) {
      const side = dragSideFor(hit);
      const planeY = book.surfaceY(side);
      const p = bookPoint(x, y, planeY);
      gesture = { ...base, kind: 'page-pending', hit, side, planeY, startLocal: p ? p.clone() : null };
      return;
    }
    gesture = { ...base, kind: 'background', tapHit: hit, panning, panned: false };
  }

  function onPointerMove(e) {
    if (!enabled) return;
    const pt = pointers.get(e.pointerId);
    if (pt) {
      pt.x = e.clientX;
      pt.y = e.clientY;
    }
    if (gesture?.kind === 'pinch') {
      updatePinch();
      return;
    }
    if (!gesture || gesture.id !== e.pointerId) {
      if (e.pointerType !== 'touch') scheduleHover(e);
      return;
    }
    const g = gesture;
    const x = e.clientX;
    const y = e.clientY;
    const dx = x - g.lx;
    const dy = y - g.ly;
    g.lx = x;
    g.ly = y;
    if (!g.moved && Math.hypot(x - g.x0, y - g.y0) > (TAP_SLOP[g.type] ?? 8)) g.moved = true;
    switch (g.kind) {
      case 'book-tilt':
        if (g.moved) rig.setBookTilt(g.startTilt + (g.y0 - y) * BOOK_TILT_PER_PX);
        break;
      case 'figure':
        if (g.moved) host?.rotateActive?.(dx * FIGURE_YAW_PER_PX);
        break;
      case 'orbit':
        if (g.moved) {
          // horizontal: turn the figure on its turntable; vertical: tilt the camera
          if (g.fig || activeMount()) host?.rotateActive?.(dx * FIGURE_YAW_PER_PX);
          else rig.orbit(-dx * ORBIT_PER_PX, 0);
          rig.orbit(0, dy * ORBIT_PER_PX);
        }
        break;
      case 'page-pending':
        if (g.moved) {
          const resting = book.leaves[g.hit.leaf]?.phys !== 'F';
          const mx = x - g.x0;
          if (resting && Math.sign(mx) === g.side && Math.abs(mx) > 1.2 * Math.abs(y - g.y0)) {
            // Pushing a resting top leaf away from the gutter cannot turn it: it
            // is the swipe for the other way (in portrait only one page is on
            // screen, so on a recto it is the only "back" there is). It goes
            // through onNavigate on release, like a swipe on the margin, so the
            // reader decides what the previous page is. (A leaf in flight is
            // excluded: pushing a caught leaf back is catch-and-return.)
            g.kind = 'background';
            g.panning = false;
            g.panned = false;
            g.away = true;
            break;
          }
          if (resting && -g.side * mx < (TAP_SLOP[g.type] ?? 8)) {
            // Not heading for the gutter (yet): a resting leaf lifts only as
            // the pointer crosses the page, so a mostly vertical stroke would
            // start a drag that goes nowhere — turn events, a swoosh and a tap,
            // labels hidden. Wait instead: the drag starts from the press
            // point as soon as the stroke leans towards the gutter, so a steep
            // corner peel still lifts the leaf as it did; a stroke that never
            // does is released as nothing at all.
            break;
          }
          g.kind = 'background';
          g.panning = false;
          g.panned = false;
          const ok = !!g.startLocal && book.beginDrag(g.side, g.startLocal.z, {
            x: g.startLocal.x,
            s: g.hit.s,
            leaf: resting ? undefined : g.hit.leaf,
          });
          if (ok) {
            g.kind = 'page';
            setCursor('grabbing');
            const p = bookPoint(x, y, g.planeY);
            if (p) book.dragTo(p.x, p.z);
          }
        }
        break;
      case 'page': {
        const p = bookPoint(x, y, g.planeY);
        if (p) book.dragTo(p.x, p.z);
        break;
      }
      case 'background':
        if (g.moved && rig.zoom > 1.001) {
          // the first panning move also takes up the slop, so the paper stays under the pointer
          const r = rectOf();
          const px = g.panned ? dx : x - g.x0;
          const py = g.panned ? dy : y - g.y0;
          g.panned = true;
          rig.pan((px / r.width) * 2, (-py / r.height) * 2);
          setCursor('grabbing');
        }
        break;
    }
  }

  function onPointerUp(e) {
    const wasPinch = gesture?.kind === 'pinch';
    pointers.delete(e.pointerId);
    try {
      canvas.releasePointerCapture?.(e.pointerId);
    } catch {
      // not captured
    }
    if (wasPinch) {
      if (pointers.size < 2) gesture = null;
      return;
    }
    const g = gesture;
    if (!g || g.id !== e.pointerId) return;
    gesture = null;
    setCursor('');
    const x = e.clientX;
    const y = e.clientY;
    const now = performance.now();
    switch (g.kind) {
      case 'book-tilt':
        if (!g.moved) onTap?.({ kind: 'background', x, y, pointerType: g.type });
        break;
      case 'page': {
        // On touch a quick sideways stroke is a decision, not a throw: it turns
        // the leaf its way even though it lifted it little (a phone's page is
        // wide in leaf terms, so real swipes seldom pass half-way or fling).
        const sw = swipeDir(g, x, y, now);
        book.endDrag(sw ? { target: sw < 0 ? 1 : 0 } : undefined);
        break;
      }
      case 'page-pending':
        // (moved but never towards the gutter: no tap, no turn)
        if (!g.moved) onTap?.(pageInfo(g.hit, x, y, g.type));
        break;
      case 'figure':
      case 'orbit':
        if (!g.moved) {
          if (g.fig) {
            const info = { kind: 'figure', point: g.fig.point, part: g.fig.part, x, y, pointerType: g.type };
            const dbl = lastTap.kind === 'figure' && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(x - lastTap.x, y - lastTap.y) < 26;
            lastTap = { t: dbl ? 0 : now, x, y, kind: 'figure' };
            onTap?.(info);
            if (dbl) onInspect?.({ point: g.fig.point, part: g.fig.part });
          } else if (g.tapHit) {
            onTap?.(pageInfo(g.tapHit, x, y, g.type)); // a near miss on the page
          } else {
            onTap?.({ kind: 'background', x, y, pointerType: g.type });
          }
        }
        break;
      case 'background': {
        // a quick pan while zoomed in is still a pan: it never turns the page being read
        const sw = g.panning ? 0 : swipeDir(g, x, y, now);
        if (sw) {
          navigate(-sw, 'swipe');
        } else if (!g.moved) {
          onTap?.(g.tapHit ? pageInfo(g.tapHit, x, y, g.type) : { kind: 'background', x, y, pointerType: g.type });
        }
        break;
      }
    }
    if (e.pointerType !== 'touch') scheduleHover(e);
  }

  /**
   * −1 / +1 for a swipe to the left / right, else 0: a touch stroke > 40 px,
   * mostly sideways, faster than 0.35 px/ms. A push away from the gutter
   * (g.away, any pointer) needs no speed — it can mean nothing else.
   */
  function swipeDir(g, x, y, now) {
    if (g.type !== 'touch' && !g.away) return 0;
    const dx = x - g.x0;
    const dy = y - g.y0;
    const dt = Math.max(1, now - g.t0);
    return Math.abs(dx) > 40 && Math.abs(dx) > 1.4 * Math.abs(dy) && (g.away || Math.abs(dx) / dt > 0.35) ? Math.sign(dx) : 0;
  }

  function onPointerCancel(e) {
    pointers.delete(e.pointerId);
    if (gesture?.kind === 'page') book.cancelDrag();
    if (gesture && (gesture.kind === 'pinch' ? pointers.size < 2 : gesture.id === e.pointerId)) gesture = null;
    setCursor('');
  }

  // ---------------------------------------------------------------- pinch
  let pinch = null;
  function pinchState() {
    const [a, b] = [...pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }
  function startPinch() {
    if (gesture?.kind === 'page') book.cancelDrag();
    gesture = { kind: 'pinch' };
    pinch = pinchState();
  }
  function updatePinch() {
    if (pointers.size < 2 || !pinch) return;
    const s = pinchState();
    const r = rectOf();
    setNdc(s.mx, s.my);
    if (s.d > 0 && pinch.d > 0) rig.zoomBy(s.d / pinch.d, { x: ndc.x, y: ndc.y });
    rig.pan(((s.mx - pinch.mx) / r.width) * 2, (-(s.my - pinch.my) / r.height) * 2);
    pinch = s;
  }

  // ---------------------------------------------------------------- wheel / trackpad
  function onWheel(e) {
    if (!enabled) return;
    e.preventDefault();
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1;
    const dx = e.deltaX * k;
    const dy = e.deltaY * k;
    const now = performance.now();
    setNdc(e.clientX, e.clientY);
    const at = { x: ndc.x, y: ndc.y };
    if (e.ctrlKey) {
      rig.zoomBy(Math.exp(-dy * 0.01), at); // trackpad pinch (and ctrl + wheel)
      return;
    }
    const sideways = Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > 0.5;
    if (zoomedIn() && (sideways || now - wheel.panAt < WHEEL_PAN_LATCH_MS)) {
      // Zoomed in, a sideways two-finger scroll moves the view (deltaX > 0
      // reveals what lies to the right) instead of turning the page being
      // read; the rest of that gesture keeps panning on both axes, so a
      // diagonal drift does not suddenly zoom. The wheel still zooms.
      const r = rectOf();
      rig.pan((-dx / r.width) * 2, (dy / r.height) * 2);
      wheel.panAt = now;
      wheel.acc = 0;
      return;
    }
    if (sideways) {
      // two-finger horizontal swipe: one page per gesture, momentum ignored
      const quiet = now - wheel.last > 200;
      wheel.last = now;
      if (wheel.locked) {
        if (quiet && now > wheel.lockUntil) wheel.locked = false;
        else return;
      }
      if (quiet) wheel.acc = 0;
      wheel.acc += dx;
      if (Math.abs(wheel.acc) > 70) {
        navigate(wheel.acc > 0 ? 1 : -1, 'wheel');
        wheel.acc = 0;
        wheel.locked = true;
        wheel.lockUntil = now + 420;
      }
      return;
    }
    if (Math.abs(dy) > 0) rig.zoomBy(Math.exp(-dy * 0.0016), at);
  }

  // Safari trackpad pinch
  function onGestureStart(e) {
    e.preventDefault();
    gestureScale = 1;
  }
  function onGestureChange(e) {
    e.preventDefault();
    setNdc(e.clientX, e.clientY);
    rig.zoomBy(e.scale / gestureScale, { x: ndc.x, y: ndc.y });
    gestureScale = e.scale;
  }

  // ---------------------------------------------------------------- hover
  function scheduleHover(e) {
    hoverEvt = { x: e.clientX, y: e.clientY, type: e.pointerType };
    if (!hoverRaf) hoverRaf = requestAnimationFrame(runHover);
  }
  function runHover() {
    hoverRaf = 0;
    const h = hoverEvt;
    if (!h || gesture || !enabled) return;
    setRay(h.x, h.y);
    let info = null;
    let c = '';
    if (rig.mode === 'inspect') {
      c = 'grab';
    } else {
      const hit = book.pick(ray);
      const fig = hoverFigure(h, hit);
      const pans = zoomedIn(); // zoomed in, paper and margin both pan
      if (fig === 'on') {
        info = { kind: 'figure', x: h.x, y: h.y, pointerType: h.type };
        c = 'grab';
      } else if (hit) {
        info = pageInfo(hit, h.x, h.y, h.type);
        const side = dragSideFor(hit);
        if (fig || pans || (side > 0 ? book.canNext() : book.canPrev())) c = 'grab';
      } else if (fig || pans) {
        c = fig ? 'grab' : 'ns-resize'; // near misses still hold the figure
      } else c = 'ns-resize';
    }
    const override = onHover?.(info);
    setCursor(typeof override === 'string' ? override : c);
  }
  function onLeave() {
    hoverEvt = null; // a pending hover frame or trailing pick must not set the cursor again
    clearTimeout(hoverPick.timer);
    hoverPick.timer = 0;
    if (!gesture) {
      setCursor('');
      onHover?.(null);
    }
  }

  // ---------------------------------------------------------------- keyboard
  function onKey(e) {
    if (!enabled || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))) return;
    let handled = true;
    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
        navigate(1, 'key');
        break;
      case 'ArrowLeft':
      case 'PageUp':
        navigate(-1, 'key');
        break;
      case ' ':
        navigate(e.shiftKey ? -1 : 1, 'key');
        break;
      case 'Home':
        book.goTo(Math.min(1, book.leafCount));
        break;
      case 'End':
        book.goTo(book.leafCount - 1);
        break;
      case '+':
      case '=':
        rig.zoomBy(1.25);
        break;
      case '-':
      case '_':
        rig.zoomBy(0.8);
        break;
      case '0':
        rig.reset();
        break;
      case 'Escape':
        if (rig.mode === 'inspect') rig.exitInspect();
        else handled = false;
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  }

  const preventMenu = (e) => e.preventDefault();
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', preventMenu);
  canvas.addEventListener('gesturestart', onGestureStart);
  canvas.addEventListener('gesturechange', onGestureChange);
  if (keyboard) addEventListener('keydown', onKey);

  return {
    get dragging() {
      return gesture?.kind === 'page';
    },
    /** Temporarily ignore input (e.g. while a modal is open). Cancels a drag in progress. */
    setEnabled(on) {
      enabled = !!on;
      if (!enabled && gesture?.kind === 'page') book.cancelDrag();
      if (!enabled) gesture = null;
    },
    dispose() {
      if (gesture?.kind === 'page') book.cancelDrag();
      cancelAnimationFrame(hoverRaf);
      clearTimeout(hoverPick.timer);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', preventMenu);
      canvas.removeEventListener('gesturestart', onGestureStart);
      canvas.removeEventListener('gesturechange', onGestureChange);
      if (keyboard) removeEventListener('keydown', onKey);
      canvas.style.cursor = '';
      pointers.clear();
      gesture = null;
    },
  };
}
