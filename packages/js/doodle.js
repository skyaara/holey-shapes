import { compileShapePath } from "./geometry.js";

const ink = "#25262A";
const n = (value) => String(Math.round(value * 100) / 100);
const point = ([x, y]) => `${n(x)} ${n(y)}`;
const contours = new Map();

// A wobbly polyline around the outline. Straight segments keep corners crisp.
function outline(shape, seed) {
  let vertices = contours.get(shape.key);
  if (!vertices) {
    vertices = compileShapePath(shape.path).contour;
    contours.set(shape.key, vertices);
  }
  const phase = seed * 0.017;
  const wobble = ([x, y]) => [
    x + 2.6 * Math.sin(y / 23 + phase) + 1.3 * Math.sin(x / 13 + y / 37),
    y + 2.6 * Math.sin(x / 27 - phase) + 1.3 * Math.cos(y / 17 + x / 31),
  ];
  const points = [vertices[0]];
  // Retain polygon corners; decimate the densely flattened curves.
  for (let i = 1; i < vertices.length; i++) {
    const current = vertices[i], previous = vertices[i - 1];
    const next = vertices[(i + 1) % vertices.length];
    const a = Math.atan2(current[1] - previous[1], current[0] - previous[0]);
    const b = Math.atan2(next[1] - current[1], next[0] - current[0]);
    const last = points[points.length - 1];
    const distance = Math.hypot(current[0] - last[0], current[1] - last[1]);
    if (distance < 9 && Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) < 0.3 && i < vertices.length - 1) continue;
    const steps = Math.max(1, Math.ceil(distance / 10));
    for (let step = 1; step <= steps; step++) {
      points.push([last[0] + ((current[0] - last[0]) * step) / steps, last[1] + ((current[1] - last[1]) * step) / steps]);
    }
  }
  return points.map((p, i) => `${i ? "L" : "M"}${point(wobble(p))}`).join("") + "Z";
}

// A slightly irregular closed curve inside each packed hole.
function cutout(hole, seed, index) {
  const phase = seed * 0.013 + index * 2.4;
  const rotation = (hole.rotate * Math.PI) / 180;
  const points = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * Math.PI) / 6;
    // Shrink before wobbling to stay inside the original packing clearance.
    const radius = 0.92 + 0.045 * Math.sin(angle * 3 + phase) + 0.03 * Math.cos(angle * 2 - phase);
    const x = Math.cos(angle) * hole.rx * radius;
    const y = Math.sin(angle) * hole.ry * radius;
    return [hole.cx + x * Math.cos(rotation) - y * Math.sin(rotation), hole.cy + x * Math.sin(rotation) + y * Math.cos(rotation)];
  });
  let path = `M${point(points[0])}`;
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i + 11) % 12], start = points[i];
    const end = points[(i + 1) % 12], next = points[(i + 2) % 12];
    path += `C${point(start.map((v, j) => v + (end[j] - prev[j]) / 6))} ${point(end.map((v, j) => v - (next[j] - start[j]) / 6))} ${point(end)}`;
  }
  return path + "Z";
}

export function createDoodleSvg(shape, holes, options) {
  const seed = options.seed || 0;
  const path = outline(shape, seed);
  const paths = holes.map((hole, index) => cutout(hole, seed, index));
  const duration = Math.max(100, Math.min(10000, Number(options.duration) || 900));
  const hole = (d, index, stroke = false) => {
    const mark = `<path d="${d}" fill="${stroke ? "none" : "black"}"${stroke ? ` stroke="${ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"` : ""}/>`;
    return options.animated === false
      ? mark
      : `<g class="doodle-cutout" style="transform-origin:${n(holes[index].cx)}px ${n(holes[index].cy)}px;--doodle-delay:${index * 27}ms;--doodle-duration:${duration}ms">${mark}</g>`;
  };
  const animation = options.animated === false
    ? ""
    : "<style>svg:hover .doodle-cutout{animation:doodle-cutout-pulse var(--doodle-duration) ease-in-out var(--doodle-delay) both}@keyframes doodle-cutout-pulse{0%,100%{transform:scale(1)}50%{transform:scale(.75)}}@media(prefers-reduced-motion:reduce){svg:hover .doodle-cutout{animation:none}}</style>";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420" role="img" aria-label="${shape.name} with ${holes.length} holes">${animation}<defs><mask id="h"><rect width="420" height="420" fill="white"/>${paths.map((d, i) => hole(d, i)).join("")}</mask></defs><g stroke="${ink}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"><g class="doodle-shadow-offset" transform="translate(9 11)"><g class="doodle-shadow"><path d="${path}" fill="${ink}" mask="url(#h)"/></g></g><g class="doodle-face"><path d="${path}" fill="${shape.color}" mask="url(#h)"/><path d="${path}" fill="none"/>${paths.map((d, i) => hole(d, i, true)).join("")}</g></g></svg>`;
}
