// NORDLYS — living aurora sky
// Fullscreen GLSL scene: fbm curtain aurora (green core, magenta fringe),
// long-exposure star field with polar trails, three parallax ridgelines.
// Pointer movement drifts aurora intensity and shifts the ridges.

import * as THREE from 'three';

const canvas = document.getElementById('sky-canvas');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function failToFallback() {
  document.documentElement.classList.add('no-webgl');
}

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
  });
} catch (e) {
  renderer = null;
}

if (!renderer || !renderer.getContext()) {
  failToFallback();
} else {
  boot(renderer);
}

function boot(renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uBoost: { value: 0 },
    uFade: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uRes;
      uniform vec2 uPointer;
      uniform float uBoost;
      uniform float uFade;
      varying vec2 vUv;

      float hash21(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
        for (int i = 0; i < 5; i++) {
          v += a * vnoise(p);
          p = r * p * 2.02;
          a *= 0.5;
        }
        return v;
      }

      // sharp-crested mountain profile
      float ridgeH(float x, float seed) {
        float h = 0.0;
        float a = 0.5;
        float f = 1.0;
        for (int i = 0; i < 4; i++) {
          float n = vnoise(vec2(x * f + seed * 13.7, seed + f * 4.7));
          h += a * (1.0 - abs(2.0 * n - 1.0));
          f *= 2.13;
          a *= 0.45;
        }
        return h;
      }

      // pinpoint stars with slow twinkle
      float stars(vec2 p, float density, float t, float radius) {
        vec2 g = p * density;
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        float rn = hash21(id);
        float keep = step(0.78, rn);
        if (keep < 0.5) return 0.0;
        vec2 off = vec2(hash21(id + 7.7), hash21(id + 3.3)) - 0.5;
        float d = length(f - off * 0.8);
        float m = smoothstep(radius, 0.0, d);
        float tw = 0.55 + 0.45 * sin(t * (0.35 + rn) + rn * 43.0);
        return m * m * tw * (0.25 + 0.75 * fract(rn * 57.0));
      }

      // long-exposure trails: sparse, faint arcs around a pole near top-centre
      float trails(vec2 p, float t) {
        vec2 pole = vec2(-0.05, 1.04);
        vec2 q = p - pole;
        float r = length(q);
        float a = atan(q.y, q.x);
        vec2 g = vec2(r * 64.0, a * 26.0);
        vec2 id = floor(g);
        vec2 f = fract(g);
        float h = hash21(id + 19.3);
        float keep = step(0.965, h);
        if (keep < 0.5) return 0.0;
        float lineR = abs(f.x - (0.25 + 0.5 * hash21(id + 11.0)));
        float thick = smoothstep(0.07, 0.0, lineR);
        float len = 0.45 + 0.5 * hash21(id + 2.7);
        float capped = smoothstep(0.02, 0.3, f.y) * smoothstep(len, len * 0.55, f.y);
        return thick * capped * (0.09 + 0.2 * hash21(id + 5.0));
      }

      // one faint meteor every ~19 s — the reward for waiting
      float meteor(vec2 p, float t) {
        float period = 19.0;
        float id = floor(t / period);
        float ft = t - id * period;
        float life = 1.15;
        if (ft > life) return 0.0;
        float rn = hash21(vec2(id * 0.913, 4.7));
        float prog = ft / life;
        vec2 a = vec2((hash21(vec2(id, 7.3)) - 0.5) * 1.7,
                      0.70 + 0.24 * hash21(vec2(id, 9.1)));
        float ang = -2.35 - 0.75 * rn;
        vec2 dir = vec2(cos(ang), sin(ang));
        float len = 0.16 + 0.14 * hash21(vec2(id, 3.3));
        vec2 head = a + dir * prog * len * 2.2;
        vec2 tail = head - dir * len * min(prog * 2.0, 1.0);
        vec2 pa = p - tail;
        vec2 ba = head - tail;
        float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
        float d = length(pa - ba * h);
        float core = smoothstep(0.0038, 0.0, d) * (0.25 + 0.75 * h * h);
        float fade = sin(min(prog * 3.14159, 3.14159));
        return core * fade * 0.85;
      }

      vec3 aurora(vec2 p, float t) {
        vec3 acc = vec3(0.0);
        vec3 green = vec3(0.22, 0.93, 0.60);
        vec3 teal = vec3(0.13, 0.62, 0.60);
        vec3 mag = vec3(0.87, 0.36, 0.80);
        for (int i = 0; i < 2; i++) {
          float fi = float(i);
          float seed = fi * 17.31 + 3.7;
          float x = p.x * (1.18 - fi * 0.26) + fi * 1.7;
          float warp = fbm(vec2(x * 1.35 + seed, t * 0.055 + seed)) * 0.85;
          float xw = x + warp;
          float base = 0.30 + fi * 0.17
                     + 0.085 * sin(xw * 1.25 + t * 0.05 + seed)
                     + 0.055 * sin(xw * 2.6 - t * 0.038);
          float extent = 0.38 + 0.17 * vnoise(vec2(xw * 0.8, seed));
          float v = (p.y - base) / extent;
          if (v > -0.15 && v < 1.7) {
            float rays = fbm(vec2(xw * 3.2 - t * 0.11, t * 0.075 + seed));
            rays = pow(max(rays * 1.55 - 0.36, 0.0), 1.45);
            float fold = fbm(vec2(xw * 6.5 + t * 0.09, seed * 2.0)) * 0.3;
            float profile = smoothstep(-0.08, 0.2, v + fold) * exp(-2.05 * max(v, 0.0));
            float inten = rays * profile;
            vec3 col = mix(green, teal, clamp(v * 0.85, 0.0, 1.0));
            col = mix(col, mag, smoothstep(0.42, 1.05, v + fold * 0.6));
            acc += col * inten * (1.0 - fi * 0.3);
          }
        }
        return acc * 1.3;
      }

      void main() {
        vec2 uv = vUv;
        float aspect = uRes.x / uRes.y;
        vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
        float t = uTime;
        vec2 par = uPointer * 0.014;

        // --- polar-night sky ---
        vec3 top = vec3(0.010, 0.028, 0.070);
        vec3 mid = vec3(0.043, 0.086, 0.149);
        vec3 hor = vec3(0.082, 0.152, 0.230);
        vec3 col = mix(mid, top, smoothstep(0.28, 1.0, uv.y));
        col = mix(hor, col, smoothstep(0.04, 0.45, uv.y));

        // --- star field, faint parallax ---
        // the whole field revolves slowly about the celestial pole:
        // the long exposure is still being taken
        vec2 sp = p - par * 1.6;
        vec2 pole = vec2(-0.05, 1.04);
        float rotA = t * 0.0021;
        float ca = cos(rotA);
        float sa = sin(rotA);
        sp = mat2(ca, -sa, sa, ca) * (sp - pole) + pole;
        float horizonFade = smoothstep(0.12, 0.34, uv.y);
        float st = stars(sp, 34.0, t, 0.085) * 0.9
                 + stars(sp * 1.63 + 3.1, 52.0, t * 1.3, 0.11) * 0.45;
        float tr = trails(sp, t);
        col += vec3(0.78, 0.86, 1.0) * st * horizonFade;
        col += vec3(0.62, 0.72, 0.95) * tr * horizonFade * 0.9;
        col += vec3(0.80, 0.92, 1.0) * meteor(p, t) * horizonFade;

        // --- aurora: breathing intensity + pointer drift ---
        float breathe = 0.68 + 0.32 * sin(t * 0.062 + fbm(vec2(t * 0.031, 2.7)) * 2.2);
        vec3 au = aurora(vec2(p.x - par.x * 5.0, uv.y), t);
        au *= breathe * (1.0 + uBoost * 0.55);
        // soft-clamp so the green core never blows to white
        au = au / (1.0 + 0.55 * au);
        col += au;

        // faint airglow of the aurora on the horizon haze
        float glow = (au.g + au.r) * 0.5;
        col += vec3(0.05, 0.16, 0.12) * glow * (1.0 - horizonFade);

        // --- parallax ridgelines, back to front ---
        float aa = 2.0 / uRes.y;

        float bx = p.x * 1.15 + par.x * 0.5 + 3.0;
        float bh = 0.205 + 0.115 * ridgeH(bx * 1.35, 5.0) - par.y * 0.004;
        float bm = 1.0 - smoothstep(bh - aa, bh + aa, uv.y);
        float rim = smoothstep(0.016, 0.0, abs(uv.y - bh)) * breathe;
        col = mix(col, vec3(0.040, 0.082, 0.145), bm);
        col += vec3(0.10, 0.34, 0.24) * rim * 0.35;

        float mx = p.x * 1.5 - par.x * 1.6 + 11.0;
        float mh = 0.148 + 0.095 * ridgeH(mx * 1.2, 9.0) - par.y * 0.008;
        float mm = 1.0 - smoothstep(mh - aa, mh + aa, uv.y);
        col = mix(col, vec3(0.026, 0.055, 0.101), mm);

        float fx = p.x * 1.9 - par.x * 3.4 + 27.0;
        float fh = 0.092 + 0.075 * ridgeH(fx * 1.1, 13.0) - par.y * 0.013;
        float fm = 1.0 - smoothstep(fh - aa, fh + aa, uv.y);
        col = mix(col, vec3(0.013, 0.028, 0.056), fm);

        // --- grain (kills banding, adds long-exposure texture) ---
        float gr = hash21(uv * uRes + fract(t) * 17.0) - 0.5;
        col += gr * 0.022;

        col = clamp(col, 0.0, 1.0);
        gl_FragColor = vec4(col * uFade, 1.0);
      }
    `,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  // --- sizing ---
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, w < 768 ? 1.5 : 1.6);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w * dpr, h * dpr);
    if (reduceMotion.matches) renderStill();
  }

  // --- pointer: parallax + activity-driven intensity drift ---
  const pointerTarget = new THREE.Vector2(0, 0);
  let boostTarget = 0.9; // opening surge: the sky greets you, then settles
  let lastX = null;
  let lastY = null;

  function onPointerMove(e) {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    pointerTarget.set(nx, ny);
    if (lastX !== null) {
      const d = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      boostTarget = Math.min(1, boostTarget + d * 0.006);
    }
    lastX = e.clientX;
    lastY = e.clientY;
  }

  // --- clock that survives pauses ---
  let elapsed = 0;
  let prev = performance.now();
  let rafId = null;
  let running = false;
  let inView = true; // the sky is fixed fullscreen, but the gate is kept honest

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min((now - prev) / 1000, 0.1);
    prev = now;
    elapsed += dt;

    uniforms.uTime.value = elapsed;
    uniforms.uFade.value = Math.min(1, elapsed / 1.6);
    uniforms.uPointer.value.lerp(pointerTarget, 0.028);
    boostTarget *= 0.988;
    uniforms.uBoost.value += (boostTarget - uniforms.uBoost.value) * 0.02;

    renderer.render(scene, camera);
  }

  function start() {
    if (running || reduceMotion.matches || document.hidden || !inView) return;
    running = true;
    prev = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function renderStill() {
    // a handsome frozen phase for prefers-reduced-motion
    uniforms.uTime.value = 41.3;
    uniforms.uFade.value = 1;
    uniforms.uPointer.value.set(0, 0);
    uniforms.uBoost.value = 0;
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', resize);
  resize();

  if (reduceMotion.matches) {
    renderStill();
  } else {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    start();
  }

  // the sky answers when you come to read the forecast —
  // entering the clearing surges the aurora (touch gets this too)
  const varsel = document.getElementById('varsel');
  if (varsel && 'IntersectionObserver' in window && !reduceMotion.matches) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) boostTarget = Math.max(boostTarget, 0.8);
        }
      },
      { threshold: 0.3 }
    );
    io.observe(varsel);
  }

  // pause the render loop if the canvas ever leaves the viewport
  if ('IntersectionObserver' in window) {
    const skyIO = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        inView = entry.isIntersecting;
        if (inView) start();
        else stop();
      }
    });
    skyIO.observe(canvas);
  }

  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) {
      stop();
      renderStill();
    } else {
      start();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  // context loss → designed fallback rather than a black hole
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
    failToFallback();
  });
}
