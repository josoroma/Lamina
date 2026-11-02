// How this book was made — the English originals, printed verbatim on the
// making leaf at the end of every book (one leaf before the back board: the
// prompt on its recto, the book’s brief on its verso; design-i18n §7).
//
//   PROMPT  the user’s original prompt, line by line as quoted in
//           docs/prompts/00-original-brief.md (“> ” stripped; “* ” lines are
//           bullets; `title` and `headings` index into `lines`)
//   BRIEFS  each book’s brief, `books[].brief` in docs/prompts/02-build-workflow.js
//   LATER   the one closing line on the later prompts, kept in docs/prompts/
//
// Verbatim means verbatim: typos, straight quotes and the two arrows of the
// Calaveras brief stay as written (the validator compares these strings with
// the documents). making/es.js exports the same names and shape, translated.

export const LANG = 'en';
export const TRANSLATED_FROM = null; // the originals; making/es.js says 'en'
export const MODEL = 'Claude Code (Opus 5.5)';

export const PROMPT = {
  source: 'docs/prompts/00-original-brief.md',
  lines: [
    'Claude Skill: Interactive 3D Scientific full width Colored Books',
    '',
    'Create a reusable Claude Code skill inspired by:',
    '',
    '* https://april-zhu.com/colorfigures',
    '* https://github.com/wheresryan22/anatomy',
    '* https://jakub.kr/skills (Teardown)',
    '',
    'Build immersive, interactive 3D scientific books inspired by Costa Rican biodiversity, with subjects including astronomy, physics, chemistry, botany, skeletons, muscles, snakes, insects, flowers, mushrooms, butterflies, felines, monkeys, turtles, sloths, and medicinal plants.',
    '',
    'Visual Experience',
    '',
    '* A realistic, elegant 3D book floating against a pure white background.',
    '* Users can turn pages interactively, with realistic page-flipping animations, paper curvature, shadows, and depth.',
    '* Each page contains colorful, scientifically accurate 3D illustrations that come alive.',
    '* Museum-quality scientific artwork, clean typography, annotations, and rich natural colors.',
    '* Minimal, premium design. No clutter or unnecessary UI.',
    '',
    'Interactions',
    '',
    '* Turn pages by dragging, clicking, swiping, or using arrow keys.',
    '* Rotate, zoom, dissect, explode, and explore 3D illustrations.',
    '* Toggle anatomical layers and scientific labels.',
    '* Each page features a seamless 5-second scientific animation.',
    '',
    'Technology',
    'Use Three.js + WebGPU, with TSL/WGSL shaders, WebGL fallback, and optional WASM, WebXR, and advanced GPU techniques where beneficial.',
    '',
    'Deliverables',
    '',
    '* Reusable Claude Code SKILL.md and supporting components.',
    '* Working interactive 3D colored book with multiple pages.',
    '* Five-second animations for each illustrated subject.',
    '* Portable SVG export of individual scientific illustrations.',
    '* Responsive, performant, production-ready implementation.',
    '',
    'Goal: Transform any scientific topic into a beautiful, interactive, page-turnable 3D encyclopedia on a clean white canvas. Build a functioning prototype, not just a design or specification.',
    '',
    'Lets start with 3 original products colored books: one for Costa Rican snakes and another for Costa Rican flowers and another for Drawing Skulls. Document in docs folders the prompts and outputs we use to produce this two docs/demos',
    '',
    'Leave the README.md as ycombinator product, with an svg logo on top and TOC',
  ],
  title: 0,
  headings: [10, 18, 25, 28],
};

