// Geometry for the absolute SVG commands used by the built-in shapes.
// Curves are flattened within 0.01 viewBox units, well below the packing rim.
// Both Node and browsers use this code so layout never depends on Canvas.
export function compileShapePath(source) {
  const tokens = source.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/g) || [];
  const edges = [];
  const contour = [];
  let i = 0, command, x = 0, y = 0, startX = 0, startY = 0;
  const number = () => {
    const value = Number(tokens[i++]);
    if (!Number.isFinite(value)) throw new Error('Invalid shape path');
    return value;
  };
  const line = (nx, ny) => {
    if (y !== ny) edges.push({ x, y, nx, ny });
    x = nx; y = ny;
    contour.push([x, y]);
  };
  function quadratic(x0, y0, cx, cy, x1, y1) {
    // The curve's deviation from its chord is at most half this distance.
    if (Math.hypot(cx - (x0 + x1) / 2, cy - (y0 + y1) / 2) <= 0.02) {
      line(x1, y1);
      return;
    }
    const ax = (x0 + cx) / 2, ay = (y0 + cy) / 2;
    const bx = (cx + x1) / 2, by = (cy + y1) / 2;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    quadratic(x0, y0, ax, ay, mx, my);
    quadratic(mx, my, bx, by, x1, y1);
  }
  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) command = tokens[i++];
    switch (command) {
      case 'M':
        x = number(); y = number(); startX = x; startY = y; command = 'L';
        contour.push([x, y]);
        break;
      case 'L': line(number(), number()); break;
      case 'H': line(number(), y); break;
      case 'V': line(x, number()); break;
      case 'Q': {
        const cx = number(), cy = number(), nx = number(), ny = number();
        quadratic(x, y, cx, cy, nx, ny);
        break;
      }
      case 'A': {
        let rx = Math.abs(number()), ry = Math.abs(number());
        const rotation = number() * Math.PI / 180;
        const large = number(), sweep = number(), nx = number(), ny = number();
        if (!rx || !ry) { line(nx, ny); break; }
        if (x === nx && y === ny) break;
        const c = Math.cos(rotation), s = Math.sin(rotation);
        const dx = (x - nx) / 2, dy = (y - ny) / 2;
        const px = c * dx + s * dy, py = -s * dx + c * dy;
        const scale = Math.hypot(px / rx, py / ry);
        if (scale > 1) { rx *= scale; ry *= scale; }
        const factor = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0,
          (rx * rx * ry * ry - rx * rx * py * py - ry * ry * px * px) /
          (rx * rx * py * py + ry * ry * px * px)));
        const cx = factor * rx * py / ry, cy = -factor * ry * px / rx;
        const centerX = c * cx - s * cy + (x + nx) / 2;
        const centerY = s * cx + c * cy + (y + ny) / 2;
        const angle = Math.atan2((py - cy) / ry, (px - cx) / rx);
        let delta = Math.atan2((-py - cy) / ry, (-px - cx) / rx) - angle;
        if (sweep && delta < 0) delta += Math.PI * 2;
        if (!sweep && delta > 0) delta -= Math.PI * 2;
        const steps = Math.ceil(Math.abs(delta) / (2 * Math.acos(1 - Math.min(1, 0.01 / Math.max(rx, ry)))));
        for (let step = 1; step < steps; step++) {
          const a = angle + delta * step / steps;
          line(centerX + c * rx * Math.cos(a) - s * ry * Math.sin(a),
            centerY + s * rx * Math.cos(a) + c * ry * Math.sin(a));
        }
        line(nx, ny);
        break;
      }
      case 'Z': line(startX, startY); command = null; break;
      default: throw new Error(`Unsupported shape path command: ${command}`);
    }
  }
  // Index edges by 1-unit vertical band in flat arrays: the optimizer makes
  // millions of point queries, and each one only scans the few edges that can
  // cross its row. The crossing arithmetic is unchanged, so results are exact.
  let top = Infinity, bottom = -Infinity;
  for (const edge of edges) {
    top = Math.min(top, edge.y, edge.ny);
    bottom = Math.max(bottom, edge.y, edge.ny);
  }
  const first = Math.floor(top), bandCount = edges.length ? Math.floor(bottom) - first + 1 : 0;
  const bandEdges = Array.from({ length: bandCount }, () => []);
  edges.forEach((edge, index) => {
    for (let band = Math.floor(Math.min(edge.y, edge.ny)); band <= Math.floor(Math.max(edge.y, edge.ny)); band++) {
      bandEdges[band - first].push(index);
    }
  });
  const offsets = new Uint32Array(bandCount + 1);
  bandEdges.forEach((list, band) => { offsets[band + 1] = offsets[band] + list.length; });
  const data = new Float64Array(offsets[bandCount] * 4);
  bandEdges.flat().forEach((index, slot) => {
    const e = edges[index];
    data.set([e.x, e.y, e.nx, e.ny], slot * 4);
  });
  return {
    contour,
    contains(px, py) {
      const band = Math.floor(py) - first;
      if (!(band >= 0 && band < bandCount)) return false;
      let winding = 0;
      for (let k = offsets[band] * 4, end = offsets[band + 1] * 4; k < end; k += 4) {
        const x = data[k], y = data[k + 1], nx = data[k + 2], ny = data[k + 3];
        if ((y > py) === (ny > py)) continue;
        if (px < x + (py - y) * (nx - x) / (ny - y)) winding += ny > y ? 1 : -1;
      }
      return winding !== 0;
    }
  };
}
