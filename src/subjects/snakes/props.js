// Props and species extras, drawn in the same ink as the snakes:
//   rattle      interlocking keratin segments + button, with motion-blur ghosts
//   water       a translucent slab: rippled, engraved surface and caustics (TSL)
//   branch      bark-textured branch arching up from a stem rooted in the page,
//               with a twig and leaves (prehensile tail)
//   prey        a black rat (Rattus rattus) at real scale for the constriction plate
//   clutch      leathery eggs of the oviparous bushmaster
//   spurs       boa cloacal spurs (vestiges of the hind limbs)
//   tail spine  the bushmaster's spiny tail tip
// Everything animated is a pure function of the loop time (ctx.u.time).
import * as THREE from 'three/webgpu';
import {
  Fn, uv, float, vec3, positionLocal, positionGeometry, normalize, sin, cos, abs, mix, smoothstep, fract,
  fwidth, length, vec2, mx_noise_float, mx_worley_noise_vec2,
} from 'three/tsl';
import { buildTube, makeSection, catmullRom, Polyline } from '../../kits/tube/index.js';
import { barkColorNode, barkSwatches, leafColorNode, eggColorNode, colorOf } from './patterns.js';

const TAU = Math.PI * 2;

/**
 * Hatch coordinate for eggs (a unit sphere stretched along X): planes across
 * the long axis, so engraved shade lines wrap around the form, taken on the
 * true sphere (a facet's chord bends them into diamonds). The ink kit keeps
 * their on-screen spacing constant, so the base frequency only sets the
 * phase. Towards the poles they close into concentric circles — a bull's-eye
 * wherever such a form is seen end-on — so they thin out and stop short of
 * the poles (POLE_FADE, on poleSphere's groups).
 */
const poleRings = normalize(positionGeometry).x.mul(8);

/**
 * The fade by angle from the nearer pole: [up to (deg), share of the hatch].
 * `hatch` is one uniform per material, so the fade is stepped — a material
 * per step, the steps meeting on latitude rings of poleSphere.
 */
const POLE_FADE = [[20, 0], [30, 0.28], [45, 0.65], [90, 1]];

/** Deterministic PRNG (mulberry32) so props are identical on every load. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- rattle

/**
 * Rattle of `n` segments + button along local +X (away from the body).
 * @returns {{ group, segments: THREE.Mesh[], ghosts: THREE.Group, length: number,
 *            pose(explode:number, shake:number, t:number):void, dispose():void }}
 */
export function buildRattle(ctx, { radius, segments: n = 7, color = '#b9a27e', dark = '#6f5d48' }) {
  const group = new THREE.Group();
  group.name = 'rattle';
  const ls = radius * 1.15; // one segment
  const step = ls * 0.5; // visible step between segments
  const sec = makeSection({ width: 1, top: 0.64, bottom: 0.64, pTop: 2.2, pBottom: 2.2 }, 18);
  const profile = (u) => {
    // proximal lobe (hidden in the previous segment), mid lobe, distal lobe
    const k = [0.52, 0.66, 0.6, 0.86, 0.94, 0.8, 0.9, 1.0, 0.96, 0.7, 0.42];
    const f = u * (k.length - 1);
    const i = Math.min(k.length - 2, Math.floor(f));
    const t = f - i;
    return k[i] + (k[i + 1] - k[i]) * (t * t * (3 - 2 * t));
  };
  const mat = ctx.ink({
    colorNode: Fn(() => {
      const u = uv(1).x;
      const groove = smoothstep(0.2, 0.0, abs(fract(u.mul(2.0).add(0.25)).sub(0.5)));
      return mix(colorOf(color), colorOf(dark), groove.mul(0.55).add(smoothstep(0.75, 1.0, u).mul(0.15)));
    })(),
    svgColor: color,
    roughness: 0.38,
    name: 'rattle',
  });
  const geos = [];
  const segs = [];
  for (let i = 0; i <= n; i++) {
    const button = i === n;
    const sc = 1 - i * 0.035;
    const len = button ? ls * 0.75 : ls;
    const g = buildTube([0, 0, 0, len * 0.5, 0, 0, len, 0, 0], {
      radius: button ? (u) => radius * sc * 0.82 * Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.85)) ** 0.5 : (u) => radius * sc * profile(u),
      rings: 26, radial: 18, section: sec, startCap: 'round', endCap: 'round', up: [0, 1, 0],
    });
    geos.push(g);
    const m = new THREE.Mesh(g, mat);
    m.name = button ? 'rattle-button' : `rattle-segment-${i + 1}`;
    m.userData.baseX = i * step;
    m.position.x = m.userData.baseX;
    ctx.outline(m, { width: 0.6 });
    group.add(m);
    segs.push(m);
  }
  // motion blur: translucent copies spread sideways while the rattle buzzes
  const ghosts = new THREE.Group();
  ghosts.name = 'rattle-blur';
  const gMat = ctx.flat({ color, opacity: 0.16, depthWrite: false, transparent: true, name: 'rattle-blur' });
  const offsets = [-1, -0.55, 0.55, 1];
  for (const o of offsets) {
    const gg = new THREE.Group();
    gg.userData.offset = o;
    for (const s of segs) {
      const m = new THREE.Mesh(s.geometry, gMat);
      m.position.copy(s.position);
      m.userData.seg = s;
      m.userData.castShadow = false;
      m.castShadow = false;
      m.userData.noFit = true;
      gg.add(m);
    }
    ghosts.add(gg);
  }
  group.add(ghosts);
  const length = n * step + ls;
  return {
    group,
    segments: segs,
    ghosts,
    length,
    step,
    pose(explode, shake, t) {
      for (const s of segs) s.position.x = s.userData.baseX * (1 + explode * 1.25) + explode * step * 0.2;
      ghosts.visible = shake > 0.01;
      if (!ghosts.visible) return;
      // the blur fans out sideways; a slow breathing of its width keeps it alive
      const breathe = 0.9 + 0.1 * Math.sin((TAU * t) / 5);
      for (let i = 0; i < ghosts.children.length; i++) {
        const gg = ghosts.children[i];
        const o = gg.userData.offset;
        gg.position.z = o * radius * 0.85 * shake * breathe;
        gg.rotation.y = -o * 0.12 * shake;
        for (let j = 0; j < gg.children.length; j++) gg.children[j].position.copy(gg.children[j].userData.seg.position);
      }
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      mat.dispose();
      gMat.dispose();
    },
  };
}

