/* SHORTWAVE — synthesized spectrum: waterfall, panoramic scope, dial ruler. */

import { BAND, mulberry32 } from './stations.js';

/* phosphor colormap LUT */
function buildLUT() {
  const stops = [
    [0.0, 1, 6, 3],
    [0.28, 5, 38, 19],
    [0.52, 15, 102, 52],
    [0.72, 58, 205, 112],
    [0.88, 132, 255, 178],
    [1.0, 226, 255, 238],
  ];
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    let a = stops[0], b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (v >= stops[s][0] && v <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const f = (v - a[0]) / Math.max(1e-6, b[0] - a[0]);
    lut[i * 3] = a[1] + (b[1] - a[1]) * f;
    lut[i * 3 + 1] = a[2] + (b[2] - a[2]) * f;
    lut[i * 3 + 2] = a[3] + (b[3] - a[3]) * f;
  }
  return lut;
}

export class Waterfall {
  constructor(fallCanvas, scopeCanvas, rulerCanvas, stations, reducedMotion) {
    this.fall = fallCanvas;
    this.scope = scopeCanvas;
    this.ruler = rulerCanvas;
    this.stations = stations;
    this.rm = reducedMotion;
    this.lut = buildLUT();
    this.acc = 0;
    this.rowHz = reducedMotion ? 8 : 30;
    this.crash = 0;
    this.time = 0;
    this.spectrum = null;
    this.rowImg = null;

    /* per-station modulation phase + morse keying pattern */
    const rnd = mulberry32(991);
    this.stMod = stations.map(s => ({
      phase: rnd() * Math.PI * 2,
      qsb: 0.35 + rnd() * 0.4,
      key: this._keyPattern(s, rnd),
    }));

    /* two faint unidentified drifters */
    this.drifters = [
      { base: 6120, swing: 46, rate: 0.043, amp: 0.1 },
      { base: 7180, swing: 64, rate: 0.031, amp: 0.08 },
    ];
  }

  _keyPattern(s, rnd) {
    if (s.kind === 'morse') {
      /* pseudo-morse on/off pattern, 55 ms steps */
      const p = [];
      while (p.length < 600) {
        const dah = rnd() < 0.4;
        const on = dah ? 3 : 1;
        for (let i = 0; i < on; i++) p.push(1);
        p.push(0);
        if (rnd() < 0.24) { p.push(0, 0); }
        if (rnd() < 0.1) { for (let i = 0; i < 10; i++) p.push(0); }
      }
      return p;
    }
    return null;
  }

  resize() {
    /* chunky 2× pixels on the waterfall — dot-matrix cohesion */
    const fw = this.fall.clientWidth, fh = this.fall.clientHeight;
    if (fw === 0 || fh === 0) return;
    this.fall.width = Math.max(160, Math.floor(fw / 2));
    this.fall.height = Math.max(90, Math.floor(fh / 2));
    this.fctx = this.fall.getContext('2d', { willReadFrequently: false });
    this.fctx.fillStyle = '#010603';
    this.fctx.fillRect(0, 0, this.fall.width, this.fall.height);
    this.rowImg = this.fctx.createImageData(this.fall.width, 1);
    this.spectrum = new Float32Array(this.fall.width);

    /* prefill: the receiver was already on before you arrived */
    for (let r = 0; r < this.fall.height; r++) {
      this.time += 1 / 30;
      this._synth(this.lastTune ?? 6630);
      this._pushRow();
    }

    const dpr = Math.min(devicePixelRatio || 1, 2);
    const sw = this.scope.clientWidth, sh = this.scope.clientHeight;
    this.scope.width = Math.floor(sw * dpr);
    this.scope.height = Math.floor(sh * dpr);
    this.sctx = this.scope.getContext('2d');
    this.sctx.fillStyle = '#030a06';
    this.sctx.fillRect(0, 0, this.scope.width, this.scope.height);

    const rw = this.ruler.clientWidth, rh = this.ruler.clientHeight;
    this.ruler.width = Math.floor(rw * dpr);
    this.ruler.height = Math.floor(rh * dpr);
    this.rdpr = dpr;
    this.drawRuler();
  }

  drawRuler() {
    const ctx = this.ruler.getContext('2d');
    const w = this.ruler.width, h = this.ruler.height, dpr = this.rdpr;
    const cssW = this.ruler.clientWidth;
    const narrow = cssW < 560;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0805';
    ctx.fillRect(0, 0, w, h);
    const span = BAND.max - BAND.min;
    const x = f => ((f - BAND.min) / span) * w;

    /* ticks */
    const minorStep = narrow ? 20 : 10;
    for (let f = BAND.min; f <= BAND.max; f += minorStep) {
      const major = f % 100 === 0;
      const mid = !major && f % 50 === 0;
      ctx.strokeStyle = major ? 'rgba(240,166,60,.75)' : mid ? 'rgba(240,166,60,.38)' : 'rgba(240,166,60,.16)';
      ctx.lineWidth = major ? 1.5 * dpr : 1 * dpr;
      const len = major ? 11 * dpr : mid ? 7 * dpr : 4 * dpr;
      ctx.beginPath();
      const px = Math.round(x(f)) + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, len);
      ctx.stroke();
    }

    /* MHz labels */
    ctx.fillStyle = 'rgba(240,166,60,.85)';
    ctx.font = `${10 * dpr}px "DotGothic16", monospace`;
    ctx.textAlign = 'center';
    const labelStep = narrow ? 400 : 200;
    for (let f = 5900; f < BAND.max; f += labelStep) {
      ctx.fillText((f / 1000).toFixed(1), x(f), 21 * dpr);
    }

