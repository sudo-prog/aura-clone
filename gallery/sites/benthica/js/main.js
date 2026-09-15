// BENTHICA — main.js
// The page is the dive. Depth is a pure function of scroll; every
// instrument, color and creature derives from it.

import { Sea, ambientColor, MAX_DEPTH } from './sea.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, s) => a + (b - a) * s;

const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reducedMQ.matches;
reducedMQ.addEventListener('change', () => { reduced = reducedMQ.matches; dirty = true; });

/* ------------------------------------------------------------------ */
/* depth model — anchors from the log itself                           */
/* ------------------------------------------------------------------ */

let anchors = []; // { pos, depth, met } sorted by document position

function measureAnchors() {
  const els = document.querySelectorAll('[data-depth]');
  const list = [];
  for (const el of els) {
    const r = el.getBoundingClientRect();
    list.push({
      pos: r.top + window.scrollY + r.height * 0.5,
      depth: parseFloat(el.dataset.depth),
      met: parseFloat(el.dataset.met),
    });
  }
  list.sort((a, b) => a.pos - b.pos);
  anchors = list;
}

function sampleTrack(probe) {
  if (anchors.length === 0) return { depth: 0, met: 0 };
  if (probe <= anchors[0].pos) return { depth: 0, met: 0 };
  const last = anchors[anchors.length - 1];
  if (probe >= last.pos) return { depth: last.depth, met: last.met };
  for (let i = 1; i < anchors.length; i++) {
    if (probe <= anchors[i].pos) {
      const a = anchors[i - 1], b = anchors[i];
      const s = (probe - a.pos) / Math.max(1, b.pos - a.pos);
      return { depth: lerp(a.depth, b.depth, s), met: lerp(a.met, b.met, s) };
    }
  }
  return { depth: last.depth, met: last.met };
}

/* thermocline — °C by depth, adiabatic warmth near the floor */
const TEMPS = [
  [0, 21.4], [80, 19.6], [150, 13.8], [200, 11.9], [340, 9.4], [612, 6.3],
  [800, 5.2], [1000, 4.4], [1200, 3.9], [1900, 3.0], [2507, 2.4], [3300, 2.0],
  [4000, 1.8], [5200, 1.6], [6000, 1.6], [7400, 1.8], [9100, 2.0],
  [10300, 2.2], [10911, 2.3],
];
function tempAt(d) {
  if (d <= 0) return TEMPS[0][1];
  for (let i = 1; i < TEMPS.length; i++) {
    if (d <= TEMPS[i][0]) {
      const [d0, t0] = TEMPS[i - 1], [d1, t1] = TEMPS[i];
      return lerp(t0, t1, (d - d0) / (d1 - d0));
    }
  }
  return TEMPS[TEMPS.length - 1][1];
}

/* ------------------------------------------------------------------ */
/* HUD                                                                 */
/* ------------------------------------------------------------------ */

const rDepth = document.getElementById('r-depth');
const rPress = document.getElementById('r-press');
const rTemp = document.getElementById('r-temp');
const rMet = document.getElementById('r-met');
const rZone = document.getElementById('r-zone');
const rRate = document.getElementById('r-rate');
const progEl = document.getElementById('r-prog');
const ambientEl = document.getElementById('ambient');
const vignetteEl = document.getElementById('vignette');
const sonarEl = document.getElementById('sonar');

const fmt1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const cache = {};
function put(el, key, text) {
  if (cache[key] !== text) { cache[key] = text; el.textContent = text; }
}

function metString(metMin) {
  const s = Math.max(0, Math.round(metMin * 60));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `T+${hh}:${mm}:${ss}`;
}

