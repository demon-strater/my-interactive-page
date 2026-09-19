/* Original painterly renderer: a cathedral facade built entirely from animated dabs of color.
   No photographs — the same fixed field of brushstrokes reads as abstract patches up close and
   resolves into architecture from a distance, which is the optical-mixing point of the chapter. */
(() => {
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };

  // Three light stops (dawn / noon / dusk) per architectural region. Rouen Cathedral's real
  // series leans on this exact move — violet-blue shadow at dawn, warm cream at noon, rose at dusk.
  const PHASES = [
    { sky: [150, 168, 204], tower: [176, 168, 188], facade: [196, 186, 196], rose: [200, 150, 150], arch: [86, 80, 104], ground: [140, 140, 158] },
    { sky: [186, 206, 224], tower: [224, 202, 164], facade: [236, 218, 182], rose: [230, 160, 104], arch: [120, 100, 84], ground: [184, 170, 142] },
    { sky: [210, 150, 158], tower: [206, 132, 124], facade: [218, 150, 140], rose: [224, 112, 96], arch: [92, 58, 66], ground: [142, 104, 108] }
  ];
  function sampleLight(phase) {
    phase = clamp(phase);
    const [a, b, f] = phase < .5 ? [PHASES[0], PHASES[1], phase / .5] : [PHASES[1], PHASES[2], (phase - .5) / .5];
    const out = {};
    for (const k in a) out[k] = a[k].map((v, i) => v + (b[k][i] - v) * f);
    return out;
  }

  // A loose Gothic facade abstraction: two flanking towers, a rose window, three arched portals.
  // Detail is deliberately soft — impressionism reads by mass and color, not by architectural drawing.
  function regionAt(u, v) {
    const inTowerL = u >= .16 && u <= .30, inTowerR = u >= .70 && u <= .84;
    if (inTowerL || inTowerR) return v < .30 ? 'tower' : (v < .88 ? 'facade' : 'ground');
    if (v < .30) return 'sky';
    if (v >= .88) return 'ground';
    if (u < .24 || u > .76) return 'sky';
    const dx = (u - .5) / .13, dy = (v - .45) / .10;
    if (dx * dx + dy * dy < 1) return 'rose';
    if (v > .70 && v < .88) for (const d of [.35, .5, .65]) if (Math.abs(u - d) < .045) return 'arch';
    return 'facade';
  }

  const DABS = (() => {
    const list = []; let seed = 918273;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const cols = 42, rows = 28;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const u = (c + .25 + rand() * .5) / cols, v = (r + .25 + rand() * .5) / rows;
      list.push({ u, v, rot: rand() * Math.PI, wob: rand() * Math.PI * 2, jsize: .7 + rand() * .6, region: regionAt(u, v) });
    }
    return list;
  })();

  function drawFacade(ctx, w, h, time, phase, cloudX, cloudOn, reduced) {
    const colors = sampleLight(phase);
    const sky = colors.sky;
    ctx.fillStyle = `rgb(${sky[0] | 0},${sky[1] | 0},${sky[2] | 0})`;
    ctx.fillRect(0, 0, w, h);
    const baseSize = Math.max(w, h) / 38;
    for (const d of DABS) {
      const base = colors[d.region] || colors.facade;
      let shadow = 0;
      if (cloudOn) { const dist = Math.abs(d.u - cloudX); shadow = Math.max(0, 1 - dist / .16); }
      const flick = reduced ? 0 : Math.sin(time * 1.3 + d.wob) * 5;
      const r = clamp(base[0] * (1 - shadow * .38) + flick, 0, 255);
      const g = clamp(base[1] * (1 - shadow * .38) + flick, 0, 255);
      const b = clamp(base[2] * (1 - shadow * .34) + flick, 0, 255);
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      const x = d.u * w, y = d.v * h;
      const rot = reduced ? d.rot : d.rot + Math.sin(time * .22 + d.wob) * .18;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.beginPath(); ctx.ellipse(0, 0, baseSize * d.jsize * 1.15, baseSize * d.jsize * .6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function drawBirds(ctx, w, h, t, count) {
    ctx.save(); ctx.strokeStyle = 'rgba(40,34,30,.55)'; ctx.lineWidth = Math.max(1, w / 700);
    for (let i = 0; i < count; i++) {
      const speed = .05 + i * .011, x = ((t * speed + i * .37) % 1.3 - .15) * w, y = h * (.14 + i * .045) + Math.sin(t * .6 + i) * h * .01;
      const s = w * .012;
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * .3, y - s * .7, x, y); ctx.quadraticCurveTo(x + s * .3, y - s * .7, x + s, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawVignette(ctx, w, h) {
    const g = ctx.createRadialGradient(w / 2, h * .52, h * .25, w / 2, h * .52, h * .85);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,14,10,.38)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  function withCamera(ctx, w, h, zoom, anchorU, anchorV, draw) {
    ctx.save();
    ctx.translate(w / 2, h / 2); ctx.scale(zoom, zoom); ctx.translate(-anchorU * w, -anchorV * h);
    draw();
    ctx.restore();
  }

  function scene(ctx, w, h, time, index, p, reduced) {
    let zoom = 1, anchorU = .5, anchorV = .5, phaseLight = .18, cloudOn = false, cloudX = .5, birds = 0;
    if (index === 0) {
      // Close enough that a single dab fills the frame — color before form.
      zoom = mix(9, 6, smooth(p)); anchorU = .42; anchorV = .47; phaseLight = .12;
    } else if (index === 1) {
      // The eye assembles the facade purely by pulling back; nothing about the dabs themselves changes.
      const rp = smooth(p);
      zoom = mix(6, 1, rp); anchorU = mix(.42, .5, rp); anchorV = mix(.47, .5, rp); phaseLight = .16;
    } else if (index === 2) {
      // Same view, same brushwork — only the light phase sweeps dawn to dusk.
      phaseLight = p;
    } else if (index === 3) {
      // An independent event on top of the steady light: a shadow travels across in real time.
      phaseLight = .55; cloudOn = true; cloudX = mix(-.2, 1.2, p);
    } else {
      zoom = mix(1, .94, smooth(p)); anchorV = .49; phaseLight = mix(.62, .5, p); birds = 3;
    }
    withCamera(ctx, w, h, zoom, anchorU, anchorV, () => drawFacade(ctx, w, h, time, phaseLight, cloudX, cloudOn, reduced));
    if (birds) drawBirds(ctx, w, h, time, birds);
    drawVignette(ctx, w, h);
  }

  window.drawCathedralWorld = function (ctx, w, h, time, index, amount, settings = {}) {
    scene(ctx, w, h, time, index, clamp(amount), settings.reduced);
  };
})();
