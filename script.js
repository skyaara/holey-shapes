const h = (cx, cy, rx, ry, rotate = 0) => ({ cx, cy, rx, ry, rotate });

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const root = isBrowser ? document.documentElement : null;
const isHoleyApp = root?.hasAttribute('data-holey-app');
const themeToggle = isHoleyApp ? document.querySelector('.theme-toggle') : null;
const themeLabel = themeToggle?.querySelector('.theme-label');

function applyTheme(theme) {
  if (!themeToggle || !themeLabel) return;
  const isDark = theme === 'dark';
  root.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
  themeLabel.textContent = isDark ? 'LIGHT' : 'DARK';
}

if (themeToggle) {
  const savedTheme = localStorage.getItem('holey-theme');
  const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initialTheme);
  themeToggle.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem('holey-theme', nextTheme);
  });
}

const installButton = isHoleyApp ? document.querySelector('.install-command') : null;

if (installButton) {
  installButton.addEventListener('click', async () => {
    const label = installButton.querySelector('.install-copy-label');
    try {
      await navigator.clipboard.writeText('npm install holey-shapes');
      if (label) label.textContent = 'COPIED';
      window.setTimeout(() => {
        if (label) label.textContent = 'COPY';
      }, 1400);
    } catch {
      if (label) label.textContent = 'SELECT';
      window.getSelection()?.selectAllChildren(installButton.querySelector('code'));
    }
  });
}

