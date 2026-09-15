// OCHRE — procedural paleolithic paintings.
// Every figure is stamped, sprayed and smudged the way pigment behaves on rock:
// no vector-perfect strokes anywhere.

import { mulberry32 } from './noise.js';

const TAU = Math.PI * 2;

const CHARCOAL = '#191009';
const CHARCOAL_SOFT = '#241610';
const HEMATITE = '#9c3d24';
const HEMATITE_DEEP = '#7e2f1a';
const GOETHITE = '#b3762c';
const MANGANESE = '#120d0a';

/* ---------------- stroke machinery ---------------- */

function chaikin(pts, n = 2) {
  for (; n > 0; n--) {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      out.push(
        [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25],
        [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]
      );
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

function resample(pts, step = 1.7) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const d = Math.hypot(bx - ax, by - ay);
    if (d < 1e-6) continue;
    let t = carry;
    while (t < d) {
      out.push([ax + (bx - ax) * (t / d), ay + (by - ay) * (t / d)]);
      t += step;
    }
    carry = t - d;
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// charcoal line: multi-pass stamped blobs with jitter, gaps and taper
export function charLine(ctx, rng, pts, o = {}) {
  const {
    width = 6, color = CHARCOAL, alpha = 0.4, jitter = 1.0,
    passes = 3, gap = 0.10, taper = true, smoothing = 2,
  } = o;
  const path = resample(chaikin(pts, smoothing), Math.max(1.2, width * 0.28));
  ctx.fillStyle = color;
  const n = path.length;
  for (let p = 0; p < passes; p++) {
    const wob = 0.72 + 0.45 * rng();
    for (let i = 0; i < n; i++) {
      if (rng() < gap) continue;
      const s = i / (n - 1);
      const tap = taper ? Math.min(1, 5 * Math.min(s, 1 - s) + 0.22) : 1;
      const r = width * 0.5 * (0.45 + 0.65 * rng()) * tap * wob;
      const ox = (rng() - 0.5) * jitter * width * 0.55;
      const oy = (rng() - 0.5) * jitter * width * 0.55;
      ctx.globalAlpha = alpha * (0.4 + 0.6 * rng());
      ctx.beginPath();
      ctx.arc(path[i][0] + ox, path[i][1] + oy, Math.max(0.4, r), 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// patchy pigment wash inside a polygon (pad-pressed ochre)
function wash(ctx, rng, poly, o = {}) {
  const { color = HEMATITE, alpha = 0.085, blobs = 260, r0 = 7, r1 = 22 } = o;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  const sm = chaikin(poly.concat([poly[0]]), 2);
  for (const [x, y] of sm) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.clip();
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const [x, y] of poly) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  ctx.fillStyle = color;
  for (let i = 0; i < blobs; i++) {
    const x = minX + rng() * (maxX - minX);
    const y = minY + rng() * (maxY - minY);
    if (rng() < 0.3) continue; // patchiness
    ctx.globalAlpha = alpha * (0.4 + 0.9 * rng());
    ctx.beginPath();
    ctx.arc(x, y, r0 + rng() * (r1 - r0), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// mouth-sprayed pigment cloud
function spray(ctx, rng, cx, cy, R, color, o = {}) {
  const { density = 1, alpha = 0.30, grain = 1.6 } = o;
  const N = Math.round(R * R * 0.40 * density);
  ctx.fillStyle = color;
  for (let i = 0; i < N; i++) {
    const d = R * Math.pow(rng(), 0.58);
    const a = rng() * TAU;
    const x = cx + Math.cos(a) * d + (rng() - 0.5) * 3;
    const y = cy + Math.sin(a) * d * 0.92 + (rng() - 0.5) * 3;
    const fall = Math.pow(1 - d / R, 1.12);
    ctx.globalAlpha = alpha * fall * (0.3 + 0.7 * rng());
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + rng() * grain * (rng() < 0.06 ? 2.2 : 1), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// solid pigment dot applied by pad — dense core, sprayed halo
function padDot(ctx, rng, cx, cy, r, color, alpha = 0.5) {
  spray(ctx, rng, cx, cy, r * 2.1, color, { density: 1.6, alpha: alpha * 0.5, grain: 1.2 });
  ctx.fillStyle = color;
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = alpha * (0.35 + 0.5 * rng());
    ctx.beginPath();
    ctx.arc(cx + (rng() - 0.5) * r * 0.9, cy + (rng() - 0.5) * r * 0.9, r * (0.35 + 0.4 * rng()), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ---------------- the negative hand stencil ---------------- */

function handMask(size, rot, folded, right, rng) {
  const S = Math.ceil(size * 3);
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.rotate(rot);
  if (right) g.scale(-1, 1);
  g.fillStyle = '#000';
  g.strokeStyle = '#000';
  g.lineCap = 'round';

  // palm
  g.beginPath();
  g.ellipse(0, size * 0.12, size * 0.30, size * 0.36, 0.06, 0, TAU);
  g.fill();
  // wrist / forearm hint
  g.beginPath();
  g.moveTo(-size * 0.20, size * 0.34);
  g.lineTo(-size * 0.16, size * 0.95);
  g.lineTo(size * 0.16, size * 0.95);
  g.lineTo(size * 0.20, size * 0.34);
  g.closePath();
  g.fill();

  // four fingers
  const angles = [-0.34, -0.12, 0.08, 0.30];
  const lens = [0.52, 0.66, 0.62, 0.47];
  const foldedLens = [0.52, 0.66, 0.30, 0.24]; // ring + little folded
  for (let i = 0; i < 4; i++) {
    const a = angles[i] + (rng() - 0.5) * 0.05 - Math.PI / 2;
    const L = size * (folded ? foldedLens[i] : lens[i]) * (0.95 + 0.1 * rng());
    const bx = Math.cos(angles[i] * 0.9) * size * 0.02 + (i - 1.5) * size * 0.145;
    const by = -size * 0.18;
    g.lineWidth = size * (0.125 - i * 0.004);
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(bx + Math.cos(a) * L, by + Math.sin(a) * L);
    g.stroke();
  }
  // thumb
  g.lineWidth = size * 0.135;
  g.beginPath();
  g.moveTo(-size * 0.26, size * 0.10);
  g.lineTo(-size * 0.52, -size * 0.16);
  g.stroke();
  return c;
}

function handStencil(ctx, rng, cx, cy, size, o = {}) {
  const { rot = 0, color = HEMATITE, folded = false, right = false, density = 1.35 } = o;
  spray(ctx, rng, cx, cy - size * 0.05, size * 1.14, color, { density, alpha: 0.5 });
  spray(ctx, rng, cx, cy - size * 0.05, size * 0.72, color, { density: density * 0.9, alpha: 0.44 });
  const mask = handMask(size, rot, folded, right, rng);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  // crisp core erase + two soft offsets for a breathed edge
  ctx.globalAlpha = 1;
  ctx.drawImage(mask, cx - mask.width / 2, cy - mask.height / 2);
  ctx.globalAlpha = 0.4;
  ctx.drawImage(mask, cx - mask.width / 2 - 1.5, cy - mask.height / 2 + 1);
  ctx.drawImage(mask, cx - mask.width / 2 + 1.5, cy - mask.height / 2 - 1);
  ctx.restore();
}

/* ---------------- taphonomy: 17,000 years of wall ---------------- */

function weather(ctx, rng, w, h, amount = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  const n = Math.round(160 * amount);
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.25 + rng() * 0.45;
    ctx.beginPath();
    ctx.arc(rng() * w, rng() * h, 0.5 + rng() * 2.4, 0, TAU);
    ctx.fill();
  }
  // a few larger spalls
  for (let i = 0; i < 5 * amount; i++) {
    ctx.globalAlpha = 0.10 + rng() * 0.16;
    ctx.beginPath();
    ctx.arc(rng() * w, rng() * h, 8 + rng() * 26, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/* ---------------- the seven works ---------------- */

function drawHandsMain(ctx, w, h, rng) {
  const hands = [
    { x: 0.19, y: 0.40, s: 0.235, rot: -0.22, color: HEMATITE, right: false },
    { x: 0.42, y: 0.28, s: 0.255, rot: 0.10, color: HEMATITE_DEEP, right: false },
    { x: 0.63, y: 0.50, s: 0.225, rot: 0.30, color: GOETHITE, right: true },
    { x: 0.83, y: 0.33, s: 0.245, rot: -0.08, color: HEMATITE, folded: true, right: false },
    { x: 0.37, y: 0.68, s: 0.215, rot: -0.38, color: HEMATITE, right: false },
  ];
  for (const H of hands) {
    handStencil(ctx, rng, H.x * w, H.y * h, H.s * h, {
      rot: H.rot, color: H.color, folded: !!H.folded, right: !!H.right,
    });
  }
  // paired red dots between hands
  padDot(ctx, rng, 0.55 * w, 0.78 * h, h * 0.022, HEMATITE, 0.5);
  padDot(ctx, rng, 0.61 * w, 0.79 * h, h * 0.021, HEMATITE, 0.5);
  weather(ctx, rng, w, h, 1.2);
}

function drawChildHand(ctx, w, h, rng) {
  handStencil(ctx, rng, 0.5 * w, 0.52 * h, h * 0.36, {
    rot: 0.16, color: GOETHITE, right: false, density: 1.6,
  });
  weather(ctx, rng, w, h, 0.8);
}

function drawAurochs(ctx, w, h, rng) {
  // normalized in a 1 × 0.62 box mapped onto w × h
  const M = pts => pts.map(([x, y]) => [x * w, (y / 0.62) * h]);

  // ochre body wash first — outline rides over it
  wash(ctx, rng, M([
    [0.24, 0.27], [0.33, 0.13], [0.48, 0.15], [0.62, 0.17], [0.73, 0.14],
    [0.80, 0.20], [0.78, 0.38], [0.67, 0.50], [0.52, 0.51], [0.37, 0.49], [0.27, 0.43],
  ]), { color: HEMATITE, alpha: 0.10, blobs: 420, r0: 9, r1: 30 });

  const line = (pts, o) => charLine(ctx, rng, M(pts), o);
  const W = w / 105; // stroke scale

  // faint preliminary engraving (survey note: ten sketch lines)
  line([[0.19, 0.22], [0.30, 0.115], [0.44, 0.135]], { width: W * 0.5, color: '#8d7c66', alpha: 0.10, passes: 1, gap: 0.3 });
  line([[0.47, 0.15], [0.61, 0.165], [0.72, 0.14]], { width: W * 0.5, color: '#8d7c66', alpha: 0.09, passes: 1, gap: 0.3 });

  // dorsal line — one confident campaign
  line([[0.175, 0.235], [0.24, 0.155], [0.34, 0.09], [0.47, 0.12], [0.60, 0.14], [0.73, 0.115], [0.815, 0.15]],
    { width: W * 1.5, alpha: 0.52, passes: 4 });
  // tail
  line([[0.815, 0.15], [0.855, 0.24], [0.868, 0.35], [0.878, 0.43]], { width: W * 0.8, passes: 3 });
  line([[0.872, 0.42], [0.884, 0.47], [0.868, 0.50]], { width: W * 1.1, alpha: 0.5, passes: 3 }); // tuft
  // forehead + muzzle
  line([[0.075, 0.34], [0.088, 0.285], [0.13, 0.245], [0.175, 0.235]], { width: W * 1.05, passes: 3 });
  // jaw, throat, chest
  line([[0.078, 0.35], [0.115, 0.375], [0.16, 0.39], [0.20, 0.43], [0.238, 0.50]], { width: W * 1.0, passes: 3 });
  // belly (broken line, the wall ate it)
  line([[0.29, 0.53], [0.40, 0.555], [0.53, 0.545]], { width: W * 0.9, gap: 0.22 });
  line([[0.575, 0.55], [0.655, 0.55]], { width: W * 0.9, gap: 0.25 });
  // legs — bent at the knee, striding
  line([[0.242, 0.505], [0.228, 0.575], [0.198, 0.635], [0.168, 0.715], [0.155, 0.785]], { width: W * 0.95 });
  line([[0.298, 0.535], [0.292, 0.615], [0.276, 0.685], [0.269, 0.75]], { width: W * 0.85 });
  line([[0.655, 0.55], [0.678, 0.62], [0.702, 0.66], [0.728, 0.76]], { width: W * 0.95 });
  line([[0.755, 0.47], [0.785, 0.575], [0.798, 0.645], [0.818, 0.725]], { width: W * 0.85 });
  // twisted-perspective horns, both sweeping long and forward — the animal's signature
  line([[0.152, 0.235], [0.128, 0.175], [0.092, 0.110], [0.055, 0.062], [0.034, 0.044]], { width: W * 1.0, alpha: 0.6, passes: 4 });
  line([[0.187, 0.225], [0.162, 0.155], [0.132, 0.088], [0.104, 0.040], [0.086, 0.026]], { width: W * 0.9, alpha: 0.58, passes: 4 });
  // ear
  line([[0.196, 0.215], [0.226, 0.186]], { width: W * 0.6 });
  // eye — a single deliberate dot
  ctx.fillStyle = CHARCOAL;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.arc(0.152 * w, (0.272 / 0.62) * h, W * 0.62, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  // muzzle smudge
  wash(ctx, rng, M([[0.07, 0.30], [0.13, 0.27], [0.15, 0.33], [0.10, 0.37]]),
    { color: CHARCOAL_SOFT, alpha: 0.05, blobs: 60, r0: 3, r1: 9 });

  weather(ctx, rng, w, h, 1.5);
}

function drawDots(ctx, w, h, rng) {
  for (let i = 0; i < 6; i++) {
    const x = w * (0.09 + i * 0.163) + (rng() - 0.5) * 6;
    const y = h * 0.5 + Math.sin(i * 1.7) * h * 0.13 + (rng() - 0.5) * 5;
    padDot(ctx, rng, x, y, h * 0.115, i === 4 ? HEMATITE_DEEP : HEMATITE, 0.55);
  }
  weather(ctx, rng, w, h, 0.5);
}

function drawHorse(ctx, rng, w, h, flip) {
  ctx.save();
  if (flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  const M = pts => pts.map(([x, y]) => [x * w, y * h]);
  const line = (pts, o) => charLine(ctx, rng, M(pts), o);
  const W = w / 78;

  // faint goethite body tone under the dapples
  wash(ctx, rng, M([
    [0.17, 0.34], [0.28, 0.245], [0.42, 0.225], [0.56, 0.26], [0.70, 0.26],
    [0.755, 0.34], [0.70, 0.50], [0.56, 0.635], [0.40, 0.655], [0.28, 0.585], [0.215, 0.47],
  ]), { color: GOETHITE, alpha: 0.06, blobs: 240, r0: 6, r1: 20 });

  // crest + back + rump (Pech-Merle proportions: tiny head, heavy body)
  line([[0.155, 0.415], [0.175, 0.335], [0.23, 0.245], [0.33, 0.19], [0.45, 0.185], [0.565, 0.225], [0.685, 0.21], [0.775, 0.25]],
    { width: W * 1.5, alpha: 0.48, passes: 4 });
  // tail
  line([[0.775, 0.25], [0.83, 0.345], [0.85, 0.50]], { width: W * 0.9 });
  // tiny head
  line([[0.10, 0.435], [0.115, 0.395], [0.155, 0.415]], { width: W * 0.95 });
  // jaw, throat, chest
  line([[0.105, 0.455], [0.15, 0.475], [0.20, 0.525], [0.26, 0.60]], { width: W * 0.95 });
  // belly
  line([[0.325, 0.665], [0.43, 0.70], [0.545, 0.685], [0.635, 0.645]], { width: W * 0.95, gap: 0.18 });
  // legs — tapering, deliberately unfinished
  line([[0.305, 0.635], [0.315, 0.76], [0.322, 0.86]], { width: W * 0.8, taper: true });
  line([[0.375, 0.675], [0.385, 0.80]], { width: W * 0.7 });
  line([[0.635, 0.645], [0.675, 0.775], [0.695, 0.875]], { width: W * 0.8 });
  line([[0.715, 0.615], [0.755, 0.75]], { width: W * 0.7 });
  // mane band — dark brushy crest
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const x = 0.175 + t * 0.30, y = 0.325 - Math.sin(t * Math.PI) * 0.105;
    line([[x, y], [x + 0.022, y + 0.075]], { width: W * 0.8, alpha: 0.32, passes: 1, smoothing: 0 });
  }
  // dark muzzle
  wash(ctx, rng, M([[0.085, 0.40], [0.135, 0.385], [0.15, 0.45], [0.10, 0.47]]),
    { color: MANGANESE, alpha: 0.14, blobs: 60, r0: 2, r1: 6 });
  ctx.restore();
}

function drawHorses(ctx, w, h, rng) {
  // two horses rump to rump; each in its own half, overlapping slightly
  ctx.save();
  ctx.translate(0, 0);
  drawHorse(ctx, rng, w * 0.62, h, false);
  ctx.restore();
  ctx.save();
  ctx.translate(w * 0.38, 0);
  drawHorse(ctx, rng, w * 0.62, h * 0.97, true);
  ctx.restore();

  // manganese dapples — on the bodies and spilling past them
  const clusters = [
    [0.30, 0.42, 0.14], [0.44, 0.38, 0.12], [0.58, 0.45, 0.13],
    [0.70, 0.40, 0.12], [0.50, 0.62, 0.10],
  ];
  for (let i = 0; i < 64; i++) {
    const c = clusters[Math.floor(rng() * clusters.length)];
    const off = rng() < 0.16 ? 2.6 : 1; // some dots escape the outline
    const x = (c[0] + (rng() - 0.5) * c[2] * 2 * off) * w;
    const y = (c[1] + (rng() - 0.5) * c[2] * 2.4 * off) * h;
    padDot(ctx, rng, x, y, (2.6 + rng() * 4.2) * (w / 760), MANGANESE, 0.6);
  }
  // two red dots, the valley's signature
  padDot(ctx, rng, 0.155 * w, 0.80 * h, w * 0.012, HEMATITE, 0.55);
  padDot(ctx, rng, 0.195 * w, 0.815 * h, w * 0.011, HEMATITE, 0.55);
  weather(ctx, rng, w, h, 1.3);
}

function drawClaviform(ctx, w, h, rng) {
  const M = pts => pts.map(([x, y]) => [x * w, y * h]);
  const line = (pts, o) => charLine(ctx, rng, M(pts), o);
  line([[0.46, 0.12], [0.50, 0.45], [0.47, 0.86]], { width: w / 26, color: HEMATITE, alpha: 0.5, passes: 4 });
  line([[0.49, 0.22], [0.66, 0.30], [0.51, 0.40]], { width: w / 30, color: HEMATITE, alpha: 0.45, passes: 3 });
  padDot(ctx, rng, 0.24 * w, 0.72 * h, w * 0.045, HEMATITE, 0.5);
  padDot(ctx, rng, 0.24 * w, 0.55 * h, w * 0.042, HEMATITE, 0.5);
  weather(ctx, rng, w, h, 0.6);
}

function drawShaft(ctx, w, h, rng) {
  const M = pts => pts.map(([x, y]) => [x * w, y * h]);
  const line = (pts, o) => charLine(ctx, rng, M(pts), o);
  const W = w / 96;

  // ---- wounded bison, head wrenched round ----
  line([[0.44, 0.32], [0.52, 0.235], [0.63, 0.215], [0.73, 0.25], [0.795, 0.29]], { width: W * 1.2, alpha: 0.46, passes: 3 });
  line([[0.44, 0.32], [0.418, 0.40], [0.432, 0.475]], { width: W * 1.0 }); // dropped head
  line([[0.455, 0.315], [0.432, 0.26], [0.452, 0.215]], { width: W * 0.7 }); // horn
  line([[0.475, 0.315], [0.458, 0.25], [0.478, 0.208]], { width: W * 0.65 }); // horn 2
  line([[0.475, 0.50], [0.565, 0.535], [0.665, 0.52], [0.735, 0.50]], { width: W * 0.95, gap: 0.2 }); // belly
  line([[0.50, 0.52], [0.492, 0.645]], { width: W * 0.8 });
  line([[0.545, 0.535], [0.545, 0.66]], { width: W * 0.75 });
  line([[0.685, 0.525], [0.70, 0.655]], { width: W * 0.8 });
  line([[0.735, 0.50], [0.762, 0.62]], { width: W * 0.75 });
  line([[0.795, 0.29], [0.838, 0.22], [0.822, 0.155]], { width: W * 0.7 }); // tail thrown up
  // entrails looping out
  for (const [ex, ey, er] of [[0.575, 0.60, 0.032], [0.60, 0.635, 0.028], [0.555, 0.645, 0.026]]) {
    const ring = [];
    for (let a = 0; a <= TAU + 0.3; a += 0.5) ring.push([ex + Math.cos(a) * er, ey + Math.sin(a) * er * 1.15]);
    line(ring, { width: W * 0.55, alpha: 0.4, passes: 2 });
  }
  // the spear
  line([[0.50, 0.66], [0.735, 0.30]], { width: W * 0.5, alpha: 0.5, passes: 2, smoothing: 0 });
  line([[0.665, 0.40], [0.705, 0.415]], { width: W * 0.45, passes: 2, smoothing: 0 }); // barb

  // ---- the bird-headed man, tipping backwards ----
  line([[0.315, 0.575], [0.245, 0.44]], { width: W * 0.7, alpha: 0.5, passes: 3, smoothing: 0 }); // torso
  ctx.globalAlpha = 0.55; ctx.fillStyle = CHARCOAL;
  ctx.beginPath(); ctx.arc(0.235 * w, 0.415 * h, W * 1.3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; // head
  line([[0.228, 0.412], [0.196, 0.398]], { width: W * 0.5, passes: 2, smoothing: 0 }); // beak
  line([[0.262, 0.475], [0.198, 0.51]], { width: W * 0.55, passes: 2, smoothing: 0 }); // arm 1
  line([[0.262, 0.475], [0.33, 0.435]], { width: W * 0.55, passes: 2, smoothing: 0 }); // arm 2
  for (const dx of [-0.012, 0, 0.012]) { // four-finger hands, three visible
    line([[0.198 + dx, 0.51], [0.19 + dx * 1.4, 0.535]], { width: W * 0.35, passes: 1, smoothing: 0 });
    line([[0.33 + dx, 0.435], [0.343 + dx * 1.4, 0.415]], { width: W * 0.35, passes: 1, smoothing: 0 });
  }
  line([[0.315, 0.575], [0.362, 0.635]], { width: W * 0.6, passes: 2, smoothing: 0 }); // leg
  line([[0.315, 0.575], [0.328, 0.665]], { width: W * 0.6, passes: 2, smoothing: 0 }); // leg

  // ---- cave-bear griffades above the drop, older than everything ----
  for (let i = 0; i < 4; i++) {
    const bx = 0.845 + i * 0.026;
    line([[bx, 0.62], [bx - 0.014, 0.71], [bx - 0.02, 0.80]],
      { width: W * 0.5, color: '#a6947a', alpha: 0.22, passes: 2, gap: 0.18 });
  }

  // ---- the bird on its staff, watching ----
  line([[0.128, 0.72], [0.128, 0.585]], { width: W * 0.45, passes: 2, smoothing: 0 });
  const bird = [];
  for (let a = 0; a <= TAU + 0.3; a += 0.45) bird.push([0.128 + Math.cos(a) * 0.021, 0.565 + Math.sin(a) * 0.014]);
  line(bird, { width: W * 0.5, alpha: 0.5, passes: 2 });
  line([[0.148, 0.562], [0.168, 0.556]], { width: W * 0.4, passes: 2, smoothing: 0 }); // beak

  weather(ctx, rng, w, h, 1.1);
}

/* ---------------- catalogue ---------------- */

export const PAINTINGS = [
  { id: 'p01a', cat: 'VAY-P01·a', title: 'Panel of the Hands', m: '87 m', zone: 'hands', u: 0.50, v: 0.40, w: 660, h: 440, seed: 5417, draw: drawHandsMain },
  { id: 'p01b', cat: 'VAY-P01·b', title: 'The Child’s Hand', m: '89 m', zone: 'hands', u: 0.78, v: 0.74, w: 230, h: 215, seed: 902, draw: drawChildHand },
  { id: 'p02a', cat: 'VAY-P02·a', title: 'The Great Aurochs', m: '141 m', zone: 'aurochs', u: 0.50, v: 0.42, w: 880, h: 545, seed: 1954, draw: drawAurochs },
  { id: 'p02b', cat: 'VAY-P02·b', title: 'The Six Red Dots', m: '146 m', zone: 'aurochs', u: 0.20, v: 0.76, w: 310, h: 100, seed: 313, draw: drawDots },
  { id: 'p03a', cat: 'VAY-P03·a', title: 'The Dappled Horses', m: '203 m', zone: 'horses', u: 0.50, v: 0.42, w: 780, h: 470, seed: 2011, draw: drawHorses },
  { id: 'p03b', cat: 'VAY-P03·b', title: 'Claviform & Paired Dots', m: '207 m', zone: 'horses', u: 0.81, v: 0.76, w: 240, h: 215, seed: 77, draw: drawClaviform },
  { id: 'p04', cat: 'VAY-P04', title: 'The Shaft Scene', m: '260 m', zone: 'shaft', u: 0.50, v: 0.46, w: 640, h: 440, seed: 1979, draw: drawShaft },
];

// render a painting to its own offscreen canvas at quality q (device px per css px)
export function renderPainting(spec, wCss, hCss, q) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(wCss * q));
  c.height = Math.max(2, Math.round(hCss * q));
  const g = c.getContext('2d');
  g.scale(q, q);
  spec.draw(g, wCss, hCss, mulberry32(spec.seed));
  return c;
}
