// Spanish for FigureHost, export, lab (figures-export). Keys are the exact English strings in code; values keep every
// {placeholder}. See .scratch/bilingual/design-i18n.md §3.
//
// Figure strings (label texts, part and colour names, beats) are not here:
// they belong to their subject's dictionary (snakes.js, flowers.js, skulls.js),
// although the host and the exporter are where they get translated.
export default {
  // FigureHost: the printed notice where a figure failed to build
  'FIGURE UNAVAILABLE': 'FIGURA NO DISPONIBLE',

  // SVG plate: fallback title and the description read by screen readers
  'Figure': 'Figura',
  'Line art for colouring.': 'Dibujo lineal para colorear.',
  'Colour plate.': 'Lámina en color.',
  'Exported from a Lámina living plate.': 'Exportación de una lámina viva de Lámina.',

  // export failure the reader can act on (err.userMessage, already in the plate's language)
  'Nothing solid to export — switch a figure layer back on': 'Nada sólido que exportar: hay que volver a activar una capa de la figura',

  // names the plate gives colours and meshes the subject did not name
  'Body': 'Cuerpo',
  '{part} — dark markings': '{part}: marcas oscuras',
  '{part} — pale markings': '{part}: marcas claras',
  '{part} — coloured markings': '{part}: marcas de color',
  '{part} — markings': '{part}: marcas',
};
