// UI harness, mock mode (ui.html, the default): the Lámina overlay over a
// static mock of an open book.
//
// It plays the App's part without WebGPU — a flat spread (verso text, recto
// with an SVG eyelash viper on a branch), eight labels whose anchors move with
// a seamless 5-second sway, fake layers and beats — and logs every command
// the UI emits. Use it to review the chrome visually and to exercise the API.
//
// URL switches (all optional):
//   index=5            start spread (0–13; plates are 4–10)
//   open=contents|layers|export|help|reading   open a surface after load
//   card=<labelId>     pin a label's detail card, e.g. card=loreal-pit
//   t=1.7 play=0       clock;  labels=0;  explode=0.4;  layers=skin:0,skeleton:1
//   toast=Text         show a toast;  log=0 hide the command log
//   idle=0             never auto-hide;  rm=1 force reduced motion
//   backend=webgpu|webgl2
//   exportDelay=900    how long a mock export takes (ms; the busy ring shows past 300)
//   lang=es            start in Spanish (harness.js);  langDelay=600  a slow language load (ms)
// window.harness = { ui, state, go, setTime, log, items }.
//
// Language: `ui.html?lang=es` builds the UI in Spanish (harness.js loads the
// dictionaries first) and the mock's own content — page text, labels, layers,
// beats, toasts — switches with it. The top bar's language switch works: the
// mock answers the UI's { type: 'lang' } command like the App (load, set,
// ui.setLang, new texts), with a promise, so the busy state can be reviewed.
// Head labels carry the face marks of the reader (mark: 'ring' with a
// projected radius r, or 'tick') and the head's projected length (headPx:
// a small head shows one or two face labels), body labels the default dot.
import { createUI } from './index.js';
import { getLang, isLang, loadLang, setLang } from '../../i18n/index.js';

