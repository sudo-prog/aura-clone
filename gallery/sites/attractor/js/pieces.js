// The permanent collection. Six algorithms, one contract:
//   ALGORITHMS[name](ctx, w, h, rng, opts) -> { step(now):bool done, finish(), alive? }
// step() paints one increment and returns true when the work is complete.
// `alive: true` marks a work that never completes (the featured acquisition).
// All randomness flows through rng — one seed, one state of the work.

const TAU = Math.PI * 2;

function mix(a, b, t){
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
function smoothstep(e0, e1, x){
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/* ---------- seeded value noise (for Meltwater) ---------- */

function makeNoise(rng){
  const P = new Uint8Array(512);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--){
    const j = (rng() * (i + 1)) | 0;
    const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
  }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) vals[i] = rng() * 2 - 1;
  const sm = t => t * t * (3 - 2 * t);

  function n2(x, y){
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const aa = vals[P[P[X] + Y]],     ba = vals[P[P[X + 1] + Y]];
    const ab = vals[P[P[X] + Y + 1]], bb = vals[P[P[X + 1] + Y + 1]];
    const u = sm(xf), v = sm(yf);
    const top = aa + (ba - aa) * u;
    const bot = ab + (bb - ab) * u;
    return top + (bot - top) * v;
  }
  function fbm(x, y){
    return n2(x, y) * 0.62 + n2(x * 2.03, y * 2.03) * 0.26 + n2(x * 4.01, y * 4.01) * 0.12;
  }
  return { n2, fbm };
}

/* ---------- 1 · MELTWATER — flow-field ink rivers ---------- */

function meltwater(ctx, w, h, rng){
  const noise = makeNoise(rng);
  const k = 2.55 / Math.min(w, h);
  const bias = rng() * 0.7 - 0.35;              // the valley's general fall line
  const N = Math.round(Math.min(1700, Math.max(380, (w * h) / 430)));
  const indigo = [35, 64, 127], glacial = [124, 150, 203], inkDark = [15, 19, 36];

  const parts = [];
  for (let i = 0; i < N; i++){
    const roll = rng();
    const col = roll < 0.11 ? inkDark : mix(indigo, glacial, rng());
    parts.push({
      x: rng() * w, y: rng() * h,
      life: 220 + rng() * 380,
      lw: 0.35 + Math.pow(rng(), 2.4) * 2.6,
      a: 0.05 + rng() * 0.11,
      col, dead: false,
    });
  }

  const stepLen = 1.55, sub = 6;
  let frames = 0;
  const maxFrames = 110;

  function advect(p){
    const ang = noise.fbm(p.x * k, p.y * k) * TAU * 0.86 + bias;
    p.x += Math.cos(ang) * stepLen;
    p.y += Math.sin(ang) * stepLen + 0.045;      // faint gravity: rivers run down
    if (p.x < -4 || p.x > w + 4 || p.y < -4 || p.y > h + 4 || --p.life < 0) p.dead = true;
  }

  function step(){
    frames++;
    let aliveCt = 0;
    ctx.lineCap = 'round';
    for (const p of parts){
      if (p.dead) continue;
      aliveCt++;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      for (let s = 0; s < sub && !p.dead; s++){ advect(p); ctx.lineTo(p.x, p.y); }
      ctx.strokeStyle = `rgba(${p.col[0]},${p.col[1]},${p.col[2]},${p.a})`;
      ctx.lineWidth = p.lw;
      ctx.stroke();
    }
    return frames >= maxFrames || aliveCt === 0;
  }
  function finish(){ let g = 0; while (!step() && g++ < 600); }
  return { step, finish };
}

/* ---------- 2 · A BODY OF SMOKE — de Jong attractor (featured, alive) ---------- */

