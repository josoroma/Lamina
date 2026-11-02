// Resolve a self-contained series app in either the Lamina catalog or its own repo.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const isProject = (path) => existsSync(resolve(path, 'src/books/index.js'))
  && existsSync(resolve(path, 'src/engine/book/Book.js'));

export function option(args, name, fallback) {
  const at = args.indexOf(`--${name}`);
  if (at < 0) return fallback;
  const value = args[at + 1];
  if (!value || value.startsWith('--')) throw new Error(`--${name} requires a value`);
  return value;
}

export function findProjectRoot({ from = process.cwd(), series } = {}) {
  if (series && !/^[a-z][a-z0-9-]*$/.test(series)) throw new Error('Series ids use lowercase letters, digits and hyphens');
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    // A standalone checkout, or a command invoked inside one series, is explicit.
    if (isProject(dir)) {
      const metadata = resolve(dir, 'series.json');
      const id = existsSync(metadata) ? JSON.parse(readFileSync(metadata, 'utf8')).id : undefined;
      if (!series || !id || id === series) return dir;
    }
    const catalog = resolve(dir, 'series');
    if (existsSync(catalog)) {
      if (series) {
        const selected = resolve(catalog, series);
        if (isProject(selected)) return selected;
        throw new Error(`No runnable series "${series}" in ${catalog}`);
      }
      const manifest = resolve(dir, 'series.json');
      const defaultId = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')).default : 'lamina';
      const primary = resolve(catalog, /^[a-z][a-z0-9-]*$/.test(defaultId ?? '') ? defaultId : 'lamina');
      if (isProject(primary)) return primary;
      const candidates = readdirSync(catalog).map(name => resolve(catalog, name)).filter(isProject);
      if (candidates.length === 1) return candidates[0];
      if (candidates.length > 1) throw new Error(`Choose a series with --series <id> in ${catalog}`);
    }
    if (dirname(dir) === dir) break;
  }
  throw new Error('Run inside a Lámina app or catalog (series/<id>/src/books/index.js not found)');
}
