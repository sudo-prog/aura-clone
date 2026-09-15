// ============================================================
// HELIOSCOPE — single source of fictional truth
// Observation day 11,797 · 2026-07-08 · window ending 21:40 UT
// Everything below is synthetic. The Sun is real.
// ============================================================

export const OBS = {
  date: '2026-07-08',
  windowEndH: 21.667, // 21:40 UT, decimal hours
  windowEndLabel: '21:40 UT',
};

// --- Numbered active regions (MAG-4 vector magnetograph) ------
// lat: degrees, +N; lon: degrees, +W (Earth-facing disk)
// r: apparent spot-group radius in unit-disk surface coords (for the shader)
export const REGIONS = [
  {
    ar: 4172, lat: 16, lon: 34, latH: 'N16', lonH: 'W34',
    cls: 'βγδ', clsName: 'beta-gamma-delta',
    area: 620, spots: 14, prob: { c: 85, m: 45, x: 12 }, r: 0.075,
    note: 'The largest group of rotation 2297, and the source of today’s M1.8. A delta spot keeps opposite polarities sharing one penumbra — the classic recipe for more.',
  },
  {
    ar: 4175, lat: -9, lon: -12, latH: 'S09', lonH: 'E12',
    cls: 'β', clsName: 'beta',
    area: 240, spots: 8, prob: { c: 60, m: 15, x: 2 }, r: 0.045,
    note: 'A tidy bipolar group near disk centre — the best-aimed region on the disk, but magnetically simple. Resumed slow growth after this evening’s C2.6.',
  },
  {
    ar: 4178, lat: 7, lon: -58, latH: 'N07', lonH: 'E58',
    cls: 'α', clsName: 'alpha',
    area: 90, spots: 3, prob: { c: 25, m: 5, x: 1 }, r: 0.030,
    note: 'A single-spot remnant rotating into view, bright in calcium plage. Little flare risk; worth watching only for what follows it around the limb.',
  },
  {
    ar: 4181, lat: -21, lon: 71, latH: 'S21', lonH: 'W71',
    cls: 'βγ', clsName: 'beta-gamma',
    area: 380, spots: 11, prob: { c: 70, m: 30, x: 8 }, r: 0.060,
    note: 'Two days from the west limb. Anything it throws now is poorly aimed at Earth — expect photogenic limb arcades rather than geomagnetic trouble.',
  },
];

// Orthographic unit-disk projection of a region (x right toward W, y up toward N)
export function diskXY(reg) {
  const la = (reg.lat * Math.PI) / 180;
  const lo = (reg.lon * Math.PI) / 180;
  return { x: Math.cos(la) * Math.sin(lo), y: Math.sin(la) };
}

// --- Flares, last 24 h (HX-1 photometer) -----------------------
export const XRAY_BG = 6.2e-7; // B6.2 background
export const FLARES = [
  { t: 3.70,  peak: 4.1e-6, cls: 'C4.1', time: '03:42', ar: 4181, dur: 18 },
  { t: 9.27,  peak: 1.8e-5, cls: 'M1.8', time: '09:16', ar: 4172, dur: 31 },
  { t: 14.08, peak: 7.3e-6, cls: 'C7.3', time: '14:05', ar: 4172, dur: 22 },
  { t: 19.97, peak: 2.6e-6, cls: 'C2.6', time: '19:58', ar: 4175, dur: 14 },
];

// Synthesize the 24 h soft X-ray flux series (W/m^2), 0.1 h cadence,
// ending at the observation window (the trace stops at "now").
export function fluxSeries() {
  const pts = [];
  for (let t = 0; t <= OBS.windowEndH + 1e-6; t += 0.1) {
    const wander =
      0.11 * Math.sin(t * 0.7 + 1.3) +
      0.07 * Math.sin(t * 1.9 + 4.1) +
      0.05 * Math.sin(t * 0.31 + 2.2) +
      0.03 * Math.sin(t * 3.7 + 0.6);
    let flux = Math.pow(10, Math.log10(XRAY_BG) + wander);
    for (const f of FLARES) {
      const s = t - f.t;
      const tau = (f.dur / 60) * 0.55; // decay constant, hours
      if (s >= 0) flux += f.peak * Math.exp(-s / tau);
      else if (s > -0.35) flux += f.peak * Math.exp(-Math.pow(s / 0.07, 2));
    }
    pts.push({ t, flux });
  }
  return pts;
}

// --- Geomagnetic forecast (KESTREL-L1) -------------------------
// 24 three-hour bins = 72 h beginning 2026-07-08 00 UT
export const KP = {
  bins: [3, 4, 3, 4, 4, 4, 4, 4,  5, 6, 6, 5, 4, 4, 3, 3,  3, 3, 2, 2, 3, 3, 2, 2],
  days: ['JUL 08', 'JUL 09', 'JUL 10'],
  stormLabel: 'G2',
  stormBins: [9, 10], // Jul 09 03–09 UT
};

export const WIND = { speed: 482, density: 6.4, bz: -3.2 };

export const CITIES = [
  { name: 'Tromsø, Norway',    lat: '69.6°N', verdict: 'OVERHEAD',   grade: 'ok'  },
  { name: 'Reykjavík, Iceland', lat: '64.1°N', verdict: 'OVERHEAD',   grade: 'ok'  },
  { name: 'Anchorage, USA',       lat: '61.2°N', verdict: 'HIGH SKY',   grade: 'ok'  },
  { name: 'Edinburgh, UK',        lat: '55.9°N', verdict: 'LOW NORTH',  grade: 'mid' },
  { name: 'Berlin, Germany',      lat: '52.5°N', verdict: 'CAMERA ONLY', grade: 'mid' },
  { name: 'Toronto, Canada',      lat: '43.7°N', verdict: 'UNLIKELY',   grade: 'low' },
];
