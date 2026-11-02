# Spanish edition — style guide and termbase (es-CR)

*For the editor, translators and reviewers of the Spanish edition of **Serpientes**, **Flores** and
**Calaveras**. Written 2026-11-01 against the English manifests as they stood at 21:59
(`.scratch/bilingual/en-snapshot/`). It applies to `src/books/es/<id>.js` and to any Spanish
dictionary string in `src/i18n/es/*.js` that prints book furniture. Where the implementation design
(`.scratch/bilingual/design-i18n.md`, §3.4 and §4) and this guide disagree, this guide wins; every
disagreement is listed in §0.2. Source codes in square brackets (e.g. **[ICP-pa]**) point to §8.
`[unverified]` marks a choice that could not be checked against a source in the time available.*

---

## 0. Decisions at a glance

| topic | decision | § |
|---|---|---|
| Variety and register | Costa Rican Spanish for an international reader; **usted** for every instruction, impersonal *se* where natural; no voseo, no tuteo; museum-catalogue tone | 1 |
| Decimal sign | **comma** (`1,2–1,8 m`), a deliberate Costa Rica/CLDR choice; the *Ortografía* recommends the point but lists Costa Rica among the countries that use both | 2.6 |
| Thousands | no separator up to four digits (`1500 m`, `3821 m`); U+00A0 from five (`11 000`); **never** in years, laws, pages (`Ley 7317`, `2026`) | 2.6 |
| Units, `%` | number + U+00A0 + symbol (`1,5 m`, `28 %`); degrees attached (`90°`) | 2.6 |
| Ranges | **en dash** (U+2013), no spaces: `1,2–1,8 m`, `febrero–marzo`; in prose `de 8 a 25 metros` | 2.5 |
| Incisos | **raya** (U+2014) with Spanish spacing: ` —inciso— `; the closing raya stays before a full stop | 2.5 |
| Quotation marks | «…» first level, “…” inside, ‘…’ third; full stop and comma go **after** the closing mark | 2.4 |
| Capitals | sentence case for every title; common names, months, Spanish taxon names lowercase | 2.2 |
| Italics | binomials, genera, Latin used as Latin, genuine foreign words; Spanish words the English edition italicised become roman | 2.3 |
| Snake names | **feminine**, as the ICP writes them: *la terciopelo, la bocaracá, la coral, la cascabel, la matabuey, la béquer* | 3.1 |
| Antivenom | **suero antiofídico** (polivalente / anticoral) | 3.1 |
| IUCN labels | the nine official UICN names **with the UICN's capitals**: *Preocupación Menor (LC)*, *Casi Amenazado (NT)*… | 3.5 |
| Anatomy (Calaveras) | traditional Spanish/Latin American anatomical names: *apófisis* (not *proceso*), *esfenoides, etmoides, lagrimal, cornete nasal inferior* | 3.3 |
| Imprint name | **Lámina Natural History Press** stays as it is in both editions (a proper name); described in Spanish as *sello editorial* | 4 |
| Subtitles | *Atlas vivo de las serpientes de Costa Rica* · *Herbario vivo de Costa Rica* · *Dibujar el cráneo: un método constructivo* | 4 |
| Kicker, edition | `Lámina · Volumen I` · `Primera edición, 2026` | 4 |
| Length | translate to fit: no fact, number, hedge or source may be dropped; techniques in §5 | 5 |

### 0.1 Fixed constraints from the implementation (do not fight them)

- **Same shape as English**: same keys, same order, same array lengths; `locale: 'es'`. Non-text
  values (ids, params, numbers, beat times, label ids, theme) are taken from English at run time
  [DES §2.1].
- **Kinds** [DES §2.2]: `title`, `common`, `commonAlt` (snakes, flowers), `authority`, `sources[]`
  are SAME (may stay identical); binomials stay identical. Calaveras' `scientific` and `family`
  strings that are not binomials or taxa (*Cranium & mandible*, *Human skull · norma frontalis*) are
  translated (R1.9, R1.10).
- **`lookCloser[].name`** is a new field, required in Spanish, **≤ 3 words** (R1.1). The Spanish
  names for every label id used today are in §3.6.
- **Captions keep their lead-in** `Fig. 1 — ` / `Fig. I — ` exactly: the typesetter parses it
  (`blocks.js:319` accepts `Fig.`, `Lám.`, a numeral and `—`).
- **`pullQuote` carries no quotation marks**: the typesetter adds «…» (R6: a translator's «» would
  print doubled).
- **First paragraph of `intro`** must not open with `¿`, `¡` or `«` until R1.8 lands (the drop cap
  drops the mark).
- **Back-cover `blurb` ≤ 139 characters** (R8: that is what leaves room for the moved title and the
  author mark).
- **`facts[][1]` keeps number parity** with English (the validator compares numbers): do not spell
  out, add or drop a number in a fact value.
- **Markup**: `*italic*`, `**bold**` as in English; the no-break space is written ` ` in the
  JS source; dictionary `{placeholders}` are kept.

### 0.2 Where this guide differs from design §3.4/§4 — translators must apply these

1. **IUCN category labels (§4.3)**: the design lists sentence case (*Preocupación menor*, *Casi
   amenazado*…) and R6 corrected only EW. The regional guidelines the design cites **[UICN-reg]**
   and the defining *Categorías y Criterios* v3.1 **[UICN31]** both print **every** category with
   capitals in running text — *Preocupación Menor*, *Casi Amenazado*, *En Peligro Crítico*, *Datos
   Insuficientes*, *No Evaluado*, *Extinto en Estado Silvestre*. The design's Figura 2 (p. 14) is an
   image that cannot be read as text; the running text of the same document (pp. 13–17) is
   unambiguous. Use the nine forms of §3.5 in
   `status.label` and in the typeset dictionary (`draw.js:270–278`).
2. **Book text uses usted, not infinitives (§3.4 last paragraph)**: the design's infinitive rule is
   for UI controls (*Reproducir la animación*). Manifest text — how-to rows, lesson steps, pro tips,
   the snakebite note — addresses the reader with **usted** imperatives (*Arrastre una esquina de la
   página*), as the Instituto Clodomiro Picado does in its own guidance **[ICP-pa]**, **[ICP-prev]**.
   Headings and step titles use infinitives or noun phrases (*Abrir la mandíbula*).
3. **Additions the design does not state** (not contradictions, but reviewers will check them):
   punctuation after closing quotes (§2.4); en dash kept although the *Ortografía* prescribes the
   hyphen for ranges (§2.5); no thousands separator in years and law numbers (§2.6); feminine snake
   names (§3.1); *pseudobulbo* spelling (§3.2); UICN category named, not inflected, in running text
   (§3.5); English names inside Spanish prose in italics (§2.3).

---

## 1. Register and voice

- **Usted, always, for instructions.** Costa Rica is a voseo country — the DPD notes voseo is general
  in all social classes there and tuteo is restricted **[DPD-voseo]** — but written institutional
  Spanish addresses the reader as *usted*: *Calme a la persona y póngala en reposo*; *Utilice
  siempre calzado* **[ICP-pa]**, **[ICP-prev]**. Never *vos* forms (*arrastrá, dibujá*), never *tú*
  forms (*arrastra, tu cráneo*).
- **Drop the pronoun.** Write *Dibuje un círculo*, not *Usted dibuje*; *su* only where it cannot be
  misread (in Calaveras *su cráneo* could be the reader's or the jaguar's — prefer *el cráneo
  humano*).
- **Impersonal where the English is general**: *se ve*, *se dibuja*, *conviene*. English *you* in
  general statements (*Every face you will ever draw*) becomes *Todo rostro que dibuje* or an
  impersonal form, whichever is shorter.
- **Tone**: a museum catalogue — exact, sober, no exclamation marks, no hype; hedges are facts
  (*probably* → *probablemente*, *usually* → *por lo general / suele*, *about* → *unos, cerca de*).
- **Calaveras' lesson text** is direct teaching: usted imperatives in `steps[].text`, `proTip`,
  `body`; `mistakes[]` stay as short diagnoses (*Órbitas redondas y fijas. Son cuadrados de esquinas
  redondeadas…*).

---

## 2. Orthography and typography

Authority: RAE/ASALE, *Ortografía de la lengua española* (2010) and the *Diccionario panhispánico
de dudas* (DPD); domain terms from the sources in §3.

### 2.1 Accents and small words

- **No tilde on *solo* or on the demonstratives** (*este, ese, aquel*), pronoun or not: the DPD
  states that tilde "no está justificada" **[DPD-solo]**. Monosyllables never take a written accent
  (*guion, fue, dio*).
