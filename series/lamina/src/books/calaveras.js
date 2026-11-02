// Book manifest: "Calaveras — Drawing Skulls: A Constructive Method".
//
// Why this file exists: it is the whole text of the drawing book as data
// (CONTRACTS §6). The typesetter turns it into pages, the FigureHost mounts
// each lesson's skull figure (CONTRACTS §12 III — params verbatim), and the
// UI reads titles and beats from it. Every lesson uses layout 'lesson' and
// follows the same constructive order: big shapes → guides → planes → details.
//
// Accuracy: every number here is traceable to a published source; the
// per-fact audit trail (URLs, method notes, open questions) lives in
// docs/books/calaveras-research.md. Craniometric values are summaries of the
// Howells data set (2,524 crania, 30 populations). Skull and living-head
// proportions are kept apart on purpose (the eye line is a living-head
// canon; the bony bridge between the orbits is a skull measurement).
//
// Density: a lesson verso carries the title band, three drawn construction
// panels and a notes grid on one page, so lessons sit near the lower text
// budgets (body ≈ 125 words, 4 facts, 2 look-closer notes, 2 mistakes).
//
// Taxonomy: lesson VI keeps the frozen figure param
// `species: 'bothriechis-schlegelii'` (a figure id), but the text uses the
// current name for Costa Rican eyelash-pitvipers, Bothriechis nigroadspersus
// (revalidated by Arteaga et al. 2024; upheld by Reyes-Velasco 2024).
//
// Steps and beats describe what the reader actually sees: each lesson's three
// steps follow the panels drawn by the skulls module's drawStep, and each
// beat matches the figure's pose at that loop time (the Reader prints these
// beats instead of the figure's own). Revised 2026-11-01 after two
// independent fact-checks; see "Fact-check log" in the research notes.

