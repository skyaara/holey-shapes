import { createHoleySvg, identityHash, seededHoleyOptions, shapes } from '../../packages/js/index.js';
import './chrome.js';
import { handleFromPath, normalizeHandle, shareOnX, shareUrl, validHandle } from './handle.js';
import { highlight } from './highlight.js';

// Packing a new layout can take tens of milliseconds, so SVGs are built in
// workers. Each area gets its own worker so typing never waits on the gallery.
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

const renderIdentity = createRenderer();
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

const byId = (id) => document.getElementById(id);
const format = (value) => Math.round(value).toLocaleString('en-US');
const duration = (ms) => (ms < 1 ? `${Math.max(1, Math.round(ms * 1000))} µs` : `${ms.toFixed(ms < 10 ? 2 : 1)} ms`);
const solid = (options) => ({ animated: false, ...options, doodle: false });

function paint(avatar, svg) {
  avatar.innerHTML = svg;
  avatar.classList.add('ready');
}

// Bench: one worker makes avatars for one second, the same single thread an
// app would use. The page shows the newest one each frame and keeps every name,
// so any of them can be redrawn later from the name alone.
const BENCH_MS = 1000;
const ROW_HEIGHT = 30;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const bench = {
  count: byId('bench-count'), avg: byId('bench-avg'), rate: byId('bench-rate'), time: byId('bench-time'),
  run: byId('bench-run'), summary: byId('bench-summary'), avatar: byId('bench-avatar'),
  name: byId('bench-name'), hash: byId('bench-hash'), redraw: byId('bench-redraw'),
  feed: byId('bench-feed'), space: byId('bench-feed-space'), slider: byId('bench-slider'), position: byId('bench-position'),
};
const drawPick = latestOnly(renderDemo);
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
// Everything below the hero waits for the first bench, finished or paused, so
// it does not compete for cores while the bench is measuring.
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
    bench.avg.textContent = names.length ? duration(ms / names.length) : '–';
  }
  // The timeline doubles as the progress bar: filled up to the time spent.
  bench.slider.style.setProperty('--done', `${(ms / BENCH_MS) * 100}%`);
  if (latestSvg && selected < 0 && (!reduceMotion || now - lastPaint > 250)) {
    lastPaint = now;
    paint(bench.avatar, latestSvg);
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
  bench.run.dataset.state = state;
  bench.run.textContent = { idle: 'Starting…', running: 'Pause', paused: 'Resume', done: 'Run again' }[state];
}

function finishBench(ms) {
  if (!benchWorker) return;
  benchWorker.terminate();
  benchWorker = null;
  activeMs = BENCH_MS;
  setBenchState('done');
  const seconds = Math.max(ms, 1) / 1000;
  bench.rate.textContent = format(names.length / seconds);
  bench.avg.textContent = names.length ? duration((seconds * 1000) / names.length) : '–';
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
  resolveFirst();
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
  drawPick(solid({ ...seededHoleyOptions(username, false), idPrefix: 'bench-pick' }), ({ svg }) => {
    if (selected !== index) return;
    paint(bench.avatar, svg);
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

// Gallery avatars render as they approach the viewport, after the first bench.
const pendingFills = new Map();
const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      pendingFills.get(entry.target)?.();
      pendingFills.delete(entry.target);
    }
  }, { rootMargin: '600px 0px' })
  : null;
function fill(avatar, options) {
  const job = () => firstBench.then(() => renderGallery(options)).then(({ svg }) => paint(avatar, svg));
  if (!observer) return void job();
  pendingFills.set(avatar, job);
  observer.observe(avatar);
}

function avatarElement(className = 'avatar') {
  const avatar = document.createElement('div');
  avatar.className = className;
  return avatar;
}

// Identity: one name drives the hash flow, the devices and the steps, so
// every section tells the same story.
const idInput = byId('id-input');
const deviceAvatars = [...document.querySelectorAll('[data-device]')];
const drawIdentity = latestOnly((options) => Promise.all(options.map(renderIdentity)));
const hashMarkup = (hash) => hash.match(/.{4}/g).map((group) => `<span>${group}</span>`).join('');

// The same name with its last character nudged, for the "one letter off" pair.
function oneLetterOff(name) {
  const characters = Array.from(name);
  const last = characters.pop() ?? '';
  const next = /[a-yA-Y0-8]/.test(last) ? String.fromCharCode(last.charCodeAt(0) + 1)
    : last === 'z' ? 'a' : last === 'Z' ? 'A' : last === '9' ? '0' : `${last}a`;
  return characters.join('') + next;
}

