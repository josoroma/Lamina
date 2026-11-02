// Ink kit — the "living plate" look, written once in TSL (WGSL on WebGPU,
// GLSL on the WebGL 2 fallback).
//
//   lithograph  coloured plate: physically lit colour + fine engraved hatching
//               that appears only where the light falls off (incl. cast shadows)
//   engraving   black ink on paper: line width carries the tone, colour fades out
//
// Both are one material driven by `u.styleMix` (0 = lithograph, 1 = engraving),
// so a figure can morph from construction drawing to coloured plate in-loop.
//
// Why the hatching looks engraved rather than aliased:
//   * lines live in FIGURE space (stable under turntable rotation and pop-up
//     folding) but their density is chosen per pixel from screen-space
//     derivatives: octave level k keeps the on-screen period within
//     [S, 2S] px and the next octave's lines grow in from zero width, so lines
//     never crowd into moiré and never pop;
//   * coverage is an exact box filter of the line profile (crisp at 1 px,
//     correctly grey below it), tone = line width × density;
//   * primary lines are near-horizontal cross-contours (planar slices whose
//     critical points sit on lit tops / hidden undersides), cross-hatching uses
//     meridians around the figure's vertical axis, so neither family draws
//     bull's-eyes on visible shadow sides at any turntable angle.
//
// Every figure owns a FigureContext: shared uniforms (figure-space matrix,
// hatch density, outline width, loop time) that the FigureHost keeps updated.
import * as THREE from 'three/webgpu';
import {
  Fn, uniform, vec2, vec3, vec4, float, color as tslColor, output, diffuseColor, luminance,
  positionWorld, positionLocal, normalLocal, normalView, positionViewDirection,
  modelWorldMatrix, modelViewMatrix, cameraProjectionMatrix, renderGroup, screenDPR, screenCoordinate, positionView,
  dot, fract, abs, min, max, smoothstep, mix, pow, clamp, floor, log2, exp2, atan, sqrt,
  dFdx, dFdy, mx_noise_float, interleavedGradientNoise,
} from 'three/tsl';
import { Line2 } from 'three/addons/lines/webgpu/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

export const DEFAULT_PALETTE = {
  paper: '#fbf8f1',
  ink: '#1c1a17',
};

// Base hatch density, lines per page unit (page width = 1). With screen-space
// level of detail this only fixes the phase of the line lattice; the on-screen
// spacing is set by HATCH_SPACING_PX.
export const HATCH_LINES_PER_PAGE_UNIT = 300;
// Legacy outline width in page units (kept for `u.outline`; the hull itself is
// sized in screen pixels, see OUTLINE_PX).
export const OUTLINE_PAGE_UNITS = 0.0032;
/** Minimum on-screen hatch period in CSS px (actual period stays in [S, 2S]). */
export const HATCH_SPACING_PX = 3.4;
/** Outline width in CSS px at the reference (default book) zoom. */
export const OUTLINE_PX = 1.2;
/** CSS px per page unit at the default book zoom on a 1440 px wide screen. */
export const BOOK_PX_PER_UNIT = 680;

/**
 * Renderer-wide ink state. `pixelScale` multiplies every pixel-sized quantity
 * (hatch spacing, outline width) — exporters raise it while rendering a
 * high-resolution image so the plate keeps its on-screen proportions.
 */
export const inkGlobals = {
  pixelScale: uniform(1),
};

/**
 * The viewport in device px, as ONE node shared by every ink material.
 * (three's `viewport` — and `screenCoordinate` on WebGL, through its screen
 * size — builds a fresh uniform per material build, and every fresh uniform
 * id keys a new shared 'render' bind group that the node builder caches for
 * good: the heap grew with each figure mount.)
 */
const _viewport = new THREE.Vector4();
const viewportPx = uniform(_viewport).setGroup(renderGroup).onRenderUpdate(({ renderer }) => {
  const target = renderer.getRenderTarget();
  if (target) _viewport.copy(target.viewport);
  else {
    renderer.getViewport(_viewport);
    _viewport.multiplyScalar(renderer.getPixelRatio());
  }
  return _viewport;
});
const viewportHeight = viewportPx.w;

/**
 * The shared viewport uniform (device px: x, y, width, height). Subjects that
 * size something in screen pixels (a catchlight that never falls below a
 * pixel) read it from here rather than three's `viewport`, which would add a
 * render bind group per material build (see above).
 */
