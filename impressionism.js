(() => {
  'use strict';
  const gallery=document.getElementById('gallery'),pages=document.getElementById('pages');
  const first=document.getElementById('wholePage'),second=document.getElementById('fragmentPage');
  const whole=document.getElementById('wholePainting'),fragment=document.getElementById('fragmentPainting');
  const wholeCtx=whole.getContext('2d'),ctx=fragment.getContext('2d');
  const art=document.getElementById('fragmentArt'),targets=document.getElementById('shardTargets');
  const brush=document.getElementById('brush'),scrubber=document.getElementById('dayTime');
  const cursorBrush=brush.querySelector('svg').cloneNode(true);
  cursorBrush.setAttribute('xmlns','http://www.w3.org/2000/svg');cursorBrush.setAttribute('width','28');cursorBrush.setAttribute('height','98');
  art.style.setProperty('--brush-cursor',`url("data:image/svg+xml,${encodeURIComponent(cursorBrush.outerHTML)}") 14 3, crosshair`);
  const play=document.getElementById('playTime'),pause=document.getElementById('pauseFragments');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let images=[],textures=[],ready=false,page=0,drag=null,raf=0,last=0,inView=true;
  let time=0,playing=!reduced.matches,fragmentPlaying=!reduced.matches,selectedBrush=false;
  let shards=[],selected=-1,fractureAge=0,impact={x:.5,y:.5};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=t=>t*t*(3-2*t);
  const clock=t=>`${String(Math.floor((6+t/7*24)%24)).padStart(2,'0')}:${String(Math.floor((t/7*24%1)*60)).padStart(2,'0')}`;
  function setPage(next) {
    page=next;pages.style.setProperty('--page-offset',`${-page*50}%`);pages.classList.remove('dragging');
    first.inert=!!page;second.inert=!page;gallery.dataset.page=String(page);drag=null;start();
  }
  document.getElementById('nextPage').addEventListener('click',()=>{setPage(1);brush.focus({preventScroll:true});});
  document.getElementById('previousPage').addEventListener('click',()=>{setPage(0);document.getElementById('nextPage').focus({preventScroll:true});});
  gallery.addEventListener('pointerdown',e=>{
    if(e.button!==0||!e.isPrimary||e.target.closest('button,input')||(page&&e.target.closest('#fragmentArt')))return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0};gallery.setPointerCapture(e.pointerId);
  });
  gallery.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;drag.dx=e.clientX-drag.x;
    if(Math.abs(drag.dx)>12&&Math.abs(drag.dx)>Math.abs(e.clientY-drag.y)){
      pages.classList.add('dragging');pages.style.setProperty('--page-offset',`${-clamp(page-drag.dx/gallery.clientWidth,0,1)*50}%`);
    }
  });
  function endDrag(e){if(!drag||e.pointerId!==drag.id)return;const d=drag.dx;const next=e.type==='pointercancel'?page:d < -gallery.clientWidth*.2?1:d>gallery.clientWidth*.2?0:page;drag=null;if(gallery.hasPointerCapture(e.pointerId))gallery.releasePointerCapture(e.pointerId);setPage(next);}
  gallery.addEventListener('pointerup',endDrag);gallery.addEventListener('pointercancel',endDrag);
  gallery.addEventListener('lostpointercapture',()=>{if(drag)setPage(page);});
  gallery.addEventListener('keydown',e=>{if(e.target.closest('input'))return;if(e.key==='ArrowRight'){setPage(1);brush.focus();}if(e.key==='ArrowLeft'){setPage(0);document.getElementById('nextPage').focus();}});
  function syncButtons(){play.textContent=playing?'Pause II':'Play';play.setAttribute('aria-label',playing?'Pause daylight':'Play daylight');pause.textContent=fragmentPlaying?'Pause II':'Play';pause.setAttribute('aria-pressed',String(!fragmentPlaying));}
  play.addEventListener('click',()=>{playing=!playing;syncButtons();start();});
  pause.addEventListener('click',()=>{fragmentPlaying=!fragmentPlaying;syncButtons();start();});
  scrubber.addEventListener('input',()=>{time=Number(scrubber.value)%7;playing=false;syncButtons();draw();});
  function selectBrush(value){selectedBrush=value;brush.setAttribute('aria-pressed',String(value));art.classList.toggle('brush-selected',value);}
  brush.addEventListener('click',()=>selectBrush(!selectedBrush));
  // Half-plane clipping gives a complete, non-overlapping glass mosaic.
  function clip(poly,a,b,c) {
    const out=[];
    for(let i=0;i<poly.length;i++){
      const p=poly[i],q=poly[(i+1)%poly.length];const dp=a*p.x+b*p.y-c,dq=a*q.x+b*q.y-c;
      if(dp<=0)out.push(p);
      if((dp<=0)!==(dq<=0)){const t=dp/(dp-dq);out.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});}
    }return out;
  }
  function fracture(x,y) {
    if(!ready)return;
    impact={x,y};fractureAge=0;selected=-1;targets.replaceChildren();
    const seeds=[{x,y}];
    for(let row=0;row<5;row++)for(let col=0;col<4;col++)seeds.push({x:(col+.18+Math.random()*.64)/4,y:(row+.18+Math.random()*.64)/5});
    for(let i=0;i<6;i++){const a=i*Math.PI/3;seeds.push({x:clamp(x+Math.cos(a)*.1,.005,.995),y:clamp(y+Math.sin(a)*.1,.005,.995)});}
    shards=seeds.map((seed,index)=>{
      let poly=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
      for(const other of seeds){if(other===seed)continue;const a=other.x-seed.x,b=other.y-seed.y,c=(other.x**2+other.y**2-seed.x**2-seed.y**2)/2;poly=clip(poly,a,b,c);if(!poly.length)break;}
      if(poly.length<3)return null;
      const centroid=poly.reduce((sum,p)=>({x:sum.x+p.x/poly.length,y:sum.y+p.y/poly.length}),{x:0,y:0});
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',poly.map((p,i)=>`${i?'L':'M'}${p.x*1000},${p.y*1500}`).join(' ')+' Z');
      path.dataset.index=String(index);path.setAttribute('role','button');path.setAttribute('tabindex','0');path.setAttribute('aria-label',`Accelerate fragment ${index+1}`);path.setAttribute('aria-pressed','false');targets.append(path);
      return {poly,centroid,path,phase:(time+index*.83+Math.random()*.4)%7,speed:1,index};
    }).filter(Boolean);
    targets.setAttribute('viewBox','0 0 1000 1500');targets.setAttribute('preserveAspectRatio','none');
    gallery.dataset.fractured='true';selectBrush(false);fragmentPlaying=true;syncButtons();start();
  }
  function selectShard(index) {
    selected=index;for(const shard of shards)shard.path.setAttribute('aria-pressed',String(shard.index===index));
    fragmentPlaying=true;syncButtons();start();
  }
  art.addEventListener('click',e=>{
    if(selectedBrush){const r=art.getBoundingClientRect();fracture(clamp((e.clientX-r.left)/r.width,0,1),clamp((e.clientY-r.top)/r.height,0,1));return;}
    const target=e.target.closest('[data-index]');if(target)selectShard(Number(target.dataset.index));
  });
  art.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();if(selectedBrush)fracture(.5,.5);else if(e.target.dataset.index)selectShard(Number(e.target.dataset.index));});
  document.getElementById('resetGlass').addEventListener('click',()=>{shards=[];selected=-1;targets.replaceChildren();gallery.dataset.fractured='false';selectBrush(false);draw();});
  function resize() {
    const r=whole.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
    for(const c of [whole,fragment]){c.width=w;c.height=h;}
    if(images.length){textures=images.map(img=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);return c;});}
    if(ready)draw();
  }
  new ResizeObserver(resize).observe(whole);
  function blend(context,phase,bounds) {
    const t=((phase%7)+7)%7,a=Math.floor(t),b=(a+1)%7,f=smooth(t-a);
    const w=whole.width,h=whole.height;
    const r=bounds||{x:0,y:0,w,h};
    context.globalAlpha=1;context.drawImage(textures[a],r.x,r.y,r.w,r.h,r.x,r.y,r.w,r.h);
    context.globalAlpha=f;context.drawImage(textures[b],r.x,r.y,r.w,r.h,r.x,r.y,r.w,r.h);context.globalAlpha=1;
  }
  function polygon(context,poly,w,h){context.beginPath();poly.forEach((p,i)=>i?context.lineTo(p.x*w,p.y*h):context.moveTo(p.x*w,p.y*h));context.closePath();}
  function draw() {
    if(!ready||textures.length!==7)return;
    if(!page){blend(wholeCtx,time);scrubber.value=String(time);document.getElementById('wholeTime').textContent=clock(time);return;}
    const w=fragment.width,h=fragment.height;
    if(!shards.length){blend(ctx,time);document.getElementById('fragmentTime').textContent='One light';return;}
    ctx.fillStyle='#3c3840';ctx.fillRect(0,0,w,h);
    const reveal=reduced.matches?1:smooth(clamp(fractureAge/1.1,0,1));
    for(const shard of shards){
      const poly=shard.poly,center=shard.centroid;
      const burst=reduced.matches?0:Math.sin(Math.min(1,fractureAge/1.1)*Math.PI)*9;
      const dx=(center.x-impact.x)*burst,dy=(center.y-impact.y)*burst;
      const xs=poly.map(p=>p.x*w),ys=poly.map(p=>p.y*h);
      const bounds={x:Math.max(0,Math.floor(Math.min(...xs))),y:Math.max(0,Math.floor(Math.min(...ys)))};
      bounds.w=Math.min(w-bounds.x,Math.ceil(Math.max(...xs))-bounds.x+1);bounds.h=Math.min(h-bounds.y,Math.ceil(Math.max(...ys))-bounds.y+1);
      ctx.save();ctx.translate(dx,dy);polygon(ctx,poly,w,h);ctx.clip();
      blend(ctx,time,bounds);
      // Reveal the independent moments after cracks spread out from the brush tip.
      const distance=Math.hypot(center.x-impact.x,center.y-impact.y);
      const localReveal=clamp(reveal*1.8-distance*.65,0,1);
      if(localReveal>0){
        const phase=((shard.phase%7)+7)%7,a=Math.floor(phase),b=(a+1)%7,f=smooth(phase-a);
        ctx.globalAlpha=localReveal;ctx.drawImage(textures[a],bounds.x,bounds.y,bounds.w,bounds.h,bounds.x,bounds.y,bounds.w,bounds.h);
        ctx.globalAlpha=localReveal*f;ctx.drawImage(textures[b],bounds.x,bounds.y,bounds.w,bounds.h,bounds.x,bounds.y,bounds.w,bounds.h);ctx.globalAlpha=1;
      }
      ctx.restore();
      ctx.save();ctx.translate(dx,dy);polygon(ctx,poly,w,h);
      ctx.strokeStyle=`rgba(31,33,47,${reveal*.65})`;ctx.lineWidth=2.5;ctx.stroke();
      ctx.translate(-.6,-.7);polygon(ctx,poly,w,h);ctx.strokeStyle=`rgba(255,249,225,${reveal*.75})`;ctx.lineWidth=1;ctx.stroke();
      if(shard.index===selected){polygon(ctx,poly,w,h);ctx.strokeStyle='#ffecc0';ctx.lineWidth=2.5;ctx.shadowColor='#ffe5a5';ctx.shadowBlur=8;ctx.stroke();}
      ctx.restore();
    }
    const active=shards.find(s=>s.index===selected);
    document.getElementById('fragmentTime').textContent=active?clock(active.phase)+' / 12×':`${shards.length} moments`;
  }
  function frame(now) {
    raf=0;if(document.hidden||!inView){last=0;return;}
    const dt=last?Math.min((now-last)/1000,.07):0;last=now;
    if(!page&&playing)time=(time+dt*7/70)%7;
    if(page&&fragmentPlaying){
      fractureAge+=dt;
      if(!shards.length)time=(time+dt*7/70)%7;
      for(const shard of shards){const target=shard.index===selected?12:1;shard.speed+=(target-shard.speed)*Math.min(1,dt*4);shard.phase=(shard.phase+dt*7/70*shard.speed)%7;}
    }
    draw();raf=requestAnimationFrame(frame);
  }
  function start(){if(!raf&&ready&&!document.hidden&&inView){last=0;raf=requestAnimationFrame(frame);}}
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)start();else{cancelAnimationFrame(raf);raf=0;last=0;}}).observe(gallery);
  document.addEventListener('visibilitychange',start);
  async function init(){
    images=await Promise.all(['2.png','1.png','3.png','4.png','5.png','6.png','7.png'].map(async src=>{const img=new Image();img.src=src;await img.decode();return img;}));
    ready=true;resize();syncButtons();document.getElementById('imageStatus').textContent='';setPage(0);start();
  }
  init().catch(e=>{document.getElementById('imageStatus').textContent='Images unavailable — reload to retry';console.error(e);});
})();
