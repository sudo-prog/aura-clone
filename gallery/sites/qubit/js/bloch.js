/* QUBIT — interactive Bloch sphere (three.js).
   Drag steers the state vector (not the camera). Idle state precesses about z
   (Larmor). Gates are true rotations; measure collapses to a pole sampled
   from |α|². Bloch (x,y,z) → three (x, z, −y) to keep handedness. */
import * as THREE from 'three';

const wrap = document.getElementById('blochWrap');
const canvas = document.getElementById('bloch');
if (wrap && canvas) init();

function init() {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COL = {
    graphite: new THREE.Color(0x1E2126),
    slate: new THREE.Color(0x575C66),
    cyan: new THREE.Color(0x00A8BE),
    violet: new THREE.Color(0x6633EE),
  };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    fallback();
    return;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  camera.position.set(2.55, 1.35, 3.05);
  camera.lookAt(0, 0, 0);

  /* ---------- sphere wireframe ---------- */
  const lineMat = new THREE.LineBasicMaterial({ color: COL.graphite, transparent: true, opacity: 0.13 });
  const circle = (fn, segs = 96) => {
    const pts = [];
    for (let i = 0; i <= segs; i++) pts.push(fn((i / segs) * Math.PI * 2));
    return new THREE.BufferGeometry().setFromPoints(pts);
  };
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI;
    const dx = Math.cos(a), dz = Math.sin(a);
    scene.add(new THREE.Line(circle(t => new THREE.Vector3(Math.sin(t) * dx, Math.cos(t), Math.sin(t) * dz)), lineMat));
  }
  for (const lat of [-60, -30, 30, 60]) {
    const y = Math.sin(lat * Math.PI / 180), r = Math.cos(lat * Math.PI / 180);
    scene.add(new THREE.Line(circle(t => new THREE.Vector3(r * Math.cos(t), y, r * Math.sin(t))), lineMat));
  }

  /* equator — the superposition ring, colored by the interference pair */
  {
    const segs = 128, pos = [], col = [];
    const c = new THREE.Color();
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI * 2;
      pos.push(Math.cos(t), 0, Math.sin(t));
      const m = 0.5 + 0.5 * Math.sin(2 * t);
      c.copy(COL.cyan).lerp(COL.violet, m);
      col.push(c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 })));
  }

  /* z axis */
  {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.22, 0), new THREE.Vector3(0, 1.22, 0)]);
    const m = new THREE.LineDashedMaterial({ color: COL.slate, transparent: true, opacity: 0.5, dashSize: 0.045, gapSize: 0.035 });
    const l = new THREE.Line(g, m);
    l.computeLineDistances();
    scene.add(l);
  }

  /* ---------- state vector ---------- */
  const vecGroup = new THREE.Group();
  const shaftMat = new THREE.MeshBasicMaterial({ color: COL.cyan });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.86, 12), shaftMat);
  shaft.position.y = 0.43;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 20), shaftMat);
  cone.position.y = 0.935;
  vecGroup.add(shaft, cone);
  scene.add(vecGroup);

  /* tip glow */
  const tipTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const tip = new THREE.Sprite(new THREE.SpriteMaterial({ map: tipTex, color: COL.cyan, transparent: true, opacity: 0.9, depthWrite: false }));
  tip.scale.setScalar(0.34);
  scene.add(tip);

  /* projection furniture: dashed drop lines to the equatorial plane */
  const dropMat = new THREE.LineDashedMaterial({ color: COL.slate, transparent: true, opacity: 0.55, dashSize: 0.035, gapSize: 0.03 });
  const dropGeoV = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const dropGeoH = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const dropV = new THREE.Line(dropGeoV, dropMat);
  const dropH = new THREE.Line(dropGeoH, dropMat);
  scene.add(dropV, dropH);

  /* trail during gate animations */
  const trailMat = new THREE.LineBasicMaterial({ color: COL.violet, transparent: true, opacity: 0 });
  let trailPts = [];
  const trail = new THREE.Line(new THREE.BufferGeometry(), trailMat);
  scene.add(trail);

  /* ---------- quantum state ---------- */
  let theta = Math.PI / 4, phi = 0;
  const blochToThree = (th, ph) =>
    new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), -Math.sin(th) * Math.sin(ph));
  const threeToAngles = v => {
    const th = Math.acos(THREE.MathUtils.clamp(v.y, -1, 1));
    const ph = Math.atan2(-v.z, v.x);
    return [th, ph < 0 ? ph + Math.PI * 2 : ph];
  };

  const UP = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  function applyVector(v) {
    q.setFromUnitVectors(UP, v);
    vecGroup.quaternion.copy(q);
    tip.position.copy(v).multiplyScalar(1.0);
    const m = (1 - v.y) / 2;
    shaftMat.color.copy(COL.cyan).lerp(COL.violet, m);
    tip.material.color.copy(shaftMat.color);
    dropGeoV.setFromPoints([new THREE.Vector3(v.x, v.y, v.z), new THREE.Vector3(v.x, 0, v.z)]);
    dropGeoH.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(v.x, 0, v.z)]);
    dropV.computeLineDistances();
    dropH.computeLineDistances();
  }

  /* ---------- readout ---------- */
  const el = id => document.getElementById(id);
  const ampAlpha = el('ampAlpha'), ampBeta = el('ampBeta'), ketPlus = el('ketPlus');
  const thetaOut = el('thetaOut'), phiOut = el('phiOut');
  const p0Out = el('p0Out'), p1Out = el('p1Out');
  const bar0 = el('bar0'), bar1 = el('bar1');
  const recordEl = el('record');
  const f3 = x => (Math.abs(x) < 5e-4 ? 0 : x).toFixed(3);
  function readout() {
    const a = Math.cos(theta / 2);
    const bRe = Math.sin(theta / 2) * Math.cos(phi);
    const bIm = Math.sin(theta / 2) * Math.sin(phi);
    ampAlpha.textContent = f3(a);
    if (Math.abs(bIm) < 5e-4) {
      const neg = bRe < -5e-4;
      ketPlus.textContent = neg ? '−' : '+';
      ampBeta.textContent = f3(Math.abs(bRe));
    } else {
      ketPlus.textContent = '+';
      ampBeta.textContent = `(${f3(bRe)} ${bIm < 0 ? '−' : '+'} ${f3(Math.abs(bIm))}i)`;
    }
    thetaOut.textContent = f3(theta);
    phiOut.textContent = f3(phi);
    const p0 = a * a, p1 = 1 - p0;
    p0Out.textContent = (p0 * 100).toFixed(1) + '%';
    p1Out.textContent = (p1 * 100).toFixed(1) + '%';
    bar0.style.width = (p0 * 100).toFixed(1) + '%';
    bar1.style.width = (p1 * 100).toFixed(1) + '%';
  }

  /* ---------- labels projected each frame ---------- */
  const labels = [...wrap.querySelectorAll('.blabel')].map(elm => ({
    elm,
    p: {
      'z+': new THREE.Vector3(0, 1.32, 0),
      'z-': new THREE.Vector3(0, -1.34, 0),
      'x+': new THREE.Vector3(1.34, 0, 0),
      'y+': new THREE.Vector3(0, 0, -1.34),
    }[elm.dataset.pole],
  }));
  const pv = new THREE.Vector3();
  const ray = new THREE.Vector3();
  /* a label is occluded when the camera→label ray passes through the unit sphere first */
  function occluded(p) {
    ray.copy(p).sub(camera.position);
    const len = ray.length();
    ray.divideScalar(len);
    const tMid = -camera.position.dot(ray);          // closest approach to origin
    if (tMid < 0 || tMid > len) return false;
    const d2 = camera.position.lengthSq() - tMid * tMid;
    return d2 < 1;
  }
  function placeLabels(w, h) {
    for (const L of labels) {
      pv.copy(L.p).project(camera);
      const x = Math.min(w - 18, Math.max(18, (pv.x * 0.5 + 0.5) * w));
      const y = Math.min(h - 12, Math.max(12, (-pv.y * 0.5 + 0.5) * h));
      L.elm.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%,-50%)`;
      L.elm.style.opacity = occluded(L.p) ? 0.38 : 1;
    }
  }

  /* ---------- animation system ---------- */
  const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
  let anim = null;               // {v0, axis, angle, t0, dur, ease, trail}
  let lastInteract = performance.now();
  let needRender = true;

  function startGate(axis, angle) {
    if (anim) return;
    lastInteract = performance.now();
    const v0 = blochToThree(theta, phi);
    if (REDUCED) {
      const v = v0.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis, angle));
      [theta, phi] = threeToAngles(v);
      applyVector(blochToThree(theta, phi));
      readout(); needRender = true;
      return;
    }
    trailPts = [];
    anim = { v0, axis, angle, t0: performance.now(), dur: 640, ease: easeInOutCubic };
  }

  function measureState() {
    if (anim) return;
    lastInteract = performance.now();
    const p0 = Math.cos(theta / 2) ** 2;
    const outcome = Math.random() < p0 ? 0 : 1;
    const targetTheta = outcome === 0 ? 0.0001 : Math.PI - 0.0001;
    pushRecord(outcome);
    /* the winning probability row registers the click */
    const row = (outcome === 0 ? bar0 : bar1).closest('.prob');
    if (row) {
      row.classList.remove('hit');
      void row.offsetWidth;
      row.classList.add('hit');
    }
    if (REDUCED) {
      theta = targetTheta;
      applyVector(blochToThree(theta, phi));
      readout(); needRender = true;
      return;
    }
    anim = { collapse: true, th0: theta, th1: targetTheta, t0: performance.now(), dur: 260, ease: easeOutQuart };
    const pole = wrap.querySelector(`.blabel[data-pole="${outcome === 0 ? 'z+' : 'z-'}"]`);
    if (pole) {
      pole.animate(
        [{ transform: pole.style.transform + ' scale(1)' },
         { transform: pole.style.transform + ' scale(1.6)' },
         { transform: pole.style.transform + ' scale(1)' }],
        { duration: 500, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
  }

  const outcomes = [];
  function pushRecord(o) {
    outcomes.push(o);
    if (outcomes.length > 10) outcomes.shift();
    recordEl.innerHTML = 'record&thinsp;— ' + outcomes
      .map(x => `<span class="ket out${x}">${x}</span>`)
      .join('&ensp;');
  }

  /* ---------- interaction ---------- */
  const hint = document.getElementById('blochHint');
  if (hint && matchMedia('(hover: none)').matches) {
    hint.textContent = 'drag the state · tap a gate';
  }
  let dragging = false, px = 0, py = 0;
  wrap.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    dragging = true; px = e.clientX; py = e.clientY;
    wrap.classList.add('dragging');
    wrap.setPointerCapture(e.pointerId);
    lastInteract = performance.now();
    if (hint) hint.classList.add('hidden');
  });
  wrap.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - px, dy = e.clientY - py;
    px = e.clientX; py = e.clientY;
    phi = (phi - dx * 0.0085 + Math.PI * 2) % (Math.PI * 2);
    theta = THREE.MathUtils.clamp(theta + dy * 0.007, 0.015, Math.PI - 0.015);
    lastInteract = performance.now();
    syncState();
  });
  const endDrag = () => { dragging = false; wrap.classList.remove('dragging'); };
  wrap.addEventListener('pointerup', endDrag);
  wrap.addEventListener('pointercancel', endDrag);

  /* pressing a physics key lights its button — keyboard and UI are one system */
  const KEY_BTN = { x: 'gateX', h: 'gateH', z: 'gateZ', s: 'gateS', m: 'gateM' };
  function flashBtn(id) {
    const b = el(id);
    b.classList.add('kbd-hit');
    setTimeout(() => b.classList.remove('kbd-hit'), 260);
  }
  wrap.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (KEY_BTN[k]) {
      flashBtn(KEY_BTN[k]);
      if (k === 'x') startGate(AX.x, Math.PI);
      else if (k === 'h') startGate(AX.h, Math.PI);
      else if (k === 'z') startGate(AX.z, Math.PI);
      else if (k === 's') startGate(AX.z, Math.PI / 2);
      else measureState();
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'ArrowLeft') phi = (phi + 0.12) % (Math.PI * 2);
    if (e.key === 'ArrowRight') phi = (phi - 0.12 + Math.PI * 2) % (Math.PI * 2);
    if (e.key === 'ArrowUp') theta = THREE.MathUtils.clamp(theta - 0.08, 0.015, Math.PI - 0.015);
    if (e.key === 'ArrowDown') theta = THREE.MathUtils.clamp(theta + 0.08, 0.015, Math.PI - 0.015);
    lastInteract = performance.now();
    syncState();
  });

  const AX = {
    x: new THREE.Vector3(1, 0, 0),          // bloch x
    z: new THREE.Vector3(0, 1, 0),          // bloch z
    h: new THREE.Vector3(1, 1, 0).normalize(), // bloch (x+z)/√2
  };
  el('gateX').addEventListener('click', () => startGate(AX.x, Math.PI));
  el('gateH').addEventListener('click', () => startGate(AX.h, Math.PI));
  el('gateZ').addEventListener('click', () => startGate(AX.z, Math.PI));
  el('gateS').addEventListener('click', () => startGate(AX.z, Math.PI / 2));
  el('gateM').addEventListener('click', measureState);

  function syncState() {
    applyVector(blochToThree(theta, phi));
    readout();
    needRender = true;
  }

  /* ---------- sizing ---------- */
  let w = 0, h = 0;
  function resize() {
    const r = wrap.getBoundingClientRect();
    if (!r.width) return;
    w = r.width; h = r.height;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    needRender = true;
  }
  new ResizeObserver(resize).observe(wrap);
  resize();

  /* ---------- loop ---------- */
  let running = false, inView = true, rafId = 0, lastT = performance.now();
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    if (anim) {
      const t = Math.min(1, (now - anim.t0) / anim.dur);
      const e = anim.ease(t);
      if (anim.collapse) {
        theta = anim.th0 + (anim.th1 - anim.th0) * e;
      } else {
        const v = anim.v0.clone().applyQuaternion(
          new THREE.Quaternion().setFromAxisAngle(anim.axis, e * anim.angle));
        [theta, phi] = threeToAngles(v);
        trailPts.push(v.clone());
        if (trailPts.length > 90) trailPts.shift();
        trail.geometry.setFromPoints(trailPts);
        trailMat.opacity = 0.4;
      }
      applyVector(blochToThree(theta, phi));
      readout();
      if (t >= 1) anim = null;
    } else {
      if (trailMat.opacity > 0.005) {
        trailMat.opacity = Math.max(0, trailMat.opacity - dt * 0.6);
      }
      /* Larmor precession about z when idle */
      if (!dragging && now - lastInteract > 2600 && Math.sin(theta) > 0.02) {
        phi = (phi + dt * 0.28) % (Math.PI * 2);
        applyVector(blochToThree(theta, phi));
        readout();
      }
    }

    renderer.render(scene, camera);
    placeLabels(w, h);
    rafId = requestAnimationFrame(frame);
  }
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) { lastT = performance.now(); rafId = requestAnimationFrame(frame); }
    else cancelAnimationFrame(rafId);
  }
  const vis = () => setRunning(inView && !document.hidden && !REDUCED);
  document.addEventListener('visibilitychange', vis);
  new IntersectionObserver(es => { inView = es[0].isIntersecting; vis(); }, { threshold: 0.05 }).observe(wrap);

  /* reduced motion: render single frames on demand */
  if (REDUCED) {
    const still = () => {
      if (!needRender || document.hidden) return;
      needRender = false;
      renderer.render(scene, camera);
      placeLabels(w, h);
    };
    setInterval(still, 120);
  }

  syncState();
  renderer.render(scene, camera);
  placeLabels(w, h);
  vis();

  /* ---------- designed fallback if WebGL is unavailable ---------- */
  function fallback() {
    canvas.remove();
    const div = document.createElement('div');
    div.innerHTML = `
      <svg class="bloch-fallback" viewBox="0 0 400 400" role="img" aria-label="Static Bloch sphere diagram">
        <circle cx="200" cy="200" r="150" fill="none" stroke="#1E2126" stroke-opacity=".25"/>
        <ellipse cx="200" cy="200" rx="150" ry="42" fill="none" stroke="#00A8BE" stroke-opacity=".7"/>
        <line x1="200" y1="30" x2="200" y2="370" stroke="#575C66" stroke-dasharray="5 4" stroke-opacity=".5"/>
        <line x1="200" y1="200" x2="298" y2="102" stroke="#6633EE" stroke-width="2.5"/>
        <circle cx="298" cy="102" r="6" fill="#6633EE"/>
        <text x="208" y="26" font-family="IBM Plex Mono, monospace" font-size="15" fill="#1E2126">|0&#x27E9;</text>
        <text x="208" y="392" font-family="IBM Plex Mono, monospace" font-size="15" fill="#1E2126">|1&#x27E9;</text>
      </svg>`;
    wrap.prepend(div.firstElementChild);
    const hintEl = document.getElementById('blochHint');
    if (hintEl) hintEl.textContent = 'static rendering — WebGL unavailable';
  }
}
