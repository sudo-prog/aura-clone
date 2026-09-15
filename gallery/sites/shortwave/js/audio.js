/* SHORTWAVE — synthesized receiver audio.
   Everything is generated: static bed, heterodyne whistle, attention tunes,
   morse, the LATHE rasp, and formant-filtered "voice" digits.
   Nothing is created until the user presses AUDIO ON. */

const DIGIT_SYLLABLES = [
  /* 0 ZE-RO  */[{ f1: 430, f2: 2100, len: 0.11, pk: 1.12 }, { f1: 500, f2: 900, len: 0.13, pk: 0.9 }],
  /* 1 ONE    */[{ f1: 520, f2: 950, len: 0.17, pk: 1.05 }],
  /* 2 TWO    */[{ f1: 350, f2: 750, len: 0.16, pk: 1.0 }],
  /* 3 THREE  */[{ f1: 300, f2: 2300, len: 0.16, pk: 1.08 }],
  /* 4 FOUR   */[{ f1: 560, f2: 880, len: 0.17, pk: 0.95 }],
  /* 5 FI-IVE */[{ f1: 700, f2: 1500, len: 0.1, pk: 1.1 }, { f1: 430, f2: 1900, len: 0.11, pk: 0.95 }],
  /* 6 SIX    */[{ f1: 320, f2: 2200, len: 0.15, pk: 1.12 }],
  /* 7 SEV-EN */[{ f1: 480, f2: 1900, len: 0.1, pk: 1.1 }, { f1: 420, f2: 1600, len: 0.11, pk: 0.92 }],
  /* 8 EIGHT  */[{ f1: 600, f2: 1900, len: 0.16, pk: 1.02 }],
  /* 9 NINE   */[{ f1: 620, f2: 1300, len: 0.17, pk: 1.06 }],
];

export class RadioAudio {
  constructor() {
    this.ctx = null;
    this.on = false;
    this._popTimer = null;
  }

  /* build the whole node graph on first user gesture */
  _ensure() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.ratio.value = 6;
    this.master.connect(this.comp).connect(ctx.destination);

    /* ---- shortwave loudspeaker chain: everything passes through this ---- */
    this.speakerIn = ctx.createGain();
    const shaper = ctx.createWaveShaper();
    shaper.curve = this._softClipCurve(1.6);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 240; hp.Q.value = 0.5;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 3400; lp.Q.value = 0.6;
    this.flutter = ctx.createGain();
    this.flutter.gain.value = 1;
    this.speakerIn.connect(shaper).connect(hp).connect(lp).connect(this.flutter).connect(this.master);

    /* slow ionospheric flutter on the whole speaker */
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.37;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 0.07;
    lfo.connect(lfoAmt).connect(this.flutter.gain);
    lfo.start();

    /* ---- static bed ---- */
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0;
    const nb = ctx.createBiquadFilter();
    nb.type = 'bandpass'; nb.frequency.value = 1100; nb.Q.value = 0.35;
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = this._noiseBuffer(2.3);
    noiseSrc.loop = true;
    noiseSrc.connect(nb).connect(this.noiseGain).connect(this.speakerIn);
    noiseSrc.start();

    /* ---- heterodyne whistle while sweeping across a carrier ---- */
    this.het = ctx.createOscillator();
    this.het.type = 'sine';
    this.het.frequency.value = 1000;
    this.hetGain = ctx.createGain();
    this.hetGain.gain.value = 0;
    this.het.connect(this.hetGain).connect(this.speakerIn);
    this.het.start();

    /* ---- station program bus ---- */
    this.stationGain = ctx.createGain();
    this.stationGain.gain.value = 0;
    this.stationGain.connect(this.speakerIn);

