/* SHORTWAVE — receiver: tuning state, needle, knob, readout, S-meter,
   lock logic and the decode ticker. */

import { BAND, STATIONS, trafficScript } from './stations.js';

const LOCK_KHZ = 12;      /* squelch opens inside this offset */
const CARRIER_KHZ = 45;   /* carrier lamp inside this offset */
const SNAP_KHZ = 26;      /* magnetic snap on release */

export class Receiver {
  constructor(els, audio, reducedMotion) {
    this.els = els;
    this.audio = audio;
    this.rm = reducedMotion;
    this.freq = 6630;
    this.locked = null;
    this.tween = null;
    this.dragging = false;

    /* ticker state */
    this.script = null;
    this.tickerText = '';
    this.tickerWait = 0;
    this.tickerMax = 80;

    /* S-meter spring + peak hold */
    this.smPos = -52;
    this.smVel = 0;
    this.smPeak = -52;

    this._buildSMeterTicks();
    this._bindDial();
    this._bindKnob();
    this._bindKeys();
    this._applyFreq(true);
  }

  /* ---------------------------------------------------------- */

  _buildSMeterTicks() {
    const g = this.els.smTicks;
    const ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i <= 8; i++) {
      const a = (-52 + (104 / 8) * i) * Math.PI / 180;
      const x1 = 60 + Math.sin(a) * 40, y1 = 58 - Math.cos(a) * 40;
      const x2 = 60 + Math.sin(a) * 45, y2 = 58 - Math.cos(a) * 45;
      const ln = document.createElementNS(ns, 'line');
      ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
      ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
      g.appendChild(ln);
    }
  }

  /* ---------------------------------------------------------- */
  /* input                                                       */

  _freqAtPointer(ev) {
    const r = this.els.fallWrap.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
    return BAND.min + frac * (BAND.max - BAND.min);
  }

  _bindDial() {
    const wrap = this.els.fallWrap;
    let downX = 0, moved = false;

    wrap.addEventListener('pointerdown', ev => {
      if (ev.button !== undefined && ev.button !== 0) return;
      wrap.setPointerCapture(ev.pointerId);
      this.dragging = true;
      wrap.classList.add('dragging');
      moved = false;
      downX = ev.clientX;
      this._cancelTween();
    });

    wrap.addEventListener('pointermove', ev => {
      this._moveGhost(ev);
      if (!this.dragging) return;
      if (Math.abs(ev.clientX - downX) > 4) moved = true;
      if (moved) this.setFreq(this._freqAtPointer(ev));
    });

    const up = ev => {
      if (!this.dragging) return;
      this.dragging = false;
      wrap.classList.remove('dragging');
      if (!moved) {
        /* click: glide to the clicked frequency (with magnet) */
        this.tuneTo(this._magnet(this._freqAtPointer(ev)), 520);
      } else {
        /* drag release: magnetic snap onto a nearby carrier */
        const m = this._magnet(this.freq);
        if (m !== this.freq) this.tuneTo(m, 340);
      }
    };
    wrap.addEventListener('pointerup', up);
    wrap.addEventListener('pointercancel', () => { this.dragging = false; wrap.classList.remove('dragging'); });
  }

  _magnet(f) {
    const s = this._nearest(f);
    return Math.abs(s.freq - f) <= SNAP_KHZ ? s.freq : f;
  }

  /* preview hairline + frequency bubble under the cursor */
  _moveGhost(ev) {
    if (ev.pointerType && ev.pointerType !== 'mouse') return;
    const r = this.els.fallWrap.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
    const f = BAND.min + frac * (BAND.max - BAND.min);
    this.els.ghost.style.left = (frac * 100).toFixed(2) + '%';
    this.els.ghost.classList.toggle('flip', frac > 0.82);
    this.els.ghostFreq.textContent = (f / 1000).toFixed(4);
  }

  _bindKnob() {
    const knob = this.els.knob;
    let lastX = 0, lastY = 0, active = false;
    knob.addEventListener('pointerdown', ev => {
      active = true;
      lastX = ev.clientX; lastY = ev.clientY;
      knob.setPointerCapture(ev.pointerId);
      this._cancelTween();
      ev.preventDefault();
    });
    knob.addEventListener('pointermove', ev => {
      if (!active) return;
      const dx = ev.clientX - lastX, dy = ev.clientY - lastY;
      lastX = ev.clientX; lastY = ev.clientY;
      this.setFreq(this.freq + (dx - dy) * 0.55);
    });
    const done = () => { active = false; };
    knob.addEventListener('pointerup', done);
    knob.addEventListener('pointercancel', done);
  }

  _bindKeys() {
    this.els.fallWrap.addEventListener('keydown', ev => {
      const fine = ev.shiftKey ? 20 : 2;
      switch (ev.key) {
        case 'ArrowLeft': this._cancelTween(); this.setFreq(this.freq - fine); break;
        case 'ArrowRight': this._cancelTween(); this.setFreq(this.freq + fine); break;
        case 'PageDown': this._jumpStation(1); break;
        case 'PageUp': this._jumpStation(-1); break;
        case 'Home': this.tuneTo(BAND.min, 700); break;
        case 'End': this.tuneTo(BAND.max, 700); break;
        default: return;
      }
      ev.preventDefault();
    });
  }

  _jumpStation(dir) {
    const sorted = [...STATIONS].sort((a, b) => a.freq - b.freq);
    let target;
    if (dir > 0) target = sorted.find(s => s.freq > this.freq + 1) || sorted[0];
    else target = [...sorted].reverse().find(s => s.freq < this.freq - 1) || sorted[sorted.length - 1];
    this.tuneTo(target.freq, 900);
  }

  /* ---------------------------------------------------------- */
  /* tuning                                                      */

  setFreq(f) {
    this.freq = Math.min(BAND.max, Math.max(BAND.min, f));
    this._applyFreq();
  }

  tuneTo(f, ms = 900) {
    if (this.rm) { this.setFreq(f); return; }
    this._cancelTween();
    this.tween = {
      from: this.freq,
      to: Math.min(BAND.max, Math.max(BAND.min, f)),
      t: 0,
      dur: ms / 1000,
    };
  }

  _cancelTween() { this.tween = null; }

  _nearest(f = this.freq) {
    let best = STATIONS[0], bd = Infinity;
    for (const s of STATIONS) {
      const d = Math.abs(s.freq - f);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  _applyFreq(first = false) {
    const f = this.freq;
    const frac = (f - BAND.min) / (BAND.max - BAND.min);

    this.els.needle.style.left = (frac * 100).toFixed(3) + '%';
    this.els.passband.style.left = (frac * 100).toFixed(3) + '%';
    this.els.freqDigits.textContent = (f / 1000).toFixed(4);
    this.els.knobFace.style.transform = `rotate(${((f - BAND.min) * 1.9) % 360}deg)`;

    const wrap = this.els.fallWrap;
    wrap.setAttribute('aria-valuenow', Math.round(f));
    wrap.setAttribute('aria-valuetext', (f / 1000).toFixed(4) + ' megahertz');

    /* lock / carrier state */
    const near = this._nearest(f);
    const df = f - near.freq;
    const adf = Math.abs(df);
    const locked = adf <= LOCK_KHZ ? near : null;

    this.els.lampCarrier.classList.toggle('on', adf <= CARRIER_KHZ);
    this.els.passband.classList.toggle('locked', !!locked);
    this.audio.setTuning(df, !!locked, near);

    if (locked !== this.locked) {
      this.locked = locked;
      this.els.lampLock.classList.toggle('on', !!locked);
      this.els.stationLine.classList.toggle('locked', !!locked);
      this.els.stationLine.textContent = locked ? `${locked.id} ${locked.name}` : 'SEARCHING';
      this.els.decodeLabel.textContent = locked ? locked.decodeLabel : 'DECODE — NO CARRIER';
      this._resetTicker(locked, first);
    }
  }

  /* ---------------------------------------------------------- */
  /* decode ticker                                               */

  _resetTicker(station, immediate) {
    this.tickerText = '';
    this.els.ticker.textContent = '';
    this.els.ticker.classList.toggle('noise', !station);
    this.script = station ? trafficScript(station) : null;
    this.tickerWait = immediate ? 0.2 : 0.55; /* squelch settle */
    this.refreshTickerWidth();
  }

  refreshTickerWidth() {
    const w = this.els.ticker.parentElement.clientWidth;
    this.tickerMax = Math.max(24, Math.floor((w - 40) / 14));
  }

  _tickTicker(dt) {
    if (!this.script) {
      /* no carrier: dim static crackles across the glass — and now and
         then a ghost digit surfaces out of the noise */
      if (this.rm) return;
      this.tickerWait -= dt;
      let g = 0;
      while (this.tickerWait <= 0 && g++ < 6) {
        const r = Math.random();
        const ch = r < 0.56 ? ' ' : r < 0.8 ? '·' : r < 0.92 ? '.'
          : String(Math.floor(Math.random() * 10));
        this.tickerText += ch;
        if (this.tickerText.length > this.tickerMax) {
          this.tickerText = this.tickerText.slice(this.tickerText.length - this.tickerMax);
        }
        this.els.ticker.textContent = this.tickerText;
        this.tickerWait += 0.09 + Math.random() * 0.32;
      }
      return;
    }
    this.tickerWait -= dt;
    let guard = 0;
    while (this.tickerWait <= 0 && guard++ < 8) {
      const { value } = this.script.next();
      if (!value) break;
      if (value.txt) {
        this.tickerText += value.txt;
        if (this.tickerText.length > this.tickerMax) {
          this.tickerText = this.tickerText.slice(this.tickerText.length - this.tickerMax);
        }
        this.els.ticker.textContent = this.tickerText;
      }
      if (value.snd) this.audio.play(value.snd);
      this.tickerWait += value.gap / 1000;
    }
  }

  /* ---------------------------------------------------------- */
  /* per-frame                                                   */

  frame(t, dt, visible = true) {
    /* tween */
    if (this.tween) {
      const tw = this.tween;
      tw.t += dt;
      const p = Math.min(1, tw.t / tw.dur);
      const e = 1 - Math.pow(1 - p, 3); /* easeOutCubic */
      this.setFreq(tw.from + (tw.to - tw.from) * e);
      if (p >= 1) this.tween = null;
    }

    /* ticker runs even offscreen — the audio program must not pause */
    this._tickTicker(dt);

    /* S-meter DOM writes are pointless while the chassis is offscreen */
    if (!visible) return;

    /* S-meter spring */
    const near = this._nearest();
    const adf = Math.abs(near.freq - this.freq);
    let target = -46 + Math.random() * 5; /* noise floor wobble */
    if (adf < 70) {
      const prox = 1 - adf / 70;
      target = -46 + prox * (86 + Math.sin(t * 2.1) * 7 * prox) * near.power;
    }
    target = Math.min(52, target);
    this.smVel += (target - this.smPos) * (this.rm ? 0.25 : 0.09);
    this.smVel *= this.rm ? 0.6 : 0.86;
    this.smPos += this.smVel;
    this.els.smNeedle.setAttribute('transform', `rotate(${this.smPos.toFixed(2)} 60 58)`);

    /* peak hold: rises instantly, decays slowly */
    this.smPeak = Math.max(this.smPeak - 11 * dt, this.smPos, -52);
    this.els.smPeak.setAttribute('transform', `rotate(${this.smPeak.toFixed(2)} 60 58)`);
  }
}
