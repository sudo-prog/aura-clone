/* Procedural silver-gelatin scene generator.
   Everything the lab "photographed" is synthesized here — value-noise fBm,
   seeded, monochrome. Used by the contact sheet and the darkroom print. */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeNoise(seed) {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) { p[i] = i; vals[i] = rand(); }
  for (let i = 255; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const X = xi & 255, Y = yi & 255;
    const aa = vals[perm[perm[X] + Y & 255]];
    const ba = vals[perm[perm[X + 1 & 255] + Y & 255]];
    const ab = vals[perm[perm[X] + (Y + 1) & 255]];
    const bb = vals[perm[perm[X + 1 & 255] + (Y + 1) & 255]];
    return (aa * (1 - u) + ba * u) * (1 - v) + (ab * (1 - u) + bb * u) * v;
  }

  function fbm(x, y, oct = 5, lac = 2, gain = 0.5) {
    let a = 0.5, f = 1, s = 0, n = 0;
    for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); n += a; a *= gain; f *= lac; }
    return s / n;
  }

  return { vnoise, fbm, rand };
}

const sstep = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

/* Returns Float32Array of luminance 0..1 (w*h). */
export function renderLum(w, h, opts = {}) {
  const { type = 'headland', seed = 1, exposure = 1, contrast = 1.15, grain = 0.05 } = opts;
  const N = makeNoise(seed);
  const R = mulberry32(seed ^ 0x9E3779B9);
  const lum = new Float32Array(w * h);
  const off = N.rand() * 40;

  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      let L = 0.5;

      if (type === 'headland') {
        const hy = 0.55;
        if (ny < hy) {
          L = 0.52 + 0.34 * (ny / hy) + (N.fbm(nx * 2.8 + off, ny * 7.5, 5) - 0.5) * 0.42 * (1 - ny / hy * 0.4);
        } else {
          const d = (ny - hy) / (1 - hy);
          L = 0.46 - 0.26 * d + (N.fbm(nx * 4 + off, ny * 55, 4) - 0.5) * 0.16;
          const sunx = 0.38;
          L += Math.exp(-((nx - sunx) * (nx - sunx)) / 0.006) * 0.26 * (1 - d * 0.55);
        }
        const ridge = hy - 0.30 * sstep(0.56, 0.98, nx) - (N.fbm(nx * 5.5 + off, 3.3, 4) - 0.5) * 0.10;
        if (nx > 0.5 && ny > ridge) {
          L = 0.09 + N.fbm(nx * 8 + off, ny * 8, 4) * 0.10;
        }
      } else if (type === 'pier') {
        const hy = 0.5;
        if (ny < hy) {
          L = 0.55 + 0.3 * (ny / hy) + (N.fbm(nx * 3.2 + off, ny * 9, 5) - 0.5) * 0.3;
        } else {
          const d = (ny - hy) / (1 - hy);
          L = 0.52 - 0.3 * d + (N.fbm(nx * 5 + off, ny * 70, 3) - 0.5) * 0.1;
        }
        const posts = [0.16, 0.29, 0.43, 0.58, 0.74];
        for (let i = 0; i < posts.length; i++) {
          const pw = 0.011 + i * 0.004;
          const top = hy - 0.16 - i * 0.028;
          if (Math.abs(nx - posts[i]) < pw && ny > top && ny < hy + 0.32 + i * 0.05) L = 0.07 + N.fbm(nx * 30, ny * 30, 2) * 0.06;
          if (Math.abs(nx - posts[i]) < pw * 0.8 && ny > hy + 0.32 + i * 0.05) L *= 0.55; /* reflection */
        }
      } else if (type === 'dunes') {
        const r1 = 0.34 + 0.14 * Math.sin(nx * 2.6 + off) + (N.fbm(nx * 3 + off, 7.7, 3) - 0.5) * 0.1;
        const r2 = 0.63 + 0.12 * Math.sin(nx * 3.4 + off + 2) + (N.fbm(nx * 2.5 + off, 1.2, 3) - 0.5) * 0.12;
        if (ny < r1)       L = 0.80 + (N.fbm(nx * 3 + off, ny * 4, 3) - 0.5) * 0.10;
        else if (ny < r2)  L = 0.52 + (ny - r1) * 0.3 + (N.fbm(nx * 9 + off, ny * 6, 4) - 0.5) * 0.14 - sstep(r1, r1 + 0.03, ny) * 0.18 + 0.18;
        else               L = 0.24 + (N.fbm(nx * 12 + off, ny * 9, 4) - 0.5) * 0.12 - sstep(r2, r2 + 0.025, ny) * 0.10;
      } else if (type === 'clouds') {
        L = 0.30 + N.fbm(nx * 2.4 + off, ny * 2.9, 6) * 0.62;
        L += (N.fbm(nx * 8 + off, ny * 9, 3) - 0.5) * 0.12;
      } else { /* fog — the fogged frame */
        L = 0.80 + (N.fbm(nx * 3 + off, ny * 3, 4) - 0.5) * 0.09 + (ny < 0.2 ? 0.06 : 0);
      }

      /* exposure, contrast, vignette, grain */
      L = clamp01(L) * exposure;
      L = (L - 0.5) * contrast + 0.5;
      const dx = nx - 0.5, dy = ny - 0.5;
      L *= 1 - 0.34 * (dx * dx + dy * dy) * 2.2;
      L += (R() - 0.5) * grain * 2;
      lum[y * w + x] = clamp01(L);
    }
  }
  return lum;
}

/* Draw a scene as a neutral positive onto a canvas (contact-sheet thumbs). */
export function drawScene(canvas, opts) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  const lum = renderLum(w, h, opts);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0, j = 0; i < lum.length; i++, j += 4) {
    const v = lum[i] * 255;
    d[j] = v; d[j + 1] = v * 0.985; d[j + 2] = v * 0.955; d[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
