#!/usr/bin/env node
// Bootstrap a new Lámina project from this one: engine, kits, app shell, i18n
// runtime and dictionaries, pages, scripts, contracts and this skill — plus
// either the complete selected series in both languages (--with-books) or a
// one-plate bilingual starter book that renders immediately with the demo
// figure. Then: cd <target> && npm ci && npm run dev.
//
//   node .claude/skills/lamina/scripts/bootstrap.mjs <target-dir> [--with-books] [--author "Name"] [--series lamina] [--id name] [--title "Series name"] [--force]
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { addDictionary } from './i18n-domain.mjs';
import { findProjectRoot, option } from './project-root.mjs';

const args = process.argv.slice(2);
const valueFlags = new Set(['--author', '--series', '--id', '--title']);
const target = args.find((a, i) => !a.startsWith('--') && !valueFlags.has(args[i - 1]));
const withBooks = args.includes('--with-books');
const force = args.includes('--force');
const author = option(args, 'author', '__Author__');
const SKILL = resolve(import.meta.dirname, '..');
if (!target) {
  console.error('usage: bootstrap.mjs <target-dir> [--with-books] [--author "Name"] [--series lamina] [--id name] [--title "Series name"] [--force]');
  process.exit(2);
}
const SRC = findProjectRoot({ from: import.meta.dirname, series: option(args, 'series') });
const DST = resolve(target);
const id = option(args, 'id', DST.split('/').pop().toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'lamina-series');
if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error('--id must start with a lowercase letter and use letters, digits or hyphens');
const title = option(args, 'title', id[0].toUpperCase() + id.slice(1));
if (DST === SRC || relative(SRC, DST).startsWith('src/')) throw new Error('Choose a destination outside the source app');
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
for (const f of ['index.html', 'lab.html', 'typeset.html', 'book-test.html', 'ui.html', 'vite.config.js', 'package.json', 'package-lock.json', '.gitignore']) copy(f);
for (const d of ['docs/architecture', 'docs/assets']) copy(d);
copy('scripts', p => withBooks || !['scripts/arm-mechanics-test.mjs', 'scripts/character-contact-test.mjs'].includes(p));
copy('public', p => withBooks || (!p.startsWith('public/assets/characters') && !p.startsWith('public/narration')));
// The starter has no character models. Keep every package/font notice intact,
// but remove the index sentence linking to the omitted character provenance.
const notices = join(DST, 'public/licenses/README.md');
if (!withBooks && existsSync(notices)) {
  const characterNotice = 'The MakeHuman-derived character assets have separate [provenance and CC0 notices](../assets/characters/README.md). ';
  writeFileSync(notices, readFileSync(notices, 'utf8').replace(characterNotice, ''));
}
cpSync(SKILL, join(DST, '.claude/skills/lamina'), { recursive: true });
// engine, kits, app, lab, the i18n runtime with its dictionaries
for (const d of ['src/engine', 'src/kits', 'src/app', 'src/lab', 'src/i18n']) copy(d);

const sourceSubjects = readdirSync(join(SRC, 'src/subjects'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
const SUBJECTS = withBooks ? sourceSubjects : ['demo'];
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
  const fill = template => {
    let text = template.replaceAll("'__MARK__'", 'null');
    const values = { '__ID__': 'starter', '__TITLE__': 'Starter', '__SUBTITLE__': 'A Living Atlas in the Making',
      '__Subtítulo__': 'Un atlas vivo en preparación', '__AUTHOR__': author,
      '__YEAR__': String(new Date().getFullYear()), '__N__': 'I' };
    for (const [token, value] of Object.entries(values)) {
      const literal = JSON.stringify(String(value)).slice(1, -1).replaceAll("'", "\\'");
      text = text.replaceAll(token, () => literal);
    }
    return text;
  };
  const tpl = (f) => readFileSync(join(SKILL, 'templates', f), 'utf8');
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
  for (const s of sourceSubjects.filter(name => name !== 'demo')) {
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
  pkg.name = id;
  if (!withBooks) delete pkg.scripts['test:characters'];
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  const lockPath = join(DST, 'package-lock.json');
  if (existsSync(lockPath)) {
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    lock.name = id;
    if (lock.packages?.['']) lock.packages[''].name = id;
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
  }
}

const sourceMetadata = existsSync(join(SRC, 'series.json')) ? JSON.parse(readFileSync(join(SRC, 'series.json'), 'utf8')) : {};
write('series.json', JSON.stringify({ id, title, languages: ['en', 'es'],
  books: withBooks ? sourceMetadata.books ?? [] : ['starter'], source: 'https://github.com/josoroma/Lamina' }, null, 2) + '\n');
if (!existsSync(join(DST, 'AGENTS.md'))) write('AGENTS.md', `# Lamina series

Read the [Lámina authoring skill](.claude/skills/lamina/SKILL.md) for book,
engine, figure and series scaffolding work.

This repository is a standalone application. Its \`src/\`, \`scripts/\`,
\`public/\` and \`docs/\` paths are relative to the repository root.
Keep book text and navigation bilingual in English and Español. Keep source
records and asset provenance with the series; exclude runtime caches and
Python environments from source control.

Run \`npm test\`, \`npm run validate:all\` and \`npm run build\` from this root.
The starter's draft content must be completed before content validation passes.
Review anatomy, figures and page layout in the browser after visual changes.

Static hosting plays prepared narration recordings. Generate and validate
recordings for the current left-page text before publishing a narrated series;
the local Python narration service runs only in a server environment.
`);
write('README.md', `# ${title}

An independent bilingual book series built with [Lámina](https://github.com/josoroma/Lamina).
${withBooks ? 'This project includes the selected source series. Replace its book content to develop a different series.' : 'The starter book and seed-pod figure are scaffolds: replace their draft text and model with researched content.'}

\`\`\`bash
npm ci
npm run dev
npm test
npm run build
\`\`\`

Add a bilingual book with \`node .claude/skills/lamina/scripts/new-book.mjs <id> --title "Title" --subtitle "Subtitle" --subtitle-es "Subtítulo"\`.
Add a figure subject with \`node .claude/skills/lamina/scripts/new-subject.mjs <type>\`.

The [Lámina skill](.claude/skills/lamina/SKILL.md) describes research, translation,
figure modelling and verification. Books live in \`src/books/\`, figures in
\`src/subjects/\`, static assets in \`public/\`, and source records in \`docs/\`.
The project can be committed directly to its own repository; bootstrap does not
create commits, configure remotes or publish it. Serve \`dist/\` after building.
`);

console.log(`Lámina copied to ${DST}${withBooks ? ' (with the selected series, English and Spanish)' : ' (bilingual starter book + demo figure)'}
next:
  cd ${relative(process.cwd(), DST) || '.'}
  npm ci
  npm run dev                          # http://127.0.0.1:5173/#/en/  ·  #/es/
  npm test                             # edition, narration, captions and reader tests
  node scripts/validate-books.mjs --lang all
then follow .claude/skills/lamina/SKILL.md ("Making a new book").`);

/**
 * The starter's independent registry and bilingual loaders.
 */
function starterRegistry() {
  return `// Book registry: route id → lazy manifest, its Spanish edition and making texts.
// Node-safe: validation scripts import this registry outside Vite.
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
  return (await entry.load()).default;
}
`;
}
