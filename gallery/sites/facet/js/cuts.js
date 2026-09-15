// FACET — cut geometry. Every cut is built facet by facet (no hulls, no cheats).
// All cuts share: y-up, girdle in the y≈0 plane, stone centered after build.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const rad = d => d * Math.PI / 180;

/* ------------------------------------------------------------------ *
 * Face soup builder: push planar polygons, fan-triangulate, orient
 * outward via centroid test (gems are convex about the origin).
 * ------------------------------------------------------------------ */
class FaceSoup {
  constructor() { this.pos = []; }
  face(...verts) {
    const c = [0, 0, 0];
    for (const v of verts) { c[0] += v[0]; c[1] += v[1]; c[2] += v[2]; }
    c[0] /= verts.length; c[1] /= verts.length; c[2] /= verts.length;
    for (let i = 1; i < verts.length - 1; i++) {
      const a = verts[0], b = verts[i], d = verts[i + 1];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const w = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const flip = (n[0] * c[0] + n[1] * c[1] + n[2] * c[2]) < 0;
      if (flip) this.pos.push(...a, ...d, ...b);
      else this.pos.push(...a, ...b, ...d);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.computeVertexNormals(); // non-indexed → true flat facet normals
    g.computeBoundingBox();
    const mid = (g.boundingBox.max.y + g.boundingBox.min.y) / 2;
    g.translate(0, -mid, 0);
    g.computeBoundingSphere();
    return g;
  }
}

/* Count planar facets: group triangles by (quantized normal, plane offset).
 * Girdle facets (near-vertical) excluded, as lapidaries count them. */
export function countFacets(geo) {
  const p = geo.getAttribute('position');
  const n = geo.getAttribute('normal');
  const seen = new Set();
  let count = 0;
  for (let i = 0; i < p.count; i += 3) {
    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    if (Math.abs(ny) < 0.22) continue; // girdle band
    const d = nx * p.getX(i) + ny * p.getY(i) + nz * p.getZ(i);
    const key = `${Math.round(nx * 40)},${Math.round(ny * 40)},${Math.round(nz * 40)},${Math.round(d * 30)}`;
    if (!seen.has(key)) { seen.add(key); count++; }
  }
  return count;
}

/* ------------------------------------------------------------------ *
 * ROUND BRILLIANT — 57 facets at near-Tolkowsky proportions.
 * table 56%, crown 34.5°, pavilion 40.75°, girdle 3%.
 * ------------------------------------------------------------------ */
function roundBrilliant() {
  const s = new FaceSoup();
  const rt = 0.56;                      // table radius (girdle radius = 1)
  const g = 0.030;                      // girdle half-thickness
  const ch = Math.tan(rad(34.5)) * (1 - rt);
  const pd = Math.tan(rad(40.75));
  const yT = g + ch, yC = -g - pd;
  const az = (k, n, ph = 0) => ph + k * TAU / n;
  const P = (r, y, a) => [r * Math.cos(a), y, r * Math.sin(a)];

  const A = [], Gt = [], Gb = [], B = [], D = [];
  for (let i = 0; i < 8; i++) A.push(P(rt, yT, az(i, 8)));
  for (let k = 0; k < 16; k++) { Gt.push(P(1, g, az(k, 16))); Gb.push(P(1, -g, az(k, 16))); }
  // crown break points: on the kite plane at ±22.5°, radius 0.81
  const rb = 0.81, cB = Math.cos(rad(22.5));
  const yB = yT - ((yT - g) / (1 - rt)) * (rb * cB - rt);
  for (let j = 0; j < 8; j++) B.push(P(rb, yB, az(j, 8, rad(22.5))));
  // pavilion break points: on the main plane at ±22.5°, radius 0.56
  const rD = 0.56;
  const yD = yC + (-g - yC) * (rD * cB);
  for (let j = 0; j < 8; j++) D.push(P(rD, yD, az(j, 8, rad(22.5))));
  const C = [0, yC, 0];

  s.face(...A);                                             // table
  for (let j = 0; j < 8; j++) s.face(A[j], A[(j + 1) % 8], B[j]);   // 8 stars
  for (let i = 0; i < 8; i++) s.face(A[i], B[(i + 7) % 8], Gt[2 * i], B[i]); // 8 kites
  for (let j = 0; j < 8; j++) {                             // 16 upper halves
    s.face(B[j], Gt[2 * j], Gt[2 * j + 1]);
    s.face(B[j], Gt[2 * j + 1], Gt[(2 * j + 2) % 16]);
  }
  for (let k = 0; k < 16; k++)                              // girdle band
    s.face(Gt[k], Gt[(k + 1) % 16], Gb[(k + 1) % 16], Gb[k]);
  for (let i = 0; i < 8; i++) s.face(Gb[2 * i], D[(i + 7) % 8], C, D[i]); // 8 pavilion mains
  for (let j = 0; j < 8; j++) {                             // 16 lower halves
    s.face(D[j], Gb[2 * j], Gb[2 * j + 1]);
    s.face(D[j], Gb[2 * j + 1], Gb[(2 * j + 2) % 16]);
  }
  return {
    soup: s,
    map: { kind: 'brilliant', rt, rb, girdle: 1 },
  };
}

/* ------------------------------------------------------------------ *
 * Outline helpers for fancy shapes
 * ------------------------------------------------------------------ */
function marquiseOutline(n = 16, hx = 1, hz = 0.5125) {
  // lens of two circular arcs through (±hx,0) and (0,±hz)
  const R = (hx * hx + hz * hz) / (2 * hz);
  const pts = [];
  for (let k = 0; k < n; k++) {
    const t = k * TAU / n;
    const st = Math.abs(Math.sin(t));
    const r = (-2 * (R - hz) * st + Math.sqrt(4 * (R - hz) * (R - hz) * st * st + 4 * (hx * hx))) / 2;
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return pts;
}

function trillionOutline(perSide = 4, R = 1, bulge = 0.17) {
  const corners = [rad(90), rad(210), rad(330)].map(a => [R * Math.cos(a), R * Math.sin(a)]);
  const pts = [];
  for (let sIdx = 0; sIdx < 3; sIdx++) {
    const A = corners[sIdx], Bc = corners[(sIdx + 1) % 3];
    const mx = (A[0] + Bc[0]) / 2, mz = (A[1] + Bc[1]) / 2;
    const ml = Math.hypot(mx, mz);
    const ox = mx / ml, oz = mz / ml; // outward
    const L = Math.hypot(Bc[0] - A[0], Bc[1] - A[1]);
    const cr = (L * L / 4 + bulge * bulge) / (2 * bulge);
    const cx = mx + ox * (bulge - cr), cz = mz + oz * (bulge - cr);
    const a0 = Math.atan2(A[1] - cz, A[0] - cx);
    let a1 = Math.atan2(Bc[1] - cz, Bc[0] - cx);
    let da = a1 - a0;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    for (let k = 0; k < perSide; k++) {
      const a = a0 + da * (k / perSide);
      pts.push([cx + cr * Math.cos(a), cz + cr * Math.sin(a)]);
    }
  }
  return pts; // 3*perSide points, corners at indices 0, perSide, 2*perSide
}

/* strip between ring A (2n pts) and ring B (n pts), B[j] under A[2j+1] */
function strip(s, A, B) {
  const n = B.length;
  for (let j = 0; j < n; j++) {
    const a0 = A[2 * j], a1 = A[2 * j + 1], a2 = A[(2 * j + 2) % (2 * n)];
    s.face(a0, a1, B[j]);
    s.face(a1, a2, B[j]);
    s.face(a2, B[(j + 1) % n], B[j]);
  }
}

const ring = (outline, scale, y, idxStep = 1, idxOff = 0) => {
  const pts = [];
  for (let i = idxOff; i < outline.length; i += idxStep)
    pts.push([outline[i][0] * scale, y, outline[i][1] * scale]);
  return pts;
};

/* ------------------------------------------------------------------ *
 * MARQUISE — brilliant-style navette, 57 facets, L/W 1.95
 * ------------------------------------------------------------------ */
function marquise() {
  const s = new FaceSoup();
  const o = marquiseOutline(16);
  const g = 0.03;
  const Gt = ring(o, 1, g), Gb = ring(o, 1, -g);
  const T = ring(o, 0.60, 0.17, 2, 1);        // table rim (8 pts, off-tip)
  const M = ring(o, 0.58, -0.26, 2, 1);       // pavilion break (8 pts)
  const yK = -0.47, kx = 0.40;
  const Kp = [kx, yK, 0], Kn = [-kx, yK, 0];

  strip(s, Gt, T);                            // crown: 24 facets
  s.face(...T);                               // table
  for (let k = 0; k < 16; k++) s.face(Gt[k], Gt[(k + 1) % 16], Gb[(k + 1) % 16], Gb[k]);
  strip(s, Gb, M);                            // pavilion upper: 24 facets
  // keel closure: 8 facets
  const near = p => (p[0] >= 0 ? Kp : Kn);
  for (let j = 0; j < 8; j++) {
    const a = M[j], b = M[(j + 1) % 8];
    const ka = near(a), kb = near(b);
    if (ka === kb) s.face(a, b, ka);
    else s.face(a, b, kb, ka);
  }
  return { soup: s, map: { kind: 'strip', outline: o, tScale: 0.60, tOff: 1 } };
}

/* ------------------------------------------------------------------ *
 * TRILLION — arc-sided triangle, 43 facets, shallow (depth 42%)
 * ------------------------------------------------------------------ */
function trillion() {
  const s = new FaceSoup();
  const o = trillionOutline(4);
  const g = 0.028;
  const Gt = ring(o, 1, g), Gb = ring(o, 1, -g);
  const T = ring(o, 0.62, 0.19, 2, 1);        // table rim (6 pts)
  const M = ring(o, 0.55, -0.25, 2, 1);       // pavilion break (6 pts)
  const C = [0, -0.42, 0];

  strip(s, Gt, T);                            // crown: 18 facets
  s.face(...T);                               // table
  for (let k = 0; k < 12; k++) s.face(Gt[k], Gt[(k + 1) % 12], Gb[(k + 1) % 12], Gb[k]);
  strip(s, Gb, M);                            // pavilion: 18
  for (let j = 0; j < 6; j++) s.face(M[j], M[(j + 1) % 6], C); // 6 to the culet point
  return { soup: s, map: { kind: 'strip', outline: o, tScale: 0.62, tOff: 1 } };
}

/* ------------------------------------------------------------------ *
 * EMERALD STEP — octagonal outline, 3 crown steps, 3 pavilion steps, keel
 * ------------------------------------------------------------------ */
function emeraldStep() {
  const s = new FaceSoup();
  const hx = 0.78, hz = 0.55, c = 0.20;
  const o = [
    [hx - c, hz], [-hx + c, hz], [-hx, hz - c], [-hx, -hz + c],
    [-hx + c, -hz], [hx - c, -hz], [hx, -hz + c], [hx, hz - c],
  ];
  const g = 0.035;
  const crownS = [1, 0.87, 0.75, 0.64], crownY = [g, g + 0.068, g + 0.122, g + 0.162];
  // pavilion rings pinch z faster than x so the keel band stays steep
  const pavSX = [1, 0.84, 0.68], pavSZ = [1, 0.72, 0.45], pavY = [-g, -g - 0.235, -g - 0.375];
  const yK = -g - 0.50, kx = 0.30;
  const Kp = [kx, yK, 0], Kn = [-kx, yK, 0];
  const ringXZ = (sx, sz, y) => o.map(p => [p[0] * sx, y, p[1] * sz]);

  const rings = i => ring(o, crownS[i], crownY[i]);
  for (let i = 0; i < 3; i++) {
    const a = rings(i), b = rings(i + 1);
    for (let k = 0; k < 8; k++) s.face(a[k], a[(k + 1) % 8], b[(k + 1) % 8], b[k]);
  }
  s.face(...rings(3));                        // table
  const Gt = ring(o, 1, g), Gb = ring(o, 1, -g);
  for (let k = 0; k < 8; k++) s.face(Gt[k], Gt[(k + 1) % 8], Gb[(k + 1) % 8], Gb[k]);
  const pr = i => ringXZ(pavSX[i], pavSZ[i], pavY[i]);
  for (let i = 0; i < 2; i++) {
    const a = pr(i), b = pr(i + 1);
    for (let k = 0; k < 8; k++) s.face(a[k], a[(k + 1) % 8], b[(k + 1) % 8], b[k]);
  }
  const last = pr(2);
  const near = p => (p[0] >= 0.01 ? Kp : (p[0] <= -0.01 ? Kn : null));
  for (let k = 0; k < 8; k++) {
    const a = last[k], b = last[(k + 1) % 8];
    const ka = near(a) || near(b), kb = near(b) || near(a);
    if (ka === kb) s.face(a, b, ka);
    else s.face(a, b, kb, ka);
  }
  return { soup: s, map: { kind: 'step', outline: o, scales: [1, 0.87, 0.75, 0.64] } };
}

/* ------------------------------------------------------------------ *
 * Public catalogue
 * ------------------------------------------------------------------ */
const BUILDERS = {
  brilliant: {
    build: roundBrilliant, displayScale: 1.0, viewTilt: 0,
    specs: {
      name: 'Round brilliant', table: '56.0 %', crown: '34.50°', pavilion: '40.75°',
      depth: '61.2 %', ratio: '1.00', yield: '41 %',
      note: 'Maximum fire. The brilliant surrenders the most rough — and returns it as light.',
    },
  },
  step: {
    build: emeraldStep, displayScale: 1.18, viewTilt: 0.05,
    specs: {
      name: 'Emerald step', table: '64.0 %', crown: '43.6° top step', pavilion: '56.7° main',
      depth: '66.5 %', ratio: '1.42', yield: '63 %',
      note: 'The step cut hides nothing. Long facets read the stone’s clarity like a signed confession.',
    },
  },
  marquise: {
    build: marquise, displayScale: 1.08, viewTilt: 0.34,
    specs: {
      name: 'Marquise', table: '60.0 %', crown: '34.3° wing', pavilion: '46.9° wing',
      depth: '62.4 %', ratio: '1.95', yield: '47 %',
      note: 'A navette holds its carat wide. Two points, and light runs the length of the boat.',
    },
  },
  trillion: {
    build: trillion, displayScale: 1.14, viewTilt: 0.24,
    specs: {
      name: 'Trillion', table: '62.0 %', crown: '34.0°', pavilion: '37.7° shallow',
      depth: '37.0 %', ratio: '1.00', yield: '55 %',
      note: 'Shallow, wide, immodest. The trillion spreads one carat across the finger of two.',
    },
  },
};

const cache = {};
export function getCut(key) {
  if (!cache[key]) {
    const def = BUILDERS[key];
    const { soup, map } = def.build();
    const geometry = soup.geometry();
    const facets = countFacets(geometry);
    cache[key] = {
      key, geometry, map, displayScale: def.displayScale,
      viewTilt: def.viewTilt || 0,
      specs: { ...def.specs, facets },
    };
  }
  return cache[key];
}
export const CUT_KEYS = ['brilliant', 'step', 'marquise', 'trillion'];

/* ------------------------------------------------------------------ *
 * Face-up facet maps (SVG) — drawn from the same construction data
 * ------------------------------------------------------------------ */
export function facetMapSVG(key, cls = '') {
  const { map } = getCut(key);
  const L = [];
  const line = (a, b) => L.push(`<line pathLength="1" x1="${a[0].toFixed(3)}" y1="${a[1].toFixed(3)}" x2="${b[0].toFixed(3)}" y2="${b[1].toFixed(3)}"/>`);
  const poly = (pts, heavy = false) =>
    L.push(`<polygon pathLength="1" points="${pts.map(p => p[0].toFixed(3) + ',' + p[1].toFixed(3)).join(' ')}"${heavy ? ' class="hv"' : ''}/>`);

  if (map.kind === 'brilliant') {
    const pt = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
    const A = [], B = [], G = [];
    for (let i = 0; i < 8; i++) A.push(pt(map.rt, i * TAU / 8));
    for (let j = 0; j < 8; j++) B.push(pt(map.rb, rad(22.5) + j * TAU / 8));
    for (let k = 0; k < 16; k++) G.push(pt(1, k * TAU / 16));
    poly(G, true); poly(A);
    for (let j = 0; j < 8; j++) {
      line(A[j], B[j]); line(A[(j + 1) % 8], B[j]);
      line(B[j], G[2 * j]); line(B[j], G[(2 * j + 2) % 16]);
      line(B[j], G[2 * j + 1]);
    }
  } else if (map.kind === 'step') {
    for (let i = 0; i < map.scales.length; i++)
      poly(map.outline.map(p => [p[0] * map.scales[i], p[1] * map.scales[i]]), i === 0);
    const s0 = map.scales[0], s1 = map.scales[map.scales.length - 1];
    for (const p of map.outline) line([p[0] * s0, p[1] * s0], [p[0] * s1, p[1] * s1]);
  } else { // strip cuts
    const o = map.outline, n = o.length, half = n / 2;
    poly(o, true);
    const T = [];
    for (let i = map.tOff; i < n; i += 2) T.push([o[i][0] * map.tScale, o[i][1] * map.tScale]);
    poly(T);
    for (let j = 0; j < half; j++) {
      const b = T[j];
      line(b, o[2 * j]); line(b, o[(2 * j + 1) % n]); line(b, o[(2 * j + 2) % n]);
    }
  }
  return `<svg class="facet-map ${cls}" viewBox="-1.16 -1.16 2.32 2.32" aria-hidden="true" focusable="false"><g>${L.join('')}</g></svg>`;
}
