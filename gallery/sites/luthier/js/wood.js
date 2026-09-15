// Tonewood as fine SVG line topography — generated, never downloaded.
// Spruce: bookmatched growth rings, tightest at the centre joint, widening
// toward the flanks (as a real two-piece top is jointed). Maple: tiger-stripe
// curl running ACROSS the grain in mirrored chevrons (a bookmatched back).

const NS = 'http://www.w3.org/2000/svg';
const VW = 640, VH = 800;

function el(name, attrs) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

// deterministic noise so every visit shows the same billet
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// the plate that sleeps inside the billet — chalk outline of the body,
// drawn the way a maker traces the mould before the saw comes out
const HALF_OUTLINE =
  'M 320 112 C 388 110, 452 138, 459 205 C 464 258, 447 305, 424 330 ' +
  'C 404 345, 401 365, 401 390 C 401 415, 406 435, 430 450 ' +
  'C 452 462, 480 490, 489 545 C 496 630, 448 698, 320 700';

function chalkOutline(svg, stroke, width) {
  for (const t of [null, 'translate(640 0) scale(-1 1)']) {
    const attrs = {
      d: HALF_OUTLINE, fill: 'none', stroke, 'stroke-width': width,
      'stroke-linecap': 'round',
    };
    if (t) attrs.transform = t;
    svg.appendChild(el('path', attrs));
  }
}

