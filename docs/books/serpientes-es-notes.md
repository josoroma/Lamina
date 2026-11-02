# Serpientes — Spanish edition: translation notes

> Companion to [`src/books/es/serpientes.js`](../../src/books/es/serpientes.js), the Spanish
> edition of *Serpientes: A Living Atlas of Costa Rican Snakes*. Translated on 1 November 2026
> from the English manifest as it stood at 21:59 (`.scratch/bilingual/en-snapshot/serpientes.js`).
> House rules are in [`es-style.md`](es-style.md) (which appeared while this file was being
> written; the edition was then re-checked and aligned with it); the facts and their sources are
> in [`serpientes-research.md`](serpientes-research.md). This file records only what is specific
> to this book: term choices with their sources, what could not be rendered word for word, and
> open questions. **§7 Sync** (2 November) carries the English edits made after the snapshot and
> sets the look-closer names to the figure pills (lead decision L1); it supersedes the sections
> above where they differ.

## 1. Status

- **Shape**: same keys, order and array lengths as the snapshot; `locale: 'es'`; every
  `lookCloser` row has a `name` (≤ 3 words). Ids, figure params, beat times, label ids, theme,
  binomials, authorities and plate source lines are identical to English; `back.sources` is
  byte-identical except *(consulted November 2026)* → *(consultado en noviembre de 2026)*.
- **Checks** (scratch scripts in `.scratch/bilingual/serp-es/`): `check.mjs` — shape, 62 ids,
  number parity in all 298 text leaves, beat times: no differences. The project's own
  `validateSpanish` (`scripts/validate-books.mjs`) run against the snapshot (`val-snapshot.mjs`):
  0 errors, 0 warnings, 5 notes (two binomials and the headwords *Crotalinae*, *Elapidae*,
  *Tobobas*, identical by design).
- **Against the live English manifest**, `node scripts/validate-books.mjs serpientes --lang es`
  reports 7 errors, all caused by the English edits made after the snapshot (a fifth source on
  plate VII, a nineteenth entry in `back.sources`, a two-line colophon). The sync step carries them.
- **Fit** (`--fit`, dev server, 1 Nov 2026 ~22:50): every Spanish side at 1.000 except *Sources*
  (0.925; English 0.950 with its new short colophon — the Spanish colophon is still the six-line
  snapshot version until the sync) and the making prompt (not this file). Plate IV first set at
  0.975; two look-closer notes were shortened to bring it to 1.000. Re-run after the review
  (§6.3): the same.
- **Length** (characters, markup stripped; after the review, §6.3): every plate's text ≤ 1.05 ×
  English (I 1.034, II 1.050, III 1.050, IV 1.031, V 1.049, VI 1.039, VII 1.046); whole book
  1.054. Strings over 1.10 are listed with their reasons in §6.3.

## 2. Term decisions specific to this book

Printed page numbers of the ICP handbook (**ICP19**: Sasa, Bonilla & Chaves 2019) are PDF page + 2.
**ICP-sp** = the ICP's Spanish species pages,
`https://www.icp.ucr.ac.cr/es/informacion-y-materiales/serpientes-venenosas-de-costa-rica/<species>`,
opened 1 Nov 2026 for *bothrops-asper, bothriechis-schlegelii, micrurus-nigrocinctus,
crotalus-simus, lachesis-stenophrys, hydrophis-platura*.

