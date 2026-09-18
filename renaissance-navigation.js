(() => {
  'use strict';
  const second = document.body.classList.contains('perspective-experience');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let leaving = false, swallowClick = false;
  const incoming = new URLSearchParams(location.search).get('enter');
  if (incoming === 'next' || incoming === 'previous') {
    document.body.dataset.enter = incoming;
    document.body.addEventListener('animationend', () => delete document.body.dataset.enter, { once: true });
  }
  function navigate(href) {
    if (leaving) return;
    const target = new URL(href, location.href);
    if (target.pathname === location.pathname) return;
    const direction = second ? 'previous' : 'next';
    target.searchParams.set('enter', direction);
    leaving = true;
    document.body.dataset.leave = direction;
    setTimeout(() => location.assign(target.href), reduced.matches ? 0 : 180);
  }
  document.addEventListener('click', e => {
    if (swallowClick) { e.preventDefault(); e.stopImmediatePropagation(); swallowClick = false; return; }
    const link = e.target.closest('.next-experience');
    if (!link || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); navigate(link.href);
  }, true);
  const homeButton = document.getElementById('goHome');
  if (homeButton) {
    homeButton.addEventListener('click', () => {
      if (window.parent !== window) window.parent.postMessage('renaissance:home', window.location.origin);
      else location.href = 'index.html';
    });
  }
  if (second) {
    // Swiping left on the vanishing-point page returns to the Renaissance concept film;
    // the atelier's own click handler would otherwise re-place a philosopher right as we leave.
    let swipeStart = null;
    document.addEventListener('pointerdown', e => {
      swipeStart = null;
      if (e.button !== 0 || !e.isPrimary || e.target.closest('a,button,input,select,textarea,[contenteditable]')) return;
      swipeStart = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now() };
    });
    document.addEventListener('pointerup', e => {
      if (!swipeStart || swipeStart.id !== e.pointerId) return;
      const dx = e.clientX - swipeStart.x, dy = e.clientY - swipeStart.y, duration = performance.now() - swipeStart.at;
      swipeStart = null;
      if (duration > 900 || dx > -75 || Math.abs(dx) < Math.abs(dy) * 1.7) return;
      swallowClick = true;
      navigate('renaissance.html?v=play-5');
    });
    document.addEventListener('pointercancel', () => { swipeStart = null; });
  }
  window.addEventListener('pageshow', () => {
    leaving = false; swallowClick = false; delete document.body.dataset.leave;
  });
})();
