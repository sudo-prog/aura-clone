// AFTER HOURS — the room: two spotlight cones + perlin smoke, hand-rolled.
// Renders on a small buffer (~1/8 scale) and upscales — soft by construction.

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- Perlin gradient noise (seeded, classic) ----
const PERM = new Uint8Array(512);
(() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = 1962;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

const GRAD = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071],
];

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

function perlin(x, y) {
  const X = Math.floor(x), Y = Math.floor(y);
  const xf = x - X, yf = y - Y;
  const xi = X & 255, yi = Y & 255;
  const g00 = GRAD[PERM[PERM[xi] + yi] & 7];
  const g10 = GRAD[PERM[PERM[xi + 1] + yi] & 7];
  const g01 = GRAD[PERM[PERM[xi] + yi + 1] & 7];
  const g11 = GRAD[PERM[PERM[xi + 1] + yi + 1] & 7];
  const d00 = g00[0] * xf + g00[1] * yf;
  const d10 = g10[0] * (xf - 1) + g10[1] * yf;
  const d01 = g01[0] * xf + g01[1] * (yf - 1);
  const d11 = g11[0] * (xf - 1) + g11[1] * (yf - 1);
  const u = fade(xf), v = fade(yf);
  return d00 + u * (d10 - d00) + v * (d01 - d00) + u * v * (d11 - d10 - d01 + d00);
}

function fbm(x, y) {
  return perlin(x, y) * 0.62 + perlin(x * 2.03, y * 2.03) * 0.26 + perlin(x * 4.01, y * 4.01) * 0.12;
}

// ---- canvas machinery ----
const cv = document.getElementById('room');
const ctx = cv.getContext('2d', { alpha: false });
const small = document.createElement('canvas');
const sctx = small.getContext('2d');

let W = 0, H = 0, sw = 0, sh = 0;
let img = null, mask = null, warm = null, pool = null;

const WARM = [212, 168, 96];
const COOL = [118, 138, 162];

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function cone(x, y, ax, ay, slope, sw_) {
  const dy = y - ay;
  if (dy <= 0) return 0;
  const half = dy * slope + sw_;
  const rel = Math.abs(x - ax) / half;
  if (rel >= 1) return 0;
  const edge = smoothstep(1, 0.45, rel);
  const vert = 0.42 + 0.58 * Math.exp(-dy / (sh * 0.62));
  return edge * vert;
}

function resize() {
  W = cv.clientWidth || innerWidth;
  H = cv.clientHeight || innerHeight;
  cv.width = W;
  cv.height = H;
  sw = Math.max(96, Math.min(220, Math.round(W / 8)));
  sh = Math.max(64, Math.min(160, Math.round(H / 8)));
  small.width = sw;
  small.height = sh;
  img = sctx.createImageData(sw, sh);
  mask = new Float32Array(sw * sh);
  warm = new Float32Array(sw * sh);
  pool = new Float32Array(sw * sh);

  const wide = innerWidth > 880;
  // cone A — warm, over the stage (left on desktop, center-left on mobile)
  const ax = (wide ? 0.22 : 0.5) * sw, ay = -0.22 * sh, aslope = wide ? 0.46 : 0.62;
  // cone B — cooler, over the reading column
  const bx = (wide ? 0.75 : 0.88) * sw, by = -0.3 * sh, bslope = 0.3;

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = y * sw + x;
      const a = cone(x, y, ax, ay, aslope, sw * 0.02);
      const b = cone(x, y, bx, by, bslope, sw * 0.015) * 0.55;
      mask[i] = Math.min(1, a + b);
      warm[i] = a / (a + b + 1e-4);
      // pooled light on the floor beneath cone A
      const fdx = (x - ax) / (sw * 0.2), fdy = (y - sh * 0.97) / (sh * 0.16);
      pool[i] = Math.exp(-(fdx * fdx + fdy * fdy)) * 0.5;
    }
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low';
}

const T0 = performance.now();
let lastFrame = 0;
let running = false;
let rafId = 0;

// dust motes drifting through the light
const MOTES = [];
for (let i = 0; i < 46; i++) {
  MOTES.push({
    x: Math.random(), y: Math.random(),
    r: 0.6 + Math.random() * 1.1,
    s: 0.006 + Math.random() * 0.012,   // rise speed (fraction of height/s)
    p: Math.random() * 100,             // sway phase
    tw: 0.4 + Math.random() * 0.6,      // twinkle depth
  });
}

// the room leans in when the needle lands
let duck = 0;
addEventListener('needlelanded', () => { duck = 1; });

function drawMotes(t, g) {
  for (const m of MOTES) {
    const my = (m.y - t * m.s) % 1;
    const y = my < 0 ? my + 1 : my;
    const x = (m.x + 0.012 * perlin(m.p, t * 0.14)) % 1;
    const sx = Math.min(sw - 1, Math.max(0, Math.round(x * sw)));
    const sy = Math.min(sh - 1, Math.max(0, Math.round(y * sh)));
    const light = mask[sy * sw + sx];
    if (light < 0.05) continue;
    const twinkle = 0.55 + 0.45 * Math.sin(t * (1.1 + m.tw) + m.p);
    const a = light * twinkle * m.tw * 0.34 * g;
    if (a < 0.01) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#F2E0B8';
    ctx.beginPath();
    ctx.arc(x * W, y * H, m.r, 0, 6.2832);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function paint(now) {
  const t = (now - T0) / 1000;
  const gain = REDUCED ? 1 : smoothstep(0, 1, Math.min(1, (t - 0.15) / 1.7));
  const flick = 0.965 + 0.035 * (0.5 + 0.5 * perlin(t * 1.7, 3.3));
  if (duck > 0) duck = Math.max(0, duck - 0.016);
  const g = gain * flick * (1 - 0.22 * smoothstep(0, 1, duck));
  const d = img.data;
  const rise = t * 0.055, wind = t * 0.021;

  let i4 = 0;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = y * sw + x;
      const m = mask[i];
      let v;
      if (m > 0.004) {
        let n = 0.5 + 0.5 * fbm(x * 0.055 - wind * sw * 0.06, y * 0.055 + rise * sh * 0.055);
        n *= 0.55 + 0.45 * (0.5 + 0.5 * perlin(x * 0.013 + t * 0.05, y * 0.013 + t * 0.11));
        v = n * n * (0.06 + 0.94 * m) * g;
      } else {
        v = 0;
      }
      const w = warm[i];
      const pr = pool[i] * g;
      d[i4] = Math.min(255, 20 + (WARM[0] * w + COOL[0] * (1 - w)) * v + 64 * pr);
      d[i4 + 1] = Math.min(255, 14 + (WARM[1] * w + COOL[1] * (1 - w)) * v + 46 * pr);
      d[i4 + 2] = Math.min(255, 9 + (WARM[2] * w + COOL[2] * (1 - w)) * v + 22 * pr);
      d[i4 + 3] = 255;
      i4 += 4;
    }
  }
  sctx.putImageData(img, 0, 0);
  ctx.drawImage(small, 0, 0, W, H);
  drawMotes(t, g);
}

function loop(now) {
  if (!running) return;
  rafId = requestAnimationFrame(loop);
  if (now - lastFrame < 33) return; // ~30fps is plenty for smoke
  lastFrame = now;
  paint(now);
}

function start() {
  if (running || REDUCED) return;
  running = true;
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  cancelAnimationFrame(rafId);
}

addEventListener('resize', () => {
  resize();
  if (REDUCED) paint(T0 + 7000);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
  else start();
});

resize();
if (REDUCED) {
  paint(T0 + 7000); // one still frame: the room holds its breath
} else {
  start();
}
