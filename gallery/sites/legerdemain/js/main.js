/* LEGERDEMAIN — orchestration: load sequence, hero fan, flourish stage,
   oracle wiring, faculty court cards, scroll reveals */
import { Deck, EASE, wait, REDUCED, stackPose, fanPose, ribbonPose } from './deck.js';
import { frontSVG, backSVG } from './cards.js';
import { Oracle } from './oracle.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
document.documentElement.classList.add('js');

/* ————— hero deck ————— */
const heroSpecs = [
  { rank: '7', suit: 'c' }, { rank: '8', suit: 'h' }, { rank: '9', suit: 's' },
  { rank: '10', suit: 'd' }, { rank: 'J', suit: 'c' }, { rank: 'Q', suit: 'd' },
  { rank: 'K', suit: 'h' }, { rank: 'A', suit: 's' }, { rank: 'K', suit: 's' },
  { rank: 'Q', suit: 'h' }, { rank: 'J', suit: 'd' }, { rank: '10', suit: 's' },
  { rank: '9', suit: 'h' }, { rank: '8', suit: 'c' }, { rank: '7', suit: 'd' },
];
const heroStage = $('#heroStage');
const heroDeck = new Deck(heroStage, heroSpecs);

function heroFanOpts() {
  const w = heroStage.parentElement.clientWidth;
  const cw = Math.max(64, Math.min(120, w * 0.093));
  heroStage.style.setProperty('--cw', cw + 'px');
  /* narrow screens: tighter arc so the end cards never leave the felt */
  if (w < 560) return { spread: 88, radius: Math.min(215, w * 0.5), lift: 6 };
  return { spread: 120, radius: Math.max(225, Math.min(330, w * 0.27)), lift: 6 };
}

let heroIdleTimer = null, heroVisible = false, heroBusy = false;

async function heroDeal() {
  const o = heroFanOpts();
  heroDeck.formation((i, n) => stackPose(i, n, { y: 40 }), { dur: 10 });
  await wait(160);
  await heroDeck.formation((i, n) => fanPose(i, n, o), {
    dur: 760, stagger: 30, ease: EASE.deal,
  });
}

async function heroPirouette() {
  if (heroBusy || document.hidden || !heroVisible || REDUCED.matches) return;
  heroBusy = true;
  const o = heroFanOpts();
  const i = 5 + Math.floor(Math.random() * (heroDeck.cards.length - 10));
  const c = heroDeck.cards[i];
  const base = fanPose(i, heroDeck.cards.length, o);
  heroDeck.set(c, { ...base, y: base.y - 95, z: 150, ry: 360, rz: base.rz * 0.4 },
    { dur: 820, ease: EASE.lift });
  await wait(850);
  heroDeck.set(c, { ...base, ry: 720 }, { dur: 760, ease: EASE.tossOut });
  await wait(800);
  c.el.style.transitionDuration = '0ms';
  c.el.style.transform = c.el.style.transform.replace('rotateY(720deg)', 'rotateY(0deg)');
  heroBusy = false;
}

function heroIdleLoop() {
  clearInterval(heroIdleTimer);
  heroIdleTimer = setInterval(heroPirouette, 8000);
}

/* a fingered card lifts toward the hand */
if (!REDUCED.matches) {
  heroDeck.cards.forEach((c, i) => {
    c.el.addEventListener('mouseenter', () => {
      if (heroBusy) return;
      const o = heroFanOpts();
      const b = fanPose(i, heroDeck.cards.length, o);
      heroDeck.set(c, { ...b, y: b.y - 26, z: b.z + 34 }, { dur: 240, ease: EASE.lift });
    });
    c.el.addEventListener('mouseleave', () => {
      if (heroBusy) return;
      heroDeck.set(c, fanPose(i, heroDeck.cards.length, heroFanOpts()), { dur: 340, ease: EASE.soft });
    });
  });
}

new IntersectionObserver((es) => { heroVisible = es[0].isIntersecting; },
  { threshold: 0.25 }).observe(heroStage.parentElement);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearInterval(heroIdleTimer); else heroIdleLoop();
});

/* ————— flourish stage ————— */
const flSpecs = [];
{
  const blacks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3'];
  const reds = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3'];
  for (let i = 0; i < 12; i++) {
    flSpecs.push({ rank: blacks[i], suit: i % 2 ? 'c' : 's' });
    flSpecs.push({ rank: reds[i], suit: i % 2 ? 'd' : 'h' });
  }
}
const flStage = $('#flourishStage');
const flDeck = new Deck(flStage, flSpecs);
let flBusy = false, flCurrent = 'stack';

