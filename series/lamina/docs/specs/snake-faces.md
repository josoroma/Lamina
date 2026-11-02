> Archived from `.scratch/bilingual/research-snake-faces.md` (2026-11-01), the research output of [`docs/prompts/06a-research-workflow.js`](../prompts/06a-research-workflow.js), with its adversarial review appended at the end. Images and probe scripts it mentions stayed in the git-ignored scratch folder.

# Snake faces: diagnosis, sourced research, spec and implementation plan

Task `research:snake-faces` · Lámina · 2026-11-01. Research only: nothing under `src/`, `scripts/` or `public/` was edited.
Images are in `/Users/josoroma/sites/books/.scratch/bilingual/faces/` (written below as `faces/…`).

**User's complaint (verbatim):** "snake heads/face must be more real, they are like faceless, with no eyes or details right now, improve that."

## 0. Summary

The code already builds eyes with pupils, supraocular "brows", loreal pits, nostrils, eyelash scales, fangs and a tongue. At the reader's scale none of that reads, for five reasons, listed by impact:

1. **The label anchor dots cover the face.** A dot is an 8.5 px disc: radius 2.75 px plus a 1.5 px white stroke. Every leader also has a 3.25 px white halo. At book zoom the eye is 2–10 px across, so on 7 of 8 heads the dots sit on the eye and the pit. On the coral and the sea snake, three dots cover most of a 16–19 px head (`faces/montage-book-zoom.png`).
2. **The eye has no contrast and no cues.**
   - The iris is almost the skin colour: OKLab ΔE is 1.2–6.5 for the oropel, matabuey and béquer, and 2.7 for the coral (black on black).
   - The slit pupil is 0.2 of the eye radius wide, which is under 1 px at book zoom.
   - The eye has no catchlight, and its rim (outline width 0.55) is about 0.66 px.
   - The eye is hatched like skin.
3. **The eye sits too low and too deep.** Its centre is at 50% of the crown height and 42% of its radius is sunk into a tall, domed "loaf" crown. Real vipers and boas carry the eye at the top corner of the head, under a supraocular ledge (photos P2, P4, P5). Seen from the 45° book camera, a low eye is foreshortened and hidden by the jowl.
4. **The head has no scalation and no structure.** The body has a scale lattice with relief, but the head is smooth flat colour. It has no labial scales, no head shields (coral, sea snake, rattlesnake plates), no crown granules, no canthal ridge, and the supraocular is a floating lump.
5. **Several markings are wrong or illegible.**
   - The béquer's lateral stripe floods the top of the snout, because the painter uses (x, y) and ignores z.
   - The terciopelo's postocular stripe reads as a lip seam, because the eye is low.
   - Pits and nostrils are identical black specks.
   - In the SVG plate the eye is one flat olive patch with no pupil (`faces/svg-terciopelo-head-crop.png`).

The spec in §3 fixes this without inventing anatomy. It uses sourced proportions where they exist and photo measurements (labelled as such) where they do not. It allows **pixel floors** (pupil, stripe and suture widths, catchlight) that only act below about 2 px, so close-ups stay true to scale. Geometric exaggeration is small and stated per species. Head labels get **rings or ticks** in place of filled dots, so a marker never hides its feature. The implementation plan in §4 maps every change to a file and function, gives the TSL (WGSL and GLSL safe), the outline rules, the SVG swatches, the layers and the verification commands.

---

## 1. Diagnosis

### 1.1 Method

