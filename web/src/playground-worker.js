import { createHoleySvg, identityHash, seededHoleyOptions, shapeNames, shapes } from '../../packages/js/index.js';

// Runs the hero's editable snippet. A `// →` comment shows the value of the
// single-line statement or declaration just above it, like a REPL.
const RESULT = /^\s*\/\/ →/;
const IMPORT = /^[ \t]*import\s[^;]*?from\s+['"]holey-shapes['"];?/gm;
const DECLARATION = /^(\s*(?:const|let|var)\s+)([A-Za-z_$][\w$]*)(\s*=\s*)([^;]+);\s*$/;
const STATEMENT = /^\s*(?!const\b|let\b|var\b|return\b|if\b|for\b|while\b|\/\/)([^;]+);\s*$/;

function compile(code) {
  const lines = code.split('\n');
  // Blank out imports but keep their newlines so line numbers still match.
  const body = code.replace(IMPORT, (statement) => statement.replace(/[^\n]/g, '')).split('\n');
  lines.forEach((line, index) => {
    if (!RESULT.test(line)) return;
    let target = index - 1;
    while (target >= 0 && lines[target].trim() === '') target -= 1;
    if (target < 0) return;
    const declared = DECLARATION.exec(body[target]);
    const match = STATEMENT.exec(body[target]);
    if (declared) body[target] = `${declared[1]}${declared[2]}${declared[3]}(${declared[4]}); __results[${index}] = ${declared[2]};`;
    else if (match) body[target] = `__results[${index}] = (${match[1]});`;
  });
  return body.join('\n');
}

function format(value, depth = 0) {
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (value === null || typeof value !== 'object') return String(value);
  if (depth > 1) return Array.isArray(value) ? '[…]' : '{…}';
  if (Array.isArray(value)) {
    const items = value.slice(0, 3).map((item) => format(item, depth + 1));
    return `[${items.join(', ')}${value.length > 3 ? `, … ${value.length - 3} more` : ''}]`;
  }
  const entries = Object.entries(value).map(([key, item]) => `${key}: ${format(item, depth + 1)}`);
  return `{ ${entries.join(', ')} }`;
}

self.onmessage = ({ data }) => {
  const results = {};
  try {
    const run = new Function(
      'createHoleySvg', 'identityHash', 'seededHoleyOptions', 'shapes', 'shapeNames', '__results',
      `const avatar = { innerHTML: '' };\n${compile(data.code)}\n;return { svg: avatar.innerHTML, id: typeof id === 'string' ? id : undefined };`
    );
    const { svg, id } = run(createHoleySvg, identityHash, seededHoleyOptions, shapes, shapeNames, results);
    const shown = Object.fromEntries(Object.entries(results).map(([line, value]) => [line, `// → ${format(value)}`]));
    self.postMessage({ request: data.request, svg: String(svg), id, results: shown });
  } catch (error) {
    self.postMessage({ request: data.request, error: `${error.name}: ${error.message}` });
  }
};
