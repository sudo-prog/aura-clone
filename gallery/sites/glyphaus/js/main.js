/* ============================================================
   GLYPHAUS — live specimen engine
   One shared rAF loop drives: the pointer-tracked hero lens,
   three kinetic waterfalls. Everything pauses offscreen and
   on hidden tabs. Reduced motion gets designed static states.
   ============================================================ */

document.documentElement.classList.add('js');

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------- shared animation engine ---------- */
const tasks = new Set();
let rafId = null;
function pump(t) {
  rafId = null;
  if (document.hidden || tasks.size === 0) return;
  for (const fn of tasks) fn(t);
  rafId = requestAnimationFrame(pump);
}
function wake() {
  if (rafId === null && !document.hidden && tasks.size) rafId = requestAnimationFrame(pump);
}
document.addEventListener('visibilitychange', wake);

/* ============================================================
   1. SIGNATURE — pointer-tracked variable hero
   ============================================================ */
(function hero() {
  const heroEl = $('.hero');
  const title = $('#heroTitle');
  const lens = $('#heroLens');
  const read = $('#lensRead');
  if (!heroEl || !title) return;

  title.setAttribute('aria-label', 'Letters under tension');

  // touch devices get honest instructions
  const hint = $('#heroHint');
  if (hint && matchMedia('(hover: none)').matches) hint.textContent = 'drag a finger across the line';

  // split lines into per-letter spans
  const letters = [];
  $$('.hero-line', title).forEach(line => {
    line.setAttribute('aria-hidden', 'true');
    const text = line.textContent;
    line.textContent = '';
    [...text].forEach(ch => {
      const s = document.createElement('span');
      s.className = 'hl-ch';
      s.textContent = ch;
      line.appendChild(s);
      letters.push({ el: s, w: 170, wd: 68, heat: 0, lift: 0 });
    });
  });

  // resting + bloom targets
  const REST_W = 170, REST_WD = 68, PEAK_W = 900, PEAK_WD = 150;
  const INK = [22, 20, 14], ULTRA = [43, 31, 224];

  // reduced motion: never run the automated sweep — start parked in drift,
  // which immediately settles into the printed static axis run. Pointer
  // interaction (user-initiated) still tracks live.
  let mode = RM ? 'drift' : 'sweep'; // sweep -> drift -> pointer
  let target = { x: -200, y: 0 };
  let pos = { x: -200, y: 0 };
  let sweepT0 = null;
  let idleTimer = null;
  let heroVisible = true;
  let peak = { w: REST_W, wd: REST_WD };
  let boost = 0, boostT = 0;     // press-and-hold widens the lens field
  let lastRead = '';

  function heroRect() { return heroEl.getBoundingClientRect(); }

  function tick(t) {
    if (!heroVisible) return;
    const hr = heroRect();
    const tr = title.getBoundingClientRect();
    const cy = tr.top + tr.height / 2;

    if (mode === 'sweep') {
      if (sweepT0 === null) sweepT0 = t;
      const p = clamp((t - sweepT0) / 1500, 0, 1);
      const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
      target.x = hr.left - 120 + (hr.width + 240) * e;
      target.y = cy;
      if (p >= 1) mode = 'drift';
    } else if (mode === 'drift') {
      if (RM) { // reduced motion: park the lens, keep a designed static run
        staticRun();
        tasks.delete(tick);
        lens.classList.remove('on');
        return;
      }
      const s = t / 1000;
      target.x = hr.left + hr.width * (0.5 + 0.40 * Math.sin(s * 0.42));
      target.y = cy + tr.height * 0.38 * Math.sin(s * 0.83 + 1.3);
    }

    pos.x = lerp(pos.x, target.x, 0.13);
    pos.y = lerp(pos.y, target.y, 0.13);
    boost = lerp(boost, boostT, 0.09);

    const sigma = Math.max(120, hr.width * 0.105) * (1 + 0.9 * boost);
    const inv2s2 = 1 / (2 * sigma * sigma);
    let best = 0, bestL = null;

    for (const L of letters) {
      const r = L.el.getBoundingClientRect();
      const dx = (r.left + r.width / 2) - pos.x;
      const dy = (r.top + r.height / 2) - pos.y;
      const f = Math.exp(-(dx * dx + dy * dy) * inv2s2);
      if (f > best) { best = f; bestL = L; }
      const w = Math.round(REST_W + (PEAK_W - REST_W) * f);
      const wd = Math.round((REST_WD + (PEAK_WD - REST_WD) * f) * 2) / 2;
      if (Math.abs(w - L.w) >= 1 || Math.abs(wd - L.wd) >= 0.5) {
        L.w = w; L.wd = wd;
        L.el.style.fontVariationSettings = `"wght" ${w}, "wdth" ${wd}`;
      }
      // bloom has body: letters rise slightly toward the lens
      if (!RM) {
        const lift = f > 0.04 ? -(f * 0.055) : 0;
        if (Math.abs(lift - L.lift) > 0.0025) {
          L.lift = lift;
          L.el.style.transform = lift ? `translateY(${lift.toFixed(4)}em)` : '';
        }
      }
      // heat: ink -> ultramarine near the lens core
      const h = f < 0.72 ? 0 : (f - 0.72) / 0.28;
      if (Math.abs(h - L.heat) > 0.04) {
        L.heat = h;
        L.el.style.color = h === 0 ? '' :
          `rgb(${Math.round(lerp(INK[0], ULTRA[0], h))},${Math.round(lerp(INK[1], ULTRA[1], h))},${Math.round(lerp(INK[2], ULTRA[2], h))})`;
      }
    }

    peak.w = Math.round(REST_W + (PEAK_W - REST_W) * best);
    peak.wd = Math.round(REST_WD + (PEAK_WD - REST_WD) * best);
    lens.style.transform = `translate(${(pos.x - hr.left).toFixed(1)}px, ${(pos.y - hr.top).toFixed(1)}px)`;
    lens.classList.toggle('flip', pos.x - hr.left > hr.width - 160);
    // the HUD names the glyph it is measuring
    const ch = best > 0.3 && bestL ? bestL.el.textContent : null;
    const html = (ch
      ? `<b>${ch}</b> U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}<br>`
      : '') + `wght ${String(peak.w).padStart(3, '0')}<br>wdth ${String(peak.wd).padStart(3, '0')}`;
    if (html !== lastRead) { lastRead = html; read.innerHTML = html; }
  }

  function staticRun() {
    // reduced-motion fallback: a printed axis run across each line
    $$('.hero-line', title).forEach(line => {
      const chs = $$('.hl-ch', line);
      chs.forEach((el, i) => {
        const p = chs.length > 1 ? i / (chs.length - 1) : 0;
        el.style.fontVariationSettings =
          `"wght" ${Math.round(lerp(120, 880, p))}, "wdth" ${Math.round(lerp(64, 140, p))}`;
      });
    });
  }

  heroEl.addEventListener('pointermove', e => {
    if (mode === 'sweep') return;
    mode = 'pointer';
    target.x = e.clientX; target.y = e.clientY;
    lens.classList.add('on');
    if (RM) { tasks.add(tick); wake(); } // user-initiated: allow tracking
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { mode = 'drift'; }, 3200);
  });
  heroEl.addEventListener('pointerleave', () => {
    clearTimeout(idleTimer);
    if (mode !== 'sweep') mode = 'drift';
    if (RM) lens.classList.remove('on');
    boostT = 0;
  });
  heroEl.addEventListener('pointerdown', e => {
    if (e.target.closest('.hero-foot')) return;
    boostT = 1;
  });
  addEventListener('pointerup', () => { boostT = 0; });
  addEventListener('pointercancel', () => { boostT = 0; });

  new IntersectionObserver(([en]) => {
    heroVisible = en.isIntersecting;
    if (heroVisible && !(RM && mode === 'drift')) { tasks.add(tick); wake(); }
    else if (!heroVisible) tasks.delete(tick);
  }, { threshold: 0.05 }).observe(heroEl);

  // entrance choreography
  document.fonts.ready.then(() => {
    requestAnimationFrame(() => {
      letters.forEach((L, i) => {
        L.el.style.transitionDelay = `${i * 26}ms, ${i * 26}ms`;
      });
      title.classList.add('hero-in');
      $('.hero-foot').classList.add('foot-in');
      setTimeout(() => {
        letters.forEach(L => { L.el.style.transitionDelay = ''; });
        title.classList.add('hero-live');
        if (RM) { staticRun(); return; }
        lens.classList.add('on');
        tasks.add(tick); wake();
      }, RM ? 0 : 950);
    });
  });
})();

