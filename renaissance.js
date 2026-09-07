(() => {
  'use strict';
  const atelier = document.getElementById('atelier');
  const canvas = document.getElementById('architecture'), ctx = canvas.getContext('2d');
  const figures = document.getElementById('figures'), svg = document.getElementById('guides');
  const rays = document.getElementById('rays'), depths = document.getElementById('depths'), focus = document.getElementById('focus');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const names = ['Plato','Aristotle','Socrates','Pythagoras','Euclid','Diogenes','Heraclitus','Ptolemy'];
  // World positions preserve the central pair, side conversations and seated foreground.
  // All positions and figure heights use the same pinhole projection (f / depth).
  const world = [
    {x:-.48,z:5.8,h:2.7}, {x:.48,z:5.8,h:2.7},
    {x:-2.65,z:5.4,h:2.6}, {x:-2.65,z:1.8,h:1.62},
    {x:2.65,z:1.8,h:1.8}, {x:.95,z:2.7,h:1.35},
    {x:-.9,z:.7,h:1.52}, {x:3.1,z:4.2,h:2.7}
  ];
  let width=1,height=1,ordered=false,raf=0,transitionStart=0,duration=0;
  let vanishing={x:.5,y:.37},fromVP={...vanishing},targetVP={...vanishing};
  let lineAmount=0,fromLines=0,targetLines=0,items=[],ready=false;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ease=t=>t*t*t*(t*(t*6-15)+10);
  function projection(i) {
    const p=world[i], scale=1/(p.z+4);
    // The camera's framing adapts to the chosen point while retaining shared depth.
    const side=p.x<0?vanishing.x:1-vanishing.x;
    const fx=width*Math.min(.82,Math.max(.1,side)*1.7);
    const figureHeight=Math.min(height*1.14,width*.88)*p.h*scale;
    return {x:vanishing.x*width+p.x*fx*scale,
      y:vanishing.y*height+(height*.9-vanishing.y*height)*4*scale,
      h:figureHeight,angle:0,depth:scale};
  }
  function disorder(i) {
    const spots=[[.18,.50],[.72,.48],[.41,.82],[.84,.86],[.50,.46],[.16,.91],[.66,.94],[.89,.46]];
    return {x:width*(spots[i][0]+(Math.random()-.5)*.055),y:height*spots[i][1],
      h:Math.min(height,width*.8)*(.26+Math.random()*.18),angle:(Math.random()-.5)*64,depth:Math.random()};
  }
  function renderFigures(t) {
    for(const [i,item] of items.entries()) {
      const stagger=ordered?i*.028:0;
      const progress=ease(clamp((t-stagger)/(1-stagger),0,1));
      const a=item.from,b=ordered?projection(i):item.to;
      const current={};for(const key of ['x','y','h','angle','depth'])current[key]=lerp(a[key],b[key],progress);
      item.current=current;
      const w=current.h*item.ratio;
      item.el.style.width=`${w}px`;item.el.style.height=`${current.h}px`;
      item.el.style.transform=`translate(${current.x-w/2}px,${current.y-current.h}px) rotate(${current.angle}deg)`;
      item.el.style.zIndex=String(Math.round(current.depth*1000));
      item.el.style.setProperty('--grounded',String(lineAmount*.55));
    }
  }
  function makeLine(parent,x1,y1,x2,y2,minor=false) {
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    for(const [k,v] of Object.entries({x1,y1,x2,y2}))line.setAttribute(k,String(v));
    line.setAttribute('class',minor?'guide-line guide-minor':'guide-line');
    parent.append(line);
  }
  function drawGuides() {
    rays.replaceChildren();depths.replaceChildren();focus.replaceChildren();
    if(lineAmount<.001)return;
    const vx=vanishing.x*width,vy=vanishing.y*height;
    const reveal=clamp(lineAmount*1.5,0,1);
    svg.style.opacity=String(Math.min(1,lineAmount*2));
    for(let i=-4;i<=12;i++) {
      const x=i/8*width;
      makeLine(rays,vx,vy,lerp(vx,x,reveal),lerp(vy,height,reveal),i%2!==0);
    }
    for(const [x,y] of [[0,0],[width,0],[0,height*.38],[width,height*.38]])makeLine(rays,vx,vy,lerp(vx,x,reveal),lerp(vy,y,reveal),true);
    makeLine(depths,0,vy,width,vy,true);
    for(let i=1;i<=9;i++) {
      const depth=1/(1+i*.62),y=vy+(height-vy)*depth;
      const expansion=clamp((lineAmount-.2-i*.035)*2.5,0,1);
      makeLine(depths,vx*(1-expansion),y,vx+(width-vx)*expansion,y,true);
    }
    for(const radius of [4,14,25]) {
      const circle=document.createElementNS(svg.namespaceURI,'circle');
      circle.setAttribute('cx',vx);circle.setAttribute('cy',vy);circle.setAttribute('r',radius*(.7+.3*lineAmount));
      circle.setAttribute('class','guide-focus');circle.style.opacity=radius===25?'.25':'.8';focus.append(circle);
    }
    makeLine(focus,vx-34,vy,vx-19,vy);makeLine(focus,vx+19,vy,vx+34,vy);
    makeLine(focus,vx,vy-34,vx,vy-19);makeLine(focus,vx,vy+19,vx,vy+34);
  }
  function drawRoom() {
    ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
    ctx.clearRect(0,0,width,height);
    const vx=vanishing.x*width,vy=vanishing.y*height;
    const glow=ctx.createRadialGradient(vx,vy,0,vx,vy,Math.max(width,height)*.7);
    glow.addColorStop(0,'#c2bd8d30');glow.addColorStop(.55,'#535d4330');glow.addColorStop(1,'#080e0c99');
    ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    // A vaulted architectural study emerges in the same perspective as the figures.
    ctx.globalAlpha=.14+lineAmount*.6;
    for(let i=5;i>=0;i--) {
      const s=1/(1+i*.55),half=width*.49*s;
      const base=vy+(height-vy)*s,top=vy-height*.52*s;
      ctx.beginPath();ctx.moveTo(vx-half,base);ctx.lineTo(vx-half,vy-height*.13*s);
      ctx.bezierCurveTo(vx-half,top,vx+half,top,vx+half,vy-height*.13*s);ctx.lineTo(vx+half,base);
      ctx.strokeStyle=i%2?'#c4b58a':'#807e61';ctx.lineWidth=Math.max(1,13*s);ctx.stroke();
      ctx.strokeStyle='#e2d5ac55';ctx.lineWidth=1;ctx.stroke();
      for(const sign of [-1,1]) {
        const x=vx+sign*half;
        ctx.fillStyle='#b3a78228';ctx.fillRect(x-7*s,vy-height*.1*s,14*s,base-vy+height*.1*s);
      }
    }
    ctx.globalAlpha=1;
    const floor=ctx.createLinearGradient(0,vy,0,height);floor.addColorStop(0,'#a3945c00');floor.addColorStop(1,'#b7a87820');
    ctx.fillStyle=floor;ctx.fillRect(0,vy,width,height-vy);
  }
  function frame(now) {
    raf=0;
    const t=duration?clamp((now-transitionStart)/duration,0,1):1;
    const smooth=ease(t);
    vanishing={x:lerp(fromVP.x,targetVP.x,smooth),y:lerp(fromVP.y,targetVP.y,smooth)};
    lineAmount=lerp(fromLines,targetLines,ordered?clamp(t*2,0,1):smooth);
    drawRoom();drawGuides();renderFigures(t);
    if(t<1&&!document.hidden)raf=requestAnimationFrame(frame);
    else if(t===1)atelier.dataset.state=ordered?'ordered':'scattered';
  }
  function animate() {
    if(raf)cancelAnimationFrame(raf);
    transitionStart=performance.now();duration=reduced.matches?0:3200;
    atelier.dataset.state='transitioning';raf=requestAnimationFrame(frame);
  }
  function compose(x=.5,y=.37) {
    if(!ready)return;
    items.forEach(item=>item.from={...item.current});
    fromVP={...vanishing};targetVP={x:clamp(x,.015,.985),y:clamp(y,.015,.985)};
    fromLines=lineAmount;targetLines=1;ordered=true;
    atelier.classList.add('is-ordered');document.getElementById('stateLabel').textContent='II — PERSPECTIVE';animate();
  }
  function scatter() {
    if(!ready)return;
    items.forEach((item,i)=>{item.from={...item.current};item.to=disorder(i);});
    fromVP={...vanishing};targetVP={x:.5,y:.37};fromLines=lineAmount;targetLines=0;ordered=false;
    atelier.classList.remove('is-ordered');document.getElementById('stateLabel').textContent='I — DISORDER';animate();
  }
  atelier.addEventListener('click',e=>{if(e.target.closest('button'))return;const r=atelier.getBoundingClientRect();compose((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);});
  atelier.addEventListener('keydown',e=>{if(e.target.closest('button'))return;if(e.key==='Enter'||e.key===' '){e.preventDefault();compose();}if(e.key==='Escape')scatter();});
  document.getElementById('compose').addEventListener('click',()=>compose());
  document.getElementById('scatter').addEventListener('click',scatter);
  function resize() {
    const oldW=width,oldH=height;
    width=atelier.clientWidth;height=atelier.clientHeight;
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    if(ready) {
      for(const item of items)for(const state of ['from','to','current']){item[state].x*=width/oldW;item[state].y*=height/oldH;item[state].h*=height/oldH;}
      if(raf)cancelAnimationFrame(raf);duration=0;fromVP={...targetVP};fromLines=targetLines;frame(performance.now());
    }else drawRoom();
  }
  new ResizeObserver(resize).observe(atelier);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ready){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}});
  async function init() {
    resize();
    // A generated manifest keeps every uploaded ChatGPT Image asset in this scene.
    const response=await fetch('renaissance-figures.json');if(!response.ok)throw Error('Image list unavailable');
    const files=await response.json();
    items=await Promise.all(files.map(async(file,i)=>{
      const img=new Image();img.src=file;img.alt=names[i]||`Philosopher ${i+1}`;img.draggable=false;
      await img.decode();
      const el=document.createElement('div');el.className='philosopher';el.append(img);figures.append(el);
      const current=disorder(i);return {el,ratio:img.naturalWidth/img.naturalHeight,from:{...current},to:{...current},current};
    }));
    ready=true;document.getElementById('loadStatus').textContent='';duration=0;frame(performance.now());
  }
  init().catch(error=>{document.getElementById('loadStatus').textContent='Images unavailable — reload to retry';console.error(error);});
})();