function outlineSvg(shape, inner = '') {
  return `<svg viewBox="-4 -4 428 428" aria-hidden="true"><path d="${shape.path}" fill="none" stroke="${shape.color}" stroke-width="5" stroke-linejoin="round" stroke-dasharray="16 12"/>${inner}</svg>`;
}

function updateIdentity() {
  const name = normalizeHandle(idInput.value);
  updateShare(name);
  const other = oneLetterOff(name);
  const hash = identityHash(name);
  const seeded = seededHoleyOptions(name, false);
  const shape = shapes.find((entry) => entry.key === seeded.shape);
  byId('id-hash').innerHTML = hashMarkup(hash);
  byId('id-meta').textContent = `${seeded.shape} · seed ${seeded.seed}`;
  byId('cmp-a-name').textContent = name || '""';
  byId('cmp-b-name').textContent = other;
  document.querySelectorAll('[data-name]').forEach((label) => { label.textContent = name; });
  byId('how-hash-name').textContent = JSON.stringify(name);
  byId('how-hash').innerHTML = hashMarkup(hash);
  byId('how-outline').innerHTML = outlineSvg(shape);
  const base = solid(seeded);
  drawIdentity([
    { ...base, idPrefix: 'id' },
    { ...base, idPrefix: 'cmp-a' },
    solid({ ...seededHoleyOptions(other, false), idPrefix: 'cmp-b' }),
    { ...base, idPrefix: 'how-cut' },
    ...deviceAvatars.map((avatar) => ({ ...base, idPrefix: `device-${avatar.dataset.device}` })),
  ], ([main, a, b, cut, ...devices]) => {
    paint(byId('id-avatar'), main.svg);
    paint(byId('cmp-a'), a.svg);
    paint(byId('cmp-b'), b.svg);
    paint(byId('how-cut'), cut.svg);
    devices.forEach((result, index) => paint(deviceAvatars[index], result.svg));
    // Step 3 traces the real packed holes from the finished SVG.
    const holes = (cut.svg.match(/<ellipse[^>]*\/>/g) || []).join('');
    byId('how-pack').innerHTML = outlineSvg(shape, `<g fill="none" stroke="currentColor" stroke-width="4">${holes}</g>`);
  });
}
idInput.addEventListener('input', updateIdentity);
firstBench.then(updateIdentity);

