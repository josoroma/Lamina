// Mesher worker: builds a registered SDF model by name and meshes it off the
// main thread, so page turns never stutter while a skull is being carved.
// Protocol (postMessage):
//   in : { id, set, model, params, cell, options }
//   out: { id, ok: true, result } | { id, ok: false, error }
// Typed arrays in `result` are transferred, not copied.
import { meshSDF, transferables } from './mesher.js';
import { buildModel } from './registry.js';

self.onmessage = async (e) => {
  const { id, set, model, params, cell, options = {} } = e.data ?? {};
  try {
    const t0 = performance.now();
    const def = await buildModel(set, model, params);
    const t1 = performance.now();
    const result = meshSDF(def.sdf, {
      bounds: def.bounds,
      lipschitz: def.lipschitz,
      label: options.regions === false ? undefined : def.label,
      lines: options.lines ? pick(def.lines, options.lines) : undefined,
      full: options.full,
      project: options.project,
      ao: options.ao ?? def.ao,
      symmetricX: options.symmetricX ?? def.symmetricX,
      bvh: options.bvh,
      cell,
    });
    result.stats.buildMs = +(t1 - t0).toFixed(1);
    result.stats.where = 'worker';
    self.postMessage({ id, ok: true, result }, transferables(result));
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err?.stack ?? err) });
  }
};

function pick(lines = {}, names) {
  const out = {};
  for (const n of names) if (lines[n]) out[n] = lines[n];
  return Object.keys(out).length ? out : undefined;
}
