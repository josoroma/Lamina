// Flowers subject — "Flores", living plates of Costa Rican flowers.
//
// createFigure(params, ctx) implements the Figure contract
// (src/engine/figures/contract.js) for six species, each a module that
// describes its botany with the petal kit (src/kits/petal) and returns a
// pose(t, state) function. This file owns the shared contract plumbing:
// layers, labels, parts, explode, the fit box over the whole loop, and
// disposal.
//
// params:
//   species   'guarianthe-skinneri' | 'heliconia-wagneriana' | 'passiflora-vitifolia'
//             | 'palicourea-elata' | 'handroanthus-ochraceus' | 'nymphaea-ampla'
//             (default 'guarianthe-skinneri')
import { FigureKit } from './common.js';
import { FIGURE_DURATION } from '../../engine/figures/contract.js';

const SPECIES = {
  'guarianthe-skinneri': () => import('./guarianthe.js'),
  'heliconia-wagneriana': () => import('./heliconia.js'),
  'passiflora-vitifolia': () => import('./passiflora.js'),
  'palicourea-elata': () => import('./palicourea.js'),
  'handroanthus-ochraceus': () => import('./handroanthus.js'),
  'nymphaea-ampla': () => import('./nymphaea.js'),
};

/** Species ids this subject can draw. */
export const FLOWER_SPECIES = Object.keys(SPECIES);

/**
 * @param {{ species?: string }} [params]
 * @param {object} ctx FigureContext from src/kits/ink
 * @returns {Promise<import('../../engine/figures/contract.js').Figure>}
 */
export async function createFigure(params = {}, ctx) {
  const species = params.species ?? 'guarianthe-skinneri';
  const load = SPECIES[species];
  if (!load) throw new Error(`[flowers] unknown species "${species}" (expected one of ${FLOWER_SPECIES.join(', ')})`);
  const mod = await load();
  const K = new FigureKit(ctx, species);
  const spec = mod.build(params, ctx, K);

  const state = { explode: 0, reducedMotion: false };
  let lastT = 0;
  // Fit box over the whole loop (assembled), then rest at t = 0.
  const bounds = spec.bounds ?? K.measure((t) => spec.pose(t, state), [0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.6]);
  spec.pose(0, state);

  return {
    root: K.root,
    title: spec.title,
    duration: FIGURE_DURATION,
    layers: K.layers,
    labels: K.labels,
    parts: K.parts,
    beats: spec.beats,
    bounds,
    update(t, dt, st) {
      lastT = t;
      if (st) {
        state.explode = st.explode ?? state.explode;
        state.reducedMotion = !!st.reducedMotion;
        state.layers = st.layers;
      }
      spec.pose(t, state);
    },
    setLayer(id, visible) {
      K.setLayer(id, visible);
      spec.onLayer?.(id, visible);
    },
    setExplode(a) {
      state.explode = Math.max(0, Math.min(1, a));
      spec.pose(lastT, state);
    },
    dispose() {
      spec.dispose?.();
      K.dispose();
    },
  };
}
