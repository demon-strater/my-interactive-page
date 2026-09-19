(() => {
  'use strict';
  // Two chapters share this file: the concept film (romanticism.html) and the
  // hands-on wanderer scene (romanticism-experience.html). `second` tells us
  // which one we're in so swipes and slide-transitions point the right way.
  const second = document.body.classList.contains('experience-chapter');
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
    const link = e.target.closest('.rom-next, .rom-back');
    if (!link || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); navigate(link.href);
  }, true);
  // Swiping is only wired up on the concept film: the wanderer scene reads press-and-drag
  // as "summon a storm toward here", so a document-level swipe there would fight that gesture.
  // Going back uses the small .rom-back control instead.
  if (!second) {
    let swipeStart = null;
    document.addEventListener('pointerdown', e => {
      swipeStart = null;
      if (document.body.classList.contains('artwork-intro') || e.button !== 0 || !e.isPrimary || e.target.closest('a,button,input,select,textarea,[contenteditable],#filmScene')) return;
      swipeStart = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now() };
    });
    document.addEventListener('pointerup', e => {
      if (!swipeStart || swipeStart.id !== e.pointerId) return;
      const dx = e.clientX - swipeStart.x, dy = e.clientY - swipeStart.y, duration = performance.now() - swipeStart.at;
      swipeStart = null;
      if (duration > 900 || dx > -75 || Math.abs(dx) < Math.abs(dy) * 1.7) return;
      const link = document.querySelector('.rom-next');
      if (!link) return;
      swallowClick = true;
      navigate(link.href);
    });
    document.addEventListener('pointercancel', () => { swipeStart = null; });
  }
  window.addEventListener('pageshow', () => {
    leaving = false; swallowClick = false; delete document.body.dataset.leave;
  });
})();
