/* Original, asset-free sound palette. One preference across the gallery and its frames. */
(() => {
  'use strict';
  const page = location.pathname.split('/').pop().replace('.html', '') || 'index';
  const palettes = {
    renaissance: [48, 55, 60, 64, 67, 72], 'renaissance-perspective': [48, 55, 60, 64, 67, 72],
    baroque: [45, 52, 57, 60, 64, 69], romanticism: [38, 45, 50, 53, 57, 62],
    impressionism: [53, 60, 62, 67, 69, 74], 'post-impressionism': [48, 55, 62, 64, 69, 72],
    surrealism: [45, 52, 59, 60, 64, 71], futurism: [40, 47, 52, 55, 59, 64],
    'abstract-expressionism': [43, 50, 58, 60, 65, 70]
  };
  const key = 'art-sound-enabled';
  let enabled = true, ctx, master, music, fx, unlocked = false, step = 0, next = 0, active = false;
  let lastFx = 0, lastChapter = '', lastOpened = false;
  try { enabled = localStorage.getItem(key) !== 'false'; } catch (_) {}
  function visible() {
    if (document.hidden) return false;
    try {
      let el = window.frameElement;
      while (el) {
        const s = parent.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < .05) return false;
        el = el.parentElement;
      }
    } catch (_) { return false; }
    return true;
  }
  function init() {
    unlocked = true;
    if (!enabled || !visible()) return;
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = 0;
        const limiter = ctx.createDynamicsCompressor();
        master.connect(limiter); limiter.connect(ctx.destination);
        music = ctx.createGain(); music.gain.value = .65; music.connect(master);
        fx = ctx.createGain(); fx.gain.value = .6; fx.connect(master);
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      sync();
    } catch (_) { /* Visual experiences remain available without Web Audio. */ }
  }
  function tone(note, at, duration, volume, destination, type = 'sine') {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.value = 440 * 2 ** ((note - 69) / 12);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + Math.min(.18, duration / 5));
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    osc.connect(gain); gain.connect(destination); osc.start(at); osc.stop(at + duration + .02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  function effect(kind = 'tap', strength = 1) {
    if (!ctx || !enabled || !active || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (now - lastFx < .09) return;
    lastFx = now;
    if (['brush', 'wind', 'paper', 'water', 'impact'].includes(kind)) {
      const length = kind === 'wind' ? .8 : kind === 'impact' ? .13 : .22;
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
      const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      source.buffer = buffer; filter.type = 'bandpass';
      filter.frequency.value = { brush: 1700, wind: 350, paper: 2400, water: 650, impact: 160 }[kind];
      gain.gain.value = .12 * Math.min(1, strength);
      source.connect(filter); filter.connect(gain); gain.connect(fx); source.start();
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    } else {
      tone(kind === 'assemble' ? 55 : kind === 'subtract' ? 76 : 72, now, .16, .07, fx, 'triangle');
      if (kind === 'reveal') [60, 67, 76].forEach((n, i) => tone(n, now + i * .12, 1.6, .065, fx));
    }
  }
  function bgmAllowed() {
    if (!palettes[page] || document.body.classList.contains('artwork-intro')) return false;
    if (page === 'baroque') return document.body.classList.contains('opened');
    if (document.getElementById('filmScene')) return document.body.classList.contains('film-playing');
    return true;
  }
  function sync() {
    try { if (!unlocked && parent !== window && parent.ArtAudio?.unlocked && visible()) { init(); return; } } catch (_) {}
    active = enabled && unlocked && visible();
    if (ctx) {
      master.gain.setTargetAtTime(active ? .7 : 0, ctx.currentTime, .08);
      const playing = active && bgmAllowed();
      music.gain.setTargetAtTime(playing ? (document.body.classList.contains('showing-comparison') ? .18 : .65) : 0, ctx.currentTime, .35);
      if (!active && ctx.state === 'running') ctx.suspend().catch(() => {});
      if (active && ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (playing && ctx.state === 'running' && ctx.currentTime >= next) {
        const notes = palettes[page], chapter = Number(document.body.dataset.chapter || 0);
        const sequence = [0, 2, 4, 3, 1, 4, 2, 5];
        const interval = page === 'futurism' ? .42 : page === 'baroque' ? .8 : 1.65;
        tone(notes[(sequence[step % 8] + chapter) % notes.length], ctx.currentTime, interval * 2, .055, music, page === 'baroque' ? 'triangle' : 'sine');
        if (step % 4 === 0) [0, 1, 3].forEach(i => tone(notes[i] - 12, ctx.currentTime, interval * 4, .025, music));
        step++; next = ctx.currentTime + interval;
      }
    }
    const chapter = document.body.dataset.chapter;
    if (chapter !== undefined && chapter !== lastChapter) { if (lastChapter !== '') effect('reveal', .4); lastChapter = chapter; }
    const opened = document.body.classList.contains('opened');
    if (opened && !lastOpened) effect('reveal');
    lastOpened = opened;
  }
  const button = document.createElement('button');
  button.id = 'artSoundToggle'; button.type = 'button';
  button.style.cssText = 'position:fixed;right:14px;top:14px;z-index:2147483646;border:1px solid #ffffff55;border-radius:24px;padding:9px 13px;background:#171b22db;color:#fff;font:12px system-ui;cursor:pointer;backdrop-filter:blur(10px)';
  function render() { button.textContent = enabled ? '♪ 소리 켜짐' : '♪ 소리 꺼짐'; button.setAttribute('aria-pressed', String(enabled)); button.setAttribute('aria-label', enabled ? '전체 소리 끄기' : '전체 소리 켜기'); }
  function setEnabled(value, broadcast = true) {
    enabled = value; try { localStorage.setItem(key, String(value)); } catch (_) {}
    render(); if (enabled && unlocked) init(); sync();
    dispatchEvent(new CustomEvent('art-audio-change', { detail: { enabled } }));
    if (broadcast) {
      try { if (parent !== window) parent.ArtAudio?.setEnabled(value, false); } catch (_) {}
      document.querySelectorAll('iframe').forEach(frame => { try { frame.contentWindow.ArtAudio?.setEnabled(value, false); } catch (_) {} });
    }
  }
  window.ArtAudio = { effect, setEnabled, get enabled() { return enabled && visible(); }, get active() { return active; }, get unlocked() { return unlocked; } };
  button.addEventListener('pointerdown', e => e.stopPropagation());
  button.addEventListener('click', e => { e.stopPropagation(); unlocked = true; setEnabled(!enabled); });
  button.addEventListener('keydown', e => e.stopPropagation());
  document.body.append(button); render();
  try { if (parent !== window && parent.ArtAudio) button.hidden = true; } catch (_) {}
  // A page opened on its own shows its "메인으로" pill at the top right; sit beside it (below it on
  // phones) rather than on top of it.
  function dock() {
    const home = document.getElementById('goHome');
    const r = home && !home.hidden ? home.getBoundingClientRect() : null;
    if (!r || !r.width) { button.style.right = '14px'; button.style.top = '14px'; return; }
    const narrow = innerWidth <= 700;
    button.style.right = `${Math.round(narrow ? innerWidth - r.right : innerWidth - r.left + 10)}px`;
    button.style.top = `${Math.round(narrow ? r.bottom + 8 : r.top + (r.height - button.offsetHeight) / 2)}px`;
  }
  addEventListener('resize', dock); document.fonts?.ready.then(dock); dock();
  const stormButton = document.getElementById('soundToggle');
  if (stormButton) { stormButton.hidden = true; }
  const interactionSound = { cubism: 'paper', constructivism: 'assemble', minimalism: 'subtract', realism: 'impact', 'abstract-expressionism': 'brush', 'post-impressionism': 'brush', 'fluid-collision': 'water', 'dialectical-collision': 'water', romanticism: 'wind', futurism: 'wind', particle: 'tap', 'schema-architecture': 'assemble' }[page] || 'tap';
  document.addEventListener('pointerdown', e => { if (e.target.closest('#artSoundToggle,#soundToggle')) return; init(); if (page !== 'index' && page !== 'romanticism-experience') effect(e.target.closest('button,a,input') ? 'tap' : interactionSound); }, true);
  document.addEventListener('keydown', e => { if (e.repeat || e.target.closest('#artSoundToggle,#soundToggle')) return; init(); if (['Enter', ' ', 'a', 's', 'd', 'f'].includes(e.key)) effect(interactionSound); }, true);
  document.addEventListener('pointermove', e => { if (e.buttons && !e.target.closest('button,input') && ['brush','water','wind','paper'].includes(interactionSound)) effect(interactionSound, .35); }, { passive: true });
  document.addEventListener('wheel', () => { if (page === 'futurism') effect('wind'); }, { passive: true });
  document.addEventListener('visibilitychange', sync);
  addEventListener('storage', e => { if (e.key === key) setEnabled(e.newValue !== 'false', false); });
  addEventListener('pagehide', () => { active = false; if (ctx) ctx.suspend().catch(() => {}); });
  setInterval(sync, 200);
})();
