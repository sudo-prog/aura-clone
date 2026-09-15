/* ============================================================
   NIMBUS · main.js — the scrolled day
   Scroll position is the clock. Anchors pin each plate to its
   "best viewed" hour; everything else interpolates.
   ============================================================ */

import { initSkies } from './sky.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const doc = document.documentElement;

/* ---------- solar model ---------- */

const DAY_START = 5.5;   // 05:30
const DAY_END = 22.5;    // 22:30
const SUNRISE = 6.0;
const SUNSET = 21.5;
const MAX_ELEV = 58;

function solar(hour) {
  const f = (hour - SUNRISE) / (SUNSET - SUNRISE);
  let elev;
  if (f < 0) elev = MAX_ELEV * Math.PI * f;
  else if (f > 1) elev = MAX_ELEV * Math.PI * (1 - f);
  else elev = MAX_ELEV * Math.sin(Math.PI * f);
  const fc = Math.min(Math.max(f, -0.06), 1.06);
  const x = 0.1 + fc * 0.8;                       // east → west across the frame
  const y = 0.07 + (elev / MAX_ELEV) * 0.86;      // may sink below the frame
  return { hour, elev, x, y };
}

function fmtTime(hour) {
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
function fmtElev(elev) {
  const v = Math.round(elev * 10) / 10;
  return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '°';
}

/* ---------- scroll → hour anchors ---------- */

const anchorSpecs = [
  { sel: '.hero', at: 'top', hour: 5.52 },
  { sel: '#plate-i .specimen', at: 'center', hour: 6.2 },     // 06:12
  { sel: '#plate-ii .specimen', at: 'center', hour: 9.68 },   // 09:41
  { sel: '#plate-iii .specimen', at: 'center', hour: 15.43 }, // 15:26
  { sel: '#plate-iv .specimen', at: 'center', hour: 19.05 },  // 19:03
  { sel: '#plate-v .specimen', at: 'center', hour: 21.8 },    // 21:48
  { sel: '#log', at: 'top', hour: 22.08 },
  { sel: 'body', at: 'bottom', hour: 22.5 },
];
let anchors = [];

function measureAnchors() {
  const vh = window.innerHeight;
  const scrollMax = doc.scrollHeight - vh;
  anchors = anchorSpecs.map((a) => {
    const el = document.querySelector(a.sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const topDoc = r.top + window.scrollY;
    let scrollAt;
    if (a.at === 'top') scrollAt = topDoc - vh * 0.6;
    else if (a.at === 'center') scrollAt = topDoc + r.height / 2 - vh / 2;
    else scrollAt = doc.scrollHeight - vh;
    return { s: Math.max(0, Math.min(scrollAt, scrollMax)), hour: a.hour };
  }).filter(Boolean).sort((a, b) => a.s - b.s);
  /* ensure the mapping is monotone in hour as well */
  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i].hour < anchors[i - 1].hour) anchors[i].hour = anchors[i - 1].hour;
  }
}

function hourAtScroll(s) {
  if (!anchors.length) return DAY_START;
  if (s <= anchors[0].s) return anchors[0].hour;
  for (let i = 1; i < anchors.length; i++) {
    if (s <= anchors[i].s) {
      const a = anchors[i - 1], b = anchors[i];
      const t = b.s === a.s ? 1 : (s - a.s) / (b.s - a.s);
      return a.hour + (b.hour - a.hour) * t;
    }
  }
  return anchors[anchors.length - 1].hour;
}

/* ---------- paper tint through the day ---------- */

const paperStops = [
  { h: 5.5,  paper: [233, 226, 226] },  // first-light ash
  { h: 8.0,  paper: [236, 240, 241] },
  { h: 12.0, paper: [242, 245, 246] },  // noon paper
  { h: 17.0, paper: [238, 239, 236] },
  { h: 19.5, paper: [233, 228, 219] },  // golden hour, kept grey
  { h: 21.5, paper: [221, 216, 211] },  // dimming
  { h: 22.5, paper: [214, 210, 208] },
];

function lerpPaper(h) {
  if (h <= paperStops[0].h) return paperStops[0].paper;
  for (let i = 1; i < paperStops.length; i++) {
    if (h <= paperStops[i].h) {
      const a = paperStops[i - 1], b = paperStops[i];
      const t = (h - a.h) / (b.h - a.h);
      return a.paper.map((v, k) => Math.round(v + (b.paper[k] - v) * t));
    }
  }
  return paperStops[paperStops.length - 1].paper;
}

/* ---------- DOM refs ---------- */

const instTime = document.getElementById('instTime');
const instSun = document.getElementById('instSun');
const heroClock = document.getElementById('heroClock');
const themeMeta = document.querySelector('meta[name="theme-color"]');

/* plates announce themselves while the clock passes their hour */
const bestPlates = Array.from(document.querySelectorAll('.plate[data-best]'))
  .map((el) => ({ el, h: parseFloat(el.dataset.best), on: false }));

/* ---------- altitude rulers ---------- */