const q = new URLSearchParams(location.search);
const DURATION = 5;
const EXPORT_DELAY = Math.max(0, +(q.get('exportDelay') ?? 900) || 0);
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- content
// what the App would hand the UI in each edition (mock texts; the UI's own
// strings come from its dictionaries)
const TEXT = {
  en: {
    subtitle: 'A Living Atlas of Costa Rican Snakes',
    ledes: [
      'Costa Rica’s most medically important snake: a large, nervous pit viper of lowland forests and farms.',
      'A small golden pit viper that waits, perfectly still, among mossy branches, and strikes from its coil.',
      'Rings of red, black and yellow warn predators of a potent neurotoxic venom.',
      'Costa Rica’s only rattlesnake, a pit viper of the dry northwest.',
      'The longest viper in the Americas, and one of the few that lays eggs.',
      'A pelagic sea snake that drifts with ocean slicks along the Pacific coast.',
      'A powerful constrictor, not venomous, that subdues prey by squeezing until circulation stops.',
    ],
    spreads: { cover: 'Front cover', title: 'Title page', contents: 'Contents', howto: 'How to use this book', glossary: 'Glossary', sources: 'Sources & colophon', back: 'Back cover' },
    layers: {
      skin: ['Skin', 'Scales and the golden oropel colouring'],
      skeleton: ['Skeleton', 'Skull, vertebrae and ribs'],
      'eyelash-scales': ['Eyelash scales', 'Raised supraocular scales above the eye'],
    },
    beats: [
      [0, 'Anchored by its prehensile tail, the bocaracá rests in a tight coil.'],
      [1.6, 'The head sways slowly while the tongue samples the air.'],
      [3.2, 'Scent particles are carried to the vomeronasal organ in the roof of the mouth.'],
    ],
    animationTitle: 'Waiting in ambush',
    labels: {
      head: ['Head', 'The broad, triangular head houses the venom glands behind the eyes.'],
      eye: ['Eye', 'The pupil is a vertical slit, as in other pit vipers.'],
      'eyelash-scales': ['Eyelash scales', 'Raised supraocular scales above each eye give the eyelash viper its English name; their function is still debated.'],
      'loreal-pit': ['Loreal pit', 'A heat-sensing pit between eye and nostril lets the snake find warm-blooded prey in darkness.'],
      fangs: ['Fangs', 'Long hollow fangs fold against the roof of the mouth and swing forward as the jaws open.'],
      'ventral-scutes': ['Ventral scutes', 'Broad belly scales grip the bark as the snake moves along branches.'],
      'prehensile-tail': ['Prehensile tail', 'The tail wraps the branch and holds the snake in place while it waits and strikes.'],
      vertebrae: ['Vertebrae', 'Each of the many vertebrae carries a pair of ribs; the backbone flexes along its whole length.'],
    },
    reading: (lede) => `
  <p class="badge">Venomous — dangerous</p>
  <p class="lede">${lede}</p>
  <p>The bocaracá (<em>Bothriechis schlegelii</em>) is an arboreal pit viper of humid forests on both slopes of Costa Rica. Its English name, eyelash viper, comes from the raised scales above each eye.</p>
  <p>Its colour is famously variable: green, brown, mottled, or the solid golden-yellow morph called <strong>oropel</strong>. A prehensile tail anchors the snake while it ambushes frogs, lizards, small birds and rodents.</p>
  <p>Bites are rare but need prompt medical care: antivenom is the treatment. Never handle a snake.</p>
  <h3>Look closer</h3>
  <ul class="look"><li><a class="lam-look" href="#look:loreal-pit">Loreal pit</a></li><li><a class="lam-look" href="#look:eyelash-scales">Eyelash scales</a></li></ul>
  <h3>Field notes</h3>
  <dl><dt>Family</dt><dd>Viperidae · Crotalinae</dd><dt>Habit</dt><dd>Arboreal ambush predator</dd><dt>Activity</dt><dd>Mostly nocturnal</dd><dt>Young</dt><dd>Born live</dd><dt>Morphs</dt><dd>Green, brown, golden <em>oropel</em></dd></dl>
  <aside>Colour morphs are inherited: a single litter can include golden and green young.</aside>`,
    short: (p) => `<p class="lede">${p.lede}</p><h3>Field notes</h3><dl><dt>Family</dt><dd>${p.family}</dd><dt>Species</dt><dd><em>${p.sci}</em></dd></dl>`,
    verso: {
      body: 'The bocaracá is an arboreal pit viper of humid forests on both slopes of Costa Rica. Its English name, eyelash viper, comes from the raised scales above each eye. A prehensile tail anchors the snake while it waits in ambush for frogs, lizards and small birds.',
      facts: [['Family', null], ['Habit', 'Arboreal ambush predator'], ['Activity', 'Mostly nocturnal']],
      plate: 'Plate',
    },
    saved: (file) => `Saved ${file}`,
    plateFile: 'plate',
    viewReset: 'View reset',
    library: 'Back to the library (mock)',
    noFullscreen: 'Full screen is not available here',
  },
  es: {
    subtitle: 'Un atlas vivo de las serpientes de Costa Rica',
    ledes: [
      'La serpiente de mayor importancia médica de Costa Rica: una víbora de foseta grande y nerviosa de bosques y fincas de tierras bajas.',
      'Una pequeña víbora de foseta dorada que espera, inmóvil, entre ramas cubiertas de musgo, y ataca desde su espiral.',
      'Anillos rojos, negros y amarillos advierten a los depredadores de un potente veneno neurotóxico.',
      'La única serpiente de cascabel de Costa Rica, una víbora de foseta del noroeste seco.',
      'La víbora más larga de las Américas, y una de las pocas que ponen huevos.',
      'Una serpiente marina pelágica que deriva con las líneas de espuma a lo largo de la costa del Pacífico.',
      'Una poderosa constrictora, no venenosa, que somete a su presa apretando hasta detener la circulación.',
    ],
    spreads: { cover: 'Cubierta', title: 'Portada', contents: 'Índice', howto: 'Cómo usar este libro', glossary: 'Glosario', sources: 'Fuentes y colofón', back: 'Contracubierta' },
    layers: {
      skin: ['Piel', 'Las escamas y la coloración dorada del oropel'],
      skeleton: ['Esqueleto', 'Cráneo, vértebras y costillas'],
      'eyelash-scales': ['Escamas superciliares', 'Escamas supraoculares elevadas sobre el ojo'],
    },
    beats: [
      [0, 'Anclada por su cola prensil, la bocaracá descansa en una espiral apretada.'],
      [1.6, 'La cabeza se mece despacio mientras la lengua muestrea el aire.'],
      [3.2, 'Las partículas de olor llegan al órgano vomeronasal, en el techo de la boca.'],
    ],
    animationTitle: 'Al acecho',
    labels: {
      head: ['Cabeza', 'La cabeza ancha y triangular aloja las glándulas de veneno detrás de los ojos.'],
      eye: ['Ojo', 'La pupila es una ranura vertical, como en otras víboras de foseta.'],
      'eyelash-scales': ['Escamas superciliares', 'Las escamas supraoculares elevadas sobre cada ojo le dan su nombre en inglés, eyelash viper; su función aún se discute.'],
      'loreal-pit': ['Foseta loreal', 'Una foseta sensible al calor, entre el ojo y la narina, le permite hallar presas de sangre caliente en la oscuridad.'],
      fangs: ['Colmillos', 'Los colmillos largos y huecos se pliegan contra el paladar y giran hacia delante al abrirse las mandíbulas.'],
      'ventral-scutes': ['Escamas ventrales', 'Las anchas escamas del vientre se agarran a la corteza cuando la serpiente avanza por las ramas.'],
      'prehensile-tail': ['Cola prensil', 'La cola rodea la rama y sostiene a la serpiente mientras espera y ataca.'],
      vertebrae: ['Vértebras', 'Cada una de sus muchas vértebras lleva un par de costillas; la columna se flexiona en toda su longitud.'],
    },
    reading: (lede) => `
  <p class="badge">Venenosa — peligrosa</p>
  <p class="lede">${lede}</p>
  <p>La bocaracá (<em>Bothriechis schlegelii</em>) es una víbora de foseta arborícola de los bosques húmedos de ambas vertientes de Costa Rica. Su nombre en inglés, eyelash viper, viene de las escamas elevadas sobre cada ojo.</p>
  <p>Su color es famosamente variable: verde, pardo, moteado, o la forma de un amarillo dorado uniforme llamada <strong>oropel</strong>. Una cola prensil la sujeta mientras acecha ranas, lagartijas, aves pequeñas y roedores.</p>
  <p>Las mordeduras son raras, pero requieren atención médica inmediata: el tratamiento es el suero antiofídico. Nunca manipule una serpiente.</p>
  <h3>Más de cerca</h3>
  <ul class="look"><li><a class="lam-look" href="#look:loreal-pit">Foseta loreal</a></li><li><a class="lam-look" href="#look:eyelash-scales">Escamas superciliares</a></li></ul>
  <h3>Notas de campo</h3>
  <dl><dt>Familia</dt><dd>Viperidae · Crotalinae</dd><dt>Hábito</dt><dd>Depredadora arborícola al acecho</dd><dt>Actividad</dt><dd>Sobre todo nocturna</dd><dt>Crías</dt><dd>Nacen vivas</dd><dt>Formas</dt><dd>Verde, parda, dorada <em>oropel</em></dd></dl>
  <aside>Las formas de color se heredan: una misma camada puede incluir crías doradas y verdes.</aside>`,
    short: (p) => `<p class="lede">${p.lede}</p><h3>Notas de campo</h3><dl><dt>Familia</dt><dd>${p.family}</dd><dt>Especie</dt><dd><em>${p.sci}</em></dd></dl>`,
    verso: {
      body: 'La bocaracá es una víbora de foseta arborícola de los bosques húmedos de ambas vertientes de Costa Rica. Su nombre en inglés, eyelash viper, viene de las escamas elevadas sobre cada ojo. Una cola prensil la sujeta mientras espera al acecho ranas, lagartijas y aves pequeñas.',
      facts: [['Familia', null], ['Hábito', 'Depredadora arborícola al acecho'], ['Actividad', 'Sobre todo nocturna']],
      plate: 'Lámina',
    },
    saved: (file) => `Guardado: ${file}`,
    plateFile: 'lamina',
    viewReset: 'Vista restablecida',
    library: 'Volver a la biblioteca (simulación)',
    noFullscreen: 'La pantalla completa no está disponible aquí',
  },
};
let L = TEXT[getLang()] ?? TEXT.en;