/* ============================================================
   2. Scroll reveals (mastheads)
   ============================================================ */
(function reveals() {
  const els = $$('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.2 });
  els.forEach(el => io.observe(el));
})();

/* ============================================================
   3. Kinetic waterfalls — each face ripples its own axis
   ============================================================ */
const WATERFALLS = {
  kolosse: {
    phrase: 'HAFENKRANBALLETT',
    sizes: [96, 71, 53, 39, 29, 21],
    axes: (t, i, p) => {
      const w = 500 + 380 * Math.sin(t / 900 + i * 0.85);
      const wd = 100 + 34 * Math.sin(t / 1400 + i * 0.6 + 2.1);
      return `"wght" ${Math.round(w)}, "wdth" ${Math.round(wd)}`;
    },
    still: (i, p) => `"wght" ${Math.round(lerp(880, 160, p))}, "wdth" ${Math.round(lerp(128, 72, p))}`,
    label: (i, s) => `${s} px`
  },
  falter: {
    phrase: 'Miszellen & Marginalien',
    sizes: [92, 68, 51, 38, 28, 21],
    opsz: [1200, 420, 130, 52, 21, 9],
    axes(t, i, p) {
      const w = 480 + 190 * Math.sin(t / 1100 + i * 0.95 + 1);
      return `"opsz" ${this.opsz[i]}, "wght" ${Math.round(w)}`;
    },
    still(i, p) { return `"opsz" ${this.opsz[i]}, "wght" 480`; },
    label(i, s) { return `opsz ${this.opsz[i]}`; }
  },
  betrieb: {
    phrase: 'handschrift wird maschine',
    sizes: [72, 56, 44, 34, 26, 20],
    axes: (t, i, p) => {
      const mono = 0.5 + 0.5 * Math.sin(t / 1300 + i * 1.05);
      const casl = 0.5 + 0.5 * Math.sin(t / 1700 + i * 0.8 + Math.PI);
      return `"MONO" ${mono.toFixed(2)}, "CASL" ${casl.toFixed(2)}, "wght" 520, "slnt" 0, "CRSV" 0.5`;
    },
    still: (i, p) => `"MONO" ${p.toFixed(2)}, "CASL" ${(1 - p).toFixed(2)}, "wght" 520, "slnt" 0, "CRSV" 0.5`,
    label: (i, s) => `${s} px`
  }
};

$$('.waterfall').forEach(wf => {
  const face = wf.dataset.face;
  const cfg = WATERFALLS[face];
  if (!cfg) return;
  wf.classList.add(`wf-${face}`);
  const rows = [];
  cfg.sizes.forEach((s, i) => {
    const p = i / (cfg.sizes.length - 1);
    const row = document.createElement('div');
    row.className = 'wf-row';
    const label = document.createElement('span');
    label.className = 'wf-label';
    label.textContent = cfg.label(i, s);
    const text = document.createElement('span');
    text.className = 'wf-text';
    text.textContent = cfg.phrase;
    text.style.fontSize = `clamp(${Math.max(14, Math.round(s * 0.34))}px, ${(s / 14.4).toFixed(2)}vw, ${s}px)`;
    text.style.fontVariationSettings = cfg.still(i, p);
    row.append(label, text);
    wf.appendChild(row);
    rows.push({ text, i, p });
  });
  if (RM) return; // designed static cascade stays

  const tick = t => {
    for (const r of rows) r.text.style.fontVariationSettings = cfg.axes(t, r.i, r.p);
  };
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting) { tasks.add(tick); wake(); }
    else tasks.delete(tick);
  }, { threshold: 0.08 }).observe(wf);
});

