(() => {
  'use strict';
  const second = document.body.classList.contains('perspective-experience');
  const arrow = document.querySelector('.experience-arrow');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let start = null, leaving = false, swallowClick = false;
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
    const link = e.target.closest('.experience-arrow, .experience-nav a, .next-experience');
    if (!link || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (link.getAttribute('aria-current') === 'page') return;
    e.preventDefault(); navigate(link.href);
  }, true);
  document.addEventListener('pointerdown', e => {
    start = null;
    if (e.defaultPrevented || e.button !== 0 || !e.isPrimary || e.target.closest('a,button,input,select,textarea,[contenteditable]')) return;
    start = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now() };
  });
  document.addEventListener('pointerup', e => {
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y, duration = performance.now() - start.at;
    start = null;
    if (e.defaultPrevented || duration > 900 || Math.abs(dx) < 75 || Math.abs(dx) < Math.abs(dy) * 1.7) return;
    if (arrow && ((!second && dx < 0) || (second && dx > 0))) {
      e.preventDefault(); swallowClick = true; navigate(arrow.href);
    }
  });
  document.addEventListener('pointercancel', () => { start = null; });
  document.addEventListener('keydown', e => {
    if (!arrow || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.target.closest('input,select,textarea,button,a,[contenteditable]')) return;
    if ((!second && e.key === 'ArrowRight') || (second && e.key === 'ArrowLeft')) {
      e.preventDefault(); navigate(arrow.href);
    }
  });
  window.addEventListener('pageshow', () => {
    leaving = false; swallowClick = false; start = null; delete document.body.dataset.leave;
  });
})();
