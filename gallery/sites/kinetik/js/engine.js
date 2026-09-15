/* ============================================================
   KINETIK — articulated-pendulum physics engine.
   A mobile is a tree of 1-DOF joints:
     link  — a string: point pivot, subtree mass at its end
     rod   — a rigid beam hung from a ring RING_H above the
             beam line; pivot solved so moments agree
     leaf  — a sheet-metal shape swinging on its hang hole
   Every joint integrates torque -> angular acceleration ->
   angular momentum (semi-implicit Euler, 120 Hz substeps).
   Generalized force:  Q = F · ∂p/∂θ   (no cross-product sign
   headaches; y is down, gravity is +y).
   ============================================================ */

export const PAL = {
  gallery: '#FAFAF8',
  iron:    '#141419',
  red:     '#D93A20',
  cobalt:  '#2946C8',
  sun:     '#F5B325',
  slate:   '#5C616B',
};

const TAU = Math.PI * 2;
export const G = 1400;        // gravity, design px / s²
const DENS = 0.0045;          // leaf mass per design px² of sheet
const ROD_DENS = 0.045;       // rod mass per design px of wire
const RING_H = 14;            // hang-loop height above beam line
export const K_WIND = 0.006;  // aero force coefficient
const DT = 1 / 120;           // physics substep

/* ---------- shape library (hole at origin, body below) ---------- */

export const SHAPES = {
  disc: {
    area: s => Math.PI * s * s,
    dcom: s => 1.06 * s, rg: s => 0.72 * s,
    hw: s => 1.05 * s, hb: s => 2.15 * s,
    path(c, s) { c.arc(0, 1.06 * s, s, 0, TAU); },
  },
  ring: {
    area: s => Math.PI * s * s * 0.62,
    dcom: s => 1.06 * s, rg: s => 0.86 * s,
    hw: s => 1.05 * s, hb: s => 2.15 * s,
    path(c, s) {
      c.arc(0, 1.06 * s, s, 0, TAU);
      c.moveTo(0.6 * s, 1.06 * s);
      c.arc(0, 1.06 * s, 0.6 * s, 0, TAU, true);
    },
    fillRule: 'evenodd',
  },
  blade: { // horizontal lens
    area: s => 3.6 * s * s,
    dcom: s => 0.72 * s, rg: s => 1.32 * s,
    hw: s => 2.65 * s, hb: s => 1.35 * s,
    path(c, s) {
      c.moveTo(-2.6 * s, 0.66 * s);
      c.quadraticCurveTo(0, -0.12 * s, 2.6 * s, 0.66 * s);
      c.quadraticCurveTo(0, 1.44 * s, -2.6 * s, 0.66 * s);
    },
  },
  petal: { // teardrop
    area: s => 1.15 * s * s,
    dcom: s => 1.22 * s, rg: s => 0.8 * s,
    hw: s => 0.78 * s, hb: s => 2.2 * s,
    path(c, s) {
      c.moveTo(0, 0.05 * s);
      c.bezierCurveTo(0.66 * s, 0.5 * s, 0.74 * s, 1.5 * s, 0, 2.12 * s);
      c.bezierCurveTo(-0.74 * s, 1.5 * s, -0.66 * s, 0.5 * s, 0, 0.05 * s);
    },
  },
  fin: { // swept pennant / seed
    area: s => 1.6 * s * s,
    dcom: s => 0.9 * s, rg: s => 1.18 * s,
    hw: s => 2.5 * s, hb: s => 1.65 * s,
    path(c, s) {
      c.moveTo(0, 0.05 * s);
      c.bezierCurveTo(1.1 * s, 0.12 * s, 2.1 * s, 0.5 * s, 2.45 * s, 1.28 * s);
      c.bezierCurveTo(1.6 * s, 1.06 * s, 0.6 * s, 1.18 * s, 0.1 * s, 1.55 * s);
      c.bezierCurveTo(-0.12 * s, 0.92 * s, -0.07 * s, 0.4 * s, 0, 0.05 * s);
    },
  },
};