| English | Spanish used | why / source |
|---|---|---|
| loreal pit; heat sensor | *foseta loreal*; *termorreceptor*, *órgano termosensor* | ICP19 pp. 14–15, 42 and glossary; es-style §3.1 |
| “four nostrils” | «cuatro narices» | ICP19 p. 40, *tobobas de cuatro narices* |
| keeled (scales) | *quilladas*, *fuertemente quillada* | ICP-sp (*Bothrops asper*, *Crotalus simus*, *Lachesis stenophrys*: «fuertemente quilladas») |
| eyelash scales | *escamas supraoculares*; «pestañas» | ICP-sp (*B. schlegelii*: «escama supraocular»); ICP19 p. 44 has *supraciliar*; name from es-style §3.6 |
| eyelash vipers (generic) | *tobobas de pestañas* | ICP-sp «toboba de pestañas»; es-style §3.1 |
| hinged, hollow fangs | *colmillos huecos y móviles* (prose); name *Colmillos* | ICP19 glossary *Víbora*: «colmillos móviles huecos» |
| fixed front fangs | *colmillos fijos* (al frente de la mandíbula superior) | ICP19 p. 36 «dos pequeños colmillos fijos en la mandíbula superior» |
| semi-burrowing; swamp eels; caecilians | *semifosorial*; *anguilas de pantano*; *cecílidos* | ICP19 p. 35 |
| the rattle; its segments; shed | *el cascabel* (*el chischil* where *la cascabel* is in the same sentence); *segmentos*; *muda* | ICP-sp (*C. simus*: «un cascabel o chischil», «capas córneas entrelazadas»); ICP19 pp. 12, 53 («cambio de piel o muda»); es-style §3.1 |
| rattle button | *botón* | UNAM Global, «Cascabel de cola negra…» (18 Jul 2025): «una estructura inicial conocida como botón» — https://unamglobal.unam.mx/global_revista/cascabel-cola-negra-ecosistema-mexico/ |
| newborns (cascabel) | *neonatos*; *crías* in the short note | ICP19 p. 54 «los neonatos y juveniles poseen venenos neurotóxicos» |
| crotoxin; metalloproteinases | *crotoxina*; *metaloproteinasas* | ICP researcher page (A. Rucavado): «metaloproteinasas de venenos de serpiente» — https://icp.ucr.ac.cr/es/investigadores/alexandra-rucavado-romero ; Rev. Biol. Trop. 44(2): 349–352 (1996); *crotoxina*: Wikipedia ES, «Crotoxina» (secondary) |
| polyvalent antivenom | *suero antiofídico polivalente* | ICP19 pp. 61, 64; Rev. Biol. Trop. 44(2) (1996) |
| tail spine (matabuey) | *espina caudal*; «la cola acaba en una espina corta y dura» | ICP-sp (*L. stenophrys*: «La cola termina en una pequeña espina puntiaguda») |
| clutch | *puesta* | es-style §3.1 (DLE *puesta*); ICP-sp «poniendo hasta 18 huevos» |
| burrows dug by armadillos | *madrigueras excavadas por armadillos* | ICP-sp (*L. stenophrys*), verbatim |
| sea snake; paddle tail | *serpiente marina*; *Cola aplanada* (name), «un remo» (text) | ICP19 p. 33 («la forma de remo de la cola», «cola aplanada lateralmente»); ICP-sp |
| salt gland | *glándula de sal* | Hispanopedia, «Glándula salina (zoología)» (uses both *glándula salina* and *glándula de sal*) — https://es.hispanopedia.com/wiki/Gl%C3%A1ndula_salina_(zoolog%C3%ADa) |
| strandings; driven ashore | *varamientos*; «las arrojan hacia la costa» | ICP19 p. 33 (wording followed) |
| pelvic spur | *espolón pélvico* | Hispanopedia, «Espolón (zoología)»: «espolones pélvicos o anales» — https://es.hispanopedia.com/wiki/Espol%C3%B3n_(zoolog%C3%ADa) |
| recurved teeth | *dientes recurvados* (text: «afilados y recurvados», «vueltos hacia atrás») | — |
| agoutis; opossums (béquer's prey) | *guatusas*; *zarigüeyas* | Cloudbridge, *Lista de especies de mamíferos* (Costa Rica, 2024): «Guatuza» for *Dasyprocta punctata*, «Zarigüeya, Zorro pelón» for *Didelphis marsupialis* — https://cloudbridge.org/wp-content/uploads/2024/06/ESP-Most-updated_-Mammals-Species-List-Costa-Rica-June2024.docx.pdf. *Guatusa* is the usual spelling; *zarigüeya* is the general Spanish word (Costa Rica also says *zorro pelón*) |
| Central Valley | *Valle Central* | es-style §3.1 (the ICP writes *Meseta Central*) |
| elevation (fact) | *Altitud* | es-style §4 fact labels |
| IUCN categories | *Preocupación Menor*, *Casi Amenazado*; in prose the category is named, not inflected: «en la categoría Casi Amenazado» (lede), «la clasifica en la categoría Casi Amenazado» (body) | es-style §3.5 (UICN 2012, *Categorías y Criterios* v3.1, §IV) |
| caudal luring | *señuelo caudal* | **[unverified]**: no Spanish scientific source found (searches for «señuelo caudal», «atracción caudal», «engaño caudal»; two UNAM theses checked, none uses a term). ICP19 p. 25 describes the behaviour without naming it («mueven la punta de sus colas … para atraer presas») |
| eye stripe | *Banda ocular* | es-style §3.6 (ICP-sp says «bandas posoculares» for the terciopelo) |

Snake names are feminine everywhere (*la terciopelo, la bocaracá, la coral, la cascabel, la
matabuey, la béquer*), including *Adulta* in the scale notes: ICP-sp writes *La matabuey*,
*La cascabel*, *La terciopelo*; ICP19 p. 20 *la bécquer* (es-style §3.1).

## 3. Look-closer names (R1.1)

All 26 rows take the names of es-style §3.6. Where the snakes figure's own English label differs
from what the plate says, the figure translators should know:

| label id | name | figure's English label | note |
|---|---|---|---|
| `nostril` | Narina | *Valved nostrils* | the book avoids the valve claim (research §7 q. 9); the Spanish name does too |
| `fangs` | Colmillos | *Hinged fangs* | prose says *móviles* |
| `rattle-button` | Botón del cascabel | *Button* | — |
| `tail-spine` | Espina caudal | *Spiny tail tip* | — |
| `yellow-ring` | Anillo claro | *Yellow ring* | pale rings may be yellow, cream or white (es-style §3.6) |
| `paddle-tail` | Cola aplanada | *Paddle tail* | ICP's gloss of *platura* |
| `eggs` | Puesta | *Eggs* | — |
| `eye-stripe` | Banda ocular | *Eye stripe* | — |
| `tongue` | Lengua | *Forked tongue* | the note is about the salt gland under it |

## 4. What could not be rendered word for word

1. **English glosses of Spanish words are dropped, the fact kept** (es-style §5.1): *Terciopelo is
   Spanish for velvet* → `*Terciopelo* evoca la tela; *asper* es «áspero» en latín`; the glosses
   “ox-killer” (*matabuey*), “mute rattlesnake” (*cascabel muda*), “yellow tail” (*rabo
   amarillo*) and “tinsel” (*oropel*) are self-evident in Spanish and were not repeated. Where a
   name is cited as a name (*rabo amarillo*, *cascabel muda*, *ovovivíparo*), it is set in italics,
   not quotes (§6, issue 13).
2. **The coral rhyme** (*red touches yellow, kills a fellow*) has no established Spanish version
   (searched); the plate gives its sense as `la rima norteamericana «si el rojo toca el amarillo,
   mata»`, keeping the facts (North American, unsafe here) but not the English words.
3. **“its English name”** stays (the heading's `commonAlt` prints it). The bocaracá cites it in
   italics, *eyelash viper*, as es-style §3.1 shows; the sea snake does not, because *yellow-bellied*
   broke as «yellow- / -bellied» under the Spanish compound-hyphen rule in a test render.
4. ***lancehead*** (plate I) is only a synonym in the English sentence; not rendered.
5. **Hedges kept** with Spanish equivalents: *usually* → *suele / en general*; *about* → *unos*;
   *probably* → *probablemente*; *among the longest* → *de los más largos*; *may* → *pueden*.
6. **Ranges**: en dash in facts and with symbols (*50–75 cm*), words in prose with a noun
   (*de 6 a 23 crías vivas*, *de entre 16 y 22 cm*), as es-style §2.5 asks.
7. **First aid** (note and imprint) follows the ICP's wording where it exists (*acuda de inmediato
   al hospital o centro de salud más cercano*, *calme a la persona, póngala en reposo*, *quítele
   anillos…*, *no dé bebidas alcohólicas…*), adding nothing the English does not say (no
   *compresas frías*).
8. **Pull quote** has no final full stop: the typesetter adds «…», and a display quotation needs no
   point.
9. **Plate source lines** (`IUCN Red List 2021`, `The Reptile Database`) stay English (SAME), so
   they still match the full entries on the *Fuentes* page.

## 5. Open questions

1. *Señuelo caudal* (glossary) is a calque without a Spanish source; an editor with access to a
   Spanish herpetology glossary may prefer a description.
2. ***Chischil*** (ICP web) or ***chichil*** (ICP handbook)? Both are the ICP's; the edition uses
   *chischil*, as es-style does.
3. **Imprint length** (+20 % since the review added *una clave*, §6): it uses the ICP web page's
   «hospital o centro de salud». The ICP handbook's «centro médico más cercano» (pp. 66–67,
   re-opened for the review) would bring it to +12 %.
