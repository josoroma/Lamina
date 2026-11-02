// Spanish for the snake figures (figure strings). Keys are the exact English strings in code; values keep every
// {placeholder}. See .scratch/bilingual/design-i18n.md §3.
//
// Every string src/subjects/snakes/* gives the reader, the layers popover, the
// lab and the SVG plate: label pills and cards, layer names and hints, part and
// colour names (the SVG's <title>s, the plate's generated region names
// included), the figures' own beats and the pose titles. Herpetology follows
// the termbase of docs/books/es-style.md §3.1 and the wording of
// src/books/es/serpientes.js: snake names are feminine (la terciopelo, la
// béquer), brown is «café» as in the plates' text, «…» quotes, raya incisos.
// The coral's pale rings are «claros», as on its page and its «Anillo claro»
// pill, even where the English says yellow (es-style §3.6).
//
// Pills. A pill whose label has a look-closer row is exactly that row's
// Spanish name (lead decision L1), and every pill keeps its text whole within
// 110 px (12.5 px UI sans, audit --i18n). Five names of es-style §3.6 are
// wider, so the pill takes a shorter exact form and the card gives the rest:
// 'Venom gland' prints «Glándula» («Glándula de veneno» takes 121 px; the
// pill shows only with the Venom layer, and the card names the venom),
// 'Keeled scales' «Escama quillada» (the plural takes 113 px), 'Eyelash
// scales' «Pestañas» (the toboba de pestañas' own word; «Escamas
// supraoculares» takes 145 px), 'Button' «Botón» (117 px with «del
// cascabel») and 'Recurved teeth' «Dientes recurvos» (119 px as
// «recurvados»). 'Valved nostrils' keeps the book's «Narina»: the plate
// leaves the valve claim out for this species (serpientes-research §7 q. 9).
// The look-closer names follow these pills. 'Ventral scutes' has no row but
// keeps the termbase's term the same way: «Escama ventral», singular like the
// keeled scale (the glossary's «Escamas ventrales» takes 115 px).
//
// Strings built at run time are PATTERNS: the narrated beats with the
// species' common name, the rattle segments and the eggs.
export default {
  // ---------------------------------------------------------------- labels: pills and cards (index.js)
  'Eye': 'Ojo',
  'Vertical pupil; no eyelids — a clear scale, the spectacle, covers the eye, so snakes never blink.':
    'Pupila vertical. Sin párpados: una escama transparente —la lente— cubre el ojo, por eso las serpientes nunca parpadean.',
  'Round pupil; no eyelids — a clear scale, the spectacle, covers the eye, so snakes never blink.':
    'Pupila redonda. Sin párpados: una escama transparente —la lente— cubre el ojo, por eso las serpientes nunca parpadean.',
  'Forked tongue': 'Lengua bífida',
  'Flicks out through a notch in the lip and carries scent to the vomeronasal (Jacobson’s) organ.':
    'Asoma una y otra vez por una muesca del labio y lleva el olor al órgano vomeronasal (de Jacobson).',
  'Loreal pit': 'Foseta loreal',
  'Heat-sensing pit organ between eye and nostril: it detects the infrared warmth of prey.':
    'Órgano termosensible en una foseta entre el ojo y la narina: detecta el calor infrarrojo de las presas.',
  'Hinged fangs': 'Colmillos móviles',
  'Long hollow fangs fold against the palate and swing forward as the mouth opens.':
    'Largos colmillos huecos: se pliegan contra el paladar y giran hacia adelante al abrirse la boca.',
  'Venom gland': 'Glándula',
  'A modified salivary gland behind and below the eye; muscles squeeze venom down a duct to the fang.':
    'Glándula salival modificada, detrás y debajo del ojo; unos músculos la comprimen y el veneno baja por un conducto hasta el colmillo.',
  'Fixed front fangs': 'Colmillos fijos',
  'Short, permanently erect fangs at the front of the upper jaw.': 'Colmillos cortos y siempre erguidos, al frente de la mandíbula superior.',
  'Venom flows from a gland behind and below the eye to the fixed fangs.':
    'El veneno fluye desde una glándula situada detrás y debajo del ojo hasta los colmillos fijos.',
  'Ventral scutes': 'Escama ventral',
  'A single row of wide belly plates grips the ground — roughly one per trunk vertebra.':
    'Una sola hilera de placas anchas en el vientre se agarra al suelo: más o menos una por cada vértebra del tronco.',
  'Keeled scales': 'Escama quillada',
  'Each dorsal scale carries a central ridge, giving the skin a rough, matte look.':
    'Cada escama dorsal lleva una cresta central que da a la piel un aspecto áspero y mate.',
  'Strongly keeled, protruding scales give the back a rough, matte look.': 'Escamas muy quilladas y salientes dan al dorso un aspecto áspero y mate.',
  'Strongly keeled, knobbly scales: a rough, pineapple-like skin.': 'Escamas muy quilladas y nudosas: una piel áspera, como la de una piña.',
  'Eyelash scales': 'Pestañas',
  'Spiny supraciliary scales above each eye give the eyelash viper its name.':
    'Sobre cada ojo, escamas supraciliares espinosas: de ellas toma su nombre la toboba de pestañas.',
  'Prehensile tail': 'Cola prensil',
  'Wraps around twigs to anchor the snake while it waits or strikes.': 'Se enrolla en las ramitas y ancla a la serpiente mientras espera o ataca.',
  'Red ring': 'Anillo rojo',
  'Broad red rings; each red scale is tipped with black.': 'Anchos anillos rojos; cada escama roja tiene la punta negra.',
  'Black ring': 'Anillo negro',
  'Black rings bordered on both sides by narrow yellow rings.': 'Anillos negros bordeados a ambos lados por finos anillos claros.',
  'Yellow ring': 'Anillo claro',
  'Narrow pale rings. Colour rhymes do not identify coral snakes in Central America.':
    'Finos anillos claros. En Centroamérica, las rimas sobre los colores no sirven para identificar a las corales.',
  'Head': 'Cabeza',
  'Barely wider than the neck: black snout, yellow band across the back of the head.':
    'Apenas más ancha que el cuello: hocico negro y una banda amarilla que cruza la parte posterior de la cabeza.',
  'Rattle': 'Cascabel',
  'Loosely interlocking keratin segments; a new one is added at each shed.':
    'Segmentos de queratina encajados de forma holgada; con cada muda se suma uno nuevo.',
  'Button': 'Botón',
  'The oldest segment, at the tip — lost when the rattle breaks.': 'El segmento más antiguo, en la punta; se pierde cuando el cascabel se rompe.',
  'Cloaca (vent)': 'Cloaca',
  'Marks where the body ends and the short tail begins.': 'Marca el final del cuerpo y el comienzo de la corta cola.',
  'Spiny tail tip': 'Punta espinosa',
  'Rows of small spiny scales end in a terminal spine; the tail buzzes in leaf litter.':
    'Hileras de pequeñas escamas espinosas que acaban en una espina terminal; la cola vibra y zumba en la hojarasca.',
  'Eggs': 'Puesta',
  'Probably the only egg-laying pitvipers of the Americas; the female may stay coiled with her clutch.':
    'Probablemente las únicas víboras de foseta de América que ponen huevos; la hembra puede quedarse enroscada junto a la puesta.',
  'Paddle tail': 'Cola aplanada',
  'Flattened from side to side, the tail works like an oar.': 'Aplanada de lado a lado, la cola funciona como un remo.',
  'Valved nostrils': 'Narina',
  'Nostril': 'Narina',
  'It must surface to breathe air, though it can take up some oxygen through its skin while submerged.':
    'Debe salir a la superficie para respirar aire, aunque puede absorber algo de oxígeno a través de la piel mientras está sumergida.',
  'Set on top of the snout and closed by valves when the snake dives.':
    'Las narinas, en lo alto del hocico, se cierran con válvulas cuando la serpiente se sumerge.',
  'Yellow belly': 'Vientre amarillo',
  'Bright yellow below, sharply divided from the black back.': 'Amarillo intenso por debajo, nítidamente separado del dorso negro.',
  'Pelvic spur': 'Espolón pélvico',
  'Claw-like remnants of hind limbs beside the vent; larger in males, used in courtship.':
    'Restos de las patas traseras en forma de garra, junto a la cloaca; más grandes en los machos, que los usan en el cortejo.',
  'Eye stripe': 'Banda ocular',
  'A dark stripe runs from the snout through the eye to the angle of the jaw.':
    'Una banda oscura va del hocico al ángulo de la mandíbula pasando por el ojo.',
  'Recurved teeth': 'Dientes recurvos',
  'Rows of backward-curving teeth and no fangs: boas kill by constriction, not venom.':
    'Hileras de dientes curvados hacia atrás y ningún colmillo: las boas matan por constricción, no con veneno.',
  'Vertebrae': 'Vértebras',
  'Hundreds of vertebrae, linked by extra interlocking joints, make a supple yet strong spine.':
    'Cientos de vértebras, unidas por articulaciones accesorias que encajan entre sí, forman una columna flexible y a la vez fuerte.',
  'Ribs': 'Costillas',
  'A pair on every trunk vertebra, none on the tail — and no breastbone.': 'Un par en cada vértebra del tronco y ninguna en la cola; tampoco hay esternón.',

  // ---------------------------------------------------------------- layers: name and hint (index.js)
  'Skin': 'Piel',
  'Scales and colour pattern': 'Escamas y patrón de color',
  'Skeleton': 'Esqueleto',
  'X-ray: hundreds of vertebrae, paired ribs, the skull': 'Rayos X: cientos de vértebras, costillas en pares y el cráneo',
  'Venom': 'Veneno',
  'Venom glands, ducts and fangs': 'Glándulas de veneno, conductos y colmillos',
  'Spiny supraciliary scales above the eyes': 'Escamas supraciliares espinosas sobre los ojos',
  'Keratin segments — explode to separate them': 'Segmentos de queratina: sepárelos con el despiece',
  'The clutch the female coils around': 'Los huevos que la hembra rodea con su cuerpo',
  'Water': 'Agua',
  'The sea surface it swims in': 'La superficie del mar en la que nada',

  // ---------------------------------------------------------------- parts: the SVG plate's names (index, head, skeleton, props)
  'Body': 'Cuerpo', // as export.js
  'Tail': 'Cola',
  'Lower jaw': 'Mandíbula inferior',
  'Eyes': 'Ojos',
  'Pupils': 'Pupilas',
  'Nostrils': 'Narinas',
  'Loreal pits': 'Fosetas loreales',
  'Fixed fangs': 'Colmillos fijos',
  'Upper teeth': 'Dientes superiores',
  'Dentary teeth': 'Dientes del dentario',
  'Venom glands': 'Glándulas de veneno',
  'Skull': 'Cráneo',
  'Mandibles': 'Mandíbulas',
  'Ribs (right)': 'Costillas derechas',
  'Ribs (left)': 'Costillas izquierdas',
  'Vestigial pelvis': 'Pelvis vestigial',
  'Rattle button': 'Botón del cascabel',
  'Pelvic spurs': 'Espolones pélvicos',
  'Branch': 'Rama', // as flowers.js
  'Twig': 'Ramita',
  'Leaves': 'Hojas', // as flowers.js
  'Black rat — fur': 'Rata negra: pelaje',
  'Black rat — ears, nose and feet': 'Rata negra: orejas, nariz y patas',
  'Black rat — tail': 'Rata negra: cola',
  'Black rat — eyes': 'Rata negra: ojos',
  // regions the plate names after their meshes (idpass regionNames): the
  // rattle's motion ghosts, the sea, and the viper's inner parts that
  // Calaveras VI does not forward as parts
  'Rattle blur': 'Desenfoque del cascabel',
  'Water surface': 'Superficie del agua',
  'Water body': 'Masa de agua',
  'Water caustics': 'Cáusticas del agua',
  'Venom duct': 'Conducto del veneno',
  'Ribs right': 'Costillas derechas',
  'Ribs left': 'Costillas izquierdas',

  // ---------------------------------------------------------------- colours: the SVG plate's swatches (patterns, face, props)
  'Mouth lining': 'Mucosa bucal',
  // I · terciopelo
  'Olive-brown ground': 'Fondo café oliva',
  'Dark triangles': 'Triángulos oscuros',
  'Pale triangle borders': 'Bordes claros de los triángulos',
  'Cream belly': 'Vientre crema',
  'Brown crown': 'Coronilla café',
  'Yellow face and lips': 'Cara y labios amarillos',
  'Dark eye stripe': 'Banda ocular oscura',
  'Yellow chin and lips': 'Mentón y labios amarillos',
  // the eyes of every species
  'Iris': 'Iris',
  'Dark iris rim': 'Borde oscuro del iris',
  'Pupil': 'Pupila',
  'Catchlight': 'Reflejo de luz',
  'Pit opening': 'Abertura de la foseta',
  // II · bocaracá: the golden oropel and the green morph
  'Golden yellow': 'Amarillo dorado',
  'Moss green': 'Verde musgo',
  'Dark flecks': 'Motas oscuras',
  'Pale flecks': 'Motas claras',
  'Pale yellow belly': 'Vientre amarillo claro',
  'Pale green belly': 'Vientre verde claro',
  'Pale yellow chin': 'Mentón amarillo claro',
  'Pale green chin': 'Mentón verde claro',
  'Pale green lips': 'Labios verde claro',
  'Dark bark fissures': 'Grietas oscuras de la corteza',
  'Bark ridges': 'Crestas de la corteza',
  'Lichen': 'Liquen',
  // III · coral (its rings are the labels' words)
  'Black snout': 'Hocico negro',
  'Yellow head band': 'Banda amarilla de la cabeza',
  'Black chin': 'Mentón negro',
  // IV · cascabel
  'Brown ground': 'Fondo café',
  'Dark diamonds and neck stripes': 'Rombos oscuros y franjas del cuello',
  'Diamond centres and hind body': 'Centros de los rombos y parte posterior',
  'Cream borders and belly': 'Bordes y vientre crema',
  'Pale plate edges and lips': 'Bordes claros de las placas y labios',
  'Cream chin': 'Mentón crema',
  // V · matabuey
  'Tan ground': 'Fondo café claro',
  'Dark diamonds': 'Rombos oscuros',
  'Pale spots': 'Manchas claras',
  'Tan crown': 'Coronilla café claro',
  'Black eye stripe': 'Banda ocular negra',
  'Cream lips': 'Labios crema',
  'Cream lips and stripe borders': 'Labios y bordes de las franjas crema',
  // VI · serpiente marina
  'Black back': 'Dorso negro',
  'Yellow paddle': 'Cola amarilla',
  'Black spots': 'Manchas negras',
  'Black crown': 'Coronilla negra',
  'Yellow lips': 'Labios amarillos',
  'Yellow throat': 'Garganta amarilla',
  // VII · béquer and the black rat
  'Grey-beige ground': 'Fondo gris beige',
  'Blackish saddle rims': 'Bordes negruzcos de las manchas dorsales',
  'Dark-brown saddles': 'Manchas dorsales café oscuro',
  'Grey-brown hind body': 'Tramo posterior café grisáceo',
  'Cream borders, lobes and belly': 'Bordes, lóbulos y vientre crema',
  'Blackish-brown tail saddles': 'Manchas café negruzco de la cola',
  'Cream gaps': 'Espacios crema',
  'Pale grey crown': 'Coronilla gris claro',
  'Dark brown head stripes': 'Franjas café oscuro de la cabeza',
  'Grey-brown back': 'Lomo café grisáceo',
  'Buff-grey flanks': 'Flancos gris beige',
  'Pale grey belly': 'Vientre gris claro',
  'Pinkish ears and feet': 'Orejas y patas rosáceas',
  'Dark scaly tail': 'Cola oscura y escamosa',

  // ---------------------------------------------------------------- beats (poses.js; the manifests' beats print in the reader)
  // strike
  'Anticipation: the S tightens and the head draws back.': 'Anticipación: la S se cierra y la cabeza se echa hacia atrás.',
  'Strike — the S unfolds faster than a blink; the hinged fangs swing erect.':
    'Ataque: la S se despliega más rápido que un parpadeo; los colmillos móviles se yerguen.',
  'Strike — the S unfolds faster than a blink; the jaws gape wide.': 'Ataque: la S se despliega más rápido que un parpadeo; las mandíbulas se abren de par en par.',
  'The teeth grip, then let go.': 'Los dientes sujetan y luego sueltan.',
  'Bite and release: venom is injected in an instant.': 'Muerde y suelta: el veneno se inyecta en un instante.',
  'Recoil into the defensive coil.': 'Se repliega en su espiral defensiva.',
  'Tongue flicks follow the scent trail.': 'La lengua asoma una y otra vez y sigue el rastro de olor.',
  // rattle
  'Defensive coil: head raised, body ready to strike.': 'Espiral defensiva: la cabeza en alto y el cuerpo listo para atacar.',
  'Tail-shaker muscles buzz the rattle dozens of times a second.': 'Los músculos de la cola hacen zumbar el cascabel decenas de veces por segundo.',
  'The tail tip quivers — many snakes vibrate their tails when threatened.':
    'La punta de la cola tiembla: muchas serpientes hacen vibrar la cola cuando se sienten amenazadas.',
  'Tongue flicks gather the scent of the intruder.': 'La lengua asoma y recoge el olor del intruso.',
  'A warning, not an attack — given space, it retreats.': 'Es un aviso, no un ataque: si se le deja espacio, se retira.',
  // ambush
  'Ambush coil around the clutch, head facing out.': 'Espiral de acecho en torno a la puesta, con la cabeza hacia afuera.',
  'Ambush coil, head facing out, ready to strike.': 'Espiral de acecho, con la cabeza hacia afuera, lista para atacar.',
  'Slow breathing — the body barely moves.': 'Respiración lenta: el cuerpo apenas se mueve.',
  'Disturbed, the spiny tail tip vibrates against the leaf litter.': 'Perturbada, la punta espinosa de la cola vibra contra la hojarasca.',
  'Disturbed, the tail tip vibrates against the leaf litter.': 'Perturbada, la punta de la cola vibra contra la hojarasca.',
  'Bushmasters can wait at one ambush site for days.': 'La matabuey puede esperar días en un mismo sitio de acecho.',
  'Sit-and-wait hunters can stay put for hours or days.': 'Los cazadores al acecho pueden quedarse quietos horas o días.',
  // slither
  'Lateral undulation: every point of the body follows the path of the head.':
    'Ondulación lateral: cada punto del cuerpo sigue la trayectoria de la cabeza.',
  'Each bend pushes back against the ground.': 'Cada curva empuja el suelo hacia atrás.',
  'Tail raised and curled — a decoy display that draws attacks away from the head.':
    'Cola alzada y enroscada: un señuelo que aleja los ataques de la cabeza.',
  'The tail lifts and curls for a moment.': 'La cola se alza y se enrosca un momento.',
  'Coral snakes hunt other small snakes and lizards in the leaf litter.': 'Las corales cazan otras serpientes pequeñas y lagartijas en la hojarasca.',
  'Lateral undulation is the commonest way snakes move.': 'La ondulación lateral es el modo más común en que se desplazan las serpientes.',
  // swim
  'A pelagic snake: it lives its whole life at sea.': 'Una serpiente pelágica: pasa toda su vida en el mar.',
  'Waves travel down the body; the paddle tail pushes the water.': 'Las ondas recorren el cuerpo; la cola en forma de remo empuja el agua.',
  'Valved nostrils close underwater; some oxygen is absorbed through the skin.':
    'Bajo el agua, unas válvulas cierran las narinas; algo de oxígeno se absorbe por la piel.',
  'Its bold yellow and black are thought to warn predators.': 'Se cree que su llamativo amarillo y negro advierte a los depredadores.',
  'Swimming: the same lateral undulation snakes use on land.': 'Nado: la misma ondulación lateral que las serpientes usan en tierra.',
  'Waves travel from head to tail and push against the water.': 'Las ondas viajan de la cabeza a la cola y empujan contra el agua.',
  'The head stays near the surface to breathe.': 'La cabeza se mantiene cerca de la superficie para respirar.',
  // constrict: the béquer and its rat; any other species and the prey
  'Two loops wrap the rat’s chest and belly; the jaws hold on.': 'Dos anillos rodean el pecho y el vientre de la rata; las mandíbulas no sueltan.',
  'The coils tighten, cutting off blood flow — not suffocation.': 'Los anillos se aprietan y detienen el flujo de sangre: no matan por asfixia.',
  'Boas feel the rat’s heartbeat and keep squeezing until it stops.': 'Las boas sienten el latido de la rata y aprietan hasta que se detiene.',
  'The coils relax and re-grip. No venom is involved.': 'Los anillos se aflojan y vuelven a sujetar. No hay veneno.',
  'Coils wrapped around the prey.': 'Anillos enrollados alrededor de la presa.',
  'The coils tighten.': 'Los anillos se aprietan.',
  'The coils relax and re-grip.': 'Los anillos se aflojan y vuelven a sujetar.',
  // branch
  'The head sways slowly, tracking movement.': 'La cabeza se mece despacio, atenta al movimiento.',
  'Tongue flicks sample the air for scent.': 'La lengua asoma y prueba el aire en busca de olor.',
  'Golden, green or mottled: the eyelash viper is famously variable in colour.':
    'Dorada, verde o moteada: la toboba de pestañas es famosa por lo variable de su color.',
  'The tail grip frees the front of the body to strike.': 'Asida por la cola, tiene libre la parte delantera del cuerpo para atacar.',
  // follow-path (Calaveras VI prints its own beats)
  'Lateral undulation along the path.': 'Ondulación lateral a lo largo del recorrido.',

  // ---------------------------------------------------------------- pose titles (index.js POSE_TITLES; the figure title
  // `${scientific} — ${pose}` is a developer label, kept English, design §3.2)
  'striking posture': 'postura de ataque',
  'coiled on a branch': 'enroscada en una rama',
  'lateral undulation': 'ondulación lateral',
  'defensive rattle': 'cascabeleo defensivo',
  'ambush coil with clutch': 'espiral de acecho con su puesta',
  'swimming': 'nadando',
  'constricting a black rat': 'apretando a una rata negra',
  'travelling a path': 'recorriendo un trayecto',
};

/** Strings the snakes build at run time ({name}: the species' Spanish common name in lower case, poses.js). */
export const PATTERNS = {
  'Coiled, neck drawn into an S, the {name} tastes the air.': 'Enroscada, con el cuello en S, la {name} saborea el aire.',
  'Anchored by its tail, the {name} waits in ambush.': 'Anclada por la cola, la {name} espera al acecho.',
  'Rattle segment {n}': 'Segmento {n} del cascabel',
  'Egg {n}': 'Huevo {n}',
};
