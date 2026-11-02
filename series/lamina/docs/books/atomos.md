# Atoms / Átomos

Volume IV adds six interactive explanations to the Lámina series. English:
`#/en/atomos`; Spanish: `#/es/atomos`. Both editions share six physical spreads,
figure state and author marks. The narration reads only the current left page.

The requested teaching voice is curious, concrete and based on reasoning from
simple examples. The prose is original and does not claim to be a named
scientist. Each spread asks the reader to test an idea: interpret a cloud,
count a nucleus, distinguish two kinds of bond, watch neighbours move, compare
connectivity, or follow energy into light.

| Plate | Question | Model and interaction |
|---|---|---|
| I. Where Is the Electron? | What does an electron cloud mean? | 2,400 fixed hydrogen 1s probability samples; a gold scan highlights stationary points; a separate inset repeats the single proton. |
| II. Count the Protons | What defines an element? | Hydrogen-1, hydrogen-2 and helium-4 nuclei; toggle/count protons and neutrons. |
| III. A Bent Little Molecule | What changes when water evaporates? | Two polished bent water models with partial-charge signs and angle guides; inspect covalent rods separately from the dotted attraction. |
| IV. The Crowd Is Moving | Why can a liquid flow? | 36 equal-size particles per state in open-front vessels; compare lattice vibration, neighbour exchange and a larger gas volume. |
| V. Same Carbon, New World | Can identical ingredients behave differently? | A faceted crystal and fractured graphite flakes below enlarged diamond-cubic and hexagonal networks; separate sheets and hide connectivity. |
| VI. An Atom Sends a Message | Where does emitted light get its energy? | A separate energy-state chart beside a lamp, collimator, dispersing prism and spectrum screen; follow one symbolic photon path. |

## Science and primary teaching sources

