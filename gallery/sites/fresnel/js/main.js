/* ═══════════════════════════════════════════════════════════════════
   STATION FRESNEL — the light engine
   Character: Fl(2) W 15s — two white flashes every fifteen seconds,
   timed against the real clock. Fog: HORN(2) 30s takes the rhythm.
   ═══════════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);
  const SVGNS = "http://www.w3.org/2000/svg";
  const rmq = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = rmq.matches;

  /* ── geometry helpers ─────────────────────────────────────────── */
  const CX = 320, CY = 470;                 // lamp centre in lens viewBox
  const rad = (d) => (d * Math.PI) / 180;
  // point at r, angle a (degrees clockwise from straight up)
  const pt = (r, a) => [CX + r * Math.sin(rad(a)), CY - r * Math.cos(rad(a))];
  const arcPath = (r, a0, a1) => {
    const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1);
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };

  /* ═══ BUILD THE OPTIC ═══════════════════════════════════════════
     Bullseye: nine refracting rings. Crown: 13 catadioptric prisms.
     Base: 6. Front elevation, works-plate style.                   */

  const RINGS = [
    { r: 0,  w: 0,  disk: 26 },            // central disk
    { r: 48, w: 18 }, { r: 74, w: 16 }, { r: 100, w: 14 }, { r: 126, w: 13 },
    { r: 152, w: 12 }, { r: 178, w: 11 }, { r: 204, w: 10 }, { r: 228, w: 9 },
  ];
  const CROWN = { n: 13, r0: 264, step: 13.5, w: 9, a: 48 };  // upper prisms
  const BASE  = { n: 6,  r0: 264, step: 15,  w: 10, a: 46 };  // lower prisms

  function buildGlass(group, stroke, alphaScale, forGlint) {
    let idx = 0;
    const add = (el, op) => {
      el.setAttribute("opacity", (op * alphaScale).toFixed(3));
      if (!forGlint) el.style.animationDelay = `${idx * 55}ms`;
      idx++;
      group.appendChild(el);
    };
    // central disk
    const disk = document.createElementNS(SVGNS, "circle");
    disk.setAttribute("cx", CX); disk.setAttribute("cy", CY);
    disk.setAttribute("r", RINGS[0].disk);
    disk.setAttribute("fill", stroke); disk.setAttribute("stroke", "none");
    add(disk, 0.85);
    // refracting rings
    RINGS.slice(1).forEach((rg, i) => {
      const c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("cx", CX); c.setAttribute("cy", CY); c.setAttribute("r", rg.r);
      c.setAttribute("fill", "none");
      c.setAttribute("stroke", stroke); c.setAttribute("stroke-width", rg.w);
      add(c, 0.9 - i * 0.055);
    });
    // crown prisms (upper catadioptric arcs)
    for (let i = 0; i < CROWN.n; i++) {
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", arcPath(CROWN.r0 + i * CROWN.step, -CROWN.a, CROWN.a));
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", stroke); p.setAttribute("stroke-width", CROWN.w);
      add(p, 0.72 - i * 0.034);
    }
    // base prisms (lower catadioptric arcs)
    for (let i = 0; i < BASE.n; i++) {
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", arcPath(BASE.r0 + i * BASE.step, 180 - BASE.a, 180 + BASE.a));
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", stroke); p.setAttribute("stroke-width", BASE.w);
      add(p, 0.62 - i * 0.05);
    }
  }

  function buildBrass(group) {
    const add = (el) => group.appendChild(el);
    const line = (x1, y1, x2, y2, w, op) => {
      const l = document.createElementNS(SVGNS, "line");
      l.setAttribute("x1", x1); l.setAttribute("y1", y1);
      l.setAttribute("x2", x2); l.setAttribute("y2", y2);
      l.setAttribute("stroke", "url(#brassV)");
      l.setAttribute("stroke-width", w); l.setAttribute("opacity", op);
      add(l);
    };
    // bullseye rim
    const rim = document.createElementNS(SVGNS, "circle");
    rim.setAttribute("cx", CX); rim.setAttribute("cy", CY); rim.setAttribute("r", 248);
    rim.setAttribute("fill", "none");
    rim.setAttribute("stroke", "url(#brassV)"); rim.setAttribute("stroke-width", 5);
    add(rim);
    // crown + base outer borders
    const crownEdge = document.createElementNS(SVGNS, "path");
    crownEdge.setAttribute("d", arcPath(CROWN.r0 + CROWN.n * CROWN.step + 2, -CROWN.a - 2, CROWN.a + 2));
    crownEdge.setAttribute("fill", "none");
    crownEdge.setAttribute("stroke", "url(#brassV)"); crownEdge.setAttribute("stroke-width", 4);
    add(crownEdge);
    const baseEdge = document.createElementNS(SVGNS, "path");
    baseEdge.setAttribute("d", arcPath(BASE.r0 + BASE.n * BASE.step + 2, 180 - BASE.a - 2, 180 + BASE.a + 2));
    baseEdge.setAttribute("fill", "none");
    baseEdge.setAttribute("stroke", "url(#brassV)"); baseEdge.setAttribute("stroke-width", 4);
    add(baseEdge);
    // radial frame bars through crown and base
    const crownR1 = CROWN.r0 - 6, crownR2 = CROWN.r0 + CROWN.n * CROWN.step + 4;
    [-48, -24, 0, 24, 48].forEach((a) => {
      const [x1, y1] = pt(crownR1, a), [x2, y2] = pt(crownR2, a);
      line(x1, y1, x2, y2, 2.5, 0.6);
    });
    const baseR1 = BASE.r0 - 6, baseR2 = BASE.r0 + BASE.n * BASE.step + 4;
    [156, 180, 204].forEach((a) => {
      const [x1, y1] = pt(baseR1, a), [x2, y2] = pt(baseR2, a);
      line(x1, y1, x2, y2, 2.5, 0.55);
    });
    // panel astragals — this panel and the neighbours' edges
    line(CX - 252, CY - 210, CX - 252, CY + 236, 3, 0.55);
    line(CX + 252, CY - 210, CX + 252, CY + 236, 3, 0.55);
    line(CX - 300, CY - 140, CX - 300, CY + 210, 2, 0.28);
    line(CX + 300, CY - 140, CX + 300, CY + 210, 2, 0.28);
    // pedestal column between base prisms and mercury bath
    line(CX - 60, CY + 366, CX - 60, CY + 382, 3, 0.5);
    line(CX + 60, CY + 366, CX + 60, CY + 382, 3, 0.5);
  }

  function buildGlazing(group) {
    // faint diagonal lantern glazing behind the optic
    for (let i = -4; i <= 8; i++) {
      const l1 = document.createElementNS(SVGNS, "line");
      l1.setAttribute("x1", i * 160 - 300); l1.setAttribute("y1", 0);
      l1.setAttribute("x2", i * 160 + 240); l1.setAttribute("y2", 940);
      l1.setAttribute("stroke", "#22323e"); l1.setAttribute("stroke-width", 1.5);
      l1.setAttribute("opacity", 0.5);
      group.appendChild(l1);
      const l2 = document.createElementNS(SVGNS, "line");
      l2.setAttribute("x1", i * 160 + 240); l2.setAttribute("y1", 0);
      l2.setAttribute("x2", i * 160 - 300); l2.setAttribute("y2", 940);
      l2.setAttribute("stroke", "#22323e"); l2.setAttribute("stroke-width", 1.5);
      l2.setAttribute("opacity", 0.5);
      group.appendChild(l2);
    }
  }

  function buildRoseTicks(group) {
    for (let a = 0; a < 360; a += 5) {
      const long = a % 15 === 0;
      const t = document.createElementNS(SVGNS, "line");
      const r1 = long ? 420 : 429, r2 = 440;
      const x1 = 500 + r1 * Math.sin(rad(a)), y1 = 500 - r1 * Math.cos(rad(a));
      const x2 = 500 + r2 * Math.sin(rad(a)), y2 = 500 - r2 * Math.cos(rad(a));
      t.setAttribute("x1", x1.toFixed(1)); t.setAttribute("y1", y1.toFixed(1));
      t.setAttribute("x2", x2.toFixed(1)); t.setAttribute("y2", y2.toFixed(1));
      t.setAttribute("stroke-width", long ? 1.6 : 1);
      group.appendChild(t);
    }
  }

  buildGlass($("glassDim"), "url(#glassV)", 1, false);
  buildBrass($("brasswork"));
  buildGlass($("glassLit"), "url(#litV)", 0.95, true);
  buildGlass($("glassGlint"), "#FFFFFF", 0.5, true);
  buildGlazing($("glazing"));
  buildRoseTicks($("roseTicks"));

  /* ═══ FOG — canvas, rolls in and out ════════════════════════════ */

  const fogCanvas = $("fog");
  const fctx = fogCanvas.getContext("2d");
  let fw = 0, fh = 0, dpr = 1;

  function sizeFog() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    fw = innerWidth; fh = innerHeight;
    fogCanvas.width = Math.round(fw * dpr);
    fogCanvas.height = Math.round(fh * dpr);
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeFog();

  // pre-rendered soft noise tiles (small noise upscaled = cheap blur)
  function makeFogTile(seed, size) {
    const small = document.createElement("canvas");
    const n = 72; small.width = n; small.height = n;
    const sctx = small.getContext("2d");
    const img = sctx.createImageData(n, n);
    let s = seed;
    const rand = () => (s = (s * 16807 + 11) % 2147483647) / 2147483647;
    // low-frequency value noise, two octaves
    const g1 = [], g2 = [], G1 = 7, G2 = 17;
    for (let i = 0; i <= G1; i++) { g1[i] = []; for (let j = 0; j <= G1; j++) g1[i][j] = rand(); }
    for (let i = 0; i <= G2; i++) { g2[i] = []; for (let j = 0; j <= G2; j++) g2[i][j] = rand(); }
    const lerp = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
    const sample = (g, G, x, y) => {
      const fx = (x / n) * G, fy = (y / n) * G;
      const ix = Math.floor(fx) % G, iy = Math.floor(fy) % G;
      const tx = fx - Math.floor(fx), ty = fy - Math.floor(fy);
      return lerp(lerp(g[ix][iy], g[ix + 1][iy], tx), lerp(g[ix][iy + 1], g[ix + 1][iy + 1], tx), ty);
    };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = sample(g1, G1, x, y) * 0.65 + sample(g2, G2, x, y) * 0.35;
      const a = Math.max(0, v - 0.32) / 0.68;
      const k = (y * n + x) * 4;
      img.data[k] = 178; img.data[k + 1] = 194; img.data[k + 2] = 185;
      img.data[k + 3] = Math.round(Math.pow(a, 1.5) * 255);
    }
    sctx.putImageData(img, 0, 0);
    const tile = document.createElement("canvas");
    tile.width = size; tile.height = size;
    const tctx = tile.getContext("2d");
    tctx.imageSmoothingEnabled = true; tctx.imageSmoothingQuality = "high";
    tctx.drawImage(small, 0, 0, size, size);
    return tile;
  }
  const tiles = [makeFogTile(1849, 640), makeFogTile(1987, 640)];
  const FOG_LAYERS = [
    { tile: 0, speed: 14, dir: 1, scale: 2.4, alpha: 0.24, yoff: -0.15 },
    { tile: 1, speed: 9,  dir: -1, scale: 3.1, alpha: 0.20, yoff: 0.1 },
    { tile: 0, speed: 22, dir: 1, scale: 1.8, alpha: 0.15, yoff: 0.35 },
    { tile: 1, speed: 5,  dir: -1, scale: 4.0, alpha: 0.17, yoff: -0.4 },
  ];

  let fogDensity = 0, fogTarget = 0, fogWasDrawn = false;

  function drawFog(t) {
    if (fogDensity < 0.004) {
      if (fogWasDrawn) { fctx.clearRect(0, 0, fw, fh); fogWasDrawn = false; }
      return;
    }
    fogWasDrawn = true;
    fctx.clearRect(0, 0, fw, fh);
    for (const L of FOG_LAYERS) {
      const tile = tiles[L.tile];
      const size = Math.max(fw, fh) * L.scale;
      const x = ((t * L.speed * L.dir) % size + size) % size;
      const y = fh * L.yoff + Math.sin(t * 0.05 + L.tile * 3) * 30;
      fctx.globalAlpha = fogDensity * L.alpha;
      fctx.drawImage(tile, x - size, y, size, size);
      fctx.drawImage(tile, x, y, size, size);
      if (fw > size) fctx.drawImage(tile, x + size, y, size, size);
    }
    fctx.globalAlpha = 1;
  }

  /* ═══ THE CLOCK — Fl(2) W 15s, honest ═══════════════════════════ */

  const PERIOD = 15;                 // one revolution
  const SPOKE_GAP = 72;              // deg between the pair → 3 s between flashes
  const FLASH_HALF = 13;             // deg half-width of the bloom
  const BAND_HALF = 26;              // deg half-width of the grazing pass

  const HORN_PERIOD = 30;            // HORN(2) 30s
  const BLASTS = [[0, 2.5], [5, 7.5]];

  const beamA = $("beamA"), beamB = $("beamB");
  const glintBand = $("glintBand");
  const lightCursor = $("lightCursor"), hornCursor = $("hornCursor");
  const lightWheel = lightCursor.parentElement, hornWheel = hornCursor.parentElement;
  const sigClock = $("sigClock");
  const sigPhase = $("sigPhase");
  const signal = $("signal");
  const ripples = $("ripples");
  const hero = document.querySelector(".hero");
  const dialArc = $("dialArc");
  const DIAL_C = 1608.5;
  const wxlog = $("wxlog");
  let wxTimer = 0;

  function wx(msg) {
    wxlog.textContent = `${new Date().toISOString().slice(11, 16)} UT — ${msg}`;
    wxlog.classList.add("show");
    clearTimeout(wxTimer);
    wxTimer = setTimeout(() => wxlog.classList.remove("show"), 8000);
  }

  const angDiff = (a, b) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
  const smooth = (x) => x * x * (3 - 2 * x);

  /* cached wheel widths — no layout reads inside the frame loop.
     A wheel hidden by the mobile media query measures 0: keep the
     last known width, and re-measure whenever the fog mode flips. */
  let lightW = 180, hornW = 180;
  function measureWheels() {
    lightW = lightWheel.offsetWidth || lightW;
    hornW = hornWheel.offsetWidth || hornW;
  }
  measureWheels();

  let hornEpoch = -1e9;
  let hornArmed = [false, false];
  let heroVisible = true;
  let running = false, rafId = 0;
  let lastClockText = "", lastPhaseText = "";

  const setVar = (name, value) => root.style.setProperty(name, value);

  function frame() {
    const now = Date.now() / 1000;
    const cyc = now % PERIOD;

    /* spokes: spoke A crosses OBSERVER (180°) at t≡0, spoke B at t≡3 */
    const th1 = (180 + (cyc / PERIOD) * 360) % 360;
    const th2 = (th1 - SPOKE_GAP + 360) % 360;

    const d1 = angDiff(th1, 180), d2 = angDiff(th2, 180);
    const f1 = smooth(Math.max(0, 1 - Math.abs(d1) / FLASH_HALF));
    const f2 = smooth(Math.max(0, 1 - Math.abs(d2) / FLASH_HALF));
    const flash = Math.max(f1, f2);

    /* grazing band: sweeps right → left as a spoke crosses the page */
    let bandx = -60, bandop = 0;
    const dBand = Math.abs(d1) <= BAND_HALF ? d1 : (Math.abs(d2) <= BAND_HALF ? d2 : null);
    if (dBand !== null) {
      const p = (dBand + BAND_HALF) / (BAND_HALF * 2);
      bandx = 104 - p * 140;
      bandop = Math.sin(Math.PI * p) * 0.9;
    }

    /* fog density: ease toward target — fog takes its time */
    fogDensity += (fogTarget - fogDensity) * 0.004;
    if (Math.abs(fogTarget - fogDensity) < 0.003) fogDensity = fogTarget;
    const foggy = fogDensity > 0.5;

    /* foghorn — owns the rhythm in fog */
    let blast = 0, hornFrac = 0;
    if (foggy) {
      if (!signal.classList.contains("fog")) {
        signal.classList.add("fog");
        document.body.classList.add("foggy");
        measureWheels();                         // horn wheel may have just become visible
        hornEpoch = now - (HORN_PERIOD - 2.5);   // first blast 2.5 s after fog settles
        hornArmed = [true, true];
        wx("FOG BANK CLOSING IN · VIS 300 M · HORN(2) 30s SOUNDING");
      }
      const hc = (now - hornEpoch) % HORN_PERIOD;
      hornFrac = hc / HORN_PERIOD;
      BLASTS.forEach(([b0, b1], i) => {
        if (hc >= b0 && hc < b1) {
          const tin = hc - b0, tout = b1 - hc;
          blast = Math.max(blast, Math.min(1, tin / 0.3, tout / 0.5));
          if (hornArmed[i] && heroVisible && !reduced) { hornArmed[i] = false; spawnRipple(); }
        } else if (hc > b1) {
          hornArmed[i] = true;
        }
      });
    } else if (signal.classList.contains("fog")) {
      signal.classList.remove("fog");
      document.body.classList.remove("foggy");
      measureWheels();                           // light wheel may have just become visible
      wx("FOG LIFTING · HORN SECURED · LIGHT KEEPS THE WATCH");
    }

    /* write the lighting state */
    setVar("--flash", flash.toFixed(3));
    setVar("--fog", fogDensity.toFixed(3));
    setVar("--blast", blast.toFixed(3));
    setVar("--bandx", bandx.toFixed(2) + "vw");
    setVar("--bandop", bandop.toFixed(3));

    if (heroVisible) {
      beamA.style.transform = `rotate(${(th1 - 90).toFixed(2)}deg)`;
      beamB.style.transform = `rotate(${(th2 - 90).toFixed(2)}deg)`;
      setVar("--face1", f1.toFixed(3));
      setVar("--face2", f2.toFixed(3));
      /* prism glint rolls across the bullseye with the rotation */
      const gx = CX + Math.sin(rad(th1)) * 300 - 75;
      glintBand.setAttribute("x", gx.toFixed(1));
    }

    /* signal strip */
    lightCursor.style.transform = `translateX(${((cyc / PERIOD) * lightW).toFixed(1)}px)`;
    hornCursor.style.transform = `translateX(${(hornFrac * hornW).toFixed(1)}px)`;
    const clockText = new Date().toISOString().slice(11, 19) + " UT";
    if (clockText !== lastClockText) { lastClockText = clockText; sigClock.textContent = clockText; }

    /* eclipse readout — chart language: FLASH, then count the dark */
    const since = cyc >= 3 ? cyc - 3 : cyc;
    const phaseText = flash > 0.03 ? "FLASH" : "ECL " + since.toFixed(1).padStart(4, "0");
    if (phaseText !== lastPhaseText) {
      lastPhaseText = phaseText;
      sigPhase.textContent = phaseText;
      sigPhase.classList.toggle("lit", flash > 0.03);
    }

    /* the optic is the clock: 15 s progress arc around the bullseye rim */
    if (heroVisible) {
      dialArc.style.strokeDashoffset = (DIAL_C * (1 - cyc / PERIOD)).toFixed(1);
    }

    drawFog(performance.now() / 1000);

    if (running) rafId = requestAnimationFrame(frame);
  }

  function spawnRipple() {
    const r = document.createElement("div");
    r.className = "rip";
    ripples.appendChild(r);
    r.addEventListener("animationend", () => r.remove());
  }

  function start() { if (!running && !reduced) { running = true; rafId = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  /* ═══ CONDITIONS SWITCH + AUTONOMOUS WEATHER ════════════════════ */

  const fogSwitch = $("fogSwitch");
  const condValue = $("condValue");
  let nextAuto = Date.now() / 1000 + 75;

  function setFog(target, manual) {
    fogTarget = target;
    fogSwitch.setAttribute("aria-pressed", target ? "true" : "false");
    condValue.textContent = target ? "FOG" : "CLEAR";
    nextAuto = Date.now() / 1000 + (manual ? 90 : target ? 48 : 75);
    if (reduced) {           // static render for reduced motion
      fogDensity = target ? 0.55 : 0;
      drawFog(1000);
      signal.classList.toggle("fog", !!target);
      document.body.classList.toggle("foggy", !!target);
      if (manual) wx(target ? "FOG BANK CLOSING IN · HORN(2) 30s SOUNDING"
                           : "FOG LIFTING · LIGHT KEEPS THE WATCH");
    }
  }
  fogSwitch.addEventListener("click", () => setFog(fogTarget > 0.5 ? 0 : 1, true));

  setInterval(() => {
    /* the weather only turns while someone is watching — no hidden-tab
       churn, and no unrequested cuts for reduced-motion readers */
    if (document.hidden || reduced) return;
    const now = Date.now() / 1000;
    if (now >= nextAuto) setFog(fogTarget > 0.5 ? 0 : 1, false);
  }, 4000);

  if (/[?#&]fog/.test(location.href)) {
    fogDensity = 1;
    setFog(1, true);
    hornEpoch = Date.now() / 1000 - (HORN_PERIOD - 4);
    signal.classList.add("fog");
    document.body.classList.add("foggy");
    measureWheels();
  }

  /* ═══ REVEALS ═══════════════════════════════════════════════════ */

  const reveals = document.querySelectorAll(".reveal");
  if (reduced) {
    reveals.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });
    reveals.forEach((el) => io.observe(el));
  }

  /* keeper + plate stagger (they reveal individually) */
  document.querySelectorAll(".keeper.reveal, .plate-row").forEach((el, i) => {
    el.style.setProperty("--d", `${(i % 4) * 80}ms`);
  });

  /* ═══ LIFECYCLE ═════════════════════════════════════════════════ */

  const heroIO = new IntersectionObserver((entries) => {
    heroVisible = entries[0].isIntersecting;
  }, { threshold: 0 });
  heroIO.observe(hero);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { stop(); return; }
    start();
    /* returning to the tab: hold the weather a moment before it turns */
    nextAuto = Math.max(nextAuto, Date.now() / 1000 + 25);
  });
  addEventListener("resize", () => { sizeFog(); measureWheels(); });

  /* honor a mid-visit change of the reduced-motion preference */
  rmq.addEventListener("change", (e) => {
    reduced = e.matches;
    if (reduced) {
      stop();
      /* clear the inline lighting state so the stylesheet's
         reduced-motion values (steady --flash: .3) take over */
      ["--flash", "--fog", "--blast", "--bandx", "--bandop", "--face1", "--face2"]
        .forEach((v) => root.style.removeProperty(v));
      reveals.forEach((el) => el.classList.add("in"));
      document.body.classList.add("lit");
      sigPhase.textContent = "STEADY";
      sigPhase.classList.remove("lit");
      fogDensity = fogTarget > 0.5 ? 0.55 : 0;
      drawFog(1000);
      signal.classList.toggle("fog", fogTarget > 0.5);
      document.body.classList.toggle("foggy", fogTarget > 0.5);
    } else if (!document.hidden) {
      start();
    }
  });

  /* night-vision settle: veil lifts, rings draw in */
  const lit = () => document.body.classList.add("lit");
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => setTimeout(lit, 120));
  } else {
    setTimeout(lit, 400);
  }

  if (reduced) {
    document.body.classList.add("lit");
    sigClock.textContent = new Date().toISOString().slice(11, 19) + " UT";
    sigPhase.textContent = "STEADY";
  } else {
    start();
  }
})();
