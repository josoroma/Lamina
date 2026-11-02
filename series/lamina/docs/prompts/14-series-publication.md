# Lamina series and publication

## Request

> estas seis laminas si tuvieras que agruparlas en folders para series, de esa manera yo puedo crear otra serie de seis u otra serie y manejarla en otro repo. so this firs serie is going to be named Lamina as the repo with the skill:
>
> https://github.com/josoroma/Lamina
>
> please commit the whole code of Lamina and of lamina serie, add the first serie as https://josoroma.github.io/Lamina

The user chose to wait for complete English and Spanish narration before
publication, rather than publish with missing recordings.

## Organization

The six books and their complete application now live in `series/lamina/`.
The repository root contains the shared authoring skill, series catalog, npm
workspace commands and GitHub Pages workflow. Existing book IDs and hash routes
are preserved. The engine remains inside the series so the application can also
run independently of the catalog.

The skill's bootstrap helper creates a separate repository-ready application
with a bilingual starter. `--with-books` instead copies the selected complete
series. New book and subject helpers resolve either a catalog series or a
standalone application. No Git repository or remote is created by those helpers.

## Narration on static hosting

GitHub Pages cannot run the local Python synthesis service. Production therefore
loads pre-generated Chatterbox Multilingual V3 MP3 clips through a manifest.
The page keys come from the same current-left-page text extraction as the reader.
Changing pages or language cancels the current playback. A stale recording is
rejected instead of being played for different page text.

Generation is resumable and records exact model, voice and synthesis provenance.
The deployment workflow checks complete coverage of all current left pages in
both languages before it builds and publishes. Local development retains the
on-demand service. See [narration.md](../narration.md) for the model revisions,
commands and verification limits.

## Verification

The workspace tests and bilingual validation pass; existing content validation
warnings remain documented by their command output. The production build was
served beneath `/Lamina/` locally: both libraries and all six books in both
languages loaded without missing assets or browser errors. Real English and
Spanish clips decoded and played in the browser using only static GET requests.
This playback check is not a perceptual listening review.

Capture manifests now use application-relative paths rather than machine-specific
absolute paths. Character provenance, Three.js licensing and font license notices
remain with the series and its published assets.

An independent portability check created a starter and a full six-book copy,
installed each from its lockfile, and passed their tests and production builds.
The full copy's bilingual validation had no errors. Creating another application
from the copied skill used that standalone source, without reaching back into
the original checkout. Duplicate book/subject requests failed without overwriting
files. A starter-only license-index link to omitted character assets was corrected;
the retained package and font notices were verified unchanged.

The completed recording set contains 1,567 unique MP3 clips covering all 134
narratable left pages across the twelve editions. The strict Node coverage check
passes against the exact current text, language, model revision and chunk order.
