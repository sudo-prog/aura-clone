// BENTHICA — sea.js
// The water itself: surface light, marine snow, the trench floor,
// VELA's floodlights, and the amphipods that come to inspect them.

import { creatures } from './creatures.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, s) => a + (b - a) * s;
const smooth = (a, b, v) => {
  const s = clamp((v - a) / (b - a), 0, 1);
  return s * s * (3 - 2 * s);
};

export const MAX_DEPTH = 10911;

/* ambient color ramp — light dying with depth */
const RAMP = [
  [0,    15, 126, 138],
  [60,   13, 105, 122],
  [150,  11,  75,  98],
  [250,  10,  59,  92],
  [420,   8,  44,  72],
  [650,   6,  32,  55],
  [900,   5,  23,  41],
  [1200,  4,  15,  29],
  [1600,  3,  10,  20],
  [2100,  2,   6,  13],
  [2800,  1,   4,   9],
  [3600,  1,   2,   5],
  [4800,  0,   1,   3],
  [6200,  0,   0,   1],
  [8000,  0,   0,   0],
];

export function ambientColor(d) {
  if (d <= RAMP[0][0]) return [RAMP[0][1], RAMP[0][2], RAMP[0][3]];
  for (let i = 1; i < RAMP.length; i++) {
    if (d <= RAMP[i][0]) {
      const [d0, r0, g0, b0] = RAMP[i - 1];
      const [d1, r1, g1, b1] = RAMP[i];
      const s = (d - d0) / (d1 - d0);
      return [lerp(r0, r1, s), lerp(g0, g1, s), lerp(b0, b1, s)];
    }
  }
  return [0, 0, 0];
}

/* floor geometry shared with snow tinting */
const FLOOR_WINDOW = 460; // meters above bottom at which floor becomes drawable
const LIGHTS_ON = 340;    // meters above bottom at which floodlights wake

