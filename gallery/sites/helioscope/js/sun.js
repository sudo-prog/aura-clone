// ============================================================
// HELIOSCOPE — the shader sun (signature element)
// One fullscreen fbm/voronoi photosphere quad + solar-wind points.
// Sunspots are baked from js/data.js at true log positions.
// ============================================================
import * as THREE from 'three';
import { REGIONS, diskXY } from './data.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- fragment shader --------------------------------------------------
function buildFrag() {
  const spots = REGIONS.map((reg) => {
    const p = diskXY(reg);
    return `shade *= spotShade(ps, vec3(${p.x.toFixed(4)}, ${p.y.toFixed(4)}, ${reg.r.toFixed(4)}));`;
  }).join('\n  ');

  return /* glsl */ `
uniform vec2  uRes;
uniform float uTime;
uniform vec3  uSun;        // x, y (min-dim units from centre, y up), radius
uniform float uExposure;
uniform float uCorona;
uniform float uFlare;
uniform vec2  uFlareSpot;  // disk-space position of the flaring region
uniform vec2  uPointer;

// --- noise kit ---
float hash3(vec3 p){ p = fract(p*0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0;
  return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
vec2 hash22(vec2 p){ p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)));
  return fract(sin(p)*43758.5453); }
float noise3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash3(i), hash3(i+vec3(1,0,0)), f.x),
                 mix(hash3(i+vec3(0,1,0)), hash3(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i+vec3(0,0,1)), hash3(i+vec3(1,0,1)), f.x),
                 mix(hash3(i+vec3(0,1,1)), hash3(i+vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float v = 0.0, a = 0.5;
  for (int i = 0; i < OCT; i++){ v += a*noise3(p); p = p*2.03 + vec3(11.7, 9.2, 5.1); a *= 0.55; }
  return v; }

// --- animated voronoi granulation: edge distance + cell interior ---
float granule(vec2 p, float t, out float F1out, out float cellId){
  vec2 i = floor(p), f = fract(p);
  float F1 = 8.0, F2 = 8.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 g = vec2(float(x), float(y));
    vec2 h = hash22(i + g);
    vec2 o = g + 0.5 + 0.38*sin(t*0.35 + 6.2831*h) - f;
    float d = dot(o, o);
    if (d < F1){ F2 = F1; F1 = d; id = h.x; } else if (d < F2){ F2 = d; }
  }
  cellId = id;
  F1out = sqrt(F1);
  return sqrt(F2) - sqrt(F1);
}

// --- data-driven sunspot (umbra + filamented penumbra) ---
float spotShade(vec3 ps, vec3 sp){
  vec2 d = ps.xy - sp.xy;
  float pz = sqrt(max(1.0 - dot(sp.xy, sp.xy), 0.06));   // foreshortening at spot
  vec2 rad = normalize(sp.xy + vec2(1e-4));
  float dr = dot(d, rad) / pz;                            // undo radial squash
  float dt = dot(d, vec2(-rad.y, rad.x));
  float sd = length(vec2(dr, dt));
  float um = 1.0 - smoothstep(sp.z*0.40, sp.z*0.60, sd);
  float pe = (1.0 - smoothstep(sp.z*0.58, sp.z*1.30, sd)) * (1.0 - um);
  float fil = 0.62 + 0.55*noise3(vec3(ps.xy*90.0, 3.7));
  return 1.0 - um*0.90 - pe*0.52*fil;
}

vec3 solarRamp(float T, float z){
  vec3 c = mix(vec3(0.26, 0.045, 0.004), vec3(1.0, 0.34, 0.05), smoothstep(0.0, 0.55, T));
  c = mix(c, vec3(1.0, 0.62, 0.22), smoothstep(0.48, 0.82, T));
  c = mix(c, vec3(1.05, 0.92, 0.70), smoothstep(0.80, 1.08, T));
  return c * (0.26 + 0.74*pow(max(z, 0.0), 0.5));         // limb darkening
}

void main(){
  float minD = min(uRes.x, uRes.y);
  vec2 p = (gl_FragCoord.xy - 0.5*uRes) / minD;           // centre origin, y up
  vec2 d = p - uSun.xy;
  float len = length(d);
  float r = len / uSun.z;
  float rr = max(r - 1.0, 0.0);
  vec3 col = vec3(0.0);

  // ---------- photosphere ----------
  if (r < 1.012){
    float rz = clamp(r, 0.0, 1.0);
    float z = sqrt(max(1.0 - rz*rz, 0.0));
    vec3 ps = vec3(d / uSun.z, z);

    // domain warp + slow churn (time is the 3rd noise axis: true evolution)
    float t = uTime;
    vec2 wp = (vec2(fbm(vec3(ps.xy*4.2, t*0.05)),
                    fbm(vec3(ps.xy*4.2 + 7.3, t*0.05))) - 0.5) * 2.2;
    wp += uPointer * 0.22;                                 // pointer stirs the surface

    float mo = fbm(vec3(ps.xy*2.2 + wp*0.30, t*0.03));     // supergranule mottling
    // granule frequency follows zoom: fine at hero scale, coarse when small
    float GRS = mix(30.0, 58.0, smoothstep(0.15, 1.25, uSun.z));
    float F1, cid;
    float ed = granule(ps.xy*GRS + wp*2.5, t, F1, cid);
    float lane = smoothstep(0.0, 0.15, ed);                // thin dark lanes
    float dome = exp(-F1*F1*3.4);                          // hot granule centres
    float flick = 0.86 + 0.20*sin(t*0.25 + cid*39.0);
    float cell = lane * (0.36 + 0.64*dome) * flick;
    float T = 0.38 + 0.44*cell + (mo - 0.5)*0.36;

    // faculae torches near the limb
    T += pow(1.0 - z, 2.6) * smoothstep(0.55, 0.90, mo) * 0.5;
    T += uFlare * 0.10;

    vec3 surf = solarRamp(T, z);

    float shade = 1.0;
    ${spots}
    surf *= shade;

    // chromosphere ring just inside the limb
    surf += vec3(1.0, 0.26, 0.06) * pow(1.0 - z, 6.0) * 0.38;

    col = surf * smoothstep(1.012, 0.998, r);              // AA edge
  }

  // ---------- corona + wind glow ----------
  float mask = smoothstep(0.985, 1.005, r);
  if (r > 0.985 && r < 4.0){
    vec2 cd = d / max(len, 1e-5);
    vec3 cq = vec3(cd*2.6, rr*1.1 - uTime*0.035);
    cq.xy += uPointer * 0.42;                              // corona leans with pointer
    float st = fbm(cq + vec3(fbm(cq*1.6))*0.55);
    st = pow(max(st, 0.0), 1.8);
    float aniso = 0.70 + 0.55*pow(abs(cd.x), 1.6);         // equatorial streamers
    float glow = exp(-rr*8.0)*0.85
               + exp(-rr*2.05)*st*aniso*1.05
               + exp(-rr*30.0)*1.15;
    glow *= uCorona * (1.0 + uFlare*1.5) * mask;
    vec3 cc = mix(vec3(1.0, 0.82, 0.55), vec3(1.0, 0.44, 0.13), clamp(rr*1.35, 0.0, 1.0));
    col += cc * glow * 0.85;
    col += vec3(1.0, 0.30, 0.07) * exp(-rr*34.0) * 0.9 * uCorona * mask;
  }

  // ---------- flare kernel at the active region ----------
  if (uFlare > 0.003){
    vec2 fpos = uSun.xy + uFlareSpot * uSun.z;
    float fd = length(p - fpos) / uSun.z;
    col += vec3(1.0, 0.88, 0.60) * exp(-fd*fd*7.0) * uFlare * 1.5;
    col += vec3(1.0, 0.55, 0.20) * exp(-fd*2.4) * uFlare * 0.35;
  }

  // ---------- sparse starfield ----------
  if (r > 1.04){
    vec2 g = p*90.0 + 350.0;
    vec2 cell = floor(g), f = fract(g);
    vec2 sp = hash22(cell);
    float amp = step(0.955, sp.y) * (0.35 + 0.65*fract(sp.x*13.7));
    float dS = length(f - (0.15 + 0.7*sp));
    float tw = 0.6 + 0.4*sin(uTime*0.8 + sp.x*80.0);
    col += vec3(0.85, 0.82, 0.80) * smoothstep(0.10, 0.0, dS) * amp * tw
         * (1.0 - exp(-rr*1.7)) * 0.38;
  }

  // ---------- exposure, grain, void floor ----------
  col = 1.0 - exp(-col * (uExposure * 1.85 + 1e-4));
  float grain = (hash3(vec3(gl_FragCoord.xy, fract(uTime)*61.7)) - 0.5) * 0.016;
  col += grain;
  col = clamp(col, 0.0, 1.0);
  col = vec3(0.0235) + col * 0.9765;                       // exact #060606 floor
  gl_FragColor = vec4(col, 1.0);
}`;
}