// ---------------------------------------------------------------- water slab

/**
 * Translucent sea-water slab (cm): x ∈ [−w, w], z ∈ [−d, d], y ∈ [0, h].
 * The surface ripples (vertex displacement + engraved contour lines), the
 * floor shows moving caustics. All motion is periodic in the 5 s loop.
 */
export function buildWater(ctx, { w = 48, d = 18, h = 9 } = {}) {
  const group = new THREE.Group();
  group.name = 'water';
  const T = ctx.u.time;
  const ph = T.mul(TAU / 5);
  // ripples: travelling waves with integer cycles per loop (seamless)
  const ripple = (x, z) =>
    sin(x.mul(0.42).add(ph.mul(3))).mul(0.14)
      .add(sin(x.mul(0.23).add(z.mul(0.31)).sub(ph.mul(2))).mul(0.1))
      .add(sin(z.mul(0.57).sub(x.mul(0.12)).add(ph.mul(4))).mul(0.05));
  // engraved water: fine parallel wave lines that ride on the ripples
  const waveLines = (x, z) => {
    const v = z.mul(0.62).add(ripple(x, z).mul(2.6)).add(sin(x.mul(0.11)).mul(0.6));
    return smoothstep(0.1, 0.0, abs(fract(v).sub(0.5)).sub(0.42));
  };

  const topGeo = new THREE.PlaneGeometry(w * 2, d * 2, 140, 56);
  topGeo.rotateX(-Math.PI / 2);
  topGeo.translate(0, h, 0);
  const top = ctx.flat({ color: '#cfe7e8', transparent: true, depthWrite: false, side: THREE.DoubleSide, name: 'water-surface' });
  top.positionNode = Fn(() => {
    const p = positionLocal;
    return vec3(p.x, p.y.add(ripple(p.x, p.z)), p.z);
  })();
  top.colorNode = Fn(() => {
    const p = positionGeometry;
    const r = ripple(p.x, p.z);
    const base = mix(colorOf('#e4f2f1'), colorOf('#b4d8da'), r.mul(2.4).add(0.5).clamp(0, 1));
    return mix(base, colorOf('#4f8790'), waveLines(p.x, p.z).mul(0.7));
  })();
  // a clear veil: the yellow flank just below the surface must stay yellow
  // (about a centimetre of clear sea water), so only the engraved wave lines
  // carry real ink
  top.opacityNode = Fn(() => {
    const p = positionGeometry;
    return float(0.04).add(waveLines(p.x, p.z).mul(0.14));
  })();
  const topMesh = new THREE.Mesh(topGeo, top);
  topMesh.name = 'water-surface';
  topMesh.renderOrder = 3;
  topMesh.userData.castShadow = false;
  topMesh.userData.receiveShadow = false;
  topMesh.userData.noFit = false;
  group.add(topMesh);

  // body of water: pale aqua deepening with depth, kept light so the snake
  // reads. Only the four side walls: a lid would veil the swimmer a second
  // time (the rippled surface is the lid) and a bottom face would double the
  // caustic floor. BoxGeometry faces are ordered +x, −x, +y, −y, +z, −z,
  // six indices each.
  const wallGeo = new THREE.BoxGeometry(w * 2, h, d * 2, 1, 1, 1);
  wallGeo.translate(0, h / 2, 0);
  const wi = wallGeo.index.array;
  wallGeo.setIndex([...wi.slice(0, 12), ...wi.slice(24, 36)]);
  wallGeo.clearGroups();
  const wall = ctx.flat({ color: '#9fcdd1', transparent: true, depthWrite: false, side: THREE.FrontSide, name: 'water-body' });
  wall.colorNode = Fn(() => {
    const y = positionGeometry.y.div(h);
    return mix(colorOf('#7fb5bb'), colorOf('#d6ecec'), y);
  })();
  wall.opacityNode = Fn(() => {
    const y = positionGeometry.y.div(h);
    return mix(float(0.3), float(0.1), y);
  })();
  const wallMesh = new THREE.Mesh(wallGeo, wall);
  wallMesh.name = 'water-body';
  wallMesh.renderOrder = 2;
  wallMesh.userData.castShadow = false;
  wallMesh.userData.receiveShadow = false;
  group.add(wallMesh);

  // floor caustics
  const floorGeo = new THREE.PlaneGeometry(w * 2, d * 2, 1, 1);
  floorGeo.rotateX(-Math.PI / 2);
  floorGeo.translate(0, 0.02, 0);
  const floor = ctx.flat({ color: '#cfe7e6', transparent: true, depthWrite: false, name: 'water-caustics' });
  floor.colorNode = Fn(() => {
    const p = positionGeometry;
    const q = vec3(p.x.mul(0.17).add(cos(ph).mul(0.7)), p.z.mul(0.17).add(sin(ph).mul(0.7)), sin(ph.mul(2)).mul(0.25));
    const f = mx_worley_noise_vec2(q, 1);
    const web = smoothstep(0.14, 0.0, f.y.sub(f.x));
    return mix(colorOf('#a5cfd2'), colorOf('#f6fcfa'), web);
  })();
  floor.opacityNode = float(0.42);
  const floorMesh = new THREE.Mesh(floorGeo, floor);
  floorMesh.name = 'water-caustics';
  floorMesh.renderOrder = 1;
  floorMesh.userData.castShadow = false;
  group.add(floorMesh);
  // Clear water hides nothing. The SVG plate leaves the washes out (an opaque
  // fill would bury the swimmer; the inked edges still draw the slab), and
  // label occlusion tests may skip them — they stay pickable, so a drag on
  // the water still turns the figure.
  for (const m of [topMesh, wallMesh, floorMesh]) {
    m.userData.exportGhost = true;
    m.userData.noOcclude = true;
  }

  // crisp diorama edges
  const e = [[-w, 0, -d], [w, 0, -d], [w, 0, d], [-w, 0, d], [-w, 0, -d]];
  const lines = [];
  const ink = '#4f8790';
  lines.push(ctx.inkLine(e, { width: 1, color: ink, name: 'water-edge', fit: false }));
  lines.push(ctx.inkLine(e.map(([x, , z]) => [x, h, z]), { width: 1, color: ink, name: 'water-edge', fit: false }));
  for (const [x, z] of [[-w, -d], [w, -d], [w, d], [-w, d]]) {
    lines.push(ctx.inkLine([[x, 0, z], [x, h, z]], { width: 1, color: ink, name: 'water-edge', fit: false }));
  }
  lines.forEach((l) => group.add(l));
  return {
    group,
    level: h,
    dispose() {
      topGeo.dispose();
      wallGeo.dispose();
      floorGeo.dispose();
      top.dispose();
      wall.dispose();
      floor.dispose();
      lines.forEach((l) => l.dispose());
    },
  };
}

