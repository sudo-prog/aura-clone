/* TEMBLOR — orchestration: clock, drum, replay, map, plots, reveals. */

import { Drum } from './drum.js';
import { Replay, T_P, T_S } from './quake.js';
import { ShakeMap } from './map.js';
import { MagPlot } from './magnitude.js';

const $ = (s, el = document) => el.querySelector(s);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- UTC clock ---------- */
const clockEl = $('#utc-clock');
function tickClock() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  clockEl.textContent = `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;
  clockEl.setAttribute('datetime', d.toISOString());
}
tickClock();
setInterval(tickClock, 1000);

/* ---------- scroll reveals ---------- */
const reveals = document.querySelectorAll('.reveal');
if (reduced) {
  reveals.forEach(el => el.classList.add('in'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        const el = e.target;
        const siblings = [...el.parentElement.children].filter(c => c.classList?.contains('reveal'));
        const idx = Math.max(0, siblings.indexOf(el));
        el.style.transitionDelay = `${Math.min(idx * 90, 360)}ms`;
        el.classList.add('in');
        io.unobserve(el);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(el => io.observe(el));
}

/* ---------- drum ---------- */
const rmsEl = $('#ro-rms');
const drum = new Drum($('#drum'), {
  reduced,
  onRms: (rmsPx) => {
    const umps = (rmsPx * 0.41).toFixed(2);
    rmsEl.textContent = umps;
  },
});

/* ---------- drum boot choreography + hover readout ---------- */
const replayStatus = $('#replay-status');
replayStatus.textContent = 'POWER ON · INK FEED OK · CAL PULSE SENT';
setTimeout(() => {
  if (replayStatus.textContent.startsWith('POWER ON')) {
    replayStatus.textContent = 'DRUM ARMED · AWAITING COMMAND';
  }
}, 3400);

const drumCanvas = $('#drum');
const drumMeta = document.querySelector('.drum-plate .plate-meta');
const drumMetaDefault = drumMeta.textContent;
drumCanvas.addEventListener('mousemove', (e) => {
  const r = drumCanvas.getBoundingClientRect();
  const txt = drum.readAt(e.clientX - r.left, e.clientY - r.top);
  drumMeta.textContent = txt || drumMetaDefault;
});
drumCanvas.addEventListener('mouseleave', () => { drumMeta.textContent = drumMetaDefault; });

/* ---------- shake map ---------- */
const map = new ShakeMap($('#shakemap'), $('#map-coords'));

/* ---------- magnitude plot ---------- */
const magPlot = new MagPlot($('#magplot'), $('#mag-mode-meta'));
const btnTrue = $('#btn-true'), btnNorm = $('#btn-norm');
function setMagMode(mode) {
  magPlot.setMode(mode);
  btnTrue.classList.toggle('is-active', mode === 'true');
  btnNorm.classList.toggle('is-active', mode === 'norm');
  btnTrue.setAttribute('aria-pressed', String(mode === 'true'));
  btnNorm.setAttribute('aria-pressed', String(mode === 'norm'));
}
btnTrue.addEventListener('click', () => setMagMode('true'));
btnNorm.addEventListener('click', () => setMagMode('norm'));

/* ---------- replay ---------- */
const netStatus = $('#net-status');
const netStatusText = $('#net-status-text');
const stampSlot = $('#event-stamp-slot');
let replayCount = 0;

const replay = new Replay({
  page: $('#page'),
  drum,
  map,
  hud: {
    root: $('#hud'),
    clock: $('#hud-clock'),
    phase: $('#hud-phase'),
    frontP: $('#hud-front-p'),
    frontS: $('#hud-front-s'),
  },
  status: $('#replay-status'),
  button: $('#replay-btn'),
  reduced,
  onAlert: (on) => {
    netStatus.classList.toggle('is-alert', on);
    netStatusText.textContent = on ? 'EVENT IN PROGRESS' : 'TELEMETRY NOMINAL';
  },
  onDone: () => {
    replayCount++;
    const now = new Date();
    const p = (n) => String(n).padStart(2, '0');
    stampSlot.innerHTML = `
      <div class="event-stamp">
        <span class="stamp-mag">M 6.7</span>
        <span>ORIGIN 04:15:22.4 UTC · DEPTH 9.2 KM</span>
        <span class="tint-p">P +${T_P.toFixed(2)} s</span>
        <span class="tint-s">S +${T_S.toFixed(2)} s</span>
        <span>PGV 8.4 cm/s · MMI VII</span>
        <span class="stamp-note">Replay Nº ${replayCount} — passed through this page at
        ${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(now.getUTCSeconds())} UTC,
        both wavefronts, true delay. The 1,912 felt reports are mapped in FIG. 3.</span>
      </div>`;
  },
});

$('#replay-btn').addEventListener('click', () => replay.trigger());
document.querySelectorAll('[data-replay]').forEach(btn => {
  btn.addEventListener('click', () => {
    $('#drum-section').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => replay.trigger(), reduced ? 60 : 650);
  });
});

/* ---------- log sparklines (hover: the pen re-draws the pick) ---------- */
function sparkPath(mag, blast, seed) {
  const w = 96, h = 24, mid = h / 2;
  const amp = Math.min(10, 1.4 * Math.pow(2.1, mag - 1));
  let d = `M0 ${mid}`;
  const N = 64;
  const on = 18 + (mag * 3) % 8;
  for (let i = 1; i <= N; i++) {
    const x = (i / N) * w;
    let v = Math.sin(i * 0.9 + mag * 7 + seed) * 0.8;
    if (i > on) {
      const te = (i - on) / (blast ? 4 : 10);
      const env = Math.exp(-te) * (1 - Math.exp(-te * (blast ? 8 : 3)));
      v += env * amp * Math.sin(i * (blast ? 2.6 : 1.7) + mag * 3 + seed * 0.7);
    }
    d += ` L${x.toFixed(1)} ${(mid - v).toFixed(1)}`;
  }
  return d;
}
function sparkline(cell) {
  const mag = parseFloat(cell.dataset.mag || '2');
  const blast = cell.dataset.blast === '1';
  let seed = 0;
  const render = () => {
    cell.innerHTML = `<svg width="96" height="24" viewBox="0 0 96 24" aria-hidden="true">
      <path d="${sparkPath(mag, blast, seed)}" fill="none" stroke="#181510" stroke-width="1.1"/></svg>`;
    return cell.querySelector('path');
  };
  render();
  const row = cell.closest('tr');
  if (row && !reduced) {
    row.addEventListener('mouseenter', () => {
      seed += 2.4;
      const p = render();
      const L = p.getTotalLength();
      p.style.strokeDasharray = String(L);
      p.style.strokeDashoffset = String(L);
      void p.getBoundingClientRect();
      p.style.transition = 'stroke-dashoffset .5s cubic-bezier(.2,.7,.2,1)';
      p.style.strokeDashoffset = '0';
    });
  }
}
document.querySelectorAll('.spark-cell[data-mag]').forEach(sparkline);

/* ---------- instrument response curve ---------- */
(function responseCurve() {
  const el = $('#respplot');
  const w = 456, h = 240;
  const m = { t: 18, r: 16, b: 34, l: 40 };
  const x = d3.scaleLog().domain([0.001, 100]).range([m.l, w - m.r]);
  const y = d3.scaleLinear().domain([-42, 6]).range([h - m.b, m.t]);
  const f1 = 1 / 120, f2 = 50;
  const pts = [];
  for (let e = -3; e <= 2.001; e += 0.02) {
    const f = Math.pow(10, e);
    let db = 0;
    if (f < f1) db = 40 * Math.log10(f / f1);        // 2-pole low corner
    if (f > f2) db = -55 * Math.log10(f / f2);       // steep anti-alias
    pts.push([f, Math.max(db, -42)]);
  }
  const svg = d3.select(el).append('svg')
    .attr('viewBox', `0 0 ${w} ${h}`).attr('aria-hidden', 'true');
  // grid
  [0.001, 0.01, 0.1, 1, 10, 100].forEach(f => {
    svg.append('line').attr('x1', x(f)).attr('x2', x(f)).attr('y1', y(6)).attr('y2', y(-42))
      .attr('stroke', 'rgba(214,204,177,.8)').attr('stroke-width', 1);
    svg.append('text').attr('x', x(f)).attr('y', h - 12)
      .attr('text-anchor', f === 100 ? 'end' : 'middle')
      .attr('font-family', '"IBM Plex Mono", monospace').attr('font-size', 10.5)
      .attr('fill', 'rgba(24,21,16,.66)')
      .text(f === 100 ? '100 Hz' : (f >= 1 ? f : f.toString()));
  });
  [0, -12, -24, -36].forEach(db => {
    svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(db)).attr('y2', y(db))
      .attr('stroke', db === 0 ? 'rgba(24,21,16,.3)' : 'rgba(214,204,177,.8)').attr('stroke-width', 1);
    svg.append('text').attr('x', m.l - 6).attr('y', y(db) + 3).attr('text-anchor', 'end')
      .attr('font-family', '"IBM Plex Mono", monospace').attr('font-size', 10.5)
      .attr('fill', 'rgba(24,21,16,.66)').text(db);
  });
  svg.append('path')
    .attr('d', d3.line().x(p => x(p[0])).y(p => y(p[1])).curve(d3.curveMonotoneX)(pts))
    .attr('fill', 'none').attr('stroke', '#1D53C4').attr('stroke-width', 2.2);
  // corner annotations
  [[f1, '120 s'], [f2, '50 Hz']].forEach(([f, label]) => {
    svg.append('circle').attr('cx', x(f)).attr('cy', y(0)).attr('r', 3.5)
      .attr('fill', '#F4F0E3').attr('stroke', '#C3271E').attr('stroke-width', 2);
    svg.append('text').attr('x', x(f)).attr('y', y(0) - 10).attr('text-anchor', 'middle')
      .attr('font-family', '"IBM Plex Mono", monospace').attr('font-size', 11)
      .attr('font-weight', 600).attr('fill', '#C3271E').text(label);
  });
})();

/* ---------- footer trace ---------- */
(function footerSpark() {
  const cv = $('#footer-spark');
  const ctx = cv.getContext('2d');
  let w, h, dpr;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    w = r.width; h = r.height;
    cv.width = w * dpr; cv.height = h * dpr;
  }
  size();
  window.addEventListener('resize', size, { passive: true });
  let t = 0, visible = false;
  const io = new IntersectionObserver(([e]) => visible = e.isIntersecting);
  io.observe(cv);
  function draw(now) {
    requestAnimationFrame(draw);
    if (!visible || document.hidden) return;
    if (reduced && now - (draw._last || 0) < 1000) return;
    draw._last = now;
    t = now / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(244,240,227,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let px = 0; px <= w; px += 2) {
      const u = px / w * 30 + t * 0.7;
      const v = Math.sin(u * 1.7) * 3.5 + Math.sin(u * 3.1 + 1.2) * 2.2
        + Math.sin(u * 0.4) * 4;
      const yv = h / 2 - v;
      if (px === 0) ctx.moveTo(px, yv); else ctx.lineTo(px, yv);
    }
    ctx.stroke();
  }
  requestAnimationFrame(draw);
})();
