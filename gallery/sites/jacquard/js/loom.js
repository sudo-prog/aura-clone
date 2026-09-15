/* loom.js — the live loom. Warp strings on load, then a shuttle carries the
   weft pick by pick, the reed beats each pick to the fell, and the finished
   cloth scrolls toward the cloth beam, rippling as if handled. All structure
   comes from the draft: threading × tie-up × treadling. */

import { warpUp, liftedShafts, warpStyles, weftStyleFor, threadStyle, drawWeaveRow, renderCloth } from './weave.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');

function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

export class HeroLoom {
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.draft = opts.draft;
    this.warpHex = opts.warpHex;
    this.weftHex = opts.weftHex;
    this.onPick = opts.onPick || (() => {});
    this.pick = 0;          // total picks woven — pattern row index
    this.sinceWarp = 0;     // picks since last warping (sprint decay)
    this.phase = 'warping';
    this.pt = 0;            // phase clock (s)
    this.t = 0;             // global clock (s)
    this.dir = 1;           // shuttle direction
    this.pointer = null;    // {y, t0}
    this.visible = false;
    this._raf = null;
    this._last = 0;

    this.resize();
    let rw = null;
    new ResizeObserver(() => {
      const w = canvas.parentElement.clientWidth;
      const h = canvas.parentElement.clientHeight;
      if (Math.abs(w - this._lastW) < 4 && Math.abs(h - this._lastH) < 4) return;
      clearTimeout(rw);
      rw = setTimeout(() => { this.resize(); this.reweave(); }, 120);
    }).observe(canvas.parentElement);

