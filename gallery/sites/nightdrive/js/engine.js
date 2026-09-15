// NIGHTDRIVE — the engine. Generated synthwave: ignition SFX, then a
// scheduled arpeggio through a sweeping lowpass, bass, pads and a drum machine.
// The lowpass opens as you drive faster (setDrive).

const BPM = 112;
const STEP = 60 / BPM / 4; // one 16th note
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// i — VI — III — VII in A minor, one bar each
const PROG = [
  { bass: 33, arp: [57, 60, 64, 69], pad: [45, 52, 57, 60] }, // Am
  { bass: 29, arp: [57, 60, 65, 69], pad: [41, 48, 57, 60] }, // F
  { bass: 36, arp: [55, 60, 64, 67], pad: [48, 55, 60, 64] }, // C
  { bass: 31, arp: [55, 59, 62, 67], pad: [43, 50, 59, 62] }, // G
];
const ARP_PATTERN = [0, 1, 2, 3, 1, 2, 3, 2, 0, 1, 2, 3, 2, 3, 1, 2];

export class NightEngine {
  constructor() {
    this.ctx = null;
    this.running = false;
    this.driveBoost = 0; // 0..1 from scroll speed
    this._timer = null;
    this._step = 0;
    this._nextTime = 0;
    this._levels = null;
  }

  _build() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.78;
    this._levels = new Uint8Array(this.analyser.frequencyBinCount);

    this.master.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // arp bus: sweep filter → delay throw
    this.arpFilter = ctx.createBiquadFilter();
    this.arpFilter.type = 'lowpass';
    this.arpFilter.Q.value = 8.5;
    this.arpFilter.frequency.value = 700;

    this.arpBus = ctx.createGain();
    this.arpBus.gain.value = 0.16;
    this.arpBus.connect(this.arpFilter);
    this.arpFilter.connect(this.master);

    this.delay = ctx.createDelay(1.0);
    this.delay.delayTime.value = STEP * 3; // dotted eighth
    this.delayFb = ctx.createGain();
    this.delayFb.gain.value = 0.34;
    this.delayWet = ctx.createGain();
    this.delayWet.gain.value = 0.2;
    this.arpFilter.connect(this.delay);
    this.delay.connect(this.delayFb);
    this.delayFb.connect(this.delay);
    this.delay.connect(this.delayWet);
    this.delayWet.connect(this.master);

    // bass bus
    this.bassFilter = ctx.createBiquadFilter();
    this.bassFilter.type = 'lowpass';
    this.bassFilter.frequency.value = 340;
    this.bassBus = ctx.createGain();
    this.bassBus.gain.value = 0.34;
    this.bassBus.connect(this.bassFilter);
    this.bassFilter.connect(this.master);

    // pad bus
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 900;
    this.padBus = ctx.createGain();
    this.padBus.gain.value = 0.05;
    this.padBus.connect(this.padFilter);
    this.padFilter.connect(this.master);

    // drum bus
    this.drumBus = ctx.createGain();
    this.drumBus.gain.value = 0.5;
    this.drumBus.connect(this.master);