// Share links: every handle has a page at /@handle whose preview card on X
// shows that holey, so a posted link carries the avatar with it.
async function copyLink(button, handle) {
  try {
    await navigator.clipboard.writeText(shareUrl(handle));
    button.textContent = 'Copied';
  } catch {
    button.textContent = 'Press ⌘C';
  }
  setTimeout(() => { button.textContent = 'Copy link'; }, 1400);
}
let sharedHandle = '';
function updateShare(handle) {
  const ok = validHandle(handle);
  sharedHandle = ok ? handle : '';
  byId('share-row').classList.toggle('invalid', !ok);
  byId('share-url').textContent = ok ? shareUrl(handle).replace(/^https:\/\//, '') : 'letters, numbers, _ . - (up to 32)';
  byId('copy-link').disabled = !ok;
  byId('share-x').href = ok ? shareOnX(handle, 'My holey, made from my handle.') : 'https://x.com/intent/post';
}
byId('copy-link').addEventListener('click', (event) => sharedHandle && copyLink(event.currentTarget, sharedHandle));
byId('share-x').addEventListener('click', (event) => { if (!sharedHandle) event.preventDefault(); });

// A visit to /@handle (or ?name=handle) leads with that person's holey.
const visiting = handleFromPath(location.pathname) || (() => {
  const handle = normalizeHandle(new URLSearchParams(location.search).get('name'));
  return validHandle(handle) ? handle : '';
})();
if (visiting) {
  idInput.value = visiting;
  document.body.classList.add('personal');
  document.title = `@${visiting}'s holey · holey-shapes`;
  byId('hero-default').hidden = true;
  byId('me').hidden = false;
  byId('me-name').textContent = `@${visiting}`;
  byId('me-hash').innerHTML = hashMarkup(identityHash(visiting));
  byId('me-avatar').setAttribute('aria-label', `@${visiting}'s holey`);
  byId('me-share').href = shareOnX(visiting, `@${visiting}'s holey.`);
  byId('me-copy').addEventListener('click', (event) => copyLink(event.currentTarget, visiting));
  renderIdentity({ ...seededHoleyOptions(visiting, true), idPrefix: 'me' }).then(({ svg }) => paint(byId('me-avatar'), svg));
}
updateShare(normalizeHandle(idInput.value));

// Endless: the full catalog. Clicking a tile shuffles its layout.
const shapeGrid = byId('shape-grid');
shapes.forEach((shape, index) => {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'shape-tile';
  tile.setAttribute('aria-label', `${shape.name}, shuffle its holes`);
  const avatar = avatarElement();
  const label = document.createElement('span');
  label.className = 'shape-tile-name';
  label.textContent = shape.key;
  tile.append(avatar, label);
  shapeGrid.append(tile);
  let seed = index + 3;
  const options = () => ({ shape: shape.key, seed, animated: true, idPrefix: `shape-${shape.key}-${seed}` });
  fill(avatar, options());
  tile.addEventListener('click', () => {
    seed += 1;
    renderGallery(options()).then(({ svg }) => paint(avatar, svg));
  });
});

// Crowd: people and bots, every face seeded from its name. Holes animate on hover.
const crowd = ['ada', 'grace', 'linus', 'alan', 'radia', 'ken', 'barbara', 'bugbot', 'guido', 'hedy', 'tim', 'vint',
  'margaret', 'dennis', 'planner', 'sophie', 'katherine', 'edsger', 'donald', 'frances', 'deploy-bot', 'john', 'leslie',
  'yukihiro', 'rasmus', 'bjarne', 'explore', 'anders', 'brendan', 'lynn', 'mary', 'jean', 'main-agent', 'annie',
  'mango', 'pixel-otter', 'reviewer', 'comet', 'fern', 'noodle', 'kite', 'scout'];
for (const name of crowd) {
  const item = document.createElement('li');
  const avatar = avatarElement();
  const label = document.createElement('span');
  label.textContent = name;
  item.append(avatar, label);
  byId('crowd').append(item);
  fill(avatar, { ...seededHoleyOptions(name, true), idPrefix: `crowd-${name}` });
}

// Closing: a few friendly faces that animate on hover.
['ada', 'grace', 'linus', 'alan', 'radia'].forEach((name) => {
  const a = avatarElement();
  byId('closing-avatars').append(a);
  fill(a, { ...seededHoleyOptions(name, true), idPrefix: `closing-${name}` });
});

// Playground: every control writes into one options object and redraws.
const customAvatar = byId('custom-avatar');
const holes = byId('custom-holes');
const hexInput = byId('custom-color');
const pickerArea = byId('picker-area');
const pickerHue = byId('picker-hue');
const defaults = () => ({ shape: 'prism', color: '#FF6A00', holes: 5, seed: 2, doodle: false });
let customOptions = defaults();
let customSvg = '';
let hsv = { h: 0, s: 0, v: 0 };
const drawCustom = latestOnly(renderIdentity);

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
  byId('code-note').textContent = isWeb ? 'Add <div id="avatar"></div> to your page' : options.doodle ? 'Native SDKs draw the solid style' : '';
}

function updateCustom() {
  byId('holes-value').value = customOptions.holes;
  holes.value = customOptions.holes;
  document.querySelectorAll('[data-shape]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.shape === customOptions.shape)));
  document.querySelectorAll('[data-style]').forEach((button) => button.setAttribute('aria-pressed', String((button.dataset.style === 'doodle') === customOptions.doodle)));
  updateCode();
  drawCustom({ ...customOptions, idPrefix: 'custom' }, ({ svg }) => {
    customSvg = svg;
    paint(customAvatar, svg);
  });
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
  const avatar = avatarElement('choice-avatar');
  avatar.setAttribute('aria-hidden', 'true');
  button.append(avatar);
  button.addEventListener('click', () => {
    customOptions.shape = shape.key;
    setHex(shape.color.toUpperCase());
  });
  byId('shape-choices').append(button);
  fill(avatar, solid({ shape: shape.key, seed: 2, shadowX: 10, shadowY: 12, idPrefix: `choice-${shape.key}` }));
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
document.querySelector('.play-code [role="tablist"]').addEventListener('click', updateCode);
document.querySelector('.play-code [role="tablist"]').addEventListener('keydown', updateCode);

// Copy buttons copy whichever code panel is showing next to them.
for (const button of document.querySelectorAll('[data-copy-panel]')) {
  button.addEventListener('click', async () => {
    const panel = button.closest('.code-card, .play-code').querySelector('[role="tabpanel"]:not([hidden])');
    try {
      await navigator.clipboard.writeText(panel.textContent);
      button.textContent = 'Copied';
      byId('copy-status').textContent = 'Code copied.';
    } catch {
      byId('copy-status').textContent = 'Select the code and copy it with your keyboard.';
    }
    setTimeout(() => { button.textContent = 'Copy'; }, 1400);
  });
}
byId('copy-svg').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(customSvg);
    byId('export-status').textContent = 'SVG copied to the clipboard.';
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
hsv = hexToHsv(customOptions.color);
showColor(customOptions.color);
updateCode();
firstBench.then(updateCustom);