- **Build.** The preview server `http://127.0.0.1:4173` serves `dist/`, built at 17:03. The face code is unchanged since before that build: `head.js` 15:58, `patterns.js` 16:11, `species.js` 14:32. `index.js` and `props.js` changed later, but not in face code. The preview therefore matches the source for faces.
- **Reader, book zoom.** 1600×1000 @2x, `index.html#/serpientes?plate=N&t=0.5` (cascabel t=0.3), and `#/calaveras?plate=6&t=1.0`. Captured with labels on and off.
- **Phone.** 390×844 @3x.
- **Inspect.** `lamina.inspect(true)` plus 2.5 s, on desktop and phone.
- **Lab close-ups.** 900×640 @2x. The camera is placed on the head in four directions in head-local axes: side, front, three-quarter and top. The framing snippet is in §4.9. For Calaveras the skull layer is off and t=1.3.
- **WebGL spot check.** Terciopelo and béquer, side and three-quarter, on `webgl2`: identical to WebGPU, no console errors (`faces/lab-*-webgl*.png`).
- **SVG.** `scripts/export-svg.mjs`, terciopelo, colour mode, book view (`faces/svg-terciopelo-color.svg`; head region rasterised in `faces/svg-terciopelo-head-crop.png`).
- **Measurements.** Projected head length (back of the `head-skin` mesh to the snout tip, along the head axis). Eye radius in px (sphere radius projected on the camera's right axis). Label dots inside the head's screen box. Raw data is in `faces/measure-*.json`.

### 1.2 Numbers

Eye Ø is the full sphere diameter projected. The visible spectacle is about 0.9× that, because 42% of the radius is embedded. Head length is Lh.

| plate | Lh (cm) | book 1600: head px / eye Ø px / dots on head | phone 390: head / eye | inspect desktop: head / eye | inspect phone: head |
|---|---|---|---|---|---|
| I terciopelo *B. asper* | 6.30 | 62 / 9.5 / 2 (eye, pit) | 33 / 4.9 | 165 / 25.6 | 44 |
| II oropel *B. nigroadspersus* | 3.12 | 29 / 7.3 / 4 (eye, pit, eyelash, tongue) | 18 / 3.8 | 55 / 14.8 | – |
| III coral *M. nigrocinctus* | 1.89 | 19 / 2.9 / 3 | 10 / 1.5 | 34 / 7.1 | 13 |
| IV cascabel *C. simus* | 5.60 | 65 / 10.1 / 3 | 35 / 5.1 | 86 / 18.1 | – |
| V matabuey *L. stenophrys* | 7.20 | 67 / 9.8 / 3 | 36 / 5.0 | 105 / 21.0 | – |
| VI marina *H. platurus* | 2.63 | 16 / 2.1 / 3 | 8.5 / 1.1 | 47 / 6.3 | 11 |
| VII béquer *B. imperator* | 7.20 | 51 / 6.1 / 3 | 26 / 3.2 | 114 / 14.4 | – |
| Calaveras VI viper | 2.50 | 39 / 10.8 / 0 (no snake-head label drawn at this frame) | 26 / 5.5 | 61 / 14.4 | – |

On a phone, inspect magnifies only 1.3–1.4×, because it frames the whole loop hull. A face can therefore never be read on a phone today.

Current head geometry in Lh units, computed from `head.js` and `species.js`:

| species | head width | crown height | neck width | eye sphere Ø | eye centre from back (`eye.at`) | eye centre height |
|---|---|---|---|---|---|---|
| asper | 0.75 | 0.34 | 0.34 | 0.148 | 0.66 | 0.150 (0.50 of crown) |
| schlegelii (oropel) | 0.83 | 0.36 | 0.27 | 0.184 | 0.64 | 0.168 (0.52) |
| micrurus | 0.60 | 0.38 | 0.56 | 0.150 | 0.68 | 0.190 (0.56) |
| crotalus | 0.81 | 0.33 | 0.42 | 0.140 | 0.65 | 0.147 (0.50) |
| lachesis | 0.70 | 0.36 | 0.37 | 0.128 | 0.66 | 0.158 (0.50) |
| hydrophis | 0.46 | 0.34 | 0.45 | 0.132 | 0.66 | 0.170 (0.60) |
| boa | 0.56 | 0.33 | 0.49 | 0.120 | 0.62 | 0.162 (0.56) |

Iris against skin in OKLab, ×100 (computed from the hex values in `species.js`):

| pair | ΔE |
|---|---|
| oropel iris `#d9c552` vs head `#e2aa1c` | 6.5 |
| coral iris `#1b1917` vs black `#151311` | 2.7 |
| matabuey iris `#b58f62` vs crown `#b88e69` | 1.2 |
| béquer iris `#ab9d80` vs crown `#a99778` | 1.7 |
| sea snake iris `#2b2a26` vs crown `#141412` | 9.4 |
| terciopelo iris vs ground | 16.1 |
| cascabel iris vs ground | 11.8 |

### 1.3 What the images show

- `faces/montage-book-zoom.png` (labels on) and `faces/montage-book-zoom-nolabels.png`: crops of every head at book zoom. With labels on, the dots sit on the eyes, and on plates III and VI they cover the face. With labels off:
  - the terciopelo eye is a small yellowish smudge on a brown pebble;
  - the coral shows no eye at all;
  - the sea snake shows no eye;
  - the béquer eye is a grey disc on the stripe;
  - the oropel's yellow-green eyes vanish against the yellow head.
- `faces/montage-phone.png`: on phones the dots are as large as the whole coral or sea snake head.
- `faces/lab-terciopelo-side.png`, `-tq.png`, `-top.png`, `-front.png`:
  - the head is a tall rounded "loaf" with a horizontal dark band; the eye sits low, just above the lip band;
  - the pit and nostril are two equal black dots;
  - the brow is a separate grey crescent floating above the eye;
  - there are no labial scales and no crown scales;
  - from the top the head is a smooth spade with the eyes barely visible.
- `faces/lab-oropel-tq.png`, `faces/lab-calviper-tq.png`:
  - three round cones on a floating brow lump read as a tiara;
  - the yellow-green iris matches the head.
- `faces/lab-coral-side.png`, `-top.png`: a black-and-yellow capsule. The eyes are black glossy beads on black, readable only by a pinpoint highlight in close-up. The head is wider than the neck at a hard step, and has no head shields.
- `faces/lab-marina-side.png`, `-top.png`: black crown and yellow lips (correct), but the eye is black on black and the dorsal nostrils are brown blobs.
- `faces/lab-bequer-top.png`: the lateral eye stripes merge into a dark "U" over the snout. The stripe passes above the eye, not through it (compare photo P7).
- `faces/svg-terciopelo-head-crop.png`: in the exported colour plate the eye is a flat olive patch under a lid. The eye region is below `MIN_PATTERN_PX = 500` in `src/engine/export/raster.js`, so it prints flat, and the painted pupil is lost.

### 1.4 Causes, one by one

1. **Label marks** (`src/engine/ui/labels.js` `LabelNode`; `src/engine/ui/ui.css` `.lam-leader-dot`, `.lam-leader-halo`). The dot is drawn at the anchor itself, and the anchor is the eye, pit or nostril centre. For example, the `eye` anchor is placed by `anchor('eye', eyes, eu*Lh, ey, ez + er*0.2)` in `head.js`. The 3.25 px white halo under each leader erases a band wherever a leader crosses the head.
2. **Eye material** (`head.js` eyes block; `patterns.js` `eyeColorNode`):
   - the iris is close to the skin;
   - the slit half-width is `0.11·0.92` of the radius, so the whole slit is about 0.2 r: 0.95 px at r = 4.75 px;
   - the limbal ring sits at r 0.62–0.86, which on a 42%-embedded sphere is partly hidden;
   - `hatch: 0.25` puts shadow lines on the eye;
   - the catchlight is only physical: roughness 0.12 with the key light at (−1.6, 3.4, 1.4). None is visible in any book-zoom capture; it appears only in some lab close-ups;
   - `ctx.outline(e, { width: 0.55 })` gives a sub-pixel rim.
3. **Eye position** (`head.js`): `ey = spec.eye.height * crownY(d, eu)` with `eye.height` 0.5 for vipers, and `e.position.z = ez − er·0.42`. Combined with a crown height of 0.33–0.36 Lh, the eye sits mid-flank.
4. **Head shape** (`head.js` `SHAPES`, `headGeometry`):
   - the superellipse exponent `pCrown` 3.3–3.4 is uniform along the head, so there is no sharper canthus ahead of the eye;
   - `brows` is a separate squashed sphere (`b.scale.set(er*1.45, er*0.3, er*1.15)`), not a ledge of the head;
   - the crown is about 20–25% too high for *B. asper*. In photo P2 the canthal edge is at about 0.23 Lh above the mouth line at the eye; the model has 0.30 Lh.
5. **Painting** (`patterns.js` `headColorNode`):
   - patterns are functions of (hx, hy) only, so lateral marks wrap over the crown wherever the crown height drops (the béquer's snout);
   - there is no scale lattice, no labials and no plates;
   - the B. asper face below the canthus is olive "ground", while photos show a yellow face and lips (P1–P3; Folleco-Fernández 2010 via the Reptile Database: "la zona inferior de la boca suele ser de color amarillo").
6. **Pits and nostrils** (`head.js`): dark ellipsoids with no rim and nearly the same size. The pit is 0.084 × 0.06 Lh, about 2.3× real (photo P2: pit opening ≈ 0.036 Lh), but it is undifferentiated.
7. **Hatching:** the head uses the default figure-space cross-contours (no `hatchCoord`). On a head seen side-on that makes stacked horizontal lines on the flank and jaw (`faces/lab-terciopelo-side.png`).
8. **SVG:** the eye prints as one flat swatch. The pit and nostril export as flat dark parts (`part-loreal-pits`, `part-nostrils` exist in the SVG).
9. **Eyelash scales:** three round cones of 0.09–0.135 Lh, fanned outward at about 40° (`dir = (−0.15 − 0.18 i, 0.78, ±0.62)`). The species has **two** raised spine-like superciliaries (Arteaga et al. 2024).
10. **Inspect on phones:** it frames the whole loop, so a head stays at 11–44 px (§1.2).

---

## 2. Research: what a real face shows

### 2.1 Facts common to all seven

- **No eyelids.** A transparent scale covers the eye: "el ojo está protegido por una escama ocular transparente" (Sasa, Bonilla & Chaves 2019 [S1] p. 10). That glossy spectacle is why photographs always show a catchlight (every photo in §2.3).
- **Four openings on a pit viper's face**: 2 nostrils and 2 loreal pits [S1 Cuadro 2, p. 42]. The pit lies in the loreal region between eye and nostril [S1 p. 14]. It is a cavity about 1–5 mm deep with a narrow opening [S1 p. 14].
- **Pupils and head scales.** ICP lists a triangular head, small head scales and a vertical pupil as traits often used for vipers, and warns that they are not diagnostic: the non-venomous boa also has a vertical pupil [S1 p. 42]. In some groups, especially colubrids, the head scales are large and are called *escudos* (shields) [S1 p. 11]. Elapids have "a head covered with large shields" and "eyes with rounded pupils" ([S13], Wikipedia *Elapidae*, uncited sentences). In *Crotalus*, "the head is mostly covered with a large number of smaller scales" ([S12], Wikipedia *Sistrurus*, uncited).
- **Venom glands** lie behind and below the eyes, and their compressor muscle helps give vipers their triangular head [S1 pp. 42–43]. That bulge is the "jowl" the head outline needs.
- **Relative eye size**, as measured eye diameter (visible spectacle) over head width on museum specimens (Huang et al. 2022 [S6], Table 1):

  | species | habit | ED / head width |
  |---|---|---|
  | *Trimeresurus stejnegeri* | arboreal pit viper | 0.20 |
  | *Protobothrops mucrosquamatus* | terrestrial pit viper | 0.19 |
  | *Deinagkistrodon acutus* | pit viper | 0.14 |
  | *Naja atra* | elapid | 0.18 |
  | *Bungarus multicinctus* | elapid | 0.15 |
  | *Hydrophis melanocephalus* | sea snake | 0.16 |

  Converted with the head widths of §2.2, this predicts an eye diameter of roughly 0.12–0.17 Lh for the vipers and about 0.07–0.09 Lh for the coral and the sea snake (head width 0.46–0.60 Lh). These are indirect estimates for related species.

### 2.2 Per species

Each entry marks its kind of evidence: **[text]** is a written source, **[photo]** is my measurement on a CC photo (§2.3; one individual, an oblique view, ±15%), and **[unverified]** means no source was found.

#### I. Terciopelo, *Bothrops asper*

- **Head.** "Large and distinct from the neck"; "a dark stripe from the postocular region to the angle of the mouth"; eye "medium" with an "elliptical" pupil [text, S4: Reptile Database diagnosis after Folleco-Fernández 2010]. "Broad, flattened heads"; head "light to dark brown or even black"; a "postorbital stripe" [text, S8: Wikipedia citing Campbell & Lamar 2004].
- **Scalation** [text, S4]:
  - 7–8 supralabials and 8–12 infralabials;
  - 1 loreal, 3 preoculars, 2–4 postoculars;
  - the loreal pit is the same distance from eye and nostril, and touches the 2nd supralabial;
  - rostral hexagonal; geneials 2+2;
  - "la zona inferior de la boca suele ser de color amarillo";
  - the local name *barba amarilla* (yellow chin) is used by ICP [S1 Fig. 30, p. 57].
- **Proportions** [photo P2, a lateral portrait, with P1 and P3 as checks]:
  - eye diameter ≈ 0.12 Lh;
  - eye centre ≈ 0.39 Lh from the snout tip, i.e. 0.61 from the back;
  - eye centre ≈ 0.16–0.17 Lh above the mouth line, with the eye's top touching the canthal/supraocular edge at ≈ 0.22–0.23 Lh;
  - pit centre 0.145 Lh ahead of and 0.085 Lh below the eye centre; opening ≈ 0.036 Lh (≈ 0.3 of the eye diameter);
  - nostril 0.31 Lh ahead of and 0.07 Lh below the eye centre; ≈ 0.024 Lh;
  - postocular stripe ≈ 0.057 Lh wide (≈ 0.45 of the eye diameter), running back and down to the angle of the jaw.
- **Colour** [photo P1–P3]:
  - crown dark brown, separated from a yellow-ochre face by a sharp canthal ridge with a thin pale edge;
  - supraocular a brown plate overhanging the eye;
  - small scales between eye and labials;
  - large yellow supralabials, cream-yellow infralabials and chin;
  - iris olive-bronze to coppery with fine dark reticulation (samples `#706535`, `#767659`; P1 coppery);
  - pupil a narrow black slit; strong catchlight;
  - crown and face samples on P2: crown `#4a3409`, face `#a77c18`–`#ab9824`, labials `#b99533`. These are warm, processed photos, so the hex values in §3 are toned to the plate palette.
- **Tongue.** P3 shows a dark reddish-brown tongue [photo].

#### II. Bocaracá (oropel morph), *Bothriechis nigroadspersus*; also the Calaveras lesson VI viper

- **Diagnosis** [text, S3: Arteaga et al. 2024 via Plazi]:
  - "two raised and spinelike supraciliary scales";
  - "anterior dorsal head scales keeled";
  - "2–6 canthals which may be nearly flat or with raised triangular projections";
  - "7–24 interoculolabials";
  - "loreal not in contact with preocular";
  - "yellow morph present and common in some areas";
  - "black speckles on dorsal scales usually absent";
  - "iris pale straw yellow to golden with black reticulations or spots".
- **Holotype** [text, S3]:
  - head length 34.4 mm (6.5% of SVL);
  - head width 28.5 mm, **82.9% of head length** (the model has 0.83 ✓);
  - superciliaries 2/2, "moderately triangular but low";
  - supraoculars kidney-shaped, about 2.2× longer than wide;
  - intersupraoculars 5; canthals 3/3; prefoveals 4; subfoveals 3/3;
  - preoculars 1; subocular 1; postoculars 2;
  - 9 supralabials, including the lacunolabial; 12 infralabials;
  - nasal fused with the 1st supralabial;
  - loreal about half the size of the pit.
- **ICP** [text, S1 p. 44]: projections of the supraciliary scale above the eye "que recuerda la tenencia de pestañas". Oropels have "coloración amarillo sólido".
- **Proportions** [photo P4, near-lateral; the head's posterior end is hidden by the coil]:
  - eye diameter ≈ 0.157 Lh;
  - eye centre ≈ 0.51 Lh from the back. The eye is mid-head in this broad-jowled species, versus 0.64 in the model;
  - eye centre ≈ 0.24 Lh above the mouth line (≈ 0.74 of the head height there); its top reaches the crown;
  - pit opening ≈ 0.078 × 0.057 Lh (large, about half the eye diameter), 0.15 Lh ahead of and 0.08 Lh below the eye centre;
  - two superciliary spines above the eye's posterior third and middle, ≈ 0.078 Lh (rear) and 0.064 Lh (front) tall, pointing up and slightly back. Raised canthal points near the snout.
- **Colour** [photo P4]:
  - head uniform golden yellow (samples `#c3a42c` lit, `#a1680f` shaded);
  - iris pale silvery straw with dark speckles (`#bea989`, `#9d7e6d`);
  - pupil a narrow black slit;
  - pit lining dark reddish (`#6c1e06`);
  - a few tiny dark and reddish flecks on head and body;
  - a second photo (`Eyelash viper (Bothriechis nigroadspersus) (9637022983)`) shows the same pale speckled iris on an orange-yellow head.

#### III. Coral, *Micrurus nigrocinctus*

- **Head** [text]: "cabeza ovalada, ojos relativamente pequeños" [S1 p. 34]; "medium sized head, not very differentiated from the body" [S2, ICP web]; "rounded head", "the pupil of the eye is round", "the snout is black", "on the head there is usually a yellow parietal band (in three-colored specimens)" [S14, Wikipedia, uncited].
- **Head cap patterns** distinguish the Costa Rican corals; the tricolour *M. nigrocinctus* has three populations, one of them in the Atlantic lowlands [S18: Savage & Vial 1973, abstract only. The full PDF is over 10 MB and could not be read here.]
- **Layout** [photo P6, *M. mosquitensis*, a Caribbean Costa Rican coral in the *nigrocinctus* group]:
  - glossy black snout cap from the snout tip to about one eye diameter behind the eye, with the eye inside the cap;
  - then a broad yellow band across the parietal region, about half the head length, which also covers the posterior supralabials;
  - then the black nuchal ring;
  - large glossy head shields with visible sutures and highlights;
  - the eye is a black bead, readable only by its highlight.
- **Shield counts:** not verified for *M. nigrocinctus* [unverified]. §3 uses the standard elapid nine-shield crown schematically.

#### IV. Cascabel, *Crotalus simus*

- **Neighbouring evidence.** *C. simus* was long treated as part of *C. durissus*; Reyes-Velasco et al. 2022 considered it a synonym (as logged in `docs/books/serpientes-research.md`). On *C. durissus* [text, S11: Wikipedia, citing Campbell & Lamar 2004; sentences uncited]: "two distinct stripes starting at the base of the head", "the head has a dark brown bar at the top, with a dark post-orbital band". *Crotalus* heads are mostly small scales [S12].
- **Head structure** [photo P9, *C. d. durissus*, a congeneric macro]:
  - large pale-edged plates on the snout (internasals, canthals) and over each eye (supraoculars);
  - small scales between them;
  - a bronze-brown iris with dark speckles (my reading);
  - a vertical pupil;
  - a large dark pit in front of and below the eye, rimmed by pale scales;
  - a slit nostril in the large nasal;
  - big cream supralabials;
  - a dark postocular band with pale scales below.
- **Not verified:** the "dark brown bar at the top" (interorbital bar?) is ambiguous. Do not paint it until checked [unverified].

#### V. Matabuey, *Lachesis stenophrys*

- **Genus** *Lachesis* [text, S9: Wikipedia *L. muta*, citing U.S. Navy 1991]:
  - "head broad and distinct from the narrow neck"; "snout broadly rounded"; "there is no canthus";
  - "a pair of small internasals … separated by small scales"; "supraoculars narrow";
  - "crown covered with very small scales";
  - "second supralabial forms the anterior border of the loreal pit, while the third is very large";
  - "eye separated from the supralabials by 4–5 rows of small scales".
- **Species** [text, S10]: "a broadly rounded head and a snout that is not elevated". The name *stenophrys* means "narrow brow".
- **Lateral head** [photo P5]:
  - black-brown postocular stripe from the eye to the jaw angle, about two scale rows tall, with a thin pale line above;
  - pale cream-pink labials;
  - tan crown of granular scales; narrow supraocular ridge;
  - pit about 0.5 of the eye diameter, just below the level of the eye's lower edge;
  - eye centre ≈ 0.59 of the head height above the mouth line. The eye is opaque in this photo (pre-shed?), so the iris colour is **not** taken from it [unverified].

#### VI. Serpiente marina, *Hydrophis platurus*

- **Head** [text, S5: Reptile Database after Leviton et al. 2003; S15: Wikipedia citing Smith 1943]:
  - "head narrow, snout elongate"; "head shields entire";
  - "nasal shields in contact with one another"; "nostrils superior";
  - "prefrontal in contact with second upper labial";
  - "1–2 pre- and 2–3 postoculars"; "2–3 small anterior temporals";
  - "7–8 upper labials, 4–5 below eye but separated from border by subocular";
  - "black above, yellow or brown below", "sharply demarcated" [S15].
- **Valved nostrils** are in [S15], citing references 8–11. A Taiwan National Park article (Tu 2012 [S17]) captions *Pelamis* nostrils as lateral and valveless. That conflicts with Smith/Leviton's "nostrils superior", and the conflict should go to the content owner [conflict noted].
- **Photo P10:** black covers the top half of the head; yellow covers the lips; the eye is in the black.

#### VII. Béquer, *Boa imperator*

- **Head** [text, S7: Duque-Torres et al. 2024, *Reptiles of Ecuador*]: "three dark stripes from the snout to the nape, a dorsal one extending to the neck"; "small scales on the snout"; "vertically elliptical pupil"; "no heat-sensitive pits on the lips".
- **Stripes** [text, S16: Wikipedia citing Mattison 2007]: one runs "dorsally from the snout to the back of the head"; "the others run from the snout to the eyes and then from the eyes to the jaw".
- **Lateral head** [photo P7]:
  - the dark postocular stripe is about as tall as the eye diameter;
  - it **continues through the iris**: the iris is pale above and dark where the stripe crosses it;
  - a narrow dark subocular bar runs from the eye's lower edge to the lip;
  - dark blotches mark the posterior supralabials;
  - pale pinkish-tan ground (`#cfa08b`, `#d1ac96`);
  - dark grey-black tongue.
- **Top view** [photo P8]:
  - the mid-dorsal stripe is narrow on the snout and widens behind the eyes, with a pale central streak at the nape;
  - the lateral stripes run along the snout's sides to the eyes;
  - head width ≈ 0.55 Lh (the model has 0.56 ✓); the neck behind is about 0.9 of the head width.
- **Body colour** is the subject of a sibling task (`.scratch/bilingual/boa/`). Head ground and stripe colours below are therefore given **relative to the body palette**.

### 2.3 Photographs used (all Wikimedia Commons; licences verified through the Commons API)

| id | file | author, place, year | licence | crop in faces/ |
|---|---|---|---|---|
| P1 | [Bothrops_asper_head.jpg](https://commons.wikimedia.org/wiki/File:Bothrops_asper_head.jpg) | Dogymho / T. Quinlan, Finca Granadilla Silvestre, Costa Rica, 2011 | CC BY 2.0 | `ref-asper-quinlan-eye.png` |
| P2 | [27833-_Terciopelo_portrait.jpg](https://commons.wikimedia.org/wiki/File:27833-_Terciopelo_portrait.jpg) | Panegyrics of Granovetter, PN Volcán Tenorio, Costa Rica, 2021 | CC BY-SA 2.0 | `ref-asper-27833-head.png` |
| P3 | [Bothrops_asper_(Panama)_head.jpg](https://commons.wikimedia.org/wiki/File:Bothrops_asper_(Panama)_head.jpg) | Brian Gratwicke, Panama, 2011 | CC BY 2.0 | `ref-asper-gratwicke-head.png` |
| P4 | [Bothriechis_nigroadspersus_(La_Selva_Biological_Station).jpg](https://commons.wikimedia.org/wiki/File:Bothriechis_nigroadspersus_(La_Selva_Biological_Station).jpg) | Geoff Gallice, La Selva, Costa Rica, 2011 | CC BY 2.0 | `ref-bothriechis-gallice-head.png` |
| P5 | [Lachesis_stenophrys_63671518.jpg](https://commons.wikimedia.org/wiki/File:Lachesis_stenophrys_63671518.jpg) | Eridan Xharahi, 2020 | CC BY 4.0 | `ref-lachesis-xharahi-head.png` |
| P6 | [Micrurus_mosquitensis_150548652.jpg](https://commons.wikimedia.org/wiki/File:Micrurus_mosquitensis_150548652.jpg) | Court Harding, 2021 | CC BY 4.0 | `ref-micrurus-harding-head.png` |
| P7 | [Boa_constrictor_imperator.jpg](https://commons.wikimedia.org/wiki/File:Boa_constrictor_imperator.jpg) | Esteban Alzate | CC BY-SA 2.5 | `ref-boa-alzate-head.png` |
| P8 | [Boa-Constrictor-Imperator-Belize-Zoo.jpg](https://commons.wikimedia.org/wiki/File:Boa-Constrictor-Imperator-Belize-Zoo.jpg) | Bjørn Christian Tørrissen, Belize Zoo, 2010 | CC BY-SA 3.0 | `ref-boa-torrissen-top.png` |
| P9 | [Crotalus_durissus_durissus_Schauerklapperschlange.jpg](https://commons.wikimedia.org/wiki/File:Crotalus_durissus_durissus_Schauerklapperschlange.jpg) | Holger Krisp, 2012 (congeneric) | CC BY 3.0 | `ref-crotalus-durissus-krisp-head.png` |
| P10 | [Hydrophis_platurus_32924548.jpg](https://commons.wikimedia.org/wiki/File:Hydrophis_platurus_32924548.jpg) | Luis Correa, 2018 | CC BY 4.0 | – (low resolution, pattern only) |

The crops in `faces/ref-*.png` carry a red/blue measuring grid (25 or 50 px). They are working copies for this review only; do not ship them.

---

## 3. Spec

### 3.0 Conventions and principles

**Head-local frame** (as in `head.js`): x runs from 0 at the back of the head to Lh at the snout tip; y is up from the mouth line; z points to the animal's right. Numbers are in Lh unless marked. r is the eye sphere radius (`eye.size·Lh`). "Visible Ø" is the visible spectacle diameter, 2r·√(1 − embed²).

**How far legibility may stretch the anatomy:**

1. **Pixel floors, not inflation.** Pupils, stripes, sutures, canthal lines and the catchlight get a minimum on-screen width through `fwidth` (≥1–1.5 px). At inspect and lab scale they fall back to true size, so close-ups stay correct.
2. **Constant exaggeration** is limited to:

   | feature | factor | notes |
   |---|---|---|
   | eye Ø, vipers and boa | ≤ ×1.15 | |
   | eye Ø, coral and sea snake | ≤ ×1.5 | the model already has about ×1.5; keep it |
   | pit opening | ≤ ×1.4 | |
   | nostril | ≤ ×1.5 | |
   | superciliary spines | ≤ ×1.25 | |

   Counts, positions, colours and paths stay as sourced.
3. **Contrast through real features.** Use the documented dark limbal rim, the dark pupil, the pale canthal and labial colours and the dark stripes, plus a plate-style catchlight. Never invent a bright iris colour that no source describes.
4. **Nothing on the face that the animal lacks:** no eyelids, no lashes on non-*Bothriechis* species, no pits on the coral, the sea snake or the boa.

### 3.1 Shared face kit (all species)

| feature | current | spec | basis |
|---|---|---|---|
| eye height | `eye.height` 0.5–0.6 of crownY | Vipers: centre so the eye's top is tangent to the canthal/supraocular edge, with `eye.height` 0.59–0.70 per species below. Boa and elapids: keep. | P2, P4, P5 |
| eye embed | 0.42 r | 0.35 r for vipers and boa (protrusion 0.65 r); 0.40 r for elapids | P1–P4: eyes bulge |
| eye direction | look (0.32, 0.22, ±1) | look (0.25, 0.12, ±1): more lateral, so the 45° book camera sees the iris | – |
| supraocular | floating sphere `brows` | a **shelf in the head mesh**: over u = at ± 1.2 r/Lh, at the crown corner, push out 0.25–0.35 r and up 0.1 r with a cos² falloff; paint the plate's outline | photos; S3 supraocular shape |
| canthus | `pCrown` uniform | `pCrown` rises to `pSnout` ahead of the eye (vipers with a canthus); Lachesis and boa stay rounded | P2; S9 (Lachesis: no canthus) |
| eye material | `hatch: 0.25`, roughness 0.12 | `hatch: 0`, roughness 0.08, plus an emissive catchlight (§4.3, §4.4) | S1 p. 10 (spectacle); plate convention |
| eye rim | outline 0.55 | outline width 1.0, plus a limbal ring painted at 0.80–0.93 of the visible radius, darkened ×0.45 | photos |
| pupil | half-width 0.10 r | slit half-width max(0.16–0.20 r, 0.75 px), half-height 0.78 r; round pupils radius 0.42 r | photos; pixel floor |
| catchlight | none (physical only) | a disc fixed in view space (towards up-left-front), about 0.22 r, never below 1.2 px; also in the albedo so the SVG prints it | plate convention |
| eye socket | none | on the skin, a soft dark ring at 1.0–1.25 r around the eye (spectacle margin and brow shadow), ×0.65 | photos |
| pits | black ellipsoid, no rim | resize per species; open anteriorly and laterally; paint a pale rim ring at 1.0–1.35 of the pit radius (pre- and subfoveal scales); dark interior also painted | S1; P2, P4, P9 |
| nostrils | black ellipsoid | per species; slit or oval with a pale rim; dorsal crescents on the sea snake | S4, S5, S15; P2, P9 |
| labials | none | painted rows of supralabial and infralabial scales with ≥1 px sutures and a scalloped upper edge; counts below where sourced | S3, S4, S5, S9 |
| crown scales | none | vipers and boa: granular, keeled where sourced, cell 0.03–0.04 Lh, ±8% tone, seams faded by `fwidth` like the body (plus `bumpNormal`); elapids: shields | S1, S3, S9, S12 |
| head hatching | default planar cross-contours | `hatchCoord = positionGeometry.x` (cm rings across the head, matching the body's `uv().x`); `hatch: 0.6` upper head, 0.4 jaw | `kits/ink` header (lines follow form) |
| tongue | `#1f1b22` | keep near-black for vipers, coral and sea snake [unverified]; terciopelo `#2a1c1c` [photo P3]; béquer `#2b2b30` [photo P7] | photos |

### 3.2 I. Terciopelo, *Bothrops asper*

| key | current → spec | basis / exaggeration |
|---|---|---|
| `head.height` | 0.34 → **0.29** | P2: canthal edge at 0.23, crown about 0.27 at the eye |
| `head.pSnout` (new) | – → **4.6** ahead of x = at + 0.1 (behind: 3.6) | sharp canthus (P2) |
| `eye.size` | 0.074 (keep) | visible Ø 0.139 = ×1.15 of 0.12 |
| `eye.at` | 0.66 → **0.62** | P2: 0.61 |
| `eye.height` | 0.5 → **0.63** (centre ≈ 0.165 Lh) | P2: 0.17 |
| brow shelf | out 0.30 r, up 0.10 r, length ±1.2 r | P1, P2 |
| pit | centre (at + 0.145, eyeY − 0.085); opening **0.050 × 0.036**, depth 0.02; faces 30° forward | P2 ×1.4; S4: halfway between eye and nostril, on the 2nd supralabial |
| nostril | (0.955, 0.095); **0.030 × 0.022** | P2 ×1.25 |
| supralabials | **7** cells over x ∈ [0.12, 0.97]; height 0.085 at the front → 0.07 at the back | S4: 7–8 |
| infralabials | **10** cells on the jaw over x ∈ [0.12, 0.90] | S4: 8–12 |
| crown scales | granular, keeled, cell 0.032 | S1, S12 |

**Colours:**

| part | hex |
|---|---|
| crown | `#5e4e34` |
| face below the canthus | `#b9a058` |
| labials | `#d6bd62` |
| chin | `#e9d47c` (keep) |
| canthal line | `#cdb46a`, 0.012 wide |
| postocular stripe | `#33261a`, 0.055 wide (pixel floor 2 px) |
| labial sutures | `#6e5a2c` |
| iris | `#7a6a3c` |
| iris reticulation | `#3a3018` (25%) |
| limbal ring | `#2e2615` |
| pupil | `#0b0a09` |
| catchlight | `#ffffff` |
| pit interior | `#1a0f0a` |
| pit rim | `#d6bd62` |

The stripe runs from the eye's rear edge at (at − 0.9 r, eyeY − 0.15 r) to the jaw angle at (0.05, 0.09).

**Painter, in words:**
1. Crown brown above the canthal corner.
2. Below it, the face grades to labial yellow.
3. The canthal line follows the corner from the supraocular's outer edge to the snout tip.
4. The postocular stripe runs back and down to the rictus, with labials below it.
5. Small scales fill the area between eye and labials.
6. The supraocular plate is outlined in a darker brown.

**Acceptance:**
- **Book zoom (1600, head ≈ 60 px):**
  - eye: a dark slit at least 1 px wide inside a bronze disc with a dark rim, a white catchlight of at least 1 px, and the eye's top under a brown brow;
  - pit: a dark hole with a pale lower and posterior rim, between eye and nostril and lower than both;
  - stripe: dark, running from the eye to the corner of the mouth;
  - face: yellow lips and chin;
  - labels: no filled dot on the eye or pit.
- **Inspect (≈165 px):** 7 supralabials visible, iris reticulation, crown granules, and the supraocular plate edge.

### 3.3 II. Bocaracá, oropel, *Bothriechis nigroadspersus* (and the Calaveras VI viper)

| key | current → spec | basis / exaggeration |
|---|---|---|
| `head.height` | 0.36 → **0.34** | P4: crown ≈ 0.33 |
| `eye.size` | 0.092 (keep) | visible Ø 0.172 = ×1.1 of 0.157 |
| `eye.at` | 0.64 → **0.58** | P4 measured 0.51 (single oblique photo). Move partway and confirm on a second lateral photo before going lower. |
| `eye.height` | 0.52 → **0.70** | P4: 0.74 |
| brow shelf | out 0.25 r | – |
| superciliary spines | 3 round cones → **2 flattened blades per side** | S3 "two raised and spinelike" |

**Spines:**

| spine | x | height | base length | thickness |
|---|---|---|---|---|
| rear | at − 0.055 | 0.10 | 0.045 | 0.018 |
| front | at + 0.035 | 0.08 | 0.045 | 0.018 |

Heights are P4 values ×1.25. Directions are dorsal 1.0, lateral +0.45, raked back by 0.25 (rear spine) and 0.05 (front spine). They sit on the shelf's outer edge.

**Other features:**

| key | spec | basis |
|---|---|---|
| canthal points (optional) | 2 small blades, height 0.035, at x 0.86 and 0.91 on the canthus | S3; P4 |
| pit | (at + 0.15, eyeY − 0.08); **0.075 × 0.055**; interior `#3a1a0c`; rim `#f0c64a` | P4 (large pit) |
| nostril | (0.93, eyeY − 0.05); 0.030 × 0.022 | P4 |
| supralabials / infralabials | **9** / **12** | S3 holotype |
| crown scales | keeled, cell 0.04 | S3 |
| flecks | ≤ 2% of the head area at 60% (today a Perlin threshold of 0.62–0.70 at 75%; measure the coverage when changing it) | S3: black speckles usually absent; S1: solid yellow |

**Colours:**

| part | hex |
|---|---|
| head | `#e3ad1e` (keep) |
| labials | `#efc040` |
| sutures | `#a87410` |
| iris | **`#d9c690`** (pale straw) |
| iris spots | `#2a2218`, 20% |
| limbal ring | `#5a4a2a` |
| pupil, catchlight | as I |

The iris change is sourced: S3 says "pale straw yellow to golden with black reticulations or spots", and P4 shows a pale silvery straw iris.

**Acceptance:**
- **Book zoom (29 px; Calaveras 39 px):**
  - eye: a pale disc with a dark rim and a dark slit, set at the top corner of the head;
  - spines: two short spikes above each eye, not three, not a crown;
  - the head still reads as one golden yellow.
- **Inspect:** keeled crown scales; 9 labials; a large pit with a reddish lining. For Calaveras, also at the t = 1.3 and 3.9 frames.

### 3.4 III. Coral, *Micrurus nigrocinctus*

| key | spec | basis |
|---|---|---|
| eye | keep `eye.size` 0.075 (already ≈ ×1.5 of a small elapid eye); embed 0.40; iris `#1b1917`; round pupil radius 0.42 r `#050505`; **catchlight 0.28 r**; outline 1.0 | S1 "ojos relativamente pequeños"; S13 round pupil; P6 |
| head shields | painted sutures, `#4a4846`, ≥1 px. Schematic layout in (x, \|z\|/half-width): rostral x > 0.95; paired internasals 0.86–0.95; paired prefrontals 0.72–0.86; frontal midline \|z\| < 0.22 over 0.47–0.72; supraoculars over each eye over 0.50–0.70; paired parietals 0.12–0.47 split at the midline; 1 preocular; 2 postoculars; temporals; ~7 supralabials | S13 (large shields); P6. **Counts unverified for this species: check Savage & Vial 1973 before treating them as fact.** |
| black cap | from the snout tip back to x = **0.55**. The rear border runs straight across the crown and slants forward on the flank, so it reaches the lip at x ≈ 0.62 (posterior supralabials yellow). | P6; S14 |
| yellow parietal band | x 0.12 → 0.55, wrapping onto the lower jaw (jaw yellow over x 0.10–0.60 and black chin are already right). Now 0.10–0.47. | S14; P6 |
| nuchal ring | black from x < 0.12, continuous with the body pattern's `s0` | current |

**Acceptance:**
- **Book zoom (19 px):** black snout cap, a clear yellow band behind the eyes, and a white catchlight pinpoint (at least 1 px) where each eye is. No label mark inside the head outline.
- **Inspect (34 px) and lab:** glossy shields with sutures; the eye as a black bead in a ring of plates.

### 3.5 IV. Cascabel, *Crotalus simus*

| key | current → spec | basis |
|---|---|---|
| `head.height` | 0.33 → **0.30** | P9 (flat crown) |
| `eye.height` | 0.5 → **0.62** | P9 |
| `eye.size`, `eye.at` | keep (0.07, 0.65) | no measurement |
| embed | 0.35 | – |
| plates | 2 internasals and 2–4 canthals on the snout top; supraoculars over the eyes; all with pale edges `#e2d3a4`; crown between them granular, cell 0.03 | P9; S12 |
| postocular band | `#2b2018`, 0.06 wide, from the eye to the jaw angle, bordered above and below by cream lines `#e2d3a4` 0.018 wide (the current painter already has the border) | S11; P9 |
| paravertebral stripes | begin on the head at x ≤ 0.20 as two bands 0.07 wide, centred at \|z\| = 0.12·W, continuous with the body's neck stripes (`patterns.js` crotalus `st`) | S11 "starting at the base of the head" |
| "dark bar on top" | do not paint until verified | S11 is ambiguous |
| pit | 0.065 × 0.050 at (at + 0.14, eyeY − 0.085); rim `#e2d3a4` | P9 |
| nostril | horizontal slit 0.035 × 0.015 at (0.95, eyeY − 0.05) | P9 |
| labials | cream `#e2d3a4`, cells about 0.065 wide (count not sourced) | P9 |

**Colours:** iris `#8a6a42` with speckles `#3a2a1a` (P9, congeneric); pupil half-width 0.20 r.

**Acceptance:**
- **Book zoom (65 px):** pale-edged plates on the snout and over each eye; a dark band behind the eye with cream borders; two neck stripes that start on the head; a large dark pit.
- **Inspect (86 px):** granular crown between the plates; a bronze speckled iris.

### 3.6 V. Matabuey, *Lachesis stenophrys*

| key | current → spec | basis |
|---|---|---|
| shape | `'lance'` → new `'bushmaster'`: as `lance` but `pSnout` **2.6** (no canthus), front rounding 0.16 (broadly rounded snout), `head.height` **0.32** | S9, S10 |
| `eye.height` | 0.5 → **0.59** | P5 |
| `eye.size` | 0.064 (keep) | – |
| brow shelf | **0.15 r** (narrow supraoculars) | S9; S10 etymology |
| crown | very small granules, cell 0.025; 2 small internasals separated by small scales | S9 |
| labials | the 2nd supralabial forms the pit's anterior border; the **3rd is very large** (paint it 2× the others, under pit and eye); 4–5 rows of small scales between eye and labials (granule band about 0.05 tall) | S9 |
| pit | 0.06 × 0.045 at (at + 0.12, eyeY − 0.10) | P5 |
| stripe | `#1f1611` from the eye's rear to the jaw angle, 0.065 wide, with a pale line `#e6d2b0` 0.012 above | P5 |

**Colours:** lips `#eadccb`; crown `#b88e69` (keep); iris keep `#b58f62` [unverified, flagged].

**Acceptance:**
- **Book zoom (67 px):** a rounded snout with no ridge; a black stripe from the eye to the jaw; pale lips; the eye high under a narrow brow.
- **Inspect:** one big 3rd supralabial and a granular crown.

### 3.7 VI. Serpiente marina, *Hydrophis platurus*

| key | spec | basis |
|---|---|---|
| eye | keep (0.066; ≈ ×1.5); embed 0.40; catchlight 0.28 r; outline 1.0 | S6 (small elapid eyes) |
| shields | entire; paint sutures in `#2a2a28` on black and `#b89a2a` on yellow (close-up only). Nasals meet at the midline, with **no internasals**. 7–8 upper labials, 4–5 below the eye, a subocular between them and the eye. | S5, S15 |
| nostrils | dorsal crescents 0.035 × 0.015 at x 0.925, \|z\| 0.16 W, on the nasal shields. A thin lighter rim `#3a3a36` shows the opening on black (legibility device, not a colour claim). | S5, S15; [conflict S17] |
| black/yellow boundary | keep (the eye in the black; sharp boundary) | S15; P10 |

**Acceptance:** at book zoom (16 px), a black head with yellow lips and a visible catchlight. In inspect (47 px), the shield sutures and both dorsal nostrils.

### 3.8 VII. Béquer, *Boa imperator*

The current painter's stripe has to become z-aware (bug fix).

| key | spec | basis |
|---|---|---|
| `eye.size` | 0.06 → **0.066** (×1.1 of about 0.12 visible) | P7 |
| eye | embed 0.38; `eye.height` 0.56 (keep) | – |
| mid-dorsal stripe | **dorsal mask only**; width 0.05 at the snout tip → 0.18 at x = 0.10; pale central streak 0.04 wide for x < 0.35 | S7, S16; P8 |
| lateral stripe, in front of the eye | **lateral mask only**; nostril → eye front; 0.035 wide | S16; P8 |
| lateral stripe, behind the eye | eye rear → jaw angle (0.03, 0.2·Ht); **0.10 wide** | P7 |
| subocular bar | eye's lower edge → lip, 0.04 wide, slanting slightly back | P7 |
| posterior supralabial blotches | 1–2 dark spots about 0.04 across at x 0.2–0.35 | P7 |
| iris | pale `#c8b8a0` above and below; a **dark band in the stripe colour across \|y\| < 0.35 r**, continuing the stripe through the eye; pupil a slit with half-width 0.15 r | P7 |
| crown | fine granules, cell 0.025; no plates | S7 |
| colours | head ground = body ground × mix 10% towards white; stripes = body saddle colour, after the sibling boa task lands; tongue `#2b2b30` | P7 |

**Acceptance:**
- **Book zoom (51 px):** three stripes that do not merge over the snout; the eye stripe visibly crossing the eye; a pale iris above and below; a dark subocular bar.
- **Top lab view:** the mid-dorsal stripe widens towards the nape; no dark "U" on the snout.

### 3.9 Head label anchors must never hide the face

**Rule.** A head-feature label is drawn **around** or **beside** its feature, never on top of it.

1. **Anchor placement** (`head.js` anchors):
   - eye: at the cornea apex (eye centre + look·r), not inside the head;
   - pit and nostril: at the opening, moved 0.3 of their size along the surface normal;
   - eyelash scales: at the base of the rear spine;
   - eye stripe: at the stripe midpoint (as now).
2. **New optional label fields** (additive to the frozen contract's label shape): `mark: 'dot' | 'ring' | 'tick'` and `size` (cm, the feature's radius). Snake head labels use these values:

   | label | mark | size |
   |---|---|---|
   | eye | ring | visible spectacle radius |
   | loreal-pit | ring | 0.7 × opening length |
   | nostril | ring | 0.75 × length |
   | eyelash-scales | tick | – |
   | eye-stripe | tick | – |
   | tongue | tick when retracted, dot when out | – |
   | fangs, fixed-fangs, venom-gland, recurved-teeth, head | tick | – |

3. **Projection** (`FigureHost.labelItems`): `it.r` is `size` projected along the camera's right axis, in CSS px.
4. **Drawing** (`labels.js`):
   - **ring**, when `it.r ≥ 2.5` px: a hairline circle of radius `it.r + 1.5` (1 px ink at 0.75 opacity, no fill, no white stroke). The leader stops at the ring.
   - **tick**, or a ring smaller than 2.5 px: no mark. The leader stops 2.5 px short of the anchor.
   - **dot:** body features only, shrunk to r 2.25 with a 1 px stroke.
   - **halo:** the white halo stops 8 px before the leader's end, everywhere, so it never erases the face it points at.
5. **Crowding:** when two head anchors are closer than `r1 + r2 + 4` px, only the higher-ranked keeps its ring; the other becomes a tick. On heads under 40 px, all face marks are ticks.
6. **Phones (optional, Reader):** tapping a head label or look-closer note inspects the **head**: `stage.rig.inspectSphere(headCentre, headRadius × 1.6)`, so the head fills about 60% of the short side.

**Acceptance (automatable, §4.9):** `dotsOnEyes == 0` on all 8 plates at 1600×1000 and 390×844. Every ring radius is at least the feature's projected radius plus 1 px. In a pixel sample, no white halo pixel lies within the eye disc.

---

## 4. Implementation plan

Owners: the snakes subject (`src/subjects/snakes/*`), the ink kit (`src/kits/ink/*`), UI (`src/engine/ui/*`), and figure host and export (`src/engine/figures/*`, `src/engine/export/*`). The other workflow currently edits several of these, so land these changes after it, or coordinate.

### 4.1 `src/subjects/snakes/species.js`

- Per species, add `head.pSnout`, `head.brow { out, up, len }`, `eye.embed`, `eye.look`, `eye.pupilW`, `eye.irisDark`, `eye.reticulation`, and a new `face` block.
- The `face` block holds `pit { ahead, below, len, ht, rim, inner }`, `nostril { x, below, len, ht, dorsal? }`, `labials { upper, lower, x0, x1, hFront, hBack, colour, suture }`, `stripe` / `stripes` (segments in Lh), `crownScales { cell, keel }`, `plates` (a list of suture polylines in (x, z/W)), `lashes` (oropel), `tongue`, and `swatchNames`.
- Values are in §3.2–§3.8. Change `head.height`, `eye.at` and `eye.height` as listed there.
- Add a `'bushmaster'` entry to `SHAPES` in `head.js` and set `lachesis.head.shape` to it.
- Keep morph colours: `oropel.iris` becomes `#d9c690`; the green morph's iris can stay as it is [unverified].

### 4.2 `src/subjects/snakes/head.js`

- **`headDims`:** pass `pSnout` and `brow`.
- **`crownZ` and `crownY`:** use `pAt(u) = mix(pCrown, pSnout, smooth(eu, eu + 0.12, u))`.
- **`headGeometry(d, 'upper')`:** after (X, Y, Z) for the dorsal half (`c >= 0`), add the supraocular shelf. Build time only, so the per-frame cost is unchanged.

  ```js
  const du = (u - d.eyeU) / d.brow.len, gu = du * du < 1 ? (1 - du * du) ** 2 : 0;
  const ph = Math.atan2(Math.abs(Z), Math.max(1e-6, Y));                   // 0 dorsal … π/2 lateral
  const gp = Math.exp(-(((ph - 0.78) / 0.35) ** 2));                       // the crown corner
  Z += Math.sign(Z) * d.brow.out * gu * gp; Y += d.brow.up * gu * gp;     // out/up in cm (· r)
  ```

  Keep the CPU normals (`computeVertexNormals`) so the painter's lateral and dorsal masks follow the real surface.
- **`buildHead`:**
  - Compute the eye centre and radius, pit, nostril and labial geometry **before** the skin materials, and pass them in `headColorNode(spec, { ...d, eye, pit, nostril }, part)`.
  - Eyes: `e.position.z = side*(ez − er*spec.eye.embed)`; `lookQuaternion(spec.eye.look ?? (0.25, 0.12, side))`.
  - Eye material: `ctx.ink({ colorNode: eyeColorNode(spec), emissiveNode: eyeGlintNode(spec), hatch: 0, roughness: 0.08, svgColor: iris })`; `ctx.outline(e, { width: 1.0 })`.
  - Remove the `brows` sphere group, and its `parts` entry `supraoculars`: the shelf is now part of `head-skin`.
  - **Pits:** smaller depth; rotate each ellipsoid so its long axis runs along x and the opening faces (0.5, 0, ±1). The pale rim is painted on the skin. Keep the `pits` group in `skin`, so it hides and x-rays with the skin.
  - **Nostrils:** per `face.nostril`; dorsal crescents for the sea snake.
  - **Eyelash:** two flattened blades per side; geometry `fangGeometry(len, base, −0.05)` with `scale.z = 0.4`, or a three-sided cone. Directions as in §3.3. Outline width 0.6. Layer unchanged: `eyelash-scales`, which is also hidden with the skin (`setLayers`).
  - **Tongue:** `face.tongue` colour.
  - **Hatching:** `upperMat` gets `hatchCoord: positionGeometry.x` and `hatch: 0.6`; `jawMat` gets `hatch: 0.4`.
  - **Anchors:** as §3.9; export `anchors.sizes = { eye, 'loreal-pit', nostril }` in cm.
  - **Parts:**
    - `eyes` gets `swatches: [{iris}, {'Pupil', '#0b0a09'}, {'Dark iris rim', irisDark}, {'Catchlight', '#ffffff'}]` and `minPatternPx: 40` (§4.5);
    - add `swatches` for `loreal-pits` (`'Pit opening'`) and `nostrils`.
  - Layers are unchanged. Eyes, pupils and catchlights go with the skin (`eyes.visible = skin`). Fangs follow skin ∪ skeleton ∪ venom.

### 4.3 `src/subjects/snakes/patterns.js`

**`headColorNode(spec, dims, part)`.** Rewrite it as composable painters inside one `Fn`. Everything is TSL. Every node used (`positionGeometry`, `normalGeometry`, `normalView`, `fwidth`, `mx_cell_noise_float`, `mx_noise_float`, `smoothstep`) is exported by `three/tsl` r186 and already imported in this file, except `normalGeometry`, which is the one new import.

```js
const p = positionGeometry, n = normalGeometry;
const lateral = smoothstep(0.35, 0.7, abs(n.z));      // flanks
const dorsal  = smoothstep(0.5, 0.85, n.y);           // crown
const corner  = float(1).sub(aastep(0.12, abs(n.y.sub(abs(n.z)))));   // the canthal corner, a line that follows the mesh
const eyeUV   = vec2(p.x.sub(E.x), p.y.sub(E.y)).div(E.r);            // eye-centred, on the eye's side
const seg = (ax, ay, bx, by) => /* distance (cm) from (p.x, p.y) to a segment */;
const line = (d, halfW) => float(1).sub(aastep(max(float(halfW), fwidth(d).mul(0.75)), d));   // pixel floor
```

- **Labials:** `t = (p.x − x0)/w`, `i = floor(t)`. Suture: `1 − aastep(0.04, min(fract(t), 1 − fract(t)))`. Upper edge: `hl = mix(hBack, hFront, (p.x − x0)/(x1 − x0)) + 0.012·Lh·sin(π·fract(t))`. Mask: `lateral · (1 − aastep(hl, p.y))`. Lachesis's 3rd cell gets double width.
- **Crown granules:** reuse the body's staggered-row lattice (`bodySkin`) on `vec2(p.x, p.z)` (dorsal) and `vec2(p.x, p.y)` (lateral), blended by `dorsal`. Fade with `detail = 1 − smoothstep(0.22, 0.55, fwidth(cell coordinate))`. Add a keel streak where species have keels. Add relief through the existing `bumpNormal(hCm · ctx.u.fitScale)`.
- **Plates:** ≤ 12 suture segments per species from `face.plates`, drawn with `line(seg(...))` in the (x, z) plane on dorsal fragments.
- **Pit rim:** `d = length((p.xy − pit.xy)/pit.size)`; rim = `smoothstep(1, 1.1, d)·(1 − smoothstep(1.3, 1.45, d))·lateral`; interior dark where `d < 1`.
- **Socket:** `col *= mix(0.65, 1, smoothstep(1.0, 1.25, length(eyeUV)))·lateral`.
- **Species markings:** stripes multiplied by `lateral` or `dorsal` as specified. This fixes the béquer's snout flood. The coral cap border slants as `capX(y)`. The cascabel's paravertebral pair is painted on `dorsal`.

**`eyeColorNode(spec)`:**

```js
const p = positionGeometry.normalize();                 // eye-local, +Z = line of sight
const rr = length(vec2(p.x, p.y));
let col = mix(iris.mul(0.8), iris.mul(1.08), streak);   // existing radial streaks
col = mix(col, irisDark, smoothstep(0.55, 0.62, mx_noise_float(p.mul(14)).mul(0.5).add(0.5)).mul(retic));
col = mix(col, irisDark.mul(0.6), smoothstep(0.80, 0.93, rr));            // limbal ring
const hw = max(float(pupilW), fwidth(p.x).mul(0.75));                     // pupil pixel floor
const pupil = slit ? float(1).sub(aastep(1, length(vec2(p.x.div(hw), p.y.div(0.78)))))
                   : float(1).sub(aastep(0.42, rr));
col = mix(col, C('#0b0a09'), pupil.mul(smoothstep(-0.2, 0.1, p.z)));
const g = dot(normalView, normalize(vec3(-0.36, 0.52, 0.78)));            // catchlight, fixed in view space
const glint = aastep(min(float(0.975), float(1).sub(fwidth(g).mul(3))), g);
return mix(col, C('#ffffff'), glint);                                     // in the albedo, so the SVG prints it
```

For the boa, before the pupil: `col = mix(col, stripeC, 1 − smoothstep(0.28, 0.36, abs(p.y)))`.

Export a sibling `eyeGlintNode(spec)` that returns `vec3(glint).mul(0.8)` for `emissiveNode`, so the catchlight stays white on the eye's shadow side.

**`patternSwatches(spec, 'head' | 'jaw')`.** Add the new named colours, keeping the dominant one first and keeping swatches at least 0.08 apart in OKLab:
- asper: `'Brown crown'`, `'Yellow face and lips'`, `'Dark eye stripe'`, `'Pale canthal line'`, `'Pit opening'`, mouth;
- schlegelii: `'Golden yellow'`, `'Pale labials'`, `'Pit opening'`, mouth;
- micrurus: unchanged;
- crotalus: add `'Pale plate edges'`;
- lachesis: add `'Black eye stripe'`;
- boa: `'Pale head'`, `'Dark head stripes'`, `'Dark labial blotches'`, mouth.

### 4.4 `src/kits/ink/index.js`

- `inkMaterial`: one additive option, `if (o.emissiveNode) mat.emissiveNode = o.emissiveNode;`. The output node already reads `output.rgb`, so an emissive glint is never hatched, because its shade ratio is above `litHi`. No signature change is needed. Document it in the JSDoc and in `CONTRACTS.md` §4.
- No change to the outline: the eyes use `width: 1.0` and the spines 0.6; the pupil is painted, so it has no outline. Thin parts follow the "skip outlines under about 1 px" rule.

### 4.5 Export (`src/engine/export/raster.js` `readPattern`; `idpass.js` regions)

- Make the eye print its pattern with an additive part hook: `const minPx = reg.part?.minPatternPx ?? MIN_PATTERN_PX; if (n < minPx * ss * ss) return null;`. `reg.part` is already set in `idpass.js`.
- The despeckle (12·ss² px) and the minimum loop area (7·ss² px) let a pupil of about 76 px at the default export through. Check it in the line SVG too.
- Fallback, if swatch snapping is unreliable on 400–500 px eyes: add a real pupil mesh, a thin ellipsoid at the cornea with part `pupils` and colour `#0b0a09`, in the `eyes` group (skin layer), with no outline.

### 4.6 `src/engine/ui/labels.js` and `ui.css`; `src/engine/figures/FigureHost.js`; `src/subjects/snakes/index.js`

- **`index.js`:** extend `L_` to `L_(id, text, detail, anchor, layer, extra)` and spread `extra` into the label. Pass `{ mark, size }` as in §3.9. Calaveras `skulls/snake.js` spreads labels (`{ ...l, layer: 'snake' }`), so the marks carry over with no edit there.
- **`FigureHost.labelItems(camera, w, h)`:** when `it.label.size` is set, project `it.world + camRight · size · anchorWorldScale`, and set `it.r` to the px distance. Use the existing pooled vectors; no allocation.
- **`labels.js`:**
  - `LabelNode` gains `this.ring = s('circle', { class: 'lam-leader-ring' })` in `this.g`.
  - Where `renderLabels` copies `x`/`y` into `n.ax`/`n.ay`, also store `n.ar = it.r ?? 0` and `n.mark = it.label?.mark ?? 'dot'`.
  - In the draw block that builds `pts` (now `n.halo.setAttribute('points', pts)` … `n.dot.setAttribute('cx', …)`), pull the last point back by `gap = mark === 'ring' && ar ≥ 2.5 ? ar + 1.5 : mark === 'dot' ? 0 : 2.5`, and the halo's last point by `gap + 8`.
  - Show the dot only for `'dot'` (r 2.25) and the ring only for `'ring'`.
  - Add the crowding rule from §3.9.
- **`ui.css`:**

  ```css
  .lam-leader-ring { fill: none; stroke: var(--lam-ink); stroke-opacity: .75; stroke-width: 1; }
  .lam-leader.is-active .lam-leader-ring { stroke: var(--lam-accent); stroke-opacity: 1; }
  .lam-leader.is-far .lam-leader-ring { stroke-dasharray: 2 2; }
  ```

  and `.lam-leader-dot` with r 2.25 and stroke-width 1.

### 4.7 `src/subjects/skulls/snake.js`

No code change: the lesson builds the snake with `createSnake` (`follow-path`), so it inherits every face change.

Verify:
- the lesson's lithograph snake context under the skull's engraving style (catchlight and pupil read in both);
- that the pupil stays aligned with the head when the path rolls the head (it is parented to the head, so it does);
- that the Calaveras label filter keeps `eye`, `loreal-pit` and `eyelash-scales` with their marks.

The bead-chain fallback has no face, and that is acceptable.

### 4.8 Risks

| risk | mitigation |
|---|---|
| A lower crown and a raised eye change `head.centreY` and the neck joint (the tube starts inside the head at 0.7 Lh). | Lab side and top views at t = 0, 1.6 (strike) and 3.4. |
| Venom glands and the skull sit at `Ht·0.16` and `0.48·Ht`, and may poke through a lower crown. | Lab with layers `venom:1,skeleton:1` and explode 0.6. |
| The brow shelf shadows the eye under the key light. | Emissive glint, limbal ring, `hatch: 0`. |
| Shader size and compile time grow (`headColorNode` ×7 species). | One `Fn`; at most about 12 segment distances; warm with `compileAsync` (the reader already does). |
| SVG swatches snap thin lines wrongly. | Keep sutures out of `swatches`; they are tone only. |
| Ownership: FigureHost, labels.js and export are other agents' files. | Land them as separate, additive commits. |
| The béquer's head colours depend on the sibling boa-colour task. | Derive them from the body palette. |

### 4.9 Verification commands

Run from `/Users/josoroma/sites/books`. Use the preview server for long runs: `LAMINA_URL=http://127.0.0.1:4173`, after `npx vite build`. Read every PNG.

```bash
# 1) lab close-ups per species (side | front | tq | top), head-framed
FRAME='const L=window.lab,root=L.mount.figure.root;root.updateMatrixWorld(true);L.setLabels(false);const hs=root.getObjectByName("head-skin"),V=hs.position.constructor;hs.geometry.computeBoundingBox();const b=hs.geometry.boundingBox,c=b.getCenter(new V());hs.localToWorld(c);const LhW=hs.localToWorld(new V(0,0,0)).distanceTo(hs.localToWorld(new V(b.max.x-b.min.x,0,0)));const q=hs.getWorldQuaternion(hs.quaternion.clone()),D={side:[0,0.1,1],front:[1,0.12,0],tq:[0.7,0.45,0.65],top:[0.08,1,0.03]}[window.VIEW];const d=new V(...D).normalize().applyQuaternion(q);L.camera.fov=30;L.camera.updateProjectionMatrix();L.camera.position.copy(c).addScaledVector(d,LhW*0.95/Math.tan(Math.PI/12));L.controls.target.copy(c);L.controls.update();return "framed";'
P=$(python3 -c 'import urllib.parse,json;print(urllib.parse.quote(json.dumps({"species":"bothrops-asper","pose":"strike"})))')
for V in side front tq top; do node scripts/shot.mjs "lab.html?type=snake&params=$P&t=0.5&play=0&ui=0" .scratch/bilingual/faces/after-asper-$V.png --w 900 --h 640 --dpr 2 --wait 1200 --eval "window.VIEW='$V'; $FRAME"; done
#    species ids/poses/t: bothriechis-schlegelii branch 0.5 (morph oropel) · micrurus-nigrocinctus slither 0.5 · crotalus-simus rattle 0.3
#    lachesis-stenophrys ambush 0.5 · hydrophis-platurus swim 0.5 · boa-imperator constrict 0.5 · add --webgl for the WebGL pass
#    Calaveras: lab.html?type=skull&params={"subject":"human","lesson":"skull-and-snake","snake":{"species":"bothriechis-schlegelii"}}&t=1.3&layers=skull:0

# 2) reader at book zoom, phone and inspect, with the face measurement (prints [eval] JSON)
MEASURE='await (window.lamina?.settle?.(800));const L=window.lab&&!(window.lab instanceof Node)?window.lab:null;const cam=L?L.camera:lamina.stage.camera,cv=(L?L.renderer:lamina.renderer).domElement,R=cv.getBoundingClientRect();const fig=L?L.mount.figure:lamina.host.active.figure;fig.root.updateMatrixWorld(true);const hs=fig.root.getObjectByName("head-skin"),V=hs.position.constructor;const P=(v)=>{const p=v.clone().project(cam);return[R.left+(p.x+1)/2*R.width,R.top+(1-p.y)/2*R.height]};hs.geometry.computeBoundingBox();const b=hs.geometry.boundingBox;const a=P(hs.localToWorld(new V(b.min.x,0,0))),c=P(hs.localToWorld(new V(b.max.x,0,0)));const right=new V().setFromMatrixColumn(cam.matrixWorld,0).normalize();const eyes=["eye-right","eye-left"].map((n)=>{const e=fig.root.getObjectByName(n);const w=new V();e.getWorldPosition(w);const s=new V();e.getWorldScale(s);const p0=P(w),p1=P(w.clone().addScaledVector(right,e.geometry.parameters.radius*s.x));return{x:Math.round(p0[0]),y:Math.round(p0[1]),rPx:+Math.hypot(p1[0]-p0[0],p1[1]-p0[1]).toFixed(1)}});const dots=[...document.querySelectorAll(".lam-leader")].filter((g)=>g.style.display!=="none").map((g)=>g.querySelector(".lam-leader-dot")).filter((d)=>getComputedStyle(d).display!=="none").map((d)=>[+d.getAttribute("cx"),+d.getAttribute("cy")]);return{title:fig.title,headPx:+Math.hypot(c[0]-a[0],c[1]-a[1]).toFixed(1),eyes,dotsOnEyes:dots.filter(([x,y])=>eyes.some((e)=>Math.hypot(x-e.x,y-e.y)<e.rPx+4)).length};'
for N in 1 2 3 4 5 6 7; do
  LAMINA_URL=http://127.0.0.1:4173 node scripts/shot.mjs "index.html#/serpientes?plate=$N&t=0.5" .scratch/bilingual/faces/after-book-p$N.png --w 1600 --h 1000 --dpr 2 --wait 2500 --eval "$MEASURE"
  LAMINA_URL=http://127.0.0.1:4173 node scripts/shot.mjs "index.html#/serpientes?plate=$N&t=0.5" .scratch/bilingual/faces/after-phone-p$N.png --w 390 --h 844 --dpr 3 --wait 2500 --eval "$MEASURE"
  LAMINA_URL=http://127.0.0.1:4173 node scripts/shot.mjs "index.html#/serpientes?plate=$N&t=0.5" .scratch/bilingual/faces/after-inspect-p$N.png --w 1600 --h 1000 --dpr 2 --wait 1500 --eval "await lamina.settle(800); lamina.inspect(true); await new Promise(r=>setTimeout(r,2500)); $MEASURE"
done
LAMINA_URL=http://127.0.0.1:4173 node scripts/shot.mjs "index.html#/calaveras?plate=6&t=1.0" .scratch/bilingual/faces/after-cal6.png --w 1600 --h 1000 --dpr 2 --wait 2500 --eval "$MEASURE"
#    crop around the printed eye: magick after-book-p1.png -crop 320x220+$((2*X-160))+$((2*Y-110)) +repage -resize 300% crop.png   (×2 for --dpr 2)
#    pass: dotsOnEyes == 0 everywhere; pupil, rim and catchlight visible in the crop (§3.x acceptance)

# 3) regressions
node scripts/audit.mjs && node scripts/audit.mjs --webgl          # seam, update cost (≤ 2 ms), layers, look-closer ids
node scripts/validate-books.mjs serpientes && node scripts/validate-books.mjs calaveras
LAMINA_URL=http://127.0.0.1:4173 node scripts/export-svg.mjs "lab.html?type=snake&params=$P&t=0.5&play=0&ui=0" .scratch/bilingual/faces/after-asper.svg --mode color --view book --labels 0
LAMINA_URL=http://127.0.0.1:4173 node scripts/export-svg.mjs "lab.html?type=snake&params=$P&t=0.5&play=0&ui=0" .scratch/bilingual/faces/after-asper-line.svg --mode line --view book --labels 0
grep -c 'data-part="eyes"' .scratch/bilingual/faces/after-asper.svg; grep -o 'fill="#0b0a09"' .scratch/bilingual/faces/after-asper.svg | head -1   # the pupil prints
#    layers: lab with &layers=skin:0 (eyes, pupils, spines hidden with the skin), &layers=skeleton:1,venom:1&explode=0.6 (nothing pokes through)
```

The baselines for every command above are already in `faces/` (`book1600-*`, `phone390-*`, `inspect1600-*`, `lab-*`, `svg-terciopelo-*`, `measure-*.json`).

---

## 5. Sources

| id | reference | supports |
|---|---|---|
| S1 | Sasa, M., Bonilla, F. & Chaves, F. (2019). *Serpientes venenosas de Costa Rica: biología básica*. Universidad de Costa Rica, Instituto Clodomiro Picado. ISBN 978-9968-555-06-7. Read from the local text copy used by the content agents (pp. 10, 11, 14, 34, 42–44, 57). | spectacle; pits and four openings; vipers' small head scales and vertical pupils; glands and triangular head; coral head and eyes; eyelash projections; oropel solid yellow; *barba amarilla* |
| S2 | Instituto Clodomiro Picado, *Micrurus nigrocinctus* species page. <https://icp.ucr.ac.cr/en/information-and-materials/venomous-snakes-costa-rica/micrurus-nigrocinctus> | coral head "not very differentiated from the body" |
| S3 | Arteaga, A., Pyron, R. A., Batista, A., et al. (2024). A systematic revision of the eyelash palm-pitviper *Bothriechis schlegelii* complex… *Evolutionary Systematics* 8(1): 15–64. <https://doi.org/10.3897/evolsyst.8.114527>; *B. nigroadspersus* treatment via Plazi: <https://tb.plazi.org/GgServer/rdf/FF4665A639F05CFB93354EAB607B67BA> | spines, canthals, keeled scales, iris, labial counts, head width 82.9% of length |
| S4 | Uetz, P. et al. (eds.). The Reptile Database: *Bothrops asper*. Diagnosis after Folleco-Fernández (2010), *Novedades Colombianas* 10(1): 33–70; cites Campbell & Lamar (1989). <https://reptile-database.reptarium.cz/species?genus=Bothrops&species=asper> | B. asper scalation, stripe, pit, yellow chin |
| S5 | The Reptile Database: *Hydrophis platurus*. Diagnosis after Leviton et al. (2003), *Proc. Cal. Acad. Sci.* 54(24). <https://reptile-database.reptarium.cz/species?genus=Hydrophis&species=platurus> | sea snake head shields and nostrils |
| S6 | Huang, M. C.-W., Liao, C.-P., Chou, C.-C., Lin, J.-W. & Huang, W.-S. (2022). Size of snake eyes correlates with habitat types and diel activity patterns. *Front. Ecol. Evol.* 9: 821965. <https://doi.org/10.3389/fevo.2021.821965> | relative eye size |
| S7 | Duque-Torres, D., Aponte-Gutiérrez, A., Molina-Moreno, T. & Arteaga, A. (2024). Central American Boa (*Boa imperator*). In Arteaga, Bustamante & Vieira (eds.), *Reptiles of Ecuador*. <https://www.reptilesofecuador.com/boa_imperator.html> (DOI 10.47051/DVNA9462) | boa stripes, small scales, pupil, no pits |
| S8 | Wikipedia, "Bothrops asper", Description section, citing Campbell & Lamar (2004). <https://en.wikipedia.org/wiki/Bothrops_asper> | secondary |
| S9 | Wikipedia, "Lachesis muta", Description section, citing U.S. Navy (1991), *Poisonous Snakes of the World*. <https://en.wikipedia.org/wiki/Lachesis_muta> | secondary; genus head scalation |
| S10 | Wikipedia, "Lachesis stenophrys". <https://en.wikipedia.org/wiki/Lachesis_stenophrys> | rounded snout; etymology |
| S11 | Wikipedia, "Crotalus durissus", Description section (cites Campbell, Lamar & Brodie 2004; the head sentences are uncited). <https://en.wikipedia.org/wiki/Crotalus_durissus> | secondary |
| S12 | Wikipedia, "Sistrurus" (uncited contrast with *Crotalus*). <https://en.wikipedia.org/wiki/Sistrurus> | secondary |
| S13 | Wikipedia, "Elapidae" (uncited). <https://en.wikipedia.org/wiki/Elapidae> | secondary |
| S14 | Wikipedia, "Micrurus nigrocinctus" (uncited sentences). <https://en.wikipedia.org/wiki/Micrurus_nigrocinctus> | secondary |
| S15 | Wikipedia, "Yellow-bellied sea snake", citing Smith (1943), *Fauna of British India, Reptilia* 3: 476–477. <https://en.wikipedia.org/wiki/Yellow-bellied_sea_snake> | secondary; valves cite references 8–11 |
| S16 | Wikipedia, "Boa constrictor", citing Mattison (2007), *The New Encyclopedia of Snakes*. <https://en.wikipedia.org/wiki/Boa_constrictor> | secondary |
| S17 | Tu, M.-C. (2012). [Sea snakes]. *NP Quarterly*, Taiwan National Parks, March 2012. <https://www.taiwan.nps.gov.tw/home/en-us/NP_Quarterly/31698/9468.html> | contradicts S5/S15 on *Pelamis* nostrils; noted, not followed |
| S18 | Savage, J. M. & Vial, J. L. (1973). The venomous coral snakes (genus *Micrurus*) of Costa Rica. *Rev. Biol. Trop.* 21(2): 295–349. <https://archivo.revistas.ucr.ac.cr/index.php/rbt/article/view/27283> | abstract only; the PDF exceeds the 10 MB fetch limit. It is the source that should settle the coral's head-cap and shield details. |
| P1–P10 | Photographs in §2.3. | measurements are mine, on single photographs; treat them as ±15% |

**Not found or not verified, and still to check:**
- coral shield counts and exact cap and band limits (S18);
- iris colour of *L. stenophrys*, *H. platurus* and the coral beyond "dark";
- the cascabel's "dark brown bar at the top";
- tongue colour for five species;
- the *B. nigroadspersus* eye position, which needs a second lateral photo or a specimen figure from S3.

---

## Review (adversarial)

Task `critique:snake-faces` · 2026-11-01 · lens: adversarial herpetologist and 3D illustrator. Nothing under `src/`, `scripts/` or `public/` was edited; the sections above are left as written. Working files are in the reviewer's scratchpad, not shipped.

**Opened.** S1 as the ICP PDF (`https://icp.ucr.ac.cr/sites/default/files/content/serpientes-venenosas-de-cr-biologia-basica-icp.pdf`; printed page = PDF page + 2), S2, S3 (Plazi), S4, S5, S6 (Frontiers full text, Tables 1 and 2C), S7–S17, and as further sources: the ICP species pages for *B. asper*, *B. schlegelii*, *C. simus*, *L. stenophrys* and *H. platura*; the Reptile Database pages for *C. simus*, *L. stenophrys* and *M. nigrocinctus*; Schmidt, K. P. (1933) *Preliminary account of the coral snakes of Central America and Mexico*, Field Mus. Nat. Hist. Zool. Ser. 20 (archive.org text); the Commons API for P1–P10. **Code read:** `head.js`, `patterns.js`, `species.js`, `snakes/index.js` (labels), `kits/ink/index.js` (`inkMaterial`, `addOutline`), `export/raster.js`, `export/index.js`, `export/idpass.js`, `ui/labels.js`, `ui.css`, `FigureHost.js` (`activeLabels`, `labelItems`), `Reader.js`, `stage.js`, `skulls/snake.js`, `books/calaveras.js`. **Sibling notes read:** `research-boa-rat.md` §2.4–2.6 with `boa/proto/prototype.diff`, `design-i18n.md`, `handoffs-round2.md`. **One new render** (preview 4173, plates I and III, t = 0.5) to test which eye the `eye` anchor sits on. The geometry numbers in R2 are recomputed with the `table()` and superellipse code of `head.js`.

### R1. Claims against the sources

**Confirmed (verbatim in the source):**
- S1: p. 10 spectacle; p. 11 *escudos*; p. 14 pit 1–5 mm deep, narrow opening, in the loreal region between eye and nostril; p. 34 "cabeza ovalada, ojos relativamente pequeños"; p. 42 Cuadro 2 (four openings; triangular head, small head scales and vertical pupil are not diagnostic; the boa) and glands "detrás y hacia abajo de los ojos"; p. 43 compressor muscle → triangular head; p. 44 "recuerda la tenencia de pestañas", "amarillo sólido"; p. 57 Fig. 30 *barba amarilla*. ISBN and 2019 also confirmed.
- S2; every S3 diagnosis and holotype item; every S4 item; every S5 item; S7; S8 (a genus-level sentence); S10; S11–S14 (uncited, as stated); S15 including "sharply demarcated"; S16; S17 (the conflict is real).
- Licences of P1–P10 match the Commons API.
- The §1 code facts match the code: dot r 2.75 with a 1.5 stroke, halo 3.25, eye anchor `ez + er·0.2`, slit `0.11·0.92`, limbal ring 0.62–0.86, `hatch: 0.25`, outline 0.55 ≈ 0.66 px (`addOutline` draws ≈ 1.2 px × width), `MIN_PATTERN_PX = 500`, key light (−1.6, 3.4, 1.4), lash lengths and directions. The ΔE table recomputes exactly. The §1.2 numbers match `faces/measure-*.json`.
- Further sources agree:
  - Reptile Database *C. simus*: "Reyes-Velasco et al. 2022 failed to recover *C. simus* … as distinct from *C. durissus*".
  - Reptile Database *L. stenophrys*: head "predominantely unpigmented dorsally", which supports the tan crown.
  - ICP *B. asper*: "a large head, well differentiated and clearly triangular when seen dorsally", "postocular bands".
  - ICP *Bothriechis*: "a flat head, clearly differentiated from the neck, and are snub-nosed", which supports the lower crown.
  - Schmidt 1933: *Micrurus* head shields show "great uniformity of arrangement"; "temporals normally 1-1".

**Wrong or overstated — corrections (old → new):**

| § | old | new | evidence |
|---|---|---|---|
| 2.1 | "ED / head width … (Huang et al. 2022 [S6], Table 1)" | "ratios computed from the Table 1 means" (Table 1 gives mean head width and eye diameter, not a ratio). Stronger support: Table 2C expects, at head width 14.84 mm, an eye of 3.24 mm in Viperidae (0.22) and 2.72 mm in Elapidae (0.18) | S6 |
| 2.1 | *T. stejnegeri* "arboreal pit viper" | "terrestrial": Table 1 codes all three vipers T (nocturnal ambushers) | S6 Table 1 |
| 2.1 | "roughly 0.12–0.17 Lh for the vipers" | "0.10–0.17 Lh" (0.70–0.83 Lh × 0.14–0.20). Caveat: *H. melanocephalus* is a small-headed sea snake, so it is a weak proxy for *H. platurus* | arithmetic |
| 0 #3 | "Real vipers and boas carry the eye at the top corner of the head, under a supraocular ledge" | "Real pit vipers …". Boas have small scales on the snout (S7) and no ledge (P7); §3.1 already keeps the boa's eye | S7, P7 |
| 0 #1 | "A dot is an 8.5 px disc" | "a 7 px disc" (r 2.75 plus half of the 1.5 px stroke) | `ui.css` |
| 1.4 #4 | "the crown is about 20–25% too high" | "about 11% too high at the eye (0.299 vs P2's 0.27 Lh)". The low 0.23 canthal edge is a cross-section problem (R2), not a height problem | `head.js`, P2 |
| 1.4 #6 | "The pit is 0.084 × 0.06 Lh, about 2.3× real" | "the ellipsoid is 0.084 × 0.06 Lh, but 0.013 of its 0.017 Lh depth is sunk, so the visible opening is ≈ 0.054 × 0.039 Lh, ≈ 1.5× P2" | `head.js` |
| 1.4 #5, 2.2-I | yellow face, citing Folleco-Fernández via S4 ("la zona inferior de la boca …") | S4 supports only the lower jaw and chin. The yellow loreal and subocular face is [photo] (P1–P3) | S4 |
| 2.1 | "photographs always show a catchlight (every photo in §2.3)" | "every lateral photo with a visible eye (P1–P5, P7, P9)" | P6, P8, P10 |
| 2.2-I, 3.1 | terciopelo tongue `#2a1c1c` [photo P3] | Grid-free pixels of P3 give `#5e3518`–`#653b22` on the stem, with paler tines. `#2a1c1c` is only ΔE 2.6 from today's `#1f1b22`, so it changes nothing visible. → `#5a3424` [photo P3], or keep near-black and drop the P3 basis | P3 |
| 2.2-I, 3.2 | *B. asper* crown scales "granular, keeled" (S1, S12) | "granular". Keels are unsourced for *B. asper*: S1 and S12 only say small; keels are sourced only for *B. nigroadspersus* (S3) | S1, S3, S12 |
| 2.2-V | S9 "citing U.S. Navy (1991)" | Only the "4–5 rows of small scales" sentence carries that citation. "No canthus", internasals, supraoculars, crown and labials are uncited sentences about *L. muta* | S9 |
| 2.2-VI | S15 "citing Smith (1943)" for the head shields | Those Wikipedia sentences are uncited; their source is S5 (Leviton et al. 2003). Smith 1943 is cited for colour | S15 |
| 2.2-VII vs 3.8 | iris "pale `#c8b8a0` above and below; a dark band … across \|y\| < 0.35 r" | "pale above; dark from y ≈ +0.05 r down to the lower rim, continuous with the subocular bar": `col = mix(col, stripeC, float(1).sub(smoothstep(0.02, 0.12, p.y)))`. This is §2.2-VII's own wording, and P7 zoomed shows it | P7 |
| 2.3, 2.2-I | P2 "a lateral portrait" | P2 is oblique: the eye outline is ≈ 1.2 : 1 and the chin and throat are in view. Ratios along the head axis hold; heights (`eye.height`, `head.height`, eye Ø) carry more than ±15% | P2 |
| 2.3 | P8, P9, P7 as given | P8 is a two-year-old captive at the Belize Zoo (juvenile proportions). P9 is a captive *C. d. durissus* (Reptilienzoo Scheidegg, Germany), a 3/4-front macro. P7 has no locality and is 683 × 512 px | Commons API |
| 3.5 | basis "P9" for `head.height` 0.30, `eye.height` 0.62, pit 0.065 × 0.050, nostril 0.035 × 0.015 | [unverified]: nothing can be measured on a 3/4-front macro | P9 |
| 3.8 | `eye.size` "×1.1 of about 0.12 visible" | §2.2-VII reports no P7 eye measurement → report it or mark [unverified] | — |
| 4.1 | "the green morph's iris can stay as it is [unverified]" | S3's iris ("pale straw yellow to golden with black reticulations or spots") is part of the species diagnosis, not a morph trait → green-morph `#a7b64e` → the same pale straw | S3 |
| 2.2-I vs 3.2 | nostril "0.31 Lh ahead of the eye centre", but spec x **0.955** (= `at` + 0.335) | x = `at` + 0.31 = **0.93**, so the pit (`at` + 0.145) stays at the measured 47% of the eye–nostril span (S4: equidistant) | §2.2 vs §3.2 |
| 3.5 | cascabel iris `#b88f55` → `#8a6a42` | Keep `#b88f55`. `#8a6a42` is ΔE 3.1 from the crown `#7d6448` and 2.0 from the ground, against 16.0 today: the same "iris = skin" fault §1.2 diagnoses | OKLab |
| 3.6 | matabuey iris "keep `#b58f62`" (ΔE 1.2 to the crown) | Still open: the eye will read only by its rim and catchlight. Read the iris from a second clear photo before release; do not invent one | §1.2 |
| 3.7 | sea snake eye "keep (0.066; ≈ ×1.5)" | ≈ ×1.7 by §2.1's own estimate (visible 0.121 Lh vs 0.46 × 0.157 = 0.072 Lh) → either `eye.size` 0.066 → **0.059** (×1.5), or write ×1.7 in the table of §3.0 | arithmetic |

**Missed by the research, with sources:**
- ***C. simus* head shape.** The ICP species page says "a relatively small head, not too differentiated from the neck, a round snout". The Reptile Database etymology quotes "la tête paroît comme tronquée en devant" (snub snout). The model's `broad` head steps 1.9× over the neck (§1.2: 0.81 / 0.42). → Reduce the crotalus jowl flare (its own shape table, or a lower `head.width`) once a dorsal photo or specimen gives the ratio, or cite a source for the 1.9 step. The blunt snout already fits.
- ***B. nigroadspersus* head length.** The holotype's head is 34.4 mm, 6.5% of SVL. With `tail: 0.16` that is 5.46% of total length. → `head.length` **0.048 → 0.054** (+14%: the head grows from 29 to 33 px at book zoom, and from 39 to 44 px in Calaveras VI).

### R2. The eye spec does not fit the head it sits on

With the stated `head.height`, `eye.size`, embed 0.35 and today's cross-section exponent p at the eye, the new `eye.height` puts the top of the eye above the canthal corner (`crownY·2^(−1/p)`). The eye then pokes out through the shoulder of the crown, and shows from above as a bead:

| species | crownY at the eye | corner (p) | top of the visible eye | eye top outside the skin | `eye.height` with the top at the corner | p needed for the spec's height |
|---|---|---|---|---|---|---|
| asper | 0.263 | 0.217 (3.6) | 0.235 | +0.52 r | 0.56 | 6.1 |
| oropel | 0.317 | 0.257 (3.3) | 0.308 | +1.55 r | 0.54 | 24 |
| cascabel | 0.266 | 0.216 (3.3) | 0.231 | +0.51 r | 0.56 | 4.8 |
| matabuey | 0.282 | 0.230 (3.4) | 0.226 | +0.16 r | 0.60 | 3.2 |

P2's own numbers (a 0.23 canthal edge under a 0.263 crown) imply p ≈ 5.2 at the eye: a pit viper's crown is flat and its cheeks are nearly vertical.

**Corrections:**
- **§3.1 canthus.** "`pCrown` rises to `pSnout` ahead of the eye" → "`pAt(u)` ≈ 3.4 behind the eye (temporal region, jowls) and **≈ 6 from the eye forward**, with `pSnout` ≥ that; Lachesis and the boa stay round". The asper `pSnout` of 4.6 would make the snout rounder than the eye region.
- **§3.1 eye height.** Fixed `eye.height` → derived: `ey = yCorner(eu) − rVis − 0.05·r`, with `yCorner(u) = crownY(u)·2^(−1/pAt(u))`. For the oropel, `eye.height` 0.70 → **≈ 0.60** with p = 6 (top 0.276 under a 0.283 corner).
- **Acceptance, all pit vipers.** Add: "top view: the eyes are barely visible under the supraocular edge, and no part of the eye rises above the canthus."
- **§4.2 shelf.** `gp = exp(−((ph − 0.78)/0.35)²)` is 0.69 at the eye centre: it pushes the skin out by 0.21 r there, so the eye is in effect embedded 0.56 r. It is 0.91 at the top of the eye. The result is a swelling round the eye, not a ledge over it. → Use a one-sided band above the top of the eye only, for example `gp = smoothstep(phTop + 0.05, phTop − 0.10, ph) · smoothstep(phTop − 0.60, phTop − 0.30, ph)`, where `phTop` is the angle of the top of the eye. Place eyes, spines, pits and anchors against the displaced surface (add the shelf to `crownZ`, or export a `surfaceZ(u, y)`), not the old `crownZ`.
- **§4.2 mesh.** `SphereGeometry(1, 44, 30)` gives Δu ≈ 0.051 Lh at the eye and 8.2° steps round the section. The eye spans about 3 rings, the ledge about 3.5, and a p = 6 canthus falls between vertices. → Build `upper` and `jaw` at **(96, 64)**. The meshes are rigid, so this costs build time only.

### R3. Shader (TSL, both backends)

- **The catchlight floor is wrong.** `aastep(min(0.975, 1 − fwidth(g)·3), g)` sets its threshold per fragment, and `fwidth(g) ≈ sin θ / R` grows away from the highlight. So every fragment with `cos θ + 3·sin θ / R > 1` lights up:

  | eye radius R (where) | radius of the "catchlight" |
  |---|---|
  | 4.75 px (terciopelo, book zoom) | 0.90 R: the whole visible eye goes white |
  | ≤ 3 px | the entire eye |
  | 12.8 px (inspect) | 0.44 R |
  | 33 px (lab) | 0.18 R, the intended size |

  → Use one pixel size per eye, with the same pixel-size expression `addOutline` already runs on both backends. This needs `vec4`, `sqrt`, `modelViewMatrix`, `cameraProjectionMatrix` and `viewportHeight` added to the imports:
  ```js
  const cV = modelViewMatrix.mul(vec4(0, 0, 0, 1));                           // eye centre (view)
  const pxV = cameraProjectionMatrix.mul(cV).w.mul(2)
    .div(cameraProjectionMatrix.element(1).element(1).mul(viewportHeight));   // view units per device px
  const Rpx = length(positionView.sub(cV.xyz)).div(pxV);                      // the same on every fragment of the eye
  const s = clamp(float(1.2).div(Rpx), 0.22, 0.6);                            // ≥ 1.2 px, ≤ 0.6 R
  const glint = aastep(sqrt(float(1).sub(s.mul(s))), dot(normalView, Lv));
  ```
  Aim `Lv` nearer the line of sight, for example (−0.25, 0.30, 0.92). The current (−0.36, 0.52, 0.78) lands under the new ledge on the book camera.
- **Sutures.** §3.1 labials "≥ 1 px", §3.7 "close-up only" and the crown's "faded by `fwidth`" disagree. → One rule: sutures fade with the body's `detail` term and have no floor. Otherwise a 19 px coral head becomes a mesh of lines.
- **§3.1 eye socket.** "Soft dark ring at 1.0–1.25 r, ×0.65" does not appear in P1–P4, where pale scales meet the spectacle. → Keep only the upper arc (the brow's shadow) at ×0.85, or drop it.
- **WGSL uniformity.** Derivatives must stay in uniform control flow. Never put `fwidth`, `aastep` or `bumpNormal` inside an `If()`; use `mix` or `select`. GLSL accepts it, so `--webgl` will not catch the error, but WebGPU fails to compile.
- **`hatchCoord`.** `positionGeometry.x` → `float(Lh).sub(positionGeometry.x)`. The body's `uv().x` counts cm from the snout, while the head's x counts from the occiput, so without the flip the lines jump phase at the neck.
- **Engraving style.** The kit's engraving branch is `mix(paperTone, ink, m)`, which ignores albedo and emissive. Painted pupils, catchlights and stripes vanish with `?style=engraving` and `lab.setStyle('engraving')`. A pupil mesh with `ctx.flat({ color: ink })` survives both styles.
- **§4.4 `emissiveNode`** works: the output node reads `output.rgb`, which includes emissive, so the glint is never hatched ✓.

### R4. SVG export

- **The painted pupil and catchlight do not reliably print.** `readPattern` also runs `modeFilter(…, 2)` and `absorbSmall(…, 18·ss²)` after its size gate. In today's colour export (`faces/svg-terciopelo-color.svg`, `part-eyes`) the terciopelo eye is ≈ 23 × 20 px:
  - the 0.22 r catchlight (≈ 2.3 px radius, ≈ 17 px²) is absorbed;
  - the slit (≈ 3.8 px wide) is thinned by the 5 × 5 mode filter;
  - smaller eyes (béquer, oropel, Calaveras) lose both;
  - `minPatternPx: 40` alone does not change this.
- **→ §4.5: make the pupil mesh the primary design, not the fallback** (part `pupils`, `#0b0a09`, in `eyes`, no outline). It is traced as its own loop: region despeckle 12·ss², loop area 7·ss². For a catchlight part, add `part.keepSmall` (skip despeckle and `absorbSmall` for that part); otherwise state that the plate prints no catchlight. The §4.9 check `grep fill="#0b0a09"` passes only with the pupil mesh or `--detail 2`.
- **Calaveras VI: §4.7 "No code change" → one change.** `buildSnake` returns the whole snake as one part (`{ id: 'snake', object: fig.root }`). `.scratch/repair-figures-export/out-keep/calaveras-6-k2-color.svg` has a single `part-snake` with three swatches, so no face can print. → Forward the face parts: `...fig.parts.filter((p) => FACE.has(p.id)).map((p) => ({ ...p, id: 'snake-' + p.id, layer: 'snake' }))`, with eyes, pupils, tongue, pits, nostrils and eyelash scales. `idpass.js` `partFor` takes the nearest part ancestor, so these win over `snake`.

### R5. Labels

- **Every head anchor is on the right side (+z).** On plate III in the preview at t = 0.5, the right eye's `look · toCamera` is −0.54 and the left eye's +0.73. The `eye` label is drawn on the hidden eye at the far edge of the head, and the occlusion ray does not catch it (`occluded: false`). `measure-book.json` agrees (−0.54, and −0.51 at inspect). Moving the anchor to the cornea apex keeps the wrong side. → Build right and left anchors for the eye, pit and nostril, and let `FigureHost.activeLabels` pick the one facing the camera (`label.anchors: [r, l]`), or mirror them per plate.
- **Tongue.** "tick when retracted" → hide the tongue label while the tongue is in (`ext < 0.15`). Retracted, its anchor sits beyond the open jaw tip and points at paper (`handoffs-round2.md`, terciopelo strike).
- **Convergence.** Plate II sends four leaders into a 29 px head; rings fix the marks, not the clutter. → At most 1 face leader on heads under 40 px and 2 under 80 px, ranked focused, then look-closer, then eye. The rest appear on tap or in inspect.
- **§3.9.6 phones: "optional" → required.** Inspect frames only 1.3–1.4× on phones, so faces stay at 10–36 px. Acceptance: on 390 × 844, a tap on a head look-closer note (`loreal-pit`, `eyelash-scales`, `eye-stripe`, `nostril`) frames the head at ≥ 45% of the short side.
- **§4.9 metric.** `dotsOnEyes == 0` passes trivially once dots become rings or ticks. → Add a pixel test: no ink or halo pixel within 0.8 r of the visible eye's centre.

### R6. Missing items and coordination

- **The béquer's head conflicts with the boa task.** `research-boa-rat.md` §2.4–2.6 and `boa/proto/prototype.diff` already rewrite `headColorNode` case `'boa'` and the `'boa'` head swatches. They set:
  - crown `#b9b3a6`, stripes `#211915`, lips `#e3dccb`;
  - a **rust** preocular patch `#8a5a3c` (ICP and Osa photos);
  - a median stripe of half-width `0.035 + 0.09·(1 − hx)` of W, ≈ 0.02 → 0.065 Lh full width;
  - and they leave the iris to this task.

  §3.8 instead has a **dark** preocular stripe 0.035 Lh wide, a median stripe 0.05 → 0.18 Lh (2.5–2.8× wider), and colours "derived from the body". → One owner for `patterns.js`. Take the colours from the boa task and the geometry from here (z-aware masks, iris band, subocular bar, labial blotches, pale nape streak). Reconcile the median width between P8 and the FLMNH "thin dark median stripe".
- **i18n.** `design-i18n.md` translates label `text` and `detail` inside `FigureHost.activeLabels` (a memo per language), the function §4.6 also edits. Land both in one change. Any new or changed label string needs its Spanish entry.
- **Closed mouth shows pink.** Lab side views and the SVG crop show the mouth lining as a pink line along the whole lip with the mouth shut; a closed snake mouth shows none. → Tighten the `'upper'` mouth band (`smoothstep(−0.12·Hb, −0.06·Hb, y)`), or close the gap at gape 0.
- **Occiput collar.** In side view the head's rounded back stands proud of the neck (lab side views; 41.png): a loaf on a hose. → Move the u = 0 knots of `crown` and `width` towards the neck radius, so the crown slopes into the nape while the jowls still flare sideways.
- **Oropel canthal points.** No group or layer is given. → Put them in the skin group (hidden and x-rayed with the skin) with their own part colour, not in `eyelash-scales`.
- **Spines at book zoom.** At 0.018 Lh they are ≈ 0.5 px thick on a 29 px head, and an outline of width 0.6 turns them into black slivers (SKILL gotchas: skip outlines under about 1 px). → Outline width ≤ 0.35, or none below 1 px.
- **Coverage.** No species is missing. The seven plates and the Calaveras viper are covered: the viper inherits every change through `createSnake` with a lithograph context, and its text and 2D step already say two scales. The exceptions are its SVG (R4) and its head length (R1). The coral's shield counts stay unverified (Savage & Vial 1973 could not be read here either); for the genus, only "temporals 1-1" is confirmed (Schmidt 1933).

**Suggested order:**
1. Labels: side-aware anchors, the leader cap and rings.
2. Eye placement: the p ≈ 6 canthus, derived `eye.height` and the one-sided ledge.
3. The catchlight formula and a pupil mesh.
4. Iris colours: keep the cascabel's; read the matabuey's from a photo.
5. Merge with the boa task and the i18n label memo.
6. SVG parts for Calaveras.