function dejong(ctx, w, h, rng){
  const rand = (lo, hi) => lo + rng() * (hi - lo);
  const sign = () => (rng() < 0.5 ? -1 : 1);
  const amp = [0.12, 0.09, 0.11, 0.08];
  const om  = [0.059, 0.083, 0.047, 0.071];

  // Occupancy of the attractor on a 32x32 grid — structure metric.
  function occupancy(A, B, C, D){
    const grid = new Uint8Array(1024);
    let x = 0.1, y = 0.1, cells = 0;
    for (let i = 0; i < 4200; i++){
      const nx = Math.sin(A * y) - Math.cos(B * x);
      const ny = Math.sin(C * x) - Math.cos(D * y);
      x = nx; y = ny;
      if (i > 200){
        const gx = ((x + 2.1) / 4.2 * 32) | 0, gy = ((y + 2.1) / 4.2 * 32) | 0;
        if (gx >= 0 && gx < 32 && gy >= 0 && gy < 32){
          const gi = gy * 32 + gx;
          if (!grid[gi]){ grid[gi] = 1; cells++; }
        }
      }
    }
    return cells;
  }

  // Draw parameter sets until one has structure: neither a collapsed knot
  // nor a uniform chaotic sea — and stays structured at the far corners of
  // its slow parameter orbit, so the live smoke never knots into a scar.
  let a0 = 1.4, b0 = -2.3, c0 = 2.4, d0 = -2.1;
  const corners = [[1,1,1,1], [-1,-1,-1,-1], [1,-1,1,-1], [-1,1,-1,1]];
  for (let tries = 0; tries < 48; tries++){
    const A = rand(1.1, 2.4) * sign(), B = rand(1.1, 2.4) * sign();
    const C = rand(0.7, 2.2) * sign(), D = rand(0.7, 2.2) * sign();
    const cells = occupancy(A, B, C, D);
    if (cells <= 220 || cells >= 840) continue;
    let solid = true;
    for (const [sa, sb, sc, sd] of corners){
      const cc = occupancy(A + sa * amp[0], B + sb * amp[1], C + sc * amp[2], D + sd * amp[3]);
      if (cc < 170 || cc > 900){ solid = false; break; }
    }
    if (solid){ a0 = A; b0 = B; c0 = C; d0 = D; break; }
  }

  const ph = [rng() * TAU, rng() * TAU, rng() * TAU, rng() * TAU];

  const cx = w / 2, cy = h / 2, s = Math.min(w, h) / 4.3;
  const plum = 'rgba(42,27,51,0.07)';
  const violet = 'rgba(105,76,148,0.06)';
  const warmPlum = 'rgba(42,27,51,0.095)';
  const warmViolet = 'rgba(105,76,148,0.08)';
  let x = 0.12, y = 0.31;
  let t0 = null;
  let warmed = false;

  // Deposit rates scale with wall area so the smoke reads equally dense
  // on a phone plate and on the hero wall.
  const area = w * h;
  const nPlumLive = Math.round(Math.min(30000, Math.max(6000, area / 40)));
  const nVioletLive = Math.round(nPlumLive * 0.4);

  function deposit(nPlum, nViolet, A, B, C, D, sP, sV){
    ctx.fillStyle = sP || plum;
    for (let i = 0; i < nPlum; i++){
      const nx = Math.sin(A * y) - Math.cos(B * x);
      const ny = Math.sin(C * x) - Math.cos(D * y);
      x = nx; y = ny;
      ctx.fillRect(cx + x * s, cy + y * s, 1, 1);
    }
    ctx.fillStyle = sV || violet;
    for (let i = 0; i < nViolet; i++){
      const nx = Math.sin(A * y) - Math.cos(B * x);
      const ny = Math.sin(C * x) - Math.cos(D * y);
      x = nx; y = ny;
      ctx.fillRect(cx + x * s, cy + y * s, 1, 1);
    }
  }

  // Cheap orbit probe from the current point: has this parameter state
  // collapsed toward a periodic knot? (Counts distinct 24x24 cells.)
  function probe(A, B, C, D){
    const grid = new Uint8Array(576);
    let px = x, py = y, cells = 0;
    for (let i = 0; i < 800; i++){
      const nx = Math.sin(A * py) - Math.cos(B * px);
      const ny = Math.sin(C * px) - Math.cos(D * py);
      px = nx; py = ny;
      const gx = ((px + 2.1) / 4.2 * 24) | 0, gy = ((py + 2.1) / 4.2 * 24) | 0;
      if (gx >= 0 && gx < 24 && gy >= 0 && gy < 24){
        const gi = gy * 24 + gx;
        if (!grid[gi]){ grid[gi] = 1; cells++; }
      }
    }
    return cells;
  }

  function step(now){
    if (t0 === null) t0 = now;
    if (!warmed){
      // The body must already be there when the visitor walks in.
      warmed = true;
      deposit(Math.round(nPlumLive * 9), Math.round(nVioletLive * 9),
              a0, b0, c0, d0, warmPlum, warmViolet);
      return false;
    }
    const t = (now - t0) / 1000;
    const A = a0 + amp[0] * Math.sin(t * om[0] + ph[0]);
    const B = b0 + amp[1] * Math.sin(t * om[1] + ph[1]);
    const C = c0 + amp[2] * Math.sin(t * om[2] + ph[2]);
    const D = d0 + amp[3] * Math.sin(t * om[3] + ph[3]);
    // Should the orbit knot up despite the screened parameters, back off:
    // fade harder, deposit a breath — the smoke thins instead of scarring.
    const knotted = probe(A, B, C, D) < 46;
    ctx.fillStyle = knotted ? 'rgba(255,255,255,0.085)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, 0, w, h);                     // the smoke thins…
    if (knotted) deposit(nPlumLive >> 3, nVioletLive >> 3, A, B, C, D,
                         'rgba(42,27,51,0.03)', 'rgba(105,76,148,0.025)');
    else deposit(nPlumLive, nVioletLive, A, B, C, D); // …and re-forms, elsewhere
    return false;                                 // never finished; never the same
  }

  function finish(){
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    deposit(140000, 50000, a0, b0, c0, d0, warmPlum, warmViolet);
  }

  return { step, finish, alive: true };
}

