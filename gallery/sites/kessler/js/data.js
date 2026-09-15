/* KESSLER WATCH — catalog + content data
   All entries fictional. Orbital rates are real (circular Kepler periods). */

export const KM_PER_UNIT = 6371;          // 1 scene unit = Earth radius
export const GM = 398600.4418;            // km^3/s^2
export const EARTH_OMEGA = (2 * Math.PI) / 86164; // rad per sim-second (sidereal)

/* Deterministic RNG so the catalog is identical every load */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Real circular-orbit period (s) for altitude in km above mean radius */
export function periodForAlt(altKm) {
  const a = 6371 + altKm;
  return 2 * Math.PI * Math.sqrt((a * a * a) / GM);
}

/* Scaled scene radius. LEO true-scale; NAV + GEO composed closer for framing. */
export const NAV_SCENE_R = 2.62;
export const GEO_SCENE_R = 4.18;

/* ---------------- city seeds: [lat, lon, weight] ---------------- */
export const CITIES = [
  [40.7,-74,1],[34,-118.2,.9],[41.9,-87.6,.8],[29.8,-95.4,.7],[43.7,-79.4,.7],
  [19.4,-99.1,1],[25.8,-80.2,.6],[32.8,-96.8,.6],[33.7,-84.4,.6],[38.9,-77,.6],
  [42.4,-71.1,.55],[33.4,-112.1,.5],[47.6,-122.3,.55],[37.8,-122.4,.7],[39.7,-105,.5],
  [45.5,-73.6,.5],[49.3,-123.1,.45],[20.7,-103.3,.5],[25.7,-100.3,.45],[23.1,-82.4,.35],
  [14.6,-90.5,.35],[42.3,-83,.5],[44.98,-93.3,.45],[38.6,-90.2,.4],[30,-90.1,.35],
  [32.7,-117.2,.45],[39.95,-75.2,.55],
  [-23.55,-46.6,1],[-22.9,-43.2,.8],[-34.6,-58.4,.85],[-12,-77,.7],[4.7,-74.1,.7],
  [-33.4,-70.7,.6],[10.5,-66.9,.5],[-0.2,-78.5,.4],[-12.97,-38.5,.45],[-3.7,-38.5,.45],
  [-15.8,-47.9,.45],[-19.9,-43.9,.5],[6.2,-75.6,.45],[-34.9,-56.2,.35],[-25.3,-57.6,.3],
  [-30,-51.2,.4],[-8,-34.9,.4],[-3.1,-60,.3],
  [51.5,-0.1,1],[48.9,2.35,.95],[40.4,-3.7,.7],[41.4,2.2,.6],[41.9,12.5,.65],
  [45.5,9.2,.6],[52.5,13.4,.65],[51.5,7.2,.6],[52.4,4.9,.55],[50.85,4.35,.5],
  [48.2,16.4,.5],[50.1,14.4,.45],[52.2,21,.5],[47.5,19,.45],[48.1,11.6,.5],
  [50.1,8.7,.5],[53.55,10,.5],[47.4,8.5,.4],[38.7,-9.1,.45],[53.3,-6.3,.4],
  [53.5,-2.2,.5],[59.3,18.1,.45],[59.9,10.7,.35],[55.7,12.6,.4],[60.2,24.9,.35],
  [38,23.7,.45],[41,29,.85],[50.45,30.5,.5],[55.75,37.6,.85],[59.9,30.3,.55],
  [44.4,26.1,.4],[44.8,20.5,.35],
  [30,31.2,.9],[6.5,3.4,.85],[-4.3,15.3,.6],[-26.2,28,.65],[-33.9,18.4,.5],
  [-1.3,36.8,.5],[9,38.7,.45],[33.6,-7.6,.45],[36.75,3.05,.45],[36.8,10.2,.35],
  [5.6,-0.2,.45],[5.3,-4,.45],[14.7,-17.45,.35],[15.6,32.5,.4],[-6.8,39.3,.4],
  [-8.8,13.2,.45],[24.7,46.7,.6],[21.5,39.2,.45],[25.2,55.3,.6],[35.7,51.4,.7],
  [33.3,44.4,.5],[32.1,34.8,.45],[39.9,32.9,.45],[31.95,35.9,.35],[29.4,48,.35],
  [25.3,51.5,.35],
  [35.7,139.7,1],[34.7,135.5,.8],[35.2,137,.6],[37.55,127,.9],[35.1,129,.5],
  [39.9,116.4,.95],[31.2,121.5,1],[22.5,114.1,.85],[23.1,113.3,.85],[30.7,104.1,.65],
  [29.6,106.5,.65],[30.6,114.3,.6],[34.3,108.9,.55],[39.1,117.2,.6],[22.3,114.2,.7],
  [25,121.5,.6],[21,105.85,.55],[10.8,106.7,.65],[13.75,100.5,.75],[1.35,103.8,.6],
  [3.15,101.7,.55],[-6.2,106.8,.9],[-7.25,112.75,.5],[14.6,121,.75],[28.6,77.2,1],
  [19.1,72.9,.95],[22.6,88.4,.75],[13.1,80.3,.65],[13,77.6,.7],[17.4,78.5,.6],
  [23,72.6,.55],[31.5,74.3,.65],[24.9,67,.75],[23.8,90.4,.8],[16.8,96.2,.45],
  [6.9,79.9,.35],[27.7,85.3,.3],[41.3,69.3,.4],[43.25,76.9,.35],[55,82.9,.35],
  [56.8,60.6,.35],
  [-33.9,151.2,.6],[-37.8,145,.6],[-27.5,153,.45],[-32,115.9,.4],[-36.85,174.8,.35],
  [-34.9,138.6,.3],
];