const WIND_VERT = /* glsl */ `
attribute float aAngle;
attribute float aR0;
attribute float aSpeed;
attribute float aSize;
attribute float aSeed;
uniform vec2  uRes;
uniform vec3  uSun;
uniform float uTime;
uniform float uWind;
uniform float uDpr;
varying float vP;
varying float vSeed;
void main(){
  float span = uSun.z * 2.4;
  float prog = fract(aR0 + uWind * aSpeed);
  float rad = uSun.z*1.02 + prog*span;
  float ang = aAngle + uTime * 0.012 * (aSeed - 0.5);
  vec2 pos = uSun.xy + vec2(cos(ang), sin(ang)) * rad;
  float minD = min(uRes.x, uRes.y);
  gl_Position = vec4(pos * 2.0 * minD / uRes, 0.0, 1.0);
  gl_PointSize = aSize * uDpr * mix(2.4, 0.9, prog) * clamp(uSun.z*1.7, 0.55, 1.7);
  vP = prog; vSeed = aSeed;
}`;

const WIND_FRAG = /* glsl */ `
uniform float uFade;
uniform float uFlare;
varying float vP;
varying float vSeed;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.06, length(q));
  float fade = smoothstep(0.0, 0.09, vP) * (1.0 - smoothstep(0.5, 1.0, vP));
  vec3 c = mix(vec3(1.0, 0.80, 0.46), vec3(1.0, 0.40, 0.12), vP);
  float alpha = a * fade * uFade * (0.36 + 0.55*uFlare) * (0.45 + 0.55*vSeed);
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(c * alpha, alpha);
}`;