/* ---------- 3 · WOVEN ARGUMENT — multi-scale truchet weave ---------- */

function truchet(ctx, w, h, rng){
  const n = 9;
  const s0 = w / n;
  const tiles = [];

  function addTile(x, y, s, depth){
    if (depth < 2 && s > w / 40 && rng() < (depth === 0 ? 0.32 : 0.26)){
      const s2 = s / 2;
      addTile(x, y, s2, depth + 1);
      addTile(x + s2, y, s2, depth + 1);
      addTile(x, y + s2, s2, depth + 1);
      addTile(x + s2, y + s2, s2, depth + 1);
    } else {
      tiles.push({ x, y, s, v: rng() < 0.5 ? 0 : 1 });
    }
  }
  for (let gy = 0; gy < n; gy++)
    for (let gx = 0; gx < n; gx++)
      addTile(gx * s0, gy * s0, s0, 0);

  // Shuffled order IS the argument: who lies over whom is decided by the seed.
  for (let i = tiles.length - 1; i > 0; i--){
    const j = (rng() * (i + 1)) | 0;
    const t = tiles[i]; tiles[i] = tiles[j]; tiles[j] = t;
  }

  const oxblood = '#7A2B26', oxdark = '#5C201C';
  let i = 0;
  const perFrame = Math.max(2, Math.ceil(tiles.length / 68));

  function drawTile(t){
    const { x, y, s, v } = t;
    const r = s / 2;
    const lw = Math.max(2.2, s * 0.225);
    const casing = lw + Math.max(3, s * 0.19);
    const centers = v === 0
      ? [[x, y], [x + s, y + s]]
      : [[x + s, y], [x, y + s]];

    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 0.5, y - 0.5, s + 1, s + 1);
    ctx.clip();
    for (const [ax, ay] of centers){
      ctx.beginPath();
      ctx.arc(ax, ay, r, 0, TAU);
      ctx.lineWidth = casing;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ax, ay, r, 0, TAU);
      ctx.lineWidth = lw;
      ctx.strokeStyle = s < s0 / 2.5 ? oxdark : oxblood;
      ctx.stroke();
    }
    ctx.restore();
  }

  function step(){
    for (let k = 0; k < perFrame && i < tiles.length; k++, i++) drawTile(tiles[i]);
    return i >= tiles.length;
  }
  function finish(){ while (i < tiles.length) drawTile(tiles[i++]); }
  return { step, finish };
}

/* ---------- 4 · SETTLEMENT — voronoi relaxation bloom ---------- */

