// NIGHTDRIVE — the endless drive.
// Shader-scrolled wireframe terrain, scanline sun, layered glow, bloom.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// World-space period of the terrain noise (256 / noise scale), chosen as
// 5694 = 13 × 438 so the 13-unit road center-dash phase is also seamless
// when uZ wraps. Terrain octaves are exact multiples, so they wrap clean too.
const NOISE_PERIOD = 5694.0;

const TERRAIN_VERT = /* glsl */`
  uniform float uZ;
  varying float vH;
  varying float vDist;

  float hash12(vec2 p) {
    p = mod(p, 256.0);
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 pos = position;
    vec2 world = vec2(pos.x, pos.z - uZ);
    float ax = abs(pos.x);
    // flat road valley in the middle, ridges swell toward the edges
    float mask = smoothstep(9.0, 46.0, ax);
    float amp = mix(7.0, 34.0, smoothstep(14.0, 150.0, ax));
    const float S = 0.04495961; // 256 / 5694 — keeps the uZ wrap seamless
    float h = vnoise(world * S) * amp
            + vnoise(world * (S * 2.0)) * amp * 0.35
            + vnoise(world * (S * 4.0)) * amp * 0.12;
    h *= mask;
    pos.y = h;
    vH = h;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const TERRAIN_FRAG = /* glsl */`
  uniform vec3 uCyan;
  uniform vec3 uMagenta;
  uniform float uFar;
  varying float vH;
  varying float vDist;

  void main() {
    vec3 col = mix(uCyan, uMagenta, smoothstep(3.0, 30.0, vH));
    // fog: lines sink into the dusk with distance
    float fade = 1.0 - smoothstep(uFar * 0.30, uFar * 0.85, vDist);
    // slight lift so nearby lines burn hot for the bloom pass
    float heat = 1.0 - smoothstep(0.0, uFar * 0.3, vDist);
    col *= (0.5 + 0.45 * heat);
    gl_FragColor = vec4(col * fade, fade);
  }
`;

const ROAD_FRAG = /* glsl */`
  uniform float uZ;
  uniform vec3 uCyan;
  uniform vec3 uOrange;
  varying vec2 vUv;
  varying float vDist;
  uniform float uFar;

  void main() {
    float x = abs(vUv.x - 0.5) * 2.0; // 0 center → 1 edge
    vec3 col = vec3(0.008, 0.004, 0.02);
    // edge lines
    float edge = smoothstep(0.86, 0.9, x) * (1.0 - smoothstep(0.94, 1.0, x));
    col += uCyan * edge * 0.5;
    // center dash, scrolling with the world
    float zWorld = vUv.y * 440.0 - uZ;
    float dash = step(fract(zWorld / 13.0), 0.46);
    float center = (1.0 - smoothstep(0.015, 0.05, x)) * dash;
    col += uOrange * center * 0.65;
    float fade = 1.0 - smoothstep(uFar * 0.30, uFar * 0.85, vDist);
    gl_FragColor = vec4(col * fade, fade);
  }
`;

const ROAD_VERT = /* glsl */`
  varying vec2 vUv;
  varying float vDist;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const SUN_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SUN_FRAG = /* glsl */`
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 c = vUv - 0.5;
    float d = length(c) * 2.0;
    float disc = 1.0 - smoothstep(0.965, 1.0, d);
    if (disc <= 0.0) discard;
    vec3 col = mix(uBottom, uTop, smoothstep(0.12, 0.95, vUv.y));
    // scanline slits, thicker toward the bottom — the classic sun-grid
    float below = 1.0 - smoothstep(0.04, 0.6, vUv.y);
    float slitW = below * 0.7;
    float band = fract(vUv.y * 11.0 - uTime * 0.22);
    float slit = smoothstep(slitW, slitW + 0.035, band);
    float alpha = disc * mix(1.0, slit, step(0.001, slitW));
    gl_FragColor = vec4(col * 1.5, alpha);
  }
`;

// redline streaks — roadside light sources smear into lines as speed climbs
const STREAK_VERT = /* glsl */`
  attribute float aTail;
  attribute float aSeed;
  uniform float uZS;
  uniform float uSpeed;
  varying float vA;
  varying float vSeed;
  void main() {
    vec3 pos = position;
    float span = 240.0;
    float z = mod(pos.z + uZS, span) - (span - 26.0); // -214 .. 26
    z -= aTail * (3.0 + uSpeed * 34.0);               // tail smears with speed
    pos.z = z;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = -mv.z;
    float fade = (1.0 - smoothstep(120.0, 214.0, dist)) * smoothstep(-6.0, 8.0, dist);
    vA = fade * (1.0 - aTail * 0.85);
    vSeed = aSeed;
    gl_Position = projectionMatrix * mv;
  }
`;

