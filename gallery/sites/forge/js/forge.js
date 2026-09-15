/* ============================================================
   BLACKWATER FORGE — the live fire.
   One temperature model drives everything you see:
   - a 10-segment billet with Newton cooling + conduction,
     rendered through a blackbody colour ramp
   - hold the bellows and the bar slides back into the fire to
     take a heat; release and it returns to the anvil
   - sparks with gravity, bounce and their own cooling curves;
     spark count is honest — cold bars don't spark
   - a perlin-breathing fire whose light level is written to
     the CSS var --fl, so the whole hero flickers with it.
   No libraries. Canvas 2D.
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('forge');
  const hero = canvas ? canvas.closest('.hero') : null;
  let ctx = null;
  try { ctx = canvas.getContext('2d', { alpha: true }); } catch (e) { /* fall through */ }
  if (!canvas || !ctx || !hero) { document.body.classList.add('no-canvas'); return; }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);
  const tempVal = $('tempVal'), tempBand = $('tempBand'), gaugeMark = $('gaugeMark');
  const stripLive = $('stripLive'), stripTemp = $('stripTemp'), toastEl = $('toast');
  const strikeBtn = $('strikeBtn'), bellowsBtn = $('bellowsBtn');
  const heroInner = hero.querySelector('.hero-inner');
  const stripTicks = [];
  document.querySelectorAll('.strip-bar .tick').forEach((n) => {
    const b = n.querySelector('b');
    const T = b ? parseInt(b.textContent, 10) : NaN;
    if (!isNaN(T)) stripTicks.push([T, n]);
  });

  /* ---------- blackbody ramp: °C → colour ---------- */
  const STOPS = [
    [480, 0x1A, 0x0C, 0x06], [580, 0x4A, 0x12, 0x0A], [680, 0x7A, 0x1A, 0x06],
    [780, 0xB0, 0x32, 0x08], [860, 0xD8, 0x4A, 0x10], [940, 0xF0, 0x65, 0x11],
    [1020, 0xFB, 0x8B, 0x1E], [1110, 0xFF, 0xB4, 0x3A], [1200, 0xFF, 0xD9, 0x78],
    [1280, 0xFF, 0xF3, 0xC8], [1350, 0xFF, 0xFD, 0xF4]
  ];
  const COLD = [0x16, 0x12, 0x0F]; // bar steel below visible glow
  function heatRGB(T) {
    if (T <= 480) {
      const t = Math.max(0, (T - 280) / 200);
      return [COLD[0] + (STOPS[0][1] - COLD[0]) * t, COLD[1] + (STOPS[0][2] - COLD[1]) * t, COLD[2] + (STOPS[0][3] - COLD[2]) * t];
    }
    if (T >= 1350) return [255, 253, 244];
    let i = 0;
    while (STOPS[i + 1][0] < T) i++;
    const a = STOPS[i], b = STOPS[i + 1], t = (T - a[0]) / (b[0] - a[0]);
    return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
  }
  function heatColor(T, alpha) {
    const c = heatRGB(T);
    return alpha === undefined
      ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
      : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
  }

  /* ---------- value noise (perlin-style fBm, 1D) ---------- */
  function hash(n) { const s = Math.sin(n) * 43758.5453123; return s - Math.floor(s); }
  function vnoise(x) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return hash(i) * (1 - u) + hash(i + 1) * u;
  }
  function fbm(x) { return 0.55 * vnoise(x) + 0.3 * vnoise(x * 2.13 + 7.7) + 0.15 * vnoise(x * 4.31 + 19.1); }

  /* ---------- state ---------- */
  const NSEG = 10;
  const AMBIENT = 25, BELLOWS_MAX = 1340, COOL_A = 0.008; // per second
  const temps = new Array(NSEG);
  for (let i = 0; i < NSEG; i++) temps[i] = 1285 - Math.pow(i / (NSEG - 1), 1.5) * 1150;

  const sparks = [];   // {x,y,px,py,vx,vy,T}
  const embers = [];   // {x,y,vx,vy,T,ph}
  const rings = [];    // impact shockwaves {x,y,r,a}
  let flare = 0, bellowsOn = false, autoPump = false, lastPumpEnd = -1e9;
  let slide = 0;       // 0 = on the anvil, 1 = in the fire
  let flash = 0, burnAcc = 0;
  let hammer = null;   // {t,struck}
  let displayT = 20;   // HUD chase value
  let W = 0, H = 0, dpr = 1, mobile = false;
  let G = {};          // geometry, rebuilt on resize
  let running = false, inView = true, pageVisible = !document.hidden;
  let lastFrame = 0, pausedAt = 0, hudTimer = 0;
  let coldToastShown = false, fireToastShown = false;

  /* ---------- geometry ---------- */
  function resize() {
    const r = hero.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mobile = W < 760;

    const u = mobile ? Math.min(Math.max(W * 0.15, 50), 80) : Math.min(Math.max(W * 0.105, 96), 175);
    const fx = mobile ? W * 0.30 : W * 0.46;
    const potY = mobile ? H * 0.62 : H * 0.70;
    const ax = mobile ? W * 0.68 : W * 0.76;
    const faceY = mobile ? H * 0.655 : H * 0.72;
    const floorY = mobile ? H * 0.74 : H * 0.91;
    const th = Math.max(7, u * 0.085);
    const LB = u * 2.05; // bar length
    const tipRest = { x: ax - u * 0.38, y: faceY - th * 0.5 };
    const endRest = { x: tipRest.x + LB, y: tipRest.y };
    const tipFire = { x: fx + W * 0.004, y: potY - 2 };
    const endFire = { x: tipFire.x + LB * 0.92, y: tipFire.y - LB * 0.39 };
    G = { u, fx, potY, ax, faceY, floorY, th, LB, tipRest, endRest, tipFire, endFire,
      strikeT: (ax + u * 0.02 - tipRest.x) / LB,
      pivot: { x: ax + u * 0.92, y: faceY - u * 1.5 } };
    if (reduced) renderStill();
  }

  function ease(s) { return s * s * (3 - 2 * s); }
  function barEnds() {
    const e = ease(slide);
    return {
      tip: { x: G.tipRest.x + (G.tipFire.x - G.tipRest.x) * e, y: G.tipRest.y + (G.tipFire.y - G.tipRest.y) * e },
      end: { x: G.endRest.x + (G.endFire.x - G.endRest.x) * e, y: G.endRest.y + (G.endFire.y - G.endRest.y) * e }
    };
  }
  function barPt(ends, t) {
    return { x: ends.tip.x + (ends.end.x - ends.tip.x) * t, y: ends.tip.y + (ends.end.y - ends.tip.y) * t };
  }

  /* ---------- physics ---------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function update(dt, t) {
    // Newton cooling — a yellow bar visibly dies inside two minutes
    for (let i = 0; i < NSEG; i++) temps[i] -= COOL_A * (temps[i] - AMBIENT) * dt;
    // conduction along the bar — steel is a mediocre conductor; the tip keeps its heat
    for (let i = 0; i < NSEG; i++) {
      const a = temps[Math.max(0, i - 1)], b = temps[Math.min(NSEG - 1, i + 1)];
      temps[i] += 0.055 * dt * (a + b - 2 * temps[i]);
    }

    // the apprentice keeps the shop honest: a dead-black bar gets a heat
    if (!bellowsOn && !autoPump && temps[0] < 570 && t - lastPumpEnd > 22) {
      autoPump = true;
      toast('The apprentice pumps the bellows.');
    }
    if (autoPump && temps[0] > 1180) { autoPump = false; lastPumpEnd = t; }

    const pumping = bellowsOn || autoPump;
    slide += ((pumping ? 1 : 0) - slide) * Math.min(1, dt * 2.4);
    flare += ((pumping ? 1 : 0) - flare) * Math.min(1, dt * 3.0);
    flash *= Math.exp(-6 * dt);

    // in the fire, the tip takes its heat
    if (slide > 0.5) {
      const k = (slide - 0.5) * 2;
      temps[0] += (BELLOWS_MAX - temps[0]) * (pumping ? 1.15 : 0.25) * k * dt;
      temps[1] += (BELLOWS_MAX - 70 - temps[1]) * (pumping ? 0.6 : 0.15) * k * dt;
      temps[2] += (BELLOWS_MAX - 160 - temps[2]) * (pumping ? 0.3 : 0.08) * k * dt;
    }

    // burning steel spits sparks on its own
    const ends = barEnds();
    if (temps[0] > 1300) {
      burnAcc += dt * 16;
      while (burnAcc > 1) {
        burnAcc -= 1;
        spawnSpark(ends.tip.x + rnd(-6, 6), ends.tip.y + rnd(-8, 2), rnd(-80, 160), rnd(-300, -80), temps[0] + 130);
      }
    } else burnAcc = 0;

    // hammer swing
    if (hammer) {
      hammer.t += dt / 0.26;
      if (!hammer.struck && hammer.t >= 0.42) { hammer.struck = true; impact(); }
      if (hammer.t >= 1) hammer = null;
    }

    // embers rising from the coals
    if (Math.random() < dt * (5 + flare * 24)) {
      embers.push({ x: G.fx + rnd(-W * 0.028, W * 0.028), y: G.potY + rnd(-4, 4),
        vx: rnd(-14, 14), vy: -rnd(40, 130) * (1 + flare), T: rnd(950, 1250), ph: Math.random() * 100 });
    }
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.x += (e.vx + (vnoise(e.ph + t * 1.4) - 0.5) * 60) * dt;
      e.y += e.vy * dt;
      e.T += (200 - e.T) * 0.5 * dt;
      if (e.T < 560 || e.y < H * 0.15) embers.splice(i, 1);
    }

    // impact shockwave rings
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.r += r.v * dt;
      r.a -= dt * 2.6;
      if (r.a <= 0) rings.splice(i, 1);
    }

    // sparks: gravity, drag, bounce off the anvil face and the floor
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.px = s.x; s.py = s.y;
      s.vx *= (1 - 0.55 * dt);
      s.vy += 1500 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const onAnvil = s.x > G.ax - G.u * 0.42 && s.x < G.ax + G.u * 0.38;
      if (onAnvil && s.py <= G.faceY && s.y > G.faceY && s.vy > 0) {
        s.y = G.faceY; s.vy *= -0.42; s.vx *= 0.8;
      } else if (s.y > G.floorY && s.vy > 0) {
        s.y = G.floorY; s.vy *= -0.36; s.vx *= 0.55; s.g = true;
      }
      // grounded scale cools slowly, dying dull red on the floor
      s.T += ((s.g ? 150 : 180) - s.T) * (s.g ? 0.55 : 1.5) * dt;
      if (s.T < (s.g ? 475 : 545)) sparks.splice(i, 1);
    }
  }

  function spawnSpark(x, y, vx, vy, T) {
    if (sparks.length > 420) sparks.shift();
    sparks.push({ x, y, px: x, py: y, vx, vy, T: Math.min(T, 1500) });
  }

  function impact() {
    if (slide > 0.25) {
      if (!fireToastShown) { toast('The bar is in the fire — let go of the bellows first.'); fireToastShown = true; }
      return;
    }
    const seg = Math.max(0, Math.min(NSEG - 1, Math.round(G.strikeT * (NSEG - 1))));
    const Ts = temps[seg];
    flash = Math.min(1, flash + 0.55);
    if (Ts < 650) {
      if (!coldToastShown) { toast('The bar rings cold — nothing moves. Hold the bellows.'); coldToastShown = true; }
      else toast('Still cold. Colour first, then the hammer.');
      return;
    }
    temps[seg] = Math.max(AMBIENT, temps[seg] - 7);
    const n = Math.round(Math.pow((Ts - 650) / 700, 1.3) * (mobile ? 46 : 88) * rnd(0.75, 1.25)) + 4;
    const ends = barEnds();
    const sp = barPt(ends, G.strikeT);
    rings.push({ x: sp.x, y: sp.y, r: 5, v: mobile ? 380 : 520, a: 0.55 });
    if (heroInner) { // the whole hero takes the blow
      heroInner.classList.remove('jolt');
      void heroInner.offsetWidth;
      heroInner.classList.add('jolt');
    }
    for (let i = 0; i < n; i++) {
      const ang = rnd(-Math.PI * 0.95, -Math.PI * 0.05);
      const spd = rnd(120, mobile ? 430 : 570) * (0.6 + 0.4 * Math.abs(Math.sin(ang)));
      spawnSpark(sp.x + rnd(-7, 7), sp.y + rnd(-3, 1),
        Math.cos(ang) * spd + rnd(-40, 40), Math.sin(ang) * spd, Ts + rnd(80, 220));
    }
  }

  function strike() {
    if (reduced) { impactReduced(); return; }
    if (!hammer || hammer.t > 0.7) hammer = { t: 0, struck: false };
  }

  /* ---------- drawing ---------- */
  function drawFrame(L, t) {
    ctx.clearRect(0, 0, W, H);
    const { u, fx, potY, ax, faceY, floorY, th } = G;
    const ends = barEnds();

    // floor
    ctx.fillStyle = '#070605';
    ctx.fillRect(0, floorY, W, H - floorY);

    // ambient glow from the fire (breathes)
    ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createRadialGradient(fx, potY, 10, fx, potY, W * (mobile ? 0.46 : 0.25) * (0.85 + 0.5 * flare));
    g.addColorStop(0, `rgba(255,140,50,${0.20 * L + 0.16 * flare})`);
    g.addColorStop(1, 'rgba(255,140,50,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // light pool on the floor
    g = ctx.createRadialGradient((fx + ax) / 2, floorY, 10, (fx + ax) / 2, floorY, W * 0.3);
    g.addColorStop(0, `rgba(255,122,41,${0.05 + 0.09 * L})`);
    g.addColorStop(1, 'rgba(255,122,41,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, floorY - 30, W, H - floorY + 30);
    ctx.globalCompositeOperation = 'source-over';

    // hearth block — firelit masonry
    const hw = mobile ? W * 0.18 : W * 0.125;
    let hg2 = ctx.createLinearGradient(0, potY, 0, floorY);
    hg2.addColorStop(0, `rgb(${26 + 26 * L | 0},${18 + 14 * L | 0},${12 + 8 * L | 0})`);
    hg2.addColorStop(1, '#0B0908');
    ctx.fillStyle = hg2;
    ctx.fillRect(fx - hw, potY + 6, hw * 2, floorY - potY - 6);
    // brick coursing, faint
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    for (let by = potY + 26; by < floorY - 8; by += 22) {
      ctx.beginPath(); ctx.moveTo(fx - hw, by); ctx.lineTo(fx + hw, by); ctx.stroke();
    }
    // table lip
    ctx.fillStyle = '#0A0807';
    ctx.fillRect(fx - hw - 8, potY - 2, hw * 2 + 16, 10);
    ctx.fillStyle = `rgba(255,122,41,${0.14 + 0.28 * L})`;
    ctx.fillRect(fx - hw - 8, potY - 2, hw * 2 + 16, 1.5);

    // coal bed
    ctx.globalCompositeOperation = 'lighter';
    g = ctx.createRadialGradient(fx, potY, 2, fx, potY, W * 0.07 * (1 + 0.5 * flare));
    g.addColorStop(0, `rgba(255,217,120,${0.75 + 0.2 * flare})`);
    g.addColorStop(0.45, 'rgba(240,101,17,0.6)');
    g.addColorStop(1, 'rgba(122,26,6,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(fx, potY, W * 0.07 * (1 + 0.4 * flare), 13 + 6 * flare, 0, 0, 7); ctx.fill();

    // flames — perlin lobes, three nested tongues each
    const NF = 6;
    for (let k = 0; k < NF; k++) {
      const nx = vnoise(k * 13.7 + t * 2.1);
      const hgt = Math.min((mobile ? 0.17 : 0.30) * H, (0.10 + 0.17 * nx) * H * (0.55 + 0.5 * L + 0.85 * flare));
      const bx = fx + (k - (NF - 1) / 2) * (mobile ? W * 0.030 : W * 0.019);
      // sway capped against lobe height so the outline can never fold on itself
      const sway = (vnoise(k * 31.3 + t * 1.15) - 0.5) * Math.min(W * 0.05, hgt * 0.5);
      const wd = (mobile ? 13 : 19) * (0.7 + 0.6 * vnoise(k * 7.1 + t * 3.1));
      const cols = [`rgba(176,50,8,${0.34 + 0.2 * flare})`, `rgba(240,101,17,${0.4 + 0.25 * flare})`, `rgba(255,217,120,${0.5 + 0.3 * flare})`];
      const scl = [1, 0.62, 0.34];
      for (let m = 0; m < 3; m++) {
        const hh = hgt * scl[m] * (0.8 + 0.35 * vnoise(k * 3 + m * 11 + t * 4.2));
        const ww = wd * (1 - m * 0.26);
        ctx.fillStyle = cols[m];
        ctx.beginPath();
        ctx.moveTo(bx - ww, potY + 4);
        ctx.bezierCurveTo(bx - ww * 1.2, potY - hh * 0.48, bx + sway * 0.4 - ww * 0.5, potY - hh * 0.88, bx + sway, potY - hh);
        ctx.bezierCurveTo(bx + sway * 0.45 + ww * 0.5, potY - hh * 0.84, bx + ww * 1.2, potY - hh * 0.44, bx + ww, potY + 4);
        ctx.closePath(); ctx.fill();
      }
    }

    // embers
    for (const e of embers) {
      ctx.fillStyle = heatColor(e.T, Math.min(1, (e.T - 520) / 500));
      ctx.fillRect(e.x, e.y, 2, 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    // shadow pooling under the anvil
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.ellipse(ax, floorY + 4, u * 0.9, 7, 0, 0, 7); ctx.fill();

    // anvil stump — a broad oak block, firelit on the hearth side
    let sg = ctx.createLinearGradient(ax - u * 0.52, 0, ax + u * 0.52, 0);
    sg.addColorStop(0, `rgb(${30 + 30 * L | 0},${20 + 16 * L | 0},${13 + 9 * L | 0})`);
    sg.addColorStop(0.55, '#0E0B09');
    sg.addColorStop(1, '#0A0807');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(ax - u * 0.48, faceY + u * 0.85);
    ctx.lineTo(ax + u * 0.48, faceY + u * 0.85);
    ctx.lineTo(ax + u * 0.54, floorY);
    ctx.lineTo(ax - u * 0.54, floorY);
    ctx.closePath(); ctx.fill();

    // anvil — London pattern: deep face block, stepped horn, waist, flared foot
    let ag = ctx.createLinearGradient(ax - u * 0.88, 0, ax + u * 0.40, 0);
    ag.addColorStop(0, `rgb(${42 + 48 * L | 0},${26 + 24 * L | 0},${17 + 12 * L | 0})`);
    ag.addColorStop(0.45, `rgb(${20 + 18 * L | 0},${15 + 10 * L | 0},${11 + 5 * L | 0})`);
    ag.addColorStop(1, '#0B0908');
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.moveTo(ax - u * 0.34, faceY);                                   // face, left corner
    ctx.lineTo(ax + u * 0.40, faceY);
    ctx.lineTo(ax + u * 0.40, faceY + u * 0.30);                        // heel — deep block
    ctx.lineTo(ax + u * 0.26, faceY + u * 0.36);
    ctx.lineTo(ax + u * 0.19, faceY + u * 0.58);                        // waist
    ctx.lineTo(ax + u * 0.34, faceY + u * 0.70);                        // foot flare
    ctx.lineTo(ax + u * 0.34, faceY + u * 0.85);
    ctx.lineTo(ax - u * 0.34, faceY + u * 0.85);
    ctx.lineTo(ax - u * 0.34, faceY + u * 0.70);
    ctx.lineTo(ax - u * 0.19, faceY + u * 0.58);
    ctx.lineTo(ax - u * 0.26, faceY + u * 0.36);
    ctx.lineTo(ax - u * 0.34, faceY + u * 0.30);                        // under the horn step
    ctx.lineTo(ax - u * 0.34, faceY + u * 0.10);                        // step where horn leaves the body
    ctx.quadraticCurveTo(ax - u * 0.58, faceY + u * 0.30, ax - u * 0.88, faceY + u * 0.17); // horn underside
    ctx.quadraticCurveTo(ax - u * 0.60, faceY + u * 0.05, ax - u * 0.34, faceY + u * 0.06); // horn top, below face level
    ctx.closePath(); ctx.fill();
    // firelit rim: the face only, plus a whisper on the horn
    ctx.strokeStyle = `rgba(255,122,41,${0.20 + 0.38 * L})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ax - u * 0.34, faceY); ctx.lineTo(ax + u * 0.40, faceY); ctx.stroke();
    ctx.strokeStyle = `rgba(255,150,70,${0.06 + 0.14 * L})`;
    ctx.beginPath();
    ctx.moveTo(ax - u * 0.88, faceY + u * 0.17);
    ctx.quadraticCurveTo(ax - u * 0.60, faceY + u * 0.05, ax - u * 0.34, faceY + u * 0.06);
    ctx.stroke();

    // billet — one continuous blackbody gradient, sampled at every segment's own °C.
    // Heat is continuous along real steel; ten flat chips would be a lie.
    ctx.lineCap = 'butt';
    const bar = ctx.createLinearGradient(ends.tip.x, ends.tip.y, ends.end.x, ends.end.y);
    bar.addColorStop(0, heatColor(temps[0]));
    for (let i = 0; i < NSEG; i++) bar.addColorStop((i + 0.5) / NSEG, heatColor(temps[i]));
    bar.addColorStop(1, heatColor(temps[NSEG - 1]));
    ctx.strokeStyle = bar;
    ctx.lineWidth = th;
    ctx.beginPath(); ctx.moveTo(ends.tip.x, ends.tip.y); ctx.lineTo(ends.end.x, ends.end.y); ctx.stroke();
    // cold-end specular line
    ctx.strokeStyle = 'rgba(140,160,172,0.14)';
    ctx.lineWidth = 1;
    const c0 = barPt(ends, 0.55), c1 = barPt(ends, 1);
    ctx.beginPath(); ctx.moveTo(c0.x, c0.y - th * 0.32); ctx.lineTo(c1.x, c1.y - th * 0.32); ctx.stroke();
    // glow around hot segments
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < NSEG; i++) {
      if (temps[i] < 640) continue;
      const m = barPt(ends, (i + 0.5) / NSEG);
      const k = Math.min(1, (temps[i] - 600) / 550);
      g = ctx.createRadialGradient(m.x, m.y, 1, m.x, m.y, th * 4.4 * k + 4);
      g.addColorStop(0, heatColor(temps[i], 0.16 * k + 0.05));
      g.addColorStop(1, heatColor(temps[i], 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(m.x, m.y, th * 4.4 * k + 4, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // tongs gripping the cold end
    const te = barPt(ends, 1), td = barPt(ends, 0.93);
    ctx.strokeStyle = '#0A0807'; ctx.lineWidth = th * 0.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(td.x, td.y - th * 0.7); ctx.lineTo(te.x + 6, te.y - th * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(td.x, td.y + th * 0.7); ctx.lineTo(te.x + 6, te.y + th * 0.2); ctx.stroke();
    ctx.lineWidth = th * 0.42;
    ctx.beginPath(); ctx.moveTo(te.x + 4, te.y); ctx.lineTo(te.x + u * 1.1, te.y + u * 1.7); ctx.stroke();
    ctx.lineCap = 'butt';

    // hammer
    if (hammer) {
      const ph = hammer.t;
      let ang;
      if (ph < 0.42) ang = -1.25 + (ph / 0.42) * 1.28;
      else if (ph < 0.6) ang = 0.03 - ((ph - 0.42) / 0.18) * 0.55;
      else ang = -0.52 + ((ph - 0.6) / 0.4) * 0.07;
      const pv = G.pivot, hl = u * 1.35;
      const hx = pv.x - Math.cos(ang) * hl, hy = pv.y + u * 1.30 + Math.sin(ang) * hl * 1.15;
      const phi = Math.atan2(hy - pv.y, hx - pv.x); // handle direction
      ctx.strokeStyle = '#0C0A08'; ctx.lineWidth = Math.max(5, u * 0.05); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pv.x, pv.y); ctx.lineTo(hx, hy); ctx.stroke();
      // cross-peen head, set square across the handle
      ctx.save();
      ctx.translate(hx, hy); ctx.rotate(phi + Math.PI / 2);
      ctx.fillStyle = '#0B0908';
      ctx.beginPath();
      ctx.moveTo(-u * 0.13, -u * 0.16);          // flat face side
      ctx.lineTo(u * 0.13, -u * 0.16);
      ctx.lineTo(u * 0.10, u * 0.13);            // taper to the peen
      ctx.lineTo(u * 0.04, u * 0.24);
      ctx.lineTo(-u * 0.04, u * 0.24);
      ctx.lineTo(-u * 0.10, u * 0.13);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(255,140,60,${0.12 + 0.28 * L})`;
      ctx.fillRect(-u * 0.13, -u * 0.16, u * 0.045, u * 0.29);
      ctx.restore();
      ctx.lineCap = 'butt';
    }

    // sparks — additive streaks, each colour-true to its own temperature
    ctx.globalCompositeOperation = 'lighter';
    for (const s of sparks) {
      const a = Math.max(0, Math.min(1, (s.T - (s.g ? 460 : 520)) / 650));
      if (s.g && Math.abs(s.vx) < 30) { // scale at rest on the floor
        ctx.fillStyle = heatColor(s.T, a);
        ctx.fillRect(s.x - 1, s.y - 1, 2.4, 2);
        continue;
      }
      ctx.strokeStyle = heatColor(s.T, a);
      ctx.lineWidth = s.T > 1100 ? 2.4 : s.T > 850 ? 1.7 : 1.1;
      ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(s.x, s.y); ctx.stroke();
    }
    // impact shockwave rings — the blow you can see travel
    for (const r of rings) {
      ctx.strokeStyle = `rgba(255,217,120,${Math.max(0, r.a)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke();
    }
    // strike flash
    if (flash > 0.02) {
      const sp = barPt(ends, G.strikeT);
      g = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, 90);
      g.addColorStop(0, `rgba(255,230,170,${0.5 * flash})`);
      g.addColorStop(1, 'rgba(255,180,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 90, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // soft vignette so the scene sinks into the page
    g = ctx.createRadialGradient(W * 0.55, H * 0.55, H * 0.35, W * 0.55, H * 0.62, H * 0.95);
    g.addColorStop(0, 'rgba(6,5,4,0)');
    g.addColorStop(1, 'rgba(6,5,4,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* ---------- HUD ---------- */
  const BANDS = [
    [1300, 'burning · pull it out'],
    [1150, 'yellow · forging heat'],
    [950, 'orange · draw it out'],
    [800, 'cherry · finish work'],
    [650, 'dull red · last blows'],
    [520, 'black-red · too cold to move'],
    [-999, 'black heat · into the fire']
  ];
  function fmt(n) {
    n = Math.round(n);
    return n >= 1000 ? `${Math.floor(n / 1000)} ${String(n % 1000).padStart(3, '0')}` : String(n);
  }
  function updateHUD() {
    if (tempVal) tempVal.textContent = fmt(displayT);
    if (tempBand) {
      for (const [lim, name] of BANDS) { if (displayT >= lim) { tempBand.textContent = name; break; } }
      tempBand.style.color = displayT >= 1300 ? '#FF7A29' : '';
    }
    const p = Math.max(0, Math.min(1, (displayT - 480) / 870)) * 100;
    if (gaugeMark) gaugeMark.style.left = p + '%';
    if (stripLive) stripLive.style.left = Math.max(4, Math.min(96, p)) + '%';
    if (stripTemp) stripTemp.textContent = fmt(displayT) + ' °';
    // the strip's ticks ignite as the live bar passes their temperature
    for (const [T, n] of stripTicks) n.classList.toggle('past', displayT >= T);
  }

  let toastTimer = 0;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
  }

  /* ---------- main loop ---------- */
  function frame(now) {
    if (!running) return;
    const t = now / 1000;
    const dt = Math.min(0.05, (now - lastFrame) / 1000 || 0.016);
    lastFrame = now;

    update(dt, t);

    const B = fbm(t * 1.65);
    const L = Math.max(0, Math.min(1, 0.32 + 0.42 * B + 0.34 * flare + flash * 0.5));
    root.style.setProperty('--fl', L.toFixed(3));

    drawFrame(L, t);

    displayT += (temps[0] - displayT) * Math.min(1, dt * 3.2);
    hudTimer -= dt;
    if (hudTimer <= 0) { hudTimer = 0.12; updateHUD(); }

    requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduced) return;
    if (!inView || !pageVisible) return;
    if (pausedAt) {
      const away = Math.min(7200, (performance.now() - pausedAt) / 1000);
      if (away > 2) {
        const before = temps[0];
        for (let i = 0; i < NSEG; i++) {
          temps[i] = AMBIENT + (temps[i] - AMBIENT) * Math.exp(-COOL_A * away);
        }
        if (before - temps[0] > 150) toast('It cooled while you were away. Steel keeps its own time.');
      }
      pausedAt = 0;
    }
    running = true;
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() {
    if (!running) return;
    running = false;
    pausedAt = performance.now();
  }

  /* ---------- reduced-motion path: one honest still frame ---------- */
  function renderStill() { drawFrame(0.55, 1.7); }
  function impactReduced() {
    const seg = Math.max(0, Math.min(NSEG - 1, Math.round(G.strikeT * (NSEG - 1))));
    if (temps[seg] >= 650) temps[seg] -= 7; else toast('The bar rings cold — pump the bellows.');
    displayT = temps[0];
    renderStill(); updateHUD();
  }

  /* ---------- input ---------- */
  let holdTimer = 0;
  function beginHold(el) {
    strike();
    clearInterval(holdTimer);
    holdTimer = setInterval(() => strike(), 355 + Math.random() * 40);
    if (el) el.classList.add('held');
  }
  function endHold(el) {
    clearInterval(holdTimer); holdTimer = 0;
    if (el) el.classList.remove('held');
  }

  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); beginHold(null); });
  addEventListener('pointerup', () => { endHold(strikeBtn); endBellows(); });
  // a cancelled touch (scroll takeover, palm rejection) must release the hammer and the bellows too
  addEventListener('pointercancel', () => { endHold(strikeBtn); endBellows(); });
  canvas.addEventListener('pointerleave', () => endHold(null));

  if (strikeBtn) {
    strikeBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); beginHold(strikeBtn); });
    strikeBtn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); strike(); } });
    strikeBtn.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); });
    // assistive tech fires a bare click (detail 0, no pointer/key events) — it must land a blow too
    strikeBtn.addEventListener('click', (e) => { if (e.detail === 0) strike(); });
  }

  let bellowsKeyTimer = 0;
  function startBellows() { bellowsOn = true; if (bellowsBtn) bellowsBtn.classList.add('held'); }
  function endBellows() {
    if (bellowsOn) lastPumpEnd = performance.now() / 1000;
    bellowsOn = false;
    if (bellowsBtn) bellowsBtn.classList.remove('held');
  }
  if (bellowsBtn) {
    bellowsBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); startBellows(); });
    bellowsBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (reduced) { temps[0] = Math.min(BELLOWS_MAX, temps[0] + 70); displayT = temps[0]; renderStill(); updateHUD(); return; }
        startBellows();
        clearTimeout(bellowsKeyTimer);
        bellowsKeyTimer = setTimeout(endBellows, 380);
      }
    });
    bellowsBtn.addEventListener('keyup', endBellows);
    // assistive-tech click: one honest pump
    bellowsBtn.addEventListener('click', (e) => {
      if (e.detail !== 0) return;
      if (reduced) { temps[0] = Math.min(BELLOWS_MAX, temps[0] + 70); displayT = temps[0]; renderStill(); updateHUD(); return; }
      startBellows();
      clearTimeout(bellowsKeyTimer);
      bellowsKeyTimer = setTimeout(endBellows, 420);
    });
  }
  addEventListener('blur', () => { endHold(strikeBtn); endBellows(); });

  /* ---------- lifecycle ---------- */
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    pageVisible = !document.hidden;
    pageVisible ? start() : stop();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      inView = es[0].isIntersecting;
      inView ? start() : stop();
    }, { threshold: 0.02 }).observe(canvas);
  }

  resize();
  if (reduced) {
    root.style.setProperty('--fl', '0.5');
    displayT = temps[0];
    renderStill();
    updateHUD();
  } else {
    start();
  }
})();
