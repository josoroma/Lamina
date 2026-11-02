// Flores — A Living Herbarium of Costa Rica (Lámina · Volume II).
//
// Content manifest for the flowers book (CONTRACTS §6; plates, order and figure
// params exactly as §12 II). It is plain data so the typesetter, UI and figure
// host can all read it without importing any rendering code.
//
// Every factual statement is traced to a source in docs/books/flores-research.md,
// whose "Fact-check log" records each reviewer issue and how it was resolved.
// Text stays inside the §6 budgets so no printed page overflows, and lookCloser
// uses only the canonical flower label ids; a row's `name` prints the figure's
// label in the pill's exact words where the id alone reads differently
// ('labellum' → 'Labellum (lip)'). `status` carries global IUCN Red List
// assessments only, because the typesetter draws it as an IUCN chip; national or
// NatureServe ranks are recorded in the research dossier instead. Animation beats
// are timed to the figure modules in src/subjects/flowers/*, because the reader
// shows these manifest beats in preference to the figure's own.

export default {
  id: 'flores',
  title: 'Flowers',
  subtitle: 'A Living Herbarium of Costa Rica',
  kicker: 'Lámina · Volume II',
  author: 'Lámina Natural History Press',
  byline: { name: 'Josoroma', mark: 'josoroma' }, // the author, foil-stamped on both boards
  edition: 'First edition, 2026',
  locale: 'en',
  blurb: 'Six Costa Rican flowers to turn, open and understand, from the national orchid to a water lily that opens by day.',
  imprint: [
    'Accepted scientific names follow the World Checklist of Vascular Plants (Plants of the World Online), with authorities and places of publication checked against the International Plant Names Index; conservation categories follow the IUCN Red List (all checked November 2026).',
  ],

  theme: {
    style: 'lithograph',
    cloth: '#45193a', // deep plum book cloth
    foil: '#c9a44c', // gold foil stamping
    paper: '#fbf8f1',
    ink: '#1c1a17',
    accent: '#a8205f', // guaria magenta (6.5:1 on paper)
    muted: '#7b7466',
    endpaper: { motif: 'leaves', color: '#45193a', ground: '#f2e9e2' },
    fonts: { display: 'Cormorant Garamond', body: 'EB Garamond', label: 'IBM Plex Sans Condensed', mono: 'IBM Plex Mono' },
  },

  intro: {
    title: 'Flowers Are Negotiations',
    paragraphs: [
      'Costa Rica is small; its flora is not. The *Manual de Plantas de Costa Rica*, finished in 2020 after more than three decades of work, describes over 9,000 species of seed plants, and with the ferns the country counts more than 11,000 species of vascular plants. Orchids alone number nearly 1,700 species, and about three in ten grow nowhere else.',
      'This book reads each flower as a negotiation. Colour, shape and scent are the offer; nectar or pollen is the payment; a hummingbird’s head or a bee’s back carries the goods. Some bargains are generous: the cortez amarillo feeds large bees, and the granadilla de monte pays hermit hummingbirds in nectar. Some are guarded: the platanilla keeps its stamens coiled until a bill probes inside. Some are bluffs: the guaria morada, the national flower, pays its pollinators nothing at all.',
      'Each plate pairs a page of natural history with a living figure. Turn it, open it, take it apart whorl by whorl; every animation completes its cycle in five seconds. Then look for the real flowers in the field, and leave them where they grow.',
    ],
    pullQuote: 'Colour is the offer and nectar the payment — though sometimes the payment never comes.',
  },

  howTo: {
    title: 'How to Use This Book',
    items: [
      ['Drag a page corner', 'Lift the leaf and turn it like paper.'],
      // An upright screen (phone or tablet, not a landscape phone) frames one page: there a tap
      // anywhere reads on and the arrows step one page (Reader's portrait mode), hence no "spread".
      ['Click, tap or swipe', 'Turn forward on the right-hand page, back on the left; when one page fills the\u00a0screen, a tap reads on.'],
      ['Arrow keys', 'Page through the book from the keyboard.'],
      ['Drag the figure', 'Rotate the living plate on its turntable.'],
      ['Double-click the figure', 'Inspect it up close; double-click again to step back.'],
      ['Layers · Explode · Labels', 'Peel away parts, dissect the flower whorl by whorl and name what you see, from the toolbar.'],
      ['Export', 'Save the figure as a colour or line-art SVG drawing.'],
    ],
  },

  plates: [
    {
      id: 'guaria-morada',
      number: 'I',
      layout: 'plate',
      common: 'Guaria morada',
      commonAlt: 'Easter orchid',
      scientific: 'Guarianthe skinneri',
      authority: '(Bateman) Dressler & W.E.Higgins, 2003',
      family: 'Orchidaceae · Asparagales',
      status: null,
      badge: 'National flower · CITES II',
      lede: 'Costa Rica’s national flower is a beautiful bluff: it courts bees with colour and pays them nothing.',
      body: [
        '*Guarianthe skinneri* lives on trees, gripping bark with its roots in seasonal and wet forests from southern Mexico through Central America. Each growth is a pseudobulb, a swollen stem that banks water for the dry months and carries two leathery leaves; old plants form dense clumps up to half a metre tall. Late in the dry season a short spray of four to twelve rose-purple flowers opens, with broad, wavy petals and a lip rolled into a funnel over the column, its throat washed with white.',
        'The display is a promise the flower does not keep. Dissected blooms hold no nectar, yet orchid bees come anyway. The plant’s only nectar beads from glands behind the sepals and feeds ants, which probably guard the flower and its fruit. In Florida, where the Mesoamerican bee *Euglossa viridissima* has naturalised, 18 of 25 bees watched at the flowers left with pollen packets, and 17 abandoned the plant after a single flower — a habit that favours crossing between plants. Admiration has cost the species dearly: collecting has thinned wild populations, and every orchid is listed by CITES.',
      ],
      facts: [
        ['Habit', 'Epiphytic orchid, clump-forming'],
        ['Size', 'To 50 cm; 4–12 flowers'],
        ['Flowering', 'Dry season, peak February–March'],
        ['Pollinators', 'Orchid bees (*Euglossa*), probably'],
        ['Habitat', 'Seasonal and wet forests'],
        ['Elevation', 'About 200–2,000 m'],
      ],
      lookCloser: [
        { label: 'labellum', name: 'Labellum (lip)', text: 'The lip rolls into a funnel over the column; a visiting bee must crawl inside.' },
        { label: 'column', text: 'Stamen and stigma fused into one organ; the pollen leaves in waxy packets.' },
        { label: 'pseudobulb', text: 'A swollen stem that stores water through the dry season.' },
      ],
      didYouKnow: 'Its genus, *Guarianthe*, was named only in 2003, joining the Costa Rican word *guaria* to the Greek *anthos*, “flower.” Costa Rica had declared it the national flower in June 1939, when it was still a *Cattleya*.',
      figure: {
        type: 'flower',
        params: { species: 'guarianthe-skinneri' },
        caption: 'Fig. I — *Guarianthe skinneri*: flowering spray above a pseudobulb and its two leaves.',
        scaleNote: 'Petals 4–6.7 cm long',
      },
      animation: {
        title: 'The bloom',
        beats: [
          [0, 'A spray of rose-purple flowers rises from its sheath above the pseudobulb.'],
          [0.25, 'Time-lapse: a bud opens into a full flower.'],
          [2.0, 'The lip flutters; its funnel leads a bee toward the column.'],
          [3.7, 'The time-lapse runs back: the new flower folds into its bud as the others sway.'],
        ],
      },
      sources: [
        'Ames & Correll 1953, Orchids of Guatemala',
        'Pemberton 2007, Lankesteriana 7(3)',
        'Dressler & Higgins 2003, Lankesteriana 7',
        'Epidendra, Jardín Botánico Lankester (UCR)',
        'Orozco Abarca 2020, Revista Herencia 33(1)',
      ],
    },

    {
      id: 'platanilla',
      number: 'II',
      layout: 'plate',
      common: 'Platanilla',
      commonAlt: 'Easter heliconia',
      scientific: 'Heliconia wagneriana',
      authority: 'Petersen, 1890',
      family: 'Heliconiaceae · Zingiberales',
      status: null,
      badge: 'Hummingbird-pollinated',
      lede: 'A spire of scarlet cups, filled by the plant itself and unlocked by a hummingbird’s bill.',
      body: [
        '*Heliconia wagneriana* is a giant herb of sunny forest edges, road cuts and stream banks, its paddle-shaped leaves rising from underground rhizomes. On Costa Rica’s Osa Peninsula its flower buds emerge in late December and it blooms through the dry season, from January to late April. Each shoot raises an erect spike of boat-shaped bracts, red edged with yellow and green; a new pair opens about every nine days, and a spike stays fresh for some eleven weeks. Inside each bract wait several slender flowers, white shading to dark green at the tip.',
        'The bracts are tanks. Each holds up to six millilitres of liquid, and experiments show the plant secretes it rather than relying on rain; drained spikes suffered more damage to their ovaries and more nectar theft by chewing insects. Fly larvae grow in these pools, and adult beetles crawl down into them to feed. The flowers are built for hummingbirds: when a bill probes for nectar, coiled stamens spring upward, likely pressing pollen onto the bird.',
      ],
      facts: [
        ['Habit', 'Giant rhizomatous herb'],
        ['Bracts', 'To 20 cm; 6 mL max.'],
        ['Flowering', 'January–late April (Osa)'],
        ['Pollinators', 'Hummingbirds'],
        ['Habitat', 'Sunny edges, streambanks, road cuts'],
        ['Range', 'S Mexico to Ecuador, Trinidad'],
      ],
      lookCloser: [
        { label: 'bract', text: 'Each boat-shaped bract is a cup the plant keeps filled with its own liquid.' },
        { label: 'flower', text: 'The true flowers are slender white tubes tipped with dark green; several wait inside each bract.' },
        { label: 'rachis', text: 'A new pair of bracts opens up the axis about every nine days.' },
        { label: 'hummingbird', text: 'Watch the bill: a probe for nectar triggers the spring-loaded stamens.' },
      ],
      didYouKnow: 'The stamens take about two seconds to unfurl. Researchers from Oregon State University described this “jack-in-the-box” mechanism in 2018, while studying heliconia pollination in Costa Rica.',
      figure: {
        type: 'flower',
        params: { species: 'heliconia-wagneriana' },
        caption: 'Fig. II — *Heliconia wagneriana*: erect inflorescence with a visiting hummingbird.',
        scaleNote: 'Bracts up to 20 cm long',
      },
      animation: {
        title: 'The visit',
        beats: [
          [0, 'A hummingbird hovers beside the spire of bracts.'],
          [0.45, 'It darts toward a flower emerging from a bract.'],
          [1.45, 'Its bill slides into the flower to sip nectar.'],
          [3.15, 'It backs away, carrying pollen to the next plant.'],
        ],
      },
      sources: [
        'Seifert & Seifert 1976, J. N.Y. Entomol. Soc. 84',
        'Wootton & Sun 1990, Biotropica 22(2)',
        'Gannon et al. 2018, Ecology 99(2)',
        'Museo Nacional de Costa Rica, Heliconias del Caribe Sur',
        'NTBG herbarium, Kress 90-2996',
      ],
    },

    {
      id: 'granadilla-de-monte',
      number: 'III',
      layout: 'plate',
      common: 'Granadilla de monte',
      commonAlt: 'Crimson passionflower',
      scientific: 'Passiflora vitifolia',
      authority: 'Kunth, 1817',
      family: 'Passifloraceae · Malpighiales',
      status: null,
      badge: 'One-day flowers',
      lede: 'A one-day scarlet flower on a vine that hires hummingbirds as couriers and ants as guards.',
      body: [
        '*Passiflora vitifolia* is a woody vine that climbs by coiling tendrils into the canopy of wet forests, clearings and edges, from sea level to about 1,600 metres in Costa Rica. Its three-lobed leaves recall a grapevine, hence *vitifolia*. The flower is pure theatre: five keeled sepals and five narrower petals, all scarlet; a corona in three ranks, its long outer filaments bright red or yellow; and a central column, the androgynophore, lifting five anthers and three stigmas.',
        'Each flower opens for a single day, and the vine cannot fertilise itself. In a Costa Rican population, hand-pollination showed that more than 450 pollen grains are needed for a full set of seed, yet visiting hermit hummingbirds delivered that much to only 28 percent of flowers. The leaves feed *Heliconius* longwing caterpillars, whose mothers lay eggs on fresh tendril tips; nectar glands on the leaf stalks recruit ants that hunt them.',
      ],
      facts: [
        ['Habit', 'Woody vine with coiling tendrils'],
        ['Flower', 'Scarlet; sepals 6–8 cm'],
        ['Flowering', 'Most of the year'],
        ['Pollinators', 'Hermit hummingbirds'],
        ['Habitat', 'Wet forest, gaps and edges'],
        ['Elevation', 'Sea level to 1,600 m'],
      ],
      lookCloser: [
        { label: 'corona', text: 'Rings of filaments form a target around the nectar chamber.' },
        { label: 'androgynophore', text: 'A central column lifts anthers and stigmas into a hummingbird’s path.' },
        { label: 'anther', text: 'Five anthers hang ready to dust a visitor with pollen.' },
        { label: 'tendril', text: 'Longwing butterflies lay their eggs on fresh tendril tips.' },
      ],
      didYouKnow: 'At Corcovado, 29 species of ants visited nectar glands on this and a related passionflower. Where ants were plentiful, nearly half the *Heliconius* caterpillars placed on the leaves died within two days.',
      figure: {
        type: 'flower',
        params: { species: 'passiflora-vitifolia' },
        caption: 'Fig. III — *Passiflora vitifolia*: open flower with tendril and three-lobed leaf.',
        scaleNote: 'Sepals 6–8 cm long',
      },
      animation: {
        title: 'A one-day flower',
        beats: [
          [0, 'Open: five scarlet sepals and five petals spread wide.'],
          [0.6, 'A wave ripples through the corona, ring within ring.'],
          [1.6, 'A tendril coils, searching for support.'],
          [2.75, 'Time-lapse: the flower closes, as it does after its single day…'],
          [3.6, '…and a fresh bud opens the next morning.'],
        ],
      },
      sources: [
        'Killip 1938, Field Mus. Bot. Ser. 19',
        'Snow 1982, Oecologia 55',
        'Smiley 1986, Ecology 67(2)',
        'Museo Nacional de Costa Rica 2020, Passiflora catalogue',
      ],
    },

    {
      id: 'labios-de-mujer',
      number: 'IV',
      layout: 'plate',
      common: 'Labios de mujer',
      commonAlt: 'Hot lips',
      scientific: 'Palicourea elata',
      authority: '(Sw.) Borhidi, 2011',
      family: 'Rubiaceae · Gentianales',
      status: { code: 'LC', label: 'Least Concern', source: 'IUCN Red List 2019' },
      badge: 'Bracts, not petals',
      lede: 'The famous lips are not petals but a pair of bracts, modified leaves painted red to catch the eye.',
      body: [
        '*Palicourea elata*, formerly *Psychotria elata* and before that *Cephaelis elata*, is a shrub or small tree of the coffee family, usually 0.5 to 5 metres tall. It is common in light gaps and along the edges of evergreen forest, from about 30 to 1,700 metres. Its smooth leaves stand in opposite pairs, joined by stipules. At the tip of a long stalk sits a dense head of flowers, clasped by two broad bracts of deep red to orange-red.',
        'The bracts do the advertising that tiny flowers cannot. From between them rise white, narrowly funnel-shaped flowers about two centimetres long, each with five pointed lobes, and hummingbirds and butterflies come to feed. It flowers all year, mainly from January to August, and its small fruits ripen blue, then black. Botanists moved it from *Psychotria* to *Palicourea* after DNA studies showed that its group belongs with the latter.',
      ],
      facts: [
        ['Habit', 'Shrub or small tree'],
        ['Height', '0.5–5 m'],
        ['Flowering', 'All year, mainly January–August'],
        ['Visitors', 'Hummingbirds and butterflies'],
        ['Habitat', 'Forest edges and light gaps'],
        ['Elevation', '30–1,700 m'],
      ],
      lookCloser: [
        { label: 'bract', text: 'The “lips” are two bracts: modified leaves that advertise the flower head.' },
        { label: 'flower', text: 'Small white trumpets with five pointed lobes rise between the bracts.' },
        { label: 'leaf', text: 'Opposite leaves linked by stipules mark the coffee family.' },
      ],
      didYouKnow: 'Not every pair of lips is red. A yellow-bracted form also grows in Costa Rica, and it appears most common in the Valle de El General and around the Golfo Dulce.',
      figure: {
        type: 'flower',
        params: { species: 'palicourea-elata' },
        caption: 'Fig. IV — *Palicourea elata*: flower head clasped by its two red bracts.',
        scaleNote: 'Bracts 1.5–5.5 cm long',
      },
      animation: {
        title: 'The lips part',
        beats: [
          [0, 'Two red bracts clasp the flower head.'],
          [0.55, 'The bracts part like lips.'],
          [1.15, 'White five-lobed flowers rise between them.'],
          [3.9, 'The flowers sink back and the lips close again.'],
        ],
      },
      sources: [
        'Burger & Taylor 1993, Fieldiana Bot. n.s. 33',
        'Condit 2019, IUCN Red List',
        'Borhidi 2011, Acta Bot. Hung. 53',
        'Berger 2017, PhytoKeys 80',
      ],
    },

    {
      id: 'cortez-amarillo',
      number: 'V',
      layout: 'plate',
      common: 'Cortez amarillo',
      commonAlt: 'Yellow trumpet tree',
      scientific: 'Handroanthus ochraceus',
      authority: '(Cham.) Mattos, 1970',
      family: 'Bignoniaceae · Lamiales',
      status: { code: 'LC', label: 'Least Concern', source: 'IUCN Red List 2023' },
      badge: 'Dry-season mass bloom',
      lede: 'For a few days in the dry season, a bare grey tree turns entirely to gold.',
      body: [
        '*Handroanthus ochraceus*, formerly *Tabebuia ochracea*, is a tree of 8 to 25 metres in the seasonally dry forests of Costa Rica’s Pacific slope, from near sea level to about 900 metres. It sheds its five-fingered leaves as the dry season deepens. Once the bare tree has recovered from drought stress — often, though not always, after a stray dry-season shower — clusters of sweet-scented yellow trumpets, 3.6 to 7.5 centimetres long, open at the branch tips, their throats lined with fine red guides.',
        'Flowering is often explosive: whole stands open together, each display lasting four or five days and every corolla falling after a single day. Euglossine and other large bees work the flowers, while hummingbirds and carpenter bees often steal nectar. Within weeks, long, hairy pods split to release papery, winged seeds that drift on the wind as the dry season ends and the first rains arrive. The heavy, durable heartwood has long been prized.',
      ],
      facts: [
        ['Habit', 'Deciduous tree'],
        ['Height', '8–25 m'],
        ['Flowering', 'Dry season, on leafless branches'],
        ['Pollinators', 'Euglossine and other large bees'],
        ['Habitat', 'Pacific-slope dry forest'],
        ['Elevation', '5–900 m'],
      ],
      lookCloser: [
        { label: 'corolla', text: 'Each golden trumpet lasts a single day, then falls.' },
        { label: 'nectar-guides', text: 'Fine red lines inside the throat lead bees to the nectar.' },
        { label: 'calyx', text: 'The bell-shaped calyx is densely woolly with yellowish hairs.' },
        { label: 'branch', text: 'Flowers crowd the tips of bare branches, before new leaves appear.' },
      ],
      didYouKnow: 'In April 1997, at Santa Rosa in Guanacaste, the leafless cortezes burst into flower together after a spell of cold nights in which no rain fell at all; cold, it seems, can cue the bloom too.',
      figure: {
        type: 'flower',
        params: { species: 'handroanthus-ochraceus' },
        caption: 'Fig. V — *Handroanthus ochraceus*: flower cluster on a leafless branch tip.',
        scaleNote: 'Corollas 3.6–7.5 cm long',
      },
      animation: {
        title: 'A one-day trumpet',
        beats: [
          [0, 'Golden trumpets crowd the bare branch tips, swaying in the dry-season wind.'],
          [0.9, 'A spent corolla, one day old, lets go; its calyx stays on the twig.'],
          [2.55, 'It lands on the ground below.'],
          [3.7, 'A fresh bud opens: each cluster blooms for four or five days.'],
        ],
      },
      sources: [
        'Burger & Gentry 2000, Fieldiana Bot. n.s. 41',
        'Reich & Borchert 1982, Ecology 63(2)',
        'Lobo Segura 2019, Rev. Biol. Trop. 67',
        'Sullivan et al. 1998, ACG species page',
        'Barstow 2023, IUCN Red List',
      ],
    },

    {
      id: 'nenufar',
      number: 'VI',
      layout: 'plate',
      common: 'Nenúfar',
      commonAlt: 'Dotleaf water lily',
      scientific: 'Nymphaea ampla',
      authority: '(Salisb.) DC., 1821',
      family: 'Nymphaeaceae · Nymphaeales',
      status: null,
      badge: 'Opens by day',
      lede: 'A white flower that opens by day on still water, from one of the oldest lineages of flowering plants.',
      body: [
        '*Nymphaea ampla* roots in the mud of ponds and quiet backwaters and floats its leaves on long stalks. The pads, up to 45 centimetres across, are coarsely toothed, green above and purplish beneath, often mottled with dark spots. Its white flowers, 8 to 16 centimetres wide, rise just above the water and open by day: four sepals streaked with purple, tiers of white petals and a crowded ring of yellow stamens around the stigma.',
        'Water-lily flowers are usually female first. On the first day, the tips of the stamens wall in a pool of fluid on the stigma; a surfactant in it washes pollen from visiting insects, which sometimes drown. Later the anthers shed their own pollen. *N.\u00a0ampla* can also pollinate itself, its anthers opening on the first day. In Costa Rica it grows mainly in the humid lowlands of the Caribbean slope and around the Golfo Dulce; in Guanacaste\u2019s wetlands the similar *N.\u00a0pulchella* is much more common.',
      ],
      facts: [
        ['Habit', 'Rooted aquatic, floating leaves'],
        ['Size', 'Flowers 8–16 cm; pads 10–45 cm'],
        ['Opening', 'By day'],
        ['Pollinators', 'Probably bees, flies; can self'],
        ['Habitat', 'Ponds and quiet fresh water'],
        ['In Costa Rica', 'Mainly Caribbean lowlands, Golfo Dulce'],
      ],
      lookCloser: [
        { label: 'sepal', text: 'Four green sepals, streaked with purple, guard the bud.' },
        { label: 'stamens', text: 'Many yellow stamens ring the centre; the outer ones end in a slender tip that projects beyond the anther.' },
        { label: 'stigma', text: 'On day one the stigma cups a pool of fluid that washes pollen off visitors.' },
        { label: 'pad', text: 'Toothed pads, purplish and often spotted beneath, float on long stalks.' },
      ],
      didYouKnow: 'Water lilies belong to one of the earliest-branching lineages of living flowering plants. Their order, Nymphaeales, split from the main angiosperm tree before the ancestors of magnolias, grasses and orchids went their separate ways.',
      figure: {
        type: 'flower',
        params: { species: 'nymphaea-ampla' },
        caption: 'Fig. VI — *Nymphaea ampla*: open flower among floating pads.',
        scaleNote: 'Flower 8–16 cm across',
      },
      animation: {
        title: 'Opening by day',
        beats: [
          [0, 'Open by day: white petals ring a crown of yellow stamens.'],
          [0.8, 'Ripples spread from the flower’s stalk across the still water.'],
          [2.35, 'Time-lapse: the flower folds shut, as it does every day…'],
          [3.4, '…and opens again: sepals, outer petals, inner petals, stamens.'],
        ],
      },
      sources: [
        'Duke 1962, Ann. Missouri Bot. Gard. 49',
        'Wiersema 1988, Ann. Missouri Bot. Gard. 75',
        'Wiersema & Hellquist 1997, Flora of North America 3',
        'Manual de Plantas de Costa Rica, MBG newsletter 2005',
        'Costa Rican herbarium records via GBIF',
        'APG IV 2016, Bot. J. Linn. Soc. 181',
      ],
    },
  ],

  back: {
    note: {
      title: 'Look, Don’t Pick',
      paragraphs: [
        'Flowers like these are easier to photograph than to replace. Every orchid species is listed by CITES, the Convention on International Trade in Endangered Species of Wild Fauna and Flora: most in Appendix\u00a0II, so international trade requires permits, and a small minority \u2014 chiefly slipper orchids such as Costa Rica\u2019s *Phragmipedium* \u2014 in Appendix\u00a0I, where commercial trade in wild-collected plants is barred. Costa Rica has been a party to CITES since 1975, and SINAC, the national conservation agency, is its CITES Management Authority for plants.',
        'At home, the Wildlife Conservation Law (Ley\u00a07317) requires a SINAC permit to collect wild plants, and the National Parks Law (Ley\u00a06084) forbids visitors to remove plants from national parks.',
        'So look, don’t pick. Photograph the guaria morada on its branch and leave the heliconia spike to the hummingbirds. Buy orchids only from nurseries that propagate their own plants. Stay on trails, never strip epiphytes from trees, and report suspected plant trafficking to SINAC.',
      ],
    },
    glossary: [
      ['Androgynophore', 'In passionflowers, the central stalk that raises the stamens and ovary above the petals.'],
      ['Bract', 'A modified leaf that accompanies a flower or flower cluster, often brightly coloured.'],
      ['Column', 'In orchids, a single organ formed by the fused stamen, style and stigma.'],
      ['Corona', 'A ring of filaments or scales between the petals and stamens, as in passionflowers.'],
      ['Epiphyte', 'A plant that grows on another plant for support, without drawing food from it.'],
      ['Extrafloral nectary', 'A nectar gland outside the flower, often a reward for protective ants.'],
      ['Food deception', 'Pollination by a flower that advertises a food reward but offers none.'],
      ['Labellum', 'The lip of an orchid: a modified petal that guides and receives pollinators.'],
      ['Nectar guide', 'Lines or spots on a flower that lead visitors towards the nectar.'],
      ['Pollinarium', 'An orchid’s unit of pollen transfer: waxy pollen masses (pollinia) that travel together with their stalks and, in many orchids, a sticky pad.'],
      ['Protogyny', 'A sequence in which a flower is receptive to pollen before it sheds its own.'],
      ['Pseudobulb', 'The thickened, water-storing stem of many epiphytic orchids.'],
      ['Rachis', 'The main axis of an inflorescence, bearing its bracts or flowers.'],
      ['Self-incompatibility', 'A genetic barrier that stops a plant’s own pollen from fertilising its ovules.'],
    ],
    sources: [
      'Ames, O. & Correll, D. S. 1952–1953. Orchids of Guatemala. Fieldiana: Botany 26(1–2). Chicago Natural History Museum.',
      'Burger, W. & Gentry, A. 2000. Flora Costaricensis, Family #194 Bignoniaceae. Fieldiana: Botany, new series 41. Field Museum of Natural History.',
      'Burger, W. & Taylor, C. M. 1993. Flora Costaricensis, Family #202 Rubiaceae. Fieldiana: Botany, new series 33: 1–333.',
      'Duke, J. A. 1962. Flora of Panama, Part IV, Fascicle 5 (Nymphaeaceae). Annals of the Missouri Botanical Garden 49: 137–255.',
      'Gannon, D. G., Kormann, U. G., Hadley, A. S., Betts, M. G. & Jones, F. A. 2018. The “jack-in-the-box” stamens of *Heliconia wagneriana* (Heliconiaceae). Ecology 99(2): 488–490.',
      'Jiménez Madrigal, Q. 2022. La gestación y culminación del Manual de Plantas de Costa Rica. Revista de Ciencias Ambientales 56(1): 268–283.',
      'Pemberton, R. W. 2007. Pollination of *Guarianthe skinneri*, an ornamental food deception orchid in southern Florida, by the naturalized orchid bee *Euglossa viridissima*. Lankesteriana 7(3): 461–468.',
      'Pupulin, F., Bogarín, D. & Karremans, A. P. 2023. The Lankester Catalogue of Costa Rican Orchidaceae. Lankesteriana 23 (Supplement): 1–254.',
      'Reich, P. B. & Borchert, R. 1982. Phenology and ecophysiology of the tropical tree, *Tabebuia neochrysantha* (Bignoniaceae). Ecology 63(2): 294–299.',
      'Snow, A. A. 1982. Pollination intensity and potential seed set in *Passiflora vitifolia*. Oecologia 55: 231–237.',
      'Wiersema, J. H. 1988. Reproductive biology of *Nymphaea* (Nymphaeaceae). Annals of the Missouri Botanical Garden 75: 795–804.',
      'Wootton, J. T. & Sun, I-F. 1990. Bract liquid as a herbivore defense mechanism for *Heliconia wagneriana* inflorescences. Biotropica 22(2): 155–159.',
    ],
    colophon: [
      'Lámina Natural History Press is a fictional imprint. Text, figures and design are original to this edition.',
      'The living plates are rendered with Three.js: WebGPURenderer and TSL node materials, compiled to WGSL on WebGPU and to GLSL on the WebGL 2 fallback.',
      'Typeset in Cormorant Garamond, EB Garamond, IBM Plex Sans Condensed and IBM Plex Mono.',
      'Figures are modelled at real scale in centimetres and fitted to the page; every animation loops in five seconds.',
      'No plant was picked, dug or collected to make this book.',
    ],
  },
};
