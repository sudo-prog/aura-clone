/* KESSLER WATCH — debris census by altitude band (d3, single-series magnitude) */

import { CENSUS, CENSUS_TOTAL } from './data.js';

export function initCensus() {
  const host = document.querySelector('#census-chart');
  if (!host || typeof d3 === 'undefined') return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AMBER = '#FFB454';
  const AMBER_DIM = 'rgba(255,180,84,0.52)';
  const INK_DIM = '#64788E';
  const INK = '#ADBDCD';
  const GRIDC = 'rgba(24,42,64,0.9)';

  let tooltip = document.querySelector('#census-tip');
  let animated = reduced; /* once the grow-in has played, resize re-renders draw full-width */

  function render() {
    host.innerHTML = '';
    const W = Math.max(320, host.clientWidth);
    const isNarrow = W < 640;
    const M = { top: 8, right: isNarrow ? 64 : 210, bottom: 34, left: isNarrow ? 106 : 110 };
    const rowH = isNarrow ? 40 : 46;
    const H = M.top + M.bottom + CENSUS.length * rowH;

    const svg = d3.select(host).append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')
      .attr('role', 'img')
      .attr('aria-label',
        `Bar chart: catalogued debris fragments larger than ten centimetres by altitude band. ` +
        CENSUS.map((d) => `${d.band} kilometres: ${d.count}`).join('; ') +
        `. Total ${CENSUS_TOTAL}.`);

    const x = d3.scaleLinear().domain([0, 1800]).range([M.left, W - M.right]);
    const y = d3.scaleBand().domain(CENSUS.map((d) => d.band))
      .range([M.top, H - M.bottom]).paddingInner(0.42);

    /* recessive vertical grid */
    const ticks = isNarrow ? [0, 600, 1200, 1800] : [0, 300, 600, 900, 1200, 1500, 1800];
    svg.append('g').selectAll('line').data(ticks).join('line')
      .attr('x1', (d) => x(d)).attr('x2', (d) => x(d))
      .attr('y1', M.top).attr('y2', H - M.bottom)
      .attr('stroke', GRIDC).attr('stroke-width', 1);

    svg.append('g').selectAll('text').data(ticks).join('text')
      .attr('x', (d) => x(d)).attr('y', H - M.bottom + 22)
      .attr('text-anchor', 'middle')
      .attr('class', 'cx-tick')
      .text((d) => d === 0 ? '0' : d.toLocaleString('en-US'));

    /* band labels (altitude, ascending upward) */
    svg.append('g').selectAll('text').data(CENSUS).join('text')
      .attr('x', M.left - 12)
      .attr('y', (d) => y(d.band) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', isNarrow ? '10px' : null)
      .attr('class', (d) => 'cy-label' + (d.peak ? ' cy-label--peak' : ''))
      .text((d) => d.band + ' KM');

    /* bars */
    const bars = svg.append('g').selectAll('rect').data(CENSUS).join('rect')
      .attr('x', x(0) + 1)
      .attr('y', (d) => y(d.band))
      .attr('height', y.bandwidth())
      .attr('rx', 2)
      .attr('fill', (d) => (d.peak ? AMBER : AMBER_DIM))
      .attr('width', animated ? (d) => Math.max(2, x(d.count) - x(0) - 1) : 0);

    /* count labels — direct-label every bar end (single series, sparse rows) */
    const labels = svg.append('g').selectAll('text').data(CENSUS).join('text')
      .attr('x', (d) => x(d.count) + 10)
      .attr('y', (d) => y(d.band) + y.bandwidth() / 2 + 4)
      .attr('class', (d) => 'cv-label' + (d.peak ? ' cv-label--peak' : ''))
      .attr('opacity', animated ? 1 : 0)
      .text((d) => d.count.toLocaleString('en-US'));

    /* annotation on the peak band — hangs in the gutter below the bar tip,
       right-aligned so it can never clip and never crowds the value label */
    if (!isNarrow) {
      const peak = CENSUS.find((d) => d.peak);
      const py = y(peak.band) + y.bandwidth() / 2;
      const g = svg.append('g').attr('class', 'cx-annot');
      g.append('text').attr('x', W - 8).attr('y', py + 18)
        .attr('text-anchor', 'end').attr('class', 'cx-annot-hd').text('DENSEST NEIGHBORHOOD');
      g.append('text').attr('x', W - 8).attr('y', py + 32)
        .attr('text-anchor', 'end').text('LEGACY BREAKUPS 1991–2022');
    }

    /* hover layer */
    const hit = svg.append('g').selectAll('rect').data(CENSUS).join('rect')
      .attr('x', M.left).attr('width', W - M.left - M.right)
      .attr('y', (d) => y(d.band) - 6).attr('height', y.bandwidth() + 12)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    hit.on('pointerenter', function (e, d) {
      bars.attr('fill', (b) => (b === d ? AMBER : b.peak ? 'rgba(255,180,84,0.8)' : 'rgba(255,180,84,0.34)'));
      tooltip.innerHTML =
        `<strong>${d.band} KM</strong>` +
        `<span>${d.count.toLocaleString('en-US')} FRAGMENTS · ${((d.count / CENSUS_TOTAL) * 100).toFixed(1)}%</span>` +
        `<span>${d.lo >= 700 && d.hi <= 1000 ? 'DECAY BY DRAG: CENTURIES' : d.hi <= 600 ? 'DECAY BY DRAG: YEARS' : 'DECAY BY DRAG: DECADES +'}</span>`;
      tooltip.classList.add('is-on');
    });
    hit.on('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      const tx = Math.min(e.clientX - r.left + 14, r.width - tooltip.offsetWidth - 8);
      tooltip.style.transform = `translate(${tx}px, ${e.clientY - r.top - tooltip.offsetHeight - 10}px)`;
    });
    hit.on('pointerleave', () => {
      bars.attr('fill', (b) => (b.peak ? AMBER : AMBER_DIM));
      tooltip.classList.remove('is-on');
    });

    /* grow-in on first view only — resize re-renders must not re-zero the bars */
    if (!animated) {
      const io = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        animated = true;
        bars.transition().duration(900)
          .delay((d, i) => i * 55)
          .ease(d3.easeCubicOut)
          .attr('width', (d) => Math.max(2, x(d.count) - x(0) - 1));
        labels.transition().delay((d, i) => 450 + i * 55).duration(500).attr('opacity', 1);
      }, { threshold: 0.35 });
      io.observe(host);
    }
  }

  render();
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(render, 180);
  });
}