function flMetrics() {
  const w = flStage.parentElement.clientWidth;
  const cw = Math.max(52, Math.min(92, w * 0.078));
  flStage.style.setProperty('--cw', cw + 'px');
  return { w, cw };
}

const routines = {
  async fan() {
    const { w } = flMetrics();
    await flDeck.formation((i, n) => stackPose(i, n, { y: 30 }), { dur: 420, stagger: 6 });
    await wait(120);
    await flDeck.formation((i, n) =>
      fanPose(i, n, { spread: w < 560 ? 118 : 136, radius: Math.min(330, w * 0.28), lift: 44 }),
      { dur: 720, stagger: 24, ease: EASE.deal });
  },
  async ribbon() {
    const { w } = flMetrics();
    const rw = Math.min(w * 0.84, 760);
    await flDeck.formation((i, n) => stackPose(i, n, { y: 30 }), { dur: 420, stagger: 6 });
    await wait(100);
    /* spread face-down */
    await flDeck.formation((i, n) => ribbonPose(i, n, { width: rw, y: 26, faceUp: false }),
      { dur: 560, stagger: 14, ease: EASE.deal });
    await wait(160);
    /* the turnover wave */
    flDeck.cards.forEach((c, i) => {
      flDeck.set(c, { ...ribbonPose(i, flDeck.cards.length, { width: rw, y: 26 }), faceUp: true },
        { dur: 430, delay: i * 34, ease: EASE.soft });
    });
    await wait(430 + 34 * flDeck.cards.length);
  },
  async cascade() {
    const { w } = flMetrics();
    const dx = Math.min(w * 0.33, 310);
    const n = flDeck.cards.length;
    await flDeck.formation((i, nn) => ({ ...stackPose(i, nn), x: -dx + jitterless(i), y: 34 }),
      { dur: 480, stagger: 5, ease: EASE.soft });
    await wait(140);
    /* end-over-end: each card arcs to the right stack, tumbling */
    flDeck.cards.forEach((c, i) => {
      const k = n - 1 - i; /* top of stack leaves first */
      const d = k * 56;
      flDeck.set(c, { x: 0, y: -142, z: 90 + k, rx: 330, rz: 3 }, { dur: 440, delay: d, ease: EASE.tossIn });
      setTimeout(() => {
        flDeck.set(c, { x: dx, y: 34, z: (n - i) * 0.55, rx: 720, rz: jitterless(i) },
          { dur: 470, ease: EASE.tossOut });
      }, REDUCED.matches ? 10 : d + 430);
    });
    await wait(REDUCED.matches ? 80 : 56 * n + 980);
    /* settle: normalise rx invisibly, then square the stack */
    flDeck.cards.forEach((c) => {
      c.el.style.transitionDuration = '0ms';
      c.el.style.transform = c.el.style.transform.replace('rotateX(720deg)', 'rotateX(0deg)');
    });
    await flDeck.formation((i, nn) => ({ ...stackPose(i, nn), x: dx + jitterless(i) * 0.6, y: 34 }),
      { dur: 320, stagger: 4, ease: EASE.soft });
  },
  async pirouette() {
    await flDeck.formation((i, n) => stackPose(i, n, { y: 30 }), { dur: 460, stagger: 5 });
    await wait(160);
    const c = flDeck.cards[flDeck.cards.length - 1];
    flDeck.set(c, { x: 0, y: -150, z: 190, ry: 540, rz: 6, s: 1.18, faceUp: true },
      { dur: 1050, ease: EASE.lift, flipDur: 700 });
    await wait(1300);
    flDeck.set(c, { x: 0, y: -150, z: 190, ry: 900, rz: -4, s: 1.18 }, { dur: 900, ease: EASE.soft });
    await wait(950);
    flDeck.set(c, { ...stackPose(flDeck.cards.length - 1, flDeck.cards.length, { y: 30 }), ry: 1080, faceUp: false },
      { dur: 700, ease: EASE.tossOut, flipDur: 500 });
    await wait(760);
    c.el.style.transitionDuration = '0ms';
    c.el.style.transform = c.el.style.transform.replace('rotateY(1080deg)', 'rotateY(0deg)');
  },
};
const jitterless = (i) => Math.sin(i * 127.31) * 1.6;

const flButtons = $$('.flourish-bar button');
flButtons.forEach((b) => {
  b.addEventListener('click', async () => {
    if (flBusy) return;
    flBusy = true;
    flButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    flCurrent = b.dataset.routine;
    await routines[flCurrent]();
    flBusy = false;
  });
});