4. **`back.sources` entry 2** cites the ICP's English species pages (as consulted for the English
   book). The Spanish pages carry the same accounts (opened 1 Nov 2026,
   `…/es/informacion-y-materiales/serpientes-venenosas-de-costa-rica`); citing them in the Spanish
   edition would change a SAME field, so it was left for the editor.
5. **Typesetter (not this file)**: Spanish pages break lines after an en dash inside a range
   (*50– / 75 cm* on plate III, *2– / 2,5 m* on plate VII in 900-px renders); the English pages
   have the same break opportunity. A no-break rule after an en dash between figures belongs to the
   typeset owner.
6. ***shaders*** in the colophon is now italic, as es-style §2.3 asks for raw English words
   (review, §6.2); the Calaveras edition still sets it roman. The line repeats the imprint and is
   expected to go with the shorter colophon.
7. **Sync step**: the English edits made after the snapshot (byline, two-line colophon, the extra
   how-to rows, the béquer's prey and its new source) still have to be carried into this file.

## 6. Review

Review pass of 1 November 2026, from about 23:40. The adversarial review raised **21 issues** on
this edition. They cover **19 distinct changes**: issues 1 and 19 are the same fix, and issues 4 and
18 are two wordings of one fix. **19 applied, 0 rejected.** For 4/18, the shorter wording (18) was
used. Where a fix pushed a string or plate past its limit (issues 20 and 21), neutral trims
elsewhere in the same string or plate bring it back: every plate ≤ 1.05, the note paragraph ≤ 1.10.
Two more changes align the file with `es-style.md` on points no reviewer raised (§6.2). No fact,
number, hedge or source was dropped.

### 6.1 Issues

Numbered in the order the review listed them.

| # | path | decision | what and why |
|---|---|---|---|
| 1, 19 | `intro.paragraphs[0]` | applied | *con más serpientes* → *con mayor diversidad de serpientes*. The English means species richness, and *más serpientes* reads as density; ICP19 p. 26: «mayor diversidad de ofidios por kilómetro cuadrado». The other offered form, *más especies de serpientes*, repeats the sentence's first words. |
| 2 | `howTo.items[*][1]` | applied | Effect column in usted imperatives: *Pase, Avance / retroceda, Gire, Acerque, Examínela, Retire, Separe, Nombre, Reproduzca o pause, Guarde*. The descriptive third person read as *tú* imperatives next to *toque* in the same cell. This follows es-style §0.2 item 2 and the rows of §3.7 (see §6.2 on its header line). Icons are picked from `en(row)` (`front.js:419`), so no code reads these words. In row 2, *toque para seguir* also takes the string from 1.109 to 1.050. |
| 3 | `plates[1].animation.beats[0][1]` | applied | *Enrollada la cola en la rama…*: in an absolute construction the participle goes first, as on plate I (*Inyectado el veneno…*). 1.094. |
| 4, 18 | `plates[3].lookCloser[3].text` | applied (wording of 18) | The hedge for adults is back: *En crías domina la neurotoxina; en adultos, la toxina tisular*. One verb serves both halves, as in the body's *en los neonatos domina la crotoxina*. This costs +1 character; issue 4's repeated *sobre todo* would cost +11. |
| 5 | `intro.paragraphs[2]` | applied | *no la tienen* (the pull quote's words): 1.104 → 1.099. |
| 6 | `plates[1].body[0]` | applied | *abunda en algunas zonas*, *habita la vertiente pacífica*: 1.104 → 1.099. Plate II goes from 1.0502 to 1.0497. |
| 7 | `plates[1].body[1]` | applied | *de entre 16 y 22 cm*: es-style §2.5, words with words, never *de 16–22*. |
| 8 | `plates[3].body[0]` | applied | *…Puntarenas, con una población que sobrevive…*. The list of lands no longer takes a clause; the English has *with a population surviving*. |
| 9 | `plates[6].lookCloser[2].text` | applied | *va del hocico hacia atrás y cruza cada ojo*: the stripe's path, not "one per eye". |
| 10 | `plates[6].body[1]` | applied | *Cuando un tramo aprieta, la boa puede respirar con costillas de otro tramo*: the snake is the subject, as in the English. −4 characters. |
| 11 | `plates[6].body[0]` | applied | *es pesada y musculosa; suele medir*: a semicolon replaces the comma splice. |
| 12 | `plates[5].body[1]` | applied | *donde los pececillos se refugian*: a preverbal plural subject needs its article. |
| 13 | `plates[0].didYouKnow`, `plates[4].body[0]`, `back.glossary[13][1]` | applied | *rabo amarillo*, *cascabel muda* and *ovovivíparo* go in italics, not «», because each is a word mentioned as a word. DPD *comillas* 2e: in print, italics replace the quotes of handwriting. This matches es-style §2.3 and its checklist. The guide's "roman" list in §2.3 covers these words when they are used; here they are cited as names. Glossary definitions are parsed for markup (`back.js:83`, `markup: true`), and the Read-sheet mirror renders it (`a11y.js:21–31`). |
| 14 | `imprint[0]` | applied | *no es una clave de identificación*: without the article, *clave* can read as the adjective. The string is now 1.202 × English (§6.3; open question 3 in §5). |
| 15 | `credits[0]` | applied | *citada en «Fuentes»*. DPD *mayúsculas* 5.2.25 (and *comillas* 2g): the title of a section of a publication cited in running text goes in quotes, as *«Más de cerca»* does in the how-to. |
| 16 | `plates[0].animation.beats[2][1]` | applied | *yergue los colmillos móviles*: Spanish uses the article for a body part of the subject. The same rule is applied to beat 0 (*saborea el aire con la lengua bífida*). |
| 17 | `plates[4].animation.beats[1][1]` | applied | *La lengua prueba el aire*, for the same reason. |
| 20 | `back.note.paragraphs[0]` | applied | *requieren atención hospitalaria* (the English says *need hospital care*; ICP19 p. 7: «requieren ser atendidos en hospitales y clínicas»), not *hospitalización*, which means admission. To keep the paragraph within 1.10, *Cada año* → *Al año* and *Los sueros de Costa Rica* → *Los sueros del país*; Costa Rica is named two sentences earlier. 1.101 → 1.098. |
| 21 | `plates[4].body[1]` | applied | *La UICN la clasifica en la categoría Casi Amenazado* is the sentence es-style §3.5 prescribes. The UICN itself inflects after *como* («taxones clasificados como Casi Amenazados», UICN 2012), so the old *la clasifica como Casi Amenazado* followed neither. The fix adds 11 characters. Plate V stays at 1.049 with two trims: *…corta y dura, no en un chischil* (body[0]) and *entre las víboras del país* (eggs note). |

### 6.2 Alignment with es-style beyond the issues

- `back.colophon[2]`: *shaders* is set in italics (es-style §2.3, raw English words). The line goes
  when the sync brings in the two-line English colophon. The Calaveras edition still sets the word
  roman; that file is not part of this review.
- `plates[0].animation.beats[0][1]`: *con la lengua bífida* (issue 16's rule; same length).
- **For the guide's owner** (es-style.md was not edited here):
  - §3.7 opens with "effect column: descriptive". That line contradicts the section's own rows
    (*retire la piel*, *nombre las partes*, *guarde como SVG*) and §0.2 item 2. This edition now
    follows §0.2 and the rows.
  - The §2.3 list of words to set roman (*rabo amarillo, cascabel muda*) could say "when used, not
    when cited as names".
- Checked again and already compliant: UICN capitals; feminine snake names, including *Adulta*;
  *suero antiofídico*; «» with punctuation after the closing mark; rayas; decimal comma and
  no-break spaces; no grouping in four-digit numbers or years; `Fig. n — ` lead-ins; a `pullQuote`
  without quotes; an intro that does not open with `¿ ¡ «`; `blurb` 139 characters; English names
  in italics (*eyelash viper*); no *sólo* or accented demonstratives; no *tú* or *vos* forms.

### 6.3 Checks after the review

- The module imports in Node (`locale: 'es'`). `.scratch/bilingual/serp-es/check.mjs` finds no
  differences in shape, the 62 ids, numbers in 362 text leaves, beat times, theme, figure params,
  look-closer labels or plate sources.
- The project's `validateSpanish`, run against the snapshot (`serp-es/val-snapshot.mjs`), gives 0
  errors, 0 warnings and 5 notes. The notes are the identical binomials and headwords, by design.
- `node scripts/validate-books.mjs serpientes --lang es --fit` (dev server, 23:45) against the live
  English gives 7 errors, as before. All 7 come from English edits made after the snapshot (a fifth
  plate VII source, a 19th `back.sources` entry, the two-line colophon), which the sync step
  carries.
- **Fit**: 1.000 on every side, except *Fuentes* at 0.925 (still the six-line snapshot colophon)
  and the making prompt at 0.988 (not this file). Both are unchanged from before the review.
- `lookCloser`: all 26 rows have a name of ≤ 3 words.
- **Per plate** (TEXT leaves, names excluded; `serp-es-review/ratios.mjs`):

  | plate | I | II | III | IV | V | VI | VII |
  |---|---|---|---|---|---|---|---|
  | ratio | 1.034 | 1.0497 | 1.0499 | 1.031 | 1.0494 | 1.039 | 1.046 |

  All are ≤ 1.05. Plate II was at 1.0502 before the review. The whole book is at 1.054.
- **Per string**: 94 of 272 TEXT strings are over 1.10 (98 before the review).
  - 83 are under 40 English characters: fact labels and values, IUCN labels, badges, headings and
    how-to gestures, where one extra word already exceeds 10 %.
  - Five of the 11 longer ones follow from wording the termbase or this review requires:
    - `imprint[0]` 1.202 and `back.note.paragraphs[2]` 1.183: ICP first-aid wording (es-style
      §3.1), plus *una* in the imprint (issue 14).
    - `plates[matabuey].lede` 1.177: *en la categoría Casi Amenazado* (§3.5).
    - `howTo.items[10][1]` 1.184: *lámina en color*, *dibujo lineal* (§3.3).
    - `howTo.items[8][1]` 1.231: usted forms and the box name *«Más de cerca»*.
  - The other six are short notes that run one to three characters past the line:
    `plates[matabuey].lookCloser[tail-spine]` 1.146 (55/48), `back.glossary[10][1]` 1.108,
    `back.glossary[3][1]` 1.106, `back.glossary[5][1]` 1.106,
    `plates[coral].lookCloser[fixed-fangs]` 1.106 and `plates[bequer].lookCloser[pelvic-spur]`
    1.104. No reviewer raised them and their pages set at 1.000, so they were left for the editor
    rather than trimmed with synonyms.
  - Four long strings came back under the line in this review: `intro.paragraphs[2]`,
    `plates[bocaraca].body[0]`, `howTo.items[1][1]` and `back.note.paragraphs[0]`.

### 6.4 Sources opened for this review

- **ICP19**, the official PDF
  (https://icp.ucr.ac.cr/sites/default/files/content/serpientes-venenosas-de-cr-biologia-basica-icp.pdf),
  downloaded on 1 Nov 2026 and text-extracted. It is the same file, by SHA-1, as the copy the
  earlier run used. Passages checked:
  - p. 26 (PDF p. 24): «uno de los países con mayor diversidad de ofidios por kilómetro cuadrado en
    el mundo»;
  - p. 7 (PDF p. 5): «entre 500 y 600 compatriotas sufren mordeduras de serpientes cuyos efectos
    requieren ser atendidos en hospitales y clínicas del país»;
  - pp. 66–67: «Trasladar al paciente al centro médico más cercano».
- **UICN (2012)**, *Categorías y Criterios de la Lista Roja de la UICN: Versión 3.1*, 2.ª ed.
  (https://portals.iucn.org/library/sites/library/files/documents/RL-2001-001-2nd-Es.pdf),
  downloaded on 1 Nov 2026: «taxones clasificados como Casi Amenazados»; «Un taxón está Casi
  Amenazado».
- **RAE/ASALE, DPD**, *comillas* 2e and 2g (https://www.rae.es/dpd/comillas) and *mayúsculas*
  5.2.25 (https://www.rae.es/dpd/mayúsculas). rae.es refuses scripted requests, so the text these
  pages showed in a browser during the earlier run of this task was re-read. Not re-opened today.

## 7. Sync with the live English (2 November 2026)

The English manifest was edited after the 21:59 snapshot. This pass carried every edit listed in
`.scratch/bilingual/en-changes.md`. A diff of `.scratch/bilingual/en-snapshot/serpientes.js`
against `src/books/serpientes.js` shows the same edits and their code comments, nothing else.
Wording follows es-style.md and the corrected boa-and-rat spec
(`.scratch/bilingual/research-boa-rat.md` §4, with its review R5.19). Then the look-closer names
were set by lead decision L1 (§7.2).

### 7.1 Edits carried from the English

| path | English now | Spanish now | note |
|---|---|---|---|
| `byline` | `{ name: 'Josoroma', mark: 'josoroma' }` | the same | An ID value: the reader takes it from English whatever this file holds. Copied so the file stays a key-for-key copy of the English. |
| `plates[bequer].figure.caption` | *Fig. 7 — Béquer tightening its coils around a black rat.* | *Fig. 7 — Béquer apretando sus anillos alrededor de una rata negra.* | The spec's wording. *Rata negra* is the name the new source, Aguilar-López & Tapia-Ramírez (2025), gives *Rattus rattus*. Was *…ciñendo sus anillos sobre la silueta de una presa*. One line on the figure page, as before. |
| `plates[bequer].animation.beats[0][1]` (0 s) | *The coils settle around the rat’s chest.* | *Los anillos se acomodan alrededor del pecho de la rata.* | The spec's wording. Was *Los anillos se asientan en la presa.* |
| `plates[bequer].animation.beats[1][1]` (0.7 s) | *They tighten, pressing on the rat’s chest and blood vessels.* | *Se aprietan y presionan el pecho y los vasos sanguíneos de la rata.* | R5.19: *pecho*, not *corazón* (Boback et al. 2015 measured circulatory arrest, not a compressed heart). Was *Se aprietan sobre el pecho y los vasos sanguíneos de la presa.* |
| `plates[bequer].sources[4]` | *Aguilar-López & Tapia-Ramírez 2025* | the same | SAME, appended as in the English. |
| `back.sources[17]` | the Aguilar-López & Tapia-Ramírez (2025) entry | the same, byte for byte | Inserted before Fernández & Gutiérrez, now `[18]`, so the page lists 19 entries and Fernández once. The entry is Spanish already. The U+00A0s inside *Rev. Latinoam. Herpetol.* are kept. |
| `back.colophon` | 2 lines | *Taxonomía: The Reptile Database; estado de conservación: Lista Roja de la UICN.* · *Ninguna serpiente fue manipulada para este libro.* | The translations of the two lines English kept: old `[4]`, and old `[5]` without *Emergencias en Costa Rica: llame al 9-1-1.* What went is printed elsewhere: the Spanish imprint page has the title, edition, *Publicado por Lámina Natural History Press*, typefaces and Three.js, and the facing note has 9-1-1 (both checked in renders). |

The English comments over plate VII's animation (the prey) and over the colophon are mirrored;
the prey comment says «presa» where the English says "prey".

### 7.2 Look-closer names (lead decision L1)

Each `name` is now exactly the Spanish pill of the same label in `src/i18n/es/snakes.js`, the
strings-snakes area's file. That area chose the pills: a pill keeps its text whole within 110 px,
five es-style §3.6 names are wider, so it took shorter forms, and two pills translate their English
label in full (*Colmillos móviles*, *Lengua bífida*); its header gives the reasons. Ten of the 26
rows changed:

| label (plate) | figure's English pill | name before | name now | pill px |
|---|---|---|---|---|
| `fangs` (I) | *Hinged fangs* | *Colmillos* | *Colmillos móviles* | 107 |
| `venom-gland` (I, IV) | *Venom gland* | *Glándula de veneno* | *Glándula* | 54 |
| `keeled-scales` (I, V) | *Keeled scales* | *Escamas quilladas* | *Escama quillada* | 99 |
| `eyelash-scales` (II) | *Eyelash scales* | *Escamas supraoculares* | *Pestañas* | 56 |
| `rattle-button` (IV) | *Button* | *Botón del cascabel* | *Botón* | 37 |
| `tail-spine` (V) | *Spiny tail tip* | *Espina caudal* | *Punta espinosa* | 94 |
| `tongue` (VI) | *Forked tongue* | *Lengua* | *Lengua bífida* | 83 |
| `recurved-teeth` (VII) | *Recurved teeth* | *Dientes recurvados* | *Dientes recurvos* | 104 |

The other 16 rows already equalled their pills: *Foseta loreal* (×3), *Cola prensil*, *Anillo
rojo*, *Anillo claro*, *Anillo negro*, *Colmillos fijos*, *Cascabel*, *Puesta*, *Cola aplanada*,
*Vientre amarillo*, *Narina* (the pill of *Valved nostrils*), *Espolón pélvico*, *Banda ocular*
and *Costillas*. Every name is ≤ 2 words. On the plate page the name prints on its own small-caps
line above its note, and each new name fits that line (renders of plates I, II, IV, V, VI and
VII).

The notes' texts are unchanged. They still give what a short name leaves out: *la glándula de
veneno*, the «pestañas» as *escamas agrandadas y salientes sobre cada ojo*, *el botón, el segmento
más antiguo del cascabel*. Plate VII's body keeps the termbase's *dientes afilados y recurvados*;
the note's name says *recurvos*, a synonym. es-style §3.6 still lists the old names for these
rows; L1 supersedes it there (left to the guide's owner).

### 7.3 Checks

Private build at `127.0.0.1:4420`; scripts in `.scratch/w4/sync-es/`.

- `node scripts/validate-books.mjs --lang all`: 0 errors. This file: 0 errors, 0 warnings, 5
  notes. Before the sync it had 7 errors and 2 warnings.
- `composeEdition` against the live English: empty report.
- `shape.mjs`: keys, key order, list lengths and ID values identical to the live English.
- `align-l1.mjs` with `audit.mjs --lang es --i18n --json` from this build: all 26 names equal
  the pill text the reader shows. The audit itself reports 19/19 figures passing, 0 figure strings
  without Spanish and 0 Spanish pills over 110 px.
- `--fit`: every side at the English scale. *Fuentes* is at 0.950 in both editions (0.925 before
  the sync). The making prompt's 0.988 comes from the making texts, not this file. `fitw.mjs`
  gives the same scales at page widths 512, 1024, 1536 and 2048.
- Length (TEXT leaves, names excluded): plate VII went from 1.046 to 1.057. The English caption got
  shorter (*a prey silhouette* → *a black rat*), and beat 0 is 1.375 × the English (*del pecho de
  la rata* for *the rat’s chest*). The page still sets at 100 %, and the beat takes two lines in
  the phone caption, like beat 1. The colophon is 0.948.
- Reader renders: the Sources spread (desktop WebGPU; phone, WebGL 2) and plate VII at 0.2, 0.9
  and 1.8 s (desktop WebGPU and WebGL 2; phone WebGPU and WebGL 2). Plate VII was also opened in
  English and switched to Spanish live; `lamina.i18nMissing()` stayed empty. No console errors.

### 7.4 Statements above that this section replaces

- §1: the 7 errors against the live English are now 0, and *Fuentes* fits at 0.950, not 0.925.
- §2: *tail spine*. The prose keeps *espina*, but the name is now *Punta espinosa*.
- §3: the opening line ("All 26 rows take the names of es-style §3.6") and the names in its table
  for `fangs`, `rattle-button`, `tail-spine` and `tongue` (§7.2 has the current names).
- §5 questions 6 and 7: closed. The *shaders* line went with the old colophon, and the sync is done.
- §6.2, first bullet (`back.colophon[2]`): that line is gone.
- §6.3: the 7 errors, *Fuentes* at 0.925, plate VII at 1.046, and the look-closer names.

## 8. Repair after the verifiers (2 November 2026)

This file did not change in this round. Its how-to page was the model for the fix in Volumes II and
III: the effect column there is now in usted imperatives too, and *toque para seguir* now reads the
same in all three books.

**Previously open; resolved below: the English names in `commonAlt`.** The es-pages verifier found each plate's English name
(*Fer-de-lance* … *Central American boa*) printed under the Spanish title and on the contents page,
against lead decision L6. es-style §3.1 gives other Costa Rican names for most plates (*barba
amarilla*, *toboba de pestañas*, *coral macho*, *cascabel muda*, *boa constrictora*), but not a
good one for every plate. For the cascabel, es-style has only *crótalo*, the generic word for a
rattlesnake, and research §1.2 has nothing. For the sea snake, both sources give only *serpiente de
mar* and *culebra de mar*, variants of the title. A name under every title would put real
alternatives beside names that only repeat the title. The other two books have none to give, so the three editions should treat
the field alike. A `null` or blank `commonAlt` cannot be used yet. The merge reads it as missing
text (`src/i18n/edition.js:74`), so the English still prints and the validator reports an error.
This is handed off to core: let a translation set `commonAlt: null`. Once that lands, this file sets
`commonAlt: null` on all seven plates. A prototype with both edits
(`.scratch/w4/sync-es/r2/tree-b/`) shows *Terciopelo* over *Bothrops asper (Garman, 1883)* and the
Spanish names alone on the contents page, and every side keeps its scale. When the field goes, §4
item 3's reason ("the heading's `commonAlt` prints it") no longer holds. The sea snake's note still
reads as a whole without it: *le dan su nombre inglés* states a fact, not a name.


### Closed handoff: optional alternate names (2 November 2026)

The interrupted repair is now applied. `src/i18n/schema.js` marks only
`commonAlt` as clearable, and the edition composer accepts an explicit `null`
for this field in a translated edition. The Spanish manifest sets it to `null`
on all 7 plates. English secondary titles no longer appear in the plate
headings or contents; scientific names, authorities and citations remain.

A missing or blank value still falls back to English and reports missing text;
required prose cannot be erased with `null`. English editions keep their
alternate names. Six core regression checks cover these boundaries. `npm test`
passes (249 core checks and 55 hyphenation checks), and `validate-books.mjs
--lang all --fit` passes for all three books at the existing page scales. Fresh
Spanish heading renders confirm the removal. This closes the `commonAlt`
handoff above and supersedes earlier notes retaining English alternate names.