export const inkViewport = viewportPx;

// The same leak, at its source: three r186's ScreenNode.setup() makes a NEW
// renderGroup uniform for the viewport (and the screen size) on every
// material build, and the backend caches one shared 'render' bind group per
// set of uniform ids, for good. Line2NodeMaterial reads `viewport` for its
// aspect and pixel width, and `screenCoordinate` flips y through `screenSize`
// on WebGL, so every ink line, construction guide and suture batch built at a
// figure mount left bind groups behind. Each such uniform wraps the same
// module-level vector, so one node per scope is equivalent: the setup still
// runs (it arms the per-render update) and the first node it made is handed
// out from then on. (Upstream: ScreenNode.setup should reuse one uniform.)
{
  const proto = THREE.ScreenNode?.prototype;
  if (proto && !proto.laminaSharedUniforms) {
    const setup = proto.setup;
    const shared = new Map(); // scope → uniform node
    proto.setup = function (builder) {
      const out = setup.call(this, builder);
      if (this.scope !== THREE.ScreenNode.VIEWPORT && this.scope !== THREE.ScreenNode.SIZE) return out;
      let node = shared.get(this.scope);
      if (!node) shared.set(this.scope, (node = out));
      return node;
    };
    proto.laminaSharedUniforms = true;
  }
}

/** This fragment's pixel position (a stable key for dithers; origin corner unspecified). */
const _clip = cameraProjectionMatrix.mul(vec4(positionView, 1.0));
const fragPixel = _clip.xy.div(_clip.w).mul(0.5).add(0.5).mul(viewportPx.zw);

// Line lattice constants -----------------------------------------------------
const MERIDIANS = 1024; // base meridians per revolution (power of two: seam-free LOD)
const TAU = Math.PI * 2;

/**
 * Shared per-figure shading state. Created by the FigureHost and passed to
 * `createFigure(params, ctx)`; figures build every material through it.
 *
 * @param {object} [o]
 * @param {'lithograph'|'engraving'} [o.style='lithograph']
 * @param {{ paper?: string, ink?: string }} [o.palette]
 * @param {'high'|'low'} [o.quality='high']  'low' drops cross-hatching and reflected light
 * @returns {object} FigureContext
 */
export function createFigureContext({ style = 'lithograph', palette = {}, quality = 'high' } = {}) {
  const pal = { ...DEFAULT_PALETTE };
  for (const [k, v] of Object.entries(palette ?? {})) if (v !== undefined && v !== null) pal[k] = v;
  const u = {
    figureInv: uniform(new THREE.Matrix4()), // world → figure space (set each frame)
    hatchFreq: uniform(HATCH_LINES_PER_PAGE_UNIT), // base lines per figure-local unit
    hatchStrength: uniform(1),
    outline: uniform(OUTLINE_PAGE_UNITS), // legacy outline width in figure-local units
    wobble: uniform(0.35), // hand-inked line wobble 0..1
    styleMix: uniform(style === 'engraving' ? 1 : 0),
    time: uniform(0), // loop time in seconds, 0..duration
    paper: uniform(new THREE.Color(pal.paper)),
    ink: uniform(new THREE.Color(pal.ink)),
    // added (non-breaking) ------------------------------------------------
    outlineBase: uniform(OUTLINE_PAGE_UNITS), // value setFit assigned to `outline`
    outlinePx: uniform(OUTLINE_PX), // CSS px at book zoom
    hatchPx: uniform(HATCH_SPACING_PX), // CSS px, minimum hatch period
    fitScale: uniform(1), // page units per figure-local unit
    wobbleFreq: uniform(0.5), // outline wobble noise frequency (per figure-local unit)
    reflect: uniform(quality === 'low' ? 0 : 1), // reflected-light rim on shadow sides
    // tone thresholds on the lighting ratio (see calibrateInk; defaults match
    // the stage's createLights rig: ambient ≈ 0.54, key ≈ 0.76)
    litHi: uniform(0.99), // lithograph: shade above which no lines are drawn
    litLo: uniform(0.43), // lithograph: shade of the deepest hatching
    engHi: uniform(1.1), // engraving: value above which the paper stays clean
    engLo: uniform(0.16), // engraving: value of solid cross-hatching
  };
  const ctx = {
    u,
    style,
    palette: pal,
    quality,
    fitScale: 1,
    lines: new Set(), // inkLine objects, re-scaled on setFit
    /** Called by the host after fitting the figure to its page. */
    setFit(scale) {
      ctx.fitScale = scale;
      u.fitScale.value = scale;
      u.hatchFreq.value = HATCH_LINES_PER_PAGE_UNIT * scale;
      u.outline.value = OUTLINE_PAGE_UNITS / scale;
      u.outlineBase.value = OUTLINE_PAGE_UNITS / scale;
      // wobble period ≈ 0.05 page units (≈ 35 px at book zoom)
      u.wobbleFreq.value = scale / 0.05;
      for (const line of ctx.lines) line.userData.inkLine?.refit?.();
    },
    ink: (opts) => inkMaterial(ctx, opts),
    outline: (mesh, opts) => addOutline(mesh, ctx, opts),
    flat: (opts) => flatMaterial(ctx, opts),
    inkLine: (points, opts) => inkLine(ctx, points, opts),
  };
  return ctx;
}

