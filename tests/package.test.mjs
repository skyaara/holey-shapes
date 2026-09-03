import assert from 'node:assert/strict';
import { createHoleySvg, shapeNames } from '../script.js';

assert.equal(shapeNames.length, 15);
assert.ok(shapeNames.some(({ key }) => key === 'flower'));

const svg = createHoleySvg({
  shape: 'flower',
  color: '#12ABEF',
  shadowColor: '#06405A',
  holes: 6,
  seed: 3,
  duration: 700
});

assert.match(svg, /^<svg/);
assert.match(svg, /fill="#12ABEF"/);
assert.match(svg, /flood-color="#06405A"/);
assert.match(svg, /animation:spin 700ms/);
assert.match(svg, /with 6 holes/);
assert.doesNotMatch(svg, /[\r\n]/);
assert.doesNotMatch(svg, /\d+\.\d*0"/);
assert.doesNotMatch(svg, /fill="black"/);
assert.match(svg, /result="s1"/);
assert.match(svg, /<mask id="h">/);
assert.match(svg, /<filter id="e"/);

const stillSvg = createHoleySvg({ animated: false, holes: 0 });
assert.doesNotMatch(stillSvg, /@keyframes/);
assert.match(stillSvg, /with 0 holes/);

console.log('package API smoke test passed');
