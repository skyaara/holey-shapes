import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const packageMetadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const pages = [
  ['index.html', 'https://holey-shapes.aakashreddy.com/'],
  ['present.html', 'https://holey-shapes.aakashreddy.com/present']
];

for (const [file, canonical] of pages) {
  const html = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.match(html, /<meta\s+name="description"\s+content="[^"]+"/);
  assert.match(html, new RegExp(`<link rel="canonical" href="${canonical.replaceAll('.', '\\.')}`));
  assert.match(html, /<meta property="og:image" content="https:\/\/holey-shapes\.aakashreddy\.com\/og-image\.png"/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
  assert.match(html, /<link rel="manifest" href="\/site\.webmanifest"/);
  assert.match(html, new RegExp(`<strong>v${packageMetadata.version.replaceAll('.', '\\.')}</strong>`));
}

const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const structuredData = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
assert.ok(structuredData, 'Homepage must include JSON-LD metadata');
assert.equal(JSON.parse(structuredData)['@type'], 'WebApplication');
assert.equal(JSON.parse(structuredData).softwareVersion, packageMetadata.version);

for (const asset of ['logo.svg', 'apple-touch-icon.png', 'og-image.png', 'robots.txt', 'sitemap.xml', 'site.webmanifest']) {
  await access(new URL(`../public/${asset}`, import.meta.url));
}

const logo = await readFile(new URL('../public/logo.svg', import.meta.url), 'utf8');
assert.match(logo, /fill="#ff0878"/);

const socialImage = await readFile(new URL('../public/og-image.svg', import.meta.url), 'utf8');
assert.doesNotMatch(socialImage, /<text\b/);
assert.equal(socialImage.match(/<g\b/g)?.length, 3);

const script = await readFile(new URL('../script.js', import.meta.url), 'utf8');
assert.match(script, /hole-open-close/);
assert.doesNotMatch(script, /shape-spin|object-spin/);

console.log('site metadata smoke test passed');
