/* TEMBLOR — FIG. 4. The magnitude scale drawn honestly: four synthetic
   seismograms at one common gain. M4 is a hairline; M7 fills the plate. */

const MAGS = [
  { m: 4.0, label: 'M 4.0', note: 'FELT AS A TRUCK PASSING',   example: 'YERBA SECA SWARM, MAY 2024' },
  { m: 5.0, label: 'M 5.0', note: 'BOOKS OFF SHELVES',          example: 'PUERTO ALTO, 2011' },
  { m: 6.0, label: 'M 6.0', note: 'CHIMNEYS CRACK',             example: 'SAN NICANDRO, 1997' },
  { m: 7.0, label: 'M 7.0', note: 'THE FULL PLATE',             example: '≈2× THE 1989 EVENT' },
];

export class MagPlot {
  constructor(container, metaEl) {
    this.container = container;
    this.metaEl = metaEl;
    this.mode = 'true';
    this._build();
    window.addEventListener('resize', () => this._layout(), { passive: true });
  }

  _wave(m, width, halfAmp, seed) {
    // deterministic enveloped wavelet, denser for bigger events
    const N = 240;
    const pts = [];
    const dur = 0.55 + (m - 4) * 0.12; // fraction of column occupied by the wavelet
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const t = u * 10;
      let env = 0;
      const start = 0.5 - dur / 2, end = 0.5 + dur / 2;
      if (u > start && u < end) {
        const p = (u - start) / dur;
        env = Math.pow(Math.sin(Math.PI * p), 1.4) * (1 - 0.35 * p);
      }
      const carrier = Math.sin(2 * Math.PI * (2.2 + m * 0.28) * t + seed)
        + 0.55 * Math.sin(2 * Math.PI * (4.1 + m * 0.2) * t + seed * 2.7)
        + 0.3 * Math.sin(2 * Math.PI * 1.1 * t + seed * 1.3);
      pts.push([u * width, -env * carrier * halfAmp / 1.85]);
    }
    return pts;
  }

  _build() {
    this.svg = d3.select(this.container).append('svg')
      .attr('aria-hidden', 'true');
    this._layout();
  }

  _layout() {
    const w = this.container.clientWidth || 1100;
    const isNarrow = w < 700;
    const H = isNarrow ? 460 : 720;
    const padX = isNarrow ? 16 : 40;
    const topPad = 54, botPad = 86;
    const plotH = H - topPad - botPad;
    const maxHalf = plotH / 2;                    // M7 half-amplitude
    const colW = (w - padX * 2) / MAGS.length;
    const cy = topPad + plotH / 2;

    const svg = this.svg
      .attr('viewBox', `0 0 ${w} ${H}`)
      .attr('width', w).attr('height', H);
    svg.selectAll('*').remove();

    // baseline
    svg.append('line').attr('x1', padX).attr('x2', w - padX)
      .attr('y1', cy).attr('y2', cy)
      .attr('stroke', 'rgba(24,21,16,.25)').attr('stroke-width', 1)
      .attr('stroke-dasharray', '3 6');

    // amplitude bracket at right of each gap: ×10
    const line = d3.line().curve(d3.curveLinear);

    this.groups = [];
    MAGS.forEach((mg, i) => {
      const x0 = padX + i * colW + colW * 0.08;
      const wv = colW * 0.84;
      const trueHalf = maxHalf * Math.pow(10, mg.m - 7);
      const normHalf = Math.min(maxHalf * 0.32, maxHalf);
      const pts = this._wave(mg.m, wv, maxHalf, 1.7 + i);

      const g = svg.append('g').attr('transform', `translate(${x0},${cy})`);
      const scaleTrue = trueHalf / maxHalf;
      const scaleNorm = normHalf / maxHalf;
      const path = g.append('path')
        .attr('d', line(pts))
        .attr('fill', 'none')
        .attr('stroke', i === 3 ? '#C3271E' : '#181510')
        .attr('stroke-width', 1.4)
        .attr('vector-effect', 'non-scaling-stroke')
        .attr('transform', `scale(1, ${this.mode === 'true' ? scaleTrue : scaleNorm})`);
      path.style('transition', 'transform .8s cubic-bezier(.2,.7,.2,1)');
      this.groups.push({ path, scaleTrue, scaleNorm });

      // labels
      svg.append('text')
        .attr('x', x0 + wv / 2).attr('y', H - botPad + 34)
        .attr('text-anchor', 'middle')
        .attr('font-family', '"Archivo", sans-serif')
        .attr('font-weight', 800).attr('font-size', isNarrow ? 20 : 30)
        .attr('font-stretch', '125%')
        .attr('fill', i === 3 ? '#C3271E' : '#181510')
        .text(mg.label);
      if (!isNarrow) {
        svg.append('text')
          .attr('x', x0 + wv / 2).attr('y', H - botPad + 54)
          .attr('text-anchor', 'middle')
          .attr('font-family', '"IBM Plex Mono", monospace')
          .attr('font-size', 10)
          .attr('letter-spacing', '.1em')
          .attr('fill', 'rgba(24,21,16,.6)')
          .text(mg.note);
      }
      const ptp = (2 * maxHalf * Math.pow(10, mg.m - 7));
      svg.append('text')
        .attr('class', 'ptp-label')
        .attr('x', x0 + wv / 2).attr('y', H - botPad + (isNarrow ? 52 : 70))
        .attr('text-anchor', 'middle')
        .attr('font-family', '"IBM Plex Mono", monospace')
        .attr('font-size', isNarrow ? 8 : 9.5)
        .attr('fill', 'rgba(24,21,16,.58)')
        .text(this.mode === 'true'
          ? (isNarrow
              ? `${ptp < 10 ? ptp.toFixed(1) : Math.round(ptp)} PX`
              : `${ptp < 10 ? ptp.toFixed(1) : Math.round(ptp)} PX PEAK-TO-PEAK`)
          : (isNarrow
              ? `×${Math.round(Math.pow(10, 7 - mg.m)).toLocaleString('en-US')}`
              : `RE-GAINED ×${Math.round(Math.pow(10, 7 - mg.m)).toLocaleString('en-US')}`));

      // gain-step marker on the baseline between columns
      // (narrow: end-anchored so it sits over the previous trace's flat tail,
      //  clear of the next, larger wavelet)
      if (i < MAGS.length - 1) {
        const gx = padX + (i + 1) * colW;
        svg.append('text')
          .attr('class', 'x10-label')
          .attr('x', isNarrow ? gx - 2 : gx).attr('y', cy - 9)
          .attr('text-anchor', isNarrow ? 'end' : 'middle')
          .attr('font-family', '"IBM Plex Mono", monospace')
          .attr('font-size', isNarrow ? 9.5 : 11.5).attr('font-weight', 600)
          .attr('fill', '#1D53C4')
          .attr('opacity', this.mode === 'true' ? 1 : 0.25)
          .text('→ ×10');
      }
    });

    // M 9.2 dimension callout — the plate this page cannot print
    const co = svg.append('g')
      .attr('font-family', '"IBM Plex Mono", monospace')
      .attr('fill', 'rgba(24,21,16,.62)')
      .attr('opacity', this.mode === 'true' ? 1 : 0.15);
    const cx0 = padX + colW * 0.10;
    if (isNarrow) {
      co.append('text').attr('x', cx0 + 18).attr('y', topPad + 16).attr('font-size', 8.5)
        .text('M 9.2 AT THIS GAIN WOULD NEED');
      co.append('text').attr('x', cx0 + 18).attr('y', topPad + 30).attr('font-size', 8.5)
        .text('A 26-METRE PLATE — OFF THIS PAGE');
    } else {
      co.append('text').attr('x', cx0 + 26).attr('y', topPad + 20).attr('font-size', 11)
        .text('M 9.2 AT THIS GAIN WOULD NEED A PLATE');
      co.append('text').attr('x', cx0 + 26).attr('y', topPad + 38).attr('font-size', 11)
        .text('26 METRES TALL — NINE STOREYS, OFF THIS PAGE.');
    }
    co.append('line')
      .attr('x1', cx0 + 7).attr('x2', cx0 + 7)
      .attr('y1', topPad + (isNarrow ? 28 : 36)).attr('y2', 16)
      .attr('stroke', '#C3271E').attr('stroke-width', 1.6)
      .attr('stroke-dasharray', '4 4');
    co.append('path')
      .attr('d', `M ${cx0 + 7} 6 l -5 10 l 10 0 Z`)
      .attr('fill', '#C3271E');
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    // animate scale, then relabel
    this.groups.forEach(({ path, scaleTrue, scaleNorm }) => {
      path.attr('transform', `scale(1, ${mode === 'true' ? scaleTrue : scaleNorm})`);
    });
    if (this.metaEl) {
      this.metaEl.textContent = mode === 'true'
        ? 'COMMON GAIN · PEAK-TO-PEAK TO SCALE'
        : 'PER-TRACE GAIN · AMPLITUDES NOT COMPARABLE';
    }
    clearTimeout(this._relabel);
    this._relabel = setTimeout(() => this._layout(), 820);
  }
}
