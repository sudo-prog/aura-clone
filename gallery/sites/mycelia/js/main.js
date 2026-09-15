/* ============================================================
   Mycelia — load & scroll choreography + procedural glow plates
   ============================================================ */
(function () {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof gsap !== 'undefined';

  /* ---------- procedural glow-gallery plates ---------- */
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const PLATES = [
    { id: 'ML-0071·a', sp: 'Panellus stipticus', exp: 'f/1.4 · 512 s · ISO 6400 — Cold Lamp Ridge', hue: '#5cf0a6', form: 'gills', seed: 71 },
    { id: 'ML-0143·c', sp: 'Mycena chlorophos', exp: 'f/1.8 · 720 s · ISO 12800 — Aokigahara', hue: '#8be7ff', form: 'umbrella', seed: 143 },
    { id: 'ML-0202·b', sp: 'Omphalotus olearius', exp: 'f/1.4 · 384 s · ISO 6400 — Daisetsuzan', hue: '#7dffbf', form: 'gills', seed: 202 },
    { id: 'ML-0311·a', sp: 'Armillaria mellea', exp: 'f/1.2 · 900 s · ISO 25600 — Cascadia home wood', hue: '#67e6a0', form: 'web', seed: 311 },
    { id: 'ML-0143·f', sp: 'Mycena chlorophos', exp: 'f/2.0 · 640 s · ISO 12800 — Ribeira Valley', hue: '#a6ecff', form: 'umbrella', seed: 1439 },
    { id: 'ML-0071·d', sp: 'Panellus stipticus', exp: 'f/1.4 · 480 s · ISO 8000 — Loam Station cultivar', hue: '#6ff2b0', form: 'web', seed: 719 }
  ];

  function hexRGB(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

  function drawPlate(cv, p) {
    const W = 480, H = 600; cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const R = rng(p.seed);
    const [r, gr, b] = hexRGB(p.hue);
    // loam base
    const bg = g.createRadialGradient(W * 0.5, H * 0.62, 0, W * 0.5, H * 0.62, H * 0.8);
    bg.addColorStop(0, '#0d0b07'); bg.addColorStop(1, '#050403');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);

    g.globalCompositeOperation = 'lighter';
    const cx = W * (0.42 + R() * 0.16), cy = H * (0.4 + R() * 0.16);

    // soft body glow
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, H * 0.5);
    glow.addColorStop(0, `rgba(${r},${gr},${b},0.5)`);
    glow.addColorStop(0.25, `rgba(${r},${gr},${b},0.16)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow; g.fillRect(0, 0, W, H);

    g.lineCap = 'round';
    if (p.form === 'gills' || p.form === 'umbrella') {
      const N = p.form === 'umbrella' ? 26 : 40;
      const spread = p.form === 'umbrella' ? Math.PI * 1.15 : Math.PI * 0.9;
      const a0 = p.form === 'umbrella' ? Math.PI * 0.5 - spread / 2 : Math.PI * 0.35;
      const rad = p.form === 'umbrella' ? H * 0.3 : H * 0.42;
      for (let i = 0; i < N; i++) {
        const a = a0 + (i / (N - 1)) * spread + (R() - 0.5) * 0.05;
        const len = rad * (0.55 + R() * 0.5);
        const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len;
        const grd = g.createLinearGradient(cx, cy, ex, ey);
        grd.addColorStop(0, `rgba(${r},${gr},${b},0.85)`);
        grd.addColorStop(1, `rgba(${r},${gr},${b},0)`);
        g.strokeStyle = grd; g.lineWidth = 0.8 + R() * 1.4;
        g.beginPath();
        g.moveTo(cx, cy);
        const mx = cx + Math.cos(a) * len * 0.5 + (R() - 0.5) * 8;
        const my = cy + Math.sin(a) * len * 0.5 + (R() - 0.5) * 8;
        g.quadraticCurveTo(mx, my, ex, ey);
        g.stroke();
      }
      // domed cap for the parasol species (reads as a tiny mushroom)
      if (p.form === 'umbrella') {
        const capR = rad * 0.62;
        g.lineWidth = 2.2;
        const cap = g.createLinearGradient(cx - capR, cy, cx + capR, cy);
        cap.addColorStop(0, `rgba(${r},${gr},${b},0)`);
        cap.addColorStop(0.5, `rgba(${r},${gr},${b},0.9)`);
        cap.addColorStop(1, `rgba(${r},${gr},${b},0)`);
        g.strokeStyle = cap;
        g.beginPath();
        g.ellipse(cx, cy + 2, capR, capR * 0.5, 0, Math.PI, Math.PI * 2);
        g.stroke();
        const dome = g.createRadialGradient(cx, cy - capR * 0.15, 0, cx, cy, capR);
        dome.addColorStop(0, `rgba(${r},${gr},${b},0.28)`);
        dome.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = dome;
        g.beginPath();
        g.ellipse(cx, cy + 2, capR, capR * 0.55, 0, Math.PI, Math.PI * 2);
        g.fill();
      }
      // bright core
      const core = g.createRadialGradient(cx, cy, 0, cx, cy, 26);
      core.addColorStop(0, `rgba(255,255,255,0.9)`);
      core.addColorStop(0.4, `rgba(${r},${gr},${b},0.7)`);
      core.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = core; g.beginPath(); g.arc(cx, cy, 26, 0, 7); g.fill();
    } else { // web of rhizomorph filaments
      const branch = (x, y, a, len, w, depth) => {
        if (depth > 5 || len < 6) return;
        const steps = 5;
        let px = x, py = y, ca = a;
        for (let s = 0; s < steps; s++) {
          ca += (R() - 0.5) * 0.5;
          const nx = px + Math.cos(ca) * (len / steps), ny = py + Math.sin(ca) * (len / steps);
          const grd = g.createLinearGradient(px, py, nx, ny);
          const al = 0.5 * (1 - depth / 6);
          grd.addColorStop(0, `rgba(${r},${gr},${b},${al})`);
          grd.addColorStop(1, `rgba(${r},${gr},${b},${al * 0.7})`);
          g.strokeStyle = grd; g.lineWidth = w;
          g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
          px = nx; py = ny;
          if (R() < 0.4) branch(px, py, ca + (R() - 0.5) * 1.4, len * 0.6, w * 0.7, depth + 1);
        }
        // node
        g.fillStyle = `rgba(${r},${gr},${b},0.8)`; g.beginPath(); g.arc(px, py, w * 0.8, 0, 7); g.fill();
      };
      for (let i = 0; i < 5; i++) branch(cx, cy, R() * Math.PI * 2, H * (0.16 + R() * 0.1), 1.6, 0);
    }

    // spore specks
    for (let i = 0; i < 90; i++) {
      const a = R() * 0.5;
      g.fillStyle = `rgba(${r},${gr},${b},${a})`;
      g.beginPath(); g.arc(R() * W, R() * H, R() * 1.1, 0, 7); g.fill();
    }

    // grain + vignette
    g.globalCompositeOperation = 'source-over';
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(3,3,2,0.72)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    const img = g.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 12; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
  }

  const grid = document.querySelector('.gal-grid');
  if (grid) {
    PLATES.forEach(p => {
      const fig = document.createElement('figure');
      fig.className = 'plate'; fig.setAttribute('data-reveal', '');
      const cv = document.createElement('canvas');
      cv.setAttribute('aria-hidden', 'true');
      drawPlate(cv, p);
      const meta = document.createElement('figcaption');
      meta.className = 'plate-meta';
      meta.innerHTML = `<span class="plate-id">${p.id}</span><span class="plate-name">${p.sp}</span><span class="plate-exp">${p.exp}</span>`;
      fig.appendChild(cv); fig.appendChild(meta);
      grid.appendChild(fig);
    });
  }

  /* ---------- section-aware nav ---------- */
  (function () {
    const links = Array.from(document.querySelectorAll('.nav a'));
    const map = new Map();
    links.forEach(a => { const id = a.getAttribute('href'); if (id && id.startsWith('#')) { const s = document.querySelector(id); if (s) map.set(s, a); } });
    if (!map.size || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { links.forEach(l => l.classList.remove('active')); const a = map.get(en.target); if (a) a.classList.add('active'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    map.forEach((_, s) => io.observe(s));
  })();

  /* ---------- motion ---------- */
  if (!hasGSAP || reduce) return; // content is fully visible without JS motion
  root.classList.add('motion');
  gsap.registerPlugin(ScrollTrigger);
  const EASE = 'power3.out';

  // hero load timeline — letters rise unlit, then catch light left→right
  const tl = gsap.timeline({ defaults: { ease: EASE } });
  tl.from('.hero-eyebrow', { y: 16, opacity: 0, duration: 0.8, delay: 0.15 })
    .from('.hero-title .l', { yPercent: 118, opacity: 0, duration: 1.05, stagger: 0.052, ease: 'power4.out' }, '-=0.45')
    .add(() => {
      document.querySelectorAll('.hero-title .l').forEach((el, i) => {
        setTimeout(() => el.classList.add('lit'), i * 110);
      });
    }, '-=0.35')
    .from('.hero-thesis', { y: 22, opacity: 0, duration: 0.9 }, '-=0.5')
    .from('.hero-whisper', { y: 16, opacity: 0, duration: 0.7 }, '-=0.55')
    .from('.hero-scroll', { opacity: 0, duration: 0.8 }, '-=0.4');

  // section reveals (exclude hero, handled above)
  gsap.utils.toArray('[data-reveal]').forEach(el => {
    if (el.closest('.hero')) return;
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 86%' },
      y: 26, opacity: 0, duration: 0.9, ease: EASE
    });
  });

  // hairline draws
  gsap.utils.toArray('[data-draw]').forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 92%' },
      scaleX: 0, transformOrigin: 'left', duration: 1.1, ease: 'power2.inOut'
    });
  });

  // luminosity bars
  gsap.utils.toArray('.sp-bar-fill').forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 92%' },
      scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'power3.out'
    });
  });

  // count-up figures
  gsap.utils.toArray('[data-count]').forEach(el => {
    const end = parseFloat(el.getAttribute('data-count'));
    const dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, {
        v: end, duration: 1.6, ease: 'power2.out',
        onUpdate: () => { el.textContent = dec ? o.v.toFixed(dec) : Math.round(o.v).toString(); }
      })
    });
  });
})();
