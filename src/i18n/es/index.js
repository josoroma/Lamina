// The Spanish dictionaries, one file per owner area, merged by loadLang('es')
// (src/i18n/index.js). Each file's default export holds its explicit keys
// (exact English strings, never compiled); its optional named export
// PATTERNS holds match patterns for strings built at run time, each with a
// literal word of 3 or more letters. A key defined twice with different
// values is a validator error. A new figure subject adds its file here
// (scripts/new-subject.mjs).
import * as shell from './shell.js';
import * as app from './app.js';
import * as ui from './ui.js';
import * as typeset from './typeset.js';
import * as exportStrings from './export.js';
import * as snakes from './snakes.js';
import * as flowers from './flowers.js';
import * as skulls from './skulls.js';

const FILES = { shell, app, ui, typeset, export: exportStrings, snakes, flowers, skulls };
// read through a function so a file without PATTERNS is no missing-export warning
const pick = (name) => Object.fromEntries(Object.entries(FILES).map(([domain, mod]) => [domain, mod[name] ?? {}]));

/** domain → explicit keys (each file's default export) */
export const DOMAINS = pick('default');
/** domain → match patterns (each file's PATTERNS export, if any) */
export const PATTERNS = pick('PATTERNS');
