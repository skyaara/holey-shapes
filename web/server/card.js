import { Resvg, initWasm } from '@resvg/resvg-wasm';
import wasm from '@resvg/resvg-wasm/index_bg.wasm';
import { createHoleySvg, identityHash, seededHoleyOptions } from '../../packages/js/index.js';
import geistMedium from './fonts/geist-medium.bin';
import geistMono from './fonts/geist-mono-semibold.bin';

// Bump when the card design changes so cached PNGs are replaced.
export const CARD_VERSION = 4;
const WIDTH = 1200;
const HEIGHT = 630;
const CHIPS = ['#FFD000', '#00C9F2', '#FF4FA3', '#9BED00'];
const fonts = [new Uint8Array(geistMedium), new Uint8Array(geistMono)];
let ready;

// The link preview X shows for /@handle: the holey, the handle and its hash,
// in the site's dark stage. X cards need a raster image, so the SVG is drawn
// to PNG with resvg.
export function cardSvg(handle) {
  const seeded = seededHoleyOptions(handle, false);
  const hash = identityHash(handle);
  // Let the extrusion spill past the 420 view box instead of being clipped.
  const holey = createHoleySvg({ ...seeded, idPrefix: 'card' })
    .replace(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 420 420"/, '<svg x="70" y="85" width="460" height="460" viewBox="-10 -10 450 450" overflow="visible"');
  const name = `@${handle}`;
  const size = Math.min(104, Math.floor(560 / (name.length * 0.56)));
  const chips = hash.match(/.{4}/g).map((group, index) => {
    const x = 600 + index * 136;
    return `<rect x="${x}" y="318" width="122" height="60" rx="14" fill="${CHIPS[index]}"/><text x="${x + 61}" y="359" text-anchor="middle" font-family="Geist Mono" font-size="30" fill="#0B0B0B">${group}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<rect width="${WIDTH}" height="${HEIGHT}" fill="#0B0B0B"/>
${holey}
<text x="600" y="270" font-family="Geist" font-weight="500" font-size="${size}" letter-spacing="-2" fill="#F5F2EA">${name}</text>
${chips}
<text x="600" y="430" font-family="Geist Mono" font-size="24" fill="#8F8F8F">${seeded.shape} · seed ${seeded.seed}</text>
<text x="600" y="548" font-family="Geist" font-weight="500" font-size="30" fill="#F5F2EA">holey-shapes</text>
<text x="822" y="548" font-family="Geist Mono" font-size="22" fill="#8F8F8F">holey-shapes.aakashreddy.com</text>
</svg>`;
}

export async function renderCard(handle) {
  ready ??= initWasm(wasm);
  await ready;
  const image = new Resvg(cardSvg(handle), {
    font: { fontBuffers: fonts, loadSystemFonts: false, defaultFontFamily: 'Geist' },
    fitTo: { mode: 'width', value: WIDTH },
  });
  return image.render().asPng();
}
