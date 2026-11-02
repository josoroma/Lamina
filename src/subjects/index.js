// Subject registry: figure type → lazy module loader. Each module exports
// `createFigure(params, ctx)` (see src/engine/figures/contract.js). Loaders
// are dynamic imports so a book only downloads the subjects it shows.
export const figureLoaders = {
  demo: () => import('./demo/index.js'),
  snake: () => import('./snakes/index.js'),
  flower: () => import('./flowers/index.js'),
  skull: () => import('./skulls/index.js'),
};

export async function loadFigureFactory(type) {
  const load = figureLoaders[type];
  if (!load) throw new Error(`Unknown figure type "${type}". Register it in src/subjects/index.js`);
  const mod = await load();
  if (typeof mod.createFigure !== 'function') throw new Error(`Subject "${type}" must export createFigure(params, ctx)`);
  return mod.createFigure;
}