- [MIT 5.111SC, Lecture 6: Hydrogen Atom Wavefunctions](https://ocw.mit.edu/courses/5-111sc-principles-of-chemical-science-fall-2014/pages/unit-i-the-atom/lecture-6-hydrogen-atom-wavefunctions-orbitals/): orbital interpretation and hydrogen ground-state shape. The cloud is a stationary sample from probability density, never a classical trajectory.
- [DOE Explains…Nuclei](https://www.energy.gov/science/doe-explainsnuclei): nucleus versus atomic size and mass; charged protons and neutral neutrons. The central proton and its repeated inset are deliberately enlarged.
- [DOE Explains…Isotopes](https://www.energy.gov/science/doe-explainsisotopes) and [National Isotope Development Center: Isotope Basics](https://isotopes.gov/isotope-basics): proton count defines the element; neutron count distinguishes isotopes. The nuclei are comparisons, not fusion animations.
- [ACS Lesson 5.1: Water is a Polar Molecule](https://www.acs.org/middleschoolchemistry/lessonplans/chapter5/lesson1.html) and [OpenStax Chemistry 2e §7.6](https://openstax.org/books/chemistry-2e/pages/7-6-molecular-structure-and-polarity): molecular shape, unequal electron sharing, neutral overall charge, and the distinction between intra- and intermolecular bonding.
- [ACS Chapter 1: Solids, Liquids, and Gases](https://www.acs.org/middleschoolchemistry/lessonplans/chapter1.html) and [Inquiry in Action](https://www.acs.org/content/dam/acsorg/education/resources/k-8/inquiryinaction/inquiry-in-action.pdf): motion, neighbouring particles, energy and phase changes. The paths are an explicit teaching schematic, not a collision simulation.
- [Open University: Covalent Structures and Bonding](https://www.open.edu/openlearn/mod/oucontent/view.php?id=20276&section=4.3) and [OpenStax Chemistry §10.5](https://openstax.org/books/chemistry/pages/10-5-the-solid-state-of-matter): diamond and graphite connectivity. Fragment boundaries omit further neighbours; the model does not transform one allotrope into another.
- [NIST Atomic Spectroscopy Databases](https://www.nist.gov/pml/atomic-spectroscopy-databases) and [Basic Atomic Spectroscopic Data Handbook](https://www.nist.gov/pml/handbook-basic-atomic-spectroscopic-data/basic-atomic-spectroscopic-data-handbook): spectral lines and atomic energy transitions. The three displayed levels are generic, not numerical data for a particular element.

- [Purdue University, Atomic Spectra](https://chemed.chem.purdue.edu/genchem/history/balmer.html): a discharge source and prism reveal separated emission lines. The illustrated instrument, three generic lines and energy bars are a teaching schematic, not a numerical spectrum of hydrogen. One moving pulse follows one path; the screen depicts accumulated emission events.

- [OpenStax College Physics 2e, §25.5](https://openstax.org/books/college-physics-2e/pages/25-5-dispersion-the-rainbow-and-prisms): ordinary prism dispersion bends shorter visible wavelengths more than longer ones. The blue ray therefore deflects more than red toward the prism base.

Sources checked 2 November 2026. The book supplies original explanations rather
than copied passages. The model scope is also printed beside each figure.

## Model details and checks

The hydrogen cloud samples radius from Gamma(shape=3, scale=a0/2), with uniform
solid angle, matching the 1s radial probability proportional to
`r² exp(-2r/a0)`. It uses a seeded generator; samples beyond the display radius
are omitted. This is an intentionally cropped spatial sample, not a hard
physical boundary. The cloud does not rotate or orbit in its animation. A gold selection band moves through fixed samples to make the density readable; it does not move electron positions. The magnified copper inset repeats the single central proton, rather than adding a second nucleus.

Water has a 104.5° bond angle. Diamond uses nearest neighbours in a
face-centred-cubic lattice with a quarter-cell offset. Graphite uses seven fused hexagons with shared
vertices in each of three layers. The pale faceted specimen and dark fractured
flakes are separate macroscopic representations, not the atomic networks
drawn at the same scale. All animations are functions of absolute
loop time and return to their initial pose at five model seconds. Visible
caption pacing can slow that teaching clock.

The English plate bodies contain 170–184 words; the Spanish bodies 165–188.
`composeEdition()` reports no missing, extra, altered-ID, order, length, type
or unknown fields. Six figure contract checks verify finite transforms at
multiple times and explosion levels and a periodic endpoint within 1e-8.
Browser captures, exports and integration results are recorded in
[verification.md](../verification.md). See the [English](../outputs/en/atomos/)
and [Spanish](../outputs/es/atomos/) output folders.

## Editable sources

- `src/books/atomos.js` and `src/books/es/atomos.js`
- `src/subjects/atoms/index.js`
- `src/i18n/es/atoms.js`

Generation brief: add a bilingual interactive book titled **Atoms — The
Invisible Building Blocks**, explaining how the same tiny components produce
different everyday things through different arrangements. Keep the existing
series format, author's cover marks, left-page narration, language switch,
and a final page documenting the prompt. The six chapters expand that brief
through observation, an explicit question, an inspectable model and a
carefully bounded explanation.


## Visual refinement

The six figures now use muted copper, ceramic, graphite and optical finishes,
subtle procedural surface grain and fine contours. Probability samples cast no
physical shadows. The crystal has a closed faceted surface and visible point;
graphite has irregular thin layers and fine striations. Partial-charge symbols
and a 104.5-degree angular guide accompany water. Open-front vessels lift away
in the exploded state. The spectroscopy instrument separates optical hardware
from the abstract energy diagram; blue deflects more than red toward the prism
base. Its apparatus dimensions, ray angles and three line colours are schematic.

Scientific checks during refinement verify the water angle, isotope counts,
threefold graphite coordination, fourfold tetrahedral diamond coordination,
36 particles in every state, gas containment with particle-radius clearance,
finite poses and exact five-second endpoint repetition. Independent review
confirmed the cropped hydrogen 1s distribution and carbon topology. Reader
previews at 1600 × 1000, both normal and exploded, are in
`.scratch/refinement/atoms-final/atomos/`; browser errors were empty. Production
backend audits and final exports are recorded in the shared verification log.