/* ---------- spec builders ---------- */

export const leaf = (shape, s, color, opt = {}) => ({ kind: 'leaf', shape, s, color, ...opt });
export const hang = (len, child) => ({ kind: 'link', len, child });
export const rod  = (len, opt, left, right, mids = []) =>
  ({ kind: 'rod', len, pose: opt.pose || 0, left, right, mids });

/* ---------- build: solve every pivot so the moments agree ---------- */

export function buildTree(spec) {
  if (spec.kind === 'leaf') {
    const sh = SHAPES[spec.shape];
    const m = sh.area(spec.s) * DENS;
    const d = sh.dcom(spec.s), rg = sh.rg(spec.s);
    return {
      kind: 'leaf', sh, s: spec.s, color: spec.color,
      stroke: spec.stroke || null, rot: (spec.rot || 0) * Math.PI / 180,
      m, A: sh.area(spec.s), d, I: m * (rg * rg + d * d),
      th: 0, om: 0, subM: m, subA: sh.area(spec.s), rest: 0,
    };
  }
  if (spec.kind === 'link') {
    const child = buildTree(spec.child);
    return {
      kind: 'link', len: spec.len, child,
      subM: child.subM, subA: child.subA, th: 0, om: 0, rest: 0,
    };
  }
  // rod — solve the balance point exactly like the studio does
  const left = buildTree(spec.left);
  const right = buildTree(spec.right);
  const mids = spec.mids.map(m => ({ f: m.at, link: buildTree(m.link) }));
  const len = spec.len, h = RING_H;
  const ML = left.subM, MR = right.subM;
  const midM = mids.reduce((t, m) => t + m.link.subM, 0);
  const mrod = len * ROD_DENS;
  const den = ML + MR + midM + mrod;
  // pivot distance a from left end: total moment = 0
  let a = (MR * len + mids.reduce((t, m) => t + m.link.subM * m.f * len, 0) + mrod * len / 2) / den;
  // nudge by the exact offset that yields the designed rest tilt
  const eTarget = Math.tan((spec.pose || 0) * Math.PI / 180) * h * den;
  a += -eTarget / den;
  a = Math.max(0.06 * len, Math.min(0.94 * len, a));
  const uL = -a, uR = len - a, u0 = len / 2 - a;
  for (const m of mids) m.u = m.f * len - a;
  const E = ML * uL + MR * uR + mids.reduce((t, m) => t + m.link.subM * m.u, 0) + mrod * u0;
  const I = ML * (a * a + h * h) + MR * (uR * uR + h * h)
    + mids.reduce((t, m) => t + m.link.subM * (m.u * m.u + h * h), 0)
    + mrod * (len * len / 12 + u0 * u0 + h * h);
  return {
    kind: 'rod', len, h, a, uL, uR, u0, mrod, I, left, right, mids,
    th: 0, om: 0, rest: Math.atan2(E, h * den),
    subM: den, subA: left.subA + right.subA + mids.reduce((t, m) => t + m.link.subA, 0),
  };
}

export function setRest(n) {
  n.th = n.rest || 0; n.om = 0;
  if (n.kind === 'link') setRest(n.child);
  else if (n.kind === 'rod') {
    setRest(n.left); setRest(n.right); n.mids.forEach(m => setRest(m.link));
  }
}

export function disturbTree(n, k, rnd = Math.random) {
  const r = () => (rnd() - 0.5) * 2;
  if (n.kind === 'link') { n.om += r() * 1.8 * k; disturbTree(n.child, k, rnd); }
  else if (n.kind === 'rod') {
    n.om += r() * 0.5 * k;
    disturbTree(n.left, k, rnd); disturbTree(n.right, k, rnd);
    n.mids.forEach(m => disturbTree(m.link, k, rnd));
  } else n.om += r() * 1.5 * k;
}

/* ---------- dynamics ---------- */
/* env: { wind(x,y) -> {x,y},  k (aero coefficient) } */

