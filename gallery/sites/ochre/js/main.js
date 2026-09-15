// OCHRE — orchestration: layout, HUD, discovery bookkeeping, reveals.

import { Cave } from './cave.js';
import { PAINTINGS } from './paintings.js';

const $ = s => document.querySelector(s);
const STORE = 'ochre-vayrac-visit';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- persistence ---------- */
function loadVisit() {
  try { return JSON.parse(localStorage.getItem(STORE) || '[]'); }
  catch { return []; }
}
function saveVisit(ids) {
  try { localStorage.setItem(STORE, JSON.stringify([...ids])); } catch { /* private mode */ }
}

/* ---------- reveal choreography ---------- */
const io = new IntersectionObserver(es => {
  for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
document.querySelectorAll('.rv').forEach(el => io.observe(el));
// masthead: orchestrated entrance
document.querySelectorAll('.masthead .rv').forEach((el, i) => {
  el.style.transitionDelay = `${0.25 + i * 0.22}s`;
});

/* ---------- cave boot ---------- */
const canvas = $('#cave');
const ctxOK = !!(canvas.getContext && canvas.getContext('2d'));
if (!ctxOK) document.documentElement.classList.add('no-cave');

const found = new Set(loadVisit());
let cave = null;

const ZONE_SEL = {
  hands: '#g-hands', aurochs: '#g-aurochs', horses: '#g-horses', shaft: '#g-shaft',
};

const chips = new Map();
const labels = $('#labels');
for (const spec of PAINTINGS) {
  const chip = document.createElement('div');
  chip.className = 'chip' + (found.has(spec.id) ? ' found' : '');
  chip.innerHTML = `<span class="chip-id">${spec.cat}</span>${spec.title} · ${spec.m}`;
  labels.appendChild(chip);
  chips.set(spec.id, chip);
}

function zoneRects() {
  const zones = {};
  for (const [name, sel] of Object.entries(ZONE_SEL)) {
    const el = $(sel);
    const r = el.getBoundingClientRect();
    zones[name] = { top: r.top + scrollY, height: r.height };
  }
  return zones;
}

function positionChips() {
  if (!cave) return;
  const vw = innerWidth;
  for (const p of cave.paint) {
    const chip = chips.get(p.spec.id);
    // keep the whole label on the wall — clamp inside the viewport
    const half = (chip.offsetWidth || 0) / 2;
    const cx = Math.max(12 + half, Math.min(p.cx, vw - 12 - half));
    chip.style.left = `${cx}px`;
    chip.style.top = `${p.y + p.h + 14}px`;
  }
}

/* ---------- survey HUD ---------- */
const hudM = $('#hud-m');
const hudZone = $('#hud-zone');
const hudCount = $('#hud-count');
const surveyPos = $('#survey-pos');
const track = $('#survey-track');
const live = $('#live');
const hint = $('#hint');

let metreAnchors = [];  // [docY, metres]
let zoneRanges = [];    // [docY, label]
let stations = new Map();

function buildAnchors() {
  const yOf = sel => { const el = $(sel); const r = el.getBoundingClientRect(); return r.top + scrollY; };
  const midOf = sel => { const el = $(sel); const r = el.getBoundingClientRect(); return r.top + scrollY + r.height / 2; };
  const py = id => { const p = cave.paint.find(q => q.spec.id === id); return p ? p.cy : 0; };

  metreAnchors = [
    [0, 0],
    [innerHeight * 0.85, 0], // still at the mouth until you actually descend
    [midOf('#threshold'), 12],
    [py('p01a'), 87],
    [midOf('#story'), 110],
    [py('p02a'), 141],
    [midOf('#lab'), 168],
    [py('p03a'), 203],
    [py('p04'), 260],
    [midOf('#sealed'), 96],
    [midOf('#door'), 0],
    [document.documentElement.scrollHeight, 0],
  ].sort((a, b) => a[0] - b[0]);

  zoneRanges = [
    [0, 'the cave mouth'],
    [yOf('#threshold'), 'the twilight zone'],
    [yOf('#g-hands'), 'galerie des mains'],
    [yOf('#story') - innerHeight * 0.2, 'the discovery, 1954'],
    [yOf('#g-aurochs'), 'rotonde de l’aurochs'],
    [yOf('#lab') - innerHeight * 0.2, 'the laboratory'],
    [yOf('#g-horses'), 'panneau des chevaux'],
    [yOf('#g-shaft'), 'le puits'],
    [yOf('#sealed') - innerHeight * 0.2, 'the ascent'],
    [yOf('#door') - innerHeight * 0.2, 'the entrance'],
  ];

  // track stations at each painting's document position
  track.querySelectorAll('.st').forEach(el => el.remove());
  stations = new Map();
  const docH = document.documentElement.scrollHeight;
  for (const p of cave.paint) {
    const el = document.createElement('i');
    el.className = 'st' + (p.discovered ? ' lit' : '');
    el.style.top = `${(p.cy / docH) * 100}%`;
    track.appendChild(el);
    stations.set(p.spec.id, el);
  }
}

function metresAt(pos) {
  const a = metreAnchors;
  if (!a.length) return 0;
  if (pos <= a[0][0]) return a[0][1];
  for (let i = 0; i < a.length - 1; i++) {
    if (pos >= a[i][0] && pos < a[i + 1][0]) {
      const t = (pos - a[i][0]) / Math.max(1, a[i + 1][0] - a[i][0]);
      return Math.round(a[i][1] + (a[i + 1][1] - a[i][1]) * t);
    }
  }
  return a[a.length - 1][1];
}

let lastM = -1, lastZone = '';
function hudUpdate(sy) {
  const pos = sy + innerHeight * 0.5;
  const m = metresAt(pos);
  if (m !== lastM) { hudM.textContent = m; lastM = m; }
  let zn = zoneRanges[0] ? zoneRanges[0][1] : '';
  for (const [y, label] of zoneRanges) if (pos >= y) zn = label;
  if (zn !== lastZone) { hudZone.textContent = zn; lastZone = zn; }
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  surveyPos.style.top = `${Math.min(100, (sy / maxScroll) * 100)}%`;
}

/* ---------- plan map + traverse ---------- */
const PLAN_XY = {
  p01a: [128, 64], p01b: [146, 58], p02a: [242, 74], p02b: [260, 64],
  p03a: [356, 70], p03b: [374, 60], p04: [512, 96],
};
const PLAN_M = { p01a: '87', p01b: '', p02a: '141', p02b: '', p03a: '203', p03b: '', p04: '260' };

function buildPlan() {
  const g = $('#plan-stations');
  g.innerHTML = '';
  for (const spec of PAINTINGS) {
    const [x, y] = PLAN_XY[spec.id];
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 4);
    c.setAttribute('class', 'plan-station' + (found.has(spec.id) ? ' found' : ''));
    c.dataset.id = spec.id;
    g.appendChild(c);
    if (PLAN_M[spec.id]) {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      if (spec.id === 'p04') {
        // deepest station: label left of the drop, clear of the dashed sump line
        t.setAttribute('x', x - 14); t.setAttribute('y', y + 16);
        t.style.textAnchor = 'end'; // beats the class's text-anchor: middle
      } else {
        t.setAttribute('x', x); t.setAttribute('y', y + 21);
      }
      t.setAttribute('class', 'plan-stlabel' + (found.has(spec.id) ? ' found' : ''));
      t.textContent = `${PLAN_M[spec.id]} m`;
      t.dataset.for = spec.id;
      g.appendChild(t);
    }
  }
  traverseLine();
}

function traverseLine() {
  const n = found.size;
  const line = $('#traverse-line');
  if (n === 0) line.textContent = 'Light a panel to add it to your survey. Seven wait in the dark.';
  else if (n < 7) line.textContent = `You found ${n} of 7 painted works. The rest remain in the dark.`;
  else line.textContent = 'You found all seven. The dark kept nothing from you.';
  hudCount.textContent = `${n} / 7 found`;
}

/* ---------- discovery ---------- */
let hintShown = false;
function onDiscover(spec) {
  found.add(spec.id);
  saveVisit(found);
  chips.get(spec.id).classList.add('found');
  const st = stations.get(spec.id);
  if (st) st.classList.add('lit');
  const c = document.querySelector(`.plan-station[data-id="${spec.id}"]`);
  if (c) c.classList.add('found');
  const tl = document.querySelector(`.plan-stlabel[data-for="${spec.id}"]`);
  if (tl) tl.classList.add('found');
  traverseLine();
  live.textContent = `Found: ${spec.title}, at ${spec.m}. ${found.size} of 7 painted works.`;
  hint.classList.remove('show');
  hintShown = true;
}

/* ---------- boot ---------- */
function boot() {
  if (!ctxOK) return;
  cave = new Cave(canvas, {
    reduced,
    discovered: found,
    onDiscover,
    onFrame: hudUpdate,
  });
  cave.layout(zoneRects(), document.documentElement.scrollHeight);
  positionChips();
  buildAnchors();
  buildPlan();
  traverseLine();
  cave.start();

  /* input */
  addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') cave.setTorch(e.clientX, e.clientY);
  }, { passive: true });
  addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') cave.setTorch(e.clientX, e.clientY);
  }, { passive: true });
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) cave.setGutter(true); });
  document.addEventListener('mouseover', e => { if (!e.relatedTarget) cave.setGutter(false); });
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const step = 36;
    if (k === 'w') cave.nudgeTorch(0, -step);
    else if (k === 's') cave.nudgeTorch(0, step);
    else if (k === 'a') cave.nudgeTorch(-step, 0);
    else if (k === 'd') cave.nudgeTorch(step, 0);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cave.stop(); else cave.start();
  });

  let rsTimer = 0;
  addEventListener('resize', () => {
    cave.resize();
    clearTimeout(rsTimer);
    rsTimer = setTimeout(() => {
      cave.resize();
      cave.layout(zoneRects(), document.documentElement.scrollHeight);
      positionChips();
      buildAnchors();
    }, 220);
  });

  // gallery hint — once, only if nothing found yet
  if (found.size === 0) {
    const gh = $('#g-hands');
    const hio = new IntersectionObserver(es => {
      for (const e of es) {
        if (e.isIntersecting && !hintShown) {
          hintShown = true;
          hint.classList.add('show');
          setTimeout(() => hint.classList.remove('show'), 6000);
          hio.disconnect();
        }
      }
    }, { threshold: 0.4 });
    hio.observe(gh);
  }
}

$('#reset-visit').addEventListener('click', e => {
  try { localStorage.removeItem(STORE); } catch { /* ignore */ }
  const end = () => { scrollTo({ top: 0, behavior: 'instant' }); location.reload(); };
  if (cave && !reduced) {
    // extinguish choreography: the flame gutters out, then the dark takes the page
    e.currentTarget.disabled = true;
    cave.snuff();
    document.body.classList.add('snuffed');
    setTimeout(end, 950);
  } else {
    end();
  }
});

// layout depends on font metrics — boot after fonts settle
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(boot);
} else {
  addEventListener('load', boot);
}
