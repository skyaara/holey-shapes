import { createHoleySvg, shapes } from '../../packages/js/index.js';
import './chrome.js';
import { highlight } from './highlight.js';

for (const code of document.querySelectorAll('.docs-body pre code')) {
  code.innerHTML = highlight(code.textContent);
}

const list = document.getElementById('shape-list');
for (const shape of shapes) {
  const item = document.createElement('li');
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  const label = document.createElement('code');
  label.textContent = shape.key;
  item.append(avatar, label);
  list.append(item);
}

// Render one shape per frame so the page stays responsive while layouts pack.
const avatars = [...list.querySelectorAll('.avatar')];
function next(index = 0) {
  if (index >= shapes.length) return;
  avatars[index].innerHTML = createHoleySvg({ shape: shapes[index].key, seed: index + 3, doodle: true, animated: false, idPrefix: `doc-${shapes[index].key}` });
  avatars[index].classList.add('ready');
  requestAnimationFrame(() => next(index + 1));
}
next();