/* ============================================================
   4. Axis playgrounds — drag-driven, keyboard accessible
   ============================================================ */
const PLAYGROUNDS = {
  kolosse: {
    css: 'Kolosse VF',
    x: { tag: 'wdth', min: 50, max: 150, start: 118, fmt: v => Math.round(v) },
    y: { tag: 'wght', min: 100, max: 900, start: 760, fmt: v => Math.round(v) },
    extras: []
  },
  falter: {
    css: 'Falter VF',
    x: { tag: 'opsz', min: 5, max: 1200, start: 200, log: true, fmt: v => Math.round(v) },
    y: { tag: 'wght', min: 300, max: 900, start: 560, fmt: v => Math.round(v) },
    extras: ['wdth']
  },
  betrieb: {
    css: 'Betrieb VF',
    x: { tag: 'MONO', min: 0, max: 1, start: 0.65, fmt: v => v.toFixed(2) },
    y: { tag: 'CASL', min: 0, max: 1, start: 0.25, fmt: v => v.toFixed(2) },
    extras: ['wght', 'slnt']
  }
};

$$('.playground').forEach(pg => {
  const face = pg.dataset.face;
  const cfg = PLAYGROUNDS[face];
  if (!cfg) return;
  const pad = $('.pad', pg);
  const knob = $('.pad-knob', pg);
  const preview = $('.pg-preview', pg);
  const readout = $('.pg-read', pg);
  const copyBtn = $('.copy-css', pg);
  const sliders = $$('.mini-slider input', pg);
  // the whole section is one instrument: the charset glyph lens follows the pad
  const glChar = $('.gl-char', pg.closest('.release'));

  // normalized 0..1 positions (x: left->right, y: bottom->top)
  const toVal = (axis, n) => axis.log
    ? Math.exp(lerp(Math.log(axis.min), Math.log(axis.max), n))
    : lerp(axis.min, axis.max, n);
  const toN = (axis, v) => axis.log
    ? (Math.log(v) - Math.log(axis.min)) / (Math.log(axis.max) - Math.log(axis.min))
    : (v - axis.min) / (axis.max - axis.min);

  let nx = toN(cfg.x, cfg.x.start);
  let ny = toN(cfg.y, cfg.y.start);
  const extra = {};
  sliders.forEach(sl => { extra[sl.dataset.axis] = parseFloat(sl.value); });

  function currentAxes() {
    const vx = toVal(cfg.x, nx), vy = toVal(cfg.y, ny);
    const parts = [[cfg.x.tag, cfg.x.fmt(vx)], [cfg.y.tag, cfg.y.fmt(vy)]];
    for (const [tag, v] of Object.entries(extra)) parts.push([tag, v]);
    return parts;
  }

  function apply() {
    const parts = currentAxes();
    const fvs = parts.map(([t, v]) => `"${t}" ${v}`).join(', ');
    preview.style.fontVariationSettings = fvs;
    if (glChar) glChar.style.fontVariationSettings = fvs;
    knob.style.left = `${(nx * 100).toFixed(2)}%`;
    knob.style.top = `${((1 - ny) * 100).toFixed(2)}%`;
    readout.innerHTML = parts.map(([t, v]) =>
      `<div>${t.padEnd(4, ' ')} ${v}</div>`).join('');
  }
  apply();

  function fromPointer(e) {
    const r = pad.getBoundingClientRect();
    nx = clamp((e.clientX - r.left) / r.width, 0, 1);
    ny = clamp(1 - (e.clientY - r.top) / r.height, 0, 1);
    apply();
  }
  pad.addEventListener('pointerdown', e => {
    pad.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  pad.addEventListener('pointermove', e => {
    if (e.buttons) fromPointer(e);
  });
  pad.addEventListener('keydown', e => {
    const step = e.shiftKey ? 0.1 : 0.02;
    let hit = true;
    if (e.key === 'ArrowLeft') nx = clamp(nx - step, 0, 1);
    else if (e.key === 'ArrowRight') nx = clamp(nx + step, 0, 1);
    else if (e.key === 'ArrowUp') ny = clamp(ny + step, 0, 1);
    else if (e.key === 'ArrowDown') ny = clamp(ny - step, 0, 1);
    else hit = false;
    if (hit) { e.preventDefault(); apply(); }
  });

  sliders.forEach(sl => {
    sl.addEventListener('input', () => {
      extra[sl.dataset.axis] = parseFloat(sl.value);
      sl.closest('.mini-slider').querySelector('output').textContent = sl.value;
      apply();
    });
  });

  copyBtn.addEventListener('click', async () => {
    const parts = currentAxes();
    const css = `font-family: "${cfg.css}";\nfont-variation-settings: ${parts.map(([t, v]) => `"${t}" ${v}`).join(', ')};`;
    let ok = true;
    try { await navigator.clipboard.writeText(css); }
    catch { ok = false; }
    copyBtn.textContent = ok ? 'Copied ✓' : 'Clipboard blocked';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = 'Copy CSS';
      copyBtn.classList.remove('copied');
    }, 1600);
  });
});

