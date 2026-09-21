(() => {
  'use strict';
  const $ = id => document.getElementById(id), canvas = $('filmScene'), ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const bounds = [0, 11, 23, 34, 45, 56];
  const chapters = [
    { title: '형태 이전의 색채, 붓점에 대하여', description: '화면을 채우는 것은 벽돌이나 창문이 아니라 색을 찍은 붓점이다. 인상주의는 형태보다 빛의 색을 먼저 그린다.' },
    { title: '눈이 만들어내는 형태에 대하여', description: '같은 붓점들이지만, 한 발 물러서는 순간 루앙 대성당의 파사드가 나타난다. 우리의 눈이 색을 형태로 조합한다.' },
    { title: '빛에 따라 달라지는 색에 대하여', description: '돌은 그대로지만, 빛의 색은 새벽에서 정오, 황혼으로 바뀐다. 모네는 같은 대성당을 서른 번 넘게 그렸다.' },
    { title: '멈추지 않는 그림자에 대하여', description: '구름의 그림자가 파사드를 스쳐 지나간다. 빛은 하루의 흐름뿐 아니라 한순간 안에서도 계속 변한다.' },
    { title: '다시 오지 않을 이 순간에 대하여', description: '새 한 마리가 지나가고, 빛이 한순간 깜빡인다. 인상주의가 담는 것은 영원한 형태가 아니라 다시 오지 않을 이 순간이다.' }
  ];
  const TOTAL = bounds[bounds.length - 1];
  // The film freezes on Monet's real cathedral series right as the "light changes the color" chapter
  // ends. The paintings show alone first; captions and color strips fade in ~3s later (see the CSS
  // delays), so the hold covers looking first and reading after. It only runs if the images loaded.
  const compareWindows = [{ start: 33.2, end: 34, hold: 8, panel: $('compareOne') }];
  const compareImages = [...$('compareOne').querySelectorAll('img')];
  let compareReady = false;
  const checkCompare = () => { compareReady = compareImages.every(img => img.complete && img.naturalWidth > 0); };
  compareImages.forEach(img => { img.addEventListener('load', checkCompare); img.addEventListener('error', checkCompare); });
  checkCompare();
  let holdRemaining = null, holdAt = null, lingering = false;
  document.querySelectorAll('.compare-grid').forEach(grid => {
    grid.addEventListener('mouseenter', () => { lingering = true; });
    grid.addEventListener('mouseleave', () => { lingering = false; });
  });
  if (window.parent !== window) $('goHome').hidden = true;
  let w = 1, h = 1, dpr = 1, time = 0, playing = !reduced.matches, last = 0, raf = 0, index = -1;
  const format = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const runtime = () => TOTAL + (compareReady ? compareWindows.reduce((s, win) => s + win.hold, 0) : 0);
  function chapterAt(t) { for (let i = 0; i < bounds.length - 1; i++) if (t < bounds[i + 1]) return i; return bounds.length - 2; }
  function update() {
    const next = chapterAt(time);
    if (next !== index) {
      index = next; document.body.dataset.chapter = index; const c = chapters[index];
      $('sceneTitle').getAnimations().forEach(a => a.cancel()); $('sceneTitle').textContent = c.title;
      $('sceneStatus').getAnimations().forEach(a => a.cancel()); $('sceneStatus').textContent = c.description;
      $('sceneCaption').replaceChildren(Object.assign(document.createElement('b'), { textContent: `${index + 1} / ${chapters.length}` }), c.title);
      [...$('progress').children].forEach((b, i) => { b.classList.toggle('active', i === index); b.setAttribute('aria-current', i === index ? 'step' : 'false'); });
      if (!reduced.matches && playing) {
        $('sceneTitle').animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 900, easing: 'ease-out' });
        $('sceneStatus').animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 800, easing: 'ease-out', delay: 150 });
      }
    }
    $('playPause').textContent = playing ? 'Ⅱ' : '▷'; $('playPause').setAttribute('aria-label', playing ? '영상 일시정지' : '영상 재생');
    const elapsed = time + (compareReady ? compareWindows.reduce((s, win) => s + (time >= win.end ? win.hold : time >= win.start ? win.hold - (holdRemaining ?? 0) : 0), 0) : 0);
    $('filmTime').textContent = `${format(elapsed)} / ${format(runtime())}`; $('filmFill').style.width = `${time / TOTAL * 100}%`;
    $('filmSeek').value = time; $('filmSeek').setAttribute('aria-valuetext', format(elapsed));
    let comparing = false;
    for (const win of compareWindows) {
      const show = compareReady && time >= win.start && time < win.end;
      win.panel.classList.toggle('visible', show); win.panel.setAttribute('aria-hidden', String(!show));
      comparing = comparing || show;
    }
    document.body.classList.toggle('showing-comparison', comparing);
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
    if (holdRemaining !== null) {
      if (!lingering) holdRemaining -= dt;
      if (holdRemaining <= 0) { time = holdAt.end; holdRemaining = null; holdAt = null; }
    } else {
      const next = Math.min(TOTAL, time + dt);
      const hit = compareReady ? compareWindows.find(win => time < win.start && next >= win.start) : null;
      if (hit) { time = hit.start; holdAt = hit; holdRemaining = hit.hold; } else time = next;
    }
    if (time >= TOTAL) playing = false;
    update(); draw(); if (playing) raf = requestAnimationFrame(frame);
  }
  function start() { last = 0; if (playing && !raf && !document.hidden) raf = requestAnimationFrame(frame); }
  function seek(t) { holdRemaining = null; holdAt = null; time = Math.max(0, Math.min(TOTAL, t)); update(); draw(); }
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
