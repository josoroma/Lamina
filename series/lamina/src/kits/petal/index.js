// Petal kit — parametric botany for living plates.
//
// Surfaces (all closed thin shells or tubes, rebuildable in place):
//   BladeSurface    petals, sepals, bracts, leaves, orchid lips
//   CorollaSurface  fused trumpets / star-mouthed tubes with lobed limbs
//   PolarLeaf       palmately lobed leaves and lily pads (outline around the junction)
//   TubeSurface     stems, peduncles, filaments, styles, tendrils, bills
//   createLathe     receptacles, ovaries, buds, pseudobulbs (ridged, elliptical)
// Arrangement: orient, whorl, phyllotaxis (golden angle), mountOnHinge, loop,
//   spreadAxes (crowded clusters whose flowers must clear each other).
// Shading (TSL): bladeColor, translucency, fuzz, barkColor, veinHatch,
//   ringHatch, bladeMaterial, corollaMaterial.
// Creatures: createHummingbird (stylised hermit with motion-blurred wings).
// Water: createPond (TSL ripples, refraction-like tint, seamless 5 s loop).
export { PROFILES, resolveProfile, monotoneCubic } from './profiles.js';
export { BladeSurface, BLADE_DEFAULTS, createBladeGeometry } from './blade.js';
export { CorollaSurface, COROLLA_DEFAULTS } from './corolla.js';
export { PolarLeaf, lobedOutline } from './leaf.js';
export { TubeSurface, createLathe, helixPath, quadPath, cubicPath, pathFn } from './tube.js';
export { orient, whorl, phyllotaxis, mountOnHinge, loop, smoother, spreadAxes, GOLDEN_ANGLE } from './arrange.js';
export {
  bladeColor, translucency, fuzz, barkColor, veinHatch, ringHatch, bladeMaterial, corollaMaterial, lineMask, KEY_DIR,
} from './shading.js';
export { accumulateNormals, ringGridIndex } from './normals.js';
export { createHummingbird, HERMIT_COLORS } from './hummingbird.js';
export { createPond, underwaterWobble } from './water.js';
