// Flores — Herbario vivo de Costa Rica (Lámina · Volumen II). Spanish edition.
//
// Spanish text for src/books/flores.js (design-i18n §2.1): a full-shape copy of the
// English manifest — same keys, same order, same array lengths — with every
// reader-visible string in Costa Rican scientific Spanish. At run time ids, figure
// params, numbers, beat times, label ids and the theme are taken from the English
// manifest, so the copies kept here must equal it. Translated from the snapshot of
// src/books/flores.js taken on 1 November 2026 at 21:59; synced on 2 November with the
// English edits made after it (the byline, how-to row 2; .scratch/bilingual/en-changes.md).
//
// Alternate English common names are explicitly omitted with commonAlt: null (L6).
// Facts and their sources: docs/books/flores-research.md. Style and termbase:
// docs/books/es-style.md. Term decisions for this book, their sources, the places
// where it departs from the style guide and open questions:
// docs/books/flores-es-notes.md. Typography: decimal comma, no thousands separator up
// to four digits and a no-break space from five, «» quotes, raya incisos with the
// closing raya kept, UICN category names with the UICN's capitals, a no-break space
// between a number and its unit. Every lookCloser row adds a Spanish `name` (review
// R1.1): the printed name of the structure the figure labels, exactly its pill text in
// src/i18n/es/flowers.js (lead decision L1). Revised the same day
// after review: the "Review" section of docs/books/flores-es-notes.md lists every change.

