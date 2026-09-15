/* MAISON MILLE-FEUILLE — la coupe qui s'ouvre
   24 planes, one pastry. Scroll fans them open like a book of layers. */
(function () {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c) => (c || document).querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (p, a, b) => {
    const t = clamp((p - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  /* ---------- seeded rng (stable flaky edges) ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function smoothPath(pts) {
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let j = 1; j < pts.length - 1; j++) {
      const [x1, y1] = pts[j], [x2, y2] = pts[j + 1];
      d += ` Q${x1.toFixed(1)},${y1.toFixed(1)} ${((x1 + x2) / 2).toFixed(1)},${((y1 + y2) / 2).toFixed(1)}`;
    }
    const last = pts[pts.length - 1];
    d += ` L${last[0].toFixed(1)},${last[1].toFixed(1)}`;
    return d;
  }

  /* ---------- plane SVG builders (design width 720) ---------- */
  const W = 720;

  function puffStripSVG(i, grad) {
    const r = rng(i * 7919 + 13);
    const H = 16, segs = 12;
    const top = [], bot = [];
    for (let s = 0; s <= segs; s++) {
      const x = s * (W / segs);
      top.push([x, 3.2 + (r() - 0.5) * 3.4]);
      bot.push([x, H - 3.2 + (r() - 0.5) * 3.4]);
    }
    const d = smoothPath(top) + ` L${W},${bot[segs][1].toFixed(1)} ` +
      smoothPath(bot.slice().reverse()).replace(/^M/, 'L') + ' Z';
    // two faint inner laminae
    const mkLine = (yy, amp) => {
      const pts = [];
      for (let s = 0; s <= segs; s++) pts.push([s * (W / segs), yy + (r() - 0.5) * amp]);
      return smoothPath(pts);
    };
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <path d="${d}" fill="url(#${grad})"/>
      <path d="${mkLine(6.5, 2)}" stroke="#C48A2E" stroke-width=".8" fill="none" opacity=".32"/>
      <path d="${mkLine(10.5, 2)}" stroke="#A86F24" stroke-width=".7" fill="none" opacity=".22"/>
    </svg>`;
  }

  function cremeSVG(seed) {
    const r = rng(seed * 104729 + 7);
    const H = 48, n = 12, w = W / n;
    let d = `M0,${H}`;
    for (let k = 0; k < n; k++) d += ` a${(w / 2).toFixed(1)},${(H * 0.44 + r() * 4).toFixed(1)} 0 0 1 ${w},0`;
    d += ' Z';
    let flecks = '', gloss = '';
    for (let k = 0; k < 17; k++) {
      const x = r() * W, y = 26 + r() * 16, rot = (r() * 90 - 45).toFixed(0);
      flecks += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="1.6" ry=".75" transform="rotate(${rot} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
    }
    for (let k = 0; k < n; k++) {
      gloss += `<ellipse cx="${(k * w + w * 0.38).toFixed(0)}" cy="${(H * 0.36).toFixed(0)}" rx="${(w * 0.2).toFixed(0)}" ry="4" fill="#FEFBF2" opacity=".4"/>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <path d="${d}" fill="url(#gCreme)"/>
      ${gloss}
      <g fill="#47301C" opacity=".55">${flecks}</g>
    </svg>`;
  }

  function glazeSVG() {
    const H = 34;
    const strand = (y0, phase, col, wdt, op) => {
      const per = 120, amp = 6.5;
      const pts = [];
      for (let x = 0; x <= W; x += per / 2) {
        const up = ((x / (per / 2)) + phase) % 2 < 1;
        pts.push([x, y0 + (up ? -amp / 2 : amp / 2)]);
      }
      return `<path d="${smoothPath(pts)}" stroke="${col}" stroke-width="${wdt}" fill="none" opacity="${op}" stroke-linecap="round"/>`;
    };
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <rect x="0" y="1.5" width="${W}" height="${H - 3}" rx="7" fill="url(#gGlaze)" stroke="#D8C49B" stroke-width="1"/>
      <rect x="10" y="4" width="${W - 20}" height="3" rx="1.5" fill="#FFFFFF" opacity=".7"/>
      ${strand(11, 0, '#5B3A21', 2, .9)}
      ${strand(16, 1, '#8B5E3B', 1.6, .7)}
      ${strand(21, 0, '#C22E56', 1.8, .95)}
      ${strand(26, 1, '#5B3A21', 2, .9)}
    </svg>`;
  }

  /* ---------- build the stack ---------- */
  const stack = $('#stack');
  const stage = $('#coupeStage');
  const track = $('#coupeTrack');
  const leadersSVG = $('#leaders');
  const labelsList = $('#labels');
  const meterEl = $('#meterPct');
  const plate = $('#stackPlate');

  const planes = [];          // {el, h, adv, baseY, depth}
  const spec = [];

  spec.push({ kind: 'glaze', h: 34, adv: 26 });
  for (let slab = 0; slab < 3; slab++) {
    for (let s = 0; s < 7; s++) {
      const last = s === 6;
      spec.push({
        kind: 'strip', slab, h: 16,
        adv: last ? (slab === 2 ? 16 : 12) : 9
      });
    }
    if (slab < 2) spec.push({ kind: 'creme', h: 48, adv: 40 });
  }

  // grads per slab: top light, middle mid, bottom dark
  const slabGrad = ['gPuffLight', 'gPuffMid', 'gPuffDark'];

  let designH = 0;
  spec.forEach((sp, i) => {
    sp.baseY = designH;
    designH += sp.adv;
    const el = document.createElement('div');
    el.className = 'plane';
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.opacity = '0';
      el.style.transform = 'translate3d(0,-34px,0)';
    }
    if (sp.kind === 'glaze') el.innerHTML = glazeSVG();
    else if (sp.kind === 'creme') el.innerHTML = cremeSVG(i);
    else el.innerHTML = puffStripSVG(i, slabGrad[sp.slab]);
    el.style.zIndex = String(40 - i); // top layers above
    el.style.transformOrigin = 'left center';
    stack.appendChild(el);
    planes.push({ el, sp, i });
  });
  if (plate && !matchMedia('(prefers-reduced-motion: reduce)').matches) plate.style.opacity = '0';
  // last plane bottom edge
  const designCH = spec[spec.length - 1].baseY + spec[spec.length - 1].h;
  const N = planes.length;
  const CENTER = (N - 1) / 2;

  // grouped fan offsets: small gaps within a slab, wide gaps at component
  // boundaries (glaze | feuilletage | crème) so the pastry opens into its
  // anatomy, and each component shows its leaves
  const offsets = (() => {
    const wts = [];
    for (let i = 1; i < N; i++) {
      const a = spec[i - 1], b = spec[i];
      const boundary = a.kind !== b.kind || (a.kind === 'strip' && a.slab !== b.slab);
      wts.push(boundary ? 4.5 : 0.5);
    }
    const cum = [0];
    wts.forEach(w => cum.push(cum[cum.length - 1] + w));
    const total = cum[cum.length - 1];
    return cum.map(c => (c - total / 2) / total * (N - 1));
  })();

  /* ---------- leader lines ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const labelEls = Array.from(labelsList.querySelectorAll('.label'));
  const leaders = labelEls.map(l => {
    const line = document.createElementNS(NS, 'line');
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', '2.6');
    leadersSVG.appendChild(line);
    leadersSVG.appendChild(dot);
    return { line, dot, plane: +l.dataset.plane, labelEl: l };
  });

  /* ---------- geometry / layout ---------- */
  let scale = 1, stackW = 720, closedH = 300, gapPer = 10, stackTopPad = 0, rotScale = 1;
  let stageRect = null, stackRect = null, labelRects = [];
  let desktopLabels = true;

  function layout() {
    stackW = stack.clientWidth || 720;
    scale = stackW / W;
    rotScale = stackW < 560 ? 0.72 : 1;
    closedH = designCH * scale;
    const stageH = reduced ? innerHeight : (stage.clientHeight || innerHeight);
    desktopLabels = innerWidth > 1160;
    const room = stageH * (desktopLabels ? 0.74 : 0.52);
    gapPer = clamp((room - closedH) / (N - 1), 4, 26);
    const openH = closedH + gapPer * (N - 1);
    stack.style.height = openH + 'px';
    stackTopPad = (openH - closedH) / 2;
    planes.forEach(p => {
      p.el.style.top = (stackTopPad + p.sp.baseY * scale) + 'px';
      p.el.style.height = (p.sp.h * scale) + 'px';
    });
    if (plate) plate.style.top = (stackTopPad + closedH - 12) + 'px';
    // cache rects for leader lines
    requestAnimationFrame(() => {
      stageRect = stage.getBoundingClientRect();
      stackRect = stack.getBoundingClientRect();
      const grid = $('.stage-grid').getBoundingClientRect();
      leadersSVG.setAttribute('viewBox', `0 0 ${grid.width} ${grid.height}`);
      leadersSVG.setAttribute('width', grid.width);
      leadersSVG.setAttribute('height', grid.height);
      labelRects = leaders.map(L => {
        const r = L.labelEl.getBoundingClientRect();
        return { x: r.left - grid.left, y: r.top - grid.top + r.height / 2 };
      });
      gridRect = grid;
      dirty = true;
      // reduced-motion static fan: leaders can only be drawn once rects exist
      // (fonts.ready may resolve before this rAF, making intro's call a no-op)
      if (reduced && live) applyLeaders();
    });
  }
  let gridRect = null;

  /* ---------- scroll + parallax state ---------- */
  let pTarget = 0, p = -1;           // fan progress
  let mxT = 0, myT = 0, mx = 0, my = 0; // mouse parallax
  let dirty = true;
  let heroVisible = true;
  let live = false;                  // intro finished, JS owns transforms

  const MAXDEG = 0.85;               // fan rotation step (per grouped offset unit)

  function applyFan() {
    const spread = p;
    stack.style.transform =
      `rotateX(${(4 * spread - my * 2.2).toFixed(2)}deg) rotateY(${(mx * 2.4).toFixed(2)}deg)`;
    if (plate) {
      plate.style.opacity = clamp(1 - spread * 2.4, 0, 1).toFixed(3);
      plate.style.transform = `translateX(-50%) scale(${(1 - 0.06 * spread).toFixed(3)})`;
    }
    for (let i = 0; i < N; i++) {
      const pl = planes[i];
      const off = i - CENTER;
      const ty = offsets[i] * gapPer * spread;
      // group-coherent rotation: leaves inside a slab stay near-parallel,
      // the components fan as wings — feuilletage, not pick-up sticks
      const rot = -offsets[i] * MAXDEG * rotScale * spread;
      const tx = mx * off * 0.55;
      const tz = (CENTER - Math.abs(off)) * 1.5 + my * off * -0.8;
      pl.el.style.transform =
        `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, ${tz.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
      pl._ty = ty; pl._rot = rot;
    }
  }

  function applyLeaders() {
    if (!desktopLabels || !gridRect || !stackRect || !stageRect) return;
    const sx = stackRect.left - gridRect.left;
    const sy = stackRect.top - gridRect.top;
    leaders.forEach((L, j) => {
      const pl = planes[L.plane];
      const midY = stackTopPad + (pl.sp.baseY + pl.sp.h / 2) * scale;
      const y = sy + midY + (pl._ty || 0) + Math.tan((pl._rot || 0) * Math.PI / 180) * stackW;
      const x = sx + stackW - 6;
      const lr = labelRects[j];
      if (!lr) return;
      L.line.setAttribute('x1', (lr.x - 14).toFixed(1));
      L.line.setAttribute('y1', lr.y.toFixed(1));
      L.line.setAttribute('x2', x.toFixed(1));
      L.line.setAttribute('y2', y.toFixed(1));
      L.dot.setAttribute('cx', x.toFixed(1));
      L.dot.setAttribute('cy', y.toFixed(1));
    });
  }

  const hintEl = $('.coupe-hint');
  function applyLabels() {
    leaders.forEach((L, j) => {
      const on = p > 0.16 + j * 0.115;
      L.labelEl.classList.toggle('on', on);
      L.line.classList.toggle('on', on && desktopLabels);
      L.dot.classList.toggle('on', on && desktopLabels);
    });
    hintEl.classList.toggle('gone', p > 0.12);
  }

  let lastPct = -1;
  function applyMeter() {
    const pct = Math.round(p * 100);
    if (pct !== lastPct) {
      lastPct = pct;
      meterEl.textContent = pct + ' %';
    }
  }

  /* ---------- fold dividers (scroll-linked letter fold) ---------- */
  const dividers = Array.from(document.querySelectorAll('.fold-divider')).map(d => ({
    el: d, persp: $('.fd-persp', d), pl: -1, pr: -1
  }));

  function applyDividers() {
    const vh = innerHeight;
    dividers.forEach(d => {
      const r = d.el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      const prog = clamp(1 - (r.top + r.height / 2 - vh * 0.18) / (vh * 0.72), 0, 1);
      const pl = smoothstep(prog, 0.05, 0.5);
      const pr = smoothstep(prog, 0.5, 0.95);
      if (Math.abs(pl - d.pl) > 0.002 || Math.abs(pr - d.pr) > 0.002) {
        d.pl = pl; d.pr = pr;
        d.persp.style.setProperty('--pl', pl.toFixed(3));
        d.persp.style.setProperty('--pr', pr.toFixed(3));
      }
    });
  }

  /* ---------- engine: wake-on-event, sleep-when-settled ---------- */
  let rafId = 0, lastEvent = 0;

  function frame() {
    rafId = 0;
    if (document.hidden) return;

    // scroll progress across track
    const tr = track.getBoundingClientRect();
    const total = tr.height - innerHeight;
    pTarget = total > 0 ? clamp(-tr.top / total, 0, 1) : 0;
    heroVisible = tr.bottom > 0 && tr.top < innerHeight;

    let settled = true;

    if (!reduced && live && heroVisible) {
      const np = lerp(p < 0 ? pTarget : p, pTarget, 0.14);
      const nmx = lerp(mx, mxT, 0.08);
      const nmy = lerp(my, myT, 0.08);
      if (Math.abs(np - p) > 0.0004 || Math.abs(nmx - mx) > 0.002 || Math.abs(nmy - my) > 0.002 || dirty) {
        p = np; mx = nmx; my = nmy;
        applyFan();
        applyLeaders();
        applyLabels();
        applyMeter();
        dirty = false;
        settled = false;
      }
    }

    if (!reduced) applyDividers();

    if (!settled || performance.now() - lastEvent < 350) {
      rafId = requestAnimationFrame(frame);
    }
  }

  function wake() {
    lastEvent = performance.now();
    if (!rafId && !document.hidden) rafId = requestAnimationFrame(frame);
  }

  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', () => {
    layout();
    // reduced-motion fan is static: re-seat it after re-layout
    if (reduced && live) requestAnimationFrame(() => { applyFan(); applyLeaders(); });
    wake();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    else wake();
  });
  if (!reduced) {
    addEventListener('pointermove', e => {
      mxT = clamp((e.clientX / innerWidth) * 2 - 1, -1, 1);
      myT = clamp((e.clientY / innerHeight) * 2 - 1, -1, 1);
      if (heroVisible) wake();
    }, { passive: true });
  }

  /* ---------- intro choreography ---------- */
  function intro() {
    document.body.classList.add('loaded');
    if (reduced) {
      live = true;
      p = 0.55; mx = 0; my = 0;
      applyFan(); applyLeaders();
      leaders.forEach(L => {
        L.labelEl.classList.add('on');
        L.line.classList.add('on'); L.dot.classList.add('on');
      });
      applyMeter();
      return;
    }
    // planes drop in, bottom-up (initial hidden state set at creation);
    // the plate arrives first, so the pastry has somewhere to land
    void stack.offsetHeight;
    if (plate) {
      plate.style.transition = 'opacity .7s cubic-bezier(.22,1,.36,1) 0ms';
      plate.style.opacity = '1';
    }
    planes.forEach((pl, i) => {
      const delay = (N - 1 - i) * 48;
      pl.el.style.transition =
        `opacity .7s cubic-bezier(.22,1,.36,1) ${delay}ms, transform .7s cubic-bezier(.22,1,.36,1) ${delay}ms`;
      pl.el.style.opacity = '1';
      pl.el.style.transform = 'translate3d(0,0,0)';
    });
    const settleTime = (N - 1) * 48 + 750;
    setTimeout(() => {
      planes.forEach(pl => { pl.el.style.transition = 'none'; });
      if (plate) plate.style.transition = 'none';
      live = true;
      dirty = true;
      wake();
    }, settleTime);
  }

  /* ---------- reveals + counters ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
      const tick = $('.tick', en.target);
      if (tick && !reduced && !tick.dataset.done) {
        tick.dataset.done = '1';
        animateTick(tick);
      }
    });
  }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('.reveal, .tour, .tourage h2').forEach(el => {
    if (reduced) el.classList.add('in');
    else io.observe(el);
  });

  function animateTick(el) {
    const target = +el.dataset.n;
    const dur = 900 + target / 3;
    const t0 = performance.now();
    function step(now) {
      const t = clamp((now - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * e));
      if (t < 1 && !document.hidden) requestAnimationFrame(step);
      else el.textContent = String(target);
    }
    requestAnimationFrame(step);
  }

  /* ---------- boot ---------- */
  layout();
  // second layout after fonts settle label heights
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { layout(); intro(); wake(); });
    // safety: if fonts hang, still boot
    setTimeout(() => { if (!document.body.classList.contains('loaded')) { layout(); intro(); wake(); } }, 2500);
  } else {
    intro(); wake();
  }
})();