    /* mains hum for CANARIA's carrier */
    this.hum = ctx.createOscillator();
    this.hum.type = 'sawtooth';
    this.hum.frequency.value = 120;
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0;
    this.hum.connect(this.humGain).connect(this.speakerIn);
    this.hum.start();
  }

  _softClipCurve(k) {
    const n = 512, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    return curve;
  }

  _noiseBuffer(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      brown = (brown + 0.02 * w) / 1.02;
      d[i] = w * 0.75 + brown * 3.2;
    }
    return buf;
  }

  /* ------------------------------------------------------------ */

  async toggle() {
    this._ensure();
    if (!this.on) {
      await this.ctx.resume();
      this.on = true;
      this._schedulePop();
    } else {
      this.on = false;
      if (this._popTimer) { clearTimeout(this._popTimer); this._popTimer = null; }
      await this.ctx.suspend();
    }
    return this.on;
  }

  /* random static crackle pops */
  _schedulePop() {
    if (!this.on) return;
    const delay = 300 + Math.random() * 2600;
    this._popTimer = setTimeout(() => {
      if (!this.on || !this.ctx) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuffer(0.05);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.12 + Math.random() * 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      src.connect(g).connect(this.speakerIn);
      src.start(t);
      this._schedulePop();
    }, delay);
  }

  /* called on every tuning change.
     dfKhz: signed offset to nearest station (kHz); locked: bool;
     station: nearest station object */
  setTuning(dfKhz, locked, station) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    const adf = Math.abs(dfKhz);

    /* AGC: hiss drops when the squelch opens */
    const hissTarget = locked ? 0.055 : 0.16 - 0.05 * Math.max(0, 1 - adf / 120);
    this.noiseGain.gain.setTargetAtTime(hissTarget, t, 0.18);

    /* heterodyne: audible beat while the needle crosses a carrier skirt */
    if (adf > 2.5 && adf < 70) {
      const beat = Math.min(4200, Math.max(90, adf * 58));
      this.het.frequency.setTargetAtTime(beat, t, 0.03);
      this.hetGain.gain.setTargetAtTime(0.05 * (1 - adf / 70), t, 0.05);
    } else {
      this.hetGain.gain.setTargetAtTime(0, t, 0.05);
    }

    /* program bus opens on lock */
    this.stationGain.gain.setTargetAtTime(locked ? 0.55 : 0, t, 0.12);

    /* CANARIA rides on a mains hum */
    const humOn = locked && station && station.id === 'V-08';
    this.humGain.gain.setTargetAtTime(humOn ? 0.016 : 0, t, 0.3);
  }

  /* token sounds from the decode ticker */
  play(snd) {
    if (!snd || !this.ctx || !this.on) return;
    switch (snd.k) {
      case 'digit': this._digit(snd.d, snd.pitch || 180); break;
      case 'syll': this._formant(this.ctx.currentTime + 0.01, snd.f1, snd.f2, snd.pitch || 180, snd.len || 0.11); break;
      case 'note': this._note(snd.f, snd.timbre); break;
      case 'morse': this._morse(snd.code); break;
      case 'rasp': this._rasp(); break;
    }
  }

  _digit(d, pitch) {
    let t = this.ctx.currentTime + 0.015;
    for (const syl of DIGIT_SYLLABLES[d]) {
      this._formant(t, syl.f1, syl.f2, pitch * (syl.pk || 1), syl.len);
      t += syl.len + 0.05;
    }
  }

  /* a vaguely human vowel: sawtooth larynx through two formant filters */
  _formant(t, f1, f2, pitch, len) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch * 1.1, t);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.93, t + len);

    const bp1 = ctx.createBiquadFilter();
    bp1.type = 'bandpass'; bp1.frequency.value = f1; bp1.Q.value = 7;
    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'bandpass'; bp2.frequency.value = f2; bp2.Q.value = 9;
    const g2 = ctx.createGain(); g2.gain.value = 0.65;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(2.4, t + 0.022);
    env.gain.setValueAtTime(2.4, t + len - 0.03);
    env.gain.linearRampToValueAtTime(0, t + len);

    osc.connect(bp1).connect(env);
    osc.connect(bp2).connect(g2).connect(env);
    env.connect(this.stationGain);

    /* soft consonant tick at onset */
    const click = ctx.createBufferSource();
    click.buffer = this._noiseBuffer(0.03);
    const cf = ctx.createBiquadFilter();
    cf.type = 'bandpass'; cf.frequency.value = f2; cf.Q.value = 2;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.5, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    click.connect(cf).connect(cg).connect(this.stationGain);
    click.start(t);

    osc.start(t);
    osc.stop(t + len + 0.05);
  }

  _note(f, timbre) {
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const env = ctx.createGain();
    env.connect(this.stationGain);

    if (timbre === 'box') {
      /* music box: pure tine + inharmonic partial, fast decay */
      const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = f;
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 4.16;
      const g2 = ctx.createGain(); g2.gain.value = 0.18;
      env.gain.setValueAtTime(0.5, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      o1.connect(env); o2.connect(g2).connect(env);
      o1.start(t); o2.start(t);
      o1.stop(t + 0.9); o2.stop(t + 0.9);
    } else {
      /* reed organ: detuned pair through a lowpass, held then released */
      const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = f;
      const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f * 1.004;
      const g2 = ctx.createGain(); g2.gain.value = 0.22;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2100;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.34, t + 0.04);
      env.gain.setValueAtTime(0.34, t + 0.3);
      env.gain.linearRampToValueAtTime(0, t + 0.42);
      o1.connect(lp); o2.connect(g2).connect(lp); lp.connect(env);
      o1.start(t); o2.start(t);
      o1.stop(t + 0.5); o2.stop(t + 0.5);
    }
  }

  _morse(code) {
    const ctx = this.ctx;
    const u = 0.062;
    let t = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 705;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    osc.connect(env).connect(this.stationGain);
    for (const c of code) {
      const len = c === '-' ? 3 * u : u;
      env.gain.setTargetAtTime(0.34, t, 0.004);
      env.gain.setTargetAtTime(0, t + len, 0.004);
      t += len + u;
    }
    osc.start();
    osc.stop(t + 0.1);
  }

  _rasp() {
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const dur = 0.92;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(64, t);
    osc.frequency.linearRampToValueAtTime(58, t + dur);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 430; bp.Q.value = 1.6;

    /* mechanical tremolo gate */
    const gate = ctx.createGain();
    gate.gain.value = 0.5;
    const trem = ctx.createOscillator();
    trem.type = 'square';
    trem.frequency.value = 27;
    const tremAmt = ctx.createGain();
    tremAmt.gain.value = 0.42;
    trem.connect(tremAmt).connect(gate.gain);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.5, t + 0.05);
    env.gain.setValueAtTime(0.5, t + dur - 0.08);
    env.gain.linearRampToValueAtTime(0, t + dur);

    osc.connect(bp).connect(gate).connect(env).connect(this.stationGain);
    osc.start(t); trem.start(t);
    osc.stop(t + dur + 0.05); trem.stop(t + dur + 0.05);
  }
}
