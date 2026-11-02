# Organizing independent series

The Lamina repository is a catalog with a shared authoring skill and a
self-contained first series:

```text
.claude/skills/lamina/      authoring instructions, templates and helpers
series.json                catalog metadata and default series
series/lamina/
  series.json              series identity, language and book list
  package.json             app dependencies and commands
  src/                     reader engine, kits, six books and figure subjects
  public/                  runtime assets and their provenance
  scripts/                 validation, captures and narration tooling
  docs/                    source records, book guides and captured outputs
```

The first series is named **Lamina** and contains Snakes, Flowers, Skulls,
Atoms, Cells and Campfire by the Beach, all in English and Español. Its site is
`https://josoroma.github.io/Lamina/`. Book routes retain their stable IDs, for
example `#/es/fogata` and `#/en/atomos`.

A series is not restricted to six books. Its runtime book list is `BOOKS` in
`src/books/index.js`; `series.json` is the discoverable series description.
Keep its `books` list consistent when adding/removing a book.

## Start a separate repository

From the Lamina catalog root:

```bash
node .claude/skills/lamina/scripts/bootstrap.mjs ../ocean-series --id ocean-series --title "Ocean series" --author "Your name"
cd ../ocean-series
npm ci
npm run dev
```

The resulting directory is a standalone app. It contains a bilingual starter
and a demo figure; their draft fields need research and replacement. It has no
dependency on the original checkout at runtime. Its copied skill helpers work
from that repository root. Its generated `AGENTS.md` points coding agents to
the copied skill and standalone app paths; an existing `AGENTS.md` is preserved,
including when `--force` is used. Bootstrap deliberately does not initialize Git,
create a remote, commit or deploy. Those are separate actions when requested.

Add `--with-books` to copy all books and subjects in the selected source series.
`--series <id>` selects a source under the catalog's `series/` folder. The
source follows the catalog's default (`lamina` here), or the only available
series when the default is absent. A destination must be empty unless `--force` is explicitly
provided. `--force` copies over matching files but does not clean unrelated
files; use a new directory for a fresh series.

## Work on a series in the catalog

From the catalog root:

```bash
node .claude/skills/lamina/scripts/new-book.mjs corals --series lamina --title "Corals" --subtitle "A living reef" --subtitle-es "Un arrecife vivo"
node .claude/skills/lamina/scripts/new-subject.mjs coral --dir corals --series lamina
```

Both commands resolve the selected app and leave other series unchanged. They
also accept a standalone series checkout as the working directory. Run the
app's validation/capture commands inside its directory (for example
`cd series/lamina`), or use the catalog's npm workspace wrappers.

An entire existing series folder can also be copied directly to a new
repository. Include the shared `.claude/skills/lamina/` folder there to retain
authoring helpers. Keep the source asset licenses and documentation with the
series. Do not copy dependency folders, build output, local caches, virtual
environments or Git history as source assets.

## Publishing

A series builds to its own `dist/` with `npm run build`. The catalog's GitHub
Pages workflow publishes `series/lamina/dist/` at `/Lamina/`. Another repository
can publish its own build at its own project path; relative asset URLs are
used by the reader. The Python narration generator needs a server environment;
static hosting can play bundled narration but cannot run that backend itself.

The starter omits the source series' narration recordings, because they belong
to its exact page text. Generate new recordings before publishing a narrated
series and run `node scripts/narration-coverage.mjs` to check every current left
page. During authoring, `--allow-missing` permits incomplete coverage while
still rejecting stale or mismatched recordings. Copying with `--with-books`
includes the selected series' recordings; changing its text requires updating
those recordings too.