- **Capitals keep their accents**: `LÁMINA`, `LECCIÓN`, `ÍNDICE` **[DES §4.1]**.
- ***o* between figures takes no tilde** (*250 o 300*); ***o* → *u*** before /o/ (*7000 u 8000*,
  *siete u ocho*) **[DPD-o]**. ***y* → *e*** before /i/ (*Pacífico e Índico*; *EB Garamond e IBM
  Plex*, which `Intl.ListFormat('es')` already produces, R8).
- `¿…?` and `¡…!` always open and close.

### 2.2 Capitals

- **Titles: sentence case** — only the first word and proper names (*¿Por qué tantas serpientes?*,
  *Cómo usar este libro*, *Mire, no corte*) **[DPD-may 5.2.24, 5.2.25]**. This covers book titles,
  section titles, intro and note titles, step titles, animation titles, badges and fact labels.
- **Common names of species are common nouns**: lowercase in running text (*la terciopelo, la
  bocaracá, el jaguar, la guaria morada, el cortez amarillo*). The plate title `common` is a title,
  so its first letter is capital (*Guaria morada*). The ICP's *serpiente Oropel* is not followed:
  *oropel* **[ICP19 l. 1528; DPD-may 5.4.6 by analogy]**.
- **Spanish names of taxa lowercase** (*los vipéridos, los elápidos, las orquídeas, la familia de las
  rubiáceas*); **Latin taxa capitalised** (*Viperidae, Crotalinae*) **[DPD-may 5.4.6, 5.2.9]**.
- **Months, days and seasons lowercase**: *en junio de 1939*, *de enero a finales de abril*, *la
  estación seca* **[DPD-may 5.4.12]**.
- **Laws, conventions, institutions**: every significant word capitalised — *Ley de Conservación de
  la Vida Silvestre*, *Convención sobre el Comercio Internacional de Especies Amenazadas de Fauna y
  Flora Silvestres*, *Instituto Clodomiro Picado*, *Lista Roja de la UICN* **[DPD-may 5.2.28]**,
  **[DE40379]**.
- **Geography**: generic nouns lowercase before a name — *cordillera de Talamanca*, *vertiente del
  Caribe*, *península de Osa* `[unverified: Ortografía rule not re-read]` — but *Golfo Dulce* and
  *Bahía Culebra* keep the capital, as the ICP writes them **[ICP19 l. 1151–1153]**; *Valle
  Central*. Demonyms lowercase (*costarricense, centroamericano*).
- **Parts of this book in running text**: *la lámina IV*, *la lección III* (lowercase noun, Roman
  numeral). The typeset kickers set them in capitals by code.

### 2.3 Italics

- **Italic**: binomials and genera (*Bothrops asper*, *B. schlegelii*, *Guarianthe*), subspecific
  epithets (*xanthos*), Latin used as Latin (*asper*, *anthos*) **[DPD-may 5.2.9]**; English and other
  foreign words used in the Spanish sentence (*fer-de-lance*, *jack-in-the-box*) — the DPD recommends
  italics, not quotes, for raw foreign words in print **[DPD-com 2d]**.
- **Roman** (no longer foreign): every Spanish word the English edition italicised — *terciopelo,
  tobobas, rabo amarillo, cascabel muda, oropel, guaria, calavera* — and Costa Rican place names.
- **A word mentioned as a word** (the English explains a name): italic, its meaning in «…»
  (*el nombre* terciopelo *alude a esa tela*; *anthos*, «flor») **[DPD-com 2e]**. The DPD reserves
  ‘…’ for meanings in linguistic works **[DPD-com 2f]**; this edition is not one, so «…» keeps the
  quotation system to one mark.
- Latin higher taxa stay roman, as in English (*Viperidae · Crotalinae*) **[DPD-may 5.2.9]**.
- Titles of books and journals in `sources[]` keep the English markup (SAME).

### 2.4 Quotation marks

**Confirmed: «…» at the first level**, “…” inside, ‘…’ innermost. The DPD recommends the angular
marks first in printed texts and gives exactly this nesting **[DPD-com 1]**; the Instituto Clodomiro
Picado uses «…» on its own pages (*«tobobas»*, *«serpiente equis»*) **[ICP-pa]**, **[ICP-sp]**. The
fonts carry «» in every face in use (R4).

- **Punctuation after the closing mark**: *…de la palabra costarricense* guaria *y del griego*
  anthos, *«flor».* — not *«flor.»* **[DPD-com 3a]**. The English edition does the opposite
  (“flower.”); reviewers check every closing mark.
- Marks hug the text inside, take a space outside **[DPD-com 1]**.
- No quotes for emphasis or for scientific names; no quotes around `pullQuote` (§0.1).
- *“four nostrils”* → *las «cuatro narices»* — and it is the ICP's own phrase, *tobobas de cuatro
  narices* **[ICP19, l. 1375–1380]**.

### 2.5 Dashes and hyphens

| sign | use | example |
|---|---|---|
| **raya** — U+2014 | incisos: space before the opening raya, none after it; none before the closing raya, space after it; the closing raya is **never** dropped, not even before a full stop **[DPD-raya 2.1]** | *la terciopelo —abundante cerca de las casas— causa…*; *…su propio sistema —el chischil—.* |
| raya as separator | caption lead-in and title–subtitle joins, spaced, as in English (parsed by code) | *Fig. 1 — La terciopelo…*; *Serpientes — Atlas vivo…* |
| **en dash** – U+2013 | numeric and calendar ranges, unspaced | *1,2–1,8 m*, *50–75 cm*, *febrero–marzo*, *1993–2006* |
| hyphen - | compounds that need one, *9-1-1*, citation page ranges kept as the source gives them | *teórico-práctico* (rare here) |

- Use U+2014 for the raya, not U+2015 (the RAE website's character): U+2014 is the glyph verified in
  every face (R4); U+2015 was not checked.
- **Ranges: en dash confirmed, against the letter of the *Ortografía***. The *Ortografía* names the
  hyphen as the connector of any numeric interval (*las páginas 23-45*, *20-25 %*) **[OLE-gui]**. The
  edition keeps the typographic en dash because (1) both editions then set ranges identically and the
  validator's number parity is unaffected; (2) in Spanish a line break at a hyphen repeats the hyphen
  on the next line (DES §5.1), which would turn *1,2-* / *-1,8 m* into an apparent negative number;
  the en dash is never treated as a compound hyphen. The editor may revisit this; it is one global
  replace.
- With words, use words: *de 8 a 25 metros*, *entre 50 y 75 cm* — never *de 8–25*. With symbols, the
  unit once, after the second figure: *8–25 m* (RTCR 443 A.7 prefers the unit repeated, *de 23 m a
  27 m*; the facts tables cannot afford it) **[RTCR A.7]**.
- English hyphenated compounds become Spanish phrases or single words: *heat-sensing* → *termosensible
  / que detecta el calor*; *three-lobed* → *trilobulada*; *rose-purple* → *rosado púrpura*;
  *red-edged* → *de borde rojo*.

### 2.6 Numbers and units

| rule | write | not | source |
|---|---|---|---|
| decimal sign: comma | `1,2–1,8 m`, `2,8 millones`, `48,8 mm` | `1.2 m` | see below |
| no separator for four digits | `1500 m`, `3821 m`, `2524 cráneos` | `1 500`, `1.500`, `1,500` | **[OLE-mil]**, **[DES §4.1]** |
| U+00A0 from five digits | `11 000 especies` (`11 000`) | `11.000`, `11,000` | **[OLE-mil]**, **[RTCR A.8]**, **[CLDR]** |
| never group identifiers | `2026`, `Ley 7317`, `Ley 6084`, page ranges, `9-1-1` | `Ley 7 317` | **[OLE-mil a–e]** |
| unit after U+00A0 | `1,5 m`, `6 mL`, `49 mm`, `56 kg` | `1,5m` | **[OLE-sim f, h]**, **[RTCR A.6.1]** |
| percent: U+00A0 + `%` | `28 %` (`28 %`) | `28%` | **[OLE-sim f]**, **[OLE-pct]** |
| degrees of angle attached | `90°`, `15°` | `90 °` | **[OLE-sim f]**, **[RTCR A.6.2]** |
| multiplication | `4 × 3,4 cm` (no-break spaces) | `4x3,4` | **[OLE-sim i]** |
| ratio | `4 : 3`, as English | | — |
| abbreviations | `máx.` (*6 mL máx.*), `aprox.` only if space forces it (prefer *unos*), `et al.` | `max.` | **[DPD-abr]** |
| *m s. n. m.* | avoid; write *del nivel del mar a 1500 m*, as the ICP does | `msnm` | **[DPD-abr]**, **[ICP-sp]** |
| ordinals | words in prose (*cuarto premolar superior*); dental shorthand as English (*P4*, *m1*) | `4to.` | — |
| decades | *en la década de 1880* | *los 1880s* | — |

**Why the decimal comma** (R6). The *Ortografía* recommends the point "con el fin de promover un
proceso tendente hacia la unificación", and it lists Costa Rica — with Bolivia, Cuba and El Salvador
— among the countries where **both** signs are used **[OLE-dec]**. Costa Rica's metrology regulation
allows either sign and writes its own examples with the comma (*245,76 m*, *12 345 678,9*)
**[RTCR A.5, A.8]**; CLDR's `es-CR` locale formats with the comma and groups with U+00A0
**[CLDR]**. The comma is therefore a deliberate Costa Rica/CLDR choice, consistent with the
formatter (`Intl` `es-CR`) that prints run-time numbers in the same edition. Costa Rican sources
are themselves mixed — the ICP handbook writes *1,60 y los 1,70 metros* and, a few lines later,
*1.70 m*, and groups *2.900 especies* with a point **[ICP19 l. 276, 1857, 1881]**, while the ICP
website groups four digits with a space (*1 500 m*) **[ICP-sp]** — so consistency matters more than
any single precedent.

- Exceptions that keep the point: software and version names (*Three.js*, *Versión 3.1* in the UICN
  title), citations copied as SAME, and anything inside a URL.
- Numbers in words vs figures: follow the English choice in prose; figures are allowed where they
  save space in technical passages (≥ 10), never at the start of a sentence.
- *2.8 million years* → *2,8 millones de años* (U+00A0 between *2,8* and *millones*, as the English
  manifest has).

### 2.7 Abbreviations, numerals, symbols

- **`Fig.`** stays (captions; the code parses it). *Lám.* is accepted by the parser but not used.
  [unverified: the DPD abbreviation list was not re-checked for *fig.*]
- **Roman numerals**: plate and lesson numerals as in English (`I`–`VII`), uppercase, never
  hyphenated; *Lesson III* in prose → *la lección III*.
- **"PLATE" → "LÁMINA"** (`Plate {numeral}` → `Lámina {numeral}`), **"LESSON" → "LECCIÓN"**; the
  uppercase is applied by code and keeps the accent.
- Cardinal points written out in prose and facts: *oeste del Valle Central*, *sur de México* (not
  *W*, *S*).
- Keyboard keys stay as in English (`E`, `L`, `S`, `1–9`, `Esc`); only key names translate
  (*barra espaciadora*, *teclas de flecha*) **[DES §0]**.

### 2.8 Hyphenation

Not the translator's job (the typesetter hyphenates Spanish by the DPD's division rules, DES §5;
**[DPD-guion 2]**), but avoid inventing long compounds and never insert manual hyphens or soft
hyphens.

