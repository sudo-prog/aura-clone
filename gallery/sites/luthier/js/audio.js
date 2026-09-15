// Karplus–Strong string synthesis, buffers built per pluck.
// Excitation: lowpassed noise burst run through a pluck-position comb filter,
// so where you pluck genuinely changes the timbre. Loop: y[n] = exc + ρ·½(y[n−N]+y[n−N−1]).

let ctx = null;
let body = null;      // body-EQ input node
let enabled = false;
const live = [];      // active sources, capped

export function isEnabled() { return enabled; }

export function enable() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    // modest violin-body EQ: low resonance hill + bridge hill + soft top
    const g = ctx.createGain(); g.gain.value = 0.9;
    const p1 = ctx.createBiquadFilter(); p1.type = 'peaking';
    p1.frequency.value = 250; p1.Q.value = 1.1; p1.gain.value = 3.5;
    const p2 = ctx.createBiquadFilter(); p2.type = 'peaking';
    p2.frequency.value = 2500; p2.Q.value = 0.9; p2.gain.value = 2.5;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.value = 8200; lp.Q.value = 0.5;
    g.connect(p1); p1.connect(p2); p2.connect(lp); lp.connect(ctx.destination);
    body = g;
  }
  if (ctx.state === 'suspended') ctx.resume();
  // if the toggle silenced us earlier, breathe the volume back in
  body.gain.cancelScheduledValues(ctx.currentTime);
  body.gain.setTargetAtTime(0.9, ctx.currentTime, 0.05);
  enabled = true;
}

export function disable() {
  enabled = false;
  // silence the ringing tails too — "off" must mean off, not "off in five seconds"
  if (ctx && body) {
    body.gain.cancelScheduledValues(ctx.currentTime);
    body.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.06);
  }
}

function buildKS(freq, pos, t60, bright) {
  const sr = ctx.sampleRate;
  const N = Math.max(2, Math.round(sr / freq));
  const dur = Math.min(t60 * 1.15 + 0.25, 5);
  const len = Math.floor(dur * sr);
  const buf = ctx.createBuffer(1, len, sr);
  const y = buf.getChannelData(0);

  // excitation: one delay-line of shaped noise
  const exc = new Float32Array(N);
  let lpState = 0;
  const lpCoef = 1 - Math.exp(-2 * Math.PI * (bright * 6500 + 900) / sr);
  for (let i = 0; i < N; i++) {
    lpState += lpCoef * ((Math.random() * 2 - 1) - lpState);
    exc[i] = lpState;
  }
  // pluck-position comb: cancel content with a node at the pluck point
  const D = Math.min(N - 1, Math.max(1, Math.round(pos * N)));
  for (let i = N - 1; i >= D; i--) exc[i] -= 0.92 * exc[i - D];

  // loop gain from t60: amplitude ×10^(−3/(f·t60)) per period
  const rho = Math.pow(10, -3 / (freq * t60));
  for (let i = 0; i < len; i++) {
    let v = i < N ? exc[i] : 0;
    if (i >= N) {
      const a = y[i - N];
      const b = i - N - 1 >= 0 ? y[i - N - 1] : a;
      v += rho * 0.5 * (a + b);
    }
    y[i] = v;
  }
  // normalize + fades (avoid clicks)
  let peak = 0;
  for (let i = 0; i < len; i++) { const a = Math.abs(y[i]); if (a > peak) peak = a; }
  const norm = peak > 0 ? 1 / peak : 1;
  const fadeIn = Math.floor(sr * 0.002), fadeOut = Math.floor(sr * 0.05);
  for (let i = 0; i < len; i++) {
    let g = norm;
    if (i < fadeIn) g *= i / fadeIn;
    if (i > len - fadeOut) g *= (len - i) / fadeOut;
    y[i] *= g;
  }
  return buf;
}

// gain 0..1 · bright 0..1 (harmonic flautati are darker/purer)
export function pluck(freq, pos, { t60 = 3, gain = 0.5, bright = 0.85 } = {}) {
  if (!enabled || !ctx) return;
  if (ctx.state === 'suspended') { ctx.resume(); }
  try {
    const buf = buildKS(freq, pos, t60, bright);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.16 * gain;
    src.connect(g); g.connect(body);
    src.start();
    live.push(src);
    src.onended = () => {
      const i = live.indexOf(src);
      if (i >= 0) live.splice(i, 1);
    };
    if (live.length > 8) {
      const old = live.shift();
      try { old.stop(); } catch (e) { /* already done */ }
    }
  } catch (e) { /* never let audio kill the page */ }
}