const DAMP = { link: 0.2, rod: 0.16, leaf: 0.45 };
const OM_MAX = { link: 7, rod: 3.2, leaf: 9 };
const ATT = 0.72; // pivot-acceleration hand-down attenuation: stands in for
                  // the parent reaction we don't model; kills resonant cascades
const LIM = { rod: 0.52, leaf: 1.15 };   // soft stops: hooks and holes bind

function softStop(th, om, lim, ks, kd) {
  if (th > lim) return -ks * (th - lim) - kd * om;
  if (th < -lim) return -ks * (th + lim) - kd * om;
  return 0;
}

export function stepNode(n, env, dt, px, py, pvx, pvy, pax, pay) {
  if (n.kind === 'link') {
    const s = Math.sin(n.th), c = Math.cos(n.th), L = n.len;
    const jx = L * c, jy = -L * s;          // ∂p/∂θ
    const rx = L * s, ry = L * c;
    const ex = px + rx, ey = py + ry;
    const evx = pvx + n.om * jx, evy = pvy + n.om * jy;
    const m = n.subM;
    let Q = -m * G * L * s;                                  // gravity
    Q += (-m * pax) * jx + (-m * pay) * jy;                  // pivot inertia
    const w = env.wind(ex, ey);
    const fwx = env.k * n.subA * (w.x - evx), fwy = env.k * n.subA * (w.y - evy);
    Q += fwx * jx + fwy * jy;                                // wind + drag
    const I = m * L * L + 1e-6;
    const al = Q / I - DAMP.link * n.om;
    n.om = clampOm(n.om + al * dt, OM_MAX.link);
    n.th += n.om * dt;
    if (n.th > 1.5) { n.th = 1.5; n.om = Math.min(n.om, 0); }
    if (n.th < -1.5) { n.th = -1.5; n.om = Math.max(n.om, 0); }
    const eax = ATT * (pax + al * jx - n.om * n.om * rx);
    const eay = ATT * (pay + al * jy - n.om * n.om * ry);
    stepNode(n.child, env, dt, ex, ey, evx, evy, eax, eay);
    return;
  }
  if (n.kind === 'rod') {
    const s = Math.sin(n.th), c = Math.cos(n.th), h = n.h;
    let Q = 0;
    const pts = [
      { u: n.uL, m: n.left.subM, A: n.left.subA, link: n.left },
      { u: n.uR, m: n.right.subM, A: n.right.subA, link: n.right },
    ];
    for (const md of n.mids) pts.push({ u: md.u, m: md.link.subM, A: md.link.subA, link: md.link });
    // rod's own body (no sail area, no child)
    pts.push({ u: n.u0, m: n.mrod, A: 0, link: null });
    const ends = [];
    for (const p of pts) {
      const jx = -p.u * s - h * c, jy = p.u * c - h * s;     // ∂p/∂θ at (u, h)
      const rx = p.u * c - h * s, ry = p.u * s + h * c;
      const x = px + rx, y = py + ry;
      Q += p.m * G * jy;                                     // gravity (F = (0, mG))
      Q += (-p.m * pax) * jx + (-p.m * pay) * jy;            // pivot inertia
      if (p.A > 0) {
        const vx = pvx + n.om * jx, vy = pvy + n.om * jy;
        const w = env.wind(x, y);
        Q += env.k * p.A * ((w.x - vx) * jx + (w.y - vy) * jy);
      }
      if (p.link) ends.push({ p, jx, jy, rx, ry, x, y });
    }
    let al = Q / n.I - DAMP.rod * n.om;
    al += softStop(n.th, n.om, LIM.rod + Math.abs(n.rest), 46, 3);
    n.om = clampOm(n.om + al * dt, OM_MAX.rod);
    n.th += n.om * dt;
    for (const e of ends) {
      const evx = pvx + n.om * e.jx, evy = pvy + n.om * e.jy;
      const eax = ATT * (pax + al * e.jx - n.om * n.om * e.rx);
      const eay = ATT * (pay + al * e.jy - n.om * n.om * e.ry);
      stepNode(e.p.link, env, dt, e.x, e.y, evx, evy, eax, eay);
    }
    return;
  }
  // leaf — swings on its hang hole
  {
    const s = Math.sin(n.th), c = Math.cos(n.th), d = n.d;
    const jx = d * c, jy = -d * s;
    const cx = px + d * s, cy = py + d * c;
    const cvx = pvx + n.om * jx, cvy = pvy + n.om * jy;
    let Q = -n.m * G * d * s;
    Q += (-n.m * pax) * jx + (-n.m * pay) * jy;
    const w = env.wind(cx, cy);
    Q += env.k * n.A * ((w.x - cvx) * jx + (w.y - cvy) * jy);
    let al = Q / n.I - DAMP.leaf * n.om;
    al += softStop(n.th, n.om, LIM.leaf, 130, 6);
    n.om = clampOm(n.om + al * dt, OM_MAX.leaf);
    n.th += n.om * dt;
  }
}

