# Flores — Spanish edition notes

> Notes behind `src/books/es/flores.js` ("Flores — Herbario vivo de Costa Rica", Lámina · Volumen II).
> Translated on 1 November 2026 from the English snapshot `.scratch/bilingual/en-snapshot/flores.js`
> (identical to `src/books/flores.js` at 21:59). It follows `docs/books/es-style.md` (which appeared
> during the work and was applied before delivery) and, where that guide is silent, design-i18n §3.4/§4
> with review rows R1.1, R1.4, R1.9, R1.10 and R6. Facts and their sources stay in
> `docs/books/flores-research.md`; this file covers only the Spanish wording.
> **§5 Review** (the reviewers' issues, applied the same evening) supersedes §1–§4 where they differ;
> §5.4 lists the statements it replaces. **§6 Sync** (2 November) carries the English edits made after
> the snapshot and checks the look-closer names against the figure pills (lead decision L1); it
> supersedes the sections above where they differ.

## 1. Checks run

| check | result |
|---|---|
| `node -e "import('…/src/books/es/flores.js')…"` | loads; 14 top-level keys in English order |
| `.scratch/bilingual/flores-es/check.mjs` (shape, ids, params, theme, label ids, beat times, number parity per string, NBSP before units, quotes, decimal points) | **0 errors**; 2 expected warnings: glossary *Corona* identical to English; *Heliconius* italic added where English said "Longwing" |
| `composeEdition` report (`src/i18n/edition.js`, `loadEdition('flores','es')`) | empty: no missing, extra, changed ids, lengths, types, unknown or order items |
| `node scripts/validate-books.mjs flores --lang es` | 0 errors, 1 warning (English words in `imprint[0]`: the database names, kept as proper names), 1 note (*Corona*) |
| `typeset.html?book=flores&lang=es&page=all` (headless, `scripts/shot.mjs`) | 26 sides, **no overflow, no sideways overflow**, no missing dictionary key. Every side at 100 % except plate I verso 97.5 % (English is also 97.5 %), plate VI verso 97.5 % (English 100 %: the right column is one line longer because *Probablemente abejas, moscas; autógama* wraps) and the making verso 98.8 % (not this file). Chip rows on plates IV–V and every figure meta line fit on one line. |

Length (characters without `*` markup, Spanish / English): every plate ≤ 1.050 counting all its text
(1.040–1.050), 1.046–1.057 counting only translated strings; intro 1.03, how-to 1.06, note 1.09,
glossary 1.03, colophon 1.07, whole book 1.045. Fourteen prose strings (≥ 40 English characters) are
above 1.10, the highest being the colophon's last line (1.21), two beats, one look-closer note and the
note's law paragraph (1.19 each; the law paragraph carries the official law names, and the note page
has half a page free). Fifty short labels exceed 1.10 because the Spanish word is simply longer
(*Distribución* for *Range*, *Tamaño* for *Size*, *Preocupación Menor* for *Least Concern*).

## 2. Term decisions for this book

Sources marked *(this session)* were opened while translating; *(termbase run)* means the page was
opened in the earlier termbase run of this workflow and its tool output (session transcript) was
re-read; `[unverified]` means no source was opened.

