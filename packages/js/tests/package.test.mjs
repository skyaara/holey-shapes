import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extrusionColor, hueColor } from '../color.js';
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
assert.deepEqual(seededHoleyOptions('relay-agent'), {
  shape: 'prism', holes: 3, seed: 922032, turn: 90, mirror: true, color: '#EDD200', shadowColor: '#6C5E00', animated: true,
});

// Every seeded identity, hue step and extrusion color must match the shared
// vectors that the Swift and Kotlin checks also read.
const vectors = readFileSync(new URL('../../seeding-vectors.tsv', import.meta.url), 'utf8').trimEnd().split('\n').slice(1);
for (const line of vectors) {
  const [kind, input, ...expected] = line.split('\t');
  if (kind === 'seed') {
    const o = seededHoleyOptions(input);
    assert.deepEqual([o.shape, o.holes, o.seed, o.turn, o.mirror ? 1 : 0, o.color, o.shadowColor].map(String), expected, input);
  } else if (kind === 'hue') assert.equal(hueColor(Number(input) / 10), expected[0], `hue ${input}`);
  else assert.equal(extrusionColor(input), expected[0], `extrusion ${input}`);
}

// Turns and mirroring move the face, never the extrusion: the filter offsets
// stay outside the transformed path, so depth always points down and right.
const turned = createHoleySvg({ turn: 270, mirror: true, animated: false });
assert.match(turned, /<g filter="url\(#e\)"><path transform="rotate\(270 210 210\) translate\(420 0\) scale\(-1 1\)" d="/);
assert.match(turned, /<feOffset in="s" dx="18" dy="21"/);
assert.equal(createHoleySvg({ turn: 450 }), createHoleySvg({ turn: 90 }));
assert.equal(createHoleySvg({ turn: -90 }), createHoleySvg({ turn: 270 }));
assert.equal(createHoleySvg({ turn: 'x', mirror: 'yes' }), createHoleySvg());
assert.match(createHoleySvg(), /<g filter="url\(#e\)"><path d="/);
const doodleTurned = createHoleySvg({ doodle: true, turn: 90, animated: false });
assert.match(doodleTurned, /<g class="doodle-shadow-offset" transform="translate\(9 11\)"><g class="doodle-shadow" transform="rotate\(90 210 210\)">/);

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
// Doodle shadows are ink unless a shadow color is passed, then a solid silhouette in it.
const inkShadow = createHoleySvg({ doodle: true, animated: false, color: '#00C899' });
assert.match(inkShadow, /class="doodle-shadow"><path d="[^"]+" fill="#25262A" stroke="#25262A"/);
const coloredShadow = createHoleySvg({ doodle: true, animated: false, color: '#00C899', shadowColor: '#005A43' });
assert.match(coloredShadow, /class="doodle-shadow"><path d="[^"]+" fill="#005A43" stroke="#005A43"/);
const seededDoodle = createHoleySvg({ ...seededHoleyOptions('ada', false), doodle: true });
assert.match(seededDoodle, new RegExp(`class="doodle-shadow"[^>]*><path d="[^"]+" fill="${seededHoleyOptions('ada').shadowColor}"`));
const hostile = createHoleySvg({color:'" onload="alert(1)', shadowColor:'<script>', idPrefix:'"><script>alert(1)</script>'});
assert.doesNotMatch(hostile, /<script|onload=/);
assert.notEqual(createHoleySvg({idPrefix:'a-b'}), createHoleySvg({idPrefix:'a_b'}));
assert.equal(createHoleySvg({holes:999, seed:Infinity}), createHoleySvg({holes:8, seed:0}));
assert.equal(createHoleySvg({shadowX:NaN, shadowY:Infinity}), createHoleySvg());
assert.equal(createHoleySvg({holes:null, seed:null, shadowX:null, shadowY:'', shadowSteps:null}), createHoleySvg());
assert.ok(Object.isFrozen(shapeNames[0]));
console.log('Doodle, option sanitization, and SVG prefix regressions passed');
