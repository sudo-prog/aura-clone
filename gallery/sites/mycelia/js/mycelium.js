/* ============================================================
   Mycelia — the living network
   PIXI v8 · drifting spores + hyphae that grow toward the cursor
   The cursor is a nutrient source; filaments branch toward it,
   feed, and slowly fade back into the loam.
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('loam');
  const fallback = document.getElementById('loam-fallback');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function bail() {
    if (canvas) canvas.style.display = 'none';
    if (fallback) fallback.style.opacity = '1';
  }
  if (!canvas || typeof PIXI === 'undefined') { bail(); return; }

  // ---- palette ----
  const HUES = [0x5cf0a6 /*foxfire*/, 0x8be7ff /*ghost*/, 0xf0ca7a /*spore gold*/];
  const BUCKETS = 7;

  // ---- tuning (scaled for viewport) ----
  // Fewer, longer-lived tips + distance-based segment emission = long elegant
  // filaments that travel across the viewport, instead of dense scribble.
  const small = window.innerWidth < 760;
  const CFG = {
    maxTips: small ? 10 : 30,
    maxSegs: small ? 700 : 2800,
    maxNodes: small ? 70 : 120,
    spores: small ? 150 : 260,
    depositDist: 26,
    sense: 320,
    eat: 16,
    speed: small ? 2.0 : 2.5,   // px per frame-unit
    steer: 0.16,
    segStep: 6,                 // emit a segment every N px of travel
    segLife: small ? 3.6 : 5.2, // phones: faster fade — delicate, never dense
    nutrLife: 2.0,
    minSpawnDist: 80            // filaments must travel to reach food
  };

  let app, dpr = Math.min(window.devicePixelRatio || 1, 2);

  // soft round glow texture (used for spores + cursor nutrient)
  function makeGlowTexture() {
    const s = 64, c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    grd.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    return PIXI.Texture.from(c);
  }

  // ---- simulation state ----
  const tips = [];      // {x,y,a,life,gen,hue}
  const segs = [];      // {x1,y1,x2,y2,life,max,hue}
  const nodes = [];     // {x,y,life,hue}  spawn candidates + glow dots
  const nutrients = []; // {x,y,life,str}
  let roots = [];

  const pointer = { x: -9999, y: -9999, px: -9999, py: -9999, active: false, moved: 0 };
  let idle = 0;
  // ambient wander target: the network keeps foraging on its own so it is
  // always alive; the cursor simply becomes a brighter, closer food source.
  const amb = { x: 0, y: 0, t: Math.random() * 1000, drop: 0 };

  function seedRoots(W, H) {
    roots = [];
    // drop immortal root nodes from any previous seeding (resize would leak them)
    for (let i = nodes.length - 1; i >= 0; i--) if (nodes[i].life >= 999) nodes.splice(i, 1);
    const n = small ? 5 : 8;
    for (let i = 0; i < n; i++) {
      roots.push({ x: (i + 0.5) / n * W + (Math.random() - 0.5) * 60, y: H + 8 });
    }
    // a couple along the sides so growth can reach high corners
    roots.push({ x: 4, y: H * (0.5 + Math.random() * 0.3) });
    roots.push({ x: W - 4, y: H * (0.5 + Math.random() * 0.3) });
    for (const r of roots) nodes.push({ x: r.x, y: r.y, life: 999, hue: 0 });
  }

  function deposit(x, y) {
    nutrients.push({ x, y, life: CFG.nutrLife, str: 1 });
    if (nutrients.length > 60) nutrients.shift();
    spawnToward(x, y);
  }

  // nearest node that is at least minSpawnDist away — the filament has to
  // TRAVEL to reach the food, which is the whole spectacle.
  function originFor(tx, ty) {
    let best = null, bd = Infinity;
    const min2 = CFG.minSpawnDist * CFG.minSpawnDist;
    for (const nd of nodes) {
      const d = (nd.x - tx) ** 2 + (nd.y - ty) ** 2;
      if (d >= min2 && d < bd) { bd = d; best = nd; }
    }
    return best;
  }

  function spawnToward(tx, ty) {
    if (tips.length >= CFG.maxTips) return;
    let origin = originFor(tx, ty);
    if (!origin) origin = roots.length ? roots[(Math.random() * roots.length) | 0] : { x: tx, y: ty + 240 };
    const jx = origin.x + (Math.random() - 0.5) * 30;
    const jy = origin.y + (Math.random() - 0.5) * 30;
    const a = Math.atan2(ty - jy, tx - jx) + (Math.random() - 0.5) * 0.35;
    const hue = Math.random() < 0.16 ? 1 : 0;
    tips.push({ x: jx, y: jy, ex: jx, ey: jy, a, k: 0, sat: 0, life: 1.8 + Math.random() * 1.2, gen: 0, hue });
  }

  function ambient(dts, W, H) {
    // a slow lissajous forage path across the whole viewport
    // (phones: sweep faster so the path never dwells long enough to knot)
    amb.t += dts * (small ? 1.6 : 1);
    const t = amb.t;
    amb.x = W * (0.5 + 0.4 * Math.sin(t * 0.27) * Math.cos(t * 0.11));
    // on small screens keep the forage path low in the loam so the tangle
    // never sits on top of the wordmark / running text
    amb.y = small
      ? H * (0.62 + 0.24 * Math.sin(t * 0.19 + 1.3))
      : H * (0.42 + 0.34 * Math.sin(t * 0.19 + 1.3));
    // deposit rate rises when the visitor is idle (network reaches out to explore)
    const rate = (idle > 1.4 ? 0.38 : 0.8) * (small ? 1.5 : 1);
    amb.drop += dts;
    if (amb.drop >= rate) {
      amb.drop = 0;
      // scatter food around the forage point — spread skeins, never a knot
      const sc = small ? 150 : 150;
      const fx = Math.max(10, Math.min(W - 10, amb.x + (Math.random() - 0.5) * sc));
      const fy = Math.max(10, Math.min(H - 10, amb.y + (Math.random() - 0.5) * sc));
      nutrients.push({ x: fx, y: fy, life: CFG.nutrLife * 1.2, str: idle > 1.4 ? 0.9 : 0.6 });
      if (nutrients.length > 60) nutrients.shift();
      spawnToward(fx, fy);
    }
    // never let the network die out entirely
    if (tips.length < (small ? 4 : 7)) spawnToward(amb.x, amb.y);
  }

  function step(dt, dts, W, H) {
    // decay nutrients
    for (let i = nutrients.length - 1; i >= 0; i--) {
      nutrients[i].life -= dts;
      if (nutrients[i].life <= 0) nutrients.splice(i, 1);
    }
    // grow tips
    for (let i = tips.length - 1; i >= 0; i--) {
      const t = tips[i];
      // find nearest live nutrient in sense radius
      let nn = null, nd = CFG.sense * CFG.sense;
      for (const nu of nutrients) {
        const d = (nu.x - t.x) ** 2 + (nu.y - t.y) ** 2;
        if (d < nd) { nd = d; nn = nu; }
      }
      let influence = 0;
      if (t.sat > 0) t.sat -= dts; // satiated: grow onward, ignore the pull
      if (nn && t.sat <= 0) {
        const want = Math.atan2(nn.y - t.y, nn.x - t.x);
        let diff = want - t.a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        influence = 1 - Math.sqrt(nd) / CFG.sense;
        // stop steering at very close range: the tip grows THROUGH the food
        // instead of orbiting it — hyphae thread, they never knot
        if (nd > (CFG.eat * 1.9) ** 2) t.a += diff * CFG.steer * (0.4 + influence);
      }
      // smooth evolving curvature — organic arcs, not white-noise scribble
      t.k = t.k * 0.93 + (Math.random() - 0.5) * 0.045 * (1 - influence * 0.6);
      if (t.k > 0.11) t.k = 0.11; else if (t.k < -0.11) t.k = -0.11;
      t.a += t.k * dt;

      const spd = CFG.speed * (0.7 + influence * 0.7);
      t.x += Math.cos(t.a) * spd * dt;
      t.y += Math.sin(t.a) * spd * dt;
      t.life -= dts;

      // emit a segment only after ~segStep px of travel → long tapered strands
      const ddx = t.x - t.ex, ddy = t.y - t.ey;
      if (ddx * ddx + ddy * ddy >= CFG.segStep * CFG.segStep) {
        segs.push({
          x1: t.ex, y1: t.ey, x2: t.x, y2: t.y,
          life: CFG.segLife, max: CFG.segLife, hue: t.hue,
          w: t.gen > 1 ? 1 : 0 // width class: parents thicker than children
        });
        t.ex = t.x; t.ey = t.y;
      }

      // feed
      if (nn) {
        const de = (nn.x - t.x) ** 2 + (nn.y - t.y) ** 2;
        if (de < CFG.eat * CFG.eat) {
          nn.str -= 0.5;
          t.life = Math.min(t.life + 0.6, 3.4); // fed, but never immortal — knots starve
          t.sat = 0.9 + Math.random() * 0.6;    // fed hyphae extend past the meal
          nodes.push({ x: t.x, y: t.y, life: 1.6, hue: 2 }); // gold spark where it feeds
          if (nn.str <= 0) { const k = nutrients.indexOf(nn); if (k >= 0) nutrients.splice(k, 1); }
          if (tips.length < CFG.maxTips && t.gen < 4 && Math.random() < 0.45) {
            tips.push({ x: t.x, y: t.y, ex: t.x, ey: t.y, a: t.a + (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.4), k: 0, sat: 0.5, life: t.life * 0.75, gen: t.gen + 1, hue: t.hue });
          }
        }
      }

      // ambient branch
      const bp = (nn ? 0.03 : 0.007) * (1 - t.gen * 0.18);
      if (tips.length < CFG.maxTips && t.gen < 4 && Math.random() < bp) {
        nodes.push({ x: t.x, y: t.y, life: 2.2, hue: t.hue });
        tips.push({ x: t.x, y: t.y, ex: t.x, ey: t.y, a: t.a + (Math.random() < 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.6), k: 0, sat: 0, life: t.life * 0.7, gen: t.gen + 1, hue: t.hue });
      }

      // die
      const m = 60;
      if (t.life <= 0 || t.x < -m || t.x > W + m || t.y < -m || t.y > H + m) {
        nodes.push({ x: t.x, y: t.y, life: 1.4, hue: t.hue });
        tips.splice(i, 1);
      }
    }

    // cap nodes (drop oldest transient ones, keep roots)
    while (nodes.length > CFG.maxNodes) {
      let idx = 0;
      while (idx < nodes.length && nodes[idx].life >= 999) idx++;
      if (idx >= nodes.length) break;
      nodes.splice(idx, 1);
    }
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].life < 999) { nodes[i].life -= dts; if (nodes[i].life <= 0) nodes.splice(i, 1); }
    }

    // decay segments
    for (let i = segs.length - 1; i >= 0; i--) {
      segs[i].life -= dts;
      if (segs[i].life <= 0) segs.splice(i, 1);
    }
    while (segs.length > CFG.maxSegs) segs.shift();
  }

  // ---- render helpers: bucket by hue+alpha to keep draw calls tiny ----
  function ease(a) { return a * a * (3 - 2 * a); }

  const CORE_W = [1.55, 0.9];  // width class 0 = trunk strands, 1 = fine branches
  const HALO_W = [6.5, 4.5];

  function drawHyphae(g) {
    g.clear();
    // halo pass (wide, soft) then core pass (thin, bright)
    for (let pass = 0; pass < 2; pass++) {
      const groups = new Map(); // key (hue*2+widthClass)*BUCKETS+bucket -> segs
      for (const s of segs) {
        const a = ease(Math.max(0, Math.min(1, s.life / s.max)));
        let b = (a * BUCKETS) | 0; if (b >= BUCKETS) b = BUCKETS - 1;
        const key = (s.hue * 2 + s.w) * BUCKETS + b;
        let arr = groups.get(key); if (!arr) { arr = []; groups.set(key, arr); }
        arr.push(s);
      }
      for (const [key, arr] of groups) {
        const gk = (key / BUCKETS) | 0;
        const hue = (gk / 2) | 0, wb = gk % 2;
        const b = key % BUCKETS;
        const av = (b + 0.5) / BUCKETS;
        for (const s of arr) { g.moveTo(s.x1, s.y1); g.lineTo(s.x2, s.y2); }
        const AL = small ? 0.72 : 1; // dimmer on phones: text always wins
        if (pass === 0) g.stroke({ width: HALO_W[wb], color: HUES[hue], alpha: av * 0.14 * AL, cap: 'round', join: 'round' });
        else g.stroke({ width: CORE_W[wb], color: HUES[hue], alpha: av * 0.9 * AL, cap: 'round', join: 'round' });
      }
    }
    // glowing nodes
    const ng = new Map();
    for (const nd of nodes) {
      if (nd.life >= 999) continue;
      const a = ease(Math.max(0, Math.min(1, nd.life / 2.2)));
      let b = (a * BUCKETS) | 0; if (b >= BUCKETS) b = BUCKETS - 1;
      const key = nd.hue * BUCKETS + b;
      let arr = ng.get(key); if (!arr) { arr = []; ng.set(key, arr); }
      arr.push(nd);
    }
    for (const [key, arr] of ng) {
      const hue = (key / BUCKETS) | 0, b = key % BUCKETS, av = (b + 0.5) / BUCKETS;
      for (const nd of arr) g.circle(nd.x, nd.y, hue === 2 ? 2.6 : 1.8);
      g.fill({ color: HUES[hue], alpha: av * 0.9 });
    }
  }

  // ============================================================
  //  boot
  // ============================================================
  (async function init() {
    try {
      app = new PIXI.Application();
      await app.init({
        canvas,
        resizeTo: window,
        antialias: true,
        backgroundAlpha: 0,
        resolution: dpr,
        autoDensity: true,
        powerPreference: 'high-performance'
      });
    } catch (e) { bail(); return; }

    const glowTex = makeGlowTexture();

    // --- spores ---
    const sporeLayer = new PIXI.Container();
    sporeLayer.blendMode = 'add';
    app.stage.addChild(sporeLayer);
    const sprs = [];
    for (let i = 0; i < CFG.spores; i++) {
      const sp = new PIXI.Sprite(glowTex);
      sp.anchor.set(0.5);
      const r = Math.random();
      sp.tint = r < 0.68 ? HUES[0] : r < 0.9 ? HUES[1] : HUES[2];
      const sz = 1.4 + Math.random() * 3.6;
      sp.width = sp.height = sz * 3.2;
      sp.__ = {
        x: Math.random(), y: Math.random(),
        sz, base: 0.12 + Math.random() * 0.3,
        ph: Math.random() * Math.PI * 2, sp1: 0.00006 + Math.random() * 0.00012,
        drift: 0.06 + Math.random() * 0.16, rise: 0.004 + Math.random() * 0.012
      };
      sporeLayer.addChild(sp);
      sprs.push(sp);
    }

    // --- hyphae ---
    const hyphae = new PIXI.Graphics();
    const hyphaeLayer = new PIXI.Container();
    hyphaeLayer.blendMode = 'add';
    hyphaeLayer.addChild(hyphae);
    if (!small && !reduce) {
      try { hyphaeLayer.filters = [new PIXI.BlurFilter({ strength: 2, quality: 2 })]; } catch (e) {}
    }
    app.stage.addChild(hyphaeLayer);

    // --- cursor nutrient glow ---
    const cursor = new PIXI.Sprite(glowTex);
    cursor.anchor.set(0.5);
    cursor.tint = HUES[0];
    cursor.blendMode = 'add';
    cursor.width = cursor.height = 120;
    cursor.alpha = 0;
    app.stage.addChild(cursor);
    let cx = -9999, cy = -9999, camt = 0;

    function size() { return { W: app.renderer.width / app.renderer.resolution, H: app.renderer.height / app.renderer.resolution }; }

    let dim = size();
    seedRoots(dim.W, dim.H);
    // sprout initial growth up into the hero, before any cursor move
    for (let i = 0; i < 4; i++) nutrients.push({ x: dim.W * (0.3 + Math.random() * 0.4), y: dim.H * (0.2 + Math.random() * 0.3), life: 2.4, str: 1 });
    for (let i = 0; i < (small ? 5 : 9); i++) {
      const r = roots[(Math.random() * roots.length) | 0];
      tips.push({ x: r.x, y: r.y, ex: r.x, ey: r.y, a: -Math.PI / 2 + (Math.random() - 0.5) * 1.1, k: 0, sat: 0, life: 2.2 + Math.random() * 1.2, gen: 0, hue: Math.random() < 0.16 ? 1 : 0 });
    }

    // pointer
    function onMove(clientX, clientY) {
      pointer.x = clientX; pointer.y = clientY; pointer.active = true; idle = 0;
      const dx = pointer.x - pointer.px, dy = pointer.y - pointer.py;
      if (Math.hypot(dx, dy) > CFG.depositDist) {
        deposit(pointer.x, pointer.y);
        pointer.px = pointer.x; pointer.py = pointer.y;
      }
    }
    window.addEventListener('pointermove', e => onMove(e.clientX, e.clientY), { passive: true });
    window.addEventListener('touchmove', e => { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    window.addEventListener('pointerdown', e => { onMove(e.clientX, e.clientY); deposit(e.clientX, e.clientY); }, { passive: true });

    window.addEventListener('resize', () => { dim = size(); seedRoots(dim.W, dim.H); });

    // reduced motion: build a static network, render once, stop the ticker.
    if (reduce) {
      // forage a pleasing static network deterministically
      idle = 2;
      for (let k = 0; k < 340; k++) { ambient(1 / 60, dim.W, dim.H); step(1, 1 / 60, dim.W, dim.H); }
      // freeze segment alpha mid-life for a full look
      for (const s of segs) s.life = s.max * 0.8;
      drawHyphae(hyphae);
      for (const sp of sprs) {
        sp.x = sp.__.x * dim.W; sp.y = sp.__.y * dim.H; sp.alpha = sp.__.base;
      }
      app.render();
      app.ticker.stop(); // no per-frame work at all under reduced motion
      window.addEventListener('resize', () => {
        // wait two frames so PIXI's queued renderer resize has applied,
        // then re-place spores and paint one fresh frame
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const d2 = size();
          for (const sp of sprs) { sp.x = sp.__.x * d2.W; sp.y = sp.__.y * d2.H; }
          app.render();
        }));
      });
      return; // no ticker loop
    }

    // pause all per-frame work when the tab is hidden OR the canvas leaves
    // the viewport (fixed full-bleed, so IO rarely fires — belt and braces)
    let hidden = false, onscreen = true;
    function syncTicker() { if (hidden || !onscreen) app.ticker.stop(); else app.ticker.start(); }
    document.addEventListener('visibilitychange', () => { hidden = document.hidden; syncTicker(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        onscreen = entries[entries.length - 1].isIntersecting;
        syncTicker();
      }).observe(canvas);
    }

    let intro = 0;
    app.ticker.maxFPS = 60;
    app.ticker.add((tk) => {
      const dt = Math.min(tk.deltaTime, 2.2);
      const dts = Math.min(tk.deltaMS / 1000, 0.05);
      dim = size();
      intro = Math.min(1, intro + dts / 0.9);
      idle += dts;

      ambient(dts, dim.W, dim.H);
      step(dt, dts, dim.W, dim.H);
      drawHyphae(hyphae);
      hyphae.alpha = intro;

      // spores
      const time = performance.now();
      for (const sp of sprs) {
        const d = sp.__;
        d.y -= d.rise * dts;
        if (d.y < -0.03) { d.y = 1.03; d.x = Math.random(); }
        const wob = Math.sin(time * d.sp1 + d.ph);
        sp.x = (d.x * dim.W) + wob * d.drift * 60;
        sp.y = d.y * dim.H + Math.cos(time * d.sp1 * 0.7 + d.ph) * d.drift * 34;
        sp.alpha = (d.base * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 0.0009 + d.ph)))) * intro;
      }

      // cursor nutrient glow follows with ease, pulses, dims when idle
      if (pointer.active) {
        if (cx < -9000) { cx = pointer.x; cy = pointer.y; }
        cx += (pointer.x - cx) * 0.18; cy += (pointer.y - cy) * 0.18;
        cursor.x = cx; cursor.y = cy;
        const target = idle < 0.4 ? 1 : 0.18;
        camt += (target - camt) * 0.08;
        const pulse = 0.85 + 0.15 * Math.sin(time * 0.005);
        cursor.alpha = camt * 0.5 * intro;
        cursor.width = cursor.height = 120 * pulse * (0.8 + camt * 0.5);
      }
    });
  })();
})();