/* ============================================================
   5. Test text size controls
   ============================================================ */
$$('.testbed').forEach(tb => {
  const range = $('.test-size', tb);
  const out = $('output', tb);
  const line = $('.test-line', tb);
  if (!range || !line) return;
  range.addEventListener('input', () => {
    line.style.fontSize = `${range.value}px`;
    out.textContent = range.value;
  });
});

/* ============================================================
   6. Character set grids + glyph lens
   ============================================================ */
const CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
  'abcdefghijklmnopqrstuvwxyz' +
  '0123456789' +
  'ÄÖÜäöüßÆŒØÅÇÉÈÊÑàéîõç' +
  '&@§¶†€$£¥¢%‰°' +
  '.,:;!?¡¿·•*#/\\()[]{}«»„“”‚‘’-–—_+−×=~^|<>"\'';

$$('.charset-grid').forEach(grid => {
  const lensChar = $('.gl-char', grid.closest('.charset'));
  const lensCode = $('.gl-code', grid.closest('.charset'));
  const frag = document.createDocumentFragment();
  [...CHARSET].forEach(ch => {
    const cell = document.createElement('div');
    cell.className = 'cs-cell';
    cell.textContent = ch;
    frag.appendChild(cell);
  });
  grid.appendChild(frag);

  // fill the trailing cells so the last row reads as a complete specimen sheet
  const count = [...CHARSET].length;
  function fillRow() {
    $$('.cs-empty', grid).forEach(c => c.remove());
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const need = (cols - (count % cols)) % cols;
    for (let i = 0; i < need; i++) {
      const c = document.createElement('div');
      c.className = 'cs-cell cs-empty';
      grid.appendChild(c);
    }
  }
  fillRow();

  // mobile: the sheet folds at ~6.5 rows so three specimens don't swallow the page
  const mqMobile = matchMedia('(max-width: 720px)');
  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'cs-more';
  moreBtn.textContent = 'Unfold the full sheet ↓';
  moreBtn.setAttribute('aria-expanded', 'false');
  grid.after(moreBtn);
  let folded = true;
  function applyFold() {
    if (mqMobile.matches && folded) {
      const cell = $('.cs-cell', grid);
      if (cell) grid.style.maxHeight = `${Math.round(cell.getBoundingClientRect().height * 6.5)}px`;
      grid.classList.add('folded');
    } else {
      grid.style.maxHeight = '';
      grid.classList.remove('folded');
    }
    moreBtn.hidden = !mqMobile.matches;
  }
  moreBtn.addEventListener('click', () => {
    folded = !folded;
    moreBtn.textContent = folded ? 'Unfold the full sheet ↓' : 'Fold the sheet ↑';
    moreBtn.setAttribute('aria-expanded', String(!folded));
    applyFold();
    if (folded) grid.scrollIntoView({ block: 'nearest' });
  });
  applyFold();
  mqMobile.addEventListener('change', applyFold);

  let rzT;
  addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { fillRow(); applyFold(); }, 160); });

  const codeOf = ch => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
  grid.addEventListener('pointerover', e => {
    const cell = e.target.closest('.cs-cell');
    if (!cell) return;
    const ch = cell.textContent;
    lensChar.textContent = ch;
    lensCode.textContent = codeOf(ch);
  });
  // click a glyph → it's on your clipboard
  grid.addEventListener('click', async e => {
    const cell = e.target.closest('.cs-cell');
    if (!cell || cell.classList.contains('cs-empty')) return;
    const ch = cell.textContent;
    lensChar.textContent = ch;
    try {
      await navigator.clipboard.writeText(ch);
      lensCode.textContent = `${codeOf(ch)} · copied`;
      cell.classList.add('cs-flash');
      setTimeout(() => cell.classList.remove('cs-flash'), 350);
    } catch { lensCode.textContent = codeOf(ch); }
  });
});

