/* Terrain model: sampling, gradients, maxima, river tracing, christening. */

import { makeField, mulberry32 } from "./noise.js";

export const ELEV_MIN = 420;   // metres at field value 0
export const ELEV_SPAN = 2540; // metres across field 0..1

const RANGE_A = ["Keld", "Hollen", "Vand", "Thren", "Gry", "Fenn", "Skal", "Bryn", "Mard", "Orre", "Quill", "Hars", "Dole", "Vint"];
const RANGE_B = ["mar", "firn", "holm", "gard", "dal", "vik", "spir", "tind", "ody", "mere", "fell", "brand"];
const RANGE_T = ["Range", "Massif", "Fells", "Spires", "Reach", "Heights"];
const RIVER_A = ["Meridue", "Talvane", "Osk", "Brenna", "Cauld", "Verel", "Skarn", "Lyre", "Duthie", "Marrow"];

export function christen(seed) {
  const r = mulberry32(seed ^ 0x9e3779b9);
  const name = RANGE_A[(r() * RANGE_A.length) | 0] + RANGE_B[(r() * RANGE_B.length) | 0];
  const kind = RANGE_T[(r() * RANGE_T.length) | 0];
  const river = RIVER_A[(r() * RIVER_A.length) | 0];
  const survey = 3000 + ((r() * 6000) | 0);
  return { range: `${name} ${kind}`.toUpperCase(), river: `R. ${river}`, survey };
}

export class Terrain {
  constructor(w, h, seed) {
    this.w = w; this.h = h;
    this.seed = seed;
    this.field = makeField(seed, w, h).field;
    this.a = this.field;
    this.b = null;
    this.mix = new Float32Array(w * h);
  }

  beginMorph(newSeed) {
    this.a = this.field;
    this.b = makeField(newSeed, this.w, this.h).field;
    this.seed = newSeed;
  }

  setMorph(t) {
    const { a, b, mix } = this;
    const k = 1 - t;
    for (let i = 0; i < mix.length; i++) mix[i] = a[i] * k + b[i] * t;
    this.field = mix;
  }

  endMorph() {
    this.field = this.b;
    this.a = this.b;
    this.b = null;
  }

  /* bilinear sample at fractional grid coords */
  sample(gx, gy) {
    const { w, h, field } = this;
    const x = Math.max(0, Math.min(w - 1.001, gx));
    const y = Math.max(0, Math.min(h - 1.001, gy));
    const x0 = x | 0, y0 = y | 0;
    const fx = x - x0, fy = y - y0;
    const i = y0 * w + x0;
    const v00 = field[i], v10 = field[i + 1];
    const v01 = field[i + w], v11 = field[i + w + 1];
    return (v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy;
  }

  /* central-difference gradient in field-units per cell.
     Wide stencil: ridged noise has cusped crests; a surveyor's clinometer
     reads the ground around the station, not the mathematical cusp. */
  gradient(gx, gy) {
    const e = 1.6;
    const dzdx = (this.sample(gx + e, gy) - this.sample(gx - e, gy)) / (2 * e);
    const dzdy = (this.sample(gx, gy + e) - this.sample(gx, gy - e)) / (2 * e);
    return [dzdx, dzdy];
  }

  elevation(gx, gy) { return ELEV_MIN + this.sample(gx, gy) * ELEV_SPAN; }

  /* slope in degrees given metres-per-cell */
  slopeDeg(gx, gy, cellM) {
    const [dx, dy] = this.gradient(gx, gy);
    const rise = Math.hypot(dx, dy) * ELEV_SPAN;
    return Math.atan2(rise, cellM) * 180 / Math.PI;
  }

  aspect(gx, gy) {
    const [dx, dy] = this.gradient(gx, gy);
    if (Math.hypot(dx, dy) < 0.004) return "—";
    // downhill direction; grid y grows southward
    const ang = Math.atan2(-(-dy), -dx); // math angle of downhill vector
    const deg = (90 - ang * 180 / Math.PI + 360) % 360; // compass bearing
    const pts = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return pts[Math.round(deg / 45) % 8];
  }

  /* local maxima above percentile, separated by minDist cells */
  summits(count = 3, minVal = 0.55, minDist = 22) {
    const { w, h, field } = this;
    const peaks = [];
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const v = field[y * w + x];
        if (v < minVal) continue;
        let isMax = true;
        for (let dy = -2; dy <= 2 && isMax; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            if (!dx && !dy) continue;
            if (field[(y + dy) * w + (x + dx)] > v) { isMax = false; break; }
          }
        if (isMax) peaks.push({ x, y, v });
      }
    }
    peaks.sort((p, q) => q.v - p.v);
    const kept = [];
    for (const p of peaks) {
      if (kept.every(k => Math.hypot(k.x - p.x, k.y - p.y) >= minDist)) kept.push(p);
      if (kept.length >= count) break;
    }
    return kept;
  }

  /* steepest-descent river trace; returns array of [gx, gy] or null */
  traceRiver(rand) {
    const { w, h } = this;
    let best = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      let gx = 6 + rand() * (w - 12);
      let gy = 6 + rand() * (h - 12);
      const start = this.sample(gx, gy);
      if (start < 0.3 || start > 0.6) continue;
      const pts = [[gx, gy]];
      for (let s = 0; s < 700; s++) {
        const [dx, dy] = this.gradient(gx, gy);
        const m = Math.hypot(dx, dy);
        if (m < 0.0012) break; // pooled in a hollow — a tarn
        gx -= (dx / m) * 0.55;
        gy -= (dy / m) * 0.55;
        if (gx < 1.5 || gy < 1.5 || gx > w - 2.5 || gy > h - 2.5) { pts.push([gx, gy]); break; }
        pts.push([gx, gy]);
      }
      if (!best || pts.length > best.length) best = pts;
    }
    if (!best || best.length < 40) return null;
    // decimate then smooth (Chaikin ×2)
    let path = best.filter((_, i) => i % 3 === 0);
    for (let it = 0; it < 2; it++) {
      const out = [path[0]];
      for (let i = 0; i < path.length - 1; i++) {
        const [ax, ay] = path[i], [bx, by] = path[i + 1];
        out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
        out.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
      }
      out.push(path[path.length - 1]);
      path = out;
    }
    return path;
  }
}
