/* ATELIER VITRAIL — dossier lancet, glass rack, reveals */
'use strict';

(() => {
  const V = window.VITRAIL;
  const LEAD = '#141518';

  /* ══ the Saint-Aubin lancet — before/after ══════════════ */

  function buildLancet(host, damaged, suffix) {
    const rng = V.mulberry32(damaged ? 4487 : 4487); /* identical geometry */
    const jr = V.mulberry32(damaged ? 911 : 912);    /* independent jitter */
    const svg = V.el('svg', {
      viewBox: '0 0 300 780', 'aria-hidden': 'true', focusable: 'false',
      preserveAspectRatio: 'xMidYMid slice',
    }, host);
    const defs = V.el('defs', null, svg);

    /* stone + opening */
    V.el('rect', { width: 300, height: 780, fill: '#1a1b1f' }, svg);
    const archOuter = 'M25,780 L25,215 Q25,52 150,28 Q275,52 275,215 L275,780 Z';
    const archInner = 'M39,780 L39,218 Q39,66 150,42 Q261,66 261,218 L261,780 Z';
    V.el('path', { d: archOuter, fill: '#0c0d0f' }, svg);
    const clip = V.el('clipPath', { id: 'lclip-' + suffix }, defs);
    V.el('path', { d: archInner }, clip);

    const glass = V.el('g', {
      class: 'lancet-glass', 'clip-path': `url(#lclip-${suffix})`,
    }, svg);

    /* quarry field — tall diamonds, jittered blanc */
    const DW = 44, DH = 62;
    const losses = damaged ? new Set(['3_5', '8_14']) : new Set();
    let col = 0;
    for (let cx = 39; cx <= 265; cx += DW / 2, col++) {
      let row = 0;
      const y0 = col % 2 ? 42 : 42 + DH / 2;
      for (let cy = y0; cy <= 800; cy += DH, row++) {
        const key = col + '_' + row;
        const lost = losses.has(key);
        const tintRoll = rng();
        let fill = V.shade(V.GLASS.blanc, (rng() - 0.5) * 0.10);
        if (tintRoll > 0.93) fill = V.shade(V.GLASS.fumee, 0.18);
        else if (tintRoll > 0.88) fill = V.shade(V.GLASS.or, 0.28);
        V.el('path', {
          d: `M${cx},${cy - DH / 2} L${cx + DW / 2},${cy} L${cx},${cy + DH / 2} L${cx - DW / 2},${cy} Z`,
          fill: lost ? '#c9ccc4' : fill,
          stroke: LEAD, 'stroke-width': lost ? 3.4 : 2,
          'stroke-linejoin': 'round',
        }, glass);
      }
    }

    /* grisaille tendrils on the quarries — quiet painted line */
    const gr = V.el('g', {
      fill: 'none', stroke: '#8a877a', 'stroke-width': 0.9, opacity: 0.5,
    }, glass);
    for (let i = 0; i < 30; i++) {
      const x = 50 + rng() * 200, y = 60 + rng() * 620;
      V.el('path', {
        d: `M${x.toFixed(1)},${y.toFixed(1)} q6,-9 13,-2 q7,7 -1,12`,
      }, gr);
    }

    /* three medallions */
    const meds = [
      { cy: 255, disc: V.GLASS.chartres, foil: [V.GLASS.ruby, V.GLASS.or], boss: V.GLASS.or },
      { cy: 425, disc: V.GLASS.ruby, foil: [V.GLASS.chartres, V.GLASS.blanc], boss: V.GLASS.or },
      { cy: 595, disc: V.GLASS.chartres, foil: [V.GLASS.emerald, V.GLASS.ruby], boss: V.GLASS.or },
    ];
    for (const md of meds) {
      const g = V.el('g', { transform: `translate(150,${md.cy})` }, glass);
      V.el('circle', { r: 62, fill: V.shade(md.disc, (jr() - 0.5) * 0.06), stroke: LEAD, 'stroke-width': 5 }, g);
      for (let i = 0; i < 4; i++) {
        const a = V.rad(45 + i * 90);
        V.el('circle', {
          cx: (Math.cos(a) * 30).toFixed(1), cy: (Math.sin(a) * 30).toFixed(1), r: 21,
          fill: V.shade(md.foil[i % 2], (jr() - 0.5) * 0.08),
          stroke: LEAD, 'stroke-width': 2.6,
        }, g);
      }
      V.el('circle', { r: 12.5, fill: md.boss, stroke: LEAD, 'stroke-width': 2.2 }, g);
      V.el('circle', { r: 62, fill: 'none', stroke: '#4a4d55', 'stroke-width': 0.8, opacity: 0.4 }, g);
    }

    /* trefoil in the arch head */
    const tre = [[150, 78, V.GLASS.ruby], [131, 104, V.GLASS.chartres], [169, 104, V.GLASS.chartres]];
    for (const [x, y, c] of tre) {
      V.el('circle', { cx: x, cy: y, r: 17, fill: c, stroke: LEAD, 'stroke-width': 3.4 }, glass);
    }

    /* donor inscription band */
    V.el('rect', { x: 40, y: 690, width: 220, height: 46, fill: V.GLASS.nuit, stroke: LEAD, 'stroke-width': 3.4 }, glass);
    const txt = V.el('text', {
      x: 150, y: 720, 'text-anchor': 'middle',
      fill: V.GLASS.or, 'font-family': "'EB Garamond', serif",
      'font-size': 15, 'letter-spacing': 2,
      textLength: 200, lengthAdjust: 'spacingAndGlyphs',
    }, glass);
    txt.textContent = 'ORATE PRO ANIMA IOHANNIS';

    /* border fillets: lead bed, ruby, alternating or-jaune billets */
    const border = 'M32,780 L32,216 Q32,58 150,34 Q268,58 268,216 L268,780';
    V.el('path', { d: border, fill: 'none', stroke: LEAD, 'stroke-width': 15 }, svg);
    V.el('path', { d: border, fill: 'none', stroke: V.GLASS.ruby, 'stroke-width': 10 }, svg);
    V.el('path', { d: border, fill: 'none', stroke: V.GLASS.or, 'stroke-width': 10, 'stroke-dasharray': '24 24' }, svg);

    /* ferramenta */
    for (const y of [170, 340, 510, 668]) {
      V.el('line', { x1: 39, y1: y, x2: 261, y2: y, stroke: '#0b0c0e', 'stroke-width': 6, 'clip-path': `url(#lclip-${suffix})` }, svg);
      V.el('line', { x1: 39, y1: y - 2.2, x2: 261, y2: y - 2.2, stroke: '#4a4d55', 'stroke-width': 1, opacity: 0.35, 'clip-path': `url(#lclip-${suffix})` }, svg);
    }

    /* ── damage state ── */
    if (damaged) {
      const dg = V.el('g', { 'clip-path': `url(#lclip-${suffix})` }, svg);

      /* grime blotches via turbulence alpha */
      const f = V.el('filter', { id: 'grime-' + suffix, x: '-10%', y: '-10%', width: '120%', height: '120%' }, defs);
      V.el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.018 0.026', numOctaves: 3, seed: 7 }, f);
      V.el('feColorMatrix', {
        type: 'matrix',
        values: '0 0 0 0 0.20  0 0 0 0 0.16  0 0 0 0 0.10  1.5 0 0 0 -0.62',
      }, f);
      V.el('rect', { x: 25, y: 28, width: 250, height: 752, filter: `url(#grime-${suffix})`, opacity: 0.55 }, dg);

      /* bowed panel shadow */
      const bow = V.el('radialGradient', { id: 'bow-' + suffix }, defs);
      V.el('stop', { offset: '0', 'stop-color': '#000', 'stop-opacity': 0.42 }, bow);
      V.el('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': 0 }, bow);
      V.el('ellipse', { cx: 150, cy: 340, rx: 95, ry: 62, fill: `url(#bow-${suffix})` }, dg);

      /* fractures — seeded random walks */
      const cr = V.mulberry32(44);
      for (let i = 0; i < 11; i++) {
        let x = 48 + cr() * 200, y = 60 + cr() * 600;
        let a = cr() * Math.PI * 2;
        let d = `M${x.toFixed(1)},${y.toFixed(1)}`;
        const segs = 4 + Math.floor(cr() * 4);
        for (let s = 0; s < segs; s++) {
          a += (cr() - 0.5) * 1.4;
          x += Math.cos(a) * (12 + cr() * 20);
          y += Math.sin(a) * (10 + cr() * 16);
          d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
        }
        V.el('path', { d, fill: 'none', stroke: '#17181a', 'stroke-width': 1.5, opacity: 0.9 }, dg);
      }
      /* 1907 mending leads slashing the middle medallion */
      V.el('line', { x1: 96, y1: 402, x2: 208, y2: 452, stroke: '#101114', 'stroke-width': 5 }, dg);
      V.el('line', { x1: 88, y1: 452, x2: 202, y2: 398, stroke: '#101114', 'stroke-width': 5 }, dg);
      V.el('line', { x1: 120, y1: 560, x2: 214, y2: 620, stroke: '#101114', 'stroke-width': 4.4 }, dg);
    }
  }

  const stage = document.querySelector('[data-lancet]');
  if (stage) {
    buildLancet(stage.querySelector('.lancet-before'), true, 'b');
    buildLancet(stage.querySelector('.lancet-after'), false, 'a');
    const range = stage.querySelector('.lancet-range');
    const fig = stage.closest('.lancet-fig') || stage;
    const setCut = v => {
      fig.style.setProperty('--cut', v + '%');
      fig.style.setProperty('--cutn', (v / 100).toFixed(3));
    };
    range.addEventListener('input', () => setCut(range.value));
    setCut(range.value);
  }

  /* ══ the glass rack ═════════════════════════════════════ */

  const RACK = [
    ['Bleu de Chartres', 'VL 011', '#2148c0', 'pot-metal, blown cylinder', 31,
      'The famous blue. Cobalt struck twice; it goes violet at dusk.'],
    ['Sang-de-bœuf', 'VL 044', '#8e1220', 'copper flash on clear', 18,
      'Flashed red — solid red pot-metal would read black at this depth.'],
    ['Or-jaune d’argent', 'VL 023', '#e5b93c', 'silver stain on blanc', 64,
      'Not a glass but a stain, fired in. The only gold worth the name.'],
    ['Vert bouteille', 'VL 072', '#4e6e26', 'iron green, cylinder', 42,
      'Iron and impatience. Best in borders and river water.'],
    ['Violet d’évêque', 'VL 038', '#5d3080', 'manganese, crown', 27,
      'Cut from small crowns. For vestments and thunderclouds.'],
    ['Blanc perlé', 'VL 001', '#e9e5d3', 'seedy crown', 88,
      'Full of seeds and stones. Carries grisaille like paper carries ink.'],
    ['Rose de Reims', 'VL 057', '#c4788e', 'gold-pink flash', 51,
      'Gold-ruby laid thin. Flesh tones, dawn skies, apologies.'],
    ['Ambre brûlé', 'VL 029', '#b26b1d', 'sulphur amber, cylinder', 46,
      'Honey at noon, ale at vespers.'],
    ['Bleu nuit', 'VL 016', '#16255f', 'deep cobalt pot-metal', 12,
      'Nearly opaque. Use in slivers, or the window goes to sleep.'],
    ['Vert émeraude', 'VL 068', '#1f7a4a', 'chromium, cylinder', 38,
      'A nineteenth-century green; we ration it for Eden scenes.'],
    ['Gris fumée', 'VL 005', '#9aa0a2', 'smoke grisaille', 71,
      'The quiet one. Whole chapels are glazed in nothing else.'],
    ['Rouge grenat', 'VL 049', '#6e1020', 'copper flash, doubled', 15,
      'Double-flashed garnet for martyrs’ robes; abrade it to write in light.'],
  ];

  const rack = document.querySelector('[data-rack]');
  if (rack) {
    const rr = V.mulberry32(2024);
    RACK.forEach(([name, ref, hex, process, trans, note], i) => {
      const li = document.createElement('li');
      li.setAttribute('tabindex', '0');
      li.setAttribute('data-reveal', '');
      li.style.setProperty('--c', hex);
      li.style.setProperty('--i', i % 4);

      const fig = document.createElement('div');
      fig.className = 'sw-glass';
      const svg = V.el('svg', { viewBox: '0 0 160 200', 'aria-hidden': 'true', focusable: 'false' }, fig);
      const defs = V.el('defs', null, svg);
      const cp = V.el('clipPath', { id: 'swclip-' + i }, defs);
      V.el('rect', { x: 5, y: 5, width: 150, height: 190 }, cp);
      const body = V.el('g', { 'clip-path': `url(#swclip-${i})` }, svg);
      V.el('rect', { x: 5, y: 5, width: 150, height: 190, fill: V.shade(hex, (rr() - 0.5) * 0.05) }, body);
      /* striations */
      for (let s = 0; s < 3; s++) {
        const x = 22 + rr() * 116, bow = (rr() - 0.5) * 30;
        V.el('path', {
          d: `M${x.toFixed(1)},-4 q${bow.toFixed(1)},100 0,208`,
          fill: 'none', stroke: V.shade(hex, 0.16),
          'stroke-width': (4 + rr() * 7).toFixed(1), opacity: 0.3,
        }, body);
      }
      /* seeds (bubbles) */
      for (let s = 0; s < 4; s++) {
        V.el('ellipse', {
          cx: (18 + rr() * 124).toFixed(1), cy: (16 + rr() * 168).toFixed(1),
          rx: (0.8 + rr() * 1.6).toFixed(2), ry: (1.6 + rr() * 3).toFixed(2),
          fill: V.shade(hex, 0.24), opacity: 0.55,
        }, body);
      }
      /* light streak + seedy texture (filter defined in hero svg) */
      V.el('path', { d: 'M28,-6 L74,-6 L36,206 L-10,206 Z', fill: '#fff', opacity: 0.08 }, body);
      V.el('rect', { x: 5, y: 5, width: 150, height: 190, filter: 'url(#seedtex)', opacity: 0.14 }, body);
      V.el('rect', { x: 5, y: 5, width: 150, height: 190, fill: 'none', stroke: LEAD, 'stroke-width': 8 }, svg);
      const pool = document.createElement('div');
      pool.className = 'sw-pool';
      fig.appendChild(pool);
      li.appendChild(fig);

      const cap = document.createElement('p');
      cap.innerHTML =
        `<span class="sw-name">${name}</span>` +
        `<span class="sw-meta">${ref} · ${process} · T ${trans}%</span>` +
        `<span class="sw-note">${note}</span>`;
      li.appendChild(cap);
      rack.appendChild(li);
    });
  }

  /* ══ reveals ════════════════════════════════════════════ */

  const revealEls = [...document.querySelectorAll('[data-reveal]')];
  /* stagger index within each parent section */
  document.querySelectorAll('section, footer').forEach(sec => {
    [...sec.querySelectorAll('[data-reveal]')].forEach((n, i) => {
      if (!n.style.getPropertyValue('--i')) n.style.setProperty('--i', Math.min(i, 6));
    });
  });
  if (V.reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(n => n.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(n => io.observe(n));
  }

  /* ══ load choreography ══════════════════════════════════ */

  const arm = () => document.body.classList.add('loaded');
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(arm);
    setTimeout(arm, 900); /* belt and braces */
  } else {
    setTimeout(arm, 300);
  }
})();
