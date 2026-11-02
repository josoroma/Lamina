# Serpientes — research dossier

> Lámina · Volume I — *Serpientes: A Living Atlas of Costa Rican Snakes*.
> Audit trail for every fact printed by [`src/books/serpientes.js`](../../src/books/serpientes.js):
> taxonomy decisions, sources (with URLs), the claims they support, and open questions.
> Researched 1 November 2026, then revised the same day after two independent fact-checks
> (25 issues; resolutions in [§9 Fact-check log](#9-fact-check-log)), after the visual review
> (3 findings; [§10 Visual review log](#10-visual-review-log)) and for the bilingual edition
> ([§11 Bilingual edition log](#11-bilingual-edition-log)). Plates, params and text
> budgets follow [CONTRACTS §6, §12–§14](../architecture/CONTRACTS.md).

**Method.** Each species was checked against the Instituto Clodomiro Picado (ICP, Universidad de
Costa Rica) — both its 2019 handbook *Serpientes venenosas de Costa Rica: biología básica* (read in
full) and its web species accounts — then against The Reptile Database for current names and
authorities, the IUCN Red List (read through the GBIF mirror of the IUCN checklist, because
iucnredlist.org refuses scripted access) for status, and the primary literature for the details a
plate leans on. Where two reputable sources disagree, the text uses the more conservative figure
and the disagreement is logged below. Sources marked *(secondary)* were verified only through a
reliable secondary citation, never read directly.

---

## 1. Editorial decisions

### 1.1 Names printed on the plates

| Plate | Printed name | Authority | Older / alternative names | Figure param (unchanged, §12) |
|---|---|---|---|---|
| I | *Bothrops asper* | (Garman, 1883) | *Trigonocephalus asper* Garman; sometimes dated 1884 [“1883”] | `bothrops-asper` |
| II | ***Bothriechis nigroadspersus*** | (Steindachner, 1870) | Costa Rican populations were *Bothriechis schlegelii* (Berthold, 1846) until 2024 | `bothriechis-schlegelii` (`morph: 'oropel'`) |
| III | *Micrurus nigrocinctus* | (Girard, 1854) | *Elaps nigrocinctus* Girard; Caribbean populations now *M. mosquitensis* | `micrurus-nigrocinctus` |
| IV | *Crotalus simus* | Latreille, 1801 | *Crotalus durissus durissus* (pre-2004); described in Sonnini & Latreille (dated 1801 or 1802) | `crotalus-simus` |
| V | *Lachesis stenophrys* | Cope, 1875 | *Lachesis muta stenophrys*; IUCN and GBIF date it 1876 | `lachesis-stenophrys` |
| VI | *Hydrophis platurus* | (Linnaeus, 1766) | *Anguis platura* Linnaeus; *Pelamis platura* / *Pelamis platurus*; ICP spells it *H. platura* | `hydrophis-platurus` |
| VII | *Boa imperator* | Daudin, 1803 | *Boa constrictor imperator* | `boa-imperator` |

**Why plate II prints *Bothriechis nigroadspersus*.** Arteaga et al. (2024) split the eyelash
pitviper complex into nine species, restricted *B. schlegelii* (sensu stricto) to a small area of
highland Colombia, and revalidated *B. nigroadspersus* (Steindachner, 1870) for the Mesoamerican
populations from the Isthmus of Tehuantepec to north-western Colombia — Costa Rica included; the
holotype nests among Costa Rican specimens in their phylogeny. The Reptile Database follows the
split (its *B. schlegelii* page now lists Colombia only; its *B. nigroadspersus* page lists Costa
Rica, with Spanish names *bocaracá*, *toboba de pestañas*, *oropel* for the yellow morph). CONTRACTS
§14 asks for current taxonomy, so the plate prints the new name and states the old one in the
body text, in Field Notes (“Formerly”) and on the IUCN chip. The figure id
`bothriechis-schlegelii` is an internal key shared with the snakes module and the *Calaveras*
skull-and-snake plate, so it stays unchanged.
- ICP still uses *B. schlegelii* on its website and in its 2019 handbook (both predate or ignore
  the revision). Not an error on our side — a lag on theirs.
- **Costa Rica has a second eyelash pitviper.** *Bothriechis supraciliaris* (Taylor, 1954) —
  described as *Bothrops schlegelii supraciliaris*, revalidated by Solórzano, Gómez & Crother (1998) and kept by
  Arteaga et al. (2024: 27) — lives along the Pacific slopes of the Cordillera de Talamanca in
  south-western Costa Rica and western Panama, at 734–1,506 m (type locality: mountains near San
  Isidro del General). ICP 2019 (p. 44) treats it with *B. schlegelii* as the *tobobas de pestaña*.
  Only the populations formerly called *B. schlegelii* became *B. nigroadspersus*; the plate says so,
  and its lede no longer calls the bocaracá “Costa Rica’s eyelash viper”.
- **Follow-up for other modules:** `src/subjects/snakes/species.js` sets
  `scientific: 'Bothriechis schlegelii'` (figure title / SVG export). Suggest updating to
  *Bothriechis nigroadspersus* for consistency (owned by the snakes agent).

### 1.2 Spanish common names (as used in Costa Rica)

| Plate | Name used | Other Costa Rican names | Source |
|---|---|---|---|
| I | Terciopelo | barba amarilla, rabo amarillo, equis | ICP 2019 (p. 55); ICP web |
| II | Bocaracá; oropel (golden phase) | toboba de pestaña(s), víbora de pestañas | ICP 2019 (p. 44); Reptile Database |
| III | Coral | coralillo, coral macho, coral venenosa | ICP 2019 (p. 34); ICP web |
| IV | Cascabel | chichil / cascabel (= the rattle itself) | ICP 2019 (p. 53) |
| V | Matabuey | cascabel(a) muda; Pacific relative = plato negro | ICP 2019 (p. 54–55) |
| VI | Serpiente marina | serpiente de mar, culebra de mar | ICP 2019 (p. 33); Reptile Database |
| VII | Béquer | bécquer (ICP spelling), boa | Greene 1983 (*secondary*, via Zamora-Roda et al. 2022 refs); ICP 2019 (p. 19, 29) |

*Béquer* follows CONTRACTS §12; the ICP handbook spells it *bécquer*. Both are in use.
*Tobobas* = Costa Rican umbrella name for pit vipers (ICP 2019, p. 15, 43).

### 1.3 Conservation status (IUCN Red List)

Read from the GBIF copy of the IUCN checklist (`api.gbif.org/v1/species/{key}/iucnRedListCategory`)
on 1 Nov 2026; years from the published citations where verifiable.

| Species | Category | Assessment | Notes |
|---|---|---|---|
| *Bothrops asper* | LC | e.T197464A2486766 — Bonilla et al. **2021** | printed “IUCN Red List, 2021” |
| *Bothriechis schlegelii* (s.l.) | LC | e.T197463A2486599 | assessment of the pre-split species, which included Costa Rican populations; *B. nigroadspersus* not yet assessed. Arteaga et al. (2024) propose LC. Printed “IUCN, as *B. schlegelii*” |
| *Micrurus nigrocinctus* | LC | e.T198387A115339884 (2015 per Wikipedia citation) | year printed omitted |
| *Crotalus simus* | LC | e.T197480A217775736 (GBIF); Wikipedia cites 2014 e.T197480A2488426 | newer assessment version likely; year omitted |
| *Lachesis stenophrys* | **NT** | e.T203669A2769592 — Acosta Chaves et al. **2021** | printed “IUCN Red List, 2021” |
| *Hydrophis platurus* | LC | e.T176738A115883818 (2010 assessment, amended 2017) | year omitted |
| *Boa imperator* | LC | e.T203879A2771951 | year unverified; omitted |

URLs: <https://www.iucnredlist.org/species/197464/2486766> · <https://www.iucnredlist.org/species/197463/2486599> ·
<https://www.iucnredlist.org/species/198387/115339884> · <https://www.iucnredlist.org/species/197480/217775736> ·
<https://www.iucnredlist.org/species/203669/2769592> · <https://www.iucnredlist.org/species/176738/115883818> ·
<https://www.iucnredlist.org/species/203879/2771951>

---

## 2. Country-level facts (introduction and back matter)

| # | Claim as printed | Value | Source |
|---|---|---|---|
| C1 | More than 140 snake species live in Costa Rica | 144 (ICP 2019); 140 (ICP web); 138 (Lomonte et al. 2014); **147** in a Reptile Database distribution query of 1 Nov 2026 (254 reptiles; snakes counted by genus) | ICP 2019 p. 26; [ICP web](https://www.icp.ucr.ac.cr/en/information-and-materials/venomous-snakes-costa-rica); [Reptile DB search](https://reptile-database.reptarium.cz/advanced_search?location=costa+rica&submit=Search) |
| C2 | One of the richest countries for snakes per km² | stated by ICP | ICP 2019 p. 26 |
| C3 | Isthmus closed about 2.8 million years ago | 2.8 Ma | O’Dea et al. 2016, *Sci. Adv.* 2: e1600883 |
| C4 | Talamanca range rises to 3,821 m | Cerro Chirripó, 3,821 m (some sources 3,820) | [Wikipedia: Cerro Chirripó](https://en.wikipedia.org/wiki/Cerro_Chirrip%C3%B3) |
| C5 | Snakes live from the shore to almost 3,000 m | — | ICP 2019 p. 26 |
| C6 | Most species are harmless to people; about two dozen are *dangerously* venomous: 17 pit vipers + 5 coral snakes + 1 sea snake = 23 | **23** (ICP web today: 17 vipers; *Micrurus alleni*, *M. clarki*, *M. mipartitus* [= the gargantilla, *M. multifasciatus*], *M. mosquitensis*, *M. nigrocinctus*; *Hydrophis platura*). 24 in ICP 2019 (six corals, unnamed) and in the Reptile Database, which lists both *M. mipartitus* and *M. multifasciatus* although its own *M. mipartitus* account says Costa Rican records “represent most likely *multifasciatus*”. 22 in Lomonte et al. 2014 (16 + 5 + 1). Rear-fanged colubrids have mild venoms and count as non-venomous only “para efectos prácticos” | [ICP web list](https://icp.ucr.ac.cr/en/information-and-materials/venomous-snakes-costa-rica); [RDB *M. mipartitus*](https://reptile-database.reptarium.cz/species?genus=Micrurus&species=mipartitus); ICP 2019 pp. 26, 31, 34, 43 |
| C7 | No single place holds them all; each region has its own short list of dangerous species to learn | ICP 2019 p. 27 gives a ceiling of 35 species and 5–6 dangerous ones per locality; **not printed**, because La Selva (OTS, Sarapiquí) alone has 53 snake species with research-grade iNaturalist records (5 of them dangerous: *B. nigroadspersus*, *B. asper*, *P. nasutum*, *M. alleni*, *M. mosquitensis*) | ICP 2019 p. 27 (the learn-your-region advice); [iNaturalist species counts, place 135489](https://api.inaturalist.org/v1/observations/species_counts?place_id=135489&taxon_id=85553&quality_grade=research) (queried 1 Nov 2026) |
| C8 | Head shape and pupils mislead; the **non-venomous** boa has a triangular head and vertical pupils | ICP calls the boa “que no es venenosa”, but warns that boas “por su tamaño y tendencia a morder deben considerarse de cuidado” — hence not “harmless” | ICP 2019 p. 29, p. 41 and Cuadro 2 (p. 42) |
| C9 | The loreal pit (between eye and nostril) is the one sure sign of a (Costa Rican) viper; tobobas have “four nostrils”; **coral snakes and the sea snake have none, so a missing pit proves nothing** (also in the pull quote) | Cuadro 2 note: “cuatro orificios (2 narinas, 2 fosetas loreales)” | ICP 2019 pp. 13–15, 33–36, 40–42 |
| C10 | Snakebites needing hospital care: 500–600 a year in Costa Rica | 500–600/yr; 473/yr in 2012–2014 (Sasa & Segura-Cano 2020, *secondary*) | ICP 2019 p. 7 |
| C11 | Deaths have become rare | mortality 4.83 per 100,000 (1953) → ~0.2 (1990–93) → 0.02 (2006); 48 deaths 1993–2006 | Rojas et al. 1997; Fernández & Gutiérrez 2008 |
| C12 | Antivenom is **the specific and most effective treatment**; given intravenously by medical staff, never in the field (glossary: “the specific, most effective treatment for envenoming”) | ICP: “El único tratamiento efectivo … es el suero antiofídico”; WHO: antivenoms “are the most effective treatment to prevent or reverse most of the venomous effects” — the printed wording satisfies both and leaves room for hospital supportive care | ICP 2019 pp. 60, 68–69; [WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/snakebite-envenoming) (17 Sept 2026) |
| C13 | Costa Rica’s antivenoms are made by ICP (UCR); plate I says the **polyvalent** antivenom is raised against the terciopelo’s venom with the cascabel’s and matabuey’s | polyvalent anti-viper (immunising mix: *Crotalus simus*, *Lachesis stenophrys*, *Bothrops asper*) and anticoral (*Micrurus nigrocinctus*; not effective against the gargantilla); first national batch 1967; ICP inaugurated April 1970 | ICP 2019 pp. 8, 61, 64; [ICP history](https://icp.ucr.ac.cr/en/about-cpi/history-clodomiro-picado-institute) |
| C14 | Call 9-1-1 | Costa Rica emergency number | [ICP web](https://www.icp.ucr.ac.cr/en/information-and-materials/venomous-snakes-costa-rica) |

Not printed but useful context: WHO estimates 5.4 million bites, 1.8–2.7 million envenomings and
81,410–137,880 deaths a year worldwide ([WHO](https://www.who.int/news-room/fact-sheets/detail/snakebite-envenoming)).
Clodomiro Picado Twight (1887–1944) published *Serpientes venenosas de Costa Rica: sus venenos,
seroterapia antiofídica* in 1931.

---

## 3. Plates

### Plate I — Terciopelo, *Bothrops asper* (Garman, 1883) · pose `strike`

| # | Claim | Source |
|---|---|---|
| I-1 | *Terciopelo* = velvet (Spanish); *asper* = rough (Latin), probably alluding to the keeled dorsal scales | dictionary meanings; Wikipedia *B. asper* (etymology, hedged) |
| I-2 | Usually 1.2–1.8 m, to 2.5 m; females larger than males | Campbell & Lamar 2004 *(secondary, via Wikipedia)*; ICP web (typical 140–180 cm, max 250 cm, females longer); ICP 2019 p. 55 (generally 1.60–1.70 m, can exceed 2 m) |
| I-3 | Abundant in wet lowlands of both slopes, and **ranges** up to ~1,500 m (1,500 m is an upper record, not the limit of abundance) | ICP web (“abundance in low and wet lands in the Pacific and Caribbean”; “can be found even at 1500 m”); Campbell & Lamar give 1,200–1,300 m in Central America *(secondary)* |
| I-4 | Thrives in plantations/farmland and near rural homes | ICP 2019 p. 55 |
| I-5 | Nocturnal ambush hunter; diet shifts from frogs/lizards (young) to mostly small mammals (adults) | ICP 2019 p. 43 (all tobobas ambush); Sasa, Wasko & Lamar 2009 (abstract read via PubMed 19563822: “ectotherms (mainly frogs and lizards) when young”, then “birds, rodents, and other small mammals with maturity”; “nocturnal ambush sites”) |
| I-6 | Loreal pits allow aiming at warm prey in total darkness | ICP 2019 p. 14 |
| I-7 | Hinged, hollow fangs, **among the longest** of any Costa Rican snake (no ranking against the matabuey is published, so no superlative) | ICP 2019 p. 20 (“Los colmillos más largos son los de las víboras o tobobas, especialmente el de la terciopelo”), pp. 42–43 |
| I-8 | Venom gland **behind and below** the eye; the compressor muscle **helps** give the triangular head | ICP 2019 p. 42 (“detrás y hacia abajo de los ojos”), p. 43 (“ayuda a darle esa forma triangular”) |
| I-9 | Venom damages muscle, blood vessels and clotting → pain, swelling, bleeding | ICP 2019 p. 58 (Cuadro 3) |
| I-10 | Live-born litters of up to 90 | ICP web (“up to 90 offspring”); Solórzano & Cerdas 1989 report 14–86 (Caribbean) and 5–40 (Pacific) *(secondary)* |
| I-11 | Causes most of Costa Rica’s snakebites | ICP 2019 pp. 55–56 (“immense majority”); ICP web (>50 % regionally) |
| I-12 | The **polyvalent** antivenom is raised against its venom with the cascabel’s and matabuey’s | ICP 2019 p. 61 |
| I-13 | Juveniles wriggle tail tips to lure prey; males have yellow tail tips → *rabo amarillo* | ICP 2019 p. 25 |
| I-14 | IUCN LC (2021) | §1.3 |
| Beat | Vipers often release prey and follow its trail; venom toxins let snakes recognise the trail | ICP 2019 p. 22 |

Animation beats are timed to the snakes module’s strike keyframes (anticipation 1.15 s, strike
1.55 s, recoil 2.3 s, tongue 3.5 s — `src/subjects/snakes/poses.js`).

### Plate II — Bocaracá (oropel), *Bothriechis nigroadspersus* (Steindachner, 1870) · pose `branch`, morph `oropel`

| # | Claim | Source |
|---|---|---|
| II-1 | Slender arboreal pit viper of wet lowland and foothill forest, plantations, gardens | ICP 2019 p. 44; Arteaga et al. 2024 |
| II-2 | Sea level to about 1,430 m | Arteaga et al. 2024 (*B. nigroadspersus* “recorded at elevations 0–1,434 m”). ICP’s 1,500 m comes from the broad *B. schlegelii* and sits alongside *B. supraciliaris* (734–1,506 m), so it is not used |
| II-3 | Usually 50–70 cm, to 92 cm; females longer and more robust | Arteaga et al. 2024 / Reptile Database diagnosis (max TL 916 mm ♀, 626 mm ♂); ICP 2019 p. 44 (“alcanzan los 90 cm”); ICP web’s 95 cm (broad species concept) not used |
| II-4 | Colour extremely variable: green, grey, brown, orange, yellow, pink, white; plain or moss-like | ICP 2019 p. 44; ICP web |
| II-5 | Solid yellow = *oropel*, common in some areas, same species | ICP 2019 p. 44; ICP web; Arteaga et al. 2024 (diagnosis: yellow morph present and common in some areas) |
| II-6 | 2024 revision; Costa Rica’s bocaracá = *B. nigroadspersus*, formerly *B. schlegelii*; a close relative, *B. supraciliaris*, lives on the Pacific slope of the Talamanca range | Arteaga et al. 2024 (species accounts); Reptile Database (*B. nigroadspersus*, *B. supraciliaris*); ICP 2019 p. 44 |
| II-7 | Mostly nocturnal; mainly an ambush predator | ICP web; Arteaga et al. 2024 |
| II-8 | Diet: frogs, lizards, birds incl. hummingbirds, bats, mice (and mouse opossums) | Arteaga et al. 2024 |
| II-9 | Short prehensile tail can bear the whole body when hanging | ICP 2019 p. 44; ICP web |
| II-10 | Function of the “eyelash” (supraciliary) scales unproven; camouflage / eye protection are hypotheses | Univ. of Antwerp project page (F. Banfi: no detailed study yet); zoo profiles call it not fully understood |
| II-11 | 6–23 live young; neonates 16–22.5 cm | Arteaga et al. 2024 (species account) |
| II-12 | *Oropel* = brass beaten thin to imitate gold (tinsel) | RAE definition (via definicion.de; dle.rae.es blocks scripted access) |
| II-13 | IUCN LC as *B. schlegelii* (s.l.) | §1.3 |

Not used: Arteaga et al. report a Costa Rican female giving birth after ~35 months of sperm
storage, and 18.9 % of 477 Costa Rican bites in 1979 attributed to this species — accurate but
dated or tangential.

Animation beats follow the snakes module’s `branch()` pose: the coil keeps its shape for the whole
loop, the head sways continuously (±0.2 rad over 5 s) and the tongue flicks at 0.45, 2.35 and
4.2 s. The last beat therefore describes waiting, not a forebody that “settles back” (§10).

### Plate III — Coral, *Micrurus nigrocinctus* (Girard, 1854) · pose `slither`

| # | Claim | Source |
|---|---|---|
| III-1 | Slender, terrestrial and semi-fossorial elapid | ICP 2019 p. 35 |
| III-2 | Usually 50–75 cm, to 1.15 m | ICP web |
| III-3 | Pacific slope and Central Valley (San José, Heredia), sea level to 2,000 m; coffee farms, pastures, gardens | ICP web; ICP 2019 Fig. 14 (“coral del Pacífico y Meseta Central”) |
| III-4 | Rings complete; sequence red–cream–black–cream; red slightly wider than black; pale rings may be white or light yellow | ICP web; ICP 2019 pp. 34, 37–38 |
| III-5 | Eats snakes, swamp eels, caecilians, lizards | ICP 2019 p. 35 |
| III-6 | Two short fixed front fangs (proteroglyph) | ICP 2019 pp. 33, 36 |
| III-7 | Neurotoxic venom acting at the neuromuscular junction; severe untreated cases → respiratory paralysis | ICP 2019 pp. 36–37 |
| III-8 | The “red touches yellow” rhyme is North American and unsafe in Central America | Chandler, H. (2019), *Coral snakes and their mimics*, The Orianne Society (read 1 Nov 2026: the rhyme serves the Eastern coral snake of the south-eastern U.S., and “you certainly wouldn’t want to apply this to snakes in Central or South America”) |
| III-9 | Costa Rica’s coral gargantilla is bicoloured (black–red or black–white): red touches black, yet venomous | ICP 2019 p. 36, Fig. 15 (as *M. multifasciatus*; ICP web lists *M. mipartitus*) |
| III-10 | Harmless false corals such as *Erythrolamprus bizona* mimic corals | ICP 2019 p. 32, Fig. 12B |
| III-11 | Most coral bites happen when people pick the snake up; children and young people most affected | ICP 2019 p. 37 |
| III-12 | 5–14 eggs per clutch (Pacific population, mean 7.9) | Solano 1988, *Rev. Biol. Trop.* 36(2A): 235–239 (abstract read at the UCR journal archive: Pacific population, mean 7.9 eggs, range 5–14) |
| III-13 | Anticoral antivenom (raised against *M. nigrocinctus*) | ICP 2019 pp. 61, 64 |
| III-14 | Curls its tail tip to mimic a head and divert attacks | ICP 2019 p. 25 |
| III-15 | Coral bites are < 2 % of Costa Rican snakebites | ICP 2019 p. 37 (background, not printed) |

Note on the rhyme: ICP 2019 (Fig. 16) still teaches a ring-order rule for the *tricoloured* corals
(black rings flanked by pale rings, never touching red). The plate is consistent with that — it
says the rule holds “in this species” — while stressing that the gargantilla breaks it and that
handling is the real danger. No Costa Rican harmless species with red touching yellow was
verified, so the text does not claim one.

### Plate IV — Cascabel, *Crotalus simus* Latreille, 1801 · pose `rattle`

| # | Claim | Source |
|---|---|---|
| IV-1 | Costa Rica’s only rattlesnake; its range ends in Costa Rica (no rattlesnakes listed for Panama) | Reptile Database distribution (only *Crotalus* in CR; Panama absent); Wikipedia *C. simus* (south to west-central Costa Rica, absent from Panama) |
| IV-2 | Dry forests and savannas of Guanacaste and northern Puntarenas; a population in the dry western Central Valley | ICP 2019 pp. 53–54; ICP web |
| IV-3 | Usually 1–1.2 m, max 1.8 m; robust body | ICP web |
| IV-4 | Males larger than females; male combat “dance”, each lowering the other’s head | ICP 2019 p. 25 |
| IV-5 | Dark rhomboid (diamond) marks on light brown/cream; spinal ridge on the front third of the body (the strongly keeled, protruding scales are true but **no longer printed**: the figure has no `keeled-scales` label for this species) | ICP web |
| IV-6 | Rattle = hollow interlocking (keratin/epidermal) segments, one added per shed; number and size do not reveal age | ICP 2019 p. 53; ICP web; Klauber 1956 *(classic, not consulted)* |
| IV-7 | Neonate venom dominated by crotoxin (55.9 % at 6 weeks); adult venom mostly SVMPs (71.7 %) | Calvete et al. 2010; ICP 2019 p. 54 |
| IV-8 | One of three venoms used to raise the polyvalent antivenom | ICP 2019 p. 61 |
| IV-9 | Tail vibration is widespread in vipers (terciopelo included); a 2016 study of 56 species suggests the rattle evolved from it | Allf, Durst & Pfennig 2016 (*Am. Nat.*; abstract read via PubMed 27622880: defensive tail vibration is “nearly ubiquitous in the Viperidae”, measured in 56 species); ICP 2019 p. 25 |
| IV-10 | Live-born young | Reptile Database (“ovoviviparous”) |
| IV-11 | IUCN LC | §1.3 |
| IV-12 | Field Notes “Formerly *Crotalus durissus*” | Reptile Database synonymy: *C. durissus* Linnaeus 1758 (part.); *C. durissus durissus* Klauber 1952, Campbell & Lamar 2004; *C. durissus* Campbell 1998 |
| IV-13 | A **pair** of loreal pits — two of the tobobas’ “four nostrils” | ICP 2019 p. 42, Cuadro 2 note (“2 narinas, 2 fosetas loreales”) |
| IV-14 | Look-closer `venom-gland`: gland behind and below each eye; newborns make mostly nerve toxin, adults mostly tissue toxin (the note tells readers to switch on the venom layer, where the figure files this label) | ICP 2019 p. 42; Calvete et al. 2010 (crotoxin 55.9 % of neonate venom; SVMPs 71.7 % of adult venom) |

Taxonomy caveat: Reyes-Velasco et al. (2022) did not recover *C. simus* as distinct from
*C. durissus*; The Reptile Database still lists *C. simus* as valid and the plate follows it, now
printing the older name (*C. durissus*, used by Savage 2002) in Field Notes so readers can link the
two literatures.

Animation beats follow `rattle()`: the defensive coil, the raised tail and the buzzing rattle
(`out.shake = 1`) are held for the whole loop; only the head sways and the tongue flicks (0.9, 2.3
and 4.1 s). The first two beats therefore describe states — the coil, the raised rattle blurring —
not a coil being gathered or a tail being lifted (§10).

### Plate V — Matabuey, *Lachesis stenophrys* Cope, 1875 · pose `ambush`

| # | Claim | Source |
|---|---|---|
| V-1 | *Matabuey* = “ox-killer” (Spanish *matar* + *buey*) | dictionary |
| V-2 | Costa Rica’s longest viper | ICP 2019 p. 55 (Fig. 28) |
| V-3 | Usually 1.9–2.1 m, to 2.5 m (historical records to ~3.5 m are poorly documented) | ICP web; Wikipedia (Ditmars 1910, Solórzano 2004) *(secondary)* |
| V-4 | Wet forests of the Caribbean slope and northern lowlands, sea level to 1,100 m | ICP web; IUCN range data (via Wikipedia) |
| V-5 | Light brown/cream with dark rhomboids; pattern recalls the cascabel’s; no rattle → *cascabel muda* | ICP 2019 p. 54; ICP web |
| V-6 | Tail ends in a short, hard spine | ICP web (“small pointy needle”) |
| V-7 | Nocturnal; shelters in burrows dug by armadillos and other mammals | ICP web |
| V-8 | Ambushes small mammals | Greene & Santana 1983 *(secondary, via UWI species sheet)*; L. muta radiotracking (Atlantic Forest, 2022) shows ambush sites by mammal trails |
| V-9 | Lays eggs, up to 18 per clutch; only Costa Rican vipers that lay eggs are the two *Lachesis* | ICP web; ICP 2019 p. 55 |
| V-10 | Bushmasters probably the only egg-laying vipers in the Americas | Reptile Database (*L. muta*: “only oviparous New World crotaline genus”); Britannica; Campbell & Lamar 2004 hedge a possible *Bothrocophias* exception *(secondary)* — hence “probably” |
| V-11 | Potent venom but rare bites (scarce, restricted to forest) | ICP 2019 p. 55 |
| V-12 | Plato negro (*L. melanocephala*) lives in the southern Pacific | ICP 2019 p. 55 |
| V-13 | Strongly keeled, very protuberant dorsal scales | ICP web |
| V-14 | IUCN Near Threatened (2021) | §1.3 |
| Beat | Tail-tip vibration is a warning many vipers share | Allf et al. 2016 |
| Fig. | Caption, beats and the `eggs` note describe the figure as drawn: a female coiled around her clutch (the eggs layer is on by default), head turned outward on the paper | Egg attendance is documented in the genus: *L. muta* females “protect their clutch during the entirety of the incubation period” (Díaz-Ricaurte, Arteaga & Guayasamin 2020, *Reptiles of Ecuador*, citing Souza 2020 and Alves et al. 2014). Not verified for *L. stenophrys* itself, so the text makes no behavioural claim beyond the drawing |

The IUCN justification text for NT could not be read; the plate does not attribute a reason.

Animation beats follow `ambush()`: tongue out 0.9–1.5 s and 4.0–4.5 s; tail-tip vibration
2.1–3.5 s; breathing (±3.5 % girth) all loop. The second beat starts at 0.9 s (it was 1.2 s), so
the “motionless” first beat never overlaps a tongue flick, and the last beat names the second
flick (§10).

### Plate VI — Serpiente marina, *Hydrophis platurus* (Linnaeus, 1766) · pose `swim`

| # | Claim | Source |
|---|---|---|
| VI-1 | The only sea snake to reach the Americas (lede, reworded to 24 words for the §6 budget); Costa Rica’s only sea snake; Pacific only | ICP 2019 p. 33 (“El único elápido marino que llega a las costas de América”); ICP web |
| VI-2 | One of the most widely distributed snakes (Indian and Pacific oceans to the Americas) | Reptile Database (calls it the most widely distributed, citing Hecht et al. 1974) |
| VI-3 | Black dorsum, yellow venter/flanks, flattened paddle tail spotted black on yellow; the yellow belly gives the **English** name (the binomial means “flat-tailed water snake”, not a colour) | ICP 2019 p. 33 (“*Hydrophis platura* literalmente significa ‘serpiente de agua de cola aplanada’”); ICP web |
| VI-4 | Usually 50–90 cm, to 1.14 m | ICP web (Bessesen & Galbreath: individuals to ≥113 cm) |
| VI-5 | Especially common in Pacific bays and gulfs; Bahía Culebra (Guanacaste) named for it | ICP 2019 p. 33 |
| VI-6 | Entire life cycle at sea; young born at sea | ICP 2019 pp. 23, 33 |
| VI-7 | Moves clumsily on land | Wikipedia *H. platurus* *(secondary)* |
| VI-8 | Float-and-wait foraging on slicks with flotsam; small fish shelter beneath | Brischoux & Lillywhite 2011; Wikipedia (fish shelter) *(secondary)* |
| VI-9 | Does not drink seawater; may stay dehydrated 6–7 months; drinks from the freshwater lens after heavy rain; studied off Guanacaste (Golfo de Papagayo) | Lillywhite et al. 2014 (abstract); location via Reptiles Magazine summary |
| VI-10 | Golfo Dulce population smaller (mean 49.1 cm), almost entirely yellow, nocturnal ambush feeding, no drift-line association; described as *H. p. xanthos* in 2017; rank disputed | Bessesen & Galbreath 2017; Solórzano & Sasa 2024 (via Reptile Database) |
| VI-11 | Potent neurotoxic venom; fangs < 2 mm; very few bites in the region, none fatal | ICP 2019 p. 34 |
| VI-12 | Small fish diet | ICP 2019 p. 33; ICP web |
| VI-13 | Salt gland under the tongue | Animal Diversity Web (Liptow 1999) |
| VI-14 | Can absorb some oxygen through the skin | ADW; Graham 1974 *(secondary)* |
| VI-15 | Strandings most frequent Dec–Jan (start of dry season) when wind and water temperature push snakes ashore | ICP 2019 p. 33 |
| VI-16 | IUCN LC | §1.3 |
| VI-17 | Long known as *Pelamis platurus* (synonym printed in the body) | Reptile Database synonymy (*Pelamis platurus* Smith 1943 … Milto & Lukin 2020; *Pelamis platura* Böhme 2003, Wallach et al. 2014) |

Deliberately not printed: whether the nostrils are valved (sources disagree for this species),
litter size (1–10 per ADW; poorly sourced), dive depths.

### Plate VII — Béquer, *Boa imperator* Daudin, 1803 · pose `constrict`

| # | Claim | Source |
|---|---|---|
| VII-1 | Costa Rica’s largest (heaviest) snake | ICP 2019 p. 29 |
| VII-2 | Usually 2–2.5 m; none > 3.8 m recorded in Costa Rica (species max ~5 m) | Solórzano & Sasa 2024 |
| VII-3 | Both slopes and Central Valley; rain and dry forest; sea level to 1,650 m; also in houses and barns | Solórzano & Sasa 2024 (citing Savage 2002 et al.); ICP 2019 Fig. 11 gives ~1,400 m |
| VII-4 | No venom; kills by constriction | ICP 2019 pp. 19, 29 |
| VII-5 | Diet incl. rats, agoutis, opossums, bats, birds, iguanas | Solórzano & Sasa 2024 |
| VII-6 | Constriction causes circulatory arrest within minutes, not suffocation; blood pressure halved within ~6 s | Boback et al. 2015 — on anaesthetised laboratory rats (Methods: 24 male Wistar rats, 350–475 g, a strain of *R. norvegicus*, although the Introduction calls them *Rattus rattus*). The body and did-you-know therefore say “prey”, never “black rats” (§11) |
| VII-7 | Boas sense the prey’s heartbeat and squeeze longer/harder while it beats | Boback et al. 2012 (abstract read via PubMed 22258447: boas constricted “longer and with greater total pressure” against a simulated heartbeat) |
| VII-8 | Boas shift lung ventilation to other rib segments when part of the body is compressed | Capano et al. 2022 (abstract read via PubMed 35325925: *Boa constrictor* can “modulate which specific segments of ribs are used to ventilate the lung”) |
| VII-9 | Pelvic spurs are the **visible tips** of vestigial hind legs: a keratin claw capping a remnant femur, with a remnant hip bone hidden in the muscle; larger in males; used in courtship | Wikipedia *Pelvic spur* (“made up of the remnants of the femur bone, which is then covered by a corneal spur”) *(secondary)*; Palci et al. 2020 (basal alethinophidians share “a distinctive configuration of cloacal spur (claw), femur and a sizeable pubis”); Uberon UBERON:0005161; Beddard 1905; Anzai et al. 2023 (*Herpetol. Bull.* 163) |
| VII-10 | Live-born young | ICP 2019 p. 29 |
| VII-11 | Taxonomy: *Boa imperator* is a valid species, long treated as *B. constrictor imperator* (now printed in the body) | Reptile Database (*Boa constrictor imperator* Daudin 1803; Forcart 1951; Stimson 1969; Binder & Lamp 2007) |
| VII-12 | IUCN LC | §1.3 |
| VII-13 | A pair of ribs on every trunk vertebra, none on the tail (matches the figure’s own `ribs` label) | Wikipedia *Snake* (“The tail vertebrae are comparatively few in number (often less than 20% of the total) and lack ribs”) *(secondary)* |
| VII-14 | Not harmless: boas have no venom glands but bite and must be treated with care (why the intro says “non-venomous”, not “harmless”) | ICP 2019 p. 29 |
| VII-15 | The figure’s prey is a black rat, *Rattus rattus* (caption, beats), a documented prey of *B. imperator* | Aguilar-López & Tapia-Ramírez 2025, read in full: “el primer registro documentado de una interacción trófica entre *Boa imperator* y *Rattus rattus*” (Las Choapas, Veracruz, Mexico, 6 Nov 2024; a boa of 500 mm SVL + 70 mm tail with a rat of 140 mm SVL in its stomach, identified from photographs and confirmed on a female trapped later at the same house). The species is the common rat of Costa Rican collections: GBIF holds 89 Costa Rican *R. rattus* occurrences (70 preserved specimens) against 17 for *R. norvegicus* (queried 1 Nov 2026). The Costa Rican record says only “rat” (open question 16) |
| VII-16 | Two loops round the prey’s chest and belly (beats “around the rat’s chest”, “pressing on the rat’s chest”) | Boback et al. 2015: loops round the thorax and abdomen in 15 of 17 trials, round the neck in 2 |
| VII-17 | A dark stripe runs from the snout back through each eye (look-closer `eye-stripe`; unchanged) | Lindemann 2009 (ADW): a dark triangle between snout and eye, continued behind the eye and slanting down to the jaw; Duque-Torres et al. 2024: three dark head stripes. In front of the eye the stripe is dark brown in some photographs and rust-brown in others (Osa, iNaturalist 28968884; ICP image gallery “snakes 01”, A. Solórzano); behind it, black. The figure paints it dark brown in front and black behind (`src/subjects/snakes/species.js`, `face.colors.crownStripe` / `stripe`), so “dark” is true of both. Photo audit: `.scratch/bilingual/research-boa-rat.md` §2.4–2.6 and its review (B-12, B-13). See open question 17 |

Recurved teeth and the dark eye stripe are standard *Boa* characters (Savage 2002) — general
anatomy, not a numbered claim; VII-17 records the stripe’s sources.

---

## 4. Snakebite note — what is advised, and why

Printed advice and its sources:

| Advice | ICP 2019 (pp. 65–69) | CDC/NIOSH | Notes |
|---|---|---|---|
| Call 9-1-1; go at once to the nearest clinic/hospital | ✓ (transport immediately) | ✓ | 9-1-1 per ICP web |
| Seek care even if the bite seems minor (coral: mild local signs, systemic effects hours later) | ✓ (local signs 5–30 min; systemic 5–6 h) | ✓ (don’t wait for symptoms) | |
| Keep the person calm, still, accompanied | ✓ | ✓ | |
| Immobilise the limb if it causes no delay | ✓ | — | no pressure bandage (not ICP practice; can worsen viper local damage) |
| Remove rings, watches, bracelets | ✓ | ✓ | |
| Wash with soap and water | ✓ | ✓ | |
| Note the time | ✓ | ✓ | |
| No tourniquet | ✓ | ✓ | |
| No cutting | ✓ | ✓ | |
| No suction (mouth or devices) | ✓ | ✓ | |
| No ice | — | ✓ | ICP is silent on ice; CDC explicit |
| No alcohol, medicines, home remedies | ✓ | ✓ (no alcohol/NSAIDs, no folk remedies) | |
| Don’t catch or kill the snake; symptoms guide treatment | ✓ | ✓ (photo only from a safe distance) | photo omitted to discourage approaching |
| Antivenom — “the specific and most effective treatment” — given IV by medical staff, never in the field | ✓ (“único tratamiento efectivo”) | — | WHO: antivenoms “are the most effective treatment”; wording aligned with WHO after the fact-check |
| Never handle a snake, even a dead one | — | ✓ | |
| Prevention: closed boots, light at night, look before placing hands/feet | ✓ (Cuadro 6) | — | |

---

## 5. Glossary — sources

Antivenom, Crotalinae, Elapidae, loreal pit, keeled scale, ventral scutes, neurotoxin, oviparous,
viviparous (“ovoviviparous” in older texts), caudal luring, *tobobas*: ICP 2019 (text and
glossary, pp. 9–25, 71–78). Mimicry: Orianne Society. Solenoglyph: standard herpetological term;
mechanism per ICP 2019 p. 43. Prehensile: general definition. Revised after the fact-check:
*Antivenom* now ends “the specific, most effective treatment for envenoming” (WHO wording, see C12);
*Neurotoxin* now reads “a toxin that acts on the nervous system; those of coral snakes, the sea snake
and young cascabeles block the signals from nerves to muscles” (ICP 2019 p. 36: corals, like the sea
snake, have fixed fangs and “potentes neurotoxinas”; Calvete et al. 2010: crotoxin dominates neonate
*C. simus* venom); *Elapidae* says “coral snakes and **the** sea snake here” (Costa Rica has one).

---

## 6. Bibliography (with URLs)

Printed on the Sources page — 19 entries for 20 works, general works first, then plate order
(the two Boback papers share entry 15, as they share the citation on plate VII; entry 18 joined in
the bilingual revision, §11). Since the visual
review (§10) every short citation on a plate, and the note’s mortality claim, has a full entry here;
bibliographic data checked against Crossref (DOIs below) and the UCR journal archive on 1 Nov 2026.
1. Sasa, M., Bonilla, F. & Chaves, F. (2019). *Serpientes venenosas de Costa Rica: biología básica.* ICP–UCR. ISBN 978-9968-555-06-7. <https://icp.ucr.ac.cr/sites/default/files/content/serpientes-venenosas-de-cr-biologia-basica-icp.pdf>
2. Instituto Clodomiro Picado. Venomous snakes in Costa Rica (species accounts). <https://www.icp.ucr.ac.cr/en/information-and-materials/venomous-snakes-costa-rica> — e.g. [/bothrops-asper](https://icp.ucr.ac.cr/en/information-and-materials/venomous-snakes-costa-rica/bothrops-asper), [/bothriechis-schlegelii](https://icp.ucr.ac.cr/en/information-and-materials/venomous-snakes-costa-rica/bothriechis-schlegelii), [/micrurus-nigrocinctus](https://icp.ucr.ac.cr/en/information-and-materials/venomous-snakes-costa-rica/micrurus-nigrocinctus), [/crotalus-simus](https://icp.ucr.ac.cr/en/information-and-materials/venomous-snakes-costa-rica/crotalus-simus), [/lachesis-stenophrys](https://icp.ucr.ac.cr/en/information-and-materials/venomous-snakes-costa-rica/lachesis-stenophrys), [/hydrophis-platura](https://icp.ucr.ac.cr/en/information-and-materials/venomous-snakes-costa-rica/hydrophis-platura)
3. Savage, J. M. (2002). *The Amphibians and Reptiles of Costa Rica* (printed without its subtitle, *A Herpetofauna between Two Continents, between Two Seas*). University of Chicago Press. *(foundational further reading; cited through Solórzano & Sasa 2024 and the snakes module, not consulted directly)*
4. Uetz, P., Freed, P., Aguilar, R., Reyes, F., Kudera, J. & Hošek, J. (eds.) — printed as “Uetz, P., Freed, P., Aguilar, R., et al.”. The Reptile Database. <https://reptile-database.reptarium.cz> — species pages for [*B. asper*](https://reptile-database.reptarium.cz/species?genus=Bothrops&species=asper), [*B. nigroadspersus*](https://reptile-database.reptarium.cz/species?genus=Bothriechis&species=nigroadspersus), [*B. schlegelii*](https://reptile-database.reptarium.cz/species?genus=Bothriechis&species=schlegelii), [*M. nigrocinctus*](https://reptile-database.reptarium.cz/species?genus=Micrurus&species=nigrocinctus), [*C. simus*](https://reptile-database.reptarium.cz/species?genus=Crotalus&species=simus), [*L. stenophrys*](https://reptile-database.reptarium.cz/species?genus=Lachesis&species=stenophrys), [*L. muta*](https://reptile-database.reptarium.cz/species?genus=Lachesis&species=muta), [*H. platurus*](https://reptile-database.reptarium.cz/species?genus=Hydrophis&species=platurus), [*B. imperator*](https://reptile-database.reptarium.cz/species?genus=Boa&species=imperator)
5. IUCN Red List — see §1.3; GBIF mirror: `https://api.gbif.org/v1/species/{192010326,176745847,176722933,176746020,192010186,176723504,176745163}/iucnRedListCategory`
6. Sasa, M., Wasko, D. K. & Lamar, W. W. (2009). Natural history of the terciopelo *Bothrops asper* (Serpentes: Viperidae) in Costa Rica. *Toxicon* 54(7): 904–922. <https://doi.org/10.1016/j.toxicon.2009.06.024> (abstract read via PubMed 19563822) — plate I
7. Arteaga, A. et al. (2024). Systematic revision of the eyelash palm-pitviper *Bothriechis schlegelii*… *Evolutionary Systematics* 8(1): 15–64. <https://doi.org/10.3897/evolsyst.8.114527> — plate II
8. Solano, A. (1988). Ciclos reproductivos de la serpiente coral *Micrurus nigrocinctus* (Serpentes: Elapidae) en Costa Rica. *Rev. Biol. Trop.* 36(2A): 235–239. <https://archivo.revistas.ucr.ac.cr/index.php/rbt/article/view/23704> (single author, Alejandro Solano, per the journal archive) — plate III
9. Chandler, H. (2019, 14 May). Coral snakes and their mimics. The Orianne Society. <https://www.oriannesociety.org/science-of-scales/coral-snakes-and-their-mimics/> (consulted 1 Nov 2026; cited on plate III as “Chandler 2019 (Orianne Society)”)
10. Calvete, J. J. et al. (2010). Snake venomics of the Central American rattlesnake *Crotalus simus* and the South American *Crotalus durissus* complex points to neurotoxicity as an adaptive paedomorphic trend along *Crotalus* dispersal in South America. *J. Proteome Res.* 9(1): 528–544. <https://doi.org/10.1021/pr9008749> (abstract via [Kérwá](https://www.kerwa.ucr.ac.cr/items/26e67696-a5ff-47f5-ba81-c8810a120faa)); the full title is now printed (it was cut after “complex” without an ellipsis) — plate IV
11. Allf, B. C., Durst, P. A. P. & Pfennig, D. W. (2016). Behavioral plasticity and the origins of novelty: the evolution of the rattlesnake rattle. *Am. Nat.* 188(4): 475–483. <https://doi.org/10.1086/688017> (abstract read via PubMed 27622880: tail vibration nearly ubiquitous in Viperidae; 56 species measured). Summary: <https://www.sciencenews.org/blog/wild-things/tail-vibrations-may-have-preceded-evolution-rattlesnake-rattle> — plate IV
12. Brischoux, F. & Lillywhite, H. B. (2011). Light- and flotsam-dependent ‘float-and-wait’ foraging by pelagic sea snakes (*Pelamis platurus*). *Mar. Biol.* 158(10): 2343–2347. <https://doi.org/10.1007/s00227-011-1738-z> — plate VI
13. Lillywhite, H. B., Sheehy, C. M., Brischoux, F. & Grech, A. (2014). Pelagic sea snakes dehydrate at sea. *Proc. R. Soc. B* 281: 20140119. <https://doi.org/10.1098/rspb.2014.0119> — plate VI
14. Bessesen, B. L. & Galbreath, G. J. (2017). A new subspecies of sea snake, *Hydrophis platurus xanthos*, from Golfo Dulce, Costa Rica. *ZooKeys* 686: 109–123. <https://doi.org/10.3897/zookeys.686.12682> — plate VI
15. Boback, S. M., Hall, A. E., McCann, K. J., Hayes, A. W., Forrester, J. S. & Zwemer, C. F. (2012). Snake modulates constriction in response to prey’s heartbeat. *Biol. Lett.* 8(3): 473–476. <https://doi.org/10.1098/rsbl.2011.1105> (abstract read via PubMed 22258447); and Boback, S. M., McCann, K. J., Wood, K. A., McNeal, P. M., Blankenship, E. L. & Zwemer, C. F. (2015). Snake constriction rapidly induces circulatory arrest in rats. *J. Exp. Biol.* 218(14): 2279–2288. <https://doi.org/10.1242/jeb.121384> — one printed entry, “Boback, S. M., et al. (2012) …; (2015) …” — plate VII
16. Capano, J. G., Boback, S. M., Weller, H. I., Cieri, R. L., Zwemer, C. F. & Brainerd, E. L. (2022). Modular lung ventilation in *Boa constrictor*. *J. Exp. Biol.* 225(6): jeb243119. <https://doi.org/10.1242/jeb.243119> (abstract read via PubMed 35325925) — plate VII
17. Solórzano, A. & Sasa, M. (2024). Failed predation of a newborn calf by the Central American common boa (*Boa imperator*) in Costa Rica. *Rev. Latinoam. Herpetol.* 7(1): 181–184. <https://doi.org/10.22201/fc.25942158e.2024.1.907> — plate VII
18. Aguilar-López, J. L. & Tapia-Ramírez, G. (2025). Depredación de *Rattus rattus* (Muridae) por *Boa imperator* (Boidae) en el sur de México. *Rev. Latinoam. Herpetol.* 8(4): 271–276 (e1460). <https://doi.org/10.22201/fc.25942158e.2025.4.1460> (read in full from the journal’s PDF; title, authors, volume, issue and pages checked on the article page) — plate VII
19. Fernández, P. & Gutiérrez, J. M. (2008). Mortality due to snakebite envenomation in Costa Rica (1993–2006). *Toxicon* 52: 530–533. <https://doi.org/10.1016/j.toxicon.2008.06.018> — the note

Printed style: ISO 4 journal abbreviations (no-break spaces inside, so “Rev. Biol. Trop.” never
splits), up to four authors in full and the first three plus “et al.” beyond that (the shared
Boback entry names only its common first author), issue numbers only where the original entry had
them or the issue is unusual (36(2A), 7(1)).

Used for checking only (not cited in the book):
- Savage, J. M. & Vial, J. L. (1973). The venomous coral snakes (genus *Micrurus*) of Costa Rica. *Rev. Biol. Trop.* 21: 295–349. <https://archivo.revistas.ucr.ac.cr/index.php/rbt/article/view/27283>
- Anzai, R. K. et al. (2023). Pelvic spur use during courtship and mating in the red-tailed boa *Boa constrictor*. *Herpetological Bulletin* 163: 35–36.
- Rojas, G., Bogarín, G. & Gutiérrez, J. M. (1997). Snakebite mortality in Costa Rica. *Toxicon* 35(11). <https://doi.org/10.1016/S0041-0101(97)00046-9>
- Silva, K. M. P. et al. (2023). Sexual maturity of *Bothrops asper* from Costa Rica. *Phyllomedusa* 22: 75–80. <https://doi.org/10.11606/issn.2316-9079.v22i1p75-80> (adult females average 1,147 mm SVL, males 930 mm)
- O’Dea, A. et al. (2016). Formation of the Isthmus of Panama. *Sci. Adv.* 2: e1600883. <https://doi.org/10.1126/sciadv.1600883>
- Lomonte, B., Fernández, J., Sanz, L., Angulo, Y., Sasa, M., Gutiérrez, J. M. & Calvete, J. J. (2014). Venomous snakes of Costa Rica: biological and medical implications of their venom proteomic profiles analyzed through the strategy of snake venomics. *Journal of Proteomics* 105. <https://doi.org/10.1016/j.jprot.2014.02.020> ([Kérwá record](https://kerwa.ucr.ac.cr/handle/10669/11036)) — 138 snakes; 22 venomous Viperidae + Elapidae.
- Zamora-Roda, Á. A. et al. (2022). First predatory record on *Caluromys derbianus* by *Boa imperator* in Costa Rica. *Rev. Mex. Mastozool.* 12(1): 69–72 (Greene 1983 “Boa, Béquer” in refs).
- Díaz-Ricaurte, J. C., Arteaga, A. & Guayasamin, J. M. (2020). Amazonian bushmaster (*Lachesis muta*). In: Arteaga, A., Bustamante, L. & Vieira, J. (eds.) *Reptiles of Ecuador: Life in the middle of the world*. <https://reptilesofecuador.com/lachesis_muta.html> (<https://doi.org/10.47051/BJCI8462>) — maternal care of the clutch through incubation, citing Souza 2020 and Alves et al. 2014 (read 1 Nov 2026; checks the plate V figure, see §3)
- CDC/NIOSH. Venomous snakes (outdoor workers). <https://www.cdc.gov/niosh/outdoor-workers/about/venomous-snakes.html>
- WHO. Snakebite envenoming, fact sheet (Sept 2026). <https://www.who.int/news-room/fact-sheets/detail/snakebite-envenoming>
- Animal Diversity Web: *Pelamis platura* (Liptow 1999). <https://animaldiversity.org/accounts/Pelamis_platura/>
- ICP history. <https://icp.ucr.ac.cr/en/about-cpi/history-clodomiro-picado-institute>
- Uberon: pelvic spur. <https://amigo.geneontology.org/amigo/term/UBERON:0005161>
- University of Antwerp, F. Banfi research page (viper horns/eyelashes, function untested). <https://uantwerpen.be/en/staff/federico-banfi/research>
- Wikipedia (secondary checks only): [*Bothrops asper*](https://en.wikipedia.org/wiki/Bothrops_asper), [*Crotalus simus*](https://en.wikipedia.org/wiki/Crotalus_simus), [*Lachesis stenophrys*](https://en.wikipedia.org/wiki/Lachesis_stenophrys), [*Hydrophis platurus*](https://en.wikipedia.org/wiki/Hydrophis_platurus), [*B. nigroadspersus*](https://en.wikipedia.org/wiki/Bothriechis_nigroadspersus), [Cerro Chirripó](https://en.wikipedia.org/wiki/Cerro_Chirrip%C3%B3)

Added during the fact-check revision (1 Nov 2026):
- Palci, A., Hutchinson, M. N., Caldwell, M. W., Smith, K. T. & Lee, M. S. Y. (2020). The homologies and evolutionary reduction of the pelvis and hindlimbs in snakes, with the first report of ossified pelvic vestiges in an anomalepidid (*Liotyphlops beui*). *Zoological Journal of the Linnean Society* 188(2): 630–652. <https://doi.org/10.1093/zoolinnean/zlz098> (abstract read via [Flinders University](https://researchnow.flinders.edu.au/en/publications/the-homologies-and-evolutionary-reduction-of-the-pelvis-and-hindl/); a checker cited it as “Palci & Hutchinson 2019”)
- iNaturalist. Research-grade snake species at La Selva Research Station (OTS), place 135489: <https://api.inaturalist.org/v1/observations/species_counts?place_id=135489&taxon_id=85553&quality_grade=research> (53 species, queried 1 Nov 2026); place record <https://api.inaturalist.org/v1/places/135489>
- Reptile Database species pages: [*Micrurus mipartitus*](https://reptile-database.reptarium.cz/species?genus=Micrurus&species=mipartitus) (Costa Rican records “most likely *multifasciatus*”), [*Bothriechis supraciliaris*](https://reptile-database.reptarium.cz/species?genus=Bothriechis&species=supraciliaris)
- Arteaga et al. 2024, full text (JATS XML): <https://evolsyst.pensoft.net/article/114527/download/xml/> — *B. nigroadspersus* 0–1,434 m, max TL 916 mm ♀ / 626 mm ♂, litters 6–23 (neonates 16–22.5 cm); *B. supraciliaris* 734–1,506 m, Pacific slopes of the Cordillera de Talamanca
- Wikipedia (secondary): [Pelvic spur](https://en.wikipedia.org/wiki/Pelvic_spur), [Snake](https://en.wikipedia.org/wiki/Snake) (ribs, pelvic vestiges), [*Lachesis* (genus)](https://en.wikipedia.org/wiki/Lachesis_(genus)) (oviparity; possible *Bothrocophias colombianus* exception)

Added during the bilingual revision (1 Nov 2026; §11):
- Boback et al. 2015, full text (*J. Exp. Biol.* 218(14): 2279–2288, <https://journals.biologists.com/jeb/article/218/14/2279/14389/Snake-constriction-rapidly-induces-circulatory>): Methods, “24 male Wistar rats (350–475 g)”, anaesthetised (isoflurane, then Inactin); loops round “the rat’s thorax and abdomen” in 15 of 17 trials, round the neck in 2. The Introduction names the rats *Rattus rattus*; Wistar is a laboratory strain of *R. norvegicus*.
- GBIF occurrence API, country CR, queried 1 Nov 2026: *Rattus rattus* (taxonKey 2439270) 89 occurrences, 70 preserved specimens — <https://api.gbif.org/v1/occurrence/search?taxonKey=2439270&country=CR&limit=0>; *R. norvegicus* (2439261) 17 and 12; *Ototylomys phyllotis* (2439155) 55 and 23.
- iNaturalist observation 28968884 (J. Deitsch, Osa, CC BY-NC), the béquer’s head in profile: rust between nostril and eye, a black stripe behind the eye slanting to the jaw — <https://www.inaturalist.org/observations/28968884>; Instituto Clodomiro Picado, image gallery “snakes 01” (*Boa imperator*, photos A. Solórzano) — <https://icp.ucr.ac.cr/index.php/en/resources/imagenes/snakes-01> (both through the photo audit of `.scratch/bilingual/research-boa-rat.md` §2.1–2.6 and its adversarial review, B-12 and B-13).
- Lindemann, L. (2009). *Boa constrictor*. Animal Diversity Web. <https://animaldiversity.org/accounts/Boa_constrictor/> (three head stripes: along the top of the head; a dark triangle between snout and eye, continued behind the eye and slanting down to the jaw).

---

## 7. Open questions and known uncertainties

1. **Species count.** 138–147 depending on source and date (§2 C1); the text says “more than 140”
   and cites ICP’s 144. A fresh national checklist would settle it.
2. **Venomous count.** 22–24 depending on whether *Micrurus mipartitus* and *M. multifasciatus*
   are both recognised in Costa Rica, and on viper splits (*Atropoides*/*Metlapilcoatlus*). The
   text says “about two dozen” and, since the fact-check, gives ICP’s current 17 + 5 + 1 = 23
   (the sixth coral of ICP 2019 and the Reptile Database is the gargantilla counted twice).
3. **Eyelash viper taxonomy.** Arteaga et al. (2024) is recent; wider adoption (IUCN, ICP) is
   pending. If the community rejects the split, revert plate II’s `scientific` to
   *Bothriechis schlegelii* (Berthold, 1846) and the chip source to “IUCN Red List”.
4. **Authority dates.** *B. asper* 1883 vs 1884; *C. simus* 1801 vs 1802; *L. stenophrys* 1875
   (Reptile Database, after Murphy et al. 2007) vs 1876 (IUCN, GBIF). Printed: 1883, 1801, 1875.
5. ***C. simus* validity.** Reyes-Velasco et al. (2022) lump it into *C. durissus*; not followed.
6. ***H. p. xanthos* rank.** Disputed (Solórzano & Sasa 2024); printed as “a rank still debated”.
7. **IUCN assessment years** for *M. nigrocinctus*, *C. simus*, *H. platurus*, *B. imperator* and
   *B. schlegelii* s.l. could not be read on iucnredlist.org (scripted access blocked); years are
   omitted on those chips.
8. **Terciopelo litter size.** “Up to 90” follows ICP; the classic Costa Rican study
   (Solórzano & Cerdas 1989) maximum is 86 — consistent, but read only through secondary sources.
9. **Sea snake nostril valves** — sources conflict for this species; the plate avoids the claim.
10. **Pelvic-spur courtship** for *B. imperator* specifically is inferred from *B. constrictor*
    studies (same genus); the text says “males … use them in courtship”, which holds for the genus.
11. **Species per locality.** ICP 2019’s ceiling (35 species, 5–6 dangerous per locality) fails at
    La Selva (53 research-grade species on iNaturalist). A peer-reviewed La Selva snake total
    (e.g. Guyer & Donnelly 2005) was not read; the web-search budget ran out. The text now makes no
    numeric claim.
12. **Fang length.** No measured comparison of terciopelo and matabuey fangs was found; the text
    hedges (“among the longest of any Costa Rican snake”).
13. **Look-closer notes on hidden layers.** Five notes point at labels the figure files under a
    layer that is off by default (`fangs`, `venom-gland`, `fixed-fangs`, `ribs`). The Reader turns
    labels on but not the label’s layer; only the cascabel note tells readers to switch the venom
    layer on. Suggested integration fix: when a look-closer tap targets a label with a `layer`
    that is off, switch that layer on. *(Since done: the Reader’s `lookCloser()` switches the
    label’s layer on, CONTRACTS §15.)*
14. **Sources budget.** CONTRACTS §6 allows 5–12 entries in `back.sources`, but this book cites 19
    works (18 entries) on its plates and in the note, and every one supports a printed claim (§6).
    `node scripts/validate-books.mjs serpientes` therefore warns “18 sources (want 5–12)”. Cutting
    to 12 would leave claims such as the heartbeat-sensing boa (Boback 2012), modular breathing
    (Capano 2022) or the 56-species rattle study (Allf 2016) without a printed source. Needs a
    contract/validator change by their owners: raise the cap (e.g. 5–20, or a per-book override)
    — the page itself sets at a 90 % auto-fit, the floor the QA checklist accepts.
    **Resolved (lead, integration round 2):** the sources budget is now 5–20 in
    `scripts/validate-books.mjs` and CONTRACTS §6; validate-books is warning-free.
15. **Matabuey loop title.** With the eggs layer on by default the figure shows a female around
    her clutch, while the loop keeps the contract’s title, “Ambush”. Brooding *L. muta* females
    are reported to protect the clutch throughout incubation (Díaz-Ricaurte et al. 2020), so a
    reader may wonder whether she hunts from the nest; nothing printed claims it. If this reads as
    a contradiction, either the eggs layer could start off (snakes module) or the loop could be
    retitled (e.g. “On guard”).
    **Resolved (lead, integration round 2):** the loop is now titled “On guard”, which fits the
    beats (waiting, the disturbed tail-tip warning) with the eggs layer on or off.
16. **The béquer’s prey in Costa Rica.** No published Costa Rican record names the species of rat
    a béquer eats: Solórzano & Sasa 2024 report a juvenile from Parrita (Puntarenas) that died
    after swallowing an adult rat, species not identified. The plate draws a black rat as a
    documented prey of *B. imperator* (Aguilar-López & Tapia-Ramírez 2025, Mexico) and the common
    rat of Costa Rican collections (VII-15), not as a Costa Rican observation; the caption says “a
    black rat”, never “in Costa Rica”. The documented native alternative is the big-eared climbing
    rat *Ototylomys phyllotis*, listed as *B. imperator* prey in the same paper’s Table 1 (citing
    Bakkegard & Timm 2001; Leenders & Watkins-Colwell 2003), with 55 Costa Rican GBIF records.
17. **Eye-stripe colours follow the figure.** The research spec for the béquer proposed a rust
    patch between nostril and eye, and, if the figure painted it, the look-closer row “A stripe
    runs from the snout back through each eye: rust-brown in front, black behind.” The head
    painter (snakes module) paints that stretch dark brown instead, so the row keeps “A dark
    stripe runs from the snout back through each eye.”, which also matches the figure’s own label
    detail. If the stretch in front of the eye is ever painted rust, change the row and the label
    detail together.

---

## 8. Production notes

- Text budgets are checked with `node scripts/validate-books.mjs serpientes`, which counts words by
  whitespace (a spaced em dash and each half of a no-break-space pair count as words). After the
  fact-check revision: 0 errors, 0 warnings — lede 20–25, body 135–173, did-you-know 24–33, facts 5–6
  rows with values ≤ 6 words, 3–4 look-closer items; intro 256 words (≤ 260); note 208 words; 14
  glossary terms; 12 sources. (The first draft’s sea-snake lede counted 26 under this rule.) After
  the visual review: 0 errors, 1 warning — `back.sources: 18 sources (want 5–12)` (open question 14).
- Every look-closer label id was checked against the labels the live figure creates
  (`lab.html?type=snake&params=…` → `lab.info().labels`): 26 of 26 resolve. The canonical §6 table
  alone is not enough — `keeled-scales` is canonical for all pit vipers, but the snakes module only
  creates it for the terciopelo and the matabuey.
- All 26 printed sides were rendered in `typeset.html?book=serpientes` with **no overflow** and no
  auto-shrink (every page at 100 %), before and after the revision. Screenshots:
  `.scratch/serpientes-content-*.png` (first draft), `.scratch/serpientes-rev-*.png` (revision:
  intro p. 4, plates I, II, IV, VI, VII, note, glossary, 3D book on WebGPU and WebGL 2).
  Since the visual review the Sources page (p. 21) holds 18 entries and sets at a **90 %**
  auto-fit (at page widths 1024, 1200, 1536 and 2048 alike); every other side is still at 100 %.
  Since the bilingual revision (§11) it holds 19 entries above a two-line colophon and sets at
  **95 %** (1024 and 2048 alike), which leaves the Spanish edition room to grow.
- Animation beats are timed to `src/subjects/snakes/poses.js` (strike at 1.55 s; tail curl at
  2.6 s; tail-tip vibration 2.1–3.5 s; constriction 0.7–2.7 s; each pose’s tongue bouts), and a
  beat only narrates a motion the loop performs. States a pose holds for the whole loop — the
  cascabel’s raised, buzzing rattle, the bocaracá’s coil — are described as states (§10).
- Plain text (no markup) in beats, captions and scale notes, because they also appear in HTML
  captions and SVG exports; binomials elsewhere use `*italic*`.
- Number–unit pairs use a no-break space (` `) so “1.2–1.8 m” never splits across lines.

---

## 9. Fact-check log

Two independent fact-checkers reviewed `src/books/serpientes.js` on 1 November 2026 and raised
25 issues: 2 errors, 15 imprecise, 1 budget, 7 style. Each one was re-verified here before any
change. Checkers can be wrong too, so every correction was checked against a primary source, and
some were applied with adjusted wording, as noted below. Quotations from the ICP handbook come from
its text layer, read in full. The shared web-search budget ran out partway through, so all evidence
below comes from fetching known primary pages directly: the ICP handbook and web list, the Reptile
Database, Arteaga et al. 2024 (JATS XML), the iNaturalist API, the WHO fact sheet and the Palci et
al. 2020 abstract, with Wikipedia used only as a secondary check.

**Tally.** 22 fixed as raised (one of them, #19, duplicates #6). 1 fixed in part with its count
rejected (#15). 1 fixed in the manifest, with the figure-label half forwarded (#17). 1 confirmed and
forwarded to the snakes agent, because the file is not ours (#21). None rejected outright.

| # | Severity | Where | Resolution |
|---|---|---|---|
| 1 | error | intro ¶2, s. 3 | **Fixed** |
| 2 | imprecise | intro ¶2, s. 2 | **Fixed** (5 corals, 23 total) |
| 3 | imprecise | bocaracá body ¶1 | **Fixed** (reworded; lede adjusted) |
| 4 | imprecise | bocaracá body + Elevation | **Fixed** |
| 5 | imprecise | bocaracá Length | **Fixed** |
| 6 | imprecise | terciopelo body ¶2 (fangs) | **Fixed** |
| 7 | imprecise | terciopelo body ¶1 (elevation) | **Fixed** |
| 8 | budget | serpiente marina lede | **Fixed** |
| 9 | style | cascabel Field Notes | **Fixed** |
| 10 | style | béquer body ¶1 | **Fixed** |
| 11 | style | serpiente marina body ¶1 | **Fixed** (spelling *P. platurus*) |
| 12 | error | cascabel look-closer `keeled-scales` | **Fixed** (option b: `venom-gland`) |
| 13 | imprecise | intro ¶3 + pull quote | **Fixed** |
| 14 | imprecise | intro ¶3 (“harmless boa”) | **Fixed** |
| 15 | imprecise | intro ¶2 (“harmless”, “venomous”) | **Fixed in part**; count **rejected** |
| 16 | imprecise | béquer body ¶2 + `pelvic-spur` | **Fixed** |
| 17 | imprecise | terciopelo `venom-gland` | **Fixed** here; figure label **forwarded** |
| 18 | imprecise | béquer `ribs` | **Fixed** |
| 19 | imprecise | terciopelo body ¶2 (= #6) | **Fixed** (by #6) |
| 20 | imprecise | serpiente marina `yellow-venter` | **Fixed** |
| 21 | imprecise | matabuey figure label `eggs` | Confirmed; **forwarded** (snakes module) |
| 22 | style | note ¶1 + glossary *Antivenom* | **Fixed** |
| 23 | style | terciopelo body ¶2 (antivenom) | **Fixed** |
| 24 | style | glossary *Neurotoxin* | **Fixed** |
| 25 | style | cascabel `loreal-pit` | **Fixed** |

### Details

1. **Intro ¶2, sentence 3 (error).** *Was:* “No single place holds more than about 35 species, and no
   more than five or six dangerous ones.” *Now:* “No single place holds them all, and each region
   has its own short list of dangerous species to learn.” *Why:* the sentence paraphrased ICP 2019
   p. 27 (“el número total de serpientes no supera las 35 especies … no sobrepasan las cinco o seis
   especies”). But the iNaturalist API returns **53** research-grade snake species for place 135489,
   “La Selva Research Station (OTS), Costa Rica”, five of them dangerous (*B. nigroadspersus*,
   *B. asper*, *P. nasutum*, *M. alleni*, *M. mosquitensis*). The 35 ceiling is refuted. The 5–6
   figure roughly fits La Selva, but a rule whose first half fails should not be printed as a
   number. ICP’s advice to learn the dangerous species of your own region survives. *Sources:* ICP
   2019 p. 27;
   <https://api.inaturalist.org/v1/observations/species_counts?place_id=135489&taxon_id=85553&quality_grade=research>
   and <https://api.inaturalist.org/v1/places/135489> (queried 1 Nov 2026).

2. **Intro ¶2, sentence 2.** *Was:* “… seven elapids — six coral snakes and one sea snake.” *Now:*
   “… six elapids — five coral snakes and one sea snake” (17 + 5 + 1 = 23, still “about two dozen”).
   *Why:* ICP’s current species list names five *Micrurus* (*alleni*, *clarki*, *mipartitus*,
   *mosquitensis*, *nigrocinctus*) and says that of 140 species “only 23 species are considered
   venomous”. The Reptile Database reaches six only by listing both *M. mipartitus* and
   *M. multifasciatus*, and its own *M. mipartitus* account says that “older records of mipartitus
   from Nicaragua and Costa Rica represent most likely multifasciatus”. ICP 2019 p. 34 says “seis
   especies” without naming them. *Sources:*
   <https://icp.ucr.ac.cr/en/information-and-materials/venomous-snakes-costa-rica>;
   <https://reptile-database.reptarium.cz/species?genus=Micrurus&species=mipartitus>; ICP 2019
   pp. 26, 34.

3. **Bocaracá body ¶1, last sentence.** *Was:* “Costa Rica’s are now *Bothriechis nigroadspersus*,
   long filed under *B. schlegelii*.” *Now:* “Costa Rica’s bocaracá is now *Bothriechis
   nigroadspersus*, long filed under *B. schlegelii*, while a close relative, *B. supraciliaris*,
   lives on the Pacific slope of the Talamanca range.” *Why:* confirmed. *B. supraciliaris* (Taylor,
   1954) occurs in Costa Rica and Panama (type locality: mountains near San Isidro del General),
   and Arteaga et al. (2024: 27) keep it as a valid species, along the Pacific slopes of the
   Cordillera de Talamanca at 734–1,506 m. ICP 2019 p. 44 groups it with *B. schlegelii* as the
   *tobobas de pestaña*. “Talamanca range” replaces the checker’s “southern Pacific foothills”
   because the species reaches 1,506 m. **Consequential edit:** the lede no longer calls the snake
   “Costa Rica’s eyelash viper”; it now reads “the bocaracá”. *Sources:*
   <https://reptile-database.reptarium.cz/species?genus=Bothriechis&species=supraciliaris>;
   <https://doi.org/10.3897/evolsyst.8.114527>.

4. **Bocaracá elevation (body and Field Notes).** *Was:* “sea level to about 1,500 m”. *Now:* body
   “from sea level to about 1,430 m”; Field Notes “Sea level to about 1,430 m”. *Why:* Arteaga et
   al. 2024 say *B. nigroadspersus* “has been recorded at elevations 0–1,434 m above sea level”.
   ICP’s 1,500 m belongs to the broad *B. schlegelii*, and its ceiling likely reflects
   *B. supraciliaris*. *Source:* Arteaga et al. 2024, species account.

5. **Bocaracá Field Notes, Length.** *Was:* “to 95 cm”. *Now:* “Usually 50–70 cm; to 92 cm”.
   *Why:* the revision’s species data give a “maximum total length in males 626 mm, in females
   916 mm” (Reptile Database diagnosis; Arteaga et al. 2024 Table 2). ICP 2019 p. 44 gives “alcanzan
   los 90 cm”.

6. **Terciopelo fangs, body ¶2.** *Was:* “the longest of any Costa Rican snake”. *Now:* “among the
   longest of any Costa Rican snake”. *Why:* ICP 2019 p. 20 says only that “Los colmillos más largos
   son los de las víboras o tobobas, especialmente el de la terciopelo”, with no measurements and no
   comparison with the larger matabuey. No morphometric comparison was found, so the superlative is
   hedged (open question 12).

7. **Terciopelo elevation, body ¶1.** *Was:* “abundant in the wet lowlands of both slopes up to
   about 1,500 m, and thrives …”. *Now:* “abundant in the wet lowlands of both slopes and ranges up
   to about 1,500 m; it thrives …”. A semicolon avoids a second “and”. *Why:* ICP web says it “can
   be found in abundance in low and wet lands in the Pacific and Caribbean” and that “the species
   can be found even at 1500 m of altitude”, so 1,500 m is a record, not the limit of abundance.
   The Field Notes maximum (“Sea level to 1,500 m”) is kept. *Source:*
   <https://icp.ucr.ac.cr/en/information-and-materials/venomous-snakes-costa-rica/bothrops-asper>.

8. **Serpiente marina lede (budget).** *Was:* “The only sea snake on the shores of the Americas
   lives its whole life adrift in the Pacific — and must wait for rain to drink.” *Now:* “The only
   sea snake to reach the Americas spends its whole life adrift in the Pacific — and must wait for
   rain to drink.” *Why:* confirmed as a real error. `node scripts/validate-books.mjs serpientes`
   reported “lede 26 words > 25”, because the validator counts the spaced em dash. The new lede is
   24 tokens. ICP 2019 p. 33: “El único elápido marino que llega a las costas de América”.

9. **Cascabel synonym.** *Now:* a sixth Field Notes row, “Formerly — *Crotalus durissus*”. *Why:*
   the Reptile Database lists *Crotalus durissus* Linnaeus 1758 (part.), *C. durissus durissus*
   Klauber 1952 and Campbell & Lamar 2004, and *C. durissus* Campbell 1998. Its comment notes that
   Reyes-Velasco et al. 2022 “considered simus as a synonym of C. durissus”. *Source:*
   <https://reptile-database.reptarium.cz/species?genus=Crotalus&species=simus>.

10. **Béquer synonym.** *Now:* “The béquer, long treated as a subspecies, *Boa constrictor
    imperator*, is heavy and muscular …”. The heading already prints *Boa imperator*, so the
    binomial is not repeated as the checker suggested. *Why:* the original combination is *Boa
    constrictor imperator* Daudin 1803, used through Binder & Lamp 2007 (Reptile Database).

11. **Serpiente marina synonym.** *Now:* “… the serpiente marina (long known as *Pelamis platurus*)
    is Costa Rica’s only sea snake …”. *Why:* the Reptile Database synonymy is dominated by
    *Pelamis platurus* (Smith 1943 to Milto & Lukin 2020). *P. platura* (Böhme 2003; Wallach et al.
    2014) is also attested, but the more frequent spelling is used instead of the checker’s.

12. **Cascabel look-closer `keeled-scales` (error).** *Confirmed:* the live figure for
    `crotalus-simus` creates eye, tongue, loreal-pit, fangs, venom-gland, rattle, rattle-button,
    cloaca, vertebrae and ribs (`lab.info().labels`), and no `keeled-scales`. *Fixed with option
    (b):* `{ label: 'venom-gland', text: 'Switch on the venom layer: the gland lies behind and below
    each eye. Newborns make mostly nerve toxin; adults, mostly tissue toxin.' }`. The figure files
    this label under the venom layer, which is off by default; hence the instruction, which follows
    the matabuey’s “Switch on the eggs layer”. Option (a) would mean editing the snakes module,
    which is not ours. *Sources:* ICP 2019 p. 42; Calvete et al. 2010. All 26 look-closer ids were
    then checked against the live figures, and all resolve (§8).

13. **Intro ¶3 and pull quote, loreal pit.** *Now:* ¶3 adds “— but coral snakes and the sea snake
    have none, so a missing pit proves nothing”. The pull quote reads “The one sure sign of a viper
    is the loreal pit — but coral snakes have none.” *Why:* the elapids are proteroglyphs with no
    loreal pit (ICP 2019 pp. 33–36), and ICP calls the pit the determining feature of vipers only
    (pp. 41–42, Cuadro 2). The intro is now 256 words (≤ 260), and the intro page still sets at
    100 %.

14. **Intro ¶3, “the harmless boa”.** *Now:* “the non-venomous boa”. *Why:* ICP 2019 p. 41 calls it
    “la boa, que no es venenosa”, and p. 29 warns that boas “por su tamaño y tendencia a morder deben
    considerarse de cuidado”.

15. **Intro ¶2, “harmless” and “venomous”.** **Fixed in part:** “Most of them are harmless to
    people. Only about two dozen are dangerously venomous …”. ICP 2019 p. 31 says rear-fanged
    colubrids have venom glands and count as “no venenosas” only “para efectos prácticos”.
    **Rejected:** this checker’s count of “seven elapids — six coral snakes”, for the reasons in #2.
    ICP’s current list has five corals, and the sixth is the gargantilla counted twice.

16. **Béquer pelvic spurs.** *Was:* “all that remain of hind legs” / “the claw-like tip of a
    vanished hind leg”. *Now:* the body reads “two claw-like spurs are the visible tips of vestigial
    hind legs, whose tiny thigh and hip bones lie hidden in the muscle; males, whose spurs are
    larger, use them in courtship”. The look-closer reads “Beside the vent: a pelvic spur, the
    claw-capped tip of a vestigial hind leg; a tiny thigh bone and hip bone lie in the muscle
    beneath.” *Why:* Palci et al. 2020 (abstract) say basal alethinophidians share “a distinctive
    configuration of cloacal spur (claw), femur and a sizeable pubis”. This is the paper the checker
    cited as “Palci & Hutchinson 2019”; the correct reference is Palci, Hutchinson, Caldwell, Smith
    & Lee 2020, *Zool. J. Linn. Soc.* 188: 630–652. Wikipedia *Pelvic spur*: spurs are “made up of
    the remnants of the femur bone, which is then covered by a corneal spur”.

17. **Terciopelo look-closer `venom-gland`.** *Now:* “Behind and below the eye lies the venom
    gland; the muscle that squeezes it helps give the head its triangular shape.” *Why:* ICP 2019
    p. 42 says the glands are “situadas detrás y hacia abajo de los ojos”, and p. 43 says the
    compressor muscle “ayuda a darle esa forma triangular a la cabeza”. **Forwarded:** the snakes
    module’s label detail (“A modified salivary gland behind the eye”,
    `src/subjects/snakes/index.js`) belongs to the snakes agent. Suggested wording: “… behind and
    below the eye”.

18. **Béquer look-closer `ribs`.** *Now:* “A pair of ribs rides on every trunk vertebra — the tail
    has none; a boa can breathe with one section while another squeezes.” *Why:* Wikipedia *Snake*
    says tail vertebrae are “often less than 20% of the total” and “lack ribs”. The note now matches
    the figure’s own `ribs` label on the same spread.

19. **Terciopelo fangs (duplicate of #6).** Fixed by the #6 edit.

20. **Serpiente marina look-closer `yellow-venter`.** *Was:* “The yellow belly and flanks name the
    species …”. *Now:* “The yellow belly and flanks give it its English name; in Golfo Dulce it is
    yellow almost all over.” The English name is already printed in the plate heading. The note was
    shortened from the checker’s wording to keep it to three lines. *Why:* ICP 2019 p. 33:
    “*Hydrophis platura* literalmente significa ‘serpiente de agua de cola aplanada’”, so the
    binomial does not describe colour.

21. **Matabuey figure label `eggs` (snakes module).** **Confirmed, not ours to edit; forwarded.**
    Wikipedia *Lachesis* (genus), citing Campbell & Lamar 2004: *Lachesis* is “thought to be unique
    among New World pit vipers by laying eggs … although some evidence suggests that the species
    *Bothrocophias colombianus* found in Colombia may do the same”. The plate’s own text was already
    hedged: the did-you-know says “probably”, and the look-closer limits the claim to Costa Rica
    (“among Costa Rica’s vipers only the two bushmasters lay eggs”), which is correct. Suggested
    label detail: “Probably the only egg-laying pitvipers of the Americas; the female may stay
    coiled with her clutch.”

22. **Antivenom wording (note ¶1 and glossary).** *Now:* “Antivenom is the specific and most
    effective treatment, given intravenously by medical staff — never in the field.” The glossary
    now ends “the specific, most effective treatment for envenoming”. *Why:* the WHO fact sheet
    (17 Sept 2026) says antivenoms “are the most effective treatment to prevent or reverse most of
    the venomous effects of snakebites”. ICP 2019 p. 60 says “el único tratamiento efectivo”. The
    new wording satisfies both and CONTRACTS §14, and leaves room for supportive care.

23. **“Costa Rica’s antivenom” (terciopelo body ¶2).** *Now:* “Costa Rica’s polyvalent antivenom
    …”. *Why:* ICP makes a polyvalent anti-viper serum (immunising mix *C. simus*, *L. stenophrys*,
    *B. asper*) and an anticoral serum (*M. nigrocinctus*), as well as several antivenoms for other
    regions (ICP 2019 pp. 61, 64).

24. **Glossary *Neurotoxin*.** *Now:* “A toxin that acts on the nervous system; those of coral
    snakes, the sea snake and young cascabeles block the signals from nerves to muscles, causing
    paralysis.” *Why:* ICP 2019 p. 36: corals, like the sea snake, have fixed fangs and “potentes
    neurotoxinas que afectan el sistema nervioso a nivel de la unión neuromuscular”. Calvete et al.
    2010: crotoxin dominates the venom of newborn *C. simus*.

25. **Cascabel look-closer `loreal-pit`.** *Now:* “Like every Costa Rican viper it has a pair of
    loreal pits — two of the ‘four nostrils’ of the tobobas.” *Why:* ICP 2019 p. 42, Cuadro 2 note:
    “cuatro orificios (2 narinas, 2 fosetas loreales)”.

**Also changed while resolving these** (same sources): the bocaracá lede (#3); the glossary entry
*Elapidae* now says “coral snakes and the sea snake here”, since Costa Rica has one sea snake (#2);
and the manifest’s header comment now points to this log and to the live-label check.

**After the revision:** `node scripts/validate-books.mjs serpientes` passes with 0 errors and 0
warnings. All 26 sides set at 100 % with no overflow in `typeset.html?book=serpientes`. All 26
look-closer ids resolve to live figure labels. The revised pages render on the 3D book under both
WebGPU and WebGL 2 (`.scratch/serpientes-rev-*.png`).

---

## 10. Visual review log

The visual review of the built book (1 November 2026) raised three content findings for this
manifest. Each was reproduced in the reader before any change (screenshots in
`.scratch/review/fix-content-serpientes/before-*.png`), traced to its cause in the figure code, and
fixed in `src/books/serpientes.js` only — the figures were not changed.

| # | Finding | Cause | Resolution |
|---|---|---|---|
| 1 | Plate V caption and beats describe things the figure does not show | Text written for a different pose: the head lies on the paper outside the coil, there is no leaf litter, the eggs layer is on by default, and `ambush()` flicks the tongue at 0.9–1.5 s and 4.0–4.5 s | **Fixed**: caption, four beats, `eggs` look-closer |
| 2 | Plates IV and II narrate motions the loop never performs | `rattle()` holds the raised tail and the rattle blur (`out.shake = 1`) for the whole loop; `branch()` has only a continuous head sway | **Fixed**: three beats reworded |
| 3 | Seven works cited on plates are missing from Sources | The plate source lines grew during the fact-check; `back.sources` did not | **Fixed**: 18 entries (19 works); budget raise **forwarded** (open question 14) |

### Details

1. **Plate V (matabuey).** *Caption was:* “Matabuey in its ambush coil, head resting on the body,
   waiting.” *Now:* “Matabuey coiled around her clutch, head turned outward.” *Beats were:* [0]
   “Coiled in the leaf litter, the matabuey waits, motionless.” [1.2] “Only slow breathing stirs
   the coils.” [2.1] (unchanged) [3.8] “Stillness returns.” *Now:* [0] “Coiled around her clutch,
   the matabuey waits, motionless.” [0.9] “Her tongue samples the air; slow breathing stirs the
   coils.” [2.1] “Disturbed, the tail tip quivers — a warning many vipers share.” [3.8] “The tail
   falls still; the tongue flicks once more.” *Look-closer `eggs` was:* “Switch on the eggs layer
   — …” (the layer is already on); *now:* “Her clutch — among Costa Rica’s vipers, only the two
   bushmasters lay eggs.” *Why:* `lab.info()` lists the eggs layer as visible, hint “The clutch the
   female coils around”; the top view shows the neck crossing the outer coil and the head on the
   paper; `ambush()` puts the tongue out at 0.9–1.5 s and 4.0–4.5 s and the tail vibration at
   2.1–3.5 s. The second beat now starts at 0.9 s so that “motionless” is true for its whole
   span. The caption does not call the brooding coil an ambush (see §3 Plate V and open
   question 15). The finding’s alternative — re-posing the head and moving the tongue bouts in
   `poses.js` — belongs to the snakes module and was not needed.

2. **Plates IV and II.** Cascabel *was:* [0] “Disturbed, the cascabel gathers into a defensive
   coil, head and neck raised.” [0.6] “The tail lifts and the rattle blurs as its segments knock
   together.” *Now:* [0] “In its defensive coil, head and neck raised, the cascabel faces the
   intruder.” [0.6] “The raised rattle blurs as its segments knock together.” Bocaracá [3.6]
   *was:* “The forebody settles back into its ambush loop.” *Now:* “Still anchored by its tail, it
   waits for prey to come within reach.” *Why:* the frames at t = 0 and 0.6 s (cascabel) and at
   t = 0 and 3.75 s (bocaracá) show the same body; only the head sways and the tongue flicks. The
   other plates’ beats were re-checked against their poses (strike, slither, swim, constrict)
   and already match.

3. **Sources.** Added full entries for Sasa, Wasko & Lamar 2009 (plate I); Solano 1988 and
   Chandler 2019, The Orianne Society (plate III, whose source line now reads “Chandler 2019
   (Orianne Society)”); Allf et al. 2016 (plate IV); Brischoux & Lillywhite 2011 (plate VI);
   Boback et al. 2012, sharing an entry with Boback et al. 2015, and Capano et al. 2022 (plate
   VII). Authors, titles, volumes and pages were checked against Crossref and, for Solano, the UCR
   journal archive (which gives a single author, Alejandro Solano); the abstracts of Sasa et al.
   2009, Allf et al. 2016, Boback et al. 2012 and Capano et al. 2022 were read on PubMed, so those
   claims no longer rest on secondary sources (§3). While setting the page, the Calvete et al.
   entry gained its full title (it had been cut after “complex” with no ellipsis), Savage 2002 lost
   its subtitle, the Reptile Database editors follow the three-plus-“et al.” rule, and journal names
   use ISO 4 abbreviations with no-break spaces. Twelve entries would no longer hold every work the
   plates cite, so the list exceeds the §6 budget; the page itself fits (18 entries at a 90 %
   auto-fit, no overflow).

**After the review fixes:** `node scripts/validate-books.mjs serpientes` — 0 errors, 1 warning (the
sources budget, open question 14). Every short citation on a plate resolves to a full entry (checked
by script: surname + year). All 26 sides set without overflow — Sources at 90 %, every other side at
100 % — at page widths 1024–2048. `node scripts/audit.mjs serpientes`: 7/7 figures pass (no figure
changed). The reader shows the new beats over the matching frames at t = 0, 1.2, 2.8 and 4.2 s
(plate V), 0 and 0.6 s (plate IV) and 3.75 s (plate II) on WebGPU at 1600 × 1000, and again at
1.2 and 4.2 s (V), 0.6 s (IV) and 3.75 s (II) on WebGL 2; the longest new beat wraps to two lines
on a 390 × 844 phone, like the existing longer beats (`.scratch/review/fix-content-serpientes/after-*.png`).

### Re-verification round — the how-to page

| # | Finding | Cause | Resolution |
|---|---|---|---|
| 4 | “How to use this book” no longer describes navigation on an upright screen | The Reader now frames one page when the screen is upright (camera aspect < 0.9): a tap anywhere on that page reads on, and ← → step one page. The rows still said “back on the left” and “Previous or next spread” | **Fixed**: two how-to rows reworded |

4. **How to use this book (p. 5, also in the Read sheet).** *Was:* “Click, tap or swipe — Turn
   forward on the right-hand page, back on the left” and “← → arrow keys — Previous or next
   spread”. *Now:* “… back on the left; when one page fills the screen, a tap reads on” and
   “Previous or next page”, the wording the toolbar and the shortcut card use for ← and →. *Why:*
   at 390 × 844 the reader frames the introduction, a left-hand page, and a tap on it read on (3
   left → 3 right → 4 right); ← and → stepped one page. The rule is named by what the reader sees,
   not by the device. A 768 × 1024 tablet held upright also frames one page, and a tap reads on.
   An 844 × 390 landscape phone shows the spread, and a tap on the left page goes back (3 → 2).
   “On a phone” would have been wrong in both cases. A no-break space keeps “the screen” together
   so the line does not end on an article. The icons, which `iconFor` picks from the wording, are
   unchanged (swipe, keys).

**After this fix:** `node scripts/validate-books.mjs` — 0 errors, 0 warnings for all three books
(the sources budget is now 5–20, open question 14). All 26 sides set without overflow at widths
1024–2048; the how-to side stays at 100 % with the reworded row on two lines, and Sources stays at
90 %. On a private build of the current tree, on WebGPU and WebGL 2, the framed how-to page and the
Read sheet show the new rows at 390 × 844, the 1600 × 1000 spread sets them, and there are no
console errors (`.scratch/repair-content-serpientes/`). No figure changed.

---

## 11. Bilingual edition log

The request that made the books bilingual (1 November 2026) also asked for the author on both
covers, for snake faces with real eyes and detail, and for a béquer whose skin and prey are
accurate (“the prey doesn’t looks like a rat”). The figure work belongs to the snakes module; this
log covers the English manifest, which the Spanish edition (`src/books/es/serpientes.js`) mirrors
key for key. Every English change is also listed, old → new, in
`.scratch/bilingual/en-changes.md` for the Spanish sync.

| # | Change | Why | Resolution |
|---|---|---|---|
| 1 | Author on the boards | The user asked for the author on the front and back covers | `byline: { name: 'Josoroma', mark: 'josoroma' }` (foil-stamped mark); `author` stays the imprint string, so nothing that prints it changes |
| 2 | Plate VII prey | The figure now models an adult black rat at real scale in two loops; the text called it “a prey silhouette” | Caption, beats 0 and 0.7 s, plate sources and Sources entry 18 (VII-15, VII-16) |
| 3 | Plate VII look-closer `eye-stripe` | The research spec proposed “rust-brown in front, black behind” if the new head painting showed it | **Kept** as it was: the figure paints the stretch in front of the eye dark brown (VII-17; open question 17) |
| 4 | Look-closer names on plates V and VI | The printed row named the label id (“Tail spine”, “Yellow venter”) while the figure’s pill says “Spiny tail tip” and “Yellow belly” | `name` set to the pill’s words, so page and figure agree |
| 5 | Colophon | Four of its six lines repeated the imprint page (title and edition, the imprint, the engine, the typefaces), and 9-1-1 is on the facing note; the Sources page was at the 90 % floor | Trimmed to two lines; Sources at 95 % with 19 entries |
| 6 | Look-closer names on plates I, III, IV and VI (2 November) | Four rows printed other words than the pill they focus (“Fangs” → pill “Hinged fangs”, “Fixed fangs” → “Fixed front fangs”, “Rattle button” → “Button”, “Tongue” → “Forked tongue”); the Spanish edition prints its pill’s words on every row | `name` set to the pill’s words; `nostril` kept until its pill is settled |

### Details

2. **Plate VII, the black rat.** *Caption was:* “Fig. 7 — Béquer tightening its coils around a
   prey silhouette.” *Now:* “Fig. 7 — Béquer tightening its coils around a black rat.” *Beats
   were:* [0] “The coils settle around the prey.” [0.7] “They tighten, pressing on the prey’s chest
   and blood vessels.” *Now:* [0] “The coils settle around the rat’s chest.” [0.7] “They tighten,
   pressing on the rat’s chest and blood vessels.” Beats 1.8 and 2.8 s are unchanged and still
   true of the loop (`poses.js` `constrict()`: loose to 0.6 s, tightening to 1.5 s, held to 2.7 s,
   released by 3.8 s). *Plate sources* gained “Aguilar-López & Tapia-Ramírez 2025”; *Sources*
   gained its full entry (18). *Why:* the research spec for the figure proposed “the rat’s heart
   and blood vessels” for beat 0.7; its adversarial review rejected it (Boback et al. 2015
   measured circulatory arrest, not compression of the heart), so “chest” stays. The lede, body,
   facts and did-you-know were re-read and stay: they say “prey” where they report the laboratory
   trials, which used Wistar rats (VII-6), and the body already lists rats in the diet (VII-5).
   Nothing printed says that the boas in those trials killed black rats, nor that a black rat was
   recorded as béquer prey in Costa Rica (open question 16).
3. **Plate VII, `eye-stripe`.** Unchanged: “A dark stripe runs from the snout back through each
   eye.” The reworded row was tried and withdrawn the same evening, once the head painting
   (`face.js` case `'boa'`) showed a dark-brown stretch in front of the eye
   (`crownStripe #4a3426`) and black behind (`stripe #211915`). “Dark” is true of the figure, of
   its label detail and of the animal (VII-17).
4. **Plates V and VI, look-closer names.** `tail-spine` now prints “Spiny tail tip” (it printed
   “Tail spine”) and `yellow-venter` prints “Yellow belly” (it printed “Yellow venter”). Both are
   the figure’s own label texts, so no figure changes. *Why:* the look-closer row is a button that
   points at a label in the figure; the two must use the same words. “Spiny tail tip” is also the
   more exact description: rows of small spiny scales end in the terminal spine (the figure’s
   label detail). The other rows already agree, or print a shorter form of the same term (“Fangs”
   for the pill “Hinged fangs”, “Rattle button” for “Button”), and stay. *(Revised on 2 November:
   see 6.)*
5. **Colophon.** *Was* six lines: the title and edition; “Lámina Natural History Press is the
   imprint of the Lámina project; its text and plates are original works.”; the rendering engine
   (Three.js WebGPU, TSL, WGSL/GLSL); the typefaces; “Taxonomy follows The Reptile Database;
   conservation status follows the IUCN Red List.”; “No snakes were handled in the making of this
   book. In an emergency in Costa Rica, call 9-1-1.” *Now* two: “Taxonomy follows The Reptile
   Database; conservation status follows the IUCN Red List.” and “No snakes were handled in the
   making of this book.” *Why:* the imprint page prints the title, edition, imprint, typefaces and
   engine from the manifest and theme; the facing note gives 9-1-1. Measured in the typesetter on
   the same build, before → after: Sources 90 % → 95 % at page widths 1024 and 2048, with the new
   19th entry; every other side unchanged.
6. **Plates I, III, IV and VI, look-closer names (2 November).** `fangs` now prints “Hinged
   fangs” (it printed “Fangs”), `fixed-fangs` “Fixed front fangs” (“Fixed fangs”),
   `rattle-button` “Button” (“Rattle button”) and the sea snake’s `tongue` “Forked tongue”
   (“Tongue”). Each is its pill’s text, so no figure changes. *Why:* tapping a row focuses its
   pill, and the two should name the part in the same words, as every row of the Spanish edition
   does (each Spanish run-in is its pill’s Spanish, lead decision L1). For the button the row takes
   the pill’s word rather than the reverse: the Spanish pill is «Botón» because «Botón del
   cascabel» is wider than a pill may be (117 px; the limit is 110), so “Button” keeps the two
   editions parallel, and the row’s text still says “the button, the rattle’s oldest segment”.
   *Kept:* `nostril` still prints “Nostril”. Its pill says “Valved nostrils” (detail: “closed by
   valves when the snake dives”), the claim this plate leaves out because sources disagree for this
   species (plate VI table; open question 9), and the Spanish pill, «Narina», leaves it out too.
   Printing the pill’s words would put that claim on the page, so the row waits until the pill (in
   the snakes module) is settled. The rows’ texts are unchanged. Each name sets on one line at full
   size (the widest, “Fixed front fangs”, takes 221 of 355 design px), and plates I, III, IV and VI
   still set at 100 %, typeset with and without the names on the same build.

**After this revision:** `node scripts/validate-books.mjs` — 0 errors, 0 warnings for all three
books. Every side sets without overflow; plates V–VII stay at 100 %. In the reader (private build,
WebGPU at 1600 × 1000 and WebGL 2 at 390 × 844) plate VII shows the new caption and beats, with no
console errors.

**After revision 6:** `node scripts/validate-books.mjs --lang all --fit` — 0 errors, and 0
warnings for this book in both languages; both editions keep the same pages and scales. In the
reader (private build; WebGPU and WebGL 2; 1600 × 1000 and 390 × 844; English and Spanish) the
four rows print their new names on the page and in the Read sheet, each focuses the pill with the
same words, and there are no console errors.
