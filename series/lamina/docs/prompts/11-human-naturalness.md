# Natural hands, contact and hair

## User request

> la mano izquierd ay palma de la mano no se ven naturales y la mano de la hija se ve no terminada. el cabello de la ninqa debe ser mas natural y bonito, menos de plastico. Los humanos mas realistas y humanos, sin errores en manos o faltas o incrustadas en lugares raros

The two screenshots show a high view of the family and the daughter's heat
study. The supporting hand visibly disappears into the trousers, leaving
apparently detached fingertips. The raised palms and smooth hair dome also
need a more natural treatment.

## What the earlier review missed

The previous finite-vertex, loop and picking checks established that the model
rendered and responded correctly. They did not establish anatomical quality or
contact with clothing. The previous visual conclusion is superseded by these
screenshots and the closer investigation below.

An independent probe of actual posed, indexed skin and upper-thigh triangles
found up to 32.46 mm of penetration for the daughter's supporting hand and
16.18 mm for the father's on the beach. In the flat heat study, the daughter's
hand instead hovered about 30.34 mm above the cloth. All hand triangles and five
digits were present; the apparent missing geometry was occluded by clothing.
The static wrist target did not follow the terrain-dependent knee position.
Distances are in the rig's approximate metre scale before book magnification.

## Implementation and review

The supporting wrist now follows the posed thigh surface and slope. A cached
contact fit samples the complete hand against actual garment geometry, rather
than relying on wrist height alone. Each finger has its own local anatomical
flexion and spreading axes; thumb opposition is separate from distal flexion.
The conversational gestures preserve a quiet wrist and distinguish a relaxed
explanation from the daughter's questioning index finger. The bind hand already
has curvature: the final gestures add only mild flexion at the middle and distal
joints, avoiding the earlier claw silhouette. Hand-weighted texture detail keeps
the child's palm creases readable without restoring coarse adult skin detail
across her face.

Hair is authored as layered directional locks, a fine part, a curved irregular
fringe, woven braids and tapered ends. Materials follow strand direction and
use restrained roughness variation. The child's skin texture and eyebrows are
softer, with lip pigment retained and a small relaxed eyelid baseline. The
father's glasses and black **Head** cap remain part of his identity.

`scripts/character-contact-test.mjs` is a separate browser regression test
(`npm run test:characters`, with `LAMINA_URL` selecting the running server).
It independently checks posed skin against rendered upper-thigh triangles,
five digit regions, connected skin, penetration and excessive gaps. It was
verified to fail on the rejected build. It does not claim to measure beauty
or realistic anatomy; enlarged visual review remains necessary.

## Final verification

The production build, `npm test` and all 25 browser contact regression checks
pass. Content validation has no errors and the same three unrelated warnings.
All six figures pass WebGPU and WebGL audits, including all 93 runtime Spanish
strings. The actual WebGL reader was also captured without browser errors.

An independent production sweep recorded 110 hand measurements and 129 frames
across plates I, IV and VI. All 55 supporting-hand samples clear the cloth;
strict palm gaps range from 3.21 to 8.70 mm. The reviewer inspected 27
representative frames rather than treating the full capture count as a manual
review. Father and daughter have continuous visible supporting fingers, and
raised palms read coherently in side and palm views. High/front views still
foreshorten digits. These results supersede the earlier hand-contact assessment,
without claiming photorealism or that automated tests can judge naturalness.

Actual posed-vertex checks on all three plates agree between zero and five
seconds within `5.81e-12` in the mean-coordinate check. A 20-sample live playback
run crossed a complete loop in 15.5 seconds of wall time. Picking succeeds before
SVG export and after changing pose; no stale export bounds or browser errors
were found. Evidence is in `final-production-fixed/`, `final-motion/`, the backend
audits and the hair attachment/material review folders under
`.scratch/human-naturalness/`.

The isolated source-texture diagnostic in `.scratch/hand-revision/exact-current/`
confirmed that excessive curling could turn real nail plates toward a high
camera even with correct anatomical flexion axes. Earlier direct-reader
material-mutation controls used a duplicate TSL module and captured stale
frames; those controls were withdrawn and are not verification evidence.

The complete Campfire output set was refreshed in both editions: 38 PNGs and
24 native colour/line SVGs. The three affected Spanish figure exports were
rendered for review. Other volumes' manifest records and capture dates were
retained.
