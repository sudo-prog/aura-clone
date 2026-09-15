// Modal string simulation — y(x,t) = Σ aₙ sin(nπx/L) cos(ωₙt) e^(−t/τₙ)
// Real G–D–A–E frequencies divided by one shared visual scale, so the
// relative frequencies stay exactly correct: the E shivers 3.36× faster
// than the G, and blurs, just as in life.

export const VISUAL_SCALE = 96;

export const STRINGS = [
  { name: 'SOL', note: 'G₃', freq: 196.00, winding: 'argento su budello',  color: '#C4C0B4', glow: 'rgba(212,150,80,', thick: 2.7, tau: 6.0, t60: 4.2 },
  { name: 'RE',  note: 'D₄', freq: 293.66, winding: 'alluminio su budello', color: '#C6C1B2', glow: 'rgba(216,158,88,', thick: 2.2, tau: 5.2, t60: 3.6 },
  { name: 'LA',  note: 'A₄', freq: 440.00, winding: 'budello nudo',         color: '#D8C596', glow: 'rgba(224,170,96,', thick: 1.7, tau: 4.6, t60: 3.0 },
  { name: 'MI',  note: 'E₅', freq: 659.26, winding: 'acciaio dorato',       color: '#DEC26E', glow: 'rgba(232,196,110,', thick: 1.2, tau: 3.6, t60: 2.4 },
];

const TWO_PI = Math.PI * 2;

export class VString {
  constructor(spec, nModes = 14) {
    this.spec = spec;
    this.n = nModes;
    this.amp = new Float64Array(nModes);
    this.theta = new Float64Array(nModes);
    this.omega = new Float64Array(nModes);
    this.rate = new Float64Array(nModes);
    const fVis = spec.freq / VISUAL_SCALE;
    for (let k = 0; k < nModes; k++) {
      const m = k + 1;
      const fm = fVis * m;
      this.omega[k] = TWO_PI * fm;
      // higher modes die faster; extra damping above ~26 Hz visual to kill aliasing shimmer
      let r = Math.pow(m, 1.15) / spec.tau;
      if (fm > 26) r += (fm - 26) * 0.35;
      this.rate[k] = r;
    }
    this.drag = null;          // {p, h} while the finger holds the string
    this.energy = 0;
    this.mask = 0;             // 0 = all modes; m = only multiples of m (harmonic touch)
    this.touchP = -1;          // finger position for harmonic touch, -1 = none
  }

  // triangular pluck at position p (0..1), height h (px)
  pluck(p, h) {
    p = Math.min(0.97, Math.max(0.03, p));
    const P2 = Math.PI * Math.PI;
    for (let k = 0; k < this.n; k++) {
      const m = k + 1;
      let a = (2 * h * Math.sin(m * Math.PI * p)) / (m * m * P2 * p * (1 - p));
      if (this.mask && m % this.mask !== 0) a = 0;
      else if (this.mask) a *= 2.0; // harmonics are quiet — lift survivors into view
      this.amp[k] = a;
      this.theta[k] = 0;
    }
    this.drag = null;
    this._recalcEnergy();
  }

  // force a node: silence every mode without stillness at p = 1/m, 2/m, ...
  touch(m, p) {
    this.mask = m;
    this.touchP = p;
    for (let k = 0; k < this.n; k++) {
      const mm = k + 1;
      if (mm % m !== 0) this.amp[k] = 0;
      else this.amp[k] *= 2.0;
    }
    this._recalcEnergy();
  }

  release() { this.mask = 0; this.touchP = -1; }

  startDrag(p, h) {
    this.drag = { p: Math.min(0.97, Math.max(0.03, p)), h };
  }
  moveDrag(p, h) {
    if (this.drag) { this.drag.p = Math.min(0.97, Math.max(0.03, p)); this.drag.h = h; }
  }
  endDrag() {
    if (!this.drag) return;
    const { p, h } = this.drag;
    this.drag = null;
    if (Math.abs(h) > 0.8) this.pluck(p, h);
  }

  update(dt) {
    if (this.drag) {
      // the grabbing finger damps whatever was ringing
      for (let k = 0; k < this.n; k++) this.amp[k] *= Math.exp(-14 * dt);
    }
    let e = 0;
    for (let k = 0; k < this.n; k++) {
      this.theta[k] += this.omega[k] * dt;
      if (this.theta[k] > TWO_PI * 1000) this.theta[k] -= TWO_PI * 1000;
      this.amp[k] *= Math.exp(-this.rate[k] * dt);
      e += Math.abs(this.amp[k]);
    }
    this.energy = e;
    if (e < 0.02 && !this.drag) {
      for (let k = 0; k < this.n; k++) this.amp[k] = 0;
      this.energy = 0;
    }
  }

  // fill out[i] for i in 0..pts with displacement; sinTab[k][i] precomputed.
  // ghostDt shifts phase for motion-blur ghost passes.
  shape(out, sinTab, pts, ghostDt = 0) {
    out.fill(0);
    if (this.drag) {
      // static triangle under the finger
      const { p, h } = this.drag;
      for (let i = 0; i <= pts; i++) {
        const x = i / pts;
        out[i] = x < p ? (h * x) / p : (h * (1 - x)) / (1 - p);
      }
      return;
    }
    if (this.energy === 0) return;
    for (let k = 0; k < this.n; k++) {
      const a = this.amp[k];
      if (Math.abs(a) < 0.004) continue;
      const c = a * Math.cos(this.theta[k] + this.omega[k] * ghostDt);
      const row = sinTab[k];
      for (let i = 0; i <= pts; i++) out[i] += c * row[i];
    }
  }

  _recalcEnergy() {
    let e = 0;
    for (let k = 0; k < this.n; k++) e += Math.abs(this.amp[k]);
    this.energy = e;
  }
}

export function makeSinTable(nModes, pts) {
  const tab = [];
  for (let k = 0; k < nModes; k++) {
    const row = new Float64Array(pts + 1);
    const m = k + 1;
    for (let i = 0; i <= pts; i++) row[i] = Math.sin((m * Math.PI * i) / pts);
    tab.push(row);
  }
  return tab;
}

export const reducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
