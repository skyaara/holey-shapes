import { compileShapePath } from './geometry.js';
import { createDoodleSvg } from './doodle.js';

const h = (cx, cy, rx, ry, rotate = 0) => ({ cx, cy, rx, ry, rotate });

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
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
    key: 'bowtie', name: 'Bowtie slab', color: '#00D7B9', bg: '#D0F7F0', initial: 6,
    path: 'M40 70H380L286 210 380 350H40L134 210Z',
    holes: [h(98,126,20,15,-15),h(190,116,16,22,8),h(322,126,20,15,15),h(322,294,20,15,-15),h(230,304,16,22,-8),h(98,294,20,15,15),h(176,210,15,20),h(244,210,15,20)]
  }
];

const MAX_HOLES = 8;
const SHADOW_X = 18;
const SHADOW_Y = 21;
const SHADOW_STEPS = 12;
const packingCache = new Map();

const holeMarkup = ({ cx, cy, rx, ry, rotate }) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rotate ? ` transform="rotate(${rotate} ${cx} ${cy})"` : ''}/>`;

function hoverHoleMarkup(hole, index, seed = 0, duration = 900) {
  const durationNoise = seededNoise(index + 1, 17, seed);
  const delayNoise = seededNoise(index + 1, 43, seed);
  const pulseDuration = Math.round(duration * (0.42 + durationNoise * 0.16));
  const delay = Math.round(duration * (0.04 + delayNoise * 0.34));
  return `<g class="hole-hover" style="--hole-duration:${pulseDuration}ms;--hole-delay:${delay}ms">${holeMarkup(hole)}</g>`;
}

function darkShadow(color, factor = 0.52) {
  const value = color.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  return `#${channels.map((channel) => Math.round(channel * factor).toString(16).padStart(2, '0')).join('')}`;
}

function circleFits(path, cx, cy, radius) {
  for (let step = 0; step < 32; step += 1) {
    const angle = (Math.PI * 2 * step) / 32;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (!path.contains(x, y)) return false;
  }
  return true;
}

