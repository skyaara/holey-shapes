import { createHoleySvg, identityHash, seededHoleyOptions, shapes } from '../../packages/js/index.js';

// Makes as many avatars as it can in its time budget: a random username, its
// hash, a seeded layout and a solid SVG. Work runs in short slices so pause
// messages get through. Every name and hash goes to the page, but only the
// newest SVG does, since the page shows one avatar at a time. Each holey is
// stamped with the active time it finished at, for the page's timeline.
const moods = ['sleepy', 'fuzzy', 'brave', 'tiny', 'wobbly', 'cosmic', 'salty', 'quiet', 'lucky', 'spicy', 'mellow', 'zippy', 'sunny', 'bouncy', 'misty', 'gentle'];
const things = ['mango', 'pixel', 'otter', 'comet', 'fern', 'noodle', 'kite', 'yuzu', 'moss', 'pebble', 'tofu', 'orbit', 'panda', 'waffle', 'cactus', 'nimbus'];
const pick = (list) => list[(Math.random() * list.length) | 0];
const SLICE_MS = 16;

let running = false;
let remaining = 0;
let active = 0;
let total = 0;
// Each start or resume begins a new chain; ticks from an older one are ignored.
let chain = 0;
const tick = new MessageChannel();

function slice() {
  if (!running) return;
  const started = performance.now();
  const end = started + Math.min(SLICE_MS, remaining);
  const names = [];
  const hashes = [];
  const times = [];
  let svg = '';
  do {
    const username = `${pick(moods)}${pick(things)}${(Math.random() * 10000) | 0}`;
    names.push(username);
    hashes.push(identityHash(username));
    svg = createHoleySvg({ ...seededHoleyOptions(username, false), doodle: false, idPrefix: `bench-${total++}` });
    times.push(active + performance.now() - started);
  } while (performance.now() < end);
  const spent = performance.now() - started;
  remaining -= spent;
  active += spent;
  const done = remaining <= 0;
  self.postMessage({ type: done ? 'done' : 'batch', names, hashes, times, svg, active });
  if (done) running = false;
  else tick.port2.postMessage(chain);
}
tick.port1.onmessage = ({ data }) => { if (data === chain) slice(); };

self.onmessage = ({ data }) => {
  if (data.type === 'start') {
    remaining = data.duration;
    active = 0;
    running = true;
    chain += 1;
    slice();
  } else if (data.type === 'pause') {
    running = false;
  } else if (data.type === 'resume' && !running && remaining > 0) {
    running = true;
    chain += 1;
    slice();
  }
};

// A one-second run is short enough that compiling shape outlines and JIT
// warm-up would dominate it, so do both before the clock starts.
for (let round = 0; round < 3; round++) {
  for (const { key } of shapes) createHoleySvg({ shape: key, seed: round + 1, animated: false });
}
self.postMessage({ type: 'ready' });
