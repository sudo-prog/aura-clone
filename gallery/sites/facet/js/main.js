// FACET — page orchestration
import { createGemStage } from './gem.js';
import { getCut, facetMapSVG, CUT_KEYS } from './cuts.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ------------------------------------------------------------------ *
 * Facet maps — injected wherever the page needs technical linework
 * ------------------------------------------------------------------ */
for (const el of $$('[data-map]')) {
  el.innerHTML = facetMapSVG(el.dataset.map);
}
// reduced motion: the stone holds still — the spec line must not claim otherwise
if (REDUCED) {
  const meta = $('.hero-meta');
  if (meta) meta.textContent = 'crown 34.50° · pavilion 40.75° · 57 facets · held still';
}
for (const key of CUT_KEYS) {
  const el = $(`[data-facets="${key}"]`);
  if (el) el.textContent = `${getCut(key).specs.facets} facets`;
}

/* ------------------------------------------------------------------ *
 * Gem stages
 * ------------------------------------------------------------------ */
function mountStage(canvasId, opts) {
  const canvas = document.getElementById(canvasId);
  const holder = canvas.closest('.gem-stage');
  let stage = null;
  try { stage = createGemStage(canvas, opts); } catch (e) { stage = null; }
  if (!stage) {
    canvas.hidden = true;
    const fb = $('.gl-fallback', holder);
    fb.hidden = false;
    fb.innerHTML = facetMapSVG(opts.cut || 'brilliant', 'fallback');
  }
  return stage;
}

const heroStage = mountStage('heroGem', {
  cut: 'brilliant',
  body: [0.99, 0.975, 0.955],
  ior: 2.15, disp: 0.13,
  spin: 0.13, tilt: 0.30, yaw0: 0.55, scale: 0.94, parallax: true,
  pool: true, fitAspect: true,
});

const cutStage = mountStage('cutGem', {
  cut: 'brilliant',
  body: [0.87, 0.93, 1.0],           // the Ceylon rough
  ior: 2.08, disp: 0.11,
  spin: 0.16, tilt: 0.38, yaw0: 2.2, scale: 0.92,
});

/* ------------------------------------------------------------------ *
 * Cut explorer — buttons, rolling readout
 * ------------------------------------------------------------------ */
const RO_FIELDS = [
  ['roFacets', s => String(s.facets), 0],
  ['roTable', s => s.table, 1],
  ['roCrown', s => s.crown, 2],
  ['roPavilion', s => s.pavilion, 2],
  ['roDepth', s => s.depth, 1],
  ['roRatio', s => s.ratio, 2],
  ['roYield', s => s.yield, 0],
];
const tweens = new Map();

function rollTo(el, target, decimals) {
  if (tweens.has(el)) cancelAnimationFrame(tweens.get(el));
  const m = target.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!m || REDUCED) { el.textContent = target; return; }
  const to = parseFloat(m[1]), suffix = m[2];
  const fromM = (el.textContent || '').match(/^(\d+(?:\.\d+)?)/);
  const from = fromM ? parseFloat(fromM[1]) : 0;
  const t0 = performance.now(), dur = 640;
  const step = now => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 4);
    const v = from + (to - from) * e;
    el.textContent = v.toFixed(decimals) + suffix;
    if (k < 1) tweens.set(el, requestAnimationFrame(step));
    else { el.textContent = target; tweens.delete(el); }
  };
  tweens.set(el, requestAnimationFrame(step));
}

const note = $('#cutNote');
function showCut(key) {
  const specs = getCut(key).specs;
  for (const [id, pick, dec] of RO_FIELDS) rollTo($('#' + id), pick(specs), dec);
  note.classList.add('swap');
  setTimeout(() => { note.textContent = specs.note; note.classList.remove('swap'); }, REDUCED ? 0 : 190);
}

for (const btn of $$('.cut-btn')) {
  btn.addEventListener('click', () => {
    const key = btn.dataset.cut;
    if (cutStage && cutStage.cut === key) return;
    for (const b of $$('.cut-btn')) {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
    }
    if (cutStage) cutStage.setCut(key);
    showCut(key);
  });
}

/* ------------------------------------------------------------------ *
 * Anatomy cross-section — drawn from the same proportions as the mesh
 * ------------------------------------------------------------------ */
