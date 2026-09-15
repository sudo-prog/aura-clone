/* QUBIT — entanglement lattice hero.
   Nodes are simulated qubits in superposition: hue oscillates cyan↔violet with phase.
   Clicking measures a node — the collapse propagates along entangled links to
   anticorrelated partners, then everything slowly re-thermalizes. */
(() => {
  'use strict';

  const canvas = document.getElementById('lattice');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('latticeStatus');
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CYAN = [0, 168, 190];
  const VIOLET = [102, 51, 238];
  const CYAN_INK = '#087687';
  const VIOLET_INK = '#6633EE';

  const lerp = (a, b, t) => a + (b - a) * t;
  const mixRGB = m => [
    Math.round(lerp(CYAN[0], VIOLET[0], m)),
    Math.round(lerp(CYAN[1], VIOLET[1], m)),
    Math.round(lerp(CYAN[2], VIOLET[2], m)),
  ];
  const css = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* ---- pre-rendered glow sprites along the cyan→violet ramp ---- */
  const SPRITES = 33, SPR = 64;
  const sprites = [];
  for (let i = 0; i < SPRITES; i++) {
    const c = document.createElement('canvas');
    c.width = c.height = SPR;
    const g = c.getContext('2d');
    const rgb = mixRGB(i / (SPRITES - 1));
    const grad = g.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2);
    grad.addColorStop(0, css(rgb, 0.95));
    grad.addColorStop(0.22, css(rgb, 0.85));
    grad.addColorStop(0.38, css(rgb, 0.28));
    grad.addColorStop(1, css(rgb, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, SPR, SPR);
    sprites.push(c);
  }
  const spriteFor = m => sprites[Math.max(0, Math.min(SPRITES - 1, Math.round(m * (SPRITES - 1))))];

  /* ---- state ---- */
  let W = 0, H = 0, dpr = 1;
  let nodes = [], links = [], rings = [], pulses = [], shocks = [];
  let textZone = null;
  let mouse = { x: -1e4, y: -1e4 };
  let hoverNode = null;
  let measurements = 0;
  let lastRoot = null;      // { id, outcome, cascade } — one log line, lab-terse
  let userHasMeasured = false;
  let fontsReady = false;
  document.fonts.ready.then(() => { fontsReady = true; });

  function build(initial) {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const inner = document.querySelector('.hero-inner');
    if (inner) {
      const r = inner.getBoundingClientRect();
      const cr = rect;
      textZone = { x: r.left - cr.left - 10, y: r.top - cr.top - 10, w: r.width - 40, h: r.height + 20 };
    }

    nodes = []; links = []; rings = []; pulses = []; shocks = [];
    const target = Math.max(24, Math.min(72, Math.round((W * H) / 21000)));
    const cols = Math.max(4, Math.round(Math.sqrt(target * W / H)));
    const rows = Math.max(3, Math.round(target / cols));
    const gx = W / (cols + 0.4), gy = H / (rows + 0.4);
    let id = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = gx * (c + 0.7) + (Math.random() - 0.5) * gx * 0.62;
        const y = gy * (r + 0.7) + (Math.random() - 0.5) * gy * 0.62;
        nodes.push({
          id: id++, bx: x, by: y, x, y,
          phase: Math.random() * Math.PI * 2,
          omega: 0.0006 + Math.random() * 0.0007,
          da: 2.5 + Math.random() * 3.5,
          ds1: 0.00008 + Math.random() * 0.00012,
          ds2: 0.00008 + Math.random() * 0.00012,
          dp1: Math.random() * 6.28, dp2: Math.random() * 6.28,
          r: 2.9 + Math.random() * 1.1,
          state: 'super',           // super | definite | retherm
          outcome: 0, tState: 0, tRetherm: 0,
          links: [],
        });
      }
    }

    // entangle: 1–2 nearest neighbours each, plus a few nonlocal pairs
    const linkKey = (a, b) => a < b ? a + ':' + b : b + ':' + a;
    const seen = new Set();
    const addLink = (a, b, nl) => {
      const k = linkKey(a.id, b.id);
      if (seen.has(k) || a === b) return;
      seen.add(k);
      const l = {
        a, b, flash: 0,
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        bow: nl ? (Math.random() < 0.5 ? -0.09 : 0.09) : 0,   // nonlocal pairs arc gently
      };
      links.push(l); a.links.push(l); b.links.push(l);
    };
    for (const n of nodes) {
      const near = nodes
        .filter(o => o !== n)
        .sort((p, q) => (Math.hypot(p.x - n.x, p.y - n.y)) - (Math.hypot(q.x - n.x, q.y - n.y)))
        .slice(0, 5);
      const want = 1 + (Math.random() < 0.55 ? 1 : 0);
      for (let i = 0; i < want && i < near.length; i++) addLink(n, near[i]);
    }
    const nonlocal = Math.round(nodes.length * 0.07);
    for (let i = 0; i < nonlocal; i++) {
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      const far = nodes.filter(o => Math.hypot(o.x - a.x, o.y - a.y) > Math.min(W, H) * 0.4);
      if (far.length) addLink(a, far[Math.floor(Math.random() * far.length)], true);
    }

    /* load condensation: the ensemble cools into place, radially from the
       headline outward, synced with the text choreography */
    const bootNow = performance.now();
    for (const n of nodes) {
      const d = Math.hypot(n.bx - W * 0.34, n.by - H * 0.46);
      n.birth = (initial && !REDUCED)
        ? bootNow + 240 + d * 0.85 + Math.random() * 170
        : bootNow - 1000;
    }
    updateStatus();
  }

  const inZone = (x, y) => textZone &&
    x > textZone.x && x < textZone.x + textZone.w &&
    y > textZone.y && y < textZone.y + textZone.h;

  /* control point + parametric point for a link (nonlocal pairs bow slightly) */
  function linkCtrl(l) {
    const mx = (l.a.x + l.b.x) / 2, my = (l.a.y + l.b.y) / 2;
    if (!l.bow) return [mx, my];
    const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y;
    return [mx - dy * l.bow, my + dx * l.bow];
  }
  function linkPoint(l, t) {
    const [cx, cy] = linkCtrl(l);
    const u = 1 - t;
    return [
      u * u * l.a.x + 2 * u * t * cx + t * t * l.b.x,
      u * u * l.a.y + 2 * u * t * cy + t * t * l.b.y,
    ];
  }

  /* ---- physics helpers ---- */
  const birthEase = (n, now) =>
    easeOutCubic(Math.min(1, Math.max(0, (now - n.birth) / 520)));

  function nodeMix(n, now) {
    if (n.state === 'definite') return n.outcome;
    const osc = 0.5 + 0.5 * Math.sin(n.phase);
    if (n.state === 'retherm') {
      const p = Math.min(1, (now - n.tRetherm) / 3000);
      const e = easeInOut(p);
      return lerp(n.outcome, osc, e);
    }
    return osc;
  }

  /* ---- measurement ---- */
  function measure(n, forced, depth, auto) {
    if (n.state !== 'super' && n.state !== 'retherm') return;
    const now = performance.now();
    const pViolet = nodeMix(n, now);
    n.outcome = forced != null ? forced : (Math.random() < pViolet ? 1 : 0);
    n.state = 'definite';
    n.tState = now;
    n.hold = 6200 + Math.random() * 2200 + depth * 260;
    if (depth === 0 && !REDUCED) {
      /* the superposition ghost implodes, THEN the detector clicks —
         and a field ripple carries the disturbance across the ensemble */
      rings.push({ x: n.x, y: n.y, t0: now, out: n.outcome, implode: true });
      rings.push({ x: n.x, y: n.y, t0: now + 150, out: n.outcome, big: true });
      shocks.push({ x: n.x, y: n.y, t0: now, out: n.outcome });
    } else {
      rings.push({ x: n.x, y: n.y, t0: now, out: n.outcome, big: depth === 0 });
    }
    if (depth === 0) {
      measurements++;
      lastRoot = { id: n.id, outcome: n.outcome, cascade: 0, auto };
    } else if (lastRoot) {
      lastRoot.cascade++;
    }
    updateStatus();

    if (depth < 3) {
      for (const l of n.links) {
        const partner = l.a === n ? l.b : l.a;
        if (partner.state !== 'super' && partner.state !== 'retherm') continue;
        l.flash = now;
        if (REDUCED) {
          if (Math.random() < Math.pow(0.82, depth + 1)) measure(partner, 1 - n.outcome, depth + 1, auto);
        } else {
          pulses.push({
            l, from: n, to: partner, t0: now + 40,
            dur: Math.max(220, l.dist / 0.5),
            out: n.outcome, depth,
          });
        }
      }
    }
  }

  function ketHTML(outcome) {
    return `<span class="ket out${outcome}">${outcome}</span>`;
  }
  function updateStatus() {
    if (!statusEl) return;
    const base = `ensemble ${nodes.length} qubits · ${links.length} pairs entangled · ${measurements} measurement${measurements === 1 ? '' : 's'}`;
    let log = '';
    if (lastRoot) {
      log = ` — ${lastRoot.auto ? 'auto-measured' : 'measured'} <span class="nid">n${lastRoot.id}</span>&#8202;&rarr;&#8202;${ketHTML(lastRoot.outcome)}`;
      if (lastRoot.cascade > 0) {
        log += ` · collapse reached ${lastRoot.cascade} entangled partner${lastRoot.cascade === 1 ? '' : 's'}`;
      }
    }
    statusEl.innerHTML = base + log;
  }

  /* ---- drawing ---- */
  function drawKetLabel(x, y, outcome, alpha) {
    if (!fontsReady || alpha <= 0.01) return;
    const col = outcome === 1 ? VIOLET_INK : CYAN_INK;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 1.2;
    // bar
    ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke();
    // digit
    ctx.font = '500 10.5px "IBM Plex Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(outcome), x + 3.5, y + 0.5);
    // chevron ⟩
    ctx.beginPath();
    ctx.moveTo(x + 12.5, y - 5); ctx.lineTo(x + 16.5, y); ctx.lineTo(x + 12.5, y + 5);
    ctx.stroke();
    ctx.restore();
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    /* shock fronts — the measurement's disturbance crossing the field */
    for (const s of shocks) {
      const life = now - s.t0;          // rAF timestamps may trail performance.now()
      if (life <= 0) continue;
      const fade = Math.max(0, 1 - life / 1500);
      if (fade <= 0) continue;
      const rgb = s.out === 1 ? VIOLET : CYAN;
      ctx.strokeStyle = css(rgb, 0.12 * fade);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, life * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* links */
    for (const l of links) {
      const born = Math.min(birthEase(l.a, now), birthEase(l.b, now));
      if (born <= 0.02) continue;
      const ma = nodeMix(l.a, now), mb = nodeMix(l.b, now);
      const aDef = l.a.state === 'definite', bDef = l.b.state === 'definite';
      let alpha = 0.16;
      if (aDef || bDef) alpha = 0.3;
      if (aDef && bDef) alpha = 0.44;
      if (l.flash) {
        const f = Math.max(0, 1 - (now - l.flash) / 1400);
        alpha += 0.3 * f;
        if (f <= 0) l.flash = 0;
      }
      const dim = ((inZone(l.a.x, l.a.y) || inZone(l.b.x, l.b.y)) ? 0.5 : 1) * born;
      const grad = ctx.createLinearGradient(l.a.x, l.a.y, l.b.x, l.b.y);
      grad.addColorStop(0, css(mixRGB(ma), alpha * dim));
      grad.addColorStop(1, css(mixRGB(mb), alpha * dim));
      ctx.strokeStyle = grad;
      ctx.lineWidth = aDef && bDef ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(l.a.x, l.a.y);
      const [cx, cy] = linkCtrl(l);
      ctx.quadraticCurveTo(cx, cy, l.b.x, l.b.y);
      ctx.stroke();
    }

    /* pulses travelling along links */
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      const t = (now - p.t0) / p.dur;
      if (t < 0) continue;
      if (t >= 1) {
        pulses.splice(i, 1);
        /* correlation survives with per-hop decay — a failed pulse is decoherence */
        if (Math.random() < Math.pow(0.82, p.depth + 1)) measure(p.to, 1 - p.out, p.depth + 1, false);
        continue;
      }
      const fromA = p.l.a === p.from;
      const tt = fromA ? easeInOut(t) : 1 - easeInOut(t);
      const [x, y] = linkPoint(p.l, tt);
      const rgb = p.out === 1 ? VIOLET : CYAN;
      // trailing segment
      const e2 = easeInOut(Math.max(0, t - 0.12));
      const [x2, y2] = linkPoint(p.l, fromA ? e2 : 1 - e2);
      ctx.strokeStyle = css(rgb, 0.5 * (1 - t * 0.4));
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x, y);
      ctx.stroke();
      const s = spriteFor(p.out);
      ctx.drawImage(s, x - 10, y - 10, 20, 20);
    }

    /* rings — implosion (wavefunction pulled in), then the detector click */
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      const t = (now - r.t0) / (r.implode ? 200 : 620);
      if (t >= 1) { rings.splice(i, 1); continue; }
      if (t < 0) continue;
      const rgb = r.out === 1 ? VIOLET : CYAN;
      if (r.implode) {
        const e = easeInOut(t);
        ctx.strokeStyle = css(rgb, 0.25 + 0.5 * t);
        ctx.lineWidth = 1 + t;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 30 - e * 25, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      const e = easeOutCubic(t);
      const rad = 4 + e * (r.big ? 58 : 30);
      ctx.strokeStyle = css(rgb, 0.55 * (1 - t));
      ctx.lineWidth = 1.6 * (1 - t) + 0.4;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* nodes */
    for (const n of nodes) {
      const born = birthEase(n, now);
      if (born <= 0.02) continue;
      const m = nodeMix(n, now);
      const rgb = mixRGB(m);
      const dim = (inZone(n.x, n.y) ? 0.42 : 1) * born;
      const md = Math.hypot(mouse.x - n.x, mouse.y - n.y);
      const swell = Math.max(0, 1 - md / 110) * 2.2;
      let r = (n.r + swell) * (0.45 + 0.55 * born);

      if (n.state === 'definite' || n.state === 'retherm') {
        const age = now - n.tState;
        let la = Math.min(1, age / 240);
        if (n.state === 'retherm') la = Math.max(0, 1 - (now - n.tRetherm) / 900);
        // solid definite core + halo
        const s = spriteFor(m);
        const rr = r + 1.6;
        ctx.globalAlpha = dim;
        ctx.drawImage(s, n.x - rr * 3.2, n.y - rr * 3.2, rr * 6.4, rr * 6.4);
        ctx.globalAlpha = 1;
        ctx.fillStyle = css(rgb, 0.95 * dim);
        ctx.beginPath(); ctx.arc(n.x, n.y, rr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = css(rgb, 0.5 * dim * la);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(n.x, n.y, rr + 3.5, 0, Math.PI * 2); ctx.stroke();
        if (!inZone(n.x, n.y) && n.y < H - 64 && n.y > 26) {   // keep clear of HTML overlays
          const lx = n.x + rr + 26 > W ? n.x - rr - 26 : n.x + rr + 8;   // flip near right edge
          drawKetLabel(lx, n.y, n.outcome, la);
        }
      } else {
        // superposition: glow sprite + counter-phase ghost ring
        const s = spriteFor(m);
        ctx.globalAlpha = dim;
        ctx.drawImage(s, n.x - r * 3.4, n.y - r * 3.4, r * 6.8, r * 6.8);
        ctx.globalAlpha = 1;
        ctx.fillStyle = css(rgb, 0.9 * dim);
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
        if (!REDUCED) {
          const gr = mixRGB(1 - m);
          const off = 1.6 * Math.sin(n.phase * 0.63 + n.dp1);
          ctx.strokeStyle = css(gr, 0.28 * dim);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.x + off, n.y - off * 0.6, r + 3.2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      if (n === hoverNode && n.state === 'super') {
        ctx.strokeStyle = css(rgb, 0.85);
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 7, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  /* ---- simulation step ---- */
  let last = performance.now();
  function step(now) {
    const dt = Math.min(50, now - last);
    last = now;
    hoverNode = null;
    let hd = 26;

    /* active shock fronts: radius + strength this frame */
    const act = [];
    for (let i = shocks.length - 1; i >= 0; i--) {
      const s = shocks[i];
      const life = now - s.t0;
      if (life > 1500 || life * 0.5 > Math.hypot(W, H)) { shocks.splice(i, 1); continue; }
      act.push({ s, front: life * 0.5, amp: 1 - life / 1500 });
    }

    for (const n of nodes) {
      if (!REDUCED) {
        n.phase += n.omega * dt;
        n.x = n.bx + n.da * Math.sin(n.ds1 * now + n.dp1);
        n.y = n.by + n.da * Math.cos(n.ds2 * now + n.dp2);
        /* measurement back-action: the passing front displaces the node
           and scrambles its phase — the field remembers being asked */
        for (const a of act) {
          const dx = n.x - a.s.x, dy = n.y - a.s.y;
          const d = Math.hypot(dx, dy) || 1;
          const g = Math.exp(-((d - a.front) ** 2) / 7200);
          if (g > 0.01) {
            const k = g * a.amp;
            n.x += (dx / d) * k * 9;
            n.y += (dy / d) * k * 9;
            n.phase += k * 0.055;
          }
        }
      }
      if (n.state === 'definite' && now - n.tState > n.hold) {
        n.state = 'retherm';
        n.tRetherm = now;
      } else if (n.state === 'retherm' && now - n.tRetherm > 3000) {
        n.state = 'super';
      }
      const d = Math.hypot(mouse.x - n.x, mouse.y - n.y);
      if (d < hd) { hd = d; hoverNode = n; }
    }
    const cur = hoverNode ? 'pointer' : 'crosshair';
    if (cur !== lastCursor) { canvas.style.cursor = cur; lastCursor = cur; }
  }
  let lastCursor = '';

  /* ---- run loop, gated on visibility ---- */
  let running = false, inView = true, rafId = 0;
  function frame(now) {
    if (!running) return;
    step(now);
    draw(now);
    rafId = requestAnimationFrame(frame);
  }
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); rafId = requestAnimationFrame(frame); }
    else cancelAnimationFrame(rafId);
  }
  const vis = () => setRunning(inView && !document.hidden && !REDUCED);
  document.addEventListener('visibilitychange', vis);
  new IntersectionObserver(es => { inView = es[0].isIntersecting; vis(); }, { threshold: 0.02 })
    .observe(canvas);

  /* ---- input ---- */
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 34;
    for (const n of nodes) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bd) { bd = d; best = n; }
    }
    if (best) {
      userHasMeasured = true;
      measure(best, null, 0, false);
      if (REDUCED) draw(performance.now());
    }
  });

  /* ---- auto-demo: perform one measurement if the visitor hasn't ---- */
  function autoDemo(delay) {
    setTimeout(() => {
      if (userHasMeasured || document.hidden || REDUCED) return;
      const candidates = nodes.filter(n => n.state === 'super' && n.links.length >= 2 && !inZone(n.x, n.y));
      if (!candidates.length) return;
      const n = candidates[Math.floor(Math.random() * candidates.length)];
      measure(n, null, 0, true);
    }, delay);
  }

  /* ---- boot ---- */
  build(true);
  if (REDUCED) {
    // static composition: one honest frame, redrawn only on interaction
    for (const n of nodes) n.phase = Math.random() * Math.PI * 2;
    const redraw = () => draw(performance.now());
    document.fonts.ready.then(redraw);
    redraw();
    setInterval(() => {
      if (document.hidden || !inView) return;
      step(performance.now()); redraw();
    }, 1200);
  } else {
    vis();
    autoDemo(2400);
    autoDemo(11000);
  }

  let rto = 0;
  addEventListener('resize', () => {
    clearTimeout(rto);
    rto = setTimeout(() => { build(); if (REDUCED) draw(performance.now()); }, 180);
  });
})();
