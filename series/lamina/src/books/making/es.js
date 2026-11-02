// How this book was made — Spanish edition: faithful Costa Rican Spanish
// translations (usted) of the English originals in making/index.js, which the
// Spanish making leaf labels as translations. Same exports, same shape:
// PROMPT.lines keeps the 41 lines with the blank and "* " bullet lines at the
// English indices, so `title` and `headings` are shared; URLs, file names,
// code-like tokens (ids, params, CONTRACTS §…), binomials and font names stay
// as written. Quoted titles of the English books stay in English: they are
// the titles the briefs asked for. Like the originals, the texts carry no
// markup (the reader's a11y mirror prints them escaped, as written); they
// follow docs/books/es-style.md in using «» quotes.

export const LANG = 'es';
export const TRANSLATED_FROM = 'en';
export const MODEL = 'Claude Code (Opus 5.5)';

export const PROMPT = {
  source: 'docs/prompts/00-original-brief.md',
  lines: [
    'Skill de Claude: libros científicos interactivos en 3D, a color y a todo lo ancho',
    '',
    'Cree una skill reutilizable de Claude Code inspirada en:',
    '',
    '* https://april-zhu.com/colorfigures',
    '* https://github.com/wheresryan22/anatomy',
    '* https://jakub.kr/skills (Teardown)',
    '',
    'Construya libros científicos en 3D, inmersivos e interactivos, inspirados en la biodiversidad de Costa Rica, con temas como astronomía, física, química, botánica, esqueletos, músculos, serpientes, insectos, flores, hongos, mariposas, felinos, monos, tortugas, perezosos y plantas medicinales.',
    '',
    'Experiencia visual',
    '',
    '* Un libro en 3D realista y elegante, que flota sobre un fondo blanco puro.',
    '* Los usuarios pueden pasar las páginas de forma interactiva, con animaciones realistas del paso de página, curvatura del papel, sombras y profundidad.',
    '* Cada página contiene ilustraciones en 3D coloridas y científicamente exactas que cobran vida.',
    '* Arte científico con calidad de museo, tipografía limpia, anotaciones y colores naturales intensos.',
    '* Diseño minimalista y de primera calidad. Sin recargo visual ni interfaz innecesaria.',
    '',
    'Interacciones',
    '',
    '* Pasar las páginas arrastrando, haciendo clic, deslizando el dedo o con las teclas de flecha.',
    '* Rotar, ampliar, diseccionar, despiezar y explorar las ilustraciones en 3D.',
    '* Mostrar u ocultar capas anatómicas y etiquetas científicas.',
    '* Cada página tiene una animación científica de 5 segundos que se repite sin cortes.',
    '',
    'Tecnología',
    'Use Three.js + WebGPU, con shaders TSL/WGSL, alternativa en WebGL y, de forma opcional, WASM, WebXR y técnicas avanzadas de GPU donde convenga.',
    '',
    'Entregables',
    '',
    '* Un SKILL.md reutilizable de Claude Code y sus componentes de apoyo.',
    '* Un libro a color en 3D, interactivo y funcional, de varias páginas.',
    '* Animaciones de cinco segundos para cada tema ilustrado.',
    '* Exportación portátil a SVG de cada ilustración científica.',
    '* Una implementación adaptable, eficiente y lista para producción.',
    '',
    'Objetivo: transformar cualquier tema científico en una enciclopedia en 3D hermosa e interactiva, que se hojea página por página, sobre un lienzo blanco y limpio. Construya un prototipo que funcione, no solo un diseño o una especificación.',
    '',
    'Empecemos con 3 productos originales, libros a color: uno sobre serpientes de Costa Rica, otro sobre flores de Costa Rica y otro sobre el dibujo de calaveras. Documente en carpetas docs las instrucciones y los resultados que usemos para producir estos dos docs/demos',
    '',
    'Deje el README.md como un producto de ycombinator, con un logo svg arriba y un índice',
  ],
  title: 0,
  headings: [10, 18, 25, 28],
};

