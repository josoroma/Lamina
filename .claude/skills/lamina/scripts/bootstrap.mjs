#!/usr/bin/env node
// Bootstrap a new Lámina project from this one: engine, kits, app shell, i18n
// runtime and dictionaries, pages, scripts, contracts and this skill — plus
// either the three reference books in both languages (--with-books) or a
// one-plate bilingual starter book that renders immediately with the demo
// figure. Then: cd <target> && npm install && npx vite.
//
//   node .claude/skills/lamina/scripts/bootstrap.mjs <target-dir> [--with-books] [--author "Name"] [--force]
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { addDictionary } from './i18n-domain.mjs';

const args = process.argv.slice(2);
const target = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--author');
const withBooks = args.includes('--with-books');
const force = args.includes('--force');
const author = (() => {
  const i = args.indexOf('--author');
  return i >= 0 ? args[i + 1] : '__Author__';
})();
if (!target) {
  console.error('usage: bootstrap.mjs <target-dir> [--with-books] [--author "Name"] [--force]');
  process.exit(2);
}
const SRC = findRoot();
const DST = resolve(target);
if (existsSync(DST) && readdirSync(DST).length && !force) {
  console.error(`${DST} is not empty (use --force to copy into it anyway)`);
  process.exit(1);
}
mkdirSync(DST, { recursive: true });

const SKIP = new Set(['node_modules', 'dist', '.scratch', '.git', '.DS_Store']);
const copy = (rel, filter = () => true) => {
  const from = join(SRC, rel);
  if (!existsSync(from)) return;
  cpSync(from, join(DST, rel), {
    recursive: true,
    filter: (p) => !relative(SRC, p).split('/').some((seg) => SKIP.has(seg)) && filter(relative(SRC, p)),
  });
};
const write = (rel, text) => {
  mkdirSync(join(DST, rel, '..'), { recursive: true });
  writeFileSync(join(DST, rel), text);
};

// pages, config, static assets (fonts, the author marks), tooling, contracts, the skill
for (const f of ['index.html', 'lab.html', 'typeset.html', 'book-test.html', 'ui.html', 'vite.config.js', 'package.json', '.gitignore']) copy(f);
for (const d of ['public', 'scripts', 'docs/architecture', 'docs/assets', '.claude/skills/lamina']) copy(d);
// engine, kits, app, lab, the i18n runtime with its dictionaries
for (const d of ['src/engine', 'src/kits', 'src/app', 'src/lab', 'src/i18n']) copy(d);

const SUBJECTS = withBooks ? ['demo', 'snakes', 'flowers', 'skulls'] : ['demo'];
for (const s of SUBJECTS) copy(`src/subjects/${s}`);

