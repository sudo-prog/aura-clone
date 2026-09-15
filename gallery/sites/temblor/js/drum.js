/* TEMBLOR — helicorder drum. A real simulation: compressed drum time,
   UTC line stamps, synthesized microseism, calibration pulse, event feed. */

const INK    = '#181510';
const COBALT = '#1D53C4';
const SWRED  = '#C3271E';
const AMBER  = '#E8A020';
const TAN    = '#D6CCB1';
const PARCH  = '#E9E2CD';
const PAPER  = '#F4F0E3';

const LINE_SEC   = 60;      // wall seconds per drum line
const DRUM_RATIO = 15;      // drum time compression (15 min of drum time per line)
const LINES      = 8;       // visible lines
const MARGIN_L   = 78;      // stamp margin
const MARGIN_R   = 14;
const STEP_PX    = 0.62;    // sampling step along x

function phi(){ return Math.random() * Math.PI * 2; }

export class Drum {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.eventSource = opts.eventSource || null;   // fn(tWall) -> {v, phase} | null
    this.reduced = opts.reduced || false;
    this.onRms = opts.onRms || null;

    this.t = 0;                 // wall-clock seconds of drum operation
    this.lastNow = null;
    this.lines = [];            // {stamp, pts:[{t,y,ph}]}  t relative to line start
    this.lineStart = 0;         // drum-op time at which current line started
    this.running = true;
    this.visible = true;

    // ambient synth state
    this.ph = [phi(), phi(), phi(), phi(), phi()];
    this.rmsAcc = 0; this.rmsN = 0;

    // history: the drum has been writing for 7 lines before you arrived
    const BACK_LINES = 7;
    this.backT = BACK_LINES * LINE_SEC + LINE_SEC * 0.38;
    this.calT = this.backT + 1.4;               // calibration pulse fires on the live line
    this.microNext = 20 + Math.random() * 30;
    this.micro = null;                          // {t0, amp, f, dur}
    // two larger regional events buried in the history
    this.histEvents = [
      { t0: this.backT - LINE_SEC * 2.6 - 11, amp: 30, f: 3.1, dur: 11 },
      { t0: this.backT - LINE_SEC * 5.2 - 27, amp: 14, f: 4.4, dur: 7 },
    ];

    // drum clock: line stamps in real UTC, quantized to 15 min, minus history
    const now = new Date();
    const q = new Date(Math.floor(now.getTime() / 900000) * 900000 - BACK_LINES * 900000);
    this.stampBase = q;
    this.stampIndex = 0;

    this._newLine();

    this.off = document.createElement('canvas'); // settled lines cache
    this.offCtx = this.off.getContext('2d');
    this.offDirty = true;

    this._resize();
    this._backfill();

    // boot choreography: the pen re-draws its 7 lines of memory in a fast sweep
    this.booting = !this.reduced && this.lines.some(l => l.pts.length > 4);
    this.bootT0 = null;
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(canvas);

