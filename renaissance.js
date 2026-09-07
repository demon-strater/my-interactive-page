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
  // Anchors the depth exaggeration below: figures at the group's average distance keep their plain 1/(z+4)
  // size, while nearer/farther ones are pushed further apart from that anchor for a stronger sense of depth.
  const avgZ=world.reduce((sum,p)=>sum+p.z,0)/world.length,refScale=1/(avgZ+4);
  let width=1,height=1,ordered=false,raf=0,transitionStart=0,duration=0;
  let vanishing={x:.5,y:.37},fromVP={...vanishing},targetVP={...vanishing};
  let lineAmount=0,fromLines=0,targetLines=0,items=[],ready=false;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ease=t=>t*t*t*(t*(t*6-15)+10);
  function projection(i) {
    const p=world[i], plain=1/(p.z+4);
    // Exaggerated past the plain pinhole falloff so the near/far philosophers read as clearly closer/further,
    // not just slightly different in size — the group's average depth is held fixed as the pivot.
    const scale=refScale*Math.pow(plain/refScale,1.45);
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
  // Shared with the architecture: the floor grid and the room's columns read off the same depth curve AND the
  // same hall-width curve, so a column stands exactly on a floor row and no row reaches sideways into a column.
  function roomDepth(i) { return 1/(1+i*.62); }
  function hallHalf(s) { return width*.49*s; }
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
    // Each floor row spans only the hall's own width at that depth, so it stops at the walls instead of
    // slicing across a nearer column's shaft.
    for(let i=0;i<=9;i++) {
      const s=roomDepth(i),y=vy+(height-vy)*s,half=hallHalf(s);
      const expansion=clamp((lineAmount-.2-i*.035)*2.5,0,1)*half;
      makeLine(depths,vx-expansion,y,vx+expansion,y,true);
    }
    // A soft, layered glow rather than a faceted star — closer to natural bloom than a graphic icon.
    const haloR=95*(.7+.3*lineAmount),hotR=30*(.7+.3*lineAmount);
    const halo=document.createElementNS(svg.namespaceURI,'circle');
    halo.setAttribute('cx',String(vx));halo.setAttribute('cy',String(vy));
    halo.setAttribute('r',String(haloR));halo.setAttribute('fill','url(#vpGlow)');
    focus.append(halo);
    const hot=document.createElementNS(svg.namespaceURI,'circle');
    hot.setAttribute('cx',String(vx));hot.setAttribute('cy',String(vy));
    hot.setAttribute('r',String(hotR));hot.setAttribute('fill','url(#vpHot)');
    focus.append(hot);
    const core=document.createElementNS(svg.namespaceURI,'circle');
    core.setAttribute('cx',String(vx));core.setAttribute('cy',String(vy));
    core.setAttribute('r',String(2.2*(.7+.3*lineAmount)));
    core.setAttribute('class','guide-core');focus.append(core);
  }
  function drawFloor(vx,vy) {
    // Rows taper with hallHalf(), the same curve the columns stand on, so the marble floor fills the hall
    // exactly to its walls at every depth and never reaches sideways into a column.
    const rows=[{y:vy,half:0}];
    for(let i=9;i>=0;i--) {
      const s=roomDepth(i);
      rows.push({y:vy+(height-vy)*s,half:hallHalf(s)});
    }
    const grout=`rgba(212,178,112,${.05+lineAmount*.14})`;
    const cols=8;
    for(let r=0;r<rows.length-1;r++) {
      const a=rows[r],b=rows[r+1];
      const f0=Math.max(0,(a.y-vy)/(height-vy||1));
      const tileAlpha=(.02+lineAmount*.1)*clamp(f0*1.4,0,1);
      const groutAlpha=clamp(f0*1.6,0,1);
      if(groutAlpha<=.004)continue;
      for(let c=0;c<cols;c++) {
        const t0=-1+2*c/cols,t1=-1+2*(c+1)/cols;
        const x0a=vx+t0*a.half,x1a=vx+t1*a.half,x0b=vx+t0*b.half,x1b=vx+t1*b.half;
        ctx.beginPath();ctx.moveTo(x0a,a.y);ctx.lineTo(x1a,a.y);ctx.lineTo(x1b,b.y);ctx.lineTo(x0b,b.y);ctx.closePath();
        if((r+c)%2!==0&&tileAlpha>.004){ctx.fillStyle=`rgba(94,64,30,${tileAlpha})`;ctx.fill();}
        ctx.strokeStyle=grout;ctx.lineWidth=Math.max(.4,.9*groutAlpha);ctx.globalAlpha=groutAlpha;ctx.stroke();ctx.globalAlpha=1;
      }
    }
  }
  function drawRoom() {
    ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
    ctx.clearRect(0,0,width,height);
    const vx=vanishing.x*width,vy=vanishing.y*height;
    const glow=ctx.createRadialGradient(vx,vy,0,vx,vy,Math.max(width,height)*.7);
    glow.addColorStop(0,'#caa0521f');glow.addColorStop(.5,'#3a2b1226');glow.addColorStop(1,'#020100a8');
    ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    // A distant apse frames the vanishing point, giving the hall a terminus to converge on.
    const nH=height*.24*(.4+lineAmount*.6),nW=nH*.5;
    ctx.beginPath();
    ctx.moveTo(vx-nW/2,vy+nH*.55);ctx.lineTo(vx-nW/2,vy-nH*.1);
    ctx.quadraticCurveTo(vx-nW/2,vy-nH*.58,vx,vy-nH*.58);
    ctx.quadraticCurveTo(vx+nW/2,vy-nH*.58,vx+nW/2,vy-nH*.1);
    ctx.lineTo(vx+nW/2,vy+nH*.55);
    ctx.fillStyle=`rgba(10,7,3,${.35+lineAmount*.25})`;ctx.fill();
    ctx.strokeStyle=`rgba(226,190,120,${.18+lineAmount*.3})`;ctx.lineWidth=1;ctx.stroke();
    // A calm colonnade rises from the same floor the perspective grid defines — every column's foot sits
    // exactly on a roomDepth() row and its width matches hallHalf() there, so nothing drifts past the floor
    // or gets crossed by it. Kept plain and dim so it stages the figures rather than competing with them.
    ctx.globalAlpha=.1+lineAmount*.34;
    const levels=[7,5,3,2,1,0];
    for(const i of levels) {
      const s=roomDepth(i),half=hallHalf(s);
      // Raised well past the apse's crown so even the farthest arch clears the door it frames.
      const base=vy+(height-vy)*s,top=vy-height*1.5*s,archTop=vy-height*.42*s;
      ctx.beginPath();ctx.moveTo(vx-half,base);ctx.lineTo(vx-half,archTop);
      ctx.bezierCurveTo(vx-half,top,vx+half,top,vx+half,archTop);ctx.lineTo(vx+half,base);
      ctx.strokeStyle=i%2?'#7c6539':'#392a13';ctx.lineWidth=Math.max(1,12*s);ctx.stroke();
      // a single soft gilt rim
      ctx.strokeStyle=`rgba(240,205,140,${.5*(.3+lineAmount*.7)})`;ctx.lineWidth=Math.max(.5,1*s);ctx.stroke();
      // one entablature line at the springing, reading as a plain cornice across the hall
      ctx.strokeStyle=`rgba(232,199,128,${.42*(.3+lineAmount*.7)})`;ctx.lineWidth=Math.max(.5,.8*s);
      ctx.beginPath();ctx.moveTo(vx-half,archTop);ctx.lineTo(vx+half,archTop);ctx.stroke();
      // plain pilasters with a simple capital and base
      for(const sign of [-1,1]) {
        const x=vx+sign*half,pw=7*s;
        ctx.fillStyle='#3a2a1338';ctx.fillRect(x-pw,archTop,pw*2,base-archTop);
        ctx.strokeStyle=`rgba(230,197,132,${.32*(.3+lineAmount*.7)})`;ctx.lineWidth=Math.max(.4,.6*s);
        ctx.strokeRect(x-pw,archTop,pw*2,base-archTop);
        ctx.fillStyle=`rgba(226,193,126,${.5*(.3+lineAmount*.7)})`;
        ctx.fillRect(x-pw*1.4,archTop-3*s,pw*2.8,3.4*s);
        ctx.fillRect(x-pw*1.4,base-3.4*s,pw*2.8,3.4*s);
      }
    }
    ctx.globalAlpha=1;
    drawFloor(vx,vy);
    const floor=ctx.createLinearGradient(0,vy,0,height);floor.addColorStop(0,'#c9a35c00');floor.addColorStop(1,'#8a6a3a19');
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
