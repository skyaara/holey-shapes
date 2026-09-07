import { shapes, createHoleySvg } from './script.js';

const studies = [
  { key:'disc', name:'Orbiting holes', color:'#6337FF', tile:'#e7e0ff', ink:'#412298' },
  { key:'round-block', name:'Elastic hole wave', color:'#9BED00', tile:'#e9f5c9', ink:'#486b05' },
  { key:'capsule', name:'Liquid holes', color:'#FF7657', tile:'#ffe2d8', ink:'#9a3d28' },
  { key:'round-block', name:'Holes out and back', color:'#FF0878', tile:'#ffe0ee', ink:'#970548' }
];
const ns='http://www.w3.org/2000/svg';
const TAU=Math.PI*2;
const duration=8000;

const reduced=matchMedia('(prefers-reduced-motion: reduce)');

const grid=document.querySelector('.motion-grid');
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

function sample(d) {
  const path=document.createElementNS(ns,'path');
  path.setAttribute('d',d);
  const length=path.getTotalLength();
  return Array.from({length:160},(_,i)=>path.getPointAtLength(i/160*length));
}
const cards=studies.map((study,index)=>{
  const shape=index===3?shapes[crypto.getRandomValues(new Uint32Array(1))[0]%shapes.length]:shapes.find(s=>s.key===study.key);
  const card=document.createElement('article');
  card.className='study';
  card.style.cssText=`--tile:${study.tile};--tile-ink:${study.ink}`;
  card.innerHTML=`<div class="study-tile"><div class="study-meta"><span>0${index+1}</span></div><div class="study-art"></div><div class="study-footer"><span>${index===3?'':'DRAG THE HOLES'}</span></div></div>`;
  card.insertAdjacentHTML('beforeend',`<div class="card-transport" role="group" aria-label="${study.name} controls"><label class="speed-label">SPEED <select class="card-speed" aria-label="${study.name} speed"><option value="0" ${reduced.matches?'selected':''}>Pause</option><option value="0.5">0.5×</option><option value="1" ${reduced.matches?'':'selected'}>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><button class="card-shuffle" type="button" aria-label="Shuffle ${study.name}">SHUFFLE ↻</button></div>`);
  grid.append(card);
  const id=`motion-${index}`;
  const count=index===2?3:6;
  card.querySelector('.study-art').innerHTML=`<svg viewBox="0 0 420 420" role="img" aria-label="${study.name}.${index===3?' The tile disappears while full-size holes pop outward, then they spiral back into the tile.':' Drag to stretch the holes.'}"><defs><filter id="${id}-liquid" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="7"/><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11"/></filter><mask id="${id}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="420" height="420"><rect width="420" height="420" fill="white"/><g fill="black" ${index===2?`filter="url(#${id}-liquid)"`:''}>${Array.from({length:count},()=>'<ellipse/>').join('')}</g></mask><path id="${id}-path"/><g id="${id}-body" mask="url(#${id}-mask)"><use href="#${id}-path"/></g></defs><g class="object"><g fill="${study.ink}">${Array.from({length:10},(_,i)=>`<use href="#${id}-body" transform="translate(${(10-i)*1.4} ${(10-i)*1.6})"/>`).join('')}</g><use href="#${id}-body" fill="${study.color}"/></g></svg>`;
  const c={card,index,id,study,name:study.name,rate:index===3?1:4,elapsed:0,paused:reduced.matches,speed:1,outline:sample(shape.path),path:card.querySelector('defs path'),svg:card.querySelector('svg'),holes:[...card.querySelectorAll('ellipse')].map(el=>({el,x:210,y:210,dx:0,dy:0,vx:0,vy:0})),drag:null};
  if(index===3){
    const floaters=document.createElementNS(ns,'g');
    floaters.setAttribute('aria-hidden','true');c.svg.append(floaters);c.floaterGroup=floaters;
    c.svg.style.cursor='default';
    setExcursionShape(c,shape,count);
  } else setStudyShape(c,shape,count);
  function point(e){const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(c.svg.getScreenCTM().inverse());return {x:clamp(p.x,70,350),y:clamp(p.y,70,350)};}
  c.svg.addEventListener('pointerdown',e=>{
    if(index===3)return;
    const p=point(e);
    const hole=c.holes.reduce((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)<Math.hypot(b.x-p.x,b.y-p.y)?a:b);
    c.drag={hole,...p};c.svg.setPointerCapture(e.pointerId);c.svg.classList.add('dragging');
  });
  c.svg.addEventListener('pointermove',e=>{if(c.drag)Object.assign(c.drag,point(e));});
  const release=()=>{c.drag=null;c.svg.classList.remove('dragging');};
  c.svg.addEventListener('pointerup',release);c.svg.addEventListener('pointercancel',release);c.svg.addEventListener('lostpointercapture',release);
  card.querySelector('.card-shuffle').addEventListener('click',()=>{
    shuffleStudy(c);
    c.elapsed=0;c.drag=null;c.holes.forEach(h=>{h.dx=h.dy=h.vx=h.vy=0;});renderCard(c,0);
  });
  card.querySelector('.card-speed').addEventListener('change',e=>{c.speed=+e.target.value;c.paused=c.speed===0;});
  return c;
});

