import en from '../celulas.js';
const plate = (i, text) => ({ ...en.plates[i], ...text, figure: { ...en.plates[i].figure, ...text.figure } });
export default {
  ...en, locale: 'es', title: 'Células', subtitle: 'Las pequeñas máquinas de la vida', kicker: 'Lámina · Volumen V', edition: 'Primera edición, 2026',
  blurb: 'Abre una célula y sigue su extraordinaria química cotidiana: fronteras, mensajes, energía, luz y la formación de dos.',
  imprint: ['Explicaciones originales y modelos esquemáticos basados en el NHGRI y OpenStax Biology 2e. Los colores identifican partes; tamaños y tiempos son ilustrativos.'],
  intro: { title: 'Una fábrica sin capataz', paragraphs: [
    'Imagina una fábrica que construye sus herramientas, repara sus paredes y a veces produce otra fábrica. Ahora quita a los trabajadores. Queda una célula: moléculas que chocan, encajan, cambian de forma y reaccionan. Ninguna necesita conocer el plan para que surja un proceso organizado.',
    'Tu cuerpo contiene billones de células. Algunas se contraen, otras llevan señales, otras forman barreras, y muchas desempeñan varias funciones. Intercambian materiales y mensajes químicos. Su cooperación es extraordinaria, pero no consiste en una reunión de personitas que deciden qué hacer.',
    'Abriremos seis ventanas a este mundo. Cada una comienza con una pregunta que puedes plantear sin conocer un término técnico. Los modelos son diagramas que puedes girar y separar, no grabaciones de microscopio: colores, tamaños y movimientos repetidos revelan un mecanismo. Pregunta qué cruza la frontera, de dónde llega la energía y qué cambia al retirar una pieza. Comprender empieza cuando un nombre permite hacer una predicción.'
  ], pullQuote: 'La vida no deja de lado la química. La mantiene organizada y abastecida de energía.' },
  howTo: { title: 'Haz una predicción y observa', items: [
    ['Arrastra una esquina', 'Pasa la hoja para encontrar la siguiente pregunta.'],
    ['Arrastra la figura', 'Gira el modelo y examina su lado oculto.'],
    ['Haz doble clic', 'Acércate al mecanismo.'],
    ['Capas · Despiece · Etiquetas', 'Oculta una capa, separa las piezas y nómbralas.'],
    ['Reproducir · Momento', 'Observa un proceso lento y después examina un instante.'],
    ['Escuchar', 'Oye solo la página izquierda actual en inglés o español.'],
    ['Vista del libro', 'Coloca las páginas de frente con el control de inclinación.']
  ] },
  plates: [
    plate(0, {
      common: 'Una gota organizada', scientific: 'Una célula animal eucariota', family: 'Biología celular · Organización', badge: 'Corte esquemático',
      lede: 'Una célula contiene mucha agua. ¿Por qué no se comporta como un charco?',
      body: [
        'Pon sal en agua y se dispersa. Pon una célula viva en un ambiente adecuado y mantiene diferencias: más cantidad de una sustancia aquí, menos de otra allá. Su membrana ayuda a establecer un interior. Dentro de esa frontera, las proteínas aceleran reacciones concretas, las fibras sostienen y mueven componentes, y los compartimentos separan algunos procesos. El agua proporciona el medio; la organización crea posibilidades que un charco no tiene.',
        'Nuestro corte muestra una célula animal con núcleo. Este contiene la mayor parte de su ADN, mientras los ribosomas construyen proteínas a partir de aminoácidos. Las membranas plegadas y las mitocondrias ofrecen espacios especializados. No son habitaciones diminutas con trabajadores que actúan a propósito: el movimiento permite encuentros entre moléculas, y sus interacciones químicas determinan lo que ocurre. Las bacterias también son células, pero carecen de núcleo rodeado por membrana. Una célula intercambia materia y energía con el entorno; no es una máquina cerrada de movimiento perpetuo. Oculta una capa y pregunta qué información ha desaparecido del dibujo. Ninguna pieza coloreada es «la vida». Lo interesante son las relaciones que se mantienen.'
      ],
      facts: [['Ejemplo', 'Célula animal'], ['Interior', 'Agua y moléculas disueltas'], ['Frontera', 'Membrana plasmática'], ['Información', 'ADN'], ['Modelo', 'Corte ampliado']],
      lookCloser: [
        { label: 'membrane', name: 'Membrana celular', text: 'Una frontera que permite intercambios regulados, en vez de aislarlo todo.' },
        { label: 'nucleus', name: 'Núcleo', text: 'Un compartimento rodeado por membrana que guarda la mayor parte del ADN de esta célula animal.' },
        { label: 'ribosome', name: 'Ribosomas', text: 'Pequeños conjuntos moleculares que unen aminoácidos para formar proteínas.' }
      ],
      didYouKnow: 'Las bacterias poseen ADN y fabrican proteínas sin núcleo. El núcleo distingue la organización eucariota; por sí solo no define la vida.',
      figure: { caption: 'Fig. I — Una célula animal abierta para revelar algunos compartimentos.', scaleNote: 'Esquema; colores y tamaños ilustrativos' },
      animation: { title: 'Orden sin capataz', beats: [[0, 'La membrana delimita un interior y el corte revela su contenido.'], [1.6, 'Pequeñas moléculas se mueven por el interior poblado.'], [3.3, 'Separa las piezas para ver cómo la frontera y los compartimentos organizan el conjunto.']] }
    }),
    plate(1, {
      common: 'Una frontera con puertas', scientific: 'Permeabilidad selectiva', family: 'Biología celular · Transporte', badge: 'Organización molecular',
      lede: '¿Cómo mantienes un interior distinto del exterior sin cerrar todas las puertas?',
      body: [
        'Una membrana comienza con una diferencia útil. Un fosfolípido tiene una cabeza que interactúa bien con el agua y colas que no. En agua, muchas moléculas así pueden formar una doble capa: las cabezas miran hacia los medios acuosos de ambos lados y las colas se reúnen en el centro. No hace falta un albañil. Las interacciones moleculares favorecen esta organización, aunque una célula viva también construye, modifica y repara sus membranas.',
        'Ese centro aceitoso cambia lo que puede cruzar. Moléculas pequeñas sin carga, como el oxígeno, pasan con relativa facilidad; los iones cargados no lo atraviesan libremente. Las proteínas que cruzan la membrana ofrecen rutas selectivas. Un canal puede permitir que un ion avance a favor de su gradiente electroquímico; una bomba utiliza energía para transportar sustancias contra un gradiente. El dibujo muestra un canal, no una bomba, y las bolitas móviles solo indican una ruta posible. No representan una corriente medida. Observa la idea central: una frontera puede ser flexible y selectiva a la vez. Si todas las moléculas cruzaran con igual facilidad, se perderían muchas diferencias de las que depende la química celular.'
      ],
      facts: [['Estructura', 'Dos capas de fosfolípidos'], ['Cabezas', 'En contacto con agua'], ['Colas', 'Hacia el interior aceitoso'], ['Canal', 'Ruta pasiva selectiva'], ['Bomba', 'Necesita una fuente de energía']],
      lookCloser: [
        { label: 'head', name: 'Cabezas polares', text: 'Las cabezas polares están en contacto con el agua a ambos lados de la membrana.' },
        { label: 'tails', name: 'Colas lipídicas', text: 'Las colas forman una barrera que los iones cargados no cruzan libremente.' },
        { label: 'channel', name: 'Proteína canal', text: 'Un paso por la bicapa cuya selectividad depende de su estructura molecular.' }
      ],
      didYouKnow: 'Una membrana biológica es una organización fluida. Muchos lípidos y proteínas se desplazan lateralmente en ella; no es una pared rígida.',
      figure: { caption: 'Fig. II — Una bicapa de fosfolípidos y un canal que atraviesa su centro.', scaleNote: 'Corte esquemático; partículas ampliadas' },
      animation: { title: 'Un cruce selectivo', beats: [[0, 'Las cabezas en contacto con el agua rodean un centro de colas lipídicas.'], [1.6, 'El ion resaltado recorre un canal a través de la membrana.'], [3.3, 'Otras partículas quedan fuera de esta ruta; el ciclo es una repetición explicativa.']] }
    }),
    plate(2, {
      common: 'Del mensaje a la máquina', scientific: 'ADN, ARN y proteína', family: 'Biología celular · Información', badge: 'La información se copia',
      lede: 'Una receta no se convierte en un pastel. Del mismo modo, el ADN no se transforma en proteína.',
      body: [
        'Piensa en la diferencia entre guardar una receta y preparar la cena. Una célula conserva información en la secuencia de su ADN. Durante la transcripción, una enzima produce una copia de ARN a partir de un molde de ADN. En un gen que codifica una proteína, el ARN mensajero lleva información que puede utilizar un ribosoma. En nuestro ejemplo animal, el ADN permanece en el núcleo mientras el mensaje puede llegar al citoplasma. Las letras químicas no son pequeñas palabras comprendidas por un lector.',
        'En el ribosoma, los ARN de transferencia ayudan a relacionar el mensaje con aminoácidos que se unen en una cadena. Su secuencia y su entorno influyen en cómo se pliega y en lo que puede hacer. Algunas proteínas catalizan reacciones; otras forman soportes, receptores o canales. La analogía tiene límites: el ribosoma no entiende recetas y no todos los genes codifican proteínas. Las moléculas se reconocen por sus formas e interacciones. Sigue la cadena coloreada, pero no confundas sus pocas bolitas con una proteína real completa. La figura resume muchas etapas en una ruta legible desde la secuencia almacenada hasta la función molecular.'
      ],
      facts: [['Archivo', 'Secuencia de ADN'], ['Mensaje de trabajo', 'ARN mensajero'], ['Lugar de montaje', 'Ribosoma'], ['Unidades', 'Aminoácidos'], ['Producto', 'Una cadena proteica']],
      lookCloser: [
        { label: 'dna', name: 'Molde de ADN', text: 'La secuencia se copia; el ADN no se convierte en una proteína.' },
        { label: 'rna', name: 'ARN mensajero', text: 'Un mensaje de ARN conecta la transcripción con la síntesis de proteínas.' },
        { label: 'ribosome', name: 'Ribosoma', text: 'Un conjunto molecular une aminoácidos en el orden indicado por el mensaje.' },
        { label: 'protein', name: 'Cadena proteica', text: 'La cadena que emerge debe adoptar una estructura útil para cumplir su función.' }
      ],
      didYouKnow: 'Los ribosomas contienen ARN y proteínas. El ARN forma parte del mecanismo que produce enlaces peptídicos; no es solamente un mensaje desechable.',
      figure: { caption: 'Fig. III — ADN, un mensaje de ARN, un ribosoma y una proteína en formación.', scaleNote: 'Ruta esquemática; piezas fuera de escala' },
      animation: { title: 'Copiar, leer, ensamblar', beats: [[0, 'El ADN almacena una secuencia; un mensaje de ARN ofrece una copia de trabajo.'], [1.6, 'El ribosoma lee el mensaje mientras se unen aminoácidos.'], [3.3, 'Emerge una cadena proteica; la animación repite el proceso esquemático.']] }
    }),
    plate(3, {
      common: 'Un convertidor diminuto', scientific: 'Mitocondrias y ATP', family: 'Biología celular · Energía', badge: 'La energía se transforma',
      lede: 'Una rueda hidráulica necesita un desnivel. Un motor molecular puede aprovechar una diferencia a través de una membrana.',
      body: [
        'El alimento y el oxígeno no chocan simplemente dentro de una célula para producir llamas. Durante la respiración aerobia, una red de reacciones transfiere energía en pasos controlados. En una mitocondria, la transferencia de electrones por la membrana interna ayuda a bombear iones de hidrógeno a través de ella. Así se crea una diferencia electroquímica, parecida a cargar una batería. El oxígeno recibe electrones al final de la cadena, donde se forma agua. La membrana plegada ofrece espacio para muchas copias de este mecanismo.',
        'Los iones de hidrógeno pueden regresar por la ATP sintasa, un conjunto molecular con una pieza giratoria. Los cambios acoplados de la enzima ayudan a producir ATP a partir de ADP y fosfato. Después, la célula acopla reacciones del ATP a trabajos como transportar sustancias o construir moléculas. Cuidado con «energía en un enlace»: romper un enlace, por sí solo, cuesta energía. La hidrólisis del ATP puede aportar energía libre porque la reacción completa, con sus nuevas interacciones y productos, resulta favorable en condiciones celulares. El modelo amplía el motor junto a una mitocondria abierta; sus tamaños relativos no son reales. Sigue la diferencia que impulsa el movimiento, no un combustible mágico dentro de una bolita.'
      ],
      facts: [['Frontera', 'Membrana interna mitocondrial'], ['Diferencia almacenada', 'Gradiente electroquímico de protones'], ['Motor', 'ATP sintasa'], ['Producto', 'ATP desde ADP y fosfato'], ['Oxígeno', 'Aceptor final de electrones']],
      lookCloser: [
        { label: 'cristae', name: 'Pliegues internos', text: 'Las crestas amplían la membrana interna que contiene los mecanismos de conversión energética.' },
        { label: 'gradient', name: 'Gradiente', text: 'Los protones pasan del espacio intermembranoso a la matriz: hacia arriba en el fragmento ampliado.' },
        { label: 'synthase', name: 'ATP sintasa', text: 'El flujo de protones se acopla al giro y a la producción de ATP.' }
      ],
      didYouKnow: 'Las células vegetales también tienen mitocondrias. Capturar luz solar no elimina su necesidad de transferir energía mediante la respiración celular.',
      figure: { caption: 'Fig. IV — Una mitocondria junto a un esquema ampliado de la ATP sintasa.', scaleNote: 'Motor muy ampliado; movimiento lento' },
      animation: { title: 'Una diferencia hace trabajo', beats: [[0, 'Los pliegues internos contienen los mecanismos de la respiración aerobia.'], [1.6, 'Los protones entran en la matriz por la ATP sintasa; en la ampliación, avanzan hacia arriba.'], [3.3, 'El giro se acopla a la producción de ATP; la energía se transfiere, no se crea.']] }
    }),
    plate(4, {
      common: 'La luz se vuelve química', scientific: 'El cloroplasto', family: 'Biología celular · Fotosíntesis', badge: 'Materia y energía difieren',
      lede: 'Una hoja obtiene materia de su entorno. La luz aporta energía, no pequeños ladrillos verdes.',
      body: [
        'Sostén una hoja frente a la luz e imagina sus células recogiendo un suministro de energía. Dentro de los cloroplastos, los pigmentos absorben luz. Las reacciones de las membranas tilacoidales usan esa energía para impulsar transferencias de electrones y producir portadores de energía química. El agua aporta electrones y se libera oxígeno. El oxígeno producido aquí procede del agua, no de arrancárselo al dióxido de carbono. Es fácil perder esa distinción cuando todos los ingredientes aparecen juntos en una ecuación ordenada.',
        'Otras reacciones, llamadas ciclo de Calvin, usan ATP y NADPH para incorporar dióxido de carbono a moléculas orgánicas. Ocurren en el estroma que rodea los tilacoides. La planta puede utilizar sus productos para fabricar azúcares y muchas otras sustancias, incluido el material que será madera. El carbono es materia que llega del aire; la luz transfiere energía. Nuestro corte separa pilas de tilacoides para mostrar esta división de funciones. Es un diagrama de organización, no un mecanismo químico completo. Las plantas también respiran y no todas sus células contienen cloroplastos. Una raíz en la oscuridad no es, en secreto, un pequeño panel solar.'
      ],
      facts: [['Captación', 'Clorofila y otros pigmentos'], ['Reacciones luminosas', 'Membranas de tilacoides'], ['Fijación del carbono', 'Ciclo de Calvin en estroma'], ['Fuente de carbono', 'Dióxido de carbono'], ['Oxígeno liberado', 'Procede del agua']],
      lookCloser: [
        { label: 'thylakoid', name: 'Pilas tilacoidales', text: 'Los sacos membranosos contienen los mecanismos de las reacciones dependientes de la luz.' },
        { label: 'stroma', name: 'Estroma', text: 'El fluido que rodea los tilacoides contiene enzimas del ciclo de Calvin.' },
        { label: 'light', name: 'Luz entrante', text: 'La luz transfiere energía; el dióxido de carbono aporta carbono para construir moléculas orgánicas.' }
      ],
      didYouKnow: 'El oxígeno liberado por la fotosíntesis procede del agua. El carbono para fabricar azúcares procede del dióxido de carbono: distintos átomos siguen distintas rutas.',
      figure: { caption: 'Fig. V — Un cloroplasto abierto con pilas de tilacoides y luz entrante.', scaleNote: 'Corte esquemático; pulsos de luz simbólicos' },
      animation: { title: 'Sigue la materia y la energía', beats: [[0, 'La luz llega a los pigmentos de las membranas tilacoidales.'], [1.6, 'Las reacciones luminosas aportan ATP y NADPH y liberan oxígeno del agua.'], [3.3, 'La fijación del carbono utiliza esos suministros químicos en el estroma.']] }
    }),
    plate(5, {
      common: 'Una se convierte en dos', scientific: 'Mitosis y cooperación', family: 'Biología celular · Continuidad', badge: 'Repetición, no marcha atrás',
      lede: 'Copiar las instrucciones es solo parte del problema. Cada célula nueva debe recibir un conjunto utilizable.',
      body: [
        'Antes de dividirse por mitosis, una célula animal copia su ADN. Un cromosoma duplicado contiene dos cromátidas hermanas. Durante la división, las fibras del huso se unen a los cromosomas y ayudan a distribuir las copias hacia lados opuestos. Después, la célula suele repartir su contenido y formar dos células hijas. Este no es el proceso que produce óvulos o espermatozoides, y copiar no garantiza que todas las moléculas o comportamientos futuros sean idénticos.',
        'El modelo sigue la separación después de la copia: los cromosomas emparejados ocupan primero el centro y luego avanzan hacia polos opuestos mientras la célula se estrecha. Dibujamos pocos cromosomas para que el movimiento sea legible. El regreso al comienzo es una repetición explicativa, no una célula que hace funcionar su biología al revés. Ahora pregunta por qué todas las células del cuerpo no se dividen continuamente. Las señales químicas, los recursos disponibles y los controles internos influyen en su entrada al ciclo. Las vecinas se comunican mediante moléculas y contactos físicos; cooperar no exige un pequeño supervisor. Algunas células especializadas casi no se dividen. Mantener un tejido requiere coordinar crecimiento, trabajo y pérdida, no producir el máximo número posible de copias.'
      ],
      facts: [['Antes de dividirse', 'Se copia el ADN'], ['Copias emparejadas', 'Cromátidas hermanas'], ['Distribuidor', 'Huso mitótico'], ['Reparto', 'Citocinesis'], ['Control', 'Señales internas y externas']],
      lookCloser: [
        { label: 'chromosomes', name: 'Cromosomas', text: 'Solo se dibujan unos pocos cromosomas duplicados; el número real depende del organismo.' },
        { label: 'spindle', name: 'Fibras del huso', text: 'Los microtúbulos ayudan a colocar y separar las copias cromosómicas.' },
        { label: 'furrow', name: 'Surco divisorio', text: 'En esta célula animal, una constricción reparte el contenido celular.' }
      ],
      didYouKnow: 'La división celular y la copia del ADN son procesos regulados. Muchas células pueden abandonar el ciclo activo en vez de dividirse de nuevo inmediatamente.',
      figure: { caption: 'Fig. VI — Separación de cromosomas y constricción en una célula animal esquemática.', scaleNote: 'Pocos cromosomas; la última fase repite' },
      animation: { title: 'Repartir las copias', beats: [[0, 'El ADN ya se ha copiado; los cromosomas emparejados están cerca del centro.'], [1.6, 'Las fibras del huso ayudan a separar las copias hacia lados opuestos.'], [3.3, 'La célula se estrecha; el diagrama vuelve al comienzo para otra repetición explicativa.']] }
    })
  ],
  back: {
    ...en.back,
    note: { title: 'Las preguntas son las herramientas', paragraphs: ['Intenta explicar una célula sin usar la palabra «fábrica». ¿Qué establece una frontera? ¿Qué la atraviesa? ¿Qué reacción aporta energía a otra? Esas preguntas convierten una metáfora en algo que puedes poner a prueba.', 'Estas láminas muestran mecanismos seleccionados. Los colores son inventados, las proporciones están alteradas y la repetición permite examinar despacio. Una célula real está más abarrotada, menos ordenada y es muchísimo más compleja. Los diagramas no simulan dinámica molecular ni predicen enfermedades.', 'La próxima vez que veas una hoja, un rasguño cicatrizado o una masa que sube, busca los mismos ingredientes: materia reorganizada, energía transferida e información utilizada. Llamar a la vida química cotidiana no la menosprecia. Es el comienzo de su explicación.'] },
    glossary: [
      ['ATP', 'Molécula cuyas reacciones pueden acoplarse al trabajo celular; se regenera continuamente.'],
      ['Célula', 'La unidad básica organizada de los seres vivos.'],
      ['Cloroplasto', 'Orgánulo donde ocurre la fotosíntesis en plantas y algas.'],
      ['Cromosoma', 'Molécula de ADN con proteínas asociadas que lleva información genética.'],
      ['Citoplasma', 'Material dentro de la membrana plasmática pero fuera del núcleo.'],
      ['Gradiente', 'Una diferencia espacial, como la concentración o el potencial eléctrico.'],
      ['Membrana', 'Frontera selectiva formada principalmente por lípidos y proteínas.'],
      ['Mitocondria', 'Orgánulo fundamental para la conversión aerobia de energía en células eucariotas.'],
      ['Ribosoma', 'Conjunto de ARN y proteínas que fabrica cadenas proteicas.'],
      ['Transcripción', 'Producción de una copia de ARN utilizando un molde de ADN.'],
      ['Traducción', 'Uso de un mensaje de ARN para ensamblar una cadena de aminoácidos.'],
      ['Tilacoide', 'Saco membranoso con mecanismos de las reacciones luminosas de un cloroplasto.']
    ],
    colophon: ['Textos originales e ilustraciones científicas procedurales para esta edición. Lámina Science Press es un sello ficticio.', 'Los tamaños, colores y tiempos de los modelos están alterados a propósito. Explican relaciones seleccionadas; no son grabaciones de microscopio.', 'Lee en inglés o español, gira los modelos, separa sus piezas y escucha la página izquierda actual.']
  }
};