(function anatomy() {
  const svg = $('#anatomySVG');
  if (!svg) return;
  const rt = 0.56, g = 0.03;
  const ch = Math.tan(34.5 * Math.PI / 180) * (1 - rt);
  const pd = Math.tan(40.75 * Math.PI / 180);
  const S = 186, CX = 280, CY = 208;
  const X = x => (CX + x * S).toFixed(1);
  const Y = y => (CY - y * S).toFixed(1);
  const yT = g + ch, yC = -g - pd;

  const P = [];
  // silhouette
  P.push(`<path class="draw sil" d="M ${X(-rt)} ${Y(yT)} L ${X(rt)} ${Y(yT)} L ${X(1)} ${Y(g)} L ${X(1)} ${Y(-g)} L ${X(0)} ${Y(yC)} L ${X(-1)} ${Y(-g)} L ${X(-1)} ${Y(g)} Z" pathLength="1"/>`);
  // girdle plane, extended
  P.push(`<line class="draw dash" x1="${CX - S - 34}" y1="${Y(0)}" x2="${CX + S + 34}" y2="${Y(0)}" pathLength="1"/>`);
  // center axis
  P.push(`<line class="draw dash" x1="${CX}" y1="${Y(yT) - 18}" x2="${CX}" y2="${Y(yC) - 0 + 18}" pathLength="1"/>`);
  // crown break lines (bezel mid) — faint interior facets, ending on the slopes
  const xCrownAt = y => 1 - (y - g) / (yT - g) * (1 - rt);
  const xPavAt = y => (y - yC) / (-g - yC);
  P.push(`<line class="draw faint" x1="${X(-xCrownAt(0.21))}" y1="${Y(0.21)}" x2="${X(xCrownAt(0.21))}" y2="${Y(0.21)}" pathLength="1"/>`);
  P.push(`<line class="draw faint" x1="${X(-xPavAt(-0.47))}" y1="${Y(-0.47)}" x2="${X(xPavAt(-0.47))}" y2="${Y(-0.47)}" pathLength="1"/>`);

  // angle arcs
  const arc = (cx, cy, r, a0, a1, cls) => {
    const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
    const p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
    const sweep = a1 > a0 ? 1 : 0;
    return `<path class="${cls}" d="M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A ${r} ${r} 0 ${large} ${sweep} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}" pathLength="1"/>`;
  };
  const gx = CX - S, gyT = CY - g * S, gyB = CY + g * S;
  P.push(arc(gx, gyT, 52, 0, -34.5 * Math.PI / 180, 'draw arc'));
  P.push(arc(gx, gyB, 52, 0, 40.75 * Math.PI / 180, 'draw arc'));
  P.push(`<text class="ang" x="${gx + 64}" y="${gyT - 14}">34.50°</text>`);
  P.push(`<text class="ang" x="${gx + 64}" y="${gyB + 34}">40.75°</text>`);

  // labels + leaders
  const label = (tx, ty, dx, dy, text, anchor = 'middle') => {
    P.push(`<line class="leader" x1="${tx}" y1="${ty}" x2="${dx}" y2="${dy}" pathLength="1"/>`);
    P.push(`<circle class="ldot" cx="${dx}" cy="${dy}" r="2.6"/>`);
    P.push(`<text class="lbl" text-anchor="${anchor}" x="${tx}" y="${ty - 7}">${text}</text>`);
  };
  const Xn = x => CX + x * S, Yn = y => CY - y * S;
  label(CX, Yn(yT) - 46, CX, Yn(yT), 'TABLE');
  label(Xn(-0.78) - 40, Yn(yT * 0.86) - 30, Xn(-(rt + 1) / 2), (Yn(yT) + Yn(g)) / 2, 'CROWN');
  label(Xn(1) + 42, Yn(0) - 26, Xn(1) + 4, Yn(0), 'GIRDLE');
  label(Xn(-0.86) - 14, Yn(-0.58), Xn(-0.5), (Yn(-g) + Yn(yC)) / 2, 'PAVILION');
  label(CX, Yn(yC) + 44, CX, Yn(yC) + 3, 'CULET');

  svg.innerHTML = `<g>${P.join('')}</g>`;
})();

/* ------------------------------------------------------------------ *
 * Reveals
 * ------------------------------------------------------------------ */
const io = new IntersectionObserver(entries => {
  for (const en of entries) {
    if (en.isIntersecting) {
      en.target.classList.add('in');
      io.unobserve(en.target);
    }
  }
}, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
for (const el of $$('.reveal')) io.observe(el);

const anatFig = $('.col-figure');
if (anatFig) {
  const io2 = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      $('#anatomySVG').classList.add('drawn');
      io2.disconnect();
    }
  }, { threshold: 0.35 });
  io2.observe(anatFig);
}

/* ------------------------------------------------------------------ *
 * Scrollspy — the gold hairline rests under the section you are in
 * ------------------------------------------------------------------ */
(function scrollspy() {
  const links = new Map(
    $$('.site-nav nav a').map(a => [a.getAttribute('href').slice(1), a])
  );
  const spy = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      for (const [id, a] of links) a.classList.toggle('active', id === en.target.id);
    }
  }, { rootMargin: '-46% 0px -46% 0px', threshold: 0 });
  for (const sec of $$('main section')) spy.observe(sec);
})();

/* ------------------------------------------------------------------ *
 * Hero exit — scrolling away lowers the stone and dims the lamp
 * ------------------------------------------------------------------ */
if (!REDUCED) {
  const hero = $('.hero'), stage = $('.hero-stage'), lamp = $('.lamp-pool');
  const dim = () => {
    const k = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight * 0.85)));
    const e = k * k;
    stage.style.opacity = (1 - 0.88 * e).toFixed(3);
    stage.style.transform = `translateY(${(e * 46).toFixed(1)}px) scale(${(1 - e * 0.04).toFixed(4)})`;
    lamp.style.opacity = (1 - 0.9 * e).toFixed(3);
  };
  let queued = false;
  addEventListener('scroll', () => {
    if (queued || !document.body.classList.contains('settled')) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; dim(); });
  }, { passive: true });
  setTimeout(() => { document.body.classList.add('settled'); dim(); }, 3400);
}

/* ------------------------------------------------------------------ *
 * Load choreography
 * ------------------------------------------------------------------ */
Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]).then(() => {
  requestAnimationFrame(() => {
    document.body.classList.remove('loading');
    if (heroStage && !REDUCED) setTimeout(() => heroStage.flash(), 950);
  });
});
