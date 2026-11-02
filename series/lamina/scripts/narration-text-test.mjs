#!/usr/bin/env node
import assert from 'node:assert/strict';
import { narrationForLeftPage, plainNarrationText, chunkNarrationText } from '../src/app/narration-text.js';
import { buildSides } from '../src/engine/typeset/sides.js';
import { loadEdition } from '../src/i18n/edition.js';
import { loadLang } from '../src/i18n/index.js';
import { BOOKS } from '../src/books/index.js';

await loadLang('es');
let cases = 0;
const test = (name, fn) => { fn(); cases++; console.log(`✓ ${name}`); };
// Stable synthetic content exercises selection rules in any independent series.
// Real registered books are still swept below for complete text/chunk coverage.
const fixture = lang => ({
  id: 'narration-fixture', locale: lang, title: `Narration ${lang}`,
  plates: [0, 1].map(i => ({
    id: `plate-${i}`, number: i ? 'II' : 'I', layout: 'plate',
    common: `Unique page title ${lang} ${i}`, commonAlt: lang === 'en' ? `Alternate name ${i}` : null,
    lede: `Unique left-page opening ${lang} ${i}.`, body: [`Body paragraph ${lang} ${i}.`],
    facts: [['Field', `A fact ${lang} ${i}.`]], lookCloser: [],
    didYouKnow: `Distinct curiosity ${lang} ${i}.`,
    figure: { type: 'demo', params: {}, caption: `Right caption ${lang} ${i}.`, scaleNote: `Right scale ${lang} ${i}.` },
    animation: { beats: [[0, `Animation cue ${lang} ${i}.`]] },
  })),
  back: { glossary: [['Fixture', `Unique glossary definition ${lang}.`]] },
  making: { prompt: { lines: [`Unique original prompt ${lang}.`] }, brief: { text: `Unique book brief ${lang}.` } },
});
const en = fixture('en'), es = fixture('es');
const enSides = buildSides(en), esSides = buildSides(es);
const plateSpread = enSides.plateSpread(1);
const voice = narrationForLeftPage(enSides, plateSpread, 'en');

test('the current physical verso is selected, not the following plate', () => {
  assert.equal(voice.sideIndex, 2 * plateSpread - 1);
  assert.equal(voice.pageNumber, enSides[2 * plateSpread - 1].folio);
  assert.equal(voice.title, en.plates[0].common);
  assert(voice.text.includes(plainNarrationText(en.plates[0].lede)));
  assert(!voice.text.includes(plainNarrationText(en.plates[1].lede)));
});
test('right-page captions, scales, controls and animation beats are absent', () => {
  const right = en.plates[0];
  assert(!voice.text.includes(plainNarrationText(right.figure.caption)));
  assert(!voice.text.includes(plainNarrationText(right.figure.scaleNote)));
  for (const [, beat] of right.animation.beats) assert(!voice.text.includes(plainNarrationText(beat)));
  assert(!voice.text.includes('Drag to turn the figure'));
});
test('closed books, endpapers and unsettled turns do not speak', () => {
  for (const opened of [0, 1, enSides.leafCount, -1, plateSpread + 0.5, NaN]) assert.equal(narrationForLeftPage(enSides, opened, 'en'), null);
});
test('Spanish uses the Spanish page and excludes intentionally omitted alternate names', () => {
  const spanish = narrationForLeftPage(esSides, plateSpread, 'es');
  assert(spanish.text.includes(plainNarrationText(es.plates[0].lede)));
  assert(!spanish.text.includes(plainNarrationText(en.plates[0].lede)));
  assert(!spanish.text.includes(en.plates[0].commonAlt));
  assert(spanish.text.includes('Lámina I.'));
  assert(!spanish.text.includes('null'));
  assert.notEqual(spanish.key, voice.key);
  assert.equal(narrationForLeftPage(esSides, plateSpread, 'en'), null);
});
test('a changed left page invalidates narration while right-page changes do not', () => {
  const changed = enSides.map((s) => s);
  changed[voice.sideIndex + 1] = { ...changed[voice.sideIndex + 1], plate: { caption: 'Right side changed.' } };
  assert.equal(narrationForLeftPage(changed, plateSpread, 'en').key, voice.key);
  changed[voice.sideIndex] = { ...changed[voice.sideIndex], plate: { ...changed[voice.sideIndex].plate, lede: 'An edited left page.' } };
  assert.notEqual(narrationForLeftPage(changed, plateSpread, 'en').key, voice.key);
});
test('markup and numeric entities become ordinary speech text', () => {
  assert.equal(plainNarrationText('**Boa** *imperator*\u00a0— [source](https://example.org) &amp; &#x65F1;\u00ad'), 'Boa imperator — source & 旱');
});
test('default chunking preserves all text in uniformly short chunks', () => {
  const text = 'A short opening sentence. ' + 'This sentence explains a long but continuous observation of the natural world. '.repeat(20);
  const chunks = chunkNarrationText(text);
  assert(chunks.length > 2);
  assert(chunks[0].length <= 180);
  assert(chunks.every((s) => s.length <= 180));
  assert.equal(chunks.join(' '), plainNarrationText(text));
});
test('explicit chunk limits can use larger later chunks without losing text', () => {
  const text = 'A short opening sentence. ' + 'A longer observation continues this account of the natural world. '.repeat(20);
  const chunks = chunkNarrationText(text, 'en', { maxChars: 360, firstMaxChars: 180 });
  assert(chunks[0].length <= 180);
  assert(chunks.slice(1).some((s) => s.length > 180));
  assert(chunks.every((s) => s.length <= 360));
  assert.equal(chunks.join(' '), plainNarrationText(text));
});
test('empty text has no playable chunks', () => {
  assert.deepEqual(chunkNarrationText(''), []);
  assert.equal(narrationForLeftPage(null, 3), null);
});

