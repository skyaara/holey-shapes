// Usage: node scripts/set-version.mjs 2.1.0
// Sets the release version everywhere it is written down: the npm package,
// the Gradle fallback, the install snippets in the docs and, when present,
// the website checkout in web/ (it is not part of this repository).
// Swift Package Manager and JitPack take their version from the git tag.
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';

const next = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(next ?? '')) {
  console.error('Usage: node scripts/set-version.mjs <major.minor.patch>');
  process.exit(1);
}
const root = new URL('../', import.meta.url);
const current = JSON.parse(await readFile(new URL('packages/js/package.json', root), 'utf8')).version;
const version = String.raw`\d+\.\d+\.\d+`;
const edits = {
  'packages/js/package.json': [[/("version": ")\d+\.\d+\.\d+"/, `$1${next}"`]],
  'web/package.json': [[/("version": ")\d+\.\d+\.\d+"/, `$1${next}"`]],
  'packages/android/build.gradle.kts': [[new RegExp(`(\\.orElse\\(")${version}("\\))`), `$1${next}$2`]],
  'README.md': [
    [new RegExp(`(from: ")${version}"`, 'g'), `$1${next}"`],
    [new RegExp(`(holey-shapes(?:-core)?:v?)${version}`, 'g'), (_, prefix) => `${prefix}${next}`],
  ],
  'web/docs/index.html': [
    [new RegExp(`(from: ")${version}"`, 'g'), `$1${next}"`],
    [new RegExp(`(holey-shapes:v)${version}`, 'g'), `$1${next}`],
    [new RegExp(`(MIT · v)${version}`, 'g'), `$1${next}`],
  ],
  'web/index.html': [
    [new RegExp(`("version": ")${version}"`), `$1${next}"`],
    [new RegExp(`(MIT · v)${version}`, 'g'), `$1${next}`],
  ],
};
for (const [file, replacements] of Object.entries(edits)) {
  const url = new URL(file, root);
  if (file.startsWith('web/') && !existsSync(url)) continue;
  const before = await readFile(url, 'utf8');
  const after = replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), before);
  if (after === before && current !== next) throw new Error(`No version found to update in ${file}`);
  await writeFile(url, after);
}
console.log(`${current} → ${next}. Update CHANGELOG.md, then tag v${next}.`);