function clampOm(v, m) { return v > m ? m : v < -m ? -m : v; }

/* ---------- rest-pose walk (bounds, static render) ---------- */

export function walkRest(n, px, py, cb) {
  if (n.kind === 'link') {
    const ex = px, ey = py + n.len;
    walkRest(n.child, ex, ey, cb);
    return;
  }
  if (n.kind === 'rod') {
    const s = Math.sin(n.rest), c = Math.cos(n.rest), h = n.h;
    const at = (u) => [px + u * c - h * s, py + u * s + h * c];
    const [lx, ly] = at(n.uL), [rx, ry] = at(n.uR);
    cb(lx, ly, 4); cb(rx, ry, 4);
    walkRest(n.left, lx, ly, cb);
    walkRest(n.right, rx, ry, cb);
    for (const m of n.mids) { const [mx, my] = at(m.u); walkRest(m.link, mx, my, cb); }
    return;
  }
  cb(px, py, Math.max(n.sh.hw(n.s), n.sh.hb(n.s)) + 4, n);
}

/* ---------- drawing ---------- */

function drawNode(n, c, px, py, sh, sc) {
  // sh: shadow pass boolean; sc: scale (for constant-px hairlines)
  if (n.kind === 'link') {
    const ex = px + n.len * Math.sin(n.th), ey = py + n.len * Math.cos(n.th);
    c.beginPath(); c.moveTo(px, py); c.lineTo(ex, ey);
    c.lineWidth = sh ? 2.2 : Math.max(1.1 / sc, 1.1);
    c.strokeStyle = sh ? '#14161C' : 'rgba(20,20,25,0.78)';
    c.stroke();
    drawNode(n.child, c, ex, ey, sh, sc);
    return;
  }
  if (n.kind === 'rod') {
    const s = Math.sin(n.th), co = Math.cos(n.th), h = n.h;
    const at = (u) => [px + u * co - h * s, py + u * s + h * co];
    const [lx, ly] = at(n.uL), [rx, ry] = at(n.uR);
    // hang ring + drop wire
    if (!sh) {
      c.beginPath(); c.arc(px, py + 0.5, 4, 0, TAU);
      c.lineWidth = 2; c.strokeStyle = PAL.iron; c.stroke();
    }
    // ring-to-beam wire (body point (0, h))
    const [wx, wy] = [px - h * s, py + h * co];
    c.beginPath(); c.moveTo(px, py + 4); c.lineTo(wx, wy);
    c.lineWidth = sh ? 2.2 : 2; c.strokeStyle = sh ? '#14161C' : PAL.iron; c.stroke();
    // beam with a hint of sag
    const mx = (lx + rx) / 2 - s * n.len * 0.016, my = (ly + ry) / 2 + co * n.len * 0.016;
    c.beginPath(); c.moveTo(lx, ly); c.quadraticCurveTo(mx, my, rx, ry);
    c.lineWidth = sh ? 4 : 3; c.lineCap = 'round';
    c.strokeStyle = sh ? '#14161C' : PAL.iron; c.stroke();
    if (!sh) {
      c.beginPath(); c.arc(lx, ly, 2.1, 0, TAU); c.arc(rx, ry, 2.1, 0, TAU);
      c.fillStyle = PAL.iron; c.fill();
    }
    drawNode(n.left, c, lx, ly, sh, sc);
    drawNode(n.right, c, rx, ry, sh, sc);
    for (const m of n.mids) { const [ax, ay] = at(m.u); drawNode(m.link, c, ax, ay, sh, sc); }
    return;
  }
  // leaf
  c.save();
  c.translate(px, py);
  c.rotate(n.th + n.rot);
  if (!sh) {
    c.beginPath(); c.arc(0, -1.5, 2.4, 0, TAU);
    c.lineWidth = 1.6; c.strokeStyle = PAL.iron; c.stroke();
  }
  c.beginPath();
  n.sh.path(c, n.s);
  c.closePath();
  c.fillStyle = sh ? '#14161C' : n.color;
  if (n.sh.fillRule) c.fill(n.sh.fillRule); else c.fill();
  if (!sh && n.stroke) {
    c.lineWidth = Math.max(1.5 / sc, 1.5); c.strokeStyle = n.stroke; c.stroke();
  }
  c.restore();
}