---

## 3. Termbase EN → ES

One line per term; the source column says where the Spanish form is attested. Terms marked
`[unverified]` are reasonable but were not confirmed in a source.

### 3.1 Serpientes

**Common names** (plate `common` is SAME and stays; this is how they read in Spanish prose)

| English edition | Spanish prose | other Costa Rican names | source |
|---|---|---|---|
| Terciopelo (*Bothrops asper*) | la terciopelo | barba amarilla, rabo amarillo, equis | **[ICP-sp]**, **[RES-s §1.2]** (ICP19 p. 55) |
| Bocaracá (*Bothriechis nigroadspersus*) | la bocaracá; *fase oropel* | oropel (golden phase), toboba de pestaña(s) | **[ICP-sp]**, **[ICP19 l. 1528–1547]** |
| eyelash-pitviper(s) (generic) | toboba(s) de pestañas | víbora de pestañas | **[ICP-sp]** |
| Coral (*Micrurus nigrocinctus*) | la coral; las corales | coral macho, coralillo | **[ICP-sp]**, **[RES-s §1.2]** |
| coral gargantilla | la coral gargantilla | — | **[ICP19 l. 1242]** |
| false corals | las falsas corales | — | **[ICP19 l. 1352]** |
| Cascabel (*Crotalus simus*) | la cascabel | crótalo | **[ICP-sp]** |
| Matabuey (*Lachesis stenophrys*) | la matabuey | cascabel muda, bocaracá de javillo | **[ICP-sp]** |
| plato negro (*L. melanocephala*) | el plato negro | cascabela muda del Pacífico | **[ICP19 l. 1849]** |
| bushmasters (genus) | las *Lachesis* (matabuey y plato negro) | — | **[ICP19 l. 1817, 1831]** |
| Serpiente marina (*Hydrophis platurus*) | la serpiente marina | serpiente de mar | **[ICP-sp]** |
| Béquer (*Boa imperator*) | la béquer; las boas | bécquer (ICP spelling), boa constrictora | **[ICP19 l. 658, 1009–1015]**, **[RES-s §1.2]** |
| tobobas (pit vipers) | las tobobas | — | **[DLE toboba]**, **[ICP19 l. 455–456]** |

- **Feminine**: the ICP website writes *la terciopelo, la bocaracá, la matabuey, la cascabel, la
  coral*, and the handbook *la bécquer* **[ICP-sp]**, **[ICP19 l. 658]** — the article agrees with
  *serpiente*. The handbook once has *el matabuey* **[ICP19 l. 1817]**; the edition does not follow
  it. Use the feminine everywhere, including adjectives (*la terciopelo es abundante*; scale note
  *Adulta, unos 1,5 m*).
- **Plurals**: avoid *las terciopelos*; use the generic singular (*La terciopelo joven agita la punta
  de la cola…*) or *las crías de terciopelo*.
- ***Béquer*** is the manifest spelling (CONTRACTS §12) and stays; *bécquer* is the ICP's. Both are
  in use **[RES-s §1.2]**.
- ***Cascabel* is two words**: *la cascabel* (the snake) and *el cascabel* (the rattle). In one
  sentence, use *el chischil* or *la serpiente* to disambiguate **[ICP-sp]**.
- English names cited inside Spanish prose go in italics: *le dan su nombre inglés,* eyelash viper.

**Herpetology**

| English | Español | source |
|---|---|---|
| pit viper(s) | víbora(s) de foseta; crotalinas | **[ICP19 l. 455–456, 1372]** |
| loreal pit | foseta loreal | **[ICP19 l. 455, 1372–1377]** |
| heat sensor | termorreceptor; órgano termosensor | **[ICP19 l. 1374–1377]** |
| "four nostrils" | «cuatro narices» (*tobobas de cuatro narices*) | **[ICP19 l. 1375–1380]** |
| nostril | narina | **[ICP19 l. 1376]** |
| keeled scales | escamas quilladas (also *con quilla*; *carenadas*) | **[ICP-sp]**, **[ICP19 l. 328, 339]**, **[DLE escama: *escama carenada*]** |
| ventral scales / ventral scutes / belly plates | escamas ventrales | **[ICP19 l. 328–329]** |
| supraocular / "eyelash" scales | escamas supraoculares; proyecciones sobre el ojo | **[ICP-sp]** |
| fangs | colmillos | **[ICP-sp]**, **[ICP19 l. 1133]** |
| hollow, hinged fangs | colmillos huecos, móviles | **[ICP19 l. 1460–1470]** |
| fixed front fangs | colmillos fijos anteriores | **[ICP19 l. 1133]** |
| solenoglyph | solenoglifa (dentición) | **[ICP19 l. 2844]** |
| proteroglyph | proteroglifa | **[ICP19 l. 1135]** |
| venom gland / compressor muscle | glándula de veneno / músculo compresor | **[ICP19 l. 1476]** |
| venom; venomous | veneno; venenosa | **[ICP-sp]** |
| hemotoxic / proteolytic | hemotóxico / proteolítico | **[ICP19 l. 1788]** |
| neurotoxic; neurotoxin | neurotóxico; neurotoxina | **[ICP19 l. 1174, 2812]** |
| crotoxin; metalloproteinases | crotoxina; metaloproteinasas | `[unverified]` |
| antivenom | **suero antiofídico** (also *antiveneno*) | **[ICP-pa]**, **[ICP19 l. 2022–2029]** |
| polyvalent antivenom (vipers) | suero polivalente (antivipérido) | **[ICP-pa]**, **[ICP19 l. 2048]** |
| coral antivenom | suero anticoral | **[ICP-pa]**, **[ICP19 l. 1296]** |
| envenoming | envenenamiento | **[ICP19]**, **[ICP-prev]** |
| snakebite | mordedura de serpiente; *accidente ofídico* (formal) | **[ICP-pa]**, **[ICP-prev]** |
| constriction; constrictor | constricción; constrictora | **[ICP19 l. 638, 658, 1013]** |
| caudal luring | señuelo caudal | `[unverified]` — no Spanish source found; descriptive calque |
| rattle | cascabel (m.), chischil | **[ICP-sp]** |
| rattle segments | segmentos (capas córneas entrelazadas) | **[ICP-sp]** |
| button (of the rattle) | botón | `[unverified]` |
| shed (n.) | muda | `[unverified]` |
| prehensile tail | cola prensil | **[ICP-sp]**, **[ICP19 l. 1515]** |
| forked tongue | lengua bífida | **[ICP19 l. 419]** |
| paddle-shaped tail | cola en forma de remo; *cola aplanada* | **[ICP19 l. 1146, 1150]** |
| oviparous / viviparous / ovoviviparous | ovípara / vivípara / ovovivípara | **[ICP-sp]**, **[ICP19 l. 793–796]** |
| clutch (of eggs) | puesta | **[DLE puesta, nidada]** |
| young; litter | crías; *hasta 90 crías* | **[ICP-sp]**, **[DLE cría]** |
| elapids / vipers / boas | elápidos / vipéridos, víboras / boas | **[ICP19 l. 1133, 948]** |
| sea snake (pelagic) | serpiente marina, pelágica | **[ICP-sp]** |
| lowlands; foothill forest | tierras bajas; bosque premontano | **[ICP-sp]** |
| Pacific / Caribbean slope | vertiente del Pacífico / del Caribe | **[ICP-sp]** ("vertiente Pacífica", "vertientes Caribe y Norte") |
| Central Valley | Valle Central (ICP: *Meseta Central*) | **[ICP-sp]** for *Meseta Central*; *Valle Central* `[unverified]` editorial choice |
| elevation (fact label) | altitud (ICP writes *elevación*) | **[DLE altitud]**, **[ICP-sp]** |

