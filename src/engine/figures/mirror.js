// Which of a face label's two mirror-side anchors (the right or left eye,
// pit, nostril, gland…: `label.alt`) the label points at, on screen
// (FigureHost) and on the SVG plate (export/idpass.js) alike.
//
// A head seen from one side shows that side's feature: the anchor on the
// camera's side of the plane between the two. A head seen face-on — from the
// front, from above — shows both, and then the label takes the one on the
// side its leader leaves by (the pill's column on screen, the numbered disc's
// way out on a plate): from the other one, the leader would run across the
// whole face, over the feature nearer the key.
//
// A feature is in view when its outward normal (anchor.userData.facing, in
// the anchor's parent frame) turns towards the camera; an anchor without one
// is judged by the pair's plane alone. One the caller found hidden (its
// raycast hit the head first) is not in view whatever it faces.
import * as THREE from 'three/webgpu';

/** A feature counts as in view once its normal's cosine to the camera passes this… */
const FACE_SEEN = 0;
/** …and the one in use keeps it until the cosine falls below this. */
const FACE_LOST = -0.06;
/**
 * Anchors without a normal: both count as in view while the camera stays
 * this close to the plane between them (|cosine| to the pair's axis).
 */
const FACE_ON = 0.35;
/**
 * The side rule moves the label to the other feature only when the pair lies
 * this clearly along the leader's way out (a share of their separation on
 * screen); a pair stacked across it (a head rolled on its side) keeps its anchor.
 */
const ORDER = 0.35;
/**
 * Neither feature in view (a head seen from behind or below): the camera's
 * side, changed only once the camera is this far past the plane between the
 * two (cosine), so a head turning slowly does not flicker between its eyes.
 */
const SIDE_HYSTERESIS = 0.08;

const _pa = new THREE.Vector3();
const _pb = new THREE.Vector3();
const _cam = new THREE.Vector3();
const _to = new THREE.Vector3();
const _n = new THREE.Vector3();

/**
 * Width over height of what a camera's NDC square spans (NDC x is stretched
 * by it), its view offset included (the exporter frames the figure with one).
 */
export function viewAspect(camera) {
  let k = 1;
  if (camera.isPerspectiveCamera) k = camera.aspect || 1;
  else {
    const w = camera.right - camera.left, h = camera.top - camera.bottom;
    if (h > 0 && w > 0) k = w / h;
  }
  const v = camera.view;
  if (v?.enabled && v.width > 0 && v.height > 0 && v.fullWidth > 0 && v.fullHeight > 0) k *= (v.width / v.fullWidth) / (v.height / v.fullHeight);
  return k;
}

/** Cosine between an anchor's outward normal and the way to the camera (NaN: it declares none). */
function facingCos(o, p, camera) {
  const n = o.userData?.facing;
  if (!n?.isVector3 || !o.parent) return NaN;
  _n.copy(n).transformDirection(o.parent.matrixWorld);
  if (camera.isOrthographicCamera) _to.set(0, 0, 1).transformDirection(camera.matrixWorld);
  else _to.subVectors(_cam, p).normalize();
  return _n.dot(_to);
}

/**
 * The anchor a mirrored label points at from `camera` (both anchors shown).
 * `wayOut(arg, x, y, half)` says where the label's leader leaves the head:
 * given the pair's midpoint (x, y) in the view's square units (NDC with x
 * times the aspect) and half their separation there, it returns a unit
 * direction `{ x, y }` in the same units, or null when that is not known (or
 * the pair straddles it). Allocation-free.
 * @param {THREE.Object3D} a      the label's anchor
 * @param {THREE.Object3D} b      its mirror (`label.alt`)
 * @param {THREE.Object3D|null} pick  the anchor in use now (null: none yet)
 * @param {THREE.Camera} camera   world matrices current
 * @param {((arg: any, x: number, y: number, half: number) => ({ x: number, y: number }|null))|null} [wayOut]
 * @param {any} [arg]             passed to wayOut (the label)
 * @param {THREE.Object3D[]} [hidden]  anchors found hidden from this view
 * @returns {THREE.Object3D} a or b
 */
export function mirrorAnchor(a, b, pick, camera, wayOut = null, arg = null, hidden = null) {
  a.getWorldPosition(_pa);
  b.getWorldPosition(_pb);
  // which side of the plane between the two the camera is on: the pair's
  // axis (b → a) against the line from their midpoint to the camera
  if (camera.isOrthographicCamera) _to.set(0, 0, 1).transformDirection(camera.matrixWorld);
  else _to.setFromMatrixPosition(camera.matrixWorld).sub(_n.addVectors(_pa, _pb).multiplyScalar(0.5));
  _n.subVectors(_pa, _pb);
  const len = _n.length() * _to.length();
  const s = len > 1e-12 ? _n.dot(_to) / len : 0;
  _cam.setFromMatrixPosition(camera.matrixWorld);
  const fa = facingCos(a, _pa, camera);
  const fb = facingCos(b, _pb, camera);
  const seenA = !hidden?.includes(a) && (Number.isFinite(fa) ? fa > (pick === a ? FACE_LOST : FACE_SEEN) : s > -(FACE_ON + (pick === a ? SIDE_HYSTERESIS : 0)));
  const seenB = !hidden?.includes(b) && (Number.isFinite(fb) ? fb > (pick === b ? FACE_LOST : FACE_SEEN) : s < FACE_ON + (pick === b ? SIDE_HYSTERESIS : 0));
  if (seenA && seenB) {
    // face-on: the feature further along the leader's way out
    if (wayOut) {
      const k = viewAspect(camera);
      _pa.project(camera);
      _pb.project(camera);
      const dx = (_pa.x - _pb.x) * k, dy = _pa.y - _pb.y;
      const sep = Math.hypot(dx, dy);
      const u = sep > 1e-9 ? wayOut(arg, ((_pa.x + _pb.x) / 2) * k, (_pa.y + _pb.y) / 2, sep / 2) : null;
      if (u) {
        const along = dx * u.x + dy * u.y;
        if (Math.abs(along) > ORDER * sep) return along > 0 ? a : b;
      }
    }
    return pick ?? (s >= 0 ? a : b);
  }
  if (seenA !== seenB) return seenA ? a : b;
  if (pick === a) return s < -SIDE_HYSTERESIS ? b : a;
  if (pick === b) return s > SIDE_HYSTERESIS ? a : b;
  return s >= 0 ? a : b;
}
