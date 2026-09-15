/* ATELIER VITRAIL — shared glass helpers: PRNG, color, SVG, palettes */
'use strict';

window.VITRAIL = (() => {
  const NS = 'http://www.w3.org/2000/svg';

  /* deterministic PRNG */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* svg element factory */
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* color: hex <-> hsl lightness shift */
  function hexToRgb(h) {
    const v = parseInt(h.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  function rgbToHex(r, g, b) {
    const c = x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hslToRgb(h, s, l) {
    if (s === 0) { const v = l * 255; return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = t => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  /* shift lightness by dl (-1..1), optional saturation ds */
  function shade(hex, dl, ds = 0) {
    const [r, g, b] = hexToRgb(hex);
    let [h, s, l] = rgbToHsl(r, g, b);
    l = Math.max(0, Math.min(1, l + dl));
    s = Math.max(0, Math.min(1, s + ds));
    const [r2, g2, b2] = hslToRgb(h, s, l);
    return rgbToHex(r2, g2, b2);
  }

  /* weighted pick: weights = [[value, weight], ...] */
  function pick(rng, weights) {
    let total = 0;
    for (const [, w] of weights) total += w;
    let x = rng() * total;
    for (const [v, w] of weights) { x -= w; if (x <= 0) return v; }
    return weights[weights.length - 1][0];
  }
  function pickNot(rng, weights, avoid) {
    for (let i = 0; i < 8; i++) {
      const v = pick(rng, weights);
      if (v !== avoid) return v;
    }
    return pick(rng, weights);
  }

  /* the foundry's glass */
  const GLASS = {
    chartres: '#2148c0', ruby: '#b01b31', or: '#e5b93c',
    emerald: '#1f7a4a', violet: '#5d3080', blanc: '#e9e5d3',
    nuit: '#16255f', grenat: '#6e1020', rose: '#c4788e',
    bouteille: '#4e6e26', ambre: '#b26b1d', fumee: '#9aa0a2',
  };

  const PALETTES = {
    chartres: {
      label: 'Chartres',
      ground: '#1a2c6e',
      weights: [
        [GLASS.chartres, 40], [GLASS.ruby, 20], [GLASS.blanc, 13],
        [GLASS.or, 13], [GLASS.emerald, 9], [GLASS.violet, 5],
      ],
      beam: [GLASS.chartres, GLASS.ruby, GLASS.or],
    },
    chapelle: {
      label: 'Sainte-Chapelle',
      ground: '#5c0e1c',
      weights: [
        [GLASS.ruby, 36], [GLASS.chartres, 22], [GLASS.or, 16],
        [GLASS.violet, 12], [GLASS.blanc, 9], [GLASS.grenat, 5],
      ],
      beam: [GLASS.ruby, GLASS.violet, GLASS.chartres],
    },
    bourges: {
      label: 'Bourges',
      ground: '#123f2a',
      weights: [
        [GLASS.emerald, 32], [GLASS.or, 22], [GLASS.chartres, 18],
        [GLASS.blanc, 12], [GLASS.ruby, 10], [GLASS.ambre, 6],
      ],
      beam: [GLASS.emerald, GLASS.or, GLASS.chartres],
    },
    grisaille: {
      label: 'Grisaille',
      ground: '#767d76',
      weights: [
        [GLASS.blanc, 46], [GLASS.fumee, 22], [GLASS.or, 14],
        [GLASS.chartres, 9], [GLASS.ruby, 5], [GLASS.emerald, 4],
      ],
      beam: [GLASS.blanc, GLASS.or, GLASS.fumee],
    },
  };

  /* geometry helpers — angles in degrees, 0 = east, -90 = up */
  const rad = d => d * Math.PI / 180;
  const px = (r, a) => r * Math.cos(rad(a));
  const py = (r, a) => r * Math.sin(rad(a));
  const pt = (r, a) => px(r, a).toFixed(2) + ',' + py(r, a).toFixed(2);

  /* annular sector path r1..r2 spanning a1..a2 */
  function annSector(r1, r2, a1, a2) {
    const large = (a2 - a1) > 180 ? 1 : 0;
    return `M${pt(r1, a1)} L${pt(r2, a1)} ` +
      `A${r2},${r2} 0 ${large} 1 ${pt(r2, a2)} ` +
      `L${pt(r1, a2)} A${r1},${r1} 0 ${large} 0 ${pt(r1, a1)} Z`;
  }

  /* quadratic bezier utilities: p = [x,y] */
  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function qSplit(p0, c, p2, t) {
    const a = lerp2(p0, c, t), b = lerp2(c, p2, t), m = lerp2(a, b, t);
    return { lower: [p0, a, m], upper: [m, b, p2], m };
  }
  const XY = p => p[0].toFixed(2) + ',' + p[1].toFixed(2);

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    NS, mulberry32, el, shade, pick, pickNot,
    GLASS, PALETTES, rad, px, py, pt, annSector,
    lerp2, qSplit, XY, reduceMotion,
  };
})();
