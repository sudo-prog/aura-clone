// NIGHTDRIVE — orchestration: drive scene, scroll throttle, dash HUD,
// engine audio, cassette tilt, reveals.
import { createDrive } from './scene.js';
import { NightEngine } from './engine.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const body = document.body;

/* ---------- ignition choreography ---------- */
body.classList.add('pre-ignition');
const veil = document.getElementById('ignition-veil');
requestAnimationFrame(() => requestAnimationFrame(() => {
  veil.classList.add('lifted');
  body.classList.remove('pre-ignition');
}));

/* ---------- the drive ---------- */
const canvas = document.getElementById('drive');
let drive = null;
try {
  drive = createDrive(canvas, { reducedMotion });
} catch (e) {
  drive = null;
}
if (!drive) body.classList.add('no-webgl');

/* ---------- scroll throttle → speed ---------- */
const BASE_MPH = 88;
const REDLINE_MPH = 224;
let lastScrollY = window.scrollY;
let lastScrollT = performance.now();
let scrollVel = 0;   // px/s, decays
let speedNorm = 0;   // smoothed 0..1

window.addEventListener('scroll', () => {
  const now = performance.now();
  const dt = Math.max(8, now - lastScrollT) / 1000;
  const dy = Math.abs(window.scrollY - lastScrollY);
  scrollVel = Math.min(9000, scrollVel * 0.6 + (dy / dt) * 0.4);
  lastScrollY = window.scrollY;
  lastScrollT = now;
  body.classList.toggle('rolling', window.scrollY > 80);
}, { passive: true });

/* ---------- engine audio ---------- */
const engine = new NightEngine();
const engineBtn = document.getElementById('engine-btn');
const btnText = engineBtn.querySelector('.btn-text');

engineBtn.addEventListener('click', async () => {
  if (!engine.running) {
    engineBtn.classList.add('cranking');
    setTimeout(() => engineBtn.classList.remove('cranking'), 400);
    await engine.start();
    body.classList.add('engine-on');
    engineBtn.setAttribute('aria-pressed', 'true');
    btnText.innerHTML = 'ENGINE<br>ON';
  } else {
    await engine.stop();
    body.classList.remove('engine-on');
    engineBtn.setAttribute('aria-pressed', 'false');
    btnText.innerHTML = 'ENGINE<br>START';
  }
});

/* ---------- dash HUD ---------- */
const speedEl = document.getElementById('speed-val');
const tripEl = document.getElementById('trip-val');
const viz = document.getElementById('viz');
const vizCtx = viz.getContext('2d');
const BAR_COUNT = 28;
let tripMiles = 0;
let shownMph = BASE_MPH;

function sizeViz() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const rect = viz.getBoundingClientRect();
  viz.width = Math.round(rect.width * dpr);
  viz.height = Math.round(rect.height * dpr);
  // resizing clears the canvas — repaint so the bars never vanish
  drawViz(engine.running ? engine.getLevels(BAR_COUNT) : null);
}
sizeViz();
window.addEventListener('resize', sizeViz);

function drawViz(levels) {
  const w = viz.width, h = viz.height;
  vizCtx.clearRect(0, 0, w, h);
  const gap = Math.max(1, w * 0.006);
  const bw = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT;
  for (let i = 0; i < BAR_COUNT; i++) {
    const lv = levels ? levels[i] : 0;
    const bh = Math.max(h * 0.045, lv * h * 0.96);
    const x = i * (bw + gap);
    const t = i / (BAR_COUNT - 1);
    const r = Math.round(60 + t * 195);
    const g = Math.round(230 - t * 184);
    const b = Math.round(255 - t * 119);
    vizCtx.fillStyle = levels
      ? `rgba(${r},${g},${b},${0.35 + lv * 0.65})`
      : 'rgba(110,95,143,0.35)';
    vizCtx.fillRect(x, h - bh, bw, bh);
  }
}
drawViz(null);

/* ---------- main loop ---------- */
let rafId = null;
let lastT = performance.now();
let running = true;
let vizFrame = 0;

