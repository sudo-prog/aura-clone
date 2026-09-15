/* KESSLER WATCH — orchestration */

import { createSky } from './scene.js';
import { initHUD } from './hud.js';
import { initCensus } from './census.js';
import { LEDGER, STATIONS } from './data.js';

/* ---------- ledger table ---------- */
function initLedger() {
  const tbody = document.querySelector('#ledger-body');
  if (!tbody) return;
  tbody.innerHTML = LEDGER.map((d) => `
    <tr>
      <td class="lg-no">${d.no}</td>
      <td class="lg-obj">${d.object}</td>
      <td>${d.date}</td>
      <td class="lg-cause">${d.cause}</td>
      <td class="num">${d.fragments.toLocaleString('en-US')}</td>
      <td class="num">${d.alt}</td>
      <td class="num">${d.onOrbit}%</td>
    </tr>`).join('');

  /* scroll affordance: edge fade + hint while columns remain off-screen */
  const shell = document.querySelector('.table-shell');
  const scroller = document.querySelector('.table-scroll');
  if (!shell || !scroller) return;
  const update = () => {
    const more = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 6;
    shell.classList.toggle('has-more', more);
  };
  scroller.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ---------- footer stations ---------- */
function initStations() {
  const host = document.querySelector('#station-grid');
  if (!host) return;
  host.innerHTML = STATIONS.map((s) => `
    <div class="station">
      <span class="st-dot" aria-hidden="true"></span>
      <div>
        <div class="st-name">${s.name}</div>
        <div class="st-meta">${s.loc} · ${s.kind}</div>
      </div>
    </div>`).join('');
}

/* ---------- scroll reveals ---------- */
function initReveals() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const els = document.querySelectorAll('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    }
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  els.forEach((el) => io.observe(el));
}

/* ---------- boot everything ---------- */
initLedger();
initStations();
initReveals();
initCensus();

const canvas = document.querySelector('#sky-canvas');
let hud = null;

const callbacks = {
  onTick: (t, r) => hud && hud.onTick(t, r),
  onHover: (o, x, y) => hud && hud.onHover(o, x, y),
  onHoverMove: (x, y) => hud && hud.onHoverMove(x, y),
  onConjunction: (ev) => hud && hud.onConjunction(ev),
};

let sky = null;
try {
  sky = createSky(canvas, callbacks);
} catch (e) {
  sky = null;
}

if (sky) {
  hud = initHUD(sky);
} else {
  document.querySelector('#sky').classList.add('no-webgl');
  document.body.classList.add('is-booted');
  document.querySelectorAll('.hud-top,.hud-rail,.hero-title-block,.hud-console')
    .forEach((el) => el.classList.add('is-armed'));
  const bl = document.querySelector('#boot-line');
  if (bl) bl.textContent = 'RENDERER OFFLINE · STATIC PLOT SHOWN';
  /* keep the real UTC clock alive even without WebGL */
  const utc = document.querySelector('#utc-clock');
  const tick = () => {
    const d = new Date();
    utc.textContent = [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
      .map((v) => String(v).padStart(2, '0')).join(':') + ' UTC';
  };
  tick();
  setInterval(tick, 1000);
}