/* ---------- Mobile: canvas orchestration ---------- */

const SHADOW_RES = 0.16;

export class Mobile {
  constructor(canvas, spec) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw new Error('2d context unavailable');
    this.spec = spec;
    this.root = buildTree(hang(spec.drop, spec.root));
    setRest(this.root);
    this.phase = Math.random() * 37;
    this.pt = { x: -1e9, y: -1e9, vx: 0, vy: 0 };
    this.acc = 0;
    this.t = 0;
    this.ax = 0; this.ay = 0;
    this.env = { wind: (x, y) => this.windAt(x, y), k: K_WIND };
    this.shadow = document.createElement('canvas');
    this.sctx = this.shadow.getContext('2d');
    if (!this.sctx) throw new Error('2d context unavailable');
    this.computeBounds();
    this.resize();
  }

  computeBounds() {
    let minx = -10, maxx = 10, maxy = 40;
    walkRest(this.root, 0, 0, (x, y, r) => {
      minx = Math.min(minx, x - r); maxx = Math.max(maxx, x + r);
      maxy = Math.max(maxy, y + r);
    });
    this.b = { minx: minx - 24, maxx: maxx + 24, maxy: maxy + 20 };
  }

  resize() {
    this.cv.style.height = '';               // re-measure the room's own height
    const cw = this.cv.clientWidth;
    let ch = this.cv.clientHeight;
    if (!cw || !ch) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = this.b.maxx - this.b.minx, bh = this.b.maxy;
    const sp = this.spec;
    const fw = cw < 700 ? Math.min(0.96, (sp.fitW || 0.7) + 0.3) : (sp.fitW || 0.7);
    this.s = Math.min(fw * cw / bw, (sp.fitH || 0.86) * ch / bh, sp.maxScale || 1.15);
    // narrow screens: when width-limits leave dead wall under the sculpture,
    // the canvas hugs the work so the copy hangs right beneath it
    if (window.matchMedia('(max-width: 880px)').matches) {
      const need = Math.ceil(this.b.maxy * this.s + (sp.hugPad || 44));
      if (need < ch) { this.cv.style.height = need + 'px'; ch = need; }
    }
    this.cw = cw; this.ch = ch; this.dpr = dpr;
    this.cv.width = Math.round(cw * dpr);
    this.cv.height = Math.round(ch * dpr);
    const cx = (this.b.minx + this.b.maxx) / 2;
    this.ox = (sp.ax || 0.5) * cw - cx * this.s;
    // keep inside walls
    this.ox = Math.min(this.ox, cw - 8 - this.b.maxx * this.s);
    this.ox = Math.max(this.ox, 8 - this.b.minx * this.s);
    this.oy = 0;
    this.shf = cw < 700 ? 0.26 : SHADOW_RES;
    this.shadow.width = Math.max(2, Math.round(cw * this.shf));
    this.shadow.height = Math.max(2, Math.round(ch * this.shf));
  }

  setPointer(clientX, clientY, vx, vy) {
    const r = this.rect;
    if (!r) return;
    this.pt.x = (clientX - r.left - this.ox) / this.s;
    this.pt.y = (clientY - r.top - this.oy) / this.s;
    this.pt.vx = vx / this.s;
    this.pt.vy = vy / this.s;
  }

  windAt(x, y) {
    const t = this.t + this.phase;
    let wx = 14 * Math.sin(t * 0.33 + y * 0.006) + 9 * Math.sin(t * 0.117 + x * 0.0043);
    let wy = 6 * Math.sin(t * 0.21 + x * 0.005);
    const p = this.pt;
    const dx = x - p.x, dy = y - p.y;
    const R = 175 / this.s;
    const g = Math.exp(-(dx * dx + dy * dy) / (R * R));
    if (g > 0.001) {
      wx += Math.max(-1600, Math.min(1600, p.vx * 0.85)) * g;
      wy += Math.max(-1600, Math.min(1600, p.vy * 0.85)) * g;
    }
    return { x: wx, y: wy };
  }

  frame(dt, shakeAx, shakeAy) {
    this.rect = this.cv.getBoundingClientRect();
    this.t += dt;
    this.acc = Math.min(this.acc + dt, 8 * DT);
    let ax = shakeAx / this.s, ay = shakeAy / this.s;
    // installation: the sculpture is lowered into the room on its wire;
    // the deceleration is fed to the tree as pivot inertia, so the
    // arrival sway is genuine physics, not an animation.
    this.rootY = 0;
    if (this.install) {
      const I = this.install;
      I.t += dt;
      const T = Math.min(1, I.t / I.dur);
      const e = 1 - Math.pow(1 - T, 3);
      this.rootY = I.from * (1 - e);
      ay += 6 * I.from * (1 - T) / (I.dur * I.dur);
      if (T >= 1) this.install = null;
    }
    while (this.acc >= DT) {
      stepNode(this.root, this.env, DT, 0, this.rootY, 0, 0, ax, ay);
      this.acc -= DT;
    }
    this.draw();
  }

  beginInstall() {
    this.install = { t: 0, dur: 2.1, from: -(this.b.maxy + 90) };
    disturbTree(this.root, 0.2);
  }

  disturb(k) { disturbTree(this.root, k); }
  restPose() { setRest(this.root); this.install = null; this.rootY = 0; }

  draw() {
    const { ctx: c, dpr, s, ox, oy, cw, ch } = this;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, cw, ch);
    // soft wall shadow: silhouette at low res, stretched back up
    const f = this.shf;
    const sc = this.sctx;
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.clearRect(0, 0, this.shadow.width, this.shadow.height);
    const ry = this.rootY || 0;
    sc.setTransform(f * s, 0, 0, f * s, f * ox, f * oy);
    drawNode(this.root, sc, 0, ry, true, s);
    c.globalAlpha = 0.12 * Math.min(1, s + 0.3);
    c.drawImage(this.shadow, 6 + 22 * s, 10 + 30 * s, cw, ch);
    c.globalAlpha = 1;
    // ceiling mount
    c.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    c.fillStyle = PAL.iron;
    c.fillRect(-9 / s, 0, 18 / s, 3 / s);
    drawNode(this.root, c, 0, ry, false, s);
  }

  drawOnce() { this.rect = this.cv.getBoundingClientRect(); this.draw(); }

  telemetry() {              // what the wall label reads off the sculpture
    let om = 0;
    const walk = n => {
      om += Math.abs(n.om);
      if (n.kind === 'link') walk(n.child);
      else if (n.kind === 'rod') {
        walk(n.left); walk(n.right); n.mids.forEach(m => walk(m.link));
      }
    };
    walk(this.root);
    const beam = this.root.child;
    const deg = (beam && beam.kind === 'rod' ? beam.th : 0) * 180 / Math.PI;
    return { deg, om };
  }
}
