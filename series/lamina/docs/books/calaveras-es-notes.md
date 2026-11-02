# Calaveras — Spanish edition notes

Edition file: `src/books/es/calaveras.js` (*Calaveras — Dibujar el cráneo: un método constructivo*).
Translated 2026-11-01 from the English snapshot `.scratch/bilingual/en-snapshot/calaveras.js`
(the manifest as it stood at 21:59). Style authority: `docs/books/es-style.md` (es-CR), which
appeared while this edition was being written; the file was re-checked against it and follows it
except where §4 below says otherwise. Facts, numbers and their sources are those of
`docs/books/calaveras-research.md`; nothing was added and nothing was dropped.

This file records the decisions specific to Calaveras, what could not be rendered exactly, how the
fit was checked, and the open questions. §8 (2 November) records the sync with the English edits
made after the snapshot and the look-closer names of lead decision L1; it supersedes the earlier
sections where they differ.

---

## 1. Checks run (2026-11-01)

| check | result |
|---|---|
| `node -e "import('…/src/books/es/calaveras.js')…"` | imports; 12 top-level keys, same as English |
| shape, ids, numbers, beat times vs the snapshot (`.scratch/bilingual/cal-es/check.mjs`) | 0 shape or value differences (same keys, order and array lengths; ids, params, label ids, theme, authorities, binomials, plate sources identical); number parity 0 differences in 303 strings (locale-aware: `17,5` = `17.5`, `1430` = `1,430`); binomial italics 0; beat times 0 |
| `composeEdition(en, es)` (`src/i18n/edition.js`), against the snapshot and against the live English | report empty: no missing, extra, changedIds, lengths, types, unknown or order |
| `node scripts/validate-books.mjs calaveras --lang es` | 0 errors, 0 warnings, 3 notes (identical to English, correctly: *Horizontal*, *Calvaria*, *Norma*) |
| real typesetter, raw manifests (`fit.mjs`, `try.mjs`, widths 512/1024/1536/2048) | every side sets at the English scale; no overflow, no horizontal overflow |
| composed edition through the harness (`typeset.html?book=calaveras&lang=es`) | 26 sides, same scales as English (lesson versos 97.5 % or 100 %, sources 97.5 %); Spanish dictionary complete for these pages (0 missing keys) |

Reach past the text bottom at the English scale (design px at 1536; negative = room to spare):

| page | scale | English | Spanish |
|---|---|---|---|
| I frontal (verso) | 97.5 % | −40 | −40 |
| II open-jaw (verso) | 97.5 % | −2 | −2 |
| III profile (verso) | 100 % | −25 | −25 |
| IV bones (verso) | 97.5 % | −69 | −36 |
| V jaguar (verso) | 97.5 % | −43 | −76 |
| VI skull-and-snake (verso) | 100 % | −21 | −21 |
| sources & colophon | 97.5 % | 0 | 0 |
| note, glossary | 100 % | −545, −577 | −495, −535 |

The fit was found line by line: a variant of the draft with one field put back to English shows
which string adds a line (`blame.mjs`, `try.mjs` in `.scratch/bilingual/cal-es/`). Strings that
had to be condensed to keep a line: the frontal body, step 2 and fact 4 label; the open-jaw body;
the profile body, the occipital look-closer (one line in its column) and the step 3 title; the
bones steps 1–2; the skull-and-snake body, step 2, fact 2 and the zygomatic-arch look-closer (one
line); colophon lines 1 and 5.

## 2. Length

After the review (§7; the figures before it are given there):

| block | English chars | Spanish chars | ratio | lesson verso only |
|---|---|---|---|---|
| intro | 1271 | 1328 | 1.045 | — |
| how-to | 604 | 678 | 1.123 | — |
| I frontal | 2386 | 2524 | 1.058 | 1.046 |
| II open-jaw | 2585 | 2711 | 1.049 | 1.042 |
| III profile | 2442 | 2577 | 1.055 | 1.047 |
| IV bones | 2471 | 2582 | 1.045 | 1.037 |
| V jaguar | 2368 | 2516 | 1.063 | 1.054 |
| VI skull-and-snake | 2378 | 2485 | 1.045 | 1.049 |
| back (note, glossary, colophon, sources) | 5696 | 5855 | 1.028 | — |

The plate totals include the recto and reader strings (caption, scale note, did-you-know, beats).
Three plates end 0.5–1.3 % over the ×1.05 target after applying es-style's termbase (*Longitud del
cráneo*, *Casi Amenazado*, *de unos … de ancho*, *el cráneo humano*) and the review's grammar fixes;
the binding check, the fit, is met with the English margins or better. Per string: 99 of 291 strings
exceed ×1.10, mostly short labels and titles (39 of 74 strings under 20 characters, where *Bisagra*
for *Hinge* is already ×1.4); strings over 80 characters run ×1.040 in aggregate, 9 of 59 over
×1.10. The `common` / `commonAlt` swap (§3.1) is neutral per plate (*Cráneo de jaguar* +10,
*Jaguar* −10).

## 3. Term decisions

### 3.1 Book furniture and plate fields

- **Subtitle** *Dibujar el cráneo: un método constructivo*; kicker *Lámina · Volumen III*; edition
  *Primera edición, 2026*; imprint name *Lámina Natural History Press* unchanged, described as
  *sello editorial ficticio* (es-style §4).