| English | Español | source |
|---|---|---|
| labellum, lip | labelo (*el labelo*, never *labio* as a term) | Figueroa et al. 2012, *Rev. Mex. Biodiv.* 83: 73–82 ("labelo", "polinios (= polinario)") *(termbase run)*; es-style §3.2 |
| column | columna | same; es-style §3.2 |
| pollinarium; pollinia | polinario; polinios | Figueroa et al. 2012; Tamayo Cen 2016 (below) uses *polinario* |
| pseudobulb | pseudobulbo | es-style §3.2 (UCR museum spelling); the DPD notes *seudo-* forms spreading *(termbase run)* — both valid |
| food deception | **engaño alimenticio** — differs from es-style §3.2 (*engaño alimentario*, `[unverified]` there) | Tamayo Cen, I. 2016. Polinización por engaño de *Lophiaris andrewsiae*. *Desde el Herbario CICY* 8: 4–8: "polinización por engaño alimenticio", "El engaño alimenticio se refiere al…" *(this session)*, https://cicy.repositorioinstitucional.mx/jspui/bitstream/1003/2388/1/2016-01-14-Tamayo-Cen-Polinizacion-por-enganio.pdf |
| nectar guide | guía de néctar | Alvarado García et al. 2020. Autopistas florales: guías de néctar y su interacción con las abejas. *Herreriana* 1(2) *(this session)*, https://repository.uaeh.edu.mx/revistas/index.php/herreriana/article/view/5408 |
| extrafloral nectary | nectario extrafloral | es-style §3.2 (DLE *nectario*) |
| androgynophore; corona | androginóforo; corona | es-style §3.2 (`[unverified]` there too; Spanish *Passiflora* papers found by search only) |
| epiphyte | epífita (*planta epífita*) | Epidendra (JBL-UCR): "Epífita en bosques estacionales y húmedos" *(termbase run)* |
| bract, rachis, sepal, petal, stamen, anther, ovary, stigma, corolla, calyx, tendril, stipule, leaf stalk, heartwood, pod | bráctea, raquis, sépalo, pétalo, estambre, antera, ovario, estigma, corola, cáliz, zarcillo, estípula, pecíolo, duramen, vaina | DLE entries *(termbase run)*; es-style §3.2 |
| habit (fact label) | Hábito | es-style §3.2, §4 |
| elevation (fact label) | Altitud | es-style §4 (shorter than *Elevación*; matches the Museo Nacional's "distribución altitudinal") |
| whorl by whorl | verticilo a verticilo | es-style §3.2 |
| bud; time-lapse | botón; a cámara rápida | es-style §3.2 |
| dry season | estación seca (12 occurrences) | es-style §3.2 (it notes *época seca* is also Costa Rican usage) |
| water lily; pad | nenúfar; hoja (flotante) — never *lirio de agua*, which the DLE defines as the cala (*Zantedeschia*) | DLE *lirio de agua* *(termbase run)* |
| hummingbird; hermit hummingbirds | colibrí; colibríes ermitaños | DLE *colibrí* *(termbase run)*; *ermitaño* as the Costa Rican group name for *Phaethornis* (e.g. *Ermitaño Colilargo*) seen only in search snippets `[unverified]` |
| orchid bees; euglossine bees; carpenter bees | abejas de las orquídeas; abejas euglosinas; abejas carpinteras | Ospina-Torres et al. 2015, *Rev. Biol. Trop.* 63(3), Spanish abstract; Dressler 1968, *Rev. Biol. Trop.* 15(1), *resumen* ("abejas euglosinas"); DLE *abeja carpintera* *(termbase run)* |
| longwing caterpillars / butterflies | orugas de mariposas *Heliconius*; las mariposas *Heliconius* | es-style §3.2 (genus name, no common name) |
| slipper orchids | orquídeas zapatilla | Muñoz, M. 2007. *Lankesteriana* 7(1–2), abstract: *Phragmipedium* "son comúnmente llamadas zapatillas o 'slipper orchids'" *(this session)*, https://archivo.revistas.ucr.ac.cr/index.php/lankesteriana/article/view/18442 |
| seed plants; with the ferns | plantas con semilla; con los helechos | Jiménez Madrigal 2022, *Rev. Ciencias Ambientales* 56(1), *Resumen*: "las más de 9 000 especies de plantas, ubicadas en 237 familias, con semilla … más de 11 000 especies si incluimos … los helechos" *(this session, PDF text)* |
| most of the year (granadilla) | La mayor parte del año | Museo Nacional de Costa Rica 2020, *Catálogo de especies del género Passiflora en Costa Rica*, row for *P. vitifolia* *(termbase run)* |
| CITES, the Convention on International Trade… | la CITES, la Convención sobre el Comercio Internacional de Especies Amenazadas de Fauna y Flora Silvestres; Apéndice I / II; Parte de la CITES; Autoridad Administrativa CITES; el SINAC (Sistema Nacional de Áreas de Conservación) | Decreto Ejecutivo 40379-MINAE-MAG *(termbase run)*; es-style §3.2 |
| Wildlife Conservation Law (Ley 7317) … requires a SINAC permit to collect | Ley de Conservación de la Vida Silvestre (Ley 7317) exige **licencia** del SINAC para recolectar flora — differs from es-style §3.2 (*permit → permiso*) | the law's own wording, Art. 52 of the 1995 consolidated text: "Para el ejercicio de la extracción y la recolecta de la flora, se requiere de la licencia…" *(termbase run)*, https://www.acto.go.cr/wp-content/uploads/2020/04/ley_conser_vida_silv.pdf. *Permisos* is kept for CITES Appendix II trade. |
| National Parks Law (Ley 6084) forbids visitors to remove plants | Ley del Servicio de Parques Nacionales (Ley 6084) prohíbe a los visitantes extraer plantas de los parques | Ley 6084, Art. 8: "Dentro de los parques nacionales, queda prohibido a los visitantes: 1) Talar árboles y extraer plantas…" *(this session, PDF text)*, https://da.go.cr/wp-content/uploads/2016/06/Ley-del-Servicio-de-Parques-Nacionales-N%c2%ba-6084.pdf |
| Least Concern; IUCN Red List 2019 | Preocupación Menor; Lista Roja de la UICN 2019 | UICN 2012, *Categorías y Criterios de la Lista Roja de la UICN: Versión 3.1*, Anexo 2: "Preocupación Menor, LC" *(termbase run)*; es-style §3.5 |
| jack-in-the-box (mechanism) | mecanismo de «caja sorpresa» (the cited article keeps its English title in the sources) | translation of the nickname; see §4 |

Look-closer names (R1.1) are exactly the ones in es-style §3.6: *Labelo, Columna, Pseudobulbo, Bráctea,
Flor, Raquis, Colibrí, Corona, Androginóforo, Antera, Zarcillo, Hoja, Corola, Guías de néctar, Cáliz,
Rama, Sépalo, Estambres, Estigma, Hoja flotante*. The figure pills in `src/i18n/es/flowers.js` should
use the same words (the guaria pill "Labellum (lip)" → *Labelo (labio)*).

Typography applied: decimal comma (*4–6,7 cm*, *0,5–5 m*); no separator up to four digits (*1600 m*,
*9000*), U+00A0 from five (*11 000*); U+00A0 between every figure and its unit and before *%*
(*28 %*); en-dash ranges; raya incisos with the closing raya kept before a full stop (DPD *raya* 2.1);
«…» with the full stop after the closing mark; *guaria* in italics as a word mentioned (es-style §2.3),
binomials and genera in italics, Spanish words roman; sentence-case titles; *solo* without tilde;
*e IBM Plex Mono*. No-break spaces are written ` ` in the source, as in the English file.

## 3. What could not be rendered exactly (no fact dropped)

- *Costa Rica's* Osa Peninsula / Pacific slope → *la península de Osa*, *la vertiente pacífica*: the
  country is implicit in a Costa Rican book. *Underground rhizomes* → *rizomas* (a rhizome is an
  underground stem by definition).
- *Visiting hermit hummingbirds delivered…* → *los colibríes ermitaños llevaron…* (delivering pollen
  implies the visit); *18 of 25 bees watched at the flowers* → *18 de 25 abejas visitantes*.
- *At home* (domestic law vs CITES) → *En el país*; *SINAC, the national conservation agency* → its
  full name in parentheses (es-style).
- Scale notes drop *long* (*Pétalos de 4–6,7 cm*, *Sépalos de 6–8 cm*, *Brácteas de…*, *Corolas
  de…*): in Spanish floras a single measurement of an organ is its length; *across* is kept (*Flor de
  8–16 cm de ancho*). The meta line under each figure does not wrap, so these were kept short.
- Prose uses unit symbols where English spelled out *metres/centimetres* (es-style §5.2); spelled-out
  numbers stay spelled out (*seis mililitros*, *dos centímetros*).
- *Rose-purple* → *púrpura rosado*: the head colour first (purple tinged with rose); es-style §2.5
  gives *rosado púrpura* as an example, which would make pink the base colour.
- Beats: *Time-lapse:* → *A cámara rápida,*; plate V beat 0 keeps the trumpets, the bare branch tips,
  the swaying and the dry-season wind but conveys *crowd* only through the plural; plate VI beat 0
  *white petals ring a crown of yellow stamens* → *pétalos blancos y una corona de estambres
  amarillos* (the arrangement is implied, the verb is not). Every beat still describes only what the
  loop shows at that time (timings from English, checked against `src/subjects/flowers/*` beats).
- Glossary *Pollinarium*: *stalks* → *pedículos*, *sticky pad* → *disco adhesivo* (the viscidium).
- *Hot lips*, *Easter orchid* … stay as `commonAlt` (English names, design §4.4).

## 4. Open questions for the editor

1. **Consistency across the three Spanish files.** This file follows es-style.md where it differs
   from the other two translations as they stood at 22:35: IUCN labels with the UICN capitals
   (*Preocupación Menor*; Serpientes has *Preocupación menor*); how-to gestures as usted imperatives
   (*Arrastre una esquina*, *Haga clic, toque o deslice*; Serpientes and Calaveras use infinitives);
   `status.source` without a comma because the English has none (*Lista Roja de la UICN 2019*). The
   effect column uses infinitives like the other books, and *base giratoria* (as theirs) rather than
   es-style's *plataforma giratoria*.
2. **engaño alimenticio vs alimentario** — attested form used; es-style's line is unverified.
3. **licencia vs permiso** for Ley 7317 — the law's own term used.
4. **Plural of *cortez***: *los corteces* (regular plural of nouns in *-z*, as *luz → luces*); es-style
   suggests *los cortez amarillos* `[unverified]`. The DPD entry was not re-opened.
5. **«caja sorpresa» vs *jack-in-the-box*** — es-style §2.3 cites *jack-in-the-box* only as an example
   of italicising foreign words; the nickname was translated so a Costa Rican reader gets the image.
6. **Plate VI verso at 97.5 %**: to reach 100 %, shorten the pollinator fact (e.g. *Quizá abejas,
   moscas; autógama*, which weakens *probably*) or one look-closer note by a line.
7. **Capitals in place names**: *Golfo Dulce* (es-style, as the ICP writes it) and *Valle de El
   General* (es-style is silent; treated like *Valle Central*); *península de Osa*, *vertiente del
   Caribe* lowercase.
8. **Database names in the imprint** (*World Checklist of Vascular Plants*, *Plants of the World
   Online*, *International Plant Names Index*) stay in English, roman, as proper names (validator
   warning); Spanish usage would allow italics as titles of works.
9. **Imprint name** stays *Lámina Natural History Press* (es-style §4); the colophon calls it *un sello
   editorial ficticio*.
10. **Pending English edits** (e.g. the `byline` field) are not chased here; the sync step carries them.

## 5. Review (1 November 2026, 23:00–23:45)

Twenty-seven reviewer issues on `src/books/es/flores.js`, applied against the snapshot text, plus a
pass for the places where `es-style.md` decided differently from design §3.4/§4. The English edits
made after 21:59 (the `byline`, the reworded `howTo.items[1][1]`) are left to the sync step.

**Counts: 27 issues: 27 applied, 0 rejected.** Twenty-six proposals are used word for word. One, the
fit issue on the nenúfar's pollinator cell, is applied through a different edit: its wording
*Prob. abejas, moscas; autógama* keeps the claim that the other issue on the same cell corrects. The
cell takes the hedged wording, and the plate VI verso gets back to 100 % by condensing the stamens
note (row 2). That note is the only edit no reviewer proposed.

### 5.1 Issues and decisions

| # | path | now reads | why |
|---|---|---|---|
| 1 | `plates[nenufar].facts[3][1]` (hedge) | *Probablemente abejas, moscas; puede autopolinizarse* | *autógama* classes the species as self-fertilising. The source supports only that self-pollination is possible (Wiersema 1988: homogamy observed → "autogamy possible", research l. 316–318), as the English *can self* and the Spanish body (*también puede autopolinizarse*) say. The body's verb is used rather than *autogamia posible*, because Wikipedia (es) treats self-pollination as necessary but not sufficient for *autogamia*. |
| 2 | same cell (fit) | proposal not used; `lookCloser[stamens].text` → *Muchos estambres amarillos rodean el centro; en los externos, una punta fina rebasa la antera.* | No hedged wording fits one line: every hedged candidate measured is ≥ 15 em (fontTools, EB Garamond 400) against a column of about 13.3–13.8 em. The line was saved in the same column instead: the stamens note keeps every fact (many, yellow, ring the centre, outer ones, slender tip beyond the anther) and drops from 4 lines to 3 (104 → 95 characters, 0.90 × English). `--fit`: plate VI verso 0.975 → 1.000. *Probablemente* stays unabbreviated: the cell needs two lines either way, and es-style §2.6 allows *Prob.* only where space forces it. |
| 3 | `intro.pullQuote` | final full stop dropped | `front.js:305` strips only the marks at the ends and `quote()` (`src/i18n/index.js:343`) wraps the text in «…», so the stop printed inside » (es-style §2.4). Now «…nunca llega—» (intro render checked), as in Serpientes. |
| 4–10 | `howTo.items[0–6][1]` | *Levanta y pasa la hoja, como en papel.* · *Avanza o retrocede una doble página.* · *Hojean el libro desde el teclado.* · *Gira la lámina viva sobre su plataforma giratoria.* · *Vista de cerca; otro doble clic la aleja.* · *Desde la barra, quitan partes, diseccionan la flor verticilo a verticilo y nombran lo que se ve.* · *Guarda la figura como dibujo SVG en color o lineal.* | es-style §0.2(2) and §3.7: the effect column is descriptive, and infinitives are for UI controls. **Superseded on 2 November (§7):** next to a usted gesture these third-person forms read as *tú* imperatives, so the column is now in usted imperatives, as in Serpientes and Calaveras. *Plataforma giratoria* is the termbase term and both sibling books print it. *Gira la lámina viva sobre su plataforma giratoria.* still sets on one line (how-to render). |
| 11 | `howTo.items[0][0]` | *Arrastre una esquina de la página* | Termbase §3.7, and it restores the English *page*. It wraps to two lines, as *Haga doble clic en la figura* already does. |
| 12 | `imprint[0]` | *cotejados con el International Plant Names Index* | *Cotejar* takes *con*: "Confrontar una cosa con otra u otras" (DLE 2005, via WordReference). |
| 13 | `plates[guaria-morada].body[0]` | *…un labelo de garganta blanquecina, enrollado en embudo sobre la columna.* | After *la columna*, the throat read as the column's. |
| 14 | `plates[guaria-morada].facts[4][1]` | *Bosques estacionales y húmedos* | Two forest types, as in the English, the body and Epidendra. It still sets on one line. |
| 15 | `plates[platanilla].body[0]` | *…varias flores delgadas y blancas que viran…* | The relative clause no longer hangs on a bare adjective. |
| 16 | `plates[granadilla-de-monte].lookCloser[anther].text` | *Cinco anteras cuelgan para cubrir de polen al visitante.* | 1.17 → 1.04. *Listas* is manner, not a fact. |
| 17 | `…lookCloser[tendril].text` | *Las* Heliconius *desovan en la punta tierna de los zarcillos.* | 1.19 → 1.02. The body on the same page calls them *mariposas* Heliconius. |
| 18 | `plates[labios-de-mujer].body[1]` | *…la publicidad que las diminutas flores no pueden.* | The infinitive after *poder* is elided, as in *hago lo que puedo*. |
| 19 | `plates[cortez-amarillo].body[1]` | *rodales enteros florecen a la vez* | Trees *florecen*; *abrir* is said of flowers. |
| 20 | `plates[cortez-amarillo].didYouKnow` | *los cortez sin hojas* | Termbase §3.2 treats *cortez* as invariable, and so does El Observador (*los cortez amarillo*). A search found no *los corteces*. Replaces §4 question 4. |
| 21 | `plates[cortez-amarillo].animation.beats[0][1]` | *En las ramitas desnudas se mecen trompetas doradas al viento de la estación seca.* | 1.16 → 1.08, and two lines in the phone caption instead of three (the reviewer's estimate). *Ramitas* is the next beat's word. |
| 22 | `…beats[2][1]` | *Se posa en el suelo.* | *Aterrizar* is for aircraft, and *abajo* was redundant. |
| 23 | `plates[nenufar].body[1]` | *…un surfactante en ella lava el polen…* | *Él* could be the stigma; *ella* can only be *la poza*. |
| 24 | `…beats[1][1]` | *Desde el tallo de la flor se extienden ondas por el agua quieta.* | Avoids a bare plural as the preverbal subject. |
| 25 | `plates[nenufar].didYouKnow` | *Los nenúfares integran uno de los linajes de plantas con flor actuales que divergieron primero.* … | *Divergir de las plantas con flor vivas* read as diverging *from* them, outside the group. *Actuales* is the botanical word for extant (López-Contreras et al. 2013). |
| 26 | `back.glossary[6][0]` | *Engaño alimentario* | Termbase §3.2. FundéuRAE, following the DPD, keeps *alimentario* for 'de los alimentos'. The form is attested in a botanical abstract (Costa et al. 2023). The first draft's *engaño alimenticio* is the form of the CICY outreach notes (Tamayo-Cen 2016, 2020) and the DLE accepts it, so this is a normative choice, not an error fixed. Replaces §4 question 2. |
| 27 | `back.colophon[4]` | *Ninguna planta se cortó, arrancó ni recolectó para esta obra.* | 1.21 → 1.09. All three actions are kept; *arrancar* is the usual verb for pulling a plant up. |

### 5.2 Alignment with es-style.md where it differs from the design

- **IUCN labels with the UICN's capitals**: already *Preocupación Menor* (plates IV, V); no category
  is named in running text.
- **Usted in book text, descriptive effect column** (§0.2(2), §3.7): rows 4–11. The intro, the note
  and the look-closer notes already used usted imperatives; no infinitive instruction is left in
  book text.
- **Termbase terms the first draft had departed from** now follow the guide: *plataforma giratoria*,
  *esquina de la página*, *engaño alimentario*, invariable *cortez*. Two departures remain by
  decision, with their sources in §2 and §3: *licencia* for Ley 7317 (the law's own word) and
  *púrpura rosado* (the head colour first).
- **The guide's additions**, rechecked:
  - punctuation after » (*«flor».*, *«caja sorpresa» en*; the pull quote is handled by row 3);
  - *Ley 7317*, *Ley 6084* and years ungrouped;
  - *pseudobulbo*;
  - every caption opens with `Fig. n — `;
  - the intro opens with *Costa Rica*;
  - `blurb` 115 characters (≤ 139);
  - no English common name in prose.

  The imprint's database names stay roman as proper names (§4 question 8).

### 5.3 Checks after the review

| check | result |
|---|---|
| module import | loads; 14 keys in English order, 6 plates, `locale: 'es'` |
| `flores-es/check.mjs` (shape, ids, params, theme, label ids, beat times, numbers, units, quotes) | **0 errors**; the same 2 expected warnings (*Corona* identical; *Heliconius* italic) |
| look-closer names | 22 of 22 rows have a `name` of ≤ 3 words |
| `validate-books.mjs flores --lang es` | 0 errors, 1 warning (database names in `imprint[0]`), 1 note |
| `validate-books.mjs flores --lang all --fit` (dev server, about 23:40) | 0 errors. Every Spanish side has the English scale except the making prompt (0.988, not this file). Plate VI verso 0.975 → **1.000**; plate I verso 0.975 in both editions. |
| length per plate, all text / translated only | 1.042/1.047 · 1.050/1.057 · 1.042/1.047 · 1.046/1.051 · 1.044/1.050 · **1.053**/1.062; whole book 1.044 (1.045 before) |
| strings over 1.10 | 61 (64 before); prose strings of ≥ 40 English characters: 11 (14 before) |

**Above the targets, kept on purpose:**

- **Plate VI is 1.053 (> 1.05).** The restored hedge (row 1, +13 characters) accounts for all of
  it; without that cell the plate would be at 1.048. es-style §5 forbids dropping a hedge and makes
  `--fit` the binding check, and the verso now prints at 100 %. *Prob.* would give 1.0498, but
  space does not force the abbreviation.
- **Eleven prose strings are above 1.10.** One comes from the review: *Gira la lámina viva sobre su
  plataforma giratoria.*, 1.22, termbase, one line on a half-empty page. The review did not raise
  the other ten:
  - beats VI-0 (1.19) and IV-2 (1.19);
  - the note's law paragraph (1.19; official law names);
  - look-closer notes: rachis (1.15), opposite leaves (1.14), pad (1.11), pseudobulb (1.11),
    nectar guides (1.11), corona (1.10);
  - beat III-0 (1.11).

  None changes a page: every side sets at the English scale.
- **The other 50 strings over 1.10** are labels and short values where the Spanish word is simply
  longer. Rows 1, 11 and 14 raised three of them; none of the three changes a page's scale.

### 5.4 Statements above that this section replaces

- §1: plate VI verso at 97.5 % → 100 %; *fourteen prose strings* → eleven; the colophon line's 1.21
  → 1.09.
- §2: *food deception* → *engaño alimentario* (row 26).
- §3: the plate V beat 0 wording (row 21).
- §4: question 1 (effect column and *base giratoria*: rows 4–10); question 2 (row 26); question 4
  (row 20); question 6 (row 2).

### 5.5 Sources opened for this review (2026-11-01)

- FundéuRAE, «*alimentario* y *alimenticio*, usos adecuados», 27/10/2021 (fetched with curl; the
  page cites the DPD). https://www.fundeu.es/recomendacion/alimentario-y-alimenticio/
- El Observador (Costa Rica), «Fotos y video | Miles de árboles tiñen los paisajes de Costa Rica con
  sus hermosas flores multicolores», 24 March 2024 ("los amarillos brillantes de los cortez
  amarillo").
  https://observador.cr/fotos-y-video-miles-de-arboles-tinen-los-paisajes-de-costa-rica-con-sus-hermosas-flores-multicolores/
- Web search «"los corteces" árboles Costa Rica»: no attestation found. `[search only]`
- WordReference, *cotejar*, from *Diccionario de la lengua española* © 2005 Espasa-Calpe.
  https://www.wordreference.com/definicion/cotejar
- Wikipedia (es), *Autogamia*. https://es.wikipedia.org/wiki/Autogamia
- López-Contreras, J. E., Endañú-Huerta, E. & Amador-del Ángel, L. E. 2013. Un representante acuático
  de las angiospermas ancestrales en la península de Yucatán: *Nelumbo lutea* Willd. *Desde el
  Herbario CICY* 5: 47–48 ("descendientes actuales de las primeras angiospermas"; "parte de las
  angiospermas actuales").
  https://cicy.repositorioinstitucional.mx/jspui/bitstream/1003/2272/1/2013-06-06-Contreras-et-al-Nelumbo-47-48.pdf
- Costa, Y. da S., da Silva, B. M. & Salvioni, H. G. 2023. Caracterização anatômica e histoquímica
  do nectário floral de *Vanilla palmarum*. *RECIMA21* 4(10): e4104232, Spanish *resumen* ("su
  engaño alimentario"). https://doi.org/10.47820/recima21.v4i10.4232
- Tamayo-Cen, I. 2020. Comentarios sobre la polinización de *Encyclia nematocaulon* (Orchidaceae).
  *Desde el Herbario CICY* 12: 169–174 (keyword "engaño alimenticio").
  https://cicy.repositorioinstitucional.mx/jspui/bitstream/1003/2600/1/2020-08-27-Tamayo-Cen-Comentarios-sobre-la-polinizacion.pdf
- Project files:
  - `src/engine/typeset/layouts/front.js:305`, `src/i18n/index.js:343`;
  - `docs/books/flores-research.md` l. 316–318;
  - scripts and renders in `.scratch/bilingual/flores-es-review/`: `fit.mjs` serves a candidate file
    in place of this one through a Playwright route; `apply.mjs` applies the edits; `width.py`
    measures em widths; `v3-p5/6/7/15/17/20.png` are the renders.

## 6. Sync with the live English (2 November 2026)

The English manifest was edited after the 21:59 snapshot. This pass carried every edit listed in
`.scratch/bilingual/en-changes.md`. A diff of `.scratch/bilingual/en-snapshot/flores.js` against
`src/books/flores.js` shows the same two edits and their code comments, nothing else.

| path | English now | Spanish now | note |
|---|---|---|---|
| `byline` | `{ name: 'Josoroma', mark: 'josoroma' }` | the same | An ID value: the reader takes it from English whatever this file holds. Copied with its comment so the file stays a key-for-key copy of the English. |
| `howTo.items[1][1]` | *Turn forward on the right-hand page, back on the left; when one page fills the screen, a tap reads on.* | *Avanza en la página derecha y retrocede en la izquierda; si una página llena la pantalla, un toque pasa a la siguiente.* | Was *Avanza o retrocede una doble página.* Descriptive third person with a final period, like the rest of this column (§5.1 rows 4–10). *Si una página llena la pantalla* is Volume I's wording, and U+00A0 joins *la pantalla* as it joins the English *the screen*. *Pasa a la siguiente* renders *reads on* with the termbase's verb for turning a page (es-style §3.7) and avoids a second *avanza*. 1.17 × the English (102 → 119 characters). It sets in two lines, as the English row does, and the page stays at 100 %. The English comment over the row is mirrored. |

**Look-closer names (lead decision L1).** Each `name` must be exactly the Spanish pill of the same
label in `src/i18n/es/flowers.js`. The flowers dictionary gave its pills the names of es-style
§3.6 (*Labellum (lip)* → *Labelo*, *Pad* → *Hoja flotante*, …), so all 22 rows already matched and
no name changed. Widest: *Guías de néctar*, 97 px of the 110 px a pill may take.

**Checks** (private build, `127.0.0.1:4420`; scripts in `.scratch/w4/sync-es/`):

- `node scripts/validate-books.mjs --lang all`: 0 errors. This file: 0 errors, 1 warning (the
  database names in `imprint[0]`, §4 question 8), 1 note.
- `composeEdition` against the live English: empty report.
- `shape.mjs`: keys, key order, list lengths and ID values identical to the live English.
- `--fit`: every side at the English scale (plate I verso 0.975 in both editions). The making
  prompt's 0.988 comes from the making texts, not this file. `fitw.mjs` gives the same scales at page
  widths 512, 1024, 1536 and 2048.
- Renders: the how-to page in the typeset harness in both languages, and in the reader on a phone
  (390 × 844, WebGPU).

**Statements above that this section replaces**: §5.1 row 5 (the effect text of how-to row 2);
§4 question 10 (the byline and the how-to row are now carried).

## 7. Repair after the verifiers (2 November 2026)

The es-pages verifier found the how-to page (p. 5) mixing registers. The gesture column is in
usted (*Arrastre*, *Haga clic*), and beside it the descriptive third person of the effect column
(*Levanta y pasa*, *Gira*, *Guarda*) reads as *tú* imperatives, the forms es-style §1 rules out
(its example is *arrastra*). Volume I made the same change in its review for the same reason
(serpientes-es-notes §6.1, issue 2). The effect column is now in usted imperatives, as es-style
§0.2(2) and the rows of §3.7 have it (*retire la piel*, *nombre las partes*, *guarde como SVG*).

| path | was | now | note |
|---|---|---|---|
| `howTo.items[0][1]` | *Levanta y pasa la hoja, como en papel.* | *Levante y pase la hoja, como en papel.* | 1.03 × the English. |
| `howTo.items[1][1]` | *…retrocede en la izquierda; si una página llena la pantalla, un toque pasa a la siguiente.* | *Avance en la página derecha y retroceda en la izquierda; si una página llena la pantalla, toque para seguir.* | *Toque para seguir* is Volume I's clause for *a tap reads on*, and Volume III now uses it too. U+00A0 still joins *la pantalla*. 1.06 × the English, two lines as before. |
| `howTo.items[2][1]` | *Hojean el libro desde el teclado.* | *Hojee el libro desde el teclado.* | |
| `howTo.items[3][1]` | *Gira la lámina viva sobre su plataforma giratoria.* | *Gire la lámina viva sobre su plataforma giratoria.* | Still one line. |
| `howTo.items[4][1]` | *Vista de cerca; otro doble clic la aleja.* | *Examínela de cerca; otro doble clic la aleja.* | es-style §3.7 gives *examinar* for *inspect*. Volume I prints *Examínela de cerca*. |
| `howTo.items[5][1]` | *Desde la barra, quitan partes, diseccionan la flor verticilo a verticilo y nombran lo que se ve.* | *Desde la barra de herramientas, retire partes, diseccione la flor verticilo a verticilo y nombre lo que ve.* | *Retire* is the termbase verb for *peel* (§3.7, *retire la piel*), and *barra de herramientas* is its term for *toolbar*. The verifier's shorter wording (*Desde la barra, quite partes…*) left *lo que ve.* alone on the second line at 1024, 1536 and 2048 px. That line is 13 % of the first, under the 16 % that the verifier's check (`.scratch/w4/verify-es-pages/runts.mjs`) accepts. With the full term, the second line reads *verticilo y nombre lo que ve.* at every width. 1.18 × the English. |
| `howTo.items[6][1]` | *Guarda la figura como dibujo SVG en color o lineal.* | *Guarde la figura como dibujo SVG en color o lineal.* | |

**Checks** (private build, `127.0.0.1:4420`; scripts in `.scratch/w4/sync-es/r2/`):

- `node scripts/validate-books.mjs --lang all --fit`: 0 errors. This file has 0 errors, 1 warning
  (the database names in `imprint[0]`, as before) and 1 note. Every side is at the English scale,
  and the how-to page is at 1.000.
- `fitw.mjs`: the same scales in both languages at page widths 512, 1024, 1536 and 2048.
- `runts.mjs` on the 1024, 1536 and 2048 px renders: no short line on the how-to page. The rest of
  the book reports the same lines as before the repair.
- Renders: p. 5 in the typeset harness at 512, 1024, 1536 and 2048 px; the reader at spread 3 on
  desktop WebGPU; and a phone (390 × 844, WebGL 2) framing the how-to page.

**Previously open; resolved below: the English names in `commonAlt`.** The same verifier found each plate's English name
(*Easter orchid* … *Dotleaf water lily*) printed under the Spanish title and on the contents page,
against lead decision L6. No change in this file can remove them. es-style §3.2 gives another
Spanish name for one plate only (the granadilla de monte: *flor de pasión*, *pasionaria*). The
merge also reads a `null` or blank `commonAlt` as missing text (`src/i18n/edition.js:74`), so the
English still prints and the validator reports an error. This is handed off to core: let a
translation set `commonAlt: null`. Once that lands, this file sets `commonAlt: null` on all six
plates. A prototype with both edits (`.scratch/w4/sync-es/r2/tree-b/`) prints no English name on
any page, and every side keeps its scale.

**Statements above that this section replaces**: §5.1 rows 4–10 (the effect texts, and "this
matches Serpientes and Calaveras", now marked there); §5.2, second bullet ("descriptive effect
column"); §6, the `howTo.items[1][1]` row (its text and "descriptive third person … like the rest
of this column"); §3, the line on *Hot lips*, *Easter orchid* (these English names are now the
open defect above).


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
