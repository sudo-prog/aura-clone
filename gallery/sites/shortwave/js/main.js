/* SHORTWAVE — boot choreography, clock, reveals, OTP worksheet, wiring. */

import { BAND, STATIONS } from './stations.js';
import { RadioAudio } from './audio.js';
import { Waterfall } from './waterfall.js';
import { Receiver } from './receiver.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);

/* ------------------------------------------------------------ */
/* receiver assembly                                              */

const audio = new RadioAudio();

const els = {
  fallWrap: $('fall-wrap'),
  needle: $('needle'),
  freqDigits: $('freq-digits'),
  stationLine: $('station-line'),
  decodeLabel: $('decode-label'),
  ticker: $('ticker'),
  knob: $('knob'),
  knobFace: document.querySelector('.knob-face'),
  lampCarrier: $('lamp-carrier'),
  lampLock: $('lamp-lock'),
  smNeedle: $('sm-needle'),
  smPeak: $('sm-peak'),
  smTicks: $('sm-ticks'),
  ghost: $('ghost'),
  ghostFreq: $('ghost-freq'),
  passband: $('passband'),
};

const rx = new Receiver(els, audio, RM);

const wf = new Waterfall($('waterfall'), $('scope'), $('ruler'), STATIONS, RM);
wf.resize();
document.fonts.ready.then(() => wf.drawRuler());

let resizeQueued = false;
new ResizeObserver(() => {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => { resizeQueued = false; wf.resize(); rx.refreshTickerWidth(); });
}).observe(els.fallWrap);

/* ------------------------------------------------------------ */
/* main loop — pauses with the tab; waterfall pauses offscreen    */

let chassisVisible = true;
new IntersectionObserver(entries => {
  chassisVisible = entries[0].isIntersecting;
}, { threshold: 0.02 }).observe($('chassis'));

let last = performance.now(), tAcc = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  tAcc += dt;
  wf.frame(dt, rx.freq, chassisVisible);
  rx.frame(tAcc, dt, chassisVisible);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ------------------------------------------------------------ */
/* power-on choreography                                          */

const veil = $('boot-veil');
if (RM) {
  veil.classList.add('off');
} else {
  rx.setFreq(BAND.min);
  $('freq-readout').classList.add('flick');
  setTimeout(() => veil.classList.add('off'), 380);
  setTimeout(() => rx.tuneTo(6630, 1900), 1000);
}

/* masthead letters warm up like filaments */
const wm = $('wordmark');
const letters = [...wm.textContent];
wm.setAttribute('aria-label', wm.textContent); /* SRs must not spell it out */
wm.textContent = '';
letters.forEach((ch, i) => {
  const s = document.createElement('span');
  s.className = 'wl';
  s.setAttribute('aria-hidden', 'true');
  s.textContent = ch;
  wm.appendChild(s);
  setTimeout(() => s.classList.add('lit'), RM ? 0 : 160 + i * 55);
});

/* ------------------------------------------------------------ */
/* UTC clock                                                      */

const clockEl = $('utc-clock');
function tickClock() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  clockEl.textContent = `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}
tickClock();
setInterval(tickClock, 1000);

/* ------------------------------------------------------------ */
/* audio button                                                   */

const audioBtn = $('audio-btn');
audioBtn.addEventListener('click', async () => {
  const on = await audio.toggle();
  audioBtn.setAttribute('aria-pressed', String(on));
  audioBtn.querySelector('.audio-btn-txt').textContent = on ? 'AUDIO OFF' : 'AUDIO ON';
  $('lamp-audio').classList.toggle('on', on);
  rx.setFreq(rx.freq); /* re-apply gains for current tuning */
});

/* ------------------------------------------------------------ */
/* dossier TUNE buttons                                           */

document.querySelectorAll('.tune-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const f = Number(btn.dataset.freq);
    document.getElementById('receiver').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
    rx.tuneTo(f, RM ? 0 : 1500);
  });
});

/* ------------------------------------------------------------ */
/* scroll reveals                                                 */

const revEls = document.querySelectorAll('.sec-head, .dossier, .worksheet, .tty-report, .rx-caption, .pad-prose, .colophon-inner');
revEls.forEach(el => el.classList.add('rev'));
const dossiers = [...document.querySelectorAll('.dossier')];
const io = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const el = e.target;
    const di = dossiers.indexOf(el);
    if (di > 0) el.style.transitionDelay = `${(di % 2) * 90}ms`;
    el.classList.add('in');
    io.unobserve(el);
  }
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
revEls.forEach(el => io.observe(el));

/* ------------------------------------------------------------ */
/* one-time pad worksheet                                         */

const MSG = [7, 3, 1, 4, 0, 8, 8, 2, 6, 5];
let pad = [], sum = [];
const wsMsg = $('ws-msg'), wsPad = $('ws-pad'), wsSum = $('ws-sum');
const wsNote = $('ws-note'), wsRun = $('ws-run'), wsNew = $('ws-new');
let running = false;

function renderDigits(el, arr, pending = false) {
  el.innerHTML = '';
  arr.forEach(d => {
    const s = document.createElement('span');
    s.textContent = d;
    if (pending) s.classList.add('pending');
    el.appendChild(s);
  });
}

function newPad(note) {
  pad = MSG.map(() => Math.floor(Math.random() * 10));
  sum = MSG.map((m, i) => (m + pad[i]) % 10);
  renderDigits(wsMsg, MSG);
  renderDigits(wsPad, pad);
  renderDigits(wsSum, sum, true);
  if (note) wsNote.textContent = note;
}
newPad();

wsRun.addEventListener('click', () => {
  if (running) return;
  running = true;
  wsRun.disabled = true;
  const cols = MSG.length;
  const stepMs = RM ? 60 : 300;
  let i = 0;
  const step = () => {
    [wsMsg, wsPad, wsSum].forEach(el =>
      [...el.children].forEach((c, j) => c.classList.toggle('hot', j === i)));
    wsSum.children[i].classList.remove('pending');
    const raw = MSG[i] + pad[i];
    wsNote.textContent = raw >= 10
      ? `${MSG[i]} + ${pad[i]} = ${raw} → drop the carry → ${sum[i]}`
      : `${MSG[i]} + ${pad[i]} = ${sum[i]}`;
    i++;
    if (i < cols) {
      setTimeout(step, stepMs);
    } else {
      setTimeout(() => {
        [wsMsg, wsPad, wsSum].forEach(el =>
          [...el.children].forEach(c => c.classList.remove('hot')));
        wsNote.textContent = 'Ten digits sent. Without sheet 0447, every ten-digit message is an equally valid reading — that is the whole proof.';
        wsRun.disabled = false;
        running = false;
      }, stepMs + 200);
    }
  };
  step();
});

wsNew.addEventListener('click', () => {
  if (running) return;
  newPad('Same message, new pad. Compare this SENT row with the last one: no digit, no pattern, no relation survives the swap.');
});
