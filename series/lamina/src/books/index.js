// Book registry: route id → lazy manifest, its Spanish edition and the
// "How this book was made" texts. Adding a book = one line here plus
// src/books/<id>.js (see docs/architecture/CONTRACTS.md §6), its Spanish
// edition src/books/es/<id>.js and its brief in src/books/making/.
//
// Node-safe on purpose: scripts/validate-books.mjs and src/i18n/edition.js
// import this file outside Vite, so it uses no import.meta.glob. The Spanish
// loader's template-literal import is a plain dynamic import in Node and, in
// Vite, a glob over ./es/*.js that bundles whichever editions exist.
export const BOOKS = [
  { id: 'serpientes', load: () => import('./serpientes.js'), es: () => spanish('serpientes') },
  { id: 'flores', load: () => import('./flores.js'), es: () => spanish('flores') },
  { id: 'calaveras', load: () => import('./calaveras.js'), es: () => spanish('calaveras') },
  { id: 'atomos', load: () => import('./atomos.js'), es: () => spanish('atomos') },
  { id: 'celulas', load: () => import('./celulas.js'), es: () => spanish('celulas') },
  { id: 'fogata', load: () => import('./fogata.js'), es: () => spanish('fogata') },
];

/**
 * "How this book was made", per language: the prompt that began the series
 * and each book's brief (English originals in making/index.js, Spanish
 * translations in making/es.js — same exports, same shape).
 */
export const MAKING = {
  en: (id) => SCIENCE_BOOKS.has(id) ? import('./making/science.js') : import('./making/index.js'),
  es: (id) => SCIENCE_BOOKS.has(id) ? import('./making/science-es.js') : import('./making/es.js'),
};
const SCIENCE_BOOKS = new Set(['atomos', 'celulas', 'fogata']);

export async function loadManifest(id) {
  const entry = BOOKS.find((b) => b.id === id);
  if (!entry) throw new Error(`Unknown book "${id}"`);
  const mod = await entry.load();
  return mod.default;
}

/**
 * Load src/books/es/<id>.js. While the translators have not delivered the
 * file it resolves to `{ default: null, missing: true }` (Node:
 * ERR_MODULE_NOT_FOUND; Vite: "Unknown variable dynamic import"), so the
 * edition loader falls back to the English text instead of failing. Any
 * other error, such as a syntax error inside the file, still rejects.
 * @param {string} id
 * @returns {Promise<{ default: object|null, missing?: true }>}
 */
function spanish(id) {
  return import(`./es/${id}.js`).catch((err) => {
    const msg = String(err?.message ?? '').replaceAll('\\', '/');
    const absent = msg.startsWith('Unknown variable dynamic import')
      || (err?.code === 'ERR_MODULE_NOT_FOUND' && msg.includes(`/es/${id}.js`));
    if (absent) return { default: null, missing: true };
    throw err;
  });
}
