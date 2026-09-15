/* LIDO SOLARE — the water.
   Raw WebGL: sunlit pool surface, procedural caustics, refracted tile
   floor, bobbing lane ropes, and a swimmer's shadow that crosses a lane
   every so often. No libraries. */
(function () {
  'use strict';

  var canvas = document.getElementById('water');
  var hero = document.getElementById('hero');
  if (!canvas || !hero) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' })
        || canvas.getContext('experimental-webgl');
  if (!gl) { hero.classList.add('no-webgl'); return; }

  var VERT = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform float uFade;',
    'uniform vec4 uSwim;', // x, y (uv), direction sign, alpha
    'uniform vec4 uRip[8];', // x, y (uv), age (s), amplitude

    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',

    /* --- surface height field: five directional swells --- */
    'float waveH(vec2 p, float t){',
    '  float h = 0.0;',
    '  h += 0.32 * sin(dot(p, vec2( 1.0, 0.6)) * 2.1 + t * 0.90);',
    '  h += 0.24 * sin(dot(p, vec2(-0.7, 1.1)) * 2.7 - t * 1.15);',
    '  h += 0.18 * sin(dot(p, vec2( 0.9,-1.3)) * 3.4 + t * 0.70);',
    '  h += 0.12 * sin(dot(p, vec2(-1.4,-0.4)) * 4.6 - t * 1.50);',
    '  h += 0.08 * sin(dot(p, vec2( 0.3, 1.7)) * 6.3 + t * 1.90);',
    '  return h;',
    '}',

    'vec2 waveN(vec2 p, float t){',
    '  float e = 0.05;',
    '  float hx = waveH(p + vec2(e, 0.0), t) - waveH(p - vec2(e, 0.0), t);',
    '  float hy = waveH(p + vec2(0.0, e), t) - waveH(p - vec2(0.0, e), t);',
    '  return vec2(hx, hy) / (2.0 * e);',
    '}',

    /* --- folded-interference caustics --- */
    'float caustic(vec2 uv, float t){',
    '  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;',
    '  vec2 i = p;',
    '  float c = 1.0;',
    '  float inten = 0.005;',
    '  for (int n = 0; n < 5; n++){',
    '    float tt = t * (1.0 - (3.5 / float(n + 1)));',
    '    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));',
    '    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));',
    '  }',
    '  c /= 5.0;',
    '  c = 1.17 - pow(c, 1.4);',
    '  return pow(abs(c), 8.0);',
    '}',

    'void main(){',
    '  vec2 uv = vUv;',
    '  float aspect = uRes.x / uRes.y;',
    '  vec2 uvA = vec2(uv.x * aspect, uv.y);',
    '  float t = uTime;',

    /* surface normal + refraction of the line of sight */
    '  vec2 wp = uvA * 5.0;',
    '  vec2 n = waveN(wp, t);',

    /* --- touch ripples: damped capillary rings --- */
    '  for (int i = 0; i < 8; i++) {',
    '    float age = uRip[i].z;',
    '    float amp = uRip[i].w;',
    '    if (amp > 0.001 && age < 2.6) {',
    '      vec2 dv = uvA - vec2(uRip[i].x * aspect, uRip[i].y);',
    '      float dist = length(dv) + 1e-4;',
    '      float band = dist - (0.02 + age * 0.24);',
    '      float env = exp(-band * band * 520.0) * exp(-age * 2.1) * amp;',
    '      n += (dv / dist) * sin(band * 150.0 - age * 8.0) * env * 2.4;',
    '    }',
    '  }',
    '  float depth = mix(0.55, 1.0, uv.y);',                 // deeper toward the top
    '  vec2 refr = n * mix(0.014, 0.030, depth);',

    /* --- submerged tile floor --- */
    '  float TILE = 21.0;',
    '  vec2 fp = (uvA + refr) * TILE;',
    '  vec2 tileId = floor(fp);',
    '  vec2 tf = fract(fp);',
    '  float tint = hash(tileId);',

    '  vec3 tileCol = vec3(0.87, 0.95, 0.94) + (tint - 0.5) * 0.07;',

    /* dark cobalt lane stripes painted on the floor (lane centers) */
    '  float laneY = fract(uv.y * 4.0 + refr.y * 1.6);',
    '  float stripe = 1.0 - smoothstep(0.036, 0.052, abs(laneY - 0.5));',
    '  tileCol = mix(tileCol, vec3(0.14, 0.28, 0.55), stripe * 0.78);',

    /* grout lines */
    '  vec2 g2 = abs(tf - 0.5);',
    '  float grout = smoothstep(0.435, 0.475, max(g2.x, g2.y));',
    '  tileCol = mix(tileCol, vec3(0.42, 0.72, 0.75), grout * 0.85);',

    /* --- water absorption (the chlorine blue) --- */
    '  vec3 shallow = vec3(0.36, 0.83, 0.88);',
    '  vec3 deep    = vec3(0.10, 0.56, 0.68);',
    '  vec3 waterTint = mix(shallow, deep, depth);',
    '  vec3 col = tileCol * waterTint * 1.25;',

    /* --- swimmer shadow gliding down a lane --- */
    '  float sAlpha = uSwim.w;',
    '  float shade = 0.0;',
    '  if (sAlpha > 0.001) {',
    '    vec2 sp = vec2(uSwim.x * aspect, uSwim.y);',
    '    float along = (uvA.x - sp.x) * uSwim.z;',
    '    float dy = uvA.y - sp.y;',
    '    dy += 0.008 * sin(t * 8.0 + along * 52.0) * smoothstep(0.006, -0.07, along);', // flutter kick behind
    '    float wid = 0.030 + 0.011 * smoothstep(0.0, 0.055, along);',                   // shoulders wider than feet
    '    float body = exp(-pow(along / 0.105, 2.0) - pow(dy / wid, 2.0));',
    /* arms: two soft blobs sweeping at the shoulders */
    '    float armPh = sin(t * 4.2);',
    '    float arm1 = exp(-pow((along - 0.038) / 0.024, 2.0) - pow((dy - 0.030 * armPh) / 0.014, 2.0));',
    '    float arm2 = exp(-pow((along - 0.038) / 0.024, 2.0) - pow((dy + 0.030 * armPh) / 0.014, 2.0));',
    '    shade = clamp(body + 0.6 * arm1 + 0.6 * arm2, 0.0, 1.0) * sAlpha;',
    '    col *= 1.0 - 0.50 * shade;',
    '  }',

    /* --- caustics: two octaves, killed inside the shadow --- */
    '  vec2 cuv = (uvA + refr * 1.6);',
    '  float c1 = caustic(cuv * 0.9 + vec2(0.0, t * 0.012), t * 0.55);',
    '  float c2 = caustic(cuv * 1.9 + vec2(3.1, 7.7), t * 0.75);',
    '  float ca = c1 * 0.85 + c2 * 0.45;',
    '  ca *= (1.0 - 0.92 * shade);',
    '  col += ca * vec3(0.95, 1.0, 0.98) * 0.60 * uFade;',

    /* --- lane ropes: bobbing red/white floats --- */
    '  for (int k = 1; k <= 3; k++) {',
    '    float ry = float(k) * 0.25;',
    '    float bob = waveH(vec2(uvA.x * 3.0, ry * 5.0), t) * 0.006;',
    '    float yy = uv.y - (ry + bob);',
    /* soft shadow of the rope on the floor, offset by the sun */
    '    float ropeShadow = exp(-pow((yy - 0.018) / 0.012, 2.0));',
    '    col *= 1.0 - 0.13 * ropeShadow;',
    /* the floats themselves: little shaded cylinders */
    '    float r = 0.0075;',
    '    float d = abs(yy) / r;',
    '    if (d < 1.0) {',
    '      float seg = floor(uvA.x * 26.0 + float(k) * 0.5);',
    '      float segF = fract(uvA.x * 26.0 + float(k) * 0.5);',
    '      float isRed = step(0.5, mod(seg, 6.0) < 1.0 ? 1.0 : 0.0);',
    '      vec3 floatCol = mix(vec3(0.97, 0.96, 0.92), vec3(0.89, 0.22, 0.17), isRed);',
    '      float shading = sqrt(max(1.0 - d * d, 0.0));',
    '      float gap = smoothstep(0.0, 0.08, segF) * smoothstep(1.0, 0.92, segF);',      // bead gaps
    '      vec3 rope = floatCol * (0.55 + 0.45 * shading);',
    '      col = mix(col, rope, smoothstep(1.0, 0.82, d) * (0.35 + 0.65 * gap));',
    '    }',
    '  }',

    /* --- sun glints on the surface --- */
    '  vec3 n3 = normalize(vec3(-n.x, -n.y, 1.0));',
    '  vec3 sun = normalize(vec3(0.35, 0.5, 0.78));',
    '  float spec = pow(max(dot(n3, sun), 0.0), 140.0);',
    '  col += spec * vec3(1.0, 0.98, 0.9) * 0.9 * uFade;',

    /* --- darker well toward the title corner (bottom-left) --- */
    '  float well = 1.0 - smoothstep(0.15, 1.15, length((uv - vec2(0.02, 0.0)) * vec2(1.0, 1.45)));',
    '  col *= 1.0 - 0.46 * well;',

    /* intro ramp: sun comes off a cloud */
    '  col *= mix(0.72, 1.0, uFade);',

    /* grain */
    '  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.022;',

    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s) || 'shader compile failed');
    }
    return s;
  }

  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed');
  } catch (e) {
    hero.classList.add('no-webgl');
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, 'uRes');
  var uTime = gl.getUniformLocation(prog, 'uTime');
  var uFade = gl.getUniformLocation(prog, 'uFade');
  var uSwim = gl.getUniformLocation(prog, 'uSwim');
  var uRip = gl.getUniformLocation(prog, 'uRip');

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var isNarrow = window.innerWidth < 720;
  if (isNarrow) DPR = Math.min(DPR, 1.5); // keep phones cool

  function resize() {
    var w = Math.round(canvas.clientWidth * DPR);
    var h = Math.round(canvas.clientHeight * DPR);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  /* ---- swimmer scheduling: a crossing every 20 s ---- */
  var LANES = [0.125, 0.375, 0.625, 0.875];
  var PERIOD = 20;
  var SWIM_TIME = 12;

  function swimmerState(t) {
    var cycle = Math.floor(t / PERIOD);
    var local = t - cycle * PERIOD - (PERIOD - SWIM_TIME); // swim happens at end of cycle
    if (local < 0) return [0, 0, 1, 0];
    var p = local / SWIM_TIME;
    var seed = Math.sin(cycle * 127.1) * 43758.5453;
    seed = seed - Math.floor(seed);
    var lane = LANES[Math.floor(seed * 4) % 4];
    var dir = (cycle % 2 === 0) ? 1 : -1;
    var x = dir > 0 ? (-0.12 + p * 1.24) : (1.12 - p * 1.24);
    var alpha = Math.min(1, Math.min(p / 0.12, (1 - p) / 0.12));
    return [x, lane, dir, Math.max(0, alpha)];
  }

  var start = performance.now();
  var running = false;
  var visible = true;
  var onscreen = true;
  var rafId = 0;

  /* ---- touch ripples: you can put your hand in the water ---- */
  var RIPN = 8;
  var ripples = [];
  var ripData = new Float32Array(RIPN * 4);

  function spawnRipple(x, y, amp) {
    var t0 = (performance.now() - start) / 1000;
    if (ripples.length >= RIPN) ripples.shift();
    ripples.push({ x: x, y: y, t0: t0, amp: amp });
  }

  function uploadRipples(t) {
    ripples = ripples.filter(function (r) { return t - r.t0 < 2.6; });
    for (var i = 0; i < RIPN; i++) {
      var r = ripples[i];
      ripData[i * 4] = r ? r.x : 0;
      ripData[i * 4 + 1] = r ? r.y : 0;
      ripData[i * 4 + 2] = r ? (t - r.t0) : 9;
      ripData[i * 4 + 3] = r ? r.amp : 0;
    }
    gl.uniform4fv(uRip, ripData);
  }

  function frame(now) {
    rafId = 0;
    var t = (now - start) / 1000;
    resize();
    var fade = Math.min(1, t / 1.8);
    fade = 1 - Math.pow(1 - fade, 3); // ease-out cubic
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t * 0.7 + 12.0);
    gl.uniform1f(uFade, fade);
    var sw = swimmerState(t + 8.8); // first crossing is mid-pool a few seconds in
    gl.uniform4f(uSwim, sw[0], sw[1], sw[2], sw[3]);
    uploadRipples(t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (running) rafId = requestAnimationFrame(frame);
  }

  function setRunning(v) {
    v = v && visible && onscreen && !reduceMotion;
    if (v === running) return;
    running = v;
    if (running && !rafId) rafId = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', function () {
    visible = document.visibilityState === 'visible';
    setRunning(true);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onscreen = entries[0].isIntersecting;
      setRunning(true);
    }, { threshold: 0.01 }).observe(canvas);
  }

  function drawStill() {
    // one beautiful still frame, fully sunlit, swimmer mid-lane
    resize();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, 21.4);
    gl.uniform1f(uFade, 1.0);
    gl.uniform4f(uSwim, 0.45, 0.375, 1, 0.8);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  window.addEventListener('resize', function () {
    if (reduceMotion) { drawStill(); return; }
    resize();
  });

  /* pointer → water. Trails leave small rings; a tap/press lands a big one. */
  if (!reduceMotion) {
    var lastRipT = 0, lastRx = -1, lastRy = -1;

    function toUv(e) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / Math.max(1, rect.width),
        y: 1 - (e.clientY - rect.top) / Math.max(1, rect.height)
      };
    }

    hero.addEventListener('pointermove', function (e) {
      if (!running) return;
      var now = performance.now();
      if (now - lastRipT < 110) return;
      var p = toUv(e);
      var dx = p.x - lastRx, dy = p.y - lastRy;
      if (dx * dx + dy * dy < 0.0006) return;
      spawnRipple(p.x, p.y, 0.55);
      lastRipT = now; lastRx = p.x; lastRy = p.y;
    }, { passive: true });

    hero.addEventListener('pointerdown', function (e) {
      if (!running) return;
      var p = toUv(e);
      spawnRipple(p.x, p.y, 1.5);
      lastRipT = performance.now(); lastRx = p.x; lastRy = p.y;
    }, { passive: true });
  }

  if (reduceMotion) {
    drawStill();
  } else {
    setRunning(true);
  }
})();
