/* ============================================================
   condensation.js — the glass you read through.
   Droplets bead up near the viewport edges, fatten, coalesce,
   and slide down leaving evaporating trails.
   ============================================================ */

import { clamp, TAU, fitCanvas } from './botany.js';

export class Condensation {
  constructor(canvas, reduced) {
    this.canvas = canvas;
    this.reduced = reduced;
    this.beads = [];
    this.runners = [];
    this.dropletCount = 0;
    this.resize();
    this.seedField();
    if (reduced) { this.drawStatic(); }
  }

  resize() {
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.ctx = fitCanvas(this.canvas, this.W, this.H);
    this.target = Math.min(110, Math.round((this.W * this.H) / 16000));
    this.buildMist();
  }

  /* the pane mists up at its edges — breath on glass. Half-res for softness. */
  buildMist() {
    const w = Math.max(2, this.W >> 1), h = Math.max(2, this.H >> 1);
    this.mist = document.createElement('canvas');
    this.mist.width = w; this.mist.height = h;
    const mc = this.mist.getContext('2d');
    const band = (x0, y0, x1, y1, a) => {
      const g = mc.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, `rgba(228,238,226,${a})`);
      g.addColorStop(1, 'rgba(228,238,226,0)');
      mc.fillStyle = g; mc.fillRect(0, 0, w, h);
    };
    band(0, 0, w * 0.15, 0, 0.30);
    band(w, 0, w * 0.85, 0, 0.30);
    band(0, 0, 0, h * 0.17, 0.24);
    band(0, h, 0, h * 0.86, 0.26);
    /* mottle it — condensation is never even */
    for (let i = 0; i < 130; i++) {
      const edge = Math.random();
      const x = edge < 0.5 ? Math.random() * w * 0.18 + (Math.random() < 0.5 ? 0 : w * 0.82)
        : Math.random() * w;
      const y = edge < 0.5 ? Math.random() * h
        : (Math.random() < 0.5 ? Math.random() * h * 0.2 : h - Math.random() * h * 0.16);
      const r = 6 + Math.random() * 26;
      const g = mc.createRadialGradient(x, y, 0, x, y, r);
      const out = Math.random() < 0.45;
      g.addColorStop(0, out ? 'rgba(228,238,226,0)' : 'rgba(236,244,234,0.10)');
      g.addColorStop(1, 'rgba(228,238,226,0)');
      if (out) { mc.globalCompositeOperation = 'destination-out'; g.addColorStop(0, 'rgba(0,0,0,0.14)'); }
      mc.fillStyle = g;
      mc.beginPath(); mc.arc(x, y, r, 0, TAU); mc.fill();
      mc.globalCompositeOperation = 'source-over';
    }
    /* wipe layer — where runners have cleared the fog */
    this.wipe = document.createElement('canvas');
    this.wipe.width = w; this.wipe.height = h;
    this.wipeCtx = this.wipe.getContext('2d');
    this.wipeFade = 0;
  }

  /* beads live mostly near the edges — the middle of the pane is where you read */
  spawnPos() {
    const { W, H } = this;
    const zone = Math.random();
    if (zone < 0.46) {           /* left / right margins */
      const side = Math.random() < 0.5;
      return [side ? Math.random() * W * 0.13 : W - Math.random() * W * 0.13, Math.random() * H];
    } else if (zone < 0.68) {    /* top band */
      return [Math.random() * W, Math.random() * H * 0.14];
    } else if (zone < 0.92) {    /* bottom band */
      return [Math.random() * W, H - Math.random() * H * 0.1];
    }
    /* rarely, off-centre — never over the reading column */
    const x = Math.random() < 0.5 ? Math.random() * W * 0.3 : W - Math.random() * W * 0.3;
    return [x, Math.random() * H];
  }

  addBead(prewarm = false) {
    const [x, y] = this.spawnPos();
    this.beads.push({
      x, y,
      r: prewarm ? 0.6 + Math.random() * 2.6 : 0.4 + Math.random() * 0.5,
      rate: 0.04 + Math.random() * 0.12,
      limit: 3.3 + Math.random() * 1.8,
      wob: Math.random() * TAU,
    });
    this.dropletCount++;
  }

  seedField() {
    for (let i = 0; i < this.target; i++) this.addBead(true);
  }

  update(dt, t) {
    const { beads, runners, H } = this;
    /* beads fatten */
    for (let i = beads.length - 1; i >= 0; i--) {
      const b = beads[i];
      b.r += b.rate * dt * (0.6 + 0.4 * Math.sin(t * 0.4 + b.wob));
      if (b.r > b.limit) {
        runners.push({ x: b.x, y: b.y, r: b.r, phase: Math.random() * TAU, trail: [] });
        beads.splice(i, 1);
      }
    }
    /* top up slowly */
    if (beads.length < this.target && Math.random() < 0.22) this.addBead();

    /* the fog slowly re-forms over old wipe tracks */
    this.wipeFade += dt;
    if (this.wipeFade > 0.25) {
      this.wipeCtx.globalCompositeOperation = 'destination-out';
      this.wipeCtx.fillStyle = `rgba(0,0,0,${Math.min(1, this.wipeFade * 0.05).toFixed(4)})`;
      this.wipeCtx.fillRect(0, 0, this.wipe.width, this.wipe.height);
      this.wipeCtx.globalCompositeOperation = 'source-over';
      this.wipeFade = 0;
    }

    /* runners slide */
    for (let i = runners.length - 1; i >= 0; i--) {
      const d = runners[i];
      const vy = (d.r - 1.6) * 26;
      d.y += vy * dt;
      d.x += Math.sin(t * 2.2 + d.phase) * 0.22 + Math.sin(t * 0.7 + d.phase * 2) * 0.12;
      d.r -= dt * 0.5;
      /* the runner wipes the misted pane clear along its path */
      this.wipeCtx.fillStyle = 'rgba(0,0,0,0.8)';
      this.wipeCtx.beginPath();
      this.wipeCtx.arc(d.x / 2, d.y / 2, Math.max(1.2, d.r * 0.95), 0, TAU);
      this.wipeCtx.fill();
      d.trail.push({ x: d.x, y: d.y, r: d.r * 0.5, a: 0.45 });
      if (d.trail.length > 34) d.trail.shift();
      for (const tp of d.trail) tp.a *= (1 - 1.4 * dt);
      /* absorb beads in the path */
      for (let j = beads.length - 1; j >= 0; j--) {
        const b = beads[j];
        if (Math.abs(b.x - d.x) < d.r + 2.5 && b.y > d.y - 2 && b.y < d.y + d.r + 6) {
          d.r = Math.min(7, d.r + b.r * 0.22);
          beads.splice(j, 1);
        }
      }
      if (d.y > H + 12 || d.r < 1.4) runners.splice(i, 1);
    }
  }

  drawDrop(x, y, r, alpha = 1) {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.30 * alpha})`);
    g.addColorStop(0.65, `rgba(224,236,222,${0.12 * alpha})`);
    g.addColorStop(1, `rgba(150,180,155,${0.05 * alpha})`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(32,57,43,${0.10 * alpha})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    /* specular */
    ctx.fillStyle = `rgba(255,255,255,${0.5 * alpha})`;
    ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.38, Math.max(0.4, r * 0.2), 0, TAU); ctx.fill();
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    /* misted pane, minus what the runners have wiped clear */
    ctx.drawImage(this.mist, 0, 0, this.W, this.H);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(this.wipe, 0, 0, this.W, this.H);
    ctx.globalCompositeOperation = 'source-over';
    for (const d of this.runners) {
      for (const tp of d.trail) {
        if (tp.a < 0.02) continue;
        ctx.fillStyle = `rgba(236,244,234,${(tp.a * 0.42).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(tp.x, tp.y, tp.r, 0, TAU); ctx.fill();
      }
    }
    for (const b of this.beads) this.drawDrop(b.x, b.y, b.r);
    for (const d of this.runners) this.drawDrop(d.x, d.y, d.r);
  }

  drawStatic() {
    this.draw();
  }

  tick(dt, t) {
    if (this.reduced) return;
    this.update(dt, t);
    this.draw();
  }
}