// ---------------------------------------------------------------- branch

/**
 * A horizontal branch along X at height y (cm) with a twig and leaves. With
 * `trunk` (default) it springs from a sapling stem rooted in the paper at its
 * gutter-side (−X) end, so the pop-up stands on the page instead of hovering.
 * @returns {{ group, axisY: number, radius: number, dispose():void, parts: object[] }}
 */
export function buildBranch(ctx, { y = 16, radius = 1.2, length = 52, x0 = 0, leaf = 7, trunk = true } = {}) {
  const group = new THREE.Group();
  group.name = 'branch';
  const r = rng(7);
  const xs = x0 - length / 2; // gutter-side end of the horizontal branch
  const pts = [];
  let first = 0;
  if (trunk) {
    // the stem arches over into the branch: a quarter ellipse (a across,
    // y up) that leaves the paper vertically — its first ring stands level on
    // the page — and turns horizontal at xc, a little set back from the reader
    const a = Math.min(4.5, length * 0.13);
    const xc = xs + a * 0.75;
    const zt = -radius * 1.5;
    for (const deg of [0, 4, 18, 34, 50, 66, 80, 90]) {
      const th = (deg * Math.PI) / 180;
      pts.push(xc - a * Math.cos(th), y * Math.sin(th), zt * (1 - deg / 90));
    }
    // resume the branch clear of the arch
    first = Math.ceil(((xc - xs + 1) / length) * 8);
  }
  const nTrunk = pts.length / 3;
  for (let i = first; i <= 8; i++) {
    const u = i / 8;
    const x = xs + u * length;
    pts.push(x, y - 0.5 * Math.cos(u * Math.PI * 1.2) * 0.4, Math.sin(u * 5.1) * 0.25);
  }
  const barkMat = ctx.ink({ colorNode: barkColorNode(), svgColor: '#6a5847', roughness: 0.95, name: 'bark' });
  const SAMPLES = 8;
  const dense = catmullRom(Float32Array.from(pts), { samples: SAMPLES });
  // fraction of the tube that is stem: thicker there, flaring at the root
  let ut = 0;
  if (trunk) {
    const line = new Polyline(dense.length / 3).set(dense);
    ut = line.cum[(nTrunk - 1) * SAMPLES] / line.length;
  }
  const g = buildTube(dense, {
    radius: (u) => {
      if (u >= ut) return radius * (1.12 - 0.22 * (u - ut) / Math.max(1e-6, 1 - ut));
      const v = 1 - u / ut; // 1 at the root … 0 at the bend
      return radius * (1.12 + 0.3 * v + 0.4 * Math.max(0, 1 - u / (ut * 0.12)) ** 2);
    },
    rings: trunk ? 130 : 90, radial: 20, startCap: trunk ? 'open' : 'round', endCap: 'round',
  });
  const main = new THREE.Mesh(g, barkMat);
  main.name = 'branch';
  ctx.outline(main);
  group.add(main);
  // twig with leaves towards the fore-edge end
  const tx = x0 + length * 0.3;
  const k = leaf / 9;
  const twigPts = [tx, y + radius * 0.6, 0, tx + 4 * k, y + 5 * k, -2.5 * k, tx + 7 * k, y + 8.5 * k, -4.5 * k, tx + 8.5 * k, y + 12 * k, -5.2 * k];
  const tg = buildTube(catmullRom(Float32Array.from(twigPts), { samples: 8 }), {
    radius: (u) => radius * (0.42 - 0.28 * u), rings: 30, radial: 10, startCap: 'round', endCap: 'round',
  });
  const twig = new THREE.Mesh(tg, barkMat);
  twig.name = 'twig';
  ctx.outline(twig);
  group.add(twig);
  const leafMat = ctx.ink({ colorNode: leafColorNode('#4c7a33'), svgColor: '#4c7a33', roughness: 0.6, side: THREE.DoubleSide, name: 'leaf' });
  const leafGeo = leafGeometry(leaf, leaf * 0.38);
  const leaves = new THREE.Group();
  leaves.name = 'leaves';
  const spots = [
    [tx + 7.2 * k, y + 8.8 * k, -4.6 * k, 0.2, 0.9, 0.5],
    [tx + 8.6 * k, y + 12.1 * k, -5.2 * k, -0.5, 0.4, 0.2],
    [tx + 3.6 * k, y + 4.6 * k, -2.3 * k, 0.9, -0.6, 0.3],
    [x0 - length * 0.4, y + radius * 0.8, 0.4, 2.4, 0.3, 0.6],
  ];
  for (const [lx, ly, lz, ry, rz, rx] of spots) {
    const m = new THREE.Mesh(leafGeo, leafMat);
    m.position.set(lx, ly, lz);
    m.rotation.set(rx + (r() - 0.5) * 0.2, ry, rz);
    ctx.outline(m, { width: 0.6 });
    leaves.add(m);
  }
  group.add(leaves);
  return {
    group,
    axisY: y,
    radius,
    parts: [
      { id: 'branch', name: 'Branch', object: main, color: '#6a5847', swatches: barkSwatches() },
      { id: 'twig', name: 'Twig', object: twig, color: '#6a5847', swatches: barkSwatches() },
      { id: 'leaves', name: 'Leaves', object: leaves, color: '#4c7a33' },
    ],
    dispose() {
      g.dispose();
      tg.dispose();
      leafGeo.dispose();
      barkMat.dispose();
      leafMat.dispose();
    },
  };
}

