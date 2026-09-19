(() => {
  'use strict';
  const $ = id => document.getElementById(id), canvas = $('filmScene'), ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const bounds = [0, 11, 23, 34, 45, 56];
  const chapters = [
    { title: 'Before form, dots of color.', description: 'What fills the frame isn’t brick or window — it’s dabs of paint. Impressionism paints the color of light before it paints form.' },
    { title: 'Step back, and it becomes a cathedral.', description: 'The same dots — but the moment you step back, Rouen Cathedral’s facade emerges. Your eye mixes the color into form.' },
    { title: 'Same cathedral, flowing light.', description: 'The stone never moves, but the color of light shifts from dawn to noon to dusk. Monet painted this same cathedral more than thirty times.' },
    { title: 'The shadow never stops.', description: 'A cloud’s shadow sweeps across the facade. Light keeps changing even within a single moment, not just over the course of a day.' },
    { title: 'This moment won’t come again.', description: 'A bird crosses, and the light flickers for an instant. What Impressionism captures isn’t an eternal form, but this moment, which will never return.' }
  ];
  const TOTAL = bounds[bounds.length - 1];
  let w = 1, h = 1, dpr = 1, time = 0, playing = !reduced.matches, last = 0, raf = 0, index = -1;
  const format = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function chapterAt(t) { for (let i = 0; i < bounds.length - 1; i++) if (t < bounds[i + 1]) return i; return bounds.length - 2; }
  function update() {
    const next = chapterAt(time);
    if (next !== index) {
      index = next; document.body.dataset.chapter = index; const c = chapters[index];
      $('sceneTitle').getAnimations().forEach(a => a.cancel()); $('sceneTitle').textContent = c.title;
      $('sceneStatus').getAnimations().forEach(a => a.cancel()); $('sceneStatus').textContent = c.description;
      [...$('progress').children].forEach((b, i) => { b.classList.toggle('active', i === index); b.setAttribute('aria-current', i === index ? 'step' : 'false'); });
      if (!reduced.matches && playing) {
        $('sceneTitle').animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 900, easing: 'ease-out' });
        $('sceneStatus').animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 800, easing: 'ease-out', delay: 150 });
      }
    }
    $('playPause').textContent = playing ? 'Ⅱ' : '▷'; $('playPause').setAttribute('aria-label', playing ? 'Pause the film' : 'Play the film');
    $('filmTime').textContent = `${format(time)} / ${format(TOTAL)}`; $('filmFill').style.width = `${time / TOTAL * 100}%`;
    $('filmSeek').value = time; $('filmSeek').setAttribute('aria-valuetext', format(time));
    document.body.classList.toggle('film-playing', playing); document.body.classList.toggle('film-ended', time >= TOTAL);
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ix = Math.max(0, index), phase = (time - bounds[ix]) / (bounds[ix + 1] - bounds[ix]);
    window.drawCathedralWorld(ctx, w, h, time, ix, phase, { reduced: reduced.matches });
  }
  function frame(now) {
    raf = 0; if (document.hidden || !playing) return;
    const dt = last ? Math.min((now - last) / 1000, .1) : 0; last = now;
    time = Math.min(TOTAL, time + dt);
    if (time >= TOTAL) playing = false;
    update(); draw(); if (playing) raf = requestAnimationFrame(frame);
  }
  function start() { last = 0; if (playing && !raf && !document.hidden) raf = requestAnimationFrame(frame); }
  function seek(t) { time = Math.max(0, Math.min(TOTAL, t)); update(); draw(); }
  $('filmSeek').addEventListener('input', e => { playing = false; seek(Number(e.target.value)); });
  [...$('progress').children].forEach((b, i) => b.addEventListener('click', () => { playing = !reduced.matches; seek(bounds[i] + (reduced.matches ? (bounds[i + 1] - bounds[i]) * .55 : 0)); start(); }));
  $('playPause').addEventListener('click', () => { playing = !playing; if (time >= TOTAL) seek(0); update(); start(); });
  $('replay').addEventListener('click', () => { playing = !reduced.matches; seek(0); start(); });
  addEventListener('keydown', e => { if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); $('playPause').click(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; last = 0; } else start(); });
  reduced.addEventListener('change', () => { playing = false; update(); draw(); });
  function resize() { w = innerWidth; h = innerHeight; dpr = Math.min(devicePixelRatio || 1, 1.5); canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); draw(); }
  addEventListener('resize', resize); update(); resize(); start();
})();