    this._io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; },
      { rootMargin: '80px' });
    this._io.observe(canvas);

    this.lastDraw = 0;
    this._raf = this._raf.bind(this);
    requestAnimationFrame(this._raf);
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    if (r.width < 10) return;
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.dpr = dpr;
    this.innerW = this.w - MARGIN_L - MARGIN_R;
    this.lineH = this.h / LINES;
    this.penSpeed = this.innerW / LINE_SEC;      // px per wall second
    this.off.width = this.canvas.width;
    this.off.height = this.canvas.height;
    this.offDirty = true;
  }

  _newLine() {
    const stamp = new Date(this.stampBase.getTime() + this.stampIndex * 900000);
    this.stampIndex++;
    this.lines.push({ stamp, pts: [] });
    if (this.lines.length > LINES) { this.lines.shift(); this.offDirty = true; }
    this.lineStart = this.t;
  }

  /* the needle never sleeps: write the past 7 lines before first paint */
  _backfill() {
    if (!this.penSpeed) return;
    const stepT = STEP_PX / this.penSpeed;
    while (this.t < this.backT) {
      this.t += stepT;
      const rel = this.t - this.lineStart;
      if (rel >= LINE_SEC) { this._wrap(); continue; }
      const { v, ph } = this._sample(this.t);
      this.lines[this.lines.length - 1].pts.push({ t: rel, y: v, ph });
    }
    this.offDirty = true;
  }

  /* ---------- signal synthesis (wall time, px units) ---------- */

  _ambient(t) {
    // slow-breathing ocean microseism + faint cultural hash
    const env = 2.1 + 1.1 * Math.sin(2 * Math.PI * t / 47 + this.ph[3])
                    + 0.7 * Math.sin(2 * Math.PI * t / 113 + this.ph[4]);
    let v = Math.sin(2 * Math.PI * 0.85 * t + this.ph[0])
          + 0.62 * Math.sin(2 * Math.PI * 1.45 * t + this.ph[1])
          + 0.38 * Math.sin(2 * Math.PI * 2.6 * t + this.ph[2]);
    v *= env * 0.62;
    v += 0.8 * Math.sin(2 * Math.PI * 6.3 * t) * Math.max(0, Math.sin(2 * Math.PI * t / 31)) * 0.5;
    return v;
  }

  _calibration(t) {
    // square calibration pulse as the live line begins: two cycles, ±9 px
    const t0 = this.calT, per = 0.9, n = 2;
    if (t < t0 || t > t0 + per * n) return 0;
    const ph = ((t - t0) % per) / per;
    return ph < 0.5 ? 9 : -9;
  }

  _historic(t) {
    let v = 0;
    for (const h of this.histEvents) {
      const te = t - h.t0;
      if (te < 0 || te > h.dur) continue;
      const env = (1 - Math.exp(-te / 0.3)) * Math.exp(-te / (h.dur * 0.24));
      v += h.amp * env * (Math.sin(2 * Math.PI * h.f * te)
           + 0.4 * Math.sin(2 * Math.PI * h.f * 1.9 * te + 1.1));
    }
    return v;
  }

  _microEvent(t) {
    if (this.micro && t > this.micro.t0 + this.micro.dur) this.micro = null;
    if (!this.micro && t >= this.microNext) {
      this.micro = { t0: t, amp: 5 + Math.random() * 9, f: 4.2 + Math.random() * 2.4, dur: 4 };
      this.microNext = t + 40 + Math.random() * 100;
    }
    if (!this.micro) return 0;
    const te = t - this.micro.t0;
    if (te < 0) return 0;
    const env = (1 - Math.exp(-te / 0.25)) * Math.exp(-te / 1.1);
    return this.micro.amp * env * Math.sin(2 * Math.PI * this.micro.f * te + this.ph[0]);
  }

  _sample(t) {
    let v = this._ambient(t) + this._calibration(t) + this._microEvent(t) + this._historic(t);
    let ph = null;
    if (this.eventSource) {
      const ev = this.eventSource(t);
      if (ev) { v += ev.v; ph = ev.phase; }
    }
    // pen clipping: swings into neighbour lines, then hard-stops
    const lim = this.lineH * 1.35;
    if (v > lim) v = lim; if (v < -lim) v = -lim;
    return { v, ph };
  }

  /* ---------- time stepping ---------- */

  _advance(now) {
    if (this.lastNow == null) this.lastNow = now;
    let dt = (now - this.lastNow) / 1000;
    this.lastNow = now;
    if (dt <= 0) return;
    if (dt > 2.5) {
      // telemetry gap: jump drum-op time, leave a visible break in the trace
      this.t += dt;
      while (this.t - this.lineStart >= LINE_SEC) this._wrap();
      const line = this.lines[this.lines.length - 1];
      line.pts.push({ t: this.t - this.lineStart, y: 0, ph: 'gap' });
      return;
    }
    const stepT = STEP_PX / this.penSpeed;
    let target = this.t + dt;
    while (this.t < target) {
      this.t = Math.min(this.t + stepT, target);
      const rel = this.t - this.lineStart;
      if (rel >= LINE_SEC) { this._wrap(); continue; }
      const { v, ph } = this._sample(this.t);
      this.lines[this.lines.length - 1].pts.push({ t: rel, y: v, ph });
      this.rmsAcc += v * v; this.rmsN++;
    }
  }

  _wrap() {
    this.offDirty = true;
    this.lineStart += LINE_SEC;
    const stamp = new Date(this.stampBase.getTime() + this.stampIndex * 900000);
    this.stampIndex++;
    this.lines.push({ stamp, pts: [] });
    if (this.lines.length > LINES) this.lines.shift();
  }

  /* ---------- painting ---------- */

  _paintPaper(ctx) {
    const { w, h } = this;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    // margin
    ctx.fillStyle = PARCH;
    ctx.fillRect(0, 0, MARGIN_L - 10, h);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(MARGIN_L - 10, 0); ctx.lineTo(MARGIN_L - 10, h); ctx.stroke();

    // vertical minute ticks (drum minutes -> every 4 wall-seconds)
    const minutePx = this.penSpeed * (LINE_SEC / 15); // one drum-minute
    ctx.lineWidth = 1;
    for (let m = 0; m <= 15; m++) {
      const x = MARGIN_L + m * minutePx;
      if (x > w - MARGIN_R + 1) break;
      ctx.strokeStyle = (m % 5 === 0) ? 'rgba(24,21,16,.28)' : 'rgba(214,204,177,.75)';
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    // faint line separators
    ctx.strokeStyle = 'rgba(214,204,177,.6)';
    for (let i = 1; i < LINES; i++) {
      const y = i * this.lineH;
      ctx.beginPath(); ctx.moveTo(MARGIN_L - 10, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // paper specks
    if (!this._specks) {
      this._specks = [];
      for (let i = 0; i < 130; i++) {
        this._specks.push([Math.random(), Math.random(), Math.random() * 1.3 + 0.3]);
      }
    }
    ctx.fillStyle = 'rgba(24,21,16,.05)';
    for (const [sx, sy, sr] of this._specks) {
      ctx.fillRect(sx * w, sy * h, sr, sr);
    }
  }

  _strokeLine(ctx, line, idx, frac = 1) {
    const cy = idx * this.lineH + this.lineH / 2;
    const pts = line.pts;
    if (!pts.length) return;
    const upto = frac >= 1 ? pts.length : Math.max(0, Math.floor(pts.length * frac));
    if (!upto) return;
    // stamp
    ctx.font = '500 11px "IBM Plex Mono", monospace';
    ctx.fillStyle = 'rgba(24,21,16,.72)';
    ctx.textBaseline = 'middle';
    const hh = String(line.stamp.getUTCHours()).padStart(2, '0');
    const mm = String(line.stamp.getUTCMinutes()).padStart(2, '0');
    ctx.fillText(hh + ':' + mm, 12, cy);

    // group consecutive points by phase color
    let i = 0;
    while (i < upto) {
      const ph = pts[i].ph;
      if (ph === 'gap') { i++; continue; }
      let j = i;
      while (j < upto && pts[j].ph === ph) j++;
      ctx.strokeStyle = ph === 'p' ? COBALT : ph === 's' ? SWRED : INK;
      ctx.lineWidth = ph ? 1.35 : 1.15;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let k = i; k < j; k++) {
        const x = MARGIN_L + pts[k].t * this.penSpeed;
        const y = cy - pts[k].y;
        if (k === i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // bridge segments so the trace is continuous across color changes
      if (j < upto && pts[j].ph !== 'gap') {
        ctx.beginPath();
        ctx.moveTo(MARGIN_L + pts[j - 1].t * this.penSpeed, cy - pts[j - 1].y);
        ctx.lineTo(MARGIN_L + pts[j].t * this.penSpeed, cy - pts[j].y);
        ctx.stroke();
      }
      i = j;
    }
  }

  _paint(now) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.booting) {
      if (this.bootT0 == null) this.bootT0 = now || performance.now();
      const n = this.lines.length;
      const t01 = Math.min(1, ((now || performance.now()) - this.bootT0) / 1400);
      const e = n * (1 - Math.pow(1 - t01, 1.6));   // fast start, soft landing
      this._paintPaper(ctx);
      let penX = null, penY = null;
      for (let i = 0; i < n; i++) {
        const f = Math.max(0, Math.min(1, e - i));
        if (f <= 0) break;
        this._strokeLine(ctx, this.lines[i], i, f);
        if (f < 1) {
          const pts = this.lines[i].pts;
          const k = Math.max(0, Math.floor(pts.length * f) - 1);
          if (pts[k]) {
            penX = MARGIN_L + pts[k].t * this.penSpeed;
            penY = i * this.lineH + this.lineH / 2 - pts[k].y;
          }
        }
      }
      if (penX != null) {
        ctx.fillStyle = AMBER;
        ctx.beginPath(); ctx.arc(penX, penY, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(penX, penY, 2.6, 0, Math.PI * 2); ctx.stroke();
      }
      if (t01 >= 1) { this.booting = false; this.offDirty = true; }
      return;
    }

    if (this.offDirty) {
      const octx = this.offCtx;
      octx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this._paintPaper(octx);
      for (let i = 0; i < this.lines.length - 1; i++) this._strokeLine(octx, this.lines[i], i);
      this.offDirty = false;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.off, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const idx = this.lines.length - 1;
    this._strokeLine(ctx, this.lines[idx], idx);

    // pen head
    const line = this.lines[idx];
    if (line.pts.length) {
      const last = line.pts[line.pts.length - 1];
      const x = MARGIN_L + last.t * this.penSpeed;
      const cy = idx * this.lineH + this.lineH / 2;
      const y = cy - last.y;
      ctx.strokeStyle = 'rgba(232,160,32,.4)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, cy - this.lineH / 2 + 3); ctx.lineTo(x, cy + this.lineH / 2 - 3); ctx.stroke();
      ctx.fillStyle = AMBER;
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.stroke();
    }
  }

  _raf(now) {
    requestAnimationFrame(this._raf);
    // NB: lastNow is kept across hidden spans so the dt>2.5s branch in _advance
    // writes an honest telemetry gap into the record when the tab returns.
    if (document.hidden || !this.running) return;
    this._advance(now);
    if (!this.visible) return;
    const interval = this.reduced ? 1000 : 0;
    if (now - this.lastDraw < interval) return;
    this.lastDraw = now;
    this._paint(now);
    if (this.onRms && this.rmsN > 40) {
      this.onRms(Math.sqrt(this.rmsAcc / this.rmsN));
      this.rmsAcc = 0; this.rmsN = 0;
    }
  }

  now() { return this.t; }
  get lineHeight() { return this.lineH; }

  /* read the record under the cursor: returns drum-time string or null */
  readAt(px, py) {
    if (!this.lineH || px < MARGIN_L || px > this.w - MARGIN_R) return null;
    const li = Math.floor(py / this.lineH);
    const line = this.lines[li];
    if (!line) return null;
    const frac = (px - MARGIN_L) / this.innerW;      // 0..1 across 15 drum-min
    const ms = line.stamp.getTime() + frac * 900000;
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return `PEN AT ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC · DRUM TIME`;
  }
}