/**
 * Fit the hatch tone thresholds to a light rig. `ambient` and `key` are the
 * irradiance ratios a white surface receives from the fill alone and from the
 * key at normal incidence (luminance × intensity / π for three.js lights).
 * Lithograph lines start where N·L drops below 0.6 and are densest in
 * ambient-only shade; engraving keeps the paper clean above N·L ≈ 0.75.
 * The FigureHost calls this with the scene's lights on mount.
 * @param {object} ctx FigureContext
 * @param {{ ambient: number, key: number }} rig
 */
export function calibrateInk(ctx, { ambient, key }) {
  const u = ctx.u;
  u.litHi.value = ambient + key * 0.6;
  u.litLo.value = ambient * 0.8;
  u.engHi.value = ambient + key * 0.75;
  u.engLo.value = ambient * 0.3;
}

/**
 * Estimate { ambient, key } from the lights in a scene (hemisphere/ambient
 * fill + the strongest shadow-casting directional light).
 * @param {THREE.Object3D} scene
 * @returns {{ ambient: number, key: number }|null}
 */
export function measureLightRig(scene) {
  if (!scene) return null;
  let ambient = 0, shadowKey = 0, anyKey = 0;
  const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  scene.traverseVisible((o) => {
    if (!o.isLight) return;
    if (o.isHemisphereLight) {
      ambient += (o.intensity * (lum(o.color) + lum(o.groundColor)) * 0.5) / Math.PI;
    } else if (o.isAmbientLight) {
      ambient += (o.intensity * lum(o.color)) / Math.PI;
    } else if (o.isDirectionalLight) {
      const k = (o.intensity * lum(o.color)) / Math.PI;
      anyKey = Math.max(anyKey, k);
      if (o.castShadow) shadowKey = Math.max(shadowKey, k);
    }
  });
  const key = shadowKey || anyKey;
  return key > 0 ? { ambient, key } : null;
}

// ---------------------------------------------------------------- helpers

/** Figure-space position of the current fragment (stable under turntable + fold). */
export const figurePosition = (ctx) => ctx.u.figureInv.mul(vec4(positionWorld, 1.0)).xyz;

/**
 * Exact box-filtered coverage of a line of width `w` (px) for a pixel whose
 * centre is `d` px from the line's centre — crisp at ≥1 px, grey below.
 */
const boxCover = (d, w) => clamp(min(d.add(0.5), w.mul(0.5)).sub(max(d.sub(0.5), w.mul(-0.5))), 0.0, 1.0);

/**
 * Anti-aliased line lattice with screen-space level of detail.
 * @param {Node} t      line coordinate, lines at integers
 * @param {Node} g      |∇t| in lines per device px
 * @param {Node} width  line width in device px
 * @param {Node} S      minimum period in device px (period stays in [S, 2S])
 * @param {boolean} lod false: keep lines exactly at the integers of t
 */