export default {
  id: 'calaveras',
  title: 'Skulls',
  subtitle: 'Drawing Skulls: A Constructive Method',
  kicker: 'Lámina · Volume III',
  author: 'Lámina Natural History Press',
  byline: { name: 'Josoroma', mark: 'josoroma' }, // the author, foil-stamped on both boards
  edition: 'First edition, 2026',
  locale: 'en',
  theme: {
    style: 'engraving',
    cloth: '#151515',
    foil: '#dcdcd8',
    paper: '#ffffff',
    ink: '#111111',
    accent: '#e34234',
    muted: '#76736f',
    endpaper: { motif: 'grid', color: '#e34234', ground: '#ffffff' },
    fonts: { display: 'Oswald', body: 'EB Garamond', label: 'IBM Plex Sans Condensed', mono: 'IBM Plex Mono' },
  },

  intro: {
    title: 'Why Draw the Skull',
    paragraphs: [
      'Every face you will ever draw is carried by a skull. Over the brow, the bridge of the nose and the cheekbones the covering is thin, and the bone shows through as planes, edges and turns; elsewhere it hides, but it still decides where every feature can go. Learn the skull and a portrait stops being a list of features. It becomes a structure you can turn in your mind and see from any side.',
      'This book teaches a constructive method, in the same three stages for every view. First the big shapes: a sphere for the braincase with a centre line through it, a tapering block for the face. Then the guides: the few level lines that carry the brow, the nose and the bite, and the jaw’s taper. Last, the details—sockets, aperture, teeth—cut into the planes where front turns to side. Each figure is a working model with a five-second loop—build it from construction lines, turn it, open the jaw, take it apart.',
      'Six lessons follow: the skull from the front, in three-quarter view with the jaw open, and in profile; then its twenty-two bones. The last two turn to Costa Rica’s forests: the skull of the jaguar, the largest cat of the Americas, and a human skull entwined by a Central American eyelash-pitviper.',
    ],
    pullQuote: 'Draw the skull until you can see it through every face.',
  },

  howTo: {
    title: 'How to Use This Book',
    items: [
      ['Drag a page corner', 'Lift and turn the leaf, as you would paper'],
      // The Reader turns on a tap anywhere on a page (not only its edge); an upright screen
      // (phone or tablet, not a landscape phone) frames one page, and there a tap reads on.
      ['Click or tap a page', 'Forward on the right-hand page, back on the left; when one page fills the\u00a0screen, a tap reads on'],
      ['Swipe', 'Turn pages on a touch screen'],
      ['Arrow keys', 'Turn the pages from the keyboard'],
      ['Drag the figure', 'Rotate the skull on its turntable'],
      ['Double-click the figure', 'Inspect it up close'],
      ['Layers', 'From the toolbar, show or hide construction, bones, muscles, engraving'],
      ['Explode', 'From the toolbar, separate the bones along their sutures'],
      ['Labels', 'From the toolbar, name the bones and landmarks'],
      ['Export SVG', 'Save any figure as colour or line art'],
      ['Play or pause', 'Run or hold the five-second lesson; scrub to any moment'],
    ],
  },

  plates: [
    // ------------------------------------------------------------------ I
    {
      id: 'frontal',
      number: 'I',
      layout: 'lesson',
      common: 'Frontal View',
      commonAlt: 'Vista frontal',
      scientific: 'Cranium & mandible',
      authority: '',
      family: 'Human skull · norma frontalis',
      status: null,
      badge: 'Lesson 1 · Beginner',
      lede: 'Every portrait begins here: a sphere, a centre line, a mirror.',
      body: [
        'Seen from the front, the skull is an oval, wider above than below: a broad dome of braincase over a narrower face. Draw the dome as a circle and drop a centre line through it, past the chin. That line is your mirror. Three level guides carry the rest—brow, base of the nose, bite.',
        'Then cut the sockets: rounded squares, a little wider than tall, with a bony bridge between them only about half an orbit wide—narrower than the gap between the eyes of the living face, where they sit about an eye-width apart. Hang the pear-shaped nasal aperture below the nasal bones, narrow end up; keep the jaw angles inside the cheekbones; and mark the turn of the planes at the outer orbit rims.',
      ],
      facts: [
        ['Skull width', 'about 13–14 cm'],
        ['Orbit, width × height', 'about 4 × 3.4 cm'],
        ['Bone between the orbits', 'about 2 cm'],
        ['Eye line, living head', 'near half, crown to chin'],
      ],
      lookCloser: [
        { label: 'orbit', text: 'A rounded square, wider than tall—rarely a circle.' },
        { label: 'nasal-aperture', name: 'Piriform aperture', text: 'A pear, narrow end up; below the nasal bones the nose was cartilage.' },
      ],
      didYouKnow: 'CT scans of 375 adults put the living eye high and outward in its socket.',
      figure: {
        type: 'skull',
        params: { subject: 'human', lesson: 'frontal' },
        caption: 'Fig. 1 — Human skull, frontal view: from construction sphere to engraved bone.',
        scaleNote: 'Adult skull, about 13–14 cm wide',
      },
      animation: {
        title: 'From sphere to bone',
        beats: [
          [0, 'A sphere and a centre line: the braincase and its symmetry.'],
          [1.25, 'Level guides cross the centre line; the jaw tapers to the chin.'],
          [2.5, 'The orbits and nasal aperture are cut into the planes.'],
          [3.75, 'Engraved line takes over, and the drawing becomes bone.'],
        ],
      },
      lesson: {
        steps: [
          { title: 'Sphere and centre line', text: 'Draw a circle for the braincase, larger than feels right. Drop a centre line through it and on past where the chin will be: your mirror.' },
          { title: 'Guides and jaw taper', text: 'Cross the ball’s lower half with brow and eye lines; below it rule nose, bite and chin lines. Mark the side planes, then taper the jaw from cheekbones through jaw angles to chin.' },
          { title: 'Sockets, aperture, contour', text: 'Cut two orbits half an orbit apart, hang the nasal aperture narrow end up, then refine temples, cheekbones and jaw.' },
        ],
        proTip: 'Measure with the orbit: the bony bridge is half an orbit wide, the aperture two-thirds.',
        mistakes: [
          'Round, staring orbits. They are rounded squares, a little wider than tall.',
          'A face wider than the braincase. From the front, the cranium is usually wider.',
        ],
        proportions: [
          'Orbits: six units wide for five high.',
          'Jaw angles: three-quarters of cheekbone width.',
          'Living head: eye line near half the height.',
        ],
      },
      sources: ['Gray 1918', 'Howells 1973', 'Mussabekova et al. 2024', 'Karaca Saygili et al. 2016', 'Guyomarc’h et al. 2012'],
    },

    // ------------------------------------------------------------------ II
    {
      id: 'open-jaw',
      number: 'II',
      layout: 'lesson',
      common: 'Three-Quarter, Open Jaw',
      commonAlt: 'Tres cuartos, mandíbula abierta',
      scientific: 'Temporomandibular joint',
      authority: '',
      family: 'Human skull · oblique view',
      status: null,
      badge: 'Lesson 2 · Intermediate',
      lede: 'Open the jaw: the hinge sits in front of the ear, not at the corner.',
      body: [
        'Turn the skull until the far cheekbone becomes the edge of the face. The centre line now curves around the form and everything beyond it shrinks: the far orbit narrows behind the nasal bridge, while the near cheekbone shows its whole arch. Wrap the three guides around the form as gentle, parallel arcs.',
        'Now open the mouth. The mandible hinges at its condyle, in a socket just in front of the ear canal. At first it mostly rotates, already beginning to slide; as the gape widens the condyle glides forward onto the ridge ahead of the socket. The chin swings down and back; only the joint moves forward. The temporalis, gripping the coronoid process, and the masseter, slung from the cheekbone arch to the jaw’s angle, pull it shut.',
      ],
      facts: [
        ['Hinge', 'condyle, in front of ear canal'],
        ['Early opening', 'mostly rotation, some glide'],
        ['Maximum gape', 'about 49 mm at the incisors'],
        ['Jaw closers', 'masseter, temporalis, medial pterygoid'],
      ],
      lookCloser: [
        { label: 'condyle', text: 'Rotates and glides at once; the glide grows as the jaw opens wide.' },
        { label: 'coronoid', name: 'Coronoid process', text: 'Hidden under the arch; the temporalis grips it.' },
      ],
      didYouKnow: 'A healthy jaw opens about three finger-widths: 48.8 mm on average in 140 adults.',
      figure: {
        type: 'skull',
        params: { subject: 'human', lesson: 'open-jaw' },
        caption: 'Fig. 2 — Three-quarter view; the mandible opens about the temporomandibular joint.',
        scaleNote: 'Adult skull; full gape about 5 cm at the incisors',
      },
      animation: {
        title: 'Hinge and glide',
        beats: [
          [0, 'Teeth together; the condyle rests in its socket.'],
          [1.25, 'Opening: the condyle mostly rotates, already starting to glide.'],
          [2.5, 'Wide open: the condyle has glided onto the ridge ahead of its socket.'],
          [3.75, 'Closing: the masseter and temporalis draw the jaw back up.'],
        ],
      },
      lesson: {
        steps: [
          { title: 'Ball and hinge point', text: 'Work it out in profile first. Draw the braincase circle on a level ear line, dot the hinge just in front of the ear canal, and hang the face-and-jaw wedge from it.' },
          { title: 'Swing the jaw open', text: 'Swing the jaw wedge open about the hinge: the chin travels down and back along an arc. For a wide gape, also slide the hinge forward and down, onto the ridge in front of its socket.' },
          { title: 'Refine the open skull', text: 'Refine cranium, cheekbone arch, orbit and nasal notch, then the ramus, coronoid and both rows of teeth, the lower row tilted with the jaw.' },
        ],
        proTip: 'Draw the jaw closed, then rotate it open about the condyle while sliding the condyle forward onto the ridge ahead of its socket—never hinge it at the corner.',
        mistakes: [
          'Hinging the jaw at its corner. The joint sits just in front of the ear.',
          'Opening by rotation alone. A wide gape also slides the condyles forward.',
        ],
        proportions: [
          'Jaw joint: just ahead of the ear canal.',
          'Healthy gape: about 5 cm at the incisors.',
        ],
      },
      sources: ['Betts et al. 2022 (OpenStax)', 'Lindauer et al. 1995', 'Zawawi et al. 2003'],
    },

    // ------------------------------------------------------------------ III
    {
      id: 'profile',
      number: 'III',
      layout: 'lesson',
      common: 'Profile',
      commonAlt: 'Perfil',
      scientific: 'Cranial proportions',
      authority: '',
      family: 'Human skull · norma lateralis',
      status: null,
      badge: 'Lesson 3 · Intermediate',
      lede: 'A ball, a wedge, and one level line from ear to orbit.',
      body: [
        'Draw the braincase as a circle, stretched a little: from brow to back the skull runs about four units for every three of height. Hang the face from its front as a wedge, point at the chin. Then set the horizon—the Frankfort plane, from the top of the ear canal to the lowest point of the orbit rim. Keep it level and the skull sits much as it does in life.',
        'Hang the landmarks on that line: the ear canal just behind the jaw joint, the cheekbone arch running forward almost level, the mastoid behind and below. Extended backwards, the line passes close to the bump on the back of the skull. And remember what bone lacks: below the nasal bones, the nose and the outer ears are cartilage, added only in the living profile.',
      ],
      facts: [
        ['Skull length', 'about 17.5–18.5 cm'],
        ['Braincase, length : height', 'about 4 : 3'],
        ['Horizontal', 'Frankfort plane, ear canal to orbit'],
        ['Mastoid process', 'behind and below the ear canal'],
      ],
      lookCloser: [
        { label: 'zygomatic-arch', text: 'Almost level, ending just ahead of the ear canal.' },
        { label: 'occipital', name: 'Occipital bone', text: 'Its bump lies near the Frankfort line, extended.' },
      ],
      didYouKnow: 'In the 1880s, craniologists at Frankfurt agreed to level every skull on this line.',
      figure: {
        type: 'skull',
        params: { subject: 'human', lesson: 'profile' },
        caption: 'Fig. 3 — Profile on the Frankfort plane, turning against a proportion grid.',
        scaleNote: 'Adult skull, about 17.5–18.5 cm long',
      },
      animation: {
        title: 'Front to profile',
        beats: [
          [0, 'Front view: a ball for the cranium, the face hung below it.'],
          [1.25, 'The skull turns; the face becomes a wedge on the ball.'],
          [2.5, 'Profile at 90°: ear canal and orbit rim share one level line.'],
          [3.75, 'Turning back, each landmark slides home along its guide.'],
        ],
      },
      lesson: {
        steps: [
          { title: 'Level line and circle', text: 'Rule a level line through the top of the ear canal and a vertical through the same point; draw the braincase circle, stretched front to back, centred near that vertical.' },
          { title: 'Face wedge in a square', text: 'Hang the face wedge from brow to chin, back to the jaw angle and up to the ear; box the whole skull in a near-square and rule brow, nose and bite guides.' },
          { title: 'Orbit, aperture, contour', text: 'Rest the orbit’s lowest rim on the level line, set back its curved edge, notch the nasal aperture under the nasal bones, and refine crown, occiput and jaw, its joint just ahead of the ear.' },
        ],
        proTip: 'Draw the Frankfort line first; a profile off this level tips the whole face.',
        mistakes: [
          'A braincase drawn too small. In profile, the cranium is the dominant mass.',
          'An ear canal ahead of the jaw joint. The joint is always in front.',
        ],
        proportions: [
          'Braincase: four units long for three high.',
          'Frankfort line, extended, nearly meets the occipital bump.',
        ],
      },
      sources: ['Park et al. 2020', 'Garson 1885', 'Howells 1973', 'Turvey & Golden 2012', 'Betts et al. 2022 (OpenStax)'],
    },

    // ------------------------------------------------------------------ IV
    {
      id: 'bones',
      number: 'IV',
      layout: 'lesson',
      common: 'The Bones',
      commonAlt: 'Los huesos del cráneo',
      scientific: 'Cranial & facial bones',
      authority: '',
      family: 'Human skull · 8 cranial, 14 facial',
      status: null,
      badge: 'Lesson 4 · Intermediate',
      lede: 'Twenty-two bones, only one that moves, and seams like stitching.',
      body: [
        'The cranium has eight bones: frontal, two parietals, two temporals, occipital, sphenoid and ethmoid. The face has fourteen: paired maxillae, zygomatics, nasals, lacrimals, palatines and inferior nasal conchae, plus the single vomer and mandible. Only the mandible moves; the rest lock along sutures that interlock on the vault and run smoother on the face. The coronal crosses the crown, the sagittal divides the parietals—draw both as fine zigzags.',
        'To explode the skull, move each bone outward along a line from the centre, so the eye can put it back. Watch the sphenoid, the winged keystone of the skull’s floor: it meets twelve bones, every other cranial bone among them. And treat twenty-two as the textbook count: the six ear ossicles and the hyoid are left out, and many skulls carry extra small bones within their sutures.',
      ],
      // the counts sit in the labels so each value sets on one line: this dense
      // verso needs that (and its tight body and step 1) to set at 95 %
      facts: [
        ['8 cranial bones', 'four single, two pairs'],
        ['14 facial bones', 'six pairs, two single'],
        ['Movable bone', 'the mandible alone'],
        ['Not counted', 'hyoid, six ear ossicles'],
      ],
      lookCloser: [
        { label: 'coronal-suture', text: 'Joins the frontal bone to both parietals.' },
        { label: 'sphenoid', text: 'The winged keystone: it meets twelve bones, every other cranial one.' },
      ],
      didYouKnow: 'Your frontal bone began as two halves, fused by nine months in one CT study.',
      figure: {
        type: 'skull',
        params: { subject: 'human', lesson: 'bones' },
        caption: 'Fig. 4 — The skull disarticulated: eight cranial and fourteen facial bones.',
        scaleNote: 'Adult skull, about 17.5–18.5 cm long',
      },
      animation: {
        title: 'Apart and together',
        beats: [
          [0, 'Assembled: twenty-one bones locked along sutures, the mandible on its hinge.'],
          [1.25, 'The skull opens along its seams.'],
          [2.5, 'Fully apart: eight cranial bones and fourteen facial.'],
          [3.75, 'The bones close in again, each to its place.'],
        ],
      },
      lesson: {
        steps: [
          { title: 'Outline and sutures', text: 'Start from the profile of Lesson III. Run the coronal, lambdoid and squamous sutures as wandering seams fencing the frontal, parietal, temporal and occipital bones.' },
          { title: 'Map the bones', text: 'Tint each bone as its own panel—frontal, parietal, temporal, occipital, sphenoid wing, cheekbone, maxilla, nasal, mandible—so the side of the skull reads as a map.' },
          { title: 'Pull the bones apart', text: 'Move every bone straight out from one centre, keeping its angle, and edge each with the seam it shared with its neighbour.' },
        ],
        proTip: 'Explode along straight lines from one centre, each bone facing as it did in the skull.',
        mistakes: [
          'Vault sutures drawn as straight cracks. They wander and interlock like a zip.',
          'Counting the hyoid as a skull bone. It touches no other bone.',
        ],
        proportions: [
          'From above: three-quarters as wide as long.',
          'Parietals: most of the vault’s roof and sides.',
        ],
      },
      sources: ['Betts et al. 2022 (OpenStax)', 'Gray 1918', 'Vu et al. 2001', 'Bellary et al. 2013'],
    },

    // ------------------------------------------------------------------ V
    {
      id: 'jaguar',
      number: 'V',
      layout: 'lesson',
      common: 'Jaguar',
      commonAlt: 'Cráneo de jaguar',
      scientific: 'Panthera onca',
      authority: '(Linnaeus, 1758)',
      family: 'Felidae · Pantherinae',
      status: null,
      badge: 'Lesson 5 · Advanced',
      lede: 'Costa Rica’s largest cat wears a skull built for one act: the bite.',
      body: [
        'Beside your own skull the priorities reverse: a modest braincase sits behind a short, broad muzzle and massive jaws. Build it from a long oval and a short, blunt box, then add what the bite demands—a sagittal crest along the top to anchor the temporalis, the main jaw muscle, and cheekbone arches swung wide to let it pass beneath.',
        'Then the tools: upper canines with about four centimetres of enamel and, behind them, the carnassials—upper fourth premolar and lower first molar—closing like shears. The jaw joint is a transverse hinge, so the mandible swings almost purely up and down, while yours can also grind sideways. And the orbit is open behind: two bony points reach toward each other, joined in life by a ligament.',
      ],
      facts: [
        ['Teeth', '30, against an adult human’s 32'],
        ['Skull length', 'about 24 cm (Mexico)–30 cm (Argentina)'],
        ['Mass, Central America', 'males ~56, females ~41 kg'],
        ['Status', 'Near Threatened; endangered in Costa Rica'],
      ],
      // the run-in is the pill's exact words; set in capitals it reads P4/M1,
      // a shorthand also in use for the pair, and the note keeps the strict
      // case (upper P4, lower m1; calaveras-research §10)
      lookCloser: [
        { label: 'sagittal-crest', text: 'A keel of bone that anchors the temporalis.' },
        { label: 'carnassial', name: 'Carnassial (P4/m1)', text: 'Upper P4 against lower m1: shears for meat.' },
      ],
      didYouKnow: 'Jaguars often kill with a skull bite; estimates of their canine bite force run from about 680 to 1,000 newtons.',
      figure: {
        type: 'skull',
        params: { subject: 'jaguar', lesson: 'jaguar' },
        caption: 'Fig. 5 — Jaguar, *Panthera onca*: skull and mandible in the bite.',
        scaleNote: 'Adult skull, about 24 cm (Mexico) to 30 cm (Argentina) long',
      },
      animation: {
        title: 'The bite',
        beats: [
          [0, 'Jaw closed: a short face between flaring arches.'],
          [0.5, 'The jaw swings open on its transverse hinge.'],
          [1.8, 'Full gape: the long canines clear each other.'],
          [2.6, 'The bite: the temporalis, anchored on the glowing crest, snaps the jaw shut.'],
          [3.4, 'Carnassials shear past each other; the jaw rests.'],
        ],
      },
      lesson: {
        steps: [
          { title: 'Braincase and muzzle box', text: 'Draw a long oval for the braincase and a short box for the muzzle ahead of it; join them with the brow’s slope, rule the tooth line and dot the hinge.' },
          { title: 'Crest, arches, jaw', text: 'Run the sagittal crest along the top, swing the arches wide, and hang the short, deep jaw from the hinge.' },
          { title: 'Sockets, teeth, contour', text: 'Leave the orbit open behind, cut the nasal aperture, set canines and carnassials, and refine crest to chin.' },
        ],
        proTip: 'Draw it beside a human skull of equal braincase; the cat’s is built around the bite.',
        mistakes: [
          'Closing the orbit with a ring of bone, as in a human skull.',
          'Narrow cheekbone arches. They flare wide to make room for the temporalis.',
        ],
        proportions: [
          'Canine enamel: about 4 cm—taller than our orbit.',
          'Upper canine: crown about one and a half times the upper carnassial’s length.',
        ],
      },
      sources: ['Del Moral Sachetti et al. 2011', 'Wroe et al. 2005', 'Quigley et al. 2017 (IUCN)', 'UNEP/CMS 2020', 'Animal Diversity Web'],
    },

    // ------------------------------------------------------------------ VI
    {
      id: 'skull-and-snake',
      number: 'VI',
      layout: 'lesson',
      common: 'Skull & Snake',
      commonAlt: 'Calavera y serpiente',
      scientific: 'Bothriechis nigroadspersus',
      authority: '(Steindachner, 1870)',
      family: 'Composition · Viperidae, Crotalinae',
      status: null,
      badge: 'Lesson 6 · Advanced',
      lede: 'A heavy, still skull; a light, moving line. Let the line lead.',
      body: [
        'This lesson is about composition. The skull is mass—symmetrical, still, heavy at the crown; the viper is line—slender, asymmetrical, moving. Turn the skull and set it off centre, then route the snake around it in one unbroken loop: out of an orbit, over brow and vault, behind the ear, below the cheekbone arch and back across the cheek. Where body and bone overlap, depth appears without shading.',
        'The model is *Bothriechis nigroadspersus*, the more widespread of Costa Rica’s two eyelash-pitvipers, long filed under *B. schlegelii*: a broad, triangular head on a slender neck, two raised scales above each eye. Draw it from photographs or museum specimens, never a handled animal. A bite is an emergency—go to a hospital at once, where antivenom is the treatment; no tourniquets, cuts, suction or ice.',
      ],
      facts: [
        ['Adult length', 'up to about 90 cm'],
        ['Eyelash scales', 'two raised, spine-like supraciliaries'],
        ['Habitat', 'humid forest, sea level–1,430 m'],
        ['Birth', 'live young, 6–23 per litter'],
      ],
      lookCloser: [
        { label: 'orbit', text: 'The darkest note; the viper leaves and returns here.' },
        { label: 'zygomatic-arch', text: 'Pass below it; overlap the cheek for depth.' },
      ],
      didYouKnow: 'Filed under *Bothriechis schlegelii* until 2024, it has regained its 1870 name.',
      figure: {
        type: 'skull',
        params: { subject: 'human', lesson: 'skull-and-snake', snake: { species: 'bothriechis-schlegelii' } },
        caption: 'Fig. 6 — Human skull and Central American eyelash-pitviper: a study in composition.',
        scaleNote: 'Skull about 18 cm long; viper up to about 90 cm',
      },
      // the head (eye anchor) in the skull frame, from the lab: in the orbit at 0,
      // on the brow at 0.5, the vault at 1.3, behind the ear at 2.6, round the
      // mastoid at 3.2–3.5, 2.2–2.8 cm below the arch and outside the ramus at
      // 3.75–4.2 (it never passes under the arch), on the cheek at 4.4–4.6, in
      // the socket's lower-outer corner at 4.7. Move these with snake.js CONTROL.
      animation: {
        title: 'Through the orbit',
        beats: [
          [0, 'The viper’s head rests in the orbit; its body circles the skull.'],
          [0.5, 'The head leaves the orbit and crosses the brow.'],
          [1.3, 'It climbs over the vault.'],
          [2.6, 'Then it runs down behind the ear.'],
          [3.6, 'It swings forward below the cheekbone arch, beside the jaw.'],
          [4.4, 'Over the cheek, it slips back into the socket.'],
        ],
      },
      lesson: {
        steps: [
          { title: 'Ball, axis and sockets', text: 'Block the skull as a sphere and centre line and place both orbits; the snake will leave from one of them.' },
          { title: 'Thread the snake', text: 'Draw its path as one loop—out of the orbit, over the brow and vault, behind the ear, back across the cheek—and decide each crossing: body over bone, or bone over body.' },
          { title: 'Sockets, head, contour', text: 'Cut orbits and aperture, give the viper its triangular head and eyelash scales, and refine both contours.' },
        ],
        proTip: 'Thicken the snake where it nears you; thin it where it turns away.',
        mistakes: [
          'Even coils, like a spring. Vary every curve.',
          'Tangents: a curve grazing the skull’s edge flattens it.',
        ],
        proportions: [
          'A big female: about five skull-lengths.',
          'Focal point: the viper’s head, a third in.',
        ],
      },
      sources: ['Arteaga et al. 2024', 'Reyes-Velasco 2024', 'WHO 2026', 'Maduwage et al. 2024'],
    },
  ],

  back: {
    note: {
      title: 'Practice, and Respect',
      paragraphs: [
        'Practise a little every day rather than a lot once a week. Warm up with a page of circles and centre lines. Then make three quick constructions—front, three-quarter and profile—in a few minutes each, big shapes and guides only. Give the rest of the session to one careful study: planes first, then sockets, sutures and teeth, with hatching that follows the form. Finish by drawing one view from memory and comparing it with the plate. Turn the figures in this book to a new angle each day, so that you learn the skull rather than a picture of it.',
        'Every skull was a person. Work from casts, scans and the figures in this book; real human remains belong in museums and teaching collections, held with care and under the law. In Costa Rica, human remains from pre-Hispanic cultures are part of the national archaeological heritage. The jaguar is protected too—international commercial trade is banned under CITES Appendix I—so draw it from museum specimens and photographs, never from parts bought or sold. Watch living snakes only from a safe distance and never handle one; a bite needs a hospital, where antivenom is the treatment.',
      ],
    },
    glossary: [
      ['Calvaria', 'The skullcap: the vault of frontal, parietal and occipital bone. Spanish *calavera* descends from the same Latin word.'],
      ['Carnassials', 'In carnivores, the shearing pair formed by the upper fourth premolar and the lower first molar.'],
      ['Construction line', 'A light guide—centre line, axis or level—laid down before the contour and later erased or drawn over.'],
      ['Coronoid process', 'The thin blade at the front of the mandible’s ramus; the temporalis attaches to it.'],
      ['Foreshortening', 'The apparent shortening of a form that turns away from the viewer.'],
      ['Frankfort plane', 'The standard orientation of the skull: a level line through the top of the ear canal and the lowest point of the orbit rim.'],
      ['Hatching', 'Parallel lines that build tone in engraving and drawing; laid across one another, they become cross-hatching.'],
      ['Mandible', 'The lower jaw, the only movable bone of the skull.'],
      ['Nasal aperture', 'The pear-shaped (piriform) opening of the nose in the skull, narrow end up.'],
      ['Norma', 'A standard view of the skull: frontalis, lateralis, verticalis, occipitalis or basalis.'],
      ['Sagittal crest', 'A ridge along the top of the skull that anchors the temporalis; prominent in big cats.'],
      ['Suture', 'A fibrous joint between skull bones: zigzag on the vault, bevelled at the temple, nearly straight on the face.'],
      ['Temporomandibular joint', 'The jaw joint, just in front of the ear canal, where the mandible’s condyle both rotates and glides.'],
      ['Zygomatic arch', 'The cheekbone arch, formed where the zygomatic bone meets a process of the temporal bone.'],
    ],
    sources: [
      'Betts, J. G., Young, K. A., Wise, J. A., et al. (2022). Anatomy and Physiology, 2nd ed. Houston: OpenStax, Rice University. https://openstax.org/details/books/anatomy-and-physiology-2e',
      'Gray, H. (1918). Anatomy of the Human Body, 20th ed., revised by W. H. Lewis. Philadelphia: Lea & Febiger.',
      'Howells, W. W. (1973). Cranial Variation in Man. Papers of the Peabody Museum of Archaeology and Ethnology 67. Cambridge, MA: Harvard University. Data: Howells, W. W. (1996), American Journal of Physical Anthropology 101: 441–442.',
      'Karaca Saygili, O., Cinar, S., Gulcen, B., Ozcan, E., & Kus, I. (2016). The validity of eight neoclassical facial canons in the Turkish adults. Folia Morphologica 75(4): 512–517.',
      'Guyomarc’h, P., Dutailly, B., Couture, C., & Coqueugniot, H. (2012). Anatomical placement of the human eyeball in the orbit: validation using CT scans of living adults and prediction for facial approximation. Journal of Forensic Sciences 57(5): 1271–1275.',
      'Zawawi, K. H., Al-Badawi, E. A., Lobo, S. L., Melis, M., & Mehta, N. R. (2003). An index for the measurement of normal maximum mouth opening. Journal of the Canadian Dental Association 69(11): 737–741.',
      'Park, J.-A., Ha, T.-J., Lee, J.-S., Song, W.-C., & Koh, K.-S. (2020). Use of the orbito-occipital line as an alternative to the Frankfort line. Anatomy & Cell Biology 53(1): 21–26.',
      'Vu, H. L., Panchal, J., Parker, E. E., Levine, N. S., & Francel, P. (2001). The timing of physiologic closure of the metopic suture: a review of 159 patients using reconstructed 3D CT scans of the craniofacial region. Journal of Craniofacial Surgery 12(6): 527–532.',
      'Del Moral Sachetti, J. F., Lameda Camacaro, F. I., Vázquez, J. S., & Zenteno Cárdenas, R. (2011). Fuerza de mordedura y estrés mandibular en el jaguar (*Panthera onca*) durante la depredación de pecaríes mediante la fractura de sus cráneos. Acta Zoológica Mexicana (n.s.) 27(3): 757–776.',
      'Quigley, H., Foster, R., Petracca, L., Payan, E., Salom, R., & Harmsen, B. (2017). *Panthera onca* (errata version published in 2018). The IUCN Red List of Threatened Species 2017: e.T15953A123791436.',
      'UNEP/CMS (2020). Proposal for the inclusion of the jaguar (*Panthera onca*) in Appendices I and II of the Convention, submitted by Costa Rica. UNEP/CMS/COP13/Doc.27.1.2.',
      'Arteaga, A., Pyron, R. A., Batista, A., et al. (2024). Systematic revision of the Eyelash Palm-Pitviper *Bothriechis schlegelii* (Serpentes, Viperidae), with the description of five new species and revalidation of three. Evolutionary Systematics 8(1): 15–64.',
    ],
    colophon: [
      'Skulls — Drawing Skulls: A Constructive Method. Lámina · Volume III. First edition, 2026.',
      'Lámina Natural History Press is a fictional imprint. Text, construction steps and figures are original to this book.',
      'The figures are live 3D models rendered with Three.js WebGPU and TSL shaders: WGSL on WebGPU, GLSL on the WebGL 2 fallback.',
      'Set in Oswald, EB Garamond, IBM Plex Sans Condensed and IBM Plex Mono.',
      'Pure white paper, black ink and one vermilion accent; the endpapers are ruled as a drawing grid.',
      'Measurements follow published craniometric and field data; see Sources.',
    ],
  },
};