// ---- scroll choreography keyframes (min-dim units) ---------------------
const KEYS_LAND = [
  { p: 0.00, x: 0.00, y: -1.34, r: 1.30, e: 1.00, c: 1.00 },
  { p: 0.13, x: 0.14, y: -1.10, r: 0.95, e: 0.88, c: 0.80 },
  { p: 0.30, x: 0.44, y: -0.92, r: 0.66, e: 0.72, c: 0.60 },
  { p: 0.52, x: 0.50, y: -0.88, r: 0.58, e: 0.66, c: 0.52 },
  { p: 0.75, x: 0.44, y: -0.96, r: 0.56, e: 0.55, c: 0.46 },
  { p: 0.92, x: 0.00, y:  0.22, r: 0.17, e: 0.92, c: 0.95 },
  { p: 1.00, x: 0.00, y:  0.20, r: 0.16, e: 1.00, c: 1.05 },
];
// portrait: the sun stays a glowing horizon at the bottom edge so
// data sections keep their contrast, and the page closes on that horizon
// rising back to full glow beneath the colophon
const KEYS_PORT = [
  { p: 0.00, x: 0.00, y: -1.36, r: 1.32, e: 1.00, c: 1.00 },
  { p: 0.11, x: 0.08, y: -1.46, r: 1.08, e: 0.70, c: 0.68 },
  { p: 0.30, x: 0.16, y: -1.60, r: 0.98, e: 0.52, c: 0.52 },
  { p: 0.58, x: 0.16, y: -1.62, r: 0.98, e: 0.50, c: 0.48 },
  { p: 0.80, x: 0.08, y: -1.58, r: 0.95, e: 0.50, c: 0.48 },
  { p: 1.00, x: 0.00, y: -1.54, r: 0.97, e: 0.55, c: 0.62 },
];