function lodLines(t, g, width, S, lod = true) {
  const gg = g.max(1e-7);
  if (!lod) {
    const f = fract(t);
    return boxCover(min(f, f.oneMinus()).div(gg), width);
  }
  const level = log2(float(1).div(gg.mul(S))).clamp(-10.0, 10.0);
  const k = floor(level);
  const grow = smoothstep(0.0, 1.0, level.sub(k));
  const sc = exp2(k);
  const period = float(1).div(gg.mul(sc));
  const f = fract(t.mul(sc));
  const dEven = min(f, f.oneMinus()).mul(period);
  const dOdd = abs(f.sub(0.5)).mul(period);
  return max(boxCover(dEven, width), boxCover(dOdd, width.mul(grow)));
}

/** |∇x| in units per device px. */
const gradLen = (x) => vec2(dFdx(x), dFdy(x)).length();

/**
 * Per-object dissolve used by layer fades: keeps the fragment while a stable
 * dither value is below the object's `userData.inkFade` (default 1 = solid).
 * Mixing figure-space noise with screen dither reads as ink lifting off the
 * paper rather than as transparency, and keeps materials opaque (no sorting,
 * no pipeline switch).
 */
function dissolveMask(ctx, withFigureNoise = true, pixel = fragPixel) {
  const fade = uniform(1).onObjectUpdate(({ object }) => {
    const f = object?.userData?.inkFade;
    return f === undefined ? 1 : f;
  });
  const dither = interleavedGradientNoise(pixel);
  const n = withFigureNoise
    ? mix(dither, mx_noise_float(figurePosition(ctx).mul(ctx.u.wobbleFreq.mul(1.7))).mul(0.5).add(0.5).clamp(0, 1), 0.55)
    : dither;
  return { fade, mask: n.lessThan(fade.mul(1.02)) };
}

// ---------------------------------------------------------------- materials

/**
 * The plate material.
 *
 * @param {object} ctx  FigureContext
 * @param {object} o
 * @param {string|number|THREE.Color} [o.color]  albedo (sRGB)
 * @param {import('three/tsl').Node} [o.colorNode]  albedo node (patterns); overrides color
 * @param {string} [o.svgColor]  representative sRGB hex for SVG export when using colorNode
 * @param {number} [o.roughness=0.8]
 * @param {number} [o.metalness=0]
 * @param {number} [o.sheen]  0..1 soft satin sheen (scales, petals) — uses MeshPhysicalNodeMaterial
 * @param {string} [o.sheenColor]  defaults to a lightened albedo
 * @param {number} [o.clearcoat]  0..1 glossy varnish (wet scales, beetle elytra)
 * @param {number} [o.hatch=1]  hatch strength multiplier (0 = no lines)
 * @param {import('three/tsl').Node} [o.hatchCoord]  custom float coordinate for the primary
 *        hatch family (lines at integer values). Use it to make lines follow form, e.g. rings
 *        around a snake: `uv().y.mul(rings)`. Defaults to figure-space cross-contours.
 * @param {boolean} [o.hatchLod=true]  false keeps hatchCoord lines exactly at its integers
 *        (no screen-space subdivision/thinning)
 * @param {number} [o.hatchAngle=0] radians; tilt of the default cross-contour lines as seen
 *        on a wall facing the reader (0 = horizontal)
 * @param {number} [o.crossHatch=1] multiplier for the second (meridian) family
 * @param {number} [o.reflect=1]  reflected light near the shadow-side silhouette (0..1)
 * @param {import('three/tsl').Node} [o.emissiveNode]  self-lit colour added to the lit result
 *        (an eye's catchlight, which must stay white on the shadow side). Lithograph only: its
 *        lighting ratio stays above the hatch threshold, so it is never hatched; the engraving
 *        branch ignores it, like the albedo.
 * @param {boolean} [o.transparent]
 * @param {number} [o.side] THREE.FrontSide | DoubleSide
 * @param {string} [o.name]
 * @returns {THREE.MeshStandardNodeMaterial}
 */
