// OCHRE — seeded PRNG + periodic value noise

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smooth(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

// 2D value noise, periodic with integer period `per` (lattice cells)
export class Noise2D {
  constructor(seed = 1, per = 256) {
    this.per = per;
    const rng = mulberry32(seed);
    this.tab = new Float32Array(per * per);
    for (let i = 0; i < this.tab.length; i++) this.tab[i] = rng();
  }
  // `per` = wrap period in lattice cells (≤ table size); pass the octave's own
  // period to keep every octave seamless across a tile edge.
  at(x, y, per = this.per) {
    const P = this.per;
    const p = Math.min(per, P);
    let ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    ix = ((ix % p) + p) % p; iy = ((iy % p) + p) % p;
    const ix1 = (ix + 1) % p, iy1 = (iy + 1) % p;
    const t = this.tab;
    const a = t[iy * P + ix], b = t[iy * P + ix1];
    const c = t[iy1 * P + ix], d = t[iy1 * P + ix1];
    const u = smooth(fx), v = smooth(fy);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // fbm over unit coords in [0,1): basePer lattice cells at octave 0,
  // doubling each octave — periodic across the unit square at every octave.
  fbmTile(ux, uy, oct = 4, basePer = 6, gain = 0.5) {
    let sum = 0, amp = 1, tot = 0;
    for (let o = 0; o < oct; o++) {
      const per = basePer << o;
      sum += this.at(ux * per, uy * per, per) * amp;
      tot += amp; amp *= gain;
    }
    return sum / tot;
  }
  // plain non-periodic fbm (macro shading in doc space)
  fbm(x, y, oct = 4, lac = 2, gain = 0.5) {
    let sum = 0, amp = 1, tot = 0, fx = x, fy = y;
    for (let o = 0; o < oct; o++) {
      sum += this.at(fx, fy) * amp;
      tot += amp; amp *= gain; fx *= lac; fy *= lac;
    }
    return sum / tot;
  }
}

// 1D smoothed time-noise for flame flicker
export class Flicker {
  constructor(seed = 7) {
    const rng = mulberry32(seed);
    this.tab = new Float32Array(512);
    for (let i = 0; i < 512; i++) this.tab[i] = rng();
  }
  at(t) {
    const i = Math.floor(t), f = t - i;
    const a = this.tab[((i % 512) + 512) % 512];
    const b = this.tab[(((i + 1) % 512) + 512) % 512];
    return a + (b - a) * smooth(f);
  }
  // layered octaves: broad breathing + fast crackle
  flame(t) {
    return 0.62 * this.at(t * 1.7) + 0.26 * this.at(t * 6.3 + 97) + 0.12 * this.at(t * 17.1 + 211);
  }
}
