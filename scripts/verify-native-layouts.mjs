// Usage: node scripts/verify-native-layouts.mjs swift-layouts.json kotlin-layouts.json
// PLAYWRIGHT_MODULE may point to an existing Playwright installation.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { shapes } from '../index.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage();
  for (const file of process.argv.slice(2)) {
    const layouts = JSON.parse(await readFile(file, 'utf8'));
    const report = await page.evaluate(({ layouts, shapes }) => {
      const context = document.createElement('canvas').getContext('2d');
      const paths = Object.fromEntries(shapes.map(s => [s.key, new Path2D(s.path)]));
      const directions = Array.from({ length: 720 }, (_, i) => ({ x: Math.cos(i * Math.PI / 360), y: Math.sin(i * Math.PI / 360) }));
      const failures = [];
      let minGap = Infinity, worstAreaRatio = 1;
      for (const layout of layouts) {
        const label = `${layout.shape}/${layout.count}/${layout.seed}`;
        const holes = layout.holes.map(h => ({ ...h, c: Math.cos(h.rotation * Math.PI / 180), s: Math.sin(h.rotation * Math.PI / 180) }));
        if (holes.length !== layout.count) failures.push(`${label}: count`);
        const areas = holes.map(h => h.rx * h.ry);
        if (areas.length) {
          const ratio = Math.max(...areas) / Math.min(...areas);
          worstAreaRatio = Math.max(worstAreaRatio, ratio);
          if (!Number.isFinite(ratio) || ratio > 1.001) failures.push(`${label}: area`);
        }
        for (const [i, h] of holes.entries()) {
          for (const n of directions) {
            const nx = n.x / h.rx, ny = n.y / h.ry, len = Math.hypot(nx, ny);
            const x = h.cx + h.rx * n.x * h.c - h.ry * n.y * h.s + 11.5 * (nx * h.c - ny * h.s) / len;
            const y = h.cy + h.rx * n.x * h.s + h.ry * n.y * h.c + 11.5 * (nx * h.s + ny * h.c) / len;
            if (!context.isPointInPath(paths[layout.shape], x, y)) { failures.push(`${label}: rim`); break; }
          }
          for (const other of holes.slice(0, i)) {
            const support = (e, n) => Math.hypot(e.rx * (n.x * e.c + n.y * e.s), e.ry * (-n.x * e.s + n.y * e.c));
            const gap = Math.max(...directions.map(n => Math.abs((h.cx - other.cx) * n.x + (h.cy - other.cy) * n.y) - support(h, n) - support(other, n)));
            minGap = Math.min(minGap, gap);
            if (gap < 11.9) failures.push(`${label}: gap ${gap}`);
          }
        }
      }
      return { checked: layouts.length, minGap, worstAreaRatio, failures };
    }, { layouts, shapes });
    console.log(file, JSON.stringify(report));
    assert.equal(report.checked, 630);
    assert.deepEqual(report.failures, []);
  }
} finally { await browser.close(); }