function voronoi(ctx, w, h, rng){
  const N = 120;
  const m = Math.max(10, w * 0.05);
  const pts = new Float64Array(N * 2);
  for (let i = 0; i < N; i++){
    pts[i * 2] = m + rng() * (w - 2 * m);
    pts[i * 2 + 1] = m + rng() * (h - 2 * m);
  }
  const kinds = [];
  for (let i = 0; i < N; i++){
    const r = rng();
    kinds.push(r < 0.13 ? 2 : r < 0.3 ? 1 : 0);
  }

  let iter = 0;
  const maxIter = 150;

  function step(){
    iter++;
    const D = window.d3;
    if (!D || !D.Delaunay) return true;          // no geometry library, no argument
    const del = new D.Delaunay(pts);
    const vor = del.voronoi([m * 0.4, m * 0.4, w - m * 0.4, h - m * 0.4]);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    let maxMove = 0;
    for (let i = 0; i < N; i++){
      const poly = vor.cellPolygon(i);
      if (!poly) continue;
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let j = 1; j < poly.length; j++) ctx.lineTo(poly[j][0], poly[j][1]);
      ctx.closePath();
      if (kinds[i] === 2){ ctx.fillStyle = 'rgba(46,107,79,0.17)'; ctx.fill(); }
      else if (kinds[i] === 1){ ctx.fillStyle = 'rgba(205,222,209,0.7)'; ctx.fill(); }
      ctx.strokeStyle = 'rgba(46,107,79,0.85)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // centroid — where this cell would rather be
      let A = 0, gx = 0, gy = 0;
      for (let j = 0; j < poly.length - 1; j++){
        const x1 = poly[j][0], y1 = poly[j][1];
        const x2 = poly[j + 1][0], y2 = poly[j + 1][1];
        const cr = x1 * y2 - x2 * y1;
        A += cr; gx += (x1 + x2) * cr; gy += (y1 + y2) * cr;
      }
      A *= 0.5;
      if (Math.abs(A) < 1e-6) continue;
      gx /= 6 * A; gy /= 6 * A;

      ctx.beginPath();
      ctx.arc(pts[i * 2], pts[i * 2 + 1], 1.5, 0, TAU);
      ctx.fillStyle = '#2E6B4F';
      ctx.fill();

      const dx = (gx - pts[i * 2]) * 0.18;
      const dy = (gy - pts[i * 2 + 1]) * 0.18;
      pts[i * 2] += dx; pts[i * 2 + 1] += dy;
      const mv = Math.abs(dx) + Math.abs(dy);
      if (mv > maxMove) maxMove = mv;
    }
    return iter >= maxIter || maxMove < 0.055;   // every centroid agrees to stay
  }
  function finish(){ let g = 0; while (!step() && g++ < 220); }
  return { step, finish };
}

/* ---------- 5 · REEF LOGIC — diffusion-limited aggregation ---------- */

function dla(ctx, w, h, rng){
  const gw = Math.min(660, Math.round(w));
  const gh = Math.round(gw * h / w);
  const g = w / gw;
  const px = Math.max(1.2, g * 1.3);
  const occ = new Uint8Array(gw * gh);

  const baseY = gh - 3;
  const seedCells = [];
  for (let x = 0; x < gw; x++){ occ[baseY * gw + x] = 1; seedCells.push([x, baseY]); }
  const mounds = 3 + ((rng() * 4) | 0);
  for (let mnd = 0; mnd < mounds; mnd++){
    const mx = (rng() * gw) | 0;
    const mh2 = 3 + ((rng() * 11) | 0);
    for (let yy = 0; yy < mh2; yy++){
      occ[(baseY - yy) * gw + mx] = 1;
      seedCells.push([mx, baseY - yy]);
    }
  }

  let minTop = baseY;
  for (const [, sy] of seedCells) if (sy < minTop) minTop = sy;

  const target = Math.round(gw * gh * 0.095);
  const capTop = Math.max(8, gh * 0.09);
  let placed = 0;

  const cDark = [86, 32, 20], cMid = [178, 84, 52], cLight = [226, 152, 118];
  function colorFor(t){
    const e = Math.pow(t, 0.85);
    return e < 0.5 ? mix(cDark, cMid, e * 2) : mix(cMid, cLight, (e - 0.5) * 2);
  }

  // substrate — the reef's dark bedrock
  ctx.fillStyle = `rgb(${cDark[0]},${cDark[1]},${cDark[2]})`;
  for (const [sx, sy] of seedCells) ctx.fillRect(sx * g, sy * g, px, px);

  const quota = Math.max(60, (target / 150) | 0);

  function step(){
    let stuck = 0, guard = 0;
    while (stuck < quota && guard < 300000 && placed < target && minTop > capTop){
      guard++;
      let x = (rng() * gw) | 0;
      // Spawn mostly at the tip line, sometimes deep in the column, so the
      // whole reef competes — not just the tallest spire.
      let y = Math.max(2, (minTop - 10 + rng() * rng() * (baseY - minTop) * 0.45) | 0);
      let steps = 0;
      while (steps++ < 2400){
        const r = rng();
        x += r < 0.33 ? -1 : r < 0.66 ? 1 : 0;
        const r2 = rng();
        y += r2 < 0.36 ? 1 : r2 < 0.70 ? -1 : 0;  // near-neutral walk: tips screen, dendrites rise
        if (x < 0) x = gw - 1; else if (x >= gw) x = 0;
        if (y < minTop - 40) break;               // drifted out to open water
        if (y >= gh - 1) y = gh - 2;
        if (y < 1) y = 1;
        const idx = y * gw + x;
        if (occ[idx]) continue;
        const nb =
          occ[idx - gw] || occ[idx + gw] ||
          (x > 0 ? occ[idx - 1] : 0) || (x < gw - 1 ? occ[idx + 1] : 0);
        if (nb){
          occ[idx] = 1; placed++; stuck++;
          if (y < minTop) minTop = y;
          const c = colorFor(placed / target);
          ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
          ctx.fillRect(x * g, y * g, px, px);
          break;
        }
      }
    }
    return placed >= target || minTop <= capTop;
  }
  function finish(){ let gd = 0; while (!step() && gd++ < 800); }
  return { step, finish };
}

