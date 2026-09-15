/* Halide Process Lab — orchestration.
   Grain over everything, reveals, the regime flip at the darkroom curtain,
   contact-sheet thumbnails, grease-pencil draw-in, projector flicker. */

import { drawScene } from './scene.js';
import { initDarkroom } from './darkroom.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── animated film grain over everything ─────────────────── */
function initGrain() {
  const cv = document.getElementById('grain');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const T = 144;
  const tiles = [];
  for (let t = 0; t < 4; t++) {
    const c = document.createElement('canvas');
    c.width = T; c.height = T;
    const cx = c.getContext('2d');
    const img = cx.createImageData(T, T);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    tiles.push(c);
  }
  let w = 0, h = 0;
  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1); /* crisp halide, not digital mush */
    w = cv.width = Math.ceil(innerWidth * dpr);
    h = cv.height = Math.ceil(innerHeight * dpr);
    paint(0);
  }
  function paint(k) {
    const pat = ctx.createPattern(tiles[k & 3], 'repeat');
    ctx.save();
    ctx.translate(-((Math.random() * T) | 0), -((Math.random() * T) | 0));
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w + T, h + T);
    ctx.restore();
  }
  addEventListener('resize', resize, { passive: true });
  resize();
  if (RM) return;
  let lastTick = 0, frame = 0;
  function loop(ts) {
    if (!document.hidden && ts - lastTick > 95) {
      lastTick = ts;
      paint(++frame);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

/* ── ticker: duplicate copy for the seamless loop ─────────── */
function initTicker() {
  const track = document.querySelector('.ticker-track');
  if (!track || RM) return;
  track.appendChild(track.firstElementChild.cloneNode(true));
}

/* ── scroll reveals ───────────────────────────────────────── */
function initReveals() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

/* ── contact-sheet thumbnails (procedural) ────────────────── */
function initContactSheet() {
  const hoverable = matchMedia('(hover: hover)').matches;
  const jobs = [];
  document.querySelectorAll('.cframe').forEach(f => {
    const c = f.querySelector('canvas');
    if (!c) return;
    c.width = 288; c.height = 192;
    /* defer the 12 fBm renders off the load path — the hero reveals first */
    jobs.push(() => drawScene(c, {
      type: f.dataset.scene,
      seed: +f.dataset.seed,
      exposure: +f.dataset.exp,
      contrast: 1.14,
      grain: 0.065,
    }));
    /* clip wrapper so the loupe zoom stays inside the frame */
    const wrap = document.createElement('span');
    wrap.className = 'cwrap';
    c.parentNode.insertBefore(wrap, c);
    wrap.appendChild(c);
    /* the loupe: zoom follows the pointer like a lens on a light table */
    if (hoverable && !RM) {
      wrap.addEventListener('pointermove', ev => {
        const b = wrap.getBoundingClientRect();
        c.style.setProperty('--ox', `${((ev.clientX - b.left) / b.width * 100).toFixed(1)}%`);
        c.style.setProperty('--oy', `${((ev.clientY - b.top) / b.height * 100).toFixed(1)}%`);
      }, { passive: true });
    }
  });
  /* chew through the render queue in idle time, soon regardless */
  const idle = window.requestIdleCallback
    ? cb => requestIdleCallback(cb, { timeout: 700 })
    : cb => setTimeout(() => cb({ timeRemaining: () => 8 }), 32);
  const run = deadline => {
    while (jobs.length && deadline.timeRemaining() > 4) jobs.shift()();
    if (jobs.length) idle(run);
  };
  idle(run);

  const sheet = document.querySelector('.sheet');
  if (!sheet) return;
  new IntersectionObserver((entries, io) => {
    entries.forEach(e => {
      if (e.isIntersecting) { sheet.classList.add('drawn'); io.disconnect(); }
    });
  }, { threshold: 0.35 }).observe(sheet);
}

/* ── the regime flip: lights off at the darkroom curtain ──── */
function initRegime() {
  const dark = document.getElementById('darkroom');
  const blackout = document.getElementById('blackout');
  if (!dark) return;
  let regime = 'silver';
  function throwTheSwitch(toDark) {
    /* going dark: dead black, then eyes adjust. coming back: an
       overexposed amber flash — "lights back on, mind your eyes" */
    blackout.style.transition = 'none';
    blackout.style.background = toDark ? '#000' : '#FFE9CD';
    blackout.style.opacity = toDark ? '1' : '.85';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      blackout.style.transition =
        `opacity ${toDark ? '1.4s' : '.75s'} cubic-bezier(.6,.05,.28,.99)`;
      blackout.style.opacity = '0';
    }));
  }
  new IntersectionObserver(entries => {
    entries.forEach(e => {
      const next = e.isIntersecting ? 'dark' : 'silver';
      if (next === regime) return;
      regime = next;
      document.body.dataset.regime = next;
      if (blackout && !RM) throwTheSwitch(next === 'dark');
    });
  }, { rootMargin: '-32% 0px -32% 0px' }).observe(dark);
}

/* ── hero projector flicker on load ───────────────────────── */
function initHero() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('lit')));
}

initGrain();
initTicker();
initReveals();
initContactSheet();
initRegime();
initHero();
initDarkroom({ reducedMotion: RM });
