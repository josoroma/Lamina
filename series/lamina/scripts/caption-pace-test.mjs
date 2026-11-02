import assert from 'node:assert/strict';
import { recommendedPlaybackRate } from '../src/engine/figures/captionPace.js';
import { loadEdition } from '../src/i18n/edition.js';
import { BOOKS } from '../src/books/index.js';

assert.equal(recommendedPlaybackRate([]), 1);
assert.equal(recommendedPlaybackRate(null), 1);
assert.equal(recommendedPlaybackRate([[0, 'A short sentence.']], 0), 1);
assert.equal(recommendedPlaybackRate([{ t: 0, text: 'Read this.' }]), 1);
assert.equal(recommendedPlaybackRate([[0, 'Read this.'], [1, 'Then this.']]), 0.25);
assert(recommendedPlaybackRate([[0, 'one two three four five six seven eight nine ten eleven twelve']]) < 1);

let checked = 0, plates = 0;
for (const { id } of BOOKS) for (const lang of ['en', 'es']) {
  const book = await loadEdition(id, lang);
  for (const plate of book.plates) {
    plates++;
    const beats = plate.animation.beats;
    const rate = recommendedPlaybackRate(beats, 5);
    assert(rate > 0 && rate <= 1, `${id}/${lang}/${plate.id}: a finite positive slowdown`);
    for (let i = 0; i < beats.length; i++) {
      const [start, text] = beats[i];
      const end = i + 1 < beats.length ? beats[i + 1][0] : 5 + beats[0][0];
      const words = text.trim().split(/\s+/u).length;
      assert((end - start) / rate + 1e-9 >= Math.max(4, words / 2.5 + 0.8), `${id}/${lang}/${plate.id}: readable beat ${i}`);
      checked++;
    }
  }
}
console.log(`PASS: every caption gets at least 4 seconds and 150-wpm reading time (${checked} beats, ${plates} localized plates).`);