export function inkMaterial(ctx, o = {}) {
  const physical = (o.sheen ?? 0) > 0 || (o.clearcoat ?? 0) > 0;
  const Mat = physical ? THREE.MeshPhysicalNodeMaterial : THREE.MeshStandardNodeMaterial;
  const mat = new Mat({
    roughness: o.roughness ?? 0.8,
    metalness: o.metalness ?? 0,
    side: o.side ?? THREE.FrontSide,
    transparent: o.transparent ?? false,
  });
  mat.name = o.name ?? 'ink';
  const base = new THREE.Color(o.color ?? '#bbbbbb');
  const albedo = o.colorNode ?? tslColor(base);
  mat.colorNode = albedo;
  if (o.emissiveNode) mat.emissiveNode = o.emissiveNode;
  mat.userData.isInk = true;
  mat.userData.inkColor = o.svgColor ?? (o.colorNode ? o.color ?? null : '#' + base.getHexString());
  if (physical) {
    if (o.sheen) {
      mat.sheen = o.sheen;
      mat.sheenRoughness = 0.45;
      mat.sheenColor = new THREE.Color(o.sheenColor ?? base.clone().lerp(new THREE.Color('#ffffff'), 0.55));
      mat.roughness = Math.min(mat.roughness, 0.6);
    }
    if (o.clearcoat) {
      mat.clearcoat = o.clearcoat;
      mat.clearcoatRoughness = 0.35;
    }
  }

  // x-ray: fades a surface to a fresnel rim so inner layers show through.
  const xray = uniform(0);
  mat.userData.xray = xray;
  const ndv = abs(dot(normalView, positionViewDirection)).clamp(0, 1);
  const fres = ndv.oneMinus();
  mat.opacityNode = mix(float(1), pow(fres, 2.0).mul(0.6).add(0.05), xray);

  // layer fades (dissolve), per object. `inkMask` records the kit's own mask
  // so the SVG exporter can tell a subject's extra mask (a lesson reveal ANDed
  // into maskNode) from this one, whose state it already reads from inkFade.
  const { fade, mask } = dissolveMask(ctx);
  mat.userData.fade = fade;
  mat.maskNode = mask;
  mat.userData.inkMask = mask;

  const hatchAmt = uniform(o.hatch ?? 1);
  mat.userData.hatch = hatchAmt;
  const crossAmt = uniform(ctx.quality === 'low' ? 0 : o.crossHatch ?? 1);
  mat.userData.crossHatch = crossAmt;
  const reflectAmt = uniform(o.reflect ?? 1);
  const angle = o.hatchAngle ?? 0;
  const dirA = new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0.35).normalize();
  const lod = o.hatchLod ?? true;

  mat.outputNode = Fn(() => {
    const lit = output.rgb;
    const u = ctx.u;
    // Lighting ratio, independent of albedo: so dark red scales are not
    // hatched like shadows, but cast shadows are.
    const albedoLum = luminance(diffuseColor.rgb).max(0.03);
    const shade = luminance(lit).div(albedoLum);
    const sm = u.styleMix;

    // reflected light: bounce from the paper brightens the shadow side's rim
    const refl = pow(fres, 2.6).mul(u.reflect).mul(reflectAmt).mul(0.7);

    // tone 0 (lit) … 1 (deepest shade)
    const toneL = smoothstep(u.litHi, u.litLo, shade);
    const valueE = shade.mul(mix(float(0.7), float(1.0), sqrt(albedoLum)));
    const toneE = smoothstep(u.engHi, u.engLo, valueE);
    const tL = toneL.mul(refl.oneMinus());
    const tE = toneE.mul(refl.mul(0.8).oneMinus());

    // coverage (fraction of the period) per family
    const c1 = mix(tL.mul(0.42), tE.mul(1.2).min(0.62), sm);
    const c2 = mix(smoothstep(0.86, 1.0, tL).mul(0.22), tE.sub(0.42).mul(1.25).clamp(0.0, 0.58), sm);
    const strength = u.hatchStrength.mul(hatchAmt);

    const S = u.hatchPx.mul(screenDPR).mul(inkGlobals.pixelScale);
    const P = figurePosition(ctx);

    // family A: cross-contours (planar slices) or the subject's own coordinate
    const tA = o.hatchCoord ? float(o.hatchCoord) : dot(P, vec3(dirA.x, dirA.y, dirA.z)).mul(u.hatchFreq);
    const mA = lodLines(tA, gradLen(tA), c1.mul(strength).mul(S), S, lod);

    // family B: meridians around the figure's vertical axis (seam-free)
    const r2 = P.x.mul(P.x).add(P.z.mul(P.z)).max(1e-8);
    const k = MERIDIANS / TAU;
    const tB = atan(P.z, P.x).mul(k);
    const gBx = P.x.mul(dFdx(P.z)).sub(P.z.mul(dFdx(P.x))).div(r2).mul(k);
    const gBy = P.x.mul(dFdy(P.z)).sub(P.z.mul(dFdy(P.x))).div(r2).mul(k);
    const mB = lodLines(tB, vec2(gBx, gBy).length(), c2.mul(strength).mul(crossAmt).mul(S), S, true);

    const m = float(1).sub(mA.oneMinus().mul(mB.oneMinus()));
    // lithograph: lines are a darker shade of the local colour; the shadow
    // side's rim picks up a little bounce light
    const bounce = diffuseColor.rgb.mul(refl.mul(toneL).mul(0.18));
    const litC = lit.add(bounce);
    const litho = mix(litC, litC.mul(0.36).add(u.ink.mul(0.04)), m.mul(0.92));
    // engraving: paper with a whisper of the albedo, ink lines
    const paperTone = mix(u.paper, diffuseColor.rgb, 0.06).mul(0.95);
    const engr = mix(paperTone, u.ink, m);
    return vec4(mix(litho, engr, sm), output.a);
  })();

  return mat;
}

