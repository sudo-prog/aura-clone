/* ============================================================
   main.js — orchestration. One clock, one loop, one garden.
   ============================================================ */

import { Frond, Vine, fitCanvas, clamp, rng } from './botany.js';
import { buildPalmhouse, STAGE_W, STAGE_H } from './glasshouse.js';
import { Specimen } from './plants.js';
import { Condensation } from './condensation.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------
   hero garden — ferns uncoil on the palm house floor, vines
   climb the mullions
   ------------------------------------------------------------ */
class HeroGarden {
  constructor(canvas, stageEl, guides) {
    this.canvas = canvas;
    this.stageEl = stageEl;
    this.guides = guides;
    this.begun = false;
    this.t0 = 0;
    this.visible = true;
    this.growing = true;
    this.build();
  }

  build() {
    const r = this.stageEl.getBoundingClientRect();
    this.W = Math.max(10, r.width);
    this.H = Math.max(10, r.height);
    this.ctx = fitCanvas(this.canvas, this.W, this.H);
    /* match the SVG's xMidYMid meet fit */
    const s = this.s = Math.min(this.W / STAGE_W, this.H / STAGE_H);
    this.ox = (this.W - STAGE_W * s) / 2;
    this.oy = (this.H - STAGE_H * s) / 2;

    const R = rng(1873);
    this.fronds = [];
    const crowns = [
      { x: 478, y: 596, count: 6, size: 150, delay: 0.0 },
      { x: 592, y: 596, count: 6, size: 180, delay: 0.35 },
      { x: 726, y: 596, count: 6, size: 140, delay: 0.6 },
      { x: 246, y: 596, count: 4, size: 86, delay: 1.0 },
      { x: 342, y: 596, count: 4, size: 98, delay: 1.2 },
      { x: 878, y: 596, count: 4, size: 94, delay: 1.05 },
      { x: 972, y: 596, count: 4, size: 82, delay: 1.35 },
    ];
    const inks = [
      { inkBase: '#2F5138', inkTip: '#4F8257' },
      { inkBase: '#2A4A33', inkTip: '#5C8F63' },
      { inkBase: '#33573B', inkTip: '#548A5B' },
    ];
    for (const c of crowns) {
      for (let i = 0; i < c.count; i++) {
        const spread = (i - (c.count - 1) / 2) * 0.4 + (R() - 0.5) * 0.14;
        const ink = inks[Math.floor(R() * inks.length)];
        this.fronds.push({
          frond: new Frond({
            x: (c.x + (R() - 0.5) * 14) * s + this.ox, y: c.y * s + this.oy,
            baseAngle: -Math.PI / 2,
            lean: spread,
            len: c.size * (0.72 + R() * 0.5) * s,
            n: c.size > 120 ? 50 : 38,
            dir: i % 2 === 0 ? 1 : -1,
            seed: Math.floor(R() * 1e6),
            width: 3.1 * s,
            ws: Math.max(0.5, s),
            ...ink,
          }),
          alpha: i < 2 ? 0.72 : 1,   /* back fronds recede — depth */
          delay: c.delay + i * 0.12 + R() * 0.15,
          dur: 3.2 + R() * 1.2,
        });
      }
    }

    const toStage = pts => pts.map(p => ({ x: p.x * s + this.ox, y: p.y * s + this.oy }));
    this.vines = [
      { vine: new Vine({ guide: toStage(this.guides.left), seed: 11, amp: 5 * s, leafEvery: 13, leafSize: 15.5 * s, width: 2.6 * s, step: Math.max(4, 7 * s) }), delay: 1.1, dur: 5.5 },
      { vine: new Vine({ guide: toStage(this.guides.right), seed: 23, amp: 4 * s, leafEvery: 12, leafSize: 14 * s, width: 2.3 * s, step: Math.max(4, 7 * s) }), delay: 1.8, dur: 5 },
    ];
    this.stats = {
      fronds: this.fronds.length,
      pinnae: this.fronds.reduce((a, f) => a + f.frond.leafCount, 0),
      ivy: this.vines.reduce((a, v) => a + v.vine.leafCount, 0),
    };
  }

  begin(now) {
    if (this.begun) return;
    this.begun = true;
    this.t0 = now;
  }

