import { createHoleySvg, identityHash, seededHoleyOptions, shapes } from '../../packages/js/index.js';
import './chrome.js';
import { highlight } from './highlight.js';

// Packing a new layout can take tens of milliseconds, so SVGs are built in
// workers. The hero gets its own worker so typing never waits on the gallery.
function createRenderer() {
  let worker;
  try {
    worker = new Worker(new URL('./render-worker.js', import.meta.url), { type: 'module' });
  } catch {
    return async (options) => {
      const started = performance.now();
      const svg = createHoleySvg(options);
      return { svg, ms: performance.now() - started };
    };
  }
  const pending = new Map();
  let nextId = 0;
  worker.onmessage = ({ data }) => {
    pending.get(data.id)?.(data);
    pending.delete(data.id);
  };
  return (options) => new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    worker.postMessage({ id, options });
  });
}

const renderHero = createRenderer();
const renderGallery = createRenderer();
const renderDemo = createRenderer();

// Keeps one render in flight and replaces whatever is waiting, so dragging or
// typing fast never builds a queue of avatars nobody will see.
function latestOnly(render) {
  let busy = false;
  let next = null;
  const run = async () => {
    busy = true;
    while (next) {
      const { options, done } = next;
      next = null;
      const result = await render(options);
      if (!next) done(result);
    }
    busy = false;
  };
  return (options, done) => {
    next = { options, done };
    if (!busy) run();
  };
}
const drawPick = latestOnly(renderDemo);
const drawLive = latestOnly(renderDemo);

// Bench: one worker makes avatars for one second, the same single thread an
// app would use. The page shows the newest one each frame and keeps every name,
// so any of them can be redrawn later from the name alone.
const BENCH_MS = 1000;
const ROW_HEIGHT = 30;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const format = (value) => Math.round(value).toLocaleString('en-US');
const byId = (id) => document.getElementById(id);
const perHoley = (ms) => `${ms.toFixed(ms < 10 ? 2 : 1)} ms`;
const bench = {
  count: byId('bench-count'), avg: byId('bench-avg'), rate: byId('bench-rate'), time: byId('bench-time'),
  run: byId('bench-run'), summary: byId('bench-summary'), avatar: byId('bench-avatar'),
  name: byId('bench-name'), hash: byId('bench-hash'), redraw: byId('bench-redraw'),
  feed: byId('bench-feed'), space: byId('bench-feed-space'), slider: byId('bench-slider'), position: byId('bench-position'),
};
const names = [];
const hashes = [];
const times = [];
const rows = [];
let benchWorker = null;
let benchState = 'idle';
let selected = -1;
let activeMs = 0;
let resumedAt = 0;
let latestSvg = '';
let shownCount = 0;
let feedDirty = true;
let lastPaint = 0;
let raf = 0;
let resolveFirst;
const firstBench = new Promise((resolve) => { resolveFirst = resolve; });

function elapsed(now = performance.now()) {
  return Math.min(BENCH_MS, activeMs + (benchState === 'running' ? now - resumedAt : 0));
}

// The feed is virtual: a handful of recycled rows slide over a tall spacer, so
// thousands of names scroll and click as cheaply as ten.
function renderFeed() {
  feedDirty = false;
  const needed = Math.ceil(bench.feed.clientHeight / ROW_HEIGHT) + 2;
  while (rows.length < needed) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bench-row';
    const name = document.createElement('span');
    const hash = document.createElement('code');
    button.append(name, hash);
    bench.space.append(button);
    rows.push({ button, name, hash });
  }
  bench.space.style.height = `${names.length * ROW_HEIGHT}px`;
  const first = Math.floor(bench.feed.scrollTop / ROW_HEIGHT);
  rows.forEach((row, offset) => {
    const position = first + offset;
    const index = names.length - 1 - position;
    row.button.hidden = index < 0;
    if (index < 0) return;
    row.button.style.transform = `translateY(${position * ROW_HEIGHT}px)`;
    row.button.dataset.index = index;
    row.name.textContent = names[index];
    row.hash.textContent = hashes[index];
    row.button.classList.toggle('selected', selected < 0 ? position === 0 : index === selected);
  });
}

