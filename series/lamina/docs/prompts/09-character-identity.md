# Campfire family: identity and continuous anatomy

## User request (verbatim)

> bodies, faces, hands in general dont look natural or beautiful:
>
> my daughter is french, white, ten years old, carismatic, curious, con dos trenzas y un fleco de cortre de cabello. I am mestizo almost white, computers engineer, i use glasses y una gorra que dice Head and i am a hacker adventorous.

The attached views showed the previous beach and heat-transfer figures. The
separate shoulder spheres, long parallel fingers, disconnected facial features
and striped skin remained visible at close range. This revision concerns the
family in Campfire plates I, IV and VI, in both language editions.

## Identity and art direction

The daughter is a curious, charismatic ten-year-old with a fair complexion,
two braids and a fringe. Her face, shoulders and body proportions must read as
a child, rather than an adult model reduced uniformly in size. The father is a
light-complexioned mestizo computer engineer and adventurous hacker. He wears
glasses and a cap with the word **Head**. These are interpretations of the user's
written description, not scans or exact digital likenesses. Nationality is not
used to invent additional facial features.

Replace assembled primitive bodies with a continuous weighted surface. Keep the
neck, shoulders, elbows, wrists, hips and knees connected during every pose.
Hands need a distinct thumb saddle, finger webbing, varied finger lengths and a
relaxed curl. Seated weight should meet the logs; feet should visibly meet the
sand or intentionally dangle. Faces use integrated anatomy, restrained smiles,
eyelids, eye direction and blinks. Conversational gestures alternate between
questioning and listening instead of holding a permanent wave.

Skin uses the book's lit materials with engraving and crosshatching disabled.
The material retains subtle surface and lip detail without the earlier blue
shadow tint or the wood-like stripes. Clothes have their own opaque, relaxed
surface. Hair, glasses and the cap are attached to the moving head; the cap's
lettering is authored geometry.

## Geometry and provenance

The body, hands, face, eyes and facial expression data come from the CC0
MakeHuman system assets exported by Kasper Olesen's CharacterCreator at commit
`852e48f316b90a0937234886630e4fb4cdfd1f78`. The local asset was copied on
2 November 2026 from the installed FORM/MUSE skill's general morphable source.
Its source filename was `adult-female-source.glb`; it contains general body,
gender and childhood targets rather than a fixed, baked female identity.

The application stores the mesh in
[`public/assets/characters/human-base.glb`](../../public/assets/characters/human-base.glb)
and corresponding joint adjustments in
[`body-joints.json`](../../public/assets/characters/body-joints.json). The
independent adapter in `src/subjects/campfire/character-rig.js` bakes two
identities and adjusts their joint centres. A childhood morph is an artistic
control, not a measurement of chronological age. Procedural clothes inherit the
body's skin weights; the head accessories are authored for this book.

The asset permission and source evidence are retained beside the files:

- [`README.md`](../../public/assets/characters/README.md): local source and use.
- [`CharacterCreator-LICENSE-NOTES.md`](../../public/assets/characters/CharacterCreator-LICENSE-NOTES.md): generated-asset permission, distinct from the generator's code license.
- [`MakeHuman-asset-licenses.json`](../../public/assets/characters/MakeHuman-asset-licenses.json), [`source-audit.json`](../../public/assets/characters/source-audit.json) and [`CC0-MakeHuman.txt`](../../public/assets/characters/CC0-MakeHuman.txt): source inventory, pinned provenance and CC0 dedication.

No CharacterCreator generator or runtime code is included. The book uses its
exported asset data with an independently written Three.js adapter.

## Implementation and review scope

`characters.js` reconstructs seated bone poses, inverse-kinematic limb targets
and facial expressions from the five-second figure clock. `accessories.js`
provides the braids, fringe, glasses and cap. The head frames also carry the
moving explanatory anchor. Both editions use the same figures and retain the
existing book text, reader controls, narration and white stage.

The review covers plates I, IV and VI at normal book size and in full-body,
front, three-quarter, profile and individual-hand close-ups, including poses at
0, 1.1, 2.5, 4.3 and 5 seconds and sampled live playback. It also covers posed
picking and SVG export, because a skinned mesh's current silhouette can differ
from its rest bounds.

## Completed review

On 2 November 2026 the production preview on port 4173 produced 168 review
frames, with no browser errors or nonfinite sampled posed vertices. The initial
and final loop-pose mean-coordinate checks differed by at most `4.22e-11` in
figure coordinates. Separate live playback sampled a complete model-clock cycle
over 16.4 seconds of elapsed browser time, reflecting the reader's slower caption
pacing. Hand-triangle raycasts succeeded before SVG export and after changing
the pose; the export's temporary tight bounds did not remain in the way of
picking. The rendered native SVG retained the daughter's green shirt as a
distinct colour from her skin.

Representative portraits, bodies, hands and book views were inspected directly.
That review found small shirt/waist openings and hovering feet in plate IV.
After the repairs and a new production build, a targeted pass captured 99 frames
across all three character plates at 0, 1.1 and 2.5 seconds. Inspection confirmed
that the father's chest slivers and daughter's waist opening were closed and
that the plate IV shoes met the page. The targeted pass reported no browser or
finite-vertex errors. The complete loop/playback/export audit was not repeated
for those final clothing and foot-placement corrections.

A subsequent placement review found that the plate IV log intersected one calf.
After moving the seated character forward, five additional frames showed the
front, three-quarter and both profile views. Both calves cleared the log, the
pelvis remained seated on its upper surface, and the shoes met the page.

Reproduction and local evidence: `.scratch/character-revision/review-characters.mjs`,
`final-review/`, `final-playback/`, `repaired-review/` and `heat-seat-review/` in the same scratch
directory. The image count records captured evidence; it does not claim that
every frame was independently inspected by a person.