/* ---------------- name pools (fictional) ---------------- */
const DEBRIS_PARENTS = [
  'TSELINA-D', 'HAIYING-2C', 'MERIDIAN-33', 'ORBCALL-7', 'VESPER-2', 'KORUND-1',
  'LANTERN-4', 'ZENITH-KM', 'PROTEUS-M', 'ALTAIR-3', 'STRELA-9', 'CYGNET-B',
];
const PAYLOAD_NAMES = [
  ['STARLING', 520], ['TERRAVIEW', 12], ['ARGUS', 9], ['MERIDIAN', 41],
  ['SKEIN', 30], ['HALCYON', 7], ['PALINODE', 4], ['CORMORANT', 15],
];
const RB_NAMES = ['VULCAIN-9 R/B', 'PROTEUS-M R/B', 'LANTERN-4 R/B', 'ANTARES-C R/B', 'ZENITH-KM R/B', 'KESTREL-H R/B'];
const GEO_ACTIVE = ['RELAY-KA', 'TEMPEST-E', 'ORBCALL G', 'MERCATOR', 'CHRONOS'];
const GEO_DERELICT = ['SIRIN-1', 'TELAMON', 'VOSKHOD-G', 'PHAROS-2', 'CANOPY'];
const ORIGINS = [
  'NORDKAPP RANGE', 'ILHA DO SAL LC-2', 'TAIGA COSMODROME', 'MOJAVE B-2',
  'CAPE VELA SLC-9', 'TANEGA POINT', 'SRIHARIKOTA-II', 'KAPUSTIN FIELD',
];

function pad(n, w) { return String(n).padStart(w, '0'); }

