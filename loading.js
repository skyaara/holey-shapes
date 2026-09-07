import { shapes, createHoleySvg } from './script.js';

const loops = [
  { id:'breathe', name:'Deep breath', shape:'flower-star', label:'A MOMENT TO BREATHE', use:'Waiting for you', caption:'The openings breathe together. A soft lift and a settling shadow keep the whole avatar alive.', duration:3.6 },
  { id:'blink', name:'Passing a thought', shape:'round-block', label:'TAKING A MOMENT', use:'Thinking through it', caption:'Slow, overlapping blinks let several holes close together, then gently open again.', duration:4.8 },
  { id:'ripple', name:'Ripple relay', shape:'disc', label:'AROUND IT GOES', use:'Making something', caption:'A continuous wave flows clockwise through the holes. Neighboring openings pulse together in an overlapping rhythm.', duration:3.2 },
  { id:'rock', name:'Weight of a thought', shape:'hex', label:'TURNING IT OVER', use:'Working on it', caption:'The slab rocks in place while its extrusion changes direction. Even the inside edges shift.', duration:2.6 },
  { id:'plugs', name:'Out of office', shape:'capsule', label:'BACK IN A SECOND', use:'Getting things ready', caption:'Little pieces lift out of their holes, hover for a beat, then drop back in, one after another.', duration:3.6 }
];
const grid = document.querySelector('.loading-grid');
const darken = color => '#' + color.slice(1).match(/../g).map(c => Math.round(parseInt(c,16)*.43).toString(16).padStart(2,'0')).join('');
const pale = color => '#' + color.slice(1).match(/../g).map(c => Math.round(parseInt(c,16)*.19+255*.81).toString(16).padStart(2,'0')).join('');

