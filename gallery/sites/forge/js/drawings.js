/* ============================================================
   BLACKWATER FORGE — the shop's own elevations.
   Three SVG drawings generated in place: the Harrowden gate,
   Gyuto Nº 41's damascus (layered waves, as folded), and the
   Vessey stair rail. Quench-steel lines on clinker; straw
   marks where iron meets iron. Deterministic — same drawing
   every visit, like a drawing pinned to the wall.
   ============================================================ */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const QUENCH = '#8CA0AC', QDIM = '#73838D', STRAW = '#E2A93E';

  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function txt(parent, x, y, s, anchor) {
    const t = el('text', { x, y, class: 'dwg-label', 'text-anchor': anchor || 'middle' }, parent);
    t.textContent = s;
    return t;
  }

  /* spiral path: archimedean, θ from a small start out to `turns` */
  function spiralPath(cx, cy, rMax, turns, dir, rot) {
    const pts = [];
    const steps = Math.round(turns * 26);
    for (let s = 0; s <= steps; s++) {
      const q = s / steps;
      const th = rot + dir * q * turns * Math.PI * 2;
      const r = 1.5 + (rMax - 1.5) * Math.pow(q, 0.82);
      pts.push((cx + r * Math.cos(th)).toFixed(1) + ',' + (cy + r * Math.sin(th)).toFixed(1));
    }
    return 'M' + pts.join(' L');
  }

  /* ================= THE HARROWDEN GATE ================= */
  function gate() {
    const svg = document.getElementById('gateSvg');
    if (!svg) return;
    const g = el('g', { fill: 'none', stroke: QUENCH, 'stroke-width': 2, 'stroke-linecap': 'round' }, svg);

    // ground
    el('line', { x1: 30, y1: 566, x2: 970, y2: 566, stroke: QDIM, 'stroke-width': 1, 'stroke-dasharray': '5 6', opacity: 0.7 }, g);

    // posts with ball finials
    for (const px of [70, 912]) {
      el('rect', { x: px, y: 140, width: 18, height: 426, 'stroke-width': 2.4 }, g);
      el('circle', { cx: px + 9, cy: 126, r: 11 }, g);
      el('line', { x1: px - 6, y1: 566, x2: px + 24, y2: 566, 'stroke-width': 3 }, g);
    }

    // leaves
    const leaves = [
      { x0: 96, x1: 496, hinge: 96 },
      { x0: 504, x1: 904, hinge: 904 }
    ];
    const topY = (leaf, x) => {
      // swept top rail: low at hinge, rising to the meeting stile
      const t = leaf.hinge === leaf.x0 ? (x - leaf.x0) / (leaf.x1 - leaf.x0) : (leaf.x1 - x) / (leaf.x1 - leaf.x0);
      return 216 - 68 * Math.pow(t, 1.25);
    };

    for (const leaf of leaves) {
      const { x0, x1 } = leaf;
      // frame: stiles
      el('line', { x1: x0, y1: topY(leaf, x0), x2: x0, y2: 544, 'stroke-width': 3 }, g);
      el('line', { x1: x1, y1: topY(leaf, x1), x2: x1, y2: 544, 'stroke-width': 3 }, g);
      // bottom + mid rails (doubled lines, like flat bar on edge)
      for (const ry of [544, 536]) el('line', { x1: x0, y1: ry, x2: x1, y2: ry, 'stroke-width': ry === 544 ? 3 : 1.2 }, g);
      for (const ry of [432, 440]) el('line', { x1: x0, y1: ry, x2: x1, y2: ry, 'stroke-width': ry === 432 ? 2.4 : 1.2 }, g);
      // top rail: swept curve
      let d = `M${x0},${topY(leaf, x0).toFixed(1)}`;
      for (let x = x0 + 20; x <= x1; x += 20) d += ` L${x},${topY(leaf, x).toFixed(1)}`;
      el('path', { d, 'stroke-width': 2.6 }, g);
      // second top line
      d = `M${x0},${(topY(leaf, x0) + 9).toFixed(1)}`;
      for (let x = x0 + 20; x <= x1; x += 20) d += ` L${x},${(topY(leaf, x) + 9).toFixed(1)}`;
      el('path', { d, 'stroke-width': 1.2 }, g);

      // vertical bars with spear finials
      const nBars = 11;
      for (let b = 1; b <= nBars; b++) {
        const x = x0 + (b * (x1 - x0)) / (nBars + 1);
        const yt = topY(leaf, x) + 9;
        el('line', { x1: x, y1: 536, x2: x, y2: yt, 'stroke-width': 1.5, opacity: 0.85 }, g);
        // spear above the top rail
        const ys = topY(leaf, x);
        el('line', { x1: x, y1: ys, x2: x, y2: ys - 14, 'stroke-width': 1.5 }, g);
        el('path', { d: `M${x},${ys - 30} L${x - 4.5},${ys - 14} L${x + 4.5},${ys - 14} Z`, fill: QUENCH, stroke: 'none', opacity: 0.9 }, g);
        // collar at the mid rail
        el('circle', { cx: x, cy: 436, r: 2.6, fill: STRAW, stroke: 'none' }, g);
      }

      // scroll panel between mid and bottom rail: S-scroll pairs
      const nCells = 5;
      for (let c = 0; c < nCells; c++) {
        const cx0 = x0 + (c * (x1 - x0)) / nCells, cw = (x1 - x0) / nCells;
        const mx = cx0 + cw / 2;
        el('path', { d: spiralPath(mx - cw * 0.20, 468, 17, 2.0, 1, Math.PI * 0.2), 'stroke-width': 1.8, opacity: 0.9 }, g);
        el('path', { d: spiralPath(mx + cw * 0.20, 510, 17, 2.0, -1, Math.PI * 1.2), 'stroke-width': 1.8, opacity: 0.9 }, g);
        el('line', { x1: mx - cw * 0.20 + 12, y1: 474, x2: mx + cw * 0.20 - 12, y2: 504, 'stroke-width': 1.6, opacity: 0.8 }, g);
        el('circle', { cx: mx, cy: 489, r: 2.6, fill: STRAW, stroke: 'none' }, g);
      }

      // quadrant scrolls under the top rail, at the hinge side
      const hx = leaf.hinge === x0 ? x0 + 52 : x1 - 52;
      el('path', { d: spiralPath(hx, topY(leaf, hx) + 46, 24, 2.2, leaf.hinge === x0 ? 1 : -1, Math.PI * 1.5), 'stroke-width': 1.8, opacity: 0.9 }, g);
      el('circle', { cx: hx, cy: topY(leaf, hx) + 46, r: 2.4, fill: STRAW, stroke: 'none' }, g);
    }

    // meeting stiles: lock plate and ring
    el('rect', { x: 486, y: 330, width: 28, height: 56, 'stroke-width': 1.8 }, g);
    el('circle', { cx: 500, cy: 358, r: 9, 'stroke-width': 1.8 }, g);
    el('circle', { cx: 500, cy: 351, r: 2.2, fill: STRAW, stroke: 'none' }, g);

    // overthrow: central scrollwork above the meeting
    el('path', { d: spiralPath(462, 120, 26, 2.3, 1, Math.PI * 0.1), 'stroke-width': 1.8 }, g);
    el('path', { d: spiralPath(538, 120, 26, 2.3, -1, Math.PI * 0.9), 'stroke-width': 1.8 }, g);
    el('line', { x1: 500, y1: 148, x2: 500, y2: 96, 'stroke-width': 1.8 }, g);
    el('path', { d: 'M500,74 L494,96 L506,96 Z', fill: QUENCH, stroke: 'none' }, g);
    el('circle', { cx: 500, cy: 148, r: 2.6, fill: STRAW, stroke: 'none' }, g);

    // dimension: overall span
    const dim = el('g', { stroke: QDIM, 'stroke-width': 1, opacity: 0.85 }, svg);
    el('line', { x1: 96, y1: 46, x2: 904, y2: 46, 'stroke-dasharray': '1 0' }, dim);
    el('line', { x1: 96, y1: 38, x2: 96, y2: 54 }, dim);
    el('line', { x1: 904, y1: 38, x2: 904, y2: 54 }, dim);
    el('path', { d: 'M96,46 l12,-4 v8 Z M904,46 l-12,-4 v8 Z', fill: QDIM, stroke: 'none' }, dim);
    txt(svg, 500, 38, '4 620');
    // height dimension
    el('line', { x1: 950, y1: 140, x2: 950, y2: 566 }, dim);
    el('line', { x1: 942, y1: 140, x2: 958, y2: 140 }, dim);
    el('line', { x1: 942, y1: 566, x2: 958, y2: 566 }, dim);
    const vt = txt(svg, 966, 356, '2 400');
    vt.setAttribute('transform', 'rotate(90 966 356)');
  }

  /* ================= GYUTO Nº 41 — DAMASCUS ================= */
  function knife() {
    const svg = document.getElementById('knifeSvg');
    if (!svg) return;
    const rnd = mulberry(4141);

    const bladePath = 'M350,88 C700,82 960,98 1148,148 C980,210 700,238 350,232 Z';
    const defs = el('defs', {}, svg);
    const clip = el('clipPath', { id: 'bladeClip' }, defs);
    el('path', { d: bladePath }, clip);

    // gradients
    const spineShade = el('linearGradient', { id: 'spineShade', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': '#000', 'stop-opacity': 0.42 }, spineShade);
    el('stop', { offset: '0.4', 'stop-color': '#000', 'stop-opacity': 0 }, spineShade);
    const edgeShine = el('linearGradient', { id: 'edgeShine', x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
    el('stop', { offset: '0', 'stop-color': '#F4F7F9', 'stop-opacity': 0.75 }, edgeShine);
    el('stop', { offset: '0.22', 'stop-color': '#DDE5EA', 'stop-opacity': 0.28 }, edgeShine);
    el('stop', { offset: '0.45', 'stop-color': '#fff', 'stop-opacity': 0 }, edgeShine);
    const ferruleGrad = el('linearGradient', { id: 'ferruleGrad', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': '#5C3320' }, ferruleGrad);
    el('stop', { offset: '0.35', 'stop-color': '#C97C4A' }, ferruleGrad);
    el('stop', { offset: '1', 'stop-color': '#6E3B22' }, ferruleGrad);

    // ---- handle: octagonal bog oak ----
    const hg = el('g', {}, svg);
    el('path', { d: 'M70,132 L318,124 L318,178 L70,172 L58,152 Z', fill: '#261C11', stroke: '#463522', 'stroke-width': 1.5 }, hg);
    el('path', { d: 'M70,132 L318,124 L318,140 L70,146 L60,142 Z', fill: '#342619', stroke: 'none' }, hg);
    el('path', { d: 'M70,164 L318,164 L318,178 L70,172 L62,166 Z', fill: '#17100A', stroke: 'none' }, hg);
    el('path', { d: 'M70,132 L58,152 L70,172', fill: 'none', stroke: '#3A2C1E', 'stroke-width': 1.2 }, hg);
    // ferrule
    el('rect', { x: 318, y: 120, width: 32, height: 62, rx: 3, fill: 'url(#ferruleGrad)', stroke: '#4A2A18', 'stroke-width': 1 }, hg);

    // ---- damascus: layered waves, ladder pattern ----
    const bandG = el('g', { 'clip-path': 'url(#bladeClip)' }, svg);
    el('rect', { x: 340, y: 70, width: 820, height: 180, fill: '#23272C' }, bandG);

    const rungs = [];
    for (let x = 396; x < 1150; x += 86) rungs.push(x + rnd() * 18 - 9);
    const phase = [];
    for (let i = 0; i < 32; i++) phase.push(rnd() * Math.PI * 2);

    const rowY = (i, x) => {
      let y = 62 + i * 6.1;
      y += 5.2 * Math.sin(x * 0.0105 + phase[i]);            // the fold
      y += 2.0 * Math.sin(x * 0.027 + phase[i] * 1.7);       // finer fold
      for (const xr of rungs) {                               // ladder rungs: bands dip together
        const dxr = (x - xr) / 15;
        y += 11 * Math.exp(-dxr * dxr);
      }
      return y;
    };

    for (let i = 0; i < 30; i += 2) {
      let d = `M340,${rowY(i, 340).toFixed(1)}`;
      for (let x = 352; x <= 1160; x += 12) d += ` L${x},${rowY(i, x).toFixed(1)}`;
      for (let x = 1160; x >= 340; x -= 12) d += ` L${x},${rowY(i + 1, x).toFixed(1)}`;
      el('path', { d: d + ' Z', fill: '#B9C1C8', stroke: 'none' }, bandG);
    }

    // steel shading over the pattern
    el('path', { d: bladePath, fill: 'url(#spineShade)' }, svg);
    el('path', { d: bladePath, fill: 'url(#edgeShine)' }, svg);
    el('path', { d: bladePath, fill: 'none', stroke: '#55636D', 'stroke-width': 1.6 }, svg);

    // maker's mark
    txt(svg, 385, 110, 'Nº 41', 'start').setAttribute('fill', QDIM);

    // dimension under the edge
    const dim = el('g', { stroke: QDIM, 'stroke-width': 1, opacity: 0.85 }, svg);
    el('line', { x1: 350, y1: 268, x2: 1148, y2: 268 }, dim);
    el('line', { x1: 350, y1: 260, x2: 350, y2: 276 }, dim);
    el('line', { x1: 1148, y1: 260, x2: 1148, y2: 276 }, dim);
    txt(svg, 749, 290, 'edge 210 mm · 168 layers');
  }

  /* ================= THE VESSEY STAIR RAIL ================= */
  function rail() {
    const svg = document.getElementById('railSvg');
    if (!svg) return;
    const g = el('g', { fill: 'none', stroke: QDIM, 'stroke-width': 1.4 }, svg);

    // ground
    el('line', { x1: 50, y1: 515, x2: 950, y2: 515, 'stroke-dasharray': '5 6', opacity: 0.7 }, g);

    // curtail step (rounded first step)
    el('path', { d: 'M216,470 L136,470 A22.5,22.5 0 0,0 136,515 L216,515', 'stroke-width': 1.6 }, g);

    // steps
    let d = 'M216,515 L216,470';
    for (let i = 0; i < 8; i++) {
      const x = 216 + i * 66, y = 470 - i * 45;
      d += ` L${x},${y} L${x + 66},${y} L${x + 66},${y - 45}`;
    }
    el('path', { d, 'stroke-width': 1.6 }, g);

    // rail: y = 382 - 0.6818(x - 216)
    const railY = (x) => 382 - 0.6818 * (x - 216);
    const railG = el('g', { fill: 'none', stroke: '#A9BAC4', 'stroke-width': 4.5, 'stroke-linecap': 'round' }, svg);
    el('line', { x1: 216, y1: railY(216), x2: 756, y2: railY(756) }, railG);
    // wreathed volute over the curtail
    el('path', { d: 'M216,382 C196,396 178,410 166,420', 'stroke-width': 4 }, railG);
    el('path', { d: spiralPath(150, 432, 24, 2.1, 1, Math.PI * 0.28), 'stroke-width': 3 }, railG);

    // balusters: two per tread, hand-tapered (drawn as fine lines with collars)
    const bals = el('g', { stroke: QUENCH, 'stroke-width': 2, opacity: 0.85 }, svg);
    for (let i = 0; i < 8; i++) {
      const ty = 470 - i * 45;
      for (const off of [20, 46]) {
        const x = 216 + i * 66 + off;
        el('line', { x1: x, y1: ty, x2: x, y2: railY(x) + 2 }, bals);
        const my = (ty + railY(x)) / 2;
        el('rect', { x: x - 3, y: my - 2, width: 6, height: 4, fill: QUENCH, stroke: 'none' }, bals);
      }
    }
    // cluster at the volute
    for (const bx of [136, 150, 164]) {
      el('line', { x1: bx, y1: 470, x2: bx, y2: 444, stroke: QUENCH, 'stroke-width': 1.8 }, bals);
    }
    el('circle', { cx: 150, cy: 432, r: 2.6, fill: STRAW, stroke: 'none' }, bals);

    // detail circle: rail section
    const det = el('g', { fill: 'none', stroke: QUENCH, 'stroke-width': 1.5 }, svg);
    el('line', { x1: 500, y1: railY(500) - 4, x2: 806, y2: 108, stroke: QDIM, 'stroke-width': 1, 'stroke-dasharray': '4 5' }, det);
    el('circle', { cx: 866, cy: 96, r: 64 }, det);
    // handrail profile: crowned flat bar, 44 × 12
    el('path', { d: 'M830,86 Q866,70 902,86 L902,102 Q898,106 894,106 L838,106 Q834,106 830,102 Z', stroke: '#A9BAC4', 'stroke-width': 2 }, det);
    el('line', { x1: 830, y1: 116, x2: 902, y2: 116, stroke: QDIM, 'stroke-width': 1 }, det);
    el('line', { x1: 830, y1: 111, x2: 830, y2: 121, stroke: QDIM, 'stroke-width': 1 }, det);
    el('line', { x1: 902, y1: 111, x2: 902, y2: 121, stroke: QDIM, 'stroke-width': 1 }, det);
    txt(svg, 866, 182, 'rail section 44 × 12');

    // pitch marker
    const pit = el('g', { stroke: QDIM, 'stroke-width': 1, opacity: 0.85 }, svg);
    el('path', { d: 'M320,470 A104,104 0 0,0 302,411', fill: 'none' }, pit);
    el('line', { x1: 216, y1: 470, x2: 360, y2: 470 }, pit);
    txt(svg, 352, 442, '34°');

    // going dimension
    el('line', { x1: 216, y1: 540, x2: 744, y2: 540, stroke: QDIM, 'stroke-width': 1 }, svg);
    el('line', { x1: 216, y1: 532, x2: 216, y2: 548, stroke: QDIM, 'stroke-width': 1 }, svg);
    el('line', { x1: 744, y1: 532, x2: 744, y2: 548, stroke: QDIM, 'stroke-width': 1 }, svg);
    txt(svg, 380, 556, 'going 4 224');
  }

  gate();
  knife();
  rail();
})();
