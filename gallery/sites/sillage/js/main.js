/* ============================================================
   MAISON SILLAGE — the air of the page
   ambient perlin mist + note-hover vapor blooms (PIXI v8)
   ============================================================ */
(() => {
  'use strict';

  const doc = document.documentElement;
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------- simplex noise (3D) ---------------- */
  const SimplexNoise = (() => {
    const F3 = 1 / 3, G3 = 1 / 6;
    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
    class S {
      constructor(seed = 1349) {
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        let s = seed;
        const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
        for (let i = 255; i > 0; i--) {
          const j = Math.floor(rnd() * (i + 1));
          const t = p[i]; p[i] = p[j]; p[j] = t;
        }
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        for (let i = 0; i < 512; i++) {
          this.perm[i] = p[i & 255];
          this.permMod12[i] = this.perm[i] % 12;
        }
      }
      noise3(xin, yin, zin) {
        const { perm, permMod12 } = this;
        let n0, n1, n2, n3;
        const sk = (xin + yin + zin) * F3;
        const i = Math.floor(xin + sk), j = Math.floor(yin + sk), k = Math.floor(zin + sk);
        const t = (i + j + k) * G3;
        const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
        let i1, j1, k1, i2, j2, k2;
        if (x0 >= y0) {
          if (y0 >= z0)      { i1=1;j1=0;k1=0; i2=1;j2=1;k2=0; }
          else if (x0 >= z0) { i1=1;j1=0;k1=0; i2=1;j2=0;k2=1; }
          else               { i1=0;j1=0;k1=1; i2=1;j2=0;k2=1; }
        } else {
          if (y0 < z0)       { i1=0;j1=0;k1=1; i2=0;j2=1;k2=1; }
          else if (x0 < z0)  { i1=0;j1=1;k1=0; i2=0;j2=1;k2=1; }
          else               { i1=0;j1=1;k1=0; i2=1;j2=1;k2=0; }
        }
        const x1 = x0 - i1 + G3,   y1 = y0 - j1 + G3,   z1 = z0 - k1 + G3;
        const x2 = x0 - i2 + 2*G3, y2 = y0 - j2 + 2*G3, z2 = z0 - k2 + 2*G3;
        const x3 = x0 - 1 + 3*G3,  y3 = y0 - 1 + 3*G3,  z3 = z0 - 1 + 3*G3;
        const ii = i & 255, jj = j & 255, kk = k & 255;
        let t0 = .6 - x0*x0 - y0*y0 - z0*z0;
        if (t0 < 0) n0 = 0; else { const g = grad3[permMod12[ii+perm[jj+perm[kk]]]]; t0 *= t0; n0 = t0*t0*(g[0]*x0+g[1]*y0+g[2]*z0); }
        let t1 = .6 - x1*x1 - y1*y1 - z1*z1;
        if (t1 < 0) n1 = 0; else { const g = grad3[permMod12[ii+i1+perm[jj+j1+perm[kk+k1]]]]; t1 *= t1; n1 = t1*t1*(g[0]*x1+g[1]*y1+g[2]*z1); }
        let t2 = .6 - x2*x2 - y2*y2 - z2*z2;
        if (t2 < 0) n2 = 0; else { const g = grad3[permMod12[ii+i2+perm[jj+j2+perm[kk+k2]]]]; t2 *= t2; n2 = t2*t2*(g[0]*x2+g[1]*y2+g[2]*z2); }
        let t3 = .6 - x3*x3 - y3*y3 - z3*z3;
        if (t3 < 0) n3 = 0; else { const g = grad3[permMod12[ii+1+perm[jj+1+perm[kk+1]]]]; t3 *= t3; n3 = t3*t3*(g[0]*x3+g[1]*y3+g[2]*z3); }
        return 32 * (n0 + n1 + n2 + n3);
      }
    }
    return S;
  })();

  /* ---------------- small helpers ---------------- */
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToInt(r, g, b) { return (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b); }

  // jitter a hex color in HSL space → PIXI int tint
  function jitterColor(hex, dh = 8, dl = 7) {
    let [r, g, b] = hexToRgb(hex).map(v => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (mx === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    h = (h + rand(-dh, dh) / 360 + 1) % 1;
    const L = Math.min(.92, Math.max(.1, l + rand(-dl, dl) / 100));
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    let R, G, B;
    if (s === 0) { R = G = B = L; }
    else {
      const q = L < .5 ? L * (1 + s) : L + s - L * s;
      const p = 2 * L - q;
      R = hue2rgb(p, q, h + 1/3); G = hue2rgb(p, q, h); B = hue2rgb(p, q, h - 1/3);
    }
    return rgbToInt(R * 255, G * 255, B * 255);
  }

  /* ---------------- reveal choreography ---------------- */
  function initReveals() {
    const els = document.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }
    }, { threshold: .1, rootMargin: '0px 0px -7% 0px' });
    els.forEach(el => io.observe(el));

    const sections = document.querySelectorAll('.extrait');
    const io2 = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in-view'); io2.unobserve(e.target); }
      }
    }, { threshold: .25 });
    sections.forEach(s => io2.observe(s));
  }

  /* ---------------- header ---------------- */
  function initHeader() {
    const head = document.querySelector('.site-head');
    const onScroll = () => head.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------- puff textures ---------------- */
  function makePuffCanvas(size, blobs, soft) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const half = size / 2;
    const g = ctx.createRadialGradient(half, half, 0, half, half, half);
    g.addColorStop(0, `rgba(255,255,255,${soft})`);
    g.addColorStop(.55, `rgba(255,255,255,${soft * .45})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < blobs; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * half * .42;
      const x = half + Math.cos(a) * d, y = half + Math.sin(a) * d;
      const r = half * rand(.22, .5);
      const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, `rgba(255,255,255,${rand(.05, .16)})`);
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(0, 0, size, size);
    }
    return c;
  }

  // elongated ragged thread — the anatomy of rising smoke
  function makeThreadCanvas(size, narrow) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const half = size / 2;
    ctx.save();
    ctx.translate(half, half);
    ctx.scale(narrow, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, half);
    g.addColorStop(0, 'rgba(255,255,255,.5)');
    g.addColorStop(.55, 'rgba(255,255,255,.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-half / narrow, -half, size / narrow, size);
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const x = half + rand(-half * narrow * .6, half * narrow * .6);
      const y = half + rand(-half * .55, half * .55);
      const r = half * rand(.09, .2);
      const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, `rgba(255,255,255,${rand(.08, .2)})`);
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(0, 0, size, size);
    }
    return c;
  }

  /* ---------------- the air ---------------- */
  async function initAir() {
    const host = document.getElementById('mist');
    const app = new PIXI.Application();
    await app.init({
      resizeTo: window,
      backgroundAlpha: 0,
      antialias: false,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    host.appendChild(app.canvas);

    const noise = new SimplexNoise(20260708);
    const coarse = window.matchMedia('(hover:none)').matches || window.innerWidth < 700;

    const texA = PIXI.Texture.from(makePuffCanvas(256, 6, .34));
    const texB = PIXI.Texture.from(makePuffCanvas(256, 9, .26));
    const texWisp = PIXI.Texture.from(makePuffCanvas(192, 4, .4));
    const texThread = PIXI.Texture.from(makeThreadCanvas(224, .3));

    /* ambient mist */
    const HOUR_TINTS = {
      ambient: [120, 110, 98],   // warm smoke grey
      aube:    [168, 132, 82],   // candle gold
      gris:    [132, 120, 154],  // iris grey-violet
      minuit:  [94, 120, 78],    // vetiver green
    };
    let tintCur = [...HOUR_TINTS.ambient];
    let tintTarget = HOUR_TINTS.ambient;

    const mistLayer = new PIXI.Container();
    const vaporLayer = new PIXI.Container();
    app.stage.addChild(mistLayer, vaporLayer);

    const AMBIENT_N = coarse ? 16 : 30;
    const ambient = [];
    for (let i = 0; i < AMBIENT_N; i++) {
      const veil = i < (coarse ? 2 : 4); // a few vast, deep veils behind the puffs
      const sp = new PIXI.Sprite(veil ? texA : (Math.random() < .5 ? texA : texB));
      sp.anchor.set(.5);
      const target = veil ? rand(1300, 1900) : rand(480, 1100);
      const s = {
        sp,
        seed: rand(0, 1000),
        scale: target / 256,
        alphaBase: veil ? rand(.035, .055) : rand(.06, .105),
        x: rand(-200, window.innerWidth + 200),
        y: rand(-200, window.innerHeight + 200),
        rot: rand(0, Math.PI * 2),
        vr: rand(-.00004, .00004),
        speed: veil ? rand(3, 6) : rand(6, 13),
        par: veil ? rand(.03, .06) : rand(.08, .17), // scroll parallax depth
      };
      if (veil) sp.blendMode = 'screen';
      sp.rotation = s.rot;
      sp.scale.set(s.scale);
      sp.alpha = 0;           // fade the room in
      mistLayer.addChild(sp);
      ambient.push(s);
    }

    /* vapor pool */
    const MAXP = coarse ? 150 : 330;
    const pool = [];
    const live = [];
    function getParticle() {
      let p = pool.pop();
      if (!p) {
        if (live.length >= MAXP) return null;
        const sp = new PIXI.Sprite(texWisp);
        sp.anchor.set(.5);
        vaporLayer.addChild(sp);
        p = { sp };
      }
      p.sp.visible = true;
      return p;
    }
    function releaseParticle(p) {
      p.sp.visible = false;
      pool.push(p);
    }

    /* emitters, driven by the pyramid notes */
    const emitters = new Map();
    function spawn(em) {
      const p = getParticle();
      if (!p) return;
      const faint = !!em.faint;
      const roll = Math.random();
      const big = !faint && roll < .14;
      const thread = !big && (faint || roll > .58); // wisp anatomy: thin rising threads
      p.sp.texture = big ? (Math.random() < .5 ? texA : texB) : (thread ? texThread : texWisp);
      p.x = em.x + (faint ? rand(-10, 10) : (thread ? rand(-26, 26) : rand(-42, 42)));
      p.y = em.y + rand(-10, 8);
      p.vx = faint ? rand(-3, 3) : rand(-9, 9);
      p.vy = thread ? -rand(28, 52) : -rand(24, 48);
      p.age = 0;
      p.life = faint ? rand(5200, 8200) : (thread ? rand(4200, 7400) : rand(3600, 6600));
      p.seed = rand(0, 100);
      p.base = faint ? rand(.14, .24)
             : (big ? rand(.5, .9) : (thread ? rand(.3, .58) : rand(.12, .28)));
      p.alphaPeak = faint ? rand(.06, .11)
                  : (big ? rand(.05, .09) : (thread ? rand(.14, .3) : rand(.11, .24)));
      p.curl = big ? 20 : (thread ? 36 : 27);
      p.sp.tint = jitterColor(em.color);
      p.sp.blendMode = big ? 'screen' : 'add';
      p.sp.rotation = thread ? rand(-.3, .3) : rand(0, Math.PI * 2); // threads stay near-vertical
      p.vr = thread ? rand(-.00018, .00018) : rand(-.0004, .0004);
      p.sp.alpha = 0;
      p.sp.x = p.x; p.sp.y = p.y;
      p.sp.scale.set(p.base);
      live.push(p);
    }

    document.querySelectorAll('.note').forEach(note => {
      const color = note.dataset.vapor || '#C89A58';
      const start = (x, y, until) => emitters.set(note, { x, y, color, acc: 0, until });
      const stop = () => {
        // the exhale: one last breath released as you leave — the wake remains
        const em = emitters.get(note);
        if (em) for (let i = 0; i < 9; i++) spawn({ x: em.x + rand(-16, 16), y: em.y, color: em.color });
        emitters.delete(note);
      };

      note.addEventListener('pointerenter', e => {
        if (e.pointerType === 'touch') return;
        start(e.clientX, e.clientY, Infinity);
      });
      note.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return;
        const em = emitters.get(note);
        if (em) { em.x = e.clientX; em.y = e.clientY; }
      });
      note.addEventListener('pointerleave', stop);
      note.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'touch') return;
        start(e.clientX, e.clientY, performance.now() + 2800);
      });
      note.addEventListener('focus', () => {
        if (!note.matches(':focus-visible')) return; // keyboard only
        const r = note.querySelector('.note-name').getBoundingClientRect();
        start(r.left + r.width * .3, r.top + r.height * .5, Infinity);
      });
      note.addEventListener('blur', stop);
    });

    /* one candle, lower left — a thin thread of smoke while the hero is lit */
    const candle = {
      x: 0, y: 0, color: '#CBA76B', acc: 0, until: Infinity, faint: true, rate: 4,
      gate: () => window.scrollY < window.innerHeight * .95,
    };
    const placeCandle = () => {
      candle.x = Math.min(app.screen.width * .17, 330);
      candle.y = app.screen.height - 20;
    };
    placeCandle();
    window.addEventListener('resize', placeCandle);
    emitters.set('candle', candle);

    /* hour of day — which extrait owns the air right now */
    const hourSections = [...document.querySelectorAll('[data-hour]')];
    let hourDirty = true;
    window.addEventListener('scroll', () => { hourDirty = true; }, { passive: true });
    function resolveHour() {
      const mid = window.innerHeight / 2;
      let hour = 'ambient';
      for (const sec of hourSections) {
        const r = sec.getBoundingClientRect();
        if (r.top < mid && r.bottom > mid) { hour = sec.dataset.hour; break; }
      }
      tintTarget = HOUR_TINTS[hour] || HOUR_TINTS.ambient;
    }

    /* main loop */
    let time = 0;
    let bornAt = performance.now();
    let lastSY = window.scrollY;
    let stir = 0; // moving through the room disturbs the air
    const EMIT_RATE = coarse ? 20 : 34; // particles per second per emitter

    app.ticker.add(ticker => {
      const dt = Math.min(ticker.deltaMS, 66);
      time += dt;
      const dts = dt / 1000;
      const W = app.screen.width, H = app.screen.height;
      const M = 480;
      const fadeIn = Math.min(1, (performance.now() - bornAt) / 2400);

      const sy = window.scrollY;
      const dyS = sy - lastSY; lastSY = sy;
      stir = Math.min(1.5, stir * .93 + Math.abs(dyS) * .004);

      if (hourDirty) { hourDirty = false; resolveHour(); }
      tintCur[0] = lerp(tintCur[0], tintTarget[0], .016);
      tintCur[1] = lerp(tintCur[1], tintTarget[1], .016);
      tintCur[2] = lerp(tintCur[2], tintTarget[2], .016);
      const ambTint = rgbToInt(tintCur[0], tintCur[1], tintCur[2]);

      /* ambient drift — stirred by the visitor's movement through the room */
      const stirMul = 1 + stir * 1.8;
      for (const s of ambient) {
        const n = noise.noise3(s.x * .0006, s.y * .0006, time * .00004 + s.seed);
        const ang = n * Math.PI * 2;
        s.x += Math.cos(ang) * s.speed * stirMul * dts;
        s.y += (Math.sin(ang) * s.speed * stirMul - 2.5) * dts - dyS * s.par;
        if (s.x < -M) s.x = W + M; else if (s.x > W + M) s.x = -M;
        if (s.y < -M) s.y = H + M; else if (s.y > H + M) s.y = -M;
        s.rot += s.vr * dt;
        const breathe = .75 + .5 * (0.5 + 0.5 * noise.noise3(s.seed, time * .00012, 0));
        s.sp.alpha = s.alphaBase * breathe * fadeIn;
        s.sp.x = s.x; s.sp.y = s.y;
        s.sp.rotation = s.rot;
        s.sp.tint = ambTint;
      }

      /* emit */
      const now = performance.now();
      for (const [key, em] of emitters) {
        if (now > em.until) { emitters.delete(key); continue; }
        if (em.gate && !em.gate()) { em.acc = 0; continue; }
        em.acc += (em.rate || EMIT_RATE) * dts;
        while (em.acc >= 1) { em.acc -= 1; spawn(em); }
      }

      /* vapor life */
      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i];
        p.age += dt;
        const t = p.age / p.life;
        if (t >= 1) { live.splice(i, 1); releaseParticle(p); continue; }
        const n = noise.noise3(p.x * .0026, p.y * .0026, time * .00042 + p.seed);
        const ang = n * Math.PI * 3;
        p.vy -= 3.5 * dts;                      // buoyancy grows
        p.x += (p.vx + Math.cos(ang) * (p.curl || 27)) * dts;
        p.y += (p.vy + Math.sin(ang) * 11) * dts - dyS * .8; // the wake follows its note
        const env = t < .12 ? t / .12 : Math.pow(1 - (t - .12) / .88, 1.35);
        p.sp.alpha = p.alphaPeak * env;
        p.sp.scale.set(p.base * (1 + 1.6 * t));
        p.sp.rotation += p.vr * dt;
        p.sp.x = p.x; p.sp.y = p.y;
      }
    });

    /* discipline: stop breathing when unwatched —
       hidden tab, offscreen canvas, or stillness requested */
    let dead = false, onscreen = true;
    const syncTicker = () => {
      if (dead || document.hidden || !onscreen) app.ticker.stop();
      else app.ticker.start();
    };
    document.addEventListener('visibilitychange', syncTicker);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        onscreen = entries[entries.length - 1].isIntersecting;
        syncTicker();
      }).observe(host);
    }

    /* if the visitor asks for stillness mid-visit, grant it */
    reduceMQ.addEventListener('change', () => {
      if (reduceMQ.matches) {
        dead = true;
        app.ticker.stop();
        app.canvas.remove();
        doc.classList.add('rm');
      }
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    initReveals();
    initHeader();

    const scrim = document.getElementById('scrim');
    requestAnimationFrame(() => requestAnimationFrame(() => scrim.classList.add('lift')));

    if (reduceMQ.matches) { doc.classList.add('rm'); return; }
    if (typeof PIXI === 'undefined') { doc.classList.add('no-webgl'); return; }
    initAir().catch(() => doc.classList.add('no-webgl'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
