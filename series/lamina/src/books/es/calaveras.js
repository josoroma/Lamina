// Book manifest, Spanish edition: "Calaveras — Dibujar el cráneo: un método constructivo".
//
// Why this file exists: it is the Spanish text of the drawing book as data, a
// full-shape copy of src/books/calaveras.js (same keys, same order, same array
// lengths; .scratch/bilingual/design-i18n.md §2). At run time every non-text
// value (ids, figure params, numbers, beat times, look-closer label ids, theme)
// is taken from the English manifest, so the copies here only keep the shape.
// Translated from the English snapshot of 2026-11-01 21:59; the English edits
// made after it (byline, how-to row 2, look-closer names) were carried over on
// 2026-11-02 (.scratch/bilingual/en-changes.md).
//
// Style: docs/books/es-style.md (es-CR). The reader is addressed as usted;
// decimal comma, no grouping below 10 000, a no-break space before every unit;
// binomials, authorities and bibliographic entries stay as in English. common
// is the Spanish lesson title; commonAlt is explicitly omitted so English
// secondary titles do not print in the Spanish edition (lead decision L6).
// Look-closer rows carry a printed `name` (review R1.1): exactly the skull
// figure's Spanish label for that part, the pill text in src/i18n/es/skulls.js
// (lead decision L1). Term decisions, sources and open questions:
// docs/books/calaveras-es-notes.md.
//
// Taxonomy: lesson VI keeps the frozen figure param
// `species: 'bothriechis-schlegelii'` (a figure id); the text names
// Bothriechis nigroadspersus, the bocaracá (Reptile Database lists bocaracá,
// toboba de pestañas, víbora de pestañas; Volume I uses Bocaracá).
//
// Density: the lesson versos were fitted with the real typesetter: every side
// sets at the English scale (lesson versos 97.5 % or 100 %, as in English).
//
// Steps and beats describe what the reader actually sees, as in English: each
// beat says what the figure shows at that loop time (the English beats were
// checked against the poses; these translate them, they are not re-timed).