/** Lanceolate leaf with a folded midrib: length L, width W (cm); uv x along, y across. */
function leafGeometry(L, W) {
  const nu = 18, nv = 8;
  const pos = [], uvs = [], idx = [];
  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    const half = (W / 2) * Math.sin(Math.PI * Math.pow(u, 0.75)) * (1 - 0.15 * u);
    for (let j = 0; j <= nv; j++) {
      const v = (j / nv) * 2 - 1;
      const z = v * half;
      const fold = Math.abs(v) * half * 0.28;
      const droop = -0.06 * L * u * u;
      pos.push(u * L, fold + droop, z);
      uvs.push(u, v);
    }
  }
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j, b = a + nv + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- prey

/**
 * Pigments of the black rat in its grey-brown agouti form, sampled from
 * Costa Rican photographs (iNaturalist research-grade records): a grey-brown
 * back with dark guard hairs and pale tips, buff-grey flanks, a pale belly,
 * pinkish ears and feet (the ear's darker canal and paler rim are shading
 * within the photographed range), a uniformly dark scaly tail.
 */
const RAT = {
  back: '#6b5f55', flank: '#8b7f72', belly: '#d6ccbd', guard: '#2f2a26', tip: '#a39686', muzzle: '#9a8279',
  skin: '#b39689', earCanal: '#8f6c63', earRimPale: '#c4ada2', nose: '#d4968a', tail: '#7a6a62', tailRing: '#4f443e',
  eye: '#0d0b0a', whisker: '#2a2622', earRim: '#5a463f',
};

/** Body radius, rump (u = 0) → nose (1), × girth: haunches, chest, a slim neck, the pointed muzzle. */
const RAT_PROFILE = [[0, 0.82], [0.1, 0.94], [0.32, 0.97], [0.52, 1.0], [0.64, 0.86], [0.72, 0.7], [0.77, 0.7], [0.84, 0.6], [0.91, 0.4], [0.965, 0.24], [1, 0.12]];

const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Smooth piecewise profile through [u, value] knots. */
function knotsAt(k, u) {
  if (u <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (u <= k[i][0]) return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * smooth01(k[i - 1][0], k[i][0], u);
  }
  return k[k.length - 1][1];
}

