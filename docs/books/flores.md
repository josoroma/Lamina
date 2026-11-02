# Flores

*A Living Herbarium of Costa Rica* / *Herbario vivo de Costa Rica*  
Lámina · Volume II · Josoroma

Open locally after `npm run dev`: [English](http://localhost:5173/#/en/flores) · [Español](http://localhost:5173/#/es/flores).
Use the reader’s English / Español switch to change editions while keeping your
page and figure settings. Add `?plate=1&t=2.4` after the book ID to open a
specific plate and moment.

Six Costa Rican flower plates pair natural history with rotatable, dissectible figures. Open the layers to inspect petals, sepals and reproductive structures, or play the five-second sequences showing opening, pollination and movement.

## Plates

| Plate | Subject | Captures |
|---|---|---|
| I | Guaria morada · *Guarianthe skinneri* | [English](../outputs/en/flores/plate-01-guaria-morada.png) · [Español](../outputs/es/flores/plate-01-guaria-morada.png) |
| II | Platanilla · *Heliconia wagneriana* | [English](../outputs/en/flores/plate-02-platanilla.png) · [Español](../outputs/es/flores/plate-02-platanilla.png) |
| III | Granadilla de monte · *Passiflora vitifolia* | [English](../outputs/en/flores/plate-03-granadilla-de-monte.png) · [Español](../outputs/es/flores/plate-03-granadilla-de-monte.png) |
| IV | Labios de mujer · *Palicourea elata* | [English](../outputs/en/flores/plate-04-labios-de-mujer.png) · [Español](../outputs/es/flores/plate-04-labios-de-mujer.png) |
| V | Cortez amarillo · *Handroanthus ochraceus* | [English](../outputs/en/flores/plate-05-cortez-amarillo.png) · [Español](../outputs/es/flores/plate-05-cortez-amarillo.png) |
| VI | Nenúfar · *Nymphaea ampla* | [English](../outputs/en/flores/plate-06-nenufar.png) · [Español](../outputs/es/flores/plate-06-nenufar.png) |

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
| Front cover | [English](../outputs/en/flores/00-cover.png) · [Español](../outputs/es/flores/00-cover.png) |
| Back cover | [English](../outputs/en/flores/93-back-cover.png) · [Español](../outputs/es/flores/93-back-cover.png) |
| Original prompt, beside the glossary | [English](../outputs/en/flores/91-glossary.png) · [Español](../outputs/es/flores/91-glossary.png) |
| Book’s brief | [English](../outputs/en/flores/92-making.png) · [Español](../outputs/es/flores/92-making.png) |
| Reader controls | [English](../outputs/en/flores/reader-ui.png) · [Español](../outputs/es/flores/reader-ui.png) |
| Phone view | [English](../outputs/en/flores/phone.png) · [Español](../outputs/es/flores/phone.png) |

Content: [English manifest](../../src/books/flores.js) · [Spanish manifest](../../src/books/es/flores.js).  
Evidence: [research and fact-check log](flores-research.md) · [Spanish translation notes](flores-es-notes.md).

To regenerate this book’s images against a running production preview:

```bash
LAMINA_URL=http://127.0.0.1:4173 npm run capture -- --lang both --book flores
```

The [English manifest](../outputs/en/manifest.json) and [Spanish manifest](../outputs/es/manifest.json)
record capture runs. Vector exports are in [English](../outputs/en/flores/svg/)
and [Español](../outputs/es/flores/svg/); add `--no-svg` for images only. See the
[documentation index](../README.md) for the complete workflow and output layout.