**First aid — word it as the ICP does** (the note *If a Snake Bites*, the imprint line, Calaveras VI)

| English | Español (ICP wording) | source |
|---|---|---|
| call 9-1-1 | llame al 9-1-1 | **[ICP-pa]** |
| go at once to the nearest clinic or hospital | acuda de inmediato al hospital o centro de salud más cercano | **[ICP-pa]** ("Traslade al paciente inmediatamente…") |
| keep the person calm, still | calme a la persona y póngala en reposo | **[ICP-pa]** |
| immobilise the bitten limb | inmovilice la extremidad mordida | **[ICP-pa]** |
| wash the bite with soap and water | lave la mordedura con agua y jabón | **[ICP-pa]** ("Limpie la zona mordida con jabón") |
| remove rings, watches and bracelets; note the time | quítele anillos, relojes y pulseras; anote la hora | English manifest (not on the ICP page) |
| do not apply a tourniquet | no aplique torniquetes | **[ICP-pa]** |
| do not cut the wound | no haga incisiones / no corte la herida | **[ICP-pa]** |
| do not suck it | no succione con la boca | **[ICP-pa]** |
| do not apply ice | no aplique hielo ni compresas frías | **[ICP-pa]** |
| do not give alcohol, medicines or home remedies | no dé bebidas alcohólicas, medicamentos ni remedios caseros | **[ICP-pa]** |
| doctors treat the symptoms | el personal médico trata según los signos y síntomas | **[ICP-pa]** |
| antivenom, given intravenously by medical staff | el suero antiofídico, que aplica por vía intravenosa el personal médico | **[ICP19 l. 2022–2029, 2376]** |
| wear closed boots; look before placing hands or feet; never handle a snake | use botas; no introduzca manos ni pies sin mirar; no manipule serpientes | **[ICP-prev]** |

Keep the English list complete (it has items the ICP page lacks) and add nothing to it.

### 3.2 Flores

**Common names** (plate `common` is SAME; prose lowercase)

| English edition | Spanish prose | source |
|---|---|---|
| Guaria morada (*Guarianthe skinneri*), national flower | la guaria morada, flor nacional de Costa Rica (desde 1939) | **[MUCR-gm]**, **[EPI]** |
| Platanilla (*Heliconia wagneriana*) | la platanilla | manifest (SAME) |
| Granadilla de monte (*Passiflora vitifolia*) | la granadilla de monte (also *flor de pasión, pasionaria*) | **[MNCR-pas]** |
| Labios de mujer (*Palicourea elata*) | labios de mujer (plural noun phrase; *la planta labios de mujer*) | manifest (SAME) |
| Cortez amarillo (*Handroanthus ochraceus*) | el cortez amarillo; *los cortezes* (English plural) → *los cortez amarillos* `[unverified]` | manifest (SAME) |
| Nenúfar (*Nymphaea ampla*) | el nenúfar | manifest (SAME) |

**Botany**

| English | Español | source |
|---|---|---|
| labellum, lip | labelo | **[MUCR-gen]**, **[FIG12]** |
| column | columna (*ginostemio*) | **[MUCR-gen]**, **[FIG12]** |
| pollinarium; pollinia | polinario; polinios | **[MUCR-gen]**, **[FIG12]** |
| pseudobulb | **pseudobulbo** (both spellings are valid — the DPD notes *seudo-* forms spreading **[DPD-p]** — but the UCR museum writes *pseudobulbo*) | **[MUCR-gm]** |
| epiphyte; epiphytic | epífita; epífito/a | **[DLE epífito]**, **[EPI]** |
| habit (growth form, fact label) | hábito | **[MUCR-gen]** ("hábito epífito") |
| bract | bráctea | **[DLE bráctea]** |
| inflorescence; spike; raceme | inflorescencia; espiga; racimo | **[DLE]** |
| rachis | raquis | **[DLE raquis 1.c]** |
| sepal; petal; perianth | sépalo; pétalo; perianto | **[DLE]**, **[MUCR-gen]** |
| stamen; anther | estambre; antera | **[DLE]** |
| pistil; ovary; stigma; style | pistilo; ovario; estigma; estilo | **[DLE]** (*estilo* `[unverified]`) |
| corolla; calyx | corola; cáliz | **[DLE]** |
| whorl (*whorl by whorl*) | verticilo (*verticilo a verticilo*) | **[DLE verticilo]** |
| tendril | zarcillo | **[DLE zarcillo 2]** |
| rhizome | rizoma | **[DLE rizoma]** |
| stipule; leaf stalk | estípula; pecíolo | **[DLE]** |
| deciduous | caducifolio | **[DLE caducifolio]** |
| nectar; nectary; extrafloral nectary | néctar; nectario; nectario extrafloral | **[DLE néctar, nectario]** |
| nectar guide | guía de néctar | `[unverified]` |
| corona (passionflower) | corona (de filamentos) | `[unverified]` |
| androgynophore | androginóforo | `[unverified]` — not in the DLE |
| anthesis | antesis | `[unverified]` — not in the DLE (not used in the manifests) |
| protogyny; self-incompatibility | protoginia; autoincompatibilidad | `[unverified]` — not in the DLE |
| food deception | engaño alimentario | `[unverified]` |
| bud | botón (floral) | `[unverified]` |
| time-lapse | a cámara rápida | `[unverified]` |
| flowering | floración | **[DLE floración]** |
| pollinator | polinizador | **[DLE polinizador]** |
| herbarium | herbario | **[DLE herbario 2.a]** |
| water lily; pad | nenúfar; hoja flotante | manifest; `[unverified]` |
| hummingbird | colibrí (Costa Rican colloquial *gorrión* — do not use in text) | **[DLE colibrí, gorrión]** |
| hermit hummingbirds | colibríes ermitaños | `[unverified]` |
| orchid bees, euglossine bees | abejas de las orquídeas, abejas euglosinas | `[unverified]` |
| carpenter bees | abejas carpinteras | `[unverified]` |
| longwing caterpillars | orugas de *Heliconius* | genus name (no common name needed) |
| dry season | estación seca | `[unverified]` (also *época seca* in Costa Rica) |