/** A thin cupped ear `w` × `h` (cm): an elliptic paraboloid cap standing on its base at the origin along +Y, the hollow facing +Z. */
function earGeometry(w, h, cup) {
  const nr = 8, nphi = 28;
  const pos = [], uvs = [], idx = [];
  for (let i = 0; i <= nr; i++) {
    const r = i / nr;
    for (let j = 0; j <= nphi; j++) {
      const ph = (j / nphi) * TAU;
      pos.push((w / 2) * r * Math.cos(ph), (h / 2) * (1 + r * Math.sin(ph)), cup * r * r);
      uvs.push(r, j / nphi);
    }
  }
  for (let i = 0; i < nr; i++) {
    for (let j = 0; j < nphi; j++) {
      const a = i * (nphi + 1) + j, b = a + nphi + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * The prey of the constriction plate: a black rat, Rattus rattus, at real
 * scale. A large adult — head and body 21 cm, tail 24 cm, hind foot 3.6 cm,
 * ear 2.4 cm (means of 18.3, 21.7, 3.6 and 2.4 cm for rats from Turkey and
 * Cyprus in Hadjisterkotis et al. 2020, Table 3). Rats are on the béquer's
 * menu in Costa Rica (Solórzano &
 * Sasa 2024) and the black rat is a recorded prey of the species
 * (Aguilar-López & Tapia-Ramírez 2025, southern Mexico). A pointed muzzle,
 * prominent dark eyes, large thin ears that reach the eye when folded
 * forward, whiskers in five rows a side (Towal et al. 2011), four fingers
 * and five toes (Myers 2001), and a scaly, uniformly dark tail longer than
 * head and body (UC IPM Pest Notes: Rats). It lies along +X (nose at +X),
 * its body axis at height `axisY`; the tail lies on the paper. Fur shading
 * runs along the hair, not round the body.
 *
 * @returns {{ group, axisY: number, radius: number, length: number, shoulderX: number, hipX: number,
 *   radiusAt(x:number):number, spineYAt(x:number):number,
 *   bite: { centre: number[], along: number[], up: number[], side: number[], radius: number }, setAxisY(y:number):void,
 *   squeeze(k:number):void, parts: object[], dispose():void }}
 *   `bite` is the neck's centre and local frame (root coordinates), used to fit
 *   both jaws around it;
 *   `squeeze(k)` flattens the chest and belly towards the belly line (k = 1: at rest).
 */
export function buildPrey(ctx, { axisY = 10, hb = 21, tailLen = 24, girth = 2.7 } = {}) {
  const group = new THREE.Group();
  group.name = 'prey';
  group.position.y = axisY;
  const geos = [], mats = [], lines = [];
  const C = colorOf;
  const half = hb / 2;

  // ---- body and head: one tube along a gently arched spine, rump (−X) → nose (+X)
  const spinePts = [-half, 0.25, 0, -half * 0.6, 0.7, 0, -half * 0.1, 0.55, 0, half * 0.32, 0.25, 0, half * 0.56, 0.12, 0, half * 0.72, 0.28, 0, half * 0.88, 0.05, 0, half, -0.38, 0];
  const axisPts = catmullRom(Float32Array.from(spinePts), { samples: 10 });
  const axis = new Polyline(axisPts.length / 3).set(axisPts);
  const rAt = (u) => girth * knotsAt(RAT_PROFILE, u);
  const RINGS = 96, RADIAL = 28;
  const bodyGeo = buildTube(axisPts, {
    radius: rAt, rings: RINGS, radial: RADIAL,
    section: makeSection({ width: 1, top: 1, bottom: 0.9, pTop: 2.15, pBottom: 2 }, RADIAL),
    startCap: 'round', endCap: 'round',
  });
  geos.push(bodyGeo);

  // the body's frame at fraction u (tangent T, dorsal U, lateral S towards +Z)
  const p3 = new Float32Array(3), t3 = new Float32Array(3);
  const T = new THREE.Vector3(), U = new THREE.Vector3(), S = new THREE.Vector3();
  const frameAt = (u) => {
    axis.sample(u * axis.length, p3, 0, t3, 0);
    T.set(t3[0], t3[1], t3[2]);
    U.set(0, 1, 0).addScaledVector(T, -T.y).normalize();
    S.crossVectors(T, U);
  };
  /** A point `up` and `side` local radii from the axis at fraction u, `fwd` cm along it. */
  const at = (u, up, side, fwd = 0, out = new THREE.Vector3()) => {
    frameAt(u);
    const r = rAt(u);
    return out.set(p3[0], p3[1], p3[2]).addScaledVector(U, up * r).addScaledVector(S, side * r).addScaledVector(T, fwd);
  };
  const uOfX = (x) => Math.min(1, Math.max(0, (x + half) / hb));

  // fur: grey-brown back, buff-grey flanks, pale belly; dark guard hairs and
  // pale tips streaked along the hair; a greyer, pinker muzzle
  const Lb = axis.length;
  const furNode = Fn(() => {
    const s = uv().x, lat = uv().y, al = abs(lat);
    const ven = smoothstep(0.6, 0.8, al);
    const furred = float(1).sub(ven);
    let col = mix(C(RAT.back), C(RAT.flank), smoothstep(0.28, 0.52, al));
    col = mix(col, C(RAT.belly), ven);
    col = mix(col, C(RAT.guard), smoothstep(0.18, 0.62, mx_noise_float(vec3(s.mul(0.5), lat.mul(26), float(3)))).mul(furred).mul(0.6));
    col = mix(col, C(RAT.tip), smoothstep(0.3, 0.7, mx_noise_float(vec3(s.mul(0.9), lat.mul(34), float(11)))).mul(furred).mul(0.28));
    return mix(col, C(RAT.muzzle), smoothstep(Lb * 0.9, Lb * 0.99, s).mul(0.7));
  })();
  const furMat = ctx.ink({ colorNode: furNode, svgColor: RAT.back, roughness: 0.92, hatchCoord: uv().y.mul(14), name: 'rat-fur' });
  mats.push(furMat);
  const fur = new THREE.Group();
  fur.name = 'rat-fur';
  group.add(fur);
  const torso = new THREE.Mesh(bodyGeo, furMat);
  torso.name = 'rat-body';
  ctx.outline(torso, { width: 0.8 });
  fur.add(torso);

  // ---- eyes: dark glossy beads standing out of the fur
  const eyeMat = ctx.ink({ color: RAT.eye, roughness: 0.12, hatch: 0, name: 'rat-eye' });
  mats.push(eyeMat);
  const eyeGeo = new THREE.SphereGeometry(0.34, 18, 12);
  geos.push(eyeGeo);
  const eyes = new THREE.Group();
  eyes.name = 'rat-eyes';
  for (const sgn of [1, -1]) {
    const e = new THREE.Mesh(eyeGeo, eyeMat);
    e.name = 'rat-eye';
    at(0.865, 0.5, 0.76 * sgn, 0, e.position);
    eyes.add(e);
  }
  group.add(eyes);

  // ---- skin: ears, nose and feet, thin and sparsely haired
  const skinMat = ctx.ink({ color: RAT.skin, roughness: 0.6, hatch: 0.5, side: THREE.DoubleSide, name: 'rat-skin' });
  const noseMat = ctx.ink({ color: RAT.nose, roughness: 0.35, hatch: 0.3, name: 'rat-nose' });
  mats.push(skinMat, noseMat);
  const skin = new THREE.Group();
  skin.name = 'rat-skin';
  group.add(skin);

  // the ears are laid back, as a frightened rat holds them: the near one
  // swept back and up along the side of the head, its hollow facing out; the
  // far one pressed flat under the snake's jaws. No hull outline on a single
  // sheet: an ink line runs round the rim instead
  const EAR_W = 2.1, EAR_H = 2.4, EAR_CUP = 0.75;
  const earGeo = earGeometry(EAR_W, EAR_H, EAR_CUP);
  geos.push(earGeo);
  // darker and pinker towards the ear canal at the base, a paler rim
  const earMat = ctx.ink({
    colorNode: Fn(() => {
      const r = uv().x, ph = uv().y.mul(TAU);
      const q = vec2(r.mul(cos(ph)), r.mul(sin(ph)));
      const col = mix(C(RAT.earCanal), C(RAT.skin), smoothstep(0.12, 0.85, length(q.sub(vec2(0, -0.8)))));
      return mix(col, C(RAT.earRimPale), smoothstep(0.82, 1.0, r).mul(0.5));
    })(),
    svgColor: RAT.skin, roughness: 0.6, hatch: 0.5, hatchCoord: uv().y.mul(18), side: THREE.DoubleSide, name: 'rat-ear',
  });
  mats.push(earMat);
  const eX = new THREE.Vector3(), eY = new THREE.Vector3(), eZ = new THREE.Vector3(), mB = new THREE.Matrix4();
  for (const sgn of [1, -1]) {
    const ear = new THREE.Mesh(earGeo, earMat);
    ear.name = 'rat-ear';
    if (sgn > 0) {
      at(0.8, 0.86, 0.78, 0, ear.position);
      eZ.set(0.5, 0.42, 0.76).normalize();
      eY.set(-1, 0.7, 0.3);
    } else {
      at(0.79, 0.78, -0.3, 0, ear.position);
      eZ.set(0.2, 0.9, -0.38).normalize();
      eY.set(-1, 0.22, -0.18);
    }
    eY.addScaledVector(eZ, -eY.dot(eZ)).normalize();
    eX.crossVectors(eY, eZ);
    ear.quaternion.setFromRotationMatrix(mB.makeBasis(eX, eY, eZ));
    ear.updateMatrix();
    skin.add(ear);
    const rim = [];
    for (let j = 0; j <= 32; j++) {
      const ph = (j / 32) * TAU;
      rim.push(new THREE.Vector3((EAR_W / 2) * Math.cos(ph), (EAR_H / 2) * (1 + Math.sin(ph)), EAR_CUP).applyMatrix4(ear.matrix));
    }
    const l = ctx.inkLine(rim, { width: 0.7, color: RAT.earRim, name: 'rat-ear-rim', fit: false });
    lines.push(l);
    skin.add(l);
  }
  const noseGeo = new THREE.SphereGeometry(0.3, 14, 10);
  geos.push(noseGeo);
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.name = 'rat-nose';
  at(1, 0, 0, 0.02, nose.position);
  nose.scale.set(0.9, 0.8, 1.1);
  skin.add(nose);

  // ---- limbs: furred upper segments, pinkish feet; four fingers on the
  // forefoot (the thumb is a nub), five toes on the long hind foot
  const tube = (pts, r0, r1, mat, parent, name, outline, list = geos) => {
    const flat = Float32Array.from(pts.flatMap((p) => [p.x, p.y, p.z]));
    const g = buildTube(pts.length > 2 ? catmullRom(flat, { samples: 6 }) : flat, {
      radius: (u) => r0 + (r1 - r0) * u, rings: 12, radial: 10, startCap: 'round', endCap: 'round',
    });
    list.push(g);
    const m = new THREE.Mesh(g, mat);
    m.name = name;
    if (outline) ctx.outline(m, { width: outline });
    parent.add(m);
    return m;
  };
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const sgn of [1, -1]) {
    // forelimb: the upper arm runs forward under the chest, the forearm
    // reaches below the chin, the paw grips with curled fingers
    const sh = at(0.64, -0.35, 0.55 * sgn);
    const el = at(0.7, -1.05, 0.62 * sgn);
    const wr = at(0.78, -1.45, 0.5 * sgn);
    frameAt(0.78);
    const palmC = wr.clone().addScaledVector(T, 0.42).addScaledVector(U, -0.12);
    // the forearm runs on into the palm, so the wrist shows no cut
    tube([sh, el, wr, palmC], 0.62, 0.3, furMat, fur, 'rat-forelimb', 0.5);
    const palm = new THREE.Mesh(noseGeo, skinMat);
    palm.name = 'rat-forefoot';
    palm.position.copy(palmC);
    palm.scale.set(1.45, 0.62, 1.2);
    skin.add(palm);
    for (let i = 0; i < 4; i++) {
      const a = (i - 1.5) * 0.3;
      const base = palmC.clone().addScaledVector(T, 0.3).addScaledVector(S, (i - 1.5) * 0.17 * sgn);
      const dir = v(0, 0, 0).addScaledVector(T, Math.cos(a)).addScaledVector(S, Math.sin(a) * sgn);
      const mid = base.clone().addScaledVector(dir, 0.32).addScaledVector(U, -0.08);
      const tip = mid.clone().addScaledVector(dir, 0.18).addScaledVector(U, -0.24);
      tube([base, mid, tip], 0.085, 0.05, skinMat, skin, 'rat-finger', 0);
    }
  }
  // hind limbs: the thigh runs back under the haunch and leaves the body at
  // the rump; the shank drops to the heel. The near foot is braced flat on
  // the paper, the far one hangs toes-down (rebuilt with the body's height)
  const hindFur = new THREE.Group(), hindSkin = new THREE.Group();
  hindFur.name = hindSkin.name = 'rat-hind-limbs';
  fur.add(hindFur);
  skin.add(hindSkin);
  const hindGeos = [];
  const hindLimbs = () => {
    for (const grp of [hindFur, hindSkin]) {
      for (const m of [...grp.children]) {
        m.userData.outline?.material.dispose();
        grp.remove(m);
      }
    }
    hindGeos.splice(0).forEach((g) => g.dispose());
    const g0 = -axisY;
    for (const sgn of [1, -1]) {
      const hip = at(0.15, -0.45, 0.55 * sgn);
      const thigh = at(0.07, -0.55, 0.45 * sgn);
      const knee = at(0.0, -0.95, sgn > 0 ? 0.6 : 0.12, -0.6);
      const heel = v(knee.x - 0.9, g0 + (sgn > 0 ? 0.42 : 3.9), knee.z + (sgn > 0 ? 0.35 : 0.25));
      tube([hip, thigh, knee, heel], 0.95, 0.42, furMat, hindFur, 'rat-hindlimb', 0.5, hindGeos);
      const footDir = (sgn > 0 ? v(1, 0, 0.12) : v(0.4, -0.9, 0.08)).normalize();
      const ball = heel.clone().addScaledVector(footDir, 3.6 * 0.72);
      tube([heel, heel.clone().lerp(ball, 0.5).add(v(0, 0.06, 0)), ball], 0.36, 0.4, skinMat, hindSkin, 'rat-hindfoot', 0.5, hindGeos);
      for (let i = 0; i < 5; i++) {
        const base = ball.clone().add(v(0, 0, (i - 2) * 0.17));
        const dir = footDir.clone().add(v(0, 0, (i - 2) * 0.2)).normalize();
        const len = i === 0 || i === 4 ? 0.6 : 0.95;
        const mid = base.clone().addScaledVector(dir, len * 0.55);
        const tip = base.clone().addScaledVector(dir, len);
        if (sgn > 0) {
          mid.y = g0 + 0.12; // claws on the paper
          tip.y = g0 + 0.1;
        }
        tube([base, mid, tip], 0.09, 0.05, skinMat, hindSkin, 'rat-toe', 0, hindGeos);
      }
    }
  };
  hindLimbs();

  // ---- whiskers: about 30 a side in five rows (A–E) in life, shorter towards
  // the nose (Towal et al. 2011); 15 drawn a side, 5 rows × 3 columns
  const wr = rng(23);
  const whiskers = new THREE.Group();
  whiskers.name = 'rat-whiskers';
  for (const sgn of [1, -1]) {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        const u = 0.928 + col * 0.016;
        const base = at(u, 0.42 - row * 0.2, 0.78 * sgn);
        const len = (4.5 - col * 0.95) * (row < 4 ? 1 : 0.85) + (wr() - 0.5) * 0.4;
        const back = 0.35 + col * 0.1 + wr() * 0.08, pitch = 0.3 - row * 0.15;
        const dir = v(-Math.sin(back), Math.sin(pitch), sgn * Math.cos(back)).normalize();
        const bend = v(-1, -0.35, 0).normalize();
        const pts = [];
        for (let k = 0; k <= 10; k++) {
          const t = k / 10;
          pts.push(base.clone().addScaledVector(dir, t * len).addScaledVector(bend, 0.16 * len * t * t));
        }
        const l = ctx.inkLine(pts, { width: 0.65, color: RAT.whisker, name: 'rat-whisker', fit: false });
        lines.push(l);
        whiskers.add(l);
      }
    }
  }
  group.add(whiskers);

  // ---- tail: from the rump down to the paper and on along it in a loose S,
  // `tailLen` long from the rump, resting on the paper (rebuilt when the
  // coils set the body's height, setAxisY)
  const tailR = (u) => 0.36 * (1 - 0.78 * u);
  const TAIL_N = 160;
  const tailPts = new Float32Array(TAIL_N * 3);
  const tailGeometry = () => {
    const g0 = -axisY; // the paper, in the group's frame
    const tailCtrl = Float32Array.from([
      -half + 0.6, -0.2, 0, -half - 0.9, -1.2, 0.25, -half - 2.1, g0 * 0.48, 0.9, -half - 3.1, g0 + 0.5, 2.2,
      -half - 5.6, g0, 4.6, -half - 8.6, g0, 7.6, -half - 8.2, g0, 11.4, -half - 5.4, g0, 14.4, -half - 2.6, g0, 17.6, -half - 0.6, g0, 21.4,
    ]);
    const all = catmullRom(tailCtrl, { samples: 14 });
    const line = new Polyline(all.length / 3).set(all);
    // the rump hides the first 0.6 cm
    line.resample(tailPts, TAIL_N, 0, Math.min(line.length, tailLen + 0.6));
    for (let k = 0; k < TAIL_N; k++) tailPts[k * 3 + 1] = Math.max(tailPts[k * 3 + 1], g0 + tailR(k / (TAIL_N - 1)));
    return buildTube(tailPts, { radius: tailR, rings: 140, radial: 10, startCap: 'round', endCap: 'round' });
  };
  let tailGeo = tailGeometry();
  const tailNode = Fn(() => {
    // ring scales about every 2.5 mm, fading where they would alias
    const q = uv().x.mul(4);
    const ring = smoothstep(0.78, 0.95, fract(q)).mul(float(1).sub(smoothstep(0.25, 0.6, fwidth(q))));
    return mix(C(RAT.tail), C(RAT.tailRing), ring.mul(0.45));
  })();
  const tailMat = ctx.ink({ colorNode: tailNode, svgColor: RAT.tail, roughness: 0.55, hatchCoord: uv().x.mul(4), name: 'rat-tail' });
  mats.push(tailMat);
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.name = 'rat-tail';
  ctx.outline(tail, { width: 0.6 });
  group.add(tail);

  // ---- the coils' squeeze: the chest, belly and rump under the loops
  // flatten towards the belly line, the head keeps its shape. Positions are
  // rewritten in place only when the squeeze changes (the normals barely move).
  const pos = bodyGeo.attributes.position;
  const rest = Float32Array.from(pos.array);
  const vpr = RADIAL + 1;
  const ringW = new Float32Array(RINGS), ringY = new Float32Array(RINGS), ringZ = new Float32Array(RINGS);
  for (let i = 0; i < RINGS; i++) {
    const u = i / (RINGS - 1);
    ringW[i] = smooth01(-0.04, 0.1, u) * (1 - smooth01(0.58, 0.68, u));
    frameAt(u);
    ringY[i] = p3[1] - 0.9 * rAt(u);
    ringZ[i] = p3[2];
  }
  let squeezed = 1;

  // where the snake's jaws close: round the back of the neck, which is a
  // cylinder from u = 0.72 to 0.77 (RAT_PROFILE)
  const BITE_U = 0.745;
  frameAt(BITE_U);
  const bite = {
    centre: [p3[0], p3[1] + axisY, p3[2]],
    along: [T.x, T.y, T.z],
    up: [U.x, U.y, U.z],
    side: [S.x, S.y, S.z],
    radius: rAt(BITE_U),
  };
  return {
    group,
    get axisY() {
      return axisY;
    },
    radius: girth,
    length: hb,
    shoulderX: at(0.66, 0, 0).x,
    hipX: at(0.16, 0, 0).x,
    /** Largest radius of the body at x (cm), for the coils. */
    radiusAt: (x) => rAt(uOfX(x)),
    /** Height of the body's axis at x (cm, root coordinates). */
    spineYAt: (x) => {
      frameAt(uOfX(x));
      return axisY + p3[1];
    },
    bite,
    /** Raise or lower the body (the coils decide its height); the tail and hind feet are re-laid on the paper. */
    setAxisY(y) {
      if (Math.abs(y - axisY) < 1e-4) return;
      bite.centre[1] += y - axisY;
      axisY = y;
      group.position.y = y;
      const old = tailGeo;
      tailGeo = tailGeometry();
      tail.geometry = tailGeo;
      if (tail.userData.outline) tail.userData.outline.geometry = tailGeo;
      old.dispose();
      hindLimbs();
    },
    squeeze(k) {
      if (k === squeezed) return;
      squeezed = k;
      const a = pos.array;
      for (let i = 0; i < RINGS; i++) {
        const f = 1 - (1 - k) * ringW[i];
        for (let j = 0; j < vpr; j++) {
          const o = (i * vpr + j) * 3;
          a[o + 1] = ringY[i] + (rest[o + 1] - ringY[i]) * f;
          a[o + 2] = ringZ[i] + (rest[o + 2] - ringZ[i]) * f;
        }
      }
      pos.needsUpdate = true;
      bodyGeo.computeBoundingBox();
      bodyGeo.computeBoundingSphere();
    },
    parts: [
      {
        id: 'prey-fur', name: 'Black rat — fur', object: fur, color: RAT.back,
        swatches: [{ color: RAT.back, name: 'Grey-brown back' }, { color: RAT.flank, name: 'Buff-grey flanks' }, { color: RAT.belly, name: 'Pale grey belly' }],
      },
      { id: 'prey-skin', name: 'Black rat — ears, nose and feet', object: skin, color: RAT.skin, swatches: [{ color: RAT.skin, name: 'Pinkish ears and feet' }] },
      { id: 'prey-tail', name: 'Black rat — tail', object: tail, color: RAT.tail, swatches: [{ color: RAT.tail, name: 'Dark scaly tail' }] },
      { id: 'prey-eye', name: 'Black rat — eyes', object: eyes, color: RAT.eye },
    ],
    dispose() {
      geos.forEach((g) => g.dispose());
      hindGeos.forEach((g) => g.dispose());
      tailGeo.dispose();
      mats.forEach((m) => m.dispose());
      lines.forEach((l) => l.dispose());
    },
  };
}

