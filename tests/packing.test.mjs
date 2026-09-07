import assert from 'node:assert/strict';
import { createHoleySvg, shapeNames } from '../index.js';

// Exercise the public SDK in a process with no browser globals or Canvas polyfill.
assert.equal(typeof document, 'undefined');
assert.equal(typeof Path2D, 'undefined');
let checked = 0;
for (const { key } of shapeNames) {
  for (let count = 0; count <= 8; count++) {
    for (const seed of [0, 1, 7, 42, -19]) {
      const options = { shape: key, holes: count, seed, animated: false };
      const svg = createHoleySvg(options);
      assert.equal(createHoleySvg(options), svg, `${key}: deterministic generation`);
      const holes = [...svg.matchAll(/<ellipse\b([^>]+)>/g)].map(([, attrs]) =>
        Object.fromEntries([...attrs.matchAll(/(cx|cy|rx|ry)="([^"]+)"/g)].map(([, k, v]) => [k, Number(v)])));
      const label = `${key}/${count}/${seed}`;
      assert.equal(holes.length, count, label);
      const areas = holes.map(h => h.rx * h.ry);
      if (count) {
        assert.ok(areas.every(area => Number.isFinite(area) && area > 0), label);
        assert.ok(Math.max(...areas) / Math.min(...areas) < 1.001, `${label}: equal areas`);
      }
      // The former fallback included holes outside the long bar's SVG body.
      if (key === 'long-bar') {
        for (const h of holes) assert.ok(h.cy > 157 && h.cy < 263, `${label}: inside bar`);
      }
      // A single packed hole must grow well beyond the preset fallback sizes.
      if (key === 'disc' && count === 1) assert.ok(areas[0] > 10000, `${label}: full optimization`);
      checked++;
    }
  }
}
console.log(`Node packing passed: ${checked} layouts without DOM or Path2D`);
