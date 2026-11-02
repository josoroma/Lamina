// Model registry for the SDF mesher. Any subject can ship SDF models by adding
// `src/subjects/<set>/sdf-models.js` that exports `models = { name: (params) =>
// ModelDef }`. Vite's import.meta.glob turns that convention into lazy chunks,
// so the generic mesher worker can import models BY NAME without the kit
// depending on any subject (and production builds bundle them correctly).
//
// ModelDef: { sdf, bounds?, cell?, label?, labels?, lines?, lipschitz? }

const sets = import.meta.glob('../../subjects/*/sdf-models.js');

/**
 * Load a model set (e.g. 'skulls') → its `models` map.
 * @param {string} set
 * @returns {Promise<Record<string, (params: object) => object>>}
 */
export async function loadModelSet(set) {
  const key = `../../subjects/${set}/sdf-models.js`;
  const load = sets[key];
  if (!load) throw new Error(`SDF model set "${set}" not found (expected src/subjects/${set}/sdf-models.js)`);
  const mod = await load();
  if (!mod.models) throw new Error(`SDF model set "${set}" must export \`models\``);
  return mod.models;
}

/**
 * Build a model definition by set + name.
 * @returns {Promise<object>} ModelDef
 */
export async function buildModel(set, name, params = {}) {
  const models = await loadModelSet(set);
  const factory = models[name];
  if (typeof factory !== 'function') throw new Error(`SDF model "${set}/${name}" is not registered`);
  return factory(params);
}