if (withBooks) {
  // the books, their Spanish editions (src/books/es/) and making texts (src/books/making/),
  // with the documents the making texts quote verbatim (docs/prompts/)
  copy('src/books');
  copy('src/subjects/index.js');
  copy('docs/books');
  copy('docs/prompts');
} else {
  write('src/subjects/index.js', `// Subject registry: figure type → lazy module loader (see src/engine/figures/contract.js).
export const figureLoaders = {
  demo: () => import('./demo/index.js'),
};

export async function loadFigureFactory(type) {
  const load = figureLoaders[type];
  if (!load) throw new Error(\`Unknown figure type "\${type}". Register it in src/subjects/index.js\`);
  const mod = await load();
  if (typeof mod.createFigure !== 'function') throw new Error(\`Subject "\${type}" must export createFigure(params, ctx)\`);
  return mod.createFigure;
}
`);
  write('src/books/index.js', starterRegistry());
  const fill = (s) => s
    .replaceAll('__ID__', 'starter')
    .replaceAll('__TITLE__', 'Starter')
    .replaceAll('__SUBTITLE__', 'A Living Atlas in the Making')
    .replaceAll('__Subtítulo__', 'Un atlas vivo en preparación')
    .replaceAll('__AUTHOR__', author)
    .replaceAll("'__MARK__'", 'null')
    .replaceAll('__YEAR__', String(new Date().getFullYear()))
    .replaceAll('__N__', 'I');
  const tpl = (f) => readFileSync(join(SRC, '.claude/skills/lamina/templates', f), 'utf8');
  write('src/books/starter.js', fill(tpl('book.js')));
  write('src/books/es/starter.js', fill(tpl('book.es.js')));
  // "How this book was made": the project's own prompt, recorded verbatim (and its translation)
  const PROMPT = 'Record here, verbatim, the prompt that started this project.';
  const BRIEF = 'Record here, verbatim, the prompt this book was written from.';
  write('docs/prompts/00-original-brief.md', `# 00 · The original brief

The prompt that started this project, verbatim. src/books/making/index.js prints it on
the "How this book was made" leaf at the end of every book; the validator checks it
against this quote, line by line.

## Prompt (verbatim)

> ${PROMPT}

## Brief: starter (verbatim)

> ${BRIEF}
`);
  write('src/books/making/index.js', `// How this book was made — the English originals, printed verbatim on the making
// leaf at the end of every book (the prompt on its recto, the book's brief on its verso).
//
//   PROMPT  the prompt that started the project, line by line as quoted in
//           docs/prompts/00-original-brief.md ("* " lines are bullets; \`title\` and
//           \`headings\` index into \`lines\`)
//   BRIEFS  each book's brief, verbatim, with the document it is quoted from
//   LATER   one closing line on the prompts that reshaped the books later
//
// Verbatim means verbatim: scripts/validate-books.mjs compares these strings with the
// documents. making/es.js exports the same names and shape, translated.
export const LANG = 'en';
export const MODEL = 'Claude Code';

export const PROMPT = {
  source: 'docs/prompts/00-original-brief.md',
  lines: ['${PROMPT}'],
  title: 0,
  headings: [],
};

export const BRIEFS = {
  starter: {
    source: 'docs/prompts/00-original-brief.md',
    text: '${BRIEF}',
  },
};

export const LATER = {
  source: 'docs/prompts/',
  text: 'Later prompts are kept in docs/prompts/.',
};
`);
  write('src/books/making/es.js', `// How this book was made — Spanish edition: faithful translations of the English
// originals in making/index.js, which the Spanish making leaf labels as translations.
// Same exports, same shape: PROMPT.lines keeps the English line count, with blank and
// "* " bullet lines at the same indices; URLs stay as written.
export const LANG = 'es';
export const TRANSLATED_FROM = 'en';
export const MODEL = 'Claude Code';

export const PROMPT = {
  source: 'docs/prompts/00-original-brief.md',
  lines: ['Traduzca aquí, fielmente, la instrucción que dio origen a este proyecto.'],
  title: 0,
  headings: [],
};

export const BRIEFS = {
  starter: {
    source: 'docs/prompts/00-original-brief.md',
    text: 'Traduzca aquí, fielmente, el encargo de este libro.',
  },
};

export const LATER = {
  source: 'docs/prompts/',
  text: 'Las instrucciones posteriores se conservan en docs/prompts/.',
};
`);
  // dictionaries follow the subjects: the reference subjects stay out, the demo figure gets its Spanish
  for (const s of ['snakes', 'flowers', 'skulls']) {
    if (existsSync(join(DST, 'src/i18n/es', `${s}.js`))) {
      write(`src/i18n/es/${s}.js`, `// Spanish for the ${s} figures. This project has no ${s} subject (bootstrap.mjs without
// --with-books): the file stays empty so src/i18n/es/index.js keeps loading.
export default {
};
`);
    }
  }
  addDictionary({ root: DST, domain: 'demo', content: tpl('subject/es.js') });
}

// package name
const pkgPath = join(DST, 'package.json');
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.name = DST.split('/').pop().toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'lamina-book';
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

console.log(`Lámina copied to ${DST}${withBooks ? ' (with the three reference books, English and Spanish)' : ' (bilingual starter book + demo figure)'}
next:
  cd ${relative(process.cwd(), DST) || '.'}
  npm install
  npx vite --port 5173 --host 127.0.0.1     # http://127.0.0.1:5173/#/en/  ·  #/es/
  npm test                                  # the i18n core and Spanish hyphenation
  node scripts/validate-books.mjs --lang all
then follow .claude/skills/lamina/SKILL.md ("Making a new book").`);

/**
 * The starter's registry: this project's registry with its BOOKS replaced by the
 * starter (so the Spanish loader helper and MAKING stay exactly as here).
 */
function starterRegistry() {
  const line = `  { id: 'starter', load: () => import('./starter.js'), es: () => spanish('starter') },`;
  const here = readFileSync(join(SRC, 'src/books/index.js'), 'utf8');
  const out = here.replace(/export const BOOKS = \[\n[\s\S]*?\n\];/, `export const BOOKS = [\n${line}\n];`);
  if (out !== here && /function spanish\(/.test(out) && /export const MAKING/.test(out)) return out;
  return `// Book registry: route id → lazy manifest, its Spanish edition and the
// "How this book was made" texts. Node-safe (scripts import it outside Vite).
export const BOOKS = [
  { id: 'starter', load: () => import('./starter.js'), es: () => import('./es/starter.js') },
];

export const MAKING = {
  en: () => import('./making/index.js'),
  es: () => import('./making/es.js'),
};

export async function loadManifest(id) {
  const entry = BOOKS.find((b) => b.id === id);
  if (!entry) throw new Error(\`Unknown book "\${id}"\`);
  const mod = await entry.load();
  return mod.default;
}
`;
}

function findRoot() {
  let d = import.meta.dirname;
  while (d !== '/') {
    if (existsSync(resolve(d, 'src/engine/book/Book.js'))) return d;
    d = resolve(d, '..');
  }
  console.error('bootstrap.mjs must run from inside a Lámina checkout (src/engine/book/Book.js not found)');
  process.exit(1);
}
