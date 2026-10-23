import assert from 'node:assert/strict';
import { createHoleySvg, identityHash, seededHoleyOptions, shapeNames } from '../script.js';

assert.equal(shapeNames.length, 14);
assert.ok(!shapeNames.some(({ key }) => key === 'flower'));
assert.ok(shapeNames.some(({ key }) => key === 'flower-star'));

const svg = createHoleySvg({
  shape: 'prism',
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
// Shared with the Swift and Kotlin tests so every platform hashes IDs the same way.
assert.equal(identityHash(''), 'cbf29ce484222325');
assert.equal(identityHash('relay-agent'), '0cc0c8aa3dbd893e');
assert.equal(identityHash('héllo 👋'), '7f88f6cbd1e4ef7d');
assert.deepEqual(seededHoleyOptions('relay-agent'), { shape: 'triangle', seed: 168748, animated: true });

console.log('package API smoke test passed');

// Doodle rendering remains deterministic, DOM-free, and safely parameterized.
for (const {key} of shapeNames) {
  const options = {shape:key, doodle:true, seed:42, color:'#A995E8', idPrefix:`test-${key}`};
  const doodle = createHoleySvg(options);
  assert.equal(createHoleySvg(options), doodle);
  assert.match(doodle, /class="doodle-face"/);
  assert.match(doodle, /transform="translate\(9 11\)"/);
  assert.match(doodle, /fill="#A995E8"/);
  assert.doesNotMatch(doodle, /(?:NaN|Infinity|undefined)/);
  assert.doesNotMatch(doodle, /id="h"|url\(#h\)/);
}
assert.doesNotMatch(createHoleySvg({doodle:true, animated:false}), /<style>|doodle-cutout"/);
const hostile = createHoleySvg({color:'" onload="alert(1)', shadowColor:'<script>', idPrefix:'"><script>alert(1)</script>'});
assert.doesNotMatch(hostile, /<script|onload=/);
assert.notEqual(createHoleySvg({idPrefix:'a-b'}), createHoleySvg({idPrefix:'a_b'}));
assert.equal(createHoleySvg({holes:999, seed:Infinity}), createHoleySvg({holes:8, seed:0}));
assert.equal(createHoleySvg({shadowX:NaN, shadowY:Infinity}), createHoleySvg());
assert.equal(createHoleySvg({holes:null, seed:null, shadowX:null, shadowY:'', shadowSteps:null}), createHoleySvg());
assert.ok(Object.isFrozen(shapeNames[0]));
console.log('Doodle, option sanitization, and SVG prefix regressions passed');