function paintBench(now) {
  raf = 0;
  const ms = elapsed(now);
  bench.count.textContent = format(names.length);
  bench.time.textContent = (ms / 1000).toFixed(2);
  if (benchState !== 'done') {
    bench.rate.textContent = ms > 100 ? format((names.length * 1000) / ms) : '0';
    bench.avg.textContent = names.length ? perHoley(ms / names.length) : '–';
  }
  // The timeline doubles as the progress bar: filled up to the time spent.
  bench.slider.style.setProperty('--done', `${(ms / BENCH_MS) * 100}%`);
  if (latestSvg && selected < 0 && (!reduceMotion || now - lastPaint > 250)) {
    lastPaint = now;
    bench.avatar.innerHTML = latestSvg;
    latestSvg = '';
    bench.name.textContent = names[names.length - 1];
    bench.hash.textContent = hashes[hashes.length - 1];
  }
  if (names.length !== shownCount) {
    // Keep a scrolled feed still while new names land on top.
    if (bench.feed.scrollTop > 0) bench.feed.scrollTop += (names.length - shownCount) * ROW_HEIGHT;
    shownCount = names.length;
    bench.slider.disabled = names.length === 0;
    feedDirty = true;
  }
  if (selected < 0) bench.slider.value = ms;
  const shown = selected < 0 ? names.length - 1 : selected;
  bench.position.textContent = shown >= 0 ? `${(Number(bench.slider.value) / 1000).toFixed(3)} s · #${format(shown + 1)}` : '0.000 s';
  if (feedDirty) renderFeed();
  if (benchState === 'running') raf = requestAnimationFrame(paintBench);
}
function requestPaint() {
  if (!raf) raf = requestAnimationFrame(paintBench);
}

function setBenchState(state) {
  benchState = state;
  bench.run.disabled = state === 'idle';
  bench.run.textContent = { idle: 'Starting…', running: 'Pause ❚❚', paused: 'Resume ▶', done: 'Run again ↻' }[state];
}

function finishBench(ms) {
  if (!benchWorker) return;
  benchWorker.terminate();
  benchWorker = null;
  activeMs = BENCH_MS;
  setBenchState('done');
  const seconds = Math.max(ms, 1) / 1000;
  bench.rate.textContent = format(names.length / seconds);
  bench.avg.textContent = names.length ? perHoley((seconds * 1000) / names.length) : '–';
  bench.summary.textContent = `${format(names.length)} holeys in ${seconds.toFixed(2)} s, ${bench.avg.textContent} each.`;
  cancelAnimationFrame(raf);
  paintBench(performance.now());
  resolveFirst();
}

function startBench() {
  benchWorker?.terminate();
  names.length = 0;
  hashes.length = 0;
  times.length = 0;
  selected = -1;
  activeMs = 0;
  latestSvg = '';
  shownCount = -1;
  bench.feed.scrollTop = 0;
  bench.summary.textContent = '';
  bench.redraw.textContent = '';
  setBenchState('idle');
  let worker;
  try {
    worker = new Worker(new URL('./bench-worker.js', import.meta.url), { type: 'module' });
  } catch {
    bench.summary.textContent = 'This browser cannot run the live demo.';
    resolveFirst();
    return;
  }
  benchWorker = worker;
  worker.onmessage = ({ data }) => {
    if (worker !== benchWorker) return;
    if (data.type === 'ready') {
      resumedAt = performance.now();
      setBenchState('running');
      worker.postMessage({ type: 'start', duration: BENCH_MS });
      requestPaint();
      return;
    }
    names.push(...data.names);
    hashes.push(...data.hashes);
    times.push(...data.times);
    if (selected < 0) latestSvg = data.svg;
    requestPaint();
    if (data.type === 'done') finishBench(data.active);
  };
  worker.onerror = () => finishBench(elapsed());
  requestPaint();
}

function pauseBench() {
  if (benchState !== 'running') return;
  activeMs = elapsed();
  setBenchState('paused');
  benchWorker.postMessage({ type: 'pause' });
  requestPaint();
}

function resumeBench() {
  selected = -1;
  bench.redraw.textContent = '';
  bench.feed.scrollTop = 0;
  feedDirty = true;
  resumedAt = performance.now();
  setBenchState('running');
  benchWorker.postMessage({ type: 'resume' });
  requestPaint();
}

function selectHoley(index, { scroll = true, time } = {}) {
  if (!names.length) return;
  index = Math.max(0, Math.min(names.length - 1, index));
  pauseBench();
  selected = index;
  bench.slider.value = time ?? times[index];
  const username = names[index];
  bench.name.textContent = username;
  bench.hash.textContent = hashes[index];
  if (scroll) {
    const top = (names.length - 1 - index) * ROW_HEIGHT;
    if (top < bench.feed.scrollTop || top + ROW_HEIGHT > bench.feed.scrollTop + bench.feed.clientHeight) {
      bench.feed.scrollTop = top - (bench.feed.clientHeight - ROW_HEIGHT) / 2;
    }
  }
  feedDirty = true;
  requestPaint();
  const started = performance.now();
  drawPick({ ...seededHoleyOptions(username, false), doodle: true, idPrefix: 'bench-pick' }, ({ svg }) => {
    if (selected !== index) return;
    bench.avatar.innerHTML = svg;
    bench.redraw.textContent = `Redrawn from the name in ${(performance.now() - started).toFixed(1)} ms`;
  });
}