  /* returns true while animating growth */
  render(now) {
    const ctx = this.ctx;
    const t = now / 1000;
    const el = this.begun ? (now - this.t0) / 1000 : 0;
    ctx.clearRect(0, 0, this.W, this.H);

    /* soft ground shadow */
    ctx.fillStyle = 'rgba(32,57,43,0.07)';
    ctx.beginPath();
    ctx.ellipse(this.W / 2, 597 * this.s + this.oy, 420 * this.s, 9 * this.s, 0, 0, Math.PI * 2);
    ctx.fill();

    let growing = false;
    for (const v of this.vines) {
      const g = reduced ? 1 : clamp((el - v.delay) / v.dur, 0, 1);
      if (g < 1) growing = true;
      v.vine.draw(ctx, g, t, 0.5);
    }
    for (const f of this.fronds) {
      const g = reduced ? 1 : clamp((el - f.delay) / f.dur, 0, 1);
      if (g < 1) growing = true;
      const wind = reduced ? 0 : (g >= 1 ? 0.55 : 0.15);
      ctx.globalAlpha = f.alpha ?? 1;
      f.frond.draw(ctx, g, wind, t);
      ctx.globalAlpha = 1;
    }
    return growing;
  }
}

/* ------------------------------------------------------------
   rails — the vine that grows as far as you have read
   ------------------------------------------------------------ */
class Rail {
  constructor(canvas, seed, side) {
    this.canvas = canvas;
    this.seed = seed;
    this.side = side;
    this.build();
  }
  build() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.W = Math.max(10, r.width);
    this.H = Math.max(10, r.height);
    this.ctx = fitCanvas(this.canvas, this.W, this.H);
    const cx = this.W / 2 + (this.side === 'l' ? 2 : -2);
    const guide = [];
    for (let y = this.H - 4; y > 8; y -= 24) {
      guide.push({ x: cx, y });
    }
    this.vine = new Vine({
      guide, seed: this.seed, amp: 7, step: 6,
      leafEvery: 12, leafSize: 13.5, width: 2.3,
    });
    this.cx = cx;
  }
  draw(p) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    /* the mullion: shadowed white ironwork */
    for (const [dx, col, w] of [[1, 'rgba(32,57,43,0.16)', 2.6], [0, '#FCFDF9', 2]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      for (const off of [-9, 9]) {
        ctx.beginPath();
        ctx.moveTo(this.cx + off + dx, 0);
        ctx.lineTo(this.cx + off + dx, this.H);
        ctx.stroke();
      }
      for (let y = 60; y < this.H; y += 132) {
        ctx.beginPath();
        ctx.moveTo(this.cx - 9 + dx, y + dx * 1.2);
        ctx.lineTo(this.cx + 9 + dx, y + dx * 1.2);
        ctx.stroke();
      }
    }
    this.vine.draw(ctx, p, p * 8, 0);
  }
}

/* ------------------------------------------------------------
   boot
   ------------------------------------------------------------ */
const stageEl = document.getElementById('hero-stage');
const { guides } = buildPalmhouse(document.getElementById('palmhouse-svg'));
const garden = new HeroGarden(document.getElementById('hero-garden'), stageEl, guides);
const cond = new Condensation(document.getElementById('condensation'), reduced);

const specimens = [];
document.querySelectorAll('.specimen-canvas').forEach(c => {
  specimens.push(new Specimen(c, c.dataset.plant, reduced));
});

const rails = [];
function ensureRails() {
  if (rails.length === 0 && window.matchMedia('(min-width: 1180px)').matches) {
    rails.push(new Rail(document.getElementById('rail-l'), 5, 'l'));
    rails.push(new Rail(document.getElementById('rail-r'), 9, 'r'));
  }
}
ensureRails();

/* reveal choreography */
const revealIO = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
  }
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));

/* specimens germinate when seen */
const plantIO = new IntersectionObserver(entries => {
  for (const e of entries) {
    const sp = specimens.find(s => s.canvas === e.target.querySelector('.specimen-canvas'));
    if (!sp) continue;
    sp.inView = e.isIntersecting;
    if (e.isIntersecting) sp.start(performance.now());
  }
}, { threshold: 0.08, rootMargin: '0px 0px 8% 0px' });
document.querySelectorAll('.plate-art').forEach(el => plantIO.observe(el));

