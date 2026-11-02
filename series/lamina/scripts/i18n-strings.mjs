#!/usr/bin/env node
// Translation keys: the English strings the code sends through the i18n runtime,
// and which of them a language's dictionary still lacks (docs/architecture/CONTRACTS.md §16).
//
//   node scripts/i18n-strings.mjs [--lang es] [--missing] [--list] [--runtime audit.json] [--json out.json]
//
// Keys are the exact English strings in code (gettext style). The extractor parses
// src/**/*.js with Vite's own parser (no extra dependency) and collects
//   - the literal key of t(key, vars) and tl(lang, key, vars) — both branches of
//     `cond ? 'A' : 'B'`, and calls through one level of local wrapper
//     (`const L = (k, v) => tl(lang, k, v)`);
//   - msg('…') markers: identity wrappers around table literals that reach
//     t(variable) later (spread names, shortcuts, export modes …). Without them a
//     table-driven key is invisible here and --missing would report a clean slate
//     that is not;
//   - every dictionary's PATTERNS: match patterns for strings built at run time
//     ('Rattle segment {n}'), each with a literal word of ≥ 3 letters.
// Figure strings (labels, layers, parts, swatches, beats) stay English in subject
// code and are translated where they are shown, so they never pass through t()
// there: `node scripts/audit.mjs --i18n --json out.json` extracts them at run time
// and `--runtime out.json` adds them here.
//
//   --missing   keys absent from the dictionary, grouped by the file that must hold
//               them (exit code 1 when there are any)
//   --list      every key by domain, with its first use (and the runtime figure strings)
//
// validate-books.mjs and audit.mjs import collectStatic(), loadDictionaries() and
// checkDictionaries() from here, so all three report the same thing.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseAst } from 'vite';

export const ROOT = resolve(import.meta.dirname, '..');
const rel = (f, root = ROOT) => relative(root, f).split('\\').join('/');

