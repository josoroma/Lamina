# Design: the look of a living plate

Lámina books should feel like a rare natural-history folio that has come to life:
quiet, precise, generous with white space, rich in colour only where the subject is.

## Stage

- **Pure white** (#ffffff) everywhere outside the book: the canvas clears to transparent
  over CSS white. Never set `scene.background`, because it gets tone-mapped to grey.
- The book floats with a tight, soft contact shadow and a barely perceptible drift.
- Camera at ~45° elevation, so pop-ups read in three-quarter view and text stays legible.
  On landscape the open book spans ~95% of the width; on portrait, one page at a time.

## The page

| element | spec |
|---|---|
| paper | warm white `#fbf8f1` (engraving books: `#ffffff`), faint fibre grain, gutter shade |
| margins | outer 9%, inner 11%, top 8%, bottom 10% |
| display | Cormorant Garamond 500/600 (drawing books: Oswald 500/600, uppercase, vertical) |
| body | EB Garamond 400, ~11.5 pt equivalent, 1.45 leading, justified + hyphenated, ragged-right fallback |
| labels / kickers | IBM Plex Sans Condensed, letter-spaced small caps |
| numbers | IBM Plex Mono (facts, scale notes, folios) |
| running heads | letter-spaced small caps at the head; folios at the outer foot |
| verso (plate text) | kicker (PLATE III) → common name → *scientific name* + authority → family → status chip → lede → body → field notes (small-caps label over value, stacked) → Look closer → Did you know? |
| recto (figure page) | running head, plate number, the pop-up's printed ground ellipse, caption (italic), scale note, quiet instruction line |
| lesson verso (drawing books) | a 150 px vertical condensed title band on the outer edge → kicker (LESSON IV) and chips → subtitle → lede → body in columns → pro-tip card → three numbered construction panels (`drawStep`) → common mistakes · proportions · look closer, one column under each panel |
| lesson recto | the figure page with a drawing grid; the lesson's *Did you know?* under the caption (the plate mark ends at 0.775 H instead of 0.8 H to make room) |
| making leaf | kicker *How this book was made* (accent small caps) → title (*The prompt* / *This book's brief*) → short rule → italic lead → the quoted text inside a 3 px accent rule (ink on engraving books), 26 design px, never under 25 → its source path in mono; in Spanish a small-caps line *Traducción del original en inglés* above the quote. The prompt keeps its lines, blank lines and bullets; the brief is one paragraph, sunk like the note. Both are verbatim, so both are ragged right and unhyphenated in both languages: lines break at spaces only, and URLs, file names, binomials and code tokens stay whole. The last page ends with one italic line on the later prompts in `docs/prompts/` |

## The author

The author's wordmark (`byline.mark`, drawn from the path data of
`public/author/<mark>.svg` by `typeset/marks.js`) is part of the binding:

| surface | treatment | placement (fractions of the board or page) |
|---|---|---|
| front board | foil-stamped in the book's own foil (gold, silver), with the title's bevel and glint | ink width 0.26 W, under the medallion; the imprint line below it |
| back board | foil-stamped, smaller | ink width 0.20 W, between the title and the imprint line |
| title page | its own colours: letters `#c92b60`, the final *a* `#087fa9` | ink width 0.26 W under a small-caps *by* / *por*; the fleuron moves under it |
| imprint | its own colours | ink width 0.16 W, left on the text column under a small-caps *Author* / *Autor* |
| SVG export | text only in the credit line | *Serpientes · Josoroma · Lámina Natural History Press* |

A larger mark reads louder than the title — 0.30 W was tried and rejected. The
library shelf shows the front boards, so it shows the mark; screen readers get
*by Josoroma* / *por Josoroma* on the covers and in the shelf's link names.

## Two languages

- Every page is typeset in its edition's language with that language's conventions:
  Spanish hyphenation (syllabic, vowels never split, `ch ll rr` whole, never before
  an *h*), «…» quotation marks, decimal comma, `85 %`, glossary in Spanish order.
  Both editions print the same pages in the same places.
- In Spanish, everything the reader sees is Spanish: pages, chrome, pills and their
  cards, layer names and hints, beats, captions, toasts, the SVG key and titles. Only
  proper names, binomials, bibliographic entries and the English originals on the
  English making leaf stay as written. A structure has one name per language: the
  pill and the "Look closer" run-in say the same words.
- **The switch** is quiet type, not a flag or a globe: *English · Español* (autonyms,
  each in its own language), 12.5 px UI sans; the checked one in ink, weight 560,
  with a 1.5 px accent underline; the other muted, weight 450; a muted `·` between;
  *EN · ES* where width is short (phones, the library under 480 px). Reader: in the
  top bar after the book title (`← Library │ SERPIENTES │ English · Español`); on
  phones inside the top pill after the plate name, which gives up width first.
  Library: the right end of the header row. It hides with the top bar when idle;
  no transition under reduced motion.
- Interface copy in Spanish uses infinitives and nouns (*Reproducir la animación*,
  *Página siguiente*), so it never has to choose between *tú*, *usted* and *vos*;
  keyboard shortcuts keep their keys, only labels and key-cap names translate.

## The figure

- **Ink outlines** ~1.2 px at book zoom, slightly wobbly (hand-inked), on closed meshes only.
- **Engraved hatching** lives in the fall-off and cast shadows (lithograph), or carries
  all the tone (engraving). Lines follow form: rings around a body (`hatchCoord`), veins
  along a petal. Never on lit faces in lithograph style.
- **Colour** is natural and saturated where nature is (coral-snake red, orchid magenta),
  never neon. One accent colour per book for UI and chips.
- **Composition**: the figure stands at page-local (0.5, −0.02), fills at most
  0.78 × 0.86 of the page footprint and 0.6 in height. Props stay minimal (a branch,
  a water slab, a prey animal at real scale — the black rat of plate VII) and use the
  same ink look.
- **Faces**: a head reads as an animal, not a tube — eyes with iris, pupil and a
  catchlight, nostrils, pits, lip and head scales and the species' own head markings,
  sized from measurements; stripes and the pupil keep a pixel floor, so a small head
  on the page never goes blank; labels ring an eye or a pit rather than dot it.
- **Layers** reveal, never clutter: x-ray the skin (fresnel ghost) to show the skeleton.
  Explode along meaningful axes (floral axis, bone-centre outward, rattle segments).

## The interface

- One bottom pill: contents · prev · play (5 s ring) · plate title · next | layers · export · sound · fullscreen.
  It hides when idle and never covers the figure's centre. A top bar holds the way
  back to the library, the book's title and the language switch.
- Label pills keep their text whole: ≤ 110 px of text at 12.5 px in every language
  (a translation that needs more is shortened, not ellipsised), and stay inside the
  viewport, also zoomed in on a phone.
- Labels sit in the recto margins, joined to their anchors by hairline leaders.
- System UI font, 1.5 px icons, 44 px touch targets, AA contrast, visible focus.
- Every interaction has a keyboard path; reduced motion makes turns instant and pauses loops.
