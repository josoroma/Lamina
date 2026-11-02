// Serpientes — A Living Atlas of Costa Rican Snakes (book manifest).
//
// Pure data: the typesetter turns it into printed pages, the figure host turns
// each plate.figure into a living 3D plate. Every fact here is sourced; the
// audit trail (URLs, synonyms, open questions, and the log of the two
// independent fact-checks) lives in docs/books/serpientes-research.md.
// Every lookCloser label id is one the snakes figure actually creates for
// that species (checked with lab.info()). Text budgets follow CONTRACTS §6 and
// figure params follow §12 verbatim (they are ids, not taxonomy: the eyelash
// viper keeps `bothriechis-schlegelii` as its figure id while the printed
// name follows the 2024 revision).
//
// Light markup: *italic* (binomials, Spanish words), **bold**. Animation
// beats, captions and scale notes stay plain text because they also appear in
// HTML captions and exported SVGs. Number–unit pairs use a no-break space
// ( ) so "1.2–1.8 m" never splits across a line. Beyond the §6 schema,
// `blurb` (back cover), `imprint` and `credits` (imprint page) are additive
// fields the typesetter reads; `byline` names the author whose mark is
// foil-stamped on both boards (`author` stays the imprint), and a look-closer
// `name` prints the figure's own label, in the pill's exact words, where the
// id alone would read differently ("yellow-venter" → "Yellow belly"). The one
// exception is the sea snake's `nostril`: its pill says "Valved nostrils", a
// claim the plate leaves out (research §7, question 9). The Spanish edition
// (src/books/es/serpientes.js) mirrors this file key for key.

