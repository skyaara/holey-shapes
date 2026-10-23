import { createHoleySvg } from '../../packages/js/index.js';

self.onmessage = ({ data }) => {
  const started = performance.now();
  const svg = createHoleySvg(data.options);
  self.postMessage({ id: data.id, svg, ms: performance.now() - started });
};