export function stateAt(t) {
  const KEYS = innerWidth / innerHeight < 1.0 ? KEYS_PORT : KEYS_LAND;
  if (t <= KEYS[0].p) return { ...KEYS[0] };
  if (t >= KEYS[KEYS.length - 1].p) return { ...KEYS[KEYS.length - 1] };
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i], b = KEYS[i + 1];
    if (t >= a.p && t <= b.p) {
      const u = (t - a.p) / (b.p - a.p);
      const s = u * u * (3 - 2 * u);
      const mix = (k) => a[k] + (b[k] - a[k]) * s;
      return { x: mix('x'), y: mix('y'), r: mix('r'), e: mix('e'), c: mix('c') };
    }
  }
  return { ...KEYS[0] };
}


// ---- public init --------------------------------------------------------
export function initSun(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: false, powerPreference: 'high-performance',
    });
  } catch (err) {
    return null;
  }
  if (!renderer.getContext()) return null;

  const small = Math.min(innerWidth, innerHeight) < 620;
  const basePR = Math.min(devicePixelRatio || 1, small ? 1.3 : 1.6);
  renderer.setPixelRatio(basePR);
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x060606, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const flareRegion = diskXY(REGIONS[0]); // AR 4172, the βγδ troublemaker
  const uniforms = {
    uRes:       { value: new THREE.Vector2(innerWidth, innerHeight) },
    uTime:      { value: 0 },
    uSun:       { value: new THREE.Vector3(0, -1.34, 1.30) },
    uExposure:  { value: 0 },
    uCorona:    { value: 1 },
    uFlare:     { value: 0 },
    uFlareSpot: { value: new THREE.Vector2(flareRegion.x, flareRegion.y) },
    uPointer:   { value: new THREE.Vector2(0, 0) },
  };

  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: buildFrag(),
      uniforms,
      defines: { OCT: small ? 4 : 5 },
      depthTest: false, depthWrite: false,
    })
  );
  quad.frustumCulled = false;
  scene.add(quad);

  // --- solar wind particles ---
  const N = small ? 700 : 1400;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const angle = new Float32Array(N), r0 = new Float32Array(N),
        speed = new Float32Array(N), size = new Float32Array(N),
        seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    angle[i] = Math.random() * Math.PI * 2;
    r0[i] = Math.random();
    speed[i] = 0.5 + Math.random() * 1.4;
    size[i] = 1.0 + Math.random() * 2.2;
    seed[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAngle', new THREE.BufferAttribute(angle, 1));
  geo.setAttribute('aR0', new THREE.BufferAttribute(r0, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const windUniforms = {
    uRes: uniforms.uRes, uSun: uniforms.uSun, uTime: uniforms.uTime,
    uFlare: uniforms.uFlare,
    uWind: { value: 0 },
    uDpr: { value: renderer.getPixelRatio() },
    uFade: { value: 0 },
  };
  const wind = new THREE.Points(geo, new THREE.ShaderMaterial({
    vertexShader: WIND_VERT, fragmentShader: WIND_FRAG, uniforms: windUniforms,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  wind.frustumCulled = false;
  wind.visible = !REDUCED;
  scene.add(wind);

  // --- state ---
  const cur = { x: 0, y: -1.34, r: 1.3, e: 0, c: 1 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let bootT = 0, running = true, rafId = 0;
  let frames = 0, slowAcc = 0, degraded = false;
  const clock = new THREE.Clock();

  addEventListener('pointermove', (ev) => {
    if (REDUCED) return;
    const minD = Math.min(innerWidth, innerHeight);
    pointer.tx = (ev.clientX - innerWidth / 2) / minD;
    pointer.ty = -(ev.clientY - innerHeight / 2) / minD;
  }, { passive: true });

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    uniforms.uRes.value.set(innerWidth, innerHeight);
    windUniforms.uDpr.value = renderer.getPixelRatio();
  });

  function frame() {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    uniforms.uTime.value += dt * (REDUCED ? 0.05 : 1);

    // boot exposure ramp (ignition)
    if (bootT < 1) {
      bootT = Math.min(1, bootT + dt / (REDUCED ? 0.01 : 1.7));
    }
    const boot = 1 - Math.pow(1 - bootT, 3);

    // scroll choreography
    const doc = document.documentElement;
    const span = Math.max(doc.scrollHeight - innerHeight, 1);
    const target = stateAt(Math.min(Math.max(scrollY / span, 0), 1));
    const k = REDUCED ? 1 : 1 - Math.exp(-dt * 3.4);
    cur.x += (target.x - cur.x) * k;
    cur.y += (target.y - cur.y) * k;
    cur.r += (target.r - cur.r) * k;
    cur.e += (target.e - cur.e) * k;
    cur.c += (target.c - cur.c) * k;

    // pointer drift
    const pk = 1 - Math.exp(-dt * 2.2);
    pointer.x += (pointer.tx - pointer.x) * pk;
    pointer.y += (pointer.ty - pointer.y) * pk;

    const aspect = innerWidth / innerHeight;
    const xSquash = Math.min(Math.max((aspect - 0.45) / 0.7, 0.55), 1);
    uniforms.uSun.value.set(
      cur.x * xSquash + pointer.x * 0.035,
      cur.y + pointer.y * 0.025,
      cur.r
    );
    uniforms.uPointer.value.set(pointer.x, pointer.y);
    uniforms.uExposure.value = boot * cur.e * (1 + uniforms.uFlare.value * 0.14);
    uniforms.uCorona.value = cur.c;
    uniforms.uFlare.value *= Math.exp(-dt * 1.55);
    if (uniforms.uFlare.value < 0.002) uniforms.uFlare.value = 0;
    // wind phase accumulates so flare pulses accelerate the stream smoothly
    // (multiplying uTime by a changing speed would teleport every particle)
    windUniforms.uWind.value += dt * (0.030 + uniforms.uFlare.value * 0.055);
    windUniforms.uFade.value = boot * Math.min(cur.c + 0.15, 1);

    renderer.render(scene, camera);

    // one-shot adaptive quality: if early frames are slow, drop resolution
    if (!degraded && frames < 140) {
      frames++;
      if (frames > 40) slowAcc += dt;
      if (frames === 140 && slowAcc / 100 > 0.030) {
        degraded = true;
        renderer.setPixelRatio(Math.max(basePR * 0.7, 0.85));
        renderer.setSize(innerWidth, innerHeight);
        windUniforms.uDpr.value = renderer.getPixelRatio();
      }
    }
  }

  // pause when the tab is hidden OR the canvas leaves the viewport
  // (fixed full-screen today, but the guard survives layout changes)
  let onscreen = true, dead = false;
  function syncRunning() {
    const should = onscreen && !document.hidden && !dead;
    if (should === running) return;
    running = should;
    if (running) { clock.start(); frame(); }
    else { cancelAnimationFrame(rafId); clock.stop(); }
  }
  document.addEventListener('visibilitychange', syncRunning);
  new IntersectionObserver((entries) => {
    onscreen = entries[entries.length - 1].isIntersecting;
    syncRunning();
  }).observe(canvas);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    dead = true; running = false;
    cancelAnimationFrame(rafId);
    document.documentElement.classList.add('no-webgl');
  });

  frame();

  return {
    flare() {
      if (REDUCED) return;
      uniforms.uFlare.value = 1;
    },
  };
}