/* ---------- 6 · TWO LIGHTHOUSES — wave-interference moiré ---------- */

function interference(ctx, w, h, rng, opts){
  const dpr = (opts && opts.dpr) || 1;
  const W = Math.round(w * dpr), H = Math.round(h * dpr);

  // Wavelength scales with the wall: coarse enough to read as bands,
  // never so fine it collapses into texture.
  const diag = Math.sqrt(w * w + h * h);
  const lam = diag * (0.024 + rng() * 0.013);
  const s1 = { x: w * (0.20 + rng() * 0.12), y: h * (0.28 + rng() * 0.44), l: lam,  amp: 1, ph: rng() * TAU };
  const s2 = { x: w * (0.66 + rng() * 0.13), y: h * (0.28 + rng() * 0.44), l: lam * (1.06 + rng() * 0.09), amp: 1, ph: rng() * TAU };
  const s3 = { x: w * (0.3 + rng() * 0.4),  y: rng() < 0.5 ? -h * 0.3 : h * 1.3, l: lam * (0.8 + rng() * 0.5), amp: 0.34, ph: rng() * TAU };
  const srcs = [s1, s2, s3];
  const wsum = s1.amp + s2.amp + s3.amp;

  const paper = [255, 255, 255], inkD = [16, 74, 82], inkL = [168, 198, 201];

  let row = 0;
  const chunk = Math.max(8, Math.round(H / 52));

  function step(){
    const rows = Math.min(chunk, H - row);
    if (rows <= 0) return true;
    const id = ctx.createImageData(W, rows);
    const data = id.data;
    let di = 0;
    for (let yy = 0; yy < rows; yy++){
      const py = (row + yy) / dpr;
      for (let xx = 0; xx < W; xx++){
        const pxx = xx / dpr;
        let v = 0;
        for (let si = 0; si < 3; si++){
          const s = srcs[si];
          const dx = pxx - s.x, dy = py - s.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          v += s.amp * Math.sin(d / s.l * TAU + s.ph);
        }
        const vn = v / wsum;                       // -1 .. 1
        const band = (vn + 1) * 2.3;
        const fr = band - Math.floor(band);
        const tt = Math.abs(fr - 0.5) * 2;         // 0 mid-band → 1 at band edge

        let r = paper[0], gg = paper[1], b = paper[2];
        const aL = smoothstep(0.6, 0.7, tt);
        if (aL > 0){
          r = r + (inkL[0] - r) * aL;
          gg = gg + (inkL[1] - gg) * aL;
          b = b + (inkL[2] - b) * aL;
        }
        const aD = smoothstep(0.78, 0.86, tt);
        if (aD > 0){
          r = r + (inkD[0] - r) * aD;
          gg = gg + (inkD[1] - gg) * aD;
          b = b + (inkD[2] - b) * aD;
        }
        data[di++] = r; data[di++] = gg; data[di++] = b; data[di++] = 255;
      }
    }
    ctx.putImageData(id, 0, row);
    row += rows;
    return row >= H;
  }
  function finish(){ let g = 0; while (!step() && g++ < 400); }
  return { step, finish };
}

export const ALGORITHMS = { meltwater, dejong, truchet, voronoi, dla, interference };