- **`common` / `commonAlt`** swap languages (design §4.4, es-style §4): `common` is the Spanish name
  the English edition already printed as `commonAlt` (*Vista frontal*, *Tres cuartos, mandíbula
  abierta*, *Perfil*, *Los huesos del cráneo*, *Cráneo de jaguar*, *Calavera y serpiente*);
  `commonAlt` is the English title in sentence case (*Frontal view*, …, *Skull & snake*, ampersand
  kept because the string is English). The vertical band shrinks longer titles to fit by code.
- **`scientific`** translated where it is not a taxon (R1.9): *Cráneo y mandíbula*,
  *Articulación temporomandibular*, *Proporciones craneales*, *Huesos craneales y faciales*; the two
  binomials and their authorities unchanged.
- **`family`**: *Cráneo humano · norma frontal / vista oblicua / norma lateral / 8 craneales, 14
  faciales*; *Felidae · Pantherinae* unchanged; *Composición · Viperidae, Crotalinae*. The glossary
  entry *Norma* lists the five normae in Spanish (*frontal, lateral, vertical, occipital o basal*).
  es-style marks *norma frontal / lateral* `[unverified]`.
- **Badges**: *Lección 1 · Principiante*, *Intermedio*, *Avanzado* (es-style §4).
- **Look-closer names** (R1.1, es-style §3.6): *Órbita*, *Abertura nasal*, *Cóndilo*, *Apófisis
  coronoides*, *Arco cigomático*, *Occipital*, *Sutura coronal*, *Esfenoides*, *Cresta sagital*,
  *Carnicera*. All set on one line in the notes column (widest, *Apófisis coronoides*: 250 of 275
  design px).
- **Step titles** follow es-style §4's table, except where its wording takes two lines in the step
  column at the page's scale and the English title takes one (§4 below).

### 3.2 Anatomy (es-style §3.3)

