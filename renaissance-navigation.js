(() => {
  'use strict';
  const second = document.body.classList.contains('perspective-experience');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let leaving = false;
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
    const link = e.target.closest('.next-experience');
    if (!link || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); navigate(link.href);
  }, true);
  window.addEventListener('pageshow', () => {
    leaving = false; delete document.body.dataset.leave;
  });
})();
