/* KILN — scroll-thrown vessel + page choreography */
import * as THREE from 'three';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const body = document.body;
if (reduced) body.classList.add('reduced');
requestAnimationFrame(() => body.classList.add('is-loaded'));

/* ============================================================
   1 · THE SCROLL-THROWN POT
   ============================================================ */

/* Six keyframe profiles, 12 control points each: [radius, height].
   Point roles: 0 axis-bottom · 1-2 foot · 3-5 wall · 6-7 shoulder/neck
   · 8-9 lip · 10-11 inner wall. */
const KEYS = [
  /* lump — wide, low, un-centered */
  [[0.02, 0], [0.85, 0.02], [1.10, 0.10], [1.18, 0.28], [1.12, 0.48], [0.95, 0.66],
   [0.72, 0.80], [0.48, 0.90], [0.26, 0.945], [0.10, 0.95], [0.05, 0.94], [0.02, 0.93]],
  /* centered — tall steady mound */
  [[0.02, 0], [0.72, 0.02], [0.88, 0.10], [0.92, 0.34], [0.90, 0.62], [0.82, 0.90],
   [0.66, 1.10], [0.46, 1.22], [0.24, 1.285], [0.09, 1.30], [0.045, 1.29], [0.02, 1.27]],
  /* opened — squat ring with a well */
  [[0.02, 0], [0.80, 0.02], [0.98, 0.10], [1.02, 0.34], [1.00, 0.58], [0.94, 0.78],
   [0.86, 0.90], [0.80, 0.96], [0.72, 0.98], [0.62, 0.97], [0.52, 0.88], [0.06, 0.30]],
  /* pulled — cylinder */
  [[0.02, 0], [0.50, 0.02], [0.60, 0.08], [0.62, 0.55], [0.625, 1.05], [0.62, 1.50],
   [0.605, 1.80], [0.60, 1.95], [0.59, 2.03], [0.52, 2.05], [0.46, 1.97], [0.05, 1.55]],
  /* shaped — belly, shoulder, collared neck */
  [[0.02, 0], [0.42, 0.02], [0.50, 0.08], [0.72, 0.42], [1.02, 0.95], [0.96, 1.35],
   [0.72, 1.70], [0.40, 1.95], [0.34, 2.14], [0.44, 2.28], [0.38, 2.21], [0.05, 1.80]],
  /* finished — trimmed foot, eased curve, flared lip */
  [[0.02, 0], [0.34, 0.005], [0.44, 0.10], [0.68, 0.40], [1.00, 0.92], [0.94, 1.34],
   [0.68, 1.72], [0.36, 1.98], [0.32, 2.18], [0.46, 2.34], [0.40, 2.26], [0.05, 1.85]],
];

const PN = 84;   /* profile samples */
const SR = 128;  /* radial segments */