/* ============================================================
   6b. Trials band — the hero's negative: on ultramarine, the
   cursor presses weight OUT of the Kolosse line.
   ============================================================ */
(function trialsBloom() {
  const band = $('.trials');
  const line = $('.trials-line');
  if (!band || !line || RM) return;
  const T_W = 850, T_WD = 116, MIN_W = 210, MIN_WD = 74;
  const letters = [];
  // screen readers get the sentence, not a spelling bee (textContent keeps
  // source casing — innerText would bake in the CSS uppercase)
  line.setAttribute('aria-label',
    [...line.childNodes].map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim());
  [...line.childNodes].forEach(node => {
    if (node.nodeType !== 3) return; // keep <br>
    const frag = document.createDocumentFragment();
    [...node.textContent].forEach(ch => {
      if (ch === ' ') { frag.append(' '); return; }
      const s = document.createElement('span');
      s.textContent = ch;
      frag.appendChild(s);
      letters.push({ el: s, w: T_W, wd: T_WD, lw: T_W, lwd: T_WD });
    });
    node.replaceWith(frag);
  });
  const shield = document.createElement('span');
  shield.setAttribute('aria-hidden', 'true');
  while (line.firstChild) shield.appendChild(line.firstChild);
  line.appendChild(shield);

  let px = 0, py = 0, hot = false;
  const tick = () => {
    const r = line.getBoundingClientRect();
    const sigma = Math.max(80, r.width * 0.07);
    const inv = 1 / (2 * sigma * sigma);
    let settled = !hot;
    for (const L of letters) {
      const b = L.el.getBoundingClientRect();
      const dx = (b.left + b.width / 2) - px;
      const dy = (b.top + b.height / 2) - py;
      const f = hot ? Math.exp(-(dx * dx + dy * dy) * inv) : 0;
      const tw = T_W - (T_W - MIN_W) * f;
      const twd = T_WD - (T_WD - MIN_WD) * f;
      L.w = lerp(L.w, tw, 0.16);
      L.wd = lerp(L.wd, twd, 0.16);
      if (Math.abs(L.w - T_W) > 0.7) settled = false;
      const w = Math.round(L.w), wd = Math.round(L.wd * 2) / 2;
      if (w !== L.lw || wd !== L.lwd) {
        L.lw = w; L.lwd = wd;
        L.el.style.fontVariationSettings = `"wght" ${w}, "wdth" ${wd}`;
      }
    }
    if (settled) tasks.delete(tick);
  };
  band.addEventListener('pointermove', e => {
    px = e.clientX; py = e.clientY; hot = true;
    tasks.add(tick); wake();
  });
  band.addEventListener('pointerleave', () => { hot = false; tasks.add(tick); wake(); });
})();

/* ============================================================
   7. OpenType feature toggles — real font-feature-settings
   ============================================================ */
$$('.otf').forEach(otf => {
  const wrap = $('.otf-toggles', otf);
  const stage = $('.otf-stage', otf);
  const boxes = $$('input[data-feat]', wrap);
  function applyFeatures() {
    const on = boxes.filter(b => b.checked).map(b => `'${b.dataset.feat}' 1`);
    stage.style.fontFeatureSettings = on.length ? on.join(', ') : 'normal';
  }
  boxes.forEach(b => b.addEventListener('change', applyFeatures));
});

/* ============================================================
   8. Nav: reserve bold width to prevent hover jitter + scrollspy
   ============================================================ */
const navLinks = new Map();
$$('.bar-nav a').forEach(a => {
  a.setAttribute('data-text', a.textContent.trim());
  navLinks.set(a.getAttribute('href').slice(1), a);
});
(function scrollspy() {
  const watched = [...navLinks.keys()].map(id => document.getElementById(id)).filter(Boolean);
  if (!watched.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      navLinks.forEach(a => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
      const a = navLinks.get(en.target.id);
      if (a) { a.classList.add('active'); a.setAttribute('aria-current', 'true'); }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
  watched.forEach(s => io.observe(s));
})();