export const shapes = [
  {
    key: 'disc', name: 'Perforated disc', color: '#6337FF', bg: '#D7CEFF', initial: 5,
    path: 'M210 38A164 164 0 1 1 209.9 38Z',
    holes: [h(138,112,19,27,-24),h(247,95,24,16,12),h(310,178,17,25,25),h(285,280,20,29,32),h(166,312,25,17,8),h(93,225,16,24,-8),h(196,177,18,25,18),h(245,224,22,15,-18),h(145,236,16,21,30),h(211,285,15,20,-12),h(293,231,13,18,10),h(108,169,13,18,22)]
  },
  {
    key: 'round-block', name: 'Round block', color: '#9BED00', bg: '#E7FF92', initial: 4,
    path: 'M121 54H299Q365 54 365 120V298Q365 364 299 364H121Q55 364 55 298V120Q55 54 121 54Z',
    holes: [h(123,116,23,17,-16),h(211,105,16,23,5),h(300,125,22,16,16),h(101,207,16,23,-4),h(190,190,23,16,22),h(292,211,17,25,12),h(125,300,22,16,-18),h(218,293,16,23,0),h(306,295,21,15,13),h(153,158,13,18,21),h(249,151,15,20,-14),h(245,246,13,18,8)]
  },
  {
    key: 'hex', name: 'Hex slab', color: '#FF0878', bg: '#FFD6E4', initial: 5,
    path: 'M210 36 353 119 353 285 210 368 67 285 67 119Z',
    holes: [h(207,91,15,22),h(287,140,23,15,18),h(314,226,16,23,8),h(260,304,18,25,24),h(157,305,23,16,-15),h(101,229,16,23,-8),h(123,146,17,24,16),h(204,162,20,14,-12),h(244,231,16,22,22),h(159,237,20,14,9),h(210,274,12,17,-5)]
  },
  {
    key: 'capsule', name: 'Capsule', color: '#2878FF', bg: '#CCEDFF', initial: 4,
    path: 'M129 112H291A95 95 0 0 1 291 302H129A95 95 0 0 1 129 112Z',
    holes: [h(91,205,15,23),h(150,164,23,15,-12),h(218,211,16,24,8),h(291,165,21,15,10),h(335,222,15,22,-8),h(145,252,21,14,17),h(262,260,22,15,-14),h(206,154,12,17,5)]
  },
  {
    key: 'prism', name: 'Cut prism', color: '#FF6A00', bg: '#FFD4A3', initial: 4,
    path: 'M210 34 370 164 309 358 111 358 50 164Z',
    holes: [h(145,129,20,15,-18),h(244,108,15,21,10),h(309,173,20,15,20),h(284,270,16,23,17),h(211,317,22,15),h(130,278,16,22,-18),h(100,188,20,15,-12),h(197,186,15,22,8),h(237,245,20,14,18),h(151,218,13,18,-5)]
  },
  {
    key: 'cross', name: 'Cross block', color: '#00DBFF', bg: '#D8D5CF', initial: 5,
    path: 'M151 36H269V151H384V269H269V384H151V269H36V151H151Z',
    holes: [h(210,86,15,22),h(210,135,13,18),h(327,210,22,15),h(278,210,18,13),h(210,334,15,22),h(210,285,13,18),h(91,210,22,15),h(140,210,18,13),h(210,210,21,21)]
  },
  {
    key: 'triangle', name: 'Triangle plate', color: '#00D69F', bg: '#B9F4DF', initial: 4,
    path: 'M210 38 382 356H38Z',
    holes: [h(210,103,14,20),h(170,170,18,13,-15),h(252,172,18,13,15),h(127,257,16,22,-10),h(210,248,21,15),h(294,257,16,22,10),h(89,323,18,13),h(210,319,17,12),h(330,323,18,13)]
  },
  {
    key: 'diamond', name: 'Diamond tile', color: '#FFD000', bg: '#FFF0A6', initial: 5,
    path: 'M210 28 392 210 210 392 28 210Z',
    holes: [h(210,83,16,22),h(142,142,20,14,-18),h(278,142,20,14,18),h(85,210,15,21),h(210,210,22,16),h(335,210,15,21),h(143,279,20,14,18),h(277,279,20,14,-18),h(210,337,16,22),h(210,145,12,17)]
  },
  {
    key: 'sunburst', name: 'Sunburst slab', color: '#B94CFF', bg: '#E6D4FA', initial: 5,
    path: 'M210 28 246 78 306 50 315 112 379 113 352 171 402 208 349 244 377 303 313 304 302 368 245 338 207 390 171 339 110 368 105 304 41 300 69 243 18 207 71 172 43 112 107 111 118 49 173 78Z',
    holes: [h(210,91,16,22),h(143,126,19,14,-18),h(278,126,19,14,18),h(103,197,15,22),h(210,183,21,15),h(317,197,15,22),h(112,291,18,24,-8),h(210,278,22,15),h(307,291,18,24,8),h(162,224,12,17,15)]
  },
  {
    key: 'octagon', name: 'Octagon', color: '#FF3838', bg: '#FFD0C8', initial: 6,
    path: 'M130 40H290L380 130V290L290 380H130L40 290V130Z',
    holes: [h(137,96,19,14,-15),h(229,87,14,20),h(313,131,19,14,18),h(328,221,14,20),h(298,310,19,14,-18),h(207,332,14,20),h(116,306,19,14,15),h(82,216,14,20),h(119,153,14,19,-8),h(208,164,20,14,12),h(271,231,15,21,18),h(171,257,20,14,-14)]
  },
  {
    key: 'chevron', name: 'Bent chevron', color: '#00C9F2', bg: '#C9F3FF', initial: 4,
    path: 'M48 76 210 181 372 76 398 150 210 353 22 150Z',
    holes: [h(102,126,19,14,18),h(162,161,15,21,-12),h(258,160,15,21,12),h(319,126,19,14,-18),h(210,223,21,15),h(161,264,16,22,18),h(210,308,19,13),h(260,264,16,22,-18)]
  },
  {
    key: 'long-bar', name: 'Long bar', color: '#FF4FA3', bg: '#FFE0EE', initial: 5,
    path: 'M30 145H390V275H30Z',
    holes: [h(146,91,20,14,-12),h(255,88,15,21,8),h(103,170,14,20),h(201,158,21,15,15),h(305,172,15,22,-8),h(137,246,18,25,12),h(245,238,21,15,-12),h(306,299,17,23,8),h(185,324,22,15),h(272,130,12,17,15)]
  },
  {
    key: 'flower-star', name: 'Five-point bloom', color: '#FF7657', bg: '#FFE1D8', initial: 5,
    path: 'M274.7 121Q467.8 126.3 314.6 244Q369.3 429.2 210 320Q50.7 429.2 105.4 244Q-47.8 126.3 145.3 121Q210 -61 274.7 121Z',
    holes: [h(210,104,18,24),h(304,174,23,17,20),h(269,282,18,24,-22),h(151,282,22,17,18),h(116,174,17,23,-18),h(210,210,23,18),h(254,211,16,21,12),h(168,210,16,21,-12)]
  },
  {
    key: 'flower', name: 'Daisy flower', color: '#C94DFF', bg: '#F2D8FF', initial: 6,
    path: 'M315 210A105 105 0 1 1 105 210A105 105 0 1 1 315 210ZM210 20A60 90 0 1 1 210 200A60 90 0 1 1 210 20ZM374.5 115A60 90 60 1 1 218.7 205A60 90 60 1 1 374.5 115ZM374.5 305A60 90 120 1 1 218.7 215A60 90 120 1 1 374.5 305ZM210 400A60 90 0 1 1 210 220A60 90 0 1 1 210 400ZM45.5 305A60 90 60 1 1 201.3 215A60 90 60 1 1 45.5 305ZM45.5 115A60 90 120 1 1 201.3 205A60 90 120 1 1 45.5 115Z',
    holes: [h(210,104,18,24),h(304,174,23,17,20),h(269,282,18,24,-22),h(151,282,22,17,18),h(116,174,17,23,-18),h(210,210,23,18),h(254,211,16,21,12),h(168,210,16,21,-12)]
  },
  {
    key: 'bowtie', name: 'Bowtie slab', color: '#00D7B9', bg: '#D0F7F0', initial: 6,
    path: 'M40 70H380L286 210 380 350H40L134 210Z',
    holes: [h(98,126,20,15,-15),h(190,116,16,22,8),h(322,126,20,15,15),h(322,294,20,15,-15),h(230,304,16,22,-8),h(98,294,20,15,15),h(176,210,15,20),h(244,210,15,20)]
  }
];

