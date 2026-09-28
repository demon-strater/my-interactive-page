(() => {
  'use strict';
  // Inside the hub's iframe the hub already shows its own back control.
  const goHome = document.getElementById('goHome');
  if (goHome && window.parent !== window) goHome.hidden = true;
  // Absolutely positioned layouts start the painting just below the masthead.
  const stage = document.querySelector('.finale-stage.overlay');
  function fit() {
    if (!stage) return;
    const top = document.querySelector('.masthead')?.getBoundingClientRect().bottom || 0;
    stage.style.setProperty('--finale-top', `${Math.round(top + 18)}px`);
  }
  addEventListener('resize', fit);
  document.fonts?.ready.then(fit);
  fit();
  const art = document.querySelector('[data-finale-art]');
  const reveal = () => requestAnimationFrame(() => document.body.classList.add('finale-ready'));
  if (!art || art.complete) reveal(); else { art.addEventListener('load', reveal, { once: true }); art.addEventListener('error', reveal, { once: true }); }
})();
