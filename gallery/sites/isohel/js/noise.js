/* Seeded RNG + 2D simplex noise + ridged fBm terrain fields. */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

export class Simplex {
  constructor(rand) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  noise2D(xin, yin) {
    const perm = this.perm;
    let n0 = 0, n1 = 0, n2 = 0;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      const g = GRAD[perm[ii + perm[jj]] & 7];
      n0 = t0 * t0 * (g[0] * x0 + g[1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      const g = GRAD[perm[ii + i1 + perm[jj + j1]] & 7];
      n1 = t1 * t1 * (g[0] * x1 + g[1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      const g = GRAD[perm[ii + 1 + perm[jj + 1]] & 7];
      n2 = t2 * t2 * (g[0] * x2 + g[1] * y2);
    }
    return 70 * (n0 + n1 + n2);
  }
}

/* Ridged fractal field, normalized 0..1, shaped so the range sits inside
   the plate (edges fall away) and one flank drains low (for the river). */
export function makeField(seed, w, h) {
  const rand = mulberry32(seed);
  const sx = new Simplex(rand);
  const warp = new Simplex(rand);
  const ox = rand() * 512, oy = rand() * 512;
  // which corner drains: 0 SW, 1 SE, 2 NW, 3 NE
  const drain = Math.floor(rand() * 4);
  const field = new Float32Array(w * h);
  const aspect = w / h;
  let min = Infinity, max = -Infinity;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1), v = y / (h - 1);
      let nx = u * 1.9 * aspect + ox, ny = v * 1.9 + oy;
      // gentle domain warp so ridgelines wander
      const wx = warp.noise2D(nx * 0.5, ny * 0.5) * 0.45;
      const wy = warp.noise2D(nx * 0.5 + 31.7, ny * 0.5 + 11.3) * 0.45;
      nx += wx; ny += wy;

      let amp = 1, freq = 1, sum = 0, norm = 0, ridgeW = 1;
      for (let o = 0; o < 5; o++) {
        const n = sx.noise2D(nx * freq, ny * freq);
        const r = (1 - Math.abs(n));
        sum += r * r * amp * ridgeW;
        norm += amp;
        ridgeW = Math.min(1, r * 1.6); // higher octaves live on ridges
        amp *= 0.52; freq *= 2.03;
      }
      let e = sum / norm;

      // plate mask: fall away toward edges (superellipse)
      const dx = (u - 0.5) * 2, dy = (v - 0.5) * 2;
      const d = Math.pow(Math.abs(dx), 3) + Math.pow(Math.abs(dy), 3);
      const mask = Math.max(0, 1 - d * 0.72);
      e = e * (0.28 + 0.72 * mask);

      // drainage tilt toward one corner
      const du = drain & 1 ? u : 1 - u;
      const dv = drain & 2 ? 1 - v : v;
      e -= 0.14 * Math.pow(du * dv, 1.4);

      field[y * w + x] = e;
    }
  }
  /* min/max from the stored float32 values — tracking the float64
     intermediates can land below the rounded data and mint NaNs */
  for (let i = 0; i < field.length; i++) {
    if (field[i] < min) min = field[i];
    if (field[i] > max) max = field[i];
  }
  const span = max - min || 1;
  for (let i = 0; i < field.length; i++) {
    const t = Math.max(0, (field[i] - min) / span);
    field[i] = Math.pow(t, 1.3);
  }

  /* the pen rounds what the noise cusps: one 3×3 smoothing pass,
     then re-stretch to the full 0..1 span */
  const sm = new Float32Array(field.length);
  let m2 = Infinity, x2 = -Infinity;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum2 = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = Math.max(0, Math.min(h - 1, y + dy));
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.max(0, Math.min(w - 1, x + dx));
          sum2 += field[yy * w + xx];
        }
      }
      sm[y * w + x] = sum2 / 9;
    }
  }
  for (let i = 0; i < sm.length; i++) {
    if (sm[i] < m2) m2 = sm[i];
    if (sm[i] > x2) x2 = sm[i];
  }
  const span2 = x2 - m2 || 1;
  /* each survey has its own culminating height (2 500–2 960 m band):
     not every range earns the snow — no two impressions alike */
  const crest = 0.82 + rand() * 0.18;
  for (let i = 0; i < field.length; i++) {
    field[i] = Math.max(0, Math.min(1, (sm[i] - m2) / span2)) * crest;
  }

  return { field, drain, rand };
}