/* hero pause when offscreen */
const heroIO = new IntersectionObserver(entries => {
  for (const e of entries) garden.visible = e.isIntersecting;
}, { threshold: 0.02 });
heroIO.observe(stageEl);

/* countdown — real date arithmetic, grammar included */
(function countdown() {
  const bloom = new Date('2026-07-26T21:00:00');
  const now = new Date();
  const days = Math.max(0, Math.ceil((bloom - now) / 86400000));
  document.getElementById('bloom-days').textContent = String(days);
  const phrase = document.getElementById('bloom-phrase');
  if (days === 0) phrase.textContent = 'days — the spathe opens tonight';
  else if (days === 1) phrase.textContent = 'day until predicted bloom';
})();

/* hygrometer drift */
const roTemp = document.getElementById('ro-temp');
const roRh = document.getElementById('ro-rh');
const roGlass = document.getElementById('ro-glass');
function driftReadings() {
  const t = 27.1 + Math.random() * 0.5;
  roTemp.textContent = t.toFixed(1);
  roRh.textContent = String(90 + Math.floor(Math.random() * 3));
  /* the glass readout is a real instrument: it reports the actual
     state of the condensation layer you are looking through */
  const running = cond.runners.length;
  roGlass.textContent = running >= 3 ? 'RUNNING' : running >= 1 ? 'TRICKLING' : 'BEADING';
}
if (!reduced) setInterval(() => { if (!document.hidden) driftReadings(); }, 4000);

/* footer garden census */
const footEl = document.getElementById('foot-growth');
function census() {
  const ivy = garden.stats.ivy + rails.reduce((a, r) => a + r.vine.leafCount, 0);
  footEl.textContent =
    `The garden you just grew: ${garden.stats.fronds} fern fronds · ` +
    `${garden.stats.pinnae} pinnae · ${ivy} ivy leaves · ` +
    `${cond.dropletCount} condensation droplets · 1 imminent bloom.`;
}
census();
if (!reduced) setInterval(() => { if (!document.hidden) census(); }, 3000);

/* scroll → rail growth */
let scrollDirty = true;
addEventListener('scroll', () => { scrollDirty = true; }, { passive: true });

/* resize */
let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    garden.build();
    cond.resize();
    specimens.forEach(s => s.resize());
    ensureRails();
    rails.forEach(r => r.build());
    scrollDirty = true;
    if (reduced) { garden.render(performance.now()); cond.drawStatic(); drawRails(); }
  }, 180);
});

function drawRails() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - innerHeight;
  const p = reduced ? 1 : (max > 0 ? clamp(scrollY / max, 0, 1) : 0);
  rails.forEach(r => r.draw(p));
}

/* ------------------------------------------------------------
   master loop
   ------------------------------------------------------------ */
let rafId = null;
let last = performance.now();
let frame = 0;

function loop(now) {
  rafId = requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frame++;

  cond.tick(dt, now / 1000);

  /* hero: every frame while growing, 30fps sway once grown */
  if (garden.visible && (garden.growing || frame % 2 === 0)) {
    garden.growing = garden.render(now);
  }

  for (const s of specimens) {
    if (!s.started && !s.inView) continue;
    if (s.g >= 1 && !s.inView) continue;
    if (s.g >= 1 && frame % 2 === 1) continue;
    s.render(now);
  }

  if (scrollDirty) { drawRails(); scrollDirty = false; }
}

function startLoop() {
  if (rafId === null && !reduced) {
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  }
}
function stopLoop() {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}
document.addEventListener('visibilitychange', () => {
  document.hidden ? stopLoop() : startLoop();
});

/* ------------------------------------------------------------
   load sequence
   ------------------------------------------------------------ */
function begin() {
  document.body.classList.add('loaded');
  if (reduced) {
    garden.render(performance.now());
    specimens.forEach(s => s.render(performance.now()));
    drawRails();
    document.getElementById('condensation').classList.add('on');
    /* re-render annotations once the real mono face is available */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => specimens.forEach(s => s.render(performance.now())));
    }
    return;
  }
  setTimeout(() => garden.begin(performance.now()), 650);
  setTimeout(() => document.getElementById('condensation').classList.add('on'), 2400);
  startLoop();
}

if (document.readyState === 'complete') begin();
else addEventListener('load', begin);