const ZONES = [
  { at: 0, name: 'EPIPELAGIC' },
  { at: 200, name: 'MESOPELAGIC' },
  { at: 1000, name: 'BATHYPELAGIC' },
  { at: 4000, name: 'ABYSSOPELAGIC' },
  { at: 6000, name: 'HADAL' },
  { at: 10880, name: 'HADAL · ON BOTTOM' },
];
const PING_LABELS = [
  null,
  'SONAR — ZONE BOUNDARY · MESOPELAGIC',
  'SONAR — ZONE BOUNDARY · BATHYPELAGIC',
  'SONAR — ZONE BOUNDARY · ABYSSOPELAGIC',
  'SONAR — ZONE BOUNDARY · HADAL',
  'BOTTOM CONTACT · SKIDS DOWN',
];
function zoneIndex(d) {
  let idx = 0;
  for (let i = 0; i < ZONES.length; i++) if (d >= ZONES[i].at) idx = i;
  return idx;
}

/* boot sequence — instruments self-test, then go live */
const bootState = { depth: false, press: false, temp: false, met: false };
function boot() {
  const items = [
    ['depth', rDepth], ['press', rPress], ['temp', rTemp], ['met', rMet],
  ];
  if (reduced) { items.forEach(([k]) => (bootState[k] = true)); return; }
  items.forEach(([key, el], i) => {
    const t0 = 350 + i * 140;
    setTimeout(() => { el.textContent = '––––'; }, t0);
    setTimeout(() => { el.textContent = '····'; }, t0 + 90);
    setTimeout(() => { el.textContent = '––––'; }, t0 + 170);
    setTimeout(() => { bootState[key] = true; }, t0 + 260);
  });
}

/* sonar ping */
let lastPingAt = -1e9;
function ping(label, now) {
  // the newest contact owns the display — stale labels clear immediately,
  // rings only re-fire once the last salvo has had room to breathe
  const fresh = now - lastPingAt > 700;
  lastPingAt = now;
  sonarEl.querySelectorAll('.ping-label').forEach((n) => n.remove());
  if (fresh) {
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('span');
      ring.className = 'ring';
      ring.style.setProperty('--s', String(44 - i * 10));
      ring.style.animationDelay = `${i * 0.16}s`;
      sonarEl.appendChild(ring);
      setTimeout(() => ring.remove(), 2600);
    }
  }
  const lab = document.createElement('span');
  lab.className = 'ping-label';
  lab.textContent = label;
  sonarEl.appendChild(lab);
  setTimeout(() => lab.remove(), 2800);

  rZone.classList.add('flash');
  setTimeout(() => rZone.classList.remove('flash'), 1000);
}

/* ------------------------------------------------------------------ */
/* depth tape                                                          */
/* ------------------------------------------------------------------ */

const tapeCanvas = document.getElementById('tape');
const tapeCtx = tapeCanvas.getContext('2d');
const ZONE_MARKS = [200, 1000, 4000, 6000];
const CONTACT_MARKS = [612, 1210, 2507, 4050]; // logged contacts ride the tape