    // shared noise buffer
    const len = ctx.sampleRate * 1.2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // tape hiss, always under the mix
    const hiss = ctx.createBufferSource();
    hiss.buffer = this.noiseBuf;
    hiss.loop = true;
    const hissLp = ctx.createBiquadFilter();
    hissLp.type = 'lowpass';
    hissLp.frequency.value = 6200;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.006;
    hiss.connect(hissLp);
    hissLp.connect(hissGain);
    hissGain.connect(this.master);
    hiss.start();
  }

  _ignition(t0) {
    const ctx = this.ctx;
    // starter crank: chattering bandpassed noise
    const crank = ctx.createBufferSource();
    crank.buffer = this.noiseBuf;
    const crankBp = ctx.createBiquadFilter();
    crankBp.type = 'bandpass';
    crankBp.frequency.setValueAtTime(340, t0);
    crankBp.frequency.linearRampToValueAtTime(160, t0 + 0.4);
    crankBp.Q.value = 2.5;
    const crankGain = ctx.createGain();
    const chop = ctx.createGain();
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 13;
    const lfoAmp = ctx.createGain();
    lfoAmp.gain.value = 0.5;
    lfo.connect(lfoAmp);
    chop.gain.value = 0.5;
    lfoAmp.connect(chop.gain);
    crankGain.gain.setValueAtTime(0.5, t0);
    crankGain.gain.linearRampToValueAtTime(0.0, t0 + 0.42);
    crank.connect(crankBp); crankBp.connect(chop); chop.connect(crankGain);
    crankGain.connect(this.drumBus);
    crank.start(t0); crank.stop(t0 + 0.45);
    lfo.start(t0); lfo.stop(t0 + 0.45);

    // the catch: sub swell + rev
    const rev = ctx.createOscillator();
    rev.type = 'sawtooth';
    rev.frequency.setValueAtTime(46, t0 + 0.38);
    rev.frequency.exponentialRampToValueAtTime(150, t0 + 0.72);
    rev.frequency.exponentialRampToValueAtTime(68, t0 + 1.15);
    const revLp = ctx.createBiquadFilter();
    revLp.type = 'lowpass';
    revLp.frequency.value = 520;
    const revGain = ctx.createGain();
    revGain.gain.setValueAtTime(0, t0 + 0.38);
    revGain.gain.linearRampToValueAtTime(0.5, t0 + 0.5);
    revGain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.3);
    rev.connect(revLp); revLp.connect(revGain); revGain.connect(this.drumBus);
    rev.start(t0 + 0.38); rev.stop(t0 + 1.35);
  }

  _scheduleStep(step, t) {
    const bar = Math.floor(step / 16) % 4;
    const s16 = step % 16;
    const chord = PROG[bar];

    // --- arp (16ths) ---
    const arpNote = chord.arp[ARP_PATTERN[s16]] + (s16 % 8 === 7 ? 12 : 0);
    this._voice({
      t, freq: midi(arpNote), type: 'sawtooth',
      attack: 0.004, hold: STEP * 0.55, release: 0.06,
      gain: s16 % 4 === 0 ? 1.0 : 0.72,
      bus: this.arpBus,
    });

    // --- filter sweep: slow 8-bar wave + drive boost ---
    const sweepPhase = (step % 128) / 128;
    const sweep = 0.5 - 0.5 * Math.cos(sweepPhase * Math.PI * 2);
    const cutoff = 520 + sweep * 2400 + this.driveBoost * 3600;
    this.arpFilter.frequency.setTargetAtTime(cutoff, t, 0.08);

    // --- bass (8ths, root; octave pop on the last 8th) ---
    if (s16 % 2 === 0) {
      const oct = s16 === 14 ? 12 : 0;
      this._voice({
        t, freq: midi(chord.bass + oct), type: 'square',
        attack: 0.005, hold: STEP * 1.5, release: 0.05,
        gain: s16 % 4 === 0 ? 1.0 : 0.8,
        bus: this.bassBus,
      });
    }

    // --- pad (bar-long, two detuned saws) ---
    if (s16 === 0) {
      const barDur = STEP * 16;
      for (const m of chord.pad) {
        for (const det of [-7, 7]) {
          this._voice({
            t, freq: midi(m), detune: det, type: 'sawtooth',
            attack: barDur * 0.3, hold: barDur * 0.55, release: barDur * 0.3,
            gain: 1.0,
            bus: this.padBus,
          });
        }
      }
    }

    // --- drums ---
    if (s16 % 4 === 0) this._kick(t);
    if (s16 === 4 || s16 === 12) this._snare(t);
    if (s16 % 2 === 1) this._hat(t, s16 % 4 === 3 ? 0.5 : 0.28);
  }

  _voice({ t, freq, type, attack, hold, release, gain, bus, detune = 0 }) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, t + attack + hold);
    g.gain.linearRampToValueAtTime(0, t + attack + hold + release);
    osc.connect(g);
    g.connect(bus);
    osc.start(t);
    osc.stop(t + attack + hold + release + 0.02);
  }

  _kick(t) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(148, t);
    osc.frequency.exponentialRampToValueAtTime(44, t + 0.11);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    osc.connect(g); g.connect(this.drumBus);
    osc.start(t); osc.stop(t + 0.3);
  }

  _snare(t) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.34, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    n.connect(bp); bp.connect(g); g.connect(this.drumBus);
    n.start(t); n.stop(t + 0.2);
  }

  _hat(t, level) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12 * level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    n.connect(hp); hp.connect(g); g.connect(this.drumBus);
    n.start(t); n.stop(t + 0.06);
  }

  _scheduler() {
    const AHEAD = 0.14;
    while (this._nextTime < this.ctx.currentTime + AHEAD) {
      this._scheduleStep(this._step, this._nextTime);
      this._nextTime += STEP;
      this._step++;
    }
  }

  async start() {
    if (this.running) return;
    if (!this.ctx) this._build();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    const t0 = this.ctx.currentTime + 0.03;
    this._ignition(t0);
    // music enters as the rev settles
    this._step = 0;
    this._nextTime = t0 + 1.05;
    this.master.gain.cancelScheduledValues(t0);
    this.master.gain.setValueAtTime(this.master.gain.value, t0);
    this.master.gain.linearRampToValueAtTime(0.82, t0 + 1.4);
    this._timer = setInterval(() => this._scheduler(), 25);
    this.running = true;
  }

  async stop() {
    if (!this.running) return;
    clearInterval(this._timer);
    this._timer = null;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 0.45);
    this.running = false;
    const ctx = this.ctx;
    setTimeout(() => {
      if (!this.running && ctx.state === 'running') ctx.suspend();
    }, 600);
  }

  setDrive(x) {
    this.driveBoost = Math.max(0, Math.min(1, x));
  }

  // n grouped bar levels 0..1, log-spaced across the spectrum
  getLevels(n) {
    if (!this.analyser) return null;
    this.analyser.getByteFrequencyData(this._levels);
    const bins = this._levels;
    const out = new Float32Array(n);
    const maxBin = 200; // ignore the very top of the spectrum
    for (let i = 0; i < n; i++) {
      const a = Math.floor(Math.pow(i / n, 1.6) * maxBin);
      const b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / n, 1.6) * maxBin));
      let sum = 0;
      for (let j = a; j < b; j++) sum += bins[j];
      out[i] = sum / (b - a) / 255;
    }
    return out;
  }
}