export default {
  id: 'calaveras',
  title: 'Calaveras',
  subtitle: 'Dibujar el cráneo: un método constructivo',
  kicker: 'Lámina · Volumen III',
  author: 'Lámina Natural History Press',
  byline: { name: 'Josoroma', mark: 'josoroma' }, // the author, foil-stamped on both boards
  edition: 'Primera edición, 2026',
  locale: 'es',
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
    title: 'Por qué dibujar el cráneo',
    paragraphs: [
      'Todo rostro que dibuje lo sostiene un cráneo. En las cejas, el puente de la nariz y los pómulos, la cubierta es delgada y el hueso asoma en planos, aristas y giros; en otras partes se oculta, pero aun así decide dónde puede ir cada rasgo. Aprenda el cráneo y un retrato deja de ser una lista de rasgos: se vuelve una estructura que se puede girar en la mente y ver desde cualquier lado.',
      'Este libro enseña un método constructivo, con las mismas tres etapas en cada vista. Primero, las formas grandes: una esfera para la caja craneal, con su línea central, y un bloque que se estrecha para la cara. Luego, las guías: las pocas horizontales que marcan cejas, nariz y mordida, y el estrechamiento de la mandíbula. Al final, los detalles —órbitas, abertura, dientes—, tallados en los planos donde el frente gira hacia el lado. Cada figura es un modelo funcional con un ciclo de cinco segundos: ármelo desde las líneas de construcción, gírelo, abra la mandíbula, desármelo.',
      'Siguen seis lecciones: el cráneo de frente, en vista de tres cuartos con la mandíbula abierta y de perfil; luego, sus veintidós huesos. Las dos últimas miran a los bosques de Costa Rica: el cráneo del jaguar, el mayor felino de América, y un cráneo humano enlazado por una bocaracá.',
    ],
    pullQuote: 'Dibuje la calavera hasta verla a través de cada rostro',
  },

  howTo: {
    title: 'Cómo usar este libro',
    items: [
      ['Arrastre una esquina de la página', 'Levante y pase la hoja, como en papel'],
      // The Reader turns on a tap anywhere on a page (not only its edge); an upright screen
      // (phone or tablet, not a landscape phone) frames one page, and there a tap reads on.
      ['Haga clic o toque una página', 'Adelante en la página derecha, atrás en la izquierda; si una página llena la\u00a0pantalla, toque para seguir'],
      ['Deslice', 'Pase las páginas en una pantalla táctil'],
      ['Teclas de flecha', 'Pase las páginas desde el teclado'],
      ['Arrastre la figura', 'Gire el cráneo sobre su plataforma giratoria'],
      ['Haga doble clic en la figura', 'Examínela de cerca'],
      ['Capas', 'Desde la barra, muestre u oculte construcción, huesos, músculos, grabado'],
      ['Despiece', 'Desde la barra, separe los huesos por sus suturas'],
      ['Etiquetas', 'Desde la barra, nombre huesos y puntos clave'],
      ['Exportar SVG', 'Guarde cada figura en color o como dibujo lineal'],
      ['Reproducir o pausar', 'Inicie o detenga la lección de cinco segundos, o vaya a cualquier momento'],
    ],
  },

  plates: [
    // ------------------------------------------------------------------ I
    {
      id: 'frontal',
      number: 'I',
      layout: 'lesson',
      common: 'Vista frontal',
      commonAlt: null,
      scientific: 'Cráneo y mandíbula',
      authority: '',
      family: 'Cráneo humano · norma frontal',
      status: null,
      badge: 'Lección 1 · Principiante',
      lede: 'Todo retrato nace aquí: una esfera, una línea central, un espejo.',
      body: [
        'De frente, el cráneo es un óvalo más ancho arriba que abajo: una amplia cúpula craneal sobre una cara más angosta. Dibuje la cúpula como un círculo y baje por ella una línea central que pase el mentón: su espejo. Tres guías horizontales llevan el resto: cejas, base de la nariz, mordida.',
        'Luego recorte las órbitas: cuadrados redondeados, algo más anchos que altos, con un puente óseo de cerca de media órbita, más angosto que el espacio entre los ojos del rostro vivo, que mide más o menos un ojo. Cuelgue la abertura nasal en forma de pera bajo los huesos nasales, punta arriba; deje los ángulos mandibulares dentro de los pómulos y marque el giro de los planos en el borde orbitario externo.',
      ],
      facts: [
        ['Ancho del cráneo', 'unos 13–14\u00a0cm'],
        ['Órbita, ancho × alto', 'unos 4\u00a0×\u00a03,4\u00a0cm'],
        ['Hueso entre las órbitas', 'unos 2\u00a0cm'],
        ['Línea de ojos, en vida', 'hacia la mitad, coronilla–mentón'],
      ],
      lookCloser: [
        { label: 'orbit', name: 'Órbita', text: 'Cuadrado redondeado, apaisado; rara vez un círculo.' },
        { label: 'nasal-aperture', name: 'Orificio piriforme', text: 'Una pera, punta arriba; bajo los huesos nasales, la nariz era cartílago.' },
      ],
      didYouKnow: 'Tomografías de 375 adultos sitúan el ojo vivo alto y hacia afuera en su órbita.',
      figure: {
        type: 'skull',
        params: { subject: 'human', lesson: 'frontal' },
        caption: 'Fig. 1 — Cráneo humano de frente: de la esfera de construcción al hueso grabado.',
        scaleNote: 'Cráneo adulto, de unos 13–14\u00a0cm de ancho',
      },
      animation: {
        title: 'De la esfera al hueso',
        beats: [
          [0, 'Una esfera y una línea central: la caja craneal y su simetría.'],
          [1.25, 'Las guías horizontales cruzan la línea central; la mandíbula se estrecha hacia el mentón.'],
          [2.5, 'Órbitas y abertura nasal se recortan en los planos.'],
          [3.75, 'La línea grabada toma el relevo: el dibujo se vuelve hueso.'],
        ],
      },
      lesson: {
        steps: [
          { title: 'Esfera y línea central', text: 'Dibuje un círculo para la caja craneal, mayor de lo que parece justo. Baje por él una línea central más allá de donde irá el mentón: su espejo.' },
          { title: 'Guías, mandíbula en cuña', text: 'Cruce la mitad baja de la bola con líneas de cejas y ojos; debajo, las de nariz, mordida y mentón. Marque los planos laterales y estreche la mandíbula de pómulos a mentón por sus ángulos.' },
          { title: 'Órbitas, abertura, contorno', text: 'Recorte dos órbitas a media órbita entre sí, cuelgue la abertura nasal punta arriba y afine sienes, pómulos y mandíbula.' },
        ],
        proTip: 'Mida con la órbita: el puente óseo mide media órbita de ancho; la abertura, dos tercios.',
        mistakes: [
          'Órbitas redondas y fijas. Son cuadrados redondeados, algo más anchos que altos.',
          'Una cara más ancha que la caja craneal. De frente, el cráneo suele ser más ancho.',
        ],
        proportions: [
          'Órbitas: seis de ancho por cinco de alto.',
          'Ángulos mandibulares: tres cuartos del ancho de los pómulos.',
          'En vida: línea de ojos cerca de media altura.',
        ],
      },
      sources: ['Gray 1918', 'Howells 1973', 'Mussabekova et al. 2024', 'Karaca Saygili et al. 2016', 'Guyomarc’h et al. 2012'],
    },

    // ------------------------------------------------------------------ II
    {
      id: 'open-jaw',
      number: 'II',
      layout: 'lesson',
      common: 'Tres cuartos, mandíbula abierta',
      commonAlt: null,
      scientific: 'Articulación temporomandibular',
      authority: '',
      family: 'Cráneo humano · vista oblicua',
      status: null,
      badge: 'Lección 2 · Intermedio',
      lede: 'Abra la mandíbula: la bisagra va delante de la oreja, no en el ángulo.',
      body: [
        'Gire el cráneo hasta que el pómulo lejano sea el borde de la cara. La línea central se curva ahora con la forma y todo lo que queda más allá se encoge: la órbita lejana se estrecha tras el puente nasal y el pómulo cercano muestra su arco entero. Envuelva la forma con las tres guías, como arcos suaves y paralelos.',
        'Ahora abra la boca. La mandíbula gira sobre su cóndilo, en una fosa justo delante del conducto auditivo. Al principio sobre todo rota, pero ya empieza a deslizarse; al abrirse más, el cóndilo se desliza hacia adelante sobre el tubérculo delante de la fosa. El mentón baja y retrocede; solo la articulación avanza. La cierran el temporal, aferrado a la apófisis coronoides, y el masetero, tendido del arco cigomático al ángulo mandibular.',
      ],
      facts: [
        ['Bisagra', 'cóndilo, ante el conducto auditivo'],
        ['Apertura inicial', 'más rotación que deslizamiento'],
        ['Apertura máxima', 'unos 49\u00a0mm en los incisivos'],
        ['Músculos de cierre', 'masetero, temporal, pterigoideo medial'],
      ],
      lookCloser: [
        { label: 'condyle', name: 'Cóndilo', text: 'Rota y se desliza a la vez; el deslizamiento crece al abrir mucho.' },
        { label: 'coronoid', name: 'Coronoides', text: 'Oculta bajo el arco; el temporal se aferra a ella.' },
      ],
      didYouKnow: 'Una mandíbula sana se abre unos tres dedos: en 140 adultos, 48,8\u00a0mm en promedio.',
      figure: {
        type: 'skull',
        params: { subject: 'human', lesson: 'open-jaw' },
        caption: 'Fig. 2 — Vista de tres cuartos; la mandíbula se abre sobre la articulación temporomandibular.',
        scaleNote: 'Cráneo adulto; apertura máxima de unos 5\u00a0cm en los incisivos',
      },
      animation: {
        title: 'Gira y se desliza',
        beats: [
          [0, 'Dientes juntos; el cóndilo descansa en su fosa.'],
          [1.25, 'Al abrir, el cóndilo sobre todo rota y ya empieza a deslizarse.'],
          [2.5, 'Bien abierta: el cóndilo se deslizó hasta el tubérculo delante de su fosa.'],
          [3.75, 'Al cerrar, masetero y temporal suben de nuevo la mandíbula.'],
        ],
      },
      lesson: {
        steps: [
          { title: 'Esfera y punto de giro', text: 'Resuélvalo primero de perfil. Trace el círculo craneal sobre una horizontal por el oído, marque la bisagra justo delante y cuelgue de ella la cuña de cara y mandíbula.' },
          { title: 'Abrir la mandíbula', text: 'Gire la cuña mandibular sobre la bisagra: el mentón baja y retrocede en arco. Para abrir mucho, deslice también la bisagra hacia adelante y abajo, hasta el tubérculo delante de su fosa.' },
          { title: 'Afinar el cráneo abierto', text: 'Afine cráneo, arco cigomático, órbita y escotadura nasal; luego rama, coronoides y ambas hileras de dientes, la inferior inclinada con la mandíbula.' },
        ],
        proTip: 'Dibuje la mandíbula cerrada y ábrala girando sobre el cóndilo mientras lo desliza hacia adelante, hasta el tubérculo delante de su fosa; nunca la articule en el ángulo.',
        mistakes: [
          'Poner la bisagra en el ángulo. La articulación está justo delante de la oreja.',
          'Abrir solo rotando. Una gran apertura también adelanta los cóndilos.',
        ],
        proportions: [
          'Bisagra: justo ante el conducto auditivo.',
          'Apertura sana: unos 5\u00a0cm en los incisivos.',
        ],
      },
      sources: ['Betts et al. 2022 (OpenStax)', 'Lindauer et al. 1995', 'Zawawi et al. 2003'],
    },

    // ------------------------------------------------------------------ III
    {
      id: 'profile',
      number: 'III',
      layout: 'lesson',
      common: 'Perfil',
      commonAlt: null,
      scientific: 'Proporciones craneales',
      authority: '',
      family: 'Cráneo humano · norma lateral',
      status: null,
      badge: 'Lección 3 · Intermedio',
      lede: 'Una bola, una cuña y una horizontal del oído a la órbita.',
      body: [
        'Dibuje la caja craneal como un círculo algo estirado: de la frente a la nuca mide unas cuatro unidades por cada tres de alto. Cuelgue delante la cara, una cuña con la punta en el mentón. Luego fije el horizonte: el plano de Fráncfort, de lo alto del conducto auditivo al punto más bajo del borde orbitario. Manténgalo horizontal y el cráneo queda más o menos como en vida.',
        'Cuelgue de esa línea las referencias: el conducto auditivo justo tras la articulación mandibular, el arco cigomático casi horizontal hacia adelante, la mastoides detrás y debajo. Prolongada hacia atrás, la línea pasa cerca del saliente occipital. Y recuerde qué le falta al hueso: bajo los huesos nasales, la nariz y las orejas son cartílago, solo presente en el perfil vivo.',
      ],
      facts: [
        ['Longitud del cráneo', 'unos 17,5–18,5\u00a0cm'],
        ['Caja craneal, largo\u00a0:\u00a0alto', 'unos 4\u00a0:\u00a03'],
        ['Horizontal', 'plano de Fráncfort, oído–órbita'],
        ['Apófisis mastoides', 'detrás y debajo del conducto auditivo'],
      ],
      lookCloser: [
        { label: 'zygomatic-arch', name: 'Arco cigomático', text: 'Casi horizontal; acaba justo ante el conducto auditivo.' },
        { label: 'occipital', name: 'Hueso occipital', text: 'Su saliente, cerca de la línea de Fráncfort prolongada.' },
      ],
      didYouKnow: 'En la década de 1880, en Fráncfort, unos craneólogos acordaron nivelar cada cráneo con esta línea.',
      figure: {
        type: 'skull',
        params: { subject: 'human', lesson: 'profile' },
        caption: 'Fig. 3 — Perfil en el plano de Fráncfort; gira ante una cuadrícula de proporciones.',
        scaleNote: 'Cráneo adulto, unos 17,5–18,5\u00a0cm de largo',
      },
      animation: {
        title: 'De frente a perfil',
        beats: [
          [0, 'De frente: una bola para el cráneo, la cara colgada debajo.'],
          [1.25, 'El cráneo gira; la cara se vuelve una cuña sobre la bola.'],
          [2.5, 'Perfil a 90°: conducto auditivo y borde orbitario a igual altura.'],
          [3.75, 'De vuelta, cada referencia se desliza a su sitio por su guía.'],
        ],
      },
      lesson: {
        steps: [
          { title: 'Horizontal y círculo', text: 'Trace una horizontal por lo alto del conducto auditivo y una vertical por ese punto; dibuje el círculo craneal, estirado de adelante atrás y centrado cerca de esa vertical.' },
          { title: 'Cuña facial y cuadrado', text: 'Cuelgue la cuña facial de la ceja al mentón, al ángulo mandibular y de ahí al oído; encierre el cráneo en un casi cuadrado y trace guías de cejas, nariz y mordida.' },
          { title: 'Órbita, abertura, perfil', text: 'Apoye el borde bajo de la órbita en la horizontal, retrase su borde curvo, recorte la abertura nasal bajo los huesos nasales y afine coronilla, occipucio y mandíbula, articulada justo ante el oído.' },
        ],
        proTip: 'Trace primero la línea de Fráncfort; un perfil desnivelado inclina toda la cara.',
        mistakes: [
          'Caja craneal demasiado pequeña. De perfil, el cráneo es la masa dominante.',
          'El oído por delante de la bisagra. La bisagra va siempre delante.',
        ],
        proportions: [
          'Caja craneal: cuatro de largo por tres de alto.',
          'Línea de Fráncfort prolongada: casi toca el saliente occipital.',
        ],
      },
      sources: ['Park et al. 2020', 'Garson 1885', 'Howells 1973', 'Turvey & Golden 2012', 'Betts et al. 2022 (OpenStax)'],
    },

    // ------------------------------------------------------------------ IV
    {
      id: 'bones',
      number: 'IV',
      layout: 'lesson',
      common: 'Los huesos del cráneo',
      commonAlt: null,
      scientific: 'Huesos craneales y faciales',
      authority: '',
      family: 'Cráneo humano · 8 craneales, 14 faciales',
      status: null,
      badge: 'Lección 4 · Intermedio',
      lede: 'Veintidós huesos, solo uno que se mueve, y costuras como puntadas.',
      body: [
        'El cráneo tiene ocho huesos: frontal, dos parietales, dos temporales, occipital, esfenoides y etmoides. La cara tiene catorce: maxilares, cigomáticos, nasales, lagrimales, palatinos y cornetes nasales inferiores, en pares, más el vómer y la mandíbula, impares. Solo la mandíbula se mueve; los demás se traban en suturas que engranan en la bóveda y son más lisas en la cara. La coronal cruza la coronilla y la sagital divide los parietales: dibuje ambas en zigzag fino.',
        'Para despiezar el cráneo, aleje cada hueso por una línea desde el centro, para que el ojo pueda reponerlo. Fíjese en el esfenoides, la clave alada de la base del cráneo: se une a doce huesos, entre ellos todos los demás craneales. Y tome veintidós como la cifra de manual: quedan fuera los seis huesecillos del oído y el hioides, y muchos cráneos llevan pequeños huesos extra en sus suturas.',
      ],
      // as in English, the counts sit in the labels; two values still take two
      // lines here (the fact strip is one line taller than in English)
      facts: [
        ['8 huesos craneales', 'cuatro impares, dos pares'],
        ['14 huesos faciales', 'seis pares, dos impares'],
        ['Hueso móvil', 'solo la mandíbula'],
        ['Excluidos', 'hioides, seis huesecillos del oído'],
      ],
      lookCloser: [
        { label: 'coronal-suture', name: 'Sutura coronal', text: 'Une el hueso frontal con ambos parietales.' },
        { label: 'sphenoid', name: 'Esfenoides', text: 'La clave alada: toca doce huesos, todos los demás craneales incluidos.' },
      ],
      didYouKnow: 'El hueso frontal nace en dos mitades, ya unidas a los nueve meses en un estudio tomográfico.',
      figure: {
        type: 'skull',
        params: { subject: 'human', lesson: 'bones' },
        caption: 'Fig. 4 — El cráneo desarticulado: ocho huesos craneales y catorce faciales.',
        scaleNote: 'Cráneo adulto, unos 17,5–18,5\u00a0cm de largo',
      },
      animation: {
        title: 'Separar y unir',
        beats: [
          [0, 'Armado: veintiún huesos trabados por suturas, la mandíbula en su bisagra.'],
          [1.25, 'El cráneo se abre por sus costuras.'],
          [2.5, 'Desarmado: ocho huesos craneales y catorce faciales.'],
          [3.75, 'Los huesos vuelven a cerrarse, cada uno a su sitio.'],
        ],
      },
      lesson: {
        steps: [
          { title: 'Contorno y suturas', text: 'Parta del perfil de la lección\u00a0III. Trace las suturas coronal, lambdoidea y escamosa: costuras sinuosas que cercan frontal, parietal, temporal y occipital.' },
          { title: 'Mapa de los huesos', text: 'Tiña cada hueso aparte —frontal, parietal, temporal, occipital, ala del esfenoides, pómulo, maxilar, nasal, mandíbula— y el lado del cráneo se leerá como un mapa.' },
          { title: 'Separar los huesos', text: 'Aleje cada hueso en línea recta desde un centro, sin girarlo, y ribetee cada uno con la costura que compartía con su vecino.' },
        ],
        proTip: 'Despiece en líneas rectas desde un centro, cada hueso orientado como estaba en el cráneo.',
        mistakes: [
          'Suturas de la bóveda como grietas rectas. Serpentean y engranan como un zíper.',
          'Contar el hioides como hueso del cráneo. No toca ningún otro hueso.',
        ],
        proportions: [
          'Desde arriba: el ancho, tres cuartos del largo.',
          'Parietales: la mayor parte del techo y los lados de la bóveda.',
        ],
      },
      sources: ['Betts et al. 2022 (OpenStax)', 'Gray 1918', 'Vu et al. 2001', 'Bellary et al. 2013'],
    },

    // ------------------------------------------------------------------ V
    {
      id: 'jaguar',
      number: 'V',
      layout: 'lesson',
      common: 'Cráneo de jaguar',
      commonAlt: null,
      scientific: 'Panthera onca',
      authority: '(Linnaeus, 1758)',
      family: 'Felidae · Pantherinae',
      status: null,
      badge: 'Lección 5 · Avanzado',
      lede: 'El mayor felino de Costa Rica: un cráneo para un solo acto, morder.',
      body: [
        'Frente al cráneo humano, el del jaguar invierte las prioridades: una caja craneal modesta tras un hocico corto y ancho y mandíbulas enormes. Constrúyalo con un óvalo largo y un bloque corto y romo; añada lo que pide la mordida: una cresta sagital que ancla arriba el temporal, el principal músculo mandibular, y arcos cigomáticos muy abiertos para que pase por debajo.',
        'Luego, las herramientas: caninos superiores con unos cuatro centímetros de esmalte y, detrás, las carniceras —cuarto premolar superior y primer molar inferior—, que cierran como tijeras. La mandíbula se articula en una bisagra transversal: casi solo sube y baja, mientras la humana también puede moler de lado. Y la órbita está abierta por detrás: dos puntas óseas se acercan, unidas en vida por un ligamento.',
      ],
      facts: [
        ['Dientes', '30, contra 32 de un humano adulto'],
        ['Longitud del cráneo', 'unos 24\u00a0cm (México)–30\u00a0cm (Argentina)'],
        ['Masa, Centroamérica', 'machos ~56, hembras ~41\u00a0kg'],
        ['Estado', 'Casi Amenazado; en peligro en Costa Rica'],
      ],
      lookCloser: [
        { label: 'sagittal-crest', name: 'Cresta sagital', text: 'Quilla ósea donde se ancla el temporal.' },
        { label: 'carnassial', name: 'Carnicera', text: 'P4 superior contra m1 inferior: tijeras para carne.' },
      ],
      didYouKnow: 'El jaguar suele matar mordiendo el cráneo; su fuerza de mordedura canina se estima entre unos 680 y 1000\u00a0newtons.',
      figure: {
        type: 'skull',
        params: { subject: 'jaguar', lesson: 'jaguar' },
        caption: 'Fig. 5 — Jaguar, *Panthera onca*: cráneo y mandíbula al morder.',
        scaleNote: 'Cráneo adulto, de unos 24\u00a0cm (México) a 30\u00a0cm (Argentina) de largo',
      },
      animation: {
        title: 'La mordida',
        beats: [
          [0, 'Boca cerrada: una cara corta entre arcos abiertos.'],
          [0.5, 'La mandíbula se abre en su bisagra transversal.'],
          [1.8, 'Apertura máxima: los largos caninos ya no se cruzan.'],
          [2.6, 'La mordida: el temporal, anclado en la cresta iluminada, cierra de golpe la mandíbula.'],
          [3.4, 'Las carniceras cortan al cruzarse; la mandíbula reposa.'],
        ],
      },
      lesson: {
        steps: [
          { title: 'Caja craneal y hocico', text: 'Dibuje un óvalo largo para la caja craneal y delante un bloque corto, el hocico; únalos con el declive frontal, trace la línea dental y marque la bisagra.' },
          { title: 'Cresta, arcos, mandíbula', text: 'Trace la cresta sagital por lo alto, abra bien los arcos y cuelgue de la bisagra la mandíbula corta y alta.' },
          { title: 'Órbitas, dientes, perfil', text: 'Deje la órbita abierta atrás, recorte la abertura nasal, ponga caninos y carniceras y afine de la cresta al mentón.' },
        ],
        proTip: 'Dibújelo junto a un cráneo humano de igual caja craneal: el del felino está hecho para morder.',
        mistakes: [
          'Cerrar la órbita con un anillo óseo, como en el cráneo humano.',
          'Arcos cigomáticos estrechos. Se abren mucho para dar espacio al temporal.',
        ],
        proportions: [
          'Esmalte canino: unos 4\u00a0cm, más alto que nuestra órbita.',
          'Canino superior: corona de cerca de vez y media el largo de la carnicera superior.',
        ],
      },
      sources: ['Del Moral Sachetti et al. 2011', 'Wroe et al. 2005', 'Quigley et al. 2017 (IUCN)', 'UNEP/CMS 2020', 'Animal Diversity Web'],
    },

    // ------------------------------------------------------------------ VI
    {
      id: 'skull-and-snake',
      number: 'VI',
      layout: 'lesson',
      common: 'Calavera y serpiente',
      commonAlt: null,
      scientific: 'Bothriechis nigroadspersus',
      authority: '(Steindachner, 1870)',
      family: 'Composición · Viperidae, Crotalinae',
      status: null,
      badge: 'Lección 6 · Avanzado',
      lede: 'Cráneo pesado y quieto; línea ligera y móvil. Que la línea guíe.',
      body: [
        'Esta lección trata de composición. El cráneo es masa: simétrico, quieto, pesado en la coronilla; la víbora es línea: esbelta, asimétrica, móvil. Gire el cráneo, descéntrelo y lleve la serpiente a su alrededor en un lazo continuo: desde una órbita, por la ceja y la bóveda, tras la oreja, más abajo del arco cigomático y de vuelta por la mejilla. Donde cuerpo y hueso se solapan, surge la profundidad sin sombreado.',
        'El modelo es *Bothriechis nigroadspersus*, la más extendida de las dos tobobas de pestañas de Costa Rica, por años incluida en *B. schlegelii*: cabeza ancha y triangular sobre cuello delgado, dos escamas erguidas sobre cada ojo. Dibújela de fotos o ejemplares de museo, nunca de un animal manipulado. Una mordedura es una emergencia: acuda enseguida a un hospital, donde se trata con suero antiofídico; sin torniquetes, cortes, succión ni hielo.',
      ],
      facts: [
        ['Longitud adulta', 'hasta unos 90\u00a0cm'],
        ['Pestañas', 'dos supraciliares erguidas, espinosas'],
        ['Hábitat', 'bosque húmedo, nivel del mar a 1430\u00a0m'],
        ['Crías', 'nacen vivas, 6–23 por camada'],
      ],
      lookCloser: [
        { label: 'orbit', name: 'Órbita', text: 'La nota más oscura; aquí sale y regresa la víbora.' },
        { label: 'zygomatic-arch', name: 'Arco cigomático', text: 'Pase más abajo; cruzar la mejilla da profundidad.' },
      ],
      didYouKnow: 'Clasificada como *Bothriechis schlegelii* hasta 2024, ha recuperado su nombre de 1870.',
      figure: {
        type: 'skull',
        params: { subject: 'human', lesson: 'skull-and-snake', snake: { species: 'bothriechis-schlegelii' } },
        caption: 'Fig. 6 — Cráneo humano y bocaracá: un estudio de composición.',
        scaleNote: 'Cráneo de unos 18\u00a0cm de largo; víbora de hasta unos 90\u00a0cm',
      },
      // the head (eye anchor) in the skull frame, from the lab: in the orbit at 0,
      // on the brow at 0.5, the vault at 1.3, behind the ear at 2.6, round the
      // mastoid at 3.2–3.5, 2.2–2.8 cm below the arch and outside the ramus at
      // 3.75–4.2 (it never passes under the arch), on the cheek at 4.4–4.6, in
      // the socket's lower-outer corner at 4.7. "más abajo del arco" says below,
      // not through: Spanish "bajo/por debajo del arco" would read as the gap.
      animation: {
        title: 'Por la órbita',
        beats: [
          [0, 'La cabeza de la víbora descansa en la órbita; su cuerpo rodea el cráneo.'],
          [0.5, 'La cabeza sale de la órbita y cruza la ceja.'],
          [1.3, 'Trepa por encima de la bóveda.'],
          [2.6, 'Luego baja por detrás de la oreja.'],
          [3.6, 'Avanza más abajo del arco cigomático, junto a la mandíbula.'],
          [4.4, 'Cruza la mejilla y se desliza de vuelta a la órbita.'],
        ],
      },
      lesson: {
        steps: [
          { title: 'Esfera, eje y órbitas', text: 'Esboce el cráneo como esfera y línea central y sitúe ambas órbitas; de una de ellas saldrá la serpiente.' },
          { title: 'Enhebrar la serpiente', text: 'Trace su ruta en un solo lazo —desde la órbita, por la ceja y la bóveda, tras la oreja, de vuelta por la mejilla— y decida cada cruce: cuerpo sobre hueso, o al revés.' },
          { title: 'Órbitas, cabeza, contorno', text: 'Recorte órbitas y abertura, dé a la víbora su cabeza triangular y sus pestañas, y afine ambos contornos.' },
        ],
        proTip: 'Engrose la serpiente donde se acerca a usted; adelgácela donde se aleja.',
        mistakes: [
          'Vueltas iguales, como un resorte. Varíe cada curva.',
          'Tangencias: una curva que roza el borde del cráneo lo aplana.',
        ],
        proportions: [
          'Hembra grande: unos cinco largos de cráneo.',
          'Punto focal: cabeza de la víbora, a un tercio.',
        ],
      },
      sources: ['Arteaga et al. 2024', 'Reyes-Velasco 2024', 'WHO 2026', 'Maduwage et al. 2024'],
    },
  ],

  back: {
    note: {
      title: 'Práctica y respeto',
      paragraphs: [
        'Practique un poco cada día, no mucho una vez por semana. Caliente con una página de círculos y líneas centrales. Luego haga tres construcciones rápidas —frente, tres cuartos y perfil—, de pocos minutos cada una, solo formas grandes y guías. Dedique el resto de la sesión a un estudio cuidadoso: primero los planos, luego órbitas, suturas y dientes, con un rayado que siga la forma. Termine dibujando una vista de memoria y comparándola con la lámina. Gire cada día las figuras de este libro a un ángulo nuevo, para aprender el cráneo y no una imagen de él.',
        'Cada cráneo fue una persona. Trabaje con réplicas, escaneos y las figuras de este libro; los restos humanos reales pertenecen a museos y colecciones docentes, custodiados con cuidado y según la ley. En Costa Rica, los restos humanos de culturas prehispánicas son patrimonio nacional arqueológico. El jaguar también está protegido —el Apéndice\u00a0I de la CITES prohíbe su comercio internacional con fines comerciales—, así que dibújelo de ejemplares de museo y fotografías, nunca de partes compradas o vendidas. Mire las serpientes vivas solo a distancia segura y nunca manipule una; una mordedura exige un hospital, donde se trata con suero antiofídico.',
      ],
    },
    glossary: [
      ['Calvaria', 'El casquete craneal: la bóveda de hueso frontal, parietal y occipital. *Calavera* viene de la misma palabra latina.'],
      ['Carniceras', 'En los carnívoros, el par cortante que forman el cuarto premolar superior y el primer molar inferior.'],
      ['Línea de construcción', 'Guía tenue —línea central, eje u horizontal— trazada antes del contorno y luego borrada o repasada.'],
      ['Apófisis coronoides', 'La lámina delgada en la parte anterior de la rama mandibular; en ella se inserta el temporal.'],
      ['Escorzo', 'El acortamiento aparente de una forma que se aleja del observador.'],
      ['Plano de Fráncfort', 'La orientación estándar del cráneo: una horizontal por lo alto del conducto auditivo y el punto más bajo del borde orbitario.'],
      ['Rayado', 'Líneas paralelas que construyen el tono en el grabado y el dibujo; cruzadas entre sí, forman un rayado cruzado.'],
      ['Mandíbula', 'El maxilar inferior, el único hueso móvil del cráneo.'],
      ['Abertura nasal', 'El orificio de la nariz en el cráneo, en forma de pera (piriforme), con la punta arriba.'],
      ['Norma', 'Una vista estándar del cráneo: frontal, lateral, vertical, occipital o basal.'],
      ['Cresta sagital', 'Reborde en lo alto del cráneo donde se ancla el temporal; prominente en los grandes felinos.'],
      ['Sutura', 'Articulación fibrosa entre huesos del cráneo: en zigzag en la bóveda, biselada en la sien, casi recta en la cara.'],
      ['Articulación temporomandibular', 'La articulación de la mandíbula, justo ante el conducto auditivo, donde el cóndilo rota y se desliza a la vez.'],
      ['Arco cigomático', 'El arco del pómulo, formado donde el hueso cigomático se une a una apófisis del hueso temporal.'],
    ],
    sources: [
      'Betts, J. G., Young, K. A., Wise, J. A., et al. (2022). Anatomy and Physiology, 2.ª ed. Houston: OpenStax, Rice University. https://openstax.org/details/books/anatomy-and-physiology-2e',
      'Gray, H. (1918). Anatomy of the Human Body, 20.ª ed., revisada por W. H. Lewis. Philadelphia: Lea & Febiger.',
      'Howells, W. W. (1973). Cranial Variation in Man. Papers of the Peabody Museum of Archaeology and Ethnology 67. Cambridge, MA: Harvard University. Datos: Howells, W. W. (1996), American Journal of Physical Anthropology 101: 441–442.',
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
      'Calaveras — Dibujar el cráneo: un método constructivo. Lámina, vol.\u00a0III. Primera edición, 2026.',
      'Lámina Natural History Press es un sello editorial ficticio. Texto, pasos de construcción y figuras son originales de este libro.',
      'Las figuras son modelos 3D vivos, generados con Three.js WebGPU y *shaders* TSL: WGSL en WebGPU, GLSL en la alternativa WebGL 2.',
      'Compuesto en Oswald, EB Garamond, IBM Plex Sans Condensed e IBM Plex Mono.',
      'Papel blanco puro, tinta negra y un acento bermellón; las guardas, una cuadrícula de dibujo.',
      'Medidas según datos craneométricos y de campo publicados; véanse las fuentes.',
    ],
  },
};
