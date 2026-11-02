// A pool of still water for aquatic plates (Nymphaea), drawn as a soft
// vignette on the page rather than a box of liquid: an elliptical surface
// whose edge dissolves into the paper, concentric ripples spreading from
// sources (the flower's stalk, pad edges), a faint caustic floor seen
// through it, and wobbling underwater stems for a refraction look.
//
// All of it is procedural TSL driven by the figure's loop clock
// (ctx.u.time, 0…5 s): every ring is born at zero amplitude and dies at
// zero amplitude, with an integer number of cycles per loop, so the water
// is seamless across the 5-second seam. Cheap: a few exp/cos per fragment.
import * as THREE from 'three/webgpu';
import {
  positionLocal, vec2, vec3, float, length, exp, cos, sin, fract, smoothstep, mix, pow, abs, dot,
  normalView, positionViewDirection, transformNormalToView, mx_noise_float, color as tslColor, PI,
} from 'three/tsl';

/**
 * @param {object} ctx FigureContext
 * @param {object} [o]
 * @param {number} [o.radiusX=24] cm
 * @param {number} [o.radiusZ=20] cm
 * @param {number} [o.level=1.2] cm above the paper
 * @param {Array<{x:number,z:number,reach?:number,cycles?:number,rings?:number,amp?:number,width?:number,phase?:number}>} [o.sources]
 * @param {string} [o.shallow] edge tint
 * @param {string} [o.deep] centre tint
 * @param {string} [o.sky] grazing reflection
 * @param {number} [o.opacity=0.82]
 * @returns {{ group: THREE.Group, surface: THREE.Mesh, floor: THREE.Mesh, level: number, dispose: () => void }}
 */
export function createPond(ctx, o = {}) {
  const rx = o.radiusX ?? 24;
  const rz = o.radiusZ ?? 20;
  const level = o.level ?? 1.2;
  const sources = o.sources ?? [{ x: 0, z: 0 }];
  const group = new THREE.Group();
  group.name = 'pond';
  const T = ctx.u.time.div(5);

  // ---- ripple height field (cm), sum of born-and-dying ring wavelets
  const height = (q) => {
    let h = float(0);
    for (const s of sources) {
      const reach = s.reach ?? 14;
      const rings = s.rings ?? 3;
      const cyc = s.cycles ?? 1;
      const w = s.width ?? 0.55;
      const d = length(q.sub(vec2(s.x, s.z)));
      for (let k = 0; k < rings; k++) {
        const ph = fract(T.mul(cyc).add(k / rings + (s.phase ?? 0)));
        const R = ph.mul(reach);
        const x = d.sub(R).div(w);
        const env = sin(ph.mul(PI)).mul(ph.oneMinus().mul(0.7).add(0.3));
        h = h.add(exp(x.mul(x).negate()).mul(cos(x.mul(2.6))).mul(env).mul(s.amp ?? 0.06));
      }
    }
    return h;
  };

  const geo = new THREE.CircleGeometry(1, 128);
  geo.rotateX(-Math.PI / 2);
  geo.scale(rx, 1, rz);
  const p = positionLocal.xz;
  const e = 0.14;
  const h0 = height(p);
  const hx = height(p.add(vec2(e, 0)));
  const hz = height(p.add(vec2(0, e)));
  const nLocal = vec3(h0.sub(hx).div(e), float(1), h0.sub(hz).div(e)).normalize();
  const r = length(p.div(vec2(rx, rz)));
  let c = mix(tslColor(o.deep ?? '#6f9f98'), tslColor(o.shallow ?? '#b9d6cf'), smoothstep(0.05, 0.95, r));
  c = c.add(h0.mul(1.6)); // crests catch the light
  const fres = pow(float(1).sub(abs(dot(normalView, positionViewDirection))).clamp(0, 1), 3.0);
  c = mix(c, tslColor(o.sky ?? '#eef5f4'), fres.mul(0.55));
  const mat = ctx.ink({
    colorNode: c,
    svgColor: o.deep ?? '#8fb8b0',
    roughness: 0.16,
    hatch: 0.55,
    crossHatch: 0.4,
    transparent: true,
    name: 'pond-water',
  });
  mat.normalNode = transformNormalToView(nLocal);
  mat.opacityNode = float(1).sub(smoothstep(0.68, 1.0, r)).mul(o.opacity ?? 0.82);
  mat.depthWrite = false;
  mat.userData.alwaysTransparent = true;
  const surface = new THREE.Mesh(geo, mat);
  surface.name = 'pond-surface';
  surface.position.y = level;
  surface.renderOrder = 3;
  surface.userData.castShadow = false;
  surface.userData.receiveShadow = true;
  group.add(surface);

  // ---- floor: paper tinted by the water with drifting caustics
  const fgeo = new THREE.CircleGeometry(1, 96);
  fgeo.rotateX(-Math.PI / 2);
  fgeo.scale(rx * 0.98, 1, rz * 0.98);
  const fr = length(positionLocal.xz.div(vec2(rx, rz)));
  const loopOff = vec2(cos(T.mul(Math.PI * 2)), sin(T.mul(Math.PI * 2))).mul(0.9);
  const cn = mx_noise_float(vec3(positionLocal.xz.mul(0.42).add(loopOff), 0.5));
  const cn2 = mx_noise_float(vec3(positionLocal.xz.mul(0.71).sub(loopOff.mul(0.6)), 3.1));
  const lines = float(1).sub(smoothstep(0.0, 0.07, abs(cn))).mul(0.6).add(
    float(1).sub(smoothstep(0.0, 0.05, abs(cn2))).mul(0.35));
  const floorCol = mix(tslColor(o.floor ?? '#d5e5df'), tslColor('#f6fbf8'), lines.clamp(0, 1));
  const fmat = ctx.flat({ colorNode: floorCol, transparent: true, depthWrite: false, name: 'pond-floor' });
  fmat.opacityNode = float(1).sub(smoothstep(0.55, 0.97, fr)).mul(0.9);
  const floor = new THREE.Mesh(fgeo, fmat);
  floor.name = 'pond-floor';
  floor.position.y = 0.03;
  floor.renderOrder = 1;
  floor.userData.castShadow = false;
  floor.userData.receiveShadow = false;
  floor.userData.noFit = true;
  group.add(floor);

  return {
    group,
    surface,
    floor,
    level,
    dispose() {
      geo.dispose();
      fgeo.dispose();
      mat.dispose();
      fmat.dispose();
    },
  };
}

/**
 * Position node that sways geometry below the water line, so stems seen
 * through the surface look refracted. Use on outline-free meshes.
 * @param {object} ctx FigureContext
 * @param {number} level  water line in the mesh's local y (cm)
 * @param {number} [amount=0.18] cm
 */
export function underwaterWobble(ctx, level, amount = 0.18) {
  const T = ctx.u.time.div(5).mul(Math.PI * 2);
  const below = smoothstep(level, level - 1.5, positionLocal.y);
  const off = vec3(sin(positionLocal.y.mul(2.3).add(T.mul(2))), float(0), cos(positionLocal.y.mul(1.7).add(T)));
  return positionLocal.add(off.mul(below).mul(amount));
}
