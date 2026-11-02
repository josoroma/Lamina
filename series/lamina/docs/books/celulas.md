# Cells / Células

Volume V of Lámina: **The Tiny Machines of Life / Las pequeñas máquinas de la vida**.
An original, conversational explanation that proceeds from a concrete puzzle to
an inspectable mechanism. It uses the factory metaphor while explicitly
removing workers, intention and a foreman from the actual explanation.

Routes: `#/en/celulas` and `#/es/celulas`. Both editions have six plates,
introduction, controls, afterword, glossary, sources and colophon. Josoroma's
wordmark appears on both boards. The final pages record the original prompt
and this book’s brief. Each ordinary left page participates in the shared Chatterbox
narration, and every figure supports rotation, labels, layers and separation.

| Plate | Question and model | Labels |
|---|---|---|
| I · An organised drop / Una gota organizada | Why is a cell different from a puddle? Open animal-cell shell, nucleus, folded membranes, mitochondria and small assemblies. | membrane, nucleus, ribosome |
| II · A border with doorways / Una frontera con puertas | How can a boundary be selective? Two phospholipid leaflets with an open channel. | head, tails, channel |
| III · From message to machine / Del mensaje a la máquina | How does stored sequence become useful machinery? DNA, RNA message, ribosome and protein chain. | dna, rna, ribosome, protein |
| IV · A tiny energy converter / Un convertidor diminuto | What difference drives the motor? Cutaway mitochondrion beside an enlarged ATP synthase. | cristae, gradient, synthase |
| V · Sunlight becomes chemistry / La luz se vuelve química | Which input is matter and which is energy? Open chloroplast, thylakoid stacks and symbolic light pulses. | thylakoid, stroma, light |
| VI · One becomes two / Una se convierte en dos | How do copies get shared? Animal-cell constriction, spindle and a few chromosome pairs. | chromosomes, spindle, furrow |

## Sources and scope

Sources were opened and checked on 2026-11-02. The prose is original; no source
passages are copied. Chapter URLs provide detailed mechanisms behind the short
printed citations.

