/* ============================================================
   botany.js — the growing engine.
   Segment-chain L-system turtles: ferns that truly uncoil from
   fiddleheads, vines that climb and bud leaves as the tip passes.
   ============================================================ */

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const backOut = t => {
  t = clamp(t, 0, 1);
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/* deterministic rng — every plant grows the same way twice */
export function rng(seed) {
  let a = seed >>> 0 || 1;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function mixHex(h1, h2, t) {
  const p = h => h[0] === '#'
    ? [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
    : h.match(/\d+/g).slice(0, 3).map(Number);
  const a = p(h1), b = p(h2);
  const c = a.map((v, i) => Math.round(lerp(v, b[i], clamp(t, 0, 1))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function fitCanvas(canvas, cssW, cssH) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/* ------------------------------------------------------------
   FROND — a fern frond as a chain of segments. Ungrown segments
   hold a constant coil turn (a crozier); a growth front moves
   base→tip relaxing each segment toward its final curvature, so
   the fiddlehead genuinely unrolls.
   ------------------------------------------------------------ */
export class Frond {
  constructor(opts) {
    const o = this.o = Object.assign({
      x: 0, y: 0, baseAngle: -Math.PI / 2, lean: 0,
      len: 180, n: 54, dir: 1, seed: 7,
      inkBase: '#2F5138', inkTip: '#5C8F63', inkYoung: '#A8C578',
      width: 3.2, ws: 1, pinnae: true,
    }, opts);
    const R = rng(o.seed * 7919);
    this.R = R;
    const n = o.n;

    this.segLen = [];
    this.finalTurn = [];
    const totalBend = o.dir * (1.15 + R() * 0.7);
    let bendSum = 0;
    const raw = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const w = 0.35 + 1.5 * t * t;         /* bend accumulates toward tip */
      raw.push(w); bendSum += w;
      this.segLen.push((o.len / n) * (1.18 - 0.6 * t)); /* taper */
    }
    for (let i = 0; i < n; i++) this.finalTurn.push(totalBend * raw[i] / bendSum);
    this.coilTurn = o.dir * (0.34 + R() * 0.05);        /* crozier tightness */

    /* pinnae: recursive mini-fronds along the rachis */
    this.pinnae = [];
    if (o.pinnae) {
      for (let i = Math.floor(n * 0.14); i < n * 0.96; i += 2) {
        const t = i / (n - 1);
        const profile = Math.sin(Math.PI * clamp((t - 0.06) / 0.94, 0, 1) ** 0.8);
        this.pinnae.push({
          idx: i,
          side: (this.pinnae.length % 2 === 0) ? 1 : -1,
          len: o.len * 0.31 * (0.25 + 0.75 * profile),
          m: 8,
          jitter: (R() - 0.5) * 0.25,
          phase: R() * TAU,
        });
      }
    }
    this.phase = R() * TAU;
    this.leafCount = this.pinnae.length;
  }

  /* g: growth 0..1   wind: sway amplitude 0..1   time: seconds */
  draw(ctx, g, wind, time) {
    const o = this.o, n = o.n;
    const baseAlpha = ctx.globalAlpha;
    const front = g * 1.28 - 0.08;               /* unroll front in t-space */
    const scale = 0.22 + 0.78 * smooth(Math.min(1, g * 2.4));
    const baseSway = wind * Math.sin(time * 0.9 + this.phase) * 0.035;

    let x = o.x, y = o.y;
    let ang = o.baseAngle + o.lean + baseSway;
    const pts = [{ x, y, ang, u: 1 }];

    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const u = smooth((front - t) / 0.16);
      const uLen = smooth((front - t) / 0.3);
      const turn = lerp(this.coilTurn * (0.75 + 0.5 * (1 - t)), this.finalTurn[i], u)
        + wind * Math.sin(time * 1.25 + this.phase + t * 2.6) * 0.006 * Math.pow(t, 1.4);
      ang += turn;
      const L = this.segLen[i] * (0.34 + 0.66 * uLen) * scale;
      x += Math.cos(ang) * L;
      y += Math.sin(ang) * L;
      pts.push({ x, y, ang, u });
    }

    /* rachis */
    for (let i = 1; i < pts.length; i++) {
      const t = i / (pts.length - 1);
      const p0 = pts[i - 1], p1 = pts[i];
      ctx.strokeStyle = mixHex(
        i < 4 ? '#4A5B33' : o.inkBase,
        p1.u < 0.98 ? o.inkYoung : o.inkTip, Math.max(t, 1 - p1.u));
      ctx.lineWidth = Math.max(0.7, o.width * (1 - 0.78 * t) * scale);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }

    /* pinnae — filled lanceolate blades that unroll after the front passes */
    if (o.pinnae) {
      for (const p of this.pinnae) {
        const t = p.idx / (n - 1);
        /* every pinna exists from the start, furled tight against the
           rachis; it swings open and expands as the front passes */
        const up = smooth((front - t + 0.02) / 0.19);
        const node = pts[p.idx + 1];
        const pScale = (0.24 + 0.76 * up) * scale;
        let px = node.x, py = node.y;
        let pang = node.ang + p.side * lerp(0.36, 1.42 + p.jitter, smooth(up))
          + wind * Math.sin(time * 1.6 + p.phase) * 0.02 * up;
        const m = p.m;
        const coil = -p.side * 0.62;
        const fin = -p.side * 0.16;   /* pinnae droop as they open */

        /* walk the spine */
        const spine = [{ x: px, y: py, a: pang }];
        for (let j = 0; j < m; j++) {
          const tj = j / (m - 1);
          pang += lerp(coil, fin, up);
          const L = (p.len / m) * (1.2 - 0.7 * tj) * pScale;
          px += Math.cos(pang) * L;
          py += Math.sin(pang) * L;
          spine.push({ x: px, y: py, a: pang });
        }
        /* blade: tapered polygon around the spine */
        const halfW = p.len * 0.12 * pScale;
        const left = [], right = [];
        for (let j = 0; j < spine.length; j++) {
          const tj = j / (spine.length - 1);
          const w = halfW * Math.pow(Math.sin(Math.PI * Math.min(1, 0.08 + tj * 0.98)), 0.75);
          const a = spine[j].a + Math.PI / 2;
          const nx = Math.cos(a) * w, ny = Math.sin(a) * w;
          left.push([spine[j].x + nx, spine[j].y + ny]);
          right.push([spine[j].x - nx, spine[j].y - ny]);
        }
        const freshness = Math.max(0, 1 - up);
        const shade = (Math.sin(p.phase) + 1) / 2;
        ctx.globalAlpha = baseAlpha * (0.5 + 0.5 * up);
        ctx.fillStyle = mixHex(
          mixHex(o.inkTip, o.inkBase, 0.25 + shade * 0.3),
          o.inkYoung, Math.max(freshness, t * 0.25));
        ctx.beginPath();
        ctx.moveTo(left[0][0], left[0][1]);
        for (const q of left) ctx.lineTo(q[0], q[1]);
        for (let j = right.length - 1; j >= 0; j--) ctx.lineTo(right[j][0], right[j][1]);
        ctx.closePath();
        ctx.fill();
        /* midrib */
        ctx.strokeStyle = mixHex(o.inkBase, o.inkYoung, freshness);
        ctx.lineWidth = Math.max(0.5, 0.8 * pScale * o.ws);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(spine[0].x, spine[0].y);
        for (const q of spine) ctx.lineTo(q.x, q.y);
        ctx.stroke();
        ctx.globalAlpha = baseAlpha;
      }
    }
  }
}

/* ------------------------------------------------------------
   VINE — climbs a guide polyline (a mullion, a rail), wandering
   slightly; ivy leaves bud and pop open as the growing tip
   passes their node; tendril spirals every so often.
   ------------------------------------------------------------ */
export class Vine {
  constructor(opts) {
    const o = this.o = Object.assign({
      guide: [], seed: 3, step: 7, amp: 5,
      leafEvery: 24, leafSize: 13,
      stem: '#4E7042', leafA: '#477952', leafB: '#639867', vein: '#2F5138',
      width: 2.4,
    }, opts);
    const R = rng(o.seed * 104729);

    /* resample guide to even steps */
    const g = o.guide;
    let total = 0;
    const segs = [];
    for (let i = 1; i < g.length; i++) {
      const d = Math.hypot(g[i].x - g[i - 1].x, g[i].y - g[i - 1].y);
      segs.push(d); total += d;
    }
    const count = Math.max(8, Math.floor(total / o.step));
    this.pts = [];
    let si = 0, sAcc = 0;
    for (let k = 0; k <= count; k++) {
      const dist = (k / count) * total;
      while (si < segs.length - 1 && sAcc + segs[si] < dist) { sAcc += segs[si]; si++; }
      const local = segs[si] === 0 ? 0 : (dist - sAcc) / segs[si];
      const ax = lerp(g[si].x, g[si + 1].x, local);
      const ay = lerp(g[si].y, g[si + 1].y, local);
      /* perpendicular wander */
      const dx = g[si + 1].x - g[si].x, dy = g[si + 1].y - g[si].y;
      const dl = Math.hypot(dx, dy) || 1;
      const nx = -dy / dl, ny = dx / dl;
      const wob = Math.sin(k * 0.55 + o.seed) * o.amp * (0.4 + 0.6 * Math.sin(k * 0.13 + o.seed * 2));
      this.pts.push({ x: ax + nx * wob, y: ay + ny * wob, nx, ny });
    }

    this.leaves = [];
    for (let k = Math.floor(o.leafEvery * 0.7); k < this.pts.length - 2; k += o.leafEvery) {
      const j = k + Math.floor((R() - 0.5) * o.leafEvery * 0.4);
      if (j < 2 || j >= this.pts.length - 1) continue;
      this.leaves.push({
        idx: j,
        side: this.leaves.length % 2 === 0 ? 1 : -1,
        size: o.leafSize * (0.75 + R() * 0.55),
        rot: (R() - 0.5) * 0.5,
        phase: R() * TAU,
      });
    }
    this.tendrils = [];
    for (let k = Math.floor(this.pts.length * 0.3); k < this.pts.length - 4; k += Math.floor(o.leafEvery * 2.6)) {
      this.tendrils.push({ idx: k, side: this.tendrils.length % 2 ? 1 : -1, turns: 2.2 + R() * 1.2, r: 4.5 + R() * 3 });
    }
    this.leafCount = this.leaves.length;
  }

  draw(ctx, g, time, wind = 0.5) {
    const o = this.o;
    const P = this.pts.length;
    const head = clamp(g, 0, 1) * (P - 1);
    const hi = Math.floor(head);
    if (hi < 1) return;

    /* stem */
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i <= hi; i++) {
      const age = clamp((head - i) / 30, 0, 1);
      ctx.strokeStyle = mixHex('#7FA168', o.stem, age);
      ctx.lineWidth = lerp(1.1, o.width, age);
      ctx.beginPath();
      ctx.moveTo(this.pts[i - 1].x, this.pts[i - 1].y);
      ctx.lineTo(this.pts[i].x, this.pts[i].y);
      ctx.stroke();
    }
    /* growing tip — a small curled hook */
    if (g < 0.995) {
      const tip = this.pts[hi];
      ctx.strokeStyle = '#8FB573';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const ta = Math.atan2(this.pts[hi].y - this.pts[hi - 1].y, this.pts[hi].x - this.pts[hi - 1].x);
      let cx = tip.x, cy = tip.y, ca = ta;
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 7; s++) {
        ca += 0.5; const L = 2.2 * (1 - s / 8);
        cx += Math.cos(ca) * L; cy += Math.sin(ca) * L;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    /* tendrils */
    for (const td of this.tendrils) {
      if (td.idx > head - 4) continue;
      const k = clamp((head - td.idx - 4) / 26, 0, 1);
      const p = this.pts[td.idx];
      ctx.strokeStyle = mixHex('#8FB573', o.stem, 0.4);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      let a0 = Math.atan2(p.ny, p.nx) * td.side;
      let cx = p.x, cy = p.y;
      ctx.moveTo(cx, cy);
      const steps = Math.floor(26 * k);
      for (let s = 0; s < steps; s++) {
        const tt = s / 26;
        const r = td.r * (1 - tt * 0.8);
        a0 += td.turns * TAU / 26 * td.side;
        cx += Math.cos(a0) * r * 0.32; cy += Math.sin(a0) * r * 0.32;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    /* leaves */
    for (const lf of this.leaves) {
      if (lf.idx > head) continue;
      const k = clamp((head - lf.idx) / 14, 0, 1);
      const s = backOut(k) * lf.size;
      if (s <= 0.2) continue;
      const p = this.pts[lf.idx];
      const stemAng = Math.atan2(
        this.pts[lf.idx].y - this.pts[lf.idx - 1].y,
        this.pts[lf.idx].x - this.pts[lf.idx - 1].x);
      const ang = stemAng + lf.side * (Math.PI / 2.3) + lf.rot
        + (k >= 1 ? Math.sin(time * 1.1 + lf.phase) * 0.05 * wind : 0);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang + Math.PI / 2);
      /* petiole */
      ctx.strokeStyle = o.stem; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.28); ctx.stroke();
      ctx.translate(0, -s * 0.28);
      /* pointed-heart ivy leaf */
      ctx.fillStyle = mixHex(o.leafA, o.leafB, (Math.sin(lf.phase) + 1) / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-s * 0.62, -s * 0.02, -s * 0.74, -s * 0.62, -s * 0.18, -s * 0.82);
      ctx.quadraticCurveTo(-s * 0.05, -s * 0.9, 0, -s * 1.12);
      ctx.quadraticCurveTo(s * 0.05, -s * 0.9, s * 0.18, -s * 0.82);
      ctx.bezierCurveTo(s * 0.74, -s * 0.62, s * 0.62, -s * 0.02, 0, 0);
      ctx.fill();
      /* mid-vein */
      ctx.strokeStyle = o.vein; ctx.globalAlpha = 0.5; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.08); ctx.lineTo(0, -s * 0.9); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
}