/**
 * Unlit ink/paper material for labels, props and guide geometry.
 * @param {object} ctx FigureContext
 * @param {{ color?: string, colorNode?: any, side?: number, transparent?: boolean,
 *           depthWrite?: boolean, opacity?: number, name?: string }} [o]
 */
export function flatMaterial(ctx, o = {}) {
  const mat = new THREE.MeshBasicNodeMaterial({
    side: o.side ?? THREE.FrontSide,
    transparent: o.transparent ?? false,
    depthWrite: o.depthWrite ?? true,
  });
  const c = new THREE.Color(o.color ?? ctx.palette.ink);
  mat.colorNode = o.colorNode ?? tslColor(c);
  if (o.opacity !== undefined) {
    mat.transparent = true;
    mat.opacity = o.opacity;
  }
  const { fade, mask } = dissolveMask(ctx, false);
  mat.userData.fade = fade;
  mat.maskNode = mask;
  mat.userData.inkMask = mask;
  mat.userData.isFlat = true;
  mat.userData.inkColor = '#' + c.getHexString();
  mat.name = o.name ?? 'flat';
  return mat;
}

/**
 * Inverted-hull ink outline. Shares the mesh geometry (so CPU-animated and
 * instanced geometry stay outlined). The hull is pushed out by a constant
 * SCREEN width (≈1.2 px at book zoom, growing gently with zoom) so every part
 * of every figure is inked with the same pen, with a hand-inked wobble.
 * Works best on closed, smooth meshes; give thin sheets (petals) a little
 * thickness or use ctx.inkLine for edges instead.
 *
 * @param {THREE.Mesh|THREE.InstancedMesh} mesh
 * @param {object} ctx FigureContext
 * @param {{ width?: number, color?: string }} [o] width multiplier (1 = default)
 * @returns {THREE.Mesh} the hull (child of mesh, `userData.isOutline = true`)
 */
