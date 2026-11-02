// Spanish for Reader, pages, a11y (app-reader). Keys are the exact English strings in code; values keep every
// {placeholder}. See .scratch/bilingual/design-i18n.md §3.
//
// The terms follow the shared terminology (design-i18n §3.4), as the UI and
// the typesetter print them: Lámina, Lección, Índice, Glosario… UI copy uses
// infinitives and nouns (no tú / usted / vos), sentence case. The mirror of
// the printed pages (a11y.js) also reads the typesetter's own keys (imprint,
// how-to legend, making leaf) from src/i18n/es/typeset.js.
export default {
  // what a spread is called (top bar, announcements, contents drawer)
  'Cover': 'Cubierta',
  'Endpapers': 'Guardas',
  'Title page': 'Portada',
  'Imprint': 'Créditos',
  'Contents': 'Índice',
  'Introduction': 'Introducción',
  'How to use this book': 'Cómo usar este libro',
  'Afterword': 'Epílogo',
  'Sources & colophon': 'Fuentes y colofón',
  'Glossary': 'Glosario',
  'How this book was made': 'Cómo se hizo este libro',
  'Back cover': 'Contracubierta',

  // toasts and announcements
  'Export failed — see the console': 'No se pudo exportar — detalles en la consola',
  'Skin hidden. Skeleton shown.': 'Piel oculta. Esqueleto visible.',
  'PNG saved': 'PNG guardado',
  'No figure on this spread': 'Esta doble página no tiene figura',
  'Line-art SVG saved — ready to colour': 'SVG lineal guardado — listo para colorear',
  'Colour plate SVG saved': 'SVG en color guardado',
  '{kind} {number} of {total}: {title}.': '{kind} {number} de {total}: {title}.',
  // the language switch could not fetch the other edition's dictionaries (as the library says it: shell.js)
  'The Spanish edition could not be loaded. Reload the page to try again.':
    'No se pudo cargar la edición en español. Hay que recargar la página para volver a intentarlo.',
  'The English edition could not be loaded. Reload the page to try again.':
    'No se pudo cargar la edición en inglés. Hay que recargar la página para volver a intentarlo.',

  // the reading sheet and screen-reader mirror of the pages
  'Plate': 'Lámina',
  'Lesson': 'Lección',
  'Pro tip.': 'Consejo.',
  'Common mistakes': 'Errores comunes',
  'Proportions': 'Proporciones',
  'Look closer': 'Más de cerca',
  'Did you know?': 'Dato curioso',
  'Sources': 'Fuentes',
  'Colophon': 'Colofón',
  'Author': 'Autor',
  'by {author}': 'por {author}',
  'Published by {publisher}.': 'Publicado por {publisher}.',
  'The prompt': 'La instrucción original',
  'This book’s brief': 'El encargo de este libro',
  'Translated from the English original': 'Traducción del original en inglés',
};
