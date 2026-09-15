/* KINETIK — the steelyard bench. One rigid beam, real torque:
   120 g fixed at 15 cm left; drag 60 g along the right arm until
   the moments agree (60 × 30 = 120 × 15). Same math as the engine,
   with the moment arm under the visitor's hand. */

import { PAL } from './engine.js';

const CM = 11;              // design px per centimetre
const GC = 981;             // gravity, cm/s²
const ML = 120, XL = 15;    // fixed weight (g), arm (cm)
const MR = 60;              // sliding weight (g)
const MB = 66;              // beam mass (g)
const H = 2;                // hang-loop height above beam, cm
const D_MIN = 3, D_MAX = 31, D_EQ = 30;
const E_LEFT = ML * XL;     // 1800 g·cm
const EQ_TOL = 24;          // in-balance window, g·cm
const STOP = 0.23;          // hard tilt stop, rad
const TAU = Math.PI * 2;
const T_HANG = 5.5 * CM;    // ceiling string, design px
const HH = H * CM;          // ring height, design px

const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export class Bench {
  constructor(stage, canvas, dom, reduced) {
    this.stage = stage;
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.dom = dom;               // { right, tilt, status, bench }
    this.reduced = reduced;
    this.d = 12;                  // cm from pivot
    this.th = 0; this.om = 0;
    this.drag = null;
    this.eq = false;
    this.th = this.restAngle();
    this.resize();
    this.bind();
    this.updateDom();
  }

  restAngle() {
    const e = MR * this.d - E_LEFT;
    const t = Math.atan2(e, H * (ML + MR + MB));
    return Math.max(-STOP, Math.min(STOP, t));
  }

  resize() {
    const cw = this.cv.clientWidth, ch = this.cv.clientHeight;
    if (!cw || !ch) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cw = cw; this.ch = ch; this.dpr = dpr;
    this.cv.width = Math.round(cw * dpr);
    this.cv.height = Math.round(ch * dpr);
    this.s = Math.min(cw * 0.92 / (70 * CM), ch * 0.94 / 330, 1.5);
    this.ox = cw / 2;
    this.oy = 14 + (T_HANG + 6) * this.s;
    this.draw();
  }

  toDesign(cx, cy) {
    const r = this.cv.getBoundingClientRect();
    return [(cx - r.left - this.ox) / this.s, (cy - r.top - this.oy) / this.s];
  }

  weightPos() { // world (design) position of the sliding weight's collar
    const c = Math.cos(this.th), s = Math.sin(this.th);
    const u = this.d * CM;
    return [u * c - HH * s, u * s + HH * c];
  }

  nearWeight(x, y) { // within grab range of the collar OR the brass disc
    const c = Math.cos(this.th), s = Math.sin(this.th);
    const u = this.d * CM, v = HH + 9 + 2.6 * CM + 18.5;
    const [wx, wy] = this.weightPos();
    const dx2 = u * c - v * s, dy2 = u * s + v * c;
    const R = (4.6 * CM) ** 2;
    return (x - wx) ** 2 + (y - wy) ** 2 < R || (x - dx2) ** 2 + (y - dy2) ** 2 < R;
  }

  bind() {
    const cv = this.cv;
    cv.addEventListener('pointerdown', e => {
      const [x, y] = this.toDesign(e.clientX, e.clientY);
      if (this.nearWeight(x, y)) {
        this.drag = e.pointerId;
        cv.setPointerCapture(e.pointerId);
        cv.style.cursor = 'grabbing';
        this.moveTo(x, y, true);
        e.preventDefault();
      }
    });
    cv.addEventListener('pointermove', e => {
      const [x, y] = this.toDesign(e.clientX, e.clientY);
      if (this.drag === e.pointerId) this.moveTo(x, y);
      else cv.style.cursor = this.nearWeight(x, y) ? 'grab' : 'default';
    });
    const drop = e => {
      if (this.drag === e.pointerId) { this.drag = null; cv.style.cursor = 'grab'; }
    };
    cv.addEventListener('pointerup', drop);
    cv.addEventListener('pointercancel', drop);
    this.stage.addEventListener('keydown', e => {
      const step = e.shiftKey ? 4 : 1;
      let d = this.d;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') d += step;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') d -= step;
      else if (e.key === 'Home') d = D_MIN;
      else if (e.key === 'End') d = D_MAX;
      else return;
      e.preventDefault();
      this.setD(d);
    });
  }

  moveTo(x, y, instant) {
    const c = Math.cos(this.th), s = Math.sin(this.th);
    const u = (x * c + y * s) / CM;      // project onto beam axis
    this.target = Math.max(D_MIN, Math.min(D_MAX, u));
    // reduced motion: no frame loop is running to chase the target,
    // so the weight follows the hand directly (beam snaps to rest tilt)
    if (instant || this.reduced()) this.setD(this.target, instant);
  }

  setD(d, silent) {
    this.d = Math.max(D_MIN, Math.min(D_MAX, d));
    this.target = this.d;
    if (this.reduced()) { this.th = this.restAngle(); this.om = 0; this.draw(); }
    this.updateDom();
    if (!silent) this.stage.setAttribute('aria-valuenow', Math.round(this.d));
  }

  frame(dt) {
    if (this.drag != null && this.target != null && this.target !== this.d) {
      const rate = 45 * dt;              // the weight has weight: 45 cm/s max
      const diff = this.target - this.d;
      this.d += Math.abs(diff) < rate ? diff : Math.sign(diff) * rate;
      this.updateDom();
      this.stage.setAttribute('aria-valuenow', Math.round(this.d));
    }
    const e = MR * this.d - E_LEFT;
    const I = ML * (XL * XL + H * H) + MR * (this.d * this.d + H * H) + MB * (66 * 66 / 12 + H * H);
    const c = Math.cos(this.th), s = Math.sin(this.th);
    let al = GC * (c * e - s * H * (ML + MR + MB)) / I;
    const inEq = Math.abs(e) <= EQ_TOL;
    al -= (inEq ? 2.8 : 0.55) * this.om;
    if (this.th > STOP) al += -60 * (this.th - STOP) - 4 * this.om;
    if (this.th < -STOP) al += -60 * (this.th + STOP) - 4 * this.om;
    this.om += al * dt;
    this.th += this.om * dt;
    if (inEq !== this.eq) { this.eq = inEq; this.updateDom(); }
    this.draw();
  }

  updateDom() {
    const e = MR * this.d - E_LEFT;
    const inEq = Math.abs(e) <= EQ_TOL;
    this.dom.right.textContent =
      `60 g × ${this.d.toFixed(1)} cm = ${fmt(MR * this.d)} g·cm`;
    const deg = this.th * 180 / Math.PI;
    this.dom.tilt.textContent = `${deg >= 0 ? '+' : '−'}${Math.abs(deg).toFixed(1)}°`;
    this.dom.bench.classList.toggle('eq', inEq);
    this.dom.status.textContent = inEq
      ? 'EQUILIBRIUM · 1 800 = 1 800'
      : (e < 0 ? 'LEFT SIDE WINS — SLIDE FARTHER OUT' : 'RIGHT SIDE WINS — BRING IT BACK IN');
    this.stage.setAttribute('aria-valuetext',
      `${this.d.toFixed(0)} centimetres from the pivot. Right moment ${Math.round(MR * this.d)} gram centimetres. ${inEq ? 'In equilibrium.' : ''}`);
  }

  draw() {
    const { ctx: c, dpr, s, ox, oy, cw, ch } = this;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, cw, ch);
    c.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    const iron = PAL.iron, accent = this.eq ? PAL.sun : iron;
    const px = 1 / s; // one screen pixel in design units

    // ceiling mount + hang string
    c.fillStyle = iron;
    c.fillRect(-14, -T_HANG - 8, 28, 4);
    line(c, 0, -T_HANG - 4, 0, -6, iron, 1.4);
    // pivot ring
    c.beginPath(); c.arc(0, 0, 5.5, 0, TAU);
    c.lineWidth = 2.2; c.strokeStyle = accent; c.stroke();

    const co = Math.cos(this.th), si = Math.sin(this.th);
    c.save();
    c.rotate(this.th);
    // ring-to-beam wire, beam
    line(c, 0, 5.5, 0, HH, iron, 2);
    line(c, -33 * CM, HH, 33 * CM, HH, iron, 3.4, 'round');
    // ruler ticks along the right arm
    const fs = Math.min(26, 10.5 / s); // design units -> ~10.5px on screen
    c.strokeStyle = iron; c.fillStyle = PAL.slate;
    c.font = `500 ${fs}px "IBM Plex Mono", monospace`;
    c.textAlign = 'center';
    for (let k = 2; k <= 32; k++) {
      const x = k * CM;
      const t = k % 10 === 0 ? 8 : k % 5 === 0 ? 6 : 3.4;
      const em = this.eq && k === D_EQ;
      c.lineWidth = em ? 2 : 0.9;
      c.strokeStyle = em ? PAL.sun : 'rgba(20,20,25,0.6)';
      c.beginPath(); c.moveTo(x, HH - 1.7 - t); c.lineTo(x, HH - 1.7); c.stroke();
      if (k % 10 === 0) c.fillText(String(k), x, HH + 15);
    }
    c.fillText('cm', 33 * CM + 14, HH + 15);
    // fixed collar + left label mark
    c.fillStyle = iron;
    rr(c, -XL * CM - 5, HH - 8, 10, 16, 2.5);
    // left string + disc
    line(c, -XL * CM, HH + 8, -XL * CM, HH + 8 + 3.2 * CM, iron, 1.4);
    c.beginPath(); c.arc(-XL * CM, HH + 8 + 3.2 * CM + 26, 26, 0, TAU);
    c.fillStyle = PAL.red; c.fill();
    // sliding collar + string + sun disc
    const u = this.d * CM;
    c.fillStyle = accent;
    rr(c, u - 6, HH - 9, 12, 18, 3);
    line(c, u, HH + 9, u, HH + 9 + 2.6 * CM, iron, 1.4);
    c.beginPath(); c.arc(u, HH + 9 + 2.6 * CM + 18.5, 18.5, 0, TAU);
    c.fillStyle = PAL.sun; c.fill();
    c.lineWidth = 1.4; c.strokeStyle = iron; c.stroke();
    // grab affordance
    if (this.drag == null) {
      c.beginPath(); c.arc(u, HH + 9 + 2.6 * CM + 18.5, 26, 0, TAU);
      c.setLineDash([3, 5]); c.lineWidth = Math.max(1.1, px);
      c.strokeStyle = 'rgba(20,20,25,0.4)'; c.stroke(); c.setLineDash([]);
    }
    c.restore();

    // upright labels (world space)
    c.fillStyle = PAL.slate;
    c.font = `500 ${Math.min(26, 10.5 / s)}px "IBM Plex Mono", monospace`;
    c.textAlign = 'center';
    const lw = wpt(-XL * CM, HH + 8 + 3.2 * CM + 26, co, si);
    c.fillText('120 g', lw[0], lw[1] + 44);
    const rw = wpt(this.d * CM, HH + 9 + 2.6 * CM + 18.5, co, si);
    c.fillText('60 g', rw[0], rw[1] + 36);
    c.fillText('15 cm', wpt(-XL * CM / 2, HH, co, si)[0], wpt(-XL * CM / 2, HH, co, si)[1] - 12);
  }
}

function wpt(u, v, c, s) { return [u * c - v * s, u * s + v * c]; }
function line(c, x1, y1, x2, y2, col, w, cap) {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = cap || 'butt'; c.stroke();
}
function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath(); c.fill();
}
