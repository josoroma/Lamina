// Spanish for the skull figures (figure strings). Keys are the exact English strings in code; values keep every
// {placeholder}. See .scratch/bilingual/design-i18n.md §3.
//
// Every string src/subjects/skulls/* gives the reader, the layers popover, the
// lab and the SVG plate: label pills and cards, layer names and hints, part
// names (the bones and teeth the SVG plate titles, its generated region names
// included) and the lessons' own beats. Anatomy follows the termbase of
// docs/books/es-style.md §3.3 and the wording of src/books/es/calaveras.js
// (apófisis, never proceso; esfenoides, etmoides, lagrimal, cornete).
//
// Pills. A pill whose label has a look-closer row is exactly that row's
// Spanish name (lead decision L1), and every pill keeps its text whole within
// 110 px (12.5 px UI sans, audit --i18n). Where the full name is wider, the
// pill takes the short form the book already uses: 'Coronoid process' prints
// «Coronoides» («Apófisis coronoides» takes 122 px; «rama, coronoides»,
// lesson II) and 'Mastoid process' «Mastoides» (117 px; «la mastoides»,
// lesson III), their cards opening with the full name; 'Zygomatic bone'
// prints «Cigomático» («Hueso cigomático» takes 111 px). 'Piriform aperture'
// is «Orificio piriforme» (104 px), Terminologia Anatomica's Spanish for
// apertura piriformis, where «Abertura piriforme» takes 114 px. The
// look-closer names in src/books/es/calaveras.js follow these pills.
// 'Carnassial (P4/m1)' is «Carnicera», the look-closer name, and its card
// names the two teeth. The muscle is «Músculo temporal», never a bare
// «Temporal» beside «Hueso temporal».
//
// Lesson VI forwards the viper's labels, parts and colours from the snakes
// subject: those are snake strings and live in snakes.js. 'Skull' and 'Head'
// are snake strings too (the viper's skeleton, its head): snakes.js keeps the
// same values. Typography as in the manifests: decimal comma, a no-break space
// before units, degrees attached. Every string here is an exact key: the
// skulls build none at run time (the teeth's four names are a finite set).
export default {
  // ---------------------------------------------------------------- layers (lessons.js)
  'Construction': 'Construcción',
  'Ball, centre line, brow/eye/nose lines, jaw taper': 'Esfera, línea central, líneas de cejas, ojos y nariz, mandíbula en cuña',
  'Planes': 'Planos',
  'The skull blocked in as flat planes': 'El cráneo esbozado en planos',
  'Engraving': 'Grabado',
  'The finished skull, engraved in ink': 'El cráneo terminado, grabado en tinta',
  'Bones': 'Huesos',
  'Colour each bone (atlas palette)': 'Un color por hueso, como en los atlas',
  'Sutures': 'Suturas',
  'Wavy joints between the cranial bones': 'Uniones sinuosas entre los huesos craneales',
  'The hinge axis and the arc the chin travels': 'El eje de la bisagra y el arco que recorre el mentón',
  'Muscles': 'Músculos',
  'Temporalis and masseter, the closing muscles': 'Temporal y masetero, los músculos de cierre',
  'Teeth': 'Dientes',
  '32 adult teeth': 'Los 32 dientes del adulto',
  'The ball of the cranium in three rings': 'La bola del cráneo en tres anillos',
  'Proportion grid': 'Cuadrícula de proporciones',
  'Square, thirds and the ear line in profile': 'Cuadrado, tercios y línea del oído, de perfil',
  'Coronal, sagittal, lambdoid and squamous sutures': 'Suturas coronal, sagital, lambdoidea y escamosa',
  'Braincase oval, muzzle box and arch flare': 'Óvalo de la caja craneal, bloque del hocico y arcos abiertos',
  'Canines and carnassials (30 teeth)': 'Caninos y carniceras (30 dientes)',
  'The path the snake follows': 'La ruta que sigue la serpiente',
  'Skull': 'Cráneo',
  'The engraved skull': 'El cráneo grabado',
  'Snake': 'Serpiente',
  'Bothriechis nigroadspersus, golden “oropel” morph': 'Bothriechis nigroadspersus, fase dorada (oropel)',

  // ---------------------------------------------------------------- labels: the human skull (species.js)
  'Frontal bone': 'Hueso frontal',
  'The forehead and the roofs of both orbits.': 'La frente y el techo de ambas órbitas.',
  'Parietal bone': 'Hueso parietal',
  'Paired plates that make the roof and sides of the vault.': 'Placas pares que forman el techo y los lados de la bóveda.',
  'Temporal bone': 'Hueso temporal',
  'Houses the ear and carries the jaw joint.': 'Aloja el oído y lleva la articulación de la mandíbula.',
  'Occipital bone': 'Hueso occipital',
  'Back and base of the skull, around the foramen magnum.': 'Parte posterior y base del cráneo, en torno al agujero magno.',
  'Sphenoid': 'Esfenoides',
  'A butterfly-shaped keystone bone; its greater wing shows at the temple.': 'Hueso clave en forma de mariposa; su ala mayor asoma en la sien.',
  'Zygomatic bone': 'Cigomático',
  'The cheekbone: lateral rim and part of the floor of the orbit.': 'El pómulo: el borde lateral y parte del piso de la órbita.',
  'Maxilla': 'Maxilar',
  'The upper jaw: holds the upper teeth and frames the nasal aperture.': 'El maxilar superior: aloja los dientes superiores y enmarca la abertura nasal.',
  'Nasal bones': 'Huesos nasales',
  'Two small bones that form the bridge of the nose.': 'Dos huesos pequeños que forman el puente de la nariz.',
  'Mandible': 'Mandíbula',
  'The lower jaw — the only movable bone of the skull.': 'El maxilar inferior, el único hueso móvil del cráneo.',
  'Orbit': 'Órbita',
  'Eye socket, about 4 cm wide and 3.4 cm high; seven bones meet in its walls.':
    'La cavidad del ojo, de unos 4\u00a0cm de ancho y 3,4\u00a0cm de alto; en sus paredes se unen siete huesos.',
  'Piriform aperture': 'Orificio piriforme',
  'The pear-shaped opening of the nasal cavity.': 'La abertura en forma de pera de la cavidad nasal.',
  'Zygomatic arch': 'Arco cigomático',
  'A bony bridge from cheek to temple; the masseter hangs from it.': 'Un puente óseo de la mejilla a la sien; de él cuelga el masetero.',
  'Mastoid process': 'Mastoides',
  'Behind the ear; anchors the sternocleidomastoid muscle.': 'La apófisis mastoides, detrás de la oreja; en ella se ancla el músculo esternocleidomastoideo.',
  'Condyle': 'Cóndilo',
  'Head of the mandible: hinges and glides in the jaw joint.': 'La cabeza de la mandíbula: gira y se desliza en la articulación mandibular.',
  'Coronoid process': 'Coronoides',
  'Thin blade of the mandible where the temporalis attaches.': 'La apófisis coronoides, lámina delgada de la mandíbula en la que se inserta el temporal.',
  'Adults have 32: per quadrant 2 incisors, 1 canine, 2 premolars, 3 molars.':
    'El adulto tiene 32: por cuadrante, 2 incisivos, 1 canino, 2 premolares y 3 molares.',
  'Coronal suture': 'Sutura coronal',
  'Joins the frontal bone to both parietals across the crown.': 'Une el hueso frontal con ambos parietales a través de la coronilla.',
  'Sagittal suture': 'Sutura sagital',
  'Joins the two parietals along the midline.': 'Une los dos parietales a lo largo de la línea media.',

  // the open-jaw lesson's muscles (lessons.js)
  'Temporalis': 'Músculo temporal',
  'Fans from the temple under the arch to the coronoid process.': 'Nace en abanico en la sien y pasa bajo el arco hasta la apófisis coronoides.',
  'Masseter': 'Masetero',
  'From the zygomatic arch to the angle: the strongest closer.': 'Del arco cigomático al ángulo de la mandíbula: el músculo de cierre más potente.',

  // ---------------------------------------------------------------- labels: the jaguar (species.js)
  'Sagittal crest': 'Cresta sagital',
  'A blade of bone along the midline; the temporalis muscles anchor here.': 'Una lámina ósea a lo largo de la línea media; aquí se anclan los músculos temporales.',
  'Flares wide to make room for huge jaw muscles.': 'Se abre mucho para dar espacio a enormes músculos mandibulares.',
  'Canine': 'Canino',
  'Dagger teeth, used to bite through skulls and turtle shells.': 'Dientes como dagas, para atravesar cráneos y caparazones de tortuga.',
  'Carnassial (P4/m1)': 'Carnicera',
  'Blade-like shearing teeth that slice meat like scissors.': 'P4 superior y m1 inferior: dientes en forma de hoja que cortan la carne como tijeras.',
  'Large, forward-facing sockets for binocular depth vision.': 'Órbitas grandes y orientadas hacia adelante, para ver en profundidad con ambos ojos.',
  'A short, deep jaw whose hinge allows almost no sideways motion.': 'Una mandíbula corta y alta, con una bisagra que casi no permite movimientos laterales.',

  // ---------------------------------------------------------------- parts: bones and teeth (human.js, jaguar.js, index.js)
  // the SVG plate's part titles; the paired bones say which side
  'Parietal bone (right)': 'Hueso parietal (derecho)',
  'Parietal bone (left)': 'Hueso parietal (izquierdo)',
  'Temporal bone (right)': 'Hueso temporal (derecho)',
  'Temporal bone (left)': 'Hueso temporal (izquierdo)',
  'Sphenoid bone': 'Hueso esfenoides',
  'Ethmoid bone': 'Hueso etmoides',
  'Zygomatic bone (right)': 'Hueso cigomático (derecho)',
  'Zygomatic bone (left)': 'Hueso cigomático (izquierdo)',
  'Maxilla (right)': 'Maxilar (derecho)',
  'Maxilla (left)': 'Maxilar (izquierdo)',
  'Nasal bone (right)': 'Hueso nasal (derecho)',
  'Nasal bone (left)': 'Hueso nasal (izquierdo)',
  'Lacrimal bone (right)': 'Hueso lagrimal (derecho)',
  'Lacrimal bone (left)': 'Hueso lagrimal (izquierdo)',
  'Palatine bone (right)': 'Hueso palatino (derecho)',
  'Palatine bone (left)': 'Hueso palatino (izquierdo)',
  'Vomer': 'Vómer',
  'Inferior nasal concha (right)': 'Cornete nasal inferior (derecho)',
  'Inferior nasal concha (left)': 'Cornete nasal inferior (izquierdo)',
  'Teeth (upper right)': 'Dientes (superiores derechos)',
  'Teeth (upper left)': 'Dientes (superiores izquierdos)',
  'Teeth (lower right)': 'Dientes (inferiores derechos)',
  'Teeth (lower left)': 'Dientes (inferiores izquierdos)',
  // the jaguar's (yugal: the jugal, as comparative anatomy names it)
  'Zygomatic (jugal) bone (right)': 'Hueso cigomático o yugal (derecho)',
  'Zygomatic (jugal) bone (left)': 'Hueso cigomático o yugal (izquierdo)',
  'Premaxillae (incisive bones)': 'Premaxilares (huesos incisivos)',
  'Sphenoid and palatine region': 'Región del esfenoides y los palatinos',

  // ---------------------------------------------------------------- beats (lessons.js)
  // the lab's; the reader prints the manifest's (src/books/es/calaveras.js),
  // which lesson VI shares word for word
  // I · frontal
  'A ball for the cranium, a line down the middle.': 'Una esfera para el cráneo y una línea por el medio.',
  'Brow, eye, nose and mouth lines cross the centre line.': 'Las líneas de cejas, ojos, nariz y boca cruzan la línea central.',
  'The jaw tapers from the cheekbones to the chin.': 'La mandíbula se estrecha de los pómulos al mentón.',
  'Block in the planes; cut the sockets and the pear-shaped nose.': 'Esboce los planos; recorte las órbitas y la nariz en forma de pera.',
  'Refine and engrave: the hatching follows the form.': 'Afine y grabe: el rayado sigue la forma.',
  'Erase, and start again from the ball.': 'Borre y vuelva a empezar desde la esfera.',
  // II · open jaw
  'Closed: each condyle rests in its mandibular fossa.': 'Boca cerrada: cada cóndilo descansa en su fosa mandibular.',
  'Opening: the condyles mostly rotate, already starting to glide…': 'Al abrir, los cóndilos sobre todo rotan y ya empiezan a deslizarse…',
  '…and the glide grows with the gape, forward and down the eminences.':
    '…y el deslizamiento crece con la apertura, hacia adelante y abajo por los tubérculos articulares.',
  'Wide open: about 27° at the joint, the incisors about 5 cm apart.': 'Bien abierta: unos 27° en la articulación y unos 5\u00a0cm entre los incisivos.',
  'Masseter and temporalis pull the jaw shut.': 'El masetero y el temporal tiran de la mandíbula y la cierran.',
  // III · profile
  'Front: the cranium is a ball, the face hangs below it.': 'De frente: el cráneo es una bola y la cara cuelga debajo.',
  'Turning, the face reads as a wedge on the front of the ball.': 'Al girar, la cara se ve como una cuña delante de la bola.',
  'Profile: the whole skull fits a square.': 'De perfil: todo el cráneo cabe en un cuadrado.',
  'Orbit floor, zygomatic arch and ear hole share one level.': 'El piso de la órbita, el arco cigomático y el conducto auditivo están a una misma altura.',
  'Back to the front view.': 'De vuelta a la vista frontal.',
  // IV · bones
  'Twenty-two bones: eight cranial, fourteen facial.': 'Veintidós huesos: ocho craneales y catorce faciales.',
  'The sutures part: frontal, parietals, temporals, occipital.': 'Las suturas se abren: frontal, parietales, temporales, occipital.',
  'The face separates: maxillae, zygomatics, nasal bones.': 'La cara se separa: maxilares, cigomáticos, huesos nasales.',
  'The mandible is the only movable bone.': 'La mandíbula es el único hueso móvil.',
  'Everything locks back together along the sutures.': 'Todo vuelve a trabarse a lo largo de las suturas.',
  // V · jaguar
  'Short face, flaring arches: a skull built for a crushing bite.': 'Cara corta, arcos abiertos: un cráneo hecho para una mordida aplastante.',
  'Opening: the jaw joint is a transverse hinge, with almost no sideways play.':
    'Apertura: la articulación mandibular es una bisagra transversal, casi sin juego lateral.',
  'At full gape the dagger canines clear each other.': 'En la apertura máxima, los caninos en forma de daga ya no se cruzan.',
  'The bite: temporalis, anchored on the sagittal crest, pulls the coronoid.': 'La mordida: el temporal, anclado en la cresta sagital, tira de la coronoides.',
  'Carnassials (P4 over m1) shear past each other like scissors.': 'Las carniceras (P4 sobre m1) se cruzan y cortan como tijeras.',
  // VI · skull and snake (the manifest's beats, verbatim)
  'The viper’s head rests in the orbit; its body circles the skull.': 'La cabeza de la víbora descansa en la órbita; su cuerpo rodea el cráneo.',
  'The head leaves the orbit and crosses the brow.': 'La cabeza sale de la órbita y cruza la ceja.',
  'It climbs over the vault.': 'Trepa por encima de la bóveda.',
  'Then it runs down behind the ear.': 'Luego baja por detrás de la oreja.',
  'It swings forward below the cheekbone arch, beside the jaw.': 'Avanza más abajo del arco cigomático, junto a la mandíbula.',
  'Over the cheek, it slips back into the socket.': 'Cruza la mejilla y se desliza de vuelta a la órbita.',

  // ---------------------------------------------------------------- the bead-chain snake (snake.js)
  // lesson VI's fallback when the snakes subject cannot build its viper
  'Head': 'Cabeza',
  'Eyelash palm-pitviper (Bothriechis nigroadspersus).': 'Bocaracá (Bothriechis nigroadspersus).',
  'Bothriechis nigroadspersus': 'Bothriechis nigroadspersus',
};
