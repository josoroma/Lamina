// Lámina book manifest — Spanish edition template. Copy to src/books/es/<id>.js
// (scripts/new-book.mjs does it for you) and translate the English source edition
// src/books/<id>.js into it, field by field.
//
// The reader composes this file over the English manifest (src/i18n/edition.js,
// key set in src/i18n/schema.js): same keys, same list lengths, plates matched by
// `id` and look-closer notes by `label` (keep both). Ids, numbers, theme and figure
// params always come from English, so they may be copied or left out — never
// changed. Every reader-visible string is translated: Spanish typography (« »,
// ¿ ¡, decimal comma, "85 %" with a no-break space, no grouping under 10 000),
// binomials identical and in *italics*, Costa Rican common names kept, and
// `commonAlt` carrying the other language's name.
// Check: node scripts/validate-books.mjs __ID__ --lang es --fit, and with
// --runtime <audit.mjs --lang es --i18n --json output> for the figure strings
// Guide: .claude/skills/lamina/references/manifest.md ("The Spanish edition")
export default {
  id: '__ID__',
  title: '__TITLE__',
  subtitle: '__Subtítulo__',
  kicker: 'Lámina · Volumen __N__',
  author: 'Lámina Natural History Press',
  edition: 'Primera edición, __YEAR__',
  locale: 'es',
  intro: {
    title: '__Título de la introducción__',
    paragraphs: ['≤ 260 palabras en total en inglés; la traducción no ocupa más líneas que el original.'],
  },
  howTo: {
    title: 'Cómo leer este libro',
    items: [
      ['Arrastrar una esquina, hacer clic, deslizar o usar ← →', 'Pasar la página'],
      ['Arrastrar la figura', 'Girarla sobre su base'],
      ['Doble clic en la figura', 'Examinarla de cerca'],
      ['Capas · Despiece · Etiquetas', 'Mirar por dentro y diseccionar'],
      ['Exportar', 'Guardar la lámina en SVG (a color o de línea)'],
    ],
  },
  plates: [
    {
      id: '__plate-id__',
      number: 'I',
      layout: 'plate',
      common: '__Nombre común__',
      commonAlt: '__Other common name__',
      scientific: '__Genus species__',
      authority: '(__Author, year__)',
      family: '__Familia · Subfamilia__', // identical only when every part is a taxon (Viperidae · Crotalinae)
      status: { code: 'LC', label: 'Preocupación menor', source: 'Lista Roja de la UICN' }, // or null, as in English
      badge: '__propiedad breve__',
      lede: '≤ 25 palabras que inviten a pasar la página.',
      body: ['Dos párrafos, 120–220 palabras en total en inglés. Binomios idénticos y en *cursiva*.', '…'],
      facts: [
        ['Longitud', '…'],
        ['Distribución', '…'],
        ['Hábitat', '…'],
        ['Dieta', '…'],
      ],
      lookCloser: [
        // `name` is exactly the Spanish of the label's pill (the subject's dictionary,
        // src/i18n/es/<folder>.js): one structure, one name, ≤ 3 words
        { label: 'wall', name: 'Pericarpio', text: 'Busque el pericarpio…' },
        { label: 'seed', name: 'Semilla', text: 'Observe las semillas…' },
      ],
      didYouKnow: '≤ 40 palabras: un dato sorprendente y verificado.',
      figure: {
        caption: 'Fig. 1 — …',
        scaleNote: '…',
      },
      animation: {
        title: '__La historia de 5 segundos__',
        beats: [
          [0, '…'],
          [1.6, '…'],
          [3.4, '…'],
        ],
      },
      sources: ['__referencias breves__'],
    },
  ],
  back: {
    note: { title: '__Título de la nota__', paragraphs: ['≤ 220 palabras.'] },
    glossary: [['término', 'definición']],
    sources: ['Referencia completa con año y editorial o URL; solo se traducen las palabras de enlace.'],
    colophon: ['Lámina Natural History Press', 'Representado con Three.js WebGPU + TSL', 'Compuesto en Cormorant Garamond, EB Garamond e IBM Plex'],
  },
};
