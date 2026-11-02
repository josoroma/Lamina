#!/usr/bin/env node
// Scaffold a new Lámina book in both languages: src/books/<id>.js (the English
// source edition) and src/books/es/<id>.js (its Spanish edition) from the
// templates, the registry entry with its Spanish loader, and a brief for the
// book's "How this book was made" page (BRIEFS in src/books/making/, quoted
// verbatim from docs/prompts/<id>-brief.md).
//
//   node .claude/skills/lamina/scripts/new-book.mjs <id> --title "Mariposas"
//        --subtitle "A Living Atlas of Costa Rican Butterflies"
//        [--subtitle-es "Un atlas vivo de las mariposas de Costa Rica"]
//        [--author "Name" --mark <id in AUTHOR_MARKS>] [--volume IV]
//
// The byline defaults to the series author: the first registered book's byline.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = findRoot();
const args = process.argv.slice(2);
const id = args[0];
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
if (!id || !/^[a-z][a-z0-9-]*$/.test(id) || /^[a-z]{2}$/.test(id)) {
  console.error('usage: new-book.mjs <id: lowercase-kebab, not a two-letter language code> --title "Title" --subtitle "Subtitle" [--subtitle-es "…"] [--author "Name" --mark id]');
  process.exit(2);
}
const target = resolve(ROOT, 'src/books', `${id}.js`);
const targetEs = resolve(ROOT, 'src/books/es', `${id}.js`);
if (existsSync(target)) {
  console.error(`src/books/${id}.js already exists`);
  process.exit(1);
}

// the series author: the first registered book with a byline (else a placeholder)
const reg = resolve(ROOT, 'src/books/index.js');
let byline = null;
try {
  const { BOOKS } = await import(pathToFileURL(reg).href);
  for (const b of BOOKS) {
    byline = (await b.load()).default?.byline ?? null;
    if (byline) break;
  }
} catch {
  /* an empty or older registry: keep the placeholder */
}
const author = opt('author', byline?.name ?? '__Author__');
const mark = opt('mark', opt('author') ? null : byline?.mark ?? null);
const fill = (s) => s
  .replaceAll('__ID__', id)
  .replaceAll('__TITLE__', opt('title', id[0].toUpperCase() + id.slice(1)))
  .replaceAll('__SUBTITLE__', opt('subtitle', 'A Living Atlas'))
  .replaceAll('__Subtítulo__', opt('subtitle-es', '__Subtítulo__'))
  .replaceAll('__AUTHOR__', author)
  .replaceAll("'__MARK__'", mark ? `'${mark}'` : 'null')
  .replaceAll('__YEAR__', String(new Date().getFullYear()))
  .replaceAll('__N__', opt('volume', 'I'));
const tpl = (f) => readFileSync(resolve(import.meta.dirname, '../templates', f), 'utf8');
writeFileSync(target, fill(tpl('book.js')));
mkdirSync(resolve(ROOT, 'src/books/es'), { recursive: true });
if (!existsSync(targetEs)) writeFileSync(targetEs, fill(tpl('book.es.js')));

// registry: English loader + Spanish loader (through the registry's own helper when it has one)
let src = readFileSync(reg, 'utf8');
if (!src.includes(`id: '${id}'`)) {
  const es = /function spanish\(/.test(src) ? `spanish('${id}')` : `import('./es/${id}.js')`;
  const line = `  { id: '${id}', load: () => import('./${id}.js'), es: () => ${es} },\n`;
  src = src.replace(/(export const BOOKS = \[\n(?:.*\n)*?)(\];)/, `$1${line}$2`);
  writeFileSync(reg, src);
}

// the brief: quoted verbatim in docs/prompts/<id>-brief.md, printed on the book's last page
const briefDoc = `docs/prompts/${id}-brief.md`;
const BRIEF = 'Record here, verbatim, the prompt this book was written from.';
const BRIEF_ES = 'Traduzca aquí, fielmente, el encargo de este libro.';
if (!existsSync(resolve(ROOT, briefDoc))) {
  mkdirSync(resolve(ROOT, 'docs/prompts'), { recursive: true });
  writeFileSync(resolve(ROOT, briefDoc), `# ${opt('title', id)} · the brief\n\nThe prompt this book was written from, verbatim. src/books/making/index.js\n(BRIEFS.${id}) prints it on the book's last page; the validator checks it\nagainst this quote.\n\n## Brief (verbatim)\n\n> ${BRIEF}\n`);
}
const briefs = [];
for (const [file, text] of [['src/books/making/index.js', BRIEF], ['src/books/making/es.js', BRIEF_ES]]) {
  const p = resolve(ROOT, file);
  if (!existsSync(p)) continue;
  const m = readFileSync(p, 'utf8');
  if (new RegExp(`^\\s+['"]?${id}['"]?\\s*:`, 'm').test(m.slice(m.indexOf('BRIEFS')))) continue;
  const key = /^[A-Za-z_$][\w$]*$/.test(id) ? id : `'${id}'`;
  const entry = `  ${key}: {\n    source: '${briefDoc}',\n    text: '${text}',\n  },\n`;
  const out = m.replace(/(export const BRIEFS = \{\n(?:[\s\S]*?\n)?)(\};)/, `$1${entry}$2`);
  if (out !== m) {
    writeFileSync(p, out);
    briefs.push(file);
  }
}
console.log(`created src/books/${id}.js and src/books/es/${id}.js, registered both in src/books/index.js
byline: ${author}${mark ? ` (mark "${mark}", foil-stamped on the boards)` : ' (no mark)'}${briefs.length ? `
brief stub in ${briefs.join(' and ')} (quoted from ${briefDoc})` : ''}
next:
  1. plan 6–8 plates (common, scientific, figure type/params, 5 s story, layers, canonical label ids)
  2. research + write + adversarially fact-check (references/accuracy.md)
  3. record the book's prompt verbatim in ${briefDoc} and BRIEFS.${id} (src/books/making/index.js), its translation in making/es.js
  4. translate into src/books/es/${id}.js (references/manifest.md, "The Spanish edition") and the figure strings into
     src/i18n/es/<subject>.js — a look-closer name is the very words of its label's Spanish pill — then review with two lenses
  5. npm test; node scripts/validate-books.mjs ${id} --lang all --fit
  6. node scripts/audit.mjs ${id} --lang es --i18n --json .scratch/${id}-es.json, then
     node scripts/validate-books.mjs ${id} --lang es --runtime .scratch/${id}-es.json
  7. open http://127.0.0.1:5173/#/en/${id} and #/es/${id}`);

function findRoot() {
  let d = process.cwd();
  while (d !== '/') {
    if (existsSync(resolve(d, 'src/books/index.js'))) return d;
    d = resolve(d, '..');
  }
  console.error('run inside a Lámina project (src/books/index.js not found)');
  process.exit(1);
}
