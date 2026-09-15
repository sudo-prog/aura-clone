// OCHRE — the cave render engine.
// Scene = procedural limestone × light. Light = daylight dying at the mouth,
// the faint memory of panels you have found, and the torch in your hand.

import { Noise2D, Flicker, mulberry32 } from './noise.js';
import { PAINTINGS, renderPainting } from './paintings.js';

const TAU = Math.PI * 2;
const TILE = 1024;
const SLAB_H = 2048; // doc px per macro-shading slab

export class Cave {
  constructor(canvas, opts = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.reduced = !!opts.reduced;
    this.onDiscover = opts.onDiscover || (() => {});
    this.onFrame = opts.onFrame || (() => {});
    this.discovered = new Set(opts.discovered || []);
    this.coarse = matchMedia('(pointer: coarse)').matches;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.noise = new Noise2D(1954, 256);
    this.macro = new Noise2D(4471, 256);
    this.flick = new Flicker(87);

    this.light = document.createElement('canvas');
    this.lctx = this.light.getContext('2d');

    this.slabs = new Map();     // slabIdx -> canvas
    this.sparks = new Map();    // slabIdx -> points
    this.embers = [];
    this.smoke = [];
    this.ignite = this.reduced ? 1 : 0;  // the torch is struck at the door
    this.snuffT = -1;                    // ≥0 while being extinguished
    this.paint = [];            // laid-out paintings
    this.docH = 1;
    this.time = 0;
    this.last = performance.now();
    this.running = false;
    this.shaft = null;                       // zone rect of le Puits
    this.eyes = { state: 0, t: 0, x: 0, y: 0 }; // something at the edge of the light

    this.torch = {
      sx: innerWidth * 0.5, sy: innerHeight * 0.46,
      tx: innerWidth * 0.5, ty: innerHeight * 0.46,
      gutter: false, moved: false,
    };

    this.wallTile = this.buildWallTile();
    this.pattern = this.ctx.createPattern(this.wallTile, 'repeat');
    this.resize();
  }

