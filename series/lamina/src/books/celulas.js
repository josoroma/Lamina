// Cells — original bilingual science edition. Research and model scope: docs/books/celulas.md.
export default {
  id: 'celulas', title: 'Cells', subtitle: 'The Tiny Machines of Life', kicker: 'Lámina · Volume V',
  author: 'Lámina Science Press', byline: { name: 'Josoroma', mark: 'josoroma' }, edition: 'First edition, 2026', locale: 'en', emblem: 'cell',
  blurb: 'Open a cell and follow its astonishing ordinary chemistry: borders, messages, energy, sunlight and the making of two.',
  imprint: ['Original explanations and schematic models, informed by NHGRI and OpenStax Biology 2e. Colours identify parts; dimensions and timing are explanatory.'],
  theme: { style: 'lithograph', cloth: '#124b4b', foil: '#d7dbbf', paper: '#fbf8f1', ink: '#172b2c', accent: '#116361', muted: '#687b74', endpaper: { motif: 'cells', color: '#124b4b', ground: '#e4eee6' }, fonts: { display: 'Cormorant Garamond', body: 'EB Garamond', label: 'IBM Plex Sans Condensed', mono: 'IBM Plex Mono' } },
  intro: {
    title: 'A Factory with No Foreman',
    paragraphs: [
      'Imagine a factory that builds its own tools, patches its walls and sometimes makes another factory. Now remove the workers. What remains is a cell: molecules colliding, fitting together, changing shape and reacting. Nothing inside needs to know the plan for an organised process to emerge.',
      'Your body contains trillions of cells. Some contract, some carry signals, some provide a barrier, and many perform several jobs. They exchange materials and chemical messages. Their cooperation is remarkable, but it is not a meeting in which tiny people decide what to do.',
      'We will open six windows into this world. Each begins with a question you can ask without knowing a technical word. The models are diagrams you can turn and separate, not microscope recordings: colours, sizes and repeated motion help reveal a mechanism. Ask what crosses the boundary, what supplies the energy, and what changes when one part is missing. Understanding begins when a name becomes a prediction.'
    ],
    pullQuote: 'Life does not set chemistry aside. It keeps chemistry organised and supplied with energy.'
  },
  howTo: { title: 'Make a Prediction, Then Look', items: [
    ['Drag a page corner', 'Turn the leaf to meet the next question.'],
    ['Drag the figure', 'Rotate the model and inspect its hidden side.'],
    ['Double-click the figure', 'Move closer to the mechanism.'],
    ['Layers · Explode · Labels', 'Hide a layer, separate the parts and name them.'],
    ['Play · Moment', 'Watch a slowed process, then examine one instant.'],
    ['Listen', 'Hear only the current left page in English or Spanish.'],
    ['Book view', 'Bring the pages face-on with the reading-angle control.']
  ] },
  plates: [
    {
      id: 'organization', number: 'I', layout: 'plate', common: 'An organised drop', scientific: 'A eukaryotic animal cell', family: 'Cell biology · Organisation', badge: 'Schematic cutaway', status: null,
      lede: 'A cell is mostly water. Why does it not behave like a puddle?',
      body: [
        'Put salt in water and it spreads. Put a living cell in a suitable environment and it maintains differences: more of one substance here, less of another there. Its membrane helps establish an inside. Within that boundary, proteins speed particular reactions, fibres support and move components, and compartments keep some processes apart. Water supplies the medium; the arrangement supplies opportunities that a puddle lacks.',
        'Our cutaway shows an animal cell with a nucleus. The nucleus contains most of its DNA, while ribosomes build proteins from amino acids. Folded membranes and mitochondria provide specialised workspaces. These are not miniature rooms with purposeful workers: molecules encounter one another through motion, and chemical interactions determine what happens next. Bacteria are cells too, but they have no membrane-bound nucleus. A cell also exchanges matter and energy with its surroundings; it is not a sealed perpetual-motion machine. Turn off a layer and ask what information the simplified picture has removed. No single coloured object is “the life.” The maintained relationships are the interesting part.'
      ],
      facts: [['Example', 'Animal cell'], ['Interior', 'Water and dissolved molecules'], ['Boundary', 'Plasma membrane'], ['Information', 'DNA'], ['Model', 'Enlarged cutaway']],
      lookCloser: [
        { label: 'membrane', name: 'Cell membrane', text: 'A boundary that permits controlled exchange, rather than sealing everything away.' },
        { label: 'nucleus', name: 'Nucleus', text: 'A membrane-bound compartment holding most of this animal cell’s DNA.' },
        { label: 'ribosome', name: 'Ribosomes', text: 'Small molecular assemblies that join amino acids into proteins.' }
      ],
      didYouKnow: 'Bacteria carry DNA and make proteins without a nucleus. A nucleus distinguishes eukaryotic organisation; it does not define life by itself.',
      figure: { type: 'cell', params: { scene: 'organization' }, caption: 'Fig. I — An animal cell opened to reveal selected compartments.', scaleNote: 'Schematic; colours and sizes are illustrative' },
      animation: { title: 'Order without a foreman', beats: [[0, 'The membrane outlines an inside, while the cutaway reveals its contents.'], [1.6, 'Small molecules move through the crowded interior.'], [3.3, 'Separate the parts to see how a boundary and compartments organise the whole.']] },
      sources: ['NHGRI, Cell', 'OpenStax Biology 2e, §4.3 Eukaryotic Cells']
    },
    {
      id: 'membrane', number: 'II', layout: 'plate', common: 'A border with doorways', scientific: 'Selective permeability', family: 'Cell biology · Transport', badge: 'Molecular arrangement', status: null,
      lede: 'How do you keep an inside different from the outside without closing every door?',
      body: [
        'A membrane begins with a useful mismatch. A phospholipid has a head that interacts well with water and tails that do not. In water, many such molecules can form a double layer: heads face the watery surroundings on both sides, while tails gather in the middle. No bricklayer is required. The molecular interactions make this arrangement favourable, although a living cell also builds, modifies and repairs its membranes.',
        'That oily middle changes what can cross. Small uncharged molecules such as oxygen can pass through relatively readily; charged ions cannot do so freely. Proteins spanning the membrane provide selective routes. A channel may allow an ion to move down its electrochemical gradient, while a pump uses an energy source to move substances against a gradient. The drawing shows a channel, not a pump, and the moving beads only indicate a possible route. They are not a measured current. Notice the central lesson: a boundary can be flexible and selective at once. If every molecule crossed equally easily, the cell would lose many of the differences on which its chemistry depends.'
      ],
      facts: [['Structure', 'Two phospholipid layers'], ['Heads', 'Contact water'], ['Tails', 'Face the oily interior'], ['Channel', 'Selective passive route'], ['Pump', 'Requires an energy source']],
      lookCloser: [
        { label: 'head', name: 'Polar heads', text: 'The polar heads contact water on both sides of the membrane.' },
        { label: 'tails', name: 'Lipid tails', text: 'The tails form a barrier that charged ions do not freely cross.' },
        { label: 'channel', name: 'Channel protein', text: 'A passage through the bilayer; selectivity depends on its molecular structure.' }
      ],
      didYouKnow: 'A biological membrane is a fluid arrangement. Many lipids and proteins move sideways within it; it is not a rigid wall.',
      figure: { type: 'cell', params: { scene: 'membrane' }, caption: 'Fig. II — A phospholipid bilayer and a channel through its centre.', scaleNote: 'Schematic cross-section; particles enlarged' },
      animation: { title: 'A selective crossing', beats: [[0, 'Water-facing heads surround a middle made of lipid tails.'], [1.6, 'The highlighted ion follows a channel through the membrane.'], [3.3, 'Other particles remain outside this route; the loop is an explanatory replay.']] },
      sources: ['OpenStax Biology 2e, §§5.1–5.2, Membranes and Passive Transport']
    },
    {
      id: 'protein', number: 'III', layout: 'plate', common: 'From message to machine', scientific: 'DNA, RNA and protein', family: 'Cell biology · Information', badge: 'Information is copied', status: null,
      lede: 'A recipe does not become a cake. In the same way, DNA does not turn into protein.',
      body: [
        'Think of the difference between keeping a recipe and making dinner. A cell preserves information in the sequence of its DNA. During transcription, an enzyme makes an RNA copy from a DNA template. For a protein-coding gene, messenger RNA carries sequence information that can be used at a ribosome. In the animal-cell example, the DNA stays in the nucleus while the message can reach the cytoplasm. The chemical letters are not tiny words understood by a reader.',
        'At a ribosome, transfer RNAs help match the message to amino acids, which are joined into a chain. Its sequence and environment influence how the chain folds and what it can do. Some proteins catalyse reactions; others form supports, receptors or channels. The analogy has a limit: the ribosome does not comprehend a recipe, and not every gene encodes a protein. Molecules recognise one another by their shapes and interactions. Follow the coloured chain in the model, but do not mistake its few beads for a complete real protein. The figure compresses many stages into one readable route from stored sequence to molecular function.'
      ],
      facts: [['Archive', 'DNA sequence'], ['Working message', 'Messenger RNA'], ['Assembly site', 'Ribosome'], ['Building units', 'Amino acids'], ['Product', 'A protein chain']],
      lookCloser: [
        { label: 'dna', name: 'DNA template', text: 'The sequence is copied; the DNA itself does not become a protein.' },
        { label: 'rna', name: 'Messenger RNA', text: 'An RNA message connects transcription to protein synthesis.' },
        { label: 'ribosome', name: 'Ribosome', text: 'A molecular assembly joins amino acids in an order specified by the message.' },
        { label: 'protein', name: 'Protein chain', text: 'The emerging chain must adopt a useful structure to perform its job.' }
      ],
      didYouKnow: 'Ribosomes contain RNA as well as proteins. RNA is part of the machinery that makes peptide bonds, not merely a disposable message.',
      figure: { type: 'cell', params: { scene: 'protein' }, caption: 'Fig. III — DNA, an RNA message, a ribosome and a growing protein.', scaleNote: 'Schematic pathway; components not to scale' },
      animation: { title: 'Copy, read, assemble', beats: [[0, 'DNA stores a sequence; an RNA message provides a working copy.'], [1.6, 'The ribosome reads the message as amino acids are joined.'], [3.3, 'A protein chain emerges; the animation repeats the schematic process.']] },
      sources: ['NHGRI, Transcription', 'NHGRI, Translation', 'OpenStax Biology 2e, §15.5 Ribosomes and Protein Synthesis']
    },
    {
      id: 'energy', number: 'IV', layout: 'plate', common: 'A tiny energy converter', scientific: 'Mitochondria and ATP', family: 'Cell biology · Energy', badge: 'Energy changes form', status: null,
      lede: 'A waterwheel needs a difference in height. A molecular motor can use a difference across a membrane.',
      body: [
        'Food and oxygen do not simply collide in a cell and burst into flame. During aerobic respiration, a network of reactions transfers energy in controlled steps. In a mitochondrion, electron transfer along the inner membrane helps pump hydrogen ions across it. This builds an electrochemical difference, rather like charging a battery. Oxygen accepts electrons at the end of the chain, where water is formed. The folded membrane provides room for many copies of this machinery.',
        'Hydrogen ions can flow back through ATP synthase, a molecular complex with a rotating part. Coupled changes in the enzyme help make ATP from ADP and phosphate. Cells then couple ATP reactions to work such as moving substances or building molecules. Be careful with the familiar phrase “energy in a bond”: breaking a bond by itself costs energy. ATP hydrolysis can supply usable free energy because the overall reaction, including new interactions and products, is favourable under cellular conditions. The model enlarges the motor beside a cutaway mitochondrion; it does not show their true relative sizes. Follow the difference that drives the motion, not a magical fuel hidden inside a coloured bead.'
      ],
      facts: [['Boundary', 'Inner mitochondrial membrane'], ['Stored difference', 'Electrochemical proton gradient'], ['Motor', 'ATP synthase'], ['Product', 'ATP from ADP and phosphate'], ['Oxygen', 'Final electron acceptor']],
      lookCloser: [
        { label: 'cristae', name: 'Inner folds', text: 'The cristae extend the inner membrane that carries energy-converting machinery.' },
        { label: 'gradient', name: 'Proton gradient', text: 'Protons cross from intermembrane space to matrix; the enlarged patch shows this flow upwards.' },
        { label: 'synthase', name: 'ATP synthase', text: 'Proton flow is coupled to rotation and ATP production.' }
      ],
      didYouKnow: 'Plant cells have mitochondria too. Capturing sunlight does not remove their need to transfer energy through cellular respiration.',
      figure: { type: 'cell', params: { scene: 'energy' }, caption: 'Fig. IV — A mitochondrion beside an enlarged ATP-synthase schematic.', scaleNote: 'Motor greatly enlarged; motion slowed' },
      animation: { title: 'A difference drives work', beats: [[0, 'Folded inner membranes carry the machinery of aerobic respiration.'], [1.6, 'Protons cross into the matrix through ATP synthase; in the enlarged patch, they move upwards.'], [3.3, 'Rotation is coupled to ATP production; energy is transferred, not created.']] },
      sources: ['OpenStax Biology 2e, §7.4 Oxidative Phosphorylation', 'OpenStax Biology 2e, §6.4 ATP']
    },
    {
      id: 'photosynthesis', number: 'V', layout: 'plate', common: 'Sunlight becomes chemistry', scientific: 'The chloroplast', family: 'Cell biology · Photosynthesis', badge: 'Matter and energy differ', status: null,
      lede: 'A leaf gains matter from its surroundings. Sunlight supplies energy, not little green building blocks.',
      body: [
        'Hold a leaf to the light and imagine its cells as collectors of an incoming energy supply. Inside chloroplasts, pigments absorb light. Reactions in thylakoid membranes use that energy to drive electron transfers and build chemical energy carriers. Water supplies electrons, and oxygen is released. The oxygen produced in this process comes from water, not from pulling oxygen off carbon dioxide. That distinction is easy to miss when all the ingredients are drawn in one tidy equation.',
        'Other reactions, called the Calvin cycle, use ATP and NADPH to help incorporate carbon dioxide into organic molecules. These reactions occur in the stroma around the thylakoids. A plant can use the products to make sugars and many other substances, including the material that becomes wood. The carbon is matter arriving from the air; light is an energy transfer. Our cutaway separates stacks of thylakoids so you can follow this division of tasks. It is an arrangement diagram, not a complete chemical mechanism. Plants also respire, and not every plant cell contains chloroplasts. A root in the dark is not secretly a small solar panel.'
      ],
      facts: [['Collector', 'Chlorophyll and other pigments'], ['Light reactions', 'Thylakoid membranes'], ['Carbon fixation', 'Calvin cycle in stroma'], ['Carbon source', 'Carbon dioxide'], ['Released oxygen', 'Comes from water']],
      lookCloser: [
        { label: 'thylakoid', name: 'Thylakoid stacks', text: 'Membrane sacs carry the machinery of the light-dependent reactions.' },
        { label: 'stroma', name: 'Stroma', text: 'The fluid around the thylakoids contains enzymes of the Calvin cycle.' },
        { label: 'light', name: 'Incoming light', text: 'Light transfers energy; carbon dioxide supplies the carbon used to build organic molecules.' }
      ],
      didYouKnow: 'The oxygen that photosynthesis releases comes from water. The carbon used to make sugars comes from carbon dioxide: different atoms take different routes.',
      figure: { type: 'cell', params: { scene: 'photosynthesis' }, caption: 'Fig. V — An opened chloroplast with thylakoid stacks and incoming light.', scaleNote: 'Schematic cutaway; light pulses are symbols' },
      animation: { title: 'Follow matter and energy', beats: [[0, 'Light reaches pigments in the thylakoid membranes.'], [1.6, 'Light-dependent reactions provide ATP and NADPH and release oxygen from water.'], [3.3, 'Carbon fixation uses those chemical supplies in the surrounding stroma.']] },
      sources: ['OpenStax Biology 2e, §§8.2–8.3, Photosynthesis']
    },
    {
      id: 'division', number: 'VI', layout: 'plate', common: 'One becomes two', scientific: 'Mitosis and cooperation', family: 'Cell biology · Continuity', badge: 'Replay, not reversal', status: null,
      lede: 'Copying the instructions is only half the problem. Each new cell must receive a usable set.',
      body: [
        'Before an animal cell divides by mitosis, it copies its DNA. A duplicated chromosome contains two sister chromatids. During division, spindle fibres attach to chromosomes and help distribute the copies to opposite sides. The cell then usually partitions its contents, producing two daughter cells. This is not the same process as making sperm or eggs, and copying is not a guarantee that every molecule or future behaviour will be identical.',
        'The model follows separation after copying: paired chromosomes first share the middle, then move towards opposite poles as the cell constricts. We show only a few chromosomes so the movement is readable. The return to the opening arrangement is a replay, not a cell running its biology backwards. Now ask why the cells of your body do not all divide continuously. Chemical signals, available resources and internal controls affect whether cells enter the cycle. Neighbouring cells communicate through molecules and physical contacts; cooperation needs no little supervisor. Some specialised cells rarely divide. Living tissue is maintained by coordinated growth, work and loss, not simply by making the largest possible number of copies.'
      ],
      facts: [['Before division', 'DNA is copied'], ['Paired copies', 'Sister chromatids'], ['Distributor', 'Mitotic spindle'], ['Partition', 'Cytokinesis'], ['Control', 'Internal and external signals']],
      lookCloser: [
        { label: 'chromosomes', name: 'Chromosomes', text: 'Only a few duplicated chromosomes are drawn; a real cell’s count depends on the organism.' },
        { label: 'spindle', name: 'Spindle fibres', text: 'Microtubules help position and separate chromosome copies.' },
        { label: 'furrow', name: 'Division furrow', text: 'In this animal-cell example, a constriction partitions the cell contents.' }
      ],
      didYouKnow: 'Cell division and DNA copying are regulated processes. Many cells can leave the active cycle rather than immediately dividing again.',
      figure: { type: 'cell', params: { scene: 'division' }, caption: 'Fig. VI — Chromosome separation and constriction in an animal-cell diagram.', scaleNote: 'Few chromosomes shown; last phase replays' },
      animation: { title: 'Share the copies', beats: [[0, 'The DNA has already been copied; paired chromosomes lie near the middle.'], [1.6, 'Spindle fibres help separate the copies towards opposite sides.'], [3.3, 'The cell constricts; the diagram then returns for another explanatory replay.']] },
      sources: ['OpenStax Biology 2e, §10.2 The Cell Cycle', 'OpenStax Biology 2e, §9.1 Cell Signalling']
    }
  ],
  back: {
    note: { title: 'The Questions Are the Tools', paragraphs: ['Try explaining a cell without using the word “factory.” What creates a boundary? What moves across it? Which reaction supplies energy for another? Those questions turn a metaphor into something you can test.', 'These plates show selected mechanisms. Colours are invented, proportions are altered, and repeated motion makes slow inspection possible. A real cell is more crowded, less tidy and vastly more complex. The diagrams do not simulate molecular dynamics or predict disease.', 'The next time you see a leaf, a healed scratch or a loaf rising, look for the same ingredients: matter being rearranged, energy being transferred and information being used. Ordinary chemistry is not an insult to life. It is the beginning of its explanation.'] },
    glossary: [
      ['ATP', 'A molecule whose reactions can be coupled to cellular work; it is continually regenerated.'],
      ['Cell', 'The basic organised unit of living organisms.'],
      ['Chloroplast', 'An organelle in which photosynthesis occurs in plants and algae.'],
      ['Chromosome', 'A DNA molecule with associated proteins carrying genetic information.'],
      ['Cytoplasm', 'The material inside the plasma membrane but outside the nucleus.'],
      ['Gradient', 'A difference across space, such as concentration or electrical potential.'],
      ['Membrane', 'A selective boundary made chiefly of lipids and proteins.'],
      ['Mitochondrion', 'An organelle central to aerobic energy conversion in eukaryotic cells.'],
      ['Ribosome', 'An RNA-and-protein assembly that makes protein chains.'],
      ['Transcription', 'Making an RNA copy using a DNA template.'],
      ['Translation', 'Using an RNA message to assemble an amino-acid chain.'],
      ['Thylakoid', 'A membrane sac containing light-reaction machinery in a chloroplast.']
    ],
    sources: [
      'NHGRI. Talking Glossary: Cell, Transcription and Translation. genome.gov/genetics-glossary',
      'OpenStax, Rice University. Biology 2e, §4.3 Eukaryotic Cells. openstax.org/books/biology-2e',
      'OpenStax. Biology 2e, §§5.1–5.2: Membrane Structure and Passive Transport.',
      'OpenStax. Biology 2e, §6.4 ATP: Adenosine Triphosphate.',
      'OpenStax. Biology 2e, §7.4 Oxidative Phosphorylation.',
      'OpenStax. Biology 2e, §§8.2–8.3: Light Reactions and Carbon Fixation.',
      'OpenStax. Biology 2e, §9.1 Signaling Molecules and Cellular Receptors.',
      'OpenStax. Biology 2e, §10.2 The Cell Cycle; §15.5 Ribosomes and Protein Synthesis.'
    ],
    colophon: ['Original text and procedural scientific illustrations for this edition. Lámina Science Press is a fictional imprint.', 'The models use deliberately altered sizes, colours and timing. They explain selected relationships; they are not microscope recordings.', 'Read in English or Spanish, rotate the models, separate their parts and listen to the current left page.']
  }
};
