/* ============================================================
   WINDBORNE — synthesized global wind field
   d3 + canvas 2d. Two layers: a static chart (continents drawn
   from memory + graticule) and a trail canvas faded with
   destination-out so the chart ghosts through the wind.
   An artistic model, not a forecast.
   ============================================================ */
(() => {
  'use strict';
  const d3 = window.d3;

  // ---------- projection ----------
  const LAT_TOP = 85, LAT_BOT = -75;
  const view = { w: 0, h: 0, dpr: 1, pxd: 1, half: 90 };
  let centerLon = -30;

  const wrap = d => ((d + 540) % 360) - 180;
  const xOf = lon => wrap(lon - centerLon) * view.pxd + view.w / 2;
  const yOf = lat => (LAT_TOP - lat) * view.pxd;

  // ---------- palette ----------
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const HAZE = rgb('#93A3AC'), TEAL = rgb('#12776E'), AMBER = rgb('#C1731F');
  const PALETTES = {
    neutral: [HAZE, TEAL, AMBER],
    warm:    [rgb('#A89C8A'), rgb('#B9812D'), rgb('#8F4B10')],
    pale:    [rgb('#B5BEC2'), rgb('#9DB0B4'), rgb('#8FA6A9')],
    teal:    [rgb('#8FA6A9'), rgb('#12776E'), rgb('#0A5D64')],
    hot:     [rgb('#9AA6AD'), rgb('#B25E14'), rgb('#7E2D0C')],
  };

  // ---------- chapter presets ----------
  // tr trades · we westerlies · je jet · po polar easterlies
  // dd doldrums damping · mo monsoon · noi curl-noise · spd tempo
  // fade trail decay · cLon center longitude · pal palette
  // band [latN, latS] for the rail bracket · spawn respawn bias
  const PRESETS = [
    { name: 'PROLOGUE', tr: .95, we: .85, je: .35, po: .6, dd: .55, mo: .12, noi: 1,   spd: 1,    fade: .038, cLon: -30,  pal: 'neutral', band: [LAT_TOP, LAT_BOT], spawn: null },
    { name: 'I · THE ENGINE', tr: 1.05, we: 1, je: .45, po: .95, dd: .5, mo: .1, noi: .9, spd: 1.05, fade: .042, cLon: -30, pal: 'neutral', band: [LAT_TOP, LAT_BOT], spawn: null },
    { name: 'II · THE TRADES', tr: 1.7, we: .3, je: .12, po: .25, dd: .5, mo: .05, noi: .4, spd: 1.1, fade: .04, cLon: -45, pal: 'warm', band: [30, 5], spawn: { bands: [[5, 30], [-28, -5]] } },
    { name: 'III · THE DOLDRUMS', tr: .22, we: .12, je: .04, po: .1, dd: 1.65, mo: 0, noi: .5, spd: .26, fade: .012, cLon: -25, pal: 'pale', band: [5, -5], spawn: { bands: [[-12, 12]] } },
    { name: 'IV · THE MONSOON', tr: .55, we: .3, je: .1, po: .2, dd: .18, mo: 1.75, noi: .55, spd: 1.15, fade: .048, cLon: 68, pal: 'teal', band: [25, -10], spawn: { bands: [[-14, 26]], lon: [36, 104] } },
    { name: 'V · THE JET STREAM', tr: .3, we: .95, je: 1.85, po: .4, dd: .3, mo: .05, noi: .5, spd: 1.45, fade: .05, cLon: -175, pal: 'hot', band: [60, 35], spawn: { bands: [[34, 62]] } },
    { name: 'CODA · WINDBORNE', tr: .95, we: .85, je: .4, po: .6, dd: .55, mo: .12, noi: .9, spd: .92, fade: .04, cLon: -30, pal: 'neutral', band: [LAT_TOP, LAT_BOT], spawn: null },
  ];
  PRESETS.forEach(p => { p.cols = PALETTES[p.pal]; });

  // live state (smoothed toward scroll-blended target)
  const S = { tr: 0, we: 0, je: 0, po: 0, dd: .5, mo: 0, noi: 1, spd: 1, fade: .05, cols: PALETTES.neutral.map(c => c.slice()) };

  // ---------- coastlines, drawn from memory (artistic model) ----------
  const LAND = [
    // North America
    [-166,64,-158,58,-148,60,-137,58,-130,52,-124,48,-121,40,-115,32,-108,25,-103,19,-96,16,-92,14,-87,12,-83,9,-78,8,-83,11,-87,14,-90,17,-87,21,-91,19,-95,19,-97,23,-97,27,-93,30,-89,30,-84,30,-81,26,-80,25,-81,30,-77,34,-75,38,-71,41,-66,44,-60,47,-55,50,-58,54,-62,58,-68,60,-78,62,-82,66,-88,64,-94,66,-102,68,-112,68,-122,69,-132,69,-141,70,-152,71,-162,68],
    // South America
    [-78,7,-72,11,-64,10,-56,5,-50,0,-44,-3,-37,-6,-35,-9,-39,-14,-41,-22,-48,-26,-52,-33,-57,-38,-62,-40,-65,-44,-68,-48,-71,-52,-68,-55,-72,-52,-73,-46,-73,-38,-71,-31,-70,-22,-72,-16,-76,-13,-81,-5,-80,1,-77,4],
    // Greenland
    [-46,60,-50,63,-54,67,-56,71,-60,75,-62,78,-58,81,-48,83,-36,83,-26,81,-20,76,-22,71,-26,66,-32,63,-40,60],
    // Africa
    [-9,32,-6,35,0,37,10,37,20,32,27,32,32,31,34,28,37,21,40,15,43,11,48,11,51,12,46,4,41,-1,39,-7,36,-15,34,-20,32,-26,27,-33,21,-35,17,-33,14,-26,12,-18,13,-11,9,-2,9,4,4,6,-2,5,-8,4,-13,8,-17,14,-16,20,-13,26],
    // Eurasia
    [-9,43,-9,37,-6,36,-2,37,1,41,6,43,10,44,14,41,17,39,19,40,22,37,26,37,31,37,36,36,35,32,34,29,37,24,40,18,43,13,49,14,55,18,59,23,56,27,61,25,66,25,68,23,71,20,73,15,77,8,80,14,84,19,89,22,92,20,95,16,98,10,100,5,103,1.5,104,6,106,10,109,13,109,17,106,20,108,22,114,22.5,118,25,121,29,122,32,120,35,122,38,125,39,127,42,131,43,135,46,137,50,141,53,138,56,142,59,147,60,152,59,157,52,162,57,170,61,178,65,179,68,170,70,160,71,148,73,135,73,125,73,113,74,104,77,95,76,85,73,76,72,68,69,60,69,55,71,48,68,44,67,40,66,33,69,28,71,24,71,18,69,12,65,5,62,5,59,8,58,8,55,5,53,3,51,0,49,-2,49,-5,48,-1,46,-2,43],
    // Australia
    [113,-22,114,-26,115,-31,118,-34,124,-33,130,-32,134,-33,138,-36,141,-38,145,-39,148,-38,151,-34,153,-29,153,-24,149,-20,146,-17,143,-11,137,-12,132,-11,128,-15,124,-16,119,-20],
  ];
  // islands as tilted ellipses [lon, lat, rx°, ry°, rot°]
  const ISLES = [
    [-3.5,54,2.2,4.2,8],[-8,53.3,1.5,1.9,0],[-19,65,3,1.7,0],[47,-19,1.9,6.3,-15],
    [140,38.5,1.7,4.4,-28],[133.5,34,2.6,1.3,-12],[101.5,-1.5,5.8,1.7,-40],[114,0.5,4.4,3.6,0],
    [141,-5.5,6.8,2.4,-8],[110,-7.3,4.8,1,-4],[122,13.5,1.6,3.8,-14],[171.5,-42.5,2,5.2,-35],
    [81,7.6,1,1.7,0],[-79,21.6,4.6,1,-12],[-71,19,2.2,1.2,0],[-61,-51.6,1.6,0.9,0],
  ];

  // ---------- canvases ----------
  const chartC = document.getElementById('chart');
  const trailC = document.getElementById('trails');
  const cx = chartC.getContext('2d');
  const tx = trailC.getContext('2d');
  let lastChartLon = 999;

  function resize() {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.pxd = view.h / (LAT_TOP - LAT_BOT);
    view.half = (view.w / 2) / view.pxd;
    for (const c of [chartC, trailC]) {
      c.width = Math.round(view.w * view.dpr);
      c.height = Math.round(view.h * view.dpr);
    }
    cx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    tx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    drawChart(true);
    layoutRail();
    computeAnchors();
  }

  // ---------- chart layer ----------
  const landLine = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.6)).context(null);

  function drawChart(force) {
    if (!force && Math.abs(wrap(centerLon - lastChartLon)) < 0.02) return;
    lastChartLon = centerLon;
    cx.clearRect(0, 0, view.w, view.h);

    // graticule — meridians every 30°
    cx.strokeStyle = 'rgba(55,69,79,0.07)';
    cx.lineWidth = 1;
    for (let L = -180; L < 180; L += 30) {
      const x = xOf(L);
      if (x < -4 || x > view.w + 4) continue;
      cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, view.h); cx.stroke();
    }
    // parallels at ±60, ±30 (dashed) and the equator (teal)
    for (const lat of [60, 30, -30, -60]) {
      const y = yOf(lat);
      cx.strokeStyle = 'rgba(55,69,79,0.09)';
      cx.setLineDash([2, 5]);
      cx.beginPath(); cx.moveTo(0, y); cx.lineTo(view.w, y); cx.stroke();
    }
    cx.setLineDash([6, 6]);
    cx.strokeStyle = 'rgba(18,119,110,0.28)';
    const yEq = yOf(0);
    cx.beginPath(); cx.moveTo(0, yEq); cx.lineTo(view.w, yEq); cx.stroke();
    cx.setLineDash([]);

    // landmasses (3 wrap copies)
    cx.fillStyle = 'rgba(55,69,79,0.075)';
    cx.strokeStyle = 'rgba(55,69,79,0.22)';
    landLine.context(cx);
    for (const poly of LAND) {
      for (const k of [-360, 0, 360]) {
        const pts = [];
        let visible = false;
        for (let i = 0; i < poly.length; i += 2) {
          const x = (poly[i] + k - centerLon) * view.pxd + view.w / 2;
          const y = yOf(poly[i + 1]);
          if (x > -80 && x < view.w + 80) visible = true;
          pts.push([x, y]);
        }
        if (!visible) continue;
        cx.beginPath();
        landLine(pts);
        cx.fill(); cx.stroke();
      }
    }
    // island ellipses
    for (const [lo, la, rx, ry, rot] of ISLES) {
      for (const k of [-360, 0, 360]) {
        const x = (lo + k - centerLon) * view.pxd + view.w / 2;
        if (x < -60 || x > view.w + 60) continue;
        cx.beginPath();
        cx.ellipse(x, yOf(la), rx * view.pxd, ry * view.pxd, rot * Math.PI / 180, 0, Math.PI * 2);
        cx.fill(); cx.stroke();
      }
    }
    // Antarctica — a wavy shore along the bottom
    for (const k of [-360, 0, 360]) {
      cx.beginPath();
      let started = false;
      for (let L = -180; L <= 180; L += 6) {
        const lat = -69 + 3.4 * Math.sin(L * Math.PI / 60) + 2.2 * Math.sin(L * Math.PI / 25 + 2) + 7 * Math.exp(-((L + 60) ** 2) / 220);
        const x = (L + k - centerLon) * view.pxd + view.w / 2;
        const y = yOf(lat);
        if (!started) { cx.moveTo(x, y); started = true; } else cx.lineTo(x, y);
      }
      cx.lineTo((180 + k - centerLon) * view.pxd + view.w / 2, view.h + 20);
      cx.lineTo((-180 + k - centerLon) * view.pxd + view.w / 2, view.h + 20);
      cx.closePath();
      cx.fill(); cx.stroke();
    }
  }

  // ---------- the wind ----------
  const jetLat = (lon, t) => 48 + 8 * Math.sin(lon * 0.062 + t * 0.11) + 4.5 * Math.sin(lon * 0.031 - t * 0.045 + 1.7);

  function noiseF(x, y, t) {
    return Math.sin(x * 1.7 + t * 0.31) * Math.cos(y * 1.35 - t * 0.23)
         + 0.55 * Math.sin(x * 3.1 - t * 0.17 + y * 0.9) * Math.cos(y * 2.35 + t * 0.27)
         + 0.32 * Math.sin(x * 5.3 + t * 0.12) * Math.cos(x * 0.7 - y * 3.7 - t * 0.19);
  }

  const wind = (lon, lat, t, out) => {
    const alat = Math.abs(lat), sgn = lat >= 0 ? 1 : -1;
    let u = 0, v = 0;

    const te = Math.exp(-((alat - 15) ** 2) / 130);          // trade easterlies
    u -= 22 * te * S.tr;
    v -= sgn * 7 * te * S.tr;

    const we = Math.exp(-((alat - 46) ** 2) / 180);          // westerlies
    u += 26 * we * S.we;
    v += sgn * 3.5 * we * S.we * Math.sin(lon * 0.09 + t * 0.35 + sgn);

    const pe = Math.exp(-((alat - 74) ** 2) / 160);          // polar easterlies
    u -= 12 * pe * S.po;

    const jN = jetLat(lon, t);                               // polar jet, NH
    const gN = Math.exp(-((lat - jN) ** 2) / 26);
    if (gN > 0.001) {
      const slope = (jetLat(lon + 4, t) - jetLat(lon - 4, t)) / 8;
      u += 150 * gN * S.je;
      v += 135 * gN * S.je * slope;
    }
    const jS = -52 - 5 * Math.sin(lon * 0.052 - t * 0.06 + 2); // subdued SH jet
    const gS = Math.exp(-((lat - jS) ** 2) / 30);
    u += 44 * gS * S.je;

    const me = Math.exp(-((lon - 72) ** 2) / 900) * Math.exp(-((lat - 8) ** 2) / 380);
    u += 20 * me * S.mo;                                     // SW monsoon surge
    v += 34 * me * S.mo;

    const itcz = 5 + 2 * Math.cos((lon + 20) * 0.03);        // convergence lull
    const damp = 1 - Math.min(1, S.dd * Math.exp(-((lat - itcz) ** 2) / 60));
    u *= damp; v *= damp;

    const nx = lon * 0.045, ny = lat * 0.045, e = 0.03;      // curl noise
    const dndy = (noiseF(nx, ny + e, t) - noiseF(nx, ny - e, t)) / (2 * e);
    const dndx = (noiseF(nx + e, ny, t) - noiseF(nx - e, ny, t)) / (2 * e);
    u += 3.2 * dndy * S.noi;
    v -= 3.2 * dndx * S.noi;

    out[0] = u * S.spd;
    out[1] = v * S.spd;
  };

  // ---------- particles ----------
  const MOBILE = window.matchMedia('(max-width: 700px)').matches;
  const N = MOBILE ? 1300 : 3000;
  const DEG_PER = 0.45; // degrees per second per (km/h)
  const particles = [];
  let domIdx = 0; // dominant chapter for spawn bias

  function spawn(p, fresh) {
    const sp = PRESETS[domIdx].spawn;
    if (sp && Math.random() < 0.62) {
      const b = sp.bands[(Math.random() * sp.bands.length) | 0];
      p.lat = b[0] + Math.random() * (b[1] - b[0]);
      p.lon = sp.lon
        ? sp.lon[0] + Math.random() * (sp.lon[1] - sp.lon[0])
        : centerLon + (Math.random() * 2 - 1) * (view.half + 14);
    } else {
      p.lat = LAT_BOT + Math.random() * (LAT_TOP - LAT_BOT);
      p.lon = centerLon + (Math.random() * 2 - 1) * (view.half + 14);
    }
    p.age = fresh ? Math.random() * 8 : 0;
    p.life = 5 + Math.random() * 9;
    p.sp = 0;
    p.skip = true; // don't draw a segment on the respawn frame
  }

  for (let i = 0; i < N; i++) { const p = {}; spawn(p, true); particles.push(p); }

  // ---------- trail rendering ----------
  const NB = 40;                       // stroke buckets by speed
  const buckets = Array.from({ length: NB }, () => []);
  const lut = new Array(NB);

  function buildLut() {
    const [slow, mid, fast] = S.cols;
    for (let i = 0; i < NB; i++) {
      const t = i / (NB - 1);
      let r, g, b;
      if (t < 0.5) {
        const u = t * 2;
        r = slow[0] + (mid[0] - slow[0]) * u; g = slow[1] + (mid[1] - slow[1]) * u; b = slow[2] + (mid[2] - slow[2]) * u;
      } else {
        const u = t * 2 - 1;
        r = mid[0] + (fast[0] - mid[0]) * u; g = mid[1] + (fast[1] - mid[1]) * u; b = mid[2] + (fast[2] - mid[2]) * u;
      }
      const a = 0.34 + 0.5 * t;
      lut[i] = `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`;
    }
  }

  const wout = [0, 0];
  function step(dt, t) {
    // fade old trails toward transparency so the chart ghosts through
    tx.globalCompositeOperation = 'destination-out';
    tx.fillStyle = `rgba(0,0,0,${S.fade})`;
    tx.fillRect(0, 0, view.w, view.h);
    tx.globalCompositeOperation = 'source-over';

    for (const b of buckets) b.length = 0;

    for (const p of particles) {
      const x1 = xOf(p.lon), y1 = yOf(p.lat);
      wind(p.lon, p.lat, t, wout);
      const spd = Math.hypot(wout[0], wout[1]);
      p.sp = spd;
      let du = wout[0] * DEG_PER * dt, dv = wout[1] * DEG_PER * dt;
      const dm = Math.hypot(du, dv);
      if (dm > 2.4) { du *= 2.4 / dm; dv *= 2.4 / dm; } // keep streaks continuous
      p.lon += du;
      p.lat += dv;
      p.age += dt;

      if (p.age > p.life || p.lat > LAT_TOP + 3 || p.lat < LAT_BOT - 3 ||
          Math.abs(wrap(p.lon - centerLon)) > view.half + 16) {
        spawn(p, false);
        continue;
      }
      let x2 = xOf(p.lon), y2 = yOf(p.lat);
      if (p.skip) { p.skip = false; continue; }
      if (Math.abs(x2 - x1) > view.w / 2) continue; // wrapped across the seam
      // becalmed tracers still leave a visible mote of drift
      const dxp = x2 - x1, dyp = y2 - y1;
      const lenp = Math.hypot(dxp, dyp);
      if (lenp < 0.5) {
        if (lenp > 0.02) {
          const f = 0.5 / lenp;
          x2 = x1 + dxp * f; y2 = y1 + dyp * f;
        } else { continue; }
      }
      const bi = Math.min(NB - 1, (spd / 110 * NB) | 0);
      buckets[bi].push(x1, y1, x2, y2);
    }

    tx.lineWidth = 1.1;
    tx.lineCap = 'round';
    for (let i = 0; i < NB; i++) {
      const b = buckets[i];
      if (!b.length) continue;
      tx.strokeStyle = lut[i];
      tx.beginPath();
      for (let j = 0; j < b.length; j += 4) {
        tx.moveTo(b[j], b[j + 1]);
        tx.lineTo(b[j + 2], b[j + 3]);
      }
      tx.stroke();
    }
  }

  // ---------- scroll director ----------
  const sections = Array.from(document.querySelectorAll('[data-ch]'));
  const anchors = []; // {center, halfW} in document space

  function computeAnchors() {
    const sy = window.scrollY;
    anchors.length = 0;
    for (const el of sections) {
      const r = el.getBoundingClientRect();
      anchors.push({
        center: sy + r.top + r.height / 2,
        halfW: (r.height + view.h) / 2 * 0.92,
      });
    }
  }

  const weights = new Array(PRESETS.length).fill(0);
  const target = { tr: 0, we: 0, je: 0, po: 0, dd: 0, mo: 0, noi: 0, spd: 0, fade: 0 };
  let targetLon = -30;

  function blendTarget() {
    const s = window.scrollY + view.h / 2;
    let sum = 0, best = 0, bestW = -1;
    for (let i = 0; i < anchors.length; i++) {
      const d = Math.abs(s - anchors[i].center) / anchors[i].halfW;
      const w = Math.max(0, 1 - d);
      weights[i] = w * w * (3 - 2 * w); // smoothstep kernel
      sum += weights[i];
      if (weights[i] > bestW) { bestW = weights[i]; best = i; }
    }
    if (sum <= 0) { // beyond every kernel: adopt the nearest chapter wholesale
      let nd = Infinity;
      for (let i = 0; i < anchors.length; i++) {
        const d = Math.abs(s - anchors[i].center);
        if (d < nd) { nd = d; best = i; }
      }
      weights[best] = 1; sum = 1;
    }
    for (const k in target) target[k] = 0;
    let cosL = 0, sinL = 0;
    const cols = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < PRESETS.length; i++) {
      const w = weights[i] / sum;
      if (w === 0) continue;
      const p = PRESETS[i];
      target.tr += p.tr * w; target.we += p.we * w; target.je += p.je * w;
      target.po += p.po * w; target.dd += p.dd * w; target.mo += p.mo * w;
      target.noi += p.noi * w; target.spd += p.spd * w; target.fade += p.fade * w;
      cosL += Math.cos(p.cLon * Math.PI / 180) * w;
      sinL += Math.sin(p.cLon * Math.PI / 180) * w;
      for (let c = 0; c < 3; c++) for (let ch = 0; ch < 3; ch++) cols[c][ch] += p.cols[c][ch] * w;
    }
    targetLon = Math.atan2(sinL, cosL) * 180 / Math.PI;
    if (best !== domIdx) { domIdx = best; onChapter(best); }
    return cols;
  }

  function smooth(dt) {
    const cols = blendTarget();
    const k = 1 - Math.exp(-2.6 * dt);
    for (const key in target) S[key] += (target[key] - S[key]) * k;
    const dLon = wrap(targetLon - centerLon);
    centerLon += dLon * Math.min(1, 2 * dt);
    // during a fast pan, strengthen the fade so stale trails wipe like a gust
    S.fade = Math.min(0.24, S.fade + Math.abs(dLon) * 0.0009);
    for (let c = 0; c < 3; c++) for (let ch = 0; ch < 3; ch++) S.cols[c][ch] += (cols[c][ch] - S.cols[c][ch]) * k;
  }

  // ---------- HUD + latitude rail ----------
  const railEl = document.getElementById('lat-rail');
  const bracketEl = document.getElementById('rail-bracket');
  const chEl = document.getElementById('readout-ch');
  const flowEl = document.getElementById('readout-flow');
  const RAIL_LATS = [[75, '', 1], [60, '60°N', 0], [45, '', 1], [30, '30°N', 0], [15, '', 1],
    [0, 'EQ', 0], [-15, '', 1], [-30, '30°S', 0], [-45, '', 1], [-60, '60°S', 0]];
  const tickEls = [];

  function buildRail() {
    for (const [lat, lbl, minor] of RAIL_LATS) {
      const t = document.createElement('span');
      t.className = 'rail-tick' + (minor ? ' minor' : '') + (lat === 0 ? ' eq' : '');
      if (lbl) t.innerHTML = `<span class="lbl">${lbl}</span>`;
      railEl.appendChild(t);
      tickEls.push([lat, t]);
    }
  }

  function layoutRail() {
    for (const [lat, el] of tickEls) el.style.top = (yOf(lat) / view.h * 100) + '%';
  }

  function onChapter(i) {
    const p = PRESETS[i];
    chEl.textContent = p.name;
    const [top, bot] = p.band;
    bracketEl.style.top = (yOf(top) / view.h * 100) + '%';
    bracketEl.style.height = ((yOf(bot) - yOf(top)) / view.h * 100) + '%';
    bracketEl.style.opacity = (top === LAT_TOP && bot === LAT_BOT) ? 0 : 0.9;
    for (const [lat, el] of tickEls) {
      el.classList.toggle('active', lat <= top && lat >= bot && !(top === LAT_TOP && bot === LAT_BOT));
    }
  }

  let flowTimer = 0;
  function updateFlow(t) {
    if (t - flowTimer < 0.45) return;
    flowTimer = t;
    let s = 0; const n = Math.min(220, particles.length);
    for (let i = 0; i < n; i++) s += particles[i].sp;
    const mean = s / n;
    flowEl.innerHTML = `MEAN FLOW ${String(Math.round(mean)).padStart(3, '0')} KM/H<span class="readout-n"> · ${N.toLocaleString('en-US')} TRACERS</span>`;
  }

  // ---------- pointer sounding vane ----------
  // moving the pointer takes a live sounding of the field: local wind
  // speed, bearing and coordinates, measured from the same function
  // that drives the tracers.
  const FINE = window.matchMedia('(pointer: fine)').matches;
  let vane = null, vx = -1, vy = -1, vOn = false, vaneTimer = 0;
  const vout = [0, 0];
  const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

  function initVane() {
    vane = document.createElement('div');
    vane.className = 'vane';
    vane.setAttribute('aria-hidden', 'true');
    vane.innerHTML = '<span class="vane-dir">→</span><span class="vane-kmh"></span><span class="vane-pos"></span>';
    document.body.appendChild(vane);
    window.addEventListener('pointermove', e => {
      vx = e.clientX; vy = e.clientY;
      const t = e.target;
      vOn = !(t.closest && t.closest('.card, .hud, .lat-rail, .colophon-inner, .model-note, a'));
    }, { passive: true });
    // pointerleave doesn't bubble to window; pointerout with a null
    // relatedTarget is the reliable "left the window" signal
    document.addEventListener('pointerout', e => { if (!e.relatedTarget) vOn = false; }, { passive: true });
  }

  function updateVane(t) {
    if (!vane || vx < 0) return;
    vane.classList.toggle('on', vOn);
    if (!vOn) return;
    // flip to the far side of the pointer near the viewport edges
    const vw = vane.offsetWidth, vh = vane.offsetHeight;
    const fx = (vx + 16 + vw > view.w - 6) ? vx - 14 - vw : vx + 16;
    const fy = (vy + 20 + vh > view.h - 6) ? vy - 16 - vh : vy + 20;
    vane.style.transform = `translate(${fx}px, ${fy}px)`;
    if (t - vaneTimer < 0.15) return;
    vaneTimer = t;
    const lon = wrap(centerLon + (vx - view.w / 2) / view.pxd);
    const lat = LAT_TOP - vy / view.pxd;
    wind(lon, lat, t, vout);
    const spd = Math.round(Math.hypot(vout[0], vout[1]));
    const toDeg = (Math.atan2(vout[0], vout[1]) * 180 / Math.PI + 360) % 360;
    const dirEl = vane.firstChild;
    dirEl.style.transform = `rotate(${Math.round(Math.atan2(-vout[1], vout[0]) * 180 / Math.PI)}deg)`;
    vane.children[1].textContent = `${spd} KM/H ${COMPASS[Math.round(toDeg / 22.5) % 16]}`;
    vane.children[2].textContent = ` · ${Math.abs(lat).toFixed(0)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(0)}°${lon >= 0 ? 'E' : 'W'}`;
  }

  // ---------- chrome yields to the essay ----------
  // fixed chips (HUD, footnote, legend) step aside while a card
  // passes beneath them, so the copy is never occluded.
  const chromeEls = [document.querySelector('.wordmark'), document.getElementById('readout'),
    document.querySelector('.model-note'), document.getElementById('legend')];
  const proseEls = Array.from(document.querySelectorAll('.card, .colophon-inner'));
  let chromeTimer = -1;
  function updateChrome(t) {
    if (t - chromeTimer < 0.18) return;
    chromeTimer = t;
    const rects = [];
    for (const el of proseEls) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -24 || r.top > view.h + 24) continue;
      rects.push(r);
    }
    const M = 20; // begin yielding just before contact
    for (const el of chromeEls) {
      const c = el.getBoundingClientRect();
      if (!c.width) continue;
      let hit = false;
      for (const r of rects) {
        if (r.left < c.right + M && r.right > c.left - M &&
            r.top < c.bottom + M && r.bottom > c.top - M) { hit = true; break; }
      }
      el.classList.toggle('yield', hit);
    }
  }

  // ---------- tracer-speed legend ----------
  // the ramp is tinted live from the same smoothed palette that
  // colors the tracers, so it re-focuses with each chapter.
  const legendBar = document.getElementById('legend-bar');
  let legendTimer = -1;
  function updateLegend(t) {
    if (t - legendTimer < 0.12) return;
    legendTimer = t;
    const c = S.cols;
    legendBar.style.background =
      `linear-gradient(90deg, rgb(${c[0][0] | 0},${c[0][1] | 0},${c[0][2] | 0}), ` +
      `rgb(${c[1][0] | 0},${c[1][1] | 0},${c[1][2] | 0}), ` +
      `rgb(${c[2][0] | 0},${c[2][1] | 0},${c[2][2] | 0}))`;
  }

  // ---------- windblown title ----------
  function splitTitle() {
    const h1 = document.getElementById('title');
    const text = h1.textContent;
    h1.setAttribute('aria-label', text);
    h1.textContent = '';
    h1.classList.add('split');
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'lt';
      s.style.setProperty('--i', i);
      s.setAttribute('aria-hidden', 'true');
      s.textContent = ch;
      h1.appendChild(s);
    });
  }

  // ---------- card reveals ----------
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); }
  }, { threshold: 0.18 });
  document.querySelectorAll('.card').forEach(c => io.observe(c));

  // ---------- main loop ----------
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, lastT = 0, running = false, fieldVisible = true;
  let prevScrollY = null, lastJump = -10;

  // teleport scrolls (anchor jumps, dragged scrollbars) land on a
  // fully-formed field: adopt the target regime and pre-run the sim
  function fastForward(t) {
    const cols = blendTarget();
    for (const k in target) S[k] = target[k];
    for (let c = 0; c < 3; c++) for (let ch = 0; ch < 3; ch++) S.cols[c][ch] = cols[c][ch];
    centerLon = targetLon;
    drawChart(true);
    tx.clearRect(0, 0, view.w, view.h);
    buildLut();
    for (const p of particles) spawn(p, true);
    for (let i = 46; i > 0; i--) step(1 / 30, t - i / 30);
  }

  function frame(ms) {
    raf = requestAnimationFrame(frame);
    const t = ms / 1000;
    const dt = Math.min(0.05, lastT ? t - lastT : 0.016);
    lastT = t;
    const sy = window.scrollY;
    if (prevScrollY !== null && Math.abs(sy - prevScrollY) > view.h * 1.8 && t - lastJump > 0.9) {
      lastJump = t;
      fastForward(t);
    }
    prevScrollY = sy;
    smooth(dt);
    drawChart(false);
    buildLut();
    step(dt, t);
    updateFlow(t);
    updateVane(t);
    updateChrome(t);
    updateLegend(t);
  }

  function start() {
    if (running || REDUCED || !fieldVisible || document.hidden) return;
    running = true;
    lastT = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
  }

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  new IntersectionObserver(en => {
    fieldVisible = en[0].isIntersecting;
    fieldVisible ? start() : stop();
  }).observe(document.querySelector('.field'));

  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(resize, 120);
  });

  // ---------- reduced motion: one long-exposure still ----------
  function stillLife() {
    Object.assign(S, PRESETS[0], { cols: PRESETS[0].cols.map(c => c.slice()) });
    drawChart(true);
    buildLut();
    for (let i = 0; i < 340; i++) step(0.05, i * 0.05);
    onChapter(0);
    updateLegend(0);
    flowEl.textContent = 'LONG EXPOSURE · MOTION REDUCED';
  }

  // ---------- boot ----------
  resize();
  buildRail();
  layoutRail();
  onChapter(0);
  document.getElementById('cue-count').textContent = N.toLocaleString('en-US');
  if (!REDUCED) splitTitle();
  if (!REDUCED && FINE) initVane();

  if (REDUCED) {
    stillLife();
    // no rAF loop, but the readout and rail still follow the reader
    window.addEventListener('scroll', () => {
      const s = window.scrollY + view.h / 2;
      let best = 0, nd = Infinity;
      for (let i = 0; i < anchors.length; i++) {
        const d = Math.abs(s - anchors[i].center);
        if (d < nd) { nd = d; best = i; }
      }
      if (best !== domIdx) { domIdx = best; onChapter(best); }
      updateChrome(performance.now() / 1000);
    }, { passive: true });
    updateChrome(0);
  } else {
    Object.assign(S, {
      tr: PRESETS[0].tr, we: PRESETS[0].we, je: PRESETS[0].je, po: PRESETS[0].po,
      dd: PRESETS[0].dd, mo: PRESETS[0].mo, noi: PRESETS[0].noi, spd: PRESETS[0].spd, fade: PRESETS[0].fade,
    });
    start();
  }

  const ready = () => document.body.classList.add('ready');
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { ready(); computeAnchors(); });
  }
  setTimeout(ready, 900);           // fallback
  setTimeout(computeAnchors, 1400); // anchors settle after fonts/layout
})();
