(() => {
  'use strict';
  const gallery=document.getElementById('gallery'),pages=document.getElementById('pages');
  const first=document.getElementById('wholePage'),second=document.getElementById('fragmentPage');
  const whole=document.getElementById('wholePainting'),fragment=document.getElementById('fragmentPainting');
  const wholeCtx=whole.getContext('2d'),ctx=fragment.getContext('2d');
  const art=document.getElementById('fragmentArt'),targets=document.getElementById('shardTargets');
  const hammer=document.getElementById('hammer'),scrubber=document.getElementById('dayTime');
  const play=document.getElementById('playTime'),pause=document.getElementById('pauseFragments');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  // Dashboard-style speed control, one per room — how fast each room's light cycles through the painting.
  const speeds=[.25,.5,1,2,4,8];
  const polarPoint=(angleDeg,r)=>{const rad=angleDeg*Math.PI/180;return {x:100+Math.sin(rad)*r,y:100-Math.cos(rad)*r};};
  const angleForSpeed=i=>-120+i*(240/(speeds.length-1));
  function arcPath(a0,a1,r) {
    const p0=polarPoint(a0,r),p1=polarPoint(a1,r),large=(a1-a0)>180?1:0;
    return `M${p0.x.toFixed(2)},${p0.y.toFixed(2)} A${r},${r} 0 ${large} 1 ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
  }
  const formatMult=mult=>`${mult<1?String(mult).slice(1):mult}×`;
  function makeSpeedControl(suffix) {
    const needle=document.getElementById(`gaugeNeedle${suffix}`),progress=document.getElementById(`gaugeProgress${suffix}`);
    const valueEl=document.getElementById(`speedValue${suffix}`),down=document.getElementById(`speedDown${suffix}`),up=document.getElementById(`speedUp${suffix}`);
    let index=2;
    function update() {
      const angle=angleForSpeed(index),mult=speeds[index];
      needle.style.transform=`rotate(${angle}deg)`;
      progress.setAttribute('d',arcPath(-120,angle,80));
      valueEl.textContent=formatMult(mult);
      down.disabled=index===0;up.disabled=index===speeds.length-1;
    }
    down.addEventListener('click',()=>{index=Math.max(0,index-1);update();});
    up.addEventListener('click',()=>{index=Math.min(speeds.length-1,index+1);update();});
    update();
    return {get mult(){return speeds[index];}};
  }
  const roomSpeed=makeSpeedControl(''),fragmentSpeed=makeSpeedControl('2');
  let images=[],textures=[],avgColors=[],ready=false,page=0,drag=null,raf=0,last=0,inView=true,swinging=false;
  let time=0,playing=!reduced.matches,fragmentPlaying=!reduced.matches;
  let shards=[],selected=-1,fractureAge=0,impact={x:.5,y:.5};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=t=>t*t*(3-2*t);
  const clock=t=>`${String(Math.floor((6+t/7*24)%24)).padStart(2,'0')}:${String(Math.floor((t/7*24%1)*60)).padStart(2,'0')}`;
  function setPage(next) {
    page=next;pages.style.setProperty('--page-offset',`${-page*50}%`);pages.classList.remove('dragging');
    first.inert=!!page;second.inert=!page;gallery.dataset.page=String(page);drag=null;start();
  }
  document.getElementById('nextPage').addEventListener('click',()=>{setPage(1);hammer.focus({preventScroll:true});});
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
  gallery.addEventListener('keydown',e=>{if(e.target.closest('input'))return;if(e.key==='ArrowRight'){setPage(1);hammer.focus();}if(e.key==='ArrowLeft'){setPage(0);document.getElementById('nextPage').focus();}});
  function syncButtons(){play.textContent=playing?'Pause II':'Play';play.setAttribute('aria-label',playing?'Pause daylight':'Play daylight');pause.textContent=fragmentPlaying?'Pause II':'Play';pause.setAttribute('aria-pressed',String(!fragmentPlaying));}
  play.addEventListener('click',()=>{playing=!playing;syncButtons();start();});
  pause.addEventListener('click',()=>{fragmentPlaying=!fragmentPlaying;syncButtons();start();});
  scrubber.addEventListener('input',()=>{time=Number(scrubber.value)%7;playing=false;syncButtons();draw();});
  // Synthesized so the page needs no audio asset: a low mallet thud under a burst of filtered noise and a
  // handful of quick, detuned high tones — read together as a single glassy crash.
  let audioCtx=null;
  function playGlassBreak() {
    try {
      if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==='suspended')audioCtx.resume();
      const ctxA=audioCtx,now=ctxA.currentTime;
      const master=ctxA.createGain();master.gain.value=.55;master.connect(ctxA.destination);
      const thud=ctxA.createOscillator();thud.type='sine';
      thud.frequency.setValueAtTime(150,now);thud.frequency.exponentialRampToValueAtTime(48,now+.09);
      const thudGain=ctxA.createGain();thudGain.gain.setValueAtTime(.9,now);thudGain.gain.exponentialRampToValueAtTime(.001,now+.14);
      thud.connect(thudGain);thudGain.connect(master);thud.start(now);thud.stop(now+.15);
      const bufferSize=Math.floor(ctxA.sampleRate*.35);
      const buffer=ctxA.createBuffer(1,bufferSize,ctxA.sampleRate);
      const data=buffer.getChannelData(0);
      for(let i=0;i<bufferSize;i++)data[i]=(Math.random()*2-1)*(1-i/bufferSize)**2;
      const noise=ctxA.createBufferSource();noise.buffer=buffer;
      const band=ctxA.createBiquadFilter();band.type='bandpass';band.frequency.value=3400;band.Q.value=.6;
      const noiseGain=ctxA.createGain();noiseGain.gain.setValueAtTime(.001,now);noiseGain.gain.linearRampToValueAtTime(.55,now+.025);noiseGain.gain.exponentialRampToValueAtTime(.001,now+.34);
      noise.connect(band);band.connect(noiseGain);noiseGain.connect(master);noise.start(now+.015);
      for(const f of [3600,4400,5300,6100,7000,5700]) {
        const t0=now+.02+Math.random()*.05;
        const osc=ctxA.createOscillator();osc.type='triangle';
        osc.frequency.setValueAtTime(f*(1+Math.random()*.12),t0);osc.frequency.exponentialRampToValueAtTime(f*.55,t0+.2);
        const g=ctxA.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.2,t0+.006);g.gain.exponentialRampToValueAtTime(.001,t0+.2+Math.random()*.16);
        osc.connect(g);g.connect(master);osc.start(t0);osc.stop(t0+.4);
      }
    } catch(e) {/* Web Audio unavailable — the visual strike still lands without sound. */}
  }
  // One deliberate strike, not a select-then-paint gesture: the hammer swings from a low grip pivot so its
  // head visibly crosses toward the painting, and lands together with the crash and the crack pattern.
  function strikeHammer() {
    if(!ready||swinging)return;
    swinging=true;hammer.classList.add('swinging');
    const impactDelay=reduced.matches?0:330;
    setTimeout(()=>{
      fracture(.5,.5);playGlassBreak();
      art.classList.add('impact');fragment.classList.add('shudder');
      setTimeout(()=>{art.classList.remove('impact');fragment.classList.remove('shudder');},450);
    },impactDelay);
    const settle=reduced.matches?0:680;
    setTimeout(()=>{swinging=false;hammer.classList.remove('swinging');},settle);
  }
  hammer.addEventListener('click',strikeHammer);
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
    // Fewer, chunkier panes read as leaded stained glass rather than a fine shatter.
    const seeds=[{x,y}];
    for(let row=0;row<3;row++)for(let col=0;col<3;col++)seeds.push({x:(col+.16+Math.random()*.68)/3,y:(row+.16+Math.random()*.68)/3});
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;seeds.push({x:clamp(x+Math.cos(a)*.12,.005,.995),y:clamp(y+Math.sin(a)*.12,.005,.995)});}
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
    gallery.dataset.fractured='true';fragmentPlaying=true;syncButtons();start();
  }
  function selectShard(index) {
    selected=index;for(const shard of shards)shard.path.setAttribute('aria-pressed',String(shard.index===index));
    fragmentPlaying=true;syncButtons();start();
  }
  art.addEventListener('click',e=>{
    const target=e.target.closest('[data-index]');if(target)selectShard(Number(target.dataset.index));
  });
  art.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;if(!e.target.dataset.index)return;e.preventDefault();selectShard(Number(e.target.dataset.index));});
  document.getElementById('resetGlass').addEventListener('click',()=>{shards=[];selected=-1;targets.replaceChildren();gallery.dataset.fractured='false';draw();});
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
  // The gallery wall leans toward whatever hour the painting is showing, sampled once per source image
  // rather than hardcoded, so it stays true if the images ever change.
  function averageColor(img) {
    const c=document.createElement('canvas');c.width=12;c.height=12;
    const cctx=c.getContext('2d');cctx.drawImage(img,0,0,12,12);
    const data=cctx.getImageData(0,0,12,12).data;
    let r=0,g=0,b=0,n=0;
    for(let i=0;i<data.length;i+=4){r+=data[i];g+=data[i+1];b+=data[i+2];n++;}
    return {r:r/n,g:g/n,b:b/n};
  }
  function updateTone() {
    if(avgColors.length!==7)return;
    const t=((time%7)+7)%7,a=Math.floor(t),b=(a+1)%7,f=t-a;
    const ca=avgColors[a],cb=avgColors[b];
    const r=Math.round(ca.r+(cb.r-ca.r)*f),g=Math.round(ca.g+(cb.g-ca.g)*f),bl=Math.round(ca.b+(cb.b-ca.b)*f);
    gallery.style.setProperty('--tone',`rgb(${r} ${g} ${bl})`);
  }
  function draw() {
    if(!ready||textures.length!==7)return;
    updateTone();
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
      // Reveal the independent moments after cracks spread out from the hammer's point of impact.
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
    document.getElementById('fragmentTime').textContent=active?`${clock(active.phase)} / ${formatMult(fragmentSpeed.mult)}`:`${shards.length} moments`;
  }
  function frame(now) {
    raf=0;if(document.hidden||!inView){last=0;return;}
    const dt=last?Math.min((now-last)/1000,.07):0;last=now;
    if(!page&&playing)time=(time+dt*7/70*roomSpeed.mult)%7;
    if(page&&fragmentPlaying){
      fractureAge+=dt;
      if(!shards.length)time=(time+dt*7/70*fragmentSpeed.mult)%7;
      // Every pane keeps its own moment flowing at the plain pace by default; selecting one is what hands
      // it to the dial, so only that pane's speed answers to +/-.
      for(const shard of shards){const target=shard.index===selected?fragmentSpeed.mult:1;shard.speed+=(target-shard.speed)*Math.min(1,dt*4);shard.phase=(shard.phase+dt*7/70*shard.speed)%7;}
    }
    draw();raf=requestAnimationFrame(frame);
  }
  function start(){if(!raf&&ready&&!document.hidden&&inView){last=0;raf=requestAnimationFrame(frame);}}
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)start();else{cancelAnimationFrame(raf);raf=0;last=0;}}).observe(gallery);
  document.addEventListener('visibilitychange',start);
  async function init(){
    images=await Promise.all(['2.png','1.png','3.png','4.png','5.png','6.png','7.png'].map(async src=>{const img=new Image();img.src=src;await img.decode();return img;}));
    avgColors=images.map(averageColor);
    ready=true;resize();syncButtons();document.getElementById('imageStatus').textContent='';setPage(0);start();
  }
  init().catch(e=>{document.getElementById('imageStatus').textContent='Images unavailable — reload to retry';console.error(e);});
})();
