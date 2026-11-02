// Editorial reader prompt; the historical request remains in docs/prompts/07.
// The first three books retain their original production record.
export const LANG = 'en';
export const TRANSLATED_FROM = null;
export const MODEL = 'Codex';
export const PROMPT = {
  source: 'docs/prompts/10-screenshot-corrections.md',
  editorial: true,
  displayTitle: 'The prompt',
  title: 0,
  headings: [2, 5, 8],
  lines: [
    'Add three books in English and Spanish, with clear, curious explanations grounded in everyday examples:',
    '',
    '1. Atoms — The Invisible Building Blocks',
    "Everything around you—the stars, the oceans, the air, even your own body—is made of atoms. But here's the extraordinary part: the same tiny building blocks can create completely different things simply by arranging themselves differently. Let's explore a world so small that nothing behaves quite the way you'd expect.",
    '',
    '2. Cells — The Tiny Machines of Life',
    "Imagine a microscopic factory that takes in energy, builds complicated machinery, repairs itself, and sometimes even makes copies of itself. That's a cell! Your body contains trillions of them, working together without anyone giving them orders. How can ordinary chemistry produce something alive? Let's peek inside and find out.",
    '',
    '3. Campfire by the Beach — A Flame Under the Stars',
    'Picture a campfire at night, near the beach, under a sky full of stars, a storytelling expert father and her smart daughter. The waves move in the dark, the wood crackles, and sparks rise into the air like tiny glowing messengers. But what’s really happening in that fire? The wood is being transformed: heat breaks it apart, gases escape, and those gases react with oxygen to make flame, light, and warmth. A beach campfire is more than a beautiful scene—it is chemistry, energy, and motion unfolding right in front of you.',
  ],
};
export const BRIEFS = {
  atomos: {
    source: 'docs/prompts/07-science-books.md',
    text: 'Create six bilingual illustrated chapters about atoms: probability clouds and the nucleus, elements and isotopes, molecules and bonds, thermal motion and states, carbon arrangements, and light from energy-level changes. Use original, curious explanations with everyday examples and small predictions. Distinguish models from literal pictures: no planetary electron tracks, enlarged nuclei, schematic bonds, and slowed explanatory time. Include sources, a glossary, interactive layers and a final prompt page.',
  },
  celulas: {
    source: 'docs/prompts/07-science-books.md',
    text: 'Create six bilingual illustrated chapters about cells: organized chemistry, selective membranes, DNA to RNA to protein, mitochondria and ATP, chloroplasts and photosynthesis, and division and cooperation. Explain how local molecular interactions produce organized behavior without a boss. Treat the factory comparison as an analogy. Show distinct cutaway models with layers, labels and reversible separation. Include sources, a glossary and the prompt. Explain energy coupling without suggesting that breaking a bond alone releases energy.',
  },
  fogata: {
    source: 'docs/prompts/07-science-books.md',
    text: 'Create six bilingual chapters following a storytelling father and his curious daughter beside a beach campfire under the stars. Start with their scene, then reveal wood decomposition, escaping gases and oxygen, rearrangement of atoms, heat transfer, glowing soot and embers, and the connection to sunlight and photosynthesis. Distinguish chemical fire from stellar fusion. Give the daughter real questions and predictions. Build a beach diorama and separate inspectable mechanisms, with sources, a glossary and the prompt.',
  },
};
export const LATER = {
  source: 'docs/prompts/08-visual-refinement.md',
  text: 'The science illustrations were rebuilt with sculpted organic forms, richer material detail and more expressive motion after a visual comparison with the original volumes. The author’s refinement request and art direction are recorded in docs/prompts/08-visual-refinement.md.',
};