- [NHGRI: Cell](https://www.genome.gov/genetics-glossary/Cell): cell as basic unit;
  eukaryotes have a membrane-bound nucleus whereas prokaryotes do not; bodies
  contain trillions of cells. No single exact body-cell count is asserted.
- [OpenStax/Rice, Biology 2e §4.3](https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells):
  membranes, compartments, ribosomes and the contrast between animal and plant
  cells. The selected animal cell is illustrative, not a universal cell.
- [§5.1](https://openstax.org/books/biology-2e/pages/5-1-components-and-structure)
  and [§5.2](https://openstax.org/books/biology-2e/pages/5-2-passive-transport):
  phospholipid bilayers, head/tail properties, membrane fluidity and selective
  routes. A channel is distinguished from a pump; ion transport is described
  in terms of an electrochemical gradient, not concentration alone.
- [NHGRI: Transcription](https://www.genome.gov/genetics-glossary/Transcription),
  [Translation](https://www.genome.gov/genetics-glossary/Translation) and
  [OpenStax §15.5](https://openstax.org/books/biology-2e/pages/15-5-ribosomes-and-protein-synthesis):
  DNA-template transcription, messenger RNA, transfer RNA, ribosomes and amino
  acid chains. DNA does not turn into protein; not all genes encode proteins.
- [§7.4](https://openstax.org/books/biology-2e/pages/7-4-oxidative-phosphorylation)
  and [§6.4](https://openstax.org/books/biology-2e/pages/6-4-atp-adenosine-triphosphate):
  respiratory electron transport, proton pumping, oxygen as final electron
  acceptor, ATP synthase and energy coupling. The text explicitly says that
  bond breaking by itself costs energy; ATP hydrolysis can supply free energy
  through the overall reaction under cellular conditions.
- [§8.2](https://openstax.org/books/biology-2e/pages/8-2-the-light-dependent-reactions-of-photosynthesis)
  and [§8.3](https://openstax.org/books/biology-2e/pages/8-3-using-light-energy-to-make-organic-molecules):
  thylakoid light reactions, ATP/NADPH, water as source of released oxygen,
  carbon dioxide as the carbon source, Calvin cycle in the stroma. Plants
  respire as well as photosynthesise; roots are not silently photosynthesising.
- [§10.2](https://openstax.org/books/biology-2e/pages/10-2-the-cell-cycle)
  and [§9.1](https://openstax.org/books/biology-2e/pages/9-1-signaling-molecules-and-cellular-receptors):
  DNA replication before mitosis, separation, animal cytokinesis, cell-cycle
  regulation, and molecular signalling. Mitosis is distinguished from gamete
  production. The animation return is labelled a replay, not reverse biology.

The geometric models are schematic illustrations. Colour, scale, motion and
relative dimensions are deliberately changed and disclosed in the printed
scale notes and afterword. They do not simulate molecular dynamics, measured
flux, a particular protein structure or disease. The ATP motor is strongly
enlarged relative to the mitochondrion; DNA and the ribosome are not on one
physical scale. A small chromosome count keeps the division readable. These
limits are part of the explanation, not hidden in a technical setting.

## Files and validation

- `src/books/celulas.js` and `src/books/es/celulas.js`: six matching editions.
- `src/subjects/cells/index.js`: deterministic procedural models and contract.
- `src/i18n/es/cells.js`: runtime labels, descriptions, layer names and titles.

The first composition check reported no missing or extra fields, changed IDs,
list-length differences, unknown keys or ordering differences. English body
lengths are 169–187 words per plate. Shared validation and browser results are
recorded by the integration pass in `docs/verification.md`.

## Illustration revision · 2026-11-02

All six figures were rebuilt as organic, microscopy-inspired teaching plates.
Their colours are an editorial palette, not microscope staining or measured
surface properties. Soft surface noise, undulating edges, depth and overlapping
membrane sheets replace the earlier ellipsoids and rods. Repeated lipids,
pores, ribosomes, filaments and small particles are batched by material; no
blanket black outline is applied to every component.

- **Organisation:** an opened double boundary surrounds a nucleus with surface
  pore marks, chromatin and nucleolus; rough ER has broad cisternae and attached
  ribosome marks; curved Golgi sacs and small vesicles sit apart from mitochondria.
- **Selective membrane:** two rippled, gently staggered phospholipid leaflets
  surround a lobed channel with a narrow filter. Heads and kinked tails stay
  connected. This invented channel is not a named protein or an atomic model;
  the fivefold arrangement is an illustrative choice, not a universal channel.
- **Protein synthesis:** complementary DNA rungs, a small transcription complex,
  a coloured RNA sequence, a lobed two-subunit ribosome, transfer-RNA-like L
  shapes and a connected nascent peptide form a continuous reading route.
  The DNA scaffold follows the right-handed B-form convention, as described
  by [NLM MeSH](https://www.ncbi.nlm.nih.gov/mesh/68059371); it is not an atomic
  structure or a groove-accurate model. Sequence colours do not encode a specific gene. The chain's slow extension
  and tRNA motion are schematic; elongation is not simulated residue by residue.
- **Energy coupling:** the raised diagonal mitochondrion has two boundary edges
  and curved inner folds. The enlarged ATP synthase has a rotating ring/shaft
  and a stationary catalytic head and peripheral stalk. Separate small ATP
  symbols do not form a polymer. The enlarged patch puts intermembrane space
  below and matrix above; the proton marker travels upwards, fades, and replays.
- **Photosynthesis:** rippled thylakoid sacs form grana connected by broad
  lamellae; stroma contains illustrative starch, DNA-loop and enzyme marks.
  Light pulses follow symbolic paths into the thylakoids, then disappear before
  replay. Neither photon speed nor granum stoichiometry is represented.
- **Division:** a volumetric cutaway constricts into two bulging compartments.
  Centriolar poles, curved spindle bundles, astral microtubules, a cortical
  contractile belt and selected chromosome copies make the separation readable.
  The late-anaphase/cytokinesis sequence is compressed; membrane closure and
  daughter-nuclear-envelope reassembly are omitted. The return is a replay.

The structural claims were rechecked against OpenStax §§4.3, 7.4, 15.5 and 10.2
above. The new shapes remain original procedural illustrations; no experimental
protein coordinates, electron micrographs or measured time series were used.
Separating layers is an inspection aid, not a physical disassembly process.

Implementation is split between `subjects/cells/model.js` (sculpted surfaces,
material cache and batching), `scenes.js` (six mechanisms) and `index.js` (shared
figure contract). Each scene uses 25–68 ordinary meshes and approximately
54,000–163,000 triangles. Timed geometry is derived from absolute loop time;
spindle shortening uses affine mesh transforms, while the cell boundary alone
requires nonlinear deformation. Shared layers, labels, SVG representative
colours, live translations, and five-second replay are preserved.

Revision verification: all six figures passed the browser contract audit on
WebGPU (Spanish lab) and WebGL (English lab), with no shader/console errors,
seamless replay, all 74 runtime strings translated, and every measured label
within 110 px. The most expensive update, division, measured 1.1–1.7 ms after
spindle-transform optimisation; these are local browser samples, not a device
performance guarantee. English and Spanish manifest validation passed with
zero errors. A direct geometry check confirmed finite vertices, SVG colour
metadata, identical loop endpoints and exact separation/reassembly transforms.
All six reader-size normal and separated states were captured and visually
reviewed; the membrane's separated channel was moved towards the viewer to
keep it clear of the lipid layer. Evidence is in `.scratch/cells/redesign-*`.
