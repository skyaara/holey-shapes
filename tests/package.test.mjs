import assert from 'node:assert/strict';
import { createHoleySvg, seededHoleyOptions, shapeNames } from '../script.js';

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
assert.match(svg, /animation:hole-open-close/);
assert.match(svg, /--hole-duration:/);
assert.match(svg, /--hole-delay:/);
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

assert.deepEqual(seededHoleyOptions('relay-agent'), seededHoleyOptions('relay-agent'));
assert.equal(seededHoleyOptions('relay-agent').animated, true);

console.log('package API smoke test passed');
