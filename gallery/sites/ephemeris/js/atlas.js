/* ═══════════════════════════════════════════════════════════════════
   EPHEMERIS · atlas.js — Plate I, the sky you can hold and turn
   ~1,230 stars: ~100 real catalogue stars (J2000) with the true
   figures of Orion, Ursa Major, Cassiopeia, Cygnus and Scorpius,
   plus synthesized field stars with an honest magnitude law and a
   galactic-plane density band. Stereographic projection (conformal —
   the figures keep their shapes), drag with inertia, wheel zoom,
   date-driven sweep, and the Sun, Moon and planets riding the
   ecliptic. No libraries.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const A = window.ALM;
  const RAD = Math.PI / 180;
  const TAU = Math.PI * 2;

  const COL = {
    gold: '#C7A55E', gilt: '#EDDCA8', star: '#D9E1EC',
    carmine: '#C0524A', warm: '#E9C79B', cool: '#C9D8F2', cream: '#EFE3C0'
  };

  /* ── real catalogue (raHours, decDeg, mag) ─────────────────────── */
  const CAT = {};
  function S(id, ra, dec, mag, name, col, always) {
    CAT[id] = { ra, dec, mag, name: name || null, col: col || COL.star, always: !!always };
  }
  // Orion
  S('bet', 5.9195, 7.407, 0.45, 'Betelgeuse', COL.warm);
  S('rig', 5.2423, -8.202, 0.18, 'Rigel', COL.cool);
  S('bel', 5.4189, 6.350, 1.64, 'Bellatrix', COL.cool);
  S('sai', 5.7959, -9.670, 2.07, 'Saiph');
  S('aln', 5.6036, -1.202, 1.69, 'Alnilam');
  S('alnk', 5.6793, -1.943, 1.74, 'Alnitak');
  S('min', 5.5334, -0.299, 2.25, 'Mintaka');
  S('mei', 5.5856, 9.934, 3.39, 'Meissa');
  // Ursa Major (the Plough)
  S('dub', 11.0621, 61.751, 1.79, 'Dubhe', COL.warm);
  S('mer', 11.0307, 56.382, 2.37, 'Merak');
  S('phe', 11.8972, 53.695, 2.44, 'Phecda');
  S('meg', 12.2571, 57.033, 3.31, 'Megrez');
  S('ali', 12.9005, 55.960, 1.77, 'Alioth');
  S('miz', 13.3988, 54.925, 2.27, 'Mizar');
  S('alk', 13.7923, 49.313, 1.86, 'Alkaid');
  S('alcor', 13.4204, 54.988, 3.99, 'Alcor');
  // Cassiopeia
  S('caph', 0.1531, 59.150, 2.27, 'Caph');
  S('sche', 0.6751, 56.537, 2.24, 'Schedar', COL.warm);
  S('tsih', 0.9451, 60.717, 2.39, 'Tsih');
  S('ruch', 1.4302, 60.235, 2.68, 'Ruchbah');
  S('segn', 1.9066, 63.670, 3.38, 'Segin');
  // Cygnus
  S('den', 20.6905, 45.280, 1.25, 'Deneb', COL.cool);
  S('sadr', 20.3705, 40.257, 2.23, 'Sadr');
  S('gien', 20.7702, 33.970, 2.48, 'Gienah');
  S('dcyg', 19.7495, 45.131, 2.87, 'Fawaris');
  S('albi', 19.5120, 27.960, 3.05, 'Albireo', COL.warm);
  S('zcyg', 21.2156, 30.227, 3.21);
  S('icyg', 19.4950, 51.729, 3.77);
  S('kcyg', 19.2850, 53.368, 3.77);
  // Scorpius
  S('ant', 16.4901, -26.432, 1.06, 'Antares', COL.warm);
  S('acrb', 16.0906, -19.805, 2.62, 'Acrab');
  S('dsch', 16.0056, -22.622, 2.29, 'Dschubba');
  S('pisc', 15.9809, -26.114, 2.89);
  S('ssco', 16.3531, -25.593, 2.88);
  S('tsco', 16.5980, -28.216, 2.82);
  S('esco', 16.8361, -34.293, 2.29);
  S('msco', 16.8643, -38.048, 3.00);
  S('z2sc', 16.9097, -42.361, 3.59);
  S('hsco', 17.2026, -43.239, 3.33);
  S('sarg', 17.6220, -42.998, 1.86, 'Sargas');
  S('isco', 17.7931, -40.127, 2.99);
  S('ksco', 17.7081, -39.030, 2.39);
  S('shau', 17.5601, -37.104, 1.62, 'Shaula');
  S('lesa', 17.5127, -37.298, 2.70, 'Lesath');
  // the first-magnitude field & friends
  S('sir', 6.7525, -16.716, -1.46, 'Sirius', COL.cool, true);
  S('cano', 6.3992, -52.696, -0.74, 'Canopus', COL.cream, true);
  S('proc', 7.6550, 5.225, 0.34, 'Procyon', COL.cream, true);
  S('poll', 7.7553, 28.026, 1.14, 'Pollux', COL.warm);
  S('cast', 7.5767, 31.888, 1.58, 'Castor');
  S('cape', 5.2782, 45.998, 0.08, 'Capella', COL.cream, true);
  S('alde', 4.5987, 16.509, 0.85, 'Aldebaran', COL.warm, true);
  S('vega', 18.6156, 38.784, 0.03, 'Vega', COL.cool, true);
  S('alta', 19.8464, 8.868, 0.77, 'Altair', null, true);
  S('arct', 14.2610, 19.182, -0.05, 'Arcturus', COL.warm, true);
  S('spic', 13.4199, -11.161, 0.97, 'Spica', COL.cool, true);
  S('regu', 10.1395, 11.967, 1.35, 'Regulus', COL.cool);
  S('dnbo', 11.8177, 14.572, 2.14, 'Denebola');
  S('foma', 22.9608, -29.622, 1.16, 'Fomalhaut', null, true);
  S('ache', 1.6286, -57.237, 0.46, 'Achernar', COL.cool);
  S('pola', 2.5303, 89.264, 1.98, 'Polaris', COL.cream, true);
  S('diph', 0.7265, -17.987, 2.04, 'Diphda');
  S('hama', 2.1196, 23.463, 2.00, 'Hamal', COL.warm);
  S('mira', 1.1622, 35.621, 2.05, 'Mirach', COL.warm);
  S('alpr', 0.1398, 29.091, 2.06, 'Alpheratz');
  S('algo', 3.1361, 40.956, 2.12, 'Algol');
  S('mirf', 3.4054, 49.861, 1.79, 'Mirfak');
  S('elna', 5.4382, 28.608, 1.65, 'Elnath');
  S('alhe', 6.6285, 16.399, 1.93, 'Alhena');
  S('adha', 6.9771, -28.972, 1.50, 'Adhara', COL.cool);
  S('alph', 9.4598, -8.659, 1.98, 'Alphard', COL.warm);
  S('acru', 12.4433, -63.099, 0.76, 'Acrux', COL.cool);
  S('mimo', 12.7953, -59.689, 1.25, 'Mimosa', COL.cool);
  S('gacr', 12.5194, -57.113, 1.64, 'Gacrux', COL.warm);
  S('rigk', 14.6599, -60.834, -0.27, 'Rigil Kentaurus', COL.cream);
  S('hada', 14.0637, -60.373, 0.61, 'Hadar', COL.cool);
  S('rasa', 17.5822, 12.560, 2.08, 'Rasalhague');
  S('elta', 17.9434, 51.489, 2.23, 'Eltanin', COL.warm);
  S('koch', 14.8451, 74.156, 2.08, 'Kochab', COL.warm);
  S('alde2', 21.3097, 62.585, 2.46, 'Alderamin');
  S('enif', 21.7364, 9.875, 2.39, 'Enif', COL.warm);
  S('mark', 23.0793, 15.205, 2.48, 'Markab');
  S('sche2', 23.0629, 28.083, 2.42, 'Scheat', COL.warm);
  S('kaus', 18.4029, -34.385, 1.85, 'Kaus Australis');
  S('nunk', 18.9211, -26.297, 2.05, 'Nunki', COL.cool);
  S('peac', 20.4275, -56.735, 1.94, 'Peacock', COL.cool);
  S('alna', 22.1372, -46.961, 1.74, 'Alnair', COL.cool);
  S('menk', 3.0380, 4.090, 2.53, 'Menkar', COL.warm);

  /* ── the five figures ──────────────────────────────────────────── */
  const CONSTS = {
    ori: {
      label: 'ORION', gen: 'Orionis — the Hunter',
      note: 'The winter keystone. The Belt points down to Sirius and up to Aldebaran; the sword beneath hides a nursery of unborn stars.',
      data: 'Brightest — Rigel, 0<sup>m</sup>.13 · Souths in January',
      lines: [['bet','mei'],['mei','bel'],['bet','alnk'],['bel','min'],
              ['min','aln'],['aln','alnk'],['alnk','sai'],['min','rig'],['rig','sai']],
      names: ['bet','rig','bel'],
      labelAt: [5.55, -14.5]
    },
    uma: {
      label: 'URSA MAJOR', gen: 'Ursae Majoris — the Great Bear',
      note: 'Charted here by its seven brightest — the Plough. The Pointers give the Pole to a finger’s width; Mizar hides Alcor for sharp eyes.',
      data: 'Brightest — Alioth, 1<sup>m</sup>.77 · Circumpolar at Harrowgate',
      lines: [['dub','mer'],['mer','phe'],['phe','meg'],['meg','dub'],
              ['meg','ali'],['ali','miz'],['miz','alk']],
      names: ['dub','mer','ali','miz','alk'],
      labelAt: [12.35, 65.5]
    },
    cas: {
      label: 'CASSIOPEIA', gen: 'Cassiopeiae — the Seated Queen',
      note: 'Five stars in a W, riding the Milky Way opposite the Bear. When the Plough runs low, the Queen sits high.',
      data: 'Brightest — Schedar, 2<sup>m</sup>.24 · Circumpolar at Harrowgate',
      lines: [['caph','sche'],['sche','tsih'],['tsih','ruch'],['ruch','segn']],
      names: ['sche','caph'],
      labelAt: [1.05, 52.5]
    },
    cyg: {
      label: 'CYGNUS', gen: 'Cygni — the Swan',
      note: 'The Northern Cross, flying south along the summer Milky Way. At the foot, Albireo — gold beside sapphire in any small glass.',
      data: 'Brightest — Deneb, 1<sup>m</sup>.25 · Souths in September',
      lines: [['den','sadr'],['sadr','albi'],['sadr','gien'],['gien','zcyg'],
              ['sadr','dcyg'],['dcyg','icyg'],['icyg','kcyg']],
      names: ['den','sadr','albi'],
      labelAt: [20.62, 52.8]
    },
    sco: {
      label: 'SCORPIUS', gen: 'Scorpii — the Scorpion',
      note: 'A fish-hook of first magnitude grazing the southern wall. Antares burns rust-red at the heart — the rival of Mars.',
      data: 'Brightest — Antares, 1<sup>m</sup>.06 · Souths in July, low',
      lines: [['acrb','dsch'],['pisc','dsch'],['dsch','ssco'],['ssco','ant'],
              ['ant','tsco'],['tsco','esco'],['esco','msco'],['msco','z2sc'],
              ['z2sc','hsco'],['hsco','sarg'],['sarg','isco'],['isco','ksco'],
              ['ksco','shau'],['shau','lesa']],
      names: ['ant','shau','dsch','sarg'],
      labelAt: [15.75, -32.0]
    }
  };

  /* ── star array assembly ───────────────────────────────────────── */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(18530207); // the Press's founding date

  const stars = []; // {ra(rad), sd, cd, mag, r, col, name, always, tw, seed}
  function pushStar(raH, decD, mag, name, col, always) {
    const ra = raH * 15 * RAD, dec = decD * RAD;
    stars.push({
      ra, sd: Math.sin(dec), cd: Math.cos(dec), dec,
      mag, r: Math.max(0.42, (3.4 - 0.47 * mag) * 0.8),
      col: col || COL.star, name: name || null, always: !!always,
      seed: rng() * TAU
    });
  }
  const IDX = {};
  for (const id in CAT) {
    const s = CAT[id];
    IDX[id] = stars.length;
    pushStar(s.ra, s.dec, s.mag, s.name, s.col, s.always);
  }

  // galactic frame (J2000): centre RA 266.405° Dec −28.936°, NGP RA 192.859° Dec 27.128°
  const gc = vecOf(266.405 * RAD, -28.936 * RAD);
  const ngp = vecOf(192.859 * RAD, 27.128 * RAD);
  const gy = cross(ngp, gc);
  function vecOf(ra, dec) { return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)]; }
  function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }

  function sampleMag(min, max) {
    // dN/dm ∝ 10^(0.51 m): each magnitude ≈ 3.2× more stars than the last
    const k = 0.51;
    const a = Math.pow(10, k * min), b = Math.pow(10, k * max);
    return Math.log10(a + rng() * (b - a)) / k;
  }
  const N_UNIFORM = 700, N_BAND = 440;
  for (let i = 0; i < N_UNIFORM; i++) {
    const z = rng() * 2 - 1, ra = rng() * TAU;
    const dec = Math.asin(z);
    pushStar(ra / RAD / 15, dec / RAD, sampleMag(2.4, 6.4));
  }
  for (let i = 0; i < N_BAND; i++) {
    // gaussian galactic latitude, uniform longitude → the engraved Milky Way
    const l = rng() * TAU;
    let b = 0;
    for (let k = 0; k < 6; k++) b += rng();
    b = (b / 6 - 0.5) * 55 * RAD; // ≈ N(0°, 13°) — the width of the engraved Milky Way
    const cb = Math.cos(b), sb = Math.sin(b);
    const v = [
      gc[0]*cb*Math.cos(l) + gy[0]*cb*Math.sin(l) + ngp[0]*sb,
      gc[1]*cb*Math.cos(l) + gy[1]*cb*Math.sin(l) + ngp[1]*sb,
      gc[2]*cb*Math.cos(l) + gy[2]*cb*Math.sin(l) + ngp[2]*sb
    ];
    const dec = Math.asin(Math.max(-1, Math.min(1, v[2])));
    const ra = Math.atan2(v[1], v[0]);
    pushStar(((ra / RAD / 15) + 24) % 24, dec / RAD, sampleMag(3.4, 7.0));
  }
  // tint a fraction of the synthesized field
  for (let i = Object.keys(CAT).length; i < stars.length; i++) {
    const u = rng();
    if (u < 0.10) stars[i].col = COL.warm;
    else if (u < 0.18) stars[i].col = COL.cool;
  }

  /* ── curves: ecliptic, equator, graticule ─────────────────────── */
  function curvePoints(fn, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const { raH, dec } = fn(i / n);
      pts.push({ ra: raH * 15 * RAD, sd: Math.sin(dec), cd: Math.cos(dec) });
    }
    return pts;
  }
  const ECLIPTIC = curvePoints(t => A.eclToEq(t * 360, 0), 180);
  const EQUATOR = curvePoints(t => ({ raH: t * 24, dec: 0 }), 96);
  const PARALLELS = [], MERIDIANS = [];
  for (let dc = -75; dc <= 75; dc += 15) {
    if (dc === 0) continue;
    PARALLELS.push({ dc, pts: curvePoints(t => ({ raH: t * 24, dec: dc * RAD }), 96) });
  }
  for (let h = 0; h < 24; h += 2) {
    MERIDIANS.push({ h, pts: curvePoints(t => ({ raH: h, dec: (-84 + t * 168) * RAD }), 56) });
  }

  /* ── per-constellation precomputation ─────────────────────────── */
  for (const key in CONSTS) {
    const c = CONSTS[key];
    c.p = 0; c.segs = [];
    let cx = 0, cy = 0, cz = 0, total = 0;
    for (const [a, b] of c.lines) {
      const sa = stars[IDX[a]], sb = stars[IDX[b]];
      const va = [sa.cd * Math.cos(sa.ra), sa.cd * Math.sin(sa.ra), sa.sd];
      const vb = [sb.cd * Math.cos(sb.ra), sb.cd * Math.sin(sb.ra), sb.sd];
      const dot = Math.max(-1, Math.min(1, va[0]*vb[0] + va[1]*vb[1] + va[2]*vb[2]));
      const len = Math.acos(dot);
      c.segs.push({ a: IDX[a], b: IDX[b], va, vb, len, start: total });
      total += len;
      cx += va[0] + vb[0]; cy += va[1] + vb[1]; cz += va[2] + vb[2];
    }
    c.total = total;
    const n = Math.hypot(cx, cy, cz);
    c.center = { ra: Math.atan2(cy, cx), dec: Math.asin(cz / n) };
    c.starIdx = [...new Set(c.lines.flat())].map(id => IDX[id]);
  }

  /* ── state ─────────────────────────────────────────────────────── */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cvs, ctx, W = 0, H = 0, dpr = 1;
  let ra0 = 0, dec0 = 35 * RAD;
  let R = 500, Rtarget = 500, Rmin = 200, Rmax = 1400;
  let raTarget = null, decTarget = null;       // fly-to / dial sweep
  let vx = 0, vy = 0;                          // inertia (rad/frame)
  let hoverKey = null, chipKey = null, pinnedKey = null, demoKey = null;
  let doy = 0, ephem = null, ephemDoy = -99;
  let introT0 = 0, started = false, interacted = false;
  let visible = !document.hidden, onscreen = true, rafId = 0, lastT = 0;
  let selectCB = null, hint = null;

  const active = () => pinnedKey || hoverKey || chipKey || demoKey;

  /* ── ephemerides for the plate (Sun, Moon, planets) ───────────── */
  const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const PNAMES = { mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' };
  function computeEphem() {
    if (Math.abs(doy - ephemDoy) < 0.01 && ephem) return;
    ephemDoy = doy;
    const d = A.d2000(doy, 21);
    const s = A.sun(d), m = A.moon(d);
    ephem = {
      sun: eqOf(s.lambda, 0),
      moon: Object.assign(eqOf(m.lambda, m.beta), { phase: A.moonPhase(d) }),
      planets: PLANETS.map(k => {
        const p = A.planet(k, d);
        return Object.assign(eqOf(p.lambda, p.beta), { key: k, name: PNAMES[k] });
      })
    };
  }
  function eqOf(lambda, beta) {
    const e = A.eclToEq(lambda, beta);
    return { ra: e.raH * 15 * RAD, sd: Math.sin(e.dec), cd: Math.cos(e.dec) };
  }

  /* ── projection ────────────────────────────────────────────────── */
  let s0 = 0, c0 = 1, cX = 0, cY = 0;
  function beginProject() {
    s0 = Math.sin(dec0); c0 = Math.cos(dec0);
    cX = W / 2; cY = H / 2;
  }
  // returns [sx, sy, cosc] or null when behind
  function proj(ra, sd, cd) {
    const dra = ra - ra0;
    const cdr = Math.cos(dra), sdr = Math.sin(dra);
    const cosc = s0 * sd + c0 * cd * cdr;
    if (cosc < -0.02) return null;
    const k = 2 / (1 + Math.max(cosc, 0.02));
    return [cX - k * cd * sdr * R, cY - k * (c0 * sd - s0 * cd * cdr) * R, cosc];
  }
  function projVec(v) {
    const ra = Math.atan2(v[1], v[0]);
    const sd = v[2] / Math.hypot(v[0], v[1], v[2]);
    return proj(ra, sd, Math.sqrt(Math.max(0, 1 - sd * sd)));
  }

  /* ── drawing helpers ───────────────────────────────────────────── */
  function drawSpaced(text, x, y, font, spacing, fill, alpha) {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = fill;
    ctx.globalAlpha = alpha;
    ctx.textBaseline = 'middle';
    let total = 0;
    for (const ch of text) total += ctx.measureText(ch).width + spacing;
    total -= spacing;
    let px = x - total / 2;
    for (const ch of text) {
      ctx.fillText(ch, px, y);
      px += ctx.measureText(ch).width + spacing;
    }
    ctx.restore();
    return total;
  }

  function drawCurve(pts, upTo) {
    let pen = false;
    ctx.beginPath();
    const n = upTo == null ? pts.length : Math.min(pts.length, Math.ceil(upTo));
    for (let i = 0; i < n; i++) {
      const p = proj(pts[i].ra, pts[i].sd, pts[i].cd);
      if (!p || p[2] < 0.03) { pen = false; continue; }
      if (!pen) { ctx.moveTo(p[0], p[1]); pen = true; }
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
  }

  function curveLabel(pts, text, fill, alpha, size) {
    // place along the visible point nearest plate centre, clear of the frame
    const inset = 36;
    let best = -1, bestD = 1e9, bp = null;
    for (let i = 4; i < pts.length - 4; i += 2) {
      const p = proj(pts[i].ra, pts[i].sd, pts[i].cd);
      if (!p || p[2] < 0.25) continue;
      if (p[0] < inset || p[0] > W - inset || p[1] < inset || p[1] > H - inset) continue;
      const d = (p[0] - cX) ** 2 + (p[1] - cY) ** 2;
      if (d < bestD) { bestD = d; best = i; bp = p; }
    }
    if (best < 0) return;
    const p1 = proj(pts[best - 3].ra, pts[best - 3].sd, pts[best - 3].cd);
    const p2 = proj(pts[best + 3].ra, pts[best + 3].sd, pts[best + 3].cd);
    if (!p1 || !p2) return;
    let ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
    ctx.save();
    ctx.translate(bp[0], bp[1]);
    ctx.rotate(ang);
    drawSpaced(text, 0, -9, `500 ${size}px "Cormorant SC", serif`, size * 0.34, fill, alpha);
    ctx.restore();
  }

  const easeIO = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* ── the frame ─────────────────────────────────────────────────── */
  function render(now) {
    const t = now - introT0;
    ctx.clearRect(0, 0, W, H);
    beginProject();
    computeEphem();

    // graticule — etches itself in first
    const gratA = reduced ? 1 : easeIO(Math.max(0, Math.min(1, (t - 120) / 850)));
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(199,165,94,' + (0.09 * gratA) + ')';
    for (const g of PARALLELS) drawCurve(g.pts);
    for (const g of MERIDIANS) drawCurve(g.pts);
    drawGratLabels(gratA);

    // celestial equator — dashed silver, follows the graticule
    const eqA = reduced ? 1 : easeIO(Math.max(0, Math.min(1, (t - 520) / 800)));
    if (eqA > 0) {
      ctx.save();
      ctx.setLineDash([5, 6]);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(217,225,236,' + (0.22 * eqA) + ')';
      drawCurve(EQUATOR);
      ctx.restore();
      curveLabel(EQUATOR, 'ÆQUATOR', COL.star, 0.34 * eqA, 10.5);
    }

    // the ecliptic — ONE fine carmine curve
    const eclProg = reduced ? 1 : Math.max(0, Math.min(1, (t - 1150) / 1100));
    if (eclProg > 0) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(192,82,74,0.85)';
      drawCurve(ECLIPTIC, ECLIPTIC.length * easeIO(eclProg));
      if (eclProg > 0.85) curveLabel(ECLIPTIC, 'ECLIPTICA', COL.carmine, 0.8 * eclProg, 11);
    }

    // constellation figures
    for (const key in CONSTS) drawConst(key, t);

    // stars
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const p = proj(s.ra, s.sd, s.cd);
      if (!p || p[2] < 0) continue;
      const sx = p[0], sy = p[1];
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
      let a = 1;
      if (!reduced && started) {
        const t0 = 250 + (s.mag + 1.6) * 290 + (s.seed / TAU) * 260;
        a = Math.max(0, Math.min(1, (t - t0) / 450));
        if (a === 0) continue;
      }
      if (!reduced && s.mag < 1.2) a *= 1 + 0.09 * Math.sin(now / 1200 + s.seed * 3);
      a = Math.min(1, a) * (s.mag > 5.6 ? 0.55 : 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = s.col;
      if (s.mag < 1.5) {
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r * 3.4);
        g.addColorStop(0, s.col);
        g.addColorStop(1, 'rgba(217,225,236,0)');
        ctx.globalAlpha = a * 0.35;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sx, sy, s.r * 3.4, 0, TAU); ctx.fill();
        ctx.globalAlpha = a;
        ctx.fillStyle = s.col;
      }
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, TAU);
      ctx.fill();
      if (s.mag < 0.5) { // engraved diffraction points on the brightest
        ctx.globalAlpha = a * 0.4;
        ctx.strokeStyle = s.col;
        ctx.lineWidth = 0.7;
        const L = s.r * 3.2;
        ctx.beginPath();
        ctx.moveTo(sx - L, sy); ctx.lineTo(sx + L, sy);
        ctx.moveTo(sx, sy - L); ctx.lineTo(sx, sy + L);
        ctx.stroke();
      }
      if (s.always && s.name) {
        ctx.globalAlpha = a * 0.55;
        ctx.font = 'italic 400 11px "EB Garamond", serif';
        ctx.fillStyle = COL.star;
        ctx.textBaseline = 'middle';
        ctx.fillText(s.name, sx + s.r + 5, sy + 4);
      }
    }
    ctx.globalAlpha = 1;

    // Harrowgate's zenith for this night, engraved
    drawZenith();

    // wanderers: Sun, Moon, planets on the ecliptic
    drawWanderers();

    // the Perseids, when the dial rests on their nights
    if (!reduced) drawMeteors(now);
  }

  function drawZenith() {
    const zra = A.lstAt(Math.round(doy), 21 - A.LON / 15) * 15 * RAD;
    const p = proj(zra, Math.sin(A.LAT), Math.cos(A.LAT));
    if (!p || p[2] < 0.05) return;
    const [x, y] = p;
    ctx.save();
    ctx.strokeStyle = COL.gold;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y);
    ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6);
    ctx.stroke();
    drawSpaced('ZENITH', x, y + 14, '400 9px "Cormorant SC", serif', 2.2, COL.gold, 0.5);
    ctx.restore();
  }

  /* graduation labels — RA hours along the foot, declination up the left,
     exactly where each meridian / parallel meets the plate edge */
  function drawGratLabels(alpha) {
    if (alpha <= 0.02) return;
    ctx.save();
    ctx.fillStyle = COL.gold;
    const yE = H - 22;
    // while the hint cartouche is up, keep the foot labels out from under it
    let hintL = -1, hintR = -1;
    if (hint && !hint.classList.contains('gone')) {
      const hw = hint.offsetWidth / 2 + 12;
      hintL = W / 2 - hw; hintR = W / 2 + hw;
    }
    ctx.textBaseline = 'alphabetic';
    for (const m of MERIDIANS) {
      const pts = m.pts;
      let prev = null;
      for (let i = 0; i < pts.length; i++) {
        const p = proj(pts[i].ra, pts[i].sd, pts[i].cd);
        if (!p || p[2] < 0.12) { prev = null; continue; }
        if (prev && (prev[1] - yE) * (p[1] - yE) < 0) {
          const f = (yE - prev[1]) / (p[1] - prev[1]);
          const x = prev[0] + (p[0] - prev[0]) * f;
          if (x > 34 && x < W - 46 && (hintL < 0 || x < hintL || x > hintR)) {
            ctx.globalAlpha = alpha * 0.6;
            ctx.font = '500 10.5px "EB Garamond", serif';
            const s = String(m.h);
            const w = ctx.measureText(s).width;
            ctx.fillText(s, x - w / 2 - 2, H - 11);
            ctx.font = 'italic 400 8px "EB Garamond", serif';
            ctx.fillText('h', x + w / 2 - 1, H - 15);
          }
          break;
        }
        prev = p;
      }
    }
    const xE = 24;
    ctx.textBaseline = 'middle';
    ctx.font = '500 10px "EB Garamond", serif';
    for (const g of PARALLELS) {
      const pts = g.pts;
      let prev = null;
      for (let i = 0; i < pts.length; i++) {
        const p = proj(pts[i].ra, pts[i].sd, pts[i].cd);
        if (!p || p[2] < 0.12) { prev = null; continue; }
        if (prev && (prev[0] - xE) * (p[0] - xE) < 0) {
          const f = (xE - prev[0]) / (p[0] - prev[0]);
          const y = prev[1] + (p[1] - prev[1]) * f;
          if (y > 30 && y < H - 34) {
            ctx.globalAlpha = alpha * 0.55;
            ctx.fillText((g.dc < 0 ? '−' : '+') + Math.abs(g.dc) + '°', 13, y);
          }
          break;
        }
        prev = p;
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* Perseids — radiant at 3ʰ07ᵐ +58°, active 9–14 August on the dial */
  const RADIANT = { ra: 3.12 * 15 * RAD, sd: Math.sin(58 * RAD), cd: Math.cos(58 * RAD) };
  const meteors = [];
  let nextMeteor = 0;
  function drawMeteors(now) {
    const active = doy >= 220 && doy <= 226; // 9–15 August
    if (active && now > nextMeteor && meteors.length < 3) {
      const rp = proj(RADIANT.ra, RADIANT.sd, RADIANT.cd);
      if (rp && rp[2] > -0.01) {
        const dir = Math.random() * TAU;
        const d0 = 130 + Math.random() * 260;
        meteors.push({
          t0: now, life: 550 + Math.random() * 300,
          x: rp[0] + Math.cos(dir) * d0, y: rp[1] + Math.sin(dir) * d0,
          dx: Math.cos(dir), dy: Math.sin(dir),
          len: 46 + Math.random() * 60
        });
      }
      nextMeteor = now + 1800 + Math.random() * 2600;
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      const f = (now - m.t0) / m.life;
      if (f >= 1) { meteors.splice(i, 1); continue; }
      const a = Math.sin(f * Math.PI) * 0.85;
      const head = f * m.len * 1.6;
      const g = ctx.createLinearGradient(
        m.x + m.dx * (head - m.len), m.y + m.dy * (head - m.len),
        m.x + m.dx * head, m.y + m.dy * head);
      g.addColorStop(0, 'rgba(237,220,168,0)');
      g.addColorStop(1, 'rgba(237,220,168,' + a + ')');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(m.x + m.dx * (head - m.len), m.y + m.dy * (head - m.len));
      ctx.lineTo(m.x + m.dx * head, m.y + m.dy * head);
      ctx.stroke();
    }
  }

  function drawConst(key, t) {
    const c = CONSTS[key];
    if (c.p <= 0.001) return;
    const e = easeIO(c.p);
    const drawn = e * c.total;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(199,165,94,' + (0.75 * Math.min(1, c.p * 2)) + ')';
    ctx.shadowColor = 'rgba(199,165,94,0.5)';
    ctx.shadowBlur = c.p * 4;
    ctx.beginPath();
    for (const seg of c.segs) {
      if (seg.start >= drawn) break;
      const pa = projVec(seg.va);
      if (!pa || pa[2] < 0.02) continue;
      const frac = Math.min(1, (drawn - seg.start) / seg.len);
      let pb;
      if (frac >= 1) pb = projVec(seg.vb);
      else {
        const v = [
          seg.va[0] + (seg.vb[0] - seg.va[0]) * frac,
          seg.va[1] + (seg.vb[1] - seg.va[1]) * frac,
          seg.va[2] + (seg.vb[2] - seg.va[2]) * frac
        ];
        pb = projVec(v);
      }
      if (!pb || pb[2] < 0.02) continue;
      ctx.moveTo(pa[0], pa[1]);
      ctx.lineTo(pb[0], pb[1]);
    }
    ctx.stroke();
    ctx.restore();

    // engraved name + star names
    if (c.p > 0.55) {
      const la = (c.p - 0.55) / 0.45;
      const lp = proj(c.labelAt[0] * 15 * RAD, Math.sin(c.labelAt[1] * RAD), Math.cos(c.labelAt[1] * RAD));
      if (lp && lp[2] > 0.1) {
        drawSpaced(c.label, lp[0], lp[1], '600 15px "Cormorant SC", serif', 6.5, COL.gilt, la * 0.92);
      }
      ctx.font = 'italic 400 11.5px "EB Garamond", serif';
      ctx.fillStyle = COL.star;
      ctx.textBaseline = 'middle';
      for (const id of c.names) {
        const s = stars[IDX[id]];
        const p = proj(s.ra, s.sd, s.cd);
        if (!p || p[2] < 0.1) continue;
        ctx.globalAlpha = la * 0.78;
        ctx.fillText(s.name, p[0] + s.r + 5, p[1] + 5);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawWanderers() {
    const sp = proj(ephem.sun.ra, ephem.sun.sd, ephem.sun.cd);
    // the Sun
    if (sp && sp[2] > 0.02) {
      const [x, y] = sp;
      ctx.save();
      ctx.strokeStyle = COL.gilt;
      ctx.fillStyle = COL.gilt;
      ctx.lineWidth = 0.9;
      ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.arc(x, y, 4.6, 0, TAU); ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + TAU / 16;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 6.5, y + Math.sin(a) * 6.5);
        ctx.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10);
        ctx.stroke();
      }
      ctx.font = 'italic 400 12px "EB Garamond", serif';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.85;
      ctx.fillText('The Sun', x + 14, y - 9);
      ctx.restore();
    }
    // the Moon, phase drawn as it truly shows
    const mp = proj(ephem.moon.ra, ephem.moon.sd, ephem.moon.cd);
    if (mp && mp[2] > 0.02) {
      const [x, y] = mp;
      const ph = ephem.moon.phase;
      const r = 6.5, k = Math.cos(ph.elong * RAD);
      const ang = sp ? Math.atan2(sp[1] - y, sp[0] - x) : 0;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = '#141C30';
      ctx.strokeStyle = 'rgba(217,225,236,0.55)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
      if (ph.illum > 0.01) {
        ctx.fillStyle = '#E4E9F2';
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);              // lit limb faces the sun (+x)
        ctx.ellipse(0, 0, r * Math.abs(k), r, 0, Math.PI / 2, -Math.PI / 2, k > 0);
        ctx.fill();
      }
      ctx.restore();
      ctx.save();
      ctx.font = 'italic 400 12px "EB Garamond", serif';
      ctx.fillStyle = COL.star;
      ctx.globalAlpha = 0.85;
      ctx.textBaseline = 'middle';
      ctx.fillText('The Moon', x + 12, y + 12);
      ctx.restore();
    }
    // the planets — engraved ring-points with italic names
    ctx.save();
    ctx.font = 'italic 400 11.5px "EB Garamond", serif';
    ctx.textBaseline = 'middle';
    for (const pl of ephem.planets) {
      const p = proj(pl.ra, pl.sd, pl.cd);
      if (!p || p[2] < 0.05) continue;
      const [x, y] = p;
      ctx.strokeStyle = COL.gold;
      ctx.fillStyle = COL.gold;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 1.1, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.fillText(pl.name, x + 8, y - 7);
    }
    ctx.restore();
  }

  /* ── animation & main loop ─────────────────────────────────────── */
  function step(dtMs, now) {
    // dial sweep / fly-to
    if (raTarget != null) {
      let d = raTarget - ra0;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      const f = 1 - Math.exp(-dtMs / 240);
      ra0 += d * f;
      if (Math.abs(d) < 0.0004) { ra0 = raTarget; raTarget = null; }
    }
    if (decTarget != null) {
      const d = decTarget - dec0;
      dec0 += d * (1 - Math.exp(-dtMs / 240));
      if (Math.abs(d) < 0.0004) { dec0 = decTarget; decTarget = null; }
    }
    // inertia
    if (!dragging && (Math.abs(vx) > 1e-5 || Math.abs(vy) > 1e-5)) {
      ra0 += vx * dtMs / 16.7;
      dec0 = clampDec(dec0 + vy * dtMs / 16.7);
      const dk = Math.pow(0.93, dtMs / 16.7);
      vx *= dk; vy *= dk;
    }
    // zoom ease
    if (Math.abs(Rtarget - R) > 0.5) R += (Rtarget - R) * (1 - Math.exp(-dtMs / 160));
    // constellation line progress
    const act = active();
    for (const key in CONSTS) {
      const c = CONSTS[key];
      const target = (key === act) ? 1 : 0;
      if (reduced) { c.p = target; continue; }
      const rate = target ? dtMs / 820 : -dtMs / 480;
      c.p = Math.max(0, Math.min(1, c.p + rate));
    }
  }

  function frame(now) {
    rafId = 0;
    if (!visible || !onscreen) return;
    const dt = Math.min(64, lastT ? now - lastT : 16.7);
    lastT = now;
    step(dt, now);
    render(now);
    if (!reduced) rafId = requestAnimationFrame(frame);
  }
  function ensureLoop() {
    if (ctx && !rafId && visible && onscreen) {
      lastT = 0;
      rafId = requestAnimationFrame(frame);
    }
  }
  function renderOnce() { // reduced-motion path
    if (!ctx) return;
    step(16.7, performance.now());
    render(performance.now());
  }
  const clampDec = d => Math.max(-82 * RAD, Math.min(82 * RAD, d));

  /* ── pointer interaction ───────────────────────────────────────── */
  let dragging = false, moved = 0, lastPX = 0, lastPY = 0;
  const pointers = new Map();
  let pinchD0 = 0, pinchR0 = 0;

  function toLocal(e) {
    const r = cvs.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  function hitTest(px, py) {
    beginProject();
    let best = null, bestD = 26;
    for (const key in CONSTS) {
      const c = CONSTS[key];
      for (const seg of c.segs) {
        const pa = projVec(seg.va), pb = projVec(seg.vb);
        if (!pa || !pb || pa[2] < 0.05 || pb[2] < 0.05) continue;
        const d = segDist(px, py, pa[0], pa[1], pb[0], pb[1]);
        if (d < bestD) { bestD = d; best = key; }
      }
    }
    return best;
  }
  function segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const L2 = dx * dx + dy * dy;
    let t = L2 ? ((px - x1) * dx + (py - y1) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
  }

  function bindPointer(frameEl) {
    cvs.addEventListener('pointerdown', e => {
      cvs.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, toLocal(e));
      interacted = true;
      demoKey = null;
      if (pointers.size === 2) {
        const ps = [...pointers.values()];
        pinchD0 = Math.hypot(ps[0][0] - ps[1][0], ps[0][1] - ps[1][1]);
        pinchR0 = Rtarget;
        dragging = false;
        return;
      }
      dragging = true;
      moved = 0;
      [lastPX, lastPY] = toLocal(e);
      vx = vy = 0;
      raTarget = decTarget = null;
      frameEl.classList.add('dragging');
      if (hint) hint.classList.add('gone');
    });
    cvs.addEventListener('pointermove', e => {
      const [px, py] = toLocal(e);
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [px, py]);
      if (pointers.size === 2) {
        const ps = [...pointers.values()];
        const d = Math.hypot(ps[0][0] - ps[1][0], ps[0][1] - ps[1][1]);
        if (pinchD0 > 0) Rtarget = Math.max(Rmin, Math.min(Rmax, pinchR0 * d / pinchD0));
        if (reduced) renderOnce();
        return;
      }
      if (dragging) {
        const dx = px - lastPX, dy = py - lastPY;
        moved += Math.abs(dx) + Math.abs(dy);
        const kx = 2 / R, ky = 2 / R;
        ra0 += dx * kx * 0.5;
        dec0 = clampDec(dec0 - dy * ky * 0.5);
        vx = dx * kx * 0.5; vy = -dy * ky * 0.5;
        lastPX = px; lastPY = py;
        if (reduced) renderOnce();
      } else {
        const h = hitTest(px, py);
        if (h !== hoverKey) {
          hoverKey = h;
          cvs.style.cursor = h ? 'pointer' : '';
          if (reduced) renderOnce();
        }
      }
    });
    const up = e => {
      pointers.delete(e.pointerId);
      if (dragging && pointers.size === 0) {
        dragging = false;
        frameEl.classList.remove('dragging');
        if (moved < 6) { // a click, not a drag
          const [px, py] = toLocal(e);
          const h = hitTest(px, py);
          setPinned(h === pinnedKey ? null : h);
        }
      }
      if (pointers.size < 2) pinchD0 = 0;
      if (reduced) renderOnce();
    };
    cvs.addEventListener('pointerup', up);
    cvs.addEventListener('pointercancel', up);
    cvs.addEventListener('pointerleave', () => {
      if (!dragging && hoverKey) { hoverKey = null; cvs.style.cursor = ''; if (reduced) renderOnce(); }
    });
    cvs.addEventListener('wheel', e => {
      e.preventDefault();
      interacted = true;
      Rtarget = Math.max(Rmin, Math.min(Rmax, Rtarget * Math.exp(-e.deltaY * 0.0011)));
      if (reduced) { R = Rtarget; renderOnce(); }
    }, { passive: false });
  }

  function setPinned(key) {
    pinnedKey = key;
    if (selectCB) selectCB(key, key ? CONSTS[key] : null);
    if (reduced) renderOnce();
  }

  /* ── public API ────────────────────────────────────────────────── */
  window.ATLAS = {
    init(opts) {
      cvs = document.getElementById('sky');
      const frameEl = document.getElementById('plateFrame');
      hint = document.getElementById('plateHint');
      ctx = cvs.getContext('2d');
      if (!ctx) { // the plate cannot be inked — leave a printed apology, not a blank
        frameEl.classList.add('failed');
        if (hint) hint.remove();
        cvs.remove();
        const p = document.createElement('p');
        p.className = 'plate-noscript';
        p.textContent = 'This copy’s plates could not be inked here. Every figure holds still in the printed edition — the specimen pages below are set from the same tables.';
        frameEl.appendChild(p);
        return;
      }
      doy = opts.doy;
      ra0 = A.lstAt(doy, 21 - A.LON / 15) * 15 * RAD;

      const fit = () => {
        const r = frameEl.getBoundingClientRect();
        dpr = Math.min(2, devicePixelRatio || 1);
        W = Math.round(r.width); H = Math.round(r.height);
        cvs.width = W * dpr; cvs.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const m = Math.min(W, H);
        R = Rtarget = m * 0.62;
        Rmin = m * 0.42; Rmax = m * 2.1;
        if (reduced) renderOnce();
      };
      fit();
      new ResizeObserver(fit).observe(frameEl);

      bindPointer(frameEl);

      document.addEventListener('visibilitychange', () => {
        visible = !document.hidden;
        if (visible) ensureLoop();
      });
      new IntersectionObserver(en => {
        onscreen = en[0].isIntersecting;
        if (onscreen) ensureLoop();
      }, { threshold: 0.05 }).observe(cvs);

      document.fonts.load('600 15px "Cormorant SC"');
      document.fonts.load('italic 400 12px "EB Garamond"');
      // once the engraved faces arrive, re-ink the still frame (reduced motion)
      document.fonts.ready.then(() => { if (reduced) renderOnce(); });

      introT0 = performance.now();
      started = true;
      computeEphem();

      if (!reduced) {
        // teach the hover: draw the figure nearest plate centre, once
        setTimeout(() => {
          if (interacted || pinnedKey) return;
          let best = null, bd = 1e9;
          beginProject();
          for (const key in CONSTS) {
            const c = CONSTS[key];
            const cosc = Math.sin(dec0) * Math.sin(c.center.dec) +
              Math.cos(dec0) * Math.cos(c.center.dec) * Math.cos(c.center.ra - ra0);
            const d = Math.acos(Math.max(-1, Math.min(1, cosc)));
            if (d < bd) { bd = d; best = key; }
          }
          demoKey = best;
          setTimeout(() => { demoKey = null; }, 3400);
        }, 2450);
        ensureLoop();
      } else {
        renderOnce();
      }
    },

    setDoy(v) {
      doy = v;
      raTarget = A.lstAt(doy, 21 - A.LON / 15) * 15 * RAD;
      if (reduced) {
        ra0 = raTarget; raTarget = null;
        renderOnce();
      } else ensureLoop();
    },

    hideHint() { if (hint) hint.classList.add('gone'); },
    select(key) {           // from the legend chips
      setPinned(key);
      if (hint) hint.classList.add('gone');
      if (key) {
        const c = CONSTS[key];
        raTarget = c.center.ra;
        decTarget = clampDec(c.center.dec);
        if (reduced) {
          ra0 = raTarget; dec0 = decTarget;
          raTarget = decTarget = null;
          renderOnce();
        } else ensureLoop();
      }
    },
    preview(key, on) {      // chip hover
      chipKey = on ? key : null;
      if (reduced) renderOnce(); else ensureLoop();
    },
    onSelect(cb) { selectCB = cb; },
    consts: CONSTS
  };
})();