function makeSvg(loop, shape, color, id, seed, count, phase) {
  const parsed = new DOMParser().parseFromString(createHoleySvg({shape:shape.key, color, holes:count, seed, animated:false}), 'image/svg+xml');
  const holes = [...parsed.querySelectorAll('mask ellipse')].map(el => ({
    x:+el.getAttribute('cx'), y:+el.getAttribute('cy'), rx:+el.getAttribute('rx'), ry:+el.getAttribute('ry'), angle:Number(el.getAttribute('transform')?.match(/rotate\(([-\d.]+)/)?.[1] || 0)
  })).sort((a,b) => a.x-b.x);
  // In SVG coordinates, increasing angle runs clockwise. Start at twelve o'clock.
  const clockwiseAngle = h => (Math.atan2(h.y-210,h.x-210)+Math.PI/2+Math.PI*2)%(Math.PI*2);
  if (loop.id === 'ripple') holes.sort((a,b) => clockwiseAngle(a)-clockwiseAngle(b));
  const duration = loop.duration;
  const ink = darken(color);
  const scope = `.${id}`;
  const css = `
${scope} .eyelid,${scope} .aperture,${scope} .slab,${scope} .depth,${scope} .plug-shadow,${scope} .plug{animation-duration:${duration}s;animation-iteration-count:infinite;animation-timing-function:ease-in-out;animation-delay:${-phase}s}
${scope} .aperture,${scope} .plug{animation-delay:calc(${-phase}s + var(--i) * ${-duration/7}s)}
${scope} .slab{transform-origin:210px 210px}
${scope}.breathe .aperture{animation-name:${id}-breath;animation-delay:${-phase}s}
${scope}.breathe .slab{animation-name:${id}-float}
${scope}.blink .eyelid{animation-name:${id}-blink;animation-delay:calc(${-duration-phase}s + var(--i) * ${duration/holes.length}s)}
${scope}.ripple .aperture{animation-name:${id}-ripple;animation-delay:calc(${-duration-phase}s + var(--i) * ${duration/holes.length}s)}
${scope}.rock .slab{animation-name:${id}-rock}
${scope}.rock .depth{animation-name:${id}-depth}
${scope}.rock .aperture{animation-name:${id}-look}
${scope}.plugs .plug{animation-name:${id}-plug}
${scope}.plugs .plug-shadow{animation-name:${id}-plug-shadow;animation-delay:calc(${-phase}s + var(--i) * ${-duration/7}s)}
${scope}.plugs .aperture{animation-name:${id}-seat;animation-delay:calc(${-phase}s + var(--i) * ${-duration/7}s)}
@keyframes ${id}-breath{0%,100%{transform:scale(.48)}50%{transform:scale(1)}}
@keyframes ${id}-float{0%,100%{transform:translateY(4px) scale(.97)}50%{transform:translateY(-7px) scale(1)}}
@keyframes ${id}-blink{0%,65%,100%{transform:scaleY(1)}20%,45%{transform:scaleY(0)}}
@keyframes ${id}-ripple{0%,100%{transform:scale(1)}50%{transform:scale(.22)}}
@keyframes ${id}-rock{0%,100%{transform:rotate(-7deg) scaleX(.96)}50%{transform:rotate(7deg) scaleX(1)}}
@keyframes ${id}-depth{0%,100%{transform:translate(calc(var(--step) * -1px),calc(var(--step) * 1.5px))}50%{transform:translate(calc(var(--step) * 1.7px),calc(var(--step) * .5px))}}
@keyframes ${id}-look{0%,100%{transform:scaleX(.82)}50%{transform:scaleX(1)}}
@keyframes ${id}-plug{0%,12%,88%,100%{transform:translate(0,0);opacity:1}38%,60%{transform:translate(-12px,-45px);opacity:1}74%{transform:translate(0,0);opacity:1}}
@keyframes ${id}-plug-shadow{0%,12%,74%,100%{opacity:0}25%,62%{opacity:1}}
@keyframes ${id}-seat{0%,12%,74%,100%{opacity:0}13%,73%{opacity:1}}
@media(prefers-reduced-motion:reduce){${scope} .eyelid,${scope} .aperture,${scope} .slab,${scope} .depth,${scope} .plug-shadow,${scope} .plug{animation:none!important}${scope} .plug{display:none}}
`;
  const ellipses = holes.map((h,i) => {
    if (loop.id === 'blink') {
      // Curved upper and lower lids meet at the center without flattening the hole itself.
      const extent = Math.max(h.rx,h.ry) + 1;
      const lid = `M${-extent*1.2} 0 C${-extent} ${-extent*2} ${extent} ${-extent*2} ${extent*1.2} 0 C${extent} ${extent*2} ${-extent} ${extent*2} ${-extent*1.2} 0Z`;
      return `<g transform="translate(${h.x} ${h.y})"><clipPath id="${id}-eyelid-${i}" clipPathUnits="userSpaceOnUse"><path class="eyelid" d="${lid}" style="--i:${i}"/></clipPath><g clip-path="url(#${id}-eyelid-${i})"><ellipse class="aperture" rx="${h.rx}" ry="${h.ry}" transform="rotate(${h.angle})"/></g></g>`;
    }
    return `<g transform="translate(${h.x} ${h.y}) rotate(${h.angle})"><ellipse class="aperture" rx="${h.rx}" ry="${h.ry}" style="--i:${i}"/></g>`;
  }).join('');
  const plugs = loop.id === 'plugs' ? holes.map((h,i) => `<g transform="translate(${h.x} ${h.y})"><g class="plug" style="--i:${i}"><ellipse class="plug-shadow" cx="3" cy="5" rx="${h.rx}" ry="${h.ry}" fill="${ink}" transform="rotate(${h.angle} 3 5)"/><ellipse rx="${h.rx}" ry="${h.ry}" fill="${color}" transform="rotate(${h.angle})"/></g></g>`).join('') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420" class="${id} ${loop.id}" role="img" aria-labelledby="${id}-title"><title id="${id}-title">${loop.name}, ${shape.name} loading animation</title><style>${css}</style><defs><path id="${id}-outline" d="${shape.path}"/><clipPath id="${id}-clip"><use href="#${id}-outline"/></clipPath><mask id="${id}-holes" maskUnits="userSpaceOnUse" x="0" y="0" width="420" height="420" style="mask-type:luminance"><rect width="420" height="420" fill="white"/><g fill="black">${ellipses}</g></mask><g id="${id}-face" mask="url(#${id}-holes)"><use href="#${id}-outline"/></g></defs><g class="slab"><g fill="${ink}">${Array.from({length:10},(_,i)=>`<g class="depth" style="--step:${10-i}" transform="translate(${(10-i)*1.2} ${(10-i)*1.4})"><use href="#${id}-face"/></g>`).join('')}</g><use href="#${id}-face" fill="${color}"/>${plugs}</g></svg>`;
}

const random = max => crypto.getRandomValues(new Uint32Array(1))[0] % max;

loops.forEach((loop,index) => {
  const card = document.createElement('article');
  card.className = 'loading-card';
  card.innerHTML = `<div class="loader-stage"><div class="stage-meta"><span>0${index+1}</span></div><div class="loader-art"></div><span class="stage-bottom">${loop.label}</span></div><div class="shuffle-row"><button class="card-shuffle" type="button" aria-label="Shuffle ${loop.name}">SHUFFLE ↻</button></div><div class="loader-description"><h2>${loop.name}</h2></div><p class="loader-caption">${loop.caption}</p><div class="avatar-example"><div class="avatar-art" aria-hidden="true"></div><div class="avatar-copy"><strong>Your Holey</strong><span>${loop.use}…</span></div></div>`;
  grid.append(card);
  let shape = shapes.find(s => s.key === loop.shape);
  let revision = 0;

  function renderCard(seed = 19, count = 5) {
    revision++;
    const color = shape.color;
    const phase = random(10000) / 10000 * loop.duration;
    card.dataset.shape = shape.key;
    card.dataset.seed = String(seed);
    card.style.setProperty('--tile',pale(color));
    card.style.setProperty('--tile-ink',darken(color));
    card.querySelector('.loader-art').innerHTML = makeSvg(loop,shape,color,`loader-${index}-${revision}`,seed,count,phase);
    card.querySelector('.avatar-art').innerHTML = makeSvg(loop,shape,color,`avatar-${index}-${revision}`,seed,count,phase);
  }

  card.querySelector('.card-shuffle').addEventListener('click',() => {
    const candidates = shapes.filter(s => s.key !== shape.key);
    shape = candidates[random(candidates.length)];
    renderCard(random(1000000), Math.min(shape.holes.length, 3 + random(5)));
  });
  renderCard();
});

// Keep the original loop phase while offscreen or in a background tab.
const loadingVisibility = new IntersectionObserver(entries => {
  for (const entry of entries) {
    entry.target.dataset.visible = String(entry.isIntersecting);
    entry.target.classList.toggle('motion-paused', !entry.isIntersecting || document.hidden);
  }
});
document.querySelectorAll('.loading-card').forEach(card => loadingVisibility.observe(card));
document.addEventListener('visibilitychange', () => {
  document.querySelectorAll('.loading-card').forEach(card => {
    card.classList.toggle('motion-paused', document.hidden || card.dataset.visible !== 'true');
  });
});