bench.run.addEventListener('click', () => {
  if (benchState === 'running') pauseBench();
  else if (benchState === 'paused') resumeBench();
  else if (benchState === 'done') startBench();
});
// Picks the last holey finished at or before the chosen moment.
function holeyAt(ms) {
  let low = 0, high = times.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (times[middle] <= ms) low = middle + 1;
    else high = middle;
  }
  return Math.max(0, low - 1);
}
bench.slider.addEventListener('input', () => {
  const ms = Math.min(Number(bench.slider.value), elapsed());
  selectHoley(holeyAt(ms), { time: ms });
});
bench.feed.addEventListener('click', (event) => {
  const row = event.target.closest('.bench-row');
  if (row) selectHoley(Number(row.dataset.index), { scroll: false });
});
bench.feed.addEventListener('scroll', () => { feedDirty = true; requestPaint(); }, { passive: true });
addEventListener('resize', () => { feedDirty = true; requestPaint(); });
startBench();
// Each shape's outline is compiled the first time it is drawn, so do that up
// front to keep clicks and keystrokes at their steady-state speed.
shapes.forEach(({ key }) => renderDemo({ shape: key, doodle: true }));

// Type anything: hashed on the spot, drawn in a worker, timed end to end.
const liveInput = byId('live-input');
const liveAvatar = byId('live-avatar');
function updateLive() {
  const started = performance.now();
  const value = liveInput.value;
  byId('live-hash').textContent = identityHash(value);
  drawLive({ ...seededHoleyOptions(value, false), doodle: true, idPrefix: 'live' }, ({ svg }) => {
    liveAvatar.innerHTML = svg;
    liveAvatar.classList.add('ready');
    byId('live-ms').textContent = `${(performance.now() - started).toFixed(1)} ms`;
  });
}
liveInput.addEventListener('input', updateLive);
updateLive();
const doodle = { doodle: true, animated: false };

function paint(avatar, svg) {
  avatar.innerHTML = svg;
  avatar.classList.add('ready');
}

// Gallery avatars wait for the first bench so they do not compete for cores.
function fill(avatar, options) {
  return firstBench
    .then(() => renderGallery({ ...doodle, ...options }))
    .then(({ svg }) => paint(avatar, svg));
}

function cell(container, caption, className = 'cell') {
  const figure = document.createElement('figure');
  figure.className = className;
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  figure.append(avatar);
  if (caption !== undefined) {
    const label = document.createElement('figcaption');
    label.textContent = caption;
    figure.append(label);
  }
  container.append(figure);
  return avatar;
}

// Make yours: every control writes into one options object and redraws.
const customAvatar = byId('custom-avatar');
const platformAvatars = [...document.querySelectorAll('[data-platform]')];
const holes = byId('custom-holes');
const hexInput = byId('custom-color');
const pickerArea = byId('picker-area');
const pickerHue = byId('picker-hue');
const defaults = () => ({ shape: 'disc', color: '#6337FF', holes: 5, seed: 2, doodle: true });
let customOptions = defaults();
let customSvg = '';
let hsv = { h: 0, s: 0, v: 0 };
const drawCustom = latestOnly(renderHero);
const drawPlatforms = latestOnly((options) => Promise.all(platformAvatars.map((avatar) =>
  renderGallery({ ...options, doodle: false, animated: false, idPrefix: `platform-${avatar.dataset.platform}` }))));

const jsLiteral = (value) => JSON.stringify(value);
const camel = (key) => key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