const PLATES = [
  { number: 'I', common: 'Terciopelo', sci: 'Bothrops asper', family: 'Viperidae · Crotalinae', hue: ['#b59a72', '#8a6c46', '#5a4129'] },
  { number: 'II', common: 'Bocaracá', sci: 'Bothriechis schlegelii', family: 'Viperidae · Crotalinae', hue: ['#f6d55a', '#e2ad1d', '#a8770c'] },
  { number: 'III', common: 'Coral', sci: 'Micrurus nigrocinctus', family: 'Elapidae', hue: ['#e2654a', '#c0392b', '#7d1f16'] },
  { number: 'IV', common: 'Cascabel', sci: 'Crotalus simus', family: 'Viperidae · Crotalinae', hue: ['#cdb88f', '#a08a5f', '#6a5636'] },
  { number: 'V', common: 'Matabuey', sci: 'Lachesis stenophrys', family: 'Viperidae · Crotalinae', hue: ['#d8b98a', '#b08c58', '#6e5230'] },
  { number: 'VI', common: 'Serpiente marina', sci: 'Hydrophis platurus', family: 'Elapidae · Hydrophiinae', hue: ['#f2d86a', '#3a3a32', '#16150f'] },
  { number: 'VII', common: 'Béquer', sci: 'Boa imperator', family: 'Boidae', hue: ['#cdbf9c', '#9c8a66', '#5e5038'] },
];
const FIRST_PLATE = 4;
const SPREADS = [
  { key: 'cover' },
  { key: 'title' },
  { key: 'contents' },
  { key: 'howto' },
  ...PLATES.map((p, i) => ({ plate: i })),
  { key: 'glossary' },
  { key: 'sources' },
  { key: 'back' },
];

