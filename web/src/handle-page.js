import { createHoleySvg, identityHash, seededHoleyOptions } from '../../packages/js/index.js';
import './chrome.js';
import { handleFromPath, normalizeHandle, shareOnX, shareUrl, validHandle } from './handle.js';
import { highlight } from './highlight.js';

// The page for one handle: /@handle (or /handle/?name=handle). It draws that
// handle's holey, solid or doodle, with download, copy and share actions.
const byId = (id) => document.getElementById(id);
const handle = handleFromPath(location.pathname) || (() => {
  const name = normalizeHandle(new URLSearchParams(location.search).get('name'));
  return validHandle(name) ? name : '';
})();

function flash(button, text) {
  const label = button.querySelector('span') ?? button;
  const original = label.textContent;
  label.textContent = text;
  byId('p-status').textContent = text;
  setTimeout(() => { label.textContent = original; }, 1400);
}

function svgFor(doodle, animated) {
  return createHoleySvg({ ...seededHoleyOptions(handle, animated), doodle, idPrefix: `profile-${handle}` });
}

function updateCode(doodle) {
  const literal = JSON.stringify(handle);
  const web = `import { createHoleySvg, seededHoleyOptions } from 'holey-shapes';

avatar.innerHTML = createHoleySvg({
  ...seededHoleyOptions(${literal}),${doodle ? '\n  doodle: true,' : ''}
  idPrefix: ${literal},
});`;
  const swift = `import HoleyShapes

HoleyShapeView(configuration: .seeded(${literal}))
  .frame(width: 64, height: 64)`;
  const compose = `import com.aakashreddy.holeyshapes.*

HoleyShapeView(
  config = HoleyShapeConfig.seeded(${JSON.stringify(handle).replaceAll('$', '\\$')}),
  modifier = Modifier.size(64.dp),
  contentDescription = null,
)`;
  for (const [platform, code] of Object.entries({ web, swift, compose })) byId(`p-code-${platform}`).innerHTML = highlight(code);
}

function render() {
  const doodle = byId('p-doodle').checked;
  byId('p-avatar').innerHTML = svgFor(doodle, true);
  byId('p-avatar').classList.add('ready');
  byId('p-art').classList.toggle('paper', doodle);
  updateCode(doodle);
}

if (!handle) {
  byId('profile').hidden = true;
  document.querySelector('.profile-code').hidden = true;
  byId('p-missing').hidden = false;
} else {
  const seeded = seededHoleyOptions(handle, false);
  document.title = `@${handle}'s holey · holey-shapes`;
  byId('p-name').textContent = `@${handle}`;
  byId('p-avatar').setAttribute('aria-label', `@${handle}'s holey`);
  byId('p-hash').innerHTML = identityHash(handle).match(/.{4}/g).map((group) => `<span>${group}</span>`).join('');
  byId('p-meta').textContent = `${seeded.shape} · ${seeded.holes} holes · seed ${seeded.seed}`;
  byId('p-share-x').href = shareOnX(handle, `@${handle}'s holey.`);
  byId('p-doodle').addEventListener('change', render);
  byId('p-download').addEventListener('click', (event) => {
    const doodle = byId('p-doodle').checked;
    const url = URL.createObjectURL(new Blob([svgFor(doodle, false)], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `holey-${handle}${doodle ? '-doodle' : ''}.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash(event.currentTarget, 'Downloaded');
  });
  byId('p-copy-svg').addEventListener('click', async (event) => {
    try {
      await navigator.clipboard.writeText(svgFor(byId('p-doodle').checked, false));
      flash(event.currentTarget, 'Copied');
    } catch { flash(event.currentTarget, 'Press ⌘C'); }
  });
  byId('p-copy-link').addEventListener('click', async (event) => {
    try {
      await navigator.clipboard.writeText(shareUrl(handle));
      flash(event.currentTarget, 'Copied');
    } catch { flash(event.currentTarget, 'Press ⌘C'); }
  });
  render();
}

document.querySelector('[data-copy-panel="profile"]').addEventListener('click', async (event) => {
  const panel = document.querySelector('.profile-code [role="tabpanel"]:not([hidden])');
  try {
    await navigator.clipboard.writeText(panel.textContent);
    flash(event.currentTarget, 'Copied');
  } catch { flash(event.currentTarget, 'Press ⌘C'); }
});

byId('p-go').addEventListener('submit', (event) => {
  event.preventDefault();
  const next = normalizeHandle(byId('p-go-input').value);
  if (validHandle(next)) location.href = `/@${next}`;
  else byId('p-go-input').setAttribute('aria-invalid', 'true');
});
byId('p-go-input').addEventListener('input', (event) => event.currentTarget.removeAttribute('aria-invalid'));
