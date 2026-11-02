// Spanish for src/engine/typeset (typeset). Keys are the exact English strings in code; values keep every
// {placeholder}. See .scratch/bilingual/design-i18n.md §3.
//
// The pages print in the edition's language (tl(page.book.locale, …)), so these are the words of the printed
// Spanish books: titles in sentence case, «» quotation marks, the decimal comma, and the register of the
// translated text (docs/books/es-style.md §0.2: usted imperatives where the page addresses the reader, as the
// figure-page instruction does; infinitives or noun phrases in headings and step titles). IUCN categories
// use the UICN's own Spanish names and capitals (es-style §3.5).
export default {
  // page order, running heads and contents (sides.js)
  'Untitled': 'Sin título',
  'Introduction': 'Introducción',
  'How to use this book': 'Cómo usar este libro',
  'Plate {n}': 'Lámina {n}',
  'Note': 'Nota',
  'Sources & colophon': 'Fuentes y colofón',
  'Glossary': 'Glosario',
  'How this book was made': 'Cómo se hizo este libro',
  'Lesson {numeral} · {title}': 'Lección {numeral} · {title}',

  // title page, imprint, contents, introduction, how-to (layouts/front.js)
  'by': 'por',
  'Author': 'Autor',
  'Published by {publisher}.': 'Publicado por {publisher}.',
  'Text, plates and interactive figures are original works made for this edition. Every figure is a living plate: turn it, open it, peel back its layers and take it home as a vector drawing.':
    'Los textos, las láminas y las figuras interactivas son obras originales hechas para esta edición. Cada figura es una lámina viva: puede girarla, abrirla, quitarle las capas y llevársela como dibujo vectorial.',
  'Set in {fonts}. Typeset, printed and bound live in your browser with Three.js — WebGPU, with a WebGL 2 fallback.':
    'Tipografías: {fonts}. Compuesto, impreso y encuadernado en vivo en su navegador con Three.js: WebGPU, con WebGL 2 como respaldo.',
  'Contents': 'Índice',
  'Lessons': 'Lecciones',
  'Plates': 'Láminas',
  'Back matter': 'Páginas finales',
  'Before you begin': 'Antes de empezar',
  'Reading a plate': 'Cómo leer una lámina',
  'Each figure is a repeating visual explanation. Pause it, choose a moment, or follow the captions at reading pace.': 'Cada figura es una explicación visual que se repite. Puede pausarla, elegir un momento o seguir los textos al ritmo de lectura.',
  'Conservation status, as assessed on the IUCN Red List.': 'Estado de conservación, según la Lista Roja de la UICN.',
  'Every figure performs a seamless five-second study of how the organism moves, grows or is built.':
    'Cada figura muestra, en un ciclo continuo de cinco segundos, cómo se mueve, crece o está construido el organismo.',
  '“Look closer” items are clickable: each one points to a part on the living figure.':
    'Las notas «Más de cerca» se pueden tocar: cada una señala una parte de la figura viva.',

  // back matter (layouts/back.js)
  'A note': 'Una nota',
  'Words used in this book': 'Palabras de este libro',
  'For further reading': 'Para leer más',
  'Sources': 'Fuentes',
  'Colophon': 'Colofón',

  // "How this book was made" (layouts/making.js)
  'The prompt': 'La instrucción original',
  'This book began with a prompt to {model}, written in English.': 'Este libro nació de una instrucción a {model}, escrita en inglés.',
  'This book began with a prompt to {model}. It is printed as it was written.': 'Este libro nació de una instrucción a {model}. Se imprime tal como se escribió.',
  'This prompt has been edited for the book. The original request is preserved in the project history.': 'Esta instrucción se editó para el libro. El pedido original se conserva en el historial del proyecto.',
  'Translated from the English reader prompt': 'Traducción de la instrucción en inglés que se muestra en el libro',
  'Research, writing, illustrations and review followed this brief:': 'La investigación, la escritura, las ilustraciones y la revisión siguieron este encargo:',
  'This book’s brief': 'El encargo de este libro',
  'The series began with one prompt to {model}. It is printed as it was written.':
    'La serie nació de una sola instrucción a {model}. Se imprime tal como se escribió.',
  'The series began with one prompt to {model}, written in English.': 'La serie nació de una sola instrucción a {model}, escrita en inglés.',
  'Each book was then researched, written, fact-checked twice and revised by its own team of agents, from this brief:':
    'Después, un equipo propio de agentes investigó, escribió, verificó dos veces y revisó cada libro a partir de este encargo:',
  'Translated from the English original': 'Traducción del original en inglés',

  // plate and lesson pages (layouts/plate.js, layouts/lesson.js)
  'Plate {numeral}': 'Lámina {numeral}',
  'Lesson {numeral}': 'Lección {numeral}',
  'Fig. {n} — {scientific}': 'Fig. {n} — {scientific}',
  'Drag to turn the figure · double-click to inspect': 'Arrastre para girar la figura · doble clic para examinarla',
  'Layers': 'Capas',
  'Pro tip': 'Consejo',
  'Common mistakes': 'Errores comunes',
  'Proportions': 'Proporciones',

  // blocks (blocks.js)
  'Field notes': 'Notas de campo',
  'Look closer': 'Más de cerca',
  'Did you know?': 'Dato curioso',
  '**Sources** — {list}': '**Fuentes** — {list}',
  '{title} — a five-second loop': '{title} — un ciclo de cinco segundos',

  // IUCN Red List categories, when a plate's status carries only its code (draw.js IUCN)
  'Extinct': 'Extinto',
  'Extinct in the Wild': 'Extinto en Estado Silvestre',
  'Critically Endangered': 'En Peligro Crítico',
  'Endangered': 'En Peligro',
  'Vulnerable': 'Vulnerable',
  'Near Threatened': 'Casi Amenazado',
  'Least Concern': 'Preocupación Menor',
  'Data Deficient': 'Datos Insuficientes',
  'Not Evaluated': 'No Evaluado',
};
