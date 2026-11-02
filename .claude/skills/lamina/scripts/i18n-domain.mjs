// Shared by new-subject.mjs and bootstrap.mjs: give a figure subject its own
// Spanish dictionary, src/i18n/es/<domain>.js, and register it in
// src/i18n/es/index.js so loadLang('es') merges it. Figure strings stay English
// in the subject's code; the host, the reader and the exporter translate them
// through this file (docs/architecture/CONTRACTS.md §16).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RESERVED = new Set(['export', 'import', 'default', 'function', 'class', 'const', 'let', 'var', 'new', 'delete', 'in', 'do', 'if', 'for', 'while', 'switch', 'case', 'return', 'this', 'with', 'yield', 'await', 'enum']);

/** 'sea-shells' → 'seaShells'; a reserved word gets a suffix ('export' → 'exportStrings'). */
export function identifierFor(domain) {
  const id = domain.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/[^\w$]/g, '_');
  return RESERVED.has(id) ? `${id}Strings` : id;
}

/**
 * Create src/i18n/<lang>/<domain>.js (unless it exists) and register it in the
 * language's index.js. Returns what changed, for the caller's summary.
 * @param {{ root: string, domain: string, content?: string, lang?: string }} o
 */
export function addDictionary({ root, domain, content, lang = 'es' }) {
  const dir = resolve(root, 'src/i18n', lang);
  const file = resolve(dir, `${domain}.js`);
  const index = resolve(dir, 'index.js');
  const done = { created: false, registered: false, file: `src/i18n/${lang}/${domain}.js` };
  if (!existsSync(index)) throw new Error(`src/i18n/${lang}/index.js not found: is src/i18n copied into this project?`);
  if (!existsSync(file)) {
    writeFileSync(file, content ?? `// Spanish for the ${domain} figures (figure strings: labels, details, layers and hints,\n// part and colour names, beats). Keys are the exact English strings in the subject's\n// code; values keep every {placeholder}. Strings built at run time ('Segment 3')\n// go in PATTERNS ('Segment {n}', with a literal word of 3 or more letters).\nexport default {\n};\n\nexport const PATTERNS = {\n};\n`);
    done.created = true;
  }
  let src = readFileSync(index, 'utf8');
  const ident = identifierFor(domain);
  if (new RegExp(`from\\s+['"]\\./${domain}\\.js['"]`).test(src)) return done;
  // the import after the last one, the entry at the end of the table of files
  const imports = [...src.matchAll(/^import\s+(\*\s+as\s+)?[\w$]+\s+from\s+['"]\.\/[\w-]+\.js['"];?[ \t]*$/gm)];
  if (!imports.length) throw new Error(`src/i18n/${lang}/index.js: no dictionary imports to follow`);
  const star = Boolean(imports[0][1]);
  const last = imports[imports.length - 1];
  const at = last.index + last[0].length;
  src = `${src.slice(0, at)}\n${star ? `import * as ${ident}` : `import ${ident}`} from './${domain}.js';${src.slice(at)}`;
  const key = /^[A-Za-z_$][\w$]*$/.test(domain) ? domain : `'${domain}'`;
  const entry = key === ident ? ident : `${key}: ${ident}`;
  const table = /(const\s+(?:FILES|DOMAINS)\s*=\s*\{)([\s\S]*?)(\s*\};)/.exec(src);
  if (!table) throw new Error(`src/i18n/${lang}/index.js: no FILES (or DOMAINS) table to register "${domain}" in`);
  const body = table[2].replace(/,?\s*$/, '');
  src = src.replace(table[0], `${table[1]}${body}${body.includes('\n') ? `,\n  ${entry},` : `, ${entry}`}${table[3]}`);
  writeFileSync(index, src);
  done.registered = true;
  return done;
}
