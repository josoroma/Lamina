# Campfire character geometry

The continuous human body, hands, face, eyes and facial accessories in
`human-base.glb` are CC0 MakeHuman system data, exported by Kasper Olesen's
CharacterCreator at commit `852e48f316b90a0937234886630e4fb4cdfd1f78`.
The asset was copied from the locally installed FORM/MUSE skill asset on
2026-11-02. It contains a general body base, gender/age/proportion targets,
joint-aware weights and the official MakeHuman Face Units 01 expression data.
The filename of the local source was `adult-female-source.glb`; its geometry
was not pre-baked to that viewer's fixed female identity.

Sources and permission evidence:

- [Pinned asset repository](https://github.com/kblood/CharacterCreator/tree/852e48f316b90a0937234886630e4fb4cdfd1f78).
- `CharacterCreator-LICENSE-NOTES.md`: explicit CC0 permission for generated
  body, morph, texture and JSON files when their inputs are CC0.
- `MakeHuman-asset-licenses.json`, `source-audit.json` and `CC0-MakeHuman.txt`:
  source inventory, pinned provenance and public-domain dedication.
- [Official Face Units 01 pack](https://static.makehumancommunity.org/assets/assetpacks/faceunits01.html).

CharacterCreator generator/runtime code has a separate GPL license and is not
included or used here. `src/subjects/campfire/character-rig.js` is an independently
written glTF-data adapter. It bakes two illustrative identities, fits the joint
centres using `body-joints.json`, and makes opaque relaxed clothing from the
same weighted surface. The girl uses a childhood morph and a modest child
silhouette; the numerical morph weight does not measure a person's exact age.
The characters interpret the user's written description, not scans or exact
digital doubles of the family.