function sizeTape() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  tapeCanvas.width = Math.round(76 * dpr);
  tapeCanvas.height = Math.round(window.innerHeight * dpr);
  tapeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawTape(depth) {
  if (window.innerWidth < 720) return;
  const H = window.innerHeight;
  const ctx = tapeCtx;
  ctx.clearRect(0, 0, 76, H);
  const pxm = 1.15;
  const half = H / 2 / pxm;
  const from = Math.max(0, Math.floor((depth - half) / 10) * 10);
  const to = Math.min(MAX_DEPTH, depth + half);
  const bx = 62; // baseline x

  // baseline runs only through water that exists: 0 m → the floor
  const ySurf = H / 2 + (0 - depth) * pxm;
  const yBed = H / 2 + (MAX_DEPTH - depth) * pxm;
  ctx.strokeStyle = 'rgba(159,195,207,0.34)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx + 0.5, Math.max(0, ySurf));
  ctx.lineTo(bx + 0.5, Math.min(H, yBed));
  ctx.stroke();

  ctx.font = '9px "IBM Plex Mono", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let m = from; m <= to; m += 10) {
    const y = H / 2 + (m - depth) * pxm;
    if (y < -14 || y > H + 14) continue;
    const edge = 1 - Math.pow(Math.abs(y - H / 2) / (H / 2), 2.6);
    if (edge <= 0.03) continue;
    const major = m % 100 === 0;
    const mid = m % 50 === 0;
    const w = major ? 18 : mid ? 12 : 7;
    ctx.strokeStyle = `rgba(159,195,207,${(major ? 0.72 : mid ? 0.5 : 0.3) * edge})`;
    ctx.lineWidth = major ? 1.4 : 1;
    ctx.beginPath();
    ctx.moveTo(bx - w, y + 0.5);
    ctx.lineTo(bx, y + 0.5);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = `rgba(159,195,207,${0.66 * edge})`;
      ctx.fillText(String(m), bx - 22, y);
    }
  }

  // zone boundaries in biolume
  for (const zm of ZONE_MARKS) {
    const y = H / 2 + (zm - depth) * pxm;
    if (y < -4 || y > H + 4) continue;
    const edge = 1 - Math.pow(Math.abs(y - H / 2) / (H / 2), 2.6);
    ctx.strokeStyle = `rgba(100,240,210,${0.75 * Math.max(0, edge)})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bx - 24, y + 0.5);
    ctx.lineTo(bx, y + 0.5);
    ctx.stroke();
  }

  // contact stations — biolume diamonds astride the baseline
  for (const cm of CONTACT_MARKS) {
    const y = H / 2 + (cm - depth) * pxm;
    if (y < -6 || y > H + 6) continue;
    const edge = 1 - Math.pow(Math.abs(y - H / 2) / (H / 2), 2.6);
    if (edge <= 0.03) continue;
    ctx.fillStyle = `rgba(100,240,210,${0.8 * edge})`;
    ctx.beginPath();
    ctx.moveTo(bx - 3.4, y);
    ctx.lineTo(bx, y - 4.4);
    ctx.lineTo(bx + 3.4, y);
    ctx.lineTo(bx, y + 4.4);
    ctx.closePath();
    ctx.fill();
  }

  // the floor — hatched, final
  const yFloor = H / 2 + (MAX_DEPTH - depth) * pxm;
  if (yFloor < H + 40) {
    const edge = clamp(1 - Math.abs(yFloor - H / 2) / (H / 2), 0, 1) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(255,233,196,${0.8 * edge})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx - 26, yFloor);
    ctx.lineTo(bx, yFloor);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(255,233,196,${0.4 * edge})`;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(bx - 24 + i * 4, yFloor + 3);
      ctx.lineTo(bx - 28 + i * 4, yFloor + 9);
      ctx.stroke();
    }
  }

  // center index
  ctx.fillStyle = 'rgba(230,241,244,0.95)';
  ctx.beginPath();
  ctx.moveTo(74, H / 2);
  ctx.lineTo(66, H / 2 - 5);
  ctx.lineTo(66, H / 2 + 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,241,244,0.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(bx - 30, H / 2 + 0.5);
  ctx.lineTo(bx + 4, H / 2 + 0.5);
  ctx.stroke();
}

/* ------------------------------------------------------------------ */
/* ambient + vignette                                                  */
/* ------------------------------------------------------------------ */

let lastBg = '';
function paintAmbient(depth) {
  const top = ambientColor(Math.max(0, depth * 0.88 - 8));
  const bot = ambientColor(depth * 1.12 + 130);
  const str = `linear-gradient(rgb(${top.map(Math.round)}) 0%, rgb(${bot.map(Math.round)}) 100%)`;
  if (str !== lastBg) { lastBg = str; ambientEl.style.background = str; }
  const vo = (0.35 + 0.55 * clamp(depth / 3000, 0, 1)).toFixed(3);
  if (cache.vig !== vo) { cache.vig = vo; vignetteEl.style.opacity = vo; }
}

/* ------------------------------------------------------------------ */
/* reveals                                                             */
/* ------------------------------------------------------------------ */

const io = new IntersectionObserver(
  (ents) => {
    for (const en of ents) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }
  },
  { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
);
document.querySelectorAll('.entry, .stratum, .credits').forEach((el) => io.observe(el));

/* ------------------------------------------------------------------ */
/* the loop                                                            */
/* ------------------------------------------------------------------ */

const sea = new Sea(document.getElementById('sea'));

let smoothDepth = 0;
let smoothMet = 0;
let prevDepth = 0;
let rateS = 0;
let lastNow = performance.now();
let dirty = true;
let rafId = 0;
let zoneIdx = 0;
let started = false;

