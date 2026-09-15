/* TEMBLOR — FIG. 3 isoseismal shake map. Hand-drafted fictional geography,
   contours elongated along strike, live P/S wavefront rings during replay. */

const W = 960, H = 620;
const PX_PER_KM = 6.4;
const EPI = { x: 368, y: 232 };
const STA = { x: 614, y: 347 };
const STRIKE = Math.atan2(265, 260); // fault direction on screen, ≈45.5°

// seeded pseudo-random for stable contour wobble
function mulberry(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const MMI = [
  { n: 'IV',   a: 100, b: 70, fill: 'rgba(214,204,177,.40)' },
  { n: 'V',    a: 72,  b: 48, fill: 'rgba(232,196,107,.35)' },
  { n: 'VI',   a: 48,  b: 30, fill: 'rgba(232,160,32,.30)'  },
  { n: 'VII',  a: 30,  b: 17, fill: 'rgba(217,106,31,.30)'  },
  { n: 'VIII', a: 17,  b: 9,  fill: 'rgba(195,39,30,.32)'   },
];

const TOWNS = [
  // cdy: extra label offset in compact (mobile) mode to keep big type clear of MMI boxes
  { name: 'ALVARADO',      mmi: 'VIII', x: 430, y: 300, anchor: 'start', dx: 10, dy: 4,  cdy: 2 },
  { name: 'YERBA SECA',    mmi: 'VII',  x: 470, y: 150, anchor: 'start', dx: 10, dy: 4,  cdy: 16 },
  { name: 'PUERTO ALTO',   mmi: 'VII',  x: 215, y: 180, anchor: 'start', dx: 10, dy: -6, cdy: -4 },
  { name: 'SAN NICANDRO',  mmi: 'VI',   x: 700, y: 120, anchor: 'end',   dx: -10, dy: 4, cdy: -6 },
  { name: 'LAS BRISAS',    mmi: 'V',    x: 170, y: 520, anchor: 'start', dx: 12, dy: 4,  cdy: 2 },
  { name: 'PUNTA GAVIOTA', mmi: 'IV',   x: 118, y: 588, anchor: 'start', dx: 12, dy: -8, cdy: -2 },
];

export class ShakeMap {
  constructor(container, coordsEl) {
    this.container = container;
    this.coordsEl = coordsEl;
    this.compact = (container.clientWidth || 960) < 640;   // legible cartography on small screens
    this._build();
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => {
        const c = (this.container.clientWidth || 960) < 640;
        if (c !== this.compact) {
          this.compact = c;
          const old = this.container.querySelector('svg');
          if (old) old.remove();
          this._build();
        }
      });
      this._ro.observe(container);
    }
  }

  _contourPath(aKm, bKm, seed) {
    const rand = mulberry(seed);
    const jit = [];
    const N = 26;
    for (let i = 0; i < N; i++) jit.push(0.86 + rand() * 0.30);
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const th = (i % N) / N * Math.PI * 2;
      const j = jit[i % N];
      const rx = aKm * PX_PER_KM * j;
      const ry = bKm * PX_PER_KM * j;
      const ex = Math.cos(th) * rx, ey = Math.sin(th) * ry;
      // rotate by strike
      const x = EPI.x + ex * Math.cos(STRIKE) - ey * Math.sin(STRIKE);
      const y = EPI.y + ex * Math.sin(STRIKE) + ey * Math.cos(STRIKE);
      pts.push([x, y]);
    }
    const line = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.6));
    return line(pts.slice(0, N));
  }

  _build() {
    const svg = d3.select(this.container).append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('aria-hidden', 'true');
    this.svg = svg;

    const defs = svg.append('defs');
    const pat = defs.append('pattern')
      .attr('id', 'ocean-hatch').attr('width', 7).attr('height', 7)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('patternTransform', 'rotate(45)');
    pat.append('rect').attr('width', 7).attr('height', 7).attr('fill', '#EDE8D8');
    pat.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 7)
      .attr('stroke', '#C9BFA3').attr('stroke-width', 1.1);

    // clip to plate
    defs.append('clipPath').attr('id', 'map-clip')
      .append('rect').attr('width', W).attr('height', H);

    const g = svg.append('g').attr('clip-path', 'url(#map-clip)');
    this.g = g;

    // land
    g.append('rect').attr('width', W).attr('height', H).attr('fill', '#F4F0E3');

    // ocean west of the coast
    const coastPts = [
      [212, -20], [188, 60], [206, 140], [172, 214], [188, 292],
      [148, 356], [166, 428], [128, 492], [148, 556], [96, 640],
    ];
    const coastLine = d3.line().curve(d3.curveCatmullRom.alpha(0.7));
    const coastPath = coastLine(coastPts);
    g.append('path')
      .attr('d', coastPath + ` L -40 ${H + 20} L -40 -20 Z`)
      .attr('fill', 'url(#ocean-hatch)');
    g.append('path').attr('d', coastPath)
      .attr('fill', 'none').attr('stroke', '#181510').attr('stroke-width', 1.8);
    g.append('text').attr('x', 62).attr('y', 210)
      .attr('transform', 'rotate(-73 62 210)')
      .attr('class', 'map-ocean-label')
      .text('PACIFIC OCEAN');

    // graticule ticks
    const grat = g.append('g').attr('class', 'map-grat');
    for (let i = 1; i < 5; i++) {
      const x = (W / 5) * i, y = (H / 5) * i;
      grat.append('line').attr('x1', x).attr('y1', 0).attr('x2', x).attr('y2', 10);
      grat.append('line').attr('x1', x).attr('y1', H).attr('x2', x).attr('y2', H - 10);
      grat.append('line').attr('x1', 0).attr('y1', y).attr('x2', 10).attr('y2', y);
      grat.append('line').attr('x1', W).attr('y1', y).attr('x2', W - 10).attr('y2', y);
    }

    // isoseismals, largest first
    const iso = g.append('g');
    MMI.forEach((m, i) => {
      iso.append('path')
        .attr('d', this._contourPath(m.a, m.b, 11 + i * 7))
        .attr('fill', m.fill)
        .attr('stroke', 'rgba(24,21,16,.55)')
        .attr('stroke-width', 1);
    });
    // roman numeral labels along the NE minor axis
    const labelR = [104, 76, 51, 32.5, 12];
    const bw = this.compact ? 52 : 32, bh = this.compact ? 30 : 20;
    MMI.forEach((m, i) => {
      const r = labelR[i] * PX_PER_KM * 0.72;
      const th = STRIKE - Math.PI / 2;   // perpendicular to strike, NE side
      const lx = EPI.x + Math.cos(th) * r * (m.b / m.a) * 1.6;
      const ly = EPI.y + Math.sin(th) * r * (m.b / m.a) * 1.6;
      const gl = iso.append('g');
      gl.append('rect').attr('x', lx - bw / 2).attr('y', ly - bh / 2).attr('width', bw).attr('height', bh)
        .attr('fill', '#F4F0E3').attr('stroke', '#181510').attr('stroke-width', 1);
      gl.append('text').attr('x', lx).attr('y', ly + (this.compact ? 7 : 4)).attr('text-anchor', 'middle')
        .attr('class', 'map-mmi').text(m.n);
    });

    // fault trace
    const faultPts = [[150, -10], [240, 105], [368, 232], [500, 370], [608, 476], [700, 630]];
    g.append('path')
      .attr('d', d3.line().curve(d3.curveCatmullRom)(faultPts))
      .attr('fill', 'none')
      .attr('stroke', '#C3271E').attr('stroke-width', 2.4)
      .attr('stroke-dasharray', '10 5');
    g.append('text')
      .attr('x', 530).attr('y', 420)
      .attr('transform', 'rotate(44 530 420)')
      .attr('class', 'map-fault-label')
      .text(this.compact ? 'ALVARADO FAULT' : 'ALVARADO FAULT — 1989 RUPTURE SEGMENT');

    // wavefront rings (hidden until replay)
    this.ringP = g.append('circle')
      .attr('cx', EPI.x).attr('cy', EPI.y).attr('r', 0)
      .attr('fill', 'none').attr('stroke', '#1D53C4').attr('stroke-width', 2.5)
      .attr('opacity', 0);
    this.ringS = g.append('circle')
      .attr('cx', EPI.x).attr('cy', EPI.y).attr('r', 0)
      .attr('fill', 'none').attr('stroke', '#C3271E').attr('stroke-width', 2.5)
      .attr('opacity', 0);

    // towns
    const towns = g.append('g');
    const dotR = this.compact ? 6.5 : 4;
    TOWNS.forEach(t => {
      const tg = towns.append('g').attr('class', 'map-town');
      tg.append('circle').attr('cx', t.x).attr('cy', t.y).attr('r', dotR)
        .attr('fill', '#181510');
      tg.append('circle').attr('cx', t.x).attr('cy', t.y).attr('r', dotR + 5)
        .attr('fill', 'none').attr('stroke', '#181510').attr('stroke-width', 1)
        .attr('opacity', 0).attr('class', 'town-halo');
      tg.append('text').attr('x', t.x + t.dx).attr('y', t.y + t.dy + (this.compact ? t.cdy : 0))
        .attr('text-anchor', t.anchor).attr('class', 'map-town-name')
        .text(`${t.name} · ${t.mmi}`);
    });

    // epicenter star
    const star = g.append('g').attr('transform', `translate(${EPI.x},${EPI.y})`);
    const starPath = d3.symbol().type(d3.symbolStar).size(360)();
    star.append('path').attr('d', starPath)
      .attr('fill', '#C3271E').attr('stroke', '#181510').attr('stroke-width', 1.4);
    g.append('text').attr('x', EPI.x - 14).attr('y', EPI.y - 16)
      .attr('text-anchor', 'end').attr('class', 'map-epi-label')
      .text(this.compact ? 'EPICENTRE' : 'EPICENTRE · CERRO COLORADO');

    // station triangle
    const sta = g.append('g').attr('transform', `translate(${STA.x},${STA.y})`);
    this.staTri = sta.append('path')
      .attr('d', 'M0,-9 L8.5,6 L-8.5,6 Z')
      .attr('fill', '#F4F0E3').attr('stroke', '#181510').attr('stroke-width', 2.2);
    this.staPulse = sta.append('circle').attr('r', 12)
      .attr('fill', 'none').attr('stroke', '#1D53C4').attr('stroke-width', 2)
      .attr('opacity', 0);
    g.append('text').attr('x', STA.x + 14).attr('y', STA.y + 5)
      .attr('class', 'map-sta-label')
      .text(this.compact ? 'ALV-03' : 'ALV-03 · PIEDRA BLANCA');

    // epicentre → station range line
    g.append('line')
      .attr('x1', EPI.x).attr('y1', EPI.y).attr('x2', STA.x).attr('y2', STA.y)
      .attr('stroke', 'rgba(24,21,16,.4)').attr('stroke-width', 1)
      .attr('stroke-dasharray', '2 5');
    if (!this.compact) {
      const midX = (EPI.x + STA.x) / 2, midY = (EPI.y + STA.y) / 2;
      g.append('text').attr('x', midX + 6).attr('y', midY - 8)
        .attr('class', 'map-range-label').text('42.3 KM');
    }

    // scale bar (top-left, clear of Punta Gaviota)
    const sb = g.append('g').attr('transform', `translate(34, 42)`);
    sb.append('rect').attr('x', -12).attr('y', -18).attr('width', 50 * PX_PER_KM * 0.5 + 66)
      .attr('height', 44).attr('fill', 'rgba(244,240,227,.85)');
    [[0, 10], [10, 25], [25, 50]].forEach(([a, b], i) => {
      sb.append('rect')
        .attr('x', a * PX_PER_KM * 0.5).attr('y', 0)
        .attr('width', (b - a) * PX_PER_KM * 0.5).attr('height', 6)
        .attr('fill', i % 2 ? '#F4F0E3' : '#181510')
        .attr('stroke', '#181510').attr('stroke-width', 1);
    });
    [0, 10, 25, 50].forEach(km => {
      sb.append('text').attr('x', km * PX_PER_KM * 0.5).attr('y', 20)
        .attr('text-anchor', 'middle').attr('class', 'map-scale-num').text(km);
    });
    sb.append('text').attr('x', 50 * PX_PER_KM * 0.5 + 22).attr('y', 8)
      .attr('class', 'map-scale-num').text('KM');

    // north arrow
    const na = g.append('g').attr('transform', `translate(${W - 52}, 52)`);
    na.append('path').attr('d', 'M0,-20 L7,10 L0,4 L-7,10 Z')
      .attr('fill', '#181510');
    na.append('text').attr('x', 0).attr('y', 28).attr('text-anchor', 'middle')
      .attr('class', 'map-scale-num').text('N');

    // plate inner hairline
    svg.append('rect').attr('x', 1).attr('y', 1).attr('width', W - 2).attr('height', H - 2)
      .attr('fill', 'none').attr('stroke', 'rgba(24,21,16,.3)').attr('stroke-width', 1);

    this._styleText();
    this._wireCursor();
  }

  _styleText() {
    const K = this.compact ? 1.75 : 1;      // rendered ≈390px wide, SVG text must be ~2× to stay legible
    this.svg.selectAll('text')
      .attr('font-family', '"IBM Plex Mono", monospace')
      .attr('fill', '#181510');
    this.svg.selectAll('.map-town-name').attr('font-size', 11.5 * K).attr('font-weight', 600);
    this.svg.selectAll('.map-mmi').attr('font-size', 12 * (this.compact ? 1.6 : 1)).attr('font-weight', 600);
    this.svg.selectAll('.map-fault-label').attr('font-size', 10.5 * (this.compact ? 1.5 : 1)).attr('letter-spacing', '.14em').attr('fill', '#C3271E');
    this.svg.selectAll('.map-epi-label').attr('font-size', 10.5 * (this.compact ? 1.6 : 1)).attr('font-weight', 600).attr('fill', '#C3271E');
    this.svg.selectAll('.map-sta-label').attr('font-size', 11.5 * K).attr('font-weight', 600);
    this.svg.selectAll('.map-range-label').attr('font-size', 9.5).attr('fill', 'rgba(24,21,16,.65)');
    this.svg.selectAll('.map-scale-num').attr('font-size', 9.5 * (this.compact ? 1.55 : 1));
    this.svg.selectAll('.map-ocean-label').attr('font-size', 12 * (this.compact ? 1.35 : 1)).attr('letter-spacing', '.5em').attr('fill', 'rgba(24,21,16,.45)');
    this.svg.selectAll('.map-grat line').attr('stroke', 'rgba(24,21,16,.4)').attr('stroke-width', 1.2);
  }

  _wireCursor() {
    const el = this.container.querySelector('svg');
    if (!el || !this.coordsEl) return;
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width * W;
      const my = (e.clientY - r.top) / r.height * H;
      const lat = 37.10 - (my / H) * 0.56;
      const lon = 121.86 - (mx / W) * 0.94;
      const dKm = Math.hypot(mx - EPI.x, my - EPI.y) / PX_PER_KM;
      this.coordsEl.textContent =
        `CURSOR ${lat.toFixed(3)}°N ${lon.toFixed(3)}°W · ${dKm.toFixed(1)} KM FROM EPICENTRE`;
    });
    el.addEventListener('mouseleave', () => {
      this.coordsEl.textContent = 'CURSOR — °N — °W';
    });
  }

  startReplay() {
    this.ringP.attr('opacity', 0.9);
    this.ringS.attr('opacity', 0.9);
    this._pHit = false; this._sHit = false;
  }

  /* surface distances in km */
  setWavefronts(pKm, sKm, te) {
    const rp = pKm * PX_PER_KM, rs = sKm * PX_PER_KM;
    this.ringP.attr('r', rp).attr('opacity', rp > 0 ? Math.max(0, 0.9 - rp / 1400) : 0);
    this.ringS.attr('r', rs).attr('opacity', rs > 0 ? Math.max(0, 0.95 - rs / 1600) : 0);
    const staDist = Math.hypot(STA.x - EPI.x, STA.y - EPI.y);
    if (!this._pHit && rp >= staDist) { this._pHit = true; this._flash('#1D53C4'); }
    if (!this._sHit && rs >= staDist) { this._sHit = true; this._flash('#C3271E'); }
  }

  _flash(color) {
    this.staPulse.attr('stroke', color).attr('r', 10).attr('opacity', 1)
      .transition().duration(1100).ease(d3.easeCubicOut)
      .attr('r', 34).attr('opacity', 0);
    this.staTri.attr('fill', color)
      .transition().duration(1400).attr('fill', '#F4F0E3');
  }

  endReplay() {
    this.ringP.transition().duration(600).attr('opacity', 0).attr('r', 0);
    this.ringS.transition().duration(600).attr('opacity', 0).attr('r', 0);
  }
}
