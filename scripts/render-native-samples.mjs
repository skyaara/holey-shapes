import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { shapes } from '../index.js';
const folder = new URL('../artifacts/native-verification/', import.meta.url);
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sections = [];
for (const language of ['swift', 'kotlin']) {
  const cards = [];
  for (const shape of shapes) {
    const source = await readFile(new URL(`${language}/${shape.key}.svg`, folder), 'utf8');
    assert.equal([...source.matchAll(/<ellipse /g)].length, shape.initial, `${language}/${shape.key}: hole count`);
    cards.push(`<figure><img src="${language}/${shape.key}.svg" alt="${shape.name}"><figcaption>${shape.name}<span>${shape.initial} holes · seed 7</span></figcaption></figure>`);
  }
  sections.push(`<section><h2>${language === 'swift' ? 'Swift' : 'Kotlin JVM'}<small>Generated in a command-line process</small></h2><div class="grid">${cards.join('')}</div></section>`);
}
const html = `<!doctype html><meta charset="utf-8"><title>Swift and Kotlin generated shapes</title><style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#f7f6f2;color:#252038;font:14px system-ui}h1{font-size:26px;margin:0 0 6px}p{margin:0 0 26px;color:#625c70}h2{font-size:21px;margin:0 0 12px}small{font-size:12px;font-weight:400;color:#625c70;margin-left:16px}.grid{display:grid;grid-template-columns:repeat(7,1fr);gap:14px}section+section{margin-top:28px}figure{margin:0;background:white;border-radius:12px;padding:10px 8px 14px}img{display:block;width:100%;aspect-ratio:1}figcaption{text-align:center;font-size:12px}span{display:block;font-size:10px;color:#746c7f;margin-top:3px}</style><h1>Swift and Kotlin generated shapes</h1><p>14 shapes per SDK. Native SDKs compute the holes and write the SVG files; Chrome displays the results.</p>${sections.join('')}`;
await writeFile(new URL('index.html', folder), html);
const browser = await chromium.launch({headless:true, channel:'chrome'});
try {
  const page = await browser.newPage({viewport:{width:1480,height:1100},deviceScaleFactor:1});
  await page.goto(new URL('index.html', folder).href);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
  assert.equal(await page.locator('img').count(), 28);
  await page.screenshot({path:fileURLToPath(new URL('comparison.png', folder)),fullPage:true});
  console.log('Rendered and decoded all 28 native-generated SVG files.');
} finally { await browser.close(); }
