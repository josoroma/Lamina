> Archived from `.scratch/bilingual/research-boa-rat.md` (2026-11-01), the research output of [`docs/prompts/06a-research-workflow.js`](../prompts/06a-research-workflow.js), with its adversarial review appended at the end. Images and probe scripts it mentions stayed in the git-ignored scratch folder.

# research:boa-rat — Plate VII (Béquer): the boa's true colours, and a prey that reads as a rat

*Lámina · Serpientes · plate VII `bequer` (`boa-imperator`, pose `constrict`). Research and implementation spec, 2026-11-01.*
*Scope: the béquer's skin colour and pattern, the prey, the text that names them. Not in scope: the snake head **geometry**, eyes and face detail (the user's "faceless heads" note is a separate task); §2.6 gives only the boa's head **colour pattern**, to be painted on whatever head mesh that task produces.*

Everything below was checked against sources that were opened (see §7), against photos of wild Costa Rican boas and black rats (§8), and against renders of the current plate and of a working prototype. Nothing in `src/` was edited.

| what | where |
|---|---|
| this spec | `.scratch/bilingual/research-boa-rat.md` |
| current-state renders | `.scratch/bilingual/boa/current-state.png` (sheet), `cur-*.png` |
| prototype renders | `.scratch/bilingual/boa/prototype-v5.png` (sheet), `proto-v5-*.png` |
| reference photo sheets | `.scratch/bilingual/boa/refs-boa-cr.png`, `refs-rat-cr.png` |
| working prototype (scratch copy of the snake subject) | `.scratch/bilingual/boa/proto/snakes/*.js` |
| the prototype as a patch against `src/subjects/snakes/` | `.scratch/bilingual/boa/proto/prototype.diff` (9 hunks, made against `src` at 21:12) |
| how to mount the prototype in the lab / reader | `.scratch/bilingual/boa/proto/mount-proto.js`, `reader-proto.js` (§5.10) |

---

## 0. Decisions on one screen