/* initial pose + auto-ribbon on first view */
flDeck.formation((i, n) => stackPose(i, n, { y: 30 }), { dur: 10 });
let flPlayed = false;
new IntersectionObserver(async (es) => {
  if (es[0].isIntersecting && !flPlayed && !flBusy) {
    flPlayed = true;
    flBusy = true;
    flCurrent = 'ribbon';
    flButtons.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.routine === 'ribbon')));
    await wait(350);
    await routines.ribbon();
    flBusy = false;
  }
}, { threshold: 0.5 }).observe(flStage.parentElement);

/* ————— oracle ————— */
const oracle = new Oracle($('#orakel'));
let oracleStarted = false;
new IntersectionObserver((es) => {
  if (es[0].isIntersecting && !oracleStarted) {
    oracleStarted = true;
    oracle.start(false);
  }
}, { threshold: 0.12, rootMargin: '0px 0px 120px 0px' }).observe($('#oracleStage').parentElement);
window.__oracle = oracle; /* exercised by .iterations/verify-oracle.mjs */

/* explanation panel */
const explainBtn = $('#oracleExplain');
const explain = $('#explain');
explainBtn.addEventListener('click', () => {
  const open = explain.classList.toggle('open');
  explain.hidden = false;
  explainBtn.setAttribute('aria-expanded', String(open));
  if (open) explain.scrollIntoView({ behavior: REDUCED.matches ? 'auto' : 'smooth', block: 'nearest' });
});

/* ————— faculty court cards + semester II backs ————— */
$$('.fac').forEach((fc) => {
  const spec = { rank: fc.dataset.rank, suit: fc.dataset.suit };
  fc.querySelector('.fac-front').innerHTML = frontSVG(spec);
  const toggle = () => {
    const on = fc.classList.toggle('flipped');
    fc.setAttribute('aria-expanded', String(on));
  };
  fc.addEventListener('click', toggle);
  fc.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
});
$$('.sem2-back').forEach((el) => { el.innerHTML = backSVG(); });

/* ————— course plates tilt toward the fingertips (DESIGN: ≤4°) ————— */
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !REDUCED.matches) {
  $$('.course').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--tiltY', (px * 7).toFixed(2) + 'deg');
      card.style.setProperty('--tiltX', (py * -7).toFixed(2) + 'deg');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tiltY', '0deg');
      card.style.setProperty('--tiltX', '0deg');
    });
  });
}

/* ————— scroll reveals ————— */
const rio = new IntersectionObserver((es) => {
  es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
}, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
$$('.rv').forEach((el) => rio.observe(el));

/* ————— resize: re-pose hero + flourish ————— */
let rzT;
addEventListener('resize', () => {
  clearTimeout(rzT);
  rzT = setTimeout(() => {
    if (!heroBusy) {
      const o = heroFanOpts();
      heroDeck.formation((i, n) => fanPose(i, n, o), { dur: 300 });
    }
    if (!flBusy) { /* re-dress whatever formation is on the table */
      const { w } = flMetrics();
      if (flCurrent === 'ribbon') {
        flDeck.formation((i, n) =>
          ribbonPose(i, n, { width: Math.min(w * 0.84, 760), y: 26 }), { dur: 250 });
      } else if (flCurrent === 'fan') {
        flDeck.formation((i, n) =>
          fanPose(i, n, { spread: w < 560 ? 118 : 136, radius: Math.min(330, w * 0.28), lift: 44 }),
          { dur: 250 });
      } else if (flCurrent === 'cascade') {
        /* the cascade parks its squared stack at +dx — recompute for the new width
           or the whole deck strands offscreen after a rotate/resize */
        const dx = Math.min(w * 0.33, 310);
        flDeck.formation((i, n) => ({ ...stackPose(i, n), x: dx + jitterless(i) * 0.6, y: 34 }),
          { dur: 250 });
      } else { /* stack, pirouette: a centred squared stack */
        flDeck.formation((i, n) => stackPose(i, n, { y: 30 }), { dur: 200 });
      }
    }
  }, 180);
});

/* ————— load sequence ————— */
(async () => {
  await new Promise((r) => {
    if (document.readyState === 'complete') r();
    else addEventListener('load', r, { once: true });
  });
  document.documentElement.classList.add('t1'); /* frame + eyebrow */
  await wait(340);
  document.documentElement.classList.add('t2'); /* wordmark letters */
  await wait(700);
  document.documentElement.classList.add('t3'); /* sub copy */
  await heroDeal();
  await wait(6000);
  heroPirouette();
  heroIdleLoop();
})();