export default {
  id: 'flores',
  title: 'Flores',
  subtitle: 'Herbario vivo de Costa Rica',
  kicker: 'Lámina · Volumen II',
  author: 'Lámina Natural History Press',
  byline: { name: 'Josoroma', mark: 'josoroma' }, // the author, foil-stamped on both boards
  edition: 'Primera edición, 2026',
  locale: 'es',
  blurb: 'Seis flores costarricenses para girar, abrir y comprender, de la orquídea nacional a un nenúfar que se abre de día.',
  imprint: [
    'Los nombres científicos aceptados siguen la World Checklist of Vascular Plants (Plants of the World Online), con autores y lugares de publicación cotejados con el International Plant Names Index; las categorías de conservación siguen la Lista Roja de la UICN (todo consultado en noviembre de 2026).',
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
    title: 'Las flores negocian',
    paragraphs: [
      'Costa Rica es pequeña; su flora, no. El *Manual de Plantas de Costa Rica*, concluido en 2020 tras más de tres décadas de trabajo, describe más de 9000 especies de plantas con semilla; con los helechos, el país suma más de 11\u00a0000 especies de plantas vasculares. Solo de orquídeas hay casi 1700 especies, y cerca de tres de cada diez no crecen en ningún otro lugar.',
      'Este libro lee cada flor como una negociación. El color, la forma y el aroma son la oferta; el néctar o el polen, el pago; la cabeza de un colibrí o el dorso de una abeja lleva la mercancía. Hay tratos generosos: el cortez amarillo alimenta a abejas grandes, y la granadilla de monte paga en néctar a los colibríes ermitaños. Otros son cautelosos: la platanilla guarda enrollados sus estambres hasta que un pico hurga dentro. Y otros son puro engaño: la guaria morada, la flor nacional, no paga nada a sus polinizadores.',
      'Cada lámina une una página de historia natural con una figura viva. Gírela, ábrala, desármela verticilo a verticilo; cada animación completa su ciclo en cinco segundos. Luego busque las flores reales en el campo, y déjelas donde crecen.',
    ],
    pullQuote: 'El color es la oferta, y el néctar, el pago —aunque a veces el pago nunca llega—',
  },

  howTo: {
    title: 'Cómo usar este libro',
    items: [
      ['Arrastre una esquina de la página', 'Levante y pase la hoja, como en papel.'],
      // An upright screen (phone or tablet, not a landscape phone) frames one page: there a tap
      // anywhere reads on and the arrows step one page (Reader's portrait mode), hence no "doble página".
      ['Haga clic, toque o deslice', 'Avance en la página derecha y retroceda en la izquierda; si una página llena la\u00a0pantalla, toque para seguir.'],
      ['Teclas de flecha', 'Hojee el libro desde el teclado.'],
      ['Arrastre la figura', 'Gire la lámina viva sobre su plataforma giratoria.'],
      ['Haga doble clic en la figura', 'Examínela de cerca; otro doble clic la aleja.'],
      ['Capas · Despiece · Etiquetas', 'Desde la barra de herramientas, retire partes, diseccione la flor verticilo a verticilo y nombre lo que ve.'],
      ['Exportar', 'Guarde la figura como dibujo SVG en color o lineal.'],
    ],
  },

  plates: [
    {
      id: 'guaria-morada',
      number: 'I',
      layout: 'plate',
      common: 'Guaria morada',
      commonAlt: null,
      scientific: 'Guarianthe skinneri',
      authority: '(Bateman) Dressler & W.E.Higgins, 2003',
      family: 'Orchidaceae · Asparagales',
      status: null,
      badge: 'Flor nacional · CITES II',
      lede: 'La flor nacional de Costa Rica es un hermoso engaño: corteja a las abejas con color y no les paga nada.',
      body: [
        '*Guarianthe skinneri* vive sobre los árboles, aferrada a la corteza con sus raíces, en bosques estacionales y húmedos del sur de México a Centroamérica. Cada brote es un pseudobulbo, un tallo engrosado que guarda agua para los meses secos y lleva dos hojas coriáceas; las plantas viejas forman matas densas de hasta medio metro de alto. A finales de la estación seca se abre un racimo corto de cuatro a doce flores púrpura rosado, con pétalos anchos y ondulados y un labelo de garganta blanquecina, enrollado en embudo sobre la columna.',
        'El despliegue es una promesa que la flor no cumple. Las flores diseccionadas no tienen néctar, y aun así llegan abejas de las orquídeas. El único néctar de la planta brota de glándulas tras los sépalos y alimenta a hormigas, que probablemente custodian la flor y su fruto. En Florida, donde la abeja mesoamericana *Euglossa viridissima* se ha naturalizado, 18 de 25 abejas visitantes se fueron con paquetes de polen, y 17 dejaron la planta tras una sola flor —un hábito que favorece el cruce entre plantas—. La admiración le ha costado cara a la especie: la recolección ha mermado sus poblaciones silvestres, y toda orquídea figura en la CITES.',
      ],
      facts: [
        ['Hábito', 'Orquídea epífita, forma matas'],
        ['Tamaño', 'Hasta 50\u00a0cm; 4–12 flores'],
        ['Floración', 'Estación seca, pico febrero–marzo'],
        ['Polinizadores', 'Probablemente abejas *Euglossa*'],
        ['Hábitat', 'Bosques estacionales y húmedos'],
        ['Altitud', 'Unos 200–2000\u00a0m'],
      ],
      lookCloser: [
        { label: 'labellum', name: 'Labelo', text: 'El labelo forma un embudo sobre la columna: la abeja debe arrastrarse adentro.' },
        { label: 'column', name: 'Columna', text: 'Estambre y estigma fundidos en un órgano; el polen sale en paquetes cerosos.' },
        { label: 'pseudobulb', name: 'Pseudobulbo', text: 'Un tallo engrosado que almacena agua durante la estación seca.' },
      ],
      didYouKnow: 'Su género, *Guarianthe*, data apenas de 2003 y une la palabra costarricense *guaria* al griego *anthos*, «flor». Costa Rica la declaró flor nacional en junio de 1939, cuando aún era una *Cattleya*.',
      figure: {
        type: 'flower',
        params: { species: 'guarianthe-skinneri' },
        caption: 'Fig. I — *Guarianthe skinneri*: racimo en flor sobre un pseudobulbo y sus dos hojas.',
        scaleNote: 'Pétalos de 4–6,7\u00a0cm',
      },
      animation: {
        title: 'Floración',
        beats: [
          [0, 'Un racimo de flores púrpura rosado surge de su vaina sobre el pseudobulbo.'],
          [0.25, 'A cámara rápida, un botón se abre por completo.'],
          [2.0, 'El labelo ondea; su embudo guía a una abeja hacia la columna.'],
          [3.7, 'La cámara rápida retrocede: la flor nueva se repliega en botón y las otras se mecen.'],
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
      commonAlt: null,
      scientific: 'Heliconia wagneriana',
      authority: 'Petersen, 1890',
      family: 'Heliconiaceae · Zingiberales',
      status: null,
      badge: 'Polinizada por colibríes',
      lede: 'Una aguja de copas escarlata que la propia planta llena y el pico de un colibrí destraba.',
      body: [
        '*Heliconia wagneriana* es una hierba gigante de bordes soleados del bosque, taludes de caminos y orillas de quebradas, con hojas en forma de remo que nacen de rizomas. En la península de Osa echa botones a fines de diciembre y florece toda la estación seca, de enero a fines de abril. Cada brote alza una espiga erecta de brácteas en forma de bote, rojas con borde amarillo y verde; cada nueve días, más o menos, se abre un par nuevo, y la espiga sigue fresca unas once semanas. En cada bráctea esperan varias flores delgadas y blancas que viran a verde oscuro en la punta.',
        'Las brácteas son tanques de hasta seis mililitros; los experimentos muestran que la planta secreta el líquido sin depender de la lluvia, y las espigas vaciadas sufrieron más daño en los ovarios y más robo de néctar por insectos masticadores. En estas pozas crecen larvas de moscas, y escarabajos adultos bajan a ellas a alimentarse. Las flores están hechas para colibríes: cuando un pico busca néctar, los estambres enrollados saltan hacia arriba y probablemente aprietan polen contra el ave.',
      ],
      facts: [
        ['Hábito', 'Hierba gigante rizomatosa'],
        ['Brácteas', 'Hasta 20\u00a0cm y 6\u00a0mL'],
        ['Floración', 'Enero–fines de abril (Osa)'],
        ['Polinizadores', 'Colibríes'],
        ['Hábitat', 'Bordes soleados, quebradas, taludes'],
        ['Distribución', 'Sur de México a Ecuador, Trinidad'],
      ],
      lookCloser: [
        { label: 'bract', name: 'Bráctea', text: 'Cada bráctea en forma de bote es una copa que la planta llena con su líquido.' },
        { label: 'flower', name: 'Flor', text: 'Las flores verdaderas son tubos blancos y finos de punta verde oscuro; varias esperan en cada bráctea.' },
        { label: 'rachis', name: 'Raquis', text: 'Cada nueve días, más o menos, se abre otro par de brácteas eje arriba.' },
        { label: 'hummingbird', name: 'Colibrí', text: 'Observe el pico: al buscar néctar, dispara los estambres de resorte.' },
      ],
      didYouKnow: 'Los estambres tardan unos dos segundos en desplegarse. Investigadores de Oregon State University describieron este mecanismo de «caja sorpresa» en 2018, al estudiar la polinización de heliconias en Costa Rica.',
      figure: {
        type: 'flower',
        params: { species: 'heliconia-wagneriana' },
        caption: 'Fig. II — *Heliconia wagneriana*: inflorescencia erecta con un colibrí visitante.',
        scaleNote: 'Brácteas de hasta 20\u00a0cm',
      },
      animation: {
        title: 'La visita',
        beats: [
          [0, 'Un colibrí se cierne junto a la aguja de brácteas.'],
          [0.45, 'Se lanza hacia una flor que asoma de una bráctea.'],
          [1.45, 'Su pico se desliza en la flor para libar néctar.'],
          [3.15, 'Retrocede y lleva el polen a la siguiente planta.'],
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
      commonAlt: null,
      scientific: 'Passiflora vitifolia',
      authority: 'Kunth, 1817',
      family: 'Passifloraceae · Malpighiales',
      status: null,
      badge: 'Flores de un día',
      lede: 'Flor escarlata de un día; su bejuco contrata colibríes de mensajeros y hormigas de guardias.',
      body: [
        '*Passiflora vitifolia* es un bejuco leñoso que trepa enroscando zarcillos hasta el dosel de bosques húmedos, claros y bordes, desde el nivel del mar hasta unos 1600\u00a0m en Costa Rica. Sus hojas trilobuladas recuerdan las de la vid; de ahí *vitifolia*. La flor es puro teatro: cinco sépalos aquillados y cinco pétalos más angostos, todos escarlata; una corona en tres series, de largos filamentos externos rojo o amarillo vivo; y una columna central, el androginóforo, que alza cinco anteras y tres estigmas.',
        'Cada flor abre un solo día, y el bejuco no puede fecundarse a sí mismo. En una población costarricense, la polinización a mano mostró que hacen falta más de 450 granos de polen para que cuajen todas las semillas, pero los colibríes ermitaños llevaron esa cantidad solo al 28\u00a0% de las flores. Las hojas alimentan orugas de mariposas *Heliconius*, cuyas madres ponen huevos en las puntas tiernas de los zarcillos; glándulas de néctar en los pecíolos reclutan hormigas que las cazan.',
      ],
      facts: [
        ['Hábito', 'Bejuco leñoso con zarcillos'],
        ['Flor', 'Escarlata; sépalos 6–8\u00a0cm'],
        ['Floración', 'La mayor parte del año'],
        ['Polinizadores', 'Colibríes ermitaños'],
        ['Hábitat', 'Bosque húmedo, claros, bordes'],
        ['Altitud', 'Nivel del mar a 1600\u00a0m'],
      ],
      lookCloser: [
        { label: 'corona', name: 'Corona', text: 'Anillos de filamentos: una diana en torno a la cámara del néctar.' },
        { label: 'androgynophore', name: 'Androginóforo', text: 'Una columna central alza anteras y estigmas al paso del colibrí.' },
        { label: 'anther', name: 'Antera', text: 'Cinco anteras cuelgan para cubrir de polen al visitante.' },
        { label: 'tendril', name: 'Zarcillo', text: 'Las *Heliconius* desovan en la punta tierna de los zarcillos.' },
      ],
      didYouKnow: 'En Corcovado, 29 especies de hormigas visitaron las glándulas de néctar de esta y otra pasiflora afín. Donde abundaban las hormigas, casi la mitad de las orugas de *Heliconius* puestas en las hojas murió en dos días.',
      figure: {
        type: 'flower',
        params: { species: 'passiflora-vitifolia' },
        caption: 'Fig. III — *Passiflora vitifolia*: flor abierta con zarcillo y hoja trilobulada.',
        scaleNote: 'Sépalos de 6–8\u00a0cm',
      },
      animation: {
        title: 'Flor de un día',
        beats: [
          [0, 'Abierta: cinco sépalos escarlata y cinco pétalos extendidos.'],
          [0.6, 'Una onda recorre la corona, anillo dentro de anillo.'],
          [1.6, 'Un zarcillo se enrosca buscando apoyo.'],
          [2.75, 'A cámara rápida, la flor se cierra, como tras su único día…'],
          [3.6, '…y otro botón abre a la mañana siguiente.'],
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
      commonAlt: null,
      scientific: 'Palicourea elata',
      authority: '(Sw.) Borhidi, 2011',
      family: 'Rubiaceae · Gentianales',
      status: { code: 'LC', label: 'Preocupación Menor', source: 'Lista Roja de la UICN 2019' },
      badge: 'Brácteas, no pétalos',
      lede: 'Los famosos labios no son pétalos sino dos brácteas, hojas modificadas de un rojo que atrae la mirada.',
      body: [
        '*Palicourea elata*, antes *Psychotria elata* y, antes aún, *Cephaelis elata*, es un arbusto o arbolito de la familia del café, por lo general de 0,5 a 5\u00a0m de alto. Es común en claros y bordes de bosque siempreverde, de unos 30 a 1700\u00a0m. Sus hojas lisas forman pares opuestos unidos por estípulas. En la punta de un largo pedúnculo se asienta una cabezuela densa de flores, abrazada por dos brácteas anchas de rojo intenso a rojo anaranjado.',
        'Las brácteas hacen la publicidad que las diminutas flores no pueden. Entre ellas brotan flores blancas en embudo estrecho, de unos dos centímetros, cada una con cinco lóbulos agudos, y llegan colibríes y mariposas a alimentarse. Florece todo el año, sobre todo de enero a agosto, y sus frutos pequeños maduran azules y luego negros. Los botánicos la pasaron de *Psychotria* a *Palicourea* cuando estudios de ADN mostraron que su grupo pertenece al segundo género.',
      ],
      facts: [
        ['Hábito', 'Arbusto o arbolito'],
        ['Altura', '0,5–5\u00a0m'],
        ['Floración', 'Todo el año, más en enero–agosto'],
        ['Visitantes', 'Colibríes y mariposas'],
        ['Hábitat', 'Bordes de bosque y claros'],
        ['Altitud', '30–1700\u00a0m'],
      ],
      lookCloser: [
        { label: 'bract', name: 'Bráctea', text: 'Los «labios» son dos brácteas: hojas modificadas que anuncian la cabezuela.' },
        { label: 'flower', name: 'Flor', text: 'Trompetitas blancas de cinco lóbulos agudos brotan entre las brácteas.' },
        { label: 'leaf', name: 'Hoja', text: 'Hojas opuestas unidas por estípulas: marca de la familia del café.' },
      ],
      didYouKnow: 'No todos los labios son rojos. En Costa Rica también crece una forma de brácteas amarillas, que parece más común en el Valle de El General y alrededor del Golfo Dulce.',
      figure: {
        type: 'flower',
        params: { species: 'palicourea-elata' },
        caption: 'Fig. IV — *Palicourea elata*: cabezuela abrazada por sus dos brácteas rojas.',
        scaleNote: 'Brácteas de 1,5–5,5\u00a0cm',
      },
      animation: {
        title: 'Los labios se abren',
        beats: [
          [0, 'Dos brácteas rojas abrazan la cabezuela.'],
          [0.55, 'Las brácteas se abren como labios.'],
          [1.15, 'Entre ellas surgen flores blancas de cinco lóbulos.'],
          [3.9, 'Las flores bajan y los labios se cierran de nuevo.'],
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
      commonAlt: null,
      scientific: 'Handroanthus ochraceus',
      authority: '(Cham.) Mattos, 1970',
      family: 'Bignoniaceae · Lamiales',
      status: { code: 'LC', label: 'Preocupación Menor', source: 'Lista Roja de la UICN 2023' },
      badge: 'Floración masiva, estación seca',
      lede: 'Por unos días en la estación seca, un árbol gris y desnudo se vuelve todo de oro.',
      body: [
        '*Handroanthus ochraceus*, antes *Tabebuia ochracea*, es un árbol de 8 a 25\u00a0m del bosque seco estacional de la vertiente pacífica, desde casi el nivel del mar hasta unos 900\u00a0m. Bota sus hojas de cinco folíolos al avanzar la estación seca. Cuando el árbol desnudo se ha recuperado del estrés hídrico —a menudo, aunque no siempre, tras un aguacero aislado de la estación seca—, en la punta de las ramas abren ramilletes de trompetas amarillas de aroma dulce, de 3,6 a 7,5\u00a0cm, con finas guías rojas en la garganta.',
        'La floración suele ser explosiva: rodales enteros florecen a la vez, cada despliegue dura cuatro o cinco días y cada corola cae tras un solo día. Abejas euglosinas y otras grandes visitan las flores, y colibríes y abejas carpinteras a menudo roban néctar. En semanas, vainas largas y vellosas se abren y sueltan semillas aladas y papiráceas que el viento dispersa al acabar la estación seca y llegar las primeras lluvias. Su duramen, pesado y durable, se aprecia desde hace mucho.',
      ],
      facts: [
        ['Hábito', 'Árbol caducifolio'],
        ['Altura', '8–25\u00a0m'],
        ['Floración', 'Estación seca, en ramas sin hojas'],
        ['Polinizadores', 'Abejas euglosinas y otras grandes'],
        ['Hábitat', 'Bosque seco del Pacífico'],
        ['Altitud', '5–900\u00a0m'],
      ],
      lookCloser: [
        { label: 'corolla', name: 'Corola', text: 'Cada trompeta dorada dura un solo día y luego cae.' },
        { label: 'nectar-guides', name: 'Guías de néctar', text: 'Finas líneas rojas en la garganta guían a las abejas al néctar.' },
        { label: 'calyx', name: 'Cáliz', text: 'Cáliz acampanado, densamente lanoso, de pelos amarillentos.' },
        { label: 'branch', name: 'Rama', text: 'Flores apiñadas en la punta de ramas desnudas, antes del follaje nuevo.' },
      ],
      didYouKnow: 'En abril de 1997, en Santa Rosa (Guanacaste), los cortez sin hojas florecieron juntos tras una racha de noches frías sin una gota de lluvia; al parecer, el frío también puede inducir la floración.',
      figure: {
        type: 'flower',
        params: { species: 'handroanthus-ochraceus' },
        caption: 'Fig. V — *Handroanthus ochraceus*: ramillete en la punta de una rama sin hojas.',
        scaleNote: 'Corolas de 3,6–7,5\u00a0cm',
      },
      animation: {
        title: 'Trompeta de un día',
        beats: [
          [0, 'En las ramitas desnudas se mecen trompetas doradas al viento de la estación seca.'],
          [0.9, 'Una corola marchita, de un día, se suelta; su cáliz queda en la ramita.'],
          [2.55, 'Se posa en el suelo.'],
          [3.7, 'Abre un botón nuevo: cada ramillete florece cuatro o cinco días.'],
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
      commonAlt: null,
      scientific: 'Nymphaea ampla',
      authority: '(Salisb.) DC., 1821',
      family: 'Nymphaeaceae · Nymphaeales',
      status: null,
      badge: 'Abre de día',
      lede: 'Flor blanca que abre de día en aguas quietas, de uno de los linajes de plantas con flor más antiguos.',
      body: [
        '*Nymphaea ampla* arraiga en el lodo de lagunas y remansos, y sus hojas flotan sobre largos pecíolos. Las hojas, de hasta 45\u00a0cm de diámetro, son toscamente dentadas, verdes arriba y purpúreas abajo, a menudo con manchas oscuras. Sus flores blancas, de 8 a 16\u00a0cm de ancho, asoman justo sobre el agua y abren de día: cuatro sépalos estriados de púrpura, hileras de pétalos blancos y un apretado anillo de estambres amarillos en torno al estigma.',
        'Las flores de nenúfar suelen ser primero femeninas. El primer día, las puntas de los estambres cercan una poza de líquido sobre el estigma; un surfactante en ella lava el polen de los insectos visitantes, que a veces se ahogan. Luego las anteras sueltan su propio polen. *N.\u00a0ampla* también puede autopolinizarse: sus anteras abren el primer día. En Costa Rica crece sobre todo en las tierras bajas húmedas del Caribe y en torno al Golfo Dulce; en los humedales de Guanacaste es mucho más común la parecida *N.\u00a0pulchella*.',
      ],
      facts: [
        ['Hábito', 'Acuática arraigada, hojas flotantes'],
        ['Tamaño', 'Flores 8–16\u00a0cm; hojas 10–45\u00a0cm'],
        ['Apertura', 'De día'],
        ['Polinizadores', 'Probablemente abejas, moscas; puede autopolinizarse'],
        ['Hábitat', 'Lagunas y aguas dulces quietas'],
        ['En Costa Rica', 'Más en tierras bajas del Caribe, Golfo Dulce'],
      ],
      lookCloser: [
        { label: 'sepal', name: 'Sépalo', text: 'Cuatro sépalos verdes con estrías púrpura protegen el botón.' },
        { label: 'stamens', name: 'Estambres', text: 'Muchos estambres amarillos rodean el centro; en los externos, una punta fina rebasa la antera.' },
        { label: 'stigma', name: 'Estigma', text: 'El primer día, el estigma guarda un líquido que lava el polen a los visitantes.' },
        { label: 'pad', name: 'Hoja flotante', text: 'Hojas dentadas, de envés morado y a menudo manchado, flotan en largos pecíolos.' },
      ],
      didYouKnow: 'Los nenúfares integran uno de los linajes de plantas con flor actuales que divergieron primero. Su orden, Nymphaeales, se apartó del tronco principal de las angiospermas antes de que los ancestros de magnolias, gramíneas y orquídeas se separaran.',
      figure: {
        type: 'flower',
        params: { species: 'nymphaea-ampla' },
        caption: 'Fig. VI — *Nymphaea ampla*: flor abierta entre hojas flotantes.',
        scaleNote: 'Flor de 8–16\u00a0cm de ancho',
      },
      animation: {
        title: 'Se abre de día',
        beats: [
          [0, 'Abierta de día: pétalos blancos y una corona de estambres amarillos.'],
          [0.8, 'Desde el tallo de la flor se extienden ondas por el agua quieta.'],
          [2.35, 'A cámara rápida, la flor se pliega y cierra, como cada día…'],
          [3.4, '…y reabre: sépalos, pétalos externos e internos, estambres.'],
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
      title: 'Mire, no corte',
      paragraphs: [
        'Flores como estas son más fáciles de fotografiar que de reponer. Todas las especies de orquídeas figuran en la CITES, la Convención sobre el Comercio Internacional de Especies Amenazadas de Fauna y Flora Silvestres: la mayoría en el Apéndice\u00a0II, cuyo comercio internacional exige permisos, y una pequeña minoría —sobre todo orquídeas zapatilla como los *Phragmipedium* de Costa Rica— en el Apéndice\u00a0I, que prohíbe comerciar con plantas silvestres. Costa Rica es Parte de la CITES desde 1975, y el SINAC (Sistema Nacional de Áreas de Conservación) es su Autoridad Administrativa CITES para plantas.',
        'En el país, la Ley de Conservación de la Vida Silvestre (Ley\u00a07317) exige licencia del SINAC para recolectar flora, y la Ley del Servicio de Parques Nacionales (Ley\u00a06084) prohíbe a los visitantes extraer plantas de los parques.',
        'Así que mire, no corte. Fotografíe la guaria morada en su rama y deje la espiga de la heliconia a los colibríes. Compre orquídeas solo en viveros que propaguen sus propias plantas. Siga los senderos, nunca arranque epífitas de los árboles y denuncie al SINAC el posible tráfico de plantas.',
      ],
    },
    glossary: [
      ['Androginóforo', 'En las pasifloras, el eje central que eleva los estambres y el ovario por encima de los pétalos.'],
      ['Bráctea', 'Hoja modificada que acompaña a una flor o a una inflorescencia, a menudo de colores vivos.'],
      ['Columna', 'En las orquídeas, órgano único que fusiona estambre, estilo y estigma.'],
      ['Corona', 'Anillo de filamentos o escamas entre los pétalos y los estambres, como en las pasifloras.'],
      ['Epífita', 'Planta que crece sobre otra, que le sirve de soporte, sin alimentarse de ella.'],
      ['Nectario extrafloral', 'Glándula de néctar fuera de la flor; a menudo premia a hormigas protectoras.'],
      ['Engaño alimentario', 'Polinización por una flor que anuncia alimento pero no lo ofrece.'],
      ['Labelo', 'Labio de la orquídea: pétalo modificado que guía y recibe a los polinizadores.'],
      ['Guía de néctar', 'Líneas o manchas de una flor que guían a los visitantes al néctar.'],
      ['Polinario', 'Unidad de transporte del polen en las orquídeas: masas cerosas de polen (polinios) que viajan con sus pedículos y, en muchas, un disco adhesivo.'],
      ['Protoginia', 'Secuencia en la que una flor es receptiva al polen antes de liberar el suyo.'],
      ['Pseudobulbo', 'Tallo engrosado que almacena agua en muchas orquídeas epífitas.'],
      ['Raquis', 'Eje principal de una inflorescencia, que porta sus brácteas o flores.'],
      ['Autoincompatibilidad', 'Barrera genética que impide que el polen de una planta fecunde sus propios óvulos.'],
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
      'Lámina Natural History Press es un sello editorial ficticio. Textos, figuras y diseño son originales de esta edición.',
      'Las láminas vivas se dibujan con Three.js: WebGPURenderer y materiales de nodos TSL, compilados a WGSL en WebGPU y a GLSL en la alternativa WebGL 2.',
      'Compuesto en Cormorant Garamond, EB Garamond, IBM Plex Sans Condensed e IBM Plex Mono.',
      'Las figuras se modelan a escala real en centímetros y se ajustan a la página; cada animación es un ciclo de cinco segundos.',
      'Ninguna planta se cortó, arrancó ni recolectó para esta obra.',
    ],
  },
};
