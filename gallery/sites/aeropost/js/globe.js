/* LIGNE AUSTRALE — the mail flies its route while you read.
   d3-geo orthographic canvas globe: great-circle legs draw themselves,
   a courier bead flies the active étape, the night terminator sweeps,
   and the wireless log ticks waypoints in 1931 time. */
(() => {
  'use strict';
  const canvas = document.getElementById('globe');
  if (!canvas || typeof d3 === 'undefined' || typeof LAND_50M === 'undefined') return;

  const wrap = canvas.parentElement;
  const logEl = document.getElementById('log');
  const replayBtn = document.getElementById('replay');
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RAD = Math.PI / 180, DEG = 180 / Math.PI;

  /* ---------- palette ---------- */
  const C = {
    grat: 'rgba(217,166,72,.10)',
    land: '#1D3D5E',
    coast: 'rgba(240,229,201,.5)',
    limb: 'rgba(217,166,72,.55)',
    bezel: 'rgba(217,166,72,.28)',
    night: 'rgba(2,8,18,.17)',
    routeDim: 'rgba(240,229,201,.36)',
    route: 'rgba(240,229,201,.92)',
    flown: '#E2604A',
    city: '#D9A648',
    cityPassed: '#E2604A',
    label: '#F0E5C9',
    halo: 'rgba(7,20,38,.92)'
  };

  /* ---------- geography ---------- */
  const CITY = {
    'TOULOUSE': [1.44, 43.60], 'BARCELONE': [2.17, 41.38], 'ALICANTE': [-0.48, 38.35],
    'TANGER': [-5.80, 35.78], 'CASABLANCA': [-7.59, 33.57], 'AGADIR': [-9.60, 30.42],
    'CAP JUBY': [-12.93, 27.94], 'VILLA CISNEROS': [-15.94, 23.68],
    'PORT-ÉTIENNE': [-17.03, 20.93], 'SAINT-LOUIS': [-16.49, 16.03],
    'DAKAR': [-17.45, 14.69], '30° OUEST': [-30.0, -1.5], 'NORONHA': [-32.42, -3.85],
    'NATAL': [-35.21, -5.79], 'RECIFE': [-34.88, -8.05], 'RIO DE JANEIRO': [-43.17, -22.91],
    'MONTEVIDEO': [-56.19, -34.90], 'BUENOS AIRES': [-58.37, -34.60],
    'MENDOZA': [-68.83, -32.89], 'LA CUMBRE': [-70.09, -32.82], 'SANTIAGO': [-70.67, -33.45]
  };
  const MAINS = ['TOULOUSE', 'CASABLANCA', 'DAKAR', 'NATAL', 'BUENOS AIRES', 'SANTIAGO'];

  // times are minutes since Thursday 00:00 (the 1931 weekly schedule)
  const LEGS = [
    {
      names: ['TOULOUSE', 'BARCELONE', 'ALICANTE', 'TANGER', 'CASABLANCA'],
      times: [250, 390, 580, 910, 1070],
      msgs: ['décollage avant l’aube, 12 sacs à bord',
             'escale 15 min, plein d’essence',
             'mer d’huile, moteur régulier',
             'détroit franchi, l’Afrique en vue',
             'courrier transbordé pour le sud']
    },
    {
      names: ['CASABLANCA', 'AGADIR', 'CAP JUBY', 'VILLA CISNEROS', 'PORT-ÉTIENNE', 'SAINT-LOUIS', 'DAKAR'],
      times: [1170, 1335, 1495, 1640, 1795, 2205, 2345],
      msgs: ['décollage de nuit, feux de bord allumés',
             'balise aperçue, vent NNE frais',
             'escale aux fanaux, sables calmes',
             'T.S.F. faible, cap maintenu',
             'aube sur le banc d’Arguin',
             'le fleuve Sénégal par bâbord',
             'courrier remis à l’hydravion']
    },
    {
      names: ['DAKAR', '30° OUEST', 'NORONHA', 'NATAL'],
      times: [3060, 3690, 4210, 4330],
      msgs: ['l’Austral déjauge, houle longue',
             'point par sextant, dérive 4°',
             'feu de l’île par tribord',
             'amerrissage — les palmiers commencent']
    },
    {
      names: ['NATAL', 'RECIFE', 'RIO DE JANEIRO', 'MONTEVIDEO', 'BUENOS AIRES'],
      times: [4660, 4765, 5450, 6095, 6210],
      msgs: ['décollage, la côte au sud',
             'grains évités au large',
             'le Pain de Sucre au couchant',
             'la Plata traversée à l’aube',
             '96 kg de courrier débarqués']
    },
    {
      names: ['BUENOS AIRES', 'MENDOZA', 'LA CUMBRE', 'SANTIAGO'],
      times: [7560, 7805, 7900, 8000],
      msgs: ['cap à l’ouest, la pampa sans fin',
             'le vent du col est bon — on monte',
             '5 900 m, moins vingt degrés',
             'courrier livré : six jours depuis Toulouse']
    }
  ];

  // precompute geometry per leg
  for (const leg of LEGS) {
    leg.pts = leg.names.map(n => CITY[n]);
    leg.cum = [0];
    for (let i = 1; i < leg.pts.length; i++)
      leg.cum[i] = leg.cum[i - 1] + d3.geoDistance(leg.pts[i - 1], leg.pts[i]);
    leg.total = leg.cum[leg.cum.length - 1];
    leg.wpF = leg.cum.map(c => c / leg.total);
    // dense sample of the whole polyline for partial drawing
    const coords = [];
    for (let i = 0; i < leg.pts.length - 1; i++) {
      const ip = d3.geoInterpolate(leg.pts[i], leg.pts[i + 1]);
      const seg = d3.geoDistance(leg.pts[i], leg.pts[i + 1]);
      const n = Math.max(8, Math.ceil(seg / 0.02));
      for (let k = 0; k < n; k++) coords.push(ip(k / n));
    }
    coords.push(leg.pts[leg.pts.length - 1]);
    leg.line = { type: 'LineString', coordinates: coords };
    // fraction of each sample along the leg
    leg.lineF = coords.map((c, i) => i === 0 ? 0 : null);
    let acc = 0;
    for (let i = 1; i < coords.length; i++) {
      acc += d3.geoDistance(coords[i - 1], coords[i]);
      leg.lineF[i] = acc / leg.total;
    }
    leg.km = Math.round(leg.total * 6371);
    leg.flyDur = (8 + leg.km / 350) * 1000; // ms of bead flight
  }
  // the published kilométrage (the timetable's figures include the dog-legs)
  [1850, 2580, 3180, 4110, 1390].forEach((km, i) => { LEGS[i].pubKm = km; });

  function pointAt(leg, f) {
    const t = f * leg.total;
    let i = 1;
    while (i < leg.cum.length - 1 && leg.cum[i] < t) i++;
    const f0 = leg.cum[i - 1], f1 = leg.cum[i];
    const s = f1 > f0 ? (t - f0) / (f1 - f0) : 0;
    return d3.geoInterpolate(leg.pts[i - 1], leg.pts[i])(Math.min(1, Math.max(0, s)));
  }
  function minuteAt(leg, f) {
    let i = 1;
    while (i < leg.wpF.length - 1 && leg.wpF[i] < f) i++;
    const a = leg.wpF[i - 1], b = leg.wpF[i];
    const s = b > a ? (f - a) / (b - a) : 0;
    return leg.times[i - 1] + s * (leg.times[i] - leg.times[i - 1]);
  }
  const hhmm = m => {
    const mm = ((Math.round(m) % 1440) + 1440) % 1440;
    return String(Math.floor(mm / 60)).padStart(2, '0') + String(mm % 60).padStart(2, '0');
  };
  const LEG_LABELS = [
    'ÉTAPE I · LA DESCENTE D’ESPAGNE', 'ÉTAPE II · LA CÔTE DES SABLES',
    'ÉTAPE III · L’ATLANTIQUE SUD', 'ÉTAPE IV · LA CÔTE DU BRÉSIL',
    'ÉTAPE V · LA CORDILLÈRE'
  ];

  /* ---------- versor (quaternion) rotation ---------- */
  function versor(e) {
    const l = e[0] / 2 * RAD, p = e[1] / 2 * RAD, g = e[2] / 2 * RAD;
    const sl = Math.sin(l), cl = Math.cos(l), sp = Math.sin(p), cp = Math.cos(p),
          sg = Math.sin(g), cg = Math.cos(g);
    return [cl * cp * cg + sl * sp * sg, sl * cp * cg - cl * sp * sg,
            cl * sp * cg + sl * cp * sg, cl * cp * sg - sl * sp * cg];
  }
  function eulerFrom(q) {
    return [
      Math.atan2(2 * (q[0] * q[1] + q[2] * q[3]), 1 - 2 * (q[1] * q[1] + q[2] * q[2])) * DEG,
      Math.asin(Math.max(-1, Math.min(1, 2 * (q[0] * q[2] - q[3] * q[1])))) * DEG,
      Math.atan2(2 * (q[0] * q[3] + q[1] * q[2]), 1 - 2 * (q[2] * q[2] + q[3] * q[3])) * DEG
    ];
  }
  function slerp(a, b, t) {
    let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    const B = dot < 0 ? b.map(v => -v) : b.slice();
    dot = Math.abs(dot);
    if (dot > 0.9995) {
      const r = a.map((v, i) => v + t * (B[i] - v));
      const n = Math.hypot(...r);
      return r.map(v => v / n);
    }
    const th = Math.acos(dot), s = Math.sin(th);
    const wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return a.map((v, i) => wa * v + wb * B[i]);
  }

  /* ---------- projection & canvas ---------- */
  const ctx = canvas.getContext('2d');
  const proj = d3.geoOrthographic().clipAngle(90).precision(0.5);
  const geoPath = d3.geoPath(proj, ctx);
  const graticule = d3.geoGraticule().step([15, 15])();
  const SPHERE = { type: 'Sphere' };
  const circleGen = d3.geoCircle();

  let W = 0, H = 0, baseR = 100, dpr = 1;
  function resize() {
    const r = wrap.getBoundingClientRect();
    W = Math.max(10, r.width); H = Math.max(10, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    proj.translate([W / 2, H / 2]);
    baseR = Math.min(W, H) * 0.44;
    // keep the framing honest after a resize: retarget the current view scale
    const tgt = targetFor(active);
    if (view.animating) { view.toS = tgt.s; } else { view.s = tgt.s; }
    applyView();
  }

  /* ---------- view state ---------- */
  const OVERVIEW = { center: [-30, 6], scale: 1 };
  const view = {
    q: versor([30, -6, 0]), s: 100,
    fromQ: null, toQ: null, fromS: 0, toS: 0, t0: 0, dur: 0, animating: false
  };
  function legTarget(leg) {
    const mid = pointAt(leg, 0.5);
    const zoom = Math.min(4.4, Math.max(1, 0.62 / Math.sin(Math.min(leg.total, Math.PI) / 2)));
    return { center: mid, scale: zoom };
  }
  function targetFor(i) {
    const t = i < 0 ? OVERVIEW : legTarget(LEGS[i]);
    return { q: versor([-t.center[0], -t.center[1], 0]), s: t.scale * baseR };
  }
  function goTo(i, instant) {
    const tgt = targetFor(i);
    if (instant || REDUCED) {
      view.q = tgt.q; view.s = tgt.s; view.animating = false;
      applyView();
      return;
    }
    view.fromQ = view.q; view.toQ = tgt.q;
    view.fromS = view.s; view.toS = tgt.s;
    view.t0 = performance.now(); view.dur = 950; view.animating = true;
    kick();
  }
  function applyView() {
    proj.rotate(eulerFrom(view.q));
    proj.scale(view.s);
  }

  /* ---------- flight state ---------- */
  let active = -1;          // -1 = overview
  let phase = 'idle';       // rotate -> draw -> fly -> done
  let phaseT0 = 0;
  let drawFrac = 0, flyFrac = 0, logged = -1;

  function overviewLog() {
    logSep();
    logLine(null, 'MÉTÉO', 'Casablanca ciel pur, Dakar brume au sol', true);
    logLine(null, 'AGADIR', 'balisage vérifié, fanaux prêts', true);
    logLine(null, 'F-LAUS', 'à l’écoute — le courrier attend l’aube à Toulouse', true);
  }

  function setLeg(i) {
    if (i === active) return;
    active = i;
    document.querySelectorAll('.leg').forEach((el, k) =>
      el.classList.toggle('active', k === i));
    if (i < 0) {
      phase = 'idle'; drawFrac = 0; flyFrac = 0; logged = -1;
      overviewLog();
      goTo(-1);
      if (REDUCED) draw();
      return;
    }
    clearChips(i);
    logSep();
    if (REDUCED) {
      phase = 'done'; drawFrac = 1; flyFrac = 1; logged = LEGS[i].times.length - 1;
      LEGS[i].names.forEach((n, k) => { logLine(LEGS[i].times[k], n, LEGS[i].msgs[k], true); markChip(i, k); });
      goTo(i, true);
      draw();
      return;
    }
    phase = 'rotate'; phaseT0 = performance.now();
    drawFrac = 0; flyFrac = 0; logged = -1;
    logLine(LEGS[i].times[0] - 25, LEGS[i].names[0],
      'chargement du courrier, moteur au point fixe', true);
    goTo(i);
  }

  function replay() {
    if (active < 0 || REDUCED) return;
    phase = 'draw'; phaseT0 = performance.now();
    drawFrac = 0; flyFrac = 0; logged = -1;
    clearChips(active);
    logSep();
    logLine(LEGS[active].times[0] - 25, LEGS[active].names[0],
      'chargement du courrier, moteur au point fixe', true);
    kick();
  }
  if (replayBtn) replayBtn.addEventListener('click', replay);

  /* ---------- waypoint chips on the cards ---------- */
  function markChip(i, k) {
    const card = cards[i];
    if (!card) return;
    const li = card.querySelectorAll('.leg-stops li')[k];
    if (li) li.classList.add('passed');
  }
  function clearChips(i) {
    // reset only the (re)activated card: flown legs keep their red stamps
    const card = cards[i];
    if (!card) return;
    card.querySelectorAll('.leg-stops li.passed').forEach(li => li.classList.remove('passed'));
  }

  /* ---------- wireless log — a continuous telegraph tape ---------- */
  function trimLog() {
    while (logEl.children.length > 9) logEl.removeChild(logEl.firstChild);
    [...logEl.children].forEach((el, k, all) =>
      el.classList.toggle('dim', k < all.length - 2));
  }
  function logSep() {
    // end-of-vacation mark between étapes; never opens the tape, never doubles
    if (!logEl || !logEl.children.length) return;
    if (logEl.lastElementChild.classList.contains('sep')) return;
    const li = document.createElement('li');
    li.className = 'sep';
    li.textContent = '· · · · · · · · · ·';
    logEl.appendChild(li);
    trimLog();
  }
  function logLine(min, station, msg, instant) {
    if (!logEl) return;
    const li = document.createElement('li');
    li.innerHTML = (min == null ? '<b>····</b> ' : `<b>${hhmm(min)}</b> `) +
      `<span class="st">${station}</span> — ${msg}`;
    logEl.querySelectorAll('.now').forEach(n => n.classList.remove('now'));
    if (!instant) li.classList.add('now');
    logEl.appendChild(li);
    trimLog();
  }

  /* ---------- solar terminator ---------- */
  function nightShapes(minute) {
    const doy = 106; // 16 April
    const decl = 23.44 * Math.sin(2 * Math.PI * (doy - 81) / 365);
    const utc = (((minute % 1440) + 1440) % 1440) / 60;
    const sunLon = (12 - utc) * 15;
    const center = [sunLon - 180, -decl];
    return [90, 84, 78].map(r => circleGen.center(center).radius(r)());
  }
  function currentMinute() {
    if (active < 0) return 250;
    const leg = LEGS[active];
    if (phase === 'fly') return minuteAt(leg, flyFrac);
    if (phase === 'done') return leg.times[leg.times.length - 1];
    return leg.times[0];
  }

  /* ---------- drawing ---------- */
  function partialLine(leg, frac) {
    if (frac >= 1) return leg.line;
    const cs = leg.line.coordinates, fs = leg.lineF;
    const out = [cs[0]];
    for (let i = 1; i < cs.length && fs[i] <= frac; i++) out.push(cs[i]);
    if (frac > 0) out.push(pointAt(leg, frac));
    return { type: 'LineString', coordinates: out };
  }
  function visible(coord) {
    const r = proj.rotate();
    return d3.geoDistance(coord, [-r[0], -r[1]]) < Math.PI / 2 - 0.01;
  }
  function drawLabel(name, coord, dx, dy) {
    const p = proj(coord);
    if (!p) return;
    ctx.font = '600 10.5px "Josefin Sans", sans-serif';
    try { ctx.letterSpacing = '1.6px'; } catch (e) { /* older engines */ }
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(name).width;
    // negative dx anchors the label to the LEFT of its dot (right-aligned)
    let x = p[0] + (dx == null ? 10 : dx), align = dx != null && dx < 0 ? 'right' : 'left';
    if (align === 'left' && x + w > W - 8) { x = p[0] - 10; align = 'right'; }
    const y = p[1] + (dy || 0);
    ctx.textAlign = align;
    ctx.lineWidth = 3.5; ctx.strokeStyle = C.halo; ctx.lineJoin = 'round';
    ctx.strokeText(name, x, y);
    ctx.fillStyle = C.label;
    ctx.fillText(name, x, y);
    try { ctx.letterSpacing = '0px'; } catch (e) {}
  }
  function dot(coord, r, fill, ring) {
    if (!visible(coord)) return;
    const p = proj(coord);
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI);
    ctx.fillStyle = fill; ctx.fill();
    if (ring) {
      ctx.beginPath(); ctx.arc(p[0], p[1], r + 3.5, 0, 2 * Math.PI);
      ctx.strokeStyle = fill; ctx.lineWidth = 1; ctx.globalAlpha = .6; ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = proj.scale();

    // instrument bezel (fixed, drawn at base radius so it frames the map)
    const bez = Math.min(baseR * 1.06, Math.min(W, H) / 2 - 2);
    ctx.save();
    ctx.strokeStyle = C.bezel; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, bez, 0, 2 * Math.PI); ctx.stroke();
    for (let a = 0; a < 360; a += 15) {
      const long = a % 90 === 0;
      const r0 = bez - (long ? 8 : 4);
      const x0 = cx + r0 * Math.cos(a * RAD), y0 = cy + r0 * Math.sin(a * RAD);
      const x1 = cx + bez * Math.cos(a * RAD), y1 = cy + bez * Math.sin(a * RAD);
      ctx.globalAlpha = long ? .5 : .3;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.restore();

    // sphere
    ctx.save();
    ctx.beginPath(); geoPath(SPHERE); ctx.clip();
    const g = ctx.createRadialGradient(cx - R * .35, cy - R * .42, R * .1, cx, cy, R);
    g.addColorStop(0, '#17314F'); g.addColorStop(.62, '#0F2239'); g.addColorStop(1, '#091728');
    ctx.fillStyle = g;
    ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);

    // graticule
    ctx.beginPath(); geoPath(graticule);
    ctx.strokeStyle = C.grat; ctx.lineWidth = .6; ctx.stroke();

    // land
    ctx.beginPath(); geoPath(LAND_50M);
    ctx.fillStyle = C.land; ctx.fill();
    ctx.strokeStyle = C.coast; ctx.lineWidth = .8; ctx.stroke();

    // night terminator, banded like a poster dusk
    for (const shape of nightShapes(currentMinute())) {
      ctx.beginPath(); geoPath(shape);
      ctx.fillStyle = C.night; ctx.fill();
    }

    // routes: all legs dim & dashed
    ctx.setLineDash([4, 7]);
    ctx.strokeStyle = C.routeDim; ctx.lineWidth = 1.1;
    for (let i = 0; i < LEGS.length; i++) {
      if (i === active) continue;
      ctx.beginPath(); geoPath(LEGS[i].line); ctx.stroke();
    }

    if (active >= 0) {
      const leg = LEGS[active];
      // active leg draws itself in, dashed cream
      if (drawFrac > 0) {
        ctx.setLineDash([5, 7]);
        ctx.strokeStyle = C.route; ctx.lineWidth = 1.6;
        ctx.beginPath(); geoPath(partialLine(leg, drawFrac)); ctx.stroke();
      }
      // flown portion: solid mail red with a faint glow
      if (flyFrac > 0) {
        ctx.setLineDash([]);
        ctx.save();
        ctx.shadowColor = 'rgba(226,96,74,.75)'; ctx.shadowBlur = 6;
        ctx.strokeStyle = C.flown; ctx.lineWidth = 2;
        ctx.beginPath(); geoPath(partialLine(leg, flyFrac)); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.setLineDash([]);
    ctx.restore(); // sphere clip

    // limb
    ctx.beginPath(); geoPath(SPHERE);
    ctx.strokeStyle = C.limb; ctx.lineWidth = 1.4; ctx.stroke();

    // cities
    if (active < 0) {
      // overview: Santiago labels left, Buenos Aires drops a line —
      // at globe scale the two sit a finger's width apart and collide
      const OFF = { 'SANTIAGO': [-10, 0], 'BUENOS AIRES': [10, 12] };
      for (const n of MAINS) if (visible(CITY[n])) {
        dot(CITY[n], 2.4, C.city, true);
        const o = OFF[n];
        drawLabel(n, CITY[n], o && o[0], o && o[1]);
      }
    } else {
      const leg = LEGS[active];
      leg.names.forEach((n, k) => {
        if (!visible(CITY[n])) return;
        const passed = phase === 'done' || (phase === 'fly' && flyFrac >= leg.wpF[k]);
        dot(CITY[n], k === 0 || k === leg.names.length - 1 ? 2.6 : 2,
            passed ? C.cityPassed : C.city, k === 0 || k === leg.names.length - 1);
      });
      // labels: endpoints + last passed waypoint (guard: proj() does not
      // clip far-side points, it mirrors them — never label the far side)
      if (visible(leg.pts[0])) drawLabel(leg.names[0], leg.pts[0]);
      if (visible(leg.pts[leg.pts.length - 1]))
        drawLabel(leg.names[leg.names.length - 1], leg.pts[leg.pts.length - 1]);
      if ((phase === 'fly' || phase === 'done') && logged > 0 && logged < leg.names.length - 1
          && visible(leg.pts[logged]))
        drawLabel(leg.names[logged], leg.pts[logged]);
    }

    // the courier (parked at the field while the course is plotted)
    if (active >= 0 && (phase === 'fly' || phase === 'done' || phase === 'draw')) {
      const leg = LEGS[active];
      const f = phase === 'done' ? 1 : phase === 'draw' ? 0.0005 : flyFrac;
      const c0 = pointAt(leg, Math.min(f, 0.999));
      if (visible(c0)) {
        const p0 = proj(c0);
        const p1 = proj(pointAt(leg, Math.min(1, f + 0.004)));
        const ang = (f >= 0.999 && p1[0] === p0[0] && p1[1] === p0[1]) ? 0
          : Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
        ctx.save();
        ctx.translate(p0[0], p0[1]); ctx.rotate(ang);
        ctx.shadowColor = 'rgba(217,166,72,.9)'; ctx.shadowBlur = 9;
        ctx.beginPath(); // wings
        ctx.moveTo(2.4, 0); ctx.lineTo(-2.4, -8.6); ctx.lineTo(-4.8, -8.6);
        ctx.lineTo(-1.8, 0); ctx.lineTo(-4.8, 8.6); ctx.lineTo(-2.4, 8.6);
        ctx.closePath();
        // fuselage
        ctx.moveTo(9, 0); ctx.lineTo(-6.8, 2.3); ctx.lineTo(-5.2, 0); ctx.lineTo(-6.8, -2.3);
        ctx.closePath();
        ctx.fillStyle = '#F0E5C9'; ctx.fill();
        ctx.restore();
      }
    }

    // cartouche — the map names its étape and counts the kilometres
    const fmtKm = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const label = active < 0 ? 'LA LIGNE ENTIÈRE · TOULOUSE — SANTIAGO' : LEG_LABELS[active];
    const sub = active < 0 ? '13 110 KM — SIX JOURS, CINQ NUITS'
      : fmtKm(Math.round((phase === 'done' ? 1 : phase === 'fly' ? flyFrac : 0) * LEGS[active].pubKm))
        + ' / ' + fmtKm(LEGS[active].pubKm) + ' KM';
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = C.halo;
    ctx.font = '700 10px "Josefin Sans", sans-serif';
    try { ctx.letterSpacing = '1.8px'; } catch (e) {}
    ctx.strokeText(label, 15, H - 30);
    ctx.fillStyle = C.city; ctx.fillText(label, 15, H - 30);
    ctx.font = '12px "Cutive Mono", monospace';
    try { ctx.letterSpacing = '0px'; } catch (e) {}
    ctx.strokeText(sub, 15, H - 12);
    ctx.fillStyle = 'rgba(240,229,201,.8)'; ctx.fillText(sub, 15, H - 12);
    ctx.restore();
  }

  /* ---------- animation loop ---------- */
  let running = false, inView = true;
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function frame(now) {
    if (document.hidden || !inView) { running = false; return; }
    let busy = false;

    if (view.animating) {
      const t = Math.min(1, (now - view.t0) / view.dur);
      const e = easeIO(t);
      view.q = slerp(view.fromQ, view.toQ, e);
      view.s = view.fromS + (view.toS - view.fromS) * e;
      applyView();
      if (t >= 1) view.animating = false;
      // the course starts sketching itself once the turn is half made
      if (phase === 'rotate' && t >= 0.5) { phase = 'draw'; phaseT0 = now; }
      busy = true;
    }

    if (active >= 0) {
      const leg = LEGS[active];
      if (phase === 'rotate' && !view.animating) { phase = 'draw'; phaseT0 = now; }
      if (phase === 'draw') {
        const t = Math.min(1, (now - phaseT0) / 1000);
        drawFrac = easeIO(t);
        if (t >= 1 && !view.animating) {
          phase = 'fly'; phaseT0 = now; flyFrac = 0;
        }
        busy = true;
      } else if (phase === 'fly') {
        flyFrac = Math.min(1, (now - phaseT0) / leg.flyDur);
        while (logged < leg.wpF.length - 1 && flyFrac >= leg.wpF[logged + 1]) {
          logged++;
          logLine(leg.times[logged], leg.names[logged], leg.msgs[logged]);
          markChip(active, logged);
        }
        if (flyFrac >= 1) phase = 'done';
        busy = true;
      }
    }

    draw();
    if (busy) requestAnimationFrame(frame);
    else running = false;
  }
  function kick() {
    if (!running && !REDUCED) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  new IntersectionObserver(es => {
    inView = es[0].isIntersecting;
    if (inView) kick();
  }, { rootMargin: '80px' }).observe(wrap);

  /* ---------- scroll choreography ---------- */
  // scroll-driven picker: the card nearest the reading line is the flown leg.
  // (robust against instant scroll jumps, unlike an IntersectionObserver band)
  const cards = [...document.querySelectorAll('.leg')];
  const intro = document.querySelector('.ligne-intro');
  const narrowMQ = matchMedia('(max-width: 1100px)');
  let pickQueued = false;
  function pickActive() {
    pickQueued = false;
    const vh = window.innerHeight;
    const line = vh * (narrowMQ.matches ? 0.68 : 0.5);
    let best = null, bestD = Infinity;
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      if (r.bottom < vh * 0.06 || r.top > vh * 0.96) continue;
      const d = Math.abs((r.top + r.bottom) / 2 - line);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best) { setLeg(+best.dataset.leg); return; }
    if (intro) {
      const ri = intro.getBoundingClientRect();
      if (ri.bottom > vh * 0.25 && ri.top < vh) { setLeg(-1); return; }
    }
    const first = cards[0].getBoundingClientRect();
    if (first.top > vh) setLeg(-1); // above the section entirely
    // otherwise: between cards — keep the current leg flying
  }
  function queuePick() {
    if (!pickQueued) { pickQueued = true; requestAnimationFrame(pickActive); }
  }
  addEventListener('scroll', queuePick, { passive: true });
  addEventListener('resize', queuePick, { passive: true });
  // keyboard: focusing a card activates its leg
  cards.forEach(c => c.addEventListener('focus', () => setLeg(+c.dataset.leg)));

  /* ---------- init ---------- */
  function init() {
    resize();
    goTo(-1, true);
    overviewLog();
    draw();
    queuePick();
  }
  new ResizeObserver(() => { resize(); if (!running) draw(); }).observe(wrap);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  else init();
})();