  /* ---------- procedural limestone tile (seamless) ---------- */
  buildWallTile() {
    const c = document.createElement('canvas');
    c.width = TILE; c.height = TILE;
    const g = c.getContext('2d');
    const img = g.createImageData(TILE, TILE);
    const d = img.data;
    const rng = mulberry32(866);
    const N = this.noise;
    for (let y = 0; y < TILE; y++) {
      const uy = y / TILE;
      for (let x = 0; x < TILE; x++) {
        const ux = x / TILE;
        const n = N.fbmTile(ux, uy, 5, 6, 0.52);
        const m = N.fbmTile((ux + 0.37) % 1, (uy + 0.61) % 1, 3, 3, 0.5);
        let b = 0.53 + 0.68 * n;
        b *= 1 + 0.06 * Math.sin(uy * TAU * 3 + n * 2.6); // faint strata
        const warm = m;
        const i = (y * TILE + x) * 4;
        d[i] = Math.min(255, 158 * b * (0.94 + 0.12 * warm));
        d[i + 1] = Math.min(255, 129 * b * (0.96 + 0.05 * warm));
        d[i + 2] = Math.min(255, 102 * b * (1.05 - 0.14 * warm));
        d[i + 3] = 255;
      }
    }
    // mineral pores
    for (let k = 0; k < 9000; k++) {
      const i = (Math.floor(rng() * TILE) * TILE + Math.floor(rng() * TILE)) * 4;
      const f = 0.55 + rng() * 0.25;
      d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
    }
    g.putImageData(img, 0, 0);

    // cracks + calcite, drawn 9-way wrapped so the tile stays seamless
    const wrapped = fn => {
      for (const dx of [-TILE, 0, TILE]) for (const dy of [-TILE, 0, TILE]) {
        g.save(); g.translate(dx, dy); fn(); g.restore();
      }
    };
    for (let k = 0; k < 11; k++) {
      let x = rng() * TILE, y = rng() * TILE;
      let a = rng() * TAU;
      const steps = 20 + Math.floor(rng() * 52);
      const pts = [[x, y]];
      for (let s = 0; s < steps; s++) {
        a += (rng() - 0.5) * 0.8;
        x += Math.cos(a) * (3 + rng() * 4);
        y += Math.sin(a) * (3 + rng() * 4);
        pts.push([x, y]);
      }
      const lw = 0.6 + rng() * 1.0;
      wrapped(() => {
        g.strokeStyle = 'rgba(196,178,150,0.08)';
        g.lineWidth = lw + 1.0;
        g.beginPath(); g.moveTo(pts[0][0] + 1, pts[0][1] - 1);
        for (const [px, py] of pts) g.lineTo(px + 1, py - 1);
        g.stroke();
        g.strokeStyle = 'rgba(18,12,8,0.32)';
        g.lineWidth = lw;
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (const [px, py] of pts) g.lineTo(px, py);
        g.stroke();
      });
    }
    for (let k = 0; k < 11; k++) {
      const x = rng() * TILE, y = rng() * TILE, r = 30 + rng() * 85;
      wrapped(() => {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(214,203,182,0.14)');
        gr.addColorStop(1, 'rgba(214,203,182,0)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      });
    }
    return c;
  }

  /* ---------- macro shading slab (doc-space, continuous) ---------- */
  slab(idx) {
    let c = this.slabs.get(idx);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = 176; c.height = 400;
    const g = c.getContext('2d');
    const img = g.createImageData(c.width, c.height);
    const d = img.data;
    const y0 = idx * SLAB_H;
    for (let y = 0; y < c.height; y++) {
      const docY = y0 + (y / c.height) * SLAB_H;
      const dd = Math.min(1, docY / Math.max(1, this.docH)); // deeper = warmer, darker
      for (let x = 0; x < c.width; x++) {
        const n = this.macro.fbm(x * 0.028, docY * 0.0011, 3, 2.2, 0.55);
        let v = 0.66 + 0.62 * n;
        v = Math.max(0.42, Math.min(1.14, v)) * (1 - dd * 0.10);
        const i = (y * c.width + x) * 4;
        d[i] = 255 * v;
        d[i + 1] = 255 * v * (1 - dd * 0.05);
        d[i + 2] = 255 * v * (1 - dd * 0.13);
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    if (this.slabs.size > 10) this.slabs.delete(this.slabs.keys().next().value);
    this.slabs.set(idx, c);
    return c;
  }

  sparkPoints(idx) {
    let pts = this.sparks.get(idx);
    if (pts) return pts;
    const rng = mulberry32(idx * 7919 + 13);
    pts = [];
    const n = 15 + Math.floor(rng() * 8);
    for (let i = 0; i < n; i++) {
      pts.push({ u: rng(), y: idx * SLAB_H + rng() * SLAB_H, ph: rng() * 512, big: rng() < 0.18 });
    }
    this.sparks.set(idx, pts);
    return pts;
  }

  /* ---------- layout ---------- */
  layout(zones, docH) {
    this.docH = Math.max(1, docH);
    this.shaft = zones.shaft || null;
    this.slabs.clear();
    const vw = this.vw;
    const s = Math.max(0.42, Math.min(1, vw / 1050));
    this.paint = PAINTINGS.map(spec => {
      const z = zones[spec.zone];
      const w = spec.w * s, h = spec.h * s;
      const cx = Math.max(w / 2 + 14, Math.min(spec.u * vw, vw - w / 2 - 14));
      const cy = z.top + spec.v * z.height;
      return {
        spec, w, h, cx, cy,
        x: cx - w / 2, y: cy - h / 2,
        canvas: renderPainting(spec, w, h, this.dpr),
        discovered: this.discovered.has(spec.id),
        dwell: 0, flareT: this.discovered.has(spec.id) ? 99 : -1,
      };
    });
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.vw = innerWidth; this.vh = innerHeight;
    this.cv.width = Math.round(this.vw * this.dpr);
    this.cv.height = Math.round(this.vh * this.dpr);
    this.light.width = this.cv.width;
    this.light.height = this.cv.height;
    this.baseR = Math.max(235, Math.min(470, Math.min(this.vw, this.vh) * (this.coarse ? 0.62 : 0.52)));
    if (!this.torch.moved) {
      this.torch.tx = this.torch.sx = this.vw * 0.5;
      this.torch.ty = this.torch.sy = this.vh * 0.46;
    }
  }

  setTorch(x, y) {
    if (this.snuffT >= 0) return;
    this.torch.tx = x; this.torch.ty = y;
    this.torch.moved = true;
    this.torch.gutter = false;
  }
  nudgeTorch(dx, dy) {
    if (this.snuffT >= 0) return;
    const t = this.torch;
    t.tx = Math.max(20, Math.min(this.vw - 20, (t.moved ? t.tx : t.sx) + dx));
    t.ty = Math.max(20, Math.min(this.vh - 20, (t.moved ? t.ty : t.sy) + dy));
    t.moved = true; t.gutter = false;
  }
  setGutter(v) { if (this.snuffT < 0) this.torch.gutter = v; }
  snuff() { if (this.snuffT < 0) this.snuffT = 0; }

  // one shower of sparks off the wall when a painting is found
  burst(x, y) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * TAU, sp = 40 + Math.random() * 130;
      this.embers.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 45,
        life: 1, max: 0.8 + Math.random() * 0.9,
        ph: Math.random() * TAU, r: 0.7 + Math.random() * 1.3,
      });
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = now => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.time += dt;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  stop() { this.running = false; }

  /* ---------- per-frame ---------- */
  frame(dt) {
    const { ctx, lctx, vw, vh, dpr } = this;
    const sy = window.scrollY || 0;
    const t = this.torch;

    // torch inertia — the flame has weight
    const k = 1 - Math.exp(-dt * 9);
    t.sx += (t.tx - t.sx) * k;
    t.sy += (t.ty - t.sy) * k;

    const fl = this.reduced ? 0.55 : this.flick.flame(this.time);
    const flick = 0.78 + 0.44 * fl;
    const gut = t.gutter ? 0.4 : 1;

    // ignition ceremony: the torch is struck, sputters, and catches (~2 s)
    if (this.ignite < 1) this.ignite = Math.min(1, this.ignite + dt / 2.1);
    const igS = this.ignite * this.ignite * (3 - 2 * this.ignite);
    const catching = this.ignite < 1 ? 0.45 + 0.55 * this.flick.at(this.time * 16 + 40) : 1;
    let live = (0.06 + 0.94 * igS) * catching;
    // extinguishing: the flame dies ahead of the fade to black
    if (this.snuffT >= 0) {
      this.snuffT += dt;
      live *= Math.max(0, 1 - this.snuffT / 0.75);
    }

    const R = Math.max(1, this.baseR * gut * (0.90 + 0.16 * (flick - 0.78)) * live);
    const torchDocX = t.sx, torchDocY = t.sy + sy;

    /* ----- scene (fully lit) ----- */
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#080605';
    ctx.fillRect(0, 0, vw, vh);
    ctx.translate(0, -sy);

    ctx.fillStyle = this.pattern;
    ctx.fillRect(0, sy, vw, vh);

    // macro shading, doc-anchored slabs
    ctx.globalCompositeOperation = 'multiply';
    const s0 = Math.floor(sy / SLAB_H), s1 = Math.floor((sy + vh) / SLAB_H);
    for (let i = s0; i <= s1; i++) {
      ctx.drawImage(this.slab(i), 0, i * SLAB_H, vw, SLAB_H);
    }
    ctx.globalCompositeOperation = 'source-over';

    // paintings
    for (const p of this.paint) {
      if (p.y > sy + vh + 60 || p.y + p.h < sy - 60) continue;
      ctx.drawImage(p.canvas, p.x, p.y, p.w, p.h);
    }

    /* ----- light map ----- */
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lctx.globalCompositeOperation = 'source-over';
    lctx.fillStyle = '#000';
    lctx.fillRect(0, 0, vw, vh);
    lctx.globalCompositeOperation = 'lighter';

    // daylight, dying by ~40 m
    const dayF = Math.max(0, 1 - sy / (vh * 1.45));
    if (dayF > 0.004) {
      const a = Math.pow(dayF, 1.5);
      const g = lctx.createLinearGradient(0, -sy * 0.3, 0, vh * 0.96);
      g.addColorStop(0, `rgba(168,186,204,${0.95 * a})`);
      g.addColorStop(0.45, `rgba(120,134,150,${0.5 * a})`);
      g.addColorStop(1, 'rgba(80,90,104,0)');
      lctx.fillStyle = g;
      lctx.fillRect(0, 0, vw, vh);
    }

    // the memory of found panels — faint ember ambient
    for (const p of this.paint) {
      if (!p.discovered && p.flareT < 0) continue;
      const cxs = p.cx, cys = p.cy - sy;
      const rad = Math.hypot(p.w, p.h) * 0.72;
      if (cys + rad < 0 || cys - rad > vh) continue;
      let a = p.discovered ? 0.165 : 0;
      if (p.flareT >= 0 && p.flareT < 6) {
        const ft = p.flareT;
        const fa = ft < 0.4 ? ft / 0.4 : Math.exp(-(ft - 0.4) * 1.6);
        a += fa * 0.5;
      }
      if (a <= 0.002) continue;
      const g = lctx.createRadialGradient(cxs, cys, rad * 0.05, cxs, cys, rad);
      g.addColorStop(0, `rgba(226,196,168,${Math.min(1, a)})`);
      g.addColorStop(0.65, `rgba(172,132,98,${Math.min(1, a) * 0.45})`);
      g.addColorStop(1, 'rgba(110,80,56,0)');
      lctx.fillStyle = g;
      lctx.beginPath(); lctx.arc(cxs, cys, rad, 0, TAU); lctx.fill();
    }

    // the torch — honest falloff, hot core
    const warm = 0.5 + 0.5 * fl;
    const g = lctx.createRadialGradient(t.sx, t.sy, 0, t.sx, t.sy, R);
    g.addColorStop(0, `rgba(255,${222 + Math.round(12 * warm)},${178 + Math.round(22 * warm)},${gut < 1 ? 0.75 : 1})`);
    g.addColorStop(0.17, `rgba(255,${186 + Math.round(16 * warm)},116,${0.9 * gut})`);
    g.addColorStop(0.4, `rgba(232,140,62,${0.52 * gut})`);
    g.addColorStop(0.65, `rgba(146,78,34,${0.2 * gut})`);
    g.addColorStop(0.86, `rgba(56,26,11,${0.055 * gut})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g;
    lctx.beginPath(); lctx.arc(t.sx, t.sy, R, 0, TAU); lctx.fill();

    /* ----- composite ----- */
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(this.light, 0, 0, vw, vh);

    /* ----- additive air: bloom, sparkle, embers ----- */
    ctx.globalCompositeOperation = 'lighter';
    const bg = ctx.createRadialGradient(t.sx, t.sy, 0, t.sx, t.sy, R * 0.5);
    bg.addColorStop(0, `rgba(255,172,92,${(0.10 + 0.07 * fl) * gut * Math.min(1, live * 1.3)})`);
    bg.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(t.sx, t.sy, R * 0.5, 0, TAU); ctx.fill();

    // the flame itself — a small living kernel at your grip
    const kr = (9 + 5 * fl) * gut * (0.35 + 0.65 * live);
    for (const [ky, krr, aK] of [[-kr * 0.55, kr * 1.15, 0.35], [0, kr, 0.55]]) {
      const kg = ctx.createRadialGradient(t.sx, t.sy + ky, 0, t.sx, t.sy + ky, krr);
      kg.addColorStop(0, `rgba(255,244,218,${aK * gut})`);
      kg.addColorStop(0.45, `rgba(255,190,104,${aK * 0.55 * gut})`);
      kg.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = kg;
      ctx.beginPath(); ctx.arc(t.sx, t.sy + ky, krr, 0, TAU); ctx.fill();
    }

    // calcite glitter — only ever seen near the flame
    if (!this.reduced) {
      for (let i = s0; i <= s1; i++) {
        for (const sp of this.sparkPoints(i)) {
          const sx = sp.u * vw, sYs = sp.y - sy;
          const d = Math.hypot(sx - t.sx, sYs - t.sy);
          if (d > R * 0.8) continue;
          const tw = this.flick.at(this.time * 7 + sp.ph);
          if (tw < 0.45) continue;
          const a = (1 - d / (R * 0.8)) * (tw - 0.45) * 1.6 * gut;
          ctx.fillStyle = `rgba(255,242,214,${Math.min(0.9, a)})`;
          const r = sp.big ? 1.6 : 1.0;
          ctx.fillRect(sx - r / 2, sYs - r / 2, r, r);
          if (sp.big && a > 0.35) {
            ctx.fillStyle = `rgba(255,242,214,${a * 0.35})`;
            ctx.fillRect(sx - 3.5, sYs - 0.4, 7, 0.8);
            ctx.fillRect(sx - 0.4, sYs - 3.5, 0.8, 7);
          }
        }
      }

      // embers off the flame
      if (!t.gutter && live > 0.45 && this.embers.length < 60 && Math.random() < dt * 4.5) {
        this.embers.push({
          x: t.sx + (Math.random() - 0.5) * 10,
          y: t.sy + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 20,
          vy: -30 - Math.random() * 55,
          life: 1, max: 1.2 + Math.random() * 1.5,
          ph: Math.random() * TAU,
          r: 0.6 + Math.random() * 1.1,
        });
      }
      for (let i = this.embers.length - 1; i >= 0; i--) {
        const e = this.embers[i];
        e.life -= dt / e.max;
        if (e.life <= 0) { this.embers.splice(i, 1); continue; }
        e.x += (e.vx + Math.sin(this.time * 2.4 + e.ph) * 9) * dt;
        e.y += e.vy * dt;
        e.vy *= 1 - dt * 0.25;
        const lf = e.life;
        const rr = Math.round(255 * Math.min(1, lf * 1.6));
        const gg = Math.round(150 * lf * lf + 30);
        ctx.fillStyle = `rgba(${rr},${gg},${Math.round(30 * lf)},${0.85 * lf})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.5 + lf * 0.6), 0, TAU); ctx.fill();
      }

      // soot — faint smoke curling off the resin flame
      if (!t.gutter && this.snuffT < 0 && live > 0.35 &&
          this.smoke.length < 22 && Math.random() < dt * 2.2) {
        this.smoke.push({
          x: t.sx + (Math.random() - 0.5) * 6,
          y: t.sy - kr * 1.2,
          vx: (Math.random() - 0.5) * 7,
          vy: -26 - Math.random() * 18,
          life: 1, max: 2.4 + Math.random() * 1.8,
          ph: Math.random() * TAU,
          r: 2.5 + Math.random() * 3,
        });
      }
      ctx.globalCompositeOperation = 'source-over';
      for (let i = this.smoke.length - 1; i >= 0; i--) {
        const s = this.smoke[i];
        s.life -= dt / s.max;
        if (s.life <= 0) { this.smoke.splice(i, 1); continue; }
        s.x += (s.vx + Math.sin(this.time * 1.6 + s.ph) * 11) * dt;
        s.y += s.vy * dt;
        s.vy *= 1 - dt * 0.14;
        const age = 1 - s.life;
        const rr2 = s.r * (1 + age * 3.2);
        const a2 = 0.075 * Math.min(1, age * 5) * s.life;
        const sg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rr2);
        sg.addColorStop(0, `rgba(14,10,8,${a2})`);
        sg.addColorStop(1, 'rgba(14,10,8,0)');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(s.x, s.y, rr2, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'lighter';
    }
    /* ----- eye-shine, once, deep in the Puits ----- */
    if (!this.reduced && this.shaft) {
      const e = this.eyes;
      const mid = sy + vh * 0.5;
      if (e.state === 0 && mid > this.shaft.top + this.shaft.height * 0.25 &&
          mid < this.shaft.top + this.shaft.height * 0.9) {
        e.state = 1; e.t = 0;
        e.x = t.sx < vw / 2 ? vw * 0.82 : vw * 0.18;
        e.y = vh * (0.28 + 0.2 * Math.random());
      }
      if (e.state === 1) {
        e.t += dt;
        const tt = e.t;
        let a = 0;
        if (tt < 0.6) a = tt / 0.6;
        else if (tt < 2.3) a = 1;
        else if (tt < 2.8) a = 1 - (tt - 2.3) / 0.5;
        else e.state = 2;
        // two slow blinks
        if ((tt > 0.9 && tt < 0.99) || (tt > 1.78 && tt < 1.87)) a = 0;
        const dToTorch = Math.hypot(e.x - t.sx, e.y - t.sy);
        if (a > 0 && dToTorch > R * 0.9) {
          const aa = a * 0.55 * Math.min(1, (dToTorch - R * 0.9) / 120 + 0.35);
          for (const dx of [-8, 8]) {
            const gg = ctx.createRadialGradient(e.x + dx, e.y, 0, e.x + dx, e.y, 5);
            gg.addColorStop(0, `rgba(255,196,110,${aa})`);
            gg.addColorStop(0.5, `rgba(230,150,70,${aa * 0.5})`);
            gg.addColorStop(1, 'rgba(200,120,50,0)');
            ctx.fillStyle = gg;
            ctx.beginPath(); ctx.arc(e.x + dx, e.y, 5, 0, TAU); ctx.fill();
          }
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    /* ----- discovery ----- */
    for (const p of this.paint) {
      if (p.flareT >= 0) p.flareT += dt;
      if (p.discovered) continue;
      const d = Math.hypot(torchDocX - p.cx, torchDocY - p.cy);
      if (d < Math.max(p.w, p.h) * 0.62 && !t.gutter) {
        p.dwell += dt;
        if (p.dwell > 0.45) {
          p.discovered = true;
          p.flareT = 0;
          this.discovered.add(p.spec.id);
          if (!this.reduced) this.burst(p.cx, p.cy - sy);
          this.onDiscover(p.spec);
        }
      } else {
        p.dwell = Math.max(0, p.dwell - dt * 2);
      }
    }

    this.onFrame(sy);
  }
}
