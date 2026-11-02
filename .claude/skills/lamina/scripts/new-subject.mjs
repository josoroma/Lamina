#!/usr/bin/env node
// Scaffold a new figure subject: src/subjects/<type>/index.js (a complete,
// working Figure from the template) + a lazy loader in src/subjects/index.js,
// and its Spanish dictionary src/i18n/es/<folder>.js registered in
// src/i18n/es/index.js (figure strings stay English in code and are
// translated where they are shown).
//
//   node .claude/skills/lamina/scripts/new-subject.mjs butterfly [--dir butterflies]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { addDictionary } from './i18n-domain.mjs';
import { findProjectRoot, option } from './project-root.mjs';

const ROOT = findProjectRoot({ series: option(process.argv.slice(2), 'series') });
const type = process.argv[2];
if (!type || !/^[a-z][a-z0-9-]*$/.test(type)) {
  console.error('usage: new-subject.mjs <type: lowercase-kebab> [--dir <folder>] [--series lamina]');
  process.exit(2);
}
const folder = (() => {
  const i = process.argv.indexOf('--dir');
  return i >= 0 ? process.argv[i + 1] : type;
})();
if (!/^[a-z][a-z0-9-]*$/.test(folder)) throw new Error('--dir must be a lowercase folder name, not a path');
const dir = resolve(ROOT, 'src/subjects', folder);
const file = resolve(dir, 'index.js');
if (existsSync(file)) {
  console.error(`${file} already exists`);
  process.exit(1);
}
const reg = resolve(ROOT, 'src/subjects/index.js');
const src = readFileSync(reg, 'utf8');
if (new RegExp(`^\\s*['"]?${type}['"]?\\s*:`, 'm').test(src)) {
  console.error(`Figure type "${type}" is already registered`);
  process.exit(1);
}
const rel = `./${folder}/index.js`;
const updated = src.replace(/(export const figureLoaders = \{\n(?:.*\n)*?)(\};)/, `$1  '${type}': () => import('${rel}'),\n$2`);
if (updated === src) throw new Error('Cannot find figureLoaders table; no files were written');
mkdirSync(dir, { recursive: true });
writeFileSync(file, readFileSync(resolve(import.meta.dirname, '../templates/subject/index.js'), 'utf8'));
writeFileSync(reg, updated);

// the subject's dictionary: its domain is the folder (scripts/i18n-strings.mjs maps src/subjects/<folder>/ to it)
let dict = null;
if (existsSync(resolve(ROOT, 'src/i18n/es/index.js'))) {
  const content = readFileSync(resolve(import.meta.dirname, '../templates/subject/es.js'), 'utf8');
  dict = addDictionary({ root: ROOT, domain: folder, content });
}
console.log(`created ${file.replace(ROOT + '/', '')} (a working demo figure) and registered type "${type}"${dict ? `
${dict.created ? 'created' : 'kept'} ${dict.file} (Spanish for the figure's strings)${dict.registered ? ' and registered it in src/i18n/es/index.js' : ''}` : ''}
next:
  1. open http://127.0.0.1:5173/lab.html?type=${type}  (and &lang=es)
  2. model in centimetres at real scale with ctx.ink / ctx.outline / kits (tube, petal, sdf, patterns)
  3. add canonical label ids to scripts/validate-books.mjs (CANONICAL.${type}) and CONTRACTS.md §6
  4. keep every label, layer, part and colour name English in code; translate each in src/i18n/es/${folder}.js
     (label pills ≤ 110 px in Spanish: node scripts/audit.mjs --i18n; a label a look-closer note names reads
     exactly like the note's Spanish name)
  5. node scripts/audit.mjs  (seamless loop, layers, labels, cost) and --webgl`);
