# Campfire by the Beach · Fogata en la playa

Volume VI is an original six-conversation book about an ordinary fire. A storyteller father and his questioning daughter connect observations to explanations, without presenting a named scientist as the narrator. The dialogue and scene composition are original; the family uses adapted CC0 human geometry as documented below.

English: `#/en/fogata`; Spanish: `#/es/fogata`. Both editions have the same leaves, figures, look-closer targets and interaction controls. Josoroma’s wordmark appears on both boards. The existing reader provides narration of the current left page, a language switch and adjustable reading angle. The final prompt pages are supplied by the series registry.

| Plate | Question | Inspectable figure |
|---|---|---|
| I · Where did the wood go? / ¿Adónde fue la madera? | What enters, leaves or stays in a fire? | A night beach diorama with father, daughter, waves, stars, a small fire ring and water bucket |
| II · The flame above the log / La llama sobre el tronco | Why does a flame stand above solid wood? | A heated log, separable charred layer and rising gas symbols |
| III · Atoms change partners / Los átomos cambian de pareja | How can matter stay while substances change? | Six conserved atoms rearranged from 2 CO + O₂ to 2 CO₂ |
| IV · Warmth takes different roads / El calor toma distintos caminos | Why do you feel warmth beside rising hot air? | A convection plume with moving tracers, radiation rays, a daughter beside the fire and a solid conducting log |
| V · Little glowing messengers / Pequeños mensajeros luminosos | What is the difference between flame, ember and spark? | Enlarged soot particles, a glowing charred solid and airborne hot fragments |
| VI · The fire and the stars / La fogata y las estrellas | How is this energy connected to sunlight? | The beach scene plus an explicitly symbolic Sun–tree–fire memory diagram |

## Scientific sources and decisions

Sources were checked on 2 November 2026. The original prose uses their scientific relationships, not copied passages.