function hsvToHex({ h, s, v }) {
  const channel = (n) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return `#${[5, 3, 1].map((n) => channel(n).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}
function hexToHsv(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), delta = max - Math.min(r, g, b);
  let h = 0;
  if (delta) h = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: (h * 60 + 360) % 360, s: max ? delta / max : 0, v: max };
}

function updateCode() {
  const options = customOptions;
  const shape = camel(options.shape);
  const web = `import { mountHoleyShape } from 'holey-shapes';

mountHoleyShape('#avatar', {
  shape: ${jsLiteral(options.shape)}, color: ${jsLiteral(options.color)},
  holes: ${options.holes}, seed: ${options.seed}, doodle: ${options.doodle}
});`;
  const swift = `import HoleyShapes

HoleyShapeView(
  .${shape}, faceColor: HoleyColor(hex: ${jsLiteral(options.color)}),
  holes: ${options.holes}, seed: ${options.seed}
)`;
  const compose = `import com.aakashreddy.holeyshapes.*
import androidx.compose.ui.graphics.Color

HoleyShapeView(config = HoleyShapeConfig(
  shape = HoleyShape.${shape[0].toUpperCase() + shape.slice(1)},
  faceColor = Color(0xFF${options.color.slice(1)}),
  holes = ${options.holes}, seed = ${options.seed}
))`;
  for (const [platform, code] of Object.entries({ web, swift, compose })) {
    byId(`code-${platform}`).innerHTML = highlight(code);
  }
  const isWeb = byId('live-tab-web').getAttribute('aria-selected') === 'true';
  byId('code-note').textContent = isWeb ? 'Add <div id="avatar"></div> to your page.' : options.doodle ? 'Native SDKs use the solid style.' : 'Ready to use in your app.';
  byId('copy-status').textContent = '';
  byId('copy-code').textContent = 'Copy code';
}

function updateCustom() {
  byId('holes-value').value = customOptions.holes;
  holes.value = customOptions.holes;
  document.querySelectorAll('[data-shape]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.shape === customOptions.shape)));
  document.querySelectorAll('[data-style]').forEach((button) => button.setAttribute('aria-pressed', String((button.dataset.style === 'doodle') === customOptions.doodle)));
  updateCode();
  const options = { ...customOptions };
  drawCustom({ ...options, idPrefix: 'custom' }, ({ svg }) => {
    customSvg = svg;
    paint(customAvatar, svg);
  });
  drawPlatforms(options, (results) => platformAvatars.forEach((avatar, index) => paint(avatar, results[index].svg)));
}

// Color picker: a saturation/brightness square, a hue bar and a hex field all
// edit the same HSV value, so every color is reachable.
function showColor(hex, { keepHex = false } = {}) {
  customOptions.color = hex;
  pickerArea.style.setProperty('--hue', `hsl(${hsv.h} 100% 50%)`);
  pickerArea.style.setProperty('--x', `${hsv.s * 100}%`);
  pickerArea.style.setProperty('--y', `${(1 - hsv.v) * 100}%`);
  pickerArea.setAttribute('aria-valuetext', hex);
  pickerHue.value = Math.round(hsv.h);
  byId('picker-chip').style.background = hex;
  byId('picker-thumb').style.background = hex;
  if (!keepHex) hexInput.value = hex;
  hexInput.removeAttribute('aria-invalid');
  document.querySelectorAll('[data-color]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.color === hex)));
}
function setHex(hex) {
  hsv = hexToHsv(hex);
  showColor(hex);
  updateCustom();
}
function setHsv(next) {
  hsv = { ...hsv, ...next };
  showColor(hsvToHex(hsv));
  updateCustom();
}
function pickAt(event) {
  const box = pickerArea.getBoundingClientRect();
  const clamp = (value) => Math.max(0, Math.min(1, value));
  setHsv({ s: clamp((event.clientX - box.left) / box.width), v: 1 - clamp((event.clientY - box.top) / box.height) });
}
pickerArea.addEventListener('pointerdown', (event) => {
  pickerArea.setPointerCapture(event.pointerId);
  pickAt(event);
});
pickerArea.addEventListener('pointermove', (event) => {
  if (pickerArea.hasPointerCapture(event.pointerId)) pickAt(event);
});
pickerArea.addEventListener('keydown', (event) => {
  const step = event.shiftKey ? 0.1 : 0.02;
  const moves = { ArrowLeft: ['s', -step], ArrowRight: ['s', step], ArrowUp: ['v', step], ArrowDown: ['v', -step] };
  const move = moves[event.key];
  if (!move) return;
  event.preventDefault();
  setHsv({ [move[0]]: Math.max(0, Math.min(1, hsv[move[0]] + move[1])) });
});
pickerHue.addEventListener('input', () => setHsv({ h: Number(pickerHue.value) }));
hexInput.addEventListener('input', () => {
  const value = hexInput.value.trim().replace(/^#?/, '#').toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(value)) {
    hexInput.setAttribute('aria-invalid', 'true');
    return;
  }
  hsv = hexToHsv(value);
  showColor(value, { keepHex: true });
  updateCustom();
});
hexInput.addEventListener('blur', () => { hexInput.value = customOptions.color; hexInput.removeAttribute('aria-invalid'); });

const presets = [...new Set([...shapes.map((shape) => shape.color.toUpperCase()), '#25262A', '#FFFFFF'])];
for (const hex of presets) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.color = hex;
  button.style.setProperty('--swatch', hex);
  button.setAttribute('aria-label', hex);
  button.title = hex;
  button.addEventListener('click', () => setHex(hex));
  byId('color-swatches').append(button);
}

for (const shape of shapes) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.shape = shape.key;
  button.title = shape.name;
  button.setAttribute('aria-label', shape.name);
  const avatar = document.createElement('span');
  avatar.className = 'choice-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'choice-name';
  label.textContent = shape.key.replaceAll('-', ' ');
  button.append(avatar, label);
  button.addEventListener('click', () => {
    customOptions.shape = shape.key;
    setHex(shape.color.toUpperCase());
  });
  byId('shape-choices').append(button);
  fill(avatar, { shape: shape.key, seed: 2, idPrefix: `choice-${shape.key}` });
}

holes.addEventListener('input', () => { customOptions.holes = Number(holes.value); updateCustom(); });
byId('customize-panel').addEventListener('submit', (event) => event.preventDefault());
for (const button of document.querySelectorAll('[data-style]')) {
  button.addEventListener('click', () => { customOptions.doodle = button.dataset.style === 'doodle'; updateCustom(); });
}
byId('shuffle-layout').addEventListener('click', () => {
  customOptions.seed = customOptions.seed === 1000000 ? -1000000 : customOptions.seed + 1;
  updateCustom();
});
byId('reset-custom').addEventListener('click', () => {
  customOptions = defaults();
  setHex(customOptions.color);
});
for (const eventName of ['click', 'keydown']) {
  document.querySelector('.integration [role="tablist"]').addEventListener(eventName, updateCode);
}
byId('copy-code').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(document.querySelector('.integration [role="tabpanel"]:not([hidden])').textContent);
    byId('copy-code').textContent = 'Copied!';
    byId('copy-status').textContent = 'Code copied.';
  } catch { byId('copy-status').textContent = 'Select the code and copy it with your keyboard.'; }
});
byId('copy-svg').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(customSvg);
    byId('export-status').textContent = 'SVG copied.';
  } catch { byId('export-status').textContent = 'Use Download SVG to save your avatar.'; }
});
byId('download-svg').addEventListener('click', () => {
  if (!customSvg) return;
  const url = URL.createObjectURL(new Blob([customSvg], { type: 'image/svg+xml' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `holey-${customOptions.shape}.svg`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
setHex(customOptions.color);

// Shapes
const shapeGrid = document.getElementById('shapes');
shapes.forEach((shape, index) => {
  fill(cell(shapeGrid, shape.key), { shape: shape.key, seed: index + 3, idPrefix: `shape-${shape.key}` });
});

// Holes
const holeGrid = document.getElementById('holes');
for (let count = 0; count <= 8; count++) {
  fill(cell(holeGrid, String(count)), { shape: 'round-block', holes: count, seed: 3, idPrefix: `holes-${count}` });
}

// People
const people = [
  ['Ada Lovelace', 'ada'], ['Alan Turing', 'alan'], ['Grace Hopper', 'grace'],
  ['Linus Torvalds', 'linus'], ['Margaret Hamilton', 'margaret'], ['Dennis Ritchie', 'dennis'],
  ['Barbara Liskov', 'barbara'], ['Ken Thompson', 'ken'], ['Radia Perlman', 'radia'],
];
const peopleList = document.getElementById('people');
for (const [name, handle] of people) {
  const row = document.createElement('li');
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  const text = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = name;
  const span = document.createElement('span');
  span.textContent = `@${handle}`;
  text.append(strong, span);
  row.append(avatar, text);
  peopleList.append(row);
  fill(avatar, { ...seededHoleyOptions(handle, false), idPrefix: `person-${handle}` });
}

// Styles
const styleGrid = document.getElementById('styles');
const styleBase = { shape: 'flower-star', holes: 5, seed: 2 };
fill(cell(styleGrid, 'doodle'), { ...styleBase, idPrefix: 'style-doodle' });
fill(cell(styleGrid, 'solid'), { ...styleBase, doodle: false, idPrefix: 'style-solid' });
fill(cell(styleGrid, 'any color'), { ...styleBase, color: '#FFD43B', idPrefix: 'style-color' });

// Sizes
const sizeRow = document.getElementById('sizes');
for (const size of [16, 24, 32, 48, 64, 96]) {
  const avatar = cell(sizeRow, `${size}`, 'size');
  avatar.style.width = avatar.style.height = `${size}px`;
  fill(avatar, { shape: 'disc', holes: 4, seed: 5, idPrefix: `size-${size}` });
}

