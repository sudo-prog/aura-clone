/* The Moth Who Mapped the Moon — night engine
   One smoothed scroll progress P drives: camera altitude/pan, sky color,
   moon phase/position/scale, constellation silk, sea moon, lamp moths,
   fireflies, the lighthouse beam, and Etta's flight spline. */
(() => {
'use strict';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = s => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const sstep = t => t * t * (3 - 2 * t);

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- keyframe tracks ---------- */
function track(keys) {
  return p => {
    if (p <= keys[0][0]) return keys[0][1];
    const n = keys.length;
    if (p >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0;
    while (keys[i + 1][0] < p) i++;
    const [p0, v0] = keys[i], [p1, v1] = keys[i + 1];
    return lerp(v0, v1, sstep((p - p0) / (p1 - p0 || 1)));
  };
}
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function ctrack(keys) { // values: arrays of hex colors
  const rgb = keys.map(([p, arr]) => [p, arr.map(hex2rgb)]);
  return p => {
    if (p <= rgb[0][0]) return rgb[0][1].map(c => `rgb(${c[0]},${c[1]},${c[2]})`);
    const n = rgb.length;
    if (p >= rgb[n - 1][0]) return rgb[n - 1][1].map(c => `rgb(${c[0]},${c[1]},${c[2]})`);
    let i = 0;
    while (rgb[i + 1][0] < p) i++;
    const [p0, a] = rgb[i], [p1, b] = rgb[i + 1];
    const t = sstep((p - p0) / (p1 - p0 || 1));
    return a.map((c, j) => `rgb(${Math.round(lerp(c[0], b[j][0], t))},${Math.round(lerp(c[1], b[j][1], t))},${Math.round(lerp(c[2], b[j][2], t))})`);
  };
}

/* ---------- non-uniform Catmull-Rom / Hermite spline ---------- */
function spline(pts) { // pts: [{p, x, y}] sorted by p
  const n = pts.length;
  const mx = [], my = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dp = (b.p - a.p) || 1;
    mx[i] = (b.x - a.x) / dp;
    my[i] = (b.y - a.y) / dp;
  }
  return q => {
    if (q <= pts[0].p) return { x: pts[0].x, y: pts[0].y };
    if (q >= pts[n - 1].p) return { x: pts[n - 1].x, y: pts[n - 1].y };
    let i = 0;
    while (pts[i + 1].p < q) i++;
    const a = pts[i], b = pts[i + 1], dp = b.p - a.p || 1;
    const t = (q - a.p) / dp, t2 = t * t, t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t,
          h01 = -2 * t3 + 3 * t2,   h11 = t3 - t2;
    return {
      x: h00 * a.x + h10 * dp * mx[i] + h01 * b.x + h11 * dp * mx[i + 1],
      y: h00 * a.y + h10 * dp * my[i] + h01 * b.y + h11 * dp * my[i + 1],
    };
  };
}

/* ---------- moon lune (lit portion) ---------- */
function lunePath(R, k, side) {
  k = clamp(k, 0, 1);
  if (k <= 0.004) return '';
  const w = (2 * k - 1) * R, aw = Math.abs(w).toFixed(2);
  if (side > 0) return `M 0 ${-R} A ${R} ${R} 0 0 1 0 ${R} A ${aw} ${R} 0 0 ${w > 0 ? 1 : 0} 0 ${-R} Z`;
  return `M 0 ${-R} A ${R} ${R} 0 0 0 0 ${R} A ${aw} ${R} 0 0 ${w > 0 ? 0 : 1} 0 ${-R} Z`;
}

/* ---------- DOM handles ---------- */
const sky = $('#sky'), celestial = $('#celestial'), fx = $('#fx');
const far = $('#far'), mid = $('#mid'), near = $('#near');
const moth = $('#moth'), beam = $('#beam');
const seaMoon = $('#seaMoon'), lampMoths = $('#lampmoths');
const rail = $('#rail'), map18 = $('#map18');

let vw = innerWidth, vh = innerHeight, docH = 1;
let B = [];                     // chapter anchor progress points
const cp = (i, f) => B[i] + f * (B[i + 1] - B[i]);

/* tracks (built after measuring) */
let altT, camXT, skyT, mxT, myT, msT, mkT, mgT, darkT, starsT, mwT,
    ffT, lmT, seaMT, seaAT, dipT, mScaleT, m18T, constDimT, labelT, shootW,
    flight, sideFlipP, landP;

/* celestial elements */
let skyShift, mwGroup, starGroup, constGroups = [], moonG, moonGlowA, moonGlowB,
    moonDark, moonLit, craterG, trailG, trailDots = [];
let shootG, shootLine, shootHead;
const shoot = { active: false, next: 0, t0: 0, x0: 0, y0: 0, dx: 0, dy: 0 };
let R0 = 48;

/* state */
let P = 0, prevMoth = null, lastFlap = 0, theta = -0.14, lastT = 0;
let introDone = RM, introStart = 0, running = false, rafId = 0;
let lastSky = '', landedNow = false, railLinks = [], lastCur = -2;
let lastConstDim = -1, flyBorn = 0;

const perch = () => ({
  x: (vw <= 700 ? 0.061 : 0.101) * vw,
  y: 0.708 * vh,
});

/* ================= build ================= */

function measure() {
  vw = innerWidth; vh = innerHeight;
  docH = document.documentElement.scrollHeight;
  const ids = ['#cover', '#ch1', '#ch2', '#ch3', '#ch4', '#ch5', '#ch6', '#the-end'];
  B = ids.map((id, i) => i === 0 ? 0 :
    clamp(($(id).offsetTop - vh * 0.6) / (docH - vh), 0, 1));
  B.push(1);
  for (let i = 1; i < B.length; i++) if (B[i] <= B[i - 1]) B[i] = B[i - 1] + 0.001;
}

function buildTracks() {
  altT = track([ // camera altitude in vh
    [0, 0], [cp(1, 0), 0], [cp(1, .6), 3], [cp(1, .95), 12],
    [cp(2, .2), 34], [cp(2, .55), 60], [cp(2, .95), 82],
    [cp(3, .2), 40], [cp(3, .5), 26], [cp(3, .95), 58],
    [cp(4, .3), 120], [cp(4, .7), 190], [cp(4, 1), 235],
    [cp(5, .35), 290], [cp(5, .85), 308],
    [cp(6, .1), 300], [cp(6, .45), 170], [cp(6, .8), 40], [cp(6, .97), 2], [cp(6, 1), 0],
    [1, 0]]);
  camXT = track([ // camera pan in vw
    [0, 0], [cp(2, .8), 0], [cp(2, 1), 6], [cp(3, .15), 30], [cp(3, .45), 45],
    [cp(3, 1), 40], [cp(4, .5), 22], [cp(5, .2), 5], [cp(5, .8), 0], [1, 0]]);
  skyT = ctrack([
    [0,          ['#131543', '#2A2D5F', '#41386B', '#5A4470']],
    [cp(2, .5),  ['#101233', '#25294F', '#383363', '#4C3E67']],
    [cp(3, .5),  ['#0D0F2E', '#20244E', '#2C3160', '#3A3A6A']],
    [cp(4, .5),  ['#07081C', '#12143B', '#191C4A', '#232457']],
    [cp(5, .5),  ['#05060F', '#0D0F2B', '#141640', '#1B1D4A']],
    [cp(6, .6),  ['#0B0D28', '#1E2150', '#2E2E62', '#3D3A6C']],
    [1,          ['#0E1030', '#252963', '#3A3870', '#514570']]]);
  const mob = vw < 700;
  mxT = track([[0, mob ? 22 : 20], [cp(2, 0), mob ? 24 : 22], [cp(2, .35), 44], [cp(2, 1), 50],
    [cp(3, .3), 52], [cp(3, 1), 55],
    [cp(4, .3), 50], [cp(5, .3), 50], [cp(6, .2), 50], [cp(6, .7), 34], [cp(6, 1), 30],
    [cp(7, .25), 50], [1, 50]]);
  myT = track([[0, mob ? 12 : 22], [cp(2, 0), mob ? 11 : 16], [cp(2, 1), 11], [cp(3, .3), 14], [cp(4, 0), 14], [cp(4, 1), 13],
    [cp(5, .3), 33], [cp(5, 1), 34], [cp(6, .25), 24], [cp(6, .8), 16],
    [cp(7, .25), 27], [1, 27]]);
  msT = track([[0, 1], [cp(3, 1), 1.06], [cp(4, .5), 1.15], [cp(4, 1), 1.5],
    [cp(5, .25), 4.6], [cp(5, .6), 4.9], [cp(5, .78), 5.5], [cp(5, 1), 5.4],
    [cp(6, .15), 3.2], [cp(6, .5), 1.4], [cp(6, .9), 1], [cp(7, .3), 1.12], [1, 1.12]]);
  mkT = track([[0, .78], [cp(1, 1), .74], [cp(2, 1), .6], [cp(3, 1), .42], [cp(4, 1), .25],
    [cp(5, .5), .12], [cp(5, 1), .08], [cp(6, .5), .04], [cp(6, .95), .012],
    [cp(7, .12), .004], [cp(7, .45), .03], [cp(7, .85), .1], [1, .1]]);
  mgT = track([[0, .44], [cp(4, 1), .55], [cp(5, .5), .8], [cp(6, .9), .3],
    [cp(7, .12), .18], [cp(7, .8), .62], [1, .62]]);
  darkT = track([[0, .58], [cp(2, .5), .58], [cp(4, .5), .65], [cp(5, .3), .95], [cp(6, .4), .6],
    [cp(6, .9), .5], [1, .5]]);
  starsT = track([[0, .55], [cp(2, .5), .7], [cp(3, .8), .85], [cp(4, .3), 1],
    [cp(6, .7), .85], [1, .75]]);
  mwT = track([[cp(3, .8), 0], [cp(4, .35), 1], [cp(5, .6), .8], [cp(6, .35), .25], [1, 0]]);
  ffT = track([[0, 1], [cp(1, .9), .9], [cp(2, .4), 0], [cp(6, .78), 0],
    [cp(6, .96), .8], [1, 1]]);
  lmT = track([[0, .8], [cp(2, .9), .85], [cp(3, .35), 0], [cp(6, .65), 0],
    [cp(6, .85), .6], [1, .7]]);
  seaMT = track([[cp(3, 0), 0], [cp(3, .25), .95], [cp(3, .9), .7], [cp(4, .15), 0]]);
  seaAT = track([[cp(3, .4), 0], [cp(3, .58), 1], [cp(3, .75), .9], [cp(3, .92), .15]]);
  dipT = track([[cp(6, .68), 0], [cp(6, .78), 1], [cp(6, .9), 0]]);
  mScaleT = track([[0, 1], [cp(4, 0), 1], [cp(4, 1), .92], [cp(5, .5), .85],
    [cp(6, .4), 1], [1, 1]]);
  m18T = track([[cp(7, .22), 0], [cp(7, .55), 1]]);
  /* the silk map steps back while Etta faces the moon, re-brightens for the
     descent ("Look behind you, small one"), hangs full at The End */
  constDimT = track([[0, 1], [cp(5, .02), 1], [cp(5, .2), .3], [cp(5, .72), .3],
    [cp(5, .95), .8], [cp(6, .9), .8], [cp(6, .99), 1], [1, 1]]);
  /* names hide behind the dialogue panels; the map hangs *named* at The End */
  labelT = track([[0, .9], [cp(5, .02), .9], [cp(5, .16), 0],
    [cp(6, .78), 0], [cp(6, .98), .9], [1, .9]]);
  shootW = [cp(4, .12), cp(5, .66)];
  sideFlipP = cp(7, .08);
  landP = cp(6, .985);
  constWindows = [
    [cp(4, .14), cp(4, .32)],
    [cp(4, .37), cp(4, .53)],
    [cp(4, .56), cp(4, .74)],
    [cp(4, .77), cp(4, .90)],
  ];
}

/* constellation definitions — named for home */
const CONSTS = [
  { name: 'the foxglove',     ax: .31, ay: .185, stars: [[0, 7], [1.5, 2.5], [4, -1.5], [7, -4]], chain: [0, 1, 2, 3] },
  { name: 'the thimble',      ax: .58, ay: .100, stars: [[0, -5], [4.8, -1.5], [3, 4], [-3, 4], [-4.8, -1.5]], chain: [0, 1, 2, 3, 4, 0] },
  { name: 'the keeper’s cat', ax: .40, ay: -.012, stars: [[-8, 4], [-4, 0], [0, 2], [3, -2], [6, -4], [8, -8]], chain: [0, 1, 2, 3, 4, 5] },
  { name: 'the doorlatch',    ax: .60, ay: -.100, stars: [[-3.2, 0], [3.2, 0]], chain: [0, 1] },
];
let constWindows = [];

function el(name, attrs, parent) {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

function skyShiftAt(p) {
  return {
    x: -camXT(p) * .16 * vw / 100,
    y: altT(p) * .16 * vh / 100,
  };
}

function buildCelestial() {
  celestial.innerHTML = '';
  celestial.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  celestial.setAttribute('width', vw);
  celestial.setAttribute('height', vh);

  const defs = el('defs', {}, celestial);
  const g1 = el('radialGradient', { id: 'moonGlowG' }, defs);
  el('stop', { offset: '0', 'stop-color': '#FFE2A8', 'stop-opacity': '.65' }, g1);
  el('stop', { offset: '.45', 'stop-color': '#FFE2A8', 'stop-opacity': '.16' }, g1);
  el('stop', { offset: '1', 'stop-color': '#FFE2A8', 'stop-opacity': '0' }, g1);
  const g2 = el('linearGradient', { id: 'litG', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  el('stop', { offset: '0', 'stop-color': '#FFF3D3' }, g2);
  el('stop', { offset: '1', 'stop-color': '#F2C275' }, g2);
  const g3 = el('radialGradient', { id: 'starGlowG' }, defs);
  el('stop', { offset: '0', 'stop-color': '#FFE2A8', 'stop-opacity': '.7' }, g3);
  el('stop', { offset: '.5', 'stop-color': '#FFE2A8', 'stop-opacity': '.2' }, g3);
  el('stop', { offset: '1', 'stop-color': '#FFE2A8', 'stop-opacity': '0' }, g3);
  const blur = el('filter', { id: 'mwBlur', x: '-40%', y: '-40%', width: '180%', height: '180%' }, defs);
  el('feGaussianBlur', { stdDeviation: 26 }, blur);

  skyShift = el('g', {}, celestial);

  /* milky way */
  mwGroup = el('g', { opacity: 0 }, skyShift);
  el('ellipse', { cx: .62 * vw, cy: -.5 * vh, rx: .55 * vw, ry: .12 * vh,
    fill: '#C9CFEF', opacity: .10, filter: 'url(#mwBlur)',
    transform: `rotate(-24 ${.62 * vw} ${-.5 * vh})` }, mwGroup);
  el('ellipse', { cx: .56 * vw, cy: -.42 * vh, rx: .4 * vw, ry: .07 * vh,
    fill: '#DCE2F7', opacity: .08, filter: 'url(#mwBlur)',
    transform: `rotate(-24 ${.56 * vw} ${-.42 * vh})` }, mwGroup);

  /* stars */
  starGroup = el('g', {}, skyShift);
  const rnd = mulberry32(20260708);
  const count = vw < 700 ? 150 : 240;
  let twinklers = 0;
  for (let i = 0; i < count; i++) {
    const x = (-0.15 + 1.3 * rnd()) * vw;
    const y = (-1.62 + 2.7 * rnd()) * vh;
    if (y > .45 * vh && rnd() < .55) continue; // thinner near the meadow
    const r = .5 + rnd() * 1.15;
    const o = .35 + rnd() * .6;
    const c = rnd() < .12 ? '#FFE2A8' : (rnd() < .4 ? '#C9CFEF' : '#F4EAD2');
    const s = el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r.toFixed(2), fill: c, opacity: o.toFixed(2) }, starGroup);
    if (!RM && twinklers < 80 && rnd() < .38) {
      twinklers++;
      s.classList.add('tw');
      s.style.setProperty('--twd', (2.6 + rnd() * 3.4).toFixed(2) + 's');
      s.style.setProperty('--twD', (-rnd() * 6).toFixed(2) + 's');
      s.style.setProperty('--two', o.toFixed(2));
    }
  }

  /* constellations (reveal windows live in buildTracks, with the anchors) */
  constGroups = [];
  const u = vh * .016;
  CONSTS.forEach((c, ci) => {
    const g = el('g', {}, skyShift);
    const cx = c.ax * vw, cy = c.ay * vh;
    const pts = c.stars.map(([sx, sy]) => [cx + sx * u, cy + sy * u]);
    const lines = [];
    for (let i = 0; i < c.chain.length - 1; i++) {
      const a = pts[c.chain[i]], b = pts[c.chain[i + 1]];
      const ln = el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'const-line' }, g);
      ln.style.opacity = 0;
      ln.style.transition = 'opacity .7s ease';
      lines.push(ln);
    }
    const glows = [], cores = [];
    pts.forEach(([px, py]) => {
      const gl = el('circle', { cx: px, cy: py, r: u * 1.7, fill: 'url(#starGlowG)', opacity: 0 }, g);
      gl.style.transition = 'opacity .9s ease';
      glows.push(gl);
      cores.push(el('circle', { cx: px, cy: py, r: u * .34, fill: '#F4EAD2', opacity: .75 }, g));
    });
    const maxY = Math.max(...pts.map(p => p[1]));
    const label = el('text', { x: cx, y: maxY + u * 2.6, 'text-anchor': 'middle', class: 'const-label' }, g);
    label.style.fontSize = Math.max(12, vh * .0155) + 'px';
    label.textContent = c.name;
    label.style.transition = 'opacity 1.2s ease';
    constGroups.push({ g, lines, glows, cores, label, pts, revealed: -1, labelOp: -1 });
  });
  lastConstDim = -1;

  /* a rare, slow shooting star (deep-sky chapters only; behind the moon) */
  shootG = el('g', { opacity: 0 }, celestial);
  shootLine = el('line', { stroke: '#EFDFC0', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, shootG);
  shootHead = el('circle', { r: 1.7, fill: '#FFF3D3' }, shootG);
  shoot.active = false;

  /* Etta's route dots */
  trailG = el('g', {}, celestial);
  trailDots = [];
  for (let i = 0; i < 14; i++) {
    trailDots.push({ e: el('circle', { r: 2.1, fill: '#F4EAD2', opacity: 0 }, trailG), x: 0, y: 0, a: 0 });
  }

  /* the moon */
  moonG = el('g', {}, celestial);
  R0 = clamp(vh * .055, 34, 62);
  moonGlowA = el('circle', { r: R0 * 2.7, fill: 'url(#moonGlowG)', opacity: .5 }, moonG);
  moonGlowB = el('circle', { r: R0 * 1.4, fill: 'url(#moonGlowG)', opacity: .5 }, moonG);
  const clip = el('clipPath', { id: 'moonClip' }, moonG);
  el('circle', { r: R0 }, clip);
  moonDark = el('circle', { r: R0, fill: '#1B1D4C', opacity: .45,
    stroke: 'rgba(201,207,239,.16)', 'stroke-width': 1 }, moonG);
  craterG = el('g', { 'clip-path': 'url(#moonClip)' }, moonG);
  [[-.32, -.12, .18], [.26, .3, .13], [.08, -.38, .1], [-.12, .34, .09], [.38, -.05, .07]].forEach(([x, y, r]) => {
    el('circle', { cx: x * R0, cy: y * R0, r: r * R0, fill: '#C9CFEF', opacity: .07 }, craterG);
  });
  moonLit = el('path', { fill: 'url(#litG)' }, moonG);
  /* warm maria on the lit face — the gold disc reads worn, not flat */
  const litCraterG = el('g', { 'clip-path': 'url(#moonClip)' }, moonG);
  [[-.44, -.3, .13], [-.5, .2, .1], [-.28, .44, .08], [-.62, -.04, .07]].forEach(([x, y, r]) => {
    el('circle', { cx: x * R0, cy: y * R0, r: r * R0, fill: '#DE9F4E', opacity: .13 }, litCraterG);
  });
}

function buildFireflies() {
  fx.innerHTML = '';
  fx.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  fx.setAttribute('width', vw);
  fx.setAttribute('height', vh);
  const rnd = mulberry32(714);
  fireflies = [];
  const n = vw < 700 ? 8 : 13;
  for (let i = 0; i < n; i++) {
    const g = el('g', {}, fx);
    el('circle', { r: 5.5, fill: '#EFB65E', opacity: .16 }, g);
    el('circle', { r: 1.7, fill: '#FFE2A8', opacity: .9 }, g);
    fireflies.push({
      g,
      x: (0.05 + rnd() * .9) * vw,
      y: (0.56 + rnd() * .3) * vh,
      ax: 26 + rnd() * 52, ay: 14 + rnd() * 30,
      sx: .00016 + rnd() * .00034, sy: .0002 + rnd() * .0004,
      ph: rnd() * 6.28, pu: .0006 + rnd() * .0012,
      delay: 600 + i * 240 + rnd() * 220, /* they ignite one by one at load */
    });
  }
}
let fireflies = [];

/* flight path */
function buildFlight() {
  const px = perch();
  const W = [];
  const add = (p, xvw, yvh) => W.push({ p, x: xvw * vw / 100, y: yvh * vh / 100 });
  W.push({ p: 0, x: px.x, y: px.y });
  W.push({ p: cp(1, .04), x: px.x, y: px.y });
  add(cp(1, .3), 18, 62); add(cp(1, .5), 13, 56); add(cp(1, .68), 20, 52);
  add(cp(1, .85), 15, 46); add(cp(1, 1), 24, 45);
  add(cp(2, .18), 46, 58); add(cp(2, .38), 66, 72); add(cp(2, .5), 77, 63);
  add(cp(2, .6), 68, 55); add(cp(2, .7), 60, 65); add(cp(2, .78), 72, 60);
  add(cp(2, .9), 58, 46); add(cp(2, 1), 52, 38);
  add(cp(3, .15), 66, 32); add(cp(3, .3), 73, 48); add(cp(3, .45), 64, 64);
  add(cp(3, .6), 58, 70); add(cp(3, .8), 52, 56); add(cp(3, 1), 49, 42);
  /* chapter four: visit each constellation as it is strung */
  const u = vh * .016;
  CONSTS.forEach((c, i) => {
    const [w0, w1] = constWindows[i];
    const pm = (w0 + w1) / 2;
    const sh = skyShiftAt(pm);
    const mxx = c.ax * vw + sh.x, myy = c.ay * vh + sh.y;
    W.push({ p: pm, x: clamp(mxx, .1 * vw, .9 * vw), y: clamp(myy + u * 2, .08 * vh, .8 * vh) });
  });
  add(cp(4, 1), 50, 30);
  /* chapter five: she hovers against the moon's dark shoulder, above the
     dialogue panels — tiny cream moth on an enormous dark face */
  add(cp(5, .15), 53, 27); add(cp(5, .35), 46, 21); add(cp(5, .55), 50, 25);
  add(cp(5, .75), 55, 20); add(cp(5, .92), 50, 24);
  /* chapter six: down along her own silk, riding the upper sky, then a
     final dive left of the panels to the foxglove perch */
  add(cp(6, .06), 57, 30); add(cp(6, .28), 49, 27); add(cp(6, .5), 42, 27);
  add(cp(6, .72), 27, 44); add(cp(6, .88), 17, 60);
  W.push({ p: landP, x: px.x, y: px.y - 4 });
  W.push({ p: 1, x: px.x, y: px.y - 4 });
  W.sort((a, b) => a.p - b.p);
  for (let i = 1; i < W.length; i++) if (W[i].p <= W[i - 1].p) W[i].p = W[i - 1].p + 1e-4;
  flight = spline(W);
}

/* chapter rail */
const TITLES = [
  'Chapter One — In Which the Moon Grows Thin',
  'Chapter Two — In Which a Lantern Makes Its Case',
  'Chapter Three — In Which the Sea Keeps a Second Moon',
  'Chapter Four — In Which the Stars Are Named for Home',
  'Chapter Five — In Which the Moon Explains Itself',
  'Chapter Six — In Which a Map Finds Its Use',
];
function buildRail() {
  const phases = [.74, .6, .42, .25, .1, .03];
  railLinks = phases.map((k, i) => {
    const a = document.createElement('a');
    a.href = `#ch${i + 1}`;
    a.setAttribute('aria-label', TITLES[i]);
    a.title = TITLES[i];
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '-10 -10 20 20');
    s.setAttribute('width', '18');
    s.setAttribute('height', '18');
    el('circle', { r: 8, fill: '#1D1F4E', stroke: 'rgba(244,234,210,.3)', 'stroke-width': '.8' }, s);
    el('path', { fill: '#EFB65E', d: lunePath(8, k, -1) }, s);
    a.appendChild(s);
    rail.appendChild(a);
    return a;
  });
}

/* chapter-plate moon medallions — each plate carries its night's phase */
function buildPlateMoons() {
  const phases = [.74, .6, .42, .25, .1, .03];
  document.querySelectorAll('.chapter .plate').forEach((pl, i) => {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '-13 -13 26 26');
    s.setAttribute('class', 'plate-moon');
    s.setAttribute('aria-hidden', 'true');
    el('circle', { r: 10, fill: '#171949', stroke: 'rgba(201,207,239,.28)', 'stroke-width': '.9' }, s);
    el('path', { fill: '#EFB65E', d: lunePath(10, phases[i], -1) }, s);
    pl.insertBefore(s, pl.firstChild);
  });
}