1. **Béquer phenotype:** the common Costa Rican lowland look: a **silvery grey-beige fore-body** warming to **buff-tan behind**, **24 dorsal saddles on the body and 5 on the tail**, each saddle **bow-tie shaped in dorsal view** (narrow waist on the spine, broad lobes on the flanks) so the pale interspaces read as a **chain of light ovals**; saddles **black-rimmed** with **dark-brown interiors flecked rust**, edged by **one row of cream scales**; **pale-centred lateral rhomboids** between the saddles; **tail saddles dark red-brown to black-brown on cream** (not brick red); **cream belly with dark flecks that increase towards the tail**; head with a **dark median stripe**, a **rust patch between nostril and eye**, a **black postocular stripe slanting to the jaw angle**, a **dark subocular wedge** and **cream lips**.
2. **Prey:** an adult **black rat, *Rattus rattus*** (rata negra), grey-brown agouti form with paler flanks and a cream belly, **at real scale**: head–body 21 cm, tail 24 cm, chest about 5.4 cm across (vs the boa's 8.4 cm mid-body). Pointed muzzle, pink nose, dark bead eyes, ~12 drawn whiskers a side, large thin pink-brown ears, pink feet with 4 front / 5 hind digits, a long uniformly dark, ring-scaled tail.
3. **Coils:** **two** full loops around the rat's **thorax and abdomen** (Boback et al. 2015), leaving the **face, ears, whiskers and forefeet in front** and **hind legs, feet and tail behind**; the tail lies on the paper.
4. **Text:** the caption stops calling the prey a "silhouette"; beats and the SVG part name say "rat" (§4, English + Spanish given).
5. **Code:** five files in `src/subjects/snakes/` (`species.js`, `patterns.js`, `props.js`, `index.js`, `poses.js`), all prototyped and rendering on WebGPU and WebGL 2 (§5).

Before / after (same lab camera, t = 2 s):

| current (`current-state.png`, tiles C1–C6) | prototype (`prototype-v5.png`, tiles P1–P6) |
|---|---|
| khaki boa with thin brown ring-like saddle outlines; brick-red-and-cream tail; prey = a brown bean with a pale knob nose, no eyes, legs or whiskers, floating 7 cm above the paper | grey-beige → tan boa, bold black-rimmed dark saddles with rust flecks, dark red-brown tail on cream; a grey-brown rat with pink ears, nose and feet, whiskers and a long dark tail, held in two loops |

---

## 1. Diagnosis

### 1.1 The user's screenshot (`44.png`)
Khaki boa; the dorsal saddles read as thin dark-brown **bands/rings**, not as saddles; the tail is ringed **brick red and cream**; the prey is a featureless brown mass under the coils with a pale tail. That matches the renders below exactly (`current-state.png` C1, C2).

### 1.2 Boa skin today — code (`src/subjects/snakes/patterns.js` `PATTERNS.boa`, `species.js` colours)

| issue | code | effect |
|---|---|---|
| saddles are mostly hollow | interior = `mix(saddle, mix(saddle, groundAlt, 0.55), core)` with `core = smoothstep(-0.05,-0.13, dist)` | only a ~0.05-period rim stays dark; the centre is 55 % ground colour, so at book zoom a saddle reads as a **thin dark outline** (the "stripes" in 44.png) |
| one warm khaki ground everywhere | `ground #b5a487`, `groundAlt #a19073` (hue ≈ 38°) mixed by noise | no silvery-grey fore-body, no warming behind |
| brick-red tail | `saddleRed #8b3524` from `sn = 0.6…0.8`, cream `rim` | the pet-trade "red-tailed boa" look; *B. imperator* tail blotches are dark brown / reddish-brown and black, not brick red (Duque-Torres et al. 2024, citing O'Shea 2007 and Reed & Rodda 2009) |
| wrong count | one period `P = (L − 1.5·Lh)/25` over body **and** tail → ≈ 22 saddles on the body, ≈ 3 on the tail | documented: 24 on the body + 5 on the tail (Villa & Rivas 1971); 22–30 dorsal blotches for the species (Duque-Torres et al. 2024) |
| hard cut on the flank | `onTrunk … step(d, 0.52)` | saddles end abruptly at mid-flank |
| faint lateral blotches | lateral `#5c4534`, centres mixed 70 % to ground | almost invisible at book zoom |
| uniform belly speckle | 12 % of scutes, everywhere | real bellies are flecked more towards the tail (Florida Museum: mottled with dark spots/smudges; Nicoya photo) |
| head pattern | crown `#a99778`, one dark "eye stripe" line, a thin wedge, jaw = venter | no rust preocular patch, no cream lips; the head reads as a uniform tan capsule (C3) |

### 1.3 Boa skin today — render (measured)
Lab, `view=close`, t = 2, WebGPU (`.scratch/bilingual/boa/cur-lab-close.png`; same look on WebGL 2, `cur-lab-close-webgl.png`). k-means over figure pixels (paper and soft shadow removed):

| cluster | share | hue / sat / light | reads as |
|---|---|---|---|
| `#a59478` `#8b7c62` `#70614b` `#554734` | 56 % | 35–37° / 0.17–0.24 / 0.27–0.56 | khaki ground |
| `#3d2b18` `#1c1004` | 15 % | 30° / 0.43–0.74 / 0.06–0.17 | saddle outlines |
| `#7e3923` | 3 % | **14° / 0.56 / 0.32** | brick-red tail |

Renderer response, measured by painting the boa a flat grey in the same view: albedo `#808080` renders with median `#5c5c5c` and 90th percentile `#7e7e7e`; `#c0c0c0` → median `#919191`, p90 `#bebebe`. So the lit side shows roughly the albedo and the median is ≈ 0.75 × albedo (sRGB). The albedo targets in §2.4 were set with this in mind and checked in render.

### 1.4 The prey today (`props.js` `buildPrey`, sized in `index.js`)
Computed from the constants (`pr = 1.25·rMax = 5.25 cm`, `length = 4.6·pr = 24.15 cm`) and seen in `cur-prey-only-*.png` (C4–C6) and `cur-lab-close-zoom-head.png` (C3):

- **Wrong animal size.** Torso ellipsoid 21.7 × 10.5 × 10.1 cm plus a 10 × 7 × 6.5 cm head ≈ **1.4 L**, i.e. about 1.4 kg — an agouti or guinea-pig-sized body. An adult black rat weighs 100–279 g (mean 188 g; Hadjisterkotis et al. 2020, Table 3) and its head–body is 15.5–23.4 cm; the current "rodent" is ~30 cm head–body and about twice a rat's girth.
- **No face.** The eyes (spheres of 0.47 cm) sit *inside* the head ellipsoid (normalised offset 0.70 < 1) — they never show (C3). The ears are flat pale discs; the snout is a pale ellipsoid "knob"; no nose, no whiskers.
- **No limbs.** No feet or digits; the body is a smooth bean.
- **Tail wrong.** Pale beige (`#b9a893`) and thick (1.5 cm across at the base). A black rat's tail is longer than head and body, scaly, nearly hairless and **uniformly dark** (UC IPM 2024; Hadjisterkotis et al. 2020).
- **Turned-wood shading.** `poleRings` hatching draws concentric rings around the long axis; on a featureless ellipsoid it reads as a carved toy.
- **Floating.** Axis at 12.5 cm above the paper, lowest point 7 cm up; nothing touches the ground except the tail.
- **The text calls it a silhouette** — `caption: '… around a prey silhouette.'` and part name `'Prey (stylised rodent)'`.

### 1.5 Composition today (`poses.js` `constrict`)
2.25 helix turns at pitch `2.2·rMax` around a 10.5 cm-thick prey consume ~115 cm of the boa (s/L ≈ 0.12–0.70) and cover the whole torso; only the knob nose and the tail stick out (C1, C2). With a real rat the loops get much tighter and shorter (§3.4).

---

## 2. Béquer (*Boa imperator*): colours and pattern

### 2.1 Sources consulted, and what each supports
| source | supports |
|---|---|
| Duque-Torres, Aponte-Gutiérrez, Molina-Moreno & Arteaga 2024 (Reptiles of Ecuador, *B. imperator* account) | light-brown ground with dark-brown markings forming a chain; markings reddish-brown and black on the tail; three dark head stripes (median to the neck, one each side); differs from *B. constrictor* by dark-brown, not brick-red, tail blotches and by more dorsal blotches (22–30 vs 14–22) — the last two cite O'Shea 2007 and Reed & Rodda 2009 |
| Villa & Rivas 1971 (Rev. Biol. Trop.; a Nicaraguan *B. c. imperator*) | **24 oval dorsal blotches on the body and 5 on the tail**; the supracephalic "cross" typical of *imperator*; 247 ventrals, 56 subcaudals (tail incomplete), 74 midbody rows; normal pigment dark brown and black |
| Lindemann 2009 (Animal Diversity Web, *Boa constrictor* s.l.) | cream-to-brown ground with dark saddle-shaped bands that become more colourful and reddish-brown towards the tail, edged black or cream; three head stripes: a line along the top of the head, a dark triangle between snout and eye, continued behind the eye slanting down to the jaw |
| Florida Museum, Florida Snake ID: *Boa constrictor* | dark-brown hourglass-shaped saddles becoming reddish bands towards the tail; tan crown with a thin dark median stripe; light belly mottled with dark spots or smudges; small smooth scales |
| Solórzano & Sasa 2024 (Rev. Latinoam. Herpetol., Costa Rica) | Costa Rican adults usually 2–2.5 m, none recorded over 3.8 m; diet includes rats; **Fig. 1** (Santa Clara de San Carlos, ~3 m adult): black-rimmed saddles with cream borders on an olive-grey ground; **Fig. 2** (Parrita juvenile): grey ground, dark saddles, tail saddles blackish-brown with buff interspaces |
| Instituto Clodomiro Picado, image gallery (three *B. imperator* photos by A. Solórzano) | tan to pinkish-tan ground; black-rimmed saddles with rust-orange interiors; rust preocular stripe; black postocular stripe with a cream border below |
| Wikimedia Commons and iNaturalist research-grade photos from Costa Rica (§8) | colour ranges by region (§2.4), the silvery-grey head with a rust preocular patch (Osa), the posterior warming, the belly flecks, tail saddles |
| serpientesdecostarica.com (anonymous site) | corroboration only: beige ground, dark-brown blotches that look like rhombs from the side, light ovals between the blotches along the back, a dark line behind the eye |
| Card et al. 2016; Suárez-Atilano et al. 2017 | taxonomy and phylogeography (Card et al.: three mainland clades, the basis for *B. imperator* as a species; Suárez-Atilano et al.: two *B. imperator* lineages); **no colour data** (Card et al. read in full; Suárez-Atilano et al. only as a bibliographic record) |
| Savage 2002; Solórzano 2004/2022; Reed & Rodda 2009; The Reptile Database | **not consulted**: Savage is a lending-restricted scan, Solórzano's books are not online, the USGS report PDF (15 MB) could not be fetched, and The Reptile Database has temporarily removed its diagnosis section. Nothing here is attributed to them except what Duque-Torres et al. cite from Reed & Rodda / O'Shea. |

### 2.2 Variation in Costa Rica (what the photos show)
`refs-boa-cr.png` (B1–B9) plus the Solórzano & Sasa and ICP photos:

- **Silvery grey-beige** fore-body, warming behind: Gandoca-Manzanillo (B1), Osa (B3), Manzanillo (B8), San Carlos (Solórzano & Sasa Fig. 1), Parrita juvenile (Fig. 2).
- **Olive-khaki / tan:** La Cruz (B5), Guanacaste (B6), ICP photos.
- **Pinkish-tan with a salmon head and a pink belly:** Nicoya (B4).
- **Dark, coppery:** Puerto Viejo (B2).
- Saddle interiors range from dark brown to rust-orange (ICP); tail saddles from blackish-brown (Parrita, Nicoya) to dark reddish-brown; tails are never shown brick red in these Costa Rican photos.

### 2.3 Chosen phenotype
The **grey-beige → tan lowland phenotype** (B1, B3, B8, Solórzano & Sasa Figs 1–2): it is the commonest look in the Costa Rican photos examined, every element is documented (§2.1), and it gives the lithograph the strongest value contrast (pale ground, black rims), so the pattern survives book zoom and the colour SVG.

### 2.4 Colour spec
"Observed" = sRGB of k-means clusters or pixel medians in the photos (camera white balance and flash vary; treat as ranges). "Albedo" = the value to put in `species.js` (prototype values; checked in render on both backends).

| region | observed in Costa Rican photos | albedo | evidence |
|---|---|---|---|
| ground, fore-body (neck → ~35 % of length) | `#91887c` `#a4a195` `#aaa9a3` (Osa, shade/sun); `#8d8571`–`#c1b79e` (San Carlos); `#6e6b6f`–`#b5b3a9` (Parrita, lab light) | **`#b3afa4`** | B1, B3, Sol. & Sasa |
| ground, mid-body | `#7d775d`–`#9e9478` (La Cruz); `#a18e80`–`#c2b1a7` (ICP3) | **`#b5a68c`** | B5, ICP |
| ground, hind body | warmer tan (ADW, Florida Museum: more colourful towards the tail) | **`#a8916f`** | ADW, FLMNH |
| saddle rim (1–2 scale rows) | `#080706` `#0b0b0c` `#13191d` `#1e1d1c` | **`#1f1814`** | Sol. & Sasa Fig. 1, B3 |
| saddle interior | `#2b1f1b`–`#462f26` (Nicoya, ICP3) | **`#45342a`** | B4, ICP |
| rust scales inside saddles (~20 % of interior scales) | `#6e4f3b` (ICP3), `#89512a` (ICP2) | **`#7b4b32`** | ICP |
| pale centres of the saddles' flank lobes | `#c1b79e`, `#e0bca8` (sunlit) | **`#cdc3ad`** | B4, Sol. & Sasa Fig. 1 |
| cream border round each saddle; tail interspaces | `#c1b79e` (San Carlos), `#8f8172` (Parrita, shade), `#f2f0e3` (Nicoya tail, sun) | **`#d9cfb8`** | Sol. & Sasa, B4 |
| lateral rhomboids / their pale centres | dark brown / cream | **`#3a2c24`** / `#cdc3ad` | B1, B5, serpientesdecostarica |
| tail saddles | `#141417` `#3a3735` `#635b52` (Parrita), `#1a181f` (Nicoya); "reddish-brown and black" (Duque-Torres et al.) | **`#4a2219`** interior, `#1f1814` rim | Sol. & Sasa Fig. 2, B4 |
| belly | ivory/cream; pinkish in Nicoya `#f4c6a9` | **`#e2dccd`** | FLMNH, B4 |
| belly flecks | dark grey-brown | **`#35302b`**; ~6 % of scutes at the neck rising to ~22 % at the vent and tail | FLMNH, B4 |
| dark ground speckles | dark brown | `#3a2e26` on ~4–12 % of scales, more behind | B5, Sol. & Sasa |
| head crown | `#a4a195` (Osa), `#ad9689` (ICP3) | **`#b9b3a6`** | B3, ICP |
| median head stripe, postocular stripe, subocular wedge | `#13191d`–`#1e1d1c` (Osa) | **`#211915`** | B3, ADW, Duque-Torres et al. |
| preocular (nostril → eye) patch | `#ab8472` `#a7836a` (Osa, sun), `#936f4a` (ICP3) | **`#8a5a3c`** | B3, ICP |
| lips, chin | `#bec7ca`–`#e5d6cf` (sunlit) | **`#e3dccb`** | B3, ICP |
| iris | not measured | keep `#ab9d80` until the head task decides | — |

### 2.5 Pattern geometry (snake body coordinates: `s` cm from the snout, `d = |lat|/belly`, 0 spine … 1 belly edge)
- **Count and phase.** First saddle on the nape at `s0 = 1.12·Lh` (it continues the median head stripe, the "cross" of Villa & Rivas). Body period `Pb = (sCloaca − s0)/24` (≈ 7.0 cm for L = 200 cm); tail period `Pt = (L − sCloaca)/5` (≈ 4.4 cm). Phase `x0 = (s−s0)/Pb` on the body, `24 + (s−sCloaca)/Pt` on the tail; `x = fract(x0) − 0.5`.
- **Dorsal shape (bow-tie / hourglass).** Half-width along the body `half = 0.15·P` on the spine growing to `0.30·P` by `d ≈ 0.42`, plus a low-frequency wobble (±0.035 P). The pale interspaces between waists are the "chain of ovals". Saddles reach down to `d ≈ 0.60` (lower edge rounded: `0.6 − 0.16·(|x|/half)²`).
- **Rim and interior.** Rim = outer ~0.04 P of the saddle in `#1f1814`; interior `#45342a` with ~20 % of scales `#7b4b32` (per-scale hash), mottled towards the rim colour by noise.
- **Flank lobes.** Each lobe at `d ≈ 0.46` holds a pale centre (ellipse 0.075 P × 0.085 d) in `#cdc3ad`.
- **Cream border.** One scale row outside the rim (`0 < dist < 0.05`), fading out below `d ≈ 0.6`.
- **Lateral rhomboids** between the saddles: centred at `d = 0.77`, half-sizes 0.17 P (along) × 0.13 (in `d`), pale centre over the inner 40 %.
- **Hind body** (`s/L` 0.68 → 0.86): saddle interiors turn `#4a2219`; ground warms to `#a8916f`.
- **Tail** (`s/L` > 0.80 → 0.93): saddles widen to `half = 0.39·Pt` (≈ 78 % of each period), leaving narrow cream interspaces (`#d9cfb8`); lateral rhomboids and lobe centres switch off.
- **Belly**: flecks by per-scute hash, threshold sliding from 0.94 (neck) to 0.78 (tail).
- **Variation not chosen:** some *imperator* populations have compact oval saddles (Villa & Rivas call the 24 blotches "oval") rather than hourglass ones; both occur in Costa Rican photos. The hourglass form is chosen because it gives the documented "chain" of pale ovals.

### 2.6 Head pattern (head mesh coordinates `hx` 0 back … 1 snout, `hy` 0 mouth line … 1 crown, `hz` lateral; `eu, ev` = eye)
- **Median stripe** (ADW; Florida Museum; Duque-Torres et al.): dark, from the snout to the nape where it joins the first saddle; half-width `0.035 + 0.09·(1 − hx)` of the head half-width, on the crown only (`hy > 0.62`).
- **Preocular patch** (Osa B3, ICP): rust `#8a5a3c` along the canthus from the nostril (`hx ≈ 0.9`) to the front of the eye.
- **Postocular stripe** (ADW's "dark triangle … continued behind the eye, slanting down to the jaw"): black, from the eye back and down to the angle of the jaw (`hx ≈ 0.04`, `hy ≈ 0.2`), widening behind.
- **Subocular wedge** (B3): a dark triangle under the eye narrowing to the lip.
- **Lips and chin** cream `#e3dccb` below `hy ≈ 0.18`; crown grey-beige `#b9b3a6`.
- The prototype implements this in `headColorNode` case `'boa'`; it looks right only once the head task gives the boa a proper head shape and eye — the current head mesh reads as a capsule (C3, P3–P5).

### 2.7 Scale texture and sheen
Small, smooth, unkeeled scales (Florida Museum); the subject already uses `keeled: 0` and 69 rows (Villa & Rivas counted 74 at midbody on their specimen — either is fine). Flash photos show a faint blue-violet iridescence on the flanks (ICP; Solórzano & Sasa Fig. 2). Optional: `ctx.ink({ sheen: 0.15, sheenColor: '#b9c3d6' })` on the boa only — measure the cost (it switches the skin to `MeshPhysicalNodeMaterial`) and check the colour SVG still snaps to the swatches.

---

## 3. The prey: a black rat

### 3.1 Which rat, and why
- **The cited lab work used rats.** Boback et al. 2012 constricted warm rat cadavers with a simulated heart (boas wild-caught in Belize); Boback et al. 2015 recorded circulatory arrest in anaesthetised rats. Note for the content team: the 2015 introduction names the rats *Rattus rattus*, but its Methods say male **Wistar** rats (350–475 g), a laboratory strain of the brown rat (*R. norvegicus*). Do not write in the book that the lab boas killed black rats.
- **Wild *B. imperator* eat black rats.** Aguilar-López & Tapia-Ramírez 2025 document a *B. imperator* that had eaten a black rat (Las Choapas, Veracruz, Mexico), the first published record of that interaction; *B. constrictor* eats *R. rattus* on Aruba (Quick et al. 2005, as cited there).
- **In Costa Rica:** Solórzano & Sasa 2024 list rats in the béquer's diet and photograph a juvenile from Parrita that died after swallowing an adult rat (species not identified). The black rat is widespread in Costa Rica: 89 GBIF occurrences (70 preserved specimens) against 17 for *R. norvegicus* (GBIF query, 2026-11-01), and 20 research-grade iNaturalist observations with photos (R1–R6).
- **Murid rodents in boa diets generally:** a review of 91 predation records of *B. constrictor* (mostly South American) lists murids such as the house mouse among the prey (Henderson 2023).
- **The manifest already says** the béquer lives "often around farms and houses" — where black rats live (UC IPM 2024: commensal, nests above ground in vegetation and roofs).
- **Why not a native cotton rat (*Sigmodon*)?** I found no published record of *B. imperator* eating *Sigmodon* (not searched exhaustively), and the black rat is both documented as prey and the species most readers recognise as "a rat". If the content team prefers a native rodent, §3.3's geometry still applies except for the tail and fur, which would need a new source.

### 3.2 Size, at the boa's scale
| measure | value | source |
|---|---|---|
| head–body | mean 182.7 mm (155–234), n = 63 | Hadjisterkotis et al. 2020, Table 3 (data of Kryštufek & Vohralík) |
| tail | mean 216.9 mm (180–269); **longer than head and body** | same; UC IPM 2024; ADW |
| hind foot | mean 36.2 mm (33–42) | same |
| ear | mean 23.7 mm (20–26) | same |
| mass | mean 188 g (100–279); 70–300 g; 70–103 g in southern Mexico | Hadjisterkotis et al. 2020; ADW; Aguilar-López & Tapia-Ramírez 2025 |
| **design values** | **head–body 21 cm, tail 24 cm, hind foot 3.6 cm, ear 2.3 × 2.0 cm, chest radius 2.7 cm** | within the ranges; the chest is an estimate (a 250 g, 16 cm-long torso as a prolate spheroid gives ≈ 5.4 cm across) |
| the boa around it | mid-body diameter 8.4 cm (`girth 0.042 × 200 cm`); loop radius ≈ 5.7 cm; coil axis 10.1 cm above the paper | `species.js`, prototype `index.js` |

So a loop is ~1.6× thicker than the rat's chest — the proportion of a 2 m boa holding a rat. The rat is ~11 % of the figure's width at book zoom (prototype P1) and clear in inspect (P2).

### 3.3 Appearance
| part | spec | source / photo |
|---|---|---|
| body | slender (UC IPM: sleek; ADW: medium-sized), rump → shoulder → narrow neck → head, one swept tube | R2, R3, R6 |
| head | pointed muzzle; head ≈ 5–6 cm incl. neck | UC IPM ("pointed muzzle"); R2, R6 |
| nose | pink `#d4968a`, small glossy bead at the tip | R3 |
| eyes | dark bead `#0d0b0a`, glossy (roughness ≈ 0.1), Ø ≈ 0.7 cm, on the side of the head, *outside* the fur surface | R2, R6 |
| whiskers | about 30 macrovibrissae a side in rows and columns, roughly parabolic, up to about 5 cm long (Towal et al. 2011 scanned six rats and cite a 50.5 mm whisker); draw 12 a side in 4 rows × 3 columns, 2.4–4.6 cm, ink lines 0.55 px `#2a2622` | Towal et al. 2011; R2, R6 |
| ears | large, thin, rounded, sparsely haired; reach the eye when folded forward; pink-brown `#c99a8c` (observed `#93776b`–`#bdaba2`), slightly translucent | UC IPM; Aguilar-López & Tapia-Ramírez 2025; R2, R6 |
| fur, back | grey-brown agouti **`#6b5f55`** with dark guard-hair streaks `#2f2a26` and paler tips `#a39686` (observed `#494341`–`#76737f`) | R2, R3, R6 |
| fur, flanks | paler grey-buff **`#8b7f72`** (observed `#635e5c`–`#8d8d9b`) | R2, R6 |
| fur, belly | pale grey to cream **`#d6ccbd`** (observed `#c0ab97`–`#d8c4b2`); "frugivorus"/"alexandrinus" colour types: pale belly, darker back | Hadjisterkotis et al. 2020 (Kryštufek & Vohralík); UC IPM (belly grey to white); R3 |
| muzzle | greyer/pinker towards the nose `#9a8279` | R2 |
| feet | pink **`#c99a8c`**; forefoot 4 clawed fingers + a tiny thumb; hind foot long (3.6 cm) with 5 clawed toes | Myers 2001 (ADW Muridae); R3, R6 |
| tail | ≥ 1.1 × head–body; scaly, nearly hairless, **uniformly dark** (not bicoloured) **`#7a6a62`** with darker ring scales `#4f443e` every ~0.25 cm (observed pinkish-grey `#948e91`–`#b8b6bb` in bright light) | UC IPM; Hadjisterkotis et al. 2020; R5, R6 |
| colour form | grey-brown agouti, not the all-black form: black rats occur in both (ADW; R4, R5 are melanic) but a black rat would merge with the boa's black saddle rims in the ink plate | ADW; R2–R6 |

### 3.4 What stays visible in the coils
Boback et al. 2015: the boas typically placed loops around the rat's **thorax and abdomen**, with **two or more** fully encircling loops; rats were presented head first, and the snake kept hold with its mouth until it released. Design:
- **Two loops** (`TURNS = 2`), the first just behind the shoulders (`x0 = shoulderX − 0.25·hA`), the second over the belly; pitch `0.72·(hA + hB)` so the loops press together.
- **In front of the first loop:** the head (eye, nose, whiskers, one ear clearly, the other above the boa's neck), both forefeet with digits.
- **Behind the last loop:** the rump, both hind legs hanging, pink hind feet, and the tail, which drops to the paper and lies in a loose S beside the boa.
- **The boa's head** rests on the far side of the rat's nape (prototype). Improvement for the real build: angle it down so the jaws close on the nape fur (the bite is held throughout the constriction, Boback et al. 2015); keep the 3.4–4.3 s gape (≤ 0.42) as a re-grip that clears the rat's ear.
- The squeeze stays a 6 % y/z compression of the rat's body (`out.prey = 1 − 0.06·tight`).

---

## 4. Text changes

All in `src/books/serpientes.js` unless noted. Spanish given for the bilingual task (the Spanish name "rata negra" is the one used by Aguilar-López & Tapia-Ramírez 2025).

| where | now | proposed (EN) | proposed (ES) |
|---|---|---|---|
| plate VII `figure.caption` (l. 419) | `Fig. 7 — Béquer tightening its coils around a prey silhouette.` | `Fig. 7 — Béquer tightening its coils around a black rat.` | `Fig. 7 — Béquer apretando sus anillos alrededor de una rata negra.` |
| `animation.beats[0]` (t 0) | `The coils settle around the prey.` | `The coils settle around the rat’s chest.` | `Los anillos se acomodan alrededor del pecho de la rata.` |
| `animation.beats[1]` (t 0.7) | `They tighten, pressing on the prey’s chest and blood vessels.` | `They tighten, pressing on the rat’s heart and blood vessels.` | `Se aprietan y presionan el corazón y los vasos sanguíneos de la rata.` |
| `animation.beats[2]` (t 1.8) | `Through its coils the boa senses the heartbeat and holds on.` | unchanged | `A través de sus anillos, la boa siente el latido y no suelta.` |
| `animation.beats[3]` (t 2.8) | `The pressure eases and the coils relax.` | unchanged | `La presión cede y los anillos se aflojan.` |
| `sources` (plate VII short refs) | `['Solórzano & Sasa 2024', 'Boback et al. 2012, 2015', 'Capano et al. 2022', 'Sasa, Bonilla & Chaves 2019 (ICP)']` | add `'Aguilar-López & Tapia-Ramírez 2025'` | idem |
| `back.sources` | — | add `Aguilar-López, J. L. & Tapia-Ramírez, G. (2025). Depredación de *Rattus rattus* (Muridae) por *Boa imperator* (Boidae) en el sur de México. *Rev. Latinoam. Herpetol.* 8(4): 271–276.` — 19 entries, within the 5–20 budget; check `typeset.html?book=serpientes` keeps the Sources page ≥ 90 % | idem |
| `props.js` part name | `'Prey (stylised rodent)'` | split into `Black rat — fur` / `— ears, nose and feet` / `— tail` / `— eyes` (§5.6) | `Rata negra — pelaje` / `— orejas, nariz y patas` / `— cola` / `— ojos` |
| `props.js` header comment l. 6 | `prey  a stylised rodent silhouette for the constriction plate` | `prey  a black rat (Rattus rattus) at real scale for the constriction plate` | — |
| `index.js` `POSE_TITLES.constrict` (l. 39; the lab and SVG title) | `constricting prey` | `constricting a black rat` | `constriñendo una rata negra` |
| `poses.js` constrict boa beats (lab / SVG caption; the reader shows the manifest's) | `Coils wrapped around the prey; the head holds its grip.` … | `Two loops wrap the rat’s chest and belly; the jaws hold on.` · `The coils tighten, cutting off blood flow — not suffocation.` · `Boas feel the rat’s heartbeat and keep squeezing until it stops.` · `The coils relax and re-grip. No venom is involved.` | `Dos anillos rodean el pecho y el vientre de la rata; las mandíbulas no sueltan.` · `Los anillos se aprietan y cortan el flujo de sangre, no la respiración.` · `Las boas sienten el latido de la rata y aprietan hasta que se detiene.` · `Los anillos se aflojan y vuelven a sujetar. No hay veneno.` |
| `docs/architecture/CONTRACTS.md` §12, row VII | `coils tighten and relax around a prey silhouette` | `coils tighten and relax around a black rat (Rattus rattus), drawn at real scale` | — |
| skill refs `references/design.md` l. 38, `references/figures.md` l. 74 | "a prey silhouette" as a minimal prop | "a prey animal drawn at real scale (the black rat of plate VII)" | — |

Unchanged and still correct: lede, body (it already lists rats), facts, look-closer notes, did-you-know (Boback et al. 2015: femoral pressure halved within 6 s), and the `eye-stripe` label text. Run the fact-check lens for "caption + beats" after the edit (`accuracy.md`).

---

## 5. Implementation plan

The prototype in `.scratch/bilingual/boa/proto/snakes/` is this plan, running; `prototype.diff` applies it to `src/subjects/snakes/` (re-diff if those files changed after 21:12).

### 5.1 `species.js` — `SPECIES['boa-imperator'].colors`
Replace with: `ground #b3afa4, groundMid #b5a68c, groundAlt #a8916f, edge #d9cfb8, saddle #1f1814, saddleCore #45342a, rust #7b4b32, saddleRed #4a2219, lateral #3a2c24, ocellus #cdc3ad, fleck #3a2e26, venter #e2dccd, venterSpot #35302b, headTop #b9b3a6, stripe #211915, loreal #8a5a3c, lip #e3dccb, mouth #e8b8ae`. (New keys: `groundMid`, `saddleCore`, `rust`, `ocellus`, `fleck`, `loreal`, `lip`. `index.js` uses `spec.colors.ground` as the skin's `svgColor` — still valid.)

### 5.2 `patterns.js`
- **`PATTERNS.boa`** — rewrite as §2.5 (prototype lines "PROTOTYPE (research-boa-rat.md §5.1)"). Pure TSL in the existing along-body (`s`) / around-body (`lat`) coordinates, so it stays snapped to the scale lattice by `bodySkin` (`snap 0.6`) and gets the per-scale shading for free. No new uniforms; two `mx_noise_float` and one `mx_cell_noise_float` lookups per fragment, like the other species.
- **`headColorNode` case `'boa'`** — §2.6 (prototype). Uses only `lineDist`, `smoothstep`, `clamp`, `step` already imported.
- **`patternSwatches` case `'boa'`** — §5.6.

### 5.3 `props.js` — `buildPrey(ctx, { axisY, hb = 21, tailLen = 24, girth = 2.7 })`
Prototype implementation; the parts, in order:
1. **Body + head**: one `buildTube` along a gently arched spine (rump at −X, nose at +X), radius profile `[[0,0.82],[0.1,0.94],[0.32,0.97],[0.52,1.0],[0.64,0.86],[0.72,0.7],[0.77,0.7],[0.84,0.6],[0.91,0.4],[0.965,0.24],[1,0.12]] × girth`, section `{ width 1, top 1, bottom 0.9 }`, 96 rings × 28 radial, round caps.
2. **Fur material** `ctx.ink({ colorNode: fur, hatchCoord: uv().y.mul(14), roughness 0.92 })`: the colour node mixes back → flanks → belly by `|lat|` (0.28–0.52, 0.6–0.8), adds hair streaks *along* the body (`mx_noise_float(vec3(s·0.5, lat·26, 3))` → guard-hair colour, 60 %) and paler tips (`s·0.9, lat·34`), and greys the muzzle near the nose. Hatching along constant `lat` follows the hair direction (no turned-wood rings; `poleRings`/`poleFadeMaterials` are no longer needed by the prey).
3. **Eyes**: two spheres r 0.34 cm, `roughness 0.12, hatch 0`, placed at 0.62 × local radius up and 0.72 × out from the tube axis at `u = 0.865` (outside the fur).
4. **Skin material** (ears, nose, palms, digits, hind feet): `ctx.ink({ color: '#c99a8c', side: DoubleSide, hatch 0.5, roughness 0.6 })` + `emissiveNode = color('#c9786a') × 0.12` as cheap translucency.
5. **Ears**: paraboloid caps 2.1 × 2.4 cm, cup depth 0.6 cm (`earGeometry`), at `u = 0.795`, opening forward and out; an ink line round each rim (`#5a463f`, 0.7 px).
6. **Nose**: sphere r 0.3 at the tip.
7. **Forelimbs**: furred tube shoulder → wrist, a pink palm, 4 digit tubes fanned forward. **Hind limbs**: furred thigh tube hanging back and down, a 3.6 cm pink foot, 5 toes.
8. **Whiskers**: 12 per side (4 rows × 3 columns), `ctx.inkLine` 0.55 px `#2a2622`, `fit: false`, parabolic (straight out, bending back and down 16 % of the length).
9. **Tail**: `buildTube` from the rump down to the paper (y ≈ 0.3 cm) and along it in a loose S, ≈ 24 cm, radius `0.46·(1 − 0.78u)`, colour node with ring scales `smoothstep(0.78, 0.95, fract(s·4))` → `#4f443e` at 45 %, `hatchCoord: uv().x·4`.
10. Return `{ group, axisY, radius: girth, length: hb, shoulderX, hipX, squeeze(k), parts, dispose }`; `squeeze` scales only the `body` group `(1 + 0.3(1−k), k, k)`; `dispose` frees every geometry, material and ink line.
Cost: ~30 extra meshes (digits are tiny) and 26 `Line2` draw calls; no per-frame allocation.

### 5.4 `index.js` — `poseName === 'constrict'`
```js
const girth = 2.7, hbLen = 21;                          // black rat, real scale (§3.2)
const hc = restH[Math.round((K - 1) * 0.36)];           // boa thickness where the loops are
const Rc = girth + hc * sec.bottom;
const axisY = Rc + hc * sec.top + 0.3;                  // lowest loop clears the paper
prey = buildPrey(ctx, { axisY, hb: hbLen, tailLen: 24, girth });
model.prey = { axisY, radius: girth, length: hbLen, shoulderX: prey.shoulderX, hipX: prey.hipX };
```
Also `POSE_TITLES.constrict` (§4). The `prey.group.visible = skin || showBones` gating stays.

### 5.5 `poses.js` — `constrict(m)`
- `TURNS = 2`, `PER_TURN = 10`; loop radius per control point grows from the neck-region thickness `hA = h0[0.14K]` to `hB = h0[0.36K]`; pitch `0.72·(hA + hB)`; helix starts at `x0 = prey.shoulderX − 0.25·hA`, phase `θ = −π/2 − 2π·i/PER_TURN` (the first loop comes over the top behind the head).
- Head control points: on the far side of the nape (`z = −0.9·r0`, ± yaw sway), lifted `0.5·r0` above the axis.
- After the helix: down to the paper and a wide loop behind and around (`xe − 6 … xe − 46` cm, `±R0·(1.2 … 4.9)` in z). **Scale those cm offsets by `m.L / 200`** (the prototype hard-codes them for 2 m).
- Keep `tight` keys, `Rc = Rc0·(1 − 0.05·tight)`, the gape keys and `tongueBouts` — everything stays a pure function of `t` (seam unchanged).

### 5.6 SVG export: part names and swatches
- **Boa** (`patternSwatches('boa', part)`): body `[Grey-beige ground #b3afa4, Blackish saddle rims #1f1814, Dark-brown saddles #45342a, Tan hind body #a8916f, Pale saddle lobes #cdc3ad, Red-brown tail saddles #4a2219, Cream borders and belly #d9cfb8]`; tail `[cream, red-brown, rim]`; head `[Grey-beige crown, Dark head stripes, Rust snout patch, Cream lips, Mouth lining]`; jaw `[Cream chin, Mouth lining]`. ES: *Fondo gris beige, Bordes negruzcos de las manchas dorsales, Manchas dorsales café oscuro, Parte posterior canela, Lóbulos claros, Manchas rojizas de la cola, Bordes y vientre crema; Corona gris beige, Franjas oscuras de la cabeza, Mancha rojiza del hocico, Labios crema, Mentón crema, Mucosa bucal.*
- **Rat** (`buildPrey().parts`): `prey-fur` "Black rat — fur" `#6b5f55`, swatches `Grey-brown back #6b5f55 · Buff-grey flanks #8b7f72 · Pale grey belly #d6ccbd`; `prey-skin` "Black rat — ears, nose and feet" `#c99a8c`; `prey-tail` "Black rat — tail" `#7a6a62`; `prey-eye` "Black rat — eyes" `#0d0b0a`. Whiskers and ear rims export as ink strokes automatically (`userData.isInkLine`). ES: *Lomo pardo grisáceo, Flancos gris beige, Vientre gris claro, Orejas y patas rosadas, Cola oscura y escamosa.*
- Checked in the prototype: the colour plate prints the boa in its separations and the rat fur in three swatches with pink ears/feet and whisker strokes (`proto-v5-svg-color.png`); the line plate keeps the rat's ears, feet and whiskers (`proto-v5-svg-line.png`). Single-swatch parts print flat (expected).

### 5.7 Docs
`CONTRACTS.md` §12 row VII, the two skill references, and `docs/books/serpientes*.md` if it describes the prey (§4).

### 5.8 What to do better than the prototype
- Boa head: once the head task delivers a real head, check the §2.6 stripes on it; make the jaws close on the rat's nape (§3.4).
- Rat: add a slight cheek/whisker-pad bulge and a visible neck crease at the first loop; give the visible forefoot a curled grip; check the fur hatching for moiré at book zoom on a phone.
- Optional boa sheen (§2.7).
- Lighting: the rat sits in the boa's shadow; if the face is too dark in the reader, raise `reflect` on the fur material rather than its albedo.

### 5.9 Acceptance criteria
Boa (lab `view=close`, t = 2, WebGPU and WebGL 2):
1. Top view counts **24 saddles on the body and 5 on the tail**.
2. Figure-pixel k-means (paper removed, script below): dark clusters (lightness < 0.18) ≥ **20 %** of figure pixels (current 15 %, prototype 24 %); ground clusters (lightness 0.45–0.70) have saturation ≤ **0.18**; **no** cluster with hue 5–20°, saturation > 0.45 and lightness 0.25–0.45 (the current brick red `#7e3923`).
3. Fore-body ground on the lit top of the first loop has `|R − B| ≤ 30`; hind-body ground `R − B ≥ 25` (grey → tan).
4. Saddles read as solid dark shapes with pale-centred flank lobes and a cream border at book zoom (reader 1440 × 900) — not as outlines.
5. Tail: dark red-brown saddles fill ≥ 70 % of each period, cream interspaces; no brick red.
6. Belly (rotate the figure on its side): flecks visibly denser towards the tail.
7. Head (zoom on the head): median stripe, rust preocular, black postocular to the jaw angle, subocular wedge, cream lips; the `eye-stripe` label anchor sits on the stripe.

Rat:
8. Real scale: `rat-body` bounding box ≈ 21 ± 1.5 cm long (head–body), tail ≥ 1.1 × head–body along its curve, chest 5–6 cm across (`--eval` on `lab.figure.root.getObjectByName('rat-body')`).
9. From the reader camera at t = 0.3, 1.6, 2.0, 3.75 (book zoom and inspect): face with dark eye and pink nose, ≥ 1 ear, ≥ 1 forefoot with digits, whiskers; hind feet and tail behind the coils; the tail touches the paper.
10. No interpenetration through the loop (scrub 0 → 5 s in 0.25 s steps): boa head vs rat ears/head, loops vs rat forelimbs.
11. Colours: back cluster hue 20–40°, saturation ≤ 0.15; belly visibly paler; ears/feet/nose pink; tail uniformly dark (not pale beige).
12. `node scripts/audit.mjs` (and `--webgl`): seam OK, `update` < 2 ms, ≥ 2 layers; no console errors.
13. SVGs as in §5.6; no label lands on the rat.
14. `node scripts/validate-books.mjs serpientes` passes; `typeset.html?book=serpientes&page=all` shows no overflow (caption, sources).

### 5.10 Verification shots (exact)
```bash
cd /Users/josoroma/sites/books
P='%7B%22species%22%3A%22boa-imperator%22%2C%22pose%22%3A%22constrict%22%7D'
O=.scratch/bilingual/boa/after
# lab, WebGPU and WebGL 2, through the loop
for t in 0.3 1.6 2 3.75; do
  node scripts/shot.mjs "lab.html?type=snake&params=$P&t=$t&play=0&ui=0&labels=0&view=close" $O-lab-t$t.png --w 1400 --h 1000 --wait 2500
done
node scripts/shot.mjs "lab.html?type=snake&params=$P&t=2&play=0&ui=0&labels=0&view=close" $O-lab-webgl.png --w 1400 --h 1000 --wait 2500 --webgl
for v in top front side; do
  node scripts/shot.mjs "lab.html?type=snake&params=$P&t=2&play=0&ui=0&labels=0&view=$v" $O-lab-$v.png --w 1400 --h 1000 --wait 2500
done
# rat close-up
node scripts/shot.mjs "lab.html?type=snake&params=$P&t=2&play=0&ui=0&labels=0&view=close" $O-rat.png --w 1400 --h 1000 --wait 2500 \
  --eval "const c=lab.camera; c.setViewOffset(1400,1000,760,330,520,371); c.updateProjectionMatrix(); await new Promise(r=>setTimeout(r,600))"
# rat size
node scripts/shot.mjs "lab.html?type=snake&params=$P&t=2&play=0&ui=0&labels=0&view=top" $O-size.png --w 600 --h 400 --wait 500 \
  --eval "const W=await import(performance.getEntriesByType('resource').map(e=>e.name).find(u=>/three_webgpu/.test(u))); const r=lab.figure.root; r.updateMatrixWorld(true); const inv=new W.Matrix4().copy(r.matrixWorld).invert(); const b=new W.Box3(); const rb=r.getObjectByName('rat-body'); rb.geometry.computeBoundingBox(); b.copy(rb.geometry.boundingBox).applyMatrix4(rb.matrixWorld).applyMatrix4(inv); const s=b.getSize(new W.Vector3()); return [s.x,s.y,s.z].map(v=>v.toFixed(1)).join(' x ')+' cm'"
# reader: book zoom, inspect, phone (use the preview build for long runs: LAMINA_URL=http://127.0.0.1:4173)
node scripts/shot.mjs "index.html#/serpientes?plate=7&t=2.0" $O-reader.png --w 1440 --h 900 --wait 3000
node scripts/shot.mjs "index.html#/serpientes?plate=7&t=2.0&labels=0" $O-inspect.png --w 1440 --h 900 --wait 3000 --eval "lamina.inspect(true); await lamina.settle(1800)"
node scripts/shot.mjs "index.html#/serpientes?plate=7&t=2.0" $O-phone.png --w 390 --h 844 --wait 3000
node scripts/shot.mjs "index.html#/serpientes?plate=7&t=2.0" $O-reader-webgl.png --w 1440 --h 900 --wait 3000 --webgl
# SVG plates
node scripts/export-svg.mjs "lab.html?type=snake&params=$P&t=2&view=close" $O.svg --mode color --png $O-svg.png
node scripts/export-svg.mjs "lab.html?type=snake&params=$P&t=2&view=close" $O-line.svg --mode line --png $O-svg-line.png
# checks
node scripts/audit.mjs && node scripts/audit.mjs --webgl
node scripts/validate-books.mjs serpientes
```
Palette check (criterion 2): the k-means helper used for §1.3 is a 25-line NumPy script; the thresholds above were measured with it on `cur-lab-close.png` (fails) and `proto-v5-lab-close.png` (passes).

**To look at the prototype before implementing** (dev server only — it serves `/.scratch/`):
```bash
node scripts/shot.mjs "lab.html?type=snake&params=$P&t=2&play=0&ui=0&labels=0&view=close" out.png --w 1400 --h 1000 --wait 1000 \
  --eval "window.__protoV=5; $(cat .scratch/bilingual/boa/proto/mount-proto.js) return window.__protoMount"
node scripts/shot.mjs "index.html#/serpientes?plate=7&t=2.0&labels=0" out-reader.png --w 1440 --h 900 --wait 2500 \
  --eval "await lamina.settle(600); window.__protoV=5; $(cat .scratch/bilingual/boa/proto/reader-proto.js) return window.__protoMount"
```

---

## 6. Not verified / open
- Savage 2002 and Solórzano 2004/2022 (the standard Costa Rican accounts) could not be consulted; if someone has them, check the saddle count and the head "cross" against them.
- Photo colours are camera-dependent; the albedo targets were tuned by rendering, not by colorimetry.
- No published record found of *B. imperator* eating *R. rattus* **in Costa Rica** specifically (Mexico and Aruba records exist; Costa Rican records say "rat"). The caption says "a black rat" as a depiction of a documented prey species, not as a Costa Rican observation; the content team may prefer "around a rat" (ES "alrededor de una rata") — then the extra source is optional.
- Boback et al. 2015 is internally inconsistent on the rat species (Introduction vs Methods), see §3.1.
- The Nicoya pinkish phenotype and the dark Caribbean coppery phenotype are real alternatives; the chosen one is a choice, not "the" béquer.

## 7. References (all opened unless stated)
- Aguilar-López, J. L. & Tapia-Ramírez, G. (2025). Depredación de *Rattus rattus* (Muridae) por *Boa imperator* (Boidae) en el sur de México. *Rev. Latinoam. Herpetol.* 8(4): 271–276. https://doi.org/10.22201/fc.25942158e.2025.4.1460
- Boback, S. M., Hall, A. E., McCann, K. J., Hayes, A. W., Forrester, J. S. & Zwemer, C. F. (2012). Snake modulates constriction in response to prey's heartbeat. *Biol. Lett.* 8: 473–476. https://doi.org/10.1098/rsbl.2011.1105 (abstract via Europe PMC; methods via https://pmc.ncbi.nlm.nih.gov/articles/PMC3367750/)
- Boback, S. M., McCann, K. J., Wood, K. A., McNeal, P. M., Blankenship, E. L. & Zwemer, C. F. (2015). Snake constriction rapidly induces circulatory arrest in rats. *J. Exp. Biol.* 218: 2279–2288. https://doi.org/10.1242/jeb.121384
- Card, D. C. et al. (2016). Phylogeographic and population genetic analyses reveal multiple species of *Boa* and independent origins of insular dwarfism. *Mol. Phylogenet. Evol.* 102: 104–116. https://pmc.ncbi.nlm.nih.gov/articles/PMC5894333
- Duque-Torres, D., Aponte-Gutiérrez, A. F., Molina-Moreno, T. & Arteaga, A. (2024). Central American Boa (*Boa imperator*). In Arteaga, A., Bustamante, L. & Vieira, J. (eds) *Reptiles of Ecuador*. https://doi.org/10.47051/DVNA9462 — https://www.reptilesofecuador.com/boa_imperator.html
- Florida Museum of Natural History. Florida Snake ID: *Boa constrictor*. https://www.floridamuseum.ufl.edu/florida-snake-id/snake/boa-constrictor/
- GBIF.org (2026-11-01). Occurrence search, *Rattus rattus* (taxonKey 2439270) and *R. norvegicus* (2439261), country CR. https://www.gbif.org/occurrence/search?taxon_key=2439270&country=CR
- Gillespie, H. (2004). *Rattus rattus*. Animal Diversity Web. https://animaldiversity.org/accounts/Rattus_rattus/
- Hadjisterkotis, E., Konstantinou, G., Sanna, D., Pirastru, M. & Mereu, P. (2020). First mtDNA sequences and body measurements for *Rattus norvegicus* from the Mediterranean island of Cyprus. *Life* 10(8): 136, Table 3 and §3.1.1. https://doi.org/10.3390/life10080136
- Henderson, R. W. (2023). A review of predation by *Boa constrictor*: what, when, and where. *Herpetol. Conserv. Biol.* 18(3): 569–578. https://www.herpconbio.org/Volume_18/Issue_3/Henderson_2023.pdf
- Instituto Clodomiro Picado, Universidad de Costa Rica. Image gallery "snakes 01" (*Boa imperator*, photos A. Solórzano). https://icp.ucr.ac.cr/index.php/en/resources/imagenes/snakes-01
- iNaturalist (2026-11-01). Research-grade observations, *Boa imperator* (taxon 539399) and *Rattus rattus* (44575), Costa Rica (place 6924). https://www.inaturalist.org/observations?taxon_id=44575&place_id=6924&quality_grade=research
- Lindemann, L. (2009). *Boa constrictor*. Animal Diversity Web. https://animaldiversity.org/accounts/Boa_constrictor/
- Myers, P. (2001). Muridae. Animal Diversity Web. https://animaldiversity.org/accounts/Muridae/
- Quinn, N. (2024). *Pest Notes: Rats.* UC IPM Publication 74106 (revised June 2024). https://ipm.ucanr.edu/pdf/pestnotes/pnrats.pdf
- Solórzano, A. & Sasa, M. (2024). Failed predation of a newborn calf by the Central American common boa (*Boa imperator*) in Costa Rica. *Rev. Latinoam. Herpetol.* 7(1): 181–184. https://doi.org/10.22201/fc.25942158e.2024.1.907
- Suárez-Atilano, M., Rojas-Soto, O., Parra, J. L. & Vázquez-Domínguez, E. (2017). The role of the environment on the genetic divergence between two *Boa imperator* lineages. *J. Biogeogr.* (bibliographic record only: https://siia.unam.mx/siia-publico/c/busqueda_individual.php?id=119892)
- Towal, R. B., Quist, B. W., Gopal, V., Solomon, J. H. & Hartmann, M. J. (2011). The morphology of the rat vibrissal array. *PLoS Comput. Biol.* 7: e1001120. https://doi.org/10.1371/journal.pcbi.1001120
- Villa, J. & Rivas, A. (1971). Tres serpientes albinas de Nicaragua. *Rev. Biol. Trop.* 19(1–2): 159–163. https://tropicalstudies.org/rbt/attachments/volumes/vol19-1/12-Villa-Serpientes.pdf
- Wistar rat. Wikipedia (strain of the brown rat). https://en.wikipedia.org/wiki/Wistar_rat
- serpientesdecostarica.com, "Serpiente Bécquer" (anonymous; corroboration only). https://serpientesdecostarica.com/en/serpiente-becquer/
- Not consulted (unavailable): Savage, J. M. (2002) *The Amphibians and Reptiles of Costa Rica*; Solórzano, A. (2004, 2022) *Serpientes de Costa Rica*; Reed, R. N. & Rodda, G. H. (2009) *Giant Constrictors*, USGS OFR 2009-1202 (https://pubs.usgs.gov/of/2009/1202/); The Reptile Database, *Boa imperator* (diagnosis temporarily removed).

## 8. Image credits (reference sheets, internal use; `.scratch/` is git-ignored)
`refs-boa-cr.png`: B1 Lucas Vogel, Gandoca-Manzanillo, 2018, CC BY-SA 4.0 (Wikimedia Commons, *Boa constrictor imperator (Costa Rica).jpg*); B2 Matthias Bethke, Puerto Viejo, 2006, CC BY-SA 4.0 (Commons); B3 John Deitsch, iNat 28968884, CC BY-NC; B4 guidoronge, iNat 267685625, CC BY-NC; B5 osgeo_photowild, iNat 199058392, CC BY-NC; B6 Jairo Moya Vargas, iNat 111571351, CC BY-NC; B7 kayleeivy77, iNat 70335360, CC BY-NC; B8 Sinclair Laing, iNat 363203537, CC BY; B9 Dean Thompson, iNat 178013546, CC BY-NC.
`refs-rat-cr.png` (*Rattus rattus*, all CC BY-NC): R1 sergiovillegas, iNat 137453496 (Sarapiquí); R2 Federico A. Chinchilla Romero, iNat 145439182 (San José); R3 jonathan_chama_corrales, iNat 154113295 (La Cruz); R4 Cameron McIsaac, iNat 154383363 (Nandayure); R5 Randall Jiménez, iNat 248290360 (Coto Brus); R6 gwen506cr, iNat 93549763 (San Ramón).
ICP and Solórzano & Sasa 2024 photos were viewed at their sources and are cited, not copied.

---

## Review (adversarial)

*critique:boa-rat, 2026-11-01. Lenses: herpetologist (Boa imperator colour and pattern) and mammalogist (the rat, its pose in the coils). Every cited source that carries a claim below was reopened (PDFs text-extracted, figures rendered at 200 dpi); two further sources were added (GISD, Madrid Salud). The prototype was re-mounted on the dev server and rendered on WebGPU (top, top zoomed on the head, front, rear) and WebGL 2 (close). Nothing in `src/` was touched. Evidence images (temporary, outside the repo) are in `/private/tmp/claude-501/-Users-josoroma--claude-spares-spare-dT3EdI/a4e0399d-cbbe-47ab-aeb0-b0604dd935a3/scratchpad/` (`shots/proto-top-head.png`, `shots/proto-close-webgl.png`, `shots/proto-rear.png`, `dl/solsasa/fig2a.png`, `dl/solsasa/fig1d.png`, `dl/icp/icp1-s.png`…`icp3-s.png`).*

**Bottom line.** The rat half is sound and well sourced; it needs small fixes (ear colour, whisker rows, a real bite, the native-rodent paragraph). The boa half is right at the front of the snake and wrong at the back. The Costa Rican material the spec cites shows the hind body and tail getting **darker** (blackish-brown saddles that grow and close up, narrow cream-buff gaps). The spec makes them warmer (tan ground) and redder (maroon `#4a2219`), and the renders read as a red-tailed boa again. The head painter also floods the top of the snout with rust, and it collides with the faces task, which rewrites the same function.

### R1. Boa: claim by claim

| # | claim (where) | verdict | evidence (opened) |
|---|---|---|---|
| B-1 | Silvery grey-beige fore-body (§0, §2.2, §2.3) | **confirmed** | B1, B3, B6, B8; Solórzano & Sasa 2024 Fig. 1D (olive-grey) and Fig. 2A (grey); the Florida Museum page lists greyish brown among the ground colours. Grey is commoner than the spec says, because B6 is grey too (B-16). |
| B-2 | Ground "warming to buff-tan behind"; hind ground `#a8916f` (§0, §2.2, §2.4, §2.5, criterion 3) | **wrong as stated and as cited** | Only B1 shows a warmer coppery stretch. Sol. & Sasa Fig. 2A (cited as evidence of warming): the posterior third and the tail are blackish-brown with buff gaps. k-means of that region gives `#090909`, `#3c3430` and `#766960`, all with saturation ≤ 0.11. B4 shows the same darkening, and a coil in Fig. 1C–D is near-black with cream-yellow marks. GISD (IUCN SSC ISSG profile of *B. c. imperator*) notes prominent dark tail markings in some individuals. The ADW and Florida Museum sentences the spec leans on describe the **saddles** becoming more colourful and reddish towards the tail, not the ground. Florida's boas are also thought to be *B. c. constrictor*, the red-tailed taxon the spec is trying to avoid. |
| B-3 | 24 saddles on the body + 5 on the tail (Villa & Rivas 1971) | **confirmed, weak** | p. 159 gives exactly these counts, but n = 1: an **albino** zoo animal, "supposedly" from near Juigalpa, whose tail the authors say looks incomplete. 5 is therefore a minimum. The total of 29 agrees with 22–30 (Duque-Torres et al. 2024, citing Reed & Rodda 2009) and with GISD's "some 30" saddles. Fine as a design value; do not call it the Costa Rican count. |
| B-4 | Bow-tie / hourglass saddles; pale ovals form a chain | **confirmed** | Florida Museum (hourglass saddles); Duque-Torres et al. (dark markings forming a chain); serpientesdecostarica (pale ovals between the blotches). Villa & Rivas call the blotches oval. Both shapes occur. |
| B-5 | Black rims, dark-brown interiors with rust scales, one cream border row | **confirmed** | Sol. & Sasa Fig. 1D (black rims, cream borders); ICP1–2 (rust interiors); ADW (black or cream edging). Caveat for §1.2: B6 (Guanacaste) has **hollow** saddles, black rims round a ground-grey interior. Hollowness is a real phenotype; the defect in 44.png is thin brown rims. |
| B-6 | Lateral rhomboids with pale centres | **confirmed** | ADW (dark rhomboid marks along the sides); Sol. & Sasa Fig. 2A (dark neck ocelli with pale centres); B6 |
| B-7 | Pale centres in the saddles' flank lobes | **confirmed, weak** | Seen only in ICP1 (white spots inside saddles); no text source. At 85 % they read as a white "eye" in every saddle (`proto-v5-svg-color.png`, my front view). |
| B-8 | Tail saddles "dark red-brown to black-brown, not brick red" | **words confirmed; albedo wrong** | Duque-Torres et al.: reddish-brown and black on the tail, and dark-brown rather than brick-red tail blotches (O'Shea 2007). But `#4a2219` has HSL 11° / 0.49 / 0.19 and OKLab chroma 0.063, half the old brick red's 0.121. The spec's own Costa Rican tail samples (`#141417`, `#3a3735`, `#635b52`, `#1a181f`) have chroma 0.005–0.018. My k-means of the prototype renders (`proto-v5-lab-close.png` and my WebGL 2 close-up) finds a 13–17 % cluster near `#3e2012` (hue 20°, sat 0.55). It passes criterion 2 only because it is darker than L 0.25. |
| B-9 | Cream belly with dark flecks | **confirmed** | Florida Museum (light belly mottled with dark spots or smudges); B4; B6 |
| B-10 | Flecks increase towards the tail (6 → 22 %) | **unsourced** | one photo (B4); no text |
| B-11 | Dark median head stripe, `#211915` | **confirmed; colour too dark** | Duque-Torres et al. (three dark stripes snout → nape); Florida Museum (thin dark stripe). The ICP photos the spec cites show a **rust-brown** crown stripe (ICP2, ICP3), and serpientesdecostarica calls it paler. Near-black is the extreme. |
| B-12 | Rust patch between nostril and eye | **confirmed (photos)** | B3, ICP3. ADW calls the same area a dark triangle. Fine, but the figure and the label text must agree (R3). |
| B-13 | Black postocular stripe to the jaw angle; subocular wedge; cream lips | **confirmed** | ADW; Florida Museum; B3; ICP3 |
| B-14 | (missing) White border under the postocular stripe; dark labial bars | **not in spec** | Florida Museum (dark marks behind the eyes, often bordered by white below); ICP3; B3 (black bars on the white labials); faces-task photo P7 (dark blotches on the posterior supralabials) |
| B-15 | First nape saddle = the "cross" of Villa & Rivas (§2.5) | **unsourced** | Villa & Rivas only name a supracephalic "cross" typical of *imperator*, on the head. Nothing links it to a nape saddle. |
| B-16 | B6 is "olive-khaki / tan" (§2.2) | **wrong** | B6 is silvery grey (median of its pale, low-saturation pixels `#a8a7a2`) with hollow black-rimmed ovals |
| B-17 | Small smooth scales; 74 midbody rows; flank iridescence | **confirmed** | Florida Museum; Villa & Rivas; ICP1 |
| B-18 | Usually 2–2.5 m, none over 3.8 m in Costa Rica; rats eaten; the Parrita juvenile died after an adult rat | **confirmed** | Sol. & Sasa 2024 pp. 181, 183 (the juvenile was about 75 cm and died two days later in the laboratory) |

### R2. Rat: claim by claim

| # | claim | verdict | evidence |
|---|---|---|---|
| R-1 | *R. rattus* is documented *B. imperator* prey (Aguilar-López & Tapia-Ramírez 2025) | **confirmed, with caveats** | The authors call it the first record. The boa was small, 57 cm (SVL 500 + tail 70 mm). The rat (SVL 140 mm) was partly decomposed and identified *preliminarily* from photographs, then confirmed on a female rat trapped later at the same house. |
| R-2 | Black rat common in Costa Rica: GBIF 89 (70 preserved) vs 17 *R. norvegicus*; 20 research-grade iNat observations | **confirmed** | GBIF and iNaturalist APIs, 2026-11-01. iNat also has 8 *R. norvegicus*. |
| R-3 | No published native alternative (only *Sigmodon* considered, §3.1) | **incomplete** | Table 1 of the same 2025 paper lists the native big-eared climbing rat *Ototylomys phyllotis* (Cricetidae) as *B. imperator* prey (Bakkegard & Timm 2001; Leenders & Watkins-Colwell 2003). GBIF holds 55 Costa Rican records of it (23 preserved specimens). The black rat stays defensible; the paragraph must name this option. |
| R-4 | Henderson 2023 lists "murids such as the house mouse" | **wrong wording** | 91 records, mostly from Brazil. The only murid is *Mus musculus* (Argentina, Sironi et al. 2000); the rest are cricetids. The review **excludes** *B. imperator* records outright, so it says nothing about this species. |
| R-5 | Boback et al. 2012: warm rat cadavers with a simulated heart; boas wild-caught in Belize | **confirmed / incomplete** | The abstract confirms cadavers, heart and the heartbeat response. It also used snakes naïve to live prey. "Belize" could not be checked in the paper (PMC shows a captcha; the publisher returns 403). |
| R-6 | Boback et al. 2015: Introduction says *R. rattus*, Methods say male Wistar 350–475 g; rats offered head first; loops on thorax and abdomen; two or more loops; mouth held until release | **confirmed** | JEB full text: thorax + abdomen in 15/17 trials, neck in 2/17; duration measured from strike to mouth release |
| R-7 | Sizes (Hadjisterkotis et al. 2020, Table 3) | **confirmed** | Read through the Europe PMC API: HB 182.7 (155–234), n 63; tail 216.9 (180–269), n 60; hind foot 36.2 (33–42), n 40; ear 23.7 (20–26), n 30; mass 188.4 (100–279), n 35. These are Kryštufek & Vohralík's rats **from Turkey and Cyprus**. |
| R-8 | Design HB 21 cm, chest 5.4 cm ("a 250 g rat") | **confirmed, weak** | Inside ADW's 16–22 cm, but near its top. 250 g is above the 188 g mean and far above the 70–103 g given for southern Mexico (personal communication in the 2025 paper). The spec's own spheroid gives about 4.6 cm across for a 188 g rat. Call it "a large adult". |
| R-9 | Tail longer than head and body, scaly, mostly hairless, uniformly dark | **confirmed** | UC IPM Table 1 (tail uniformly dark with fine scales; commensal rats' tails scaly and mostly hairless); Madrid Salud (tail laid over the back reaches past the snout) |
| R-10 | Pointed muzzle; large thin ears that reach the eye when folded forward | **confirmed** | UC IPM; Aguilar-López & Tapia-Ramírez 2025; Madrid Salud (ears reach the edge of the eye; prominent eyes) |
| R-11 | Ears and feet `#c99a8c` | **wrong (over-saturated)** | The spec's own samples `#93776b`–`#bdaba2` have HSL saturation 0.16–0.17; `#c99a8c` has 0.36. The renders show salmon petals, a cartoon mouse. |
| R-12 | Grey-brown agouti back, paler flanks, pale belly; agouti rather than black form | **confirmed** | Hadjisterkotis §3.1.1 (frugivorus and alexandrinus types); UC IPM (belly grey to white); ADW (any mix of black, white, grey and agouti) |
| R-13 | Forefoot four clawed fingers + small thumb; hind foot five toes | **confirmed** | Myers 2001: the thumb bears a nail. The prototype draws no thumb, which is fine at this scale. |
| R-14 | About 30 whiskers a side, up to about 5 cm; drawn as "4 rows × 3 columns" | **count confirmed, layout wrong** | Towal et al. 2011: about 30 per side in **5 rows (A–E)**, getting shorter towards the nose. The 50.5 mm is one example whisker from Sprague-Dawley rats (*R. norvegicus*), not a maximum for *R. rattus*. |
| R-15 | Eye Ø 0.7 cm; tail Ø 0.92 cm at the base; ring scales every 0.25 cm | **unsourced** | photo estimates or none |
| R-16 | In the coils: two loops on thorax and abdomen, face and forefeet in front, hind legs and tail behind | **confirmed** | Boback 2015. But the prototype's boa head lies **beside** the rat's head, facing the same way, with no bite, and gapes at 3.4–4.3 s at nothing. That contradicts Boback 2015 (mouth held throughout) and the proposed beat "the jaws hold on". |

### R3. The text changes (§4)

- Caption EN/ES: **accurate** as a depiction. §6's caveat stands: the Costa Rican record does not name the species.
- `beats[0]` EN/ES: **accurate**.
- `beats[1]` "pressing on the rat's **heart** and blood vessels": **overstated**. Boback 2015 measured circulatory arrest; it did not show the coils compressing the heart. The current word "chest" was right.
- `beats[2]` and `beats[3]` and their ES: **accurate** (Boback 2012: snakes gave up soon after the heartbeat stopped).
- `poses.js` beat 0, "the jaws hold on": **narrates a bite the loop does not perform** (verify.md forbids this). Build the bite or drop the clause.
- `poses.js` beat 1 ES, "cortan el flujo de sangre, **no la respiración**": **wrong**. It says the coils do not restrict breathing. The claim is that death comes from circulatory arrest, not suffocation.
- "Unchanged and still correct: … the `eye-stripe` label text": **not if the rust preocular ships**. The label (`index.js` l. 371) and the look-closer note (`serpientes.js`) both say a **dark** stripe runs from the snout through the eye.
- ES swatch "Mancha rojiza del **hocico**": names the snout tip, which is where the prototype bug paints it (R4). The mark is preocular.
- `back.sources` 18 → 19: passes `validate-books.mjs` (5–20). `references/manifest.md` still says 5–12; the book already breaks that.
- Where the Spanish goes is unstated. Per `design-i18n.md` §3.2–3.3 and Appendix A: manifest strings go in `src/books/es/serpientes.js`; part, swatch and pose-beat strings go in `src/i18n/es/snakes.js`, **keyed by the new English literals**. Stale keys (`Prey (stylised rodent)`, `Fur`, `Pale snout, ears and tail`, `Brown blotches`, `Pale saddle centres and speckles`, `Dark saddles`) must go. Keep `Tan ground` and `Tan crown`: the bushmaster's swatches still use them (`patterns.js` l. 434–435). `POSE_TITLES` build the figure title, a developer label: §3.2 leaves it untranslated and Appendix A says translate it last. "constriñendo una rata negra" is therefore low priority.

### R4. The implementation plan against the real code

- **Patch applies.** `patch -p0 --dry-run` of `proto/prototype.diff` against a fresh copy of `src/subjects/snakes/` applies all 9 hunks in 5 files cleanly (21:3x; the src snake files were last modified 14:32–19:58).
- **APIs exist as described**: `bodySkin` (snap 0.6), `PATTERNS`, `headColorNode` with local `lineDist`, `patternSwatches`, `buildTube` (uv = s cm, lat), `makeSection`, `catmullRom`, `rng`, `ctx.inkLine` (takes Vector3s, has `dispose()`, `userData.isInkLine`), `ctx.ink({ sheen })` (switches to `MeshPhysicalNodeMaterial`), `restH`, `sec`, `POSE_TITLES`, `keys`, `tongueBouts`, `prey.group.visible` gating.
- **Both backends: confirmed.** My WebGL 2 render (`shots/proto-close-webgl.png`) shows no console errors; `rat-body` measures 21.00 × 5.29 × 5.40 cm; parts list `prey-fur, prey-skin, prey-tail, prey-eye`.
- **Defects:**
  1. **Head painter.** The prototype paints the rust preocular in (hx, hy) only, so it wraps over the **top of the snout** as an orange cap (`shots/proto-top-head.png`). This is the "snout flood" bug `research-snake-faces.md` §1 already diagnosed. The faces task rewrites `headColorNode` for every species, with `lateral` and `dorsal` masks from `normalGeometry` (§4.3), and also rewrites the boa `patternSwatches` for head and jaw. **Do not apply the prototype's `headColorNode` hunk.** The boa task should hand its head colours (crown, median stripe, preocular, eye stripe, lips) to the faces painter. One owner, one swatch list.
  2. §5.2 says two noise lookups plus one cell-noise lookup per fragment. **Wrong:** `PATTERNS.boa` makes **four** `mx_noise_float` calls (wobble, lower edge, mottling, ground) plus the shared per-scale hash.
  3. `buildPrey`'s `tailLen` is **ignored**: the tail is hard-coded control points, about 24 cm only because `axisY` ≈ 10.
  4. The furred **forelimbs and thighs** sit under `body` but outside every part object (parts are `torso`, `skin`, `tail`, `eyes`). `idpass.js` `partFor()` therefore gives them their own colour region, which `prettyName('')` names **"Body"**, the same name as the snake's body part, and fills flat. Put limbs and torso in one `fur` group and make that the `prey-fur` part.
  5. Tail swatches `[cream, red, rim]`: the first swatch is the part's flat fill and dominant colour (`patternSwatches` doc). Saddles fill ≥ 70 % of the tail, so the saddle colour must come first.
  6. Body swatches are too close in OKLab: pale lobes ↔ cream **0.037**, dark-brown ↔ red-brown **0.050**, ground ↔ pale lobes 0.067. The faces task asks for ≥ 0.08. Per-scale shading lives in the albedo, so pixels will flip between names. Merge them.
  7. §5.8 "raise `reflect` on the fur": `reflect` already defaults to 1, the top of its documented 0–1 range.
  8. §2.7 sheen: three.js `sheen` is a cloth (velvet) lobe, not the thin-film iridescence seen on boas. Optional; at most a soft rim.
  9. Criterion 2 cannot be reproduced: the "25-line NumPy" k-means script is not saved anywhere under `.scratch/`. The §5.10 size check reads `lab.figure`, which still points at the old figure after `mount-proto.js` remounts (use `lab.host.get(0).figure`), and it imports a dev-server chunk name, so it fails on the preview build.
  10. Minor: `wrapLines` in `props.js` becomes dead code. `squeeze()` also compresses the head, ears and whiskers outside the coils. §1.4's "normalised offset 0.70" is the squared norm; the norm is 0.84.

### R5. Exact corrections (old → new)

1. §0.1 "a **silvery grey-beige fore-body** warming to **buff-tan behind**" → "a **silvery grey-beige fore-body** that **darkens behind**: saddles grow and close up and the ground turns grey-brown (Sol. & Sasa Fig. 2A; B4)".
2. §0.1 "**tail saddles dark red-brown to black-brown on cream (not brick red)**" → "**tail saddles blackish-brown, with a few rust scales, on narrow cream-buff gaps (not brick red, not maroon)**".
3. §2.2 bullet 1 "Silvery grey-beige fore-body, warming behind: … San Carlos (Solórzano & Sasa Fig. 1), Parrita juvenile (Fig. 2)." → "Silvery grey-beige fore-body: B1, B3, B6, B8, Sol. & Sasa Figs 1–2. Behind, Fig. 2A and B4 **darken** to blackish-brown with buff or cream gaps; a coil in Fig. 1C–D is near-black with cream-yellow marks; only B1 shows a warmer coppery stretch."
4. §2.2 bullet 2 "Olive-khaki / tan: La Cruz (B5), Guanacaste (B6), ICP photos." → "Olive-khaki / tan: La Cruz (B5), ICP photos. Silvery grey with hollow black-rimmed ovals: Guanacaste (B6)."
5. §2.4 "ground, hind body | warmer tan (ADW, Florida Museum: more colourful towards the tail) | **`#a8916f`** | ADW, FLMNH" → "ground, hind body | darker grey-brown between enlarged saddles: `#766960` (Parrita, Fig. 2A, flash) | **`#8c7f72`** | Sol. & Sasa Fig. 2A, B4".
6. §2.4 "tail saddles | … | **`#4a2219`** interior, `#1f1814` rim" → "**`#33261f`** interior (HSL 21° / 0.24 / 0.16; OKLab chroma 0.023) with ~15 % `#7b4b32` rust scales (Duque-Torres: reddish-brown and black), `#1f1814` rim".
7. §2.4 "median head stripe, postocular stripe, subocular wedge | … | **`#211915`**" → "median stripe **`#4a3426`** (dark brown; ICP2–3 rust-brown; Florida Museum 'thin, dark') · postocular and subocular **`#211915`**".
8. §2.5 "**Hind body** (`s/L` 0.68 → 0.86): saddle interiors turn `#4a2219`; ground warms to `#a8916f`." → "**Hind body** (`s/L` 0.68 → 0.86): saddle interiors turn `#33261f` and widen towards `half = 0.39·P`; ground darkens to `#8c7f72`."
9. §2.5 "(it continues the median head stripe, the "cross" of Villa & Rivas)" → "(continuing the median head stripe; a design choice)".
10. §2.6, add: "**Pale border** of 1–2 scale rows (`#e3dccb`) under the postocular stripe (Florida Museum; ICP3) · **dark bars** on the posterior labials (B3; faces task P7) · every lateral mark is painted on the `lateral` mask only, never over the crown (faces task §4.3)."
11. §2.1 Villa & Rivas row, append "— an **albino** zoo specimen of uncertain locality, tail incomplete (5 tail blotches is a minimum)". Florida Museum row, append "(Florida's boas are thought to be *B. c. constrictor*: its reddish-towards-the-tail describes that taxon)".
12. §3.1 "Boback et al. 2012 constricted warm rat cadavers with a simulated heart (boas wild-caught in Belize)" → "… with a simulated heart; snakes naïve to live prey responded too (abstract; the snakes' origin could not be checked)".
13. §3.1, after "the first published record of that interaction" add "(boa 57 cm total; rat SVL 140 mm, identified from photographs and a female trapped later at the same house)".
14. §3.1 "lists murids such as the house mouse among the prey (Henderson 2023)" → "lists one murid, the house mouse (Argentina), among cricetids; *B. imperator* records are excluded from that review (Henderson 2023)".
15. §3.1 "Why not a native cotton rat (*Sigmodon*)? I found no published record …" → add first: "The documented native option is the big-eared climbing rat *Ototylomys phyllotis*, listed as *B. imperator* prey in Aguilar-López & Tapia-Ramírez 2025, Table 1 (citing Bakkegard & Timm 2001; Leenders & Watkins-Colwell 2003), with 55 Costa Rican GBIF records."
16. §3.2 "(data of Kryštufek & Vohralík)" → "(data of Kryštufek & Vohralík, rats from Turkey and Cyprus)". Design row "ear 2.3 × 2.0 cm" → "ear 2.4 cm long × 2.1 cm wide (as built in §5.3)". Add: "21 cm and 250 g are a large adult; a 188 g mean rat is ≈ 4.6 cm across".
17. §3.3 whiskers "draw 12 a side in 4 rows × 3 columns" → "draw 15 a side in **5 rows (A–E)** × 3 columns, longest towards the back" (Towal et al. 2011).
18. §3.3 ears and feet "`#c99a8c` (observed `#93776b`–`#bdaba2`)" → "**`#b39689`** (HSL 19° / 0.22 / 0.62; observed `#93776b`–`#bdaba2`)". In `props.js`, `RAT.pink '#c99a8c'` → `'#b39689'`; skin swatch "Pink ears and feet" → "Pinkish ears and feet".
19. §4 `animation.beats[1]` proposed EN "They tighten, pressing on the rat’s heart and blood vessels." → "They tighten, pressing on the rat’s chest and blood vessels." ES "Se aprietan y presionan el corazón y los vasos sanguíneos de la rata." → "Se aprietan y presionan el pecho y los vasos sanguíneos de la rata."
20. §4 poses beat 0 EN "Two loops wrap the rat’s chest and belly; the jaws hold on." → keep **only** with criterion 15 below; otherwise "Two loops wrap the rat’s chest and belly." / ES "Dos anillos rodean el pecho y el vientre de la rata."
21. §4 poses beat 1 ES "Los anillos se aprietan y cortan el flujo de sangre, no la respiración." → "Los anillos se aprietan y detienen el flujo de sangre: no matan por asfixia."
22. §4 "Unchanged and still correct: … and the `eye-stripe` label text." → if the rust preocular ships: label detail (`index.js` l. 371) "A dark stripe runs from the snout through the eye to the angle of the jaw." → "A stripe runs from the nostril through the eye to the angle of the jaw: rust-brown in front of the eye, black behind it." Look-closer (`serpientes.js`) "A dark stripe runs from the snout back through each eye." → "A stripe runs from the snout back through each eye: rust-brown in front, black behind." ES: "Una franja va de la narina al ángulo de la mandíbula pasando por el ojo: rojiza delante del ojo y negra detrás." / "Una franja va del hocico hacia atrás por cada ojo: rojiza delante y negra detrás." If the faces task keeps the preocular dark, leave both texts as they are.
23. §4 and §5.6 swatch "Rust snout patch" / "Mancha rojiza del hocico" → "Rust preocular stripe" / "Franja preocular rojiza". "Red-brown tail saddles" / "Manchas rojizas de la cola" → "Blackish-brown tail saddles" / "Manchas café negruzco de la cola". "Tan hind body" / "Parte posterior canela" → "Grey-brown hind body" / "Parte posterior pardo grisácea".
24. §5.1 colours `groundAlt #a8916f` → `#8c7f72`; `saddleRed #4a2219` → `#33261f`; add `crownStripe #4a3426` (the faces painter's median stripe); keep `stripe #211915`. In `PATTERNS.boa`, mix in the rust scales **after** the `saddleRed` mix; today `red = 1` overwrites them on the hind body and tail.
25. §5.2 "two `mx_noise_float` and one `mx_cell_noise_float` lookups per fragment" → "four `mx_noise_float` lookups per fragment, plus the per-scale hash `bodySkin` already computes".
26. §5.6 boa body swatches → `[Grey-beige ground #b3afa4, Blackish saddle rims #1f1814, Dark-brown saddles #45342a, Grey-brown hind body #8c7f72, Cream borders, lobes and belly #d9cfb8]` (all ≥ 0.10 apart in OKLab; the closest pair is ground and cream). Tail → `[Blackish-brown tail saddles #33261f, Cream gaps #d9cfb8]`. Head and jaw: the faces task's list plus `Rust preocular stripe` and `Cream lips` (≤ 8).
27. §5.8 "raise `reflect` on the fur material rather than its albedo" → "lighten the face in the fur colour node, or lower the fur's `hatch` (`reflect` is already 1)".
28. §5.9 criterion 2, append "tail-saddle clusters: OKLab chroma ≤ 0.035 (HSL saturation ≤ 0.30)". Criterion 3 "hind-body ground `R − B ≥ 25` (grey → tan)" → "hind-body ground at least 0.1 darker (L) than the fore-body ground; no tan". Criterion 10, append "hind limbs and rump vs the last loop; boa jaws vs the rat's head and ears".
29. §5.9, new criterion 15: "The boa's jaws close on the rat's nape or shoulder for the whole loop (Boback 2015: rats offered head first, the bite held until release); any gape is a short re-bite that never leaves the jaws in the air."
30. §7 UC IPM reference "Quinn, N. (2024)" → "Quinn, N. (2025; revised June 2024)", the PDF's own suggested citation.

### R6. Missing items

1. **Posterior darkening**, the best-documented Costa Rican trend (B-2): the plan needs it; it currently encodes the opposite.
2. **A real bite** (R-16, criterion 15). Without it the proposed text says something the figure does not show.
3. **One owner for the boa head** (R4.1). The two scratch specs disagree on the preocular (rust here, dark in the faces task) and on the swatch names, and both patch the same function.
4. **i18n mapping** of every new string (R3): file, key, and removal of stale keys.
5. **The native-rodent alternative** (R-3) in §3.1, so the content team can choose with the facts in hand.
6. **The k-means helper** saved next to the spec (e.g. `.scratch/bilingual/boa/kmeans.py`) so criteria 2–3 can be reproduced.
7. **SVG check after the limbs move into the fur part** (R4.4): no part titled "Body" on the rat.

### R7. Sources opened for this review

All are in §7 except the two marked **new**.
- Duque-Torres et al. 2024: https://www.reptilesofecuador.com/boa_imperator.html
- Villa & Rivas 1971: https://tropicalstudies.org/rbt/attachments/volumes/vol19-1/12-Villa-Serpientes.pdf (pp. 159–160)
- Lindemann 2009 (ADW): https://animaldiversity.org/accounts/Boa_constrictor/
- Florida Museum, *Boa constrictor*: https://www.floridamuseum.ufl.edu/florida-snake-id/snake/boa-constrictor/
- Solórzano & Sasa 2024: https://herpetologia.fciencias.unam.mx/index.php/revista/article/view/907 (PDF galley 565; Figs 1–2 rendered)
- ICP gallery: https://icp.ucr.ac.cr/index.php/en/resources/imagenes/snakes-01 (three Solórzano photos)
- serpientesdecostarica.com: https://serpientesdecostarica.com/en/serpiente-becquer/
- Aguilar-López & Tapia-Ramírez 2025: https://herpetologia.fciencias.unam.mx/index.php/revista/article/view/1460 (PDF galley 879; Table 1)
- Hadjisterkotis et al. 2020, Table 3 via the Europe PMC REST API: https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7460190/fullTextXML
- UC IPM Pest Notes: Rats (Publication 74106, revised June 2024): https://ipm.ucanr.edu/pdf/pestnotes/pnrats.pdf
- Gillespie 2004 (ADW): https://animaldiversity.org/accounts/Rattus_rattus/ · Myers 2001 (ADW): https://animaldiversity.org/accounts/Muridae/
- Towal et al. 2011: https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1001120
- Boback et al. 2012 abstract (Europe PMC, PMC3367750) · Boback et al. 2015 full text: https://journals.biologists.com/jeb/article/218/14/2279/14389/Snake-constriction-rapidly-induces-circulatory
- Henderson 2023: https://www.herpconbio.org/Volume_18/Issue_3/Henderson_2023.pdf
- GBIF occurrence API (taxon keys 2439270, 2439261, 2439155 *Ototylomys phyllotis*; country CR) · iNaturalist API (taxa 44575 and 44576, place 6924; the 13 B/R observations re-checked: species, research grade, licences)
- **new**: IUCN SSC ISSG, Global Invasive Species Database, *Boa constrictor imperator* (2010): https://www.iucngisd.org/gisd/species.php?sc=1439 (about 30 saddles on a lighter ground; dark tail markings in some individuals)
- **new**: Madrid Salud (Ayuntamiento de Madrid), *Rata de árbol o rata negra (Rattus rattus)*, updated June 2026: https://www.madrid.es/UnidadesDescentralizadas/Salud/SaludPublica/EspInformativos/ControlDePlagas/Fichas%20tecnicas/Rata%20negra/ficheros/RATA_NEGRA_Rattus_rattus_2026.pdf (pointed snout; long ears that reach the eye; prominent eyes; tail longer than the body)
- Not reachable: Boback 2012 Methods (PMC captcha, publisher 403); Reed & Rodda 2009 (15 MB, above the fetch limit).
