(() => {
  'use strict';
  const host = document.querySelector('.impressionism-site');
  if (!host) return;
  const room = host.querySelector('.surreal-room');
  const scene = document.createElement('section');
  scene.className = 'memory-scene';
  scene.setAttribute('aria-label', '세 부분으로 나뉜 몸을 조합해 낯선 존재를 만드는 초현실주의 카드 놀이');
  scene.innerHTML = `<canvas aria-hidden="true"></canvas>
    <div class="corpse-hit" id="corpseHit">
      <button class="corpse-band" data-band="0" type="button"></button>
      <button class="corpse-band" data-band="1" type="button"></button>
      <button class="corpse-band" data-band="2" type="button"></button>
    </div>
    <div class="memory-title"><span>THE SURREALISTS / CADAVRE EXQUIS, 1925</span><h2>Exquisite<br>Corpse.</h2></div>
    <p class="corpse-caption" id="corpseCaption" aria-live="polite"></p>
    <button class="chance-meeting" id="chanceMeeting" type="button" aria-label="손잡이를 아래로 당기거나 눌러 무작위 조합">
      <span class="lever-track" aria-hidden="true"></span><span class="lever-base" aria-hidden="true"></span>
      <span class="lever-stem" aria-hidden="true"></span><span class="lever-knob" aria-hidden="true"></span>
      <span class="lever-label" aria-hidden="true">PULL <span>↓</span></span>
    </button>
    <nav class="memory-nav" aria-label="조합 카드 조작"><button type="button" data-back>&larr; Back</button><span>02 / EXQUISITE CORPSE</span></nav>`;
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
  const hitWrap = scene.querySelector('#corpseHit');
  const bandButtons = [...scene.querySelectorAll('.corpse-band')];
  const captionEl = scene.querySelector('#corpseCaption');
  const chanceBtn = scene.querySelector('#chanceMeeting');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let page = 0, drag = null;
  let elapsed = 0, last = 0, raf = 0, width = 1, height = 1;
  const visible = () => document.body.classList.contains('view-impressionism');
  const lampChain = document.getElementById('pullChain');
  const chainHome = document.createComment('Lamp chain position outside the surreal room');
  lampChain.before(chainHome);
  function syncLampChain() {
    // Share the room's translation and clipping, including interactive swipes.
    // Restore the original location when another artwork is opened.
    if (visible()) room.append(lampChain);
    else chainHome.after(lampChain);
  }
  syncLampChain();

  function setPage(next) {
    page = next; host.style.setProperty('--memory-slide', `${-page * 100}%`);
    host.classList.remove('memory-dragging');
    document.body.classList.toggle('memory-open', !!page);
    room.inert = !!page; scene.inert = !page; enter.tabIndex = page ? -1 : 0;
    if (page) { loadArtwork(); resize(); start(); }
  }
  enter.addEventListener('click', () => { setPage(1); bandButtons[0].focus({ preventScroll: true }); });
  scene.querySelector('[data-back]').addEventListener('click', () => { setPage(0); enter.focus({ preventScroll: true }); });

  // The room-switch swipe lives on the whole host; band buttons opt out via the closest('button') guard below.
  host.addEventListener('pointerdown', e => {
    if (!visible() || e.button !== 0 || !e.isPrimary || drag || e.target.closest('button')) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0 };
    host.setPointerCapture(e.pointerId);
  });
  host.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const rect = host.getBoundingClientRect();
    drag.dx = e.clientX - drag.x;
    if (Math.abs(drag.dx) > 12 && Math.abs(drag.dx) > Math.abs(e.clientY - drag.y)) {
      host.classList.add('memory-dragging');
      const fraction = clamp(page - drag.dx / rect.width, 0, 1);
      host.style.setProperty('--memory-slide', `${-fraction * 100}%`);
    }
  });
  function release(e) {
    if (!drag || drag.id !== e.pointerId) return;
    const threshold = Math.min(230, host.getBoundingClientRect().width * .24);
    const next = e.type === 'pointercancel' ? page : drag.dx < -threshold ? 1 : drag.dx > threshold ? 0 : page;
    drag = null;
    if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
    setPage(next);
  }
  host.addEventListener('pointerup', release); host.addEventListener('pointercancel', release);
  host.addEventListener('lostpointercapture', () => { if (drag) { drag = null; setPage(page); } });
  for (const event of ['touchstart', 'touchend']) host.addEventListener(event, e => { if (visible()) e.stopPropagation(); }, { capture: true, passive: true });
  host.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' && page === 0) { e.preventDefault(); setPage(1); bandButtons[0].focus(); }
    if (e.key === 'ArrowRight' && page === 1 && document.activeElement === bandButtons[0]) { e.preventDefault(); setPage(0); enter.focus(); }
  });

  function resize() {
    const r = host.getBoundingClientRect();
    width = r.width || innerWidth; height = r.height || innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    }
    layout();
  }
  function geometry() {
    const compact = width <= 600;
    let cardW = Math.min(compact ? width - 96 : width * .42, 540);
    let cardH = cardW * 1.72;
    const maxH = height * (compact ? .7 : .84);
    if (cardH > maxH) { cardH = maxH; cardW = cardH / 1.72; }
    const cardX = width * .5 - cardW / 2, top = height * .49 - cardH / 2;
    return { cardX, top, cardW, cardH, bandH: cardH / 3 };
  }
  function layout() {
    const g = geometry();
    hitWrap.style.setProperty('--card-x', `${g.cardX + g.cardW / 2}px`);
    hitWrap.style.setProperty('--card-y', `${g.top + g.cardH / 2}px`);
    hitWrap.style.setProperty('--card-w', `${g.cardW}px`);
    hitWrap.style.setProperty('--card-h', `${g.cardH}px`);
    scene.style.setProperty('--lever-x', `${g.cardX + g.cardW + (width <= 600 ? 27 : 65)}px`);
    scene.style.setProperty('--lever-y', `${g.top + g.cardH * .52}px`);
  }

  // --- The three folds: each a bank of six unrelated parts, chosen blind of one another. ---
  const NAMES = [
    ['Melting Clock', 'Open Birdcage', 'Butterfly Eye', 'Apple for a Face', 'Candle Flame', 'Crescent Moon'],
    ['Chest of Drawers', "Grandfather's Clock", 'Caged Ribs', 'Upright Piano', 'Thundercloud', 'Hollow Tree'],
    ['Flamingo Legs', 'Pendulum Legs', "Barber's Pole", 'Tangled Roots', 'Riding a Cloud', 'Umbrella Ribs']
  ];
  const INK = '#2a1f14', PAPER_FILL = '#f4ead0', GOLD = '#a97c3f';
  const px = (b, f) => b.x + f * b.w, py = (b, f) => b.y + f * b.h;
  function ink(lw) { ctx.strokeStyle = INK; ctx.fillStyle = PAPER_FILL; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
  function neckStub(b, cy0, halfFrac = .05) {
    const half = b.w * halfFrac;
    ctx.beginPath();
    ctx.moveTo(px(b, .5) - half, cy0); ctx.lineTo(px(b, .5) - half, py(b, 1));
    ctx.moveTo(px(b, .5) + half, cy0); ctx.lineTo(px(b, .5) + half, py(b, 1));
    ctx.stroke();
  }

  const HEAD = [
    // Melting clock — a Dalí nod: the clock face droops past its own band.
    (b, t) => {
      const lw = Math.max(1.4, b.w * .009); ink(lw);
      const cx = px(b, .5), cy = py(b, .48), r = b.w * .25, sag = 9 + Math.sin(t * .7) * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 1.02, Math.PI * 1.98);
      ctx.bezierCurveTo(cx + r * .92, cy + r * .74, cx + r * .26, cy + r * 1.95 + sag, cx, cy + r * 2.05 + sag);
      ctx.bezierCurveTo(cx - r * .26, cy + r * 1.95 + sag, cx - r * .92, cy + r * .74, cx - r, cy);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineWidth = lw * .6;
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * r * .86, cy - Math.cos(a) * r * .86); ctx.lineTo(cx + Math.sin(a) * r * .73, cy - Math.cos(a) * r * .73); ctx.stroke(); }
      const ha = t * .5, ma = t * 3;
      ctx.lineWidth = lw * 1.15; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(ha) * r * .4, cy - Math.cos(ha) * r * .4); ctx.stroke();
      ctx.lineWidth = lw * .7; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(ma) * r * .62, cy - Math.cos(ma) * r * .62); ctx.stroke();
      neckStub(b, cy + r * 2.05 + sag);
    },
    // A birdcage for a head, door open, one small tenant.
    (b, t) => {
      const lw = Math.max(1.2, b.w * .007); ink(lw);
      const cx = px(b, .5), top = py(b, .2), bot = py(b, .78), r = b.w * .21;
      ctx.beginPath(); ctx.ellipse(cx, top, r, r * .38, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, bot, r * .78, r * .3, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i <= 7; i++) { const a = -Math.PI * .92 + Math.PI * 1.84 * i / 7; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r, top); ctx.lineTo(cx + Math.cos(a) * r * .8, bot); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(cx, py(b, .04)); ctx.lineTo(cx, top - r * .08); ctx.stroke();
      const bx = cx + Math.sin(t * 1.3) * r * .22, by = (top + bot) / 2 + Math.sin(t * 2.1) * 3;
      ctx.fillStyle = '#3a2c1c';
      ctx.beginPath(); ctx.ellipse(bx, by, r * .2, r * .15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx + r * .18, by); ctx.lineTo(bx + r * .3, by - 2); ctx.lineTo(bx + r * .18, by + 3); ctx.closePath(); ctx.fill();
      neckStub(b, bot + r * .06);
    },
    // A single lashed eye, wide open, wings for lashes.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const cx = px(b, .5), cy = py(b, .48), r = b.w * .24;
      const blink = reduced.matches ? 1 : clamp(1 - Math.pow(Math.sin(t * .55), 16), .06, 1);
      ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.quadraticCurveTo(cx, cy - r * blink, cx + r, cy); ctx.quadraticCurveTo(cx, cy + r * blink, cx - r, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * .38 * blink, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
      ctx.fillStyle = GOLD;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * r * .9, cy - r * .1); ctx.quadraticCurveTo(cx + s * r * 1.5, cy - r * .8, cx + s * r * 1.9, cy - r * .3); ctx.quadraticCurveTo(cx + s * r * 1.3, cy - r * .05, cx + s * r * .9, cy + r * .1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      neckStub(b, cy + r * .9);
    },
    // Magritte's green apple, hovering where a face should be.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const cx = px(b, .5), cy = py(b, .5) + Math.sin(t * .8) * 4, r = b.w * .22;
      ctx.strokeStyle = INK; ctx.fillStyle = '#eef0dd66';
      ctx.beginPath(); ctx.ellipse(cx, cy, r * .82, r, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#8ba15b';
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.bezierCurveTo(cx + r * .95, cy - r * .9, cx + r * .95, cy + r * .85, cx, cy + r); ctx.bezierCurveTo(cx - r * .95, cy + r * .85, cx - r * .95, cy - r * .9, cx, cy - r); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#4a3a1c'; ctx.lineWidth = lw * 1.1; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.quadraticCurveTo(cx + r * .1, cy - r * 1.3, cx + r * .05, cy - r * 1.5); ctx.stroke();
      neckStub(b, cy + r);
    },
    // A candle standing where a head belongs, wax like hair.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const cx = px(b, .5), top = py(b, .16), bot = py(b, .82), r = b.w * .13;
      ctx.beginPath(); ctx.moveTo(cx - r, top); ctx.lineTo(cx - r * 1.15, bot); ctx.lineTo(cx + r * 1.15, bot); ctx.lineTo(cx + r, top); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const s of [-1, -.3, .5]) { ctx.beginPath(); ctx.moveTo(cx + s * r, top); ctx.quadraticCurveTo(cx + s * r * 1.4, top + (bot - top) * .3, cx + s * r * .8, top + (bot - top) * .55); ctx.stroke(); }
      const flick = reduced.matches ? 0 : Math.sin(t * 7) * 2;
      ctx.fillStyle = '#c96a2e';
      ctx.beginPath(); ctx.moveTo(cx, top - r * 1.6 + flick); ctx.quadraticCurveTo(cx + r * .55, top - r * .5, cx, top + r * .1); ctx.quadraticCurveTo(cx - r * .55, top - r * .5, cx, top - r * 1.6 + flick); ctx.fill();
      neckStub(b, bot);
    },
    // A crescent moon in profile, a keyhole for its watching eye.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const cx = px(b, .5), cy = py(b, .48), r = b.w * .27;
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * .5, Math.PI * 1.85); ctx.arc(cx + r * .55, cy, r * .82, Math.PI * 1.85, Math.PI * .5, true); ctx.closePath(); ctx.fill(); ctx.stroke();
      const gx = cx - r * .18, gy = cy - r * .02;
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(gx, gy, r * .12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(gx - r * .05, gy); ctx.lineTo(gx + r * .05, gy); ctx.lineTo(gx + r * .09, gy + r * .32); ctx.lineTo(gx - r * .09, gy + r * .32); ctx.closePath(); ctx.fill();
      neckStub(b, cy + r * .85);
    }
  ];

  const TORSO = [
    // Dalí's chest of drawers, one pulled open with an eye inside.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const x = px(b, .22), w = b.w * .56, top = py(b, .08), bot = py(b, .92), rows = 4;
      ctx.beginPath(); ctx.rect(x, top, w, bot - top); ctx.fill(); ctx.stroke();
      for (let i = 1; i < rows; i++) { const y = top + (bot - top) * i / rows; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
      const openRow = 2, oy = top + (bot - top) * openRow / rows, oh = (bot - top) / rows;
      const openF = reduced.matches ? .5 : .4 + Math.sin(t * .9) * .12;
      ctx.fillStyle = '#3a2c1c'; ctx.fillRect(x - w * openF * .28, oy + oh * .15, w * (1 + openF * .28), oh * .7); ctx.strokeRect(x - w * openF * .28, oy + oh * .15, w * (1 + openF * .28), oh * .7);
      ctx.beginPath(); ctx.arc(x + w * .22, oy + oh * .5, oh * .22, 0, Math.PI * 2); ctx.fillStyle = '#efe3c8'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w * .22, oy + oh * .5, oh * .09, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
      for (let i = 0; i < rows; i++) if (i !== openRow) { const y = top + (bot - top) * (i + .5) / rows; ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x + w * .5, y, oh * .06, 0, Math.PI * 2); ctx.fill(); }
    },
    // A grandfather clock case, pendulum swinging behind its little door.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const x = px(b, .28), w = b.w * .44, top = py(b, .06), bot = py(b, .94);
      ctx.beginPath(); ctx.moveTo(x, bot); ctx.lineTo(x, top + (bot - top) * .12); ctx.quadraticCurveTo(x, top, x + w * .5, top); ctx.quadraticCurveTo(x + w, top, x + w, top + (bot - top) * .12); ctx.lineTo(x + w, bot); ctx.closePath(); ctx.fill(); ctx.stroke();
      const fcy = top + (bot - top) * .22, fr = w * .3;
      ctx.beginPath(); ctx.arc(x + w * .5, fcy, fr, 0, Math.PI * 2); ctx.stroke();
      const wy = top + (bot - top) * .4, wh = (bot - top) * .5, wcx = x + w * .5;
      ctx.strokeRect(wcx - w * .32, wy, w * .64, wh);
      const swing = Math.sin(t * 1.8) * .38;
      ctx.save(); ctx.translate(wcx, wy); ctx.rotate(swing);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, wh * .82); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, wh * .82, w * .1, 0, Math.PI * 2); ctx.fillStyle = GOLD; ctx.fill(); ctx.stroke();
      ctx.restore();
    },
    // Ribs bent into cage bars, a small bird nested where the heart would be.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const cx = px(b, .5), top = py(b, .1), bot = py(b, .9), rw = b.w * .34;
      ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, bot); ctx.stroke();
      for (let i = 0; i < 5; i++) { const y = top + (bot - top) * (i + .5) / 5, sway = Math.sin(t * 1.2 + i) * 2;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx, y - 8); ctx.quadraticCurveTo(cx + s * rw + sway, y, cx, y + 8); ctx.stroke(); } }
      const bx = cx, by = (top + bot) / 2 + Math.sin(t * 2.4) * 3;
      ctx.fillStyle = '#3a2c1c'; ctx.beginPath(); ctx.ellipse(bx, by, rw * .32, rw * .22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx + rw * .28, by); ctx.lineTo(bx + rw * .42, by - 2); ctx.lineTo(bx + rw * .28, by + 3); ctx.closePath(); ctx.fill();
    },
    // An upright piano worn as a torso, keys bared like teeth.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const x = px(b, .18), w = b.w * .64, top = py(b, .12), bot = py(b, .82);
      ctx.beginPath(); ctx.rect(x, top, w, bot - top); ctx.fill(); ctx.stroke();
      const ky = top + (bot - top) * .62, kh = (bot - top) * .22;
      ctx.fillStyle = '#f4ead0'; ctx.fillRect(x + w * .06, ky, w * .88, kh); ctx.strokeRect(x + w * .06, ky, w * .88, kh);
      const keys = 9;
      for (let i = 1; i < keys; i++) { const kx = x + w * .06 + (w * .88) * i / keys; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(kx, ky + kh); ctx.stroke(); }
      ctx.fillStyle = INK;
      for (let i = 0; i < keys; i++) if (i % 7 !== 2 && i % 7 !== 6) ctx.fillRect(x + w * .06 + (w * .88) * (i + .68) / keys, ky, (w * .88) / keys * .58, kh * .58);
      const glow = .3 + .2 * Math.sin(t * .8);
      ctx.fillStyle = `rgba(201,106,46,${glow})`; ctx.beginPath(); ctx.arc(x + w * .5, top + (bot - top) * .28, w * .1, 0, Math.PI * 2); ctx.fill();
    },
    // A body of stormcloud, one small bolt inside it.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const cx = px(b, .5), cy = py(b, .5), rx = b.w * .38, ry = b.h * .3;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) { const a = Math.PI * 2 * i / 24; const wob = 1 + Math.sin(a * 3 + t * .6) * .08; const x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      const flash = reduced.matches ? .5 : .35 + .35 * Math.max(0, Math.sin(t * 3));
      ctx.strokeStyle = `rgba(201,106,46,${flash})`; ctx.lineWidth = lw * 1.3;
      ctx.beginPath(); ctx.moveTo(cx - 6, cy - ry * .3); ctx.lineTo(cx + 8, cy); ctx.lineTo(cx - 4, cy); ctx.lineTo(cx + 6, cy + ry * .4); ctx.stroke();
    },
    // A hollowed tree trunk, a small lit window cut into the bark.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const cx = px(b, .5), top = py(b, .08), bot = py(b, .92), rw = b.w * .32;
      ctx.beginPath();
      ctx.moveTo(cx - rw, bot); ctx.bezierCurveTo(cx - rw * 1.15, top + (bot - top) * .5, cx - rw * .6, top, cx, top);
      ctx.bezierCurveTo(cx + rw * .6, top, cx + rw * 1.15, top + (bot - top) * .5, cx + rw, bot);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const f of [.3, .5, .7]) { ctx.beginPath(); ctx.moveTo(cx - rw * f, top + (bot - top) * .15); ctx.quadraticCurveTo(cx - rw * f * .6, (top + bot) / 2, cx - rw * f, bot - (bot - top) * .1); ctx.lineWidth = lw * .7; ctx.stroke(); }
      const wy = (top + bot) / 2, glow = .55 + .25 * Math.sin(t * 1.1);
      ctx.fillStyle = `rgba(230,180,90,${glow})`; ctx.fillRect(cx - rw * .22, wy - rw * .2, rw * .44, rw * .38); ctx.lineWidth = lw; ctx.strokeRect(cx - rw * .22, wy - rw * .2, rw * .44, rw * .38);
    }
  ];

  const LEGS = [
    // Improbably thin flamingo legs, one bent to rest.
    (b, t) => {
      const lw = Math.max(1.4, b.w * .009); ink(lw);
      const top = py(b, .04), bot = py(b, .92), cx = px(b, .5), bend = Math.sin(t * .6) * 3;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(cx + s * b.w * .06, top);
        if (s < 0) ctx.lineTo(cx + s * b.w * .06, bot); else { ctx.lineTo(cx + s * b.w * .1, top + (bot - top) * .55 + bend); ctx.lineTo(cx + s * b.w * .04, bot); }
        ctx.stroke();
      }
      ctx.lineWidth = lw * 1.3;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * b.w * .04, bot); ctx.lineTo(cx + s * b.w * .11, bot); ctx.stroke(); }
    },
    // Two pendulums for legs, ticking out of step with each other.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const top = py(b, .06), cx = px(b, .5), len = b.h * .78;
      for (const s of [-1, 1]) {
        const ang = Math.sin(t * 1.6 + (s > 0 ? 1.4 : 0)) * .22;
        const x0 = cx + s * b.w * .08;
        ctx.save(); ctx.translate(x0, top); ctx.rotate(ang * s);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, len, b.w * .05, 0, Math.PI * 2); ctx.fillStyle = GOLD; ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    },
    // Barber-pole legs, stripes spiralling down.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const top = py(b, .05), bot = py(b, .92), cx = px(b, .5);
      for (const s of [-1, 1]) {
        const x = cx + s * b.w * .1;
        ctx.beginPath(); ctx.moveTo(x - b.w * .07, top); ctx.lineTo(x - b.w * .07, bot); ctx.lineTo(x + b.w * .07, bot); ctx.lineTo(x + b.w * .07, top); ctx.stroke();
        ctx.save(); ctx.beginPath(); ctx.rect(x - b.w * .07, top, b.w * .14, bot - top); ctx.clip();
        ctx.strokeStyle = GOLD; ctx.lineWidth = b.w * .05;
        const shift = (reduced.matches ? 0 : t * 14) % 24;
        for (let y = top - 24 + shift; y < bot + 24; y += 24) { ctx.beginPath(); ctx.moveTo(x - b.w * .12, y); ctx.lineTo(x + b.w * .12, y - 24); ctx.stroke(); }
        ctx.restore(); ctx.strokeStyle = INK;
      }
    },
    // Roots instead of legs, gripping the ground.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const top = py(b, .05), bot = py(b, .8), cx = px(b, .5);
      ctx.beginPath(); ctx.moveTo(cx - b.w * .1, top); ctx.lineTo(cx - b.w * .1, top + (bot - top) * .5); ctx.moveTo(cx + b.w * .1, top); ctx.lineTo(cx + b.w * .1, top + (bot - top) * .5); ctx.stroke();
      const sway = reduced.matches ? 0 : Math.sin(t * .5) * 2;
      for (const s of [-1.3, -.6, .6, 1.3]) {
        ctx.beginPath(); ctx.moveTo(cx + s * b.w * .04, top + (bot - top) * .5);
        ctx.bezierCurveTo(cx + s * b.w * .3 + sway, top + (bot - top) * .65, cx + s * b.w * .5, bot - (bot - top) * .1, cx + s * b.w * .55, bot);
        ctx.lineWidth = lw * (1 - Math.abs(s) * .2); ctx.stroke();
      }
    },
    // No legs at all — the figure simply rides a small cloud.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const cx = px(b, .5), top = py(b, .05), hem = py(b, .42);
      ctx.beginPath(); ctx.moveTo(cx - b.w * .16, top); ctx.lineTo(cx - b.w * .22, hem); ctx.quadraticCurveTo(cx, hem + b.h * .06, cx + b.w * .22, hem); ctx.lineTo(cx + b.w * .16, top); ctx.stroke();
      const bob = reduced.matches ? 0 : Math.sin(t * 1.1) * 4;
      const cy = hem + b.h * .2 + bob, cr = b.w * .3;
      for (const [dx, dy, r] of [[-cr * .5, 0, cr * .62], [cr * .35, -cr * .12, cr * .55], [0, cr * .12, cr * .7], [cr * .8, cr * .08, cr * .42]]) {
        ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    },
    // Umbrella ribs for legs — Lautréamont's chance meeting, taken literally.
    (b, t) => {
      const lw = Math.max(1.3, b.w * .008); ink(lw);
      const cx = px(b, .5), top = py(b, .08), spread = py(b, .38), bot = py(b, .92);
      ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, bot); ctx.stroke();
      for (const s of [-1.4, -.7, .7, 1.4]) {
        ctx.beginPath(); ctx.moveTo(cx, top); ctx.quadraticCurveTo(cx + s * b.w * .18, spread - b.h * .02, cx + s * b.w * .14, spread);
        ctx.lineWidth = lw * .8; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + s * b.w * .14, spread); ctx.lineTo(cx + s * b.w * .09, bot);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(cx - b.w * .18, spread); for (const s of [-1, -.5, 0, .5, 1]) ctx.lineTo(cx + s * b.w * .18, spread + (s % 1 ? 6 : 0)); ctx.lineWidth = lw * .7; ctx.stroke();
    }
  ];
  const PARTS = [HEAD, TORSO, LEGS];
  // Local assets travel with the GitHub Pages deployment, including project subpaths.
  const ART = NAMES.map((bank, band) => bank.map((name, index) => {
    const image = new Image();
    const asset = { image, bounds: null, src: `s${band * 6 + index + 1}.png` };
    image.decoding = 'async';
    image.onload = () => {
      // Measure once, preserving the original PNG and its alpha channel.
      const probe = document.createElement('canvas');
      probe.width = image.naturalWidth; probe.height = image.naturalHeight;
      const probeCtx = probe.getContext('2d', { willReadFrequently: true });
      probeCtx.drawImage(image, 0, 0);
      const pixels = probeCtx.getImageData(0, 0, probe.width, probe.height).data;
      let left = probe.width, right = -1, top = probe.height, bottom = -1;
      for (let y = 0; y < probe.height; y++) for (let x = 0; x < probe.width; x++) {
        if (pixels[(y * probe.width + x) * 4 + 3] < 32) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      if (right >= left) asset.bounds = { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
      if (page) draw();
    };
    return asset;
  }));
  function loadArtwork() {
    for (const bank of ART) for (const asset of bank) {
      if (!asset.image.getAttribute('src')) asset.image.src = asset.src;
    }
  }
  function drawArtwork(b, band, index, t) {
    const asset = ART[band][index], crop = asset.bounds;
    if (!crop) { PARTS[band][index](b, t); return; }
    const anchor = asset.image.naturalWidth / 2 - crop.x;
    const span = 2 * Math.max(anchor, crop.w - anchor);
    // Smaller than the band so the artwork clears the card's border rules and
    // corner flourishes; the outer parts still meet at the two folds.
    const scale = Math.min(b.w * .74 / span, b.h * .76 / crop.h);
    const w = crop.w * scale, h = crop.h * scale;
    const x = px(b, .5) - anchor * scale;
    const y = band === 0 ? b.y + b.h - h : band === 2 ? b.y : b.y + (b.h - h) / 2;
    // Short matching joints bridge varying silhouettes at the two paper folds.
    ctx.fillStyle = PAPER_FILL; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, b.w * .004);
    const jointW = b.w * .055, jointX = px(b, .5) - jointW / 2;
    if (band > 0 && y > b.y) { ctx.fillRect(jointX, b.y, jointW, y - b.y + 2); ctx.strokeRect(jointX, b.y - 2, jointW, y - b.y + 4); }
    if (band < 2 && y + h < b.y + b.h) { ctx.fillRect(jointX, y + h - 2, jointW, b.y + b.h - y - h + 2); ctx.strokeRect(jointX, y + h - 2, jointW, b.y + b.h - y - h + 4); }
    ctx.drawImage(asset.image, crop.x, crop.y, crop.w, crop.h, x, y, w, h);
  }
  const bandIndex = [0, 1, 2];
  const flipping = [false, false, false], flipT = [0, 0, 0], flipTo = [0, 0, 0], flipDone = [false, false, false], spins = [0, 0, 0];

  let audioCtx = null;
  function playFlip() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const size = Math.floor(audioCtx.sampleRate * .16);
      const buffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
      const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
      const band = audioCtx.createBiquadFilter(); band.type = 'bandpass'; band.Q.value = .9;
      band.frequency.setValueAtTime(2000, now); band.frequency.exponentialRampToValueAtTime(420, now + .15);
      const g = audioCtx.createGain(); g.gain.setValueAtTime(.3, now); g.gain.exponentialRampToValueAtTime(.001, now + .17);
      noise.connect(band); band.connect(g); g.connect(audioCtx.destination); noise.start(now);
    } catch (e) { /* silent card flip if Web Audio is unavailable */ }
  }

  function triggerFlip(i, target) {
    if (flipping[i]) return;
    flipping[i] = true; flipT[i] = 0; flipTo[i] = target; flipDone[i] = false;
    playFlip();
  }
  function updateFlips(dt) {
    for (let i = 0; i < 3; i++) {
      if (!flipping[i]) continue;
      flipT[i] += dt / .34;
      if (flipT[i] >= .5 && !flipDone[i]) { bandIndex[i] = flipTo[i]; flipDone[i] = true; updateBandLabels(); }
      if (flipT[i] >= 1) {
        flipping[i] = false; flipT[i] = 0; flipDone[i] = false;
        regenerateCaption();
        if (spins[i] > 0) { spins[i]--; triggerFlip(i, Math.floor(Math.random() * 6)); }
      }
    }
    if (rolling && !flipping.some(Boolean)) {
      rolling = false;
      chanceBtn.removeAttribute('aria-disabled');
      scene.classList.remove('is-rolling');
    }
  }
  function updateBandLabels() {
    const zh = ['Head', 'Torso', 'Legs'];
    bandButtons.forEach((btn, i) => btn.setAttribute('aria-label', `Change the ${zh[i].toLowerCase()} — now ${NAMES[i][bandIndex[i]]}`));
  }
  bandButtons.forEach(btn => btn.addEventListener('click', () => {
    if (rolling) return;
    const i = Number(btn.dataset.band);
    triggerFlip(i, (bandIndex[i] + 1) % 6);
  }));
  let leverDrag = null, rolling = false, suppressLeverClick = false;
  const setLeverPull = value => chanceBtn.style.setProperty('--lever-pull', value);
  function roll() {
    if (rolling || flipping.some(Boolean)) return;
    rolling = true;
    chanceBtn.setAttribute('aria-disabled', 'true');
    scene.classList.add('is-rolling');
    setLeverPull(1);
    setTimeout(() => setLeverPull(0), 180);
    for (let i = 0; i < 3; i++) {
      spins[i] = reduced.matches ? 0 : 2 + i;
      triggerFlip(i, (bandIndex[i] + 1 + Math.floor(Math.random() * 5)) % 6);
    }
  }
  function releaseLever(e) {
    if (!leverDrag || e.pointerId !== leverDrag.id) return;
    const gesture = leverDrag; leverDrag = null;
    chanceBtn.classList.remove('is-pulling');
    setLeverPull(0);
    suppressLeverClick = gesture.distance > 6;
    if (chanceBtn.hasPointerCapture(e.pointerId)) chanceBtn.releasePointerCapture(e.pointerId);
    if (e.type === 'pointerup' && gesture.distance >= 30) roll();
  }
  chanceBtn.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !e.isPrimary || rolling) return;
    suppressLeverClick = false;
    leverDrag = { id: e.pointerId, y: e.clientY, distance: 0 };
    chanceBtn.classList.add('is-pulling');
    chanceBtn.setPointerCapture(e.pointerId);
  });
  chanceBtn.addEventListener('pointermove', e => {
    if (!leverDrag || e.pointerId !== leverDrag.id) return;
    leverDrag.distance = Math.max(0, e.clientY - leverDrag.y);
    setLeverPull(clamp(leverDrag.distance / (width <= 600 ? 56 : 80), 0, 1));
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) chanceBtn.addEventListener(event, releaseLever);
  chanceBtn.addEventListener('click', e => {
    if (suppressLeverClick && e.detail !== 0) { suppressLeverClick = false; return; }
    roll();
  });
  // The exquisite corpse's own namesake trick: three unrelated fragments, none seeing the others.
  const ADJ = ['velvet', 'glass', 'forgotten', 'insomniac', 'porcelain', 'weightless', 'thunderous', 'tender', 'unfinished', 'borrowed', 'astonished', 'salt-white'];
  const NOUN = ['hour', 'key', 'moth', 'mirror', 'garden', 'telephone', 'ocean', 'ash', 'staircase', 'violin', 'appetite', 'silence'];
  const VERB = ['wears', 'devours', 'dreams of', 'forgets', 'waters', 'folds into', 'swallows', 'becomes', 'collects', 'misplaces', 'interrupts', 'rehearses'];
  const OBJ = ['a cloud of keys', 'the last umbrella', 'a burning violin', 'its own shadow', 'a drawer of eyes', "tomorrow's weather", 'a second moon', 'the sound of drawers', 'a folded ocean', "someone else's name", 'a very small storm', 'the wrong century'];
  function regenerateCaption() {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    captionEl.textContent = `The ${pick(ADJ)} ${pick(NOUN)} ${pick(VERB)} ${pick(OBJ)}.`;
  }

  const clouds = [];
  (function buildClouds() { for (let i = 0; i < 7; i++) clouds.push({ xf: Math.random(), y: .1 + Math.random() * .55, r: .1 + Math.random() * .16, a: .09 + Math.random() * .09, speed: .006 + Math.random() * .01 }); })();
  const starAt = i => [
    (((Math.sin(i * 127.1 + 3) * 43758.5453) % 1) + 1) % 1,
    (((Math.sin(i * 311.7 + 8) * 19341.17) % 1) + 1) % 1
  ];
  // A faint, quiet night sky — a soft gradient, a scatter of dim stars, a low
  // crescent, and barely-there haze. Nothing that draws attention from the card.
  function drawBackdrop(t) {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#0e0819'); g.addColorStop(.55, '#170f24'); g.addColorStop(1, '#20182c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 66; i++) {
      const [sx, sy] = starAt(i);
      const x = sx * width, y = sy * height;
      const tw = reduced.matches ? .7 : .5 + .5 * Math.sin(t * 1.1 + i);
      ctx.globalAlpha = (i % 9 === 0 ? .42 : .24) * tw; ctx.fillStyle = '#efe7ff';
      ctx.beginPath(); ctx.arc(x, y, i % 9 === 0 ? 1.2 : .7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // a low crescent moon (bitten by an offset disc painted back in sky tone)
    const mx = width * .84, my = height * .16, mr = Math.min(width, height) * .042;
    ctx.save();
    ctx.fillStyle = 'rgba(240,231,214,.26)';
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#150e21';
    ctx.beginPath(); ctx.arc(mx + mr * .55, my - mr * .3, mr * .96, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    for (const c of clouds) {
      const x = (((c.xf + (reduced.matches ? 0 : t * c.speed)) % 1.3) - .15) * width;
      const grad = ctx.createRadialGradient(x, c.y * height, 0, x, c.y * height, c.r * width);
      grad.addColorStop(0, `rgba(118,92,148,${c.a * .6})`); grad.addColorStop(1, 'rgba(118,92,148,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, c.y * height, c.r * width, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawStage(g) {
    // a soft contact shadow so the card sits down rather than floating
    const cx = g.cardX + g.cardW / 2, cbot = g.top + g.cardH;
    ctx.save();
    if ('filter' in ctx) ctx.filter = 'blur(10px)';
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.beginPath(); ctx.ellipse(cx, cbot + 12, g.cardW * .44, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawVignette() {
    const g = ctx.createRadialGradient(width * .5, height * .5, Math.min(width, height) * .34, width * .5, height * .5, Math.max(width, height) * .74);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,4,16,.42)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawCard(g, t) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 16;
    const grad = ctx.createLinearGradient(0, g.top, 0, g.top + g.cardH);
    grad.addColorStop(0, '#f0e5cc'); grad.addColorStop(1, '#e2d1a8');
    ctx.fillStyle = grad; roundRect(g.cardX, g.top, g.cardW, g.cardH, 10); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(90,65,35,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    // paper grain
    ctx.save(); roundRect(g.cardX, g.top, g.cardW, g.cardH, 10); ctx.clip();
    for (let i = 0; i < 120; i++) {
      const x = g.cardX + (((Math.sin(i * 91.3 + 1) * 24634.6) % 1 + 1) % 1) * g.cardW;
      const y = g.top + (((Math.sin(i * 57.9 + 5) * 15234.9) % 1 + 1) % 1) * g.cardH;
      ctx.globalAlpha = .05; ctx.fillStyle = '#3a2c14'; ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1; ctx.restore();
  }
  // An engraved double rule inset from the edge, with a small flourish at each
  // corner and printer's fold-marks where the card creases — a made object.
  function drawCardFrame(g) {
    const inA = Math.max(8, g.cardW * .045), inB = inA + 4;
    ctx.save();
    ctx.strokeStyle = 'rgba(74,52,26,.55)'; ctx.lineWidth = 1.4;
    roundRect(g.cardX + inA, g.top + inA, g.cardW - inA * 2, g.cardH - inA * 2, 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(74,52,26,.3)'; ctx.lineWidth = 1;
    roundRect(g.cardX + inB, g.top + inB, g.cardW - inB * 2, g.cardH - inB * 2, 5); ctx.stroke();
    // corner flourishes
    const fl = Math.max(9, g.cardW * .05);
    const corners = [[g.cardX + inA, g.top + inA, 1, 1], [g.cardX + g.cardW - inA, g.top + inA, -1, 1],
      [g.cardX + inA, g.top + g.cardH - inA, 1, -1], [g.cardX + g.cardW - inA, g.top + g.cardH - inA, -1, -1]];
    ctx.strokeStyle = GOLD; ctx.globalAlpha = .7; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    for (const [x, y, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + sx * fl * 1.1, y - sy * 2);
      ctx.quadraticCurveTo(x - sx * 2, y - sy * 2, x - sx * 2, y + sy * fl * 1.1);
      ctx.moveTo(x + sx * fl * .5, y + sy * fl * .5);
      ctx.lineTo(x + sx * 2, y + sy * 2);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x + sx * fl * .5, y + sy * fl * .5, 1.3, 0, Math.PI * 2); ctx.fillStyle = GOLD; ctx.fill();
    }
    ctx.globalAlpha = 1;
    // fold registration crosses at the thirds, just outside each long edge
    ctx.strokeStyle = 'rgba(120,90,45,.6)'; ctx.lineWidth = 1;
    for (const f of [1 / 3, 2 / 3]) {
      const y = g.top + g.cardH * f;
      for (const ex of [g.cardX - 1, g.cardX + g.cardW + 1]) {
        ctx.beginPath();
        ctx.moveTo(ex - 4, y); ctx.lineTo(ex + 4, y);
        ctx.moveTo(ex, y - 4); ctx.lineTo(ex, y + 4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawBands(g, t) {
    for (let i = 0; i < 3; i++) {
      const b = { x: g.cardX, y: g.top + i * g.bandH, w: g.cardW, h: g.bandH };
      const s = flipping[i] ? Math.max(.02, Math.abs(Math.cos(flipT[i] * Math.PI))) : 1;
      ctx.save();
      roundRect(g.cardX, g.top, g.cardW, g.cardH, 10); ctx.clip();
      ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
      ctx.translate(px(b, .5), 0); ctx.scale(s, 1); ctx.translate(-px(b, .5), 0);
      drawArtwork(b, i, bandIndex[i], t);
      ctx.restore();
    }
  }
  function drawCreases(g) {
    ctx.save();
    roundRect(g.cardX, g.top, g.cardW, g.cardH, 10); ctx.clip();
    for (const f of [1 / 3, 2 / 3]) {
      const y = g.top + g.cardH * f;
      ctx.strokeStyle = 'rgba(80,58,30,.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(g.cardX, y); ctx.lineTo(g.cardX + g.cardW, y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,235,.3)';
      ctx.beginPath(); ctx.moveTo(g.cardX, y + 1.4); ctx.lineTo(g.cardX + g.cardW, y + 1.4); ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    drawBackdrop(elapsed);
    const g = geometry();
    drawStage(g);
    drawCard(g, elapsed);
    drawBands(g, elapsed);
    drawCreases(g);
    drawCardFrame(g);
    drawVignette();
  }
  function frame(now) {
    raf = 0;
    if (!page || !visible() || document.hidden) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
    elapsed += dt;
    updateFlips(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && page && visible() && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  new ResizeObserver(() => { resize(); if (page) draw(); }).observe(host);
  let wasVisible = visible();
  new MutationObserver(() => {
    const isVisible = visible();
    if (isVisible === wasVisible) return;
    wasVisible = isVisible;
    syncLampChain();
    if (!isVisible) { drag = null; setPage(0); } else start();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => { if (document.hidden) drag = null; start(); });
  window.addEventListener('blur', () => { if (drag) { drag = null; setPage(page); } });

  updateBandLabels();
  regenerateCaption();
  setPage(0);
})();
