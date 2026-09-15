/* KINETIK — boot, air, scroll inertia, reveals. */

import { Mobile } from './engine.js';
import { SCENES } from './scenes.js';
import { Bench } from './balance.js';

const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => RM.matches;

const mobiles = [];
let bench = null, benchVisible = false;

/* ---------- boot ---------- */

try {
  document.querySelectorAll('canvas[data-mobile]').forEach(cv => {
    const spec = SCENES[cv.dataset.mobile];
    if (!spec) return;
    mobiles.push({ m: new Mobile(cv, spec), cv, spec, active: false, seen: false });
  });
  const stage = document.getElementById('bench-stage');
  if (stage) {
    bench = new Bench(stage, document.getElementById('bench-canvas'), {
      right: document.getElementById('ro-right'),
      tilt: document.getElementById('ro-tilt'),
      status: document.getElementById('ro-status'),
      bench: document.getElementById('bench'),
    }, reduced);
  }
} catch (err) {
  document.body.classList.add('flat');
}

/* ---------- live wall-label telemetry ---------- */

const LIVE_CLASSES = ['s-motion', 's-settle', 's-rest'];
document.querySelectorAll('.plate .live').forEach(el => {
  const rec = mobiles.find(r => r.cv.dataset.mobile === el.dataset.live);
  if (rec) { rec.liveEl = el; rec.liveTxt = el.querySelector('.ltxt'); }
});

function updateLive(rec) {
  const { deg, om } = rec.m.telemetry();
  const cls = om > 1.3 ? 's-motion' : om > 0.22 ? 's-settle' : 's-rest';
  if (rec.liveCls !== cls) {
    rec.liveEl.classList.remove(...LIVE_CLASSES);
    rec.liveEl.classList.add(cls);
    rec.liveCls = cls;
  }
  const word = cls === 's-motion' ? 'in motion' : cls === 's-settle' ? 'settling' : 'at rest';
  rec.liveTxt.textContent =
    `${word} · beam ${deg >= 0 ? '+' : '−'}${Math.abs(deg).toFixed(1)}°`;
}
mobiles.forEach(r => { if (r.liveEl) updateLive(r); });

/* ---------- pointer = wind ---------- */

const P = { x: -1e9, y: -1e9, vx: 0, vy: 0, ts: 0 };
window.addEventListener('pointermove', e => {
  const now = performance.now();
  const dt = Math.max(8, now - P.ts) / 1000;
  if (P.ts) {
    const ivx = Math.max(-5200, Math.min(5200, (e.clientX - P.x) / dt));
    const ivy = Math.max(-5200, Math.min(5200, (e.clientY - P.y) / dt));
    P.vx = P.vx * 0.5 + ivx * 0.5;
    P.vy = P.vy * 0.5 + ivy * 0.5;
  }
  P.x = e.clientX; P.y = e.clientY; P.ts = now;
}, { passive: true });

/* ---------- visibility ---------- */

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    for (const en of entries) {
      const rec = mobiles.find(r => r.cv === en.target);
      if (!rec) continue;
      rec.active = en.isIntersecting;
      if (en.isIntersecting && !reduced()) {
        if (!rec.seen && rec.spec.install) rec.m.beginInstall();
        else rec.m.disturb(rec.seen ? 0.12 : rec.spec.intro || 0.8);
        rec.seen = true;
      }
    }
  }, { threshold: 0.02 });
  mobiles.forEach(r => io.observe(r.cv));

  if (bench) {
    new IntersectionObserver(es => { benchVisible = es[0].isIntersecting; }, { threshold: 0.05 })
      .observe(document.getElementById('bench'));
  }

  // reveals — the stagger delay is cleared after arrival so it never
  // taxes hover/focus transitions (the CTA must invert instantly)
  const rio = new IntersectionObserver(es => {
    for (const en of es) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      el.classList.add('in');
      rio.unobserve(el);
      if (el.style.transitionDelay) {
        el.addEventListener('transitionend',
          () => { el.style.transitionDelay = ''; }, { once: true });
      }
    }
  }, { threshold: 0.16, rootMargin: '0px 0px -4% 0px' });
  document.querySelectorAll('.rv').forEach(el => {
    if (el.dataset.d) el.style.transitionDelay = el.dataset.d + 'ms';
    rio.observe(el);
  });

  // nav current-section marker
  const links = [...document.querySelectorAll('.nav a[href^="#"]')];
  const nio = new IntersectionObserver(es => {
    for (const en of es) {
      if (!en.isIntersecting) continue;
      const id = '#' + en.target.id;
      links.forEach(a => {
        if (a.getAttribute('href') === id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-42% 0px -50% 0px' });
  ['works', 'balance', 'studio', 'commission'].forEach(id => {
    const el = document.getElementById(id);
    if (el) nio.observe(el);
  });
} else {
  mobiles.forEach(r => { r.active = true; });
  benchVisible = true;
  document.querySelectorAll('.rv').forEach(el => el.classList.add('in'));
}

/* ---------- scroll = inertia ---------- */

let lastY = window.scrollY, lastV = 0, shake = 0;

/* ---------- header ---------- */

const header = document.querySelector('.hd');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- main loop ---------- */

let rafId = 0, lastT = 0, liveAcc = 0;

function tick(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
  lastT = now;
  liveAcc += dt;
  const doLive = liveAcc >= 0.18;
  if (doLive) liveAcc = 0;

  // pointer wind decay when still
  if (now - P.ts > 90) { const k = Math.exp(-7 * dt); P.vx *= k; P.vy *= k; }

  // scroll acceleration → pseudo-force on every hang point
  const y = window.scrollY;
  const v = (y - lastY) / dt;
  const a = Math.max(-26000, Math.min(26000, (v - lastV) / dt));
  lastY = y; lastV = v;
  shake = shake * 0.8 + a * 0.2;
  const shakeAy = Math.max(-3400, Math.min(3400, -shake * 0.16));
  const shakeAx = Math.max(-700, Math.min(700, -shake * 0.03));

  for (const r of mobiles) {
    if (!r.active) continue;
    r.m.setPointer(P.x, P.y, P.vx, P.vy);
    r.m.frame(dt, shakeAx, shakeAy);
    if (doLive && r.liveEl) updateLive(r);
  }
  if (bench && benchVisible) bench.frame(dt);

  rafId = requestAnimationFrame(tick);
}

function startLoop() {
  cancelAnimationFrame(rafId);
  lastT = performance.now();
  lastY = window.scrollY; lastV = 0; shake = 0;
  rafId = requestAnimationFrame(tick);
}
function stopLoop() { cancelAnimationFrame(rafId); rafId = 0; }

function applyMotionMode() {
  if (reduced()) {
    stopLoop();
    mobiles.forEach(r => {
      r.m.restPose(); r.m.drawOnce();
      if (r.liveEl) updateLive(r);
    });
    if (bench) { bench.th = bench.restAngle(); bench.om = 0; bench.draw(); }
  } else {
    startLoop();
  }
}
applyMotionMode();
RM.addEventListener?.('change', applyMotionMode);

// reduced motion draws once at boot — possibly before IBM Plex Mono
// arrives; repaint the static bench so its labels get the real face
document.fonts?.ready?.then(() => { if (bench && reduced()) bench.draw(); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLoop();
  else if (!reduced()) startLoop();
});

/* ---------- resize ---------- */

let rzT = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(rzT);
  rzT = requestAnimationFrame(() => {
    mobiles.forEach(r => { r.m.resize(); if (reduced()) r.m.drawOnce(); });
    if (bench) bench.resize();
  });
});

// verification hook (harmless in production)
window.__kinetik = { mobiles, bench };