/* ---------------- catalog builder ---------------- */
export function buildCatalog() {
  const rnd = mulberry32(20260708);
  const objects = [];
  let idSeq = 10037;

  const push = (o) => {
    o.id = 'KW-' + pad(idSeq, 5);
    idSeq += 7 + Math.floor(rnd() * 90);
    const yr = o.launched;
    o.intl = yr + '-' + pad(1 + Math.floor(rnd() * 130), 3) + 'ABCDEFGHJK'[Math.floor(rnd() * 10)];
    objects.push(o);
  };

  const mkLeo = (type, altKm, incl, raan, theta0, name, extra = {}) => {
    const T = periodForAlt(altKm);
    push(Object.assign({
      type, altKm, name,
      rScaled: 1 + altKm / 6371,
      incl, raan, theta0,
      n: (2 * Math.PI) / T,
      period: T,
      shell: 'LEO',
      origin: ORIGINS[Math.floor(rnd() * ORIGINS.length)],
      launched: 1968 + Math.floor(rnd() * 57),
      rcs: type === 'DEB' ? +(0.01 + rnd() * 0.4).toFixed(3)
        : type === 'R/B' ? +(4 + rnd() * 9).toFixed(2)
        : +(0.8 + rnd() * 5).toFixed(2),
      ecc: +(rnd() * 0.012).toFixed(4),
    }, extra));
  };

  /* --- LEO population: 474 general + 6 conjunction-pair objects --- */
  const leoPlan = [
    // [count, type, altMin, altMax, incMin, incMax]
    [104, 'DEB', 700, 900, 96.3, 98.7],   // sun-sync corridor debris
    [46,  'PAY', 690, 820, 96.5, 98.3],   // sun-sync imagers
    [64,  'DEB', 760, 880, 70, 74],       // legacy constellation band
    [58,  'DEB', 420, 1150, 48, 66],
    [42,  'PAY', 500, 620, 51, 55],       // comm shells
    [40,  'PAY', 1050, 1200, 84, 88],
    [34,  'DEB', 950, 1080, 81, 90],
    [30,  'R/B', 560, 980, 50, 99],
    [26,  'DEB', 1200, 1400, 63, 74],
    [18,  'PAY', 410, 460, 51.5, 51.7],   // station band
    [12,  'R/B', 1150, 1420, 70, 96],
  ];
  let dn = 0, pn = 0, rn = 0;
  for (const [count, type, a0, a1, i0, i1] of leoPlan) {
    for (let k = 0; k < count; k++) {
      const alt = a0 + rnd() * (a1 - a0);
      const incl = i0 + rnd() * (i1 - i0);
      const raan = rnd() * 360;
      const th = rnd() * Math.PI * 2;
      let name;
      if (type === 'DEB') {
        name = DEBRIS_PARENTS[dn++ % DEBRIS_PARENTS.length] + ' DEB';
      } else if (type === 'R/B') {
        name = RB_NAMES[rn++ % RB_NAMES.length];
      } else {
        const pool = PAYLOAD_NAMES[pn++ % PAYLOAD_NAMES.length];
        name = pool[0] + '-' + (1 + Math.floor(rnd() * pool[1]));
      }
      mkLeo(type, alt, incl, raan, th, name, {
        status: type === 'PAY' ? 'ACTIVE' : type === 'R/B' ? 'UNCONTROLLED' : 'TRACKED',
      });
    }
  }

  /* --- conjunction candidate pairs: same radius, crossing planes --- */
  const conjPairs = [];
  const pairSpecs = [
    { alt: 781.4, i1: 74.0, o1: 12, i2: 53.2, o2: 208, n1: 'TSELINA-D DEB', n2: 'STARLING-217' },
    { alt: 862.7, i1: 97.6, o1: 141, i2: 71.1, o2: 322, n1: 'HAIYING-2C DEB', n2: 'MERIDIAN-12' },
    { alt: 613.9, i1: 53.0, o1: 66, i2: 97.9, o2: 250, n1: 'VESPER-2 R/B', n2: 'CORMORANT-8' },
  ];
  for (const s of pairSpecs) {
    const idxA = objects.length;
    mkLeo(s.n1.includes('R/B') ? 'R/B' : 'DEB', s.alt, s.i1, s.o1, rnd() * Math.PI * 2, s.n1,
      { status: s.n1.includes('R/B') ? 'UNCONTROLLED' : 'TRACKED' });
    mkLeo('PAY', s.alt + 0.05, s.i2, s.o2, rnd() * Math.PI * 2, s.n2, { status: 'ACTIVE' });
    conjPairs.push([idxA, idxA + 1]);
  }

  /* --- NAV ring: 30 sats, 6 planes @ 55 deg (fictional LODESTAR) --- */
  const navPeriod = 43082;
  for (let p = 0; p < 6; p++) {
    for (let s = 0; s < 5; s++) {
      push({
        type: 'PAY', shell: 'NAV', altKm: 20180,
        name: 'LODESTAR IIF-' + (p * 5 + s + 1),
        rScaled: NAV_SCENE_R,
        incl: 55, raan: p * 60 + 4,
        theta0: (s / 5) * Math.PI * 2 + p * 0.42,
        n: (2 * Math.PI) / navPeriod, period: navPeriod,
        origin: ORIGINS[4], launched: 2009 + Math.floor(rnd() * 16),
        rcs: 7.9, ecc: 0.0004, status: 'ACTIVE',
      });
    }
  }

  /* --- GEO belt: 66 objects near 0 deg inclination --- */
  const geoPeriod = 86164;
  for (let k = 0; k < 66; k++) {
    const derelict = rnd() < 0.42;
    const age = derelict ? 8 + rnd() * 12 : rnd() * 4; // derelicts drift in incl
    const pool = derelict ? GEO_DERELICT : GEO_ACTIVE;
    push({
      type: derelict ? 'DEB' : 'PAY', shell: 'GEO', altKm: 35786,
      name: pool[Math.floor(rnd() * pool.length)] + '-' + (1 + Math.floor(rnd() * 24)) + (derelict ? ' (DERELICT)' : ''),
      rScaled: GEO_SCENE_R,
      incl: derelict ? (rnd() - 0.35) * age : (rnd() - 0.5) * 0.4,
      raan: rnd() * 360,
      theta0: rnd() * Math.PI * 2,
      n: (2 * Math.PI) / geoPeriod, period: geoPeriod,
      origin: ORIGINS[Math.floor(rnd() * ORIGINS.length)],
      launched: derelict ? 1978 + Math.floor(rnd() * 25) : 2004 + Math.floor(rnd() * 21),
      rcs: +(9 + rnd() * 18).toFixed(1), ecc: 0.0002,
      status: derelict ? 'UNCONTROLLED' : 'ACTIVE',
    });
  }

  return { objects, conjPairs };
}