const collection = isHoleyApp ? document.querySelector('#collection') : null;
const MAX_HOLES = 8;
const SHADOW_X = 18;
const SHADOW_Y = 21;
const SHADOW_STEPS = 12;
const states = new Map();
let packingContext = null;
const packingCache = new Map();
const SHOWCASE_MOTIONS = [
  ['scatter', '4.2s', '-1.4s'],
  ['magnet', '4.6s', '-3.2s'],
  ['blinkwave', '3.7s', '-2.1s'],
  ['orbit', '5.2s', '-.6s'],
  ['hop', '3.5s', '-1.9s'],
  ['scan', '4.3s', '-.8s'],
  ['wobble', '4.8s', '-2.4s'],
  ['pinch', '3.9s', '-1.1s'],
  ['carousel', '5.6s', '-4.1s'],
  ['heartbeat', '3.8s', '-2.2s'],
  ['peek', '4.5s', '-3.5s'],
  ['shuffle', '4.1s', '-1.7s'],
  ['tumble', '4.7s', '-3.3s'],
  ['ripple', '3.6s', '-1.2s'],
  ['breathe', '5s', '-2.5s']
];
const showcaseObserver = isBrowser && typeof IntersectionObserver === 'function'
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-showcase-visible', entry.isIntersecting));
    }, { rootMargin: '120px 0px', threshold: 0.05 })
  : null;

function applyShowcaseMotion(element, index) {
  const [name, duration, delay] = SHOWCASE_MOTIONS[index % SHOWCASE_MOTIONS.length];
  element.dataset.motion = name;
  element.style.setProperty('--motion-duration', duration);
  element.style.setProperty('--motion-delay', delay);
  if (showcaseObserver) showcaseObserver.observe(element);
  else element.classList.add('is-showcase-visible');
}

function getPackingContext() {
  if (packingContext) return packingContext;
  if (!isBrowser || typeof Path2D === 'undefined') return null;
  const packingCanvas = document.createElement('canvas');
  packingCanvas.width = 420;
  packingCanvas.height = 420;
  packingContext = packingCanvas.getContext('2d');
  return packingContext;
}

const holeMarkup = ({ cx, cy, rx, ry, rotate }) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rotate ? ` transform="rotate(${rotate} ${cx} ${cy})"` : ''}/>`;

const showcaseHoleMarkup = (hole, index) => {
  const angle = (index * 137.5 * Math.PI) / 180;
  const scatterX = Math.round(Math.cos(angle) * 17);
  const scatterY = Math.round(Math.sin(angle) * 17);
  const inwardX = Math.round((210 - hole.cx) * .26);
  const inwardY = Math.round((210 - hole.cy) * .26);
  const outwardX = Math.round((hole.cx - 210) * .11);
  const outwardY = Math.round((hole.cy - 210) * .11);
  const turn = (index % 2 ? 1 : -1) * (14 + (index % 3) * 7);
  const variables = [
    `--hole-origin:${hole.cx}px ${hole.cy}px`,
    `--scatter-x:${scatterX}px`,
    `--scatter-y:${scatterY}px`,
    `--scatter-back-x:${Math.round(scatterX * -.3)}px`,
    `--scatter-back-y:${Math.round(scatterY * -.3)}px`,
    `--in-x:${inwardX}px`,
    `--in-y:${inwardY}px`,
    `--out-x:${outwardX}px`,
    `--out-y:${outwardY}px`,
    `--turn:${turn}deg`,
    `--turn-back:${turn * -1}deg`
  ].join(';');
  return `<g class="hole-motion" style="${variables}">${holeMarkup(hole)}</g>`;
};

function darkShadow(color, factor = 0.52) {
  const value = color.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  return `#${channels.map((channel) => Math.round(channel * factor).toString(16).padStart(2, '0')).join('')}`;
}

