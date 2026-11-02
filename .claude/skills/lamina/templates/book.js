// Lámina book manifest — template. Copy to src/books/<id>.js (scripts/new-book.mjs
// does it for you, with its Spanish edition src/books/es/<id>.js), then research,
// write and fact-check every field. This file is the English source edition: the
// Spanish one translates its text and never changes its ids.
// Schema & budgets: .claude/skills/lamina/references/manifest.md
export default {
  id: '__ID__', // route: index.html#/<lang>/__ID__ (never a two-letter language code)
  title: '__TITLE__',
  subtitle: '__SUBTITLE__',
  kicker: 'Lámina · Volume __N__',
  author: 'Lámina Natural History Press', // the imprint line (publisher), not a person
  byline: { name: '__AUTHOR__', mark: '__MARK__' }, // the author: foil-stamped on both boards when `mark` names a drawing in AUTHOR_MARKS
  edition: 'First edition, __YEAR__',
  locale: 'en',
  theme: {
    style: 'lithograph', // 'lithograph' (colour plates) | 'engraving' (black ink on white)
    cloth: '#23412f', // board cloth
    foil: '#c9a44c', // foil stamping
    paper: '#fbf8f1',
    ink: '#1c1a17',
    accent: '#9e2b25', // UI + chips
    muted: '#7b7466',
    endpaper: { motif: 'leaves', color: '#23412f', ground: '#efe7d6' }, // scales | leaves | grid
    fonts: { display: 'Cormorant Garamond', body: 'EB Garamond', label: 'IBM Plex Sans Condensed', mono: 'IBM Plex Mono' },
  },
  intro: {
    title: '__INTRO TITLE__',
    paragraphs: ['≤ 260 words in total.'],
  },
  howTo: {
    title: 'How to read this book',
    items: [
      ['Drag a page corner, click, swipe or use ← →', 'Turn the page'],
      ['Drag the figure', 'Turn it on its stand'],
      ['Double-click the figure', 'Inspect it up close'],
      ['Layers · Explode · Labels', 'Look inside and dissect'],
      ['Export', 'Save the plate as SVG (colour or line art)'],
    ],
  },
  plates: [
    {
      id: '__plate-id__',
      number: 'I',
      layout: 'plate', // 'plate' | 'lesson'
      common: '__Common name__',
      commonAlt: '__Other common name__',
      scientific: '__Genus species__',
      authority: '(__Author, year__)',
      family: '__Family · Subfamily__',
      status: { code: 'LC', label: 'Least Concern', source: 'IUCN Red List' }, // or null
      badge: '__short property chip__',
      lede: '≤ 25 words that make a reader want to turn the page.',
      body: ['Two paragraphs, 120–220 words in total. *Italic* binomials.', '…'],
      facts: [
        ['Length', '…'],
        ['Range', '…'],
        ['Habitat', '…'],
        ['Diet', '…'],
      ],
      lookCloser: [
        // label ids the figure creates (canonical list: docs/architecture/CONTRACTS.md §6);
        // `name` (≤ 3 words) is printed as the note's run-in — optional here (default: the
        // label id, humanised, 'Seed'); write it when the figure's pill says something else
        // (the demo's 'wall' label reads 'Pericarp'). Required in the Spanish edition.
        { label: 'wall', name: 'Pericarp', text: 'Find the pericarp …' },
        { label: 'seed', text: 'Notice the seeds …' },
      ],
      didYouKnow: '≤ 40 words, one surprising verified fact.',
      figure: {
        // the working demo seed pod until your subject exists
        // (node .claude/skills/lamina/scripts/new-subject.mjs <type>)
        type: 'demo', // registered in src/subjects/index.js
        params: {},
        caption: 'Fig. 1 — …',
        scaleNote: '…',
      },
      animation: {
        title: '__The 5-second story__',
        beats: [
          [0, '…'],
          [1.6, '…'],
          [3.4, '…'],
        ],
      },
      sources: ['__short refs__'],
    },
  ],
  back: {
    note: { title: '__Note title__', paragraphs: ['≤ 220 words.'] },
    glossary: [['term', 'definition']],
    sources: ['Full reference with year and publisher or URL.'],
    colophon: ['Lámina Natural History Press', 'Rendered with Three.js WebGPU + TSL', 'Set in Cormorant Garamond, EB Garamond & IBM Plex'],
  },
};