/** The mock texts of the current language (lede of each plate, titles, layers, labels). */
function localizeContent() {
  L = TEXT[getLang()] ?? TEXT.en;
  PLATES.forEach((p, i) => (p.lede = L.ledes[i]));
  for (const sp of SPREADS) if (sp.key) sp.title = L.spreads[sp.key];
  for (const l of LAYERS) [l.label, l.hint] = L.layers[l.id];
  for (const l of LABELS) [l.text, l.detail] = L.labels[l.id];
  for (const it of items) [it.text, it.detail] = L.labels[it.id];
}

const book = () => ({
  id: 'serpientes',
  title: 'Serpientes',
  subtitle: L.subtitle,
  kind: 'Plate',
  plates: PLATES.map((p, i) => ({ number: p.number, title: p.common, sci: p.sci, spread: FIRST_PLATE + i })),
});

const LAYERS = [
  { id: 'skin', visible: true },
  { id: 'skeleton', visible: false },
  { id: 'eyelash-scales', visible: true },
];

// anchors in page units (viewBox 1000 × 1380); group = what moves them;
// mark / r: the reader's face marks (r: the feature's radius in page units)
const LABELS = [
  { id: 'head', group: 'head', at: [356, 486], z: 0.0, mark: 'tick' },
  { id: 'eye', group: 'head', at: [294, 481], z: -0.01, mark: 'ring', r: 11 },
  { id: 'eyelash-scales', group: 'head', at: [294, 438], z: -0.02, layer: 'eyelash-scales', mark: 'tick' },
  { id: 'loreal-pit', group: 'head', at: [252, 488], z: 0.03, mark: 'ring', r: 4.5 },
  { id: 'fangs', group: 'head', at: [236, 489], z: 0.05, mark: 'tick' },
  { id: 'ventral-scutes', group: 'c1', at: [498, 902], z: 0.06, layer: 'skin' },
  { id: 'prehensile-tail', group: 'tail', at: [806, 808], z: -0.05 },
  { id: 'vertebrae', group: 'c2', at: [668, 800], z: -0.03, layer: 'skeleton' },
];
const items = LABELS.map((l, i) => ({ id: l.id, text: '', detail: '', x: 0, y: 0, r: 0, mark: l.mark, depth: 0, visible: true, rank: LABELS.length - i }));
localizeContent();

function readingFor(p) {
  return p === PLATES[1] ? L.reading(p.lede) : L.short(p);
}

// ---------------------------------------------------------------- state
const state = {
  index: clampInt(+(q.get('index') ?? 5), 0, SPREADS.length - 1),
  t: q.has('t') ? +q.get('t') : 0,
  playing: q.get('play') !== '0',
  labels: q.get('labels') !== '0',
  explode: q.has('explode') ? +q.get('explode') : 0,
  layers: Object.fromEntries(LAYERS.map((l) => [l.id, l.visible])),
};
for (const kv of (q.get('layers') ?? '').split(',').filter(Boolean)) {
  const [id, v] = kv.split(':');
  if (id in state.layers) state.layers[id] = v !== '0';
}

function clampInt(x, a, b) {
  return Math.max(a, Math.min(b, Math.round(Number.isFinite(x) ? x : a)));
}

// ---------------------------------------------------------------- log
const logEl = document.querySelector('#log');
const logLines = [];
function log(cmd) {
  console.info('[ui] command', cmd);
  if (q.get('log') === '0') return;
  const { type, ...rest } = cmd;
  const args = Object.entries(rest).map(([k, v]) => `${k}: ${typeof v === 'number' ? +v.toFixed(2) : JSON.stringify(v)}`);
  logLines.push(`${type}${args.length ? ` { ${args.join(', ')} }` : ''}`);
  if (logLines.length > 8) logLines.shift();
  logEl.textContent = logLines.join('\n');
}

// ---------------------------------------------------------------- mock book
const mock = document.querySelector('#mock');
const shadow = document.createElement('div');
shadow.className = 'mk-shadow';
const spread = document.createElement('div');
spread.className = 'mk-spread';
const verso = document.createElement('div');
verso.className = 'mk-page mk-verso';
const recto = document.createElement('div');
recto.className = 'mk-page mk-recto';
spread.append(verso, recto);
mock.append(shadow, spread);

