/* PLATE I — the live survey plate.
   Contours draw themselves on load; RESURVEY morphs the land to a new seed;
   the cursor is a survey point with elevation/slope readout. */

import { Terrain, christen, ELEV_MIN, ELEV_SPAN } from "./terrain.js";
import { contoursOf, makePath, paintTints, svgEl } from "./carto.js";
import { mulberry32 } from "./noise.js";

const E0 = 403000, N0 = 5118000;
/* thresholds at exactly round elevations: 500 m .. 2900 m by 100 */
const LEVELS = [];
for (let e = 500; e <= 2900; e += 100) LEVELS.push((e - ELEV_MIN) / ELEV_SPAN);
const elevOf = (v) => Math.round(ELEV_MIN + v * ELEV_SPAN);
const IS_INDEX = (i) => i % 5 === 0; // 500, 1000, 1500, 2000, 2500

const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export function initHero(reduced) {
  const frame = document.getElementById("heroFrame");
  const canvas = document.getElementById("heroCanvas");
  const svg = document.getElementById("heroSvg");
  const readout = document.getElementById("readout");
  const metaEl = document.getElementById("surveyMeta");
  const btn = document.getElementById("resurvey");
  if (!frame || !window.d3) return;

  /* the pocket sheet: portrait plate on small screens;
     the full sheet is panoramic so title + stamp share the first viewport */
  const small = window.matchMedia("(max-width: 720px)").matches;
  const VB_W = small ? 760 : 1180;
  const VB_H = small ? 920 : 640;
  const MX = 26, MY = 26;
  const MW = VB_W - MX * 2;
  const MH = VB_H - MY * 2;
  const KM_W = small ? 8 : 12;
  const KM_H = KM_W * MH / MW;
  const F = small ? 1.6 : 1;          // map-type scale factor
  const LW = small ? 1.45 : 1;        // linework scale factor
  svg.setAttribute("viewBox", `0 0 ${VB_W} ${VB_H}`);
  frame.style.aspectRatio = `${VB_W} / ${VB_H}`;

  const GW = small ? 104 : 168;
  const GH = Math.round(GW * MH / MW);
  const SX = MW / (GW - 1), SY = MH / (GH - 1);
  const cellM = (KM_W * 1000) / (GW - 1);
  const pathGen = makePath(SX, SY);

  canvas.width = VB_W; canvas.height = VB_H;
  const ctx = canvas.getContext("2d");

  /* ---------- static furniture ---------- */
  const defs = svgEl("defs");
  const clip = svgEl("clipPath", { id: "mapClip" });
  clip.appendChild(svgEl("rect", { x: MX, y: MY, width: MW, height: MH }));
  defs.appendChild(clip);
  svg.appendChild(defs);

  const gGrid = svgEl("g", { "clip-path": "url(#mapClip)" });
  const gLines = svgEl("g", { "clip-path": "url(#mapClip)" });
  const gDeco = svgEl("g", { "clip-path": "url(#mapClip)" });
  const gTicks = svgEl("g");
  const gCross = svgEl("g", { "clip-path": "url(#mapClip)", style: "display:none" });
  svg.append(gGrid, gLines, gDeco, gTicks, gCross);

  // neatline (double)
  gTicks.appendChild(svgEl("rect", {
    x: MX, y: MY, width: MW, height: MH,
    fill: "none", stroke: "#382e1f", "stroke-width": 1.4,
  }));
  gTicks.appendChild(svgEl("rect", {
    x: MX - 5, y: MY - 5, width: MW + 10, height: MH + 10,
    fill: "none", stroke: "#6b4f2e", "stroke-width": 0.6, opacity: 0.7,
  }));

  // kilometre grid + coordinates
  for (let k = 0; k <= KM_W; k++) {
    const x = MX + (k / KM_W) * MW;
    gGrid.appendChild(svgEl("line", {
      x1: x, y1: MY, x2: x, y2: MY + MH,
      stroke: "#6b4f2e", "stroke-width": 0.5, opacity: 0.16,
    }));
    gTicks.appendChild(svgEl("line", {
      x1: x, y1: MY - 5, x2: x, y2: MY - 11, stroke: "#6b4f2e", "stroke-width": 0.8, opacity: 0.8,
    }));
    if (k % 2 === 0 && (!small || (k > 0 && k < KM_W))) {
      const t = svgEl("text", {
        x, y: MY - 14, "text-anchor": "middle",
        "font-family": "Courier Prime, monospace", "font-size": 10.5 * F,
        fill: "#6b4f2e", "letter-spacing": "0.5",
      });
      t.textContent = fmt(E0 + k * 1000);
      gTicks.appendChild(t);
    }
  }
  for (let k = 0; k <= Math.floor(KM_H); k++) {
    const y = MY + MH - (k / KM_H) * MH;
    gGrid.appendChild(svgEl("line", {
      x1: MX, y1: y, x2: MX + MW, y2: y,
      stroke: "#6b4f2e", "stroke-width": 0.5, opacity: 0.16,
    }));
    gTicks.appendChild(svgEl("line", {
      x1: MX - 5, y1: y, x2: MX - 11, y2: y, stroke: "#6b4f2e", "stroke-width": 0.8, opacity: 0.8,
    }));
    if (k % 2 === 1) {
      const t = svgEl("text", {
        x: MX + 6, y: y - 4, "text-anchor": "start",
        "font-family": "Courier Prime, monospace", "font-size": 10 * F,
        fill: "#6b4f2e", opacity: 0.9,
        stroke: "#f1e9d5", "stroke-width": 3, "paint-order": "stroke",
      });
      t.textContent = fmt(N0 + k * 1000);
      gGrid.appendChild(t);
    }
  }

  /* ---------- terrain + contour paths ---------- */
  let terrain = new Terrain(GW, GH, 1951);
  const paths = LEVELS.map((_, i) => {
    const p = svgEl("path", {
      fill: "none",
      stroke: "#6b4f2e",
      "stroke-width": (IS_INDEX(i) ? 1.5 : 0.7) * LW,
      "stroke-opacity": IS_INDEX(i) ? 0.9 : 0.48,
      "stroke-linejoin": "round",
    });
    gLines.appendChild(p);
    return p;
  });

  function updateContours() {
    const cts = contoursOf(terrain.field, GW, GH, LEVELS);
    for (let i = 0; i < cts.length; i++) {
      paths[i].setAttribute("d", pathGen(cts[i]) || "M0,0");
    }
    return cts;
  }

  const shadeCache = document.createElement("canvas");
  function paintCanvas() {
    ctx.clearRect(0, 0, VB_W, VB_H);
    paintTints(ctx, terrain, [MX, MY, MW, MH], {
      bands: LEVELS, tintAlpha: 0.6, shadeAlpha: 0.5,
      shade: { z: small ? 22 : 30, shadowAlpha: 130, lightAlpha: 80, canvas: shadeCache },
    });
  }

  /* ---------- decorations: labels, summits, river, range name ---------- */
  const px = (gx) => MX + gx * SX;
  const py = (gy) => MY + gy * SY;
  let decoSeq = 0;
  let culminating = null; // px coords of the highest summit, for the auto-survey

  function renderDecor(cts) {
    gDeco.innerHTML = "";
    const rand = mulberry32(terrain.seed ^ 0x51ab);
    const names = christen(terrain.seed);

    // river first (under labels)
    const river = terrain.traceRiver(rand);
    if (river) {
      let pts = river.map(([gx, gy]) => [px(gx), py(gy)]);
      if (pts[0][0] > pts[pts.length - 1][0]) pts.reverse();
      const d = "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L");
      const id = `riv-${++decoSeq}`;
      gDeco.appendChild(svgEl("path", {
        id, d, fill: "none", stroke: "#4f5d45", "stroke-width": 1.6 * LW,
        "stroke-linecap": "round", opacity: 0.85,
      }));
      if (pts.length > 60) {
        const t = svgEl("text", {
          "font-family": "Alegreya, serif", "font-style": "italic",
          "font-size": 15 * F, fill: "#44523c", "letter-spacing": 2.5 * F,
        });
        const tp = svgEl("textPath", { href: `#${id}`, startOffset: "34%" });
        const rise = svgEl("tspan", { dy: -5 * F });
        rise.textContent = names.river;
        tp.appendChild(rise);
        t.appendChild(tp);
        gDeco.appendChild(t);
      }
    }

    // summits are placed first; contour labels must yield to them
    const summits = terrain.summits(3, 0.5, 20);
    const placed = summits.map((s) => ({ x: px(s.x) + 18, y: py(s.y) }));
    const nLabelReserved = placed.length;

    // contour elevation labels on index contours
    for (let i = 0; i < cts.length; i++) {
      if (!IS_INDEX(i)) continue;
      const c = cts[i];
      const elev = elevOf(c.value);
      for (const poly of c.coordinates) {
        const ring = poly[0];
        if (!ring || ring.length < 34) continue;
        const spot = bestLabelSpot(ring, placed);
        if (!spot) continue;
        placed.push(spot);
        const t = svgEl("text", {
          transform: `translate(${spot.x.toFixed(1)},${spot.y.toFixed(1)}) rotate(${spot.ang.toFixed(1)})`,
          "text-anchor": "middle", "dominant-baseline": "middle",
          "font-family": "Courier Prime, monospace", "font-size": 11 * F,
          fill: "#5a4226", stroke: "#f1e9d5", "stroke-width": 5, "paint-order": "stroke",
          "letter-spacing": "0.5",
        });
        t.textContent = fmt(elev);
        gDeco.appendChild(t);
        if (placed.length >= nLabelReserved + 7) break;
      }
      if (placed.length >= nLabelReserved + 7) break;
    }

    // spot heights at true summits
    summits.forEach((s, idx) => {
      const x = px(s.x), y = py(s.y);
      gDeco.appendChild(svgEl("path", {
        d: `M${x},${y - 4.6 * F}L${x + 4.2 * F},${y + 3.4 * F}L${x - 4.2 * F},${y + 3.4 * F}Z`,
        fill: "#382e1f",
      }));
      const t = svgEl("text", {
        x: x + 8 * F, y: y + 4 * F,
        "font-family": "Courier Prime, monospace", "font-size": 12 * F,
        fill: "#382e1f", stroke: "#f1e9d5", "stroke-width": 4, "paint-order": "stroke",
      });
      t.textContent = fmt(elevOf(s.v));
      gDeco.appendChild(t);
      if (idx === 0) {
        culminating = { x, y };
        // range name arcs over the culminating summit
        const halfArc = 190 * F;
        const cx = Math.max(MX + 40 + halfArc / 1.6, Math.min(VB_W - MX - 40 - halfArc / 1.6, x));
        const cy = Math.max(MY + 90, Math.min(VB_H - MY - 110, y - 52));
        const id = `arc-${++decoSeq}`;
        gDeco.appendChild(svgEl("path", {
          id, d: `M${cx - halfArc},${cy} Q${cx},${cy - 42} ${cx + halfArc},${cy}`, fill: "none",
        }));
        const nt = svgEl("text", {
          "font-family": "'Alegreya SC', serif", "font-size": 21 * F, "font-weight": 500,
          fill: "#6b4f2e", "letter-spacing": 7 * F, opacity: 0.95,
          stroke: "#f1e9d5", "stroke-width": 5, "paint-order": "stroke",
          "text-anchor": "middle",
        });
        const tp = svgEl("textPath", { href: `#${id}`, startOffset: "50%" });
        tp.textContent = names.range;
        nt.appendChild(tp);
        gDeco.appendChild(nt);
      }
    });

    // survey metadata line
    metaEl.innerHTML =
      `<strong>${names.range}</strong> · SURVEY Nº ${names.survey}` +
      `<br>1:50 000 · C.I. 100 M · BUREAU DATUM 1951 · SHEET ${String(terrain.seed % 89 + 1).padStart(2, "0")}-NE`;
    return names;
  }

  function bestLabelSpot(ring, placed) {
    let best = null;
    for (let i = 4; i < ring.length - 4; i += 5) {
      const ax = px(ring[i - 4][0]), ay = py(ring[i - 4][1]);
      const bx = px(ring[i + 4][0]), by = py(ring[i + 4][1]);
      const x = px(ring[i][0]), y = py(ring[i][1]);
      if (x < MX + 60 || x > MX + MW - 60 || y < MY + 46 || y > MY + MH - 40) continue;
      let ang = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
      if (ang > 90) ang -= 180;
      if (ang < -90) ang += 180;
      const flat = Math.abs(ang);
      let clash = false;
      for (const p of placed) {
        if (Math.hypot(p.x - x, p.y - y) < 150) { clash = true; break; }
      }
      if (clash) continue;
      if (!best || flat < best.score) best = { x, y, ang, score: flat };
    }
    return best && best.score < 55 ? best : null;
  }

  /* north arrow, top-left of the sheet: N above a half-filled needle */
  {
    const nx = MX + 104, ny = MY + 52;
    const gN = svgEl("g", { opacity: 0.9 });
    const nt = svgEl("text", {
      x: nx, y: ny - 26, "text-anchor": "middle",
      "font-family": "'Alegreya SC', serif", "font-size": 14 * F, fill: "#382e1f",
      stroke: "#f1e9d5", "stroke-width": 3.5, "paint-order": "stroke",
    });
    nt.textContent = "N";
    gN.appendChild(nt);
    gN.appendChild(svgEl("line", {
      x1: nx, y1: ny + 34, x2: nx, y2: ny - 14, stroke: "#382e1f", "stroke-width": 1.1,
    }));
    gN.appendChild(svgEl("path", {
      d: `M${nx},${ny - 20} L${nx + 5.5},${ny - 4} L${nx},${ny - 8.5} Z`, fill: "#382e1f",
    }));
    gN.appendChild(svgEl("path", {
      d: `M${nx},${ny - 20} L${nx - 5.5},${ny - 4} L${nx},${ny - 8.5} Z`,
      fill: "#f1e9d5", stroke: "#382e1f", "stroke-width": 0.9,
    }));
    svg.insertBefore(gN, gTicks); // under the crosshair, over the land
  }

  /* scale bar + declaration, lower-left margin — full sheets only
     (the pocket sheet's lower-left belongs to the docked readout) */
  if (!small) {
    const kmPx = MW / KM_W;
    const segs = 3;
    const sbX = MX + 22, sbY = MY + MH - 30;
    const gS = svgEl("g", { opacity: 0.95 });
    gS.appendChild(svgEl("rect", {
      x: sbX - 12, y: sbY - 20, width: segs * kmPx + 46, height: 42,
      fill: "#f1e9d5", opacity: 0.72,
    }));
    for (let i = 0; i < segs; i++) {
      gS.appendChild(svgEl("rect", {
        x: sbX + i * kmPx, y: sbY, width: kmPx, height: 5,
        fill: i % 2 ? "none" : "#382e1f", stroke: "#382e1f", "stroke-width": 0.9,
      }));
    }
    for (let i = 0; i <= segs; i++) {
      const t = svgEl("text", {
        x: sbX + i * kmPx, y: sbY - 5, "text-anchor": "middle",
        "font-family": "Courier Prime, monospace", "font-size": 9.5,
        fill: "#5a4226", stroke: "#f1e9d5", "stroke-width": 3, "paint-order": "stroke",
      });
      t.textContent = i === segs ? `${i} km` : String(i);
      gS.appendChild(t);
    }
    const cap = svgEl("text", {
      x: sbX, y: sbY + 16,
      "font-family": "Courier Prime, monospace", "font-size": 9,
      fill: "#6b4f2e", "letter-spacing": "1.2",
    });
    cap.textContent = "SCALE 1:50 000 · CONTOUR INTERVAL 100 M";
    gS.appendChild(cap);
    svg.insertBefore(gS, gTicks);
  }

  /* ---------- crosshair + readout ---------- */
  const chH = svgEl("line", { y1: 0, y2: 0, x1: MX, x2: MX + MW, stroke: "#c4321c", "stroke-width": 0.7 * LW, opacity: 0.75 });
  const chV = svgEl("line", { x1: 0, x2: 0, y1: MY, y2: MY + MH, stroke: "#c4321c", "stroke-width": 0.7 * LW, opacity: 0.75 });
  const chC = svgEl("circle", { r: 9 * F, fill: "none", stroke: "#c4321c", "stroke-width": 1.1 * LW });
  const chD = svgEl("circle", { r: 1.4 * F, fill: "#c4321c" });
  /* registration ticks where the hairlines meet the neatline */
  const tickAttrs = { stroke: "#c4321c", "stroke-width": 1.5 * LW, opacity: 0.9 };
  const tkT = svgEl("line", tickAttrs), tkB = svgEl("line", tickAttrs);
  const tkL = svgEl("line", tickAttrs), tkR = svgEl("line", tickAttrs);
  gCross.append(chH, chV, chC, chD, tkT, tkB, tkL, tkR);

  const roGrid = readout.querySelector("[data-ro=grid]");
  const roElev = readout.querySelector("[data-ro=elev]");
  const roSlope = readout.querySelector("[data-ro=slope]");
  const roAspect = readout.querySelector("[data-ro=aspect]");
  let autoSurvey = true; // the plate demonstrates its own instrument until touched
  let lastVB = null;     // the point where the instrument last stood

  function surveyAtVB(vx, vy) {
    if (vx < MX || vx > MX + MW || vy < MY || vy > MY + MH) {
      gCross.style.display = "none";
      readout.hidden = true;
      return;
    }
    gCross.style.display = "";
    readout.hidden = false;
    lastVB = { x: vx, y: vy };
    chH.setAttribute("y1", vy); chH.setAttribute("y2", vy);
    chV.setAttribute("x1", vx); chV.setAttribute("x2", vx);
    chC.setAttribute("cx", vx); chC.setAttribute("cy", vy);
    chD.setAttribute("cx", vx); chD.setAttribute("cy", vy);
    const TK = 9;
    tkT.setAttribute("x1", vx); tkT.setAttribute("x2", vx);
    tkT.setAttribute("y1", MY); tkT.setAttribute("y2", MY + TK);
    tkB.setAttribute("x1", vx); tkB.setAttribute("x2", vx);
    tkB.setAttribute("y1", MY + MH - TK); tkB.setAttribute("y2", MY + MH);
    tkL.setAttribute("y1", vy); tkL.setAttribute("y2", vy);
    tkL.setAttribute("x1", MX); tkL.setAttribute("x2", MX + TK);
    tkR.setAttribute("y1", vy); tkR.setAttribute("y2", vy);
    tkR.setAttribute("x1", MX + MW - TK); tkR.setAttribute("x2", MX + MW);

    const gx = (vx - MX) / SX, gy = (vy - MY) / SY;
    const E = E0 + (vx - MX) / MW * KM_W * 1000;
    const N = N0 + (MY + MH - vy) / MH * KM_H * 1000;
    roGrid.textContent = `${fmt(Math.round(E / 10) * 10)}E ${fmt(Math.round(N / 10) * 10)}N`;
    roElev.textContent = `${fmt(terrain.elevation(gx, gy))} m`;
    roSlope.textContent = `${terrain.slopeDeg(gx, gy, cellM).toFixed(1)}°`;
    roAspect.textContent = terrain.aspect(gx, gy);

    const r = frame.getBoundingClientRect();
    const fx = vx / VB_W * r.width, fy = vy / VB_H * r.height;
    if (!frame.classList.contains("coarse-dock")) {
      const rw = readout.offsetWidth || 180, rh = readout.offsetHeight || 92;
      let lx = fx + 4, ly = fy + 4;
      if (fx + rw + 26 > r.width) lx = fx - rw - 26;
      if (fy + rh + 26 > r.height) ly = fy - rh - 26;
      readout.style.left = lx + "px";
      readout.style.top = ly + "px";
    }
  }

  function surveyAtClient(clientX, clientY) {
    const r = frame.getBoundingClientRect();
    surveyAtVB((clientX - r.left) / r.width * VB_W, (clientY - r.top) / r.height * VB_H);
  }

  frame.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    if (e.target.closest(".stamp")) return; // the stamp is furniture, not terrain
    autoSurvey = false;
    surveyAtClient(e.clientX, e.clientY);
  });
  frame.addEventListener("pointerleave", (e) => {
    /* a lifted finger is not a departed surveyor: the docked touch
       readout keeps the last station until the next tap */
    if (e.pointerType === "touch") return;
    gCross.style.display = "none";
    readout.hidden = true;
  });
  frame.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    if (e.target.closest(".stamp")) return;
    autoSurvey = false;
    frame.classList.add("coarse-dock");
    surveyAtClient(e.clientX, e.clientY);
  });

  /* the plate surveys its own summit until a hand takes the instrument */
  function demonstrateInstrument() {
    if (!autoSurvey || !culminating) return;
    if (small) frame.classList.add("coarse-dock");
    surveyAtVB(culminating.x, culminating.y);
  }

  /* ---------- first render + load choreography ---------- */
  let cts = updateContours();
  paintCanvas();
  renderDecor(cts);

  if (!reduced) {
    gDeco.style.opacity = "0";
    gDeco.style.transition = "opacity 0.9s ease";
    let maxEnd = 0;
    paths.forEach((p, i) => {
      let L;
      try { L = p.getTotalLength(); } catch { L = 0; }
      if (!L || !isFinite(L)) return;
      const dur = Math.max(500, Math.min(1500, L * 0.28));
      const delay = 120 + i * 62;
      maxEnd = Math.max(maxEnd, delay + dur);
      p.style.strokeDasharray = `${L}`;
      p.style.strokeDashoffset = `${L}`;
      const anim = p.animate(
        [{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
        { duration: dur, delay, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
      );
      anim.onfinish = () => {
        p.style.strokeDasharray = "none";
        p.style.strokeDashoffset = "0";
      };
    });
    setTimeout(() => canvas.classList.add("lit"), Math.max(500, maxEnd * 0.45));
    setTimeout(() => { gDeco.style.opacity = "1"; }, maxEnd * 0.82);
    setTimeout(demonstrateInstrument, maxEnd + 500);
  } else {
    canvas.classList.add("lit");
    demonstrateInstrument();
  }

  /* ---------- resurvey (morph) ---------- */
  let morphing = false;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  btn.addEventListener("click", () => {
    if (morphing) return;
    const newSeed = (Math.random() * 2 ** 31) | 0;
    terrain.beginMorph(newSeed);
    autoSurvey = true;

    if (reduced) {
      gCross.style.display = "none";
      readout.hidden = true;
      terrain.setMorph(1); terrain.endMorph();
      cts = updateContours(); paintCanvas(); renderDecor(cts);
      demonstrateInstrument();
      return;
    }

    morphing = true;
    btn.setAttribute("disabled", "");
    const btnNote = btn.querySelector("small");
    if (btnNote) btnNote.textContent = "surveying…";
    gDeco.style.opacity = "0";

    /* the survey point holds its station while the land moves beneath it:
       ELEV / SLOPE / ASPECT roll live through the whole resurvey */
    if (!lastVB && culminating) lastVB = { x: culminating.x, y: culminating.y };
    if (lastVB) surveyAtVB(lastVB.x, lastVB.y);

    const t0 = performance.now();
    const DUR = 1750;

    function step(now) {
      if (document.hidden) { finish(); return; }
      const t = Math.min(1, (now - t0) / DUR);
      terrain.setMorph(easeInOut(t));
      updateContours();
      paintCanvas();
      if (lastVB && !readout.hidden) surveyAtVB(lastVB.x, lastVB.y);
      if (t < 1) requestAnimationFrame(step);
      else finish();
    }
    function finish() {
      terrain.setMorph(1);
      terrain.endMorph();
      cts = updateContours();
      paintCanvas();
      renderDecor(cts);
      gDeco.style.opacity = "1";
      btn.removeAttribute("disabled");
      if (btnNote) btnNote.textContent = "draw a new range";
      morphing = false;
      setTimeout(demonstrateInstrument, 700);
    }
    requestAnimationFrame(step);
  });

  return { terrain };
}
