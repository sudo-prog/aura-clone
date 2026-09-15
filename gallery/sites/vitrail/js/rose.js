/* ATELIER VITRAIL — the rose: generator, builder, sun engine, motes.
   The rose is drawn once into #rose-def (inside the window svg);
   the floor pool <use>s the same definition, so window and cast
   light are literally the same leaded glass. */
'use strict';

(() => {
  const V = window.VITRAIL;
  const LEAD = '#17181a';
  const roseRoot = document.getElementById('rose-def');
  const hero = document.querySelector('.nave');
  if (!roseRoot || !hero) return;

  /* ── ring radii ─────────────────────────────────────── */
  const RD = {
    ocRim: 21, petIn: 23.5, petBase: 25, petTip: 54.5,
    armA: 60.5, rndC: 74, armB: 87.5, brdIn: 89, brdOut: 100,
  };

  /* ── paint: one wedge's color program ───────────────── */
  function makePaint(rng, weights, ground) {
    const petalMain = V.pick(rng, weights);
    return {
      ground,
      ground2: V.shade(ground, -0.05),
      petalMain,
      petalHead: V.pickNot(rng, weights, petalMain),
      eye: V.pickNot(rng, weights, petalMain),
      disc: V.pick(rng, weights),
      foilA: V.pick(rng, weights),
      foilB: V.pick(rng, weights),
      center: V.pick(rng, weights),
      borderA: V.pick(rng, weights),
      borderB: V.pick(rng, weights),
    };
  }
  const rotWeights = w => [w[1], w[0], ...w.slice(2)];

  /* ── pane factories ─────────────────────────────────── */
  function pane(parent, d, fill, sw, delay, rng) {
    const p = V.el('path', {
      d, class: 'pane',
      fill: V.shade(fill, (rng() - 0.5) * 0.11),
      stroke: LEAD, 'stroke-width': sw, 'stroke-linejoin': 'round',
    }, parent);
    p.style.setProperty('--d', Math.round(delay) + 'ms');
    return p;
  }
  function circlePane(parent, cx, cy, r, fill, sw, delay, rng) {
    const p = V.el('circle', {
      cx: cx.toFixed(2), cy: cy.toFixed(2), r: r.toFixed(2), class: 'pane',
      fill: V.shade(fill, (rng() - 0.5) * 0.11),
      stroke: LEAD, 'stroke-width': sw,
    }, parent);
    p.style.setProperty('--d', Math.round(delay) + 'ms');
    return p;
  }

  /* ── one wedge of the rose (centered on "up") ───────── */
  function buildWedge(g, seed, opt) {
    const rng = V.mulberry32(seed);
    const { half, pv, rv, bs, paint } = opt;
    const A1 = -90 - half, A2 = -90 + half;

    /* ground glass, petal ring */
    pane(g, V.annSector(RD.petIn, RD.armA, A1, A2), paint.ground, 1.7, 420, rng);
    /* ground glass, roundel ring */
    pane(g, V.annSector(RD.armA, RD.armB, A1, A2), paint.ground2, 1.7, 760, rng);

    /* ── petal ── */
    const rb = RD.petBase, ra = RD.petTip;
    const ba = half * 0.66;
    const p2 = a => [V.px(rb, a), V.py(rb, a)];
    const baseL = p2(-90 - ba), baseR = p2(-90 + ba);
    const apex = [0, -ra];
    const rc = 42, ca = ba * 1.35;
    const cL = [V.px(rc, -90 - ca), V.py(rc, -90 - ca)];
    const cR = [V.px(rc, -90 + ca), V.py(rc, -90 + ca)];
    const XY = V.XY;
    const innerArc = `A${rb},${rb} 0 0 1 `;

    if (pv === 0) {
      /* split petal + eye */
      const baseM = [0, -rb];
      pane(g, `M${XY(baseL)} ${innerArc}${XY(baseM)} L${XY(apex)} Q${XY(cL)} ${XY(baseL)} Z`,
        paint.petalMain, 1.3, 480, rng);
      pane(g, `M${XY(baseM)} ${innerArc}${XY(baseR)} Q${XY(cR)} ${XY(apex)} L${XY(baseM)} Z`,
        paint.petalMain, 1.3, 520, rng);
      circlePane(g, 0, -40, 6.2, paint.eye, 1.1, 600, rng);
    } else if (pv === 1) {
      /* petal cut into drop + head */
      const t = 0.58;
      const L = V.qSplit(baseL, cL, apex, t);
      const R = V.qSplit(baseR, cR, apex, t);
      const mL = L.m, mR = R.m;
      const bow = [0, (mL[1] + mR[1]) / 2 - 5];
      pane(g, `M${XY(baseL)} ${innerArc}${XY(baseR)} Q${XY(R.lower[1])} ${XY(mR)} ` +
        `Q${XY(bow)} ${XY(mL)} Q${XY(L.lower[1])} ${XY(baseL)} Z`,
        paint.petalMain, 1.3, 480, rng);
      pane(g, `M${XY(mL)} Q${XY(L.upper[1])} ${XY(apex)} Q${XY(R.upper[1])} ${XY(mR)} ` +
        `Q${XY(bow)} ${XY(mL)} Z`,
        paint.petalHead, 1.3, 560, rng);
      if (rng() < 0.55) circlePane(g, 0, -33.5, 4.4, paint.eye, 1, 620, rng);
    } else {
      /* whole petal + trefoil head */
      pane(g, `M${XY(baseL)} ${innerArc}${XY(baseR)} Q${XY(cR)} ${XY(apex)} Q${XY(cL)} ${XY(baseL)} Z`,
        paint.petalMain, 1.3, 480, rng);
      circlePane(g, 0, -47.5, 4.4, paint.petalHead, 1, 560, rng);
      circlePane(g, -4.9, -38.8, 4.4, paint.eye, 1, 590, rng);
      circlePane(g, 4.9, -38.8, 4.4, paint.petalHead, 1, 620, rng);
    }

    /* ── roundel ── */
    const rr = Math.min(RD.rndC * Math.sin(V.rad(half)) * 0.86, 11.6);
    const rg = V.el('g', { transform: `translate(0,-${RD.rndC})` }, g);
    circlePane(rg, 0, 0, rr, paint.disc, 1.4, 820, rng);
    if (rv === 0) {
      /* quatrefoil */
      for (let i = 0; i < 4; i++) {
        const a = 45 + i * 90;
        circlePane(rg, V.px(rr * 0.46, a), V.py(rr * 0.46, a), rr * 0.4,
          i % 2 ? paint.foilA : paint.foilB, 1, 860 + i * 22, rng);
      }
      circlePane(rg, 0, 0, rr * 0.2, paint.center, 0.9, 950, rng);
    } else if (rv === 1) {
      /* six-part rosette */
      const rp = rr * 0.8;
      for (let i = 0; i < 6; i++) {
        const a1 = i * 60 - 90, a2 = a1 + 60;
        pane(rg, `M0,0 L${V.pt(rp, a1)} A${rp},${rp} 0 0 1 ${V.pt(rp, a2)} Z`,
          i % 2 ? paint.foilA : paint.foilB, 1, 860 + i * 15, rng);
      }
      circlePane(rg, 0, 0, rr * 0.24, paint.center, 0.9, 960, rng);
    } else {
      /* eight-point star */
      let d = '';
      for (let i = 0; i < 16; i++) {
        const a = -90 + i * 22.5;
        const r = i % 2 ? rr * 0.36 : rr * 0.82;
        d += (i ? 'L' : 'M') + V.pt(r, a) + ' ';
      }
      pane(rg, d + 'Z', paint.foilA, 1, 880, rng);
      circlePane(rg, 0, 0, rr * 0.18, paint.center, 0.9, 960, rng);
    }
    /* filler foil at wedge edge when roundels sit far apart */
    const gap = 2 * RD.rndC * Math.sin(V.rad(half)) - 2 * rr;
    if (gap > 9) {
      circlePane(g, V.px(RD.rndC, -90 + half), V.py(RD.rndC, -90 + half), 3.6,
        paint.foilB, 0.9, 980, rng);
    }

    /* ── border billets ── */
    const step = (half * 2) / bs;
    for (let s = 0; s < bs; s++) {
      pane(g, V.annSector(RD.brdIn, RD.brdOut, A1 + s * step, A1 + (s + 1) * step),
        s % 2 ? paint.borderA : paint.borderB, 1.4, 1140 + s * 30, rng);
    }
  }

  /* ── full rose ──────────────────────────────────────── */
  function composeRose(cfg) {
    const rng = V.mulberry32(cfg.seed);
    const pal = V.PALETTES[cfg.pal];
    const N = cfg.fold, wa = 360 / N, half = wa / 2;

    roseRoot.classList.remove('lit');
    roseRoot.textContent = '';

    const pv = Math.floor(rng() * 3);
    const rv = Math.floor(rng() * 3);
    const bs = rng() < 0.5 ? 2 : 3;
    const altern = N % 2 === 0 && rng() < 0.6;
    const paintA = makePaint(rng, pal.weights, pal.ground);
    const paintB = altern
      ? makePaint(rng, rotWeights(pal.weights), V.shade(pal.ground, -0.02))
      : paintA;

    const defs = V.el('defs', null, roseRoot);
    const wa1 = V.el('g', { id: 'wedge-A' }, defs);
    buildWedge(wa1, (cfg.seed ^ 0x9e37) >>> 0, { half, pv, rv, bs, paint: paintA });
    if (altern) {
      const wb = V.el('g', { id: 'wedge-B' }, defs);
      buildWedge(wb, (cfg.seed ^ 0x9e37) >>> 0, { half, pv, rv, bs, paint: paintB });
    }

    /* glass gets the waviness displacement; lead armature stays crisp */
    const glass = V.el('g', { filter: 'url(#waviness)' }, roseRoot);
    for (let i = 0; i < N; i++) {
      V.el('use', {
        href: '#wedge-' + (altern && i % 2 ? 'B' : 'A'),
        transform: `rotate(${(i * wa).toFixed(3)})`,
      }, glass);
    }

    /* oculus */
    const oc = V.el('g', null, glass);
    circlePane(oc, 0, 0, RD.ocRim, V.shade(paintA.ground, 0.04), 1.5, 40, rng);
    const m = N;
    const rf = Math.min(13.4 * Math.sin(Math.PI / m) * 1.15, 4.8);
    for (let i = 0; i < m; i++) {
      const a = -90 + half + i * wa;
      circlePane(oc, V.px(13.4, a), V.py(13.4, a), rf,
        i % 2 ? paintA.foilA : paintA.eye, 0.9, 140 + i * 12, rng);
    }
    circlePane(oc, 0, 0, 7.4, paintA.petalHead, 1.2, 90, rng);

    /* armature */
    const arm = V.el('g', {
      class: 'lead-art', fill: 'none',
      stroke: '#141518', 'stroke-linecap': 'round',
    }, roseRoot);
    const rings = [[RD.ocRim, 2.6], [RD.armA, 3], [RD.armB, 3], [100.3, 4.4]];
    for (const [r, w] of rings) V.el('circle', { r, 'stroke-width': w }, arm);
    for (let i = 0; i < N; i++) {
      const a = -90 + half + i * wa;
      V.el('line', {
        x1: V.px(RD.petIn, a).toFixed(2), y1: V.py(RD.petIn, a).toFixed(2),
        x2: V.px(RD.armB, a).toFixed(2), y2: V.py(RD.armB, a).toFixed(2),
        'stroke-width': 2.4,
      }, arm);
    }
    /* solder sheen */
    const sheen = V.el('g', { stroke: '#51545c', opacity: 0.45 }, arm);
    for (const [r] of rings) V.el('circle', { r: r - 0.4, 'stroke-width': 0.7 }, sheen);

    /* bloom */
    if (V.reduceMotion) {
      roseRoot.classList.add('lit');
    } else {
      requestAnimationFrame(() => requestAnimationFrame(() => roseRoot.classList.add('lit')));
    }
  }

  /* ── stone voussoirs around the window (static) ─────── */
  (() => {
    const vg = document.querySelector('.rose-window .voussoirs');
    if (!vg) return;
    for (let i = 0; i < 36; i++) {
      const a = i * 10;
      V.el('line', {
        x1: V.px(104.5, a).toFixed(2), y1: V.py(104.5, a).toFixed(2),
        x2: V.px(114.5, a).toFixed(2), y2: V.py(114.5, a).toFixed(2),
        stroke: '#101114', 'stroke-width': 1.4,
      }, vg);
    }
  })();

  /* ── builder ────────────────────────────────────────── */
  const cfg = { fold: 12, pal: 'chartres', seed: 1487 };

  function setBeamColors() {
    const b = V.PALETTES[cfg.pal].beam;
    hero.style.setProperty('--bc1', b[0]);
    hero.style.setProperty('--bc2', b[1]);
    hero.style.setProperty('--bc3', b[2]);
    hero.style.setProperty('--halo', b[0]);
  }

  let surgeT = 0;
  function surge() {
    hero.classList.add('surge');
    clearTimeout(surgeT);
    surgeT = setTimeout(() => hero.classList.remove('surge'), 750);
  }

  function pressGroup(btns, active) {
    btns.forEach(b => b.setAttribute('aria-pressed', String(b === active)));
  }

  const foldBtns = [...document.querySelectorAll('[data-fold]')];
  foldBtns.forEach(b => b.addEventListener('click', () => {
    cfg.fold = +b.dataset.fold;
    pressGroup(foldBtns, b);
    composeRose(cfg);
    surge();
  }));

  const palBtns = [...document.querySelectorAll('[data-pal]')];
  palBtns.forEach(b => b.addEventListener('click', () => {
    cfg.pal = b.dataset.pal;
    pressGroup(palBtns, b);
    setBeamColors();
    composeRose(cfg);
    surge();
  }));

  const recastBtn = document.querySelector('[data-recast]');
  recastBtn?.addEventListener('click', () => {
    cfg.seed = (Math.random() * 0x7fffffff) | 0;
    composeRose(cfg);
    surge();
    const glyph = recastBtn.querySelector('.rc-i');
    if (glyph && !V.reduceMotion) {
      glyph.classList.remove('spin');
      void glyph.offsetWidth; /* restart the animation */
      glyph.classList.add('spin');
    }
  });

  setBeamColors();
  composeRose(cfg);

  /* ── dust motes ─────────────────────────────────────── */
  (() => {
    const box = document.querySelector('.motes');
    if (!box || V.reduceMotion) return;
    const r = V.mulberry32(7136);
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('span');
      s.style.setProperty('--l', (6 + r() * 88).toFixed(1) + '%');
      s.style.setProperty('--t', (4 + r() * 92).toFixed(1) + '%');
      s.style.setProperty('--s', (1.6 + r() * 1.9).toFixed(2) + 'px');
      s.style.setProperty('--dur', (9 + r() * 10).toFixed(2) + 's');
      s.style.setProperty('--del', (-r() * 18).toFixed(2) + 's');
      s.style.setProperty('--o', (0.25 + r() * 0.45).toFixed(2));
      s.style.setProperty('--dx', ((r() - 0.5) * 22).toFixed(1) + 'px');
      box.appendChild(s);
    }
  })();

  /* ── sun engine ─────────────────────────────────────── */
  const DAY = 180; /* seconds, dawn → dusk */
  const hourEl = document.querySelector('[data-hour]');
  const timeEl = document.querySelector('[data-time]');
  const dirEl = document.querySelector('[data-dir]');
  const HOURS = [[6, 'PRIME'], [9, 'TERCE'], [12, 'SEXT'], [15, 'NONE'], [18, 'VESPERS']];
  const DIRS = ['E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W'];
  let lastMinute = -1;

  const sceneEl = hero.querySelector('.scene');
  const lerpc = (a, b, t) => Math.round(a + (b - a) * t);

  /* geometry cache — the rAF loop never reads layout */
  let heroW = hero.clientWidth, heroH = hero.clientHeight;
  let sceneH = sceneEl ? sceneEl.clientHeight : heroH;

  function apply(t) {
    const az = t * 2 - 1;                    /* -1 dawn … +1 dusk */
    const alt = Math.sin(Math.PI * t);       /* 0 … 1 … 0        */
    const warm = Math.pow(1 - alt, 1.3);
    /* narrow viewports get a steeper, more vertical beam */
    const aspect = heroW / Math.max(1, heroH);
    const maxSkew = 26 * Math.max(0.35, Math.min(1, aspect / 1.5));
    const skew = -az * maxSkew;
    const beamH = sceneH * 0.47;
    const px = Math.tan(V.rad(skew)) * beamH * 0.8;

    const st = hero.style;
    st.setProperty('--skew', skew.toFixed(2) + 'deg');
    st.setProperty('--px', px.toFixed(1) + 'px');
    st.setProperty('--py', (6 + (1 - alt) * 58).toFixed(1) + 'px');
    st.setProperty('--pstretch', (1.12 + (1 - alt) * 0.9).toFixed(3));
    st.setProperty('--pool-op', ((0.16 + 0.84 * Math.pow(alt, 0.7)) * 0.95).toFixed(3));
    st.setProperty('--tint-op', (warm * (0.2 + 0.5 * alt)).toFixed(3));
    st.setProperty('--hx', (50 - az * 24).toFixed(1) + '%');
    st.setProperty('--beam-op', (0.35 + 0.65 * alt).toFixed(3));
    /* colour temperature: white-gold noon → ember at the day's edges */
    st.setProperty('--hotc',
      `rgb(${lerpc(255, 255, warm)} ${lerpc(246, 199, warm)} ${lerpc(222, 138, warm)})`);

    /* readout — update once a (solar) minute */
    const hour = 6 + t * 14;
    const minute = Math.floor(hour * 60);
    if (minute !== lastMinute && hourEl) {
      lastMinute = minute;
      let label = 'PRIME';
      for (const [h, name] of HOURS) if (hour >= h) label = name;
      hourEl.textContent = label;
      const hh = Math.floor(hour), mm = String(minute % 60).padStart(2, '0');
      timeEl.textContent = `${String(hh).padStart(2, '0')}:${mm}`;
      dirEl.textContent = 'SUN AT ' + DIRS[Math.max(0, Math.min(8, Math.round(t * 8)))];
    }
  }

  const remeasure = () => {
    heroW = hero.clientWidth; heroH = hero.clientHeight;
    sceneH = sceneEl ? sceneEl.clientHeight : heroH;
    if (V.reduceMotion) apply(0.62); /* keep the static beam true after resize */
  };
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(remeasure);
    ro.observe(hero);
    if (sceneEl) ro.observe(sceneEl);
  } else {
    addEventListener('resize', remeasure);
  }

  if (V.reduceMotion) {
    apply(0.62);
  } else {
    let acc = 0.3 * DAY;   /* begin mid-morning */
    let last = null;
    let heroVisible = true;
    let rafId = 0;

    const frame = now => {
      rafId = 0;
      if (last !== null) acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      apply((acc / DAY) % 1);
      schedule();
    };
    const schedule = () => {
      if (!rafId && heroVisible && !document.hidden) rafId = requestAnimationFrame(frame);
      if (!heroVisible || document.hidden) last = null;
    };
    new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      schedule();
    }).observe(hero);
    document.addEventListener('visibilitychange', schedule);
    schedule();
  }
})();
