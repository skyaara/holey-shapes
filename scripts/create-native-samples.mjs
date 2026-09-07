// Generates every sample with the Swift and Kotlin SDKs, then checks and renders them.
// Requires Swift, JDK 17, Playwright, and Google Chrome.
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { shapes } from '../index.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = `${root}artifacts/native-verification`;
await mkdir(output, {recursive:true});
await writeFile(`${output}/catalog.json`, JSON.stringify(shapes));
await writeFile(`${output}/catalog.tsv`, shapes.map(s => [s.key,s.path,s.color].join('\t')).join('\n'));
function run(command, args) {
  const result = spawnSync(command, args, {cwd:root, stdio:'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited ${result.status}`);
}
run('swift', ['run','--package-path','tests/native/swift','-c','release','Verify',`${output}/swift-layouts.json`,`${output}/catalog.json`,`${output}/swift`]);
run('./gradlew', [':core:verifyPacking',`-PshapeCatalog=${output}/catalog.tsv`,`-PshapeOutput=${output}/kotlin`]);
run(process.execPath, ['scripts/verify-native-layouts.mjs',`${output}/swift-layouts.json`,'core/build/packing-layouts.json']);
run(process.execPath, ['scripts/render-native-samples.mjs']);
