# Flores — research dossier

> Source notes behind `src/books/flores.js` ("Flores — A Living Herbarium of Costa Rica",
> Lámina · Volume II). Every factual statement in the manifest is traceable to an entry below.
> Research and verification: 1 November 2026, revised the same day for the bilingual edition
> (see the last section). Plate order, figure params and label ids follow
> `docs/architecture/CONTRACTS.md` §6 and §12 II.

## Method and policies

- **Names and authorities** were checked against the International Plant Names Index (IPNI)
  and the GBIF backbone. Plants of the World Online (POWO) and Kew's profile pages sit
  behind a bot challenge; their data were read through Kew-powered mirrors (ColPlanta) or
  search snippets, and nothing relies on POWO alone.
- **Accepted names (added at fact-check).** All six names were confirmed against the World Checklist
  of Vascular Plants (WCVP, the POWO backbone) through its GBIF mirror (dataset
  `f382f0ce-323a-4091-bb9f-add557f3a9a2`, queried 1 Nov 2026): each is ACCEPTED with exactly the
  authority the manifest prints (e.g. GBIF species 207323101, *Nymphaea ampla* (Salisb.) DC.). IPNI is a
  nomenclator and records *N. ampla* simply as "DC." (https://www.ipni.org/n/605494-1), so the imprint now
  credits WCVP for accepted names and IPNI for authorities and places of publication. The one year that
  differs between them, *Heliconia wagneriana* (WCVP 1896, IPNI 1890), keeps IPNI's 1890.
- **Authority format.** The manifest gives the botanical author citation followed by the year
  the *accepted* name was published (e.g. `(Bateman) Dressler & W.E.Higgins, 2003`). The
  basionym and its year are listed below for each plate.
- **Conservation `status`.** The typesetter draws `status` as an IUCN-coloured chip and
  builds an IUCN legend from the codes (`src/engine/typeset/blocks.js`, `sides.js`). To keep that
  chip truthful, `status` carries **global IUCN Red List assessments only**. GBIF mirrors the IUCN
  Red List checklist (dataset `19491596-35ae-4a91-9a98-85cf505f1bd3`, published 2026-07-28).
  Results:

  | Species | IUCN Red List | Other assessments (not used in `status`) |
  |---|---|---|
  | *Guarianthe skinneri* | Not Evaluated | Mexico NOM-059-SEMARNAT-2010: threatened (national, Mexico) |
  | *Heliconia wagneriana* | Not Evaluated | — |
  | *Passiflora vitifolia* | Not Evaluated | Museo Nacional de Costa Rica (2020): "Preocupación menor (LC)", local status |
  | *Palicourea elata* | **LC**, Condit 2019 | — |
  | *Handroanthus ochraceus* | **LC**, Barstow 2023 | — |
  | *Nymphaea ampla* | Not Evaluated | NatureServe global rank G5 (Secure) |

  - Condit, R. 2019. *Palicourea elata*. IUCN Red List 2019: https://doi.org/10.2305/IUCN.UK.2019-3.RLTS.T151954886A151954888.en
    (via https://api.gbif.org/v1/species/176793127/distributions)
  - Barstow, M. 2023. *Handroanthus ochraceus*. IUCN Red List 2023: https://doi.org/10.2305/IUCN.UK.2023-1.RLTS.T145674139A145674143.en
    (via https://api.gbif.org/v1/species/258105349/distributions)
  - NE results: GBIF `species/{key}/iucnRedListCategory` for keys 2816082, 2760619, 2874186, 2882432.
  - NatureServe Explorer API, *Nymphaea ampla* (ELEMENT_GLOBAL.2.150154): rounded G-rank G5.
  - Museo Nacional de Costa Rica (2020). Catálogo de especies del género *Passiflora* en Costa Rica:
    https://www.museocostarica.go.cr/wp-content/uploads/passiflora/diversidad/catalogo-passifloras-cr.pdf

- **Text budgets** (§6) were counted with a script after writing (see the end of this file).

---

## Book-level facts (intro essay, back matter)

| Claim | Source |
|---|---|
| The *Manual de Plantas de Costa Rica* (MBG + Museo Nacional + INBio) began in the mid-1980s (base set in 1987) and was completed with its 8th volume at the end of 2020. | Jiménez Madrigal, Q. 2022. *Rev. Ciencias Ambientales* 56(1): 268–283. https://doi.org/10.15359/rca.56-1.14 |
| It describes more than 9,000 seed-plant species in 237 families; with ferns, Costa Rica has more than 11,000 **species** of vascular plants (the intro now says "species of vascular plants", not "vascular plants"). | Same (abstract: "más de 9 000 especies … aunque hoy ya son más de 11 000 especies si incluimos … los helechos"). |
| Costa Rica has 1,684 orchid species (201 genera), about 30% endemic. | Pupulin, F., Bogarín, D. & Karremans, A. P. 2023. The Lankester Catalogue of Costa Rican Orchidaceae. *Lankesteriana* 23 (Suppl.): 1–254. https://doi.org/10.15517/lank.v23iSupplement.58145 |
| A year later the count was 1,695 species + 9 forms: "The orchid flora of Costa Rica now includes 1695 species and nine forms." The intro therefore says "nearly 1,700 species", which holds for both counts. (The Tico Times, 2026, says "about 1,500 to nearly 1,700".) | Belfort-Oconitrillo, N. et al. 2024. New species and records of Orchidaceae from Costa Rica. IV. *Lankesteriana* 24(2): 141–192. https://doi.org/10.15517/lank.v24i2.60686 ; https://ticotimes.net/2026/09/21/costa-ricas-two-century-fight-to-keep-its-orchids |
| Every orchid species is listed by CITES: Orchidaceae spp. in Appendix II except the species in Appendix I. Appendix I is a small minority, chiefly tropical slipper orchids (*Paphiopedilum* spp., *Phragmipedium* spp., *Mexipedium*) plus a handful of other species; temperate *Cypripedium* slipper orchids stay in Appendix II, so the note says "chiefly slipper orchids **such as** Costa Rica's *Phragmipedium*". *Phragmipedium longifolium* has 184 Costa Rican records in GBIF. Appendix II trade needs permits; Appendix I bars commercial trade in wild-collected plants. cites.org returned HTTP 403 at fact-check time. | Hinsley, A. et al. 2018. A review of the trade in orchids and its implications for conservation. *Bot. J. Linn. Soc.* 186(4): 435–455. https://doi.org/10.1093/botlinnean/box083 ; EUNIS species pages (EEA), e.g. https://eunis.eea.europa.eu/species/189898 ; GBIF occurrence search, country=CR, genus *Phragmipedium* |
| Costa Rica signed CITES on 3 March 1973, approved it domestically by Law No. 5605 of 30 October 1974, deposited ratification on 30 June 1975, and has been a Party since entry into force on **28 September 1975** → manifest says "a party to CITES since 1975". SINAC is the CITES **Management Authority** (Spanish *Autoridad Administrativa*; considerando VII, under Ley 7317 Art. 71). For species of fisheries or aquaculture interest, the Ministry of Agriculture (MAG) is the Management Authority and INCOPESCA the Scientific Authority (Arts. 1–3) → manifest: "its CITES Management Authority for plants". | CITES list of Parties (e.g. https://cites.unia.es/file.php/5/Resources/List-parties.pdf ; https://www.animallaw.info/treaty/cites-party-states); Decreto Ejecutivo N° 40379-MINAE-MAG (considerandos V–XVII, Arts. 1–3): https://faolex.fao.org/docs/pdf/cos176261.pdf |
| Ley 7317 (Ley de Conservación de la Vida Silvestre, 1992) requires a licence/permit to extract or collect wild flora (Art. 52 in the 1995 consolidated text; Art. 36 cited in current reporting); export of native flora needs permits, and CITES permits for listed species. | Ley 7317 text: https://www.acto.go.cr/wp-content/uploads/2020/04/ley_conser_vida_silv.pdf ; Teletica (13 Dec 2024): https://www.teletica.com/nacional/detienen-a-extranjero-recolectando-insectos-para-exhibirlos-en-museo-de-alemania_374989 ; OTS permit guide: https://tropicalstudies.org/wp-content/uploads/2018/12/Courses-Are-you-conducting-research.pdf |
| Ley 6084 (Ley del Servicio de Parques Nacionales, 1977), Art. 8(1): visitors may not fell trees or extract plants in national parks. | https://da.go.cr/wp-content/uploads/2016/06/Ley-del-Servicio-de-Parques-Nacionales-N%c2%ba-6084.pdf ; https://faolex.fao.org/docs/pdf/cos82453.pdf |
| Water lilies (Nymphaeales) belong to the ANA grade, the earliest-diverging lineages of living angiosperms, sister to all other flowering plants after *Amborella*. | APG IV 2016. *Bot. J. Linn. Soc.* 181(1): 1–20. https://doi.org/10.1111/boj.12385 |

---

## Plate I — Guaria morada · *Guarianthe skinneri*

**Taxonomy**
- Accepted: *Guarianthe skinneri* (Bateman) Dressler & W.E.Higgins, *Lankesteriana* 7: 38 (16 May 2003). https://www.ipni.org/n/1119685-2
- Basionym: *Cattleya skinneri* Bateman, *Orchid. Mexico Guatemala* t. 13 (1838). https://www.ipni.org/n/327463-2
  (Epidendra and Wikipedia give 1839; IPNI and Ames & Correll give 1838 → 1838 used in notes.)
- Genus *Guarianthe* Dressler & W.E.Higgins (2003), type *G. skinneri*; name = Costa Rican *guaria* + Greek *anthos*, flower.
  Dressler, R. L. & Higgins, W. E. 2003. *Guarianthe*, a generic name for the "*Cattleya*" *skinneri* complex. *Lankesteriana* 7: 37–38.
  Etymology: Epidendra (Jardín Botánico Lankester, UCR) https://www.epidendra.com/taxones/Guarianthe/Guarianthe%20skinneri/index.html
- Family Orchidaceae (Epidendroideae, Epidendreae, Laeliinae); order Asparagales.

**Names.** Guaria morada (CR); Candelaria (Guatemala); Flor de San Sebastián (Ames & Correll 1952). English "Easter orchid", "Skinner's Guarianthe" (Smithsonian Gardens: https://si.gardenexplorer.org/taxon-24852.aspx).

**Morphology** — Ames, O. & Correll, D. S. 1953. *Orchids of Guatemala*. Fieldiana: Botany 26(2): 412–413 (published 25 Sept 1953). https://archive.org/details/orchidsofguatema262ames
- Plant up to 5 dm tall, often in dense large clumps; pseudobulbs 1.5–3.5 dm long, compressed.
- Two fleshy-coriaceous leaves at the pseudobulb summit, 10–20 × 2.5–6 cm.
- Raceme short, **4–12-flowered**, from a spathaceous sheath 6–12 cm long.
- Flowers large, rose-coloured or true purple; sepals 4–6.5 cm; **petals broadly oval, 4–6.7 cm long, undulate**.
- Lip **funnel-shaped, folded closely over the column**, 3–5 cm long, **somewhat whitish on the disk**; column 8–12 mm.
- Epiphytic on trees in humid forests and on granite banks, up to 1,250 m (Guatemala); flowers "winter and spring".

**Ecology**
- Pemberton, R. W. 2007. Pollination of *Guarianthe skinneri*, an ornamental food deception orchid in southern Florida, by the naturalized orchid bee *Euglossa viridissima*. *Lankesteriana* 7(3): 461–468. https://doi.org/10.15517/lank.v0i0.7928
  - Flowers **self-compatible and nectarless** (dissected flowers lacked floral nectar); food-deception system.
  - **25 bees** visited 31 flowers; **18 picked up pollinaria; 17 left the plant after a single flower** → supports reduced geitonogamy / outcrossing.
  - "*Euglossa viridissima* is probably a pollinator of *G. skinneri* in Mesoamerica where they co-occur."
  - Earlier Costa Rican observations: small bees visited but none removed pollinaria.
  - **Extrafloral nectar** (added at fact-check): the flowers "have extrafloral nectaries at the tops of the ovaries
    just behind the sepals, and at the base of the ovary"; secretion rose on pollinated flowers (to ~13 µL on
    12-day fruits), and "undetermined species of ants were observed collecting nectar from the swelling ovaries".
    The discussion cites Damon & Perea-Soriano (2005, Mexico) for *Crematogaster* and *Camponotus* at these
    nectaries and concludes the nectar "probably functions first to protect the flowers and then the developing
    fruit" → body: "The plant's only nectar beads from glands behind the sepals and feeds ants, which probably
    guard the flower and its fruit"; intro: the guaria "pays its **pollinators** nothing at all".
- Habitat & elevation: "Epiphytic in seasonal and wet forests, ca. 200–2000 m"; Mexico (Chiapas) to Panama (Epidendra). Smithsonian Gardens: wet montane forests, 200–2,300 m; peak bloom February–May.
- Range (POWO via search snippet): Belize, Costa Rica, El Salvador, Guatemala, Honduras, Mexico, Nicaragua. Book text says "southern Mexico through Central America" to stay neutral on Panama.
- Flowering in Costa Rica: end of February (Observador CR, https://observador.cr/video-simbolos-del-bicentenario-finales-de-febrero-trae-la-floracion-de-las-guarias-moradas/); EcuRed: "Su floración se extiende entre enero y marzo" and "La abundante floración se extiende entre febrero y marzo"; national Orchid Week falls in the second week of March, at the peak. Pemberton's cultivated Florida plants flowered 26 February–27 March 2006; Smithsonian Gardens (cultivated): October–June, peak February–May; Ames & Correll (Guatemala): spring. Manifest (revised at fact-check): "Dry season, peak February–March". The start and end months are left out because only cultivated or non-Costa Rican material supports April.

**National flower**
- Declared national flower on **15 June 1939**, under President León Cortés Castro (decree/acuerdo No. 24; published in La Gaceta No. 137 five days later per Observador).
  Sources: EcuRed https://www.ecured.cu/Guaria_morada ; Observador CR (above); Tico Times 2026 (1939, León Cortés Castro); Orozco Abarca, S. 2020. Rendidos ante la guaria morada. *Revista Herencia* 33(1): 135–179, https://doi.org/10.15517/h.v33i1.43308 (cites a 2004 "65 Aniversario de la declaratoria"); Ames & Correll 1952, *Fieldiana Bot.* 26(1) introduction ("Costa Rica has adopted *Cattleya Skinneri* … as its national flower").
- Decree number: 24 (EcuRed, Observador) vs 25 (low-quality page) → the book gives only the date.

**Conservation**
- IUCN: Not Evaluated. Kew profile (via search snippet): not endangered but less common in Costa Rican forests through heavy collecting. Tico Times (21 Sept 2026): collecting badly depleted wild populations; conservationists are repropagating and reintroducing it.
- CITES: Appendix II (as all orchids not in Appendix I).

**Open questions**
- Southern range limit (Costa Rica vs Panama) differs between POWO and Epidendra.
- Pollinators in Costa Rica itself remain unconfirmed in the literature found; the manifest says "probably" orchid bees (Pemberton's wording).

---

## Plate II — Platanilla · *Heliconia wagneriana*

**Taxonomy**
- *Heliconia wagneriana* Petersen, *Fl. Bras.* 3(3): 13 (1890). https://www.ipni.org/n/119524-2 (ColPlanta/POWO give 1896; IPNI and NYBG give 1890 → 1890 used). Type from Panama (M. Wagner).
- Family Heliconiaceae (single genus), order Zingiberales.

**Names.** "Platanilla" is the Costa Rican name for heliconias (OTS florula: "Heliconia L., Platanilla", https://sura.ots.ac.cr/florula4/families/HELICONIACEAE.pdf), applied to *H. wagneriana* by Ecos del Bosque (https://www.ecosdelbosque.com/especies/platanillas-y-afines?page=1). English: "Easter heliconia", "rainbow heliconia" (NTBG, https://ntbg.org/database/plants/detail/heliconia-wagneriana).

**Morphology**
- Erect inflorescence of distichous bracts, red with a thin yellow-and-green margin (NYBG description by Kress, Cornejo & Aguilar, https://sweetgum.nybg.org/science/vh/taxon-details/?irn=127685 — page behind a verification check; content read via search snippet); NTBG herbarium (Kress 1990): "yellow with thin green margins and red cheeks".
- Flowers inside the bracts: **"perianth white basally to dark green distally"**, ovary and pedicel white (NTBG herbarium
  PTBG1000030174, W. J. Kress 90-2996, 22 June 1990, cultivated at NTBG Lawai, Kauai: https://ntbg.org/database/herbarium/detail/PTBG1000030174).
  The NYBG description (Kress, Cornejo & Aguilar) also has a perianth of white to cream, about 5.6–5.9 cm long, with a dark green tip (read via snippet), and the figure label says
  "cream with green tips". The earlier generic "small greenish flowers" (UW Extension, https://hort.extension.wisc.edu/articles/heliconias/)
  was replaced at fact-check by "slender flowers, white shading to dark green at the tip".
- Rhizomatous geophyte (ColPlanta/POWO, https://colplanta.org/taxon/urn:lsid:ipni.org:names:119524-2). Height 5–15 ft in cultivation (NTBG); 2–3 m (NYBG snippet) — not used in the manifest.

**Ecology** — primary field source: Seifert, R. P. & Seifert, F. H. 1976. Natural history of insects living in inflorescences of two species of *Heliconia*. *J. New York Entomol. Soc.* 84: 233–242 (Rincón de Osa, Península de Osa). https://archive.org/details/biostor-171666
- Buds emerge at the **end of December**; flowering **throughout the dry season until late April** (p. 234); later in the
  paper: "when *H. wagneriana* begins to bloom in January" → manifest: "flower buds emerge in late December and it blooms …
  from January to late April"; facts "January–late April (Osa)".
- Mature inflorescence: 4–8 pairs of bracts; a bract **"may be 20 cm"** including its tip; bracts hold **"as much as 6 cc of water"**, almost always full.
- **A new bract pair about every 9 days**; an inflorescence lasts **about 11 weeks**.
- Grows in **relatively sunny areas: forest edges, road cuts, stream beds**.
- Bract fauna includes *Copestylum ernesta* (Syrphidae), *Beebeomyia* sp. (flies) and *Odontolinus fasciatus* (Staphylinidae, a beetle).
  The larvae living in *H. wagneriana* bract water are flies' (*Quichuana aurata*, *Copestylum*, *Beebeomyia*, mosquitoes). Its beetles
  are **adults**: the hydrophilid *Gillisius* is "abundant as an adult … although the larval forms have not been found" and crawls down
  the flower into the water to feed; *O. fasciatus* "walks down the flower or the inside of the bract into the water, captures mosquito
  larvae". The only beetle larvae described (*Cephaloleia puncticollis*) feed in *H. imbricata* → manifest: "Fly larvae grow in these
  pools, and adult beetles crawl down into them to feed."
- Wootton, J. T. & Sun, I.-F. 1990. Bract liquid as a herbivore defense mechanism for *Heliconia wagneriana* inflorescences. *Biotropica* 22(2): 155–159. https://doi.org/10.2307/2388408
  - Plants **actively secrete** bract liquid; draining it **increased herbivory on ovaries and nectar robbing by chewing insects**.
- Gannon, D. G., Kormann, U. G., Hadley, A. S., Betts, M. G. & Jones, F. A. 2018. The "jack-in-the-box" stamens of *Heliconia wagneriana* (Heliconiaceae). *Ecology* 99(2): 488–490 (epub 4 Dec 2017). https://doi.org/10.1002/ecy.2042 (authors: Oregon State University; F. A. Jones also STRI, PMID 29205316).
  - Discover (9 Feb 2018) summary: stamens sit **coiled in a sealed package** and **spring upward when a bill (or forceps) probes for nectar**, taking **about two seconds** to extend; authors think the flower pushes pollen onto the bird's head. https://www.discovermagazine.com/when-hummingbirds-visit-this-flower-pops-open-like-a-jack-in-the-box-12387
- Pollinators: hummingbirds (Gannon et al.; Heliconiaceae are hummingbird-pollinated in the Neotropics). Species-level Costa Rican pollinator data were **not** found; the manifest says only "hummingbirds".

**Distribution.** Chiapas (Mexico) to Ecuador and Trinidad (POWO via ColPlanta). In Costa Rica on the Osa Peninsula (Seifert) and the southern Caribbean (Museo Nacional plate "Heliconias del Caribe Sur", A. Estrada Chavarría: https://www.museocostarica.go.cr/wp-content/uploads/Investigaciones/historia-natural/Gandoca-Manzanillo/Datos-Biodiversidad/Plantas/Laminas/Heliconias-del-Caribe-Sur.pdf).

**Open questions**
- Which hummingbird species pollinate it in Costa Rica (hermits are often assumed; unverified). The figure shows a generic hermit-like bird; the text avoids naming a species.
- Elevation: "sea level to ca. 800 m" appears in the NYBG snippet only → not used.

---

## Plate III — Granadilla de monte · *Passiflora vitifolia*

**Taxonomy**
- *Passiflora vitifolia* Kunth, *Nov. Gen. Sp.* 2 (ed. qu.): 138 (1817). https://www.ipni.org/n/30044451-2
- Synonyms include *P. sanguinea* J.E.Sm. (1819), *P. punicea* Ruiz & Pav. ex DC. (1828), *Tacsonia buchananii* Lem. (1867) (Killip 1938).
- Subgenus *Passiflora*, supersection *Coccinea*. Family Passifloraceae (APG IV, incl. Turneroideae), order Malpighiales.
- Epithet: Latin *vitis* (grapevine) + *folium* (leaf).

**Names.** "Flor de pasión, pasionaria, granadilla de monte" (Museo Nacional catalogue 2020). "Granadilla de monte" is also applied to *P. adenopoda*, *P. ambigua* and *P. seemannii* in Costa Rica. English: crimson passionflower (Chicago Botanic Garden, https://www.chicagobotanic.org/plant-information/plant-finder/passiflora-vitifolia-crimson-passionflower), perfumed passionflower (USDA).

**Morphology** — Killip, E. P. 1938. *The American Species of Passifloraceae*. Field Mus. Nat. Hist., Bot. Ser. 19: 319–321, sp. 187. https://archive.org/details/americanspeciesofikill (https://doi.org/10.5962/bhl.title.2269); same text on the Passiflora Society sheet (C. Houël, CC BY 4.0): https://passiflorasociety.org/wp-content/uploads/CH_vitifolia.pdf
- Leaves 7–15 × 8–18 cm, **3-lobed** to below the middle; petioles **biglandular at base** (extrafloral nectaries).
- Flowers **scarlet, bright red or vermilion**; sepals lanceolate **6–8 cm**, keeled, awned, magenta within; petals **4–6 cm**, narrower (0.8–1.5 cm vs 1–2 cm wide).
- **Corona 3-ranked**: outermost filaments 1.5–2 cm, **bright red or bright yellow**; next rank ~1 cm, pale red; third rank tubular around the gynophore. Operculum deflexed.
- Fruit ovoid, ~5 × 3 cm, very fragrant.
- Distribution: Nicaragua to Venezuela, Colombia, E Ecuador and N Peru, at low elevations; many Costa Rican collections (Guanacaste, Limón, Golfo Dulce, Turrialba, Talamanca, El General…).
- Standard *Passiflora* floral plan (5 sepals, 5 petals, androgynophore bearing 5 stamens and an ovary with 3 styles) — consistent with the figure brief.

**Ecology**
- Snow, A. A. 1982. Pollination intensity and potential seed set in *Passiflora vitifolia*. *Oecologia* 55: 231–237. https://doi.org/10.1007/BF00384492 (abstract: PubMed 28311238)
  - Costa Rican population; **self-incompatible**; **large one-day flowers**; 200–350 ovules per flower.
  - Hand pollinations: 25–50 grains for fruit set, **>450 for maximum seed set**.
  - **Hummingbirds (*Phaethornis superciliosus*) delivered enough pollen for maximum seed set to only 28% of flowers.**
  - Taxonomic note: Central American "*P. superciliosus*" is now usually treated as the Long-billed Hermit, *P. longirostris* → the manifest says "hermit hummingbirds".
- Smiley, J. T. 1986. Ant constancy at *Passiflora* extrafloral nectaries: effects on caterpillar survival. *Ecology* 67(2): 516–521. https://doi.org/10.2307/1938594 (abstract via OpenAlex)
  - **Corcovado National Park**; **29 ant species** visited extrafloral nectaries of *P. vitifolia* and *P. quadrangularis*.
  - **48% of *Heliconius ismenius* caterpillars died over 2 days on plants with many ants** (vs 20–23% in other treatments).
- Heliconius hosts: at La Selva the most commonly used host of *H. cydno* and *H. hecale*; females lay eggs on **tips of new, uncoiled tendrils**; large petiolar nectaries attract ants (J. T. Smiley, https://www.johnterahsmiley.com/heliconius-passiflora-flea%20beetle/passiflora/vitifolia/vitifolia.html). Young, A. M. 1976 (Pan-Pac. Entomol. 52: 291–303) found *H. erato*, *H. cydno* and *H. hecale* caterpillars on it in Sarapiquí; Young 1980 (J. N.Y. Entomol. Soc. 88: 217–227).
- Habitat: woody vine (ACG, Masís et al. 1998: https://www.acguanacaste.ac.cr/paginas_especie/magnoliophyta/passifloraceae/passiflora_vitifolia/p_vitifolia10mar98/p_vitifolia12feb98_ingl.html); canopy, treefall clearings, forest edges (Smiley site).
- Costa Rica: **1–1,600 m; flowers most of the year**; native (Museo Nacional 2020).
- Costa Rica records **59 *Passiflora* species: 47 native + 6 endemic + 6 introduced** (counted from the same catalogue) — not used in the manifest.

**Open questions**
- Flower diameter: Wikipedia "up to 9 cm" (uncited) vs figure brief "~10–15 cm". The manifest only gives Killip's sepal length.

---

## Plate IV — Labios de mujer · *Palicourea elata*

**Taxonomy**
- Accepted: *Palicourea elata* (Sw.) Borhidi, *Acta Bot. Hung.* 53(3–4): 244 (2011). https://www.ipni.org/n/77115600-1
- Basionym: *Cephaëlis elata* Sw., *Prodr.* 45 (1788). https://www.ipni.org/n/312086-2
- Synonyms: *Psychotria elata* (Sw.) Hammel, *Selbyana* 12: 139 (1991) (https://www.ipni.org/n/963360-1); *Cephaelis punicea* Vahl (1796); *C. costaricensis* Schltdl. (1856); *Evea elata* (Sw.) Standl. (1916); *C. elata* f. *lutea* Standl. (1938) (Burger & Taylor 1993).
- Name history (fact-check): the species was *Cephaëlis elata* from 1788 (also *Evea elata*), *Psychotria elata* only from 1991 to 2011,
  then *Palicourea elata* → body now says "formerly *Psychotria elata* and before that *Cephaelis elata*" instead of "long known as
  *Psychotria elata*". The diaeresis is dropped in the text, an orthographic variant the Code allows.
- Why the genus changed: "DNA-phylogenetic studies and a re-evaluation of morphological characters have shown that species of *Psychotria* subg. *Heteropsychotria* … are more closely related to *Palicourea*"; Borhidi (2011) transferred the Mexican/Mesoamerican species. Berger, A. 2017. *PhytoKeys* 80: 53–63. https://doi.org/10.3897/phytokeys.80.13330
- Family Rubiaceae (Rubioideae, Palicoureeae), order Gentianales.

**Names.** "Labios de mujer" (brief; also used in Mexican press), "hot lips" (Hammel, per Wikipedia), "labios de puta" (vulgar, not used).

**Morphology & ecology** — Burger, W. & Taylor, C. M. 1993. Flora Costaricensis, Family #202 Rubiaceae. *Fieldiana: Botany* n.s. 33: 245–246. https://archive.org/details/floracostaricens33fiel
- **Shrubs, subshrubs or small trees, 0.5–5(–8) m**; leaves glabrous, opposite, stipules united around the stem.
- Inflorescence terminal, solitary, capitate, on a peduncle 2–13 cm; **two involucral bracts 15–55 mm long, deep red to orange-red (yellow)**.
- **Corolla white (rarely pink or yellow), narrowly funnelform, tube ca. 16 mm, 5 lobes 2.5–4 mm**; stamens 5.
- **Fruits 5–10 mm, blue becoming black.**
- **Common shrubs of evergreen forest edges and interiors, 30–1,700 m**; "common in light gaps and on the edges of forests".
- **Flowering and fruiting throughout the year (primarily flowering January–August)**; fruiting at La Selva July–September.
- **The yellow-bracted form appears to be most common in the General Valley and Golfo Dulce area.**
- **Flowers visited by butterflies and hummingbirds** (citing Freeman & Stiles 1990); breeding biology studied by Bawa & Beach 1983 (*Am. J. Bot.* 70: 1281–1288, https://doi.org/10.1002/j.1537-2197.1983.tb07917.x).
- Range: Mexico and the West Indies through Central America to Colombia (Burger & Taylor); POWO adds Ecuador.

**Conservation.** IUCN **LC** (Condit 2019). Popular pages (Wikipedia, Carnegie Museum) call it "endangered"; that claim is unsourced and contradicted by the IUCN assessment → not repeated.

**Open questions**
- Whether *P. elata* is distylous (likely for the group; Bawa & Beach 1983 do not name it in the abstract) → omitted.
- Seed dispersers (birds assumed for the genus; no species-level source) → omitted.

---

## Plate V — Cortez amarillo · *Handroanthus ochraceus*

**Taxonomy**
- Accepted: *Handroanthus ochraceus* (Cham.) Mattos, *Loefgrenia* 50: 2 (1970). https://www.ipni.org/n/117333-2
- Basionym: *Tecoma ochracea* Cham., *Linnaea* 7: 653 (1832).
- Synonyms: *Tabebuia ochracea* (Cham.) Standl., *Publ. Field Mus. Nat. Hist., Bot. Ser.* 11: 176 (1936) (https://www.ipni.org/n/110988-1); *Tabebuia neochrysantha* A.H.Gentry (1970); *T. ochracea* subsp. *neochrysantha* (A.H.Gentry) A.H.Gentry (1973). Costa Rican trees belong to subsp. *neochrysantha* (Guatemala to NW Venezuela).
- *Handroanthus* separated from *Tabebuia* by Grose & Olmstead (2007). Family Bignoniaceae, order Lamiales.

**Names.** Cortez amarillo, cortez, corteza amarilla, guayacán (ACG); English: no species-specific name found — "trumpet tree" is a genus-level English name (Selby Gardens) → manifest uses "Yellow trumpet tree".

**Morphology** — Burger, W. & Gentry, A. 2000. Flora Costaricensis, Family #194 Bignoniaceae. *Fieldiana: Botany* n.s. 41 (accepted 1998, published 28 April 2000). https://archive.org/details/floracostaricens41fiel
- **Trees 8–25 m**; bark with flat grey ridges; **leaves palmately 5-foliolate**, opposite.
- Inflorescences terminal, condensed clusters; **flowers sweet-scented**; **calyx 8–13 mm, campanulate, densely yellowish tomentulous**.
- **Corolla 36–75(–83) mm, tubular-funnelform, yellow with red lines within.**
- Fruits 11–38 cm, linear-cylindric, densely tomentulous; seeds with transparent wings.
- **Deciduous trees of seasonally dry forests of the Pacific slope, 5–900 m; flowering January–June; fruiting February–June.**

**Phenology**
- Reich, P. B. & Borchert, R. 1982. Phenology and ecophysiology of the tropical tree, *Tabebuia neochrysantha* (Bignoniaceae). *Ecology* 63(2): 294–299. https://doi.org/10.2307/1938945 (Hacienda La Pacífica, Cañas, Guanacaste)
  - Leaf fall in the early dry season tracks declining soil moisture; **recovery from water stress was required for flowering**; **at dry sites rehydration occurred only after isolated rain showers or irrigation; at wet sites during continued drought** after leaf fall.
  - Flowers open only after leaves are senescent or shed, before new shoots. Irrigating leafless trees in April induced flowering.
  - "**The simultaneous flowering or flushing of many trees at a given site during the dry season will indicate an isolated rain shower.**"
  - No evidence for control by temperature or photoperiod (in that study).
  - Scope (fact-check): one season (1978) at one lowland site; the abstract compares "dry and wet sites" and never mentions
    hillsides.
- Lobo Segura, J. A. 2019. Diversity of phenological patterns of *Handroanthus ochraceus* (Bignoniaceae) in Costa Rica. *Rev. Biol. Trop.* 67(2) Suppl.: S149–S158. https://doi.org/10.15517/rbt.v67i2supl.37220
  - Two patterns over four years at seven sites: **explosive** (anthesis on the first rains) and **staggered** (unsynchronised flowering early/mid dry season) → manifest says flowering is "often" explosive.
  - Abstract: staggered trees flower "independently of rainfall", and the two patterns are "not determined by the proximity of
    water courses", contradicting "phenological models proposed for this tree species". The book therefore no longer states
    Reich & Borchert's moist-site/dry-site rule as fact. Body: "Once the bare tree has recovered from drought stress — often,
    though not always, after a stray dry-season shower — …".
- ACG species page: Sullivan, J. J., Masís, A., Chavarría, F., Espinoza, R., Guadamuz, A. & Pérez, D. 1998. https://www.acguanacaste.ac.cr/paginas_especie/plantae_online_2/magnoliphyta_2/bignoniaceae/tabebuia_ochracea/t_ochracea_ing.html
  - **Each flower ~8 cm and lasts one day; displays synchronised and last only 4–5 days**; some years more than one event.
  - Cues reported: dry-season rain spells *or* cold fronts (cold nights, Santa Rosa 1997). Verbatim: "Although flowering episodes do
    often follow an unseasonal dry season cloudburst, this is not always the case. For example, in the 1997 dry season in Sector
    Santa Rosa, the April mass flowering event followed a period of cold nights when no rain fell … Apparently the trees use
    unseasonally cold temperatures in the dry season to cue the synchronous opening of their flowers, whether there is associated
    rain or not. They do not require a new supply of water to expand their flowers." → didYouKnow (revised at fact-check) tells
    the 1997 cold-night bloom, hedged "it seems".
  - **"Pollinated by a variety of bees, especially euglossines and anthophorids"; "nectar is commonly robbed by hummingbirds and xylocopid bees"** (Gentry 1983); late-acting self-incompatibility (Gibbs & Bianchi 1993).
    Anthophoridae is no longer a family (its members, *Xylocopa* included, are now in Apidae: Michener 2007, *The Bees of the World*,
    2nd ed.), so facts now read "Euglossine and other large bees", matching the body.
  - **Fruit matures ~3 weeks after flowering; pods 20–40 cm; small white, laterally winged seeds**, dispersed late April–early June:
    "in the last weeks of the dry season and the first weeks of the wet season" → body: seeds drift "as the dry season ends and the
    first rains arrive" (not "before the rains").
  - **Wood very hard, heavy, durable**; trees 25–30 m, 0–1,000 m (Gentry 1992).
- Brazil (subsp. *ochraceus*): Barros 2001 — *Centris* spp. and *Bombus morio* as potential pollinators (context only).

**Open questions**
- Relative weight of rain vs cold-front cues (ACG anecdote vs Reich & Borchert). Resolved at fact-check: the body gives both sides
  ("often, though not always, after a stray dry-season shower") and the didYouKnow gives the ACG cold-night case.
- Corolla length: the figure label (`src/subjects/flowers/handroanthus.js`, owned by the flowers agent) says "4–8 cm" (Gentry 1992,
  range-wide), while the manifest uses Flora Costaricensis' 3.6–7.5 cm. This is flagged for the flowers agent to align.

---

## Plate VI — Nenúfar · *Nymphaea ampla*

**Taxonomy**
- *Nymphaea ampla* (Salisb.) DC., *Syst. Nat.* 2: 54 (1821). https://www.ipni.org/n/605494-1 (IPNI record lists "DC."; the combination authority with the basionym author in parentheses is standard, e.g. GBIF and Duke 1962).
- Basionym: *Castalia ampla* Salisb., *Parad. Lond.* 1(1): t. 14 (1805). https://www.ipni.org/n/605289-1
- Subgenus *Brachyceras* (day-blooming). Family Nymphaeaceae, order Nymphaeales.

**Names.** Nenúfar, lirio de agua (NatureServe primary name "Lirio de Agua"); English "dotleaf water-lily" (NatureServe).

**Morphology** — Duke, J. A. 1962. Nymphaeaceae, in *Flora of Panama*, Part IV, Fascicle 5. *Ann. Missouri Bot. Gard.* 49: 137–255 (*N. ampla* pp. 138–139). https://archive.org/details/biostor-11850
- Rhizomatous aquatic perennial; **leaves long-petiolate, blades suborbicular, sinuate-dentate, green above, purplish and often mottled below, 10–45 cm**; key: "leaves coarsely dentate, black-spotted beneath, at least when young".
- **Flowers long-pedunculate, usually emersed, opening by day, white, 8–16 cm broad.**
- **Sepals 4, green with purplish striations, 6–10 cm**; petals several, white; **stamens numerous, filaments conspicuously produced beyond the anthers**; carpels ca. 20.
- Fruits probably maturing under water. Range: southern Texas and Mexico through the West Indies and Central America to South America.
- *Flora of North America* vol. 3 (Wiersema & Hellquist 1997), as quoted by the NEON biorepository:
  "petals 12–21, white; **stamens 50–190, yellow**, outer with connective appendage projecting 3–10 mm beyond anther".
  https://biorepo.neonscience.org/portal/taxa/index.php?tid=13397 (also SEINet ecoflora). Supports "yellow stamens" and the
  stamen lookCloser note.
  - Read directly on eFloras at fact-check (http://www.efloras.org/florataxon.aspx?flora_id=1&taxon_id=233500822): "Flowers emersed,
    7–18 cm diam., opening and closing diurnally … stamens 50–190, yellow, outer with connective appendage projecting 3–10 mm beyond
    anther". Only the **outer** stamens carry the projecting tip, so the lookCloser note now reads "the outer ones end in a slender
    tip that projects beyond the anther" (previously "each").

**Floral biology** — Wiersema, J. H. 1988. Reproductive biology of *Nymphaea* (Nymphaeaceae). *Ann. Missouri Bot. Gard.* 75: 795–804. https://doi.org/10.2307/2399367 ; text: https://archive.org/details/biostor-12648
- Sexual reproduction **mostly protogynous**. In first-day flowers the **tips of the stamens form a wall around a central pool of stigmatic fluid**; the fluid reportedly contains a **surfactant that washes pollen from insect visitors**, possibly contributing to their **frequently observed drownings**. Anthers dehisce in **second-day** flowers.
- Day-blooming subgenera (incl. *Brachyceras*) **appear to be pollinated by Hymenoptera or Diptera**.
- **Homogamy (stamens dehiscing on day one) observed in *N. ampla*** → autogamy possible; Prance & Anderson (1976) reported pollen release in buds.
- *N. ampla* flowering duration: "Unknown" in Wiersema's Fig. 1 → the manifest gives no number of days.

**Distribution in Costa Rica**
- Manual de Plantas de Costa Rica newsletter, *The Cutting Edge* XII(3), July 2005 (MBG): the Palo Verde "*N. ampla*" is ***N. pulchella* DC., common throughout Guanacaste**; "**the real *N. ampla* does indeed occur in Costa Rica, but only in more humid zones (Atlantic slope and Golfo Dulce region)**" (flagged by G. E. Crow). https://www.mobot.org/MOBOT/research/Edge/jul05/jul05anno.shtml
- GBIF: 56 Costa Rican records (Guanacaste 18, Limón 16, Alajuela 15 incl. Caño Negro…); most specimens below 100 m. Guanacaste records may be *N. pulchella*. https://www.gbif.org/species/2882432
- Fact-check (GBIF occurrence API, 1 Nov 2026): some Guanacaste specimens are expert-identified *N. ampla*. They include W. C. Burger 11304
  (F, 1982), det. **J. H. Wiersema** 1984; Hammel 27927 (CR 103254293, Río Tempisque lowlands near Cañas, 10 m, 16 Dec 2022, det.
  B. Hammel; https://www.gbif.org/occurrence/4061402721), collected the same day and place as his *N. pulchella* (CR 103254297); and
  five INBio sheets from Santa Rosa, Sector Murciélago (E. Alfaro 2003). *N. pulchella* has 62 Guanacaste records (dets. Wiersema ×10,
  Crow ×13, L. González ×10…) and none on the Caribbean side. Outside Guanacaste the *N. ampla* records are almost all Caribbean
  lowlands (Limón: Río Estrella, Cahuita, Río Banano; northern plains: Caño Negro, Boca Tapada, Río San Juan). The book now says it grows
  "mainly in the humid lowlands of the Caribbean slope and around the Golfo Dulce; in Guanacaste's wetlands the similar
  *N. pulchella* is much more common" (facts: "Mainly Caribbean lowlands, Golfo Dulce"). GBIF shows no Golfo Dulce specimen;
  that locality rests on the 2005 Manual note.
- National revision: Bezerra Silva, L. E. 2025. Revisión taxonómica del orden Nymphaeales para Costa Rica (UCR), https://hdl.handle.net/10669/102951 — species mostly 0–800 m; full text not read (12.9 MB). Its abstract (Kérwá) does not mention *N. ampla* or *N. pulchella*;
  it reports the first Costa Rican *N. odorata*, a possible *N. amazonum* × *N. prolifera* hybrid and *Victoria* as an introduced ornamental.

**Open questions**
- Fragrance (Wikipedia, citing FNA) not confirmed from a primary text → omitted; petal count 12–21 (FNA via NEON) not needed in the text.
- Hour of closing: FNA says only "opening and closing diurnally", and Wiersema 1988 (Fig. 1B) charts Neotropical *Brachyceras* schedules
  without a closing hour usable for *N. ampla*. The animation beat therefore says the flower folds shut "as it does every day", not
  "each afternoon". Wiersema 1988 does describe the opening order, "from the sepals and outer petals gradually inward to the inner
  stamens" (written of subg. *Nymphaea*, the closest documented case), matching the beat "sepals, outer petals, inner petals, stamens".

---

## Back matter: glossary sources

Definitions are standard botanical usage, phrased originally; species-specific glosses come from
the plates above (androgynophore, corona: Killip 1938; column, labellum, pollinarium, pseudobulb:
Ames & Correll 1953, Pemberton 2007; extrafloral nectary: Smiley 1986; protogyny: Wiersema 1988;
self-incompatibility: Snow 1982; nectar guide: Burger & Gentry 2000; rachis, bract: Seifert &
Seifert 1976; food deception: Pemberton 2007).

## Full references (back.sources uses 12 of these)

1. Ames, O. & Correll, D. S. 1952–1953. *Orchids of Guatemala*. Fieldiana: Botany 26(1–2). Chicago Natural History Museum.
2. APG IV. 2016. *Bot. J. Linn. Soc.* 181: 1–20. https://doi.org/10.1111/boj.12385
3. Berger, A. 2017. *PhytoKeys* 80: 53–63. https://doi.org/10.3897/phytokeys.80.13330
4. Burger, W. & Gentry, A. 2000. Flora Costaricensis, Family #194 Bignoniaceae. *Fieldiana: Botany* n.s. 41.
5. Burger, W. & Taylor, C. M. 1993. Flora Costaricensis, Family #202 Rubiaceae. *Fieldiana: Botany* n.s. 33: 1–333.
6. Duke, J. A. 1962. Flora of Panama, Part IV, Fascicle 5 (Nymphaeaceae). *Ann. Missouri Bot. Gard.* 49: 137–255.
7. Gannon, D. G. et al. 2018. *Ecology* 99(2): 488–490. https://doi.org/10.1002/ecy.2042
8. Hinsley, A. et al. 2018. *Bot. J. Linn. Soc.* 186(4): 435–455. https://doi.org/10.1093/botlinnean/box083
9. Jiménez Madrigal, Q. 2022. *Rev. Ciencias Ambientales* 56(1): 268–283. https://doi.org/10.15359/rca.56-1.14
10. Killip, E. P. 1938. *The American Species of Passifloraceae*. Field Mus. Nat. Hist., Bot. Ser. 19. https://doi.org/10.5962/bhl.title.2269
11. Lobo Segura, J. A. 2019. *Rev. Biol. Trop.* 67(2) Suppl.: S149–S158. https://doi.org/10.15517/rbt.v67i2supl.37220
12. Pemberton, R. W. 2007. *Lankesteriana* 7(3): 461–468. https://doi.org/10.15517/lank.v0i0.7928
13. Pupulin, F., Bogarín, D. & Karremans, A. P. 2023. *Lankesteriana* 23 (Suppl.): 1–254. https://doi.org/10.15517/lank.v23iSupplement.58145
14. Reich, P. B. & Borchert, R. 1982. *Ecology* 63(2): 294–299. https://doi.org/10.2307/1938945
15. Seifert, R. P. & Seifert, F. H. 1976. *J. New York Entomol. Soc.* 84: 233–242.
16. Smiley, J. T. 1986. *Ecology* 67(2): 516–521. https://doi.org/10.2307/1938594
17. Snow, A. A. 1982. *Oecologia* 55: 231–237. https://doi.org/10.1007/BF00384492
18. Wiersema, J. H. 1988. *Ann. Missouri Bot. Gard.* 75: 795–804. https://doi.org/10.2307/2399367
19. Wootton, J. T. & Sun, I.-F. 1990. *Biotropica* 22(2): 155–159. https://doi.org/10.2307/2388408

---

## Verification log (1 November 2026)

- `node -e "import('…/src/books/flores.js')…"` → `6 guaria-morada,platanilla,granadilla-de-monte,labios-de-mujer,cortez-amarillo,nenufar`.
- Budget script (word counts strip `*` markup; hyphenated words count once):

  | Plate | lede (≤25) | body (120–220) | didYouKnow (≤40) | facts | lookCloser |
  |---|---|---|---|---|---|
  | I guaria-morada | 17 | 184 | 36 | 6 | 3 |
  | II platanilla | 16 | 169 | 26 | 6 | 4 |
  | III granadilla-de-monte | 16 | 149 | 32 | 6 | 4 |
  | IV labios-de-mujer | 19 | 146 | 31 | 6 | 3 |
  | V cortez-amarillo | 16 | 156 | 36 | 6 | 4 |
  | VI nenufar | 19 | 160 | 34 | 6 | 4 |

  (Counts after the fact-check revision; the first draft's were 162/147/147/143/150/154.)
  Intro 200 words (≤260, incl. pull quote) · note 162 (≤220) · glossary 14 · sources 12 · every fact value ≤6 words ·
  every `lookCloser.label` is a canonical id for its species (§6) · beats strictly increasing within [0, 5).
- Typeset preview (`typeset.html?book=flores`): 24 sides / 12 leaves, **no overflow**; plate pages, intro, how-to,
  note, sources, glossary, boards and endpapers reviewed as PNGs (`.scratch/flores-content-*.png`).
- Non-breaking spaces (` `) keep "*N.* ampla", "*N.* pulchella", "Appendix II/I" and "Ley 7317/6084" on one line
  (the typesetter's `isSpace` does not break on U+00A0).
- Animation beats for plates I–III were re-timed to the flower figures already implemented in
  `src/subjects/flowers/{guarianthe,heliconia,passiflora}.js` (same t values, original wording). Plates IV–VI were re-timed at
  fact-check to `palicourea.js` (partAt/emergeAt: 0.55, 1.15, 3.9 s), `handroanthus.js` (T_DETACH 0.9, T_LAND 2.55, T_GROW0 3.7 s)
  and `nymphaea.js` (openAt: open until 2.35 s, shut 3.15–3.4 s, reopened by 4.85 s). This matters because `src/app/Reader.js`
  shows `plate.animation.beats` in preference to the figure's own beats.
- Figure label ids used by the implemented figures (guarianthe, heliconia, passiflora) match the manifest's lookCloser ids.
  Re-checked at fact-check for all six figures: palicourea (`bract flower leaf`), handroanthus (`corolla nectar-guides calyx branch`)
  and nymphaea (`petal sepal stamens stigma pad`) also cover every lookCloser label.

---

## Fact-check log (1 November 2026)

Two independent fact-checkers reviewed the manifest. Before acting, each of their 27 issues (some reported by both) was re-checked
against its primary source. Verdicts: **fixed** means the correction was applied as proposed or in equivalent words. **Fixed, adapted**
means the problem was confirmed but the proposed wording was changed; the reason is given. **Rejected** means the claim was refuted.
**Deferred** means the issue was confirmed but lies outside this book's files. The shared web-search budget ran out mid-review, so the
checks below fetched known primary URLs or public APIs (GBIF, IPNI, OpenAlex, eFloras, archive.org) directly.

1. **nenufar · animation.beats** — **fixed, adapted.** Confirmed in code: `nymphaea.js` openAt keeps the flower open until
   2.35 s, shut from 3.15 to 3.4 s and reopened by 4.85 s, and `src/app/Reader.js:332` shows manifest beats in preference to the figure's.
   The new beats sit at 0 / 0.8 / 2.35 / 3.4 s. The checker's "as it does each afternoon" became "as it does every day", because FNA says only
   "opening and closing diurnally". Lab frames at t = 0.4, 2.75, 3.3 and 4.3 s show the flower open, folding, shut and reopening.
   Sources: `nymphaea.js` lines 44–52 and 287–300; FNA vol. 3 (eFloras).
2. **platanilla · body[0] and lookCloser `flower`** — **fixed.** NTBG PTBG1000030174 (Kress 90-2996, 1990): "perianth white basally to
   dark green distally". The body now says "slender flowers, white shading to dark green at the tip", and the lookCloser text follows the checker.
   "NTBG herbarium, Kress 90-2996" was added to the plate sources. The specimen was cultivated at NTBG on Kauai, but flower colour is a species character,
   and it agrees with the NYBG description and the figure label ("cream with green tips").
3. **cortez-amarillo · body[0] (rehydration rule)** — **fixed.** The Reich & Borchert 1982 abstract (via OpenAlex) covers one year in one
   lowland forest and compares "dry and wet sites", with no hillsides. The Lobo Segura 2019 abstract finds the patterns "not determined by the proximity of water courses" and
   staggered flowering "independently of rainfall". The body now reads "Once the bare tree has recovered from drought stress — often,
   though not always, after a stray dry-season shower — …". Recovery from water stress before flowering is R&B's own result, and
   neither ACG nor Lobo Segura contradicts it.
4. **cortez-amarillo · didYouKnow ("announcing an isolated rain shower")** — **fixed, adapted.** ACG (Sullivan et al. 1998) says
   flowering does "often follow an unseasonal dry season cloudburst, this is not always the case". It records that the April 1997 Santa Rosa
   mass flowering "followed a period of cold nights when no rain fell" and that the trees "do not require a new supply of water to expand
   their flowers". The new didYouKnow (36 words) tells the 1997 cold-night bloom, hedged with "it seems" to match ACG's "Apparently". It
   does not repeat the rain case, which is already in body[0].
5. **nenufar · body[1] and facts `In Costa Rica`** — **fixed, adapted.** GBIF confirms expert-identified *N. ampla* from Guanacaste:
   Burger 11304, det. Wiersema 1984; Hammel 27927, 2022; Alfaro 2003. It also holds 62 Guanacaste records of *N. pulchella*. The text
   now reads "mainly in the humid lowlands of the Caribbean slope and around the Golfo Dulce; in Guanacaste's wetlands the similar
   *N. pulchella* is much more common", and the facts row reads "Mainly Caribbean lowlands, Golfo Dulce". The checker's "most water lilies in Guanacaste's
   wetlands are *N. pulchella*" was softened, because herbarium counts measure collecting effort. "Costa Rican herbarium records via
   GBIF" was added to the plate sources. The 2025 UCR revision's full text (a 12.9 MB PDF) was not read, and its abstract does not discuss either species.
6. **nenufar · lookCloser `stamens`** — **fixed.** FNA: "stamens 50–190, yellow, outer with connective appendage projecting 3–10 mm
   beyond anther". The text now reads "the outer ones end in a slender tip that projects beyond the anther".
7. **platanilla · body[0] and facts `Flowering`** — **fixed.** Seifert & Seifert 1976, p. 234, says buds emerge at the end of December and the
   population flowers through the dry season until late April. Later the paper says *H. wagneriana* "begins to bloom in January". The body now reads "its flower
   buds emerge in late December and it blooms through the dry season, from January to late April", and the facts row reads "January–late April (Osa)".
8. **cortez-amarillo · body[1] (seeds "before the rains")** — **fixed.** ACG: the seeds "disperse in the last weeks of the dry
   season and the first weeks of the wet season (between late April to early June)". The text now reads "as the dry season ends and the first rains arrive".
9. **labios-de-mujer · body[0] ("long known as *Psychotria elata*")** — **fixed.** IPNI 963360-1 gives *Psychotria elata* (Sw.) Hammel, 1991, and
   IPNI 312086-2 gives *Cephaëlis elata* Sw., 1788. WCVP lists *P. elata* as a synonym. The text now reads "formerly *Psychotria elata* and
   before that *Cephaelis elata*".
10. **labios-de-mujer · lede ("a pair of leaves")** — **fixed.** Burger & Taylor 1993 call them "involucral bracts", which matches the badge,
    lookCloser and glossary. The lede now reads "a pair of bracts, modified leaves painted red to catch the eye".
11. **granadilla-de-monte · body[0] (corona)** — **fixed.** Killip 1938, read on the Passiflora Society sheet (C. Houël, CC BY 4.0):
    "corona 3-ranked, the 2 outer ranks filamentose; the outermost filaments … bright red or bright yellow; those of the next rank …
    pale red; the third rank tubular". The text now reads "a corona in three ranks, its long outer filaments bright red or yellow".
12. **guaria-morada · facts `Flowering`** — **fixed, adapted.** EcuRed: "Su floración se extiende entre enero y marzo" and "La abundante
    floración se extiende entre febrero y marzo"; Orchid Week is set at the March peak. April appears only for cultivated plants
    (Smithsonian; Pemberton's Florida plants, 26 Feb–27 Mar 2006) or for Guatemala ("spring", Ames & Correll). The row therefore uses
    "Dry season, peak February–March" rather than the checker's "January–April, peak February–March".
13. **labios-de-mujer · animation.beats** — **fixed.** In `palicourea.js` the bracts part from 0.55 to 1.75 s, the flowers rise from 1.15 s
    (staggered by up to 0.75 s), the flowers sink from 3.75 s and the lips close from 3.9 s. The beats sit at 0 / 0.55 / 1.15 / 3.9 s, and
    "rise between them" replaces "rise from the head".
14. **cortez-amarillo · animation.beats** — **fixed, adapted.** `handroanthus.js` sets T_DETACH 0.9, T_LAND 2.55, a fade from 3.35 to 4.1 and T_GROW0
    3.7. The beats sit at 0 / 0.9 / 2.55 / 3.7 s. Two lines differ from the checker's. "It lands on the ground below" replaces "forest floor", because
    flowering cortezes often stand in open country and the figure lands on the page. "A fresh bud opens: each cluster blooms for four or five days" replaces "A
    fresh corolla opens in its place", because no corolla regrows on an old calyx; that regrowth is only the loop device. ACG: "One flower lasts
    only one day, and an inflorescence in total lasts only 4-5 days".
15. **imprint[0]** — **fixed.** IPNI 605494-1 lists *N. ampla* as "DC.", while WCVP (via GBIF) accepts all six names with the manifest's
    authorities. The text now reads "Accepted scientific names follow the World Checklist of Vascular Plants (Plants of the World Online), with authorities
    and places of publication checked against the International Plant Names Index; conservation categories follow the IUCN Red List
    (all checked November 2026)."
16. **back.glossary `Pollinarium`** — **fixed, adapted.** Ames & Correll (*Orchids of Guatemala* 26(2): 406), describing *Cattleya*: "pollinia 4,
    ceraceous, somewhat compressed, parallel", with no stipe or viscidium. The entry now reads "waxy pollen masses (pollinia) that travel together with
    their stalks and, in many orchids, a sticky pad". The gloss "(pollinia)" was added because the glossary does not define the term elsewhere.
17. **cortez-amarillo · figure label `corolla` ("4–8 cm")** — **deferred**; confirmed but outside my ownership. Line 219 of
    `src/subjects/flowers/handroanthus.js` belongs to the flowers agent and should read "3.6–7.5 cm long" (Burger & Gentry 2000: corolla
    36–75(–83) mm). The manifest's body and scaleNote already use 3.6–7.5 cm.
18. **platanilla · body[1] ("Fly and beetle larvae")** — **fixed.** Seifert & Seifert 1976 say *Gillisius* is "abundant as an adult … although the
    larval forms have not been found", and they record *Odontolinus fasciatus* only as adults. The only beetle larvae they describe (*Cephaloleia puncticollis*) live in
    *H. imbricata*. The text now reads "Fly larvae grow in these pools, and adult beetles crawl down into them to feed". "Crawl" replaces "dive" to follow the paper's
    "crawling down the outside of the flower into the water" and "walks down … into the water".
19. **cortez-amarillo · didYouKnow (second checker)** — **fixed**, merged with #4.
20. **cortez-amarillo · body[0] (second checker)** — **fixed** as in #3. The second checker's wording "rehydrated — often after … a cold spell"
    was **rejected**: ACG ties the cold-night cue to the opening of flowers without new water, so putting it inside a rehydration clause would
    conflate two mechanisms. The cold-night case is told in the didYouKnow instead.
21. **cortez-amarillo · body[1] seeds (second checker)** — **fixed**, as in #8.
22. **cortez-amarillo · facts `Pollinators` ("anthophorid")** — **fixed.** Anthophoridae is now part of Apidae (Michener 2007, standard
    classification; not fetched again). The row now reads "Euglossine and other large bees", matching the body.
23. **back.note · "administrative authority"** — **fixed.** Considerando VII of Decreto 40379-MINAE-MAG names SINAC the "autoridad administrativa", which is
    the Management Authority in CITES English. Arts. 1–3 make MAG the Management Authority, with INCOPESCA as Scientific Authority, only for species of
    fisheries or aquaculture interest. The text now reads "its CITES Management Authority for plants".
24. **back.note · "a few in Appendix I"** — **fixed, adapted.** cites.org returned HTTP 403 here as well, so this relies on Hinsley et al. 2018 and the
    standing Appendix I listing of *Paphiopedilum* spp. and *Phragmipedium* spp. GBIF holds 184 Costa Rican records of *Phragmipedium
    longifolium*. The text now reads "a small minority — chiefly slipper orchids such as Costa Rica's *Phragmipedium* — in Appendix I". It does not say "chiefly the slipper
    orchids", because the temperate *Cypripedium* slipper orchids are in Appendix II.
25. **intro · orchid count** — **fixed, adapted.** Belfort-Oconitrillo et al. 2024 (*Lankesteriana* 24(2)): "now includes 1695 species and nine
    forms". The intro now says "nearly 1,700 species", which holds for both the 2023 count (1,684) and the 2024 count (1,695). Both figures and their sources are
    kept in this dossier rather than in the essay, and back.sources stays at its 12-item cap.
26. **intro · "11,000 vascular plants"** — **fixed.** The Jiménez Madrigal 2022 abstract counts species. The text now reads "more than 11,000 species of
    vascular plants".
27. **intro and guaria body[1] · "pays nothing at all"** — **fixed**, and the optional body sentence was adopted. Pemberton 2007 (full text) places
    extrafloral nectaries "at the tops of the ovaries just behind the sepals, and at the base of the ovary" and reports ants collecting that nectar.
    It concludes that the extrafloral nectar "probably functions first to protect the flowers and then the developing fruit". The *Crematogaster* and *Camponotus*
    records come from Damon & Perea-Soriano 2005 as cited by Pemberton; his own ants were undetermined. The intro now says the guaria "pays its pollinators
    nothing at all", and body[1] adds "The plant's only nectar beads from glands behind the sepals and feeds ants, which probably guard
    the flower and its fruit."

No issue was refuted outright. Parts of proposed wordings were declined at #1, #5, #12, #14, #20, #24 and #25, for the reasons given there.

**Re-validation after the revision**
- `node --check src/books/flores.js` passes, and `node scripts/validate-books.mjs flores` reports `✓ flores.js — 6 plates, 0 errors, 0 warnings`.
  The module still exports six plates in order: guaria-morada, platanilla, granadilla-de-monte, labios-de-mujer, cortez-amarillo, nenufar.
- `typeset.html?book=flores` renders 24 sides, all at 100 % scale, with `overflow: []`. The changed pages were reviewed as PNGs:
  `.scratch/flores-fc-p{3,5,7,9,11,13,15,17,19,21}.png` (imprint, intro, the six plate versos, note, glossary).
- Beat timing was checked against the figures in `lab.html`: `.scratch/flores-fc-nym-grid.png`,
  `.scratch/flores-fc-palicourea-elata-strip.png` and `.scratch/flores-fc-handroanthus-ochraceus-strip.png`.

---

## Bilingual edition log (1 November 2026)

The request that made the books bilingual also asked for the author on both covers. The Spanish
edition (`src/books/es/flores.js`) mirrors this manifest key for key; every English change is also
listed, old → new, in `.scratch/bilingual/en-changes.md` for the Spanish sync.

1. **Author.** `byline: { name: 'Josoroma', mark: 'josoroma' }` added: the mark is foil-stamped on
   both boards and printed on the title page. `author` stays the imprint string.
2. **How-to row “Click, tap or swipe”** (round-2 hand-off from the Serpientes how-to repair).
   *Was:* “Turn to the next or previous spread.” *Now:* “Turn forward on the right-hand page, back
   on the left; when one page fills the screen, a tap reads on.” *Why:* the Reader turns forward
   on a tap on the right-hand page and back on the left, and frames a single page when the screen
   is upright (camera aspect under 0.9), where a tap anywhere reads on (`Reader.js` `onTap`), so
   “spread” was wrong there. A no-break space keeps “the screen” together. The icon, which
   `iconFor` picks from the wording, stays “swipe”. The how-to page still sets at 100 %, the row on
   two lines.

`node scripts/validate-books.mjs flores`: 0 errors, 0 warnings. All 24 sides set without overflow,
with the same scales as before the change.

3. **Look-closer name, plate I** (2 November). `labellum` now prints “Labellum (lip)”, the
   figure’s own label; it printed “Labellum”, from the id. *Why:* tapping a look-closer row focuses
   its label in the figure, and the two should name the part in the same words, as every row of
   the Spanish edition does (there pill and row both say «Labelo», lead decision L1). The row’s
   text, “The lip rolls into a funnel…”, now follows the gloss. The name fits the side column on one
   line at full size (171 of 355 design px). Plate I still sets at 97.5 %, typeset with and without
   the name on the same build. `node scripts/validate-books.mjs --lang all --fit`: 0 errors, and the
   same pages and scales in both editions.