    /* station markers */
    for (const s of this.stations) {
      const px = x(s.freq);
      ctx.fillStyle = 'rgba(240,166,60,.95)';
      ctx.beginPath();
      ctx.moveTo(px, h - 9 * dpr);
      ctx.lineTo(px + 3.5 * dpr, h - 5 * dpr);
      ctx.lineTo(px, h - 1 * dpr);
      ctx.lineTo(px - 3.5 * dpr, h - 5 * dpr);
      ctx.closePath();
      ctx.fill();
      if (!narrow) {
        ctx.fillStyle = 'rgba(240,166,60,.9)';
        ctx.font = `600 ${8.5 * dpr}px "IBM Plex Mono", monospace`;
        const align = s.freq > BAND.max - 90 ? 'right' : s.freq < BAND.min + 90 ? 'left' : 'center';
        ctx.textAlign = align;
        ctx.fillText(s.id, px + (align === 'right' ? -6 * dpr : align === 'left' ? 6 * dpr : 0), h - 12 * dpr);
      }
    }
  }

  /* synthesize one spectrum row into this.spectrum (0..1) */
  _synth(tuneKhz) {
    const n = this.spectrum.length;
    const t = this.time;
    const span = BAND.max - BAND.min;
    const kPerBin = span / n;

    /* lightning crash events */
    this.crash *= 0.8;
    if (Math.random() < 0.007) this.crash = 0.45 + Math.random() * 0.5;

    for (let i = 0; i < n; i++) {
      const f = BAND.min + i * kPerBin;
      /* shaped noise floor with drifting ionospheric bands */
      let v = 0.14
        + 0.05 * Math.sin(i * 0.045 + t * 0.6)
        + 0.045 * Math.sin(i * 0.012 - t * 0.23 + 3.1)
        + 0.035 * Math.sin(i * 0.09 + t * 1.15 + 1.7)
        + Math.random() * 0.16;
      v += this.crash * Math.random() * Math.random() * 0.9;

      /* drifting unidentified carriers */
      for (const d of this.drifters) {
        const df = f - (d.base + d.swing * Math.sin(t * d.rate));
        v += d.amp * Math.exp(-(df * df) / (2 * 2.4 * 2.4));
      }
      this.spectrum[i] = v;
    }

    /* station carriers — bloom as the needle approaches */
    for (let s = 0; s < this.stations.length; s++) {
      const st = this.stations[s];
      const m = this.stMod[s];
      let amp = st.power * (0.78 + m.qsb * 0.3 * Math.sin(t * 0.5 + m.phase));

      /* keying */
      if (m.key) {
        const idx = Math.floor(t / 0.055) % m.key.length;
        amp *= m.key[idx] ? 1 : 0.06;
      } else if (st.kind === 'buzzer') {
        amp *= (t % 1.25) < 0.9 ? 1 : 0.12;
      }

      const dTune = st.freq - tuneKhz;
      const bloom = 1 + 1.9 * Math.exp(-(dTune * dTune) / (2 * 30 * 30));
      const sigma = st.width / kPerBin;
      const c = (st.freq - BAND.min) / kPerBin;
      const reach = Math.ceil(sigma * 5);
      const i0 = Math.max(0, Math.floor(c - reach));
      const i1 = Math.min(this.spectrum.length - 1, Math.ceil(c + reach));
      for (let i = i0; i <= i1; i++) {
        const d = i - c;
        /* carrier core */
        let sVal = amp * bloom * Math.exp(-(d * d) / (2 * sigma * sigma * 0.35));
        /* modulation sidebands, rougher */
        if (st.kind !== 'morse') {
          sVal += amp * bloom * 0.38 * Math.random() * Math.exp(-(d * d) / (2 * sigma * sigma * 2.6));
        }
        this.spectrum[i] += sVal;
      }
    }
  }

  frame(dt, tuneKhz, visible) {
    if (!this.spectrum) return;
    this.lastTune = tuneKhz;
    this.time += dt;
    if (!visible) return;
    this.acc += dt;
    const step = 1 / this.rowHz;
    let rows = 0;
    while (this.acc >= step && rows < 4) {
      this.acc -= step;
      rows++;
      this._synth(tuneKhz);
      this._pushRow();
    }
    if (rows > 0) this._drawScope();
  }

  _pushRow() {
    const ctx = this.fctx;
    const w = this.fall.width, h = this.fall.height;
    ctx.drawImage(this.fall, 0, 0, w, h - 1, 0, 1, w, h - 1);
    const px = this.rowImg.data;
    const lut = this.lut;
    for (let i = 0; i < w; i++) {
      let v = this.spectrum[i];
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      const idx = (v * 255) | 0;
      px[i * 4] = lut[idx * 3];
      px[i * 4 + 1] = lut[idx * 3 + 1];
      px[i * 4 + 2] = lut[idx * 3 + 2];
      px[i * 4 + 3] = 255;
    }
    ctx.putImageData(this.rowImg, 0, 0);
  }

  _drawScope() {
    const ctx = this.sctx;
    const w = this.scope.width, h = this.scope.height;
    ctx.fillStyle = 'rgba(3,10,6,0.3)';
    ctx.fillRect(0, 0, w, h);
    const n = this.spectrum.length;

    /* dim under-glow pass then bright trace */
    for (const pass of [[3.2, 'rgba(84,247,140,0.16)'], [1.3, 'rgba(140,255,190,0.95)']]) {
      ctx.lineWidth = pass[0];
      ctx.strokeStyle = pass[1];
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        let v = this.spectrum[i];
        v = v < 0 ? 0 : v > 1 ? 1 : v;
        const x = (i / (n - 1)) * w;
        const y = h - 3 - v * (h - 8);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}