export function addOutline(mesh, ctx, o = {}) {
  const mat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide });
  mat.name = 'outline';
  mat.colorNode = o.color ? tslColor(new THREE.Color(o.color)) : ctx.u.ink;
  const widthMul = uniform(o.width ?? 1);
  mat.userData.width = widthMul;
  const u = ctx.u;
  mat.positionNode = Fn(() => {
    const n = normalLocal.normalize();
    const wp = modelWorldMatrix.mul(vec4(positionLocal, 1.0));
    // world length of one local unit along the normal (fit scale × fold)
    const sN = modelWorldMatrix.mul(vec4(n, 0.0)).xyz.length().max(1e-8);
    // world size of one device pixel at this vertex (perspective or ortho)
    const clipW = cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(positionLocal, 1.0))).w;
    const pxWorld = clipW.mul(2.0).div(cameraProjectionMatrix.element(1).element(1).mul(viewportHeight).max(1.0));
    // a pen a little broader when the page is seen larger
    const cssPerUnit = float(1).div(pxWorld.mul(screenDPR).max(1e-9));
    const zoomK = pow(cssPerUnit.div(BOOK_PX_PER_UNIT), 0.45).clamp(0.75, 2.1);
    const legacy = u.outline.div(u.outlineBase.max(1e-9)).clamp(0.0, 8.0);
    const figP = u.figureInv.mul(wp).xyz;
    const wob = mx_noise_float(figP.mul(u.wobbleFreq)).mul(u.wobble).mul(0.85).add(1.0).max(0.2);
    const wPx = u.outlinePx.mul(screenDPR).mul(inkGlobals.pixelScale).mul(zoomK).mul(legacy).mul(widthMul).mul(wob);
    return positionLocal.add(n.mul(wPx.mul(pxWorld).div(sN)));
  })();
  const xray = uniform(0);
  mat.userData.xray = xray;
  mat.opacityNode = float(1).sub(xray);
  const { fade, mask } = dissolveMask(ctx);
  mat.userData.fade = fade;
  mat.maskNode = mask;
  mat.userData.inkMask = mask;

  let hull;
  if (mesh.isInstancedMesh) {
    hull = new THREE.InstancedMesh(mesh.geometry, mat, mesh.count);
    hull.instanceMatrix = mesh.instanceMatrix;
    if (mesh.instanceColor) hull.instanceColor = null;
  } else {
    hull = new THREE.Mesh(mesh.geometry, mat);
  }
  hull.name = `${mesh.name || 'part'}:outline`;
  hull.userData.isOutline = true;
  hull.userData.castShadow = false;
  hull.userData.receiveShadow = false;
  hull.castShadow = false;
  hull.receiveShadow = false;
  hull.raycast = () => {};
  hull.frustumCulled = mesh.frustumCulled;
  if (mesh.isInstancedMesh) {
    // keep the hull's instance count in sync with the source
    hull.onBeforeRender = () => {
      hull.count = mesh.count;
    };
  }
  mesh.add(hull);
  mesh.userData.outline = hull;
  return hull;
}

// ---------------------------------------------------------------- ink lines

function toFlatPositions(points, closed) {
  let flat;
  if (points instanceof Float32Array || (Array.isArray(points) && typeof points[0] === 'number')) {
    flat = Array.from(points);
  } else {
    flat = [];
    for (const p of points) {
      if (p.isVector3) flat.push(p.x, p.y, p.z);
      else flat.push(p[0], p[1], p[2]);
    }
  }
  if (closed && flat.length >= 6) flat.push(flat[0], flat[1], flat[2]);
  return flat;
}

/**
 * Thin ink polyline (construction guides, venation, filaments). Screen-space
 * width in CSS px, MSAA-smoothed round caps, works on WebGPU and WebGL 2.
 * Points are in the parent's local units (cm inside figure.root).
 *
 * @param {object} ctx FigureContext
 * @param {Array<THREE.Vector3|number[]>|Float32Array} points
 * @param {object} [o]
 * @param {number} [o.width=1]  CSS px
 * @param {string} [o.color]  default: palette ink
 * @param {boolean} [o.dashed=false]
 * @param {number} [o.dashSize]  local units; default ≈ 6 px at book zoom (re-fit automatically)
 * @param {number} [o.gapSize]   local units; default ≈ 4 px at book zoom
 * @param {boolean} [o.closed=false]
 * @param {boolean} [o.depthTest=true]  false draws the guide on top (x-ray construction lines)
 * @param {boolean} [o.fit=true]  false excludes the line from the figure's fit box
 * @param {string} [o.name]
 * @returns {Line2} with `setPoints(points)` (in place when the count is unchanged) and `dispose()`
 */