| English | Spanish here | source |
|---|---|---|
| process (coronoid, mastoid) | *apófisis* (never *proceso*) | FIPAT TA, unit TAH:U547 *apófisis mastoides* (https://ifaa.unifr.ch/Public/TNAEntryPage/auto/unit/LAES/TAH547%20Unit%20EN.htm); Clínica Universidad de Navarra, «músculo temporal»: the tendon inserts «en la apófisis coronoides» (https://www.cun.es/diccionario-medico/terminos/musculo-temporal) |
| skull · cranium · braincase | *cráneo* (*calavera* for the drawn object: pull quote, lesson VI title) · *cráneo* · *caja craneal* | es-style §3.3; DLE *calavera* «Del lat. *calvaria* 'cráneo'» (read in the earlier run) |
| nasal aperture (piriform) | *abertura nasal*; *(piriforme)* in the glossary | Kenhub «Hueso nasal»: «el margen superior de la abertura piriforme» (https://www.kenhub.com/es/library/anatomia-es/hueso-nasal) |
| eye sockets | *órbitas* (es-style maps *sockets* to *órbitas*; *cuenca* not used) | es-style §3.3 |
| socket of the jaw joint · ridge ahead of it | *fosa* · *tubérculo* (short for *tubérculo articular*; the English uses the plain *ridge*) | Kenhub «Articulación temporomandibular»: «la fosa mandibular del hueso temporal», «el tubérculo articular» (earlier run) |
| ear canal | *conducto auditivo*; *oído* where the English says *ear*, and in three tight spots (fact *oído–órbita*, mistake *El oído por delante de la bisagra*, step 1 of lesson II) | TA *conducto auditivo externo* (es-style §3.3) |
| inferior nasal conchae · ear ossicles | *cornetes nasales inferiores* · *huesecillos del oído* (in full in the lesson IV fact too, §7 row 19) | DLE *cornete*; Kenhub «Huesos del oído»: «los huesos del oído (huesecillos auditivos)», «estos 3 huesecillos del oído» (https://www.kenhub.com/es/library/anatomia-es/huesos-del-oido, opened in the review) |
| sutures | *coronal, sagital, lambdoidea, escamosa* | TA, suturas del cráneo (https://ifaa.unifr.ch/Public/TNAEntryPage/auto/part/ES/TAH26538%20P3%20ES.htm) |
| Frankfort plane / line | *plano / línea de Fráncfort*; the city *Fráncfort* | es-style §3.3 after DPD *Fráncfort* (traditional form, *Frankfurt* discouraged). See §5.1 |
| bump on the back of the skull (external occipital protuberance) | *saliente occipital* (plain, like *bump*) | DLE *saliente*, «parte que sobresale de algo» `[unverified this run]` |
| carnassials | *carniceras* (*la carnicera superior*) | es-style §3.3; Arribas (ed.) 2008, *Cuadernos del Museo Geominero* 10, IGME, pp. 85–146: P4 y M1, «elementos denominados comúnmente "carniceras"» (text re-read this run). See §5.2 |
| sagittal crest, canines, enamel, bite force | *cresta sagital*, *caninos*, *esmalte*, *fuerza de mordedura (canina)*, *newtons* | Del Moral Sachetti et al. 2011 (Spanish; text re-read this run: «fuerza de mordedura canina», «altura del esmalte», «681,56 Newton») |
| jaw closers | *músculos de cierre* (*masetero, temporal, pterigoideo medial*) | Kenhub «Pterigoideo medial» (earlier run) |
| hinge (joint) | *bisagra*; step 1 title *Esfera y punto de giro* (es-style) | — |

### 3.3 Drawing (es-style §3.3)

*línea de construcción*, *línea central*, *guías (horizontales)*, *planos*, *escorzo*, *rayado* /
*rayado cruzado* (es-style marks it `[unverified]`; DLE has no drawing sense for *achurar*, read in
the earlier run, so the Southern Cone *achurado* is not used), *grabado* / *línea grabada*, *dibujo
lineal* (how-to export row), *cuña*, *esfera*, *bola* (where the English says *ball*), *punto
focal*, *tangencias* (es-style §3.3; *tangentes* until the review). *Afinar* is reserved for *refine*
(every step 3); a taper is *estrecharse* (intro, lesson I step 2 and its 1.25 s beat).

### 3.4 Lesson VI: the viper, the bite, the law

- **Central American eyelash-pitviper** → *bocaracá* (feminine, es-style §3.1); *the more widespread
  of Costa Rica's two eyelash-pitvipers* → *la más extendida de las dos tobobas de pestañas de Costa
  Rica* (es-style §3.1 generic row, as Volume I; the ICP species page has «toboba de pestaña» under
  *Nombre común* and «toboba de pestañas» in its text, opened in the review). The Reptile Database
  lists the Spanish names «Bocaracá, toboba de pestañas, víbora de pestañas, oropel (yellow morph)»
  for *B. nigroadspersus*
  (https://reptile-database.reptarium.cz/species?genus=Bothriechis&species=nigroadspersus, opened
  this run); the ICP handbook writes «Toboba de pestaña o bocaracá» and «escama supraciliar» (Sasa,
  Bonilla & Chaves 2019, ICP; text re-read this run). Volume I prints *Bocaracá*.
- **Long filed under *B. schlegelii*** → *por años incluida en* B. schlegelii (taxonomic sense of
  *filed under*); did-you-know *Clasificada como* Bothriechis schlegelii *hasta 2024*.
- **First aid**: *acuda enseguida a un hospital, donde se trata con suero antiofídico; sin
  torniquetes, cortes, succión ni hielo* — *acudir* is es-style §3.1's ICP verb; its *de inmediato*
  adds a line to the lesson VI verso (+15 px past the text bottom at 100 %, measured), so
  *enseguida* stays. ICP 2019: «El único tratamiento efectivo en caso de envenenamiento por
  mordedura de serpiente es el suero antiofídico o antiveneno», «NO realizar torniquetes», succión
  devices «involucran cortes en la piel». *never handle one* → *nunca manipule una* (the ICP's verb).
- **Below the cheekbone arch** → *más abajo del arco cigomático* (body, 3.6 s beat, look-closer *Pase
  más abajo*). Spanish *bajo / por debajo del arco* reads as through the gap under the arch, the
  reading the English revision removed (research §9: the head runs 2.2–2.8 cm below the arch).
- **Jaguar status** → *Casi Amenazado; en peligro en Costa Rica* (UICN capitals for the category,
  national status lowercase: es-style §3.5; UICN 2012, *Categorías y Criterios* v3.1, «CASI AMENAZADO
  (NT) Un taxón está Casi Amenazado…», text re-read this run).
- **CITES**: *el Apéndice I de la CITES prohíbe su comercio internacional con fines comerciales* —
  *comercio* alone is CITES's word for *trade* (commercial or not), so *con fines comerciales* keeps
  *commercial*. Costa Rica's Decreto 40379-MINAE-MAG writes «Convención CITES» (text re-read).
- **Pre-Hispanic remains** → *patrimonio nacional arqueológico*, Ley 6703, art. 1 («Constituyen
  patrimonio nacional arqueológico … así como los restos humanos … relacionados con estas
  culturas»; text re-read this run).

### 3.5 Register and wording

- **Usted** in every instruction; pronoun dropped (*Todo rostro que dibuje*); *su* avoided where it
  could be the jaguar's (es-style §1): *Beside your own skull* → *Frente al cráneo humano, el del
  jaguar invierte las prioridades*; *yours can also grind sideways* → *la humana también puede moler
  de lado*; *Your frontal bone began as two halves* → *El hueso frontal nace en dos mitades* (general,
  so impersonal). *our orbit* stays *nuestra órbita*.
- **How-to page**: usted imperatives in both columns (es-style §0.2(2) and the rows of §3.7), as in
  Volumes I and II: *Arrastre una esquina de la página — Levante y pase la hoja, como en papel*.
  Until 2 November the effect column was descriptive third person (*Levanta y pasa*), which reads as
  *tú* next to the usted gestures (§9).
- **Numbers**: decimal comma, no grouping to four digits (*1430 m*, *1000 newtons*), U+00A0 before
  every unit and around `×` (*unos 4 × 3,4 cm*), written `\u00a0` in the source; the lesson VI
  habitat value reads *bosque húmedo, nivel del mar a 1430 m* (words, not a word–figure dash
  range). es-style §2.6's fuller *del nivel del mar a 1430 m* puts that value on a third line and
  the verso 13 px past its text bottom at 100 % (measured in the review), so the telegraphic form
  stays. The English Calaveras has no no-break spaces; the Spanish adds them as es-style requires.
- *zip* → *zíper* (Central American usage) `[unverified this run]`.
- *CT scans* → *tomografías* / *estudio tomográfico* (no abbreviation).
- Italics only for binomials, for *Calavera* mentioned as a word in the glossary, and for the English
  *shaders* in the colophon (§7 row 13).

## 4. What could not be rendered exactly

1. **Step titles that would wrap.** es-style §4 asks for one line and gives a table; four of its
   titles take two lines at the page's scale where the English takes one, and one of them pushed the
   profile verso off its 100 % scale. Used instead: I-2 *Guías, mandíbula en cuña* (for *Guías y
   mandíbula que se estrecha*), III-1 *Horizontal y círculo* (*Línea horizontal y círculo*), III-2
   *Cuña facial y cuadrado* (*Cuña facial en un cuadrado*), III-3 *Órbita, abertura, perfil*
   (*Órbita, abertura, contorno*; *perfil* in the DLE sense «contorno aparente de la figura», on the
   profile lesson), V-3 *Órbitas, dientes, perfil* (the jaguar panels are profiles). I-3 *Órbitas,
   abertura, contorno* and VI-3 *Órbitas, cabeza, contorno* take two lines, as I-3 does in English,
   without changing the page height (VI-3 kept *contorno*: the skull there is not in profile).
2. **Colophon line 1** prints *Lámina, vol. III* instead of *Lámina · Volumen III*: with the guide's
   longer subtitle the line otherwise wraps once more and the sources page drops to 95 %.
3. **Central American eyelash-pitviper** has no established Spanish counterpart; *bocaracá* is the
   Costa Rican name of this species (and is regional by itself). The caption therefore reads *Cráneo
   humano y bocaracá: un estudio de composición*.
4. **Small condensations** that keep every fact: *That line is your mirror* → *: su espejo*;
   *only about half an orbit wide* → *de cerca de media órbita* (the *about* kept, *only* carried by
   *más angosto que…*); *Tint each bone as its own panel* → *Tiña cada hueso aparte*; *keeping its
   angle* → *sin girarlo*; *box the whole skull* → *encierre el cráneo*; lesson VI step 2 *body
   over bone, or bone over body* → *cuerpo sobre hueso, o al revés*.
5. **Hatching** → *rayado*: the engraving terms *talla / contratalla* were judged too technical
   for a drawing book.

## 5. Open questions

1. **Fráncfort vs Frankfurt.** Followed es-style (*plano de Fráncfort*, after the DPD). Spanish
   technical writing on the plane commonly uses the German spelling, e.g. Fernández Le-Fort (2009),
   *Evaluación cefalométrica de la estabilidad del plano de Frankfurt…*, Universidad de Valparaíso
   (opened this run: «Plano de Frankfurt como Línea de Referencia Horizontal»). A reader searching the
   term will find *Frankfurt* more often. Editor's call. The review proposed the switch (§7 row 21)
   and adds the Clínica Universidad de Navarra's dictionary headword «Plano horizontal de Frankfurt»
   (https://www.cun.es/diccionario-medico/terminos/plano-horizontal-de-frankfurt, opened in the
   review); the earlier run's web search for «plano de Fráncfort» returned no page using that form,
   and its Spanish hits spell the term *Frankfurt* or *Frankfort* (result titles and snippets only,
   pages not opened). Against it: the DPD's entry concerns the city («se
   desaconseja el empleo, en su lugar, de la forma alemana Frankfurt», earlier run's capture) and
   es-style §3.3 applies it to the term. If the editor switches: seven strings (body[0], facts[2][1],
   lookCloser[1].text, caption and proTip, proportions[1] of lesson III; glossary[5][0]) and es-style
   §3.3; the city in the lesson III did-you-know stays *Fráncfort*. Same length, no fit change
   (reviewer's measure).
2. **Carniceras vs carnasiales.** Followed es-style (*carniceras*, IGME 2008). The book's own Spanish
   source on the jaguar, Del Moral Sachetti et al. 2011, writes *carnasiales* («los dos pares
   carnasiales (Pm4 y molar inferior M1)», «fuerza de mordedura carnasial»), and the task brief asks
   to prefer a Spanish source's own wording. If the editor prefers it: *los carnasiales* (masculine),
   *el carnasial superior*, look-closer name *Carnasial*, glossary *Carnasiales* — 5 strings.
3. **Look-closer names vs the live English.** The English manifest has since added names
   (*Piriform aperture*, *Coronoid process*, *Occipital bone*). This edition follows es-style §3.6
   (*Abertura nasal*, *Apófisis coronoides*, *Occipital*); *Abertura piriforme* and *Hueso
   occipital* would mirror the English and the figure pills exactly. The skulls figure dictionary
   (`src/i18n/es/skulls.js`) should use the same words either way.
4. **English edits after the snapshot** (not chased, for the sync step): `byline` (ID kind, taken from
   English), the how-to row *Click or tap a page* with its new effect text, and the new look-closer
   names. The compose report against the live English is still empty, because the row count and keys
   did not change; the how-to row 2 text here translates the old English row.
5. **Lesson IV margin.** The bones verso sets at 97.5 % like English but with 36 px to spare instead
   of 69: the fact value *cuatro impares, dos pares* takes two lines (*impares* has no one-line
   synonym of the right register; figures would break number parity).
6. **`[unverified]` terms**: *norma frontal / lateral* (from es-style), *rayado cruzado*, *zíper*,
   *saliente* (DLE entry not re-opened in this run). *Huesecillos del oído* was verified in the
   review (Kenhub, §3.2); es-style §3.3 still marks it `[unverified]`.

## 6. Working files

`.scratch/bilingual/cal-es/`: `check.mjs` (shape, ids, numbers, beat times, lengths against the
snapshot), `deltas.mjs` and `stats.mjs` (length per block and per string), `fit.mjs` (every side,
both manifests, real typesetter), `blame.mjs` and `try.mjs` (reach per field and per variant),
`edition.mjs` (composed edition through `typeset.html?lang=es`), `compose.mjs` (compose report in
Node), `titles.mjs` (step-title lines, look-closer name widths), `v/*.json` (the variants tried),
earlier drafts `calaveras.es.v2.js`, `calaveras.es.v3-prestyle.js`.

`.scratch/bilingual/cal-es-rev/` (review): `calaveras.es.before-review.js` (the file as reviewed),
`patch.py` and `es-rev.js` (the review edits applied to a copy), `mkvariants.mjs` /
`variants.json` (each edit alone and per side, through `cal-es/try.mjs`), `fit-*.txt`, `ratios.mjs`
(per-string ratios before → after), `caplines.mjs` (lines of each beat in the reader's caption
pill), `facts.mjs` (lines per fact cell), `colophon.mjs` (fonts of the colophon words),
`v-inmediato.json`, `validate-es.json`.

## 7. Review (2026-11-01)

Two review passes sent 21 issue rows: **20 applied** (rows 3 and 14 improved on the proposal) and
**1 rejected** (row 21). Rows 5 and 18 are the same fix, so the file changed in 19 places across 17
strings (the intro's first paragraph and lesson VI's second paragraph carry two fixes each), plus
the code comment over the lesson IV facts. The pass against es-style's departures from the design
found nothing left to change (below).

| # | path | change | decision | why |
|---|---|---|---|---|
| 1 | `plates[0].body[1]` | *…del rostro vivo, separados por más o menos un ojo* → *…, que mide más o menos un ojo* | applied | In a list of the orbits' attributes, *separados* read as the orbits being one eye apart, against the half-orbit bridge in the same sentence; −5 chars. |
| 2 | `back.glossary[3][1]` | *al frente de la rama mandibular* → *en la parte anterior de la rama mandibular* | applied | *Al frente* is «Delante, al mando de algo» (Espasa-Calpe 2005, via WordReference, opened); the coronoid process is the front of the ramus itself, «el proceso coronoides (anteriormente)» (Kenhub «Mandíbula», opened). |
| 3 | `plates[0].animation.beats[1][1]` | *Guías horizontales cruzan…; la mandíbula se afina al mentón.* → *Las guías horizontales cruzan…; la mandíbula se estrecha hacia el mentón.* | applied, improved | Bare plural as preverbal subject. Also, *afinar* is this book's verb for *refine* (*afine sienes, pómulos y mandíbula*), so the taper is *se estrecha*, as in step 2 and the intro. 89 chars (×1.41), a reader caption with no page fit; its caption pill keeps the lines it had: 2 at 640 px, 2 at 390 px, 3 at 360 px (English 1, 2, 2), set by the long kicker *De la esfera al hueso* (`caplines.mjs`). |
| 4 | `plates[2].didYouKnow` | *craneólogos en Fráncfort acordaron* → *en Fráncfort, unos craneólogos acordaron* | applied | Bare plural as preverbal subject. |
| 5, 18 | `plates[2].facts[3][1]` | *detrás y bajo el conducto auditivo* → *detrás y debajo del conducto auditivo* | applied (one fix) | *Detrás* takes its complement with *de*, «necesita complemento explícito o implícito» (Castellano Actual, UDEP, «detrás, atrás y tras», opened); next to the preposition *bajo* it had none. |
| 6 | `plates[3].lesson.proportions[1]` | *del techo y lados* → *del techo y los lados* | applied | A singular article cannot govern the coordinated plural. |
| 7 | `intro.paragraphs[0]` | comma after *y los pómulos* | applied | Long fronted complement holding its own list; comma «si el complemento es extenso» (Castellano Actual, UDEP, citing *Ortografía* 2010, III 3.4.2.2.2.3; opened). |
| 8 | `intro.paragraphs[0]` | *que puede girar en la mente y ver* → *que se puede girar…* | applied | With the subject dropped, *una estructura* read as the subject of *girar … y ver*; impersonal *se* (es-style §1). |
| 9 | `plates[5].body[1]` | *vaya enseguida* → *acuda enseguida* | applied | es-style §3.1's ICP verb; the table's full *acuda de inmediato* puts the verso 15 px past its text bottom at 100 % (measured). |
| 10 | `plates[5].lesson.mistakes[1]` | *Tangentes* → *Tangencias* | applied | es-style §3.3: the fault is the touching, not the line. |
| 11 | `howTo.items[10][1]` | *Corre o detiene* → *Inicia o detiene* | applied | *Correr* calques *run*; *reproducir* is already the row's label. |
| 12 | `back.colophon[5]` | *véanse las Fuentes* → *véanse las fuentes* | applied | A common noun with its article (es-style §2.2: *la lámina IV*). |
| 13 | `back.colophon[2]` | *shaders* → `*shaders*` | applied | An English word in a Spanish sentence (es-style §2.3). The colophon is italic, so the word prints roman: `text.js` picks `fontFor(style.italic !== run.italic)`, and the laid-out line has *shaders* roman with no asterisks (`colophon.mjs`). Volume I's colophon has the same bare *shaders* (not this file). |
| 14 | `plates[4].body[0]` | *una cresta sagital arriba que ancla el temporal* → *una cresta sagital que ancla arriba el temporal* | applied, improved | The wedged *arriba* was awkward, but *along the top* is in the English and es-style §5 drops nothing, so the word moves after the verb instead of going (0 chars; the cut would have saved 7). The string stays ×1.112, 4 chars over the ×1.10 target; the verso keeps −76 px. |
| 15 | `plates[2].animation.beats[2][1]` | *…borde orbitario, en una misma horizontal.* → *…borde orbitario a igual altura.* | applied | Same fact in 10 fewer chars (×1.230 → ×1.066). |
| 16 | `back.glossary[13][1]` | *una apófisis del temporal* → *una apófisis del hueso temporal* | applied | Everywhere else in the glossary and the lessons *el temporal* is the muscle; it also parallels *el hueso cigomático*. |
| 17 | `plates[4].lesson.proportions[0]` | *unos 4 cm, más que nuestra órbita* → *…, más alto que nuestra órbita* | applied | The orbit is 4 × 3,4 cm (lesson I), so only its height makes the comparison true; the English says *taller*. |
| 19 | `plates[3].facts[3][1]` | *hioides, seis huesecillos* → *hioides, seis huesecillos del oído* | applied | Alone, *huesecillos* could be the sutural bones of body[1]. Kenhub «Huesos del oído» (opened) writes «los huesos del oído (huesecillos auditivos)», which also verifies the term (§3.2). The value now sets on two lines, like *cuatro impares, dos pares*, and the strip keeps its height (`facts.mjs`). |
| 20 | `plates[5].body[1]` | *tobobas de pestaña* → *tobobas de pestañas* | applied | es-style §3.1's generic row, as in Volume I; the ICP page uses both forms (opened). |
| 21 | the seven uses of *Fráncfort* as a term (lesson III, glossary) | → *Frankfurt* | **rejected** | es-style §3.3 decides *plano / línea de Fráncfort* (after the DPD) and is this edition's authority, outside this task's files; the evidence for *Frankfurt* is added to open question §5.1 for the editor. |

**Style-guide alignment** (where es-style departs from design §3.4/§4), checked on the edited file;
nothing to change: UICN capitals (*Casi Amenazado; en peligro en Costa Rica*); *usted* imperatives
in steps, pro tips, how-to gestures and the snakebite text, with infinitives or nouns in step titles
and in the how-to rows that name toolbar controls (*Exportar SVG*, *Reproducir o pausar*, as
`src/i18n/es/ui.js` names them); no «» in the text, so no punctuation after a closing mark to check;
feminine *bocaracá*; no grouping in *1430*, *1000* or years; the English *shaders* now italic (row
13); the IUCN category named, not inflected; every caption opens `Fig. n — `; the pull quote has no
marks; the intro paragraphs open with a letter; this manifest has no `blurb`. es-style §6's
checklist greps: 0 hits.

**Checks re-run on the edited file:**

| check | result |
|---|---|
| import | imports; 12 top-level keys; `locale: 'es'` |
| shape, ids, numbers, beat times (`cal-es/check.mjs`; the reviewers' `shape.mjs` and `parity.mjs`) | 0 shape or value differences; number parity 0 in 303 strings; binomial italics 0; beat times 0; typography 0 |
| look-closer names | 12 of 12 rows named, each ≤ 3 words |
| `composeEdition` against the snapshot and the live English | empty report |
| `node scripts/validate-books.mjs calaveras --lang es` | 0 errors, 0 warnings, the same 3 notes |
| real typesetter, every side (`fit.mjs` at 512, 1024 and 2048 px) | every side at the English scale, no overflow |
| reach per side (`try.mjs`, 512–2048 px) | unchanged from §1 for every edit, alone and together: I −40, II −2, III −25, IV −36, V −76, VI −21, sources 0, note −495, glossary −535 |
| composed edition (`typeset.html?book=calaveras&lang=es`) | 26 sides; lesson versos and sources at the English scales; 0 missing keys |
| length ratios | per plate, all strings: I 1.058, II 1.049, III 1.055, IV 1.045, V 1.063, VI 1.045 (before: 1.054, 1.049, 1.056, 1.040, 1.060, 1.044), so I, III and V still miss ≤ 1.05 (§2). Per string: 99 of 291 over ×1.10, against 95 before; five fixes crossed the line (rows 2, 9 + 20, 10, 17, 19) and row 15 came under it. The fit, the binding check, did not move. |

**Noted, not changed** (no reviewer raised it): how-to row 6's effect *Vista de cerca* is the only
noun phrase in a column of verbs. es-style §3.7 maps *inspect* → *examinar* (*La examina de cerca*,
19 chars as in English), while the UI dictionary says *Inspeccionar la figura*; the editor should
pick one verb for both.

## 8. Sync with the live English (2 November 2026)

The English manifest was edited after the 21:59 snapshot. This pass carried every edit listed in
`.scratch/bilingual/en-changes.md`. A diff of `.scratch/bilingual/en-snapshot/calaveras.js`
against `src/books/calaveras.js` shows the same edits and their code comments, nothing else. The
look-closer names then follow lead decision L1: each `name` is exactly the Spanish pill of the
same label in `src/i18n/es/skulls.js`, the skulls area's file.

| path | English now | Spanish now | note |
|---|---|---|---|
| `byline` | `{ name: 'Josoroma', mark: 'josoroma' }` | the same | An ID value: the reader takes it from English whatever this file holds. Copied with its comment so the file stays a key-for-key copy of the English. |
| `howTo.items[1][0]` | *Click or tap a page* | *Haga clic o toque una página* | Was *Haga clic o toque un borde*. Usted imperative, like the column. |
| `howTo.items[1][1]` | *Forward on the right-hand page, back on the left; when one page fills the screen, a tap reads on* | *Adelante en la página derecha, atrás en la izquierda; si una página llena la pantalla, un toque pasa a la siguiente* | Was *Pasa una hoja adelante o atrás*. Verbless like the English, and without a final period like this book's other rows. *Si una página llena la pantalla* is Volume I's wording, and *pasa a la siguiente* is Volume II's. U+00A0 joins *la pantalla*, as it joins the English *the screen*. 1.20 × the English (96 → 115 characters). It sets in two lines, as the English row does; the gesture cell takes two lines too, so the row keeps its height. The English comment over the row is mirrored. |
| `plates[frontal].lookCloser[nasal-aperture].name` | *Piriform aperture* | *Orificio piriforme* | L1, the skulls pill. Was *Abertura nasal* (es-style §3.6, written for the old id-derived English *Nasal aperture*). The lead's list gave *Abertura piriforme*, but as a pill it measures 114 px, over the 110 px limit. *Orificio piriforme* is the Spanish of FIPAT's TA2, unit TAH:U392 (*orificio piriforme del tabique nasal óseo*; page opened 2 November 2026), at 104 px. The body and the glossary keep *abertura nasal*, as the English body keeps *nasal aperture*, and the glossary definition already says *orificio … piriforme*. |
| `plates[open-jaw].lookCloser[coronoid].name` | *Coronoid process* | *Coronoides* | L1, the skulls pill. Was *Apófisis coronoides*, the lead's listed term, but it measures 122 px as a pill. The book already uses *coronoides* alone (lesson II, step 3: *rama, coronoides*). The full *apófisis coronoides* stays in the body and the glossary, and the note's *se aferra a ella* still agrees (*la coronoides*). |
| `plates[profile].lookCloser[occipital].name` | *Occipital bone* | *Hueso occipital* | L1, the skulls pill (95 px). Was *Occipital*. |

The other ten rows already equalled their pills (*Órbita* ×2, *Cóndilo*, *Arco cigomático* ×2,
*Sutura coronal*, *Esfenoides*, *Cresta sagital*, *Carnicera* for *Carnassial (P4/m1)*). Every
name is ≤ 3 words and ≤ 110 px. In the lesson layout the name prints on its own small-caps line
above the note; the three new names each fit that line (renders of lessons I, II and III).

**Checks** (private build, `127.0.0.1:4420`; scripts in `.scratch/w4/sync-es/`):

- `node scripts/validate-books.mjs --lang all`: 0 errors. This file: 0 errors, 0 warnings, the
  same 3 notes.
- `composeEdition` against the live English: empty report.
- `shape.mjs`: keys, key order, list lengths and ID values identical to the live English.
- `--fit`: every side at the English scale (lesson versos I, II, IV and V and the sources page at
  0.975 in both editions, the rest at 1.000). The making prompt's 0.988 comes from the making
  texts, not this file. `fitw.mjs` gives the same scales at page widths 512, 1024, 1536 and 2048.
- `align-l1.mjs`: all 12 look-closer names equal their pills.
- Renders: the how-to page in the typeset harness in both languages and in the reader (desktop,
  WebGL 2); lessons I and III in the harness.

**Statements above that this section replaces**: §3.1 the list of look-closer names (now
*Orificio piriforme*, *Coronoides* and *Hueso occipital*); §5 questions 3 and 4 (closed: the names
follow the pills; the byline and the how-to row are carried).

## 9. Repair after the verifiers (2 November 2026)

The es-pages verifier reported four findings on this file. Three are fixed here, and one waits on
core.

**1. How-to effect column in usted** (p. 5). Beside the usted gestures, the descriptive third
person (*Levanta y pasa*, *Gira*, *Guarda*) reads as *tú* imperatives, which es-style §1 rules out.
Volume I changed for the same reason in its review (serpientes-es-notes §6.1, issue 2), and Volume
II changed in this repair. The column now follows es-style §0.2(2) and the rows of §3.7.

| row | was | now |
|---|---|---|
| 0 | *Levanta y pasa la hoja, como en papel* | *Levante y pase la hoja, como en papel* |
| 1 | *…si una página llena la pantalla, un toque pasa a la siguiente* | *Adelante en la página derecha, atrás en la izquierda; si una página llena la pantalla, toque para seguir* |
| 2 | *Pasa páginas en pantalla táctil* | *Pase las páginas en una pantalla táctil* |
| 3 | *Pasan las páginas desde el teclado* | *Pase las páginas desde el teclado* |
| 4 | *Gira el cráneo sobre su plataforma giratoria* | *Gire el cráneo sobre su plataforma giratoria* |
| 5 | *Vista de cerca* | *Examínela de cerca* |
| 6 | *Desde la barra, muestran u ocultan construcción, huesos, músculos, grabado* | *Desde la barra, muestre u oculte construcción, huesos, músculos, grabado* |
| 7 | *Desde la barra, separa los huesos por sus suturas* | *Desde la barra, separe los huesos por sus suturas* |
| 8 | *Desde la barra, nombran huesos y puntos clave* | *Desde la barra, nombre huesos y puntos clave* |
| 9 | *Guarda cada figura en color o como dibujo lineal* | *Guarde cada figura en color o como dibujo lineal* |
| 10 | *Inicia o detiene la lección de cinco segundos, o va a cualquier momento* | *Inicie o detenga la lección de cinco segundos, o vaya a cualquier momento* |

The verifier would have kept row 1, which has no imperative. Its second half changed anyway. §8
gave the reason for *pasa a la siguiente* as Volume II's wording, and Volume II now has *toque para
seguir*, as Volume I does. The English sentence is the same in all three books, and so is the
Spanish now. Row 5 takes es-style §3.7's *examinar* and Volume I's wording, which closes the note
in §7. Row 1 still takes two lines and every other row one, at 512, 1024, 1536 and 2048 px. The
page stays at 1.000.

**2. Pull quote without a final stop.** The typesetter wraps `intro.pullQuote` in «…»
(`front.js:305`), so the stop printed inside the closing guillemet (*…rostro.»*). Spanish puts
the stop after the closing mark (es-style §2.4), and Volumes I and II end their pull quotes with
none. It now reads *«Dibuje la calavera hasta verla a través de cada rostro»*. Its two lines are
unchanged.

**3. No-break spaces.** *el Apéndice I de la CITES* (`back.note.paragraphs[1]`) broke after
*Apéndice* at 1536 and 2048 px. It is now `Apéndice I`, as Volume II writes `Apéndice II`.
The lesson III fact label *Caja craneal, largo : alto* broke as *LARGO :* / *ALTO*. The label and
its value are now `largo : alto` and `unos 4 : 3`, so a ratio stays whole, like
*unos 4 × 3,4 cm* (es-style §2.6). The label now breaks as *CAJA CRANEAL,* / *LARGO : ALTO*. Two
pairs of the same kind did not break in any render, but they could at another width, so they are
joined too: *la lección III* (lesson IV, step 1) and *Lámina, vol. III* (colophon). The
English label has the same break (*LENGTH :* / *HEIGHT*). It is in `src/books/calaveras.js:226`,
the books area's file, and is handed off there.

**4. Previously open; resolved below: the English titles in `commonAlt`.** *Frontal view* … *Skull & snake* print as the
condensed heading of the lesson header and beside each title on the contents page, against lead
decision L6. *Skull & snake* also keeps the ampersand that es-style §4 bans. These are the English
titles, so no Spanish alternative exists. The merge reads a `null` or blank `commonAlt` as missing
text (`src/i18n/edition.js:74`): the English still prints, and the validator reports an error. This
is handed off to core: let a translation set `commonAlt: null`. Once that lands, this file sets
`commonAlt: null` on all six lessons. In a prototype with both edits
(`.scratch/w4/sync-es/r2/tree-b/`), the lesson header shows only the subject in grey (*Cráneo y
mandíbula*; render `r2/crops/proto-cal-lesson1-head.png`). The contents lists the titles alone,
and every side keeps its scale. Whether the header should then show the Spanish title in the
condensed style is the typeset area's call.

**Checks** (private build, `127.0.0.1:4420`; scripts in `.scratch/w4/sync-es/r2/`):

- `node scripts/validate-books.mjs --lang all --fit`: 0 errors. This file has 0 errors, 3 notes and
  1 warning. The warning is `lookCloser[carnassial].name`: the English manifest has had a printed
  name, *Carnassial (P4/m1)*, since 05:09 today, and *Carnicera* keeps none of its numbers. The
  name stays: by L1 it is the pill in `src/i18n/es/skulls.js`, and the note names P4 and m1.
- `fitw.mjs`: the same scales in both languages at page widths 512, 1024, 1536 and 2048.
- `runts.mjs` on the 1024, 1536 and 2048 px renders: the *ALTO* line is gone. No new short line.
- Renders: every side in the typeset harness at 1024, 1536 and 2048 px, and pp. 4, 5, 10, 12, 18
  and 19 at 512 px as well. No line ends in *Apéndice*, *LARGO :*, *lección* or *vol.* at any
  width. In the reader: spread 3 (desktop WebGL 2; phone 390 × 844 WebGPU, intro and how-to pages),
  spread 6 (desktop WebGL 2) and spread 10 (desktop WebGPU).

**Statements above that this section replaces**: §3.5, the how-to bullet (rewritten in place);
§7, the note under "Noted, not changed" (row 5 is now *Examínela de cerca*); §7's style-guide check
"no «» in the text, so no punctuation after a closing mark to check" (the typesetter adds «» to the
pull quote, and its stop sat inside); §8, the `howTo.items[1][1]` row (its text and "*pasa a la
siguiente* is Volume II's"); §3.1, the `commonAlt` bullet (the English titles are now the open
defect in item 4).


### Closed handoff: optional alternate names (2 November 2026)

The interrupted repair is now applied. `src/i18n/schema.js` marks only
`commonAlt` as clearable, and the edition composer accepts an explicit `null`
for this field in a translated edition. The Spanish manifest sets it to `null`
on all 6 plates. English secondary titles no longer appear in the plate
headings or contents; scientific names, authorities and citations remain.

A missing or blank value still falls back to English and reports missing text;
required prose cannot be erased with `null`. English editions keep their
alternate names. Six core regression checks cover these boundaries. `npm test`
passes (249 core checks and 55 hyphenation checks), and `validate-books.mjs
--lang all --fit` passes for all three books at the existing page scales. Fresh
Spanish heading renders confirm the removal. This closes the `commonAlt`
handoff above and supersedes earlier notes retaining English alternate names.
