export const LANG = 'es';
export const TRANSLATED_FROM = 'en';
export const MODEL = 'Codex';
export const PROMPT = {
  source: 'docs/prompts/10-screenshot-corrections.md',
  editorial: true,
  displayTitle: 'La instrucción',
  title: 0,
  headings: [2, 5, 8],
  lines: [
    'Añada tres libros en español e inglés, con explicaciones claras y curiosas basadas en ejemplos cotidianos:',
    '',
    '1. Átomos — Los componentes invisibles',
    'Todo lo que le rodea —las estrellas, los océanos, el aire, incluso su propio cuerpo— está hecho de átomos. Pero lo extraordinario es que los mismos componentes diminutos pueden crear cosas completamente distintas con solo ordenarse de otra manera. Exploremos un mundo tan pequeño que nada se comporta como uno esperaría.',
    '',
    '2. Células — Las pequeñas máquinas de la vida',
    'Imagine una fábrica microscópica que recibe energía, construye maquinaria complicada, se repara y a veces hasta hace copias de sí misma. ¡Eso es una célula! Su cuerpo contiene billones de ellas, trabajando juntas sin que nadie les dé órdenes. ¿Cómo puede la química corriente producir algo vivo? Miremos dentro para descubrirlo.',
    '',
    '3. Fogata en la playa — Una llama bajo las estrellas',
    'Imagine una fogata nocturna cerca de la playa, bajo un cielo lleno de estrellas, con un padre experto en contar historias y su hija inteligente. Las olas se mueven en la oscuridad, la leña crepita y las chispas suben como pequeños mensajeros luminosos. Pero ¿qué ocurre realmente en ese fuego? La madera se transforma: el calor la descompone, escapan gases y esos gases reaccionan con el oxígeno para producir llamas, luz y calor. Una fogata en la playa es mucho más que una escena hermosa: es química, energía y movimiento ante nuestros ojos.',
  ],
};
export const BRIEFS = {
  atomos: {
    source: 'docs/prompts/07-science-books.md',
    text: 'Crear seis capítulos ilustrados bilingües sobre átomos: nubes de probabilidad y núcleo, elementos e isótopos, moléculas y enlaces, movimiento térmico y estados, estructuras del carbono y luz emitida al cambiar de nivel energético. Usar explicaciones originales y curiosas con ejemplos cotidianos y pequeñas predicciones. Distinguir los modelos de las imágenes literales: sin trayectorias planetarias para electrones, con núcleos ampliados, enlaces esquemáticos y tiempo explicativo ralentizado. Incluir fuentes, glosario, capas interactivas y una página final con la instrucción.',
  },
  celulas: {
    source: 'docs/prompts/07-science-books.md',
    text: 'Crear seis capítulos ilustrados bilingües sobre células: química organizada, membranas selectivas, del ADN al ARN y las proteínas, mitocondrias y ATP, cloroplastos y fotosíntesis, y división y cooperación. Explicar cómo las interacciones moleculares locales producen organización sin un jefe. Presentar la fábrica como una analogía. Mostrar distintos modelos en corte con capas, etiquetas y separación reversible. Incluir fuentes, glosario e instrucción. Explicar el acoplamiento energético sin sugerir que romper un enlace por sí solo libera energía.',
  },
  fogata: {
    source: 'docs/prompts/07-science-books.md',
    text: 'Crear seis capítulos bilingües siguiendo a un padre narrador y a su hija curiosa junto a una fogata en la playa, bajo las estrellas. Empezar por la escena y revelar la descomposición de la madera, los gases que escapan y el oxígeno, la reorganización de átomos, la transferencia de calor, el hollín y las brasas luminosas, y la conexión con el Sol y la fotosíntesis. Distinguir el fuego químico de la fusión estelar. Dar a la hija preguntas y predicciones auténticas. Construir un diorama costero y mecanismos separados que puedan inspeccionarse, con fuentes, glosario e instrucción.',
  },
};
export const LATER = {
  source: 'docs/prompts/08-visual-refinement.md',
  text: 'Las ilustraciones científicas se reconstruyeron con formas orgánicas modeladas, materiales más detallados y movimientos más expresivos, tras compararlas visualmente con los volúmenes originales. El pedido de mejora del autor y la dirección artística están registrados en docs/prompts/08-visual-refinement.md.',
};
