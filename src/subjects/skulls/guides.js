// Drawing-lesson ink: construction guides that are "drawn on" stroke by
// stroke, suture lines, proportion grids, and the reveal masks that let a
// lesson dissolve the planes and the engraved skull in and out.
//
// Why a separate reveal mask: the FigureHost dissolves layer parts by writing
// `userData.inkFade` on whole subtrees. Lessons animate inside the 5 s loop,
// so they compose their own mask into `material.maskNode` (AND) instead of
// fighting over inkFade — both effects multiply cleanly, in shadows too.
import * as THREE from 'three/webgpu';
import {
  uniform, float, mix, mx_noise_float, interleavedGradientNoise, screenCoordinate, color as tslColor,
} from 'three/tsl';
import { Line2 } from 'three/addons/lines/webgpu/Line2.js';
import { LineSegments2 } from 'three/addons/lines/webgpu/LineSegments2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { inkMaterial, flatMaterial, addOutline, inkLine, figurePosition } from '../../kits/ink/index.js';

/** Red-chalk colour of construction guides (sanguine underdrawing). */
export const GUIDE_COLOR = '#b4553a';
/** Faint graphite of proportion grids. */
export const GRID_COLOR = '#8f877a';

// ---------------------------------------------------------------- masks & contexts

/**
 * A dissolve mask driven by a 0..1 uniform: figure-space noise mixed with
 * screen dither, so a reveal reads as ink settling on paper.
 * @param {object} ctx FigureContext
 * @param {{value:number}} u uniform node (0 = gone, 1 = solid)
 * @param {number} [salt] decorrelates several masks on one figure
 */
export function revealMask(ctx, u, salt = 0) {
  const dither = interleavedGradientNoise(screenCoordinate.xy);
  const fp = figurePosition(ctx);
  const n = mx_noise_float(fp.mul(ctx.u.wobbleFreq ? ctx.u.wobbleFreq.mul(1.3) : float(0.6)).add(salt)).mul(0.5).add(0.5).clamp(0, 1);
  return mix(dither, n, 0.6).lessThan(u.mul(1.02));
}

/** AND a mask into a material's existing maskNode. */
export function withMask(mat, mask) {
  mat.maskNode = mat.maskNode ? mat.maskNode.and(mask) : mask;
  mat.needsUpdate = true;
  return mat;
}

/**
 * Apply one reveal uniform to objects, their outline hulls and any line
 * materials below them (shared materials are masked once).
 * @param {object} ctx
 * @param {THREE.Object3D|THREE.Object3D[]} objs
 * @param {{value:number}} u
 * @param {number} [salt]
 */
export function applyReveal(ctx, objs, u, salt = 0) {
  const mask = revealMask(ctx, u, salt);
  const seen = new Set();
  for (const obj of [].concat(objs)) {
    obj.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        if (seen.has(m)) continue;
        seen.add(m);
        withMask(m, mask);
      }
    });
  }
}

/**
 * A FigureContext that shares every uniform of `ctx` but has its own style
 * mix (and hatch strength): lets muscles or a snake stay coloured while the
 * skull is engraved in black ink.
 */
export function subContext(ctx, { styleMix = 0, hatchStrength = 1 } = {}) {
  const u = { ...ctx.u, styleMix: uniform(styleMix), hatchStrength: uniform(hatchStrength) };
  const sub = { ...ctx, u };
  sub.ink = (o) => inkMaterial(sub, o);
  sub.flat = (o) => flatMaterial(sub, o);
  sub.outline = (mesh, o) => addOutline(mesh, sub, o);
  sub.inkLine = (pts, o) => inkLine(sub, pts, o);
  Object.defineProperty(sub, 'fitScale', { get: () => ctx.fitScale });
  return sub;
}

// ---------------------------------------------------------------- lines

function flat(points) {
  if (points instanceof Float32Array) return Array.from(points);
  const out = [];
  for (const p of points) out.push(p.isVector3 ? p.x : p[0], p.isVector3 ? p.y : p[1], p.isVector3 ? p.z : p[2]);
  return out;
}

