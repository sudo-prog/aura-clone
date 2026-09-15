/* main.js — wires the atelier together: hero loom, structure chips, cloth
   swatches, the draft editor, the punched-card compiler, reveals. */

import {
  PRESETS, cloneDraft, liftedShafts, THREAD_COLORS, COLOR_NAMES,
  SHAFTS, TREADLES, ENDS,
} from './weave.js';
import { HeroLoom, MiniWeave } from './loom.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');

/* ------------------------------------------------------------------ */
/* your draft — one stable object, mutated in place so the loom,      */
/* drawdown and card chain all read the same memory                   */
/* ------------------------------------------------------------------ */
const yourDraft = cloneDraft(PRESETS.gooseeye, 'your draft');
const editorColors = { warp: 'indigo', weft: 'madder' };

function adoptPreset(key) {
  const p = PRESETS[key];
  yourDraft.threading = p.threading.slice();
  yourDraft.treadling = p.treadling.slice();
  yourDraft.tieup = p.tieup.map((r) => r.slice());
}

/* ------------------------------------------------------------------ */
/* hero loom                                                          */
/* ------------------------------------------------------------------ */
const loom = new HeroLoom($('#loom'), {
  draft: PRESETS.twill,
  warpHex: THREAD_COLORS.indigo,
  weftHex: THREAD_COLORS.madder,
  onPick(info) {
    $('#pick-num').textContent = String(info.pick).padStart(4, '0');
    $('#pick-struct').textContent = info.name;
    $('#pick-ends').textContent = info.ends + ' ends';
    $('#pick-dir').textContent = info.dir > 0 ? 'shuttle →' : 'shuttle ←';
  },
});

const chips = $$('.chip[data-structure]');
function draftFor(key) { return key === 'yours' ? yourDraft : PRESETS[key]; }

function activateChip(key) {
  chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.structure === key)));
}

chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    activateChip(chip.dataset.structure);
    loom.setStructure(draftFor(chip.dataset.structure));
  });
});

loom.start();

/* ------------------------------------------------------------------ */
/* collection swatches — each card weaves its own cloth on scroll     */
/* ------------------------------------------------------------------ */
const swatches = $$('.swatch canvas').map((cv) => {
  const mw = new MiniWeave(cv, {
    draft: PRESETS[cv.dataset.draft],
    warpHex: THREAD_COLORS[cv.dataset.warp],
    weftHex: THREAD_COLORS[cv.dataset.weft],
    pitch: 8,
  });
  return { cv, mw, woven: false };
});

const swatchIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const s = swatches.find((x) => x.cv === e.target);
    if (s && !s.woven) { s.woven = true; s.mw.weaveIn(0.7); }
    swatchIO.unobserve(e.target);
  });
}, { threshold: 0.25 });
swatches.forEach((s) => swatchIO.observe(s.cv));

$$('.set-loom').forEach((btn) => {
  btn.addEventListener('click', () => {
    const { draft, warp, weft } = btn.dataset;
    activateChip(draft);
    loom.setStructure(PRESETS[draft]);
    loom.setColors(THREAD_COLORS[warp], THREAD_COLORS[weft], true); // re-warp
    $('#loom-panel').scrollIntoView({ behavior: REDUCED.matches ? 'auto' : 'smooth', block: 'center' });
  });
});

/* ------------------------------------------------------------------ */
/* draft editor — threading / tie-up / treadling, drawn as a printed  */
/* draft; the drawdown quadrant weaves your edit immediately          */
/* ------------------------------------------------------------------ */
const thGrid = $('#threading');
const tuGrid = $('#tieup');
const trGrid = $('#treadling');

const drawdown = new MiniWeave($('#drawdown'), {
  draft: yourDraft,
  warpHex: THREAD_COLORS[editorColors.warp],
  weftHex: THREAD_COLORS[editorColors.weft],
  ends: ENDS,
});

function cellBtn(cls, label, data) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cell ' + cls;
  b.setAttribute('aria-label', label);
  Object.assign(b.dataset, data);
  return b;
}

function buildThreading() {
  thGrid.innerHTML = '';
  thGrid.style.setProperty('--cols', ENDS);
  for (let r = 0; r < SHAFTS; r++) {
    const shaft = SHAFTS - 1 - r; // shaft 8 on top, weaver's convention
    for (let c = 0; c < ENDS; c++) {
      thGrid.append(cellBtn('th-c', `End ${c + 1} on shaft ${shaft + 1}`, { end: c, shaft }));
    }
  }
  paintThreading();
}
function paintThreading() {
  $$('.th-c', thGrid).forEach((b) => {
    b.setAttribute('aria-pressed', String(yourDraft.threading[+b.dataset.end] === +b.dataset.shaft));
  });
}

