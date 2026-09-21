// Sizes the paintings in every .art-compare panel so each row uses the space between its heading and the
// footer as fully as possible: one shared height per row, chosen so the row fills the width or the height,
// whichever runs out first. Narrow screens stack the rows (painting beside its caption) instead. Also keeps
// --transport-height current so the panels stop exactly above the footer controls.
(() => {
  'use strict';
  const atelier = document.getElementById('atelier');
  const footer = atelier.querySelector('footer');
  const panels = [...document.querySelectorAll('.art-compare')];
  if (!panels.length) return;
  const stacked = matchMedia('(max-width:600px)');
  function measureFooter() {
    const a = atelier.getBoundingClientRect(), f = footer.getBoundingClientRect();
    // A footer hidden by an intro state has no box; keep the last value instead of collapsing to zero.
    if (f.height > 0) atelier.style.setProperty('--transport-height', `${Math.max(0, a.bottom - f.top)}px`);
  }
  function fitPanel(panel) {
    const grid = panel.querySelector('.compare-grid');
    const items = grid ? [...grid.querySelectorAll('.compare-item')] : [];
    if (!items.length) return;
    const ps = getComputedStyle(panel);
    const width = panel.clientWidth - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight);
    const rowGap = parseFloat(ps.rowGap) || 0;
    const siblings = [...panel.children].filter(el => el !== grid);
    const others = siblings.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0) + rowGap * siblings.length;
    const height = panel.clientHeight - parseFloat(ps.paddingTop) - parseFloat(ps.paddingBottom) - others;
    const gap = parseFloat(getComputedStyle(grid).gap) || 0;
    const rows = items.map(item => {
      const img = item.querySelector('img');
      const wrap = img.closest('.img-wrap') || img;
      const ratio = img.naturalWidth / Math.max(1, img.naturalHeight) || 1;
      // Everything under the painting (caption, credit, colour strip) plus the gaps between them.
      const below = [...item.children].filter(el => el !== wrap);
      const itemGap = parseFloat(getComputedStyle(item).rowGap) || 0;
      const reserve = below.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0) + itemGap * below.length;
      return { item, img, ratio, reserve };
    });
    if (stacked.matches) {
      const share = (height - gap * (rows.length - 1)) / rows.length;
      rows.forEach(({ item, img, ratio, reserve }) => {
        // Wide paintings would be tiny beside their caption, so they take the full row instead.
        const wide = ratio > 1.45;
        item.classList.toggle('wide', wide);
        const w = wide ? Math.min(width, Math.max(60, (share - reserve) * ratio)) : Math.max(60, Math.min(width * .58, share * ratio));
        img.style.width = `${w}px`; img.style.height = `${w / ratio}px`; item.style.width = '';
      });
      return;
    }
    rows.forEach(({ item }) => item.classList.remove('wide'));
    const byHeight = height - Math.max(...rows.map(r => r.reserve));
    const byWidth = (width - gap * (rows.length - 1)) / rows.reduce((sum, r) => sum + r.ratio, 0);
    const common = Math.max(40, Math.min(byHeight, byWidth));
    rows.forEach(({ item, img, ratio }) => {
      const w = common * ratio;
      img.style.width = `${w}px`; img.style.height = `${common}px`; item.style.width = `${w}px`;
    });
  }
  function fitAll() {
    measureFooter();
    // Two passes: the first settles the caption widths, the second measures them correctly.
    panels.forEach(fitPanel); panels.forEach(fitPanel);
  }
  window.fitComparisons = fitAll;
  const observer = new MutationObserver(records => {
    if (records.some(r => r.target.classList.contains('visible'))) fitAll();
  });
  panels.forEach(panel => {
    observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
    panel.querySelectorAll('img').forEach(img => img.addEventListener('load', fitAll));
  });
  addEventListener('resize', fitAll);
  stacked.addEventListener('change', fitAll);
  document.fonts.ready.then(fitAll);
  fitAll();
})();