function frame(now) {
  rafId = requestAnimationFrame(frame);
  const dt = clamp((now - lastNow) / 1000, 0.001, 0.1);
  lastNow = now;

  const probe = window.scrollY + window.innerHeight * 0.55;
  const target = sampleTrack(probe);

  if (reduced) {
    smoothDepth = target.depth;
    smoothMet = target.met;
  } else {
    const k = 1 - Math.exp(-dt * 5.2);
    smoothDepth += (target.depth - smoothDepth) * k;
    smoothMet += (target.met - smoothMet) * k;
  }

  const dDepth = smoothDepth - prevDepth;
  prevDepth = smoothDepth;

  // descent rate, m/min, damped like a real gauge
  const inst = dDepth / dt * 60;
  rateS += (inst - rateS) * (1 - Math.exp(-dt * 3.2));
  // the needle has physical stops — the internal state can't wind past them,
  // so after a violent scrub it falls off the pin immediately
  rateS = clamp(rateS, -400, 400);
  // the gauge is a real instrument: full scale ±240 m/min — scrubbing the
  // page pegs the needle instead of reporting impossible physics.
  // Skids down = parked: a landed sub reads zero, whatever the needle thinks.
  const parked = target.depth >= MAX_DEPTH - 0.5;
  const rateShown = parked || Math.abs(rateS) < 0.5 ? 0 : Math.round(clamp(rateS, -240, 240));

  // HUD
  if (bootState.depth) put(rDepth, 'd', fmt1.format(smoothDepth));
  if (bootState.press) put(rPress, 'p', fmt1.format(1 + smoothDepth / 10.06));
  if (bootState.temp) {
    const tv = tempAt(smoothDepth);
    put(rTemp, 't', `${tv >= 0 ? '+' : '−'}${Math.abs(tv).toFixed(1)}`);
  }
  if (bootState.met) put(rMet, 'm', metString(smoothMet));
  put(rRate, 'r', String(rateShown));

  // dive-completion fill running down the cluster's spine
  const frac = clamp(smoothDepth / MAX_DEPTH, 0, 1).toFixed(4);
  if (cache.prog !== frac) { cache.prog = frac; progEl.style.transform = `scaleY(${frac})`; }

  // zone + sonar work off the instantaneous track depth — sonar hears the
  // boundary the moment the hull crosses it, not after the gauges settle
  const zi = zoneIndex(target.depth);
  if (zi !== zoneIdx) {
    const rising = zi < zoneIdx;
    zoneIdx = zi;
    if (started && PING_LABELS[zi] && !rising) ping(PING_LABELS[zi], now);
  }
  put(rZone, 'z', target.depth < 2 && window.scrollY < 40 ? 'SURFACE' : ZONES[zi].name);

  paintAmbient(smoothDepth);

  if (!reduced || dirty) {
    const t = reduced ? 1.7 : now / 1000;
    sea.render({ t, depth: smoothDepth, dDepth: reduced ? 0 : dDepth, now, reduced, dt });
    drawTape(smoothDepth);
    dirty = false;
  }

  started = true;
}

function start() { lastNow = performance.now(); rafId = requestAnimationFrame(frame); }
function stop() { cancelAnimationFrame(rafId); rafId = 0; }

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
  else if (!rafId) start();
});

window.addEventListener('resize', () => {
  sea.resize();
  sizeTape();
  measureAnchors();
  dirty = true;
});

window.addEventListener('scroll', () => { dirty = true; }, { passive: true });

measureAnchors();
sizeTape();
boot();

// if the browser restored a mid-dive scroll position, join the dive there —
// no smoothing sweep, no spurious sonar pings
{
  const t0 = sampleTrack(window.scrollY + window.innerHeight * 0.55);
  smoothDepth = prevDepth = t0.depth;
  smoothMet = t0.met;
  zoneIdx = zoneIndex(t0.depth);
}

start();

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => { measureAnchors(); dirty = true; });
}
window.addEventListener('load', () => { measureAnchors(); dirty = true; });
