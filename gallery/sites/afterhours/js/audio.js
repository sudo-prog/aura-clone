// AFTER HOURS — the room's sound, synthesized from nothing.
// Vinyl crackle + a walking upright bass (12-bar blues in F, ~88 bpm)
// + brushes on two and four. No samples, no files. Gated behind a
// user gesture AND the needle actually being in the groove.

const toggle = document.getElementById('soundToggle');

let ctx = null;
let master = null;
let crackleSrc = null;
let schedTimer = 0;
let nextNoteTime = 0;
let beatIndex = 0;
let armed = false;        // user pressed the button
let needleOn = false;     // stylus is in the groove
let playing = false;

const TEMPO = 88;
const BEAT = 60 / TEMPO;

// Two hand-written choruses of walking bass in F (MIDI numbers).
const LINE = [
  // chorus A
  29, 33, 36, 39,   34, 38, 41, 40,   41, 39, 36, 33,   29, 31, 33, 34,
  34, 38, 41, 44,   46, 44, 41, 38,   41, 36, 33, 29,   29, 33, 36, 40,
  36, 40, 43, 46,   34, 36, 38, 40,   41, 39, 38, 36,   36, 34, 31, 28,
  // chorus B
  29, 36, 33, 31,   34, 33, 32, 31,   29, 33, 36, 39,   41, 40, 39, 38,
  34, 38, 41, 40,   39, 38, 37, 36,   41, 45, 44, 43,   41, 39, 36, 34,
  36, 43, 40, 38,   34, 38, 40, 41,   29, 33, 34, 33,   36, 31, 30, 28,
];

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function ensureContext() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
}

// ---- vinyl crackle: sparse pops over faint filtered surface noise ----
function buildCrackleBuffer() {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    brown = brown * 0.94 + white * 0.06;
    d[i] = brown * 0.11;                       // surface hush
    if (Math.random() < 0.00022) {             // a pop
      const amp = 0.12 + Math.random() * 0.3;
      const dur = 30 + (Math.random() * 60) | 0;
      for (let k = 0; k < dur && i + k < len; k++) {
        d[i + k] += (Math.random() * 2 - 1) * amp * Math.exp(-k / (dur * 0.3));
      }
      i += dur;
    }
  }
  return buf;
}

function startCrackle() {
  crackleSrc = ctx.createBufferSource();
  crackleSrc.buffer = buildCrackleBuffer();
  crackleSrc.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 220;
  const g = ctx.createGain();
  g.gain.value = 0.5;
  crackleSrc.connect(hp).connect(g).connect(master);
  crackleSrc.start();
}

// ---- upright bass note ----
function bassNote(time, midi, dur) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const cents = (Math.random() - 0.5) * 10;
  osc.frequency.value = midiHz(midi) * Math.pow(2, cents / 1200);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  lp.Q.value = 0.7;

  const g = ctx.createGain();
  const v = 0.42 + Math.random() * 0.1;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(v, time + 0.012);
  g.gain.exponentialRampToValueAtTime(v * 0.55, time + dur * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

  // the finger's thump
  const th = ctx.createOscillator();
  th.type = 'sine';
  th.frequency.setValueAtTime(90, time);
  th.frequency.exponentialRampToValueAtTime(45, time + 0.06);
  const tg = ctx.createGain();
  tg.gain.setValueAtTime(0.12, time);
  tg.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);

  osc.connect(lp).connect(g).connect(master);
  th.connect(tg).connect(master);
  osc.start(time);
  osc.stop(time + dur + 0.05);
  th.start(time);
  th.stop(time + 0.09);
}

// ---- brushes on 2 and 4 ----
function brush(time) {
  const len = ctx.sampleRate * 0.1 | 0;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35));
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 5200;
  bp.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.value = 0.045;
  src.connect(bp).connect(g).connect(master);
  src.start(time);
}

function scheduler() {
  while (nextNoteTime < ctx.currentTime + 0.18) {
    const midi = LINE[beatIndex % LINE.length];
    const human = (Math.random() - 0.5) * 0.014;
    bassNote(nextNoteTime + human, midi, BEAT * 0.96);
    if (beatIndex % 4 === 1 || beatIndex % 4 === 3) brush(nextNoteTime + human);
    nextNoteTime += BEAT;
    beatIndex++;
  }
}

// the soft thunk of a stylus meeting wax
function thump() {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.2);
}

// the button never lies: idle → armed-and-waiting → live
function setLabel() {
  toggle.classList.toggle('live', playing);
  if (!armed) {
    toggle.innerHTML = '<span aria-hidden="true">♪</span>&nbsp; Hear the room';
  } else {
    const eq = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>';
    toggle.innerHTML = playing
      ? `${eq}&nbsp; Room is live — mute`
      : `${eq}&nbsp; Sound on the drop — mute`;
  }
}

function startRoom() {
  if (playing || !armed || !needleOn) return;
  ensureContext();
  if (ctx.state === 'suspended') ctx.resume();
  playing = true;
  setLabel();
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.85, ctx.currentTime + 0.5);
  thump();
  startCrackle();
  nextNoteTime = ctx.currentTime + 0.35;
  beatIndex = 0;
  schedTimer = setInterval(scheduler, 40);
}

function stopRoom() {
  if (!playing) return;
  playing = false;
  setLabel();
  clearInterval(schedTimer);
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  const src = crackleSrc;
  if (src) setTimeout(() => { try { src.stop(); } catch (_) {} }, 350);
  crackleSrc = null;
}

toggle.addEventListener('click', () => {
  armed = !armed;
  toggle.setAttribute('aria-pressed', String(armed));
  if (armed) {
    ensureContext();
    if (ctx.state === 'suspended') ctx.resume();
    startRoom();
  } else {
    stopRoom();
  }
  setLabel();
});

addEventListener('needlelanded', () => {
  needleOn = true;
  startRoom();
});

addEventListener('needlelifted', () => {
  needleOn = false;
  stopRoom();
});

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) {
    if (ctx.state === 'running') ctx.suspend();
  } else if (playing || armed) {
    ctx.resume();
  }
});