// Owner area of a source file → the dictionary that holds its keys (src/i18n/<lang>/<domain>.js).
const DOMAIN_RULES = [
  [/^src\/app\/(boot|Library|route)\.js$/, 'shell'],
  [/^index\.html$/, 'shell'],
  [/^src\/app\//, 'app'],
  [/^src\/engine\/ui\//, 'ui'],
  [/^src\/engine\/typeset\//, 'typeset'],
  [/^src\/engine\/(figures|export)\//, 'export'],
  [/^src\/lab\//, 'export'],
  [/^src\/subjects\/([^/]+)\//, (m) => m[1]],
];
export function domainOf(file) {
  for (const [re, d] of DOMAIN_RULES) {
    const m = re.exec(file);
    if (m) return typeof d === 'function' ? d(m) : d;
  }
  return null;
}

/** Figure type → subject folder (= its dictionary domain), read from src/subjects/index.js. */
export function subjectDomains(root = ROOT) {
  const out = {};
  const f = resolve(root, 'src/subjects/index.js');
  if (!existsSync(f)) return out;
  for (const m of readFileSync(f, 'utf8').matchAll(/^\s*['"]?([\w-]+)['"]?\s*:\s*\(\)\s*=>\s*import\(\s*['"]\.\/([^/'"]+)\//gm)) out[m[1]] = m[2];
  return out;
}

// ------------------------------------------------------------------ placeholders and patterns

export const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const sameSet = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
/** A match pattern must keep a literal word of ≥ 3 letters, or it would match unrelated strings. */
export const patternLiteralOk = (key) => /\p{L}{3,}/u.test(String(key).replace(/\{\w+\}/g, ' '));
/** The regex a pattern key compiles to: literal parts escaped, each {name} a lazy capture. */
export function compilePattern(key) {
  const parts = String(key).split(/(\{\w+\})/);
  return new RegExp(`^${parts.map((p) => (/^\{\w+\}$/.test(p) ? '(.+?)' : p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('')}$`, 'su');
}

// ------------------------------------------------------------------ static extraction

const isI18nSource = (v) => /(^|\/)i18n(\/index(\.js)?)?$/.test(v);
const isNode = (v) => v && typeof v === 'object' && typeof v.type === 'string';

function walk(node, fn, parent = null) {
  if (!isNode(node)) return;
  if (fn(node, parent) === false) return;
  for (const k in node) {
    if (k === 'start' || k === 'end' || k === 'loc' || k === 'range') continue;
    const v = node[k];
    if (Array.isArray(v)) for (const c of v) walk(c, fn, node);
    else if (isNode(v)) walk(v, fn, node);
  }
}

function sourceFiles(root, dir = resolve(root, 'src'), out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      if (rel(p, root) === 'src/i18n') continue; // the runtime and the dictionaries hold no keys of their own
      sourceFiles(root, p, out);
    } else if (/\.m?js$/.test(e.name)) out.push(p);
  }
  return out;
}

function lineIndex(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) starts.push(i + 1);
  return (off) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= off) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/** Literal strings an argument can evaluate to, and whether some part of it is not literal. */
function literalsOf(n) {
  if (!n) return { keys: [], dynamic: true };
  if (n.type === 'Literal' && typeof n.value === 'string') return { keys: [n.value], dynamic: false };
  if (n.type === 'TemplateLiteral' && !n.expressions.length) return { keys: [n.quasis[0].value.cooked], dynamic: false };
  if (n.type === 'ConditionalExpression' || n.type === 'LogicalExpression') {
    const [a, b] = n.type === 'ConditionalExpression' ? [n.consequent, n.alternate] : [n.left, n.right];
    const x = literalsOf(a), y = literalsOf(b);
    return { keys: [...x.keys, ...y.keys], dynamic: x.dynamic || y.dynamic };
  }
  if (n.type === 'ParenthesizedExpression') return literalsOf(n.expression);
  return { keys: [], dynamic: true };
}

/**
 * Every literal key in the source tree.
 * @returns {{ keys: Map<string, { domains: Set<string|null>, sites: Array<{ file, line, via }> }>,
 *             dynamic: Array<{ file, line, via, code }>, errors: string[], files: number }}
 */
export function collectStatic({ root = ROOT } = {}) {
  const keys = new Map();
  const dynamic = [];
  const errors = [];
  const files = sourceFiles(root);
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    if (!/\b(t|tl|msg)\b|i18n/.test(src)) continue;
    let ast;
    try {
      ast = parseAst(src);
    } catch (e) {
      errors.push(`${rel(f, root)}: parse error ${e.message.split('\n')[0]}`);
      continue;
    }
    const file = rel(f, root);
    const lineOf = lineIndex(src);
    // local name → index of the key argument; namespace imports of the runtime
    const calls = new Map();
    const namespaces = new Set();
    for (const s of ast.body) {
      if (s.type !== 'ImportDeclaration' || !isI18nSource(s.source.value)) continue;
      for (const sp of s.specifiers) {
        if (sp.type === 'ImportNamespaceSpecifier') namespaces.add(sp.local.name);
        else if (sp.type === 'ImportSpecifier') {
          const name = sp.imported.name ?? sp.imported.value;
          if (name === 't' || name === 'msg') calls.set(sp.local.name, { arg: 0, via: name });
          else if (name === 'tl') calls.set(sp.local.name, { arg: 1, via: 'tl' });
        }
      }
    }
    if (!calls.size && !namespaces.size) continue;
    const callInfo = (callee) => {
      if (callee.type === 'Identifier') return calls.get(callee.name) ?? null;
      if (callee.type === 'MemberExpression' && !callee.computed && callee.object.type === 'Identifier' && namespaces.has(callee.object.name)) {
        const p = callee.property.name;
        return p === 't' || p === 'msg' ? { arg: 0, via: p } : p === 'tl' ? { arg: 1, via: 'tl' } : null;
      }
      return null;
    };
    // one level of local wrapper: a function whose body passes one of its own parameters as the key
    const fnOf = (n) => {
      if (n.type === 'FunctionDeclaration' && n.id) return [n.id.name, n];
      if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && /^(Arrow)?Function(Expression)?$/.test(n.init?.type ?? '')) return [n.id.name, n.init];
      return null;
    };
    const spans = []; // wrapper bodies: the call inside passes the parameter on, it is not a use site
    walk(ast, (n) => {
      const fn = fnOf(n);
      if (!fn) return;
      const [name, f] = fn;
      if (calls.has(name)) return;
      const params = f.params.map((p) => (p.type === 'Identifier' ? p.name : p.type === 'AssignmentPattern' && p.left.type === 'Identifier' ? p.left.name : null));
      walk(f.body, (c) => {
        if (c.type !== 'CallExpression') return;
        const info = callInfo(c.callee);
        const a = info && c.arguments[info.arg];
        if (a?.type !== 'Identifier' || !params.includes(a.name) || info.via === 'msg') return;
        calls.set(name, { arg: params.indexOf(a.name), via: `${name}→${info.via}` });
        spans.push({ start: f.start, end: f.end, param: a.name });
      });
    });
    walk(ast, (n) => {
      if (n.type !== 'CallExpression') return;
      const info = callInfo(n.callee);
      if (!info) return;
      const a = n.arguments[info.arg];
      const line = lineOf(n.start);
      if (a?.type === 'Identifier' && spans.some((s) => s.param === a.name && s.start <= n.start && n.end <= s.end)) return;
      const { keys: ks, dynamic: dyn } = literalsOf(a);
      for (const k of ks) {
        if (!keys.has(k)) keys.set(k, { domains: new Set(), sites: [] });
        const e = keys.get(k);
        e.domains.add(domainOf(file));
        e.sites.push({ file, line, via: info.via });
      }
      if (dyn) dynamic.push({ file, line, via: info.via, code: a ? src.slice(a.start, a.end).replace(/\s+/g, ' ').slice(0, 90) : '(no argument)' });
    });
  }
  return { keys, dynamic, errors, files: files.length };
}

// ------------------------------------------------------------------ dictionaries

const asEntries = (x) => (x == null ? [] : Array.isArray(x) ? x : Object.entries(x));

/** Duplicate property keys inside one object literal (JS keeps the last silently). */
function duplicateKeys(src) {
  const out = [];
  let ast;
  try {
    ast = parseAst(src);
  } catch {
    return out;
  }
  const lineOf = lineIndex(src);
  walk(ast, (n) => {
    if (n.type !== 'ObjectExpression') return;
    const seen = new Map();
    for (const p of n.properties) {
      if (p.type !== 'Property' || p.computed) continue;
      const k = p.key.type === 'Identifier' ? p.key.name : p.key.value;
      if (typeof k !== 'string') continue;
      if (seen.has(k)) out.push({ key: k, lines: [seen.get(k), lineOf(p.start)] });
      else seen.set(k, lineOf(p.start));
    }
  });
  return out;
}

/**
 * Every dictionary file of a language, as written (before the runtime merges them).
 * @returns {Promise<{ lang, files: Array<{ domain, file, entries: Array<[string, any]>, patterns: Array<[string, any]>,
 *            registered: boolean, duplicates: Array<{ key, lines }> }>, errors: string[] }>}
 */
export async function loadDictionaries(lang = 'es', { root = ROOT } = {}) {
  const dir = resolve(root, 'src/i18n', lang);
  const errors = [];
  const files = [];
  if (lang === 'en' || !existsSync(dir)) return { lang, files, errors };
  let registry = null;
  try {
    registry = await import(pathToFileURL(resolve(dir, 'index.js')).href);
  } catch (e) {
    errors.push(`src/i18n/${lang}/index.js does not load: ${e.message.split('\n')[0]}`);
  }
  const domains = registry?.DOMAINS ?? {};
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'index.js').sort()) {
    const path = resolve(dir, name);
    let mod;
    try {
      mod = await import(pathToFileURL(path).href);
    } catch (e) {
      errors.push(`${rel(path, root)} does not load: ${e.message.split('\n')[0]}`);
      continue;
    }
    const dict = mod.default ?? {};
    const domain = Object.keys(domains).find((d) => domains[d] === dict) ?? name.replace(/\.js$/, '');
    files.push({
      domain,
      file: rel(path, root),
      entries: asEntries(dict),
      patterns: asEntries(mod.PATTERNS),
      registered: Object.values(domains).includes(dict),
      duplicates: duplicateKeys(readFileSync(path, 'utf8')),
    });
  }
  return { lang, files, errors };
}

/** One lookup table over every file: exact keys and compiled patterns. */
export function dictionaryIndex(dicts) {
  const exact = new Map();
  const patterns = [];
  for (const f of dicts.files) {
    for (const [k, v] of f.entries) if (!exact.has(k)) exact.set(k, { value: v, domain: f.domain });
    for (const [k, v] of f.patterns) patterns.push({ key: k, value: v, domain: f.domain, re: compilePattern(k), hits: 0 });
  }
  // longest literal first, as the runtime tries them
  const lit = (k) => k.replace(/\{\w+\}/g, '').length;
  patterns.sort((a, b) => lit(b.key) - lit(a.key));
  const find = (s) => exact.get(s) ?? patterns.find((p) => p.re.test(s)) ?? null;
  return { exact, patterns, find };
}

/** Source text of the tree (minus the dictionaries), for "is this key still produced anywhere?". */
function treeText(root) {
  return sourceFiles(root)
    .filter((f) => !rel(f, root).startsWith('src/books/'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
}

/** Runtime figure strings from `audit.mjs --i18n --json` output: [{ text, kind, domain, where }]. */
export function runtimeStrings(json, { root = ROOT } = {}) {
  const types = subjectDomains(root);
  const rows = Array.isArray(json) ? json : json?.results ?? [];
  const out = [];
  for (const r of rows) {
    const s = r.strings;
    if (!s) continue;
    const domain = types[r.type] ?? r.type ?? null;
    const where = `${r.book}/${r.plate}`;
    const add = (text, kind) => text && typeof text === 'string' && out.push({ text, kind, domain, where });
    for (const l of s.layers ?? []) add(l.label, 'layer'), add(l.hint, 'layer hint');
    for (const l of s.labels ?? []) add(l.text, 'label'), add(l.detail, 'label detail');
    for (const p of s.parts ?? []) {
      add(p.name, p.generated ? 'svg name' : 'part');
      for (const w of p.swatches ?? []) add(typeof w === 'string' ? w : w?.name, 'swatch');
    }
    for (const b of s.beats ?? []) add(typeof b === 'string' ? b : b?.text, 'beat');
    for (const x of s.extra ?? []) add(typeof x === 'string' ? x : x?.text, x?.kind ?? 'export');
  }
  return out;
}

const TYPO = [
  [/\u202F/, 'narrow no-break space U+202F (no book font has it — use U+00A0)', 'error'],
  [/\.\.\./, '"..." (use the ellipsis …)', 'warn'],
  [/(^|[\s(])"|"($|[\s.,;:)])/, 'straight double quote (use «…» or “…”)', 'warn'],
  [/ {2}/, 'double space', 'warn'],
];

/**
 * The dictionary checks of `validate-books.mjs --lang <lang>`:
 * files registered, values present with the key's placeholders, no key defined twice
 * with different values, patterns that keep a literal word, every static key present,
 * runtime figure strings covered (when given), and keys nothing produces any more.
 */
export async function checkDictionaries({ lang = 'es', root = ROOT, statics = null, runtime = null } = {}) {
  const E = [], W = [], I = [];
  const dicts = await loadDictionaries(lang, { root });
  E.push(...dicts.errors);
  if (!dicts.files.length) {
    if (lang !== 'en') E.push(`no dictionaries in src/i18n/${lang}/`);
    return { E, W, I, dicts };
  }
  statics ??= collectStatic({ root });
  const seen = new Map();
  for (const f of dicts.files) {
    if (!f.registered) E.push(`${f.file}: not registered in src/i18n/${lang}/index.js (DOMAINS) — its keys never load`);
    for (const d of f.duplicates) E.push(`${f.file}:${d.lines[1]}: "${d.key}" is defined twice (lines ${d.lines.join(' and ')}); the later value wins`);
    const all = [...f.entries.map((e) => [...e, 'key']), ...f.patterns.map((e) => [...e, 'pattern'])];
    for (const [k, v, kind] of all) {
      const at = `${f.file}: ${kind} "${k.length > 60 ? k.slice(0, 57) + '…' : k}"`;
      if (typeof v !== 'string' || !v.trim()) {
        E.push(`${at}: empty or non-string value`);
        continue;
      }
      if (!sameSet(placeholders(k), placeholders(v))) E.push(`${at}: placeholders {${placeholders(k).join('} {')}} ≠ {${placeholders(v).join('} {')}}`);
      if (kind === 'pattern' && !patternLiteralOk(k)) E.push(`${at}: a match pattern needs a literal word of ≥ 3 letters`);
      if (/^\s|\s$/.test(k) !== /^\s|\s$/.test(v)) W.push(`${at}: leading/trailing space differs from the key`);
      for (const [re, what, sev] of TYPO) if (re.test(v) && !re.test(k)) (sev === 'error' ? E : W).push(`${at}: ${what}`);
      const id = `${kind}\u0000${k}`;
      const prev = seen.get(id);
      if (prev && prev.value !== v) E.push(`"${k}" is defined in ${prev.file} and ${f.file} with different values («${prev.value}» / «${v}»): pick one wording`);
      else if (prev) I.push(`"${k}" is defined in both ${prev.file} and ${f.file} (same value)`);
      else seen.set(id, { value: v, file: f.file });
    }
  }
  const index = dictionaryIndex(dicts);
  for (const p of index.patterns) if (index.exact.has(p.key)) W.push(`pattern "${p.key}" (${p.domain}) is also an exact key`);
  // every key the code sends through t()/tl()/msg() needs an exact entry
  for (const [k, e] of statics.keys) {
    if (index.exact.has(k)) continue;
    const site = e.sites[0];
    const domain = [...e.domains].find(Boolean);
    E.push(`missing ${domain ? `src/i18n/${lang}/${domain}.js` : '(no domain)'}: "${k}"  (${site.file}:${site.line})`);
  }
  // runtime figure strings (audit --i18n): exact key or a pattern
  const produced = new Set(statics.keys.keys());
  if (runtime) {
    const missed = new Map();
    for (const r of runtime) {
      produced.add(r.text);
      const hit = index.find(r.text);
      if (hit?.re) hit.hits++;
      if (!hit && !missed.has(r.text)) missed.set(r.text, r);
    }
    for (const [text, r] of missed) E.push(`missing src/i18n/${lang}/${r.domain ?? '?'}.js: "${text}"  (${r.kind}, ${r.where})`);
  }
  // keys nothing produces any more: not a static key, not a runtime string, not even in the source text.
  // A figure builds some of its strings at run time (mesh names → "Water body", `Teeth (${side})`),
  // so a figure dictionary is judged only against the runtime strings (--runtime)
  const text = treeText(root);
  const figureDomains = new Set(Object.values(subjectDomains(root)));
  let unjudged = 0;
  for (const f of dicts.files) {
    if (!runtime && figureDomains.has(f.domain)) unjudged += f.entries.length;
    else for (const [k] of f.entries) if (!produced.has(k) && !text.includes(k)) W.push(`${f.file}: "${k}" is no longer produced (no t()/msg() key, figure string or source text)`);
    for (const [k] of f.patterns) {
      const p = index.patterns.find((x) => x.key === k);
      const lits = k.split(/\{\w+\}/).map((s) => s.trim()).filter((s) => s.length >= 3);
      if (runtime && p && !p.hits && ![...produced].some((s) => p.re.test(s))) W.push(`${f.file}: pattern "${k}" matches no string the figures produce`);
      else if (!runtime && lits.length && !lits.every((s) => text.includes(s))) W.push(`${f.file}: pattern "${k}" — its literal text is no longer in the source`);
    }
  }
  if (unjudged) I.push(`${unjudged} figure-dictionary keys not checked for staleness: a figure builds some strings at run time (pass --runtime <audit --i18n --json>)`);
  if (statics.dynamic.length) I.push(`${statics.dynamic.length} t()/tl() calls take a non-literal key (wrap table literals in msg(); list: node scripts/i18n-strings.mjs --list)`);
  return { E, W, I, dicts, index };
}

// ------------------------------------------------------------------ CLI

async function main() {
  const args = process.argv.slice(2);
  const flag = (n) => args.includes(`--${n}`);
  const opt = (n, d) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 ? args[i + 1] : d;
  };
  const lang = opt('lang', 'es');
  const statics = collectStatic();
  const runtimeFile = opt('runtime');
  const runtime = runtimeFile ? runtimeStrings(JSON.parse(readFileSync(resolve(runtimeFile), 'utf8'))) : null;
  const dicts = await loadDictionaries(lang);
  const index = dictionaryIndex(dicts);
  for (const e of [...statics.errors, ...dicts.errors]) console.log(`error  ${e}`);

  const byDomain = new Map();
  for (const [k, e] of statics.keys) {
    const d = [...e.domains].find(Boolean) ?? '(no domain)';
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d).push([k, e]);
  }
  const missing = [];
  if (lang !== 'en') {
    for (const [k, e] of statics.keys) if (!index.exact.has(k)) missing.push({ key: k, domain: [...e.domains].find(Boolean) ?? null, site: `${e.sites[0].file}:${e.sites[0].line}`, kind: 'code' });
    const seen = new Set();
    for (const r of runtime ?? []) {
      if (seen.has(r.text) || index.find(r.text)) continue;
      seen.add(r.text);
      missing.push({ key: r.text, domain: r.domain, site: r.where, kind: r.kind });
    }
  }

  console.log(`${statics.keys.size} keys in code (${statics.files} files scanned)${runtime ? `, ${new Set(runtime.map((r) => r.text)).size} figure strings at run time` : ''}; ` +
    `${lang === 'en' ? 'English needs no dictionary' : `${index.exact.size} entries and ${index.patterns.length} patterns in src/i18n/${lang}/`}`);
  for (const [d, list] of [...byDomain].sort()) console.log(`  ${d.padEnd(12)} ${list.length} keys`);
  if (statics.dynamic.length) console.log(`  ${statics.dynamic.length} calls with a non-literal key (see --list)`);

  if (flag('list')) {
    for (const [d, list] of [...byDomain].sort()) {
      console.log(`\n${d}`);
      for (const [k, e] of list.sort((a, b) => a[0].localeCompare(b[0]))) {
        const tr = index.exact.get(k)?.value;
        console.log(`  ${JSON.stringify(k)}${lang !== 'en' ? `  →  ${tr === undefined ? '(missing)' : JSON.stringify(tr)}` : ''}   ${e.sites[0].file}:${e.sites[0].line}${e.sites.length > 1 ? ` +${e.sites.length - 1}` : ''}`);
      }
    }
    if (statics.dynamic.length) {
      console.log('\nnon-literal keys (each must reach a msg() literal or a pattern)');
      for (const x of statics.dynamic) console.log(`  ${x.file}:${x.line}  ${x.via}(${x.code})`);
    }
    if (runtime) {
      console.log('\nfigure strings at run time');
      const seen = new Set();
      for (const r of runtime) {
        const k = `${r.domain}\u0000${r.text}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const hit = index.find(r.text);
        console.log(`  [${r.domain}] ${r.kind.padEnd(12)} ${JSON.stringify(r.text)}${lang !== 'en' ? `  →  ${hit ? JSON.stringify(hit.value) + (hit.re ? ' (pattern)' : '') : '(missing)'}` : ''}`);
      }
    }
  }
  if (flag('missing') && lang !== 'en') {
    const groups = new Map();
    for (const m of missing) {
      const f = m.domain ? `src/i18n/${lang}/${m.domain}.js` : '(no domain: add a rule to DOMAIN_RULES in scripts/i18n-strings.mjs)';
      if (!groups.has(f)) groups.set(f, []);
      groups.get(f).push(m);
    }
    console.log(missing.length ? `\n${missing.length} keys missing in ${lang}:` : `\nno keys missing in ${lang}${runtime ? '' : ' (code keys only; add --runtime <audit.json> for figure strings)'}`);
    for (const [f, list] of groups) {
      console.log(`\n${f}`);
      for (const m of list) console.log(`  ${JSON.stringify(m.key)}   ${m.site}${m.kind !== 'code' ? ` (${m.kind})` : ''}`);
    }
  }
  const out = opt('json');
  if (out) {
    writeFileSync(resolve(out), JSON.stringify({
      generatedAt: new Date().toISOString(),
      lang,
      keys: [...statics.keys].map(([key, e]) => ({ key, domains: [...e.domains], sites: e.sites, translation: index.exact.get(key)?.value ?? null })),
      dynamic: statics.dynamic,
      patterns: index.patterns.map(({ key, value, domain }) => ({ key, value, domain })),
      runtime,
      missing,
    }, null, 2));
    console.log(`\nwrote ${out}`);
  }
  process.exit(flag('missing') && missing.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