// ---------------------------------------------------------------- egg clutch

/**
 * A clutch of leathery eggs piled within `radius` (cm) of the origin.
 * @returns {{ group, radius: number, eggs: THREE.Mesh[], pose(explode:number):void, dispose():void }}
 */
export function buildClutch(ctx, { count = 9, eggLength = 6, color = '#f0eadb', radius = 9 } = {}) {
  const group = new THREE.Group();
  group.name = 'eggs';
  const r = rng(11);
  const geo = poleSphere();
  // cross-contour shading around each egg's long axis (no stacked-coin
  // rings), fading out towards the poles
  const mats = poleFadeMaterials(ctx, { colorNode: eggColorNode(color), svgColor: color, roughness: 0.85, hatch: 0.65, name: 'egg' });
  const ew = eggLength * 0.34, el = eggLength * 0.5;
  const eggs = [];
  const ring = Math.min(count - 1, 6);
  const layout = [];
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * TAU + 0.3;
    layout.push([Math.cos(a) * radius * 0.55, ew * 0.98, Math.sin(a) * radius * 0.55, a + Math.PI / 2 + (r() - 0.5) * 0.6, (r() - 0.5) * 0.3]);
  }
  layout.push([0, ew, 0, 0.7, 0]);
  for (let i = layout.length; i < count; i++) {
    const a = (i / (count - ring)) * TAU;
    layout.push([Math.cos(a) * radius * 0.28, ew * 2.55, Math.sin(a) * radius * 0.28, a + (r() - 0.5), 0.25 * (r() - 0.5)]);
  }
  for (const [x, y, z, ry, rz] of layout.slice(0, count)) {
    const m = new THREE.Mesh(geo, mats);
    m.scale.set(el, ew, ew);
    m.position.set(x, y, z);
    m.rotation.set(0, ry, rz);
    m.userData.base = m.position.clone();
    ctx.outline(m, { width: 0.8 });
    group.add(m);
    eggs.push(m);
  }
  return {
    group,
    radius,
    eggs,
    pose(explode) {
      for (const m of eggs) {
        const b = m.userData.base;
        // lift the clutch into a loose floating cluster above the coil
        m.position.set(b.x * (1 + explode * 0.55), b.y + explode * (eggLength * 2.2 + b.y * 0.9), b.z * (1 + explode * 0.55));
      }
    },
    dispose() {
      geo.dispose();
      for (const m of mats) m.dispose();
    },
  };
}

