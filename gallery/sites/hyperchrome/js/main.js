/* HYPERCHROME — mercury organism + page choreography */
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarsePointer = matchMedia('(pointer: coarse)').matches;

/* ============================================================
   1. THE MERCURY ORGANISM
   MarchingCubes metaballs in a procedurally painted chrome studio.
   ============================================================ */

function paintStudio() {
  // Equirect chrome studio. Mercury needs CONTRAST: mid-dark walls so the
  // body reads metallic, blinding irregular softboxes for the speculars,
  // a white-hot horizon flash, a near-black floor, saturated color pools.
  const w = 1024, h = 512;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');

  // base: mid-grey walls → white-hot horizon → near-black floor → faint bounce
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#B9C2D4');
  g.addColorStop(.16, '#7D89A2');
  g.addColorStop(.42, '#5A6580');
  g.addColorStop(.49, '#FFFFFF');
  g.addColorStop(.545, '#FFFFFF');
  g.addColorStop(.575, '#0A0E22');
  g.addColorStop(.85, '#04060F');
  g.addColorStop(1, '#28324C');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);

  // overhead ring light — pole band becomes a hot rim on the blob's crown
  x.shadowColor = '#ffffff';
  x.shadowBlur = 26;
  x.fillStyle = 'rgba(255,255,255,.92)';
  x.fillRect(0, 0, w, h * .045);

  // irregular vertical softboxes — elongated white speculars chrome lives on.
  // Varied widths/heights/offsets so it reads studio, not beach umbrella.
  const boxes = [
    [.030, .09, .050, .38], [.205, .05, .034, .30], [.335, .11, .072, .40],
    [.520, .07, .026, .24], [.660, .04, .058, .43], [.845, .10, .040, .33],
  ];
  x.fillStyle = '#ffffff';
  for (const [bx, by, bw, bh] of boxes) {
    x.shadowBlur = 18;
    x.fillRect(bx * w, by * h, bw * w, bh * h);
  }
  // hot key light
  x.shadowBlur = 60;
  x.fillRect(w * .42, h * .03, w * .16, h * .12);
  // floor bounce cards
  x.shadowBlur = 14;
  x.globalAlpha = .5;
  for (let i = 0; i < 3; i++) {
    x.fillRect((i / 3) * w + w * .14, h * .87, w * .09, h * .022);
  }
  x.globalAlpha = 1;
  x.shadowBlur = 0;

  // iridescence — saturated color edges hugging each softbox
  x.globalCompositeOperation = 'screen';
  const tints = ['#3EE8FF', '#FF2DB2', '#C8FF4A', '#FF2DB2', '#3EE8FF', '#B36BFF'];
  boxes.forEach(([bx, by, bw, bh], i) => {
    x.globalAlpha = .62;
    x.fillStyle = tints[i % tints.length];
    x.fillRect((bx + bw + .006) * w, (by + .02) * h, w * .016, bh * .9 * h);
    x.globalAlpha = .3;
    x.fillRect((bx - .014) * w, (by + .04) * h, w * .010, bh * .7 * h);
  });
  // saturated pools reflected in the floor
  const pools = [
    [.28, .78, .17, '255,45,178', .42],
    [.72, .80, .19, '62,232,255', .38],
    [.50, .90, .13, '200,255,74', .25],
  ];
  for (const [px, py, pr, rgb, a] of pools) {
    const fl = x.createRadialGradient(px * w, py * h, 8, px * w, py * h, pr * w);
    fl.addColorStop(0, `rgba(${rgb},${a})`); fl.addColorStop(1, `rgba(${rgb},0)`);
    x.globalAlpha = 1; x.fillStyle = fl; x.fillRect(0, h * .56, w, h * .44);
  }
  x.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function initBlob() {
  const stage = document.getElementById('blob-stage');
  const fallback = stage.querySelector('.orb-fallback');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    fallback.hidden = false;
    return;
  }

  const DPR = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 40);
  camera.position.set(0, 0, 3.4);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = paintStudio();
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose();
  pmrem.dispose();

  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: .03,
    envMapIntensity: 1.4,
    clearcoat: 1,
    clearcoatRoughness: .06,
    iridescence: .28,
    iridescenceIOR: 1.6,
  });

  const small = innerWidth < 700 || coarsePointer;
  const RES = small ? 44 : 64;
  const effect = new MarchingCubes(RES, material, false, false, small ? 40000 : 90000);
  effect.isolation = 74;
  // small stages: shrink + raise the organism so the tagline sits on fog, not on metal
  const blobScale = small ? .88 : 1.05;
  const blobY = small ? .52 : .3;
  effect.scale.set(blobScale, blobScale, blobScale);
  effect.position.set(0, blobY, 0);
  scene.add(effect);

  // pointer magnet — field coords live in 0..1
  const magnet = { x: .5, y: .5, tx: .5, ty: .5, pulse: 0 };
  let hasPointer = false;

  function planeHalfHeight() { return Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z; }

  if (!reducedMotion) {
    stage.parentElement.addEventListener('pointermove', (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      const ndcX = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ndcY = -(((e.clientY - r.top) / r.height) * 2 - 1);
      const hh = planeHalfHeight();
      const wx = ndcX * hh * camera.aspect;
      const wy = ndcY * hh;
      // world → field coords (mesh spans ±scale around effect.position)
      magnet.tx = THREE.MathUtils.clamp((wx - effect.position.x) / (2 * effect.scale.x) + .5, .1, .9);
      magnet.ty = THREE.MathUtils.clamp((wy - effect.position.y) / (2 * effect.scale.y) + .5, .12, .88);
      hasPointer = true;
    });
    stage.parentElement.addEventListener('pointerleave', () => { hasPointer = false; });
    stage.parentElement.addEventListener('pointerdown', () => { magnet.pulse = 1; });
  }

  const N_BALLS = small ? 4 : 5;
  const strength = 1.2 / ((Math.sqrt(N_BALLS + 1) - 1) / 4 + 1);
  const subtract = 12;

  const AMP = small ? .78 : 1; // tighter travel on small stages so the mass stays framed
  const clamp01 = (v) => THREE.MathUtils.clamp(v, .08, .92);

  function field(t) {
    effect.reset();
    // scroll parallax — the organism drifts up as the studio scrolls away
    effect.position.y = blobY + scrollY * .00045;
    // entrance: scattered droplets condense into the mass over the first ~2s,
    // timed with the load choreography (wordmark lands as the mercury merges)
    const k = Math.min(t / 2, 1);
    const intro = 1 - Math.pow(1 - k, 3);
    const spread = 1 + (1 - intro) * 1.7;
    const gather = .3 + .7 * intro;
    // idle breathing
    const breathe = 1 + .05 * Math.sin(t * .8);
    for (let i = 0; i < N_BALLS; i++) {
      const bx = .5 + .24 * AMP * spread * Math.sin(.62 * t + i * 1.9) * Math.cos(.38 * t + i * 1.2);
      const by = .5 + .22 * AMP * spread * Math.cos(.5 * t + i * 1.35) * Math.sin(.31 * t + i * .7);
      const bz = .5 + .13 * Math.sin(.72 * t + i * 2.2);
      effect.addBall(clamp01(bx), clamp01(by), bz, strength * breathe * gather, subtract);
    }
    // the magnet ball — heavier, chases the cursor with spring lag
    const lag = hasPointer ? .085 : .02;
    const idleX = .5 + .1 * AMP * Math.sin(t * .4);
    const idleY = .5 + .09 * AMP * Math.cos(t * .53);
    magnet.x += ((hasPointer ? magnet.tx : idleX) - magnet.x) * lag;
    magnet.y += ((hasPointer ? magnet.ty : idleY) - magnet.y) * lag;
    magnet.pulse *= .94;
    effect.addBall(magnet.x, magnet.y, .5, strength * (1.55 + magnet.pulse * 1.3) * gather, subtract);
    effect.update();
    // the studio slowly revolves around the organism — reflections travel,
    // which is what makes chrome read as liquid instead of paint
    scene.environmentRotation.y = t * .06 + Math.sin(t * .21) * .18;
  }

  let t = 0;

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // reduced motion has no rAF loop — repaint the still or the canvas stays blank
    if (reducedMotion) { field(t); renderer.render(scene, camera); }
  }
  resize();
  addEventListener('resize', resize);

  // run only when visible — tab AND viewport
  let inView = true, tabVisible = !document.hidden, rafId = 0;
  const clock = new THREE.Clock();

  function frame() {
    rafId = 0;
    if (!inView || !tabVisible) return;
    t += Math.min(clock.getDelta(), .05);
    field(t);
    renderer.render(scene, camera);
    if (!reducedMotion) rafId = requestAnimationFrame(frame);
  }
  function wake() { if (!rafId && inView && tabVisible && !reducedMotion) { clock.getDelta(); rafId = requestAnimationFrame(frame); } }

  new IntersectionObserver(([en]) => { inView = en.isIntersecting; wake(); }).observe(renderer.domElement);
  document.addEventListener('visibilitychange', () => { tabVisible = !document.hidden; wake(); });

  if (reducedMotion) {
    // a composed still: mass gathered, mid-merge
    t = 4.2;
    field(t);
    renderer.render(scene, camera);
  } else {
    frame();
  }
}