function buildTieup() {
  tuGrid.innerHTML = '';
  for (let r = 0; r < SHAFTS; r++) {
    const shaft = SHAFTS - 1 - r;
    for (let t = 0; t < TREADLES; t++) {
      tuGrid.append(cellBtn('tu-c', `Treadle ${t + 1} lifts shaft ${shaft + 1}`, { treadle: t, shaft }));
    }
  }
  paintTieup();
}
function paintTieup() {
  $$('.tu-c', tuGrid).forEach((b) => {
    b.setAttribute('aria-pressed', String(yourDraft.tieup[+b.dataset.treadle][+b.dataset.shaft]));
  });
}

function buildTreadling() {
  trGrid.innerHTML = '';
  const picks = yourDraft.treadling.length;
  trGrid.style.setProperty('--rows', picks);
  for (let p = 0; p < picks; p++) {
    for (let t = 0; t < TREADLES; t++) {
      trGrid.append(cellBtn('tr-c', `Pick ${p + 1} on treadle ${t + 1}`, { pick: p, treadle: t }));
    }
  }
  paintTreadling();
}
function paintTreadling() {
  $$('.tr-c', trGrid).forEach((b) => {
    b.setAttribute('aria-pressed', String(yourDraft.treadling[+b.dataset.pick] === +b.dataset.treadle));
  });
}

function draftChanged(structural) {
  if (structural) { drawdown.setDraft(yourDraft); }
  drawdown.weaveIn(0.32);
  renderCards();
  // the big loom picks it up live when it is weaving your draft
}

thGrid.addEventListener('click', (e) => {
  const b = e.target.closest('.th-c'); if (!b) return;
  yourDraft.threading[+b.dataset.end] = +b.dataset.shaft;
  paintThreading(); draftChanged(false);
});
tuGrid.addEventListener('click', (e) => {
  const b = e.target.closest('.tu-c'); if (!b) return;
  const t = +b.dataset.treadle, s = +b.dataset.shaft;
  yourDraft.tieup[t][s] = !yourDraft.tieup[t][s];
  paintTieup(); draftChanged(false);
});
trGrid.addEventListener('click', (e) => {
  const b = e.target.closest('.tr-c'); if (!b) return;
  yourDraft.treadling[+b.dataset.pick] = +b.dataset.treadle;
  paintTreadling(); draftChanged(false);
});

$$('.preset-load').forEach((btn) => {
  btn.addEventListener('click', () => {
    adoptPreset(btn.dataset.preset);
    buildThreading(); buildTieup(); buildTreadling();
    draftChanged(true);
    $$('.preset-load').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  });
});

/* warp / weft pegs */
$$('.peg').forEach((peg) => {
  peg.addEventListener('click', () => {
    const role = peg.dataset.role, color = peg.dataset.color;
    editorColors[role] = color;
    $$(`.peg[data-role="${role}"]`).forEach((p) => p.setAttribute('aria-pressed', String(p === peg)));
    drawdown.setColors(THREAD_COLORS[editorColors.warp], THREAD_COLORS[editorColors.weft]);
    drawdown.weaveIn(0.32);
    $('#yarn-note').textContent =
      `${COLOR_NAMES[editorColors.warp]} warp × ${COLOR_NAMES[editorColors.weft]} weft`;
  });
});

$('#hang-draft').addEventListener('click', () => {
  activateChip('yours');
  loom.setStructure(yourDraft);
  loom.setColors(THREAD_COLORS[editorColors.warp], THREAD_COLORS[editorColors.weft], true);
  $('#loom-panel').scrollIntoView({ behavior: REDUCED.matches ? 'auto' : 'smooth', block: 'center' });
});

buildThreading(); buildTieup(); buildTreadling();
drawdown.renderInstant();

/* the mobile bench hint retires itself the moment the visitor drags */
const benchScroll = $('.draft-scroll');
benchScroll.addEventListener('scroll', () => {
  $('.bench-hint').classList.add('gone');
}, { once: true, passive: true });

