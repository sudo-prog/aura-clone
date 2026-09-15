/* ═══════════════════════════════════════════════════════════════════
   EPHEMERIS · almanac.js — the computing engine
   Low-precision positional astronomy, honest to a few arcminutes:
   solar longitude w/ equation of centre, principal lunar terms,
   Keplerian mean elements for Mercury–Saturn, GMST, rise/transit/set
   at Harrowgate Observatory (51°17′ N, 0°54′ W). Every figure on the
   page comes from this one file.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const RAD = Math.PI / 180;
  const LAT = 51.283 * RAD;          // Harrowgate Observatory
  const LON = -0.9;                  // degrees east (west is negative)
  const YEAR = 2026;

  const MONTHS = ['January','February','March','April','May','June','July',
                  'August','September','October','November','December'];
  const MLEN = [31,28,31,30,31,30,31,31,30,31,30,31]; // 2026 is not a leap year
  const MCUM = [0];
  for (let i = 0; i < 12; i++) MCUM.push(MCUM[i] + MLEN[i]);

  const sin = x => Math.sin(x * RAD);
  const cos = x => Math.cos(x * RAD);
  const wrap360 = x => ((x % 360) + 360) % 360;
  const wrap180 = x => { const w = wrap360(x); return w > 180 ? w - 360 : w; };
  const wrap24 = x => ((x % 24) + 24) % 24;

  // days since J2000.0 (2000 Jan 1.5 UT) at 0h UT of 2026 day-of-year `doy`
  const D0 = (Date.UTC(YEAR, 0, 1) - Date.UTC(2000, 0, 1, 12)) / 864e5;
  const d2000 = (doy, hUT = 0) => D0 + doy + hUT / 24;

  function dateOf(doy) {
    doy = Math.max(0, Math.min(364, Math.round(doy)));
    let m = 0;
    while (doy >= MCUM[m + 1]) m++;
    return { month: m, day: doy - MCUM[m] + 1, monthName: MONTHS[m] };
  }
  const doyOf = (month, day) => MCUM[month] + day - 1;

  // ── The Sun ─────────────────────────────────────────────────────
  function sun(d) {
    const M = wrap360(357.5291 + 0.98560028 * d);
    const L = wrap360(280.4665 + 0.98564736 * d);
    const C = 1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M);
    const lambda = wrap360(L + C);
    const R = 1.00014 - 0.01671 * cos(M) - 0.00014 * cos(2 * M);
    return { lambda, beta: 0, M, R };
  }

  // ── The Moon ────────────────────────────────────────────────────
  function moon(d) {
    const Lm = wrap360(218.3165 + 13.17639648 * d);
    const Mm = wrap360(134.9634 + 13.06499295 * d);
    const Ms = wrap360(357.5291 + 0.98560028 * d);
    const D = wrap360(297.8502 + 12.19074912 * d);
    const F = wrap360(93.2721 + 13.22935024 * d);
    const lambda = wrap360(Lm
      + 6.289 * sin(Mm)
      + 1.274 * sin(2 * D - Mm)
      + 0.658 * sin(2 * D)
      + 0.214 * sin(2 * Mm)
      - 0.186 * sin(Ms)
      - 0.114 * sin(2 * F));
    const beta = 5.128 * sin(F) + 0.281 * sin(Mm + F) - 0.28 * sin(F - Mm);
    return { lambda, beta };
  }

  // phase from true elongation (deg, 0=new, 180=full)
  function moonPhase(d) {
    const e = wrap360(moon(d).lambda - sun(d).lambda);
    const illum = (1 - cos(e)) / 2;
    const age = e / 360 * 29.530589;
    const names = ['New Moon','Waxing crescent','First quarter','Waxing gibbous',
                   'Full Moon','Waning gibbous','Last quarter','Waning crescent','New Moon'];
    const name = names[Math.floor(((e + 22.5) % 360) / 45)];
    return { elong: e, illum, age, name, waxing: e < 180 };
  }

  // ── The Planets — Keplerian mean elements, J2000 + rates/century ─
  const EL = {
    mercury: { a: 0.387098, e: 0.205630, i: 7.0047, L: [252.2503, 149472.6746], w: [77.4577, 0.1594], O: [48.3308, -0.1254] },
    venus:   { a: 0.723332, e: 0.006773, i: 3.3946, L: [181.9791, 58517.8156],  w: [131.6021, 0.0048], O: [76.6799, -0.2780] },
    earth:   { a: 1.000000, e: 0.016709, i: 0.0,    L: [100.4645, 35999.3728],  w: [102.9374, 0.3226], O: [0, 0] },
    mars:    { a: 1.523688, e: 0.093405, i: 1.8497, L: [355.4533, 19140.2993],  w: [336.0602, 0.4444], O: [49.5581, -0.2950] },
    jupiter: { a: 5.202561, e: 0.048498, i: 1.3030, L: [34.3515, 3034.9057],    w: [14.3312, 0.2155],  O: [100.4644, 0.1767] },
    saturn:  { a: 9.554747, e: 0.055546, i: 2.4886, L: [50.0774, 1222.1138],    w: [93.0568, 0.5665],  O: [113.6634, -0.2566] }
  };

  function helio(el, d) {
    const T = d / 36525;
    const L = wrap360(el.L[0] + el.L[1] * T);
    const w = wrap360(el.w[0] + el.w[1] * T);
    const O = wrap360(el.O[0] + el.O[1] * T);
    const M = wrap360(L - w) * RAD;
    const e = el.e;
    let E = M;
    for (let k = 0; k < 6; k++) E = M + e * Math.sin(E);
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const r = el.a * (1 - e * Math.cos(E));
    const argLat = nu / RAD + w - O;   // ν + ω (deg)
    const cu = cos(argLat), su = sin(argLat);
    const cO = cos(O), sO = sin(O), ci = cos(el.i), si = sin(el.i);
    return {
      x: r * (cO * cu - sO * su * ci),
      y: r * (sO * cu + cO * su * ci),
      z: r * (su * si),
      r
    };
  }

  function planet(key, d) {
    const p = helio(EL[key], d);
    const eth = helio(EL.earth, d);
    const gx = p.x - eth.x, gy = p.y - eth.y, gz = p.z - eth.z;
    const delta = Math.sqrt(gx * gx + gy * gy + gz * gz);
    const lambda = wrap360(Math.atan2(gy, gx) / RAD);
    const beta = Math.atan2(gz, Math.sqrt(gx * gx + gy * gy)) / RAD;
    return { lambda, beta, r: p.r, delta };
  }

  // visual magnitude with phase-angle correction (Astronomical Almanac fits)
  function planetMag(key, r, delta) {
    const ci = (r * r + delta * delta - 1) / (2 * r * delta); // sun–planet–earth triangle, R⊕ = 1
    const i = Math.acos(Math.max(-1, Math.min(1, ci))) / RAD;
    const x = i / 100;
    const D = 5 * Math.log10(r * delta);
    switch (key) {
      case 'mercury': return -0.42 + D + 3.80 * x - 2.73 * x * x + 2.00 * x * x * x;
      case 'venus':   return -4.40 + D + 0.09 * x + 2.39 * x * x - 0.65 * x * x * x;
      case 'mars':    return -1.52 + D + 0.016 * i;
      case 'jupiter': return -9.40 + D + 0.005 * i;
      case 'saturn':  return -8.88 + D + 0.044 * i + 0.50; // mean ring attitude folded in
      default:        return D;
    }
  }

  // ── Ecliptic → equatorial ───────────────────────────────────────
  const EPS = 23.4367;
  function eclToEq(lambda, beta) {
    const sl = sin(lambda), cl = cos(lambda);
    const sb = sin(beta), cb = cos(beta);
    const se = sin(EPS), ce = cos(EPS);
    const dec = Math.asin(sb * ce + cb * se * sl);
    const ra = Math.atan2(sl * ce - (sb / Math.max(cb, 1e-9)) * se, cl); // rad
    return { raH: wrap24(ra / RAD / 15), dec };                          // hours, rad
  }

  // ── Sidereal time (hours) ───────────────────────────────────────
  const gmst = d => wrap24(18.697374558 + 24.06570982441908 * d);
  const lstAt = (doy, hUT) => wrap24(gmst(d2000(doy, hUT)) + LON / 15);

  // ── Rise · transit · set (local mean time ≈ UT − 3.6 min) ──────
  // h0: altitude of the event. Sun −0.833°, stars/planets −0.567°.
  function riseSet(doy, raH, dec, h0 = -0.567) {
    const cosH = (sin(h0) - Math.sin(LAT) * Math.sin(dec)) / (Math.cos(LAT) * Math.cos(dec));
    const lst0 = lstAt(doy, 0);
    const transit = wrap24((raH - lst0) / 1.00273790935);
    if (cosH < -1) return { circumpolar: true, transit: lmt(transit) };
    if (cosH > 1) return { neverRises: true };
    const H = Math.acos(cosH) / RAD / 15;      // semi-arc, sidereal hours
    const dH = H / 1.00273790935;
    return {
      rise: lmt(wrap24(transit - dH)),
      set: lmt(wrap24(transit + dH)),
      transit: lmt(transit)
    };
  }
  const lmt = ut => wrap24(ut + LON / 15);

  function fmtHM(h) {
    if (h == null) return '&mdash;';
    const mm = Math.round(h * 60) % 1440;
    const H = Math.floor(mm / 60), M = mm % 60;
    return H + '<sup>h</sup>&hairsp;' + String(M).padStart(2, '0') + '<sup>m</sup>';
  }
  function fmtHMplain(h) { // "4 47" column style
    if (h == null) return '—';
    const mm = Math.round(h * 60) % 1440;
    return Math.floor(mm / 60) + ' ' + String(mm % 60).padStart(2, '0');
  }

  // ── Zodiacal constellation from ecliptic longitude ─────────────
  const ZOD = [[0,'Pisces'],[29,'Aries'],[53,'Taurus'],[90,'Gemini'],[118,'Cancer'],
    [138,'Leo'],[174,'Virgo'],[218,'Libra'],[241,'Scorpius'],[248,'Ophiuchus'],
    [266,'Sagittarius'],[299,'Capricornus'],[327,'Aquarius'],[351,'Pisces']];
  function zodiacOf(lambda) {
    const l = wrap360(lambda);
    let name = 'Pisces';
    for (const [start, n] of ZOD) if (l >= start) name = n;
    return name;
  }

  window.ALM = {
    RAD, LAT, LON, YEAR, MONTHS, MLEN,
    d2000, dateOf, doyOf, wrap360, wrap180, wrap24,
    sun, moon, moonPhase, planet, planetMag,
    eclToEq, gmst, lstAt, riseSet, lmt,
    fmtHM, fmtHMplain, zodiacOf, EPS
  };
})();
