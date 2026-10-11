(() => {
  'use strict';
  // Every concept film opens on the work its movement card showed in the hub (artwork-intro.css).
  // Choosing the painting zooms through it into the film; the page's film script listens for
  //   'artwork-intro:enter'    the painting was chosen: rewind and hold still while the zoom runs
  //   'artwork-intro:entered'  the zoom has finished: start playing
  // While body.artwork-intro is set, art-audio.js keeps the music down.
  // On #paintingIntro, data-reveal names the film surface that fades up behind the zoom, and
  // data-focus the point in the painting (x y, as fractions of its size) the camera dives toward.
  const intro = document.getElementById('paintingIntro'), button = document.getElementById('beginStudy');
  if (!intro || !button) return;
  const painting = button.querySelector('img');
  const atelier = document.getElementById('atelier'), masthead = document.querySelector('.masthead');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const surface = intro.dataset.reveal ? document.querySelector(intro.dataset.reveal) : null;
  const [fx, fy] = (intro.dataset.focus || '.5 .43').split(' ').map(Number);
  let entering = false;
  // The painting starts just below the masthead, however many lines its heading takes.
  function place() {
    if (masthead) intro.style.setProperty('--intro-top', `${Math.round(masthead.getBoundingClientRect().bottom + 18)}px`);
  }
  addEventListener('resize', place);
  if (masthead) new ResizeObserver(place).observe(masthead);
  place();
  // The CSS sizes the painting from its proportions, so its box is exactly the painted pixels.
  const measure = () => { if (painting.naturalWidth) intro.style.setProperty('--intro-ratio', painting.naturalWidth / painting.naturalHeight); };
  if (painting.complete) measure(); else painting.addEventListener('load', measure, { once: true });
  button.addEventListener('click', async () => {
    if (entering || !document.body.classList.contains('artwork-intro')) return;
    entering = true;
    const rect = painting.getBoundingClientRect();
    const portal = painting.cloneNode();
    portal.alt = ''; portal.setAttribute('aria-hidden', 'true');
    Object.assign(portal.style, { position: 'fixed', left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px', maxWidth: 'none', objectFit: 'fill', zIndex: '100', pointerEvents: 'none', transformOrigin: `${fx * 100}% ${fy * 100}%` });
    if (!reduced.matches) document.body.append(portal);
    intro.hidden = true; document.body.classList.remove('artwork-intro');
    dispatchEvent(new Event('artwork-intro:enter'));
    if (!reduced.matches) {
      atelier.inert = true; document.body.classList.add('entering-painting');
      const dx = innerWidth * .5 - (rect.left + rect.width * fx), dy = innerHeight * .47 - (rect.top + rect.height * fy);
      const scale = Math.max(innerWidth / Math.max(1, rect.width), innerHeight / Math.max(1, rect.height)) * 2.1;
      const zoom = portal.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1, filter: 'blur(0px)', offset: 0 },
        { transform: `translate(${dx * .35}px,${dy * .35}px) scale(1.35)`, opacity: 1, filter: 'blur(0px)', offset: .32 },
        { transform: `translate(${dx}px,${dy}px) scale(${scale})`, opacity: 1, filter: 'blur(3px)', offset: .76 },
        { transform: `translate(${dx}px,${dy}px) scale(${scale * 1.15})`, opacity: 0, filter: 'blur(12px)', offset: 1 }
      ], { duration: 1450, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' });
      const reveal = surface?.animate([{ opacity: 0, transform: 'scale(1.16)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 850, delay: 600, easing: 'ease-out', fill: 'both' });
      await Promise.allSettled([zoom.finished, reveal?.finished]);
      portal.remove(); reveal?.cancel(); atelier.inert = false; document.body.classList.remove('entering-painting');
    }
    entering = false;
    dispatchEvent(new Event('artwork-intro:entered'));
  });
})();
