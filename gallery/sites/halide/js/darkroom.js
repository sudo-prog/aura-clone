/* The signature: a 16×20 of frame 21 develops in the DEV tray under safelight.
   Physically honest emergence — shadows arrive first, highlights cling to the
   paper — with liquid row-displacement ripple and agitation on pointer move. */

import { renderLum } from './scene.js';

const DEV_SECONDS = 90;      /* what the Gralab believes */
const REAL_MS = 17000;       /* how long we actually make you wait */

export function initDarkroom({ reducedMotion = false } = {}) {
  const section = document.getElementById('darkroom');
  const canvas = document.getElementById('printcanvas');
  if (!section || !canvas) return;

  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  const border = Math.round(W * 0.052);
  const iw = W - border * 2, ih = H - border * 2;

  /* frame 21 — same seed the grease pencil circled upstairs */
  const lum = renderLum(iw, ih, { type: 'headland', seed: 2107, exposure: 1.0, contrast: 1.22, grain: 0.045 });

  const buf = document.createElement('canvas');
  buf.width = W; buf.height = H;
  const bctx = buf.getContext('2d');
  const img = bctx.createImageData(W, H);
  const data = img.data;

  const readout = document.getElementById('devreadout');
  const hand = document.getElementById('ghand');
  const steps = document.getElementById('chemsteps');
  const hint = document.getElementById('agitatehint');
  const bath = section.querySelector('.bath');

  let p = 0, target = 0;
  let running = false, rafId = 0, last = 0;
  let agitUntil = 0;
  /* the bench keeps working after the develop: dev → stop → fix → wash */
  let phase = 'dev', phaseAt = 0;
  const STOP_MS = 6000, FIX_MS = 14000; /* compressed bench clock */
  const waves = [], rings = [];

  function scrollP() {
    const r = section.getBoundingClientRect();
    const vh = innerHeight || 900;
    /* scroll advances the bath but never finishes it — the last stretch
       always happens in front of you, in real seconds */
    const t = (vh * 0.92 - r.top) / (r.height * 0.9);
    return Math.max(0, Math.min(0.85, t * 0.9));
  }

  function paintDeveloped(t, ts) {
    let i = 0, j = 0;
    const shimmer = !reducedMotion && t > 0.02 && t < 0.995;
    for (let y = 0; y < H; y++) {
      const inY = y >= border && y < H - border;
      for (let x = 0; x < W; x++, i += 4) {
        let v;
        if (inY && x >= border && x < W - border) {
          const D = 1 - lum[j++];
          let k = (t * 1.62 - (1 - D) * 0.78) / 0.6;
          k = k < 0 ? 0 : k > 1 ? 1 : k;
          k = k * k * (3 - 2 * k);
          v = 1 - D * k;
          if (shimmer && k > 0.02 && k < 0.98) v += (Math.random() - 0.5) * 0.22 * k * (1 - k);
        } else {
          v = 0.965; /* paper margin stays paper */
        }
        if (v < 0) v = 0; else if (v > 1) v = 1;
        data[i] = 32 + v * 223;      /* everything lives under the safelight */
        data[i + 1] = 8 + v * 92;
        data[i + 2] = 6 + v * 74;
        data[i + 3] = 255;
      }
    }
    bctx.putImageData(img, 0, 0);

    /* liquid: band displacement from ambient + agitation waves */
    ctx.clearRect(0, 0, W, H);
    const band = 4;
    for (let y = 0; y < H; y += band) {
      let dx = 0;
      if (!reducedMotion) {
        dx += Math.sin(y * 0.05 + ts * 0.0011) * 0.8 + Math.sin(y * 0.013 - ts * 0.0007) * 0.6;
        for (let w = 0; w < waves.length; w++) {
          const wv = waves[w];
          const age = (ts - wv.born) / 1000;
          dx += wv.amp * Math.exp(-age * wv.decay) * Math.sin(y * wv.freq + wv.phase + age * wv.speed);
        }
      }
      ctx.drawImage(buf, 0, y, W, band, dx, y, W, band);
    }
    for (let w = waves.length - 1; w >= 0; w--) {
      if (ts - waves[w].born > 2600) waves.splice(w, 1);
    }

    /* agitation rings — specular ripples on the developer surface */
    if (!reducedMotion && rings.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = rings.length - 1; k >= 0; k--) {
        const rg = rings[k];
        rg.r += rg.vr; rg.alpha *= 0.955;
        if (rg.alpha < 0.012) { rings.splice(k, 1); continue; }
        ctx.strokeStyle = `rgba(255,120,92,${rg.alpha.toFixed(3)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(rg.x, rg.y, rg.r, rg.r * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function fmt(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function markStep(doneStep, activeStep) {
    if (!steps) return;
    const d = steps.querySelector(`[data-step="${doneStep}"]`);
    const a = steps.querySelector(`[data-step="${activeStep}"]`);
    if (d) { d.classList.remove('active'); d.classList.add('done'); }
    if (a) a.classList.add('active');
  }

  function updateTimer(pNow, ts) {
    if (phase === 'dev') {
      const clock = pNow * DEV_SECONDS;
      if (hand) hand.style.transform = `rotate(${clock * 6}deg)`;
      if (readout) readout.textContent = `DEV ${fmt(clock)} / 1:30 · DEKTOL 1:2 · 20.0°C`;
      if (pNow >= 1) {
        phase = 'stop'; phaseAt = ts;
        markStep('dev', 'stop');
        if (readout) readout.textContent = 'DEV 1:30 ✓ · INTO THE STOP';
        if (hint) hint.textContent = '— she pulls it at ninety, every time, by feel —';
      }
    } else if (phase === 'stop') {
      const q = Math.min(1, (ts - phaseAt) / STOP_MS);
      if (hand) hand.style.transform = `rotate(${(90 + q * 30) * 6}deg)`;
      if (readout) readout.textContent = `STOP ${fmt(q * 30)} / 0:30 · INDICATOR STILL YELLOW`;
      if (q >= 1) {
        phase = 'fix'; phaseAt = ts;
        markStep('stop', 'fix');
        if (hint) hint.textContent = '— thirty calm seconds of stop buys an honest fix —';
      }
    } else if (phase === 'fix') {
      const q = Math.min(1, (ts - phaseAt) / FIX_MS);
      if (hand) hand.style.transform = `rotate(${(120 + q * 300) * 6}deg)`;
      if (readout) readout.textContent = `FIX ${fmt(q * 300)} / 5:00 · RAPID FIX 1:4`;
      if (q >= 1) {
        phase = 'wash';
        markStep('fix', 'wash');
        if (readout) readout.textContent = 'WASH RUNNING · FIBER TAKES THE HOUR IT TAKES';
        if (hint) hint.textContent = '— come back at closing. it will be worth it —';
      }
    }
  }

  function frame(ts) {
    if (!running) { rafId = 0; return; }
    const dt = last ? Math.min(64, ts - last) : 16;
    last = ts;
    const speed = ts < agitUntil ? 1.65 : 1;
    target = Math.min(1, Math.max(target + (dt / REAL_MS) * speed, scrollP()));
    p += (target - p) * Math.min(1, dt / 200);
    if (target >= 1 && p > 0.996) p = 1;
    paintDeveloped(p, ts);
    updateTimer(p, ts);
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reducedMotion) return;
    running = true; last = 0;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  if (reducedMotion) {
    p = 1; target = 1;
    paintDeveloped(1, 0);
    updateTimer(1, 0);
  } else {
    new IntersectionObserver(entries => {
      entries.forEach(e => (e.isIntersecting && !document.hidden ? start() : stop()));
    }, { threshold: 0.05 }).observe(section);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else {
        const r = section.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) start();
      }
    });

    /* agitate: move your hand through the bath */
    let lastAgit = 0;
    bath.addEventListener('pointermove', ev => {
      const now = performance.now();
      if (now - lastAgit < 90) return;
      lastAgit = now;
      const box = canvas.getBoundingClientRect();
      const x = (ev.clientX - box.left) / box.width * W;
      const y = (ev.clientY - box.top) / box.height * H;
      if (rings.length < 14) rings.push({ x, y, r: 4, vr: 1.9, alpha: 0.30 });
      if (waves.length < 8) {
        waves.push({ amp: 2.4, freq: 0.07 + Math.random() * 0.05, phase: Math.random() * 6.28, speed: 7, decay: 1.5, born: now });
      }
      agitUntil = now + 1800;
    }, { passive: true });
  }
}