const NS = 'http://www.w3.org/2000/svg';
let fig = null; // { svg, groups, skin, skel, lashes, tongue }

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function coil(id, cx, cy, rx, ry, rnd) {
  let spots = '';
  for (let i = 0; i < 26; i++) {
    const a = 0.12 * Math.PI + rnd() * 0.76 * Math.PI;
    const r = 0.86 + rnd() * 0.26;
    const x = cx + Math.cos(a) * rx * r;
    const y = cy + Math.sin(a) * ry * r;
    spots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2 + rnd() * 3).toFixed(1)}" fill="${rnd() > 0.5 ? 'url(#mkSpotL)' : 'url(#mkSpotD)'}"/>`;
  }
  return `<g id="${id}">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#2b1d06" stroke-width="52" opacity=".9"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="url(#mkBody)" stroke-width="44" class="skin"/>
    <ellipse cx="${cx}" cy="${cy + 2}" rx="${rx}" ry="${ry}" fill="none" stroke="url(#mkSheen)" stroke-width="10" class="skin" transform="translate(0 -14)"/>
    <g class="skin">${spots}</g>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#1c1a17" stroke-width="3" class="skel" opacity="0"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#1c1a17" stroke-width="18" stroke-dasharray="2.5 11" class="skel" opacity="0"/>
  </g>`;
}

function buildFigure(p) {
  const rnd = seeded(7);
  const [light, mid, dark] = p.hue;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 1000 1380');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = `
    <defs>
      <linearGradient id="mkBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/>
      </linearGradient>
      <linearGradient id="mkSheen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".3" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="mkBark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f7051"/><stop offset="1" stop-color="#4f3825"/></linearGradient>
      <radialGradient id="mkStage"><stop offset="0" stop-color="#5a4e3c" stop-opacity=".2"/><stop offset="1" stop-color="#5a4e3c" stop-opacity="0"/></radialGradient>
      <radialGradient id="mkSpotL"><stop offset="0" stop-color="#fff6cf" stop-opacity=".9"/><stop offset="1" stop-color="#fff6cf" stop-opacity="0"/></radialGradient>
      <radialGradient id="mkSpotD"><stop offset="0" stop-color="${dark}" stop-opacity=".8"/><stop offset="1" stop-color="${dark}" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="510" cy="1030" rx="360" ry="54" fill="url(#mkStage)"/>
    <g id="mk-fig">
      <path d="M110 950 C 330 900, 610 880, 905 778" stroke="#3b2a1a" stroke-width="54" stroke-linecap="round" fill="none"/>
      <path d="M110 950 C 330 900, 610 880, 905 778" stroke="url(#mkBark)" stroke-width="46" stroke-linecap="round" fill="none"/>
      <path d="M150 930 C 330 888, 600 868, 880 776" stroke="#b39270" stroke-width="5" stroke-linecap="round" fill="none" opacity=".55"/>
      <g fill="#6f8f4e" opacity=".9"><ellipse cx="190" cy="925" rx="34" ry="12"/><ellipse cx="640" cy="868" rx="26" ry="9"/><ellipse cx="860" cy="790" rx="22" ry="8"/></g>
      <g id="mk-tail">
        <path d="M720 900 C 790 902, 832 870, 832 834 C 832 800, 800 786, 782 798 C 766 810, 776 830, 798 826" fill="none" stroke="#2b1d06" stroke-width="30" stroke-linecap="round"/>
        <path d="M720 900 C 790 902, 832 870, 832 834 C 832 800, 800 786, 782 798 C 766 810, 776 830, 798 826" fill="none" stroke="url(#mkBody)" stroke-width="23" stroke-linecap="round" class="skin"/>
      </g>
      ${coil('mk-c1', 512, 880, 222, 62, rnd)}
      ${coil('mk-c2', 500, 818, 182, 52, rnd)}
      ${coil('mk-c3', 486, 762, 134, 40, rnd)}
      <g id="mk-head">
        <path d="M372 760 C 330 712, 340 640, 380 572" fill="none" stroke="#2b1d06" stroke-width="44" stroke-linecap="round"/>
        <path d="M372 760 C 330 712, 340 640, 380 572" fill="none" stroke="url(#mkBody)" stroke-width="36" stroke-linecap="round" class="skin"/>
        <path d="M408 560 C 392 506, 340 470, 282 466 C 250 464, 228 474, 222 488 C 222 504, 246 514, 286 518 C 336 522, 382 548, 408 560 Z" fill="url(#mkBody)" stroke="#2b1d06" stroke-width="4" class="skin"/>
        <path d="M232 494 C 270 506, 318 508, 368 520" fill="none" stroke="#2b1d06" stroke-width="3" stroke-linecap="round" opacity=".75"/>
        <g id="mk-lashes" fill="${mid}" stroke="#2b1d06" stroke-width="2.5" stroke-linejoin="round">
          <path d="M278 462 l-6 -22 l14 18 Z"/><path d="M290 459 l0 -26 l9 24 Z"/><path d="M302 460 l7 -24 l1 25 Z"/><path d="M313 464 l12 -19 l-5 22 Z"/>
        </g>
        <circle cx="294" cy="481" r="11" fill="${light}" stroke="#2b1d06" stroke-width="3"/>
        <ellipse cx="294" cy="481" rx="2.6" ry="8.5" fill="#1c1306"/>
        <ellipse cx="252" cy="488" rx="4.5" ry="3.4" fill="#1c1306"/>
        <circle cx="232" cy="482" r="2.6" fill="#1c1306"/>
        <g id="mk-tongue" transform="translate(222 496)"><path d="M0 0 H -40 M -40 0 l -15 -9 M -40 0 l -15 9" fill="none" stroke="#b8322a" stroke-width="3.2" stroke-linecap="round"/></g>
        <path d="M408 560 C 392 506, 340 470, 282 466 C 250 464, 228 474, 222 488 C 222 504, 246 514, 286 518 C 336 522, 382 548, 408 560 Z" fill="none" stroke="#1c1a17" stroke-width="3" class="skel" opacity="0"/>
        <circle cx="294" cy="481" r="16" fill="none" stroke="#1c1a17" stroke-width="2.5" class="skel" opacity="0"/>
      </g>
    </g>`;
  const groups = {};
  for (const id of ['fig', 'head', 'tail', 'c1', 'c2', 'c3']) groups[id] = svg.querySelector(`#mk-${id}`);
  return {
    svg,
    groups,
    skin: Array.from(svg.querySelectorAll('.skin')),
    skel: Array.from(svg.querySelectorAll('.skel')),
    lashes: svg.querySelector('#mk-lashes'),
    tongue: svg.querySelector('#mk-tongue'),
  };
}