function lineMaterial(ctx, o, name) {
  const mat = new THREE.Line2NodeMaterial({ linewidth: o.width ?? 1, worldUnits: false, dashed: false });
  mat.name = name;
  mat.colorNode = tslColor(new THREE.Color(o.color ?? ctx.palette?.ink ?? '#1c1a17'));
  mat.depthTest = o.depthTest ?? true;
  // the same layer-dissolve contract as the ink kit (userData.inkFade per object)
  const fade = uniform(1).onObjectUpdate(({ object }) => {
    const f = object?.userData?.inkFade;
    return f === undefined ? 1 : f;
  });
  mat.maskNode = interleavedGradientNoise(screenCoordinate.xy).lessThan(fade.mul(1.02));
  mat.userData.isFlat = true;
  mat.userData.inkColor = '#' + new THREE.Color(o.color ?? '#1c1a17').getHexString();
  return mat;
}

/**
 * A guide polyline (screen-space width in CSS px) that can be drawn on.
 * Uses the ink kit's `ctx.inkLine` when available.
 *
 * @param {object} ctx FigureContext
 * @param {Array<number[]>|Float32Array} points (cm, parent space)
 * @param {{ width?: number, color?: string, closed?: boolean, name?: string, depthTest?: boolean }} [o]
 * @returns {{ object: THREE.Object3D, segments: number, setDraw: (f:number)=>void, dispose: ()=>void }}
 */
export function guideLine(ctx, points, o = {}) {
  let pts = flat(points);
  if (o.closed && pts.length >= 6) pts = pts.concat(pts.slice(0, 3));
  let line;
  if (typeof ctx.inkLine === 'function') {
    line = ctx.inkLine(pts, { width: o.width ?? 1, color: o.color, name: o.name, depthTest: o.depthTest, fit: false });
  } else {
    const geo = new LineGeometry();
    geo.setPositions(pts);
    line = new Line2(geo, lineMaterial(ctx, o, o.name ?? 'guide'));
    line.dispose = () => {
      geo.dispose();
      line.material.dispose();
    };
  }
  line.name = o.name ?? 'guide';
  line.castShadow = false;
  line.receiveShadow = false;
  line.userData.castShadow = false;
  line.userData.receiveShadow = false;
  line.userData.noFit = true;
  line.raycast = () => {};
  const segments = pts.length / 3 - 1;
  let last = -1;
  return {
    object: line,
    segments,
    /** Draw the first fraction f of the stroke (0 hides it). */
    setDraw(f) {
      const n = f >= 0.999 ? segments : Math.max(0, Math.floor(segments * f));
      if (n === last) return;
      last = n;
      line.geometry.instanceCount = n;
      line.visible = n > 0;
    },
    dispose() {
      line.dispose?.();
    },
  };
}

/**
 * Many disconnected segments in one draw call (sutures, grids).
 * @param {object} ctx
 * @param {Float32Array|number[]} pairs  xyz pairs (6 numbers per segment)
 * @param {{ width?: number, color?: string, name?: string }} [o]
 */
