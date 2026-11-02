# Calaveras — research notes and claims audit

Book: **Calaveras — Drawing Skulls: A Constructive Method** (Lámina · Volume III)
Manifest: `src/books/calaveras.js` · Figures: `type: 'skull'` (CONTRACTS §12 III)
Compiled: 2026-11-01, for fact-checking and future revisions.
Revised: 2026-11-01, after two independent fact-checks (see §7, Fact-check log),
and again in the integration round (§9: lesson VI route wording, lesson IV fit)
and for the bilingual edition (§10).

This file is the audit trail for every factual statement in the manifest: where
each number comes from, how derived numbers were computed, taxonomy decisions,
and what remains open. Drawing pedagogy (construction steps, pro tips, common
mistakes, composition advice) is original to this book and is not sourced; it
makes no factual claims beyond the anatomy listed here.

---

## 1. Method

- **Source hierarchy.** Open anatomy textbooks (OpenStax *Anatomy and Physiology*
  2e; Gray 1918), peer-reviewed papers (DOIs below), official conservation
  documents (IUCN, CITES, UNEP/CMS), the Reptile Database, and Costa Rican
  law/institutions (Museo Nacional, Instituto Clodomiro Picado, SINAC via CMS).
- **Conservative values.** Ranges span female–male means rather than extremes;
  every value in the text is prefixed "about", "near" or "up to".
- **Skull vs living head.** Kept strictly apart. Skull (dry bone) measurements
  come from craniometric data; living-head proportions (eye line, eye spacing)
  come from anthropometry of living people and are labelled "living head" or
  "in life" in the text.
- **Craniometric numbers** are summaries of the Howells craniometric data set
  (W. W. Howells; 2,524 crania, 30 populations, 1,368 male / 1,156 female),
  computed here from the public CSV. Non-positive cells were treated as
  missing. Script logic: per-sex mean, SD, 5th–95th percentiles, and per-skull
  ratios averaged.
  - Official host (unreachable during research): https://web.utk.edu/~auerbach/HOWL.htm
  - Mirror used: https://raw.githubusercontent.com/geanes/bioanth/master/inst/extdata/howell.csv
    (R package `bioanth`, which redistributes the Auerbach copy)
  - Data citation: Howells, W. W. (1996). Howells' craniometric data on the
    internet. *American Journal of Physical Anthropology* 101: 441–442.
  - The skulls agent's model (`src/subjects/skulls/human.js`) is built on
    the same Howells means, so figure and text agree.

### Howells summary (mm unless noted)

| Measure | Code | Male mean (SD) | Female mean (SD) | 5–95th pct (M) |
|---|---|---|---|---|
| Max cranial length, glabella–opisthocranion | GOL | 183.2 (7.5) | 174.4 (7.1) | 170–195 |
| Max cranial breadth | XCB | 139.1 (7.1) | 134.2 (6.6) | 128–151 |
| Bizygomatic breadth | ZYB | 135.2 (6.5) | 125.6 (5.8) | 124–146 |
| Basion–bregma height | BBH | 134.6 (6.8) | 128.2 (6.2) | 124–146 |
| Nasal height | NLH | 51.5 (3.8) | 48.2 (3.5) | 45–58 |
| Nasal (aperture) breadth | NLB | 26.8 (2.3) | 25.7 (2.2) | 23–30 |
| Orbit height | OBH | 33.9 (2.3) | 33.4 (2.1) | 30–37 |
| Orbit breadth | OBB | 40.2 (1.9) | 38.7 (1.8) | 37–43 |
| Interorbital breadth (dacryon) | DKB | 21.9 (2.3) | 20.8 (2.4) | 18–26 |
| Biorbital breadth | EKB | 99.2 (3.9) | 95.2 (3.6) | 93–106 |

| Ratio (per skull, averaged) | Male | Female | Used in text as |
|---|---|---|---|
| DKB / OBB | 0.55 | 0.54 | bridge ≈ "half an orbit" |
| NLB / OBB | 0.669 | 0.665 | aperture ≈ "two-thirds" of an orbit |
| OBB / OBH | 1.19 | 1.16 | orbits "six units wide for five high" (1.2) |
| EKB / ZYB | 0.73 | 0.76 | both orbits ≈ three-quarters of cheekbone width (reserve) |
| ZYB / XCB | 0.97 | 0.94 | face usually narrower than cranium; ZYB > XCB in only 17.9 % of crania |
| GOL / BBH | 1.364 | 1.363 | braincase "about 4 : 3" |
| Cranial index XCB/GOL×100 | 76.1 | 77.0 | "three-quarters as wide as long" |

---

## 2. Book-level text

