/* TENTH FLOOR APIARY — waggle.js
   The waggle dance, drawn as the instrument it is. On vertical comb,
   straight up stands in for the sun's bearing: the angle of the waggle
   run from vertical = the angle of the food from the sun; the duration
   of the run ≈ one second per kilometer. The animation IS the data —
   pick a farther target and the bee genuinely waggles longer. */
(() => {
  'use strict';
  const host = document.getElementById('waggleSvg');
  if (!host) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CX = 250, CY = 310, R = 205;

  const TARGETS = {
    seward: { name: 'the Seward Park lindens', verb: 'lie', km: 0.4, theta: 35 },
    mckinley: { name: 'McKinley Community Garden', verb: 'lies', km: 1.1, theta: -74 },
    river: { name: 'the East River meadow', verb: 'lies', km: 2.6, theta: 122 },
  };
  let cur = { ...TARGETS.seward };
  let tween = null;

  function hexPath(cx, cy, rw) {
    const ry = rw * 1.1547;
    return `M${cx} ${cy - ry} L${cx + rw} ${cy - ry / 2} L${cx + rw} ${cy + ry / 2} L${cx} ${cy + ry} L${cx - rw} ${cy + ry / 2} L${cx - rw} ${cy - ry / 2} Z`;
  }
  const patternHexes = hexPath(14, 14, 13.2) + ' ' + hexPath(0, 38.3, 13.2) + ' ' + hexPath(28, 38.3, 13.2);

  function beeMarkup(id, scale) {
    return `<g id="${id}" transform="scale(${scale})">
      <ellipse class="wd-bee-wing ${id}-wl" cx="-5.5" cy="-3.2" rx="6" ry="2.6" transform="rotate(-34 -5.5 -3.2)"/>
      <ellipse class="wd-bee-wing ${id}-wr" cx="5.5" cy="-3.2" rx="6" ry="2.6" transform="rotate(34 5.5 -3.2)"/>
      <ellipse class="wd-bee-body" cx="0" cy="2.6" rx="4.4" ry="7.4"/>
      <line class="wd-bee-stripe" x1="-3.4" y1="1" x2="3.4" y2="1"/>
      <line class="wd-bee-stripe" x1="-3.1" y1="5" x2="3.1" y2="5"/>
      <ellipse cx="0" cy="-4.4" rx="3.6" ry="3.9" fill="#7A5230"/>
      <circle cx="0" cy="-9" r="2.5" fill="#38220D"/>
    </g>`;
  }

  const ticks = [];
  for (let a = 0; a < 360; a += 30) {
    const rad = (a * Math.PI) / 180;
    const x1 = CX + Math.sin(rad) * (R - 4), y1 = CY - Math.cos(rad) * (R - 4);
    const x2 = CX + Math.sin(rad) * (R - 16), y2 = CY - Math.cos(rad) * (R - 16);
    ticks.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#8A5514" stroke-opacity="0.35" stroke-width="${a === 0 ? 3 : 1.6}"/>`);
  }

  const sunRays = [];
  for (let a = 0; a < 360; a += 45) {
    const rad = (a * Math.PI) / 180;
    sunRays.push(`<line class="wd-sun-ray" x1="${(250 + Math.sin(rad) * 19).toFixed(1)}" y1="${(50 - Math.cos(rad) * 19).toFixed(1)}" x2="${(250 + Math.sin(rad) * 27).toFixed(1)}" y2="${(50 - Math.cos(rad) * 27).toFixed(1)}"/>`);
  }

  host.innerHTML = `
<svg viewBox="0 0 520 560" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="wdHexP" width="28" height="48.6" patternUnits="userSpaceOnUse">
      <path class="wd-hex" d="${patternHexes}"/>
    </pattern>
    <clipPath id="wdFaceClip"><circle cx="${CX}" cy="${CY}" r="${R - 2}"/></clipPath>
  </defs>
  <circle class="wd-face" cx="${CX}" cy="${CY}" r="${R}"/>
  <circle cx="${CX}" cy="${CY}" r="${R - 2}" fill="url(#wdHexP)" clip-path="url(#wdFaceClip)"/>
  ${ticks.join('')}
  <line class="wd-up" x1="${CX}" y1="${CY}" x2="${CX}" y2="82"/>
  <circle class="wd-sun-core" cx="250" cy="50" r="13"/>
  ${sunRays.join('')}
  <text class="wd-label wd-label--smoke" x="288" y="47">STRAIGHT UP</text>
  <text class="wd-label wd-label--smoke" x="288" y="61">= THE SUN'S BEARING</text>
  <text class="wd-label" x="${CX}" y="${CY + R - 22}" text-anchor="middle">THE DANCE FLOOR · VERTICAL COMB, HIVE H01</text>
  <path class="wd-track" id="wdTrack" d=""/>
  <path class="wd-run" id="wdRun" d=""/>
  <path class="wd-arc" id="wdArc" d=""/>
  <text class="wd-theta" id="wdTheta" text-anchor="middle"></text>
  <text class="wd-label wd-label--smoke" id="wdDist" text-anchor="middle"></text>
  <g class="wd-follower" transform="translate(158 438) rotate(-38)">${beeMarkup('wdBeeF1', 1.15)}</g>
  <g class="wd-follower" transform="translate(348 420) rotate(24)">${beeMarkup('wdBeeF2', 1.05)}</g>
  <g id="wdBeeT">${beeMarkup('wdBee', 1.5)}</g>
</svg>`;

  const svg = host.querySelector('svg');
  const track = svg.querySelector('#wdTrack');
  const run = svg.querySelector('#wdRun');
  const arc = svg.querySelector('#wdArc');
  const thetaTx = svg.querySelector('#wdTheta');
  const distTx = svg.querySelector('#wdDist');
  const beeT = svg.querySelector('#wdBeeT');
  const wingL = svg.querySelector('.wdBee-wl');
  const wingR = svg.querySelector('.wdBee-wr');
  const readout = document.getElementById('waggleReadout');

  track.addEventListener('animationend', () => { track.style.strokeDasharray = 'none'; });

  let G = null; // geometry
  function geometry(theta, km) {
    const th = (theta * Math.PI) / 180;
    const L = Math.min(120 + km * 45, 210);
    const dir = { x: Math.sin(th), y: -Math.cos(th) };
    const perp = { x: Math.cos(th), y: Math.sin(th) };
    const A = { x: CX - dir.x * L / 2, y: CY - dir.y * L / 2 };
    const B = { x: CX + dir.x * L / 2, y: CY + dir.y * L / 2 };
    const loop = s => {
      const c1 = { x: B.x + s * perp.x * 0.8 * L + dir.x * 0.12 * L, y: B.y + s * perp.y * 0.8 * L + dir.y * 0.12 * L };
      const c2 = { x: A.x + s * perp.x * 0.8 * L - dir.x * 0.12 * L, y: A.y + s * perp.y * 0.8 * L - dir.y * 0.12 * L };
      return { c1, c2 };
    };
    return { th, L, dir, perp, A, B, right: loop(1), left: loop(-1), theta, km };
  }

  const f1 = n => n.toFixed(1);
  function render(theta, km) {
    G = geometry(theta, km);
    const { A, B, right, left } = G;
    track.setAttribute('d',
      `M${f1(A.x)} ${f1(A.y)} L${f1(B.x)} ${f1(B.y)} C${f1(right.c1.x)} ${f1(right.c1.y)} ${f1(right.c2.x)} ${f1(right.c2.y)} ${f1(A.x)} ${f1(A.y)}` +
      ` M${f1(B.x)} ${f1(B.y)} C${f1(left.c1.x)} ${f1(left.c1.y)} ${f1(left.c2.x)} ${f1(left.c2.y)} ${f1(A.x)} ${f1(A.y)}`);
    run.setAttribute('d', `M${f1(A.x)} ${f1(A.y)} L${f1(B.x)} ${f1(B.y)}`);
    // angle arc from vertical to the run direction
    const r0 = 64;
    const p0 = { x: CX, y: CY - r0 };
    const p1 = { x: CX + Math.sin(G.th) * r0, y: CY - Math.cos(G.th) * r0 };
    arc.setAttribute('d', `M${f1(p0.x)} ${f1(p0.y)} A${r0} ${r0} 0 0 ${theta > 0 ? 1 : 0} ${f1(p1.x)} ${f1(p1.y)}`);
    const mid = (theta / 2) * Math.PI / 180;
    thetaTx.setAttribute('x', f1(CX + Math.sin(mid) * 97));
    thetaTx.setAttribute('y', f1(CY - Math.cos(mid) * 97 + 7));
    thetaTx.textContent = Math.round(Math.abs(theta)) + '°';
    // distance label just beyond the start of the run, clear of arc and loops
    const side = theta >= 0 ? 1 : -1;
    const lp = {
      x: A.x - G.dir.x * 34 + G.perp.x * side * 10,
      y: A.y - G.dir.y * 34 + G.perp.y * side * 10,
    };
    let rot = (Math.atan2(G.dir.y, G.dir.x) * 180) / Math.PI;
    if (rot > 90) rot -= 180;
    if (rot < -90) rot += 180;
    distTx.removeAttribute('x');
    distTx.removeAttribute('y');
    distTx.setAttribute('transform', `translate(${f1(lp.x)} ${f1(lp.y)}) rotate(${rot.toFixed(1)})`);
    distTx.textContent = `${km.toFixed(1)} s ≈ ${km.toFixed(1)} km`;
  }

  function setReadout(t) {
    if (!readout) return;
    const side = t.theta >= 0 ? 'right' : 'left';
    readout.textContent =
      `${t.km.toFixed(1)} s of waggle ≈ ${t.km.toFixed(1)} km. She runs ${Math.abs(t.theta)}° ${side} of straight up — so ${t.name} ${t.verb} ${Math.abs(t.theta)}° ${side} of the sun.`;
  }

  render(cur.theta, cur.km);
  setReadout(cur);

  // ---------- bee choreography ----------
  const bezier = (a, c1, c2, b, t) => {
    const u = 1 - t;
    return {
      x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
      y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
    };
  };
  const bezierTan = (a, c1, c2, b, t) => {
    const u = 1 - t;
    return {
      x: 3 * u * u * (c1.x - a.x) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (b.x - c2.x),
      y: 3 * u * u * (c1.y - a.y) + 6 * u * t * (c2.y - c1.y) + 3 * t * t * (b.y - c2.y),
    };
  };
  const smooth = t => t * t * (3 - 2 * t);

  const SEQ = ['run', 'loopR', 'run', 'loopL'];
  let seqI = 0, phaseStart = 0, frame = 0;

  function phaseDur(name) {
    return name === 'run' ? Math.max(0.6, G.km * 0.95) * 1000 : 1200;
  }

  function placeBee(now) {
    const name = SEQ[seqI];
    let t = (now - phaseStart) / phaseDur(name);
    if (t >= 1) {
      seqI = (seqI + 1) % SEQ.length;
      phaseStart = now;
      t = 0;
    }
    let pos, ang;
    if (SEQ[seqI] === 'run') {
      const elapsed = (now - phaseStart) / 1000;
      const wig = Math.sin(elapsed * 13 * Math.PI * 2);
      pos = {
        x: G.A.x + G.dir.x * G.L * t + G.perp.x * wig * 5,
        y: G.A.y + G.dir.y * G.L * t + G.perp.y * wig * 5,
      };
      ang = Math.atan2(G.dir.y, G.dir.x) + wig * 0.4;
    } else {
      const lp = SEQ[seqI] === 'loopR' ? G.right : G.left;
      const tt = smooth(t);
      pos = bezier(G.B, lp.c1, lp.c2, G.A, tt);
      const tan = bezierTan(G.B, lp.c1, lp.c2, G.A, tt);
      ang = Math.atan2(tan.y, tan.x);
    }
    beeT.setAttribute('transform', `translate(${f1(pos.x)} ${f1(pos.y)}) rotate(${((ang * 180) / Math.PI + 90).toFixed(1)})`);
    // wing flicker
    frame++;
    const w = frame % 2 ? 52 : 22;
    if (wingL) wingL.setAttribute('transform', `rotate(${-w} -5.5 -3.2)`);
    if (wingR) wingR.setAttribute('transform', `rotate(${w} 5.5 -3.2)`);
  }

  function switchTarget(key) {
    const t = TARGETS[key];
    setReadout(t);
    if (RM) { render(t.theta, t.km); cur = { ...t }; seqI = 0; placeBeeStatic(); return; }
    const from = { theta: cur.theta, km: cur.km };
    const start = performance.now();
    tween = { from, to: t, start, dur: 700 };
    cur = { ...t };
  }

  function placeBeeStatic() {
    const pos = { x: CX, y: CY };
    const ang = Math.atan2(G.dir.y, G.dir.x);
    beeT.setAttribute('transform', `translate(${f1(pos.x)} ${f1(pos.y)}) rotate(${((ang * 180) / Math.PI + 90).toFixed(1)})`);
  }

  document.querySelectorAll('.target-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.target-btn').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
      switchTarget(btn.dataset.target);
    });
  });

  if (RM) {
    placeBeeStatic();
    return;
  }

  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let running = false, onscreen = false, raf = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (tween) {
      const k = Math.min(1, (now - tween.start) / tween.dur);
      const e = easeIO(k);
      render(
        tween.from.theta + (tween.to.theta - tween.from.theta) * e,
        tween.from.km + (tween.to.km - tween.from.km) * e
      );
      if (k >= 1) { tween = null; seqI = 0; phaseStart = now; }
    }
    placeBee(now);
  }
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) { phaseStart = performance.now(); raf = requestAnimationFrame(loop); }
    else cancelAnimationFrame(raf);
  }
  const io = new IntersectionObserver(entries => {
    onscreen = entries[0].isIntersecting;
    setRunning(onscreen && !document.hidden);
  }, { rootMargin: '60px' });
  io.observe(host);
  document.addEventListener('visibilitychange', () => setRunning(onscreen && !document.hidden));
})();
