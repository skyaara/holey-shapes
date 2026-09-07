import { createHoleySvg, shapes } from './script.js';

let instance = 0;
// Each inline SVG needs its own mask and filter IDs. Scope embedded hover CSS, too.
function render(target, options) {
  const id = `holey-site-${instance++}`;
  target.innerHTML = createHoleySvg(options)
    .replace('<svg ', `<svg class="${id}" `)
    .replaceAll('id="h"', `id="${id}-h"`).replaceAll('url(#h)', `url(#${id}-h)`)
    .replaceAll('id="e"', `id="${id}-e"`).replaceAll('url(#e)', `url(#${id}-e)`)
    .replaceAll('svg:hover .hole-hover', `.${id}:hover .hole-hover`);
  if (target.classList.contains('hero-drift')) {
    const svg = target.querySelector('svg');
    // Rotate the masked face inside an unrotated extrusion filter. Its offsets
    // therefore stay down and right in screen space throughout the spin.
    svg.querySelector('style')?.remove();
    const extrusion = svg.querySelector('g[filter]');
    const face = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    face.classList.add('hero-face');
    face.append(...extrusion.childNodes);
    extrusion.append(face);
    svg.querySelectorAll('.hole-hover').forEach(hole => {
      hole.classList.replace('hole-hover', 'hero-hole');
      hole.removeAttribute('style');
    });
  }

}

let heroSeed = 0;
function renderArt() {
  document.querySelectorAll('[data-shape]').forEach(el => render(el, {
    shape: el.dataset.shape, color: el.dataset.color, holes: 6, seed: heroSeed,
  }));
}
renderArt();
document.querySelector('#shuffle-hero')?.addEventListener('click', () => { heroSeed++; renderArt(); });

const hero = document.querySelector('.hero');
if (hero) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  let entered = false;
  const activeSpins = new Set();
  const entrances = [];
  function syncMotion() {
    if (reduced.matches || !visible || document.hidden) {
      activeSpins.forEach(animation => animation.cancel());
    }
  }
  hero.querySelectorAll('.hero-art').forEach((button, index) => {
    const shape = shapes.find(s => s.key === button.firstElementChild.dataset.shape);
    button.setAttribute('aria-label', `Spin ${shape.name}`);
    let spin;
    const startSpin = (delay = 0) => {
      if (reduced.matches || !visible || document.hidden) return;
      spin?.cancel();
      const angle = parseFloat(button.style.getPropertyValue('--rotation')) || 0;
      spin = button.querySelector('.hero-face').animate(
        [{ transform: `rotate(${angle}deg)` }, { transform: `rotate(${angle + 360}deg)` }],
        { duration: 1100, delay, easing: 'cubic-bezier(.25,.65,.3,1)' }
      );
      const current = spin;
      activeSpins.add(current);
      current.finished.catch(() => {}).finally(() => activeSpins.delete(current));
    };
    button.addEventListener('pointerenter', () => startSpin());
    button.addEventListener('focus', () => startSpin());
    button.addEventListener('click', () => startSpin());
    entrances.push(() => startSpin(index * 65));
  });
  reduced.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    syncMotion();
    if (visible && !document.hidden && !entered) {
      entered = true;
      entrances.forEach(start => start());
    }
  }).observe(hero);
}


const catalog = document.querySelector('#catalog');
if (catalog) {
  shapes.forEach((shape, index) => {
    const card = document.createElement('article');
    card.className = 'catalog-card';
    card.innerHTML = `<a class="catalog-link" href="/?shape=${shape.key}#customize" aria-label="Customize ${shape.name}"><div class="catalog-art"></div></a><div class="catalog-caption"><a href="/?shape=${shape.key}#customize">${shape.name}</a><button type="button" class="catalog-shuffle" aria-label="Shuffle ${shape.name}">Shuffle ↻</button></div>`;
    let seed = 0;
    const art = card.querySelector('.catalog-art');
    render(art, { shape: shape.key, holes: shape.initial, seed });
    card.querySelector('.catalog-shuffle').addEventListener('click', () => {
      render(art, { shape: shape.key, holes: shape.initial, seed: ++seed });
    });
    catalog.append(card);
  });
}

const form = document.querySelector('#custom-controls');
if (form) {
  const requested = new URLSearchParams(location.search).get('shape');
  let selected = shapes.find(s => s.key === requested) || shapes.find(s => s.key === 'round-block');
  const options = { shape: selected.key, color: requested ? selected.color : '#B5F024', shadowColor: '#506A10', holes: 5, animated: true, duration: 900, shadowX: 18, shadowY: 21, shadowSteps: 12, seed: 0 };
  const darker = color => '#' + color.slice(1).match(/../g).map(c => Math.round(parseInt(c,16)*.42).toString(16).padStart(2,'0')).join('');
  if (requested) options.shadowColor = darker(selected.color);
  form.elements.color.value = options.color;
  form.elements.shadowColor.value = options.shadowColor;
  const preview = document.querySelector('#custom-preview');
  function update() {
    render(preview, options);
    document.querySelectorAll('[data-pick]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pick === options.shape)));
    form.querySelectorAll('output').forEach(o => { const key = o.htmlFor.value; o.value = options[key] + (key === 'duration' ? ' ms' : ''); });
  }
  for (const shape of shapes) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.pick = shape.key; button.title = shape.name;
    button.setAttribute('aria-label', shape.name);
    button.innerHTML = `<svg viewBox="0 0 420 420" aria-hidden="true"><path d="${shape.path}" fill="currentColor"/></svg>`;
    button.addEventListener('click', () => { options.shape = shape.key; selected = shape; update(); });
    document.querySelector('#shape-picker').append(button);
  }
  let frame;
  form.addEventListener('submit', e => e.preventDefault());
  form.addEventListener('input', e => {
    const input = e.target;
    if (!input.name || !input.validity.valid) return;
    options[input.name] = input.type === 'checkbox' ? input.checked : input.type === 'color' ? input.value : Number(input.value);
    cancelAnimationFrame(frame); frame = requestAnimationFrame(update);
  });
  document.querySelector('#shuffle').addEventListener('click', () => {
    options.seed = options.seed >= 1000000 ? 0 : options.seed + 1;
    form.elements.seed.value = options.seed; update();
  });
  document.querySelector('#download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([createHoleySvg(options)], {type:'image/svg+xml'}));
    const link = document.createElement('a'); link.href = url; link.download = `holey-${options.shape}.svg`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  update();
}