function buildRulers() {
  const SCALE_KM = 13;
  document.querySelectorAll('.ruler').forEach((ruler) => {
    const [lo, hi] = (ruler.dataset.band || '0,1').split(',').map(Number);
    ruler.innerHTML = '';
    const unit = document.createElement('span');
    unit.className = 'ruler-unit';
    unit.textContent = 'KM';
    ruler.appendChild(unit);
    for (let km = 0; km <= SCALE_KM; km++) {
      const tick = document.createElement('span');
      const major = km % 5 === 0 || km === SCALE_KM;
      tick.className = 'tick' + (major ? ' tick--major' : '');
      tick.style.top = (100 - (km / SCALE_KM) * 100) + '%';
      ruler.appendChild(tick);
      if (major) {
        const lab = document.createElement('span');
        lab.className = 'tick-label';
        lab.style.top = (100 - (km / SCALE_KM) * 100) + '%';
        lab.textContent = km;
        ruler.appendChild(lab);
      }
    }
    const band = document.createElement('span');
    band.className = 'band';
    band.style.bottom = (lo / SCALE_KM) * 100 + '%';
    band.style.height = ((hi - lo) / SCALE_KM) * 100 + '%';
    ruler.appendChild(band);
  });
}

/* ---------- reveals ---------- */

function initReveals() {
  const els = document.querySelectorAll('.reveal, .ruler');
  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => io.observe(el));
}

/* ---------- night flip ---------- */

let isNight = false;
function setNight(on) {
  if (on === isNight) return;
  isNight = on;
  doc.classList.toggle('night', on);
  if (themeMeta) themeMeta.setAttribute('content', on ? '#252C3A' : '#E9E2E2');
}

/* ---------- main loop ---------- */

const skies = initSkies();
let curHour = 4.9;              // pre-dawn; intro eases into the scrolled hour
let introStart = null;
const INTRO_MS = 2600;
let rafId = null;
let lastPaper = '';

function applyHour(h) {
  const sun = solar(h);
  setNight(h >= 21.92 ? true : h <= 21.78 ? false : isNight);
  if (isNight) {
    /* the .night class owns the palette — inline paper must not override it */
    if (lastPaper !== '') {
      doc.style.removeProperty('--paper');
      lastPaper = '';
    }
  } else {
    const [r, g, b] = lerpPaper(h);
    const paperCss = `rgb(${r} ${g} ${b})`;
    if (paperCss !== lastPaper) {
      doc.style.setProperty('--paper', paperCss);
      lastPaper = paperCss;
    }
  }
  const tStr = fmtTime(h);
  if (instTime.textContent !== tStr) {
    instTime.textContent = tStr;
    instSun.textContent = fmtElev(sun.elev);
    if (heroClock) heroClock.textContent = tStr;
  }
  for (const p of bestPlates) {
    const on = Math.abs(h - p.h) < 0.7;
    if (on !== p.on) {
      p.on = on;
      p.el.classList.toggle('now-showing', on);
    }
  }
  return sun;
}

function frame(now) {
  rafId = requestAnimationFrame(frame);
  const targetHour = hourAtScroll(window.scrollY);
  if (introStart === null) introStart = now;
  const introT = Math.min((now - introStart) / INTRO_MS, 1);
  const introEase = 1 - Math.pow(1 - introT, 3);
  if (introT < 1) {
    curHour = 4.9 + (targetHour - 4.9) * introEase;
  } else {
    curHour += (targetHour - curHour) * 0.085;
    if (Math.abs(targetHour - curHour) < 0.001) curHour = targetHour;
  }
  const sun = applyHour(curHour);
  if (skies) skies.draw(now / 1000, sun);
}

function startLoop() {
  if (rafId === null && !reduced) rafId = requestAnimationFrame(frame);
}
function stopLoop() {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}

/* reduced motion: single static frames, updated on scroll */
let staticScheduled = false;
function staticFrame() {
  staticScheduled = false;
  curHour = hourAtScroll(window.scrollY);
  const sun = applyHour(curHour);
  if (skies) skies.drawAll(1013.7, sun); // fixed time — no drift
}
function scheduleStatic() {
  if (!staticScheduled) {
    staticScheduled = true;
    requestAnimationFrame(staticFrame);
  }
}

/* ---------- boot ---------- */

buildRulers();
initReveals();
measureAnchors();

window.addEventListener('resize', () => {
  measureAnchors();
  if (reduced) scheduleStatic();
});
/* re-measure once layout has settled (fonts, canvases) */
window.addEventListener('load', () => {
  measureAnchors();
  if (reduced) scheduleStatic();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLoop();
  else startLoop();
});

if (reduced) {
  document.body.classList.add('loaded');
  window.addEventListener('scroll', scheduleStatic, { passive: true });
  scheduleStatic();
} else {
  requestAnimationFrame(() => document.body.classList.add('loaded'));
  startLoop();
}

/* return to dawn — rewinding the day deserves a moment */
document.getElementById('dawnLink')?.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
});