/* text reveals */
function buildReveals() {
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: .22 });
  document.querySelectorAll('.beat, .plate, #the-end').forEach(n => io.observe(n));
}

/* ================= frame update ================= */

let lastMoonK = -1, lastMoonSide = 0;

function update(t) {
  const dt = Math.min(50, t - lastT || 16);
  lastT = t;

  const target = clamp(scrollY / (docH - vh || 1), 0, 1);
  P = RM ? target : P + (target - P) * .115;
  if (Math.abs(target - P) < 1e-5) P = target;

  const alt = altT(P), camX = camXT(P);
  const altPx = alt * vh / 100, camPx = camX * vw / 100;

  far.style.transform  = `translate3d(${(-camPx * .55).toFixed(1)}px, ${(altPx * .55).toFixed(1)}px, 0)`;
  mid.style.transform  = `translate3d(${(-camPx * .8).toFixed(1)}px, ${(altPx * .8).toFixed(1)}px, 0)`;
  near.style.transform = `translate3d(${(-camPx * 1.3).toFixed(1)}px, ${(altPx * 1.3).toFixed(1)}px, 0)`;

  const sh = skyShiftAt(P);
  skyShift.setAttribute('transform', `translate(${sh.x.toFixed(1)} ${sh.y.toFixed(1)})`);

  /* sky */
  const c = skyT(P);
  const s = `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 48%, ${c[2]} 78%, ${c[3]} 100%)`;
  if (s !== lastSky) { sky.style.background = s; lastSky = s; }

  starGroup.setAttribute('opacity', starsT(P).toFixed(2));
  mwGroup.setAttribute('opacity', mwT(P).toFixed(2));

  /* moon */
  const mxp = mxT(P) * vw / 100, myp = myT(P) * vh / 100, msc = msT(P);
  const k = mkT(P), side = P < sideFlipP ? -1 : 1;
  moonG.setAttribute('transform', `translate(${mxp.toFixed(1)} ${myp.toFixed(1)}) scale(${msc.toFixed(3)})`);
  if (Math.abs(k - lastMoonK) > .0015 || side !== lastMoonSide) {
    moonLit.setAttribute('d', lunePath(R0, k, side));
    lastMoonK = k; lastMoonSide = side;
  }
  const breathe = RM ? 1 : 1 + .07 * Math.sin(t * .0009);
  const mg = mgT(P) * breathe;
  moonGlowA.setAttribute('opacity', (mg * .8).toFixed(2));
  moonGlowB.setAttribute('opacity', mg.toFixed(2));
  moonDark.setAttribute('opacity', darkT(P).toFixed(2));

  /* constellations */
  const cDim = constDimT(P), cLab = labelT(P);
  const dimChanged = Math.abs(cDim - lastConstDim) > .008;
  for (let ci = 0; ci < constGroups.length; ci++) {
    const cg = constGroups[ci];
    const [w0, w1] = constWindows[ci];
    const f = clamp((P - w0) / (w1 - w0 || 1), 0, 1);
    const nSeg = cg.lines.length;
    const vis = Math.floor(f * (nSeg + .999));
    if (vis !== cg.revealed) {
      cg.lines.forEach((ln, i) => { ln.style.opacity = i < vis ? .85 : 0; });
      cg.glows.forEach((gl, i) => {
        const on = f > i / Math.max(1, cg.pts.length - 1) * .9;
        gl.setAttribute('opacity', on ? .3 : 0);
      });
      cg.revealed = vis;
    }
    if (dimChanged) cg.g.setAttribute('opacity', cDim.toFixed(2));
    const lo = f >= 1 ? cLab : 0; /* named once strung; hangs named at The End */
    if (Math.abs(lo - cg.labelOp) > .02) { cg.label.style.opacity = lo.toFixed(2); cg.labelOp = lo; }
  }
  if (dimChanged) lastConstDim = cDim;

  /* one slow shooting star, sometimes, while she is among the stars */
  if (!RM) {
    if (shoot.active) {
      const q = (t - shoot.t0) / 1600;
      if (q >= 1) {
        shoot.active = false;
        shootG.setAttribute('opacity', 0);
        shoot.next = t + 9000 + Math.random() * 9000;
      } else {
        const e = sstep(q);
        const hx = shoot.x0 + shoot.dx * e, hy = shoot.y0 + shoot.dy * e;
        const tl = Math.sin(Math.PI * clamp(q * 1.2, 0, 1)) * vw * .055;
        const inv = 1 / (Math.hypot(shoot.dx, shoot.dy) || 1);
        shootLine.setAttribute('x1', (hx - shoot.dx * inv * tl).toFixed(1));
        shootLine.setAttribute('y1', (hy - shoot.dy * inv * tl).toFixed(1));
        shootLine.setAttribute('x2', hx.toFixed(1));
        shootLine.setAttribute('y2', hy.toFixed(1));
        shootHead.setAttribute('cx', hx.toFixed(1));
        shootHead.setAttribute('cy', hy.toFixed(1));
        shootG.setAttribute('opacity', (Math.sin(Math.PI * q) * .7).toFixed(2));
      }
    } else if (P > shootW[0] && P < shootW[1]) {
      if (!shoot.next) shoot.next = t + 4500;
      else if (t > shoot.next) {
        shoot.active = true;
        shoot.t0 = t;
        shoot.x0 = (.22 + Math.random() * .5) * vw;
        shoot.y0 = (.06 + Math.random() * .22) * vh;
        const dir = Math.random() < .5 ? -1 : 1;
        shoot.dx = dir * (.14 + Math.random() * .09) * vw;
        shoot.dy = (.05 + Math.random() * .05) * vh;
      }
    }
  }

  /* sea's second moon */
  const smOp = seaMT(P);
  seaMoon.setAttribute('opacity', smOp.toFixed(2));
  if (smOp > .02 && !RM) {
    const amp = 2 + seaAT(P) * 26;
    const strips = seaMoon.querySelectorAll('.ss');
    strips.forEach((r, i) => {
      r.setAttribute('transform', `translate(${(Math.sin(t * .0014 + i * 1.7) * amp * (i % 2 ? 1 : -.8)).toFixed(1)} 0)`);
    });
  }

  /* lamp moths */
  const lm = lmT(P);
  lampMoths.setAttribute('opacity', lm.toFixed(2));
  if (lm > .02) {
    const kids = lampMoths.children;
    for (let i = 0; i < kids.length; i++) {
      const sp = .0005 + i * .00013, ph = i * 1.9;
      const rx = 34 + i * 11, ry = 15 + i * 5.5;
      const ang = RM ? ph : t * sp + ph;
      kids[i].setAttribute('cx', (1270 + Math.cos(ang) * rx).toFixed(1));
      kids[i].setAttribute('cy', (277 + Math.sin(ang * 1.7) * ry).toFixed(1));
    }
  }

  /* beam */
  const dip = dipT(P);
  if (alt < 140) {
    if (!RM) theta += .00022 * dt * (1 - dip * .85);
    const deg = (Math.sin(theta) * 26) + dip * 30;
    beam.setAttribute('transform', `rotate(${deg.toFixed(2)} 1270 277)`);
  }

  /* fireflies */
  const fOp = ffT(P);
  fx.style.opacity = fOp.toFixed(2);
  fx.style.transform = `translate3d(0, ${(altPx * 1.15).toFixed(1)}px, 0)`;
  if (fOp > .02) {
    for (const f of fireflies) {
      const x = RM ? f.x : f.x + Math.sin(t * f.sx + f.ph) * f.ax;
      const y = RM ? f.y : f.y + Math.sin(t * f.sy + f.ph * 2.3) * f.ay;
      const pulse = RM ? .8 : .35 + .65 * (0.5 + 0.5 * Math.sin(t * f.pu + f.ph * 3));
      const ig = RM ? 1 : (flyBorn ? sstep(clamp((t - flyBorn - f.delay) / 1100, 0, 1)) : 0);
      f.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      f.g.setAttribute('opacity', (pulse * ig).toFixed(2));
    }
  }

  /* Etta */
  if (!introDone && scrollY > vh * .3) { introDone = true; moth.classList.add('ready'); }
  let pos;
  if (!introDone) {
    const q = clamp((t - introStart) / 2600, 0, 1);
    if (introStart === 0) pos = { x: -.1 * vw, y: .45 * vh };
    else {
      const e = sstep(q);
      const p0 = { x: -.1 * vw, y: .42 * vh }, p1 = { x: .3 * vw, y: .3 * vh },
            p2 = { x: .02 * vw, y: .78 * vh }, p3 = perch();
      const i1 = 1 - e;
      pos = {
        x: i1 * i1 * i1 * p0.x + 3 * i1 * i1 * e * p1.x + 3 * i1 * e * e * p2.x + e * e * e * p3.x,
        y: i1 * i1 * i1 * p0.y + 3 * i1 * i1 * e * p1.y + 3 * i1 * e * e * p2.y + e * e * e * p3.y,
      };
      if (q >= 1 || scrollY > vh * .3) introDone = true;
    }
  } else {
    pos = flight(P);
    if (!RM) {
      pos.x += Math.sin(t * .0021) * 5 + Math.sin(t * .0037) * 3;
      pos.y += Math.sin(t * .0029) * 4 + Math.cos(t * .0017) * 3;
    }
  }

  let tilt = 0;
  const isLanded = P >= landP && introDone;
  if (isLanded) {
    tilt = -6 + (RM ? 0 : Math.sin(t * .0016) * 1.2);
  } else if (prevMoth) {
    const vx = (pos.x - prevMoth.x) / dt;
    tilt = clamp(vx * 42, -26, 26) + (RM ? 0 : Math.sin(t * .0016) * 2.5);
    const speed = Math.hypot(pos.x - prevMoth.x, pos.y - prevMoth.y) / dt;
    if (t - lastFlap > 180) {
      lastFlap = t;
      const perched = introDone && (P < cp(1, .04) || P >= landP);
      const dur = perched ? 2.8 : clamp(.62 - speed * .5, .16, .7);
      moth.style.setProperty('--flap', dur.toFixed(2) + 's');
    }
  }
  prevMoth = { x: pos.x, y: pos.y };

  updateTrail(pos, t);

  const mSc = mScaleT(P) * (vw < 700 ? .74 : 1);
  moth.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0) rotate(${tilt.toFixed(1)}deg) scale(${mSc.toFixed(3)})`;

  if (isLanded !== landedNow) { moth.classList.toggle('landed', isLanded); landedNow = isLanded; }

  /* the eighteenth map, pinned under the toadstool */
  map18.setAttribute('opacity', m18T(P).toFixed(2));

  /* rail */
  let cur = -1;
  for (let i = 1; i <= 6; i++) if (P >= B[i] - .002 && P < B[i + 1]) cur = i - 1;
  if (cur !== lastCur) {
    railLinks.forEach((a, i) => {
      a.classList.toggle('current', i === cur);
      if (i === cur) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    lastCur = cur;
  }

  rafId = requestAnimationFrame(update);
}

/* comet trail of route dots */
let trailPts = [];
function updateTrail(pos, t) {
  if (RM || !introDone) return;
  const lastP = trailPts[0];
  if (!lastP || Math.hypot(pos.x - lastP.x, pos.y - lastP.y) > 30) {
    trailPts.unshift({ x: pos.x, y: pos.y, a: .5 });
    if (trailPts.length > trailDots.length) trailPts.length = trailDots.length;
  }
  for (let i = 0; i < trailDots.length; i++) {
    const d = trailDots[i].e, p = trailPts[i];
    if (!p || p.a <= .02) { d.setAttribute('opacity', 0); continue; }
    p.a *= .988;
    d.setAttribute('cx', p.x.toFixed(1));
    d.setAttribute('cy', p.y.toFixed(1));
    d.setAttribute('opacity', (p.a * (1 - i / trailDots.length)).toFixed(2));
  }
}

/* ================= lifecycle ================= */

function buildAll() {
  measure();
  buildTracks();
  buildCelestial();
  buildFireflies();
  buildFlight();
  trailPts = [];
  lastSky = ''; lastMoonK = -1;
}

function start() {
  if (running) return;
  running = true;
  lastT = 0;
  rafId = requestAnimationFrame(update);
}
function stop() {
  running = false;
  cancelAnimationFrame(rafId);
}

buildAll();
buildRail();
buildPlateMoons();
buildReveals();

document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

let rszTimer = 0, lastW = vw, lastH = vh;
addEventListener('resize', () => {
  clearTimeout(rszTimer);
  rszTimer = setTimeout(() => {
    if (Math.abs(innerWidth - lastW) < 2 && Math.abs(innerHeight - lastH) < 120) return;
    lastW = innerWidth; lastH = innerHeight;
    buildAll();
  }, 220);
});

addEventListener('load', () => {
  document.documentElement.classList.add('loaded');
  flyBorn = performance.now();
  setTimeout(() => { measure(); buildTracks(); buildFlight(); }, 900);
  setTimeout(() => {
    introStart = performance.now();
    moth.classList.add('ready');
  }, RM ? 100 : 1100);
  if (RM) moth.classList.add('ready');
});

start();
})();
