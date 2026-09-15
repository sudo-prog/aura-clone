/* TENTH FLOOR APIARY — drip.js
   The lifted frame. Honey drips from the bottom bar with believable
   viscosity: bead → neck → detach → free-fall → filament snap-back,
   merged into liquid by an SVG gooey filter, landing in the uncapping
   tank whose level actually rises. */
(() => {
  'use strict';
  const host = document.getElementById('dripSvg');
  if (!host) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LIP_Y = 222;
  const POOL_START = 420, POOL_MIN = 388;
  const EMITTERS = [176, 260, 344, 430, 514, 598];

  function hexPath(cx, cy, rw) {
    // pointy-top hexagon, rw = half width
    const ry = rw * 1.1547;
    return `M${cx} ${cy - ry} L${cx + rw} ${cy - ry / 2} L${cx + rw} ${cy + ry / 2} L${cx} ${cy + ry} L${cx - rw} ${cy + ry / 2} L${cx - rw} ${cy - ry / 2} Z`;
  }

  // comb pattern tile: pointy-top hexes, w=30
  const patternHexes =
    hexPath(15, 15, 14.2) + ' ' + hexPath(0, 41, 14.2) + ' ' + hexPath(30, 41, 14.2);

  // uncapped (open) cells on the frame face, aligned to the comb pattern grid:
  // pattern hexes sit at (15+30i, 15+52j) and (30i, 41+52j) in user space
  const uncapped = [
    [195, 119], [315, 67], [345, 119], [465, 171], [495, 119],
    [555, 67], [615, 171], [255, 171], [240, 93], [420, 145], [540, 93],
  ].map(([x, y]) => `<path class="hd-uncapped" d="${hexPath(x, y, 13.8)}"/>`).join('');

  host.innerHTML = `
<svg viewBox="0 0 760 470" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="hdHoney" x1="0" y1="200" x2="0" y2="470" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#F2BE45"/>
      <stop offset="0.5" stop-color="#DE8F0A"/>
      <stop offset="1" stop-color="#9A5A0C"/>
    </linearGradient>
    <linearGradient id="hdPoolG" x1="0" y1="380" x2="0" y2="450" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#EFAD24"/>
      <stop offset="1" stop-color="#B26F10"/>
    </linearGradient>
    <linearGradient id="hdGlaze" x1="0" y1="60" x2="0" y2="220" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFFAE8" stop-opacity="0.36"/>
      <stop offset="0.4" stop-color="#FFFAE8" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#7A490E" stop-opacity="0.3"/>
    </linearGradient>
    <filter id="hdGoo" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="b"/>
      <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"/>
    </filter>
    <pattern id="hdHexP" width="30" height="52" patternUnits="userSpaceOnUse">
      <path d="${patternHexes}" fill="none" stroke="#C98F1F" stroke-width="1.6"/>
    </pattern>
    <clipPath id="hdClip"><rect x="104" y="60" width="552" height="146"/></clipPath>
  </defs>

  <g class="frame-g">
    <rect class="hd-comb-base" x="104" y="60" width="552" height="146"/>
    <rect x="104" y="60" width="552" height="146" fill="url(#hdHexP)"/>
    ${uncapped}
    <line class="hd-wire" x1="104" y1="107" x2="656" y2="107"/>
    <line class="hd-wire" x1="104" y1="163" x2="656" y2="163"/>
    <rect class="hd-glaze" x="104" y="60" width="552" height="146"/>
    <g clip-path="url(#hdClip)"><rect class="hd-sweep" x="240" y="52" width="120" height="162"/></g>
    <rect class="hd-wood" x="88" y="60" width="18" height="156" rx="4"/>
    <rect class="hd-wood" x="654" y="60" width="18" height="156" rx="4"/>
    <rect class="hd-wood" x="70" y="32" width="620" height="27" rx="7"/>
    <rect class="hd-wood" x="88" y="205" width="584" height="15" rx="5"/>
  </g>

  <rect class="hd-tank-glass" x="86" y="362" width="588" height="88" rx="12"/>
  <g class="hd-goo" filter="url(#hdGoo)">
    <rect id="hdLip" x="112" y="213" width="536" height="12" rx="6"/>
    ${EMITTERS.map((x, i) => `
    <g class="hd-drip" data-i="${i}">
      <circle class="hd-src" cx="${x}" cy="${LIP_Y}" r="3"/>
      <circle class="hd-neck" cx="${x}" cy="${LIP_Y}" r="0"/>
      <circle class="hd-drop" cx="${x}" cy="${LIP_Y}" r="0"/>
      <circle class="hd-sp1" cx="${x - 11}" cy="${POOL_START}" r="0"/>
      <circle class="hd-sp2" cx="${x + 11}" cy="${POOL_START}" r="0"/>
    </g>`).join('')}
    <rect id="hdPool" fill="url(#hdPoolG)" x="92" y="${POOL_START}" width="576" height="${448 - POOL_START}" rx="8"/>
  </g>

  <path class="hd-tank" d="M84 360 V438 Q84 452 98 452 H662 Q676 452 676 438 V360"/>
  <line id="hdShine" class="hd-pool-shine" x1="150" y1="${POOL_START + 10}" x2="330" y2="${POOL_START + 10}"/>
</svg>`;

  const svg = host.querySelector('svg');
  const pool = svg.querySelector('#hdPool');
  const shine = svg.querySelector('#hdShine');
  const countOut = document.getElementById('dripCount');
  const ozOut = document.getElementById('dripOz');

  const drips = [...svg.querySelectorAll('.hd-drip')].map((g, i) => ({
    x: EMITTERS[i],
    src: g.querySelector('.hd-src'),
    neck: g.querySelector('.hd-neck'),
    drop: g.querySelector('.hd-drop'),
    sp1: g.querySelector('.hd-sp1'),
    sp2: g.querySelector('.hd-sp2'),
    period: 4200 + Math.random() * 3200,
    offset: Math.random() * 6000,
    size: i === 1 || i === 4 ? 1.28 : 0.92 + Math.random() * 0.3,
    counted: false,
  }));

  let poolY = POOL_START;
  let drops = 0;

  function setPool(y) {
    poolY = y;
    pool.setAttribute('y', y);
    pool.setAttribute('height', 448 - y);
    shine.setAttribute('y1', y + 12);
    shine.setAttribute('y2', y + 12);
    for (const d of drips) {
      d.sp1.setAttribute('cy', y + 3);
      d.sp2.setAttribute('cy', y + 3);
    }
  }

  function landDrop(d) {
    drops++;
    if (countOut) countOut.textContent = `${drops} drop${drops === 1 ? '' : 's'}`;
    if (ozOut) ozOut.textContent = (drops * 0.009).toFixed(2);
    if (poolY > POOL_MIN) setPool(poolY - 0.22);
  }

  function renderDrip(d, now) {
    const p = ((now + d.offset) % d.period) / d.period;
    const S = d.size;
    let srcR = 3, dropR = 0, dropY = LIP_Y, neckR = 0, neckY = LIP_Y, sp = 0;
    if (p < 0.34) {
      // bead swells at the lip
      const k = p / 0.34;
      dropR = (2.5 + 4.6 * Math.pow(k, 1.7)) * S;
      dropY = LIP_Y + dropR * 0.62;
      srcR = (3 + 2.2 * k) * S;
      d.counted = false;
    } else if (p < 0.6) {
      // the neck: viscous stretch
      const k = (p - 0.34) / 0.26;
      const e = Math.pow(k, 2.3);
      dropR = (7.1 + 0.7 * k) * S;
      dropY = LIP_Y + 5 + 46 * e;
      neckY = (LIP_Y + dropY) / 2;
      neckR = (4.6 * (1 - k) + 1.5) * S;
      srcR = (5.2 - 1.8 * k) * S;
    } else if (p < 0.76) {
      // detach and fall; filament snaps back
      const k = (p - 0.6) / 0.16;
      const detachY = LIP_Y + 51;
      dropR = 8.4 * S;
      dropY = detachY + (poolY + 6 - detachY) * (k * k);
      neckR = Math.max(0, 1.5 * (1 - k * 2.4)) * S;
      neckY = LIP_Y + 10 * (1 - k);
      srcR = 3.2 * S;
      if (k > 0.96 && !d.counted) { d.counted = true; landDrop(d); }
    } else {
      // absorbed: a viscous plip at the surface
      const k = (p - 0.76) / 0.24;
      srcR = 3 * S;
      sp = k < 0.5 ? Math.sin(k * Math.PI * 2) * 3.4 * S : 0;
    }
    d.src.setAttribute('r', srcR.toFixed(2));
    d.drop.setAttribute('cy', dropY.toFixed(1));
    d.drop.setAttribute('r', dropR.toFixed(2));
    d.neck.setAttribute('cy', neckY.toFixed(1));
    d.neck.setAttribute('r', neckR.toFixed(2));
    d.sp1.setAttribute('r', sp.toFixed(2));
    d.sp2.setAttribute('r', (sp * 0.8).toFixed(2));
  }

  if (RM) {
    // designed still: two drops mid-neck, pool partly filled
    setPool(412);
    // freeze a few drips mid-stretch by rendering fixed phases
    const freeze = (d, p) => {
      const save = d.period, saveO = d.offset;
      d.period = 1000; d.offset = p * 1000;
      renderDrip(d, 0);
      d.period = save; d.offset = saveO;
    };
    freeze(drips[1], 0.5);
    freeze(drips[4], 0.42);
    freeze(drips[2], 0.2);
    const cap = document.querySelector('.drip-count');
    if (cap) cap.textContent = 'extraction paused for you — motion reduced';
    return;
  }

  let onscreen = false, running = false, raf = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    for (const d of drips) renderDrip(d, now);
  }
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) raf = requestAnimationFrame(loop);
    else cancelAnimationFrame(raf);
  }
  const io = new IntersectionObserver(entries => {
    onscreen = entries[0].isIntersecting;
    setRunning(onscreen && !document.hidden);
  }, { rootMargin: '80px' });
  io.observe(host);
  document.addEventListener('visibilitychange', () => setRunning(onscreen && !document.hidden));
})();