**CITES and Costa Rican law** (note *Look, Don't Pick*; Calaveras note)

| English | Español | source |
|---|---|---|
| CITES, the Convention on International Trade in Endangered Species of Wild Fauna and Flora | la CITES, Convención sobre el Comercio Internacional de Especies Amenazadas de Fauna y Flora Silvestres | **[DE40379]** |
| Appendix I / II | Apéndice I / II (de la CITES) | **[DE40379]** |
| party to CITES | Parte de la CITES | **[DE40379]** ("estado parte") |
| CITES Management Authority | Autoridad Administrativa CITES | **[DE40379]** |
| SINAC, the national conservation agency | el SINAC (Sistema Nacional de Áreas de Conservación) | **[DE40379]** |
| Wildlife Conservation Law (Ley 7317) | Ley de Conservación de la Vida Silvestre (Ley 7317) | **[L7317]**, **[DE40379]** |
| National Parks Law (Ley 6084) | Ley del Servicio de Parques Nacionales (Ley 6084) | **[L6084]** |
| national archaeological heritage | patrimonio nacional arqueológico | **[L6703]** |
| pre-Hispanic | prehispánico | **[DLE prehispánico]** |
| permit | permiso | **[DE40379]** |

### 3.3 Calaveras

**Decision**: the book teaches drawing to a general reader, so it uses the anatomical names current
in Latin American and Spanish teaching and in general dictionaries — *apófisis*, *esfenoides*,
*etmoides*, *lagrimal*, *cornete* — **not** the Spanish column of FIPAT's online *Terminologia
Anatomica Humana*, which is marked "work in progress" and itself mixes *apófisis mastoides* with
*proceso cigomático* and *hueso esfenoidal* **[TA2]** (the Spanish OpenStax glossary goes further
and writes *proceso mastoideo, proceso coronoide* **[LT-OS]**). Where the two agree (sutures, *fosa mandibular*,
*conducto auditivo externo*), the TA form is used. Be consistent: never *proceso* for a process.

**The 22 bones** (8 cranial + 14 facial)

| English | Español | source |
|---|---|---|
| frontal | (hueso) frontal | **[TA2]**, **[DLE]** |
| parietals (2) | parietales | **[DLE parietal]**, **[TA2]** |
| temporals (2) | temporales | **[DLE temporal]**, **[TA2]** |
| occipital | (hueso) occipital | **[DLE occipital]**, **[TA2]** |
| sphenoid | esfenoides (TA: *hueso esfenoidal*) | **[DLE esfenoides]** |
| ethmoid | etmoides (TA: *hueso etmoidal*) | **[DLE etmoides]** |
| maxillae (2) | maxilares | **[DLE maxilar]**, **[TA2]** |
| zygomatics (2) | cigomáticos (*malares*; plain: *pómulos*) | **[DLE cigomático, malar, pómulo]**, **[TA2]** |
| nasals (2) | (huesos) nasales | **[TA2]**, **[KEN-nasal]** |
| lacrimals (2) | lagrimales (TA: *lacrimal*) | **[DLE lagrimal]** |
| palatines (2) | palatinos | **[DLE palatino]**, **[TA2]** |
| inferior nasal conchae (2) | cornetes nasales inferiores (TA: *concha nasal inferior*) | **[DLE cornete]** |
| vomer | vómer | **[DLE vómer]**, **[TA2]** |
| mandible | mandíbula | **[DLE mandíbula]**, **[TA2]** |
| hyoid; ear ossicles | hioides; huesecillos del oído | **[DLE hioides]**; *huesecillos* `[unverified]` |

**Landmarks, joints and muscles**

| English | Español | source |
|---|---|---|
| skull; cranium; braincase | calavera / cráneo; cráneo; caja craneal | **[DLE calavera, cráneo]** |
| calvaria; vault | calvaria; bóveda craneal | **[LT-OS]** (*calvaria*); *bóveda craneal* `[unverified]` |
| orbit; sockets | órbita(s) | **[TA2]** (*cara orbitaria*, *borde supraorbitario*) |
| nasal aperture (piriform) | abertura nasal; *abertura piriforme* in the glossary definition | **[KEN-nasal]** |
| zygomatic arch; cheekbone | arco cigomático; pómulo | **[DLE cigomático]**, **[CUN]** |
| mastoid process | apófisis mastoides | **[TA2]** |
| coronoid process | apófisis coronoides | **[CUN]** |
| condyle (of the mandible) | cóndilo (de la mandíbula) | **[KEN-atm]** |
| temporomandibular joint (TMJ) | articulación temporomandibular (ATM) | **[KEN-atm]** |
| socket of the jaw joint; ridge ahead of it | fosa mandibular; tubérculo articular | **[KEN-atm]**, **[TA2]** |
| ear canal | conducto auditivo (externo) | **[TA2]** |
| ramus; angle of the jaw | rama de la mandíbula; ángulo de la mandíbula | **[TA2]** |
| brow ridge | arco superciliar | **[TA2]** |
| coronal, sagittal, lambdoid, squamous suture | sutura coronal, sagital, lambdoidea, escamosa | **[TA2 sutures]** |
| metopic suture | sutura metópica (frontal) | **[TA2 sutures]** |
| sagittal crest | cresta sagital | **[DELM11]** |
| temporalis | (músculo) temporal | **[CUN]** |
| masseter | masetero | `[unverified]` |
| medial pterygoid | pterigoideo medial | **[KEN-pter]** |
| incisors; canines; premolars; molars; enamel | incisivos; caninos; premolares; molares; esmalte | **[DELM11]** (caninos), others `[unverified]` |
| carnassials (upper P4, lower m1) | carniceras (P4 superior y m1 inferior) | **[IGME08]** |
| Frankfort plane / line | plano / línea de Fráncfort | **[DPD-Fr]** (the DPD advises against *Frankfurt*) |
| *norma frontalis / lateralis* | norma frontal / lateral | `[unverified]` |
| jaguar (*Panthera onca*) | jaguar (Costa Rican colloquial *tigre* — do not use) | **[DLE jaguar, tigre]** |
| big cats | grandes felinos | — |

**Drawing**

| English | Español | source |
|---|---|---|
| construction lines | líneas de construcción | `[unverified]` |
| centre line (axis of symmetry) | línea central (*eje de simetría*) | **[DLE eje]** (*eje de simetría*) |
| guides, level guides | guías, guías horizontales | `[unverified]` |
| planes | planos | — |
| foreshortening | escorzo | **[DLE escorzar]** (seen through a search snippet only) |
| values, tone | valores (tonales), tono | `[unverified]` |
| hatching; cross-hatching | rayado; rayado cruzado (Southern Cone: *achurado*) | `[unverified]` |
| shading | sombreado | **[DLE sombrear]** |
| contour | contorno | **[DLE contorno]** |
| sketch | esbozo, apunte | **[DLE esbozo, apunte]** |
| silhouette | silueta | **[DLE silueta]** |
| engraving; engraved line | grabado; línea grabada | **[DLE lámina 1.d, estampa]** |
| line art; colour plate | dibujo lineal; lámina en color | **[DES §0]** (file name *-lineal-es*) |
| three-quarter view; profile | vista de tres cuartos; perfil | English `commonAlt` |
| wedge; box; sphere | cuña; caja; esfera | — |
| composition; focal point; tangents | composición; punto focal; tangencias | — |

### 3.4 Places and institutions

| English | Español | source |
|---|---|---|
| Instituto Clodomiro Picado (ICP), Universidad de Costa Rica | igual | **[ICP-pa]** |
| IUCN; IUCN Red List | UICN; Lista Roja de la UICN | **[UICN31]** |
| WHO | OMS | — |
| Jardín Botánico Lankester (UCR); Museo Nacional de Costa Rica | igual | **[EPI]**, **[MNCR-pas]** |
| Talamanca range | cordillera de Talamanca | — |
| Osa Peninsula; Golfo Dulce; Bahía Culebra | península de Osa; Golfo Dulce; Bahía Culebra | **[ICP19 l. 1151–1153]** (Golfo Dulce, Bahía Culebra); *península de Osa* `[unverified]` |
| Caribbean; Pacific; the Americas | Caribe; Pacífico; América | — |
| (consulted November 2026) | (consultado en noviembre de 2026) | **[DES §2.2]** |

### 3.5 IUCN categories (status chip, `status.label`, typeset fallback labels)

Use exactly these strings, with the UICN's capitals **[UICN31 §IV]**, **[UICN-reg]**:

| code | Español | code | Español |
|---|---|---|---|
| EX | Extinto | NT | Casi Amenazado |
| EW | Extinto en Estado Silvestre | LC | Preocupación Menor |
| CR | En Peligro Crítico | DD | Datos Insuficientes |
| EN | En Peligro | NE | No Evaluado |
| VU | Vulnerable | | |

- `status.source`: *IUCN Red List, 2021* → *Lista Roja de la UICN, 2021*; *IUCN, as* B. schlegelii →
  *UICN, como* B. schlegelii.
- **In running text, name the category rather than inflect it**: *La UICN la clasifica en la
  categoría Casi Amenazado* — not *casi amenazada*, which would no longer be the category's name and
  would read as the lowercase national status.
- **National status stays lowercase**: Calaveras' *Near Threatened; endangered in Costa Rica* →
  *Casi Amenazado; en peligro en Costa Rica*.
- The Museo Nacional writes *Preocupación menor (LC)* **[MNCR-pas]**; the edition follows the
  UICN's own spelling because the chip cites the UICN.

### 3.6 Look-closer names (R1.1: required, ≤ 3 words)

Figure pills (`src/i18n/es/{snakes,flowers,skulls}.js`) should use the same words.

| label id | name | label id | name |
|---|---|---|---|
| loreal-pit | Foseta loreal | labellum | Labelo |
| fangs | Colmillos | column | Columna |
| venom-gland | Glándula de veneno | pseudobulb | Pseudobulbo |
| keeled-scales | Escamas quilladas | bract | Bráctea |
| eyelash-scales | Escamas supraoculares | flower | Flor |
| prehensile-tail | Cola prensil | rachis | Raquis |
| red-ring | Anillo rojo | hummingbird | Colibrí |
| yellow-ring | Anillo claro | corona | Corona |
| black-ring | Anillo negro | androgynophore | Androginóforo |
| fixed-fangs | Colmillos fijos | anther | Antera |
| rattle | Cascabel | tendril | Zarcillo |
| rattle-button | Botón del cascabel | leaf | Hoja |
| tail-spine | Espina caudal | corolla | Corola |
| eggs | Puesta | nectar-guides | Guías de néctar |
| paddle-tail | Cola aplanada | calyx | Cáliz |
| yellow-venter | Vientre amarillo | branch | Rama |
| nostril | Narina | sepal | Sépalo |
| tongue | Lengua | stamens | Estambres |
| pelvic-spur | Espolón pélvico `[unverified]` | stigma | Estigma |
| recurved-teeth | Dientes recurvados | pad | Hoja flotante |
| eye-stripe | Banda ocular | orbit | Órbita |
| ribs | Costillas | nasal-aperture | Abertura nasal |
| condyle | Cóndilo | coronoid | Apófisis coronoides |
| zygomatic-arch | Arco cigomático | occipital | Occipital |
| coronal-suture | Sutura coronal | sphenoid | Esfenoides |
| sagittal-crest | Cresta sagital | carnassial | Carnicera |

*Anillo claro* (not *amarillo*): the text says the pale rings may be yellow, cream or white, and the
ICP lists *crema* as the usual colour **[ICP-sp]**. *Cola aplanada*: the ICP's gloss of *platura*
**[ICP19 l. 1146]**.

### 3.7 Reader verbs and the how-to page

Gesture column: usted imperative; effect column: descriptive. Keys stay **[DES §0]**.

| English | Español | source |
|---|---|---|
| drag (a page corner, the figure) | arrastre (una esquina de la página, la figura) | **[DLE arrastrar]**, **[APPLE]** |
| turn the page / the leaf | pasar la página / la hoja | `[unverified]` (common usage) |
| click; double-click | haga clic; haga doble clic | **[DLE clic]** |
| tap; swipe | toque; deslice | **[APPLE]**, **[DLE tocar, deslizar]** |
| pinch; scroll (to zoom) | pellizque; gire la rueda — *acerque / aleje* | **[APPLE]** ("hacer zoom"), **[DLE pellizcar]** |
| arrow keys; space bar | teclas de flecha; barra espaciadora | `[unverified]` |
| inspect (up close) | examinar (de cerca) | — |
| rotate (on its turntable) | girar (sobre su plataforma giratoria) | — |
| layers; peel back the skin | capas; retire la piel | **[DLE capa]**, **[DES §3.4]** |
| explode; exploded view; reassemble | despiece; vista despiezada; recomponer | **[DLE despiece 1.b]**, **[DES §3.4]** |
| dissect | diseccionar / separar en partes | **[DLE diseccionar]** |
| labels; name the parts | etiquetas; nombre las partes | **[DLE etiqueta]**, **[DES §3.4]** |
| export; save as SVG | exportar; guarde como SVG | **[DLE exportar]**, **[DES §3.4]** |
| play / pause | reproducir / pausar | **[DES §3.4]** |
| toolbar | barra de herramientas | `[unverified]` |
| scrub to any moment | desplácese a cualquier momento | **[DES §3.4]** (*Momento*) |

---

## 4. Book furniture

| element | English | Español |
|---|---|---|
| titles | Serpientes · Flores · Calaveras | unchanged |
| subtitle I | A Living Atlas of Costa Rican Snakes | **Atlas vivo de las serpientes de Costa Rica** (*atlas*: "colección de láminas descriptivas" **[DLE atlas 1.b]**) |
| subtitle II | A Living Herbarium of Costa Rica | **Herbario vivo de Costa Rica** **[DLE herbario 2.a]** |
| subtitle III | Drawing Skulls: A Constructive Method | **Dibujar el cráneo: un método constructivo** (avoids *Calaveras — Dibujar calaveras*) |
| kicker | Lámina · Volume I | **Lámina · Volumen I** (II, III) |
| imprint name | Lámina Natural History Press | **unchanged** — a proper name, like a foreign publisher's; it is foil-stamped on both covers and printed in the SVG export credit (DES §6.2). In Spanish prose: *Lámina Natural History Press es un sello editorial ficticio* |
| edition | First edition, 2026 | **Primera edición, 2026** (the year stays: the title page prints it in Roman) |
| cover / back cover / title page / endpapers | — | cubierta / contracubierta / portada / guardas **[DLE]**, **[DES §3.4]** |
| imprint page | Imprint | Créditos **[DES §3.4]** (the publisher's *imprint* is *sello editorial*) |
| contents | Contents | Índice **[DLE índice]** |
| plates / lessons / back matter | — | Láminas / Lecciones / Páginas finales |
| introduction; before you begin | — | Introducción; Antes de empezar |
| how to use | How to use this book | Cómo usar este libro |
| reading a plate | Reading a plate | Cómo leer una lámina |
| note | A note / Note | Una nota / Nota |
| glossary | Glossary · Words used in this book | Glosario · Palabras de este libro **[DLE glosario]** |
| sources | Sources · For further reading | Fuentes · Para leer más |
| colophon | Colophon · Sources & colophon | Colofón · Fuentes y colofón **[DLE colofón]** |
| running heads | Lesson {numeral} · {title}; Plate {n} | Lección {numeral} · {title}; Lámina {n} (*titulillo* **[DLE]**) |
| boxes | Did you know? · Look closer · Field notes · Pro tip · Common mistakes · Proportions | Dato curioso · Más de cerca · Notas de campo · Consejo · Errores comunes · Proporciones |
| plate page | Drag to turn the figure · double-click to inspect | Arrastre para girar la figura · doble clic para examinarla |
| making pages | How this book was made · The prompt · This book's brief | Cómo se hizo este libro · La instrucción original · El encargo de este libro; *Traducción del original en inglés* **[DES §3.4]** |
| levels (badges) | Beginner · Intermediate · Advanced | Principiante · Intermedio · Avanzado |
| warning badges | Venomous — dangerous; Constrictor · no fangs | Venenosa — peligrosa; Constrictora · sin colmillos |
| captions | Fig. 1 — …; Fig. I — … | identical lead-in, Spanish text |
| scale notes | Adult, about 1.5 m | Adulta, unos 1,5 m (snakes: feminine); *Cráneo adulto, de unos 13–14 cm de ancho* |
| sources (connectives) | consulted November 2026; Data: | consultado en noviembre de 2026; Datos: |

**Titles of the intros and notes** (sentence case, faithful, short): *¿Por qué tantas serpientes?* ·
*Si una serpiente muerde* · *Las flores negocian* · *Mire, no corte* · *Por qué dibujar el cráneo* ·
*Práctica y respeto*.

**Fact labels** (shortest faithful form): Longitud · Altitud · Hábitat · Actividad · Crías · Veneno
· Hábitos (snakes) · Hábito (plants) · Distribución · Dieta · Huevos · Antes (*Formerly*) ·
Mordeduras · Tamaño · Floración · Polinizadores · Brácteas · Flor · Altura · Visitantes · Apertura ·
En Costa Rica · Ancho del cráneo · Longitud del cráneo · Dientes · Masa · Estado.

**Calaveras step titles** (infinitive or noun phrase; one line):

| | step 1 | step 2 | step 3 |
|---|---|---|---|
| I | Esfera y línea central | Guías y mandíbula que se estrecha | Órbitas, abertura, contorno |
| II | Esfera y punto de giro | Abrir la mandíbula | Afinar el cráneo abierto |
| III | Línea horizontal y círculo | Cuña facial en un cuadrado | Órbita, abertura, contorno |
| IV | Contorno y suturas | Mapa de los huesos | Separar los huesos |
| V | Caja craneal y hocico | Cresta, arcos, mandíbula | Órbitas, dientes, contorno |
| VI | Esfera, eje y órbitas | Enhebrar la serpiente | Órbitas, cabeza, contorno |

**Calaveras plate fields**: `common` = the English `commonAlt` (*Vista frontal*, *Tres cuartos,
mandíbula abierta*, *Perfil*, *Los huesos del cráneo*, *Cráneo de jaguar*, *Calavera y serpiente*);
`commonAlt` = the English title in sentence case (*Frontal view*…) **[DES §4.4]**, **[DPD-may
5.2.24]** (which allows sentence case for foreign titles cited in Spanish). `scientific`: *Cráneo y
mandíbula* · *Articulación temporomandibular* · *Proporciones craneales* · *Huesos craneales y
faciales*; the two binomials stay. `family`: *Cráneo humano · norma frontal* · *Cráneo humano ·
vista oblicua* · *Cráneo humano · norma lateral* · *Cráneo humano · 8 craneales, 14 faciales* ·
*Felidae · Pantherinae* (unchanged) · *Composición · Viperidae, Crotalinae*. No ampersands in
Spanish: *&* → *y*.

**Glossary**: keep the entries index-aligned with English; the typesetter sorts them with
`Intl.Collator('es')` **[DES §4.2]**. Headwords in sentence case; Latin taxa unchanged (*Crotalinae*,
*Elapidae*); *Tobobas* stays.

---

## 5. Length: fitting Spanish into pages set for English

Spanish runs 15–25 % longer and several pages are already tight (R1.2: Calaveras lesson versos;
R1.3: the Serpientes sources page). Nothing may be dropped to fit: every number, name, qualifier,
hedge and source stays. Condense the wording instead:

1. **Drop English glosses of Spanish words, keep the fact.** *Terciopelo is Spanish for velvet* →
   *El nombre* terciopelo *evoca esa tela*; *another local name,* rabo amarillo, *"yellow tail"* →
   *de ahí su otro nombre, rabo amarillo*. The English edition spends whole clauses explaining
   Spanish; the Spanish edition gets that room back.
2. **Use the edition's compact notation**: symbols with figures (*1,5 m*, *28 %*), en-dash ranges,
   *unos* for *aproximadamente*, *hasta* for *un máximo de*, *casi*, *sobre todo*.
3. **Verbs over nominalisations**: *la flor abre de día*, not *la apertura de la flor se produce de
   día*; *se ve*, not *es posible observar*.
4. **Active or *se* instead of *ser* + participle**: *la describieron en 2017*, not *fue descrita en
   el año 2017*.
5. **Cut function words English does not have**: *en el año 1939* → *en 1939*; *el cual* → *que*;
   drop *además*, *por ejemplo*, *sin embargo* (→ *pero*) where the logic is clear.
6. **Generic singular for species** (*La terciopelo joven agita la cola*) instead of plural
   periphrases.
7. **Apposition and colon instead of relative clauses**: *la foseta loreal, un termorreceptor entre
   el ojo y la narina*; *La cola: un remo aplanado*.
8. **Adjectives instead of *de* chains**: *caja craneal*, *colmillos huecos*, *estación seca*,
   *escamas ventrales*.
9. **One raya pair at most per sentence**; a short inciso can become an apposition between commas.
10. **Labels, badges and facts without articles**: *Bosque húmedo, fincas, jardines*; *Nocturna,
    caza al acecho*.
11. **Prefer the shorter of two correct terms** when both are in the termbase: *Altitud* (7) over
    *Elevación* (9); *Antes* over *Nombre anterior*.
12. **Measure, don't guess**: target ≤ +10 % characters per string on Calaveras lesson versos and
    the Serpientes colophon, ≤ +15 % elsewhere; check with `node scripts/validate-books.mjs --lang es
    --fit` once the plumbing lands. If a page still fails, report it to the typeset owner (R1.2 asks
    for room before translation) instead of cutting content.

---

## 6. Reviewer checklist

Each item can be grepped in `src/books/es/*.js` (escape sequences as written in the source):

- [ ] No `sólo`, `éste`, `ésta`, `ése`, `ésa`, `aquél` (with tilde).
- [ ] No `“` at the first level and no `"` in text; every `«` closes; `.` and `,` after `»`.
- [ ] No ` — ` English spacing around an inciso (captions and title joins excepted); closing raya
      before every full stop that ends an inciso.
- [ ] No `\d\.\d` outside URLs, versions and citations; no `\d,\d{3}\b` thousands; no space-grouped
      four-digit numbers; ` ` before every unit and `%`; `°` attached.
- [ ] No vos or tú forms (`-á` imperatives such as *arrastrá*, *tu*, *tus*, *puedes*).
- [ ] IUCN labels are one of the nine strings of §3.5.
- [ ] Every caption starts `Fig. ` + numeral + ` — `; binomials and authorities identical to English.
- [ ] `pullQuote` has no quotation marks; intro paragraphs do not open with `¿ ¡ «`; `blurb` ≤ 139
      characters.
- [ ] Every `lookCloser[]` has a `name` of ≤ 3 words (§3.6).
- [ ] Spanish words not italicised (except words mentioned as words); English names inside Spanish
      prose italicised.
- [ ] Snake names feminine; *suero antiofídico*; first-aid verbs as in §3.1.
- [ ] Facts keep every number of the English value.

---

## 7. What this guide does not decide

- Whether the Spanish making pages print the verbatim English prompt or a translation (R9.1, a
  user decision).
- Code-side strings outside book furniture (the UI, export and figure dictionaries) beyond the
  shared terms above; their owners follow §2 and §3.

---

## 8. Sources

† = opened on 2026-11-01 in an earlier run of this task (rae.es and dle.rae.es refuse scripted
requests, so those pages were read in a browser); the captured page text was re-read for this
guide. ‡ = PDF downloaded and its text extracted (`pdftotext -layout`). Unmarked = opened while
writing this guide (2026-11-01).

**Language**

- **[OLE-mil]**† RAE/ASALE, *Ortografía de la lengua española* (2010), §2.2.1.1 «Los números enteros
  y el separador de millares». https://www.rae.es/ortografía/los-números-enteros-y-el-separador-de-millares
- **[OLE-dec]**† *Ortografía* (2010), §2.2.1.2 «Los números decimales y el separador decimal».
  https://www.rae.es/ortografía/los-números-decimales-y-el-separador-decimal
- **[OLE-sim]**† *Ortografía* (2010), cap. V §4.4 «Ortografía y otras normas de escritura» (symbols:
  f spacing, h no line break, i operators). https://www.rae.es/ortografía/ortografía-y-otras-normas-de-escritura-1
- **[OLE-pct]**† *Ortografía* (2010), §5.4 «La expresión de los porcentajes».
  https://www.rae.es/ortografía/la-expresión-de-los-porcentajes
- **[OLE-gui]**† *Ortografía* (2010), §4.1.1.3.1 «Nexo en expresiones numéricas».
  https://www.rae.es/ortografía/otras-funciones
- **[DPD-com]**† *Diccionario panhispánico de dudas*, s. v. *comillas*. https://www.rae.es/dpd/comillas
- **[DPD-raya]**† DPD, s. v. *raya*. https://www.rae.es/dpd/raya
- **[DPD-guion]**† DPD, s. v. *guion*. https://www.rae.es/dpd/guion
- **[DPD-solo]**† DPD, s. v. *solo*. https://www.rae.es/dpd/solo
- **[DPD-may]**† DPD, s. v. *mayúsculas* (5.2.9, 5.2.24, 5.2.25, 5.2.28, 5.4.6, 5.4.12).
  https://www.rae.es/dpd/mayúsculas
- **[DPD-voseo]**† DPD, s. v. *voseo* (Costa Rica). https://www.rae.es/dpd/voseo
- **[DPD-o]**† DPD, s. v. *o* (conjunción). https://www.rae.es/dpd/o
- **[DPD-p]**† DPD, s. v. *p* (§4, *(p)seudo-*). https://www.rae.es/dpd/p
- **[DPD-Fr]**† DPD, s. v. *Fráncfort*. https://www.rae.es/dpd/Fráncfort
- **[DPD-abr]**† DPD, apéndice «Abreviaturas» (*aprox.*, *máx.*, *et al.*, *s. n. m.*).
  https://www.rae.es/dpd/ayuda/abreviaturas
- **[DLE]**† RAE/ASALE, *Diccionario de la lengua española*, entries named in the tables
  (https://dle.rae.es/<entry>): altitud, toboba, escama, puesta, nidada, cría, colibrí, gorrión,
  jaguar, tigre, calavera, cráneo, mandíbula, maxilar, cigomático, malar, pómulo, esfenoides,
  etmoides, vómer, occipital, parietal, temporal, lagrimal, palatino, cornete, hioides, bráctea,
  inflorescencia, espiga, racimo, raquis, sépalo, pétalo, perianto, estambre, antera, pistilo,
  ovario, estigma, corola, cáliz, verticilo, zarcillo, rizoma, estípula, pecíolo, caducifolio,
  néctar, nectario, epífito, floración, polinizador, herbario, atlas, lámina, estampa, portada,
  cubierta, contracubierta, guarda, titulillo, índice, glosario, colofón, prehispánico, arrastrar,
  clic, tocar, deslizar, pellizcar, capa, etiqueta, exportar, despiece, diseccionar, eje, contorno,
  esbozo, apunte, sombrear, silueta. *escorzar*: search-engine snippet of
  https://dle.rae.es/escorzar only.
- **[RTCR]**‡ Reglamento Técnico RTCR 443:2010 *Metrología. Unidades de medidas. Sistema Internacional
  (SI)*, La Gaceta Nº 56, 21 March 2011, Anexo A.5–A.8.
  https://inii.ucr.ac.cr/wp-content/uploads/2020/07/Reglamento_del_SI-GACETA.pdf
- **[CLDR]** Unicode CLDR `es-CR` through ICU (`Intl`), outputs verified in the design (§4.1, R8:
  `2,4`, `12 345,67`, `85 %` with U+00A0, list *e* before *IBM*).

**Snakes**

- **[ICP-pa]**† Instituto Clodomiro Picado, «Primeros auxilios».
  https://www.icp.ucr.ac.cr/es/informacion-y-materiales/primeros-auxilios
- **[ICP-prev]**† ICP, «Prevención de accidente ofídico».
  https://www.icp.ucr.ac.cr/es/informacion-y-materiales/prevencion-de-accidente-ofidico
- **[ICP-sp]**† ICP, «Serpientes venenosas de Costa Rica», species pages *bothrops-asper,
  bothriechis-schlegelii, micrurus-nigrocinctus, crotalus-simus, lachesis-stenophrys,
  hydrophis-platura*. https://www.icp.ucr.ac.cr/es/informacion-y-materiales/serpientes-venenosas-de-costa-rica/
- **[ICP19]**‡ Sasa, M., Bonilla, F. & Chaves, F. (2019). *Serpientes venenosas de Costa Rica: biología
  básica*. San José: ICP, UCR (line numbers refer to `pdftotext -layout` of this PDF).
  https://icp.ucr.ac.cr/sites/default/files/content/serpientes-venenosas-de-cr-biologia-basica-icp.pdf
- **[RES-s]** `docs/books/serpientes-research.md` §1.2 (names table with ICP 2019 page numbers).

**Flowers and law**

- **[MUCR-gen]** Museo de la Universidad de Costa Rica, «Generalidades de las orquídeas».
  https://museo.ucr.ac.cr/orquideas1.html
- **[MUCR-gm]** Museo de la UCR, «La verdadera guaria morada». https://museo.ucr.ac.cr/orquideas4.html
- **[EPI]**† Epidendra, Jardín Botánico Lankester (UCR), *Guarianthe skinneri*.
  https://www.epidendra.com/taxones/Guarianthe/Guarianthe%20skinneri/index.html
- **[FIG12]**‡ Figueroa, C., Salazar, G. A., Terrazas, T. & Dávila, P. (2012). Estructura y desarrollo
  del ginostemio en *Dichromanthus michuacanus*. *Rev. Mex. Biodiv.* 83: 73–82.
  https://www.redalyc.org/pdf/425/42523212009.pdf
- **[MNCR-pas]**‡ Museo Nacional de Costa Rica, *Catálogo de especies del género* Passiflora *en Costa
  Rica*. https://www.museocostarica.go.cr/wp-content/uploads/passiflora/diversidad/catalogo-passifloras-cr.pdf
- **[DE40379]**‡ Decreto Ejecutivo Nº 40379-MINAE-MAG (CITES authorities, Costa Rica).
  https://faolex.fao.org/docs/pdf/cos176261.pdf
- **[L7317]**‡ Ley Nº 7317, *Ley de Conservación de la Vida Silvestre*.
  https://www.acto.go.cr/wp-content/uploads/2020/04/ley_conser_vida_silv.pdf
- **[L6084]**‡ Ley Nº 6084, *Ley del Servicio de Parques Nacionales* (24 August 1977).
  https://faolex.fao.org/docs/pdf/cos82453.pdf
- **[L6703]**‡ Ley Nº 6703, *Ley sobre Patrimonio Nacional Arqueológico* (La Gaceta Nº 12, 19 January
  1982). https://www.museocostarica.go.cr/wp-content/uploads/comision-arqueologica-nacional/ley-6703.pdf
- **[UICN31]**‡ UICN (2012). *Categorías y Criterios de la Lista Roja de la UICN: Versión 3.1. Segunda
  edición*, §IV. https://portals.iucn.org/library/sites/library/files/documents/RL-2001-001-2nd-Es.pdf
- **[UICN-reg]**‡ UICN (2012). *Directrices para el uso de los Criterios de la Lista Roja de la UICN a
  nivel regional y nacional: Versión 4.0* (running text, pp. 13–17).
  https://docs.gbif.org/course-data-use/exercise-data/RL-2012-002-Es.pdf

**Skulls and drawing**

- **[TA2]** FIPAT, *Terminologia Anatomica Humana* (Latin/Spanish, "work in progress"): unit
  TAH:U547 (*apófisis mastoides*)†,
  https://ifaa.unifr.ch/Public/TNAEntryPage/auto/unit/LAES/TAH547%20Unit%20EN.htm; cranial bones
  list, https://ifaa.unifr.ch/Public/TNAEntryPage/auto/part/LAES/TAH27296%20P2F%20EN.htm; **[TA2
  sutures]**† https://ifaa.unifr.ch/Public/TNAEntryPage/auto/part/ES/TAH26538%20P3%20ES.htm
- **[LT-OS]**† LibreTexts Español, *Anatomía y Fisiología 1e (OpenStax)*, «Términos clave capítulo 07:
  Esqueleto axial» (*calvaria*, *proceso mastoideo*, *proceso coronoide*).
  https://espanol.libretexts.org/Salud/Anatomia_y_Fisiologia/Libro%3A_Anatom%C3%ADa_y_Fisiolog%C3%ADa_1e_(OpenStax)/zz%3A_Volver_Materia/Key_Terms_Chapter_07%3A_Esqueleto_Axial
- **[CUN]**† Clínica Universidad de Navarra, *Diccionario médico*, «músculo temporal» (*apófisis
  coronoides*, *arco cigomático*). https://www.cun.es/diccionario-medico/terminos/musculo-temporal
- **[KEN-atm]**† Kenhub (es), «Articulación temporomandibular».
  https://www.kenhub.com/es/library/anatomia-es/articulacion-temporomandibular
- **[KEN-nasal]** Kenhub (es), «Hueso nasal» (*abertura piriforme*).
  https://www.kenhub.com/es/library/anatomia-es/hueso-nasal
- **[KEN-pter]**† Kenhub (es), «Pterigoideo medial».
  https://www.kenhub.com/es/library/anatomia-es/musculo-pterigoideo-medial
- **[IGME08]**‡ Arribas, A. (ed.) (2008). *Cuadernos del Museo Geominero* 10, IGME, pp. 85–146
  («carniceras (P4 y M1)»). https://aguas.igme.es/epvrf/docs/FON-11.pdf
- **[DELM11]**‡ Del Moral Sachetti, J. F. et al. (2011). Fuerza de mordedura y estrés mandibular en el
  jaguar. *Acta Zool. Mex.* (n. s.) 27(3): 757–776 (*cresta sagital*, *arcos cigomáticos*,
  *canino*). https://azm.ojs.inecol.mx/index.php/azm/article/download/779/946
- **[APPLE]**† Apple, «Aprender los gestos básicos…» (Spanish, Latin America: *tocar, deslizar,
  desplazar, arrastrar, hacer zoom*). https://support.apple.com/es-lamr/guide/ipod-touch/iph75e97af9b/ios

**Project**

- **[DES]** `.scratch/bilingual/design-i18n.md` (§2, §3.4, §4, §5.1, §6.2 and the adversarial review
  R1–R9).