export function inkLine(ctx, points, o = {}) {
  const closed = o.closed ?? false;
  const geo = new LineGeometry();
  geo.setPositions(toFlatPositions(points, closed));
  const dashed = o.dashed ?? false;
  const mat = new THREE.Line2NodeMaterial({ linewidth: o.width ?? 1, dashed, worldUnits: false });
  mat.name = o.name ? `${o.name}:line` : 'ink-line';
  const col = new THREE.Color(o.color ?? ctx.palette.ink);
  mat.colorNode = o.color ? tslColor(col) : ctx.u.ink;
  // (a Line2 expands its own screen-space quads: positionView is not its pixel)
  const { fade, mask } = dissolveMask(ctx, false, screenCoordinate.xy);
  mat.userData.fade = fade;
  mat.maskNode = mask;
  mat.userData.inkMask = mask;
  mat.depthTest = o.depthTest ?? true;
  const line = new Line2(geo, mat);
  line.name = o.name ?? 'ink-line';
  line.castShadow = false;
  line.receiveShadow = false;
  line.raycast = () => {};
  line.userData.castShadow = false;
  line.userData.receiveShadow = false;
  line.userData.isInkLine = true;
  if (o.fit === false) line.userData.noFit = true;
  if (o.depthTest === false) line.renderOrder = 10;
  const auto = { dash: o.dashSize === undefined, gap: o.gapSize === undefined };
  const meta = {
    width: o.width ?? 1,
    color: '#' + col.getHexString(),
    dashed,
    closed,
    points: toFlatPositions(points, closed),
    refit() {
      if (!dashed) return;
      const toLocal = 1 / Math.max(ctx.fitScale, 1e-9);
      if (auto.dash) mat.dashSize = (6 / BOOK_PX_PER_UNIT) * toLocal;
      if (auto.gap) mat.gapSize = (4 / BOOK_PX_PER_UNIT) * toLocal;
    },
  };
  if (!auto.dash) mat.dashSize = o.dashSize;
  if (!auto.gap) mat.gapSize = o.gapSize;
  line.userData.inkLine = meta;
  if (dashed) line.computeLineDistances();
  meta.refit();

  /**
   * Replace the points; updates buffers in place when the vertex count
   * matches. An open line given a Float32Array of the same length (a figure
   * rewriting its line every frame) allocates nothing: the points are copied
   * into the line's own array.
   */
  line.setPoints = (pts) => {
    let flat;
    if (!closed && pts instanceof Float32Array && pts.length === meta.points.length) {
      flat = meta.points;
      for (let i = 0; i < pts.length; i++) flat[i] = pts[i];
    } else flat = toFlatPositions(pts, closed);
    const start = geo.attributes.instanceStart;
    const segs = flat.length / 3 - 1;
    if (start && start.data.array.length === segs * 6) {
      const arr = start.data.array;
      for (let i = 0; i < segs; i++) {
        const a = i * 3, b = i * 6;
        arr[b] = flat[a]; arr[b + 1] = flat[a + 1]; arr[b + 2] = flat[a + 2];
        arr[b + 3] = flat[a + 3]; arr[b + 4] = flat[a + 4]; arr[b + 5] = flat[a + 5];
      }
      start.data.needsUpdate = true;
      if (dashed) {
        const dist = geo.attributes.instanceDistanceStart;
        if (dist) {
          const d = dist.data.array;
          let acc = 0;
          for (let i = 0; i < segs; i++) {
            const a = i * 3;
            const dx = flat[a + 3] - flat[a], dy = flat[a + 4] - flat[a + 1], dz = flat[a + 5] - flat[a + 2];
            d[i * 2] = acc;
            acc += Math.sqrt(dx * dx + dy * dy + dz * dz);
            d[i * 2 + 1] = acc;
          }
          dist.data.needsUpdate = true;
        }
      }
      geo.computeBoundingSphere();
    } else {
      geo.setPositions(flat);
      if (dashed) line.computeLineDistances();
    }
    meta.points = flat;
  };
  line.dispose = () => {
    ctx.lines.delete(line);
    geo.dispose();
    mat.dispose();
  };
  ctx.lines.add(line);
  return line;
}

// ---------------------------------------------------------------- state helpers

/**
 * Fade a mesh (and its outline) towards an x-ray rim. 0 = solid, 1 = ghost.
 * Toggles transparency flags only when crossing 0 so solid meshes keep
 * their depth writes.
 */
export function setXray(mesh, amount) {
  mesh.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      const x = m.userData?.xray;
      if (!x) continue;
      x.value = amount;
      const wantT = amount > 0.001;
      if (m.transparent !== wantT || m.depthWrite === wantT) {
        m.transparent = wantT || m.userData.alwaysTransparent === true;
        m.depthWrite = !wantT;
        m.needsUpdate = true;
      }
    }
    if (o.userData?.isOutline) o.visible = amount < 0.6;
  });
}

/**
 * Dissolve an object subtree (ink, flat, outline and line materials) without
 * making it transparent: 1 = solid, 0 = gone. Used for layer transitions.
 * @param {THREE.Object3D} obj
 * @param {number} amount 0..1
 */
export function setFade(obj, amount) {
  const a = Math.max(0, Math.min(1, amount));
  obj.traverse((o) => {
    if (a >= 1) delete o.userData.inkFade;
    else o.userData.inkFade = a;
  });
}
