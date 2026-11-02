// Tube kit: sampled curves, guided spine frames and CPU-swept tubes.
// Used by the snakes subject (bodies, props, ducts) and by any subject that
// needs a tube which bends every frame (tendrils, tails, vines).
export { catmullRom, catmullRomCount, Polyline, smoothPolyline } from './curve.js';
export { Spine } from './spine.js';
export { makeSection, SweptTube, buildTube } from './sweep.js';