export function buildSpruce(container) {
  const rnd = mulberry(20111114); // felled November 2011
  const svg = el('svg', { viewBox: `0 0 ${VW} ${VH}`, preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' });

  const defs = el('defs', {});
  const grad = el('linearGradient', { id: 'spruceBg', x1: '0', y1: '0', x2: '1', y2: '0.25' });
  grad.appendChild(el('stop', { offset: '0', 'stop-color': '#EBDCB4' }));
  grad.appendChild(el('stop', { offset: '0.5', 'stop-color': '#F2E7C8' }));
  grad.appendChild(el('stop', { offset: '1', 'stop-color': '#E7D6AA' }));
  defs.appendChild(grad);
  svg.appendChild(defs);
  svg.appendChild(el('rect', { width: VW, height: VH, fill: 'url(#spruceBg)' }));

  const cx = VW / 2;
  // rings mirror out from the centre joint, gap widening with distance —
  // a bookmatched two-piece top, tightest grain at the glue line
  let d = 2.6;
  let ring = 0;
  while (d < cx - 2) {
    const wander = 1.2 + rnd() * 1.6;
    const phase = rnd() * Math.PI * 2;
    const late = ring % 2 === 0; // latewood line alternates heavier
    for (const side of [-1, 1]) {
      const x = cx + side * d;
      let path = `M ${x.toFixed(1)} -4`;
      for (let y = 40; y <= VH + 40; y += 44) {
        const ox = side * (wander * Math.sin(y * 0.006 + phase) + (rnd() - 0.5) * 1.4);
        path += ` L ${(x + ox).toFixed(1)} ${y}`;
      }
      svg.appendChild(el('path', {
        d: path, fill: 'none',
        stroke: late ? 'rgba(138,98,44,0.60)' : 'rgba(168,132,74,0.28)',
        'stroke-width': late ? 1.35 : 0.65,
      }));
    }
    d += 2.5 + d * 0.02 + rnd() * 0.9;
    ring++;
  }

  // the chalked plate, with its f-holes — top eyes leaning toward the joint
  chalkOutline(svg, 'rgba(126,80,30,0.5)', 2.2);
  const fL = el('use', { x: 0, y: 0, width: 44, height: 110, transform: 'translate(234 366)' });
  fL.setAttribute('href', '#fhole');
  fL.setAttribute('color', 'rgba(126,80,30,0.58)');
  const fR = el('use', { x: 0, y: 0, width: 44, height: 110, transform: 'translate(406 366) scale(-1 1)' });
  fR.setAttribute('href', '#fhole');
  fR.setAttribute('color', 'rgba(126,80,30,0.58)');
  svg.appendChild(fL); svg.appendChild(fR);

  // the centre joint itself — the rubbed glue line
  svg.appendChild(el('line', {
    x1: cx, y1: 0, x2: cx, y2: VH,
    stroke: 'rgba(120,84,36,0.55)', 'stroke-width': 1.6,
  }));

  // faint medullary shimmer (cross-silk) — sparse horizontal ticks
  for (let i = 0; i < 90; i++) {
    const x = rnd() * VW, y = rnd() * VH, w = 6 + rnd() * 16;
    svg.appendChild(el('line', {
      x1: x, y1: y, x2: x + w, y2: y + (rnd() - 0.5) * 2,
      stroke: 'rgba(255,248,225,0.35)', 'stroke-width': 0.6,
    }));
  }

  // arching shade — the plate is carved, light pools at the long arch
  const vig = el('radialGradient', { id: 'spruceVig', cx: '0.5', cy: '0.42', r: '0.78' });
  const v0 = el('stop', { offset: '0.5' }); v0.setAttribute('stop-color', '#5A3C14'); v0.setAttribute('stop-opacity', '0');
  const v1 = el('stop', { offset: '1' }); v1.setAttribute('stop-color', '#4A3010'); v1.setAttribute('stop-opacity', '0.30');
  vig.appendChild(v0); vig.appendChild(v1);
  defs.appendChild(vig);
  svg.appendChild(el('rect', { width: VW, height: VH, fill: 'url(#spruceVig)' }));

  container.appendChild(svg);
}

export function buildMaple(container) {
  const rnd = mulberry(20040612); // the Udine lot, 2004
  const svg = el('svg', { viewBox: `0 0 ${VW} ${VH}`, preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' });

  const defs = el('defs', {});
  const grad = el('linearGradient', { id: 'mapleBg', x1: '0', y1: '0', x2: '0.2', y2: '1' });
  grad.appendChild(el('stop', { offset: '0', 'stop-color': '#C99A47' }));
  grad.appendChild(el('stop', { offset: '0.55', 'stop-color': '#B8862F' }));
  grad.appendChild(el('stop', { offset: '1', 'stop-color': '#A5762B' }));
  defs.appendChild(grad);
  svg.appendChild(defs);
  svg.appendChild(el('rect', { width: VW, height: VH, fill: 'url(#mapleBg)' }));

  const cx = VW / 2;

  // fine vertical grain, straight and quiet under the flame
  for (let x = 4; x < VW; x += 5 + rnd() * 4) {
    svg.appendChild(el('line', {
      x1: x + (rnd() - 0.5) * 2, y1: 0, x2: x + (rnd() - 0.5) * 2, y2: VH,
      stroke: 'rgba(96,62,18,0.14)', 'stroke-width': 0.6,
    }));
  }

  // the flame: fine shimmer bands running across the grain, mirrored in a
  // shallow chevron at the joint — light moves through it like weather
  let y = 4;
  while (y < VH + 40) {
    const amp = 1.6 + rnd() * 1.7;
    const wob = 0.4 + rnd() * 0.3;
    const phase = rnd() * Math.PI * 2;
    const tilt = 0.05 + rnd() * 0.05; // shallow chevron rise toward the flanks
    for (const pass of [
      { dy: -1.0, stroke: 'rgba(255,236,190,0.36)', w: 2.6 },
      { dy: 1.5, stroke: 'rgba(82,50,12,0.30)', w: 3.0 },
    ]) {
      let path = '';
      for (const side of [-1, 1]) {
        const pts = [];
        for (let i = 0; i <= 16; i++) {
          const x = cx + side * (i / 16) * cx;
          const yy = y + pass.dy - (i / 16) * cx * tilt
            + amp * Math.sin(i * wob * 3 + phase);
          pts.push(`${x.toFixed(1)} ${yy.toFixed(1)}`);
        }
        path += `M ${pts.join(' L ')} `;
      }
      svg.appendChild(el('path', {
        d: path, fill: 'none', stroke: pass.stroke,
        'stroke-width': pass.w, 'stroke-linecap': 'round',
      }));
    }
    y += 8.5 + rnd() * 5;
  }

  // the chalked back — no f-holes on the singing wood
  chalkOutline(svg, 'rgba(66,38,6,0.45)', 2.2);

  // centre joint of the bookmatched back
  svg.appendChild(el('line', {
    x1: cx, y1: 0, x2: cx, y2: VH,
    stroke: 'rgba(70,42,8,0.5)', 'stroke-width': 1.4,
  }));

  // arching shade
  const vig = el('radialGradient', { id: 'mapleVig', cx: '0.5', cy: '0.45', r: '0.8' });
  const v0 = el('stop', { offset: '0.48' }); v0.setAttribute('stop-color', '#3E2406'); v0.setAttribute('stop-opacity', '0');
  const v1 = el('stop', { offset: '1' }); v1.setAttribute('stop-color', '#331C04'); v1.setAttribute('stop-opacity', '0.36');
  vig.appendChild(v0); vig.appendChild(v1);
  defs.appendChild(vig);
  svg.appendChild(el('rect', { width: VW, height: VH, fill: 'url(#mapleVig)' }));

  container.appendChild(svg);
}
