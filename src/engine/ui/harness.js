// UI harness entry (ui.html).
//
// Default: the overlay over a static mock spread (harness-mock.js) for fast
// visual review without WebGPU. `ui.html?mode=3d` runs the same UI over the
// real engine instead (harness3d.js), to check pointer pass-through, live
// label tracking and the WebGL 2 fallback (`&gl=webgl`). `&lang=es` starts
// in Spanish (the dictionaries load before the UI is built, as in the app).
import { isLang, loadLang, setLang } from '../../i18n/index.js';

const q = new URLSearchParams(location.search);
const lang = q.get('lang');
if (isLang(lang)) {
  await loadLang(lang);
  setLang(lang);
}
const mode = q.get('mode');
if (mode === '3d') await import('./harness3d.js');
else await import('./harness-mock.js');
