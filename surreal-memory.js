(() => {
  'use strict';
  const host = document.querySelector('.impressionism-site');
  if (!host) return;
  const room = host.querySelector('.surreal-room');
  const scene = document.createElement('section');
  scene.className = 'memory-scene';
  scene.setAttribute('aria-label', '밤에 떨어지는 시간');
  scene.innerHTML = `<canvas tabindex="0" role="button" aria-label="하늘에서 시계가 무작위로 나타납니다. 누르는 동안 화면 중심에서 커서 방향이 아래가 되어 시계가 계속 떨어집니다. 놓으면 화면 아래로 떨어집니다. 키보드는 Enter 또는 스페이스를 길게 누르세요."></canvas>
    <div class="memory-title"><span>SURREALISM / STUDY 02</span><h2>Falling<br>Hours</h2></div>
    <nav class="memory-nav" aria-label="밤의 시계 제어"><button type="button" data-back>← Back</button><span>02 / FALLING HOURS</span><button type="button" data-pause>Pause Ⅱ</button></nav>`;
  const enter = document.createElement('button');
  enter.type = 'button'; enter.className = 'memory-enter';
  enter.textContent = 'Next Dream';
  host.append(scene, enter);
  const musicToggle = document.createElement('button');
  musicToggle.type = 'button';
  musicToggle.className = 'room-clock-music';
  musicToggle.setAttribute('aria-label', 'Play music');
  musicToggle.setAttribute('aria-pressed', 'false');
  room.append(musicToggle);
  const playerButton = document.getElementById('playPauseBtn');
  musicToggle.addEventListener('click', () => playerButton.click());
  function syncMusicToggle() {
    const playing = playerButton.getAttribute('aria-label') === 'Pause';
    musicToggle.setAttribute('aria-pressed', String(playing));
    musicToggle.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
  }
  new MutationObserver(syncMusicToggle).observe(playerButton, { attributes: true, attributeFilter: ['aria-label'] });
  syncMusicToggle();
  const canvas = scene.querySelector('canvas'), ctx = canvas.getContext('2d');
  const pauseButton = scene.querySelector('[data-pause]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let page = 0, drag = null, paused = reduced.matches;
  let elapsed = 0, last = 0, raf = 0, width = 1, height = 1;
  let pointer = { x: .5, y: .65 };
  const clocks = [];
  let holding = false, nextMeteor = .25;
  let gravityDirection = { x: 0, y: 1 };
  function releaseClocks() {
    holding = false;
    for (const c of clocks) { c.vy = Math.max(0, c.vy); }
  }
  const visible = () => document.body.classList.contains('view-impressionism');
  function setPage(next) {
    if (!next) releaseClocks();
    page = next; host.style.setProperty('--memory-slide', `${-page * 100}%`);
    host.classList.remove('memory-dragging');
    document.body.classList.toggle('memory-open', !!page);
    room.inert = !!page; scene.inert = !page; enter.tabIndex = page ? -1 : 0;
    if (page) { resize(); start(); }
  }
  enter.addEventListener('click', () => { setPage(1); scene.querySelector('[data-back]').focus({ preventScroll: true }); });
  scene.querySelector('[data-back]').addEventListener('click', () => { setPage(0); enter.focus({ preventScroll: true }); });
  function updatePause() { pauseButton.textContent = paused ? 'Resume ▷' : 'Pause Ⅱ'; pauseButton.setAttribute('aria-pressed', String(paused)); }
  pauseButton.addEventListener('click', () => { paused = !paused; updatePause(); });
  updatePause();
  host.addEventListener('pointerdown', e => {
    if (!visible() || e.button !== 0 || !e.isPrimary || drag || e.target.closest('button')) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0 };
    if (page) {
      holding = true;
      if (paused) { paused = false; updatePause(); }
    }
    updatePointer(e); host.setPointerCapture(e.pointerId);
  });
  function updatePointer(e) {
    const rect = host.getBoundingClientRect();
    pointer = { x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) };
  }
  host.addEventListener('pointermove', e => {
    const rect = host.getBoundingClientRect();
    updatePointer(e);
    if (!drag || drag.id !== e.pointerId) return;
    if (page) return;
    drag.dx = e.clientX - drag.x;
    if (Math.abs(drag.dx) > 12 && Math.abs(drag.dx) > Math.abs(e.clientY - drag.y)) {
      host.classList.add('memory-dragging');
      const fraction = Math.max(0, Math.min(1, page - drag.dx / rect.width));
      host.style.setProperty('--memory-slide', `${-fraction * 100}%`);
      if (!page) { resize(); draw(); }
    }
  });
  function release(e) {
    if (!drag || drag.id !== e.pointerId) return;
    const threshold = Math.min(230, host.getBoundingClientRect().width * .24);
    const next = e.type === 'pointercancel' ? page : drag.dx < -threshold ? 1 : drag.dx > threshold ? 0 : page;
    releaseClocks();
    drag = null;
    if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
    setPage(next);
  }
  host.addEventListener('pointerup', release); host.addEventListener('pointercancel', release);
  host.addEventListener('lostpointercapture', () => { releaseClocks(); if (drag) { drag = null; setPage(page); } });
  // This room owns horizontal navigation; suppress the older album swipe handler.
  for (const event of ['touchstart', 'touchend']) host.addEventListener(event, e => { if (visible()) e.stopPropagation(); }, { capture: true, passive: true });
  host.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' && page === 0) { e.preventDefault(); setPage(1); pauseButton.focus(); }
    if (e.key === 'ArrowRight' && page === 1) { e.preventDefault(); setPage(0); enter.focus(); }
  });
  function resize() {
    const r = host.getBoundingClientRect();
    width = r.width || innerWidth; height = r.height || innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    }
  }
  function spawnClock() {
    // Meteors arrive independently of input, from different parts of the sky.
    const size = Math.max(22, Math.min(width, height) * (.038 + Math.random() * .015));
    const x = width * (.08 + Math.random() * .84), y = -size * 1.8;
    const direction = x < width * .5 ? 1 : -1;
    clocks.push({ x, y, vx: direction * (90 + Math.random() * 170), vy: 95 + Math.random() * 130,
      size, angle: (Math.random() - .5) * .6, spin: (Math.random() - .5) * .6,
      age: 0, settled: 0, trail: [], tint: Math.random() });
    if (clocks.length > 40) clocks.shift();
  }
  canvas.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); holding = true;
      if (paused) { paused = false; updatePause(); }
    }
  });
  canvas.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); releaseClocks(); } });
  canvas.addEventListener('blur', () => { if (!drag) releaseClocks(); });
  function advance(dt) {
    nextMeteor -= dt;
    if (nextMeteor <= 0) { spawnClock(); nextMeteor = .55 + Math.random() * 1.15; }
    const gravity = Math.max(220, height * .6);
    if (holding) {
      // The cursor tilts the entire world's down axis; it is not an attractor.
      const dx = (pointer.x - .5) * width;
      const dy = (pointer.y - .5) * height;
      const distance = Math.hypot(dx, dy);
      if (distance > 12) gravityDirection = { x: dx / distance, y: dy / distance };
    }
    for (let i = clocks.length - 1; i >= 0; i--) {
      const c = clocks[i];
      c.age += dt;
      if (holding) {
        c.vx += gravityDirection.x * gravity * dt;
        c.vy += gravityDirection.y * gravity * dt;
        c.settled = 0;
      } else {
        c.vx *= Math.exp(-.5 * dt);
        c.vy += gravity * dt;
      }
      c.x += c.vx * dt; c.y += c.vy * dt; c.angle += c.spin * dt;
      const floor = height * .94 - c.size * 1.22;
      if (!holding && c.y >= floor) {
        c.y = floor;
        if (!holding) {
          c.vy = Math.abs(c.vy) > 65 ? -Math.abs(c.vy) * .24 : 0;
          c.vx *= Math.exp(-5 * dt);
          c.settled += dt;
        }
      }
      if (!holding && (c.x < c.size || c.x > width - c.size)) {
        c.x = Math.max(c.size, Math.min(width - c.size, c.x));
        c.vx *= -.35;
      }
      c.trail.push({x:c.x, y:c.y});
      if (c.trail.length > 32) c.trail.shift();
      const margin = c.size * 5;
      const departed = c.x < -margin || c.x > width + margin || c.y < -margin || c.y > height + margin;
      if (c.settled > 3 || departed) clocks.splice(i, 1);
    }
  }
  function drawClock(c) {
    const alpha = Math.min(1, c.age * 3, (3 - c.settled) / 1.2);
    ctx.save(); ctx.globalAlpha = Math.max(0, alpha);
    if (c.trail.length > 1) {
      ctx.lineCap = 'round';
      for (let i = 1; i < c.trail.length; i++) {
        const strength = i / c.trail.length;
        ctx.beginPath();ctx.moveTo(c.trail[i-1].x,c.trail[i-1].y);ctx.lineTo(c.trail[i].x,c.trail[i].y);
        ctx.strokeStyle = `rgba(164,202,255,${strength * .32})`;
        ctx.lineWidth = c.size * .16 * strength;ctx.stroke();
      }
    }
    ctx.translate(c.x,c.y); ctx.rotate(c.angle);
    const r = c.size;
    const ring = (radius, fill, stroke, line = 1) => {
      ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}
    };
    const metal=ctx.createLinearGradient(-r,-r,r,r);
    for(const [stop,color] of [[0,'#fff1c6'],[.16,'#b68641'],[.3,'#f6dfa0'],[.46,'#725025'],[.57,'#e6bd6c'],[.8,'#8a642e'],[1,'#fff0bb']])metal.addColorStop(stop,color);
    // Cast shadow, turned winding crown, and a polished suspension bow.
    ctx.shadowColor='#000b';ctx.shadowBlur=r*.38;ctx.shadowOffsetY=r*.16;
    ctx.strokeStyle=metal;ctx.lineWidth=r*.065;
    ctx.beginPath();ctx.ellipse(0,-r*1.2,r*.16,r*.19,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=metal;ctx.fillRect(-r*.105,-r*1.16,r*.21,r*.22);
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    for(let i=-3;i<=3;i++){ctx.strokeStyle='#51381b';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(i*r*.025,-r*1.14);ctx.lineTo(i*r*.025,-r*.96);ctx.stroke();}
    ring(r,metal,'#604620',r*.025);
    ring(r*.955,null,'#fff0be',r*.018);
    ring(r*.90,'#3c2e1c','#72552a',r*.04);
    const face=ctx.createRadialGradient(-r*.28,-r*.3,r*.05,0,0,r*.9);
    face.addColorStop(0,'#fffdf0');face.addColorStop(.65,'#e9e3cd');face.addColorStop(1,'#a99d7f');
    ring(r*.85,face,'#f8dfa1',r*.018);
    ring(r*.78,null,'#93877366',.5);
    ctx.strokeStyle='#302c28';
    for(let i=0;i<60;i++){
      const a=i*Math.PI/30;
      const inner=i%5===0?.735:.77;
      ctx.lineWidth=i%5===0?r*.017:r*.008;
      ctx.beginPath();ctx.moveTo(Math.sin(a)*r*inner,Math.cos(a)*r*inner);ctx.lineTo(Math.sin(a)*r*.805,Math.cos(a)*r*.805);ctx.stroke();
    }
    ctx.fillStyle='#302b25';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${r*.17}px Georgia`;
    const numerals=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
    for(let i=1;i<=12;i++){const a=i*Math.PI/6-Math.PI/2;ctx.fillText(numerals[i-1],Math.cos(a)*r*.63,Math.sin(a)*r*.63);}
    ctx.font=`${r*.095}px Georgia`;ctx.fillStyle='#76664e';ctx.fillText('MÉMOIRE',0,-r*.3);
    ctx.font=`${r*.06}px Georgia`;ctx.fillText('AUTOMATIQUE',0,-r*.18);
    // Recessed small-seconds dial with circular machining marks.
    ctx.save();ctx.translate(0,r*.35);
    ring(r*.18,'#d4ccb5','#a69979',.65);
    for(let i=1;i<5;i++)ring(r*(.07+i*.022),null,'#aa9f8330',.4);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(Math.sin(a)*r*.145,Math.cos(a)*r*.145);ctx.lineTo(Math.sin(a)*r*.17,Math.cos(a)*r*.17);ctx.strokeStyle='#736951';ctx.lineWidth=.5;ctx.stroke();}
    ctx.rotate(c.age*1.2);ctx.beginPath();ctx.moveTo(0,r*.035);ctx.lineTo(0,-r*.145);ctx.strokeStyle='#334957';ctx.lineWidth=.8;ctx.stroke();ctx.restore();
    // Bevelled blued-steel hands sit above the enamel and cast small shadows.
    for(const [angle,length,thickness] of [[c.age*.025-1.05,r*.48,r*.045],[c.age*.15+1.05,r*.70,r*.027]]){
      ctx.save();ctx.rotate(angle);ctx.shadowColor='#30291d66';ctx.shadowBlur=1.8;ctx.shadowOffsetX=1;ctx.shadowOffsetY=1.5;
      ctx.beginPath();ctx.moveTo(-thickness,r*.12);ctx.lineTo(-thickness*.65,-length*.65);ctx.lineTo(0,-length);ctx.lineTo(thickness*.65,-length*.65);ctx.lineTo(thickness,r*.12);ctx.closePath();ctx.fillStyle='#173146';ctx.fill();
      ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;ctx.beginPath();ctx.moveTo(0,r*.09);ctx.lineTo(0,-length*.88);ctx.strokeStyle='#9bb4c3';ctx.lineWidth=.6;ctx.stroke();ctx.restore();
    }
    ring(r*.06,metal,'#6b512f',.6);ring(r*.024,'#23394b');
    // A restrained curved reflection across the sapphire glass.
    ctx.save();ctx.beginPath();ctx.arc(0,0,r*.84,0,Math.PI*2);ctx.clip();
    const glass=ctx.createLinearGradient(-r,-r,r*.5,r);
    glass.addColorStop(0,'#ffffff52');glass.addColorStop(.42,'#ffffff0a');glass.addColorStop(.5,'#ffffff25');glass.addColorStop(.53,'#ffffff00');glass.addColorStop(1,'#6d95bc12');
    ctx.fillStyle=glass;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();
    ctx.beginPath();ctx.arc(0,0,r*.925,Math.PI*1.08,Math.PI*1.78);ctx.strokeStyle='#fff6d7bd';ctx.lineWidth=r*.022;ctx.stroke();
    ctx.restore();
  }
  function draw() {
    ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
    const sky = ctx.createLinearGradient(0,0,width*.35,height);
    sky.addColorStop(0,'#030611');sky.addColorStop(.6,'#0b1429');sky.addColorStop(1,'#171c35');
    ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    const haze=ctx.createRadialGradient(width*.72,height*.65,0,width*.72,height*.65,width*.65);
    haze.addColorStop(0,'#34457424');haze.addColorStop(1,'#233c6a00');ctx.fillStyle=haze;ctx.fillRect(0,0,width,height);
    for(let i=0;i<100;i++){
      const x=((Math.sin(i*127.1+3)*43758.5453)%1+1)%1*width;
      const y=((Math.sin(i*311.7+8)*19341.17)%1+1)%1*height;
      ctx.globalAlpha=.18+(.5+.5*Math.sin(elapsed*.35+i))*.38;
      ctx.fillStyle='#d9e5ff';ctx.beginPath();ctx.arc(x,y,i%9===0?1.2:.6,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    const ground = ctx.createLinearGradient(0,height*.92,0,height);
    ground.addColorStop(0,'#a5c6ff00');ground.addColorStop(1,'#a5c6ff12');
    ctx.fillStyle=ground;ctx.fillRect(0,height*.92,width,height*.08);
    clocks.forEach(drawClock);
    if(holding){
      const x=pointer.x*width,y=pointer.y*height;
      ctx.strokeStyle='#d1defd35';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#e0eaff99';ctx.beginPath();ctx.arc(x,y,1.5,0,Math.PI*2);ctx.fill();
    }
  }
  function frame(now) {
    raf=0;
    if(!page || !visible() || document.hidden){last=0;return;}
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    if(!paused){elapsed+=dt;advance(dt);}
    draw();raf=requestAnimationFrame(frame);
  }
  function start(){if(!raf && page && visible() && !document.hidden){last=0;raf=requestAnimationFrame(frame);}}
  new ResizeObserver(() => {resize();if(page)draw();}).observe(host);
  let wasVisible = visible();
  new MutationObserver(() => {
    const isVisible = visible();
    if (isVisible === wasVisible) return;
    wasVisible = isVisible;
    if(!isVisible){drag=null;setPage(0);}else start();
  }).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseClocks();drag=null;}start();});
  window.addEventListener('blur',()=>{releaseClocks();if(drag){drag=null;setPage(page);}});
  setPage(0);
})();