function circleFits(path, cx, cy, radius) {
  const context = getPackingContext();
  if (!context) return false;
  for (let step = 0; step < 32; step += 1) {
    const angle = (Math.PI * 2 * step) / 32;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (!context.isPointInPath(path, x, y)) return false;
  }
  return true;
}

function boundaryClearance(path, cx, cy) {
  const context = getPackingContext();
  if (!context || !context.isPointInPath(path, cx, cy)) return 0;
  let low = 0;
  let high = 180;
  for (let pass = 0; pass < 9; pass += 1) {
    const radius = (low + high) / 2;
    if (circleFits(path, cx, cy, radius)) low = radius;
    else high = radius;
  }
  return low;
}

function packingCandidates(shape) {
  if (packingCache.has(shape.key)) return packingCache.get(shape.key);
  const context = getPackingContext();
  if (!context) return { path: null, candidates: [] };
  const path = new Path2D(shape.path);
  const candidates = [];
  for (let y = 50; y <= 370; y += 12) {
    for (let x = 50; x <= 370; x += 12) {
      if (!context.isPointInPath(path, x, y)) continue;
      const clearance = boundaryClearance(path, x, y);
      if (clearance >= 17) candidates.push({ x, y, clearance });
    }
  }
  const result = { path, candidates };
  packingCache.set(shape.key, result);
  return result;
}

function seededNoise(x, y, seed) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 41.137) * 43758.5453;
  return value - Math.floor(value);
}

