/* TENTH FLOOR APIARY — comb.js
   The layout engine. Hexagon as structural truth: every comb cluster on the
   page is laid out on a true pointy-top hex lattice (bees build with two
   vertical walls) and assembles cell by cell, concentrically from a seed —
   the way real comb grows from its attachment point. */
(() => {
  'use strict';
  window.APIARY = window.APIARY || {};
  const A = window.APIARY;
  A.landables = [];

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SQ = 1.1547005; // hex height / width, pointy-top

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const combs = [...document.querySelectorAll('[data-comb]')];

  function probeHexW(el) {
    const p = document.createElement('div');
    p.className = 'cell';
    p.style.visibility = 'hidden';
    p.style.transition = 'none';
    p.style.transform = 'none';
    el.appendChild(p);
    const w = p.offsetWidth || 96; // offsetWidth ignores transforms
    p.remove();
    return w;
  }

  function makeCell(type, x, y, delay, land) {
    const d = document.createElement('div');
    d.className = `cell cell--gen cell--${type}`;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    d.style.setProperty('--d', Math.round(delay) + 'ms');
    if (land) d.dataset.land = '1';
    return d;
  }

  function delayFrom(x, y, sx, sy, w, rnd) {
    return Math.min(2100, (Math.hypot(x - sx, y - sy) / w) * 55) + rnd() * 70;
  }

  /* ---------- field mode (hero): fill the container, clear an ellipse ---------- */
  function buildField(el, rnd) {
    const w = probeHexW(el);
    const h = w * SQ;
    const W = el.clientWidth, H = el.clientHeight;
    const cols = Math.ceil(W / w) + 2;
    const rows = Math.ceil(H / (0.75 * h)) + 2;
    const cx = W * 0.5, cy = H * 0.5;
    const rx = W < 700 ? W * 0.62 : Math.min(W * 0.36, 480);
    const ry = Math.max(240, Math.min(H * 0.38, 340));
    const sx = W, sy = H * 0.42; // hive entrance: right edge
    const frag = document.createDocumentFragment();
    const lands = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c + (r % 2) * 0.5 - 1) * w;
        const y = r * 0.75 * h - h * 0.5;
        const dx = (x + w / 2 - cx) / rx, dy = (y + h / 2 - cy) / ry;
        const e = dx * dx + dy * dy;
        if (e < 0.55) continue; // smoke-cleared center
        let type;
        const v = rnd();
        if (e < 1) type = 'ghost';
        else type = v < 0.52 ? 'capped' : v < 0.72 ? 'open' : 'empty';
        const land = type === 'open' && rnd() < 0.2;
        const cell = makeCell(type, x, y, delayFrom(x, y, sx, sy, w, rnd), land);
        if (land) lands.push(cell);
        frag.appendChild(cell);
      }
    }
    el.appendChild(frag);
    return lands;
  }

  /* ---------- wrap mode (registry): honeycomb-flow content cells ---------- */
  function buildWrap(el, rnd) {
    const w = probeHexW(el);
    const h = w * SQ;
    const W = el.clientWidth;
    const content = [...el.querySelectorAll(':scope > .cell--content')];
    const N = Math.max(1, Math.floor(W / w - 0.5));
    const occupied = new Set();
    const placed = [];
    let row = 0, col = 0;
    for (const cellEl of content) {
      const cap = row % 2 === 0 ? N : Math.max(1, N - 1);
      if (col >= cap) { col = 0; row++; }
      placed.push({ el: cellEl, c: col, r: row });
      occupied.add(col + ',' + row);
      col++;
    }
    const px = (c, r) => (c + (r % 2) * 0.5) * w;
    const py = r => r * 0.75 * h;
    let minX = Infinity, maxX = -Infinity, maxY = 0;
    for (const p of placed) {
      minX = Math.min(minX, px(p.c, p.r));
      maxX = Math.max(maxX, px(p.c, p.r) + w);
      maxY = Math.max(maxY, py(p.r) + h);
    }
    const offX = Math.max(0, (W - (maxX - minX)) / 2) - minX;
    const sx = px(placed[0].c, placed[0].r) + offX + w / 2, sy = h / 2;
    for (const p of placed) {
      const x = px(p.c, p.r) + offX, y = py(p.r);
      p.el.style.left = x + 'px';
      p.el.style.top = y + 'px';
      p.el.style.setProperty('--d', Math.round(delayFrom(x, y, sx, sy, w, rnd)) + 'ms');
    }
    let height = maxY;
    const lands = [];
    // decorative comb around the content, desktop only
    const decorMin = parseFloat(el.dataset.decorMin || '900');
    if (innerWidth >= decorMin && el.dataset.decor) {
      const rectL = el.getBoundingClientRect().left;
      let decor = [];
      try { decor = JSON.parse(el.dataset.decor); } catch (e) { decor = []; }
      const frag = document.createDocumentFragment();
      for (const d of decor) {
        if (occupied.has(d.c + ',' + d.r)) continue;
        const x = px(d.c, d.r) + offX, y = py(d.r);
        const pageX = rectL + x;
        if (pageX < -0.4 * w || pageX + w > innerWidth + 0.4 * w) continue;
        const cell = makeCell(d.t, x, y, delayFrom(x, y, sx, sy, w, rnd), d.land && d.t === 'open');
        if (cell.dataset.land) lands.push(cell);
        frag.appendChild(cell);
        height = Math.max(height, y + h);
      }
      el.appendChild(frag);
    }
    el.style.height = Math.ceil(height) + 'px';
    return lands;
  }

  /* ---------- explicit mode (stats): axial coords + optional halo ring ---------- */
  function buildAxial(el, rnd) {
    const w = probeHexW(el);
    const h = w * SQ;
    const content = [...el.querySelectorAll(':scope > .cell--content')];
    const cells = content.map(c => ({ el: c, q: +c.dataset.q, r: +c.dataset.r }));
    const occupied = new Set(cells.map(c => c.q + ',' + c.r));
    const haloDepth = parseInt(el.dataset.halo || '0', 10);
    const haloP = parseFloat(el.dataset.haloP || '0.5');
    // decorative halo needs sideways room — on narrow viewports it would
    // push the cluster wider than the screen and clip the content cells
    const haloMin = parseFloat(el.dataset.haloMin || '700');
    const halo = [];
    if (haloDepth > 0 && innerWidth >= haloMin) {
      const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
      let frontier = cells.map(c => ({ q: c.q, r: c.r }));
      for (let depth = 0; depth < haloDepth; depth++) {
        const next = [];
        for (const f of frontier) {
          for (const [dq, dr] of NB) {
            const q = f.q + dq, r = f.r + dr, key = q + ',' + r;
            if (occupied.has(key)) continue;
            occupied.add(key);
            next.push({ q, r });
            if (rnd() < haloP) {
              const v = rnd();
              halo.push({ q, r, t: v < 0.45 ? 'capped' : v < 0.75 ? 'open' : 'empty', land: v >= 0.45 && v < 0.75 && rnd() < 0.4 });
            }
          }
        }
        frontier = next;
      }
    }
    const all = [...cells, ...halo];
    const px = c => (c.q + c.r / 2) * w;
    const py = c => c.r * 0.75 * h;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of all) {
      minX = Math.min(minX, px(c)); maxX = Math.max(maxX, px(c) + w);
      minY = Math.min(minY, py(c)); maxY = Math.max(maxY, py(c) + h);
    }
    const sx = px(cells[0]) - minX + w / 2, sy = py(cells[0]) - minY + h / 2;
    const lands = [];
    const frag = document.createDocumentFragment();
    for (const c of all) {
      const x = px(c) - minX, y = py(c) - minY;
      const delay = delayFrom(x, y, sx, sy, w, rnd);
      if (c.el) {
        c.el.style.left = x + 'px';
        c.el.style.top = y + 'px';
        c.el.style.setProperty('--d', Math.round(delay) + 'ms');
      } else {
        const cell = makeCell(c.t, x, y, delay, c.land);
        if (c.land) lands.push(cell);
        frag.appendChild(cell);
      }
    }
    el.appendChild(frag);
    el.style.height = Math.ceil(maxY - minY) + 'px';
    el.style.minWidth = Math.ceil(maxX - minX) + 'px';
    return lands;
  }

  function rebuild() {
    A.landables.length = 0;
    combs.forEach((el, i) => {
      el.querySelectorAll('.cell--gen').forEach(c => c.remove());
      const rnd = mulberry32(0xBEE5 + i * 977);
      const mode = el.dataset.mode || 'axial';
      let lands = [];
      if (mode === 'field') lands = buildField(el, rnd);
      else if (mode === 'wrap') lands = buildWrap(el, rnd);
      else lands = buildAxial(el, rnd);
      A.landables.push(...lands);
    });
  }

  rebuild();

  // build choreography: comb assembles when its section arrives
  if (RM) {
    combs.forEach(el => el.classList.add('comb--built'));
  } else {
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add('comb--built');
          io.unobserve(en.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    combs.forEach(el => io.observe(el));
  }

  let rt = 0;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(rebuild, 180);
  });
})();
