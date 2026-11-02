// Serpientes — Atlas vivo de las serpientes de Costa Rica (book manifest, Spanish edition).
//
// Pure data, like the English manifest it mirrors: a full-shape copy of
// src/books/serpientes.js (same keys, same order, same array lengths;
// .scratch/bilingual/design-i18n.md §2), translated from the English text of
// 1 November 2026 and synced on 2 November with the English edits made after
// that snapshot (.scratch/bilingual/en-changes.md: the byline, the béquer's
// black rat and its new source, the two-line colophon). At run time every
// non-text value (ids, figure params,
// numbers, beat times, look-closer label ids, theme) comes from the English
// manifest; the copies here only keep the shape. Every fact is the English
// book's (audit trail: docs/books/serpientes-research.md); term decisions and
// their sources: docs/books/serpientes-es-notes.md.
//
// Conventions are those of docs/books/es-style.md: the reader is addressed as
// usted; decimal comma, no grouping below 10 000, a no-break space (\u00a0)
// between a number and its unit; «…» quotes; rayas closed around an inciso,
// the closing one kept before a full stop. Terms follow the Instituto
// Clodomiro Picado (foseta loreal, suero antiofídico, tobobas, escamas
// quilladas, puesta); the snakes are feminine (la terciopelo, la cascabel,
// la matabuey, la béquer) and the rattle masculine (el cascabel, el chischil
// where both meet in one sentence). UICN labels keep the UICN's capitals
// (es-style §3.5). common keeps the Costa Rican name; commonAlt is explicitly
// omitted in Spanish (lead decision L6). Binomials, authorities, plate source lines and
// bibliographic entries stay as in English (only "consulted" translates).
// Look-closer rows carry a printed `name` (review R1.1): exactly the Spanish
// of the figure's own label for that part, the pill text in
// src/i18n/es/snakes.js (lead decision L1), so the note and the pill agree.
// Beats translate the English beats, which were checked against the poses;
// nothing is re-timed.

