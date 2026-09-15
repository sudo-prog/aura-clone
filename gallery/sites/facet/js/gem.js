// FACET — the stone. Custom refraction / dispersion / fresnel shader system.
import * as THREE from 'three';
import { getCut } from './cuts.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ *
 * The bench: a procedurally painted equirect environment —
 * one warm lamp, one softbox, two cool platinum strips, pin lights.
 * The gem's entire light diet comes from this room.
 * ------------------------------------------------------------------ */
let envCanvas = null;
function benchEnvironment() {
  if (envCanvas) return envCanvas;
  const w = 2048, h = 1024;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');

  // a nearly black room — all drama comes from a few hard-edged sources
  const sky = x.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#05070e');
  sky.addColorStop(0.5, '#0a0e19');
  sky.addColorStop(1, '#020308');
  x.fillStyle = sky; x.fillRect(0, 0, w, h);

  // faint platinum ceiling wash — upward crown facets keep a sheen of form
  // instead of falling to matte black between sources
  const ceil = x.createLinearGradient(0, 0, 0, h * 0.24);
  ceil.addColorStop(0, '#526080');
  ceil.addColorStop(0.55, '#333f5e');
  ceil.addColorStop(1, 'rgba(20,26,44,0)');
  x.fillStyle = ceil; x.fillRect(0, 0, w, h * 0.24);

  const box = (cx, cy, bw, bh, rot, top, bottom) => {
    x.save();
    x.translate(w * cx, h * cy); x.rotate(rot);
    const lg = x.createLinearGradient(0, -bh / 2, 0, bh / 2);
    lg.addColorStop(0, top);
    lg.addColorStop(1, bottom);
    x.fillStyle = lg;
    x.fillRect(-bw / 2, -bh / 2, bw, bh);
    x.restore();
  };

  // warm lamp: a hard bright card with a hot core (the bench lamp)
  box(0.70, 0.24, 165, 115, 0.10, '#fff6e2', '#e8b264');
  x.fillStyle = '#ffffff';
  x.fillRect(w * 0.70 - 30, h * 0.24 - 24, 60, 48);
  let g = x.createRadialGradient(w * 0.70, h * 0.24, 55, w * 0.70, h * 0.24, 170);
  g.addColorStop(0, 'rgba(232,178,100,0.32)');
  g.addColorStop(1, 'rgba(232,178,100,0)');
  x.fillStyle = g; x.fillRect(w * 0.70 - 170, h * 0.24 - 170, 340, 340);

  // segmented ring light — dashes of platinum around the stone.
  // gaps between dashes are what make facets go dark: the mosaic.
  const dash = (cx, cy, dw, dh, col2, col3) => box(cx, cy, dw, dh, 0, col2, col3);
  const ringY = 0.335, n1 = 15;
  for (let i = 0; i < n1; i++) {
    const cx = (i + 0.5) / n1;
    if (Math.abs(cx - 0.70) < 0.05) continue; // leave room for the lamp
    const warm = i % 4 === 1;
    dash(cx, ringY + (i % 3) * 0.012, i % 3 === 0 ? 74 : 46, i % 2 ? 54 : 78,
      warm ? '#ffedd0' : '#eef3ff', warm ? '#b78a4a' : '#5c6f94');
  }
  // a lower, fainter counter-ring
  for (let i = 0; i < 7; i++) {
    const cx = (i + 0.5) / 7 + 0.03;
    dash(cx > 1 ? cx - 1 : cx, 0.56, 36, 30, '#93a6c4', '#2b3750');
  }
  // one broad cool softbox high left
  box(0.20, 0.26, 300, 70, -0.14, '#f0f5ff', '#55688c');
  // low warm counter card (bench-surface bounce), faint
  box(0.66, 0.80, 320, 52, -0.05, '#3a2e17', '#0d0a04');
  // dim platinum fill cards high in the dead azimuth — the crown's darkest
  // quadrant catches a whisper instead of going matte black
  box(0.44, 0.17, 190, 60, 0.06, '#566384', '#10151f');
  box(0.94, 0.19, 150, 55, -0.08, '#4c5a7c', '#0c1120');

  // feather every card edge slightly (diffusion on the source, not CG razors);
  // pins are painted after so they stay pinpoint
  try {
    x.filter = 'blur(4px)';
    x.drawImage(c, 0, 0);
    x.filter = 'none';
  } catch (e) { /* no filter support → hard cards, still fine */ }

  // pin lights
  const pins = [
    [0.10, 0.42, 3.0, '#ffffff'], [0.30, 0.52, 2.4, '#dfe8ff'], [0.41, 0.24, 2.2, '#ffffff'],
    [0.56, 0.50, 3.0, '#fff2d8'], [0.62, 0.62, 2.0, '#cfd9ee'], [0.79, 0.55, 2.6, '#ffffff'],
    [0.86, 0.30, 2.8, '#ffe2b0'], [0.97, 0.58, 2.0, '#e8eeff'], [0.25, 0.40, 2.0, '#ffffff'],
  ];
  for (const [px, py, pr, col] of pins) {
    g = x.createRadialGradient(w * px, h * py, 0, w * px, h * py, pr * 5);
    g.addColorStop(0, col);
    g.addColorStop(0.3, col + 'bb');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(w * px - pr * 5, h * py - pr * 5, pr * 10, pr * 10);
  }

  envCanvas = c;
  return c;
}

