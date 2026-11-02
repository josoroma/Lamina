#!/usr/bin/env node
// Reuse the reader's exact physical-left-page selection and chunk boundaries.
import { BOOKS } from '../src/books/index.js';
import { loadEdition } from '../src/i18n/edition.js';
import { buildSides } from '../src/engine/typeset/sides.js';
import { narrationForLeftPage } from '../src/app/narration-text.js';
import { pathToFileURL } from 'node:url';

export async function buildNarrationPlan() {
  const pages = [];
  for (const { id } of BOOKS) for (const lang of ['en', 'es']) {
    const sides = buildSides(await loadEdition(id, lang));
    for (let opened = 0; opened <= sides.leafCount; opened++) {
      const page = narrationForLeftPage(sides, opened, lang);
      if (page) pages.push(page);
    }
  }
  return { version: 1, pages };
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.stdout.write(JSON.stringify(await buildNarrationPlan(), null, 2));
}