export default {
  id: 'serpientes',
  title: 'Serpientes',
  subtitle: 'Atlas vivo de las serpientes de Costa Rica',
  kicker: 'Lámina · Volumen I',
  author: 'Lámina Natural History Press',
  byline: { name: 'Josoroma', mark: 'josoroma' },
  edition: 'Primera edición, 2026',
  locale: 'es',
  blurb:
    'Siete serpientes de Costa Rica, recreadas como láminas vivas: gírelas en sus manos, levánteles la piel y véalas atacar, nadar y constreñir.',
  imprint: [
    'Este atlas no es una clave de identificación ni sustituye la atención médica. Tras cualquier mordedura de serpiente en Costa Rica, llame al 9-1-1 y acuda al hospital o centro de salud más cercano.',
  ],
  credits: [
    'Datos verificados con el Instituto Clodomiro Picado (Universidad de Costa Rica), The Reptile Database, la Lista Roja de la UICN y la literatura primaria citada en «Fuentes».',
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
    title: '¿Por qué tantas serpientes?',
    paragraphs: [
      'Más de 140 especies de serpientes viven en Costa Rica —144 según el conteo de 2019 del Instituto Clodomiro Picado—, uno de los países con mayor diversidad de serpientes por kilómetro cuadrado del mundo. La geografía explica buena parte. Al cerrarse el istmo, hace unos 2,8\u00a0millones de años, las faunas de América del Norte y del Sur se encontraron en este estrecho puente de tierra. Entre el Caribe y el Pacífico, las cordilleras volcánicas y la de Talamanca, que alcanza 3821\u00a0m, dividen el país en tierras bajas húmedas o con estación seca y tierras altas frescas; hay serpientes desde la costa hasta casi 3000\u00a0m.',
      'La mayoría son inofensivas para la gente. Solo unas dos docenas son peligrosamente venenosas: diecisiete víboras de foseta, las tobobas, y seis elápidos —cinco corales y una serpiente marina—. Ningún lugar las reúne todas; cada región tiene su breve lista de especies peligrosas por aprender.',
      'Mire una serpiente de lejos, con las manos en los bolsillos. La forma de la cabeza y las pupilas engañan: la boa, sin veneno, tiene cabeza triangular y pupilas verticales. La única señal segura de una víbora es la foseta loreal, un termorreceptor entre el ojo y la narina que da a las tobobas sus «cuatro narices»; pero las corales y la serpiente marina no la tienen: su ausencia no prueba nada. Luego lea las escamas: quilladas o lisas, las anchas placas del vientre, los anillos y los rombos. En este atlas puede hacer lo que nadie debería hacer en el campo: voltear la serpiente, levantarle la piel y contarle los huesos.',
    ],
    pullQuote: 'La única señal segura de una víbora es la foseta loreal; las corales no la tienen',
  },

  howTo: {
    title: 'Cómo usar este libro',
    items: [
      ['Arrastre una esquina de la página', 'Pase la hoja; al soltarla, cae abierta o vuelve atrás'],
      // An upright screen (phone or tablet, not a landscape phone) frames one page: there a tap
      // anywhere reads on and the arrows step one page (Reader's portrait mode), hence no "phone"/"spread".
      ['Haga clic, toque o deslice', 'Avance en la página derecha, retroceda en la izquierda; si una página llena la\u00a0pantalla, toque para seguir'],
      ['Teclas de flecha ← →', 'Página anterior o siguiente'],
      ['Arrastre la figura', 'Gire la lámina sobre su plataforma giratoria'],
      ['Gire la rueda o pellizque', 'Acerque para ver detalles'],
      ['Haga doble clic en la figura', 'Examínela de cerca; Esc vuelve al libro'],
      ['Capas (1–9)', 'Retire la piel: esqueleto, glándulas de veneno o huevos'],
      ['Despiece (E)', 'Separe la figura en sus partes'],
      ['Etiquetas (L)', 'Nombre las partes; toque una nota «Más de cerca» para hallar una'],
      ['Barra espaciadora', 'Reproduzca o pause la animación de cinco segundos'],
      ['Exportar (S)', 'Guarde la figura como SVG: lámina en color o dibujo lineal'],
    ],
  },

  plates: [
    // ------------------------------------------------------------------ I
    {
      id: 'terciopelo',
      number: 'I',
      layout: 'plate',
      common: 'Terciopelo',
      commonAlt: null,
      scientific: 'Bothrops asper',
      authority: '(Garman, 1883)',
      family: 'Viperidae · Crotalinae',
      status: { code: 'LC', label: 'Preocupación Menor', source: 'Lista Roja de la UICN, 2021' },
      badge: 'Venenosa — peligrosa',
      lede: 'La serpiente venenosa más importante de Costa Rica: acecha paciente en fincas y bordes de bosque y causa la mayoría de las mordeduras.',
      body: [
        '*Terciopelo* evoca la tela; *asper* es «áspero» en latín. Suele medir 1,2–1,8\u00a0m, y las hembras son más grandes que los machos. Abunda en las tierras bajas húmedas de ambas vertientes y llega hasta unos 1500\u00a0m; prospera en plantaciones y cultivos, incluso cerca de casas rurales. Caza de noche, al acecho: los juveniles comen ranas y lagartijas; los adultos, sobre todo pequeños mamíferos.',
        'Sus fosetas loreales, sensibles al calor, le permiten apuntar en plena oscuridad, y sus colmillos huecos y móviles —de los más largos entre las serpientes del país— giran hacia adelante al abrir la boca. El veneno ataca músculos, vasos sanguíneos y la coagulación, y causa dolor, hinchazón y sangrado. Común, prolífica (camadas de hasta 90 crías) y a gusto cerca de la gente, la terciopelo causa la mayoría de las mordeduras del país. Con su veneno, y los de la cascabel y la matabuey, se produce el suero antiofídico polivalente costarricense.',
      ],
      facts: [
        ['Longitud', '1,2–1,8\u00a0m; hasta 2,5\u00a0m'],
        ['Altitud', 'Nivel del mar a 1500\u00a0m'],
        ['Hábitat', 'Bosque húmedo, fincas, jardines'],
        ['Actividad', 'Caza de noche, al acecho'],
        ['Crías', 'Nacen vivas, hasta 90'],
        ['Veneno', 'Daña tejidos y coagulación'],
      ],
      lookCloser: [
        { label: 'loreal-pit', name: 'Foseta loreal', text: 'Entre el ojo y la narina, la foseta loreal: un termorreceptor con el que ataca presas cálidas a oscuras.' },
        { label: 'fangs', name: 'Colmillos móviles', text: 'Los colmillos huecos se pliegan contra el paladar y se yerguen para el ataque.' },
        { label: 'venom-gland', name: 'Glándula', text: 'Detrás y debajo del ojo está la glándula de veneno; el músculo que la comprime ayuda a dar a la cabeza su forma triangular.' },
        { label: 'keeled-scales', name: 'Escama quillada', text: 'Cada escama del dorso lleva una cresta o quilla: quizá la aspereza que explica el nombre *asper*.' },
      ],
      didYouKnow: 'La terciopelo joven agita la punta de la cola para atraer presas pequeñas a su alcance. En los machos es amarilla: de ahí otro nombre local, *rabo amarillo*.',
      figure: {
        type: 'snake',
        params: { species: 'bothrops-asper', pose: 'strike' },
        caption: 'Fig. 1 — Terciopelo en su espiral defensiva en S, un instante antes del ataque.',
        scaleNote: 'Adulta, unos 1,5\u00a0m',
      },
      animation: {
        title: 'El ataque',
        beats: [
          [0, 'Enroscada en S, la terciopelo saborea el aire con la lengua bífida.'],
          [1.15, 'Recoge el cuello; las fosetas loreales fijan el blanco cálido.'],
          [1.55, 'Ataque: abre la boca y yergue los colmillos móviles.'],
          [2.3, 'Inyectado el veneno, se repliega al instante en su espiral.'],
          [3.5, 'Las víboras suelen soltar a la presa mordida y seguir su rastro.'],
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
      commonAlt: null,
      scientific: 'Bothriechis nigroadspersus',
      authority: '(Steindachner, 1870)',
      family: 'Viperidae · Crotalinae',
      status: { code: 'LC', label: 'Preocupación Menor', source: 'UICN, como *B. schlegelii*' },
      badge: 'Venenosa — peligrosa',
      lede: 'Verde, gris, rosada o dorada, la bocaracá espera enroscada en arbustos y árboles; el oropel es solo uno de sus disfraces.',
      body: [
        'La bocaracá, esbelta víbora de foseta del bosque húmedo de tierras bajas y premontano, vive del nivel del mar a unos 1430\u00a0m y suele medir 50–70\u00a0cm. Pocas serpientes varían tanto de color: verde musgo, gris, café, naranja, incluso rosada o blanca, lisa o moteada como el musgo. La forma dorada uniforme, el oropel, abunda en algunas zonas y, pese a la creencia popular, es la misma especie. Una revisión de 2024 dividió las tobobas de pestañas en varias especies: la bocaracá de Costa Rica es hoy *Bothriechis nigroadspersus*, largo tiempo incluida en *B. schlegelii*, y una pariente cercana, *B. supraciliaris*, habita la vertiente pacífica de la cordillera de Talamanca.',
        'Vive en arbustos y árboles y caza sobre todo de noche, al acecho. La cola prensil la sujeta a una rama mientras la parte anterior aguarda, plegada para atacar, a ranas, lagartijas, aves —colibríes incluidos—, murciélagos y ratones. Unas escamas erguidas sobre cada ojo le dan su nombre inglés, *eyelash viper*; su función aún no está demostrada. Las hembras paren de 6 a 23 crías vivas, de entre 16 y 22\u00a0cm.',
      ],
      facts: [
        ['Longitud', 'En general 50–70\u00a0cm; hasta 92\u00a0cm'],
        ['Altitud', 'Nivel del mar a unos 1430\u00a0m'],
        ['Hábitos', 'Arborícola; sobre todo nocturna'],
        ['Crías', '6–23, nacidas vivas'],
        ['Antes', '*Bothriechis schlegelii*'],
      ],
      lookCloser: [
        { label: 'eyelash-scales', name: 'Pestañas', text: 'Las «pestañas»: escamas agrandadas y salientes sobre cada ojo. Camuflaje y protección ocular son conjeturas sin demostrar.' },
        { label: 'prehensile-tail', name: 'Cola prensil', text: 'La corta cola prensil puede sostener todo su peso cuando cuelga de una rama.' },
        { label: 'loreal-pit', name: 'Foseta loreal', text: 'En el árbol, la foseta loreal también rastrea presas de sangre caliente, como un murciélago posado o un colibrí.' },
      ],
      didYouKnow: 'El oropel es latón batido en lámina fina para imitar el oro. La fase dorada se ganó ese nombre, pero bajo el dorado es la misma serpiente.',
      figure: {
        type: 'snake',
        params: { species: 'bothriechis-schlegelii', pose: 'branch', morph: 'oropel' },
        caption: 'Fig. 2 — Bocaracá en fase dorada (oropel), enroscada en una rama con la cola anclada.',
        scaleNote: 'Adulta, unos 65\u00a0cm',
      },
      // Beats follow poses.js branch(): the coil holds its shape all loop, the
      // head sways continuously and the tongue flicks at 0.45, 2.35 and 4.2 s.
      animation: {
        title: 'Espera en la rama',
        beats: [
          [0, 'Enrollada la cola en la rama, la bocaracá sostiene una espiral suelta.'],
          [1, 'La cabeza se mece despacio, atenta al movimiento.'],
          [2.3, 'La lengua asoma y prueba el aire en busca de olor.'],
          [3.6, 'Aún anclada por la cola, espera a que una presa llegue a su alcance.'],
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
      commonAlt: null,
      scientific: 'Micrurus nigrocinctus',
      authority: '(Girard, 1854)',
      family: 'Elapidae',
      status: { code: 'LC', label: 'Preocupación Menor', source: 'Lista Roja de la UICN' },
      badge: 'Venenosa — neurotóxica',
      lede: 'Sus anillos avisan, no identifican: la vieja rima falla en Centroamérica, y solo de lejos una coral es inofensiva.',
      body: [
        'La coral es un elápido delgado y semifosorial que suele medir 50–75\u00a0cm, común en la vertiente del Pacífico y el Valle Central: cafetales, potreros y jardines de San José y Heredia. Cada anillo rodea todo el cuerpo: rojo, claro, negro, claro, rojo. Caza otras serpientes, anguilas de pantano, cecílidos y lagartijas. Dos colmillos cortos van fijos al frente de la mandíbula superior, y su veneno bloquea las señales entre nervios y músculos; sin suero antiofídico, una mordedura grave puede paralizar la respiración.',
        'La rima norteamericana «si el rojo toca el amarillo, mata» no es aquí una guía segura. La coral gargantilla de Costa Rica tiene solo anillos negros y rojos (o negros y blancos): el rojo toca el negro y aun así es venenosa. Los anillos claros pueden ser amarillos, crema o blancos, y falsas corales inofensivas como *Erythrolamprus bizona* imitan bien la advertencia. Trate como peligrosa toda serpiente anillada: la mayoría de las mordeduras de coral las sufre quien la levanta, a menudo un niño o adolescente.',
      ],
      facts: [
        ['Longitud', '50–75\u00a0cm; hasta 1,15\u00a0m'],
        ['Distribución', 'Vertiente del Pacífico, Valle Central'],
        ['Altitud', 'Nivel del mar a 2000\u00a0m'],
        ['Dieta', 'Serpientes, anguilas, cecílidos'],
        ['Huevos', '5–14 por puesta'],
        ['Veneno', 'Neurotóxico, paralizante'],
      ],
      lookCloser: [
        { label: 'red-ring', name: 'Anillo rojo', text: 'Los anillos rojos son completos, rodean todo el cuerpo y son algo más anchos que los negros.' },
        { label: 'yellow-ring', name: 'Anillo claro', text: 'Los finos anillos claros, amarillos, crema o blancos, son una razón de que las rimas engañen.' },
        { label: 'black-ring', name: 'Anillo negro', text: 'En esta especie cada anillo negro va entre dos anillos claros y nunca toca el rojo. La coral gargantilla rompe esa regla.' },
        { label: 'fixed-fangs', name: 'Colmillos fijos', text: 'Dos colmillos cortos, fijos al frente de la mandíbula superior, inyectan veneno que bloquea los nervios.' },
      ],
      didYouKnow: 'Ante una amenaza, la coral puede enroscar la punta de la cola a modo de cabeza y desviar de la verdadera el ataque del depredador.',
      figure: {
        type: 'snake',
        params: { species: 'micrurus-nigrocinctus', pose: 'slither' },
        caption: 'Fig. 3 — Coral avanzando por ondulación lateral; nótense los anillos completos.',
        scaleNote: 'Adulta, unos 70\u00a0cm',
      },
      animation: {
        title: 'Ondulación lateral',
        beats: [
          [0, 'Ondas de flexión corren de cabeza a cola.'],
          [1.4, 'Cada curva empuja el suelo hacia atrás; el cuerpo sigue a la cabeza por la misma huella.'],
          [2.6, 'La punta de la cola se riza en falsa cabeza.'],
          [4.3, 'El circuito se cierra y el viaje vuelve a empezar.'],
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
      commonAlt: null,
      scientific: 'Crotalus simus',
      authority: 'Latreille, 1801',
      family: 'Viperidae · Crotalinae',
      status: { code: 'LC', label: 'Preocupación Menor', source: 'Lista Roja de la UICN' },
      badge: 'Venenosa — peligrosa',
      lede: 'La única cascabel de Costa Rica, en el límite sur de su área, hace sonar su advertencia desde los bosques secos y sabanas del noroeste.',
      body: [
        'La cascabel es una víbora de foseta robusta de tierras de estación seca: los bosques y sabanas de Guanacaste y el norte de Puntarenas, con una población que sobrevive en el oeste más seco del Valle Central. Los adultos suelen medir 1–1,2\u00a0m, y 1,8\u00a0m como máximo. Los machos crecen más que las hembras, y dos rivales luchan en una lenta danza: cada uno intenta bajar la cabeza del otro. Rombos oscuros sobre fondo claro y una cresta espinal en su primer tercio la delatan a simple vista.',
        'El cascabel es una cadena de segmentos huecos de queratina encajados. Cada muda añade uno y los del extremo se desprenden: ni su número ni el tamaño del cascabel revelan la edad. El veneno cambia con la edad: en los neonatos domina la crotoxina, una neurotoxina; los adultos inyectan sobre todo metaloproteinasas que destruyen tejidos. Es uno de los tres venenos con que se produce el suero costarricense contra mordeduras de víbora.',
      ],
      facts: [
        ['Longitud', 'En general 1–1,2\u00a0m; hasta 1,8\u00a0m'],
        ['Distribución', 'Guanacaste, oeste del Valle Central'],
        ['Hábitat', 'Bosque seco y sabana'],
        ['Crías', 'Nacen vivas'],
        ['Veneno', 'Cambia con la edad'],
        ['Antes', '*Crotalus durissus*'],
      ],
      lookCloser: [
        { label: 'rattle', name: 'Cascabel', text: 'El cascabel o chischil: segmentos huecos de queratina que chocan entre sí cuando la cola vibra.' },
        { label: 'rattle-button', name: 'Botón', text: 'En la misma punta está el botón, el segmento más antiguo del cascabel, expuesto en la primera muda y el primero en desprenderse.' },
        { label: 'loreal-pit', name: 'Foseta loreal', text: 'Como toda víbora del país, tiene un par de fosetas: dos de las «cuatro narices» de las tobobas.' },
        { label: 'venom-gland', name: 'Glándula', text: 'Active la capa de veneno: la glándula está detrás y debajo de cada ojo. En crías domina la neurotoxina; en adultos, la toxina tisular.' },
      ],
      didYouKnow: 'Muchas serpientes, como la terciopelo, vibran la cola en la hojarasca si se alarman. Un estudio de 2016 con 56 especies sugiere que el cascabel surgió de ahí.',
      figure: {
        type: 'snake',
        params: { species: 'crotalus-simus', pose: 'rattle' },
        caption: 'Fig. 4 — Cascabel en espiral defensiva: cabeza en alto, chischil sonando.',
        scaleNote: 'Adulta, unos 1,4\u00a0m',
      },
      // Beats follow poses.js rattle(): the coil, raised tail and buzzing rattle
      // are held for the whole loop; the tongue flicks at 0.9, 2.3 and 4.1 s.
      animation: {
        title: 'El aviso',
        beats: [
          [0, 'En su espiral defensiva, cabeza y cuello en alto, la cascabel encara al intruso.'],
          [0.6, 'El cascabel, en alto, se desdibuja al chocar sus segmentos.'],
          [2.2, 'La cabeza sigue al intruso; la lengua asoma para saborear el aire.'],
          [3.6, 'El sonido pide distancia. Désela.'],
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
      commonAlt: null,
      scientific: 'Lachesis stenophrys',
      authority: 'Cope, 1875',
      family: 'Viperidae · Crotalinae',
      status: { code: 'NT', label: 'Casi Amenazado', source: 'Lista Roja de la UICN, 2021' },
      badge: 'Venenosa — peligrosa',
      lede: 'La víbora más larga del país vive en lo hondo del bosque húmedo caribeño: poco vista, poco culpada de mordeduras y en la categoría Casi Amenazado.',
      body: [
        'La matabuey es la víbora más larga de Costa Rica: los adultos suelen medir 1,9–2,1\u00a0m, y algunos llegan a 2,5\u00a0m. Habita el bosque húmedo de la vertiente del Caribe y las llanuras del norte, del nivel del mar a unos 1100\u00a0m. Café claro a crema y con grandes rombos oscuros, también la llaman *cascabel muda*: su diseño recuerda al de la cascabel, pero la cola acaba en una espina corta y dura, no en un chischil.',
        'De día descansa en madrigueras excavadas por armadillos y otros mamíferos; de noche acecha a pequeños mamíferos. A diferencia de la terciopelo o la cascabel, pone huevos: hasta 18 por puesta. Su veneno es potente, pero las mordeduras son raras: es escasa y se limita al bosque intacto. La UICN la clasifica en la categoría Casi Amenazado.',
      ],
      facts: [
        ['Longitud', 'En general 1,9–2,1\u00a0m; hasta 2,5\u00a0m'],
        ['Distribución', 'Caribe, llanuras del norte'],
        ['Altitud', 'Nivel del mar a 1100\u00a0m'],
        ['Hábitos', 'Nocturna; reposa en madrigueras'],
        ['Huevos', 'Hasta 18 por puesta'],
        ['Veneno', 'Potente; mordeduras raras'],
      ],
      lookCloser: [
        { label: 'tail-spine', name: 'Punta espinosa', text: 'Sin cascabel: la cola acaba en una espina corta y dura.' },
        { label: 'eggs', name: 'Puesta', text: 'Su puesta: entre las víboras del país, solo las dos *Lachesis* ponen huevos.' },
        { label: 'keeled-scales', name: 'Escama quillada', text: 'Cada escama dorsal es fuertemente quillada y saliente, como un nudillo diminuto.' },
      ],
      didYouKnow: 'Las *Lachesis* son probablemente las únicas víboras de América que ponen huevos. Costa Rica tiene dos: la matabuey, del Caribe, y el plato negro, del Pacífico sur.',
      figure: {
        type: 'snake',
        params: { species: 'lachesis-stenophrys', pose: 'ambush' },
        caption: 'Fig. 5 — Matabuey enroscada en torno a su puesta, cabeza hacia fuera.',
        scaleNote: 'Adulta, unos 2\u00a0m',
      },
      // Beats follow poses.js ambush(): tongue out 0.9–1.5 s and 4.0–4.5 s,
      // tail tip vibrating 2.1–3.5 s, breathing all loop; the eggs layer is on
      // by default, so the figure shows a female coiled around her clutch —
      // hence 'On guard' (En guardia) rather than the pose's name, 'ambush'.
      animation: {
        title: 'En guardia',
        beats: [
          [0, 'Enroscada en torno a su puesta, la matabuey espera, inmóvil.'],
          [0.9, 'La lengua prueba el aire; el lento respirar mueve los anillos.'],
          [2.1, 'Perturbada, vibra la punta de la cola: aviso común a muchas víboras.'],
          [3.8, 'La cola se aquieta; la lengua asoma otra vez.'],
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
      commonAlt: null,
      scientific: 'Hydrophis platurus',
      authority: '(Linnaeus, 1766)',
      family: 'Elapidae · Hydrophiinae',
      status: { code: 'LC', label: 'Preocupación Menor', source: 'Lista Roja de la UICN' },
      badge: 'Venenosa — rara vez muerde',
      lede: 'La única serpiente marina que llega a América vive siempre a la deriva en el Pacífico y debe esperar la lluvia para beber.',
      body: [
        'Negra por encima, amarilla por debajo y rematada por una cola plana, manchada y en forma de remo, la serpiente marina (largo tiempo llamada *Pelamis platurus*) es la única de Costa Rica y una de las serpientes más extendidas del planeta: recorre los océanos Índico y Pacífico hasta las costas de América. Aquí vive frente a la costa del Pacífico y abunda sobre todo en bahías y golfos; Bahía Culebra, en Guanacaste, debe su nombre a ella. Nace, se alimenta y se reproduce en el mar, y en tierra se mueve con torpeza.',
        'Caza a la deriva, inmóvil, en franjas de agua lisa y líneas de restos flotantes, donde los pececillos se refugian bajo ella. No bebe agua de mar: frente a Guanacaste, estas serpientes pueden pasar seis o siete meses deshidratadas y luego beben de la fina capa de agua dulce que los aguaceros dejan sobre el mar. En el interior del Golfo Dulce vive una población más pequeña, casi toda amarilla y de caza nocturna, descrita en 2017 como la subespecie *xanthos*, un rango aún debatido.',
      ],
      facts: [
        ['Longitud', 'En general 50–90\u00a0cm; hasta 1,14\u00a0m'],
        ['Distribución', 'Costa del Pacífico y mar abierto'],
        ['Dieta', 'Pececillos'],
        ['Crías', 'Nacen vivas en el mar'],
        ['Veneno', 'Potente; colmillos diminutos'],
        ['Mordeduras', 'Muy raras'],
      ],
      lookCloser: [
        { label: 'paddle-tail', name: 'Cola aplanada', text: 'Aplanada de lado a lado, la cola es un remo con manchas negras sobre amarillo.' },
        { label: 'yellow-venter', name: 'Vientre amarillo', text: 'El vientre y los flancos amarillos le dan su nombre inglés; en el Golfo Dulce es casi toda amarilla.' },
        { label: 'nostril', name: 'Narina', text: 'Debe subir a respirar aire, aunque sumergida puede tomar algo de oxígeno por la piel.' },
        { label: 'tongue', name: 'Lengua bífida', text: 'Bajo la lengua, una glándula de sal expulsa el exceso; aun así, depende de la lluvia para beber.' },
      ],
      didYouKnow: 'Los varamientos son más frecuentes en diciembre y enero, al inicio de la época seca, cuando el viento y la temperatura del agua arrojan estas serpientes a la costa. Varada, sigue siendo venenosa: nunca la levante.',
      figure: {
        type: 'snake',
        params: { species: 'hydrophis-platurus', pose: 'swim' },
        caption: 'Fig. 6 — Serpiente marina nadando; la cola aplanada la impulsa por el agua.',
        scaleNote: 'Adulta, unos 75\u00a0cm',
      },
      animation: {
        title: 'Nadando',
        beats: [
          [0, 'Ondas de flexión recorren el cuerpo.'],
          [1.2, 'La cola aplanada empuja el agua como un remo.'],
          [2.8, 'Aplanado de lado a lado, todo el cuerpo ayuda a empujar.'],
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
      commonAlt: null,
      scientific: 'Boa imperator',
      authority: 'Daudin, 1803',
      family: 'Boidae',
      status: { code: 'LC', label: 'Preocupación Menor', source: 'Lista Roja de la UICN' },
      badge: 'Constrictora · sin colmillos',
      lede: 'La mayor serpiente del país no mata con veneno, sino deteniendo la circulación de su presa; y las boas pueden sentir un latido en sus anillos.',
      body: [
        'La béquer, tratada mucho tiempo como subespecie, *Boa constrictor imperator*, es pesada y musculosa; suele medir 2–2,5\u00a0m, aunque en Costa Rica no se ha registrado ninguna de más de 3,8\u00a0m. Vive en ambas vertientes y en el Valle Central, en bosque lluvioso y seco del nivel del mar a unos 1650\u00a0m, y a menudo cerca de fincas y casas. No tiene veneno. Ratas, guatusas, zarigüeyas, murciélagos, aves e iguanas están en su menú, atrapados con hileras de dientes afilados y recurvados.',
        'Mata por constricción, pero no por asfixia lenta: en laboratorio, las boas detuvieron la circulación de su presa en minutos. También sienten el latido en sus anillos y, mientras continúa, aprietan más y por más tiempo. Cuando un tramo aprieta, la boa puede respirar con costillas de otro tramo. Junto a la cloaca, dos espolones como garras son las puntas visibles de patas traseras vestigiales, cuyos diminutos huesos de muslo y cadera se ocultan en el músculo; los machos, de espolones mayores, los usan en el cortejo. Las hembras paren crías vivas.',
      ],
      facts: [
        ['Longitud', 'En general 2–2,5\u00a0m'],
        ['Distribución', 'Ambas vertientes, Valle Central'],
        ['Altitud', 'Nivel del mar a 1650\u00a0m'],
        ['Dieta', 'Mamíferos, aves, lagartijas'],
        ['Crías', 'Nacen vivas'],
        ['Veneno', 'Ninguno; constrictora'],
      ],
      lookCloser: [
        { label: 'pelvic-spur', name: 'Espolón pélvico', text: 'Junto a la cloaca, un espolón pélvico, punta con garra de una pata trasera vestigial; debajo, en el músculo, un diminuto fémur y un hueso de cadera.' },
        { label: 'recurved-teeth', name: 'Dientes recurvos', text: 'Vueltos hacia atrás, sujetan a la presa que lucha y ayudan a tragarla.' },
        { label: 'eye-stripe', name: 'Banda ocular', text: 'Una banda oscura va del hocico hacia atrás y cruza cada ojo.' },
        { label: 'ribs', name: 'Costillas', text: 'Cada vértebra del tronco lleva un par de costillas; la cola, ninguna. Una boa puede respirar con un tramo mientras otro aprieta.' },
      ],
      didYouKnow: 'En laboratorio, los anillos de una boa bajaron a la mitad la presión arterial de su presa en unos seis segundos. La constricción ataca la sangre, no el aliento.',
      figure: {
        type: 'snake',
        params: { species: 'boa-imperator', pose: 'constrict' },
        caption: 'Fig. 7 — Béquer apretando sus anillos alrededor de una rata negra.',
        scaleNote: 'Adulta, unos 2\u00a0m',
      },
      // The prey is a black rat, *Rattus rattus* (Aguilar-López &
      // Tapia-Ramírez 2025: the first record of a béquer eating one), drawn at
      // real scale in two loops round its chest and belly (Boback et al.
      // 2015). The lab trials used laboratory rats, so the body and the
      // did-you-know say «presa», never «ratas negras». Beats follow poses.js
      // constrict(): loose to 0.6 s, tightening to 1.5 s, held to 2.7 s,
      // released by 3.8 s.
      animation: {
        title: 'Constricción',
        beats: [
          [0, 'Los anillos se acomodan alrededor del pecho de la rata.'],
          [0.7, 'Se aprietan y presionan el pecho y los vasos sanguíneos de la rata.'],
          [1.8, 'A través de sus anillos, la boa siente el latido y no suelta.'],
          [2.8, 'La presión cede y los anillos se aflojan.'],
        ],
      },
      sources: ['Solórzano & Sasa 2024', 'Boback et al. 2012, 2015', 'Capano et al. 2022', 'Sasa, Bonilla & Chaves 2019 (ICP)', 'Aguilar-López & Tapia-Ramírez 2025'],
    },
  ],

  back: {
    note: {
      title: 'Si una serpiente muerde',
      paragraphs: [
        'La mordedura de serpiente es una emergencia médica tratable. Al año, unas 500 a 600 personas en Costa Rica requieren atención hospitalaria por una mordedura, pero las muertes ya son raras. El suero antiofídico es el tratamiento específico y más eficaz; lo aplica personal médico por vía intravenosa, nunca en el campo. Los sueros del país los produce el Instituto Clodomiro Picado, de la Universidad de Costa Rica.',
        'Ante una mordedura, llame al 9-1-1 y acuda de inmediato al hospital o centro de salud más cercano, aunque parezca leve: la de una coral puede doler poco al principio, pero la parálisis puede llegar horas después. Calme a la persona, póngala en reposo y acompáñela; inmovilice la extremidad mordida si no causa demora; quítele anillos, relojes y pulseras antes de que se hinche; lave la mordedura con agua y jabón; anote la hora.',
        'No aplique torniquetes ni hielo; no corte ni succione la herida, con la boca o con aparatos; no dé bebidas alcohólicas, medicamentos ni remedios caseros. No intente atrapar ni matar a la serpiente: el personal médico trata los síntomas, y otra mordedura no ayuda a nadie.',
        'Prevenir es aún más sencillo: use botas cerradas, lleve linterna de noche, mire antes de poner manos o pies, y nunca manipule una serpiente, ni siquiera muerta.',
      ],
    },
    glossary: [
      ['Suero antiofídico', 'Anticuerpos purificados (en Costa Rica, de caballo) que neutralizan el veneno en la sangre; el tratamiento específico y más eficaz del envenenamiento.'],
      ['Señuelo caudal', 'Agitar la punta contrastante de la cola para atraer presas a su alcance.'],
      ['Crotalinae', 'Las víboras de foseta: subfamilia con una foseta loreal sensible al calor. Toda víbora de América pertenece a ella.'],
      ['Elapidae', 'Familia de serpientes venenosas de colmillos frontales cortos y fijos: corales y serpiente marina aquí; cobras y mambas en otras partes.'],
      ['Escama quillada', 'Escama con una cresta en su línea media, que da a la piel aspecto áspero.'],
      ['Foseta loreal', 'Órgano termosensor en un hueco entre ojo y narina; permite a las víboras de foseta ubicar presas cálidas a oscuras.'],
      ['Mimetismo', 'Parecido de una especie con otra; las falsas corales, inofensivas, se protegen al parecerse a las venenosas.'],
      ['Neurotoxina', 'Toxina que actúa sobre el sistema nervioso; las de las corales, la serpiente marina y la cascabel joven bloquean la señal de los nervios a los músculos y paralizan.'],
      ['Ovíparo', 'Que pone huevos que se desarrollan y eclosionan fuera de la madre.'],
      ['Prensil', 'Capaz de asir, como la cola de la bocaracá se aferra a una rama.'],
      ['Solenoglifa', 'Dentición de víbora: colmillos largos y huecos, plegados contra el paladar, que se adelantan al morder.'],
      ['Tobobas', 'Las víboras de foseta, en Costa Rica.'],
      ['Escamas ventrales', 'Hilera única de anchas placas del vientre que se aferran al suelo al reptar.'],
      ['Vivíparo', 'Que pare crías vivas; en textos más antiguos, *ovovivíparo*.'],
    ],
    // Every work cited on a plate or in the note has a full entry here: the
    // general works first, then plate order. Entries stay as in English (ISO 4
    // journal abbreviations with no-break spaces); only the connective words
    // ("consulted November 2026") are translated.
    sources: [
      'Sasa, M., Bonilla, F. & Chaves, F. (2019). *Serpientes venenosas de Costa Rica: biología básica*. San José: Instituto Clodomiro Picado, Universidad de Costa Rica.',
      'Instituto Clodomiro Picado. Venomous snakes in Costa Rica: species accounts. icp.ucr.ac.cr (consultado en noviembre de 2026).',
      'Savage, J. M. (2002). *The Amphibians and Reptiles of Costa Rica*. Chicago: University of Chicago Press.',
      'Uetz, P., Freed, P., Aguilar, R., et al. (eds.). The Reptile Database. reptile-database.org (consultado en noviembre de 2026).',
      'IUCN. The IUCN Red List of Threatened Species. iucnredlist.org (consultado en noviembre de 2026).',
      'Sasa, M., Wasko, D. K. & Lamar, W. W. (2009). Natural history of the terciopelo *Bothrops asper* (Serpentes: Viperidae) in Costa Rica. *Toxicon* 54: 904–922.',
      'Arteaga, A., Pyron, R. A., Batista, A., et al. (2024). Systematic revision of the eyelash palm-pitviper *Bothriechis schlegelii* (Serpentes, Viperidae), with the description of five new species and revalidation of three. *Evol. Syst.* 8: 15–64.',
      'Solano, A. (1988). Ciclos reproductivos de la serpiente coral *Micrurus nigrocinctus* (Serpentes: Elapidae) en Costa Rica. *Rev. Biol. Trop.* 36(2A): 235–239.',
      'Chandler, H. (2019). Coral snakes and their mimics. The Orianne Society. oriannesociety.org (consultado en noviembre de 2026).',
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
      'Taxonomía: The Reptile Database; estado de conservación: Lista Roja de la UICN.',
      'Ninguna serpiente fue manipulada para este libro.',
    ],
  },
};