export class Sea {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = 0;
    this.H = 0;
    this.dpr = 1;
    this.snow = [];
    this.amphipods = [];
    this.plankton = [];
    this.bumps = [];
    for (let i = 0; i < 120; i++) {
      this.bumps.push(
        Math.sin(i * 0.9) * 4 + Math.sin(i * 2.7 + 1.3) * 2.5 + Math.sin(i * 0.31) * 6
      );
    }
    this.lightsOnAt = -1; // timestamp when floodlights first woke, for flicker-on
    this.resize();
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.initSnow();
  }

  initSnow() {
    const target = clamp(Math.round((this.W * this.H) / 8600), 60, 210);
    this.snow = [];
    for (let i = 0; i < target; i++) {
      this.snow.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        r: 0.4 + Math.random() * 1.5,
        p: 0.35 + Math.random() * 0.9, // parallax
        ph: Math.random() * TAU,
        a: 0.2 + Math.random() * 0.55,
      });
    }
  }

  /* ---------------- surface light ---------------- */

  drawSurface(ctx, t, depth) {
    const { W, H } = this;

    // wavering surface sheet, seen from below
    if (depth < 42) {
      const sa = 1 - depth / 42;
      const yBase = H * 0.055 - depth * 3.4;
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = `rgba(215,250,248,${(pass ? 0.12 : 0.3) * sa})`;
        ctx.lineWidth = pass ? 4 : 1.6;
        ctx.beginPath();
        for (let x = -10; x <= W + 10; x += 14) {
          const y =
            yBase +
            Math.sin(x * 0.011 + t * 0.9 + pass) * 6 +
            Math.sin(x * 0.027 - t * 0.6) * 3.4;
          x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // the sun, receding
    if (depth < 95) {
      const sa = Math.pow(1 - depth / 95, 1.4);
      const sx = W * 0.66;
      const sy = H * 0.15 - depth * 2.1;
      const r = 46 + Math.sin(t * 2.1) * 3 + Math.sin(t * 3.7) * 2;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      let g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 6.4);
      g.addColorStop(0, `rgba(160,235,230,${0.13 * sa})`);
      g.addColorStop(1, 'rgba(160,235,230,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, r * 6.4, 0, TAU); ctx.fill();
      g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.6);
      g.addColorStop(0, `rgba(205,248,242,${0.3 * sa})`);
      g.addColorStop(1, 'rgba(205,248,242,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, r * 2.6, 0, TAU); ctx.fill();
      g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, `rgba(240,255,252,${0.85 * sa})`);
      g.addColorStop(0.7, `rgba(220,250,246,${0.5 * sa})`);
      g.addColorStop(1, 'rgba(220,250,246,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // god rays
    if (depth < 300) {
      const ra = Math.pow(1 - depth / 300, 1.6);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const x0 = W * (0.05 + 0.17 * i) + Math.sin(t * 0.06 + i * 1.31) * 46;
        const wTop = 24 + (i % 3) * 18;
        const slant = 90 + Math.sin(t * 0.045 + i) * 44;
        const g = ctx.createLinearGradient(0, -40, 0, H);
        g.addColorStop(0, `rgba(200,245,240,${0.085 * ra})`);
        g.addColorStop(1, 'rgba(200,245,240,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0, -40);
        ctx.lineTo(x0 + wTop, -40);
        ctx.lineTo(x0 + wTop * 3.4 + slant, H);
        ctx.lineTo(x0 + slant - wTop * 1.2, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ---------------- trench walls ----------------
     Below ~8,400 m the sonar stops finding a bottom and starts finding
     walls. So does the page: the corridor closes in — ragged basalt a
     shade lighter than the black, sliding upward as VELA sinks, flecked
     with the biolume of whatever grips the rock. */

  drawWalls(ctx, t, depth, reduced) {
    const { W, H } = this;
    const w = smooth(8400, 10500, depth);
    if (w <= 0.005) return;
    const scroll = depth * 3.1; // rock streams upward as we sink past it
    const baseW = W * (0.045 + 0.125 * w);
    const jagAt = (y, side) => {
      const k = (y + scroll) * 0.013 + side * 37.7;
      return Math.sin(k) * 14 + Math.sin(k * 2.63 + 1.4) * 8 + Math.sin(k * 0.47) * 30;
    };
    for (const side of [0, 1]) {
      const dir = side ? -1 : 1;
      const x0 = side ? W + 24 : -24;
      ctx.beginPath();
      ctx.moveTo(x0, -24);
      const steps = 30;
      for (let i = 0; i <= steps; i++) {
        const y = -24 + (i / steps) * (H + 48);
        ctx.lineTo(x0 + dir * (baseW + jagAt(y, side) * w), y);
      }
      ctx.lineTo(x0, H + 24);
      ctx.closePath();
      const wg = ctx.createLinearGradient(
        side ? W : 0, 0, side ? W - baseW * 2.6 : baseW * 2.6, 0
      );
      wg.addColorStop(0, `rgba(9,14,18,${0.95 * w})`);
      wg.addColorStop(0.7, `rgba(5,9,12,${0.8 * w})`);
      wg.addColorStop(1, 'rgba(3,6,8,0)');
      ctx.fillStyle = wg;
      ctx.fill();
      ctx.strokeStyle = `rgba(122,168,178,${0.09 * w})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // life on the rock — slow biolume flecks riding the wall
      for (let f = 0; f < 6; f++) {
        const fy =
          ((((f * 613.7 + side * 271 - scroll) % (H + 120)) + (H + 120)) % (H + 120)) - 60;
        const fx = x0 + dir * (baseW + jagAt(fy, side) * w) - dir * 3;
        const pul = reduced ? 0.55 : 0.3 + 0.7 * Math.max(0, Math.sin(t * 0.7 + f * 2.1 + side * 3));
        const al = 0.45 * w * pul;
        if (al <= 0.02) continue;
        const rg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 5);
        rg.addColorStop(0, `rgba(100,240,210,${al})`);
        rg.addColorStop(1, 'rgba(100,240,210,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(fx, fy, 5, 0, TAU);
        ctx.fill();
      }
    }
  }

  /* ---------------- trench floor + floodlights + amphipods -------- */

  floorGeom(depth) {
    const rem = MAX_DEPTH - depth;
    if (rem > FLOOR_WINDOW) return null;
    const { W, H } = this;
    const yF = H * 0.84 + rem * ((H * 1.08) / FLOOR_WINDOW);
    const coneA = smooth(LIGHTS_ON, LIGHTS_ON - 90, rem);
    return { rem, yF, coneA, cx: W * 0.5 };
  }

  drawFloor(ctx, t, depth, now, reduced, dt = 1 / 60) {
    const g = this.floorGeom(depth);
    if (!g) { this.lightsOnAt = -1; return; }
    const { W, H } = this;
    const { rem, yF, cx } = g;
    let { coneA } = g;

    // flicker-on the first moment the lights wake
    if (coneA > 0.01 && this.lightsOnAt < 0) this.lightsOnAt = now;
    if (this.lightsOnAt > 0 && !reduced) {
      const dt = (now - this.lightsOnAt) / 1000;
      if (dt < 0.9) {
        const gate = dt < 0.12 ? 1 : dt < 0.22 ? 0.2 : dt < 0.34 ? 1 : dt < 0.42 ? 0.4 : 1;
        coneA *= gate;
      }
    }

    const poolR = W * 0.31;
    const apexY = -H * 0.32;

    // light cones (port + starboard, slightly toed in)
    if (coneA > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const off of [-W * 0.09, W * 0.09]) {
        const ax = cx + off * 0.4;
        const lg = ctx.createLinearGradient(0, apexY, 0, yF);
        lg.addColorStop(0, `rgba(255,236,202,${0.02 * coneA})`);
        lg.addColorStop(0.55, `rgba(255,236,202,${0.075 * coneA})`);
        lg.addColorStop(1, `rgba(255,236,202,${0.13 * coneA})`);
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(ax - 26, apexY);
        ctx.lineTo(ax + 26, apexY);
        ctx.lineTo(cx + off + poolR * 0.78, yF + 30);
        ctx.lineTo(cx + off - poolR * 0.78, yF + 30);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // sediment mass below the floor line
    if (yF < H + 60) {
      ctx.save();
      // floor silhouette path
      ctx.beginPath();
      ctx.moveTo(-20, yF + this.bumps[0]);
      const step = (W + 40) / 90;
      for (let i = 1; i <= 90; i++) {
        const x = -20 + i * step;
        ctx.lineTo(x, yF + this.bumps[i % this.bumps.length]);
      }
      ctx.lineTo(W + 20, H + 80);
      ctx.lineTo(-20, H + 80);
      ctx.closePath();

      const base = ctx.createLinearGradient(0, yF - 10, 0, H + 60);
      base.addColorStop(0, `rgba(10,9,6,1)`);
      base.addColorStop(1, `rgba(2,2,1,1)`);
      ctx.fillStyle = base;
      ctx.fill();

      // lit pool of sediment
      if (coneA > 0.01) {
        ctx.save();
        ctx.clip();
        const pool = ctx.createRadialGradient(cx, yF + 14, 0, cx, yF + 14, poolR);
        pool.addColorStop(0, `rgba(226,196,148,${0.5 * coneA})`);
        pool.addColorStop(0.55, `rgba(170,142,102,${0.3 * coneA})`);
        pool.addColorStop(1, 'rgba(120,98,70,0)');
        ctx.fillStyle = pool;
        ctx.beginPath();
        ctx.ellipse(cx, yF + 14, poolR, poolR * 0.5, 0, 0, TAU);
        ctx.fill();

        // ripple marks pressed into the lit sediment
        ctx.strokeStyle = `rgba(30,24,14,${0.5 * coneA})`;
        ctx.lineWidth = 1.4;
        for (let rrow = 0; rrow < 5; rrow++) {
          const ry = yF + 16 + rrow * 13;
          ctx.beginPath();
          for (let x = cx - poolR; x <= cx + poolR; x += 12) {
            const y = ry + Math.sin(x * 0.05 + rrow * 2.2) * 2.4;
            x <= cx - poolR ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        // stones
        const stones = [
          [cx - poolR * 0.55, yF + 22, 15, 7],
          [cx + poolR * 0.4, yF + 34, 10, 5],
          [cx + poolR * 0.14, yF + 12, 7, 3.6],
        ];
        for (const [sx, sy, sw, sh] of stones) {
          ctx.fillStyle = `rgba(14,12,8,${0.9 * coneA})`;
          ctx.beginPath();
          ctx.ellipse(sx, sy, sw, sh, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = `rgba(255,236,200,${0.2 * coneA})`;
          ctx.beginPath();
          ctx.ellipse(sx - sw * 0.14, sy - sh * 0.5, sw * 0.72, sh * 0.42, 0, 0, TAU);
          ctx.fill();
        }

        // a holothurian, going about its business
        const hx = cx + poolR * 0.68;
        const hy = yF + 26;
        ctx.fillStyle = `rgba(184,150,132,${0.4 * coneA})`;
        ctx.beginPath();
        ctx.ellipse(hx, hy, 16, 5.4, -0.08, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(120,92,80,${0.35 * coneA})`;
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          ctx.arc(hx - 12 + k * 6, hy - 4.6, 1.5, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
    }

    // pool glow above the floor line
    if (coneA > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(cx, yF + 6, 0, cx, yF + 6, poolR * 1.15);
      halo.addColorStop(0, `rgba(255,238,206,${0.13 * coneA})`);
      halo.addColorStop(1, 'rgba(255,238,206,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.ellipse(cx, yF + 6, poolR * 1.15, poolR * 0.42, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // amphipods — the trench's own weather
    if (rem < 70 && coneA > 0.2) {
      if (this.amphipods.length === 0) {
        for (let i = 0; i < 8; i++) {
          this.amphipods.push({
            x: cx + (Math.random() - 0.5) * poolR * 1.6,
            y: yF - 20 - Math.random() * H * 0.3,
            tx: cx, ty: yF - 60,
            ph: Math.random() * TAU,
            s: 0.75 + Math.random() * 0.6,
            retarget: 0,
          });
        }
      }
      const dtA = reduced ? 0 : dt;
      const ease = 1 - Math.exp(-dt * 2.1); // ≈0.035/frame at 60 fps, rate-true elsewhere
      for (const amp of this.amphipods) {
        amp.retarget -= dtA;
        if (amp.retarget <= 0) {
          amp.tx = cx + (Math.random() - 0.5) * poolR * 1.5;
          amp.ty = yF - 8 - Math.random() * 130;
          amp.retarget = 0.7 + Math.random() * 1.6;
        }
        if (!reduced) {
          amp.x += (amp.tx - amp.x) * ease + Math.sin(t * 7 + amp.ph) * 66 * dt;
          amp.y += (amp.ty - amp.y) * ease + Math.cos(t * 6.1 + amp.ph) * 54 * dt;
        }
        const heading = Math.atan2(amp.ty - amp.y, amp.tx - amp.x);
        const nearPool = 1 - clamp(Math.abs(amp.x - cx) / poolR, 0, 1) * 0.6;
        const al = coneA * nearPool;

        // shadow on the sediment when low
        const hgt = clamp((yF - amp.y) / 90, 0, 1);
        if (hgt < 1) {
          ctx.fillStyle = `rgba(0,0,0,${0.3 * (1 - hgt) * coneA})`;
          ctx.beginPath();
          ctx.ellipse(amp.x, yF + 10, 7 * amp.s, 2.4 * amp.s, 0, 0, TAU);
          ctx.fill();
        }

        ctx.save();
        ctx.translate(amp.x, amp.y);
        ctx.rotate(heading * 0.35);
        ctx.scale(amp.s, amp.s);
        // comma-shaped body
        ctx.fillStyle = `rgba(255,246,228,${0.85 * al})`;
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.quadraticCurveTo(-2, -6.4, 5, -3.4);
        ctx.quadraticCurveTo(8.4, -1.6, 7, 1.4);
        ctx.quadraticCurveTo(1, 4.6, -5, 3);
        ctx.quadraticCurveTo(-7.6, 2, -7, 0);
        ctx.fill();
        // segment bands
        ctx.strokeStyle = `rgba(196,176,148,${0.55 * al})`;
        ctx.lineWidth = 0.8;
        for (let sgm = 0; sgm < 3; sgm++) {
          ctx.beginPath();
          ctx.moveTo(-3 + sgm * 3.4, -4.4 + sgm * 0.5);
          ctx.quadraticCurveTo(-2 + sgm * 3.4, 0, -3.4 + sgm * 3.4, 3.4);
          ctx.stroke();
        }
        // antennae
        ctx.strokeStyle = `rgba(255,246,228,${0.6 * al})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(6.6, -2.4);
        ctx.quadraticCurveTo(11, -5, 13.4, -3.2);
        ctx.moveTo(6.9, -1.4);
        ctx.quadraticCurveTo(11.4, -2.4, 14, -0.6);
        ctx.stroke();
        // leg flicker
        ctx.strokeStyle = `rgba(238,224,198,${0.5 * al})`;
        for (let lg2 = 0; lg2 < 4; lg2++) {
          const lw = Math.sin(t * 16 + lg2 * 1.9 + amp.ph) * 1.6;
          ctx.beginPath();
          ctx.moveTo(-4 + lg2 * 2.8, 3);
          ctx.lineTo(-4.6 + lg2 * 2.8 + lw, 5.8);
          ctx.stroke();
        }
        ctx.restore();
      }
    } else if (rem > 120) {
      this.amphipods.length = 0;
    }
  }

  /* ---------------- plankton flashes ----------------
     Below the last daylight, disturbed plankton spark — single
     biolume flashes, born, brightening, gone. The only weather
     the midnight zone has. */

  drawPlankton(ctx, t, depth, dDepth, reduced, dt = 1 / 60) {
    if (reduced) { this.plankton.length = 0; return; }
    const { W, H } = this;
    let on = smooth(750, 1500, depth);
    // under the floodlights, biolume sparks are outshone — let the lamps win
    const fg = this.floorGeom(depth);
    if (fg) on *= 1 - fg.coneA * 0.9;
    if (on <= 0.01) { this.plankton.length = 0; return; }

    if (this.plankton.length < 12 && Math.random() < 1.8 * on * dt) {
      this.plankton.push({
        x: Math.random() * W,
        y: Math.random() * H,
        p: 0.5 + Math.random() * 0.7,
        life: 0,
        dur: 0.9 + Math.random() * 1.7,
        r: 1.1 + Math.random() * 2.1,
      });
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = this.plankton.length - 1; i >= 0; i--) {
      const pk = this.plankton[i];
      pk.life += dt;
      pk.y -= dDepth * 1.12 * pk.p; // rides the same water as the snow
      if (pk.life >= pk.dur || pk.y < -30 || pk.y > H + 30) {
        this.plankton.splice(i, 1);
        continue;
      }
      const ph = pk.life / pk.dur;
      const al = Math.sin(ph * Math.PI) * on;
      const rr = pk.r * (2.6 + ph * 3.2);
      const rg = ctx.createRadialGradient(pk.x, pk.y, 0, pk.x, pk.y, rr * 3);
      rg.addColorStop(0, `rgba(110,242,214,${0.5 * al})`);
      rg.addColorStop(0.4, `rgba(110,242,214,${0.14 * al})`);
      rg.addColorStop(1, 'rgba(110,242,214,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, rr * 3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------------- marine snow ---------------- */

  drawSnow(ctx, t, depth, dDepth, reduced, dt = 1 / 60) {
    const { W, H } = this;
    const g = this.floorGeom(depth);
    const depthBoost = 0.5 + 0.5 * clamp(depth / 900, 0, 1);
    for (const p of this.snow) {
      if (!reduced) {
        p.y -= dDepth * 1.12 * p.p;             // we sink → snow streams upward
        p.y += 7 * p.p * dt;                    // …and settles when we hold station
        p.x += Math.sin(t * 0.5 + p.ph) * 7.2 * p.p * dt;
      }
      if (p.y < -8) { p.y = H + 8; p.x = Math.random() * W; }
      if (p.y > H + 8) { p.y = -8; p.x = Math.random() * W; }
      if (p.x < -8) p.x = W + 8;
      if (p.x > W + 8) p.x = -8;

      let al = p.a * depthBoost;
      let fill = `rgba(214,232,236,${al})`;

      // flakes crossing the floodlight cone ignite
      if (g && g.coneA > 0.02 && p.y < g.yF) {
        const spread = ((p.y + H * 0.32) / (g.yF + H * 0.32)) * (W * 0.36);
        if (Math.abs(p.x - g.cx) < spread) {
          al = Math.min(1, al * 2.6 * g.coneA + 0.12);
          fill = `rgba(255,240,214,${al})`;
        }
      }
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
    }
  }

  /* ---------------- master render ---------------- */

  render(state) {
    const { t, depth, dDepth, now, reduced } = state;
    const dt = clamp(state.dt || 1 / 60, 0.001, 0.1);
    const ctx = this.ctx;
    const { W, H } = this;
    ctx.clearRect(0, 0, W, H);

    this.drawSurface(ctx, t, depth);
    this.drawWalls(ctx, t, depth, reduced);

    // creatures at their true depths
    for (const c of creatures) {
      const u = (depth - c.depth) / c.span;
      if (u < -1.15 || u > 1.15) continue;
      const a = clamp((1 - Math.abs(u)) * 2.4, 0, 1);
      if (a <= 0.01) continue;
      c.draw(ctx, { t, u, a, W, H, reduced });
    }

    this.drawPlankton(ctx, t, depth, dDepth, reduced, dt);
    this.drawFloor(ctx, t, depth, now, reduced, dt);
    this.drawSnow(ctx, t, depth, dDepth, reduced, dt);
  }
}