| Claim | Source |
|---|---|
| The jaguar is the largest cat of the Americas | ADW, Nogueira 2009: https://animaldiversity.org/accounts/Panthera_onca/ |
| The skull has 22 bones | OpenStax A&P 2e §7.2 (8 cranial + 14 facial): https://openstax.org/books/anatomy-and-physiology-2e/pages/7-2-the-skull |
| Soft tissue is thin over the brow, nasal bridge and cheekbones (bone shows through) | Qualitative. Rhinion is the thinnest midline facial soft-tissue site (3.07 ± 0.72 mm; Ayoub et al. 2019, https://doi.org/10.1016/j.forsciint.2018.10.021; also Wang et al. 2016). Brow/cheekbone values not individually verified; see Stephan & Simpson 2008, https://doi.org/10.1111/j.1556-4029.2008.00852.x |
| Spanish *calavera* descends from Latin *calvaria* (from *calvus*, "bald") | Corominas & Pascual 1984, *DCECH* I: 757–758, as cited in https://en.wiktionary.org/wiki/calavera (RAE DLE blocked automated access; RAE 2001 gives *calvario* < Lat. *calvarium*) |
| Calvaria = skullcap (frontal, parietal, occipital vault) | Standard anatomical usage; Gray 1918 |
| Normae: frontalis, lateralis, verticalis, occipitalis, basalis | Gray 1918 (PubAnnotation copy): https://pubannotation.org/docs/sourcedb/GrayAnatomy/sourceid/46 ; Cunningham's Manual (OUP) |
| Human remains of pre-Hispanic cultures are national archaeological heritage in Costa Rica | Ley 6703 (1981), Art. 1: https://www.museocostarica.go.cr/wp-content/uploads/comision-arqueologica-nacional/ley-6703.pdf |
| Jaguar on CITES Appendix I (international commercial trade banned) | UNEP/CMS 2020 §6.2 ("placed on CITES Appendix I in 1975 … international trade … not permitted"); MSW1 via Plazi (CITES Appendix I) |
| Snakebite: antivenom is the treatment; avoid tourniquets, cuts, suction, ice; never handle snakes | WHO fact sheet (17 Sept 2026): https://www.who.int/news-room/fact-sheets/detail/snakebite-envenoming ; Maduwage, Kodagoda Gamage & Gutiérrez 2024, *Toxicon* 238: 107582, https://doi.org/10.1016/j.toxicon.2023.107582 ; ICP history of antivenoms: https://www.icp.ucr.ac.cr/sites/default/files/inline-files/LOS%20ENVENENAMIENTOS%20POR%20MORDEDURAS%20DE%20SERPIENTES%20EN%20COSTA%20RICA.pdf |

---

## 3. Plates

### I · Frontal View (`frontal`) — `{ subject: 'human', lesson: 'frontal' }`

| Text | Value | Source |
|---|---|---|
| Front view oval, wider above than below | XCB > ZYB in 82 % of crania; jaw narrower still | Howells (above); Gray 1918 ("somewhat oval outline"); Mussabekova et al. 2024 |
| Skull width | about 13–14 cm | Howells XCB: F 134, M 139 mm |
| Orbit width × height | about 4 × 3.4 cm | Howells OBB 38.7–40.2, OBH 33.4–33.9 mm; EyeWiki: height 35, width 40 mm, volume 30 cc, https://eyewiki.org/Bony_Anatomy_of_the_Orbit |
| Orbits are rounded squares, wider than tall—"rarely a circle" | OBB/OBH 1.16–1.19; orbital index (OBH/OBB × 100) 85.4 ± 5.7 (n = 2,524); index ≥ 95 in 2.9 % of crania, = 100 in 0.5 % (12 crania) | Howells (recomputed 2026-11-01 from the CSV mirror); orbit opening "approximately quadrangular" (anatomy.app). Hence "rarely", not "never" |
| Bone between the orbits | about 2 cm; about half an orbit | Howells DKB 20.8–21.9 mm; DKB/OBB 0.54–0.55 |
| Living face: eyes about an eye-width apart; the bony bridge is "narrower than the gap between the eyes of the living face" | en–en 31.9–33.2 mm vs ex–en 33.4–33.9 mm (means); bony DKB ≈ 21 mm ≈ two-thirds of en–en ≈ 32 mm (bone vs soft tissue, so the text says "narrower", not "far narrower") | Karaca Saygili et al. 2016, Folia Morphol 75(4): 512–517, https://doi.org/10.5603/FM.a2016.0028 ; orbital canon tested in Farkas et al. 1985, PMID 3883374 |
| Nasal aperture pear-shaped (piriform), narrow end up | — | Gray 1918: "pyriform in shape, with the narrow end directed upward" |
| Aperture ≈ two-thirds of an orbit wide | NLB/OBB 0.667 | Howells |
| Jaw angles inside the cheekbones, about three-quarters of their width | bigonial 95–104 vs bizygomatic 124–134.5 mm (go–go/zy–zy ≈ 0.76–0.78) | Mussabekova et al. 2024, J Oral Biol Craniofac Res 14(4): 370–377, https://doi.org/10.1016/j.jobcr.2024.04.004 (300 dry skulls) |
| Eye line near half the height, crown to chin (living head) | v–en 101.6 / 109.7 mm vs en–gn 104.1 / 113.2 mm (F/M) → eye line ≈ 49 % down | Karaca Saygili et al. 2016 (n = 200; exact equality in only 4–8 %); Farkas et al. 1985 (vertical canons are approximations) |
| The living eye sits high and outward in its socket | CT of 375 living adults | Guyomarc'h et al. 2012, J Forensic Sci 57(5): 1271–1275, https://doi.org/10.1111/j.1556-4029.2012.02075.x ; Stephan, Huang & Davidson 2009 (central placement rejected in 11 of 13 cadavers) |
| Below the nasal bones the nose was cartilage (absent on the skull); the aperture hangs below the nasal bones | The paired nasal bones (with the frontal processes of the maxillae) form the bony bridge and survive on the skull | OpenStax §7.2: the paired nasal bones form the bony bridge of the nose and support the cartilages of its lateral walls |

Scale note "about 13–14 cm wide" = Howells XCB means.
Reserve facts cut for page fit (restorable): cheekbone width about 12.5–13.5 cm
(ZYB); nasal aperture width about 2.5 cm (NLB); both orbits span ≈ 0.73–0.76 of
cheekbone width (EKB/ZYB).

### II · Three-Quarter, Open Jaw (`open-jaw`) — `{ subject: 'human', lesson: 'open-jaw' }`

| Text | Source |
|---|---|
| Hinge at the condyle, in a socket just in front of the ear canal | OpenStax §7.2: mandibular fossa "just in front of the external acoustic meatus"; articular tubercle "immediately anterior to the mandibular fossa" |
| Early opening is mostly rotation, but the condyle already begins to slide; as the gape widens it glides forward (and down) onto the articular eminence/tubercle, "the ridge ahead of the socket" | Lindauer, S. J., Sabol, G., Isaacson, R. J., & Davidovitch, M. (1995). Condylar movement and mandibular rotation during jaw opening. Am J Orthod Dentofacial Orthop 107(6): 573–577, https://doi.org/10.1016/s0889-5406(95)70099-4 , PMID 7771361: all subjects showed both translation and rotation of the condyle as opening began; none had a centre of rotation at the condylar head; the instantaneous centre moves throughout opening. Replaces the older textbook model (Meyer 1990, Clinical Methods ch. 163: "simple rotation" for the first 25 mm), which the text no longer uses |
| On opening, the chin swings down and back; only the joint moves forward | Derived from the model's landmarks (`src/subjects/skulls/human.js`: condylion z 1.3 / y −0.82 cm; incisal point z 10.2 / y −4.95 cm, i.e. the condyles sit ≈ 9 cm behind and ≈ 4 cm above the incisors). A 35° rotation about the condyle moves the incisal point ≈ 4 cm back and ≈ 4.4 cm down; a ≈ 1 cm forward glide of the condyle offsets only part of that, so the chin still travels down and back |
| Maximum gape about 49 mm; ≈ three finger-widths; 48.8 mm mean in 140 adults | Zawawi et al. 2003, J Can Dent Assoc 69(11): 737–741, PMID 14653940 (3-finger width 47.0–47.3 mm, n.s. from MMO) |
| Closers: masseter, temporalis, medial pterygoid; openers: lateral pterygoid, digastric | OpenStax A&P 2e §11.3, Table 11.4 and Fig. 11.12, https://openstax.org/books/anatomy-and-physiology-2e/pages/11-3-axial-muscles-of-the-head-neck-and-back |
| Masseter slung from the cheekbone arch to the jaw's angle | OpenStax Table 11.4 (origin zygomatic arch; insertion mandible); standard insertion at angle/ramus |
| Temporalis grips the coronoid process, passing under the arch | Kenhub "Temporal muscle" (insertion: apex and medial surface of coronoid), https://www.kenhub.com/en/library/anatomy/temporal-muscle ; OpenStax §7.2 (coronoid "provides attachment for one of the biting muscles") |
| Adult set 32 teeth, 16 per arch (reserve) | ADA MouthHealthy eruption charts, https://www.mouthhealthy.org/all-topics-a-z/eruption-charts |

Scale note "full gape about 5 cm at the incisors" = Zawawi 48.8 mm.
Three-quarter construction (far orbit narrows behind the nasal bridge, guides
wrap as arcs) is perspective, not a factual claim. The three construction
steps are worked in profile because the drawn panels (`steps.js` openJaw) are
side views; step 1 says so ("Work it out in profile first").

### III · Profile (`profile`) — `{ subject: 'human', lesson: 'profile' }`

| Text | Source |
|---|---|
| Skull length about 17.5–18.5 cm | Howells GOL F 174.4, M 183.2 mm |
| Braincase about 4 units long for 3 high | Howells GOL/BBH = 1.363 (height measured basion–bregma) |
| Frankfort plane: top of ear canal (porion) to lowest point of orbit rim (orbitale) | Park et al. 2020, Anat Cell Biol 53(1): 21–26, https://doi.org/10.5115/acb.19.136 |
| Agreed by craniologists at Frankfurt in the 1880s | Garson 1885, "The Frankfort Craniometric Agreement…", J Anthropol Inst 14: 64–83, https://doi.org/10.2307/2841484 (agreement of 1882, published 1884; text says "1880s" to avoid the date dispute) |
| Level Frankfort ≈ skull "much as it does in life" | Hedged: FH approximates natural head position with individual variation (reported range about +9° to −7°) |
| Extended backwards, the line passes close to the occipital bump (external occipital protuberance) | Park et al. 2020: orbito-occipital line (orbitale to inion) vs Frankfort line −0.5° ± 2.2°, 83.0 % within ±3°, 37.1 % within ±1° (CT of 170 Korean adults aged 21–30). Over ≈ 17 cm from orbitale to inion, 3° ≈ 9 mm, so "close", not "very close"; the distance to the inion itself was not measured |
| Ear canal just behind the jaw joint | OpenStax §7.2 (mandibular fossa just in front of the meatus) |
| Mastoid behind and below the ear canal | OpenStax §7.2 ("just behind your earlobe"); Gray 1918 |
| Cheekbone arch runs forward almost level; ends just ahead of the ear canal | Zygomatic arch = temporal process of zygomatic + zygomatic process of temporal (OpenStax §7.2); its root lies above the mandibular fossa. Orientation "almost level" is a qualitative drawing statement |
| Orbit rim set back in profile | Turvey & Golden 2012, Oral Maxillofac Surg Clin N Am 24(4): 525–536, https://doi.org/10.1016/j.coms.2012.08.003 (lateral orbital rim is the least projected) |
| Below the nasal bones, the nose and the outer ears are cartilage, absent from the skull | OpenStax §7.2 (nasal bones form the bony bridge; they support the lateral nasal cartilages); outer ear (auricle) cartilage: standard anatomy |

### IV · The Bones (`bones`) — `{ subject: 'human', lesson: 'bones' }`

| Text | Source |
|---|---|
| 8 cranial bones: frontal, 2 parietal, 2 temporal, occipital, sphenoid, ethmoid | OpenStax §7.2 ("paired parietal and temporal bones, plus the unpaired frontal, occipital, sphenoid, and ethmoid") |
| 14 facial bones: paired maxilla, zygomatic, nasal, lacrimal, palatine, inferior nasal concha; single vomer and mandible | OpenStax §7.2 |
| Only the mandible moves; twenty-one bones lock along sutures, the mandible on its hinge (animation beat) | OpenStax §7.2 ("the only moveable bone of the skull"; it joins the skull at the temporomandibular joint, a synovial joint, not a suture) |
| Main sutures coronal, sagittal, lambdoid, squamous; coronal joins frontal to both parietals; sagittal between parietals | OpenStax §7.2 (sagittal runs along the top midline, so a side view shows the coronal, lambdoid and squamous sutures: lesson step 1) |
| Sphenoid: winged keystone; "it meets twelve bones, every other cranial bone among them" | Gray 1918, Os Sphenoidale, Articulations: "The sphenoid articulates with twelve bones": vomer, ethmoid, frontal, occipital, plus paired parietal, temporal, zygomatic and palatine (https://pubannotation.org/docs/sourcedb/GrayAnatomy/sourceid/35). That is all 7 other cranial bones and 5 facial bones; not the nasals, lacrimals, inferior conchae or mandible. OpenStax's wording (that it joins almost every other bone of the skull) overstates the count, so the text no longer uses it |
| Temporal bone holds ear canal, jaw socket, mastoid (reserve look-closer) | OpenStax §7.2 |
| Not counted: hyoid and six ear ossicles | OpenStax §7.2 (hyoid "does not contact any other bone and thus is not part of the skull"); §14.1 (three ossicles per middle ear: malleus, incus, stapes), https://openstax.org/books/anatomy-and-physiology-2e/pages/14-1-sensory-perception |
| Many skulls carry extra bones in their sutures (Wormian bones) | Bellary et al. 2013, Clin Anat 26(8): 922–927, https://doi.org/10.1002/ca.22262 (most often lambdoid/coronal); prevalence 20–49 % in skull series |
| Frontal bone began as two halves; metopic suture closed by nine months in one CT study | Vu et al. 2001, J Craniofac Surg 12(6): 527–532, https://doi.org/10.1097/00001665-200111000-00005 (159 patients; 10/10 closed at 9 months; all older children closed) |
| From above, about three-quarters as wide as long | Howells cranial index 76.1 (M), 77.0 (F) |
| Parietals form most of the vault's roof and sides | Gray 1918 ("by their union, the sides and roof of the cranium") |
| Brain size about 1,300 cm³ on average (reserve) | Smithsonian Human Origins, *Homo sapiens*: https://humanorigins.si.edu/evidence/human-fossils/species/homo-sapiens |

The skulls agent models all 22 bones (`HUMAN_BONES` in `src/subjects/skulls/human.js`),
so the beat "eight cranial bones and fourteen facial" matches the figure.

### V · Jaguar (`jaguar`) — `{ subject: 'jaguar', lesson: 'jaguar' }`

Taxonomy: *Panthera onca* (Linnaeus, 1758); original combination *Felis onca*
Linnaeus, 1758, Syst. Nat. 10th ed. 1: 42; type locality Pernambuco, Brazil
(Honacki et al. 1982, MSW1, via Plazi https://tb.plazi.org/GgServer/xhtml/03AB87D2FFFF5873B9AC514FFCAEE494 ;
UNEP/CMS 2020 lists *Felis onca* as synonym). Subspecies are not used in the text.

| Text | Source |
|---|---|
| Largest cat in Costa Rica's forests / of the Americas | ADW (Nogueira 2009) |
| Short, broad muzzle; massive jaws | ADW Felidae (Etnyre, Lande & Mckenna 2011): "short rostrum and tooth row, which increases bite force", https://animaldiversity.org/accounts/Felidae/ ; ADW *P. onca*: "large, square jaws" |
| Sagittal crest anchors the temporalis, the main jaw muscle | ADW Carnivora (Myers & Poor): "primary muscle powering the jaw is the temporal … sagittal crest", https://animaldiversity.org/accounts/Carnivora/ |
| Arches flare wide to let the temporalis pass beneath | Temporalis passes deep to the zygomatic arch (Kenhub; general mammalian anatomy) |
| Upper canines carry about 4 cm of enamel; "taller than our orbit" | Del Moral Sachetti et al. 2011, Acta Zool Mex 27(3): 757–776, Table 1: C1H (enamel height of upper canine) sample means 3.62–4.30 cm; human OBH 3.3–3.4 cm (Howells) |
| Carnassials: upper P4 + lower m1, shearing | ADW Carnivora ("enlarged fourth upper premolar and first lower molar … efficient shear") |
| Proportion: "Upper canine: crown about one and a half times the upper carnassial's length" | Del Moral Sachetti et al. 2011, Cuadro 1 (p. 763): C1H (enamel height of the upper canine) 3.62–4.30 cm vs Pm4L (anteroposterior length of upper P4) 2.56–2.58 cm, so C1H/Pm4L = 1.41–1.67 across the four samples |
| (Retired) "Carnassials bite about 3× harder than canines (nearer the hinge)" | Misread. The paper's canine force FMC = 2(π²E·A/c²·C1H²) is the Euler buckling load of the canine; its carnassial force FMM = 2σ·A(Pm4) is the simple-compression strength of P4's cross-section (p. 765). The "3 veces" is the mean ratio of these two tooth-strength estimates (p. 767); in the discussion the authors explain it as the pyramidal premolars resisting simple compression about three times better than the canines (p. 772), not as a lever-arm effect. Across subspecies it ranges from 3.74 (*P. o. hernandesii*) to 2.11 (*P. o. centralis*, which the paper places from northern Colombia to Costa Rica: 774.09 N canine vs 1,638 N carnassial; p. 767 and Cuadro 3, p. 768). The text no longer prints the ratio |
| Jaguars often kill with a bite to the skull; estimates of canine bite force run from about 680 to 1,000 N | Skull bite: Del Moral Sachetti et al. 2011 (peccary neurocranium fracture; 15 skulls); ADW (skull strike); UNEP/CMS 2020 §4.4. Low estimate: Del Moral Sachetti et al. 2011, mean canine force 681.56 N, which the authors describe as a conservative, buckling-based estimate (p. 772); 774.09 N for *P. o. centralis*. High estimate: Wroe, S., McHenry, C., & Thomason, J. (2005). Bite club: comparative bite force in big biting mammals and the prediction of predatory behaviour in fossil taxa. Proc R Soc B 272: 619–625, https://doi.org/10.1098/rspb.2004.2986 (PMC1564077), Table 1: *P. onca* 1,014 N at the canines (dry-skull lever method), BFQ 137, body mass 83.2 kg |
| Transverse hinge; jaw moves almost purely up and down | ADW Carnivora ("transverse glenoid fossa … dominant motion … dorsal-ventral") |
| Human jaw can also move side to side | OpenStax Table 11.4 (pterygoids move the lower jaw side-to-side) |
| Orbit open behind: two bony points (postorbital processes) joined in life by a ligament | Heesy 2005, J Morphol 264: 363–380, https://doi.org/10.1002/jmor.10334 (postorbital ligament vs bar); Noble, Kowalski & Ravosa 2000, J Zool 250: 405–418, https://doi.org/10.1111/j.1469-7998.2000.tb00784.x (complete bars occur in smaller felids); 2019 radiographic study of *P. leo* (incomplete bony orbit) |
| Teeth: 30 (I 3/3, C 1/1, P 3/2, M 1/1) vs adult human 32 | ADW Felidae ("3/3, 1/1, 3/2, 1/1 = 30"); ADA (32) |
| Skull length "about 24 cm (Mexico)–30 cm (Argentina)" (facts row and scale note) | Del Moral Sachetti et al. 2011, Cuadro 1 (p. 763): "longitud máxima del cráneo", defined in footnote *1 as anteroposterior length from the upper incisor to the occipital condyle (not greatest length). Sample means: 23.70 ± 2.54 cm (Zoológico Miguel Álvarez del Toro, Chiapas, Mexico, *P. o. goldmani*, n = 3), 27.10 cm (Peru, n = 1), 28.50 ± 2.01 cm (Bolivia, n = 4), 29.50 ± 1.53 cm (Argentina, *P. o. palustris*, n = 7). No Central American skulls in the sample; Central American jaguars are smaller than Pantanal/Argentine cats, so the text names the provenance of both ends of the range |
| Mass, Central America: males ~56 kg, females ~41 kg | UNEP/CMS 2020 §4.4, citing Jedrzejewski et al. 2011 |
| Status: Near Threatened (IUCN); endangered in Costa Rica | Quigley et al. 2017 (errata 2018), IUCN e.T15953A123791436, https://www.iucnredlist.org/species/15953/123791436 ; UNEP/CMS 2020 Table (Costa Rica: Endangered, Wildlife Conservation Law regulation 32633/2005); SINAC classification reported by Delfino.cr 2025 |
| (Context) Costa Rica proposed the jaguar's CMS Appendix I & II listing, adopted at COP13 (Feb 2020) | UNEP/CMS/COP13/Doc.27.1.2, https://www.cms.int/sites/default/files/document/cms_cop13_doc.27.1.2_proposal-jaguar_e.pdf ; IISD ENB COP13 daily report 20 Feb 2020 |

`status` is `null` per the book brief (lessons carry a level badge); the IUCN
category appears in the facts row instead.

Construction step 1 and the body describe a long braincase oval and a short
muzzle box, as drawn in panel 01 (`steps.js` jaguarLesson) and in the 3D
construction layer ("Braincase oval, muzzle box and arch flare").

Citation note: the paper's byline prints "Jorge Santiago Vázquez"; its own
suggested citation and this book use "J. S. Vázquez"; the journal's site lists
"Santiago Vázquez, J." The DOI is https://doi.org/10.21829/azm.2011.273779 .

### VI · Skull & Snake (`skull-and-snake`) — `{ subject: 'human', lesson: 'skull-and-snake', snake: { species: 'bothriechis-schlegelii' } }`

Taxonomy (important):
- Costa Rica's eyelash palm-pitvipers (all but the Pacific Talamanca slopes) are
  ***Bothriechis nigroadspersus* (Steindachner, 1870)** — original combination
  *Bothrops (Teleuraspis) nigroadspersus* Steindachner, 1870; holotype NMW 18811,
  "Central America". Long treated as a synonym of *B. schlegelii*; revalidated by
  Arteaga et al. 2024 (Evol Syst 8(1): 15–64, https://doi.org/10.3897/evolsyst.8.114527 ;
  400 specimens, 818 records, DNA from 80 individuals). Reyes-Velasco 2024
  (Herpetozoa 37: 305–318, https://doi.org/10.3897/herpetozoa.37.e131965) rejects
  most of the new species but **keeps *B. nigroadspersus*** (valid: *B. nigroadspersus*,
  *B. schlegelii*, *B. supraciliaris*). The Reptile Database follows this:
  https://reptile-database.reptarium.cz/species?genus=Bothriechis&species=nigroadspersus
- *B. schlegelii* (Berthold, 1846) sensu stricto: holotype ZFMK 32554, Popayán,
  Colombia; endemic to Colombia under Arteaga et al. 2024.
- *B. supraciliaris*: Pacific slopes of the Cordillera de Talamanca (SW Costa Rica,
  W Panama), per Arteaga et al. 2024. Blotched Eyelash-Pitviper, "bocaracá
  manchada"; type locality in the mountains near San Isidro del General, San
  José Province (Reptile Database). So under both current treatments Costa Rica
  has **two** eyelash-pitvipers; the text calls *B. nigroadspersus* "the more
  widespread of Costa Rica's two eyelash-pitvipers". The Reyes-Velasco 2024
  abstract keeps only three species of the group valid: *B. nigroadspersus*,
  *B. schlegelii* and *B. supraciliaris*.
- The figure param keeps `'bothriechis-schlegelii'` (a frozen figure id). The text
  names the current species; any figure title should follow the text.

Spanish names (Costa Rica): bocaracá, toboba de pestañas, víbora de pestañas,
oropel (yellow morph). English: Central American Eyelash-Pitviper (Arteaga et
al. 2024; Reptile Database).

| Text | Source |
|---|---|
| Adult length up to about 90 cm | Arteaga et al. 2024: max total length 916 mm (females), 626 mm (males) |
| Two raised, spine-like supraciliary ("eyelash") scales | Arteaga et al. 2024, diagnosis of *B. nigroadspersus* |
| Humid forest, sea level to ~1,430 m | Arteaga et al. 2024: evergreen lowland/foothill forest, plantations, gardens; 0–1,434 m |
| Live young, 6–23 per litter | Arteaga et al. 2024 (gestation 150–166 days); Reptile Database ("ovoviviparous") |
| Broad, triangular head on a slender neck | General pitviper morphology; drawing description |
| A big female ≈ five skull-lengths | Derived: 916 mm ÷ Howells GOL ≈ 180 mm ≈ 5.1 |
| Until 2024 filed under *B. schlegelii*; regained its 1870 name | Arteaga et al. 2024; Reyes-Velasco 2024 |
| Bite = emergency; hospital; antivenom; no tourniquets, cuts, suction or ice | WHO 2026; Maduwage et al. 2024; ICP |

Composition advice (overlaps, one unbroken loop, tangents, focal point at a
third) is drawing convention, not factual claim. The route described in the
body, steps and beats is the figure's own closed path (`src/subjects/skulls/snake.js`
CONTROL): out of the left orbit, over the brow and vault, behind the ear,
round the mastoid, forward *below* the cheekbone arch (outside the ramus),
up across the cheek and back into the socket at its lower-outer corner. The
snake never passes under the arch: from 3.75 to 4.2 s its head is 2.2–2.8 cm
below it (see §9). Beat times were measured from the snake's `eye` label
anchor in the skull frame (lab, 2026-11-01): in the orbit at 0 (x 3.75, y 1.52,
z 6.96 cm), on the brow at 0.5 (y 3.88, z 10.57), on the vault at 1.3 (y 10.38),
behind the ear at 2.6 (z −6.15), round the mastoid at 3.2–3.5 (y −1.2 to −2.7,
z −4.8 to −2.1), below the arch at 3.75–4.2 (y −2.65 to −2.91 against the arch's
−0.12 to −0.75), on the cheek at 4.4–4.5 (y −2.07 to −1.57, z 7.1–7.8) and at
the orbit's lower-outer corner at 4.7 (x 4.31, y −0.20, z 8.24).

---

## 4. Theme and typography

- Theme per brief: black cloth `#151515`, silver-white foil `#dcdcd8`, pure white
  paper `#ffffff`, ink `#111111`, vermilion accent `#e34234`, endpaper motif
  `grid` (vermilion on white). Fonts: display Oswald, body EB Garamond, label
  IBM Plex Sans Condensed, mono IBM Plex Mono.
- Colophon names the faces actually used (Oswald, EB Garamond, IBM Plex);
  Cormorant Garamond is not used in this volume, so the generic colophon line
  was adapted.
- Only Latin-1 and General Punctuation glyphs are used (no latin-ext fetch).

## 5. Layout fit (verified 2026-11-01)

Rendered with `typeset.html?book=calaveras&page=all` (WebGPU and `--webgl`):
24 sides, **0 overflow**; lesson versos fit at 93–98 % scale after the
typesetter's latest lesson layout. Lessons deliberately sit near the lower
CONTRACTS budgets (body 121–130 words, 4 facts, 2 look-closer notes, 2
mistakes, one-line ledes and proportions); with the maximum budgets the lesson
verso overflowed by up to 356 px at 85 %. Reserve facts are listed per plate
above.

Re-checked after the fact-check revision (same day): 24 sides, **0 overflow**
on WebGPU and `--webgl`; lesson versos now fit at 90 % (frontal, open-jaw,
jaguar) and 93 % (profile, bones, skull-and-snake), above the typesetter's
85 % floor. Bodies run 124–135 words. `node scripts/validate-books.mjs
calaveras`: 0 errors, 0 warnings.

Re-checked after the integration round (§9, same day), with
`typeset.html?book=calaveras&page=all` at 1024, 1536 and 2048 px: 24 sides,
**0 overflow**; lesson versos at 90 % (frontal, open-jaw, jaguar), 92.5 %
(profile, skull-and-snake) and **95 % (bones)**, which had slipped to the
90 % QA floor after the review-round edits. Sources page 97.5 %, every other
side 100 %. Bodies run 124–136 words.

## 6. Open questions

1. **Cross-book naming (text resolved; figure strings open).** Volume I
   (Serpientes) plate II also prints *Bothriechis nigroadspersus* ("formerly
   *B. schlegelii*") while keeping the `bothriechis-schlegelii` figure id, so
   both books' texts agree. Reader-visible strings inside the figure modules
   still print the old name (see the fact-check log, item 3): they belong to the
   skulls and snakes agents.
2. **Jaguar skull length for Costa Rica.** No Costa Rica-specific craniometric
   series found; the 24–30 cm range is from Mexican and South American samples
   (Del Moral Sachetti et al. 2011), measured upper incisor to occipital
   condyle, and the text now names that provenance. Hoogesteijn & Mondolfi 1996
   has regional skull data but was not accessible; a Central American series
   (MNCR or Smithsonian specimens) would let the row say "about N cm in Costa
   Rica".
3. **Jaguar postorbital bar.** Incomplete bars in large felids are supported
   by Noble et al. 2000 and a lion radiography study; a jaguar-specific
   statement was not located. Worth a museum-specimen check (MNCR collection).
4. **Costa Rica national list.** The CMS table cites regulation 32633/2005;
   the current SINAC list (R-SINAC-CONAC resolutions, 2017 onward) still
   classes the jaguar as endangered per press reports, but the resolution text
   was not retrieved.
5. **Brow and cheekbone soft-tissue depths** are qualitatively thin; exact
   values (Stephan T-Tables) were paywalled.
6. **IUCN.** Latest global assessment found is 2017 (errata 2018); check for a
   newer assessment before reprinting.

---

## 7. Fact-check log (2026-11-01)

Two independent fact-checkers reviewed `src/books/calaveras.js`. Every issue
was re-verified against its source before any change was made (sources
re-read this time: Lindauer et al. 1995 abstract on PubMed; the full
Del Moral Sachetti et al. 2011 PDF; Wroe et al. 2005 on PMC; Gray 1918 via
PubAnnotation; OpenStax §7.2; Park et al. 2020; Reyes-Velasco 2024 full text;
Reptile Database accounts of *B. nigroadspersus* and *B. supraciliaris*; the
Howells CSV, recomputed). Claims about panels and animations were checked
against `src/subjects/skulls/{steps,lessons,snake}.js` and against lab
captures. Meyer 1990 (NCBI Bookshelf) could not be re-read (CAPTCHA); it is no
longer cited. The web-search budget ran out during this revision, so no new
sources were searched for; all checks used direct fetches of the cited pages.

**Resolution key.** *Fixed*: the manifest now says what the source and the
figure support. *Fixed (variant)*: fixed, but with wording that differs from
the checker's suggestion, for the reason given. *Deferred*: confirmed, but the
fix belongs in a file this book's author does not own; the owner is named.
No issue was rejected outright. Two suggested wordings were partly rejected
(items 17 and 23), for the reasons given.

| # | Location | Sev. | Resolution | Verification / source |
|---|---|---|---|---|
| 1 | open-jaw: body[1], facts[1], lookCloser condyle, beat 1.25, sources | error | **Fixed.** "At first it mostly rotates, already beginning to slide; as the gape widens the condyle glides forward…"; fact row `Early opening: mostly rotation, some glide`; look-closer "Rotates and glides at once; the glide grows as the jaw opens wide."; beat "the condyle mostly rotates, already starting to glide"; Meyer 1990 → Lindauer et al. 1995. Figure side deferred: `lessons.js` beats 0.5/1.3 and `jawMotion` (pure rotation until 32 % open) still teach rotation first (skulls agent) | Lindauer et al. 1995, PMID 7771361: every subject showed both translation and rotation of the condyle as opening began; none had a centre of rotation at the condylar head |
| 2 | jaguar: lesson.proportions[1] | error | **Fixed (variant).** Replaced by a drawing proportion from the same table: "Upper canine: crown about one and a half times the upper carnassial's length." The checker's first wording ("bite harder than the canines") is true but is not a proportion, and this list holds drawing proportions. §3 V now describes the 3× correctly | Del Moral Sachetti et al. 2011, pp. 763 (Cuadro 1), 765 (FMC by Euler buckling; FMM = 2σA of P4), 767–768 (Cuadro 3: ratio 2.11 *centralis* to 3.74 *hernandesii*), 772 |
| 3 | skull-and-snake figure strings | error | **Deferred (skulls and snakes agents).** Still printing *B. schlegelii*: `src/subjects/skulls/snake.js` beadSnake (the `head` label's detail, and the part name used as the SVG `<title>`) and `src/subjects/skulls/lessons.js` LESSONS['skull-and-snake'] (the `snake` layer hint). Also `src/subjects/snakes/species.js` entry `'bothriechis-schlegelii'` (`scientific: 'Bothriechis schlegelii'`), which feeds the snake figure's title and therefore the part name when the real snake loads. Suggested: "Central American eyelash-pitviper (*Bothriechis nigroadspersus*)", "Bothriechis nigroadspersus", "Bothriechis nigroadspersus, golden "oropel" morph"; the param id `bothriechis-schlegelii` stays | Reptile Database (*B. nigroadspersus*, previously a synonym of *B. schlegelii*, revalidated by Arteaga et al. 2024); Reyes-Velasco 2024 abstract |
| 4 | frontal: body (119 words) | budget | **Fixed.** 125 words (items 9 and 12 add 6) | `node scripts/validate-books.mjs calaveras` → 0 errors |
| 5 | skull-and-snake: body[1] | imprecise | **Fixed.** "the more widespread of Costa Rica's two eyelash-pitvipers" | Reyes-Velasco 2024 (three valid species, two of them Central American: *B. nigroadspersus* and *B. supraciliaris*); Reptile Database (*B. supraciliaris*, Bocaracá manchada, Costa Rica and Panama) |
| 6 | jaguar: didYouKnow | imprecise | **Fixed.** "…estimates of their canine bite force run from about 680 to 1,000 newtons." Wroe et al. 2005 added to the plate sources | Del Moral Sachetti et al. 2011, p. 772 (a conservative estimate); Wroe et al. 2005, Table 1 (*P. onca* 1,014 N, BFQ 137, 83.2 kg) |
| 7 | jaguar: facts[1], scaleNote | imprecise | **Fixed.** `about 24 cm (Mexico)–30 cm (Argentina)`; scale note likewise; the incisor-to-condyle definition is in §3 V | Del Moral Sachetti et al. 2011, Cuadro 1 and footnote *1 (p. 763); specimen provenance p. 761 |
| 8 | bones: body[1], lookCloser sphenoid | imprecise | **Fixed (variant).** Body: "it meets twelve bones, every other cranial bone among them" (the suggested "every other cranial bone—twelve bones in all" could be read as twelve cranial bones); look-closer: "it meets twelve bones, every other cranial one." | Gray 1918: "The sphenoid articulates with twelve bones" |
| 9 | profile: body[1]; frontal: lookCloser nasal-aperture | imprecise | **Fixed.** "below the nasal bones, the nose and the outer ears are cartilage"; "A pear, narrow end up; below the nasal bones the nose was cartilage." The frontal body also hangs the aperture "below the nasal bones" | OpenStax §7.2 (nasal bones form the bony bridge and support the lateral nasal cartilages) |
| 10 | bones: beat 0 | imprecise | **Fixed.** "Assembled: twenty-one bones locked along sutures, the mandible on its hinge." | OpenStax §7.2 (mandible the only moveable bone; temporomandibular joint) |
| 11 | profile: body[1] "very close" | style | **Fixed.** "passes close to the bump" | Park et al. 2020: −0.5° ± 2.2°, 83.0 % within ±3°, 170 Korean adults aged 21–30 |
| 12 | frontal: body[1] "far narrower" | style | **Fixed.** "narrower than the gap between the eyes of the living face, where they sit about an eye-width apart" | Howells DKB 20.8–21.9 mm vs Karaca Saygili et al. 2016 en–en 31.9–33.2 mm (≈ two-thirds) |
| 13 | frontal: lookCloser orbit "never" | style | **Fixed.** "rarely a circle." The checker was unsure; the recomputation confirms it | Howells CSV (n = 2,524): orbital index 85.4 ± 5.7; ≥ 95 in 2.9 %; = 100 in 12 crania (0.5 %) |
| 14 | bones: steps[2] lists orbits as bones | style | **Fixed.** The step now pulls the bones apart (item 20); no orbit is called a bone | OpenStax §7.2 (seven skull bones contribute to the walls of each orbit) |
| 15 | figure label ids `temporalis`, `masseter` (open-jaw) and `head` (skull-and-snake) not canonical | style | **Deferred (lead, CONTRACTS §6 append; or skulls agent to rename).** No manifest change needed: every manifest `lookCloser` id is canonical and the validator passes | `docs/architecture/CONTRACTS.md` §6; `lessons.js` openJaw labels; `snake.js` beadSnake label |
| 16 | open-jaw: steps vs panels 01–03 | error | **Fixed (text side).** Steps now follow the side-view panels and the module's step titles: "Ball and hinge point", "Swing the jaw open", "Refine the open skull"; step 1 opens with "Work it out in profile first." Redrawing the panels in three-quarter view is optional and belongs to the skulls agent (`steps.js` openJaw) | `steps.js` openJaw, STEP_TITLES['open-jaw']; typeset page 9 re-rendered |
| 17 | open-jaw: steps[1], body[1] "down and forward" | error | **Fixed (variant).** Steps: "the chin travels down and back along an arc. For a wide gape, slide the hinge forward and slightly down as well." Body: "The chin swings down and back; only the joint moves forward." The suggested body wording ("beyond that the condyle also glides forward") was not used: it brings back a rotation-only first phase, which item 1 retires. Its source (the Wikipedia TMJ article, which gives a rotation-only phase of about 20 mm) is weaker than Lindauer et al. 1995 | Geometry from `human.js` landmarks (§3 II): a 35° rotation moves the incisal point ≈ 4 cm back and ≈ 4.4 cm down |
| 18 | open-jaw: proTip vs mistakes[1] | error | **Fixed.** Pro tip: "…rotate it open about the condyle while sliding the condyle forward onto the ridge ahead of its socket—never hinge it at the corner." Mistake: "A wide gape also slides the condyles forward." Figure side deferred (skulls agent): `steps.js` openJaw swings 35° about a fixed condyle (≈ 6 cm at the incisors); about 30° plus ≈ 1 cm forward and 0.3 cm down would give ≈ 4.8 cm, matching the lesson's "about 5 cm". The 3D loop (36° + 0.95 cm glide) gives ≈ 5.7 cm | Zawawi et al. 2003 (48.8 mm); `steps.js`, `lessons.js` jawMotion |
| 19 | profile: steps order vs pro tip and panels | error | **Fixed (variant).** 01 "Level line and circle" (level line through the top of the ear canal, vertical, stretched braincase circle centred near it); 02 "Face wedge in a square" (wedge brow → chin → jaw angle → ear, near-square box, brow/nose/bite guides, all drawn in panel 02); 03 "Orbit, aperture, contour" (orbit's lowest rim on the level line, which completes the porion–orbitale definition; the jaw joint just ahead of the ear) | `steps.js` profileBase/profileLesson; VAULT_EGG centre z = −0.3 cm (≈ on the ear vertical); Park et al. 2020 (porion–orbitale) |
| 20 | bones: steps vs panels 01–03 | error | **Fixed (text side).** 01 "Outline and sutures" (profile of Lesson III; coronal, lambdoid and squamous sutures, the three a side view shows); 02 "Map the bones" (the nine tinted panels drawn); 03 "Pull the bones apart". The suggested redraw of panel 01 as three masses is optional and belongs to the skulls agent | `steps.js` bonesLesson; OpenStax §7.2 (sagittal suture on the top midline) |
| 21 | jaguar: proportions[1] (same as item 2) | error | **Fixed.** See item 2 | — |
| 22 | skull-and-snake: body[0], steps[0–1] vs 3D path and panels | error | **Fixed.** Body: "route the snake around it in one unbroken loop: out of an orbit, over brow and vault, behind the ear, back under the cheekbone arch." Steps: "Ball, axis and sockets" and "Thread the snake", as suggested. Look-closer orbit also changed: "the viper leaves and returns here." | `snake.js` CONTROL; `steps.js` skullSnake |
| 23 | skull-and-snake: animation.beats | error | **Fixed (variant).** Captures show that the suggested beat "1.3 The head leaves the orbit and crosses the brow" is late: the head crosses the brow at ≈ 0.5 s and is on the vault by 1.3 s. New beats: 0 head rests in the orbit, body circles the skull · 0.5 leaves the orbit and crosses the brow · 1.3 climbs over the vault · 2.6 runs down behind the ear · 3.8 under the cheekbone arch, heads back to the socket | Lab captures `.scratch/calrev-snake-{0,0.5,0.9,1.3,2.6,3.8,4.4}.png` |
| 24 | jaguar: animation.beats | error | **Fixed.** Beats 0/0.5/1.8/2.6/3.4 as suggested: jaw closed, opens on the transverse hinge, full gape, the bite (temporalis on the glowing crest), carnassials shear while the jaw rests | `lessons.js` jaguar: open = seg(0.4,1.8)·(1 − seg(2.6,3.05)); crest pulse 2.35–4.5; captures `.scratch/calrev-jaguar-{0,1.8,2.6,3.4}.png` |
| 25 | jaguar: panels draw a closed orbit | error | **Deferred (skulls agent, `steps.js` jaguarLesson).** The manifest text ("Leave the orbit open behind"; mistake "Closing the orbit with a ring of bone") is correct; panels 02–03 draw a full dashed ellipse and a filled disc. Suggested: an open C, with the postorbital processes as two points that do not meet | Heesy 2005 (postorbital ligament vs bar) |
| 26 | frontal: body word count (same as item 4) | budget | **Fixed.** See item 4 | — |
| 27 | frontal: steps[1] "Hang a box below… brow guide" (the checker's text was cut off in transmission) | error | **Fixed.** "Cross the ball's lower half with brow and eye lines; below it rule nose, bite and chin lines. Mark the side planes, then taper the jaw from cheekbones through jaw angles to chin." This matches panel 02, where the circle spans y −1.7 to 11.4 cm, the brow (3.65) and eye (1.75) lines cross its lower half, and the taper starts at zygion (y −0.45) | `steps.js` frontal; `human.js` VAULT_EGG, landmarks |

**Additional fixes found while re-checking (not raised by the checkers).**

- frontal beat 1.25: "A tapering box hangs below for the face and jaw" → "Level guides cross the centre line; the jaw tapers to the chin." The figure draws no box at that moment; it draws the level guides (0.25–0.95 s) and the jaw taper (1.0–1.7 s).
- profile beats 0 and 1.25: the proportion grid is hidden until the skull has turned past about 45° (`gridF = seg(s, 0.45, 0.95)`), so "Front view: the grid fixes…" was wrong. Now: "Front view: a ball for the cranium, the face hung below it." and "The skull turns; the face becomes a wedge on the ball." Checked with captures at 0, 1.25 and 2.5 s.
- jaguar step 1 and body[0]: panel 01 and the 3D construction layer draw a long braincase oval with a short muzzle box ahead of it (the oval is the larger shape), so "a blunt wedge and a smaller ball" now reads "a long oval and a short, blunt box". The step title follows the module: "Braincase and muzzle box".
- open-jaw beat 2.5 and pro tip use "the ridge ahead of its socket", the body's plain-language term for the articular tubercle.
- profile plate sources: added Betts et al. 2022 (OpenStax) for the nasal-bone statement.

**Deferred items, by owner.**

- *Skulls agent* (`src/subjects/skulls/`): the eyelash-pitviper name in `snake.js` beadSnake and in the `skull-and-snake` layer hint in `lessons.js` (item 3); the figure's own opening model and beats in `lessons.js` (item 1); the panel opening angle and glide in `steps.js` openJaw (item 18); optional three-quarter panels for open-jaw (item 16) and a three-masses panel 01 for bones (item 20); the open orbit in the jaguar panels (item 25); the non-canonical label ids, if renamed (item 15).
- *Snakes agent* (`src/subjects/snakes/species.js`, entry `'bothriechis-schlegelii'`): the eyelash viper's `scientific` name (item 3). This also affects Volume I's figure titles.
- *Lead* (`docs/architecture/CONTRACTS.md` §6): append `temporalis masseter` to the human-skull ids and `head` for the skull-and-snake figure, if those labels stay (item 15).

## 8. Late fact-check items (recovered after the revision pass)

The build workflow passed both checkers' issues to the reviser as one JSON string cut at
30,000 characters, so the reviser saw items 1–27 of 39. On 2026-11-01 the lead recovered
the remaining items from the workflow journal and resolved each one. Most duplicated issues
the reviser had already fixed from the other checker's list.

| # | location | issue | resolution |
|---|---|---|---|
| B-11 | frontal · body | 119 words, under the 120-word minimum | already fixed (body is now 125 words) |
| B-12 | frontal · steps[1] | brow and eye guides lie inside the circle, not on a box below it | already fixed in the revision (step now says "cross the ball's lower half…") |
| B-13 | frontal · panel 03 | drawn bony bridge 0.64 of an orbit wide (Howells ≈ 0.54) | **fixed in the figure**: orbit centres ±3.25 → ±3.0 cm in `steps.js`; the 3D model's bridge 2.90 → 2.16 cm (0.54 of orbit width) in `human.js` |
| B-14 | jaguar · steps[0] / body | read as if the braincase were smaller than the muzzle | already fixed ("a long oval for the braincase and a short box for the muzzle") |
| B-15 | jaguar · steps[1] | "hang the jaw as a long lever" contradicts the short, deep felid jaw (short out-lever) | **fixed**: title "Crest, arches, jaw"; "hang the short, deep jaw from the hinge" |
| B-16 | profile · beats[0] | grid invisible at t = 0 | already fixed in the revision |
| B-17 | open-jaw · beats[1] | rotation-first beat | already fixed; the 3D loop now glides from the start of opening (`jawPose`, 27°, condyle 0.95 cm forward / 0.90 cm down) |
| B-18 | frontal lookCloser · profile body | the upper nose is bone (nasal bones) | already fixed ("below the nasal bones the nose was cartilage") |
| B-19 | bones · steps[2], mistakes[0], body[0]; glossary "Suture" | zigzag sutures are a vault feature; the squamous suture is bevelled, facial sutures nearly plane | **fixed**: mistake now "Vault sutures…", body "interlock on the vault and run smoother on the face", glossary "zigzag on the vault, bevelled at the temple, nearly straight on the face" |
| B-20 | bones · sphenoid | "meets almost every bone" overstates (12 bones) | already fixed ("meets twelve bones") |
| B-21 | intro · paragraphs[1] | promised four stages "in the same order"; every lesson has three steps | **fixed**: "in the same three stages for every view: big shapes, guides, details" |
| B-22 | open-jaw · facts[1] | "pure rotation" for the first 25 mm | already fixed ("mostly rotation, some glide") |
| B-23 | frontal · steps[0] | "past the chin" before any chin is drawn | **fixed**: "on past where the chin will be" |
| B-24 | all lessons · originality | step format and lesson set resemble a third-party drawing book's pages (format only) | kept: the three-panel format, pro tip and lesson subjects are common drawing-book conventions; all step texts, drawings and the 3D figures were written and drawn for this book (no source text was available to any agent) |

Also changed with the skull figure fixes: open-jaw step 2 now reads "also slide the hinge
forward and down, onto the ridge in front of its socket" (the condyle descends the back
slope of the articular eminence, so "slightly down" understated it); the jaguar panels draw
the orbit as an open C with two postorbital processes and a gap behind (felid orbits are
open); the skull-and-snake figure names the snake *Bothriechis nigroadspersus* and shows only
its default labels.

## 9. Integration round (2026-11-01): lesson VI route, lesson IV fit

Two hand-offs from the review round (`.scratch/review2/fixes-round1.json`): the visual
review found that lesson VI sends the viper "under" and "beneath" the cheekbone arch, which
the figure never does; the typesetter found the lesson IV verso at the 90 % auto-fit floor.
Only `src/books/calaveras.js` and this file changed.

### Lesson VI: what the reader sees

Checked on the dev server:

- Reader plate 6, book view, at t = 0, 1.25, 2.5 and 3.75 s on WebGPU and `?gl=webgl`, and
  also at 3.2, 3.5, 4.2, 4.4, 4.5 and 4.7 s on WebGPU. Inspect view at 0, 3.75 and 4.2 s.
  Lab views front and side at 0 and 3.75 s, on both backends.
- Head position from the snake's `eye` anchor in the skull frame (numbers in §3 VI): from
  3.75 to 4.2 s the head runs 2.2–2.8 cm below the arch and outside the ramus. It never
  enters the gap under the arch.
- Occlusion probe: each frame was captured with the skull layer on and off, and the snake's
  yellow pixels were compared. Book view at five loop times: 3.4–5.5 % of snake pixels
  differ, all of them outline and shadow slivers along the body's edges. Inspect view at 0,
  2.5 and 4.5 s: 7.3–10.0 % differ, again slivers only. The skull hides no stretch of the
  body. Every overlap the reader sees
  is body over bone: on the brow, the forehead and the vault, and on the cheek, where the
  body crosses the cheekbone just in front of the arch's root.
- Printed panels (`steps.js` skullSnake, redrawn by the skulls fixer). Panel 02's dashed
  loop leaves the orbit, goes over brow and vault, runs down the side outside the contour,
  and comes back in across the cheek. Panel 03 tucks the body behind the side contour below
  the cheekbone (bone over body) before it crosses the cheek into the socket.

| Location | Old | New | Why |
|---|---|---|---|
| body[0] | "…behind the ear, back under the cheekbone arch." | "…behind the ear, below the cheekbone arch and back across the cheek." | "Under" a bridge reads as through the gap beneath it; the figure runs 2.2–2.8 cm below the arch and then crosses the cheek. The overlap sentence that follows is unchanged |
| lesson.steps[1] (Thread the snake) | "…over the brow and vault, back under the cheekbone—and decide…" | "…over the brow and vault, behind the ear, back across the cheek—and decide…" | Matches panel 02 and the 3D path; "decide each crossing" is kept |
| lookCloser zygomatic-arch | "A bridge of bone: pass beneath it for depth." | "Pass below it; overlap the cheek for depth." | The viper passes below the arch. The depth cue at that spot is the body overlapping the cheek, which the reader sees at every time sampled: the tail crosses the cheek at 3.75–4.3 s, the head at 4.4–4.7 s. It stays one line, so the page and its hit regions do not change |
| animation.beats | 3.8 "Under the cheekbone arch, it heads back to the socket." | 3.6 "It swings forward below the cheekbone arch, beside the jaw." · 4.4 "Over the cheek, it slips back into the socket." | Head timing (§3 VI): below the arch and outside the ramus at 3.75–4.2, on the cheek at 4.4–4.6, in the socket at 4.7. The 2.6 beat ("behind the ear") now lasts to 3.6 and covers the turn round the mastoid. Checked in the reader caption on both backends at 3.0, 3.7 and 4.5 s |
| Unchanged | caption, animation title "Through the orbit", look-closer orbit, steps 01 and 03, glossary "Zygomatic arch" | — | None of them describes the route, or what they say is true |

Fit: the lesson VI verso still sets at 92.5 % (no line gained). The look-closer hit regions
are identical before and after.

### Lesson IV: trimmed to set at 95 %

At 95 % the verso overflowed by 82 design px (1536-px page). Measured block by block at that
scale:

- body: 10 + 8 lines, so 10 lines tall
- facts strip: two value lines (three of the four values wrapped)
- step 01: six lines, the tallest step
- notes grid: 382 px

None of the trims below drops a fact or an instruction.

| Location | Old | New | Why, and where any dropped words still appear |
|---|---|---|---|
| facts | "Cranial bones" → "8: four single, two pairs"; "Facial bones" → "14: six pairs, two single"; "Not counted" → "hyoid and six ear ossicles" | "8 cranial bones" → "four single, two pairs"; "14 facial bones" → "six pairs, two single"; "Not counted" → "hyoid, six ear ossicles" | The counts move into the labels and every value sets on one line (−32 px) |
| body[0] | "Eight bones build the cranium: … Fourteen build the face: paired maxillae, zygomatic, nasal, lacrimal and palatine bones and inferior nasal conchae, … sutures that wander and interlock on the vault … The coronal suture crosses the crown…" | "The cranium has eight bones: … The face has fourteen: paired maxillae, zygomatics, nasals, lacrimals, palatines and inferior nasal conchae, … sutures that interlock on the vault … The coronal crosses the crown…" | 9 lines instead of 10 (−35 px), with the same bones and counts. "Wander" still appears in step 01 ("wandering seams") and in the first mistake ("They wander and interlock like a zip"). The new wording breaks with 2 hyphens instead of a run of 3 (pa-/eth-/zy-) |
| lesson.steps[0] | "…Run the coronal, lambdoid and squamous sutures across its side as wandering seams: they fence the frontal, parietal, temporal and occipital bones." | "…Run the coronal, lambdoid and squamous sutures as wandering seams fencing the frontal, parietal, temporal and occipital bones." | 5 lines instead of 6 (−31 px); "the profile" already places the sutures on the side |

Result: 95 % at 1024, 1536 and 2048 px, with 15.7 design px to spare at that scale. The
body is 136 words (budget 120–220) and `validate-books` is clean.

### Hand-offs (files this book does not own)

- **skulls**, `src/subjects/skulls/lessons.js`, LESSONS['skull-and-snake'].beats: the
  figure's own last beat, "…under the cheekbone and back into the socket.", still shows in
  the lab and in any host that prints figure beats. The Reader prints the manifest's beats.
  Suggested wording: "…below the cheekbone arch, then over the cheek into the socket." Its
  1.3 s beat ("Out of the left orbit and over the brow…") also lags the head, which is on
  the vault by then. Copying the manifest's six beats would fix both.
- **skulls**, comments only: `snake.js` (header and CONTROL[10]) and `steps.js` (the
  SNAKE_LOOP comment) say "under the cheekbone". "Below the cheekbone" would match the
  geometry.

## 10. Bilingual edition (2026-11-01): author, how-to, look-closer names

The request that made the books bilingual also asked for the author on both covers. The Spanish
edition (`src/books/es/calaveras.js`) mirrors this manifest key for key; every English change is
also listed, old → new, in `.scratch/bilingual/en-changes.md` for the Spanish sync.

| Location | Old | New | Why |
|---|---|---|---|
| `byline` | — | `{ name: 'Josoroma', mark: 'josoroma' }` | The author’s mark, foil-stamped on both boards; `author` stays the imprint string |
| how-to row 2 | “Click or tap a page edge” — “Turn one leaf forward or back” | “Click or tap a page” — “Forward on the right-hand page, back on the left; when one page fills the screen, a tap reads on” | Round-2 hand-off. The Reader turns on a tap anywhere on a page, not only its edge, and frames one page on an upright screen (camera aspect under 0.9), where a tap reads on and never goes back (`Reader.js` `onTap`). A no-break space keeps “the screen” together; the icon stays “page” |
| I `lookCloser[nasal-aperture]` | printed “Nasal aperture” (from the id) | `name: 'Piriform aperture'` | The figure’s label says “Piriform aperture”, the anatomical name (*apertura piriformis*; “anterior nasal aperture” is its synonym, and a bare “nasal aperture” could mean the posterior openings too). The row’s text, “A pear, narrow end up”, glosses *piriform*, and the body’s “pear-shaped nasal aperture” still links the two names |
| II `lookCloser[coronoid]` | printed “Coronoid” | `name: 'Coronoid process'` | The figure’s label and the anatomical term; “coronoid” alone is an adjective |
| III `lookCloser[occipital]` | printed “Occipital” | `name: 'Occipital bone'` | The figure’s label; the row is about the bone’s bump |

A look-closer row is a button that points at a label in the figure, so the two now use the same
words. The other rows already match their labels or print a shorter form of the same term
(“Carnassial” for the label “Carnassial (P4/m1)”; small caps would also turn *m1* into *M1*).
*(Revised on 2 November: see the next table.)*
Measured with the snapshot and the edited manifest typeset side by side on the same build, twice
(the typesetter's lesson layout changed in between): every side keeps its scale. On the later
build the lesson versos set at 97.5, 97.5, 100, 97.5, 97.5 and 100 % (I–VI), Sources at 97.5 % and
the how-to page at 100 %, the reworded row on two lines; the new names fit their column on one
line. `node scripts/validate-books.mjs calaveras`: 0 errors, 0 warnings.

**Revision, 2 November: the carnassial row.**

| Location | Old | New | Why |
|---|---|---|---|
| V `lookCloser[carnassial]` | printed “Carnassial” (from the id) | `name: 'Carnassial (P4/m1)'` | The figure’s label. Tapping the row focuses that pill, and every other row of both editions now names its part in its pill’s words (the Spanish run-ins are their pills’ Spanish, lead decision L1). The row’s text is unchanged |

The run-in is set in capitals, so the page prints “CARNASSIAL (P4/M1)”. That form is also in use as
the pair’s shorthand, the slash reading upper over lower: “the Carnassial Pair, abbreviated as
P4/M1, for the fourth upper premolar and first lower molar” (S. M. Carr, *Biol4250 Lab Exercise
#6: Molecular systematics of the Order Carnivora*, Memorial University of Newfoundland,
20 November 2025,
https://mun.ca/biology/scarr/Biol4250_Lab_Exercise_in_Molecular_Systematics_2025_Nov_20.pdf). The
strict form, with capitals for upper teeth and lower case for lower teeth, is P4/m1. Wikipedia’s
“Carnassial” and Carr’s own page on the pair
(https://mun.ca/biology/scarr/Carnassial_pair_synapomorphy.html) write it that way. The strict form
stays in the pill, in the Read sheet’s run-in and in the row’s text just below, “Upper P4 against
lower m1”. The name fits on one line at full size (230 of 350 design px in the notes column), and
lesson V still sets at 97.5 %, typeset with and without the name on the same build.

The Spanish row keeps «Carnicera», its pill’s words. `node scripts/validate-books.mjs --lang es`
therefore warns that the run-in’s numbers differ from the English ones (P4, m1). The warning is
expected: the Spanish pill cannot hold the notation, because «Carnicera (P4/m1)» measures 111 px and
the pill limit is 110 px, and the Spanish row’s text keeps both teeth («P4 superior contra m1
inferior»). With the change, `node scripts/validate-books.mjs --lang all --fit` reports 0 errors, the
same pages and scales in both editions, and English at 0 warnings.