try { initBlob(); } catch (e) {
  const fb = document.querySelector('.orb-fallback');
  if (fb) fb.hidden = false;
}

/* ============================================================
   2. LOAD CHOREOGRAPHY
   ============================================================ */
const ready = () => document.body.classList.add('ready');
if (reducedMotion) {
  ready();
} else {
  Promise.race([
    document.fonts.ready,
    new Promise(r => setTimeout(r, 1400)),
  ]).then(() => requestAnimationFrame(ready));
}

/* ============================================================
   3. SCROLL REVEALS — staggered per container
   ============================================================ */
const revealables = [...document.querySelectorAll('[data-reveal]')];
const byParent = new Map();
for (const el of revealables) {
  const sibs = byParent.get(el.parentElement) || [];
  sibs.push(el);
  byParent.set(el.parentElement, sibs);
  el.style.setProperty('--d', `${Math.min(sibs.length - 1, 5) * .09}s`);
}
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }
}, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
revealables.forEach(el => io.observe(el));

/* ============================================================
   4. SPARKLE CURSOR TRAIL
   ============================================================ */
if (!reducedMotion && !coarsePointer) {
  const TINTS = ['#3EE8FF', '#FF2DB2', '#C8FF4A', '#FFFFFF'];
  let lastX = -99, lastY = -99, lastT = 0, live = 0;
  document.addEventListener('pointermove', (e) => {
    const now = performance.now();
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (now - lastT < 36 || dx * dx + dy * dy < 500 || live > 22) return;
    lastT = now; lastX = e.clientX; lastY = e.clientY;
    const s = document.createElement('span');
    const size = 6 + Math.random() * 8;
    s.className = 'sparkle';
    s.style.cssText = `left:${e.clientX - size / 2 + (Math.random() * 16 - 8)}px;top:${e.clientY - size / 2 + (Math.random() * 16 - 8)}px;width:${size}px;height:${size}px;background:${TINTS[Math.random() * TINTS.length | 0]};`;
    live++;
    s.addEventListener('animationend', () => { s.remove(); live--; });
    document.body.appendChild(s);
  }, { passive: true });
}

/* ============================================================
   5. DROP LIST FORM
   ============================================================ */
const form = document.getElementById('droplist-form');
const confirmEl = document.getElementById('droplist-confirm');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      confirmEl.style.color = '#FF7ACD';
      confirmEl.textContent = 'That email doesn’t look finished. Check it and try again.';
      return;
    }
    confirmEl.style.color = '';
    confirmEl.textContent = 'You’re on the list. HC-006 lands 09.03.49.';
    form.email.value = '';
  });
}