function boundaryClearance(path, cx, cy) {
  if (!path.contains(cx, cy)) return 0;
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
  const path = compileShapePath(shape.path);
  const candidates = [];
  for (let y = 50; y <= 370; y += 12) {
    for (let x = 50; x <= 370; x += 12) {
      if (!path.contains(x, y)) continue;
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

// Shrink to the smallest fitted area so spacing and oval proportions stay intact.
function equalizeHoleAreas(holes) {
  if (!holes.length) return holes;
  const targetArea = Math.min(...holes.map(({ rx, ry }) => rx * ry));
  return holes.map((hole) => {
    const scale = Math.sqrt(targetArea / (hole.rx * hole.ry));
    return {
      ...hole,
      rx: Number((hole.rx * scale).toFixed(3)),
      ry: Number((hole.ry * scale).toFixed(3))
    };
  });
}

// Equal-area ellipses use radius sqrt(rx * ry). Support projections give a
// separating line with a 12-unit gap, including for differently rotated ovals.
const packingDirections = Array.from({ length: 48 }, (_, i) => {
  const angle = i * Math.PI * 2 / 48;
  return { x: Math.cos(angle), y: Math.sin(angle) };
});
const perimeterDirections = Array.from({ length: 192 }, (_, i) => {
  const angle = i * Math.PI * 2 / 192;
  return { x: Math.cos(angle), y: Math.sin(angle) };
});
const optimizedLayoutCache = new Map();

function maximizeHoleAreas(shape, holes) {
  if (!holes.length) return holes;
  const { path } = packingCandidates(shape);
  const gap = 12;
  const profiles = holes.map(hole => {
    const a = Math.sqrt(hole.rx / hole.ry);
    const b = 1 / a;
    const angle = hole.rotate * Math.PI / 180;
    const c = Math.cos(angle), s = Math.sin(angle);
    return {
      a, b,
      support: packingDirections.map(n => Math.hypot(a * (n.x * c + n.y * s), b * (-n.x * s + n.y * c))),
      edge: perimeterDirections.map(n => {
        const nx = n.x / a, ny = n.y / b;
        const length = Math.hypot(nx, ny);
        return { x: a * n.x * c - b * n.y * s, y: a * n.x * s + b * n.y * c,
          nx: (nx * c - ny * s) / length, ny: (nx * s + ny * c) / length };
      })
    };
  });
  const points = holes.map(h => ({ x: h.cx, y: h.cy }));
  function boundaryLimit(point, profile) {
    if (!path.contains(point.x, point.y)) return 0;
    let low = 0, high = 180;
    for (let pass = 0; pass < 11; pass++) {
      const radius = (low + high) / 2;
      // An extra rim unit covers the space between perimeter samples.
      const fits = profile.edge.every(e => path.contains(
        point.x + radius * e.x + (gap + 1) * e.nx, point.y + radius * e.y + (gap + 1) * e.ny));
      if (fits) low = radius; else high = radius;
    }
    return low;
  }
  function fitsAt(point, profile, radius) {
    return radius < 180 && path.contains(point.x, point.y) && profile.edge.every(e => path.contains(
      point.x + radius * e.x + (gap + 1) * e.nx, point.y + radius * e.y + (gap + 1) * e.ny));
  }
  const boundaries = points.map((p, i) => boundaryLimit(p, profiles[i]));
  function capacity(point, index, boundary) {
    let limit = boundary;
    points.forEach((other, j) => {
      if (j === index) return;
      let separation = 0;
      packingDirections.forEach((n, k) => {
        separation = Math.max(separation, (Math.abs((point.x - other.x) * n.x + (point.y - other.y) * n.y) - gap)
          / (profiles[index].support[k] + profiles[j].support[k]));
      });
      limit = Math.min(limit, separation);
    });
    return limit;
  }
  // Coordinate search improves each constrained hole, then refines its position.
  for (const step of [12, 6, 3, 1.5]) {
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      points.forEach((point, i) => {
        let best = point, bestBoundary = boundaries[i];
        let bestLimit = capacity(point, i, bestBoundary);
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
          const candidate = { x: point.x + dx * step, y: point.y + dy * step };
          // A move wins only if both limits beat the threshold, so reject on
          // the cheap separation test and a single rim test before the search.
          const separation = capacity(candidate, i, Infinity);
          if (separation <= bestLimit + 0.02 || !fitsAt(candidate, profiles[i], bestLimit + 0.02)) continue;
          const boundary = boundaryLimit(candidate, profiles[i]);
          const limit = Math.min(separation, boundary);
          if (limit > bestLimit + 0.02) {
            best = candidate; bestBoundary = boundary; bestLimit = limit;
          }
        }
        if (best !== point) moved = true;
        points[i] = best; boundaries[i] = bestBoundary;
      });
      if (!moved) break;
    }
  }
  const radius = Math.max(0, Math.min(...points.map((p, i) => capacity(p, i, boundaries[i]))) - 0.05);
  return holes.map((hole, i) => ({ ...hole, cx: points[i].x, cy: points[i].y,
    rx: Number((radius * profiles[i].a).toFixed(3)), ry: Number((radius * profiles[i].b).toFixed(3)) }));
}

function packedHoleLayout(shape, count, seed) {
  const key = `${shape.key}:${count}:${seed}`;
  if (optimizedLayoutCache.has(key)) return optimizedLayoutCache.get(key);
  const holes = maximizeHoleAreas(shape, initialHoleLayout(shape, count, seed));
  if (optimizedLayoutCache.size >= 512) optimizedLayoutCache.delete(optimizedLayoutCache.keys().next().value);
  optimizedLayoutCache.set(key, holes);
  return holes;
}

function initialHoleLayout(shape, count, seed) {
  if (count === 0) return [];
  const { candidates } = packingCandidates(shape);
  if (candidates.length < count) throw new Error(`Insufficient packing space for ${shape.key}`);
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
  return equalizeHoleAreas(selected.map((point, index) => {
    const nearest = selected.length === 1
      ? Infinity
      : Math.min(...selected.filter((_, otherIndex) => otherIndex !== index).map((other) =>
          Math.hypot(point.x - other.x, point.y - other.y)));
    const style = shape.holes[((index + seed) % shape.holes.length + shape.holes.length) % shape.holes.length];
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
  }));
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

function exportSvg(shape, holes, options = {}) {
  if (options.doodle) return createDoodleSvg(shape, holes, options);
  const filter = extrusionFilterMarkup(shape, 'e', options);
  const duration = Math.max(100, Math.min(10000, Number(options.duration) || 900));
  const seed = Math.trunc(Number(options.seed) || 0);
  const maskHoles = options.animated === false
    ? holes.map(holeMarkup).join('')
    : holes.map((hole, index) => hoverHoleMarkup(hole, index, seed, duration)).join('');
  const animation = options.animated === false
    ? ''
    : `<style>.hole-hover{transform-box:fill-box;transform-origin:center;will-change:transform}svg:hover .hole-hover{animation:hole-open-close var(--hole-duration) cubic-bezier(.33,0,.2,1) var(--hole-delay) both}@keyframes hole-open-close{0%,100%{transform:scale(1)}50%{transform:scale(.06)}}@media(prefers-reduced-motion:reduce){svg:hover .hole-hover{animation:none}}</style>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420" role="img" aria-label="${shape.name} with ${holes.length} holes">${animation}<defs><mask id="h"><rect width="420" height="420" fill="white"/>${maskHoles}</mask>${filter}</defs><g filter="url(#e)"><path d="${shape.path}" fill="${shape.color}" mask="url(#h)"/></g></svg>`;
}

function normalizeColor(color, fallback) {
  return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : fallback;
}

function numberInRange(value, fallback, min, max) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export const shapeNames = Object.freeze(shapes.map(({ key, name, color }) => Object.freeze({ key, name, color })));

// Callers inserting several SVG strings can supply a stable, unique prefix.
// Encoding each code point avoids collisions between punctuation and underscores.
function scopeSvg(source, prefix) {
  if (prefix === undefined) return source;
  const id = `holey-${Array.from(String(prefix), c => c.codePointAt(0).toString(16)).join('-') || 'empty'}`;
  return source.replaceAll('id="h"', `id="${id}-h"`).replaceAll('url(#h)', `url(#${id}-h)`)
    .replaceAll('id="e"', `id="${id}-e"`).replaceAll('url(#e)', `url(#${id}-e)`);
}

function fnv1a64(identity) {
  let hash = 14695981039346656037n;
  for (const byte of new TextEncoder().encode(String(identity))) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 1099511628211n);
  }
  return hash;
}