function assignVoronoiCells(points, candidates) {
  const cells = points.map(() => []);
  candidates.forEach((candidate) => {
    let closestIndex = 0;
    let closestDistance = Infinity;
    points.forEach((point, index) => {
      const distance = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    cells[closestIndex].push(candidate);
  });
  return cells;
}

function packedHoleLayout(shape, count, seed) {
  if (count === 0) return [];
  const { candidates } = packingCandidates(shape);
  if (!candidates.length) {
    const start = ((Math.trunc(seed) % shape.holes.length) + shape.holes.length) % shape.holes.length;
    return Array.from({ length: count }, (_, index) => ({ ...shape.holes[(start + index) % shape.holes.length] }));
  }
  const maximumClearance = Math.max(...candidates.map(({ clearance }) => clearance));
  const starterPool = candidates.filter(({ clearance }) => clearance >= maximumClearance * 0.72);
  const first = seed === 0
    ? starterPool.reduce((best, point) =>
        Math.hypot(point.x - 210, point.y - 210) < Math.hypot(best.x - 210, best.y - 210) ? point : best)
    : starterPool[Math.floor(seededNoise(seed, count, seed) * starterPool.length)];
  let selected = [first];
  const remaining = candidates.filter((point) => point !== first);

  while (selected.length < count && remaining.length) {
    let bestIndex = 0;
    let bestScore = -1;
    remaining.forEach((candidate, index) => {
      const nearest = Math.min(...selected.map((picked) =>
        Math.hypot(candidate.x - picked.x, candidate.y - picked.y)));
      const packingRadius = Math.min(candidate.clearance - 12, nearest / 2 - 5);
      const variation = seed === 0 ? 1 : 0.92 + seededNoise(candidate.x, candidate.y, seed) * 0.16;
      const score = packingRadius * variation;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    selected.push(remaining.splice(bestIndex, 1)[0]);
  }

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const cells = assignVoronoiCells(selected, candidates);
    selected = cells.map((cell, index) => {
      if (!cell.length) return selected[index];
      const centroid = cell.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
      centroid.x /= cell.length;
      centroid.y /= cell.length;
      return cell.reduce((closest, point) => {
        const pointDistance = (point.x - centroid.x) ** 2 + (point.y - centroid.y) ** 2;
        const closestDistance = (closest.x - centroid.x) ** 2 + (closest.y - centroid.y) ** 2;
        return pointDistance < closestDistance ? point : closest;
      });
    });
  }

  const cells = assignVoronoiCells(selected, candidates);
  return selected.map((point, index) => {
    const nearest = selected.length === 1
      ? Infinity
      : Math.min(...selected.filter((_, otherIndex) => otherIndex !== index).map((other) =>
          Math.hypot(point.x - other.x, point.y - other.y)));
    const style = shape.holes[(index + seed) % shape.holes.length];
    const styleRadius = Math.max(style.rx, style.ry);
    const aspectArea = (style.rx / styleRadius) * (style.ry / styleRadius);
    const territoryArea = cells[index].length * 144;
    const territoryRadius = Math.sqrt((territoryArea * 0.56) / (Math.PI * aspectArea));
    const safeRadius = Math.min(point.clearance - 12, nearest / 2 - 6);
    const radius = Math.max(10, Math.min(safeRadius, territoryRadius));
    return {
      cx: point.x,
      cy: point.y,
      rx: Math.round(radius * (style.rx / styleRadius)),
      ry: Math.round(radius * (style.ry / styleRadius)),
      rotate: style.rotate
    };
  });
}

function svgMarkup(shape, holes, className, maskSuffix, accessible = false) {
  const maskId = `mask-${shape.key}-${maskSuffix}`;
  const fill = className === 'shape-shadow' ? darkShadow(shape.color) : shape.color;
  return `<svg class="shape-layer ${className}" viewBox="0 0 420 420" ${accessible ? `role="img" aria-label="${shape.name} with ${holes.length} holes"` : 'aria-hidden="true"'}><defs><mask id="${maskId}"><rect width="420" height="420" fill="white"/>${holes.map(holeMarkup).join('')}</mask></defs><path d="${shape.path}" fill="${fill}" mask="url(#${maskId})"/></svg>`;
}

function compactNumber(value) {
  const rounded = Math.round(value * 100) / 100;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function extrusionFilterMarkup(shape, filterId, options = {}) {
  const shadowX = options.shadowX ?? SHADOW_X;
  const shadowY = options.shadowY ?? SHADOW_Y;
  const shadowSteps = options.shadowSteps ?? SHADOW_STEPS;
  const shadowColor = options.shadowColor ?? darkShadow(shape.color);
  const offsets = Array.from({ length: shadowSteps }, (_, index) => {
    const step = index + 1;
    const ratio = step / shadowSteps;
    return `<feOffset in="s" dx="${compactNumber(shadowX * ratio)}" dy="${compactNumber(shadowY * ratio)}" result="s${step}"/>`;
  }).join('');
  const merge = Array.from({ length: shadowSteps }, (_, index) =>
    `<feMergeNode in="s${shadowSteps - index}"/>`
  ).join('');
  return `<filter id="${filterId}" x="-20%" y="-20%" width="160%" height="160%" color-interpolation-filters="sRGB"><feFlood flood-color="${shadowColor}" result="p"/><feComposite in="p" in2="SourceGraphic" operator="in" result="s"/>${offsets}<feMerge>${merge}<feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}

function objectMarkup(shape, holes, suffix, accessible = false) {
  const maskId = `mask-${shape.key}-${suffix}`;
  const filterId = `extrusion-${shape.key}-${suffix}`;
  return `<svg class="shape-layer shape-object" viewBox="0 0 420 420" ${accessible ? `role="img" aria-label="${shape.name} with ${holes.length} holes"` : 'aria-hidden="true"'}><defs><mask id="${maskId}"><rect width="420" height="420" fill="white"/>${holes.map(showcaseHoleMarkup).join('')}</mask>${extrusionFilterMarkup(shape, filterId)}</defs><g filter="url(#${filterId})"><g class="shape-spin"><path d="${shape.path}" fill="${shape.color}" mask="url(#${maskId})"/></g></g></svg>`;
}

function renderShape(card, shape, state) {
  const holes = packedHoleLayout(shape, state.count, state.seed);
  card.querySelector('.shape-art').innerHTML = objectMarkup(shape, holes, 'card', true);
  card.querySelector('.hole-count').textContent = `${String(state.count).padStart(2, '0')} / ${String(state.limit).padStart(2, '0')}`;
  card.querySelector('.hole-range').value = state.count;
}

function exportSvg(shape, holes, options = {}) {
  const maskHoles = holes.map(holeMarkup).join('');
  const filter = extrusionFilterMarkup(shape, 'e', options);
  const duration = Math.max(100, Math.min(10000, Number(options.duration) || 900));
  const animation = options.animated === false
    ? ''
    : `<style>.spin-group{transform-box:fill-box;transform-origin:center;will-change:transform}svg:hover .spin-group{animation:spin ${duration}ms cubic-bezier(.33,0,.2,1) both}@keyframes spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){svg:hover .spin-group{animation:none}}</style>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420" role="img" aria-label="${shape.name} with ${holes.length} holes">${animation}<defs><mask id="h"><rect width="420" height="420" fill="white"/>${maskHoles}</mask>${filter}</defs><g filter="url(#e)"><g class="spin-group"><path d="${shape.path}" fill="${shape.color}" mask="url(#h)"/></g></g></svg>`;
}

function normalizeColor(color, fallback) {
  return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : fallback;
}

function numberInRange(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export const shapeNames = Object.freeze(shapes.map(({ key, name, color }) => ({ key, name, color })));

export function createHoleySvg(options = {}) {
  const source = shapes.find(({ key }) => key === options.shape) || shapes[0];
  const color = normalizeColor(options.color, source.color);
  const shape = { ...source, color };
  const holeCount = Math.round(numberInRange(options.holes, source.initial, 0, Math.min(MAX_HOLES, source.holes.length)));
  const seed = Math.trunc(numberInRange(options.seed, 0, -1000000, 1000000));
  const shadowX = numberInRange(options.shadowX, SHADOW_X, -80, 80);
  const shadowY = numberInRange(options.shadowY, SHADOW_Y, -80, 80);
  const shadowSteps = Math.round(numberInRange(options.shadowSteps, SHADOW_STEPS, 1, 32));
  const shadowColor = normalizeColor(options.shadowColor, darkShadow(color));
  const holes = packedHoleLayout(shape, holeCount, seed);
  return exportSvg(shape, holes, {
    animated: options.animated,
    duration: options.duration,
    shadowColor,
    shadowX,
    shadowY,
    shadowSteps
  });
}

export function mountHoleyShape(target, options = {}) {
  const element = typeof target === 'string' && isBrowser ? document.querySelector(target) : target;
  if (!element || typeof element.replaceChildren !== 'function') {
    throw new TypeError('mountHoleyShape needs an element or a valid selector.');
  }

  let currentOptions = { ...options };
  const render = () => {
    const template = document.createElement('template');
    template.innerHTML = createHoleySvg(currentOptions).trim();
    element.replaceChildren(template.content.firstElementChild);
  };
  render();

  return {
    element,
    update(nextOptions = {}) {
      currentOptions = { ...currentOptions, ...nextOptions };
      render();
    },
    shuffle() {
      currentOptions.seed = (Number(currentOptions.seed) || 0) + 1;
      render();
    },
    destroy() {
      element.replaceChildren();
    }
  };
}

function downloadSvg(shape, holes) {
  const source = exportSvg(shape, holes);
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${shape.key}-${holes.length}-holes.svg`;
  link.click();
  URL.revokeObjectURL(url);
}

if (collection) shapes.forEach((shape, index) => {
  const number = String(index + 1).padStart(2, '0');
  const holeLimit = Math.min(MAX_HOLES, shape.holes.length);
  const wide = index === 0 || index === shapes.length - 1;
  const card = document.createElement('article');
  card.className = `form-card${wide ? ' form-card--wide' : ''}`;
  card.dataset.index = number;
  card.innerHTML = `
    <div class="card-meta"><span>${number}</span><h2>${shape.name}</h2><span>MAX ${String(holeLimit).padStart(2, '0')}</span></div>
    <div class="stage" style="background:${shape.bg}">
      <div class="shape-art${wide ? ' shape-art--large' : ''}"></div>
      ${index === 0 ? '<span class="orbit-line" aria-hidden="true"></span>' : ''}
      ${index === shapes.length - 1 ? '<span class="crosshair" aria-hidden="true"></span>' : ''}
    </div>
    <div class="card-actions">
      <label class="hole-control"><span>HOLES</span><input class="hole-range" type="range" min="0" max="${holeLimit}" value="${Math.min(shape.initial, holeLimit)}"/><output class="hole-count"></output></label>
      <button class="shuffle" type="button">SHUFFLE ↻</button>
      <button class="download" type="button">GET SVG <span>↓</span></button>
    </div>`;
  collection.append(card);
  applyShowcaseMotion(card, index);

  const state = { count: Math.min(shape.initial, holeLimit), seed: 0, limit: holeLimit };
  states.set(shape.key, state);
  renderShape(card, shape, state);

  card.querySelector('.hole-range').addEventListener('input', (event) => {
    state.count = Number(event.target.value);
    renderShape(card, shape, state);
  });
  card.querySelector('.shuffle').addEventListener('click', () => {
    state.seed += 1;
    renderShape(card, shape, state);
  });
  card.querySelector('.download').addEventListener('click', () => {
    downloadSvg(shape, packedHoleLayout(shape, state.count, state.seed));
  });
});

const presentApp = isHoleyApp ? document.querySelector('#present-app') : null;

if (presentApp) {
  const art = document.querySelector('#present-art');
  const shapePicker = document.querySelector('#shape-picker');
  const colorPicker = document.querySelector('#color-picker');
  const range = document.querySelector('#present-holes');
  const count = document.querySelector('#present-count');
  const selectedName = document.querySelector('#selected-name');
  const shuffle = document.querySelector('#present-shuffle');
  const download = document.querySelector('#present-download');
  const canvas = document.querySelector('.present-canvas');
  const palette = ['#6337FF', '#9BED00', '#FF0878', '#2878FF', '#FF6A00', '#00DBFF', '#FFD000', '#C94DFF', '#00D7B9'];
  const presentState = { index: 0, count: shapes[0].initial, seed: 0, color: shapes[0].color };

  const activeShape = () => ({ ...shapes[presentState.index], color: presentState.color });

  function syncPresentControls() {
    const shape = shapes[presentState.index];
    const limit = Math.min(MAX_HOLES, shape.holes.length);
    selectedName.textContent = shape.name;
    range.max = limit;
    range.value = presentState.count;
    count.textContent = `${String(presentState.count).padStart(2, '0')} / ${String(limit).padStart(2, '0')}`;
    shapePicker.querySelectorAll('.shape-option').forEach((button, index) => {
      button.classList.toggle('is-active', index === presentState.index);
      button.setAttribute('aria-pressed', String(index === presentState.index));
    });
    colorPicker.querySelectorAll('.color-option').forEach((button) => {
      const active = button.dataset.color === presentState.color;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function renderPresent() {
    const shape = activeShape();
    const holes = packedHoleLayout(shape, presentState.count, presentState.seed);
    applyShowcaseMotion(art, presentState.index);
    art.innerHTML = objectMarkup(shape, holes, 'present', true);
    syncPresentControls();
  }

  shapes.forEach((shape, index) => {
    const button = document.createElement('button');
    const previewHoles = packedHoleLayout(shape, Math.min(3, shape.holes.length), 0);
    button.className = 'shape-option';
    button.type = 'button';
    button.setAttribute('aria-label', shape.name);
    button.innerHTML = `<span class="shape-thumb">${svgMarkup(shape, previewHoles, 'picker-shape', `picker-${index}`)}</span><span>${String(index + 1).padStart(2, '0')}</span>`;
    button.addEventListener('click', () => {
      presentState.index = index;
      presentState.count = Math.min(shape.initial, MAX_HOLES, shape.holes.length);
      presentState.seed = 0;
      presentState.color = shape.color;
      renderPresent();
    });
    shapePicker.append(button);
  });

  palette.forEach((color) => {
    const button = document.createElement('button');
    button.className = 'color-option';
    button.type = 'button';
    button.dataset.color = color;
    button.style.setProperty('--swatch', color);
    button.setAttribute('aria-label', `Use color ${color}`);
    button.addEventListener('click', () => {
      presentState.color = color;
      renderPresent();
    });
    colorPicker.append(button);
  });

  range.addEventListener('input', () => {
    presentState.count = Number(range.value);
    renderPresent();
  });

  shuffle.addEventListener('click', () => {
    presentState.seed += 1;
    renderPresent();
  });

  download.addEventListener('click', () => {
    const shape = activeShape();
    downloadSvg(shape, packedHoleLayout(shape, presentState.count, presentState.seed));
  });

  renderPresent();
}