export const BRIEFS = {
  serpientes: {
    source: 'docs/prompts/02-build-workflow.js',
    text: `"Serpientes — A Living Atlas of Costa Rican Snakes" (lithograph style). Plates exactly as CONTRACTS §12 I, in this order: I Terciopelo (Bothrops asper, pose strike), II Bocaracá / eyelash viper, 'oropel' morph (Bothriechis schlegelii, pose branch, params.morph 'oropel'), III Coral (Micrurus nigrocinctus, pose slither), IV Cascabel (Crotalus simus, pose rattle), V Matabuey / bushmaster (Lachesis stenophrys, pose ambush), VI Serpiente marina (Hydrophis platurus, pose swim), VII Béquer (Boa imperator, pose constrict). Theme: cloth deep forest green, gold foil, accent oxblood; endpaper motif 'scales'. Intro essay: why Costa Rica has ~140+ snake species (verify the count), how to look at a snake, the minority that are venomous. Back-matter note: snakebite safety & first aid done right (Instituto Clodomiro Picado / UCR antivenom; seek medical care immediately; immobilise and keep calm; no tourniquets, cuts, suction, ice, alcohol; never handle snakes) — medically accurate. The Coral plate should explain why the "red touches yellow" rhyme is unreliable in Central America and mention harmless mimics. Use current taxonomy (Boa imperator, Hydrophis platurus) and note older names where useful.`,
  },
  flores: {
    source: 'docs/prompts/02-build-workflow.js',
    text: `"Flores — A Living Herbarium of Costa Rica" (lithograph style). Plates exactly as CONTRACTS §12 II, in this order: I Guaria morada (Guarianthe skinneri — national flower of Costa Rica; verify the year of designation), II Platanilla (Heliconia wagneriana), III Granadilla de monte (Passiflora vitifolia), IV Labios de mujer (Palicourea elata, syn. Psychotria elata), V Cortez amarillo (Handroanthus ochraceus, syn. Tabebuia ochracea), VI Nenúfar (Nymphaea ampla). Theme: cloth deep plum or terracotta with gold foil, accent magenta; endpaper motif 'leaves'. 'status' only where an assessment really exists (otherwise null). Facts rows like Family, Height/Size, Flowering, Pollinators, Habitat, Elevation. Intro essay: Costa Rica's floral diversity (verify any number you state, e.g. vascular plant or orchid species counts), flowers as negotiations with pollinators. Back-matter note: look, don't pick — orchid protection and responsible observation (verify CITES/legal statements).`,
  },
  calaveras: {
    source: 'docs/prompts/02-build-workflow.js',
    text: `"Calaveras — Drawing Skulls: A Constructive Method" (engraving style; a drawing instruction book, all lessons use layout 'lesson'). Lessons exactly as CONTRACTS §12 III, in this order: I Frontal view, II Three-quarter view with open jaw, III Profile, IV The bones (exploded skull, the 22 bones), V Jaguar (Panthera onca — Costa Rica's largest cat; comparative anatomy), VI Skull & snake (composition: a Costa Rican eyelash viper weaving through the skull). For each lesson write: common = lesson title (e.g. 'Frontal View'), commonAlt (Spanish, e.g. 'Vista frontal'), scientific = the anatomical focus (e.g. 'Cranium & mandible' — keep 'scientific' short), family = a short category line, lede, body (how to see and draw this view — ORIGINAL pedagogy, never copy any existing drawing book), facts (proportions/measurements), lookCloser (canonical skull label ids), didYouKnow, lesson: { steps: exactly 3 { title, text } matching: 0 = big shapes (circle/sphere + centre line), 1 = guides & jaw taper, 2 = sockets, nasal aperture & refined contour — adapt per lesson (e.g. profile: circle + face wedge; jaguar: wedge muzzle + crest), proTip, mistakes, proportions }, figure: { type: 'skull', params: { subject, lesson, ... } } exactly as §12 III, animation beats. status: null; badge: e.g. 'Lesson 1 · Beginner'. Theme: black cloth with silver/white foil, pure white paper (#ffffff), ink black, accent vermilion; endpaper motif 'grid'; fonts: display 'Oswald', body 'EB Garamond', label 'IBM Plex Sans Condensed', mono 'IBM Plex Mono'. Intro essay: why artists study the skull (structure under every face), the constructive method (big shapes → guides → planes → details). Back-matter note: practice routine + respectful use of anatomical references. Anatomy facts must be correct (22 bones: 8 cranial + 14 facial; mandible the only movable bone; adult dentition 32; eyes roughly at half the head height in the living head — be careful to distinguish skull vs living-head proportions).`,
  },
};

export const LATER = {
  source: 'docs/prompts/',
  text: 'Later prompts reshaped the books: two review rounds, then a request for this bilingual edition, the author’s mark, the snake faces and the béquer’s colours and prey. All are in docs/prompts/.',
};