/* ------------------------------------------------------------------ *
 * Shaders
 * ------------------------------------------------------------------ */
const GEM_VERT = /* glsl */`
  varying vec3 vWPos;
  varying vec3 vWN;
  varying vec3 vON;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWPos = wp.xyz;
    vWN = normalize(mat3(modelMatrix) * normal);
    vON = normal;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const GEM_FRAG = /* glsl */`
  precision highp float;
  uniform samplerCube uEnv;
  uniform vec3  uCam;
  uniform vec3  uBody;
  uniform float uIor;      // exaggerated for spectacle
  uniform float uDisp;     // ior spread across R..B
  uniform float uFlash;    // recut bloom
  uniform float uBoost;
  uniform float uDbg;
  varying vec3 vWPos;
  varying vec3 vWN;
  varying vec3 vON;

  vec3 envAt(vec3 d) {
    vec3 c = textureCube(uEnv, d).rgb;
    vec3 c2 = c * c;
    return c2 * c2 * 3.6; // c^4: dark room stays dark, sources burn
  }
  vec3 spectral(float t) {
    t = clamp(t, 0.0, 1.0);
    return clamp(vec3(abs(t * 6.0 - 3.0) - 1.0,
                      2.0 - abs(t * 6.0 - 2.0),
                      2.0 - abs(t * 6.0 - 4.0)), 0.0, 1.0);
  }
  float chan(vec3 c, int i) { return i == 0 ? c.r : (i == 1 ? c.g : c.b); }
  float hashN(vec3 n) {
    return fract(sin(dot(floor(n * 41.0 + 0.5), vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  }

  void main() {
    vec3 N = normalize(vWN);
    vec3 V = normalize(vWPos - uCam);
    float ndv = clamp(dot(N, -V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 3.0);
    vec3 radial = normalize(vWPos + vec3(0.0001));
    float fh = hashN(N); // stable per facet
    // girdle band (near-vertical facets in object space): a polished metal
    // belt, not a prism — dispersion decorrelation is suppressed there
    float gird = 1.0 - smoothstep(0.12, 0.30, abs(normalize(vON).y));

    // ---- surface reflection (platinum world) ----
    vec3 refl = envAt(reflect(V, N));

    // ---- dispersion: three refractions at spread IORs, two bounces ----
    vec3 inner = vec3(0.0);
    // virtual internal facet, swings hard between facets → pavilion mosaic
    vec3 Nin = normalize(radial - N * 0.82 + vec3(0.0, -0.45, 0.0));
    vec3 Nin2 = normalize(radial * 0.6 + vec3(sin(fh * 6.28), -0.9, cos(fh * 6.28)));
    for (int i = 0; i < 3; i++) {
      float ior = uIor + uDisp * (float(i) - 1.0);
      vec3 T1 = refract(V, N, 1.0 / ior);
      vec3 T2 = refract(T1, -Nin, ior * 0.94);
      bool tir = dot(T2, T2) < 0.001;
      vec3 b2 = tir ? reflect(T1, Nin) : T2;
      if (tir) { // continue the bounce through a hashed second facet
        vec3 T3 = refract(b2, -Nin2, ior);
        b2 = (dot(T3, T3) < 0.001) ? reflect(b2, Nin2) : T3;
      }
      // ONE path per channel — hit or miss is what makes the mosaic
      float v = chan(envAt(b2), i) * (tir ? 0.72 : 1.0)
              + chan(envAt(T1), i) * 0.35;
      if (i == 0) inner.r = v; else if (i == 1) inner.g = v; else inner.b = v;
    }
    inner *= uBody * (0.82 + 0.36 * fh);
    // on the girdle: collapse the three channel paths to their luminance —
    // platinum streaks instead of solid primary quads
    inner = mix(inner, vec3(dot(inner, vec3(0.299, 0.587, 0.114))), gird * 0.9);
    // per-facet charcoal variation: face-on cells that miss every source keep
    // a whisper of body tone instead of collapsing into one black mass
    inner += uBody * vec3(0.030, 0.036, 0.054) * (0.3 + 0.7 * fh) * ndv * (1.0 - gird);

    // ---- fire: sharp facet glints that break into spectrum ----
    vec3 R = reflect(V, N);
    vec3 fire = vec3(0.0);
    vec3 Ls[3];
    Ls[0] = normalize(vec3(0.55, 0.72, 0.42));   // warm lamp
    Ls[1] = normalize(vec3(-0.78, 0.55, -0.05)); // softbox
    Ls[2] = normalize(vec3(0.05, 0.25, -0.96));  // strip
    vec3 Lc[3];
    Lc[0] = vec3(1.0, 0.84, 0.58);
    Lc[1] = vec3(0.82, 0.90, 1.0);
    Lc[2] = vec3(0.9, 0.94, 1.0);
    for (int i = 0; i < 3; i++) {
      float a = max(dot(R, Ls[i]), 0.0);
      float core = pow(a, 800.0);
      float halo = pow(a, 90.0);
      float rim = clamp((a - 0.994) * 200.0, 0.0, 1.0);
      fire += Lc[i] * core * 3.2;
      fire += spectral(rim * 0.8 + fh * 0.2) * halo * rim * 2.6;
    }
    // internal fire: refracted ray near a light → colored flash from inside
    vec3 Ti = refract(V, N, 1.0 / uIor);
    for (int i = 0; i < 2; i++) {
      float a = max(dot(Ti, -Ls[i]), 0.0);
      float w = pow(a, 60.0);
      fire += spectral(fract(fh + a * 3.0)) * w * 0.9;
    }
    fire *= 1.0 - gird * 0.55;

    if (uDbg > 0.5 && uDbg < 1.5) { gl_FragColor = vec4(inner, 1.0); return; }
    if (uDbg > 1.5 && uDbg < 2.5) { gl_FragColor = vec4(refl, 1.0); return; }
    if (uDbg > 2.5) { gl_FragColor = vec4(fire, 1.0); return; }

    vec3 col = inner * (1.0 - fres * 0.65)
             + refl * (fres * 1.3 + 0.03)
             + fire
             + vec3(0.82, 0.86, 0.98) * pow(1.0 - ndv, 5.0) * 0.5; // fresnel edge sparkle
    col *= uBoost;
    col += (refl * 0.6 + vec3(1.0, 0.88, 0.66)) * uFlash * 0.8;

    // compress highlights only — darks stay velvet (no gamma lift)
    col = col / (col + vec3(0.55));
    col *= 1.24;
    // a whisper of the tray so the silhouette never goes to pure black
    col += vec3(0.045, 0.055, 0.085) * (1.0 - fres * 0.5);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const EDGE_VERT = /* glsl */`
  attribute float aPhase;
  varying float vPh;
  void main() {
    vPh = aPhase;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EDGE_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uPulse;
  uniform float uFlash;
  varying float vPh;
  vec3 spectral(float t) {
    t = fract(t);
    return clamp(vec3(abs(t * 6.0 - 3.0) - 1.0,
                      2.0 - abs(t * 6.0 - 2.0),
                      2.0 - abs(t * 6.0 - 4.0)), 0.0, 1.0);
  }
  void main() {
    vec3 col = vec3(0.62, 0.67, 0.78) * 0.045;              // constant platinum whisper
    float tw = pow(max(sin(uTime * 0.75 + vPh * 6.2831), 0.0), 64.0);
    tw *= step(0.42, fract(vPh * 7.31));                    // some junctions stay quiet
    col += spectral(vPh * 3.7 + uTime * 0.021) * tw * 0.95 * uPulse;
    col += vec3(1.0, 0.87, 0.62) * uFlash * 0.5;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const POOL_VERT = /* glsl */`
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* the scintillation pool: light the stone throws onto the velvet tray.
 * A few slow spectral-tinted streaks rotate with the stone's yaw. */
const POOL_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uYaw;
  uniform float uAmp;
  uniform float uFlash;
  varying vec2 vP;
  vec3 spectral(float t) {
    t = fract(t);
    return clamp(vec3(abs(t * 6.0 - 3.0) - 1.0,
                      2.0 - abs(t * 6.0 - 2.0),
                      2.0 - abs(t * 6.0 - 4.0)), 0.0, 1.0);
  }
  void main() {
    vec2 p = vP / 1.35;
    float r = length(p);
    float ang = atan(p.y, p.x);
    vec3 col = vec3(0.0);
    // the lamp's warm pool, faint
    col += vec3(0.83, 0.66, 0.34) * 0.040 * smoothstep(0.95, 0.0, r);
    // thrown facet streaks
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float a = -uYaw * (0.55 + 0.13 * mod(fi, 3.0)) + fi * 2.39996;
      float d = abs(sin((ang - a) * 0.5));
      float wedge = exp(-d * d * 70.0);
      float band = smoothstep(0.12, 0.36, r) * smoothstep(1.15, 0.5, r);
      float tw = 0.5 + 0.5 * sin(uTime * (0.5 + 0.11 * fi) + fi * 1.7);
      vec3 tint = mix(vec3(0.72, 0.78, 0.9), spectral(fi * 0.23 + uTime * 0.015), 0.45);
      col += tint * wedge * band * (0.05 + 0.15 * tw * tw);
    }
    col *= uAmp;
    col += vec3(0.9, 0.78, 0.55) * uFlash * 0.16 * smoothstep(1.05, 0.1, r);
    // coverage alpha: the canvas is composited premultiplied over the page,
    // so encode glow as rgb*alpha with soft coverage — no plane rectangle
    float cov = clamp(max(col.r, max(col.g, col.b)) * 2.2, 0.0, 0.8);
    gl_FragColor = vec4(col / max(cov, 0.03), cov);
  }
`;

/* ------------------------------------------------------------------ *
 * Gem stage: one canvas, one stone, swappable cuts.
 * ------------------------------------------------------------------ */
export function createGemStage(canvas, opts = {}) {
  const {
    body = [0.97, 0.965, 0.95],
    ior = 2.10,
    disp = 0.055,
    draggable = true,
    spin = 0.14,
    tilt = 0.44,
    fov = 30,
  } = opts;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 30);
  camera.position.set(0, 0.34, 5.0);
  camera.lookAt(0, -0.02, 0);

  const envTex = new THREE.CanvasTexture(benchEnvironment());
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  const cubeRT = new THREE.WebGLCubeRenderTarget(1024);
  cubeRT.fromEquirectangularTexture(renderer, envTex);
  envTex.dispose();

  const gemMat = new THREE.ShaderMaterial({
    vertexShader: GEM_VERT,
    fragmentShader: GEM_FRAG,
    uniforms: {
      uEnv: { value: cubeRT.texture },
      uCam: { value: camera.position.clone() },
      uBody: { value: new THREE.Vector3(...body) },
      uIor: { value: ior },
      uDisp: { value: disp },
      uFlash: { value: 0 },
      uBoost: { value: 1 },
      uDbg: { value: parseFloat(new URLSearchParams(location.search).get('dbg') || '0') },
    },
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const edgeMat = new THREE.ShaderMaterial({
    vertexShader: EDGE_VERT,
    fragmentShader: EDGE_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: REDUCED ? 0 : 1 },
      uFlash: { value: 0 },
    },
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });

  const pivot = new THREE.Group();     // pitch
  const spinner = new THREE.Group();   // yaw
  pivot.add(spinner);
  scene.add(pivot);
  pivot.rotation.x = tilt;

  // the tray beneath the stone — light spills onto it (hero only)
  let poolMat = null;
  if (opts.pool) {
    poolMat = new THREE.ShaderMaterial({
      vertexShader: POOL_VERT,
      fragmentShader: POOL_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uYaw: { value: 0 },
        uAmp: { value: 1 },
        uFlash: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
    });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = -0.74;
    scene.add(pool);
  }

  const mesh = new THREE.Mesh(undefined, gemMat);
  const lines = new THREE.LineSegments(undefined, edgeMat);
  spinner.add(mesh);
  spinner.add(lines);

  const edgeCache = {};
  function edgesFor(cut) {
    if (!edgeCache[cut.key]) {
      const eg = new THREE.EdgesGeometry(cut.geometry, 5);
      const n = eg.getAttribute('position').count;
      const ph = new Float32Array(n);
      for (let i = 0; i < n; i += 2) { const r = Math.random(); ph[i] = r; ph[i + 1] = r; }
      eg.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
      edgeCache[cut.key] = eg;
    }
    return edgeCache[cut.key];
  }

  let currentKey = null;
  let cutTilt = 0, cutTiltTarget = 0;   // per-cut presentation pitch
  function applyCut(key) {
    const cut = getCut(key);
    mesh.geometry = cut.geometry;
    lines.geometry = edgesFor(cut);
    const s = cut.displayScale * (opts.scale || 1);
    mesh.scale.setScalar(s);
    lines.scale.setScalar(s);
    cutTiltTarget = cut.viewTilt || 0;
    if (REDUCED) cutTilt = cutTiltTarget;
    currentKey = key;
  }
  applyCut(opts.cut || 'brilliant');
  cutTilt = cutTiltTarget;

  /* ---- interaction ---- */
  let velY = 0, dragging = false, lastX = 0, lastY = 0, idleT = 9;
  let yaw = opts.yaw0 ?? 0.62, pitchOff = 0;
  let paraYaw = 0, paraPitch = 0, paraYawT = 0, paraPitchT = 0;
  if (opts.parallax && !REDUCED) {
    const host = canvas.parentElement;
    host.addEventListener('pointermove', e => {
      if (dragging) return;
      const r = host.getBoundingClientRect();
      paraYawT = ((e.clientX - r.left) / r.width - 0.5) * 0.17;
      paraPitchT = ((e.clientY - r.top) / r.height - 0.5) * 0.12;
    });
    host.addEventListener('pointerleave', () => { paraYawT = 0; paraPitchT = 0; });
  }
  if (draggable && !REDUCED) {
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', e => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      yaw += dx * 0.008;
      velY = dx * 0.008;
      pitchOff = Math.max(-0.5, Math.min(0.5, pitchOff + dy * 0.004));
      idleT = 0;
    });
    const up = () => { dragging = false; canvas.style.cursor = 'grab'; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  }

  /* ---- recut choreography ---- */
  let recut = null;
  function setCut(key, instant = false) {
    if (key === currentKey) return;
    if (instant || REDUCED) { applyCut(key); requestRender(); return; }
    recut = { t0: performance.now(), key, swapped: false, fromScale: mesh.scale.x };
    kick();
  }

  let flashKick = 0;
  function flash() { flashKick = 1; kick(); }

  /* ---- render loop with visibility gating ---- */
  let inView = true, tabVisible = !document.hidden, rafId = 0;
  let lastT = performance.now();
  const clockStart = lastT;
  let renderPending = true;

  function requestRender() { renderPending = true; kick(); }

  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const t = (now - clockStart) / 1000;

    if (!REDUCED) {
      if (!dragging) {
        idleT += dt;
        const blend = Math.min(1, Math.max(0, idleT - 1.6));
        velY *= 0.94;
        yaw += velY * (1 - blend) * 60 * dt * 0.4 + spin * dt * Math.min(1, blend + 0.25);
        pitchOff *= (1 - 0.4 * dt);
      }
      paraYaw += (paraYawT - paraYaw) * Math.min(1, dt * 3.2);
      paraPitch += (paraPitchT - paraPitch) * Math.min(1, dt * 3.2);
      cutTilt += (cutTiltTarget - cutTilt) * Math.min(1, dt * 2.4);
      spinner.rotation.y = yaw + paraYaw;
      pivot.rotation.x = tilt + cutTilt + pitchOff + paraPitch + Math.sin(t * 0.21) * 0.03;
      edgeMat.uniforms.uTime.value = t;
    } else {
      spinner.rotation.y = 0.72;
      pivot.rotation.x = tilt + cutTilt;
    }
    if (poolMat) {
      poolMat.uniforms.uTime.value = t;
      poolMat.uniforms.uYaw.value = spinner.rotation.y;
      poolMat.uniforms.uFlash.value = gemMat.uniforms.uFlash.value;
    }

    // recut animation: pinch → flash → swap → settle
    if (recut) {
      const el = (now - recut.t0) / 1000;
      const targetS = getCut(recut.key).displayScale * (opts.scale || 1);
      if (el < 0.18) {
        const k = el / 0.18;
        const sc = recut.fromScale * (1 - 0.08 * k);
        mesh.scale.setScalar(sc); lines.scale.setScalar(sc);
        gemMat.uniforms.uFlash.value = k * 0.9;
        edgeMat.uniforms.uFlash.value = k * 0.8;
      } else {
        if (!recut.swapped) { applyCut(recut.key); recut.swapped = true; }
        const k2 = Math.min(1, (el - 0.18) / 0.5);
        const ease = 1 - Math.pow(1 - k2, 3);
        const sc = targetS * (0.92 + 0.08 * ease);
        mesh.scale.setScalar(sc); lines.scale.setScalar(sc);
        gemMat.uniforms.uFlash.value = 0.9 * (1 - ease);
        edgeMat.uniforms.uFlash.value = 0.8 * (1 - ease);
        if (k2 >= 1) recut = null;
      }
    }

    if (!recut) {
      // ambient flash pulses decay fully back to zero
      flashKick = Math.max(0, flashKick - dt * 2.0);
      const f = flashKick * flashKick;
      gemMat.uniforms.uFlash.value = f * 0.55;
      edgeMat.uniforms.uFlash.value = f * 0.7;
    }

    gemMat.uniforms.uCam.value.copy(camera.position);
    renderer.render(scene, camera);
    renderPending = false;
  }

  function loop(now) {
    rafId = 0;
    if (!inView || !tabVisible) return;                       // paused; kick() resumes
    frame(now);
    if (REDUCED && !recut && flashKick <= 0 && !renderPending) return; // render-on-demand
    rafId = requestAnimationFrame(loop);
  }
  function kick() {
    if (!rafId && inView && tabVisible) {
      lastT = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  const io = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (inView) kick();
  }, { threshold: 0.02 });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => {
    tabVisible = !document.hidden;
    if (tabVisible) kick();
  });

  /* ---- sizing ---- */
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const wCss = Math.max(2, Math.round(r.width)), hCss = Math.max(2, Math.round(r.height));
    renderer.setPixelRatio(dpr);
    renderer.setSize(wCss, hCss, false);
    canvas.style.width = wCss + 'px'; canvas.style.height = hCss + 'px';
    camera.aspect = wCss / hCss;
    // portrait-ish stages (mid-width hero) pull the camera back so the
    // stone never crowds the copy or clips the viewport edge
    if (opts.fitAspect) {
      camera.position.z = 5.0 * Math.min(1.5, Math.max(1, 1.06 / camera.aspect));
    }
    camera.updateProjectionMatrix();
    requestRender();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);
  resize();
  kick();

  return { setCut, flash, requestRender, get cut() { return currentKey; } };
}
