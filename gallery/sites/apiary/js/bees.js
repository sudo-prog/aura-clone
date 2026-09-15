/* TENTH FLOOR APIARY — bees.js
   A small foraging swarm. Real boids (separation / alignment / cohesion)
   plus waypoint foraging between the comb clusters currently on screen.
   Individuals peel off, decelerate onto an open cell, sit wing-still for a
   moment, and rejoin the loop. */
(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.getElementById('bees');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return; // no 2d context: the comb still stands on its own
  const A = window.APIARY || {};

  let W = innerWidth, H = innerHeight, DPR = Math.min(devicePixelRatio || 1, 2);
  function fit() {
    W = innerWidth; H = innerHeight;
    DPR = Math.min(devicePixelRatio || 1, 2);
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  fit();
  addEventListener('resize', fit);

  const flowers = [...document.querySelectorAll('[data-flower]')];
  let flowerRects = [];
  let rectsDirty = true;
  addEventListener('scroll', () => { rectsDirty = true; }, { passive: true });
  addEventListener('resize', () => { rectsDirty = true; });
  function refreshRects() {
    flowerRects = flowers
      .map(el => ({ r: el.getBoundingClientRect(), edges: el.dataset.flower === 'edges' }))
      .filter(f => f.r.bottom > -160 && f.r.top < H + 160 && f.r.width > 40);
    rectsDirty = false;
  }

  function pickWaypoint() {
    if (rectsDirty) refreshRects();
    if (flowerRects.length) {
      const f = flowerRects[(Math.random() * flowerRects.length) | 0];
      const r = f.r;
      let fx = 0.12 + Math.random() * 0.76;
      if (f.edges) fx = Math.random() < 0.5 ? 0.03 + Math.random() * 0.22 : 0.75 + Math.random() * 0.22;
      return {
        x: r.left + r.width * fx,
        y: Math.max(60, Math.min(H - 40, r.top + r.height * (0.12 + Math.random() * 0.76))),
      };
    }
    return { x: W * (0.2 + Math.random() * 0.6), y: H * (0.2 + Math.random() * 0.6) };
  }

  function visibleLandable() {
    const list = (A.landables || []).filter(el => el.isConnected);
    for (let tries = 0; tries < 6 && list.length; tries++) {
      const el = list[(Math.random() * list.length) | 0];
      const r = el.getBoundingClientRect();
      if (r.top > 70 && r.bottom < H - 30 && r.left > 20 && r.right < W - 20) return el;
    }
    return null;
  }

  const COUNT = W < 760 ? 9 : 16;
  const bees = [];
  let sitting = 0;

  class Bee {
    constructor(i) {
      this.scale = 0.9 + Math.random() * 0.45;
      this.phase = Math.random() * Math.PI * 2;
      this.maxSpeed = 2.5 + Math.random() * 0.9;
      this.state = 'hidden';
      this.spawnAt = 700 + i * 130 + Math.random() * 220;
      this.landAt = performance.now() + 9000 + Math.random() * 16000;
      this.wp = pickWaypoint();
      this.wpUntil = 0;
      this.x = W + 30; this.y = H * 0.4;
      this.vx = -1; this.vy = 0.3;
      this.heading = Math.PI;
      this.cell = null;
      this.sitUntil = 0;
      this.alt = 1;        // flight altitude: 1 = on the wing, 0 = feet on wax
      this.altTarget = 1;
    }
    spawn(now) {
      const ent = document.getElementById('hiveEntrance');
      let ex = W - 40, ey = H * 0.4;
      if (ent) {
        const r = ent.getBoundingClientRect();
        if (r.top > -50 && r.top < H) { ex = r.left; ey = r.top; }
      }
      this.x = ex + 20; this.y = ey + (Math.random() - 0.5) * 40;
      this.vx = -1.5 - Math.random(); this.vy = (Math.random() - 0.5) * 1.4;
      this.state = 'forage';
      this.wp = pickWaypoint();
      this.wpUntil = now + 3500 + Math.random() * 3500;
    }
    steer(now) {
      // waypoint arrival / renewal
      const dwx = this.wp.x - this.x, dwy = this.wp.y - this.y;
      const wd = Math.hypot(dwx, dwy);
      if (wd < 36 || now > this.wpUntil) {
        this.wp = pickWaypoint();
        this.wpUntil = now + 3500 + Math.random() * 3500;
      }
      let ax = (dwx / (wd || 1)) * 0.055, ay = (dwy / (wd || 1)) * 0.055;
      // boids
      let sx = 0, sy = 0, alx = 0, aly = 0, cx = 0, cy = 0, n = 0;
      for (const o of bees) {
        if (o === this || o.state === 'hidden') continue;
        const dx = o.x - this.x, dy = o.y - this.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 3600) {
          n++;
          alx += o.vx; aly += o.vy; cx += o.x; cy += o.y;
          if (d2 < 700 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            sx -= (dx / d) * (1 - d / 26.5);
            sy -= (dy / d) * (1 - d / 26.5);
          }
        }
      }
      if (n) {
        ax += sx * 0.16 + ((alx / n) - this.vx) * 0.02 + ((cx / n - this.x)) * 0.0009;
        ay += sy * 0.16 + ((aly / n) - this.vy) * 0.02 + ((cy / n - this.y)) * 0.0009;
      }
      // wander
      ax += Math.sin(now * 0.004 + this.phase * 7) * 0.03;
      ay += Math.cos(now * 0.0035 + this.phase * 5) * 0.03;
      // soft walls
      if (this.x < 30) ax += 0.12; if (this.x > W - 30) ax -= 0.12;
      if (this.y < 70) ay += 0.12; if (this.y > H - 40) ay -= 0.12;
      this.vx += ax; this.vy += ay;
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > this.maxSpeed) { this.vx *= this.maxSpeed / sp; this.vy *= this.maxSpeed / sp; }
      this.x += this.vx; this.y += this.vy;
    }
    update(now) {
      this.alt += (this.altTarget - this.alt) * 0.07;
      if (this.state === 'hidden') {
        if (now > this.spawnAt) this.spawn(now);
        return;
      }
      if (this.state === 'forage') {
        this.altTarget = 1;
        this.steer(now);
        this.heading = Math.atan2(this.vy, this.vx);
        if (now > this.landAt && sitting < 3) {
          const cell = visibleLandable();
          if (cell) { this.cell = cell; this.state = 'approach'; sitting++; }
          else this.landAt = now + 5000 + Math.random() * 6000;
        }
        return;
      }
      if (this.state === 'approach') {
        const r = this.cell.getBoundingClientRect();
        if (r.bottom < 40 || r.top > H - 20) { this.abortLanding(now); return; }
        const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
        const dx = tx - this.x, dy = ty - this.y;
        const d = Math.hypot(dx, dy);
        this.altTarget = Math.max(0.1, Math.min(1, d / 160)); // descend as she closes in
        const sp = Math.min(this.maxSpeed, Math.max(0.4, d * 0.06));
        this.vx += ((dx / (d || 1)) * sp - this.vx) * 0.12;
        this.vy += ((dy / (d || 1)) * sp - this.vy) * 0.12;
        this.x += this.vx; this.y += this.vy;
        this.heading = Math.atan2(this.vy, this.vx);
        if (d < 4) {
          this.state = 'sit';
          this.altTarget = 0;
          this.sitUntil = now + 1600 + Math.random() * 2200;
          this.sitOx = 0; this.sitOy = 0;
        }
        return;
      }
      if (this.state === 'sit') {
        const r = this.cell.getBoundingClientRect();
        if (now > this.sitUntil || r.bottom < 40 || r.top > H - 20) {
          this.abortLanding(now);
          this.vx = (Math.random() - 0.5) * 3; this.vy = -2 - Math.random();
          return;
        }
        // walk a little on the cell face
        this.sitOx += (Math.random() - 0.5) * 0.5;
        this.sitOy += (Math.random() - 0.5) * 0.5;
        this.sitOx *= 0.96; this.sitOy *= 0.96;
        this.x = r.left + r.width / 2 + this.sitOx * 6;
        this.y = r.top + r.height / 2 + this.sitOy * 6;
        this.heading += 0.015;
      }
    }
    abortLanding(now) {
      this.state = 'forage';
      this.cell = null;
      sitting = Math.max(0, sitting - 1);
      this.landAt = now + 9000 + Math.random() * 14000;
      this.wp = pickWaypoint();
      this.wpUntil = now + 4000;
    }
    draw(now, flick) {
      if (this.state === 'hidden') return;
      const alt = this.alt;
      const s = this.scale * (0.88 + 0.18 * alt); // higher = nearer the camera
      const bobY = this.state === 'sit' ? 0 : Math.sin(now * 0.012 + this.phase) * 1.3;
      // cast shadow drifts under her and snaps tight as she lands
      if (alt > 0.03) {
        ctx.save();
        ctx.translate(this.x + 3 + 6 * alt, this.y + bobY + 5 + 10 * alt);
        ctx.rotate(this.heading + Math.PI / 2);
        ctx.fillStyle = `rgba(56, 34, 13, ${(0.16 - 0.09 * alt).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4 * s * (1 + 0.5 * alt), 5.2 * s * (1 + 0.5 * alt) * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(this.x, this.y + bobY);
      ctx.rotate(this.heading + Math.PI / 2); // body drawn pointing up
      ctx.scale(s, s);
      // wings
      if (this.state !== 'sit') {
        const wa = flick ? 0.95 : 0.35;
        ctx.fillStyle = 'rgba(255, 252, 240, 0.55)';
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.rotate(side * wa);
          ctx.beginPath();
          ctx.ellipse(side * 3.4, -1.2, 4.6, 2.1, side * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else {
        ctx.fillStyle = 'rgba(255, 252, 240, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 2.4, 2.1, 4.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // abdomen
      ctx.fillStyle = '#E8A81E';
      ctx.beginPath();
      ctx.ellipse(0, 2.2, 3.1, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // stripes
      ctx.strokeStyle = '#38220D';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-2.6, 1.4); ctx.lineTo(2.6, 1.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2.4, 4); ctx.lineTo(2.4, 4); ctx.stroke();
      // thorax + head
      ctx.fillStyle = '#7A5230';
      ctx.beginPath(); ctx.ellipse(0, -2.6, 2.6, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#38220D';
      ctx.beginPath(); ctx.arc(0, -6.2, 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < COUNT; i++) bees.push(new Bee(i));

  let running = !document.hidden;
  let raf = 0;
  let frame = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    frame++;
    if (frame % 40 === 0) rectsDirty = true;
    ctx.clearRect(0, 0, W, H);
    const flick = (frame & 1) === 1;
    for (const b of bees) { b.update(now); b.draw(now, flick); }
  }
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) raf = requestAnimationFrame(loop);
    else { cancelAnimationFrame(raf); ctx.clearRect(0, 0, W, H); }
  }
  document.addEventListener('visibilitychange', () => setRunning(!document.hidden));
  if (running) raf = requestAnimationFrame(loop);
})();