export const BRIEFS = {
  serpientes: {
    source: 'docs/prompts/02-build-workflow.js',
    text: `«Serpientes — A Living Atlas of Costa Rican Snakes» (estilo litográfico). Láminas exactamente como en CONTRACTS §12\u00a0I, en este orden: I Terciopelo (Bothrops asper, pose strike), II Bocaracá / eyelash viper, morfo 'oropel' (Bothriechis schlegelii, pose branch, params.morph 'oropel'), III Coral (Micrurus nigrocinctus, pose slither), IV Cascabel (Crotalus simus, pose rattle), V Matabuey / bushmaster (Lachesis stenophrys, pose ambush), VI Serpiente marina (Hydrophis platurus, pose swim), VII Béquer (Boa imperator, pose constrict). Tema: tela verde bosque oscuro, estampado en oro, acento sangre de buey; motivo de las guardas 'scales'. Ensayo de introducción: por qué Costa Rica tiene ~140+ especies de serpientes (verifique la cifra), cómo mirar una serpiente, la minoría que es venenosa. Nota de las páginas finales: seguridad y primeros auxilios bien hechos ante una mordedura de serpiente (Instituto Clodomiro Picado / suero antiofídico de la UCR; buscar atención médica de inmediato; inmovilizar y mantener la calma; nada de torniquetes, cortes, succión, hielo ni alcohol; nunca manipular serpientes), con exactitud médica. La lámina de la coral debe explicar por qué la rima «red touches yellow» no es confiable en Centroamérica y mencionar las imitadoras inofensivas. Use la taxonomía actual (Boa imperator, Hydrophis platurus) y anote los nombres antiguos donde sea útil.`,
  },
  flores: {
    source: 'docs/prompts/02-build-workflow.js',
    text: `«Flores — A Living Herbarium of Costa Rica» (estilo litográfico). Láminas exactamente como en CONTRACTS §12\u00a0II, en este orden: I Guaria morada (Guarianthe skinneri, flor nacional de Costa Rica; verifique el año de la declaratoria), II Platanilla (Heliconia wagneriana), III Granadilla de monte (Passiflora vitifolia), IV Labios de mujer (Palicourea elata, sin. Psychotria elata), V Cortez amarillo (Handroanthus ochraceus, sin. Tabebuia ochracea), VI Nenúfar (Nymphaea ampla). Tema: tela ciruela oscuro o terracota con estampado en oro, acento magenta; motivo de las guardas 'leaves'. 'status' solo donde de verdad exista una evaluación (si no, null). Filas de datos como Familia, Altura/Tamaño, Floración, Polinizadores, Hábitat, Altitud. Ensayo de introducción: la diversidad floral de Costa Rica (verifique cualquier cifra que dé, p. ej., el número de especies de plantas vasculares o de orquídeas), las flores como negociaciones con los polinizadores. Nota de las páginas finales sobre mirar sin arrancar: la protección de las orquídeas y la observación responsable (verifique lo que se afirme sobre CITES y la ley).`,
  },
  calaveras: {
    source: 'docs/prompts/02-build-workflow.js',
    text: `«Calaveras — Drawing Skulls: A Constructive Method» (estilo grabado; un libro de instrucción de dibujo, todas las lecciones usan el layout 'lesson'). Lecciones exactamente como en CONTRACTS §12\u00a0III, en este orden: I Vista frontal, II Vista de tres cuartos con la mandíbula abierta, III Perfil, IV Los huesos (cráneo despiezado, los 22 huesos), V Jaguar (Panthera onca, el felino más grande de Costa Rica; anatomía comparada), VI Calavera y serpiente (composición: una toboba de pestañas costarricense que serpentea a través de la calavera). Para cada lección escriba: common = título de la lección (p. ej., 'Frontal View'), commonAlt (en español, p. ej., 'Vista frontal'), scientific = el foco anatómico (p. ej., 'Cranium & mandible'; que 'scientific' sea breve), family = una línea breve de categoría, lede, body (cómo ver y dibujar esta vista; pedagogía ORIGINAL: nunca copie ningún libro de dibujo existente), facts (proporciones/medidas), lookCloser (ids canónicos de etiquetas del cráneo), didYouKnow, lesson: { steps: exactamente 3 { title, text } que correspondan a: 0 = formas grandes (círculo/esfera + línea central), 1 = guías y estrechamiento de la mandíbula, 2 = cuencas, abertura nasal y contorno refinado; adáptelos a cada lección (p. ej., perfil: círculo + cuña de la cara; jaguar: hocico en cuña + cresta), proTip, mistakes, proportions }, figure: { type: 'skull', params: { subject, lesson, ... } } exactamente como en §12\u00a0III, beats de la animación. status: null; badge: p. ej., 'Lesson 1 · Beginner'. Tema: tela negra con estampado en plata/blanco, papel blanco puro (#ffffff), tinta negra, acento bermellón; motivo de las guardas 'grid'; fuentes: display 'Oswald', body 'EB Garamond', label 'IBM Plex Sans Condensed', mono 'IBM Plex Mono'. Ensayo de introducción: por qué los artistas estudian el cráneo (la estructura bajo cada rostro), el método constructivo (formas grandes → guías → planos → detalles). Nota de las páginas finales: rutina de práctica + uso respetuoso de las referencias anatómicas. Los datos anatómicos deben ser correctos (22 huesos: 8 craneales + 14 faciales; la mandíbula es el único hueso móvil; dentición adulta de 32; los ojos, aproximadamente a la mitad de la altura de la cabeza en la cabeza viva —tenga cuidado de distinguir las proporciones del cráneo de las de la cabeza viva—).`,
  },
};

export const LATER = {
  source: 'docs/prompts/',
  text: 'Instrucciones posteriores dieron nueva forma a los libros: dos rondas de revisión y, luego, un pedido que trajo esta edición bilingüe, la marca del autor, los rostros de las serpientes y los colores y la presa de la béquer. Todas están en docs/prompts/.',
};