/* ---------------- census: catalogued fragments >10 cm by altitude band ---------------- */
export const CENSUS = [
  { band: '1600–2000', lo: 1600, hi: 2000, count: 260 },
  { band: '1400–1600', lo: 1400, hi: 1600, count: 121 },
  { band: '1200–1400', lo: 1200, hi: 1400, count: 284 },
  { band: '1000–1200', lo: 1000, hi: 1200, count: 397 },
  { band: '850–1000',  lo: 850,  hi: 1000, count: 1208 },
  { band: '700–850',   lo: 700,  hi: 850,  count: 1742, peak: true },
  { band: '550–700',   lo: 550,  hi: 700,  count: 619 },
  { band: '400–550',   lo: 400,  hi: 550,  count: 434 },
];
export const CENSUS_TOTAL = CENSUS.reduce((s, d) => s + d.count, 0); // 5065

/* ---------------- fragmentation ledger (fictional) ---------------- */
export const LEDGER = [
  { no: 'KW/F-002', object: 'KORUND-1', date: '1991-12-02', cause: 'Cause unresolved — probable pressure-vessel failure', fragments: 96, alt: 903, onOrbit: 71 },
  { no: 'KW/F-003', object: 'TSELINA-D R/B', date: '1996-03-11', cause: 'Residual propellant rupture, 14 yr after burnout', fragments: 461, alt: 842, onOrbit: 64 },
  { no: 'KW/F-007', object: 'VESPER-2 R/B', date: '2002-11-27', cause: 'Passivation failure — hypergolic tank overpressure', fragments: 214, alt: 1014, onOrbit: 82 },
  { no: 'KW/F-011', object: 'HAIYING-2C', date: '2011-07-19', cause: 'Kinetic anti-satellite intercept, deliberate', fragments: 1204, alt: 862, onOrbit: 78 },
  { no: 'KW/F-014', object: 'MERIDIAN-33 × ORBCALL-7', date: '2013-02-04', cause: 'Accidental collision — first satellite-on-satellite', fragments: 823, alt: 776, onOrbit: 69 },
  { no: 'KW/F-018', object: 'STARLING-441', date: '2019-05-08', cause: 'Battery cell rupture during eclipse season', fragments: 186, alt: 548, onOrbit: 22 },
  { no: 'KW/F-021', object: 'LANTERN-4 R/B', date: '2022-09-15', cause: 'Collision with untracked object, est. 3 cm', fragments: 158, alt: 894, onOrbit: 97 },
];
export const LEDGER_FRAGMENTS = LEDGER.reduce((s, d) => s + d.fragments, 0); // 3142

/* ---------------- ground stations (footer) ---------------- */
export const STATIONS = [
  { name: 'NORDKAPP FENCE', loc: '71.11°N 25.79°E', kind: 'PHASED-ARRAY RADAR' },
  { name: 'ATACAMA APERTURE', loc: '23.86°S 68.20°W', kind: 'OPTICAL TRIPLET' },
  { name: 'HALLETT BAY SOUTH', loc: '72.32°S 170.16°E', kind: 'POLAR PASS RADAR' },
  { name: 'SOCORRO ARRAY', loc: '33.82°N 106.66°W', kind: 'DEBRIS FENCE' },
  { name: 'ILHA DO SAL DOWNLINK', loc: '16.73°N 22.93°W', kind: 'TELEMETRY + LASER RANGING' },
  { name: 'TANEGA POINT EAST', loc: '30.39°N 130.97°E', kind: 'OPTICAL TRIPLET' },
];
