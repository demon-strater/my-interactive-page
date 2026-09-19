/* Shared original graphics for the concept film and Wanderer above the fog. */
window.createWandererGraphics = function(ctx, readState) {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,f)=>a+(b-a)*f;
  const lerpColor=(a,b,f)=>a.map((v,i)=>lerp(v,b[i],f));
  const rgb=(c,a=1)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
  let width=1,height=1,elapsed=0,parallaxX=0,parallaxY=0,flowY=0,pointerVX=0,headLook=0,armX=0,armY=-1,lightning=0;
  let pointer={x:.5,y:.5,active:false},gust={v:0,sv:0},reduced={matches:false};
  let seed=1729;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function sync(){const s=readState();width=s.width;height=s.height;elapsed=s.elapsed||0;parallaxX=s.parallaxX||0;parallaxY=s.parallaxY||0;flowY=s.flowY||0;pointerVX=s.pointerVX||0;headLook=s.headLook||0;armX=s.armX||0;armY=s.armY??-1;lightning=s.lightning||0;pointer=s.pointer||{x:.5,y:.5,active:false};gust=s.gust||{v:0,sv:0};reduced=s.reduced||{matches:false};}
  const skyStops = [
    { top: [66, 92, 148], mid: [186, 165, 150], horizon: [255, 213, 158] },
    { top: [66, 80, 104], mid: [126, 134, 148], horizon: [172, 178, 188] },
    { top: [7, 9, 16], mid: [16, 20, 32], horizon: [34, 31, 40] }
  ];
  function sampleSky(t) {
    if (t <= .5) { const f = t / .5; return { top: lerpColor(skyStops[0].top, skyStops[1].top, f), mid: lerpColor(skyStops[0].mid, skyStops[1].mid, f), horizon: lerpColor(skyStops[0].horizon, skyStops[1].horizon, f) }; }
    const f = (t - .5) / .5; return { top: lerpColor(skyStops[1].top, skyStops[2].top, f), mid: lerpColor(skyStops[1].mid, skyStops[2].mid, f), horizon: lerpColor(skyStops[1].horizon, skyStops[2].horizon, f) };
  }
  function drawSky(sky) {
    const g = ctx.createLinearGradient(0, 0, 0, height * .8);
    g.addColorStop(0, rgb(sky.top)); g.addColorStop(.55, rgb(sky.mid)); g.addColorStop(1, rgb(sky.horizon));
    ctx.fillStyle = g; ctx.fillRect(0, 0, width, height * .82);
  }
  function drawStars(t) {
    const a = clamp((t - .55) * 2.2, 0, 1);
    if (a <= 0) return;
    for (let i = 0; i < 70; i++) {
      const x = (((Math.sin(i * 127.1 + 3) * 43758.5453) % 1) + 1) % 1 * width;
      const y = (((Math.sin(i * 311.7 + 8) * 19341.17) % 1) + 1) % 1 * height * .48;
      const tw = reduced.matches ? .75 : .5 + .5 * Math.sin(elapsed * 1.3 + i);
      ctx.globalAlpha = a * (.28 + tw * .5);
      ctx.fillStyle = '#eaf1ff'; ctx.beginPath(); ctx.arc(x, y, i % 7 === 0 ? 1.3 : .7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawOrb(t) {
    const x = width * .74 - parallaxX * 5, y = height * (.3 + t * .05) - parallaxY * 3;
    const core = t < .5 ? [255, 240, 205] : [214, 224, 255];
    const glowA = clamp(1 - t * 1.5, .12, 1);
    const r = width * .13;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, rgb(core, .85 * glowA)); grad.addColorStop(1, rgb(core, 0));
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgb(core, .8 * glowA); ctx.beginPath(); ctx.arc(x, y, width * .012, 0, Math.PI * 2); ctx.fill();
  }

  function ridgeY(xf, layer) {
    const freqs = [1.1, 2.3, 4.7, 8.1], amps = [.05, .026, .013, .007];
    let y = 0;
    for (let i = 0; i < 4; i++) y += Math.sin(xf * freqs[i] * Math.PI * 2 + layer * 11.3 + i * 3.7) * amps[i] * (1 + layer * .12);
    return y;
  }
  function drawMountains(t, sky) {
    const layers = 5;
    for (let L = 0; L < layers; L++) {
      const near = L / (layers - 1);                 // 0 = far ridge … 1 = near ridge
      const base = height * (.40 + L * .075);
      const sx = -parallaxX * (5 + near * 26), sy = -parallaxY * (2 + near * 12);
      ctx.beginPath(); ctx.moveTo(-14, height);
      const steps = 48;
      for (let i = -2; i <= steps + 2; i++) {
        const xf = i / steps;
        ctx.lineTo(xf * width + sx, base + sy + ridgeY(xf, L) * height * 1.4);
      }
      ctx.lineTo(width + 14, height); ctx.closePath();
      const farF = 1 - L / (layers - 1);
      const rockCool = [42, 50, 66], rockWarm = [92, 70, 54];
      const rockBase = lerpColor(rockCool, rockWarm, t < .4 ? (1 - t / .4) * .4 : 0);
      ctx.fillStyle = rgb(lerpColor(rockBase, sky.horizon, .16 + farF * .64 + t * .12));
      ctx.fill();
    }
  }

  const fogPuffs = [];
  let fogScroll = 0;
  (function buildFog() {
    for (let i = 0; i < 64; i++) {
      const row = i % 6;
      fogPuffs.push({ xf: (i * 0.6180339887) % 1, row, speed: .01 + row * .0045, size: .13 + random() * .07, wobble: random() * Math.PI * 2 });
    }
  })();
  function drawFog(t, sky, push, dt) {
    // A dense, overlapping bank of puffs — each one individually parted by the cursor — reads as a
    // continuous sea of cloud filling the valley, per the painting, rather than scattered wisps.
    const rows = 6, fogBaseY = height * .54, fogSpanY = height * .27;
    const ap = Math.abs(push || 0);
    // Integrate the drift so a rising wind speeds the fog up smoothly (never a jump),
    // and let a gust push the whole bank toward the cursor's side.
    const windSpeed = (.16 + t * .6) + (push || 0) * 9;
    fogScroll += (dt || 0) * windSpeed;
    const fogColor = lerpColor([240, 236, 224], [74, 91, 117], clamp((t-.3)/.7,0,1));
    for (const p of fogPuffs) {
      const rowFrac = p.row / rows;
      let y = fogBaseY + rowFrac * fogSpanY + (reduced.matches ? 0 : Math.sin(elapsed * .6 + p.wobble) * 6);
      let x = (((p.xf + fogScroll * p.speed) % 1.2) - .1) * width;
      x += -parallaxX * 24 * (.4 + rowFrac) + (push || 0) * width * .05 * (.4 + rowFrac);
      y += -parallaxY * 25 * (.3 + rowFrac) - ap * 16 * (.3 + rowFrac) + flowY * 35;
      const size = width * p.size * (.75 + rowFrac * .6) * (1 + ap * .28);
      let alpha = (.26 + t * .16 + rowFrac * .13) * (1 + ap * .16) * (1-t*.48);
      if (pointer.active) {
        const dx = x - pointer.x * width, dy = y - pointer.y * height;
        const dist = Math.hypot(dx, dy);
        const clear = clamp(1 - dist / (width * .3 + rowFrac * 80), 0, 1);
        if (clear > 0) { alpha *= 1 - clear * .92; x += (dx / (dist || 1)) * clear * 60; }
      }
      const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, rgb(fogColor, alpha)); grad.addColorStop(1, rgb(fogColor, 0));
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawForegroundLedge() {
    ctx.save();
    ctx.translate(-parallaxX * 14, -parallaxY * 5);
    ctx.beginPath();
    ctx.moveTo(-24, height + 26); ctx.lineTo(-24, height * .92);
    ctx.quadraticCurveTo(width * .22, height * .80, width * .36, height * .855);
    ctx.quadraticCurveTo(width * .445, height * .895, width * .5, height * .78);
    ctx.quadraticCurveTo(width * .555, height * .70, width * .62, height * .835);
    ctx.quadraticCurveTo(width * .76, height * .92, width, height * .87);
    ctx.lineTo(width + 24, height + 26); ctx.closePath();
    ctx.fillStyle = '#050508'; ctx.fill();
    ctx.restore();
  }
  // The original Rückenfigur silhouette: a simple back view — coat, two legs,
  // an oval head, a walking cane. The head turns gently to follow the cursor.
  // `walk` (0-1, cyclic) drives an actual stride and body bob; `armRest` (0-1) blends the
  // raised pointing arm down to his side, so the figure isn't frozen in one gesture throughout.
  function drawWanderer(wind, walk, armRest) {
    walk = walk || 0; armRest = clamp(armRest || 0, 0, 1);
    const fx = width * .535 - parallaxX * 10, ground = height * .735 - parallaxY * 4;
    const lean = clamp(gust.sv, -1, 1) * 3.6;                       // a nudge in the wind's direction
    const sway = (reduced.matches ? .3 : Math.sin(elapsed * 1.6)) * wind * 3 + lean;
    const strideA = reduced.matches ? 0 : Math.sin(walk * Math.PI * 2), strideB = reduced.matches ? 0 : Math.sin(walk * Math.PI * 2 + Math.PI);
    const bob = reduced.matches ? 0 : Math.abs(strideA) * 1.6;
    ctx.save(); ctx.translate(fx, ground);
    ctx.fillStyle = 'rgba(6,5,8,.97)';
    ctx.fillRect(-7 + strideA * 3, -2, 6, 24 - Math.max(0, strideA) * 4);
    ctx.fillRect(2 + strideB * 3, -2, 6, 24 - Math.max(0, strideB) * 4);
    ctx.translate(0, -2 - bob);
    ctx.beginPath();
    ctx.moveTo(-11, -44);
    ctx.quadraticCurveTo(-21 - sway, -8, -17 - sway * 1.4, 18);
    ctx.lineTo(17 + sway * 1.4, 18);
    ctx.quadraticCurveTo(21 + sway, -8, 11, -44);
    ctx.quadraticCurveTo(0, -50, -11, -44);
    ctx.closePath(); ctx.fill();

    // The pointing pose and a resting arm-at-side pose blend by armRest, instead of holding
    // one gesture from the first frame to the last.
    const ax = armX, ay = armY;
    const bx = -7, by = -42;                             // shoulder pivot
    const perpX = -ay, perpY = ax;                       // bow the elbow outward (to his left)
    const pElX = bx + ax * 12 - perpX * 2.5, pElY = by + ay * 12 - perpY * 2.5;
    const pWrX = pElX + ax * 11, pWrY = pElY + ay * 11;
    const pTpX = pWrX + ax * 6.5, pTpY = pWrY + ay * 6.5;
    const rElX = bx - 1, rElY = by + 19, rWrX = rElX - 1.4, rWrY = rElY + 15;
    const elX = lerp(pElX, rElX, armRest), elY = lerp(pElY, rElY, armRest);
    const wrX = lerp(pWrX, rWrX, armRest), wrY = lerp(pWrY, rWrY, armRest);
    ctx.strokeStyle = 'rgba(6,5,8,.97)'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 5.2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(elX, elY); ctx.stroke();   // upper arm / sleeve
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(elX, elY); ctx.lineTo(wrX, wrY); ctx.stroke(); // forearm
    if (armRest < .96) {
      ctx.globalAlpha = 1 - armRest;
      ctx.lineWidth = 2.3;
      ctx.beginPath(); ctx.moveTo(wrX, wrY); ctx.lineTo(pTpX, pTpY); ctx.stroke(); // pointing finger
      ctx.globalAlpha = 1;
    }
    ctx.beginPath(); ctx.arc(wrX, wrY, 2.7, 0, Math.PI * 2); ctx.fill();       // fist / hand

    const hx = headLook * 3.4, hy = -52 - Math.abs(headLook) * .7;
    ctx.beginPath(); ctx.ellipse(hx, hy, 7, 8, headLook * .12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(6,5,8,.92)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(13, -28); ctx.lineTo(23 + sway * .6 + strideB * 2, 22); ctx.stroke();
    ctx.restore();
  }

  const rainDrops = [];
  (function buildRain() {
    for (let i = 0; i < 240; i++) rainDrops.push({
      x: random(), y: random(),
      z: .45 + random() * .55,          // depth: near drops fall faster / longer / brighter
      speed: 0.9 + random() * 0.5
    });
  })();
  // A field of parallel drops all driven along one wind vector, wrapping on every
  // edge — so a gust looks like rain sweeping across toward the cursor, not popping.
  function drawRain(power, dt, windX) {
    if (power <= 0.001) return;
    const shown = Math.floor(rainDrops.length * clamp(power * 1.1, .06, 1));
    for (let pass = 0; pass < 2; pass++) {
      // pass 0: far, faint, thin.  pass 1: near, brighter.
      ctx.strokeStyle = `rgba(206,218,240,${(pass ? .34 : .16) * clamp(power * 1.3, 0, 1)})`;
      ctx.lineWidth = pass ? 1.3 : 1;
      ctx.beginPath();
      for (let i = pass; i < shown; i += 2) {
        const d = rainDrops[i];
        const local = Math.max(0, 1 - Math.hypot(d.x-pointer.x, d.y-pointer.y) / .48);
        const vx = (windX + pointerVX * 220 * local) * d.z;                       // px/s sideways
        const vy = (420 + d.z * 480) * d.speed + flowY * 210;       // px/s down
        if (dt) {
          d.x += (vx * dt) / width;
          d.y += (vy * dt) / height;
        }
        if (d.y > 1.04) { d.y -= 1.08; d.x = random(); }
        else if (d.y < -.04) d.y += 1.08;
        if (d.x > 1.05) d.x -= 1.1; else if (d.x < -.05) d.x += 1.1;
        const px = d.x * width, py = d.y * height;
        const m = Math.hypot(vx, vy) || 1;
        const len = (9 + d.z * 15) + Math.min(1, Math.abs(windX) / 260) * (8 + d.z * 26);
        ctx.moveTo(px, py);
        ctx.lineTo(px - (vx / m) * len, py - (vy / m) * len);
      }
      ctx.stroke();
    }
  }
  // Broad translucent sheets of rain drifting across in the wind's direction — the
  // large-scale "raging storm" gesture behind the individual drops.
  function drawRainSheets(power, windX) {
    if (power < .1) return;
    const dir = windX >= 0 ? 1 : -1;
    const slant = clamp(windX / 520, -1.1, 1.1) * height * .5;
    const n = 3;
    for (let i = 0; i < n; i++) {
      const cyc = ((elapsed * (.045 + power * .11) + i / n) % 1 + 1) % 1;
      const cx = (dir > 0 ? cyc * 1.6 - .3 : 1.3 - cyc * 1.6) * width;
      const w = width * (.42 + power * .34);
      const a = Math.sin(cyc * Math.PI) * .05 * power;
      if (a <= .001) continue;
      const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
      g.addColorStop(0, 'rgba(202,214,236,0)');
      g.addColorStop(.5, `rgba(202,214,236,${a})`);
      g.addColorStop(1, 'rgba(202,214,236,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2 + slant, -20);
      ctx.lineTo(cx + w / 2 + slant, -20);
      ctx.lineTo(cx + w / 2 - slant, height + 20);
      ctx.lineTo(cx - w / 2 - slant, height + 20);
      ctx.closePath(); ctx.fill();
    }
  }

  function drawVignette() {
    const boost = gust.v * .28;
    const g = ctx.createRadialGradient(width / 2, height * .55, height * .2, width / 2, height * .55, height * .88);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.4 + boost})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
  }
  function drawLightning() {
    if (lightning <= 0) return;
    // A branching strike gives the flash a source within the landscape.
    ctx.save(); ctx.strokeStyle = 'rgba(226,238,255,' + Math.min(1,lightning) + ')';
    ctx.lineWidth = 2; ctx.shadowColor = '#b4d4ff'; ctx.shadowBlur = 22;
    const bx = width*.72; ctx.beginPath(); ctx.moveTo(bx,-10);
    ctx.lineTo(bx-32,height*.14); ctx.lineTo(bx+12,height*.19);
    ctx.lineTo(bx-65,height*.34); ctx.lineTo(bx-40,height*.29); ctx.lineTo(bx-100,height*.47);
    ctx.moveTo(bx-32,height*.14); ctx.lineTo(bx-100,height*.22); ctx.lineTo(bx-120,height*.31); ctx.stroke(); ctx.restore();
    ctx.fillStyle = `rgba(225,232,255,${lightning * .5})`;
    ctx.fillRect(0, 0, width, height);
  }
  // A couple of distant wingbeats against the sky — a small, independent moving event rather
  // than a parameter of the landscape itself, for scale and for a sign of life beyond the figure.
  function drawBirds(t, count) {
    if (!count) return;
    ctx.save(); ctx.strokeStyle = 'rgba(10,9,14,.55)'; ctx.lineWidth = Math.max(1, width / 900);
    for (let i = 0; i < count; i++) {
      const speed = .035 + i * .009, x = ((t * speed + i * .41) % 1.3 - .15) * width;
      const y = height * (.16 + i * .035) + Math.sin(t * .5 + i) * height * .012;
      const s = width * .009;
      ctx.beginPath();
      ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * .3, y - s * .65, x, y);
      ctx.quadraticCurveTo(x + s * .3, y - s * .65, x + s, y);
      ctx.stroke();
    }
    ctx.restore();
  }


return {
sampleSky(...args){sync();return sampleSky(...args);},
drawSky(...args){sync();return drawSky(...args);},
drawStars(...args){sync();return drawStars(...args);},
drawOrb(...args){sync();return drawOrb(...args);},
drawMountains(...args){sync();return drawMountains(...args);},
drawFog(...args){sync();return drawFog(...args);},
drawForegroundLedge(...args){sync();return drawForegroundLedge(...args);},
drawWanderer(...args){sync();return drawWanderer(...args);},
drawRainSheets(...args){sync();return drawRainSheets(...args);},
drawRain(...args){sync();return drawRain(...args);},
drawVignette(...args){sync();return drawVignette(...args);},
drawLightning(...args){sync();return drawLightning(...args);},
drawBirds(...args){sync();return drawBirds(...args);}
};
};