/**
 * Unit sphere tessellated around X (its poles on ±X, so its latitude rings
 * follow poleRings) with one index group per POLE_FADE step, for a mesh
 * whose material is `poleFadeMaterials(…)`. Both ends' bands of a step share
 * its group: one draw per step.
 * @param {number} [W=28] segments around the X axis
 * @param {number} [H=24] rings from pole to pole
 */
function poleSphere(W = 28, H = 24) {
  const g = new THREE.SphereGeometry(1, W, H);
  g.rotateZ(-Math.PI / 2); // SphereGeometry's poles lie on ±Y
  const src = g.index.array;
  const lists = POLE_FADE.map(() => []);
  for (let iy = 0, o = 0; iy < H; iy++) {
    // a pole's band holds one triangle per segment, the others two
    const n = (iy === 0 || iy === H - 1 ? 3 : 6) * W;
    const deg = (Math.min(iy + 0.5, H - iy - 0.5) / H) * 180;
    const list = lists[POLE_FADE.findIndex(([max]) => deg <= max)];
    for (let i = o; i < o + n; i++) list.push(src[i]);
    o += n;
  }
  const index = new Uint16Array(src.length);
  g.clearGroups();
  let start = 0;
  lists.forEach((list, k) => {
    index.set(list, start);
    g.addGroup(start, list.length, k);
    start += list.length;
  });
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}

