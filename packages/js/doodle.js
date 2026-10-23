import { compileShapePath } from "./geometry.js";

const ink = "#25262A";
const n = (value) => String(Math.round(value * 100) / 100);
const point = ([x, y]) => `${n(x)} ${n(y)}`;
const contours = new Map();

// Catmull-Rom through the points, written as cubic Béziers.
function spline(points, closed) {
  const count = points.length;
  const at = (i) => points[closed ? (i + count) % count : Math.min(count - 1, Math.max(0, i))];
  let d = `M${point(points[0])}`;
  for (let i = 0; i < (closed ? count : count - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += `C${point([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${point([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${point(p2)}`;
  }
  return closed ? d + "Z" : d;
}

function outlinePoints(shape, seed) {
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
  // Closed contours repeat their first point; drop near-duplicates so the spline stays smooth.
  const unique = points.filter((p, i) => {
    const prev = points[(i + points.length - 1) % points.length];
    return Math.hypot(p[0] - prev[0], p[1] - prev[1]) > 0.5;
  });
  return unique.map(wobble);
}

// Outward unit normals, smoothed over neighbours so corners get bisectors.
function outwardNormals(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i], [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  const sign = area > 0 ? 1 : -1;
  return points.map((_, i) => {
    const a = points[(i + points.length - 1) % points.length], b = points[(i + 1) % points.length];
    const tx = b[0] - a[0], ty = b[1] - a[1], length = Math.hypot(tx, ty) || 1;
    return [(sign * ty) / length, (-sign * tx) / length];
  });
}

const facing = (normals, x, y) => normals.reduce((best, normal, i) =>
  normal[0] * x + normal[1] * y > normals[best][0] * x + normals[best][1] * y ? i : best, 0);

// One pen stroke around the outline: it starts slightly inside, laps the shape,
// then overshoots outward so the two loose, rounded ends stay visible.
function penStroke(points, normals) {
  const count = points.length;
  const seam = facing(normals, Math.SQRT1_2, -Math.SQRT1_2);
  const at = (i) => points[(seam + i) % count];
  const shift = (i, amount) => {
    const p = at(i), normal = normals[(seam + i) % count];
    return [p[0] + normal[0] * amount, p[1] + normal[1] * amount];
  };
  const stroke = [shift(0, -2.5)];
  for (let i = 1; i <= count; i++) stroke.push(at(i));
  let travelled = 0;
  for (let i = 1; i < count && travelled < 22; i++) {
    const previous = at(i - 1), current = at(i);
    travelled += Math.hypot(current[0] - previous[0], current[1] - previous[1]);
    stroke.push(shift(i, Math.min(5, 1.2 + travelled * 0.18)));
  }
  return spline(stroke, false);
}

// A short highlight hugging the edge that faces the top-left light.
function glint(points, normals) {
  const count = points.length;
  const centre = facing(normals, -Math.SQRT1_2, -Math.SQRT1_2);
  const window = [centre];
  for (let side of [-1, 1]) {
    let travelled = 0;
    for (let step = 1; step < count / 2 && travelled < 26; step++) {
      const i = (centre + side * step + count) % count;
      const previous = points[(centre + side * (step - 1) + count) % count];
      travelled += Math.hypot(points[i][0] - previous[0], points[i][1] - previous[1]);
      if (side < 0) window.unshift(i); else window.push(i);
    }
  }
  if (window.length < 3) return "";
  return spline(window.map((i) => [points[i][0] - normals[i][0] * 13, points[i][1] - normals[i][1] * 13]), false);
}

function cutoutPoints(hole, seed, index) {
  const phase = seed * 0.013 + index * 2.4;
  const rotation = (hole.rotate * Math.PI) / 180;
  return Array.from({ length: 12 }, (_, i) => {
    const angle = (i * Math.PI) / 6;
    // Shrink before wobbling to stay inside the original packing clearance.
    const radius = 0.92 + 0.045 * Math.sin(angle * 3 + phase) + 0.03 * Math.cos(angle * 2 - phase);
    const x = Math.cos(angle) * hole.rx * radius;
    const y = Math.sin(angle) * hole.ry * radius;
    return [hole.cx + x * Math.cos(rotation) - y * Math.sin(rotation), hole.cy + x * Math.sin(rotation) + y * Math.cos(rotation)];
  });
}

function cutoutStroke(points, hole, seed, index) {
  const start = Math.abs(index * 5 + seed) % 12;
  const at = (i) => points[(start + i) % 12];
  const radial = (p, scale) => [hole.cx + (p[0] - hole.cx) * scale, hole.cy + (p[1] - hole.cy) * scale];
  const stroke = [radial(at(0), 0.95)];
  for (let i = 1; i <= 12; i++) stroke.push(at(i));
  stroke.push(radial(at(13), 1.07));
  return spline(stroke, false);
}

export function createDoodleSvg(shape, holes, options) {
  const seed = options.seed || 0;
  const points = outlinePoints(shape, seed);
  const normals = outwardNormals(points);
  const body = spline(points, true);
  const stroke = penStroke(points, normals);
  const highlight = glint(points, normals);
  const cutouts = holes.map((hole, index) => cutoutPoints(hole, seed, index));
  const duration = Math.max(100, Math.min(10000, Number(options.duration) || 900));
  const wrap = (mark, index) => options.animated === false
    ? mark
    : `<g class="doodle-cutout" style="transform-origin:${n(holes[index].cx)}px ${n(holes[index].cy)}px;--doodle-delay:${index * 27}ms;--doodle-duration:${duration}ms">${mark}</g>`;
  const maskHoles = cutouts.map((p, i) => wrap(`<path d="${spline(p, true)}" fill="black"/>`, i)).join("");
  const holeStrokes = cutouts.map((p, i) => wrap(`<path d="${cutoutStroke(p, holes[i], seed, i)}" fill="none" stroke-width="5"/>`, i)).join("");
  const animation = options.animated === false
    ? ""
    : "<style>svg:hover .doodle-cutout{animation:doodle-cutout-pulse var(--doodle-duration) ease-in-out var(--doodle-delay) both}@keyframes doodle-cutout-pulse{0%,100%{transform:scale(1)}50%{transform:scale(.75)}}@media(prefers-reduced-motion:reduce){svg:hover .doodle-cutout{animation:none}}</style>";
  const shine = highlight ? `<path d="${highlight}" fill="none" stroke="#FFFDF6" stroke-width="6" stroke-opacity=".85" mask="url(#h)"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420" role="img" aria-label="${shape.name} with ${holes.length} holes">${animation}<defs><mask id="h"><rect width="420" height="420" fill="white"/>${maskHoles}</mask></defs><g stroke="${ink}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"><g class="doodle-shadow-offset" transform="translate(9 11)"><g class="doodle-shadow"><path d="${body}" fill="${ink}" mask="url(#h)"/></g></g><g class="doodle-face"><path d="${body}" fill="${shape.color}" stroke="none" mask="url(#h)"/>${shine}<path d="${stroke}" fill="none"/>${holeStrokes}</g></g></svg>`;
}