const lessonBook = fixture('es');
lessonBook.plates[0].layout = 'lesson';
lessonBook.plates[0].lesson = { steps: [{ title: 'Paso uno', text: 'Dibuje el contorno de prueba.' }], proTip: 'Compare las proporciones de prueba.' };
const lessonSides = buildSides(lessonBook);
test('lesson narration includes the drawing instructions but not the right-page curiosity', () => {
  const lesson = narrationForLeftPage(lessonSides, lessonSides.plateSpread(1), 'es');
  assert(lesson.text.includes(plainNarrationText(lessonBook.plates[0].lesson.steps[0].text)));
  assert(lesson.text.includes(plainNarrationText(lessonBook.plates[0].lesson.proTip)));
  assert(!lesson.text.includes(plainNarrationText(lessonBook.plates[0].didYouKnow)));
});
test('glossary narration excludes the facing original prompt', () => {
  const side = esSides.find((s) => s.layout === 'glossary');
  const result = narrationForLeftPage(esSides, side.spread, 'es');
  assert(result.text.startsWith('Glosario.'));
  assert(result.text.includes(plainNarrationText(side.glossary[0][1])));
  assert(!result.text.includes('La instrucción original'));
});
test('the final left page reads only the book brief, not its right endpaper or prior prompt', () => {
  const side = esSides.find((s) => s.layout === 'making' && s.making.part === 'brief');
  const result = narrationForLeftPage(esSides, side.spread, 'es');
  assert(result.text.includes(plainNarrationText(side.making.brief.text)));
  assert(!result.text.includes(plainNarrationText(side.making.prompt.lines[0])));
});

let pages = 0, chunks = 0;
for (const { id } of BOOKS) for (const lang of ['en', 'es']) {
  const book = await loadEdition(id, lang), sides = buildSides(book);
  for (let opened = 0; opened <= sides.leafCount; opened++) {
    const result = narrationForLeftPage(sides, opened, lang);
    if (!result) continue;
    pages++; chunks += result.chunks.length;
    assert(result.chunks.every((s) => s.length > 0 && s.length <= 180), `${id}/${lang}/${opened}: chunk length`);
    assert.equal(result.chunks.join(' '), plainNarrationText(result.text), `${id}/${lang}/${opened}: text loss`);
    assert.equal(sides[result.sideIndex].recto, false);
  }
}
console.log(`\n${cases} narration checks passed; ${pages} left pages, ${chunks} bounded chunks across ${BOOKS.length} registered books in both languages.`);
