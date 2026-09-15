// Harmonics explorer: one long live string; touching ½ ⅓ ¼ forces a node,
// killing every mode that moves there. Survivors ring on as a pure flautato.
import { STRINGS, VString, makeSinTable, reducedMotion } from './physics.js';
import * as audio from './audio.js';

const PTS = 200;
const N_MODES = 14;
const MAX_DEFLECT = 40;

// note names in solfège for m× each open string (harmonic = exact multiple)
const HARM_NAMES = {
  2: { it: "l'ottava", en: 'the octave' },
  3: { it: 'la duodecima', en: 'octave + fifth' },
  4: { it: 'la quindicesima', en: 'the double octave' },
};
const NOTE_AT = [
  // [open, ×2, ×3, ×4] solfège names, octave number in plain digits
  // (Cutive Mono has no subscript glyphs — fallback subs look borrowed)
  ['SOL3', 'SOL4', 'RE5', 'SOL5'],
  ['RE4', 'RE5', 'LA5', 'RE6'],
  ['LA4', 'LA5', 'MI6', 'LA6'],
  ['MI5', 'MI6', 'SI6', 'MI7'],
];

export function initHarmonics() {
  const canvas = document.getElementById('harmCanvas');
  const ctx = canvas.getContext('2d');
  const stage = canvas.parentElement;
  const readMain = document.querySelector('#harmReadout .ro-main');
  const readSub = document.querySelector('#harmReadout .ro-sub');
  const sinTab = makeSinTable(N_MODES, PTS);
  const buf = new Float64Array(PTS + 1);

  let idx = 2; // LA
  let str = new VString(STRINGS[idx], N_MODES);
  // slower decay for the explorer — let harmonics ring
  let W = 0, H = 0, dpr = 1, x0 = 0, x1 = 0, yMid = 0;
  let running = false, visible = !document.hidden, onscreen = true;
  let last = 0, rafId = 0;
  let dragOn = false, dragPid = -1;
  let prev = null;
  let activeNode = null; // button element

  function makeString(i) {
    const spec = { ...STRINGS[i], tau: STRINGS[i].tau * 1.5 };
    const s = new VString(spec, N_MODES);
    return s;
  }
  str = makeString(idx);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    x0 = Math.max(30, W * 0.055);
    x1 = W - x0;
    yMid = H / 2;
    stage.style.setProperty('--sx0', x0 + 'px');
    stage.style.setProperty('--sx1', x0 + 'px');
    document.querySelectorAll('.node').forEach((b) => {
      b.style.left = (parseFloat(b.dataset.p) * 100) + '%';
    });
  }

  // live harmonic content — the twelve lowest modes as a decaying spectrum.
  // Touch ⅓ and only 3·6·9·12 stand; the dead modes leave empty tracks.
  const SPEC_N = 12;
  function drawSpectrum() {
    const baseY = yMid - 44;
    const maxH = Math.min(46, baseY - 26);
    if (maxH < 18) return; // no room, no clutter
    const pitch = Math.min(26, (x1 - x0) * 0.045);
    const xc = (x0 + x1) / 2;
    const xs = xc - ((SPEC_N - 1) * pitch) / 2;
    ctx.textAlign = 'center';
    ctx.font = '10px "Cutive Mono", monospace';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(239,227,198,0.42)';
    ctx.fillText('contenuto armonico', xc, baseY - maxH - 10);
    for (let k = 0; k < SPEC_N; k++) {
      const x = xs + k * pitch;
      ctx.fillStyle = 'rgba(232,200,125,0.07)';
      ctx.fillRect(x - 1, baseY - maxH, 2, maxH);
      const a = Math.abs(str.amp[k]);
      const h = Math.min(1, a / 10) * maxH;
      if (h > 0.5) {
        ctx.fillStyle = str.mask
          ? 'rgba(208,102,46,0.85)'
          : `rgba(232,200,125,${0.3 + 0.55 * (h / maxH)})`;
        ctx.fillRect(x - 2.5, baseY - h, 5, h);
      }
      ctx.font = '9px "Cutive Mono", monospace';
      ctx.textBaseline = 'top';
      ctx.fillStyle = (str.mask && (k + 1) % str.mask === 0)
        ? 'rgba(232,200,125,0.75)'
        : 'rgba(239,227,198,0.35)';
      ctx.fillText(String(k + 1), x, baseY + 4);
    }
    ctx.textBaseline = 'alphabetic';
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const spec = str.spec;

    // terminals
    ctx.fillStyle = 'rgba(199,154,82,0.5)';
    ctx.fillRect(x0 - 3, yMid - 9, 2, 18);
    ctx.fillRect(x1 + 1, yMid - 9, 2, 18);

    drawSpectrum();

    // standing-wave envelope + node marks while a harmonic is held
    if (str.mask >= 2) {
      const m = str.mask;
      ctx.strokeStyle = 'rgba(232,200,125,0.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      for (const sign of [1, -1]) {
        ctx.beginPath();
        for (let i = 0; i <= PTS; i++) {
          const x = x0 + (i / PTS) * (x1 - x0);
          const y = yMid + sign * 30 * Math.abs(Math.sin((m * Math.PI * i) / PTS));
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // nodes: points of stillness
      ctx.fillStyle = '#E8C87D';
      for (let k = 1; k < m; k++) {
        const x = x0 + (k / m) * (x1 - x0);
        ctx.beginPath();
        ctx.moveTo(x, yMid - 5); ctx.lineTo(x + 4, yMid);
        ctx.lineTo(x, yMid + 5); ctx.lineTo(x - 4, yMid);
        ctx.closePath(); ctx.fill();
      }
      // the touching finger
      if (str.touchP > 0) {
        const fx = x0 + str.touchP * (x1 - x0);
        ctx.beginPath();
        ctx.arc(fx, yMid, 7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(208,102,46,0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // glow
    if (str.energy > 0.35 || str.drag) {
      const e = Math.min(1, (str.drag ? Math.abs(str.drag.h) / MAX_DEFLECT : str.energy / 30));
      strokeShape(spec.glow + (0.10 + e * 0.2) + ')', spec.thick + 8, 0);
    }
    if (str.energy > 0.6 && !str.drag) {
      strokeShape(spec.glow + '0.15)', spec.thick + 0.4, -0.009);
      strokeShape(spec.glow + '0.15)', spec.thick + 0.4, 0.009);
    }
    strokeShape(spec.color, spec.thick + 0.4, 0);
  }

  function strokeShape(style, width, ghostDt) {
    str.shape(buf, sinTab, PTS, ghostDt);
    ctx.beginPath();
    for (let i = 0; i <= PTS; i++) {
      const x = x0 + (i / PTS) * (x1 - x0);
      const y = yMid + buf[i];
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function frame(ts) {
    rafId = 0;
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    str.update(dt);
    draw();
    rafId = requestAnimationFrame(frame);
  }
  function setRunning(v) {
    if (v && !running) { running = true; last = performance.now(); if (!rafId) rafId = requestAnimationFrame(frame); }
    else if (!v && running) { running = false; if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }
  }
  function syncRun() { setRunning(visible && onscreen); }

  // ---------- harmonic touch ----------
  function touchHarmonic(m, p, btn) {
    // pluck first unless already ringing strongly, at a point that feeds the harmonic well
    if (str.energy < 8) str.pluck(0.23, 26);
    str.touch(m, p);
    if (activeNode) activeNode.classList.remove('is-on');
    activeNode = btn || null;
    if (activeNode) activeNode.classList.add('is-on');

    const spec = STRINGS[idx];
    const hz = spec.freq * m;
    const nm = HARM_NAMES[m];
    const modes = [];
    for (let k = m; k <= 12; k += m) modes.push(k);
    readMain.textContent =
      `node at ${p === 0.5 ? '½' : (Math.abs(p - 1 / 3) < 0.01 ? '⅓' : Math.abs(p - 2 / 3) < 0.01 ? '⅔' : p === 0.25 ? '¼' : '¾')}` +
      ` — modes ${modes.join('·')} survive — ${nm.it}: ${NOTE_AT[idx][m - 1]} · ${hz.toFixed(2)} Hz`;
    readSub.textContent =
      `${nm.en} above the open ${spec.name} — every mode that moved at that point is dead`;

    audio.pluck(hz, 0.5, { t60: 3.2, gain: 0.55, bright: 0.35 });
  }

  function openString(withPluck = true) {
    str.release();
    if (activeNode) { activeNode.classList.remove('is-on'); activeNode = null; }
    const spec = STRINGS[idx];
    if (withPluck) {
      str.pluck(0.27, 26);
      audio.pluck(spec.freq, 0.27, { t60: spec.t60 + 1, gain: 0.7, bright: 0.9 });
    }
    readMain.textContent =
      `corda libera — ${NOTE_AT[idx][0]} · ${spec.freq.toFixed(2)} Hz — all modes speak`;
    readSub.textContent = 'the kink you see travelling is the sum of every harmonic at once';
  }

  document.querySelectorAll('.node').forEach((b) => {
    b.addEventListener('click', () => {
      touchHarmonic(+b.dataset.m, parseFloat(b.dataset.p), b);
    });
  });
  document.getElementById('openString').addEventListener('click', () => openString(true));
  document.querySelectorAll('.pick').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.pick').forEach((x) => x.classList.remove('is-on'));
      b.classList.add('is-on');
      idx = +b.dataset.hstring;
      str = makeString(idx);
      openString(true);
    });
  });

  // ---------- direct interaction (same feel as the hero) ----------
  function toLocal(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
  }
  function xToP(x) { return Math.min(0.97, Math.max(0.03, (x - x0) / (x1 - x0))); }
  function clampD(dy) { return Math.max(-MAX_DEFLECT, Math.min(MAX_DEFLECT, dy)); }
  function doSound(p, h) {
    const spec = STRINGS[idx];
    audio.pluck(spec.freq * (str.mask || 1), str.mask ? 0.5 : p, {
      t60: spec.t60, gain: Math.min(1, Math.abs(h) / MAX_DEFLECT) * 0.9 + 0.1,
      bright: str.mask ? 0.35 : 0.9,
    });
  }

  canvas.addEventListener('pointerdown', (e) => {
    const pt = toLocal(e);
    if (Math.abs(pt.y - yMid) < 42 && pt.x > x0 - 4 && pt.x < x1 + 4) {
      dragOn = true; dragPid = e.pointerId;
      canvas.setPointerCapture(e.pointerId);
      str.startDrag(xToP(pt.x), clampD(pt.y - yMid));
      e.preventDefault();
    }
    prev = pt;
  });
  canvas.addEventListener('pointermove', (e) => {
    const pt = toLocal(e);
    if (dragOn && e.pointerId === dragPid) {
      const dy = pt.y - yMid;
      if (Math.abs(dy) > MAX_DEFLECT * 1.45) {
        const rel = str.drag ? { ...str.drag } : null;
        str.endDrag();
        if (rel) doSound(rel.p, rel.h);
        release();
      } else {
        str.moveDrag(xToP(pt.x), clampD(dy));
      }
    } else if (prev) {
      const dtms = pt.t - prev.t;
      if (dtms > 0 && dtms < 120) {
        const vy = Math.abs(pt.y - prev.y) / dtms * 1000;
        if (vy > 240 && (prev.y - yMid) * (pt.y - yMid) < 0) {
          const f = (yMid - prev.y) / (pt.y - prev.y);
          const cx = prev.x + f * (pt.x - prev.x);
          if (cx > x0 && cx < x1) {
            const dir = pt.y > prev.y ? 1 : -1;
            const h = dir * Math.min(30, Math.max(8, vy * 0.02));
            str.pluck(xToP(cx), h);
            doSound(xToP(cx), h);
          }
        }
      }
    }
    prev = pt;
  });
  function release() {
    if (dragPid >= 0) { try { canvas.releasePointerCapture(dragPid); } catch (err) { /* gone */ } }
    dragOn = false; dragPid = -1;
  }
  canvas.addEventListener('pointerup', (e) => {
    if (dragOn && e.pointerId === dragPid) {
      const rel = str.drag ? { ...str.drag } : null;
      str.endDrag();
      if (rel && Math.abs(rel.h) > 0.8) doSound(rel.p, rel.h);
      release();
    }
    prev = null;
  });
  canvas.addEventListener('pointercancel', () => { str.drag = null; release(); prev = null; });
  canvas.addEventListener('pointerleave', () => { prev = null; });

  // lifecycle
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; syncRun(); });
  const io = new IntersectionObserver((en) => {
    onscreen = en[0].isIntersecting;
    syncRun();
    // a quiet open pluck the first time the section scrolls in
    if (onscreen && !io.seen && !reducedMotion) {
      io.seen = true;
      setTimeout(() => { if (str.energy < 0.5) str.pluck(0.27, 20); }, 500);
    }
  }, { rootMargin: '60px' });
  io.observe(canvas);

  resize();
  syncRun();
  openString(false);
}