function frame(now) {
  rafId = requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;

  // decay scroll velocity, smooth speed
  scrollVel *= Math.exp(-dt * 2.4);
  const target = Math.min(1, scrollVel / 3400);
  speedNorm += (target - speedNorm) * Math.min(1, dt * 3.2);

  if (drive && !drive.reduced) {
    drive.setSpeedNorm(speedNorm);
    drive.tick(dt);
  }

  // dash speed + trip
  const mph = BASE_MPH + speedNorm * (REDLINE_MPH - BASE_MPH);
  shownMph += (mph - shownMph) * Math.min(1, dt * 5);
  speedEl.textContent = String(Math.round(shownMph)).padStart(3, '0');
  body.classList.toggle('redline', shownMph > 180);
  tripMiles += (shownMph * dt) / 3600;
  tripEl.textContent = tripMiles.toFixed(1).padStart(5, '0');

  // audio coupling + visualizer
  if (engine.running) {
    engine.setDrive(speedNorm);
    vizFrame++;
    if (!reducedMotion || vizFrame % 8 === 0) drawViz(engine.getLevels(BAR_COUNT));
  } else if (vizFrame !== 0) {
    vizFrame = 0;
    drawViz(null);
  }
}

function startLoop() {
  if (reducedMotion) return;
  if (rafId === null && running) {
    lastT = performance.now();
    rafId = requestAnimationFrame(frame);
  }
}
function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLoop(); else startLoop();
});

// the canvas is fixed and always intersecting, but honor the contract
const io = new IntersectionObserver(([entry]) => {
  running = entry.isIntersecting;
  if (running) startLoop(); else stopLoop();
});
io.observe(canvas);

if (reducedMotion) {
  // static scene; dash shows cruise, viz updates slowly when engine runs
  speedEl.textContent = '088';
  stopLoop();
  running = false;
  // still refresh visualizer at a gentle rate while audio plays,
  // and settle back to idle bars once the engine cuts out
  let vizWasLive = false;
  setInterval(() => {
    if (engine.running) {
      vizWasLive = true;
      drawViz(engine.getLevels(BAR_COUNT));
    } else if (vizWasLive) {
      vizWasLive = false;
      drawViz(null);
    }
  }, 250);
} else {
  startLoop();
}

/* ---------- cassette tilt ---------- */
const finePointer = matchMedia('(pointer: fine)').matches;
if (finePointer && !reducedMotion) {
  document.querySelectorAll('.tilt-zone').forEach((zone) => {
    const cassette = zone.querySelector('.cassette');
    const glare = zone.querySelector('.glare');
    zone.addEventListener('pointermove', (e) => {
      const r = zone.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;   // 0..1
      const py = (e.clientY - r.top) / r.height;
      cassette.style.setProperty('--ry', `${(px - 0.5) * 22}deg`);
      cassette.style.setProperty('--rx', `${(0.5 - py) * 16}deg`);
      glare.style.setProperty('--gx', `${px * 100}%`);
      glare.style.setProperty('--gy', `${py * 100}%`);
    });
    zone.addEventListener('pointerleave', () => {
      cassette.style.setProperty('--ry', '0deg');
      cassette.style.setProperty('--rx', '0deg');
    });
  });
}

/* ---------- scrollspy: light the road sign you're passing ---------- */
const navLinks = [...document.querySelectorAll('.signage nav a')];
const spyTargets = navLinks
  .map((a) => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);
const spy = new IntersectionObserver((entries) => {
  for (const en of entries) {
    const link = navLinks.find((a) => a.getAttribute('href') === `#${en.target.id}`);
    if (!link) continue;
    if (en.isIntersecting) {
      navLinks.forEach((a) => a.classList.remove('active'));
      link.classList.add('active');
    } else if (link.classList.contains('active')) {
      link.classList.remove('active');
    }
  }
}, { rootMargin: '-30% 0px -50% 0px' });
spyTargets.forEach((s) => spy.observe(s));

/* ---------- reveals ---------- */
const revealEls = document.querySelectorAll('.rv');
if (reducedMotion) {
  revealEls.forEach((el) => el.classList.add('in'));
} else {
  // stagger siblings within the same parent
  const groups = new Map();
  revealEls.forEach((el) => {
    const p = el.parentElement;
    const i = groups.get(p) || 0;
    el.style.setProperty('--rvd', String(Math.min(i, 5)));
    groups.set(p, i + 1);
  });
  const ro = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        ro.unobserve(en.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach((el) => ro.observe(el));
}