/**
 * One ink material per POLE_FADE step (poleRings hatching at `o.hatch` times
 * the step's share), in poleSphere's group order; the last is the full one.
 * @param {object} ctx  FigureContext
 * @param {object} o    ctx.ink options (hatch defaults to 1)
 * @returns {THREE.Material[]}
 */
function poleFadeMaterials(ctx, o) {
  return POLE_FADE.map(([, k], i) => ctx.ink({ ...o, hatch: (o.hatch ?? 1) * k, hatchCoord: poleRings, name: k < 1 ? `${o.name}-pole-${i}` : o.name }));
}

// ---------------------------------------------------------------- small extras

/** Boa cloacal spurs: two small claws beside the vent (posed from the spine each frame). */
export function buildSpurs(ctx, size) {
  const group = new THREE.Group();
  group.name = 'pelvic-spurs';
  const mat = ctx.ink({ color: '#3a3027', roughness: 0.4, svgColor: '#3a3027', name: 'spur' });
  const pts = [0, 0, 0, size * 0.5, -size * 0.1, 0, size, -size * 0.35, 0];
  const g = buildTube(pts, { radius: (u) => size * 0.22 * (1 - u) + size * 0.02, rings: 10, radial: 8, startCap: 'round', endCap: 'point' });
  const spurs = [1, -1].map(() => {
    const m = new THREE.Mesh(g, mat);
    ctx.outline(m, { width: 0.5 });
    group.add(m);
    return m;
  });
  return {
    group,
    spurs,
    size,
    dispose() {
      g.dispose();
      mat.dispose();
    },
  };
}

/** Bushmaster tail tip: rows of small spiny scales ending in a terminal spine. */
export function buildTailSpines(ctx, count, size) {
  const mat = ctx.ink({ color: '#2b2018', roughness: 0.5, svgColor: '#2b2018', name: 'tail-spine' });
  const g = new THREE.ConeGeometry(size * 0.28, size, 6, 1);
  g.translate(0, size * 0.5, 0);
  const mesh = new THREE.InstancedMesh(g, mat, count + 1);
  mesh.name = 'tail-spines';
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return {
    mesh,
    count,
    dispose() {
      mesh.dispose();
      g.dispose();
      mat.dispose();
    },
  };
}

