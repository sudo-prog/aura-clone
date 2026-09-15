/* ═══════════════════════════════════════════════════════════════
   HANABI pyrotechnics engine — 川原木煙火店
   Canvas-2D, physics-true shells over dark water.
   Layers: bg (static night) → trail (slow fade) → sharp (fast fade)
           → scene composite → water strip-reflection on main canvas.
   Public API: window.PYRO = { fire, finale, finaleActive, reduced }
   ═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const canvas = document.getElementById('sky');
  const ctx = canvas.getContext('2d');
  if (!ctx) return; // no 2D context: the CSS night ground stands, content stays readable
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── layers ──────────────────────────────────────────────
  const bg = document.createElement('canvas');
  const trail = document.createElement('canvas');
  const sharp = document.createElement('canvas');
  const scene = document.createElement('canvas');
  const bgx = bg.getContext('2d');
  const trx = trail.getContext('2d');
  const shx = sharp.getContext('2d');
  const scx = scene.getContext('2d');

  let W = 0, H = 0, DPR = 1, waterY = 0, G = 80, perfScale = 1;

  // ── caliber table (true dimensions; METER px derived from 12-sun apex 380 m) ──
  const CAL = {
    4:  { apexM: 190, bloomM: 130, stars: 0.62, w: 1.1 },
    8:  { apexM: 300, bloomM: 260, stars: 1.00, w: 1.5 },
    12: { apexM: 380, bloomM: 360, stars: 1.50, w: 1.9 },
  };
  const APEX_MAX_FRAC = 0.72;   // 12-sun apex as fraction of waterY
  const CLIMB_12 = 3.4;         // seconds for a 12-sun to apex

  // ── shell types ─────────────────────────────────────────
  const TYPES = {
    kiku: {                                    // chrysanthemum — sharp sphere, tailed stars
      q: 0.40, life: 1.8, layer: 'trail', vMul: 1.0, grav: 1.0, jitter: 0.03,
      count: 200, lineW: 1.15,
      stops: [[255, 236, 190], [233, 179, 76], [255, 138, 60], [130, 52, 28]],
    },
    shirogiku: {                               // white chrysanthemum (Obon memorial shell)
      q: 0.40, life: 1.9, layer: 'trail', vMul: 1.0, grav: 1.0, jitter: 0.03,
      count: 190, lineW: 1.0,
      stops: [[255, 255, 244], [238, 240, 235], [190, 198, 212], [84, 90, 106]],
    },
    botan: {                                   // peony — bare stars, no trails
      q: 0.35, life: 1.5, layer: 'sharp', vMul: 1.02, grav: 0.9, jitter: 0.07,
      count: 200, dotR: 1.9,
      stops: [[255, 226, 233], [239, 127, 155], [210, 80, 125], [110, 58, 142]],
    },
    yanagi: {                                  // willow — heavy drag, long gravity droop
      q: 0.16, life: 3.9, layer: 'trail', vMul: 0.75, grav: 1.25, jitter: 0.24,
      count: 120, lineW: 1.25,
      stops: [[246, 232, 160], [206, 211, 124], [156, 193, 120], [80, 98, 62]],
    },
    kamuro: {                                  // crown — persistent twinkling gold
      q: 0.28, life: 4.6, layer: 'trail', vMul: 0.80, grav: 0.82, jitter: 0.12,
      count: 250, lineW: 1.0, twinkle: true,
      stops: [[255, 244, 210], [240, 196, 110], [201, 138, 46], [116, 72, 24]],
    },
    pistil: {                                  // inner core for 12-sun kiku / finale crown
      q: 0.35, life: 1.15, layer: 'sharp', vMul: 0.30, grav: 0.8, jitter: 0.05,
      count: 55, dotR: 1.7,
      stops: [[255, 220, 230], [244, 150, 175], [190, 90, 120], [110, 58, 100]],
    },
  };

  // ── state ───────────────────────────────────────────────
  const shells = [];   // rising rockets
  const bursts = [];   // exploded star groups
  const sparks = [];   // comet offshoots + kamuro glitter + splashes
  const flashes = [];  // muzzle / burst blooms
  let skyFlash = 0;
  let starTotal = 0;
  let rafId = 0, lastT = 0, running = false;
  let finaleOn = false;
  const finaleQueue = [];
  let idleClearAt = 0;

  const R = Math.random;
  const gauss = () => (R() + R() + R()) / 1.5 - 1; // rough gaussian [-1,1]

  // ── sizing ──────────────────────────────────────────────
  function resize() {
    W = innerWidth; H = innerHeight;
    DPR = Math.min(devicePixelRatio || 1, W < 768 ? 1.5 : 2);
    for (const c of [canvas, bg, trail, sharp, scene]) {
      c.width = Math.round(W * DPR);
      c.height = Math.round(H * DPR);
    }
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    for (const c of [ctx, bgx, trx, shx, scx]) c.setTransform(DPR, 0, 0, DPR, 0, 0);
    waterY = Math.round(H * (H < 700 ? 0.80 : 0.78));
    G = 2 * APEX_MAX_FRAC * waterY / (CLIMB_12 * CLIMB_12);
    perfScale = Math.max(0.45, Math.min(1, (W * H) / (1440 * 900)));
    paintBG();
    if (reduced) staticFrame();
  }

  // ── background: sky, stars, hills, far-bank lanterns ────
  function paintBG() {
    bgx.clearRect(0, 0, W, H);
    // sky
    const sky = bgx.createLinearGradient(0, 0, 0, waterY);
    sky.addColorStop(0, '#04060d');
    sky.addColorStop(0.62, '#070a14');
    sky.addColorStop(1, '#0b0e1a');
    bgx.fillStyle = sky;
    bgx.fillRect(0, 0, W, waterY);
    // faint festival glow on the horizon
    const glow = bgx.createRadialGradient(W * 0.5, waterY, 0, W * 0.5, waterY, W * 0.55);
    glow.addColorStop(0, 'rgba(233,179,76,0.055)');
    glow.addColorStop(1, 'rgba(233,179,76,0)');
    bgx.fillStyle = glow;
    bgx.fillRect(0, 0, W, waterY);
    // stars — sparser near horizon
    const n = Math.round(170 * (W / 1440) + 40);
    for (let i = 0; i < n; i++) {
      const y = Math.pow(R(), 1.7) * waterY * 0.92;
      const a = 0.12 + R() * 0.5 * (1 - y / waterY);
      bgx.fillStyle = R() < 0.12
        ? `rgba(255,224,178,${a})`
        : `rgba(214,226,255,${a})`;
      const r = 0.4 + R() * 0.8;
      bgx.fillRect(R() * W, y, r, r);
    }
    // hills — two ridges above the waterline
    ridge(waterY, 0.055, '#080b14', 3);
    ridge(waterY, 0.028, '#05070e', 7);
    // far-bank festival lanterns
    const count = Math.max(9, Math.round(W / 110));
    for (let i = 0; i < count; i++) {
      const x = (i + 0.2 + R() * 0.6) * (W / count);
      const y = waterY - 3 - R() * 4;
      const warm = R() < 0.82;
      const col = warm ? '255,190,110' : '244,150,175';
      const rad = 5 + R() * 5;
      const g = bgx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(${col},0.85)`);
      g.addColorStop(0.35, `rgba(${col},0.28)`);
      g.addColorStop(1, `rgba(${col},0)`);
      bgx.fillStyle = g;
      bgx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      bgx.fillStyle = `rgba(${col},0.95)`;
      bgx.fillRect(x - 0.8, y - 1.2, 1.6, 2.4);
    }
    // water base
    const wat = bgx.createLinearGradient(0, waterY, 0, H);
    wat.addColorStop(0, '#0a0d17');
    wat.addColorStop(0.25, '#05070d');
    wat.addColorStop(1, '#020308');
    bgx.fillStyle = wat;
    bgx.fillRect(0, waterY, W, H - waterY);
  }

  function ridge(baseY, hFrac, color, seed) {
    bgx.fillStyle = color;
    bgx.beginPath();
    bgx.moveTo(0, baseY);
    const hMax = H * hFrac;
    for (let x = 0; x <= W; x += 8) {
      const t = x / W;
      const y = baseY - hMax * (0.45
        + 0.3 * Math.sin(t * 5.1 + seed)
        + 0.18 * Math.sin(t * 11.7 + seed * 2.3)
        + 0.07 * Math.sin(t * 29 + seed * 4.1));
      bgx.lineTo(x, y);
    }
    bgx.lineTo(W, baseY);
    bgx.closePath();
    bgx.fill();
  }

  // ── color helpers ───────────────────────────────────────
  function colorAt(stops, t) {
    const f = Math.min(0.999, Math.max(0, t)) * (stops.length - 1);
    const i = Math.floor(f), u = f - i;
    const a = stops[i], b = stops[Math.min(i + 1, stops.length - 1)];
    return [
      Math.round(a[0] + (b[0] - a[0]) * u),
      Math.round(a[1] + (b[1] - a[1]) * u),
      Math.round(a[2] + (b[2] - a[2]) * u),
    ];
  }
  const alphaAt = t => t < 0.06 ? t / 0.06 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1;

  // ── launching ───────────────────────────────────────────
  function launch(type, cal, xFrac, onBurst) {
    const c = CAL[cal] || CAL[8];
    const meter = (APEX_MAX_FRAC * waterY) / 380;
    const apexPx = c.apexM * meter;
    const v0 = Math.sqrt(2 * G * apexPx);
    const x = xFrac * W;
    shells.push({
      x, y: waterY, px: x, py: waterY,
      vx: (R() - 0.5) * 14, vy: -v0 * (0.98 + R() * 0.04),
      type, cal, w: c.w, onBurst,
      wob: R() * Math.PI * 2,
    });
    flashes.push({ x, y: waterY - 2, r: 16 + c.w * 8, i: 0.3, age: 0, dur: 0.3 });
    dispatchEvent(new CustomEvent('hanabi:launch', { detail: { cal } }));
  }

  function burst(sh) {
    const c = CAL[sh.cal];
    const T = TYPES[sh.type];
    const meter = (APEX_MAX_FRAC * waterY) / 380;
    const bloomR = (c.bloomM / 2) * meter;
    const Tq = -Math.log(T.q);
    const tRef = T.life * 0.6;
    const v0 = bloomR * Tq / (1 - Math.pow(T.q, tRef)) * T.vMul;

    let n = Math.round(T.count * c.stars * perfScale);
    if (starTotal > 2600 * perfScale) n = Math.round(n * 0.5);

    const stars = new Array(n);
    for (let i = 0; i < n; i++) {
      let a = gauss(), b = gauss(), d = gauss();
      const m = Math.hypot(a, b, d) || 1;
      a /= m; b /= m; d /= m;
      const sp = v0 * (1 - T.jitter + R() * T.jitter * 2);
      stars[i] = {
        x: sh.x, y: sh.y, px: sh.x, py: sh.y,
        vx: a * sp + sh.vx * 0.25, vy: b * sp,
        c: d, tw: R() * Math.PI * 2, dead: false,
      };
    }
    starTotal += n;
    bursts.push({ type: sh.type, cal: sh.cal, age: 0, T, stars, lw: (T.lineW || 1) * c.w });

    // pistil core in every 12-sun kiku + finale crowns
    if ((sh.type === 'kiku' || sh.type === 'kamuro') && sh.cal === 12) {
      burst({ x: sh.x, y: sh.y, vx: sh.vx, vy: 0, type: 'pistil', cal: 8 });
    }
    if (sh.type !== 'pistil') {
      flashes.push({ x: sh.x, y: sh.y, r: bloomR * 0.30, i: 0.34 + sh.cal / 40, age: 0, dur: 0.4 });
      skyFlash = Math.min(1, skyFlash + 0.28 + sh.cal / 36);
      dispatchEvent(new CustomEvent('hanabi:burst', { detail: { type: sh.type, cal: sh.cal } }));
    }
    if (sh.onBurst) sh.onBurst(sh.x, sh.y);
  }

  // ── ambient scheduler — the hush between bursts ─────────
  const ambient = { nextAt: 1.6, cluster: 1, first: true };
  function ambientTick(t) {
    if (finaleOn || t < ambient.nextAt) return;
    if (ambient.first) {
      ambient.first = false;
      launch('kiku', 8, 0.58 + R() * 0.14); // the proof shell, beside the wordmark
      ambient.cluster = 0;
      ambient.nextAt = t + 5.5 + R() * 3;
      return;
    }
    const tr = R();
    const type = tr < 0.36 ? 'kiku' : tr < 0.62 ? 'botan' : tr < 0.79 ? 'yanagi'
      : tr < 0.94 ? 'kamuro' : 'shirogiku';
    const cr = R();
    const cal = cr < 0.5 ? 4 : cr < 0.9 ? 8 : 12;
    launch(type, cal, 0.14 + R() * 0.72);
    if (ambient.cluster > 0) {
      ambient.cluster--;
      ambient.nextAt = t + 0.8 + R() * 1.4;
    } else {
      ambient.cluster = Math.floor(R() * 3);            // 0–2 more in next cluster
      ambient.nextAt = t + 6 + R() * 5;                 // the hush
    }
  }

  // ── finale choreography ─────────────────────────────────
  function buildFinale(t0) {
    const E = [];
    const push = (dt, type, cal, xf) => E.push({ t: t0 + dt, type, cal, xf });
    // I. a measured volley of chrysanthemums
    [0.15, 0.32, 0.5, 0.68, 0.85].forEach((xf, i) => push(i * 0.28, 'kiku', 8, xf));
    // II. peony pairs with willow between
    push(2.6, 'botan', 8, 0.28); push(2.85, 'botan', 8, 0.72); push(3.1, 'botan', 8, 0.5);
    push(3.3, 'yanagi', 8, 0.36); push(3.55, 'yanagi', 8, 0.64);
    // III. a row of crowns
    [0.2, 0.4, 0.6, 0.8].forEach((xf, i) => push(5.4 + i * 0.3, 'kamuro', 8, xf));
    // IV. gold strobe volley
    for (let i = 0; i < 8; i++) push(7.9 + i * 0.15, 'kiku', 4, 0.12 + R() * 0.76);
    // V. heavy flowers
    push(9.9, 'botan', 12, 0.3); push(10.2, 'botan', 12, 0.7); push(10.6, 'yanagi', 12, 0.5);
    // VI. the crown of the night
    push(12.6, 'kamuro', 12, 0.5); push(12.9, 'kiku', 8, 0.16); push(12.9, 'kiku', 8, 0.84);
    // VII. closing scatter, then one last crown and the hush
    for (let i = 0; i < 10; i++) push(14.9 + i * 0.16, i % 3 ? 'kiku' : 'botan', 4, 0.1 + R() * 0.8);
    push(17.3, 'shirogiku', 8, 0.32);
    push(17.9, 'kamuro', 12, 0.55);
    return E;
  }

  let finaleDone = null;
  let fireSide = Math.random() < 0.5;
  function startFinale(onDone) {
    if (finaleOn) return false;
    finaleOn = true;
    finaleDone = onDone || null;
    if (reduced) { staticFinale(); return true; }
    const t = lastT;
    finaleQueue.push(...buildFinale(t + 0.15));
    return true;
  }

  function finaleTick(t) {
    if (!finaleOn || reduced) return;
    while (finaleQueue.length && finaleQueue[0].t <= t) {
      const e = finaleQueue.shift();
      launch(e.type, e.cal, e.xf);
    }
    if (!finaleQueue.length && !shells.length && !bursts.length) {
      finaleOn = false;
      ambient.nextAt = t + 6;
      if (finaleDone) { const f = finaleDone; finaleDone = null; f(); }
    }
  }

  // ── per-frame update ────────────────────────────────────
  function fade(c2d, base, dt) {
    c2d.globalCompositeOperation = 'destination-out';
    c2d.fillStyle = `rgba(0,0,0,${1 - Math.pow(1 - base, dt * 60)})`;
    c2d.fillRect(0, 0, W, H);
    c2d.globalCompositeOperation = 'lighter';
  }

  function update(t, dt) {
    ambientTick(t);
    finaleTick(t);
    fade(trx, 0.085, dt);
    fade(shx, 0.32, dt);

    // rising shells — true ballistic arcs with a comet tail
    for (let i = shells.length - 1; i >= 0; i--) {
      const s = shells[i];
      s.px = s.x; s.py = s.y;
      s.vy += G * dt;
      s.wob += dt * 7;
      s.x += (s.vx + Math.sin(s.wob) * 3.2) * dt;
      s.y += s.vy * dt;
      trx.strokeStyle = 'rgba(255,212,140,0.92)';
      trx.lineWidth = s.w;
      trx.beginPath(); trx.moveTo(s.px, s.py); trx.lineTo(s.x, s.y); trx.stroke();
      shx.fillStyle = 'rgba(255,236,196,0.95)';
      shx.fillRect(s.x - s.w * 0.8, s.y - s.w * 0.8, s.w * 1.6, s.w * 1.6);
      if (R() < dt * 70) {
        sparks.push({
          x: s.x, y: s.y,
          vx: s.vx * 0.2 + (R() - 0.5) * 34, vy: s.vy * 0.12 + (R() - 0.5) * 30,
          age: 0, life: 0.22 + R() * 0.26, col: '255,180,90', r: 1.1,
        });
      }
      if (s.vy > -G * 0.32) { shells.splice(i, 1); burst(s); }
    }

    // burst stars
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.age += dt;
      const lt = b.age / b.T.life;
      if (lt >= 1) { starTotal -= b.stars.length; bursts.splice(i, 1); continue; }
      const dragF = Math.pow(b.T.q, dt);
      const col = colorAt(b.T.stops, lt);
      const baseA = alphaAt(lt);
      const isTrail = b.T.layer === 'trail';
      const c2d = isTrail ? trx : shx;
      // three depth bands so the sphere reads round
      const bands = [[], [], []];
      for (const st of b.stars) {
        if (st.dead) continue;
        st.px = st.x; st.py = st.y;
        st.vx *= dragF;
        st.vy = st.vy * dragF + G * b.T.grav * dt;
        st.x += st.vx * dt;
        st.y += st.vy * dt;
        if (st.y > waterY - 3) {
          st.dead = true;
          if (R() < 0.25) sparks.push({ x: st.x, y: waterY - 2, vx: (R() - 0.5) * 20, vy: -R() * 26, age: 0, life: 0.3, col: `${col[0]},${col[1]},${col[2]}`, r: 1 });
          continue;
        }
        bands[st.c < -0.33 ? 0 : st.c < 0.33 ? 1 : 2].push(st);
      }
      const bandA = [0.55, 0.85, 1.0];
      // bright star heads on the sharp layer — the sparkle that reads as fire
      const headCol = `rgba(${Math.min(255, col[0] + 70)},${Math.min(255, col[1] + 60)},${Math.min(255, col[2] + 50)},${baseA * 0.85})`;
      for (let k = 0; k < 3; k++) {
        const arr = bands[k];
        if (!arr.length) continue;
        const a = baseA * bandA[k];
        if (isTrail) {
          c2d.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
          c2d.lineWidth = b.lw;
          c2d.beginPath();
          for (const st of arr) { c2d.moveTo(st.px, st.py); c2d.lineTo(st.x, st.y); }
          c2d.stroke();
          if (k === 2 && lt < 0.85) {
            shx.fillStyle = headCol;
            for (const st of arr) shx.fillRect(st.x - 0.8, st.y - 0.8, 1.6, 1.6);
          }
        } else {
          c2d.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
          c2d.beginPath();
          const r = b.T.dotR * (0.8 + k * 0.2);
          for (const st of arr) { c2d.moveTo(st.x + r, st.y); c2d.arc(st.x, st.y, r, 0, 6.2832); }
          c2d.fill();
        }
      }
      // kamuro glitter — random stars pop white-gold on the sharp layer
      if (b.T.twinkle && lt > 0.12) {
        const pops = Math.max(1, Math.round(b.stars.length * dt * 1.6));
        shx.fillStyle = `rgba(255,240,200,${0.85 * baseA})`;
        for (let p = 0; p < pops; p++) {
          const st = b.stars[(R() * b.stars.length) | 0];
          if (!st.dead) shx.fillRect(st.x - 0.9, st.y - 0.9, 1.8, 1.8);
        }
      }
    }

    // sparks (comet offshoots, splashes)
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.age += dt;
      if (p.age > p.life) { sparks.splice(i, 1); continue; }
      p.vy += G * 0.7 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = 0.8 * (1 - p.age / p.life);
      trx.fillStyle = `rgba(${p.col},${a})`;
      trx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
    }

    // flashes
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.age += dt;
      if (f.age > f.dur) { flashes.splice(i, 1); continue; }
      const u = f.age / f.dur;
      const r = f.r * (0.55 + u * 0.9);
      const g = shx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      g.addColorStop(0, `rgba(255,232,190,${f.i * (1 - u)})`);
      g.addColorStop(1, 'rgba(255,232,190,0)');
      shx.fillStyle = g;
      shx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
    }

    skyFlash *= Math.exp(-dt * 3.6);

    // idle housekeeping: clear 8-bit additive residue during a long hush
    if (!shells.length && !bursts.length && !sparks.length) {
      if (!idleClearAt) idleClearAt = t + 3;
      else if (t > idleClearAt) {
        trx.globalCompositeOperation = 'source-over';
        trx.clearRect(0, 0, W, H);
        trx.globalCompositeOperation = 'lighter';
        shx.globalCompositeOperation = 'source-over';
        shx.clearRect(0, 0, W, H);
        shx.globalCompositeOperation = 'lighter';
        idleClearAt = 0;
      }
    } else idleClearAt = 0;
  }

  // ── compose: sky, then the river remembers it ───────────
  function compose(t) {
    scx.globalCompositeOperation = 'source-over';
    scx.drawImage(bg, 0, 0, W, H);
    scx.globalCompositeOperation = 'lighter';
    scx.drawImage(trail, 0, 0, W, H);
    scx.drawImage(sharp, 0, 0, W, H);
    if (skyFlash > 0.01) {
      scx.fillStyle = `rgba(255,216,168,${skyFlash * 0.05})`;
      scx.fillRect(0, 0, W, waterY);
    }
    scx.globalCompositeOperation = 'source-over';

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(scene, 0, 0, W, H);

    // water: flipped strips of the sky, sinusoidally displaced
    const depth = H - waterY;
    const S = 3;
    for (let dy = 0; dy < depth; dy += S) {
      const srcY = Math.max(0, waterY - dy * 0.92 - 2);
      const off = Math.sin(dy * 0.11 + t * 1.9) * (0.7 + dy * 0.05)
        + Math.sin(dy * 0.043 - t * 1.1) * (0.4 + dy * 0.022);
      const a = Math.max(0.07, 0.58 - (dy / depth) * 0.46);
      ctx.globalAlpha = a;
      ctx.drawImage(scene,
        0, srcY * DPR, W * DPR, S * DPR,
        off, waterY + dy, W, S);
    }
    ctx.globalAlpha = 1;
    // deep-water darkening
    const dk = ctx.createLinearGradient(0, waterY, 0, H);
    dk.addColorStop(0, 'rgba(2,3,8,0)');
    dk.addColorStop(1, 'rgba(2,3,8,0.72)');
    ctx.fillStyle = dk;
    ctx.fillRect(0, waterY, W, depth);
  }

  // ── main loop (with adaptive quality governor) ──────────
  let slowN = 0;
  function frame(now) {
    const t = now / 1000;
    let dt = t - lastT;
    lastT = t;
    if (dt > 0.066) dt = 0.066;
    if (dt > 0) {
      if (dt > 0.028) { if (++slowN > 90) { perfScale = Math.max(0.35, perfScale * 0.75); slowN = 0; } }
      else slowN = Math.max(0, slowN - 2);
      update(t, dt);
      compose(t);
    }
    rafId = requestAnimationFrame(frame);
  }

  let hiddenAt = 0;
  function start() {
    if (running || reduced) return;
    running = true;
    lastT = performance.now() / 1000;
    if (hiddenAt) {
      const gap = lastT - hiddenAt;
      for (const e of finaleQueue) e.t += gap;   // keep the barrage choreographed
      hiddenAt = 0;
    }
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    hiddenAt = performance.now() / 1000;
    cancelAnimationFrame(rafId);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });
  // the canvas is fixed full-viewport, so this rarely fires — but if it is
  // ever scrolled/clipped out of view, the loop rests with it
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) { if (!document.hidden) start(); }
        else stop();
      }
    }).observe(canvas);
  }

  // ── reduced-motion: hand-composed long-exposure frame ───
  function simulateStatic(type, cal, xf, yFrac) {
    const c = CAL[cal];
    const T = TYPES[type];
    const meter = (APEX_MAX_FRAC * waterY) / 380;
    const bloomR = (c.bloomM / 2) * meter;
    const Tq = -Math.log(T.q);
    const v0 = bloomR * Tq / (1 - Math.pow(T.q, T.life * 0.6)) * T.vMul;
    const cx = xf * W, cy = yFrac * waterY;
    const n = Math.round(T.count * c.stars * 0.8);
    const stars = [];
    for (let i = 0; i < n; i++) {
      let a = gauss(), b = gauss(), d = gauss();
      const m = Math.hypot(a, b, d) || 1;
      const sp = v0 * (1 - T.jitter + R() * T.jitter * 2);
      stars.push({ x: cx, y: cy, vx: a / m * sp, vy: b / m * sp, c: d / m });
    }
    const step = 1 / 50;
    const nSteps = Math.round(T.life * 0.86 / step);
    for (let s = 0; s < nSteps; s++) {
      const lt = (s * step) / T.life;
      const col = colorAt(T.stops, lt);
      const a = alphaAt(lt) * (T.layer === 'trail' ? 0.16 : 0.5);
      trx.strokeStyle = trx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
      trx.lineWidth = (T.lineW || 1) * c.w;
      trx.beginPath();
      const dragF = Math.pow(T.q, step);
      for (const st of stars) {
        const px = st.x, py = st.y;
        st.vx *= dragF;
        st.vy = st.vy * dragF + G * T.grav * step;
        st.x += st.vx * step;
        st.y += st.vy * step;
        if (st.y > waterY - 3) continue;
        if (T.layer === 'trail') { trx.moveTo(px, py); trx.lineTo(st.x, st.y); }
        else if (s % 6 === 0) { trx.moveTo(st.x + 1.6, st.y); trx.arc(st.x, st.y, 1.6, 0, 6.2832); }
      }
      if (T.layer === 'trail') trx.stroke(); else trx.fill();
    }
    // launch trail, long-exposure style
    trx.strokeStyle = 'rgba(255,206,130,0.5)';
    trx.lineWidth = c.w;
    trx.beginPath();
    trx.moveTo(cx + 14, waterY);
    trx.quadraticCurveTo(cx + 10, (waterY + cy) / 2, cx, cy);
    trx.stroke();
  }

  function staticCompose() {
    scx.globalCompositeOperation = 'source-over';
    scx.drawImage(bg, 0, 0, W, H);
    scx.globalCompositeOperation = 'lighter';
    scx.drawImage(trail, 0, 0, W, H);
    scx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(scene, 0, 0, W, H);
    const depth = H - waterY, S = 3;
    for (let dy = 0; dy < depth; dy += S) {
      const srcY = Math.max(0, waterY - dy * 0.92 - 2);
      const off = Math.sin(dy * 0.13) * (0.7 + dy * 0.045);
      ctx.globalAlpha = Math.max(0.06, 0.52 - (dy / depth) * 0.45);
      ctx.drawImage(scene, 0, srcY * DPR, W * DPR, S * DPR, off, waterY + dy, W, S);
    }
    ctx.globalAlpha = 1;
    const dk = ctx.createLinearGradient(0, waterY, 0, H);
    dk.addColorStop(0, 'rgba(2,3,8,0)');
    dk.addColorStop(1, 'rgba(2,3,8,0.72)');
    ctx.fillStyle = dk;
    ctx.fillRect(0, waterY, W, depth);
  }

  function staticFrame() {
    trx.clearRect(0, 0, W, H);
    simulateStatic('kiku', 8, 0.62, 0.30);
    staticCompose();
  }
  function staticFire(type, cal) {
    trx.clearRect(0, 0, W, H);
    const xf = 0.38 + R() * 0.3;
    const yf = cal === 12 ? 0.26 : cal === 8 ? 0.3 : 0.4;
    simulateStatic(type, cal, xf, yf);
    staticCompose();
    dispatchEvent(new CustomEvent('hanabi:burst', { detail: { type, cal } }));
    return { x: xf * W, y: yf * waterY };
  }
  function staticFinale() {
    trx.clearRect(0, 0, W, H);
    simulateStatic('kiku', 8, 0.2, 0.34);
    simulateStatic('botan', 8, 0.78, 0.3);
    simulateStatic('kamuro', 12, 0.5, 0.24);
    staticCompose();
    finaleOn = false;
    if (finaleDone) { const f = finaleDone; finaleDone = null; f(); }
  }

  // ── public API ──────────────────────────────────────────
  window.PYRO = {
    reduced,
    fire(type, cal, onBurst) {
      if (!TYPES[type]) return;
      if (reduced) {
        const p = staticFire(type, cal);
        if (onBurst) setTimeout(() => onBurst(p.x, p.y), 350);
        return;
      }
      // wide screens: burst in the open sky beside the program column
      let xf;
      if (W >= 1100) {
        xf = fireSide ? 0.795 + R() * 0.09 : 0.115 + R() * 0.09;
        fireSide = !fireSide;
      } else {
        xf = 0.32 + R() * 0.36;
      }
      launch(type, cal, xf, onBurst);
    },
    finale: startFinale,
    get finaleActive() { return finaleOn; },
  };

  // ── boot ────────────────────────────────────────────────
  let rsz;
  addEventListener('resize', () => {
    clearTimeout(rsz);
    rsz = setTimeout(resize, 150);
  });
  resize();
  start();
})();