export default {
  id: 'serpientes',
  title: 'Snakes',
  subtitle: 'A Living Atlas of Costa Rican Snakes',
  kicker: 'Lámina · Volume I',
  author: 'Lámina Natural History Press',
  byline: { name: 'Josoroma', mark: 'josoroma' },
  edition: 'First edition, 2026',
  locale: 'en',
  blurb:
    'Seven Costa Rican snakes, rebuilt as living plates: turn them in your hands, peel back their skin, and watch them strike, swim and squeeze.',
  imprint: [
    'This atlas is not an identification key and no substitute for medical care. After any snakebite in Costa Rica, call 9-1-1 and go to the nearest clinic or hospital.',
  ],
  credits: [
    'Facts checked against the Instituto Clodomiro Picado (Universidad de Costa Rica), The Reptile Database, the IUCN Red List and the primary literature listed under Sources.',
  ],

  theme: {
    style: 'lithograph',
    cloth: '#1f3a2b', // deep forest green buckram
    foil: '#c9a44c', // gold foil stamping
    paper: '#fbf8f1',
    ink: '#1c1a17',
    accent: '#8b2a24', // oxblood
    muted: '#7b7466',
    endpaper: { motif: 'scales', color: '#1f3a2b', ground: '#efe7d6' },
    fonts: { display: 'Cormorant Garamond', body: 'EB Garamond', label: 'IBM Plex Sans Condensed', mono: 'IBM Plex Mono' },
  },

  intro: {
    title: 'Why So Many Snakes?',
    paragraphs: [
      'More than 140 species of snakes live in Costa Rica — 144 in the Instituto Clodomiro Picado’s 2019 count — making it one of the richest countries on Earth for snakes per square kilometre. Geography explains much of it. When the isthmus closed, about 2.8\u00a0million years ago, the faunas of North and South America met on this narrow bridge of land. Between the Caribbean and the Pacific, volcanic cordilleras and the Talamanca range, rising to 3,821\u00a0m, divide the country into wet and seasonally dry lowlands and cool highlands; snakes live from the shore to almost 3,000\u00a0m.',
      'Most of them are harmless to people. Only about two dozen are dangerously venomous: seventeen pit vipers, the *tobobas*, and six elapids — five coral snakes and one sea snake. No single place holds them all, and each region has its own short list of dangerous species to learn.',
      'Look at a snake from a distance, hands in your pockets. Head shape and pupils mislead: the non-venomous boa has a triangular head and vertical pupils. The one sure sign of a viper is the loreal pit, a heat sensor between eye and nostril that gives the tobobas their “four nostrils” — but coral snakes and the sea snake have none, so a missing pit proves nothing. Then read the scales — keeled or smooth, the broad belly plates, the rings and diamonds. In this atlas you may do what no one should do in the field: turn the snake over, lift its skin and count its bones.',
    ],
    pullQuote: 'The one sure sign of a viper is the loreal pit — but coral snakes have none.',
  },

  howTo: {
    title: 'How to use this book',
    items: [
      ['Drag a page corner', 'Turn the leaf; let go and it falls open or settles back'],
      // An upright screen (phone or tablet, not a landscape phone) frames one page: there a tap
      // anywhere reads on and the arrows step one page (Reader's portrait mode), hence no "phone"/"spread".
      ['Click, tap or swipe', 'Turn forward on the right-hand page, back on the left; when one page fills the\u00a0screen, a tap reads on'],
      ['← → arrow keys', 'Previous or next page'],
      ['Drag the figure', 'Rotate the plate on its turntable'],
      ['Scroll or pinch', 'Zoom in for detail'],
      ['Double-click the figure', 'Inspect it up close; Esc returns to the book'],
      ['Layers (1–9)', 'Peel back the skin to show skeleton, venom glands or eggs'],
      ['Explode (E)', 'Dissect the figure into its parts'],
      ['Labels (L)', 'Name the parts; tap a “Look closer” note to find one'],
      ['Space bar', 'Play or pause the five-second animation'],
      ['Export (S)', 'Save the figure as SVG — colour plate or line art'],
    ],
  },

  plates: [
    // ------------------------------------------------------------------ I
    {
      id: 'terciopelo',
      number: 'I',
      layout: 'plate',
      common: 'Terciopelo',
      commonAlt: 'Fer-de-lance',
      scientific: 'Bothrops asper',
      authority: '(Garman, 1883)',
      family: 'Viperidae · Crotalinae',
      status: { code: 'LC', label: 'Least Concern', source: 'IUCN Red List, 2021' },
      badge: 'Venomous — dangerous',
      lede: 'The country’s most important venomous snake: a patient ambusher of farms and forest edges, behind most of Costa Rica’s snakebites.',
      body: [
        '*Terciopelo* is Spanish for velvet; *asper*, Latin for rough. Usually 1.2–1.8\u00a0m long, with females larger than males, this lancehead is abundant in the wet lowlands of both slopes and ranges up to about 1,500\u00a0m; it thrives in plantations and farmland, even around rural homes. It hunts at night from ambush: young snakes take frogs and lizards, adults mostly small mammals.',
        'Heat-sensing loreal pits let it aim in total darkness, and its hinged, hollow fangs — among the longest of any Costa Rican snake — swing forward as the mouth opens. The venom attacks muscle, blood vessels and the blood’s ability to clot, causing pain, swelling and bleeding. Common, prolific (litters of up to 90) and at home near people, the terciopelo causes most of the country’s snakebites. Costa Rica’s polyvalent antivenom is raised against its venom, together with those of the cascabel and the matabuey.',
      ],
      facts: [
        ['Length', '1.2–1.8\u00a0m; to 2.5\u00a0m'],
        ['Elevation', 'Sea level to 1,500\u00a0m'],
        ['Habitat', 'Wet forest, farms, gardens'],
        ['Activity', 'Nocturnal ambush hunter'],
        ['Young', 'Live-born, up to 90'],
        ['Venom', 'Damages tissue and clotting'],
      ],
      lookCloser: [
        { label: 'loreal-pit', text: 'Between eye and nostril: the loreal pit, a heat sensor that lets the snake strike at warm prey in darkness.' },
        { label: 'fangs', name: 'Hinged fangs', text: 'The hollow fangs fold back against the palate and swing erect for the strike.' },
        { label: 'venom-gland', text: 'Behind and below the eye lies the venom gland; the muscle that squeezes it helps give the head its triangular shape.' },
        { label: 'keeled-scales', text: 'Each scale on the back carries a ridge, or keel — perhaps the roughness behind the name *asper*.' },
      ],
      didYouKnow: 'Young terciopelos wriggle their tail tips to lure small prey within reach. In males the tip is yellow — hence another local name, *rabo amarillo*, “yellow tail”.',
      figure: {
        type: 'snake',
        params: { species: 'bothrops-asper', pose: 'strike' },
        caption: 'Fig. 1 — The terciopelo in its defensive S-coil, an instant before the strike.',
        scaleNote: 'Adult, about 1.5\u00a0m',
      },
      animation: {
        title: 'The strike',
        beats: [
          [0, 'Coiled in an S, the terciopelo tastes the air with its forked tongue.'],
          [1.15, 'The neck draws back; the loreal pits fix the warm target.'],
          [1.55, 'Strike: the mouth gapes and the hinged fangs swing erect.'],
          [2.3, 'Venom delivered, the snake recoils at once into its coil.'],
          [3.5, 'Vipers often let bitten prey run, then follow its scent trail.'],
        ],
      },
      sources: ['Sasa, Bonilla & Chaves 2019 (ICP)', 'ICP, *Bothrops asper*', 'Sasa, Wasko & Lamar 2009', 'IUCN Red List 2021'],
    },

    // ------------------------------------------------------------------ II
    {
      id: 'bocaraca',
      number: 'II',
      layout: 'plate',
      common: 'Bocaracá',
      commonAlt: 'Eyelash viper · oropel phase',
      scientific: 'Bothriechis nigroadspersus',
      authority: '(Steindachner, 1870)',
      family: 'Viperidae · Crotalinae',
      status: { code: 'LC', label: 'Least Concern', source: 'IUCN, as *B. schlegelii*' },
      badge: 'Venomous — dangerous',
      lede: 'Green, grey, pink or gold, the bocaracá waits coiled in shrubs and trees; the golden oropel is simply one of its costumes.',
      body: [
        'The bocaracá is a slender pit viper of wet lowland and foothill forest, from sea level to about 1,430\u00a0m, usually 50–70\u00a0cm long. Few snakes vary so much in colour: moss green, grey, brown, orange, even pink or white, plain or mottled like moss. The solid golden form, called oropel, is common in some areas — and, despite popular belief, it is the same species. A 2024 revision split the eyelash vipers into several species; Costa Rica’s bocaracá is now *Bothriechis nigroadspersus*, long filed under *B. schlegelii*, while a close relative, *B. supraciliaris*, lives on the Pacific slope of the Talamanca range.',
        'It lives in shrubs and trees and hunts mostly at night, from ambush. The prehensile tail anchors it to a twig while the forebody waits in a striking loop for frogs, lizards, birds — hummingbirds included — and bats and mice. Raised scales over each eye give the snake its English name; what they are for is still unproven. Females give birth to 6–23 live young, each 16–22\u00a0cm long.',
      ],
      facts: [
        ['Length', 'Usually 50–70\u00a0cm; to 92\u00a0cm'],
        ['Elevation', 'Sea level to about 1,430\u00a0m'],
        ['Habit', 'Arboreal; mostly nocturnal'],
        ['Young', '6–23 live young'],
        ['Formerly', '*Bothriechis schlegelii*'],
      ],
      lookCloser: [
        { label: 'eyelash-scales', text: 'The “eyelashes”: enlarged scales projecting over each eye. Camouflage and eye protection are guesses; neither is proven.' },
        { label: 'prehensile-tail', text: 'The short prehensile tail can hold the snake’s whole weight as it hangs from a branch.' },
        { label: 'loreal-pit', text: 'Even in a tree the loreal pit works, tracking warm-blooded prey such as a roosting bat or a hummingbird.' },
      ],
      didYouKnow: '*Oropel* is Spanish for brass beaten into a thin sheet to imitate gold — tinsel. The golden phase earned the name; beneath the gilt it is the same snake.',
      figure: {
        type: 'snake',
        params: { species: 'bothriechis-schlegelii', pose: 'branch', morph: 'oropel' },
        caption: 'Fig. 2 — Bocaracá, golden oropel phase, coiled on a branch with its tail anchored.',
        scaleNote: 'Adult, about 65\u00a0cm',
      },
      // Beats follow poses.js branch(): the coil holds its shape all loop, the
      // head sways continuously and the tongue flicks at 0.45, 2.35 and 4.2 s.
      animation: {
        title: 'Waiting on the branch',
        beats: [
          [0, 'Tail wrapped around the branch, the bocaracá holds a loose coil.'],
          [1, 'The head sways slowly, watching for movement.'],
          [2.3, 'The tongue flicks, sampling the air for scent.'],
          [3.6, 'Still anchored by its tail, it waits for prey to come within reach.'],
        ],
      },
      sources: ['Arteaga et al. 2024', 'Sasa, Bonilla & Chaves 2019 (ICP)', 'ICP, *Bothriechis schlegelii*', 'IUCN Red List'],
    },

    // ------------------------------------------------------------------ III
    {
      id: 'coral',
      number: 'III',
      layout: 'plate',
      common: 'Coral',
      commonAlt: 'Central American coral snake',
      scientific: 'Micrurus nigrocinctus',
      authority: '(Girard, 1854)',
      family: 'Elapidae',
      status: { code: 'LC', label: 'Least Concern', source: 'IUCN Red List' },
      badge: 'Venomous — neurotoxic',
      lede: 'Its rings are a warning, not a key: the old rhyme fails in Central America, and only distance keeps a coral harmless.',
      body: [
        'The coral is a slender, semi-burrowing elapid, usually 50–75\u00a0cm long, common on the Pacific slope and in the Central Valley — in coffee farms, pastures and the gardens of San José and Heredia. Every ring circles the whole body: red, pale, black, pale, red. It hunts other snakes, swamp eels, caecilians and lizards. Two short fangs are fixed at the front of the upper jaw, and the venom blocks the signals between nerves and muscles; without antivenom a severe bite can paralyse breathing.',
        'The rhyme “red touches yellow, kills a fellow” comes from North America, and here it is no safe guide. Costa Rica’s coral gargantilla is ringed only in black and red (or black and white): red touches black, yet it is venomous. Pale rings may be yellow, cream or white, and harmless false corals such as *Erythrolamprus bizona* wear convincing copies of the warning. Treat every ringed snake as dangerous: most coral bites happen when someone picks one up, often a child or a teenager.',
      ],
      facts: [
        ['Length', '50–75\u00a0cm; to 1.15\u00a0m'],
        ['Range', 'Pacific slope, Central Valley'],
        ['Elevation', 'Sea level to 2,000\u00a0m'],
        ['Diet', 'Snakes, eels, caecilians'],
        ['Eggs', '5–14 per clutch'],
        ['Venom', 'Neurotoxic, paralysing'],
      ],
      lookCloser: [
        { label: 'red-ring', text: 'The red rings are complete, running all the way around the body, and slightly wider than the black.' },
        { label: 'yellow-ring', text: 'The narrow pale rings may be yellow, cream or white — one reason colour rhymes mislead.' },
        { label: 'black-ring', text: 'In this species each black ring sits between two pale rings and never touches red. The coral gargantilla breaks that rule.' },
        { label: 'fixed-fangs', name: 'Fixed front fangs', text: 'Two short fangs, fixed in place at the front of the upper jaw, deliver a nerve-blocking venom.' },
      ],
      didYouKnow: 'When threatened, a coral may curl the tip of its tail so that it looks like a head, drawing a predator’s attack away from the real one.',
      figure: {
        type: 'snake',
        params: { species: 'micrurus-nigrocinctus', pose: 'slither' },
        caption: 'Fig. 3 — Coral on the move by lateral undulation; note the complete rings.',
        scaleNote: 'Adult, about 70\u00a0cm',
      },
      animation: {
        title: 'Lateral undulation',
        beats: [
          [0, 'Waves of bending travel from head to tail.'],
          [1.4, 'Each curve pushes back against the ground; the body follows the head along one track.'],
          [2.6, 'The tail tip curls into a decoy head.'],
          [4.3, 'The circuit closes and the journey begins again.'],
        ],
      },
      sources: ['Sasa, Bonilla & Chaves 2019 (ICP)', 'ICP, *Micrurus nigrocinctus*', 'Solano 1988', 'Chandler 2019 (Orianne Society)'],
    },

    // ------------------------------------------------------------------ IV
    {
      id: 'cascabel',
      number: 'IV',
      layout: 'plate',
      common: 'Cascabel',
      commonAlt: 'Central American rattlesnake',
      scientific: 'Crotalus simus',
      authority: 'Latreille, 1801',
      family: 'Viperidae · Crotalinae',
      status: { code: 'LC', label: 'Least Concern', source: 'IUCN Red List' },
      badge: 'Venomous — dangerous',
      lede: 'Costa Rica’s only rattlesnake, at the southern edge of its range, rattles a warning from the dry forests and savannas of the northwest.',
      body: [
        'The cascabel is a heavy-bodied pit viper of seasonally dry country: the forests and savannas of Guanacaste and northern Puntarenas, with a population surviving in the drier western Central Valley. Adults usually measure 1–1.2\u00a0m and reach 1.8\u00a0m at most. Males grow larger than females, and rival males wrestle in a slow dance, each trying to force the other’s head down. Dark diamonds on a pale ground and a ridge along the front third of the spine mark it at a glance.',
        'The rattle is a chain of hollow, interlocking segments of keratin. One is added at each shed and end segments break away, so neither their number nor the rattle’s size tells the snake’s age. The venom changes with age: in newborns it is dominated by crotoxin, a nerve toxin, while adults inject mostly tissue-destroying metalloproteinases. Its venom is one of three used to raise Costa Rica’s antivenom for viper bites.',
      ],
      facts: [
        ['Length', 'Usually 1–1.2\u00a0m; to 1.8\u00a0m'],
        ['Range', 'Guanacaste, W Central Valley'],
        ['Habitat', 'Dry forest and savanna'],
        ['Young', 'Live-born'],
        ['Venom', 'Changes with age'],
        ['Formerly', '*Crotalus durissus*'],
      ],
      lookCloser: [
        { label: 'rattle', text: 'The rattle: hollow keratin segments that knock against one another when the tail vibrates.' },
        { label: 'rattle-button', name: 'Button', text: 'At the very tip sits the button, the rattle’s oldest segment, exposed at the snake’s first shed — and the first to break away.' },
        { label: 'loreal-pit', text: 'Like every Costa Rican viper it has a pair of loreal pits — two of the “four nostrils” of the tobobas.' },
        { label: 'venom-gland', text: 'Switch on the venom layer: the gland lies behind and below each eye. Newborns make mostly nerve toxin; adults, mostly tissue toxin.' },
      ],
      didYouKnow: 'Many snakes, the terciopelo among them, shiver their tails in dry leaves when alarmed. A 2016 study of 56 species suggests the rattle grew out of that habit.',
      figure: {
        type: 'snake',
        params: { species: 'crotalus-simus', pose: 'rattle' },
        caption: 'Fig. 4 — Cascabel in a defensive coil: head raised, rattle sounding.',
        scaleNote: 'Adult, about 1.4\u00a0m',
      },
      // Beats follow poses.js rattle(): the coil, raised tail and buzzing rattle
      // are held for the whole loop; the tongue flicks at 0.9, 2.3 and 4.1 s.
      animation: {
        title: 'The warning',
        beats: [
          [0, 'In its defensive coil, head and neck raised, the cascabel faces the intruder.'],
          [0.6, 'The raised rattle blurs as its segments knock together.'],
          [2.2, 'The head follows the intruder; the tongue flicks to taste the air.'],
          [3.6, 'The sound asks for distance. Give it.'],
        ],
      },
      sources: ['Sasa, Bonilla & Chaves 2019 (ICP)', 'ICP, *Crotalus simus*', 'Calvete et al. 2010', 'Allf et al. 2016'],
    },

    // ------------------------------------------------------------------ V
    {
      id: 'matabuey',
      number: 'V',
      layout: 'plate',
      common: 'Matabuey',
      commonAlt: 'Central American bushmaster',
      scientific: 'Lachesis stenophrys',
      authority: 'Cope, 1875',
      family: 'Viperidae · Crotalinae',
      status: { code: 'NT', label: 'Near Threatened', source: 'IUCN Red List, 2021' },
      badge: 'Venomous — dangerous',
      lede: 'Costa Rica’s longest viper keeps to deep, wet Caribbean forest — seldom seen, seldom blamed for a bite, and Near Threatened.',
      body: [
        'The matabuey — “ox-killer” — is Costa Rica’s longest viper: adults usually measure 1.9–2.1\u00a0m, and some reach 2.5\u00a0m. It lives in the wet forests of the Caribbean slope and northern lowlands, from sea level to about 1,100\u00a0m. Tan to cream with bold dark diamonds, it is also called *cascabel muda*, the “mute rattlesnake”: the pattern recalls the cascabel’s, but the tail ends in a short, hard spine instead of a rattle.',
        'By day it rests in burrows dug by armadillos and other mammals; by night it lies in ambush for small mammals. Unlike the terciopelo or the cascabel, it lays eggs — up to 18 in a clutch. Its venom is potent, but bites are rare: the snake is scarce and keeps to intact forest. The IUCN lists it as Near Threatened.',
      ],
      facts: [
        ['Length', 'Usually 1.9–2.1\u00a0m; to 2.5\u00a0m'],
        ['Range', 'Caribbean, northern lowlands'],
        ['Elevation', 'Sea level to 1,100\u00a0m'],
        ['Habit', 'Nocturnal; rests in burrows'],
        ['Eggs', 'Up to 18 per clutch'],
        ['Venom', 'Potent; bites are rare'],
      ],
      lookCloser: [
        { label: 'tail-spine', name: 'Spiny tail tip', text: 'No rattle: the tail ends in a short, hard spine.' },
        { label: 'eggs', text: 'Her clutch — among Costa Rica’s vipers, only the two bushmasters lay eggs.' },
        { label: 'keeled-scales', text: 'Each scale on the back is strongly keeled and raised, like a tiny knuckle.' },
      ],
      didYouKnow: 'Bushmasters are probably the only vipers in the Americas that lay eggs. Costa Rica has two: the matabuey of the Caribbean and the plato negro of the southern Pacific.',
      figure: {
        type: 'snake',
        params: { species: 'lachesis-stenophrys', pose: 'ambush' },
        caption: 'Fig. 5 — Matabuey coiled around her clutch, head turned outward.',
        scaleNote: 'Adult, about 2\u00a0m',
      },
      // Beats follow poses.js ambush(): tongue out 0.9–1.5 s and 4.0–4.5 s,
      // tail tip vibrating 2.1–3.5 s, breathing all loop; the eggs layer is on
      // by default, so the figure shows a female coiled around her clutch —
      // hence 'On guard' rather than the pose's name, 'ambush'.
      animation: {
        title: 'On guard',
        beats: [
          [0, 'Coiled around her clutch, the matabuey waits, motionless.'],
          [0.9, 'Her tongue samples the air; slow breathing stirs the coils.'],
          [2.1, 'Disturbed, the tail tip quivers — a warning many vipers share.'],
          [3.8, 'The tail falls still; the tongue flicks once more.'],
        ],
      },
      sources: ['Sasa, Bonilla & Chaves 2019 (ICP)', 'ICP, *Lachesis stenophrys*', 'IUCN Red List 2021', 'The Reptile Database'],
    },

    // ------------------------------------------------------------------ VI
    {
      id: 'serpiente-marina',
      number: 'VI',
      layout: 'plate',
      common: 'Serpiente marina',
      commonAlt: 'Yellow-bellied sea snake',
      scientific: 'Hydrophis platurus',
      authority: '(Linnaeus, 1766)',
      family: 'Elapidae · Hydrophiinae',
      status: { code: 'LC', label: 'Least Concern', source: 'IUCN Red List' },
      badge: 'Venomous — rarely bites',
      lede: 'The only sea snake to reach the Americas spends its whole life adrift in the Pacific — and must wait for rain to drink.',
      body: [
        'Black above, yellow below and finished with a flat, spotted, oar-shaped tail, the serpiente marina (long known as *Pelamis platurus*) is Costa Rica’s only sea snake and one of the most widely distributed snakes on Earth, ranging across the Indian and Pacific oceans to the coasts of the Americas. Here it lives off the Pacific coast and is especially common in bays and gulfs — Bahía Culebra, in Guanacaste, is named for it. It is born, feeds and breeds at sea, and moves clumsily on land.',
        'It hunts by drifting motionless along slicks and lines of floating debris, where small fish gather beneath it for shelter. It does not drink seawater: off Guanacaste, these snakes may stay dehydrated for six or seven months, then drink from the thin layer of fresh water that heavy rain leaves on the sea. In the inner Golfo Dulce lives a smaller, almost entirely yellow population that hunts at night, described in 2017 as the subspecies *xanthos* — a rank still debated.',
      ],
      facts: [
        ['Length', 'Usually 50–90\u00a0cm; to 1.14\u00a0m'],
        ['Range', 'Pacific coast and open sea'],
        ['Diet', 'Small fish'],
        ['Young', 'Live-born at sea'],
        ['Venom', 'Potent; tiny fangs'],
        ['Bites', 'Very rare'],
      ],
      lookCloser: [
        { label: 'paddle-tail', text: 'Flattened from side to side, the tail is a paddle, spotted black on yellow.' },
        { label: 'yellow-venter', name: 'Yellow belly', text: 'The yellow belly and flanks give it its English name; in Golfo Dulce it is yellow almost all over.' },
        { label: 'nostril', text: 'It must surface to breathe air, though it can take up some oxygen through its skin while submerged.' },
        { label: 'tongue', name: 'Forked tongue', text: 'Beneath the tongue a salt gland sheds excess salt — yet the snake still depends on rain to drink.' },
      ],
      didYouKnow: 'Strandings are most frequent in December and January, early in the dry season, when wind and water temperature drive sea snakes ashore. A stranded sea snake is still venomous: never pick one up.',
      figure: {
        type: 'snake',
        params: { species: 'hydrophis-platurus', pose: 'swim' },
        caption: 'Fig. 6 — Serpiente marina swimming; the flattened tail drives it through the water.',
        scaleNote: 'Adult, about 75\u00a0cm',
      },
      animation: {
        title: 'Swimming',
        beats: [
          [0, 'Waves of bending run down the body.'],
          [1.2, 'The flattened tail pushes against the water like an oar.'],
          [2.8, 'Flattened from side to side, the whole body helps to push.'],
        ],
      },
      sources: ['Sasa, Bonilla & Chaves 2019 (ICP)', 'Lillywhite et al. 2014', 'Brischoux & Lillywhite 2011', 'Bessesen & Galbreath 2017'],
    },

    // ------------------------------------------------------------------ VII
    {
      id: 'bequer',
      number: 'VII',
      layout: 'plate',
      common: 'Béquer',
      commonAlt: 'Central American boa',
      scientific: 'Boa imperator',
      authority: 'Daudin, 1803',
      family: 'Boidae',
      status: { code: 'LC', label: 'Least Concern', source: 'IUCN Red List' },
      badge: 'Constrictor · no fangs',
      lede: 'Costa Rica’s largest snake kills not with venom but by stopping its prey’s blood flow — and boas can feel a heartbeat through their coils.',
      body: [
        'The béquer, long treated as a subspecies, *Boa constrictor imperator*, is heavy and muscular, usually 2–2.5\u00a0m long, though none longer than 3.8\u00a0m has been recorded in Costa Rica. It lives on both slopes and in the Central Valley, in rain forest and dry forest from sea level to about 1,650\u00a0m, and often around farms and houses. It has no venom. Rats, agoutis, opossums, bats, birds and iguanas are all on its menu, seized with rows of sharp, backward-curving teeth.',
        'It kills by constriction, though not by slow suffocation: in laboratory trials, boas stopped their prey’s circulation within minutes. Boas also feel the heartbeat through their coils, squeezing harder and longer while it continues. As one stretch of the body grips, the snake can shift its breathing to ribs elsewhere along the trunk. Near the vent, two claw-like spurs are the visible tips of vestigial hind legs, whose tiny thigh and hip bones lie hidden in the muscle; males, whose spurs are larger, use them in courtship. Females bear live young.',
      ],
      facts: [
        ['Length', 'Usually 2–2.5\u00a0m'],
        ['Range', 'Both slopes, Central Valley'],
        ['Elevation', 'Sea level to 1,650\u00a0m'],
        ['Diet', 'Mammals, birds, lizards'],
        ['Young', 'Live-born'],
        ['Venom', 'None; constricts prey'],
      ],
      lookCloser: [
        { label: 'pelvic-spur', text: 'Beside the vent: a pelvic spur, the claw-capped tip of a vestigial hind leg; a tiny thigh bone and hip bone lie in the muscle beneath.' },
        { label: 'recurved-teeth', text: 'Backward-curving teeth hold struggling prey and help draw it in.' },
        { label: 'eye-stripe', text: 'A dark stripe runs from the snout back through each eye.' },
        { label: 'ribs', text: 'A pair of ribs rides on every trunk vertebra — the tail has none; a boa can breathe with one section while another squeezes.' },
      ],
      didYouKnow: 'In laboratory trials, a boa’s coils halved its prey’s arterial blood pressure within about six seconds. Constriction works on the blood, not the breath.',
      figure: {
        type: 'snake',
        params: { species: 'boa-imperator', pose: 'constrict' },
        caption: 'Fig. 7 — Béquer tightening its coils around a black rat.',
        scaleNote: 'Adult, about 2\u00a0m',
      },
      // The prey is a black rat, *Rattus rattus* (Aguilar-López &
      // Tapia-Ramírez 2025: the first record of a béquer eating one), drawn at
      // real scale in two loops round its chest and belly (Boback et al.
      // 2015). The lab trials used laboratory rats, so the body and the
      // did-you-know say "prey", never "black rats". Beats follow poses.js
      // constrict(): loose to 0.6 s, tightening to 1.5 s, held to 2.7 s,
      // released by 3.8 s.
      animation: {
        title: 'Constriction',
        beats: [
          [0, 'The coils settle around the rat’s chest.'],
          [0.7, 'They tighten, pressing on the rat’s chest and blood vessels.'],
          [1.8, 'Through its coils the boa senses the heartbeat and holds on.'],
          [2.8, 'The pressure eases and the coils relax.'],
        ],
      },
      sources: ['Solórzano & Sasa 2024', 'Boback et al. 2012, 2015', 'Capano et al. 2022', 'Sasa, Bonilla & Chaves 2019 (ICP)', 'Aguilar-López & Tapia-Ramírez 2025'],
    },
  ],

  back: {
    note: {
      title: 'If a Snake Bites',
      paragraphs: [
        'Snakebite is a medical emergency, and a treatable one. Each year some 500 to 600 people in Costa Rica need hospital care for a bite, yet deaths have become rare. Antivenom is the specific and most effective treatment, given intravenously by medical staff — never in the field. Costa Rica’s antivenoms are made by the Instituto Clodomiro Picado of the Universidad de Costa Rica.',
        'If someone is bitten, call 9-1-1 and go at once to the nearest clinic or hospital, even if the bite seems minor: a coral snake’s bite may hurt little at first, yet paralysis can follow hours later. Keep the person calm, still and accompanied; immobilise the bitten limb if that causes no delay; remove rings, watches and bracelets before swelling begins; wash the bite with soap and water; note the time.',
        'Do not apply a tourniquet, cut the wound, suck it or use a suction device, apply ice, or give alcohol, medicines or home remedies. Do not try to catch or kill the snake: doctors treat the symptoms, and a second bite helps no one.',
        'Prevention is simpler still: wear closed boots, carry a light at night, look before placing hands or feet, and never handle a snake — not even a dead one.',
      ],
    },
    glossary: [
      ['Antivenom', 'Purified antibodies, in Costa Rica raised in horses, that neutralise venom in the bloodstream; the specific, most effective treatment for envenoming.'],
      ['Caudal luring', 'Wriggling a contrasting tail tip to draw prey within striking range.'],
      ['Crotalinae', 'The pit vipers: the subfamily of vipers with a heat-sensing loreal pit. Every viper in the Americas belongs to it.'],
      ['Elapidae', 'Family of venomous snakes with short, fixed front fangs — coral snakes and the sea snake here, cobras and mambas elsewhere.'],
      ['Keeled scale', 'A scale with a ridge along its midline, giving the skin a rough look.'],
      ['Loreal pit', 'Heat-sensing organ in a hollow between eye and nostril; it lets pit vipers locate warm prey in darkness.'],
      ['Mimicry', 'Resemblance of one species to another; harmless false corals gain protection by looking like venomous ones.'],
      ['Neurotoxin', 'A toxin that acts on the nervous system; those of coral snakes, the sea snake and young cascabeles block the signals from nerves to muscles, causing paralysis.'],
      ['Oviparous', 'Laying eggs that develop and hatch outside the mother’s body.'],
      ['Prehensile', 'Able to grip, as the tail of an eyelash viper grips a branch.'],
      ['Solenoglyph', 'Viper dentition: long, hollow fangs that fold against the palate and swing forward to strike.'],
      ['Tobobas', 'Costa Rican name for the pit vipers.'],
      ['Ventral scutes', 'The single row of broad belly plates that grip the ground as a snake moves.'],
      ['Viviparous', 'Giving birth to live young; older texts say ovoviviparous.'],
    ],
    // Every work cited on a plate or in the note has a full entry here: the
    // general works first, then plate order. ISO 4 journal abbreviations (with
    // no-break spaces) keep all of them on the one Sources page at a 90 %
    // auto-fit; the two Boback papers share an entry, as they share the
    // citation on plate VII.
    sources: [
      'Sasa, M., Bonilla, F. & Chaves, F. (2019). *Serpientes venenosas de Costa Rica: biología básica*. San José: Instituto Clodomiro Picado, Universidad de Costa Rica.',
      'Instituto Clodomiro Picado. Venomous snakes in Costa Rica: species accounts. icp.ucr.ac.cr (consulted November 2026).',
      'Savage, J. M. (2002). *The Amphibians and Reptiles of Costa Rica*. Chicago: University of Chicago Press.',
      'Uetz, P., Freed, P., Aguilar, R., et al. (eds.). The Reptile Database. reptile-database.org (consulted November 2026).',
      'IUCN. The IUCN Red List of Threatened Species. iucnredlist.org (consulted November 2026).',
      'Sasa, M., Wasko, D. K. & Lamar, W. W. (2009). Natural history of the terciopelo *Bothrops asper* (Serpentes: Viperidae) in Costa Rica. *Toxicon* 54: 904–922.',
      'Arteaga, A., Pyron, R. A., Batista, A., et al. (2024). Systematic revision of the eyelash palm-pitviper *Bothriechis schlegelii* (Serpentes, Viperidae), with the description of five new species and revalidation of three. *Evol. Syst.* 8: 15–64.',
      'Solano, A. (1988). Ciclos reproductivos de la serpiente coral *Micrurus nigrocinctus* (Serpentes: Elapidae) en Costa Rica. *Rev. Biol. Trop.* 36(2A): 235–239.',
      'Chandler, H. (2019). Coral snakes and their mimics. The Orianne Society. oriannesociety.org (consulted November 2026).',
      'Calvete, J. J., Sanz, L., Cid, P., et al. (2010). Snake venomics of the Central American rattlesnake *Crotalus simus* and the South American *Crotalus durissus* complex points to neurotoxicity as an adaptive paedomorphic trend along *Crotalus* dispersal in South America. *J. Proteome Res.* 9: 528–544.',
      'Allf, B. C., Durst, P. A. P. & Pfennig, D. W. (2016). Behavioral plasticity and the origins of novelty: the evolution of the rattlesnake rattle. *Am. Nat.* 188: 475–483.',
      'Brischoux, F. & Lillywhite, H. B. (2011). Light- and flotsam-dependent ‘float-and-wait’ foraging by pelagic sea snakes (*Pelamis platurus*). *Mar. Biol.* 158: 2343–2347.',
      'Lillywhite, H. B., Sheehy, C. M., Brischoux, F. & Grech, A. (2014). Pelagic sea snakes dehydrate at sea. *Proc. R. Soc. B* 281: 20140119.',
      'Bessesen, B. L. & Galbreath, G. J. (2017). A new subspecies of sea snake, *Hydrophis platurus xanthos*, from Golfo Dulce, Costa Rica. *ZooKeys* 686: 109–123.',
      'Boback, S. M., et al. (2012). Snake modulates constriction in response to prey’s heartbeat. *Biol. Lett.* 8: 473–476; (2015). Snake constriction rapidly induces circulatory arrest in rats. *J. Exp. Biol.* 218: 2279–2288.',
      'Capano, J. G., Boback, S. M., Weller, H. I., et al. (2022). Modular lung ventilation in *Boa constrictor*. *J. Exp. Biol.* 225: jeb243119.',
      'Solórzano, A. & Sasa, M. (2024). Failed predation of a newborn calf by the Central American common boa (*Boa imperator*) in Costa Rica. *Rev. Latinoam. Herpetol.* 7(1): 181–184.',
      'Aguilar-López, J. L. & Tapia-Ramírez, G. (2025). Depredación de *Rattus rattus* (Muridae) por *Boa imperator* (Boidae) en el sur de México. *Rev. Latinoam. Herpetol.* 8(4): 271–276.',
      'Fernández, P. & Gutiérrez, J. M. (2008). Mortality due to snakebite envenomation in Costa Rica (1993–2006). *Toxicon* 52: 530–533.',
    ],
    // Only what the imprint page does not already print: title and edition,
    // the imprint, the rendering engine and the typefaces are all there (and
    // 9-1-1 is on the facing note). Two lines leave the Sources page, the
    // fullest page of the book, room for the longer Spanish edition.
    colophon: [
      'Taxonomy follows The Reptile Database; conservation status follows the IUCN Red List.',
      'No snakes were handled in the making of this book.',
    ],
  },
};