- [NOAA: Why does the ocean have waves?](https://oceanservice.noaa.gov/facts/wavesinocean.html) and [NOAA Ocean Exploration: What causes ocean waves?](https://oceanexplorer.noaa.gov/ocean-fact/waves/) support the wave explanation. The text qualifies the nearly orbital motion as an offshore approximation and distinguishes breaking surf, which moves water. It does not say all ocean water returns exactly to its starting point.
- [Tang & Eickner: Effect of Inorganic Salts on Pyrolysis of Wood, Cellulose, and Lignin, FPL-RP-82](https://www.fpl.fs.usda.gov/documnts/fplrp/fplrp82.pdf) describes gases/vapours and char from heated wood, flame from gas mixed with air, glowing char and combustion feedback. The accessible indexed report text was checked; a subsequent full-PDF fetch timed out.
- [FAO: Wood carbonisation and the products it yields](https://www.fao.org/4/x5555e/x5555e03.htm) supports char, moisture evaporation and the variety of gases, including carbon monoxide. The book does not transfer the report’s retort temperature thresholds into a universal campfire temperature.
- [OpenStax/Rice University: Strengths of Ionic and Covalent Bonds](https://openstax.org/books/chemistry-atoms-first/pages/9-4-strengths-of-ionic-and-covalent-bonds) supports the distinction between energy needed to break bonds and energy released on bond formation. Plate III accounts for the overall reaction; it explicitly does not claim that the animation is an elementary molecular pathway.
- [NIST: Fire Dynamics](https://www.nist.gov/el/fire-research-division-73300/firegov-fire-service/fire-dynamics) supports conduction, convection and radiation. The arrows are schematic directions, not a calculation of temperatures, velocities or heat flux.
- [Weise et al., Fuel 406 (2026), 136681](https://research.fs.usda.gov/download/treesearch/80133.pdf), particularly the introduction on page 2, describes pyrolysis products, glowing soot, yellow flame emission and escaping smoke constituents. No detailed emission factors or quantitative prediction is inferred from this study of pine needle fuel beds.
- [Cooper: The Cell, Photosynthesis, NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/NBK9861/) supports conversion of light energy into chemical energy. The indexed passage was available; the full-page fetch presented a browser verification screen. The text does not claim original sunlight photons remain stored intact in a log.
- [NASA Science: Sun Facts](https://science.nasa.gov/sun/facts/) supports nuclear fusion as the Sun’s energy source. The book explicitly separates fusion of nuclei from the chemical rearrangements of a wood fire.
- [U.S. Fire Administration: Protecting structures from wildfire embers and fire exposures](https://www.usfa.fema.gov/blog/protecting-structures-from-wildfire-embers-and-fire-exposures/) supports the distinction between radiation, hot-gas transport and travelling embers.
- [USDA Forest Service: Living with Wildfire in Northwestern California](https://www.fs.usda.gov/Internet/FSE_DOCUMENTS/fseprd628285.pdf) supports attending a fire, observing restrictions, thoroughly extinguishing with water and stirring, and not merely burying embers. The indexed campfire section was available; the full PDF was not fetched successfully. The book avoids location-specific permission claims: the fictional scene is an authorized site.

## What the models mean

The dimensions are illustrative model coordinates, not measured centimetres of real scenery or particles. All six printed scale notes explain the appropriate simplification. Molecular spheres and soot beads are enlarged; the shapes and colours separate concepts. The beach waves are a repeating visual cue, not a hydrodynamic simulation. The fire tongues illustrate reacting gases and glowing matter, without solving combustion equations. The Sun and tree in the final scene represent an earlier energy history, not a sun shining beside the family at night.

The CO example conserves exactly two carbon atoms and four oxygen atoms. Links encode membership, not bond order. The animation moves between reactant and product layouts and back for inspection; the return does not represent spontaneous reversal of combustion. Part separation is an explanatory view, not a real process.

The code derives every pose from a five-second model clock. Captions use the shared reader pacing, so the displayed cycle can take longer. Pose at zero equals pose at five; an explode/reset round trip returns exactly to the starting transforms. Particles rise during a smooth visible half-cycle and return at zero scale, keeping their transforms continuous at the loop boundary. Layers expose scenery, observers, combustion, gas, char, bonds, heat-flow diagrams and enlarged particles where relevant.

## Files and validation

- `src/books/fogata.js` and `src/books/es/fogata.js`: six complete plates per edition, with 120–220 body words per plate; introduction, how-to, afterword, twelve glossary entries and nine references.
- `src/subjects/campfire/index.js`: six inspectable figures. The story scenes combine skinned family characters with procedural coastline and fire; the molecular study is intentionally sparse.
- `src/i18n/es/campfire.js`: translations for every runtime title, layer, label, detail and part name.

Before the character identity revision, Node syntax checks passed. Both manifests passed the content validator with zero errors and warnings. Edition composition reported no missing, extra, changed, misordered or mismatched fields. Direct figure checks verified all look-closer ids, loop closure, deterministic scrub/reset, and reversible part separation. All six plates were rendered and visually reviewed in headless Chrome with WebGPU at 1440 × 900; switching the live reader to Spanish reported no missing runtime strings, and the browser reported no JavaScript errors. That six-figure Spanish audit passed: all 89 collected figure strings translated, all labels below 110 px, and seam steps between 0.00 and 0.58 times an ordinary 1 ms step. Reaction labels follow the atoms and appear only in the appropriate molecular state. Those screenshots and audit JSON are in `.scratch/campfire-review/`. They do not validate the subsequent skinned-character revision; its final visual, motion and export checks must be recorded separately. Integrated typesetting and export checks are recorded by the series verification pass.

## Visual revision

The original geometric draft was replaced after visual review. A further family revision follows the user's description: the daughter is French, fair-skinned, ten years old, curious and charismatic, with two braids and a fringe; the father is a light-complexioned mestizo computer engineer and adventurous hacker, with glasses and a cap reading **Head**. These are illustrative interpretations, not exact digital likenesses.

The family now uses a continuous skinned body, hands and face, with separate adult and childhood proportions, adjusted joint centres and restrained facial expressions. Inverse-kinematic targets define the seated limbs; head turns and hand gestures alternate through the conversation. Opaque relaxed clothing follows the same joint weights. Skin retains subtle surface detail with engraving and crosshatching disabled. The coastline has an irregular continuous sand edge, procedural grain, curved moving wave surfaces and a rounded starry sky cutout. The book stage remains white.

Logs have distorted bark, grooves, knots, end grain and splintered fibres. The fire uses tapered curling volumes with emissive interiors and translucent outer tongues. Flames and smoke neither cast nor receive hard shadows. The four mechanism studies use the same detailed materials, enlarged molecular models with readable reactant/product holds, flowing heat tracers and cracked glowing char. The final symbolic tree reuses the original books’ botanical `BladeSurface` kit.

Editable helpers are `model.js`, `characters.js`, `character-rig.js`, `hand-contact.js`, `daughter-hair.js`, `hiking-boots.js`, `accessories.js`, `landscape.js`, `mechanisms.js` and `tree.js` beside the subject entry point. The initial visual reviews include all six spreads and separate conversational moments in `.scratch/campfire-review/`. These are authored explanatory illustrations, not scans of real people or a computational combustion simulation.

## Character asset provenance

The continuous human geometry, joint weights, textures and facial expression data are CC0 MakeHuman system data exported by Kasper Olesen's CharacterCreator at commit `852e48f316b90a0937234886630e4fb4cdfd1f78`. The book stores the asset as `public/assets/characters/human-base.glb` with `body-joints.json`. It was copied from the locally installed FORM/MUSE skill's general morphable source on 2 November 2026. An independently written adapter bakes the father and daughter identities; it does not include CharacterCreator's generator or runtime code. The childhood morph weight is an artistic proportion control, not a measured age.

The [asset README](../../public/assets/characters/README.md), [license notes](../../public/assets/characters/CharacterCreator-LICENSE-NOTES.md), [source audit](../../public/assets/characters/source-audit.json), [MakeHuman inventory](../../public/assets/characters/MakeHuman-asset-licenses.json) and [CC0 dedication](../../public/assets/characters/CC0-MakeHuman.txt) retain the provenance and permission evidence. Hair, glasses, the lettered cap, clothing adaptation and conversational poses are authored for this book. The exact user request, implementation scope and review plan are recorded in [09-character-identity.md](../prompts/09-character-identity.md).

## Character revision verification

The production-preview audit captured 168 frames of plates I, IV and VI at five
model times, including full-body, front, three-quarter, profile and individual
hand views. Representative frames were inspected directly. The browser reported
no errors, sampled posed vertices remained finite, and the zero/five-second
mean-coordinate checks agreed within `4.22e-11`. A separate 23-sample live
playback check crossed the full loop in 16.4 seconds of elapsed browser time.
Posed hand picking succeeded before SVG export and after a pose change, with the
temporary export bounds cleared. The rendered SVG kept clothing and skin
colours distinct.

The review exposed small wardrobe openings and floating shoes in the heat
plate. After repairs and rebuilding, 99 targeted frames covered all three
character plates at 0, 1.1 and 2.5 seconds. Direct inspection confirmed closed
father-shirt and daughter-waist openings and grounded plate IV shoes, with no
browser or finite-vertex errors. The earlier full loop/playback/export tests
were not repeated for these final clothing and foot-placement adjustments.
A further five-frame check after moving the heat-plate character forward
confirmed calf/log clearance, seated pelvis contact and shoes meeting the page
from the front, three-quarter and both sides.
Evidence is in `.scratch/character-revision/final-review/`, `final-playback/`,
`repaired-review/` and `heat-seat-review/`; the [identity prompt record](../prompts/09-character-identity.md)
describes the exact scope.

## Screenshot corrections

The subsequent annotated screenshots identified a twisted left wrist, smooth
footwear, a floating tree, the cap colour and the displayed prompt wording.
The hand now distributes most palm rotation through the forearm, with a
relaxed oblique palm and gentler finger curls. The father's left wrist twist
in the sampled pose fell from about 140° to 16°; this numerical change was
also checked visually from high, front and profile cameras.

Both characters wear matte trekking footwear with shaped uppers, rubber toe
and heel protection, layered soles, geometric tread, stitched panels, collars,
eyelets and laces. Each beach foot fits its actual sole support points to the
local sand height and slope. Their seated positions also keep the logs clear
of the calves. The father's **Head** cap is black. The final symbolic tree
has roots on the rear sand and stays attached to that ground in the separated
view; its earlier-energy meaning is unchanged.

The revised production build passed all six figure audits on WebGPU and WebGL,
including all 93 runtime Spanish strings. The character review recorded 103
frames across plates I, IV and VI, with zero/five-second posed-vertex agreement,
finite vertices, no browser errors and a 22-sample complete playback cycle.
Picking worked before SVG export and after changing pose. Independent hand,
footwear and tree reviews supplemented these automated checks. The full
bilingual Campfire output set was refreshed. The exact annotations and prompt
editing policy are in [10-screenshot-corrections.md](../prompts/10-screenshot-corrections.md);
local review evidence is in `.scratch/screenshot-corrections/`.

## Follow-up hand and hair repair

The next screenshots disproved the earlier visual assessment of hand contact.
The daughter's supporting fingers were present but hidden inside her trousers;
the raised hands also accumulated excessive finger flexion. The new
[prompt and investigation record](../prompts/11-human-naturalness.md) separates
these visual defects from the runtime checks that had passed.

Supporting hands now fit the actual posed thigh surface, including its slope,
and retain a small clearance through the five-second cycle. Finger motion uses
per-joint anatomical axes, with much quieter conversational curls and a relaxed
thumb. The child's palm retains source crease detail independently of her softer
facial skin. Her fringe and two braids now use layered directional strands,
uneven tips, flyaways and less uniform highlights, with braid roots behind the
ears. The black Head cap, glasses and trekking footwear remain in place.

The final production contact sweep sampled both hands every half-second on
plates I, IV and VI: 110 measurements and 129 review frames, with no browser
errors. All 55 support samples had no skin penetration beyond the 1 mm test
tolerance. Closest hand clearance was 1.5 mm; the stricter palm-only gaps were
3.21 mm for the father, 4.03 mm for the daughter on the beach and 8.70 mm in
the heat study. Enlarged high, opposite-side and palm views were reviewed
separately. Foreshortening still changes apparent finger lengths with camera
angle; the geometry and conversational gestures remain illustrative.

The separate browser regression is `npm run test:characters`, with `LAMINA_URL`
selecting the server. Its 25 production checks pass without loosening the
thresholds used to reject the previous poses. The independent numeric and visual
evidence is in `.scratch/human-naturalness/final-production-fixed/`.

The subsequent raised-palm follow-up reposes the daughter's left arm diagonally
across the front of her body. A forward-pointing hand had still made the palm
and fingertip planes difficult to distinguish despite the contact repair.
The revised wrist target and oblique palm now expose the finger shafts and
thumb in high, front and side views. The father and both supporting hands are
unchanged. Production review covers all three character plates and the loop
endpoints; details are in
[12-left-palm-orientation.md](../prompts/12-left-palm-orientation.md).

The next screenshots rejected that diagonal pose: the elbow was too high and
flared, and the palm looked forced against the chest. The current repair
lowers the wrist over the lap, relaxes the upper arm beside the torso and uses
a gently cupped upward palm. Both daughter elbows now bend about their
anatomical hinge planes; palm rotation is distributed along the forearm instead
of twisting the proximal elbow skin. Her supporting hand still fits the posed
trousers. See [13-relaxed-arm.md](../prompts/13-relaxed-arm.md) for the correction
and the limits of the earlier visual review.

`npm run test:characters` includes source-mesh bind/hinge/twist regressions and
25 actual clothing-contact checks. The production build, full-cycle playback,
picking before/after export and actual WebGL rendering passed. Whole-character
front, high and side captures were reviewed separately from those mechanical
checks; local evidence is under `.scratch/relaxed-left-arm/`.
