/* ==========================================================================
   VELODROMO D'INVERNO — banked-oval engine
   Canvas 2D pseudo-3D board track. A paceline that really rotates,
   a breakaway with real pace dynamics, ghost-trail motion blur.
   ========================================================================== */
(() => {
  "use strict";

  const canvas = document.getElementById("track");
  const wrap = document.getElementById("heroCanvasWrap");
  if (!canvas || !wrap) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) { wrap.style.display = "none"; return; }   // designed fallback: the poster type carries the hero
  const rmq = matchMedia("(prefers-reduced-motion: reduce)");
  let REDUCED = rmq.matches;

  /* ---------- track geometry (metres) ---------- */
  const ST = 56;                       // straight length
  const R = 22;                        // turn radius
  const TL = Math.PI * R;              // turn arc length
  const LAP = 2 * ST + 2 * TL;         // ≈ 250.2 m
  const TRACK_W = 8;                   // board width
  const ROT = 0.22;                    // plan rotation (poster diagonal)
  const TILT = 0.44;                   // vertical foreshortening
  const ZK = 0.62;                     // banking height factor
  const COS_R = Math.cos(ROT), SIN_R = Math.sin(ROT);

  function bankAt(u) {
    u = ((u % LAP) + LAP) % LAP;
    let phi = -1;
    if (u >= ST && u < ST + TL) phi = (u - ST) / TL;
    else if (u >= 2 * ST + TL) phi = (u - 2 * ST - TL) / TL;
    if (phi < 0) return 0.14;
    return 0.14 + 0.86 * Math.sin(Math.PI * phi);
  }

  function planPos(u, dFrac) {
    u = ((u % LAP) + LAP) % LAP;
    const h = ST / 2;
    let x, y, ox, oy;
    if (u < ST) {                       // home straight (near side)
      x = -h + u; y = -R; ox = 0; oy = -1;
    } else if (u < ST + TL) {           // first turn
      const th = -Math.PI / 2 + (u - ST) / R;
      x = h + R * Math.cos(th); y = R * Math.sin(th);
      ox = Math.cos(th); oy = Math.sin(th);
    } else if (u < 2 * ST + TL) {       // back straight
      const t = u - ST - TL;
      x = h - t; y = R; ox = 0; oy = 1;
    } else {                            // final turn
      const th = Math.PI / 2 + (u - 2 * ST - TL) / R;
      x = -h + R * Math.cos(th); y = R * Math.sin(th);
      ox = Math.cos(th); oy = Math.sin(th);
    }
    const B = bankAt(u);
    const horiz = dFrac * TRACK_W * (1 - 0.32 * B);
    return {
      x: x + ox * horiz,
      y: y + oy * horiz,
      z: dFrac * TRACK_W * (0.85 * B + 0.1)
    };
  }

  /* ---------- projection ---------- */
  let W = 0, H = 0, DPR = 1, S = 10, cx = 0, cy = 0, riderBoost = 1;

  function proj(p) {
    const xr = p.x * COS_R - p.y * SIN_R;
    const yr = p.x * SIN_R + p.y * COS_R;
    let k = 1 - yr * 0.0042;
    if (k < 0.62) k = 0.62; else if (k > 1.42) k = 1.42;
    return {
      x: cx + xr * S * k,
      y: cy - yr * S * TILT * k - p.z * S * ZK * k,
      k
    };
  }
  const projUD = (u, d) => proj(planPos(u, d));

  /* ---------- precomputed scenery ---------- */
  const SEGS = 240;
  let inner = [], outer = [], rail = [], segFill = [], segOrder = [], marks = [], seams = [];
  const MARKS = [
    { d: 0.045, color: "rgba(158,178,170,.85)", w: 0.42 },   // côte d'azur
    { d: 0.125, color: "rgba(26,18,8,.85)",     w: 0.12 },   // black measuring line
    { d: 0.26,  color: "rgba(188,42,22,.82)",   w: 0.12 },   // sprinter's line
    { d: 0.58,  color: "rgba(32,80,158,.55)",   w: 0.12 }    // stayer's line
  ];
  const SEAMS_D = [0.19, 0.34, 0.42, 0.5, 0.66, 0.74, 0.82, 0.9];

  function hash(i) {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function rebuild() {
    const rect = wrap.getBoundingClientRect();
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);

    const small = W < 720;
    S = Math.min(W * (small ? 1.52 : 0.90) / 126, H * 0.80 / 41.6);
    cx = W * 0.5;
    cy = H * (small ? 0.52 : 0.60);
    riderBoost = small ? 1.55 : 1;

    inner = []; outer = []; rail = []; segFill = []; marks = []; seams = [];
    for (let i = 0; i <= SEGS; i++) {
      const u = (i / SEGS) * LAP;
      inner.push(projUD(u, 0.0));
      outer.push(projUD(u, 1.0));
      const pr = planPos(u, 1.0); pr.z += 1.15;
      rail.push(proj(pr));
    }
    for (const m of MARKS) {
      const line = [];
      for (let i = 0; i <= SEGS; i++) line.push(projUD((i / SEGS) * LAP, m.d));
      marks.push(line);
    }
    for (const d of SEAMS_D) {
      const line = [];
      for (let i = 0; i <= SEGS; i += 2) line.push(projUD((i / SEGS) * LAP, d));
      seams.push(line);
    }
    // per-segment board fill: oak lightness varies by plank noise + facing
    for (let i = 0; i < SEGS; i++) {
      const u = ((i + 0.5) / SEGS) * LAP;
      const p = planPos(u, 0.5);
      const yr = p.x * SIN_R + p.y * COS_R;
      const facing = 1 + (yr / 30) * 0.09;             // far side catches the light
      const noise = 0.94 + hash(i) * 0.12;
      const rr = Math.round(178 * facing * noise);
      const gg = Math.round(123 * facing * noise);
      const bb = Math.round(63 * facing * noise * 0.96);
      segFill.push(`rgb(${rr},${gg},${bb})`);
    }
    segOrder = Array.from({ length: SEGS }, (_, i) => i).sort((a, b) => {
      const ya = Math.max(inner[a].y, inner[a + 1].y, outer[a].y, outer[a + 1].y);
      const yb = Math.max(inner[b].y, inner[b + 1].y, outer[b].y, outer[b + 1].y);
      return ya - yb;
    });
    for (const r of riders) r.trail.length = 0;
  }

  /* ---------- riders ---------- */
  const V_NEUTRAL = 13.9;             // 50 km/h
  const GAP_M = 3.4;                  // draft spacing
  const mkRider = (name, body, accent, trailC) => ({
    name, body, accent, trailC,
    s: 0, v: 9, d: 0.16, targetD: 0.16,
    drifting: false, trail: []
  });

  const riders = [
    mkRider("BASSI",      "#BC2A16", "#E9D6AE", [188, 42, 22]),    // the attacker
    mkRider("DELVAUX",    "#20509E", "#E9D6AE", [32, 80, 158]),
    mkRider("OCCHIPINTI", "#241A0C", "#D9BE8C", [26, 18, 8]),
    mkRider("FERRAGUTI",  "#1A1208", "#B27B3F", [26, 18, 8]),
    mkRider("SARTORELLI", "#2B1D0E", "#D9BE8C", [26, 18, 8]),
    mkRider("CATTANEO",   "#1F150A", "#E9D6AE", [26, 18, 8])
  ];
  const ATT = riders[0];

  let lineOrder = [];                  // rider refs, front first (attacker starts 3rd wheel)
  let mode = "neutral";                // neutral | attack | chase | caught
  let modeT = 0;
  let rotT = 0;
  let rilancioUsed = false, rilancioT = 0;
  let sTotal = 0;                      // attacker cumulative distance
  let simT = 0;

  function resetField() {
    lineOrder = [riders[2], riders[1], ATT, riders[3], riders[4], riders[5]];
    let s0 = ST + TL + 8;              // roll out on the back straight
    for (const r of lineOrder) { r.s = s0; s0 -= GAP_M; r.v = 9; r.d = 0.16; r.targetD = 0.16; r.drifting = false; r.trail.length = 0; }
    mode = "neutral"; modeT = 0; rotT = -4;   // first rotation delayed while winding up
    rilancioUsed = false; sTotal = 0; simT = 0;
  }

  const wrapDist = (a) => {
    let d = a % LAP;
    if (d > LAP / 2) d -= LAP;
    if (d < -LAP / 2) d += LAP;
    return d;
  };

  function step(dt) {
    simT += dt; modeT += dt; rotT += dt;

    /* paceline rotation: leader pulls up the banking, drifts back, hooks on */
    if (mode === "neutral" && rotT > 7 && lineOrder.length > 3) {
      const front = lineOrder.shift();
      front.drifting = true;
      front.targetD = 0.62;
      rotT = 0;
    }
    for (const r of riders) {
      if (r.drifting) {
        const tail = lineOrder[lineOrder.length - 1];
        if (wrapDist(tail.s - r.s) > GAP_M * 0.8) {
          r.drifting = false;
          r.targetD = 0.16;
          lineOrder.push(r);
        }
      }
    }

    /* target speeds */
    const surge = Math.sin(simT * 0.55) * 0.45;
    for (let j = 0; j < lineOrder.length; j++) {
      const r = lineOrder[j];
      let vT;
      if (j === 0) {
        if (mode === "chase") vT = 17.8;
        else if (mode === "attack") vT = V_NEUTRAL - 0.5;   // they look at each other
        else vT = V_NEUTRAL + surge;
        r.targetD = mode === "chase" ? 0.1 : 0.16;
      } else {
        const lead = lineOrder[j - 1];
        const err = wrapDist(lead.s - GAP_M - r.s);
        vT = lead.v + err * 1.1;
      }
      accel(r, vT, dt, mode === "chase" ? 4.2 : 3.2);
    }
    for (const r of riders) {
      if (r.drifting) accel(r, V_NEUTRAL - 1.7, dt, 3.5);
    }

    /* the attacker */
    if (mode === "attack" || mode === "chase") {
      let vT = 19.0;
      if (mode === "chase") vT -= Math.min(3.4, modeT * 0.26);        // legs fading
      if (rilancioT > 0) { vT += 1.1; rilancioT -= dt; }              // second dig
      accel(ATT, vT, dt, modeT < 2 ? 5.5 : 3.8);
      ATT.targetD = 0.055;
    }

    /* integrate */
    for (const r of riders) {
      r.s += r.v * dt;
      r.d += (r.targetD - r.d) * Math.min(1, 2.4 * dt);
    }
    sTotal += ATT.v * dt;

    /* state transitions */
    if (mode === "attack") {
      if (gapSeconds() > 1.6 || modeT > 7) toChase();       // the track forces a response
    } else if (mode === "chase") {
      if (modeT > 2 && gapAheadM() < 2.6) toCaught();
    } else if (mode === "caught" && modeT > 2.2) {
      mode = "neutral"; rotT = 0;
      setHudState("GRUPPO COMPATTO");
      setBtn("LANCIA L’ATTACCO", false);
    }
  }

  function accel(r, vT, dt, aMax) {
    const dv = vT - r.v;
    const a = Math.max(-7 * dt, Math.min(aMax * dt, dv));
    r.v += a;
  }

  function gapAheadM() {
    const front = lineOrder[0];
    if (!front) return 0;
    return wrapDist(ATT.s - front.s);
  }
  function gapSeconds() {
    return Math.max(0, gapAheadM()) / Math.max(8, ATT.v);
  }

  /* ---------- dynamic lean: the page rides the banking with the attacker ---------- */
  const leanRig = document.getElementById("leanRig");
  let leanCur = 0, leanLive = false;
  function updateLean(dt) {
    if (REDUCED || !leanRig) return;
    const active = mode === "attack" || mode === "chase";
    const target = active ? -(0.55 + 0.95 * bankAt(ATT.s)) : 0;
    leanCur += (target - leanCur) * Math.min(1, 2.2 * dt);
    if (active || Math.abs(leanCur) > 0.02) {
      if (!leanLive) { leanRig.classList.add("lean-live"); leanLive = true; }
      leanRig.style.transform =
        `rotate(${leanCur.toFixed(3)}deg) translateX(${(leanCur * 0.36).toFixed(3)}rem)`;
    } else if (leanLive) {
      leanCur = 0; leanLive = false;
      leanRig.classList.remove("lean-live");
      leanRig.style.transform = "";
    }
  }

  /* ---------- state machine / interaction ---------- */
  const hudState = document.getElementById("hudState");
  const hudGap = document.getElementById("hudGap");
  const hudLap = document.getElementById("hudLap");
  const hudSpeed = document.getElementById("hudSpeed");
  const btn = document.getElementById("btnAttack");
  const btnLabel = document.getElementById("btnAttackLabel");

  const stampEl = document.getElementById("raceStamp");
  function showStamp(text) {
    if (!stampEl || REDUCED) return;
    stampEl.textContent = text;
    stampEl.classList.remove("show");
    void stampEl.offsetWidth;               // restart the animation
    stampEl.classList.add("show");
  }

  function setHudState(t) { if (hudState && hudState.textContent !== t) hudState.textContent = t; }
  function setBtn(t, disabled) {
    if (btnLabel && btnLabel.textContent !== t) btnLabel.textContent = t;
    if (btn) btn.disabled = !!disabled;
  }

  function toAttack() {
    const i = lineOrder.indexOf(ATT);
    if (i >= 0) lineOrder.splice(i, 1);
    ATT.drifting = false;
    mode = "attack"; modeT = 0; rilancioUsed = false;
    document.body.classList.add("is-attack");
    showStamp("VIA!");
    setHudState("ATTACCO DI BASSI!");
    setBtn("ORGANIZZA L’INSEGUIMENTO", false);
  }
  function toChase() {
    mode = "chase"; modeT = 0;
    document.body.classList.add("is-chase");
    setHudState("INSEGUIMENTO ORGANIZZATO");
    setBtn(rilancioUsed ? "TIENE… TIENE…" : "RILANCIA!", rilancioUsed);
  }
  function toCaught() {
    mode = "caught"; modeT = 0;
    document.body.classList.remove("is-attack", "is-chase");
    ATT.targetD = 0.16;
    lineOrder.splice(1, 0, ATT);
    showStamp("RIPRESO!");
    setHudState("RIPRESO — TUTTO DA RIFARE");
    setBtn("TIRA IL FIATO…", true);
  }
  function onAction() {
    if (mode === "neutral") toAttack();
    else if (mode === "attack") toChase();
    else if (mode === "chase" && !rilancioUsed) {
      rilancioUsed = true; rilancioT = 3.2;
      showStamp("RILANCIA!");
      setHudState("RILANCIO! ANCORA BASSI!");
      setBtn("TIENE… TIENE…", true);
    }
    if (REDUCED) staticFrame();
  }
  if (btn) btn.addEventListener("click", onAction);
  canvas.addEventListener("click", () => { if (btn && !btn.disabled) onAction(); });

  /* ---------- drawing ---------- */
  function polyline(line, width, style) {
    ctx.beginPath();
    ctx.moveTo(line[0].x, line[0].y);
    for (let i = 1; i < line.length; i++) ctx.lineTo(line[i].x, line[i].y);
    ctx.lineWidth = width;
    ctx.strokeStyle = style;
    ctx.stroke();
  }

  function drawScene() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = "round";

    /* infield */
    ctx.beginPath();
    ctx.moveTo(inner[0].x, inner[0].y);
    for (let i = 1; i <= SEGS; i++) ctx.lineTo(inner[i].x, inner[i].y);
    ctx.closePath();
    ctx.fillStyle = "#DCC594";
    ctx.fill();

    /* infield lettering along the home straight */
    const a0 = projUD(ST * 0.1, 0), a1 = projUD(ST * 0.9, 0);
    let ang = Math.atan2(a1.y - a0.y, a1.x - a0.x);
    if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;   // keep it readable
    const cIn = proj({ x: 0, y: 0, z: 0 });
    ctx.save();
    ctx.translate(cIn.x, cIn.y);
    ctx.rotate(ang);
    ctx.scale(1, TILT + 0.12);
    ctx.fillStyle = "rgba(143,95,44,.62)";
    ctx.textAlign = "center";
    ctx.font = `italic 900 ${(3.4 * S).toFixed(1)}px Archivo, sans-serif`;
    ctx.fillText("VELODROMO DEL SEMPIONE", 0, -1.6 * S);
    ctx.font = `700 ${(2.1 * S).toFixed(1)}px "Chivo Mono", monospace`;
    ctx.fillStyle = "rgba(143,95,44,.48)";
    ctx.fillText("M I L A N O · M C M X X X I V", 0, 2.8 * S);
    /* painted centre ring — litho poster flourish */
    ctx.strokeStyle = "rgba(188,42,22,.35)";
    ctx.lineWidth = 0.28 * S;
    ctx.beginPath();
    ctx.ellipse(0, 0.6 * S, 22 * S, 11.5 * S, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    /* board ribbon, far → near */
    for (const i of segOrder) {
      ctx.beginPath();
      ctx.moveTo(inner[i].x, inner[i].y);
      ctx.lineTo(inner[i + 1].x, inner[i + 1].y);
      ctx.lineTo(outer[i + 1].x, outer[i + 1].y);
      ctx.lineTo(outer[i].x, outer[i].y);
      ctx.closePath();
      ctx.fillStyle = segFill[i];
      ctx.fill();
    }

    /* plank seams */
    ctx.globalAlpha = 0.16;
    for (const line of seams) polyline(line, Math.max(0.6, 0.045 * S), "#5C3E1B");
    ctx.globalAlpha = 1;

    /* track markings */
    for (let m = 0; m < MARKS.length; m++)
      polyline(marks[m], Math.max(1, MARKS[m].w * S), MARKS[m].color);

    /* finish line across the boards */
    const f0 = projUD(ST / 2, 0), f1 = projUD(ST / 2, 1);
    ctx.beginPath(); ctx.moveTo(f0.x, f0.y); ctx.lineTo(f1.x, f1.y);
    ctx.lineWidth = Math.max(2, 0.32 * S); ctx.strokeStyle = "#E9D6AE"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(f0.x + 0.4 * S, f0.y); ctx.lineTo(f1.x + 0.4 * S, f1.y);
    ctx.lineWidth = Math.max(1, 0.1 * S); ctx.strokeStyle = "rgba(188,42,22,.8)"; ctx.stroke();

    /* edges + balustrade */
    polyline(inner, Math.max(1, 0.1 * S), "rgba(26,18,8,.55)");
    polyline(outer, Math.max(1.5, 0.16 * S), "#1A1208");
    polyline(rail, Math.max(1, 0.1 * S), "rgba(26,18,8,.8)");
    ctx.beginPath();
    for (let i = 0; i < SEGS; i += 8) {
      ctx.moveTo(outer[i].x, outer[i].y);
      ctx.lineTo(rail[i].x, rail[i].y);
    }
    ctx.lineWidth = Math.max(0.8, 0.05 * S);
    ctx.strokeStyle = "rgba(26,18,8,.5)";
    ctx.stroke();

    /* riders, far → near */
    const drawList = riders.map(r => {
      const p = projUD(r.s, r.d);
      return { r, p };
    }).sort((A, B) => A.p.y - B.p.y);
    for (const { r, p } of drawList) drawRider(r, p);
  }

  function drawRider(r, p) {
    /* ghost trail — length, weight and heat all breathe with speed */
    const tr = r.trail;
    tr.push({ x: p.x, y: p.y, k: p.k });
    if (tr.length > 110) tr.shift();
    const spd = Math.max(0, Math.min(1, (r.v - 11) / 8));
    const L = Math.max(6, Math.round(8 + spd * 96));
    const n = Math.min(L, tr.length - 1);
    const [cr, cg, cb] = r.trailC;
    const aBase = r === ATT ? 0.42 + 0.45 * spd : 0.16 + 0.2 * spd;
    const wBase = r === ATT ? 4.6 + 3.6 * spd : 3.6 + 1.4 * spd;
    const core = r === ATT && spd > 0.5;         // litho double-line at full gas
    for (let i = 0; i < n; i++) {
      const t0 = tr[tr.length - 1 - i], t1 = tr[tr.length - 2 - i];
      if (!t1) break;
      const f = 1 - i / n;
      const fade = f * Math.sqrt(f);
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.lineWidth = Math.max(0.6, wBase * f * t0.k * (S / 10) * riderBoost);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(aBase * fade).toFixed(3)})`;
      ctx.stroke();
      if (core && i < n * 0.55) {
        ctx.beginPath();
        ctx.moveTo(t0.x, t0.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.lineWidth = Math.max(0.4, wBase * 0.3 * f * t0.k * (S / 10) * riderBoost);
        ctx.strokeStyle = `rgba(233,214,174,${(0.5 * aBase * fade).toFixed(3)})`;
        ctx.stroke();
      }
    }

    /* local frame aligned to travel, sheared up the banking */
    const ahead = projUD(r.s + 1.2, r.d);
    let ex = ahead.x - p.x, ey = ahead.y - p.y;
    const el = Math.hypot(ex, ey) || 1; ex /= el; ey /= el;
    const inw = projUD(r.s, Math.max(0, r.d - 0.35));
    let ux = inw.x - p.x, uy = inw.y - p.y;
    const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
    const wgt = bankAt(r.s) * 0.5;
    let upx = wgt * ux, upy = wgt * uy - (1 - wgt);
    const upl = Math.hypot(upx, upy) || 1; upx /= upl; upy /= upl;

    const sc = S * 0.15 * p.k * riderBoost * (r === ATT ? 1.07 : 1);
    ctx.save();
    ctx.transform(ex * sc, ey * sc, -upx * sc, -upy * sc, p.x, p.y);

    /* contact shadow */
    ctx.fillStyle = "rgba(26,18,8,.18)";
    ctx.beginPath(); ctx.ellipse(0, 0.8, 10.5, 2.1, 0, 0, Math.PI * 2); ctx.fill();

    /* disc wheels */
    ctx.fillStyle = r.body;
    ctx.beginPath(); ctx.arc(-6.6, -4.4, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6.8, -4.4, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = r.accent;
    ctx.beginPath(); ctx.arc(-6.6, -4.4, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6.8, -4.4, 1.1, 0, Math.PI * 2); ctx.fill();

    /* frame */
    ctx.strokeStyle = r.body;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-6.6, -4.4); ctx.lineTo(0.6, -8); ctx.lineTo(6.8, -4.4);
    ctx.stroke();

    /* hunched body — one Depero teardrop */
    ctx.fillStyle = r.body;
    ctx.save();
    ctx.translate(-0.6, -10.6);
    ctx.rotate(-0.16);
    ctx.beginPath(); ctx.ellipse(0, 0, 8.8, 3.0, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* head + cap wedge */
    ctx.beginPath(); ctx.arc(7.6, -12.2, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = r.accent;
    ctx.beginPath();
    ctx.moveTo(7.2, -14.6); ctx.lineTo(11.6, -12.9); ctx.lineTo(7.5, -12.1);
    ctx.closePath(); ctx.fill();

    ctx.restore();
  }

  /* ---------- HUD ---------- */
  let hudTick = 0;
  function updateHud(dt) {
    hudTick -= dt;
    if (hudTick > 0) return;
    hudTick = 0.15;
    const showAtt = mode === "attack" || mode === "chase";
    if (hudGap) {
      const g = showAtt ? gapSeconds() : 0;
      hudGap.textContent = `+${Math.floor(g)}″${Math.floor((g % 1) * 10)}`;
    }
    if (hudLap) hudLap.textContent = `${(Math.floor(sTotal / LAP) % 20) + 1}/20`;
    if (hudSpeed) {
      const v = showAtt ? ATT.v : (lineOrder[0] ? lineOrder[0].v : V_NEUTRAL);
      hudSpeed.textContent = `${Math.round(v * 3.6)} KM/H`;
    }
  }

  /* ---------- loop / lifecycle ---------- */
  let rafId = 0, lastT = 0, running = false, inView = true;

  function frame(t) {
    rafId = 0;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    step(dt);
    updateLean(dt);
    drawScene();
    updateHud(dt);
    if (running) rafId = requestAnimationFrame(frame);
  }
  function start() {
    if (running || REDUCED) return;
    running = true;
    lastT = performance.now();
    if (!rafId) rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (inView) start();
  });
  /* honor a mid-session switch of prefers-reduced-motion */
  rmq.addEventListener("change", (e) => {
    REDUCED = e.matches;
    if (REDUCED) {
      stop();
      leanCur = 0; leanLive = false;
      if (leanRig) { leanRig.classList.remove("lean-live"); leanRig.style.transform = ""; }
      staticFrame();
    } else if (inView && !document.hidden) start();
  });
  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (inView && !document.hidden) start(); else stop();
  }, { threshold: 0.02 }).observe(wrap);

  let resizeT = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { rebuild(); if (REDUCED) staticFrame(); }, 120);
  }).observe(wrap);

  /* reduced motion: a designed frozen composition, still responsive to clicks */
  function staticFrame() {
    for (const r of riders) r.trail.length = 0;
    for (let i = 0; i < 400; i++) {
      step(1 / 60);
      if (i > 290) { const dl = riders.map(r => ({ r, p: projUD(r.s, r.d) })); for (const { r, p } of dl) { r.trail.push({ x: p.x, y: p.y, k: p.k }); if (r.trail.length > 110) r.trail.shift(); } }
    }
    drawScene();
    updateHud(1);
  }

  /* ---------- go ---------- */
  try {
    resetField();
    rebuild();
    if (REDUCED) {
      toAttack();          // frozen mid-attack: the poster composition
      staticFrame();
    } else {
      start();
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (REDUCED) staticFrame(); });
    }
  } catch (err) {
    /* designed fallback: hide the canvas, the poster type carries the hero */
    wrap.style.display = "none";
  }
})();
