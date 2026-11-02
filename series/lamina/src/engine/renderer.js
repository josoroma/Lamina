// Renderer bootstrap: WebGPU first, WebGL 2 fallback, one code path.
//
// Three.js' WebGPURenderer compiles every TSL node graph to WGSL when the
// WebGPU backend is available and to GLSL ES 3.0 otherwise, so materials,
// shaders and post effects are written once (in TSL) and run on both.
// Force the fallback with `?gl=webgl` to test it.
//
// Tone: a custom, hue-preserving curve (laminaToneMapping) replaces Khronos
// PBR Neutral. Neutral starts compressing at 0.76 and squeezes near-white
// ~15× — paper either renders dull cream or, when exposed up, loses all its
// shading (gutter, curl, cast shadows). Ours is linear (true to pigment) up
// to 0.8 and then rolls off with a soft exponential shoulder, so figure
// mid-tones stay true to their albedo while the paper reaches its authored
// white and keeps visible shading.
import * as THREE from 'three/webgpu';
import { Fn, float, vec3, min, max, mix, select, exp } from 'three/tsl';

/** Exposure calibrated with createLights() so paper #fbf8f1 renders ≈ (251, 248, 240). */
export const TONE_EXPOSURE = 0.78;
/** Where the tone curve leaves linear and starts its shoulder. */
export const TONE_SHOULDER = 0.8;

/**
 * Lámina tone curve (TSL, both backends). Linear below TONE_SHOULDER, soft
 * exponential shoulder above (C1-continuous, asymptotic to 1), applied to
 * the peak channel so hues are preserved, with a touch of highlight
 * desaturation and a tiny toe that keeps blacks inky.
 */
export const laminaToneMapping = /*@__PURE__*/ Fn(([color, exposure]) => {
  const S = float(TONE_SHOULDER);
  const c = color.mul(exposure).toVar();
  const x = min(c.r, min(c.g, c.b));
  const offset = select(x.lessThan(0.04), x.sub(x.mul(x).mul(12.5)), float(0.02));
  c.subAssign(offset);
  const peak = max(c.r, max(c.g, c.b)).max(1e-5);
  const over = peak.sub(S).max(0);
  const k = float(1).sub(S);
  const newPeak = select(peak.greaterThan(S), S.add(k.mul(float(1).sub(exp(over.div(k).negate())))), peak).toVar();
  c.mulAssign(newPeak.div(peak));
  const g = float(1).sub(float(1).div(peak.sub(newPeak).mul(0.15).add(1)));
  return mix(c, vec3(newPeak, newPeak, newPeak), g);
}).setLayout({
  name: 'laminaToneMapping',
  type: 'vec3',
  inputs: [
    { name: 'color', type: 'vec3' },
    { name: 'exposure', type: 'float' },
  ],
});

/**
 * @typedef {Object} RendererInfo
 * @property {THREE.WebGPURenderer} renderer
 * @property {'webgpu'|'webgl2'} backend
 * @property {number} maxPixelRatio
 * @property {boolean} lowPower  heuristically small/touch device
 */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ forceWebGL?: boolean, alpha?: boolean }} [opts]
 * @returns {Promise<RendererInfo>}
 */
export async function createRenderer(canvas, opts = {}) {
  const params = new URLSearchParams(location.search);
  const forceWebGL = opts.forceWebGL ?? params.get('gl') === 'webgl';

  const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: true,
    alpha: true,
    forceWebGL,
    powerPreference: 'high-performance',
  });
  await renderer.init();

  const lowPower =
    matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600;
  const maxPixelRatio = 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, maxPixelRatio));

  // Pure white stage. WebGPURenderer tone-maps the whole framebuffer (clear
  // colour included), so we clear to transparent and let the page's CSS
  // white show through (the curve maps 0 → 0, so alpha-0 pixels stay clear).
  renderer.setClearColor(0xffffff, 0);
  if (!renderer.library.getToneMappingFunction(THREE.CustomToneMapping)) {
    renderer.library.addToneMapping(laminaToneMapping, THREE.CustomToneMapping);
  }
  renderer.toneMapping = THREE.CustomToneMapping;
  renderer.toneMappingExposure = TONE_EXPOSURE;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const backend = renderer.backend?.isWebGPUBackend ? 'webgpu' : 'webgl2';
  document.documentElement.dataset.backend = backend;
  return { renderer, backend, maxPixelRatio, lowPower };
}