function applyLayers() {
  if (!fig) return;
  for (const el of fig.skin) el.style.opacity = state.layers.skin ? '' : '0.12';
  for (const el of fig.skel) el.setAttribute('opacity', state.layers.skeleton ? '0.9' : '0');
  fig.lashes.style.display = state.layers['eyelash-scales'] ? '' : 'none';
}

function renderPages() {
  const sp = SPREADS[state.index];
  const p = sp.plate != null ? PLATES[sp.plate] : null;
  verso.replaceChildren();
  recto.replaceChildren();
  fig = null;
  if (p) {
    verso.innerHTML = `<div class="mk-text">
        <div class="mk-run">Serpientes</div>
        <div class="mk-num">${p.number}</div>
        <h1 class="mk-title">${p.common}</h1>
        <p class="mk-sci">${p.sci}</p>
        <div class="mk-rule"></div>
        <p class="mk-lede">${p.lede}</p>
        <p class="mk-body">${L.verso.body}</p>
        <dl class="mk-facts">${L.verso.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v ?? p.family}</dd>`).join('')}</dl>
      </div><div class="mk-folio" style="left:9%">${(state.index - 1) * 2}</div>`;
    fig = buildFigure(p);
    recto.append(fig.svg);
    const head = document.createElement('div');
    head.className = 'mk-text';
    head.innerHTML = `<div class="mk-run" style="text-align:right">${L.verso.plate} ${p.number}</div>`;
    const folio = document.createElement('div');
    folio.className = 'mk-folio';
    folio.style.right = '9%';
    folio.textContent = String((state.index - 1) * 2 + 1);
    recto.append(head, folio);
    applyLayers();
  } else {
    verso.innerHTML = `<div class="mk-blank">${state.index === 0 ? '' : 'Serpientes'}</div>`;
    recto.innerHTML = `<div class="mk-blank">${sp.title}</div>`;
  }
}

// ---------------------------------------------------------------- layout
let compact = false;
let area = { x: 0, y: 0, w: 1, h: 1 };
function layout() {
  const vw = innerWidth;
  const vh = innerHeight;
  compact = vw <= 640;
  mock.classList.toggle('mk-compact', compact);
  const reserveTop = compact ? 62 : 70;
  const reserveBottom = compact ? 128 : 136;
  const pageW = compact
    ? Math.min(vw - 24, (vh - reserveTop - reserveBottom) / 1.38)
    : Math.min((vw - 160) / 2, (vh - reserveTop - reserveBottom) / 1.38);
  const pageH = pageW * 1.38;
  const spreadW = compact ? pageW : pageW * 2;
  const x0 = (vw - spreadW) / 2;
  const y0 = reserveTop + (vh - reserveTop - reserveBottom - pageH) / 2;
  verso.style.display = compact ? 'none' : '';
  for (const pg of [verso, recto]) {
    pg.style.width = `${pageW}px`;
    pg.style.height = `${pageH}px`;
    pg.style.fontSize = `${pageW / 30}px`;
  }
  Object.assign(spread.style, { left: `${x0}px`, top: `${y0}px` });
  Object.assign(shadow.style, { left: `${x0 - spreadW * 0.06}px`, top: `${y0 + pageH * 0.86}px`, width: `${spreadW * 1.12}px`, height: `${pageH * 0.3}px` });
  area = { x: compact ? x0 : x0 + pageW, y: y0, w: pageW, h: pageH };
}
addEventListener('resize', layout);

// ---------------------------------------------------------------- UI
const ui = createUI({
  root: document.body,
  book: book(),
  lang: getLang(),
  theme: { accent: '#9e2b25', ink: '#1c1a17', paper: '#fbf8f1' },
  idleHide: q.get('idle') !== '0',
  reducedMotion: q.get('rm') === '1' ? true : undefined,
  onCommand,
});
ui.setBackend(q.get('backend') ?? (navigator.gpu ? 'webgpu' : 'webgl2'));
addEventListener('keydown', (e) => ui.runShortcut(e));

function spreadState() {
  const sp = SPREADS[state.index];
  const p = sp.plate != null ? PLATES[sp.plate] : null;
  return {
    index: state.index,
    total: SPREADS.length,
    title: p ? p.common : sp.title,
    sci: p ? p.sci : '',
    number: p ? p.number : '',
    hasFigure: !!p,
    layers: p ? LAYERS.map((l) => ({ ...l, visible: state.layers[l.id] })) : [],
    labels: state.labels,
    explode: state.explode,
    playing: state.playing,
    beats: p ? L.beats : [],
    animationTitle: p ? L.animationTitle : '',
    duration: DURATION,
  };
}

let turnTimer = 0;
function go(i, { instant = false } = {}) {
  const next = clampInt(i, 0, SPREADS.length - 1);
  if (next === state.index && !instant) return;
  clearTimeout(turnTimer);
  const apply = () => {
    state.index = next;
    renderPages();
    ui.setSpread(spreadState());
    const sp = SPREADS[state.index];
    ui.setReading(sp.plate != null ? readingFor(PLATES[sp.plate]) : '');
    ui.setBusy(false);
  };
  if (instant) return apply();
  ui.setBusy(true);
  spread.style.transition = 'opacity .25s';
  spread.style.opacity = '0.35';
  turnTimer = setTimeout(() => {
    apply();
    spread.style.opacity = '1';
  }, 420);
}

function onCommand(cmd) {
  log(cmd);
  switch (cmd.type) {
    case 'next':
      go(state.index + 1);
      break;
    case 'prev':
      go(state.index - 1);
      break;
    case 'goto':
      go(cmd.spread);
      break;
    case 'play':
      state.playing = true;
      break;
    case 'pause':
      state.playing = false;
      break;
    case 'time':
      state.t = cmd.t;
      break;
    case 'labels':
      state.labels = cmd.on;
      break;
    case 'layer':
      state.layers[cmd.id] = cmd.on;
      applyLayers();
      break;
    case 'explode':
      state.explode = cmd.amount;
      break;
    case 'export': {
      // a real export takes 0.2–2 s: answer as late, so the busy ring can be reviewed
      const file = `bocaraca-${L.plateFile}-II${cmd.mode === 'png' ? '.png' : cmd.mode === 'svg-line' ? '-line.svg' : '.svg'}`;
      const saved = L.saved(file);
      setTimeout(() => ui.toast(saved), EXPORT_DELAY);
      break;
    }
    case 'fullscreen':
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.().catch(() => ui.toast(L.noFullscreen));
      break;
    case 'reset-view':
      ui.toast(L.viewReset);
      break;
    case 'library':
      ui.toast(L.library);
      break;
    case 'lang':
      return switchLang(cmd.lang);
    default:
      break;
  }
}

/**
 * The UI asked for another language: load its dictionaries, make it current,
 * re-localise the UI and hand it this spread's texts again (as the App's
 * applyLang does). Resolves when done, so the switch's busy state shows.
 * `langDelay=600` (ms) stands in for a slow first load.
 */
async function switchLang(lang) {
  if (!isLang(lang)) return;
  await loadLang(lang);
  const delay = +(q.get('langDelay') ?? 0) || 0;
  if (delay) await new Promise((r) => setTimeout(r, delay));
  setLang(lang);
  const url = new URL(location.href);
  url.searchParams.set('lang', lang);
  history.replaceState(null, '', url);
  localizeContent();
  ui.setLang(lang);
  ui.setBook(book());
  renderPages();
  ui.setSpread(spreadState());
  const sp = SPREADS[state.index];
  ui.setReading(sp.plate != null ? readingFor(PLATES[sp.plate]) : '');
}

// ---------------------------------------------------------------- frame
const GROUP_EXPLODE = { head: [-70, -64], c3: [0, -52], c2: [0, -26], c1: [0, 0], tail: [44, 18] };
const HEAD_PIVOT = [392, 600];
const HEAD_LEN = 160; // the head's length, snout to jaw angle (page units)
let last = performance.now();
let smoothExplode = state.explode;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.playing) state.t = (state.t + dt) % DURATION;
  smoothExplode += (state.explode - smoothExplode) * (1 - Math.exp(-dt * 8));
  ui.setClock(state.t, DURATION, state.playing);

  if (fig) {
    const ph = (state.t / DURATION) * TAU;
    const sway = Math.sin(ph) * 22; // seamless: whole periods only
    const headDeg = Math.sin(ph * 2 + 0.6) * 5;
    const e = smoothExplode;
    fig.groups.fig.setAttribute('transform', `translate(${sway.toFixed(2)} 0)`);
    for (const g of ['c1', 'c2', 'c3', 'tail']) {
      const [ex, ey] = GROUP_EXPLODE[g];
      fig.groups[g].setAttribute('transform', `translate(${(ex * e).toFixed(2)} ${(ey * e).toFixed(2)})`);
    }
    const [hx, hy] = GROUP_EXPLODE.head;
    fig.groups.head.setAttribute(
      'transform',
      `translate(${(hx * e).toFixed(2)} ${(hy * e).toFixed(2)}) rotate(${headDeg.toFixed(2)} ${HEAD_PIVOT[0]} ${HEAD_PIVOT[1]})`
    );
    const flick = Math.max(0, Math.sin(((state.t - 1.9) / 0.6) * Math.PI)) * (state.t > 1.9 && state.t < 2.5 ? 1 : 0) +
      Math.max(0, Math.sin(((state.t - 3.4) / 0.5) * Math.PI)) * (state.t > 3.4 && state.t < 3.9 ? 1 : 0);
    fig.tongue.setAttribute('transform', `translate(222 496) scale(${flick.toFixed(3)} 1)`);

    const sx = area.w / 1000;
    const sy = area.h / 1380;
    const rad = (headDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    for (let i = 0; i < LABELS.length; i++) {
      const lab = LABELS[i];
      const it = items[i];
      let [x, y] = lab.at;
      const head = lab.group === 'head';
      if (head) {
        const dx = x - HEAD_PIVOT[0];
        const dy = y - HEAD_PIVOT[1];
        x = HEAD_PIVOT[0] + dx * cos - dy * sin;
        y = HEAD_PIVOT[1] + dx * sin + dy * cos;
      }
      const [ex, ey] = GROUP_EXPLODE[lab.group];
      // face features ride the head exactly (their rings stay centred); the body breathes a little
      x += ex * e + sway + (head ? 0 : Math.cos(ph + i) * 4);
      y += ey * e + (head ? 0 : Math.sin(ph + i) * 3);
      it.x = area.x + x * sx;
      it.y = area.y + y * sy;
      it.r = (lab.r ?? 0) * sx;
      it.headPx = head ? HEAD_LEN * sx : undefined;
      it.depth = 4 + lab.z + Math.sin(ph + i * 1.3) * 0.05;
      it.visible = !lab.layer || state.layers[lab.layer] !== false;
    }
    ui.renderLabels(items, area);
  } else {
    ui.renderLabels([], area);
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- boot
layout();
go(state.index, { instant: true });
requestAnimationFrame((t) => {
  last = t;
  frame(t);
});

const open = q.get('open');
const card = q.get('card');
const toastText = q.get('toast');
setTimeout(() => {
  if (open) ui.open(open);
  if (card) document.querySelector(`.lam-pill[data-label-id="${CSS.escape(card)}"]`)?.click();
  if (toastText) ui.toast(toastText);
}, 350);

window.harness = {
  ui,
  state,
  go,
  log,
  items, // live label items (set .focus = true to spotlight one)
  setTime(t) {
    state.playing = false;
    state.t = t;
  },
};
