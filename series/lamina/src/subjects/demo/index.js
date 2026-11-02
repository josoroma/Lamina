// Demo figure: a minimal, complete implementation of the Figure contract.
// A seed pod that splits (explode), with an x-ray "seeds" layer, labels and a
// seamless 5-second loop. Copy this file to start a new subject.
import * as THREE from 'three/webgpu';
import { setXray } from '../../kits/ink/index.js';
import { FIGURE_DURATION } from '../../engine/figures/contract.js';

export function createFigure(params = {}, ctx) {
  const root = new THREE.Group();
  root.name = 'demo-pod';
  const podColor = params.color ?? '#7aa95c';

  // two halves of the pod (cm)
  const halves = [];
  for (const side of [-1, 1]) {
    const g = new THREE.SphereGeometry(6, 48, 32, side < 0 ? 0 : Math.PI, Math.PI);
    g.scale(1, 1.25, 1);
    const m = new THREE.Mesh(g, ctx.ink({ color: podColor, roughness: 0.7, side: THREE.DoubleSide })); // open shells: both faces visible
    m.position.y = 8;
    m.name = side < 0 ? 'pod-left' : 'pod-right';
    ctx.outline(m);
    root.add(m);
    halves.push(m);
  }
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.9, 3, 16).translate(0, 1.5, 0),
    ctx.ink({ color: '#5b4a33' })
  );
  ctx.outline(stem);
  root.add(stem);

  const seeds = new THREE.Group();
  seeds.position.y = 8;
  const seedGeo = new THREE.SphereGeometry(1.1, 20, 14);
  const seedMat = ctx.ink({ color: '#d9a441' });
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(seedGeo, seedMat);
    const a = (i / 6) * Math.PI * 2;
    s.position.set(Math.cos(a) * 2.4, Math.sin(i * 1.7) * 1.4, Math.sin(a) * 2.4);
    ctx.outline(s);
    seeds.add(s);
  }
  root.add(seeds);

  const pit = new THREE.Object3D();
  pit.position.set(0, 13.5, 3);
  halves[1].add(pit);
  const seedAnchor = new THREE.Object3D();
  seeds.children[0].add(seedAnchor);

  const layers = [
    { id: 'pod', label: 'Pod', visible: true, hint: 'The protective fruit wall' },
    { id: 'seeds', label: 'Seeds', visible: true, hint: 'X-ray the wall to see the seeds' },
  ];
  const state = { pod: true, seeds: true, explode: 0 };

  return {
    root,
    title: 'Seed pod (demo)',
    duration: FIGURE_DURATION,
    layers,
    labels: [
      { id: 'wall', text: 'Pericarp', detail: 'The fruit wall that protects the seeds.', anchor: pit },
      { id: 'seed', text: 'Seed', detail: 'Six seeds sit on a central axis.', anchor: seedAnchor, layer: 'seeds' },
    ],
    parts: [
      { id: 'pod-left', name: 'Pod (left valve)', object: halves[0], color: podColor },
      { id: 'pod-right', name: 'Pod (right valve)', object: halves[1], color: podColor },
      { id: 'stem', name: 'Stalk', object: stem, color: '#5b4a33' },
      { id: 'seeds', name: 'Seeds', object: seeds, color: '#d9a441', layer: 'seeds' },
    ],
    update(t, dt, st) {
      const ph = (t / FIGURE_DURATION) * Math.PI * 2;
      // seamless: every term is periodic in the 5 s loop
      seeds.rotation.y = ph;
      const breathe = 0.5 - 0.5 * Math.cos(ph);
      const open = Math.max(st?.explode ?? state.explode, breathe * 0.25);
      halves[0].position.x = -open * 7;
      halves[1].position.x = open * 7;
      halves.forEach((h) => (h.rotation.z = Math.sin(ph) * 0.03));
    },
    setLayer(id, visible) {
      state[id] = visible;
      if (id === 'pod') halves.forEach((h) => (h.visible = visible));
      if (id === 'seeds') seeds.visible = visible;
      halves.forEach((h) => setXray(h, state.seeds && !state.pod ? 1 : 0));
    },
    setExplode(a) {
      state.explode = a;
    },
    dispose() {
      root.traverse((o) => {
        o.geometry?.dispose?.();
      });
    },
  };
}
