# Calaveras

*Drawing Skulls: A Constructive Method* / *Dibujar el cráneo: un método constructivo*  
Lámina · Volume III · Josoroma

Open locally after `npm run dev`: [English](http://localhost:5173/#/en/calaveras) · [Español](http://localhost:5173/#/es/calaveras).
Use the reader’s English / Español switch to change editions while keeping your
page and figure settings. Add `?plate=1&t=2.4` after the book ID to open a
specific plate and moment.

Six drawing lessons build skulls from large forms through guides, planes and details. Each lesson pairs three construction panels with a rotatable figure and a five-second sequence. The final lesson combines an engraved skull with an eyelash pitviper whose face has visible eyes and anatomical detail.

## Plates

| Plate | Subject | Captures |
|---|---|---|
| I | Frontal View / Vista frontal | [English](../outputs/en/calaveras/plate-01-frontal.png) · [Español](../outputs/es/calaveras/plate-01-frontal.png) |
| II | Three-Quarter, Open Jaw / Tres cuartos, mandíbula abierta | [English](../outputs/en/calaveras/plate-02-open-jaw.png) · [Español](../outputs/es/calaveras/plate-02-open-jaw.png) |
| III | Profile / Perfil | [English](../outputs/en/calaveras/plate-03-profile.png) · [Español](../outputs/es/calaveras/plate-03-profile.png) |
| IV | The Bones / Los huesos del cráneo | [English](../outputs/en/calaveras/plate-04-bones.png) · [Español](../outputs/es/calaveras/plate-04-bones.png) |
| V | Jaguar / Cráneo de jaguar | [English](../outputs/en/calaveras/plate-05-jaguar.png) · [Español](../outputs/es/calaveras/plate-05-jaguar.png) |
| VI | Skull & Snake / Calavera y serpiente | [English](../outputs/en/calaveras/plate-06-skull-and-snake.png) · [Español](../outputs/es/calaveras/plate-06-skull-and-snake.png) |

Rotate by dragging the figure, double-click to inspect, and use Layers, Labels,
Explode and the timeline to explore. The Export control saves colour SVG, line
SVG or PNG with annotations in the selected language.

## Author and prompt pages

The supplied [Josoroma wordmark](../../public/author/josoroma.svg) appears on
both cloth covers in silver foil, and in its original colours on the title
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
| Front cover | [English](../outputs/en/calaveras/00-cover.png) · [Español](../outputs/es/calaveras/00-cover.png) |
| Back cover | [English](../outputs/en/calaveras/93-back-cover.png) · [Español](../outputs/es/calaveras/93-back-cover.png) |
| Original prompt, beside the glossary | [English](../outputs/en/calaveras/91-glossary.png) · [Español](../outputs/es/calaveras/91-glossary.png) |
| Book’s brief | [English](../outputs/en/calaveras/92-making.png) · [Español](../outputs/es/calaveras/92-making.png) |
| Reader controls | [English](../outputs/en/calaveras/reader-ui.png) · [Español](../outputs/es/calaveras/reader-ui.png) |
| Phone view | [English](../outputs/en/calaveras/phone.png) · [Español](../outputs/es/calaveras/phone.png) |

Content: [English manifest](../../src/books/calaveras.js) · [Spanish manifest](../../src/books/es/calaveras.js).  
Evidence: [research and fact-check log](calaveras-research.md) · [Spanish translation notes](calaveras-es-notes.md).

To regenerate this book’s images against a running production preview:

```bash
LAMINA_URL=http://127.0.0.1:4173 npm run capture -- --lang both --book calaveras
```

The [English manifest](../outputs/en/manifest.json) and [Spanish manifest](../outputs/es/manifest.json)
record capture runs. Vector exports are in [English](../outputs/en/calaveras/svg/)
and [Español](../outputs/es/calaveras/svg/); add `--no-svg` for images only. See the
[documentation index](../README.md) for the complete workflow and output layout.
