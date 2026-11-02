// SDF model registry for the skulls subject. The generic mesher worker
// (src/kits/sdf/mesher.worker.js) discovers this file by convention and
// builds models by name, so meshing never blocks the main thread.
import { humanCranium, humanMandible, humanTeeth, humanPlanes } from './human.js';
import { jaguarCranium, jaguarMandible, jaguarTeeth, jaguarPlanes } from './jaguar.js';

export const models = {
  'human-cranium': humanCranium,
  'human-mandible': humanMandible,
  'human-teeth': humanTeeth,
  'human-planes': humanPlanes,
  'jaguar-cranium': jaguarCranium,
  'jaguar-mandible': jaguarMandible,
  'jaguar-teeth': jaguarTeeth,
  'jaguar-planes': jaguarPlanes,
};
