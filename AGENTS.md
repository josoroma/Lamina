# Lamina repository

The shared authoring skill is `.claude/skills/lamina/SKILL.md`. Read it for book/engine/figure work or scaffolding another series.

The first series is the self-contained app in `series/lamina/`; its `src/`, `scripts/`, `public/` and `docs/` paths are relative to that directory. The root package delegates to this npm workspace. Keep future series independently runnable, with their own manifests and assets. Do not move runtime caches or Python environments into source control.

Use `npm test`, `npm run validate:all` and `npm run build` from the repository root. Browser checks target the relevant running series. A successful build does not replace visual review for anatomy, figure or page changes.

The Pages workflow publishes the built first series to `/Lamina/`. Narration on static hosting uses prepared recordings; the local Python backend is a development service.
