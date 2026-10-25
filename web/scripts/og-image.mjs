// Usage: node scripts/og-image.mjs
// Renders the site's default link preview (public/og-image.svg and .png): the
// headline beside a grid of real seeded holeys, in the site's paper style.
import { readFile, writeFile } from 'node:fs/promises';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { createHoleySvg, seededHoleyOptions } from '../../packages/js/index.js';

const root = new URL('../', import.meta.url);
await initWasm(await readFile(new URL('node_modules/@resvg/resvg-wasm/index_bg.wasm', root)));
const fonts = await Promise.all(['server/fonts/geist-medium.bin', 'server/fonts/geist-mono-semibold.bin'].map((f) => readFile(new URL(f, root))));

const NAMES = ['ada', 'grace', 'linus', 'radia', 'main-agent', 'planner', 'bugbot', 'hedy', 'deploy-bot'];
const holeys = NAMES.map((name, k) => {
  const x = 660 + (k % 3) * 170, y = 85 + Math.floor(k / 3) * 160;
  return createHoleySvg({ ...seededHoleyOptions(name, false), idPrefix: `og-${k}` })
    .replace(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 420 420"/, `<svg x="${x}" y="${y}" width="150" height="150" viewBox="-10 -10 450 450" overflow="visible"`);
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#F4EFE6"/>
<text x="80" y="250" font-family="Geist" font-weight="500" font-size="76" letter-spacing="-2" fill="#161513">Avatars</text>
<text x="80" y="335" font-family="Geist" font-weight="500" font-size="76" letter-spacing="-2" fill="#161513">with holes.</text>
<text x="82" y="540" font-family="Geist Mono" font-size="24" fill="#161513">npm i holey-shapes</text>
<text x="82" y="575" font-family="Geist Mono" font-size="20" fill="#77716A">holey-shapes.aakashreddy.com</text>
${holeys}
</svg>`;

await writeFile(new URL('public/og-image.svg', root), svg);
const png = new Resvg(svg, { font: { fontBuffers: fonts.map((f) => new Uint8Array(f)), loadSystemFonts: false, defaultFontFamily: 'Geist' } }).render().asPng();
await writeFile(new URL('public/og-image.png', root), png);
console.log(`Wrote public/og-image.png (${png.length} bytes)`);