function shuffleStudy(c){
  const values=crypto.getRandomValues(new Uint32Array(2));
  const candidates=shapes.filter(shape=>shape.key!==c.card.dataset.shape);
  const shape=candidates[values[0]%candidates.length];
  const counts=Array.from({length:Math.min(8,shape.holes.length)},(_,i)=>i+1).filter(n=>n!==c.holes.length);
  const count=counts[values[1]%counts.length];
  if(c.index===3)setExcursionShape(c,shape,count);
  else setStudyShape(c,shape,count);
}

function circleInside(c,x,y,r){
  if(!c.geometryContext.isPointInPath(c.geometry,x,y))return false;
  for(let i=0;i<24;i++){const a=i/24*TAU;if(!c.geometryContext.isPointInPath(c.geometry,x+Math.cos(a)*r,y+Math.sin(a)*r))return false;}
  return true;
}

function setStudyShape(c,shape,count){
  const seed=crypto.getRandomValues(new Uint32Array(1))[0]%1000000;
  const generated=new DOMParser().parseFromString(createHoleySvg({shape:shape.key,holes:count,seed,animated:false}),'image/svg+xml');
  const layout=[...generated.querySelectorAll('mask ellipse')];
  const ink='#'+shape.color.slice(1).match(/../g).map(v=>Math.round(parseInt(v,16)*.52).toString(16).padStart(2,'0')).join('');
  c.card.style.cssText=`--tile:${shape.bg};--tile-ink:${ink}`;
  c.card.querySelector('.object > g').setAttribute('fill',ink);
  c.card.querySelector('.object > use').setAttribute('fill',shape.color);
  c.path.setAttribute('d',shape.path);c.outline=sample(shape.path);
  c.geometry=new Path2D(shape.path);c.geometryContext=document.createElement('canvas').getContext('2d');
  c.card.dataset.shape=shape.key;c.card.dataset.seed=seed;c.card.dataset.holes=layout.length;
  c.svg.setAttribute('aria-label',`${c.name}: ${shape.name}, ${layout.length} holes.`);
  const mask=c.svg.querySelector(`#${c.id}-mask > g`);mask.replaceChildren();
  c.holes=layout.map(source=>{
    const el=document.importNode(source,true);mask.append(el);
    const homeX=+source.getAttribute('cx'),homeY=+source.getAttribute('cy');
    return {el,homeX,homeY,x:homeX,y:homeY,rx:+source.getAttribute('rx'),ry:+source.getAttribute('ry'),rotation:Number(source.getAttribute('transform')?.match(/rotate\(([-\d.]+)/)?.[1]||0),dx:0,dy:0,vx:0,vy:0};
  });
  if(c.index===2){randomizeMerges(c);c.lastMergeTime=0;}
  c.tileColor=shape.color;c.shadowColor=ink;
  return ink;
}

function randomizeMerges(c){
  const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
  const pending=c.holes.map((h,i)=>({h,i,key:random()})).sort((a,b)=>a.key-b.key);
  const pairs=[];
  c.holes.forEach(h=>{h.targetX=h.homeX;h.targetY=h.homeY;h.mergeLimit=0;});
  function safeTravel(h,x,y){
    let limit=0;
    for(let step=1;step<=24;step++){const t=step/24;if(!circleInside(c,mix(h.homeX,x,t),mix(h.homeY,y,t),Math.max(h.rx,h.ry)+4))break;limit=t;}
    return limit;
  }
  while(pending.length>1){
    const a=pending.pop();
    const candidates=pending.map((b,index)=>{
      const x=(a.h.homeX+b.h.homeX)/2,y=(a.h.homeY+b.h.homeY)/2;
      const la=safeTravel(a.h,x,y),lb=safeTravel(b.h,x,y);
      return {b,index,x,y,la,lb,score:(la+lb)*(.7+random()*.6)};
    }).sort((a,b)=>b.score-a.score);
    const chosen=candidates[0];pending.splice(chosen.index,1);
    const start=.04+random()*.17,span=.56+random()*.16;
    for(const [h,limit] of [[a.h,chosen.la],[chosen.b.h,chosen.lb]])Object.assign(h,{targetX:chosen.x,targetY:chosen.y,mergeLimit:limit,mergeStart:start,mergeSpan:span});
    pairs.push([a.i,chosen.b.i]);
  }
  c.card.dataset.mergePairs=JSON.stringify(pairs);
}

function blendColor(a,b,t){
  const channels=[1,3,5].map(i=>Math.round(mix(parseInt(a.slice(i,i+2),16),parseInt(b.slice(i,i+2),16),t)));
  return `rgb(${channels.join(',')})`;
}

function setExcursionShape(c,shape,count){
  const ink=setStudyShape(c,shape,count);
  // Use a common center and one rigid motion so arbitrary packed holes keep
  // their separation. Derive the camera bounds from this particular layout.
  c.center={x:c.holes.reduce((sum,h)=>sum+h.homeX,0)/c.holes.length,y:c.holes.reduce((sum,h)=>sum+h.homeY,0)/c.holes.length};
  const reach=Math.max(...c.holes.map(h=>Math.hypot(h.homeX-c.center.x,h.homeY-c.center.y)*1.16+Math.max(h.rx,h.ry)))+32;
  const half=Math.max(220,reach+Math.max(Math.abs(c.center.x-210),Math.abs(c.center.y-210)));
  c.svg.setAttribute('viewBox',`${210-half} ${210-half} ${half*2} ${half*2}`);
  c.floaterGroup.innerHTML=c.holes.map((h,i)=>`<g class="floating-hole"><defs><clipPath id="${c.id}-aperture-${i}"><ellipse rx="${h.rx}" ry="${h.ry}" transform="rotate(${h.rotation})"/></clipPath></defs><g clip-path="url(#${c.id}-aperture-${i})"><ellipse class="aperture-shadow" rx="${h.rx}" ry="${h.ry}" transform="rotate(${h.rotation})" fill="${ink}"/><ellipse class="aperture-opening" cx="14" cy="16" rx="${h.rx}" ry="${h.ry}" transform="rotate(${h.rotation} 14 16)" fill="${shape.bg}"/></g></g>`).join('');
  c.floaters=[...c.floaterGroup.children];
  c.openings=[...c.floaterGroup.querySelectorAll('.aperture-opening')];
  c.shadows=[...c.floaterGroup.querySelectorAll('.aperture-shadow')];
  c.svg.querySelector(`#${c.id}-material`)?.remove();
  c.svg.querySelector(`#${c.id}-goo`)?.remove();
  c.svg.querySelector(`#${c.id}-float-goo`)?.remove();
  c.svg.querySelector('.goo-threads')?.remove();
  const goo=document.createElementNS(ns,'filter');
  goo.id=`${c.id}-goo`;goo.setAttribute('x','-30%');goo.setAttribute('y','-30%');goo.setAttribute('width','160%');goo.setAttribute('height','160%');
  goo.innerHTML='<feGaussianBlur stdDeviation="7"/><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 22 -9"/>';
  c.svg.querySelector('defs').append(goo);
  const floatGoo=goo.cloneNode(true);floatGoo.id=`${c.id}-float-goo`;c.svg.querySelector('defs').append(floatGoo);c.floatBlur=floatGoo.querySelector('feGaussianBlur');
  const reveal=document.createElementNS(ns,'mask');
  reveal.id=`${c.id}-material`;reveal.setAttribute('maskUnits','userSpaceOnUse');reveal.setAttribute('x','-100');reveal.setAttribute('y','-100');reveal.setAttribute('width','620');reveal.setAttribute('height','620');reveal.style.maskType='alpha';
  reveal.innerHTML=`<g fill="white" filter="url(#${c.id}-goo)">${c.holes.map(()=>'<ellipse/>').join('')}</g>`;
  c.svg.querySelector('defs').append(reveal);
  c.material=[...reveal.querySelectorAll('ellipse')];
  c.card.querySelector('.object').removeAttribute('clip-path');
  c.card.querySelector('.object').setAttribute('mask',`url(#${c.id}-material)`);
  // Sticky strands connect neighboring shadows, pull thin, then release.
  const threads=document.createElementNS(ns,'g');threads.setAttribute('class','goo-threads');threads.setAttribute('fill','none');threads.setAttribute('stroke',ink);threads.setAttribute('stroke-linecap','round');
  c.svg.insertBefore(threads,c.floaterGroup);
  c.threads=[];
  for(let i=0;i<c.holes.length;i++)for(let j=i+1;j<c.holes.length;j++){
    const a=c.holes[i],b=c.holes[j];
    const path=document.createElementNS(ns,'path');path.setAttribute('fill',ink);path.setAttribute('stroke','none');threads.append(path);c.threads.push({path,i,j});
  }
  // Cover the entire original canvas after the patches have joined, including
  // extrusion. Before that, each patch grows locally from its own aperture.
  c.revealRadius=0;
  for(let y=0;y<=440;y+=20)for(let x=0;x<=440;x+=20)c.revealRadius=Math.max(c.revealRadius,Math.min(...c.holes.map(h=>Math.hypot(x-h.homeX,y-h.homeY))));

}

function drawExcursion(c,t){
  const u=(t/duration+.24)%1;
  const ease=x=>{x=clamp(x,0,1);return x*x*x*(x*(x*6-15)+10);};
  const leave=ease((u-.08)/.16);
  const arrive=ease((u-.66)/.28);
  const detached=leave*(1-arrive);
  const angle=-.65*leave+(TAU+.65)*arrive;
  const expansion=1+.16*detached;
  const drift=Math.sin((u-.24)*TAU*2)*12*ease((u-.22)/.12)*(1-ease((u-.48)/.15));
  // Keep the sheet absent while holes are far from home; no moving cutouts
  // through narrow arms or concave edges, regardless of the chosen outline.
  const sheet=1-ease((u-.06)/.09)*(1-ease((u-.84)/.155));
  c.card.querySelector('.object').style.opacity=1;
  const colorFlow=u>.5?ease((u-.70)/.19):1-ease((u-.06)/.12);
  const flowingColor=blendColor(c.shadowColor,c.tileColor,colorFlow);
  const join=ease((sheet-.25)/.75);
  const figure=ease((u-.18)/.10)*(1-ease((u-.50)/.14));
  const gather=ease((u-.50)/.14)*(1-ease((u-.66)/.28));
  c.floatBlur.setAttribute('stdDeviation',7*ease(gather/.35));
  if(gather>0)c.floaterGroup.setAttribute('filter',`url(#${c.id}-float-goo)`);
  else c.floaterGroup.removeAttribute('filter');
  c.holes.forEach((h,i)=>{
    const dx=h.homeX-c.center.x,dy=h.homeY-c.center.y;
    const lag=Math.sin(u*TAU*3+i*.8)*4*detached;
    const ribbonPhase=i/c.holes.length*TAU+(u-.24)*TAU*2;
    const figureX=210+Math.sin(ribbonPhase)*103;
    const figureY=210+Math.sin(ribbonPhase*2)*48;
    const looseX=mix(c.center.x+(dx*Math.cos(angle)-dy*Math.sin(angle))*expansion+lag,figureX,figure);
    const looseY=mix(c.center.y+(dx*Math.sin(angle)+dy*Math.cos(angle))*expansion+drift,figureY,figure);
    // The figure-eight collapses into one soft mass, then releases in a spiral.
    const clusterAngle=i/c.holes.length*TAU+angle;
    const x=mix(looseX,c.center.x+Math.cos(clusterAngle)*12,gather);
    const y=mix(looseY,c.center.y+Math.sin(clusterAngle)*12,gather);
    h.x=x;h.y=y;
    h.el.setAttribute('cx',h.homeX);h.el.setAttribute('cy',h.homeY);
    h.el.setAttribute('rx',h.rx);h.el.setAttribute('ry',h.ry);
    h.el.setAttribute('transform',`rotate(${h.rotation} ${h.homeX} ${h.homeY})`);
    c.floaters[i].setAttribute('transform',`translate(${x} ${y})`);
    const patch=clamp(sheet*8,0,1);
    const growth=c.revealRadius*sheet;
    c.material[i].setAttribute('cx',x);c.material[i].setAttribute('cy',y);
    const wobble=1+Math.sin(u*TAU*10-i*.8)*.10*Math.sin(sheet*Math.PI);
    c.material[i].setAttribute('rx',(h.rx+growth)*patch*wobble);
    c.material[i].setAttribute('ry',(h.ry+growth)*patch/wobble);
    c.material[i].setAttribute('transform',`rotate(${h.rotation} ${x} ${y})`);
    c.shadows[i].setAttribute('fill',flowingColor);
    c.floaters[i].style.opacity=1-join;
    c.openings[i].style.opacity=0;
  });
  for(const {path,i,j} of c.threads){
    const a=c.holes[i],b=c.holes[j],distance=Math.max(.001,Math.hypot(a.x-b.x,a.y-b.y));
    const gap=distance-Math.max(a.rx,a.ry)-Math.max(b.rx,b.ry);
    const stretch=clamp(1-gap/48,0,1);
    const strength=stretch*detached*(1-ease(sheet*3));
    const bend=Math.sin(u*TAU*3+i)*10*detached;
    const nx=-(b.y-a.y)/distance,ny=(b.x-a.x)/distance;
    const neck=10*strength*strength;
    const wa=Math.min(a.rx,a.ry)*.65*detached,wb=Math.min(b.rx,b.ry)*.65*detached;
    const mx=(a.x+b.x)/2+nx*bend,my=(a.y+b.y)/2+ny*bend;
    path.setAttribute('d',`M${a.x+nx*wa} ${a.y+ny*wa} C${mx+nx*neck} ${my+ny*neck} ${mx+nx*neck} ${my+ny*neck} ${b.x+nx*wb} ${b.y+ny*wb} L${b.x-nx*wb} ${b.y-ny*wb} C${mx-nx*neck} ${my-ny*neck} ${mx-nx*neck} ${my-ny*neck} ${a.x-nx*wa} ${a.y-ny*wa} Z`);
    path.setAttribute('fill',flowingColor);
    path.style.opacity=strength>.015?1:0;
  }
}

function draw(c,t,dt) {
  if(c.index===3){drawExcursion(c,t);return;}
  if(c.index===2){if(t<c.lastMergeTime)randomizeMerges(c);c.lastMergeTime=t;}
  const phase=t/duration*TAU+(c.phaseOffset||0);
  c.holes.forEach((h,i)=>{
    let x=h.homeX,y=h.homeY,rx=h.rx,ry=h.ry,angle=h.rotation;
    if(c.index===0){
      const wave=phase+i/c.holes.length*TAU;
      const pulse=.82+.18*(.5+.5*Math.sin(wave));
      rx*=pulse;ry*=pulse;angle+=phase*180/Math.PI;
      x+=Math.cos(wave)*5;y+=Math.sin(wave)*5;
    } else if(c.index===1){
      const wave=phase*2-h.homeX/90-h.homeY/160;
      const pressure=Math.pow((1+Math.sin(wave))/2,3);
      rx*=1-.12*pressure;ry*=1-.92*pressure;
      y+=Math.sin(wave)*3;
    } else {
      const progress=clamp((t/duration-(h.mergeStart||0))/(h.mergeSpan||1),0,1);
      const merge=Math.sin(progress*Math.PI)**2*h.mergeLimit;
      x=mix(h.homeX,h.targetX,merge);y=mix(h.homeY,h.targetY,merge);
      rx*=.92+.08*Math.sin(phase*2+i);ry*=.92+.08*Math.cos(phase*2+i);
    }
    // A damped spring lets a grabbed hole pull the surrounding sheet and rebound on release.
    let tx=0,ty=0;
    if(c.drag){const distance=Math.hypot(x-c.drag.hole.x,y-c.drag.hole.y);const influence=h===c.drag.hole?1:.22*Math.exp(-distance/100);tx=(c.drag.x-c.drag.hole.x+c.drag.hole.dx)*influence;ty=(c.drag.y-c.drag.hole.y+c.drag.hole.dy)*influence;}
    tx=clamp(tx,-38,38);ty=clamp(ty,-38,38);
    if(reduced.matches){h.dx=tx;h.dy=ty;} else {
      const steps=Math.max(1,Math.ceil(dt/.008)), step=dt/steps;
      for(let k=0;k<steps;k++){h.vx+=((tx-h.dx)*190-h.vx*15)*step;h.vy+=((ty-h.dy)*190-h.vy*15)*step;h.dx+=h.vx*step;h.dy+=h.vy*step;}
    }
    h.x=x+h.dx;h.y=y+h.dy;
    const stretch=1+Math.min(.16,Math.hypot(h.dx,h.dy)/160);
    const maxRadius=Math.max(h.rx,h.ry);
    const fit=Math.min(1,maxRadius/Math.max(rx*stretch,ry/stretch));
    rx*=fit;ry*=fit;
    const margin=Math.max(rx*stretch,ry/stretch)+3;
    if(!circleInside(c,h.x,h.y,margin)){
      let low=0,high=1;
      for(let k=0;k<9;k++){const f=(low+high)/2;if(circleInside(c,mix(h.homeX,h.x,f),mix(h.homeY,h.y,f),margin))low=f;else high=f;}
      h.x=mix(h.homeX,h.x,low);h.y=mix(h.homeY,h.y,low);
    }
    h.el.setAttribute('cx',h.x);h.el.setAttribute('cy',h.y);
    h.el.setAttribute('rx',rx*stretch);h.el.setAttribute('ry',ry/stretch);
    h.el.setAttribute('transform',`rotate(${angle+h.dx*.5} ${h.x} ${h.y})`);
  });
  const d=c.outline.map((p,i)=>{
    let x=p.x,y=p.y;
    if(c.index===1){const wave=phase*2-(p.x-118)/88*1.05;const squeeze=Math.sin(wave)*5;x+=Math.sin(wave*.5)*2;y+=(p.y<210?1:-1)*squeeze;}
    if(c.index===2){const breath=Math.sin(phase*2)*.018;x=210+(x-210)*(1+breath);y=207+(y-207)*(1-breath);}
    for(const h of c.holes){const weight=Math.exp(-Math.hypot(p.x-h.x,p.y-h.y)/85)*.65;x+=h.dx*weight;y+=h.dy*weight;}
    return `${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join('')+'Z';
  c.path.setAttribute('d',d);
}
function renderCard(c,dt){draw(c,c.elapsed,dt);}
reduced.addEventListener('change',()=>{cards.forEach(c=>{c.paused=reduced.matches;c.speed=c.paused?0:1;c.card.querySelector('.card-speed').value=String(c.speed);c.elapsed=0;renderCard(c,0);});});
const motionVisibility = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const card = cards.find(c => c.card === entry.target);
    if (card) card.visible = entry.isIntersecting;
  }
});
cards.forEach(c => { c.visible = false; motionVisibility.observe(c.card); });
let last=performance.now();
function tick(now){
  const dt=clamp((now-last)/1000,0,.04);last=now;
  if(!document.hidden)cards.forEach(c=>{
    if(!c.visible)return;
    if(!c.paused)c.elapsed=(c.elapsed+dt*1000*c.rate*c.speed)%duration;
    const interacting=c.drag||c.holes.some(h=>Math.abs(h.vx)+Math.abs(h.vy)+Math.abs(h.dx)+Math.abs(h.dy)>.01);
    if(!c.paused||interacting)renderCard(c,dt);
  });
  requestAnimationFrame(tick);
}
cards.forEach(c=>renderCard(c,0));requestAnimationFrame(tick);
