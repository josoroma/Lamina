# Serpientes

*A Living Atlas of Costa Rican Snakes* / *Atlas vivo de las serpientes de Costa Rica*  
Lámina · Volume I · Josoroma

Open locally after `npm run dev`: [English](http://localhost:5173/#/en/serpientes) · [Español](http://localhost:5173/#/es/serpientes).
Use the reader’s English / Español switch to change editions while keeping your
page and figure settings. Add `?plate=1&t=2.4` after the book ID to open a
specific plate and moment.

Seven Costa Rican snake plates combine natural-history text with rotatable figures, skin and skeleton layers, anatomical labels and five-second loops. The revised heads include visible eyes, pupils, nostrils, mouth lines and species-specific features. The béquer plate uses a grey-beige boa pattern with dark saddles and a recognizable rat with a pointed muzzle, ears, paws, whiskers and a long tail.

## Plates

| Plate | Subject | Captures |
|---|---|---|
| I | Terciopelo · *Bothrops asper* | [English](../outputs/en/serpientes/plate-01-terciopelo.png) · [Español](../outputs/es/serpientes/plate-01-terciopelo.png) |
| II | Bocaracá · *Bothriechis nigroadspersus* | [English](../outputs/en/serpientes/plate-02-bocaraca.png) · [Español](../outputs/es/serpientes/plate-02-bocaraca.png) |
| III | Coral · *Micrurus nigrocinctus* | [English](../outputs/en/serpientes/plate-03-coral.png) · [Español](../outputs/es/serpientes/plate-03-coral.png) |
| IV | Cascabel · *Crotalus simus* | [English](../outputs/en/serpientes/plate-04-cascabel.png) · [Español](../outputs/es/serpientes/plate-04-cascabel.png) |
| V | Matabuey · *Lachesis stenophrys* | [English](../outputs/en/serpientes/plate-05-matabuey.png) · [Español](../outputs/es/serpientes/plate-05-matabuey.png) |
| VI | Serpiente marina · *Hydrophis platurus* | [English](../outputs/en/serpientes/plate-06-serpiente-marina.png) · [Español](../outputs/es/serpientes/plate-06-serpiente-marina.png) |
| VII | Béquer · *Boa imperator* | [English](../outputs/en/serpientes/plate-07-bequer.png) · [Español](../outputs/es/serpientes/plate-07-bequer.png) |

Rotate by dragging the figure, double-click to inspect, and use Layers, Labels,
Explode and the timeline to explore. The Export control saves colour SVG, line
SVG or PNG with annotations in the selected language.

## Author and prompt pages

The supplied [Josoroma wordmark](../../public/author/josoroma.svg) appears on
both cloth covers in gold foil, and in its original colours on the title
and imprint pages. A final “How this book was made” leaf contains:

- the [original series prompt](../prompts/00-original-brief.md), printed verbatim in English;
- this book’s brief from the [build workflow](../prompts/02-build-workflow.js);
- labeled Spanish translations in the Español edition.

The printable texts live in [making/index.js](../../src/books/making/index.js)
and [making/es.js](../../src/books/making/es.js). The [bilingual finishing notes](../prompts/06-bilingual.md)
record the later request and implementation history.

## Captures and source

| View | Captures |
|---|---|
| Front cover | [English](../outputs/en/serpientes/00-cover.png) · [Español](../outputs/es/serpientes/00-cover.png) |
| Back cover | [English](../outputs/en/serpientes/93-back-cover.png) · [Español](../outputs/es/serpientes/93-back-cover.png) |
| Original prompt, beside the glossary | [English](../outputs/en/serpientes/91-glossary.png) · [Español](../outputs/es/serpientes/91-glossary.png) |
| Book’s brief | [English](../outputs/en/serpientes/92-making.png) · [Español](../outputs/es/serpientes/92-making.png) |
| Reader controls | [English](../outputs/en/serpientes/reader-ui.png) · [Español](../outputs/es/serpientes/reader-ui.png) |
| Phone view | [English](../outputs/en/serpientes/phone.png) · [Español](../outputs/es/serpientes/phone.png) |

Content: [English manifest](../../src/books/serpientes.js) · [Spanish manifest](../../src/books/es/serpientes.js).  
Evidence: [research and fact-check log](serpientes-research.md) · [Spanish translation notes](serpientes-es-notes.md).

To regenerate this book’s images against a running production preview:

```bash
LAMINA_URL=http://127.0.0.1:4173 npm run capture -- --lang both --book serpientes
```

The [English manifest](../outputs/en/manifest.json) and [Spanish manifest](../outputs/es/manifest.json)
record capture runs. Vector exports are in [English](../outputs/en/serpientes/svg/)
and [Español](../outputs/es/serpientes/svg/); add `--no-svg` for images only. See the
[documentation index](../README.md) for the complete workflow and output layout.