export function identityHash(identity) {
  return fnv1a64(identity).toString(16).padStart(16, '0');
}

export function seededHoleyOptions(identity, animated = true) {
  let state = fnv1a64(identity);
  const next = () => {
    state = BigInt.asUintN(64, state + 0x9E3779B97F4A7C15n);
    let value = state;
    value = BigInt.asUintN(64, (value ^ (value >> 30n)) * 0xBF58476D1CE4E5B9n);
    value = BigInt.asUintN(64, (value ^ (value >> 27n)) * 0x94D049BB133111EBn);
    return BigInt.asUintN(64, value ^ (value >> 31n));
  };
  const shape = shapes[Number(next() % BigInt(shapes.length))];
  const seed = Number(next() % 1000001n);
  return { shape: shape.key, seed, animated };
}

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
  return scopeSvg(exportSvg(shape, holes, {
    doodle: options.doodle === true,
    animated: options.animated,
    duration: options.duration,
    seed,
    shadowColor,
    shadowX,
    shadowY,
    shadowSteps
  }), options.idPrefix);
}

let mountSequence = 0;
export function mountHoleyShape(target, options = {}) {
  const element = typeof target === 'string' && isBrowser ? document.querySelector(target) : target;
  if (!element || typeof element.replaceChildren !== 'function') {
    throw new TypeError('mountHoleyShape needs an element or a valid selector.');
  }

  let currentOptions = { ...options };
  const idPrefix = `mount-${++mountSequence}`;
  const ownerDocument = element.ownerDocument;
  let mounted;
  let destroyed = false;
  const render = () => {
    if (destroyed) return;
    const template = ownerDocument.createElement('template');
    template.innerHTML = createHoleySvg({ ...currentOptions, idPrefix }).trim();
    const next = template.content.firstElementChild;
    if (mounted?.parentNode === element) mounted.replaceWith(next);
    else element.append(next);
    mounted = next;
  };
  render();

  return {
    element,
    update(nextOptions = {}) {
      currentOptions = { ...currentOptions, ...nextOptions };
      render();
    },
    shuffle() {
      const seed = Math.trunc(numberInRange(currentOptions.seed, 0, -1000000, 1000000));
      currentOptions.seed = seed >= 1000000 ? -1000000 : seed + 1;
      render();
    },
    destroy() {
      destroyed = true;
      mounted?.remove();
    }
  };
}
