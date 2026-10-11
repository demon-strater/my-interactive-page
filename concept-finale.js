(() => {
  'use strict';
  // Closing gallery (concept-finale.css). The movement's representative works stand in a row inside the movement's own
  // world, drawn on a canvas across the whole screen, and the visitor scrolls along them: drag, the wheel, the arrow
  // keys, the side arrows or the marks along the bottom. Every .work gets --side (-1…1: how far left or right of centre
  // it stands), --near (the size of that) and --focus (1 only in front). When the scroll comes to rest on a work it
  // becomes present: it arrives in its movement's own way (worlds, below) and its caption appears beneath it. Walking
  // on, it goes back to waiting. A loupe follows the pointer over the present work.
  // Inside the hub's iframe the hub's own Home square leads back to the main screen, so the page's is hidden.
  const goHome = document.getElementById('goHome');
  if (goHome && window.parent !== window) goHome.hidden = true;
  const museum = document.querySelector('.museum'), wall = museum?.querySelector('.museum-wall');
  if (!wall) return;
  const works = [...wall.querySelectorAll('.work')], masthead = document.querySelector('.masthead');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const NS = 'http://www.w3.org/2000/svg';
  const pad = n => String(n).padStart(2, '0');
  const css = name => getComputedStyle(museum).getPropertyValue(name).trim();
  const make = (tag, className, parent) => { const el = document.createElement(tag); if (className) el.className = className; parent?.append(el); return el; };
  const rand = (a, b) => a + Math.random() * (b - a);
  const imgOf = work => work.querySelector('img');
  const frameOf = work => work.querySelector('.work-frame');
  const ratioOf = img => (Number(img.getAttribute('width')) || img.naturalWidth || 4) / (Number(img.getAttribute('height')) || img.naturalHeight || 3);
  const ready = img => img.complete && img.naturalWidth > 0;
  // Smooth noise along the world's x, so scenery drawn from it stays put while it scrolls past.
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const noise = x => { const i = Math.floor(x), f = x - i; return hash(i) + (hash(i + 1) - hash(i)) * f * f * (3 - 2 * f); };
  // A soft round puff of one colour (#rrggbb), drawn once, for fog.
  const puff = (colour, size = 256) => {
    const c = document.createElement('canvas'), g = c.getContext('2d'), r = size / 2;
    c.width = c.height = size;
    const fill = g.createRadialGradient(r, r, 0, r, r, r);
    fill.addColorStop(0, colour); fill.addColorStop(.45, colour); fill.addColorStop(1, colour + '00');
    g.globalAlpha = 1; g.fillStyle = fill; g.fillRect(0, 0, size, size);
    return c;
  };
  const room = { W: 0, H: 0, base: 0, top: 0 };
  const focus = works.map(() => 0);
  let current = -1, present = -1, aim = 0, raf = 0, drag = null, active = null, opened = false, glideRaf = 0;

  // ── The worlds. Each may: build its pieces (setup), resize with the room (layout), draw the canvas behind the works
  // (draw; return true to be called again next frame), follow the work in front (light), and give a work its arrival
  // (arrive: returns its length in ms) and its departure (depart). `hides` keeps the picture out of sight while it
  // arrives; `live` keeps the world moving; `glide` is how long a step from one work to the next takes. ──
  const worlds = {
    // Renaissance: a hall built in one-point perspective, its floor and coffered ceiling drawn in gold lines that run
    // to the vanishing point behind the work in front. Walking along, the lines swing about that point as they would
    // for someone walking through the hall; when a work arrives the hall's lines glow with its own construction.
    prospettiva: {
      glide: 950, dpr: 2, pulse: -1e4,
      layout() {
        works.forEach(work => {
          frameOf(work).querySelector('.construct')?.remove();
          const img = imgOf(work), w = parseFloat(work.style.getPropertyValue('--iw')), h = parseFloat(work.style.getPropertyValue('--ih'));
          const svg = document.createElementNS(NS, 'svg');
          svg.setAttribute('class', 'construct'); svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('aria-hidden', 'true');
          // Into the vanishing point where the work is built on one (data-vp, in % of the picture), otherwise along the
          // thirds and diagonals it was composed on.
          const vp = work.dataset.vp?.split(' ').map((v, k) => Number(v) / 100 * (k ? h : w));
          const edge = [[0, 0], [.25, 0], [.5, 0], [.75, 0], [1, 0], [1, .34], [1, .67], [1, 1], [.75, 1], [.5, 1], [.25, 1], [0, 1], [0, .67], [0, .34]];
          const lines = vp ? edge.map(([x, y]) => [x * w, y * h, ...vp])
            : [[0, h / 3, w, h / 3], [0, h * 2 / 3, w, h * 2 / 3], [w / 3, 0, w / 3, h], [w * 2 / 3, 0, w * 2 / 3, h], [0, 0, w, h], [w, 0, 0, h]];
          lines.forEach(([x1, y1, x2, y2], k) => {
            const line = document.createElementNS(NS, 'line');
            Object.entries({ x1, y1, x2, y2, pathLength: 1 }).forEach(([a, v]) => line.setAttribute(a, v));
            line.style.setProperty('--k', k);
            svg.append(line);
          });
          if (vp) {
            const dot = document.createElementNS(NS, 'circle');
            Object.entries({ cx: vp[0], cy: vp[1], r: 7 }).forEach(([a, v]) => dot.setAttribute(a, v));
            svg.append(dot);
          }
          img.after(svg);
        });
      },
      arrive() { this.pulse = performance.now(); redraw(); return 2700; },
      draw(now) {
        const { W, H, base, top } = room, g = ctx, hy = Math.round(base - (base - top) * .46), vx = W / 2;
        const S = (H - hy) / 1.45, cam = wall.scrollLeft / 300, glow = Math.max(0, 1 - (now - this.pulse) / 2400);
        g.clearRect(0, 0, W, H);
        // Lines grow out of the dark toward the edges of the view and fade into the vanishing point.
        const ink = g.createRadialGradient(vx, hy, 0, vx, hy, Math.max(W, H) * .7);
        ink.addColorStop(0, this.line + '00'); ink.addColorStop(.22, this.line); ink.addColorStop(1, this.line);
        g.strokeStyle = ink; g.lineWidth = 1;
        const a = .14 + .3 * glow * glow;
        for (const [edge, alpha] of [[H, a], [0, a * .5]]) {
          g.globalAlpha = alpha; g.beginPath();
          for (let k = Math.floor(cam) - 30; k <= Math.ceil(cam) + 30; k++) { g.moveTo(vx, hy); g.lineTo(vx + (k - cam) * S, edge); }
          let last = edge;
          for (let j = 0; j < 60; j++) {
            const y = hy + (edge - hy) / (1 + j * .6);
            if (Math.abs(last - y) < 5 && j) break;
            g.moveTo(0, y); g.lineTo(W, y); last = y;
          }
          g.stroke();
        }
        g.globalAlpha = a * 1.6; g.beginPath(); g.moveTo(0, hy + .5); g.lineTo(W, hy + .5); g.stroke();
        // Under the works the floor darkens, so the caption reads on calm ground.
        const floor = g.createLinearGradient(0, base - 10, 0, base + 60);
        floor.addColorStop(0, this.ground + '00'); floor.addColorStop(1, this.ground);
        g.globalAlpha = .88; g.fillStyle = floor; g.fillRect(0, base - 10, W, H - base + 10);
        g.globalAlpha = 1;
        return glow > 0;
      },
      setup() { this.line = css('--line') || '#dfb774'; this.ground = css('--ground') || '#0b0806'; }
    },

    // Impressionism: open air made of dabs of colour. The air takes the light of the work in front, re-laid dab by dab
    // as you walk from one to the next, and shimmers a little all the while. Works wait as blank canvases and are
    // painted in front of you in the same dabs, broad strokes first and finer over them.
    'plein-air': {
      glide: 850, hides: true, live: true, dpr: 1,
      setup() { this.src = document.createElement('canvas'); this.pending = 0; this.lit = -1; },
      resize() { ctx.fillStyle = css('--air') || '#efe6d6'; ctx.fillRect(0, 0, room.W, room.H); if (this.lit >= 0) this.take(this.lit, 3600); },
      light(i) {
        const img = imgOf(works[i]);
        if (ready(img)) this.take(i, 2200); else img.addEventListener('load', () => current === i && this.take(i, 2200), { once: true });
      },
      // The work in front, spread to cover the room at a sixth of its size and lifted toward daylight: strokes sampled
      // from it are its colours, as light.
      take(i, dabs) {
        const img = imgOf(works[i]), s = this.src, r = ratioOf(img), g = s.getContext('2d');
        s.width = Math.max(8, Math.ceil(room.W / 6)); s.height = Math.max(8, Math.ceil(room.H / 6));
        let w = s.width, h = w / r;
        if (h < s.height) { h = s.height; w = h * r; }
        g.filter = 'saturate(1.5) brightness(1.12)';
        g.drawImage(img, (s.width - w) / 2, (s.height - h) / 2, w, h);
        this.lit = i; this.pending = dabs; redraw();
      },
      draw() {
        if (this.lit < 0) return false;
        const { W, H } = room, k = this.src.width / W, unit = Math.max(W, H) / 1500;
        const n = reduced.matches ? this.pending : this.pending > 0 ? Math.min(this.pending, 40) : 6;
        const alpha = this.pending > 0 ? .62 : .3;
        this.pending = Math.max(0, this.pending - n);
        for (let d = 0; d < n; d++) {
          // Short strokes, all leaning the way the light ripples across the field at that spot.
          const x = Math.random() * W, y = Math.random() * H, rx = rand(16, 40) * unit, ry = rx * rand(.22, .34);
          const a = (noise(x / 260 + y / 900) - .5) * 1.6 + rand(-.25, .25);
          // Sampled a little off the spot, so neighbouring strokes disagree as broken colour does.
          const sx = x + rand(-1, 1) * rx * .8, sy = y + rand(-1, 1) * ry * 2;
          ctx.save(); ctx.globalAlpha = alpha;
          ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(this.src, (sx - rx) * k, (sy - rx) * k, 2 * rx * k, 2 * rx * k, x - rx, y - rx, 2 * rx, 2 * rx);
          ctx.restore();
        }
        return false;
      },
      arrive(job) {
        const { img, layer } = job, w = img.clientWidth, h = img.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
        const canvas = make('canvas', '', layer);
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        const g = canvas.getContext('2d');
        g.scale(dpr, dpr);
        // Drawing a picture onto a canvas is allowed from file:// (only reading pixels back is not), so this works offline too.
        const source = document.createElement('canvas');
        source.width = canvas.width; source.height = canvas.height;
        source.getContext('2d').drawImage(img, 0, 0, source.width, source.height);
        // The colour is blocked in first from a soft version of the picture, then laid over in ever finer strokes.
        const soft = document.createElement('canvas'), sg = soft.getContext('2d');
        soft.width = source.width; soft.height = source.height;
        sg.filter = `blur(${Math.round(Math.max(w, h) / 90 * dpr)}px) saturate(1.15)`; sg.drawImage(source, 0, 0);
        const strokes = [], unit = Math.max(w, h) / 15;
        for (const [size, from, span, from2] of [[1.5, 0, 650, soft], [.8, 380, 750, source], [.45, 800, 650, source]]) {
          const step = unit * size, cols = Math.ceil(w / step), rows = Math.ceil(h / (step * .55));
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) strokes.push({
            x: (c + Math.random()) * w / cols, y: (r + Math.random()) * h / rows, a: (Math.random() - .5) * 1.3,
            rx: step * rand(.75, 1.15), ry: step * rand(.26, .4), t: from + Math.random() * span, src: from2
          });
        }
        strokes.sort((p, q) => p.t - q.t);
        let n = 0, start = 0;
        const paint = now => {
          start ||= now;
          for (const t = now - start; n < strokes.length && strokes[n].t <= t; n++) {
            const { x, y, rx, ry, a, src } = strokes[n], sx = Math.max(0, x - rx), sy = Math.max(0, y - rx), sw = Math.min(w, x + rx) - sx, sh = Math.min(h, y + rx) - sy;
            if (sw <= 0 || sh <= 0) continue;
            g.save(); g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); g.clip();
            g.drawImage(src, sx * dpr, sy * dpr, sw * dpr, sh * dpr, sx, sy, sw, sh);
            g.restore();
          }
          if (n < strokes.length) { job.frame = requestAnimationFrame(paint); return; }
          // Painted: the picture itself takes over underneath as the dabs fade off it.
          job.work.classList.remove('arriving');
          job.anims.push(canvas.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'both' }));
        };
        job.frame = requestAnimationFrame(paint);
        return 1950;
      }
    },

    // Romanticism: a moonlit sea of fog seen from a dark rock, as the wanderer sees it. Far ridges stand above the fog,
    // banks of it drift at three depths, and the caption is read on the rock in front. Works wait veiled in fog (their
    // own banks, CSS), which parts when one comes to the front and rolls back in behind it.
    sublime: {
      glide: 1250, live: true, dpr: 1,
      setup() {
        const fog = css('--fog') || '#cfd8e2';
        this.puff = puff(fog); this.rock = css('--rock') || '#04070d'; this.ridge = [css('--ridge-far') || '#1c2d42', css('--ridge-near') || '#132238'];
        this.banks = Array.from({ length: 36 }, (_, k) => ({ depth: k % 3, u: Math.random(), v: Math.random(), s: rand(.6, 1.15), drift: rand(.5, 1) }));
        works.forEach(work => {
          const mist = make('div', 'mist', frameOf(work));
          mist.setAttribute('aria-hidden', 'true');
          for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
            if ((r + c) % 2 && Math.random() < .4) continue;
            const bank = make('i', '', mist), x = 18 + c * 32 + rand(-8, 8), y = 18 + r * 32 + rand(-8, 8);
            const away = Math.sign(x - 50) || (Math.random() < .5 ? -1 : 1);
            Object.entries({ '--x': `${x}%`, '--y': `${y}%`, '--z': rand(.62, .9).toFixed(2), '--mx': (away * rand(.45, .8)).toFixed(2), '--my': rand(-.15, .15).toFixed(2), '--d': `${Math.round(rand(80, 420))}ms` })
              .forEach(([k, v]) => bank.style.setProperty(k, v));
          }
        });
      },
      arrive() { return 2700; },
      draw(now) {
        const { W, H, base, top } = room, g = ctx, band = Math.max(80, base - top), hy = base - band * .34, t = reduced.matches ? 0 : now / 1000, cam = wall.scrollLeft;
        g.clearRect(0, 0, W, H);
        // Two far ridges standing out of the fog.
        this.ridge.forEach((colour, layer) => {
          const speed = [.04, .09][layer], height = [.2, .12][layer], scale = [300, 190][layer];
          g.fillStyle = colour; g.beginPath(); g.moveTo(0, H);
          for (let x = 0; x <= W + 24; x += 24) { const u = (x + cam * speed) / scale + layer * 40; g.lineTo(x, hy + layer * 14 - (noise(u) * .75 + noise(u * 2.9) * .25) * band * height); }
          g.lineTo(W, H); g.fill();
        });
        // The sea of fog: far banks slow and small, near ones large, all drifting with the wind and past as you walk.
        const span = W * 1.8;
        for (const b of this.banks) {
          const speed = [.12, .26, .45][b.depth], size = band * b.s * [.55, .8, 1.1][b.depth];
          let x = (b.u * span - cam * speed - t * (5 + 6 * b.depth) * b.drift) % span;
          if (x < 0) x += span;
          x -= W * .4;
          const y = hy - band * .05 + b.v * band * [.25, .45, .62][b.depth];
          g.globalAlpha = [.22, .17, .13][b.depth];
          g.drawImage(this.puff, x - size, y - size * .3, size * 2, size * .6);
        }
        // The rock the viewer stands on, under the captions.
        g.globalAlpha = 1; g.fillStyle = this.rock; g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W + 14; x += 14) { const u = (x + cam * .7) / 80; g.lineTo(x, base + 6 - noise(u) * 16 - noise(u * 3.3) * 9); }
        g.lineTo(W, H); g.fill();
        return false;
      }
    },

    // Surrealism: Magritte's daylight sky over a street at night (The Empire of Light). Clouds drift across the day, and
    // trees, houses and a lamp stand dark along the line where night begins; the caption is read in the night below.
    // Works wait as empty frames floating in the sky; in front their pieces float in and lock into place, and when you
    // walk on they come apart and drift off.
    dream: {
      glide: 1300, hides: true, live: true, dpr: 1,
      setup() {
        // Magritte's clouds: soft-edged white cumulus, rounded on top, flat and a little shaded underneath. Each is
        // drawn once into its own canvas.
        const shade = css('--cloud-shade') || '#9fb1c6';
        this.sprites = Array.from({ length: 5 }, () => {
          const c = document.createElement('canvas'), g = c.getContext('2d'), w = 460, h = 220, n = 7 + Math.floor(rand(0, 4));
          c.width = w; c.height = h;
          g.filter = 'blur(4px)'; g.fillStyle = '#fff';
          for (let k = 0; k < n; k++) {
            const p = k / (n - 1), r = 22 + 44 * Math.sin(Math.PI * p) * rand(.75, 1.15), x = w * (.16 + .68 * p) + rand(-10, 10);
            g.beginPath(); g.arc(x, h * .66 - r * rand(.55, .85), r, 0, Math.PI * 2); g.fill();
          }
          g.beginPath(); g.ellipse(w / 2, h * .64, w * .36, h * .1, 0, 0, Math.PI * 2); g.fill();
          g.filter = 'none'; g.globalCompositeOperation = 'source-atop';
          const under = g.createLinearGradient(0, h * .28, 0, h * .74);
          under.addColorStop(0, '#ffffff00'); under.addColorStop(1, shade);
          g.globalAlpha = .7; g.fillStyle = under; g.fillRect(0, 0, w, h);
          return c;
        });
        this.clouds = Array.from({ length: 8 }, (_, k) => ({ sprite: this.sprites[k % 5], u: (k + rand(0, .7)) / 8, v: Math.random(), s: rand(.65, 1.25), drift: rand(.5, 1) }));
        this.night = css('--silhouette') || '#0b111c'; this.lamp = css('--lamp') || '#f6d58e';
      },
      light() {},
      draw(now) {
        const { W, H, base, top } = room, g = ctx, t = reduced.matches ? 0 : now / 1000, cam = wall.scrollLeft;
        g.clearRect(0, 0, W, H);
        // Clouds drifting slowly with the wind, the larger (nearer) ones passing faster as you walk.
        const span = W * 1.7, high = Math.max(10, top * .15), low = Math.max(high + 40, base - 170), unit = Math.max(W, 900) / 1700;
        g.globalAlpha = .96;
        for (const c of this.clouds) {
          const w = c.sprite.width * c.s * unit, h = c.sprite.height * c.s * unit;
          let x = (c.u * span - cam * .16 * c.s - t * 6 * c.drift) % span;
          if (x < 0) x += span;
          g.drawImage(c.sprite, x - W * .35 - w / 2, high + c.v * (low - high) - h * .6, w, h);
        }
        // Night along the bottom: a dark treeline with gaps, a house with lit windows, lamps lit in daylight.
        const ground = base, shift = cam * .55;
        g.globalAlpha = 1; g.fillStyle = this.night;
        for (let k = Math.floor((shift - 60) / 13); k * 13 - shift < W + 60; k++) {
          if (noise(k * .045) < .34) continue;
          const tall = noise(k * .021 + 9) > .66 ? 26 : 0, r = 9 + noise(k * .37) * 15 + tall * noise(k * .5 + 3), x = k * 13 - shift + (hash(k) - .5) * 8;
          g.beginPath(); g.arc(x, ground - r * .95 - tall * .4, r, 0, Math.PI * 2); g.fill();
          g.fillRect(x - r * .9, ground - r * .9, r * 1.8, r * .9 + 1);
        }
        const every = 1150;
        for (let k = Math.floor((shift - 260) / every); k * every - shift < W + 260; k++) {
          const x = k * every - shift + 520, h = 50, w = 60;
          g.fillStyle = this.night; g.beginPath();
          g.moveTo(x - w / 2, ground); g.lineTo(x - w / 2, ground - h); g.lineTo(x - w / 2 + 6, ground - h - 16); g.lineTo(x + w / 2 - 6, ground - h - 16); g.lineTo(x + w / 2, ground - h); g.lineTo(x + w / 2, ground); g.fill();
          g.fillRect(x + 12, ground - h - 26, 7, 14);
          g.fillStyle = this.lamp; g.globalAlpha = .9;
          for (const [wx, wy] of [[-19, 12], [-5, 12], [9, 12], [-19, 30], [9, 30]]) g.fillRect(x + wx, ground - h + wy, 7, 10);
          g.globalAlpha = 1;
          const lx = x + 92, ly = ground - 64;
          g.fillStyle = this.night; g.fillRect(lx - 1.2, ly, 2.4, ground - ly);
          const halo = g.createRadialGradient(lx, ly, 0, lx, ly, 34);
          halo.addColorStop(0, this.lamp); halo.addColorStop(.1, this.lamp); halo.addColorStop(1, this.lamp + '00');
          g.globalAlpha = .7; g.fillStyle = halo; g.fillRect(lx - 34, ly - 34, 68, 68); g.globalAlpha = 1;
        }
        // The works waiting at the side float; the one in front holds still.
        if (!reduced.matches) works.forEach((work, i) => work.style.setProperty('--float', `${(Math.sin(t * .85 + i * 2.1) * 9 * (1 - focus[i])).toFixed(2)}px`));
        return false;
      },
      // The picture in pieces: a grid of tiles, each showing its part of the picture.
      pieces(img, layer) {
        const w = img.clientWidth, h = img.clientHeight, cols = w > h ? 5 : 4, rows = w > h ? 4 : 5, src = `url("${img.currentSrc || img.src}")`, out = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const tile = make('i', 'tile', layer), x = c * w / cols, y = r * h / rows;
          Object.assign(tile.style, { left: `${x}px`, top: `${y}px`, width: `${w / cols + .6}px`, height: `${h / rows + .6}px`, backgroundImage: src, backgroundSize: `${w}px ${h}px`, backgroundPosition: `${-x}px ${-y}px` });
          out.push(tile);
        }
        return { w, h, tiles: out };
      },
      arrive({ work, img, layer, anims, timers }) {
        const { w, h, tiles } = this.pieces(img, layer);
        // As the last pieces settle, the whole picture comes up beneath them, so no seam shows between them.
        timers.push(setTimeout(() => work.classList.remove('arriving'), 2300));
        for (const tile of tiles) {
          // From anywhere in the sky, mostly from above.
          const angle = rand(-Math.PI * .95, Math.PI * .15), far = rand(.55, 1.05) * Math.max(w, h);
          const from = `translate(${Math.cos(angle) * far}px,${Math.sin(angle) * far * .8}px) rotate(${rand(-70, 70)}deg) scale(${rand(.45, 1.1)})`;
          anims.push(tile.animate([
            { transform: from, opacity: 0, boxShadow: '0 16px 30px #1d2a3a40' },
            { opacity: 1, offset: .25 },
            { transform: 'none', opacity: 1, boxShadow: '0 0 0 #0000' }
          ], { duration: rand(1500, 2100), delay: rand(0, 450), easing: 'cubic-bezier(.22,.8,.26,1.03)', fill: 'both' }));
        }
        return 2650;
      },
      depart(work) {
        const img = imgOf(work), layer = make('div', 'reveal dream leaving', frameOf(work));
        const { w, h, tiles } = this.pieces(img, layer);
        for (const tile of tiles) tile.animate([
          { transform: 'none', opacity: 1 },
          { transform: `translate(${rand(-.5, .5) * w}px,${-rand(.3, .9) * h}px) rotate(${rand(-55, 55)}deg) scale(${rand(.45, .8)})`, opacity: 0 }
        ], { duration: rand(900, 1400), delay: rand(0, 260), easing: 'cubic-bezier(.5,0,.75,.45)', fill: 'forwards' });
        setTimeout(() => layer.remove(), 1800);
      }
    }
  };
  const world = worlds[museum.dataset.world] || {};

  // ── The room and its controls are built here, so each finale page only lists its works. ──
  const sky = museum.insertBefore(make('canvas', 'museum-world'), wall), ctx = sky.getContext('2d');
  museum.insertBefore(make('div', 'museum-veil'), wall);
  const loupe = make('div', 'museum-loupe', museum);
  const arrow = (side, label, path) => {
    const button = make('button', `museum-step ${side}`, museum);
    button.type = 'button'; button.setAttribute('aria-label', label);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
    return button;
  };
  const prev = arrow('prev', '이전 작품', 'M14.5 5.5 8 12l6.5 6.5'), next = arrow('next', '다음 작품', 'M9.5 5.5 16 12l-6.5 6.5');
  const nav = make('nav', 'museum-nav', museum);
  nav.setAttribute('aria-label', '작품 넘기기');
  const count = make('p', 'museum-count', nav);
  count.setAttribute('aria-live', 'polite');
  const marks = make('div', 'museum-marks', nav);
  make('p', 'museum-hint', nav).textContent = '← → 넘겨 보기 · 그림 위에 마우스를 올리면 돋보기';
  const ticks = works.map((work, i) => {
    work.style.setProperty('--i', i);
    const tick = make('button', '', marks);
    tick.type = 'button';
    tick.setAttribute('aria-label', `${i + 1}번째 작품, ${work.querySelector('strong')?.textContent || ''}`);
    tick.addEventListener('click', () => go(i));
    return tick;
  });
  world.setup?.();

  // ── Sizing. Works stand on one line (--base) with their captions beneath and the marks along the bottom. A work
  // as narrow as the gap between the masthead and the Home corner rises to the top of the masthead; a wider one stays
  // below them. Standing aside, each shrinks (--rest) to clear the masthead. ──
  function layout() {
    const W = museum.clientWidth, H = museum.clientHeight, box = museum.getBoundingClientRect();
    const fw = parseFloat(css('--frame-w')) || 0, narrow = W <= 700;
    const head = masthead?.getBoundingClientRect();
    const headTop = head ? head.top - box.top : 24, headBottom = head ? head.bottom - box.top : 0, headRight = head ? head.right - box.left : 0;
    // The Home square at the top right, with the hub's sound square docked to its left.
    const cornerLeft = W - Math.max(W * .05, 16) - 96, cornerBottom = headTop + 44;
    const capH = Math.max(0, ...works.map(work => work.querySelector('.work-label')?.offsetHeight || 0));
    const base = Math.round(H - nav.offsetHeight - capH - (parseFloat(css('--cap-gap')) || 18) - 6);
    const top = Math.round(Math.max(headBottom, cornerBottom) + 20), band = Math.max(60, base - top);
    const side = narrow ? Math.max(14, W * .05) : Math.max(78, W * .055);
    const clear = W - 2 * (Math.max(headRight, W - cornerLeft) + 40);
    Object.assign(room, { W, H, base, top });
    museum.style.setProperty('--base', `${base}px`);
    museum.style.setProperty('--arrow-y', `${Math.round((top + base) / 2)}px`);
    for (const work of works) {
      const r = ratioOf(imgOf(work)), fit = (height, width) => Math.min(height - 2 * fw, (width - 2 * fw) / r);
      let ih = fit(band, W - 2 * side);
      if (clear > 0) ih = Math.max(ih, fit(base - headTop, clear));
      ih = Math.max(40, Math.floor(ih));
      work.style.setProperty('--iw', `${Math.round(ih * r)}px`);
      work.style.setProperty('--ih', `${ih}px`);
      work.style.setProperty('--rest', (Math.min(1, band / (ih + 2 * fw)) * .86).toFixed(3));
    }
    const dpr = Math.min(devicePixelRatio || 1, world.dpr || 1), cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (sky.width !== cw || sky.height !== ch) { sky.width = cw; sky.height = ch; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); world.resize?.(); }
    world.layout?.();
    redraw();
  }

  // ── The world's canvas: redrawn when asked, every frame while the world is live. ──
  let frameReq = 0;
  const paint = now => {
    frameReq = 0;
    if (document.hidden) return;
    const more = world.draw?.call(world, now);
    if (more || (world.live && !reduced.matches)) frameReq = requestAnimationFrame(paint);
  };
  function redraw() { if (!frameReq) frameReq = requestAnimationFrame(paint); }
  document.addEventListener('visibilitychange', redraw);

  // ── Walking. ──
  const centreOf = i => works[i].offsetLeft + works[i].offsetWidth / 2 - wall.clientWidth / 2;
  const ease = (p, moving) => moving ? 1 - (1 - p) ** 3 : p < .5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
  // A step glides at the world's own pace; snapping stays off until it lands.
  function go(i, smooth = true) {
    i = Math.max(0, Math.min(works.length - 1, i)); aim = i;
    const to = centreOf(i), from = wall.scrollLeft, moving = !!glideRaf;
    cancelAnimationFrame(glideRaf); glideRaf = 0;
    if (!smooth || reduced.matches || Math.abs(to - from) < 1) { wall.classList.remove('gliding'); wall.scrollLeft = to; settleSoon(); return; }
    const ms = (world.glide || 900) * Math.min(1.4, .55 + Math.abs(to - from) / (room.W || 1000) * .45), t0 = performance.now();
    wall.classList.add('gliding');
    const step = now => {
      const p = Math.min(1, (now - t0) / ms);
      wall.scrollLeft = from + (to - from) * ease(p, moving);
      if (p < 1) { glideRaf = requestAnimationFrame(step); return; }
      glideRaf = 0; wall.classList.remove('gliding'); settle();
    };
    glideRaf = requestAnimationFrame(step);
  }
  const stopGlide = () => { if (!glideRaf) return; cancelAnimationFrame(glideRaf); glideRaf = 0; wall.classList.remove('gliding'); };
  function setCurrent(i) {
    current = i;
    works.forEach((work, k) => work.classList.toggle('current', k === i));
    ticks.forEach((tick, k) => tick.setAttribute('aria-current', String(k === i)));
    count.innerHTML = `<b>${pad(i + 1)}</b> / ${pad(works.length)}`;
    prev.disabled = i === 0; next.disabled = i === works.length - 1;
    if (i) museum.classList.add('museum-moved');
    if (present !== -1 && present !== i) depart();
    world.light?.(i);
  }
  function walk() {
    raf = 0;
    const mid = wall.scrollLeft + wall.clientWidth / 2, gap = parseFloat(getComputedStyle(wall).columnGap) || 0, half = (room.W || wall.clientWidth) * .5;
    let nearest = 0, best = Infinity;
    works.forEach((work, i) => {
      const off = work.offsetLeft + work.offsetWidth / 2 - mid, d = Math.abs(off);
      if (d < best) { best = d; nearest = i; }
      const f = Math.max(0, 1 - d / (work.offsetWidth / 2 + gap / 2 + 40));
      focus[i] = f * f * (3 - 2 * f);
      work.style.setProperty('--side', Math.max(-1, Math.min(1, off / half)).toFixed(3));
      work.style.setProperty('--near', Math.min(1, d / half).toFixed(3));
      work.style.setProperty('--focus', focus[i].toFixed(3));
    });
    if (nearest !== current) setCurrent(nearest);
    redraw();
  }
  const relight = () => { if (!raf) raf = requestAnimationFrame(walk); };

  // ── Arriving and leaving. A work becomes present once the walk comes to rest on it. ──
  let settleTimer = 0;
  function settleSoon() { clearTimeout(settleTimer); settleTimer = setTimeout(settle, 180); }
  function settle() {
    clearTimeout(settleTimer);
    if (!opened || drag || glideRaf || current < 0 || current === present) return;
    arrive(current);
  }
  function arrive(i) {
    const work = works[i], img = imgOf(work);
    present = i;
    frameOf(work).querySelectorAll('.leaving').forEach(layer => layer.remove());
    if (world.hides && world.arrive && !reduced.matches) work.classList.add('arriving');
    work.classList.add('present');
    if (!world.arrive || reduced.matches) return work.classList.remove('arriving');
    const run = () => {
      if (present !== i) return;
      const layer = make('div', `reveal ${museum.dataset.world}`, frameOf(work));
      const job = { work, img, layer, anims: [], timers: [], frame: 0, done: false };
      job.finish = () => {
        if (job.done) return;
        job.done = true;
        job.anims.forEach(a => a.cancel()); job.timers.forEach(clearTimeout); cancelAnimationFrame(job.frame);
        layer.remove(); work.classList.remove('arriving');
        if (active === job) active = null;
      };
      active?.finish();
      active = job; work.classList.add('arriving'); hideLoupe();
      job.timers.push(setTimeout(job.finish, world.arrive(job)));
    };
    if (ready(img)) run(); else img.decode().then(run, run);
  }
  function depart() {
    const work = works[present], arriving = active?.work === work;
    present = -1;
    work.classList.remove('present');
    if (arriving) active.finish();
    work.classList.remove('arriving');
    if (!arriving && !reduced.matches) world.depart?.(work);
  }

  // ── The loupe: a lens over the present work, magnifying where the pointer rests. ──
  const ZOOM = 2.4;
  const hideLoupe = () => museum.classList.remove('looking');
  function look(e) {
    const work = works[present], img = work && imgOf(work);
    if (e.pointerType !== 'mouse' || drag || !img || e.target !== img || work.classList.contains('arriving')) return hideLoupe();
    const r = img.getBoundingClientRect(), m = museum.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, half = loupe.offsetWidth / 2;
    Object.assign(loupe.style, {
      translate: `${Math.round(e.clientX - m.left)}px ${Math.round(e.clientY - m.top)}px`,
      backgroundImage: `url("${img.currentSrc || img.src}")`,
      backgroundSize: `${r.width * ZOOM}px ${r.height * ZOOM}px`,
      backgroundPosition: `${half - x * ZOOM}px ${half - y * ZOOM}px`
    });
    museum.classList.add('looking');
  }
  wall.addEventListener('pointermove', look);
  wall.addEventListener('pointerleave', hideLoupe);

  // ── Input. ──
  wall.addEventListener('scroll', () => { relight(); hideLoupe(); if (!glideRaf) settleSoon(); }, { passive: true });
  wall.addEventListener('scrollend', () => { if (!glideRaf) settle(); });
  const from = () => glideRaf ? aim : current;
  prev.addEventListener('click', () => go(from() - 1));
  next.addEventListener('click', () => go(from() + 1));
  // Clicking a work waiting at the side walks over to it.
  let dragged = false;
  works.forEach((work, i) => work.addEventListener('click', () => { if (!dragged && i !== current) go(i); }));
  addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const to = { ArrowRight: from() + 1, ArrowLeft: from() - 1, PageDown: from() + 1, PageUp: from() - 1, Home: 0, End: works.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault(); go(to);
  });
  // One work per turn of the wheel; sideways trackpad swipes scroll the row natively and settle on the nearest work.
  let wheelAt = 0, wheelSum = 0;
  addEventListener('wheel', e => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { stopGlide(); return; }
    e.preventDefault();
    const now = performance.now();
    if (now - wheelAt < 380) return;
    wheelSum += e.deltaY;
    if (Math.abs(wheelSum) < 40) return;
    go(from() + Math.sign(wheelSum)); wheelSum = 0; wheelAt = now;
  }, { passive: false });
  // A mouse drags the row like a sheet; letting go settles on the nearest work, or the next one after a flick.
  // (Touch scrolls the row natively.)
  wall.addEventListener('pointerdown', e => {
    dragged = false; stopGlide();
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, left: wall.scrollLeft, at: performance.now(), from: current, moved: false };
  });
  wall.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; wall.setPointerCapture(drag.id); wall.classList.add('dragging'); hideLoupe(); }
    if (drag.moved) wall.scrollLeft = drag.left - dx;
  });
  function release(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const { moved, x, at, from: start } = drag, dx = e.clientX - x;
    drag = null; dragged = moved;
    wall.classList.remove('dragging');
    if (!moved) return;
    const flick = Math.abs(dx) > 40 && performance.now() - at < 320;
    go(flick ? start - Math.sign(dx) : current);
  }
  wall.addEventListener('pointerup', release);
  wall.addEventListener('pointercancel', release);

  const relayout = () => { layout(); go(Math.max(0, current), false); walk(); };
  addEventListener('resize', relayout);
  document.fonts?.ready.then(relayout);
  layout(); go(0, false); walk();
  // The works come out once the first can be seen, waiting; then the first one arrives.
  const first = imgOf(works[0]);
  const open = () => {
    if (opened) return;
    opened = true;
    museum.classList.add('open');
    setTimeout(settle, reduced.matches ? 0 : 900);
  };
  if (!first || ready(first)) open(); else { first.addEventListener('load', open, { once: true }); first.addEventListener('error', open, { once: true }); setTimeout(open, 1500); }
})();
