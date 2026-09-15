// Hero: four live strings. Drag to bend (static triangle under the finger,
// release decomposes into modes), sweep fast to strum (crossing detection).
import { STRINGS, VString, makeSinTable, reducedMotion } from './physics.js';
import * as audio from './audio.js';

const PTS = 150;
const N_MODES = 14;
const MAX_DEFLECT = 34;

export function initHeroStrings() {
  const canvas = document.getElementById('stringsCanvas');
  const ctx = canvas.getContext('2d');
  const sinTab = makeSinTable(N_MODES, PTS);
  const strings = STRINGS.map((s) => new VString(s, N_MODES));
  const buf = new Float64Array(PTS + 1);
  const gbuf = new Float64Array(PTS + 1);

  let W = 0, H = 0, dpr = 1;
  let x0 = 0, x1 = 0;          // string span in CSS px
  let ys = [0, 0, 0, 0];       // rest y of each string
  let revealT = reducedMotion ? 1 : 0;   // draw-in progress
  let running = false, visible = !document.hidden, onscreen = true;
  let last = 0, rafId = 0;
  let pointer = { x: -1, y: -1, has: false };
  let dragIdx = -1, dragPointerId = -1;
  let prev = null;             // previous pointer sample for crossing detection
  let showRightLabels = true;
  let gradients = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    showRightLabels = W > 720;
    const insetL = Math.max(78, Math.min(130, W * 0.09));
    const insetR = showRightLabels ? Math.max(170, Math.min(215, W * 0.15)) : 24;
    x0 = insetL;
    x1 = W - insetR;
    const pad = H * 0.16;
    const gap = (H - pad * 2) / 3;
    ys = [pad, pad + gap, pad + gap * 2, pad + gap * 3];
    gradients = strings.map((s, i) => {
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, shade(s.spec.color, 0.55));
      g.addColorStop(0.18, s.spec.color);
      g.addColorStop(0.8, s.spec.color);
      g.addColorStop(1, shade(s.spec.color, 0.5));
      return g;
    });
  }

  function shade(hex, f) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${(r * f) | 0},${(g * f) | 0},${(b * f) | 0})`;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const span = x1 - x0;
    const drawnSpan = span * easeOut(revealT);

    for (let i = 0; i < 4; i++) {
      const s = strings[i];
      const y = ys[i];
      const spec = s.spec;

      // nut / bridge terminals
      ctx.fillStyle = 'rgba(199,154,82,0.5)';
      ctx.fillRect(x0 - 3, y - 7, 2, 14);
      ctx.fillRect(x1 + 1, y - 7, 2, 14);

      // glow underlay while ringing
      if (s.energy > 0.35 || s.drag) {
        const e = Math.min(1, (s.drag ? Math.abs(s.drag.h) / MAX_DEFLECT : s.energy / 26));
        strokeShape(s, y, drawnSpan, spec.glow + (0.10 + e * 0.22) + ')', spec.thick + 7, 0);
      }
      // motion-blur ghosts
      if (s.energy > 0.6 && !s.drag) {
        strokeShapeGhost(s, y, drawnSpan, spec.glow + '0.16)', spec.thick, -0.008);
        strokeShapeGhost(s, y, drawnSpan, spec.glow + '0.16)', spec.thick, 0.008);
      }
      // the string itself
      strokeShape(s, y, drawnSpan, gradients[i], spec.thick, 0);

      // labels
      drawLabels(i, y);
    }

    // pointer feedback: open halo, or fingertip + pull-line while bending
    if (dragIdx >= 0 && strings[dragIdx].drag) {
      const d = strings[dragIdx].drag;
      const fx = x0 + d.p * (x1 - x0);
      const ry = ys[dragIdx];
      ctx.beginPath();
      ctx.moveTo(fx, ry);
      ctx.lineTo(fx, ry + d.h);
      ctx.strokeStyle = 'rgba(232,200,125,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(fx, ry + d.h, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(232,200,125,0.85)';
      ctx.fill();
    } else if (pointer.has) {
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(232,200,125,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function strokeShape(s, yBase, drawnSpan, style, width, ghostDt) {
    s.shape(buf, sinTab, PTS, ghostDt);
    ctx.beginPath();
    for (let i = 0; i <= PTS; i++) {
      const x = x0 + (i / PTS) * (x1 - x0);
      if (x - x0 > drawnSpan) break;
      const y = yBase + buf[i];
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  function strokeShapeGhost(s, yBase, drawnSpan, style, width, dt) {
    s.shape(gbuf, sinTab, PTS, dt);
    ctx.beginPath();
    for (let i = 0; i <= PTS; i++) {
      const x = x0 + (i / PTS) * (x1 - x0);
      if (x - x0 > drawnSpan) break;
      const y = yBase + gbuf[i];
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function drawLabels(i, y) {
    const spec = STRINGS[i];
    const a = Math.min(1, revealT * 1.4);
    ctx.textBaseline = 'middle';
    // left: note name + Hz
    ctx.textAlign = 'right';
    ctx.font = '600 13px Cinzel, serif';
    ctx.fillStyle = `rgba(239,227,198,${0.92 * a})`;
    ctx.fillText(spec.name, x0 - 16, y - 8);
    ctx.font = '10.5px "Cutive Mono", monospace';
    ctx.fillStyle = `rgba(199,154,82,${0.85 * a})`;
    ctx.fillText(spec.freq.toFixed(2) + ' Hz', x0 - 16, y + 9);
    // right: winding, italic
    if (showRightLabels) {
      ctx.textAlign = 'left';
      ctx.font = 'italic 13px Cardo, serif';
      ctx.fillStyle = `rgba(239,227,198,${0.68 * a})`;
      ctx.fillText(spec.winding, x1 + 16, y);
    }
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(ts) {
    rafId = 0;
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    if (revealT < 1) revealT = Math.min(1, revealT + dt / 1.1);
    for (const s of strings) s.update(dt);
    draw();
    rafId = requestAnimationFrame(frame);
  }

  function setRunning(v) {
    if (v && !running) {
      running = true;
      last = performance.now();
      if (!rafId) rafId = requestAnimationFrame(frame);
    } else if (!v && running) {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    }
  }
  function syncRun() { setRunning(visible && onscreen); }

  // ---------- interaction ----------
  function toLocal(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
  }
  function nearestString(y) {
    let best = -1, bd = 26;
    for (let i = 0; i < 4; i++) {
      const d = Math.abs(y - ys[i]);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function xToP(x) { return Math.min(0.97, Math.max(0.03, (x - x0) / (x1 - x0))); }

  // Sympathetic resonance — real physics of a tuned instrument: strings a
  // fifth apart share partials (G×3≈D×2, D×3≈A×2, A×3≈E×2, G×9≈A×4), so a
  // pluck feeds a faint shimmer into every neighbour mode within 0.6% of a
  // sounding partial. Visual only: the fifth answers, it does not speak.
  const SYMP_K = 0.16, SYMP_TOL = 0.006, SYMP_MODES = 10;
  function sympathize(src) {
    const fs = STRINGS[src].freq;
    for (let j = 0; j < 4; j++) {
      if (j === src) continue;
      const ft = STRINGS[j].freq, tgt = strings[j];
      let fed = false;
      for (let a = 1; a <= SYMP_MODES; a++) {
        const ampA = Math.abs(strings[src].amp[a - 1]);
        if (ampA < 0.15) continue;
        for (let b = 1; b <= SYMP_MODES; b++) {
          if (Math.abs(fs * a - ft * b) / (ft * b) < SYMP_TOL) {
            tgt.amp[b - 1] += SYMP_K * ampA;
            fed = true;
          }
        }
      }
      if (fed) tgt._recalcEnergy();
    }
  }

  function doPluck(i, p, h) {
    strings[i].pluck(p, h);
    sympathize(i);
    const spec = STRINGS[i];
    audio.pluck(spec.freq, p, {
      t60: spec.t60,
      gain: Math.min(1, Math.abs(h) / MAX_DEFLECT) * 0.9 + 0.1,
      bright: 0.9,
    });
  }

  canvas.addEventListener('pointerdown', (e) => {
    const pt = toLocal(e);
    const i = nearestString(pt.y);
    if (i >= 0 && pt.x > x0 - 4 && pt.x < x1 + 4) {
      dragIdx = i;
      dragPointerId = e.pointerId;
      canvas.setPointerCapture(e.pointerId);
      strings[i].startDrag(xToP(pt.x), clampD(pt.y - ys[i]));
      e.preventDefault();
    }
    prev = pt;
  });

  canvas.addEventListener('pointermove', (e) => {
    const pt = toLocal(e);
    pointer.x = pt.x; pointer.y = pt.y; pointer.has = true;

    if (dragIdx >= 0 && e.pointerId === dragPointerId) {
      const s = strings[dragIdx];
      const dy = pt.y - ys[dragIdx];
      if (Math.abs(dy) > MAX_DEFLECT * 1.45) {
        // the string slips off the finger — a real pluck
        const rel = s.drag ? { ...s.drag } : null;
        if (rel) { s.endDrag(); sympathize(dragIdx); doSound(dragIdx, rel.p, rel.h); }
        releaseDrag();
      } else {
        s.moveDrag(xToP(pt.x), clampD(dy));
      }
    } else if (prev && dragIdx === -1) {
      // strum: fast crossing of a string's rest line
      const dtms = pt.t - prev.t;
      if (dtms > 0 && dtms < 120) {
        const vy = Math.abs(pt.y - prev.y) / dtms * 1000; // px/s
        if (vy > 240) {
          for (let i = 0; i < 4; i++) {
            const sy = ys[i];
            if ((prev.y - sy) * (pt.y - sy) < 0) {
              const f = (sy - prev.y) / (pt.y - prev.y);
              const cx = prev.x + f * (pt.x - prev.x);
              if (cx > x0 && cx < x1) {
                const dir = pt.y > prev.y ? 1 : -1;
                const h = dir * Math.min(26, Math.max(7, vy * 0.02));
                doPluck(i, xToP(cx), h);
              }
            }
          }
        }
      }
    }
    prev = pt;
  });

  function doSound(i, p, h) {
    const spec = STRINGS[i];
    audio.pluck(spec.freq, p, {
      t60: spec.t60,
      gain: Math.min(1, Math.abs(h) / MAX_DEFLECT) * 0.9 + 0.1,
      bright: 0.9,
    });
  }
  function clampD(dy) { return Math.max(-MAX_DEFLECT, Math.min(MAX_DEFLECT, dy)); }
  function releaseDrag() {
    if (dragPointerId >= 0) {
      try { canvas.releasePointerCapture(dragPointerId); } catch (err) { /* gone */ }
    }
    dragIdx = -1; dragPointerId = -1;
  }

  canvas.addEventListener('pointerup', (e) => {
    if (dragIdx >= 0 && e.pointerId === dragPointerId) {
      const s = strings[dragIdx];
      const rel = s.drag ? { ...s.drag } : null;
      s.endDrag();
      if (rel && Math.abs(rel.h) > 0.8) { sympathize(dragIdx); doSound(dragIdx, rel.p, rel.h); }
      releaseDrag();
    }
    prev = null;
  });
  canvas.addEventListener('pointercancel', () => {
    if (dragIdx >= 0) { strings[dragIdx].drag = null; releaseDrag(); }
    prev = null;
  });
  canvas.addEventListener('pointerleave', () => { pointer.has = false; prev = null; });

  // peg buttons (keyboard / mobile path)
  document.querySelectorAll('.peg').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.string;
      doPluck(i, 0.26 + Math.random() * 0.1, 16 + Math.random() * 6);
    });
  });

  // lifecycle
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden; syncRun();
  });
  // pause offscreen; on return after a real absence, one soft reprise so the
  // signature never greets a visitor as a dead ruler of four lines
  let awaySince = 0;
  new IntersectionObserver((en) => {
    const was = onscreen;
    onscreen = en[0].isIntersecting;
    syncRun();
    if (!onscreen) { awaySince = performance.now(); return; }
    if (!was && awaySince && performance.now() - awaySince > 6000 &&
        !reducedMotion && strings.every((s) => s.energy < 0.5)) {
      setTimeout(() => { strings[2].pluck(0.28, 13); sympathize(2); }, 450);
    }
  }, { rootMargin: '80px' }).observe(canvas);

  resize();
  syncRun();

  // teach the touch: one soft demo pluck of the A, then the D (visual only —
  // audio is behind the user-gesture button anyway)
  if (!reducedMotion) {
    setTimeout(() => { strings[2].pluck(0.28, 15); sympathize(2); }, 1900);
    setTimeout(() => { strings[1].pluck(0.31, 12); sympathize(1); }, 2350);
  }

  // re-render labels crisply once webfonts land
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (!running) draw(); });
  }

  return { strings, pluck: doPluck, sympathize };
}