export function guideSegments(ctx, pairs, o = {}) {
  const geo = new LineSegmentsGeometry();
  geo.setPositions(pairs instanceof Float32Array ? pairs : new Float32Array(pairs));
  const mat = lineMaterial(ctx, o, o.name ?? 'segments');
  const seg = new LineSegments2(geo, mat);
  seg.name = o.name ?? 'segments';
  seg.castShadow = false;
  seg.receiveShadow = false;
  seg.userData.castShadow = false;
  seg.userData.receiveShadow = false;
  seg.userData.noFit = true;
  seg.userData.isInkLine = true;
  seg.raycast = () => {};
  const segments = (pairs.length / 6) | 0;
  let last = -1;
  return {
    object: seg,
    segments,
    setDraw(f) {
      const n = f >= 0.999 ? segments : Math.max(0, Math.floor(segments * f));
      if (n === last) return;
      last = n;
      geo.instanceCount = n;
      seg.visible = n > 0;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

/**
 * Polylines (from the mesher: positions + normals) → segment pairs, lifted
 * off the surface along the normal so lines never z-fight with the bone.
 * @param {Array<{positions: Float32Array, normals: Float32Array}>} chains
 * @param {number} lift cm
 * @param {number} [minLength] drop shorter chains (cm)
 */
export function chainsToPairs(chains, lift = 0.04, minLength = 0) {
  const out = [];
  for (const c of chains) {
    const P = c.positions, N = c.normals;
    const n = P.length / 3;
    if (n < 2) continue;
    if (minLength > 0) {
      let L = 0;
      for (let i = 1; i < n; i++) L += Math.hypot(P[i * 3] - P[i * 3 - 3], P[i * 3 + 1] - P[i * 3 - 2], P[i * 3 + 2] - P[i * 3 - 1]);
      if (L < minLength) continue;
    }
    for (let i = 0; i < n - 1; i++) {
      for (const j of [i, i + 1]) out.push(P[j * 3] + N[j * 3] * lift, P[j * 3 + 1] + N[j * 3 + 1] * lift, P[j * 3 + 2] + N[j * 3 + 2] * lift);
    }
  }
  return new Float32Array(out);
}

/** Longest chain of a set as a lifted point list (ordered polyline). */
export function chainPoints(chains, lift = 0.04, filter = null) {
  const out = [];
  for (const c of chains) {
    const P = c.positions, N = c.normals;
    const pts = [];
    for (let i = 0; i < P.length / 3; i++) {
      const p = [P[i * 3] + N[i * 3] * lift, P[i * 3 + 1] + N[i * 3 + 1] * lift, P[i * 3 + 2] + N[i * 3 + 2] * lift];
      if (!filter || filter(p)) pts.push(p);
    }
    if (pts.length > 1) out.push(pts);
  }
  return out;
}

// ---------------------------------------------------------------- curve builders (cm)

/** Ellipse in the plane spanned by unit axes u, v around centre c. */
export function ellipse(c, u, v, ru, rv, n = 96, a0 = 0, a1 = Math.PI * 2) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const cu = Math.cos(a) * ru, sv = Math.sin(a) * rv;
    pts.push([c[0] + u[0] * cu + v[0] * sv, c[1] + u[1] * cu + v[1] * sv, c[2] + u[2] * cu + v[2] * sv]);
  }
  return pts;
}

/** Rounded rectangle outline in a frame {o,u,v} (orbit margins). */
export function roundRectCurve(F, hw, hh, r, n = 18) {
  const pts = [];
  const corners = [[hw - r, hh - r, 0], [-(hw - r), hh - r, Math.PI / 2], [-(hw - r), -(hh - r), Math.PI], [hw - r, -(hh - r), Math.PI * 1.5]];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (Math.PI / 2) * (i / n);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      pts.push([F.o[0] + F.u[0] * x + F.v[0] * y, F.o[1] + F.u[1] * x + F.v[1] * y, F.o[2] + F.u[2] * x + F.v[2] * y]);
    }
  }
  pts.push(pts[0]);
  return pts;
}

/** Pear (uneven capsule) outline: circle r1 at origin, r2 at (0, h), in frame {o,u,v}. */
export function teardropCurve(F, r1, r2, h, n = 64) {
  const b = (r1 - r2) / h;
  const a = Math.sqrt(1 - b * b);
  const ang = Math.atan2(b, a); // tangent angle
  const pts = [];
  const push = (x, y) => pts.push([F.o[0] + F.u[0] * x + F.v[0] * y, F.o[1] + F.u[1] * x + F.v[1] * y, F.o[2] + F.u[2] * x + F.v[2] * y]);
  // big arc (bottom), from right tangent round to left tangent
  for (let i = 0; i <= n; i++) {
    const t = ang - (Math.PI + 2 * ang) * (i / n);
    push(Math.cos(t) * r1, Math.sin(t) * r1);
  }
  // small arc (top), from left tangent over to the right
  for (let i = 0; i <= n / 2; i++) {
    const t = Math.PI - ang - (Math.PI - 2 * ang) * (i / (n / 2));
    push(Math.cos(t) * r2, h + Math.sin(t) * r2);
  }
  pts.push(pts[0]);
  return pts;
}

/** Straight polyline through points, densified so draw-on looks continuous. */
export function densify(points, step = 0.4) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(1, Math.ceil(L / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}
