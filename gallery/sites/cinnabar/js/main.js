/* ═══════════════════════════════════════════════════════════════
   CINNABAR & SMALT
   1. The drench — html[data-room] swap on scroll; whole site recolors
   2. The pour — canvas pigment mounds, grain by grain
   3. Quiet reveals, lights-up load
   ═══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(devicePixelRatio || 1, 2);

  /* ── pigment specimen definitions ─────────────────────────────
     w: half-width (fraction of canvas W)   h: height (fraction of H)
     mound mass encodes holding: tyrian is a pinch, prussian a heap */
  const PIGMENTS = {
    ultramarine: {
      base: [230, 72, 52], w: 0.165, h: 0.42,
      fleck: { color: [45, 74, 67], ratio: 0.022, size: 2.1 }, // pyrite, reads gold
    },
    vermilion: {
      base: [10, 88, 50], w: 0.195, h: 0.48,
    },
    tyrian: {
      base: [325, 44, 40], w: 0.052, h: 0.095, dish: true,
    },
    orpiment: {
      base: [45, 93, 54], w: 0.175, h: 0.44,
      fleck: { color: [50, 100, 80], ratio: 0.05, size: 1.9 }, // crystalline luster
    },
    prussian: {
      base: [212, 76, 24], w: 0.225, h: 0.55, litBoost: 0.02, hueJitter: 5,
    },
  };

  const THEME_COLORS = {
    vault: "#17151A", ultramarine: "#0E1B4D", vermilion: "#3E0D08",
    tyrian: "#2F0E2C", orpiment: "#E5A912", prussian: "#081726",
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function randn() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* ── mound renderer ── */
  class Mound {
    constructor(canvas, spec, { pourable = false } = {}) {
      this.cv = canvas;
      this.spec = spec;
      this.pourable = pourable && !REDUCED;
      this.poured = false;
      this.raf = null;
      this.build();
      if (!this.pourable) { this.stampAll(); this.compose(); }
      else this.compose(); // velvet plate waits for the pour
    }

    build() {
      const cv = this.cv;
      const W = (this.W = Math.max(10, cv.clientWidth));
      const H = (this.H = Math.max(10, cv.clientHeight));
      cv.width = Math.round(W * DPR);
      cv.height = Math.round(H * DPR);
      this.ctx = cv.getContext("2d");
      this.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      this.settled = document.createElement("canvas");
      this.settled.width = cv.width;
      this.settled.height = cv.height;
      this.sctx = this.settled.getContext("2d");
      this.sctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      this.makeGrains();
      this.paintPlate(this.sctx);
      this.stampIdx = 0;
    }

    makeGrains() {
      const { spec, W, H } = this;
      const cx = W * 0.5;
      const y0 = (this.y0 = H * 0.86);
      let halfW = spec.w * W * 2;                    // spec.w is fraction of W → halfW
      let hPx = spec.h * H;
      if (spec.dish) { halfW = Math.max(halfW, 18); hPx = Math.max(hPx, 11); } // a pinch must still read
      this.halfW = halfW; this.hPx = hPx;
      const ph1 = Math.random() * 6.28, ph2 = Math.random() * 6.28;
      const [bH, bS, bL] = spec.base;
      const litBoost = spec.litBoost || 0;

      const area = 2 * halfW * hPx;
      const N = clamp(Math.round(area * 0.62 / 2.1), 500, 13000);
      const grains = [];

      const profile = (u) =>
        Math.exp(-2.2 * u * u) *
        (1 + 0.05 * Math.sin(u * 7 + ph1) + 0.035 * Math.sin(u * 13 + ph2));

      for (let i = 0; i < N; i++) {
        let u = randn() * 0.40;
        if (u < -1 || u > 1) { i--; continue; } // reject, don't clamp — no edge towers
        const surf = hPx * profile(u);
        if (surf < 1) { i--; continue; }
        const hf = Math.pow(Math.random(), 1.0);      // 0 base → 1 near local surface
        const gy = y0 - hf * surf;
        const gx = cx + u * halfW + (Math.random() - 0.5) * 2;
        const heightFrac = (y0 - gy) / hPx;

        // lighting: sun from upper-left + altitude + jitter
        let lit = 0.58 - 0.30 * Math.tanh(2.1 * u) + 0.14 * heightFrac + (Math.random() - 0.5) * 0.3 + litBoost;
        if (heightFrac < 0.09 && Math.abs(u) > 0.65) lit -= 0.18; // occlusion at skirt
        lit = clamp(lit, 0.06, 1.25);

        let fill;
        const isFleck = spec.fleck && Math.random() < spec.fleck.ratio;
        if (isFleck) {
          const [fh, fs, fl] = spec.fleck.color;
          fill = `hsl(${fh},${fs}%,${clamp(fl * (0.8 + 0.4 * Math.random()), 30, 92)}%)`;
        } else {
          const gh = bH + (Math.random() - 0.5) * (spec.hueJitter || 9);
          const gs = clamp(bS * (0.82 + 0.3 * Math.random()), 8, 100);
          const gl = clamp(bL * (0.42 + 0.92 * lit), 6, 93);
          fill = `hsl(${gh.toFixed(1)},${gs.toFixed(1)}%,${gl.toFixed(1)}%)`;
        }
        const size = (isFleck ? (spec.fleck.size || 2) : 1.4 + Math.random() * 1.1);

        // pour timing: base lands first, apex last, edges trail
        const landT = clamp(
          1700 * (0.12 + 0.68 * heightFrac + 0.14 * Math.abs(u)) * (0.85 + 0.3 * Math.random()),
          40, 1700);
        const fallDur = 280 + Math.random() * 220;

        grains.push({ x: gx, y: gy, fill, size, landT, fallDur });
      }

      // spill apron at the base
      const M = Math.round(N * 0.045);
      for (let i = 0; i < M; i++) {
        const sx = cx + randn() * halfW * 1.9;
        if (Math.abs(sx - cx) > W * 0.46) continue;
        const sy = y0 - Math.random() * 2.5;
        const gl = clamp(bL * (0.4 + 0.5 * Math.random()), 6, 80);
        grains.push({
          x: sx, y: sy,
          fill: `hsl(${bH},${bS * 0.9}%,${gl}%)`,
          size: 1 + Math.random() * 1.2,
          landT: clamp(1700 * (0.3 + 0.65 * Math.random()), 40, 1700),
          fallDur: 280 + Math.random() * 220,
        });
      }

      grains.sort((a, b) => a.landT - b.landT);
      this.grains = grains;
      this.cx = cx;
    }

    /* velvet specimen plate — drawn, not photographed */
    paintPlate(c) {
      const { W, H, cx, y0, halfW } = this;
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1C191E");
      g.addColorStop(1, "#0F0D11");
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);

      // vignette
      const vg = c.createRadialGradient(cx, H * 0.55, H * 0.2, cx, H * 0.55, W * 0.72);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.42)");
      c.fillStyle = vg;
      c.fillRect(0, 0, W, H);

      // dust in the velvet
      c.fillStyle = "rgba(255,255,255,0.022)";
      for (let i = 0; i < 260; i++)
        c.fillRect(Math.random() * W, Math.random() * H, 1, 1);

      // shelf floor
      c.fillStyle = "rgba(0,0,0,0.22)";
      c.fillRect(0, y0, W, H - y0);
      c.fillStyle = "rgba(255,255,255,0.055)";
      c.fillRect(0, y0, W, 1);

      // cast shadow (light from upper-left)
      for (const [rx, a] of [[1.5, 0.16], [1.2, 0.2], [0.95, 0.26]]) {
        c.beginPath();
        c.ellipse(cx + halfW * 0.18, y0 + 2, halfW * rx + 6, 5.5 + rx * 2, 0, 0, 6.2832);
        c.fillStyle = `rgba(0,0,0,${a})`;
        c.fill();
      }

      // tyrian's pinch sits on a watch glass
      if (this.spec.dish) {
        const rx = Math.max(halfW * 3.4, W * 0.13);
        c.beginPath();
        c.ellipse(cx, y0, rx, rx * 0.16, 0, 0, 6.2832);
        c.strokeStyle = "rgba(255,255,255,0.13)";
        c.lineWidth = 1.2;
        c.stroke();
        c.beginPath();
        c.ellipse(cx, y0, rx, rx * 0.16, 0, Math.PI * 1.1, Math.PI * 1.6);
        c.strokeStyle = "rgba(255,255,255,0.30)";
        c.stroke();
      }
    }

    stampGrain(c, g) { c.fillStyle = g.fill; c.fillRect(g.x - g.size / 2, g.y - g.size / 2, g.size, g.size); }

    stampAll() {
      for (const g of this.grains) this.stampGrain(this.sctx, g);
      this.stampIdx = this.grains.length;
      this.poured = true;
    }

    compose() {
      this.ctx.clearRect(0, 0, this.W, this.H);
      this.ctx.drawImage(this.settled, 0, 0, this.W, this.H);
    }

    pour() {
      if (this.poured || this.pouring) { return; }
      if (!this.pourable) { return; }
      this.pouring = true;
      const t0 = performance.now();
      const spoutY = this.y0 - this.hPx - Math.min(90, this.H * 0.25);
      const step = (now) => {
        if (document.hidden) { this.finishPour(); return; }
        // scrolled away mid-pour: settle instantly, don't animate offscreen
        const r = this.cv.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) { this.finishPour(); return; }
        const el = now - t0;
        const gs = this.grains;
        while (this.stampIdx < gs.length && gs[this.stampIdx].landT <= el)
          this.stampGrain(this.sctx, gs[this.stampIdx++]);
        this.compose();
        // in-flight grains: pour cone from the spout
        const c = this.ctx;
        for (let i = this.stampIdx; i < gs.length; i++) {
          const g = gs[i];
          const start = g.landT - g.fallDur;
          if (start > el) { if (g.landT - 520 > el) break; else continue; }
          const t = clamp((el - start) / g.fallDur, 0, 1);
          const fx = this.cx + (g.x - this.cx) * Math.min(1, t * 1.55);
          const fy = spoutY + (g.y - spoutY) * t * t;
          c.globalAlpha = 0.9;
          c.fillStyle = g.fill;
          c.fillRect(fx - g.size / 2, fy - g.size / 2, g.size, g.size);
        }
        c.globalAlpha = 1;
        if (this.stampIdx >= gs.length) { this.finishPour(); return; }
        this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    }

    finishPour() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
      const gs = this.grains;
      while (this.stampIdx < gs.length) this.stampGrain(this.sctx, gs[this.stampIdx++]);
      this.poured = true;
      this.pouring = false;
      this.compose();
    }

    resize() {
      const wasPoured = this.poured || this.pouring;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.pouring = false;
      this.poured = false;
      this.build();
      if (wasPoured || !this.pourable) { this.stampAll(); }
      this.compose();
    }
  }

  /* ── build all mounds ── */
  const mounds = [];
  const minis = [];
  document.querySelectorAll("canvas.mini").forEach((cv) => {
    const spec = PIGMENTS[cv.dataset.pigment];
    if (spec) {
      const m = new Mound(cv, spec, { pourable: true });
      mounds.push(m);
      minis.push(m);
    }
  });
  // load choreography: the shelf fills left to right as the lights come up
  const tray = document.querySelector(".tray");
  if (tray && minis.length && !REDUCED) {
    const trayIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            minis.forEach((m, i) => setTimeout(() => m.pour(), 600 + i * 190));
            trayIO.disconnect();
            return;
          }
      },
      { threshold: 0.25 }
    );
    trayIO.observe(tray);
  }
  document.querySelectorAll("canvas.mound").forEach((cv) => {
    const spec = PIGMENTS[cv.dataset.pigment];
    if (!spec) return;
    const m = new Mound(cv, spec, { pourable: true });
    mounds.push(m);
    if (!REDUCED) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries)
            if (e.isIntersecting) { m.pour(); io.disconnect(); }
        },
        { threshold: 0.25 }
      );
      io.observe(cv);
    }
  });

  let rsT;
  addEventListener("resize", () => {
    clearTimeout(rsT);
    rsT = setTimeout(() => mounds.forEach((m) => m.resize()), 180);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) mounds.forEach((m) => { if (m.pouring) m.finishPour(); });
  });

  /* ── the drench ── */
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const railLinks = document.querySelectorAll("[data-room-link]");
  const whereami = document.getElementById("whereami");
  const WHERE = {
    vault: "VAULT B3", ultramarine: "ROOM I · ULTRAMARINE",
    vermilion: "ROOM II · VERMILION", tyrian: "ROOM III · TYRIAN PURPLE",
    orpiment: "ROOM IV · ORPIMENT", prussian: "ROOM V · PRUSSIAN BLUE",
  };
  let currentRoom = "vault";
  let whereT;

  function setRoom(room) {
    if (room === currentRoom) return;
    currentRoom = room;
    document.documentElement.dataset.room = room;
    if (metaTheme && THEME_COLORS[room]) metaTheme.setAttribute("content", THEME_COLORS[room]);
    railLinks.forEach((a) =>
      a.setAttribute("aria-current", a.dataset.roomLink === room ? "true" : "false")
    );
    if (whereami) {
      clearTimeout(whereT);
      whereami.classList.add("swap");
      whereT = setTimeout(() => {
        whereami.textContent = WHERE[room] || "VAULT B3";
        whereami.classList.remove("swap");
      }, 230);
    }
  }

  const themeIO = new IntersectionObserver(
    (entries) => {
      for (const e of entries)
        if (e.isIntersecting) setRoom(e.target.dataset.theme);
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );
  document.querySelectorAll("[data-theme]").forEach((s) => themeIO.observe(s));

  /* ── quiet reveals ── */
  if (!REDUCED) {
    const rvIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) { e.target.classList.add("in"); rvIO.unobserve(e.target); }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    document.querySelectorAll(".rv").forEach((el) => rvIO.observe(el));
  } else {
    document.querySelectorAll(".rv").forEach((el) => el.classList.add("in"));
  }

  /* ── lights up ── */
  requestAnimationFrame(() => setTimeout(() => document.body.classList.add("lit"), 90));
  // after the entrance, strip the stagger classes so the drench owns transitions
  setTimeout(() => {
    document.querySelectorAll(".rise").forEach((el) =>
      el.classList.remove("rise", "r1", "r2", "r3", "r4", "r5"));
  }, 2600);
})();
