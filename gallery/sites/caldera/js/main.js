/* CALDERA 2027 — solar engine.
   Maps scroll position → time of day, lerps the entire palette, sun/moon,
   shadow geometry and heat shimmer across ten hand-tuned keyframes. */
(() => {
  'use strict';

  const doc = document.documentElement;
  const rmq = matchMedia('(prefers-reduced-motion: reduce)');
  let RM = rmq.matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, u) => a + (b - a) * u;

  /* ---------- seeded rng ---------- */
  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  /* ---------- keyframes ---------- */
  const HEX = ['skyTop', 'skyMid', 'skyHor', 'gFar', 'gNear', 'rim', 'sunCore', 'stoneLit', 'stoneShade', 'accent'];
  const RGBA = ['glowA', 'glowB', 'glowC', 'shCol'];
  const NUM = ['sunX', 'sunY', 'sunR', 'moonX', 'moonY', 'moonO', 'starsO', 'litDir', 'shSkew', 'shLen', 'glint', 'shim', 'windO', 'saltGlow', 'clock', 'temp'];

  const K = [
    { t: 0.000, skyTop: '2E2A4A', skyMid: '6B5680', skyHor: 'D08A5E', gFar: '46333A', gNear: '2B211F', rim: '37262E', sunCore: 'FFC98F', stoneLit: '9C7B66', stoneShade: '4B3830', accent: 'B0532B',
      glowA: [255, 150, 80, .50], glowB: [255, 110, 60, .22], glowC: [255, 140, 70, .10], shCol: [43, 26, 54, .42],
      sunX: .10, sunY: .86, sunR: 1.30, moonX: .20, moonY: 1.40, moonO: 0, starsO: .25, litDir: 95, shSkew: 55, shLen: 1.9, glint: 0, shim: 0, windO: 0, saltGlow: .06, clock: 5.12, temp: 9 },
    { t: 0.090, skyTop: '4A4D74', skyMid: '8E7B95', skyHor: 'E8B584', gFar: '5C4440', gNear: '3A2C26', rim: '44303A', sunCore: 'FFD9A4', stoneLit: 'B08A6C', stoneShade: '4E3A2E', accent: 'B0532B',
      glowA: [255, 170, 95, .55], glowB: [255, 120, 70, .25], glowC: [255, 160, 90, .13], shCol: [40, 26, 40, .42],
      sunX: .18, sunY: .60, sunR: 1.22, moonX: .20, moonY: 1.40, moonO: 0, starsO: 0, litDir: 100, shSkew: 48, shLen: 1.5, glint: .02, shim: 0, windO: 0, saltGlow: .04, clock: 6.28, temp: 11 },
    { t: 0.200, skyTop: '7F97B5', skyMid: 'B9BFC2', skyHor: 'E9DFC4', gFar: '8A684E', gNear: '6B4E3A', rim: '6E5140', sunCore: 'FFEECB', stoneLit: 'C7A98A', stoneShade: '55402F', accent: 'A84A24',
      glowA: [255, 236, 200, .50], glowB: [255, 220, 160, .16], glowC: [255, 240, 205, .12], shCol: [35, 25, 20, .40],
      sunX: .32, sunY: .30, sunR: 1.05, moonX: .20, moonY: 1.40, moonO: 0, starsO: 0, litDir: 118, shSkew: 34, shLen: .95, glint: .12, shim: .08, windO: 0, saltGlow: .02, clock: 8.33, temp: 24 },
    { t: 0.380, skyTop: '96AFC6', skyMid: 'CBD1CA', skyHor: 'EFE6CC', gFar: 'C3A176', gNear: 'A67C52', rim: '9A7C57', sunCore: 'FFFDF2', stoneLit: 'E2CBA6', stoneShade: '6E5943', accent: 'A3441F',
      glowA: [255, 252, 240, .70], glowB: [255, 248, 225, .22], glowC: [255, 252, 242, .30], shCol: [30, 22, 14, .45],
      sunX: .50, sunY: .11, sunR: .98, moonX: .20, moonY: 1.40, moonO: 0, starsO: 0, litDir: 180, shSkew: 0, shLen: .22, glint: 1, shim: 1, windO: 0, saltGlow: 0, clock: 12.00, temp: 39 },
    { t: 0.500, skyTop: '8FA6BE', skyMid: 'C6C8BE', skyHor: 'EBDFC2', gFar: 'BC9A70', gNear: '9E764E', rim: '92754F', sunCore: 'FFF7DF', stoneLit: 'DCC29C', stoneShade: '66513C', accent: 'A3441F',
      glowA: [255, 246, 220, .60], glowB: [255, 240, 205, .18], glowC: [255, 248, 225, .22], shCol: [31, 23, 16, .44],
      sunX: .60, sunY: .16, sunR: 1.00, moonX: .20, moonY: 1.40, moonO: 0, starsO: 0, litDir: 208, shSkew: -18, shLen: .50, glint: .30, shim: .50, windO: .05, saltGlow: 0, clock: 14.50, temp: 41 },
    { t: 0.620, skyTop: '6D6C96', skyMid: 'B08A84', skyHor: 'E0A468', gFar: '7A5240', gNear: '57392C', rim: '5E4133', sunCore: 'FFCE8A', stoneLit: 'D2996B', stoneShade: '4E362B', accent: 'B85327',
      glowA: [255, 190, 110, .55], glowB: [255, 150, 80, .20], glowC: [255, 180, 100, .15], shCol: [50, 28, 40, .44],
      sunX: .74, sunY: .38, sunR: 1.12, moonX: .16, moonY: .80, moonO: 0, starsO: 0, litDir: 242, shSkew: -42, shLen: 1.35, glint: .05, shim: .10, windO: .55, saltGlow: .08, clock: 17.67, temp: 33 },
    { t: 0.685, skyTop: '55416F', skyMid: '96617D', skyHor: 'D9743C', gFar: '5A3B3A', gNear: '3B2A2B', rim: '46303B', sunCore: 'FF9250', stoneLit: 'BE7C5C', stoneShade: '41302E', accent: 'C25E31',
      glowA: [255, 150, 80, .60], glowB: [255, 110, 60, .25], glowC: [255, 150, 80, .14], shCol: [42, 24, 44, .46],
      sunX: .84, sunY: .62, sunR: 1.26, moonX: .16, moonY: .70, moonO: 0, starsO: .02, litDir: 256, shSkew: -52, shLen: 1.9, glint: 0, shim: 0, windO: 1, saltGlow: .20, clock: 19.50, temp: 29 },
    { t: 0.735, skyTop: '3B2E5C', skyMid: '6E4C6E', skyHor: 'A85434', gFar: '402C33', gNear: '241A22', rim: '2F2130', sunCore: 'E06A38', stoneLit: '6E5468', stoneShade: '241C26', accent: 'C86A3E',
      glowA: [255, 120, 70, .35], glowB: [230, 90, 50, .14], glowC: [255, 110, 60, .10], shCol: [12, 10, 26, .22],
      sunX: .92, sunY: .97, sunR: 1.42, moonX: .16, moonY: .58, moonO: .30, starsO: .30, litDir: 262, shSkew: -22, shLen: .55, glint: 0, shim: 0, windO: .70, saltGlow: .55, clock: 20.50, temp: 24 },
    { t: 0.850, skyTop: '10142E', skyMid: '182046', skyHor: '23305E', gFar: '131730', gNear: '0C0F20', rim: '161A36', sunCore: 'E06A38', stoneLit: '5A628C', stoneShade: '171A2E', accent: '8E7BB8',
      glowA: [255, 120, 70, 0], glowB: [230, 90, 50, 0], glowC: [255, 110, 60, 0], shCol: [5, 8, 24, .34],
      sunX: 1.10, sunY: 1.40, sunR: 1.30, moonX: .50, moonY: .22, moonO: 1, starsO: 1, litDir: 120, shSkew: 30, shLen: 1.0, glint: 0, shim: 0, windO: .15, saltGlow: 1, clock: 22.67, temp: 10 },
    { t: 1.000, skyTop: '090D26', skyMid: '121A3E', skyHor: '1B2850', gFar: '0F132C', gNear: '090C1B', rim: '12162F', sunCore: 'E06A38', stoneLit: '525A84', stoneShade: '14172A', accent: '8E7BB8',
      glowA: [255, 120, 70, 0], glowB: [230, 90, 50, 0], glowC: [255, 110, 60, 0], shCol: [4, 7, 22, .30],
      sunX: 1.20, sunY: 1.50, sunR: 1.30, moonX: .78, moonY: .12, moonO: 1, starsO: 1, litDir: 140, shSkew: 10, shLen: .85, glint: 0, shim: 0, windO: .10, saltGlow: 1, clock: 24.87, temp: 6 }
  ];

  // pre-parse hexes → [r,g,b]
  const hex2rgb = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  for (const k of K) for (const c of HEX) k[c] = hex2rgb(k[c]);

  const PHASES = [
    [.055, 'FIRST LIGHT'], [.13, 'SUNRISE'], [.30, 'MORNING'], [.46, 'SOLAR NOON'],
    [.60, 'AFTERNOON'], [.685, 'GOLDEN HOUR'], [.735, 'SUNSET'], [.80, 'DUSK'],
    [.90, 'MOONRISE'], [1.01, 'NIGHT']
  ];

  const hudTime = document.getElementById('hudTime');
  const hudPhase = document.getElementById('hudPhase');
  const hudTemp = document.getElementById('hudTemp');
  const disp = document.getElementById('shimmerDisp');

  const rgbStr = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  const rgbaStr = (c) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3].toFixed(3)})`;
  const mix3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  const mix4 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)];

  let lastPhase = '', lastClock = '', lastTemp = '', lastShim = -1, shimOn = false;

  function apply(t) {
    let i = 0;
    while (i < K.length - 2 && t > K[i + 1].t) i++;
    const a = K[i], b = K[i + 1];
    const u = clamp((t - a.t) / (b.t - a.t), 0, 1);
    const s = doc.style;

    const skyTop = mix3(a.skyTop, b.skyTop, u);
    const skyMid = mix3(a.skyMid, b.skyMid, u);
    const skyHor = mix3(a.skyHor, b.skyHor, u);
    s.setProperty('--sky-top', rgbStr(skyTop));
    s.setProperty('--sky-mid', rgbStr(skyMid));
    s.setProperty('--sky-hor', rgbStr(skyHor));
    s.setProperty('--g-far', rgbStr(mix3(a.gFar, b.gFar, u)));
    s.setProperty('--g-near', rgbStr(mix3(a.gNear, b.gNear, u)));
    s.setProperty('--rim', rgbStr(mix3(a.rim, b.rim, u)));
    s.setProperty('--sun-core', rgbStr(mix3(a.sunCore, b.sunCore, u)));
    s.setProperty('--stone-lit', rgbStr(mix3(a.stoneLit, b.stoneLit, u)));
    s.setProperty('--stone-shade', rgbStr(mix3(a.stoneShade, b.stoneShade, u)));
    s.setProperty('--accent', rgbStr(mix3(a.accent, b.accent, u)));
    s.setProperty('--glow-a', rgbaStr(mix4(a.glowA, b.glowA, u)));
    s.setProperty('--glow-b', rgbaStr(mix4(a.glowB, b.glowB, u)));
    s.setProperty('--glow-c', rgbaStr(mix4(a.glowC, b.glowC, u)));
    s.setProperty('--sh-col', rgbaStr(mix4(a.shCol, b.shCol, u)));

    s.setProperty('--sun-x', lerp(a.sunX, b.sunX, u).toFixed(4));
    s.setProperty('--sun-y', lerp(a.sunY, b.sunY, u).toFixed(4));
    s.setProperty('--sun-r', lerp(a.sunR, b.sunR, u).toFixed(3));
    const moonY = lerp(a.moonY, b.moonY, u);
    s.setProperty('--moon-x', lerp(a.moonX, b.moonX, u).toFixed(4));
    s.setProperty('--moon-y', moonY.toFixed(4));
    s.setProperty('--moon-o', lerp(a.moonO, b.moonO, u).toFixed(3));
    // the crescent's shadow disc matches the sky AT the moon's altitude,
    // so a low moon at dusk never drags a navy circle through orange air
    const my = clamp(moonY, 0, 1);
    const shade = my < .44
      ? mix3(skyTop, skyMid, my / .44)
      : mix3(skyMid, skyHor, clamp((my - .44) / .30, 0, 1));
    s.setProperty('--moon-shade', rgbStr(shade));
    s.setProperty('--stars-o', lerp(a.starsO, b.starsO, u).toFixed(3));
    s.setProperty('--lit-dir', lerp(a.litDir, b.litDir, u).toFixed(1) + 'deg');
    s.setProperty('--sh-skew', lerp(a.shSkew, b.shSkew, u).toFixed(2) + 'deg');
    s.setProperty('--sh-len', lerp(a.shLen, b.shLen, u).toFixed(3));
    s.setProperty('--glint', lerp(a.glint, b.glint, u).toFixed(3));
    s.setProperty('--wind-o', lerp(a.windO, b.windO, u).toFixed(3));
    s.setProperty('--salt-glow', lerp(a.saltGlow, b.saltGlow, u).toFixed(3));

    // reading-surface flip: snaps mid-interlude; the CSS registered-property
    // transition eases it over time, so no scroll position rests gray-on-gray
    doc.classList.toggle('after-dusk', t > 0.71);

    // HUD
    const clock = lerp(a.clock, b.clock, u) % 24;
    let hh = Math.floor(clock), mm = Math.round((clock - hh) * 60);
    if (mm === 60) { hh = (hh + 1) % 24; mm = 0; }
    const clockStr = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    if (clockStr !== lastClock) { hudTime.textContent = clockStr; lastClock = clockStr; }
    const phase = PHASES.find(p => t < p[0])[1];
    if (phase !== lastPhase) { hudPhase.textContent = phase; lastPhase = phase; }
    const tempStr = Math.round(lerp(a.temp, b.temp, u)) + '°';
    if (tempStr !== lastTemp) { hudTemp.textContent = tempStr; lastTemp = tempStr; }

    // heat shimmer
    if (!RM) {
      const shim = lerp(a.shim, b.shim, u);
      const scale = shim * 11;
      if (Math.abs(scale - lastShim) > 0.3) { disp.setAttribute('scale', scale.toFixed(1)); lastShim = scale; }
      const on = shim > 0.04;
      if (on !== shimOn) { doc.classList.toggle('shimmering', on); shimOn = on; }
    }
  }

  /* ---------- scroll → t, with inertia ---------- */
  let target = 0, cur = null, applied = -1, raf = 0, lastTs = 0;

  function measure() {
    const max = doc.scrollHeight - innerHeight;
    target = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
    lastTs = ts;
    if (cur === null || RM) cur = target;
    else cur += (target - cur) * (1 - Math.exp(-dt * 6));
    if (Math.abs(cur - applied) > 0.00035 || applied < 0) { apply(cur); applied = cur; }
    else if (Math.abs(target - cur) < 0.0005) {
      // settled: idle the loop entirely; measure() rearms it on the next scroll
      cancelAnimationFrame(raf); raf = 0; lastTs = 0;
    }
  }

  addEventListener('scroll', measure, { passive: true });
  addEventListener('resize', measure, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; lastTs = 0; }
    else if (!raf) raf = requestAnimationFrame(frame);
  });

  const stripSmil = () => document.querySelectorAll('.defs animate').forEach(n => n.remove());
  if (RM) stripSmil();
  // honor a mid-session switch to reduced motion: kill the shimmer and its SMIL
  rmq.addEventListener('change', (e) => {
    RM = e.matches;
    if (RM) {
      stripSmil();
      doc.classList.remove('shimmering');
      shimOn = false; lastShim = -1;
      disp.setAttribute('scale', '0');
    }
  });

  measure();
  apply(target); cur = target; applied = target;
  // the sun only rises on load if the visit actually starts at dawn;
  // set synchronously (pre-first-paint) so the disc never flashes in place
  if (target < 0.04 && !RM) doc.classList.add('boot-dawn');
  raf = requestAnimationFrame(frame);

  /* ---------- star field ---------- */
  function starField(id, n, seed) {
    const host = document.getElementById(id);
    if (!host) return;
    const r = rng(seed);
    const shadows = [];
    for (let i = 0; i < n; i++) {
      const x = (r() * 100).toFixed(2), y = (r() * 74).toFixed(2);
      const spread = r() < .86 ? 0 : 1;
      const al = (.35 + .65 * r()).toFixed(2);
      shadows.push(`${x}vw ${y}vh 0 ${spread}px rgba(236,233,220,${al})`);
    }
    const dot = document.createElement('i');
    dot.style.cssText = 'position:absolute;width:1px;height:1px;border-radius:50%;background:transparent;box-shadow:' + shadows.join(',');
    host.appendChild(dot);
  }
  starField('stars', 90, 20270621);
  starField('starsB', 60, 20270923);

  /* ---------- scene builders ---------- */
  const mk = (cls, parent) => {
    const d = document.createElement('div');
    d.className = cls;
    parent.appendChild(d);
    return d;
  };

  // a monument = shadow twin + lit body, base on the ground line
  function monument(stage, shape, x, w, h, opts = {}) {
    const wrap = mk('mon-wrap', stage);
    wrap.style.left = x + '%';
    wrap.style.width = w + '%';
    wrap.style.height = h + '%';
    if (opts.bottom != null) wrap.style.bottom = opts.bottom;
    const sh = mk('mon-sh ' + shape, wrap);
    if (opts.shm != null) sh.style.setProperty('--shm', opts.shm);
    const m = mk('mon ' + shape, wrap);
    return { wrap, m };
  }

  const scenes = {};
  document.querySelectorAll('[data-scene]').forEach(n => { scenes[n.dataset.scene] = n; });

  function scaffold(scene) {
    mk('s-rim', scene);
    const ground = mk('s-ground', scene);
    const stage = mk('s-stage', scene);
    return { ground, stage };
  }

  // STATION 1 — Basalt Choir: 33 columns phrased in clustered intervals
  if (scenes.choir) {
    const { stage } = scaffold(scenes.choir);
    const r = rng(2701);
    const groups = [5, 3, 7, 4, 6, 3, 5];
    let x = 5.5;
    for (const count of groups) {
      const held = Math.floor(r() * count); // one tall "held note" per group
      for (let c = 0; c < count; c++) {
        const tall = c === held;
        const h = tall ? 50 + r() * 13 : 22 + r() * 26;
        const w = 1.05 + r() * 0.5;
        monument(stage, 'm-col', x + w / 2, w, h);
        x += w + 0.95 + r() * 0.5;
      }
      x += 3.2 + r() * 1.4;
    }
    monument(stage, 'm-fig', 93.5, 0.75, 13.5); // 1.7 m figure vs 7.4 m column
  }

  // STATION 2 — Mirror Fallow: rows of sky-filled mirrors on the ground band
  if (scenes.mirror) {
    const { ground, stage } = scaffold(scenes.mirror);
    const r = rng(2702);
    const rows = [
      { n: 18, w: 3.2, h: 6, bottom: 58 },
      { n: 14, w: 4.4, h: 10, bottom: 42 },
      { n: 10, w: 6.2, h: 14, bottom: 22 },
      { n: 7, w: 8.6, h: 19, bottom: 2 }
    ];
    let i = 0;
    for (const row of rows) {
      const gap = (96 - row.n * row.w) / (row.n + 1);
      for (let c = 0; c < row.n; c++) {
        const m = mk('mirror', ground);
        m.style.left = (2 + gap + c * (row.w + gap) + (r() - .5) * gap * .8) + '%';
        m.style.bottom = (row.bottom + (r() - .5) * 3) + '%';
        m.style.width = row.w + '%';
        m.style.height = row.h + '%';
        m.style.transform = `rotate(${((r() - .5) * 3).toFixed(2)}deg)`;
        m.style.setProperty('--gm', (i % 6 === 0 ? 1 : .3 + r() * .3).toFixed(2));
        i++;
      }
    }
    monument(stage, 'm-fig', 92.5, 0.8, 15);
  }

  // STATION 3 — Seed Vault Dome
  if (scenes.dome) {
    const { stage } = scaffold(scenes.dome);
    monument(stage, 'm-dome', 46, 33, 42, { shm: 0.5 });
    monument(stage, 'm-door', 46, 2.4, 11, { shm: 0 });
    monument(stage, 'm-fig', 68, 0.8, 15.5); // 1.7 m vs 4.6 m dome
    monument(stage, 'm-col', 8, 1.1, 9);     // waymark stone
  }

  // STATION 4 — Wind Organ: 19 pipes, tallest off-center
  if (scenes.organ) {
    const { stage } = scaffold(scenes.organ);
    const r = rng(2704);
    const n = 19;
    let tallestX = 0, tallestH = 0;
    let x = 21;
    for (let i = 0; i < n; i++) {
      const bias = 1 - Math.abs(i - 11.5) / 11.5; // crest near 60%
      const meters = 3 + (11.2 - 3) * Math.pow(bias, 1.35) * (0.72 + r() * 0.28);
      const h = (meters / 11.2) * 66;
      const w = 0.62 + r() * 0.22;
      monument(stage, 'm-pipe', x, w, h);
      if (h > tallestH) { tallestH = h; tallestX = x; }
      x += 2.0 + r() * 1.6;
    }
    monument(stage, 'm-fig', 90, 0.8, 10); // 1.7 m vs 11.2 m pipe
    [[52, .5], [96, .3], [148, .18]].forEach(([size, am]) => {
      const arc = mk('arc', stage);
      arc.style.left = tallestX + '%';
      arc.style.top = (100 - tallestH) + '%';
      arc.style.width = size + 'px';
      arc.style.height = size + 'px';
      arc.style.setProperty('--am', am);
    });
  }

  // STATION 5 — Salt Spiral: generated archimedean spiral, oblique plan
  if (scenes.spiral) {
    scaffold(scenes.spiral);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 800 260');
    svg.setAttribute('class', 'spiral-svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
    const turns = 5.25, steps = Math.round(turns * 64);
    const cx = 400, cy = 132, r0 = 8, r1 = 186, squash = 0.34;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const th = (i / 64) * Math.PI * 2;
      const rr = r0 + (r1 - r0) * (i / steps);
      const px = cx + rr * Math.cos(th);
      const py = cy + rr * Math.sin(th) * squash;
      d += (i ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1);
    }
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    glow.setAttribute('d', d); glow.setAttribute('class', 'spiral-glow');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d); path.setAttribute('class', 'spiral');
    svg.appendChild(glow); svg.appendChild(path);
    scenes.spiral.appendChild(svg);
    // figure standing at the spiral's center
    monument(scenes.spiral, 'm-fig', 50, 0.8, 9, { bottom: '20%' });
  }

  /* ---------- scroll reveals ---------- */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
  document.querySelectorAll('.reveal').forEach(n => io.observe(n));

  /* ---------- boot choreography ---------- */
  const boot = () => doc.classList.add('boot');
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot);
    setTimeout(boot, 1600); // safety
  } else boot();
})();
