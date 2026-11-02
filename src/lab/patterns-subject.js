// Lab subject "patterns": a specimen tray that shows every pattern factory of
// src/kits/patterns on a sphere, a cylinder or a leaf, so the kit can be
// reviewed (and exported to SVG) in both styles and on both backends. It is a
// complete Figure (layers, labels, parts with explode vectors, ink lines,
// seamless 5 s loop) and doubles as a second reference subject.
import * as THREE from 'three/webgpu';
import { uv, positionLocal, vec2, vec3 } from 'three/tsl';
import { FIGURE_DURATION } from '../engine/figures/contract.js';
import { scales, bands, blotches, speckle, veins, stripes, gradient, rosettes } from '../kits/patterns/index.js';

/** Leaf blade (u across, v base→tip) with a gentle cup and arch. */
function leafGeometry(length = 8, width = 3.6) {
  const g = new THREE.PlaneGeometry(1, 1, 24, 48);
  const pos = g.attributes.position;
  const uvA = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = uvA.getX(i), v = uvA.getY(i);
    const half = Math.sin(Math.PI * Math.pow(v, 0.8)) * (1 - 0.15 * v) * width * 0.5;
    const x = (u - 0.5) * 2 * half;
    const z = -v * length + length * 0.5;
    const y = 0.35 + Math.sin(v * Math.PI) * 1.4 + (x * x) * 0.08; // arch + cup
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * @param {object} params  { only?: string, delay?: number } one pattern only; delay (ms)
 *        simulates a slow async build so the host's placeholder can be reviewed
 * @param {object} ctx     FigureContext
 */
export async function createFigure(params = {}, ctx) {
  if (params.delay) await new Promise((r) => setTimeout(r, params.delay));
  const root = new THREE.Group();
  root.name = 'pattern-tray';
  const guides = new THREE.Group();
  guides.name = 'guides';
  root.add(guides);

  const specs = [
    { id: 'scales', shape: 'cylinder', color: '#8a7a4c',
      node: () => scales({ coord: uv(), rows: 26, cols: 22, keel: 0.7, edge: 0.32, base: bands(uv().y.mul(3.0), [[0, '#8f7f4f'], [0.55, '#5b4b2c']], { soft: 0.03 }) }) },
    { id: 'bands', shape: 'cylinder', color: '#c8342b',
      node: () => bands(uv().y.mul(4.0), [[0, '#c8342b'], [0.42, '#f1d64a'], [0.5, '#151412'], [0.86, '#f1d64a'], [0.94, '#c8342b']], { jitter: 0.03 }) },
    { id: 'blotches', shape: 'sphere', color: '#b49c72',
      node: () => blotches({ coord: positionLocal, scale: 0.42, coverage: 0.5, base: '#c9b48a', color: '#7b5a35', rim: '#2f2216', rimWidth: 0.07 }) },
    { id: 'speckle', shape: 'egg', color: '#e8dcc0',
      node: () => speckle({ coord: positionLocal, scale: 2.2, density: 0.6, size: 0.3, base: '#ebdfc4', color: '#5a2f2a' }) },
    { id: 'veins', shape: 'leaf', color: '#4f7a3a',
      node: () => veins({ coord: uv(), count: 8, angle: 1.2, base: '#4d7a3a', color: '#b3cc86' }) },
    { id: 'stripes', shape: 'sphere', color: '#e2c27a',
      node: () => stripes({ coord: vec2(uv().x.mul(2.0), uv().y), freq: 7, width: 0.36, angle: Math.PI / 2, wave: 0.5, base: '#ecd28c', color: '#5a3b1e' }) },
    { id: 'gradient', shape: 'cone', color: '#b45ba8',
      node: () => gradient(uv().y, [[0.0, '#f7efe0'], [0.45, '#d58ac8'], [1.0, '#6b2a6e']]) },
    { id: 'rosettes', shape: 'sphere', color: '#d9a35a',
      node: () => rosettes({ coord: positionLocal, scale: 0.75 }) },
  ].filter((s) => !params.only || s.id === params.only);

  const cols = Math.min(4, specs.length);
  const gap = 9.5;
  const parts = [];
  const labels = [];
  const items = [];
  specs.forEach((s, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = (col - (cols - 1) / 2) * gap;
    const z = (row - (Math.ceil(specs.length / cols) - 1) / 2) * gap;
    const holder = new THREE.Group();
    holder.position.set(x, 0, z);
    holder.name = `sample-${s.id}`;
    let geo, side = THREE.FrontSide, outlined = true, top = 7;
    if (s.shape === 'sphere') { geo = new THREE.SphereGeometry(3.2, 64, 40).translate(0, 3.2, 0); top = 6.4; }
    else if (s.shape === 'egg') { geo = new THREE.SphereGeometry(2.8, 64, 40).scale(1, 1.3, 1).translate(0, 3.64, 0); top = 7.3; }
    else if (s.shape === 'cylinder') { geo = new THREE.CylinderGeometry(2.3, 2.3, 7, 64, 24).translate(0, 3.5, 0); }
    else if (s.shape === 'cone') { geo = new THREE.CylinderGeometry(0.9, 3.0, 7, 64, 24).translate(0, 3.5, 0); }
    else { geo = leafGeometry(); side = THREE.DoubleSide; outlined = false; top = 2.2; }
    const mat = ctx.ink({ colorNode: s.node(), svgColor: s.color, roughness: 0.62, side, name: s.id });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = s.id;
    if (outlined) ctx.outline(mesh);
    holder.add(mesh);
    root.add(holder);

    // dashed construction ring on the paper around each specimen
    const ring = [];
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * Math.PI * 2;
      ring.push([x + Math.cos(a) * 4.1, 0.05, z + Math.sin(a) * 4.1]);
    }
    guides.add(ctx.inkLine(ring, { closed: true, dashed: true, width: 1, name: `${s.id}-ring` }));
    if (s.shape === 'leaf') {
      // the blade's margin and midrib drawn as ink lines (a sheet has no hull)
      const pos = geo.attributes.position, uvA = geo.attributes.uv;
      const left = [], right = [], mid = [];
      for (let k = 0; k < pos.count; k++) {
        const u = uvA.getX(k);
        const p = [pos.getX(k), pos.getY(k) + 0.02, pos.getZ(k)];
        if (u === 0) left.push([uvA.getY(k), p]);
        if (u === 1) right.push([uvA.getY(k), p]);
        if (Math.abs(u - 0.5) < 1e-6) mid.push([uvA.getY(k), p]);
      }
      left.sort((a, b) => a[0] - b[0]);
      right.sort((a, b) => b[0] - a[0]);
      mid.sort((a, b) => a[0] - b[0]);
      const margin = [...left.map((e) => e[1]), ...right.map((e) => e[1])];
      holder.add(ctx.inkLine(margin, { width: 1.2, closed: true, name: 'leaf-margin' }));
      holder.add(ctx.inkLine(mid.map((e) => e[1]), { width: 0.9, name: 'leaf-midrib' }));
    }

    const anchor = new THREE.Object3D();
    anchor.position.set(0, top + 0.6, 0);
    holder.add(anchor);
    labels.push({ id: s.id, text: s.id[0].toUpperCase() + s.id.slice(1), detail: `patterns.${s.id}()`, anchor });
    const layer = s.shape === 'sphere' || s.shape === 'egg' ? 'spheres' : 'solids';
    const out = new THREE.Vector3(x, 0, z);
    if (out.lengthSq() < 1e-6) out.set(0, 0, 1);
    parts.push({ id: s.id, name: `${s.id} (${s.shape})`, object: holder, color: s.color, layer, explode: out.normalize().multiplyScalar(4).setY(1.5) });
    items.push({ holder, mesh, phase: i * 0.37 });
  });

  // instanced pebbles (verifies outlines and hatching on InstancedMesh)
  const pebbleGeo = new THREE.IcosahedronGeometry(0.9, 3);
  const pebbles = new THREE.InstancedMesh(pebbleGeo, ctx.ink({ color: '#9c8f7a', roughness: 0.85, name: 'pebbles' }), 7);
  pebbles.name = 'pebbles';
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * 2.2, 0.55, Math.sin(a) * 1.4);
    dummy.scale.set(1, 0.62 + 0.18 * Math.sin(i * 2.3), 0.9);
    dummy.rotation.set(0, a, 0);
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);
  }
  pebbles.position.set(0, 0, (Math.ceil(specs.length / cols) / 2) * gap + 2.6);
  ctx.outline(pebbles);
  root.add(pebbles);
  parts.push({ id: 'pebbles', name: 'Pebbles (instanced)', object: pebbles, color: '#9c8f7a', layer: 'solids' });

  const layers = [
    { id: 'spheres', label: 'Spheres', visible: true, hint: 'Round specimens (fade test)' },
    { id: 'solids', label: 'Solids', visible: true, hint: 'Cylinders, cone and leaf' },
    { id: 'guides', label: 'Guides', visible: true, hint: 'Dashed ink lines (ctx.inkLine)' },
  ];

  return {
    root,
    title: params.only ? `Pattern — ${params.only}` : 'Pattern specimens',
    duration: FIGURE_DURATION,
    layers,
    labels,
    parts,
    beats: [
      { t: 0, text: 'Every pattern is a TSL colour node, lit and hatched by the ink material.' },
      { t: 2.5, text: 'Specimens turn in a seamless five-second loop.' },
    ],
    update(t) {
      const ph = (t / FIGURE_DURATION) * Math.PI * 2;
      for (const it of items) it.mesh.rotation.y = Math.sin(ph + it.phase) * 0.6;
    },
    setLayer(id, visible) {
      if (id === 'guides') guides.visible = visible;
      for (const p of parts) if (p.layer === id) p.object.visible = visible;
    },
    setExplode() {},
    dispose() {
      root.traverse((o) => {
        if (o.isMesh && !o.userData.isOutline) o.geometry?.dispose?.();
        if (o.userData?.isInkLine) o.dispose?.();
      });
    },
  };
}