    new IntersectionObserver((es) => {
      this.visible = es[0].isIntersecting;
      this._tick();
    }, { threshold: 0.02 }).observe(canvas);
    document.addEventListener('visibilitychange', () => this._tick());
    REDUCED.addEventListener?.('change', () => { this.resize(); this.reweave(); });

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      const y = e.clientY - r.top;
      if (y > this.fellY) this.pointer = { y, t0: this.t };
    });
  }

  resize() {
    const c = this.canvas, host = c.parentElement;
    const W = host.clientWidth, H = host.clientHeight;
    this._lastW = W; this._lastH = H;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    c.style.width = W + 'px'; c.style.height = H + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dpr = dpr; this.W = W; this.H = H;

    const marginX = Math.max(26, W * 0.045);
    const weaveW = W - marginX * 2;
    this.pitch = clamp(Math.round(weaveW / 58), 8, 13);
    this.ends = Math.floor(weaveW / this.pitch);
    this.x0 = Math.round((W - this.ends * this.pitch) / 2);
    this.beamY = 16; this.beamH = 13;
    this.warpTop = this.beamY + this.beamH;
    this.fellY = Math.round(H * 0.42);
    this.insertY = this.fellY - this.pitch * 1.7;
    this.reedY = this.insertY - 20;
    // counterbalance harness: eight shaft bars hung between beam and reed
    const span = this.fellY - this.warpTop;
    this.harnessGap = clamp(Math.round(span * 0.055), 5, 9);
    this.harnessTop = this.warpTop + Math.round(span * 0.24);
    this.clothH = H - this.fellY;
    this.warp = warpStyles(this.warpHex, this.ends);

    const cw = this.ends * this.pitch, ch = this.clothH + this.pitch * 2;
    this.clothA = this._mkCloth(cw, ch);
    this.clothB = this._mkCloth(cw, ch);
    this.rows = 0; // committed rows currently in the buffer
  }

  _mkCloth(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * this.dpr); c.height = Math.round(h * this.dpr);
    const x = c.getContext('2d');
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    return { c, x, w, h };
  }

  /* Restart weaving after resize / rewarp: keep the pick count honest,
     prefill nothing — the loom sprints, then settles into rhythm. */
  reweave() {
    this.clothA.x.clearRect(0, 0, this.clothA.w, this.clothA.h);
    this.rows = 0;
    this.sinceWarp = 0;
    this.phase = 'warping'; this.pt = 0;
    this._report(); // the counter tells the truth the moment the loom is restrung
    if (this.reduced()) this._staticRender();
    else this._tick();
  }

  reduced() { return REDUCED.matches; }

  setStructure(draft) {
    this.draft = draft;
    this._report();
    if (this.reduced()) this._staticRender();
  }

  setColors(warpHex, weftHex, rewarp) {
    this.weftHex = weftHex;
    if (warpHex !== this.warpHex) {
      this.warpHex = warpHex;
      this.warp = warpStyles(warpHex, this.ends);
    }
    if (rewarp) this.reweave(); // a new cloth always begins with a fresh warp
    if (this.reduced()) this._staticRender();
  }

  start() {
    if (this.reduced()) { this._staticRender(); this._report(); return; }
    this._tick();
  }

  _running() { return this.visible && !document.hidden && !this.reduced(); }

  _tick() {
    if (this._raf) return;
    if (!this._running()) return;
    this._last = performance.now();
    const loop = (now) => {
      this._raf = null;
      if (!this._running()) return;
      const dt = Math.min((now - this._last) / 1000, 0.05);
      this._last = now;
      this._update(dt);
      this._draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  /* sprint: fresh warp weaves fast, then breathes */
  _speed() { return 1 + 6.5 * Math.exp(-this.sinceWarp / 13); }

  _durations() {
    const m = this._speed();
    return { shed: 0.24 / m, shuttle: 0.55 / m, beat: 0.14 / m, rest: 0.16 / m };
  }

  _update(dt) {
    this.t += dt;
    this.pt += dt;
    if (this.kick) this.kick = this.kick < 0.02 ? 0 : this.kick * Math.exp(-dt * 11);
    const d = this._durations();
    switch (this.phase) {
      case 'warping': {
        const dur = 0.9 + this.ends * 0.008;
        if (this.pt >= dur + 0.25) {
          this._weaveHeader(); // spread the warp, as a weaver does after tying on
          this.phase = 'shed'; this.pt = 0;
          this._report();
        }
        break;
      }
      case 'shed':
        if (this.pt >= d.shed) { this.phase = 'shuttle'; this.pt = 0; }
        break;
      case 'shuttle':
        if (this.pt >= d.shuttle) { this.phase = 'beat'; this.pt = 0; }
        break;
      case 'beat':
        if (this.pt >= d.beat) {
          this._commit();
          this.phase = 'rest'; this.pt = 0;
        }
        break;
      case 'rest':
        if (this.pt >= d.rest) {
          this.dir *= -1;
          this.phase = 'shed'; this.pt = 0;
        }
        break;
    }
  }

  _ups(pick) {
    const u = new Array(this.ends);
    for (let i = 0; i < this.ends; i++) u[i] = warpUp(this.draft, i, pick);
    return u;
  }

  _commitRow(ups, weft, turnSide) {
    const { pitch } = this;
    const A = this.clothA, B = this.clothB;
    B.x.clearRect(0, 0, B.w, B.h);
    B.x.drawImage(A.c, 0, 0, A.c.width, A.c.height, 0, pitch, A.w, A.h);
    drawWeaveRow(B.x, { y: 0, pitch, ends: this.ends, ups, warp: this.warp, weft, x0: 0 });
    // selvedge shading
    B.x.fillStyle = 'rgba(20,12,6,0.28)';
    B.x.fillRect(0, 0, 2.5, pitch);
    B.x.fillRect(B.w - 2.5, 0, 2.5, pitch);
    // the weft turning at the selvedge — one continuous thread, row to row
    if (this.rows > 0 && turnSide) {
      B.x.strokeStyle = weft.base;
      B.x.lineWidth = Math.max(2, pitch * 0.24);
      B.x.lineCap = 'round';
      B.x.beginPath();
      if (turnSide === 'right') B.x.arc(B.w - 1.2, pitch, pitch * 0.48, -Math.PI / 2, Math.PI / 2);
      else B.x.arc(1.2, pitch, pitch * 0.48, Math.PI / 2, Math.PI * 1.5);
      B.x.stroke();
    }
    this.clothA = B; this.clothB = A;
    this.rows = Math.min(this.rows + 1, Math.floor(this.clothA.h / pitch));
  }

  /* a few picks of plain weave in flax to spread a fresh warp */
  _weaveHeader() {
    const flax = threadStyle('#b9a67e');
    for (let k = 0; k < 3; k++) {
      const ups = new Array(this.ends);
      for (let i = 0; i < this.ends; i++) ups[i] = (i % 2) === (k % 2);
      this._commitRow(ups, flax, k % 2 ? 'left' : 'right');
    }
  }

  _commit() {
    this._commitRow(
      this._ups(this.pick),
      weftStyleFor(this.weftHex, this.pick),
      this.dir > 0 ? 'left' : 'right' // the side the shuttle set out from
    );
    this.kick = 1; // the beat packs the cloth
    this.pick++; this.sinceWarp++;
    this._report();
  }

  _report() {
    this.onPick({
      pick: this.pick,
      name: this.draft.name,
      ends: this.ends,
      dir: this.dir,
    });
  }

  /* ------------------------------ drawing ------------------------------ */

  _draw() {
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    this._drawPosts();
    this._drawHarness();
    this._drawCloth();
    this._drawWarpAndWeft();
    this._drawReed();
    this._drawBeam();
    this._drawClothBeam();
  }

  /* the harness: eight shaft bars, each holding heddle eyes on the ends it
     carries. Lifted shafts rise with the shed; on a counterbalance loom the
     rest ease down. This is the threading grid, made mechanical. */
  _drawHarness() {
    const { ctx, x0, ends, pitch } = this;
    const warping = this.phase === 'warping';
    let alpha = 1;
    if (warping) {
      const wdur = 0.9 + this.ends * 0.008;
      alpha = clamp((this.pt - wdur * 0.55) / 0.45, 0, 1);
      if (alpha <= 0) return;
    }
    const shed = warping ? 0 : this._shedMix();
    const lifted = warping ? null : liftedShafts(this.draft, this.pick);
    const w = ends * pitch + 24, x = x0 - 12;
    const thr = this.draft.threading;
    const ew = Math.max(5, pitch * 0.8);
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let s = 7; s >= 0; s--) {
      const on = lifted ? lifted[s] : false;
      const dy = on ? -shed * this.harnessGap * 1.35 : shed * this.harnessGap * 0.4;
      const y = this.harnessTop + (7 - s) * this.harnessGap + dy; // shaft 8 hung highest
      // cords up to the castle
      ctx.strokeStyle = on ? 'rgba(216,186,138,0.5)' : 'rgba(190,166,126,0.22)';
      ctx.lineWidth = 1;
      for (const cx of [x + 3, x + w - 3]) {
        ctx.beginPath(); ctx.moveTo(cx, this.beamY + this.beamH); ctx.lineTo(cx, y + 1.5); ctx.stroke();
      }
      // heddle eyes gripping this shaft's threads (flanks show beside the thread)
      ctx.fillStyle = on ? 'rgba(240,225,195,0.8)' : 'rgba(240,225,195,0.3)';
      for (let i = 0; i < ends; i++) {
        if (thr[i % thr.length] !== s) continue;
        const tx = x0 + i * pitch + pitch / 2;
        ctx.fillRect(tx - ew / 2, y - 1.5, ew, 6.5);
      }
      // the shaft bar itself
      const g = ctx.createLinearGradient(0, y, 0, y + 3.5);
      g.addColorStop(0, on ? '#96744c' : '#4a3722');
      g.addColorStop(1, on ? '#5f452a' : '#2c2014');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(x, y, w, 3.5, 2); ctx.fill();
    }
    ctx.restore();
  }

  _drawPosts() {
    const { ctx, H } = this;
    for (const x of [this.x0 - 16, this.x0 + this.ends * this.pitch + 8]) {
      const g = ctx.createLinearGradient(x, 0, x + 8, 0);
      g.addColorStop(0, '#2c2014'); g.addColorStop(0.45, '#4a3722'); g.addColorStop(1, '#241a10');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 8, H);
    }
  }

  _drawBeam() {
    const { ctx, x0, ends, pitch, beamY, beamH } = this;
    const w = ends * pitch + 48, x = x0 - 24;
    const g = ctx.createLinearGradient(0, beamY, 0, beamY + beamH);
    g.addColorStop(0, '#6b4e2f'); g.addColorStop(0.35, '#8a6a42'); g.addColorStop(1, '#3a2a18');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x, beamY, w, beamH, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,10,0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const yy = beamY + 2.5 + i * (beamH - 5) / 3;
      ctx.beginPath(); ctx.moveTo(x + 6, yy); ctx.lineTo(x + w - 6, yy); ctx.globalAlpha = 0.25; ctx.stroke(); ctx.globalAlpha = 1;
    }
    // shaft indicator tabs — which shafts this pick lifts
    const lifted = this.phase === 'warping' ? null : liftedShafts(this.draft, this.pick);
    const tw = 9, gap = 4, total = 8 * tw + 7 * gap;
    const tx0 = x0 + ends * pitch - total;
    for (let s = 0; s < 8; s++) {
      const on = lifted ? lifted[s] : false;
      ctx.fillStyle = on ? '#c96a4f' : 'rgba(0,0,0,0.34)';
      ctx.beginPath();
      ctx.roundRect(tx0 + s * (tw + gap), beamY + beamH / 2 - 2.5, tw, 5, 2);
      ctx.fill();
    }
  }

  _drawClothBeam() {
    const { ctx, x0, ends, pitch, H } = this;
    const w = ends * pitch + 48, x = x0 - 24, y = H - 12;
    ctx.fillStyle = 'rgba(12,7,3,0.55)';
    ctx.fillRect(x, y - 4, w, 4); // shadow above the beam
    const g = ctx.createLinearGradient(0, y, 0, y + 12);
    g.addColorStop(0, '#7a5c38'); g.addColorStop(0.4, '#5a4126'); g.addColorStop(1, '#241a10');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(x, y, w, 14, 4); ctx.fill();
  }

  _shedMix() {
    if (this.phase === 'shed') return easeOut(clamp(this.pt / this._durations().shed, 0, 1));
    if (this.phase === 'shuttle') return 1;
    if (this.phase === 'beat') return 1 - easeOut(clamp(this.pt / this._durations().beat, 0, 1));
    return 0;
  }

  _drawWarpAndWeft() {
    const { ctx, pitch, x0 } = this;
    const shed = this.phase === 'warping' ? 0 : this._shedMix();
    const ups = this.phase === 'warping' ? null : this._ups(this.pick);
    const warping = this.phase === 'warping';
    const wdur = 0.9 + this.ends * 0.008;

    const bottom = this.fellY + 1;
    const drawThread = (i, raised) => {
      const x = x0 + i * pitch + pitch / 2;
      let len = bottom - this.warpTop;
      if (warping) {
        const a = (i / this.ends) * wdur * 0.82;
        const k = clamp((this.pt - a) / 0.3, 0, 1);
        if (k <= 0) return;
        len *= easeOut(k);
      }
      const st = this.warp[i];
      const wid = Math.max(3.2, pitch * (raised ? 0.46 : 0.4));
      ctx.globalAlpha = raised ? 1 : (1 - shed * 0.52);
      ctx.fillStyle = raised ? st.base : st.dark;
      ctx.fillRect(x - wid / 2, this.warpTop, wid, len);
      // cylinder highlight + shaded edge so it reads as spun thread
      ctx.fillStyle = st.light;
      ctx.globalAlpha = (raised ? 0.85 : 0.3) * (raised ? 1 : (1 - shed * 0.4));
      ctx.fillRect(x - wid * 0.22, this.warpTop, wid * 0.3, len);
      ctx.fillStyle = st.deep;
      ctx.globalAlpha = raised ? 0.55 : 0.4;
      ctx.fillRect(x + wid / 2 - 1, this.warpTop, 1, len);
      ctx.globalAlpha = 1;
    };

    // sunken warps first
    for (let i = 0; i < this.ends; i++) {
      if (!warping && ups[i] && shed > 0.02) continue;
      drawThread(i, false);
    }

    // weft in flight + beaten pick
    if (this.phase === 'shuttle') this._drawShuttle();
    if (this.phase === 'beat') this._drawBeatingWeft();

    // raised warps in front of the weft
    if (!warping && shed > 0.02) {
      for (let i = 0; i < this.ends; i++) if (ups[i]) drawThread(i, true);
    }
  }

  _drawShuttle() {
    const { ctx, pitch } = this;
    const d = this._durations();
    const t = easeInOut(clamp(this.pt / d.shuttle, 0, 1));
    const L = this.x0 - 10, R = this.x0 + this.ends * this.pitch + 10;
    const from = this.dir > 0 ? L : R;
    const to = this.dir > 0 ? R : L;
    const sx = from + (to - from) * t;
    const y = this.insertY;
    const weft = threadStyle(this.weftHex);

    // trailing weft, sagging slightly
    ctx.strokeStyle = weft.base;
    ctx.lineWidth = Math.max(2.2, pitch * 0.26);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from, y);
    ctx.quadraticCurveTo((from + sx) / 2, y + 7, sx - this.dir * 24, y);
    ctx.stroke();

    // the shuttle: walnut lozenge with a wound bobbin
    const half = 29, h = 13;
    ctx.save();
    if (this._speed() > 2.2) { // sprint blur
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = weft.base;
      ctx.fillRect(Math.min(from, sx), y - 1.4, Math.abs(sx - from), 2.8);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = '#2c1e10';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - half, y);
    ctx.quadraticCurveTo(sx - half * 0.4, y - h / 2 - 2, sx, y - h / 2);
    ctx.quadraticCurveTo(sx + half * 0.55, y - h / 2 + 1, sx + half, y);
    ctx.quadraticCurveTo(sx + half * 0.55, y + h / 2 - 1, sx, y + h / 2);
    ctx.quadraticCurveTo(sx - half * 0.4, y + h / 2 + 2, sx - half, y);
    ctx.closePath();
    const sg = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    sg.addColorStop(0, '#96744c'); sg.addColorStop(0.45, '#6f5130'); sg.addColorStop(1, '#31220f');
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.stroke();
    // bobbin window
    ctx.fillStyle = weft.light;
    ctx.beginPath();
    ctx.roundRect(sx - 13, y - 3.2, 26, 6.4, 3);
    ctx.fill();
    ctx.strokeStyle = weft.dark;
    ctx.globalAlpha = 0.7;
    for (let i = -10; i <= 10; i += 3.2) {
      ctx.beginPath(); ctx.moveTo(sx + i, y - 3); ctx.lineTo(sx + i + 1.4, y + 3); ctx.stroke();
    }
    ctx.restore();
  }

  _drawBeatingWeft() {
    const { ctx, pitch } = this;
    const t = easeOut(clamp(this.pt / this._durations().beat, 0, 1));
    const y = this.insertY + (this.fellY - pitch * 0.5 - this.insertY) * t;
    const weft = weftStyleFor(this.weftHex, this.pick);
    const g = ctx.createLinearGradient(0, y - pitch * 0.4, 0, y + pitch * 0.4);
    g.addColorStop(0, weft.dark); g.addColorStop(0.42, weft.light); g.addColorStop(1, weft.dark);
    ctx.fillStyle = g;
    ctx.fillRect(this.x0, y - pitch * 0.4, this.ends * pitch, pitch * 0.8);
  }

  _drawReed() {
    if (this.phase === 'warping') return;
    const { ctx, x0, ends, pitch } = this;
    let y = this.reedY;
    if (this.phase === 'beat') {
      const t = easeOut(clamp(this.pt / this._durations().beat, 0, 1));
      y = this.reedY + (this.fellY - 6 - this.reedY) * t;
    } else if (this.phase === 'rest') {
      const t = easeOut(clamp(this.pt / this._durations().rest, 0, 1));
      y = this.fellY - 6 + (this.reedY - (this.fellY - 6)) * t;
    }
    const w = ends * pitch + 36, x = x0 - 18;
    const g = ctx.createLinearGradient(0, y, 0, y + 9);
    g.addColorStop(0, '#8a6a42'); g.addColorStop(0.5, '#5f452a'); g.addColorStop(1, '#33251a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(x, y, w, 9, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(240,230,205,0.18)';
    ctx.lineWidth = 1;
    for (let tx = x + 6; tx < x + w - 4; tx += 4) {
      ctx.beginPath(); ctx.moveTo(tx, y + 1.5); ctx.lineTo(tx, y + 7.5); ctx.stroke();
    }
  }

  _rippleX(y, clothY) {
    // lateral sway, pinned at the fell, freer toward the cloth beam
    const depth = clamp(clothY / (this.clothH * 0.8), 0, 1);
    let off = Math.sin(clothY * 0.045 - this.t * 1.9) * 2.1 * depth;
    if (this.pointer) {
      const age = this.t - this.pointer.t0;
      const amp = 3.4 * Math.exp(-age * 2.4);
      if (amp > 0.05) {
        const dy = y - this.pointer.y;
        off += amp * Math.exp(-(dy * dy) / (2 * 46 * 46)) * Math.sin(dy * 0.11 - age * 9);
      } else this.pointer = null;
    }
    return off;
  }

  _drawCloth() {
    const { ctx, pitch } = this;
    const A = this.clothA;
    const band = 10;
    const shown = Math.min(this.rows * pitch, this.clothH);
    const kick = this.kick || 0;
    for (let sy = 0; sy < shown; sy += band) {
      const h = Math.min(band, shown - sy);
      // the beat's shock travels down the cloth, pinned at the fell
      const dy = this.fellY + sy + kick * 3 * (sy / Math.max(this.clothH, 1));
      const dx = this.x0 + this._rippleX(dy, sy);
      ctx.drawImage(
        A.c,
        0, sy * this.dpr, A.c.width, h * this.dpr,
        dx, dy, A.w, h
      );
    }
    if (shown > 0) {
      // travelling sheen — the light moving over handled cloth
      const cyc = (this.t * 26) % (this.clothH + 160) - 80;
      const gy = this.fellY + cyc;
      const g = ctx.createLinearGradient(0, gy - 70, 0, gy + 70);
      g.addColorStop(0, 'rgba(255,246,225,0)');
      g.addColorStop(0.5, 'rgba(255,246,225,0.55)');
      g.addColorStop(1, 'rgba(255,246,225,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = g;
      ctx.fillRect(this.x0 - 4, Math.max(this.fellY, gy - 70), this.ends * pitch + 8, 140);
      ctx.restore();
    }
  }

  /* reduced-motion / fallback: a fully woven, still loom */
  _staticRender() {
    const { ctx, W, H, pitch } = this;
    ctx.clearRect(0, 0, W, H);
    this._drawPosts();
    const savePhase = this.phase; this.phase = 'rest';
    this._drawHarness(); // closed shed, bars at rest
    this.phase = savePhase;
    const picks = Math.ceil(this.clothH / pitch) + 1;
    renderCloth(ctx, this.draft, {
      pitch, ends: this.ends, picks,
      warp: this.warp, weftHex: this.weftHex,
      x0: this.x0, y0: this.fellY,
    });
    // closed shed
    for (let i = 0; i < this.ends; i++) {
      const x = this.x0 + i * pitch + pitch / 2;
      const st = this.warp[i];
      const wid = Math.max(3.2, pitch * 0.42);
      ctx.fillStyle = st.base;
      ctx.fillRect(x - wid / 2, this.warpTop, wid, this.fellY - this.warpTop + 1);
      ctx.fillStyle = st.light; ctx.globalAlpha = 0.6;
      ctx.fillRect(x - wid * 0.22, this.warpTop, wid * 0.3, this.fellY - this.warpTop);
      ctx.globalAlpha = 1;
    }
    this._drawReedStatic();
    this._drawBeam();
    this._drawClothBeam();
  }

  _drawReedStatic() {
    const save = this.phase; this.phase = 'shed'; this.pt = 0;
    this._drawReed();
    this.phase = save;
  }
}

/* MiniWeave — swatch and drawdown canvases woven with the same painter. */
export class MiniWeave {
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.draft = opts.draft;
    this.warpHex = opts.warpHex;
    this.weftHex = opts.weftHex;
    this.targetPitch = opts.pitch || 8;
    this.fixedEnds = opts.ends || 0;
    this.resize();
  }

  resize() {
    const c = this.canvas;
    const W = c.clientWidth || c.parentElement.clientWidth;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let H;
    if (this.fixedEnds) {
      // drawdown mode: exactly N ends wide, rows follow the treadling repeat
      this.ends = this.fixedEnds;
      this.pitch = W / this.ends;
      this.picks = this.draft.treadling.length;
      H = Math.round(this.pitch * this.picks);
      c.style.height = H + 'px';
    } else {
      H = c.clientHeight || Math.round(W * 0.68);
      this.pitch = this.targetPitch;
      this.ends = Math.ceil(W / this.pitch);
      this.picks = Math.ceil(H / this.pitch);
    }
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = W; this.H = H;
    this.warp = warpStyles(this.warpHex, this.ends, 11);
  }

  setDraft(draft) {
    this.draft = draft;
    if (this.fixedEnds && draft.treadling.length !== this.picks) this.resize();
  }

  setColors(warpHex, weftHex) {
    this.warpHex = warpHex; this.weftHex = weftHex;
    this.warp = warpStyles(warpHex, this.ends, 11);
  }

  renderInstant() {
    this.ctx.clearRect(0, 0, this.W, this.H);
    renderCloth(this.ctx, this.draft, {
      pitch: this.pitch, ends: this.ends, picks: this.picks,
      warp: this.warp, weftHex: this.weftHex,
    });
  }

  /* weave in over `dur` seconds, top to bottom, like rows coming off the fell */
  weaveIn(dur = 0.55) {
    if (REDUCED.matches || dur <= 0) { this.renderInstant(); return; }
    if (this._anim) cancelAnimationFrame(this._anim);
    const t0 = performance.now();
    let drawn = 0;
    this.ctx.clearRect(0, 0, this.W, this.H);
    const step = (now) => {
      const k = Math.min((now - t0) / (dur * 1000), 1);
      const target = Math.floor(k * this.picks);
      while (drawn < target) {
        const ups = new Array(this.ends);
        for (let i = 0; i < this.ends; i++) ups[i] = warpUp(this.draft, i, drawn);
        drawWeaveRow(this.ctx, {
          y: drawn * this.pitch, pitch: this.pitch, ends: this.ends,
          ups, warp: this.warp, weft: weftStyleFor(this.weftHex, drawn),
        });
        drawn++;
      }
      if (k < 1) this._anim = requestAnimationFrame(step);
      else this._anim = null;
    };
    this._anim = requestAnimationFrame(step);
  }
}