/* ------------------------------------------------------------------ */
/* 1801 — compile the visitor's draft to a punched-card chain          */
/* ------------------------------------------------------------------ */
function renderCards() {
  const host = $('#card-chain');
  const picks = yourDraft.treadling.length;
  const per = 8;
  const n = Math.ceil(picks / per);
  const CW = 252, CH = 148, GAP = 30, PAD = 16;
  const W = n * CW + (n - 1) * GAP + PAD * 2;
  const H = CH + PAD * 2 + 10;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Punched cards encoding the current draft: ${picks} picks across ${n} cards">`;

  // lacing cords behind the cards
  for (let c = 0; c < n - 1; c++) {
    const x1 = PAD + c * (CW + GAP) + CW - 14;
    const x2 = x1 + GAP + 28;
    for (const yy of [PAD + 14, PAD + CH - 10]) {
      s += `<path d="M ${x1} ${yy} C ${x1 + GAP / 2} ${yy + 5}, ${x2 - GAP / 2} ${yy - 5}, ${x2} ${yy}"
        fill="none" stroke="#8a7a5f" stroke-width="1.3" opacity="0.85"/>`;
    }
  }

  for (let c = 0; c < n; c++) {
    const x = PAD + c * (CW + GAP);
    const rot = (c % 2 ? 1.4 : -1.2);
    s += `<g transform="rotate(${rot} ${x + CW / 2} ${PAD + CH / 2})">`;
    // card body with cut corner
    s += `<path d="M ${x + 16} ${PAD} H ${x + CW - 6} Q ${x + CW} ${PAD} ${x + CW} ${PAD + 6}
      V ${PAD + CH - 6} Q ${x + CW} ${PAD + CH} ${x + CW - 6} ${PAD + CH}
      H ${x + 6} Q ${x} ${PAD + CH} ${x} ${PAD + CH - 6} V ${PAD + 16} Z"
      fill="#efe7d0" stroke="#b3a37e" stroke-width="1"/>`;
    // lacing holes
    for (let k = 0; k < 4; k++) {
      const hx = x + 30 + k * ((CW - 60) / 3);
      s += `<circle cx="${hx}" cy="${PAD + 14}" r="2.6" fill="#101d38"/>`;
      s += `<circle cx="${hx}" cy="${PAD + CH - 10}" r="2.6" fill="#101d38"/>`;
    }
    // shaft labels
    for (let r = 0; r < 8; r++) {
      const hy = PAD + 36 + r * ((CH - 62) / 7);
      s += `<text x="${x + 13}" y="${hy + 2.5}" font-family="IBM Plex Mono, monospace"
        font-size="7" fill="#8a7a5f" text-anchor="middle">${r + 1}</text>`;
    }
    // holes: column per pick, row per shaft (shaft 1 at top)
    for (let col = 0; col < per; col++) {
      const p = c * per + col;
      if (p >= picks) break;
      const lifted = liftedShafts(yourDraft, p);
      const hx = x + 38 + col * ((CW - 62) / 7);
      for (let r = 0; r < 8; r++) {
        const hy = PAD + 36 + r * ((CH - 62) / 7);
        if (lifted[r]) {
          s += `<circle cx="${hx}" cy="${hy}" r="4.4" fill="#101d38"/>`;
          s += `<circle cx="${hx - 1.1}" cy="${hy - 1.1}" r="4.4" fill="none" stroke="rgba(246,240,225,0.35)" stroke-width="0.8"/>`;
        } else {
          s += `<circle cx="${hx}" cy="${hy}" r="1.4" fill="rgba(24,32,58,0.22)"/>`;
        }
      }
    }
    const lastPick = Math.min((c + 1) * per, picks);
    s += `<text x="${x + CW - 10}" y="${PAD + 9.5}" font-family="IBM Plex Mono, monospace" font-size="7.5"
      letter-spacing="0.12em" fill="#6c5e46" text-anchor="end">J&amp;D CHAIN Nº3 · CARD ${c + 1}/${n} · PICKS ${String(c * per + 1).padStart(2, '0')}–${String(lastPick).padStart(2, '0')}</text>`;
    s += `</g>`;
  }
  s += `</svg>`;
  host.innerHTML = s;
  $('#card-fact').textContent =
    `${picks} picks · ${n} cards · 8 hooks per column — your treadling, compiled.`;
}
renderCards();

/* ------------------------------------------------------------------ */
/* woven canvases follow the window — no stretched thread, ever       */
/* ------------------------------------------------------------------ */
let rsz = null;
addEventListener('resize', () => {
  clearTimeout(rsz);
  rsz = setTimeout(() => {
    swatches.forEach((s) => { s.mw.resize(); if (s.woven) s.mw.renderInstant(); });
    drawdown.resize();
    drawdown.renderInstant();
  }, 160);
});

/* ------------------------------------------------------------------ */
/* the nav follows the reader — a running stitch, kept threaded       */
/* ------------------------------------------------------------------ */
const navLinks = $$('.site-nav a');
const linkFor = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
const navIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const link = linkFor.get(e.target.id);
    if (!link) return;
    navLinks.forEach((a) => {
      if (a === link) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-32% 0px -58% 0px' });
navLinks.forEach((a) => {
  const sec = document.getElementById(a.getAttribute('href').slice(1));
  if (sec) navIO.observe(sec);
});

/* ------------------------------------------------------------------ */
/* reveals                                                            */
/* ------------------------------------------------------------------ */
const rvIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); rvIO.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
$$('.rv').forEach((el) => rvIO.observe(el));

document.body.classList.add('loaded');