const profiles = KEYS.map(k =>
  new THREE.SplineCurve(k.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(PN - 1));

/* morph timeline over chapter progress p ∈ [0,1] — gaps are rests */
const MSEG = [
  [0.12, 0.27, 0, 1],  /* centering  */
  [0.29, 0.44, 1, 2],  /* opening    */
  [0.46, 0.61, 2, 3],  /* pulling    */
  [0.63, 0.79, 3, 4],  /* shaping    */
  [0.81, 0.90, 4, 5],  /* finishing  */
];

const prof = { r: new Float64Array(PN), y: new Float64Array(PN), maxY: 1 };

function blendProfile(p) {
  let from = 0, to = 0, t = 0;
  for (const [s, e, a, b] of MSEG) {
    if (p < s) break;
    if (p <= e) { from = a; to = b; t = easeIO((p - s) / (e - s)); break; }
    from = to = b; t = 0;
  }
  const A = profiles[from], B = profiles[to];
  let maxY = 0;
  for (let i = 0; i < PN; i++) {
    prof.r[i] = lerp(A[i].x, B[i].x, t);
    prof.y[i] = lerp(A[i].y, B[i].y, t);
    if (prof.y[i] > maxY) maxY = prof.y[i];
  }
  prof.maxY = maxY || 1;
}

const canvas = $('#wheel-canvas');
const canvasWrap = $('#canvas-wrap');
const sticky = $('.throw__sticky');
let renderer = null;
let scene, camera, rig, vesselMesh, vesselMat, geo;
let targetP = reduced ? 1 : 0, curP = reduced ? 1 : 0, lastGeomP = -1;
let inView = true, playing = false, lastT = 0, rpmShown = -1;
const rpmEl = $('#rpm');

function webglFallback() {
  body.classList.add('no3d');
  canvasWrap.innerHTML =
    `<svg class="fallback-vessel" viewBox="0 0 200 240" aria-hidden="true">
       <ellipse cx="100" cy="221" rx="42" ry="6" fill="url(#g-shadow)"/>
       <g filter="url(#grain)"><use href="#v-vase" fill="url(#g-flash)"/></g>
       <use href="#v-vase" fill="url(#g-form)"/>
     </svg>`;
}

/* silence three's internal console.error for the one constructor call that
   may legitimately fail — the fallback path should be console-clean too */
const _cerr = console.error;
try {
  console.error = () => {};
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
} catch (e) {
  renderer = null;
} finally {
  console.error = _cerr;
}

if (!renderer) {
  webglFallback();
} else {
  initScene();
}

function makeMatcap() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  /* stoneware grey-brown — cooler and quieter than caramel */
  let g = x.createRadialGradient(184, 168, 16, 256, 256, 344);
  g.addColorStop(0, '#D7C5AF');
  g.addColorStop(.28, '#A78D75');
  g.addColorStop(.6, '#7B6754');
  g.addColorStop(.85, '#524232');
  g.addColorStop(1, '#362A20');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  /* celadon bounce from below right — the studio light */
  g = x.createRadialGradient(412, 416, 20, 412, 416, 260);
  g.addColorStop(0, 'rgba(157,178,160,0.28)');
  g.addColorStop(1, 'rgba(157,178,160,0)');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  /* damp sheen — broad and soft, wet clay not candy */
  g = x.createRadialGradient(160, 136, 4, 160, 136, 116);
  g.addColorStop(0, 'rgba(255,248,238,0.5)');
  g.addColorStop(.45, 'rgba(255,242,226,0.16)');
  g.addColorStop(1, 'rgba(255,242,226,0)');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  /* clay tooth — fine speckle so the surface reads as stoneware */
  for (let i = 0; i < 9000; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 254;
    const px = 256 + Math.cos(a) * r, py = 256 + Math.sin(a) * r;
    x.fillStyle = Math.random() < .55
      ? `rgba(40,30,22,${.05 + Math.random() * .06})`
      : `rgba(235,222,204,${.04 + Math.random() * .05})`;
    x.fillRect(px, py, 1.4, 1.4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* wheel-head top: slip rings, drag smears, slurry — the marks that make
   the rotation readable (everything else on the axis is symmetric) */
function makeSlipTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#41352A'; x.fillRect(0, 0, 512, 512);
  /* concentric slip-water rings */
  for (let r = 16; r < 252; r += 2 + Math.random() * 6) {
    const lite = Math.random() < .5;
    x.strokeStyle = lite
      ? `rgba(212,194,168,${.02 + Math.random() * .05})`
      : `rgba(22,16,11,${.03 + Math.random() * .08})`;
    x.lineWidth = .8 + Math.random() * 2.4;
    x.beginPath(); x.arc(256, 256, r, 0, Math.PI * 2); x.stroke();
  }
  /* partial drag smears — asymmetric, so the spin shows */
  for (let i = 0; i < 9; i++) {
    const a0 = Math.random() * Math.PI * 2;
    const r = 50 + Math.random() * 175;
    const sweep = .5 + Math.random() * 1.1;
    x.strokeStyle = Math.random() < .6
      ? `rgba(206,186,158,${.05 + Math.random() * .06})`
      : `rgba(24,17,11,${.06 + Math.random() * .07})`;
    x.lineWidth = 4 + Math.random() * 9;
    x.lineCap = 'round';
    x.beginPath(); x.arc(256, 256, r, a0, a0 + sweep); x.stroke();
  }
  /* slurry blobs */
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 150;
    const bx = 256 + Math.cos(a) * r, by = 256 + Math.sin(a) * r;
    const rad = 7 + Math.random() * 13;
    const g = x.createRadialGradient(bx, by, 1, bx, by, rad);
    g.addColorStop(0, `rgba(210,190,162,${.10 + Math.random() * .08})`);
    g.addColorStop(1, 'rgba(210,190,162,0)');
    x.fillStyle = g; x.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
  }
  /* wet pool at the center, vignette at the rim */
  let g = x.createRadialGradient(256, 256, 4, 256, 256, 46);
  g.addColorStop(0, 'rgba(26,19,13,.5)'); g.addColorStop(1, 'rgba(26,19,13,0)');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  g = x.createRadialGradient(256, 256, 170, 256, 256, 256);
  g.addColorStop(0, 'rgba(18,13,9,0)'); g.addColorStop(1, 'rgba(18,13,9,.4)');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = 'rgba(220,205,182,.13)'; x.lineWidth = 3;
  x.beginPath(); x.arc(256, 256, 249, 0, Math.PI * 2); x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeShadowTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 8, 128, 128, 126);
  g.addColorStop(0, 'rgba(22,17,12,0.40)');
  g.addColorStop(.55, 'rgba(22,17,12,0.16)');
  g.addColorStop(1, 'rgba(22,17,12,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function initScene() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(33, 1, 0.1, 50);

  /* vessel geometry: fixed lathe topology, positions rewritten per frame */
  geo = new THREE.BufferGeometry();
  const positions = new Float32Array(PN * SR * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const idx = [];
  for (let i = 0; i < PN - 1; i++) {
    for (let j = 0; j < SR; j++) {
      const a = i * SR + j, b = i * SR + (j + 1) % SR;
      const c2 = (i + 1) * SR + j, d = (i + 1) * SR + (j + 1) % SR;
      idx.push(a, c2, b, b, c2, d);
    }
  }
  geo.setIndex(idx);

  const matcap = makeMatcap();
  vesselMat = new THREE.MeshMatcapMaterial({ matcap, side: THREE.DoubleSide, color: 0xE8E0D6 });
  vesselMesh = new THREE.Mesh(geo, vesselMat);

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.32, 1.40, 0.11, 72),
    new THREE.MeshMatcapMaterial({ matcap, color: 0x615446 }));
  disc.position.y = -0.06;

  const slip = new THREE.Mesh(
    new THREE.CircleGeometry(1.30, 72),
    new THREE.MeshBasicMaterial({ map: makeSlipTex() }));
  slip.rotation.x = -Math.PI / 2;
  slip.position.y = -0.003;

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 5.4),
    new THREE.MeshBasicMaterial({ map: makeShadowTex(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.14;

  rig = new THREE.Group();
  rig.add(vesselMesh, disc, slip, shadow);
  scene.add(rig);
  rig.rotation.y = 0.7;

  onResize();
  addEventListener('resize', onResize);

  updateGeometry(curP);
  updateCamera(curP);

  if (reduced) {
    renderer.render(scene, camera);
  } else {
    const io = new IntersectionObserver(es => {
      inView = es[0].isIntersecting;
      syncPlay();
    }, { threshold: 0 });
    io.observe(sticky);
    document.addEventListener('visibilitychange', syncPlay);
    syncPlay();
  }
}

function onResize() {
  if (!renderer) return;
  const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const mobile = innerWidth < 860;
  if (rig) {
    if (reduced) { rig.position.set(0, 0.15, 0); rig.scale.setScalar(0.9); }
    else if (mobile) { rig.position.set(0, 2.5, 0); rig.scale.setScalar(0.72); }
    else { rig.position.set(1.22, 0, 0); rig.scale.setScalar(1); }
  }
  if (reduced && scene) { updateCamera(1); renderer.render(scene, camera); }
}

function ringAmp(p) {
  return 0.006 * sstep(0.46, 0.58, p) + 0.004 * sstep(0.63, 0.72, p) - 0.004 * sstep(0.82, 0.92, p);
}
function wobbleAmp(p) {
  return 0.055 * (1 - sstep(0.13, 0.25, p));
}
function omega(p) {
  return 2.6 - 1.5 * sstep(0.55, 0.8, p) - 0.85 * sstep(0.88, 0.985, p);
}

function updateGeometry(p) {
  blendProfile(p);
  const amp = ringAmp(p), wob = wobbleAmp(p);
  const pos = geo.attributes.position.array;
  let k = 0;
  for (let i = 0; i < PN; i++) {
    const y = prof.y[i];
    const yn = y / prof.maxY;
    let r = prof.r[i] + amp * Math.sin(yn * 48 + 1.2) * Math.sin(yn * Math.PI) * Math.min(prof.r[i] * 2, 1);
    if (r < 0.004) r = 0.004;
    for (let j = 0; j < SR; j++) {
      const th = j * Math.PI * 2 / SR;
      const rr = r * (1 + wob * Math.sin(3 * th + y * 2.1) * Math.min(r, 1));
      pos[k++] = rr * Math.cos(th);
      pos[k++] = y;
      pos[k++] = rr * Math.sin(th);
    }
  }
  geo.attributes.position.needsUpdate = true;
  geo.computeVertexNormals();
  /* the clay darkens while it is worked wet, then dries a shade lighter */
  const dry = sstep(0.86, 1, p);
  const wet = sstep(0.22, 0.34, p) * (1 - sstep(0.78, 0.92, p));
  const kk = 1 - 0.055 * wet;
  vesselMat.color.setRGB(
    lerp(0.910, 1, dry) * kk, lerp(0.878, 1, dry) * kk, lerp(0.839, 1, dry) * kk);
}

function updateCamera(p) {
  const e = easeIO(clamp(p, 0, 1));
  const mobile = innerWidth < 860;
  if (reduced) {
    camera.position.set(0, 2.0, 7.8);
    camera.lookAt(0, 1.15, 0);
  } else if (mobile) {
    camera.position.set(0, lerp(3.2, 3.0, e), lerp(9.8, 9.2, e));
    camera.lookAt(0, lerp(1.55, 2.7, e), 0);
  } else {
    /* look slightly left of the rig so the vessel sits right of center */
    camera.position.set(0, lerp(2.85, 1.95, e), lerp(7.5, 7.8, e));
    camera.lookAt(0.3, lerp(0.62, 1.14, e), 0);
  }
}

function syncPlay() {
  const should = inView && !document.hidden && !reduced && renderer;
  if (should && !playing) {
    playing = true;
    lastT = performance.now();
    requestAnimationFrame(frame);
  } else if (!should) {
    playing = false;
  }
}

function frame(now) {
  if (!playing) return;
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  curP += (targetP - curP) * (1 - Math.exp(-dt * 5));
  if (Math.abs(curP - lastGeomP) > 0.0004) {
    updateGeometry(curP);
    lastGeomP = curP;
  }
  const w = omega(curP);
  rig.rotation.y += w * dt;
  updateCamera(curP);
  const rpm = Math.round(w * 9.549);
  if (rpm !== rpmShown) { rpmShown = rpm; rpmEl.textContent = rpm; }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* ============================================================
   2 · SCROLL CHOREOGRAPHY — captions, gauge, header
   ============================================================ */
const chapter = $('#wheel');
const segs = $$('.seg');
const ticks = $$('#gauge-ticks span');
const cue = $('#cue');
const head = $('#site-head');
const firing = $('#firing');

const CWIN = {
  hero: [-0.01, 0.105], s1: [0.115, 0.285], s2: [0.285, 0.455], s3: [0.455, 0.625],
  s4: [0.625, 0.80], s5: [0.80, 0.915], coda: [0.925, 1.02],
};
const STARTS = [0.115, 0.285, 0.455, 0.625, 0.80];

function chapterProgress() {
  const r = chapter.getBoundingClientRect();
  const total = r.height - innerHeight;
  return total > 0 ? clamp(-r.top / total, 0, 1) : 1;
}

let segShown = '';
function onScroll() {
  const p = chapterProgress();
  targetP = reduced ? 1 : p;

  if (!reduced && !body.classList.contains('no3d')) {
    let active = '';
    for (const [k, [lo, hi]] of Object.entries(CWIN)) {
      if (p >= lo && p < hi) { active = k; break; }
    }
    if (active !== segShown) {
      segShown = active;
      for (const s of segs) s.classList.toggle('is-on', s.dataset.seg === active);
    }
    let n = 0;
    for (const s of STARTS) if (p >= s) n++;
    ticks.forEach((t, i) => t.classList.toggle('is-active', i < n));
    cue.classList.toggle('is-hidden', p > 0.02);
  }

  head.classList.toggle('is-scrolled', scrollY > 40);
  const fr = firing.getBoundingClientRect();
  head.classList.toggle('is-dark', fr.top < 70 && fr.bottom > 70);
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

if (reduced || body.classList.contains('no3d')) {
  for (const s of segs) s.classList.add('is-on');
}

/* ============================================================
   3 · REVEALS
   ============================================================ */
if (!reduced) {
  const ro = new IntersectionObserver(es => {
    for (const e of es) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => ro.observe(el));
} else {
  $$('.reveal').forEach(el => el.classList.add('is-in'));
}

/* ============================================================
   4 · THE FIRING CHART — 72 h, one series, ember-by-temperature
   ============================================================ */
const TEMP = [
  [0, 65], [4, 140], [8, 190], [10, 215], [12, 340], [14, 560], [16, 720], [18, 900],
  [20, 1080], [22, 1300], [24, 1650], [26, 1670], [28, 1690], [30, 1740], [33, 1850],
  [36, 1960], [39, 2060], [42, 2160], [45, 2240], [48, 2300], [51, 2320], [54, 2330],
  [57, 2345], [60, 2350], [62, 2340], [64, 2355], [66, 2370], [68, 2380], [69, 2330],
  [70, 2200], [71, 2090], [72, 1990],
];
const PHASES = [
  [0, 10, 'candling'], [10, 24, 'climb'], [24, 30, 'body reduction'],
  [30, 48, 'ash & climb'], [48, 66, 'soak'], [66, 72, 'seal & cool'],
];
const CONES = [[29, '08'], [36, '04'], [45, '6'], [57, '10'], [67, '12']];

const CW = 960, CH = 440, M = { l: 56, r: 30, t: 46, b: 44 };
const X = h => M.l + (h / 72) * (CW - M.l - M.r);
const Y = f => M.t + (1 - f / 2500) * (CH - M.t - M.b);

function tempAt(h) {
  for (let i = 1; i < TEMP.length; i++) {
    if (h <= TEMP[i][0]) {
      const [h0, t0] = TEMP[i - 1], [h1, t1] = TEMP[i];
      return t0 + (t1 - t0) * ((h - h0) / (h1 - h0));
    }
  }
  return TEMP[TEMP.length - 1][1];
}
function phaseAt(h) {
  for (const [a, b, n] of PHASES) if (h >= a && h <= b) return n;
  return '';
}

function catmullPath(pts) {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1],
      p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}` +
      ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}` +
      ` ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function buildChart() {
  const stage = $('#chart-stage');
  if (!stage) return;
  const pts = TEMP.map(([h, f]) => [X(h), Y(f)]);
  const line = catmullPath(pts);
  const area = line + ` L${X(72).toFixed(1)},${Y(0).toFixed(1)} L${X(0).toFixed(1)},${Y(0).toFixed(1)} Z`;

  let g = '';
  /* horizontal grid + y labels */
  for (const f of [500, 1000, 1500, 2000]) {
    g += `<line x1="${M.l}" y1="${Y(f)}" x2="${CW - M.r}" y2="${Y(f)}" stroke="rgba(217,210,199,.08)"/>` +
      `<text x="${M.l - 8}" y="${Y(f) + 4}" text-anchor="end">${f.toLocaleString('en-US')}°</text>`;
  }
  /* cone 10 line */
  g += `<line x1="${M.l}" y1="${Y(2345)}" x2="${CW - M.r}" y2="${Y(2345)}" stroke="rgba(224,154,78,.3)" stroke-dasharray="2 7"/>` +
    `<text x="${M.l - 8}" y="${Y(2345) + 4}" text-anchor="end" class="conelabel">Δ10</text>`;
  /* x ticks */
  for (let h = 0; h <= 72; h += 12) {
    g += `<line x1="${X(h)}" y1="${CH - M.b}" x2="${X(h)}" y2="${CH - M.b + 6}" stroke="rgba(217,210,199,.25)"/>` +
      `<text x="${X(h)}" y="${CH - M.b + 22}" text-anchor="middle">h ${h}</text>`;
  }
  /* phase separators + labels above the plot */
  let ph = '';
  for (const [a, b, name] of PHASES) {
    if (a > 0) ph += `<line x1="${X(a)}" y1="${M.t - 26}" x2="${X(a)}" y2="${CH - M.b}" stroke="rgba(217,210,199,.06)"/>`;
    ph += `<text class="phlabel" x="${X((a + b) / 2)}" y="${M.t - 12}" text-anchor="middle">${name.toUpperCase()}</text>`;
  }

  /* cones */
  let cones = '';
  for (const [h, c] of CONES) {
    const cx = X(h), cy = Y(tempAt(h)) - 9;
    cones += `<g class="cone-marker" data-h="${h}">` +
      `<path d="M${cx},${cy - 13} L${cx + 5},${cy} L${cx - 5},${cy} Z" fill="#E09A4E"/></g>` +
      `<text class="conelabel" x="${cx + 8}" y="${cy - 6}">${c}</text>`;
  }

  const endT = TEMP[TEMP.length - 1];
  const endLabel = `<circle cx="${X(72)}" cy="${Y(endT[1])}" r="3.4" fill="#F4D08A"/>` +
    `<text x="${X(72) - 4}" y="${Y(endT[1]) + 20}" text-anchor="end">sealed · cooling</text>`;

  stage.innerHTML =
    `<svg viewBox="0 0 ${CW} ${CH}" role="img" aria-label="Planned kiln temperature over the 72-hour firing: a slow overnight candle below 250 degrees, a day-long climb with body reduction near 1,700, ash building past 2,000, an eighteen-hour soak at cone 10 around 2,350 degrees Fahrenheit, then the kiln is sealed at hour 68.">
      <defs>
        <linearGradient id="emberline" gradientUnits="userSpaceOnUse" x1="0" y1="${Y(0)}" x2="0" y2="${Y(2500)}">
          <stop offset="0" stop-color="#8C2F1B"/><stop offset=".55" stop-color="#E09A4E"/><stop offset="1" stop-color="#F4D08A"/>
        </linearGradient>
        <linearGradient id="emberfill" gradientUnits="userSpaceOnUse" x1="0" y1="${Y(2500)}" x2="0" y2="${Y(0)}">
          <stop offset="0" stop-color="#E09A4E" stop-opacity=".14"/><stop offset="1" stop-color="#8C2F1B" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${ph}${g}
      <path d="${area}" fill="url(#emberfill)"/>
      <path id="fire-path" d="${line}" fill="none" stroke="url(#emberline)" stroke-width="2.5" stroke-linecap="round"/>
      ${cones}${endLabel}
      <line id="xhair" x1="0" y1="${M.t}" x2="0" y2="${CH - M.b}" stroke="rgba(237,231,218,.25)" opacity="0"/>
      <circle id="xdot" r="4" fill="#F4D08A" opacity="0"/>
      <rect id="hitzone" x="${M.l}" y="${M.t - 26}" width="${CW - M.l - M.r}" height="${CH - M.t - M.b + 26}" fill="transparent"/>
    </svg>
    <div class="charttip mono" id="charttip"></div>`;

  const svg = $('svg', stage);
  const path = $('#fire-path', stage);
  const len = path.getTotalLength();
  const chartFig = $('#kilnchart');

  if (!reduced) {
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    const io = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      requestAnimationFrame(() => {
        chartFig.classList.add('is-drawn');
        path.style.strokeDashoffset = 0;
        $$('.cone-marker', stage).forEach(m => {
          const h = +m.dataset.h;
          setTimeout(() => m.classList.add('is-down'), 400 + (h / 72) * 2200);
        });
      });
    }, { threshold: 0.35 });
    io.observe(chartFig);
  } else {
    chartFig.classList.add('is-drawn');
    $$('.cone-marker', stage).forEach(m => m.classList.add('is-down'));
  }

  /* crosshair + tooltip */
  const tip = $('#charttip', stage);
  const xhair = $('#xhair', stage);
  const xdot = $('#xdot', stage);
  const hit = $('#hitzone', stage);
  hit.addEventListener('pointermove', ev => {
    const rct = svg.getBoundingClientRect();
    const h = clamp(((ev.clientX - rct.left) / rct.width * CW - M.l) / (CW - M.l - M.r) * 72, 0, 72);
    const f = tempAt(h);
    const px = X(h), py = Y(f);
    xhair.setAttribute('x1', px); xhair.setAttribute('x2', px);
    xhair.setAttribute('opacity', 1);
    xdot.setAttribute('cx', px); xdot.setAttribute('cy', py);
    xdot.setAttribute('opacity', 1);
    tip.textContent = `h ${Math.round(h)} · ${Math.round(f).toLocaleString('en-US')} °F — ${phaseAt(h)}`;
    /* px against the rendered svg, not % of the (possibly narrower) scroll box */
    tip.style.left = (px / CW * rct.width) + 'px';
    tip.style.top = (py / CH * rct.height) + 'px';
    tip.classList.add('is-on');
  });
  hit.addEventListener('pointerleave', () => {
    tip.classList.remove('is-on');
    xhair.setAttribute('opacity', 0);
    xdot.setAttribute('opacity', 0);
  });

  /* mobile: fade hints that the chart pans; hide once panned to the end */
  const updateFade = () => {
    stage.classList.toggle('at-end', stage.scrollLeft + stage.clientWidth >= stage.scrollWidth - 8);
  };
  stage.addEventListener('scroll', updateFade, { passive: true });
  updateFade();
}
buildChart();