const STREAK_FRAG = /* glsl */`
  uniform float uSpeed;
  uniform vec3 uCyan;
  uniform vec3 uMagenta;
  varying float vA;
  varying float vSeed;
  void main() {
    float a = vA * smoothstep(0.14, 0.6, uSpeed) * 0.85;
    if (a <= 0.004) discard;
    vec3 col = mix(uCyan, uMagenta, step(0.72, vSeed));
    gl_FragColor = vec4(col * a, a);
  }
`;

const STAR_VERT = /* glsl */`
  attribute float aSeed;
  uniform float uTime;
  varying float vTw;
  void main() {
    vTw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 1.7) + aSeed * 40.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (1.1 + aSeed * 1.9) * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const STAR_FRAG = /* glsl */`
  varying float vTw;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    float soft = 1.0 - smoothstep(0.1, 0.5, length(c));
    gl_FragColor = vec4(vec3(0.82, 0.87, 1.0) * vTw * soft, vTw * soft);
  }
`;

function makeGradientTexture(stops, w = 4, h = 512) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, h);
  for (const [off, col] of stops) grad.addColorStop(off, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlowTexture(inner, mid, size = 256) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.45, mid);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(cv);
}

function buildGridGeometry(halfW, depth, cell) {
  // indexed line-segment grid on the XZ plane, y displaced in-shader
  const cols = Math.round((halfW * 2) / cell);
  const rows = Math.round(depth / cell);
  const verts = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      verts.push(-halfW + c * cell, 0, 28 - r * cell);
    }
  }
  const idx = [];
  const W = cols + 1;
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) idx.push(r * W + c, r * W + c + 1);
  }
  for (let c = 0; c <= cols; c++) {
    for (let r = 0; r < rows; r++) idx.push(r * W + c, (r + 1) * W + c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  return geo;
}

export function createDrive(canvas, opts = {}) {
  const reduced = !!opts.reducedMotion;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
  } catch (e) {
    return null;
  }

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new THREE.Scene();
  scene.background = makeGradientTexture([
    [0.0, '#050310'], [0.42, '#0E0524'], [0.52, '#2A0B44'],
    [0.585, '#71164E'], [0.615, '#C33357'], [0.635, '#3A0F3E'],
    [0.72, '#12062A'], [1.0, '#0B0614'],
  ]);

  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, 12, 26);
  camera.lookAt(0, 7, -120);

  const FAR = 430;
  const uniforms = {
    uZ: { value: 0 },
    uFar: { value: FAR },
    uCyan: { value: new THREE.Color('#19c8e6') },
    uMagenta: { value: new THREE.Color('#ff2e88') },
  };

  // terrain wireframe
  const terrainMat = new THREE.ShaderMaterial({
    vertexShader: TERRAIN_VERT,
    fragmentShader: TERRAIN_FRAG,
    uniforms: {
      uZ: uniforms.uZ,
      uFar: uniforms.uFar,
      uCyan: uniforms.uCyan,
      uMagenta: uniforms.uMagenta,
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const terrain = new THREE.LineSegments(buildGridGeometry(180, 440, 4), terrainMat);
  scene.add(terrain);

  // road bed
  const roadMat = new THREE.ShaderMaterial({
    vertexShader: ROAD_VERT,
    fragmentShader: ROAD_FRAG,
    uniforms: {
      uZ: uniforms.uZ,
      uFar: uniforms.uFar,
      uCyan: uniforms.uCyan,
      uOrange: { value: new THREE.Color('#ff8a3c') },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(19, 440, 1, 1), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.06, 28 - 220);
  scene.add(road);

  // the sun
  const sunUniforms = {
    uTop: { value: new THREE.Color('#ffb14d') },
    uBottom: { value: new THREE.Color('#ff2e88') },
    uTime: { value: 0 },
  };
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(46, 72),
    new THREE.ShaderMaterial({
      vertexShader: SUN_VERT,
      fragmentShader: SUN_FRAG,
      uniforms: sunUniforms,
      transparent: true,
      depthWrite: false,
    })
  );
  sun.position.set(0, 26, -418);
  scene.add(sun);

  // layered glow: halo sprite behind the sun + horizon haze bar
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture('rgba(255,120,80,0.55)', 'rgba(255,46,136,0.20)'),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  }));
  halo.scale.set(220, 220, 1);
  halo.position.set(0, 2, -424);
  scene.add(halo);

  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(860, 120),
    new THREE.MeshBasicMaterial({
      map: makeGlowTexture('rgba(255,60,130,0.3)', 'rgba(150,30,110,0.1)', 128),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  haze.position.set(0, 6, -426);
  haze.scale.set(1, 0.34, 1);
  scene.add(haze);

  // redline streaks: invisible at cruise, tear past at speed
  const STREAKS = 120;
  const stPos = new Float32Array(STREAKS * 2 * 3);
  const stTail = new Float32Array(STREAKS * 2);
  const stSeed = new Float32Array(STREAKS * 2);
  for (let i = 0; i < STREAKS; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * (11 + Math.random() * 62);   // clear of the road bed
    const y = 1.5 + Math.random() * 26;
    const z = Math.random() * 240;
    const seed = Math.random();
    for (let v = 0; v < 2; v++) {
      const o = (i * 2 + v) * 3;
      stPos[o] = x; stPos[o + 1] = y; stPos[o + 2] = z;
      stTail[i * 2 + v] = v;
      stSeed[i * 2 + v] = seed;
    }
  }
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(stPos, 3));
  streakGeo.setAttribute('aTail', new THREE.BufferAttribute(stTail, 1));
  streakGeo.setAttribute('aSeed', new THREE.BufferAttribute(stSeed, 1));
  const streakUniforms = {
    uZS: { value: 0 },
    uSpeed: { value: 0 },
    uCyan: uniforms.uCyan,
    uMagenta: uniforms.uMagenta,
  };
  const streaks = new THREE.LineSegments(streakGeo, new THREE.ShaderMaterial({
    vertexShader: STREAK_VERT,
    fragmentShader: STREAK_FRAG,
    uniforms: streakUniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  streaks.frustumCulled = false;
  scene.add(streaks);

  // stars
  const starCount = 800;
  const sPos = new Float32Array(starCount * 3);
  const sSeed = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    sPos[i * 3] = (Math.random() - 0.5) * 1100;
    sPos[i * 3 + 1] = 30 + Math.random() * 320;
    sPos[i * 3 + 2] = -430 - Math.random() * 60;
    sSeed[i] = Math.random();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  starGeo.setAttribute('aSeed', new THREE.BufferAttribute(sSeed, 1));
  const starUniforms = { uTime: { value: 0 } };
  const stars = new THREE.Points(starGeo, new THREE.ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    uniforms: starUniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  scene.add(stars);

  // bloom pipeline
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5, 0.55, 0.3
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------- runtime ----------
  const BASE_SPEED = 42; // world units / s at cruise
  let speedNorm = 0;     // 0 cruise → 1 redline
  let time = 0;

  function setSpeedNorm(n) { speedNorm = n; }

  function tick(dt) {
    time += dt;
    const speed = BASE_SPEED * (1 + speedNorm * 3.1);
    uniforms.uZ.value = (uniforms.uZ.value + speed * dt) % NOISE_PERIOD;
    sunUniforms.uTime.value = time;
    starUniforms.uTime.value = time;
    streakUniforms.uZS.value = (streakUniforms.uZS.value + speed * dt * 1.7) % 240;
    streakUniforms.uSpeed.value = speedNorm;

    // gentle driver sway; firmer grip at speed
    const sway = 1 - speedNorm * 0.55;
    camera.position.x = Math.sin(time * 0.24) * 1.15 * sway;
    camera.position.y = 12 + Math.sin(time * 0.4) * 0.28 * sway + speedNorm * -0.6;
    camera.rotation.z = Math.sin(time * 0.19) * 0.006 * sway;

    // FOV opens up as you floor it
    const targetFov = 72 + speedNorm * 16;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
      camera.updateProjectionMatrix();
    }
    bloom.strength = 0.5 + speedNorm * 0.18;
    composer.render();
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    if (reduced) tick(0);
  }
  window.addEventListener('resize', resize);

  if (reduced) {
    // one considered frame, no motion
    uniforms.uZ.value = 260;
    tick(0);
  }

  return { tick, setSpeedNorm, resize, reduced };
}
